// Release 709 (Tim, 2026-11-03): a red dragon world boss, the Crimson Tyrant.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BEASTS, BEAST_APERTURE, PLACEMENT, ensureWorldBeasts } from '../src/world-beasts.ts';
import { MONSTER_PACK, ATTACK_MODULES, DRAGON, BOSS_POISE, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { ECHOES } from '../src/echoes.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackEffects } from '../src/monster-render.ts';
import { DRAGON_EFFECT_KINDS } from '../src/crimson-dragon-render.ts';
import { castTiles, dragonCast, dragonRecord, ensureDragonLava, applyDragonLava } from '../src/crimson-dragon.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

function world({ size = 32, player = { x: 16, y: 12 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], pushes: 0, playerVelocity: { x: 0, y: 0 }, due: false, casts: 0,
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source, piercing: !!opts.piercing }); w.player.hp -= amount; return true; },
    slow() {}, push() { w.pushes++; return true; }, pull() {}, poison() {}, stun() {}, ignite() {}, playerMaxHp: () => 200,
    dragonDue: () => w.due, dragonLava: () => { w.casts++; w.due = false; return []; }, dragonLavaPreview: () => [100, 101, 102],
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function dragon(w, only, x = 12, y = 12) {
  const e = createCombatant('crimsonTyrant', x, y, true, []); Object.assign(e, { id: 'dragon-1', aggro: true, hp: 9000, maxHp: 9000, damage: 40 });
  if (only) e.packAttacks = [only]; w.enemies.push(e); return e;
}
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(); } }
function until(w, e, id, max = 8) { for (let t = 0; t < max && e.pack.attack !== id; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, id, `${id} starts`); }
const by = (w, source) => w.hurts.filter((h) => h.source === source).length;

test('registry: a huge flying world boss, twelve moves, its own poise, Echo and Aperture tier; bigger than the Astral Worm', () => {
  const B = WORLD_BEASTS.crimsonTyrant, def = MONSTER_PACK.crimsonTyrant;
  assert.equal(B.home, 'firelands'); assert.equal(B.tries, 4); assert.equal(def.attacks.length, 12); for (const id of def.attacks) assert.ok(ATTACK_MODULES[id], id);
  assert.ok(ECHOES.crimsonTyrant); assert.ok(BOSS_POISE.crimsonTyrant); assert.equal(BEAST_APERTURE.crimsonTyrant, 8); assert.ok(PLACEMENT.bigBeasts.includes('crimsonTyrant'));
  assert.ok(createCombatant('crimsonTyrant', 0, 0, true, []).scale > 2 * createCombatant('astralWorm', 0, 0, true, []).scale);
});

test('burning pass: aloft and out of reach, it sweeps over you breathing fire onto the ground', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = dragon(w, 'dragonStrafe', 10, 12); until(w, e, 'dragonStrafe');
  assert.equal(e.untargetable, true); step(w, 3.5); assert.ok(e.x > 18, 'it passed over'); assert.ok(by(w, 'dragonMeteor') >= 1); assert.ok(w.fx.some((f) => f.kind === 'flameTrail')); assert.equal(e.untargetable, false);
});

test('searing slam: the forefeet land, then three streaks of fire tear out', () => {
  const w = world({ player: { x: 14.5, y: 12 } }), e = dragon(w, 'dragonSlam'); until(w, e, 'dragonSlam'); step(w, ATTACK_MODULES.dragonSlam.windup * 1.3);
  assert.ok(by(w, 'dragonSlam') >= 1); assert.equal(w.fx.filter((f) => f.kind === 'fireLine').length, DRAGON.slam.streaks);
});

test('wing lash: it springs back, then the wings throw you back', () => {
  const w = world({ player: { x: 14.5, y: 12 } }), e = dragon(w, 'dragonWingBack'); until(w, e, 'dragonWingBack'); const x0 = e.x; step(w, 1.2);
  assert.ok(e.x < x0 - 1, 'it hopped back'); assert.ok(by(w, 'dragonWingBack') >= 1); assert.equal(w.pushes, 1);
});

test('ember rain and the great flame', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = dragon(w, 'dragonRain'); until(w, e, 'dragonRain'); let most = 0; step(w, 5, () => { most = Math.max(most, w.fx.filter((f) => f.kind === 'dragonMeteor').length); });
  assert.ok(most >= 8, `fireballs in the air (${most})`); assert.ok(by(w, 'dragonMeteor') >= 1);
  const b = world({ player: { x: 20, y: 12 } }), e2 = dragon(b, 'dragonBlast'); until(b, e2, 'dragonBlast'); let shots = 0; const seen = new Set(); step(b, 4.5, () => { for (const f of b.fx) if (f.kind === 'dragonComet' && !seen.has(f)) { seen.add(f); shots++; } });
  assert.equal(shots, DRAGON.blast.shots); assert.ok(by(b, 'dragonBlast') >= 1);
});

