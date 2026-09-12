"""Behavioral checks for the manufacturing-workspace improvements."""
import asyncio
import functools
import http.server
import json
import os
import threading
import traceback
from playwright.async_api import async_playwright
from support import ROOT, OUTPUT, APP_SHA256, launch_options

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass

async def run(url):
    report = {'status': 'RUNNING', 'sha256': APP_SHA256, 'checks': []}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(**launch_options())
        page = await browser.new_page(viewport={'width': 1600, 'height': 1000})
        if os.environ.get('MP_RENDERER') == 'webgl1':
            await page.add_init_script("const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)}")
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        if os.environ.get('MP_RENDERER') != 'three':
            await page.route('https://**/*', lambda r: r.abort())
        try:
            await page.goto(url)
            await page.wait_for_function('window.MoldPress?.app?.view')
            if os.environ.get('MP_RENDERER') == 'three':
                await page.wait_for_function('MoldPress.app.state.engine.startsWith("Three.js")')
            report['checks'] = await page.evaluate((ROOT/'tests/enhancements.js').read_text(encoding='utf-8'))
            await page.get_by_test_id('tab-tooling').click()
            await page.get_by_test_id('section-enabled').check()
            await page.get_by_test_id('section-axis').select_option('Y')
            await page.get_by_test_id('section-reverse').check()
            await page.get_by_test_id('tool-gap').fill('24')
            await page.get_by_test_id('lang-en').click()
            assert await page.get_by_test_id('inspection-panel').is_visible()
            assert await page.evaluate('MoldPress.app.state.sectionAxis') == 'Y'
            assert await page.evaluate('MoldPress.app.state.toolGap') == 24
            await page.get_by_test_id('section-enabled').uncheck()
            for quality in ['high', 'low', 'standard']:
                await page.get_by_test_id('render-quality').select_option(quality)
                await page.wait_for_timeout(250)
                assert await page.evaluate('MoldPress.app.view.renderer.quality') == quality
                if os.environ.get('MP_RENDERER') == 'three':
                    assert await page.evaluate('MoldPress.app.view.renderer.renderer.shadowMap.enabled') == (quality == 'high')
                    assert await page.evaluate('MoldPress.app.view.renderer.renderer.info.programs.every(p => p.diagnostics?.runnable !== false)')
            report['checks'].append({'name': 'Quality switches render successfully including high-quality shadows where supported', 'status': 'PASS'})
            await page.evaluate("MoldPress.app.edit('PC view check', p=>{p.bodies[0].material='PC'})")
            await page.get_by_test_id('pc-transparent').check()
            await page.get_by_test_id('render-quality').select_option('high')
            await page.wait_for_timeout(350)
            assert await page.evaluate('MoldPress.app.view.records.some(r=>r.transmission>0)')
            if os.environ.get('MP_RENDERER') == 'three':
                assert await page.evaluate('Array.from(MoldPress.app.view.renderer.cache.values()).some(o=>o.material.isMeshPhysicalMaterial && o.material.transmission>0 && o.visible)')
                assert await page.evaluate('MoldPress.app.view.renderer.renderer.info.programs.every(p=>p.diagnostics?.runnable !== false)')
            await page.get_by_test_id('pc-transparent').uncheck()
            await page.wait_for_timeout(100)
            assert await page.evaluate('MoldPress.app.view.records.every(r=>!r.transmission)')
            report['checks'].append({'name':'PC transparency enables and restores without geometry edits or shader failures','status':'PASS'})
            await page.get_by_test_id('render-quality').select_option('standard')
            await page.get_by_test_id('tab-press').click()
            await page.get_by_test_id('component-labels').check()
            await page.wait_for_timeout(150)
            assert await page.get_by_test_id('component-label-overlay').is_visible()
            assert await page.locator('[data-component="pin-plate"]').evaluate('(e)=>Number.isFinite(parseFloat(e.style.top)) && e.style.display!=="none"')
            await page.screenshot(path=str(OUTPUT/'evidence/components.png'))
            await page.get_by_test_id('component-labels').uncheck()
            report['checks'].append({'name':'Component labels follow mounted geometry with finite screen coordinates','status':'PASS'})
            baseline = await page.evaluate('JSON.stringify(MoldPress.app.state.p)')
            await page.get_by_test_id('replay-press').click()
            await page.get_by_test_id('replay-seek').fill('75')
            assert await page.evaluate('MoldPress.app.state.progress') == .75
            await page.get_by_test_id('replay-seek').fill('0')
            await page.get_by_test_id('pause-press').click()
            await page.wait_for_timeout(250)
            await page.get_by_test_id('pause-press').click()
            paused = await page.evaluate('MoldPress.app.cycle.progress')
            await page.wait_for_timeout(250)
            assert await page.evaluate('MoldPress.app.cycle.progress') == paused
            await page.get_by_test_id('step-press').click()
            assert await page.evaluate('MoldPress.app.cycle.progress') == .34
            await page.screenshot(path=str(OUTPUT/'evidence/playback-paused.png'))
            await page.get_by_test_id('replay-seek').fill('100')
            await page.get_by_test_id('pause-press').click()
            await page.wait_for_function('MoldPress.app.state.pressPaused && MoldPress.app.cycle.progress===1', timeout=15000)
            assert await page.evaluate('JSON.stringify(MoldPress.app.state.p)') == baseline
            await page.get_by_test_id('cancel-press').click()
            count = await page.evaluate('MoldPress.app.state.p.tray.length')
            await page.get_by_test_id('press-one').click()
            await page.get_by_test_id('pause-press').click()
            for _ in range(5):
                await page.get_by_test_id('step-press').click()
                await page.wait_for_timeout(60)
            await page.wait_for_function('!MoldPress.app.state.running')
            await page.wait_for_timeout(300)
            assert await page.evaluate('MoldPress.app.state.p.tray.length') == count+1
            report['checks'].append({'name':'Pause freezes time; stage stepping completes once; full replay preserves project and tray','status':'PASS'})
            await page.get_by_test_id('replay-press').click()
            await page.get_by_test_id('reset-project').click()
            await page.get_by_test_id('reset-confirm').click()
            await page.wait_for_timeout(350)
            assert await page.evaluate('!MoldPress.app.cycle && !MoldPress.app.lastPress && !MoldPress.app.state.running && !MoldPress.app.state.pressReplay && MoldPress.app.state.p.tray.length===0')
            report['checks'].append({'name':'Reset clears replay and pending production','status':'PASS'})
            await page.wait_for_function('MoldPress.app.state.save!=="saving"')
            await page.evaluate('MoldPress.app.setState({toast:""})')
            await page.wait_for_timeout(150)
            before = await page.evaluate('MoldPress.app.overlayUpdates')
            await page.wait_for_timeout(400)
            assert await page.evaluate('MoldPress.app.overlayUpdates') == before
            await page.evaluate('MoldPress.app.view.az+=.1')
            await page.wait_for_timeout(100)
            assert await page.evaluate('MoldPress.app.overlayUpdates') > before
            report['checks'].append({'name':'Idle overlays skip bounds and DOM updates; camera changes refresh them','status':'PASS'})
            assert not errors, errors
            report['checks'].append({'name': 'Section controls work without page errors in the live UI', 'status': 'PASS'})
            await page.screenshot(path=str(OUTPUT/'evidence/enhancements.png'))
            report['status'] = 'PASS'
            print(f"PASS: {len(report['checks'])} enhancement contracts.", flush=True)
        except Exception:
            report['status'] = 'FAIL'
            report['error'] = traceback.format_exc()
            print(report['error'], flush=True)
        finally:
            await browser.close()
            (OUTPUT/'enhancements-results.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    if report['status'] != 'PASS': raise SystemExit(1)

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    try: asyncio.run(run(f'http://127.0.0.1:{server.server_port}/'))
    finally: server.shutdown(); server.server_close(); thread.join()
