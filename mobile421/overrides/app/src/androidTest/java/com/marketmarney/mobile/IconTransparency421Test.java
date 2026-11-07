package com.marketmarney.mobile;

import android.app.ActivityManager;
import android.app.Instrumentation;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Rect;
import android.graphics.Region;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.SystemClock;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;

/** One compiled-icon visual check. Does not start an app Activity or access any service. */
public class IconTransparency421Test {
    @Test public void compiledAdaptiveIconHasTransparentInteriorAndVisibleLogo() throws Exception {
        Instrumentation inst = InstrumentationRegistry.getInstrumentation();
        Context context = inst.getTargetContext();
        ActivityManager manager = context.getSystemService(ActivityManager.class);
        assertNotNull("Launcher icon sizing service available", manager);
        int size = manager.getLauncherLargeIconSize();
        assertTrue("Device launcher icon size is within a reasonable allocation bound: " + size,
                size >= 24 && size <= 1024);
        int edge = Math.max(1, Math.round(size / 256f));
        File dir = new File(context.getExternalFilesDir(null), "icon421-evidence");
        assertTrue("Evidence directory available", dir.isDirectory() || dir.mkdirs());
        JSONObject evidence = new JSONObject();
        evidence.put("scope", "Compiled adaptive icon on this device; launcher observation is recorded separately");
        evidence.put("sdk", Build.VERSION.SDK_INT);
        evidence.put("package", context.getPackageName());
        PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
        evidence.put("versionName", info.versionName);
        evidence.put("versionCode", info.getLongVersionCode());
        evidence.put("installedApkSha256", sha256(new File(context.getApplicationInfo().sourceDir)));
        evidence.put("bitmapSize", size);
        evidence.put("launcherIconSizePx", size);
        evidence.put("launcherIconDensityDpi", manager.getLauncherLargeIconDensity());
        evidence.put("displayDensityDpi", context.getResources().getDisplayMetrics().densityDpi);
        evidence.put("displayDensity", context.getResources().getDisplayMetrics().density);
        evidence.put("maskInteriorEdgeMarginPx", edge);

        Drawable loaded = context.getPackageManager().getApplicationIcon(context.getPackageName());
        evidence.put("drawableClass", loaded.getClass().getName());
        if (!(loaded instanceof AdaptiveIconDrawable)) {
            evidence.put("compiledIconPassed", false);
            writeJson(dir, evidence);
            fail("Installed API 35 application icon must be an AdaptiveIconDrawable; see evidence JSON");
        }
        AdaptiveIconDrawable icon = (AdaptiveIconDrawable) loaded;
        icon.setBounds(0, 0, size, size);
        Region mask = new Region();
        mask.setPath(new Path(icon.getIconMask()), new Region(0, 0, size, size));

        Bitmap rendered = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        rendered.eraseColor(Color.TRANSPARENT);
        icon.draw(new Canvas(rendered));
        savePng(dir, "compiled-icon-transparent.png", rendered);
        Bitmap checker = checkerboard(rendered);
        savePng(dir, "compiled-icon-checkerboard.png", checker);
        checker.recycle();

        // The corners outside an adaptive mask are transparent even with an opaque plate.
        // Only pixels safely inside the real platform mask count; the edge margin scales
        // with the device's actual launcher icon size rather than an arbitrary render size.
        int interior = 0, transparent = 0, visible = 0, opaque = 0;
        for (int y = edge; y < size - edge; y++) {
            for (int x = edge; x < size - edge; x++) {
                if (!strictInterior(mask, x, y, edge)) continue;
                interior++;
                int alpha = Color.alpha(rendered.getPixel(x, y));
                if (alpha == 0) transparent++;
                if (alpha > 0) visible++;
                if (alpha == 255) opaque++;
            }
        }
        evidence.put("maskInteriorPixels", interior);
        evidence.put("interiorAlphaZeroPixels", transparent);
        evidence.put("interiorVisiblePixels", visible);
        evidence.put("interiorOpaquePixels", opaque);
        evidence.put("interiorAlphaZeroFraction", interior == 0 ? 0 : (double) transparent / interior);
        evidence.put("minimumTransparentInteriorFraction", 0.20);
        evidence.put("minimumVisibleInteriorFraction", 0.01);

        // Draw the actual compiled background layer separately, retaining the bounds that
        // AdaptiveIconDrawable assigned. This rejects the old navy plate directly.
        Bitmap background = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        background.eraseColor(Color.TRANSPARENT);
        Drawable layer = icon.getBackground();
        evidence.put("backgroundDrawablePresent", layer != null);
        if (layer != null) layer.draw(new Canvas(background));
        int backgroundNonzero = 0;
        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                if (Color.alpha(background.getPixel(x, y)) != 0) backgroundNonzero++;
            }
        }
        evidence.put("backgroundNonzeroAlphaPixels", backgroundNonzero);
        savePng(dir, "compiled-background-transparent.png", background);
        background.recycle();
        rendered.recycle();

        boolean passed = layer != null && interior > size * size / 2
                && transparent > interior / 5 && visible > interior / 100
                && backgroundNonzero == 0;
        evidence.put("compiledIconPassed", passed);
        // Write before the optional launcher probe so compiled evidence survives UI trouble.
        writeJson(dir, evidence);
        evidence.put("launcher", observeLauncher(inst, context, dir));
        writeJson(dir, evidence);

        assertNotNull("Compiled adaptive background layer exists", layer);
        assertTrue("Real adaptive mask contains a substantial interior", interior > size * size / 2);
        assertEquals("Compiled background must contain no opaque or translucent plate", 0, backgroundNonzero);
        assertTrue("At least 20% of pixels INSIDE the adaptive mask must be fully transparent", transparent > interior / 5);
        assertTrue("Logo remains visibly present; an empty icon must fail", visible > interior / 100);
    }

    private static boolean strictInterior(Region mask, int x, int y, int edge) {
        return mask.contains(x, y) && mask.contains(x - edge, y) && mask.contains(x + edge, y)
                && mask.contains(x, y - edge) && mask.contains(x, y + edge)
                && mask.contains(x - edge, y - edge) && mask.contains(x + edge, y - edge)
                && mask.contains(x - edge, y + edge) && mask.contains(x + edge, y + edge);
    }

    private static Bitmap checkerboard(Bitmap icon) {
        int size = icon.getWidth();
        int cell = Math.max(4, size / 16);
        Bitmap result = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(result);
        Paint paint = new Paint();
        for (int y = 0; y < size; y += cell) {
            for (int x = 0; x < size; x += cell) {
                paint.setColor(((x / cell + y / cell) & 1) == 0 ? 0xffedf2f7 : 0xffa8c0d0);
                canvas.drawRect(x, y, x + cell, y + cell, paint);
            }
        }
        canvas.drawBitmap(icon, 0, 0, null);
        return result;
    }

    private static JSONObject observeLauncher(Instrumentation inst, Context context, File dir) {
        JSONObject result = new JSONObject();
        long started = SystemClock.uptimeMillis();
        try {
            UiDevice device = UiDevice.getInstance(inst);
            String label = context.getPackageManager().getApplicationLabel(context.getApplicationInfo()).toString();
            result.put("expectedAppLabel", label);
            result.put("launcherPackage", device.getLauncherPackageName());
            result.put("openedAppActivity", false);
            device.wakeUp();
            device.pressHome();
            SystemClock.sleep(700);
            captureScreen(inst, dir, "launcher-home.png", null);

            UiObject2 target = device.findObject(By.text(label));
            if (target == null) target = device.findObject(By.desc(label));
            String surface = "home";
            // Fresh Launcher3 installations normally appear only in All Apps. Never tap
            // the app icon: at most three vertical drawer/scroll gestures are attempted.
            for (int attempt = 0; target == null && attempt < 3; attempt++) {
                surface = "app-drawer";
                int w = device.getDisplayWidth(), h = device.getDisplayHeight();
                device.swipe(w / 2, h * 4 / 5, w / 2, h / 5, 24);
                target = device.wait(Until.findObject(By.text(label)), 1800);
                if (target == null) target = device.findObject(By.desc(label));
            }
            result.put("appNodeFound", target != null);
            result.put("surface", surface);
            result.put("screenshot", "launcher-observed.png");
            if (target != null) {
                Rect bounds = target.getVisibleBounds();
                result.put("appNodeBounds", new JSONObject().put("left", bounds.left)
                        .put("top", bounds.top).put("right", bounds.right).put("bottom", bounds.bottom));
                captureScreen(inst, dir, "launcher-observed.png", bounds);
                result.put("crop", "launcher-icon-crop.png");
                result.put("note", "Real launcher node observed; review screenshot for launcher-added styling");
            } else {
                captureScreen(inst, dir, "launcher-observed.png", null);
                result.put("note", "No matching launcher node found in bounded probe; launcher appearance is NOT verified");
            }
            device.dumpWindowHierarchy(new File(dir, "launcher-hierarchy.xml"));
        } catch (Exception error) {
            try {
                result.put("probeError", error.getClass().getSimpleName() + ": " + String.valueOf(error.getMessage()));
                result.put("note", "Optional launcher observation incomplete; compiled-icon result remains independent");
            } catch (Exception ignored) { }
        }
        try { result.put("elapsedMs", SystemClock.uptimeMillis() - started); } catch (Exception ignored) { }
        return result;
    }

    private static void captureScreen(Instrumentation inst, File dir, String name, Rect crop) throws Exception {
        Bitmap screen = inst.getUiAutomation().takeScreenshot();
        if (screen == null) throw new IllegalStateException("System screenshot unavailable");
        try {
            savePng(dir, name, screen);
            if (crop != null) {
                Rect padded = new Rect(crop);
                padded.inset(-12, -12);
                if (padded.intersect(0, 0, screen.getWidth(), screen.getHeight()) && !padded.isEmpty()) {
                    Bitmap detail = Bitmap.createBitmap(screen, padded.left, padded.top, padded.width(), padded.height());
                    savePng(dir, "launcher-icon-crop.png", detail);
                    detail.recycle();
                }
            }
        } finally { screen.recycle(); }
    }

    private static void savePng(File dir, String name, Bitmap image) throws Exception {
        try (FileOutputStream stream = new FileOutputStream(new File(dir, name))) {
            if (!image.compress(Bitmap.CompressFormat.PNG, 100, stream)) {
                throw new IllegalStateException("Could not encode " + name);
            }
        }
    }

    private static void writeJson(File dir, JSONObject value) throws Exception {
        try (FileOutputStream stream = new FileOutputStream(new File(dir, "icon421-evidence.json"))) {
            stream.write(value.toString(2).getBytes(StandardCharsets.UTF_8));
        }
    }

    private static String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream stream = new FileInputStream(file)) {
            byte[] buffer = new byte[65536];
            int count;
            while ((count = stream.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder hex = new StringBuilder();
        for (byte b : digest.digest()) hex.append(String.format(java.util.Locale.ROOT, "%02x", b & 0xff));
        return hex.toString();
    }
}
