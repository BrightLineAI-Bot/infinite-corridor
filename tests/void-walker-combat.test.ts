import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_PACK, ATTACK_MODULES, VOID, PACK_EFFECT_CAP, packVariant, validateMonster, freshPackState, resetPackRuntime, updatePackMonster, tickPackEffects, addPackEffect, isDungeonHunter, isDungeonRoamer } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { ECHOES, VOID_ECHO, echoEvent, tickEchoes, ensureEchoState } from '../src/echoes.ts';
import { freshSave } from '../src/types.ts';

function world({ size = 80, player = { x: 40, y: 40 }, blocked = () => false, dt = 1 / 60 } = {}) {
  const w = {
    dt, now: 0, width: size, height: size, area: 'dungeon', player: { ...player, hp: 100000 }, enemies: [], fx: [], hurts: [], emitted: [], teleports: [], consumed: [], pulls: [],
    open: (x, y) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= size - 1 && y <= size - 1 && !blocked(x, y),
    tileOpen(x, y) { return w.open(x - .5, y - .5); },
    projectileOpen(x, y) { return w.tileOpen(x, y); },
    los(a, b) { const n = Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / .1); for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; if (!w.open(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k)) return false; } return true; },
    move(e, dx, dy) { if (!w.open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    safeTeleport(e, x, y) { if (!w.open(x, y)) return false; w.teleports.push({ x, y, now: w.now }); e.x = x; e.y = y; return true; },
    consumeVoidTerrain(e, at, radius) { w.consumed.push({ id: e.id, ...at, radius }); return { ok: true }; },
    hurt(owner, amount, options) { w.hurts.push({ owner: owner?.id, amount, ...options }); return true; },
    pull(source, step, radius) { w.pulls.push({ x: source.x, y: source.y, step, radius }); },
    slow() {}, effects: () => w.fx,
    addEffect(f) { w.emitted.push({ ...f, at: w.now }); addPackEffect(w.fx, f, w.now); },
  };
  return w;
}
function actor(w, { id = 'void-test', x = 36, y = 40, boss = true } = {}) {
  const e = createCombatant('voidWalker', x, y, boss, []);
  Object.assign(e, { id, worldBeast: 'voidWalker', aggro: true, attackGap: .2, damage: 20, hp: 5000, maxHp: 5000 });
  w.enemies.push(e); return e;
}
function force(e, id, seq = 0) { e.packAttacks = [id]; e.packBossAttacks = []; e.pack = freshPackState(); e.pack.gap = 0; e.pack.seq = seq; }
function frame(w, ai = true) { w.now += w.dt * 1000; if (ai) for (const e of w.enemies) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); }
function step(w, seconds, each = () => {}, ai = true) { for (let i = 0; i < Math.ceil(seconds / w.dt - 1e-8); i++) { frame(w, ai); each(); } }
function until(w, check, seconds = 5) { for (let i = 0; i < Math.ceil(seconds / w.dt) && !check(); i++) frame(w); assert.ok(check(), `not reached in ${seconds}s`); }
function cast(id, options = {}, seq = 0) { const w = world(options), e = actor(w); force(e, id, seq); frame(w); e.packAttacks = []; return { w, e }; }
function add(w, e, f) { w.addEffect({ owner: e.id, arming: 0, life: 1, damage: 10, ...f }); return w.fx.at(-1); }

test('Void Walker is a unique player-scale ground walker with only its complete bespoke kit, even as a boss', () => {
  const def = MONSTER_PACK.voidWalker;
  assert.deepEqual(validateMonster(def), []); assert.equal(def.unique, true); assert.equal(def.movement, 'walk');
  assert.equal(def.attacks.length, 10); assert.ok(def.attacks.every((id) => id.startsWith('void') && ATTACK_MODULES[id].windup >= .25));
  for (const boss of [false, true]) { const e = createCombatant('voidWalker', 1, 1, boss, []); assert.equal(e.scale, 1); assert.equal(e.bodyRadius, .38); assert.equal(e.flying, false); assert.equal(e.phases, false); }
  for (let i = 0; i < 100; i++) assert.deepEqual(packVariant('voidWalker', `identity-${i}`), { hybridAttack: null, donor: null });
  assert.equal(isDungeonHunter({ worldBeast: 'voidWalker' }, 'dungeon'), true);
  assert.equal(isDungeonRoamer({ worldBeast: 'voidWalker' }, 'dungeon'), false);
});

