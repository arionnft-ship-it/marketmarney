(function () {
  'use strict';
  if (location.protocol !== 'https:' || location.hostname !== 'marketmarney.com' ||
      (location.port && location.port !== '443')) return;
  if (window.MMChrome424) {
    window.MMChrome424.install();
    return;
  }

  var root = document.documentElement;
  var installed = false;
  var observer = null;
  var last = '';

  function normalizedTheme() {
    var keys = ['mmTheme', 'theme', 'traderTheme', 'journalTheme', 'acTheme', 'jTheme', 'colorScheme'];
    for (var i = 0; i < keys.length; i++) {
      var value = root.dataset && root.dataset[keys[i]];
      if (!value) continue;
      value = String(value).toLowerCase();
      if (value.indexOf('dark') !== -1 || value.indexOf('night') !== -1) return 'dark';
      if (value.indexOf('light') !== -1 || value.indexOf('white') !== -1) return 'light';
    }
    return '';
  }

  function rgba(value) {
    var match = String(value || '').match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    var numbers = match[1].match(/[\d.]+/g) || [];
    if (numbers.length < 3) return null;
    var alpha = numbers.length > 3 ? Number(numbers[3]) : 1;
    if (!(alpha > 0.03)) return null;
    return [Number(numbers[0]), Number(numbers[1]), Number(numbers[2])];
  }

  function luminance(rgb) {
    function channel(value) {
      value = value / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
  }

  function tone() {
    if (root.hasAttribute('data-mm46-reels') || location.hash === '#mm44-reels') return 'dark';
    var explicit = normalizedTheme();
    if (explicit) return explicit;
    var nodes = [document.body, document.getElementById('app'), root];
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i]) continue;
      var color = rgba(getComputedStyle(nodes[i]).backgroundColor);
      if (color) return luminance(color) >= 0.48 ? 'light' : 'dark';
    }
    var path = location.pathname;
    if (path === '/beranda-trader.html' || path === '/profil.html' || path === '/grup-trader.html' || path === '/akun.html') return 'light';
    return 'dark';
  }

  function send(force) {
    var current = tone();
    if (!force && current === last) return current;
    last = current;
    try {
      if (window.MarketMarneyChrome && typeof window.MarketMarneyChrome.setTheme === 'function') {
        window.MarketMarneyChrome.setTheme(current);
      }
    } catch (ignored) {}
    return current;
  }

  function install() {
    if (!installed) {
      installed = true;
      observer = new MutationObserver(function () { send(false); });
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-mm-theme', 'data-theme', 'data-trader-theme',
          'data-journal-theme', 'data-ac-theme', 'data-j-theme', 'data-color-scheme', 'data-mm46-reels']
      });
      if (document.body) observer.observe(document.body, {attributes: true, attributeFilter: ['class', 'style']});
      addEventListener('hashchange', function () { send(true); }, {passive: true});
      addEventListener('popstate', function () { send(true); }, {passive: true});
    }
    return send(true);
  }

  window.MMChrome424 = Object.freeze({install: install, sync: send});
  install();
}());
