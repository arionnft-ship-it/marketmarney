package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.widget.LinearLayout;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Social429FullscreenTest {
    private Instrumentation inst;
    private MainActivity activity;

    private Object field(String name) {
        try { Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity); }
        catch(Exception e){ throw new RuntimeException(e); }
    }
    private String asset(String name) throws Exception {
        try(InputStream in=inst.getTargetContext().getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");
        }
    }
    private String js(String code) throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        inst.runOnMainSync(()->((WebView)field("web")).evaluateJavascript(code,r->{value.set(r);done.countDown();}));
        assertTrue("JavaScript callback",done.await(6,TimeUnit.SECONDS));return value.get();
    }
    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        Intent i=new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",4);
        activity=(MainActivity)inst.startActivitySync(i);SystemClock.sleep(500);
        inst.runOnMainSync(()->{StartupOverlay overlay=(StartupOverlay)field("launchOverlay");if(overlay!=null)overlay.dispose();});
    }
    @After public void finish(){if(activity!=null)inst.runOnMainSync(()->activity.finish());}

    @Test public void socialDestinationStartsMediaAndHidesMarketNavigation(){
        final LinearLayout bottom=(LinearLayout)field("bottom");
        assertEquals(View.GONE,bottom.getVisibility());
        AtomicReference<String> url=new AtomicReference<>();
        for(int retry=0;retry<40;retry++){
            inst.runOnMainSync(()->url.set(((WebView)field("web")).getUrl()));
            if(url.get()!=null&&url.get().contains("/beranda-trader.html")&&url.get().contains("mm44-feed"))break;
            SystemClock.sleep(150);
        }
        assertNotNull(url.get());assertTrue(url.get(),url.get().contains("#mm44-feed"));
    }

    @Test public void socialPageUsesMediaMarneyAndBottomDock() throws Exception {
        String value="";
        for(int retry=0;retry<45;retry++){
            value=js("(function(){var n=document.querySelector('.mm44-nav');return JSON.stringify({shell:document.documentElement.dataset.mm429Social||'',media:!!document.querySelector('.mm44-nav-button[aria-label=\\\"Media\\\"]'),dock:n?getComputedStyle(n).position:''});})()");
            if(value.contains("429")&&value.contains("fixed"))break;
            SystemClock.sleep(120);
        }
        assertTrue(value,value.contains("429"));assertTrue(value,value.contains("\\\"media\\\":true"));assertTrue(value,value.contains("fixed"));
    }

    @Test public void leavingSocialRestoresFiveMarketDestinations() throws Exception {
        Method navigate=MainActivity.class.getDeclaredMethod("navigate",int.class);navigate.setAccessible(true);
        inst.runOnMainSync(()->{try{navigate.invoke(activity,0);}catch(Exception e){throw new RuntimeException(e);}});
        SystemClock.sleep(250);
        LinearLayout bottom=(LinearLayout)field("bottom");
        assertEquals(View.VISIBLE,bottom.getVisibility());assertEquals(5,bottom.getChildCount());
    }

    @Test public void appOnlyShellAssetsArePackaged() throws Exception {
        String css=asset("social429.css"),js=asset("social429.js");
        assertTrue(css.contains("--mm429-dock-h:68px"));
        assertTrue(css.contains("position:fixed!important"));
        assertTrue(css.contains("data-mm47-group"));
        assertTrue(js.contains("Media Marney"));
        assertTrue(js.contains("/beranda-trader.html#mm44-feed"));
        assertTrue(js.contains("profileDock"));
    }
}
