package com.marketmarney.mobile;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Android-native MarketMarney application shell.
 * The Beranda tab renders the responsive MarketMarney website homepage in an
 * internal WebView; the other tabs retain their existing Android UI.
 * Users are never redirected to Chrome to open Beranda.
 * No account data, client secrets or market prices are stored in this app.
 */
public final class MainActivity extends Activity {
    private static final String BASE = "https://marketmarney.com";
    private static final int NAV_HOME = 0, NAV_MARKET = 1, NAV_NEWS = 2, NAV_SOCIAL = 3, NAV_ACCOUNT = 4;
    private static final int REQUEST_PICK_FILE = 40;
    private static final int NAVY = Color.rgb(4, 13, 27);
    private static final int CARD = Color.rgb(11, 27, 45);
    private static final int CARD_ALT = Color.rgb(15, 36, 57);
    private static final int GOLD = Color.rgb(244, 188, 62);
    private static final int WHITE = Color.rgb(246, 248, 252);
    private static final int MUTED = Color.rgb(153, 174, 195);
    private static final int OUTLINE = Color.rgb(31, 52, 75);
    private static final int GREEN = Color.rgb(90, 211, 171);

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LinearLayout root;
    private FrameLayout content;
    private LinearLayout bottomBar;
    private LinearLayout appHeader;
    private View appHeaderDivider;
    private WebView browser;
    private ValueCallback<Uri[]> fileCallback;
    private int tab = NAV_HOME;
    private boolean webMode = false;
    private AndroidGoogleLogin googleLogin;

    private int dp(float num) {
        return (int) (num * getResources().getDisplayMetrics().density + 0.5f);
    }

