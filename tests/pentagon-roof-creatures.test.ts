// The Pentagon roofs' dwellers (roof-dwellers.ts). Tim, 2026-11-04: "gargoyles and angels and demons up there... some bird creatures...
// you won't see them, and they won't aggro to you, unless you're on the roof. Then they become visible and attack you." Roster revised:
// no new angel (the Cinder Seraph serves); a Battlement Colossus that lumbers, slams close up and fires a telegraphed, very heavy chest
// laser, one or two per Pentagon. The roof itself is the world-builder's; these tests stand a fake roof (a square of open court in
// each section) behind the roof interface (useRoof), as the real helpers will be wired.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, ELEVATION_REACH, fliesHigh, isBodyBlow, bodyBlowReaches } from '../src/game.ts';
import { PENTAGON } from '../src/pentagon.ts';
import { ROOF_DWELLERS, ROOF_KINDS, useRoof, roofAt, roofPlan, roofPlanCount, roofSpawns, tuneDweller, onRoof } from '../src/roof-dwellers.ts';
import { MONSTER_PACK, ATTACK_MODULES, COLOSSUS, PACK_KINDS, updatePackMonster, tickPackEffects, addPackEffect, freshPackState, validateMonster, packVariant } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackTelegraphs, roofWakeStage } from '../src/monster-render.ts';
import { LETHAL_KINDS, LANDSCAPE_VERSION } from '../src/landscape.ts';

const SEED = 'TIM1';
const BOX = { lo: 6, hi: 25 };
const fakeRoofAt = (map, x, y) => x >= BOX.lo && y >= BOX.lo && x <= BOX.hi && y <= BOX.hi && !!map.tiles[y * 32 + x] && !map.tiles[y * 32 + x].blocked;
const fakeRoof = () => useRoof({ roofAt: fakeRoofAt, roofSpots: (map) => map.tiles.filter((t) => fakeRoofAt(map, t.x, t.y)).map((t) => ({ x: t.x, y: t.y })) });
fakeRoof();

let found = null;
const pentagon = () => { if (found) return found; const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return (found = { cx, cy }); throw new Error('no Pentagon'); };
const atSection = (dx = 0, dy = 0, save = null) => { const c = pentagon(), s = save || freshSave(); s.seed = SEED; Object.assign(s.session, { area: 'overworld', rx: c.cx + dx, ry: c.cy + dy, x: 2, y: 2 }); const g = new Game(s, 0); g.player.invulnerableUntil = 0; return g; };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const run = (g, seconds, t0 = 1000) => { let now = t0; for (let t = 0; t < seconds; t += 1 / 30) g.update(1 / 30, idle, (now += 1000 / 30)); return now; };
const offRoofSpot = (g) => g.map.tiles.find((t) => !t.blocked && !LETHAL_KINDS.has(t.kind) && t.x > 1 && t.y > 1 && t.x < BOX.lo - 1 && !fakeRoofAt(g.map, t.x, t.y));
const roofSpotNear = (g, e) => g.map.tiles.filter((t) => fakeRoofAt(g.map, t.x, t.y)).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y)).find((t) => Math.hypot(t.x - e.x, t.y - e.y) >= 2);
const pin = (V) => { if (!V) return null; const c = pentagon(), s = freshSave(); s.atlas = { [`${c.cx + 1},${c.cy + 1}`]: { landscapeVersion: LANDSCAPE_VERSION, pentVersion: V } }; return s; }; // release 795: a Pentagon pinned to an older version
const roofed = (V = 0) => { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const g = atSection(dx, dy, pin(V)); if (g.roofDwell?.sleepers.length) return { g, dx, dy }; } throw new Error('no dwellers'); };
const quiet = (g) => { g.enemies = g.enemies.filter((e) => e.roofDweller); }; // the section's own creatures out of the way

test('four new roof kinds compose and validate; no new angel (the Cinder Seraph serves); none enters the shared roster', () => {
  assert.deepEqual(ROOF_KINDS.sort(), ['ridgeDemon', 'roofColossus', 'roofGargoyle', 'slateRook']);
  for (const id of ROOF_KINDS) { assert.deepEqual(validateMonster(MONSTER_PACK[id]), [], id); assert.ok(MONSTER_PACK[id].prototypeOnly && MONSTER_PACK[id].noEcho, id); assert.ok(!PACK_KINDS.includes(id), `${id} stays out of PACK_KINDS (other creatures' borrowed attacks are unchanged)`); assert.equal(packVariant(id, 'x').hybridAttack, null); }
  assert.ok(ROOF_DWELLERS.kinds.some((k) => k.kind === 'cinderSeraph'), 'the existing angel is on the roof');
  assert.ok(!Object.keys(MONSTER_PACK).some((id) => /angel/i.test(id)), 'no new angel kind');
  assert.ok(ATTACK_MODULES.chestLaser.tags.includes('beam') && ATTACK_MODULES.stoneSlam.tags.includes('melee'));
});

