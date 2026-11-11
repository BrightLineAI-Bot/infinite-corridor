// Seed realms (Tim, 2026-11-11): a Pumice or Crimson Seed offered at one of the Watcher's shrines above ground opens a realm
// that is never kept: the Hollow Husk (a mining world bored hollow, haunted) or the Drifting Ship (robots, glass over the
// galaxy). Laid from the world seed and the count of that seed used; left by its Fading Rift or the Way Onward, it comes apart
// and the Wayfarer is set down elsewhere. Aperture Crystals, caches, now and then a seed, Divine Viscera when its heart
// falls; never a Tesseract.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { grantSeed, seedCount, SEEDS } from '../src/skylands.ts';
import { validActions } from '../src/interactions.ts';
import { MONSTER_PACK, PACK_KINDS, validateMonster } from '../src/monster-pack.ts';
import { SEED_REALMS, seedRealmId, parseSeedRealmId, isSeedRealmId, generateSeedRealm, realmProblems, seedRealmFingerprint, realmCacheFind, realmSeedRoll, realmViscera, realmDestination, validSeedRealmState, ensureSeedRealmSession, dropSeedRealms, seedRealmFallback } from '../src/seed-realms.ts';
import { SEED_REALM_BODIES, drawRealmTile, drawRealmObject, drawRealmCosmos } from '../src/seed-realm-render.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const reload = (g, now = 2000) => new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(now)))), now);
const tick = (g, n = 10, t0 = 1000) => { let t = t0; for (let i = 0; i < n; i++) { t += 50; g.update(.05, idle, t); } return t; };
// A game standing beside a Watcher's shrine at (3, 2), holding seeds.
function atShrine(seeds = { pumice: 1, crimson: 1 }, seed = 'REALM-TEST') {
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0);
  g.rx = 3; g.ry = 2; g.loadArea('overworld', false);
  const tomb = { id: 'watcher-tomb-shrine-3-2', kind: 'watcherTomb', name: 'Pristine Tomb of the Watcher', x: Math.floor(g.player.x), y: Math.floor(g.player.y) + 1, state: 'sealed', actions: ['touch'], where: 'shrine' };
  g.map.objects.push(tomb); for (const [k, n] of Object.entries(seeds)) grantSeed(g.save, k, n);
  return { g, tomb };
}
const enter = (kind = 'pumice', seeds) => { const { g, tomb } = atShrine(seeds); const r = g.interact(`realmSeed:${kind}`, tomb.id); assert.ok(r.ok, r.message); return { g, tomb, r }; };
const realmKeys = (s) => [...Object.keys(s.session.areas), ...Object.keys(s.consequences.dungeons)].filter(isSeedRealmId);

test('ids: versioned, parsed back, seeds with colons, nonsense refused', () => {
  const id = seedRealmId('A:B-1', 'pumice', 3); assert.equal(id, 'seedrealm:A:B-1:v1:pumice:3');
  assert.deepEqual(parseSeedRealmId(id), { seed: 'A:B-1', v: 1, kind: 'pumice', realm: 'husk', n: 3 });
  assert.equal(parseSeedRealmId(seedRealmId('S', 'crimson', 1)).realm, 'ship');
  for (const bad of ['seedrealm:S:v1:opal:1', 'seedrealm:S:v1:pumice:0', 'seedrealm:S:vx:pumice:1', 'seedrealm::v1:pumice:1', 'dungeon:S:g1', null, 4]) assert.equal(parseSeedRealmId(bad), null, String(bad));
  assert.equal(generateSeedRealm('S', 'seedrealm:S:v2:pumice:1'), null, 'a version this release does not know is not laid');
  assert.equal(seedRealmFallback('seedrealm:S:v2:pumice:1').objects[0].realmObject, 'exit');
});

