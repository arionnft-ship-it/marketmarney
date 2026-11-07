package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayInputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

/** Real APK HTML and every original script in Android WebView. API fixtures are
 * anonymous synthetic data; after fixture installation unmatched requests are denied.
 * MainActivity navigation/security are tested separately in their native suites. */
public class FullClient420Test {
    private static final String BASE="https://marketmarney.com";
    private static final String SOCIAL_DOCUMENT="location.href.split('#')[0]==='https://marketmarney.com/beranda-trader.html'";
    private static final AtomicBoolean ENGINE_LOGGED=new AtomicBoolean();
    private static final String USER="{\"username\":\"qa_fixture\",\"displayName\":\"Studio Uji\"}";
    private static final String PROFILE="{\"profile\":{\"username\":\"qa_fixture\",\"displayName\":\"Studio Uji\",\"bio\":\"Data simulasi QA\",\"avatarUrl\":null}}";
    private static final String FEED="{\"items\":[{\"id\":\"qa-post-1\",\"username\":\"qa_fixture\",\"displayName\":\"Studio Uji\",\"body\":\"Konten simulasi QA\",\"createdAt\":1794052800000,\"avatarUrl\":null,\"imageUrl\":null,\"videoUrl\":null,\"comments\":0,\"reactions\":{\"total\":0,\"items\":[],\"mine\":null}}],\"hasMore\":false}";
    private Instrumentation inst;
    private MainActivity activity;
    private WebView web;
    private AppResources49 resources;
    private final AtomicInteger writes=new AtomicInteger(),profileReads=new AtomicInteger(),accountNavigations=new AtomicInteger();
    private final AtomicReference<String> fixtureFailure=new AtomicReference<>();
    private final AtomicReference<String> scriptFailure=new AtomicReference<>();
    private final CountDownLatch statusBlocked=new CountDownLatch(1);
    private final Set<String> unknownApis=Collections.synchronizedSet(new HashSet<>());
    private volatile boolean profileFails=false,guest=false;
    private volatile CountDownLatch statusGate;

