// Travel seeds (Tim, 2026-11-11): skyways and buoys keep their chance; a Fossilized Seed planted in a great tree's crown door is a
// sure way to another crown, and an Opal Seed given to the Tide Bearer at the far end of a dive makes its line surface beside
// another buoy. Pumice and Crimson Seeds are carried only. Seeds are rare finds (skylands.ts SEED_FINDS).
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, crownSpot } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { SEEDS, SEED_FINDS, SEED_TRAVEL, ensureSeeds, seedCount, grantSeed, consumeSeed, seedFindRoll, seedFindFlag, validOpalPassage } from '../src/skylands.ts';
import { validActions } from '../src/interactions.ts';
import { biomeFor, elevationAt } from '../src/landscape.ts';
import { hashSeed } from '../src/random.ts';
import { DIVE, diveSite, diveId } from '../src/diving.ts';
import { BOAT, ensureBoatState } from '../src/boats.ts';

const reload = (g, now = 1000) => new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(now)))), now);
const pouch = (s) => structuredClone(s.seedPouch);

test('the seed pouch is additive at schema 14: fresh, migrated, malformed and unknown fields', () => {
  const s = freshSave(); assert.equal(s.version, 14);
  assert.deepEqual(s.seedPouch, { fossilized: 0, opal: 0, pumice: 0, crimson: 0, used: { fossilized: 0, opal: 0, pumice: 0, crimson: 0 } });
  const old = JSON.parse(JSON.stringify(freshSave())); delete old.seedPouch;
  assert.deepEqual(migrateSave(old).seedPouch, s.seedPouch, 'an older save gains an empty pouch');
  const odd = JSON.parse(JSON.stringify(freshSave()));
  odd.seedPouch = { fossilized: '3', opal: -2, pumice: 2.7, crimson: 'x', used: [], future: { keep: 1 }, amber: 4 };
  const m = migrateSave(odd);
  assert.deepEqual([m.seedPouch.fossilized, m.seedPouch.opal, m.seedPouch.pumice, m.seedPouch.crimson], [3, 0, 2, 0]);
  assert.deepEqual(m.seedPouch.used, { fossilized: 0, opal: 0, pumice: 0, crimson: 0 });
  assert.deepEqual(m.seedPouch.future, { keep: 1 }, 'unknown fields are kept'); assert.equal(m.seedPouch.amber, 4);
  const arr = JSON.parse(JSON.stringify(freshSave())); arr.seedPouch = [1, 2]; assert.equal(migrateSave(arr).seedPouch.opal, 0);
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(m))).seedPouch, m.seedPouch, 'normalising is stable');
});

test('grant and consume: every kind, unknown kinds refused, a seed spent exactly once', () => {
  const s = freshSave();
  for (const k of SEEDS.kinds) { assert.ok(SEEDS[k].name && SEEDS[k].text); assert.equal(consumeSeed(s, k), false); assert.equal(grantSeed(s, k, 2), 2); }
  assert.equal(grantSeed(s, 'amber'), 0); assert.equal(consumeSeed(s, 'amber'), false); assert.equal(s.seedPouch.amber, undefined);
  assert.equal(consumeSeed(s, 'pumice'), true); assert.equal(consumeSeed(s, 'crimson'), true);
  assert.deepEqual([seedCount(s, 'pumice'), s.seedPouch.used.pumice, seedCount(s, 'crimson'), s.seedPouch.used.crimson], [1, 1, 1, 1]);
  assert.equal(consumeSeed(s, 'pumice'), true); assert.equal(consumeSeed(s, 'pumice'), false, 'none left'); assert.equal(seedCount(s, 'pumice'), 0); assert.equal(s.seedPouch.used.pumice, 2);
});

