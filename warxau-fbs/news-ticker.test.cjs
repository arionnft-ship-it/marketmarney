'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {STYLE_ID,CLIENT_ID,ROOT_ID,EMBED_URL,PROVIDER_URL,WIDGET_SCRIPT,CLIENT,CSS,injectTickerHtml}=require('./news-ticker.cjs');
function page(){return '<!doctype html><html lang="id"><head><meta charset="utf-8"></head><body><main id="app"><h1>MarketMarney</h1></main></body></html>';}
class FakeNode {
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.hidden=false;this.className='';this.textContent='';this.handlers={};this.src='';this.href='';}
 setAttribute(k,v){this.attrs[k]=String(v);}
 getAttribute(k){return this.attrs[k]??null;}
 append(...items){this.children.push(...items);}
 appendChild(n){this.children.push(n);}
 prepend(n){this.children.unshift(n);}
 addEventListener(type,cb){this.handlers[type]=cb;}
}
test('FinancialJuice X embed replaces Banx and preserves existing website HTML',()=>{
 const before=page(),out=injectTickerHtml(before);
 assert.ok(out.includes('id="'+STYLE_ID+'"'));
 assert.ok(out.includes('id="'+CLIENT_ID+'"'));
 assert.ok(out.includes('MarketMarney</h1>'));
 assert.equal(injectTickerHtml(out),out);
 assert.equal(injectTickerHtml('<html><body>Invalid</body></html>'),'<html><body>Invalid</body></html>');
 assert.ok(!out.includes('banxnetwork.com'));
 assert.ok(!out.includes('BERITA 24/7'));
 assert.ok(out.includes('financialjuice'));
 assert.equal(before,page());
});
test('Official timeline is accessible, clearly attributed, and lazy-loaded on click',()=>{
 const body=new FakeNode('body'),head=new FakeNode('head');
 const doc={body,head,getElementById(){return null;},createElement(tag){return new FakeNode(tag);}};
 const window={};
 vm.runInNewContext(CLIENT,{document:doc,window},{timeout:350});
 assert.equal(body.children.length,1);
 const root=body.children[0];
 assert.equal(root.tag,'section');assert.equal(root.id,ROOT_ID);
 assert.equal(root.attrs.role,'region');
 const [strip,panel]=root.children;
 assert.equal(panel.hidden,true);
 assert.equal(head.children.length,0,'No X script until user opens feed');
 const [mark,copy,toggle,external]=strip.children;
 assert.equal(mark.textContent,'X');
 assert.equal(copy.children[0].textContent,'FINANCIALJUICE · X');
 assert.equal(external.href,PROVIDER_URL);
 assert.equal(external.target,'_blank');
 assert.equal(external.rel,'noopener noreferrer');
 assert.equal(toggle.attrs['aria-expanded'],'false');
 const timeline=panel.children[1].children[0];
 assert.equal(timeline.className,'twitter-timeline');
 assert.equal(timeline.href,EMBED_URL);
 assert.equal(timeline.attrs['data-height'],'460');
 assert.equal(timeline.attrs['data-dnt'],'true');
 assert.match(timeline.textContent,/FinancialJuice/);
 toggle.handlers.click();
 assert.equal(panel.hidden,false);
 assert.equal(toggle.attrs['aria-expanded'],'true');
 assert.equal(toggle.textContent,'Tutup berita');
 assert.equal(head.children.length,1);
 assert.equal(head.children[0].src,WIDGET_SCRIPT);
 assert.equal(head.children[0].async,true);
 assert.equal(head.children[0].attrs['data-mm-financialjuice-widget'],'v1');
 toggle.handlers.click();
 assert.equal(panel.hidden,true);
 assert.equal(head.children.length,1,'Reopening does not add duplicate widget scripts');
 toggle.handlers.click();
 assert.equal(panel.hidden,false);
 assert.equal(head.children.length,1);
});
test('Official X profile, no copied tweets, scraping, API keys or fake translations',()=>{
 const source=fs.readFileSync(require.resolve('./news-ticker.cjs'),'utf8');
 assert.equal(EMBED_URL,'https://x.com/financialjuice');
 assert.equal(PROVIDER_URL,'https://x.com/financialjuice');
 assert.equal(WIDGET_SCRIPT,'https://platform.twitter.com/widgets.js');
 assert.ok(CLIENT.includes('Postingan tetap dalam bahasa aslinya'));
 assert.ok(CSS.includes('.mm-fj-panel[hidden]'));
 assert.ok(CSS.includes('@media(max-width:650px)'));
 assert.doesNotMatch(source,/banxnetwork|BERITA 24\/7|FinancialJuice\s+headline:\s+[A-Z]/i);
 assert.doesNotMatch(source,/api\/content|api\/admin|api\/marketmarney\/headlines|Bearer |apiKey|x-api-key|DOMParser|XMLHttpRequest|fetch\(|localStorage/i);
});
test('Website bootstrap injection remains only on page HTML',()=>{
 const bootstrap=fs.readFileSync(require.resolve('./bootstrap.cjs'),'utf8');
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(html\)\)/);
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(raw\)\)/);
 const code=injectTickerHtml(page());
 assert.equal((code.match(/<script id=/g)||[]).length,1);
 assert.equal((code.match(/<style id=/g)||[]).length,1);
 assert.ok(!code.includes('<script src="https://platform.twitter.com'));
 assert.match(code,/document\.head\.appendChild\(script\)/);
});
