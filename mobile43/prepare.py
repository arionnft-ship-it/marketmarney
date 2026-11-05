from pathlib import Path
import sys,re,shutil
root=Path(__file__).resolve().parent

# Keep browser fixtures and the Android APK on exactly the same generated assets.
p=root/'assets/news43.html';s=p.read_text()
meta='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'self\'; img-src https: data:; base-uri \'none\'; form-action \'none\'">'
if 'Content-Security-Policy' not in s:s=s.replace('<meta charset="utf-8">','<meta charset="utf-8">'+meta,1)
polyfill="""
// WebView compatibility; only applied to this bundled, trusted news document.
if(!Element.prototype.replaceChildren){Element.prototype.replaceChildren=function(){while(this.firstChild)this.removeChild(this.firstChild);for(var i=0;i<arguments.length;i++)this.appendChild(typeof arguments[i]==='string'?document.createTextNode(arguments[i]):arguments[i]);};}
"""
if 'WebView compatibility;' not in s:s=s.replace("(()=>{'use strict';", "(()=>{'use strict';"+polyfill,1)
compat='''
/* Explicit size and margins for older Android WebViews without flex-gap/aspect-ratio. */
.featured .cover{height:calc((100vw - 38px)*.5625);max-height:428px}.row .cover{width:100px;height:100px}.filters{gap:0}.filters .chip{margin-right:8px}.tools{gap:0}.tools>button+button{margin-left:7px}.search>svg{margin-right:10px}.meta{gap:0}.meta>*{margin-right:7px}@media(min-width:700px){.row .cover{width:150px;height:150px}}
'''
if 'Explicit size and margins' not in s:s=s.replace('</style>',compat+'</style>',1)
p.write_text(s)
p=root/'assets/social43.css';s=p.read_text()
if 'Legacy WebView tab spacing' not in s:s+='''
/* Legacy WebView tab spacing and a font-independent create-story plus sign. */
html[data-mm43-social] .mm43-tabs{gap:0!important}
html[data-mm43-social] .mm43-tabs>button:not(.mm43-tool),html[data-mm43-social] .mm43-tabs>a{margin-right:20px!important}
html[data-mm43-social] .sh-story-add-icon{font-size:0!important}
html[data-mm43-social] .sh-story-add-icon>*{display:none!important}
html[data-mm43-social] .sh-story-add-icon::after{content:'+';font:400 30px/1 system-ui;display:block;color:var(--amber,#f4bc3e)}
'''
p.write_text(s)

if '--ui' in sys.argv:
    p=root/'test_ui.py';s=p.read_text()
    s=s.replace('<head><meta name="viewport"','<head><meta charset="utf-8"><meta name="viewport"')
    needle="        page.screenshot(path=str(OUT/f'social-{width}.png'),full_page=False)"
    if "page.evaluate('window.scrollTo(0,0)')" not in s:s=s.replace(needle,"        page.evaluate('window.scrollTo(0,0)')\n"+needle)
    p.write_text(s);print('Prepared UTF-8, top-of-feed fixture screenshots');sys.exit(0)

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
main=main.replace(needle,'''    private boolean handleAppBack(){
        if(fullVideo!=null){closeFullVideo();return true;}
        if(tab==NEWS&&web!=null&&web.getUrl()!=null&&!NEWS_PATH.equals(Uri.parse(web.getUrl()).getPath())){navigate(NEWS);return true;}
        if(web!=null&&web.canGoBack()){web.goBack();return true;}
        if(tab!=HOME){navigate(HOME);return true;}return false;
    }''')
# Loading trusted packaged HTML directly avoids network/service-worker navigation
# replacing the nonexistent local path with the website's 404 document.
needle='web.loadUrl(url);}'
assert main.count(needle)==1
main=main.replace(needle,'''if(NEWS_PATH.equals(Uri.parse(url).getPath())){
            String html=asset("news43.html");
            if(html.isEmpty()){showOffline("Berkas Berita tidak tersedia.");return;}
            web.loadDataWithBaseURL(BASE+NEWS_PATH,html,"text/html","UTF-8",BASE+NEWS_PATH);
        }else web.loadUrl(url);
    }''')
needle='                    if(p.startsWith("/api/auth/google/start")){signIn();return true;}'
assert main.count(needle)==1
main=main.replace(needle,'                    if(NEWS_PATH.equals(p)){navigate(NEWS);return true;}\n'+needle)
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
assert 'loadDataWithBaseURL(BASE+NEWS_PATH,html' in main
print('PASS: four destinations, strict origin, SSL fail-closed, local news origin, AndroidX back callback')
