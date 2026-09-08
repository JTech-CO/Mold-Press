"""Validate the modular app or copy its runtime files into dist/site/."""
import argparse
from pathlib import Path
import shutil
from assets import ROOT, runtime_files, fingerprint

def build(check=False):
    files=runtime_files()
    if not check:
        target=(ROOT/'dist/site').resolve()
        if not target.is_relative_to((ROOT/'dist').resolve()):
            raise ValueError('Build output must remain under dist/.')
        if target.exists():shutil.rmtree(target)
        target.mkdir(parents=True)
        for source in [*files,ROOT/'LICENSE',ROOT/'THIRD_PARTY_NOTICES.md']:
            destination=target/source.relative_to(ROOT)
            destination.parent.mkdir(parents=True,exist_ok=True)
            shutil.copyfile(source,destination)
        (target/'.nojekyll').touch()
    print(f"{'Validated' if check else 'Built dist/site/:'} {len(files)} runtime files; SHA-256 {fingerprint()}")
    return files

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true',help='Validate external files without writing a build.')
    build(parser.parse_args().check)
