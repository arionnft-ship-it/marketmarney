'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {FILENAME,ROUTE,BODY,handle}=require('./google-site-verification.cjs');
function response(){return {status:null,headers:null,body:null,writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};}
test('verified Google HTML challenge matches the uploaded token',()=>{
  assert.equal(FILENAME,'google8fcf862d11683012.html');
  assert.equal(BODY.toString('utf8').trim(),'google-site-verification: google8fcf862d11683012.html');
});
test('serves only the requested exact verification file, with no application state changes',()=>{
  const r=response();
  assert.equal(handle({url:ROUTE,method:'GET'},r),true);
  assert.equal(r.status,200);
  assert.equal(r.body.toString('utf8').trim(),BODY.toString('utf8').trim());
  assert.equal(r.headers['Content-Length'],BODY.length);
  assert.match(r.headers['Content-Type'],/^text\/html/);
});
test('supports HEAD and ignores unrelated routes including auth and analytics',()=>{
  const h=response();
  assert.equal(handle({url:ROUTE+'?source=google',method:'HEAD'},h),true);
  assert.equal(h.status,200);
  assert.equal(h.body,undefined);
  for(const url of ['/','/api/content','/admin.html','/login.html','/berita/sample','/google8fcf862d11683012.html/','/othergoogle.html']){
    const r=response();
    assert.equal(handle({url,method:'GET'},r),false,url);
    assert.equal(r.status,null,url);
  }
});
test('blocks methods other than GET and HEAD',()=>{
  const r=response();
  assert.equal(handle({url:ROUTE,method:'POST'},r),true);
  assert.equal(r.status,405);
  assert.equal(r.headers.Allow,'GET, HEAD');
});
