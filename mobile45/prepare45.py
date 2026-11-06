"""App-only v4.5. Apply to the assembled v4.4 source, never to Railway."""
from pathlib import Path
import re,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
p=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
s=p.read_text()
def once(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a))
 s=s.replace(a,b,1)
once('import java.util.Map;','import java.util.Map;\nimport java.util.LinkedHashMap;\nimport android.os.SystemClock;\nimport android.util.Log;')
once('    private WebView web;','''    private WebView web;
    // At most one inactive page plus the current page: no unbounded WebView cache.
    private final LinkedHashMap<Integer,WebView> retained = new LinkedHashMap<>();
    private long navigationStarted;
    private void discardView(WebView v){
        if(v==null)return;
        v.stopLoading();v.setWebChromeClient(null);v.setWebViewClient(null);
        ViewGroup parent=(ViewGroup)v.getParent();if(parent!=null)parent.removeView(v);
        v.destroy();
    }
    private void dropRetained(){for(WebView v:retained.values())discardView(v);retained.clear();}
    private boolean canRetain(){
        if(web==null||offline!=null||fileCallback!=null||fullVideo!=null||web.getProgress()<100||!own(web.getUrl()))return false;
        Uri current=Uri.parse(web.getUrl()), expected=Uri.parse(BASE+paths[tab]);
        // Do not keep account, auth, article or other transient/private subpages.
        return expected.getPath().equals(current.getPath());
    }
    private void suspendPage(WebView v){
        if(own(v.getUrl()))v.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(m){m.pause()})}catch(e){}",null);
        v.onPause();v.setVisibility(View.GONE);
    }
    private void resumePage(WebView v){
        v.setVisibility(View.VISIBLE);v.onResume();
        if(own(v.getUrl()))v.evaluateJavascript("try{window.__mm45Suspended=false;window.dispatchEvent(new Event('mm45:resume'))}catch(e){}",null);
    }''')
once('    private void navigate(int selected){tab=selected;updateSocialChrome();drawTabs();disposeWeb();createWeb();open(BASE+paths[tab]);}', '''    private void navigate(int selected){
        if(selected<0||selected>3||destroyed)return;
        navigationStarted=SystemClock.uptimeMillis();
        WebView cached=retained.remove(selected);
        if(canRetain()){
            WebView previous=web;web=null;suspendPage(previous);frame.removeView(previous);
            WebView replaced=retained.put(tab,previous);if(replaced!=null&&replaced!=previous)discardView(replaced);
            while(retained.size()>1){Integer key=retained.keySet().iterator().next();discardView(retained.remove(key));}
        }else disposeWeb();
        tab=selected;updateSocialChrome();drawTabs();
        if(cached!=null){
            web=cached;frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);
            progress.setVisibility(View.GONE);
            Log.i("MM45_NAV","warm tab="+tab+" ms="+(SystemClock.uptimeMillis()-navigationStarted));
        }else{createWeb();open(BASE+paths[tab]);Log.i("MM45_NAV","cold tab="+tab);}
    }''')
once('@Override public void onSignedIn(String username){if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}', '@Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}')
once('@Override public void onSignedOut(){if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}', '@Override public void onSignedOut(){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}')
once('@Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;}', '''@Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){
                if(own(url)){String p=Uri.parse(url).getPath();if("/akun.html".equals(p)||p!=null&&p.startsWith("/api/auth/"))dropRetained();}
                if(v!=web)return;progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;
            }''')
once('@Override public void onPageFinished(WebView v,String url){progress.setVisibility(View.GONE);adapt(v,url);CookieManager.getInstance().flush();}', '@Override public void onPageFinished(WebView v,String url){if(v!=web)return;progress.setVisibility(View.GONE);adapt(v,url);CookieManager.getInstance().flush();}')
once('if(r.isForMainFrame())showOffline(', 'if(v==web&&r.isForMainFrame())showOffline(')
once('if(r.isForMainFrame()&&response.getStatusCode()>=400)showOffline(', 'if(v==web&&r.isForMainFrame()&&response.getStatusCode()>=400)showOffline(')
once('handler.cancel();showOffline(', 'handler.cancel();if(v==web)showOffline(')
once('@Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){disposeWeb();createWeb();showOffline("Tampilan perlu dimuat ulang.");return true;}', '''@Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){
                if(v==web){dropRetained();disposeWeb();createWeb();showOffline("Tampilan perlu dimuat ulang.");}
                else{retained.values().remove(v);discardView(v);}return true;
            }''')
once('@Override public void onProgressChanged(WebView v,int n){progress.setProgress(n);progress.setVisibility(n==100?View.GONE:View.VISIBLE);}', '@Override public void onProgressChanged(WebView v,int n){if(v!=web)return;progress.setProgress(n);progress.setVisibility(n==100?View.GONE:View.VISIBLE);}')
# Avoid re-applying the same style on both commit and finish.
once("s.textContent=\"+JSONObject.quote(socialCss)+\";})()", "if(s.dataset.revision!=='45'){s.textContent=\"+JSONObject.quote(socialCss)+\";s.dataset.revision='45';}})()")
once('@Override protected void onDestroy(){destroyed=true;closeFullVideo();disposeWeb();if(google!=null)google.close();super.onDestroy();}', '''@Override public void onTrimMemory(int level){super.onTrimMemory(level);if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)dropRetained();}
    @Override protected void onDestroy(){destroyed=true;closeFullVideo();dropRetained();disposeWeb();if(google!=null)google.close();super.onDestroy();}''')
