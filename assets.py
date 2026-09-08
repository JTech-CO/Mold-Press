"""Discover the runtime files from index.html and fingerprint the complete app."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib

ROOT = Path(__file__).resolve().parent

class EntryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'style' or tag == 'script' and not attrs.get('src'):
            raise ValueError('Keep application JavaScript and CSS in external files.')
        if tag == 'script':
            if 'defer' not in attrs:
                raise ValueError('Application scripts must preserve deferred document order.')
            self.assets.append(attrs['src'])
        elif tag == 'link' and attrs.get('rel') == 'stylesheet':
            self.assets.append(attrs['href'])

def runtime_files():
    parser = EntryParser()
    parser.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
    if len(parser.assets) != len(set(parser.assets)):
        raise ValueError('Duplicate runtime asset in index.html.')
    files = [ROOT / 'index.html']
    for name in parser.assets:
        p = (ROOT / name).resolve()
        if not p.is_relative_to(ROOT) or not name.startswith(('js/', 'css/')) or not p.is_file():
            raise ValueError(f'Missing or invalid runtime asset: {name}')
        files.append(p)
    discovered = {p.resolve() for folder in ['js', 'css'] for p in (ROOT/folder).rglob('*') if p.suffix in ['.js', '.css']}
    if discovered != set(files[1:]):
        raise ValueError(f'Unreferenced JS/CSS files: {discovered - set(files[1:])}')
    return files

def fingerprint():
    digest = hashlib.sha256()
    for p in sorted(runtime_files()):
        data = p.read_bytes()
        digest.update(p.relative_to(ROOT).as_posix().encode('utf-8') + b'\0')
        digest.update(len(data).to_bytes(8, 'big'))
        digest.update(data)
    return digest.hexdigest()
