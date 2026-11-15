package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.widget.Button;
import android.widget.TextView;
import android.webkit.WebView;
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
        document("<meta name=viewport content='width=device-width,initial-scale=1'><main id='app'><div id='headlineCarousel'><h2>Berita redaksi yang terlihat pada Beranda</h2></div></main>");
        boolean ready=false;
        for(int i=0;i<120&&!ready;i++){
            ready="true".equals(script("!!document.querySelector('#headlineCarousel h2')"))&&home()==null;
            if(!ready)SystemClock.sleep(60);
        }
        assertTrue("SPA headline shown",ready);
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
