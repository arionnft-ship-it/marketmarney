package com.marketmarney.mobile;
import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.*;
import static org.junit.Assert.*;
public class AdaptGuardTest {
 private Instrumentation inst;private MainActivity activity;
 private final String url="https://marketmarney.com/profil.html?user=synthetic-guard";
 private Object field(String name){try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}catch(Exception e){throw new RuntimeException(e);}}
 private String js(String code)throws Exception{CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();inst.runOnMainSync(()->((WebView)field("web")).evaluateJavascript(code,r->{value.set(r);done.countDown();}));assertTrue("JS callback",done.await(5,TimeUnit.SECONDS));return value.get();}
 private void adapt(String u){inst.runOnMainSync(()->{try{Method m=MainActivity.class.getDeclaredMethod("adapt",WebView.class,String.class);m.setAccessible(true);m.invoke(activity,field("web"),u);}catch(Exception e){throw new RuntimeException(e);}});}
 @Before public void setup()throws Exception{
  inst=InstrumentationRegistry.getInstrumentation();activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
  SystemClock.sleep(450);inst.runOnMainSync(()->{StartupOverlay o=(StartupOverlay)field("launchOverlay");if(o!=null)o.dispose();WebView w=(WebView)field("web");w.stopLoading();w.loadDataWithBaseURL(url,"<!doctype html><html><head></head><body>Fixture only</body></html>","text/html","UTF-8",url);});
  SystemClock.sleep(600);js("window.guardErrors=[];window.addEventListener('error',e=>guardErrors.push(e.message));document.querySelectorAll('#mm43-common,#mm43-social-style').forEach(n=>n.remove());true");
 }
 @After public void finish(){if(activity!=null)inst.runOnMainSync(()->activity.finish());}
 @Test public void missingHeadDoesNotThrowAndReadyDocumentCanRetry()throws Exception{
  assertEquals("true",js("document.head.remove();document.head===null"));adapt(url);SystemClock.sleep(200);
  assertEquals("0",js("guardErrors.length"));assertEquals("true",js("!document.getElementById('mm43-social-style')"));
  js("document.documentElement.prepend(document.createElement('head'));true");adapt(url);SystemClock.sleep(200);
  assertEquals("true",js("!!document.getElementById('mm43-social-style')"));assertEquals("0",js("guardErrors.length"));
 }
 @Test public void obsoletePathOrAccountQueryCannotStyleNewDocument()throws Exception{
  adapt("https://marketmarney.com/grup-trader.html?group=synthetic");adapt("https://marketmarney.com/profil.html?user=other");SystemClock.sleep(150);
  assertEquals("true",js("!document.getElementById('mm43-social-style')"));assertEquals("0",js("guardErrors.length"));
 }
}
