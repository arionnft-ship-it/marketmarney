'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(process.argv[2] || path.join(__dirname, '../project/app/src/main/assets/social-login.js'),'utf8');
const timeline = '/beranda-trader.html#mm44-feed';

function page(address, pending, statuses = []) {
    const url = new URL(address, 'https://marketmarney.com');
    const opened = [], checks = [];
    const document = new EventTarget(), window = new EventTarget();
    const location = {origin:url.origin, pathname:url.pathname, search:url.search,replace(target){opened.push(target);}};
    const fetch = async (endpoint, options) => {
        checks.push(endpoint);
        assert.equal(options.credentials,'same-origin');
        assert.equal(options.cache,'no-store');
        const user = statuses.shift();
        if (user instanceof Error) throw user;
        return {ok:true, json:async()=>({user:user || null})};
    };
    const sandbox = vm.createContext({window,document,location,URLSearchParams,fetch});
    const inject = (expected = url.pathname) => vm.runInContext(script+'('+pending+','+JSON.stringify(expected)+')', sandbox);
    inject();
    const event = (where, name, attrs) => {
        const e = new Event(name);
        for (const [key,value] of Object.entries(attrs || {})) Object.defineProperty(e,key,{value});
        where.dispatchEvent(e);
    };
    return {opened,checks,document,window,inject,event};
}
const settle = () => new Promise(resolve=>setImmediate(resolve));

test('login succeeds after the initial guest check has finished; success events and repeated injection redirect once',async()=>{
    const p=page('/akun.html',true,[null]);
    await settle();
    assert.deepEqual(p.opened,[]);
    p.inject();
    p.event(p.document,'mm80-account-session',{detail:{user:null}});
    assert.deepEqual(p.opened,[]);
    p.event(p.document,'mm36-account-login');
    p.event(p.document,'mm80-account-session',{detail:{user:{username:'trader'}}});
    assert.deepEqual(p.opened,[timeline]);
    assert.deepEqual(p.checks,['/api/community/status']);
});
test('session events on settings keep an existing member in profile settings',async()=>{
    const p=page('/akun.html?pengaturan=1',false);
    p.event(p.document,'mm80-account-session',{detail:{user:{username:'member'}}});
    await settle();
    assert.deepEqual(p.opened,[]);
    assert.deepEqual(p.checks,[]);
});
test('guest who signs in on settings reaches the feed through the account success event',()=>{
    const p=page('/akun.html?pengaturan=1',false);
    p.event(p.document,'mm80-account-session',{detail:{user:null}});
    p.event(p.document,'mm36-account-login');
    assert.deepEqual(p.opened,[timeline]);
});
test('registration with OTP and failures do not navigate until successful account completion',()=>{
    const p=page('/akun.html?pengaturan=1#daftar',false);
    p.event(p.document,'submit',{target:{id:'authForm'}});
    p.event(p.document,'mm80-account-session',{detail:{user:null}});
    assert.deepEqual(p.opened,[]);
    p.event(p.document,'mm80-account-session',{detail:{user:{username:'newtrader'}}});
    assert.deepEqual(p.opened,[timeline]);
});
test('an authenticated profile callback redirects only during a pending login',async()=>{
    const callback=page('/profil.html?user=trader',true,[{username:'trader'}]);
    const profile=page('/profil.html?user=trader',false,[{username:'trader'}]);
    await settle();
    assert.deepEqual(callback.opened,[timeline]);
    assert.deepEqual(profile.opened,[]);
    assert.deepEqual(profile.checks,[]);
});
test('network failures do not redirect guests, and a later session recovery still works',async()=>{
    const p=page('/akun.html',true,[new Error('offline'),{username:'trader'}]);
    await settle();
    assert.deepEqual(p.opened,[]);
    p.event(p.window,'online');
    await settle();
    assert.deepEqual(p.opened,[timeline]);
});
test('a late callback after leaving the login page cannot navigate back to the feed',async()=>{
    const p=page('/akun.html',true,[{username:'trader'}]);
    p.event(p.window,'pagehide');
    await settle();
    assert.deepEqual(p.opened,[]);
});
test('the listener is not installed on another origin',async()=>{
    const p=page('https://example.org/akun.html',true,[{username:'trader'}]);
    p.event(p.document,'mm36-account-login');
    await settle();
    assert.deepEqual(p.opened,[]);
    assert.deepEqual(p.checks,[]);
});
