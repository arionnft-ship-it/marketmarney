'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {PAGE,handle}=require('./marney-whitepaper.cjs');
const {PAGE:coinPage}=require('./marney-token-creator.cjs');
function response(method,path){const result={};result.handled=handle({method,url:path},{writeHead(status,headers){result.status=status;result.headers=headers;},end(body){result.body=body??'';}});return result;}
test('whitepaper route is published and properly scoped',()=>{
 const r=response('GET','/marney-coin/whitepaper');
 assert.equal(r.handled,true);assert.equal(r.status,200);
 assert.match(r.body,/Perjalanan MarketMarney/);assert.match(r.body,/Whitepaper MARNEY/);
 assert.match(r.body,/KabarKapital/);assert.match(r.body,/MarketMarney TV/);
 assert.match(r.body,/Belum diterbitkan/);assert.match(r.body,/Risiko dan Keamanan/);
 assert.match(r.body,/Versi 0.1/);assert.match(r.body,/Solana Devnet/);
 assert.match(r.headers['Content-Security-Policy'],/default-src 'none'/);
 assert.equal(response('GET','/marney-coin').handled,false);
 assert.equal(response('GET','/').handled,false);
 assert.equal(response('HEAD','/marney-coin/whitepaper').body,'');
 assert.equal(response('POST','/marney-coin/whitepaper').status,405);
});
test('coin menu links to whitepaper and does not claim launch',()=>{
 assert.match(coinPage,/href="\/marney-coin\/whitepaper"/);
 assert.match(coinPage,/Baca Whitepaper MARNEY/);
 assert.match(coinPage,/Konsep dan pengembangan/);
 assert.doesNotMatch(PAGE,/signTransaction\(|sendRawTransaction\(|presale\s+aktif/i);
});
