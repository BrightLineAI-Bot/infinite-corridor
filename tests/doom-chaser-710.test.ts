// Release 710 (Tim, 2026-11-03): the second dragon, the Doom Chaser: black fire, black flame pools under its spells, and a frenzy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BEASTS, BEAST_APERTURE, PLACEMENT, ensureWorldBeasts } from '../src/world-beasts.ts';
import { MONSTER_PACK, ATTACK_MODULES, DOOM, FRENZY, BOSS_POISE, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { ECHOES } from '../src/echoes.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackEffects } from '../src/monster-render.ts';
import { DOOM_EFFECT_KINDS } from '../src/doom-chaser-render.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

function world({ size = 32, player = { x: 16, y: 12 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], pushes: 0, slows: 0, frenzies: 0, playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source, jumpable: !!opts.jumpable }); w.player.hp -= amount; return true; },
    slow() { w.slows++; }, push() { w.pushes++; return true; }, pull() {}, poison() {}, stun() {}, ignite() {}, frenzy(n) { w.frenzies += n; }, playerMaxHp: () => 200,
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function chaser(w, only, x = 12, y = 12) {
  const e = createCombatant('doomChaser', x, y, true, []); Object.assign(e, { id: 'doom-1', aggro: true, hp: 9000, maxHp: 9000, damage: 40 });
  if (only) e.packAttacks = [only]; w.enemies.push(e); return e;
}
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(); } }
function until(w, e, id, max = 8) { for (let t = 0; t < max && e.pack.attack !== id; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, id, `${id} starts`); }
const by = (w, source) => w.hurts.filter((h) => h.source === source).length;
const seenKinds = (w, kind, run) => { const seen = new Set(); run(() => { for (const f of w.fx) if (f.kind === kind) seen.add(f); }); return seen.size; };

test('registry: a huge black dragon world boss, twelve moves, its own poise, Echo and Aperture tier; it goes home to the canyons', () => {
  const B = WORLD_BEASTS.doomChaser, def = MONSTER_PACK.doomChaser;
  assert.equal(B.home, 'canyon'); assert.equal(B.tries, 4); assert.equal(def.attacks.length, 13); /* release 919: Skyfall (dragonDive), shared with the Crimson Tyrant (Tim, 2026-11-12) */ for (const id of def.attacks) assert.ok(ATTACK_MODULES[id], id);
  assert.ok(ECHOES.doomChaser); assert.ok(BOSS_POISE.doomChaser); assert.equal(BEAST_APERTURE.doomChaser, 8); assert.ok(PLACEMENT.bigBeasts.includes('doomChaser'));
  assert.equal(Object.keys(WORLD_BEASTS).at(-2), 'doomChaser', 'listed last but for the Wild Stegosaurus (2026-11-12), so no older beast loses a claim');
  const s = freshSave(); ensureWorldBeasts(s, false); assert.ok(s.worldBeasts.doomChaser); assert.ok(migrateSave(JSON.parse(JSON.stringify(s))).worldBeasts.doomChaser);
});

test('ruin beam: a sweeping beam, and black fire erupts behind it along the line', () => {
  const w = world({ player: { x: 19, y: 12 } }), e = chaser(w, 'doomBeam'); until(w, e, 'doomBeam'); const n = seenKinds(w, 'doomErupt', (f) => step(w, 4, f));
  assert.ok(by(w, 'doomBeam') >= 1, 'the beam burns'); assert.ok(n >= 10, `eruptions (${n})`); assert.ok(w.hurts.length > by(w, 'doomBeam') || n >= 10); assert.equal(e.doomRays, null, 'the beam ends');
});

test('dark tide: aloft and out of reach, it throws waves of darkness that can be jumped', () => {
  const w = world({ player: { x: 20, y: 12 } }), e = chaser(w, 'doomWaves'); until(w, e, 'doomWaves'); step(w, .1); assert.equal(e.untargetable, true);
  const n = seenKinds(w, 'doomWave', (f) => step(w, 3.5, f)); assert.equal(n, DOOM.waves.count); assert.ok(by(w, 'doomWaves') >= 1); assert.ok(w.hurts.find((h) => h.source === 'doomWaves').jumpable); assert.equal(e.untargetable, false);
});

test('black breath: a sweeping cone that burns, and pools of black fire where it fell', () => {
  const w = world({ player: { x: 15, y: 12 } }), e = chaser(w, 'doomBreath'); until(w, e, 'doomBreath'); step(w, 2.5);
  assert.ok(by(w, 'doomBreath') >= 2); assert.equal(w.fx.filter((f) => f.kind === 'darkPool').length, DOOM.breath.pools);
});