test('finds are rare, deterministic and drawn from the data table', () => {
  assert.equal(SEED_FINDS.version, 1);
  for (const [source, F] of Object.entries(SEED_FINDS)) if (F?.weights) {
    assert.ok(F.chance > 0 && F.chance <= .25, `${source} is rare`); for (const [k] of F.weights) assert.ok(SEEDS.kinds.includes(k));
    let won = 0; const kinds = new Set();
    for (let i = 0; i < 20000; i++) { const k = seedFindRoll('RATE', source, `k${i}`); assert.equal(k, seedFindRoll('RATE', source, `k${i}`)); if (k) { won++; kinds.add(k); } }
    assert.ok(Math.abs(won / 20000 - F.chance) < F.chance * .2 + .002, `${source}: ${won} of 20000`);
    assert.deepEqual([...kinds].sort(), F.weights.map(([k]) => k).sort(), `${source} gives each of its kinds`);
  }
  assert.deepEqual(SEED_FINDS.overworld.weights.map(([k]) => k).sort(), [...SEEDS.kinds].sort(), 'opal, fossilized, pumice and crimson all lie in the open');
  assert.deepEqual(SEED_FINDS.dungeon.weights.map(([k]) => k), ['fossilized']); assert.deepEqual(SEED_FINDS.skyland.weights.map(([k]) => k), ['fossilized']);
});

// The Great Tree at SKYTREE 38,18 (also used by tests/sky-summit-chain.test.ts).
function onCrown() {
  const s = freshSave(); s.seed = 'SKYTREE'; s.future = { keep: 7 };
  const g = new Game(s, 0); g.rx = 38; g.ry = 18; g.loadArea('overworld');
  const gate = g.map.objects.find((o) => o.kind === 'canopyGate'); assert.ok(gate);
  Object.assign(g.player, { x: gate.x, y: gate.y - .2 }); g.sync(); return { g, gate };
}

test('without a seed the crown door keeps its own chance: no planting offered, Enter as before', () => {
  const { g, gate } = onCrown();
  assert.deepEqual(validActions(gate, g.save), ['enter']);
  const r = g.interact(null, gate.id); assert.ok(r.ok, r.message); assert.equal(g.area, 'dungeon', 'the door goes where it always went');
  assert.deepEqual(pouch(g.save).used, { fossilized: 0, opal: 0, pumice: 0, crimson: 0 });
});

test('a Fossilized Seed is a sure way to another great tree crown, spent once, deterministic, and resumes exactly', () => {
  const { g, gate } = onCrown(); grantSeed(g.save, 'fossilized', 2);
  assert.deepEqual(validActions(gate, g.save), ['enter', 'plantFossil']);
  const ask = g.interact(null, gate.id); assert.ok(ask.ok); assert.equal(g.interactionRequested, gate.id, 'Act opens the chooser'); assert.equal(g.area, 'overworld');
  const before = structuredClone(g.save), plan = g.planFossilHop();
  assert.ok(plan); assert.deepEqual(g.save, before, 'planning neither discovers nor changes anything'); assert.deepEqual(g.planFossilHop(), plan, 'deterministic');
  assert.deepEqual(reload(g).planFossilHop(), plan, 'the same after a save and reload');
  const r = g.interact('plantFossil', gate.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [plan.rx, plan.ry]); assert.notDeepEqual([g.rx, g.ry], [38, 18]);
  assert.deepEqual([g.player.x, g.player.y], [plan.x, plan.y]);
  const t = g.map.tiles[Math.round(g.player.y + .2) * 32 + Math.round(g.player.x)];
  assert.equal(t.kind, 'canopyTrunk'); assert.equal(t.blocked, false); assert.equal(t.elev, g.map.canopy.top, 'on the crown of the tree');
  assert.equal(elevationAt(g.map, 32, g.player.x, g.player.y), g.map.canopy.top);
  assert.deepEqual(crownSpot(g.map), { x: g.player.x, y: g.player.y });
  assert.equal(seedCount(g.save, 'fossilized'), 1); assert.equal(g.save.seedPouch.used.fossilized, 1, 'spent exactly once');
  assert.ok(g.save.atlas[`${g.rx},${g.ry}`], 'the new crown is on the Atlas');
  assert.deepEqual(g.save.future, { keep: 7 });
  const back = reload(g);
  assert.deepEqual([back.area, back.rx, back.ry, back.player.x, back.player.y], ['overworld', g.rx, g.ry, g.player.x, g.player.y], 'exact resume');
  assert.deepEqual(back.save.seedPouch, g.save.seedPouch); assert.deepEqual(back.save.future, { keep: 7 });
  // And on: the next seed from the new crown goes to yet another tree.
  const next = back.map.objects.find((o) => o.kind === 'canopyGate'); assert.ok(next);
  Object.assign(back.player, { x: next.x, y: next.y - .2 });
  const r2 = back.interact('plantFossil', next.id); assert.ok(r2.ok, r2.message); assert.notDeepEqual([back.rx, back.ry], [g.rx, g.ry]);
  assert.equal(seedCount(back.save, 'fossilized'), 0); assert.equal(back.save.seedPouch.used.fossilized, 2);
  assert.equal(back.interact('plantFossil', back.map.objects.find((o) => o.kind === 'canopyGate')?.id || 'none').ok, false);
});

