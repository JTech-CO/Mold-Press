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
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.route('https://**/*', lambda r: r.abort())
        try:
            await page.goto(url)
            await page.wait_for_function('window.MoldPress?.app?.view')
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
