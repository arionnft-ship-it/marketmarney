'use strict';
// Public-domain SEO guard. Does not change stored application files, sessions or data.
const ORIGIN = 'https://marketmarney.com';
const BRAND_RELEASE = 'marney-20261109-r3';
const GOOGLE_SITE_VERIFICATION = 'CxKqw5ml8va-XZ5WcsNCuYCKPCJjnSsf3F6dhGNp5ZU';
const ROBOTS = [
  'User-agent: *',
  'Disallow: /api/',
  'Disallow: /auth/',
  'Disallow: /admin/',
  'Disallow: /akun.html',
  'Disallow: /beranda-trader.html',
  'Allow: /',
  'Sitemap: ' + ORIGIN + '/sitemap.xml',
  ''
].join('\n');

const BRAND_HEAD = [
  '<link rel="icon" type="image/png" sizes="64x64" href="/favicon.png?v=' + BRAND_RELEASE + '" data-marney-seo-icon="' + BRAND_RELEASE + '">',
  '<link rel="icon" href="/favicon.ico?v=' + BRAND_RELEASE + '" sizes="any" data-marney-seo-icon="' + BRAND_RELEASE + '">',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=' + BRAND_RELEASE + '" data-marney-seo-icon="' + BRAND_RELEASE + '">',
  '<meta name="theme-color" content="#000000" data-marney-seo-icon="' + BRAND_RELEASE + '">',
  '<script type="application/ld+json" data-marney-organization="' + BRAND_RELEASE + '">' + JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MarketMarney',
    url: ORIGIN + '/',
    logo: ORIGIN + '/assets/brand-logo.png?v=' + BRAND_RELEASE
  }).replace(/</g, '\\u003c') + '</script>'
].join('');

function isPublicHost(host) {
  const value = String(host || '').trim().toLowerCase().replace(/:\d+$/, '');
  return value === 'marketmarney.com' || value === 'www.marketmarney.com';
}
function isPublicPage(req, pathname) {
  if (!req || req.method !== 'GET' || !isPublicHost(req.headers && req.headers.host)) return false;
  return pathname === '/' || pathname === '/index.html' || pathname === '/about.html' ||
    /^\/berita\/[a-z0-9-]+\/[a-z0-9-]+\/?$/i.test(pathname);
}
function patchHtml(html, pathname, enabled) {
  if (!enabled || typeof html !== 'string' || !/<html\b/i.test(html)) return html;
  let result = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const match = tag.match(/\bname\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const name = (match && (match[1] || match[2] || match[3]) || '').toLowerCase();
    if (name !== 'robots' && name !== 'googlebot') return tag;
    return tag.replace(/\bcontent\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, 'content="index, follow, max-image-preview:large"');
  });

  // Replace every prior favicon declaration so crawlers see one unambiguous current brand icon.
  result = result
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["'](?:shortcut\s+)?icon["'])[^>]*>/gi, '')
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["']apple-touch-icon(?:-precomposed)?["'])[^>]*>/gi, '')
    .replace(/<meta\b(?=[^>]*\bname\s*=\s*["']theme-color["'])[^>]*>/gi, '')
    .replace(/<script\b(?=[^>]*\bdata-marney-organization=)[\s\S]*?<\/script>/gi, '');

  if (pathname === '/' || pathname === '/index.html') {
    result = result.replace(/https:\/\/marketmarney\.com\/index\.html(?=["'])/gi, ORIGIN + '/');
    if (!/\bname\s*=\s*["']google-site-verification["']/i.test(result)) {
      const tag = '<meta name="google-site-verification" content="' + GOOGLE_SITE_VERIFICATION + '">';
      if (/<\/head\s*>/i.test(result)) result = result.replace(/<\/head\s*>/i, tag + '</head>');
    }
  }

  if (!result.includes('data-marney-seo-icon="' + BRAND_RELEASE + '"')) {
    if (/<\/head\s*>/i.test(result)) result = result.replace(/<\/head\s*>/i, BRAND_HEAD + '</head>');
    else result = BRAND_HEAD + result;
  }
  return result;
}
function clearBlockingHeader(res) {
  if (/\b(?:noindex|none|nosnippet)\b/i.test(String(res.getHeader('x-robots-tag') || ''))) {
    res.removeHeader('x-robots-tag');
  }
}
function sendRobots(req, res) {
  if (!['GET','HEAD'].includes(req.method)) {
    res.writeHead(405, {'Allow': 'GET, HEAD', 'Cache-Control': 'no-store'});
    res.end();
    return true;
  }
  const body = Buffer.from(ROBOTS, 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': body.length
  });
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}
module.exports = {ORIGIN, BRAND_RELEASE, BRAND_HEAD, GOOGLE_SITE_VERIFICATION, ROBOTS, isPublicHost, isPublicPage, patchHtml, clearBlockingHeader, sendRobots};
