// 2026-11-28 (Tim): the Pentagons found, on the Atlas, by whether each is complete; with a layer toggle like the others.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { PENTAGON } from '../src/pentagon.ts';
import { ATLAS_PENTAGONS, knownPentagons, pentagonOnSection, pentagonAtlasText, pentagonAtlasRadius, pentagonCorners } from '../src/atlas-view.ts';

const journey = () => { const s = freshSave(); s.seed = 'PENT-ATLAS'; return s; };
const id = (s, cx, cy, n, V = 11) => `pentagon:${s.seed}:${cx}:${cy}${V >= 2 ? `:v${V}` : ''}:f${n}`;
const seen = () => ({ discovered: true, bypassed: false, visits: 0, abandoned: 0, guardianDefeated: false, resolved: false, visitOpen: false });

test('no Pentagon is marked that the save does not record as found', () => {
  const s = journey();
  assert.deepEqual(knownPentagons(s), []);
  s.pentagonFinding = { version: 1, follow: { cx: 40, cy: 40, rx: 30, ry: 30 }, hunts: [{ id: 'pentagon-hunt-1', n: 1, cx: 16, cy: 56, status: 'open' }], n: 1, read: 3 }; // pointed at, never reached
  s.consequences.dungeons['labyrinth:PENT-ATLAS:4:4:keep:f1'] = seen(); // not a Pentagon
  s.consequences.dungeons['pentagon:OTHER-SEED:24:24:v11:f1'] = seen(); // another journey's id
  s.consequences.dungeons[`pentagon:${s.seed}:nope:f1`] = seen(); // malformed
  assert.deepEqual(knownPentagons(s), []);
  assert.deepEqual(knownPentagons(null), []);
  assert.deepEqual(knownPentagons({}), []);
});

test('a Pentagon stood beside or entered is marked unfinished; its Tesseract marks it complete', () => {
  const s = journey(), D = s.consequences.dungeons;
  D[id(s, 32, 80, 1, 9)] = seen(); // arrival in one of its sections opens the base floor's history
  D[id(s, -184, -200, 1)] = seen(); D[id(s, -184, -200, 4)] = { ...seen(), visits: 2 }; // entered: a chamber visited
  D[id(s, 48, -16, 1)] = { ...seen(), pentArenaWon: true, pentComplete: `pentagon:${s.seed}:48:-16:v11:complete` };
  D[id(s, 64, 8, 1)] = { ...seen(), pentFinale: true }; // won before the Stillworks: complete, its glyph paid on the next start
  D[id(s, 80, 8, 1)] = { ...seen(), pentArena: false, pentFinale: true }; // the Stillworks still to win
  s.pentagonFinding = { version: 1, follow: null, hunts: [{ id: 'h1', n: 1, cx: 16, cy: 56, status: 'found' }, { id: 'h2', n: 2, cx: 32, cy: 80, status: 'done' }, { id: 'h3', n: 3, cx: 96, cy: 96, status: 'open' }], n: 3, read: 0 };
  const list = knownPentagons(s), at = (cx, cy) => list.find((q) => q.cx === cx && q.cy === cy);
  assert.equal(list.length, 6, 'one marker per Pentagon: the open hunt is not one');
  assert.deepEqual(at(32, 80), { cx: 32, cy: 80, complete: false, entered: false });
  assert.deepEqual(at(-184, -200), { cx: -184, cy: -200, complete: false, entered: true });
  assert.equal(at(48, -16).complete, true);
  assert.equal(at(64, 8).complete, true);
  assert.equal(at(80, 8).complete, false);
  assert.deepEqual(at(16, 56), { cx: 16, cy: 56, complete: false, entered: false }, 'a hunt found marks its Pentagon');
  assert.equal(at(96, 96), undefined);
  assert.equal(pentagonAtlasText(at(48, -16)), `${PENTAGON.name} · completed · Tesseract earned`);
  assert.equal(pentagonAtlasText(at(-184, -200)), `${PENTAGON.name} · entered · not yet completed`);
  assert.equal(pentagonAtlasText(at(32, 80)), `${PENTAGON.name} · not yet completed`);
});

