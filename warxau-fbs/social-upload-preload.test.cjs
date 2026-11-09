'use strict';
const assert = require('node:assert/strict');
process.env.MM_SOCIAL_UPLOAD_PROBE = '0';
const policy = require('./social-upload-preload.cjs');

assert.equal(policy.MAX_FILE_BYTES, 104857600);
assert.equal(policy.MAX_REQUEST_BYTES, 115343360);
assert.match(policy.CLIENT, /Maksimal 100 MB per file/);
assert.match(policy.CLIENT, /104857600/);
assert.match(policy.CLIENT, /body instanceof File\|\|body instanceof Blob/);
assert.equal(policy.isLikelyUpload({method:'POST',headers:{'content-type':'multipart/form-data; boundary=x'}},'/api/story'),true);
assert.equal(policy.isLikelyUpload({method:'POST',headers:{'content-type':'video/mp4'}},'/api/trader-profiles/video'),true);
assert.equal(policy.isLikelyUpload({method:'POST',headers:{'content-type':'image/webp'}},'/api/trader-profiles/image'),true);
assert.equal(policy.isLikelyUpload({method:'GET',headers:{'content-type':'multipart/form-data'}},'/api/story'),false);
assert.match(policy.versionSocialAssets('<script src="/assets/social-home-1846.js"></script>'),/social-home-1846\.js\?v=mm-social-upload-100mb-20261109-v3/);

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
  const req={method:'POST',url:'/api/trader-profiles/video?kind=reel',headers:{'content-type':'video/mp4','content-length':String(100*1024*1024)}};
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
  res.end('<!doctype html><html><body><p>Foto maks. 2 MB • Video MP4 maks. 12 MB</p><script src="/assets/social-home-1846.js"></script></body></html>');
  const body=res.body();
  assert.match(body,/Maksimal 100 MB per file/);
  assert.match(body,/mm-social-upload-100mb\.js/);
  assert.match(body,/social-home-1846\.js\?v=mm-social-upload-100mb-20261109-v3/);
  assert.equal(Number(res.getHeader('x-marketmarney-upload-limit')),104857600);
  assert.match(res.getHeader('cache-control'),/no-store/);
}

console.log(JSON.stringify({ok:true,maxFileBytes:policy.MAX_FILE_BYTES,maxRequestBytes:policy.MAX_REQUEST_BYTES,cacheBust:policy.CACHE_BUST}));
