"""App-only update. Run after python3 mobile43/prepare.py."""
from pathlib import Path
import shutil,re,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
root=Path(__file__).resolve().parent
assets=root/'assets';out=base/'app/src/main/assets'
css=(out/'social43.css').read_text().replace('mm43','mm44').replace('Android app','Android app 4.4')
(assets/'social44.css').write_text(css+(root/'reference44.css').read_text())
p=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java';s=p.read_text()
def once(old,new):
 global s
 if s.count(old)!=1:raise RuntimeError('Unexpected source anchor: '+old[:70])
 s=s.replace(old,new,1)
s=s.replace('MarketMarneyAndroid/4.3 AppShell','MarketMarneyAndroid/4.4 AppShell').replace("version:'4.3'","version:'4.4'").replace("dataset.mmAndroid='43'","dataset.mmAndroid='44'")
s=s.replace('asset("social43.js")','asset("social44.js")').replace('asset("social43.css")','asset("social44.css")')
once('if("/beranda-trader.html".equals(Uri.parse(url).getPath())){','if("/beranda-trader.html".equals(Uri.parse(url).getPath())||"/profil.html".equals(Uri.parse(url).getPath())){')
once('    private void navigate(int selected){tab=selected;drawTabs();disposeWeb();createWeb();open(BASE+paths[tab]);}',
'''    private void navigate(int selected){tab=selected;updateSocialChrome();drawTabs();disposeWeb();createWeb();open(BASE+paths[tab]);}
    private void updateSocialChrome(){
        boolean light=tab==SOCIAL;
        int canvas=light?Color.WHITE:BG;
        root.setBackgroundColor(canvas);
        getWindow().setStatusBarColor(canvas);
        getWindow().setNavigationBarColor(light?Color.WHITE:PANEL);
        int flags=light?View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR:0;
        if(Build.VERSION.SDK_INT>=26&&light)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if(bottom!=null)bottom.setBackgroundColor(light?Color.WHITE:PANEL);
    }''')
s=s.replace('selected?GOLD:MUTED','selected?(tab==SOCIAL?Color.rgb(20,20,20):GOLD):(tab==SOCIAL?Color.rgb(125,125,125):MUTED)')
s=s.replace('active?GOLD:MUTED','active?(tab==SOCIAL?Color.rgb(20,20,20):GOLD):(tab==SOCIAL?Color.rgb(125,125,125):MUTED)')
s=s.replace('shape.setColor(selected?GOLD:Color.TRANSPARENT)','shape.setColor(selected?(tab==SOCIAL?Color.BLACK:GOLD):Color.TRANSPARENT)')
s=s.replace('web=new WebView(this);web.setBackgroundColor(BG);','web=new WebView(this);web.setBackgroundColor(tab==SOCIAL?Color.WHITE:BG);')
p.write_text(s)
for f in ['social44.css','social44.js']:shutil.copy2(assets/f,out/f)
p=base/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta44'",g);g=re.sub(r'versionCode \d+','versionCode 8',g);g=re.sub(r"versionName '[^']+'","versionName '4.4.0-beta'",g);p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';v=p.read_text();p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Social Marney 4.4 Beta',v))
assert 'labels={"Beranda","Berita","Market Live","Social Marney"}' in s
assert 'i<4' in s and 'addJavascriptInterface' not in s
assert 'handler.cancel()' in s and 'MIXED_CONTENT_NEVER_ALLOW' in s
assert 'getOnBackPressedDispatcher().addCallback' in s
assert 'getPackageName().equals("com.marketmarney.mobile")' in s
assert 'loadDataWithBaseURL(BASE+NEWS_PATH,html' in s
j=(assets/'social44.js').read_text()
assert "location.hostname!=='marketmarney.com'" in j
assert "if(!logged()&&view!=='feed')" in j
assert 'trigger.click()' in j
print('PASS: beta44 prepared; four tabs, exact origin, SSL and existing auth retained')