test('the solver: every realm of both kinds, over many seeds and uses, is sound on foot from the way in', () => {
  let n = 0;
  for (const kind of ['pumice', 'crimson']) for (let i = 1; i <= 500; i++) {
    const seed = `SOLVE-${i % 23}-${kind}`, id = seedRealmId(seed, kind, 1 + (i * 7) % 40), m = generateSeedRealm(seed, id);
    assert.deepEqual(realmProblems(m), [], id); n++;
    assert.equal(m.width * m.height, m.tiles.length); assert.ok(m.width <= 128 && m.height <= 128, 'within Close View');
    const crystals = m.objects.filter((o) => o.kind === 'realmCrystal').length, R = SEED_REALMS[parseSeedRealmId(id).realm];
    assert.ok(crystals >= Math.min(R.crystals[0], 3) && crystals <= R.crystals[1], `${id}: ${crystals} crystals`);
    assert.ok(m.enemySpawns.length <= SEED_REALMS.maxSpawns && m.enemySpawns.length >= 6, `${id}: ${m.enemySpawns.length} creatures`);
    assert.ok(m.enemySpawns.every((e) => Math.hypot(e.x - m.entry.x, e.y - m.entry.y) >= SEED_REALMS.minFromEntry || e.seedRealmHeart));
    assert.equal(m.activeEnemyCap, SEED_REALMS.activeCap); assert.equal(m.arena, true); assert.equal(m.dungeonContract.discoveryEnabled, true);
    assert.ok(!m.objects.some((o) => /tesseract/i.test(o.kind) || /tesseract/i.test(o.name || '')), 'no Tesseract');
  }
  assert.equal(n, 1000);
});

test('generation is pure and pinned: the same id lays the same realm, byte for byte, and v1 keeps its fingerprints', () => {
  for (const kind of ['pumice', 'crimson']) {
    const id = seedRealmId('PIN', kind, 2), a = generateSeedRealm('PIN', id), b = generateSeedRealm('PIN', id);
    assert.equal(JSON.stringify(a), JSON.stringify(b)); assert.notEqual(seedRealmFingerprint(a), seedRealmFingerprint(generateSeedRealm('PIN', seedRealmId('PIN', kind, 3))), 'the next use is another realm');
  }
  // Version 1's realms as laid when it shipped: a change to the generator must come as a new version.
  assert.deepEqual(['pumice', 'crimson'].map((k) => seedRealmFingerprint(generateSeedRealm('PIN', seedRealmId('PIN', k, 2)))), PINNED);
});
const PINNED = ["1vcxyoi", "8kl08c"]; // seedRealmFingerprint of PIN's second Pumice and Crimson realms, version 1

test('the shrine takes a seed: offered from its menu, spent once, the realm laid from the count used', () => {
  const { g, tomb } = atShrine({ pumice: 2 });
  assert.ok(validActions(tomb, g.save).includes('realmSeed:pumice')); assert.ok(!validActions(tomb, g.save).includes('realmSeed:crimson'), 'only seeds held');
  assert.ok(!validActions({ ...tomb, where: 'crypt' }, g.save).includes('realmSeed:pumice'), 'a crypt tomb below ground does not');
  const r0 = g.interact(null, tomb.id); assert.ok(r0.ok); assert.equal(g.interactionRequested, tomb.id); assert.match(tomb.actionLabels['realmSeed:pumice'], /Pumice Seed \(2 held\): The Hollow Husk/);
  assert.equal(g.area, 'overworld', 'the menu, not a seed spent');
  const r = g.interact('realmSeed:pumice', tomb.id); assert.ok(r.ok);
  assert.equal(seedCount(g.save, 'pumice'), 1); assert.equal(g.save.seedPouch.used.pumice, 1);
  assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), seedRealmId('REALM-TEST', 'pumice', 1)); assert.equal(g.map.name, 'The Hollow Husk');
  assert.ok(validSeedRealmState(g.save.session.seedRealm)); assert.deepEqual(g.save.session.seedRealm.from, { rx: 3, ry: 2 });
  const fail = g.interact('realmSeed:pumice', tomb.id); assert.equal(fail.ok, false, 'inside, the shrine is far away');
  const { g: g2, tomb: t2 } = atShrine({}); assert.equal(g2.interact('realmSeed:crimson', t2.id).ok, false, 'no seed, no realm'); assert.equal(g2.area, 'overworld');
  const { g: g3, tomb: t3 } = atShrine({ crimson: 1 }); t3.state = 'opened'; assert.ok(g3.interact('realmSeed:crimson', t3.id).ok, 'an opened tomb still takes a seed'); assert.equal(g3.map.name, 'The Drifting Ship');
});

