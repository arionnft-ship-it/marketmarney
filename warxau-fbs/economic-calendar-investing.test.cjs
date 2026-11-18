'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {approvedInvestingUrl,injectInvestingCalendar,STYLE,CLIENT}=require('./economic-calendar-investing.cjs');
const GOOD='https://sslecal2.investing.com/?columns=exc_currency%2Cexc_importance%2Cexc_actual%2Cexc_forecast%2Cexc_previous&countries=5%2C72%2C4%2C35&calType=week&timeZone=27&importance=3&lang=12'; // GMT+7 Jakarta (27), high impact only (3).
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
 assert.match(CLIENT,/mm88-desk/);
 assert.match(CLIENT,/MutationObserver/);
 assert.match(CLIENT,/loading="eager/);
 assert.match(CLIENT,/mm-investing-calendar-reload/);
 assert.match(STYLE,/overflow-x:auto/);
 assert.doesNotMatch(CLIENT,/localStorage|sessionStorage|fetch\(/);
});
test('rejects wrong timezone, impact or missing macro-country data',()=>{
 const invalid=[
  GOOD.replace('timeZone=27','timeZone=12'),
  GOOD.replace('&importance=3',''),
  GOOD.replace('importance=3','importance=1,2,3'),
  GOOD.replace('5%2C72%2C4%2C35','5%2C72%2C4'),
  GOOD.replace('exc_previous','exc_whatever'),
  GOOD.replace('calType=week','calType=invalid')
 ];
 for(const url of invalid)assert.equal(approvedInvestingUrl(url),null,url);
});

test('renders in the observed MarketMarney mm88-desk and leaves other pages alone',()=>{
 const events={};let active=true,mounted=[],iframe={src:''},toggled=null;
 const shell={
   querySelector(selector){return selector==='#mm-investing-calendar'?mounted[0]||null:null;},
   prepend(element){mounted.unshift(element);}
 };
 const document={
   readyState:'complete',
   body:{classList:{toggle(cls,value){if(cls==='mm-investing-calendar-on')toggled=value;}}},
   getElementById(id){return id==='app'?{}:id==='toplabel'?{textContent:active?'MARKET INTELLIGENCE / KALENDER EKONOMI':'MARKET LIVE'}:null;},
   querySelector(selector){
     if(selector==='.navbtn.active,.navbtn.is-active')return active?{dataset:{page:'Kalender Ekonomi'},textContent:'KALENDER EKONOMI'}:{dataset:{page:'Market Live'},textContent:'MARKET LIVE'};
     if(selector==='section.mm88-desk')return active?shell:null;
     return null;
   },
   createElement(tag){
     assert.equal(tag,'section');
     return {id:null,innerHTML:'',setAttribute(){},
       querySelector(selector){
         if(selector==='iframe')return iframe;
         if(selector==='#mm-investing-calendar-reload')return {addEventListener(name,fn){events.reload=fn;}};
         return null;
       }
     };
   },
   addEventListener(name,fn){events[name]=fn;}
 };
 class Observer{constructor(fn){events.mutation=fn;}observe(){}}
 const context={document,location:{pathname:'/'},MutationObserver:Observer,requestAnimationFrame(fn){fn();}};
 vm.runInNewContext(CLIENT.replace('__MM_IFRAME_URL__',JSON.stringify(GOOD)),context);
 assert.equal(mounted.length,1);
 assert.equal(iframe.src,GOOD);
 assert.equal(toggled,true);
 assert.match(mounted[0].innerHTML,/Kalender Ekonomi/);
 events.mutation();assert.equal(mounted.length,1,'must not duplicate widget after mutations');
 active=false;events.mutation();assert.equal(toggled,false,'must not overlay Market Live');
 iframe.src='';events.reload();assert.equal(iframe.src,GOOD);
});
