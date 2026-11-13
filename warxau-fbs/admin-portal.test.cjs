'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {handle}=require('./admin-portal.cjs');
function call(method,url){const result={status:null,headers:null,body:null};const res={writeHead(code,headers){result.status=code;result.headers=headers},end(body){result.body=body??''}};result.handled=handle({method,url},res);return result}
test('admin portal GET is available without exposing any privileged data',()=>{const r=call('GET','/admin');assert.equal(r.handled,true);assert.equal(r.status,200);assert.match(r.body,/api\/admin\/content/);assert.match(r.body,/credentials:'same-origin'/);assert.match(r.body,/Sesi admin|izin admin|autentikasi admin/i);assert.equal(r.headers['Cache-Control'],'no-store')});
test('admin portal HEAD contains no body',()=>{const r=call('HEAD','/admin/');assert.equal(r.status,200);assert.equal(r.body,'')});
test('admin portal does not intercept public routes',()=>{assert.equal(call('GET','/').handled,false);assert.equal(call('GET','/api/admin/content').handled,false);assert.equal(call('GET','/berita').handled,false)});
test('admin portal does not accept write requests',()=>{const r=call('POST','/admin');assert.equal(r.status,405);assert.equal(r.headers.Allow,'GET, HEAD')});
