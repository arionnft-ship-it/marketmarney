#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib,json,sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android430')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified430.json').read_text())
for rel,digest in manifest['preserved'].items():
    assert hashlib.sha256((root/rel).read_bytes()).hexdigest()==digest,rel
for entry in manifest['changed']:
    assert hashlib.sha256((root/entry['path']).read_bytes()).hexdigest()==entry['afterSha256'],entry['path']
apk=deliver/'Marney430.apk';digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(deliver/'Marney430-SHA256.txt').write_text(digest+'  Marney430.apk\n')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={e.filename for e in archive.infolist() if e.filename.startswith('assets/') and not e.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items():assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.30 AppShell' in dex
    assert b'MM430_LAUNCH' in dex
    assert b'home430.css' in dex and b'home430.js' in dex
    assert b'mm-app-home' in dex
with ZipFile(testapk/'Marney430-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Social430HomeButtonTest' in dex
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
js=(assets/'home430.js').read_text();css=(assets/'home430.css').read_text()
checks=[
    '"mm-app-home".equals(h)' in main,
    'navigate(HOME);return true;' in main,
    'asset("home430.css")' in main and 'asset("home430.js")' in main,
    'Kembali ke Beranda' in js,
    '/index.html#mm-app-home' in js,
    'cloneNode(false)' in js,
    'mm430-home-button' in css,
    'mm430-home-label' in css,
]
assert all(checks),checks
Path('quality430').mkdir(exist_ok=True)
Path('quality430/static-report.json').write_text(json.dumps({'success':True,'apkSha256':digest,'changedFiles':len(manifest['changed']),'preservedFiles':len(manifest['preserved']),'assetCount':len(expected),'homeButtonChecks':len(checks)},indent=2)+'\n')
print('APK SHA-256:',digest)
print('Verified APK assets:',len(expected))
print('Verified Social home-button checks:',len(checks))
