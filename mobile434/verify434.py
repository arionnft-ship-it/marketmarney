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

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney434.apk'
apk_digest=sha(apk)
(deliver/'Marney434-SHA256.txt').write_text(apk_digest+'  Marney434.apk\n',encoding='utf-8')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items():
        assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.34 AppShell' in dex
    assert b'MM434_LAUNCH' in dex
    assert b'performance434.css' in dex or 'assets/performance434.css' in actual
with ZipFile(testapk/'Marney434-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Reels434PerformanceTest' in dex
    assert b'reelsUsesBoundedAdaptivePreloading' in dex

controller=(assets/'social411/bundle427.js').read_text(encoding='utf-8')
standalone=(assets/'reels46.js').read_text(encoding='utf-8')
recovery=(assets/'reels433.js').read_text(encoding='utf-8')
perf=(assets/'performance434.css').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
build=(root/'app/build.gradle').read_text(encoding='utf-8')
strings=(root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8')
checks=[
    "applicationId 'com.marketmarney.mobile.beta434'" in build,
    "versionName '4.34.0-beta'" in build,
    'MarketMarney 4.34 Performance' in strings,
    "keepAhead=fastNetwork&&memoryGb>=4?2:1" in controller,
    "attach(st,'auto','high')" in controller,
    'scheduleRelease(st,releaseDelay)' in controller,
    "setAttribute('fetchpriority',priority||'low')" in controller,
    'intersectionRatio>.55' in controller,
    "if(n===i)attach(st,conservative?'none':'metadata')" not in controller,
    "keepAhead=fastNetwork&&memoryGb>=4?2:1" in standalone,
    '},5000);' in recovery,
    "document.getElementById('shReelFeed')||document.body" in recovery,
    'bodyObserver.observe(document.body' not in recovery,
    'content-visibility:auto' in perf,
    'contain-intrinsic-size:680px' in perf,
    's.setDatabaseEnabled(true)' in main,
    'web.setVerticalScrollBarEnabled(false)' in main,
    'web.setHorizontalScrollBarEnabled(false)' in main,
]
assert all(checks),checks
quality=Path('quality434')
quality.mkdir(exist_ok=True)
(quality/'static-report.json').write_text(json.dumps({
    'success':True,
    'apkSha256':apk_digest,
    'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),
    'performanceChecks':len(checks),
    'controllerSha256':sha(assets/'social411/bundle427.js'),
    'performanceCssSha256':sha(assets/'performance434.css'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',apk_digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney performance checks:',len(checks))
