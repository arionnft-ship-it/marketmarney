'use strict';
// Optional article API for MarketMarney v18.8.3. Disabled without MM_ARTICLE_BEARER_SHA256.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {prepareBanner,saveBanner}=require('./article-banner.cjs');
const ENDPOINT='/api/integrations/articles';
const BANNER_ENDPOINT=ENDPOINT+'/banner';
const DELETE_ENDPOINT=ENDPOINT+'/delete';
const MAX_BODY_BYTES=7600000;
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function json(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'});
 res.end(JSON.stringify(data));
}
function validate(b){
 if(!b||typeof b!=='object'||Array.isArray(b))throw Error('invalid_article');
 const title=String(b.title??'').trim(),desc=String(b.summary??'').trim(),content=String(b.content??'').trim(),cat=String(b.category??'').trim().toUpperCase(),sourceUrl=String(b.source_url??'').trim(),sourceName=String(b.source_name??'').trim();
 const status=['draft','review','published'].includes(b.status)?b.status:null;
 if(title.length<20||title.length>220||desc.length<55||desc.length>1000||strip(content).length<150||content.length>25000)throw Error('quality_gate');
 if(!['EMAS','FOREX','CRYPTO','SAHAM','EKONOMI'].includes(cat)||!status||(status==='published'&&b.confirm_publish!==true))throw Error('invalid_category_or_status');
 if(/xau\/?usd|gold|harga emas/i.test(title)&&!['EMAS','FOREX'].includes(cat))throw Error('wrong_category');
 if(/bitcoin|binance|coinbase|crypto|kripto/i.test(title)&&cat!=='CRYPTO')throw Error('wrong_category');
 try{const u=new URL(sourceUrl);if(u.protocol!=='https:'||u.username||u.password||u.port||sourceUrl.length>2000)throw Error()}catch{throw Error('source_https_required')}
 if(!sourceName||sourceName.length>150)throw Error('source_name_required');
 if(/[<>]/.test(title+desc+sourceName))throw Error('invalid_metadata');
 const id='mm-editorial-'+sha(sourceUrl+'\n'+title).slice(0,24);
 const body=content.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean).map(s=>'<p>'+esc(s)+'</p>').join('');
 const date=new Date().toISOString();
 return {id,title,desc,body,img:'',cat,category:cat,status,sourceUrl,sourceName,date,createdAt:date};
}
async function readBody(req){
 if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||'')))throw Error('json_required');
 if(Number(req.headers['content-length'])>MAX_BODY_BYTES)throw Error('body_too_large');
 const chunks=[];let size=0;
 for await(const part of req){size+=part.length;if(size>MAX_BODY_BYTES)throw Error('body_too_large');chunks.push(part)}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Error('invalid_json')}
}
function createArticlePublisher({tokenHash=process.env.MM_ARTICLE_BEARER_SHA256,dataDirectory=process.env.MM_DATA_DIR,allowTestDirectory=false}={}){
 if(!/^[0-9a-f]{64}$/.test(String(tokenHash||'')))return null;
 function authorized(req){
  const m=/^Bearer ([A-Za-z0-9_-]{40,160})$/.exec(String(req.headers.authorization||''));
  if(!m)return false;
  return crypto.timingSafeEqual(Buffer.from(sha(m[1]),'hex'),Buffer.from(tokenHash,'hex'));
 }
 function dbPath(){
  if(!dataDirectory||typeof dataDirectory!=='string')throw Error('data_directory_unconfigured');
  const dir=path.resolve(dataDirectory);
  if(!allowTestDirectory&&!(dir==='/persist'||dir.startsWith('/persist/')))throw Error('unsafe_data_directory');
  const real=fs.realpathSync(dir);
  if(!allowTestDirectory&&!(real==='/persist'||real.startsWith('/persist/')))throw Error('unsafe_data_directory');
  const file=path.join(real,'marketmarney.sqlite');
  if(!fs.statSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw Error('sqlite_missing');
  return {file,real};
 }

 function checkDatabase(db){
  const ok=db.prepare('PRAGMA quick_check').all();
  if(ok.length!==1||Object.values(ok[0])[0]!=='ok')throw Error('sqlite_integrity_failed');
  if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").get())throw Error('schema_mismatch');
 }
 function readSetting(db,key){
  const row=db.prepare('SELECT value FROM settings WHERE key=?').get(key);
  return row?JSON.parse(row.value):null;
 }
 function backupBeforeWrite(db,real){
  const dir=path.join(real,'integration-backups');
  if(fs.existsSync(dir)&&fs.lstatSync(dir).isSymbolicLink())throw Error('unsafe_backup_dir');
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  const backup=path.join(dir,'before-article-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.sqlite');
  try{
   db.exec("VACUUM INTO '"+backup.replace(/'/g,"''")+"'");
   const check=new DatabaseSync(backup,{readOnly:true});
   try{
    const rows=check.prepare('PRAGMA quick_check').all();
    if(rows.length!==1||Object.values(rows[0])[0]!=='ok')throw Error('backup_verification_failed');
   }finally{check.close()}
  }catch(e){try{fs.unlinkSync(backup)}catch{}throw Error('backup_failed')}
 }
 function updateAtomic(db,real,article,prepared,mode='created'){
  let media=null;
  db.exec('BEGIN IMMEDIATE');
  try{
   const current=readSetting(db,'articles');
   if(!Array.isArray(current)||current.length>=1000)throw Error('articles_changed');
   const ix=current.findIndex(x=>x&&String(x.id)===article.id);
   if(mode==='created'){
    if(ix!==-1||current.some(x=>x&&(String(x.sourceUrl||'')===article.sourceUrl||strip(x.title||'').toLowerCase()===strip(article.title).toLowerCase())))
     throw Object.assign(new Error('article_already_exists'),{status:409});
    if(prepared){media=saveBanner(real,prepared);article.img=media.url}
    current.push(article);
   }else{
    if(ix<0)throw Object.assign(new Error('article_not_found'),{status:404});
    const old=current[ix],newArticle={...old};
    if(old.img&&!article.replace_banner)throw Object.assign(new Error('banner_already_present'),{status:409});
    media=saveBanner(real,prepared);
    newArticle.img=media.url;
    newArticle.bannerUpdatedAt=new Date().toISOString();
    current[ix]=newArticle;
    article=newArticle;
   }
   const history=readSetting(db,'editorial_audit')||[];
   if(!Array.isArray(history))throw Error('audit_schema_changed');
   const action=mode==='created'?'created':'banner:attached';
   const audit={at:new Date().toISOString(),action,id:article.id,title:article.title,actor:'article-api',fromStatus:mode==='created'?null:article.status,toStatus:article.status};
   const put=db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
   put.run('articles',JSON.stringify(current));
   put.run('editorial_audit',JSON.stringify([audit,...history].slice(0,500)));
   db.exec('COMMIT');
   return {status:mode,id:article.id,img:article.img||''};
  }catch(e){
   try{db.exec('ROLLBACK')}catch{}
   if(media)try{fs.unlinkSync(media.file)}catch{}
   throw e;
  }
 }
 function store(a,prepared){
  const {file,real}=dbPath(),db=new DatabaseSync(file,{timeout:3000});
  try{
   checkDatabase(db);
   const articles=readSetting(db,'articles');
   if(!Array.isArray(articles)||articles.length>=1000)throw Error('articles_unavailable_or_full');
   const found=articles.find(x=>x&&(String(x.id)===a.id||String(x.sourceUrl||'')===a.sourceUrl||strip(x.title||'').toLowerCase()===strip(a.title).toLowerCase()));
   if(found)return {status:'duplicate',id:found.id};
   backupBeforeWrite(db,real);
   return updateAtomic(db,real,a,prepared);
  }finally{db.close()}
 }
 function deleteArticle(request){
  if(!request||typeof request!=='object'||Array.isArray(request)||request.confirm_delete!==true)
    throw Object.assign(new Error('invalid_delete_confirmation'),{status:422});
  const {article_id,title,source_url}=request;
  if(typeof article_id!=='string'||!/^mm-editorial-[0-9a-f]{24}$/.test(article_id)||
     typeof title!=='string'||title.length<20||title.length>220||
     typeof source_url!=='string'||source_url.length>2000||!source_url.startsWith('https://'))
    throw Object.assign(new Error('invalid_delete_target'),{status:422});
  const {file,real}=dbPath(),db=new DatabaseSync(file,{timeout:3000});
  const checkTarget=items=>{
   if(!Array.isArray(items))throw Error('articles_unavailable');
   const index=items.findIndex(a=>a&&a.id===article_id);
   if(index<0)throw Object.assign(new Error('article_not_found'),{status:404});
   const article=items[index];
   if(article.title!==title||article.sourceUrl!==source_url)
    throw Object.assign(new Error('delete_target_mismatch'),{status:409});
   return {article,index};
  };
  try{
   checkDatabase(db);
   checkTarget(readSetting(db,'articles'));
   backupBeforeWrite(db,real);
   db.exec('BEGIN IMMEDIATE');
   try{
    const articles=readSetting(db,'articles');
    const {article,index}=checkTarget(articles);
    const audit=readSetting(db,'editorial_audit')||[];
    if(!Array.isArray(audit))throw Error('audit_schema_changed');
    articles.splice(index,1);
    const put=db.prepare('UPDATE settings SET value=? WHERE key=?');
    if(put.run(JSON.stringify(articles),'articles').changes!==1)throw Error('article_update_failed');
    const entry={at:new Date().toISOString(),action:'deleted',id:article_id,title,actor:'article-api',fromStatus:article.status||null,toStatus:null};
    if(put.run(JSON.stringify([entry,...audit].slice(0,500)),'editorial_audit').changes!==1)throw Error('audit_update_failed');
    db.exec('COMMIT');
    // Image files are deliberately not unlinked: backups/other articles may reference them.
    return {id:article_id,title,deleted:true};
   }catch(e){try{db.exec('ROLLBACK')}catch{}throw e}
  }finally{db.close()}
 }
 function attachBanner(articleId,prepared,replaceBanner){
  if(typeof articleId!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(articleId))throw Object.assign(new Error('invalid_article_id'),{status:422});
  if(typeof replaceBanner!=='boolean')throw Object.assign(new Error('invalid_replace_flag'),{status:422});
  const {file,real}=dbPath(),db=new DatabaseSync(file,{timeout:3000});
  try{
   checkDatabase(db);
   const articles=readSetting(db,'articles');
   if(!Array.isArray(articles))throw Error('articles_unavailable');
   const found=articles.find(x=>x&&String(x.id)===articleId);
   if(!found)throw Object.assign(new Error('article_not_found'),{status:404});
   if(found.img&&!replaceBanner)throw Object.assign(new Error('banner_already_present'),{status:409});
   backupBeforeWrite(db,real);
   return updateAtomic(db,real,{id:articleId,replace_banner:replaceBanner},prepared,'banner');
  }finally{db.close()}
 }


 return {
  owns(req){const p=String(req.url||'').split('?')[0];return p===ENDPOINT||p===BANNER_ENDPOINT||p===DELETE_ENDPOINT},
  async handle(req,res){
   if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'});
   if(!authorized(req))return json(res,401,{error:'unauthorized'});
   const origin=String(req.headers.origin||'');
   if(origin&&origin!=='https://marketmarney.com')return json(res,403,{error:'origin_not_allowed'});
   try{
    const p=String(req.url||'').split('?')[0],b=await readBody(req);
    if(p===DELETE_ENDPOINT){
     const outcome=deleteArticle(b);
     return json(res,200,{ok:true,deleted:true,id:outcome.id,title:outcome.title});
    }
    if(p===BANNER_ENDPOINT){
     if(!b||typeof b!=='object'||Array.isArray(b)||b.confirm_attach!==true)throw Object.assign(new Error('banner_attachment_not_confirmed'),{status:422});
     const prepared=await prepareBanner(b.banner);
     const result=attachBanner(b.article_id,prepared,b.replace_banner===true);
     return json(res,200,{ok:true,id:result.id,img:result.img,status:'banner_attached'});
    }
    const article=validate(b);
    const banner=Object.hasOwn(b,'banner')?await prepareBanner(b.banner):null;
    const result=store(article,banner);
    if(result.status==='duplicate')return json(res,409,{error:'article_already_exists',id:result.id});
    return json(res,201,{ok:true,id:article.id,status:article.status,img:result.img,canonicalPath:'/berita/'+encodeURIComponent(article.id)});
   }catch(e){
    const code=String(e.message||''),status=Number.isInteger(e.status)?e.status:/^(invalid_|quality_gate|wrong_category|source_https_required|source_name_required|json_required|body_too_large|banner_)/.test(code)?422:503;
    console.error('MM_ARTICLE_API_FAILED',status<500?'validation':'storage_check');
    return json(res,status,{error:status<500?code:'article_not_saved'});
   }
  }

 };
}
module.exports={createArticlePublisher,validate};
