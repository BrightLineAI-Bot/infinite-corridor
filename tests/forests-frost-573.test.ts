// Release 573 (Tim, 2026-10-29): forest regions thick with trees you can cut (some giants whose crowns rise out of view, the
// Wayfarer showing through them), frost regions, and a name for every region, shown when you walk into it and on the Atlas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, regionName, REGION_NAMES, LANDSCAPE_VERSION, WOODS } from '../src/landscape.ts';
import { woodFor } from '../src/boats.ts';
import { giantTreeHides, GIANT_TREE } from '../src/renderer.ts';

const SEED = 'R';
function find(type, ok = () => true) { for (let x = 14; x < 120; x++) for (let y = 14; y < 120; y++) { const r = sectionRegion(SEED, x, y, 5); if (r.type === type && r.hold >= 1 && ok(x, y)) return [x, y]; } }
const wooded = (x, y) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version: 5 }); return m.objects.filter((o) => o.forest).length >= 60; };

test('version 5 turns some wild regions into forests and frostlands; every other region keeps its version 4 type', () => {
  assert.equal(LANDSCAPE_VERSION, 6); // release 579: moonlands (forests and frostlands unchanged)
  const types = new Set();
  for (let x = 14; x < 110; x += 2) for (let y = 14; y < 110; y += 2) {
    const a = sectionRegion(SEED, x, y), b = sectionRegion(SEED, x, y, 5); types.add(b.type);
    assert.equal(a.id, b.id); assert.equal(a.gap, b.gap);
    if (a.type !== 'wild') assert.equal(b.type, a.type); else assert.ok(['wild', 'forest', 'frost'].includes(b.type));
  }
  assert.ok(types.has('forest') && types.has('frost') && types.has('wild'));
});

test('a forest section stands thick with trees you can cut and walk between, a few of them giants', () => {
  const [rx, ry] = find('forest', wooded), m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry, { version: 5 });
  const trees = m.objects.filter((o) => o.forest), giants = trees.filter((o) => o.vegetationForm === 'giant');
  assert.ok(trees.length >= 60 && trees.length <= WOODS.max, `${trees.length} trees`); assert.ok(giants.length >= 2, `${giants.length} giants`);
  assert.equal(new Set(trees.map((o) => o.id)).size, trees.length, 'ids are unique');
  for (const o of trees) { assert.deepEqual(o.actions, ['cut', 'ignite']); assert.ok(['forestFloor', 'bogGround'].includes(m.tiles[o.y * 32 + o.x].kind)); assert.ok(!(o.x >= 13 && o.x <= 19 && o.y >= 13 && o.y <= 19), 'the plaza stays clear'); }
  for (const a of giants) for (const b of giants) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= WOODS.giantGap);
  assert.equal(woodFor(giants[0]), WOODS.giantWood); assert.equal(m.landscape.name, 'Deepwood');
  const again = generateRegion(SEED, rx, ry); applyLandscape(again, SEED, rx, ry, { version: 5 }); assert.deepEqual(again, m, 'deterministic');
  const old = generateRegion(SEED, rx, ry); applyLandscape(old, SEED, rx, ry, { version: 4 }); assert.ok(!old.objects.some((o) => o.forest), 'ground pinned to version 4 grows no forest');
});

test('a frost section lies under snow, with ice spires and its lakes frozen hard enough to walk', () => {
  const [rx, ry] = find('frost'), m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry, { version: 5 });
  const kinds = {}; for (const t of m.tiles) kinds[t.kind] = (kinds[t.kind] || 0) + 1;
  assert.ok(kinds.snowField > 300, JSON.stringify(kinds)); assert.ok(m.tiles.filter((t) => t.kind === 'iceSpire').every((t) => t.blocked));
  assert.ok(m.tiles.filter((t) => t.kind === 'snowField' || t.kind === 'lakeIce').every((t) => !t.blocked));
  let ice = 0; for (let x = 14; x < 120 && !ice; x++) for (let y = 14; y < 120 && !ice; y += 3) if (sectionRegion(SEED, x, y, 5).type === 'frost') { const q = generateRegion(SEED, x, y); applyLandscape(q, SEED, x, y, { version: 5 }); ice = q.tiles.filter((t) => t.kind === 'lakeIce').length; if (ice) assert.ok(!q.tiles.some((t) => t.kind === 'lakeWater' && sectionRegion(SEED, x, y, 5).hold >= 1 && t.landscape === 'frost')); }
});

test('every region has a name of its own kind, the same each time', () => {
  const r = sectionRegion(SEED, ...find('forest'), 5), name = regionName(SEED, r);
  assert.equal(name, regionName(SEED, { ...r })); assert.match(name, /^the /);
  assert.ok(REGION_NAMES.nouns.forest.some((n) => name.endsWith(` ${n}`)), name);
  const f = sectionRegion(SEED, ...find('frost'), 5); assert.ok(REGION_NAMES.nouns.frost.some((n) => regionName(SEED, f).endsWith(` ${n}`)));
});

test('walking into a named region shows its name once; standing trees are not saved, felled ones are', () => {
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0), [rx, ry] = find('forest', wooded);
  g.rx = rx; g.ry = ry; g.loadArea('overworld'); g.enemies = [];
  const r = sectionRegion(SEED, rx, ry, 5), banner = (g.questNotices || []).find((q) => q.kind === 'discovery');
  assert.ok(banner, 'a banner'); assert.equal(banner.title, regionName(SEED, r).replace(/^the /, 'The ').toUpperCase()); assert.equal(banner.detail, 'Forest');
  g.questNotices = []; assert.equal(g.noteRegion(5), null, 'the same region: no second banner');
  const tree = g.map.objects.find((o) => o.forest && o.vegetationForm !== 'giant'); tree.state = 'fallen';
  g.snapshotArea(); const saved = s.session.areas[g.areaStateId()].objects;
  assert.equal(saved[tree.id].state, 'fallen'); assert.ok(!Object.keys(saved).some((id) => id.startsWith('wood-') && id !== tree.id), 'standing trees are left out');
  g.loadArea('overworld'); assert.equal(g.map.objects.find((o) => o.id === tree.id).state, 'fallen', 'the felled tree stays felled');
  assert.equal(s.atlas[`${rx},${ry}`].landscapeVersion, LANDSCAPE_VERSION);
});

test('behind a giant tree the Wayfarer shows through; in front of it, not', () => {
  const o = { x: 10, y: 20 };
  assert.equal(giantTreeHides(o, { x: 10, y: 17 }), true, 'behind the trunk');
  assert.equal(giantTreeHides(o, { x: 10, y: 20 - GIANT_TREE.height }), true, 'under the crown');
  assert.equal(giantTreeHides(o, { x: 10, y: 21 }), false, 'in front');
  assert.equal(giantTreeHides(o, { x: 14, y: 17 }), false, 'beside it');
});
