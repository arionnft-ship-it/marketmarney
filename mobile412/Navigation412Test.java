package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import java.lang.reflect.Field;
import java.util.Map;
import static org.junit.Assert.*;

/** No real account, private APIs or user content required. */
public class Navigation412Test {
    private Instrumentation inst;
    private MainActivity activity;
    private void ui(Runnable r){inst.runOnMainSync(r);}
    private Object field(String name){try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}catch(Exception e){throw new RuntimeException(e);}}
    private LinearLayout tabs(){return (LinearLayout)field("bottom");}
    private void tap(int i){ui(()->assertTrue(tabs().getChildAt(i).performClick()));SystemClock.sleep(80);}
    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        Intent it=new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1);
        activity=(MainActivity)inst.startActivitySync(it);SystemClock.sleep(600);
        ui(()->{StartupOverlay o=(StartupOverlay)field("launchOverlay");if(o!=null)o.dispose();});
    }
    @After public void cleanup(){if(activity!=null)ui(()->activity.finish());}
    @Test public void fiveLabelsInRequestedOrder(){ui(()->{
        String[] expected={"Beranda","Berita","XAUWar","Market Live","Social Marney"};assertEquals(5,tabs().getChildCount());
        for(int i=0;i<5;i++)assertEquals(expected[i],tabs().getChildAt(i).getContentDescription());
    });}
    @Test public void fiveTargetsFitTheScreen(){ui(()->{
        float density=activity.getResources().getDisplayMetrics().density;
        for(int i=0;i<5;i++){
            View v=tabs().getChildAt(i);assertTrue("Target width",v.getWidth()/density>=48);assertTrue("Target height",v.getHeight()/density>=48);
            assertTrue("Within bar",v.getRight()<=tabs().getWidth());
            TextView title=(TextView)((LinearLayout)v).getChildAt(1);assertNotNull(title.getLayout());assertEquals("Full label",0,title.getLayout().getEllipsisCount(0));
        }
    });}
    @Test public void xauwarClickLoadsCorrectInAppDestination(){tap(2);ui(()->{
        assertEquals(2,field("tab"));assertEquals("https://marketmarney.com/assets/xau-war-3d.html?v=7.6",field("lastUrl"));
        assertNotNull(field("web"));assertTrue(tabs().getChildAt(2).isSelected());assertFalse(activity.isFinishing());
    });}
    @Test public void shiftedMarketAndSocialRoutesRemainCorrect(){
        tap(3);ui(()->{assertEquals(3,field("tab"));assertEquals("https://marketmarney.com/index.html#marketlive",field("lastUrl"));});
        tap(4);ui(()->{assertEquals(4,field("tab"));assertEquals("https://marketmarney.com/beranda-trader.html",field("lastUrl"));});
        tap(1);ui(()->{assertEquals(1,field("tab"));assertEquals("https://marketmarney.com/__android43/news",field("lastUrl"));});
    }
    @Test public void leavingXauwarDoesNotRetainItsWebView(){
        tap(2);final WebView[] old={null};ui(()->old[0]=(WebView)field("web"));tap(1);
        ui(()->{Map<?,?> cache=(Map<?,?>)field("retained");assertFalse(cache.containsKey(2));assertFalse(cache.containsValue(old[0]));assertNull(old[0].getParent());assertTrue(cache.size()<=1);});
    }
    @Test public void noXauwarPreloadOnNews(){ui(()->{
        assertEquals(1,field("tab"));assertEquals("https://marketmarney.com/__android43/news",field("lastUrl"));assertTrue(((Map<?,?>)field("retained")).isEmpty());
    });}
}
