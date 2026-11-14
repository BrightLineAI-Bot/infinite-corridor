// The dino duel (Tim, 2026-11-14): when the Spinosaurus and the Wild Stegosaurus fight each other there is no music, only the sounds of
// battle (battle-sfx.ts), and by 90 s one has come out ahead (dino-duel.ts): eaten by the other (nothing is the Wayfarer's) or fled.
// Detection and the music's fade (soundtrack-director.ts, soundtrack.ts), the sounds on a fake AudioContext, the two seeking each
// other out, the grabs, the shake, the rockfall, the verdict and its fairness, the endings, determinism and resume.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_PACK, ATTACK_MODULES, STEGO, SPINO, updatePackMonster, tickPackEffects, addPackEffect, resetPackRuntime } from '../src/monster-pack.ts';
import { DINO_DUEL, tickDinoDuels, duelVerdict, duelCoin, duelBlow, duelText } from '../src/dino-duel.ts';
import { BattleSfx, BATTLE_SFX, DUEL_SOUNDS, SFX_NAMES } from '../src/battle-sfx.ts';
import { MusicDirector, DUEL, sampleDuel, sampleMusic } from '../src/soundtrack-director.ts';
import { createSoundtrack } from '../src/soundtrack.ts';
import { shakeOffset } from '../src/spino-rex.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { ensureWorldBeasts } from '../src/world-beasts.ts';
import { createStegoTrack, sampleStego, stegoBone } from '../src/close-view-beast-stego.ts';
import { createSpinoTrack, sampleSpino, SPINO_RIG } from '../src/close-view-beast-spino.ts';
import { holdInJaws, CLOSE_VIEW_BEASTS } from '../src/close-view-beasts.ts';
import { closeViewDuelPull, CLOSE_VIEW } from '../src/close-view.ts';

// ------------------------------------------------------------------------------------------------ a headless arena
function world({ size = 40, player = { x: 20, y: 30 }, indoors = false } = {}) {
  const open = (x, y) => x >= 0 && y >= 0 && x < size - 1 && y < size - 1;
  const w = {
    player: { ...player, hp: 1e6 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], cues: [], creatureHits: [], shakes: [], indoors,
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true, map: { objects: [] }, oceanAt: () => false, playerVelocity: { x: 0, y: 0 },
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source, at: { x: w.player.x, y: w.player.y }, t: w.now }); return true; },
    hurtCreature(source, q, amount) { w.creatureHits.push({ id: q.id, by: source?.id ?? null, amount }); q.hp = Math.max(0, q.hp - amount); q.aggro = true; if (q.hp <= 0) { q.dead = true; q.noRewards = true; } return true; },
    bleed() { return true; }, biteMark() {}, shake(power) { w.shakes.push({ power, t: w.now }); }, say() {},
    spinoHold() { return true; }, held() { return false; }, release() {}, carry() {}, throwPlayer() {},
    slow() {}, push() { return true; }, pull() {}, poison() {}, stun() {}, ignite() {},
    dinoSfx(c) { w.cues.push({ ...c, t: w.now / 1000 }); },
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function pair(w, { hp = 3000, sid = 'spino', tid = 'stego', dmg = 40, at = [[14, 18], [26, 18]] } = {}) {
  const s = createCombatant('spinoRex', at[0][0], at[0][1], true, []); Object.assign(s, { id: sid, aggro: true, hp, maxHp: hp, damage: dmg }); s.packAttacks = [...MONSTER_PACK.spinoRex.attacks];
  const t = createCombatant('wildStego', at[1][0], at[1][1], true, []); Object.assign(t, { id: tid, aggro: true, hp, maxHp: hp, damage: dmg }); t.packAttacks = [...MONSTER_PACK.wildStego.attacks];
  w.enemies.push(s, t); return [s, t];
}
// Steps the duel controller and every creature; `each(t)` after each frame. Returns the controller's events.
function run(w, seconds, ctx = {}, each = () => {}) {
  const events = [];
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000;
    for (const ev of tickDinoDuels(w.enemies, w.dt, { clock: 0, width: 40, height: 40, ...ctx })) events.push({ ...ev, at: w.now / 1000 });
    for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w);
    w.fx = tickPackEffects(w.fx, w); each(t);
    w.enemies = w.enemies.filter((e) => !(e.dinoFled && e.fleeDone));
  }
  return events;
}
const outcome = (ev) => ev.find((e) => e.type === 'eaten' || e.type === 'escape') || null;

// ------------------------------------------------------------------------------------------------ a fake AudioContext
class Param { constructor(ctx, v = 0) { this.ctx = ctx; this.value = v; this.events = []; }
  at(type, v, t) { if (!Number.isFinite(t) || !Number.isFinite(v)) throw new Error(`bad ${type}`); this.events.push({ type, v, t }); return this; }
  setValueAtTime(v, t) { return this.at('set', v, t); } linearRampToValueAtTime(v, t) { return this.at('linear', v, t); }
  exponentialRampToValueAtTime(v, t) { if (!(v > 0)) throw new Error('exp to 0'); return this.at('exp', v, t); } setTargetAtTime(v, t) { return this.at('target', v, t); } cancelScheduledValues() { return this; } }
