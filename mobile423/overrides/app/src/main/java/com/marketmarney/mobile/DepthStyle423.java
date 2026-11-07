package com.marketmarney.mobile;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.LinearGradient;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;
import android.graphics.drawable.StateListDrawable;
import android.view.Gravity;
import android.widget.Button;

/** Small, static material surfaces for the native shell. No bitmap, blur or animator. */
final class DepthStyle423 {
    private static final int[] DISABLED = {-android.R.attr.state_enabled};
    private static final int[] PRESSED = {android.R.attr.state_pressed};
    private static final int[] FOCUSED = {android.R.attr.state_focused};
    private static final int[] DEFAULT = {};

    private DepthStyle423() {}

    private static int px(Context context, float value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private static GradientDrawable gradient(float radius, int... colors) {
        GradientDrawable drawable = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, colors);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private static GradientDrawable solid(float radius, int color) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setCornerRadius(radius);
        drawable.setColor(color);
        return drawable;
    }

    private static LayerDrawable stack(Drawable... layers) {
        LayerDrawable drawable = new LayerDrawable(layers);
        drawable.setPaddingMode(LayerDrawable.PADDING_MODE_STACK);
        // Decoration must never change a view's content padding or touch area.
        drawable.setPadding(0, 0, 0, 0);
        return drawable;
    }

    private static Drawable bevel(Context context, float radiusDp, int faceTop, int faceBottom,
                                  int edgeTop, int edgeBottom, int base, int depthDp, boolean pressed) {
        float radius = px(context, radiusDp);
        int edge = Math.max(1, px(context, 1));
        int depth = px(context, depthDp);
        int top = pressed ? depth : 0;
        int bottom = pressed ? 0 : depth;
        LayerDrawable drawable = stack(
                solid(radius, base),
                gradient(radius, edgeTop, edgeBottom),
                gradient(Math.max(0, radius - edge), faceTop, faceBottom));
        drawable.setLayerInset(1, 0, top, 0, bottom);
        drawable.setLayerInset(2, edge, top + edge, edge, bottom + edge);
        return drawable;
    }

    /** The dock's top highlight is bounded; the existing 70 dp layout remains unchanged. */
    static Drawable tray(Context context, boolean light) {
        GradientDrawable face = light
                ? gradient(0, 0xfffdfefe, 0xfff2f5f9, 0xffe7edf4)
                : gradient(0, 0xff20364c, 0xff122639, 0xff0b1a29);
        float radius = px(context, 18);
        face.setCornerRadii(new float[]{radius, radius, radius, radius, 0, 0, 0, 0});
        face.setStroke(Math.max(1, px(context, 1)), light ? 0xffccd7e3 : 0xff344f67);
        GradientDrawable lip = gradient(0,
                light ? 0xffffffff : 0x78c2d7e9,
                light ? 0x00ffffff : 0x00c2d7e9);
        LayerDrawable drawable = stack(face, lip);
        drawable.setLayerInset(1, px(context, 18), 0, px(context, 18), 0);
        drawable.setLayerHeight(1, Math.max(1, px(context, 2)));
        drawable.setLayerGravity(1, Gravity.TOP | Gravity.FILL_HORIZONTAL);
        return drawable;
    }

    /** Plates sit inside the existing icon shell; selected and idle icons keep their geometry. */
    static Drawable tabPlate(Context context, boolean light, boolean selected) {
        if (selected) {
            return light
                    ? bevel(context, 15, 0xfffff4dc, 0xffffdba0,
                            0xfffffff3, 0xffd69c48, 0xffb57a2b, 2, false)
                    : bevel(context, 15, 0xff59422c, 0xff30261d,
                            0xffd29a4e, 0xff805523, 0xff160e08, 2, false);
        }
        return light
                ? bevel(context, 15, 0xffffffff, 0xffedf2f7,
                        0xffffffff, 0xffc7d3df, 0xffb9c7d5, 1, false)
                : bevel(context, 15, 0xff273e54, 0xff172a3d,
                        0xff49637b, 0xff102233, 0xff06101b, 1, false);
    }