test('hands, claws, swords, moving slashes and ground spikes all originate from warned rends', () => {
  for (const [id, variant] of [['voidHand', 'hand'], ['voidClaw', 'claw'], ['voidSword', 'sword'], ['voidSlash', 'slash'], ['voidSpikes', 'spike']]) {
    const { w, e } = cast(id);
    assert.ok(w.fx.length >= 2, id); assert.ok(w.fx.every((f) => f.kind === 'voidRend' && f.variant === variant && f.arming > .4), id);
    assert.equal(w.hurts.length, 0, 'warnings never deal immediate damage');
    step(w, 2); assert.ok(w.hurts.some((h) => h.source === id), `${id} can hit its committed mark`);
    assert.equal(e.pack.attack, null, `${id} exits recovery`);
  }
});

test('moving away from a marked hand slam avoids it', () => {
  const { w } = cast('voidHand'); w.player.x += 10;
  step(w, 2); assert.equal(w.hurts.length, 0);
});

test('wraiths travel a fixed straight vector, slash only three times and expire without creating actors', () => {
  const { w } = cast('voidWraiths');
  const wr = w.fx.filter((f) => f.kind === 'voidWraith'); assert.equal(wr.length, 2);
  const first = wr[0], velocity = { x: first.vx, y: first.vy }, start = { x: first.x, y: first.y };
  w.player.x = 60; w.player.y = 5;
  step(w, 1.95, () => { assert.equal(first.vx, velocity.x); assert.equal(first.vy, velocity.y); });
  assert.equal(first.slashes, 3); assert.ok(Math.abs((first.x - start.x) * velocity.y - (first.y - start.y) * velocity.x) < 1e-6);
  step(w, .5); assert.equal(w.fx.filter((f) => f.kind === 'voidWraith').length, 0); assert.equal(w.enemies.length, 1);
});

test('persistent rifts emit bounded attacks and provide an explicitly warned safe evasion destination', () => {
  const { w, e } = cast('voidRifts'); step(w, .8);
  const rifts = w.fx.filter((f) => f.kind === 'voidRift'); assert.equal(rifts.length, 3);
  w.playerSwinging = true; w.player.x = e.x + .5; w.player.y = e.y;
  until(w, () => !!e.pack.voidEvade, 2); assert.equal(w.teleports.length, 0);
  step(w, .3); assert.ok(w.teleports.length > 0); assert.ok(w.open(e.x, e.y));
  w.playerSwinging = false; step(w, 7.2);
  assert.ok(rifts.every((f) => f.emits === 2)); assert.equal(w.fx.length, 0);
});

test('tracking constellations vary from three to six rifts, follow the player, and mix concurrent single-use outputs', () => {
  const counts = new Set();
  for (let seq = 0; seq < 20; seq++) {
    const { w } = cast('voidConstellation', {}, seq); step(w, .6);
    const rifts = w.fx.filter((f) => f.kind === 'voidRift'); counts.add(rifts.length);
    assert.ok(rifts.length >= 3 && rifts.length <= 6);
    const before = rifts.map((f) => ({ x: f.x, y: f.y })); w.player.x += 1; frame(w);
    rifts.forEach((f, i) => assert.ok(Math.abs(f.x - before[i].x - 1) < .001));
    step(w, 3);
    assert.ok(rifts.every((f) => f.activated));
    assert.equal(w.teleports.length, rifts.filter((f) => f.output === 'walker').length);
    assert.equal(w.emitted.filter((f) => f.kind === 'voidWraith').length, rifts.filter((f) => f.output === 'wraith').length);
    assert.equal(w.emitted.filter((f) => f.kind === 'voidBeam').length, rifts.filter((f) => f.output === 'beam').length);
    const wraith = w.emitted.find((f) => f.kind === 'voidWraith'), beam = w.emitted.find((f) => f.kind === 'voidBeam');
    assert.ok(Math.abs(wraith.at - beam.at) < 20, 'different outputs can activate in the same frame');
    const outputs = w.emitted.length; step(w, 3); assert.equal(w.emitted.length, outputs);
  }
  assert.deepEqual([...counts].sort(), [3, 4, 5, 6]);
});

