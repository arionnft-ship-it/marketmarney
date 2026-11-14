package com.marketmarney.mobile;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import java.util.ArrayList;
import java.util.List;

/** One Android runtime dialog can serve only the currently visible Live document. */
final class LiveCapture {
    static final int MEDIA_REQUEST = 839;
    private final Activity activity;
    private PermissionRequest pending;
    private WebView owner;
    private boolean systemDialog;

    LiveCapture(Activity activity) {
        this.activity = activity;
    }

    static boolean hostPage(String url) {
        if (!Recovery414.trusted(url)) return false;
        Uri page = Uri.parse(url);
        return "/live.html".equals(page.getEncodedPath()) && !page.getQueryParameterNames().contains("watch");
    }

    private static String androidPermission(String resource) {
        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) return Manifest.permission.CAMERA;
        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) return Manifest.permission.RECORD_AUDIO;
        return null;
    }

    private boolean eligible(WebView source, WebView active, PermissionRequest request) {
        return source != null && source == active && source.isShown() &&
                hostPage(source.getUrl()) && request.getOrigin() != null &&
                Recovery414.trusted(request.getOrigin().toString());
    }

    void request(WebView source, WebView active, PermissionRequest request) {
        if (systemDialog || !eligible(source, active, request)) {
            request.deny();
            return;
        }
        List<String> missing = new ArrayList<>(2);
        for (String resource : request.getResources()) {
            String permission = androidPermission(resource);
            if (permission != null && activity.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED &&
                    !missing.contains(permission)) missing.add(permission);
        }
        if (missing.isEmpty()) {
            grant(request);
            return;
        }
        owner = source;
        pending = request;
        systemDialog = true;
        try {
            activity.requestPermissions(missing.toArray(new String[0]), MEDIA_REQUEST);
        } catch (RuntimeException unavailable) {
            systemDialog = false;
            invalidate(source);
        }
    }

    void result(WebView active) {
        systemDialog = false;
        PermissionRequest request = pending;
        WebView source = owner;
        pending = null;
        owner = null;
        if (request == null) return;
        if (eligible(source, active, request)) grant(request); else request.deny();
    }

    private void grant(PermissionRequest request) {
        List<String> allowed = new ArrayList<>(2);
        for (String resource : request.getResources()) {
            String permission = androidPermission(resource);
            if (permission == null) continue;
            if (activity.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
                request.deny();
                return;
            }
            allowed.add(resource);
        }
        if (allowed.isEmpty()) request.deny(); else request.grant(allowed.toArray(new String[0]));
    }

    void canceled(PermissionRequest request) {
        if (pending == request) {
            pending = null;
            owner = null;
        }
    }

    void invalidate(WebView source) {
        if (source != null && source == owner && pending != null) {
            PermissionRequest request = pending;
            canceled(request);
            request.deny();
        }
    }
}
