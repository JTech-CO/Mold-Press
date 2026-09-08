"""Check every external JavaScript file and the HTML asset references."""
import json
import shutil
import subprocess
from support import ROOT, OUTPUT, APP_SHA256, runtime_files

node=shutil.which('node')
if not node:raise SystemExit('Node.js is required for syntax checks.')
files=runtime_files()
result={'status':'PASS','sha256':APP_SHA256,'fingerprintScope':'HTML and all JS/CSS runtime assets','scripts':[]}
for source in files:
    if source.suffix!='.js':continue
    check=subprocess.run([node,'--check',str(source)],text=True,encoding='utf-8',capture_output=True)
    result['scripts'].append({'file':source.relative_to(ROOT).as_posix(),'status':'FAIL' if check.returncode else 'PASS','error':check.stderr})
    if check.returncode:result['status']='FAIL'
(OUTPUT/'syntax-results.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(f"{result['status']}: {len(result['scripts'])} external scripts; {len(files)} runtime file references.")
if result['status']!='PASS':
    print(json.dumps(result,indent=2))
    raise SystemExit(1)
