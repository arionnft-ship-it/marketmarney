package com.marketmarney.mobile;

import android.net.Uri;
import android.webkit.MimeTypeMap;
import java.util.ArrayList;
import java.util.Locale;

/** Chooses the Android photo picker directly for user media uploads. */
final class DirectGallery424 {
    private DirectGallery424() {}

    private static String path(String url) {
        try {
            Uri uri = Uri.parse(url);
            if (!"https".equalsIgnoreCase(uri.getScheme()) ||
                    !"marketmarney.com".equalsIgnoreCase(uri.getHost()) ||
                    (uri.getPort() != -1 && uri.getPort() != 443) || uri.getUserInfo() != null) return "";
            return uri.getPath() == null ? "" : uri.getPath();
        } catch (RuntimeException ignored) {
            return "";
        }
    }

    static boolean mediaPage(String url) {
        String path = path(url);
        return "/beranda-trader.html".equals(path) || "/grup-trader.html".equals(path) ||
            "/profil.html".equals(path) || "/akun.html".equals(path);
    }

    private static ArrayList<String> tokens(String[] values) {
        ArrayList<String> result = new ArrayList<>();
        if (values == null) return result;
        for (String group : values) {
            if (group == null) continue;
            for (String raw : group.split(",")) {
                String value = raw.trim().toLowerCase(Locale.ROOT);
                if (value.startsWith(".")) {
                    String mapped = MimeTypeMap.getSingleton().getMimeTypeFromExtension(value.substring(1));
                    if (mapped != null) value = mapped.toLowerCase(Locale.ROOT);
                }
                if (!value.isEmpty()) result.add(value);
            }
        }
        return result;
    }

    private static boolean generic(String[] values) {
        ArrayList<String> valuesList = tokens(values);
        if (valuesList.isEmpty()) return true;
        for (String value : valuesList) if (!"*/*".equals(value)) return false;
        return true;
    }

    static String[] acceptTypes(String url, String[] requested) {
        if (!mediaPage(url) || !generic(requested)) return requested;
        String page = path(url);
        if ("/profil.html".equals(page) || "/akun.html".equals(page)) return new String[]{"image/*"};
        return new String[]{"image/*", "video/*"};
    }

    static boolean direct(String url, String[] accepted) {
        if (!mediaPage(url)) return false;
        ArrayList<String> values = tokens(accepted);
        if (values.isEmpty()) return false;
        boolean visual = false;
        for (String value : values) {
            if (value.startsWith("image/") || value.startsWith("video/")) visual = true;
            else return false;
        }
        return visual;
    }
}
