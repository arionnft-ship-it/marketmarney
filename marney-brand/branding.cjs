'use strict';
const googleVerification=require('./google-site-verification.cjs');
// Response-only MARNEY branding. No protected app files, accounts or media are written.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const SEO=require('./seo.cjs');
const {createPublicPerformance}=require(fs.existsSync(path.join(__dirname,'performance-runtime.cjs'))?'./performance-runtime.cjs':'../warxau-fbs/performance-runtime.cjs');
const VERSION='marney-20261107-r2';
const APP='/persist/site-r1/MarketMarney-Railway-Staging/app';
const ROOT=path.join(__dirname,'marney-brand-assets');
const aliases=new Map([
 ['/assets/brand-logo.png','logo.png'],['/assets/brand-logo.webp','logo.webp'],
 ['/assets/embedded-favicon.png','favicon.png'],['/favicon.png','favicon.png'],
 ['/favicon.ico','favicon.ico'],['/assets/apple-touch-icon.png','apple-touch-icon.png'],
 ['/apple-touch-icon.png','apple-touch-icon.png'],['/icons/icon-192.png','icon-192.png'],
 ['/icons/icon-512.png','icon-512.png'],['/icons/icon-maskable-192.png','icon-maskable-192.png'],
 ['/icons/icon-maskable-512.png','icon-maskable-512.png']
]);
const mime={'.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const CSS=`img[data-marney-brand="${VERSION}"]{object-fit:contain!important;object-position:center!important;border-radius:0!important;background:transparent!important;filter:none!important}
picture:has(>img[data-marney-brand="${VERSION}"]){overflow:visible}
.mm46-brand-logo:has(>img[data-marney-brand="${VERSION}"]){background:transparent!important;border-radius:0!important}`;
const CLIENT=`(function(){'use strict';
const v=${JSON.stringify(VERSION)},paths=new Set(${JSON.stringify([...aliases.keys()])});
function apply(root){
 const selector='img,picture source,link[rel~="icon"],link[rel="apple-touch-icon"]',nodes=[];
 if(root.matches&&root.matches(selector))nodes.push(root);
 if(root.querySelectorAll)nodes.push(...root.querySelectorAll(selector));
 for(const el of nodes){const attr=el.tagName==='SOURCE'?'srcset':el.tagName==='LINK'?'href':'src',old=el.getAttribute(attr);if(!old)continue;
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
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();})();`;
function versionURL(s){return s.replace(/((?:(?:\.\/|\/)?(?:assets\/(?:brand-logo\.(?:png|webp)|embedded-favicon\.png|apple-touch-icon\.png)|icons\/icon-(?:maskable-)?(?:192|512)\.png|favicon\.(?:png|ico)|manifest\.webmanifest)))(?:\?v=[A-Za-z0-9._-]+)?/g,'$1?v='+VERSION);}
function enhance(html){
 if(typeof html!=='string'||!/<html\b/i.test(html)||!/<\/html\s*>/i.test(html))return html;
 if(html.includes('data-marney-brand-release="'+VERSION+'"'))return html;
 let out=versionURL(html);
 out=out.replace(/(<a\b[^>]*class=["'][^"']*\bbrand\b[^"']*["'][^>]*>\s*)<img\b[^>]*src=["']data:image\/[^"']+["'][^>]*>/gi,'$1<img src="/assets/brand-logo.webp?v='+VERSION+'" width="40" height="40" alt="Logo MARNEY" data-marney-brand="'+VERSION+'">');
 out=out.replace(/<link\b(?=[^>]*\brel=["'](?:shortcut\s+)?icon["'])(?=[^>]*\bhref=["']data:image\/)[^>]*>/gi,'<link rel="icon" type="image/png" href="/favicon.png?v='+VERSION+'">');
 const inject='<link rel="stylesheet" href="/assets/marney-brand.css?v='+VERSION+'" data-marney-brand-release="'+VERSION+'"><script defer src="/assets/marney-brand.js?v='+VERSION+'"></script>';
 if(/<\/head\s*>/i.test(out))return out.replace(/<\/head\s*>/i,inject+'</head>');
 return out.replace(/(<(?:body|main|header|div)\b)/i,inject+'$1');
}
function createBranding({assetRoot=ROOT,appRoot=APP}={}){
 const performance=createPublicPerformance({appRoot});
 const assets=new Map();for(const [url,file]of aliases)assets.set(url,[fs.readFileSync(path.join(assetRoot,file)),mime[path.extname(file)]]);
 assets.set('/assets/marney-brand.css',[Buffer.from(CSS),mime['.css']]);assets.set('/assets/marney-brand.js',[Buffer.from(CLIENT),mime['.js']]);
 function handle(req,res){
  if(googleVerification.handle(req,res))return true;
  const p=String(req.url||'').split('?')[0];
  if(p==='/robots.txt'&&SEO.isPublicHost(req.headers.host))return SEO.sendRobots(req,res);
  if(performance.handle(req,res))return true;
  let asset=assets.get(p);
  if(!asset&&(p==='/manifest.webmanifest'||p==='/sw.js')){
   let raw=fs.readFileSync(path.join(appRoot,p.slice(1)),'utf8');
   if(p==='/manifest.webmanifest'){
    const doc=JSON.parse(raw);for(const icon of doc.icons||[])if(icon.src)icon.src=versionURL(icon.src);
    asset=[Buffer.from(JSON.stringify(doc,null,2)),'application/manifest+json; charset=utf-8'];
   }else{
    raw=raw.replace(/const CACHE\s*=\s*(['"])[^'"]+\1/,"const CACHE='marketmarney-offline-"+VERSION+"'");
    const extra=['/assets/brand-logo.webp','/assets/marney-brand.css','/assets/marney-brand.js'].map(u=>u+'?v='+VERSION);
    raw=raw.replace(/const CORE\s*=\s*\[([^\]]*)\]/,(_,list)=>'const CORE=['+list+','+extra.map(JSON.stringify).join(',')+']');
    asset=[Buffer.from(raw),mime['.js']];
   }
  }
  if(!asset)return false;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return true;}
  const tag='"'+crypto.createHash('sha256').update(asset[0]).digest('hex')+'"';
  const h={'Content-Type':asset[1],'Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','ETag':tag,'X-Marney-Brand':VERSION};
  if(p==='/sw.js')h['Service-Worker-Allowed']='/';
  if(req.headers['if-none-match']===tag){res.writeHead(304,h);res.end();return true;}
  h['Content-Length']=asset[0].length;res.writeHead(200,h);res.end(req.method==='HEAD'?undefined:asset[0]);return true;
 }
 function wrap(req,res){
  const p=String(req.url||'').split('?')[0];
  const seoEnabled=SEO.isPublicPage(req,p);
  if(req.method!=='GET'||/^\/(?:api|auth|_railway|media|uploads)(?:\/|$)/.test(p)||!(p==='/'||p.endsWith('.html')||seoEnabled))return;
  req.headers['accept-encoding']='identity';
  const original={writeHead:res.writeHead,write:res.write,end:res.end};let queuedHead=false,pass=false,size=0;const chunks=[],MAX=6*1024*1024;
  function restore(){Object.assign(res,original);}
  function ok(){return !res.headersSent&&res.statusCode===200&&!res.getHeader('content-encoding')&&(!res.getHeader('content-type')||/^text\/html\b/i.test(String(res.getHeader('content-type'))));}
  function head(){if(queuedHead&&!res.headersSent){queuedHead=false;original.writeHead.call(res,res.statusCode);}}
  function flush(){head();for(const b of chunks)original.write.call(res,b);chunks.length=0;}
  res.writeHead=function(status,message,headers){
   if(pass||status!==200){pass=true;flush();restore();return original.writeHead.apply(this,arguments);}
   const h=typeof message==='string'?headers:message;
   if(Array.isArray(h)){for(let i=0;i<h.length;i+=2)this.setHeader(h[i],h[i+1]);}else if(h)for(const [k,v]of Object.entries(h))this.setHeader(k,v);
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
   const data=Buffer.concat(chunks,size),raw=data.toString('utf8'),changed=enhance(raw),out=changed===raw?data:Buffer.from(changed);
   const seoHtml=SEO.patchHtml(out.toString('utf8'),p,seoEnabled),final=seoHtml===out.toString('utf8')?out:Buffer.from(seoHtml);
   if(seoEnabled)SEO.clearBlockingHeader(this);
   if(final!==data){this.removeHeader('etag');this.removeHeader('content-md5');this.removeHeader('transfer-encoding');this.setHeader('content-length',final.length);this.setHeader('X-Marney-Brand',VERSION);}
   chunks.length=0;head();restore();return original.end.call(this,final,callback);
  };
 }
 return {handle,wrap,version:VERSION,optimizeHome:performance.rewriteHomeAssets};
}
module.exports={createBranding,enhance,versionURL,VERSION,aliases,CLIENT,CSS};
