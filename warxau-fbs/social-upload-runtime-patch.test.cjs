'use strict';
const assert = require('node:assert/strict');
const patch = require('./social-upload-runtime-patch.cjs');

{
  const source = "const MAX=40*1024*1024; const length=req.headers['content-length'];";
  const result = patch.patchGatewaySource(source);
  assert.equal(result.count, 1);
  assert.match(result.output, /const MAX=110\*1024\*1024;/);
}

{
  const source = "const max=kind==='avatar'?1024*1024:2*1024*1024; let chunks=[],n=0;" +
    "const vMax=kind==='story'?12:kind==='reel'?30:20;";
  const image = patch.patchTraderProfilesSource(source);
  assert.match(image.output, /kind==='avatar'\?1024\*1024:100\*1024\*1024/);
  const video = patch.patchTraderProfilesSource("const max=kind==='story'?12:kind==='reel'?30:20;");
  assert.match(video.output, /const max=100;/);
}

{
  const source = "async function uploadVideo(file,kind='post'){const max=kind==='story'?12:kind==='reel'?30:20;if(file.size>max*1024*1024)throw Error('Video MP4 maksimal '+max+' MB')}" +
    "async function uploadImage(f){if(f.size>2*1024*1024)throw Error('Foto hanya JPG/PNG/WebP maksimal 2 MB')}" +
    "const label='Foto maks. 2 MB • Video MP4 maks. 12 MB';";
  const result = patch.patchSocialClientSource(source);
  assert.ok(result.count >= 4);
  assert.match(result.output, /const max=100;/);
  assert.match(result.output, /file\.size>100\*1024\*1024/);
  assert.match(result.output, /f\.size>100\*1024\*1024/);
  assert.match(result.output, /maksimal 100 MB/);
  assert.match(result.output, /Maksimal 100 MB per file/);
}

console.log(JSON.stringify({ok:true,maxFileBytes:patch.MAX_FILE_BYTES,maxGatewayBytes:patch.MAX_GATEWAY_BYTES}));