class Node { constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.disconnected = false; ctx.nodes.push(this); } connect(n) { return n; } disconnect() { this.disconnected = true; } }
class Source extends Node { constructor(ctx, kind) { super(ctx, kind); this.startAt = null; this.stopAt = null; this.ended = false; ctx.sources.push(this); } start(t = 0) { if (t < this.ctx.currentTime - 1e-9) this.ctx.past++; this.startAt = t; } stop(t = this.ctx.currentTime) { this.stopAt = t; } }
class Ctx {
  constructor() { this.currentTime = 0; this.sampleRate = 8000; this.nodes = []; this.sources = []; this.past = 0; this.destination = new Node(this, 'destination'); }
  createGain() { const n = new Node(this, 'gain'); n.gain = new Param(this, 1); return n; }
  createOscillator() { const n = new Source(this, 'osc'); n.frequency = new Param(this, 440); n.detune = new Param(this); return n; }
  createBiquadFilter() { const n = new Node(this, 'filter'); n.frequency = new Param(this, 350); n.Q = new Param(this, 1); return n; }
  createDelay() { const n = new Node(this, 'delay'); n.delayTime = new Param(this); return n; }
  createStereoPanner() { const n = new Node(this, 'pan'); n.pan = new Param(this); return n; }
  createDynamicsCompressor() { const n = new Node(this, 'comp'); for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = new Param(this); return n; }
  createBufferSource() { return new Source(this, 'buffer'); }
  createBuffer(c, length) { const d = Array.from({ length: c }, () => new Float32Array(length)); return { length, getChannelData: (i) => d[i] }; }
  createConvolver() { return new Node(this, 'convolver'); }
  createWaveShaper() { const n = new Node(this, 'shaper'); n.curve = null; return n; }
  advance(t) { this.currentTime = t; for (const s of this.sources) if (!s.ended && s.stopAt != null && s.stopAt <= t) { s.ended = true; s.onended?.(); } }
}
const sfx = (o = {}) => { const ctx = new Ctx(), log = [], b = new BattleSfx(ctx, { seed: 3, onEvent: (e) => log.push(e), ...o }); return { ctx, b, log }; };
const L = { x: 20, y: 20 };

// ------------------------------------------------------------------------------------------------ detection and the music
test('duel detection: both alive, near each other and the Wayfarer, one going for the other (or both roused); off otherwise', () => {
  const spino = { id: 's', kind: 'spinoRex', x: 10, y: 10, hp: 100, aggro: false, pack: { spinoFocus: 't' } }, stego = { id: 't', kind: 'wildStego', x: 14, y: 10, hp: 100, aggro: false, pack: {} };
  const g = { player: { x: 12, y: 14 }, enemies: [spino, stego] };
  assert.ok(sampleDuel(g), 'the Spinosaurus hunting it'); spino.pack.spinoFocus = null; assert.equal(sampleDuel(g), null, 'neither going for the other');
  stego.pack.attack = 'stegoWheel'; stego.pack.data = { prey: 's' }; assert.ok(sampleDuel(g), 'a blow at it'); stego.pack.attack = null;
  spino.aggro = stego.aggro = true; assert.ok(sampleDuel(g), 'both roused'); assert.ok(sampleDuel({ ...g, enemies: [{ ...spino, boss: false }, { ...stego, stegoRoom: true }] }), 'a big room or an interloper is no boss and still duels');
  assert.equal(sampleDuel({ ...g, player: { x: 40, y: 40 } }), null, 'the Wayfarer far off'); stego.x = 40; assert.equal(sampleDuel(g), null, 'apart'); stego.x = 14;
  stego.dead = true; assert.equal(sampleDuel(g), null, 'one dead'); stego.dead = false; stego.retreating = true; assert.equal(sampleDuel(g), null, 'one fleeing');
});

test('the director: a lead-in fading the music, on, a tail after they part, then off and the music back; no boss theme meanwhile', () => {
  const d = new MusicDirector({ seed: 2 }), base = { context: 'day', chapter: 1, engaged: 1, near: 0, foeHp: 100, playerHp: 100, dead: false, checkpoint: null, region: null, atHome: false };
  const boss = { id: 'world-beast:wildStego:1', kind: 'wildStego' };
  let out = d.update({ ...base, boss: null, duel: false }, 0); assert.equal(out.duel, 'off'); assert.equal(out.hush, 1); const placeSong = out.songId;
  out = d.update({ ...base, boss, duel: true }, .25); assert.equal(out.duel, 'lead'); assert.equal(out.hush, 0, 'the fade starts at once'); assert.notEqual(out.songId, 'fernsAndPlates', 'no boss theme'); assert.deepEqual(out.stingers, [], 'no beast beat');
  for (let t = .5; t < .25 + DUEL.leadIn - .01; t += .25) assert.equal(d.update({ ...base, boss, duel: true }, t).duel, 'lead');
  out = d.update({ ...base, boss, duel: true }, .25 + DUEL.leadIn + .01); assert.equal(out.duel, 'on'); assert.equal(out.songId, placeSong);
  for (let t = 2; t < 9.9; t += .5) assert.equal(d.update({ ...base, boss, duel: true }, t).hush, 0);
  out = d.update({ ...base, boss, duel: false }, 10); assert.equal(out.duel, 'tail'); assert.equal(out.hush, 0);
  out = d.update({ ...base, boss, duel: true }, 11); assert.equal(out.duel, 'on', 'they close again');
  d.update({ ...base, boss, duel: false }, 12); out = d.update({ ...base, boss: null, duel: false, duelFall: 'beast' }, 12 + DUEL.linger + .1);
  assert.equal(out.duel, 'off'); assert.equal(out.hush, 1, 'the music comes back'); assert.ok(!out.stingers.includes('victory'), 'a beast eaten by the other is no victory');
  // the Wayfarer's own kill ends it at once, with the victory beat
  const v = new MusicDirector({ seed: 2 }); v.update({ ...base, duel: true }, 0); v.update({ ...base, duel: true }, 2);
  out = v.update({ ...base, duel: false, duelFall: 'wayfarer' }, 2.25); assert.equal(out.duel, 'off'); assert.deepEqual(out.stingers, ['victory']);
  // after it, a boss still fought gets its theme
  out = d.update({ ...base, boss, duel: false }, 30); assert.equal(out.songId, 'fernsAndPlates');
});

test('sampleMusic: the duel, its pair kept for the sounds, and who felled the loser', () => {
  const spino = { id: 's', kind: 'spinoRex', x: 10, y: 10, hp: 100, aggro: true, pack: {} }, stego = { id: 't', kind: 'wildStego', x: 14, y: 10, hp: 100, aggro: true, pack: {} }, memo = {};
  const g = { area: 'overworld', player: { x: 12, y: 12, hp: 50 }, save: {}, map: {}, enemies: [spino, stego] };
  let snap = sampleMusic(g, memo); assert.equal(snap.duel, true); assert.equal(memo.duelPair.spino, spino);
  stego.dead = true; stego.hp = 0; stego.noRewards = true; snap = sampleMusic(g, memo); assert.equal(snap.duel, false); assert.equal(snap.duelFall, 'beast');
});

