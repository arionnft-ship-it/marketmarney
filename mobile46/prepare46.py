"""Apply after 4.5 assembly; changes APK files only, not Railway or accounts."""
from pathlib import Path
import re, shutil, sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
root=Path(__file__).resolve().parent
assets=base/'app/src/main/assets'
main=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
s=main.read_text()
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Source anchor changed: '+a[:100])
 s=s.replace(a,b,1)
once('socialCss=asset("social44.css");socialScript=asset("social44.js");','socialCss=asset("social44.css")+"\\n"+asset("reels46.css");socialScript=asset("social44.js")+"\\n"+asset("reels46.js");')
once('        if(destroyed||v!=web||!own(url))return;', '''        if(destroyed||v!=web||!own(url))return;
        // Muted autoplay is allowed only on the exact trusted Social page.
        // Other screens retain the original user-gesture requirement.
        v.getSettings().setMediaPlaybackRequiresUserGesture(!"/beranda-trader.html".equals(Uri.parse(url).getPath()));''')
once('@Override protected void onPause(){if(web!=null){web.onPause();if(own(web.getUrl()))web.evaluateJavascript("document.querySelectorAll(\'video,audio\').forEach(function(v){v.pause()})",null);}super.onPause();}', '''@Override protected void onPause(){
        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}",null);web.onPause();}
        super.onPause();
    }''')
once('@Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}', '@Override protected void onResume(){super.onResume();if(web!=null)resumePage(web);}')
# Match native chrome to the Reels route, without exposing a JS-to-native bridge.
once('    private boolean destroyed=false;', '    private boolean destroyed=false;\n    private boolean reelsChrome=false;\n    private boolean lightSocial(){return tab==SOCIAL&&!reelsChrome;}')
once('        tab=selected;updateSocialChrome();drawTabs();', '        tab=selected;reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");updateSocialChrome();drawTabs();')
s=s.replace('boolean light=tab==SOCIAL;', 'boolean light=lightSocial();').replace('tab==SOCIAL?Color.', 'lightSocial()?Color.')
once('            @Override public void onPageCommitVisible(WebView v,String url){adapt(v,url);}', '''            @Override public void doUpdateVisitedHistory(WebView v,String url,boolean reload){
                if(v!=web||!own(url))return;
                boolean next=tab==SOCIAL&&"mm44-reels".equals(Uri.parse(url).getFragment());
                if(next!=reelsChrome){reelsChrome=next;updateSocialChrome();drawTabs();}
            }
            @Override public void onPageCommitVisible(WebView v,String url){adapt(v,url);}''')
s=s.replace('MarketMarneyAndroid/4.5 AppShell','MarketMarneyAndroid/4.6 AppShell').replace("version:'4.5'","version:'4.6'").replace("dataset.mmAndroid='45'","dataset.mmAndroid='46'").replace("s.dataset.revision!=='45'","s.dataset.revision!=='46'").replace("s.dataset.revision='45'","s.dataset.revision='46'")
main.write_text(s)
p=assets/'social44.js';j=p.read_text();a="media.forEach(function(m){if(watched.has(m))return;watched.add(m);";assert j.count(a)==1
j=j.replace(a,"media.forEach(function(m){if(m.matches('.sh-reel-video'))return;if(watched.has(m))return;watched.add(m);",1);p.write_text(j)
for name in ['reels46.css','reels46.js']:shutil.copy2(root/name,assets/name)
p=base/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta46'",g);g=re.sub(r'versionCode \d+','versionCode 10',g);g=re.sub(r"versionName '[^']+'","versionName '4.6.0-beta'",g);p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.6 Reels Beta',p.read_text()))
assert 'labels={"Beranda","Berita","Market Live","Social Marney"}' in s
assert 'while(retained.size()>1)' in s and 'addJavascriptInterface' not in s
assert 'handler.cancel()' in s and 'MIXED_CONTENT_NEVER_ALLOW' in s
assert 'getPackageName().equals("com.marketmarney.mobile")' in s
assert "controlIcon(bell,'notice')" in j and 'mm45-accent' in j
print('PASS: four tabs, Marney icons, bounded warm pages, trusted autoplay and lifecycle preserved')