    /** Construct once in NavIcon's constructor, not in its drawing callback. */
    static Shader iconShader(boolean light, boolean selected) {
        int[] colors;
        if (selected) {
            colors = light
                    ? new int[]{0xff8a5716, 0xff5e3b0d, 0xffa26919}
                    : new int[]{0xffffe9b9, 0xffffbd56, 0xffdc9633};
        } else {
            colors = light
                    ? new int[]{0xff65768c, 0xff47566b, 0xff7b899d}
                    : new int[]{0xffdce7f2, 0xffaebed0, 0xff879bb1};
        }
        // Existing vector icons use a 24-unit drawing coordinate system.
        return new LinearGradient(0, 1, 0, 24, colors, null, Shader.TileMode.CLAMP);
    }

    static Drawable screen(Context context, boolean light) {
        return light
                ? gradient(0, 0xfffcfdff, 0xffeef3f9)
                : gradient(0, 0xff11283d, 0xff08131f);
    }

    static Drawable panel(Context context, boolean light) {
        return light
                ? bevel(context, 18, 0xffffffff, 0xfff1f5fa,
                        0xffffffff, 0xffc3d0df, 0xffacbdcf, 2, false)
                : bevel(context, 18, 0xff243c53, 0xff13263a,
                        0xff526d85, 0xff14283b, 0xff050d16, 2, false);
    }

    /** This app's platform AlertDialogs use a Light theme and dark system text. */
    static Drawable dialogSurface(Context context) {
        return new InsetDrawable(panel(context, true), px(context, 8));
    }

    private static Drawable buttonFace(Context context, boolean light, boolean primary,
                                       boolean pressed, boolean focused, boolean disabled) {
        if (disabled) {
            return light
                    ? bevel(context, 13, 0xfff0f2f5, 0xffe2e7ee,
                            0xfffafbfc, 0xffccd4df, 0xffbfc9d6, 1, false)
                    : bevel(context, 13, 0xff263a4d, 0xff1b2d3e,
                            0xff3a5066, 0xff172938, 0xff0b1724, 1, false);
        }
        if (primary) {
            return bevel(context, 13,
                    pressed ? 0xfff1ad3e : 0xffffde99,
                    pressed ? 0xfff8c96f : 0xfff2b143,
                    focused ? 0xffffffff : 0xfffff3cf,
                    0xffbb7d24, 0xff8b551b, 3, pressed);
        }
        return light
                ? bevel(context, 13, pressed ? 0xffe6edf5 : 0xffffffff, 0xffeaf0f7,
                        focused ? 0xffc58c32 : 0xffffffff,
                        focused ? 0xff9a661e : 0xffbdcddd, 0xffa8bacd, 2, pressed)
                : bevel(context, 13, pressed ? 0xff182c40 : 0xff304a62, 0xff1b3045,
                        focused ? 0xffffc56c : 0xff5b7690,
                        focused ? 0xffa06d2d : 0xff1d344a, 0xff08131e, 2, pressed);
    }

    static Drawable button(Context context, boolean light, boolean primary) {
        StateListDrawable drawable = new StateListDrawable();
        drawable.addState(DISABLED, buttonFace(context, light, primary, false, false, true));
        drawable.addState(PRESSED, buttonFace(context, light, primary, true, false, false));
        drawable.addState(FOCUSED, buttonFace(context, light, primary, false, true, false));
        drawable.addState(DEFAULT, buttonFace(context, light, primary, false, false, false));
        return drawable;
    }

    /** Preserve text sizing, existing padding, click listeners and minimum touch dimensions. */
    static void applyButton(Button button, boolean light, boolean primary) {
        int left = button.getPaddingLeft(), top = button.getPaddingTop();
        int right = button.getPaddingRight(), bottom = button.getPaddingBottom();
        button.setBackgroundTintList(null);
        button.setBackground(button(button.getContext(), light, primary));
        button.setPadding(left, top, right, bottom);
        button.setStateListAnimator(null);
        button.setElevation(0);
        int text = primary ? 0xff1b2837 : light ? 0xff283d54 : 0xfff2f6fb;
        button.setTextColor(new ColorStateList(new int[][]{DISABLED, DEFAULT},
                new int[]{light ? 0xff788697 : 0xff8095aa, text}));
    }
}
