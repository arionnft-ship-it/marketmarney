package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.*;
import static org.junit.Assert.*;

/** Actual overlay, on local fixture. No login, uploaded media, API writes or artificial wait in shipping code. */
public class Opening416Test {
 private Instrumentation inst;private MainActivity activity;private StartupOverlay overlay;
 private final AtomicInteger removed=new AtomicInteger();
 private void ui(Runnable r){inst.runOnMainSync(r);}
 private static Object field(Object target,String name){try{Field f=target.getClass().getDeclaredField(name);f.setAccessible(true);return f.get(target);}catch(Exception e){throw new RuntimeException(e);}}
 private void shell(String cmd)throws Exception{try(ParcelFileDescriptor fd=inst.getUiAutomation().executeShellCommand(cmd);java.io.InputStream in=new ParcelFileDescriptor.AutoCloseInputStream(fd)){byte[] b=new byte[1024];while(in.read(b)!=-1){}}}
 private void show(){show(-1,-1);}
 private void show(int width,int height){ui(()->{overlay=new StartupOverlay(activity,removed::incrementAndGet);FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(width,height,android.view.Gravity.CENTER);((FrameLayout)activity.findViewById(android.R.id.content)).addView(overlay,lp);});}
 private View part(String name){return (View)field(overlay,name);}
 private int dp(float n){return Math.round(n*activity.getResources().getDisplayMetrics().density);}
 private void awaitRemoved(long ms){long end=SystemClock.uptimeMillis()+ms;while(removed.get()==0&&SystemClock.uptimeMillis()<end)SystemClock.sleep(10);assertEquals(1,removed.get());}
 private void screenshot(String name)throws Exception{
  Bitmap bmp=inst.getUiAutomation().takeScreenshot();assertNotNull(bmp);File dir=new File(activity.getExternalFilesDir(null),"opening416-tests");assertTrue(dir.exists()||dir.mkdirs());
  try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){assertTrue(bmp.compress(Bitmap.CompressFormat.PNG,100,out));}bmp.recycle();
 }
 @Before public void setup()throws Exception{
  inst=InstrumentationRegistry.getInstrumentation();shell("settings put global animator_duration_scale 1");
  activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
  SystemClock.sleep(500);ui(()->{StartupOverlay old=(StartupOverlay)field(activity,"launchOverlay");if(old!=null)old.dispose();WebView web=(WebView)field(activity,"web");if(web!=null)web.stopLoading();});SystemClock.sleep(150);
 }
 @After public void cleanup()throws Exception{if(inst!=null){ui(()->{if(overlay!=null)overlay.dispose();if(activity!=null)activity.finish();});shell("settings put global animator_duration_scale 1");}}
 @Test public void referenceBrandingAndRealVectorArePresent(){show();ui(()->{
  assertEquals("mm416-launch-overlay",overlay.getTag());assertEquals("MarketMarney",((TextView)part("name")).getText().toString());
  assertEquals("FINANCIAL INTELLIGENCE PLATFORM",((TextView)part("caption")).getText().toString());
  assertEquals("KENALI PASARNYA.",((TextView)part("footer")).getText().toString());
  assertNotNull(((android.widget.ImageView)part("logo")).getDrawable());assertEquals("Lewati animasi pembuka",part("skip").getContentDescription());
 });}
 @Test public void stagedNameAndGoldRevealActuallyAnimate()throws Exception{
  show();SystemClock.sleep(200);final float[] before={0,0};ui(()->{before[0]=part("name").getAlpha();before[1]=part("fill").getScaleX();});screenshot("opening-early");
  SystemClock.sleep(1900);ui(()->{assertTrue(part("name").getAlpha()>before[0]+.3f);assertTrue(part("fill").getScaleX()>before[1]+.1f);});screenshot("opening-reference-style");assertEquals(0,removed.get());
 }
 @Test public void readyPageDoesNotWaitForReferenceSequence(){show();long start=SystemClock.uptimeMillis();ui(()->overlay.finish(true,"test-ready"));awaitRemoved(1000);assertTrue(SystemClock.uptimeMillis()-start<1000);}
 @Test public void skipIsImmediateAndIdempotent(){show();ui(()->assertTrue(part("skip").performClick()));awaitRemoved(400);ui(()->{overlay.finish(true,"again");overlay.dispose();});assertEquals(1,removed.get());}
 @Test public void safetyLimitPreventsIndefiniteOpening(){show();long start=SystemClock.uptimeMillis();awaitRemoved(5400);assertTrue(SystemClock.uptimeMillis()-start<5400);assertNull(overlay.getParent());}
 @Test public void disabledMotionShowsStaticFullBranding()throws Exception{
  shell("settings put global animator_duration_scale 0");assertFalse(StartupOverlay.motionAllowed(activity));show();SystemClock.sleep(150);
  ui(()->{assertEquals(1f,part("logo").getAlpha(),.001f);assertEquals(1f,part("name").getAlpha(),.001f);assertEquals(1f,part("fill").getScaleX(),.001f);});screenshot("opening-reduced-motion");
  ui(()->overlay.finish(true,"reduced-motion"));awaitRemoved(400);
 }
 @Test public void connectionErrorImmediatelyRevealsRecovery(){
  show();ui(()->{try{Field f=MainActivity.class.getDeclaredField("launchOverlay");f.setAccessible(true);f.set(activity,overlay);Method m=MainActivity.class.getDeclaredMethod("showOffline",String.class);m.setAccessible(true);m.invoke(activity,"Koneksi simulasi tidak tersedia.");}catch(Exception e){throw new RuntimeException(e);}});
  awaitRemoved(400);assertNotNull(field(activity,"offline"));assertNull(overlay.getParent());
 }
 @Test public void backgroundRemovesOpeningAndDoesNotRestartIt(){
  show();ui(()->{try{Field f=MainActivity.class.getDeclaredField("launchOverlay");f.setAccessible(true);f.set(activity,overlay);}catch(Exception e){throw new RuntimeException(e);}activity.moveTaskToBack(true);});awaitRemoved(1200);assertNull(overlay.getParent());
 }
 @Test public void smallViewportKeepsBrandAndSkipInsideBounds()throws Exception{
  shell("settings put global animator_duration_scale 0");show(dp(320),dp(400));SystemClock.sleep(150);
  ui(()->{for(String n:new String[]{"logo","name","caption","description","loading","track","skip","footer"}){
   View v=part(n);Rect r=new Rect(0,0,v.getWidth(),v.getHeight());overlay.offsetDescendantRectToMyCoords(v,r);
   assertTrue(n+" left",r.left>=0);assertTrue(n+" right",r.right<=overlay.getWidth());assertTrue(n+" top",r.top>=0);assertTrue(n+" bottom",r.bottom<=overlay.getHeight());
  }
  assertTrue(part("skip").getHeight()>=dp(48));TextView n=(TextView)part("name");assertEquals(1,n.getLineCount());assertEquals(0,n.getLayout().getEllipsisCount(0));
  });screenshot("opening-compact");
 }
 @Test public void disposeCancelsPendingEffectsAndCallbackOnlyOnce(){
  show();SystemClock.sleep(120);ui(()->{overlay.dispose();overlay.dispose();});awaitRemoved(400);
  final float[] values={0,0};ui(()->{values[0]=part("name").getAlpha();values[1]=part("fill").getScaleX();});SystemClock.sleep(800);
  ui(()->{assertEquals(values[0],part("name").getAlpha(),.001f);assertEquals(values[1],part("fill").getScaleX(),.001f);});assertNull(overlay.getParent());assertEquals(1,removed.get());
 }
}
