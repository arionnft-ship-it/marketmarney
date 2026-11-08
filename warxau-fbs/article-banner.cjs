'use strict';
// The only supported client media format is bounded base64 PNG/JPEG/WebP.
// All image content is decoded, verified and re-encoded as WebP by Sharp.
const sharp=require('sharp');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const MAX_IMAGE_BYTES=5*1024*1024;
const MAX_BASE64_CHARS=Math.ceil(MAX_IMAGE_BYTES/3)*4+4;
const TYPES=Object.freeze({'image/png':'png','image/jpeg':'jpeg','image/webp':'webp'});

function mediaError(code,status=422) {
 return Object.assign(new Error(code),{status});
}
function sniff(buffer) {
 if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))return 'png';
 if(buffer.length>=3&&buffer.subarray(0,3).equals(Buffer.from('ffd8ff','hex')))return 'jpeg';
 if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';
 return null;
}
async function prepareBanner(banner) {
 if(!banner||typeof banner!=='object'||Array.isArray(banner))throw mediaError('banner_required');
 const mime=String(banner.mime_type||'').toLowerCase(), expected=TYPES[mime];
 if(!expected)throw mediaError('banner_type_unsupported');
 const raw=banner.base64;
 if(typeof raw!=='string'||raw.length===0||raw.length>MAX_BASE64_CHARS||raw.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(raw))
   throw mediaError('banner_base64_invalid');
 const input=Buffer.from(raw,'base64');
 if(!input.length||input.length>MAX_IMAGE_BYTES||sniff(input)!==expected)throw mediaError('banner_signature_mismatch');
 try {
  const pipeline=sharp(input,{failOn:'error',limitInputPixels:24000000,animated:false});
  const m=await pipeline.metadata();
  if(m.format!==expected||!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<480||m.height<260||m.width>7000||m.height>7000)
    throw mediaError('banner_dimensions_invalid');
  const ratio=m.width/m.height;
  if(ratio<0.65||ratio>4)throw mediaError('banner_aspect_ratio_invalid');
  // Preserve original composition; avoid cropping headlines or text in news banners.
  const processed=await pipeline.rotate().resize({width:1600,height:900,fit:'inside',withoutEnlargement:true})
   .webp({quality:86,effort:4}).toBuffer();
  if(!processed.length||processed.length>3*1024*1024||sniff(processed)!=='webp')throw mediaError('banner_output_too_large');
  return {buffer:processed,sha256:crypto.createHash('sha256').update(processed).digest('hex'),width:m.width,height:m.height,mime:'image/webp'};
 } catch(e) {
  if(e?.status)throw e;
  throw mediaError('banner_decode_failed');
 }
}
function ensureUploads(root) {
 const target=path.join(root,'uploads');
 try{
  const stat=fs.lstatSync(target);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw mediaError('uploads_not_safe',503);
 } catch(e) {
  if(e.code!=='ENOENT')throw e;
  fs.mkdirSync(target,{recursive:false,mode:0o700});
 }
 if(fs.realpathSync(target)!==target)throw mediaError('uploads_not_safe',503);
 return target;
}
function saveBanner(root,prepared) {
 const dir=ensureUploads(root),name=crypto.randomUUID()+'.webp',file=path.join(dir,name);
 fs.writeFileSync(file,prepared.buffer,{flag:'wx',mode:0o600});
 return {file,url:'/media/'+name,bytes:prepared.buffer.length,sha256:prepared.sha256};
}
module.exports={prepareBanner,saveBanner,MAX_IMAGE_BYTES};
