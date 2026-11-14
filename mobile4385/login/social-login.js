(function installLoginReturn(pendingLogin, expectedPath) {
    'use strict';
    if (location.origin !== 'https://marketmarney.com' || location.pathname !== expectedPath) return;
    if (window.__mmLoginReturnInstalled) return;
    window.__mmLoginReturnInstalled = true;

    const account = expectedPath === '/akun.html' || expectedPath === '/login';
    const settings = account && new URLSearchParams(location.search).has('pengaturan');
    let submitted = false;
    let finished = false;
    let checking = false;

    function timeline() {
        if (finished) return;
        finished = true;
        location.replace('/beranda-trader.html#mm44-feed');
    }

    function confirmed(user) {
        if (user && typeof user.username === 'string' && user.username.trim() &&
                (!settings || submitted)) timeline();
    }

    if (account) {
        // The account screen emits this only after its login or OTP registration succeeds.
        // Settings also hosts a login form for guests. An existing member can still edit a profile.
        document.addEventListener('mm36-account-login', timeline);
        document.addEventListener('submit', function (event) {
            if (event.target && event.target.id === 'authForm') submitted = true;
        }, true);
        document.addEventListener('mm80-account-session', function (event) {
            confirmed(event.detail && event.detail.user);
        });
    }

    async function checkSession() {
        if (finished || checking || !pendingLogin || settings) return;
        checking = true;
        try {
            const response = await fetch('/api/community/status', {credentials:'same-origin', cache:'no-store'});
            if (response.ok) confirmed((await response.json()).user);
        } catch (_) {
            // The next successful login event or connectivity change can still complete the flow.
        } finally {
            checking = false;
        }
    }

    window.addEventListener('pagehide', function () { finished = true; });
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            finished = false;
            submitted = false;
            checkSession();
        }
    });
    window.addEventListener('online', checkSession);
    checkSession();
})
