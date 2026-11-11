#!/usr/bin/env python3
"""Build-time upgrade for the MarketMarney Android shell.

The patch keeps the existing native dashboard, upgrades it to a light-only and
more reliable v4 shell, and integrates the current Social Marney + Live Marney
web experience without changing production accounts or website data.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
MANIFEST = ROOT / "app/src/main/AndroidManifest.xml"
STYLES = ROOT / "app/src/main/res/values/styles.xml"
GRADLE = ROOT / "app/build.gradle"
MARKER = "MARNEY_ANDROID_V4"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


def replace_between(text: str, start: str, end: str, replacement: str, label: str) -> str:
    first = text.find(start)
    if first < 0:
        raise RuntimeError(f"{label}: start anchor missing")
    last = text.find(end, first + len(start))
    if last < 0:
        raise RuntimeError(f"{label}: end anchor missing")
    return text[:first] + replacement + text[last:]


source = MAIN.read_text(encoding="utf-8")
if MARKER not in source:
    source = replace_once(source, "import android.app.Activity;\n", "import android.app.Activity;\nimport android.app.DownloadManager;\nimport android.Manifest;\n", "Android imports 1")
    source = replace_once(source, "import android.content.ActivityNotFoundException;\n", "import android.content.ActivityNotFoundException;\nimport android.content.Context;\n", "Android imports 2")
    source = replace_once(source, "import android.content.Intent;\n", "import android.content.Intent;\nimport android.content.pm.PackageManager;\nimport android.content.res.AssetFileDescriptor;\nimport android.database.Cursor;\n", "Android imports 3")
    source = replace_once(source, "import android.net.Uri;\n", "import android.net.Uri;\nimport android.os.Build;\nimport android.os.Environment;\nimport android.provider.OpenableColumns;\n", "Android imports 4")
    source = replace_once(source, "import android.webkit.CookieManager;\n", "import android.webkit.CookieManager;\nimport android.webkit.PermissionRequest;\nimport android.webkit.URLUtil;\n", "Web imports")

    source = replace_once(
        source,
        "    private static final int REQUEST_PICK_FILE = 40;\n"
        "    private static final int NAVY = Color.rgb(5, 17, 33);\n"
        "    private static final int CARD = Color.rgb(12, 31, 51);\n"
        "    private static final int CARD_ALT = Color.rgb(17, 40, 63);\n"
        "    private static final int GOLD = Color.rgb(255, 192, 59);\n"
        "    private static final int WHITE = Color.rgb(246, 248, 252);\n"
        "    private static final int MUTED = Color.rgb(161, 183, 207);\n"
        "    private static final int OUTLINE = Color.rgb(33, 63, 85);\n"
        "    private static final int GREEN = Color.rgb(90, 211, 171);\n",
        "    private static final String APP_BUILD = \"MARNEY_ANDROID_V4\";\n"
        "    private static final int REQUEST_PICK_FILE = 40;\n"
        "    private static final int REQUEST_MEDIA_PERMISSION = 41;\n"
        "    private static final int REQUEST_STORAGE_PERMISSION = 42;\n"
        "    private static final long MAX_UPLOAD_BYTES = 100L * 1024L * 1024L;\n"
        "    // Semantic names are retained to minimize risk in the existing native layout.\n"
        "    private static final int NAVY = Color.rgb(247, 248, 250);\n"
        "    private static final int CARD = Color.rgb(255, 255, 255);\n"
        "    private static final int CARD_ALT = Color.rgb(255, 242, 233);\n"
        "    private static final int GOLD = Color.rgb(244, 122, 31);\n"
        "    private static final int WHITE = Color.rgb(24, 26, 29);\n"
        "    private static final int MUTED = Color.rgb(103, 109, 117);\n"
        "    private static final int OUTLINE = Color.rgb(225, 229, 234);\n"
        "    private static final int GREEN = Color.rgb(12, 145, 98);\n",
        "v4 constants",
    )

    source = replace_once(
        source,
        "    private LinearLayout root;\n"
        "    private FrameLayout content;\n"
        "    private LinearLayout bottomBar;\n"
        "    private WebView browser;\n"
        "    private ValueCallback<Uri[]> fileCallback;\n"
        "    private int tab = NAV_HOME;\n"
        "    private boolean webMode = false;\n",
        "    private LinearLayout root;\n"
        "    private LinearLayout header;\n"
        "    private View headerDivider;\n"
        "    private FrameLayout content;\n"
        "    private LinearLayout bottomBar;\n"
        "    private WebView browser;\n"
        "    private ValueCallback<Uri[]> fileCallback;\n"
        "    private PermissionRequest pendingPermissionRequest;\n"
        "    private String pendingDownloadUrl;\n"
        "    private String pendingDownloadUserAgent;\n"
        "    private String pendingDownloadDisposition;\n"
        "    private String pendingDownloadMime;\n"
        "    private int tab = NAV_HOME;\n"
        "    private int webReturnTab = NAV_HOME;\n"
        "    private boolean webMode = false;\n",
        "v4 fields",
    )

    source = replace_once(
        source,
        "        b.setTextColor(main ? NAVY : WHITE);\n",
        "        b.setTextColor(main ? Color.WHITE : WHITE);\n        b.setMinHeight(dp(44));\n",
        "button contrast",
    )

    source = replace_between(
        source,
        "    @Override\n    public void onCreate(Bundle savedInstanceState) {",
        "    private void buildHeader() {",
        '''    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(CARD);
        getWindow().setNavigationBarColor(CARD);
        int systemUi = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            systemUi |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        getWindow().getDecorView().setSystemUiVisibility(systemUi);
        WebView.setWebContentsDebuggingEnabled(false);

        root = vertical();
        root.setBackgroundColor(NAVY);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root);
        buildHeader();
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        bottomBar = horizontal();
        bottomBar.setPadding(dp(7), dp(5), dp(7), dp(5));
        bottomBar.setBackgroundColor(CARD);
        root.addView(bottomBar, lp(-1, 72));
        navigate(NAV_HOME);
    }

''',
        "onCreate",
    )

    source = replace_between(
        source,
        "    private void buildHeader() {",
        "    private void drawBottomBar() {",
        '''    private void buildHeader() {
        header = horizontal();
        header.setPadding(dp(17), dp(8), dp(15), dp(8));
        header.setBackgroundColor(CARD);
        root.addView(header, lp(-1, 69));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.mipmap.ic_launcher);
        logo.setContentDescription("MarketMarney");
        logo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        header.addView(logo, lp(46, 46));

        LinearLayout names = vertical();
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(0, -2, 1);
        nameLp.leftMargin = dp(10);
        header.addView(names, nameLp);
        addLabel(names, "MarketMarney", 20, WHITE, true);
        TextView subtitle = text("MARKET  •  BERITA  •  SOCIAL", 9, MUTED, false);
        subtitle.setLetterSpacing(0.06f);
        names.addView(subtitle);

        TextView badge = text("●  MARNEY", 10, GREEN, true);
        badge.setGravity(Gravity.CENTER);
        badge.setPadding(dp(9), dp(7), dp(9), dp(7));
        badge.setBackground(strokeBg(Color.rgb(244, 251, 247), 12));
        header.addView(badge);

        headerDivider = new View(this);
        headerDivider.setBackgroundColor(OUTLINE);
        root.addView(headerDivider, lp(-1, 1));
    }

''',
        "header",
    )

    source = replace_between(
        source,
        "    private void drawBottomBar() {",
        "    private void clearContent() {",
        '''    private void drawBottomBar() {
        bottomBar.removeAllViews();
        String[] labels = {"Beranda", "Market", "Berita", "Social", "Akun"};
        String[] symbols = {"⌂", "⌁", "▤", "◎", "◉"};
        for (int i = 0; i < labels.length; i++) {
            final int index = i;
            LinearLayout box = vertical();
            box.setGravity(Gravity.CENTER);
            box.setPadding(dp(3), dp(4), dp(3), dp(4));
            boolean active = i == tab;
            box.setBackground(bg(active ? CARD_ALT : Color.TRANSPARENT, 16));
            TextView symbol = text(symbols[i], 22, active ? GOLD : MUTED, active);
            symbol.setGravity(Gravity.CENTER);
            box.addView(symbol);
            TextView label = text(labels[i], 10, active ? GOLD : MUTED, active);
            label.setGravity(Gravity.CENTER);
            box.addView(label);
            box.setContentDescription(labels[i]);
            box.setFocusable(true);
            box.setOnClickListener(v -> navigate(index));
            bottomBar.addView(box, new LinearLayout.LayoutParams(0, -1, 1));
        }
    }

''',
        "bottom navigation",
    )

    source = replace_between(
        source,
        "    private void clearContent() {",
        "    private LinearLayout page(",
        '''    private void setNativeChromeVisible(boolean visible) {
        int state = visible ? View.VISIBLE : View.GONE;
        if (header != null) header.setVisibility(state);
        if (headerDivider != null) headerDivider.setVisibility(state);
        if (bottomBar != null) bottomBar.setVisibility(state);
    }

    private void clearContent() {
        if (pendingPermissionRequest != null) {
            pendingPermissionRequest.deny();
            pendingPermissionRequest = null;
        }
        if (browser != null) {
            WebView old = browser;
            browser = null;
            old.stopLoading();
            old.onPause();
            old.setDownloadListener(null);
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
        setNativeChromeVisible(true);
        clearContent();
        drawBottomBar();
        switch (index) {
            case NAV_HOME: home(); break;
            case NAV_MARKET: markets(); break;
            case NAV_NEWS: headlines(); break;
            case NAV_SOCIAL:
                showWeb("Social Marney", "/beranda-trader.html");
                break;
            default: account(); break;
        }
    }

    private LinearLayout page(''',
        "content lifecycle and navigation",
    )

    source = replace_once(
        source,
        "        hero.setBackground(bg(Color.rgb(21, 48, 68), 17));\n",
        "        hero.setBackground(strokeBg(Color.rgb(255, 247, 240), 17));\n",
        "light hero",
    )

    source = replace_once(
        source,
        '''        LinearLayout actions = horizontal();
        LinearLayout.LayoutParams one = new LinearLayout.LayoutParams(0, dp(52), 1);
        one.rightMargin = dp(7);
        actions.addView(button("Grafik", false,
                () -> showWeb("Market Live", "/index.html#marketlive")), one);
        LinearLayout.LayoutParams two = new LinearLayout.LayoutParams(0, dp(52), 1);
        two.leftMargin = dp(7);
        actions.addView(button("Social", false, () -> navigate(NAV_SOCIAL)), two);
        page.addView(actions);
''',
        '''        LinearLayout actions = horizontal();
        LinearLayout.LayoutParams one = new LinearLayout.LayoutParams(0, dp(52), 1);
        one.rightMargin = dp(5);
        actions.addView(button("Grafik", false,
                () -> showWeb("Market Live", "/index.html#marketlive")), one);
        LinearLayout.LayoutParams two = new LinearLayout.LayoutParams(0, dp(52), 1);
        two.leftMargin = dp(5);
        two.rightMargin = dp(5);
        actions.addView(button("TV", false,
                () -> showWeb("MarketMarney TV", "/index.html#tv")), two);
        LinearLayout.LayoutParams three = new LinearLayout.LayoutParams(0, dp(52), 1);
        three.leftMargin = dp(5);
        actions.addView(button("Social", false, () -> navigate(NAV_SOCIAL)), three);
        page.addView(actions);
''',
        "home quick actions",
    )

    source = replace_once(
        source,
        '        sectionTitle(page, "Analisis & Kalender");\n',
        '''        linkCard(page, "XAUWAR LIVE", "Arena pergerakan emas",
                "Pantau visual XAU/USD dan ruang chat market secara langsung.", "Buka XAUWar",
                () -> showWeb("XAUWar Live", "/assets/xau-war-3d.html"));
        sectionTitle(page, "Analisis & Kalender");
''',
        "XAUWar entry",
    )

    source = source.replace("conn.setConnectTimeout(8500);", "conn.setConnectTimeout(6000);")
    source = source.replace("conn.setReadTimeout(10000);", "conn.setReadTimeout(8000);")
    source = source.replace("MarketMarneyAndroid/3.0 (NativeDashboard)", "MarketMarneyAndroid/4.0 (NativeDashboard)")
    source = source.replace(
        "Versi Android 3.0.0 beta. Tampilan utama adalah aplikasi native; beberapa fitur kompleks masih menggunakan halaman internal MarketMarney.",
        "Versi Android 4.0.0 beta. Mode terang, Social Marney layar penuh, Live, unggahan 100 MB, dan unduhan sudah dioptimalkan.",
    )

    source = replace_between(
        source,
        "    /** Opens a MarketMarney page inside the app, never opening Chrome automatically. */",
        "    @Override protected void onActivityResult",
        r'''    private boolean isTrustedMarketMarney(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        return "marketmarney.com".equalsIgnoreCase(host) || "www.marketmarney.com".equalsIgnoreCase(host);
    }

    private void openExternal(Uri uri) {
        try {
            Intent external = new Intent(Intent.ACTION_VIEW, uri);
            external.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(external);
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "Aplikasi untuk membuka tautan tidak ditemukan", Toast.LENGTH_LONG).show();
        }
    }

    private long contentLength(Uri uri) {
        if (uri == null) return -1L;
        try (Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (index >= 0 && !cursor.isNull(index)) return cursor.getLong(index);
            }
        } catch (Exception ignored) {}
        try (AssetFileDescriptor file = getContentResolver().openAssetFileDescriptor(uri, "r")) {
            return file == null ? -1L : file.getLength();
        } catch (Exception ignored) {
            return -1L;
        }
    }

    private boolean uploadsFitLimit(Uri[] uris) {
        if (uris == null) return true;
        for (Uri uri : uris) {
            long bytes = contentLength(uri);
            if (bytes > MAX_UPLOAD_BYTES) return false;
        }
        return true;
    }

    private void clearPendingDownload() {
        pendingDownloadUrl = null;
        pendingDownloadUserAgent = null;
        pendingDownloadDisposition = null;
        pendingDownloadMime = null;
    }

    private void startDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        Uri uri;
        try { uri = Uri.parse(url); }
        catch (Exception error) { return; }
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            Toast.makeText(this, "Unduhan tidak aman diblokir", Toast.LENGTH_LONG).show();
            return;
        }
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P &&
                checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            pendingDownloadUrl = url;
            pendingDownloadUserAgent = userAgent;
            pendingDownloadDisposition = contentDisposition;
            pendingDownloadMime = mimeType;
            requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQUEST_STORAGE_PERMISSION);
            return;
        }
        enqueueDownload(url, userAgent, contentDisposition, mimeType);
    }

    private void enqueueDownload(String url, String userAgent, String contentDisposition, String mimeType) {
        try {
            String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(filename);
            request.setDescription("Mengunduh dari MarketMarney");
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(false);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            if (mimeType != null && !mimeType.isEmpty()) request.setMimeType(mimeType);
            if (userAgent != null && !userAgent.isEmpty()) request.addRequestHeader("User-Agent", userAgent);
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isEmpty()) request.addRequestHeader("Cookie", cookie);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
            DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (manager == null) throw new IllegalStateException("DownloadManager unavailable");
            manager.enqueue(request);
            Toast.makeText(this, "Unduhan dimulai. Periksa folder Download.", Toast.LENGTH_LONG).show();
        } catch (Exception error) {
            Toast.makeText(this, "Unduhan belum dapat dimulai. Tautan dibuka di browser.", Toast.LENGTH_LONG).show();
            openExternal(Uri.parse(url));
        } finally {
            clearPendingDownload();
        }
    }

    private String lightModeScript() {
        return "(function(){try{" +
                "window.MarketMarneyApp={platform:'android',version:'4.0',maxUploadBytes:104857600};" +
                "localStorage.setItem('mm_app_client','android-native-v4');" +
                "localStorage.setItem('mm_theme','light');localStorage.setItem('theme','light');localStorage.setItem('marketmarney-theme','light');" +
                "var apply=function(){var r=document.documentElement;r.style.colorScheme='light';r.setAttribute('data-theme','light');r.setAttribute('data-mm-theme','light');r.classList.remove('dark');r.classList.add('light');};" +
                "apply();if(!window.__mmAppLightObserver){window.__mmAppLightObserver=new MutationObserver(apply);window.__mmAppLightObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class','data-theme','data-mm-theme']});}" +
                "}catch(e){}})();";
    }

    private void grantWebMediaPermission(PermissionRequest request) {
        if (request == null) return;
        List<String> allowed = new ArrayList<>();
        String[] resources = request.getResources();
        if (resources != null) {
            for (String resource : resources) {
                if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&
                        (Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                                checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)) {
                    allowed.add(resource);
                }
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) &&
                        (Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
                                checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)) {
                    allowed.add(resource);
                }
            }
        }
        if (allowed.isEmpty()) request.deny();
        else request.grant(allowed.toArray(new String[0]));
    }

    private void handleWebBack() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else navigate(webReturnTab);
    }

    /** Opens a trusted MarketMarney page in an immersive internal WebView. */
    private void showWeb(String title, String path) {
        clearContent();
        webMode = true;
        webReturnTab = tab == NAV_SOCIAL ? NAV_HOME : tab;
        setNativeChromeVisible(false);

        LinearLayout panel = vertical();
        panel.setBackgroundColor(CARD);
        content.addView(panel, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout toolbar = horizontal();
        toolbar.setPadding(dp(8), dp(5), dp(8), dp(5));
        toolbar.setBackgroundColor(CARD);
        panel.addView(toolbar, lp(-1, 54));

        TextView back = text("‹", 30, GOLD, true);
        back.setGravity(Gravity.CENTER);
        back.setContentDescription("Kembali");
        back.setOnClickListener(v -> handleWebBack());
        toolbar.addView(back, lp(44, 44));

        TextView titleView = text(title, 16, WHITE, true);
        titleView.setSingleLine(true);
        toolbar.addView(titleView, new LinearLayout.LayoutParams(0, -2, 1));

        TextView home = text("⌂", 23, GOLD, true);
        home.setGravity(Gravity.CENTER);
        home.setContentDescription("Kembali ke beranda aplikasi");
        home.setOnClickListener(v -> navigate(NAV_HOME));
        toolbar.addView(home, lp(42, 44));

        TextView reload = text("⟳", 24, GOLD, true);
        reload.setGravity(Gravity.CENTER);
        reload.setContentDescription("Muat ulang");
        reload.setOnClickListener(v -> { if (browser != null) browser.reload(); });
        toolbar.addView(reload, lp(42, 44));

        ProgressBar progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(GOLD));
        panel.addView(progress, lp(-1, 3));

        FrameLayout webPanel = new FrameLayout(this);
        panel.addView(webPanel, new LinearLayout.LayoutParams(-1, 0, 1));
        browser = new WebView(this);
        browser.setBackgroundColor(CARD);
        browser.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);
        browser.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings setting = browser.getSettings();
        setting.setJavaScriptEnabled(true);
        setting.setDomStorageEnabled(true);
        setting.setDatabaseEnabled(true);
        setting.setLoadsImagesAutomatically(true);
        setting.setCacheMode(WebSettings.LOAD_DEFAULT);
        setting.setAllowFileAccess(false);
        setting.setAllowContentAccess(true);
        setting.setAllowFileAccessFromFileURLs(false);
        setting.setAllowUniversalAccessFromFileURLs(false);
        setting.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        setting.setSupportMultipleWindows(false);
        setting.setJavaScriptCanOpenWindowsAutomatically(false);
        setting.setGeolocationEnabled(false);
        setting.setMediaPlaybackRequiresUserGesture(false);
        setting.setBuiltInZoomControls(false);
        setting.setDisplayZoomControls(false);
        setting.setTextZoom(100);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) setting.setSafeBrowsingEnabled(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) setting.setForceDark(WebSettings.FORCE_DARK_OFF);
        setting.setUserAgentString(setting.getUserAgentString() + " MarketMarneyAndroid/4.0 AppShell");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(browser, false);

        browser.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isTrustedMarketMarney(uri)) return false;
                String scheme = uri == null ? null : uri.getScheme();
                if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme) ||
                        "mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme)) {
                    openExternal(uri);
                }
                return true;
            }

            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                if (url != null && url.startsWith(BASE)) {
                    view.evaluateJavascript(lightModeScript(), null);
                    if ("Kalender Ekonomi".equals(title)) {
                        view.evaluateJavascript("try{if(typeof go==='function')go('Kalender Ekonomi')}catch(e){}", null);
                    } else if ("MarketMarney TV".equals(title)) {
                        view.evaluateJavascript("try{if(typeof go==='function')go('MarketMarney TV')}catch(e){}", null);
                    }
                }
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(MainActivity.this,
                            "Halaman belum dapat dibuka. Periksa koneksi lalu tekan Muat Ulang.",
                            Toast.LENGTH_LONG).show();
                }
            }
        });

        browser.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!isTrustedMarketMarney(request.getOrigin())) {
                        request.deny();
                        return;
                    }
                    boolean wantsCamera = false;
                    boolean wantsAudio = false;
                    String[] resources = request.getResources();
                    if (resources != null) {
                        for (String resource : resources) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) wantsCamera = true;
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) wantsAudio = true;
                        }
                    }
                    if (!wantsCamera && !wantsAudio) {
                        request.deny();
                        return;
                    }
                    boolean cameraMissing = wantsCamera && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                            checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED;
                    boolean audioMissing = wantsAudio && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                            checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED;
                    if (cameraMissing || audioMissing) {
                        if (pendingPermissionRequest != null) pendingPermissionRequest.deny();
                        pendingPermissionRequest = request;
                        List<String> needed = new ArrayList<>();
                        if (cameraMissing) needed.add(Manifest.permission.CAMERA);
                        if (audioMissing) needed.add(Manifest.permission.RECORD_AUDIO);
                        requestPermissions(needed.toArray(new String[0]), REQUEST_MEDIA_PERMISSION);
                    } else {
                        grantWebMediaPermission(request);
                    }
                });
            }

            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (pendingPermissionRequest == request) pendingPermissionRequest = null;
            }

            @Override public void onProgressChanged(WebView view, int amount) {
                progress.setProgress(amount);
                progress.setVisibility(amount >= 100 ? View.GONE : View.VISIBLE);
            }

            @Override public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback,
                                                        FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent chooserIntent = params.createIntent();
                    chooserIntent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(Intent.createChooser(chooserIntent, "Pilih media atau dokumen"), REQUEST_PICK_FILE);
                    return true;
                } catch (Exception error) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "Pemilih file tidak tersedia", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        browser.setDownloadListener(this::startDownload);
        webPanel.addView(browser, new FrameLayout.LayoutParams(-1, -1));
        browser.resumeTimers();
        String safePath = path != null && path.startsWith("/") ? path : "/";
        browser.loadUrl(BASE + safePath);
    }

''',
        "immersive WebView",
    )

    tail_start = source.find("    @Override protected void onActivityResult")
    if tail_start < 0:
        raise RuntimeError("activity result tail missing")
    source = source[:tail_start] + r'''    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQUEST_PICK_FILE || fileCallback == null) return;
        Uri[] uris = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null;
        if (uris == null && resultCode == RESULT_OK && data != null && data.getData() != null) {
            uris = new Uri[]{data.getData()};
        }
        if (!uploadsFitLimit(uris)) {
            Toast.makeText(this, "Ukuran maksimal setiap unggahan adalah 100 MB.", Toast.LENGTH_LONG).show();
            uris = null;
        }
        fileCallback.onReceiveValue(uris);
        fileCallback = null;
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_MEDIA_PERMISSION) {
            PermissionRequest request = pendingPermissionRequest;
            pendingPermissionRequest = null;
            if (request != null) grantWebMediaPermission(request);
            boolean denied = grantResults.length == 0;
            for (int result : grantResults) if (result != PackageManager.PERMISSION_GRANTED) denied = true;
            if (denied) {
                Toast.makeText(this, "Izin kamera dan mikrofon diperlukan untuk memulai Live.", Toast.LENGTH_LONG).show();
            }
            return;
        }
        if (requestCode == REQUEST_STORAGE_PERMISSION && pendingDownloadUrl != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                enqueueDownload(pendingDownloadUrl, pendingDownloadUserAgent, pendingDownloadDisposition, pendingDownloadMime);
            } else {
                String url = pendingDownloadUrl;
                clearPendingDownload();
                Toast.makeText(this, "Izin penyimpanan ditolak. Unduhan dibuka di browser.", Toast.LENGTH_LONG).show();
                openExternal(Uri.parse(url));
            }
        }
    }

    @Override public void onBackPressed() {
        if (webMode) handleWebBack();
        else if (tab != NAV_HOME) navigate(NAV_HOME);
        else super.onBackPressed();
    }

    @Override protected void onPause() {
        if (browser != null) browser.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (browser != null) browser.onResume();
    }

    @Override protected void onDestroy() {
        if (pendingPermissionRequest != null) {
            pendingPermissionRequest.deny();
            pendingPermissionRequest = null;
        }
        if (fileCallback != null) {
            fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
        clearPendingDownload();
        clearContent();
        io.shutdownNow();
        CookieManager.getInstance().flush();
        super.onDestroy();
    }
}
'''

MAIN.write_text(source, encoding="utf-8")

manifest = MANIFEST.read_text(encoding="utf-8")
manifest = replace_once(
    manifest,
    '    <uses-permission android:name="android.permission.INTERNET" />',
    '    <uses-permission android:name="android.permission.INTERNET" />\n'
    '    <uses-permission android:name="android.permission.CAMERA" />\n'
    '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n'
    '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />\n'
    '    <uses-feature android:name="android.hardware.camera.any" android:required="false" />\n'
    '    <uses-feature android:name="android.hardware.microphone" android:required="false" />',
    "manifest permissions",
)
manifest = replace_once(
    manifest,
    '        android:allowBackup="false"\n        android:usesCleartextTraffic="false"',
    '        android:allowBackup="false"\n'
    '        android:usesCleartextTraffic="false"\n'
    '        android:hardwareAccelerated="true"\n'
    '        android:forceDarkAllowed="false"\n'
    '        android:supportsRtl="true"',
    "manifest application",
)
manifest = replace_once(
    manifest,
    '            android:screenOrientation="unspecified"\n            android:exported="true"',
    '            android:screenOrientation="unspecified"\n'
    '            android:launchMode="singleTask"\n'
    '            android:windowSoftInputMode="adjustResize"\n'
    '            android:exported="true"',
    "manifest activity",
)
MANIFEST.write_text(manifest, encoding="utf-8")

STYLES.write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources>
<style name="Theme.MarketMarney" parent="android:style/Theme.Material.Light.NoActionBar">
    <item name="android:fontFamily">sans</item>
    <item name="android:colorAccent">#F47A1F</item>
    <item name="android:statusBarColor">#FFFFFF</item>
    <item name="android:navigationBarColor">#FFFFFF</item>
    <item name="android:windowLightStatusBar">true</item>
    <item name="android:windowLightNavigationBar">true</item>
    <item name="android:windowActionModeOverlay">true</item>
    <item name="android:windowNoTitle">true</item>
    <item name="android:windowBackground">#F7F8FA</item>
    <item name="android:forceDarkAllowed">false</item>
</style>
</resources>
''', encoding="utf-8")

gradle = GRADLE.read_text(encoding="utf-8")
gradle = gradle.replace("versionCode 3", "versionCode 5")
gradle = gradle.replace("versionName '3.0.0-beta'", "versionName '4.0.0-beta'")
GRADLE.write_text(gradle, encoding="utf-8")

checks = {
    "v4 marker": MARKER in source,
    "light palette": "Color.rgb(247, 248, 250)" in source,
    "social direct": 'showWeb("Social Marney", "/beranda-trader.html")' in source,
    "100 MB upload": "MAX_UPLOAD_BYTES = 100L * 1024L * 1024L" in source,
    "content chooser": "setAllowContentAccess(true)" in source,
    "download manager": "DownloadManager.Request" in source,
    "camera permission handler": "onPermissionRequest(PermissionRequest request)" in source,
    "safe origin": "isTrustedMarketMarney" in source,
    "light web mode": "window.__mmAppLightObserver" in source,
    "camera manifest": 'android.permission.CAMERA' in manifest,
    "microphone manifest": 'android.permission.RECORD_AUDIO' in manifest,
    "version": "versionName '4.0.0-beta'" in gradle,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Marney Android v4 validation failed: " + ", ".join(failed))
print({"marneyAndroidV4Patched": True, "checks": checks})
