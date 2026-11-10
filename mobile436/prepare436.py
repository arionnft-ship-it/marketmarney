#!/usr/bin/env python3
"""Apply MarketMarney 4.36 native runtime, network and power-aware optimizations to 4.35."""
from pathlib import Path
import hashlib
import json
import shutil

from optimize_reels436 import patch_controller

base=Path(__file__).resolve().parent
root=Path('android436')
if not root.exists():
    raise SystemExit('android436 source is missing')

def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()
def inventory():
    return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
def read(rel:str)->str:
    return (root/rel).read_text(encoding='utf-8')
def write(rel:str,text:str)->None:
    path=root/rel;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8')
def replace(rel:str,old:str,new:str,count:int=1)->None:
    text=read(rel);actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:180]!r}'
    write(rel,text.replace(old,new,count))

before=inventory()

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta435'","applicationId 'com.marketmarney.mobile.beta436'")
replace('app/build.gradle','versionCode 39','versionCode 40')
replace('app/build.gradle',"versionName '4.35.0-beta'","versionName '4.36.0-beta'")
replace('app/src/main/res/values/strings.xml','MarketMarney 4.35 Optimal','MarketMarney 4.36 Stable')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'import android.content.Intent;','import android.content.Intent;\nimport android.content.BroadcastReceiver;\nimport android.content.IntentFilter;')
replace(main,'import android.net.Uri;','import android.net.Uri;\nimport android.net.ConnectivityManager;\nimport android.net.Network;\nimport android.net.NetworkCapabilities;')
replace(main,'import android.os.Build;','import android.os.Build;\nimport android.os.PowerManager;')
replace(main,'MarketMarney 4.35.0-beta','MarketMarney 4.36.0-beta')
replace(main,'MarketMarneyAndroid/4.35 AppShell','MarketMarneyAndroid/4.36 AppShell')
replace(main,"version:'4.35'","version:'4.36'")
replace(main,"dataset.mmAndroid='435'","dataset.mmAndroid='436'")
replace(main,"dataset.revision!=='435'","dataset.revision!=='436'",count=2)
replace(main,"dataset.revision='435'","dataset.revision='436'",count=2)

old_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js");'
new_assets='depthCss=asset("depth423.css");depthScript=asset("depth423.js");chromeScript=asset("chrome424.js");lightCss=asset("light425.css")+"\\n"+asset("soft426.css")+"\\n"+asset("fast428.css")+"\\n"+asset("social429.css")+"\\n"+asset("home430.css")+"\\n"+asset("reels433.css")+"\\n"+asset("performance435.css")+"\\n"+asset("performance436.css");lightScript=asset("light425.js")+"\\n"+asset("social429.js")+"\\n"+asset("home430.js")+"\\n"+asset("reels433.js")+"\\n"+asset("lifecycle435.js")+"\\n"+asset("runtime436.js");'
replace(main,old_assets,new_assets)

old_fields='''    private long lastRendererRecovery=-60000L;
    private boolean lowRamDevice=false;
'''
new_fields='''    private long lastRendererRecovery=-60000L;
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback networkCallback;
    private BroadcastReceiver powerReceiver;
    private boolean networkCallbackRegistered=false,powerReceiverRegistered=false;
    private boolean nativeOnline=true,nativeValidated=true,nativeMetered=false,nativePowerSave=false;
    private int nativeDownKbps=0;
    private long lastAutoRecoverAt=-10000L;
    private boolean lowRamDevice=false;
'''
replace(main,old_fields,new_fields)

