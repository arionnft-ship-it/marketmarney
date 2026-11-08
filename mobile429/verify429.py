#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib, json, sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android429')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified429.json').read_text())
for rel,digest in manifest['preserved'].items():
    assert hashlib.sha256((root/rel).read_bytes()).hexdigest()==digest,rel
for entry in manifest['changed']:
    assert hashlib.sha256((root/entry['path']).read_bytes()).hexdigest()==entry['afterSha256'],entry['path']
apk=deliver/'Marney429.apk'
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(deliver/'Marney429-SHA256.txt').write_text(digest+'  Marney429.apk\n')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={e.filename for e in archive.infolist() if e.filename.startswith('assets/') and not e.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items(): assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.29 AppShell' in dex
    assert b'MM429_LAUNCH' in dex
    assert b'social429.css' in dex and b'social429.js' in dex
with ZipFile(testapk/'Marney429-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Social429FullscreenTest' in dex
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
css=(assets/'social429.css').read_text();js=(assets/'social429.js').read_text()
checks=[
    '"/beranda-trader.html#mm44-feed"' in main,
    'if(tab==SOCIAL){bottom.setVisibility(View.GONE);return;}' in main,
    'i.isVisible(WindowInsets.Type.ime())||tab==SOCIAL' in main,
    'asset("social429.css")' in main and 'asset("social429.js")' in main,
    '--mm429-dock-h:68px' in css,
    'data-mm47-group' in css,
    'Media Marney' in js,
    'profileDock' in js,
]
assert all(checks),checks
Path('quality429').mkdir(exist_ok=True)
Path('quality429/static-report.json').write_text(json.dumps({
    'success':True,'apkSha256':digest,'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),'assetCount':len(expected),
    'socialChecks':len(checks)
},indent=2)+'\n')
print('APK SHA-256:',digest)
print('Verified APK assets:',len(expected))
print('Verified Social full-screen checks:',len(checks))