s=s.replace('MarketMarneyAndroid/4.4 AppShell','MarketMarneyAndroid/4.5 AppShell').replace("version:'4.4'","version:'4.5'").replace("dataset.mmAndroid='44'","dataset.mmAndroid='45'")
p.write_text(s)
p=base/'app/src/main/assets/social44.js';j=p.read_text()
old='messages:\'<path d="m21 3-6 18-4-8-8-4zM11 13 21 3"/>\''
new='messages:\'<path d="M6 4h12l3 3v9l-3 3h-6l-5 3v-3H6l-3-3V7z"/><path d="M7.5 13V9l4.5 3 4.5-3v4"/><path d="M8 16h8" class="mm45-accent"/>\',notice:\'<path d="M7 10c0-3 2-5 5-5s5 2 5 5v4l2 3H5l2-3zM10 20h4M12 2v2"/><path d="M9 12h2l1-2 1 4 1-2h1" class="mm45-accent"/>\''
assert old in j;j=j.replace(old,new,1)
assert 'svg.innerHTML=paths.heart' in j;j=j.replace('svg.innerHTML=paths.heart','svg.innerHTML=paths.notice',1)
anchor="row.append(button('Menu Social Marney'";idx=j.index(anchor)
j=j[:idx]+"var originalMessenger=$('shMessengerButton');if(originalMessenger){var msgSvg=originalMessenger.querySelector('svg');if(msgSvg)msgSvg.innerHTML=paths.messages;}\n "+j[idx:]
old="var pending=false,obs=new MutationObserver(function(){if(pending)return;pending=true;requestAnimationFrame(function(){pending=false;decorate();});});"
new="""var pending=false,obs=new MutationObserver(function(records){
  var addedPost=records.some(function(r){return Array.from(r.addedNodes).some(function(n){return n.nodeType===1&&(n.matches('.sh-post:not([data-mm44-card])')||n.querySelector('.sh-post:not([data-mm44-card])'));});});
  if(!addedPost||pending)return;pending=true;requestAnimationFrame(function(){pending=false;decorate();});
 });"""
assert old in j;j=j.replace(old,new,1)
perf="""
function installMediaPolicy(){
 if(window.__mm45Media)return;window.__mm45Media=true;
 var watched=new WeakSet(),queue=[],scheduled=false;
 var observer=typeof IntersectionObserver==='function'?new IntersectionObserver(function(entries){entries.forEach(function(e){if(!e.isIntersecting&&!e.target.paused)e.target.pause();});},{threshold:0.01}):null;
 function scan(root){
  if(!root||root.nodeType!==1)return;
  var media=[];if(root.matches('img,video'))media.push(root);
  root.querySelectorAll('img,video').forEach(function(m){media.push(m);});
  media.forEach(function(m){if(watched.has(m))return;watched.add(m);
   if(m.tagName==='IMG'){if(!m.hasAttribute('loading'))m.loading='lazy';m.decoding='async';}
   else{m.preload='none';m.setAttribute('loading','lazy');m.playsInline=true;if(observer)observer.observe(m);}
  });
 }
 function flush(){scheduled=false;var items=queue.splice(0,24);items.forEach(scan);if(queue.length)schedule();}
 function schedule(){if(scheduled)return;scheduled=true;setTimeout(flush,32);}
 var obs=new MutationObserver(function(records){records.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType===1)queue.push(n);});});if(queue.length)schedule();});
 function pause(){document.querySelectorAll('video,audio').forEach(function(v){v.pause();});}
 scan(document.body);obs.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('mm45:suspend',pause);
 document.addEventListener('visibilitychange',function(){if(document.hidden)pause();});
 window.addEventListener('pagehide',function(){obs.disconnect();if(observer)observer.disconnect();queue=[];window.removeEventListener('mm45:suspend',pause);},{once:true});
}
"""
j=j.replace('function mountProfile(){',perf+'\nfunction mountProfile(){',1)
j=j.replace('forceLight();H.dataset.mm44Page=', 'forceLight();installMediaPolicy();H.dataset.mm44Page=')
p.write_text(j)
p=base/'app/src/main/assets/social44.css';css=p.read_text()+'''\n/* Marney 4.5: geometric Dialogue-M and Pulse alerts. */
html[data-mm44-social] .mm45-accent{stroke:#b67a0b;stroke-width:1.65}
html[data-mm44-social] .mm44-nav-button[aria-label="Pesan"][aria-pressed="true"]{color:#8a5907!important;background:#fff6df!important;border-radius:13px}
html[data-mm44-social] #shNotificationBell{border-radius:12px!important;background:#fff8e7!important}
html[data-mm44-social] .mm44-nav-button,html[data-mm44-social] #shNotificationBell{touch-action:manipulation}
''';p.write_text(css)
p=base/'app/build.gradle';g=p.read_text();g=re.sub(r"applicationId '[^']+'","applicationId 'com.marketmarney.mobile.beta45'",g);g=re.sub(r'versionCode \d+','versionCode 9',g);g=re.sub(r"versionName '[^']+'","versionName '4.5.0-beta'",g);p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';v=p.read_text();p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Social Marney 4.5 Beta',v))
assert 'labels={"Beranda","Berita","Market Live","Social Marney"}' in s
assert 'addJavascriptInterface' not in s and 'handler.cancel()' in s
assert 'while(retained.size()>1)' in s
assert "svg.innerHTML=paths.heart" not in j and 'paths.notice' in j
print('PASS: own icons, bounded warm tabs, idempotent CSS and lazy media; no backend changes')
