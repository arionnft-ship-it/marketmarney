package com.marketmarney.mobile;

import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.webkit.WebChromeClient;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import static org.junit.Assert.*;

public class ChromeGallery424Test {
    @Test public void genericSocialUploadUsesPhotoAndVideoGallery() {
        String[] types = DirectGallery424.acceptTypes("https://marketmarney.com/beranda-trader.html#mm44-reels", new String[]{"*/*"});
        assertArrayEquals(new String[]{"image/*", "video/*"}, types);
        assertTrue(DirectGallery424.direct("https://marketmarney.com/beranda-trader.html#mm44-reels", types));
    }

    @Test public void profileAndAccountGenericUploadUseImagesOnly() {
        assertArrayEquals(new String[]{"image/*"}, DirectGallery424.acceptTypes("https://marketmarney.com/profil.html?user=qa", new String[]{""}));
        assertArrayEquals(new String[]{"image/*"}, DirectGallery424.acceptTypes("https://marketmarney.com/akun.html", null));
    }

    @Test public void explicitDocumentUploadIsNotForcedIntoGallery() {
        String[] requested = new String[]{"application/pdf"};
        assertSame(requested, DirectGallery424.acceptTypes("https://marketmarney.com/beranda-trader.html", requested));
        assertFalse(DirectGallery424.direct("https://marketmarney.com/beranda-trader.html", requested));
        assertFalse(DirectGallery424.mediaPage("https://marketmarney.com.evil.example/beranda-trader.html"));
    }

    @Test public void explicitVisualCaptureStillUsesDirectPhotoPicker() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        String url = "https://marketmarney.com/grup-trader.html?group=qa";
        String[] types = DirectGallery424.acceptTypes(url, new String[]{"image/*"});
        assertTrue(DirectGallery424.direct(url, types));
        GalleryPicker415.Selection selection = new GalleryPicker415.Selection(types, WebChromeClient.FileChooserParams.MODE_OPEN, false);
        assertTrue(selection.visual);
        Intent intent = GalleryPicker415.create(context, selection, null);
        assertNotNull(intent);
        assertNotEquals(Intent.ACTION_CHOOSER, intent.getAction());
    }

    private static int center(Drawable drawable) {
        Bitmap bitmap = Bitmap.createBitmap(240, 96, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, bitmap.getWidth(), bitmap.getHeight());
        drawable.draw(canvas);
        return bitmap.getPixel(bitmap.getWidth() / 2, bitmap.getHeight() / 2);
    }

    private static int brightness(int color) {
        return Math.round(0.2126f * Color.red(color) + 0.7152f * Color.green(color) + 0.0722f * Color.blue(color));
    }

    @Test public void reelsTrayIsBlackWhileLightTrayRemainsLight() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        int light = brightness(center(DepthStyle424.tray(context, true, false)));
        int reels = brightness(center(DepthStyle424.tray(context, false, true)));
        assertTrue("Light tray should remain bright", light > 170);
        assertTrue("Reels tray should blend into a black background", reels < 45);
        assertTrue(light - reels > 130);
    }

    @Test public void reelsSelectedIconKeepsAmberContrast() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        int selected = brightness(center(DepthStyle424.tabPlate(context, false, true, true)));
        int idle = brightness(center(DepthStyle424.tabPlate(context, false, false, true)));
        assertTrue(selected > idle);
    }
}
