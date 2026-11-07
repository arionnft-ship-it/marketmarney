package com.marketmarney.mobile;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JsResult;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.RenderProcessGoneDetail;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.LinkedHashMap;
import android.os.SystemClock;
import android.util.Log;
import org.json.JSONObject;

/** Five destinations. XAUWar stays inside the APK and is loaded only on selection. */
public final class MainActivity extends ComponentActivity {
    private static final String BASE = "https://marketmarney.com";
    private static final String NEWS_PATH = "/__android43/news";
    private static final String XAUWAR_PAGE = "/assets/xau-war-3d.html";
    private static final String XAUWAR_VERSION = "7.7";
    private static final String XAUWAR_PATH = XAUWAR_PAGE + "?v=" + XAUWAR_VERSION;
    private static final int HOME=0, NEWS=1, XAUWAR=2, MARKET=3, SOCIAL=4, PICK_FILE=40;
    private static final int BG=Color.rgb(9,20,32), PANEL=Color.rgb(15,33,49);
    private static final int GOLD=Color.rgb(255,184,77), TEXT=Color.rgb(243,246,250), MUTED=Color.rgb(161,179,198);
    private final String[] labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"};
    private final String[] paths={"/index.html",NEWS_PATH,XAUWAR_PATH,"/index.html#marketlive","/beranda-trader.html"};
    private LinearLayout root, bottom;
    private FrameLayout frame;
    private ProgressBar progress;
    private View offline, fullVideo;
    private WebChromeClient.CustomViewCallback fullVideoCallback;
    private WebView web;
    // At most one inactive page plus the current page: no unbounded WebView cache.
    private final LinkedHashMap<Integer,WebView> retained = new LinkedHashMap<>();
    private long navigationStarted;
    private void discardView(WebView v){
        if(v==null)return;
        v.stopLoading();v.setWebChromeClient(null);v.setWebViewClient(null);
        ViewGroup parent=(ViewGroup)v.getParent();if(parent!=null)parent.removeView(v);
        v.destroy();
    }
    private void dropRetained(){for(WebView v:retained.values())discardView(v);retained.clear();}
    private boolean canRetain(){
        // Never retain the 3D scene offscreen: free its WebView/GPU resources.
        if(tab==XAUWAR)return false;
        if(mainFailed||web==null||offline!=null||fileCallback!=null||fullVideo!=null||web.getProgress()<100||!own(web.getUrl()))return false;
        Uri current=Uri.parse(web.getUrl()), expected=Uri.parse(BASE+paths[tab]);
        // Do not keep account, auth, article or other transient/private subpages.
        return expected.getPath().equals(current.getPath());
    }
    private void suspendPage(WebView v){
        if(own(v.getUrl()))v.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(m){m.pause()})}catch(e){}",null);
        v.onPause();v.setVisibility(View.GONE);
    }
    private void resumePage(WebView v){
        v.setVisibility(View.VISIBLE);v.onResume();
        if(own(v.getUrl()))v.evaluateJavascript("try{window.__mm45Suspended=false;window.dispatchEvent(new Event('mm45:resume'))}catch(e){}",null);
    }
    private ValueCallback<Uri[]> fileCallback;
    private WebView fileOwner;
    private String fileOwnerUrl;
    private GalleryPicker415.Selection fileSelection;
    private int fileRequestCode=-1, fileSequence=4100;
    private java.util.concurrent.ExecutorService fileValidator;
    private java.util.concurrent.Future<?> fileValidation;
    private Runnable fileTimeout;
    private void finishFileSelection(Uri[] result){
        ValueCallback<Uri[]> callback=fileCallback;fileCallback=null;
        fileOwner=null;fileOwnerUrl=null;fileSelection=null;fileRequestCode=-1;
        if(fileTimeout!=null){frame.removeCallbacks(fileTimeout);fileTimeout=null;}
        if(fileValidation!=null){fileValidation.cancel(true);fileValidation=null;}
        if(callback!=null)callback.onReceiveValue(result);
    }
    private boolean filePageCurrent(){
        return !destroyed&&fileCallback!=null&&fileOwner==web&&web!=null
            &&Recovery414.sameDocument(fileOwnerUrl,web.getUrl());
    }
    private boolean chooseFile(WebView source,ValueCallback<Uri[]> callback,WebChromeClient.FileChooserParams params){
        if(destroyed||source!=web||!own(source.getUrl())||params==null){callback.onReceiveValue(null);return true;}
        if(fileCallback!=null){callback.onReceiveValue(null);return true;}
        GalleryPicker415.Selection choice=new GalleryPicker415.Selection(params.getAcceptTypes(),params.getMode(),params.isCaptureEnabled());
        fileCallback=callback;fileOwner=source;fileOwnerUrl=source.getUrl();fileSelection=choice;
        fileSequence=fileSequence>=65000?4100:fileSequence+1;fileRequestCode=fileSequence;
        try{startActivityForResult(GalleryPicker415.create(this,choice,params),fileRequestCode);return true;}
        catch(ActivityNotFoundException primary){
            if(choice.visual){try{startActivityForResult(GalleryPicker415.fallback(choice),fileRequestCode);return true;}catch(RuntimeException fallback){/* fail closed below */}}
        }catch(RuntimeException failure){/* No handler or invalid platform request. */}
        finishFileSelection(null);Toast.makeText(this,"Galeri tidak dapat dibuka. Coba kembali.",Toast.LENGTH_SHORT).show();return true;
    }
    private void receiveFileSelection(int request,int result,Intent data){
        if(request!=fileRequestCode||fileCallback==null)return;
        if(!filePageCurrent()||result!=RESULT_OK){finishFileSelection(null);return;}
        final Uri[] selected;
        try{selected=GalleryPicker415.parse(result,data,fileSelection.limit);}
        catch(RuntimeException invalid){finishFileSelection(null);Toast.makeText(this,"Pilihan berkas tidak valid atau terlalu banyak.",Toast.LENGTH_LONG).show();return;}
        if(selected==null){finishFileSelection(null);return;}
        final ValueCallback<Uri[]> expected=fileCallback;
        final GalleryPicker415.Selection choice=fileSelection;
        if(fileValidator==null)fileValidator=java.util.concurrent.Executors.newSingleThreadExecutor();
        fileTimeout=()->{if(fileCallback==expected){finishFileSelection(null);Toast.makeText(this,"Berkas belum dapat dibaca. Pilih kembali dari galeri.",Toast.LENGTH_LONG).show();}};
        frame.postDelayed(fileTimeout,12000);
        fileValidation=fileValidator.submit(()->{
            Uri[] accepted=null;String failure=null;
            try{accepted=GalleryPicker415.validate(getApplicationContext(),choice,selected);}
            catch(RuntimeException e){failure=e instanceof IllegalArgumentException?e.getMessage():"Berkas tidak dapat dibaca. Pilih kembali.";}
            final Uri[] output=accepted;final String message=failure;
            runOnUiThread(()->{
                if(fileCallback!=expected)return;
                boolean current=filePageCurrent();finishFileSelection(current?output:null);
                if(current&&message!=null)Toast.makeText(this,message,Toast.LENGTH_LONG).show();
            });
        });
    }
    private AndroidGoogleLogin google;
    private int tab=HOME;
    private String lastUrl=BASE+paths[0];
    private String socialScript="", socialCss="", brandingScript="";
    private AppResources49 appResources;
    private boolean destroyed=false;
    private StartupOverlay launchOverlay;
    private Runnable slowTask;
    private View slowNotice;
    private boolean firstPaint=false,mainFailed=false;
    private String failureCode="",failureNote="";
    private long lastReloadAt=-10000L;
    private void clearOffline(){if(offline!=null){frame.removeView(offline);offline=null;}}
    private void cancelPageWait(){
        if(slowTask!=null){frame.removeCallbacks(slowTask);slowTask=null;}
        if(slowNotice!=null){frame.removeView(slowNotice);slowNotice=null;}
    }
    private void beginPageWait(WebView target){
        cancelPageWait();firstPaint=false;mainFailed=false;failureCode="";failureNote="";
        slowTask=()->{
            slowTask=null;if(destroyed||web!=target||firstPaint||offline!=null)return;
            endLaunchAnimation(false,"slow-page");
            LinearLayout note=column();note.setPadding(dp(16),dp(12),dp(16),dp(12));
            note.setBackgroundColor(PANEL);
            TextView msg=text("Memuat lebih lama dari biasanya. Anda tetap bisa berpindah menu.",13,TEXT);note.addView(msg);
            Button retry=new Button(this);retry.setText("Coba muat ulang");retry.setAllCaps(false);retry.setOnClickListener(v->confirmReload());note.addView(retry);
            slowNotice=note;FrameLayout.LayoutParams pos=new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM);frame.addView(note,pos);
        };
        frame.postDelayed(slowTask,20000);
    }
    private void pageReady(WebView target,String url){
        if(target!=web||!own(url)||mainFailed)return;
        firstPaint=true;cancelPageWait();clearOffline();progress.setVisibility(View.GONE);
    }
    private boolean currentRequest(WebView target,WebResourceRequest request){
        return target==web&&request.isForMainFrame()&&Recovery414.sameDocument(request.getUrl().toString(),lastUrl);
    }
    private void recoverPage(){
        long now=SystemClock.uptimeMillis();if(now-lastReloadAt<600)return;lastReloadAt=now;
        open(Recovery414.safeRetry(lastUrl,BASE+paths[tab]));
    }
    private void confirmReload(){
        new AlertDialog.Builder(this).setTitle("Muat ulang halaman?")
            .setMessage("Teks atau unggahan yang belum dikirim dapat hilang. Akun dan pesan yang tersimpan di server tidak dihapus.")
            .setPositiveButton("Muat ulang",(d,w)->recoverPage()).setNegativeButton("Batal",null).show();
    }
    private String appReport(){
        String connection="Belum diperiksa";
        try{
            android.net.ConnectivityManager cm=(android.net.ConnectivityManager)getSystemService(CONNECTIVITY_SERVICE);
            android.net.NetworkCapabilities c=cm==null?null:cm.getNetworkCapabilities(cm.getActiveNetwork());
            connection=c==null?"Tidak ada jaringan aktif":c.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_VALIDATED)?"Internet terdeteksi oleh Android":"Jaringan ada; akses internet belum terverifikasi";
        }catch(Exception ignored){}
        // No URLs/query strings, credentials, username, chat, prices or device identifiers.
        return "MarketMarney 4.20.0-beta\nMenu: "+labels[tab]+"\nAndroid: "+Build.VERSION.RELEASE+
            "\nKoneksi: "+connection+"\nStatus halaman: "+(mainFailed?failureCode:firstPaint?"Tampil":"Memuat")+
            "\nPaket uji terpisah. Google Login native belum didaftarkan untuk beta ini.";
    }
    private void reportDialog(String report){
        if(destroyed)return;
        new AlertDialog.Builder(this).setTitle("Status aplikasi").setMessage(report)
            .setPositiveButton("Tutup",null).setNeutralButton("Salin info",(d,w)->{
                android.content.ClipboardManager cb=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);
                if(cb!=null)cb.setPrimaryClip(android.content.ClipData.newPlainText("Status MarketMarney",report));
                Toast.makeText(this,"Info teknis disalin, tanpa data akun",Toast.LENGTH_SHORT).show();
            }).show();
    }
    private void showAppReport(){
        String report=appReport();WebView target=web;
        if(tab!=XAUWAR||target==null||!own(target.getUrl())||!XAUWAR_PAGE.equals(Uri.parse(target.getUrl()).getPath())){reportDialog(report);return;}
        target.evaluateJavascript("(function(){try{var d=window.MMGold&&window.MMGold.diagnostics();return d?{state:String(d.state||''),error:String(d.error||''),received:Number(d.received||0)}:null}catch(e){return null}})()",raw->{
            if(destroyed||target!=web)return;
            String extra="\nXAUWar: diagnosa feed belum tersedia.";
            try{
                JSONObject d=new JSONObject(raw);String code=d.optString("error");
                String detail;
                switch(code){
                    case "clock":detail="Jam perangkat berbeda dari server; periksa tanggal/waktu otomatis.";break;
                    case "sync":detail="Waktu server belum dapat diverifikasi.";break;
                    case "stale":detail="Data sumber kedaluwarsa; arena tetap dijeda.";break;
                    case "network":detail="Sumber harga atau sambungan waktu server gagal diakses.";break;
                    case "future":case "timestamp":case "order":detail="Waktu data tidak valid; data tidak dipakai.";break;
                    case "symbol":case "price":case "payload":detail="Respons sumber tidak valid; data tidak dipakai.";break;
                    default:detail="live".equals(d.optString("state"))?"Sampel sumber diterima. Bukan feed tick broker.":"Belum ada sampel valid yang dikonfirmasi.";
                }
                extra="\n\nXAUWar: "+detail+"\nTidak ada penggantian otomatis ke harga simulasi.";
            }catch(Exception ignored){}
            reportDialog(report+extra);
        });
    }
    private void appMenu(){
        new AlertDialog.Builder(this).setTitle("MarketMarney")
            .setItems(new String[]{"Muat ulang halaman","Kembali ke "+labels[tab],"Status aplikasi","Pengaturan tanggal & waktu"},(d,n)->{
                if(n==0)confirmReload();else if(n==1)navigate(tab);else if(n==2)showAppReport();
                else try{startActivity(new Intent(android.provider.Settings.ACTION_DATE_SETTINGS));}catch(ActivityNotFoundException e){Toast.makeText(this,"Pengaturan waktu tidak tersedia",Toast.LENGTH_SHORT).show();}
            }).show();
    }
    private void reselectTab(int selected){
        if(tab!=selected||web==null){navigate(selected);return;}
        String current=web.getUrl();
        if(offline!=null){recoverPage();return;}
        if(!own(current)||!Uri.parse(BASE+paths[tab]).getPath().equals(Uri.parse(current).getPath())){navigate(tab);return;}
        // Root reselect scrolls only. Keep Social's internal section, media and current state.
        web.scrollTo(0,0);
    }
    private void showLaunchAnimation(){
        if(destroyed||launchOverlay!=null)return;
        FrameLayout host=findViewById(android.R.id.content);
        root.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        launchOverlay=new StartupOverlay(this,()->{
            launchOverlay=null;
            if(!destroyed){root.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);updateSocialChrome();}
        });
        host.addView(launchOverlay,new FrameLayout.LayoutParams(-1,-1));
        getWindow().setStatusBarColor(Color.rgb(3,10,16));getWindow().setNavigationBarColor(Color.rgb(3,10,16));
        getWindow().getDecorView().setSystemUiVisibility(0);
        launchOverlay.requestApplyInsets();
    }
    private void endLaunchAnimation(boolean fade,String reason){
        if(launchOverlay!=null)launchOverlay.finish(fade,reason);
    }
    private boolean reelsChrome=false;
    private boolean lightSocial(){return tab==SOCIAL&&!reelsChrome;}

    private int dp(float n){return Math.round(n*getResources().getDisplayMetrics().density);}
    private TextView text(String value,int size,int color){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);return t;}
    private LinearLayout column(){LinearLayout v=new LinearLayout(this);v.setOrientation(LinearLayout.VERTICAL);return v;}
    private String asset(String name){
        try(InputStream in=getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>400000)throw new IllegalStateException("Asset too large");}
            return out.toString("UTF-8");
        }catch(Exception e){return "";}
    }
    private boolean own(Uri u){return u!=null&&"https".equalsIgnoreCase(u.getScheme())&&"marketmarney.com".equalsIgnoreCase(u.getHost())&&(u.getPort()==-1||u.getPort()==443)&&u.getUserInfo()==null;}
    private boolean own(String url){try{return own(Uri.parse(url));}catch(Exception e){return false;}}

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        if(state!=null)fileSequence=state.getInt("gallerySequence",4100);
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
            @Override public void handleOnBackPressed(){
                if(!handleAppBack()){
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
        getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(PANEL);
        getWindow().getDecorView().setSystemUiVisibility(0);
        root=column();root.setBackgroundColor(BG);setContentView(root);
        root.setOnApplyWindowInsetsListener((v,i)->{
            int top=i.getSystemWindowInsetTop(), bot=i.getSystemWindowInsetBottom();
            if(Build.VERSION.SDK_INT>=30){
                android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars());
                android.graphics.Insets keyboard=i.getInsets(WindowInsets.Type.ime());
                top=bars.top;bot=Math.max(bars.bottom,keyboard.bottom);
                if(bottom!=null&&fullVideo==null)bottom.setVisibility(i.isVisible(WindowInsets.Type.ime())?View.GONE:View.VISIBLE);
            }
            v.setPadding(0,top,0,bot);return i;
        });
        progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);progress.setProgressTintList(android.content.res.ColorStateList.valueOf(GOLD));
        root.addView(progress,new LinearLayout.LayoutParams(-1,dp(2)));
        frame=new FrameLayout(this);root.addView(frame,new LinearLayout.LayoutParams(-1,0,1));
        bottom=new LinearLayout(this);bottom.setBackgroundColor(PANEL);bottom.setElevation(dp(2));
        bottom.setPadding(dp(4),dp(5),dp(4),dp(3));root.addView(bottom,new LinearLayout.LayoutParams(-1,dp(70)));
        socialCss=asset("social44.css")+"\n"+asset("reels46.css")+"\n"+asset("navigation47.css")+"\n"+asset("premium411.css");socialScript=asset("profile49.js")+"\n"+asset("social44.js")+"\n"+asset("reels46.js")+"\n"+asset("navigation47.js");
        brandingScript=asset("branding417.js");
        appResources=AppResources49.install(getApplicationContext());
        google=new AndroidGoogleLogin(this,new AndroidGoogleLogin.Listener(){
            @Override public void onStatus(String message){if(!destroyed)Toast.makeText(MainActivity.this,message,Toast.LENGTH_LONG).show();}
            @Override public void onSignedIn(String username){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}
            @Override public void onSignedOut(){dropRetained();if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}
        });
        int initial=state==null?HOME:state.getInt("selectedTab",HOME);
        // UI-test launch extra selects a tab only; never changes origin, security or auth.
        if(state==null)initial=getIntent().getIntExtra("startTab",initial);
        initial=Math.max(0,Math.min(labels.length-1,initial));
        boolean restored=false;
        if(state!=null){
            Bundle history=state.getBundle("webHistory");
            if(history!=null){
                tab=initial;updateSocialChrome();drawTabs();createWeb();
                restored=web.restoreState(history)!=null&&own(web.getUrl());
                if(restored){lastUrl=web.getUrl();firstPaint=true;progress.setVisibility(View.GONE);}
                else disposeWeb();
            }
        }
        if(!restored)navigate(initial);
        if(state==null)showLaunchAnimation();
        // Web pages already validate their own cookie session. Beta has no native
        // Google session: do not issue a second request/reload just after startup.
        if(getPackageName().equals("com.marketmarney.mobile"))google.refreshSession();
    }

    private void drawTabs(){
        bottom.removeAllViews();
        for(int i=0;i<labels.length;i++){
            final int dest=i;boolean selected=i==tab;
            LinearLayout cell=column();cell.setGravity(Gravity.CENTER);cell.setClickable(true);cell.setFocusable(true);
            cell.setContentDescription(labels[i]);cell.setSelected(selected);
            // Amber feedback uses the platform ripple; no extra animator or page work.
            GradientDrawable rippleMask=new GradientDrawable();rippleMask.setColor(Color.WHITE);rippleMask.setCornerRadius(dp(18));
            cell.setBackground(new android.graphics.drawable.RippleDrawable(android.content.res.ColorStateList.valueOf(lightSocial()?0x1fa66916:0x26ffb84d),null,rippleMask));
            FrameLayout iconShell=new FrameLayout(this);
            GradientDrawable pill=new GradientDrawable();pill.setCornerRadius(dp(15));
            pill.setColor(selected?(lightSocial()?Color.rgb(255,243,220):Color.rgb(49,39,27)):Color.TRANSPARENT);
            pill.setStroke(dp(1),selected?(lightSocial()?Color.rgb(235,205,151):Color.rgb(121,87,42)):Color.TRANSPARENT);
            iconShell.setBackground(pill);
            NavIcon icon=new NavIcon(i,selected);FrameLayout.LayoutParams ip=new FrameLayout.LayoutParams(dp(26),dp(25),Gravity.CENTER);iconShell.addView(icon,ip);
            cell.addView(iconShell,new LinearLayout.LayoutParams(dp(53),dp(33)));
            TextView title=text(labels[i],10,selected?(lightSocial()?Color.rgb(125,87,25):GOLD):(lightSocial()?Color.rgb(125,125,125):MUTED));title.setSingleLine(true);title.setGravity(Gravity.CENTER);
            // Five equal touch targets; fit the full Social Marney label on narrow screens.
            if(Build.VERSION.SDK_INT>=26)title.setAutoSizeTextTypeUniformWithConfiguration(9,11,1,android.util.TypedValue.COMPLEX_UNIT_SP);
            title.setTypeface(Typeface.DEFAULT,selected?Typeface.BOLD:Typeface.NORMAL);
            LinearLayout.LayoutParams labelParams=new LinearLayout.LayoutParams(-1,-2);labelParams.topMargin=dp(3);cell.addView(title,labelParams);
            View line=new View(this);GradientDrawable shape=new GradientDrawable();shape.setColor(selected?(lightSocial()?Color.rgb(160,111,34):GOLD):Color.TRANSPARENT);shape.setCornerRadius(dp(2));line.setBackground(shape);
            LinearLayout.LayoutParams lineParams=new LinearLayout.LayoutParams(dp(16),dp(2));lineParams.topMargin=dp(2);cell.addView(line,lineParams);
            cell.setOnClickListener(v->reselectTab(dest));
            cell.setOnLongClickListener(v->{appMenu();return true;});
            if(Build.VERSION.SDK_INT>=26)cell.setTooltipText(labels[i]+" · tahan untuk pilihan aplikasi");
            bottom.addView(cell,new LinearLayout.LayoutParams(0,-1,1));
        }
    }
    private final class NavIcon extends View {
        private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);private final int kind;private final boolean active;
        NavIcon(int k,boolean a){super(MainActivity.this);kind=k;active=a;setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);}
        @Override protected void onDraw(Canvas c){super.onDraw(c);c.save();c.scale(getWidth()/28f,getHeight()/26f);c.translate(2,1);
            p.setColor(active?(lightSocial()?Color.rgb(125,87,25):GOLD):(lightSocial()?Color.rgb(125,125,125):MUTED));p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(active?2f:1.65f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);
            Path q=new Path();
            if(kind==HOME){q.moveTo(3,10);q.lineTo(12,3);q.lineTo(21,10);q.moveTo(5,9);q.lineTo(5,21);q.lineTo(10,21);q.lineTo(10,14);q.lineTo(14,14);q.lineTo(14,21);q.lineTo(19,21);q.lineTo(19,9);c.drawPath(q,p);}
            else if(kind==NEWS){c.drawRoundRect(3,3,21,21,2,2,p);c.drawRect(6,7,11,12,p);c.drawLine(14,7,18,7,p);c.drawLine(14,11,18,11,p);c.drawLine(6,16,18,16,p);c.drawLine(6,19,15,19,p);}
            else if(kind==XAUWAR){q.moveTo(12,2);q.lineTo(21,6);q.lineTo(20,14);q.cubicTo(18,19,15,21,12,23);q.cubicTo(9,21,6,19,4,14);q.lineTo(3,6);q.close();c.drawPath(q,p);c.drawLine(8,8,16,16,p);c.drawLine(16,8,8,16,p);}
            else if(kind==MARKET){c.drawLine(5,4,5,21,p);c.drawRect(3,8,7,15,p);c.drawLine(12,2,12,19,p);c.drawRect(10,5,14,12,p);c.drawLine(19,7,19,23,p);c.drawRect(17,11,21,18,p);}
            else {c.drawRoundRect(2,3,22,20,6,6,p);q.moveTo(7,20);q.lineTo(6,23);q.lineTo(12,20);c.drawPath(q,p);c.drawCircle(9,10,2,p);q.reset();q.moveTo(5,16);q.cubicTo(6,12,12,12,13,16);c.drawPath(q,p);c.drawCircle(17,9,1.5f,p);c.drawLine(16,14,19,14,p);}
            c.restore();
        }
    }
    private void disposeWeb(){
        cancelPageWait();
        finishFileSelection(null);
        if(web!=null){WebView old=web;web=null;old.stopLoading();old.setWebChromeClient(null);old.setWebViewClient(null);frame.removeView(old);old.destroy();}
        if(offline!=null){frame.removeView(offline);offline=null;}
    }
    private void navigate(int selected){
        if(selected<0||selected>=labels.length||destroyed)return;
        cancelPageWait();navigationStarted=SystemClock.uptimeMillis();
        WebView cached=retained.remove(selected);
        if(canRetain()){
            WebView previous=web;web=null;suspendPage(previous);frame.removeView(previous);
            WebView replaced=retained.put(tab,previous);if(replaced!=null&&replaced!=previous)discardView(replaced);
            while(retained.size()>1){Integer key=retained.keySet().iterator().next();discardView(retained.remove(key));}
        }else disposeWeb();
        tab=selected;reelsChrome=tab==SOCIAL&&cached!=null&&cached.getUrl()!=null&&cached.getUrl().endsWith("#mm44-reels");updateSocialChrome();drawTabs();
        if(cached!=null){
            web=cached;frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
            firstPaint=true;mainFailed=false;failureCode="";failureNote="";clearOffline();
            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);
            progress.setVisibility(View.GONE);
            Log.i("MM45_NAV","warm tab="+tab+" ms="+(SystemClock.uptimeMillis()-navigationStarted));
        }else{createWeb();open(BASE+paths[tab]);Log.i("MM45_NAV","cold tab="+tab);}
    }
    private void updateSocialChrome(){
        boolean light=lightSocial();
        int canvas=light?Color.WHITE:BG;
        root.setBackgroundColor(canvas);
        getWindow().setStatusBarColor(canvas);
        getWindow().setNavigationBarColor(light?Color.WHITE:PANEL);
        int flags=light?View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR:0;
        if(Build.VERSION.SDK_INT>=26&&light)flags|=View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        getWindow().getDecorView().setSystemUiVisibility(flags);
        if(bottom!=null)bottom.setBackgroundColor(light?Color.WHITE:PANEL);
    }
    private String latestXauWarUrl(Uri incoming){
        if(!own(incoming)||!XAUWAR_PAGE.equals(incoming.getPath()))throw new IllegalArgumentException("Not a trusted XAUWar link");
        Uri.Builder next=incoming.buildUpon().clearQuery();
        for(String name:incoming.getQueryParameterNames()){
            if(!"v".equals(name))for(String value:incoming.getQueryParameters(name))next.appendQueryParameter(name,value);
        }
        next.appendQueryParameter("v",XAUWAR_VERSION);
        return next.build().toString();
    }
    private void open(String url){if(web==null||!own(url))return;beginPageWait(web);lastUrl=url;if(offline!=null){frame.removeView(offline);offline=null;}web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);if(NEWS_PATH.equals(Uri.parse(url).getPath())){
            String html=asset("news43.html");
            if(html.isEmpty()){showOffline("Berkas Berita tidak tersedia.");return;}
            web.loadDataWithBaseURL(BASE+NEWS_PATH,html,"text/html","UTF-8",BASE+NEWS_PATH);
        }else web.loadUrl(url);
    }
    private void signIn(){
        if(!getPackageName().equals("com.marketmarney.mobile")){
            new AlertDialog.Builder(this).setTitle("Login aplikasi beta")
                .setMessage("Google Login belum tersedia di APK beta ini. Jika sebelumnya sudah membuat username dan kata sandi, gunakan keduanya untuk masuk di aplikasi.\n\nUntuk akun yang hanya memakai Google, gunakan versi web melalui browser. Login di browser hanya berlaku untuk versi web dan tidak membuat APK ini ikut masuk.")
                .setPositiveButton("Masuk di aplikasi",(d,w)->open(BASE+"/akun.html"))
                .setNeutralButton("Buka versi web",(d,w)->{
                    try{
                        Intent browser=new Intent(Intent.ACTION_VIEW,Uri.parse(BASE+"/akun.html"));
                        browser.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(browser);
                    }catch(ActivityNotFoundException|SecurityException e){
                        Toast.makeText(this,"Browser tidak dapat dibuka. Coba kembali.",Toast.LENGTH_LONG).show();
                    }
                })
                .setNegativeButton("Kembali",null).show();return;
        }
        google.signIn();
    }
    private void createWeb(){
        web=new WebView(this);web.setBackgroundColor(lightSocial()?Color.WHITE:BG);web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setLoadsImagesAutomatically(true);
        s.setUseWideViewPort(true);s.setLoadWithOverviewMode(true);s.setTextZoom(100);
        s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setMediaPlaybackRequiresUserGesture(true);
        if(Build.VERSION.SDK_INT>=26)s.setSafeBrowsingEnabled(true);
        s.setUserAgentString(s.getUserAgentString()+" MarketMarneyAndroid/4.20 AppShell");
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){
                Uri u=req.getUrl();
                if(appResources!=null){WebResourceResponse local=appResources.respond(req,"view");if(local!=null)return local;}
                if(own(u)&&NEWS_PATH.equals(u.getPath())&&"GET".equals(req.getMethod())){
                    try{
                        WebResourceResponse r=new WebResourceResponse("text/html","UTF-8",getAssets().open("news43.html"));
                        Map<String,String> h=new HashMap<>();h.put("Cache-Control","no-store");h.put("X-Content-Type-Options","nosniff");
                        h.put("Content-Security-Policy","default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src https: data:; base-uri 'none'; form-action 'none'");
                        r.setResponseHeaders(h);return r;
                    }catch(Exception e){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream("Halaman Berita belum dapat dibuka.".getBytes(StandardCharsets.UTF_8)));}
                }
                return null;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest req){
                Uri u=req.getUrl();
                if(!req.isForMainFrame())return false;
                if(own(u)){
                    String p=u.getPath()==null?"":u.getPath();
                    if(NEWS_PATH.equals(p)){navigate(NEWS);return true;}
                    if(XAUWAR_PAGE.equals(p)){
                        String latest=latestXauWarUrl(u);
                        if(tab!=XAUWAR){navigate(XAUWAR);if(!(BASE+XAUWAR_PATH).equals(latest))open(latest);return true;}
                        if(!latest.equals(u.toString())){open(latest);return true;}
                    }
                    if(p.startsWith("/api/auth/google/start")){signIn();return true;}
                    if("/index.html".equals(p)||"/".equals(p)){
                        String h=u.getFragment();
                        if("berita".equals(h)){navigate(NEWS);return true;}
                        if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}
                    }
                    if(("/beranda-trader.html".equals(p)||"/grup-trader.html".equals(p))&&tab!=SOCIAL){navigate(SOCIAL);if(u.getQuery()!=null||u.getFragment()!=null||"/grup-trader.html".equals(p))open(u.toString());return true;}
                    return false;
                }
                if(req.hasGesture()&&"https".equalsIgnoreCase(u.getScheme())){
                    new AlertDialog.Builder(MainActivity.this).setTitle("Buka situs sumber?")
                        .setMessage(u.getHost()).setPositiveButton("Buka",(d,w)->{
                            try{Intent it=new Intent(Intent.ACTION_VIEW,u);it.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(it);}catch(ActivityNotFoundException ex){Toast.makeText(MainActivity.this,"Browser tidak ditemukan",Toast.LENGTH_SHORT).show();}
                        }).setNegativeButton("Batal",null).show();
                }
                return true;
            }
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){
                if(own(url)){String p=Uri.parse(url).getPath();if("/akun.html".equals(p)||p!=null&&p.startsWith("/api/auth/"))dropRetained();}
                if(v!=web)return;if(fileOwner==v)finishFileSelection(null);clearOffline();beginPageWait(v);progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;
            }
            @Override public void doUpdateVisitedHistory(WebView v,String url,boolean reload){
                if(v!=web||!own(url))return;
                boolean next=tab==SOCIAL&&"mm44-reels".equals(Uri.parse(url).getFragment());
                if(next!=reelsChrome){reelsChrome=next;updateSocialChrome();drawTabs();}
            }
            @Override public void onPageCommitVisible(WebView v,String url){adapt(v,url);if(v==web&&own(url)){pageReady(v,url);endLaunchAnimation(true,"first-frame");}}
            @Override public void onPageFinished(WebView v,String url){if(v!=web)return;pageReady(v,url);adapt(v,url);endLaunchAnimation(true,"page-finished");}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError error){if(currentRequest(v,r)){String code=Recovery414.networkCode(error.getErrorCode());showFailure(code,Recovery414.message(code));}}
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse response){if(currentRequest(v,r)&&response.getStatusCode()>=400){String code="HTTP "+response.getStatusCode();showFailure(code,Recovery414.message(code));}}
            @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,SslError error){handler.cancel();if(v==web&&Recovery414.sameDocument(error.getUrl(),lastUrl))showFailure("TLS",Recovery414.message("TLS"));}
            @Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){
                if(v==web){dropRetained();disposeWeb();createWeb();showFailure("RENDER",Recovery414.message("RENDER"));}
                else if(retained.values().remove(v)){discardView(v);}return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView v,int n){if(v!=web)return;progress.setProgress(n);progress.setVisibility(n==100||firstPaint||mainFailed?View.GONE:View.VISIBLE);}
            @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){
                if(!own(url)){result.cancel();return true;}
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Lanjutkan",(d,w)->result.confirm()).setNegativeButton("Batal",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
            }
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
                return chooseFile(v,cb,params);
            }
            @Override public void onShowCustomView(View v,CustomViewCallback callback){
                if(fullVideo!=null){callback.onCustomViewHidden();return;}fullVideo=v;fullVideoCallback=callback;
                root.setVisibility(View.GONE);addContentView(v,new ViewGroup.LayoutParams(-1,-1));
            }
            @Override public void onHideCustomView(){closeFullVideo();}
        });
        frame.addView(web,new FrameLayout.LayoutParams(-1,-1));
    }
    private void adapt(WebView v,String url){
        if(destroyed||v!=web||!own(url)||!Recovery414.sameDocument(url,v.getUrl()))return;
        Uri expected=Uri.parse(url);
        v.getSettings().setMediaPlaybackRequiresUserGesture(!"/beranda-trader.html".equals(expected.getPath()));
        // A WebView callback may be queued while the document is replaced. Check
        // both native identity and the actual JS document before touching the DOM.
        String ready="location.protocol==='https:'&&location.hostname==='marketmarney.com'&&(!location.port||location.port==='443')&&location.pathname==="+JSONObject.quote(expected.getPath())+
            "&&location.search==="+JSONObject.quote(expected.getEncodedQuery()==null?"":"?"+expected.getEncodedQuery())+"&&document.documentElement&&document.head&&document.body";
        String common="window.MarketMarneyApp={platform:'android',version:'4.20'};document.documentElement.dataset.mmAndroid='420';if(!document.getElementById('mm43-common')){var s=document.createElement('style');s.id='mm43-common';s.textContent='#mmInstall{display:none!important}';document.head.appendChild(s)}";
        v.evaluateJavascript("(function(){if(!("+ready+"))return;"+common+"\n"+brandingScript+"\n})()",null);
        String path=expected.getPath();
        if("/beranda-trader.html".equals(path)||"/profil.html".equals(path)||"/grup-trader.html".equals(path)){
            String css="var s=document.getElementById('mm43-social-style');if(!s){s=document.createElement('style');s.id='mm43-social-style';document.head.appendChild(s)}if(s.dataset.revision!=='420'){s.textContent="+JSONObject.quote(socialCss)+";s.dataset.revision='420';}";
            // Style and helpers share one guarded evaluation, not two independently
            // queued calls. onPageFinished retries when the new DOM is complete.
            v.evaluateJavascript("(function(){if(!("+ready+")||window.__mm411BundledReady)return;"+css+"\n"+socialScript+"\n})()",null);
        }
    }
    private void showOffline(String message){showFailure("UNAVAILABLE",message);}
    private void showFailure(String code,String message){
        endLaunchAnimation(false,"connection-error");cancelPageWait();
        if(destroyed)return;mainFailed=true;failureCode=code;failureNote=message;progress.setVisibility(View.GONE);clearOffline();
        LinearLayout box=column();box.setGravity(Gravity.CENTER);box.setPadding(dp(24),dp(18),dp(24),dp(18));box.setBackgroundColor(BG);
        ImageView brand=new ImageView(this);brand.setImageResource(R.drawable.mm_brand_logo);brand.setScaleType(ImageView.ScaleType.FIT_CENTER);brand.setContentDescription("MARNEY — MarketMarney");box.addView(brand,new LinearLayout.LayoutParams(dp(112),dp(112)));
        TextView badge=text("MARKETMARNEY / "+labels[tab].toUpperCase(java.util.Locale.ROOT),11,GOLD);badge.setGravity(Gravity.CENTER);box.addView(badge);
        TextView title=text("Halaman belum tersedia",22,TEXT);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);box.addView(title);
        TextView note=text(message,14,MUTED);note.setGravity(Gravity.CENTER);LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(-1,-2);np.topMargin=dp(14);np.bottomMargin=dp(14);box.addView(note,np);
        Button retry=new Button(this);retry.setText("Coba lagi");retry.setAllCaps(false);retry.setTextColor(BG);retry.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GOLD));retry.setOnClickListener(v->recoverPage());box.addView(retry,new LinearLayout.LayoutParams(-1,dp(48)));
        Button home=new Button(this);home.setText("Kembali ke "+labels[tab]);home.setAllCaps(false);home.setOnClickListener(v->navigate(tab));box.addView(home,new LinearLayout.LayoutParams(-1,dp(48)));
        TextView help=text("Info koneksi · "+code,12,MUTED);help.setGravity(Gravity.CENTER);help.setPadding(0,dp(12),0,dp(12));help.setOnClickListener(v->showAppReport());box.addView(help);
        android.widget.ScrollView scroll=new android.widget.ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);scroll.addView(box,new android.widget.ScrollView.LayoutParams(-1,-1));
        offline=scroll;frame.addView(offline,new FrameLayout.LayoutParams(-1,-1));
    }
    private void closeFullVideo(){if(fullVideo==null)return;ViewGroup parent=(ViewGroup)fullVideo.getParent();if(parent!=null)parent.removeView(fullVideo);fullVideo=null;root.setVisibility(View.VISIBLE);if(fullVideoCallback!=null)fullVideoCallback.onCustomViewHidden();fullVideoCallback=null;}
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);receiveFileSelection(request,result,data);
    }
    private boolean handleAppBack(){
        if(launchOverlay!=null){endLaunchAnimation(false,"back");return true;}
        if(fullVideo!=null){closeFullVideo();return true;}
        if(tab==NEWS&&web!=null&&web.getUrl()!=null&&!NEWS_PATH.equals(Uri.parse(web.getUrl()).getPath())){navigate(NEWS);return true;}
        if(web!=null&&web.canGoBack()){web.goBack();return true;}
        if(tab!=HOME){navigate(HOME);return true;}return false;
    }
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putInt("selectedTab",tab);state.putInt("gallerySequence",fileSequence);if(web!=null){Bundle b=new Bundle();web.saveState(b);state.putBundle("webHistory",b);}}
    @Override protected void onPause(){
        cancelPageWait();if(launchOverlay!=null)launchOverlay.dispose();
        if(web!=null){if(own(web.getUrl()))web.evaluateJavascript("try{window.__mm45Suspended=true;window.dispatchEvent(new Event('mm45:suspend'));document.querySelectorAll('video,audio').forEach(function(v){v.pause()})}catch(e){}",null);if(tab==XAUWAR)web.setVisibility(View.GONE);web.onPause();}
        super.onPause();
    }
    @Override protected void onResume(){super.onResume();if(web!=null)resumePage(web);}
    @Override public void onTrimMemory(int level){super.onTrimMemory(level);if(level>=android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW)dropRetained();}
    @Override protected void onDestroy(){destroyed=true;if(launchOverlay!=null)launchOverlay.dispose();closeFullVideo();dropRetained();disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();}
}
