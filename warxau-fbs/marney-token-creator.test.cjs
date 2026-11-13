'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {handle,PAGE}=require('./marney-token-creator.cjs');
function request(method,url){const result={status:null,headers:null,body:null};result.handled=handle({method,url},{writeHead(code,headers){result.status=code;result.headers=headers},end(body){result.body=body}});return result;}
test('MARNEY community information page replaces public creator',()=>{
 const res=request('GET','/marney-coin');assert.equal(res.handled,true);assert.equal(res.status,200);
 assert.match(res.body,/MARNEY/);assert.match(res.body,/Koin Komunitas MarketMarney/);
 assert.match(res.body,/Solana Devnet/);assert.match(res.body,/Alamat mint/);
 assert.match(res.body,/Belum diterbitkan/);assert.match(res.body,/Belum tersedia untuk perdagangan/);
 assert.equal(request('GET','/token-creator').status,200);
 assert.equal(request('GET','/').handled,false);
 assert.equal(request('GET','/admin').handled,false);
});
test('no purchasing or token creation controls accessible on public page',()=>{
 assert.doesNotMatch(PAGE,/signTransaction|sendRawTransaction|phantom\.solana|createMintToInstruction|Buat Token di Devnet/);
 assert.match(PAGE,/bukan penawaran investasi/i);
 assert.equal(request('GET','/assets/marney-token-creator-client.js').handled,false);
 assert.match(request('GET','/marney-coin').headers['Content-Security-Policy'],/default-src 'none'/);
});
test('HEAD and method safety',()=>{
 assert.equal(request('HEAD','/marney-coin').body,'');
 assert.equal(request('POST','/marney-coin').status,405);
});