test('nothing of the crossings is laid in a realm: no bells, pages, wanderers, Aperture overlay, Gate Revenants, merchants or traps', () => {
  for (const kind of ['pumice', 'crimson']) {
    const { g } = enter(kind), kinds = new Set(g.map.objects.map((o) => o.kind));
    for (const k of ['crackedBell', 'tornPage', 'threadRelic', 'marginNote', 'surveyorLink', 'apertureMemory', 'apertureDoor', 'apertureRelic', 'relayNode', 'shelterMerchant', 'exit', 'watcherTomb']) assert.ok(!kinds.has(k), `${kind}: ${k}`);
    assert.ok(g.map.objects.every((o) => o.realmObject), 'only the realm\'s own things');
    assert.ok(!g.enemies.some((e) => e.gatePredator || e.worldBeast || e.apertureEncounter || e.reciter), 'only the realm\'s own creatures');
    assert.ok(g.enemies.every((e) => g.map.enemySpawns.some((q) => q.id === e.id)));
  }
});

test('the creatures: the husk haunted, the ship crewed by robots with some cosmic kin; new kinds sound and kept out of the crossings', () => {
  const husk = enter('pumice').g, ship = enter('crimson').g;
  const hk = husk.enemies.map((e) => e.kind), sk = ship.enemies.map((e) => e.kind);
  assert.ok(hk.includes('gloomwisp') && hk.some((k) => k === 'hollowMiner' || k === 'veinWraith'), hk.join());
  assert.ok(hk.includes('lastForeman') && sk.includes('helmSovereign'));
  const robots = sk.filter((k) => ['deckSentry', 'hullWarden', 'riveter', 'helmSovereign'].includes(k)).length; assert.ok(robots > sk.length / 2, sk.join());
  for (const id of ['hollowMiner', 'veinWraith', 'lastForeman', 'deckSentry', 'hullWarden', 'riveter', 'helmSovereign']) {
    const d = MONSTER_PACK[id]; assert.ok(d?.prototypeOnly && d.noEcho && !PACK_KINDS.includes(id), id); assert.deepEqual(validateMonster(d), [], id);
    assert.equal(typeof SEED_REALM_BODIES[d.render], 'function', `${id} is drawn`);
  }
  const heart = husk.enemies.find((e) => e.seedRealmHeart); assert.ok(heart.boss && heart.maxHp > MONSTER_PACK.lastForeman.stats[0], 'the heart is a boss, made stronger by SEED_REALMS.threat');
});

test('actor caps: the active set is bounded, the haunt bounded, and many frames keep within them', () => {
  const { g } = enter('pumice'); assert.equal(g.map.activeEnemyCap, SEED_REALMS.activeCap);
  for (const e of g.enemies) { e.aggro = true; e.x = g.player.x + (e.x % 5) - 2; e.y = g.player.y + 4 + (e.y % 3); }
  let t = 1000; for (let i = 0; i < 120; i++) { t += 50; g.player.hp = g.save.maxHp; g.update(.05, idle, t); assert.ok(g.performanceStats.activeEnemies <= SEED_REALMS.activeCap + 2, `frame ${i}: ${g.performanceStats.activeEnemies}`); }
  assert.ok(g.enemies.filter((e) => e.kind === 'gloomwisp' && !e.dead).length <= 10, 'wisps split only to their cap');
  assert.ok(g.enemies.length <= SEED_REALMS.maxSpawns + 12);
});

