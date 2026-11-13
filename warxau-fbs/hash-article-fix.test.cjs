'use strict';const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {injectHashArticleFix,script}=require('./hash-article-fix.cjs');
test('home HTML receives the scoped formatter only once',()=>{const raw='<html><head></head><body><main id="app"></main></body></html>';const out=injectHashArticleFix(raw);assert.match(out,/mm-hash-article-fix-script/);assert.match(out,/mm-hash-article-fix-style/);assert.equal(injectHashArticleFix(out),out)});
test('client-side script has valid syntax',()=>{const body=script.replace(/^<script[^>]*>/,'').replace(/<\/script>$/,'');new vm.Script(body)});
test('script is specific to the intended existing article and does not change stored data',()=>{assert.match(script,/mm-editorial-fb17f057e34a2a830d91d723/);assert.match(script,/document\.createElement/);assert.match(script,/MutationObserver/);assert.doesNotMatch(script,/fetch\(|localStorage|innerHTML\s*=/)});
