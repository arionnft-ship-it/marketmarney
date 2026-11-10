#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android437')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified437.json').read_text(encoding='utf-8'))

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney437.apk'
apk_digest=sha(apk)
(deliver/'Marney437-SHA256.txt').write_text(apk_digest+'  Marney437.apk\n',encoding='utf-8')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items():
        assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.37 AppShell' in dex
    assert b'MM437_LAUNCH' in dex
    assert b'smooth437.css' in dex or 'assets/smooth437.css' in actual
with ZipFile(testapk/'Marney437-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Performance437Test' in dex
    assert b'reelRecoveryIsBoundedAndPositionAware' in dex

controllers=[
    (assets/'reels46.js').read_text(encoding='utf-8'),
    (assets/'social411/app.js').read_text(encoding='utf-8'),
    (assets/'social411/bundle427.js').read_text(encoding='utf-8'),
]
css=(assets/'smooth437.css').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
build=(root/'app/build.gradle').read_text(encoding='utf-8')
strings=(root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8')
oncreate=main[main.index('@Override public void onCreate'):main.index('private void drawTabs')]
checks=[
    "applicationId 'com.marketmarney.mobile.beta437'" in build,
    'versionCode 41' in build,
    "versionName '4.37.0-beta'" in build,
    'MarketMarney 4.37 Smooth' in strings,
    all('function recoverStall(st)' in script for script in controllers),
    all('function scheduleStall(st)' in script for script in controllers),
    all('st.recoveryCount>=2' in script for script in controllers),
    all('now-st.lastRecoveryAt<18000' in script for script in controllers),
    all('data-mm437-recovering' in script for script in controllers),
    all('lastProgressTime' in script for script in controllers),
    'data-mm437-recovering' in css,
    'data-mm437-slow' in css,
    'prefers-reduced-motion' in css,
    'ensureSocialAssets' in main,
    'preloadSocialAssets' in main,
    'socialAssetExecutor' in main,
    'frame.postDelayed(this::preloadSocialAssets,650)' in main,
    'socialCss=asset("social44.css")' not in oncreate,
    'CookieManager.getInstance().flush()' in main,
    'runtimeDispatchTask' in main,
    'lastRuntimeSignature' in main,
    'frame.postDelayed(runtimeDispatchTask,90)' in main,
    'Recovery414.sameDocument(document,target.getUrl())' in main,
    'asset("smooth437.css")' in main,
]
assert all(checks),checks
quality=Path('quality437');quality.mkdir(exist_ok=True)
(quality/'static-report.json').write_text(json.dumps({
    'success':True,'apkSha256':apk_digest,
    'changedFiles':len(manifest['changed']),'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),'performanceChecks':len(checks),
    'controllerSha256':[hashlib.sha256(script.encode()).hexdigest() for script in controllers],
    'smoothCssSha256':sha(assets/'smooth437.css'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',apk_digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney 4.37 checks:',len(checks))