test('rewards: crystals, caches and a seed pay once; viscera once when the heart falls; never a Tesseract', () => {
  const { g } = enter('crimson'), s = g.save, tess = JSON.stringify(s.tesseracts), ap0 = s.perception.aperture, v0 = Number(s.skylands?.viscera) || 0;
  const use = (o, a) => { g.player.x = o.x; g.player.y = o.y + .8; return g.interact(a, o.id); };
  const crystals = g.map.objects.filter((o) => o.kind === 'realmCrystal');
  for (const o of crystals) assert.ok(use(o, 'attune').ok);
  assert.equal(s.perception.aperture - ap0 >= crystals.length * SEED_REALMS.crystal.aperture - 0, true, 'each crystal widens the Aperture');
  const ap1 = s.perception.aperture; for (const o of crystals) assert.equal(use(o, 'attune').ok, false); assert.equal(s.perception.aperture, ap1, 'never twice');
  const cache = g.map.objects.find((o) => o.kind === 'realmCache'), m0 = JSON.stringify([s.currency, s.materials]);
  assert.ok(use(cache, 'open').ok); const m1 = JSON.stringify([s.currency, s.materials]); assert.notEqual(m1, m0); assert.equal(use(cache, 'open').ok, false); assert.equal(JSON.stringify([s.currency, s.materials]), m1);
  // the heart
  const heart = g.enemies.find((e) => e.seedRealmHeart); heart.hp = 0; heart.dead = true; g.defeatEnemy(heart);
  const got = realmViscera(3, 2); assert.equal((Number(s.skylands.viscera) || 0) - v0, got); assert.equal(g.map.objects.find((o) => o.onward).state, 'open');
  g.seedRealmWon(heart); assert.equal((Number(s.skylands.viscera) || 0) - v0, got, 'the heart pays once');
  // a reload, and a death, pay nothing again
  const g2 = reload(g); assert.equal(g2.map.objects.find((o) => o.onward).state, 'open'); assert.ok(g2.map.objects.filter((o) => o.kind === 'realmCrystal').every((o) => o.state === 'used'));
  assert.ok(g2.enemies.find((e) => e.seedRealmHeart).dead, 'the fallen heart stays fallen');
  g2.player.hp = 0; tick(g2, 3); assert.equal(g2.area, 'dungeon'); assert.ok(g2.map.objects.filter((o) => o.kind === 'realmCrystal').every((o) => o.state === 'used'), 'a death keeps what was paid');
  assert.ok(g2.enemies.find((e) => e.seedRealmHeart).dead); assert.equal((Number(g2.save.skylands.viscera) || 0) - v0, got);
  assert.equal(JSON.stringify(g2.save.tesseracts), tess, 'no Tesseract, ever');
  // the tables
  assert.deepEqual([realmViscera(0, 0), realmViscera(30, 0), realmViscera(500, 0)], [SEED_REALMS.viscera.base, SEED_REALMS.viscera.base + 1, SEED_REALMS.viscera.max]);
  const finds = new Set(); for (let i = 0; i < 400; i++) { const f = realmCacheFind(`k${i}`); finds.add(f.id); const T = SEED_REALMS.cache.find((q) => q.id === f.id); assert.ok(f.n >= T.n[0] && f.n <= T.n[1]); }
  assert.deepEqual([...finds].sort(), SEED_REALMS.cache.map((q) => q.id).sort()); assert.ok(!SEED_REALMS.cache.some((q) => /tesseract/i.test(q.id)));
  let seeds = 0; for (let i = 0; i < 2000; i++) { const k = realmSeedRoll(`r${i}`); if (k) { seeds++; assert.ok(SEEDS[k], k); } }
  assert.ok(Math.abs(seeds / 2000 - SEED_REALMS.seed.chance) < .05, `a seed in about ${SEED_REALMS.seed.chance} of realms (${seeds / 2000})`);
});

test('a seed lying in a realm is taken once, through a reload', () => {
  let found = null; for (let n = 1; n < 60 && !found; n++) if (realmSeedRoll(seedRealmId('REALM-TEST', 'pumice', n))) found = n; assert.ok(found);
  const { g } = enter('pumice', { pumice: found }); for (let i = 1; i < found; i++) { g.leaveSeedRealm(); g.rx = 3; g.ry = 2; g.loadArea('overworld', false); g.map.objects.push({ id: 'watcher-tomb-shrine-3-2', kind: 'watcherTomb', x: 5, y: 5, state: 'sealed', actions: ['touch'], where: 'shrine' }); g.player.x = 5; g.player.y = 5.8; assert.ok(g.interact('realmSeed:pumice', 'watcher-tomb-shrine-3-2').ok); }
  assert.equal(g.areaId(), seedRealmId('REALM-TEST', 'pumice', found));
  const o = g.map.objects.find((q) => q.kind === 'realmSeed'); assert.ok(o); const before = seedCount(g.save, o.seed);
  g.player.x = o.x; g.player.y = o.y + .8; assert.ok(g.interact('take', o.id).ok); assert.equal(seedCount(g.save, o.seed), before + 1);
  const g2 = reload(g), o2 = g2.map.objects.find((q) => q.kind === 'realmSeed'); assert.equal(o2.state, 'used'); g2.player.x = o2.x; g2.player.y = o2.y + .8; assert.equal(g2.interact('take', o2.id).ok, false); assert.equal(seedCount(g2.save, o.seed), before + 1);
});