test('flyers count as flyers under ELEVATION_REACH; the slam is a body blow, the chest laser a beam', () => {
  const mk = (kind) => createCombatant(kind, 5, 5);
  for (const k of ['slateRook', 'cinderSeraph']) assert.ok(ELEVATION_REACH.flyingMoves.includes(MONSTER_PACK[k].movement) && fliesHigh(mk(k)), k);
  for (const k of ['roofGargoyle', 'ridgeDemon', 'roofColossus']) assert.ok(!fliesHigh(mk(k)), k);
  assert.ok(isBodyBlow('stoneSlam') && isBodyBlow('demonCleave') && isBodyBlow('clawSweep')); assert.ok(!isBodyBlow('chestLaser'));
  const map = { landscape: true }, at = (lv) => ({ x: 0, y: 0, lv });
  assert.equal(bodyBlowReaches(map, 32, mk('roofColossus'), at(), 5, 0), false, 'its slam does not reach the ground from the roof');
  assert.equal(bodyBlowReaches(map, 32, mk('slateRook'), at(), 5, 0), true, 'a Rook reaches you anywhere');
});

test('the population is deterministic per Pentagon, bounded, with one or two Colossi', () => {
  const g = atSection(0, 0), base = g.map.pentagon.base;
  assert.deepEqual(roofPlan(base), roofPlan(base));
  const again = atSection(0, 0); assert.deepEqual(again.roofDwell.sleepers.map((e) => [e.id, e.kind, e.x, e.y, e.maxHp, e.damage]), g.roofDwell.sleepers.map((e) => [e.id, e.kind, e.x, e.y, e.maxHp, e.damage]));
  for (let i = 0; i < 300; i++) {
    const plan = roofPlan(`pentagon:S${i}:${i * 8}:${-i * 8}:v6`), sections = Object.values(plan); assert.equal(sections.length, 9);
    for (const groups of sections) assert.ok(groups.reduce((n, q) => n + q.n, 0) <= ROOF_DWELLERS.cap.section);
    const colossi = sections.flat().filter((q) => q.kind === 'roofColossus').length; assert.ok(colossi >= 1 && colossi <= 2, `${colossi}`);
    assert.ok(roofPlanCount(plan) <= 9 * ROOF_DWELLERS.cap.section);
  }
  assert.notDeepEqual(roofPlan('pentagon:A:0:0:v6'), roofPlan('pentagon:B:0:0:v6'));
});

test('spawns land on open, safe roof with room to move, clear of objects, within the section cap', () => {
  let seen = 0;
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const g = atSection(dx, dy), list = g.roofDwell.sleepers, objs = new Set(g.map.objects.map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
    assert.ok(list.length <= ROOF_DWELLERS.cap.section);
    for (const e of list) { const t = g.map.tiles[e.y * 32 + e.x]; seen++;
      assert.ok(roofAt(g.map, e.x, e.y) && t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !t.doorway && !t.stairs && !objs.has(`${e.x},${e.y}`), `${e.kind} at ${e.x},${e.y}`);
      let room = 0; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if ((ox || oy) && fakeRoofAt(g.map, e.x + ox, e.y + oy)) room++; assert.ok(room >= ROOF_DWELLERS.perch.room, 'it can move'); }
  }
  assert.ok(seen > 0);
  useRoof({}); try { assert.equal(atSection(0, 0).roofDwell.sleepers.length, 0, 'unwired, no tile is roof and nothing spawns'); } finally { fakeRoof(); }
});

