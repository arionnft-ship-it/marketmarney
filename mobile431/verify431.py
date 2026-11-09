#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android431')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified431.json').read_text(encoding='utf-8'))

for rel,expected in manifest['preserved'].items():
    assert hashlib.sha256((root/rel).read_bytes()).hexdigest()==expected,rel
for entry in manifest['changed']:
    assert hashlib.sha256((root/entry['path']).read_bytes()).hexdigest()==entry['afterSha256'],entry['path']

apk=deliver/'Marney431.apk'
apk_sha=hashlib.sha256(apk.read_bytes()).hexdigest()
(deliver/'Marney431-SHA256.txt').write_text(apk_sha+'  Marney431.apk\n',encoding='utf-8')

assets=root/'app/src/main/assets'
expected_assets={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={e.filename for e in archive.infolist() if e.filename.startswith('assets/') and not e.is_dir()}
    assert actual==set(expected_assets),'APK asset inventory differs from prepared source'
    for name,path in expected_assets.items():
        assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.31 AppShell' in dex
    assert b'MM431_LAUNCH' in dex

with ZipFile(testapk/'Marney431-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'OpeningSoft426Test' in dex
    assert b'simpleLightOpeningIsQuietAndReturnsToTheApp' in dex

startup=(root/'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java').read_text(encoding='utf-8')
checks=[
    'SAFETY_LIMIT_MS=1100L' in startup,
    'setBackgroundColor(OPENING_BG)' in startup,
    'text("MARNEY",28,INK,true)' in startup,
    'text("Kenali pasarnya.",13,MUTED,false)' in startup,
    'Logo MARNEY' in startup,
    'CinematicBackdrop' not in startup,
    'LogoAura' not in startup,
    'LEWATI' not in startup,
    'FINANCIAL INTELLIGENCE' not in startup,
    'MARKET  •  NEWS  •  ANALYSIS' not in startup,
    'MENYIAPKAN APLIKASI' not in startup,
]
assert all(checks),checks

Path('quality431').mkdir(exist_ok=True)
Path('quality431/static-report.json').write_text(json.dumps({
    'success':True,
    'apkSha256':apk_sha,
    'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected_assets),
    'simpleOpeningChecks':len(checks),
},indent=2)+'\n',encoding='utf-8')
print('APK SHA-256:',apk_sha)
print('Verified APK assets:',len(expected_assets))
print('Verified simple-opening checks:',len(checks))
