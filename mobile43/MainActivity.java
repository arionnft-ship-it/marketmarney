package com.marketmarney.mobile;

import android.app.Activity;
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
import org.json.JSONObject;

/** Four destinations only. Web content remains inside the app. No JavaScript bridge. */
public final class MainActivity extends Activity {
    private static final String BASE = "https://marketmarney.com";
    private static final String NEWS_PATH = "/__android43/news";
    private static final int HOME=0, NEWS=1, MARKET=2, SOCIAL=3, PICK_FILE=40;
    private static final int BG=Color.rgb(6,15,25), PANEL=Color.rgb(13,27,40);
    private static final int GOLD=Color.rgb(244,188,62), TEXT=Color.rgb(240,245,250), MUTED=Color.rgb(145,164,180);
    private final String[] labels={"Beranda","Berita","Market Live","Social Marney"};
    private final String[] paths={"/index.html",NEWS_PATH,"/index.html#marketlive","/beranda-trader.html"};
    private LinearLayout root, bottom;
    private FrameLayout frame;
    private ProgressBar progress;
    private View offline, fullVideo;
    private WebChromeClient.CustomViewCallback fullVideoCallback;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private AndroidGoogleLogin google;
    private int tab=HOME;
    private String lastUrl=BASE+paths[0];
    private String socialScript="", socialCss="";
    private boolean destroyed=false;

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
        bottom=new LinearLayout(this);bottom.setBackgroundColor(PANEL);bottom.setElevation(dp(10));
        bottom.setPadding(dp(3),dp(4),dp(3),dp(2));root.addView(bottom,new LinearLayout.LayoutParams(-1,dp(66)));
        socialCss=asset("social43.css");socialScript=asset("social43.js");
        google=new AndroidGoogleLogin(this,new AndroidGoogleLogin.Listener(){
            @Override public void onStatus(String message){if(!destroyed)Toast.makeText(MainActivity.this,message,Toast.LENGTH_LONG).show();}
            @Override public void onSignedIn(String username){if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}
            @Override public void onSignedOut(){if(!destroyed&&tab==SOCIAL&&web!=null)web.reload();}
        });
        int initial=state==null?HOME:state.getInt("selectedTab",HOME);
        // UI-test launch extra selects a tab only; never changes origin, security or auth.
        if(state==null)initial=getIntent().getIntExtra("startTab",initial);
        navigate(Math.max(0,Math.min(3,initial)));
        if(state!=null){Bundle history=state.getBundle("webHistory");if(history!=null&&web!=null)web.restoreState(history);}
        google.refreshSession();
    }

    private void drawTabs(){
        bottom.removeAllViews();
        for(int i=0;i<4;i++){
            final int dest=i;boolean selected=i==tab;
            LinearLayout cell=column();cell.setGravity(Gravity.CENTER);cell.setClickable(true);cell.setFocusable(true);
            cell.setContentDescription(labels[i]);cell.setSelected(selected);
            android.util.TypedValue ripple=new android.util.TypedValue();getTheme().resolveAttribute(android.R.attr.selectableItemBackground,ripple,true);cell.setBackgroundResource(ripple.resourceId);
            NavIcon icon=new NavIcon(i,selected);cell.addView(icon,new LinearLayout.LayoutParams(dp(28),dp(26)));
            TextView title=text(labels[i],11,selected?GOLD:MUTED);title.setSingleLine(true);title.setGravity(Gravity.CENTER);
            title.setTypeface(Typeface.DEFAULT,selected?Typeface.BOLD:Typeface.NORMAL);
            LinearLayout.LayoutParams labelParams=new LinearLayout.LayoutParams(-1,-2);labelParams.topMargin=dp(3);cell.addView(title,labelParams);
            View line=new View(this);GradientDrawable shape=new GradientDrawable();shape.setColor(selected?GOLD:Color.TRANSPARENT);shape.setCornerRadius(dp(2));line.setBackground(shape);
            LinearLayout.LayoutParams lineParams=new LinearLayout.LayoutParams(dp(22),dp(2));lineParams.topMargin=dp(4);cell.addView(line,lineParams);
            cell.setOnClickListener(v->{if(tab==dest&&web!=null){web.scrollTo(0,0);}else navigate(dest);});
            bottom.addView(cell,new LinearLayout.LayoutParams(0,-1,1));
        }
    }
    private final class NavIcon extends View {
        private final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);private final int kind;private final boolean active;
        NavIcon(int k,boolean a){super(MainActivity.this);kind=k;active=a;setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);}
        @Override protected void onDraw(Canvas c){super.onDraw(c);c.save();c.scale(getWidth()/28f,getHeight()/26f);c.translate(2,1);
            p.setColor(active?GOLD:MUTED);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(active?2f:1.65f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);
            Path q=new Path();
            if(kind==HOME){q.moveTo(3,10);q.lineTo(12,3);q.lineTo(21,10);q.moveTo(5,9);q.lineTo(5,21);q.lineTo(10,21);q.lineTo(10,14);q.lineTo(14,14);q.lineTo(14,21);q.lineTo(19,21);q.lineTo(19,9);c.drawPath(q,p);}
            else if(kind==NEWS){c.drawRoundRect(3,3,21,21,2,2,p);c.drawRect(6,7,11,12,p);c.drawLine(14,7,18,7,p);c.drawLine(14,11,18,11,p);c.drawLine(6,16,18,16,p);c.drawLine(6,19,15,19,p);}
            else if(kind==MARKET){c.drawLine(5,4,5,21,p);c.drawRect(3,8,7,15,p);c.drawLine(12,2,12,19,p);c.drawRect(10,5,14,12,p);c.drawLine(19,7,19,23,p);c.drawRect(17,11,21,18,p);}
            else {c.drawRoundRect(2,3,22,20,6,6,p);q.moveTo(7,20);q.lineTo(6,23);q.lineTo(12,20);c.drawPath(q,p);c.drawCircle(9,10,2,p);q.reset();q.moveTo(5,16);q.cubicTo(6,12,12,12,13,16);c.drawPath(q,p);c.drawCircle(17,9,1.5f,p);c.drawLine(16,14,19,14,p);}
            c.restore();
        }
    }
    private void disposeWeb(){
        if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}
        if(web!=null){WebView old=web;web=null;old.stopLoading();old.setWebChromeClient(null);old.setWebViewClient(null);frame.removeView(old);old.destroy();}
        if(offline!=null){frame.removeView(offline);offline=null;}
    }
    private void navigate(int selected){tab=selected;drawTabs();disposeWeb();createWeb();open(BASE+paths[tab]);}
    private void open(String url){if(web==null||!own(url))return;lastUrl=url;if(offline!=null){frame.removeView(offline);offline=null;}web.setVisibility(View.VISIBLE);progress.setVisibility(View.VISIBLE);web.loadUrl(url);}
    private void signIn(){
        if(!getPackageName().equals("com.marketmarney.mobile")){
            new AlertDialog.Builder(this).setTitle("Login pada aplikasi uji")
                .setMessage("Google Login aplikasi utama tetap tidak diubah. Sertifikat APK Beta ini belum didaftarkan ke Google Cloud. Anda dapat masuk menggunakan email yang sudah terdaftar.")
                .setPositiveButton("Masuk dengan email",(d,w)->open(BASE+"/akun.html"))
                .setNegativeButton("Kembali",null).show();return;
        }
        google.signIn();
    }
    private void createWeb(){
        web=new WebView(this);web.setBackgroundColor(BG);web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setLoadsImagesAutomatically(true);
        s.setUseWideViewPort(true);s.setLoadWithOverviewMode(true);s.setTextZoom(100);
        s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);s.setJavaScriptCanOpenWindowsAutomatically(false);s.setMediaPlaybackRequiresUserGesture(true);
        if(Build.VERSION.SDK_INT>=26)s.setSafeBrowsingEnabled(true);
        s.setUserAgentString(s.getUserAgentString()+" MarketMarneyAndroid/4.3 AppShell");
        CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest req){
                Uri u=req.getUrl();
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
                    if(p.startsWith("/api/auth/google/start")){signIn();return true;}
                    if("/index.html".equals(p)||"/".equals(p)){
                        String h=u.getFragment();
                        if("berita".equals(h)){navigate(NEWS);return true;}
                        if("marketlive".equals(h)&&tab!=MARKET){navigate(MARKET);return true;}
                    }
                    if("/beranda-trader.html".equals(p)&&tab!=SOCIAL){navigate(SOCIAL);if(u.getQuery()!=null)open(u.toString());return true;}
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
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;}
            @Override public void onPageCommitVisible(WebView v,String url){adapt(v,url);}
            @Override public void onPageFinished(WebView v,String url){progress.setVisibility(View.GONE);adapt(v,url);CookieManager.getInstance().flush();}
            @Override public void onReceivedError(WebView v,WebResourceRequest r,WebResourceError error){if(r.isForMainFrame())showOffline("Periksa koneksi internet, lalu coba lagi.");}
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest r,WebResourceResponse response){if(r.isForMainFrame()&&response.getStatusCode()>=400)showOffline("Halaman sedang tidak tersedia. Data Anda tidak dihapus.");}
            @Override public void onReceivedSslError(WebView v,SslErrorHandler handler,SslError error){handler.cancel();showOffline("Koneksi aman belum dapat diverifikasi. Periksa tanggal perangkat dan koneksi Anda.");}
            @Override public boolean onRenderProcessGone(WebView v,RenderProcessGoneDetail detail){disposeWeb();createWeb();showOffline("Tampilan perlu dimuat ulang.");return true;}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onProgressChanged(WebView v,int n){progress.setProgress(n);progress.setVisibility(n==100?View.GONE:View.VISIBLE);}
            @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){
                if(!own(url)){result.cancel();return true;}
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Lanjutkan",(d,w)->result.confirm()).setNegativeButton("Batal",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;
            }
            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;
                try{startActivityForResult(params.createIntent(),PICK_FILE);return true;}catch(Exception e){fileCallback=null;cb.onReceiveValue(null);return false;}
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
        if(destroyed||v!=web||!own(url))return;
        String common="try{window.MarketMarneyApp={platform:'android',version:'4.3'};document.documentElement.dataset.mmAndroid='43';if(!document.getElementById('mm43-common')){var s=document.createElement('style');s.id='mm43-common';s.textContent='#mmInstall{display:none!important}';document.head.appendChild(s)}}catch(e){}";
        v.evaluateJavascript(common,null);
        if("/beranda-trader.html".equals(Uri.parse(url).getPath())){
            String css="(function(){var s=document.getElementById('mm43-social-style');if(!s){s=document.createElement('style');s.id='mm43-social-style';document.head.appendChild(s)}s.textContent="+JSONObject.quote(socialCss)+";})()";
            v.evaluateJavascript(css,null);v.evaluateJavascript(socialScript,null);
        }
    }
    private void showOffline(String message){
        if(destroyed||offline!=null)return;progress.setVisibility(View.GONE);
        LinearLayout box=column();box.setGravity(Gravity.CENTER);box.setPadding(dp(28),dp(28),dp(28),dp(28));box.setBackgroundColor(BG);
        TextView title=text("Belum terhubung",24,TEXT);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);box.addView(title);
        TextView note=text(message,15,MUTED);note.setGravity(Gravity.CENTER);LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(-1,-2);np.topMargin=dp(14);np.bottomMargin=dp(22);box.addView(note,np);
        Button retry=new Button(this);retry.setText("Coba lagi");retry.setAllCaps(false);retry.setTextColor(BG);retry.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GOLD));retry.setOnClickListener(v->open(lastUrl));box.addView(retry,new LinearLayout.LayoutParams(-1,dp(50)));
        offline=box;frame.addView(offline,new FrameLayout.LayoutParams(-1,-1));
    }
    private void closeFullVideo(){if(fullVideo==null)return;ViewGroup parent=(ViewGroup)fullVideo.getParent();if(parent!=null)parent.removeView(fullVideo);fullVideo=null;root.setVisibility(View.VISIBLE);if(fullVideoCallback!=null)fullVideoCallback.onCustomViewHidden();fullVideoCallback=null;}
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==PICK_FILE&&fileCallback!=null){fileCallback.onReceiveValue(result==RESULT_OK?WebChromeClient.FileChooserParams.parseResult(result,data):null);fileCallback=null;}}
    @Override public void onBackPressed(){if(fullVideo!=null){closeFullVideo();return;}if(web!=null&&web.canGoBack()){web.goBack();return;}if(tab!=HOME){navigate(HOME);return;}super.onBackPressed();}
    @Override protected void onSaveInstanceState(Bundle state){super.onSaveInstanceState(state);state.putInt("selectedTab",tab);if(web!=null){Bundle b=new Bundle();web.saveState(b);state.putBundle("webHistory",b);}}
    @Override protected void onPause(){if(web!=null){web.onPause();if(own(web.getUrl()))web.evaluateJavascript("document.querySelectorAll('video,audio').forEach(function(v){v.pause()})",null);}super.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){destroyed=true;closeFullVideo();disposeWeb();if(google!=null)google.close();super.onDestroy();}
}
