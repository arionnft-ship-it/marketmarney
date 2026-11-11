#!/usr/bin/env python3
"""Apply the Live Marney camera/microphone integration to the Android shell.

The patch is exact-anchor, idempotent, and runs only in the APK build workspace.
It does not touch accounts, credentials, or production data.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / "app/src/main/AndroidManifest.xml"
MAIN = ROOT / "app/src/main/java/com/marketmarney/mobile/MainActivity.java"
GRADLE = ROOT / "app/build.gradle"
MARKER = "LIVE_MARNEY_ANDROID_V1"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


manifest = MANIFEST.read_text(encoding="utf-8")
if 'android.permission.CAMERA' not in manifest:
    manifest = replace_once(
        manifest,
        '    <uses-permission android:name="android.permission.INTERNET" />',
        '    <uses-permission android:name="android.permission.INTERNET" />\n'
        '    <uses-permission android:name="android.permission.CAMERA" />\n'
        '    <uses-permission android:name="android.permission.RECORD_AUDIO" />',
        "manifest permissions",
    )
MANIFEST.write_text(manifest, encoding="utf-8")

source = MAIN.read_text(encoding="utf-8")
if MARKER not in source:
    source = replace_once(source, 'import android.app.Activity;\n', 'import android.app.Activity;\nimport android.Manifest;\n', 'Manifest import')
    source = replace_once(source, 'import android.content.Intent;\n', 'import android.content.Intent;\nimport android.content.pm.PackageManager;\n', 'PackageManager import')
    source = replace_once(source, 'import android.os.Bundle;\n', 'import android.os.Bundle;\nimport android.os.Build;\n', 'Build import')
    source = replace_once(source, 'import android.webkit.CookieManager;\n', 'import android.webkit.CookieManager;\nimport android.webkit.PermissionRequest;\n', 'PermissionRequest import')
    source = replace_once(
        source,
        '    private static final int REQUEST_PICK_FILE = 40;\n',
        '    private static final int REQUEST_PICK_FILE = 40;\n'
        '    private static final int REQUEST_MEDIA_PERMISSION = 41; // LIVE_MARNEY_ANDROID_V1\n',
        "request constants",
    )
    source = replace_once(
        source,
        '    private ValueCallback<Uri[]> fileCallback;\n',
        '    private ValueCallback<Uri[]> fileCallback;\n'
        '    private PermissionRequest pendingPermissionRequest;\n',
        "permission request field",
    )
    source = replace_once(
        source,
        '        linkCard(page, "LINIMASA", "Beranda Trader",\n',
        '        linkCard(page, "LIVE", "Live Marney",\n'
        '                "Siaran langsung analisis, edukasi, atau diskusi market dengan kamera dan mikrofon.", "Buka Live",\n'
        '                () -> showWeb("Live Marney", "/live.html"));\n'
        '        linkCard(page, "LINIMASA", "Beranda Trader",\n',
        "Social Live card",
    )
    source = replace_once(
        source,
        '        setting.setJavaScriptEnabled(true);\n',
        '        setting.setJavaScriptEnabled(true);\n'
        '        setting.setMediaPlaybackRequiresUserGesture(false);\n',
        "WebView media setting",
    )
    chrome_anchor = '''        browser.setWebChromeClient(new WebChromeClient() {\n            @Override public void onProgressChanged(WebView view, int amount) {'''
    chrome_replacement = '''        browser.setWebChromeClient(new WebChromeClient() {\n            @Override public void onPermissionRequest(PermissionRequest request) {\n                runOnUiThread(() -> {\n                    Uri origin = request.getOrigin();\n                    String host = origin == null ? null : origin.getHost();\n                    if (origin == null || !"https".equalsIgnoreCase(origin.getScheme()) ||\n                            !("marketmarney.com".equalsIgnoreCase(host) || "www.marketmarney.com".equalsIgnoreCase(host))) {\n                        request.reject();\n                        return;\n                    }\n                    boolean wantsCamera = false, wantsAudio = false;\n                    for (String resource : request.getResources()) {\n                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) wantsCamera = true;\n                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) wantsAudio = true;\n                    }\n                    if (!wantsCamera && !wantsAudio) { request.reject(); return; }\n                    boolean cameraMissing = wantsCamera && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&\n                            checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED;\n                    boolean audioMissing = wantsAudio && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&\n                            checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED;\n                    if (cameraMissing || audioMissing) {\n                        if (pendingPermissionRequest != null) pendingPermissionRequest.reject();\n                        pendingPermissionRequest = request;\n                        List<String> needed = new ArrayList<>();\n                        if (cameraMissing) needed.add(Manifest.permission.CAMERA);\n                        if (audioMissing) needed.add(Manifest.permission.RECORD_AUDIO);\n                        requestPermissions(needed.toArray(new String[0]), REQUEST_MEDIA_PERMISSION);\n                    } else {\n                        grantWebMediaPermission(request);\n                    }\n                });\n            }\n            @Override public void onPermissionRequestCanceled(PermissionRequest request) {\n                if (pendingPermissionRequest == request) pendingPermissionRequest = null;\n            }\n            @Override public void onProgressChanged(WebView view, int amount) {'''
    source = replace_once(source, chrome_anchor, chrome_replacement, "WebChrome permission handler")

    activity_anchor = '''    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {'''
    activity_replacement = '''    private void grantWebMediaPermission(PermissionRequest request) {\n        if (request == null) return;\n        List<String> allowed = new ArrayList<>();\n        for (String resource : request.getResources()) {\n            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource) &&\n                    (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)) {\n                allowed.add(resource);\n            }\n            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource) &&\n                    (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED)) {\n                allowed.add(resource);\n            }\n        }\n        if (allowed.isEmpty()) request.reject();\n        else request.grant(allowed.toArray(new String[0]));\n    }\n\n    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {\n        super.onRequestPermissionsResult(requestCode, permissions, grantResults);\n        if (requestCode != REQUEST_MEDIA_PERMISSION) return;\n        PermissionRequest request = pendingPermissionRequest;\n        pendingPermissionRequest = null;\n        if (request != null) {\n            grantWebMediaPermission(request);\n            boolean denied = false;\n            for (int result : grantResults) if (result != PackageManager.PERMISSION_GRANTED) denied = true;\n            if (denied) Toast.makeText(this, "Izin kamera dan mikrofon diperlukan untuk memulai Live.", Toast.LENGTH_LONG).show();\n        }\n    }\n\n    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {'''
    source = replace_once(source, activity_anchor, activity_replacement, "runtime permission result")
    source = replace_once(
        source,
        '    @Override protected void onDestroy() {\n        if (fileCallback != null) fileCallback.onReceiveValue(null);\n',
        '    @Override protected void onDestroy() {\n'
        '        if (pendingPermissionRequest != null) { pendingPermissionRequest.reject(); pendingPermissionRequest = null; }\n'
        '        if (fileCallback != null) fileCallback.onReceiveValue(null);\n',
        "destroy permission cleanup",
    )
MAIN.write_text(source, encoding="utf-8")

gradle = GRADLE.read_text(encoding="utf-8")
gradle = gradle.replace("versionCode 3", "versionCode 4")
gradle = gradle.replace("versionName '3.0.0-beta'", "versionName '3.1.0-live-beta'")
GRADLE.write_text(gradle, encoding="utf-8")

checks = {
    "camera permission": 'android.permission.CAMERA' in manifest,
    "audio permission": 'android.permission.RECORD_AUDIO' in manifest,
    "live card": '"Live Marney", "/live.html"' in source,
    "web permission": 'onPermissionRequest(PermissionRequest request)' in source,
    "runtime permission": 'REQUEST_MEDIA_PERMISSION' in source,
    "version": "versionName '3.1.0-live-beta'" in gradle,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise RuntimeError("Live Android patch validation failed: " + ", ".join(failed))
print({"liveMarneyAndroidPatched": True, "checks": checks})
