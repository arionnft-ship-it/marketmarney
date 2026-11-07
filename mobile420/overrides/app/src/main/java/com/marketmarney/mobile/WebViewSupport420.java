package com.marketmarney.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Looper;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.WeakHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Native compatibility gate for a positively identified old engine; unknown engines proceed. */
public final class WebViewSupport420 {
    // Group client uses Object.hasOwn without a polyfill (Chromium 93 minimum).
    // This is a minimum engine check, not a guarantee that every feature is supported.
    public static final int MINIMUM_MAJOR = 93;
    public static final String UPDATE_URL = "https://play.google.com/store/apps/details?id=com.google.android.webview";
    public static final String BROWSER_URL = "https://marketmarney.com";
    private static final Set<String> STORE_PROVIDERS = new HashSet<>(Arrays.asList(
            "com.google.android.webview", "com.google.android.webview.beta",
            "com.google.android.webview.dev", "com.google.android.webview.canary",
            "com.android.chrome", "com.chrome.beta", "com.chrome.dev", "com.chrome.canary"));
    private static final Pattern VERSION = Pattern.compile("^([1-9][0-9]{0,3})(?:\\.[0-9]{1,10}){0,3}(?:[-+][A-Za-z0-9.-]{1,32})?$");
    private static final Pattern CHROME = Pattern.compile("(?:^|[\\s(])Chrome/([1-9][0-9]{0,3}(?:\\.[0-9]{1,10}){1,3})(?=$|[\\s;)])");
    private static final WeakHashMap<Activity, Boolean> PROMPTED = new WeakHashMap<>();

    public enum Status { SUPPORTED, UPDATE_REQUIRED, UNKNOWN }
    public enum Source { WEBVIEW_PACKAGE, USER_AGENT, UNKNOWN }

    public static final class Result {
        public final Status status;
        public final Source source;
        public final int major;
        public final String version;
        public final String providerPackage;

        private Result(int major, String version, Source source, String providerPackage) {
            this.major = major;
            this.version = version;
            this.source = source;
            this.providerPackage = providerPackage;
            this.status = major < 0 ? Status.UNKNOWN
                    : major < MINIMUM_MAJOR ? Status.UPDATE_REQUIRED : Status.SUPPORTED;
        }

        public boolean requiresUpdate() { return status == Status.UPDATE_REQUIRED; }
    }

    private WebViewSupport420() {}

    public static int parsePackageMajor(String raw) {
        if (raw == null) return -1;
        Matcher match = VERSION.matcher(raw.trim());
        if (!match.matches()) return -1;
        try { return Integer.parseInt(match.group(1)); }
        catch (NumberFormatException ignored) { return -1; }
    }

    /** Package metadata is authoritative; use the Chrome token only as a fallback. */
    public static Result fromVersions(String packageVersion, String userAgent) {
        return fromProvider(null, packageVersion, userAgent);
    }

    public static Result fromProvider(String provider, String packageVersion, String userAgent) {
        String name = provider != null && provider.length() <= 200
                && provider.matches("[A-Za-z][A-Za-z0-9_]*(?:\\.[A-Za-z0-9_]+)+") ? provider : "";
        int major = parsePackageMajor(packageVersion);
        if (major >= 0) return new Result(major, packageVersion.trim(), Source.WEBVIEW_PACKAGE, name);
        if (userAgent != null) {
            Matcher match = CHROME.matcher(userAgent);
            if (match.find()) {
                String version = match.group(1);
                major = parsePackageMajor(version);
                if (major >= 0) return new Result(major, version, Source.USER_AGENT, name);
            }
        }
        return new Result(-1, "", Source.UNKNOWN, name);
    }

