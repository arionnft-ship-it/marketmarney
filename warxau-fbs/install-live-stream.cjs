'use strict';

const fs = require('node:fs');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const files = [
  {
    output: 'live-stream.cjs',
    parts: [
      'live-stream.cjs.gz.b64.01a',
      'live-stream.cjs.gz.b64.01b',
      'live-stream.cjs.gz.b64.01c',
      'live-stream.cjs.gz.b64.02a',
      'live-stream.cjs.gz.b64.02b',
      'live-stream.cjs.gz.b64.02c',
      'live-stream.cjs.gz.b64.03'
    ],
    sha256: 'bf449406bbea398ff7c1451c8052a62f877b3d2a57f17afd4c8ffbb1016cca7a'
  },
  {
    output: 'live-stream-preload.cjs',
    parts: ['live-stream-preload.cjs.gz.b64'],
    sha256: '5a51a2895fe71dfd93e32daa73ee93b1ec49ca2047b666cc40ed5d11a3f41b06'
  },
  {
    output: 'live-stream.test.cjs',
    parts: ['live-stream.test.cjs.gz.b64'],
    sha256: '78acc560662129ca013d53c0ea0e97f88443cc603e439db534b5469582bec5ce'
  }
];

for (const item of files) {
  const encoded = item.parts.map(name => fs.readFileSync(name, 'utf8').trim()).join('');
  const source = zlib.gunzipSync(Buffer.from(encoded, 'base64'), { maxOutputLength: 256 * 1024 });
  const digest = crypto.createHash('sha256').update(source).digest('hex');
  if (digest !== item.sha256) throw new Error('live_source_integrity_mismatch:' + item.output);
  fs.writeFileSync(item.output, source, { mode: 0o600 });
}

console.log('MM_LIVE_STREAM_SOURCE_READY ' + JSON.stringify({ files: files.map(item => item.output) }));
