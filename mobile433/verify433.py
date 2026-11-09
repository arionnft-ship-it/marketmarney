#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android433')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified433.json').read_text(encoding='utf-8'))

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney433.apk'
digest=sha(apk)
(deliver/'Marney433-SHA256.txt').write_text(digest+'  Marney433.apk\n',encoding='utf-8')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items(): assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.33 AppShell' in dex
    assert b'MM433_LAUNCH' in dex
    assert b'reels433.css' in dex and b'reels433.js' in dex
with ZipFile(testapk/'Marney433-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Reels433LayoutTest' in dex
    assert b'reelsUsesOneCompactHeaderAndLightDock' in dex

css=(assets/'reels433.css').read_text(encoding='utf-8')
script=(assets/'reels433.js').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
checks=[
    'com.marketmarney.mobile.beta433' in (root/'app/build.gradle').read_text(encoding='utf-8'),
    'MarketMarney 4.33 Reels' in (root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8'),
    'asset("reels433.css")' in main and 'asset("reels433.js")' in main,
    '.mm44-social-header' in css and 'display:none!important' in css,
    '#shReelsPanel' in css and 'top:0!important' in css,
    'background:rgba(255,255,255,.98)' in css,
    '--mm46-fit:cover' in css,
    'Kembali ke Media' in script,
    'Unggah Reel' in script,
    "input.setAttribute('accept','video/*')" in script,
    'card.dataset.mm46Error' in script and '8000' in script,
]
assert all(checks),checks
Path('quality433').mkdir(exist_ok=True)
Path('quality433/static-report.json').write_text(json.dumps({
    'success':True,
    'apkSha256':digest,
    'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),
    'reelsChecks':len(checks),
    'reelsCssSha256':sha(assets/'reels433.css'),
    'reelsScriptSha256':sha(assets/'reels433.js'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney Reels checks:',len(checks))
