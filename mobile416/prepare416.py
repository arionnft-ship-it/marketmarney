"""Opening-only integration. Uses latest 4.15 APK source, not the old reference app."""
from pathlib import Path
import hashlib,json,re,shutil,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
ref=Path(sys.argv[2]) if len(sys.argv)>2 else Path('opening-reference')
here=Path(__file__).resolve().parent
java=base/'app/src/main/java/com/marketmarney/mobile'
protected={str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (base/'app/src/main/assets').rglob('*') if p.is_file()}
for p in java.glob('*.java'):
 if p.name not in ('MainActivity.java','StartupOverlay.java'):protected[str(p.relative_to(base))]=hashlib.sha256(p.read_bytes()).hexdigest()
protected['app/src/main/AndroidManifest.xml']=hashlib.sha256((base/'app/src/main/AndroidManifest.xml').read_bytes()).hexdigest()
vector=ref/'android-app/app/src/main/res/drawable/mm_monogram.xml'
b=vector.read_bytes();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()=='47f6f28158adb352c6056fc6740946599f03fa1e'
out=base/'app/src/main/res/drawable/mm_opening_monogram.xml';out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(b)
shutil.copy2(here/'StartupOverlay.java',java/'StartupOverlay.java')
p=java/'MainActivity.java';s=p.read_text()
assert 'MarketMarneyAndroid/4.15 AppShell' in s
s=s.replace('MarketMarneyAndroid/4.15 AppShell','MarketMarneyAndroid/4.16 AppShell').replace("version:'4.15'","version:'4.16'").replace("dataset.mmAndroid='415'","dataset.mmAndroid='416'").replace('MarketMarney 4.15.0-beta','MarketMarney 4.16.0-beta')
a='getWindow().setStatusBarColor(Color.rgb(6,20,35));getWindow().setNavigationBarColor(Color.rgb(6,20,35));'
assert s.count(a)==1;s=s.replace(a,'getWindow().setStatusBarColor(Color.rgb(3,10,16));getWindow().setNavigationBarColor(Color.rgb(3,10,16));')
p.write_text(s)
p=base/'app/build.gradle';g=p.read_text();assert "applicationId 'com.marketmarney.mobile.beta415'" in g
p.write_text(g.replace("applicationId 'com.marketmarney.mobile.beta415'","applicationId 'com.marketmarney.mobile.beta416'").replace('versionCode 19','versionCode 20').replace("versionName '4.15.0-beta'","versionName '4.16.0-beta'"))
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.16 Premium Opening',p.read_text()))
tests=base/'app/src/androidTest/java/com/marketmarney/mobile'
# Replace obsolete artwork-specific reflection tests with the reference-opening suite.
old=tests/'StartupOverlayTest.java'
if old.exists():old.unlink()
shutil.copy2(here/'Opening416Test.java',tests/'Opening416Test.java')
p=tests/'Stability414Test.java';p.write_text(p.read_text().replace('4.15.0-beta','4.16.0-beta'))
for n,h in protected.items():assert hashlib.sha256((base/n).read_bytes()).hexdigest()==h,n
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' in s
assert 'GalleryPicker415.create' in s and 'handler.cancel()' in s and 'addJavascriptInterface' not in s
Path('preserved416.json').write_text(json.dumps(protected,indent=2))
print('PASS:',len(protected),'existing assets/helpers/manifest unchanged; exact reference monogram; latest gallery retained')
