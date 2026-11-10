#!/usr/bin/env python3
"""Apply MarketMarney 4.35 connectivity-aware recovery and memory-pressure handling."""
from pathlib import Path
import hashlib
import json
import shutil

base = Path(__file__).resolve().parent
root = Path('android435')
if not root.exists():
    raise SystemExit('android435 source is missing')


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inventory():
    return {
        path.relative_to(root).as_posix(): digest(path)
        for path in root.rglob('*') if path.is_file()
    }


def read(relative: str) -> str:
    return (root / relative).read_text(encoding='utf-8')


def write(relative: str, text: str) -> None:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding='utf-8')


def replace(relative: str, old: str, new: str, count: int = 1) -> None:
    text = read(relative)
    actual = text.count(old)
    assert actual == count, (
        f'{relative}: expected {count} occurrence(s), found {actual}: {old[:180]!r}'
    )
    write(relative, text.replace(old, new, count))


before = inventory()

# Release identity.
replace('app/build.gradle',
        "applicationId 'com.marketmarney.mobile.beta434'",
        "applicationId 'com.marketmarney.mobile.beta435'")
replace('app/build.gradle', 'versionCode 38', 'versionCode 39')
replace('app/build.gradle',
        "versionName '4.34.0-beta'",
        "versionName '4.35.0-beta'")
replace('app/src/main/res/values/strings.xml',
        'MarketMarney 4.34 Performance',
        'MarketMarney 4.35 Stability')

main = 'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main, 'MarketMarney 4.34.0-beta', 'MarketMarney 4.35.0-beta')
replace(main, 'MarketMarneyAndroid/4.34 AppShell', 'MarketMarneyAndroid/4.35 AppShell')
replace(main, "version:'4.34'", "version:'4.35'")
replace(main, "dataset.mmAndroid='434'", "dataset.mmAndroid='435'")
replace(main, "dataset.revision!=='434'", "dataset.revision!=='435'", count=2)
replace(main, "dataset.revision='434'", "dataset.revision='435'", count=2)

startup = 'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java'
replace(startup, 'MarketMarney 4.34 opening', 'MarketMarney 4.35 opening')
replace(startup, 'MM434_LAUNCH', 'MM435_LAUNCH', count=2)

