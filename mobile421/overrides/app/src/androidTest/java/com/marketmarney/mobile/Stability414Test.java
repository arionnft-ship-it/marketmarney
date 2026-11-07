package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.filters.SdkSuppress;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import static org.junit.Assert.*;

/** Uses synthetic local HTML. No credentials, messages, uploads or market writes. */
@SdkSuppress(minSdkVersion=26)
public class Stability414Test {
 private Instrumentation inst; private MainActivity activity;
 private static final String BASE="https://marketmarney.com",NEWS=BASE+"/__android43/news";
 private void ui(Runnable r){inst.runOnMainSync(r);}
 private Object field(String name){try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}catch(Exception e){throw new RuntimeException(e);}}
 private Object call(String name,Class<?>[] types,Object...args){try{Method m=MainActivity.class.getDeclaredMethod(name,types);m.setAccessible(true);return m.invoke(activity,args);}catch(Exception e){throw new RuntimeException(e);}}
 private void fixture(String url){
  FixtureDocumentClient420[] client={null};
  ui(()->client[0]=FixtureDocumentClient420.load((WebView)field("web"),url,"<!doctype html><html><body>Local test page</body></html>"));
  try{assertTrue("Fixture document marker, URL and readiness committed",client[0].awaitReady(inst,()->(WebView)field("web")));}
  catch(InterruptedException e){Thread.currentThread().interrupt();throw new AssertionError("Fixture wait interrupted",e);}
 }
 private void capture(String name){try{File dir=new File(activity.getExternalFilesDir(null),"stability-tests");dir.mkdirs();try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){inst.getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}}catch(Exception e){throw new RuntimeException(e);}}
 @Before public void setup(){
  inst=InstrumentationRegistry.getInstrumentation();
  activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
  ui(()->{StartupOverlay s=(StartupOverlay)field("launchOverlay");if(s!=null)s.dispose();});fixture(NEWS);
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
  ui(()->{String r=(String)call("appReport",new Class[]{});assertTrue(r.contains("4.21.0-beta"));assertTrue(r.contains("Berita"));assertFalse(r.contains("http"));assertFalse(r.contains("mm_reader="));assertFalse(r.contains("?user="));});
 }
 @Test public void longPressProvidesAppOptionsWithoutNavigation(){
  ui(()->{Object w=field("web");assertTrue(((LinearLayout)field("bottom")).getChildAt(1).performLongClick());assertSame(w,field("web"));assertEquals(1,field("tab"));});SystemClock.sleep(150);capture("app-options");
 }
}

/** A real document URL with explicit local HTML; preserves the native client's policy and callbacks. */
final class FixtureDocumentClient420 extends WebViewClient {
 private final WebView target;
 private final WebViewClient delegate;
 private final String url;
 private final String marker=java.util.UUID.randomUUID().toString();
 private final byte[] html;
 private FixtureDocumentClient420(WebView target,WebViewClient delegate,String url,String html){
  if(!Recovery414.trusted(url))throw new IllegalArgumentException("Untrusted fixture URL");
  String marked=html.replaceFirst("(?i)<html(?=[\\s>])","<html data-mm420-fixture=\""+marker+"\"");
  if(marked.equals(html))throw new IllegalArgumentException("Fixture HTML root missing");
  this.target=target;this.delegate=delegate;this.url=url;this.html=marked.getBytes(java.nio.charset.StandardCharsets.UTF_8);
 }
 static FixtureDocumentClient420 load(WebView target,String url,String html){
  WebViewClient delegate=target.getWebViewClient();
  if(delegate instanceof FixtureDocumentClient420)delegate=((FixtureDocumentClient420)delegate).delegate;
  if(delegate==null)throw new IllegalStateException("Native WebViewClient missing");
  FixtureDocumentClient420 fixture=new FixtureDocumentClient420(target,delegate,url,html);
  target.stopLoading();target.setWebViewClient(fixture);target.loadUrl(url);return fixture;
 }
 boolean isCurrent(WebView current){return current==target&&url.equals(current.getUrl())&&current.getProgress()==100;}
 boolean awaitReady(Instrumentation inst,java.util.function.Supplier<WebView> current)throws InterruptedException{
  long deadline=SystemClock.uptimeMillis()+8000;
  String check="(function(){return location.href==="+org.json.JSONObject.quote(url)+"&&document.readyState==='complete'&&!!document.documentElement&&document.documentElement.getAttribute('data-mm420-fixture')==="+org.json.JSONObject.quote(marker)+";})()";
  // The bootstrap News page can finish after loadUrl requests this same URL.
  // Only the marker served in this fixture's HTML identifies the new document.
  while(SystemClock.uptimeMillis()<deadline){
   CountDownLatch evaluated=new CountDownLatch(1);
   java.util.concurrent.atomic.AtomicBoolean ready=new java.util.concurrent.atomic.AtomicBoolean();
   inst.runOnMainSync(()->{
    if(!isCurrent(current.get())){evaluated.countDown();return;}
    target.evaluateJavascript(check,result->{ready.set("true".equals(result)&&isCurrent(current.get()));evaluated.countDown();});
   });
   long remaining=deadline-SystemClock.uptimeMillis();
   if(remaining<=0)return false;
   if(evaluated.await(Math.min(500,remaining),TimeUnit.MILLISECONDS)&&ready.get())return true;
   remaining=deadline-SystemClock.uptimeMillis();
   if(remaining>0)Thread.sleep(Math.min(75,remaining));
  }
  return false;
 }
 @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,android.webkit.WebResourceRequest request){
  if(request.isForMainFrame()&&"GET".equals(request.getMethod())&&url.equals(request.getUrl().toString())){
   return new android.webkit.WebResourceResponse("text/html","UTF-8",200,"OK",java.util.Collections.singletonMap("Cache-Control","no-store"),new java.io.ByteArrayInputStream(html));
  }
  return delegate.shouldInterceptRequest(view,request);
 }
 @Override public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view,String url){return delegate.shouldInterceptRequest(view,url);}
 @Override public boolean shouldOverrideUrlLoading(WebView view,android.webkit.WebResourceRequest request){return delegate.shouldOverrideUrlLoading(view,request);}
 @Override public boolean shouldOverrideUrlLoading(WebView view,String url){return delegate.shouldOverrideUrlLoading(view,url);}
 @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap favicon){delegate.onPageStarted(view,url,favicon);}
 @Override public void onPageCommitVisible(WebView view,String url){delegate.onPageCommitVisible(view,url);}
 @Override public void onPageFinished(WebView view,String url){delegate.onPageFinished(view,url);}
 @Override public void doUpdateVisitedHistory(WebView view,String url,boolean reload){delegate.doUpdateVisitedHistory(view,url,reload);}
 @Override public void onReceivedError(WebView view,android.webkit.WebResourceRequest request,android.webkit.WebResourceError error){delegate.onReceivedError(view,request,error);}
 @Override public void onReceivedError(WebView view,int code,String description,String failingUrl){delegate.onReceivedError(view,code,description,failingUrl);}
 @Override public void onReceivedHttpError(WebView view,android.webkit.WebResourceRequest request,android.webkit.WebResourceResponse response){delegate.onReceivedHttpError(view,request,response);}
 @Override public void onReceivedSslError(WebView view,android.webkit.SslErrorHandler handler,android.net.http.SslError error){delegate.onReceivedSslError(view,handler,error);}
 @Override public boolean onRenderProcessGone(WebView view,android.webkit.RenderProcessGoneDetail detail){return delegate.onRenderProcessGone(view,detail);}
}
