(function () {
    'use strict';
    if (location.origin !== 'https://marketmarney.com' || window.__mmAndroidLive) return;
    if (!['/beranda-trader.html', '/live.html'].includes(location.pathname)) return;
    window.__mmAndroidLive = true;

    if (location.pathname === '/live.html') {
        const url = new URL(location.href);
        const back = document.querySelector('.mm-live-back');
        if (back) {
            let fromReels = url.searchParams.get('from') === 'reels';
            if (!fromReels && document.referrer) {
                const previous = new URL(document.referrer);
                fromReels = previous.origin === location.origin && previous.pathname === '/live.html' &&
                    previous.searchParams.get('from') === 'reels';
            }
            if (fromReels) {
                back.href = '/beranda-trader.html#mm44-reels';
                back.textContent = 'Kembali ke Reels';
            }
        }
        if (url.hash === '#siarkan' && !url.searchParams.has('watch')) {
            const start = document.getElementById('startButton');
            if (start && document.getElementById('liveForm')) start.click();
        }
        return;
    }

    let link, timer, controller, lastRead = 0;
    const html = document.documentElement;
    function active() {
        return !document.hidden && !window.__mm45Suspended && !!link && link.isConnected &&
            (html.dataset.mm44View === 'reels' || html.hasAttribute('data-mm46-reels'));
    }
    function showCount(count) {
        if (!link) return;
        link.textContent = count > 0 ? 'LIVE · ' + count : 'LIVE';
        link.setAttribute('aria-label', count > 0 ?
            'Lihat ' + count + ' siaran langsung' : 'Buka siaran langsung');
    }
    async function update() {
        if (!active() || controller || Date.now() - lastRead < 20000) return;
        const request = new AbortController();
        controller = request;
        lastRead = Date.now();
        const timeout = setTimeout(() => request.abort(), 8000);
        try {
            const response = await fetch('/api/live/streams', {
                credentials: 'same-origin', cache: 'no-store',
                headers: {Accept: 'application/json'}, signal: request.signal
            });
            if (!response.ok) throw new Error('Live list unavailable');
            const data = await response.json();
            if (controller === request && active()) showCount(Array.isArray(data.streams) ? data.streams.length : 0);
        } catch (_) {
            if (controller === request) showCount(0);
        } finally {
            clearTimeout(timeout);
            if (controller === request) controller = null;
        }
    }
    function stop() {
        clearInterval(timer);
        timer = null;
        if (controller) controller.abort();
        controller = null;
        lastRead = 0;
        showCount(0);
    }
    function sync() {
        if (!active()) { stop(); return; }
        if (!timer) timer = setInterval(update, 30000);
        update();
    }
    function mount() {
        const toolbar = document.getElementById('mm46-toolbar');
        if (toolbar && (!link || !link.isConnected)) {
            link = document.createElement('a');
            link.id = 'mm-live-reels';
            link.href = '/live.html?from=reels';
            showCount(0);
            const brand = toolbar.querySelector('.mm46-brand');
            if (brand) brand.after(link); else toolbar.appendChild(link);
            sync();
        }
        const menu = document.getElementById('mm44-create-menu');
        if (menu && !menu.querySelector('#mm-live-create')) {
            const host = document.createElement('button');
            host.type = 'button';
            host.id = 'mm-live-create';
            host.className = 'mm44-menu-action';
            host.textContent = 'Mulai siaran langsung';
            host.addEventListener('click', () => {
                if (menu.open) menu.close();
                location.assign('/live.html#siarkan');
            });
            menu.insertBefore(host, menu.querySelector('.mm44-menu-note'));
        }
        if (toolbar && menu) mounts.disconnect();
    }
    const mounts = new MutationObserver(mount);
    const modes = new MutationObserver(sync);
    function boot() {
        mounts.observe(document.body, {childList: true, subtree: true});
        modes.observe(html, {attributes: true, attributeFilter: ['data-mm44-view','data-mm46-reels']});
        mount();
        sync();
    }
    window.addEventListener('mm45:suspend', stop);
    window.addEventListener('mm45:resume', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => { stop(); mounts.disconnect(); modes.disconnect(); });
    window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
    if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, {once: true});
})();
