"""Compare geometry/sketch/mate behavior with recorded pre-refactor signatures."""
import asyncio
import json
import traceback
from playwright.async_api import async_playwright
from support import ROOT, OUTPUT, APP_SHA256, launch_options

EXERCISE = '''async fixtures => {
  const M=MP,S=M.Sketch,results={};
  const signature=async mesh=>({triangles:mesh.length/9,
    volume:Number(M.volume(mesh).toFixed(8)),bounds:M.bounds(mesh),
    sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Float32Array(mesh).buffer))).map(b=>b.toString(16).padStart(2,'0')).join('')});
  for(const [name,mesh] of Object.entries({box:M.box(20,16,12),sphere:M.sphere(10),rounded:M.roundBox(25,18,12,2,4),cylinder:M.cylinder(8,20),torus:M.torus(16,4)}))
    results[name]=await signature(mesh);
  const first=M.box(20,20,20),second=M.translate(M.box(16,16,16),[8,0,0]);
  for(const op of ['union','subtract','intersect'])results[op]=await signature(M.csg(first,second,op));
  for(const [i,p] of M.splitMesh(first,'Z',2).entries())results['split'+i]=await signature(p);
  const project=M.validate(fixtures.sketch);
  for(const [i,f] of project.features.entries())results['feature'+i]=await signature(S.featureMesh(project,f));
  S.rebuild(project);
  results.rebuilt=[];for(const b of project.bodies)results.rebuilt.push(await signature(M.world(b)));
  const assembly=M.validate(fixtures.mates);M.Mate.solve(assembly);
  results.mates=assembly.assembly.map(b=>({id:b.id,pos:b.pos,rot:b.rot,scale:b.scale}));
  return results;
}'''

async def main():
    reference=ROOT/'tests/fixtures/kernel-signatures.json'
    source=ROOT/'index.html'
    fixtures={key:json.loads((ROOT/'tests/fixtures'/name).read_text(encoding='utf-8'))
        for key,name in [('sketch','sketch-extrude-cut.moldpress.json'),('mates','mated-blocks.moldpress.json')]}
    report={'status':'RUNNING','sha256':APP_SHA256,'checks':[]}
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(**launch_options())
        page=await browser.new_page()
        await page.route('https://**/*',lambda route:route.abort())
        try:
            await page.goto(source.resolve().as_uri())
            await page.wait_for_function('window.MoldPress?.app?.view')
            result=await page.evaluate(EXERCISE,fixtures)
            expected=json.loads(reference.read_text(encoding='utf-8'))
            assert result.keys()==expected.keys()
            for key,value in result.items():
                assert value==expected[key],key
                report['checks'].append({'name':key,'status':'PASS'})
            report['status']='PASS'
            print(f"PASS: {len(result)} geometry, feature and mate signatures unchanged.")
        except Exception:
            report['status']='FAIL';report['error']=traceback.format_exc();print(report['error'])
        finally:
            await browser.close()
            (OUTPUT/'kernel-results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    if report['status']!='PASS':raise SystemExit(1)

if __name__=='__main__':
    asyncio.run(main())
