package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayInputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

/** Actual bottom-tab interactions; the document and all subsequent requests are local fixtures. */
@SdkSuppress(minSdkVersion=26)
public class SharedHome420Test {
    private static final String BASE="https://marketmarney.com",ROOT=BASE+"/index.html";
    private static final int HOME=0,MARKET=3;
    private Instrumentation inst;
    private MainActivity activity;
    private final AtomicInteger documents=new AtomicInteger(),finishedDocuments=new AtomicInteger(),writes=new AtomicInteger();
    private volatile boolean supportedNavigation=true;

    private Object field(String name){
        try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}
        catch(Exception e){throw new RuntimeException(e);}
    }
    private void ui(Runnable action){inst.runOnMainSync(action);}
    private interface Check { boolean ready(); }
    private void until(String message,Check check){
        long end=SystemClock.uptimeMillis()+8000;
        while(SystemClock.uptimeMillis()<end){
            boolean[] ready={false};ui(()->ready[0]=check.ready());if(ready[0])return;
            SystemClock.sleep(80);
        }
        boolean[] ready={false};ui(()->ready[0]=check.ready());assertTrue(message,ready[0]);
    }
    private WebView current(){WebView[] value={null};ui(()->value[0]=(WebView)field("web"));return value[0];}
    private String js(WebView target,String expression)throws Exception{
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        ui(()->target.evaluateJavascript("(function(){return ("+expression+");})()",r->{value.set(r);done.countDown();}));
        assertTrue("JavaScript callback completed",done.await(4,TimeUnit.SECONDS));return value.get();
    }
    private void clickTab(int tab){
        ui(()->assertTrue("Native tab accepts click",((LinearLayout)field("bottom")).getChildAt(tab).performClick()));
    }
    private void selected(int tab){
        ui(()->{
            assertEquals("Native destination",tab,((Integer)field("tab")).intValue());
            LinearLayout bottom=(LinearLayout)field("bottom");
            for(int i=0;i<bottom.getChildCount();i++)assertEquals("Selected tab "+i,i==tab,bottom.getChildAt(i).isSelected());
        });
    }
    private String document(){
        String nav=supportedNavigation
            ?"<nav id='nav'><button data-page='Beranda' class='active'>Beranda</button><button data-page='Market Live'>Market Live</button></nav>"
            :"<nav id='nav'><span>Unsupported navigation fixture</span></nav>";
        return "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head><body>"+nav+
            "<main><h1 id='fixturePage'>Beranda</h1></main><script>"+
            "window.marker='shared-home-'+Date.now()+'-'+Math.random();"+
            "var buttons=document.querySelectorAll('#nav button[data-page]');"+
            "for(var i=0;i<buttons.length;i++){buttons[i].onclick=function(){"+
            "for(var j=0;j<buttons.length;j++){buttons[j].className='';}"+
            "this.className='active';document.getElementById('fixturePage').textContent=this.getAttribute('data-page');};}"+
            "</script></body></html>";
    }
    private WebResourceResponse reply(int status,String mime,String content){
        Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-store");
        headers.put("Content-Security-Policy","default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'");
        return new WebResourceResponse(mime,"UTF-8",status,status==200?"OK":"Fixture blocked",headers,new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
    }
    private void wrap(WebView target){
        WebViewClient delegate=target.getWebViewClient();
        if(delegate instanceof FixtureClient)return;
        assertNotNull("Native WebViewClient is installed before attachment",delegate);
        target.setWebViewClient(new FixtureClient(delegate));
    }
    private final class FixtureClient extends WebViewClient {
        private final WebViewClient delegate;
        FixtureClient(WebViewClient delegate){this.delegate=delegate;}
        @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
            if(!"GET".equals(request.getMethod())&&!"HEAD".equals(request.getMethod())){
                writes.incrementAndGet();return reply(405,"text/plain","No writes in fixture");
            }
            Uri uri=request.getUrl();
            if(request.isForMainFrame()&&Recovery414.trusted(uri.toString())&&"/index.html".equals(uri.getPath())&&uri.getQuery()==null){
                documents.incrementAndGet();return reply(200,"text/html",document());
            }
            WebResourceResponse local=delegate.shouldInterceptRequest(view,request);
            return local!=null?local:reply(404,"text/plain","");
        }
        @Override public WebResourceResponse shouldInterceptRequest(WebView view,String url){return reply(404,"text/plain","");}
        @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return delegate.shouldOverrideUrlLoading(view,request);}
        @Override public boolean shouldOverrideUrlLoading(WebView view,String url){return delegate.shouldOverrideUrlLoading(view,url);}
        @Override public void onPageStarted(WebView view,String url,Bitmap favicon){delegate.onPageStarted(view,url,favicon);}
        @Override public void onPageCommitVisible(WebView view,String url){delegate.onPageCommitVisible(view,url);}
        @Override public void onPageFinished(WebView view,String url){
            delegate.onPageFinished(view,url);Uri uri=Uri.parse(url);
            if(Recovery414.trusted(url)&&"/index.html".equals(uri.getPath())&&uri.getQuery()==null)finishedDocuments.incrementAndGet();
        }
        @Override public void doUpdateVisitedHistory(WebView view,String url,boolean reload){delegate.doUpdateVisitedHistory(view,url,reload);}
        @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){delegate.onReceivedError(view,request,error);}
        @Override public void onReceivedError(WebView view,int code,String description,String failingUrl){delegate.onReceivedError(view,code,description,failingUrl);}
        @Override public void onReceivedHttpError(WebView view,WebResourceRequest request,WebResourceResponse response){delegate.onReceivedHttpError(view,request,response);}
        @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,android.net.http.SslError error){delegate.onReceivedSslError(view,handler,error);}
        @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){return delegate.onRenderProcessGone(view,detail);}
    }
    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        // NEWS is already a bundled document, avoiding a live Home request before the fixture is attached.
        activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
        ui(()->{
            StartupOverlay overlay=(StartupOverlay)field("launchOverlay");if(overlay!=null)overlay.dispose();
            WebView initial=(WebView)field("web");initial.stopLoading();wrap(initial);
            // createWeb attaches its view after installing the native client, but before open/loadUrl.
            // The cold fallback is therefore also intercepted before it can contact the site.
            ((FrameLayout)field("frame")).setOnHierarchyChangeListener(new ViewGroup.OnHierarchyChangeListener(){
                @Override public void onChildViewAdded(View parent,View child){if(child instanceof WebView)wrap((WebView)child);}
                @Override public void onChildViewRemoved(View parent,View child){}
            });
        });
    }
    @After public void cleanup(){if(activity!=null)ui(()->{((FrameLayout)field("frame")).setOnHierarchyChangeListener(null);activity.finish();});}
    private WebView loadedHome(boolean navigation)throws Exception{
        supportedNavigation=navigation;clickTab(HOME);
        until("Exact Home root fully loaded",()->{
            WebView view=(WebView)field("web");
            return ((Integer)field("tab"))==HOME&&view!=null&&ROOT.equals(view.getUrl())&&view.getProgress()==100&&documents.get()==1&&finishedDocuments.get()>=1;
        });
        WebView home=current();assertEquals("Fixture is complete","true",js(home,"document.readyState==='complete' && typeof window.marker==='string'"));
        selected(HOME);return home;
    }
    @Test public void homeMarketHomeUsesActualRouterWithoutReload()throws Exception{
        WebView home=loadedHome(true);String marker=js(home,"window.marker");
        assertEquals(JSONObject.quote("Beranda"),js(home,"document.getElementById('fixturePage').textContent"));
        clickTab(MARKET);until("Market callback completes",()->((Integer)field("tab"))==MARKET);
        assertSame("Active Home WebView is reused",home,current());selected(MARKET);
        assertEquals(JSONObject.quote("Market Live"),js(home,"document.getElementById('fixturePage').textContent"));
        assertEquals("true",js(home,"document.querySelector('#nav button[data-page=\"Market Live\"]').classList.contains('active')"));
        assertEquals("Document marker survives Market",marker,js(home,"window.marker"));
        Bundle saved=new Bundle();ui(()->activity.onSaveInstanceState(saved));
        assertEquals("Saved destination remains Market",MARKET,saved.getInt("selectedTab",-1));
        assertFalse("Shared Market must cold-restore its destination, not canonical Home history",saved.containsKey("webHistory"));
        clickTab(HOME);until("Home callback completes",()->((Integer)field("tab"))==HOME);
        assertSame("Active Market WebView is reused",home,current());selected(HOME);
        assertEquals(JSONObject.quote("Beranda"),js(home,"document.getElementById('fixturePage').textContent"));
        assertEquals("true",js(home,"document.querySelector('#nav button[data-page=\"Beranda\"]').classList.contains('active')"));
        assertEquals("Document marker survives Home",marker,js(home,"window.marker"));
        assertEquals("Router must not manufacture a hash",JSONObject.quote(ROOT),js(home,"location.href"));
        assertEquals("Only the initial document was requested",1,documents.get());
        assertEquals("No mutation requests",0,writes.get());
    }
    @Test public void unsupportedNavigationFallsBackToNewTargetWebView()throws Exception{
        WebView home=loadedHome(false);String[] target={null};ui(()->target[0]=BASE+((String[])field("paths"))[MARKET]);
        clickTab(MARKET);
        until("Missing router triggers the cold destination",()->field("web")!=home&&((Integer)field("tab"))==MARKET&&target[0].equals(field("lastUrl")));
        WebView replacement=current();assertNotSame("Unsupported router cannot leave the old view active",home,replacement);selected(MARKET);
        until("Cold destination is intercepted and ready",()->replacement.getProgress()==100&&target[0].equals(replacement.getUrl())&&documents.get()==2&&finishedDocuments.get()>=2);
        ui(()->assertEquals("Cold navigation records the requested target",target[0],field("lastUrl")));
        assertEquals("Cold fallback performed one new document request",2,documents.get());
        assertEquals("No mutation requests",0,writes.get());
    }
}
