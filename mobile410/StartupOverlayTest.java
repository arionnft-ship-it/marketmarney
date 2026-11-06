package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.Assert.*;

/** Test-only fixture keeps the actual overlay visible without holding the shipping app. */
public class StartupOverlayTest {
    private Instrumentation inst;
    private MainActivity activity;
    private StartupOverlay overlay;
    private final AtomicInteger removed=new AtomicInteger();
    private void ui(Runnable work){inst.runOnMainSync(work);}
    private static Object field(Object o,String name)throws Exception{Field f=o.getClass().getDeclaredField(name);f.setAccessible(true);return f.get(o);}
    private void shell(String command)throws Exception{try(ParcelFileDescriptor fd=inst.getUiAutomation().executeShellCommand(command);java.io.InputStream in=new ParcelFileDescriptor.AutoCloseInputStream(fd)){byte[] b=new byte[1024];while(in.read(b)!=-1){}}}
    @Before public void setup()throws Exception{
        inst=InstrumentationRegistry.getInstrumentation();shell("settings put global animator_duration_scale 1");
        Intent launch=new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);launch.putExtra("startTab",1);
        activity=(MainActivity)inst.startActivitySync(launch);SystemClock.sleep(700);
        ui(()->{try{StartupOverlay old=(StartupOverlay)field(activity,"launchOverlay");if(old!=null)old.dispose();WebView web=(WebView)field(activity,"web");if(web!=null)web.stopLoading();}catch(Exception e){throw new RuntimeException(e);}});
        SystemClock.sleep(300);
    }
    private void show(){ui(()->{overlay=new StartupOverlay(activity,removed::incrementAndGet);((FrameLayout)activity.findViewById(android.R.id.content)).addView(overlay,new FrameLayout.LayoutParams(-1,-1));});}
    private void awaitRemoved(long limit){long end=SystemClock.uptimeMillis()+limit;while(removed.get()==0&&SystemClock.uptimeMillis()<end)SystemClock.sleep(20);assertEquals(1,removed.get());}
    private View skip(View v){if("Lewati animasi pembuka".contentEquals(v.getContentDescription()==null?"":v.getContentDescription()))return v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){View found=skip(g.getChildAt(i));if(found!=null)return found;}}return null;}
    private void screenshot(String name)throws Exception{
        Bitmap bmp=inst.getUiAutomation().takeScreenshot();assertNotNull(bmp);File dir=new File(inst.getTargetContext().getExternalFilesDir(null),"launch-tests");assertTrue(dir.exists()||dir.mkdirs());
        try(FileOutputStream out=new FileOutputStream(new File(dir,name))){assertTrue(bmp.compress(Bitmap.CompressFormat.PNG,100,out));}bmp.recycle();
    }
    @After public void cleanup()throws Exception{if(inst!=null){ui(()->{if(overlay!=null)overlay.dispose();if(activity!=null)activity.finish();});shell("settings put global animator_duration_scale 1");}}
    @Test public void artworkDrawsAndActuallyAnimates()throws Exception{
        show();SystemClock.sleep(180);screenshot("launch-a.png");SystemClock.sleep(550);screenshot("launch-b.png");
        assertTrue(overlay.isAttachedToWindow());assertNotNull(skip(overlay));
        Object art=field(overlay,"artwork");assertNotNull(field(art,"animator"));
        ui(()->overlay.finish(false,"test-visual-complete"));awaitRemoved(500);
    }
    @Test public void readinessDoesNotWaitForAnimationCycle(){
        show();long start=SystemClock.uptimeMillis();ui(()->overlay.finish(true,"test-ready"));awaitRemoved(1000);
        assertTrue("Must not enforce the 1800ms decorative cycle",SystemClock.uptimeMillis()-start<1000);
    }
    @Test public void skipIsImmediateAndIdempotent(){
        show();ui(()->assertTrue(skip(overlay).performClick()));awaitRemoved(400);ui(()->{overlay.finish(true,"again");overlay.dispose();});assertEquals(1,removed.get());
    }
    @Test public void slowLoadingCannotKeepOverlayIndefinitely(){
        show();long start=SystemClock.uptimeMillis();awaitRemoved(5500);assertTrue(SystemClock.uptimeMillis()-start<5500);assertNull(overlay.getParent());
    }
    @Test public void animatorDisabledUsesStaticArtwork()throws Exception{
        shell("settings put global animator_duration_scale 0");assertFalse(StartupOverlay.motionAllowed(activity));show();SystemClock.sleep(160);
        assertNull(field(field(overlay,"artwork"),"animator"));screenshot("launch-reduced-motion.png");ui(()->overlay.finish(true,"test-reduced-motion"));awaitRemoved(400);
    }
    @Test public void connectionErrorRevealsOfflineUI()throws Exception{
        show();ui(()->{try{Field f=MainActivity.class.getDeclaredField("launchOverlay");f.setAccessible(true);f.set(activity,overlay);Method m=MainActivity.class.getDeclaredMethod("showOffline",String.class);m.setAccessible(true);m.invoke(activity,"Koneksi simulasi tidak tersedia.");}catch(Exception e){throw new RuntimeException(e);}});
        awaitRemoved(400);assertNotNull(field(activity,"offline"));assertNull(overlay.getParent());
    }
    @Test public void backgroundStopsAndRemovesAnimation()throws Exception{
        show();ui(()->{try{Field f=MainActivity.class.getDeclaredField("launchOverlay");f.setAccessible(true);f.set(activity,overlay);}catch(Exception e){throw new RuntimeException(e);}activity.moveTaskToBack(true);});
        awaitRemoved(1200);assertNull(field(field(overlay,"artwork"),"animator"));
    }
    @Test public void disposeCancelsAnimatorAndIsSafeTwice()throws Exception{
        show();SystemClock.sleep(80);ui(()->{overlay.dispose();overlay.dispose();});awaitRemoved(400);assertNull(field(field(overlay,"artwork"),"animator"));assertNull(overlay.getParent());
    }
}
