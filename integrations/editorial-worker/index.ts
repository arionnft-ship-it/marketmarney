// MarketMarney editorial worker, no public HTTP endpoint.
// Intentionally runs only when an approved payload is configured in Railway.
const token=Bun.env.MM_ARTICLE_BEARER||'';
const articlePayload=Bun.env.MM_ARTICLE_PAYLOAD_JSON||'';
const bannerPayload=Bun.env.MM_ARTICLE_BANNER_PAYLOAD_JSON||'';
const deletePayload=Bun.env.MM_ARTICLE_DELETE_PAYLOAD_JSON||'';
if([articlePayload,bannerPayload,deletePayload].filter(Boolean).length>1){
 console.error('MM_EDITORIAL_WORKER_ERROR: two payload types configured simultaneously');
 process.exitCode=1;
}else if(!articlePayload&&!bannerPayload&&!deletePayload){
 console.log('MM_EDITORIAL_WORKER_READY: no queued article or banner');
}else if(token.length<40){
 console.error('MM_EDITORIAL_WORKER_ERROR: private credential not configured');
 process.exitCode=1;
}else{
 const isBanner=!!bannerPayload,isDelete=!!deletePayload;
 try{
  const payload=JSON.parse(isDelete?deletePayload:isBanner?bannerPayload:articlePayload);
  if(isBanner){
   if(payload.confirm_attach!==true||typeof payload.article_id!=='string'||!payload.banner)throw Error('banner_approval_missing');
  }else if(isDelete){
   if(payload.confirm_delete!==true||typeof payload.article_id!=='string'||typeof payload.title!=='string'||typeof payload.source_url!=='string')throw Error('delete_approval_missing');
  }else if(payload.status!=='published'||payload.confirm_publish!==true){
   throw Error('article_approval_missing');
  }
  const endpoint='http://marketmarney-web.railway.internal:8080/api/integrations/articles'+(isBanner?'/banner':isDelete?'/delete':'');
  const res=await fetch(endpoint,{
   method:'POST',
   headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
   body:JSON.stringify(payload),
   signal:AbortSignal.timeout(60000)
  });
  const body=await res.json().catch(()=>({error:'non_json_reply'}));
  const ok=isDelete?res.status===200&&body.deleted===true:isBanner?res.status===200:res.status===201;
  console.log('MM_EDITORIAL_WORKER_RESULT',JSON.stringify({httpStatus:res.status,ok,id:body.id||null,status:body.status||null,img:body.img||null,deleted:body.deleted===true,error:body.error||null}));
  if(!ok){process.exitCode=1}
  else if(!isDelete&&body.img){
   try{
    const imgRes=await fetch('https://marketmarney.com'+body.img,{signal:AbortSignal.timeout(15000),redirect:'error'});
    const bytes=new Uint8Array(await imgRes.arrayBuffer());
    const mime=imgRes.headers.get('content-type')||'';
    const verified=imgRes.status===200&&mime.startsWith('image/webp')&&bytes.length>100;
    console.log('MM_EDITORIAL_BANNER_VERIFY',JSON.stringify({ok:verified,status:imgRes.status,mime,bytes:bytes.length,path:body.img}));
    if(!verified)process.exitCode=1;
   }catch{console.log('MM_EDITORIAL_BANNER_VERIFY',JSON.stringify({ok:false,error:'public_media_unreachable'}));process.exitCode=1}
  }
  if(isDelete&&ok){
   try{
    const slug=payload.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const url='https://marketmarney.com/berita/'+encodeURIComponent(payload.article_id)+'/'+slug;
    const view=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'follow'});
    const html=await view.text();
    const containsTitle=html.includes(payload.title);
    console.log('MM_EDITORIAL_DELETE_PUBLIC_VERIFY',JSON.stringify({httpStatus:view.status,containsTitle,url:view.url}));
    if(containsTitle)process.exitCode=1;
   }catch(e){console.log('MM_EDITORIAL_DELETE_PUBLIC_VERIFY',JSON.stringify({status:'network_unavailable'}));process.exitCode=1;}
  }
  if(!isBanner&&!isDelete&&ok){
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
