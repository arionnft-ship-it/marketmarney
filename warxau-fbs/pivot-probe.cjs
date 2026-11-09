'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = '/persist/site-r1/MarketMarney-Railway-Staging/app';
const TERMS = [
  /pivot/ig,
  /support/ig,
  /resistance/ig,
  /analisa/ig,
  /ohlc/ig,
  /candle/ig,
  /\bhigh\b/ig,
  /\blow\b/ig,
  /\bclose\b/ig,
  /tradingview/ig,
  /\/api\/[a-z0-9_?&=\-/.]+/ig,
  /fetch\s*\(/ig
];

function clean(value) {
  return String(value)
    .replace(/[A-Za-z0-9_+\-/=]{64,}/g, '[redacted-long-token]')
    .replace(/\s+/g, ' ')
    .slice(0, 640);
}

function matches(label, text) {
  const out = [];
  const seen = new Set();
  for (const pattern of TERMS) {
    pattern.lastIndex = 0;
    let match;
    let count = 0;
    while ((match = pattern.exec(text)) && count < 8 && out.length < 70) {
      count++;
      const from = Math.max(0, match.index - 220);
      const to = Math.min(text.length, match.index + match[0].length + 360);
      const snippet = clean(text.slice(from, to));
      const key = match[0].toLowerCase() + '|' + snippet;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ term: match[0], snippet });
      }
      if (!match[0].length) pattern.lastIndex++;
    }
  }
  return out.length ? { source: label, matches: out } : null;
}

function scan() {
  if (process.env.MM_PIVOT_PROBE !== '1') return;
  const reports = [];
  let visited = 0;
  function walk(dir, depth) {
    if (depth > 6 || reports.length >= 60 || visited >= 1200) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (reports.length >= 60 || visited >= 1200) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!/node_modules|uploads|media|backup|cache/i.test(entry.name)) walk(full, depth + 1);
        continue;
      }
      if (!/\.(?:js|cjs|mjs|html|json)$/i.test(entry.name)) continue;
      visited++;
      let stat;
      try { stat = fs.statSync(full); }
      catch { continue; }
      if (!stat.isFile() || stat.size > 6 * 1024 * 1024) continue;
      let text;
      try { text = fs.readFileSync(full, 'utf8'); }
      catch { continue; }
      const report = matches(path.relative(ROOT, full), text);
      if (report) reports.push({ ...report, bytes: stat.size });
    }
  }
  walk(ROOT, 0);
  console.log('MM_PIVOT_PROBE ' + JSON.stringify({ visited, reports }));
}

setTimeout(scan, 1500).unref();
