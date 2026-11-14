// The Iron Fists' rhythm (Tim, 2026-11-14): the gauntlet ball goes out with each step and comes home to the Wayfarer's centre
// exactly as the beat window opens, and stays home through it; a fresh press then is on the beat (perfect timing), mashing never
// is; a charge started on the beat carries it, and one let go in its own perfect window is a rhythm blow, so charging every move
// on the beat is the top damage per second. Numbers: brawler-spells.ts IRON_FISTS (beat, beatShare, rhythmBonus, flashMs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, GAME_NESTED_CLOCKS } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { IRON_FISTS, FIST_STEP_VIEW, fistBallAt, fistBeatWindow, fistOnBeat, drawBrawler } from '../src/brawler-spells.ts';
import { AWAKENED_ARTS } from '../src/weapon-arts.ts';
import { normalizeSockets, socketGlyph } from '../src/glyphs.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { snapshotSave, splitSnapshot, assembleSave } from '../src/persistence.ts';

const F = IRON_FISTS, GATE = F.gate * 1000, DT = 1 / 60, HOLD = (F.tapGrace + F.perfect[0]) * 1000 + 1;
const stepSpec = (step) => step > F.punches.length ? AWAKENED_ARTS.moves.roundhouse : F.punches[step - 1];
function arena({ awakened = true, echoes = 2 } = {}) {
  const s = freshSave(); s.seed = 'FIST-RHYTHM'; s.level = 15;
  s.equipment.primary = { id: 'primary-rhythm', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [], ...(awakened ? { awakened: { resonance: 'wildfire', version: 1 } } : {}) };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = [];
  if (echoes) { s.equipment.primary = normalizeSockets(s.equipment.primary); s.glyphs.echo = echoes; for (let i = 0; i < echoes; i++) assert.equal(socketGlyph(s, 'melee', i, 'echo').ok, true); }
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('ashling', 11.2, 10), { id: 'foe', hp: 1e9, maxHp: 1e9, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] })];
  return { s, g, clock: { t: 1000 } };
}
function frame(g, clock, press = false, held = false) {
  let used = false; g.player.invulnerableUntil = clock.t + 1e6; g.enemies[0].x = g.player.x + 1.2; g.enemies[0].y = g.player.y;
  g.update(DT, { state: { x: 0, y: 0 }, consume: (k) => k === 'attack' && press && !used && (used = true), held: (k) => k === 'attack' && held }, clock.t); clock.t += DT * 1000;
}
// A tap: the press and, the fists being chargeable, the let-go on the next frame.
const tap = (g, clock) => { frame(g, clock, true); frame(g, clock); };
const until = (g, clock, ms) => { while (clock.t < ms) frame(g, clock); };
const lost = (g) => 1e9 - g.enemies[0].hp;
// The blow lands after the fists' contact delay; let it land and return what it dealt.
const landed = (g, clock, before) => { for (let i = 0; i < 8; i++) frame(g, clock); return lost(g) - before; };

