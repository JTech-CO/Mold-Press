"""Shared isolated-browser settings. MP_RENDERER=canvas exercises the CPU fallback."""
from pathlib import Path
import os
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'tests' / 'output'
OUTPUT.mkdir(exist_ok=True)
(OUTPUT / 'evidence').mkdir(exist_ok=True)

def launch_options():
    args = ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader']
    if os.environ.get('MP_RENDERER') == 'canvas':
        args.append('--disable-webgl')
    return dict(headless=True, executable_path=os.environ.get('CHROMIUM_PATH')
                or shutil.which('chromium') or shutil.which('google-chrome'), args=args)

# Every report covers HTML + every referenced JS and CSS file.
import sys
sys.path.insert(0, str(ROOT))
from assets import fingerprint, runtime_files
APP_SHA256 = fingerprint()

def storage_test_document():
    """Inline files only inside the explicit Storage-double suite's about:blank page."""
    import re
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    html=re.sub(r'<script\b[^>]*src="([^"]+)"[^>]*>\s*</script>',
        lambda m:'<script>'+ (ROOT/m[1]).read_text(encoding='utf-8') + '</script>',html)
    html=re.sub(r'<link\b[^>]*href="(css/[^"]+)"[^>]*>',
        lambda m:'<style>'+ (ROOT/m[1]).read_text(encoding='utf-8') + '</style>',html)
    return html
