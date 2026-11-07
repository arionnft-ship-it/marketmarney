package com.marketmarney.mobile;

import android.content.Intent;
import android.app.Activity;
import android.app.Instrumentation;
import android.net.Uri;
import android.util.Log;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import java.lang.reflect.Field;
import org.junit.Test;
import org.junit.Assume;
import static org.junit.Assert.*;

/** Engine classification and fixed native navigation only; no pages, accounts or writes. */
public class WebViewSupport420Test {
    private static final String OLD_UA = "Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36 Version/4.0 Chrome/74.0.3729.185 Mobile Safari/537.36";

    @Test public void stockWebView74RequiresAnUpdate() {
        WebViewSupport420.Result result = WebViewSupport420.fromVersions("74.0.3729.185", null);
        assertEquals(74, result.major);
        assertEquals("74.0.3729.185", result.version);
        assertEquals(WebViewSupport420.Source.WEBVIEW_PACKAGE, result.source);
        assertEquals(WebViewSupport420.Status.UPDATE_REQUIRED, result.status);
        assertTrue(result.requiresUpdate());
    }

    @Test public void supportedBoundaryIsMajor93() {
        assertTrue(WebViewSupport420.fromVersions("92.0.4515.159", null).requiresUpdate());
        assertEquals(WebViewSupport420.Status.SUPPORTED, WebViewSupport420.fromVersions("93.0.4577.82", null).status);
        assertEquals(WebViewSupport420.Status.SUPPORTED, WebViewSupport420.fromVersions("131.0.6778.200", null).status);
        assertFalse(WebViewSupport420.fromVersions("93", null).requiresUpdate());
    }

    @Test public void packageMetadataWinsOverConflictingUserAgent() {
        assertEquals(74, WebViewSupport420.fromVersions("74.0.3729.185", "Chrome/131.0.0.0").major);
        assertEquals(131, WebViewSupport420.fromVersions("131.0.6778.200", OLD_UA).major);
    }

    @Test public void fallbackReadsTheChromeTokenNotAndroidOrVersionTokens() {
        WebViewSupport420.Result result = WebViewSupport420.fromVersions(null, OLD_UA);
        assertEquals(74, result.major);
        assertEquals(WebViewSupport420.Source.USER_AGENT, result.source);
        assertTrue(result.requiresUpdate());
        assertEquals(93, WebViewSupport420.fromVersions("invalid", "Version/4.0 Chrome/93.0.4577.82 Mobile").major);
    }

    @Test public void malformedPackageStringsStayUnknown() {
        for (String raw : new String[]{null, "", "   ", "0", "-74.0", "v74.0", "74..1", "74.0/attack", "999999999999.0", "Chrome/74.0.0.0", "74.0\n93.0"}) {
            assertEquals(String.valueOf(raw), -1, WebViewSupport420.parsePackageMajor(raw));
        }
        assertEquals(93, WebViewSupport420.parsePackageMajor(" 93.0.4577.82 "));
    }

    @Test public void unknownEnginesAreNotBlanketBlocked() {
        for (String raw : new String[]{null, "", "Android 10 Version/4.0", "NotChrome/74.0.0.0", "Chrome/0.0.0.0", "Chrome/74.0.0.0.evil"}) {
            WebViewSupport420.Result result = WebViewSupport420.fromVersions(null, raw);
            assertEquals(String.valueOf(raw), WebViewSupport420.Status.UNKNOWN, result.status);
            assertFalse(result.requiresUpdate());
        }
    }

    @Test public void externalActionsUseOnlyFixedSafeHttpsDestinations() {
        Intent update = WebViewSupport420.updateIntent(), browser = WebViewSupport420.browserIntent();
        assertEquals(Intent.ACTION_VIEW, update.getAction());
        assertEquals(Intent.ACTION_VIEW, browser.getAction());
        assertTrue(update.hasCategory(Intent.CATEGORY_BROWSABLE));
        assertTrue(browser.hasCategory(Intent.CATEGORY_BROWSABLE));
        assertEquals("https://play.google.com/store/apps/details?id=com.google.android.webview", update.getDataString());
        assertEquals("https://marketmarney.com", browser.getDataString());
        for (Intent intent : new Intent[]{update, browser}) {
            Uri uri = intent.getData();
            assertEquals("https", uri.getScheme());
            assertNull(uri.getUserInfo());
            assertEquals(-1, uri.getPort());
            assertNull(uri.getFragment());
            assertNull(intent.getExtras());
        }
    }

