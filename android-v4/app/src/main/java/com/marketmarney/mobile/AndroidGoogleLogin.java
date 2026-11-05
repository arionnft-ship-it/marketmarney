package com.marketmarney.mobile;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import androidx.annotation.NonNull;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.exceptions.GetCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.io.InputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

/**
 * Native Google Credential Manager login for MarketMarney Social.
 * The ID token is verified by marketmarney.com. Never store an ID token or API secret.
 */
final class AndroidGoogleLogin {
    interface Listener {
        void onStatus(String message);
        void onSignedIn(String username);
        void onSignedOut();
    }
    private static final String BASE = "https://marketmarney.com";
    private final Activity activity;
    private final Listener listener;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private boolean busy = false;
    private String username = null;

    AndroidGoogleLogin(Activity a, Listener l) { activity = a; listener = l; }
    boolean isSignedIn(){ return username != null && !username.isEmpty(); }
    String username(){ return username; }
    boolean isBusy(){ return busy; }

    private void notifyStatus(String s){ main.post(()->listener.onStatus(s)); }
    private void fail(String message){ main.post(()->{busy=false; listener.onStatus(message);}); }
    private static final class Reply {
        final int status;
        final JSONObject data;
        final String cookie;
        Reply(int code, JSONObject json, String rawCookie){status=code;data=json;cookie=rawCookie;}
    }
    private static String read(InputStream in) throws Exception {
        if(in==null)return "";
        StringBuilder out=new StringBuilder();
        try(BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))){
            String line;
            while((line=r.readLine())!=null){out.append(line);if(out.length()>24000)throw new Exception("Respons server terlalu besar");}
        }
        return out.toString();
    }
    private Reply request(String method, String path, JSONObject body, String cookie) throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(BASE+path).openConnection();
        try {
            c.setInstanceFollowRedirects(false);
            c.setRequestMethod(method);
            c.setConnectTimeout(12000);
            c.setReadTimeout(12000);
            c.setRequestProperty("Accept","application/json");
            c.setRequestProperty("X-MarketMarney-Android","native-v4");
            if(cookie!=null&&!cookie.isEmpty())c.setRequestProperty("Cookie",cookie);
            if(body!=null){
                c.setDoOutput(true);
                c.setRequestProperty("Content-Type","application/json");
                byte[] bytes=body.toString().getBytes(StandardCharsets.UTF_8);
                c.setFixedLengthStreamingMode(bytes.length);
                try(java.io.OutputStream o=c.getOutputStream()){o.write(bytes);}
            }
            int status=c.getResponseCode();
            String data=read(status>=400?c.getErrorStream():c.getInputStream());
            JSONObject result=data.isEmpty()?new JSONObject():new JSONObject(data);
            return new Reply(status,result,c.getHeaderField("Set-Cookie"));
        }finally{c.disconnect();}
    }

    void refreshSession(){
        worker.execute(()->{
            try {
                String cookie=CookieManager.getInstance().getCookie(BASE);
                if(cookie==null||!cookie.contains("mm_reader="))return;
                Reply r=request("GET","/api/community/me",null,cookie);
                if(r.status==200){
                    String name=r.data.optJSONObject("user")!=null?r.data.getJSONObject("user").optString("username",""):"";
                    main.post(()->{username=name; listener.onSignedIn(name);});
                }
            }catch(Exception ignored){}
        });
    }

    void signIn(){
        if(busy)return;
        busy=true;
        notifyStatus("Menyiapkan login Google Android…");
        worker.execute(()->{
            try {
                Reply config=request("GET","/api/auth/android/config",null,null);
                if(config.status!=200||!config.data.optBoolean("enabled")){
                    fail("Login Google Android belum diaktifkan pada server MarketMarney.");return;
                }
                String client=config.data.optString("webClientId", "");
                if(!client.endsWith(".apps.googleusercontent.com")){
                    fail("Konfigurasi Google belum benar.");return;
                }
                Reply challenge=request("POST","/api/auth/android/challenge",new JSONObject(),null);
                if(challenge.status!=200){fail("Permintaan login ditolak. Coba lagi.");return;}
                String nonce=challenge.data.optString("nonce", "");
                if(!nonce.matches("^[a-zA-Z0-9_-]{43}$")){
                    fail("Sesi login tidak valid.");return;
                }
                main.post(()->pickGoogleAccount(client,nonce));
            }catch(Exception e){fail("Tidak dapat terhubung ke layanan login. Periksa internet.");}
        });
    }

    private void pickGoogleAccount(String webClientId,String nonce){
        try {
            notifyStatus("Pilih akun Google di perangkat Anda…");
            GetSignInWithGoogleOption option=new GetSignInWithGoogleOption.Builder(webClientId)
                .setNonce(nonce).build();
            GetCredentialRequest request=new GetCredentialRequest.Builder()
                .addCredentialOption(option).build();
            CredentialManager.create(activity).getCredentialAsync(activity,request,null,main::post,
                new CredentialManagerCallback<GetCredentialResponse,GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse result) {
                        try {
                            Credential credential=result.getCredential();
                            if(!(credential instanceof CustomCredential) ||
                               !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())){
                                fail("Kredensial Google tidak didukung.");return;
                            }
                            GoogleIdTokenCredential google=GoogleIdTokenCredential.createFrom(((CustomCredential)credential).getData());
                            String token=google.getIdToken();
                            exchangeToken(token,nonce);
                        }catch(Exception ignored){fail("Tidak dapat membaca identitas Google.");}
                    }
                    @Override public void onError(@NonNull GetCredentialException e) {
                        fail("Login Google dibatalkan atau tidak tersedia. Periksa layanan Google Play.");
                    }
                });
        }catch(Exception e){fail("Layanan Login Google tidak tersedia pada perangkat ini.");}
    }

    private void exchangeToken(String idToken,String nonce){
        notifyStatus("Menghubungkan akun ke Social Marney…");
        worker.execute(()->{
            try{
                JSONObject body=new JSONObject();
                body.put("nonce",nonce);
                body.put("idToken",idToken);
                Reply reply=request("POST","/api/auth/android/google",body,null);
                if(reply.status!=200){
                    String err=reply.data.optString("error","Verifikasi Google ditolak");
                    if("registrasi".equals(err)||"account_missing".equals(err))err="Akun Google belum terdaftar. Hubungkan akun ini melalui Social Marney terlebih dahulu.";
                    fail(err);return;
                }
                if(!reply.data.optBoolean("ok")||reply.cookie==null||
                    !reply.cookie.matches("(?s)^mm_reader=[a-f0-9]{64};.*")){
                    fail("Sesi akun belum diterima. Coba login ulang.");return;
                }
                final String user=reply.data.optJSONObject("user")!=null?reply.data.getJSONObject("user").optString("username",""):"";
                if(user.isEmpty()){fail("Data akun belum lengkap.");return;}
                main.post(()->{
                    CookieManager cookies=CookieManager.getInstance();
                    cookies.setAcceptCookie(true);
                    cookies.setCookie(BASE,reply.cookie,ok->{
                        cookies.flush();
                        busy=false;
                        if(Boolean.TRUE.equals(ok)){
                            username=user;
                            listener.onSignedIn(user);
                            listener.onStatus("Berhasil masuk sebagai @"+user);
                        }else{
                            listener.onStatus("Sesi login belum tersimpan. Coba ulangi.");
                        }
                    });
                });
            }catch(Exception e){fail("Koneksi verifikasi Google gagal. Coba lagi.");}
        });
    }

    void signOut(){
        worker.execute(()->{
            try {
                String cookie=CookieManager.getInstance().getCookie(BASE);
                // Native logout also requires the site's origin guard.
                HttpURLConnection c=(HttpURLConnection)new URL(BASE+"/api/community/logout").openConnection();
                try{
                    c.setRequestMethod("POST");c.setDoOutput(true);
                    c.setConnectTimeout(10000);c.setReadTimeout(10000);
                    c.setRequestProperty("Cookie",cookie==null?"":cookie);
                    c.setRequestProperty("Origin",BASE);
                    c.setRequestProperty("X-MarketMarney-Request","1");
                    c.setRequestProperty("Content-Type","application/json");
                    byte[] bytes="{}".getBytes(StandardCharsets.UTF_8);
                    c.setFixedLengthStreamingMode(bytes.length);
                    try(java.io.OutputStream out=c.getOutputStream()){out.write(bytes);}
                    c.getResponseCode();
                }finally{c.disconnect();}
            }catch(Exception ignored){}
            main.post(()->{
                CookieManager cookieManager=CookieManager.getInstance();
                cookieManager.setCookie(BASE,"mm_reader=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict");
                cookieManager.flush();
                username=null;
                busy=false;
                listener.onSignedOut();
            });
        });
    }
    void close(){worker.shutdownNow();}
}