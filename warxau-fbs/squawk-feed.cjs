'use strict';
// Opt-in, LICENSED external Audio Squawk feeds only. Never reads the MarketMarney article database.
const crypto=require('node:crypto');
const API_PATH='/api/marketmarney/headlines';
function providerFor(host){
 const h=String(host||'').toLowerCase();
 if(h==='newsquawk.com'||h.endsWith('.newsquawk.com'))return 'Newsquawk';
 if(h==='financialjuice.com'||h.endsWith('.financialjuice.com'))return 'FinancialJuice';
 return null;
}
function checkedUrl(value){
 if(typeof value!=='string'||value.length<15||value.length>1200)throw Error('squawk_url_missing');
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!providerFor(u.hostname))throw Error('squawk_url_not_allowlisted');
 return u;
}
function decodeXml(s){
 return String(s||'').replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/,'$1').replace(/&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|lt|gt);/gi,(_,entity)=>{
  const e=entity.toLowerCase();const names={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
  if(Object.hasOwn(names,e))return names[e];
  const num=e.startsWith('#x')?parseInt(e.slice(2),16):parseInt(e.slice(1),10);
  return num>0&&num<=0x10ffff&&!(num>=0xd800&&num<=0xdfff)?String.fromCodePoint(num):'';
 });
}
function xmlValue(block,tag){
 const m=new RegExp('<(?:[\\w-]+:)?'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+tag+'>','i').exec(block);
 return m?decodeXml(m[1]).replace(/<[^>]+>/g,'').trim():'';
}
function parseFeed(raw,type){
 const text=String(raw||'').trim();
 if(!text||text.length>600000)throw Error('squawk_bad_feed_size');
 if(String(type).includes('json')||/^[\[{]/.test(text)){
  const obj=JSON.parse(text);
  const items=Array.isArray(obj)?obj:obj?.headlines??obj?.items??obj?.data?.items??obj?.data;
  if(!Array.isArray(items))throw Error('squawk_bad_json_schema');
  return items;
 }
 if(!/^<(?:\?xml|rss|feed|rdf:RDF)/i.test(text))throw Error('squawk_unsupported_feed_type');
 const items=[];
 for(const node of text.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
  const body=node[1];
  items.push({title:xmlValue(body,'title'),url:xmlValue(body,'link'),date:xmlValue(body,'pubDate')});
  if(items.length>=60)break;
 }
 if(!items.length){
  for(const node of text.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)){
   const body=node[1],link=/<link\s+[^>]*href=["']([^"']+)["']/i.exec(body);
   items.push({title:xmlValue(body,'title'),url:link?decodeXml(link[1]):xmlValue(body,'link'),date:xmlValue(body,'updated')});
   if(items.length>=60)break;
  }
 }
 return items;
}
function normalize(entry,source){
 if(!entry||typeof entry!=='object')return null;
 const title=String(entry.title??entry.headline??entry.text??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 if(title.length<10||title.length>600)return null;
 let link;
 try{link=new URL(String(entry.url??entry.link??entry.permalink??''),source)}catch{return null}
 if(link.protocol!=='https:'||link.username||link.password||link.port||providerFor(link.hostname)!==providerFor(source.hostname))return null;
 const ts=Date.parse(String(entry.date??entry.publishedAt??entry.pubDate??entry.time??''));
 return {id:crypto.createHash('sha256').update(link.href+'|'+title).digest('hex').slice(0,24),
  title:title.slice(0,220),url:link.href,category:String(entry.category??'MARKET').slice(0,24),
  date:Number.isFinite(ts)?new Date(ts).toISOString():null};
}
function createNewsTicker({
 feedUrl=process.env.MM_SQUAWK_FEED_URL||'',
 licensed=process.env.MM_SQUAWK_REDISTRIBUTION_AUTHORIZED==='true',
 apiToken=process.env.MM_SQUAWK_API_TOKEN||'',
 fetchImpl=global.fetch,now=Date.now,cacheMs=60000
}={}){
 let cached=null,pending=null;
 async function snapshot(){
  if(cached&&now()-cached.at<cacheMs)return cached;
  if(pending)return pending;
  pending=(async()=>{
   let response;
   if(!feedUrl||!licensed){
    response={ok:false,status:'not_connected',source:'Audio Squawk',headlines:[]};
   }else{
    const providerUrl=checkedUrl(feedUrl);
    const headers={accept:'application/json, application/rss+xml, application/xml, text/xml'};
    if(apiToken)headers.authorization='Bearer '+apiToken;
    const r=await fetchImpl(providerUrl.href,{redirect:'error',headers,signal:AbortSignal.timeout(8000)});
    if(r.status!==200)throw Error('squawk_provider_status_'+r.status);
    if(Number(r.headers?.get?.('content-length')||0)>600000)throw Error('squawk_content_too_large');
    const rows=parseFeed(await r.text(),r.headers?.get?.('content-type')||'');
    const used=new Set(),headlines=[];
    for(const row of rows.slice(0,75)){
     const v=normalize(row,providerUrl);if(!v||used.has(v.id))continue;
     used.add(v.id);headlines.push(v);
     if(headlines.length===12)break;
    }
    response={ok:true,status:'connected',source:providerFor(providerUrl.hostname),headlines};
   }
   const body=JSON.stringify(response),etag='"'+crypto.createHash('sha256').update(body).digest('hex').slice(0,24)+'"';
   cached={at:now(),body,etag,connected:response.ok};return cached;
  })().finally(()=>{pending=null});
  return pending;
 }
 function owns(req){return !!req&&['GET','HEAD'].includes(req.method)&&String(req.url||'').split('?')[0]===API_PATH;}
 async function handle(req,res){
  if(!owns(req))return false;
  try{
   const feed=await snapshot(),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=20','ETag':feed.etag,'X-Content-Type-Options':'nosniff','X-Squawk-Connected':String(feed.connected)};
   if(req.headers?.['if-none-match']===feed.etag){res.writeHead(304,headers);res.end();return true;}
   res.writeHead(200,headers);res.end(req.method==='HEAD'?'':feed.body);return true;
  }catch(err){
   console.error('MM_SQUAWK_FEED_UNAVAILABLE',String(err?.message||'unknown').slice(0,90));
   res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(req.method==='HEAD'?'':JSON.stringify({ok:false,status:'unavailable',source:'Audio Squawk',headlines:[]}));return true;
  }
 }
 return {owns,handle};
}
module.exports={API_PATH,providerFor,checkedUrl,parseFeed,normalize,createNewsTicker};
