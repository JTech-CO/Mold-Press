"""Real-origin persistence, import failures, downloadable files and render finishes.

Default: local WebGL with network blocked. MP_RENDERER=canvas: CPU fallback.
Pass --three to also require the existing optional CDN Three.js renderer.
"""
import argparse
import asyncio
import functools
import hashlib
import http.server
import json
from pathlib import Path
import struct
import threading
import traceback
import zipfile
from playwright.async_api import async_playwright
from support import APP_SHA256, storage_test_document, ROOT, OUTPUT, launch_options

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

async def state(page, expression='s.p'):
    return await page.evaluate('()=>{const a=MoldPress.app,s=a.state,M=MP;return '+expression+';}')

async def settled(page):
    await page.wait_for_function('window.MoldPress?.app?.view && !MoldPress.app.state.busy')
    await page.wait_for_timeout(180)

async def click(page, test):
    await page.get_by_test_id(test).click()
    await settled(page)

async def upload(page, project):
    await page.locator('input[type=file]').set_input_files({
        'name': 'fixture.moldpress.json', 'mimeType': 'application/json',
        'buffer': json.dumps(project, ensure_ascii=False).encode('utf-8')})
    await settled(page)

async def run(url, three):
    report = {'status':'RUNNING', 'sha256':APP_SHA256, 'checks':[]}
    def check(name, **data):
        report['checks'].append({'name':name,'status':'PASS',**data})
        print('PASS', name, flush=True)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(**launch_options())
        context = await browser.new_context(viewport={'width':1600,'height':1000}, accept_downloads=True)
        page = await context.new_page()
        page.set_default_timeout(30000)
        errors = []
        diagnostics = []
        page.on('console', lambda msg: diagnostics.append({'type':msg.type,'text':msg.text}) if msg.type in ['warning','error'] else None)
        page.on('requestfailed', lambda request: diagnostics.append({'url':request.url,'failure':request.failure}))
        page.on('pageerror', lambda e: errors.append(str(e)))
        if not three:
            await page.route('https://**/*', lambda r:r.abort())
        try:
            await page.goto(url)
            await settled(page)
            if three:
                await page.wait_for_function('MoldPress.app.state.engine.startsWith("Three.js")')
            report['renderer'] = await state(page, 's.engine')
            suffix = 'three' if three else ('canvas' if report['renderer']=='Canvas 3D' else 'local')
            report['mode'] = suffix
            await click(page, 'add-box')
            await page.wait_for_function('MoldPress.app.state.save==="saved"')
            before = await state(page)
            await page.reload()
            await settled(page)
            assert await state(page) == before
            check('Real HTTP origin autosave survives browser reload')
            await click(page, 'lang-en')
            assert await page.locator('html').get_attribute('lang') == 'en'
            await click(page, 'lang-ko')
            assert await page.locator('html').get_attribute('lang') == 'ko'
            check('Document language follows KR/EN controls')

            fixture=json.loads((ROOT/'tests/press-completed.moldpress.json').read_text(encoding='utf-8'))
            fixture['material']='unknown-material'
            fixture['tray'][0]['material']='unknown-material'
            fixture['tray'][0]['part']['material']='constructor'
            await upload(page, fixture)
            assert await state(page,'s.p.id') == fixture['id']
            assert await state(page,'s.p.material') == 'ABS'
            assert await state(page,'s.p.tray[0].material') == 'ABS'
            await click(page, 'tab-press')
            assert await page.get_by_test_id('press-one').is_enabled()
            check('Unknown project/body/tray materials normalize safely to ABS')

            stable=await state(page,'JSON.stringify(s.p)')
            history=await state(page,'[a.undoStack.length,a.redoStack.length]')
            broken=json.loads(stable)
            broken['bodies'][0]['tool']['pins']=9
            await upload(page,broken)
            assert await state(page,'JSON.stringify(s.p)') == stable
            assert await state(page,'[a.undoStack.length,a.redoStack.length]') == history
            broken=json.loads(stable)
            broken['bodies'][1]['id']=broken['bodies'][0]['id']
            await upload(page,broken)
            assert await state(page,'JSON.stringify(s.p)') == stable
            # A failed mutation must leave both undo and redo histories usable.
            await page.evaluate('()=>{const a=MoldPress.app;try{a.edit("failed operation",p=>{p.name="partial";throw Error("fixture failure")})}catch{}}')
            assert await state(page,'JSON.stringify(s.p)') == stable
            assert await state(page,'[a.undoStack.length,a.redoStack.length]') == history
            check('Invalid mold/duplicate IDs and failed edits preserve project and undo history')

            await click(page,'tab-studio')
            await click(page,'open-export')
            exports={}
            for kind in ['json','stl','glb','parts','png']:
                async with page.expect_download() as pending:
                    await click(page,'export-'+kind)
                download=await pending.value
                path=OUTPUT/(suffix+'-'+download.suggested_filename)
                await download.save_as(path)
                assert await download.failure() is None
                data=path.read_bytes()
                if kind=='json': assert json.loads(data)['id']==fixture['id']
                elif kind=='stl': assert len(data)==84+50*struct.unpack_from('<I',data,80)[0]
                elif kind=='glb': assert data[:4]==b'glTF' and struct.unpack_from('<I',data,8)[0]==len(data)
                elif kind=='parts':
                    with zipfile.ZipFile(path) as z:
                        assert len(z.namelist())==2 and z.testzip() is None
                else: assert data[:8]==b'\x89PNG\r\n\x1a\n' and len(data)>2000
                exports[kind]={'bytes':len(data),'file':path.name}
            check('Actual JSON, binary STL, GLB, parts ZIP and PNG downloads',files=exports)
            await page.locator('.modal-head .icon-btn').click()
            await click(page,'tab-press')
            for material in ['ABS','PP','PC','Nylon','Aluminum 6061','Zinc','CF Nylon']:
                await click(page,'material-'+material.replace(' ','-'))
                surface=await state(page,'a.pressRig.blank.surface')
                assert surface and surface[0]>0
                if three:
                    assert await state(page,'a.view.renderer.cache.get("press-raw-panel").material.userData.surface.value.toArray()')==surface
            await click(page,'material-Aluminum-6061')
            await click(page,'press-one')
            await page.wait_for_function('MoldPress.app.state.progress>.37')
            await page.screenshot(path=str(OUTPUT/'evidence'/('press-'+suffix+'.png')))
            await page.wait_for_function('!MoldPress.app.state.running',timeout=60000)
            await page.locator('.left-sidebar').evaluate('e=>e.scrollTop=0')
            if await page.locator('.toast button').count():await page.locator('.toast button').click()
            await page.screenshot(path=str(OUTPUT/'evidence'/('press-complete-'+suffix+'.png')))
            check('All seven finishes update; complete textured press cycle',renderer=report['renderer'])
            await click(page,'tab-tooling')
            await page.screenshot(path=str(OUTPUT/'evidence'/('tooling-'+suffix+'.png')))
            await click(page,'reset-project')
            await click(page,'reset-confirm')
            await page.wait_for_function('MoldPress.app.state.save==="saved"')
            await page.reload()
            await settled(page)
            assert await state(page,'s.p.bodies.length+s.p.tray.length+s.p.assembly.length')==0
            check('Confirmed reset stays empty after real-origin reload')
            assert not errors,errors
            if three:
                programs=await state(page,'a.view.renderer.renderer.info.programs.map(p=>({runnable:p.diagnostics?.runnable}))')
                assert all(p.get('runnable') is not False for p in programs),programs
            report['pageErrors']=errors
            report['status']='PASS'
        except Exception:
            report['status']='FAIL'
            report['error']=traceback.format_exc()
            report['diagnostics']=diagnostics
            report['actualRenderer']=await state(page,'s.engine')
            report['pageErrors']=errors
            print(report['error'],flush=True)
            await page.screenshot(path=str(OUTPUT/'release-failure.png'))
        finally:
            (OUTPUT/('release-'+report.get('mode','unknown')+'-results.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
            await browser.close()
    if report['status']!='PASS':raise SystemExit(1)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--three',action='store_true')
    args=parser.parse_args()
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    try:asyncio.run(run(f'http://127.0.0.1:{server.server_port}/index.html',args.three))
    finally:server.shutdown();server.server_close();thread.join()
