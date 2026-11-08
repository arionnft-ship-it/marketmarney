'use strict';
// Optional Google Analytics 4 instrumentation for public pages only.
// Never modifies the mounted website, account pages, or existing page content.
const MARKER = 'mm-ga4-v1';

function measurementId(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return /^G-[A-Z0-9]{6,20}$/.test(normalized) ? normalized : null;
}

function publicPage(path) {
  if (typeof path !== 'string') return false;
  const urlPath = path.split(/[?#]/, 1)[0];
  if (!urlPath.startsWith('/') || urlPath.includes('..')) return false;
  if (urlPath === '/' || urlPath === '/index.html') return true;
  if (/^\/berita\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)?\/?$/i.test(urlPath)) return true;
  if (!/^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.html$/i.test(urlPath)) return false;
  if (/(?:^|\/)(?:admin|akun|login|auth|account|profile|profil|settings|pengaturan|signup|register|registrasi|reset|verify|verification|password|checkout|payment|private|monitor|dashboard|editor|upload|internal|callback)(?:[./_-]|$)/i.test(urlPath)) return false;
  return true;
}

function injectGoogleTag(html, path, rawMeasurementId) {
  const id = measurementId(rawMeasurementId);
  if (!id || !publicPage(path) || typeof html !== 'string') return html;
  if (!/<html\b/i.test(html) || !/<\/head\s*>/i.test(html)) return html;
  if (html.includes('id="' + MARKER + '"') || /googletagmanager\.com\/gtag\/js/i.test(html)) return html;
  const tag = '<script async src="https://www.googletagmanager.com/gtag/js?id=' + id + '" data-mm-ga4="v1"></script>' +
    '<script id="' + MARKER + '">window.dataLayer=window.dataLayer||[];' +
    'function gtag(){dataLayer.push(arguments);}' +
    "gtag('js',new Date());gtag('config','" + id + "',{allow_google_signals:false,allow_ad_personalization_signals:false});</script>";
  return html.replace(/<head\b([^>]*)>/i, match => match + tag);
}
module.exports = {MARKER, measurementId, publicPage, injectGoogleTag};
