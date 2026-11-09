package com.marketmarney.mobile;

import android.animation.ValueAnimator;
import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.animation.DecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * MarketMarney 4.32 opening: the new full MarketMarney wordmark on a quiet,
 * light background with one short tagline. No loading indicator, video, glow,
 * cinematic artwork, or repeating animation is used.
 */
final class StartupOverlay extends FrameLayout {
    private static final int OPENING_BG=0xfffbfaf7;
    private static final int MUTED=0xff718092;
    private static final long MIN_VISIBLE_MS=650L;
    private static final long SAFETY_LIMIT_MS=1100L;

    private final Runnable onRemoved;
    private final long shownAt=SystemClock.uptimeMillis();
    private final Runnable timeout=()->finish(true,"safety-limit");
    private final LinearLayout panel;
    private final ImageView logo;
    private final TextView caption;
    private final View[] animated;
    private Runnable delayedFinish;
    private boolean finishing=false;
    private boolean removed=false;
    private boolean started=false;

    StartupOverlay(Context context,Runnable callback){
        super(context);
        onRemoved=callback;
        setTag("mm416-launch-overlay");
        setClickable(true);
        setFocusable(true);
        setBackgroundColor(OPENING_BG);
        setElevation(0f);
        setSystemBars(true);

        panel=new LinearLayout(context);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(24),dp(24),dp(24),dp(24));
        addView(panel,new LayoutParams(-1,-2,Gravity.CENTER));

        logo=new ImageView(context);
        logo.setImageResource(R.drawable.mm_brand_wordmark);
        logo.setAdjustViewBounds(true);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription("Logo MarketMarney");
        logo.setTag("mm432-wordmark");
        LinearLayout.LayoutParams logoParams=new LinearLayout.LayoutParams(-1,dp(90));
        logoParams.gravity=Gravity.CENTER_HORIZONTAL;
        panel.addView(logo,logoParams);

        caption=text("Kenali pasarnya.",13,MUTED);
        caption.setSingleLine(true);
        LinearLayout.LayoutParams captionParams=new LinearLayout.LayoutParams(-1,-2);
        captionParams.topMargin=dp(12);
        panel.addView(caption,captionParams);

        animated=new View[]{logo,caption};
        setOnApplyWindowInsetsListener((v,insets)->{
            int top=insets.getSystemWindowInsetTop();
            int bottom=insets.getSystemWindowInsetBottom();
            if(Build.VERSION.SDK_INT>=30){
                android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());
                top=bars.top;
                bottom=bars.bottom;
            }
            setPadding(0,top,0,bottom);
            return insets;
        });
        postDelayed(timeout,SAFETY_LIMIT_MS);
        Log.i("MM432_LAUNCH","shown marketmarney-wordmark motion="+motionAllowed(context));
    }

    private int dp(float value){
        return Math.round(value*getResources().getDisplayMetrics().density);
    }

    private TextView text(String value,int size,int color){
        TextView view=new TextView(getContext());
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        return view;
    }

    private void setSystemBars(boolean opening){
        Context context=getContext();
        if(!(context instanceof Activity))return;
        Activity activity=(Activity)context;
        activity.getWindow().setStatusBarColor(opening?OPENING_BG:Color.WHITE);
        activity.getWindow().setNavigationBarColor(opening?OPENING_BG:Color.WHITE);
        int flags=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if(Build.VERSION.SDK_INT>=26)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        activity.getWindow().getDecorView().setSystemUiVisibility(flags);
    }

    static boolean motionAllowed(Context context){
        try{
            PowerManager power=(PowerManager)context.getSystemService(Context.POWER_SERVICE);
            if(power!=null&&power.isPowerSaveMode())return false;
            if(Settings.Global.getFloat(context.getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1f)<=0f)return false;
            return Build.VERSION.SDK_INT<26||ValueAnimator.areAnimatorsEnabled();
        }catch(RuntimeException ignored){
            return false;
        }
    }

    @Override protected void onAttachedToWindow(){
        super.onAttachedToWindow();
        requestApplyInsets();
        startArtwork();
    }

    private void startArtwork(){
        if(started||finishing||removed)return;
        started=true;
        if(!motionAllowed(getContext())){
            settle();
            return;
        }
        logo.setAlpha(0f);
        logo.setScaleX(.98f);
        logo.setScaleY(.98f);
        logo.animate().alpha(1f).scaleX(1f).scaleY(1f)
            .setDuration(240).setInterpolator(new DecelerateInterpolator()).start();

        caption.setAlpha(0f);
        caption.animate().alpha(1f)
            .setStartDelay(110).setDuration(210).setInterpolator(new DecelerateInterpolator()).start();
    }

    private void cancelArtwork(){
        for(View view:animated)view.animate().cancel();
    }

    private void settle(){
        cancelArtwork();
        for(View view:animated)view.setAlpha(1f);
        logo.setScaleX(1f);
        logo.setScaleY(1f);
    }

    private void cancelDelayedFinish(){
        if(delayedFinish!=null){
            removeCallbacks(delayedFinish);
            delayedFinish=null;
        }
    }

    @Override public void onWindowFocusChanged(boolean focus){
        super.onWindowFocusChanged(focus);
        if(!focus&&started&&!removed)settle();
    }

    void finish(boolean fade,String reason){
        if(finishing||removed)return;
        long remaining=MIN_VISIBLE_MS-(SystemClock.uptimeMillis()-shownAt);
        if(remaining>0){
            if(delayedFinish==null){
                delayedFinish=()->{
                    delayedFinish=null;
                    finish(fade,reason);
                };
                postDelayed(delayedFinish,remaining);
            }
            return;
        }
        finishing=true;
        cancelDelayedFinish();
        removeCallbacks(timeout);
        cancelArtwork();
        Log.i("MM432_LAUNCH","dismiss reason="+reason+" elapsedMs="+(SystemClock.uptimeMillis()-shownAt));
        if(fade&&motionAllowed(getContext())&&isAttachedToWindow()){
            animate().alpha(0f).setDuration(100).withEndAction(this::removeNow).start();
        }else{
            removeNow();
        }
    }

    void dispose(){
        if(removed)return;
        finishing=true;
        cancelDelayedFinish();
        removeCallbacks(timeout);
        animate().cancel();
        cancelArtwork();
        removeNow();
    }

    private void removeNow(){
        if(removed)return;
        removed=true;
        cancelDelayedFinish();
        removeCallbacks(timeout);
        animate().cancel();
        cancelArtwork();
        ViewGroup parent=(ViewGroup)getParent();
        if(parent!=null)parent.removeView(this);
        setSystemBars(false);
        if(onRemoved!=null)onRemoved.run();
    }

    @Override protected void onDetachedFromWindow(){
        cancelDelayedFinish();
        removeCallbacks(timeout);
        animate().cancel();
        cancelArtwork();
        super.onDetachedFromWindow();
    }
}
