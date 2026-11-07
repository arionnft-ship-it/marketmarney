'use strict';

// Package the approved public arena for progressive loading. The persistent page,
// prices, session validation, battle rules, and private MT4 page stay untouched.
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const VERSION = '20261108-5';
const PREFIX = '/assets/warxau-performance/';
const CACHE = 'public, max-age=31536000, immutable';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('WarXAU performance source anchor changed');
  return source.replace(before, after);
}

function accepts(header, name) {
  const entries = String(header || '').toLowerCase().split(',').map(value => {
    const [coding, ...parameters] = value.trim().split(';');
    const weight = parameters.find(parameter => /^\s*q\s*=/.test(parameter));
    const q = weight ? Number(weight.split('=')[1]) : 1;
    return {coding: coding.trim(), q: Number.isFinite(q) ? q : 0};
  });
  const exact = entries.find(entry => entry.coding === name);
  return (exact || entries.find(entry => entry.coding === '*'))?.q > 0;
}

function notModified(value, etag) {
  return String(value || '').split(',').some(tag => {
    const normalized = tag.trim().replace(/^W\//, '');
    return normalized === '*' || normalized === etag;
  });
}

// This function is serialized into the public bundle. It is used only by the
// existing Canvas2D fallback; WebGL rendering and market/formation state do not
// call it. Exact frame comparison avoids repainting an unchanged waiting arena.
function installSoftwarePerformance(root) {
  const bounds = new WeakMap(), frames = new WeakMap();
  const roundKinds = new Set(['sphere', 'sphereLite', 'rock']);
  const boxKinds = new Set(['cylinder', 'cylinderLite', 'hull', 'turret']);
  const equal = (a, b, length = b.length) => {
    if (!a || a.length !== length) return false;
    for (let i = 0; i < length; i++) if (a[i] !== b[i]) return false;
    return true;
  };
  function begin(engine) {
    const old = frames.get(engine), groups = Object.values(engine.groups), canvas = engine.canvas;
    const leaf = engine.leafImage;
    let reuse = !!old && old.width === canvas.width && old.height === canvas.height &&
      old.leaf === leaf && old.leafReady === !!(leaf?.complete || leaf?.width) &&
      equal(old.vp, engine.vp) && equal(old.eye, engine.eye) && old.groups.length === groups.length;
    if (reuse) for (let i = 0; i < groups.length; i++) {
      const group = groups[i], prior = old.groups[i];
      if (prior.geometry !== group.geometry || !equal(prior.data, group.data, group.used * 20)) { reuse = false; break; }
    }
    if (reuse) { engine.softwareCachedFrames = (engine.softwareCachedFrames || 0) + 1; return {reuse: true}; }
    const m = engine.vp, planes = [], x = 1 + 10 / canvas.width, y = 1 + 10 / canvas.height;
    // Conservative world-space clipping, including the renderer's five-pixel
    // border. Geometry intersecting any screen edge is retained in full.
    for (const [row, scale] of [[0, x], [1, y]]) for (const sign of [-1, 1]) {
      planes.push([m[3] * scale + m[row] * sign, m[7] * scale + m[4 + row] * sign,
        m[11] * scale + m[8 + row] * sign, m[15] * scale + m[12 + row] * sign]);
    }
    planes.push([m[3], m[7], m[11], m[15] - .15]);
    return {reuse: false, planes};
  }
  function boundFor(geometry) {
    let bound = bounds.get(geometry);
    if (!bound) {
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], v = geometry.vertices;
      for (let i = 0; i < v.length; i += 6) for (let j = 0; j < 3; j++) {
        lo[j] = Math.min(lo[j], v[i + j]); hi[j] = Math.max(hi[j], v[i + j]);
      }
      bound = {lo, hi, center: lo.map((value, i) => (value + hi[i]) / 2), extent: lo.map((value, i) => (hi[i] - value) / 2)};
      bounds.set(geometry, bound);
    }
    return bound;
  }
  function outside(geometry, m, planes) {
    const bound = boundFor(geometry);
    const c = bound.center, e = bound.extent;
    const x = m[12] + m[0] * c[0] + m[4] * c[1] + m[8] * c[2];
    const y = m[13] + m[1] * c[0] + m[5] * c[1] + m[9] * c[2];
    const z = m[14] + m[2] * c[0] + m[6] * c[1] + m[10] * c[2];
    const ex = Math.abs(m[0]) * e[0] + Math.abs(m[4]) * e[1] + Math.abs(m[8]) * e[2];
    const ey = Math.abs(m[1]) * e[0] + Math.abs(m[5]) * e[1] + Math.abs(m[9]) * e[2];
    const ez = Math.abs(m[2]) * e[0] + Math.abs(m[6]) * e[1] + Math.abs(m[10]) * e[2];
    return planes.some(p => p[0] * x + p[1] * y + p[2] * z + p[3] +
      Math.abs(p[0]) * ex + Math.abs(p[1]) * ey + Math.abs(p[2]) * ez < -1e-6);
  }
  function detail(geometry, m, vp, width, height, kind) {
    const round = roundKinds.has(kind);
    if (!round && !boxKinds.has(kind)) return geometry;
    const bound = boundFor(geometry), lo = bound.lo, hi = bound.hi;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // Project all eight bounding-box corners. Near-plane intersections, invalid
    // projections, and anything larger than eight canvas pixels keep the exact
    // original mesh. No object, body part, unit or color is removed.
    for (let corner = 0; corner < 8; corner++) {
      const x = corner & 1 ? hi[0] : lo[0], y = corner & 2 ? hi[1] : lo[1], z = corner & 4 ? hi[2] : lo[2];
      const px = m[0] * x + m[4] * y + m[8] * z + m[12];
      const py = m[1] * x + m[5] * y + m[9] * z + m[13];
      const pz = m[2] * x + m[6] * y + m[10] * z + m[14];
      const depth = vp[3] * px + vp[7] * py + vp[11] * pz + vp[15];
      if (!Number.isFinite(depth) || depth <= .15) return geometry;
      const sx = (vp[0] * px + vp[4] * py + vp[8] * pz + vp[12]) / depth * width * .5;
      const sy = (vp[1] * px + vp[5] * py + vp[9] * pz + vp[13]) / depth * height * .5;
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    const size = Math.max(maxX - minX, maxY - minY);
    if (!Number.isFinite(size) || size > 8) return geometry;
    const key = round ? 'roundDetail' : 'boxDetail';
    if (bound[key]) return bound[key];
    const center = bound.center, vertices = [], indices = [];
    function face(points) {
      const a = points[0], u = points[1].map((value, i) => value - a[i]), v = points[2].map((value, i) => value - a[i]);
      let normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      if (normal.reduce((total, value, i) => total + value * (a[i] - center[i]), 0) < 0) {
        points = points.slice().reverse(); normal = normal.map(value => -value);
      }
      const length = Math.hypot(...normal) || 1, start = vertices.length / 6;
      for (const point of points) vertices.push(...point, ...normal.map(value => value / length));
      for (let i = 1; i < points.length - 1; i++) indices.push(start, start + i, start + i + 1);
    }
    if (round) {
      const ring = [[hi[0], center[1], center[2]], [center[0], center[1], hi[2]],
        [lo[0], center[1], center[2]], [center[0], center[1], lo[2]]];
      for (let i = 0; i < 4; i++) {
        face([[center[0], hi[1], center[2]], ring[i], ring[(i + 1) % 4]]);
        face([[center[0], lo[1], center[2]], ring[(i + 1) % 4], ring[i]]);
      }
    } else {
      const points = [];
      for (let corner = 0; corner < 8; corner++) points.push([corner & 1 ? hi[0] : lo[0], corner & 2 ? hi[1] : lo[1], corner & 4 ? hi[2] : lo[2]]);
      for (const ids of [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]) face(ids.map(i => points[i]));
    }
    // Reuse geometry across all matching small parts; preserve original bounds
    // exactly, so the conservative culling test stays valid for either detail.
    bound[key] = {vertices: new Float32Array(vertices), indices: new Uint16Array(indices)};
    return bound[key];
  }
  function remember(engine) {
    frames.set(engine, {width: engine.canvas.width, height: engine.canvas.height, vp: engine.vp.slice(),
      eye: engine.eye.slice(), leaf: engine.leafImage, leafReady: !!(engine.leafImage?.complete || engine.leafImage?.width),
      groups: Object.values(engine.groups).map(group => ({geometry: group.geometry, data: group.data.slice(0, group.used * 20)}))});
  }
  root.MMSoftwarePerformance = Object.freeze({begin, outside, detail, remember});
}

function createWarXauPerformance({layoutSource, chatSource, cssSource}) {
  if (![layoutSource, chatSource, cssSource].every(value => typeof value === 'string' && value)) {
    throw Error('WarXAU performance assets required');
  }
  const assets = new Map();
  let details = null;

  function transform(input) {
    if (typeof input !== 'string') throw Error('WarXAU performance HTML required');
    if (input.includes('data-warxau-performance="' + VERSION + '"')) return input;
    if (!input.includes('window.MM_WAR_LIVE_BUILD="7.7-gold-api"') ||
        !input.includes('https://api.gold-api.com/price/XAU') ||
        input.includes('7.8-fbs-private')) {
      throw Error('WarXAU performance only accepts the public Gold API arena');
    }

    // Build atomically, so a changed source never leaves a partially rewritten page.
    const nextAssets = new Map();
    function add(data, extension, type) {
      const body = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      const path = PREFIX + digest(body) + '.' + extension;
      const variants = {identity: {body, etag: '"' + digest(body) + '"'}};
      if (extension === 'js' || extension === 'css') {
        const gzip = zlib.gzipSync(body, {level: 6});
        variants.gzip = {body: gzip, etag: '"' + digest(gzip) + '"'};
        const br = zlib.brotliCompressSync(body, {
          params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 5}
        });
        variants.br = {body: br, etag: '"' + digest(br) + '"'};
      }
      nextAssets.set(path, {type, variants});
      return path;
    }

    let html = replaceOnce(input,
      '<script data-warxau-topchat="7.8" src="/assets/warxau-topchat-layout.js?v=7.8"></script>',
      '<script defer data-warxau-topchat="7.8" src="/assets/warxau-topchat-layout.js?v=7.8"></script>');
    html = replaceOnce(html, '<script src="/assets/warxau-topchat-chat.js?v=7.8"></script>', '');
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(match => !/\bsrc\s*=|\btype\s*=/i.test(match[1]));
    if (scripts.length !== 24) throw Error('WarXAU public script sequence changed');

    const originalScripts = scripts.map(match => match[2]);
    if (originalScripts.some(source => /DOMContentLoaded|document\.write\s*\(|document\.currentScript/.test(source))) {
      throw Error('WarXAU startup now depends on parser events; deferred packaging needs review');
    }
    const packagedScripts = originalScripts.slice();
    const atlasIndex = packagedScripts.findIndex(source => source.includes('window.MMAshfallAssets='));
    if (atlasIndex < 0) throw Error('WarXAU material atlas missing');
    const atlasMatch = packagedScripts[atlasIndex].match(/window\.MMAshfallAssets\s*=\s*(\{[\s\S]*\})\s*;\s*$/);
    if (!atlasMatch) throw Error('WarXAU material atlas format changed');
    const inlineAssets = JSON.parse(atlasMatch[1]);
    const materialKeys = ['surface-atlas', 'normal-atlas', 'smoke', 'flame'];
    if (Object.keys(inlineAssets).sort().join('|') !== materialKeys.slice().sort().join('|')) {
      throw Error('WarXAU material set changed');
    }
    const materialPaths = {};
    let textureBytes = 0;
    for (const name of materialKeys) {
      const value = inlineAssets[name];
      const match = typeof value === 'string' && value.match(/^data:image\/webp;base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match) throw Error('WarXAU material must be an embedded WebP');
      const bytes = Buffer.from(match[1], 'base64');
      if (bytes.toString('base64') !== match[1] || bytes.toString('ascii', 0, 4) !== 'RIFF' ||
          bytes.toString('ascii', 8, 12) !== 'WEBP') throw Error('Invalid WarXAU WebP');
      textureBytes += bytes.length;
      materialPaths[name] = add(bytes, 'webp', 'image/webp');
    }
    packagedScripts[atlasIndex] = packagedScripts[atlasIndex].replace(atlasMatch[1], JSON.stringify(materialPaths));

    // HD is the existing, sole public quality mode. Its unused fast shader used to
    // compile synchronously during startup. Retain it lazily if ever selected.
    const rendererIndex = packagedScripts.findIndex(source => source.includes('class PremiumRenderer extends Base'));
    if (rendererIndex < 0 || !packagedScripts[rendererIndex].includes("if(value!=='hd')return false;")) {
      throw Error('WarXAU HD renderer contract changed');
    }
    let renderer = replaceOnce(packagedScripts[rendererIndex],
      'if(this.gl)this.programFast=this.makeProgram(true);', 'this.programFast=null;');
    renderer = replaceOnce(renderer,
      'const p=(this.fastTier()?this.programFast:this.program)||this.program;',
      'if(this.fastTier()&&!this.programFast)this.programFast=this.makeProgram(true);const p=(this.fastTier()?this.programFast:this.program)||this.program;');
    renderer = replaceOnce(renderer,
      "fastTier(){return this.quality==='eco';}",
      "fastTier(){return this.quality==='eco'||this.softwareGL;}");
    renderer = replaceOnce(renderer,
      'const ratio=Math.min(root.devicePixelRatio||1,1.5,1280/r.width,720/r.height);',
      'const ratio=(this.soft||this.softwareGL)?Math.min(root.devicePixelRatio||1,.8,900/r.width,500/r.height):Math.min(root.devicePixelRatio||1,1.5,1280/r.width,720/r.height);');
    packagedScripts[rendererIndex] = renderer;

    // The original software renderer already supports reduced meshes. Keep all
    // units, positions, colors and battle updates, but use its low-detail unit
    // path consistently when WebGL2 is unavailable. The HD WebGL path is exact.
    const assaultIndex = packagedScripts.findIndex(source => source.includes('this.lowLOD=this.quality===\'eco\'||u.rank>0'));
    if (assaultIndex < 0) throw Error('WarXAU software LOD contract changed');
    packagedScripts[assaultIndex] = replaceOnce(packagedScripts[assaultIndex],
      "this.lowLOD=this.quality==='eco'||u.rank>0", "this.lowLOD=this.soft||this.softwareGL||this.quality==='eco'||u.rank>0");
    const engineIndex = packagedScripts.findIndex(source => source.includes(' renderSoftware(){'));
    if (engineIndex < 0) throw Error('WarXAU software renderer missing');
    let engine = replaceOnce(packagedScripts[engineIndex], ' renderSoftware(){',
      ' renderSoftware(){\n  const softwareFrame=root.MMSoftwarePerformance.begin(this);if(softwareFrame.reuse)return;');
    engine = replaceOnce(engine, 'for(const group of Object.values(this.groups)){',
      'for(const [groupName,group] of Object.entries(this.groups)){');
    engine = replaceOnce(engine, 'const verts=group.geometry.vertices,ids=group.geometry.indices;', '');
    engine = replaceOnce(engine,
      'const off=instance*20,m=group.data.subarray(off,off+16),col=group.data.subarray(off+16,off+20);',
      'const off=instance*20,m=group.data.subarray(off,off+16),col=group.data.subarray(off+16,off+20);if(root.MMSoftwarePerformance.outside(group.geometry,m,softwareFrame.planes))continue;const geometry=root.MMSoftwarePerformance.detail(group.geometry,m,vp,w,h,groupName),verts=geometry.vertices,ids=geometry.indices;');
    engine = replaceOnce(engine, 'this.drawCalls=polys.length;',
      'this.drawCalls=polys.length;root.MMSoftwarePerformance.remember(this);');
    packagedScripts[engineIndex] = engine;
    const presentationIndex = packagedScripts.findIndex(source => source.includes("$('premium-quality-label').textContent='HD';"));
    if (presentationIndex < 0) throw Error('WarXAU renderer status missing');
    let presentation = replaceOnce(packagedScripts[presentationIndex],
      "$('premium-quality-label').textContent='HD';", "$('premium-quality-label').textContent=(p.softwareFallback||p.softwareWebGL)?'MODE RINGAN':'HD';");
    presentation = replaceOnce(presentation,
      '${p.renderWidth} × ${p.renderHeight} · ${s.fps||0} FPS · ${p.drawCalls} batch',
      '${p.renderWidth} × ${p.renderHeight} · ${s.fps||0} FPS · ${p.drawCalls} ${p.softwareFallback?\'poligon\':\'batch\'}');
    packagedScripts[presentationIndex] = presentation;

    // Keep the existing layout URL: the deployed arena chain overrides that
    // route to add its market selector. Its defer script runs before this bundle.
    // All original modules then run together, in their original order, after the
    // browser gets an opportunity to paint the layout and market navigation.
    const bundle = '/* WarXAU progressive public startup ' + VERSION + '. */\n' +
      '\n;(function(){\nfunction start(){\n(' + installSoftwarePerformance.toString() + ')(window);\n' + packagedScripts.join('\n;\n') +
      '\n}\nif(typeof requestAnimationFrame===\'function\')requestAnimationFrame(()=>setTimeout(start,0));else setTimeout(start,0);\n})();\n';
    const bundlePath = add(bundle, 'js', 'text/javascript; charset=utf-8');
    const chatPath = add(chatSource, 'js', 'text/javascript; charset=utf-8');
    const cssPath = add(cssSource, 'css', 'text/css; charset=utf-8');
    const replacement = '<script defer data-warxau-performance="' + VERSION + '" src="' + bundlePath + '"></script>' +
      '<script defer src="' + chatPath + '"></script>';
    let first = true;
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attributes) => {
      if (/\bsrc\s*=|\btype\s*=/i.test(attributes)) return full;
      if (!first) return '';
      first = false;
      return replacement;
    });
    html = replaceOnce(html, 'href="/assets/warxau-topchat.css?v=7.8"', 'href="' + cssPath + '"');
    html = replaceOnce(html, '</head>', '<link rel="preload" as="script" href="' + bundlePath + '">\n</head>');

    for (const [path, asset] of nextAssets) assets.set(path, asset);
    details = {
      version: VERSION, originalPageBytes: Buffer.byteLength(input), pageBytes: Buffer.byteLength(html),
      scriptCount: scripts.length, bundlePath, bundleBytes: Buffer.byteLength(bundle),
      textureBytes, materialPaths, cachedAssets: nextAssets.size,
      unchangedScriptCount: originalScripts.filter((source, index) => source === packagedScripts[index]).length
    };
    return html;
  }

  function handle(req, res) {
    const path = String(req.url || '').split('?')[0];
    const asset = assets.get(path);
    if (!asset) return false;
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, {'Allow': 'GET, HEAD', 'Cache-Control': 'no-store'});
      res.end();
      return true;
    }
    const coding = asset.variants.br && accepts(req.headers['accept-encoding'], 'br') ? 'br' :
      asset.variants.gzip && accepts(req.headers['accept-encoding'], 'gzip') ? 'gzip' : 'identity';
    const variant = asset.variants[coding];
    const headers = {
      'Content-Type': asset.type, 'Cache-Control': CACHE, 'ETag': variant.etag,
      'X-Content-Type-Options': 'nosniff', 'X-WarXAU-Performance': VERSION
    };
    if (asset.variants.gzip) headers.Vary = 'Accept-Encoding';
    if (coding !== 'identity') headers['Content-Encoding'] = coding;
    if (notModified(req.headers['if-none-match'], variant.etag)) {
      res.writeHead(304, headers);
      res.end();
      return true;
    }
    headers['Content-Length'] = variant.body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : variant.body);
    return true;
  }

  return {transform, handle, metadata: () => details ? {...details, materialPaths: {...details.materialPaths}} : null};
}

module.exports = {createWarXauPerformance, installSoftwarePerformance, VERSION, PREFIX};
