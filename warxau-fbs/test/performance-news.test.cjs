'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const { transformHomeHtml, MARKER } = require('../performance-news.cjs');

// Public, pre-change bundles captured from the deployed website on 2026-11-08.
// Executing the real renderer/search code catches integration regressions that
// a test of replacement strings alone would not detect. No live API is used.
const core = fs.readFileSync(path.join(__dirname, 'fixtures/home-core-before-performance.js'), 'utf8');
const searchBundle = fs.readFileSync(path.join(__dirname, 'fixtures/news-search1879.js'), 'utf8');
const before = '<!doctype html><html><head></head><body><script>' + core + '</script></body></html>';
const after = transformHomeHtml(before);
const patchedCore = after.match(/<script>([\s\S]*)<\/script>/)[1];

function article(index, extra = {}) {
  return {
    id: '00000000-0000-4000-8000-' + index.toString(16).padStart(12, '0'),
    title: 'Berita uji ' + index,
    desc: 'Ringkasan artikel ' + index,
    cat: index % 2 ? 'SAHAM' : 'FOREX',
    status: 'published',
    body: 'Isi artikel uji ' + index,
    bodyHtml: '<p>Isi artikel uji ' + index + '</p>',
    img: '/media/00000000-0000-4000-8000-' + index.toString(16).padStart(12, '0') + '.png',
    date: '2026-11-08T00:00:00.000Z',
    ...extra,
  };
}

function payload(items) {
  return { articles: items, forums: ['Diskusi Saham'], videos: [], communityLinks: {}, publishedPivots: {} };
}

