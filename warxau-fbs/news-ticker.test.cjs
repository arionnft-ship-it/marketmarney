'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {STYLE_ID,CLIENT_ID,ROOT_ID,WIDGET_SCRIPT,PROVIDER_URL,CONFIG,CLIENT,CSS,injectTickerHtml}=require('./news-ticker.cjs');
function original(){return '<!doctype html><html lang="id"><head><meta charset="utf-8"></head><body><main id="app"><h1>MarketMarney</h1></main></body></html>';}
class FakeNode{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent='';this.className='';this.handlers={};this.hidden=false;this.src='';this.href='';this.onload=null;this.onerror=null;}
 setAttribute(k,v){this.attrs[k]=String(v);}
 append(...items){this.children.push(...items);}
 appendChild(child){this.children.push(child);}
 prepend(child){this.children.unshift(child);}
 addEventListener(name,callback){this.handlers[name]=callback;}
}
test('TradingView replaces FinancialJuice and Banx without changing homepage content',()=>{
 const page=original(),html=injectTickerHtml(page);
 assert.match(html,new RegExp('id="'+STYLE_ID+'"'));
 assert.match(html,new RegExp('id="'+CLIENT_ID+'"'));
 assert.ok(html.includes('MarketMarney</h1>'));
 assert.equal(injectTickerHtml(html),html);
 assert.equal(page,original());
 assert.equal(injectTickerHtml('<html><body>Invalid</body></html>'),'<html><body>Invalid</body></html>');
 assert.doesNotMatch(html,/feed\.financialjuice\.com|twitter-timeline|banxnetwork\.com|BERITA 24\/7/);
 assert.match(html,/MARKET NEWS/);
});
function scenario(pathname){
 const body=new FakeNode('body');
 const doc={body,getElementById(){return null;},createElement(tag){return new FakeNode(tag);}};
 let observer=null;
 class MockObserver{
  constructor(cb,options){this.cb=cb;this.options=options;observer=this;}
  observe(node){this.target=node;}
  disconnect(){this.disconnected=true;}
 }
 vm.runInNewContext(CLIENT,{document:doc,JSON,location:{pathname},IntersectionObserver:MockObserver},{timeout:600});
 return {body,observer};
}
test('Homepage shows headlines panel by default, loads widget when near viewport and never duplicates it',()=>{
 const {body,observer}=scenario('/');
 assert.equal(body.children.length,1);
 const root=body.children[0];assert.equal(root.id,ROOT_ID);
 assert.equal(root.attrs.role,'region');
 const [strip,panel]=root.children;
 const [,info,button,link]=strip.children;
 assert.match(info.children[0].textContent,/TRADINGVIEW/);
 assert.equal(button.textContent,'Tutup berita');
 assert.equal(button.attrs['aria-expanded'],'true');
 assert.equal(panel.hidden,false);
 assert.equal(link.href,PROVIDER_URL);
 assert.equal(link.rel,'noopener noreferrer');
 const [intro,host,footer]=panel.children;
 assert.match(intro.children[1].textContent,/mungkin tidak selalu bahasa Indonesia/);
 assert.equal(host.children.length,0,'defer the third-party script until the widget is visible');
 assert.equal(footer.children[1].href,PROVIDER_URL);
 assert.equal(observer.target,panel);
 assert.equal(observer.options.rootMargin,'160px 0px');
 observer.cb([{isIntersecting:false}]);
 assert.equal(host.children.length,0);
 observer.cb([{isIntersecting:true}]);
 assert.equal(observer.disconnected,true);
 assert.equal(host.children.length,2);
 const [status,container]=host.children;
 assert.match(status.textContent,/Memuat berita/);
 assert.equal(container.children[0].className,'tradingview-widget-container__widget');
 const script=container.children[1];
 assert.equal(script.src,WIDGET_SCRIPT);
 assert.equal(script.async,true);
 assert.deepEqual(JSON.parse(script.textContent),CONFIG);
 script.onload();
 assert.equal(status.textContent,'Sumber: TradingView');
 button.handlers.click();
 assert.equal(panel.hidden,true);
 assert.equal(button.textContent,'Lihat berita');
 assert.equal(button.attrs['aria-expanded'],'false');
 button.handlers.click();
 assert.equal(panel.hidden,false);
 assert.equal(button.textContent,'Tutup berita');
 assert.equal(host.children.length,2,'never create duplicate widgets');
});
test('News stays collapsed on Social Marney and loads when requested',()=>{
 const {body,observer}=scenario('/grup-trader.html');
 const [strip,panel]=body.children[0].children;
 const button=strip.children[2];
 const host=panel.children[1];
 assert.equal(panel.hidden,true);
 assert.equal(button.textContent,'Lihat berita');
 assert.equal(button.attrs['aria-expanded'],'false');
 assert.equal(observer,null,'no eager observer on non-home pages');
 assert.equal(host.children.length,0);
 button.handlers.click();
 assert.equal(panel.hidden,false);
 assert.equal(button.textContent,'Tutup berita');
 assert.equal(host.children.length,2);
 host.children[1].children[1].onerror();
 assert.match(host.children[0].textContent,/Gunakan tautan sumber/);
});
test('Official TradingView widget code is attributed, not scraped or falsely translated',()=>{
 const source=fs.readFileSync(require.resolve('./news-ticker.cjs'),'utf8');
 assert.equal(WIDGET_SCRIPT,'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js');
 assert.equal(PROVIDER_URL,'https://id.tradingview.com/news/');
 assert.equal(CONFIG.feedMode,'all_symbols');
 assert.equal(CONFIG.displayMode,'regular');
 assert.equal(CONFIG.locale,'id');
 assert.match(CSS,/mm-tv-news-panel\[hidden\]/);
 assert.match(CSS,/@media\(max-width:650px\)/);
 assert.doesNotMatch(source,/news\.financialjuice\.com|feed\.financialjuice|banxnetwork|twitter-timeline|api\/content|api\/admin|Bearer |apiKey|XMLHttpRequest|fetch\(/);
});
test('Ticker remains scoped to page injection, no third-party script globally loaded',()=>{
 const bootstrap=fs.readFileSync(require.resolve('./bootstrap.cjs'),'utf8');
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(html\)\)/);
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(raw\)\)/);
 const html=injectTickerHtml(original());
 assert.equal((html.match(/<script id=/g)||[]).length,1);
 assert.equal((html.match(/<style id=/g)||[]).length,1);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:/i);
 assert.doesNotMatch(html,/BERITA 24\/7/);
});