runtime_methods='''    private boolean recoverableNetworkFailure(){
        return "UNAVAILABLE".equals(failureCode)||"OFFLINE".equals(failureCode)||"NETWORK".equals(failureCode)
            ||"CONNECT".equals(failureCode)||"HOST".equals(failureCode)||"DNS".equals(failureCode)||"TIMEOUT".equals(failureCode);
    }
    private String runtimeDetail(){
        return "{online:"+nativeOnline+",validated:"+nativeValidated+",metered:"+nativeMetered+
            ",downKbps:"+nativeDownKbps+",powerSave:"+nativePowerSave+"}";
    }
    private void dispatchRuntimeState(){
        WebView target=web;if(destroyed||target==null||!own(target.getUrl()))return;
        String detail=runtimeDetail();
        target.evaluateJavascript("try{var d="+detail+";window.__mm436NativeNetwork=true;window.dispatchEvent(new CustomEvent('mmapp:runtime',{detail:d}));window.dispatchEvent(new CustomEvent('mmapp:network',{detail:d}));window.dispatchEvent(new CustomEvent('mmapp:power',{detail:{saving:d.powerSave}}))}catch(e){}",null);
    }
    private void refreshRuntimeState(boolean allowRecovery){
        if(destroyed)return;
        boolean online=false,validated=false,metered=false,power=false;int down=0;
        try{
            if(connectivity==null)connectivity=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
            Network active=connectivity==null?null:connectivity.getActiveNetwork();
            NetworkCapabilities caps=connectivity==null||active==null?null:connectivity.getNetworkCapabilities(active);
            online=caps!=null&&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
            validated=caps!=null&&caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
            metered=connectivity!=null&&connectivity.isActiveNetworkMetered();
            down=caps==null?0:Math.max(0,caps.getLinkDownstreamBandwidthKbps());
        }catch(RuntimeException ignored){}
        try{PowerManager manager=(PowerManager)getSystemService(POWER_SERVICE);power=manager!=null&&manager.isPowerSaveMode();}catch(RuntimeException ignored){}
        nativeOnline=online;nativeValidated=validated;nativeMetered=metered;nativeDownKbps=down;nativePowerSave=power;
        dispatchRuntimeState();
        if(allowRecovery&&online&&validated&&offline!=null&&mainFailed&&recoverableNetworkFailure()){
            long now=SystemClock.uptimeMillis();if(now-lastAutoRecoverAt<2500)return;lastAutoRecoverAt=now;
            frame.postDelayed(()->{if(!destroyed&&nativeOnline&&nativeValidated&&offline!=null&&mainFailed&&recoverableNetworkFailure())recoverPage();},350);
        }
    }
    private void registerRuntimeSignals(){
        connectivity=(ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        if(connectivity!=null&&Build.VERSION.SDK_INT>=24){
            networkCallback=new ConnectivityManager.NetworkCallback(){
                @Override public void onAvailable(Network network){runOnUiThread(()->refreshRuntimeState(true));}
                @Override public void onLost(Network network){runOnUiThread(()->refreshRuntimeState(false));}
                @Override public void onCapabilitiesChanged(Network network,NetworkCapabilities capabilities){runOnUiThread(()->refreshRuntimeState(true));}
            };
            try{connectivity.registerDefaultNetworkCallback(networkCallback);networkCallbackRegistered=true;}catch(RuntimeException ignored){}
        }
        powerReceiver=new BroadcastReceiver(){@Override public void onReceive(android.content.Context context,Intent intent){refreshRuntimeState(false);}};
        try{
            IntentFilter filter=new IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED);
            if(Build.VERSION.SDK_INT>=33)registerReceiver(powerReceiver,filter,RECEIVER_NOT_EXPORTED);else registerReceiver(powerReceiver,filter);
            powerReceiverRegistered=true;
        }catch(RuntimeException ignored){}
        refreshRuntimeState(false);
    }
    private void unregisterRuntimeSignals(){
        if(networkCallbackRegistered&&connectivity!=null&&networkCallback!=null)try{connectivity.unregisterNetworkCallback(networkCallback);}catch(RuntimeException ignored){}
        if(powerReceiverRegistered&&powerReceiver!=null)try{unregisterReceiver(powerReceiver);}catch(RuntimeException ignored){}
        networkCallbackRegistered=false;powerReceiverRegistered=false;networkCallback=null;powerReceiver=null;
    }
'''
replace(main,'    private String appReport(){',runtime_methods+'    private String appReport(){')

