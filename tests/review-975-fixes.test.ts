// Six notes from the pre-publish review of r972 -> r975 (2026-11-15): the dino duel's rockfall falls only on what the Wild
// Stegosaurus may prey on; a beast held in a grab is set down on floor it can stand on; a feint never carries over to a later
// blow; legacy creatures (combat.ts / game.ts updateEnemyAI) strike about as often as before 975 while keeping its ring, tokens
// and wind-ups; a legacy creature notices the Wayfarer only in sight; and the menace drop leaves a stinger's ducking alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_PACK, STEGO, updatePackMonster, tickPackEffects, addPackEffect, stegoPrey } from '../src/monster-pack.ts';
import { tickDinoDuels } from '../src/dino-duel.ts';
import { createCombatant, MELEE_PATTERNS, enemyBodyRadius } from '../src/combat.ts';
import { BEHAVIOUR, squadFrame } from '../src/enemy-behaviour.ts';
import { updateEnemyAI } from '../src/game.ts';
import { createSoundtrack, SOUNDTRACK } from '../src/soundtrack.ts';
import { SONGS } from '../src/soundtrack-songs.ts';
import { flatWorld, spawn, frame } from './enemy-behaviour-harness.ts';

// ------------------------------------------------------------------------------------------------ a headless duel arena
function arena({ size = 40, open = null, indoors = false } = {}) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < size - 1 && y < size - 1, floor = open ? (x, y) => inside(x, y) && open(x, y) : inside;
  const w = {
    player: { x: 2, y: 2, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], creatureHits: [], indoors,
    open: floor, tileOpen: (x, y) => floor(x - .5, y - .5), los: () => true, map: { objects: [] }, oceanAt: () => false, playerVelocity: { x: 0, y: 0 },
    move(e, dx, dy) { if (!floor(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source }); return true; },
    hurtCreature(source, q, amount) { w.creatureHits.push({ id: q.id, amount }); q.hp = Math.max(0, q.hp - amount); return true; },
    bleed() { return true; }, biteMark() {}, shake() {}, say() {}, spinoHold() { return true; }, held() { return false; }, release() {}, carry() {}, throwPlayer() {},
    slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, ignite() {}, dinoSfx() {},
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function duellists(w, at, hp = 1e6) {
  const s = createCombatant('spinoRex', at[0][0], at[0][1], true, []); Object.assign(s, { id: 'spino', aggro: true, hp, maxHp: hp, damage: 40 }); s.packAttacks = [...MONSTER_PACK.spinoRex.attacks];
  const t = createCombatant('wildStego', at[1][0], at[1][1], true, []); Object.assign(t, { id: 'stego', aggro: true, hp, maxHp: hp, damage: 40 }); t.packAttacks = [...MONSTER_PACK.wildStego.attacks];
  w.enemies.push(s, t); return [s, t];
}
function runDuel(w, seconds, each = () => {}) {
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000; tickDinoDuels(w.enemies, w.dt, { clock: 0, width: 40, height: 40 });
    for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w);
    w.fx = tickPackEffects(w.fx, w); each(t);
  }
}

test('1. rockfall falls only on what the Wild Stegosaurus may prey on: never a building guardian, an elite or an astral companion', () => {
  const w = arena({ indoors: true }), at = { x: 20, y: 20 };
  const mk = (id, extra) => { const q = createCombatant('riftLynx', at.x, at.y); Object.assign(q, { id, hp: 500, maxHp: 500, aggro: true, ...extra }); w.enemies.push(q); return q; };
  mk('ordinary'); mk('guardian', { buildingGuardian: true }); mk('elite', { eliteId: 'e1', elite: true }); mk('companion', { astralCompanionOf: 'wayfarer' }); mk('boss', { boss: true });
  w.addEffect({ kind: 'dinoRock', owner: 'nobody', x: at.x, y: at.y, radius: .9, arming: .1, armTotal: .1, life: .4, total: .4, damage: 50 });
  for (let i = 0; i < 20; i++) { w.now += 33; w.fx = tickPackEffects(w.fx, w); }
  assert.deepEqual(w.creatureHits.map((h) => h.id), ['ordinary'], 'only the ordinary creature under it is struck');
  for (const q of w.enemies) assert.equal(w.creatureHits.some((h) => h.id === q.id), stegoPrey(q, null), `${q.id}: the same rule as the stego's prey`);
});

