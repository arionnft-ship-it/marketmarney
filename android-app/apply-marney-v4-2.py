#!/usr/bin/env python3
"""Reliability upgrade for Marney Android without changing its approved interface."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MAIN = ROOT / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
MANIFEST = ROOT / "app/src/main/AndroidManifest.xml"
GRADLE = ROOT / "app/build.gradle"
MARKER = "MARNEY_ANDROID_V4_2_CONNECTIVITY_UPLOAD_SAFE_UI_PRESERVED"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


source = MAIN.read_text(encoding="utf-8")
manifest = MANIFEST.read_text(encoding="utf-8")
gradle = GRADLE.read_text(encoding="utf-8")

if MARKER not in source:
    source = replace_once(
        source,
        "import android.net.Uri;\n",
        "import android.net.ConnectivityManager;\n"
        "import android.net.Network;\n"
        "import android.net.NetworkCapabilities;\n"
        "import android.net.Uri;\n",
        "network imports",
    )

    source = replace_once(
        source,
        '    private static final String APP_BUILD = "MARNEY_ANDROID_V4_1_STABLE_UI_PRESERVED";\n',
        '    private static final String APP_BUILD = "MARNEY_ANDROID_V4_2_CONNECTIVITY_UPLOAD_SAFE_UI_PRESERVED";\n',
        "build marker",
    )
    source = replace_once(
        source,
        "    private static final long RENDERER_RECOVERY_WINDOW_MS = 5000L;\n",
        "    private static final long RENDERER_RECOVERY_WINDOW_MS = 5000L;\n"
        "    private static final long AUTO_RELOAD_DEBOUNCE_MS = 4000L;\n"
        "    private static final long NETWORK_RECHECK_DELAY_MS = 650L;\n",
        "network constants",
    )
    source = replace_once(
        source,
        "    private final ExecutorService io = Executors.newSingleThreadExecutor();\n",
        "    private final ExecutorService io = Executors.newFixedThreadPool(2);\n",
        "background executor",
    )
    source = replace_once(
        source,
        "    private String lastDownloadUrl = \"\";\n"
        "    private int tab = NAV_HOME;\n",
        "    private String lastDownloadUrl = \"\";\n"
        "    private ConnectivityManager connectivityManager;\n"
        "    private ConnectivityManager.NetworkCallback networkCallback;\n"
        "    private boolean networkCallbackRegistered = false;\n"
        "    private boolean mainFrameLoadFailed = false;\n"
        "    private long lastAutoReloadAt = 0L;\n"
        "    private long fileChooserGeneration = 0L;\n"
        "    private int tab = NAV_HOME;\n",
        "network and chooser fields",
    )

    source = replace_once(
        source,
        "        setContentView(root);\n"
        "        buildHeader();\n",
        "        setContentView(root);\n"
        "        connectivityManager = (ConnectivityManager)\n"
        "                getSystemService(Context.CONNECTIVITY_SERVICE);\n"
        "        buildHeader();\n",
        "connectivity manager initialization",
    )

    source = replace_once(
        source,
        "    private void clearContent() {\n"
        "        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);\n",
        "    private void clearContent() {\n"
        "        fileChooserGeneration++;\n"
        "        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);\n",
        "chooser invalidation",
    )

    source = replace_once(
        source,
        "    private String trustedMarketMarneyUrl(String candidate) {\n"
        "        try {\n"
        "            Uri uri = Uri.parse(candidate == null ? BASE : candidate);\n"
        "            return isTrustedMarketMarney(uri) ? uri.toString() : BASE;\n"
        "        } catch (Exception ignored) {\n"
        "            return BASE;\n"
        "        }\n"
        "    }\n\n"
        "    private void openExternal(Uri uri) {",
        "    private String trustedMarketMarneyUrl(String candidate) {\n"
        "        try {\n"
        "            Uri uri = Uri.parse(candidate == null ? BASE : candidate);\n"
        "            return isTrustedMarketMarney(uri) ? uri.toString() : BASE;\n"
        "        } catch (Exception ignored) {\n"
        "            return BASE;\n"
        "        }\n"
        "    }\n\n"
        "    private boolean hasValidatedInternet() {\n"
        "        if (connectivityManager == null) return false;\n"
        "        try {\n"
        "            Network active = connectivityManager.getActiveNetwork();\n"
        "            if (active == null) return false;\n"
        "            NetworkCapabilities capabilities =\n"
        "                    connectivityManager.getNetworkCapabilities(active);\n"
        "            return capabilities != null &&\n"
        "                    capabilities.hasCapability(\n"
        "                            NetworkCapabilities.NET_CAPABILITY_INTERNET) &&\n"
        "                    capabilities.hasCapability(\n"
        "                            NetworkCapabilities.NET_CAPABILITY_VALIDATED);\n"
        "        } catch (RuntimeException ignored) {\n"
        "            return false;\n"
        "        }\n"
        "    }\n\n"
        "    private void dispatchNetworkState(boolean online) {\n"
        "        WebView current = browser;\n"
        "        if (current == null || !webMode) return;\n"
        "        String event = online ? \"online\" : \"offline\";\n"
        "        String script = \"try{window.dispatchEvent(new Event('\" + event + \"'));}catch(e){}\";\n"
        "        current.evaluateJavascript(script, null);\n"
        "    }\n\n"
        "    private void handleNetworkAvailable() {\n"
        "        if (!hasValidatedInternet()) return;\n"
        "        dispatchNetworkState(true);\n"
        "        WebView current = browser;\n"
        "        if (!mainFrameLoadFailed || current == null || !webMode) return;\n"
        "        long now = SystemClock.elapsedRealtime();\n"
        "        if (now - lastAutoReloadAt < AUTO_RELOAD_DEBOUNCE_MS) return;\n"
        "        lastAutoReloadAt = now;\n"
        "        mainFrameLoadFailed = false;\n"
        "        current.reload();\n"
        "    }\n\n"
        "    private void handleNetworkLost() {\n"
        "        if (root == null) return;\n"
        "        root.postDelayed(() -> {\n"
        "            if (!hasValidatedInternet()) dispatchNetworkState(false);\n"
        "        }, NETWORK_RECHECK_DELAY_MS);\n"
        "    }\n\n"
        "    private void registerNetworkCallback() {\n"
        "        if (connectivityManager == null || networkCallbackRegistered) return;\n"
        "        if (networkCallback == null) {\n"
        "            networkCallback = new ConnectivityManager.NetworkCallback() {\n"
        "                @Override\n"
        "                public void onAvailable(Network network) {\n"
        "                    runOnUiThread(() -> handleNetworkAvailable());\n"
        "                }\n\n"
        "                @Override\n"
        "                public void onCapabilitiesChanged(\n"
        "                        Network network, NetworkCapabilities capabilities) {\n"
        "                    if (capabilities.hasCapability(\n"
        "                            NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {\n"
        "                        runOnUiThread(() -> handleNetworkAvailable());\n"
        "                    }\n"
        "                }\n\n"
        "                @Override\n"
        "                public void onLost(Network network) {\n"
        "                    runOnUiThread(() -> handleNetworkLost());\n"
        "                }\n"
        "            };\n"
        "        }\n"
        "        try {\n"
        "            connectivityManager.registerDefaultNetworkCallback(networkCallback);\n"
        "            networkCallbackRegistered = true;\n"
        "        } catch (RuntimeException ignored) {\n"
        "            networkCallbackRegistered = false;\n"
        "        }\n"
        "    }\n\n"
        "    private void unregisterNetworkCallback() {\n"
        "        if (connectivityManager == null || !networkCallbackRegistered ||\n"
        "                networkCallback == null) return;\n"
        "        try {\n"
        "            connectivityManager.unregisterNetworkCallback(networkCallback);\n"
        "        } catch (RuntimeException ignored) {\n"
        "        } finally {\n"
        "            networkCallbackRegistered = false;\n"
        "        }\n"
        "    }\n\n"
        "    private void openExternal(Uri uri) {",
        "connectivity helpers",
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
        "    private long verifiedContentLength(Uri uri) {\n"
        "        long declared = contentLength(uri);\n"
        "        if (declared >= 0L) return declared;\n"
        "        try (InputStream input = getContentResolver().openInputStream(uri)) {\n"
        "            if (input == null) return MAX_UPLOAD_BYTES + 1L;\n"
        "            byte[] buffer = new byte[64 * 1024];\n"
        "            long total = 0L;\n"
        "            int read;\n"
        "            while ((read = input.read(buffer)) != -1) {\n"
        "                total += read;\n"
        "                if (total > MAX_UPLOAD_BYTES) return total;\n"
        "            }\n"
        "            return total;\n"
        "        } catch (Exception ignored) {\n"
        "            return MAX_UPLOAD_BYTES + 1L;\n"
        "        }\n"
        "    }\n\n"
        "    private boolean uploadsFitLimit(Uri[] uris) {\n"
        "        if (uris == null) return true;\n"
        "        for (Uri uri : uris) {\n"
        "            long bytes = verifiedContentLength(uri);\n"
        "            if (bytes > MAX_UPLOAD_BYTES) return false;\n"
        "        }\n"
        "        return true;\n"
        "    }\n",
        "bounded upload size verification",
    )

    source = replace_once(
        source,
        "        public void onPageFinished(WebView view, String url) {\n"
        "            progress.setVisibility(View.GONE);\n",
        "        public void onPageFinished(WebView view, String url) {\n"
        "            progress.setVisibility(View.GONE);\n"
        "            mainFrameLoadFailed = false;\n",
        "page success connectivity state",
    )

    source = replace_once(
        source,
        "            if (request.isForMainFrame()) {\n"
        "                progress.setVisibility(View.GONE);\n"
        "                Toast.makeText(\n",
        "            if (request.isForMainFrame()) {\n"
        "                mainFrameLoadFailed = true;\n"
        "                progress.setVisibility(View.GONE);\n"
        "                Toast.makeText(\n",
        "main frame failure tracking",
    )

    source = replace_once(
        source,
        "        currentWebUrl = targetUrl;\n"
        "        if (targetUrl.contains(\"/live.html\") || targetUrl.contains(\"/start-stream\")) {",
        "        currentWebUrl = targetUrl;\n"
        "        mainFrameLoadFailed = false;\n"
        "        if (targetUrl.contains(\"/live.html\") || targetUrl.contains(\"/start-stream\")) {",
        "new web load connectivity reset",
    )

    source = replace_once(
        source,
        "                if (fileCallback != null) fileCallback.onReceiveValue(null);\n"
        "                fileCallback = callback;\n",
        "                if (fileCallback != null) fileCallback.onReceiveValue(null);\n"
        "                fileChooserGeneration++;\n"
        "                fileCallback = callback;\n",
        "chooser generation start",
    )

    source = replace_once(
        source,
        "    @Override\n"
        "    protected void onActivityResult(int requestCode, int resultCode, Intent data) {\n"
        "        super.onActivityResult(requestCode, resultCode, data);\n"
        "        if (requestCode == REQUEST_PICK_FILE && fileCallback != null) {\n"
        "            Uri[] uris = resultCode == RESULT_OK\n"
        "                    ? collectSelectedUris(data)\n"
        "                    : null;\n"
        "            if (!uploadsFitLimit(uris)) {\n"
        "                Toast.makeText(\n"
        "                        this,\n"
        "                        \"Ukuran maksimal setiap file adalah 100 MB.\",\n"
        "                        Toast.LENGTH_LONG\n"
        "                ).show();\n"
        "                fileCallback.onReceiveValue(null);\n"
        "            } else {\n"
        "                fileCallback.onReceiveValue(uris);\n"
        "            }\n"
        "            fileCallback = null;\n"
        "        }\n"
        "    }\n",
        "    @Override\n"
        "    protected void onActivityResult(int requestCode, int resultCode, Intent data) {\n"
        "        super.onActivityResult(requestCode, resultCode, data);\n"
        "        if (requestCode != REQUEST_PICK_FILE || fileCallback == null) return;\n"
        "        ValueCallback<Uri[]> callback = fileCallback;\n"
        "        fileCallback = null;\n"
        "        long generation = fileChooserGeneration;\n"
        "        Uri[] uris = resultCode == RESULT_OK\n"
        "                ? collectSelectedUris(data)\n"
        "                : null;\n"
        "        if (uris == null) {\n"
        "            callback.onReceiveValue(null);\n"
        "            return;\n"
        "        }\n"
        "        try {\n"
        "            io.execute(() -> {\n"
        "                boolean allowed = uploadsFitLimit(uris);\n"
        "                runOnUiThread(() -> {\n"
        "                    if (generation != fileChooserGeneration ||\n"
        "                            isFinishing() || isDestroyed() || browser == null) {\n"
        "                        callback.onReceiveValue(null);\n"
        "                        return;\n"
        "                    }\n"
        "                    if (!allowed) {\n"
        "                        Toast.makeText(\n"
        "                                this,\n"
        "                                \"Ukuran maksimal setiap file adalah 100 MB.\",\n"
        "                                Toast.LENGTH_LONG\n"
        "                        ).show();\n"
        "                        callback.onReceiveValue(null);\n"
        "                    } else {\n"
        "                        callback.onReceiveValue(uris);\n"
        "                    }\n"
        "                });\n"
        "            });\n"
        "        } catch (RuntimeException ignored) {\n"
        "            callback.onReceiveValue(null);\n"
        "        }\n"
        "    }\n",
        "asynchronous upload validation",
    )

    source = replace_once(
        source,
        "    @Override\n"
        "    protected void onPause() {",
        "    @Override\n"
        "    protected void onStart() {\n"
        "        super.onStart();\n"
        "        registerNetworkCallback();\n"
        "        if (hasValidatedInternet()) handleNetworkAvailable();\n"
        "        else dispatchNetworkState(false);\n"
        "    }\n\n"
        "    @Override\n"
        "    protected void onStop() {\n"
        "        unregisterNetworkCallback();\n"
        "        super.onStop();\n"
        "    }\n\n"
        "    @Override\n"
        "    protected void onPause() {",
        "network lifecycle",
    )

    source = replace_once(
        source,
        "    protected void onDestroy() {\n"
        "        if (fileCallback != null) fileCallback.onReceiveValue(null);\n",
        "    protected void onDestroy() {\n"
        "        unregisterNetworkCallback();\n"
        "        if (fileCallback != null) fileCallback.onReceiveValue(null);\n",
        "network destroy cleanup",
    )

    source = source.replace(
        'MarketMarneyAndroid/4.1 AppShell',
        'MarketMarneyAndroid/4.2 AppShell',
        1,
    )
    source = source.replace(
        '"version:\'4.1\',"',
        '"version:\'4.2\',"',
        1,
    )
    source = source.replace(
        "'mm_app_client','android-native-v4.1-stable-ui-preserved'",
        "'mm_app_client','android-native-v4.2-connectivity-upload-safe-ui-preserved'",
        1,
    )
    source = source.replace(
        'MarketMarneyAndroid/4.0 (NativeDashboard; UI-Preserved)',
        'MarketMarneyAndroid/4.2 (NativeDashboard; UI-Preserved)',
        1,
    )

    MAIN.write_text(source, encoding="utf-8")

if 'android.permission.ACCESS_NETWORK_STATE' not in manifest:
    manifest = replace_once(
        manifest,
        '    <uses-permission android:name="android.permission.INTERNET" />\n',
        '    <uses-permission android:name="android.permission.INTERNET" />\n'
        '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n',
        "network state permission",
    )
if 'android:hardwareAccelerated="true"' not in manifest:
    manifest = replace_once(
        manifest,
        '        android:allowBackup="false"\n',
        '        android:allowBackup="false"\n'
        '        android:hardwareAccelerated="true"\n'
        '        android:enableOnBackInvokedCallback="false"\n',
        "application reliability attributes",
    )
if 'android:configChanges=' not in manifest:
    manifest = replace_once(
        manifest,
        '        <activity android:name=".MainActivity"\n'
        '            android:screenOrientation="unspecified"\n',
        '        <activity android:name=".MainActivity"\n'
        '            android:screenOrientation="unspecified"\n'
        '            android:configChanges="orientation|screenSize|keyboardHidden"\n',
        "rotation stability",
    )
MANIFEST.write_text(manifest, encoding="utf-8")

gradle = gradle.replace("versionCode 7", "versionCode 8", 1)
gradle = gradle.replace("versionName '4.1.0-beta'", "versionName '4.2.0-beta'", 1)
GRADLE.write_text(gradle, encoding="utf-8")

checks = {
    "v4.2 marker": MARKER in source,
    "connectivity callback": "registerDefaultNetworkCallback" in source,
    "validated internet": "NET_CAPABILITY_VALIDATED" in source,
    "automatic reload": "AUTO_RELOAD_DEBOUNCE_MS" in source,
    "bounded upload verification": "verifiedContentLength" in source,
    "async upload validation": "io.execute(() ->" in source and "fileChooserGeneration" in source,
    "fixed worker pool": "Executors.newFixedThreadPool(2)" in source,
    "network permission": "android.permission.ACCESS_NETWORK_STATE" in manifest,
    "rotation preservation": "orientation|screenSize|keyboardHidden" in manifest,
    "hardware acceleration": 'android:hardwareAccelerated="true"' in manifest,
    "legacy back stability": 'android:enableOnBackInvokedCallback="false"' in manifest,
    "version code": "versionCode 8" in gradle,
    "version name": "versionName '4.2.0-beta'" in gradle,
    "balanced braces": source.count("{") == source.count("}"),
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Marney v4.2 transform failed: " + ", ".join(failed))
print({"marneyAndroidV42Patched": True, "uiPreserved": True, "checks": checks})
