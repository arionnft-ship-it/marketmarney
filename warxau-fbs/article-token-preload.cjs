'use strict';

// Optional short-lived secondary credential for editorial publishing.
// The existing primary credential remains configured in Railway and is restored
// automatically whenever MM_ARTICLE_BEARER_SHA256_ONETIME is unset or invalid.
const http=require('node:http');
const crypto=require('node:crypto');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const candidate=String(process.env.MM_ARTICLE_BEARER_SHA256_ONETIME||'').trim().toLowerCase();
if(/^[0-9a-f]{64}$/.test(candidate)){
 process.env.MM_ARTICLE_BEARER_SHA256=candidate;
 console.log('MM_ARTICLE_ONETIME_TOKEN_ACTIVE');
}

// A one-time payload may be supplied by the deployment operator. It is posted
// only to the same container, never printed, and duplicate responses are safe.
const token=String(process.env.MM_ARTICLE_BEARER_TOKEN_ONETIME||'').trim();
const encoded=String(process.env.MM_ARTICLE_PUBLISH_PAYLOAD_ONETIME||'').trim();
let payload=null;
try{
 if(encoded&&encoded.length<1000000){
  const decoded=Buffer.from(encoded,'base64').toString('utf8');
  const parsed=JSON.parse(decoded);
  if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))payload=Buffer.from(decoded,'utf8');
 }
}catch{}

if(payload&&/^[A-Za-z0-9_-]{40,160}$/.test(token)&&candidate&&sha(token)===candidate){
 const port=Number(process.env.PORT||8080);
 let attempts=0,finished=false;
 function publish(){
  if(finished||++attempts>12)return;
  const request=http.request({
   hostname:'127.0.0.1',port,path:'/api/integrations/articles',method:'POST',
   headers:{Host:'marketmarney.com','Content-Type':'application/json','Content-Length':payload.length,Authorization:'Bearer '+token}
  },response=>{
   const chunks=[];let size=0;
   response.on('data',chunk=>{if(size<32768){chunks.push(chunk);size+=chunk.length;}});
   response.on('end',()=>{
    const body=Buffer.concat(chunks).toString('utf8');
    if(response.statusCode===201||response.statusCode===409){
     finished=true;
     let result={};try{result=JSON.parse(body)}catch{}
     console.log('MM_ARTICLE_ONETIME_PUBLISH_OK '+JSON.stringify({status:response.statusCode,id:result.id||null,canonicalPath:result.canonicalPath||null,error:result.error||null}));
     return;
    }
    if(response.statusCode>=500&&attempts<12)return setTimeout(publish,2000);
    finished=true;
    console.error('MM_ARTICLE_ONETIME_PUBLISH_FAILED '+JSON.stringify({status:response.statusCode,error:'rejected'}));
   });
  });
  request.setTimeout(8000,()=>request.destroy(new Error('timeout')));
  request.on('error',()=>{if(attempts<12)setTimeout(publish,2000);else console.error('MM_ARTICLE_ONETIME_PUBLISH_FAILED '+JSON.stringify({status:0,error:'unavailable'}));});
  request.end(payload);
 }
 setTimeout(publish,4000);
}