test('a planting that cannot be made keeps the seed and changes nothing', () => {
  const { g, gate } = onCrown(); grantSeed(g.save, 'fossilized');
  Object.assign(g.player, { x: 16, y: 31 }); g.sync(); // off the crown: the door is out of reach
  assert.equal(g.plantFossilSeed(gate).ok, false); assert.equal(seedCount(g.save, 'fossilized'), 1);
  Object.assign(g.player, { x: gate.x, y: gate.y - .2 }); g.sync();
  const loads = SEED_TRAVEL.fossilized.loads, atlas = structuredClone(g.save.atlas);
  try { SEED_TRAVEL.fossilized.loads = 0; const r = g.interact('plantFossil', gate.id); assert.equal(r.ok, false); }
  finally { SEED_TRAVEL.fossilized.loads = loads; }
  assert.deepEqual([g.area, g.rx, g.ry], ['overworld', 38, 18]); assert.equal(seedCount(g.save, 'fossilized'), 1); assert.equal(g.save.seedPouch.used.fossilized, 0);
  assert.deepEqual(g.save.atlas, atlas);
});

// A dive buoy on SUBNET (as tests/submersible-311.test.ts finds it), dived with rig and lens, aboard the skiff.
function atBuoy() {
  const s = freshSave(); s.seed = 'SUBNET'; s.boat = { owned: true, aboard: true, hull: BOAT.maxHull }; ensureBoatState(s);
  s.worldFlags.bathysalLens = true; s.worldFlags.diveRig = true; s.capabilities.dive = true; s.perception.aperture = 3255; s.future = { keep: 9 };
  const g = new Game(s, 0); let site = null, at = null;
  for (let r = 2; r < 40 && !site; r++) for (let dx = -r; dx <= r && !site; dx++) { const rx = dx, ry = r; if (biomeFor(s.seed, rx, ry) !== 'sea' || hashSeed(`${s.seed}:dive:site:${rx}:${ry}`) % DIVE.siteEvery) continue; g.rx = rx; g.ry = ry; g.loadArea('overworld'); site = g.map.objects.find((o) => o.kind === 'diveSite'); at = { rx, ry }; }
  assert.ok(site, 'a dive buoy'); Object.assign(g.player, { x: site.x, y: site.y + .2 });
  return { g, site, at };
}
function dive(g, site) { const r = g.diveAction(site); assert.ok(r.ok, r.message); assert.equal(g.area, 'dungeon'); return g.map.objects.find((o) => o.kind === 'tideBearer'); }
function surface(g) { const ex = g.map.objects.find((o) => o.kind === 'diveExit'); Object.assign(g.player, { x: ex.x, y: ex.y }); const r = g.interact('surface', ex.id); assert.ok(r.ok, r.message); return r; }