test('the ball is home exactly as the beat window opens and stays home through it, for every step and every charged move', () => {
  assert.ok(F.beat[0] >= 1, 'the window never opens before the gate does'); assert.ok(F.beat[1] > F.beat[0]);
  for (const charged of [false, true]) {
    const { g, clock } = arena();
    for (let step = 1; step <= 4; step++) {
      if (charged) { frame(g, clock, true, true); assert.equal(g.fistCharge?.step, step); while (clock.t - g.fistCharge.start < HOLD) frame(g, clock, false, true); frame(g, clock); }
      else tap(g, clock);
      const b = g.fistBeat; assert.ok(b, `step ${step}: a beat`); assert.equal(b.step, step);
      assert.ok(Math.abs(b.opens - b.at - GATE * F.beat[0]) < 1e-6, `step ${step}${charged ? ' charged' : ''}: home at the window's start`);
      assert.ok(Math.abs(b.closes - b.opens - GATE * (F.beat[1] - F.beat[0])) < 1e-6, 'home for the whole window');
      assert.equal(b.opens, g.fistRecoverUntil, 'the window opens with the gate');
      const home = b.opens - b.at, span = b.closes - b.at;
      for (const ms of [0, home * .2, home * .5, home - 1]) assert.equal(fistBallAt(ms, home, span).home, false, `out at ${ms}`);
      assert.ok(fistBallAt(home * FIST_STEP_VIEW.strike, home, span).along >= FIST_STEP_VIEW.reach - 1e-9, 'full reach as the blow lands');
      for (const ms of [home, (home + span) / 2, span]) { const q = fistBallAt(ms, home, span); assert.equal(q.home, true); assert.equal(q.along, 0); assert.equal(q.side, 0); }
      assert.equal(fistBallAt(span + 1, home, span), null, 'gone once the window closes');
      // the cue and the judge are one record: on the beat exactly while the ball is home
      for (const [ms, want] of [[home - 1, false], [home, true], [span, true], [span + 1, false]]) {
        assert.equal(fistOnBeat(b, b.at + ms), want, `${ms} ms`); assert.equal(fistBallAt(ms, home, span)?.home === true, want);
      }
      until(g, clock, b.closes + 300);
    }
  }
  const late = fistBeatWindow(1000, 1500); assert.equal(late.opens, 1500, 'a longer gate (a slam) holds the window back with it');
});

test('a press inside the window is perfect timing; one before or after it is not, and a press the gate held over never is', () => {
  const one = (offset, how = 'direct') => {
    const { g, clock } = arena({ echoes: 0 }); tap(g, clock); until(g, clock, g.fistBeat.opens - 100);
    const b = g.fistBeat, before = lost(g); let ok;
    if (how === 'buffered') { ok = g.fistPress(b.opens - 40, { x: 1, y: 0 }); assert.ok(g.fistQueued, 'held over by the gate'); until(g, clock, b.opens + 20); }
    else { until(g, clock, b.opens + offset - DT * 1000); clock.t = b.opens + offset; g.lastUpdateNow = clock.t; ok = g.fistPress(clock.t, { x: 1, y: 0 }); }
    return { ok, dealt: landed(g, clock, before), msg: g.message, step: g.fistCombo.step, flash: g.fistFlash };
  };
  const on = one(0), mid = one(GATE * (F.beat[1] - F.beat[0]) / 2), end = one(GATE * (F.beat[1] - F.beat[0])), after = one(GATE * (F.beat[1] - F.beat[0]) + 5), held = one(0, 'buffered');
  for (const r of [on, mid, end]) { assert.equal(r.ok, true); assert.match(r.msg, /Perfect timing/); assert.equal(r.step, 2); assert.ok(r.flash && !r.flash.rhythm, 'the ring flashes round the ball'); }
  for (const r of [after, held]) { assert.doesNotMatch(r.msg, /Perfect/); assert.equal(r.step, 2); }
  const jab = stepSpec(2).share, ratio = on.dealt / after.dealt;
  assert.ok(Math.abs(ratio - F.beatShare) < .05, `on the beat ${on.dealt} vs off ${after.dealt}: ×${F.beatShare}`);
  assert.ok(after.dealt > 0 && jab > 0);
  // too early inside the gate: refused (dropped or held over), as before
  const { g, clock } = arena({ echoes: 0 }); tap(g, clock); assert.equal(g.fistPress(g.fistBeat.opens - GATE * .9, { x: 1, y: 0 }), false); assert.equal(g.fistQueued, null);
});

