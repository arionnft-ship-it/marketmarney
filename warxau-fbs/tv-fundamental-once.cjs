'use strict';
// Explicit one-time, owner-authorized MarketMarney TV import of a verified Hedra video.
// A missing source URL is a complete no-op. Never logs the signed URL.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Readable,Transform}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const {spawnSync}=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');
const ID='f68d82e6-df05-40d9-b623-ce5f3abeeb6e';
const TITLE='Memahami Analisis Fundamental Trading Secara Mendalam | MarketMarney TV';
const SOURCE_ENV='MM_TV_FUNDAMENTAL_SIGNED_URL';
const SOURCE_HOST='d1m68745s4vctn.cloudfront.net';
const SOURCE_PATH='/28fb0efe-c22e-4694-afa5-dac3c89d1ae1/215b51e2-1e0f-4fce-b79f-03fbadadd1bb.mp4';
const MAX_BYTES=160*1024*1024;
const VIDEO_PATH='/media/'+ID+'.mp4';
const IMAGE_PATH='/media/'+ID+'.jpg';
const RECORD=Object.freeze({
 id:ID,title:TITLE,cat:'Edukasi',
 desc:'Pelajari analisis fundamental trading dari dasar hingga penerapannya pada XAU/USD. Mengenal inflasi, CPI, PCE, NFP, suku bunga The Fed, dolar AS, imbal hasil obligasi, geopolitik, skenario berita, dan manajemen risiko. Dinarasikan dalam bahasa Indonesia. Contoh angka dan grafik bersifat simulasi. Materi edukasi, bukan nasihat atau rekomendasi investasi.',
 type:'mp4',url:VIDEO_PATH,thumb:IMAGE_PATH,status:'published',
 date:'2026-11-13T06:00:00.000Z',localFile:true,
 album:'MarketMarney Academy',learningStage:'dasar'
});
function approveSource(raw){
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||u.hostname!==SOURCE_HOST||u.pathname!==SOURCE_PATH||u.username||u.password||u.port||u.hash)return false;
  const exp=Number(u.searchParams.get('Expires'));
  return Number.isInteger(exp)&&exp*1000>Date.now()&&u.searchParams.has('Signature')&&u.searchParams.has('Key-Pair-Id');
 }catch{return false}
}
function dataRoot(){
 const root=path.resolve(process.env.MM_DATA_DIR||'/persist/data');
 if(root!=='/persist'&&!root.startsWith('/persist/'))throw Error('invalid_data_root');
 const actual=fs.realpathSync(root);
 if(actual!=='/persist'&&!actual.startsWith('/persist/'))throw Error('unsafe_data_root');
 const dbFile=path.join(actual,'marketmarney.sqlite');
 if(!fs.statSync(dbFile).isFile()||fs.lstatSync(dbFile).isSymbolicLink())throw Error('db_unavailable');
 const uploads=path.join(actual,'uploads');
 if(!fs.statSync(uploads).isDirectory()||fs.lstatSync(uploads).isSymbolicLink()||fs.realpathSync(uploads)!==uploads)throw Error('uploads_unavailable');
 return {actual,dbFile,uploads};
}
function readRows(db,key){
 const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);
 if(!row)throw Error('settings_missing_'+key);
 const data=JSON.parse(row.value);
 if(!Array.isArray(data))throw Error('settings_not_array_'+key);
 return data;
}
function confirmDb(db){
 const rows=db.prepare('PRAGMA quick_check').all();
 if(rows.length!==1||Object.values(rows[0])[0]!=='ok')throw Error('db_integrity_failed');
}
function hasVideo(books){
 return books.some(x=>x&&(String(x.id||'')===ID||String(x.title||'').trim().toLowerCase()===TITLE.toLowerCase()));
}
function probe(filename){
 const r=spawnSync('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height','-of','json',filename],{encoding:'utf8',timeout:18000,maxBuffer:1024*1024});
 if(r.error||r.status!==0)throw Error('ffprobe_failed');
 const j=JSON.parse(r.stdout),duration=Number(j.format?.duration);
 const video=(j.streams||[]).find(x=>x.codec_type==='video');
 const audio=(j.streams||[]).find(x=>x.codec_type==='audio');
 if(!Number.isFinite(duration)||duration<185||duration>230||!video||!audio||video.width<720||video.height<480)throw Error('video_probe_invalid');
 return {duration,codec:video.codec_name,audio:audio.codec_name,width:video.width,height:video.height};
}
function makeThumb(video,jpg){
 const result=spawnSync('ffmpeg',['-hide_banner','-nostdin','-loglevel','error','-y','-ss','13','-i',video,'-frames:v','1','-vf','scale=960:-2','-q:v','3',jpg],{timeout:45000,maxBuffer:1024*1024,encoding:'utf8'});
 if(result.error||result.status!==0)throw Error('thumbnail_failed');
 const bytes=fs.readFileSync(jpg);
 if(bytes.length<3000||bytes.length>3*1024*1024||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw Error('thumbnail_invalid');
 return bytes.length;
}
function checkBackup(db,root){
 const dir=path.join(root,'integration-backups');
 if(fs.existsSync(dir)&&fs.lstatSync(dir).isSymbolicLink())throw Error('unsafe_backup_dir');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const filename=path.join(dir,'before-tv-fundamental-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.sqlite');
 db.exec("VACUUM INTO '"+filename.replace(/'/g,"''")+"'");
 const bk=new DatabaseSync(filename,{readOnly:true});
 try{confirmDb(bk)}finally{bk.close()}
 return filename;
}
async function downloadVideo(source,destination){
 const res=await fetch(source,{redirect:'error',headers:{accept:'video/mp4'},signal:AbortSignal.timeout(150000)});
 if(res.status!==200||!res.body)throw Error('hedra_source_http_'+res.status);
 const length=Number(res.headers.get('content-length')||0);
 if(length>MAX_BYTES)throw Error('video_source_too_large');
 const mime=String(res.headers.get('content-type')||'');
 console.log('MM_TV_FUNDAMENTAL_SOURCE_HEADERS '+JSON.stringify({status:res.status,mime:mime.slice(0,80),length}));
 // Verify actual MP4 signature and ffprobe streams instead of CDN mime header.
 let n=0;
 const hash=crypto.createHash('sha256');
 const limiter=new Transform({transform(chunk,encoding,cb){n+=chunk.length;if(n>MAX_BYTES)return cb(Error('video_too_large'));hash.update(chunk);cb(null,chunk)}});
 await pipeline(Readable.fromWeb(res.body),limiter,fs.createWriteStream(destination,{flags:'wx',mode:0o600}));
 if(n<1000000)throw Error('source_video_too_small');
 const header=Buffer.alloc(12);const fd=fs.openSync(destination,'r');
 try{fs.readSync(fd,header,0,12,0)}finally{fs.closeSync(fd)}
 if(header.toString('ascii',4,8)!=='ftyp')throw Error('source_not_mp4');
 return {bytes:n,sha256:hash.digest('hex')};
}
function alreadyDone(dbFile){
 const db=new DatabaseSync(dbFile,{readOnly:true});
 try{confirmDb(db);return hasVideo(readRows(db,'videos'))}finally{db.close()}
}
async function run(){
 const source=process.env[SOURCE_ENV]||'';
 if(!source)return;
 if(!approveSource(source)){console.error('MM_TV_FUNDAMENTAL_IMPORT_ERROR source_not_approved_or_expired');return}
 let tempMp4=null,tempJpg=null,finalMp4=null,finalJpg=null,renamed=false;
 try{
  const {actual,dbFile,uploads}=dataRoot();
  if(alreadyDone(dbFile)){console.log('MM_TV_FUNDAMENTAL_IMPORT_ALREADY_PRESENT '+JSON.stringify({id:ID,title:TITLE}));return}
  finalMp4=path.join(uploads,ID+'.mp4');finalJpg=path.join(uploads,ID+'.jpg');
  if(fs.existsSync(finalMp4)||fs.existsSync(finalJpg))throw Error('partial_import_files_already_exist');
  const nonce=crypto.randomUUID();tempMp4=path.join(uploads,'.mm-fundamental-'+nonce+'.mp4');tempJpg=path.join(uploads,'.mm-fundamental-'+nonce+'.jpg');
  console.log('MM_TV_FUNDAMENTAL_IMPORT_BEGIN');
  const media=await downloadVideo(source,tempMp4);
  const specs=probe(tempMp4);
  const thumbnailBytes=makeThumb(tempMp4,tempJpg);
  const db=new DatabaseSync(dbFile,{timeout:5000});
  try{
   confirmDb(db);
   const before=readRows(db,'videos');
   if(hasVideo(before)){console.log('MM_TV_FUNDAMENTAL_IMPORT_ALREADY_PRESENT '+JSON.stringify({id:ID,title:TITLE}));return}
   if(before.length>=5000)throw Error('video_catalog_full');
   checkBackup(db,actual);
   fs.renameSync(tempMp4,finalMp4);fs.renameSync(tempJpg,finalJpg);renamed=true;
   db.exec('BEGIN IMMEDIATE');
   let newCount=0;
   try{
    const current=readRows(db,'videos');
    if(hasVideo(current))throw Error('concurrent_duplicate');
    current.unshift({...RECORD,date:new Date().toISOString()});
    const put=db.prepare('UPDATE settings SET value=? WHERE key=?');
    if(put.run(JSON.stringify(current),'videos').changes!==1)throw Error('video_setting_update_failed');
    const entry={at:new Date().toISOString(),action:'tv:published',id:ID,title:TITLE,actor:'owner-approved-hedra-import',sha256:media.sha256};
    const rows=db.prepare('SELECT value FROM settings WHERE key=?').get('editorial_audit');
    const old=rows?JSON.parse(rows.value):[];
    if(!Array.isArray(old))throw Error('audit_schema_invalid');
    db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('editorial_audit',JSON.stringify([entry,...old].slice(0,500)));
    db.exec('COMMIT');
    newCount=current.length;
   }catch(e){try{db.exec('ROLLBACK')}catch{}throw e}
   console.log('MM_TV_FUNDAMENTAL_IMPORT_SUCCESS '+JSON.stringify({id:ID,title:TITLE,status:'published',url:VIDEO_PATH,thumb:IMAGE_PATH,videoBytes:media.bytes,thumbnailBytes,sha256:media.sha256,videoCount:newCount,...specs,backup:true}));
  }finally{db.close()}
 }catch(error){
  if(renamed){try{fs.unlinkSync(finalMp4)}catch{}try{fs.unlinkSync(finalJpg)}catch{}}
  console.error('MM_TV_FUNDAMENTAL_IMPORT_ERROR '+String(error.message||'error').slice(0,170));
 }finally{
  if(tempMp4)await fs.promises.rm(tempMp4,{force:true}).catch(()=>{});
  if(tempJpg)await fs.promises.rm(tempJpg,{force:true}).catch(()=>{});
 }
}
module.exports={ID,TITLE,RECORD,SOURCE_ENV,approveSource,probe,run};
