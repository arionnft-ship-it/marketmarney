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
 assert.match(CLIENT,/mm-investing-calendar-legacy/);
 assert.match(CLIENT,/mm-investing-calendar-state/);
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
  GOOD.replace('calType=week','calType=invalid'),
  GOOD+'&timeZone=12',
  GOOD+'&importance=1'
 ];
 for(const url of invalid)assert.equal(approvedInvestingUrl(url),null,url);
});

test('mounts to observed mm88 desk, handles reload, errors and legacy fallback',()=>{
 const events={};const classes=new Set();let active=true,mounted=[],toggled=null,nextTimeout=0;
 const iframe={src:'',addEventListener(name,fn){events['frame_'+name]=fn;}};
 const state={textContent:''};
 const scroll={calls:[],scrollBy(options){this.calls.push(options);}};
 const shell={
   querySelector(selector){return selector==='#mm-investing-calendar'?mounted[0]||null:null;},
   prepend(element){mounted.unshift(element);}
 };
 const document={
   readyState:'complete',
   body:{classList:{
      add(...names){names.forEach(name=>classes.add(name));},
      remove(...names){names.forEach(name=>classes.delete(name));},
      contains(name){return classes.has(name);}
   }},
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
         if(selector==='#mm-investing-calendar-state')return state;
         if(selector==='.mm-investing-calendar-scroll')return scroll;
         if(selector==='#mm-investing-calendar-left')return {addEventListener(name,fn){events.left=fn;}};
         if(selector==='#mm-investing-calendar-right')return {addEventListener(name,fn){events.right=fn;}};
         if(selector==='#mm-investing-calendar-reload')return {addEventListener(name,fn){events.reload=fn;}};
         if(selector==='#mm-investing-calendar-legacy')return {addEventListener(name,fn){events.legacy=fn;}};
         return null;
       }
     };
   },
   addEventListener(name,fn){events[name]=fn;}
 };
 class Observer{constructor(fn){events.mutation=fn;}observe(){}}
 const context={
   document,location:{pathname:'/'},MutationObserver:Observer,requestAnimationFrame(fn){fn();},
   setTimeout(fn){events.timeout=fn;return ++nextTimeout;},clearTimeout(){events.timeout=null;}
 };
 vm.runInNewContext(CLIENT.replace('__MM_IFRAME_URL__',JSON.stringify(GOOD)),context);
 assert.equal(mounted.length,1);
 assert.equal(iframe.src,GOOD);
 assert.equal(classes.has('mm-investing-calendar-on'),true);
 assert.match(state.textContent,/Menghubungkan/);
 events.right();events.left();
 assert.deepEqual(scroll.calls,[{left:320,behavior:'smooth'},{left:-320,behavior:'smooth'}]);
 events.mutation();assert.equal(mounted.length,1,'must not duplicate widget on mutation');
 events.timeout();assert.match(state.textContent,/belum merespons/);
 events.frame_load();assert.match(state.textContent,/Pemuatan iframe selesai/);
 iframe.src='';events.reload();assert.equal(iframe.src,GOOD);
 events.frame_error();assert.match(state.textContent,/Gagal memuat/);
 events.legacy();assert.equal(classes.has('mm-investing-calendar-fallback'),true);
 assert.equal(classes.has('mm-investing-calendar-on'),false);
 events.mutation();assert.equal(mounted.length,1,'manual fallback should not remount iframe');
 active=false;events.mutation();assert.equal(classes.has('mm-investing-calendar-fallback'),false,'switching pages resets fallback');
 assert.equal(classes.has('mm-investing-calendar-on'),false,'Market Live must stay untouched');
 active=true;events.mutation();assert.equal(classes.has('mm-investing-calendar-on'),true);
 assert.equal(mounted.length,1,'reselecting calendar must reuse existing DOM');
});


test('accepts pasted official iframe snippet, never passes its markup through',()=>{
 const generated='<iframe width="650" height="467" src="'+GOOD.replace(/&/g,'&amp;')+'" frameborder="0"></iframe><div class="poweredBy">Investing.com</div>';
 assert.equal(approvedInvestingUrl(generated),GOOD);
 const injected=injectInvestingCalendar(HTML,generated);
 assert.match(injected,/sslecal2\.investing\.com/);
 assert.doesNotMatch(injected,/poweredBy/);
 assert.equal(approvedInvestingUrl('<iframe src="https://example.net/?timeZone=27&importance=3"></iframe>'),null);
 assert.equal(approvedInvestingUrl('<script>bad</script><iframe src="'+GOOD+'"></iframe>'),null);
 assert.equal(approvedInvestingUrl('<iframe src="'+GOOD.replace('importance=3','importance=1')+'"></iframe>'),null);
});

test('mobile keeps the desktop calendar with all columns and accessible sideways scrolling',()=>{
 assert.match(STYLE,/min-width:900px/,'widget keeps wide desktop presentation');
 assert.match(STYLE,/@media\\(max-width:960px\\)/,'phone and tablet controls');
 assert.match(STYLE,/@media\\(max-width:720px\\)/,'phone layout adapts without hiding desktop columns');
 assert.match(STYLE,/scrollbar-width:thin/,'horizontal scroll is visible');
 assert.match(CLIENT,/mm-investing-calendar-mobile-nav/);
 assert.match(CLIENT,/mm-investing-calendar-left/);
 assert.match(CLIENT,/mm-investing-calendar-right/);
 assert.match(CLIENT,/role="region"/);
 assert.match(CLIENT,/tabindex="0"/);
 assert.match(CLIENT,/scrollBy\\(\\{left:direction\\*320,behavior:'smooth'\\}\\)/);
 assert.doesNotMatch(STYLE,/max-width:720px[\\s\\S]*display:none[^}]*iframe/,'iframe not hidden on mobile');
});