    private GradientDrawable bg(int color, float radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radius));
        return d;
    }

    private GradientDrawable gradient(int from, int to, float radius) {
        GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{from,to});
        d.setCornerRadius(dp(radius));
        return d;
    }
    private GradientDrawable strokeBg(int color, float radius) {
        GradientDrawable d = bg(color, radius);
        d.setStroke(dp(1), OUTLINE);
        return d;
    }

    private TextView text(String label, float size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(label);
        t.setTextSize(size);
        t.setTextColor(color);
        t.setIncludeFontPadding(true);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return t;
    }

    private LinearLayout vertical() {
        LinearLayout v = new LinearLayout(this);
        v.setOrientation(LinearLayout.VERTICAL);
        return v;
    }

    private LinearLayout horizontal() {
        LinearLayout v = new LinearLayout(this);
        v.setOrientation(LinearLayout.HORIZONTAL);
        v.setGravity(Gravity.CENTER_VERTICAL);
        return v;
    }

    private LinearLayout.LayoutParams lp(int width, int height) {
        return new LinearLayout.LayoutParams(width < 0 ? width : dp(width), height < 0 ? height : dp(height));
    }

    private void space(LinearLayout layout, int height) {
        layout.addView(new View(this), lp(1, height));
    }

    private void addLabel(LinearLayout parent, String text, int size, int color, boolean bold) {
        parent.addView(text(text, size, color, bold));
    }

    private Button button(String name, boolean main, Runnable action) {
        Button b = new Button(this);
        b.setText(name);
        b.setTextSize(13);
        b.setTextColor(main ? NAVY : WHITE);
        b.setAllCaps(false);
        b.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(main ? GOLD : CARD_ALT));
        b.setOnClickListener(v -> action.run());
        return b;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(NAVY);
        getWindow().setNavigationBarColor(NAVY);
        getWindow().getDecorView().setSystemUiVisibility(0);
        root = vertical();
        root.setBackgroundColor(NAVY);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            // Preserve usable space on gesture-navigation and modern edge-to-edge phones.
            v.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root);
        googleLogin = new AndroidGoogleLogin(this, new AndroidGoogleLogin.Listener() {
            @Override public void onStatus(String message) {
                Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
            }
            @Override public void onSignedIn(String username) {
                if(!webMode && (tab == NAV_ACCOUNT || tab == NAV_SOCIAL)) navigate(tab);
            }
            @Override public void onSignedOut() {
                if(!webMode && (tab == NAV_ACCOUNT || tab == NAV_SOCIAL)) navigate(tab);
            }
        });
        buildHeader();
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        bottomBar = horizontal();
        bottomBar.setBackground(gradient(Color.rgb(11, 31, 50),Color.rgb(5, 17, 34),0));
        root.addView(bottomBar, lp(-1, 72));
        navigate(NAV_HOME);
        googleLogin.refreshSession();
    }

    private void buildHeader() {
        LinearLayout top = horizontal();
        top.setPadding(dp(17), dp(8), dp(15), dp(8));
        top.setBackground(gradient(Color.rgb(6,24,43),Color.rgb(3,14,28),0));
        root.addView(top, lp(-1, 76));
        appHeader = top;
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        logo.setContentDescription("MarketMarney");
        top.addView(logo, lp(45, 45));
        LinearLayout names = vertical();
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(0, -2, 1);
        nameLp.leftMargin = dp(10);
        top.addView(names, nameLp);
        addLabel(names, "MarketMarney", 21, WHITE, true);
        TextView subtitle = text("MARKET INTELLIGENCE  /  MOBILE", 9, MUTED, false);
        subtitle.setLetterSpacing(0.06f);
        names.addView(subtitle);
        TextView live = text("●  LIVE", 10, GREEN, true);
        live.setGravity(Gravity.CENTER);
        live.setPadding(dp(9), dp(6), dp(9), dp(6));
        live.setBackground(strokeBg(Color.rgb(11,36,43), 12));
        top.addView(live);
        View line = new View(this);
        line.setBackgroundColor(OUTLINE);
        root.addView(line, lp(-1, 1));
        appHeaderDivider = line;
    }

    private void drawBottomBar() {
        bottomBar.removeAllViews();
        String[] labels = {"Beranda", "Pasar", "Berita", "Social", "Akun"};
        String[] symbols = {"⌂", "◈", "▤", "◎", "◉"};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            LinearLayout box = vertical();
            box.setGravity(Gravity.CENTER);
            boolean active = i == tab;
            TextView symbol = text(symbols[i], 23, active ? GOLD : MUTED, active);
            symbol.setGravity(Gravity.CENTER);
            box.addView(symbol);
            TextView label = text(labels[i], 11, active ? GOLD : MUTED, active);
            label.setGravity(Gravity.CENTER);
            box.addView(label);
            if(active){
                View marker = new View(this);
                marker.setBackground(bg(GOLD, 3));
                LinearLayout.LayoutParams markerParams = lp(23, 2);
                markerParams.topMargin = dp(5);
                markerParams.gravity = Gravity.CENTER_HORIZONTAL;
                box.addView(marker, markerParams);
            }
            box.setContentDescription(labels[i]);
            box.setOnClickListener(v -> navigate(index));
            bottomBar.addView(box, new LinearLayout.LayoutParams(0, -1, 1));
        }
    }

    private void clearContent() {
        if (browser != null) {
            WebView old = browser;
            browser = null;
            old.stopLoading();
            old.setWebChromeClient(null);
            old.setWebViewClient(null);
            ViewGroup parent = (ViewGroup) old.getParent();
            if (parent != null) parent.removeView(old);
            old.destroy();
        }
        content.removeAllViews();
        webMode = false;
    }

    private void navigate(int index) {
        tab = index;
        clearContent();
        // The website has its own mobile logo/header. Avoid showing two headers
        // on Beranda; keep the native bottom navigation available at all times.
        boolean websiteHome = index == NAV_HOME;
        if (appHeader != null) appHeader.setVisibility(websiteHome ? View.GONE : View.VISIBLE);
        if (appHeaderDivider != null) appHeaderDivider.setVisibility(websiteHome ? View.GONE : View.VISIBLE);
        drawBottomBar();
        switch (index) {
            case NAV_HOME: home(); break;
            case NAV_MARKET: markets(); break;
            case NAV_NEWS: headlines(); break;
            case NAV_SOCIAL: social(); break;
            default: account(); break;
        }
    }

    private LinearLayout page(String eyebrow, String heading, String subheading) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        LinearLayout body = vertical();
        body.setPadding(dp(18), dp(20), dp(18), dp(25));
        scroll.addView(body);
        content.addView(scroll, new FrameLayout.LayoutParams(-1, -1));
        TextView eyebrowView = text(eyebrow, 10, GOLD, true);
        eyebrowView.setLetterSpacing(0.13f);
        body.addView(eyebrowView);
        space(body, 8);
        addLabel(body, heading, 29, WHITE, true);
        space(body, 7);
        addLabel(body, subheading, 13, MUTED, false);
        space(body, 22);
        return body;
    }

    private LinearLayout card(LinearLayout parent) {
        LinearLayout box = vertical();
        box.setPadding(dp(17), dp(17), dp(17), dp(17));
        box.setBackground(strokeBg(CARD, 19));
        LinearLayout.LayoutParams params = lp(-1, -2);
        params.bottomMargin = dp(12);
        parent.addView(box, params);
        return box;
    }

    private void linkCard(LinearLayout parent, String eyebrow, String heading, String description,
                          String action, Runnable click) {
        LinearLayout box = card(parent);
        addLabel(box, eyebrow, 11, GOLD, true);
        space(box, 6);
        addLabel(box, heading, 18, WHITE, true);
        space(box, 6);
        addLabel(box, description, 12, MUTED, false);
        space(box, 12);
        box.addView(button(action, false, click), lp(-1, 46));
        box.setOnClickListener(v -> click.run());
    }

    private void sectionTitle(LinearLayout parent, String label) {
        space(parent, 14);
        addLabel(parent, label, 19, WHITE, true);
        space(parent, 12);
    }

    private void home() {
        // Exactly the same homepage HTML, banners, news, ticker and theme as
        // https://marketmarney.com/index.html. This stays *inside* the APK.
        showWeb("Beranda", "/index.html", true);
    }

    private LinearLayout marketTile(String symbol,String category,String description,Runnable action){
        LinearLayout tile=vertical();
        tile.setPadding(dp(15),dp(14),dp(12),dp(14));
        tile.setBackground(gradient(Color.rgb(17,43,65),Color.rgb(9,29,49),17));
        TextView chip=text(category,10,GOLD,true);tile.addView(chip);
        space(tile,9);
        tile.addView(text(symbol,19,WHITE,true));
        space(tile,5);
        tile.addView(text(description,11,MUTED,false));
        tile.setOnClickListener(v->action.run());
        return tile;
    }

    private void markets() {
        LinearLayout page = page("MARKET TERMINAL", "Pantau market", "Pilih instrumen untuk membuka grafik interaktif.");
        addLabel(page, "Data harga ditampilkan oleh penyedia grafik, bukan harga simulasi.", 12, MUTED, false);
        space(page, 16);
        String[][] markets = {
                {"XAU/USD", "Emas vs Dolar Amerika", "KOMODITAS"},
                {"BTC/USD", "Bitcoin vs Dolar Amerika", "KRIPTO"},
                {"EUR/USD", "Euro vs Dolar Amerika", "FOREX"},
                {"GBP/USD", "Poundsterling vs Dolar Amerika", "FOREX"},
                {"USD/JPY", "Dolar Amerika vs Yen Jepang", "FOREX"},
                {"NASDAQ 100", "Indeks teknologi Amerika", "INDEKS"}
        };
        for (String[] m : markets) {
            LinearLayout item = card(page);
            addLabel(item, m[2], 11, GOLD, true);
            space(item, 3);
            addLabel(item, m[0], 22, WHITE, true);
            space(item, 3);
            addLabel(item, m[1], 12, MUTED, false);
            space(item, 10);
            item.addView(button("Buka grafik", false,
                    () -> showWeb("Market Live", "/index.html#marketlive")), lp(-1, 42));
        }
        sectionTitle(page, "Analisis & Kalender");
        linkCard(page, "ANALISIS", "Area support, resistance, dan pivot",
                "Buka alat analisis MarketMarney.", "Buka Analisis",
                () -> showWeb("Analisa", "/index.html#analisa"));
        linkCard(page, "KALENDER", "Kalender ekonomi",
                "Pantau jadwal rilis ekonomi penting.", "Lihat Kalender",
                () -> showWeb("Kalender Ekonomi", "/index.html#kalender"));
    }

    private void headlines() {
        LinearLayout page = page("NEWSROOM", "Berita finansial", "Berita yang telah diterbitkan oleh MarketMarney.");
        LinearLayout list = vertical();
        page.addView(list);
        loading(list);
        loadNews(list, false, NAV_NEWS);
        sectionTitle(page, "Artikel lengkap");
        page.addView(button("Buka halaman berita", false,
                () -> showWeb("Berita", "/index.html#berita")), lp(-1, 49));
    }

    private void loading(LinearLayout parent) {
        parent.removeAllViews();
        addLabel(parent, "Memuat berita terbaru…", 13, MUTED, false);
        space(parent, 16);
    }

    private void loadNews(LinearLayout target, boolean compact, int requestTab) {
        io.execute(() -> {
            List<NewsItem> rows = fetchNews(compact);
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed() || tab != requestTab || webMode || target.getParent() == null) return;
                target.removeAllViews();
                if (rows.isEmpty()) {
                    addLabel(target, "Belum dapat menampilkan berita. Cek internet dan coba lagi.", 13, MUTED, false);
                    space(target, 12);
                    target.addView(button("Coba lagi", false, () -> { loading(target); loadNews(target, compact, requestTab); }), lp(-1, 45));
                    return;
                }
                for (NewsItem row : rows) {
                    LinearLayout item = card(target);
                    addLabel(item, row.category.toUpperCase(Locale.ROOT), 10, GOLD, true);
                    space(item, 6);
                    addLabel(item, row.title, 16, WHITE, true);
                    if (!row.date.isEmpty()) {
                        space(item, 5);
                        addLabel(item, row.date.length() > 28 ? row.date.substring(0, 28) : row.date, 11, MUTED, false);
                    }
                    space(item, 12);
                    Runnable open = () -> {
                        try {
                            String id = URLEncoder.encode(row.id, "UTF-8");
                            showWeb("Artikel MarketMarney", "/index.html#artikel/" + id);
                        } catch (Exception ex) {
                            showWeb("Berita", "/index.html#berita");
                        }
                    };
                    item.addView(button("Baca artikel", false, open), lp(-1, 42));
                    item.setOnClickListener(v -> open.run());
                }
            });
        });
    }

    private static final class NewsItem {
        final String id, title, category, date;
        NewsItem(String id, String title, String category, String date) {
            this.id = id; this.title = title; this.category = category; this.date = date;
        }
    }

    private List<NewsItem> fetchNews(boolean compact) {
        List<NewsItem> result = new ArrayList<>();
        HttpURLConnection conn = null;
        try {
            URL url = new URL(BASE + (compact ? "/api/trader/market-news" : "/api/content"));
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(8500);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("User-Agent", "MarketMarneyAndroid/3.0 (NativeDashboard)");
            if (conn.getResponseCode() != 200) return result;
            StringBuilder out = new StringBuilder();
            try (InputStream is = conn.getInputStream();
                 BufferedReader br = new BufferedReader(new InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null && out.length() < 4_000_000) out.append(line);
            }
            JSONObject data = new JSONObject(out.toString());
            JSONArray articles = data.optJSONArray("articles");
            if (articles == null) return result;
            for (int i = 0; i < articles.length(); i++) {
                JSONObject a = articles.optJSONObject(i);
                if (a == null) continue;
                String status = a.optString("status", "published");
                if (!status.isEmpty() && !"published".equals(status)) continue;
                String title = a.optString("title", "").trim();
                String id = a.optString("id", "");
                if (title.isEmpty() || id.isEmpty()) continue;
                String category = a.optString("cat", a.optString("category", "BERITA"));
                String date = a.optString("date", a.optString("publishedAt", ""));
                result.add(new NewsItem(id, title, category, date));
            }
            // The compact endpoint is already sorted. For the full endpoint sort by publication date.
            if (!compact) result.sort((a, b) -> b.date.compareTo(a.date));
            if (result.size() > (compact ? 3 : 24)) return new ArrayList<>(result.subList(0, compact ? 3 : 24));
        } catch (Exception ignored) {
            // Offline and API errors show an explicit retry state, never fictional data.
        } finally {
            if (conn != null) conn.disconnect();
        }
        return result;
    }

    private void social() {
        LinearLayout page = page("SOCIAL MARNEY  /  COMMUNITY", "Komunitas MarketMarney",
                "Linimasa, Story, Reels, grup, dan diskusi trader.");
        socialAuthCard(page);
        sectionTitle(page,"Jelajahi komunitas");
        linkCard(page,"LINIMASA & VIDEO","Story, Reels & Postingan",
                "Ikuti cerita dan sudut pandang komunitas dalam satu feed.","Buka Social",
                ()->showWeb("Social Marney","/beranda-trader.html"));
        linkCard(page,"TRADER GROUPS","Grup publik & privat",
                "Diskusi trading dengan anggota dan pemilik grup.","Buka Grup",
                ()->showWeb("Grup MarketMarney","/grup-trader.html"));
        linkCard(page,"FORUM","Forum Diskusi",
                "Tanya jawab, analisis, dan edukasi komunitas.","Buka Forum",
                ()->showWeb("Forum MarketMarney","/community.html"));
        linkCard(page,"EDUKASI VIDEO","MarketMarney TV",
                "Video edukasi dan analisis financial.","Tonton TV",
                ()->showWeb("MarketMarney TV","/index.html#tv"));
    }

    private void socialAuthCard(LinearLayout page){
        LinearLayout card=card(page);
        card.setBackground(gradient(Color.rgb(20,50,68),Color.rgb(12,30,53),21));
        if(googleLogin!=null && googleLogin.isSignedIn()){
            addLabel(card,"●  AKUN TERHUBUNG",11,GREEN,true);
            space(card,9);
            addLabel(card,"Halo, @"+googleLogin.username(),20,WHITE,true);
            space(card,7);
            addLabel(card,"Akun ini juga digunakan di Social Marney dalam aplikasi.",12,MUTED,false);
            space(card,10);
            card.addView(button("Lihat profil  →",false,()->showWeb("Profil","/profil.html")),lp(-1,46));
        }else{
            addLabel(card,"MEMBER ACCESS",11,GOLD,true);
            space(card,8);
            addLabel(card,"Masuk untuk berinteraksi",19,WHITE,true);
            space(card,7);
            addLabel(card,"Pilih akun Google langsung melalui Android. Tidak perlu dialihkan ke website Google.",12,MUTED,false);
            space(card,15);
            card.addView(button("G  Lanjutkan dengan Google",true,()->googleLogin.signIn()),lp(-1,50));
            space(card,5);
            card.addView(button("Masuk dengan email",false,()->showWeb("Login Social Marney","/akun.html")),lp(-1,47));
        }
    }

    private void account() {
        LinearLayout page = page("ACCOUNT  /  PROFILE", "Akun MarketMarney",
                "Identitas dan pengaturan anggota Social Marney.");
        socialAuthCard(page);
        if(googleLogin!=null && googleLogin.isSignedIn()){
            page.addView(button("Keluar dari akun",false,()->googleLogin.signOut()),lp(-1,46));
            space(page,9);
        }
        sectionTitle(page,"Pengaturan akun");
        linkCard(page,"PROFILE","Profil Social Marney","Lihat informasi profil dan pengaturan anggota.","Buka Profil",()->showWeb("Profil","/profil.html"));
        linkCard(page,"SECURITY","Pengaturan Akun","Kelola akun, kata sandi, dan pengaturan keamanan.","Pengaturan",()->showWeb("Akun MarketMarney","/akun.html"));
        linkCard(page,"ABOUT","Tentang MarketMarney","Info aplikasi, kebijakan dan disclaimer finansial.","Selengkapnya",()->showWeb("Tentang MarketMarney","/about.html"));
        space(page,9);
        addLabel(page,"MarketMarney Android 4.1 beta • Dashboard native • Google Credential Manager",11,MUTED,false);
    }

    /** Opens a MarketMarney page inside the app, never opening Chrome automatically. */
    private void showWeb(String title, String path) {
        showWeb(title, path, false);
    }

    private void showWeb(String title, String path, boolean homepage) {
        clearContent();
        webMode = true;
        LinearLayout panel = vertical();
        panel.setBackgroundColor(NAVY);
        content.addView(panel, new FrameLayout.LayoutParams(-1, -1));
        LinearLayout toolbar = horizontal();
        toolbar.setPadding(dp(10), dp(5), dp(15), dp(5));
        toolbar.setBackgroundColor(CARD);
        // For Beranda, display the website's own responsive mobile header.
        // Other in-app web screens keep their familiar Back / Reload toolbar.
        if (!homepage) panel.addView(toolbar, lp(-1, 48));
        TextView back = text("‹", 30, GOLD, true);
        back.setGravity(Gravity.CENTER);
        toolbar.addView(back, lp(44, 42));
        back.setContentDescription("Kembali ke aplikasi");
        back.setOnClickListener(v -> navigate(tab));
        TextView titleView = text(title, 16, WHITE, true);
        toolbar.addView(titleView, new LinearLayout.LayoutParams(0, -2, 1));
        TextView reload = text("⟳", 25, GOLD, true);
        reload.setGravity(Gravity.CENTER);
        toolbar.addView(reload, lp(38, 42));
        reload.setContentDescription("Muat ulang");
        reload.setOnClickListener(v -> { if (browser != null) browser.reload(); });
        ProgressBar progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(GOLD));
        panel.addView(progress, lp(-1, 3));
        FrameLayout webPanel = new FrameLayout(this);
        panel.addView(webPanel, new LinearLayout.LayoutParams(-1, 0, 1));
        browser = new WebView(this);
        browser.setBackgroundColor(NAVY);
        browser.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings setting = browser.getSettings();
        setting.setJavaScriptEnabled(true);
        setting.setDomStorageEnabled(true);
        setting.setLoadsImagesAutomatically(true);
        setting.setAllowFileAccess(false);
        setting.setAllowContentAccess(false);
        setting.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        setting.setSupportMultipleWindows(false);
        setting.setUserAgentString(setting.getUserAgentString() + " MarketMarneyAndroid/4.1 AppShell");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);
        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if(uri!=null && "marketmarney.com".equalsIgnoreCase(uri.getHost()) &&
                    uri.getPath()!=null && uri.getPath().startsWith("/api/auth/google/start")){
                    Toast.makeText(MainActivity.this,"Pilih Google Login melalui menu Akun aplikasi.",Toast.LENGTH_SHORT).show();
                    navigate(NAV_ACCOUNT);
                    if(googleLogin!=null)googleLogin.signIn();
                    return true;
                }
                String host = uri.getHost();
                if ("https".equalsIgnoreCase(uri.getScheme()) &&
                    ("marketmarney.com".equalsIgnoreCase(host) || "www.marketmarney.com".equalsIgnoreCase(host))) return false;
                // OAuth is handled by Android Credential Manager, never Google in WebView.
                if ("https".equalsIgnoreCase(uri.getScheme())) {
                    try {
                        Intent external = new Intent(Intent.ACTION_VIEW, uri);
                        external.addCategory(Intent.CATEGORY_BROWSABLE);
                        startActivity(external);
                    } catch (ActivityNotFoundException e) {
                        Toast.makeText(MainActivity.this, "Browser tidak ditemukan", Toast.LENGTH_LONG).show();
                    }
                }
                return true;
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                if (url != null && Uri.parse(url).getHost() != null &&
                    "marketmarney.com".equalsIgnoreCase(Uri.parse(url).getHost()) &&
                    "https".equalsIgnoreCase(Uri.parse(url).getScheme())) {
                    // Signals app context to MarketMarney web code; no untrusted JS bridge exposed.
                    view.evaluateJavascript("try{window.MarketMarneyApp={platform:'android',version:'4.1'};localStorage.setItem('mm_app_client','android-native-v4.1')}catch(e){}", null);
                    if (homepage) {
                        // APK is already installed, so don't show the web PWA
                        // install prompt over the Android bottom navigation.
                        view.evaluateJavascript("try{var s=document.createElement('style');s.textContent='#mmInstall{display:none!important}';document.head.appendChild(s)}catch(e){}", null);
                    }
                    if ("Kalender Ekonomi".equals(title)) {
                        view.evaluateJavascript("try{if(typeof go==='function')go('Kalender Ekonomi')}catch(e){}", null);
                    } else if ("MarketMarney TV".equals(title)) {
                        view.evaluateJavascript("try{if(typeof go==='function')go('MarketMarney TV')}catch(e){}", null);
                    }
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError error) {
                if (req.isForMainFrame()) {
                    Toast.makeText(MainActivity.this, "Halaman belum dapat dibuka. Periksa koneksi, lalu tekan Muat Ulang.", Toast.LENGTH_LONG).show();
                }
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int amount) {
                progress.setProgress(amount);
                progress.setVisibility(amount >= 100 ? View.GONE : View.VISIBLE);
            }
            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> cb,
                                                        FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                try {
                    Intent chooser = params.createIntent();
                    startActivityForResult(chooser, REQUEST_PICK_FILE);
                    return true;
                } catch (Exception e) {
                    fileCallback = null;
                    cb.onReceiveValue(null);
                    return false;
                }
            }
        });
        webPanel.addView(browser, new FrameLayout.LayoutParams(-1, -1));
        String url = BASE + path;
        browser.loadUrl(url);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_PICK_FILE && fileCallback != null) {
            Uri[] uris = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null;
            fileCallback.onReceiveValue(uris);
            fileCallback = null;
        }
    }

    @Override public void onBackPressed() {
        if (webMode && browser != null && browser.canGoBack()) browser.goBack();
        else if (tab != NAV_HOME) navigate(NAV_HOME);
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        clearContent();
        io.shutdownNow();
        if(googleLogin!=null)googleLogin.close();
        super.onDestroy();
    }
}