test('off the roof they are hidden and inert: not in the enemy list, not drawn, not counted, untouched by attacks, no AI', () => {
  const { g } = roofed(), spot = offRoofSpot(g); g.player.x = spot.x; g.player.y = spot.y; assert.ok(!onRoof(g.map, g.player));
  const before = g.roofDwell.sleepers.map((e) => [e.id, e.x, e.y, e.hp, JSON.stringify(e.pack)]);
  run(g, 3);
  assert.equal(g.enemies.filter((e) => e.roofDweller).length, 0, 'none in the enemy list');
  assert.deepEqual(g.roofDwell.sleepers.map((e) => [e.id, e.x, e.y, e.hp, JSON.stringify(e.pack)]), before, 'none moved, thought or was hurt');
  // stand among them and swing; an area blast over the whole roof
  const e0 = g.roofDwell.sleepers[0]; g.player.x = spot.x; g.player.y = spot.y;
  for (const e of g.roofDwell.sleepers) { e.x = spot.x + 1; e.y = spot.y; } let now = 9000; for (let i = 0; i < 20; i++) g.primaryAttack(now += 400);
  g.spellCooldownRemaining = 0; g.save.equippedSpell = 'ember-ring'; g.castSpell(); run(g, 2, now); // an area spell where they stand
  for (const e of g.enemies) assert.ok(!e.roofDweller);
  assert.ok(g.roofDwell.sleepers.every((e) => e.hp === e.maxHp && !e.dead), 'untouched by swings and area spells'); assert.ok(e0.hp > 0);
  assert.ok(g.enemies.length === g.enemies.filter((e) => !e.roofDweller).length && g.performanceStats.activeEnemies <= g.enemies.length, 'not counted or simulated');
  for (const e of g.roofDwell.sleepers) if (ROOF_KINDS.includes(e.kind)) assert.ok(!g.save.codex?.creatures?.[e.kind], `${e.kind} not yet in the Codex`);
});

test('stepping onto the roof: they wake (a short, visible wake-up), aggro and attack', () => {
  const { g } = roofed(); quiet(g); const first = g.roofDwell.sleepers[0], at = roofSpotNear(g, first); g.player.x = at.x; g.player.y = at.y; g.player.hp = g.player.maxHp = 5000; g.save.maxHp = 5000;
  assert.ok(onRoof(g.map, g.player));
  let now = run(g, 1 / 30);
  const awake = g.enemies.filter((e) => e.roofDweller); assert.ok(awake.length > 0, 'woken into the enemy list'); assert.equal(g.message, ROOF_DWELLERS.text.wake);
  assert.ok(awake.every((e) => e.aggro && e.roofWake > 0 && roofWakeStage(e) < 4), 'waking');
  assert.ok(awake.every((e) => g.save.codex.creatures[e.kind]), 'into the Codex');
  const hp0 = g.player.hp; now = run(g, 6, now);
  assert.ok(awake.every((e) => !(e.roofWake > 0)), 'awake');
  assert.ok(awake.some((e) => e.pack?.seq > 0), 'and attacking'); assert.ok(g.player.hp < hp0 || awake.some((e) => e.pack.tele), 'they come for you');
});

test('leaving the roof: ground dwellers stay up there and sleep again; fliers pursue a while, then fly home and sleep', () => {
  const { g } = roofed(7); quiet(g); /* release 795: the roof this was written on (version 7) */ const first = g.roofDwell.sleepers[0], at = roofSpotNear(g, first); g.player.x = at.x; g.player.y = at.y; g.player.invulnerableUntil = 1e15;
  const total = g.roofDwell.sleepers.length; let now = run(g, 2); const awake = g.enemies.filter((e) => e.roofDweller && !e.dead), fliers = awake.filter((e) => fliesHigh(e)), ground = awake.filter((e) => !fliesHigh(e));
  const off = offRoofSpot(g); g.player.x = off.x; g.player.y = off.y; now = run(g, .2, now);
  for (const e of ground) { assert.ok(!g.enemies.includes(e), `${e.kind} is no longer about`); assert.deepEqual([e.x, e.y], [e.roofHome.x, e.roofHome.y], 'back on its perch'); }
  for (const e of fliers) assert.ok(g.enemies.includes(e), `${e.kind} pursues`);
  now = run(g, ROOF_DWELLERS.pursue.seconds + ROOF_DWELLERS.home.seconds + 1, now);
  assert.equal(g.enemies.filter((e) => e.roofDweller).length, 0, 'all asleep again'); assert.equal(g.roofDwell.sleepers.length, total);
  for (const e of fliers) assert.ok(Math.hypot(e.x - e.roofHome.x, e.y - e.roofHome.y) < .01, 'on their perches');
  g.player.x = at.x; g.player.y = at.y; run(g, .1, now); assert.ok(g.enemies.some((e) => e.roofDweller), 'and they wake again');
});