test('a charge started in the window is perfect: it carries the beat, and let go in its own perfect window it is the rhythm blow', () => {
  const charge = (onBeat, heldMs) => {
    const { g, clock } = arena(); tap(g, clock); until(g, clock, g.fistBeat.opens - 100);
    const b = g.fistBeat; if (onBeat) until(g, clock, b.opens); else until(g, clock, b.closes + 20);
    const before = lost(g); frame(g, clock, true, true); const c = g.fistCharge; assert.ok(c, 'charging the jab');
    const flagged = c.onBeat === true, flash = g.fistFlash?.at === c.start;
    while (clock.t - c.start < heldMs) frame(g, clock, false, true); frame(g, clock);
    return { flagged, flash, dealt: landed(g, clock, before), msg: g.message, perfect: g.player.attackVisual.fistPerfect === true };
  };
  const power = arena().g.fistPower(), J = stepSpec(2);
  const rhythm = charge(true, HOLD), offRhythm = charge(false, HOLD), shortOn = charge(true, 300), shortOff = charge(false, 300);
  assert.equal(rhythm.flagged, true); assert.equal(rhythm.flash, true, 'the ring flashes as the hold starts'); assert.equal(offRhythm.flagged, false); assert.equal(offRhythm.flash, false);
  assert.match(rhythm.msg, /Perfect rhythm/); assert.equal(rhythm.perfect, true); assert.match(offRhythm.msg, /Perfect!/); assert.doesNotMatch(offRhythm.msg, /rhythm/);
  // the foe's defence scales both alike: compare them (each within its own rounding)
  const want = (J.share * F.beatShare + F.rhythmBonus) / ((J.share + J.chargeShare) * F.perfectShare);
  assert.ok(Math.abs(rhythm.dealt / offRhythm.dealt - want) < .01 * want, `the on-beat tap plus the rhythm bonus: ${rhythm.dealt} vs ${offRhythm.dealt} (power ${power.toFixed(1)})`);
  assert.ok(Math.abs(shortOn.dealt / shortOff.dealt - F.beatShare) < .05, 'a short charge started on the beat carries the beat share');
  assert.ok(rhythm.dealt > offRhythm.dealt * 2);
});

// The four ways to play, with the real loop at 60 fps on one foe that never dies; damage per second in units of the fists' power.
const opens = (g) => g.fistBeat ? g.fistBeat.opens : (g.fistRecoverUntil || 0);
const charger = (offset) => (g, t, st) => {
  if (st.holding) { if (g.fistCharge) { st.seen = true; if (t - g.fistCharge.start >= HOLD) { st.holding = false; return [false, false]; } return [false, true]; }
    if (st.seen || t - st.at > 400) { st.holding = false; st.seen = false; } else return [false, true]; }
  const o = opens(g); if (t >= o + offset && st.last !== o) { st.last = o; st.holding = true; st.seen = false; st.at = t; return [true, true]; }
  return [false, false];
};
const masher = (every) => (g, t, st) => { st.i = (st.i || 0) + 1; const p = st.i % every === 0; return [p, p]; };
const taps = (g, t, st) => { const o = opens(g), ok = !g.fistCharge && t >= o && st.last !== o; if (ok) st.last = o; return [ok, false]; };
const mixed = (charged) => { const c = charger(0); return (g, t, st) => { if (st.holding || g.fistCharge || charged.includes(g.fistNextStep(t))) return c(g, t, st); return taps(g, t, st); }; };
function dps(play, { awakened = true, seconds = 30 } = {}) {
  const { g, clock } = arena({ awakened }), st = {};
  const run = (secs) => { for (let i = 0; i < Math.round(secs / DT); i++) { const [press, held] = play(g, clock.t, st); frame(g, clock, press, held); } };
  run(3); const hp = g.enemies[0].hp; run(seconds);
  for (const e of g.effects) assert.ok(Number.isFinite(e.damage ?? 0), 'no NaN');
  return { dps: (hp - g.enemies[0].hp) / seconds / g.fistPower(), effects: g.effects.length };
}

