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
 * Home, Markets, Headlines, Social launcher and Account are Android views.
 * Complex existing features are opened in an internal WebView, never as the landing screen.
 * No account data, client secrets or market prices are stored in this app.
 */
public final class MainActivity extends Activity {
    private static final String BASE = "https://marketmarney.com";
    private static final int NAV_HOME = 0, NAV_MARKET = 1, NAV_NEWS = 2, NAV_SOCIAL = 3, NAV_ACCOUNT = 4;
    private static final int REQUEST_PICK_FILE = 40;
    private static final int NAVY = Color.rgb(5, 17, 33);
    private static final int CARD = Color.rgb(12, 31, 51);
    private static final int CARD_ALT = Color.rgb(17, 40, 63);
    private static final int GOLD = Color.rgb(255, 192, 59);
    private static final int WHITE = Color.rgb(246, 248, 252);
    private static final int MUTED = Color.rgb(161, 183, 207);
    private static final int OUTLINE = Color.rgb(33, 63, 85);
    private static final int GREEN = Color.rgb(90, 211, 171);

    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private LinearLayout root;
    private FrameLayout content;
    private LinearLayout bottomBar;
    private WebView browser;
    private ValueCallback<Uri[]> fileCallback;
    private int tab = NAV_HOME;
    private boolean webMode = false;

    private int dp(float num) {
        return (int) (num * getResources().getDisplayMetrics().density + 0.5f);
    }

