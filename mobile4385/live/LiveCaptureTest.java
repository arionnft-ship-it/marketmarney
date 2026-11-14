package com.marketmarney.mobile;

import android.Manifest;
import android.app.Instrumentation;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.SystemClock;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import java.io.ByteArrayInputStream;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import android.webkit.PermissionRequest;
import org.junit.Test;
import static org.junit.Assert.*;

public class LiveCaptureTest {
    @Test public void captureIsRestrictedToPublisherOnTrustedLivePage() {
        assertTrue(LiveCapture.hostPage("https://marketmarney.com/live.html#siarkan"));
        assertTrue(LiveCapture.hostPage("https://marketmarney.com/live.html?host=active"));
        assertTrue(LiveCapture.hostPage("https://marketmarney.com/live.html?from=reels"));
        for (String url : new String[]{null, "http://marketmarney.com/live.html",
                "https://marketmarney.com:444/live.html", "https://outside.example/live.html",
                "https://someone@marketmarney.com/live.html", "https://marketmarney.com/beranda-trader.html",
                "https://marketmarney.com/live.html?watch=abc", "https://marketmarney.com/live.html?watch="}) {
            assertFalse(url, LiveCapture.hostPage(url));
        }
    }

    @Test public void missingOrDetachedWebViewCannotCapture() {
        final boolean[] denied = {false};
        PermissionRequest request = new PermissionRequest() {
            @Override public Uri getOrigin() { return Uri.parse("https://marketmarney.com"); }
            @Override public String[] getResources() { return new String[]{RESOURCE_VIDEO_CAPTURE}; }
            @Override public void grant(String[] allowed) { fail("Unexpected capture grant"); }
            @Override public void deny() { denied[0] = true; }
        };
        new LiveCapture(null).request(null, null, request);
        assertTrue(denied[0]);
    }

    private static final class CaptureRequest extends PermissionRequest {
        final CountDownLatch done = new CountDownLatch(1);
        volatile String[] resources;
        @Override public Uri getOrigin() { return Uri.parse("https://marketmarney.com"); }
        @Override public String[] getResources() { return new String[]{RESOURCE_VIDEO_CAPTURE, RESOURCE_AUDIO_CAPTURE}; }
        @Override public void grant(String[] granted) { resources = granted; done.countDown(); }
        @Override public void deny() { done.countDown(); }
    }

    private static void loadLive(Instrumentation inst, WebView web, String suffix) throws Exception {
        String url = "https://marketmarney.com/live.html" + suffix;
        CountDownLatch loaded = new CountDownLatch(1);
        inst.runOnMainSync(() -> {
            web.setWebViewClient(new WebViewClient() {
                @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                    byte[] html = "<!doctype html><title>Live fixture</title><main>Live Marney</main>"
                            .getBytes(StandardCharsets.UTF_8);
                    return new WebResourceResponse("text/html", "utf-8", new ByteArrayInputStream(html));
                }
                @Override public void onPageFinished(WebView v, String current) {
                    if (url.equals(current)) loaded.countDown();
                }
            });
            web.loadUrl(url);
        });
        assertTrue("Local fixture did not open", loaded.await(15,TimeUnit.SECONDS));
    }

    @Test public void hostReceivesAndroidGrantsAndViewerCannotUseThem() throws Exception {
        Instrumentation inst = InstrumentationRegistry.getInstrumentation();
        Intent intent = new Intent(inst.getTargetContext(), MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK)
                .putExtra("startTab", 4);
        MainActivity activity = (MainActivity)inst.startActivitySync(intent);
        try {
            Field field = MainActivity.class.getDeclaredField("web");
            field.setAccessible(true);
            WebView web = (WebView)field.get(activity);
            assertNotNull(web);
            loadLive(inst, web, "#siarkan");
            CaptureRequest host = new CaptureRequest();
            boolean needsDialog = activity.checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
                    activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED;
            inst.runOnMainSync(() -> web.getWebChromeClient().onPermissionRequest(host));
            UiDevice device = UiDevice.getInstance(inst);
            int clicks = 0;
            long deadline = SystemClock.elapsedRealtime() + 20000;
            while (host.done.getCount() > 0 && SystemClock.elapsedRealtime() < deadline) {
                UiObject2 allow = device.wait(Until.findObject(By.res(Pattern.compile(
                        ".*:id/permission_allow_(foreground_only_)?button"))), 750);
                if (allow != null) {
                    try { allow.click(); clicks++; } catch (androidx.test.uiautomator.StaleObjectException ignored) {}
                }
            }
            assertTrue("Android requested permission from the user", !needsDialog || clicks > 0);
            assertTrue("Host permission callback", host.done.await(3, TimeUnit.SECONDS));
            assertNotNull("Runtime permission was denied to the host", host.resources);
            assertEquals(new HashSet<>(Arrays.asList(host.getResources())), new HashSet<>(Arrays.asList(host.resources)));

            loadLive(inst, web, "?watch=fixture");
            CaptureRequest viewer = new CaptureRequest();
            inst.runOnMainSync(() -> web.getWebChromeClient().onPermissionRequest(viewer));
            assertTrue("Viewer request completed without prompting", viewer.done.await(1, TimeUnit.SECONDS));
            assertNull("Viewer cannot capture even after an earlier host grant", viewer.resources);

            inst.runOnMainSync(() -> web.evaluateJavascript(
                    "window.rtcProbe='pending';navigator.mediaDevices.getUserMedia({audio:true,video:true})"
                    + ".then(function(s){s.getTracks().forEach(function(t){t.stop()});window.rtcProbe='captured'})"
                    + ".catch(function(e){window.rtcProbe=e.name})", null));
            AtomicReference<String> js = new AtomicReference<>("");
            deadline = SystemClock.elapsedRealtime() + 12000;
            do {
                CountDownLatch read = new CountDownLatch(1);
                inst.runOnMainSync(() -> web.evaluateJavascript("window.rtcProbe", value -> { js.set(value); read.countDown(); }));
                assertTrue(read.await(2, TimeUnit.SECONDS));
                if (!js.get().equals("\"pending\"")) break;
                SystemClock.sleep(100);
            } while (SystemClock.elapsedRealtime() < deadline);
            assertTrue("Viewer getUserMedia must reject: " + js.get(),
                    js.get().equals("\"NotAllowedError\"") || js.get().equals("\"NotFoundError\"")
                    || js.get().equals("\"NotReadableError\""));
        } finally {
            inst.runOnMainSync(activity::finish);
        }
    }
}
