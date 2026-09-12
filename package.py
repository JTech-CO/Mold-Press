"""Package the current verified build. Outputs remain inside dist/."""
from pathlib import Path
import hashlib
import json
import re
import zipfile
from assets import runtime_files, fingerprint

ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'index.html'
VERSION=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
files=runtime_files()
digest=fingerprint()
required=['syntax','enhancements','library','kernel','deployment','browser','storage','selection-edge','release-local','release-canvas']
reports={}
for key in required:
    path=ROOT/'tests/output'/f'{key}-results.json'
    if not path.exists():raise SystemExit(f'Missing {path.name}; run python tests/run_all.py.')
    report=json.loads(path.read_text(encoding='utf-8'))
    if report.get('status')!='PASS' or report.get('sha256')!=digest:
        raise SystemExit(f'{path.name} did not pass against the current HTML. Re-run the tests.')
    reports[key]=report
optional=ROOT/'tests/output/release-three-results.json'
if optional.exists():
    r=json.loads(optional.read_text(encoding='utf-8'))
    if r.get('status')=='PASS' and r.get('sha256')==digest:reports['release-three']=r
summary={'version':VERSION,'sha256':digest,'bytes':sum(p.stat().st_size for p in files),'fingerprintScope':'HTML and all JS/CSS runtime assets',
         'suites':{k:{'status':'PASS','checks':len(r.get('checks',r.get('scripts',[]))),
                       'renderer':r.get('renderer')} for k,r in reports.items()},
         'limitations':['Chromium only; software GPU tests do not certify physical GPUs.',
                        'No CAE/manufacturing certification; procedural finishes are viewport-only.',
                        'Public deployment is not performed by the package command.']}
dist=ROOT/'dist';dist.mkdir(exist_ok=True)
docs=[p for p in (ROOT/'docs').rglob('*') if p.is_file()]
portable=[*files,ROOT/'README.md',ROOT/'README.ko.md',ROOT/'LICENSE',ROOT/'THIRD_PARTY_NOTICES.md',*docs]
editable=[*portable,ROOT/'build.py',ROOT/'package.py',ROOT/'.gitignore',ROOT/'.gitattributes',ROOT/'assets.py',ROOT/'package.json',ROOT/'package-lock.json',ROOT/'.prettierrc.json',ROOT/'.prettierignore']
editable += [p for folder in ['.github'] for p in (ROOT/folder).rglob('*') if p.is_file()]
editable += [p for p in (ROOT/'tests').rglob('*') if p.is_file() and 'output' not in p.parts and '__pycache__' not in p.parts]
archives=[]
for suffix,files in [('',portable),('-source',editable)]:
    target=dist/f'Mold-Press-{VERSION}{suffix}.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as bundle:
        for path in sorted(set(files)):
            info=zipfile.ZipInfo(path.relative_to(ROOT).as_posix(),date_time=(2026,9,12,0,0,0))
            info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o644<<16
            bundle.writestr(info,path.read_bytes())
        bundle.writestr('verification.json',json.dumps(summary,indent=2).encode('utf-8'))
        for key,report in reports.items():
            bundle.writestr(f'verification/{key}-results.json',json.dumps(report,ensure_ascii=False,indent=2).encode('utf-8'))
    with zipfile.ZipFile(target) as bundle:
        assert bundle.testzip() is None
        assert all(bundle.read(p.relative_to(ROOT).as_posix())==p.read_bytes() for p in files)
    archives.append(target)
(dist/'checksums.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.name+'\n' for p in archives),encoding='utf-8')
(dist/'verification.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
for p in archives:print(f'{p.relative_to(ROOT)} ({p.stat().st_size:,} bytes)')