test('2. a held beast is set down on open floor: the stego\'s tail heave and the Spinosaurus\'s belly lift never leave it in rock', () => {
  // The stego heaves the Spinosaurus round at its tail's length; rock lies west of x 15, where its release would fall.
  const w = arena({ open: (x) => x >= 15 }), [s, t] = duellists(w, [[16, 18], [19, 18]]); s.packAttacks = []; t.packAttacks = [];
  let last = null, released = false;
  runDuel(w, 8, () => { if (s.stegoHeldBy) last = { x: s.x, y: s.y, d: Math.hypot(s.x - t.x, s.y - t.y) }; else if (last) released = true; });
  assert.ok(released && last, 'it was heaved and let go'); assert.ok(last.d > STEGO.jaws.held - .1, 'held out at its tail\'s length');
  assert.equal(w.open(last.x, last.y), false, 'the premise: where it hung is rock');
  assert.ok(w.open(s.x, s.y), `set down on open floor (${s.x.toFixed(2)}, ${s.y.toFixed(2)})`);
  // The Spinosaurus lifts the stego ahead of its jaws; rock lies east of x 20.
  const v = arena({ open: (x) => x < 20 }), [a, b] = duellists(v, [[16, 18], [19.5, 18]]); a.packAttacks = ['spinoGrab']; b.packAttacks = []; b.pack.cd.stegoJaws = 99;
  let hung = null, down = false, rockHung = false;
  runDuel(v, 10, () => { if (b.spinoHeldBy) { hung = { x: b.x, y: b.y }; if (!v.open(b.x, b.y)) rockHung = true; } else if (hung && !down) { down = true; assert.ok(v.open(b.x, b.y), `the stego set down on open floor (${b.x.toFixed(2)}, ${b.y.toFixed(2)})`); } });
  assert.ok(down, 'it was lifted and let go'); assert.ok(rockHung, 'the premise: it was held out over rock');
  assert.ok(v.open(b.x, b.y), 'still on open floor');
});

test('3. a feint never carries over: a stale feint does not cancel a later blow, in either brain', () => {
  // The pack brain: a riftLynx (beast family, feints) mid-windup of a blow that took no token (no recorded windup).
  const w = flatWorld(), P = w.player, e = spawn(w, 'riftLynx', P.x + 1.6, P.y, { aggro: true }); w.player.inv = Infinity;
  for (let i = 0; i < 300 && !(e.pack.attack && e.pack.phase === 'windup'); i++) frame(w);
  assert.ok(e.pack.attack && e.pack.phase === 'windup', 'it winds up');
  const seq = e.pack.seq; delete e.pack.data.wind; e.bhv.feintAt = BEHAVIOUR.families.beast.feintAt;
  let feinted = false; for (let i = 0; i < 120 && e.pack.seq === seq && e.pack.attack; i++) { frame(w); if (e.feint > 0) feinted = true; if (e.pack.phase !== 'windup') break; }
  assert.equal(feinted, false, 'no feint breaks it off'); assert.ok(e.pack.attack && e.pack.phase !== 'windup', 'the blow goes on past its windup');
  assert.equal(e.bhv.feintAt, 0, 'and the stale feint is cleared');
  // The legacy brain: a windup that ends in one step (or a two-stage dash's second stage) leaves no feint behind.
  const v = flatWorld(), Q = v.player, h = spawn(v, 'ashenHound', Q.x + 1, Q.y, { aggro: true }); v.player.inv = Infinity;
  for (let i = 0; i < 300 && !(h.telegraph > 0 && h.bhv && !(h.bhv.alert > 0)); i++) frame(v);
  assert.ok(h.telegraph > 0, 'it winds up'); h.bhv.feintAt = .55; h.bhv.wind = 2; h.telegraph = .01;
  frame(v); assert.equal(h.bhv.feintAt, 0, 'the windup is over: no feint is left for a later stage or blow'); assert.ok(!(h.feint > 0));
});

// A standing Wayfarer, one legacy creature, 40 s: blows that land (the harness's 700 ms hurt window), with and without the squad board.
function standingHits(kind, squad, [dx, dy]) {
  const w = flatWorld({ squad }), P = w.player; spawn(w, kind, P.x + dx, P.y + dy, { aggro: true });
  let windups = 0, farStarts = 0; const e = w.enemies[0];
  for (let t = 0; t < 40; t += w.dt) {
    const was = e.telegraph > 0; frame(w);
    if (!was && e.telegraph > 0 && !e.meleePhase?.stage) { windups++; const p = e.meleePhase && MELEE_PATTERNS[e.meleePhase.id]; if (p && e.bhv?.comboLeft === 0 && Math.hypot(P.x - e.x, P.y - e.y) > (p.shape === 'slam' ? p.radius + enemyBodyRadius(e) : p.range) + (p.dash || 0) + .01) farStarts++; }
  }
  return { hits: w.hurts.length, windups, farStarts };
}
test('4. legacy creatures strike about as often as before 975 (within 15%), from where their blow reaches, keeping the ring and tokens', () => {
  const spots = [[3, 0], [0, 3], [-3, -1], [2.5, -2.5]];
  for (const kind of ['rootBrute', 'hollowMarshal', 'coilStalker', 'ashling', 'glassMite']) {
    let before = 0, after = 0, far = 0;
    for (const at of spots) { before += standingHits(kind, false, at).hits; const r = standingHits(kind, true, at); after += r.hits; far += r.farStarts; }
    assert.ok(before > 0 && after >= before * .8 && after <= before * 1.15, `${kind}: ${after} hits against ${before} before 975`);
    if (BEHAVIOUR.families[[BEHAVIOUR.kinds[kind]].flat()[0]].spacing) assert.equal(far, 0, `${kind}: no blow begins out of its reach from its ring`);
  }
  // The ring and the tokens still hold: three brutes never wind up more than the melee cap at once, and they wait their turn.
  const w = flatWorld(), P = w.player; for (const [dx, dy] of [[3, 0], [-3, 0], [0, 3]]) spawn(w, 'rootBrute', P.x + dx, P.y + dy, { aggro: true });
  let peak = 0, circling = 0;
  for (let t = 0; t < 30; t += w.dt) { frame(w); peak = Math.max(peak, w.enemies.filter((e) => e.telegraph > 0).length); circling += w.enemies.filter((e) => e.ai?.mode === 'circle').length; }
  assert.ok(peak <= BEHAVIOUR.tokens.melee.base, `at most ${BEHAVIOUR.tokens.melee.base} wind up at once (${peak})`); assert.ok(circling > 0, 'the others hold their ring');
});

