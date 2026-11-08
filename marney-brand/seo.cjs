'use strict';
// Public-domain SEO guard. Does not change stored application files, sessions or data.
const ORIGIN = 'https://marketmarney.com';
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
  if (pathname === '/' || pathname === '/index.html') {
    result = result.replace(/https:\/\/marketmarney\.com\/index\.html(?=["'])/gi, ORIGIN + '/');
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
module.exports = {ORIGIN, ROBOTS, isPublicHost, isPublicPage, patchHtml, clearBlockingHeader, sendRobots};
