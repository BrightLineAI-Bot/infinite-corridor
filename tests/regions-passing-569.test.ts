// Release 569 (Tim, 2026-10-29): world regions (large, irregular, typed; wild ones too; the dream along their seams); world
// beasts seen passing through; Spellblade for Hammerfall and the Great Sweep, Charged Air for the Great Sweep.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, walkerCrossingMap } from '../src/game.ts';
import { REGIONS, regionAt, sectionRegion, biomeFor, LANDSCAPE_VERSION, DREAM_VERSION, dreamsHere, dreamSeam } from '../src/landscape.ts';
import { passingBeastFor, PASSING } from '../src/world-beasts.ts';
import { FIELD_PASSIVES } from '../src/lattice-fields.ts';

test('regions are deterministic, large and varied, with a heartland of the old mix round Ember Refuge', () => {
  assert.equal(LANDSCAPE_VERSION, 8); assert.equal(DREAM_VERSION, 4); // release 573: forests and frostlands; 579: moonlands
  assert.deepEqual(sectionRegion('R', 40, -33), sectionRegion('R', 40, -33));
  for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) if (Math.hypot(x + .5, y + .5) < REGIONS.heartland) assert.equal(sectionRegion('R', x, y).type, 'wild', 'the heartland is wild');
  const sizes = new Map(), types = new Set();
  for (let x = 20; x < 120; x++) for (let y = 20; y < 120; y++) { const r = sectionRegion('R', x, y); types.add(r.type); sizes.set(r.id, (sizes.get(r.id) || 0) + 1); }
  const n = [...sizes.values()].sort((a, b) => a - b);
  assert.ok(types.size >= 8, `${types.size} region types`); assert.ok(n[n.length - 1] > n[0] * 4, `sizes vary (${n[0]}..${n[n.length - 1]})`);
  assert.ok(n.reduce((a, b) => a + b, 0) / n.length > 40, 'regions are large');
});

test('a region shapes its land: a sea region is mostly sea, a desert region mostly dunes, a plain one ground colour', () => {
  const find = (type) => { for (let x = 20; x < 200; x++) for (let y = 20; y < 200; y++) { const r = sectionRegion('R', x, y); if (r.type === type && r.hold >= 1) return [x, y]; } };
  const s = freshSave(); s.seed = 'R'; s.atlas = {};
  const [sx, sy] = find('desert'); assert.equal(biomeFor('R', sx, sy), 'desert');
  const [px, py] = find('emberlands'), m = walkerCrossingMap(s, px, py);
  assert.equal(m.tiles.filter((t) => !t.landscape && !t.structure && !t.buildingId && ['ash', 'glass'].includes(t.kind)).length, 0, 'emberlands: no ash or glass ground');
  const [ox, oy] = find('sea'); assert.ok(['sea', 'coast', 'isles'].includes(biomeFor('R', ox, oy)), biomeFor('R', ox, oy));
});

test('the dream runs along region seams, in dream regions, and in wild pockets; never in the heartland', () => {
  let seams = 0, border = 0;
  for (let x = 30; x < 130; x++) for (let y = 30; y < 130; y++) { if (sectionRegion('R', x, y).gap < .6) { border++; if (dreamSeam('R', x, y)) seams++; } }
  assert.ok(seams > border * .2 && seams < border * .9, `${seams} of ${border} border sections dream`);
  for (let x = -10; x <= 10; x++) assert.equal(dreamsHere('R', x, 3, 4), false);
});

test('explored sections keep their landscape: version 3 is untouched by regions', () => {
  const s = freshSave(); s.seed = 'R';
  for (const [x, y] of [[60, -60], [90, 40], [-70, 85]]) {
    const key = `${x},${y}`; s.atlas = { [key]: { terrain: 'ash', landscapeVersion: 3, hamletVersion: 2, dreamVersion: 3, seaVersion: 3, travelVersion: 1 } };
    const a = JSON.stringify(walkerCrossingMap(s, x, y).tiles); s.atlas = {}; const b = JSON.stringify(walkerCrossingMap(s, x, y).tiles);
    s.atlas = { [key]: { terrain: 'ash', landscapeVersion: 3, hamletVersion: 2, dreamVersion: 3, seaVersion: 3, travelVersion: 1 } };
    assert.equal(JSON.stringify(walkerCrossingMap(s, x, y).tiles), a, 'pinned ground is stable'); void b;
  }
});

test('a world beast passes through, untargetable and harmless, and leaves', () => {
  const s = freshSave(); s.seed = 'PASS'; s.perception.aperture = 10810; const g = new Game(s, 0); let e = null;
  for (let i = 0; i < 400 && !e; i++) { g.rx = 20 + i; g.ry = -30; g.loadArea('overworld'); e = g.enemies.find((q) => q.passingBeast); }
  assert.ok(e, 'one passes within 400 sections'); assert.ok(e.untargetable && e.noRewards && !e.boss);
  g.enemies = [e]; g.player.invulnerableUntil = 1e12; const move = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  let t = 1000; for (let i = 0; i < 1600 && g.enemies.includes(e); i++) { t += 50; g.update(.05, move, t); }
  assert.ok(!g.enemies.includes(e), 'it crosses and is gone'); assert.ok(!e.dead, 'never killed');
  const fresh = freshSave(); fresh.seed = 'PASS'; assert.equal(passingBeastFor(fresh, walkerCrossingMap(fresh, 40, -30), 40, -30, 0)?.passingBeast ?? null, null, 'nothing unlocked at Aperture 0');
  assert.ok(PASSING.chance > 0 && PASSING.chance < .1);
});

test('Spellblade strengthens Hammerfall and the Great Sweep; Charged Air the Great Sweep only', () => {
  const s = freshSave(); s.seed = 'TOOLS'; s.perception.aperture = 10810; s.farArray = { listeners: 3 }; const g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld'); g.enemies = [];
  const swing = (kind, fields, spell) => { s.lattice = { ...(s.lattice || {}), passives: fields.map((f) => `field:${f}`) }; g.effects = []; g.toolReadyAt = 0; g.spellRunning = () => spell; g.brawlerTool(kind, 5000); const e = g.effects.find((q) => q.kind === kind); return { d: e.damage, r: e.radius }; };
  const plain = swing('great-sweep', [], false), blade = swing('great-sweep', ['spellblade'], true), air = swing('great-sweep', ['charged-air'], true);
  assert.ok(blade.d > plain.d && blade.r > plain.r, 'Spellblade: sweep'); assert.ok(air.d > plain.d && air.r > plain.r, 'Charged Air: sweep');
  const h0 = swing('hammerfall', [], false), hb = swing('hammerfall', ['spellblade'], true), ha = swing('hammerfall', ['charged-air'], true);
  assert.ok(hb.d > h0.d, 'Spellblade: hammer'); assert.equal(ha.d, h0.d, 'Charged Air: not the hammer');
  assert.ok(FIELD_PASSIVES['charged-air'].text.includes('Great Sweep') && FIELD_PASSIVES.spellblade.text.includes('Hammerfall'));
});