test('failed constellation teleports do not move into unsafe geometry or re-activate endlessly', () => {
  const { w, e } = cast('voidConstellation'); step(w, .6);
  const initial = { x: e.x, y: e.y }, rifts = w.fx.filter((f) => f.kind === 'voidRift'); w.safeTeleport = () => false; w.move = () => false;
  step(w, 4); assert.equal(e.x, initial.x); assert.equal(e.y, initial.y); assert.ok(rifts.every((f) => f.activated)); assert.equal(e.pack.attack, null);
});

test('event horizons include non-pulsar cores, pull and hurt, with exactly two or three fixed-direction pulses', () => {
  const counts = new Set();
  for (let seq = 0; seq < 12; seq++) {
    const { w } = cast('voidHorizons', {}, seq); step(w, .6);
    const horizons = w.fx.filter((f) => f.kind === 'voidHorizon'); assert.equal(horizons.length, 2); assert.equal(horizons.filter((f) => f.pulsar).length, 1);
    const pulsar = horizons.find((f) => f.pulsar), direction = pulsar.angle; w.player.x = pulsar.x; w.player.y = pulsar.y;
    step(w, 5.5);
    assert.ok(w.pulls.length > 0); assert.ok(w.hurts.some((h) => h.source === 'voidHorizon'));
    const beams = w.emitted.filter((f) => f.kind === 'voidBeam'); counts.add(beams.length); assert.equal(beams.length, pulsar.pulseCount); assert.ok(beams.every((f) => f.angle === direction));
    assert.equal(w.fx.length, 0);
  }
  assert.deepEqual([...counts].sort(), [2, 3]);
});

test('Supernova consumes terrain once only after windup, then charges, pulls, emits radial waves and aftermath eruptions', () => {
  const { w, e } = cast('voidSupernova'); assert.equal(w.consumed.length, 0);
  step(w, .8); assert.equal(w.consumed.length, 0);
  until(w, () => w.consumed.length === 1, 1); const nova = w.fx.find((f) => f.kind === 'voidNova'); assert.ok(nova); assert.equal(nova.stage, 'charge');
  e.packAttacks = []; let sawAftermath = false; step(w, 9, () => { if (nova.stage === 'aftermath') sawAftermath = true; });
  assert.equal(w.consumed.length, 1); assert.equal(w.consumed[0].radius, VOID.novaRadius); assert.ok(w.pulls.length);
  const waves = w.emitted.filter((f) => f.kind === 'voidParticle'); assert.equal(new Set(waves.map((f) => f.wave)).size, nova.waves);
  assert.ok(nova.waves === 2 || nova.waves === 3); assert.ok(sawAftermath);
  assert.ok(w.emitted.some((f) => f.kind === 'voidEruption' && f.at > 5000), 'eruptions continue after radial burst');
  assert.equal(e.pack.attack, null); assert.equal(e.voidDashing, false); assert.equal(e.voidCharging, false);
  step(w, 2); assert.equal(w.fx.length, 0);
});

test('Supernova dashes lock each sampled position, remain straight and keep chasing outside the fixed void region', () => {
  const { w, e } = cast('voidSupernova'); until(w, () => e.pack.data?.dash?.stage === 'warn', 2);
  const nova = w.fx.find((f) => f.kind === 'voidNova'), firstDash = e.pack.data.dash, direction = { ...firstDash.dir }, start = { x: e.x, y: e.y };
  w.player.x = 65; w.player.y = 65;
  until(w, () => firstDash.stage === 'rest', 2);
  assert.deepEqual(firstDash.dir, direction); assert.ok(Math.abs((e.x - start.x) * direction.y - (e.y - start.y) * direction.x) < 1e-6);
  until(w, () => w.teleports.length >= 2, 2);
  const next = w.teleports.at(-1); assert.ok(Math.hypot(next.x - 65, next.y - 65) <= VOID.dashRing + 1.1);
  assert.ok(Math.hypot(next.x - nova.x, next.y - nova.y) > nova.radius);
  step(w, 8); assert.equal(w.teleports.length, VOID.dashCount);
});