test('leaving dematerializes it: the Rift and the Way Onward set you down elsewhere, and nothing of the realm stays in the save', () => {
  const { g } = enter('pumice'), id = g.areaId(), dest = g.save.session.seedRealm.dest;
  tick(g, 4); g.snapshotArea(false); assert.ok(realmKeys(g.save).length >= 2, 'while inside, its snapshot and history are kept');
  const rift = g.map.objects.find((o) => o.realmObject === 'exit' && !o.onward); g.player.x = rift.x; g.player.y = rift.y + .8;
  const ask = g.interact(null, rift.id); assert.ok(ask.ok); assert.equal(g.area, 'dungeon', 'the Rift asks first');
  const r = g.interact('leave', rift.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [dest.rx, dest.ry]); assert.notDeepEqual([g.rx, g.ry], [3, 2]);
  assert.deepEqual(realmKeys(g.save), []); assert.equal(g.save.session.seedRealm, null); assert.equal(g.save.session.activeDungeonId, null);
  assert.equal(JSON.stringify(g.exportSnapshot(3000)).includes(id), false, 'not a trace of it in the save');
  // the Way Onward is dark until the heart falls
  const { g: g2 } = enter('crimson'), on = g2.map.objects.find((o) => o.onward); g2.player.x = on.x; g2.player.y = on.y + .8;
  assert.equal(g2.interact('leave', on.id).ok, false); assert.equal(g2.area, 'dungeon');
  // a crossing sigil out of a realm: back where you went in, and the realm is gone all the same
  g2.save.consumables.crossingSigil = 1; assert.ok(g2.useCrossingSigil()); assert.equal(g2.area, 'overworld'); assert.deepEqual(realmKeys(g2.save), []); assert.equal(g2.save.session.seedRealm, null);
});

test('the destination: a known Watcher\'s shrine near enough, else a hop far off; pure', () => {
  const atlas = { '3,2': { sites: [{ kind: 'watcherTomb', x: 5, y: 5 }] }, '6,4': { sites: [{ kind: 'watcherTomb', x: 9, y: 12 }, { kind: 'checkpoint', x: 1, y: 1 }] }, '40,40': { sites: [{ kind: 'watcherTomb', x: 3, y: 3 }] } };
  assert.deepEqual(realmDestination(atlas, 'x', { rx: 3, ry: 2 }), { rx: 6, ry: 4, x: 9, y: 12 }, 'never the shrine you used; the far one is out of reach');
  const hop = realmDestination({}, 'seedrealm:S:v1:pumice:1', { rx: 0, ry: 0 }), d = Math.hypot(hop.rx, hop.ry);
  assert.ok(d >= SEED_REALMS.exit.hop[0] - 1 && d <= SEED_REALMS.exit.hop[1] + 1); assert.deepEqual(realmDestination({}, 'seedrealm:S:v1:pumice:1', { rx: 0, ry: 0 }), hop);
});

test('exact resume: a reload inside lays the same realm, the Wayfarer where they stood, the fallen still fallen', () => {
  for (const kind of ['pumice', 'crimson']) {
    const { g } = enter(kind); tick(g, 6);
    const victim = g.enemies.find((e) => !e.seedRealmHeart); victim.hp = 0; victim.dead = true; g.defeatEnemy(victim);
    const beacon = g.map.objects.find((o) => o.realmObject === 'beacon'); g.player.x = beacon.x; g.player.y = beacon.y + .8; assert.ok(g.interact('kindle', beacon.id).ok);
    g.player.x += .25; const at = [g.player.x, g.player.y], fp = JSON.stringify(g.map.tiles);
    const g2 = reload(g); assert.equal(g2.area, 'dungeon'); assert.equal(g2.areaId(), g.areaId()); assert.equal(JSON.stringify(g2.map.tiles), fp, 'the same ground, laid again');
    assert.deepEqual([g2.player.x, g2.player.y], at); assert.ok(g2.enemies.find((e) => e.id === victim.id)?.dead, 'the slain stay slain');
    assert.equal(g2.map.objects.find((o) => o.realmObject === 'beacon').state, 'lit');
    // a fall returns you to the kindled beacon, the realm otherwise as it was laid
    g2.player.hp = 0; tick(g2, 3, 3000); assert.equal(g2.area, 'dungeon'); assert.ok(Math.hypot(g2.player.x - beacon.x, g2.player.y - beacon.y) < 3, 'risen at the beacon');
  }
});

