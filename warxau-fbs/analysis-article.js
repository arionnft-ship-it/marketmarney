/* MarketMarney public analysis readability — display only, no stored content writes. */
(function(root,factory){
'use strict';
const api=factory();
if(typeof module==='object'&&module.exports)module.exports=api;
if(typeof document!=='undefined'){
 const start=()=>api.mount(document,root.location&&root.location.pathname||'');
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PATH=/^\/berita\/mm-analysis-[a-f0-9-]{32,36}(?:\/[a-z0-9-]*)?\/?$/i;
const PREFIX=/^ANALISA MARKET\s*\|\s*[^|\n]{2,40}\|\s*(?:M5|M15|H1|H4|D1|W1)\s*\|\s*(?:NETRAL|BULLISH|BEARISH)\s*/i;
const META=/^(.{2,32}?)\s*[·|]\s*(M5|M15|H1|H4|D1|W1)\s*[·|]\s*(NETRAL|BULLISH|BEARISH)\s*(?:[—–-]\s*)?/i;
const TAGS=/(?:^|\s)(#[A-Za-z][A-Za-z0-9_-]{0,49})\b/g;
const MARKERS=/(🔴\s*(?:Resistance|Supply)\s*:|🟢\s*(?:Support|Demand)\s*:|[1-9]\uFE0F?\u20E3|📌)/gu;
const compact=s=>String(s||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const str=s=>String(s||'').replace(/\u00a0/g,' ').trim();
function removeRepeatedTitle(s,title){
 let x=str(s),t=str(title);
 if(t&&x.slice(0,t.length).toLowerCase()===t.toLowerCase())x=x.slice(t.length).replace(/^[\s|:–—-]+/,'').trim();
 return x;
}
function parse(input){
 const title=str(input?.title),summaryRaw=compact(input?.summary);
 let body=str(input?.body);
 if(!title||!body||body.length>50000||summaryRaw.length>2000||!PREFIX.test(body))return null;
 let metadata=summaryRaw.match(META);
 if(!metadata)metadata=body.match(/^ANALISA MARKET\s*\|\s*([^|\n]{2,40})\|\s*(M5|M15|H1|H4|D1|W1)\s*\|\s*(NETRAL|BULLISH|BEARISH)/i);
 let summary=removeRepeatedTitle(metadata?summaryRaw.slice(metadata[0].length).trim():summaryRaw,title).replace(/^[|:–—\s]+/,'');
 if(summary.length>1000)summary='';
 const tags=[...new Set([...body.matchAll(TAGS)].map(m=>m[1]))].slice(0,14);
 const disc=body.match(/(?:Disclaimer|Penafian)\s*:\s*([\s\S]*)$/i);
 const disclaimer=disc?compact(disc[1].replace(TAGS,' ')):'Analisis ini bersifat edukatif dan bukan rekomendasi investasi. Harga dapat berubah sewaktu-waktu.';
 if(disc)body=body.slice(0,disc.index);
 body=removeRepeatedTitle(body.replace(TAGS,' ').replace(/\bBukan rekomendasi investasi\.\s*/gi,' ').replace(PREFIX,'').replace(/^[📊\s]+/u,'').trim(),title);
 if(!body)return null;
 const marks=[...body.matchAll(MARKERS)],blocks=[];
 if(!marks.length){for(const part of body.split(/\n{2,}/).map(compact).filter(Boolean))blocks.push({type:'paragraph',heading:'',text:part});}
 else{
  let cursor=0,type='paragraph',heading='';
  const push=part=>{
   const s=compact(part);if(!s)return;
   if(type==='scenario'){
    const idx=s.search(/\bUtamakan konfirmasi\b/i);
    if(idx>12){blocks.push({type,heading,text:s.slice(0,idx).trim()});blocks.push({type:'note',heading:'Catatan Analisa',text:s.slice(idx).trim()});return;}
   }
   blocks.push({type,heading,text:s});
  };
  for(const m of marks){
   push(body.slice(cursor,m.index));
   const key=m[0].trim();
   if(key.startsWith('🔴')){type='level';heading=/Supply/i.test(key)?'Supply / Resistance':'Resistance';}
   else if(key.startsWith('🟢')){type='level';heading=/Demand/i.test(key)?'Demand / Support':'Support';}
   else if(key.startsWith('📌')){type='note';heading='Catatan Analisa';}
   else{type='scenario';heading='Skenario '+key.match(/[1-9]/)[0];}
   cursor=m.index+m[0].length;
  }
  push(body.slice(cursor));
 }
 if(summary&&blocks[0]&&blocks[0].type==='paragraph'&&compact(blocks[0].text)===compact(summary))blocks.shift();
 if(!blocks.length&&!summary)return null;
 return {pair:metadata?compact(metadata[1]):'',timeframe:metadata?metadata[2].toUpperCase():'',bias:metadata?metadata[3].toUpperCase():'',summary,blocks,tags,disclaimer};
}
function val(n){return str(n&&(n.innerText||n.textContent));}
function el(doc,tag,cls,content){
 const x=doc.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=String(content);return x;
}
function mount(doc,pathname){
 if(!PATH.test(pathname)||doc.getElementById('mm-analysis-readable-v1'))return false;
 const main=doc.querySelector('main:not(#app)')||doc.querySelector('main');
 const title=main?.querySelector('h1');if(!title)return false;
 const paragraphs=[...main.querySelectorAll('p')],start=paragraphs.find(p=>PREFIX.test(val(p)));
 if(!start)return false;
 const idx=paragraphs.indexOf(start),summaryP=paragraphs.slice(0,idx).reverse().find(p=>META.test(val(p))||p.querySelector('strong'));
 const relevant=[start];let next=start.nextElementSibling;
 for(let i=0;i<22&&next&&next.tagName==='P';i++,next=next.nextElementSibling){
  const t=val(next);
  if(!t||/^(?:Buka di portal|Bagikan artikel|Baca juga|Artikel terkait|WhatsApp)/i.test(t))break;
  relevant.push(next);
  if(/(?:Disclaimer|Penafian)\s*:/i.test(t))break;
 }
 const parsed=parse({title:val(title),summary:summaryP?val(summaryP):'',body:relevant.map(p=>p.innerText||p.textContent||'').join('\n\n')});
 if(!parsed)return false; // Fail open. The original article stays visible.
 const panel=el(doc,'section','mm-analysis-readable');panel.id='mm-analysis-readable-v1';panel.setAttribute('aria-label','Analisa Market');
 const meta=el(doc,'div','mm-analysis-article-meta');
 for(const [value,type] of [[parsed.pair,'pair'],[parsed.timeframe,'timeframe'],[parsed.bias,'bias']]){
  if(value)meta.append(el(doc,'span','mm-analysis-article-chip '+type,value));
 }
 if(meta.childNodes.length)panel.append(meta);
 if(parsed.summary)panel.append(el(doc,'p','mm-analysis-article-lead',parsed.summary));
 const blocks=el(doc,'div','mm-analysis-article-flow');
 for(const row of parsed.blocks){
  const section=el(doc,'section','mm-analysis-article-block mm-analysis-article-'+row.type);
  if(row.heading)section.append(el(doc,row.type==='scenario'?'h3':'h2','',row.heading));
  section.append(el(doc,'p','',row.text));blocks.append(section);
 }
 panel.append(blocks);
 if(parsed.tags.length){
  const tags=el(doc,'div','mm-analysis-article-tags');tags.setAttribute('aria-label','Tag artikel');
  for(const t of parsed.tags)tags.append(el(doc,'span','',t));
  panel.append(tags);
 }
 const disclaimer=el(doc,'aside','mm-analysis-article-disclaimer');
 disclaimer.setAttribute('role','note');
 disclaimer.append(el(doc,'strong','','Catatan Risiko'));
 disclaimer.append(el(doc,'p','',parsed.disclaimer));
 panel.append(disclaimer);
 (summaryP||start).parentNode.insertBefore(panel,summaryP||start);
 for(const old of new Set([summaryP,...relevant].filter(Boolean))){
  old.hidden=true;old.classList.add('mm-analysis-article-original-hidden');
 }
 main.classList.add('mm-analysis-article-page');
 return true;
}
return Object.freeze({PATH,PREFIX,META,parse,mount});
});
