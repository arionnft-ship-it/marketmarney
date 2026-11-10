'use strict';
// Public, content-addressed assets and derived news thumbnails. No writes to /persist.
// Original routes, account data, sessions, private media and gateway headers are untouched.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const APP_ROOT = '/persist/site-r1/MarketMarney-Railway-Staging/app';
const RELEASE = 'news-war-performance-20261108-v1';
const PUBLIC_FILES = new Set([
  ...Array.from({length:10}, (_,i)=>`css-bundle-${String(i+1).padStart(2,'0')}.css`),
  'premium-refinement1855.css','maintenance-1811.css','pivot-center-1818.css',
  'pivot-table-1819.css','pivot-desk-18110.css','pivot-workspace-18111.css',
  'public-theme1867.css','comfort1875.css','social-identity1875.css',
  'social-interactions1877.css','video-previews1880.css','experience1881.css',
  'header-layout-1813.css','header-auth-1833.css','discussion-1828.css',
  'market-live-music-1834.css','news-search1879.css',
  'public-theme1867.js','news-search1879.js','public-ticker1873.js',
  'social-identity1875.js','social-interactions1877.js','video-previews1880.js',
  'pivot-center-1818.js','pivot-desk-18110.js','pivot-workspace-18111.js',
  'discussion-1828.js','header-auth-1833.js','market-live-music-1834.js','experience1881.js'
]);
const IMAGE_NAME = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(?:png|jpe?g|webp)';
const MEDIA_PATH = new RegExp('^/media/('+IMAGE_NAME+')$','i');
const THUMB_PATH = new RegExp('^/assets/news-thumb-v1/(640|1280)/('+IMAGE_NAME+')$','i');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

function acceptsEncoding(header,coding){
  let explicit=null,wildcard=null;
  for(const value of String(header||'').toLowerCase().split(',')){
    const [name,...parameters]=value.trim().split(';').map(s=>s.trim());
    if(name!==coding&&name!=='*')continue;
    const item=parameters.find(s=>/^q\s*=/.test(s));
    const weight=item===undefined?1:Number(item.slice(item.indexOf('=')+1));
    const quality=Number.isFinite(weight)&&weight>=0&&weight<=1?weight:0;
    if(name===coding)explicit=quality;else wildcard=quality;
  }
  return (explicit??wildcard??0)>0;
}