test('the score fades out over about 1.5 s and back; stingers pass the hush; nothing changes when the level does not', () => {
  const ctx = new Ctx(), eng = createSoundtrack(ctx, { timer: false, seed: 5 }); eng.start();
  ctx.advance(3); assert.equal(eng.setHush(0, DUEL.fadeOut), true); const ev = eng.hush.gain.events.at(-1); assert.equal(ev.type, 'linear'); assert.equal(ev.v, 0); assert.ok(Math.abs(ev.t - (3 + DUEL.fadeOut)) < 1e-9);
  assert.equal(eng.setHush(0, DUEL.fadeOut), false, 'already hushed');
  ctx.advance(20); eng.setHush(1, DUEL.fadeIn); const back = eng.hush.gain.events.at(-1); assert.equal(back.v, 1); assert.ok(Math.abs(back.t - (20 + DUEL.fadeIn)) < 1e-9);
  assert.ok(DUEL.fadeOut >= 1 && DUEL.fadeOut <= 2 && DUEL.undercurrent === true && BATTLE_SFX.undercurrent.gain <= .0316, 'the undercurrent near silence (-30 dB or less)');
});

// ------------------------------------------------------------------------------------------------ the sounds
test('a blow between the two plays its own sound; blows on the Wayfarer or other creatures play none; each beast its own', () => {
  const { b, log } = sfx(); b.setDuel('on', null);
  const want = { spinoBite: 'biteSpino', spinoClaw: 'rakeSpino', spinoTailSwipe: 'tailSpino', stegoBite: 'biteStego', stegoTailWhack: 'tailStego', stegoWheel: 'wheelCrunch', stegoJaws: 'thrash', spinoGrabSlam: 'impact', stegoTreeClub: 'woodCrack' };
  let t = 0; for (const [move, name] of Object.entries(want)) { t += 1; b.ctx.advance(t); const who = move.startsWith('spino') ? 'spinoRex' : 'wildStego';
    assert.ok(b.cue({ who, id: 'x', phase: 'hit', move, x: 20, y: 20, victim: who === 'spinoRex' ? 'wildStego' : 'spinoRex' }, L), move); assert.equal(log.at(-1).name, name); }
  assert.notEqual(want.spinoBite, want.stegoBite); assert.notEqual(want.spinoTailSwipe, want.stegoTailWhack);
  const n = log.length; b.ctx.advance(30);
  assert.equal(b.cue({ who: 'spinoRex', id: 'x', phase: 'hit', move: 'spinoBite', x: 20, y: 20 }, L), false, 'on the Wayfarer: no victim');
  assert.equal(b.cue({ who: 'spinoRex', id: 'x', phase: 'hit', move: 'spinoBite', x: 20, y: 20, victim: 'ashling' }, L), false, 'another creature');
  assert.equal(b.cue({ who: 'spinoRex', id: 'x', phase: 'hit', move: 'spinoBite', x: 20, y: 20, victim: 'spinoRex' }, L), false);
  assert.equal(log.length, n);
  // wind-ups, roars and landings only while a duel is held; blows whatever the duel's state
  b.setDuel('off'); b.ctx.advance(40); assert.equal(b.cue({ who: 'spinoRex', id: 'x', phase: 'roar', move: 'spinoRoar', x: 20, y: 20 }, L), false);
  assert.ok(b.cue({ who: 'wildStego', id: 'y', phase: 'hit', move: 'stegoBite', x: 20, y: 20, victim: 'spinoRex' }, L));
  b.setDuel('on'); b.ctx.advance(42); assert.ok(b.cue({ who: 'spinoRex', id: 'x', phase: 'roar', move: 'spinoRoar', x: 20, y: 20 }, L)); assert.equal(log.filter((e) => e.type === 'sfx').at(-1).name, 'roarBig');
  // every sound in the table has a builder and plays once
  const all = sfx(); all.b.setDuel('on'); SFX_NAMES.forEach((name, i) => { all.ctx.advance(i * 3); assert.ok(all.b.play(name, { opts: { arms: [.7, 1], land: .8 } }), name); });
  for (const table of Object.values(DUEL_SOUNDS)) for (const name of Object.values(table)) assert.ok(SFX_NAMES.includes(name), name);
});

test('position: louder near, quieter far, silent past the range; panned left and right', () => {
  const { b, log } = sfx(); b.setDuel('on');
  b.play('slam', { x: 20, y: 20, listener: L }); b.ctx.advance(1); b.play('slam', { x: 34, y: 20, listener: L }); b.ctx.advance(2); b.play('slam', { x: 8, y: 20, listener: L });
  const s = log.filter((e) => e.type === 'sfx'); assert.equal(s[0].gain, 1); assert.ok(s[1].gain < .5 && s[1].pan > .5); assert.ok(s[2].pan < -.5);
  b.ctx.advance(3); assert.equal(b.play('slam', { x: 20 + BATTLE_SFX.distance.max + 1, y: 20, listener: L }), false);
});