test('the Tide Bearer waits at the far end of the dive, on floor joined to the way in', () => {
  const { g, site } = atBuoy(), tb = dive(g, site); assert.ok(tb);
  const cache = g.map.objects.find((o) => o.kind === 'chest' && o.id.endsWith(':cache'));
  assert.ok(Math.hypot(tb.x - cache.x, tb.y - cache.y) <= 3, 'beside the sunken cache');
  assert.equal(g.map.tiles[tb.y * g.map.width + tb.x].blocked, false);
  assert.equal(g.map.objects.filter((o) => o.kind === 'tideBearer').length, 1);
  g.loadArea('dungeon'); assert.equal(g.map.objects.filter((o) => o.kind === 'tideBearer').length, 1, 'never doubled');
  Object.assign(g.player, { x: tb.x, y: tb.y }); assert.ok(g.interact('speak', tb.id).ok);
});

test('without an Opal Seed the line goes back up to the same buoy (the chance is kept)', () => {
  const { g, site, at } = atBuoy(), tb = dive(g, site);
  Object.assign(g.player, { x: tb.x, y: tb.y });
  assert.equal(g.interact('offerOpal', tb.id).ok, false); assert.equal(g.save.consequences.dungeons[g.areaId()].opalPassage, undefined);
  surface(g); assert.deepEqual([g.rx, g.ry], [at.rx, at.ry]); assert.deepEqual([g.player.x, g.player.y], [site.x, site.y - .2]);
});

test('an Opal Seed given to the Tide Bearer surely surfaces beside another buoy, once, through save and reload', () => {
  const { g, site, at } = atBuoy(); grantSeed(g.save, 'opal', 2); const tb = dive(g, site), id = g.areaId();
  assert.equal(id, diveId('SUBNET', at.rx, at.ry));
  Object.assign(g.player, { x: tb.x, y: tb.y });
  assert.ok(g.interact(null, tb.id).ok); assert.equal(g.interactionRequested, tb.id); assert.match(tb.actionLabels.offerOpal, /2 held/);
  const twin = atBuoy(); grantSeed(twin.g.save, 'opal', 2); const tb2 = dive(twin.g, twin.site); Object.assign(twin.g.player, { x: tb2.x, y: tb2.y });
  const r = g.interact('offerOpal', tb.id); assert.ok(r.ok, r.message);
  const q = g.save.consequences.dungeons[id].opalPassage; assert.ok(validOpalPassage(q)); assert.notDeepEqual([q.rx, q.ry], [at.rx, at.ry]);
  assert.ok(twin.g.interact('offerOpal', tb2.id).ok); assert.deepEqual(twin.g.save.consequences.dungeons[id].opalPassage, q, 'deterministic');
  assert.deepEqual([seedCount(g.save, 'opal'), g.save.seedPouch.used.opal], [1, 1]);
  assert.equal(g.interact('offerOpal', tb.id).ok, false, 'a passage already promised takes no second seed'); assert.equal(seedCount(g.save, 'opal'), 1);
  const back = reload(g); assert.equal(back.area, 'dungeon'); assert.deepEqual(back.save.consequences.dungeons[id].opalPassage, q, 'the passage survives a reload');
  assert.deepEqual(back.save.seedPouch, g.save.seedPouch);
  surface(back);
  assert.deepEqual([back.area, back.rx, back.ry, back.player.x, back.player.y], ['overworld', q.rx, q.ry, q.x, q.y]);
  const buoy = back.map.objects.find((o) => o.kind === 'diveSite'); assert.ok(buoy, 'a real buoy'); assert.deepEqual([buoy.x, buoy.y - .2], [q.x, q.y]);
  assert.deepEqual(diveSite(back.map, 'SUBNET', q.rx, q.ry).id, buoy.id);
  assert.equal(back.save.boat.aboard, true, 'the skiff comes up with you'); assert.equal(back.save.session.breath, DIVE.breath);
  assert.equal(back.save.consequences.dungeons[id].opalPassage, undefined, 'used once');
  assert.equal(seedCount(back.save, 'opal'), 1); assert.deepEqual(back.save.future, { keep: 9 });
  const again = reload(back); assert.deepEqual([again.rx, again.ry, again.player.x, again.player.y], [q.rx, q.ry, q.x, q.y], 'exact resume after arriving');
});

