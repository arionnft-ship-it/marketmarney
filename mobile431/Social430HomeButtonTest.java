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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Social430HomeButtonTest {
    private Instrumentation inst;
    private MainActivity activity;

    private Object field(String name){
        try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}
        catch(Exception e){throw new RuntimeException(e);}
    }
    private String asset(String name)throws Exception{
        try(InputStream in=inst.getTargetContext().getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");
        }
    }
    private String js(String code)throws Exception{
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        inst.runOnMainSync(()->((WebView)field("web")).evaluateJavascript(code,r->{value.set(r);done.countDown();}));
        assertTrue("JavaScript callback",done.await(6,TimeUnit.SECONDS));return value.get();
    }
    private String waitForHomeControl()throws Exception{
        String state="";
        for(int retry=0;retry<60;retry++){
            state=js("(function(){var b=document.querySelector('.mm430-home-button');return JSON.stringify({ready:document.documentElement.dataset.mm430Home||'',label:b?b.getAttribute('aria-label'):'',text:b?b.textContent.trim():'',plus:!!document.querySelector('.mm44-headrow>[aria-label^=\\\"Buat postingan\\\"]')});})()");
            if(state.contains("ready")&&state.contains("Kembali ke Beranda"))break;
            SystemClock.sleep(120);
        }
        return state;
    }
    private boolean waitForNativeHome(){
        AtomicReference<Boolean> ready=new AtomicReference<>(false);
        for(int retry=0;retry<60;retry++){
            inst.runOnMainSync(()->{
                LinearLayout bottom=(LinearLayout)field("bottom");
                int tab=((Integer)field("tab")).intValue();
                ready.set(tab==0&&bottom.getVisibility()==View.VISIBLE&&bottom.getChildCount()==5);
            });
            if(ready.get())return true;
            SystemClock.sleep(100);
        }
        return false;
    }
    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        Intent i=new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",4);
        activity=(MainActivity)inst.startActivitySync(i);SystemClock.sleep(500);
        inst.runOnMainSync(()->{StartupOverlay overlay=(StartupOverlay)field("launchOverlay");if(overlay!=null)overlay.dispose();});
    }
    @After public void finish(){if(activity!=null)inst.runOnMainSync(()->activity.finish());}

    @Test public void createPlusIsReplacedByClearHomeControl()throws Exception{
        String state=waitForHomeControl();
        assertTrue(state,state.contains("Kembali ke Beranda"));
        assertTrue(state,state.contains("Beranda"));
        assertTrue(state,state.contains("\\\"plus\\\":false"));
        assertEquals(View.GONE,((LinearLayout)field("bottom")).getVisibility());
    }

    @Test public void homeControlReturnsToNativeHomeAndRestoresNavigation()throws Exception{
        String state=waitForHomeControl();assertTrue(state,state.contains("Kembali ke Beranda"));
        assertEquals("true",js("(function(){var b=document.querySelector('.mm430-home-button');if(!b)return false;setTimeout(function(){b.click();},50);return true;})()"));
        assertTrue("Native Home and its five destinations should become ready",waitForNativeHome());
        inst.runOnMainSync(()->{
            assertEquals(0,((Integer)field("tab")).intValue());
            LinearLayout bottom=(LinearLayout)field("bottom");
            assertEquals(View.VISIBLE,bottom.getVisibility());
            assertEquals(5,bottom.getChildCount());
        });
    }

    @Test public void appOnlyHomeAssetsArePackaged()throws Exception{
        String script=asset("home430.js"),css=asset("home430.css");
        assertTrue(script.contains("Kembali ke Beranda"));
        assertTrue(script.contains("/index.html#mm-app-home"));
        assertTrue(script.contains("cloneNode(false)"));
        assertTrue(css.contains("mm430-home-button"));
        assertTrue(css.contains("mm430-home-label"));
    }
}