test('dash afterimages deal contact damage once and live exactly one simulation second', () => {
  const w = world({ player: { x: 40, y: 40 }, dt: .1 }), e = actor(w);
  const f = add(w, e, { kind: 'voidAfterimage', x: 38, y: 40, tx: 42, ty: 40, radius: VOID.trailRadius, life: VOID.trailLife, total: VOID.trailLife });
  step(w, .9, () => {}, false); assert.equal(w.hurts.filter((h) => h.source === 'voidAfterimage').length, 1); assert.ok(w.fx.includes(f));
  step(w, .2, () => {}, false); assert.ok(!w.fx.includes(f));
});

test('particles and travelling slashes test swept wall contact even on a large frame', () => {
  for (const kind of ['voidParticle', 'voidRend']) {
    const w = world({ player: { x: 44, y: 40 }, blocked: (x) => x >= 41 && x <= 42, dt: .6 }), e = actor(w);
    const f = add(w, e, { kind, variant: 'slash', x: 40, y: 40, vx: 10, vy: 0, radius: .35, life: 2 });
    frame(w, false); assert.ok(f.x < 41); assert.equal(w.hurts.length, 0); assert.ok(!w.fx.includes(f));
  }
});

test('surviving walls block beams and straight dashes do not slide around them', () => {
  const w = world({ player: { x: 45, y: 40 }, blocked: (x) => x >= 41 && x <= 42 }), e = actor(w);
  const beam = add(w, e, { kind: 'voidBeam', x: 40, y: 40, angle: 0, length: 10, width: .3 });
  step(w, .5, () => {}, false); assert.equal(w.hurts.length, 0); assert.ok(beam.length <= 1);
  e.x = 40; e.y = 40; e.pack.attack = 'voidSupernova'; e.pack.phase = 'active'; e.pack.t = 2;
  e.pack.data = { dashes: VOID.dashCount, dash: { stage: 'run', left: .4, dir: { x: 1, y: 0 }, trail: { x: 40, y: 40 }, trailT: 0 } };
  step(w, .5); assert.ok(e.x < 41); assert.equal(e.y, 40);
});

test('every Walker effect and pending attack freezes exactly at dt zero', () => {
  const { w, e } = cast('voidSupernova'); step(w, 3.4);
  const state = JSON.stringify({ e, fx: w.fx, hurts: w.hurts, emitted: w.emitted, teleports: w.teleports, consumed: w.consumed });
  w.dt = 0; w.now += 100000;
  for (let i = 0; i < 5; i++) { updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); }
  assert.equal(JSON.stringify({ e, fx: w.fx, hurts: w.hurts, emitted: w.emitted, teleports: w.teleports, consumed: w.consumed }), state);
});

test('death and retreat remove owned warnings, projectiles, persistent rifts and damage, and retreat uses its ground callback', () => {
  for (const terminal of ['dead', 'retreating']) {
    const { w, e } = cast('voidSupernova'); step(w, 3.4); assert.ok(w.fx.length > 0);
    e[terminal] = true; let retreats = 0; if (terminal === 'retreating') { e.fleeTo = { x: 70, y: 70 }; w.walkerRetreat = () => retreats++; }
    const damage = w.hurts.length; frame(w);
    assert.equal(w.fx.length, 0); assert.equal(w.hurts.length, damage); assert.equal(e.pack.attack, null); assert.equal(e.voidDashing, false); assert.equal(e.voidCharging, false);
    if (terminal === 'retreating') assert.equal(retreats, 1);
  }
});

