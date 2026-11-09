#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android433')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified433.json').read_text())

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney433.apk';digest=sha(apk)
(deliver/'Marney433-SHA256.txt').write_text(digest+'  Marney433.apk\n')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={e.filename for e in archive.infolist() if e.filename.startswith('assets/') and not e.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items(): assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.33 AppShell' in dex
    assert b'reels433.css' in dex and b'reels433.js' in dex
    assert any(name.endswith('/mm_brand_logo.png') for name in archive.namelist())
    assert any(name.endswith('/mm_brand_wordmark.png') for name in archive.namelist())
with ZipFile(testapk/'Marney433-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Reels433LayoutTest' in dex
    assert b'reelsUsesOneCompactHeaderAndFlatDock' in dex

css=(assets/'reels433.css').read_text()
script=(assets/'reels433.js').read_text()
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
checks=[
    'com.marketmarney.mobile.beta433' in (root/'app/build.gradle').read_text(),
    'MarketMarney 4.33 Reels' in (root/'app/src/main/res/values/strings.xml').read_text(),
    'asset("reels433.css")' in main and 'asset("reels433.js")' in main,
    'data-mm433-reels="clean"' in css,
    '.mm44-social-header' in css and 'display:none!important' in css,
    '--mm433-dock-h:62px' in css,
    'mm433-spin' in css,
    "H.dataset.mm433Reels='clean'" in script,
    "attributeFilter:['data-mm44-view','data-mm46-reels']" in script,
    'clearLoading' in script,
]
assert all(checks),checks
Path('quality433').mkdir(exist_ok=True)
Path('quality433/static-report.json').write_text(json.dumps({
    'success':True,'apkSha256':digest,'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),'assetCount':len(expected),
    'reelsChecks':len(checks)
},indent=2)+'\n')
print('APK SHA-256:',digest)
print('Verified APK assets:',len(expected))
print('Verified Reels cleanup checks:',len(checks))