function createApp(hash = '', stored = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM('<!doctype html><html><body><aside id="sidebar"><nav id="nav"></nav></aside><button id="mobileToggle">Menu</button><div id="toplabel"></div><div id="ticker"></div><time id="clock"></time><main id="app"></main></body></html>', {
    url: 'https://marketmarney.com/index.html' + hash,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  const requests = [];
  const timeouts = new Map();
  let timerId = 0;
  window.console.error = error => errors.push(error);
  window.console.warn = () => {};
  window.scrollTo = () => {};
  window.requestAnimationFrame = () => 1;
  window.setInterval = () => 1;
  window.setTimeout = (fn, delay) => { const id = ++timerId; timeouts.set(id, { fn, delay }); return id; };
  window.clearTimeout = id => timeouts.delete(id);
  window.MMTheme1867 = { get: () => 'dark' };
  window.MMTicker1873 = { mount: () => {} };
  window.AbortController = AbortController;
  window.fetch = (url, options) => new Promise((resolve, reject) => {
    const request = { url, options, resolve, reject };
    requests.push(request);
    options.signal.addEventListener('abort', () => {
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  });
  for (const [key, value] of Object.entries(stored)) window.localStorage.setItem(key, value);
  window.eval(searchBundle);
  window.eval(patchedCore);
  return {
    window,
    document: window.document,
    requests,
    timeouts,
    errors,
    close: () => window.close(),
    async respond(data, index = requests.length - 1) {
      requests[index].resolve({ ok: true, json: async () => data });
      await new Promise(resolve => setImmediate(resolve));
    },
    async settle() { await new Promise(resolve => setImmediate(resolve)); },
    nav(name) { window.document.querySelector('.navbtn[data-page="' + name + '"]').click(); },
  };
}

test('the complete public script remains syntactically valid and transforms atomically', () => {
  assert.notEqual(after, before);
  assert.ok(after.includes(MARKER));
  assert.doesNotThrow(() => new vm.Script(patchedCore));
  assert.equal(transformHomeHtml(after), after);
  const altered = before.replace('const newsSearchIndex=', 'const futureNewsSearchIndex=');
  assert.equal(transformHomeHtml(altered), altered, 'an unsupported bundle must not receive half a patch');
  assert.equal(transformHomeHtml('<html><script>window.other = 1;</script></html>'), '<html><script>window.other = 1;</script></html>');
});

test('navigation is usable while the content request is pending; admin/local cached drafts stay hidden', async t => {
  const app = createApp('', {
    mm_pro_articles: JSON.stringify([article(90, { title: 'PRIVATE DRAFT SHOULD NEVER FLASH', status: 'draft' })]),
    mm_tv_videos_v1: JSON.stringify([{ id: 'private-video', title: 'PRIVATE VIDEO SHOULD NEVER FLASH', status: 'draft' }]),
    mm_pro_forums: '{invalid legacy JSON',
  });
  t.after(app.close);
  assert.equal(app.document.querySelectorAll('#nav .navbtn').length, 10);
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].url, '/api/content');
  assert.equal(app.requests[0].options.credentials, 'omit');
  assert.ok(!app.document.body.textContent.includes('PRIVATE'));
  app.nav('Berita');
  assert.ok(app.document.querySelector('#search'));
  assert.match(app.document.querySelector('#newsList').textContent, /Memuat berita/);
  assert.equal(app.document.querySelector('#newsList').getAttribute('aria-busy'), 'true');
  app.nav('Utilities');
  assert.ok(app.document.querySelector('#balance'), 'other menus must not wait for content');
  app.nav('MarketMarney TV');
  assert.ok(!app.document.body.textContent.includes('PRIVATE VIDEO'));
  assert.deepEqual(app.errors, []);
});

test('fresh public data rebuilds search and preserves typing, categories, pagination, and article navigation', async t => {
  const app = createApp('#berita');
  t.after(app.close);
  const search = app.document.querySelector('#search');
  search.value = 'uniknugroho';
  search.focus();
  search.dispatchEvent(new app.window.Event('input', { bubbles: true }));
  const items = Array.from({ length: 30 }, (_, index) => article(index + 1));
  items[17].body = 'kata uniknugroho pada badan artikel';
  items.push(article(901, { title: 'PRIVATE DRAFT SHOULD NEVER FLASH', status: 'draft' }));
  items.push(article(902, { title: 'PRIVATE REVIEW SHOULD NEVER FLASH', status: 'review' }));
  await app.respond(payload(items));
  assert.equal(app.document.querySelector('#search').value, 'uniknugroho');
  assert.equal(app.document.activeElement.id, 'search');
  assert.equal(app.document.querySelectorAll('#newsList .card').length, 1);
  assert.match(app.document.querySelector('#newsList').textContent, /Berita uji 18/);
  assert.ok(!app.document.body.textContent.includes('PRIVATE'));
  assert.equal(app.document.querySelector('#newsList').getAttribute('aria-busy'), 'false');
  const cached = JSON.parse(app.window.localStorage.getItem('mm_pro_articles'));
  assert.equal(cached.length, 30);
  assert.ok(cached.every(item => item.status === 'published'));
  app.document.querySelector('#mm147Reset').click();
  assert.equal(app.document.querySelectorAll('#newsList .card').length, 12);
  app.document.querySelector('#mm1814-more').click();
  assert.equal(app.document.querySelectorAll('#newsList .card').length, 24);
  app.document.querySelector('[data-news-cat="SAHAM"]').click();
  assert.match(app.document.querySelector('#newsCount').textContent, /dari 15 artikel/);
  assert.ok([...app.document.querySelectorAll('#newsList .badge')].every(element => element.textContent === 'SAHAM'));
  const selectedCard = app.document.querySelector('#newsList .card');
  const id = selectedCard.dataset.id;
  selectedCard.click();
  assert.equal(app.window.location.hash, '#artikel/' + id);
  assert.ok(app.document.querySelector('.article .articletext'));
  const image = app.document.querySelector('.article .cardimg img');
  assert.ok(image.getAttribute('src').startsWith('/assets/news-thumb-v1/1280/'));
  assert.equal(image.getAttribute('loading'), 'eager');
  assert.equal(image.parentElement.style.backgroundImage, 'none');
  app.document.querySelector('.article [data-page="Berita"]').click();
  assert.ok(app.document.querySelector('#search'));
  assert.deepEqual(app.errors, []);
});

test('the home carousel renders only six cards, with lazy responsive image elements and no duplicate backgrounds', async t => {
  const app = createApp();
  t.after(app.close);
  await app.respond(payload(Array.from({ length: 30 }, (_, index) => article(index + 1))));
  assert.equal(app.document.querySelectorAll('.news-carousel .card').length, 6);
  assert.equal(app.document.querySelectorAll('.news-carousel .news-set[aria-hidden="true"]').length, 0);
  assert.equal(app.document.querySelectorAll('.mm90-featured .mm90-feature').length, 3);
  for (const image of app.document.querySelectorAll('.news-carousel .cardimg img')) {
    assert.equal(image.getAttribute('loading'), 'lazy');
    assert.match(image.getAttribute('src'), /^\/assets\/news-thumb-v1\/640\/.*\.png$/);
    assert.match(image.getAttribute('srcset'), /640w, .*1280w$/);
    assert.equal(image.parentElement.style.backgroundImage, 'none');
  }
  for (const photo of app.document.querySelectorAll('.mm90-photo')) assert.equal(photo.style.backgroundImage, 'none');
  assert.match(app.document.querySelector('#headlineCarousel').getAttribute('style'), /\/assets\/news-thumb-v1\/1280\//);
  app.document.querySelector('.sectionhead [data-page="Berita"]').click();
  assert.match(app.document.querySelector('#newsCount').textContent, /dari 30 artikel/);
  assert.deepEqual(app.errors, []);
});

test('image optimization applies only to canonical local public image paths and keeps fallback/escaping', async t => {
  const app = createApp('#berita');
  t.after(app.close);
  await app.respond(payload([
    article(1, { img: 'https://marketmarney.com/media/00000000-0000-4000-8000-000000000001.jpeg', title: '"><script>bad()</script>' }),
    article(2, { img: 'https://images.example.org/news.png' }),
    article(3, { img: 'data:image/png;base64,AAAA' }),
    article(4, { img: 'stocks' }),
    article(5, { img: '/media/../secret.png' }),
  ]));
  const image1 = app.document.querySelector('[data-id="' + article(1).id + '"] img');
  assert.match(image1.getAttribute('src'), /^\/assets\/news-thumb-v1\/640\//);
  assert.equal(image1.dataset.mmOriginalSrc, 'https://marketmarney.com/media/00000000-0000-4000-8000-000000000001.jpeg');
  assert.equal(app.document.querySelector('[data-id="' + article(2).id + '"] img').getAttribute('src'), 'https://images.example.org/news.png');
  assert.equal(app.document.querySelector('[data-id="' + article(3).id + '"] img').getAttribute('src'), 'data:image/png;base64,AAAA');
  assert.match(app.document.querySelector('[data-id="' + article(4).id + '"] .cardimg').style.backgroundImage, /linear-gradient/);
  assert.equal(app.document.querySelector('[data-id="' + article(5).id + '"] img'), null);
  assert.equal(app.document.querySelector('#app script'), null);
  assert.deepEqual(app.errors, []);
});

test('an article deep link waits for fresh data without a false not-found flash', async t => {
  const wanted = article(17);
  const app = createApp('#artikel/' + wanted.id);
  t.after(app.close);
  assert.match(app.document.querySelector('#app').textContent, /Memuat berita/);
  assert.ok(!app.document.querySelector('#app').textContent.includes('Artikel tidak tersedia'));
  await app.respond(payload([wanted]));
  assert.equal(app.document.querySelector('.article h1').textContent, wanted.title);
  assert.equal(app.window.location.hash, '#artikel/' + wanted.id);
  assert.deepEqual(app.errors, []);
});

test('a deep-linked draft is never rendered, even from an old admin cache', async t => {
  const draft = article(99, { status: 'draft', title: 'SECRET DRAFT TEXT' });
  const app = createApp('#artikel/' + draft.id, { mm_pro_articles: JSON.stringify([draft]) });
  t.after(app.close);
  assert.ok(!app.document.body.textContent.includes('SECRET'));
  await app.respond(payload([draft, article(1)]));
  assert.match(app.document.querySelector('.article h1').textContent, /Artikel tidak tersedia/);
  assert.ok(!app.document.body.textContent.includes('SECRET'));
  assert.deepEqual(app.errors, []);
});

test('late content does not take the user back to a deep link they already left', async t => {
  const wanted = article(17);
  const app = createApp('#artikel/' + wanted.id);
  t.after(app.close);
  app.nav('Berita');
  assert.equal(app.window.location.hash, '');
  await app.respond(payload([wanted]));
  assert.ok(app.document.querySelector('#search'));
  assert.equal(app.document.querySelector('.article h1'), null);
  assert.deepEqual(app.errors, []);
});

test('a hung request times out without blocking navigation and the visible retry succeeds', async t => {
  const app = createApp('#berita');
  t.after(app.close);
  const timeout = [...app.timeouts.values()].find(entry => entry.delay === 8000);
  assert.ok(timeout);
  timeout.fn();
  await app.settle();
  assert.equal(app.requests[0].options.signal.aborted, true);
  assert.match(app.document.querySelector('#newsList').textContent, /Konten belum dapat dimuat/);
  app.nav('Utilities');
  assert.ok(app.document.querySelector('#balance'));
  app.nav('Berita');
  app.document.querySelector('[data-mm-perf-retry]').click();
  assert.equal(app.requests.length, 2);
  assert.match(app.document.querySelector('#newsList').textContent, /Memuat berita/);
  await app.respond(payload([article(1)]));
  assert.equal(app.document.querySelectorAll('#newsList .card').length, 1);
  assert.equal(app.document.querySelector('[data-mm-perf-retry]'), null);
  assert.equal(app.timeouts.size, 0);
  assert.deepEqual(app.errors, []);
});

test('invalid API data remains an error and never falls back to stale unpublished content', async t => {
  const app = createApp('#berita', { mm_pro_articles: JSON.stringify([article(6, { title: 'STALE PRIVATE', status: 'draft' })]) });
  t.after(app.close);
  await app.respond({ articles: null });
  assert.match(app.document.querySelector('#newsList').textContent, /Konten belum dapat dimuat/);
  assert.equal(app.document.querySelectorAll('#newsList .card').length, 0);
  assert.ok(!app.document.body.textContent.includes('STALE PRIVATE'));
  assert.deepEqual(app.errors, []);
});

test('storage quota failures cannot turn a valid public response into a broken page', async t => {
  const app = createApp('#berita');
  t.after(app.close);
  const proto = Object.getPrototypeOf(app.window.localStorage);
  proto.setItem = () => { throw new Error('QuotaExceededError'); };
  await app.respond(payload([article(1)]));
  assert.equal(app.document.querySelectorAll('#newsList .card').length, 1);
  assert.deepEqual(app.errors, []);
});


test('API-published paragraphs render as real paragraphs and headings, not literal <p> text', async t => {
  const story = article(701, {
    bodyHtml: null,
    title: 'Demokrat Siap Blokir Anggaran Militer Trump US$1,5 Triliun',
    body: '<p>MarketMarney — Perdebatan anggaran militer AS kembali memanas.</p>' +
      '<p>Apa yang diusulkan pemerintahan Trump?</p>' +
      '<p>Anggaran yang direncanakan mencapai US$1,5 triliun dan masih menjadi usulan.</p>' +
      '<p>Kesimpulan</p><p>Negosiasi anggaran masih berlangsung.</p>'
  });
  const app = createApp('#artikel/' + story.id);
  t.after(app.close);
  await app.respond(payload([story]));
  const body = app.document.querySelector('.article .articletext');
  assert.ok(body);
  assert.equal(body.querySelectorAll('p').length, 3);
  assert.deepEqual([...body.querySelectorAll('h2')].map(el => el.textContent),
    ['Apa yang diusulkan pemerintahan Trump?', 'Kesimpulan']);
  assert.equal(body.textContent.includes('<p>'), false);
  assert.match(body.textContent, /US\$1,5 triliun/);
  assert.deepEqual(app.errors, []);
});

test('plain text remains escaped, uses readable line breaks and cannot inject HTML', async t => {
  const story = article(702, { bodyHtml: null,
    body: 'Paragraf pertama tentang pasar dan data.\n\nParagraf kedua di bawahnya.\nBaris berikutnya.'
  });
  const app = createApp('#artikel/' + story.id);
  t.after(app.close);
  await app.respond(payload([story]));
  const body = app.document.querySelector('.article .articletext');
  assert.equal(body.querySelectorAll('p').length, 2);
  assert.equal(body.querySelectorAll('br').length, 1);
  assert.match(body.textContent, /Paragraf kedua/);
  assert.deepEqual(app.errors, []);
});

test('legacy HTML is sanitized and does not execute injected scripts or image handlers', async t => {
  const story = article(703, { bodyHtml: null,
    body: '<p>Ini teks <strong>aman</strong>.</p><script>window.mmHacked=1</script>' +
      '<p><img src="javascript:alert(1)" onerror="window.mmHacked=2"> Selesai.</p>'
  });
  const app = createApp('#artikel/' + story.id);
  t.after(app.close);
  await app.respond(payload([story]));
  const body = app.document.querySelector('.article .articletext');
  assert.equal(body.querySelectorAll('script, img, [onerror]').length, 0);
  assert.equal(app.window.mmHacked, undefined);
  assert.match(body.textContent, /Ini teks aman/);
  assert.deepEqual(app.errors, []);
});
