#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android434')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified434.json').read_text(encoding='utf-8'))

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney434.apk'
digest=sha(apk)
(deliver/'Marney434-SHA256.txt').write_text(digest+'  Marney434.apk\n',encoding='utf-8')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items(): assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.34 AppShell' in dex
    assert b'MM434_LAUNCH' in dex
    assert b'perf434.css' in dex
with ZipFile(testapk/'Marney434-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Optimization434Test' in dex
    assert b'reelsUsesBoundedPredictiveBuffer' in dex
    assert b'optimizedControllerMountsInApp' in dex

reels=(assets/'reels46.js').read_text(encoding='utf-8')
social=(assets/'social411/bundle427.js').read_text(encoding='utf-8')
css=(assets/'perf434.css').read_text(encoding='utf-8')
guard=(assets/'reels433.js').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
checks=[
    'com.marketmarney.mobile.beta434' in (root/'app/build.gradle').read_text(encoding='utf-8'),
    'MarketMarney 4.34 Optimized' in (root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8'),
    'asset("perf434.css")' in main,
    'window.__mm434Reels=true' in reels,
    "n===i+lastDirection" in reels and "n===i-lastDirection" in reels,
    "attach(st,'auto')" in reels,
    'scheduleRelease(20000)' in reels,
    "rootMargin:'20% 0px 20% 0px'" in reels,
    'conservative||reduce.matches||st.userPaused' not in reels,
    'reelsLoadedAt:0' in social and 'Date.now()-connectState.reelsLoadedAt>120000' in social,
    'requestIdleCallback(warm,{timeout:2200})' in social,
    'content-visibility:auto' in css and 'backdrop-filter:none' in css,
    '15000' in guard and "'progress','timeupdate'" in guard,
]
assert all(checks),checks
Path('quality434').mkdir(exist_ok=True)
Path('quality434/static-report.json').write_text(json.dumps({
    'success':True,
    'apkSha256':digest,
    'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),
    'optimizationChecks':len(checks),
    'reelsScriptSha256':sha(assets/'reels46.js'),
    'socialBundleSha256':sha(assets/'social411/bundle427.js'),
    'performanceCssSha256':sha(assets/'perf434.css'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney optimization checks:',len(checks))