test('a save inside a realm it cannot resume is set back outside, where the Wayfarer went in', () => {
  const { g } = enter('pumice'), snap = JSON.parse(JSON.stringify(g.exportSnapshot(1000)));
  const broken = structuredClone(snap); broken.session.seedRealm = { v: 1, id: 'nonsense' };
  const m = migrateSave(broken); assert.equal(m.session.area, 'overworld'); assert.deepEqual([m.session.rx, m.session.ry], [3, 2]); assert.equal(m.session.seedRealm, null); assert.deepEqual(realmKeys(m), []);
  const future = structuredClone(snap), fid = 'seedrealm:REALM-TEST:v9:pumice:1'; future.session.activeDungeonId = fid; future.session.seedRealm.id = fid;
  const f = migrateSave(future); assert.equal(f.session.area, 'overworld'); const gf = new Game(f, 0); assert.equal(gf.area, 'overworld');
  const sound = migrateSave(structuredClone(snap)); assert.equal(sound.session.area, 'dungeon'); assert.ok(validSeedRealmState(sound.session.seedRealm));
  // a stray record outside a realm is dropped; old saves gain nothing but a null
  const fresh = freshSave(); assert.equal(fresh.session.seedRealm, null); const out = structuredClone(snap); out.session.area = 'overworld'; assert.equal(migrateSave(out).session.seedRealm, null);
  const old = JSON.parse(JSON.stringify(freshSave())); delete old.session.seedRealm; assert.equal(migrateSave(old).session.seedRealm, null);
  const keep = { session: { areas: { 'seedrealm:a:v1:pumice:1': {}, 'seedrealm:b:v1:pumice:1': {}, 'dungeon:x': {} }, seedRealm: { id: 'seedrealm:a:v1:pumice:1' } }, consequences: { dungeons: { 'seedrealm:b:v1:pumice:1': {} } } };
  assert.equal(dropSeedRealms(keep), 2); assert.deepEqual(Object.keys(keep.session.areas).sort(), ['dungeon:x', 'seedrealm:a:v1:pumice:1']);
  assert.equal(ensureSeedRealmSession({}).session, undefined);
});

test('drawing: tiles, objects, creatures and the cosmos paint without a DOM and stay bounded', () => {
  const calls = { n: 0 }, ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls.n++; }), set: (t, k, v) => { t[k] = v; return true; } });
  for (const kind of ['pumice', 'crimson']) {
    const m = generateSeedRealm('DRAW', seedRealmId('DRAW', kind, 1)); let drawn = 0;
    for (const t of m.tiles) if (drawRealmTile(ctx, t, t.x, t.y, 32, m.tiles, m.width)) drawn++;
    assert.ok(drawn > m.tiles.length * .2, `${kind}: ${drawn}`);
    for (const o of m.objects) drawRealmObject(ctx, { ...o }, 32, 1000);
    const g = { map: m }; assert.equal(drawRealmCosmos(ctx, g, 32, { l: 0, t: 0, r: 20, b: 20 }, 1000, 10, 10), 0, 'no canvas to cache the galaxy on: nothing drawn');
  }
  for (const [k, f] of Object.entries(SEED_REALM_BODIES)) f(ctx, { k: 10, b: 20, u: 32, t: 1.5, p: MONSTER_PACK[k].palette, flip: 1, e: {}, state: 'windup' });
  assert.ok(calls.n > 100);
});

test('the module is precached and built', () => {
  for (const f of ['sw.js', 'proving-ground/sw.js']) { const t = readFileSync(f, 'utf8'); for (const m of ['seed-realms', 'seed-realm-render']) assert.match(t, new RegExp(`src/${m}\\.js\\?v=\\d+`), `${f}: ${m}`); }
  const b = readFileSync('scripts/build.mjs', 'utf8'); assert.match(b, /'seed-realms'/); assert.match(b, /'seed-realm-render'/);
});