test('debounce: the same sound within 80 ms plays once; the voice cap holds over a 3-minute duel; every node is let go', () => {
  const { b, ctx, log } = sfx(); b.setDuel('on');
  assert.ok(b.play('biteSpino')); ctx.advance(.05); assert.equal(b.play('biteSpino'), false); ctx.advance(.1); assert.ok(b.play('biteSpino')); assert.equal(b.stats.debounced, 1);
  // the cues of a real 3-minute fight, fed through on the audio clock
  const w = world({ indoors: true }), [s, t] = pair(w, { hp: 1e6 }); const e = run(w, 180); assert.ok(e.some((q) => q.type === 'start'));
  const { b: c, ctx: k } = sfx(); c.setDuel('on', { spino: s, stego: t }); let i = 0, peak = 0;
  for (let time = 0; time < 180; time += 1 / 30) { k.advance(time); while (i < w.cues.length && w.cues[i].t <= time) c.cue(w.cues[i++], w.player, time); c.track(w.player, time); peak = Math.max(peak, c.liveVoices(time)); }
  k.advance(200); assert.ok(w.cues.length > 150, `${w.cues.length} cues`); assert.ok(c.stats.played > 60, `${c.stats.played} played`);
  assert.ok(peak <= BATTLE_SFX.maxVoices && c.stats.peakVoices <= BATTLE_SFX.maxVoices, `peak ${c.stats.peakVoices}`);
  assert.equal(k.past, 0, 'nothing starts in the past'); c.setDuel('off'); k.advance(300);
  assert.equal(c.stats.liveNodes, 0, 'every sound disconnected'); assert.ok(k.sources.every((q) => q.stopAt != null), 'every source stopped');
  assert.ok(log.length >= 2);
});

test('mute: nothing is scheduled at all; pause lowers like the music; a roar is answered by a bellow', () => {
  const { b, ctx } = sfx(); b.setMuted(true); b.setDuel('on'); const n = ctx.nodes.length;
  assert.equal(b.cue({ who: 'spinoRex', id: 'x', phase: 'hit', move: 'spinoBite', x: 20, y: 20, victim: 'wildStego' }, L), false); b.track(L, 1); assert.equal(b.play('slam'), false);
  assert.equal(ctx.nodes.length, n, 'no node made while muted'); assert.equal(b.under, null, 'no undercurrent');
  b.setMuted(false); b.track(L, 2); assert.ok(b.under, 'the undercurrent with the duel'); b.setPaused(true); assert.equal(b.pauseGain.gain.events.at(-1).v, BATTLE_SFX.pause.level);
  const a = sfx(), stego = { id: 't', kind: 'wildStego', x: 22, y: 20, pack: {} }; a.b.setDuel('on', { spino: { id: 's' }, stego });
  a.b.cue({ who: 'spinoRex', id: 's', phase: 'roar', move: 'spinoRoar', x: 20, y: 20 }, L);
  const names = a.log.filter((e) => e.type === 'sfx').map((e) => e.name); assert.deepEqual(names, ['roarBig', 'bellowStego']); assert.ok(a.log.at(-1).at > a.log.find((e) => e.name === 'roarBig').at + .5);
  const busy = sfx(); busy.b.setDuel('on', { spino: { id: 's' }, stego: { ...stego, pack: { attack: 'stegoWheel' } } }); busy.b.cue({ who: 'spinoRex', id: 's', phase: 'roar', move: 'spinoRoar', x: 20, y: 20 }, L);
  assert.deepEqual(busy.log.filter((e) => e.type === 'sfx').map((e) => e.name), ['roarBig'], 'mid-move it does not answer');
});

// ------------------------------------------------------------------------------------------------ the fight
test('they seek each other out and trade blows: each mostly on the other, the Wayfarer standing close now and then', () => {
  const w = world({ player: { x: 20, y: 22 } }), [s, t] = pair(w, { hp: 1e6 }); let onRival = 0, onYou = 0, closest = Infinity;
  run(w, 45, {}, () => { closest = Math.min(closest, Math.hypot(s.x - t.x, s.y - t.y)); for (const e of [s, t]) { const r = e === s ? t.id : s.id, p = e.pack; if (p.attack ? p.data?.prey === r : (p.spinoFocus === r || p.stegoRival === r)) onRival++; else onYou++; } });
  assert.ok(onRival > onYou * 3, `${onRival} frames on each other, ${onYou} not`); assert.ok(closest < 3.5, `they closed in (${closest.toFixed(2)})`);
  const by = (id) => w.creatureHits.filter((h) => h.by === id).length; assert.ok(by(s.id) >= 5 && by(t.id) >= 5, `blows ${by(s.id)} / ${by(t.id)}`);
});

test('the Wild Stegosaurus lands its moves on the Spinosaurus: wheel, tail whack, tail slam, rear swipe, pounce, its jaws', () => {
  for (const id of ['stegoWheel', 'stegoTailWhack', 'stegoTailSlam', 'stegoRearSwipe', 'stegoPounce', 'stegoJaws']) {
    const A = ATTACK_MODULES[id], gap = Math.min(A.range[1], Math.max(A.range[0] + 1, 3.2)), w = world({ player: { x: 2, y: 2 } }), [s, t] = pair(w, { hp: 1e6, at: [[16, 18], [16 + gap, 18]] });
    s.packAttacks = []; t.packAttacks = id === 'stegoJaws' ? [] : [id]; if (id !== 'stegoJaws') t.pack.cd.stegoJaws = 99; s.speedMultiplier = 0; t.pack.gap = 0;
    run(w, 14); const hits = w.cues.filter((c) => c.phase === 'hit' && c.move === id && c.who === 'wildStego');
    assert.ok(hits.length >= 1, `${id} lands on the Spinosaurus (${w.cues.filter((c) => c.who === 'wildStego').map((c) => c.phase + ':' + c.move).join(',')})`);
    assert.ok(w.creatureHits.some((h) => h.id === s.id && h.by === t.id), id);
  }
});

