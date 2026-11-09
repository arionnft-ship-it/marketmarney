'use strict';
const assert = require('node:assert/strict');
const sw = require('./social-upload-sw-preload.cjs');

const source = "const CACHE='marketmarney-offline-old';\nconst CORE=['/','/index.html'];\nself.addEventListener('fetch',()=>{});";
const patched = sw.patchServiceWorker(source);
assert.ok(patched.replacements >= 3);
assert.match(patched.output, /marketmarney-social-upload-20261109-v3/);
assert.match(patched.output, /mm-social-upload-100mb\.js/);
assert.match(patched.output, /MM_SOCIAL_UPLOAD_SW_V3/);
assert.match(patched.output, /caches\.delete/);

const second = sw.patchServiceWorker(patched.output);
assert.equal((second.output.match(/MM_SOCIAL_UPLOAD_SW_V3/g)||[]).length,1);
assert.equal((second.output.match(/mm-social-upload-100mb\.js/g)||[]).length,1);

console.log(JSON.stringify({ok:true,version:sw.VERSION,helper:sw.HELPER}));
