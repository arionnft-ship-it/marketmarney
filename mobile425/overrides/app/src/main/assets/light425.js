(function () {
  'use strict';
  if (location.protocol !== 'https:' || location.hostname !== 'marketmarney.com' ||
      (location.port && location.port !== '443')) return;
  if (window.MMLight425) {
    window.MMLight425.install();
    return;
  }

  var root = document.documentElement;
  var installed = false;
  var applying = false;
  var rootObserver = null;
  var appObserver = null;
  var bodyObserver = null;
  var themeAttributes = [
    'data-mm-theme', 'data-theme', 'data-trader-theme', 'data-journal-theme',
    'data-ac-theme', 'data-j-theme', 'data-color-scheme'
  ];
  var explicitKeys = [
    'mm_public_theme_v1', 'mm43-news-theme', 'mm1839-last-theme',
    'mm_account_theme_v1', 'mm_journal_theme_v1', 'mm80-account-theme',
    'mm80-theme', 'mm-journal-theme', 'marketmarney-theme'
  ];
  var controlSelector = [
    '#theme', '#shTheme', '.sh-theme-switch', '.mm-theme-switch', '.mm80-themes', '.j-theme',
    '[data-mm-theme-choice]', '[data-sh-theme]', '[data-ac-theme]', '[data-j-theme]',
    '[data-theme-toggle]', '[aria-label="Ganti tema"]', '[title="Ganti tema"]',
    '[aria-label="Tema gelap"]', '[title="Tema gelap"]'
  ].join(',');

  function isThemeKey(key) {
    return /theme|tema|color[-_]?scheme/i.test(String(key || ''));
  }

  function keepStorageLight() {
    try {
      for (var i = 0; i < explicitKeys.length; i++) localStorage.setItem(explicitKeys[i], 'light');
      var keys = [];
      for (var n = 0; n < localStorage.length; n++) keys.push(localStorage.key(n));
      for (var j = 0; j < keys.length; j++) {
        if (isThemeKey(keys[j])) localStorage.setItem(keys[j], 'light');
      }
    } catch (ignored) {}
  }

  function hideThemeControls() {
    var controls = document.querySelectorAll(controlSelector);
    for (var i = 0; i < controls.length; i++) {
      var node = controls[i];
      node.hidden = true;
      node.setAttribute('aria-hidden', 'true');
      if ('tabIndex' in node) node.tabIndex = -1;
    }
    var menu = document.getElementById('mm43-create-menu');
    if (menu) {
      var buttons = menu.querySelectorAll('button');
      for (var j = 0; j < buttons.length; j++) {
        var text = String(buttons[j].textContent || '').toLowerCase();
        if (text.indexOf('tema') !== -1 || text.indexOf('theme') !== -1 || text.indexOf('gelap') !== -1) {
          buttons[j].hidden = true;
          buttons[j].setAttribute('aria-hidden', 'true');
          buttons[j].tabIndex = -1;
        }
      }
    }
  }

  function force() {
    if (applying || !root) return 'light';
    applying = true;
    try {
      root.setAttribute('data-mm-light-only', '425');
      for (var i = 0; i < themeAttributes.length; i++) {
        if (root.getAttribute(themeAttributes[i]) !== 'light') root.setAttribute(themeAttributes[i], 'light');
      }
      root.style.setProperty('color-scheme', 'light', 'important');
      if (document.body) document.body.style.setProperty('color-scheme', 'light', 'important');
      var meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) meta.setAttribute('content', 'light');
      var themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) themeColor.setAttribute('content', '#f4f6f9');
      keepStorageLight();
      hideThemeControls();
      try {
        if (window.MarketMarneyChrome && typeof window.MarketMarneyChrome.setTheme === 'function') {
          window.MarketMarneyChrome.setTheme('light');
        }
      } catch (ignored) {}
    } finally {
      applying = false;
    }
    return 'light';
  }

  function blockThemeChoice(event) {
    var target = event.target && event.target.closest ? event.target.closest(controlSelector) : null;
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    force();
  }

  function install() {
    if (!installed) {
      installed = true;
      rootObserver = new MutationObserver(force);
      rootObserver.observe(root, {attributes: true, attributeFilter: themeAttributes.concat(['class', 'style'])});
      if (document.body) {
        bodyObserver = new MutationObserver(function () { hideThemeControls(); });
        bodyObserver.observe(document.body, {childList: true});
      }
      var app = document.getElementById('app');
      if (app) {
        appObserver = new MutationObserver(function () { hideThemeControls(); });
        appObserver.observe(app, {childList: true});
      }
      document.addEventListener('click', blockThemeChoice, true);
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') blockThemeChoice(event);
      }, true);
      addEventListener('hashchange', force, {passive: true});
      addEventListener('popstate', force, {passive: true});
      addEventListener('pageshow', force, {passive: true});
    }
    return force();
  }

  window.MMLight425 = Object.freeze({install: install, force: force});
  install();
}());
