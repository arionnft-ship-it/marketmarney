package com.marketmarney.mobile;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.app.Activity;
import android.graphics.*;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.text.SpannableString;
import android.text.style.ForegroundColorSpan;
import android.view.*;
import android.view.animation.DecelerateInterpolator;
import android.widget.*;

/** Native launch opening; independent of all website and API endpoints. */
public final class MarketMarneyOpening {
    private static final int GOLD = Color.rgb(255,179,52);
    private static final int WHITE = Color.rgb(247,247,244);
    private static final int MUTED = Color.rgb(169,184,195);
    private MarketMarneyOpening() {}
    private static int dp(Activity a, float v) {
        return (int)(v*a.getResources().getDisplayMetrics().density+.5f);
    }
    private static TextView text(Activity a,String text,int size,int color,boolean bold) {
        TextView v = new TextView(a);
        v.setText(text);
        v.setTextSize(size);
        v.setTextColor(color);
        v.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        v.setGravity(Gravity.CENTER);
        return v;
    }
    public static void show(Activity a) {
        if(a == null || a.isFinishing()) return;
        final ViewGroup decor=(ViewGroup)a.getWindow().getDecorView();
        final FrameLayout overlay=new FrameLayout(a);
        overlay.setBackgroundColor(Color.rgb(3,10,16));
        decor.addView(overlay,new ViewGroup.LayoutParams(-1,-1));
        overlay.setElevation(dp(a,20));
        overlay.addView(new Background(a),new FrameLayout.LayoutParams(-1,-1));
        LinearLayout panel=new LinearLayout(a);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(a,15),0,dp(a,15),0);
        FrameLayout.LayoutParams panelParams=new FrameLayout.LayoutParams(-1,-2,Gravity.CENTER);
        panelParams.topMargin=-dp(a,15);
        overlay.addView(panel,panelParams);

        ImageView logo=new ImageView(a);
        logo.setImageResource(R.drawable.mm_monogram);
        logo.setAdjustViewBounds(true);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription("Logo M MarketMarney");
        LinearLayout.LayoutParams logoParams=new LinearLayout.LayoutParams(dp(a,285),dp(a,202));
        panel.addView(logo,logoParams);
        TextView name=text(a,"MarketMarney",38,WHITE,true);
        SpannableString richName=new SpannableString("MarketMarney");
        richName.setSpan(new ForegroundColorSpan(GOLD),6,12,0);
        name.setText(richName);
        panel.addView(name);

        TextView caption=text(a,"FINANCIAL INTELLIGENCE PLATFORM",10,GOLD,true);
        caption.setLetterSpacing(.14f);
        LinearLayout.LayoutParams cParams=new LinearLayout.LayoutParams(-1,-2);
        cParams.topMargin=dp(a,15);
        panel.addView(caption,cParams);
        TextView desc=text(a,"Berita  •  Analisa  •  Komunitas Trader",12,MUTED,false);
        LinearLayout.LayoutParams dParams=new LinearLayout.LayoutParams(-1,-2);
        dParams.topMargin=dp(a,20);
        panel.addView(desc,dParams);
        TextView loading=text(a,"MEMULAI MARKETMARNEY",10,MUTED,true);
        loading.setLetterSpacing(.13f);
        LinearLayout.LayoutParams lParams=new LinearLayout.LayoutParams(-1,-2);
        lParams.topMargin=dp(a,53);
        panel.addView(loading,lParams);

