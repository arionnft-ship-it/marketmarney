"""Launch-animation-only change on the verified 4.9 source. No server changes."""
from pathlib import Path
import re,sys,shutil,hashlib,json
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43');root=Path(__file__).resolve().parent
java=base/'app/src/main/java/com/marketmarney/mobile';p=java/'MainActivity.java';s=p.read_text()
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Unexpected source anchor: '+a[:100])
 s=s.replace(a,b,1)
once('    private boolean destroyed=false;', '''    private boolean destroyed=false;
    private StartupOverlay launchOverlay;
    private void showLaunchAnimation(){
        if(destroyed||launchOverlay!=null)return;
        FrameLayout host=findViewById(android.R.id.content);
        root.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        launchOverlay=new StartupOverlay(this,()->{
            launchOverlay=null;
            if(!destroyed){root.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);updateSocialChrome();}
        });
        host.addView(launchOverlay,new FrameLayout.LayoutParams(-1,-1));
        getWindow().setStatusBarColor(Color.rgb(6,20,35));getWindow().setNavigationBarColor(Color.rgb(6,20,35));
        getWindow().getDecorView().setSystemUiVisibility(0);
        launchOverlay.requestApplyInsets();
    }
    private void endLaunchAnimation(boolean fade,String reason){
        if(launchOverlay!=null)launchOverlay.finish(fade,reason);
    }''')
once('        google.refreshSession();', '        if(state==null)showLaunchAnimation();\n        google.refreshSession();')
once('@Override public void onPageCommitVisible(WebView v,String url){adapt(v,url);}', '@Override public void onPageCommitVisible(WebView v,String url){adapt(v,url);if(v==web&&own(url))endLaunchAnimation(true,"first-frame");}')
once('progress.setVisibility(View.GONE);adapt(v,url);CookieManager.getInstance().flush();', 'progress.setVisibility(View.GONE);adapt(v,url);endLaunchAnimation(true,"page-finished");CookieManager.getInstance().flush();')
once('    private void showOffline(String message){', '    private void showOffline(String message){\n        endLaunchAnimation(false,"connection-error");')
once('    private boolean handleAppBack(){', '    private boolean handleAppBack(){\n        if(launchOverlay!=null){endLaunchAnimation(false,"back");return true;}')
once('    @Override protected void onPause(){', '    @Override protected void onPause(){\n        if(launchOverlay!=null)launchOverlay.dispose();')
once('@Override protected void onDestroy(){destroyed=true;', '@Override protected void onDestroy(){destroyed=true;if(launchOverlay!=null)launchOverlay.dispose();')
s=s.replace('MarketMarneyAndroid/4.9 AppShell','MarketMarneyAndroid/4.10 AppShell')
# Preserve web bridge metadata/revisions because none of those assets are changed.
p.write_text(s);shutil.copy2(root/'StartupOverlay.java',java/'StartupOverlay.java')
styles=base/'app/src/main/res/values/styles.xml';xml=styles.read_text().replace('#061423','#061423')
v31=base/'app/src/main/res/values-v31';v31.mkdir(exist_ok=True)
xml=xml.replace('</style>','<item name="android:windowSplashScreenBackground">#061423</item><item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item><item name="android:windowSplashScreenIconBackgroundColor">#061423</item></style>')
(v31/'styles.xml').write_text(xml)
p=base/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta410'",g);g=re.sub(r'versionCode \d+','versionCode 14',g);g=re.sub(r"versionName '[^']+'","versionName '4.10.0-beta'",g)
g=g.replace('        minSdk 24','        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"\n        minSdk 24')
g+='\ndependencies { androidTestImplementation "androidx.test:runner:1.7.0"; androidTestImplementation "junit:junit:4.13.2" }\n';p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.10 Animasi',p.read_text()))
tests=base/'app/src/androidTest/java/com/marketmarney/mobile';tests.mkdir(parents=True,exist_ok=True);shutil.copy2(root/'StartupOverlayTest.java',tests/'StartupOverlayTest.java')
assert 'AppResources49.install(getApplicationContext())' in s
assert 'appResources.respond(req,"view")' in s
assert 'while(retained.size()>1)' in s and 'handler.cancel()' in s and 'addJavascriptInterface' not in s
assert 'labels={"Beranda","Berita","Market Live","Social Marney"}' in s
print('PASS: startup overlay only; current Social/group/profile assets and security remain unchanged')
