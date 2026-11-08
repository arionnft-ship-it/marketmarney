package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.LayerDrawable;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Field;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

/** One real-device flow verifies the cinematic opening without repeatedly rebuilding GPU surfaces. */
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
        SystemClock.sleep(350);
        ui(()->{
            StartupOverlay existing=(StartupOverlay)field(activity,"launchOverlay");
            if(existing!=null)existing.dispose();
            WebView web=(WebView)field(activity,"web");
            if(web!=null)web.stopLoading();
            overlay=new StartupOverlay(activity,removed::incrementAndGet);
            ((FrameLayout)activity.findViewById(android.R.id.content)).addView(
                overlay,new FrameLayout.LayoutParams(-1,-1));
        });
        SystemClock.sleep(120);
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

    @Test public void cinematicOpeningSoftDepthAndLightRecoveryWorkTogether(){
        ui(()->{
            assertEquals("mm416-launch-overlay",overlay.getTag());
            assertEquals("MARNEY",((TextView)part("name")).getText().toString());
            assertEquals("MARKET  •  NEWS  •  ANALYSIS",((TextView)part("caption")).getText().toString());
            assertEquals("FINANCIAL INTELLIGENCE",((TextView)part("description")).getText().toString());
            assertEquals("KENALI PASARNYA.",((TextView)part("footer")).getText().toString());
            assertNotNull(((android.widget.ImageView)part("logo")).getDrawable());
            assertEquals("Logo MARNEY bercahaya oranye",part("logo").getContentDescription());
            assertEquals("Lewati animasi pembuka",part("skip").getContentDescription());
            assertNotNull(part("backdrop"));
            assertNotNull(part("aura"));

            int openingFlags=activity.getWindow().getDecorView().getSystemUiVisibility();
            assertEquals(0,openingFlags&View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            assertEquals(0,openingFlags&View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

            Drawable tray=DepthStyle423.tray(activity,true);
            Drawable selected=DepthStyle423.tabPlate(activity,true,true);
            Drawable idle=DepthStyle423.tabPlate(activity,true,false);
            Drawable panel=DepthStyle423.panel(activity,true);
            assertTrue(tray instanceof LayerDrawable);
            assertTrue(selected instanceof LayerDrawable);
            assertTrue(idle instanceof LayerDrawable);
            assertTrue(panel instanceof LayerDrawable);
            assertTrue(((LayerDrawable)tray).getNumberOfLayers()<=2);
            assertTrue(((LayerDrawable)selected).getNumberOfLayers()<=2);
            assertTrue(((LayerDrawable)idle).getNumberOfLayers()<=2);
            assertTrue(((LayerDrawable)panel).getNumberOfLayers()<=2);

            Button primary=new Button(activity);
            primary.setPadding(18,8,18,8);
            DepthStyle423.applyButton(primary,true,true);
            assertNotNull(primary.getBackground());
            assertEquals(0f,primary.getElevation(),.001f);
            assertNull(primary.getStateListAnimator());
        });

        // Verify the settled frame rather than exact intermediate timing. Android
        // emulators may schedule animation frames differently while the visual
        // result and finite durations remain identical.
        SystemClock.sleep(2750);
        ui(()->{
            assertTrue(part("logo").getAlpha()>=.85f);
            assertTrue(part("logo").getScaleX()>=.85f);
            assertTrue(part("name").getAlpha()>=.85f);
            assertTrue(part("fill").getScaleX()>=.85f);
            assertTrue(part("skip").performClick());
        });
        awaitRemoved(800);

        ui(()->{
            int lightFlags=activity.getWindow().getDecorView().getSystemUiVisibility();
            assertTrue((lightFlags&View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR)!=0);
            assertTrue((lightFlags&View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR)!=0);
            overlay.finish(true,"again");
            overlay.dispose();
        });
        assertEquals(1,removed.get());
    }
}
