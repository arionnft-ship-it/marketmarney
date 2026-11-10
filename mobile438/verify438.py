#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android438')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified438.json').read_text(encoding='utf-8'))

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney438.apk'
apk_digest=sha(apk)
(deliver/'Marney438-SHA256.txt').write_text(apk_digest+'  Marney438.apk\n',encoding='utf-8')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items():
        assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.38 AppShell' in dex
    assert b'MM438_LAUNCH' in dex
    assert b'MM438_ASSETS' in dex
    assert 'assets/fluid438.css' in actual
with ZipFile(testapk/'Marney438-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Performance438Test' in dex
    assert b'reelsActivationIsDirectionalAndHysteresisControlled' in dex

controllers=[
    (assets/'reels46.js').read_text(encoding='utf-8'),
    (assets/'social411/app.js').read_text(encoding='utf-8'),
    (assets/'social411/bundle427.js').read_text(encoding='utf-8'),
]
css=(assets/'fluid438.css').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
build=(root/'app/build.gradle').read_text(encoding='utf-8')
strings=(root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8')
checks=[
    "applicationId 'com.marketmarney.mobile.beta438'" in build,
    'versionCode 42' in build,
    "versionName '4.38.0-beta'" in build,
    'MarketMarney 4.38 Fluid' in strings,
    all('scrollDirection' in script for script in controllers),
    all('activeRatio>.38' in script for script in controllers),
    all('visible<.72' in script for script in controllers),
    all('function queueActivate' in script for script in controllers),
    all('function settleScroll' in script for script in controllers),
    all('forward=distance*direction' in script for script in controllers),
    all('mm438Scrolling' in script for script in controllers),
    all('onscrollend' in script for script in controllers),
    all('function recoverStall(st)' in script for script in controllers),
    all('location.reload()' not in script for script in controllers),
    'content-visibility:auto' in css,
    'contain-intrinsic-size:auto 620px' in css,
    'scroll-snap-stop:always' in css,
    'backdrop-filter' not in css,
    'asset("fluid438.css")' in main,
    'setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,lowRamDevice)' in main,
    'int retainLimit=lowRamDevice||nativePowerSave?1:2' in main,
    'MM438_NAV' in main,
    'if(url.equals(current)&&!mainFailed)' in main,
    'if(tab==SOCIAL)preloadSocialAssets()' in main,
    'if(social&&!socialAssetsReady){preloadSocialAssets();return;}' in main,
    'if(tab==SOCIAL)ensureSocialAssets()' not in main,
    'MM438_ASSETS' in main,
    'if(socialAssetsReady)frame.post(()->' in main,
    'ensureSocialAssets' in main,
    'CookieManager.getInstance().flush()' in main,
    'runtimeDispatchTask' in main,
]
assert all(checks),checks
quality=Path('quality438');quality.mkdir(exist_ok=True)
(quality/'static-report.json').write_text(json.dumps({
    'success':True,'apkSha256':apk_digest,
    'changedFiles':len(manifest['changed']),'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),'performanceChecks':len(checks),
    'controllerSha256':[hashlib.sha256(script.encode()).hexdigest() for script in controllers],
    'fluidCssSha256':sha(assets/'fluid438.css'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',apk_digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney 4.38 checks:',len(checks))
