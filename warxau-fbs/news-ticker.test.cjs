'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {STYLE_ID,CLIENT_ID,ROOT_ID,HEADLINES_URL,PROVIDER_URL,PROFILE_URL,CLIENT,CSS,injectTickerHtml}=require('./news-ticker.cjs');
function original(){return '<!doctype html><html><head><meta charset="utf-8"></head><body><main id="app"><h1>MarketMarney</h1></main></body></html>';}
class Node{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.textContent='';this.className='';this.handlers={};this.hidden=false;}
 setAttribute(key,value){this.attrs[key]=String(value);}
 append(...args){this.children.push(...args);}
 appendChild(child){this.children.push(child);}
 prepend(child){this.children.unshift(child);}
 addEventListener(kind,fn){this.handlers[kind]=fn;}
}
test('Official FinancialJuice Headlines widget replaces broken X timeline, with unchanged main page',()=>{
 const page=original(),html=injectTickerHtml(page);
 assert.match(html,new RegExp('id="'+STYLE_ID+'"'));
 assert.match(html,new RegExp('id="'+CLIENT_ID+'"'));
 assert.ok(html.includes('MarketMarney</h1>'));
 assert.equal(injectTickerHtml(html),html);
 assert.equal(injectTickerHtml('<html><body>Invalid</body></html>'),'<html><body>Invalid</body></html>');
 assert.equal(page,original());
 assert.ok(!html.includes('twitter-timeline'));
 assert.ok(!html.includes('platform.twitter.com/widgets.js'));
 assert.ok(!html.includes('BERITA 24/7'));
 assert.ok(html.includes('Baca berita'));
 assert.ok(html.includes('feed.financialjuice.com'));
});
test('Panel presents FinancialJuice source and never becomes empty if external embed fails',()=>{
 const body=new Node('body'),head=new Node('head');
 const document={body,head,getElementById(){return null;},createElement(tag){return new Node(tag);}};
 vm.runInNewContext(CLIENT,{document},{timeout:500});
 assert.equal(body.children.length,1);
 const section=body.children[0];
 assert.equal(section.tag,'section');
 assert.equal(section.id,ROOT_ID);
 assert.equal(section.attrs.role,'region');
 const [bar,panel]=section.children;
 const [mark,copy,button,xlink]=bar.children;
 assert.equal(mark.textContent,'FJ');
 assert.equal(copy.children[0].textContent,'FINANCIALJUICE NEWS');
 assert.equal(button.textContent,'Baca berita');
 assert.equal(button.attrs['aria-expanded'],'false');
 assert.equal(xlink.href,PROFILE_URL);
 assert.equal(xlink.rel,'noopener noreferrer');
 assert.equal(panel.hidden,true);
 const [intro,shell,foot]=panel.children;
 assert.match(intro.children[0].textContent,/Headline pasar FinancialJuice/);
 assert.match(intro.children[1].textContent,/bahasa aslinya/);
 assert.match(foot.children[0].textContent,/Jika daftar berita tidak tampil/);
 assert.equal(foot.children[1].href,PROVIDER_URL);
 assert.equal(shell.children.length,0,'iframe loads on demand');
 button.handlers.click();
 assert.equal(panel.hidden,false);
 assert.equal(button.textContent,'Tutup berita');
 assert.equal(button.attrs['aria-expanded'],'true');
 assert.equal(shell.children.length,1);
 const iframe=shell.children[0];
 assert.equal(iframe.tag,'iframe');
 assert.equal(iframe.src,HEADLINES_URL);
 assert.equal(iframe.loading,'lazy');
 assert.equal(iframe.attrs.referrerpolicy,'strict-origin-when-cross-origin');
 assert.match(iframe.title,/FinancialJuice/);
 button.handlers.click();
 assert.equal(panel.hidden,true);
 button.handlers.click();
 assert.equal(shell.children.length,1,'no repeated external widget iframes on reopening');
});
test('Official source, no scraping, fabricated posts, hidden credentials, or misleading translation',()=>{
 assert.equal(HEADLINES_URL,'https://feed.financialjuice.com/widgets/headlines.aspx?affurl=&backC=1e222d&container=financialjuice-news-widget-container&fontC=b2b5be&height=100%25&mode=Dark&width=100%25&wtype=NEWS');
 assert.equal(PROFILE_URL,'https://x.com/financialjuice');
 assert.equal(PROVIDER_URL,'https://www.financialjuice.com/widgets/get-widget.aspx');
 const code=fs.readFileSync(require.resolve('./news-ticker.cjs'),'utf8');
 assert.doesNotMatch(code,/platform\.twitter\.com|twitter-timeline|banxnetwork\.com|BERITA 24\/7|api\/content|api\/admin|api\/marketmarney\/headlines|fetch\(|XMLHttpRequest|localStorage|Bearer |apiKey|x-api-key/);
 assert.ok(CSS.includes('#mm-fj-headlines-v2'));
 assert.ok(CSS.includes('.mm-fj-panel[hidden]'));
 assert.ok(CSS.includes('@media(max-width:620px)'));
});
test('Ticker injection keeps public page and other gateway behavior intact',()=>{
 const bootstrap=fs.readFileSync(require.resolve('./bootstrap.cjs'),'utf8');
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(html\)\)/);
 assert.match(bootstrap,/injectTickerHtml\(injectReadingWidthStyle\(raw\)\)/);
 const html=injectTickerHtml(original());
 assert.equal((html.match(/<script id=/g)||[]).length,1);
 assert.equal((html.match(/<style id=/g)||[]).length,1);
 assert.doesNotMatch(html,/<script[^>]+src=["']https?:/i,'no third-party script injected globally');
});
