#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib,json,sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'android427')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified427.json').read_text())
for rel,digest in manifest['preserved'].items():
    assert hashlib.sha256((root/rel).read_bytes()).hexdigest()==digest,rel
for entry in manifest['changed']:
    assert hashlib.sha256((root/entry['path']).read_bytes()).hexdigest()==entry['afterSha256'],entry['path']
apk=deliver/'Marney427.apk'
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
(deliver/'Marney427-SHA256.txt').write_text(digest+'  Marney427.apk\n')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={e.filename for e in archive.infolist() if e.filename.startswith('assets/') and not e.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items(): assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.27 AppShell' in dex and b'MM427_LAUNCH' in dex
with ZipFile(testapk/'Marney427-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Performance427Test' in dex
main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
startup=(root/'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java').read_text()
light=(assets/'light425.js').read_text()
resources=(root/'app/src/main/java/com/marketmarney/mobile/AppResources49.java').read_text()
checks=[
    'lastAdaptedDocument' in main,
    'lastRendererRecovery' in main,
    'lowRamDevice||tab==XAUWAR||reelsChrome' in main,
    'setCacheMode(WebSettings.LOAD_DEFAULT)' in main,
    'onPageCommitVisible(WebView v,String url){adapt' not in main,
    "return 'retry'" in main,
    'window.__mm411BundledReady' in main,
    'SAFETY_LIMIT_MS=1800' in startup,
    'backdrop.animate()' not in startup,
    light.count('new MutationObserver')==1,
    'bodyObserver' not in light and 'appObserver' not in light and 'subtree: true' not in light,
    'public, max-age=31536000, immutable' in resources,
]
assert all(checks),checks
for page,prefix in [
    ('social411/page.html','/__android411/social/bundle427'),
    ('group48/page.html','/__android48/group/bundle427'),
    ('profile49/page.html','/__android49/profile/bundle427')]:
    html=(assets/page).read_text();folder=page.split('/')[0]
    assert html.count(prefix+'.css')==1 and html.count(prefix+'.js')==1,page
    assert (assets/folder/'bundle427.css').stat().st_size>10000
    assert (assets/folder/'bundle427.js').stat().st_size>10000
Path('quality427').mkdir(exist_ok=True)
Path('quality427/static-report.json').write_text(json.dumps({
    'success':True,'apkSha256':digest,'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),'assetCount':len(expected),
    'mutationObservers':light.count('new MutationObserver')
},indent=2)+'\n')
print('APK SHA-256:',digest)
print('Verified APK assets:',len(expected))
