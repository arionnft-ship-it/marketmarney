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

/** Verifies the compact Reels shell introduced in MarketMarney 4.33. */
public class Reels433LayoutTest {
    private Instrumentation inst;
    private MainActivity activity;

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
        assertTrue("JavaScript callback",done.await(7,TimeUnit.SECONDS));return result.get();
    }
    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        Intent intent=new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab",4);
        activity=(MainActivity)inst.startActivitySync(intent);SystemClock.sleep(500);
        inst.runOnMainSync(()->{StartupOverlay overlay=(StartupOverlay)field("launchOverlay");if(overlay!=null)overlay.dispose();});
    }
    @After public void finish(){if(activity!=null)inst.runOnMainSync(()->activity.finish());}

    @Test public void reelsUsesOneCompactHeaderAndLightDock()throws Exception{
        String ready="";
        for(int retry=0;retry<70;retry++){
            ready=js("(function(){return JSON.stringify({shell:document.documentElement.dataset.mm429Social||'',toolbar:!!document.getElementById('mm46-toolbar')});})()");
            if(ready.contains("429")&&ready.contains("true"))break;
            SystemClock.sleep(120);
        }
        assertTrue(ready,ready.contains("429"));
        js("(function(){var h=document.documentElement,logged=document.getElementById('shLogged');if(logged)logged.hidden=false;h.dataset.mmAuthState='authenticated';h.dataset.mm429Social='429';h.dataset.mm47Nav='47';h.dataset.mm44View='reels';h.setAttribute('data-mm46-reels','');window.dispatchEvent(new Event('mm45:resume'));return true;})()");
        String state="";
        for(int retry=0;retry<50;retry++){
            state=js("(function(){var h=document.documentElement,head=document.getElementById('mm44-social-header'),bar=document.getElementById('mm46-toolbar'),panel=document.getElementById('shReelsPanel'),nav=document.querySelector('.mm44-nav'),back=bar&&bar.querySelector('[aria-label=\\\"Kembali ke Media\\\"]'),add=bar&&bar.querySelector('[aria-label=\\\"Unggah Reel\\\"]');if(!head||!bar||!panel||!nav)return JSON.stringify({ready:false});var hc=getComputedStyle(head),bc=getComputedStyle(bar),nc=getComputedStyle(nav),br=bar.getBoundingClientRect(),pr=panel.getBoundingClientRect(),nr=nav.getBoundingClientRect(),rgb=(nc.backgroundColor.match(/\\d+/g)||[]).map(Number);return JSON.stringify({ready:h.dataset.mm433Reels==='433'&&h.hasAttribute('data-mm46-reels'),header:hc.display,toolbar:bc.display,toolbarH:Math.round(br.height),panelTop:Math.round(pr.top),panelBottom:Math.round(pr.bottom),dockTop:Math.round(nr.top),navLight:rgb.length>=3&&rgb[0]>220&&rgb[1]>220&&rgb[2]>220,back:!!back,add:!!add,icons:bar.querySelectorAll('.mm46-icon svg').length});})()");
            if(state.contains("\\\"ready\\\":true"))break;
            SystemClock.sleep(120);
        }
        assertTrue(state,state.contains("\\\"ready\\\":true"));
        assertTrue(state,state.contains("\\\"header\\\":\\\"none\\\""));
        assertTrue(state,state.contains("\\\"toolbar\\\":\\\"flex\\\""));
        assertTrue(state,state.contains("\\\"navLight\\\":true"));
        assertTrue(state,state.contains("\\\"back\\\":true"));
        assertTrue(state,state.contains("\\\"add\\\":true"));
        assertTrue(state,state.contains("\\\"icons\\\":3"));
        String geometry=js("(function(){var b=document.getElementById('mm46-toolbar').getBoundingClientRect(),p=document.getElementById('shReelsPanel').getBoundingClientRect(),n=document.querySelector('.mm44-nav').getBoundingClientRect();return JSON.stringify({toolbarOk:b.height>=40&&b.height<90,panelTopOk:Math.abs(p.top)<2,panelDockOk:Math.abs(p.bottom-n.top)<3});})()");
        assertTrue(geometry,geometry.contains("\\\"toolbarOk\\\":true"));
        assertTrue(geometry,geometry.contains("\\\"panelTopOk\\\":true"));
        assertTrue(geometry,geometry.contains("\\\"panelDockOk\\\":true"));
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
