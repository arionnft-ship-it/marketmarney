package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.View;
import android.webkit.WebView;
import android.widget.LinearLayout;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import static org.junit.Assert.*;

/** Focused local checks. No login, upload, account read or production write. */
public class LightOnly425Test {
    private Instrumentation inst;
    private MainActivity activity;

    private void ui(Runnable action) { inst.runOnMainSync(action); }

    private Object field(String name) {
        try {
            Field value = MainActivity.class.getDeclaredField(name);
            value.setAccessible(true);
            return value.get(activity);
        } catch (Exception error) {
            throw new RuntimeException(error);
        }
    }

    private void set(String name, Object value) {
        try {
            Field target = MainActivity.class.getDeclaredField(name);
            target.setAccessible(true);
            target.set(activity, value);
        } catch (Exception error) {
            throw new RuntimeException(error);
        }
    }

    private Object call(String name) {
        try {
            Method target = MainActivity.class.getDeclaredMethod(name);
            target.setAccessible(true);
            return target.invoke(activity);
        } catch (Exception error) {
            throw new RuntimeException(error);
        }
    }

    private String asset(String name) throws Exception {
        try (InputStream in = activity.getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private void assertLightSystemBars() {
        int status = activity.getWindow().getStatusBarColor();
        int navigation = activity.getWindow().getNavigationBarColor();
        // Android 15 may enforce transparent edge-to-edge system bars. Their
        // underlying app canvas is white and light-system-icon flags stay set.
        assertTrue("Status bar is white or transparent", status == Color.WHITE || Color.alpha(status) == 0);
        assertTrue("Navigation bar is white or transparent", navigation == Color.WHITE || Color.alpha(navigation) == 0);
        int flags = activity.getWindow().getDecorView().getSystemUiVisibility();
        assertTrue((flags & View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR) != 0);
        assertTrue((flags & View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) != 0);
        LinearLayout root = (LinearLayout) field("root");
        assertTrue(root.getBackground() instanceof ColorDrawable);
        assertEquals(Color.WHITE, ((ColorDrawable) root.getBackground()).getColor());
    }

    @Before public void setup() {
        inst = InstrumentationRegistry.getInstrumentation();
        activity = (MainActivity) inst.startActivitySync(new Intent(inst.getTargetContext(), MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab", 1));
        ui(() -> {
            StartupOverlay overlay = (StartupOverlay) field("launchOverlay");
            if (overlay != null) overlay.dispose();
            WebView web = (WebView) field("web");
            if (web != null) web.stopLoading();
        });
    }

    @After public void cleanup() {
        if (activity != null) ui(() -> activity.finish());
    }

    @Test public void nativeChromeRemainsLightEvenWhenReelsIsActive() {
        ui(() -> {
            set("reelsChrome", true);
            set("chromeLight", false);
            call("updateSocialChrome");
            assertEquals(Boolean.TRUE, field("chromeLight"));
            assertEquals(Boolean.TRUE, call("lightSocial"));
            assertLightSystemBars();
            LinearLayout bottom = (LinearLayout) field("bottom");
            assertNotNull(bottom.getBackground());
            assertEquals(5, bottom.getChildCount());
        });
    }

    @Test public void appReportIdentifiesTheLightOnlyRelease() {
        ui(() -> {
            String report = (String) call("appReport");
            assertTrue(report.contains("4.25.0-beta"));
            assertFalse(report.contains("http"));
        });
    }

    @Test public void exactLightAssetsArePackaged() throws Exception {
        String script = asset("light425.js");
        String css = asset("light425.css");
        assertTrue(script.contains("window.MMLight425"));
        assertTrue(script.contains("data-mm-light-only"));
        assertTrue(script.contains("localStorage.setItem"));
        assertFalse(script.contains("setInterval("));
        assertFalse(script.contains("fetch("));
        assertTrue(css.contains("data-mm-light-only=\"425\""));
        assertTrue(css.contains("data-mm46-reels"));
        assertTrue(css.contains("#shTheme"));
        assertFalse(css.contains("color-scheme:dark!important"));
    }

    @Test public void darkToneReportsCannotTurnNativeChromeDark() {
        ui(() -> {
            set("chromeLight", true);
            try {
                Method method = MainActivity.class.getDeclaredMethod("applyChromeTheme", WebView.class, boolean.class);
                method.setAccessible(true);
                method.invoke(activity, field("web"), false);
            } catch (Exception error) {
                throw new RuntimeException(error);
            }
            assertEquals(Boolean.TRUE, field("chromeLight"));
            assertLightSystemBars();
        });
    }
}
