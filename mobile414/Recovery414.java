package com.marketmarney.mobile;

import android.net.Uri;
import android.webkit.WebViewClient;

/** Deterministic recovery text/route checks. Never retries account mutations. */
final class Recovery414 {
    static boolean trusted(String url) {
        try { Uri u=Uri.parse(url);return "https".equalsIgnoreCase(u.getScheme())&&"marketmarney.com".equalsIgnoreCase(u.getHost())&&(u.getPort()==-1||u.getPort()==443)&&u.getUserInfo()==null; }
        catch(Exception e){return false;}
    }
    static boolean sameDocument(String a,String b) {
        if(!trusted(a)||!trusted(b))return false;
        return Uri.parse(a).buildUpon().fragment(null).build().equals(Uri.parse(b).buildUpon().fragment(null).build());
    }
    static String safeRetry(String attempted,String fallback) {
        if(!trusted(fallback))throw new IllegalArgumentException("Untrusted fallback");
        if(!trusted(attempted))return fallback;
        String p=Uri.parse(attempted).getPath();
        if(p==null||p.startsWith("/api/")||p.contains(".."))return fallback;
        // Only known read-only document routes. Never replay POST, OAuth callback or logout.
        for(String safe:new String[]{"/","/index.html","/__android43/news","/beranda-trader.html","/grup-trader.html","/profil.html","/akun.html","/assets/xau-war-3d.html","/berita-detail.html"})
            if(safe.equals(p))return attempted;
        return fallback;
    }
    static String networkCode(int code) {
        if(code==WebViewClient.ERROR_HOST_LOOKUP)return "DNS";
        if(code==WebViewClient.ERROR_TIMEOUT)return "TIMEOUT";
        if(code==WebViewClient.ERROR_FAILED_SSL_HANDSHAKE)return "TLS";
        return "NETWORK";
    }
    static String message(String code) {
        if("DNS".equals(code))return "Alamat server belum dapat ditemukan. Periksa internet atau DNS, kemudian coba lagi.";
        if("TIMEOUT".equals(code))return "Server belum merespons tepat waktu. Coba lagi tanpa menghapus data aplikasi.";
        if("TLS".equals(code))return "Sertifikat koneksi belum dapat diverifikasi. Periksa tanggal dan waktu otomatis perangkat. Koneksi tidak diteruskan secara tidak aman.";
        if("HTTP 401".equals(code))return "Sesi belum tersedia atau telah berakhir. Masuk kembali melalui Social Marney.";
        if("HTTP 403".equals(code))return "Akun belum memiliki izin membuka halaman ini. Izin grup privat tetap dilindungi.";
        if("HTTP 404".equals(code))return "Halaman tidak ditemukan. Kembali ke menu utama bagian ini atau coba muat ulang.";
        if(code!=null&&code.startsWith("HTTP 5"))return "Layanan sedang mengalami gangguan. Coba lagi setelah koneksi server pulih.";
        if("RENDER".equals(code))return "Tampilan Android perlu dimuat ulang. Gunakan Coba lagi; data di server tidak dihapus.";
        return "Halaman belum dapat dimuat. Periksa koneksi, kemudian coba lagi.";
    }
}
