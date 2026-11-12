#!/usr/bin/env python3
"""Stability upgrade for Marney Android without changing its visual interface."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
GRADLE = ROOT / "app/build.gradle"
MARKER = "MARNEY_ANDROID_V4_1_STABLE_UI_PRESERVED"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


source = MAIN.read_text(encoding="utf-8")
if MARKER not in source:
    source = replace_once(
        source,
        "import android.content.ActivityNotFoundException;\n",
        "import android.content.ActivityNotFoundException;\nimport android.content.ClipData;\n",
        "ClipData import",
    )
    source = replace_once(
        source,
        "import android.os.Environment;\n",
        "import android.os.Environment;\nimport android.os.SystemClock;\n",
        "SystemClock import",
    )
    source = replace_once(
        source,
        "import android.view.ViewGroup;\n",
        "import android.view.ViewGroup;\nimport android.view.WindowManager;\n",
        "WindowManager import",
    )
    source = replace_once(
        source,
        "import android.webkit.PermissionRequest;\n",
        "import android.webkit.PermissionRequest;\nimport android.webkit.RenderProcessGoneDetail;\n",
        "renderer import",
    )

    source = replace_once(
        source,
        '    private static final String APP_BUILD = "MARNEY_ANDROID_V4_UI_PRESERVED";\n',
        '    private static final String APP_BUILD = "MARNEY_ANDROID_V4_1_STABLE_UI_PRESERVED";\n',
        "build marker",
    )
    source = replace_once(
        source,
        "    private static final long MAX_UPLOAD_BYTES = 100L * 1024L * 1024L;\n",
        "    private static final long MAX_UPLOAD_BYTES = 100L * 1024L * 1024L;\n"
        "    private static final long DOWNLOAD_DEBOUNCE_MS = 1500L;\n"
        "    private static final long RENDERER_RECOVERY_WINDOW_MS = 5000L;\n"
        "    private static final String STATE_TAB = \"mm.state.tab\";\n"
        "    private static final String STATE_WEB_MODE = \"mm.state.web.mode\";\n"
        "    private static final String STATE_WEB_URL = \"mm.state.web.url\";\n"
        "    private static final String STATE_WEB_TITLE = \"mm.state.web.title\";\n"
        "    private static final String STATE_WEB_BUNDLE = \"mm.state.web.bundle\";\n",
        "stability constants",
    )
    source = replace_once(
        source,
        "    private String pendingDownloadMime;\n"
        "    private int tab = NAV_HOME;\n"
        "    private boolean webMode = false;\n",
        "    private String pendingDownloadMime;\n"
        "    private String currentWebTitle = \"\";\n"
        "    private String currentWebUrl = \"\";\n"
        "    private Bundle pendingWebState;\n"
        "    private boolean rendererRecovering = false;\n"
        "    private long lastRendererRecoveryAt = 0L;\n"
        "    private long lastDownloadAt = 0L;\n"
        "    private String lastDownloadUrl = \"\";\n"
        "    private int tab = NAV_HOME;\n"
        "    private boolean webMode = false;\n",
        "stability fields",
    )

    source = replace_once(
        source,
        "        navigate(NAV_HOME);\n"
        "    }\n\n"
        "    private void buildHeader() {",
        "        if (savedInstanceState != null) {\n"
        "            int restoredTab = savedInstanceState.getInt(STATE_TAB, NAV_HOME);\n"
        "            tab = Math.max(NAV_HOME, Math.min(NAV_ACCOUNT, restoredTab));\n"
        "            boolean restoreWeb = savedInstanceState.getBoolean(STATE_WEB_MODE, false);\n"
        "            if (restoreWeb) {\n"
        "                currentWebTitle = savedInstanceState.getString(\n"
        "                        STATE_WEB_TITLE, \"MarketMarney\");\n"
        "                currentWebUrl = trustedMarketMarneyUrl(\n"
        "                        savedInstanceState.getString(STATE_WEB_URL, BASE));\n"
        "                pendingWebState = savedInstanceState.getBundle(STATE_WEB_BUNDLE);\n"
        "                drawBottomBar();\n"
        "                showWeb(currentWebTitle, currentWebUrl);\n"
        "            } else {\n"
        "                navigate(tab);\n"
        "            }\n"
        "        } else {\n"
        "            navigate(NAV_HOME);\n"
        "        }\n"
        "    }\n\n"
        "    private void buildHeader() {",
        "state restoration",
    )

    source = replace_once(
        source,
        "    private void clearContent() {\n"
        "        if (pendingPermissionRequest != null) {",
        "    private void clearContent() {\n"
        "        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);\n"
        "        CookieManager.getInstance().flush();\n"
        "        if (fileCallback != null) {\n"
        "            fileCallback.onReceiveValue(null);\n"
        "            fileCallback = null;\n"
        "        }\n"
        "        if (pendingPermissionRequest != null) {",
        "content cleanup",
    )

    source = replace_once(
        source,
        "    private boolean isTrustedMarketMarney(Uri uri) {\n"
        "        if (uri == null || !\"https\".equalsIgnoreCase(uri.getScheme())) return false;\n"
        "        String host = uri.getHost();\n"
        "        return \"marketmarney.com\".equalsIgnoreCase(host) ||\n"
        "                \"www.marketmarney.com\".equalsIgnoreCase(host);\n"
        "    }\n",
        "    private boolean isTrustedMarketMarney(Uri uri) {\n"
        "        if (uri == null || !\"https\".equalsIgnoreCase(uri.getScheme())) return false;\n"
        "        String host = uri.getHost();\n"
        "        return \"marketmarney.com\".equalsIgnoreCase(host) ||\n"
        "                \"www.marketmarney.com\".equalsIgnoreCase(host);\n"
        "    }\n\n"
        "    private String trustedMarketMarneyUrl(String candidate) {\n"
        "        try {\n"
        "            Uri uri = Uri.parse(candidate == null ? BASE : candidate);\n"
        "            return isTrustedMarketMarney(uri) ? uri.toString() : BASE;\n"
        "        } catch (Exception ignored) {\n"
        "            return BASE;\n"
        "        }\n"
        "    }\n",
        "trusted URL helper",
    )

    source = replace_once(
        source,
        "    private boolean uploadsFitLimit(Uri[] uris) {\n"
        "        if (uris == null) return true;\n"
        "        for (Uri uri : uris) {\n"
        "            long bytes = contentLength(uri);\n"
        "            if (bytes > MAX_UPLOAD_BYTES) return false;\n"
        "        }\n"
        "        return true;\n"
        "    }\n",
        "    private boolean uploadsFitLimit(Uri[] uris) {\n"
        "        if (uris == null) return true;\n"
        "        for (Uri uri : uris) {\n"
        "            long bytes = contentLength(uri);\n"
        "            if (bytes > MAX_UPLOAD_BYTES) return false;\n"
        "        }\n"
        "        return true;\n"
        "    }\n\n"
        "    private Uri[] collectSelectedUris(Intent data) {\n"
        "        if (data == null) return null;\n"
        "        List<Uri> selected = new ArrayList<>();\n"
        "        ClipData clip = data.getClipData();\n"
        "        if (clip != null) {\n"
        "            for (int i = 0; i < clip.getItemCount(); i++) {\n"
        "                Uri uri = clip.getItemAt(i).getUri();\n"
        "                if (uri != null && !selected.contains(uri)) selected.add(uri);\n"
        "            }\n"
        "        } else if (data.getData() != null) {\n"
        "            selected.add(data.getData());\n"
        "        } else {\n"
        "            Uri[] parsed = WebChromeClient.FileChooserParams.parseResult(RESULT_OK, data);\n"
        "            if (parsed != null) {\n"
        "                for (Uri uri : parsed) {\n"
        "                    if (uri != null && !selected.contains(uri)) selected.add(uri);\n"
        "                }\n"
        "            }\n"
        "        }\n"
        "        int takeFlags = data.getFlags() &\n"
        "                (Intent.FLAG_GRANT_READ_URI_PERMISSION |\n"
        "                        Intent.FLAG_GRANT_WRITE_URI_PERMISSION);\n"
        "        if ((data.getFlags() & Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION) != 0) {\n"
        "            for (Uri uri : selected) {\n"
        "                try {\n"
        "                    getContentResolver().takePersistableUriPermission(uri, takeFlags);\n"
        "                } catch (Exception ignored) {\n"
        "                }\n"
        "            }\n"
        "        }\n"
        "        return selected.isEmpty() ? null : selected.toArray(new Uri[0]);\n"
        "    }\n",
        "robust chooser result",
    )

    source = replace_once(
        source,
        "        if (!\"https\".equalsIgnoreCase(uri.getScheme())) {\n"
        "            Toast.makeText(this, \"Unduhan tidak aman diblokir\", Toast.LENGTH_LONG).show();\n"
        "            return;\n"
        "        }\n",
        "        if (!\"https\".equalsIgnoreCase(uri.getScheme())) {\n"
        "            Toast.makeText(this, \"Unduhan tidak aman diblokir\", Toast.LENGTH_LONG).show();\n"
        "            return;\n"
        "        }\n"
        "        long now = SystemClock.elapsedRealtime();\n"
        "        if (url.equals(lastDownloadUrl) && now - lastDownloadAt < DOWNLOAD_DEBOUNCE_MS) {\n"
        "            return;\n"
        "        }\n"
        "        lastDownloadUrl = url;\n"
        "        lastDownloadAt = now;\n",
        "download debounce",
    )

    source = replace_once(
        source,
        "    private void showWeb(String title, String path) {\n"
        "        clearContent();\n"
        "        webMode = true;\n"
        "        LinearLayout panel = vertical();",
        "    private void showWeb(String title, String path) {\n"
        "        clearContent();\n"
        "        webMode = true;\n"
        "        currentWebTitle = (title == null || title.trim().isEmpty())\n"
        "                ? \"MarketMarney\" : title;\n"
        "        String requested = path != null && path.startsWith(\"https://\")\n"
        "                ? path : BASE + (path == null ? \"\" : path);\n"
        "        String targetUrl = trustedMarketMarneyUrl(requested);\n"
        "        currentWebUrl = targetUrl;\n"
        "        if (targetUrl.contains(\"/live.html\") || targetUrl.contains(\"/start-stream\")) {\n"
        "            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);\n"
        "        }\n"
        "        LinearLayout panel = vertical();",
        "web state setup",
    )

    source = replace_once(
        source,
        "        browser.setLayerType(View.LAYER_TYPE_HARDWARE, null);\n\n"
        "        WebSettings setting = browser.getSettings();",
        "        browser.setLayerType(View.LAYER_TYPE_HARDWARE, null);\n"
        "        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n"
        "            browser.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_BOUND, true);\n"
        "        }\n\n"
        "        WebSettings setting = browser.getSettings();",
        "renderer priority",
    )

    source = source.replace("MarketMarneyAndroid/4.0 AppShell", "MarketMarneyAndroid/4.1 AppShell", 1)
    source = source.replace("\"version:'4.0',\"", "\"version:'4.1',\"", 1)
    source = source.replace(
        "'mm_app_client','android-native-v4-ui-preserved'",
        "'mm_app_client','android-native-v4.1-stable-ui-preserved'",
        1,
    )

    source = replace_once(
        source,
        "            public void onPageFinished(WebView view, String url) {\n"
        "                progress.setVisibility(View.GONE);\n"
        "                CookieManager.getInstance().flush();",
        "            public void onPageFinished(WebView view, String url) {\n"
        "                progress.setVisibility(View.GONE);\n"
        "                rendererRecovering = false;\n"
        "                if (url != null) currentWebUrl = trustedMarketMarneyUrl(url);\n"
        "                CookieManager.getInstance().flush();",
        "page state tracking",
    )

    source = replace_once(
        source,
        "            public void onReceivedError(\n"
        "                    WebView view, WebResourceRequest request, WebResourceError error) {\n"
        "                if (request.isForMainFrame()) {\n"
        "                    progress.setVisibility(View.GONE);\n"
        "                    Toast.makeText(\n"
        "                            MainActivity.this,\n"
        "                            \"Halaman belum dapat dibuka. Periksa koneksi, lalu tekan Muat Ulang.\",\n"
        "                            Toast.LENGTH_LONG\n"
        "                    ).show();\n"
        "                }\n"
        "            }\n"
        "        });",
        "            public void onReceivedError(\n"
        "                    WebView view, WebResourceRequest request, WebResourceError error) {\n"
        "                if (request.isForMainFrame()) {\n"
        "                    progress.setVisibility(View.GONE);\n"
        "                    Toast.makeText(\n"
        "                            MainActivity.this,\n"
        "                            \"Halaman belum dapat dibuka. Periksa koneksi, lalu tekan Muat Ulang.\",\n"
        "                            Toast.LENGTH_LONG\n"
        "                    ).show();\n"
        "                }\n"
        "            }\n\n"
        "            @Override\n"
        "            public boolean onRenderProcessGone(\n"
        "                    WebView view, RenderProcessGoneDetail detail) {\n"
        "                if (rendererRecovering) return true;\n"
        "                rendererRecovering = true;\n"
        "                String restoreTitle = currentWebTitle.isEmpty()\n"
        "                        ? \"MarketMarney\" : currentWebTitle;\n"
        "                String restoreUrl = trustedMarketMarneyUrl(\n"
        "                        view.getUrl() == null ? currentWebUrl : view.getUrl());\n"
        "                long now = SystemClock.elapsedRealtime();\n"
        "                boolean repeated = now - lastRendererRecoveryAt <\n"
        "                        RENDERER_RECOVERY_WINDOW_MS;\n"
        "                lastRendererRecoveryAt = now;\n"
        "                if (browser == view) browser = null;\n"
        "                ViewGroup parent = (ViewGroup) view.getParent();\n"
        "                if (parent != null) parent.removeView(view);\n"
        "                view.destroy();\n"
        "                content.removeAllViews();\n"
        "                webMode = false;\n"
        "                if (repeated) {\n"
        "                    rendererRecovering = false;\n"
        "                    navigate(tab);\n"
        "                } else {\n"
        "                    runOnUiThread(() -> {\n"
        "                        rendererRecovering = false;\n"
        "                        showWeb(restoreTitle, restoreUrl);\n"
        "                    });\n"
        "                }\n"
        "                return true;\n"
        "            }\n"
        "        });",
        "renderer recovery",
    )

    source = replace_once(
        source,
        "        webPanel.addView(browser, new FrameLayout.LayoutParams(-1, -1));\n"
        "        browser.loadUrl(BASE + path);\n",
        "        webPanel.addView(browser, new FrameLayout.LayoutParams(-1, -1));\n"
        "        Bundle restoreState = pendingWebState;\n"
        "        pendingWebState = null;\n"
        "        if (restoreState == null || browser.restoreState(restoreState) == null) {\n"
        "            browser.loadUrl(targetUrl);\n"
        "        }\n",
        "web state restore",
    )

    source = replace_once(
        source,
        "            Uri[] uris = resultCode == RESULT_OK\n"
        "                    ? WebChromeClient.FileChooserParams.parseResult(resultCode, data)\n"
        "                    : null;",
        "            Uri[] uris = resultCode == RESULT_OK\n"
        "                    ? collectSelectedUris(data)\n"
        "                    : null;",
        "chooser result collection",
    )

    source = replace_once(
        source,
        "    @Override\n"
        "    public void onBackPressed() {",
        "    @Override\n"
        "    protected void onSaveInstanceState(Bundle outState) {\n"
        "        outState.putInt(STATE_TAB, tab);\n"
        "        outState.putBoolean(STATE_WEB_MODE, webMode);\n"
        "        if (webMode && browser != null) {\n"
        "            String url = browser.getUrl();\n"
        "            outState.putString(STATE_WEB_URL,\n"
        "                    trustedMarketMarneyUrl(url == null ? currentWebUrl : url));\n"
        "            outState.putString(STATE_WEB_TITLE, currentWebTitle);\n"
        "            Bundle webState = new Bundle();\n"
        "            if (browser.saveState(webState) != null) {\n"
        "                outState.putBundle(STATE_WEB_BUNDLE, webState);\n"
        "            }\n"
        "        }\n"
        "        super.onSaveInstanceState(outState);\n"
        "    }\n\n"
        "    @Override\n"
        "    protected void onPause() {\n"
        "        if (browser != null) browser.onPause();\n"
        "        CookieManager.getInstance().flush();\n"
        "        super.onPause();\n"
        "    }\n\n"
        "    @Override\n"
        "    protected void onResume() {\n"
        "        super.onResume();\n"
        "        if (browser != null) browser.onResume();\n"
        "    }\n\n"
        "    @Override\n"
        "    public void onBackPressed() {",
        "lifecycle persistence",
    )

    source = replace_once(
        source,
        "        clearPendingDownload();\n"
        "        clearContent();\n",
        "        clearPendingDownload();\n"
        "        pendingWebState = null;\n"
        "        clearContent();\n",
        "destroy cleanup",
    )

    MAIN.write_text(source, encoding="utf-8")

    gradle = GRADLE.read_text(encoding="utf-8")
    gradle = replace_once(gradle, "versionCode 6", "versionCode 7", "version code")
    gradle = replace_once(
        gradle, "versionName '4.0.1-beta'", "versionName '4.1.0-beta'", "version name"
    )
    GRADLE.write_text(gradle, encoding="utf-8")

print({"marneyAndroidV41Patched": True, "uiChanged": False, "marker": MARKER})
