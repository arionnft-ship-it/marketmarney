// MarketMarney editorial worker, no public HTTP endpoint.
// Intentionally runs only when an approved payload is configured in Railway.
const token=Bun.env.MM_ARTICLE_BEARER||'';
const articlePayload=Bun.env.MM_ARTICLE_PAYLOAD_JSON||'';
const bannerPayload=Bun.env.MM_ARTICLE_BANNER_PAYLOAD_JSON||'';
if(articlePayload&&bannerPayload){
 console.error('MM_EDITORIAL_WORKER_ERROR: two payload types configured simultaneously');
 process.exitCode=1;
}else if(!articlePayload&&!bannerPayload){
 console.log('MM_EDITORIAL_WORKER_READY: no queued article or banner');
}else if(token.length<40){
 console.error('MM_EDITORIAL_WORKER_ERROR: private credential not configured');
 process.exitCode=1;
}else{
 const isBanner=!!bannerPayload;
 try{
  const payload=JSON.parse(isBanner?bannerPayload:articlePayload);
  if(isBanner){
   if(payload.confirm_attach!==true||typeof payload.article_id!=='string'||!payload.banner)throw Error('banner_approval_missing');
  }else if(payload.status!=='published'||payload.confirm_publish!==true){
   throw Error('article_approval_missing');
  }
  const endpoint='http://marketmarney-web.railway.internal:8080/api/integrations/articles'+(isBanner?'/banner':'');
  const res=await fetch(endpoint,{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify(payload),
   signal:AbortSignal.timeout(60000)
  });
  const body=await res.json().catch(()=>({error:'non_json_reply'}));
  const ok=isBanner?res.status===200:res.status===201;
  console.log('MM_EDITORIAL_WORKER_RESULT',JSON.stringify({httpStatus:res.status,ok,id:body.id||null,status:body.status||null,img:body.img||null,error:body.error||null}));
  if(!ok){process.exitCode=1}
  else if(body.img){
   try{
    const imgRes=await fetch('https://marketmarney.com'+body.img,{signal:AbortSignal.timeout(15000),redirect:'error'});
    const bytes=new Uint8Array(await imgRes.arrayBuffer());
    const mime=imgRes.headers.get('content-type')||'';
    const verified=imgRes.status===200&&mime.startsWith('image/webp')&&bytes.length>100;
    console.log('MM_EDITORIAL_BANNER_VERIFY',JSON.stringify({ok:verified,status:imgRes.status,mime,bytes:bytes.length,path:body.img}));
    if(!verified)process.exitCode=1;
   }catch{console.log('MM_EDITORIAL_BANNER_VERIFY',JSON.stringify({ok:false,error:'public_media_unreachable'}));process.exitCode=1}
  }
  if(!isBanner&&ok){
   try{
    const publicResp=await fetch('https://marketmarney.com/berita/'+encodeURIComponent(body.id),{signal:AbortSignal.timeout(15000)});
    const html=await publicResp.text();
    console.log('MM_EDITORIAL_PUBLIC_VERIFY',JSON.stringify({status:publicResp.status,containsTitle:html.includes(payload.title||''),containsImage:!body.img||html.includes(body.img),url:publicResp.url}));
   }catch{console.log('MM_EDITORIAL_PUBLIC_VERIFY',JSON.stringify({status:'network_unavailable'}))}
  }
 }catch(e){
  console.error('MM_EDITORIAL_WORKER_ERROR',String(e?.message||'unknown').slice(0,120));
  process.exitCode=1;
 }
}