test('claw whirl (sometimes with arcs of fire), tail whirl, tail lash and the rolling crush', () => {
  const w = world({ player: { x: 14, y: 12 } }), e = dragon(w, 'dragonClawSpin'); let beams = false;
  for (let i = 0; i < 4 && !beams; i++) { until(w, e, 'dragonClawSpin', 12); step(w, 1.6, () => { beams ||= w.fx.some((f) => f.kind === 'clawBeam'); }); }
  assert.ok(by(w, 'dragonClawSpin') >= 1); assert.ok(beams, 'some whirls throw claw arcs');
  for (const [id, src] of [['dragonTailSpin', 'dragonTailSpin'], ['dragonTailSwipe', 'dragonTailSwipe'], ['dragonRoll', 'dragonRoll']]) { const q = world({ player: { x: 14.5, y: 12 } }), d = dragon(q, id); until(q, d, id); step(q, 2.2); assert.ok(by(q, src) >= 1, id); }
});

test('flame wave: a ring or a wedge rolls out and the ground it crossed keeps burning', () => {
  let ring = 0, wedge = 0;
  for (let seed = 0; seed < 8; seed++) { const w = world({ player: { x: 16, y: 12 } }), e = dragon(w, 'dragonFlameWave'); e.id = `d${seed}`; until(w, e, 'dragonFlameWave'); step(w, ATTACK_MODULES.dragonFlameWave.windup * 1.3);
    const f = w.fx.find((q) => q.kind === 'dragonScorch'); assert.ok(f); if (f.arc >= 360) ring++; else wedge++; step(w, 1); assert.ok(by(w, 'dragonFlameWave') === 1, 'the wave strikes once'); step(w, 2); assert.ok(by(w, 'dragonScorch') >= 1, 'then the scorch burns'); }
  assert.ok(ring && wedge, `both shapes (${ring} rings, ${wedge} wedges)`);
});

test('claim the ground: only its clock starts it, nothing interrupts it, and when it breaks the ground is claimed', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = dragon(w, null); step(w, 6, () => { assert.notEqual(e.pack.attack, 'dragonColonize'); });
  w.due = true; for (let t = 0; t < 6 && e.pack.attack !== 'dragonColonize'; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, 'dragonColonize', 'it starts as soon as it is free'); assert.ok(w.fx.some((f) => f.kind === 'colonize'), 'the ground to be claimed glows');
  e.poiseBreak = 0; for (let i = 0; i < 40; i++) { e.hitStun = .3; step(w, .15); } assert.equal(w.casts, 1, 'blows and stun do not stop it');
});

test('the Sunfall: in its reach it kills through a dodge; out of reach you live', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = dragon(w, 'dragonSupernova'); e.hp = e.maxHp * .5; until(w, e, 'dragonSupernova'); step(w, 5);
  const hit = w.hurts.find((h) => h.source === 'dragonSupernova'); assert.ok(hit && hit.piercing && hit.amount >= 200 * DRAGON.nova.lethal);
  const far = world({ player: { x: 31, y: 31 } }), e2 = dragon(far, 'dragonSupernova', 4, 4); e2.hp = e2.maxHp * .5; until(far, e2, 'dragonSupernova'); step(far, 5); assert.equal(by(far, 'dragonSupernova'), 0);
  const whole = world(), e3 = dragon(whole, 'dragonSupernova'); let started = false; step(whole, 4, () => { started ||= e3.pack.attack === 'dragonSupernova'; }); assert.equal(started, false, 'not while it is whole');
});

test('lava: casts claim a quarter of the open floor each, never the border, never raised ground; kept in the save and applied on every load', () => {
  const s = freshSave(); s.seed = 'LAVA'; ensureWorldBeasts(s);
  const map = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'grass', blocked: false, elev: (i % 32 === 16 && Math.floor(i / 32) === 16) ? 2 : 0 })) };
  const total = castTiles(map, s.seed, 5, 5, 1).length + castTiles(map, s.seed, 5, 5, 2).length + castTiles(map, s.seed, 5, 5, 3).length + castTiles(map, s.seed, 5, 5, 4).length;
  for (let k = 0; k < 4; k++) dragonCast(s, map, s.seed, 5, 5);
  const lava = map.tiles.filter((t) => t.kind === 'lava'); assert.equal(lava.length, total);
  assert.ok(lava.every((t) => t.x >= DRAGON.colonize.border && t.y >= DRAGON.colonize.border && t.x < 32 - DRAGON.colonize.border && t.y < 32 - DRAGON.colonize.border)); assert.equal(map.tiles[16 * 32 + 16].kind, 'grass', 'raised ground stays');
  assert.equal(dragonCast(s, map, s.seed, 5, 5).length, 0, 'four casts and it is done');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); ensureDragonLava(back); assert.equal(dragonRecord(back, 5, 5).casts, 4);
  const fresh = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'grass', blocked: false })) }; applyDragonLava(back, fresh, 5, 5); assert.equal(fresh.tiles.filter((t) => t.kind === 'lava').length, total, 'lava forever');
});

