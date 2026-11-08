'use strict';
const assert = require('node:assert/strict');
process.env.MM_SOCIAL_UPLOAD_PROBE = '0';
const policy = require('./social-upload-preload.cjs');

assert.equal(policy.MAX_FILE_BYTES, 104857600);
assert.equal(policy.MAX_REQUEST_BYTES, 115343360);
assert.match(policy.CLIENT, /Maksimal 100 MB per file/);
assert.match(policy.CLIENT, /104857600/);
assert.equal(policy.isLikelyUpload({method:'POST',headers:{'content-type':'multipart/form-data; boundary=x'}},'/api/story'),true);
assert.equal(policy.isLikelyUpload({method:'GET',headers:{'content-type':'multipart/form-data'}},'/api/story'),false);

function response(){
  const headers=new Map();
  const chunks=[];
  return {
    statusCode:200,headersSent:false,chunks,
    setHeader(k,v){headers.set(String(k).toLowerCase(),v)},
    getHeader(k){return headers.get(String(k).toLowerCase())},
    removeHeader(k){headers.delete(String(k).toLowerCase())},
    writeHead(status,values){this.statusCode=status;if(values)for(const [k,v]of Object.entries(values))this.setHeader(k,v);this.headersSent=true;return this},
    write(chunk){chunks.push(Buffer.from(chunk));return true},
    end(chunk){if(chunk!=null)chunks.push(Buffer.from(chunk));this.ended=true;return this},
    body(){return Buffer.concat(chunks).toString('utf8')}
  };
}

{
  const req={method:'GET',headers:{}};const res=response();
  assert.equal(policy.sendAsset(req,res),true);
  assert.equal(res.statusCode,200);
  assert.match(res.getHeader('content-type'),/text\/javascript/);
  assert.match(res.body(),/MarketMarneyUploadPolicy/);
}

{
  const req={method:'POST',url:'/api/story/upload',headers:{'content-type':'multipart/form-data; boundary=x','content-length':String(111*1024*1024)}};
  const res=response();
  assert.equal(policy.rejectOversizeRequest(req,res),true);
  assert.equal(res.statusCode,413);
  assert.match(res.body(),/MEDIA_TOO_LARGE/);
}

{
  const req={method:'POST',url:'/api/story/upload',headers:{'content-type':'multipart/form-data; boundary=x','content-length':String(100*1024*1024)}};
  const res=response();
  assert.equal(policy.rejectOversizeRequest(req,res),false);
}

{
  const req={method:'GET',url:'/beranda-trader.html',headers:{}};
  const res=response();
  res.headersSent=false;
  policy.wrapSocialHtml(req,res);
  res.setHeader('content-type','text/html; charset=utf-8');
  res.writeHead(200);
  res.end('<!doctype html><html><body><p>Foto maks. 2 MB • Video MP4 maks. 12 MB</p></body></html>');
  const body=res.body();
  assert.match(body,/Maksimal 100 MB per file/);
  assert.match(body,/mm-social-upload-100mb\.js/);
  assert.equal(Number(res.getHeader('x-marketmarney-upload-limit')),104857600);
}

console.log(JSON.stringify({ok:true,maxFileBytes:policy.MAX_FILE_BYTES,maxRequestBytes:policy.MAX_REQUEST_BYTES}));
