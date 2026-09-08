"""Reset races using the real UI and save/load code, with an explicit in-memory
Storage test double. This is NOT evidence of actual-origin browser persistence.
"""
import os, shutil
import asyncio,json,traceback,hashlib
from pathlib import Path
from support import APP_SHA256, storage_test_document, OUTPUT, launch_options
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'index.html';OUT=OUTPUT
RESULT={'status':'RUNNING','storage':'explicit in-memory Storage test double','sha256':APP_SHA256,'checks':[]}
async def val(p,e):return await p.evaluate('()=>{const a=MoldPress.app,s=a.state,M=MP;return '+e+';}')
async def click(p,id):await p.get_by_test_id(id).click();await p.wait_for_timeout(180)
async def loaded(p):await p.wait_for_function('window.MoldPress?.app?.view && MoldPress.app.state.save==="saved"',timeout=25000)
async def fresh(b,seed,fragment=''):
 p=await b.new_page(viewport={'width':1440,'height':1000});p.set_default_timeout(15000);await p.route('https://**/*',lambda r:r.abort());p._errors=[];p.on('pageerror',lambda e:p._errors.append(str(e)))
 await p.evaluate('''seed=>{window.__storage=new Map(Object.entries(seed));Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__storage.get(String(k))??null,setItem:(k,v)=>__storage.set(String(k),String(v)),removeItem:k=>__storage.delete(String(k)),clear:()=>__storage.clear(),key:i=>[...__storage.keys()][i]??null,get length(){return __storage.size}}});}''',seed)
 if fragment:await p.evaluate('h=>location.hash=h',fragment)
 await p.set_content(storage_test_document(),wait_until='domcontentloaded');await loaded(p);return p
async def delay_next_compress(p):
 await p.evaluate('''()=>{const original=MP.compress;let once=true;MP.compress=text=>{if(!once)return original(text);once=false;window.__delayedText=text;return new Promise((resolve,reject)=>{window.__releaseOld=async()=>resolve(await original(text));window.__rejectOld=()=>reject(new Error('stale storage error'));});};}''')
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(**launch_options())
  p=None
  try:
   fixture=json.loads((ROOT/'tests/press-completed.moldpress.json').read_text(encoding='utf-8'));snapshot='J'+json.dumps(fixture,ensure_ascii=False)
   p=await fresh(b,{'mold-press.project.v1':snapshot,'mold-press.share.reset-fixture':snapshot,'mold-press.shares':'["reset-fixture"]','unrelated-app.preference':'keep'},'#copy=reset-fixture')
   assert await val(p,'s.p.bodies.length')==2;assert await p.evaluate('location.hash')=='#copy=reset-fixture'
   await click(p,'reset-project');await click(p,'reset-confirm');await loaded(p)
   st=await p.evaluate('Object.fromEntries(__storage)');saved=await p.evaluate('async()=>JSON.parse(await MP.decompress(localStorage.getItem(MP.STORAGE)))')
   assert saved['bodies']==saved['tray']==saved['assembly']==[] and st['unrelated-app.preference']=='keep'
   assert 'mold-press.share.reset-fixture' in st # Independent snapshot remains a backup, not current progress.
   assert await p.evaluate('location.hash')==''
   RESULT['checks'].append({'name':'Reset saves a blank project, clears the active clone hash, leaves unrelated storage and independent snapshots intact','status':'PASS'})
   await p.close();p=await fresh(b,st);assert await val(p,'s.p.id')==saved['id'] and await val(p,'s.p.bodies.length')==0
   RESULT['checks'].append({'name':'M.load restores the saved blank project rather than the default sample (Storage test double)','status':'PASS'})
   # Delayed old autosave must not overwrite a confirmed empty project.
   await delay_next_compress(p);await click(p,'add-box');await p.wait_for_function('!!window.__releaseOld')
   assert await val(p,'s.p.bodies.length')==1
   await click(p,'reset-project');await click(p,'reset-confirm');await loaded(p);reset_id=await val(p,'s.p.id')
   await p.evaluate('window.__releaseOld()');await p.wait_for_timeout(450)
   x=await p.evaluate('async()=>JSON.parse(await MP.decompress(localStorage.getItem(MP.STORAGE)))');assert x['id']==reset_id and x['bodies']==[]
   RESULT['checks'].append({'name':'In-flight old autosave cannot resurrect pre-reset bodies','status':'PASS'})
   # A failed obsolete write must not replace the new success state with a stale error.
   await delay_next_compress(p);await click(p,'add-box');await p.wait_for_timeout(700)
   await click(p,'reset-project');await click(p,'reset-confirm');await loaded(p)
   await p.evaluate('window.__rejectOld()');await p.wait_for_timeout(250);assert await val(p,'s.save')=='saved'
   RESULT['checks'].append({'name':'Obsolete autosave rejection cannot overwrite post-reset save status','status':'PASS'})
   # Delayed clone-link creation after closing its modal must not publish stale state.
   await delay_next_compress(p);before=await p.evaluate('[...__storage.keys()].filter(k=>k.startsWith("mold-press.share."))')
   await click(p,'share');await p.wait_for_function('MoldPress.app.state.shareBusy');await p.locator('.modal-head .icon-btn').click()
   await click(p,'reset-project');await click(p,'reset-confirm');await loaded(p)
   await p.evaluate('window.__releaseOld()');await p.wait_for_timeout(300)
   assert await val(p,'s.shareLink')=='' and not await val(p,'s.shareBusy');assert await p.evaluate('[...__storage.keys()].filter(k=>k.startsWith("mold-press.share."))')==before
   RESULT['checks'].append({'name':'A pending clone-link response cannot reintroduce old share state after reset','status':'PASS'})
   # Clearing current progress must not permanently disable subsequent editing or saving.
   await click(p,'add-box');await loaded(p);assert await val(p,'s.p.bodies.length')==1
   stored=await p.evaluate('async()=>JSON.parse(await MP.decompress(localStorage.getItem(MP.STORAGE)))');assert len(stored['bodies'])==1
   assert not p._errors,p._errors;RESULT['checks'].append({'name':'New modeling and autosave continue normally after reset','status':'PASS'});RESULT['pageErrors']=p._errors;RESULT['status']='PASS'
  except Exception:RESULT['status']='FAIL';RESULT['error']=traceback.format_exc();print(RESULT['error'],flush=True)
  finally:
   (OUT/'storage-results.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(RESULT,ensure_ascii=False,indent=2),flush=True);await b.close()
  if RESULT['status']!='PASS':raise SystemExit(1)
if __name__=='__main__':asyncio.run(main())
