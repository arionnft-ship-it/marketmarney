from pathlib import Path
import sys,re,shutil
root=Path(__file__).resolve().parent
if '--ui' in sys.argv:
    p=root/'test_ui.py'
    s=p.read_text()
    s=s.replace('<head><meta name="viewport"','<head><meta charset="utf-8"><meta name="viewport"')
    needle="        page.screenshot(path=str(OUT/f'social-{width}.png'),full_page=False)"
    s=s.replace(needle,"        page.evaluate('window.scrollTo(0,0)')\n        page.screenshot(path=str(OUT/f'social-{width}.png'),full_page=False)")
    p.write_text(s)
    print('Prepared UTF-8, top-of-feed fixture screenshots')
    sys.exit(0)

src=Path('android-v4');out=Path('android43')
if out.exists():raise RuntimeError('Refusing to overwrite generated source')
shutil.copytree(src,out)
main=(root/'MainActivity.java').read_text()
main=main.replace('import android.app.Activity;','import androidx.activity.ComponentActivity;\nimport androidx.activity.OnBackPressedCallback;')
assert 'extends Activity {' in main
main=main.replace('extends Activity {','extends ComponentActivity {')
needle='        super.onCreate(state);'
assert main.count(needle)==1
main=main.replace(needle,'''        super.onCreate(state);
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
            @Override public void handleOnBackPressed(){
                if(!handleAppBack()){
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });''')
needle='    @Override public void onBackPressed(){if(fullVideo!=null){closeFullVideo();return;}if(web!=null&&web.canGoBack()){web.goBack();return;}if(tab!=HOME){navigate(HOME);return;}super.onBackPressed();}'
assert main.count(needle)==1
main=main.replace(needle,'    private boolean handleAppBack(){if(fullVideo!=null){closeFullVideo();return true;}if(web!=null&&web.canGoBack()){web.goBack();return true;}if(tab!=HOME){navigate(HOME);return true;}return false;}')
(out/'app/src/main/java/com/marketmarney/mobile/MainActivity.java').write_text(main)
assets=out/'app/src/main/assets';assets.mkdir(exist_ok=True,parents=True)
for p in (root/'assets').iterdir():shutil.copy2(p,assets/p.name)
p=out/'app/build.gradle';s=p.read_text()
assert "applicationId 'com.marketmarney.mobile'" in s
s=s.replace("applicationId 'com.marketmarney.mobile'", "applicationId 'com.marketmarney.mobile.beta43'")
s=re.sub(r'versionCode \d+', 'versionCode 7', s)
s=re.sub(r"versionName '[^']+'", "versionName '4.3.0-beta'", s)
s+='\ndependencies { implementation "androidx.activity:activity:1.11.0" }\n'
p.write_text(s)
p=out/'app/src/main/res/values/strings.xml';p.write_text(p.read_text().replace('>MarketMarney<','>MarketMarney 4.3 Beta<'))
assert 'labels={"Beranda","Berita","Market Live","Social Marney"}' in main
assert 'i<4' in main
assert 'addJavascriptInterface' not in main
assert 'handler.cancel()' in main
assert 'MIXED_CONTENT_NEVER_ALLOW' in main
assert '@Override public void onBackPressed()' not in main
assert 'getOnBackPressedDispatcher().addCallback' in main
print('PASS: four destinations, strict origin, SSL fail-closed, no JS bridge, AndroidX back callback')
