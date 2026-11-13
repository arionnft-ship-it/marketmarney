'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {handle,PAGE,CLIENT}=require('./marney-token-creator.cjs');
function request(method,url){const r={status:null,headers:null,body:null};r.handled=handle({method,url},{writeHead(status,headers){r.status=status;r.headers=headers},end(body){r.body=body}});return r}
test('Devnet page only handles dedicated routes',()=>{
 const p=request('GET','/token-creator');assert.equal(p.handled,true);assert.equal(p.status,200);
 assert.match(p.body,/Solana Devnet/);assert.match(p.body,/Meta[data ]/i);
 assert.match(p.body,/Hubungkan Phantom/);assert.match(p.body,/belum menjadi metadata on-chain/);
 assert.match(p.headers['Content-Security-Policy'],/https:\/\/api\.devnet\.solana\.com/);
 assert.equal(request('GET','/').handled,false);
 assert.equal(request('GET','/admin').handled,false);
 assert.equal(request('GET','/api/integrations/articles').handled,false);
});
test('asset served with correct MIME and no store',()=>{const r=request('GET','/assets/marney-token-creator-client.js');assert.equal(r.status,200);assert.match(r.headers['Content-Type'],/javascript/);assert.match(r.body,/signTransaction/);assert.match(r.body,/sendRawTransaction/);assert.match(r.body,/devnet\.solana\.com/);assert.equal(r.headers['Cache-Control'],'no-store')});
test('no private key upload, wallet signs, only Devnet RPC',()=>{
 assert.doesNotMatch(CLIENT,/mainnet-beta|sendAndConfirmTransaction|wallet\.secretKey|localStorage|sessionStorage|seed phrase\W*[=:]/i);
 assert.match(CLIENT,/tx\.partialSign\(mint\)/);
 assert.match(CLIENT,/wallet\.signTransaction\(tx\)/);
 assert.match(CLIENT,/conn\.sendRawTransaction\(signed\.serialize\(\)/);
 assert.match(CLIENT,/createSetAuthorityInstruction/);
 assert.match(PAGE,/belum menjadi metadata on-chain/);
});
test('HEAD and method handling',()=>{assert.equal(request('HEAD','/token-creator').body,'');assert.equal(request('POST','/token-creator').status,405)});