test('damage per second: the perfect charge rhythm is the clear top; perfect taps beat mashing; off-rhythm charging is no better than perfect taps', () => {
  for (const awakened of [true, false]) {
    const mash = Math.max(...[1, 2, 3, 4, 5, 6].map((n) => dps(masher(n), { awakened }).dps)), tap = dps(taps, { awakened }).dps, rhythm = dps(charger(0), { awakened }).dps;
    const off = Math.max(...[-60, -20, GATE * (F.beat[1] - F.beat[0]) + 20, 150].map((o) => dps(charger(o), { awakened }).dps));
    const best = Math.max(mash, tap), edge = rhythm / best;
    assert.ok(tap > mash, `${awakened ? 'awakened' : 'unawakened'}: perfect taps ${tap.toFixed(2)} beat mashing ${mash.toFixed(2)}`);
    assert.ok(edge >= 1.15 && edge <= 1.35, `${awakened ? 'awakened' : 'unawakened'}: rhythm ${rhythm.toFixed(2)} is ${((edge - 1) * 100).toFixed(1)}% above ${best.toFixed(2)}`);
    assert.ok(off <= tap, `off-rhythm charging ${off.toFixed(2)} is no better than perfect taps ${tap.toFixed(2)}`);
    // mashing is not made worse: the measured rates before the rhythm (r953 pending: 8.37, 8.66, 8.92 awakened at every 2, 3, 6 frames)
    if (awakened) for (const [n, was] of [[2, 8.37], [3, 8.66], [6, 8.92]]) assert.ok(dps(masher(n)).dps >= was - .01, `mashing every ${n} frames`);
    // no mix of charged and tapped steps beats charging every move
    for (const charged of [[1, 2], [3, 4], [1], [3]]) assert.ok(dps(mixed(charged), { awakened }).dps < rhythm, `charging only ${charged}`);
  }
});

test('mashing for 60 s stays bounded and finite', () => {
  const r = dps(masher(2), { seconds: 60 }); assert.ok(Number.isFinite(r.dps) && r.dps > 0); assert.ok(r.effects < 20, `${r.effects} effects`);
});

// A canvas that records the arcs it fills and strokes (centres and the style in force).
function recorder() {
  const arcs = []; let path = [];
  const ctx = { globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', setLineDash() {}, beginPath() { path = []; }, moveTo() {}, lineTo() {}, closePath() {}, fillRect() {}, strokeRect() {}, ellipse() {},
    arc(x, y, r) { path.push([x, y, r]); }, fill() { for (const a of path) arcs.push({ x: a[0], y: a[1], r: a[2], fill: ctx.fillStyle, kind: 'fill' }); }, stroke() { for (const a of path) arcs.push({ x: a[0], y: a[1], r: a[2], stroke: ctx.strokeStyle, kind: 'stroke' }); } };
  return { ctx, arcs };
}
function drawAt(g, now, presentation = {}, closeView = false) {
  const { ctx, arcs } = recorder(), saved = g.effects, last = g.lastUpdateNow, pres = g.presentation; g.effects = []; g.lastUpdateNow = now; g.presentation = { ...(pres || {}), ...presentation };
  try { drawBrawler(ctx, g, (q) => [(q.x - g.player.x) * 40, (q.y - g.player.y) * 40], 40, 0, closeView ? {} : null); } finally { g.effects = saved; g.lastUpdateNow = last; g.presentation = pres; }
  return arcs;
}
const centre = (g, closeView = false) => [.5 * 40, (closeView ? FIST_STEP_VIEW.footY : FIST_STEP_VIEW.bodyY) * 40];
const ball = (arcs) => arcs.find((a) => a.kind === 'fill' && (a.fill === FIST_STEP_VIEW.fist || a.fill === FIST_STEP_VIEW.glow) && Math.abs(a.r - FIST_STEP_VIEW.size * 40 * (a.fill === FIST_STEP_VIEW.glow ? 1.25 : 1)) < 1e-6);

