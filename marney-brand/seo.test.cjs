'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const seo = require('./seo.cjs');
const page = (path, host = 'marketmarney.com', method = 'GET') => ({method, headers: {host}, url:path});
test('only the real public domain is eligible; staging is not', () => {
  assert.equal(seo.isPublicPage(page('/'), '/'), true);
  assert.equal(seo.isPublicPage(page('/berita/id-123/berita-emas'), '/berita/id-123/berita-emas'), true);
  assert.equal(seo.isPublicPage(page('/about.html'), '/about.html'), true);
  assert.equal(seo.isPublicPage(page('/', 'marketmarney-web-staging.up.railway.app'), '/'), false);
  assert.equal(seo.isPublicPage(page('/api/content'), '/api/content'), false);
  assert.equal(seo.isPublicPage(page('/akun.html'), '/akun.html'), false);
  assert.equal(seo.isPublicPage(page('/admin.html'), '/admin.html'), false);
});
test('robots allow public crawling, deny non-public routes and list sitemap', () => {
  assert.ok(!seo.ROBOTS.includes('Disallow: /\n'));
  assert.match(seo.ROBOTS, /Disallow: \/api\//);
  assert.match(seo.ROBOTS, /Sitemap: https:\/\/marketmarney\.com\/sitemap\.xml/);
});
test('public homepage removes noindex and corrects index.html canonical', () => {
  const html = '<html><head><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="https://marketmarney.com/index.html"><meta property="og:url" content="https://marketmarney.com/index.html"></head><body>hi</body></html>';
  const out = seo.patchHtml(html, '/', true);
  assert.match(out, /content="index, follow, max-image-preview:large"/);
  assert.ok(!out.includes('noindex'));
  assert.ok(!out.includes('/index.html"'));
  assert.match(out, /rel="canonical" href="https:\/\/marketmarney\.com\/"/);
  assert.equal(seo.patchHtml(html, '/', false), html);
});
test('published news can be indexed without modifying content', () => {
  const html = "<html><head><meta content='noindex,nofollow' name='robots'></head><body><article>Berita tetap utuh</article></body></html>";
  const out = seo.patchHtml(html, '/berita/abc-123/berita', true);
  assert.ok(!out.includes('noindex'));
  assert.match(out, /<article>Berita tetap utuh<\/article>/);
});
test('remove only blocking X-Robots-Tag header', () => {
  let header = 'noindex, nofollow';
  const res = {getHeader() {return header;}, removeHeader() {header = undefined;}};
  seo.clearBlockingHeader(res);
  assert.equal(header, undefined);
  header = 'max-image-preview:large';
  seo.clearBlockingHeader(res);
  assert.equal(header, 'max-image-preview:large');
});
test('robots HEAD has headers and no body', () => {
  let status, headers, body;
  const res = {writeHead(s, h){status=s;headers=h;}, end(b){body=b;}};
  seo.sendRobots(page('/robots.txt', 'marketmarney.com', 'HEAD'), res);
  assert.equal(status,200);
  assert.equal(headers['Content-Type'],'text/plain; charset=utf-8');
  assert.equal(body, undefined);
});
