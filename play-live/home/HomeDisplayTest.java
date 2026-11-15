package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.widget.Button;
import android.widget.TextView;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.graphics.Bitmap;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public final class HomeDisplayTest {
    @org.junit.Rule public final org.junit.rules.Timeout testTimeout=org.junit.rules.Timeout.seconds(60);
    private Instrumentation inst;
    private MainActivity activity;
    private WebView web;
    private static final String HOME = "https://marketmarney.com/index.html";
    @Before public void start() throws Exception {
        inst=InstrumentationRegistry.getInstrumentation();
        Intent open=new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
        activity=(MainActivity)inst.startActivitySync(open);
        web=(WebView)field("web");
    }
    @After public void finish(){
        if(activity!=null)inst.runOnMainSync(activity::finish);
    }
    private Object field(String name){
        try{
            Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);
        }catch(Exception e){throw new AssertionError(e);}
    }
    private HomeNewsView home(){return (HomeNewsView)field("homeNewsView");}
    private void invoke(String name,Class<?>[] types,Object... args){
        try{
            Method m=MainActivity.class.getDeclaredMethod(name,types);m.setAccessible(true);m.invoke(activity,args);
        }catch(Exception e){throw new AssertionError(e);}
    }
    private void document(String html){
        inst.runOnMainSync(()->{web.stopLoading();web.loadDataWithBaseURL(HOME,html,"text/html","UTF-8",HOME);});
    }
    private void httpsDocument(String html){
        inst.runOnMainSync(()->{
            web.stopLoading();
            WebViewClient delegate=web.getWebViewClient();
            web.setWebViewClient(new WebViewClient(){
                @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                    if(!request.isForMainFrame()||!HOME.equals(request.getUrl().toString()))
                        return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));
                    return new WebResourceResponse("text/html","UTF-8",new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8)));
                }
                @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return delegate.shouldOverrideUrlLoading(v,r);}
                @Override public void onPageStarted(WebView v,String u,Bitmap icon){delegate.onPageStarted(v,u,icon);}
                @Override public void onPageCommitVisible(WebView v,String u){delegate.onPageCommitVisible(v,u);}
                @Override public void onPageFinished(WebView v,String u){delegate.onPageFinished(v,u);}
                @Override public void doUpdateVisitedHistory(WebView v,String u,boolean reload){delegate.doUpdateVisitedHistory(v,u,reload);}
            });
            web.loadUrl(HOME);
        });
    }
    private String script(String js) throws Exception{
        AtomicReference<String> out=new AtomicReference<>();
        CountDownLatch done=new CountDownLatch(1);
        inst.runOnMainSync(()->web.evaluateJavascript(js,s->{out.set(s);done.countDown();}));
        assertTrue(done.await(5,TimeUnit.SECONDS));return out.get();
    }
    private Button waitForStory(){
        AtomicReference<Button> out=new AtomicReference<>();
        for(int i=0;i<160&&out.get()==null;i++){
            inst.runOnMainSync(()->{
                HomeNewsView h=home();
                Button b=h==null?null:h.findViewWithTag("home-headline");
                android.graphics.Rect r=new android.graphics.Rect();
                if(b!=null&&b.isShown()&&b.getGlobalVisibleRect(r)&&r.height()>10)out.set(b);
            });
            SystemClock.sleep(50);
        }
        assertNotNull("A real publisher headline must be visible",out.get());return out.get();
    }
    @Test public void blankHomeShowsReadablePublisherArticleAndWorksThroughFailureAndBack() throws Exception {
        document("<main id='app'></main>");
        Button b=waitForStory();
        assertTrue(b.getText().length()>12);
        String selected=b.getText().toString();
        inst.runOnMainSync(()->{
            invoke("showFailure",new Class<?>[]{String.class,String.class},"NETWORK","Koneksi uji");
            Button current=home().findViewWithTag("home-headline");
            assertEquals(selected,current.getText().toString());
            current.performClick();
            assertTrue(home().isReading());
            TextView body=home().findViewWithTag("home-story-body");
            assertTrue(body.isShown());assertTrue(body.getText().length()>100);
            assertTrue(home().goBack());assertFalse(home().isReading());
        });
    }
    @Test public void genuineWebHeadlineReplacesFallbackAndNavigationClearsNativeView() throws Exception{
        httpsDocument("<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>"
            +"<main id='app'><div id='headlineCarousel'><h2>Berita redaksi yang terlihat pada Beranda</h2></div></main>");
        long deadline=SystemClock.elapsedRealtime()+19000;
        boolean ready=false;
        String dom="";
        while(!ready&&SystemClock.elapsedRealtime()<deadline){
            dom=script("JSON.stringify([location.href,document.readyState,!!document.querySelector('#headlineCarousel h2')])");
            AtomicReference<Boolean> uncovered=new AtomicReference<>();
            inst.runOnMainSync(()->uncovered.set(home()==null && web.isShown()));
            ready=dom.contains("complete")&&dom.contains("true")&&uncovered.get();
            if(!ready)SystemClock.sleep(90);
        }
        assertTrue("SPA fixture headline did not take over. Document="+dom,ready);
    }
    @Test public void nativeReaderNeverCoversArticleDeepLinks() throws Exception{
        String html="<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'>"
                        +"<main id='app'><a id='fixtureLink' href='#artikel/qa-issued-deep-link'>Artikel</a>"
                        +"<article id='fixtureDetail' hidden>Isi artikel tujuan tautan uji.</article></main>"
                        +"<script>onhashchange=function(){document.getElementById('fixtureDetail').hidden=false;};</script>";
        httpsDocument(html);
        // Wait for the new HTTPS document rather than running the hash change in a
        // previous page while the native publisher bootstrap already has headlines.
        boolean installed=false;
        long deadline=SystemClock.elapsedRealtime()+12000;
        while(!installed && SystemClock.elapsedRealtime()<deadline){
            installed="true".equals(script("location.href==='https://marketmarney.com/index.html' && document.readyState==='complete' && !!document.getElementById('fixtureLink')"));
            if(!installed)SystemClock.sleep(60);
        }
        assertTrue("HTTPS link fixture committed before user navigation",installed);
        waitForStory();
        script("document.getElementById('fixtureLink').click()");
        boolean visible=false;
        deadline=SystemClock.elapsedRealtime()+12000;
        while(!visible && SystemClock.elapsedRealtime()<deadline){
            boolean route="true".equals(script("location.hash==='#artikel/qa-issued-deep-link' && !document.getElementById('fixtureDetail').hidden"));
            AtomicReference<Boolean> uncovered=new AtomicReference<>();
            inst.runOnMainSync(()->uncovered.set(home()==null && web.isShown()));
            visible=route&&uncovered.get();
            if(!visible)SystemClock.sleep(60);
        }
        assertTrue("Article route committed but remained covered; URL="+script("location.href"),visible);
    }

    @Test public void publishedFeedExcludesDraftsAndRetainsFullBodyAndPublicationDates() throws Exception {
        String fixture="{\"articles\":[{\"id\":\"1\",\"title\":\"Satu\",\"status\":\"draft\",\"body\":\"X\"},"
            +"{\"id\":\"2\",\"date\":\"2026-11-15\",\"title\":\"Dua\",\"body\":\"<p>Isi laporan</p>\"}]}";
        List<HomeNews.Story> rows=HomeNews.parse(fixture);
        assertEquals(1,rows.size());assertEquals("2",rows.get(0).id);assertEquals("Isi laporan",rows.get(0).body);
        assertTrue(HomeNews.parse("{\"articles\":[]}").isEmpty());
        String packaged=HomeNews.read(inst.getTargetContext().getAssets().open("home-edition.json"));
        assertFalse(HomeNews.parse(packaged).isEmpty());
    }
}