    /** Call on the Activity UI thread. It never constructs a WebView or loads a page. */
    public static Result detect(Context context) {
        String packageVersion = null, provider = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                PackageInfo info = WebView.getCurrentWebViewPackage();
                if (info != null) { packageVersion = info.versionName; provider = info.packageName; }
            } catch (RuntimeException | LinkageError ignored) { }
        }
        Result known = fromProvider(provider, packageVersion, null);
        if (known.status != Status.UNKNOWN) return known;
        String agent = null;
        if (context != null) {
            try { agent = WebSettings.getDefaultUserAgent(context); }
            catch (RuntimeException | LinkageError ignored) { }
        }
        return fromProvider(provider, packageVersion, agent);
    }

    public static Intent updateIntent() {
        return updateIntent(null);
    }

    public static Intent updateIntent(Result result) {
        String provider = result == null ? "" : result.providerPackage;
        String url = STORE_PROVIDERS.contains(provider)
                ? "https://play.google.com/store/apps/details?id=" + provider : UPDATE_URL;
        return new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE);
    }

    public static Intent browserIntent() {
        return new Intent(Intent.ACTION_VIEW, Uri.parse(BROWSER_URL)).addCategory(Intent.CATEGORY_BROWSABLE);
    }

    public static String instructions(Result result) {
        String detected = result == null || result.status == Status.UNKNOWN
                ? "Versi komponen tampilan web belum terdeteksi."
                : "Perangkat ini memakai WebView " + result.version + " (Chromium " + result.major + ").";
        return detected + " Beberapa fitur MARNEY memerlukan versi " + MINIMUM_MAJOR + " atau lebih baru.\n\n"
                + "Perbarui Android System WebView atau Chrome yang digunakan perangkat ini, lalu buka Marney kembali.\n\n"
                + "Anda juga dapat membuka MARNEY di browser yang sudah diperbarui.";
    }

    /**
     * Returns true for a known unsupported engine: caller MUST return before creating
     * or loading page WebViews. Unknown/supported engines return false. A true return
     * still gates subsequent calls when this Activity already has its native dialog.
     */
    public static boolean showIfNeeded(Activity activity) {
        if (activity == null) return false;
        return showIfNeeded(activity, detect(activity));
    }

    public static boolean showIfNeeded(Activity activity, Result result) {
        if (activity == null || result == null || !result.requiresUpdate()) return false;
        if (activity.isFinishing() || activity.isDestroyed()) return true;
        if (Looper.myLooper() != Looper.getMainLooper()) {
            activity.runOnUiThread(() -> showIfNeeded(activity, result));
            return true;
        }
        synchronized (PROMPTED) {
            if (PROMPTED.containsKey(activity)) return true;
            PROMPTED.put(activity, Boolean.TRUE);
        }
        try {
            AlertDialog prompt = new AlertDialog.Builder(activity)
                    .setTitle("Perbarui komponen tampilan web")
                    .setMessage(instructions(result))
                    .setPositiveButton("Perbarui komponen", null)
                    .setNeutralButton("Buka di browser", null)
                    .setNegativeButton("Tutup", (dialog, which) -> activity.finish())
                    .setCancelable(false)
                    .create();
            prompt.setCanceledOnTouchOutside(false);
            prompt.show();
            // AlertDialog normally dismisses a clicked button automatically. Keep
            // this gate visible when no external activity can handle the action.
            prompt.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
                if (open(activity, updateIntent(result))) { prompt.dismiss(); activity.finish(); }
            });
            prompt.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(view -> {
                if (open(activity, browserIntent())) { prompt.dismiss(); activity.finish(); }
            });
            return true;
        } catch (RuntimeException ignored) {
            // Never continue into unsupported page code if the window is closing.
            synchronized (PROMPTED) { PROMPTED.remove(activity); }
            activity.finish();
            return true;
        }
    }

    private static boolean open(Activity activity, Intent destination) {
        try { activity.startActivity(destination); return true; }
        catch (ActivityNotFoundException | SecurityException ignored) {
            Toast.makeText(activity, "Buka Play Store untuk memperbarui komponen, atau gunakan browser yang sudah diperbarui di marketmarney.com.", Toast.LENGTH_LONG).show();
            return false;
        }
    }
}