test('in the game: the clock runs while you are away; fall on its claimed ground and it is done with you', () => {
  const s = freshSave(); s.seed = 'LAVA-GAME'; ensureWorldBeasts(s); s.playSeconds = 1000;
  const g = new Game(s, 0); g.rx = 9; g.ry = 3; s.worldBeasts.crimsonTyrant.active = { rx: 9, ry: 3, tries: 0 };
  dragonRecord(s, 9, 3).nextAt = 1000 - DRAGON.colonize.every * 2.5; g.loadArea('overworld');
  assert.equal(dragonRecord(s, 9, 3).casts, 3, 'three casts were due while away'); assert.ok(g.map.tiles.some((t) => t.kind === 'lava' && t.dragonLava));
  dragonRecord(s, 9, 3).nextAt = 0; assert.ok(g.dragonDue()); g.dragonLavaNow(); assert.equal(dragonRecord(s, 9, 3).casts, 4);
  g.player.hp = 0; g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }, 5000);
  assert.equal(s.worldBeasts.crimsonTyrant.active, null, 'it leaves for good'); assert.ok(s.worldBeasts.crimsonTyrant.cooldown > 0);
});

test('a full fight: every chosen move appears, effects stay bounded, and it draws without throwing', () => {
  const w = world({ player: { x: 18, y: 14 } }), e = dragon(w, null, 12, 12), seen = new Set(); let most = 0; e.hp = e.maxHp * .5;
  step(w, 260, () => { if (e.pack?.attack) seen.add(e.pack.attack); most = Math.max(most, w.fx.length); w.player.x = 16 + Math.sin(w.now / 6000) * 4; w.player.y = 14 + Math.cos(w.now / 8000) * 3; }); // a Wayfarer moving at walking pace
  for (const id of MONSTER_PACK.crimsonTyrant.attacks.filter((a) => a !== 'dragonColonize')) assert.ok(seen.has(id), `${id} (seen: ${[...seen].join(',')})`); assert.ok(most <= 48);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => { calls.push(k); }, set: () => true });
  for (const pose of [null, 'rise', 'fly', 'rear', 'rearBoth', 'slam', 'crouch', 'hop', 'wingLash', 'headUp', 'charge', 'breath', 'colonize', 'roar', 'spin', 'tailSpin', 'tailL', 'tailR', 'roll', 'nova']) { e.dragonPose = pose; e.dragonCharge = .6; e.dragonSpin = pose === 'spin' ? 2 : 0; e.dragonAir = pose === 'fly' ? 1 : 0; drawPackMonster(ctx, e, 32, 1000, 'down'); }
  const fx = [{ kind: 'fireLine', x: 1, y: 1, dx: 1, dy: 0, steps: 4, step: .9, every: .07, warn: .35, radius: .6, life: 1, age: .5, damage: 3, length: 3 }, { kind: 'dragonMeteor', x: 2, y: 2, radius: 1, arming: .4, armTotal: 1, life: .4, damage: 3 }, { kind: 'dragonMeteor', x: 3, y: 2, radius: 1, arming: 0, life: .2, damage: 3 }, { kind: 'dragonComet', x: 4, y: 4, vx: 1, vy: 0, to: { x: 8, y: 4 }, radius: .7, blast: 2, life: 1, damage: 3 }, { kind: 'dragonBurst', x: 5, y: 5, radius: 2, life: .3, total: .5 }, { kind: 'dragonScorch', x: 8, y: 8, angle: 0, arc: 120, reach: 7, front: 4, life: 2, total: 3, damage: 3 }, { kind: 'dragonScorch', x: 8, y: 8, angle: 0, arc: 360, reach: 7, front: 7, life: 2, total: 3, damage: 3 }, { kind: 'colonize', x: 0, y: 0, tiles: [100, 200, 300], life: 3, total: 5, age: 2 }, { kind: 'dragonNova', x: 10, y: 10, radius: 11, life: .5, total: .9 }, { kind: 'clawBeam', x: 6, y: 6, vx: 1, vy: 1, life: 1, damage: 3 }];
  for (const f of fx) assert.ok(DRAGON_EFFECT_KINDS.has(f.kind), f.kind); drawPackEffects(ctx, fx, 32, 1000); assert.ok(calls.length > 300);
});
