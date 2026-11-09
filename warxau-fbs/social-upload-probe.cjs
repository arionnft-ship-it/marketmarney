'use strict';

const fs = require('node:fs');
const path = require('node:path');

if (process.env.MM_SOCIAL_UPLOAD_PROBE === '1') {
  const APP_ROOT = '/persist/site-r1/MarketMarney-Railway-Staging/app';
  const needles = [
    'mm81-story-upload-file', 'mm81-post-submit', 'Foto maks. 2 MB',
    'Video MP4 maks. 12 MB', 'Tambah Reel', 'Terbitkan Reel',
    'file.size', 'FormData', 'multipart/form-data', 'Berkas terlalu besar',
    '2097152', '12582912', '104857600', '2*1024*1024', '12*1024*1024'
  ];

  function clean(value) {
    return String(value)
      .replace(/[A-Za-z0-9_+\/-]{80,}={0,2}/g, '[redacted-token]')
      .replace(/\s+/g, ' ')
      .slice(0, 900);
  }

  function snippets(label, text) {
    const found = [];
    const seen = new Set();
    for (const needle of needles) {
      let at = 0;
      while ((at = text.indexOf(needle, at)) !== -1 && found.length < 80) {
        const snippet = clean(text.slice(Math.max(0, at - 260), Math.min(text.length, at + needle.length + 420)));
        const key = needle + '|' + snippet;
        if (!seen.has(key)) {
          seen.add(key);
          found.push({ needle, snippet });
        }
        at += Math.max(1, needle.length);
      }
    }
    const definitions = text.match(/\b(?:const|let|var)\s+(?:MAX|MAX_[A-Z0-9_]*|[A-Z0-9_]*(?:UPLOAD|BODY|FILE|MEDIA)[A-Z0-9_]*)\s*=\s*[^;\n]{1,180}[;\n]/g) || [];
    for (const definition of definitions.slice(0, 40)) found.push({ needle: 'definition', snippet: clean(definition) });
    return found.length ? { source: label, matches: found } : null;
  }

  function scanFiles() {
    const reports = [];
    let visited = 0;
    function walk(dir, depth) {
      if (depth > 7 || reports.length >= 30 || visited > 2500) return;
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (reports.length >= 30 || visited > 2500) break;
        const full = path.join(dir, entry.name);
        const rel = path.relative(APP_ROOT, full);
        if (entry.isDirectory()) {
          if (!/^(?:node_modules|uploads|media|cache|backups)$/i.test(entry.name)) walk(full, depth + 1);
          continue;
        }
        visited++;
        if (!/\.(?:js|cjs|mjs|html)$/i.test(entry.name)) continue;
        let stat;
        try { stat = fs.statSync(full); } catch { continue; }
        if (stat.size > 12 * 1024 * 1024) continue;
        let text;
        try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
        const report = snippets(rel, text);
        if (report) reports.push({ ...report, bytes: stat.size });
      }
    }
    walk(APP_ROOT, 0);
    return { visited, reports };
  }

  const originalWriteFileSync = fs.writeFileSync;
  fs.writeFileSync = function (target, data, ...rest) {
    if (String(target) === '/tmp/marketmarney-public.cjs') {
      const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      const gateway = snippets('public-gateway', text);
      console.log('MM_SOCIAL_UPLOAD_GATEWAY_PROBE ' + JSON.stringify({ bytes: Buffer.byteLength(text), gateway }));
    }
    return originalWriteFileSync.call(this, target, data, ...rest);
  };

  try {
    console.log('MM_SOCIAL_UPLOAD_FILES_PROBE ' + JSON.stringify(scanFiles()));
  } catch (error) {
    console.log('MM_SOCIAL_UPLOAD_FILES_PROBE_ERROR ' + clean(error && error.message));
  }
}
