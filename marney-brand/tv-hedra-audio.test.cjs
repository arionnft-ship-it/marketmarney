'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('./tv-hedra-audio.cjs');
test('only the single approved Hedra asset and pinned prior video can be downloaded',()=>{
 const good='https://hedra-api-audio-6923ef8dbda63b10.s3.amazonaws.com/web-app-v2/audio/28fb0efe-c22e-4694-afa5-dac3c89d1ae1/324cbc93-2885-4d91-86ff-bd22497e4cae.mp3?Expires=123';
 assert.equal(H.urlIsApproved(good,'hedra'),true);
 assert.equal(H.urlIsApproved(H.PREVIOUS,'video'),true);
 assert.equal(H.urlIsApproved('https://evil.example.com/file.mp3','hedra'),false);
 assert.equal(H.urlIsApproved('http://127.0.0.1/file.mp3','hedra'),false);
 assert.equal(H.urlIsApproved('https://hedra-api-audio-6923ef8dbda63b10.s3.amazonaws.com.evil.com/web-app-v2/audio/28fb0efe-c22e-4694-afa5-dac3c89d1ae1/324cbc93-2885-4d91-86ff-bd22497e4cae.mp3','hedra'),false);
});
test('media route is exact and never interferes with other MarketMarney video IDs',()=>{
 const fake={url:'/media/other.mp4',method:'GET',headers:{}};
 assert.equal(H.send(fake,{}),false);
 assert.equal(H.MEDIA_PATH,'/media/85440075-e5d4-4637-b034-6f8b3051b287.mp4');
 assert.equal(H.VERSION,'marketmarney-tv-broker-hedra-rizky-v4');
});
