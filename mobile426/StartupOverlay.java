package com.marketmarney.mobile;

import android.animation.ValueAnimator;
import android.app.Activity;
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
 * Marney 4.26 cinematic opening inspired by the supplied rider-and-logo artwork.
 * The scene is drawn locally with lightweight shapes; no bitmap, network request,
 * audio, video, repeating animator or extra permission is used.
 */
final class StartupOverlay extends FrameLayout {
    private static final int OPENING_BG=0xff05080d;
    private static final int AMBER=0xffff7a18;
    private static final int SILVER=0xffedf1f5;
    private static final int MUTED=0xff9aa5af;
    private static final long SAFETY_LIMIT_MS=3600;

    private final Runnable onRemoved;
    private final long shownAt=SystemClock.uptimeMillis();
    private final Runnable timeout=()->finish(false,"safety-limit");
    private final CinematicBackdrop backdrop;
    private final LinearLayout panel;
    private final FrameLayout emblemStage;
    private final View aura;
    private final ImageView logo;
    private final TextView name,caption,description,loading,skip,footer;
    private final FrameLayout track;
    private final View fill;
    private final View[] animated;
    private boolean finishing=false,removed=false,started=false;
    private float appliedScale=-1f;

    StartupOverlay(Context context,Runnable callback){
        super(context);
        onRemoved=callback;
        setTag("mm416-launch-overlay");
        setClickable(true);
        setFocusable(true);
        setBackgroundColor(OPENING_BG);
        setElevation(dp(8));
        setSystemBars(true);

        backdrop=new CinematicBackdrop(context);
        addView(backdrop,new LayoutParams(-1,-1));

        panel=new LinearLayout(context);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(20),0,dp(20),0);
        LayoutParams pp=new LayoutParams(-1,-2,Gravity.CENTER);
        pp.topMargin=dp(34);
        addView(panel,pp);

        emblemStage=new FrameLayout(context);
        emblemStage.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        LinearLayout.LayoutParams ep=new LinearLayout.LayoutParams(dp(224),dp(166));
        ep.gravity=Gravity.CENTER_HORIZONTAL;
        panel.addView(emblemStage,ep);

        aura=new LogoAura(context);
        emblemStage.addView(aura,new FrameLayout.LayoutParams(-1,-1));

        logo=new ImageView(context);
        logo.setImageResource(R.drawable.mm_opening_monogram);
        logo.setAdjustViewBounds(true);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setContentDescription("Logo MARNEY bercahaya oranye");
        logo.setTag("mm416-monogram");
        FrameLayout.LayoutParams lp=new FrameLayout.LayoutParams(dp(178),dp(126),Gravity.CENTER);
        lp.topMargin=dp(4);
        emblemStage.addView(logo,lp);

        name=text("MARNEY",32,SILVER,true);
        name.setTag("mm416-name");
        name.setSingleLine(true);
        name.setLetterSpacing(.16f);
        panel.addView(name,new LinearLayout.LayoutParams(-1,-2));

        caption=text("MARKET  •  NEWS  •  ANALYSIS",10,AMBER,true);
        caption.setLetterSpacing(.18f);
        caption.setSingleLine(true);
        addText(caption,12);

        description=text("FINANCIAL INTELLIGENCE",11,MUTED,false);
        description.setLetterSpacing(.12f);
        description.setSingleLine(true);
        addText(description,12);

        loading=text("MEMULAI MARKETMARNEY",9,0xffc4cbd2,true);
        loading.setLetterSpacing(.16f);
        addText(loading,42);

        track=new FrameLayout(context);
        GradientDrawable trackShape=round(0xff252a30,50);
        trackShape.setStroke(Math.max(1,dp(1)),0xff3b424a);
        track.setBackground(trackShape);
        track.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        LinearLayout.LayoutParams tp=new LinearLayout.LayoutParams(dp(226),dp(3));
        tp.gravity=Gravity.CENTER_HORIZONTAL;
        tp.topMargin=dp(14);
        panel.addView(track,tp);

