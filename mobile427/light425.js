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
  var nativeToneSent = false;
  var rootObserver = null;
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
    '[data-mm-theme-choice]', '[data-sh-theme]',
    'button[data-ac-theme]', '[role="button"][data-ac-theme]',
    'button[data-j-theme]', '[role="button"][data-j-theme]',
    '[data-theme-toggle]', '[aria-label="Ganti tema"]', '[title="Ganti tema"]',
    '[aria-label="Tema gelap"]', '[title="Tema gelap"]'
  ].join(',');

  function keepStorageLight() {
    try {
      for (var i = 0; i < explicitKeys.length; i++) {
        if (localStorage.getItem(explicitKeys[i]) !== 'light') localStorage.setItem(explicitKeys[i], 'light');
      }
    } catch (ignored) {}
  }

  function hideNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (!node.hidden) node.hidden = true;
    if (node.getAttribute('aria-hidden') !== 'true') node.setAttribute('aria-hidden', 'true');
    if ('tabIndex' in node && node.tabIndex !== -1) node.tabIndex = -1;
  }

  function hideThemeControls(scope) {
    scope = scope || document;
    if (scope.matches && scope.matches(controlSelector)) hideNode(scope);
    var controls = scope.querySelectorAll ? scope.querySelectorAll(controlSelector) : [];
    for (var i = 0; i < controls.length; i++) hideNode(controls[i]);
    var menu = scope.id === 'mm43-create-menu' ? scope :
      (scope.querySelector ? scope.querySelector('#mm43-create-menu') : null);
    if (menu) {
      var buttons = menu.querySelectorAll('button');
      for (var j = 0; j < buttons.length; j++) {
        var text = String(buttons[j].textContent || '').toLowerCase();
        if (text.indexOf('tema') !== -1 || text.indexOf('theme') !== -1 || text.indexOf('gelap') !== -1) hideNode(buttons[j]);
      }
    }
  }

  function force() {
    if (applying || !root) return 'light';
    applying = true;
    try {
      if (root.getAttribute('data-mm-light-only') !== '425') root.setAttribute('data-mm-light-only', '425');
      if (root.getAttribute('data-mm-perf') !== '427') root.setAttribute('data-mm-perf', '427');
      for (var i = 0; i < themeAttributes.length; i++) {
        if (root.getAttribute(themeAttributes[i]) !== 'light') root.setAttribute(themeAttributes[i], 'light');
      }
      if (root.style.getPropertyValue('color-scheme') !== 'light' ||
          root.style.getPropertyPriority('color-scheme') !== 'important') {
        root.style.setProperty('color-scheme', 'light', 'important');
      }
      if (document.body && (document.body.style.getPropertyValue('color-scheme') !== 'light' ||
          document.body.style.getPropertyPriority('color-scheme') !== 'important')) {
        document.body.style.setProperty('color-scheme', 'light', 'important');
      }
      var meta = document.querySelector('meta[name="color-scheme"]');
      if (meta && meta.getAttribute('content') !== 'light') meta.setAttribute('content', 'light');
      var themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor && themeColor.getAttribute('content') !== '#f4f6f9') themeColor.setAttribute('content', '#f4f6f9');
      if (!nativeToneSent) {
        try {
          if (window.MarketMarneyChrome && typeof window.MarketMarneyChrome.setTheme === 'function') {
            window.MarketMarneyChrome.setTheme('light');
            nativeToneSent = true;
          }
        } catch (ignored) {}
      }
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
      keepStorageLight();
      hideThemeControls(document);
      // Only the seven theme attributes are observed. Feed, chat, Reels and group
      // DOM updates are deliberately ignored so normal app activity stays cheap.
      rootObserver = new MutationObserver(function () {
        for (var i = 0; i < themeAttributes.length; i++) {
          if (root.getAttribute(themeAttributes[i]) !== 'light') { force(); break; }
        }
      });
      rootObserver.observe(root, {attributes: true, attributeFilter: themeAttributes});
      document.addEventListener('click', blockThemeChoice, true);
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') blockThemeChoice(event);
      }, true);
      addEventListener('hashchange', force, {passive: true});
      addEventListener('popstate', force, {passive: true});
      addEventListener('pageshow', force, {passive: true});
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          hideThemeControls(document);
          force();
        }, {once: true});
      }
    }
    return force();
  }

  window.MMLight425 = Object.freeze({install: install, force: force});
  install();
}());
