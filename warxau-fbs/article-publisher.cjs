'use strict';
// Optional article API for MarketMarney v18.8.3. Disabled without MM_ARTICLE_BEARER_SHA256.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const ENDPOINT='/api/integrations/articles';
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
 if(Number(req.headers['content-length'])>65000)throw Error('body_too_large');
 const chunks=[];let size=0;
 for await(const part of req){size+=part.length;if(size>65000)throw Error('body_too_large');chunks.push(part)}
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
 function store(a){
  const {file,real}=dbPath(),db=new DatabaseSync(file,{timeout:3000});
  try{
   const ok=db.prepare('PRAGMA quick_check').all();
   if(ok.length!==1||Object.values(ok[0])[0]!=='ok')throw Error('sqlite_integrity_failed');
   if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='settings'").get())throw Error('schema_mismatch');
   const read=k=>{const r=db.prepare('SELECT value FROM settings WHERE key=?').get(k);return r?JSON.parse(r.value):null};
   const existing=read('articles');
   if(!Array.isArray(existing)||existing.length>=1000)throw Error('articles_unavailable_or_full');
   const duplicate=items=>items.find(x=>x&&(String(x.id)===a.id||String(x.sourceUrl||'')===a.sourceUrl||strip(x.title||'').toLowerCase()===strip(a.title).toLowerCase()));
   if(duplicate(existing))return {status:'duplicate',id:duplicate(existing).id};
   const dir=path.join(real,'integration-backups');fs.mkdirSync(dir,{recursive:true,mode:0o700});
   const backup=path.join(dir,'before-article-'+Date.now()+'-'+crypto.randomBytes(4).toString('hex')+'.sqlite');
   try{
    db.exec("VACUUM INTO '"+backup.replace(/'/g,"''")+"'");
    const check=new DatabaseSync(backup,{readOnly:true});
    try{const rows=check.prepare('PRAGMA quick_check').all();if(rows.length!==1||Object.values(rows[0])[0]!=='ok')throw Error('backup_verification_failed')}
    finally{check.close()}
   }catch{try{fs.unlinkSync(backup)}catch{}throw Error('backup_failed')}
   db.exec('BEGIN IMMEDIATE');
   try{
    const current=read('articles');
    if(!Array.isArray(current)||current.length>=1000)throw Error('articles_changed');
    const found=duplicate(current);if(found){db.exec('ROLLBACK');return {status:'duplicate',id:found.id}}
    const history=read('editorial_audit')||[];if(!Array.isArray(history))throw Error('audit_schema_changed');
    const audit={at:new Date().toISOString(),action:'created',id:a.id,title:a.title,actor:'article-api',fromStatus:null,toStatus:a.status};
    const put=db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
    put.run('articles',JSON.stringify([...current,a]));
    put.run('editorial_audit',JSON.stringify([audit,...history].slice(0,500)));
    db.exec('COMMIT');return {status:'created',id:a.id};
   }catch(e){try{db.exec('ROLLBACK')}catch{}throw e}
  }finally{db.close()}
 }
 return {
  owns(req){return String(req.url||'').split('?')[0]===ENDPOINT},
  async handle(req,res){
   if(req.method!=='POST')return json(res,405,{error:'method_not_allowed'});
   if(!authorized(req))return json(res,401,{error:'unauthorized'});
   const origin=String(req.headers.origin||'');
   if(origin&&origin!=='https://marketmarney.com')return json(res,403,{error:'origin_not_allowed'});
   try{
    const a=validate(await readBody(req)),result=store(a);
    if(result.status==='duplicate')return json(res,409,{error:'article_already_exists',id:result.id});
    return json(res,201,{ok:true,id:a.id,status:a.status,canonicalPath:'/berita/'+encodeURIComponent(a.id)});
   }catch(e){
    const code=String(e.message||'');
    const bad=/^(invalid_|quality_gate|wrong_category|source_https_required|source_name_required|json_required|body_too_large)/.test(code);
    console.error('MM_ARTICLE_API_FAILED',bad?'validation':'storage_check');
    return json(res,bad?422:503,{error:bad?code:'article_not_saved'});
   }
  }
 };
}
module.exports={createArticlePublisher,validate};