test('wing walk: it walks at you on its wings, slamming left and right; each slam bursts and leaves a pool', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = chaser(w, 'doomWingSlam'); until(w, e, 'doomWingSlam'); const x0 = e.x; const n = seenKinds(w, 'doomErupt', (f) => step(w, 3, f));
  assert.equal(n, DOOM.wing.slams); assert.ok(e.x > x0, 'it walked forward'); assert.ok(w.fx.some((f) => f.kind === 'darkPool'));
});

test('doom pounce and falling dark: it comes down on you, and the dark bursts out round it', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = chaser(w, 'doomPounce'); until(w, e, 'doomPounce'); step(w, 2);
  assert.ok(e.x > 15, 'it sprang at you'); assert.ok(by(w, 'doomPounce') >= 1); assert.ok(w.fx.some((f) => f.kind === 'darkPool'));
  const b = world({ player: { x: 22, y: 12 } }), e2 = chaser(b, 'doomFall'); until(b, e2, 'doomFall'); step(b, 1.2); assert.equal(e2.untargetable, true, 'out of sight above');
  b.player.x = 24; b.player.y = 16; const bursts = seenKinds(b, 'doomErupt', (f) => step(b, 3, f)); assert.ok(Math.hypot(e2.x - 24, e2.y - 16) < 1.5, 'its shadow hunted you'); assert.ok(by(b, 'doomFall') >= 1); assert.equal(e2.untargetable, false); assert.equal(bursts, DOOM.fall.ring);
});

test('shed scales and tar: scales scatter and burst; tar slows, then catches and burns', () => {
  const w = world({ player: { x: 16, y: 12 } }), e = chaser(w, 'doomScales'); until(w, e, 'doomScales'); step(w, 1.2);
  assert.equal(w.fx.filter((f) => f.kind === 'doomScale').length, DOOM.scales.count); step(w, 2); assert.ok(by(w, 'doomScale') >= 1, 'one lay at your feet');
  const b = world({ player: { x: 18, y: 12 } }), e2 = chaser(b, 'doomTar'); until(b, e2, 'doomTar'); step(b, 2.5);
  assert.ok(b.slows > 0, 'the tar slows you'); assert.equal(by(b, 'doomTarFire'), 0, 'not burning yet'); step(b, 3); assert.ok(by(b, 'doomTarFire') >= 1, 'then it burns');
});

test('tail and jaws, hunting dark and the roar', () => {
  const w = world({ player: { x: 14.5, y: 12 } }), e = chaser(w, 'doomJaws'); until(w, e, 'doomJaws'); step(w, 2.4);
  assert.equal(by(w, 'doomJaws'), DOOM.jaws.bites); assert.equal(by(w, 'doomTail'), 1);
  const b = world({ player: { x: 22, y: 12 } }), e2 = chaser(b, 'doomOrbs'); until(b, e2, 'doomOrbs'); const n = seenKinds(b, 'doomOrb', (f) => step(b, 6, f)); assert.equal(n, DOOM.orbs.count); assert.ok(by(b, 'doomOrbs') >= 1);
  const c = world({ player: { x: 15, y: 12 } }), e3 = chaser(c, 'doomRoar'); until(c, e3, 'doomRoar'); step(c, 1.5); assert.equal(c.pushes, 1); assert.equal(c.frenzies, DOOM.roar.frenzy);
});

test('eclipse: only once it is hurt; it hangs in the air and beams turn round it, the ground erupting along them', () => {
  const w = world({ player: { x: 16, y: 12 } }), e = chaser(w, null); e.packAttacks = ['doomEclipse', 'doomRoar']; const seen = new Set(); step(w, 20, () => seen.add(e.pack?.attack)); assert.ok(!seen.has('doomEclipse'), 'not while whole');
  const b = world({ player: { x: 16, y: 12 } }), e2 = chaser(b, 'doomEclipse'); e2.hp = e2.maxHp * .5; until(b, e2, 'doomEclipse', 30); step(b, 6, () => { b.player.x = 12 + Math.cos(b.now / 900) * 4; b.player.y = 12 + Math.sin(b.now / 900) * 4; });
  assert.ok(by(b, 'doomEclipse') >= 1); assert.ok(b.hurts.some((h) => h.source === 'doomErupt')); assert.equal(e2.aloft, false);
});

