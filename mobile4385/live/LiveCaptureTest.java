package com.marketmarney.mobile;

import android.net.Uri;
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
}
