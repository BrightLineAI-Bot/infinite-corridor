// The female Wayfarer's per-frame cost (2026-11-27): CI measured her sampling at about 1.5x his; Tim kept the bound and asked
// for her frame to be trimmed, unchanged in look. These guard the shapes and the hot loops that made it dear.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decodeCloseViewHero, closeViewHeroBodyAsset, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8'));
const file = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url));
const male = decodeCloseViewHero(meta, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)), female = closeViewHeroBodyAsset(male, 'female');
const input = (extra = {}) => ({ nowMs: 100000, reducedMotion: false, x: 3, y: 4, groundZ: .3, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, action: null, alpha: 1, tint: [1, 1, 1], hitFlash: 0, ...extra });
const src = fs.readFileSync(new URL('../src/close-view-hero.ts', import.meta.url), 'utf8');
const block = (text, from) => { let depth = 0; const j = text.indexOf('{', from); for (let k = j; k < text.length; k++) { if (text[k] === '{') depth++; else if (text[k] === '}' && --depth === 0) return text.slice(j, k + 1); } throw new Error('unbalanced'); };
const body = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return block(src, i); };

test('his and her pose states have one shape (the same fields in the same order), before and after sampling', () => {
  const sm = createHeroPoseState(male), sf = createHeroPoseState(female);
  assert.deepEqual(Object.keys(sf), Object.keys(sm));
  assert.equal(sm.braid, null); assert.equal(sm.overlayParts, null); assert.ok(sf.braid && sf.overlayParts);
  const fm = createHeroFrame(male), ff = createHeroFrame(female);
  for (let i = 0; i < 40; i++) { const at = input({ nowMs: 1e5 + i * 16, speed: 2, gaitPhase: i / 10, x: 3 + i * .03, yaw: i * .02 }); sampleCloseViewHero(male, sm, at, fm); sampleCloseViewHero(female, sf, at, ff); }
  assert.deepEqual(Object.keys(sf), Object.keys(sm));
});

test('the per-vertex loops and the braid allocate nothing per frame and call no slow builtins', () => {
  for (const name of ['deform', 'placeVertices', 'braidStep', 'braidRestDir', 'braidRing', 'writeBraid']) {
    const b = body(name);
    assert.doesNotMatch(b, /=>|function\b|new \w|\[\s*\]|\{\s*\}/, `${name}: no closure, array or object made per frame`);
    assert.doesNotMatch(b, /Math\.hypot\((?!input\.x|mx)/, `${name}: Math.sqrt, not Math.hypot, in the per-vertex and per-segment work`);
  }
  // deform reads the asset's (dictionary-mode) arrays and the mesh fields once per mesh, never per vertex
  const d = body('deform'), head = 'for (let v = first; v < last; v++)'; let loops = 0;
  for (let i = d.indexOf(head); i >= 0; i = d.indexOf(head, i + 1)) { loops++; assert.doesNotMatch(block(d, i), /\b(asset|state|mesh|a|fit)\./, 'no property loads inside the vertex loops'); }
  assert.equal(loops, 2, 'a skinned and a rigid vertex loop');
  // the world transform runs outside sampleCloseViewHero, so that large function's tier never decides its speed
  assert.match(src, /placeVertices\(v, dst, input\.x, input\.y, input\.groundZ \+ input\.liftZ, dx, dz, floor, cy, sy, scale\)/);
});

test('her frame keeps its bounded size: the same vertices and triangles, the braid in place, the influences per vertex at most four', () => {
  assert.equal(female.vertexCount, 3489); assert.equal(female.indexCount / 3, 3276); assert.equal(male.vertexCount, 3602); assert.equal(male.indexCount / 3, 3170);
  let weights = 0; for (const w of female.arrays.weights) if (w) weights++;
  assert.ok(weights <= 2684, `her skin influences ${weights}`);
  const s = createHeroPoseState(female), f = createHeroFrame(female), first = female.braid.firstVertex;
  sampleCloseViewHero(female, s, input({ nowMs: 2e5, speed: 2 }), f);
  for (let v = first; v < first + female.braid.vertexCount; v++) { const o = v * 6, n = Math.hypot(f.positionsNormals[o + 3], f.positionsNormals[o + 4], f.positionsNormals[o + 5]); assert.ok(Math.abs(n - 1) < 1e-4, `braid normal ${v} unit (${n})`); }
});
