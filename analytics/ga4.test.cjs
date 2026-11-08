'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {measurementId, publicPage, injectGoogleTag, MARKER} = require('./ga4.cjs');
const {patch, BEFORE, AFTER} = require('./install.cjs');
const original = '<!doctype html><html lang="id"><head><meta charset="utf-8"><title>MarketMarney</title></head><body><p>Artikel asli</p></body></html>';

test('GA4 is strictly opt-in by validated G- measurement ID', () => {
  assert.equal(measurementId(null), null);
  assert.equal(measurementId('G-ABC1234'), 'G-ABC1234');
  assert.equal(measurementId(' g-AbC1234 '), 'G-ABC1234');
  for (const value of ['G-', 'G-ABC<script>', 'AW-1234567', 'G-ABC DEF', 'javascript:alert(1)']) {
    assert.equal(measurementId(value), null, value);
    assert.equal(injectGoogleTag(original, '/', value), original);
  }
  assert.equal(injectGoogleTag(original, '/', undefined), original);
});

test('public pages only, never admin/auth/account/private or API', () => {
  for (const path of ['/', '/index.html', '/berita/mm-editorial-123/artikel-emas', '/beranda-trader.html', '/assets/xau-war-3d.html']) {
    assert.equal(publicPage(path), true, path);
  }
  for (const path of ['/api/content', '/api/analytics', '/login.html', '/admin.html', '/akun.html', '/auth/callback.html', '/profil.html', '/settings.html', '/assets/private-arena.html', '/berita/../../admin.html', '/_railway/health', '/favicon.ico']) {
    assert.equal(publicPage(path), false, path);
    assert.equal(injectGoogleTag(original, path, 'G-ABC1234'), original, path);
  }
});

test('GA4 script is nonvisual, added once to head while preserving the original document', () => {
  const actual = injectGoogleTag(original, '/berita/mm-editorial-123/artikel-emas', 'G-ABC1234');
  assert.match(actual, /<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-ABC1234"/);
  assert.match(actual, new RegExp('id="' + MARKER + '"'));
  assert.match(actual, /allow_ad_personalization_signals:false/);
  assert.match(actual, /<title>MarketMarney<\/title>/);
  assert.match(actual, /<p>Artikel asli<\/p>/);
  assert.equal(injectGoogleTag(actual, '/', 'G-ABC1234'), actual);
  assert.equal(injectGoogleTag(original.replace('</head>', ''), '/', 'G-ABC1234'), original.replace('</head>', ''));
  const tagged = original.replace('<title>', '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ANOTHER"></script><title>');
  assert.equal(injectGoogleTag(tagged, '/', 'G-ABC1234'), tagged);
});

test('image-local installer is deterministic, idempotent and fails closed if the wrapper changes', () => {
  const source = "'use strict';\nconst sample=()=>{const data=Buffer.from('test'),raw=data.toString('utf8')," + BEFORE + ';return out;};\n';
  const result = patch(source);
  assert.match(result, /const mmGA4=require/);
  assert.ok(result.includes(AFTER));
  assert.equal(patch(result), result);
  assert.throws(() => patch("'use strict';\nfunction fail() {}"), /anchor changed/);
});
