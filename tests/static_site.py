"""Verify the built multi-file app from a Pages-like HTTP subdirectory."""
import asyncio
import functools
import http.server
import json
import subprocess
import sys
import threading
from playwright.async_api import async_playwright
from support import ROOT, OUTPUT, APP_SHA256, launch_options, runtime_files

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*_args):pass

async def check(url):
    report={'status':'RUNNING','sha256':APP_SHA256,'checks':[]}
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(**launch_options())
        page=await browser.new_page()
        errors=[];responses=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('response',lambda r:responses.append((r.url,r.status)))
        await page.route('https://**/*',lambda route:route.abort())
        try:
            await page.goto(url)
            await page.wait_for_function('window.MoldPress?.app?.view && MoldPress.app.state.save==="saved"')
            await page.get_by_test_id('add-box').click()
            await page.wait_for_function('MoldPress.app.state.p.bodies.length===2')
            assert not errors,errors
            for file in runtime_files():
                if file.name=='index.html':continue
                expected=url+file.relative_to(ROOT).as_posix()
                assert (expected,200) in responses,(expected,responses)
            report['status']='PASS'
            report['checks']=[{'name':'Every JS/CSS asset loads under an HTTP subdirectory','status':'PASS'},
                {'name':'Built application starts, saves and edits without page errors','status':'PASS'}]
            print('PASS: built external assets and editing under /site/.')
        finally:
            (OUTPUT/'deployment-results.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
            await browser.close()

if __name__=='__main__':
    subprocess.run([sys.executable,str(ROOT/'build.py')],check=True)
    for p in runtime_files():assert (ROOT/'dist/site'/p.relative_to(ROOT)).read_bytes()==p.read_bytes()
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'dist')))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    try:asyncio.run(check(f'http://127.0.0.1:{server.server_port}/site/'))
    finally:server.shutdown();server.server_close();thread.join()