test('the grabs: the stego shakes the Spinosaurus in its jaws; the Spinosaurus lifts and slams the stego twice; poses for the art', () => {
  const w = world({ player: { x: 2, y: 2 } }), [s, t] = pair(w, { hp: 1e6, at: [[16, 18], [19, 18]] }); s.packAttacks = []; t.packAttacks = [];
  const phases = new Set(), held = []; run(w, 8, {}, () => { if (t.stegoGrab) phases.add(t.stegoGrab.phase); if (t.stegoPose === 'grabShake') held.push({ x: s.x, y: s.y, by: s.stegoHeldBy }); });
  assert.deepEqual([...phases].sort(), ['bite', 'release', 'shake']); assert.ok(held.length > 30 && held.some((h) => h.by === t.id), 'held');
  const ys = held.filter((h) => h.by).map((h) => h.y); assert.ok(Math.max(...ys) - Math.min(...ys) > 1.5, 'shaken side to side');
  assert.ok(w.cues.filter((c) => c.move === 'stegoJaws' && c.phase === 'hit').length >= STEGO.jaws.swings - 1); assert.ok(w.cues.some((c) => c.phase === 'grab' && c.move === 'stegoJaws'));
  const v = world({ player: { x: 2, y: 2 } }), [a, b] = pair(v, { hp: 1e6, at: [[16, 18], [19.5, 18]] }); a.packAttacks = ['spinoGrab']; b.packAttacks = []; b.pack.cd.stegoJaws = 99;
  const sp = new Set(), slams = []; run(v, 10, {}, () => { if (a.spinoGrab) { sp.add(a.spinoGrab.phase); if (a.spinoGrab.phase === 'slam') slams.push(a.spinoGrab.slams); } sp.add(a.spinoPose); });
  for (const k of ['lift', 'slam', 'grabLift', 'grabSlam']) assert.ok(sp.has(k), k); assert.equal(Math.max(...slams), SPINO.grab.duel.slams, 'twice');
  assert.equal(v.cues.filter((c) => c.phase === 'land' && c.move === 'spinoGrabSlam').length, SPINO.grab.duel.slams); assert.ok(v.cues.some((c) => c.phase === 'lift'));
});

test('collateral: the thrashing body and the slams hurt the Wayfarer only inside their telegraphed area, shown first', () => {
  for (const [inside, expect] of [[true, true], [false, false]]) {
    const w = world({ player: inside ? { x: 19, y: 20 } : { x: 19, y: 25 } }), [s, t] = pair(w, { hp: 1e6, at: [[16, 18], [19, 18]] }); s.packAttacks = []; t.packAttacks = [];
    let ring = null, first = null; run(w, 6, {}, () => { if (!ring && t.pack.tele?.type === 'ring' && t.pack.attack === 'stegoJaws') ring = w.now; const h = w.hurts.find((q) => q.source === 'stegoJaws'); if (h && first == null) first = h.t; });
    assert.equal(w.hurts.some((h) => h.source === 'stegoJaws'), expect, `stego thrash, inside ${inside}`);
    if (expect) { assert.ok(ring != null && first - ring >= 900, `the ring shows ${(first - ring) | 0} ms first`); assert.ok(w.hurts.filter((h) => h.source === 'stegoJaws').every((h) => Math.hypot(h.at.x - t.x, h.at.y - t.y) <= STEGO.jaws.sweep + .5)); }
  }
  for (const [inside, expect] of [[true, true], [false, false]]) {
    const w = world({ player: { x: 2, y: 2 } }), [s, t] = pair(w, { hp: 1e6, at: [[16, 18], [19.5, 18]] }); s.packAttacks = ['spinoGrab']; t.packAttacks = []; t.pack.cd.stegoJaws = 99;
    let circle = null; run(w, 10, {}, () => { const tl = s.pack.tele; if (s.spinoGrab?.phase === 'lift' && tl?.type === 'circle') { circle ||= { ...tl, at: w.now }; if (inside) { w.player.x = tl.x; w.player.y = tl.y; } } });
    assert.ok(circle, 'the slam circle shows while it lifts'); assert.equal(w.hurts.some((h) => h.source === 'spinoGrabSlam'), expect, `slam, inside ${inside}`);
  }
});

test('the screen shakes on big moves, capped and rate-limited; none under Reduced Motion', () => {
  const w = world({ player: { x: 2, y: 2 } }), [s, t] = pair(w, { hp: 1e6 }); run(w, 60);
  assert.ok(w.shakes.length >= 3, `${w.shakes.length} shakes`); assert.ok(w.shakes.every((q) => q.power <= DINO_DUEL.shake.max));
  for (let i = 1; i < w.shakes.length; i++) assert.ok(w.shakes[i].t - w.shakes[i - 1].t >= DINO_DUEL.shake.gap * 1000 - 40, 'rate-limited');
  const shake = { at: 0, until: 600, power: .6 }; assert.notDeepEqual(shakeOffset(shake, 100), { x: 0, y: 0 }); assert.deepEqual(shakeOffset(shake, 100, true), { x: 0, y: 0 }, 'Reduced Motion');
  const quiet = world({ player: { x: 2, y: 2 } }), [a] = pair(quiet, { hp: 1e6, at: [[14, 18], [40, 40]] }); quiet.enemies = [a]; a.packAttacks = ['spinoLeapSlam']; run(quiet, 10); assert.equal(quiet.shakes.length, 0, 'no duel, no new shake');
});

test('rockfall: indoors only, telegraphed, at most six at once, and it hurts the Wayfarer under it', () => {
  const out = world(), [a, b] = pair(out, { hp: 1e6 }); run(out, 60); assert.equal(out.cues.filter((c) => c.phase === 'rock').length, 0, 'no ceiling outdoors');
  const w = world({ indoors: true }), [s, t] = pair(w, { hp: 1e6 }); let most = 0, seen = new Set(), telegraphed = true;
  run(w, 60, {}, () => { const live = w.fx.filter((f) => f.kind === 'dinoRock'); most = Math.max(most, live.length); for (const f of live) if (!seen.has(f)) { seen.add(f); if (!(f.arming > .9)) telegraphed = false; } });
  assert.ok(seen.size >= 3, `${seen.size} rocks`); assert.ok(most <= DINO_DUEL.rockfall.live); assert.ok(telegraphed, 'each shown about a second first');
  const v = world({ indoors: true }); v.addEffect({ kind: 'dinoRock', owner: 'x', x: v.player.x, y: v.player.y, radius: .75, arming: 1, armTotal: 1, life: .4, total: .4, damage: 9 });
  for (let i = 0; i < 40; i++) { v.now += 33; v.fx = tickPackEffects(v.fx, v); } assert.equal(v.hurts.filter((h) => h.source === 'dinoRock').length, 1, 'it lands once, on her');
});

