'use strict';

// Exercise the actual software renderer with a recording Canvas2D context.
// This checks geometry/culling and idle invalidation; it is not a browser FPS test.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {enhancePage} = require('./topchat.cjs');
const {createWarXauPerformance} = require('./performance-warxau.cjs');
const raw = fs.readFileSync(path.join(__dirname, '../warxau-live/dist/WEB-LIVE.html'), 'utf8');
const original = [...raw.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
const addon = createWarXauPerformance({layoutSource: '/* test layout */', chatSource: '/* test chat */', cssSource: '/* test style */'});
addon.transform(enhancePage(raw));
let bundle;
addon.handle({url: addon.metadata().bundlePath, method: 'GET', headers: {}}, {writeHead() {}, end(body) { bundle = body.toString(); }});
const start = bundle.indexOf('function start(){') + 'function start(){'.length;
const patchedDefinitions = bundle.slice(start, bundle.indexOf(original[20]));
const baselineDefinitions = original.slice(0, 19).map((source, i) => i === 7 ? 'window.MMAshfallAssets={};' : source).join('\n;\n');
const sameDetailDefinitions = patchedDefinitions
  .replace("this.lowLOD=this.soft||this.quality==='eco'||u.rank>0", "this.lowLOD=this.quality==='eco'||u.rank>0")
  .replace('this.soft?Math.min(root.devicePixelRatio||1,.85,960/r.width,540/r.height):Math.min(root.devicePixelRatio||1,1.5,1280/r.width,720/r.height)', 'Math.min(root.devicePixelRatio||1,1.5,1280/r.width,720/r.height)')
  .replace('root.MMSoftwarePerformance.detail(group.geometry,m,vp,w,h,groupName)', 'group.geometry');

function harness(definitions) {
  let recording = false, hash, calls = 0;
  const record = (name, args) => { if (recording) { calls++; hash.update(name + ':' + JSON.stringify(args) + '\n'); } };
  const canvasContext = capture => new Proxy({
    createLinearGradient(...args) { if (capture) record('linearGradient', args); return {kind: 'gradient', addColorStop(...values) { if (capture) record('colorStop', values); }}; },
    createRadialGradient(...args) { if (capture) record('radialGradient', args); return {kind: 'gradient', addColorStop(...values) { if (capture) record('colorStop', values); }}; },
    measureText() { return {width: 0}; }
  }, {
    get(object, key) { if (key in object) return object[key]; return (...args) => { if (capture) record(String(key), args); }; },
    set(object, key, value) { object[key] = value; if (capture) record(String(key), [value]); return true; }
  });
  const makeCanvas = capture => {
    const context = canvasContext(capture);
    return {width: 942, height: 529, getContext(type) { return type === 'webgl2' ? null : context; },
      getBoundingClientRect() { return {width: 942, height: 529}; }, addEventListener() {}, matches() { return false; }};
  };
  const elements = new Map();
  const root = {document: {hidden: false, getElementById(id) { if (!elements.has(id)) elements.set(id, makeCanvas(false)); return elements.get(id); }, createElement() { return makeCanvas(false); }},
    matchMedia() { return {matches: false}; }, ResizeObserver: class { observe() {} },
    Image: class { constructor() { this.complete = true; this.naturalWidth = 256; } },
    performance, console, devicePixelRatio: 1, addEventListener() {}};
  root.window = root; root.globalThis = root;
  vm.runInNewContext(definitions, root);
  const engine = new root.MMWarEngine(makeCanvas(true)); engine.cameraMode = 'drone';
  return {engine, root, render(dt = 0) { calls = 0; hash = crypto.createHash('sha256'); recording = true; const begin = performance.now(); engine.render(dt); const elapsed = performance.now() - begin; recording = false; return {digest: hash.digest('hex'), calls, polygons: engine.drawCalls, elapsedMs: elapsed}; }};
}

const baseline = harness(baselineDefinitions), clipped = harness(sameDetailDefinitions), optimized = harness(patchedDefinitions);
const checks = [];
function check(name, condition) { assert.ok(condition, name); checks.push(name); }

// Keep the source rasterization detail/resolution identical here: clipping must
// preserve every drawing command and its exact order for representative cameras.
for (const camera of ['drone', 'tank', 'infantry', 'free', 'command', 'base-buy']) {
  baseline.engine.cameraMode = camera; clipped.engine.cameraMode = camera;
  const a = baseline.render(), b = clipped.render();
  assert.equal(a.digest, b.digest, 'conservative clipping draw commands: ' + camera);
  assert.equal(a.polygons, b.polygons, 'visible polygon count: ' + camera);
}
check('clipping preserves exact Canvas2D command stream in six camera modes', true);

baseline.engine.cameraMode = optimized.engine.cameraMode = 'drone';
const before = baseline.render(), first = optimized.render(), idle = optimized.render();
check('software fallback uses supported low-detail geometry without adding or removing units', optimized.engine.units.length === baseline.engine.units.length && optimized.engine.units.every((unit, i) => unit.id === baseline.engine.units[i].id));
check('software fallback reduces visible triangle draw operations', first.polygons < before.polygons);
check('small-part detail removes more than half of original drawing commands', first.calls < before.calls * .5 && first.polygons < 15000);
check('software canvas is bounded while quality contract stays HD', optimized.engine.canvas.width === 800 && optimized.engine.canvas.height === 449 && optimized.engine.quality === 'hd');
check('an identical waiting frame skips all Canvas2D drawing commands', idle.calls === 0 && optimized.engine.softwareCachedFrames > 0);

optimized.engine.cameraMode = 'base-sell';
check('camera change invalidates the cached bitmap', optimized.render().calls > 0);
check('stable camera then reuses exact frame', optimized.render().calls === 0);
optimized.engine.units[0].x += .25;
check('unit position change invalidates the cached bitmap', optimized.render().calls > 0);
optimized.engine.canvas.width += 1;
check('canvas resize invalidates the cached bitmap', optimized.render().calls > 0);
optimized.engine.groups.box.data[16] += .01;
// The renderer rebuilds instance arrays from source state, so change a source
// object's color to test the next rendered scene rather than its transient data.
optimized.engine.static[0].c = optimized.engine.static[0].c.slice();
optimized.engine.static[0].c[0] += .02;
check('source color change invalidates the cached bitmap', optimized.render().calls > 0);

const software = optimized.root.MMSoftwarePerformance, math = optimized.root.MMWarMath;
const model = math.identity(), far = math.identity(), near = math.identity();
far[0] = far[5] = .005; near[0] = near[5] = .05;
const sphere = optimized.engine.groups.sphereLite.geometry, cylinder = optimized.engine.groups.cylinderLite.geometry;
const smallSphere = software.detail(sphere, model, far, 800, 450, 'sphereLite');
const smallCylinder = software.detail(cylinder, model, far, 800, 450, 'cylinderLite');
check('small rounded parts use eight triangles and small cylinders use twelve', smallSphere.indices.length === 24 && smallCylinder.indices.length === 36);
check('close-up parts restore their original mesh', software.detail(sphere, model, near, 800, 450, 'sphereLite') === sphere && software.detail(cylinder, model, near, 800, 450, 'cylinderLite') === cylinder);
const bounds = geometry => {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < geometry.vertices.length; i += 6) for (let j = 0; j < 3; j++) {
    lo[j] = Math.min(lo[j], geometry.vertices[i + j]); hi[j] = Math.max(hi[j], geometry.vertices[i + j]);
  }
  return {lo, hi};
};
assert.deepEqual(bounds(smallSphere), bounds(sphere)); assert.deepEqual(bounds(smallCylinder), bounds(cylinder));
check('simplified meshes preserve exact source bounding boxes', true);
for (const geometry of [smallSphere, smallCylinder]) for (let i = 0; i < geometry.vertices.length; i += 6) {
  assert.ok(Math.abs(Math.hypot(...geometry.vertices.slice(i + 3, i + 6)) - 1) < 1e-6);
}
check('fallback face normals are finite and normalized', true);
const crossing = far.slice(); crossing[15] = .1;
const invalid = far.slice(); invalid[0] = NaN;
check('near-plane intersections and invalid projections retain original detail', software.detail(sphere, model, crossing, 800, 450, 'sphereLite') === sphere && software.detail(sphere, model, invalid, 800, 450, 'sphereLite') === sphere);
check('unrelated scene meshes are not simplified', software.detail(sphere, model, far, 800, 450, 'river-road') === sphere);
const frame = {canvas: {width: 800, height: 450}, vp: far, eye: [0, 0, 10], groups: {sphere: {geometry: sphere, data: new Float32Array([...model, .3, .4, .2, 0]), used: 1}}};
software.remember(frame); assert.equal(software.begin(frame).reuse, true);
frame.vp = near; assert.equal(software.begin(frame).reuse, false);
assert.equal(software.detail(sphere, model, frame.vp, 800, 450, 'sphereLite'), sphere);
software.remember(frame); frame.vp = far; assert.equal(software.begin(frame).reuse, false);
assert.equal(software.detail(sphere, model, frame.vp, 800, 450, 'sphereLite'), smallSphere);
check('camera transitions across the eight-pixel threshold invalidate the cached frame in both directions', true);

