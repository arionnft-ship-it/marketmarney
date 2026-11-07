package com.marketmarney.mobile;

import android.content.Context;
import android.graphics.LinearGradient;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.LayerDrawable;
import android.view.Gravity;

/** Reels-specific black chrome layered on top of the lightweight 4.23 materials. */
final class DepthStyle424 {
    private DepthStyle424() {}

    private static int px(Context context, float value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static GradientDrawable gradient(GradientDrawable.Orientation orientation, float radius, int... colors) {
        GradientDrawable drawable = new GradientDrawable(orientation, colors);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private static LayerDrawable stack(Drawable... layers) {
        LayerDrawable drawable = new LayerDrawable(layers);
        drawable.setPaddingMode(LayerDrawable.PADDING_MODE_STACK);
        drawable.setPadding(0, 0, 0, 0);
        return drawable;
    }

    static Drawable tray(Context context, boolean light, boolean reels) {
        if (!reels) return DepthStyle423.tray(context, light);
        GradientDrawable face = gradient(GradientDrawable.Orientation.TOP_BOTTOM, 0,
            0xff17191c, 0xff0b0c0e, 0xff030405);
        float radius = px(context, 18);
        face.setCornerRadii(new float[]{radius, radius, radius, radius, 0, 0, 0, 0});
        face.setStroke(Math.max(1, px(context, 1)), 0xff33373d);
        GradientDrawable lip = gradient(GradientDrawable.Orientation.LEFT_RIGHT, 0,
            0x00ffffff, 0x55ffffff, 0x00ffffff);
        LayerDrawable drawable = stack(face, lip);
        drawable.setLayerInset(1, px(context, 18), 0, px(context, 18), 0);
        drawable.setLayerHeight(1, Math.max(1, px(context, 1)));
        drawable.setLayerGravity(1, Gravity.TOP | Gravity.FILL_HORIZONTAL);
        return drawable;
    }

    static Drawable tabPlate(Context context, boolean light, boolean selected, boolean reels) {
        if (!reels) return DepthStyle423.tabPlate(context, light, selected);
        float radius = px(context, 15);
        GradientDrawable face = gradient(GradientDrawable.Orientation.TOP_BOTTOM, radius,
            selected ? 0xff3a2a18 : 0xff24272b,
            selected ? 0xff1b140d : 0xff101214);
        face.setStroke(Math.max(1, px(context, 1)), selected ? 0xff9a6729 : 0xff3a3e44);
        GradientDrawable edge = gradient(GradientDrawable.Orientation.TOP_BOTTOM, radius,
            selected ? 0xff6f451d : 0xff42474f,
            0xff050607);
        LayerDrawable result = stack(edge, face);
        int inset = Math.max(1, px(context, 1));
        result.setLayerInset(1, inset, inset, inset, px(context, 2));
        return result;
    }

    static Shader iconShader(boolean light, boolean selected, boolean reels) {
        if (!reels) return DepthStyle423.iconShader(light, selected);
        int[] colors = selected
            ? new int[]{0xffffe1a0, 0xffffb548, 0xffd48628}
            : new int[]{0xffe4e9ef, 0xffa8b0ba, 0xff707985};
        return new LinearGradient(0, 1, 0, 24, colors, null, Shader.TileMode.CLAMP);
    }
}
