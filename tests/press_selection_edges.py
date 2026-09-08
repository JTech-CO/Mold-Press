"""Additional ready-mold list/selection regression cases; actual browser controls."""
import os, shutil
import asyncio,json,copy,traceback,hashlib
from pathlib import Path
from support import APP_SHA256, storage_test_document, OUTPUT, launch_options
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=OUTPUT;SRC=ROOT/'index.html'
RES={'status':'RUNNING','sha256':APP_SHA256,'checks':[]}
async def state(p,e):return await p.evaluate('()=>{const a=MoldPress.app,s=a.state;return '+e+';}')
async def wait(p):await p.wait_for_function('window.MoldPress?.app && !MoldPress.app.state.busy');await p.wait_for_timeout(200)
async def click(p,id):await p.get_by_test_id(id).click();await wait(p)
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(**launch_options());p=await b.new_page(viewport={'width':1400,'height':850});errors=[];p.on('pageerror',lambda e:errors.append(str(e)));await p.route('https://**/*',lambda r:r.abort())
  try:
   fixture=json.loads((ROOT/'tests/press-completed.moldpress.json').read_text(encoding='utf-8'));base=copy.deepcopy(fixture['bodies'][0]);unt=copy.deepcopy(base);unt.update(id='not-tooled',name='아직 금형이 없는 바디',tool=None,group=None)
   ready=[]
   for i in range(8):
    q=copy.deepcopy(base);q.update(id='edge-mold-'+str(i),name=f'완성 금형 {i+1:02d} · 긴 부품 이름 선택 검증',group=None);ready.append(q)
   fixture.update(id='fix6-ready-list-edges',bodies=[unt,*ready],tray=[],assembly=[],sketches=[],features=[],mates=[])
   f=OUT/'many-molds-fixture.moldpress.json';f.write_text(json.dumps(fixture,ensure_ascii=False),encoding='utf-8')
   await p.goto(SRC.resolve().as_uri(),wait_until='load');await wait(p);await p.locator('input[type=file]').set_input_files(str(f));await wait(p);await click(p,'tab-press')
   assert await p.locator('.press-mold-option').count()==8;assert await state(p,'s.pressTargetId')=='edge-mold-0';assert await p.get_by_test_id('press-all').is_disabled();assert await p.get_by_test_id('press-one').is_enabled()
   await click(p,'press-mold-7');assert await state(p,'s.pressTargetId')=='edge-mold-7';assert await p.locator('.press-mold-list').evaluate('e=>e.scrollTop>0');assert await state(p,'a.active().id')=='edge-mold-7'
   RES['checks'].append({'name':'Only ready molds appear; all eight entries including a long-name last item are selectable; untooled first body is not used','status':'PASS'})
   cam=await state(p,'({target:a.view.target.slice(),az:a.view.az,el:a.view.el,viewH:a.view.viewH})');await click(p,'press-mold-1');await click(p,'press-mold-7');assert await state(p,'({target:a.view.target.slice(),az:a.view.az,el:a.view.el,viewH:a.view.viewH})')==cam
   await click(p,'tab-studio');await p.keyboard.press('Delete');await wait(p);assert await state(p,'s.p.bodies.some(b=>b.id==="edge-mold-7")') is False
   await click(p,'tab-press');assert await p.locator('.press-mold-option').count()==7;assert await state(p,'s.pressTargetId')=='edge-mold-0';assert await state(p,'a.active().tool!==null')
   RES['checks'].append({'name':'Deleting the selected mold invalidates its target; next ready mold is selected instead of the untooled first body; list clicks preserve camera','status':'PASS'})
   await p.keyboard.press('f');cam0=await state(p,'a.view.viewH');rect=await p.locator('.viewport>canvas').bounding_box();await p.mouse.move(rect['x']+rect['width']*.5,rect['y']+rect['height']*.5);await p.mouse.wheel(0,-200);await p.wait_for_timeout(150);assert await state(p,'a.view.viewH')<cam0;await p.keyboard.press('f');await p.wait_for_timeout(150);assert abs(await state(p,'a.view.viewH')-cam0)<1e-8
   await click(p,'lang-en');await click(p,'reset-project');await click(p,'reset-confirm');assert await state(p,'s.lang')=='en' and await state(p,'s.p.bodies.length')==0
   RES['checks'].append({'name':'Explicit F still refits; reset preserves EN while clearing the project','status':'PASS'})
   assert not errors,errors;RES['status']='PASS';RES['pageErrors']=errors
  except Exception:RES['status']='FAIL';RES['error']=traceback.format_exc();print(RES['error'],flush=True)
  finally:(OUT/'selection-edge-results.json').write_text(json.dumps(RES,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(RES,ensure_ascii=False,indent=2),flush=True);await b.close()
  if RES['status']!='PASS':raise SystemExit(1)
asyncio.run(main())
