"""Rebuild the approved public DEMO. Never reads credentials or modifies the live site."""
from pathlib import Path
import base64, hashlib, json, os, subprocess, sys, urllib.request
import brotli
from PIL import features
ROOT = Path(__file__).resolve().parent
EXPECTED = [
'a5f69c36d657304895073f7290bd4af49bea32f4467994b114f7a1062e8925fa',
'29a49662e974043e21b0dbc47a30a2a4dc399dd74c8ec08b6a5f15c9bbcab39a',
'518d0138128fe03831f78609e7081a8bb99a8836e6c796174d2738c56ee0d97a',
'874589385c3e45c4d2d7061abbd0067e221b342e80d24ea17cf3091a5f6c2b3f',
'e6d047863d085092259c7b6e82372a5fbd61631d4affd60c0ea71c3dfd1b0c47',
'5d0f0f693598e3eef080fb2059098867eacdcbe645300f5c02302a46c5241119',
'a7a9f578cd428309fefb63cbc6b51e06675be6ae9b66f312d250e8dcae2d6401',
'9e25ecf75c78889c51da3c638b3140f868f4e8d3c7068961f376968a122526b7',
'265f7779e5e19576c685edec9935b7e989c791a9c0cd694fb529a37a3a51256c']
ARCHIVE_SHA = 'cf53aeebff4cab493fc74d0c761c1f10a3d1c3b90a2135ea58b7daf6f782d10d'
MATERIAL_SHA = '8e71fc740eee8e516346039691a12be1988b825b55cb5fbb274196b8cf2524a2'
LOGO_SHA = 'e188ff178829e294e72b266a5ab1ac68bb8e93d413e90b3db5f438eeed2e4fca'
WEB_SHA = '5b242984dc0cfc8180d964a4cece6ee0fdbdb302d6463325888a0b867ad0ab44'
def sha(b): return hashlib.sha256(b).hexdigest()
def checked_part(i, expected):
    p = ROOT/'source'/f'part-{i}.b64'
    b = p.read_bytes().strip()
    size = 14000 if i < 9 else 388
    if sha(b) != expected and len(b) == size + 1:
        # Repair a single duplicated transport character only when its exact
        # result matches the pre-recorded SHA-256 of the approved source.
        for n in range(len(b)):
            candidate = b[:n] + b[n+1:]
            if sha(candidate) == expected:
                b = candidate
                p.write_bytes(b)
                print(f'Normalized one transport character in part {i}')
                break
    if len(b) != size or sha(b) != expected:
        raise RuntimeError(f'Part {i} checksum mismatch: {len(b)} bytes, {sha(b)}')
    return b
class PublicOnly(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not newurl.startswith('https://marketmarney.com/'):
            raise RuntimeError('Unexpected public-site redirect')
        return super().redirect_request(req, fp, code, msg, headers, newurl)
def get(path):
    req = urllib.request.Request('https://marketmarney.com'+path,
        headers={'User-Agent':'MarketMarney-WarXAU-Release/7.6','Accept-Encoding':'identity'})
    with urllib.request.build_opener(PublicOnly()).open(req, timeout=30) as r:
        b = r.read(6*1024*1024+1)
        if len(b) > 6*1024*1024 or r.status != 200:
            raise RuntimeError('Public response failed: '+path)
        return b, {'path':path,'status':r.status,'bytes':len(b),'sha256':sha(b),
            'contentType':r.headers.get('Content-Type',''),
            'csp':r.headers.get('Content-Security-Policy',''),
            'cacheControl':r.headers.get('Cache-Control','')}
def main():
    encoded = b''.join(checked_part(i+1,h) for i,h in enumerate(EXPECTED))
    blob = base64.b64decode(encoded, validate=True)
    if len(blob) != 84291 or sha(blob) != ARCHIVE_SHA:
        raise RuntimeError('Archive checksum mismatch')
    payload = json.loads(brotli.decompress(blob))
    if set(payload) != {'template.html','tools/bake-materials.py'}:
        raise RuntimeError('Unexpected archive contents')
    build = ROOT/'build'
    (build/'tools').mkdir(parents=True,exist_ok=True)
    (build/'public/xau-war').mkdir(parents=True,exist_ok=True)
    (build/'tools/bake-materials.py').write_text(payload['tools/bake-materials.py'],encoding='utf-8')
    if features.version('webp') != '1.6.0':
        raise RuntimeError('Unexpected libwebp version: '+str(features.version('webp')))
    subprocess.run([sys.executable,str(build/'tools/bake-materials.py')],check=True)
    mat = (build/'public/xau-war/materials.js').read_bytes()
    if sha(mat) != MATERIAL_SHA:
        raise RuntimeError('Generated material checksum mismatch: '+sha(mat))
    logo, info = get('/assets/brand-logo.webp')
    if sha(logo) != LOGO_SHA:
        raise RuntimeError('Brand logo changed; no deployment performed')
    template = payload['template.html']
    if template.count('__MATERIAL_JS_EXACT__') != 1 or template.count('__MARKETMARNEY_LOGO_DATA__') != 2:
        raise RuntimeError('Template placeholders mismatch')
    page = template.replace('__MATERIAL_JS_EXACT__',mat.decode('utf-8').replace('</script','<\\/script'))
    page = page.replace('__MARKETMARNEY_LOGO_DATA__','data:image/webp;base64,'+base64.b64encode(logo).decode('ascii'))
    raw = page.encode('utf-8')
    if sha(raw) != WEB_SHA:
        raise RuntimeError('Final approved HTML checksum mismatch: '+sha(raw))
    if 'window.MM_DEMO_ONLY=true' not in page or 'window.MM_OFFLINE_PREVIEW=true' in page:
        raise RuntimeError('Incorrect distribution mode')
    dist = ROOT/'dist'; dist.mkdir(exist_ok=True)
    (dist/'WEB-DEMO.html').write_bytes(raw)
    checks = [info]
    for path in ['/','/assets/xau-war-3d.html','/akun.html','/api/auth/android/config','/api/content','/_railway/health']:
        body, result = get(path)
        if path == '/':
            result['menuCount'] = body.count(b'id="mm-xau-war-link"')
            result['navCount'] = body.count(b'<div id="nav"></div>')
            if result['menuCount'] != 1:
                raise RuntimeError('Homepage WarXAU menu has changed')
        checks.append(result)
    report = {'mode':'DEMO','version':'7.6','outputSha256':WEB_SHA,'outputBytes':len(raw),
        'sourceCommit':os.environ.get('GITHUB_SHA'), 'existingPublicSite':checks,
        'note':'Read-only pre-deployment inspection. No live files, credentials or data altered.'}
    (dist/'deployment-inspection.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'ok':True,'sha256':WEB_SHA,'bytes':len(raw),'checks':len(checks)}))
if __name__ == '__main__': main()
