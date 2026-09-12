"""Run the offline release checks; --three additionally verifies the optional CDN renderer."""
from pathlib import Path
import argparse
import os
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--three',action='store_true')
args=parser.parse_args()
env=dict(os.environ,PYTHONUTF8='1')
env.pop('MP_RENDERER',None)
for name in ['check_syntax.py','enhancements.py','library_tests.py','kernel_contract.py','browser_workflow.py','storage_tests.py','press_selection_edges.py','release_smoke.py','static_site.py']:
    subprocess.run([sys.executable,str(ROOT/'tests'/name)],cwd=ROOT,env=env,check=True)
subprocess.run([sys.executable,str(ROOT/'tests/release_smoke.py')],cwd=ROOT,env=dict(env,MP_RENDERER='canvas'),check=True)
if args.three:
    subprocess.run([sys.executable,str(ROOT/'tests/release_smoke.py'),'--three'],cwd=ROOT,env=env,check=True)
print('All requested suites passed.')
