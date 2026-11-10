'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const sharp=require('sharp');
const root=path.join(__dirname,'marney-brand-assets');
const branding=require('./branding.cjs');
const about=require('./about-refresh.cjs');

async function pixels(file){
 const result=await sharp(path.join(root,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const data=result.data;let black=0,white=0,orange=0,transparent=0;
 for(let i=0;i<data.length;i+=4){
  const [r,g,b,a]=[data[i],data[i+1],data[i+2],data[i+3]];
  if(a<10)transparent++;
  if(a>190&&r<90&&g<90&&b<90)black++;
  if(a>190&&r>220&&g>220&&b>220)white++;
  if(a>190&&r>165&&g>45&&g<205&&b<120)orange++;
 }
 return {info:result.info,black,white,orange,transparent};
}
test('all selected brand marks are generated, including dark and About variants',async()=>{
 for(const name of ['logo.png','logo.webp','logo-dark.png','logo-dark.webp','about-logo.webp','wordmark.png','wordmark.webp','wordmark-dark.webp','favicon.png','favicon.ico','apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-192.png','icon-maskable-512.png']){
  assert.ok(fs.existsSync(path.join(root,name)),name);
  assert.ok(fs.statSync(path.join(root,name)).size>100,name);
 }
 const light=await pixels('logo.png');
 const dark=await pixels('about-logo.webp');
 assert.equal(light.info.width,512);assert.equal(light.info.height,512);
 assert.ok(light.transparent>1000,'light logo must have transparent edges');
 assert.ok(light.black>2000,'original black M is preserved');
 assert.ok(light.orange>1500,'original orange arrow is preserved');
 assert.ok(dark.transparent>1000,'About logo must remain transparent');
 assert.ok(dark.white>2000,'white M is visible on dark surfaces');
 assert.ok(dark.orange>1500,'orange arrow remains recognizable');
 const wordmark=await sharp(path.join(root,'wordmark.png')).metadata();
 assert.equal(wordmark.width,800);assert.equal(wordmark.height,170);
});
test('all website, favicon and PWA paths map to the new logo assets',async()=>{
 assert.equal(branding.VERSION,'marney-m-arrow-20261110-v1');
 for(const url of ['/assets/brand-logo.png','/assets/brand-logo.webp','/assets/brand-logo-dark.webp','/assets/brand-wordmark.png','/assets/brand-wordmark.webp','/assets/brand-wordmark-dark.webp','/assets/brand-about-transparent.webp','/favicon.png','/favicon.ico','/apple-touch-icon.png','/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-192.png','/icons/icon-maskable-512.png']){
  const filename=branding.aliases.get(url);
  assert.ok(filename,url);
  assert.ok(fs.existsSync(path.join(root,filename)),filename);
 }
 assert.match(branding.CLIENT,/isDarkSurface/);
 new (require('node:vm').Script)(branding.CLIENT);
 assert.match(about.CLIENT,/brand-about-transparent/);
 const icon=await sharp(path.join(root,'icon-512.png')).metadata();
 assert.equal(icon.width,512);assert.equal(icon.height,512);
});
