#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android436')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified436.json').read_text(encoding='utf-8'))

def sha(path:Path)->str:return hashlib.sha256(path.read_bytes()).hexdigest()

for rel,digest in manifest['preserved'].items():assert sha(root/rel)==digest,rel
for entry in manifest['changed']:assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney436.apk';apk_digest=sha(apk)
(deliver/'Marney436-SHA256.txt').write_text(apk_digest+'  Marney436.apk\n',encoding='utf-8')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items():assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.36 AppShell' in dex
    assert b'MM436_LAUNCH' in dex
    assert b'runtime436.js' in dex or 'assets/runtime436.js' in actual
with ZipFile(testapk/'Marney436-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Performance436Test' in dex
    assert b'nativeRuntimeCallbacksAndVersionAreDeclared' in dex

controller=(assets/'social411/bundle427.js').read_text(encoding='utf-8')
standalone=(assets/'reels46.js').read_text(encoding='utf-8')
runtime=(assets/'runtime436.js').read_text(encoding='utf-8')
perf=(assets/'performance436.css').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
build=(root/'app/build.gradle').read_text(encoding='utf-8')
strings=(root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8')
checks=[
    "applicationId 'com.marketmarney.mobile.beta436'" in build,
    'versionCode 40' in build,
    "versionName '4.36.0-beta'" in build,
    'MarketMarney 4.36 Stable' in strings,
    'networkValidated' in controller,
    'networkMetered' in controller,
    'powerSaving' in controller,
    'downKbps>=1800' in controller,
    "window.addEventListener('mmapp:runtime',runtimeChanged)" in controller,
    "window.addEventListener('mmapp:power',powerChanged)" in controller,
    'constrained=conservative||powerSaving||networkMetered||!networkValidated' in controller,
    'window.__mm436NativeNetwork' in controller,
    'networkValidated' in standalone,
    'window.MMRuntime436' in runtime,
    "window.addEventListener('mmapp:network',runtime)" in runtime,
    'data-mm436-offline' in runtime,
    'requestIdleCallback' in runtime,
    'fetch(' not in runtime,
    'XMLHttpRequest' not in runtime,
    '#mm436-runtime' in perf,
    'data-mm436-power' in perf,
    'data-mm436-stalled' in perf,
    'registerRuntimeSignals' in main,
    'unregisterRuntimeSignals' in main,
    'refreshRuntimeState' in main,
    'registerDefaultNetworkCallback' in main,
    'ACTION_POWER_SAVE_MODE_CHANGED' in main,
    'RECEIVER_NOT_EXPORTED' in main,
    "CustomEvent('mmapp:runtime'" in main,
    'recoverableNetworkFailure' in main,
    'lastAutoRecoverAt<2500' in main,
    'asset("runtime436.js")' in main,
    'asset("performance436.css")' in main,
]
assert all(checks),checks
quality=Path('quality436');quality.mkdir(exist_ok=True)
(quality/'static-report.json').write_text(json.dumps({
    'success':True,'apkSha256':apk_digest,
    'changedFiles':len(manifest['changed']),'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),'runtimeChecks':len(checks),
    'controllerSha256':sha(assets/'social411/bundle427.js'),
    'runtimeSha256':sha(assets/'runtime436.js'),
    'performanceCssSha256':sha(assets/'performance436.css'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',apk_digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney 4.36 checks:',len(checks))