const liveBefore = harness(baselineDefinitions), liveAfter = harness(patchedDefinitions);
liveBefore.engine.active = liveAfter.engine.active = true;
for (let i = 0; i < 3; i++) { liveBefore.render(.05); liveAfter.render(.05); }
const state = engine => JSON.stringify({time: engine.time, power: engine.power,
  units: engine.units.map(({id, kind, team, x, z, state, travel, velocity}) => ({id, kind, team, x, z, state, travel, velocity})), battle: engine.snapshotBattle()});
check('active simulation, unit positions, counters and battle snapshot are identical', state(liveBefore.engine) === state(liveAfter.engine));
check('render labels identify fallback as Mode Ringan and polygon count', bundle.includes("p.softwareFallback?'MODE RINGAN':'HD'") && bundle.includes("p.softwareFallback?'poligon':'batch'"));
console.log(JSON.stringify({ok: true, checks, metrics: {
  fixture: 'actual renderer with no-op/recording Canvas2D; not browser FPS',
  before: {polygons: before.polygons, drawingCommands: before.calls, canvas: {width: 942, height: 529}},
  after: {polygons: first.polygons, drawingCommands: first.calls, canvas: {width: 800, height: 449}},
  idleDrawingCommands: idle.calls, unchangedUnits: baseline.engine.units.length
}}, null, 2));
