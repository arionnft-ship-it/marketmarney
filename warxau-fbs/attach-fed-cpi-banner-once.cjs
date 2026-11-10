'use strict';

// One-time, guarded banner attachment for the published Fed/CPI article.
// It is inert unless MM_ATTACH_FED_CPI_BANNER_20261110=1.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {prepareBanner,saveBanner}=require('./article-banner.cjs');

const FLAG='MM_ATTACH_FED_CPI_BANNER_20261110';
const ARTICLE_ID='mm-editorial-95e05bc2c32aab9951a760a8';
const BANNER_URL='https://static.metricool.com/planner/202611/7967921-file-223804957450864046.png';
const MAX_SOURCE_BYTES=5*1024*1024;

function fail(message){throw new Error(message)}
function readSetting(db,key){const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);return row?JSON.parse(row.value):null;}
function checkDb(db){
 const quick=db.prepare('PRAGMA quick_check').all();
 if(quick.length!==1||Object.values(quick[0])[0]!=='ok')fail('sqlite_integrity_failed');
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").get())fail('schema_mismatch');
}
function safeRoot(){
 const configured=String(process.env.MM_DATA_DIR||'');
 if(!configured)fail('data_directory_unconfigured');
 const root=fs.realpathSync(path.resolve(configured));
 if(!(root==='/persist'||root.startsWith('/persist/')))fail('unsafe_data_directory');
 return root;
}
function backup(db,root){
 const dir=path.join(root,'integration-backups');
 if(fs.existsSync(dir)&&fs.lstatSync(dir).isSymbolicLink())fail('unsafe_backup_dir');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 const file=path.join(dir,'before-fed-cpi-banner-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.sqlite');
 db.exec("VACUUM INTO '"+file.replace(/'/g,"''")+"'");
 const copy=new DatabaseSync(file,{readOnly:true});
 try{const rows=copy.prepare('PRAGMA quick_check').all();if(rows.length!==1||Object.values(rows[0])[0]!=='ok')fail('backup_verification_failed');}
 finally{copy.close()}
}
async function fetchBanner(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);timeout.unref?.();
 try{
  const response=await fetch(BANNER_URL,{redirect:'follow',signal:controller.signal,headers:{Accept:'image/png'}});
  if(!response.ok)fail('banner_download_failed_'+response.status);
  const length=Number(response.headers.get('content-length')||0);
  if(length>MAX_SOURCE_BYTES)fail('banner_source_too_large');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.length||bytes.length>MAX_SOURCE_BYTES)fail('banner_source_invalid');
  return prepareBanner({mime_type:'image/png',base64:bytes.toString('base64')});
 }finally{clearTimeout(timeout)}
}
async function main(){
 if(String(process.env[FLAG]||'')!=='1')return;
 const root=safeRoot(),dbFile=path.join(root,'marketmarney.sqlite');
 if(!fs.statSync(dbFile).isFile()||fs.lstatSync(dbFile).isSymbolicLink())fail('sqlite_missing');
 const prepared=await fetchBanner();
 const db=new DatabaseSync(dbFile,{timeout:5000});
 let media=null;
 try{
  checkDb(db);
  const before=readSetting(db,'articles');
  if(!Array.isArray(before))fail('articles_unavailable');
  const initial=before.find(a=>a&&a.id===ARTICLE_ID);
  if(!initial)fail('article_not_found');
  if(initial.img){console.log('MM_FED_CPI_BANNER_ALREADY_PRESENT '+JSON.stringify({id:ARTICLE_ID,img:initial.img}));return;}
  backup(db,root);
  db.exec('BEGIN IMMEDIATE');
  try{
   const articles=readSetting(db,'articles');
   if(!Array.isArray(articles))fail('articles_changed');
   const index=articles.findIndex(a=>a&&a.id===ARTICLE_ID);
   if(index<0)fail('article_not_found');
   if(articles[index].img){db.exec('ROLLBACK');console.log('MM_FED_CPI_BANNER_ALREADY_PRESENT '+JSON.stringify({id:ARTICLE_ID,img:articles[index].img}));return;}
   media=saveBanner(root,prepared);
   const updated={...articles[index],img:media.url,bannerUpdatedAt:new Date().toISOString()};
   articles[index]=updated;
   const history=readSetting(db,'editorial_audit')||[];
   if(!Array.isArray(history))fail('audit_schema_changed');
   const audit={at:new Date().toISOString(),action:'banner:attached',id:ARTICLE_ID,title:updated.title,actor:'one-time-banner-migration',fromStatus:updated.status||null,toStatus:updated.status||null};
   const put=db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
   put.run('articles',JSON.stringify(articles));
   put.run('editorial_audit',JSON.stringify([audit,...history].slice(0,500)));
   db.exec('COMMIT');
   console.log('MM_FED_CPI_BANNER_ATTACH_OK '+JSON.stringify({id:ARTICLE_ID,img:media.url,bytes:media.bytes,sha256:media.sha256}));
  }catch(error){try{db.exec('ROLLBACK')}catch{}if(media)try{fs.unlinkSync(media.file)}catch{}throw error;}
 }finally{db.close()}
}
main().catch(error=>{console.error('MM_FED_CPI_BANNER_ATTACH_FAILED '+String(error&&error.message||error).slice(0,180));process.exit(1);});
