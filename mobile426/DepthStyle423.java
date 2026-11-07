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

/**
 * Marney 4.26 restrained depth system.
 * Surfaces keep a slight material separation without heavy bevels, hard lower
 * edges, large shadows, blur, bitmap assets or animation.
 */
final class DepthStyle423 {
    private static final int[] DISABLED={-android.R.attr.state_enabled};
    private static final int[] PRESSED={android.R.attr.state_pressed};
    private static final int[] FOCUSED={android.R.attr.state_focused};
    private static final int[] DEFAULT={};

    private DepthStyle423(){}

    private static int px(Context context,float value){
        return Math.round(value*context.getResources().getDisplayMetrics().density);
    }

    private static GradientDrawable gradient(float radius,int... colors){
        GradientDrawable drawable=new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,colors);
        drawable.setCornerRadius(radius);
        return drawable;
    }

    private static GradientDrawable solid(float radius,int color){
        GradientDrawable drawable=new GradientDrawable();
        drawable.setCornerRadius(radius);
        drawable.setColor(color);
        return drawable;
    }

    private static LayerDrawable stack(Drawable... layers){
        LayerDrawable drawable=new LayerDrawable(layers);
        drawable.setPaddingMode(LayerDrawable.PADDING_MODE_STACK);
        drawable.setPadding(0,0,0,0);
        return drawable;
    }

    private static Drawable softSurface(Context context,float radiusDp,int top,int bottom,
                                        int border,int shadow,int depthDp){
        float radius=px(context,radiusDp);
        GradientDrawable shadowLayer=solid(radius,shadow);
        GradientDrawable face=gradient(radius,top,bottom);
        face.setStroke(Math.max(1,px(context,1)),border);
        LayerDrawable drawable=stack(shadowLayer,face);
        int depth=Math.max(0,px(context,depthDp));
        drawable.setLayerInset(1,0,0,0,depth);
        return drawable;
    }

    static Drawable tray(Context context,boolean light){
        if(!light){
            return softSurface(context,0,0xff1b2a39,0xff12202e,0xff2e4255,0x33000000,1);
        }
        GradientDrawable face=gradient(0,0xffffffff,0xfffafbfd,0xfff5f7fa);
        float radius=px(context,18);
        face.setCornerRadii(new float[]{radius,radius,radius,radius,0,0,0,0});
        face.setStroke(Math.max(1,px(context,1)),0xffdce4ec);
        GradientDrawable highlight=gradient(0,0xffffffff,0x00ffffff);
        LayerDrawable drawable=stack(face,highlight);
        drawable.setLayerInset(1,px(context,20),0,px(context,20),0);
        drawable.setLayerHeight(1,Math.max(1,px(context,1)));
        drawable.setLayerGravity(1,Gravity.TOP|Gravity.FILL_HORIZONTAL);
        return drawable;
    }

    static Drawable tabPlate(Context context,boolean light,boolean selected){
        if(!light){
            return selected
                ? softSurface(context,15,0xff453724,0xff30271d,0xff76552e,0x55000000,1)
                : softSurface(context,15,0xff23384b,0xff192b3c,0xff3c5266,0x44000000,1);
        }
        return selected
            ? softSurface(context,15,0xfffff7e9,0xffffebc8,0xffdfbf89,0x1f815512,1)
            : softSurface(context,15,0xffffffff,0xfff8fafc,0xffe1e7ed,0x120d2033,0);
    }

    static Shader iconShader(boolean light,boolean selected){
        int[] colors;
        if(light){
            colors=selected
                ? new int[]{0xffa56818,0xff81500f,0xffa96f22}
                : new int[]{0xff77879a,0xff5f6f82,0xff77879a};
        }else{
            colors=selected
                ? new int[]{0xffffd38a,0xffffaf3f,0xffdf9230}
                : new int[]{0xffd6e0e9,0xffa4b1bf,0xff8292a2};
        }
        return new LinearGradient(0,1,0,24,colors,null,Shader.TileMode.CLAMP);
    }

    static Drawable screen(Context context,boolean light){
        return light
            ? gradient(0,0xfffbfcfd,0xfff4f7fa)
            : gradient(0,0xff112638,0xff09141f);
    }

    static Drawable panel(Context context,boolean light){
        return light
            ? softSurface(context,18,0xffffffff,0xfff8fafc,0xffdce4ec,0x160c2238,1)
            : softSurface(context,18,0xff23394c,0xff172a3b,0xff40576b,0x55000000,1);
    }

    static Drawable dialogSurface(Context context){
        return new InsetDrawable(panel(context,true),px(context,8));
    }

    private static Drawable buttonFace(Context context,boolean light,boolean primary,
                                       boolean pressed,boolean focused,boolean disabled){
        if(disabled){
            return light
                ? softSurface(context,13,0xfff1f3f6,0xffe8edf2,0xffd5dce4,0x0d0c2238,0)
                : softSurface(context,13,0xff263746,0xff1c2c3a,0xff3a4c5c,0x33000000,0);
        }
        if(primary){
            int top=pressed?0xfff4bd64:0xffffdda0;
            int bottom=pressed?0xffefaa3b:0xfff5bc59;
            int border=focused?0xff9c671d:0xffd29d4a;
            return softSurface(context,13,top,bottom,border,0x24845510,pressed?0:1);
        }
        if(light){
            int top=pressed?0xfff2f5f8:0xffffffff;
            int bottom=pressed?0xffe9eef3:0xfff7f9fb;
            int border=focused?0xffc3924c:0xffdce4ec;
            return softSurface(context,13,top,bottom,border,0x160c2238,pressed?0:1);
        }
        return softSurface(context,13,
            pressed?0xff1a2b3b:0xff2b4052,
            pressed?0xff142434:0xff203445,
            focused?0xffaa7530:0xff455b6e,
            0x44000000,pressed?0:1);
    }

    static Drawable button(Context context,boolean light,boolean primary){
        StateListDrawable drawable=new StateListDrawable();
        drawable.addState(DISABLED,buttonFace(context,light,primary,false,false,true));
        drawable.addState(PRESSED,buttonFace(context,light,primary,true,false,false));
        drawable.addState(FOCUSED,buttonFace(context,light,primary,false,true,false));
        drawable.addState(DEFAULT,buttonFace(context,light,primary,false,false,false));
        return drawable;
    }

    static void applyButton(Button button,boolean light,boolean primary){
        int left=button.getPaddingLeft(),top=button.getPaddingTop();
        int right=button.getPaddingRight(),bottom=button.getPaddingBottom();
        button.setBackgroundTintList(null);
        button.setBackground(button(button.getContext(),light,primary));
        button.setPadding(left,top,right,bottom);
        button.setStateListAnimator(null);
        button.setElevation(0);
        int text=primary?0xff3b2a12:light?0xff263b50:0xffeef3f8;
        button.setTextColor(new ColorStateList(
            new int[][]{DISABLED,DEFAULT},
            new int[]{light?0xff8693a1:0xff8194a7,text}));
    }
}
