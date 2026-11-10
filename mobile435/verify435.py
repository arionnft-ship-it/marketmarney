#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android435')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified435.json').read_text(encoding='utf-8'))

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

for relative,digest in manifest['preserved'].items():
    assert sha(root/relative)==digest,relative
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney435.apk'
apk_digest=sha(apk)
(deliver/'Marney435-SHA256.txt').write_text(apk_digest+'  Marney435.apk\n',encoding='utf-8')

assets=root/'app/src/main/assets'
expected={'assets/'+path.relative_to(assets).as_posix():path for path in assets.rglob('*') if path.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items():
        assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.35 AppShell' in dex
    assert b'MM435_LAUNCH' in dex
    assert b'mm45:memory-pressure' in dex

with ZipFile(testapk/'Marney435-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Stability435Test' in dex
    assert b'networkRecoveryIsBoundedAndLifecycleAware' in dex
    assert b'reelsReleaseOffscreenBuffersOnMemoryPressure' in dex

controller=(assets/'social411/bundle427.js').read_text(encoding='utf-8')
standalone=(assets/'reels46.js').read_text(encoding='utf-8')
app_controller=(assets/'social411/app.js').read_text(encoding='utf-8')
recovery=(assets/'reels433.js').read_text(encoding='utf-8')
perf=(assets/'performance434.css').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
build=(root/'app/build.gradle').read_text(encoding='utf-8')
strings=(root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8')

recoverable=main[main.index('private boolean recoverableFailure'):main.index('private boolean validatedNetwork')]
checks=[
    "applicationId 'com.marketmarney.mobile.beta435'" in build,
    'versionCode 39' in build,
    "versionName '4.35.0-beta'" in build,
    'MarketMarney 4.35 Stability' in strings,
    'MarketMarneyAndroid/4.35 AppShell' in main,
    "version:'4.35'" in main,
    "dataset.mmAndroid='435'" in main,
    'registerDefaultNetworkCallback(networkCallback)' in main,
    'NET_CAPABILITY_VALIDATED' in main,
    'recoverPage(true)' in main,
    'automatic?2500L:900L' in main,
    'ticket!=recoverySequence' in main,
    'activityResumed=false;cancelNetworkRetry()' in main,
    'activityResumed=true;if(web!=null)resumePage(web);scheduleNetworkRetry()' in main,
    'stopNetworkWatch()' in main,
    'releaseMediaForMemory(level)' in main,
    '@Override public void onLowMemory()' in main,
    'recoverableFailure(failureCode)' in main,
    '"TLS".equals(code)' not in recoverable,
    "keepAhead=fastNetwork&&memoryGb>=4?2:1" in controller,
    "attach(st,'auto','high')" in controller,
    'scheduleRelease(st,releaseDelay)' in controller,
    'intersectionRatio>.55' in controller,
    'content-visibility:auto' in perf,
    'contain-intrinsic-size:680px' in perf,
    '},5000);' in recovery,
    "document.getElementById('shReelFeed')||document.body" in recovery,
]
for script in (standalone,controller,app_controller):
    checks.extend([
        'function memoryPressure(event)' in script,
        "addEventListener('mm45:memory-pressure',memoryPressure)" in script,
        "removeEventListener('mm45:memory-pressure',memoryPressure)" in script,
        "c===active&&level<40" in script,
    ])
assert all(checks),checks
quality=Path('quality435')
quality.mkdir(exist_ok=True)
(quality/'static-report.json').write_text(json.dumps({
    'success':True,
    'apkSha256':apk_digest,
    'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),
    'stabilityChecks':len(checks),
    'controllerSha256':sha(assets/'social411/bundle427.js'),
    'mainActivitySha256':sha(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',apk_digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney stability checks:',len(checks))