// ------------------------------------------------------------------------------------------------ the verdict and the endings
test('the verdict is fair across seeds, and the Wayfarer tilts it: who she hurts more tends to lose', () => {
  const mk = (i, hpS = .5, hpT = .5, youS = 0, youT = 0) => {
    const s = { id: `S${i}`, kind: 'spinoRex', hp: hpS * 1000, maxHp: 1000, dinoDuel: { foe: `T${i}`, start: i, byYou: youS, t: 50 } }, t = { id: `T${i}`, kind: 'wildStego', hp: hpT * 1000, maxHp: 1000, dinoDuel: { foe: `S${i}`, start: i, byYou: youT, t: 50 } };
    return duelVerdict(s, t);
  };
  let spino = 0, kill = 0; const N = 600; for (let i = 0; i < N; i++) { const v = mk(i); if (v.loser === `S${i}`) spino++; if (v.end === 'kill') kill++; }
  assert.ok(spino / N > .4 && spino / N < .6, `even: the Spinosaurus loses ${spino}/${N}`); assert.ok(kill / N > .35 && kill / N < .65, `both endings: ${kill} kills`);
  let tilt = 0; for (let i = 0; i < N; i++) if (mk(i, .5, .3, 0, 400).loser === `T${i}`) tilt++; assert.ok(tilt / N > .75, `hurt by her, the stego loses ${tilt}/${N}`);
  let fought = 0; for (let i = 0; i < N; i++) if (mk(i, .5, .5, 300, 0).loser === `S${i}`) fought++; assert.ok(fought / N > .6, `fought more, the Spinosaurus loses ${fought}/${N}`);
  assert.equal(duelCoin('a', 'b', 3), duelCoin('a', 'b', 3), 'hashed');
});

// A duel start (the clock) whose hashed ending is a kill, for these two ids.
const killClock = (a, b) => { for (let k = 0; k < 2000; k++) if (duelVerdict({ id: a, hp: 1, maxHp: 1, dinoDuel: { foe: b, start: k } }, { id: b, hp: 1, maxHp: 1, dinoDuel: { foe: a, start: k } }).end === 'kill') return k; return 0; };
test('every duel is over by 90 s, both endings occur, both sides win, and a held-back kill is landed at the cap', () => {
  const seen = { eaten: 0, escape: 0 }, lost = { spinoRex: 0, wildStego: 0 };
  for (let i = 0; i < 16; i++) {
    const w = world({ indoors: i % 3 === 0 }), [s, t] = pair(w, { sid: `spino-${i}`, tid: `stego-${i}` }), ev = run(w, 92), o = outcome(ev);
    assert.ok(o && o.at <= DINO_DUEL.cap + .1, `duel ${i} over by the cap (${o?.type} at ${o?.at})`); seen[o.type]++; lost[o.loser === s.id ? 'spinoRex' : 'wildStego']++;
    if (o.type === 'escape') { const l = o.loser === s.id ? s : t; assert.ok(l.dinoFled || !w.enemies.includes(l), 'fled'); assert.ok(l.hp > 0); }
    else { const l = o.loser === s.id ? s : t; assert.ok(l.dead && l.noRewards, 'killed by the other'); }
  }
  assert.ok(seen.eaten > 0 && seen.escape > 0, JSON.stringify(seen)); assert.ok(lost.spinoRex > 0 && lost.wildStego > 0, JSON.stringify(lost));
  // a winner that cannot land its blows still takes the kill at the cap
  const w = world(), [s, t] = pair(w, { hp: 1e6, sid: 'capS', tid: 'capT' }); let k = 0;
  k = killClock('capS', 'capT');
  const ev = run(w, 100, { clock: k }, () => { s.packAttacks = []; t.packAttacks = []; s.pack.cd.spinoGrab = t.pack.cd.stegoJaws = 99; });
  const o = outcome(ev); assert.equal(o?.type, 'eaten'); assert.ok(o.at <= DINO_DUEL.cap + .1 && o.at >= DINO_DUEL.cap - .1, `capped at ${o.at}`);
});

test('the duel\'s blows: a growing share, no 8% floor for a doomed loser, the hold otherwise; a fall to the other is noted', () => {
  const s = { id: 's', kind: 'spinoRex', hp: 1000, maxHp: 1000, dinoDuel: { foe: 't', t: 0 } }, t = { id: 't', kind: 'wildStego', hp: 1000, maxHp: 1000, dinoDuel: { foe: 's', t: 0 } };
  assert.equal(duelBlow(s, t, 5).amount, Math.ceil(1000 * DINO_DUEL.escalate.from)); t.dinoDuel.t = 60; assert.equal(duelBlow(s, t, 5).amount, Math.ceil(1000 * DINO_DUEL.escalate.to));
  t.hp = 310; assert.equal(duelBlow(s, t, 5).amount, 10, 'held at the floor before the verdict');
  t.dinoDuel.verdict = { loser: 't', winner: 's', end: 'kill' }; t.hp = 50; assert.equal(duelBlow(s, t, 5).amount, 50, 'the loser can die'); assert.equal(duelBlow({ id: 'x' }, t, 5), null, 'not its foe');
  assert.match(duelText('eaten', s, t), /^The Spinosaurus devours the Wild Stegosaurus\. Its spoils are lost\.$/);
});

test('determinism: the same duel twice is the same, to the frame', () => {
  const go = () => { const w = world({ indoors: true }), [s, t] = pair(w); const ev = run(w, 70); return JSON.stringify({ ev, s: [s.x, s.y, s.hp], t: [t.x, t.y, t.hp], cues: w.cues.length, fx: w.fx.length }); };
  assert.equal(go(), go());
});