test('the markers read the save without changing it, and survive a save round trip', () => {
  const s = journey();
  s.consequences.dungeons[id(s, 48, -16, 1)] = { ...seen(), pentComplete: 'x', unknownField: 7 };
  const before = JSON.stringify(s); knownPentagons(s); assert.equal(JSON.stringify(s), before);
  const back = migrateSave(JSON.parse(before));
  assert.deepEqual(knownPentagons(back), [{ cx: 48, cy: -16, complete: true, entered: false }]);
});

test('a tap anywhere on a Pentagon\'s nine sections finds it', () => {
  const list = [{ cx: 32, cy: 80, complete: false, entered: false }];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) assert.equal(pentagonOnSection(list, 32 + dx, 80 + dy), list[0]);
  assert.equal(pentagonOnSection(list, 34, 80), null);
  assert.equal(pentagonOnSection(list, 32, 78), null);
});

test('the marker covers the Pentagon\'s footprint, and never shrinks below its minimum', () => {
  const r = pentagonAtlasRadius();
  assert.ok(r > 1 && r < 1.5, 'its corners reach past the centre section but stay inside the 3×3 block');
  const near = pentagonCorners(100, 100, 52), far = pentagonCorners(100, 100, 1);
  assert.equal(near.length, 10);
  assert.ok(Math.abs(near[0] - 100) < 1e-9 && Math.abs(near[1] - (100 - r * 52)) < 1e-9, 'point up, at the footprint\'s size');
  assert.ok(Math.abs(far[1] - (100 - ATLAS_PENTAGONS.minRadius)) < 1e-9, 'zoomed out: the minimum on-screen size');
  const buf = []; assert.equal(pentagonCorners(0, 0, 10, buf), buf, 'the corner buffer is reused (no per-draw allocation)');
});

test('the two states are distinct colours and shapes', () => {
  const { open, done } = ATLAS_PENTAGONS;
  assert.notEqual(open.line, done.line); assert.notEqual(open.fill, done.fill);
  const alpha = (c) => Number(/,\s*([\d.]+)\)$/.exec(c)[1]);
  assert.ok(alpha(open.fill) < .2, 'unfinished: an outline, the land showing through');
  assert.ok(alpha(done.fill) >= .35 && alpha(done.fill) < .7, 'complete: filled, semi-transparent');
});

test('the Pentagons layer is a persisted Atlas layer, on by default, beside Relays', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const layers = /const ATLAS_LAYERS=\[(.*?)\],ATLAS_LAYER_KEY=/.exec(main);
  assert.ok(layers && layers[1].startsWith('[ATLAS_PENTAGONS.layer,ATLAS_PENTAGONS.label]'), 'first in the layer row, under the Relays button');
  assert.match(main, /const atlasLayers=\(\(\)=>\{const all=Object\.fromEntries\(ATLAS_LAYERS\.map\(\(\[k\]\)=>\[k,true\]\)\)/, 'every layer defaults on (a stored choice from before has no pentagons key)');
  assert.match(main, /localStorage\.setItem\(ATLAS_LAYER_KEY,JSON\.stringify\(atlasLayers\)\)/, 'the choice is kept with the other layers');
  assert.match(main, /function drawAtlasPentagons\(w,h,cell\)\{\s*if\(!atlasLayers\[ATLAS_PENTAGONS\.layer\]\)return;/, 'off: nothing drawn');
  assert.equal((main.match(/drawAtlasPentagons\(w,h,cell\);/g) || []).length, 2, 'drawn in both the section and the world view');
  // a stored layer choice from before this layer existed still turns it on
  const all = { pentagons: true, wayglasses: true }, stored = { wayglasses: false };
  assert.equal({ ...all, ...stored }.pentagons, true);
});
