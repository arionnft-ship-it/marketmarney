'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {STYLE_ID,CLIENT_ID,ROOT_ID,EMBED_URL,PROVIDER_URL,injectTickerHtml}=require('./news-ticker.cjs');

function original(){return '<!doctype html><html><head><meta charset="utf-8"></head><body><main id="app"><h1>MarketMarney</h1></main></body></html>';}
function scriptFrom(html){const re=new RegExp('<script id="'+CLIENT_ID+'">([\\s\\S]*?)<\\/script>');return re.exec(html)?.[1]||'';}
class Node {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent='';this.className='';}
 setAttribute(name,value){this.attrs[name]=String(value);}
 append(){this.children.push(...arguments);}
 appendChild(child){this.children.push(child);}
 prepend(child){this.children.unshift(child);}
}
test('responsive ticker HTML is injected once and leaves original page unchanged',()=>{
 const page=original(),patched=injectTickerHtml(page);
 assert.match(patched,new RegExp('id="'+STYLE_ID+'"'));
 assert.match(patched,new RegExp('id="'+CLIENT_ID+'"'));
 assert.match(patched,/MarketMarney<\/h1>/);
 assert.match(patched,/@media\(max-width:640px\)/);
 assert.match(patched,/#mm-banx-ticker-v1/);
 assert.equal(injectTickerHtml(patched),patched);
 assert.equal(injectTickerHtml('<html><body>Invalid</body></html>'),'<html><body>Invalid</body></html>');
 assert.equal(page,original());
});
test('official free Banx iframe carries dark theme and visible attribution',()=>{
 const html=injectTickerHtml(original());
 const js=scriptFrom(html);
 assert.ok(js.length>500);
 const body=new Node('body');
 const doc={body,createElement(tag){return new Node(tag)},getElementById(){return null;}};
 vm.runInNewContext(js,{document:doc},{timeout:2500});
 assert.equal(body.children.length,1);
 const root=body.children[0];assert.equal(root.tag,'section');assert.equal(root.id,ROOT_ID);
 assert.equal(root.attrs['aria-label'],'Headline berita global, widget Banx Network');
 const [badge,viewport,attribution]=root.children;
 assert.equal(badge.children[1].textContent,'BERITA 24/7');
 const frame=viewport.children[0];
 assert.equal(frame.tag,'iframe');
 assert.equal(frame.src,EMBED_URL);
 assert.equal(frame.src,'https://www.banxnetwork.com/embed/ticker?theme=dark');
 assert.equal(frame.height,'44');
 assert.equal(frame.attrs.loading,'eager');
 assert.equal(frame.attrs.referrerpolicy,'strict-origin-when-cross-origin');
 assert.match(frame.title,/Banx Network/);
 assert.equal(attribution.href,PROVIDER_URL);
 assert.equal(attribution.textContent,'BANX');
 assert.equal(attribution.target,'_blank');
 assert.equal(attribution.rel,'noopener noreferrer');
});
test('ticker does not load Marney stories, Newsquawk streams, or client-side API secrets',()=>{
 const source=fs.readFileSync(require.resolve('./news-ticker.cjs'),'utf8');
 const bootstrap=fs.readFileSync(require.resolve('./bootstrap.cjs'),'utf8');
 assert.doesNotMatch(source,/api\/content|api\/marketmarney\/headlines|marketmarney\.sqlite|createNewsTicker|speechSynthesis|FinancialJuice|newsquawk\.com|financialjuice\.com/i);
 assert.doesNotMatch(bootstrap,/newsTicker\.owns|newsTicker\.handle|const newsTicker=createNewsTicker/);
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(html\)\)/);
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(raw\)\)/);
 assert.doesNotMatch(source,/localStorage|MM_SQUAWK|MM_NEWSQUAWK|autoplay/i);
});
test('widget requires no site-side API key, tracking script or content redistribution',()=>{
 const html=injectTickerHtml(original());
 assert.equal((html.match(/<iframe/g)||[]).length,0,'iframe is created once on client after DOM is loaded');
 assert.match(html,/document\.body\.prepend\(bar\)/);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:/i,'no third-party script injected directly in website');
 assert.doesNotMatch(html,/Bearer |apiKey|x-api-key/i);
 assert.ok(EMBED_URL.startsWith('https://www.banxnetwork.com/'));
});