test('resume mid-duel: the duel rides on its creatures (the area snapshot), at the same second and verdict, and still ends by the cap', () => {
  const clock = killClock('rs', 'rt'), w = world(), [s] = pair(w, { sid: 'rs', tid: 'rt' }); let saved = null;
  run(w, 60, { clock }, () => { if (!saved && s.dinoDuel?.verdict) saved = { enemies: JSON.parse(JSON.stringify(w.enemies)), now: w.now }; });
  assert.ok(saved, 'a verdict given mid-duel'); const d = saved.enemies[0].dinoDuel; assert.equal(d.verdict.end, 'kill');
  const back = saved.enemies; for (const e of back) resetPackRuntime(e);
  const v = world(); v.enemies = back; v.now = saved.now; assert.ok(back[0].dinoDuel.t > 0, 'at the same second');
  const ev = run(v, 70, { clock }), o = outcome(ev); assert.ok(o, 'it ends after the resume'); assert.equal(o.loser, d.verdict.loser, 'with the same verdict');
  assert.ok(d.t + (o.at - saved.now / 1000) <= DINO_DUEL.cap + .2, 'by the cap');
});

// ------------------------------------------------------------------------------------------------ rewards, in the game
function gameWith() {
  const s = freshSave(); s.seed = 'DINO-DUEL'; ensureWorldBeasts(s); const g = new Game(s, 0); g.enemies = [];
  for (const id of ['wildStego', 'spinoRex']) s.worldBeasts[id].active = { rx: g.rx, ry: g.ry, tries: 0 };
  const st = createCombatant('wildStego', g.player.x + 4, g.player.y, true, []); Object.assign(st, { id: 'world-beast:wildStego:0', worldBeast: 'wildStego', boss: true, hp: 900, maxHp: 1000, aggro: true });
  const sp = createCombatant('spinoRex', g.player.x - 4, g.player.y, true, []); Object.assign(sp, { id: 'interloper:spino', hp: 900, maxHp: 1000, aggro: true });
  g.enemies.push(st, sp); return { g, s, st, sp };
}
test('eaten by the other: no reward, no Echo, no spoils, no slain record; its hunt still ends; her own kill pays in full', () => {
  const { g, s, st, sp } = gameWith(); const marks = s.currency || 0, echoes = JSON.stringify(s.echoes?.owned || {});
  st.dinoDuel = { foe: sp.id, start: 0, t: 40, hp: 900, byRival: 0, rivalSeen: 0, byYou: 0, apart: 0, verdict: { loser: st.id, winner: sp.id, end: 'kill' } }; sp.dinoDuel = { ...st.dinoDuel, foe: st.id };
  const w = g.packWorld(1 / 30, 1000); w.hurtCreature(sp, st, 5000); assert.ok(st.dead && st.noRewards);
  g.dinoDuelTick(1 / 30); assert.equal(g.message, 'The Spinosaurus devours the Wild Stegosaurus. Its spoils are lost.');
  assert.equal(s.currency || 0, marks, 'no bounty'); assert.equal(JSON.stringify(s.echoes?.owned || {}), echoes, 'no Echo'); assert.equal(s.worldBeasts.wildStego.slain, 0, 'not her kill');
  assert.equal(s.worldBeasts.wildStego.active, null, 'its hunt is over: it is not back as never slain'); assert.equal(s.worldBeasts.wildStego.eaten, 1); assert.ok(!s.worldBeasts.wildStego.spoils);
  assert.ok(sp.dinoFeed > 0, 'the winner feeds');
  const h = gameWith(); h.st.hp = 0; h.st.dead = true; h.g.defeatEnemy(h.st); assert.equal(h.s.worldBeasts.wildStego.slain, 1, 'her own kill is recorded'); assert.ok((h.s.currency || 0) > 0, 'and paid');
});

test('an escape: a world beast takes its own retreat with its wounds kept; any other runs off the edge; the winner stays', () => {
  const { g, s, st, sp } = gameWith(); st.hp = 300; g.dinoEscape(st);
  assert.ok(st.retreating, 'it retreats'); assert.ok(Math.abs(s.worldBeasts.wildStego.active.wounds - .3) < 1e-6, 'its wounds kept on its hunt'); assert.ok(s.worldBeasts.wildStego.active.retreat);
  g.dinoEscape(sp); assert.ok(sp.dinoFled && sp.fleeTo && sp.retreating, 'the interloper runs for the edge');
  sp.fleeDone = true; g.dinoDuelTick(1 / 30); assert.ok(!g.enemies.includes(sp), 'gone once over the edge');
  // a save keeps a duel in progress on its creatures
  const k = gameWith(); k.st.dinoDuel = { foe: k.sp.id, start: 3, t: 33, hp: 900, byRival: 10, rivalSeen: 10, byYou: 0, apart: 0, verdict: null }; k.sp.dinoDuel = { ...k.st.dinoDuel, foe: k.st.id };
  k.g.exportSnapshot(5000); const saved = Object.values(k.s.session.areas).flatMap((a) => a.enemies || []).find((e) => e.id === k.st.id);
  assert.equal(JSON.parse(JSON.stringify(saved)).dinoDuel.t, 33);
});

