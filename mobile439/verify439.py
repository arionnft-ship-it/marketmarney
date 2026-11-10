#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android439')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified439.json').read_text(encoding='utf-8'))

def sha(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney439.apk'
apk_digest=sha(apk)
(deliver/'Marney439-SHA256.txt').write_text(apk_digest+'  Marney439.apk\n',encoding='utf-8')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={entry.filename for entry in archive.infolist() if entry.filename.startswith('assets/') and not entry.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items():
        assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.39 AppShell' in dex
    assert b'MM439_LAUNCH' in dex
    assert b'MM439_ASSETS' in dex
    assert 'assets/instant439.css' in actual
    assert 'assets/instant439.js' in actual
with ZipFile(testapk/'Marney439-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Performance439Test' in dex
    assert b'reelsProtectsTheActiveBuffer' in dex

controllers=[
    (assets/'reels46.js').read_text(encoding='utf-8'),
    (assets/'social411/app.js').read_text(encoding='utf-8'),
    (assets/'social411/bundle427.js').read_text(encoding='utf-8'),
]
css=(assets/'instant439.css').read_text(encoding='utf-8')
script=(assets/'instant439.js').read_text(encoding='utf-8')
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text(encoding='utf-8')
build=(root/'app/build.gradle').read_text(encoding='utf-8')
strings=(root/'app/src/main/res/values/strings.xml').read_text(encoding='utf-8')
checks=[
    "applicationId 'com.marketmarney.mobile.beta439'" in build,
    'versionCode 43' in build,
    "versionName '4.39.0-beta'" in build,
    'MarketMarney 4.39 Instant' in strings,
    all('bufferStarved' in controller for controller in controllers),
    all('function bufferAhead' in controller for controller in controllers),
    all('function probeBuffer' in controller for controller in controllers),
    all('data-mm439-buffer-starved' in controller for controller in controllers),
    all('constrained||starved' in controller for controller in controllers),
    all("addEventListener('progress'" in controller for controller in controllers),
    all('starved?180:releaseDelay' in controller for controller in controllers),
    all('forward=distance*direction' in controller for controller in controllers),
    all('function recoverStall(st)' in controller for controller in controllers),
    all('location.reload()' not in controller for controller in controllers),
    'touch-action:manipulation' in css,
    'data-mm439-buffer-starved' in css,
    'backdrop-filter' not in css,
    "rel='preconnect'" in script,
    "rel='dns-prefetch'" in script,
    'requestIdleCallback' in script,
    'warmed.size>=3' in script,
    'asset("instant439.css")' in main,
    'asset("instant439.js")' in main,
    'setOffscreenPreRaster(true)' in main,
    'MM439_NAV' in main,
    'MM439_ASSETS' in main,
    'if(tab==SOCIAL)preloadSocialAssets()' in main,
    'if(url.equals(current)&&!mainFailed)' in main,
    'CookieManager.getInstance().flush()' in main,
    'runtimeDispatchTask' in main,
]
assert all(checks),checks
quality=Path('quality439');quality.mkdir(exist_ok=True)
(quality/'static-report.json').write_text(json.dumps({
    'success':True,'apkSha256':apk_digest,
    'changedFiles':len(manifest['changed']),'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),'performanceChecks':len(checks),
    'controllerSha256':[hashlib.sha256(controller.encode()).hexdigest() for controller in controllers],
    'instantCssSha256':sha(assets/'instant439.css'),
    'instantScriptSha256':sha(assets/'instant439.js'),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',apk_digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney 4.39 checks:',len(checks))
