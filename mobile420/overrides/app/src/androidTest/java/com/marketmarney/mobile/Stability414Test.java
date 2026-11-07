package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.io.File;
import java.io.FileOutputStream;
import static org.junit.Assert.*;

/** Uses synthetic local HTML. No credentials, messages, uploads or market writes. */
public class Stability414Test {
 private Instrumentation inst; private MainActivity activity;
 private static final String BASE="https://marketmarney.com",NEWS=BASE+"/__android43/news";
 private void ui(Runnable r){inst.runOnMainSync(r);}
 private Object field(String name){try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}catch(Exception e){throw new RuntimeException(e);}}
 private Object call(String name,Class<?>[] types,Object...args){try{Method m=MainActivity.class.getDeclaredMethod(name,types);m.setAccessible(true);return m.invoke(activity,args);}catch(Exception e){throw new RuntimeException(e);}}
 private void fixture(String url){ui(()->{WebView w=(WebView)field("web");w.stopLoading();w.loadDataWithBaseURL(url,"<!doctype html><html><body>Local test page</body></html>","text/html","UTF-8",url);});SystemClock.sleep(400);}
 private void capture(String name){try{File dir=new File(activity.getExternalFilesDir(null),"stability-tests");dir.mkdirs();try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){inst.getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}}catch(Exception e){throw new RuntimeException(e);}}
 @Before public void setup(){
  inst=InstrumentationRegistry.getInstrumentation();
  activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
  SystemClock.sleep(500);ui(()->{StartupOverlay s=(StartupOverlay)field("launchOverlay");if(s!=null)s.dispose();});fixture(NEWS);
 }
 @After public void cleanup(){if(activity!=null)ui(()->activity.finish());}
 @Test public void trustedOriginRejectsHostileInputs(){
  assertTrue(Recovery414.trusted(NEWS));assertFalse(Recovery414.trusted("http://marketmarney.com"));assertFalse(Recovery414.trusted("https://marketmarney.com.evil.example/"));assertFalse(Recovery414.trusted("https://user:pass@marketmarney.com/"));assertFalse(Recovery414.trusted("javascript:alert(1)"));assertFalse(Recovery414.trusted("https://marketmarney.com:444/"));
 }
 @Test public void safeRetryNeverReplaysApiOrForeignUrls(){
  assertEquals(NEWS,Recovery414.safeRetry(BASE+"/api/auth/google/callback?code=synthetic",NEWS));assertEquals(NEWS,Recovery414.safeRetry("https://example.com",NEWS));assertEquals(NEWS,Recovery414.safeRetry(BASE+"/api/trader-connect/group-messages",NEWS));assertEquals(BASE+"/grup-trader.html?group=test",Recovery414.safeRetry(BASE+"/grup-trader.html?group=test",NEWS));
 }
 @Test public void matchingIgnoresOnlyFragmentNotQueries(){
  assertTrue(Recovery414.sameDocument(BASE+"/index.html#marketlive",BASE+"/index.html"));assertFalse(Recovery414.sameDocument(BASE+"/profil.html?user=a",BASE+"/profil.html?user=b"));assertFalse(Recovery414.sameDocument("https://example.com/index.html",BASE+"/index.html"));
 }
 @Test public void errorMessagesDistinguishNetworkPermissionAndSecurity(){
  assertEquals("DNS",Recovery414.networkCode(WebViewClient.ERROR_HOST_LOOKUP));assertEquals("TIMEOUT",Recovery414.networkCode(WebViewClient.ERROR_TIMEOUT));assertEquals("TLS",Recovery414.networkCode(WebViewClient.ERROR_FAILED_SSL_HANDSHAKE));assertTrue(Recovery414.message("HTTP 403").contains("izin"));assertTrue(Recovery414.message("TLS").contains("tidak diteruskan"));
 }
 @Test public void errorScreenKeepsFiveDestinationsAvailable(){
  ui(()->{call("showFailure",new Class[]{String.class,String.class},"TIMEOUT",Recovery414.message("TIMEOUT"));assertNotNull(field("offline"));assertEquals(5,((LinearLayout)field("bottom")).getChildCount());assertTrue((Boolean)field("mainFailed"));assertNull(field("slowTask"));});capture("recovery-timeout");
 }
 @Test public void failureIsNotSilentlyMarkedReadyByLateFinish(){
  ui(()->{call("showFailure",new Class[]{String.class,String.class},"HTTP 404",Recovery414.message("HTTP 404"));call("pageReady",new Class[]{WebView.class,String.class},field("web"),NEWS);assertNotNull(field("offline"));assertTrue((Boolean)field("mainFailed"));});
 }
 @Test public void explicitRetryClearsOldErrorWithoutClearingData(){
  ui(()->{call("showFailure",new Class[]{String.class,String.class},"DNS",Recovery414.message("DNS"));call("recoverPage",new Class[]{});assertNull(field("offline"));assertEquals(NEWS,field("lastUrl"));assertFalse((Boolean)field("mainFailed"));});
 }
 @Test public void slowLoadHintIsRemovedAsSoonAsPageReady(){
  ui(()->{WebView w=(WebView)field("web");call("beginPageWait",new Class[]{WebView.class},w);Runnable r=(Runnable)field("slowTask");assertNotNull(r);r.run();assertNotNull(field("slowNotice"));call("pageReady",new Class[]{WebView.class,String.class},w,NEWS);assertNull(field("slowNotice"));assertNull(field("slowTask"));assertTrue((Boolean)field("firstPaint"));});
 }
 @Test public void reselectRootPreservesExistingWebView(){
  ui(()->{Object w=field("web");call("reselectTab",new Class[]{int.class},1);assertSame(w,field("web"));});
 }
 @Test public void reselectFromChildReturnsToSectionRoot(){
  fixture(BASE+"/berita-detail.html?slug=synthetic");ui(()->{call("reselectTab",new Class[]{int.class},1);assertEquals(NEWS,field("lastUrl"));assertEquals(1,field("tab"));});
 }
 @Test public void reportContainsNoUrlQueryOrAccountData(){
  ui(()->{String r=(String)call("appReport",new Class[]{});assertTrue(r.contains("4.20.0-beta"));assertTrue(r.contains("Berita"));assertFalse(r.contains("http"));assertFalse(r.contains("mm_reader="));assertFalse(r.contains("?user="));});
 }
 @Test public void longPressProvidesAppOptionsWithoutNavigation(){
  ui(()->{Object w=field("web");assertTrue(((LinearLayout)field("bottom")).getChildAt(1).performLongClick());assertSame(w,field("web"));assertEquals(1,field("tab"));});SystemClock.sleep(150);capture("app-options");
 }
}
