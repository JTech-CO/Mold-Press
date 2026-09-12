"""Real-origin named-project, IndexedDB history, recovery and failure checks."""
import asyncio, functools, http.server, json, threading, traceback
from playwright.async_api import async_playwright
from support import ROOT, OUTPUT, APP_SHA256, launch_options

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

async def run(url):
    report={'status':'RUNNING','sha256':APP_SHA256,'checks':[]}
    def passed(name): report['checks'].append({'name':name,'status':'PASS'})
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(**launch_options())
        page=await browser.new_page(viewport={'width':1600,'height':1000})
        await page.route('https://**/*',lambda r:r.abort())
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        async def saved():
            await page.wait_for_function('window.MoldPress?.app?.view && MoldPress.app.state.save==="saved" && !MoldPress.app.state.busy',timeout=25000)
        try:
            await page.goto(url);await saved()
            await page.evaluate("()=>{const p=MP.newProject('new');p.bodies=[MP.body('Library fixture',MP.box(20,16,12))];MoldPress.app.setState({p,selected:[p.bodies[0].id]})}")
            await saved()
            await page.evaluate("MoldPress.app.setState({modal:'samples'})")
            await page.get_by_test_id('project-name').fill('Primary mold')
            await page.get_by_test_id('library-save').click();await saved()
            original=await page.evaluate('MoldPress.getProject()');pid=original['id']
            entries=await page.evaluate('MP.library.list()')
            entry=next(e for e in entries if e['id']==pid);old_revision=entry['revisions'][0]['id']
            assert entry['name']=='Primary mold' and entry['bytes']>0
            passed('Named project saves to real IndexedDB and reports stored bytes')
            await page.evaluate("MoldPress.app.edit('Change fixture',p=>{p.bodies[0].pos[0]=9})");await saved()
            await page.get_by_test_id('project-name').fill('Secondary mold')
            await page.get_by_test_id('library-copy').click();await saved()
            entries=await page.evaluate('MP.library.list()');copy=next(e for e in entries if e['name']=='Secondary mold')
            assert copy['id']!=pid
            await page.get_by_test_id('library-open-'+copy['id']).click();await saved()
            assert await page.evaluate('MoldPress.app.state.p.name')=='Secondary mold'
            await page.reload();await saved()
            assert await page.evaluate('MoldPress.app.state.p.id')==copy['id']
            passed('Separate named copies open and survive a real-origin reload')
            await page.evaluate("MoldPress.app.setState({modal:'samples'})")
            await page.wait_for_function('(id)=>MoldPress.app.state.libraryEntries?.some(e=>e.id===id)',arg=pid)
            await page.locator(f'[data-project-id="{pid}"] summary').click()
            await page.get_by_test_id('library-restore-'+old_revision).click();await saved()
            assert await page.evaluate('MoldPress.app.state.p.bodies[0].pos[0]')==original['bodies'][0]['pos'][0]
            assert await page.evaluate('MoldPress.app.undoStack.length')==0
            passed('A prior revision restores geometry and resets incompatible undo history')
            for i in range(7):
                await page.evaluate('(i)=>MoldPress.app.edit("Revision",p=>{p.bodies[0].pos[1]=i})',i)
                await saved()
            entries=await page.evaluate('MP.library.list()');entry=next(e for e in entries if e['id']==pid)
            assert len(entry['revisions'])==5
            await page.evaluate("MoldPress.app.setState({modal:'samples'})")
            await page.wait_for_timeout(200)
            await page.screenshot(path=str(OUTPUT/'evidence/library.png'))
            passed('History retains the latest five revisions and the library UI remains usable')
            # Damage only this isolated test origin's current localStorage copy.
            await page.evaluate("localStorage.setItem(MP.STORAGE,'{corrupt')")
            await page.reload();await saved()
            assert await page.evaluate('MoldPress.app.state.p.id')==pid
            assert await page.evaluate('MoldPress.app.state.p.bodies[0].pos[1]')==6
            passed('Corrupt current localStorage recovers the latest valid IndexedDB save')
            # Simulate quota exhaustion for the current localStorage key only.
            await page.evaluate("()=>{window.__setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===MP.STORAGE)throw new DOMException('Quota full','QuotaExceededError');return __setItem.call(this,k,v)}}")
            await page.evaluate("MoldPress.app.edit('Quota fixture',p=>{p.bodies[0].pos[2]=11})");await saved()
            await page.reload();await saved()
            assert await page.evaluate('MoldPress.app.state.p.bodies[0].pos[2]')==11
            passed('IndexedDB preserves a newer save when localStorage quota is exhausted')
            await page.evaluate("MoldPress.app.setState({modal:'samples'})")
            await page.get_by_test_id('library-delete-'+copy['id']).click()
            assert await page.get_by_test_id('library-delete-confirm').is_visible()
            await page.get_by_test_id('library-delete-confirm').click();await saved()
            assert not any(e['id']==copy['id'] for e in await page.evaluate('MP.library.list()'))
            assert await page.evaluate('MoldPress.app.state.p.id')==pid
            await page.locator('.modal-head .icon-btn').click()
            passed('Confirmed library deletion removes only the chosen inactive project')
            # A corrupt revision must never replace the workspace when explicitly restored.
            before=await page.evaluate('JSON.stringify(MoldPress.app.state.p)')
            await page.evaluate('''async id=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('mold-press.library.v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});await new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite'),s=tx.objectStore('projects'),r=s.get(id);r.onsuccess=()=>{const e=r.result;e.revisions.push({id:'broken',date:new Date().toISOString(),data:'J{}'});s.put(e)};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}''',pid)
            await page.evaluate('(id)=>MoldPress.app.openLibrary(id,"broken")',pid)
            await page.wait_for_function('!MoldPress.app.state.busy')
            assert await page.evaluate('JSON.stringify(MoldPress.app.state.p)')==before
            passed('Invalid saved revisions are rejected without changing the workspace')
            # Guarded delayed saves cannot move the active pointer back to an old project.
            await page.evaluate('''async()=>{let current=true;const p=MP.newProject('new');p.name='Stale';const pending=MP.library.save(p,{active:true,isCurrent:()=>current});current=false;await pending}''')
            assert await page.evaluate('async()=>(await MP.library.active()).id')==pid
            passed('Obsolete queued writes cannot replace the active project pointer')
            await page.evaluate("()=>{window.__librarySave=MP.library.save;MP.library.save=async()=>{throw Error('Storage denied')}}")
            await page.evaluate("MoldPress.app.edit('Fallback fixture',p=>{p.bodies[0].pos[0]=14})");await saved()
            assert await page.evaluate('async()=>JSON.parse(await MP.decompress(localStorage.getItem(MP.STORAGE))).bodies[0].pos[0]')==14
            await page.evaluate('()=>{MP.library.save=window.__librarySave}')
            passed('Existing localStorage autosave continues when the project library is unavailable')
            await page.evaluate("()=>{window.__localSet=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('Quota full')};MP.library.save=async()=>{throw Error('Database full')}}")
            await page.evaluate("MoldPress.app.edit('Both stores unavailable',p=>{p.bodies[0].pos[0]=19})")
            await page.wait_for_function('MoldPress.app.state.save==="error"')
            assert await page.evaluate('MoldPress.app.state.p.bodies[0].pos[0]')==19
            await page.evaluate('()=>{Storage.prototype.setItem=window.__localSet;MP.library.save=window.__librarySave;MoldPress.app.scheduleSave()}');await saved()
            passed('Both-store failure reports an error while preserving the in-memory project')
            await page.get_by_test_id('reset-project').click()
            await page.get_by_test_id('reset-confirm').click();await saved()
            assert any(e['id']==pid for e in await page.evaluate('MP.library.list()'))
            assert await page.evaluate('async()=>(await MP.load()).project.bodies.length')==0
            passed('Reset archives the preceding workspace and reload still selects the new empty project')
            assert not errors,errors
            report['status']='PASS';print(f"PASS: {len(report['checks'])} real-origin library checks.",flush=True)
        except Exception:
            report['status']='FAIL';report['error']=traceback.format_exc();print(report['error'],flush=True)
        finally:
            await browser.close()
            (OUTPUT/'library-results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    if report['status']!='PASS':raise SystemExit(1)

if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:asyncio.run(run(f'http://127.0.0.1:{server.server_port}/'))
    finally:server.shutdown();server.server_close();thread.join()
