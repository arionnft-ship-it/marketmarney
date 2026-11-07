package com.marketmarney.mobile;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.PowerManager;
import android.os.SystemClock;
import android.provider.Settings;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
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

/** Visual from the user's Premium Opening 3.1, integrated without its fixed wait.
 * Latest app loads concurrently. No network, private data, audio, video or new permission. */
final class StartupOverlay extends FrameLayout {
    private static final int NAVY=0xff030a10,GOLD=0xffffb334,WHITE=0xfff7f7f4,MUTED=0xffa9b8c3;
    private static final long SAFETY_LIMIT_MS=4000;
    private final Runnable onRemoved;
    private final long shownAt=SystemClock.uptimeMillis();
    private final Runnable timeout=()->finish(false,"safety-limit");
    private final LinearLayout panel;
    private final ImageView logo;
    private final TextView name,caption,description,loading,skip,footer;
    private final FrameLayout track;
    private final View fill;
    private final View[] animated;
    private boolean finishing=false,removed=false,started=false;
    private float appliedScale=-1;
    StartupOverlay(Context context,Runnable callback){
        super(context);onRemoved=callback;
        setTag("mm416-launch-overlay");setClickable(true);setFocusable(true);
        setBackgroundColor(NAVY);setElevation(dp(24));
        addView(new Background(context),new LayoutParams(-1,-1));
        panel=new LinearLayout(context);panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(15),0,dp(15),0);LayoutParams pp=new LayoutParams(-1,-2,Gravity.CENTER);pp.topMargin=-dp(15);addView(panel,pp);
        logo=new ImageView(context);logo.setImageResource(R.drawable.mm_opening_monogram);logo.setAdjustViewBounds(true);logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription("Logo M MarketMarney");logo.setTag("mm416-monogram");panel.addView(logo,new LinearLayout.LayoutParams(dp(285),dp(202)));
        name=text("MarketMarney",38,WHITE,true);name.setTag("mm416-name");name.setSingleLine(true);
        SpannableString title=new SpannableString("MarketMarney");title.setSpan(new ForegroundColorSpan(GOLD),6,12,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);name.setText(title);panel.addView(name);
        caption=text("FINANCIAL INTELLIGENCE PLATFORM",10,GOLD,true);caption.setLetterSpacing(.14f);caption.setSingleLine(true);addText(caption,15);
        description=text("Berita  •  Analisa  •  Komunitas Trader",12,MUTED,false);description.setSingleLine(true);addText(description,20);
        loading=text("MEMULAI MARKETMARNEY",10,MUTED,true);loading.setLetterSpacing(.13f);addText(loading,53);
        track=new FrameLayout(context);track.setBackground(round(0xff1e262e,50));track.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        LinearLayout.LayoutParams tp=new LinearLayout.LayoutParams(dp(290),dp(4));tp.gravity=Gravity.CENTER_HORIZONTAL;tp.topMargin=dp(16);panel.addView(track,tp);
        fill=new View(context);GradientDrawable gold=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,new int[]{0xffc26711,0xffffe689,GOLD});gold.setCornerRadius(dp(50));fill.setBackground(gold);track.addView(fill,new LayoutParams(-1,-1));fill.setPivotX(0);
        skip=text("LEWATI  ↗",11,0xffffe2b5,true);skip.setLetterSpacing(.12f);skip.setContentDescription("Lewati animasi pembuka");skip.setTag("mm416-skip");
        GradientDrawable sb=round(0xff12181f,30);sb.setStroke(dp(1),0xff9d6d2b);skip.setBackground(sb);skip.setFocusable(true);skip.setClickable(true);
        LayoutParams sp=new LayoutParams(dp(106),dp(48),Gravity.TOP|Gravity.END);sp.topMargin=dp(20);sp.rightMargin=dp(20);addView(skip,sp);skip.setOnClickListener(v->finish(false,"skip"));
        footer=text("KENALI PASARNYA.",10,GOLD,true);footer.setLetterSpacing(.2f);LayoutParams fp=new LayoutParams(-1,dp(45),Gravity.BOTTOM);fp.bottomMargin=dp(12);addView(footer,fp);
        animated=new View[]{logo,name,caption,description,loading,fill};
        setOnApplyWindowInsetsListener((v,i)->{
            int top=i.getSystemWindowInsetTop(),bottom=i.getSystemWindowInsetBottom();
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars());top=bars.top;bottom=bars.bottom;}
            setPadding(0,top,0,bottom);return i;
        });
        postDelayed(timeout,SAFETY_LIMIT_MS);
        Log.i("MM416_LAUNCH","shown motion="+motionAllowed(context));
    }
    private int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
    private GradientDrawable round(int color,float radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private TextView text(String value,int size,int color,boolean bold){TextView t=new TextView(getContext());t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));t.setGravity(Gravity.CENTER);return t;}
    private void addText(TextView t,int margin){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.topMargin=dp(margin);panel.addView(t,p);}
    static boolean motionAllowed(Context context){
        try{
            PowerManager power=(PowerManager)context.getSystemService(Context.POWER_SERVICE);
            if(power!=null&&power.isPowerSaveMode())return false;
            if(Settings.Global.getFloat(context.getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1f)<=0f)return false;
            return Build.VERSION.SDK_INT<26||ValueAnimator.areAnimatorsEnabled();
        }catch(RuntimeException ignored){return false;}
    }
    @Override protected void onMeasure(int widthSpec,int heightSpec){
        float d=getResources().getDisplayMetrics().density;
        float w=(MeasureSpec.getSize(widthSpec)-getPaddingLeft()-getPaddingRight())/d;
        float h=(MeasureSpec.getSize(heightSpec)-getPaddingTop()-getPaddingBottom())/d;
        float font=getResources().getConfiguration().fontScale;
        float fit=Math.min(1f,Math.min((w-32)/Math.max(320,295*font),(h-130)/(500+110*Math.max(0,font-1))));fit=Math.max(.20f,fit);
        if(Math.abs(fit-appliedScale)>.002f){
            appliedScale=fit;logo.getLayoutParams().width=dp(285*fit);logo.getLayoutParams().height=dp(202*fit);
            name.setTextSize(38*fit);caption.setTextSize(10*fit);description.setTextSize(12*fit);loading.setTextSize(10*fit);
            ((LinearLayout.LayoutParams)caption.getLayoutParams()).topMargin=dp(15*fit);((LinearLayout.LayoutParams)description.getLayoutParams()).topMargin=dp(20*fit);((LinearLayout.LayoutParams)loading.getLayoutParams()).topMargin=dp(53*fit);
            LinearLayout.LayoutParams tp=(LinearLayout.LayoutParams)track.getLayoutParams();tp.width=dp(290*fit);tp.topMargin=dp(16*fit);
        }
        super.onMeasure(widthSpec,heightSpec);
    }
    @Override protected void onAttachedToWindow(){super.onAttachedToWindow();requestApplyInsets();startArtwork();}
    private void startArtwork(){
        if(started||removed||finishing)return;started=true;
        if(!motionAllowed(getContext())){settle();return;}
        logo.setAlpha(0);logo.setScaleX(.76f);logo.setScaleY(.76f);
        logo.animate().alpha(1).scaleX(1).scaleY(1).setDuration(900).setInterpolator(new DecelerateInterpolator()).start();
        name.setAlpha(0);name.setTranslationY(dp(22));name.animate().alpha(1).translationY(0).setStartDelay(600).setDuration(800).start();
        caption.setAlpha(0);caption.animate().alpha(1).setStartDelay(950).setDuration(650).start();
        description.setAlpha(0);description.animate().alpha(1).setStartDelay(1150).setDuration(620).start();
        loading.setAlpha(0);loading.animate().alpha(1).setStartDelay(1200).setDuration(600).start();
        // Decorative reveal, not a claim about downloaded bytes or network percentage.
        fill.setScaleX(0);fill.animate().scaleX(1).setStartDelay(600).setDuration(3100).start();
    }
    private void cancelArtwork(){for(View v:animated)v.animate().cancel();}
    private void settle(){cancelArtwork();for(View v:animated)v.setAlpha(1);logo.setScaleX(1);logo.setScaleY(1);name.setTranslationY(0);fill.setScaleX(1);}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(!focus&&started&&!removed)settle();}
    void finish(boolean fade,String reason){
        if(finishing||removed)return;finishing=true;removeCallbacks(timeout);cancelArtwork();
        Log.i("MM416_LAUNCH","dismiss reason="+reason+" elapsedMs="+(SystemClock.uptimeMillis()-shownAt));
        // Page readiness always wins: never impose the reference APK's 3.8-second hold.
        if(fade&&motionAllowed(getContext())&&isAttachedToWindow()){animate().alpha(0).setDuration(160).withEndAction(this::removeNow).start();}else removeNow();
    }
    void dispose(){if(removed)return;finishing=true;removeCallbacks(timeout);animate().cancel();cancelArtwork();removeNow();}
    private void removeNow(){
        if(removed)return;removed=true;removeCallbacks(timeout);cancelArtwork();ViewGroup p=(ViewGroup)getParent();if(p!=null)p.removeView(this);if(onRemoved!=null)onRemoved.run();
    }
    @Override protected void onDetachedFromWindow(){removeCallbacks(timeout);animate().cancel();cancelArtwork();super.onDetachedFromWindow();}
    /** Same grid, gold halo, chart line and lower arc as the supplied reference.
     * Shaders and paths are cached when size changes; no software layer or draw loop. */
    private static final class Background extends View{
        private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);private final Path line=new Path();
        private Shader base,halo;
        Background(Context c){super(c);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
        @Override protected void onSizeChanged(int w,int h,int ow,int oh){
            if(w<=0||h<=0)return;
            base=new LinearGradient(0,0,w,h,new int[]{0xff040b12,0xff0a1a26,0xff02070d},null,Shader.TileMode.CLAMP);
            halo=new RadialGradient(w*.5f,h*.38f,w*.46f,new int[]{0x39ee9b2a,0x13d27a16,0x00ee9b2a},null,Shader.TileMode.CLAMP);
            line.reset();line.moveTo(0,h*.55f);for(int i=1;i<12;i++)line.lineTo(w*i/11f,h*(.55f-.018f*i+((i%3==0)?.018f:0)));
        }
        @Override protected void onDraw(Canvas c){
            float w=getWidth(),h=getHeight(),cx=w*.5f;if(w<=0||h<=0)return;
            p.setStyle(Paint.Style.FILL);p.setShader(base);c.drawRect(0,0,w,h,p);p.setShader(halo);c.drawCircle(cx,h*.38f,w*.46f,p);p.setShader(null);
            p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1);p.setColor(0x1a87a6b8);float step=w/9;
            for(float x=0;x<w;x+=step)c.drawLine(x,0,x,h,p);for(float y=0;y<h;y+=step)c.drawLine(0,y,w,y,p);
            p.setColor(0x33ffba52);c.drawCircle(cx,h*.38f,w*.32f,p);p.setStrokeWidth(2);p.setColor(0x65ffa93b);c.drawPath(line,p);
            p.setColor(0x88ffb23e);c.drawOval(-w*.20f,h*.83f,w*1.20f,h*1.28f,p);p.setStyle(Paint.Style.FILL);
        }
    }
}