# Keep every inherited instrumentation test aligned with the new beta package/version.
version_tests = []
for test_file in (root / 'app/src/androidTest/java').rglob('*.java'):
    text = test_file.read_text(encoding='utf-8')
    updated = (text
               .replace('4.34.0-beta', '4.35.0-beta')
               .replace('com.marketmarney.mobile.beta434',
                        'com.marketmarney.mobile.beta435'))
    if updated != text:
        test_file.write_text(updated, encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

# The fixture can report DOM readiness a fraction before Android's queued
# onPageFinished adaptation finishes. Settle that legitimate current-document
# adaptation first, then test that obsolete path/query callbacks cannot restyle it.
adapt_test_rel='app/src/androidTest/java/com/marketmarney/mobile/AdaptGuardTest.java'
adapt_test=read(adapt_test_rel)
adapt_old='''  assertTrue("Fixture document marker, URL and readiness committed",fixture[0].awaitReady(inst,()->(WebView)field("web")));
  assertEquals("true",js("window.guardErrors=[];window.addEventListener('error',e=>guardErrors.push(e.message));document.querySelectorAll('#mm43-common,#mm43-social-style').forEach(n=>n.remove());true"));'''
adapt_new='''  assertTrue("Fixture document marker, URL and readiness committed",fixture[0].awaitReady(inst,()->(WebView)field("web")));
  for(int settle=0;settle<50;settle++){
   boolean nativeReady=url.equals(String.valueOf(field("lastAdaptedDocument")));
   boolean scriptReady="true".equals(js("!!document.getElementById('mm43-social-style')||!!window.__mm411BundledReady"));
   if(nativeReady&&scriptReady)break;
   SystemClock.sleep(100);
  }
  SystemClock.sleep(200);
  assertEquals("Current fixture adaptation settled",url,String.valueOf(field("lastAdaptedDocument")));
  assertEquals("true",js("window.guardErrors=[];window.addEventListener('error',e=>guardErrors.push(e.message));document.querySelectorAll('#mm43-common,#mm43-social-style').forEach(n=>n.remove());true"));'''
assert adapt_test.count(adapt_old)==1,'AdaptGuardTest setup changed unexpectedly'
write(adapt_test_rel,adapt_test.replace(adapt_old,adapt_new,1))
if adapt_test_rel not in version_tests:version_tests.append(adapt_test_rel)

# Connectivity-aware recovery: retry only read-only network failures after Android
# reports a validated network, with a bounded delay and lifecycle cancellation.
fields_anchor = """    private long lastReloadAt=-10000L;
    private void clearOffline(){if(offline!=null){frame.removeView(offline);offline=null;}}"""
fields_replacement = """    private long lastReloadAt=-10000L;
    private android.net.ConnectivityManager connectivityManager;
    private android.net.ConnectivityManager.NetworkCallback networkCallback;
    private Runnable networkRetryTask;
    private boolean activityResumed=false,networkValidated=false;
    private int networkFailureStreak=0;
    private long lastNetworkRecovery=-60000L;
    private long recoverySequence=0L;
    private boolean recoverableFailure(String code){
        return \"DNS\".equals(code)||\"TIMEOUT\".equals(code)||\"NETWORK\".equals(code)||\"UNAVAILABLE\".equals(code);
    }
    private boolean validatedNetwork(android.net.NetworkCapabilities capabilities){
        return capabilities!=null
            &&capabilities.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
            &&capabilities.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }
    private void cancelNetworkRetry(){
        if(networkRetryTask!=null&&frame!=null){frame.removeCallbacks(networkRetryTask);networkRetryTask=null;}
    }
    private void updateNetworkState(boolean validated){
        if(destroyed)return;
        networkValidated=validated;
        if(validated)scheduleNetworkRetry();else cancelNetworkRetry();
    }
    private void scheduleNetworkRetry(){
        if(destroyed||frame==null||web==null||!activityResumed||!networkValidated||!mainFailed
            ||!recoverableFailure(failureCode)||networkRetryTask!=null)return;
        final long ticket=recoverySequence;
        int shift=Math.min(networkFailureStreak,3);
        long delay=Math.min(5000L,500L*(1L<<shift));
        long since=SystemClock.uptimeMillis()-lastNetworkRecovery;
        if(since<2500L)delay=Math.max(delay,2500L-since);
        networkRetryTask=()->{
            networkRetryTask=null;
            if(destroyed||ticket!=recoverySequence||!activityResumed||!networkValidated||!mainFailed
                ||!recoverableFailure(failureCode)||web==null)return;
            lastNetworkRecovery=SystemClock.uptimeMillis();
            recoverPage(true);
        };
        frame.postDelayed(networkRetryTask,delay);
    }
    private void startNetworkWatch(){
        connectivityManager=(android.net.ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
        if(connectivityManager==null)return;
        networkCallback=new android.net.ConnectivityManager.NetworkCallback(){
            @Override public void onAvailable(android.net.Network network){
                runOnUiThread(()->{
                    if(destroyed||connectivityManager==null)return;
                    updateNetworkState(validatedNetwork(connectivityManager.getNetworkCapabilities(network)));
                });
            }
            @Override public void onCapabilitiesChanged(android.net.Network network,android.net.NetworkCapabilities capabilities){
                final boolean validated=validatedNetwork(capabilities);
                runOnUiThread(()->updateNetworkState(validated));
            }
            @Override public void onLost(android.net.Network network){
                runOnUiThread(()->{
                    if(destroyed||connectivityManager==null)return;
                    android.net.Network current=connectivityManager.getActiveNetwork();
                    updateNetworkState(validatedNetwork(connectivityManager.getNetworkCapabilities(current)));
                });
            }
            @Override public void onUnavailable(){runOnUiThread(()->updateNetworkState(false));}
        };
        try{connectivityManager.registerDefaultNetworkCallback(networkCallback);}
        catch(RuntimeException failure){
            networkCallback=null;connectivityManager=null;networkValidated=false;return;
        }
        try{
            android.net.Network current=connectivityManager.getActiveNetwork();
            networkValidated=validatedNetwork(connectivityManager.getNetworkCapabilities(current));
        }catch(RuntimeException ignored){networkValidated=false;}
    }
    private void stopNetworkWatch(){
        cancelNetworkRetry();
        if(connectivityManager!=null&&networkCallback!=null){
            try{connectivityManager.unregisterNetworkCallback(networkCallback);}catch(RuntimeException ignored){}
        }
        networkCallback=null;connectivityManager=null;networkValidated=false;
    }
    private void signalMemoryPressure(WebView target,int level){
        if(target==null||!own(target.getUrl()))return;
        target.evaluateJavascript(\"try{window.dispatchEvent(new CustomEvent('mm45:memory-pressure',{detail:{level:\"+level+\"}}))}catch(e){}\",null);
    }
    private void releaseMediaForMemory(int level){
        int safe=Math.max(0,level);
        signalMemoryPressure(web,safe);
        for(WebView cached:retained.values())signalMemoryPressure(cached,safe);
    }
    private void clearOffline(){if(offline!=null){frame.removeView(offline);offline=null;}}"""
replace(main, fields_anchor, fields_replacement)

replace(main,
"""    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
    }""",
"""    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;networkFailureStreak=0;recoverySequence++;cancelNetworkRetry();
        cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
    }""")

replace(main,
"""    private void recoverPage(){
        long now=SystemClock.uptimeMillis();if(now-lastReloadAt<600)return;lastReloadAt=now;
        String retry=tab==MARKET&&(BASE+\"/index.html\").equals(lastUrl)?BASE+paths[MARKET]:lastUrl;
        open(Recovery414.safeRetry(retry,BASE+paths[tab]));
    }""",
"""    private void recoverPage(){recoverPage(false);}
    private void recoverPage(boolean automatic){
        long now=SystemClock.uptimeMillis(),minimum=automatic?2500L:900L;
        if(now-lastReloadAt<minimum)return;
        if(automatic&&(!networkValidated||!recoverableFailure(failureCode)))return;
        lastReloadAt=now;recoverySequence++;cancelNetworkRetry();
        String retry=tab==MARKET&&(BASE+\"/index.html\").equals(lastUrl)?BASE+paths[MARKET]:lastUrl;
        open(Recovery414.safeRetry(retry,BASE+paths[tab]));
    }""")

replace(main,
"""    private void showFailure(String code,String message){
        endLaunchAnimation(false,\"connection-error\");cancelPageWait();
        if(destroyed)return;mainFailed=true;failureCode=code;failureNote=message;progress.setVisibility(View.GONE);clearOffline();
        LinearLayout box=column();box.setGravity(Gravity.CENTER);box.setPadding(dp(24),dp(18),dp(24),dp(18));box.setBackground(DepthStyle423.screen(this,true));
        ImageView brand=new ImageView(this);brand.setImageResource(R.drawable.mm_brand_logo);brand.setScaleType(ImageView.ScaleType.FIT_CENTER);brand.setContentDescription(\"MarketMarney\");box.addView(brand,new LinearLayout.LayoutParams(dp(112),dp(112)));
        TextView badge=text(\"MARKETMARNEY / \"+labels[tab].toUpperCase(java.util.Locale.ROOT),11,GOLD);badge.setGravity(Gravity.CENTER);box.addView(badge);
        TextView title=text(\"Halaman belum tersedia\",22,TEXT);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);box.addView(title);
        TextView note=text(message,14,MUTED);note.setGravity(Gravity.CENTER);LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(-1,-2);np.topMargin=dp(14);np.bottomMargin=dp(14);box.addView(note,np);
        Button retry=new Button(this);retry.setText(\"Coba lagi\");retry.setAllCaps(false);DepthStyle423.applyButton(retry,true,true);retry.setOnClickListener(v->recoverPage());box.addView(retry,new LinearLayout.LayoutParams(-1,dp(48)));
        Button home=new Button(this);home.setText(\"Kembali ke \"+labels[tab]);home.setAllCaps(false);DepthStyle423.applyButton(home,true,false);home.setOnClickListener(v->navigate(tab));box.addView(home,new LinearLayout.LayoutParams(-1,dp(48)));
        TextView help=text(\"Info koneksi · \"+code,12,MUTED);help.setGravity(Gravity.CENTER);help.setPadding(0,dp(12),0,dp(12));help.setOnClickListener(v->showAppReport());box.addView(help);
        android.widget.ScrollView scroll=new android.widget.ScrollView(this);scroll.setFillViewport(true);scroll.setBackground(DepthStyle423.screen(this,true));scroll.addView(box,new android.widget.ScrollView.LayoutParams(-1,-1));
        offline=scroll;frame.addView(offline,new FrameLayout.LayoutParams(-1,-1));
    }""",
"""    private void showFailure(String code,String message){
        endLaunchAnimation(false,\"connection-error\");cancelPageWait();
        if(destroyed)return;
        boolean networkFailure=recoverableFailure(code);
        networkFailureStreak=networkFailure?Math.min(5,networkFailureStreak+1):0;
        recoverySequence++;cancelNetworkRetry();
        mainFailed=true;failureCode=code;failureNote=message;progress.setVisibility(View.GONE);clearOffline();
        LinearLayout box=column();box.setGravity(Gravity.CENTER);box.setPadding(dp(24),dp(18),dp(24),dp(18));box.setBackground(DepthStyle423.screen(this,true));
        ImageView brand=new ImageView(this);brand.setImageResource(R.drawable.mm_brand_logo);brand.setScaleType(ImageView.ScaleType.FIT_CENTER);brand.setContentDescription(\"MarketMarney\");box.addView(brand,new LinearLayout.LayoutParams(dp(112),dp(112)));
        TextView badge=text(\"MARKETMARNEY / \"+labels[tab].toUpperCase(java.util.Locale.ROOT),11,GOLD);badge.setGravity(Gravity.CENTER);box.addView(badge);
        TextView title=text(\"Halaman belum tersedia\",22,TEXT);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);box.addView(title);
        TextView note=text(message,14,MUTED);note.setGravity(Gravity.CENTER);LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(-1,-2);np.topMargin=dp(14);np.bottomMargin=dp(14);box.addView(note,np);
        Button retry=new Button(this);retry.setText(\"Coba lagi\");retry.setAllCaps(false);DepthStyle423.applyButton(retry,true,true);retry.setOnClickListener(v->recoverPage());box.addView(retry,new LinearLayout.LayoutParams(-1,dp(48)));
        Button home=new Button(this);home.setText(\"Kembali ke \"+labels[tab]);home.setAllCaps(false);DepthStyle423.applyButton(home,true,false);home.setOnClickListener(v->navigate(tab));box.addView(home,new LinearLayout.LayoutParams(-1,dp(48)));
        TextView help=text(\"Info koneksi · \"+code,12,MUTED);help.setGravity(Gravity.CENTER);help.setPadding(0,dp(12),0,dp(12));help.setOnClickListener(v->showAppReport());box.addView(help);
        android.widget.ScrollView scroll=new android.widget.ScrollView(this);scroll.setFillViewport(true);scroll.setBackground(DepthStyle423.screen(this,true));scroll.addView(box,new android.widget.ScrollView.LayoutParams(-1,-1));
        offline=scroll;frame.addView(offline,new FrameLayout.LayoutParams(-1,-1));
        if(networkFailure)scheduleNetworkRetry();
    }""")

replace(main,
"""    private void open(String url){if(web==null||!own(url))return;navigationSequence++;pendingIndexTab=-1;beginPageWait(web);lastUrl=url;if(offline!=null){frame.removeView(offline);offline=null;}web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);}""",
"""    private void open(String url){if(web==null||!own(url))return;navigationSequence++;recoverySequence++;cancelNetworkRetry();pendingIndexTab=-1;beginPageWait(web);lastUrl=url;if(offline!=null){frame.removeView(offline);offline=null;}web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);}""")

replace(main,
"""                if(v!=web)return;lastAdaptedDocument=\"\";if(pendingIndexTab!=-1){navigationSequence++;pendingIndexTab=-1;}if(fileOwner==v)finishFileSelection(null);clearOffline();beginPageWait(v);progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;""",
"""                if(v!=web)return;lastAdaptedDocument=\"\";recoverySequence++;cancelNetworkRetry();if(pendingIndexTab!=-1){navigationSequence++;pendingIndexTab=-1;}if(fileOwner==v)finishFileSelection(null);clearOffline();beginPageWait(v);progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;""")

replace(main,
        '        appResources=AppResources49.install(getApplicationContext());\n        google=new AndroidGoogleLogin',
        '        appResources=AppResources49.install(getApplicationContext());startNetworkWatch();\n        google=new AndroidGoogleLogin')

replace(main,
"""    @Override protected void onPause(){
        cancelPageWait();if(launchOverlay!=null)launchOverlay.dispose();
        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript(\"try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}\",null);if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        super.onPause();
    }""",
"""    @Override protected void onPause(){
        activityResumed=false;cancelNetworkRetry();cancelPageWait();if(launchOverlay!=null)launchOverlay.dispose();
        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript(\"try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}\",null);if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        super.onPause();
    }""")

replace(main,
"""    @Override protected void onResume(){super.onResume();if(web!=null)resumePage(web);}""",
"""    @Override protected void onResume(){super.onResume();activityResumed=true;if(web!=null)resumePage(web);scheduleNetworkRetry();}""")

replace(main,
"""    @Override public void onTrimMemory(int level){super.onTrimMemory(level);if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)dropRetained();}
    @Override protected void onDestroy(){destroyed=true;if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}""",
"""    @Override public void onTrimMemory(int level){
        super.onTrimMemory(level);releaseMediaForMemory(level);
        if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)dropRetained();
    }
    @Override public void onLowMemory(){super.onLowMemory();releaseMediaForMemory(android.content.ComponentCallbacks2.TRIM_MEMORY_COMPLETE);dropRetained();}
    @Override protected void onDestroy(){destroyed=true;stopNetworkWatch();if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}""")

# Reels controllers immediately release offscreen sources when Android reports
# memory pressure, and release every source once the activity moves to background.
listener_old = """function connectionChanged(){networkType=String(conn.effectiveType||'').toLowerCase();fastNetwork=!conservative&&!/^(slow-)?2g$/.test(networkType);budget();}
feed.addEventListener('scroll',scrollFallback,{passive:true});window.addEventListener('mm45:suspend',onSuspend);window.addEventListener('mm45:resume',onResume);document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',keys);window.addEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.addEventListener('resize',dimensions);if(conn&&conn.addEventListener)conn.addEventListener('change',connectionChanged);"""
listener_new = """function memoryPressure(event){var level=Number(event&&event.detail&&event.detail.level||0);pauseAll();cards.forEach(function(c){var st=states.get(c);if(!st)return;if(c===active&&level<40)attach(st,'metadata','low');else release(st);});}
function connectionChanged(){networkType=String(conn.effectiveType||'').toLowerCase();fastNetwork=!conservative&&!/^(slow-)?2g$/.test(networkType);budget();}
feed.addEventListener('scroll',scrollFallback,{passive:true});window.addEventListener('mm45:suspend',onSuspend);window.addEventListener('mm45:resume',onResume);window.addEventListener('mm45:memory-pressure',memoryPressure);document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',keys);window.addEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.addEventListener('resize',dimensions);if(conn&&conn.addEventListener)conn.addEventListener('change',connectionChanged);"""
destroy_old = """function destroy(){disposed=true;pauseAll();cards.forEach(function(c){release(states.get(c));});feedObserver.disconnect();modeObserver.disconnect();dialogObserver.disconnect();if(intersection)intersection.disconnect();clearTimeout(scrollTimer);window.removeEventListener('mm45:suspend',onSuspend);window.removeEventListener('mm45:resume',onResume);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keys);window.removeEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.removeEventListener('resize',dimensions);if(conn&&conn.removeEventListener)conn.removeEventListener('change',connectionChanged);}"""
destroy_new = """function destroy(){disposed=true;pauseAll();cards.forEach(function(c){release(states.get(c));});feedObserver.disconnect();modeObserver.disconnect();dialogObserver.disconnect();if(intersection)intersection.disconnect();clearTimeout(scrollTimer);window.removeEventListener('mm45:suspend',onSuspend);window.removeEventListener('mm45:resume',onResume);window.removeEventListener('mm45:memory-pressure',memoryPressure);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keys);window.removeEventListener('resize',dimensions);if(window.visualViewport)window.visualViewport.removeEventListener('resize',dimensions);if(conn&&conn.removeEventListener)conn.removeEventListener('change',connectionChanged);}"""
for relative in [
    'app/src/main/assets/reels46.js',
    'app/src/main/assets/social411/app.js',
    'app/src/main/assets/social411/bundle427.js',
]:
    replace(relative, listener_old, listener_new)
    replace(relative, destroy_old, destroy_new)

new_test = root / 'app/src/androidTest/java/com/marketmarney/mobile/Stability435Test.java'
new_test.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(base / 'Stability435Test.java', new_test)
shutil.copy2(base / 'Marney435-Panduan.md', root / 'README-MULAI-DISINI.md')

after = inventory()
changed = sorted(
    set(before) ^ set(after)
    | {path for path in set(before) & set(after) if before[path] != after[path]}
)
expected = {
    'README-MULAI-DISINI.md',
    'app/build.gradle',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java',
    'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/values/strings.xml',
    'app/src/main/assets/reels46.js',
    'app/src/main/assets/social411/app.js',
    'app/src/main/assets/social411/bundle427.js',
    'app/src/androidTest/java/com/marketmarney/mobile/Stability435Test.java',
}
expected.update(version_tests)
assert changed == sorted(expected), {
    'unexpected': sorted(set(changed) - expected),
    'missing': sorted(expected - set(changed)),
}

manifest = {
    'release': '4.35.0-beta',
    'package': 'com.marketmarney.mobile.beta435',
    'baseRelease': '4.34.0-beta',
    'purpose': (
        'Add connectivity-aware bounded auto-recovery, cancel stale retries across '
        'navigation and lifecycle changes, and release offscreen Reel buffers when '
        'Android reports memory pressure without changing the public website or database.'
    ),
    'changed': [
        {
            'path': relative,
            'beforeSha256': before.get(relative),
            'afterSha256': after.get(relative),
        }
        for relative in changed
    ],
    'preserved': {
        relative: sha
        for relative, sha in sorted(before.items())
        if relative not in changed
    },
}
Path('verified435.json').write_text(
    json.dumps(manifest, indent=2) + '\n', encoding='utf-8'
)
print(
    f"Verified 4.35 stability patch: {len(changed)} changed files; "
    f"{len(manifest['preserved'])} unchanged files."
)