test('5. a legacy creature notices the Wayfarer within 6 tiles only in sight, not through a wall', () => {
  for (const [wall, expect] of [[true, false], [false, true]]) {
    const w = flatWorld(), P = w.player;
    if (wall) for (let y = 0; y < w.height; y++) w.map.tiles[y * w.width + 22].blocked = true;
    const e = spawn(w, 'rootBrute', P.x + 4, P.y);
    for (let i = 0; i < 30; i++) {
      w.now += w.dt * 1000; squadFrame(w.squad, w.enemies, P, w.now, w.dt, false, w.enemies);
      updateEnemyAI(e, P, w.map, w.width, w.dt, w.now, null, () => {}, (q, dx, dy) => (q.x += 0 * dx + 0 * dy, false), w.squad);
    }
    assert.equal(!!e.aggro, expect, wall ? 'a wall between: it stays unaware' : 'in sight: it notices');
  }
});

// ------------------------------------------------------------------------------------------------ a fake AudioContext
class FakeParam {
  constructor(ctx, value = 0) { this.ctx = ctx; this.value = value; this.events = []; this.cancels = 0; }
  at(type, v, t) { this.events.push({ type, v, t }); return this; }
  setValueAtTime(v, t) { return this.at('set', v, t); }
  linearRampToValueAtTime(v, t) { return this.at('linear', v, t); }
  exponentialRampToValueAtTime(v, t) { return this.at('exp', v, t); }
  setTargetAtTime(v, t) { return this.at('target', v, t); }
  cancelScheduledValues() { this.cancels++; return this; }
}
class FakeNode { constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; } connect(n) { return n; } disconnect() {} }
class FakeSource extends FakeNode { start() {} stop() {} }
class FakeContext {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = new FakeNode(this, 'destination'); }
  createGain() { const n = new FakeNode(this, 'gain'); n.gain = new FakeParam(this, 1); return n; }
  createOscillator() { const n = new FakeSource(this, 'osc'); n.frequency = new FakeParam(this, 440); n.detune = new FakeParam(this, 0); return n; }
  createBiquadFilter() { const n = new FakeNode(this, 'filter'); n.frequency = new FakeParam(this, 350); n.Q = new FakeParam(this, 1); return n; }
  createDelay() { const n = new FakeNode(this, 'delay'); n.delayTime = new FakeParam(this, 0); return n; }
  createBufferSource() { return new FakeSource(this, 'buffer'); }
  createBuffer(channels, length) { const data = Array.from({ length: channels }, () => new Float32Array(length)); return { length, getChannelData: (c) => data[c] }; }
  createConvolver() { return new FakeNode(this, 'convolver'); }
}

test('6. the menace drop leaves a stinger\'s ducking alone while it plays, and drops again once it is over', () => {
  const song = Object.values(SONGS).find((q) => q.dark?.drop); assert.ok(song, 'a theme with a drop');
  const ctx = new FakeContext(), eng = createSoundtrack(ctx, { timer: false, seed: 5 }); eng.start();
  const stems = { groove: eng.mix, motion: eng.mix, bed: eng.mix };
  const d = { song: { ...song, dark: { drop: 1 } }, bar: 7, tier: 1, stepDur: .2, endAt: Infinity, stems, dropped: false };
  const g = eng.duck.gain, seconds = eng.stinger('beast', 0); assert.ok(seconds > 0, 'the stinger plays');
  const events = g.events.length, cancels = g.cancels;
  eng.menaceStep(d, 1, 4);
  assert.equal(g.events.length, events, 'no new automation on the duck during the stinger'); assert.equal(g.cancels, cancels, 'its ducking is not cancelled');
  assert.equal(d.dropped, false);
  eng.menaceStep(d, seconds + SOUNDTRACK.duck.release + .1, 4);
  assert.ok(g.events.some((e) => e.v === SOUNDTRACK.menace.drop), 'after it the bar drops as before'); assert.equal(d.dropped, true);
});
