#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile
from PIL import Image
import hashlib
import json
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else 'android432')
deliver=Path(sys.argv[2] if len(sys.argv)>2 else 'deliver')
testapk=Path(sys.argv[3] if len(sys.argv)>3 else 'testapk')
manifest=json.loads(Path('verified432.json').read_text())

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
for rel,digest in manifest['preserved'].items():
    assert sha(root/rel)==digest,rel
for entry in manifest['changed']:
    assert sha(root/entry['path'])==entry['afterSha256'],entry['path']

apk=deliver/'Marney432.apk'
digest=sha(apk)
(deliver/'Marney432-SHA256.txt').write_text(digest+'  Marney432.apk\n')
assets=root/'app/src/main/assets'
expected={'assets/'+p.relative_to(assets).as_posix():p for p in assets.rglob('*') if p.is_file()}
with ZipFile(apk) as archive:
    actual={e.filename for e in archive.infolist() if e.filename.startswith('assets/') and not e.is_dir()}
    assert actual==set(expected),'APK asset inventory differs from prepared source'
    for name,path in expected.items(): assert archive.read(name)==path.read_bytes(),path
    dex=b''.join(archive.read(name) for name in archive.namelist() if name.endswith('.dex'))
    assert b'MarketMarneyAndroid/4.32 AppShell' in dex
    assert b'MM432_LAUNCH' in dex
    assert any(name.endswith('/mm_brand_wordmark.png') for name in archive.namelist())
    assert any(name.endswith('/mm_brand_logo.png') for name in archive.namelist())
with ZipFile(testapk/'Marney432-Tests.apk') as tests:
    dex=b''.join(tests.read(name) for name in tests.namelist() if name.endswith('.dex'))
    assert b'Branding432Test' in dex
    assert b'marketMarneyWordmarkOpeningIsQuietAndReturnsToTheApp' in dex

native=Image.open(root/'app/src/main/res/drawable-nodpi/mm_brand_logo.png').convert('RGBA')
web=Image.open(root/'app/src/main/assets/brand417/logo.png').convert('RGBA')
word=Image.open(root/'app/src/main/res/drawable-nodpi/mm_brand_wordmark.png').convert('RGBA')
legacy=Image.open(root/'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png').convert('RGBA')
assert native.size==(512,512)
assert web.size==(384,384)
assert word.size==(1024,269)
assert legacy.size==(192,192)
assert native.getpixel((0,0))[3]==0 and web.getpixel((0,0))[3]==0
assert word.getpixel((0,0))[3]==0
assert legacy.getpixel((8,8))[3]>0

def palette_ok(image):
    black=orange=transparent=0
    for r,g,b,a in image.getdata():
        if a<16: transparent+=1
        elif r<70 and g<70 and b<70: black+=1
        elif r>210 and 55<g<185 and b<85: orange+=1
    return black>5000 and orange>3000 and transparent>5000
assert palette_ok(native)
assert palette_ok(web)
assert palette_ok(word)

main=(root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').read_text()
startup=(root/'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java').read_text()
manifest_text=(root/'app/src/main/AndroidManifest.xml').read_text()
brand_js=(assets/'branding417.js').read_text()
checks=[
    'com.marketmarney.mobile.beta432' in (root/'app/build.gradle').read_text(),
    'MarketMarney 4.32' in (root/'app/src/main/res/values/strings.xml').read_text(),
    'MarketMarneyAndroid/4.32 AppShell' in main,
    'brand.setContentDescription("MarketMarney")' in main,
    'R.drawable.mm_brand_wordmark' in startup,
    'Logo MarketMarney' in startup,
    '@mipmap/ic_launcher' in manifest_text,
    "logo.alt = 'MarketMarney';" in brand_js,
    '@drawable/mm_brand_wordmark' in (root/'app/src/main/res/drawable/mm_opening_monogram.xml').read_text(),
    '@android:color/white' in (root/'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml').read_text(),
]
assert all(checks),checks

Path('quality432').mkdir(exist_ok=True)
Path('quality432/static-report.json').write_text(json.dumps({
    'success':True,
    'apkSha256':digest,
    'changedFiles':len(manifest['changed']),
    'preservedFiles':len(manifest['preserved']),
    'assetCount':len(expected),
    'brandingChecks':len(checks),
    'nativeLogoSha256':sha(root/'app/src/main/res/drawable-nodpi/mm_brand_logo.png'),
    'wordmarkSha256':sha(root/'app/src/main/res/drawable-nodpi/mm_brand_wordmark.png'),
    'bundledWebLogoSha256':sha(root/'app/src/main/assets/brand417/logo.png'),
},indent=2)+'\n')
print('APK SHA-256:',digest)
print('Verified APK assets:',len(expected))
print('Verified MarketMarney branding checks:',len(checks))