        FrameLayout track=new FrameLayout(a);
        GradientDrawable trackBg=new GradientDrawable();
        trackBg.setColor(Color.rgb(30,38,46));
        trackBg.setCornerRadius(dp(a,50));
        track.setBackground(trackBg);
        LinearLayout.LayoutParams trParams=new LinearLayout.LayoutParams(dp(a,290),dp(a,4));
        trParams.gravity=Gravity.CENTER_HORIZONTAL;
        trParams.topMargin=dp(a,16);
        panel.addView(track,trParams);
        View fill=new View(a);
        GradientDrawable goldBg=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
            new int[]{Color.rgb(194,103,17),Color.rgb(255,230,137),GOLD});
        goldBg.setCornerRadius(dp(a,50));
        fill.setBackground(goldBg);
        track.addView(fill,new FrameLayout.LayoutParams(-1,-1));
        fill.setPivotX(0f);
        fill.setScaleX(0f);

        TextView skip=text(a,"LEWATI  ↗",11,Color.rgb(255,226,181),true);
        skip.setLetterSpacing(.12f);
        GradientDrawable skipBg=new GradientDrawable();
        skipBg.setColor(Color.rgb(18,24,31));
        skipBg.setCornerRadius(dp(a,30));
        skipBg.setStroke(dp(a,1),Color.rgb(157,109,43));
        skip.setBackground(skipBg);
        FrameLayout.LayoutParams skipParams=new FrameLayout.LayoutParams(dp(a,100),dp(a,42),Gravity.TOP|Gravity.END);
        skipParams.topMargin=dp(a,30);
        skipParams.rightMargin=dp(a,20);
        overlay.addView(skip,skipParams);

        TextView footer=text(a,"KENALI PASARNYA.",10,GOLD,true);
        footer.setLetterSpacing(.2f);
        FrameLayout.LayoutParams footParams=new FrameLayout.LayoutParams(-1,dp(a,45),Gravity.BOTTOM);
        footParams.bottomMargin=dp(a,12);
        overlay.addView(footer,footParams);
        final boolean[] done={false};
        final Runnable dismiss=()->{
            if(done[0]) return;
            done[0]=true;
            overlay.animate().alpha(0f).setDuration(400).setListener(new AnimatorListenerAdapter(){
                @Override public void onAnimationEnd(Animator animation){
                    if(overlay.getParent() instanceof ViewGroup)
                        ((ViewGroup)overlay.getParent()).removeView(overlay);
                }
            }).start();
        };
        skip.setOnClickListener(v->dismiss.run());
        overlay.setOnKeyListener((v,keyCode,event)->{
            if(keyCode==KeyEvent.KEYCODE_BACK && event.getAction()==KeyEvent.ACTION_UP){
                dismiss.run(); return true;
            }
            return false;
        });
        overlay.setFocusableInTouchMode(true);
        overlay.requestFocus();
        logo.setAlpha(0f);
        logo.setScaleX(.76f); logo.setScaleY(.76f);
        logo.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(900)
            .setInterpolator(new DecelerateInterpolator()).start();
        name.setAlpha(0f);
        name.setTranslationY(dp(a,22));
        name.animate().alpha(1f).translationY(0).setStartDelay(600).setDuration(800).start();
        caption.setAlpha(0f);
        caption.animate().alpha(1f).setStartDelay(950).setDuration(650).start();
        desc.setAlpha(0f);
        desc.animate().alpha(1f).setStartDelay(1150).setDuration(620).start();
        loading.setAlpha(0f);
        loading.animate().alpha(1f).setStartDelay(1200).setDuration(600).start();
        fill.animate().scaleX(1f).setDuration(3100).setStartDelay(600).start();
        new Handler(Looper.getMainLooper()).postDelayed(dismiss,3800);
    }
    private static final class Background extends View {
        private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
        Background(Activity a){ super(a);setLayerType(View.LAYER_TYPE_SOFTWARE,null); }
        @Override protected void onDraw(Canvas c){
            float w=getWidth(),h=getHeight(),cx=w*.5f;
            p.setShader(new LinearGradient(0,0,w,h,new int[]{0xff040b12,0xff0a1a26,0xff02070d},null,Shader.TileMode.CLAMP));
            c.drawRect(0,0,w,h,p);p.setShader(null);
            p.setShader(new RadialGradient(cx,h*.38f,w*.46f,new int[]{0x39ee9b2a,0x13d27a16,0x00ee9b2a},null,Shader.TileMode.CLAMP));
            c.drawCircle(cx,h*.38f,w*.46f,p);p.setShader(null);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(1);p.setColor(0x1a87a6b8);
            float step=w/9f;
            for(float x=0;x<w;x+=step)c.drawLine(x,0,x,h,p);
            for(float y=0;y<h;y+=step)c.drawLine(0,y,w,y,p);
            p.setColor(0x33ffba52);
            c.drawCircle(cx,h*.38f,w*.32f,p);
            p.setStrokeWidth(2);p.setColor(0x65ffa93b);
            Path line=new Path();line.moveTo(0,h*.55f);
            for(int i=1;i<12;i++)line.lineTo(w*i/11f,h*(.55f-.018f*i+((i%3==0)?.018f:0f)));
            c.drawPath(line,p);
            p.setColor(0x88ffb23e);p.setStrokeWidth(2);
            c.drawOval(-w*.20f,h*.83f,w*1.20f,h*1.28f,p);
            p.setStyle(Paint.Style.FILL);
        }
    }
}