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
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

/** Verifies the compact Reels shell without racing the asynchronous Social installer. */
public class Reels433LayoutTest {
    private Instrumentation inst;
    private MainActivity activity;

    private void ensureActivity(){
        if(activity!=null)return;
        Intent intent=new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab",4);
        activity=(MainActivity)inst.startActivitySync(intent);SystemClock.sleep(500);
        inst.runOnMainSync(()->{StartupOverlay overlay=(StartupOverlay)field("launchOverlay");if(overlay!=null)overlay.dispose();});
        waitForAdaptedSocial();
    }
    private void waitForAdaptedSocial(){
        AtomicReference<String> document=new AtomicReference<>("");
        for(int retry=0;retry<180;retry++){
            inst.runOnMainSync(()->document.set(String.valueOf(field("lastAdaptedDocument"))));
            if(document.get().contains("/beranda-trader.html"))return;
            SystemClock.sleep(100);
        }
        fail("Social document was not adapted: "+document.get());
    }
    private Object field(String name){
        try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}
        catch(Exception error){throw new RuntimeException(error);}
    }
    private String asset(String name)throws Exception{
        try(InputStream in=inst.getTargetContext().getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[4096];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
            return out.toString("UTF-8");
        }
    }
    private String js(String code)throws Exception{
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> result=new AtomicReference<>();
        inst.runOnMainSync(()->((WebView)field("web")).evaluateJavascript(code,value->{result.set(value);done.countDown();}));
        assertTrue("JavaScript callback",done.await(10,TimeUnit.SECONDS));return result.get();
    }
    @Before public void setup(){inst=InstrumentationRegistry.getInstrumentation();}
    @After public void finish(){if(activity!=null)inst.runOnMainSync(()->activity.finish());}

    @Test public void reelsUsesOneCompactHeaderAndLightDock()throws Exception{
        ensureActivity();
        String ready="";
        for(int retry=0;retry<70;retry++){
            ready=js("(function(){return JSON.stringify({shell:document.documentElement.dataset.mm429Social||'',toolbar:!!document.getElementById('mm46-toolbar'),fixed:!!document.querySelector('[aria-label=\\\"Kembali ke Media\\\"]')&&!!document.querySelector('[aria-label=\\\"Unggah Reel\\\"]')});})()");
            if(ready.contains("429")&&ready.contains("\\\"toolbar\\\":true")&&ready.contains("\\\"fixed\\\":true"))break;
            SystemClock.sleep(120);
        }
        assertTrue(ready,ready.contains("429"));
        assertTrue(ready,ready.contains("\\\"toolbar\\\":true"));
        assertTrue(ready,ready.contains("\\\"fixed\\\":true"));

        String state=js("(function(){var h=document.documentElement,logged=document.getElementById('shLogged'),head=document.getElementById('mm44-social-header'),bar=document.getElementById('mm46-toolbar'),panel=document.getElementById('shReelsPanel'),nav=document.querySelector('.mm44-nav');if(!logged||!head||!bar||!panel||!nav)return JSON.stringify({ready:false,missing:true});logged.removeAttribute('hidden');try{Object.defineProperty(logged,'hidden',{configurable:true,get:function(){return false;},set:function(){}});}catch(ignore){logged.hidden=false;}h.dataset.mmAuthState='authenticated';h.dataset.mm429Social='429';h.dataset.mm47Nav='47';h.dataset.mm44View='reels';h.dataset.mm433Reels='433';h.setAttribute('data-mm46-reels','');var back=bar.querySelector('[aria-label=\\\"Kembali ke Media\\\"]'),add=bar.querySelector('[aria-label=\\\"Unggah Reel\\\"]'),hc=getComputedStyle(head),bc=getComputedStyle(bar),nc=getComputedStyle(nav),br=bar.getBoundingClientRect(),pr=panel.getBoundingClientRect(),rgb=(nc.backgroundColor.match(/\\d+/g)||[]).map(Number),viewport=Math.max(window.innerHeight||0,document.documentElement.clientHeight||0),panelHeightOk=pr.height>=Math.max(360,viewport*.65);return JSON.stringify({ready:true,header:hc.display,toolbar:bc.display,toolbarOk:br.height>=40&&br.height<90,panelTopOk:Math.abs(pr.top)<2,panelHeightOk:panelHeightOk,panelHeight:Math.round(pr.height),panelBottom:Math.round(pr.bottom),viewport:Math.round(viewport),navLight:rgb.length>=3&&rgb[0]>220&&rgb[1]>220&&rgb[2]>220,back:!!back,add:!!add,icons:bar.querySelectorAll('.mm46-icon svg').length});})()");
        assertTrue(state,state.contains("\\\"ready\\\":true"));
        assertTrue(state,state.contains("\\\"header\\\":\\\"none\\\""));
        assertTrue(state,state.contains("\\\"toolbar\\\":\\\"flex\\\""));
        assertTrue(state,state.contains("\\\"toolbarOk\\\":true"));
        assertTrue(state,state.contains("\\\"panelTopOk\\\":true"));
        assertTrue(state,state.contains("\\\"panelHeightOk\\\":true"));
        assertTrue(state,state.contains("\\\"navLight\\\":true"));
        assertTrue(state,state.contains("\\\"back\\\":true"));
        assertTrue(state,state.contains("\\\"add\\\":true"));
        assertTrue(state,state.contains("\\\"icons\\\":3"));
    }

    @Test public void repairedReelsAssetsArePackaged()throws Exception{
        String css=asset("reels433.css"),script=asset("reels433.js");
        assertTrue(css.contains("truly full-screen Reels"));
        assertTrue(css.contains(".mm44-social-header"));
        assertTrue(css.contains("#shReelsPanel"));
        assertTrue(css.contains("background:rgba(255,255,255,.98)"));
        assertTrue(css.contains("--mm46-fit:cover"));
        assertTrue(script.contains("Kembali ke Media"));
        assertTrue(script.contains("Unggah Reel"));
        assertTrue(script.contains("input.setAttribute('accept','video/*')"));
        assertTrue(script.contains("8000"));
    }
}
