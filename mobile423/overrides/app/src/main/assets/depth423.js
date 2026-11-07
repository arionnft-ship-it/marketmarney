(function () {
  'use strict';
  // Static material styling: no timers, observers, network requests or scene work.
  if (location.protocol !== 'https:' || location.hostname !== 'marketmarney.com' ||
      (location.port && location.port !== '443')) return;
  if (window.MMDepth423) return;

  function install(css) {
    var root = document.documentElement;
    if (!root || !document.head || !document.body || typeof css !== 'string' || !css) return false;
    var routes = {
      '/': 'index', '/index.html': 'index', '/__android43/news': 'news',
      '/beranda-trader.html': 'social', '/grup-trader.html': 'group',
      '/profil.html': 'profile', '/akun.html': 'account', '/journal.html': 'journal',
      '/assets/xau-war-3d.html': 'war'
    };
    var page = routes[location.pathname] || 'public';
    var theme = root.getAttribute('data-mm-theme') || root.getAttribute('data-theme') ||
      root.getAttribute('data-trader-theme') || root.getAttribute('data-journal-theme');
    var tone = theme === 'dark' || (!theme && (page === 'news' || page === 'war')) ? 'dark' : 'light';
    if (root.getAttribute('data-mm-depth') !== '423') root.setAttribute('data-mm-depth', '423');
    if (root.getAttribute('data-mm-depth-page') !== page) root.setAttribute('data-mm-depth-page', page);
    if (root.getAttribute('data-mm-depth-tone') !== tone) root.setAttribute('data-mm-depth-tone', tone);
    var style = document.getElementById('mm423-depth');
    if (!style) {
      style = document.createElement('style');
      style.id = 'mm423-depth';
    }
    if (style.textContent !== css) style.textContent = css;
    // Social's existing adapter can install its own styles after first paint.
    // Keep this sheet last when native adapt runs again; CSS handles theme changes.
    if (style.parentNode !== document.head || document.head.lastElementChild !== style) document.head.appendChild(style);
    return true;
  }

  window.MMDepth423 = Object.freeze({ install: install });
}());
