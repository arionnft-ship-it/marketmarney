'use strict';
// Response-only MARNEY branding. Never writes protected app files, accounts or media.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const VERSION = 'marney-20261107-r2';
const APP = '/persist/site-r1/MarketMarney-Railway-Staging/app';
const ROOT = path.join(__dirname, 'marney-brand-assets');
const aliases = new Map([
 ['/assets/brand-logo.png', 'logo.png'], ['/assets/brand-logo.webp', 'logo.webp'],
 ['/assets/embedded-favicon.png', 'favicon.png'], ['/favicon.png', 'favicon.png'],
 ['/favicon.ico', 'favicon.ico'], ['/assets/apple-touch-icon.png', 'apple-touch-icon.png'],
 ['/apple-touch-icon.png', 'apple-touch-icon.png'],
 ['/icons/icon-192.png', 'icon-192.png'], ['/icons/icon-512.png', 'icon-512.png'],
 ['/icons/icon-maskable-192.png', 'icon-maskable-192.png'],
 ['/icons/icon-maskable-512.png', 'icon-maskable-512.png']
]);
const mime = {'.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const CSS = `/* Brand images only: never touch profile uploads, charts or news banners. */
img[data-marney-brand="${VERSION}"]{object-fit:contain!important;object-position:center!important;border-radius:0!important;background:transparent!important;filter:none!important}
picture:has(>img[data-marney-brand="${VERSION}"]){overflow:visible}
.mm46-brand-logo:has(>img[data-marney-brand="${VERSION}"]){background:transparent!important;border-radius:0!important}
`;
const CLIENT = `(function(){'use strict';
const v=${JSON.stringify(VERSION)},paths=new Set(${JSON.stringify([...aliases.keys()])});
function apply(root){
 const nodes=[];if(root.matches&&root.matches('img,picture source,link[rel~="icon"],link[rel="apple-touch-icon"]'))nodes.push(root);
 if(root.querySelectorAll)nodes.push(...root.querySelectorAll('img,picture source,link[rel~="icon"],link[rel="apple-touch-icon"]'));
 for(const el of nodes){const attr=el.tagName==='SOURCE'?'srcset':el.tagName==='LINK'?'href':'src';const old=el.getAttribute(attr);if(!old)continue;
 let u;try{u=new URL(old,location.href);}catch{continue;}if(u.origin!==location.origin||!paths.has(u.pathname))continue;
 if(u.searchParams.get('v')!==v){u.searchParams.set('v',v);el.setAttribute(attr,u.pathname+u.search+u.hash);}
 if(el.tagName==='IMG'&&el.dataset.marneyBrand!==v){el.dataset.marneyBrand=v;if(!el.alt||/logo/i.test(el.alt))el.alt='Logo MARNEY';}
 }
}
function start(){apply(document);let queued=new Set(),scheduled=false;
 new MutationObserver(records=>{for(const r of records){if(r.type==='attributes')queued.add(r.target);else for(const n of r.addedNodes)if(n.nodeType===1)queued.add(n);}
 if(scheduled||!queued.size)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;const batch=queued;queued=new Set();for(const n of batch)if(n.isConnected)apply(n);});})
 .observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset','href']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();`;
function versionURL(s){
 return s.replace(/((?:(?:\.\/|\/)?(?:assets\/(?:brand-logo\.(?:png|webp)|embedded-favicon\.png|apple-touch-icon\.png)|icons\/icon-(?:maskable-)?(?:192|512)\.png|favicon\.(?:png|ico)|manifest\.webmanifest)))(?:\?v=[A-Za-z0-9._-]+)?/g,'$1?v='+VERSION);
}
function enhance(html){
 if(typeof html!=='string'||!/<\/head\s*>/i.test(html)||!/<\/html\s*>/i.test(html))return html;
 if(html.includes('data-marney-brand-release="'+VERSION+'"'))return html;
 let out=versionURL(html);
 out=out.replace(/(<a\b[^>]*class=["'][^"']*\bbrand\b[^"']*["'][^>]*>\s*)<img\b[^>]*src=["']data:image\/[^"']+["'][^>]*>/gi,
  '$1<img src="/assets/brand-logo.webp?v='+VERSION+'" width="40" height="40" alt="Logo MARNEY" data-marney-brand="'+VERSION+'">');
 out=out.replace(/<link\b(?=[^>]*\brel=["'](?:shortcut\s+)?icon["'])(?=[^>]*\bhref=["']data:image\/)[^>]*>/gi,
  '<link rel="icon" type="image/png" href="/favicon.png?v='+VERSION+'">');
 const inject='<link rel="stylesheet" href="/assets/marney-brand.css?v='+VERSION+'" data-marney-brand-release="'+VERSION+'"><script defer src="/assets/marney-brand.js?v='+VERSION+'"></script>';
 return out.replace(/<\/head\s*>/i,inject+'</head>');
}
function createBranding({assetRoot=ROOT,appRoot=APP}={}){
 const assets=new Map();
 for(const [url,file] of aliases){const b=fs.readFileSync(path.join(assetRoot,file));assets.set(url,[b,mime[path.extname(file)]]);}
 assets.set('/assets/marney-brand.css',[Buffer.from(CSS),mime['.css']]);
 assets.set('/assets/marney-brand.js',[Buffer.from(CLIENT),mime['.js']]);
 function handle(req,res){
  const p=String(req.url||'').split('?')[0];let asset=assets.get(p);
  if(!asset&&(p==='/manifest.webmanifest'||p==='/sw.js')){
   let raw=fs.readFileSync(path.join(appRoot,p.slice(1)),'utf8');
   if(p==='/manifest.webmanifest'){
    const doc=JSON.parse(raw);for(const icon of doc.icons||[])if(icon.src)icon.src=versionURL(icon.src);
    raw=JSON.stringify(doc,null,2);asset=[Buffer.from(raw),'application/manifest+json; charset=utf-8'];
   }else{raw=raw.replace(/const CACHE\s*=\s*(['"])[^'"]+\1/,"const CACHE='marketmarney-offline-"+VERSION+"'");asset=[Buffer.from(raw),mime['.js']];}
  }
  if(!asset)return false;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
  const tag='"'+crypto.createHash('sha256').update(asset[0]).digest('hex')+'"';
  const headers={'Content-Type':asset[1],'Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','ETag':tag,'X-Marney-Brand':VERSION};
  if(p==='/sw.js')headers['Service-Worker-Allowed']='/';
  if(req.headers['if-none-match']===tag){res.writeHead(304,headers);res.end();return true;}
  headers['Content-Length']=asset[0].length;res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:asset[0]);return true;
 }
 function wrap(req,res){
  const p=String(req.url||'').split('?')[0];
  if(req.method!=='GET'||/^\/(?:api|auth|_railway|media|uploads)(?:\/|$)/.test(p)||!(p==='/'||p.endsWith('.html')))return;
  req.headers['accept-encoding']='identity';
  const original={writeHead:res.writeHead,write:res.write,end:res.end};let queuedHead=false,pass=false,size=0;const chunks=[],MAX=6*1024*1024;
  function restore(){Object.assign(res,original);}
  function ok(){return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!res.getHeader('content-type')||/^text\/html\b/i.test(String(res.getHeader('content-type'))));}
  function head(){if(queuedHead&&!res.headersSent){queuedHead=false;original.writeHead.call(res,res.statusCode);}}
  function flush(){head();for(const b of chunks)original.write.call(res,b);chunks.length=0;}
  res.writeHead=function(status,message,headers){
   if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments);}
   const h=typeof message==='string'?headers:message;
   if(Array.isArray(h)){for(let i=0;i<h.length;i+=2)this.setHeader(h[i],h[i+1]);}
   else if(h)for(const [k,v]of Object.entries(h))this.setHeader(k,v);
   this.statusCode=status;if(typeof message==='string')this.statusMessage=message;queuedHead=true;return this;
  };
  res.write=function(chunk,encoding,callback){
   if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
   const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');
   if(pass||!ok()||size+b.length>MAX){pass=true;flush();restore();return original.write.call(this,b,callback);}
   chunks.push(b);size+=b.length;if(typeof callback==='function')process.nextTick(callback);return true;
  };
  res.end=function(chunk,encoding,callback){
   if(typeof chunk==='function'){callback=chunk;chunk=undefined;}else if(typeof encoding==='function'){callback=encoding;encoding=undefined;}
   if(pass){restore();return original.end.call(this,chunk,encoding,callback);}
   if(chunk!=null){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk,encoding||'utf8');chunks.push(b);size+=b.length;}
   if(!ok()||size>MAX){flush();restore();return original.end.call(this,callback);}
   const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),changed=enhance(raw);
   const out=changed===raw?data:Buffer.from(changed);
   if(changed!==raw){this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',out.length);this.setHeader('X-Marney-Brand',VERSION);}
   chunks.length=0;head();restore();return original.end.call(this,out,callback);
  };
 }
 return {handle,wrap,version:VERSION};
}
module.exports={createBranding,enhance,versionURL,VERSION,aliases,CLIENT,CSS};
