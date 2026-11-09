'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = '/persist/site-r1/MarketMarney-Railway-Staging/app';
const TARGETS = [
  'server.js',
  'index.html',
  'admin.html',
  'assets/pivot-center-1818.js',
  'assets/pivot-methods-1819.js',
  'assets/pivot-center-1818.css',
  'assets/pivot-table-1819.css'
];
const TERMS = [
  'PIVOT_KEY1816', 'PIVOT_HISTORY_KEY1817', 'pivotFreshness1817',
  '/api/pivot-public', '/api/admin/pivot-publications',
  'computePivotMethods1819', 'mm1816PivotLevels', 'mm1818Center',
  'mm1816-pivot-public', 'mm1816-pivot-form', 'mm1817RefreshPivot',
  'High', 'Low', 'Close', 'Sumber data diperlukan'
];

function clean(value) {
  return String(value)
    .replace(/[A-Za-z0-9_+\-/=]{72,}/g, '[redacted-long-token]')
    .replace(/\s+/g, ' ')
    .slice(0, 1400);
}

function emitFile(relative) {
  const file = path.join(ROOT, relative);
  let text;
  try { text = fs.readFileSync(file, 'utf8'); }
  catch (error) {
    console.log('MM_PIVOT_TARGET_MISSING ' + JSON.stringify({file:relative,error:String(error.message).slice(0,160)}));
    return;
  }
  console.log('MM_PIVOT_TARGET_META ' + JSON.stringify({file:relative,bytes:Buffer.byteLength(text)}));
  if (text.length <= 24000 && /pivot-(?:center|methods)|pivot-table/i.test(relative)) {
    const size = 5000;
    for (let offset = 0, part = 1; offset < text.length; offset += size, part++) {
      console.log('MM_PIVOT_TARGET_BODY ' + JSON.stringify({file:relative,part,text:clean(text.slice(offset,offset+size))}));
    }
  }
  let emitted = 0;
  const seen = new Set();
  for (const term of TERMS) {
    let from = 0;
    while (emitted < 36) {
      const index = text.indexOf(term, from);
      if (index < 0) break;
      from = index + term.length;
      const snippet = clean(text.slice(Math.max(0,index-700),Math.min(text.length,index+term.length+1200)));
      if (!seen.has(snippet)) {
        seen.add(snippet); emitted++;
        console.log('MM_PIVOT_TARGET_SNIP ' + JSON.stringify({file:relative,term,part:emitted,snippet}));
      }
    }
  }
}

function run() {
  if (process.env.MM_PIVOT_PROBE !== '1') return;
  let pivotFiles = [];
  try {
    pivotFiles = fs.readdirSync(path.join(ROOT,'assets'))
      .filter(name => /pivot|analys|market|chart|trading|quote|candle|price/i.test(name))
      .sort();
  } catch {}
  console.log('MM_PIVOT_ASSET_NAMES ' + JSON.stringify({files:pivotFiles}));
  for (const target of TARGETS) emitFile(target);
  console.log('MM_PIVOT_TARGET_DONE ' + JSON.stringify({targets:TARGETS.length}));
}

setTimeout(run, 1200).unref();