test('a slain dweller stays slain across a reload; the living are made again from the plan', () => {
  const { g } = roofed(); quiet(g); const first = g.roofDwell.sleepers[0], at = roofSpotNear(g, first); g.player.x = at.x; g.player.y = at.y; g.player.invulnerableUntil = 1e15;
  let now = run(g, .2); const victim = g.enemies.find((e) => e.roofDweller); assert.ok(victim); const id = victim.id, n = g.roofDwell.sleepers.length + g.enemies.filter((e) => e.roofDweller).length;
  victim.hp = 0; victim.dead = true; g.defeatEnemy(victim); now = run(g, .2, now);
  assert.ok(g.save.consequences.dungeons[`${victim.roofBase}:f1`].roofSlain.includes(id));
  const snap = JSON.parse(JSON.stringify(g.exportSnapshot(now)));
  assert.ok(!(snap.session.areas[`overworld:${g.rx}:${g.ry}:g${g.save.worldGeneration}`]?.enemies || []).some((e) => e.roofDweller), 'not saved with the section');
  const back = new Game(migrateSave(snap), 0); assert.equal(back.rx, g.rx);
  const ids = back.roofDwell.sleepers.map((e) => e.id); assert.ok(!ids.includes(id), 'still dead'); assert.equal(ids.length, n - 1);
});

test('the Heart Lamp: a clear telegraph (charge, a following aim line, then a held, flashing one), a heavy hit on the line, nothing off it', () => {
  const world = (player) => { const w = { player: { ...player, hp: 9999 }, width: 32, height: 32, dt: 1 / 30, now: 0, enemies: [], effects: [], hurts: [], playerVelocity: { x: 0, y: 0 }, open: () => true, tileOpen: () => true, los: () => true, move(e, dx, dy) { e.x += dx; e.y += dy; return true; }, hurt(src, amount, o = {}) { w.hurts.push({ amount, source: o.source, beam: o.beam }); return true; }, slow() {}, addEffect(f) { addPackEffect(w.effects, f, w.now); } }; return w; };
  const make = () => { const e = createCombatant('roofColossus', 5, 5); e.id = 'col'; e.aggro = true; e.packAttacks = ['chestLaser']; e.pack = freshPackState(); e.pack.gap = 0; return e; };
  const step = (w, e, sec) => { const out = []; for (let t = 0; t < sec; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.effects = tickPackEffects(w.effects, w); out.push(e.pack.tele ? { ...e.pack.tele } : null); } return out; };
  // stand still on the line: hit once, hard
  { const e = make(), w = world({ x: 12, y: 5 }), tl = step(w, e, ATTACK_MODULES.chestLaser.windup + .6);
    const kinds = tl.filter(Boolean).map((q) => q.type + (q.locked ? ':locked' : '')); assert.ok(kinds.includes('laser') && kinds.includes('laser:locked') && kinds.includes('beam'), kinds.join());
    const firstLock = tl.findIndex((q) => q?.locked), firstBeam = tl.findIndex((q) => q?.type === 'beam'); assert.ok((firstBeam - firstLock) * w.dt >= COLOSSUS.laser.lock - .05, 'a held line before it fires');
    assert.ok((tl.findIndex((q) => q?.locked) ) * w.dt >= COLOSSUS.laser.track - .1, 'the line follows first');
    assert.ok(tl.filter((q) => q?.type === 'laser').map((q) => q.charge).every((c, i, a) => i === 0 || c >= a[i - 1]), 'the lamp only gathers');
    const hits = w.hurts.filter((h) => h.source === 'chestLaser'); assert.equal(hits.length, 1); assert.equal(hits[0].amount, Math.ceil(e.damage * ATTACK_MODULES.chestLaser.damage)); assert.ok(hits[0].beam); }
  // step off the line once it holds: no hit
  { const e = make(), w = world({ x: 12, y: 5 }); let t = 0; for (; t < 5; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); if (e.pack.tele?.locked) break; }
    w.player.y = 8; step(w, e, 1.5); assert.equal(w.hurts.filter((h) => h.source === 'chestLaser').length, 0, 'off the held line, it misses'); }
  // tracking turns at a bounded rate: a fast sidestep during the tracking still has time to leave the line
  assert.ok(COLOSSUS.laser.turn > 0 && COLOSSUS.laser.lock >= .5 && ATTACK_MODULES.chestLaser.windup >= COLOSSUS.laser.track + COLOSSUS.laser.lock - 1e-9);
});

