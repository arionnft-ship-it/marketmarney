#!/usr/bin/env python3
"""Isolate API 26 WebView renderer recovery without changing Marney UI."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
MARKER = "MARNEY_ANDROID_V4_1_API26_ISOLATED"

source = MAIN.read_text(encoding="utf-8")
if MARKER not in source:
    insert_anchor = (
        "    /** Opens a MarketMarney page inside the app while preserving the original interface. */\n"
    )
    if insert_anchor not in source:
        raise RuntimeError("API 26 isolation: showWeb anchor missing")

    clients = r'''    // MARNEY_ANDROID_V4_1_API26_ISOLATED
    private class MarketMarneyWebViewClient extends WebViewClient {
        private final ProgressBar progress;
        private final String pageTitle;

        MarketMarneyWebViewClient(ProgressBar progress, String pageTitle) {
            this.progress = progress;
            this.pageTitle = pageTitle;
        }

        @Override
        public boolean shouldOverrideUrlLoading(
                WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isTrustedMarketMarney(uri)) return false;
            String scheme = uri == null ? null : uri.getScheme();
            if ("https".equalsIgnoreCase(scheme) ||
                    "http".equalsIgnoreCase(scheme) ||
                    "mailto".equalsIgnoreCase(scheme) ||
                    "tel".equalsIgnoreCase(scheme)) {
                openExternal(uri);
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progress.setVisibility(View.GONE);
            rendererRecovering = false;
            if (url != null) currentWebUrl = trustedMarketMarneyUrl(url);
            CookieManager.getInstance().flush();
            if (url != null && url.startsWith(BASE)) {
                view.evaluateJavascript(
                        "try{" +
                        "window.MarketMarneyApp={" +
                        "platform:'android'," +
                        "version:'4.1'," +
                        "maxUploadBytes:104857600," +
                        "ui:'preserved'};" +
                        "localStorage.setItem(" +
                        "'mm_app_client','android-native-v4.1-stable-ui-preserved')" +
                        "}catch(e){}",
                        null
                );
                if ("Kalender Ekonomi".equals(pageTitle)) {
                    view.evaluateJavascript(
                            "try{if(typeof go==='function')" +
                            "go('Kalender Ekonomi')}catch(e){}",
                            null
                    );
                } else if ("MarketMarney TV".equals(pageTitle)) {
                    view.evaluateJavascript(
                            "try{if(typeof go==='function')" +
                            "go('MarketMarney TV')}catch(e){}",
                            null
                    );
                }
            }
        }

        @Override
        public void onReceivedError(
                WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                progress.setVisibility(View.GONE);
                Toast.makeText(
                        MainActivity.this,
                        "Halaman belum dapat dibuka. Periksa koneksi, lalu tekan Muat Ulang.",
                        Toast.LENGTH_LONG
                ).show();
            }
        }
    }

    /** Loaded only on Android 8.0+, where RenderProcessGoneDetail exists. */
    private final class RendererAwareWebViewClient extends MarketMarneyWebViewClient {
        RendererAwareWebViewClient(ProgressBar progress, String pageTitle) {
            super(progress, pageTitle);
        }

        @Override
        public boolean onRenderProcessGone(
                WebView view, RenderProcessGoneDetail detail) {
            if (rendererRecovering) return true;
            rendererRecovering = true;
            String restoreTitle = currentWebTitle.isEmpty()
                    ? "MarketMarney" : currentWebTitle;
            String restoreUrl = trustedMarketMarneyUrl(
                    view.getUrl() == null ? currentWebUrl : view.getUrl());
            long now = SystemClock.elapsedRealtime();
            boolean repeated = now - lastRendererRecoveryAt <
                    RENDERER_RECOVERY_WINDOW_MS;
            lastRendererRecoveryAt = now;
            if (browser == view) browser = null;
            ViewGroup parent = (ViewGroup) view.getParent();
            if (parent != null) parent.removeView(view);
            view.destroy();
            content.removeAllViews();
            webMode = false;
            if (repeated) {
                rendererRecovering = false;
                navigate(tab);
            } else {
                runOnUiThread(() -> {
                    rendererRecovering = false;
                    showWeb(restoreTitle, restoreUrl);
                });
            }
            return true;
        }
    }

    private WebViewClient createWebViewClient(
            ProgressBar progress, String pageTitle) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return new RendererAwareWebViewClient(progress, pageTitle);
        }
        return new MarketMarneyWebViewClient(progress, pageTitle);
    }

'''
    source = source.replace(insert_anchor, clients + insert_anchor, 1)

    start_marker = "        browser.setWebViewClient(new WebViewClient() {"
    end_marker = "        browser.setWebChromeClient(new WebChromeClient() {"
    start = source.find(start_marker)
    end = source.find(end_marker, start + 1)
    if start < 0 or end < 0:
        raise RuntimeError("API 26 isolation: WebViewClient block missing")
    source = (
        source[:start]
        + "        browser.setWebViewClient(createWebViewClient(progress, title));\n\n"
        + source[end:]
    )

checks = {
    "isolation marker": MARKER in source,
    "base client": "class MarketMarneyWebViewClient extends WebViewClient" in source,
    "api26 client": "class RendererAwareWebViewClient extends MarketMarneyWebViewClient" in source,
    "runtime gate": "Build.VERSION.SDK_INT >= Build.VERSION_CODES.O" in source,
    "client factory": "browser.setWebViewClient(createWebViewClient(progress, title));" in source,
    "no direct anonymous callback": "browser.setWebViewClient(new WebViewClient()" not in source,
    "single render callback": source.count("onRenderProcessGone(") == 1,
    "balanced braces": source.count("{") == source.count("}"),
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("API 26 isolation failed: " + ", ".join(failed))

MAIN.write_text(source, encoding="utf-8")
print({"marneyApi26Isolated": True, "uiChanged": False, "checks": checks})
