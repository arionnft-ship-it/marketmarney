'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {injectMarketTerminal,SCRIPT,STYLE,LAYOUT_CSS,LAYOUT_STYLE}=require('./market-live-terminal.cjs');
test('terminal injected once only into valid HTML',()=>{const html='<html><head></head><body><main id="app"></main></body></html>';const result=injectMarketTerminal(html);assert.match(result,/mm-market-terminal-script/);assert.match(result,/mm-market-terminal-style/);assert.equal(injectMarketTerminal(result),result);assert.equal(injectMarketTerminal('invalid'),'invalid')});
test('market live terminal browser script compiles',()=>{const code=SCRIPT.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,'');new vm.Script(code)});
test('dark TradingView watchlist works only in Market Live and keeps chat accessible',()=>{assert.match(SCRIPT,/\.mm85-shell/);assert.match(SCRIPT,/\.navbtn\.active\[data-page="Market Live"\]/);assert.match(SCRIPT,/embed-widget-advanced-chart\.js/);assert.match(SCRIPT,/watchlist:WATCHLIST/);assert.match(SCRIPT,/hide_side_toolbar:false/);assert.match(SCRIPT,/mm-terminal-chat-open/);assert.match(SCRIPT,/renderChart\(\)/);assert.match(STYLE,/body\.mm-terminal-on/);assert.match(SCRIPT,/data dapat tertunda/);assert.doesNotMatch(SCRIPT,/localStorage|sessionStorage|signTransaction|sendTransaction/)});

test('layout repair prevents black bands and empty legacy shell while retaining live chat',()=>{
 assert.match(LAYOUT_CSS,/body\.mm-terminal-on\{background:#f5f7fa!important\}/);
 assert.match(LAYOUT_CSS,/\.mm85-shell > :not\(#mm-live-terminal\)\{display:none!important\}/);
 assert.match(LAYOUT_CSS,/\.mm85-shell>\.mm1831-market-layout\{/);
 assert.match(LAYOUT_CSS,/\.mm-terminal-chat-open/);
 assert.match(LAYOUT_CSS,/#mm-terminal-tv\{[\s\S]*?height:clamp\(/);
 assert.match(LAYOUT_CSS,/min-height:0!important/);
 assert.match(LAYOUT_CSS,/\.mm-live-terminal:fullscreen #mm-terminal-tv/);
 assert.match(LAYOUT_CSS,/@media\(max-width:950px\)/);
 assert.match(LAYOUT_CSS,/@media\(max-width:600px\)/);
 assert.match(LAYOUT_STYLE,/id="mm-market-terminal-layout-fix"/);
 const html='<html><head></head><body><main id="app"></main></body></html>';
 const applied=injectMarketTerminal(html);
 assert.equal((applied.match(/id="mm-market-terminal-layout-fix"/g)||[]).length,1);
 assert.equal(injectMarketTerminal(applied),applied);
 assert.doesNotMatch(applied,/<script[^>]+src=["']https?:/i);
});
