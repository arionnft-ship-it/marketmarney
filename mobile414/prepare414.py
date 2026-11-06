"""Patch pinned 4.13 source; recovery/navigation only, without changing private data or market prices."""
from pathlib import Path
import re,sys,shutil,json,hashlib
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
root=Path(__file__).resolve().parent
java=base/'app/src/main/java/com/marketmarney/mobile'
p=java/'MainActivity.java';s=p.read_text()
preserved={str(f.relative_to(base)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (base/'app/src/main/assets').rglob('*') if f.is_file()}
for name in ['StartupOverlay.java','AppResources49.java','AndroidGoogleLogin.java']:
 f=java/name;preserved[str(f.relative_to(base))]=hashlib.sha256(f.read_bytes()).hexdigest()
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Source mismatch '+repr(a[:100])+' count='+str(s.count(a)))
 s=s.replace(a,b,1)
once('    private StartupOverlay launchOverlay;', '''    private StartupOverlay launchOverlay;
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
        return "MarketMarney 4.14.0-beta\\nMenu: "+labels[tab]+"\\nAndroid: "+Build.VERSION.RELEASE+
            "\\nKoneksi: "+connection+"\\nStatus halaman: "+(mainFailed?failureCode:firstPaint?"Tampil":"Memuat")+
            "\\nPaket uji terpisah. Google Login native belum didaftarkan untuk beta ini.";
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
            String extra="\\nXAUWar: diagnosa feed belum tersedia.";
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
                extra="\\n\\nXAUWar: "+detail+"\\nTidak ada penggantian otomatis ke harga simulasi.";
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
    }''')
once('        if(web==null||offline!=null', '        if(mainFailed||web==null||offline!=null')
once('        navigate(Math.max(0,Math.min(labels.length-1,initial)));\n        if(state!=null){Bundle history=state.getBundle("webHistory");if(history!=null&&web!=null)web.restoreState(history);}', '''        initial=Math.max(0,Math.min(labels.length-1,initial));
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
        if(!restored)navigate(initial);''')
once('        google.refreshSession();', '''        // Web pages already validate their own cookie session. Beta has no native
        // Google session: do not issue a second request/reload just after startup.
        if(getPackageName().equals("com.marketmarney.mobile"))google.refreshSession();''')
once('            cell.setOnClickListener(v->{if(tab==dest&&web!=null){web.scrollTo(0,0);}else navigate(dest);});', '''            cell.setOnClickListener(v->reselectTab(dest));
            cell.setOnLongClickListener(v->{appMenu();return true;});
            if(Build.VERSION.SDK_INT>=26)cell.setTooltipText(labels[i]+" · tahan untuk pilihan aplikasi");''')
once('    private void disposeWeb(){','    private void disposeWeb(){\n        cancelPageWait();')
once('        navigationStarted=SystemClock.uptimeMillis();','        cancelPageWait();navigationStarted=SystemClock.uptimeMillis();')
once('            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);','            firstPaint=true;mainFailed=false;failureCode="";failureNote="";clearOffline();\n            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);')
once('private void open(String url){if(web==null||!own(url))return;lastUrl=url;', 'private void open(String url){if(web==null||!own(url))return;beginPageWait(web);lastUrl=url;')
once('if(v!=web)return;progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;', 'if(v!=web)return;clearOffline();beginPageWait(v);progress.setVisibility(View.VISIBLE);if(own(url))lastUrl=url;')
once('if(v==web&&own(url))endLaunchAnimation(true,"first-frame");', 'if(v==web&&own(url)){pageReady(v,url);endLaunchAnimation(true,"first-frame");}')
once('if(v!=web)return;progress.setVisibility(View.GONE);adapt(v,url);endLaunchAnimation(true,"page-finished");CookieManager.getInstance().flush();', 'if(v!=web)return;pageReady(v,url);adapt(v,url);endLaunchAnimation(true,"page-finished");CookieManager.getInstance().flush();')
once('if(v==web&&r.isForMainFrame())showOffline("Periksa koneksi internet, lalu coba lagi.");', 'if(currentRequest(v,r)){String code=Recovery414.networkCode(error.getErrorCode());showFailure(code,Recovery414.message(code));}')
once('if(v==web&&r.isForMainFrame()&&response.getStatusCode()>=400)showOffline("Halaman sedang tidak tersedia. Data Anda tidak dihapus.");', 'if(currentRequest(v,r)&&response.getStatusCode()>=400){String code="HTTP "+response.getStatusCode();showFailure(code,Recovery414.message(code));}')
once('handler.cancel();if(v==web)showOffline("Koneksi aman belum dapat diverifikasi. Periksa tanggal perangkat dan koneksi Anda.");', 'handler.cancel();if(v==web&&Recovery414.sameDocument(error.getUrl(),lastUrl))showFailure("TLS",Recovery414.message("TLS"));')
once('showOffline("Tampilan perlu dimuat ulang.");','showFailure("RENDER",Recovery414.message("RENDER"));')
once('progress.setVisibility(n==100?View.GONE:View.VISIBLE);','progress.setVisibility(n==100||firstPaint||mainFailed?View.GONE:View.VISIBLE);')
once('if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;', 'if(v!=web||!own(v.getUrl())){cb.onReceiveValue(null);return true;}\n                if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=cb;')
a=s.index('    private void showOffline(String message){');b=s.index('    private void closeFullVideo()',a)
s=s[:a]+'''    private void showOffline(String message){showFailure("UNAVAILABLE",message);}
    private void showFailure(String code,String message){
        endLaunchAnimation(false,"connection-error");cancelPageWait();
        if(destroyed)return;mainFailed=true;failureCode=code;failureNote=message;progress.setVisibility(View.GONE);clearOffline();
        LinearLayout box=column();box.setGravity(Gravity.CENTER);box.setPadding(dp(24),dp(18),dp(24),dp(18));box.setBackgroundColor(BG);
        TextView badge=text("MARKETMARNEY / "+labels[tab].toUpperCase(java.util.Locale.ROOT),11,GOLD);badge.setGravity(Gravity.CENTER);box.addView(badge);
        TextView title=text("Halaman belum tersedia",22,TEXT);title.setTypeface(Typeface.DEFAULT,Typeface.BOLD);title.setGravity(Gravity.CENTER);box.addView(title);
        TextView note=text(message,14,MUTED);note.setGravity(Gravity.CENTER);LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(-1,-2);np.topMargin=dp(14);np.bottomMargin=dp(14);box.addView(note,np);
        Button retry=new Button(this);retry.setText("Coba lagi");retry.setAllCaps(false);retry.setTextColor(BG);retry.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GOLD));retry.setOnClickListener(v->recoverPage());box.addView(retry,new LinearLayout.LayoutParams(-1,dp(48)));
        Button home=new Button(this);home.setText("Kembali ke "+labels[tab]);home.setAllCaps(false);home.setOnClickListener(v->navigate(tab));box.addView(home,new LinearLayout.LayoutParams(-1,dp(48)));
        TextView help=text("Info koneksi · "+code,12,MUTED);help.setGravity(Gravity.CENTER);help.setPadding(0,dp(12),0,dp(12));help.setOnClickListener(v->showAppReport());box.addView(help);
        android.widget.ScrollView scroll=new android.widget.ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);scroll.addView(box,new android.widget.ScrollView.LayoutParams(-1,-1));
        offline=scroll;frame.addView(offline,new FrameLayout.LayoutParams(-1,-1));
    }
'''+s[b:]
once('        if(launchOverlay!=null)launchOverlay.dispose();\n        if(web!=null)', '        cancelPageWait();if(launchOverlay!=null)launchOverlay.dispose();\n        if(web!=null)')
s=s.replace('MarketMarneyAndroid/4.13 AppShell','MarketMarneyAndroid/4.14 AppShell').replace("version:'4.13'","version:'4.14'").replace("dataset.mmAndroid='413'","dataset.mmAndroid='414'")
p.write_text(s);shutil.copy2(root/'Recovery414.java',java/'Recovery414.java')
p=base/'app/src/main/AndroidManifest.xml';m=p.read_text();m=m.replace('<uses-permission android:name="android.permission.INTERNET" />','<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />');p.write_text(m)
p=base/'app/build.gradle';g=p.read_text().replace("applicationId 'com.marketmarney.mobile.beta413'","applicationId 'com.marketmarney.mobile.beta414'").replace('versionCode 17','versionCode 18').replace("versionName '4.13.0-beta'","versionName '4.14.0-beta'");p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.14 Stabilitas',p.read_text()))
for rel,h in preserved.items():assert hashlib.sha256((base/rel).read_bytes()).hexdigest()==h,rel
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' in s
assert 'MIXED_CONTENT_NEVER_ALLOW' in s and 'handler.cancel()' in s and 'addJavascriptInterface' not in s
assert 'while(retained.size()>1)' in s and 'if(tab==XAUWAR)return false;' in s
Path('preserved414.json').write_text(json.dumps(preserved,indent=2))
print('PASS:',len(preserved),'assets/auth/splash/resource files unchanged. Recovery changes only; no prices or backend edited.')
