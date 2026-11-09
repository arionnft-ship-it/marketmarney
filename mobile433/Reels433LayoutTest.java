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

public class Reels433LayoutTest {
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
        assertTrue("JavaScript callback",done.await(15,TimeUnit.SECONDS));return value.get();
    }
    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        Intent i=new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",4);
        activity=(MainActivity)inst.startActivitySync(i);SystemClock.sleep(1000);
        inst.runOnMainSync(()->{StartupOverlay overlay=(StartupOverlay)field("launchOverlay");if(overlay!=null)overlay.dispose();});
    }
    @After public void finish(){if(activity!=null)inst.runOnMainSync(()->activity.finish());}

    @Test public void reelsUsesOneCompactHeaderAndFlatDock()throws Exception{
        String ready="";
        for(int retry=0;retry<70;retry++){
            ready=js("(function(){return JSON.stringify({shell:document.documentElement.dataset.mm429Social||'',toolbar:!!document.getElementById('mm46-toolbar'),header:!!document.querySelector('.mm44-social-header'),nav:!!document.querySelector('.mm44-nav'),reels:!!document.querySelector('.mm44-nav-button[aria-label=\\\"Reels\\\"]'),logged:!!document.getElementById('shLogged')});})()");
            if(ready.contains("429")&&ready.contains("\\\"toolbar\\\":true")&&ready.contains("\\\"header\\\":true")&&ready.contains("\\\"reels\\\":true")&&ready.contains("\\\"logged\\\":true"))break;
            SystemClock.sleep(120);
        }
        assertTrue(ready,ready.contains("429"));
        assertEquals("true",js("(function(){var H=document.documentElement,logged=document.getElementById('shLogged'),guest=document.getElementById('shGuest');if(!logged)return false;logged.hidden=false;if(guest)guest.hidden=true;H.dataset.mmAuthState='authenticated';window.dispatchEvent(new Event('mm:auth-state'));var b=document.querySelector('.mm44-nav-button[aria-label=\\\"Reels\\\"]');if(!b)return false;b.click();return true;})()"));
        String state="";
        for(int retry=0;retry<60;retry++){
            state=js("(function(){var H=document.documentElement,h=document.querySelector('.mm44-social-header'),p=document.getElementById('shReelsPanel'),t=document.getElementById('mm46-toolbar'),n=document.querySelector('.mm44-nav'),l=document.querySelector('.mm46-loading');var sv=t?Array.from(t.querySelectorAll('.mm46-icon svg')):[];return JSON.stringify({view:H.dataset.mm44View||'',native:H.hasAttribute('data-mm46-reels'),clean:H.dataset.mm433Reels||'',header:h?getComputedStyle(h).display:'missing',top:p?Math.round(p.getBoundingClientRect().top):-99,toolbar:t?getComputedStyle(t).display:'missing',icons:sv.length,visible:sv.filter(function(x){var s=getComputedStyle(x);return s.display!=='none'&&s.opacity!=='0'&&s.stroke!=='none';}).length,navHeight:n?Math.round(n.getBoundingClientRect().height):999,navShadow:n?getComputedStyle(n).boxShadow:'missing',loadingFont:l?parseFloat(getComputedStyle(l).fontSize):99,loadingBg:l?getComputedStyle(l).backgroundColor:'missing'});})()");
            if(state.contains("\\\"view\\\":\\\"reels\\\"")&&state.contains("\\\"native\\\":true")&&state.contains("\\\"clean\\\":\\\"clean\\\"")&&state.contains("\\\"header\\\":\\\"none\\\""))break;
            SystemClock.sleep(120);
        }
        assertTrue(state,state.contains("\\\"view\\\":\\\"reels\\\""));
        assertTrue(state,state.contains("\\\"native\\\":true"));
        assertTrue(state,state.contains("\\\"clean\\\":\\\"clean\\\""));
        assertTrue(state,state.contains("\\\"header\\\":\\\"none\\\""));
        assertTrue(state,state.contains("\\\"top\\\":0"));
        assertTrue(state,state.contains("\\\"toolbar\\\":\\\"flex\\\""));
        assertTrue(state,state.contains("\\\"icons\\\":3")||state.contains("\\\"icons\\\":4"));
        assertFalse(state,state.contains("\\\"visible\\\":0"));
        assertFalse(state,state.contains("\\\"navHeight\\\":999"));
        assertFalse(state,state.contains("255, 255, 255"));
    }

    @Test public void cleanupAssetsArePackagedAndTargetOnlyReels()throws Exception{
        String css=asset("reels433.css"),script=asset("reels433.js");
        assertTrue(css.contains("data-mm433-reels=\"clean\""));
        assertTrue(css.contains(".mm44-social-header"));
        assertTrue(css.contains("display:none!important"));
        assertTrue(css.contains("--mm433-dock-h:62px"));
        assertTrue(css.contains("mm433-spin"));
        assertTrue(script.contains("data-mm46-reels"));
        assertTrue(script.contains("clearLoading"));
        assertTrue(script.contains("window.dispatchEvent(new Event('resize'))"));
    }
}
