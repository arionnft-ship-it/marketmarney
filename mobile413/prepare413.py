"""Scoped XAUWar route update. No server, private data, auth, or visual asset changes."""
from pathlib import Path
import hashlib,json,re,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
java=base/'app/src/main/java/com/marketmarney/mobile'
p=java/'MainActivity.java';s=p.read_text()
protected={str(f.relative_to(base)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (base/'app/src/main/assets').rglob('*') if f.is_file()}
for name in ['StartupOverlay.java','AndroidGoogleLogin.java','AppResources49.java']:
 f=java/name;protected[str(f.relative_to(base))]=hashlib.sha256(f.read_bytes()).hexdigest()
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Changed base source: '+a[:120])
 s=s.replace(a,b,1)
once('private static final String XAUWAR_PATH = XAUWAR_PAGE + "?v=7.6";', 'private static final String XAUWAR_VERSION = "7.7";\n    private static final String XAUWAR_PATH = XAUWAR_PAGE + "?v=" + XAUWAR_VERSION;')
once('    private void open(String url){', '''    private String latestXauWarUrl(Uri incoming){
        if(!own(incoming)||!XAUWAR_PAGE.equals(incoming.getPath()))throw new IllegalArgumentException("Not a trusted XAUWar link");
        Uri.Builder next=incoming.buildUpon().clearQuery();
        for(String name:incoming.getQueryParameterNames()){
            if(!"v".equals(name))for(String value:incoming.getQueryParameters(name))next.appendQueryParameter(name,value);
        }
        next.appendQueryParameter("v",XAUWAR_VERSION);
        return next.build().toString();
    }
    private void open(String url){''')
once('if(XAUWAR_PAGE.equals(p)&&tab!=XAUWAR){navigate(XAUWAR);if(u.getQuery()!=null||u.getFragment()!=null)open(u.toString());return true;}', '''if(XAUWAR_PAGE.equals(p)){
                        String latest=latestXauWarUrl(u);
                        if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH).equals(latest))open(latest);return true;}
                        if(!latest.equals(u.toString())){open(latest);return true;}
                    }''')
s=s.replace('MarketMarneyAndroid/4.12 AppShell','MarketMarneyAndroid/4.13 AppShell').replace("version:'4.12'","version:'4.13'").replace("dataset.mmAndroid='412'","dataset.mmAndroid='413'")
p.write_text(s)
p=base/'app/build.gradle';g=p.read_text()
assert "applicationId 'com.marketmarney.mobile.beta412'" in g and 'versionCode 16' in g
g=g.replace("applicationId 'com.marketmarney.mobile.beta412'","applicationId 'com.marketmarney.mobile.beta413'").replace('versionCode 16','versionCode 17').replace("versionName '4.12.0-beta'","versionName '4.13.0-beta'");p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.13 XAUWar Live',p.read_text()))
for name,digest in protected.items():assert hashlib.sha256((base/name).read_bytes()).hexdigest()==digest,name
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' in s
assert 'if(tab==XAUWAR)return false;' in s and 'while(retained.size()>1)' in s
assert 'MIXED_CONTENT_NEVER_ALLOW' in s and 'handler.cancel()' in s and 'addJavascriptInterface' not in s
Path('preserved413.json').write_text(json.dumps(protected,indent=2))
# Reuse the six existing native tests, then add two regression tests for older links.
target=base/'app/src/androidTest/java/com/marketmarney/mobile/Navigation413Test.java'
t=Path('mobile412/Navigation412Test.java').read_text().replace('Navigation412Test','Navigation413Test').replace('?v=7.6','?v=7.7')
extra='''
    @Test public void legacyLinksSelectLatestVersionAndPreserveOptions(){ui(()->{
        try{
            java.lang.reflect.Method m=MainActivity.class.getDeclaredMethod("latestXauWarUrl",android.net.Uri.class);m.setAccessible(true);
            android.net.Uri result=android.net.Uri.parse((String)m.invoke(activity,android.net.Uri.parse("https://marketmarney.com/assets/xau-war-3d.html?v=7.6&view=drone#arena")));
            assertEquals("7.7",result.getQueryParameter("v"));assertEquals("drone",result.getQueryParameter("view"));assertEquals("arena",result.getFragment());
            assertEquals(1,result.getQueryParameters("v").size());
        }catch(Exception e){throw new RuntimeException(e);}
    });}
    @Test public void noVersionLinkGetsCurrentVersion(){ui(()->{
        try{
            java.lang.reflect.Method m=MainActivity.class.getDeclaredMethod("latestXauWarUrl",android.net.Uri.class);m.setAccessible(true);
            assertEquals("https://marketmarney.com/assets/xau-war-3d.html?v=7.7",m.invoke(activity,android.net.Uri.parse("https://marketmarney.com/assets/xau-war-3d.html")));
        }catch(Exception e){throw new RuntimeException(e);}
    });}
'''
t=t[:t.rfind('}')]+extra+'}\n';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(t)
# Public-page checks use the same actual APK, not fixtures or altered provider responses.
t=Path('mobile412/test_public412.py').read_text().replace("Path('quality412')","Path('quality413')").replace('com.marketmarney.mobile.beta412','com.marketmarney.mobile.beta413').replace("=='7.6'","=='7.7'").replace('Existing 7.6 destination selected','Deployed 7.7 destination selected')
t=t.replace("record('Demo disclosure visible in page text',ev(\"document.body.innerText.toUpperCase().includes('DEMO')\"))", "record('Live 7.7 implementation loaded',ev(\"Array.from(document.scripts).some(s=>s.textContent.includes('7.7-hd-live'))\"))\n record('Gold API source implementation present',ev(\"Array.from(document.scripts).some(s=>s.textContent.includes('api.gold-api.com/price/XAU'))\"))")
t=t.replace("existing public XAUWar page, no real trading feed activated", "public XAUWar 7.7; no trading transactions; provider snapshot freshness is not asserted by this test")
Path('test_public413.py').write_text(t);compile(t,'test_public413.py','exec')
print('PASS: XAUWar 7.7 routes;',len(protected),'protected files unchanged; 8 native tests prepared')