        fill=new View(context);
        GradientDrawable gold=new GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            new int[]{0xff8f3f08,AMBER,0xffffc36a});
        gold.setCornerRadius(dp(50));
        fill.setBackground(gold);
        track.addView(fill,new LayoutParams(-1,-1));
        fill.setPivotX(0);

        skip=text("LEWATI",10,0xffd8dde2,true);
        skip.setLetterSpacing(.12f);
        skip.setContentDescription("Lewati animasi pembuka");
        skip.setTag("mm416-skip");
        GradientDrawable sb=round(0x6612171d,28);
        sb.setStroke(Math.max(1,dp(1)),0x99757e87);
        skip.setBackground(sb);
        skip.setFocusable(true);
        skip.setClickable(true);
        LayoutParams sp=new LayoutParams(dp(92),dp(44),Gravity.TOP|Gravity.END);
        sp.topMargin=dp(18);
        sp.rightMargin=dp(18);
        addView(skip,sp);
        skip.setOnClickListener(v->finish(false,"skip"));

        footer=text("KENALI PASARNYA.",10,0xffc8ced4,true);
        footer.setLetterSpacing(.2f);
        LayoutParams fp=new LayoutParams(-1,dp(44),Gravity.BOTTOM);
        fp.bottomMargin=dp(10);
        addView(footer,fp);

        animated=new View[]{backdrop,aura,logo,name,caption,description,loading,fill};
        setOnApplyWindowInsetsListener((v,i)->{
            int top=i.getSystemWindowInsetTop(),bottom=i.getSystemWindowInsetBottom();
            if(Build.VERSION.SDK_INT>=30){
                android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars());
                top=bars.top;
                bottom=bars.bottom;
            }
            setPadding(0,top,0,bottom);
            return i;
        });
        postDelayed(timeout,SAFETY_LIMIT_MS);
        Log.i("MM426_LAUNCH","shown motion="+motionAllowed(context));
    }

    private int dp(float value){
        return Math.round(value*getResources().getDisplayMetrics().density);
    }

    private GradientDrawable round(int color,float radius){
        GradientDrawable drawable=new GradientDrawable();
        drawable.setColor(color);
        drawable.setCornerRadius(dp(radius));
        return drawable;
    }

    private TextView text(String value,int size,int color,boolean bold){
        TextView text=new TextView(getContext());
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(color);
        text.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        text.setGravity(Gravity.CENTER);
        return text;
    }

    private void addText(TextView text,int margin){
        LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(-1,-2);
        params.topMargin=dp(margin);
        panel.addView(text,params);
    }

    private void setSystemBars(boolean opening){
        Context context=getContext();
        if(!(context instanceof Activity))return;
        Activity activity=(Activity)context;
        if(opening){
            activity.getWindow().setStatusBarColor(OPENING_BG);
            activity.getWindow().setNavigationBarColor(OPENING_BG);
            int flags=activity.getWindow().getDecorView().getSystemUiVisibility();
            flags&=~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if(Build.VERSION.SDK_INT>=26)flags&=~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            activity.getWindow().getDecorView().setSystemUiVisibility(flags);
        }else{
            activity.getWindow().setStatusBarColor(Color.WHITE);
            activity.getWindow().setNavigationBarColor(Color.WHITE);
            int flags=View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if(Build.VERSION.SDK_INT>=26)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            activity.getWindow().getDecorView().setSystemUiVisibility(flags);
        }
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

    @Override protected void onMeasure(int widthSpec,int heightSpec){
        float density=getResources().getDisplayMetrics().density;
        float width=(MeasureSpec.getSize(widthSpec)-getPaddingLeft()-getPaddingRight())/density;
        float height=(MeasureSpec.getSize(heightSpec)-getPaddingTop()-getPaddingBottom())/density;
        float font=getResources().getConfiguration().fontScale;
        float fit=Math.min(1f,Math.min((width-28)/Math.max(300,250*font),(height-108)/(520+90*Math.max(0,font-1))));
        fit=Math.max(.35f,fit);
        if(Math.abs(fit-appliedScale)>.002f){
            appliedScale=fit;
            LinearLayout.LayoutParams ep=(LinearLayout.LayoutParams)emblemStage.getLayoutParams();
            ep.width=dp(224*fit);
            ep.height=dp(166*fit);
            FrameLayout.LayoutParams lp=(FrameLayout.LayoutParams)logo.getLayoutParams();
            lp.width=dp(178*fit);
            lp.height=dp(126*fit);
            lp.topMargin=dp(4*fit);
            name.setTextSize(32*fit);
            caption.setTextSize(10*fit);
            description.setTextSize(11*fit);
            loading.setTextSize(9*fit);
            ((LinearLayout.LayoutParams)caption.getLayoutParams()).topMargin=dp(12*fit);
            ((LinearLayout.LayoutParams)description.getLayoutParams()).topMargin=dp(12*fit);
            ((LinearLayout.LayoutParams)loading.getLayoutParams()).topMargin=dp(42*fit);
            LinearLayout.LayoutParams tp=(LinearLayout.LayoutParams)track.getLayoutParams();
            tp.width=dp(226*fit);
            tp.topMargin=dp(14*fit);
        }
        super.onMeasure(widthSpec,heightSpec);
    }

    @Override protected void onAttachedToWindow(){
        super.onAttachedToWindow();
        requestApplyInsets();
        startArtwork();
    }

    private void startArtwork(){
        if(started||removed||finishing)return;
        started=true;
        if(!motionAllowed(getContext())){
            settle();
            return;
        }
        backdrop.setAlpha(.15f);
        backdrop.setScaleX(1.035f);
        backdrop.setScaleY(1.035f);
        backdrop.animate().alpha(1f).scaleX(1f).scaleY(1f)
            .setDuration(900).setInterpolator(new DecelerateInterpolator()).start();

        aura.setAlpha(0f);
        aura.setScaleX(.72f);
        aura.setScaleY(.72f);
        aura.animate().alpha(.88f).scaleX(1f).scaleY(1f)
            .setStartDelay(80).setDuration(720).setInterpolator(new DecelerateInterpolator()).start();

        logo.setAlpha(0f);
        logo.setScaleX(.84f);
        logo.setScaleY(.84f);
        logo.setTranslationY(dp(12));
        logo.animate().alpha(1f).scaleX(1f).scaleY(1f).translationY(0)
            .setStartDelay(180).setDuration(680).setInterpolator(new DecelerateInterpolator()).start();

        name.setAlpha(0f);
        name.setTranslationY(dp(14));
        name.animate().alpha(1f).translationY(0).setStartDelay(520).setDuration(520).start();

        caption.setAlpha(0f);
        caption.animate().alpha(1f).setStartDelay(720).setDuration(440).start();

        description.setAlpha(0f);
        description.animate().alpha(1f).setStartDelay(880).setDuration(420).start();

        loading.setAlpha(0f);
        loading.animate().alpha(1f).setStartDelay(1020).setDuration(380).start();

        fill.setScaleX(0f);
        fill.animate().scaleX(1f).setStartDelay(260).setDuration(2300).start();
    }

    private void cancelArtwork(){
        for(View view:animated)view.animate().cancel();
    }

    private void settle(){
        cancelArtwork();
        for(View view:animated)view.setAlpha(1f);
        backdrop.setScaleX(1f);
        backdrop.setScaleY(1f);
        aura.setScaleX(1f);
        aura.setScaleY(1f);
        logo.setScaleX(1f);
        logo.setScaleY(1f);
        logo.setTranslationY(0f);
        name.setTranslationY(0f);
        fill.setScaleX(1f);
    }

    @Override public void onWindowFocusChanged(boolean focus){
        super.onWindowFocusChanged(focus);
        if(!focus&&started&&!removed)settle();
    }

    void finish(boolean fade,String reason){
        if(finishing||removed)return;
        finishing=true;
        removeCallbacks(timeout);
        cancelArtwork();
        Log.i("MM426_LAUNCH","dismiss reason="+reason+" elapsedMs="+(SystemClock.uptimeMillis()-shownAt));
        if(fade&&motionAllowed(getContext())&&isAttachedToWindow()){
            animate().alpha(0f).setDuration(220).withEndAction(this::removeNow).start();
        }else{
            removeNow();
        }
    }

    void dispose(){
        if(removed)return;
        finishing=true;
        removeCallbacks(timeout);
        animate().cancel();
        cancelArtwork();
        removeNow();
    }

    private void removeNow(){
        if(removed)return;
        removed=true;
        removeCallbacks(timeout);
        cancelArtwork();
        setSystemBars(false);
        ViewGroup parent=(ViewGroup)getParent();
        if(parent!=null)parent.removeView(this);
        if(onRemoved!=null)onRemoved.run();
    }

    @Override protected void onDetachedFromWindow(){
        removeCallbacks(timeout);
        animate().cancel();
        cancelArtwork();
        super.onDetachedFromWindow();
    }

    /** Static cinematic rider silhouette with orange neon and restrained metallic highlights. */
    private static final class CinematicBackdrop extends View{
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        private final Path jacket=new Path();
        private final Path road=new Path();
        private Shader base,halo,jacketShade,helmetShade,fog;

        CinematicBackdrop(Context context){
            super(context);
            setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        }

        @Override protected void onSizeChanged(int width,int height,int oldWidth,int oldHeight){
            if(width<=0||height<=0)return;
            float cx=width*.5f;
            base=new LinearGradient(0,0,0,height,
                new int[]{0xff05080d,0xff0b1016,0xff070b10,0xff020407},
                new float[]{0f,.36f,.72f,1f},Shader.TileMode.CLAMP);
            halo=new RadialGradient(cx,height*.43f,width*.48f,
                new int[]{0x62ff6a00,0x24ff7a18,0x08000000,0x00000000},
                new float[]{0f,.28f,.62f,1f},Shader.TileMode.CLAMP);
            fog=new LinearGradient(0,height*.60f,0,height,
                new int[]{0x00000000,0x30151a20,0xa8000000},
                null,Shader.TileMode.CLAMP);
            jacketShade=new LinearGradient(cx-width*.35f,height*.34f,cx+width*.35f,height*.82f,
                new int[]{0xff202831,0xff0e141a,0xff252e37,0xff090d12},
                new float[]{0f,.34f,.64f,1f},Shader.TileMode.CLAMP);
            helmetShade=new LinearGradient(cx-width*.13f,height*.14f,cx+width*.13f,height*.34f,
                new int[]{0xff4c555e,0xff151b21,0xff070a0e},
                null,Shader.TileMode.CLAMP);

            jacket.reset();
            jacket.moveTo(cx-width*.075f,height*.31f);
            jacket.cubicTo(cx-width*.18f,height*.33f,cx-width*.36f,height*.37f,cx-width*.43f,height*.51f);
            jacket.lineTo(cx-width*.50f,height*.91f);
            jacket.lineTo(cx+width*.50f,height*.91f);
            jacket.lineTo(cx+width*.43f,height*.51f);
            jacket.cubicTo(cx+width*.36f,height*.37f,cx+width*.18f,height*.33f,cx+width*.075f,height*.31f);
            jacket.close();

            road.reset();
            road.moveTo(cx-width*.08f,height*.68f);
            road.lineTo(cx-width*.46f,height);
            road.lineTo(cx+width*.46f,height);
            road.lineTo(cx+width*.08f,height*.68f);
            road.close();
        }

        @Override protected void onDraw(Canvas canvas){
            float width=getWidth(),height=getHeight(),cx=width*.5f;
            if(width<=0||height<=0)return;

            paint.setStyle(Paint.Style.FILL);
            paint.setShader(base);
            canvas.drawRect(0,0,width,height,paint);

            paint.setShader(halo);
            canvas.drawCircle(cx,height*.43f,width*.48f,paint);

            paint.setShader(null);
            paint.setColor(0x18d9e1e8);
            for(int i=0;i<7;i++){
                float y=height*(.10f+i*.11f);
                canvas.drawRect(0,y,width,y+Math.max(1,height*.0012f),paint);
            }

            paint.setShader(helmetShade);
            canvas.drawOval(cx-width*.125f,height*.145f,cx+width*.125f,height*.345f,paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(1,width*.004f));
            paint.setColor(0x8ab4bec8);
            canvas.drawArc(cx-width*.125f,height*.145f,cx+width*.125f,height*.345f,190,160,false,paint);
            paint.setColor(0x99ff7a18);
            canvas.drawArc(cx-width*.118f,height*.154f,cx+width*.118f,height*.336f,24,46,false,paint);

            paint.setStyle(Paint.Style.FILL);
            paint.setShader(jacketShade);
            canvas.drawPath(jacket,paint);

            paint.setShader(null);
            paint.setColor(0xff0a0f14);
            canvas.drawRoundRect(cx-width*.055f,height*.29f,cx+width*.055f,height*.39f,width*.025f,width*.025f,paint);

            paint.setColor(0x3fd5dde4);
            canvas.drawRoundRect(cx-width*.19f,height*.405f,cx+width*.19f,height*.69f,width*.035f,width*.035f,paint);
            paint.setColor(0xff11171d);
            canvas.drawRoundRect(cx-width*.184f,height*.411f,cx+width*.184f,height*.684f,width*.032f,width*.032f,paint);

            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(1,width*.003f));
            paint.setColor(0x55c7d0d8);
            canvas.drawLine(cx,height*.39f,cx,height*.78f,paint);
            canvas.drawLine(cx-width*.40f,height*.52f,cx-width*.21f,height*.69f,paint);
            canvas.drawLine(cx+width*.40f,height*.52f,cx+width*.21f,height*.69f,paint);
            paint.setColor(0x66ff7a18);
            canvas.drawLine(cx-width*.18f,height*.69f,cx+width*.18f,height*.69f,paint);

            paint.setStyle(Paint.Style.FILL);
            paint.setColor(0x12000000);
            canvas.drawPath(road,paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(Math.max(1,width*.004f));
            paint.setColor(0x44ff7a18);
            canvas.drawLine(cx-width*.04f,height*.74f,cx-width*.18f,height,paint);
            canvas.drawLine(cx+width*.04f,height*.74f,cx+width*.18f,height,paint);

            paint.setStyle(Paint.Style.FILL);
            for(int i=0;i<6;i++){
                float side=i%2==0?-1f:1f;
                float x=cx+side*width*(.22f+.055f*i);
                float y=height*(.70f+.042f*i);
                float radius=Math.max(2,width*(.006f+.0015f*i));
                paint.setColor(i<3?0x99ff7a18:0x55d5dce2);
                canvas.drawCircle(x,y,radius,paint);
            }

            paint.setShader(fog);
            canvas.drawRect(0,height*.60f,width,height,paint);
            paint.setShader(null);
        }
    }

    private static final class LogoAura extends View{
        private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
        private Shader glow;

        LogoAura(Context context){
            super(context);
            setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
        }

        @Override protected void onSizeChanged(int width,int height,int oldWidth,int oldHeight){
            if(width<=0||height<=0)return;
            glow=new RadialGradient(width*.5f,height*.5f,Math.max(width,height)*.52f,
                new int[]{0x85ff5f00,0x40ff7a18,0x12ffb35b,0x00000000},
                new float[]{0f,.25f,.58f,1f},Shader.TileMode.CLAMP);
        }

        @Override protected void onDraw(Canvas canvas){
            if(glow==null)return;
            paint.setShader(glow);
            canvas.drawOval(0,getHeight()*.12f,getWidth(),getHeight()*.90f,paint);
            paint.setShader(null);
        }
    }
}
