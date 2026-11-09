'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = '/persist/site-r1/MarketMarney-Railway-Staging/app';
const FILE_HINT = /(?:pivot|anal|market|chart|trading|price|quote|candle|ohlc|feed|home|admin|server|warxau|xau|gold)/i;
const TERMS = [
  /mm1816-admin-settings/ig,
  /pivot(?:\s+point)?/ig,
  /OANDA:XAUUSD/ig,
  /XAUUSD/ig,
  /(?:ohlc|candles?|bars?|klines?|history|timeseries)/ig,
  /(?:previous|yesterday|daily|weekly)[^\n]{0,80}(?:high|low|close)/ig,
  /(?:high|low|close)[^\n]{0,100}(?:high|low|close)/ig,
  /(?:query1\.finance|twelvedata|stooq|finnhub|alphavantage|polygon|metals-api|tradingview|oanda)/ig,
  /\/api\/[a-z0-9_?&=\-/.]+/ig,
  /fetch\s*\(/ig
];

function clean(value) {
  return String(value)
    .replace(/[A-Za-z0-9_+\-/=]{64,}/g, '[redacted-long-token]')
    .replace(/\s+/g, ' ')
    .slice(0, 900);
}

function scanMatches(text) {
  const output = [];
  const seen = new Set();
  for (const pattern of TERMS) {
    pattern.lastIndex = 0;
    let match;
    let count = 0;
    while ((match = pattern.exec(text)) && count < 12 && output.length < 50) {
      count++;
      const from = Math.max(0, match.index - 300);
      const to = Math.min(text.length, match.index + match[0].length + 520);
      const snippet = clean(text.slice(from, to));
      const key = snippet.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        output.push({ term: match[0], snippet });
      }
      if (!match[0].length) pattern.lastIndex++;
    }
  }
  return output;
}

function run() {
  if (process.env.MM_PIVOT_PROBE !== '1') return;
  const candidates = [];
  let visited = 0;
  function walk(dir, depth) {
    if (depth > 7 || visited >= 1600) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (visited >= 1600) return;
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
      if (!stat.isFile() || stat.size > 7 * 1024 * 1024) continue;
      const relative = path.relative(ROOT, full);
      let text;
      try { text = fs.readFileSync(full, 'utf8'); }
      catch { continue; }
      const hits = scanMatches(text);
      if (FILE_HINT.test(relative) || hits.length) candidates.push({ relative, bytes: stat.size, hits });
    }
  }
  walk(ROOT, 0);
  const names = candidates.map(item => ({file:item.relative,bytes:item.bytes,hits:item.hits.length})).slice(0,160);
  console.log('MM_PIVOT_FILES ' + JSON.stringify({visited,names}));
  let emitted = 0;
  for (const item of candidates) {
    if (!item.hits.length || emitted >= 45) continue;
    emitted++;
    console.log('MM_PIVOT_FILE ' + JSON.stringify({file:item.relative,bytes:item.bytes,hits:item.hits.slice(0,16)}));
  }
  console.log('MM_PIVOT_PROBE_DONE ' + JSON.stringify({visited,candidates:candidates.length,emitted}));
}

setTimeout(run, 1200).unref();
