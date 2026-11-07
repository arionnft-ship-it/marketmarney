package com.marketmarney.mobile;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.lang.ref.WeakReference;

/** One-way cosmetic bridge: a trusted page may report only light or dark chrome. */
final class ChromeTheme424 {
    interface Listener {
        void onTone(WebView owner, boolean light);
    }

    private static final class Bridge {
        private final WeakReference<WebView> owner;
        private final WeakReference<Listener> listener;

        Bridge(WebView owner, Listener listener) {
            this.owner = new WeakReference<>(owner);
            this.listener = new WeakReference<>(listener);
        }

        @JavascriptInterface public void setTheme(String tone) {
            if (!"light".equals(tone) && !"dark".equals(tone)) return;
            WebView view = owner.get();
            Listener target = listener.get();
            if (view == null || target == null) return;
            boolean light = "light".equals(tone);
            view.post(() -> {
                WebView current = owner.get();
                Listener callback = listener.get();
                if (current != null && callback != null) callback.onTone(current, light);
            });
        }
    }

    private ChromeTheme424() {}

    static void attach(WebView view, Listener listener) {
        if (view == null || listener == null) throw new IllegalArgumentException("Theme bridge requires a WebView and listener");
        view.addJavascriptInterface(new Bridge(view, listener), "MarketMarneyChrome");
    }
}
