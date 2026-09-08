"""Inherited click/drag workflow regressions using the actual external-file entrypoint.
Real-origin persistence and downloads are covered by release_smoke.py.
"""
import os, shutil
import asyncio, hashlib, json, math, traceback, zipfile
from pathlib import Path
from support import APP_SHA256, storage_test_document, OUTPUT, launch_options
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]; OUT=OUTPUT; EVID=OUTPUT/'evidence'
SOURCE=ROOT/'index.html'
RESULT={'status':'RUNNING','sha256':APP_SHA256,'checks':[],'limitations':['Isolated direct-file navigation; HTTP-origin checks are in release_smoke.py','External requests intentionally blocked; renderer recorded below']}
async def state(p,expr='s'):
 return await p.evaluate('()=>{const a=MoldPress.app,s=a.state,M=MP;return '+expr+';}')
async def wait(p):
 await p.wait_for_function('window.MoldPress?.app?.view && !MoldPress.app.state.busy',timeout=60000);await p.wait_for_timeout(180)
async def click(p,id):
 await p.get_by_test_id(id).click();await wait(p)
async def save():
 (OUT/'browser-results.json').write_text(json.dumps(RESULT,ensure_ascii=False,indent=2),encoding='utf-8')
def check(name,**data):
 RESULT['checks'].append({'name':name,'status':'PASS',**data});print('PASS',name,flush=True)
async def shot(p,name):
 if await p.locator('.toast button').count(): await p.locator('.toast button').click()
 await p.screenshot(path=str(EVID/name))
async def fresh(browser):
 p=await browser.new_page(viewport={'width':1600,'height':1000},accept_downloads=True);p.set_default_timeout(45000);p._errors=[]
 p.on('pageerror',lambda e:p._errors.append(str(e)));await p.route('https://**/*',lambda r:r.abort())
 await p.goto(SOURCE.resolve().as_uri(),wait_until='load');await wait(p);return p
async def run_cycle(p,testid,expected,observe=False):
 before=await state(p,'({az:a.view.az,el:a.view.el,viewH:a.view.viewH,target:a.view.target.slice()})')
 await click(p,testid);samples=[];phase_sets={};seen_keys=set()
 for i in range(600):
  q=await state(p,'({running:s.running,progress:s.progress,index:s.queueIndex,phase:s.phase,tray:s.p.tray.length,source:a.cycle?.body.id,key:a.machineCache?.key,z:a.pressRig?.moving[0].pos[2],camera:{az:a.view.az,el:a.view.el,viewH:a.view.viewH,target:a.view.target.slice()}})')
  if observe:
   assert q['camera']==before,{'expected':before,'actual':q}
   samples.append(q);seen_keys.add(q.get('key'));phase_sets.setdefault(str(q['index']),set()).add(q['phase'])
  if not q['running']:
   assert q['tray']==expected,q;break
  await p.wait_for_timeout(180)
 else:raise AssertionError('Cycle did not complete within observations')
 return {'camera':before,'samples':samples,'machineKeys':list(seen_keys),'phases':{k:sorted(v) for k,v in phase_sets.items()}}
async def import_project(p,project,name):
 path=OUT/name;path.write_text(json.dumps(project,ensure_ascii=False),encoding='utf-8');await p.locator('input[type=file]').set_input_files(str(path));await wait(p)
 assert await state(p,'s.p.id')==project['id'],await state(p,'s.toast')
