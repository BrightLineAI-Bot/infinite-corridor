import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, biomeFor } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { grantTidemantle } from '../src/water-traversal.ts';
import { SEA_CREATURES, SEA_SPAWNS, seaSpawns, seaCombatantFields, updateSeaCreature, leviathanTrophy, LEVIATHAN_TROPHY } from '../src/sea-creatures.ts';

const SEED = 'LANDTEST';
const section = (rx, ry, version) => { const m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry, version ? { version } : {}); return m; };
const LEVIATHANS = Object.keys(SEA_CREATURES).filter((k) => SEA_CREATURES[k].leviathan && SEA_CREATURES[k].habitat === 'deep'); // the Elder Wyrm lives in grottoes
function world(player, wet = () => true) {
  const w = { player, hits: [], pulls: [], summons: [], inks: 0, time: 0, live: 0,
    water: (hab, x, y) => wet(x, y), hurt: (n, e) => w.hits.push({ n, t: w.time, kind: e.kind }), pull: (e, k) => w.pulls.push(k),
    summon: (kind, x, y, o) => { w.summons.push({ kind, x, y, owner: o.id }); w.live++; }, tentacles: () => w.live, ink: () => { w.inks++; }, ownerDead: () => false };
  return w;
}
const creature = (kind, x, y) => ({ id: `${kind}-test`, kind, x, y, ...seaCombatantFields(kind) });
function run(e, w, seconds, dt = 1 / 30, each = () => {}) { for (let t = 0; t < seconds; t += dt) { w.time += dt; updateSeaCreature(e, w, dt); each(e); } }

test('leviathans: deep-ocean only, at most one per section, deterministic, every kind somewhere in the sea', () => {
  const seen = new Set(); let eligible = 0, with1 = 0;
  for (let ry = -40; ry <= 40; ry++) for (let rx = -40; rx <= 40; rx++) {
    if (biomeFor(SEED, rx, ry) !== 'sea') continue;
    const m = section(rx, ry), lev = seaSpawns(m, SEED, rx, ry).filter((q) => SEA_CREATURES[q.kind].leviathan);
    assert.ok(lev.length <= 1);
    if (m.tiles.filter((t) => t.kind === 'deepOcean').length >= SEA_SPAWNS.leviathanTiles) eligible++;
    for (const q of lev) { with1++; seen.add(q.kind); assert.equal(m.tiles[q.y * 32 + q.x].kind, 'deepOcean'); assert.deepEqual(seaSpawns(section(rx, ry), SEED, rx, ry).find((z) => z.id === q.id), q); assert.deepEqual(seaSpawns(section(rx, ry, 1), SEED, rx, ry), []); }
  }
  for (const k of LEVIATHANS) assert.ok(seen.has(k), `${k} roams somewhere`);
  assert.ok(with1 > 0 && with1 < eligible * .5, `${with1} leviathans in ${eligible} eligible sections`);
  for (const k of LEVIATHANS) assert.ok(SEA_CREATURES[k].hp >= 240 && SEA_CREATURES[k].size >= 2, `${k} is huge`);
});

test('Greywhale: harmless until struck; then a vast shadow, a breach that hurts and throws the Wayfarer back', () => {
  const p = { x: 10, y: 10 }, w = world(p), e = creature('greywhale', 9, 10);
  run(e, w, 6); assert.equal(w.hits.length, 0, 'calm'); assert.equal(e.boss, false);
  e.hp -= 10; updateSeaCreature(e, w, 1 / 30); assert.equal(e.seaTele?.type, 'shadow'); assert.equal(e.seaTele.big, true);
  run(e, w, SEA_CREATURES.greywhale.telegraph + .1);
  assert.equal(w.hits.length, 1); assert.ok(w.pulls[0] < 0, 'pushed away');
});

test('Tyrant Mosasaur: stalks hidden with a visible shadow, marks its lunge, strikes once, then lies exposed', () => {
  const p = { x: 14, y: 10 }, w = world(p), e = creature('tyrantMosasaur', 4, 10), d = SEA_CREATURES.tyrantMosasaur;
  updateSeaCreature(e, w, 1 / 30); assert.equal(e.untargetable, true); assert.equal(e.seaTele.type, 'shadow');
  let lockedAt = null; run(e, w, 6, 1 / 30, () => { if (lockedAt === null && e.sea.phase === 'telegraph') lockedAt = w.time; });
  assert.ok(lockedAt !== null, 'locks on'); assert.equal(w.hits.length, 1); assert.ok(w.hits[0].t >= lockedAt + d.telegraph - .05, 'telegraph first');
  const f = creature('tyrantMosasaur', 10, 10), w2 = world({ x: 13, y: 10 }); let exposedTargetable = false;
  run(f, w2, 4, 1 / 30, () => { if (f.sea.phase === 'exposed') exposedTargetable ||= !f.untargetable; }); assert.ok(exposedTargetable);
});

test('Reef and Stormkraken: rings first, then bounded tentacles there; the Stormkraken inks the water', () => {
  const p = { x: 10, y: 10 }, w = world(p), e = creature('reefKraken', 14, 10), d = SEA_CREATURES.reefKraken;
  updateSeaCreature(e, w, 1 / 30); assert.equal(e.seaTele.type, 'rings'); assert.equal(w.summons.length, 0);
  const marks = e.seaTele.marks; run(e, w, d.telegraph + .05);
  assert.deepEqual(w.summons.map((q) => [q.x, q.y]), marks.map((m) => [m.x, m.y]), 'tentacles rise in the marked rings');
  run(e, w, 30); assert.ok(w.summons.length <= d.maxTentacles, 'never more than the cap alive');
  const s = creature('stormkraken', 14, 10), ws = world({ x: 10, y: 10 }); run(s, ws, SEA_CREATURES.stormkraken.inkEvery + .5); assert.ok(ws.inks >= 1);
});