    private GradientDrawable bg(int color, float radius) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
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
        buildHeader();
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        bottomBar = horizontal();
        bottomBar.setBackgroundColor(Color.rgb(8, 23, 39));
        root.addView(bottomBar, lp(-1, 67));
        navigate(NAV_HOME);
    }

    private void buildHeader() {
        LinearLayout top = horizontal();
        top.setPadding(dp(17), dp(8), dp(15), dp(8));
        top.setBackgroundColor(Color.rgb(6, 21, 38));
        root.addView(top, lp(-1, 69));
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        logo.setContentDescription("MarketMarney");
        top.addView(logo, lp(45, 45));
        LinearLayout names = vertical();
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(0, -2, 1);
        nameLp.leftMargin = dp(10);
        top.addView(names, nameLp);
        addLabel(names, "MarketMarney", 20, WHITE, true);
        TextView subtitle = text("APLIKASI ANDROID  •  MARKET INTELLIGENCE", 9, MUTED, false);
        subtitle.setLetterSpacing(0.06f);
        names.addView(subtitle);
        TextView live = text("●  ID", 11, GREEN, true);
        live.setGravity(Gravity.CENTER);
        live.setPadding(dp(9), dp(6), dp(9), dp(6));
        live.setBackground(strokeBg(CARD, 10));
        top.addView(live);
        View line = new View(this);
        line.setBackgroundColor(OUTLINE);
        root.addView(line, lp(-1, 1));
    }

    private void drawBottomBar() {
        bottomBar.removeAllViews();
        String[] labels = {"Beranda", "Pasar", "Berita", "Social", "Akun"};
        String[] symbols = {"⌂", "⌁", "▤", "◎", "◉"};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            LinearLayout box = vertical();
            box.setGravity(Gravity.CENTER);
            boolean active = i == tab;
            TextView symbol = text(symbols[i], 24, active ? GOLD : MUTED, active);
            symbol.setGravity(Gravity.CENTER);
            box.addView(symbol);
            TextView label = text(labels[i], 11, active ? GOLD : MUTED, active);
            label.setGravity(Gravity.CENTER);
            box.addView(label);
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
        box.setPadding(dp(16), dp(16), dp(16), dp(16));
        box.setBackground(strokeBg(CARD, 17));
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
        LinearLayout page = page("MARKETMARNEY MOBILE", "Jelajahi market.",
                "Berita finansial, market, dan komunitas dalam satu aplikasi.");
        LinearLayout hero = card(page);
        hero.setBackground(bg(Color.rgb(21, 48, 68), 17));
        addLabel(hero, "DASHBOARD ANDROID", 11, GREEN, true);
        space(hero, 9);
        addLabel(hero, "Satu aplikasi untuk mengikuti pasar.", 22, WHITE, true);
        space(hero, 7);
        addLabel(hero, "Emas • Forex • Saham • Kripto", 13, MUTED, false);
        space(hero, 12);
        hero.addView(button("Lihat market", true, () -> navigate(NAV_MARKET)), lp(-1, 46));

        sectionTitle(page, "Akses cepat");
        LinearLayout actions = horizontal();
        LinearLayout.LayoutParams one = new LinearLayout.LayoutParams(0, dp(52), 1);
        one.rightMargin = dp(7);
        actions.addView(button("Grafik", false,
                () -> showWeb("Market Live", "/index.html#marketlive")), one);
        LinearLayout.LayoutParams two = new LinearLayout.LayoutParams(0, dp(52), 1);
        two.leftMargin = dp(7);
        actions.addView(button("Social", false, () -> navigate(NAV_SOCIAL)), two);
        page.addView(actions);

        sectionTitle(page, "Berita terbaru");
        LinearLayout list = vertical();
        page.addView(list);
        loading(list);
        loadNews(list, true, NAV_HOME);
        page.addView(button("Lihat semua berita", false, () -> navigate(NAV_NEWS)), lp(-1, 49));
        sectionTitle(page, "Edukasi & komunitas");
        linkCard(page, "SOCIAL MARNEY", "Diskusi, Story & Reels",
                "Berbagi pandangan dan mengikuti komunitas trader MarketMarney.",
                "Buka Social", () -> navigate(NAV_SOCIAL));
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
        LinearLayout page = page("SOCIAL MARNEY", "Komunitas trader", "Linimasa, grup, Story, dan Reels MarketMarney.");
        linkCard(page, "LINIMASA", "Beranda Trader",
                "Postingan, interaksi, Story dan Reels dari anggota komunitas.", "Buka Linimasa",
                () -> showWeb("Social Marney", "/beranda-trader.html"));
        linkCard(page, "GRUP", "Grup diskusi",
                "Grup publik atau privat, permintaan bergabung, dan percakapan.", "Buka Grup",
                () -> showWeb("Grup Trader", "/grup-trader.html"));
        linkCard(page, "FORUM", "Forum Komunitas",
                "Diskusikan market, pertanyaan, dan analisis.", "Buka Forum",
                () -> showWeb("Forum", "/community.html"));
        linkCard(page, "VIDEO", "MarketMarney TV",
                "Video edukasi, analisis, dan konten pasar.", "Buka TV",
                () -> showWeb("MarketMarney TV", "/index.html#tv"));
    }

    private void account() {
        LinearLayout page = page("ACCOUNT", "Akun MarketMarney", "Kelola akun dan profil komunitas Anda.");
        linkCard(page, "AKUN", "Masuk atau daftar",
                "Gunakan akun MarketMarney yang sudah ada.", "Masuk / Daftar",
                () -> showWeb("Akun MarketMarney", "/akun.html"));
        linkCard(page, "PROFIL", "Profil Social Marney",
                "Lihat informasi dan pengaturan profil akun.", "Buka Profil",
                () -> showWeb("Profil", "/profil.html"));
        linkCard(page, "INFORMASI", "Tentang MarketMarney",
                "Informasi layanan dan disclaimer finansial.", "Baca Informasi",
                () -> showWeb("Tentang MarketMarney", "/about.html"));
        space(page, 8);
        addLabel(page, "Versi Android 3.0.0 beta. Tampilan utama adalah aplikasi native; beberapa fitur kompleks masih menggunakan halaman internal MarketMarney.", 12, MUTED, false);
    }

    /** Opens a MarketMarney page inside the app, never opening Chrome automatically. */
    private void showWeb(String title, String path) {
        clearContent();
        webMode = true;
        LinearLayout panel = vertical();
        panel.setBackgroundColor(NAVY);
        content.addView(panel, new FrameLayout.LayoutParams(-1, -1));
        LinearLayout toolbar = horizontal();
        toolbar.setPadding(dp(10), dp(5), dp(15), dp(5));
        toolbar.setBackgroundColor(CARD);
        panel.addView(toolbar, lp(-1, 48));
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
        setting.setUserAgentString(setting.getUserAgentString() + " MarketMarneyAndroid/3.0 AppShell");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);
        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("https".equalsIgnoreCase(uri.getScheme()) &&
                    ("marketmarney.com".equalsIgnoreCase(host) || "www.marketmarney.com".equalsIgnoreCase(host))) return false;
                // OAuth providers do not allow embedded WebViews. Open only that login externally.
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
                if (url != null && url.startsWith(BASE)) {
                    // Signals app context to MarketMarney web code; no untrusted JS bridge exposed.
                    view.evaluateJavascript("try{window.MarketMarneyApp={platform:'android',version:'3.0'};localStorage.setItem('mm_app_client','android-native-v3')}catch(e){}", null);
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
        else if (webMode || tab != NAV_HOME) navigate(NAV_HOME);
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        clearContent();
        io.shutdownNow();
        super.onDestroy();
    }
}