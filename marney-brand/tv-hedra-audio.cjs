'use strict';
// A single authorized MarketMarney TV narration replacement, generated in
// Hedra Audio Studio. Never exposes Hedra's temporary signed download URL.
// The resulting H.264/AAC MP4 persists on the existing Railway data volume.
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {randomUUID}=require('node:crypto');
const VIDEO_ID='85440075-e5d4-4637-b034-6f8b3051b287';
const VERSION='marketmarney-tv-broker-hedra-rizky-v4';
const MEDIA_PATH='/media/'+VIDEO_ID+'.mp4';
const ROOT=process.env.MM_DATA_DIR||'/persist/site-r1/MarketMarney-Railway-Staging/data';
const DIR=path.join(ROOT,'marketmarney-tv');
const FINAL=path.join(DIR,'broker-hedra-rizky-v4.mp4');
const PREVIOUS='https://raw.githubusercontent.com/arionnft-ship-it/marketmarney/45cc34a647ad317a5a1684a0854ba6902d2a1046/assets/broker-audio/marketmarney-broker-suara-indonesia-v3.mp4';
let running=null;
function ready(){
 try{return fs.statSync(FINAL).isFile()&&fs.statSync(FINAL).size>=1000000}catch{return false}
}
function urlIsApproved(raw,kind){
 try{
  const u=new URL(raw);
  return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
   (kind==='hedra'?u.hostname==='hedra-api-audio-6923ef8dbda63b10.s3.amazonaws.com'&&
     /^\/web-app-v2\/audio\/[a-f0-9-]{36}\/324cbc93-2885-4d91-86ff-bd22497e4cae\.mp3$/.test(u.pathname):
    u.hostname==='raw.githubusercontent.com'&&u.pathname.includes('/assets/broker-audio/marketmarney-broker-suara-indonesia-v3.mp4'));
 }catch{return false}
}
async function fetchFile(url,target,maxBytes){
 const response=await fetch(url,{signal:AbortSignal.timeout(45000),redirect:'follow'});
 if(!response.ok)throw Error('Source request HTTP '+response.status);
 if(Number(response.headers.get('content-length')||0)>maxBytes)throw Error('Source file exceeds limit');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<1024||bytes.length>maxBytes)throw Error('Source size invalid');
 await fs.promises.writeFile(target,bytes,{mode:0o600});
 return bytes.length;
}
function exec(bin,args,timeoutMs=180000){
 return new Promise((resolve,reject)=>{
  let ended=false,lines='';
  const child=spawn(bin,args,{stdio:['ignore','ignore','pipe']});
  const timer=setTimeout(()=>child.kill('SIGKILL'),timeoutMs);
  child.stderr.on('data',chunk=>{lines=(lines+String(chunk)).slice(-5000)});
  child.once('error',err=>{if(ended)return;ended=true;clearTimeout(timer);reject(err)});
  child.once('close',code=>{if(ended)return;ended=true;clearTimeout(timer);
   if(code===0)resolve(lines);else reject(Error(bin+' exit '+code+': '+lines.slice(-600)))});
 });
}
async function probeDuration(file){
 const args=['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file];
 return new Promise((resolve,reject)=>{
  let text='',err='';
  const child=spawn('ffprobe',args,{stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',chunk=>text+=String(chunk));child.stderr.on('data',chunk=>err+=String(chunk));
  child.once('error',reject);child.once('close',code=>{
   const value=Number(text.trim());
   if(code===0&&Number.isFinite(value)&&value>1&&value<600)resolve(value);
   else reject(Error('ffprobe duration invalid: '+err.slice(-200)));
  });
 });
}
async function build(){
 if(ready())return true;
 const signed=process.env.MM_BROKER_HEDRA_AUDIO_URL||'';
 if(!urlIsApproved(signed,'hedra')||!urlIsApproved(PREVIOUS,'video')){
  console.warn('MM_HEDRA_BROKER_NO_APPROVED_SOURCE');return false;
 }
 await fs.promises.mkdir(DIR,{recursive:true});
 const work=path.join(DIR,'.hedra-work-'+randomUUID());
 await fs.promises.mkdir(work,{mode:0o700});
 try{
  const sound=path.join(work,'hedra.mp3'),video=path.join(work,'original.mp4');
  const output=path.join(work,'new.mp4');
  const [audioBytes,videoBytes]=await Promise.all([
   fetchFile(signed,sound,25000000),fetchFile(PREVIOUS,video,30000000)
  ]);
  const [audioSecs,videoSecs]=await Promise.all([probeDuration(sound),probeDuration(video)]);
  const ratio=(audioSecs/videoSecs).toFixed(8);
  if(audioSecs<65||audioSecs>320||videoSecs<60||videoSecs>300)throw Error('Audio/video duration out of bounds');
  // Animate the previous visual program at a relaxed pace. Keep all Hedra
  // speech at native 1x speed and discard the previous robotic soundtrack.
  await exec('ffmpeg',[
   '-hide_banner','-nostdin','-loglevel','error','-y',
   '-i',video,'-i',sound,
   '-filter_complex','[0:v]setpts='+ratio+'*(PTS-STARTPTS),fps=20,tpad=stop_mode=clone:stop_duration=2[v]',
   '-map','[v]','-map','1:a:0',
   '-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p',
   '-c:a','aac','-ar','48000','-b:a','160k',
   '-movflags','+faststart','-shortest',output
  ],240000);
  const resultSecs=await probeDuration(output);
  const bytes=(await fs.promises.stat(output)).size;
  if(bytes<1000000||Math.abs(resultSecs-audioSecs)>1.5)throw Error('Rendered file length mismatch');
  await fs.promises.rename(output,FINAL);
  console.log('MM_BROKER_HEDRA_READY',JSON.stringify({version:VERSION,audioSeconds:audioSecs,videoSeconds:resultSecs,bytes,audioBytes,videoBytes}));
  return true;
 }finally{await fs.promises.rm(work,{recursive:true,force:true}).catch(()=>{})}
}
function prepare(){
 if(ready())return Promise.resolve(true);
 if(running)return running;
 running=build().catch(e=>{
  console.error('MM_BROKER_HEDRA_BUILD_ERROR',String(e.message).slice(0,220));return false
 }).finally(()=>{running=null});
 return running;
}
function send(req,res){
 if(String(req.url||'').split('?')[0]!==MEDIA_PATH||!['GET','HEAD'].includes(req.method))return false;
 if(!ready())return false;
 const size=fs.statSync(FINAL).size;
 const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff','X-MarketMarney-Audio':VERSION};
 let start=0,end=size-1,status=200;
 if(req.headers.range){
  const match=/^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range));
  if(!match){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return true;}
  if(match[1]===''&&match[2]===''){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return true;}
  if(match[1]===''){const n=Number(match[2]);start=Math.max(0,size-n)}
  else{start=Number(match[1]);if(match[2]!=='')end=Math.min(size-1,Number(match[2]))}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size){
   res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return true;
  }
  status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
 }
 headers['Content-Length']=end-start+1;
 res.writeHead(status,headers);
 if(req.method==='HEAD'){res.end();return true;}
 fs.createReadStream(FINAL,{start,end}).on('error',()=>{if(!res.headersSent)res.writeHead(500);res.end()}).pipe(res);
 return true;
}
module.exports={VERSION,VIDEO_ID,MEDIA_PATH,FINAL,PREVIOUS,urlIsApproved,ready,prepare,send};