test('tentacle: a ring before every slam, then it sinks; it dies with its kraken', () => {
  const p = { x: 10, y: 10 }, w = world(p), e = creature('tentacle', 10.3, 10), d = SEA_CREATURES.tentacle;
  updateSeaCreature(e, w, 1 / 30); assert.equal(e.seaTele?.type, 'slam', 'ring shown as it rises');
  run(e, w, d.life); assert.equal(e.dead, true); assert.ok(w.hits.length >= 1 && w.hits.length <= Math.ceil(d.life / d.every) + 1);
  const g = creature('tentacle', 10, 10), w2 = world({ x: 30, y: 30 }); w2.ownerDead = () => true; updateSeaCreature(g, w2, 1 / 30); assert.equal(g.dead, true);
});

test('Abyssal Kraken: marks, then drags the Wayfarer toward its maw; heavy blows break the grip', () => {
  const p = { x: 10, y: 10 }, w = world(p), e = creature('abyssalKraken', 15, 10), d = SEA_CREATURES.abyssalKraken;
  updateSeaCreature(e, w, 1 / 30); assert.equal(e.seaTele.type, 'mark'); assert.equal(w.pulls.length, 0);
  run(e, w, d.telegraph + .3); assert.equal(e.sea.phase, 'hold'); assert.ok(w.pulls.length > 0 && w.pulls.every((k) => k > 0), 'dragged toward it');
  e.hp -= d.breakAt; updateSeaCreature(e, w, 1 / 30); assert.notEqual(e.sea.phase, 'hold', 'grip broken');
});

test('in the real game: tentacles join the fight as rewardless summons, ink darkens the sea, and the first fell pays a trophy once', () => {
  let found = null;
  for (let ry = -40; ry <= 40 && !found; ry++) for (let rx = -40; rx <= 40 && !found; rx++) if (biomeFor(SEED, rx, ry) === 'sea') { const q = seaSpawns(section(rx, ry), SEED, rx, ry).find((z) => z.kind === 'reefKraken'); if (q) found = { rx, ry, q }; }
  assert.ok(found);
  const s = Object.assign(freshSave(), { seed: SEED }), g = new Game(s, 0); g.rx = found.rx; g.ry = found.ry; g.loadArea('overworld');
  const k = g.enemies.find((e) => e.id === found.q.id); assert.ok(k && k.boss && k.leviathan);
  g.enemies = g.enemies.filter((e) => e === k); g.player.invulnerableUntil = Infinity; grantTidemantle(s, 'test'); g.player.stamina = 1e6; // swimming beside it
  const spot = g.map.tiles.filter((t) => t.kind === 'deepOcean' && Math.hypot(t.x - k.x, t.y - k.y) >= 2 && Math.hypot(t.x - k.x, t.y - k.y) <= 5 && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([dx, dy]) => ['ocean', 'deepOcean'].includes(g.map.tiles[(t.y + dy * 2) * 32 + t.x + dx * 2]?.kind)))[0];
  assert.ok(spot, 'deep water near the kraken'); g.player.x = spot.x; g.player.y = spot.y - .2; // tentacles rise only in deep water
  const input = { state: { x: 0, y: 0 }, consume: () => false };
  for (let i = 0; i < 90; i++) g.update(1 / 30, input, 60000 + i * 33);
  const limbs = g.enemies.filter((e) => e.kind === 'tentacle' && !e.dead);
  assert.ok(limbs.length >= 1 && limbs.length <= SEA_CREATURES.reefKraken.maxTentacles); assert.ok(limbs.every((e) => e.noRewards && e.summonedBy === k.id));
  const storm = Object.assign(k, seaCombatantFields('stormkraken'), { kind: 'stormkraken', seaKind: 'stormkraken' }); storm.sea.ink = 0;
  g.update(1 / 30, input, 70000); assert.ok(g.inkUntil > 70000);
  const before = s.currency; k.hp = 0; k.dead = true; g.defeatEnemy(k);
  assert.ok(s.currency >= before + LEVIATHAN_TROPHY.currency); assert.equal(s.worldFlags['leviathan:stormkraken'], true);
  assert.equal(leviathanTrophy(s, 'stormkraken'), false, 'once only'); assert.equal(leviathanTrophy(s, 'lanceeel'), false, 'leviathans only');
});

test('the Tyrant Mosasaur is its own bigger, tougher creature; its old body is the Undertow Leviathan', () => {
  // Release 229 (Tim): the mosasaur looks like a mosasaur, is bigger and has more health; the segmented creature stays.
  const t = SEA_CREATURES.tyrantMosasaur, u = SEA_CREATURES.undertowLeviathan;
  assert.equal(t.body, 'mosasaur'); assert.ok(t.hp > u.hp && t.size > u.size && t.hitReach > 1.1);
  assert.equal(u.pattern, 'lunge'); assert.equal(u.segments, 5); assert.equal(u.hp, 320);
  assert.equal(SEA_SPAWNS.leviathans.length, 9, 'the table keeps its length, so sections keep their rolls');
  assert.ok(SEA_SPAWNS.leviathans.includes('tyrantMosasaur') && SEA_SPAWNS.leviathans.includes('undertowLeviathan'));
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'); assert.match(src, /function drawMosasaur\(/); assert.match(src, /function mosasaurSpine\(/); assert.match(src, /MOSASAUR_KICK = /);
});