    @Test public void instructionsExplainUpdateAndReopeningWithoutRequiringLogin() {
        String text = WebViewSupport420.instructions(WebViewSupport420.fromVersions("74.0.3729.185", null));
        assertTrue(text.contains("74.0.3729.185"));
        assertTrue(text.contains("93"));
        assertTrue(text.contains("Android System WebView"));
        assertTrue(text.contains("Chrome yang digunakan perangkat ini"));
        assertTrue(text.contains("buka Marney kembali"));
    }

    @Test public void storeDestinationFollowsOnlyAllowlistedProviders() {
        for (String provider : new String[]{"com.android.chrome", "com.chrome.beta", "com.chrome.dev", "com.chrome.canary", "com.google.android.webview", "com.google.android.webview.beta", "com.google.android.webview.dev", "com.google.android.webview.canary"}) {
            WebViewSupport420.Result result = WebViewSupport420.fromProvider(provider, "74.0.3729.185", null);
            assertEquals("https://play.google.com/store/apps/details?id=" + provider, WebViewSupport420.updateIntent(result).getDataString());
        }
        for (String provider : new String[]{"com.example.oem.webview", "com.android.chrome&redirect=evil", "https://evil.example", ""}) {
            WebViewSupport420.Result result = WebViewSupport420.fromProvider(provider, "74.0.3729.185", null);
            assertEquals(WebViewSupport420.UPDATE_URL, WebViewSupport420.updateIntent(result).getDataString());
        }
    }

    @Test public void currentDeviceEngineClassificationMatchesItsDetectedMajor() {
        final WebViewSupport420.Result[] result = {null};
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> result[0] = WebViewSupport420.detect(
                InstrumentationRegistry.getInstrumentation().getTargetContext()));
        assertNotNull(result[0]);
        Log.i("WebViewSupport420", "Observed engine " + result[0].version + "; major=" + result[0].major
                + "; status=" + result[0].status + "; source=" + result[0].source + "; provider=" + result[0].providerPackage);
        if (result[0].major < 0) {
            assertEquals(WebViewSupport420.Status.UNKNOWN, result[0].status);
            assertFalse(result[0].requiresUpdate());
        } else {
            assertEquals(result[0].major < WebViewSupport420.MINIMUM_MAJOR, result[0].requiresUpdate());
        }
    }

    @Test public void unsupportedDeviceGetsNativeGateBeforeAnyPageWebView() throws Exception {
        Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
        final WebViewSupport420.Result[] engine = {null};
        instrumentation.runOnMainSync(() -> engine[0] = WebViewSupport420.detect(instrumentation.getTargetContext()));
        Assume.assumeTrue("This UI test requires an observed unsupported engine", engine[0].requiresUpdate());
        Intent intent = new Intent(instrumentation.getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        Activity activity = instrumentation.startActivitySync(intent);
        try {
            UiDevice device = UiDevice.getInstance(instrumentation);
            assertTrue("Native update gate must be visible", device.wait(Until.hasObject(By.text("Perbarui komponen tampilan web")), 4000));
            Field web = MainActivity.class.getDeclaredField("web");
            web.setAccessible(true);
            instrumentation.runOnMainSync(() -> {
                try { assertNull("No unsupported page WebView may be created", web.get(activity)); }
                catch (IllegalAccessException error) { throw new AssertionError(error); }
                assertTrue("Repeated checks must continue gating", WebViewSupport420.showIfNeeded(activity));
            });
            device.pressBack();
            assertTrue("Back must not reveal an unsupported blank page", device.wait(Until.hasObject(By.text("Perbarui komponen tampilan web")), 2000));
            UiObject2 close = device.wait(Until.findObject(By.res("android:id/button2")), 3000);
            assertNotNull("Native close button must be available", close);
            String closeLabel = close.getText();
            assertTrue("Native close button must retain the Tutup action",
                    closeLabel != null && "Tutup".equalsIgnoreCase(closeLabel.trim()));
            close.click();
            instrumentation.waitForIdleSync();
            assertTrue("Close action finishes the guarded Activity", activity.isFinishing() || activity.isDestroyed());
        } finally {
            instrumentation.runOnMainSync(activity::finish);
        }
    }
}