async function readLimited(response, limit) {
  const declared = Number(response.headers.get('content-length'));
  if (declared > limit) { await response.body?.cancel(); throw Error('Response exceeds image limit'); }
  if (!response.body) throw Error('Empty response');
  const chunks=[]; let length=0;
  const reader=response.body.getReader();
  try {
    for (;;) {
      const item=await reader.read(); if(item.done)break;
      length+=item.value.byteLength;
      if(length>limit){await reader.cancel();throw Error('Response exceeds image limit');}
      chunks.push(Buffer.from(item.value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks,length);
}

function createPublicPerformance({appRoot=APP_ROOT,publicOrigin='https://marketmarney.com',fetchImpl=global.fetch,resizeImage}={}) {
  const origin=new URL(publicOrigin).origin;
  const staticAssets=new Map(), files=new Map(), thumbnails=new Map(), pending=new Map();
  let staticBytes=0,thumbBytes=0, allowed=new Set(), catalogAt=0, catalogPending=null, active=0;
  const waiting=[]; const MAX_THUMB_BYTES=32*1024*1024;
  let sharp;

  function newsImageName(value) {
    if(typeof value!=='string')return null;
    try { const u=new URL(value,origin); return u.origin===origin ? MEDIA_PATH.exec(u.pathname)?.[1]||null : null; }
    catch { return null; }
  }

  function snapshotAsset(name) {
    if(!PUBLIC_FILES.has(name))return null;
    const full=path.join(appRoot,'assets',name);
    try {
      const stat=fs.statSync(full);
      if(!stat.isFile()||stat.size>3*1024*1024)return null;
      const prior=files.get(name);
      if(prior&&prior.size===stat.size&&prior.mtime===stat.mtimeMs&&staticAssets.has(prior.url))return prior.url;
      const body=fs.readFileSync(full), digest=hash(body), ext=path.extname(name);
      const url='/assets/mm-perf-v1-'+digest+ext;
      const contentType=ext==='.css'?'text/css; charset=utf-8':'text/javascript; charset=utf-8';
      if(!staticAssets.has(url)){
        const gzip=zlib.gzipSync(body,{level:6}),bytes=body.length+gzip.length;
        while(staticAssets.size>=128||staticBytes+bytes>24*1024*1024){
          const first=staticAssets.keys().next().value;if(first===undefined)break;
          const old=staticAssets.get(first);staticBytes-=old.body.length+old.gzip.length;staticAssets.delete(first);
        }
        staticAssets.set(url,{body,gzip,digest,contentType});staticBytes+=bytes;
      }
      files.set(name,{size:stat.size,mtime:stat.mtimeMs,url});
      return url;
    } catch { return null; }
  }

  function rewriteHomeAssets(html) {
    if(typeof html!=='string')return html;
    // Keep the /assets directory depth, so relative CSS URLs and module imports remain valid.
    return html.replace(/(\b(?:src|href)\s*=\s*)(["'])([^"'<>\s]+)\2/g,(whole,prefix,quote,value)=>{
      let url;try{url=new URL(value,origin);}catch{return whole;}
      if(url.origin!==origin||!/^\/assets\/[^/]+$/.test(url.pathname))return whole;
      const next=snapshotAsset(url.pathname.slice(8));
      return next?prefix+quote+next+quote:whole;
    });
  }

  async function publicCatalog() {
    if(Date.now()-catalogAt<30000)return allowed;
    if(catalogPending)return catalogPending;
    catalogPending=(async()=>{
      const r=await fetchImpl(new URL('/api/content',origin),{redirect:'error',headers:{accept:'application/json'},signal:AbortSignal.timeout(5000)});
      if(!r.ok||r.headers.get('set-cookie')){await r.body?.cancel();throw Error('Public catalog unavailable');}
      const doc=JSON.parse((await readLimited(r,4*1024*1024)).toString('utf8'));
      if(!Array.isArray(doc.articles))throw Error('Unexpected public catalog');
      const next=new Set();
      for(const a of doc.articles){
        if(!a||a.status&&a.status!=='published')continue;
        const name=newsImageName(a.img);if(name)next.add(name);
      }
      allowed=next;catalogAt=Date.now();return allowed;
    })().catch(()=>{allowed=new Set();catalogAt=Date.now()-27000;return allowed;})
      .finally(()=>{catalogPending=null;});
    return catalogPending;
  }

  async function resize(body,width) {
    if(resizeImage)return resizeImage(body,width);
    if(!sharp){sharp=require('sharp');sharp.concurrency(1);sharp.cache({memory:16,files:0,items:32});}
    return sharp(body,{limitInputPixels:24*1024*1024,failOn:'error'})
      .rotate().resize({width,withoutEnlargement:true}).webp({quality:80,effort:3}).toBuffer();
  }

  async function withSlot(fn) {
    if(active>=2)await new Promise(resolve=>waiting.push(resolve));
    active++;
    try{return await fn();}finally{active--;waiting.shift()?.();}
  }

  function remember(key,asset) {
    if(asset.body.length>2*1024*1024)return;
    while(thumbnails.size>=96||thumbBytes+asset.body.length>MAX_THUMB_BYTES){
      const first=thumbnails.keys().next().value;if(first===undefined)break;
      thumbBytes-=thumbnails.get(first).body.length;thumbnails.delete(first);
    }
    thumbnails.set(key,asset);thumbBytes+=asset.body.length;
  }

  async function thumbnail(name,width) {
    const key=width+'/'+name;
    const cached=thumbnails.get(key);
    if(cached){thumbnails.delete(key);thumbnails.set(key,cached);return cached;}
    if(pending.has(key))return pending.get(key);
    if(pending.size>=16)throw Error('Thumbnail queue is full');
    const job=withSlot(async()=>{
      // Public HTTPS only: never use loopback, forwarded credentials, or private file paths.
      const r=await fetchImpl(new URL('/media/'+name,origin),{redirect:'error',headers:{accept:'image/png,image/jpeg,image/webp'},signal:AbortSignal.timeout(10000)});
      if(!r.ok||r.headers.get('set-cookie')||!/^image\/(png|jpe?g|webp)(?:;|$)/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw Error('Public image unavailable');}
      const input=await readLimited(r,10*1024*1024);
      const body=await resize(input,width),asset={body,digest:hash(body),contentType:'image/webp',cacheSeconds:86400};
      remember(key,asset);return asset;
    }).finally(()=>pending.delete(key));
    pending.set(key,job);return job;
  }

  function sendAsset(req,res,asset,{immutable=false}={}) {
    const gzip=asset.gzip&&acceptsEncoding(req.headers['accept-encoding'],'gzip');
    const body=gzip?asset.gzip:asset.body,tag='"'+asset.digest+(gzip?'-gzip':'')+'"';
    const headers={'Content-Type':asset.contentType,'X-Content-Type-Options':'nosniff',
      'Cache-Control':immutable?'public, max-age=31536000, immutable':'public, max-age=3600',
      'ETag':tag,'X-Marney-Performance':RELEASE};
    if(asset.cacheSeconds===86400)headers['Cache-Control']='public, max-age=86400';
    if(asset.gzip)headers.Vary='Accept-Encoding';
    if(gzip)headers['Content-Encoding']='gzip';
    if(req.headers['if-none-match']===tag){res.writeHead(304,headers);res.end();return;}
    headers['Content-Length']=body.length;
    res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
  }

  function empty(res,status){res.writeHead(status,{'Cache-Control':'no-store','Content-Length':0});res.end();}

  function handle(req,res) {
    const pathname=String(req.url||'').split('?')[0];
    if(pathname==='/assets/news-war-performance-version.json'){
      if(!['GET','HEAD'].includes(req.method)){empty(res,405);return true;}
      const body=Buffer.from(JSON.stringify({release:RELEASE}));
      res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store','Content-Length':body.length});
      res.end(req.method==='HEAD'?undefined:body);return true;
    }
    if(/^\/assets\/mm-perf-v1-[a-f0-9]{64}\.(?:js|css)$/.test(pathname)){
      if(!['GET','HEAD'].includes(req.method)){empty(res,405);return true;}
      if(!staticAssets.has(pathname)){for(const name of PUBLIC_FILES)if(snapshotAsset(name)===pathname)break;}
      const asset=staticAssets.get(pathname);
      if(!asset){empty(res,404);return true;}
      sendAsset(req,res,asset,{immutable:true});return true;
    }
    if(!pathname.startsWith('/assets/news-thumb-v1/'))return false;
    if(!['GET','HEAD'].includes(req.method)){empty(res,405);return true;}
    const match=THUMB_PATH.exec(pathname);
    if(!match){empty(res,404);return true;}
    const width=Number(match[1]),name=match[2];
    void (async()=>{
      if(!(await publicCatalog()).has(name)){empty(res,404);return;}
      try {
        const asset=await thumbnail(name,width);
        if(!res.destroyed)sendAsset(req,res,asset);
      } catch {
        // Redirecting keeps the original browser-side media permission checks in place.
        if(!res.destroyed&&!res.headersSent){res.writeHead(302,{'Location':'/media/'+name,'Cache-Control':'no-store','Content-Length':0});res.end();}
      }
    })().catch(()=>{if(!res.destroyed&&!res.headersSent)empty(res,503);});
    return true;
  }
  return {handle,rewriteHomeAssets,snapshotAsset,release:RELEASE};
}
module.exports={createPublicPerformance,PUBLIC_FILES,RELEASE};
