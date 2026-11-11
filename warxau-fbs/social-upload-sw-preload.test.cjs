'use strict';
const assert = require('node:assert/strict');
const sw = require('./social-upload-sw-preload.cjs');

const source = "const CACHE='marketmarney-offline-old';\nconst CORE=['/','/index.html'];\nself.addEventListener('fetch',()=>{});";
const patched = sw.patchServiceWorker(source);
assert.ok(patched.replacements >= 3);
assert.match(patched.output, /marketmarney-runtime-20261111-v10/);
assert.match(patched.output, /mm-social-upload-100mb\.js/);
assert.match(patched.output, /mm-social-experience\.js/);
assert.match(patched.output, /mm-social-experience\.css/);
assert.match(patched.output, /mm-social-refinement\.js\?v=20261111-social-refinement-v2/);
assert.match(patched.output, /mm-social-refinement\.css\?v=20261111-social-refinement-v2/);
assert.match(patched.output, /mm-social-routing\.js\?v=20261111-social-routing-v2/);
assert.match(patched.output, /mm-automatic-pivot\.js/);
assert.match(patched.output, /warxau-live-stream\.js/);
assert.match(patched.output, /MM_RUNTIME_SW_V10/);
assert.match(patched.output, /xau-war-3d\.html/);
assert.match(patched.output, /navigationPaths/);
assert.match(patched.output, /reels\.html/);
assert.match(patched.output, /start-stream/);
assert.match(patched.output, /cache\.delete/);

const second = sw.patchServiceWorker(patched.output);
assert.equal((second.output.match(/MM_RUNTIME_SW_V10/g)||[]).length,1);
assert.equal((second.output.match(/mm-social-upload-100mb\.js/g)||[]).length,1);
assert.equal((second.output.match(/mm-social-experience\.js/g)||[]).length,1);
assert.equal((second.output.match(/mm-social-experience\.css/g)||[]).length,1);
assert.equal((second.output.match(/mm-social-refinement\.js/g)||[]).length,1);
assert.equal((second.output.match(/mm-social-refinement\.css/g)||[]).length,1);
assert.equal((second.output.match(/mm-social-routing\.js/g)||[]).length,1);
assert.equal((second.output.match(/mm-automatic-pivot\.js/g)||[]).length,1);
assert.equal((second.output.match(/warxau-live-stream\.js/g)||[]).length,2);
assert.equal(sw.HELPERS.length,8);

console.log(JSON.stringify({ok:true,version:sw.VERSION,helpers:sw.HELPERS}));
