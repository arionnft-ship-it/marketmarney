'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {approvedInvestingUrl,injectInvestingCalendar,STYLE,CLIENT}=require('./economic-calendar-investing.cjs');
const GOOD='https://sslecal2.investing.com/?columns=exc_currency%2Cexc_importance%2Cexc_actual%2Cexc_forecast%2Cexc_previous&countries=5%2C72%2C4%2C35&calType=week&timeZone=12&lang=12'; // URL shape only; timeZone 12 here is NOT asserted to be WIB.
const HTML='<html><head><title>MarketMarney</title></head><body><main id="app"></main></body></html>';
test('accepts only a provider-generated Investing.com HTTPS iframe URL',()=>{
 assert.equal(approvedInvestingUrl(GOOD),GOOD);
 for(const bad of ['','http://sslecal2.investing.com/?columns=a&calType=day&timeZone=1&lang=1','https://sslecal2.investing.com.evil.test/?columns=a&calType=day&timeZone=1&lang=1','https://user:pass@sslecal2.investing.com/?columns=a&calType=day&timeZone=1&lang=1','https://www.investing.com/economic-calendar/','javascript:alert(1)'])assert.equal(approvedInvestingUrl(bad),null);
});
test('is opt in, safe, home-page idempotent, and does not rewrite when unset',()=>{
 assert.equal(injectInvestingCalendar(HTML,''),HTML);
 const page=injectInvestingCalendar(HTML,GOOD);
 assert.match(page,/mm-investing-calendar-script/);assert.match(page,/mm-investing-calendar-style/);
 assert.match(page,/sslecal2\.investing\.com/);
 assert.match(page,/Kalender Ekonomi/);
 assert.equal(injectInvestingCalendar(page,GOOD),page);
 assert.equal(injectInvestingCalendar('not html',GOOD),'not html');
 assert.doesNotMatch(page,/external-embedding\/embed-widget-economic-calendar/);
});
test('client script compiles and uses selected calendar page only',()=>{
 new vm.Script(CLIENT.replace('__MM_IFRAME_URL__',JSON.stringify(GOOD)));
 assert.match(CLIENT,/data-page="Kalender Ekonomi/);
 assert.match(CLIENT,/mm85-shell/);
 assert.match(CLIENT,/MutationObserver/);
 assert.match(CLIENT,/loading="eager/);
 assert.match(CLIENT,/mm-investing-calendar-reload/);
 assert.match(STYLE,/overflow-x:auto/);
 assert.doesNotMatch(CLIENT,/localStorage|sessionStorage|fetch\(/);
});