old_report='''        String connection="Belum diperiksa";
        try{
            android.net.ConnectivityManager cm=(android.net.ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
            android.net.NetworkCapabilities c=cm==null?null:cm.getNetworkCapabilities(cm.getActiveNetwork());
            connection=c==null?"Tidak ada jaringan aktif":c.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)?"Internet terdeteksi oleh Android":"Jaringan ada; akses internet belum terverifikasi";
        }catch(Exception ignored){}
        // No URLs/query strings, credentials, username, chat, prices or device identifiers.
        return "MarketMarney 4.36.0-beta\\nMenu: "+labels[tab]+"\\nAndroid: "+Build.VERSION.RELEASE+
            "\\nKoneksi: "+connection+"\\nStatus halaman: "+(mainFailed?failureCode:firstPaint?"Tampil":"Memuat")+
            "\\nPaket uji terpisah. Google Login native belum didaftarkan untuk beta ini.";
'''
new_report='''        refreshRuntimeState(false);
        String connection=!nativeOnline?"Tidak ada jaringan aktif":nativeValidated?"Internet terverifikasi":"Jaringan aktif; internet belum terverifikasi";
        connection+=nativeMetered?" · jaringan terbatas":" · jaringan tidak dibatasi";
        if(nativeDownKbps>0)connection+=" · "+nativeDownKbps+" Kbps";
        // No URLs/query strings, credentials, username, chat, prices or device identifiers.
        return "MarketMarney 4.36.0-beta\\nMenu: "+labels[tab]+"\\nAndroid: "+Build.VERSION.RELEASE+
            "\\nKoneksi: "+connection+"\\nHemat daya: "+(nativePowerSave?"aktif":"nonaktif")+
            "\\nStatus halaman: "+(mainFailed?failureCode:firstPaint?"Tampil":"Memuat")+
            "\\nPaket uji terpisah. Google Login native belum didaftarkan untuk beta ini.";
'''
replace(main,old_report,new_report)

replace(main,'        appResources=AppResources49.install(getApplicationContext());','        appResources=AppResources49.install(getApplicationContext());\n        registerRuntimeSignals();')
replace(main,'            lastAdaptedDocument=url;\n            if(!social||"\\\"bundled\\\"".equals(result))return;','            lastAdaptedDocument=url;refreshRuntimeState(false);\n            if(!social||"\\\"bundled\\\"".equals(result))return;')
replace(main,'    @Override protected void onResume(){super.onResume();if(web!=null){resumePage(web);notifyAppVisibility(true);}}','    @Override protected void onResume(){super.onResume();if(web!=null){resumePage(web);notifyAppVisibility(true);}refreshRuntimeState(false);}')
replace(main,'    @Override protected void onDestroy(){destroyed=true;if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}','    @Override protected void onDestroy(){destroyed=true;unregisterRuntimeSignals();if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}')

startup='app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup,'MarketMarney 4.35 opening','MarketMarney 4.36 opening')
replace(startup,'MM435_LAUNCH','MM436_LAUNCH',count=2)

version_tests=[]
for test_file in (root/'app/src/androidTest/java').rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.35.0-beta','4.36.0-beta').replace('com.marketmarney.mobile.beta435','com.marketmarney.mobile.beta436')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

assets=root/'app/src/main/assets'
for rel in ['reels46.js','social411/app.js','social411/bundle427.js']:
    patch_controller(assets/rel)
shutil.copy2(base/'runtime436.js',assets/'runtime436.js')
shutil.copy2(base/'performance436.css',assets/'performance436.css')
new_test=root/'app/src/androidTest/java/com/marketmarney/mobile/Performance436Test.java'
new_test.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Performance436Test.java',new_test)
shutil.copy2(base/'Marney436-Panduan.md',root/'README-MULAI-DISINI.md')

after=inventory()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
expected={
    'README-MULAI-DISINI.md','app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js','app/src/main/assets/social411/app.js','app/src/main/assets/social411/bundle427.js',
    'app/src/main/assets/runtime436.js','app/src/main/assets/performance436.css',
    'app/src/androidTest/java/com/marketmarney/mobile/Performance436Test.java',
}
expected.update(version_tests)
assert changed==sorted(expected),{'unexpected':sorted(set(changed)-expected),'missing':sorted(expected-set(changed))}
manifest={
    'release':'4.36.0-beta','package':'com.marketmarney.mobile.beta436','baseRelease':'4.35.0-beta',
    'purpose':'Bridge Android network validation, metering and power-save state into Social/Reels; recover network failures safely; and reduce media work on constrained devices without changing the public website or database.',
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified436.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.36 stable patch: {len(changed)} changed files; {len(manifest['preserved'])} unchanged files.")