test('a full fight: every move appears, effects stay bounded, and it draws without throwing', () => {
  const w = world({ player: { x: 18, y: 14 } }), e = chaser(w, null, 12, 12), seen = new Set(); let most = 0; e.hp = e.maxHp * .5;
  step(w, 260, () => { if (e.pack?.attack) seen.add(e.pack.attack); most = Math.max(most, w.fx.length); w.player.x = 16 + Math.sin(w.now / 6000) * 4; w.player.y = 14 + Math.cos(w.now / 8000) * 3; });
  for (const id of MONSTER_PACK.doomChaser.attacks) assert.ok(seen.has(id), `${id} (seen: ${[...seen].join(',')})`); assert.ok(most <= 48);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'getTransform' ? undefined : () => { calls.push(k); }, set: () => true });
  e.pack = { attack: 'doomBeam', phase: 'active' }; e.doomRays = [{ angle: .3, length: 8 }]; e.doomBreath = { angle: 0, reach: 6, arc: 50 };
  for (const pose of [null, 'rise', 'fly', 'wingWalk', 'wingL', 'wingR', 'bite', 'eclipse', 'roar', 'breath', 'charge', 'hop', 'slamBoth', 'tailR', 'headUp']) { e.dragonPose = pose; e.dragonAir = pose === 'fly' ? 2 : 0; drawPackMonster(ctx, e, 32, 1000, 'down'); }
  e.pack.attack = 'doomBreath'; drawPackMonster(ctx, e, 32, 1000, 'down');
  const fx = [{ kind: 'doomErupt', x: 1, y: 1, radius: .9, arming: .3, armTotal: .7, life: .5, damage: 3 }, { kind: 'doomErupt', x: 2, y: 1, radius: .9, arming: 0, life: .3, damage: 3 }, { kind: 'doomScale', x: 3, y: 3, from: { x: 1, y: 1 }, radius: 1, arming: .5, armTotal: 1.5, life: .4, damage: 3 },
    { kind: 'darkPool', x: 4, y: 4, radius: 1.1, life: 3, age: 1, damage: 2 }, { kind: 'doomWave', x: 5, y: 5, vx: 8, vy: 1, radius: .45, half: 1.7, length: 1.7, life: 1, damage: 3 },
    { kind: 'doomTar', x: 6, y: 6, from: { x: 2, y: 2 }, radius: 1.3, arming: .3, armTotal: .7, life: 5, damage: 2 }, { kind: 'doomTar', x: 7, y: 6, radius: 1.3, arming: 0, lit: true, life: 2, damage: 2 },
    { kind: 'doomOrb', x: 8, y: 8, vx: 2, vy: 1, radius: .35, life: 3, damage: 3 }, { kind: 'doomBurst', x: 9, y: 9, radius: 2, life: .3, total: .5, damage: 0 }, { kind: 'doomBurst', x: 9, y: 9, radius: 6, life: .3, total: .7, damage: 0, ring: true }];
  for (const f of fx) assert.ok(DOOM_EFFECT_KINDS.has(f.kind), f.kind); drawPackEffects(ctx, fx, 32, 1000); assert.ok(calls.length > 300);
});

test('in the game, the frenzy: its hits build it; then you take more, and either your blows throw it off or it bursts', () => {
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
  const setup = () => { const s = freshSave(); s.seed = 'FRENZY'; const g = new Game(s, 0); const p = g.player; p.hp = p.maxHp = s.maxHp = 400;
    const d = createCombatant('doomChaser', p.x + 4, p.y, true, []); Object.assign(d, { id: 'doom', hp: 5000, maxHp: 5000, aggro: true }); g.enemies = [d]; return { s, g, p, d }; };
  { const { g, p, d } = setup(); let t = 1000;
    for (let i = 0; i < FRENZY.build - 1; i++) { g.packHurt(d, 10, { source: 'doomJaws' }, t); t += 1000; } assert.equal(!!g.frenzy?.active, false, 'not yet');
    const before = p.hp; g.packHurt(d, 10, { source: 'doomJaws' }, t); t += 1000; assert.equal(g.frenzy.active, true, 'it takes hold');
    const mid = p.hp; g.packHurt({ id: 'x', x: p.x + 2, y: p.y, kind: 'ashenMoth' }, 100, { source: 'test' }, t); t += 1000; const withFrenzy = mid - p.hp; assert.ok(before > mid);
    const { g: g2, p: p2 } = setup(); const m2 = p2.hp; g2.packHurt({ id: 'x', x: p2.x + 2, y: p2.y, kind: 'ashenMoth' }, 100, { source: 'test' }, 1000); assert.ok(withFrenzy > m2 - p2.hp, 'it takes more out of you');
    g.frenzyTick(.1); for (let i = 0; i < FRENZY.cure; i++) { d.hp -= 20; g.frenzyBlow(d); g.frenzyTick(.1); } g.frenzyTick(.1); assert.equal(g.frenzy, null, 'thrown off'); }
  { const { g, p, d } = setup(); g.frenzyHit(1000, FRENZY.build); assert.equal(g.frenzy.active, true); const before = p.hp;
    for (let t = 0; t <= FRENZY.time + .5; t += .5) g.frenzyTick(.5); assert.equal(g.frenzy, null); assert.ok(before - p.hp >= Math.floor(400 * FRENZY.burst * .25), 'it burst'); void d; }
  { const { g } = setup(); g.frenzyHit(1000, 1); g.enemies = []; g.frenzyTick(.1); assert.equal(g.frenzy, null, 'gone with the Doom Chaser'); g.update(1 / 60, idle, 2000); }
});