test('effect ticking independently cleans up an absent owner even during arming', () => {
  const w = world(), e = actor(w); add(w, e, { kind: 'voidRend', variant: 'hand', x: 40, y: 40, radius: 1, arming: 1 });
  w.enemies = []; frame(w, false); assert.equal(w.fx.length, 0); assert.equal(w.hurts.length, 0);
});

test('all Walker modules terminate, preserve safe positions and stay within the global effect/actor budget', () => {
  for (const id of MONSTER_PACK.voidWalker.attacks) {
    const { w, e } = cast(id); let peak = 0;
    step(w, 12, () => { peak = Math.max(peak, w.fx.length); assert.ok(w.fx.length <= PACK_EFFECT_CAP, id); assert.ok(w.open(e.x, e.y), id); });
    assert.equal(e.pack.attack, null, id); assert.equal(w.enemies.length, 1, id); assert.equal(w.fx.length, 0, id); assert.ok(peak <= PACK_EFFECT_CAP);
  }
});

test('a saturated shared effect budget does not evict another warning or leave Supernova stuck', () => {
  const w = world(), e = actor(w);
  for (let i = 0; i < PACK_EFFECT_CAP; i++) w.addEffect({ kind: 'web', owner: 'other', x: 0, y: 0, radius: 1, life: 50, arming: 50 });
  const originals = w.fx.map((f) => f.id); force(e, 'voidSupernova'); frame(w); e.packAttacks = [];
  step(w, 3); assert.equal(w.consumed.length, 0); assert.equal(e.pack.attack, null); assert.deepEqual(w.fx.map((f) => f.id), originals);
});

test('unsafe or missing teleport destinations consume a finite dash attempt without trapping the Walker', () => {
  const { w, e } = cast('voidSupernova'); w.safeTeleport = () => false;
  step(w, 11); assert.equal(w.teleports.length, 0); assert.equal(e.pack.attack, null); assert.ok(w.open(e.x, e.y)); assert.equal(e.untargetable, false);
});

test('idle dungeon Walker uses ground patrol, not the Crystal phasing patrol, and runtime reset clears poses', () => {
  const w = world({ player: { x: 70, y: 70 } }), e = actor(w); e.aggro = false;
  let walked = 0, phased = 0; w.walkerPatrol = () => walked++; w.roamMove = () => phased++;
  frame(w); assert.equal(walked, 1); assert.equal(phased, 0);
  e.voidDashing = e.voidCharging = true; e.voidTeleport = 1; resetPackRuntime(e);
  assert.equal(e.voidDashing, false); assert.equal(e.voidCharging, false); assert.equal(e.voidTeleport, 0);
});

test('proposed Rift Upheaval Echo has bounded real behavior and preserves old Echo ownership', () => {
  assert.equal(ECHOES.voidWalker.module, 'voidSpikes');
  const save = freshSave('void-echo'); save.echoes = { owned: { voidWalker: true, psychicCrystal: true }, equipped: ['voidWalker'] }; ensureEchoState(save);
  assert.equal(save.echoes.owned.psychicCrystal, true);
  const calls = [], game = { save, player: { x: 5, y: 5, hp: 100 }, enemies: [{ id: 'foe', x: 7, y: 5 }], glyphWorld: () => ({ blast: (...args) => calls.push(args) }) };
  echoEvent(game, 'dodge', 1000); assert.equal(game.echoPatches.length, 1); assert.equal(game.echoPatches[0].voidEcho, true);
  for (let i = 0; i < 20; i++) echoEvent(game, 'dodge', 1100); assert.equal(game.echoPatches.length, 1);
  tickEchoes(game, 0, 2000, { x: 0, y: 0 }); assert.equal(calls.length, 0);
  tickEchoes(game, .1, 1000 + VOID_ECHO.delay, { x: 0, y: 0 }); assert.equal(calls.length, 1); assert.equal(game.echoPatches.length, 0);
  echoEvent(game, 'dodge', 3000); assert.equal(game.echoPatches.length, 0);
  echoEvent(game, 'dodge', 1000 + VOID_ECHO.cooldown); assert.equal(game.echoPatches.length, 1);
});