test('tuned to the Wayfarer: a strong build loses about 60% to the lamp, two kill, one never does; the regional numbers are the floor', () => {
  const tim = { perHit: 559, maxHp: 914, guard: .695 }, after = (raw) => Math.max(1, Math.ceil(raw * (1 - tim.guard)));
  const c = tuneDweller(Object.assign(createCombatant('roofColossus', 0, 0), { maxHp: 1518, hp: 1518, damage: 79 }), tim), laser = after(Math.ceil(c.damage * ATTACK_MODULES.chestLaser.damage));
  assert.ok(laser / tim.maxHp > .55 && laser / tim.maxHp < .7, `${laser}`); assert.ok(laser * 2 >= tim.maxHp && laser < tim.maxHp);
  assert.ok(c.maxHp >= tim.perHit * ROOF_DWELLERS.tune.hits.roofColossus);
  const weak = { perHit: 20, maxHp: 120, guard: .05 }, r = tuneDweller(Object.assign(createCombatant('roofColossus', 0, 0), { maxHp: 1518, hp: 1518, damage: 79 }), weak);
  assert.equal(r.maxHp, 1518, 'regional health stands where it is more'); assert.ok(Math.ceil(r.damage * 6) * (1 - weak.guard) <= ROOF_DWELLERS.tune.cap * weak.maxHp + 6, 'never a one-shot');
  for (const k of ROOF_KINDS) { const q = tuneDweller(createCombatant(k, 0, 0), tim); for (const a of q.packAttacks) assert.ok(after(Math.ceil(q.damage * ATTACK_MODULES[a].damage)) < tim.maxHp * ROOF_DWELLERS.tune.cap + 2, `${k} ${a}`); }
});

test('each kind draws headless, every pose and wake stage, with the lamp\'s telegraph', () => {
  const calls = { n: 0 }, ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 1 }) }, { get: (o, k) => (k in o ? o[k] : () => { calls.n++; }), set: () => true });
  for (const kind of ROOF_KINDS) for (const wake of [1, .7, .45, .2, 0]) for (const attack of [null, ...MONSTER_PACK[kind].attacks]) for (const phase of ['windup', 'active']) {
    const e = createCombatant(kind, 4, 4); e.id = `draw-${kind}`; e.roofDweller = true; e.roofWakeTotal = 1; e.roofWake = wake; e.pack = { ...freshPackState(), attack, phase: attack ? phase : null };
    const n = calls.n; assert.ok(drawPackMonster(ctx, e, 32, 1000), kind); assert.ok(calls.n > n + 10, `${kind} draws`);
  }
  const e = createCombatant('roofColossus', 4, 4); e.pack = { ...freshPackState(), attack: 'chestLaser', phase: 'windup', tele: { type: 'laser', angle: .3, length: 8, charge: .5, locked: false, chest: 1.05 } };
  let n = calls.n; drawPackTelegraphs(ctx, [e], 32, 1000); assert.ok(calls.n > n); e.pack.tele.locked = true; n = calls.n; drawPackTelegraphs(ctx, [e], 32, 1000); assert.ok(calls.n > n);
  e.pack.tele = { type: 'beam', angle: .3, length: 8, charging: false, laser: true, chest: 1.05 }; n = calls.n; drawPackTelegraphs(ctx, [e], 32, 1000); assert.ok(calls.n > n);
  assert.equal(roofWakeStage({ roofWakeTotal: 1, roofWake: 0 }), 4);
});

test('the roof changes no generation: a Pentagon section is the same ground with the dwellers wired or not', () => {
  const snap = (g) => JSON.stringify([g.map.tiles, g.map.objects.filter((o) => o.kind !== 'traveler'), g.map.enemySpawns, g.map.pentagon]);
  const a = snap(atSection(0, 0)); useRoof({}); try { assert.equal(snap(atSection(0, 0)), a); } finally { fakeRoof(); }
  const spawns = roofSpawns(atSection(0, 0).map, { ...atSection(0, 0).map.pentagon }, pentagon().cx, pentagon().cy); assert.ok(spawns.every((q) => q.id.startsWith(`roof:${atSection(0, 0).map.pentagon.base}:`)));
});