async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(**launch_options())
  p=await fresh(browser)
  try:
   RESULT['renderer']=await state(p,'s.engine')
   # Ready molds are generated via the normal UI; no application methods are replaced.
   await click(p,'split-body');assert await state(p,'s.p.bodies.length')==2
   await click(p,'body-0');await p.get_by_test_id('body-1').click(modifiers=['Shift']);await click(p,'group')
   assert await state(p,'s.p.bodies.every(b=>b.group===s.p.bodies[0].group&&!!b.group)')
   await click(p,'tab-tooling');await click(p,'generate-all');assert await state(p,'s.p.bodies.every(b=>!!b.tool)')
   await click(p,'next-press');await p.get_by_test_id('press-speed').select_option('8');await wait(p)
   ids=await state(p,'s.p.bodies.map(b=>b.id)')
   assert await p.get_by_test_id('press-mold-0').is_visible() and await p.get_by_test_id('press-mold-1').is_visible()
   assert await p.locator('.viewport .press-sequence').count()==0
   box=await p.get_by_test_id('press-sequence').evaluate('el=>({parent:el.parentElement.className,bg:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderWidth,position:getComputedStyle(el).position})')
   assert 'press-footer' in box['parent'] and box['bg']=='rgba(0, 0, 0, 0)' and box['border']=='0px',box
   await shot(p,'01-ready-molds-inline-sequence.png');check('시퀀스를 캔버스 밖 footer 중앙으로 이동; 독립 박스 없음',layout=box)
   # Selecting a grouped body's second mold must still mean exactly that single mold.
   await click(p,'press-mold-1');assert await state(p,'s.pressTargetId')==ids[1];assert await state(p,'s.selected')==[ids[1]]
   await click(p,'material-PP');assert await state(p,'s.p.bodies.map(b=>b.material)')==['ABS','PP'];await click(p,'material-ABS')
   await run_cycle(p,'press-one',1)
   assert await state(p,'s.p.tray[0].part.sourceId')==ids[1]
   check('금형 02 직접 선택 후 선택 프레스; 그룹이 있어도 정확히 한 금형',sourceId=ids[1])
   # Use real mouse wheel and drags to customise all camera components before a whole run.
   vp=await p.locator('.viewport>canvas').bounding_box();x=vp['x']+vp['width']*.58;y=vp['y']+vp['height']*.48
   await p.mouse.move(x,y);await p.mouse.wheel(0,-360);await p.mouse.down();await p.mouse.move(x+47,y-21,steps=10);await p.mouse.up()
   await p.mouse.move(x,y);await p.mouse.down(button='right');await p.mouse.move(x-28,y+14,steps=8);await p.mouse.up(button='right');await p.wait_for_timeout(200)
   observation=await run_cycle(p,'press-all',3,True)
   assert len(observation['machineKeys'])>=2,observation['machineKeys']
   assert max(q['z'] for q in observation['samples'])-min(q['z'] for q in observation['samples'])>30
   assert {1,2} <= {q['index'] for q in observation['samples']}
   assert await state(p,'s.pressTargetId')==ids[1] and await state(p,'s.selected')==[ids[1]]
   (OUT/'camera-cycle-samples.json').write_text(json.dumps(observation,ensure_ascii=False,indent=2),encoding='utf-8')
   check('서로 크기가 다른 금형 2개 전체 프레스 동안 확대·회전·이동 시점 유지',frames=len(observation['samples']),camera=observation['camera'],phases=observation['phases'])
   await shot(p,'02-zoom-preserved-after-batch.png')
   await click(p,'press-mold-0');await run_cycle(p,'press-one',4);assert await state(p,'s.p.tray[3].part.sourceId')==ids[0]
   await click(p,'press-mold-1');await run_cycle(p,'press-one',5);assert await state(p,'s.p.tray[4].part.sourceId')==ids[1]
   check('선택 프레스 3회는 금형 02 → 01 → 02에 각각 대응',selectedRunSources=[ids[1],ids[0],ids[1]],allTraySources=await state(p,'s.p.tray.map(t=>t.part.sourceId)'))
   complete=await state(p,'s.p');(OUT/'press-completed.moldpress.json').write_text(json.dumps(complete,ensure_ascii=False),encoding='utf-8')
   # Previously made production/assembly paths must remain reachable.
   await click(p,'next-assembly');await click(p,'auto-assemble');assert await state(p,'s.p.assembly.length')==2
   check('프레스 결과의 기존 자동 조립 연결',assemblyCount=2)
   # Compose valid imported project fixtures to cover all data classes cleared by reset.
   sk=json.loads((ROOT/'tests/fixtures/sketch-extrude-cut.moldpress.json').read_text(encoding='utf-8'))
   ma=json.loads((ROOT/'tests/fixtures/mated-blocks.moldpress.json').read_text(encoding='utf-8'))
   full=await state(p,'s.p');full['id']='fix6-reset-full-fixture';full['name']='초기화 전체 상태 검증';full['bodies']+=sk['bodies'];full['sketches']=sk['sketches'];full['features']=sk['features'];full['assembly']=ma['assembly'];full['mates']=ma['mates']
   await import_project(p,full,'reset-full-fixture.moldpress.json')
   counts=await state(p,'Object.fromEntries(["bodies","tray","assembly","sketches","features","mates"].map(k=>[k,s.p[k].length]))')
   assert all(n>0 for n in counts.values()),counts
   await click(p,'tab-assembly')
   # State integrity on cancellation and deterministic destructive confirmation.
   header=await p.get_by_test_id('reset-project').evaluate('e=>({previous:e.previousElementSibling.dataset.testid,next:e.nextElementSibling.nextElementSibling.dataset.testid})')
   assert header=={'previous':'redo','next':'share'},header
   before=await state(p,'JSON.stringify(s.p)');undos=await state(p,'a.undoStack.length')
   await p.get_by_test_id('reset-project').hover();await p.wait_for_timeout(200)
   hover=await p.get_by_test_id('reset-project').evaluate('e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})');assert hover['bg']=='rgb(142, 52, 47)',hover
   await shot(p,'03-reset-button-hover.png')
   await click(p,'reset-project');assert await p.get_by_test_id('reset-dialog').is_visible();assert await p.get_by_test_id('reset-cancel').evaluate('e=>document.activeElement===e')
   await shot(p,'04-reset-confirmation.png');await click(p,'reset-cancel')
   assert await state(p,'JSON.stringify(s.p)')==before and await state(p,'a.undoStack.length')==undos
   await click(p,'reset-project');await p.keyboard.press('Escape');await wait(p);assert await state(p,'s.modal') is None;assert await state(p,'JSON.stringify(s.p)')==before
   check('초기화 버튼 위치·빨간 호버·확인 대화상자·취소와 Escape 데이터 보존',beforeCounts=counts,hover=hover)
   await click(p,'reset-project');await click(p,'reset-confirm')
   empty=await state(p,'({page:s.page,counts:Object.fromEntries(["bodies","tray","assembly","sketches","features","mates"].map(k=>[k,s.p[k].length])),undo:a.undoStack.length,redo:a.redoStack.length,running:s.running,progress:s.progress,queue:a.pressQueue.length,cycle:!!a.cycle,selected:s.selected.length,toolCache:M.toolCache.size,exportFile:s.exportFile,shareLink:s.shareLink,sketchMode:s.sketchMode,featureDialog:s.featureDialog,mateActive:s.mateActive})')
   assert not any(empty['counts'].values()) and empty['page']=='studio' and empty['undo']==empty['redo']==empty['queue']==empty['selected']==empty['toolCache']==0 and not empty['running'] and empty['exportFile'] is None and empty['shareLink']=='' and empty['featureDialog'] is None and not empty['mateActive'],empty
   await shot(p,'05-reset-empty-studio.png');await p.keyboard.press('Control+z');assert await state(p,'s.p.bodies.length')==0
   check('전체 모델링·스케치·금형·프레스·조립·Mate와 undo/redo 초기화',after=empty)
   await click(p,'tab-press');assert await p.locator('.press-mold-option').count()==0;assert await p.get_by_test_id('press-one').is_disabled() and await p.get_by_test_id('press-all').is_disabled()
   check('빈 프로젝트에서 금형 목록/선택 프레스/전체 프레스 안전 상태')
   # Reset mid-cycle: opening confirmation pauses without discarding; confirm cancels queue.
   await import_project(p,complete,'reset-during-run.moldpress.json');await click(p,'tab-press');await p.get_by_test_id('press-speed').select_option('8');await click(p,'press-all')
   await p.wait_for_function('MoldPress.app.state.progress>.13',timeout=40000);await click(p,'reset-project')
   paused=await state(p,'({p:a.cycle?.progress,tray:s.p.tray.length})');await p.wait_for_timeout(800);assert await state(p,'({p:a.cycle?.progress,tray:s.p.tray.length})')==paused
   await click(p,'reset-cancel');await p.wait_for_timeout(450);assert await state(p,'a.cycle.progress')>paused['p']
   await click(p,'reset-project');await click(p,'reset-confirm');await p.wait_for_timeout(2300)
   assert await state(p,'s.p.bodies.length+s.p.tray.length+s.p.assembly.length+a.pressQueue.length')==0 and not await state(p,'s.running||!!a.cycle')
   check('실행 중 초기화 확인은 일시 정지; 취소는 재개; 확인은 대기열·취출 타이머 취소')
   # Reset remains functional in sketch editing and preserves language only.
   await click(p,'new-sketch');assert await state(p,'s.sketchMode')
   await p.get_by_test_id('sketch-tool-rectangle').click();await wait(p)
   await click(p,'reset-project');await click(p,'reset-confirm');assert not await state(p,'s.sketchMode') and await state(p,'s.p.sketches.length')==0
   check('스케치 편집 중 초기화: 오버레이/선택/피처 상태 해제')
   await import_project(p,complete,'layout-fixture.moldpress.json');await click(p,'tab-press')
   layouts=[]
   for width,height,lang in [(1400,850,'KR'),(1440,1000,'KR'),(1600,1000,'KR'),(1920,1080,'KR'),(1400,850,'EN'),(1920,1080,'EN')]:
    await p.set_viewport_size({'width':width,'height':height});await p.locator('.language-toggle button').filter(has_text=lang).click();await p.wait_for_timeout(250)
    layout=await p.evaluate('''()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};const f=document.querySelector('.press-footer'),q=document.querySelector('.press-sequence'),v=document.querySelector('.viewport');return {footer:rect(f),parts:[...f.children].map(rect),viewport:rect(v),stages:[...q.querySelectorAll('.sequence-stages>div')].map(rect),minFont:Math.min(...[...q.querySelectorAll('*')].filter(e=>e.textContent.trim()&&e.getBoundingClientRect().width).map(e=>parseFloat(getComputedStyle(e).fontSize))),pageOverflow:document.documentElement.scrollWidth>innerWidth}}''')
    assert not layout['pageOverflow'] and layout['minFont']>=12.5,layout
    A,Q,B=layout['parts'];assert A['right']<=Q['x']+1 and Q['right']<=B['x']+1 and B['right']<=layout['footer']['right']+1,layout
    assert Q['y']>=layout['viewport']['bottom']-1,layout
    rows=layout['stages'];assert max(r['y'] for r in rows)-min(r['y'] for r in rows)<1,layout
    await shot(p,f'layout-{width}x{height}-{lang}.png');layouts.append({'width':width,'height':height,'lang':lang,**layout})
   check('1400-1920px KR/EN 시퀀스 가로배치·버튼·본문 간섭 없음; 최소 12.5px',layouts=layouts)
   assert not p._errors,p._errors;RESULT['pageErrors']=p._errors;RESULT['status']='PASS';await save();print('ALL PASS',flush=True)
  except Exception:
   RESULT['status']='FAIL';RESULT['error']=traceback.format_exc();RESULT['pageErrors']=p._errors;print(RESULT['error'],flush=True)
   try:await p.screenshot(path=str(OUT/'failure.png'));RESULT['failureState']=await state(p,'({page:s.page,modal:s.modal,busy:s.busy,toast:s.toast,selected:s.selected,target:s.pressTargetId,running:s.running,tray:s.p.tray.length})')
   except Exception:pass
   await save();raise
  finally:await browser.close()
if __name__=='__main__':asyncio.run(main())