test('drawn: out along the blow, home at the centre with a glow through the window, gone after it; reduced motion and safe mode keep the cue', () => {
  const { g, clock } = arena({ echoes: 0 }); tap(g, clock); const b = g.fistBeat, [cx, cy] = centre(g);
  const out = ball(drawAt(g, b.at + (b.opens - b.at) * FIST_STEP_VIEW.strike)); assert.ok(out && out.fill === FIST_STEP_VIEW.fist); assert.ok(Math.hypot(out.x - cx, out.y - cy) > 20, 'out toward the foe');
  for (const closeView of [false, true]) for (const presentation of [{}, { reduceMotion: true }, { safeMode: true }]) {
    const [hx, hy] = centre(g, closeView), before = ball(drawAt(g, b.opens - 1, presentation, closeView)); assert.ok(before.fill === FIST_STEP_VIEW.fist, 'not yet home');
    for (const t of [b.opens, (b.opens + b.closes) / 2, b.closes]) {
      const arcs = drawAt(g, t, presentation, closeView), q = ball(arcs); assert.ok(q, `${JSON.stringify(presentation)} ${t}`); assert.equal(q.fill, FIST_STEP_VIEW.glow, 'glowing');
      assert.ok(Math.abs(q.x - hx) < 1e-9 && Math.abs(q.y - hy) < 1e-9, closeView ? 'under the hero\'s feet' : 'at the centre');
      assert.ok(arcs.some((a) => a.kind === 'stroke' && a.stroke === FIST_STEP_VIEW.glow), 'the halo');
    }
    assert.equal(ball(drawAt(g, b.closes + 1, presentation, closeView)), undefined, 'gone after the window');
  }
  // the flash: a ring on a press on the beat, still (no spread) with reduced motion
  until(g, clock, b.opens); tap(g, clock); const f = g.fistFlash; assert.ok(f);
  const ring = (p, k) => drawAt(g, f.at + F.flashMs * k, p).filter((a) => a.kind === 'stroke' && a.stroke === FIST_STEP_VIEW.glow && Math.abs(a.x - cx) < 1e-9).map((a) => a.r);
  assert.ok(Math.max(...ring({}, .8)) > Math.max(...ring({}, .1)), 'it spreads'); assert.deepEqual(ring({ reduceMotion: true }, .1).sort(), ring({ reduceMotion: true }, .8).sort(), 'reduced motion: no spread');
  assert.equal(drawAt(g, f.at + F.flashMs + 300).length, 0, 'nothing once the flash and the window are over');
});

test('exact resume: a pause shifts the window and the ball together; a reload starts the chain (and its beat) afresh at schema 14', () => {
  assert.deepEqual(GAME_NESTED_CLOCKS.fistBeat, ['at', 'opens', 'closes']); assert.deepEqual(GAME_NESTED_CLOCKS.fistFlash, ['at']);
  const { s, g, clock } = arena({ echoes: 0 }); tap(g, clock); until(g, clock, g.fistBeat.at + 120);
  const b = { ...g.fistBeat }, mid = clock.t, sample = { ...fistBallAt(mid - b.at, b.opens - b.at, b.closes - b.at) };
  g.setPaused(true, mid); g.setPaused(false, mid + 7000);
  assert.equal(g.fistBeat.at, b.at + 7000); assert.equal(g.fistBeat.opens, b.opens + 7000); assert.equal(g.fistBeat.closes, b.closes + 7000); assert.equal(g.fistRecoverUntil, g.fistBeat.opens, 'still opening with the gate');
  const resumed = fistBallAt(mid + 7000 - g.fistBeat.at, g.fistBeat.opens - g.fistBeat.at, g.fistBeat.closes - g.fistBeat.at);
  assert.equal(resumed.home, sample.home); for (const k of ['along', 'side']) assert.ok(Math.abs(resumed[k] - sample[k]) < 1e-9, `the ball resumes where it was (${k})`);
  clock.t = mid + 7000; until(g, clock, g.fistBeat.opens); g.lastUpdateNow = clock.t; tap(g, clock); assert.match(g.message, /Perfect timing/, 'the window still counts after the pause');
  const save = assembleSave(...Object.values(splitSnapshot(snapshotSave(s)))), text = JSON.stringify(save), back = new Game(save, clock.t);
  assert.equal(save.version, 14); for (const k of ['fistBeat', 'fistFlash', 'onBeat']) assert.equal(text.includes(`"${k}"`), false, k);
  assert.ok(!back.fistBeat && !back.fistFlash); back.lastUpdateNow = clock.t; assert.equal(back.fistNextStep(clock.t), 1);
  // a dodge or a cast drops the beat with the chain
  g.player.stamina = 100; frame(g, clock, false); assert.ok(g.fistBeat); g.cancelFists(clock.t); assert.equal(g.fistBeat, null); assert.equal(g.fistFlash, null);
});
