package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import static org.junit.Assert.*;

/** Focused checks for the 4.34 bounded-buffer and rendering optimizations. */
public class Optimization434Test {
    private MainActivity activity;

    private Instrumentation instrumentation(){
        return InstrumentationRegistry.getInstrumentation();
    }
    private Object field(String name){
        try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}
        catch(Exception error){throw new RuntimeException(error);}
    }
    private String asset(String name)throws Exception{
        try(InputStream in=instrumentation().getTargetContext().getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
            return out.toString("UTF-8");
        }
    }
    private String js(String code)throws Exception{
        Instrumentation inst=instrumentation();
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        inst.runOnMainSync(()->((WebView)field("web")).evaluateJavascript(code,value->{result.set(value);done.countDown();}));
        assertTrue("JavaScript callback",done.await(7,TimeUnit.SECONDS));return result.get();
    }
    private void startRuntimeActivity(){
        Instrumentation inst=instrumentation();
        Intent intent=new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab",4);
        activity=(MainActivity)inst.startActivitySync(intent);
        SystemClock.sleep(500);
        inst.runOnMainSync(()->{
            StartupOverlay overlay=(StartupOverlay)field("launchOverlay");
            if(overlay!=null)overlay.dispose();
        });
    }
    private void finishRuntimeActivity(){
        if(activity==null)return;
        Instrumentation inst=instrumentation();
        MainActivity current=activity;
        activity=null;
        inst.runOnMainSync(current::finish);
        inst.waitForIdleSync();
    }

    @Test public void reelsUsesBoundedPredictiveBuffer()throws Exception{
        String script=asset("reels46.js");
        assertTrue(script.contains("window.__mm434Reels=true"));
        assertTrue(script.contains("n===i+lastDirection"));
        assertTrue(script.contains("n===i-lastDirection"));
        assertTrue(script.contains("attach(st,'auto')"));
        assertTrue(script.contains("scheduleRelease(20000)"));
        assertTrue(script.contains("rootMargin:'20% 0px 20% 0px'"));
        assertFalse(script.contains("conservative||reduce.matches||st.userPaused"));
        assertTrue(script.contains("warmOrigin(st.source)"));
    }

    @Test public void socialAndRenderingAvoidUnnecessaryWork()throws Exception{
        String social=asset("social411/bundle427.js"),css=asset("perf434.css"),guard=asset("reels433.js");
        assertTrue(social.contains("reelsLoadedAt:0"));
        assertTrue(social.contains("Date.now()-connectState.reelsLoadedAt>120000"));
        assertTrue(social.contains("requestIdleCallback(warm,{timeout:2200})"));
        assertTrue(css.contains("content-visibility:auto"));
        assertTrue(css.contains("backdrop-filter:none"));
        assertTrue(guard.contains("15000"));
        assertTrue(guard.contains("'progress','timeupdate'"));
    }

    @Test public void optimizedControllerMountsInApp()throws Exception{
        startRuntimeActivity();
        try{
            String state="";
            for(int retry=0;retry<70;retry++){
                state=js("(function(){return JSON.stringify({controller:!!window.__mm434Reels,buffer:document.documentElement.dataset.mm434Buffer||'',toolbar:!!document.getElementById('mm46-toolbar')});})()");
                if(state.contains("\\\"controller\\\":true")&&state.contains("\\\"buffer\\\":\\\"smart\\\"")&&state.contains("\\\"toolbar\\\":true"))break;
                SystemClock.sleep(120);
            }
            assertTrue(state,state.contains("\\\"controller\\\":true"));
            assertTrue(state,state.contains("\\\"buffer\\\":\\\"smart\\\""));
            assertTrue(state,state.contains("\\\"toolbar\\\":true"));
        }finally{
            finishRuntimeActivity();
        }
    }
}
