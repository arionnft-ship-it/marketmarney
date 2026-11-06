package com.marketmarney.mobile;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Decorative cold-launch overlay. No network, sleeps, private data or minimum hold time. */
final class StartupOverlay extends FrameLayout {
    private static final int NAVY=0xff061423, GOLD=0xffefc56e;
    private static final long SAFETY_LIMIT_MS=4000;
    private final Artwork artwork;
    private final Runnable onRemoved;
    private final long shownAt=SystemClock.uptimeMillis();
    private final Runnable timeout=()->finish(false,"safety-limit");
    private boolean finishing=false, removed=false;
    StartupOverlay(Context context,Runnable callback) {
        super(context);onRemoved=callback;
        setTag("mm410-launch-overlay");setClickable(true);setFocusable(true);
        setBackgroundColor(NAVY);setElevation(dp(24));
        artwork=new Artwork(context);addView(artwork,new LayoutParams(-1,-1));
        LinearLayout footer=new LinearLayout(context);footer.setOrientation(LinearLayout.VERTICAL);footer.setGravity(Gravity.CENTER);
        TextView status=new TextView(context);status.setText("Menyiapkan MarketMarney…");status.setTextColor(0xffaab9c9);status.setTextSize(12);status.setGravity(Gravity.CENTER);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);footer.addView(status,new LinearLayout.LayoutParams(-1,dp(28)));
        Button skip=new Button(context);skip.setText("Lewati animasi");skip.setAllCaps(false);skip.setTextSize(12);skip.setTextColor(GOLD);skip.setContentDescription("Lewati animasi pembuka");
        GradientDrawable shape=new GradientDrawable();shape.setColor(0xff0b1d2e);shape.setCornerRadius(dp(14));shape.setStroke(dp(1),0x405d7187);skip.setBackground(shape);
        LinearLayout.LayoutParams sp=new LinearLayout.LayoutParams(dp(176),dp(48));sp.topMargin=dp(10);footer.addView(skip,sp);skip.setOnClickListener(v->finish(false,"skip"));
        LayoutParams fp=new LayoutParams(-1,-2,Gravity.BOTTOM);fp.leftMargin=dp(24);fp.rightMargin=dp(24);fp.bottomMargin=dp(28);addView(footer,fp);
        setOnApplyWindowInsetsListener((v,i)->{
            int top=i.getSystemWindowInsetTop(),bottom=i.getSystemWindowInsetBottom();
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars());top=bars.top;bottom=bars.bottom;}
            setPadding(0,top,0,bottom);return i;
        });
        postDelayed(timeout,SAFETY_LIMIT_MS);Log.i("MM410_LAUNCH","shown motion="+motionAllowed(context));
    }
    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    static boolean motionAllowed(Context context){
        try{
            PowerManager power=(PowerManager)context.getSystemService(Context.POWER_SERVICE);
            if(power!=null&&power.isPowerSaveMode())return false;
            if(Build.VERSION.SDK_INT>=26)return ValueAnimator.areAnimatorsEnabled();
            return Settings.Global.getFloat(context.getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1f)>0f;
        }catch(RuntimeException ignored){return false;}
    }
    void finish(boolean fade,String reason){
        if(finishing||removed)return;finishing=true;removeCallbacks(timeout);artwork.stop();
        Log.i("MM410_LAUNCH","dismiss reason="+reason+" elapsedMs="+(SystemClock.uptimeMillis()-shownAt));
        // No minimum duration: content readiness wins during any animation cycle.
        if(fade&&motionAllowed(getContext())&&isAttachedToWindow()){
            setClickable(false);animate().alpha(0f).setDuration(160).withEndAction(this::removeNow).start();
        }else removeNow();
    }
    void dispose(){if(removed)return;finishing=true;removeCallbacks(timeout);animate().cancel();artwork.stop();removeNow();}
    private void removeNow(){
        if(removed)return;removed=true;removeCallbacks(timeout);artwork.stop();
        ViewGroup parent=(ViewGroup)getParent();if(parent!=null)parent.removeView(this);
        if(onRemoved!=null)onRemoved.run();
    }
    @Override protected void onDetachedFromWindow(){removeCallbacks(timeout);animate().cancel();artwork.stop();super.onDetachedFromWindow();}

    /** Bounded scene, cached paints/fonts and no per-frame bitmap/shader allocation. */
    private static final class Artwork extends View {
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
        private final Paint text=new Paint(Paint.ANTI_ALIAS_FLAG);
        private final RectF ring=new RectF(),logoRect=new RectF();
        private final Path clip=new Path(),marketLine=new Path();
        private final Typeface bold=Typeface.create("sans-serif",Typeface.BOLD),medium=Typeface.create("sans-serif-medium",Typeface.NORMAL),regular=Typeface.create("sans-serif",Typeface.NORMAL);
        private final Bitmap logo;
        private final float density,scaled;
        private Shader glow;
        private ValueAnimator animator;
        private float phase=0.22f;
        private long startedAt,lastDraw;
        private final float[] heights={.24f,.39f,.31f,.5f,.44f,.62f,.52f,.72f,.64f,.84f,.77f,.94f};
        Artwork(Context context){
            super(context);setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            density=getResources().getDisplayMetrics().density;scaled=getResources().getDisplayMetrics().scaledDensity;
            BitmapFactory.Options options=new BitmapFactory.Options();options.inScaled=false;
            logo=BitmapFactory.decodeResource(getResources(),R.mipmap.ic_launcher,options);text.setTextAlign(Paint.Align.CENTER);
        }
        private float d(float value){return value*density;}
        @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){
            if(w>0&&h>0)glow=new RadialGradient(w*.5f,h*.39f,Math.max(w,h)*.66f,new int[]{0xff13314a,0xff091b2e,NAVY},new float[]{0f,.5f,1f},Shader.TileMode.CLAMP);
        }
        @Override protected void onAttachedToWindow(){super.onAttachedToWindow();requestApplyInsets();start();}
        @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)start();else stop();}
        private void start(){
            if(animator!=null||!isAttachedToWindow()||!motionAllowed(getContext())){invalidate();return;}
            startedAt=SystemClock.uptimeMillis();animator=ValueAnimator.ofFloat(0f,1f);animator.setDuration(1800);animator.setRepeatCount(ValueAnimator.INFINITE);
            animator.setInterpolator(new android.view.animation.LinearInterpolator());
            animator.addUpdateListener(a->{long now=SystemClock.uptimeMillis();if(now-lastDraw<32)return;lastDraw=now;phase=(Float)a.getAnimatedValue();invalidate();});animator.start();
        }
        void stop(){if(animator!=null){ValueAnimator old=animator;animator=null;old.removeAllUpdateListeners();old.cancel();}}
        @Override protected void onDetachedFromWindow(){stop();super.onDetachedFromWindow();}
        @Override protected void onDraw(Canvas canvas){
            super.onDraw(canvas);float w=getWidth(),h=getHeight();boolean compact=h<d(480);
            paint.setStyle(Paint.Style.FILL);paint.setShader(glow);paint.setAlpha(255);canvas.drawRect(0,0,w,h,paint);paint.setShader(null);
            paint.setColor(0x0d7996b1);paint.setStrokeWidth(d(.6f));
            float step=d(42);for(float x=w/2%step;x<w;x+=step)canvas.drawLine(x,0,x,h,paint);
            for(float y=h*.39f%step;y<h;y+=step)canvas.drawLine(0,y,w,y,paint);
            float cx=w/2,cy=h*(compact?.33f:.37f),r=d(compact?44:64);
            float entrance=animator==null?1f:Math.min(1f,(SystemClock.uptimeMillis()-startedAt)/650f);
            float scale=.94f+.06f*(1-(float)Math.pow(1-entrance,3));
            float orbit=r+d(15);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(d(1));paint.setColor(0x306e8ba7);canvas.drawCircle(cx,cy,orbit,paint);
            ring.set(cx-orbit,cy-orbit,cx+orbit,cy+orbit);paint.setStrokeCap(Paint.Cap.ROUND);paint.setStrokeWidth(d(2));paint.setColor(GOLD);
            canvas.drawArc(ring,-90+phase*360,78,false,paint);paint.setColor(0x646eadcd);paint.setStrokeWidth(d(1));canvas.drawArc(ring,90+phase*360,36,false,paint);
            double angle=Math.toRadians(-12+phase*360);paint.setStyle(Paint.Style.FILL);paint.setColor(0xffffe3a2);
            canvas.drawCircle(cx+(float)Math.cos(angle)*orbit,cy+(float)Math.sin(angle)*orbit,d(2.7f),paint);
            canvas.save();canvas.scale(scale,scale,cx,cy);clip.reset();clip.addCircle(cx,cy,r,Path.Direction.CW);canvas.clipPath(clip);
            logoRect.set(cx-r,cy-r,cx+r,cy+r);paint.setColor(0xffffffff);if(logo!=null)canvas.drawBitmap(logo,null,logoRect,paint);canvas.restore();
            paint.setStyle(Paint.Style.STROKE);paint.setColor(0x65efc56e);paint.setStrokeWidth(d(.8f));canvas.drawCircle(cx,cy,r*scale,paint);
            float titleY=cy+r+d(compact?40:56);
            text.setTypeface(bold);text.setTextSize(Math.min(w*.083f,30*scaled));text.setColor(0xfff3f6fa);canvas.drawText("MarketMarney",cx,titleY,text);
            text.setTypeface(medium);text.setTextSize(10*scaled);text.setColor(GOLD);canvas.drawText("KENALI PASARNYA.",cx,titleY+d(26),text);
            if(!compact){
                float chartY=titleY+d(91),width=Math.min(w-d(90),d(254)),left=(w-width)/2,gap=width/11;marketLine.reset();
                for(int i=0;i<12;i++){
                    float x=left+i*gap,y=chartY-heights[i]*d(35),bar=d(6+heights[i]*6);
                    paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(d(1));paint.setColor(i==((int)(phase*12))?0x99efc56e:0x286b97ad);
                    canvas.drawLine(x,y-d(7),x,y+bar+d(7),paint);paint.setStyle(Paint.Style.FILL);canvas.drawRoundRect(x-d(2.4f),y,x+d(2.4f),y+bar,d(1),d(1),paint);
                    if(i==0)marketLine.moveTo(x,y+d(4));else marketLine.lineTo(x,y+d(4));
                }
                paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(d(.8f));paint.setColor(0x29efc56e);canvas.drawPath(marketLine,paint);
                text.setTypeface(regular);text.setTextSize(10*scaled);text.setColor(0xff8198ae);canvas.drawText("BERITA  ·  PASAR  ·  KOMUNITAS",cx,chartY+d(43),text);
            }
            // Indeterminate dots, not invented percentages or market prices.
            float dotsY=h-d(compact?134:160);paint.setStyle(Paint.Style.FILL);
            for(int i=0;i<3;i++){float pulse=animator==null?.65f:.35f+.65f*(.5f+.5f*(float)Math.cos(phase*Math.PI*2-i*.9));paint.setColor(GOLD);paint.setAlpha((int)(90+140*pulse));canvas.drawCircle(cx+d((i-1)*11),dotsY,d(2.2f),paint);}paint.setAlpha(255);
        }
    }
}
