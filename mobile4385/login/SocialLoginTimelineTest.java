package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.SystemClock;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayInputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class SocialLoginTimelineTest {
    private static final String BASE = "https://marketmarney.com";
    private static final String FEED = BASE + "/beranda-trader.html#mm44-feed";
    private Instrumentation instrumentation;
    private MainActivity activity;
    private WebView web;
    private volatile boolean member;

    @Before public void setUp() throws Exception {
        instrumentation = InstrumentationRegistry.getInstrumentation();
        Intent start = new Intent(instrumentation.getTargetContext(), MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab", 4);
        activity = (MainActivity) instrumentation.startActivitySync(start);
        Field f = MainActivity.class.getDeclaredField("web");
        f.setAccessible(true);
        instrumentation.runOnMainSync(() -> {
            try { web = (WebView) f.get(activity); }
            catch (ReflectiveOperationException e) { throw new AssertionError(e); }
            web.stopLoading();
            WebViewClient appClient = web.getWebViewClient();
            web.setWebViewClient(new WebViewClient() {
                @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return appClient.shouldOverrideUrlLoading(view, request);
                }
                @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                    appClient.onPageStarted(view, url, icon);
                }
                @Override public void onPageCommitVisible(WebView view, String url) {
                    appClient.onPageCommitVisible(view, url);
                }
                @Override public void onPageFinished(WebView view, String url) {
                    appClient.onPageFinished(view, url);
                }
                @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    String path = request.getUrl().getPath();
                    if ("/api/community/status".equals(path)) {
                        return response("application/json", member ? "{\"user\":{\"username\":\"fixture\"}}" : "{\"user\":null}");
                    }
                    if (request.isForMainFrame()) return response("text/html", "<!doctype html><title>Uji Social</title><form id='authForm'></form>");
                    return response("text/plain", "");
                }
            });
        });
    }

    private static WebResourceResponse response(String type, String text) {
        return new WebResourceResponse(type, "UTF-8", new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
    }

    private String eval(String code) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(code, value -> { result.set(value); done.countDown(); }));
        assertTrue("WebView callback", done.await(5, TimeUnit.SECONDS));
        return result.get();
    }

    private void waitUntil(String code) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 8000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(eval(code))) return;
            SystemClock.sleep(50);
        }
        fail(code + " was false at " + eval("location.href"));
    }

    private void visit(String path) {
        instrumentation.runOnMainSync(() -> web.loadUrl(BASE + path));
    }

    @After public void close() {
        if (activity != null) instrumentation.runOnMainSync(activity::finish);
    }

    @Test public void settingsStaysForMemberButGuestLoginReturnsToTimelineEvenAfterDelay() throws Exception {
        member = true;
        visit("/akun.html?pengaturan=1");
        waitUntil("location.search==='?pengaturan=1' && !!window.__mmLoginReturnInstalled");
        eval("document.dispatchEvent(new CustomEvent('mm80-account-session',{detail:{user:{username:'fixture'}}}))");
        assertEquals("\"?pengaturan=1\"", eval("location.search"));
        member = false;
        eval("document.dispatchEvent(new CustomEvent('mm80-account-session',{detail:{user:null}}))");
        SystemClock.sleep(2200);
        assertEquals("\"/akun.html\"",eval("location.pathname"));
        member = true;
        eval("document.dispatchEvent(new Event('mm36-account-login'))");
        waitUntil("location.href==='" + FEED + "'");
        // Once the feed loads, a subsequent deliberate visit to a profile must remain there.
        visit("/profil.html?user=fixture");
        waitUntil("location.pathname==='/profil.html' && document.readyState==='complete'");
        assertEquals("false",eval("!!window.__mmLoginReturnInstalled"));
    }

    @Test public void accountRedirectToProfileAfterLoginGoesToFeed() throws Exception {
        visit("/akun.html");
        waitUntil("location.pathname==='/akun.html' && !!window.__mmLoginReturnInstalled");
        assertEquals("\"/akun.html\"",eval("location.pathname"));
        member = true;
        eval("location.replace('/profil.html?user=fixture')");
        waitUntil("location.href==='" + FEED + "'");
    }
}
