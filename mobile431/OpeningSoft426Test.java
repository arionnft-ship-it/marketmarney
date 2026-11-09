package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Field;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

/** Verifies the restrained light opening introduced in Marney 4.31. */
public class OpeningSoft426Test {
    private Instrumentation inst;
    private MainActivity activity;
    private StartupOverlay overlay;
    private final AtomicInteger removed=new AtomicInteger();

    private void ui(Runnable action){inst.runOnMainSync(action);}

    private static Object field(Object target,String name){
        try{
            Field value=target.getClass().getDeclaredField(name);
            value.setAccessible(true);
            return value.get(target);
        }catch(Exception error){
            throw new RuntimeException(error);
        }
    }

    private void shell(String command)throws Exception{
        try(ParcelFileDescriptor descriptor=inst.getUiAutomation().executeShellCommand(command);
            java.io.InputStream in=new ParcelFileDescriptor.AutoCloseInputStream(descriptor)){
            byte[] buffer=new byte[1024];
            while(in.read(buffer)!=-1){}
        }
    }

    private View part(String name){return (View)field(overlay,name);}

    private boolean containsText(View view,String text){
        if(view instanceof TextView&&text.contentEquals(((TextView)view).getText()))return true;
        if(view instanceof ViewGroup){
            ViewGroup group=(ViewGroup)view;
            for(int i=0;i<group.getChildCount();i++)if(containsText(group.getChildAt(i),text))return true;
        }
        return false;
    }

    private void awaitRemoved(long timeoutMs){
        long end=SystemClock.uptimeMillis()+timeoutMs;
        while(removed.get()==0&&SystemClock.uptimeMillis()<end)SystemClock.sleep(10);
        assertEquals(1,removed.get());
    }

    @Before public void setup()throws Exception{
        inst=InstrumentationRegistry.getInstrumentation();
        shell("settings put global animator_duration_scale 1");
        activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab",1));
        SystemClock.sleep(300);
        ui(()->{
            StartupOverlay existing=(StartupOverlay)field(activity,"launchOverlay");
            if(existing!=null)existing.dispose();
            WebView web=(WebView)field(activity,"web");
            if(web!=null)web.stopLoading();
            overlay=new StartupOverlay(activity,removed::incrementAndGet);
            ((FrameLayout)activity.findViewById(android.R.id.content)).addView(
                overlay,new FrameLayout.LayoutParams(-1,-1));
        });
        SystemClock.sleep(100);
    }

    @After public void cleanup()throws Exception{
        if(inst!=null){
            ui(()->{
                if(overlay!=null)overlay.dispose();
                if(activity!=null)activity.finish();
            });
            shell("settings put global animator_duration_scale 1");
        }
    }

    @Test public void simpleLightOpeningIsQuietAndReturnsToTheApp(){
        ui(()->{
            assertEquals("mm416-launch-overlay",overlay.getTag());
            assertEquals(0f,overlay.getElevation(),.001f);
            assertEquals("MARNEY",((TextView)part("name")).getText().toString());
            assertEquals("Kenali pasarnya.",((TextView)part("caption")).getText().toString());
            assertNotNull(((ImageView)part("logo")).getDrawable());
            assertEquals("Logo MARNEY",part("logo").getContentDescription());
            assertFalse(containsText(overlay,"LEWATI"));
            assertFalse(containsText(overlay,"MENYIAPKAN APLIKASI"));
            assertFalse(containsText(overlay,"FINANCIAL INTELLIGENCE"));
            assertFalse(containsText(overlay,"MARKET  •  NEWS  •  ANALYSIS"));
            assertFalse(containsText(overlay,"KENALI PASARNYA."));

            int flags=activity.getWindow().getDecorView().getSystemUiVisibility();
            assertTrue((flags&View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR)!=0);
            assertTrue((flags&View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR)!=0);
        });

        SystemClock.sleep(520);
        ui(()->{
            assertTrue(part("logo").getAlpha()>=.9f);
            assertTrue(part("name").getAlpha()>=.9f);
            assertTrue(part("caption").getAlpha()>=.9f);
            overlay.finish(true,"test-complete");
        });
        awaitRemoved(600);

        ui(()->{
            int flags=activity.getWindow().getDecorView().getSystemUiVisibility();
            assertTrue((flags&View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR)!=0);
            assertTrue((flags&View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR)!=0);
            overlay.finish(true,"again");
            overlay.dispose();
        });
        assertEquals(1,removed.get());
    }
}