// ------------------------------------------------------------------------------------------------ the Stegosaurus eats too
test('either can eat the other: both directions happen across seeds', () => {
  const eaten = { spinoRex: 0, wildStego: 0 };
  for (let i = 0; i < 16; i++) { const w = world({ indoors: i % 3 === 0 }), [s] = pair(w, { sid: `spino-${i}`, tid: `stego-${i}` }), o = outcome(run(w, 92)); if (o?.type === 'eaten') eaten[o.loser === s.id ? 'spinoRex' : 'wildStego']++; }
  assert.ok(eaten.spinoRex > 0 && eaten.wildStego > 0, JSON.stringify(eaten));
});
test('the Wild Stegosaurus devours the Spinosaurus: its message, its feeding, nothing for the Wayfarer, the record marked eaten', () => {
  const { g, s, st, sp } = gameWith(); s.worldBeasts.spinoRex.active = { rx: g.rx, ry: g.ry, tries: 0 }; sp.worldBeast = 'spinoRex'; const marks = s.currency || 0;
  st.dinoDuel = { foe: sp.id, start: 0, t: 40, hp: 900, byRival: 0, rivalSeen: 0, byYou: 0, apart: 0, verdict: { loser: sp.id, winner: st.id, end: 'kill' } }; sp.dinoDuel = { ...st.dinoDuel, foe: st.id };
  g.packWorld(1 / 30, 1000).hurtCreature(st, sp, 99999); g.dinoDuelTick(1 / 30);
  assert.equal(g.message, 'The Wild Stegosaurus devours the Spinosaurus. Its spoils are lost.');
  assert.equal(s.currency || 0, marks); assert.equal(s.worldBeasts.spinoRex.slain, 0); assert.equal(s.worldBeasts.spinoRex.active, null); assert.equal(s.worldBeasts.spinoRex.eaten, 1);
  assert.ok(st.dinoFeed > 0); const w = world({ player: { x: 40, y: 40 } }); w.enemies = [st]; st.pack.attack = null; updatePackMonster(st, w); assert.equal(st.stegoPose, 'graze', 'it feeds');
  assert.ok(w.cues.some((c) => c.phase === 'feed'));
});

// ------------------------------------------------------------------------------------------------ Close View
const cvEnv = (e, now, o = {}) => ({ x: e.x + .5, y: e.y + .82, z: 0, scale: (e.scale || 1) * CLOSE_VIEW_BEASTS[e.kind].scale, now, reduce: false, tier: 'full', target: { x: 30, y: e.y }, dead: false, ...o });
function cvSample(e, flags, o = {}) { const spec = CLOSE_VIEW_BEASTS[e.kind], tr = spec.createTrack(); let f = null; Object.assign(e, flags); for (let k = 0, now = 1000; k < 30; k++, now += 16) f = spec.sample(tr, e, cvEnv(e, now, o)); tr.seen = 1000 + 29 * 16; return { tr, f }; }
test('Close View: the stego thrashes its head with the shake (still under reduced motion); the lifted stego rises; held bodies sit in the jaws', () => {
  const mk = (kind, x = 0) => { const e = createCombatant(kind, x, 0, true, []); e.id = kind; e.hp = 1000; e.pack = { attack: null, data: {} }; return e; };
  const shakeAt = (side, reduce = false) => { const e = mk('wildStego'); const { tr } = cvSample(e, { stegoPose: 'grabShake', stegoGrab: { phase: 'shake', where: 'tail', side, t: .5 } }, { reduce }); return stegoBone(tr, 'head'); };
  const L = shakeAt(-1), R = shakeAt(1); assert.ok(Math.abs(L[1] - R[1]) > .5, `the head swings (${(L[1] - R[1]).toFixed(2)})`);
  const Lq = shakeAt(-1, true), Rq = shakeAt(1, true); assert.ok(Math.abs(Lq[1] - Rq[1]) < 1e-6, 'held still under reduced motion');
  const low = cvSample(mk('wildStego'), {}).f.air, up = cvSample(mk('wildStego'), { spinoHeldBy: 'spinoRex', dinoLift: 1.4 }).f.air; assert.ok(up >= 1.4 && low === 0, `lifted ${up}`);
  // held in the jaws: the stego the Spinosaurus lifts moves to its jaws; the Spinosaurus the stego shakes, its tail to the stego's beak
  const sp = mk('spinoRex'), st = mk('wildStego', 1.6); const A = cvSample(sp, { spinoPose: 'grabLift' }), B = cvSample(st, { spinoHeldBy: 'spinoRex', dinoLift: 1.4 });
  const before = [B.f.x, B.f.y], skin = B.f.skin[3]; B.tr.seen = A.tr.seen; holdInJaws(new Map([[sp, A.tr], [st, B.tr]]), A.tr.seen);
  assert.ok(Math.hypot(B.f.x - before[0], B.f.y - before[1]) > .01 && B.f.skin[3] !== skin, 'moved into the jaws'); assert.ok(B.f.air >= 0);
  const y1 = mk('spinoRex', 2.6), y0 = mk('wildStego'); const C = cvSample(y0, { stegoPose: 'grabShake', stegoGrab: { phase: 'shake', where: 'tail', side: 1 } }), D = cvSample(y1, { stegoHeldBy: 'wildStego', dinoYank: 1 });
  const x0 = D.f.x, yawHeld = D.f.yaw; D.tr.seen = C.tr.seen; holdInJaws(new Map([[y1, D.tr], [y0, C.tr]]), C.tr.seen); assert.notEqual(D.f.x, x0, 'its tail to the beak');
  const still = cvSample(mk('spinoRex', 2.6), { stegoHeldBy: 'wildStego', dinoYank: 0 }); assert.ok(Math.abs(yawHeld - still.f.yaw) < 1e-9, 'the yank yaws the skin, not the heading');
  assert.ok(SPINO_RIG.yank.yaw > 0);
});
test('Close View camera: a duel near the Wayfarer pulls the boom back to frame all three, within the duel pull; none without one', () => {
  const D = CLOSE_VIEW.camera.threat.duel, s = { id: 's', kind: 'spinoRex', x: 10, y: 10, hp: 9, dinoDuel: { foe: 't' } }, t = { id: 't', kind: 'wildStego', x: 14, y: 10, hp: 9, dinoDuel: { foe: 's' } };
  const g = { player: { x: 12, y: 16 }, enemies: [s, t] }, pull = closeViewDuelPull(g); assert.ok(pull > 0 && pull <= D.pull, `${pull}`);
  t.x = 26; s.x = 2; assert.ok(closeViewDuelPull(g) <= D.pull, 'capped');
  assert.equal(closeViewDuelPull({ ...g, enemies: [{ ...s, dinoDuel: null }, { ...t, dinoDuel: null }] }), 0, 'no duel, no pull'); assert.equal(closeViewDuelPull({ ...g, player: { x: 60, y: 60 } }), 0, 'far off');
});