    private Object field(String name){try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}catch(Exception e){throw new RuntimeException(e);}}
    private WebResourceResponse reply(int status,String mime,String content){
        return new WebResourceResponse(mime,"UTF-8",status,status==200?"OK":"Fixture error",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8)));
    }
    private WebResourceResponse fixture(WebResourceRequest request){
        if(!"GET".equals(request.getMethod())){writes.incrementAndGet();return reply(405,"application/json","{\"error\":\"QA denies writes\"}");}
        if(!Recovery414.trusted(request.getUrl().toString()))return reply(404,"text/plain","");
        String path=request.getUrl().getPath();
        if(path.startsWith("/api/")){
            if(path.equals("/api/community/status")){
                CountDownLatch gate=statusGate;
                if(gate!=null){
                    statusBlocked.countDown();
                    try{
                        if(!gate.await(30,TimeUnit.SECONDS)){
                            fixtureFailure.compareAndSet(null,"Session gate timed out before the test released it");
                            return reply(504,"application/json","{\"error\":\"Fixture gate timed out\"}");
                        }
                    }catch(InterruptedException e){
                        Thread.currentThread().interrupt();
                        fixtureFailure.compareAndSet(null,"Session gate interrupted");
                        return reply(503,"application/json","{\"error\":\"Fixture interrupted\"}");
                    }
                }
                return reply(200,"application/json",guest?"{\"user\":null}":"{\"user\":"+USER+"}");
            }
            if(path.equals("/api/community/me"))return reply(guest?401:200,"application/json",guest?"{\"error\":\"Guest\"}":"{\"user\":"+USER+"}");
            if(path.equals("/api/trader-profiles/me")){profileReads.incrementAndGet();return reply(profileFails?503:200,"application/json",profileFails?"{\"error\":\"Profil sementara tidak tersedia\"}":PROFILE);}
            if(path.equals("/api/trader-profiles/feed"))return reply(200,"application/json",FEED);
            if(path.equals("/api/trader-follow/me"))return reply(200,"application/json","{\"followerCount\":0,\"followingCount\":0,\"followers\":[],\"following\":[],\"theme\":\"light\"}");
            if(path.equals("/api/trader-connect/groups"))return reply(200,"application/json","{\"mine\":[],\"discover\":[]}");
            if(path.equals("/api/trader-profiles/stories")||path.equals("/api/trader-connect/conversations")||path.equals("/api/trader-connect/reels"))return reply(200,"application/json","{\"items\":[],\"unread\":0}");
            if(path.equals("/api/trader-connect/unread")||path.equals("/api/trader-notifications/count"))return reply(guest?401:200,"application/json","{\"unread\":0}");
            if(path.equals("/api/content"))return reply(200,"application/json","{\"articles\":[]}");
            unknownApis.add(path);return reply(404,"application/json","{\"error\":\"No fixture\"}");
        }
        WebResourceResponse local=resources.respond(request,"full-client-test");
        if(local!=null)return local;
        // Login is a destination assertion only; it must never load an actual account.
        if(path.equals("/akun.html")){
            if(request.isForMainFrame())accountNavigations.incrementAndGet();
            return reply(200,"text/html","<!doctype html><title>QA account destination</title>");
        }
        return reply(404,"text/plain","");
    }
    private String js(String expression)throws Exception{
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        String script="(function(){try{return {ok:true,value:("+expression+")};}catch(e){return {ok:false,error:String(e)};}})()";
        inst.runOnMainSync(()->web.evaluateJavascript(script,r->{value.set(r);done.countDown();}));
        assertTrue("Responsive WebView JavaScript callback",done.await(5,TimeUnit.SECONDS));
        assertNull("Fixture request failure",fixtureFailure.get());
        assertNull("Uncaught page JavaScript error",scriptFailure.get());
        JSONObject result=new JSONObject(value.get());
        assertTrue("JavaScript failed: "+result.optString("error")+"; expression: "+expression,result.optBoolean("ok"));
        Object output=result.opt("value");
        return output instanceof String?JSONObject.quote((String)output):String.valueOf(output);
    }
    private void click(String elementExpression)throws Exception{
        assertEquals("Interaction must execute successfully","true",js("(function(){var el=("+elementExpression+");if(!el)throw Error('Missing interaction target');var r=el.getBoundingClientRect(),s=getComputedStyle(el);if(el.disabled||!r.width||!r.height||s.visibility==='hidden'||s.pointerEvents==='none')throw Error('Interaction target is not usable');var failure='';function report(e){failure=String(e.message||'Interaction error')}window.addEventListener('error',report);try{el.click();if(failure)throw Error(failure);return true;}finally{window.removeEventListener('error',report)}})()"));
    }
    private void assertSocialDocument()throws Exception{
        assertEquals("Social document must remain active","true",js(SOCIAL_DOCUMENT));
        assertEquals("Social interaction must not navigate to login",0,accountNavigations.get());
    }
    private void until(String expression)throws Exception{
        long end=SystemClock.uptimeMillis()+8000;
        while(SystemClock.uptimeMillis()<end){if("true".equals(js(expression)))return;SystemClock.sleep(100);}
        assertEquals(expression,"true",js(expression));
    }
    private void open()throws Exception{
        inst.runOnMainSync(()->web.loadUrl(BASE+"/beranda-trader.html"));
        until("("+SOCIAL_DOCUMENT+") && !!document.querySelector('#mm44-social-header') && !!window.__mm411BundledReady");
    }
    @Before public void setUp(){
        inst=InstrumentationRegistry.getInstrumentation();
        activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
        inst.runOnMainSync(()->{
            StartupOverlay overlay=(StartupOverlay)field("launchOverlay");if(overlay!=null)overlay.dispose();
            web=(WebView)field("web");web.stopLoading();
            resources=AppResources49.install(activity);
            web.setWebViewClient(new WebViewClient(){@Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return fixture(request);}});
            web.setWebChromeClient(new WebChromeClient(){@Override public boolean onConsoleMessage(ConsoleMessage message){
                String text=message.message();
                if(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR&&text!=null&&(text.contains("Uncaught")||text.contains("SyntaxError"))){
                    String detail="line "+message.lineNumber()+": "+text.substring(0,Math.min(500,text.length()));
                    if(scriptFailure.compareAndSet(null,detail))Log.e("MM420_FULL_JS",detail);
                }
                return true;
            }});
            ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient(){@Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request){return fixture(request);}});
            if(Build.VERSION.SDK_INT>=26&&ENGINE_LOGGED.compareAndSet(false,true)){
                PackageInfo engine=WebView.getCurrentWebViewPackage();
                Log.i("MM420_WEBVIEW",engine==null?"WebView package unavailable":engine.packageName+" "+engine.versionName);
            }
        });
    }
    @After public void tearDown(){
        CountDownLatch gate=statusGate;if(gate!=null)gate.countDown();
        if(activity!=null){
            inst.runOnMainSync(()->{if(web!=null){web.stopLoading();web.getSettings().setBlockNetworkLoads(true);}activity.finish();});
            inst.waitForIdleSync();
            inst.runOnMainSync(()->AppResources49.install(inst.getTargetContext()));
        }
        assertNull("Fixture request failure",fixtureFailure.get());
        assertNull("Uncaught page JavaScript error",scriptFailure.get());
        assertEquals("No real or simulated mutation should be sent",0,writes.get());
        assertTrue("All API reads use explicit fixtures: "+unknownApis,unknownApis.isEmpty());
    }
    @Test public void profileFailureKeepsSessionFeedAndAccountDrawerUsable()throws Exception{
        profileFails=true;open();
        until("("+SOCIAL_DOCUMENT+") && document.querySelector('#shLogged') && !document.querySelector('#shLogged').hidden && [...document.querySelectorAll('#shFeed .sh-post')].some(p=>p.textContent.includes('Konten simulasi QA'))");
        assertEquals("true",js("document.querySelector('#shGuest').hidden"));
        assertTrue("The failing profile request was actually made",profileReads.get()>0);
        click("document.querySelector('#mm44-social-header button[aria-label=\"Menu Social Marney\"]')");
        until("document.querySelector('#mm44-create-menu').open");
        click("document.querySelector('[data-mm420-account]')");
        until("("+SOCIAL_DOCUMENT+") && document.querySelector('#shMobileAccountDialog').open");
        click("document.querySelector('#shMobileAccountClose')");
        until("("+SOCIAL_DOCUMENT+") && !document.querySelector('#shMobileAccountDialog').open");
        assertSocialDocument();
    }
    @Test public void earlyReelsTapWaitsForSessionInsteadOfSendingUserToLogin()throws Exception{
        statusGate=new CountDownLatch(1);open();
        assertTrue("The session response must still be blocked",statusBlocked.await(5,TimeUnit.SECONDS));
        assertEquals(1L,statusGate.getCount());
        click("[...document.querySelectorAll('.mm44-nav-button')].find(b=>/Reels/i.test(b.getAttribute('aria-label')||b.textContent))");
        assertSocialDocument();
        statusGate.countDown();
        until("("+SOCIAL_DOCUMENT+") && !document.querySelector('#shLogged').hidden && document.documentElement.dataset.mm44View==='reels'");
        assertSocialDocument();
    }
    @Test public void explicitGuestStillRequiresSignInForPrivateFeatures()throws Exception{
        guest=true;open();
        until("("+SOCIAL_DOCUMENT+") && document.documentElement.dataset.mmAuthState==='guest'");
        click("[...document.querySelectorAll('.mm44-nav-button')].find(b=>/Reels/i.test(b.getAttribute('aria-label')||b.textContent))");
        until("location.origin==='https://marketmarney.com' && location.pathname==='/akun.html' && document.title==='QA account destination'");
        assertEquals("The guest action must request the account document",1,accountNavigations.get());
    }
}