test('a diver hauled up half-drowned keeps the promised passage for that buoy', () => {
  const { g, site, at } = atBuoy(); grantSeed(g.save, 'opal'); const tb = dive(g, site), id = g.areaId();
  Object.assign(g.player, { x: tb.x, y: tb.y }); assert.ok(g.interact('offerOpal', tb.id).ok);
  const q = structuredClone(g.save.consequences.dungeons[id].opalPassage);
  g.recoverFromDeath(2000); assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [at.rx, at.ry], 'back to the buoy dived from');
  assert.deepEqual(g.save.consequences.dungeons[id].opalPassage, q);
  const buoy = g.map.objects.find((o) => o.kind === 'diveSite'); Object.assign(g.player, { x: buoy.x, y: buoy.y + .2 }); dive(g, buoy);
  surface(g); assert.deepEqual([g.rx, g.ry], [q.rx, q.ry]); assert.equal(g.save.seedPouch.used.opal, 1);
});

test('seeds lying in the open: new ground only, reachable, taken once', () => {
  const s = freshSave(); s.seed = 'SEEDFIND'; const g = new Game(s, 0); let found = null;
  for (let r = 18; r < 60 && !found; r++) for (let dx = -r; dx <= r && !found; dx++) { const rx = dx, ry = r;
    if (!seedFindRoll(s.seed, 'overworld', `${rx},${ry}`)) continue; g.rx = rx; g.ry = ry; g.loadArea('overworld'); found = g.map.objects.find((o) => o.kind === 'seedFind'); }
  assert.ok(found, 'a seed lying in the open'); const key = `${g.rx},${g.ry}`, kind = found.seed;
  assert.equal(g.save.atlas[key].seedFindVersion, SEED_FINDS.version); assert.equal(kind, seedFindRoll(s.seed, 'overworld', key));
  const t = g.map.tiles[found.y * 32 + found.x]; assert.equal(t.blocked, false); assert.ok(!/water|lava/i.test(t.kind));
  // The same section seen before seed finds existed holds none, and is otherwise the same.
  const old = structuredClone(g.save); delete old.atlas[key].seedFindVersion; const legacy = new Game(old, 0); legacy.rx = g.rx; legacy.ry = g.ry; legacy.loadArea('overworld');
  assert.equal(legacy.map.objects.some((o) => o.kind === 'seedFind'), false);
  assert.deepEqual(legacy.map.objects.map((o) => o.id), g.map.objects.filter((o) => o.kind !== 'seedFind').map((o) => o.id));
  assert.deepEqual(legacy.map.tiles, g.map.tiles);
  Object.assign(g.player, { x: found.x, y: found.y }); const r = g.interact('take', found.id); assert.ok(r.ok, r.message);
  assert.equal(seedCount(g.save, kind), 1); assert.equal(g.save.worldFlags[seedFindFlag('overworld', key)], true);
  assert.equal(g.map.objects.some((o) => o.kind === 'seedFind'), false);
  const back = reload(g); assert.equal(back.map.objects.some((o) => o.kind === 'seedFind'), false, 'gone for good'); assert.equal(seedCount(back.save, kind), 1);
  back.loadArea('overworld'); assert.equal(back.map.objects.some((o) => o.kind === 'seedFind'), false);
});

test('a crossing chest or a cleared Skyland gives its seed once', () => {
  const s = freshSave(); s.seed = 'CHESTS'; const g = new Game(s, 0);
  for (const source of ['dungeon', 'skyland']) {
    let key = null; for (let i = 0; !key; i++) if (seedFindRoll(s.seed, source, `area-${i}:cache`)) key = `area-${i}:cache`;
    let miss = null; for (let i = 0; !miss; i++) if (!seedFindRoll(s.seed, source, `other-${i}`)) miss = `other-${i}`;
    assert.equal(g.grantSeedFind(source, miss), null);
    assert.equal(g.grantSeedFind(source, key), 'fossilized'); assert.equal(g.grantSeedFind(source, key), null, 'never twice');
  }
  assert.equal(seedCount(s, 'fossilized'), 2);
  assert.ok(g.save.narrative.journal.some((j) => j.recordId === 'seed:fossilized'));
});
