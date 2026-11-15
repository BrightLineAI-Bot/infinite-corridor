// The Quandrix Staff's let-go hand (Tim, 2026-11-14; quandrix-staff.ts QUANDRIX.release, slam.burst.released): letting go of
// Attack before the Mage's Hand fist or the awakened slam (or the suction cup) has finished its charge no longer ends it. The
// hand stays live where it is and goes on as while held (grabbing, dragging, ticking, pulling, reeled toward the Wayfarer) on
// the same charge clock, then bursts where it is, home or not, for the full charge's burst. A slam let go in the gold window
// still bursts at once for the perfect burst. The Wayfarer is free at once (a press casts a plain hand), the hand resumes
// exactly after a reload (playerRuntime.quandrixHold), and every pool stays bounded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant, wayfarerDamage } from '../src/combat.ts';
import { QUANDRIX_STAFF } from '../src/items.ts';
import { QUANDRIX, latestHand, liveHands, slamWindow, savedQuandrixHold, normalizeQuandrixHold, drawQuandrix } from '../src/quandrix-staff.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';

const F = QUANDRIX.fist, S = QUANDRIX.slam, U = QUANDRIX.suction, KEY = `field:${QUANDRIX.passive}`;
const staff = (power = 15) => ({ id: 'primary-qs-test', name: QUANDRIX_STAFF.name, slot: 'primary', power, basePower: power, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [] });
const MAGIC = { Might: 1, Finesse: 1, Focus: 11, Vigor: 5, Resolve: 1 };
function arena(foes = [], { mageHand = false, awakened = false, blocked = [] } = {}) {
  const s = freshSave(); s.seed = 'QUANDRIX-RELEASE'; s.level = 15; s.stats = { ...s.stats, ...MAGIC }; s.equipment.primary = staff();
  if (awakened) s.equipment.primary.awakened = { resonance: 'x', version: 1 };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); if (mageHand) s.lattice.passives = [KEY];
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: blocked.includes(i % 32) ? 'wall' : 'ash', blocked: blocked.includes(i % 32) })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra || {}));
  return { s, g };
}
const frame = (g, t, held, move = { x: 0, y: 0 }) => { g.player.invulnerableUntil = t + 1e6; g.update(.02, { state: move, consume: () => false, held: (k) => k === 'attack' && held }, t); };
// Frames from `from` to `to` (ms); `held` and `move` may be functions of the time; `each` sees every frame.
function run(g, from, to, held = false, move = { x: 0, y: 0 }, each = null) {
  let t = from;
  for (; t < to; t += 20) { frame(g, t, typeof held === 'function' ? held(t) : held, typeof move === 'function' ? move(t) : move); if (each) each(t); }
  return t;
}
const taken = (e) => 1e6 - e.hp;
const press = (g, t, action = 'attack') => { g.attackAction = action; try { return g.primaryAttack(t, { x: 1, y: 0 }); } finally { g.attackAction = null; } };
// A tap (a hand drifts out `driftMs`), then a press held until the hold begins: returns the time and the hold.
function begin(g, driftMs) {
  let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + driftMs);
  g.player.attackReadyAt = 0; press(g, t); for (let i = 0; i < 40 && !g.quandrix.hold.on; i++) { frame(g, t, true); t += 20; }
  assert.ok(g.quandrix.hold.on, 'the hold began'); return t;
}
// Runs until the hold ends (or `limit` ms): the time it ended and the hand's place in its last frame.
function untilBurst(g, t, limit, held = false, move = { x: 0, y: 0 }) {
  let last = null; const end = t + limit;
  for (; t < end && g.quandrix.hold.on; t += 20) { last = { x: g.quandrix.hold.hand.x, y: g.quandrix.hold.hand.y, held: g.quandrix.hold.held }; frame(g, t, held, move); }
  return { t, last };
}

test('the data: a let-go slam bursts for the full charge\'s share; one hold at a time', () => {
  assert.equal(S.burst.released, S.burst.overcharge, 'the full charge (held to max) and a let-go slam burst alike');
  assert.ok(S.burst.released < S.burst.perfect, 'a perfect release stays the best');
  assert.equal(QUANDRIX.release.tapWhileLive, true); assert.ok(Number.isInteger(QUANDRIX.release.record));
  assert.ok(QUANDRIX.messages.released);
});

test('Mage\'s Hand let go early: the fist keeps grabbing and dragging, then bursts at its time for the full burst', () => {
  const { g } = arena([[3.4, 0]], { mageHand: true }), e = g.enemies[0];
  let t = begin(g, 900); const started = t - 20; t = run(g, t, t + 300, true);
  assert.ok(g.quandrix.hold.n >= 1, 'it holds the foe'); const before = taken(e);
  t = run(g, t, t + 20, false); const H = g.quandrix.hold;
  assert.ok(H.on && H.released, 'let go: the fist stays'); assert.equal(H.mode, 'fist'); assert.equal(taken(e), before, 'no burst on letting go');
  const x0 = e.x; t = run(g, t, t + 300, false); assert.ok(e.x < x0 - .2, `still dragged toward the Wayfarer (${x0} -> ${e.x})`); assert.equal(taken(e), before);
  const end = untilBurst(g, t, 3000);
  assert.ok(Math.abs(end.t - started - F.time * 1000) <= 60, `bursts when its time is up (${end.t - started} ms after it clenched)`);
  assert.ok(taken(e) - before >= wayfarerDamage(g.quandrixPower() * F.burst.share) * .99, 'the full burst');
  assert.ok(g.quandrix.flashes.some((f) => f.kind === 'fist' && f.life > 0)); assert.equal(g.quandrix.hold.on, false); assert.equal(g.quandrix.hold.released, false);
});

test('awakened let go early: the slam stays where it is, keeps striking, and bursts at max for the released share', () => {
  const { g } = arena([[2.3, 0]], { awakened: true }), e = g.enemies[0];
  let t = begin(g, 300); const started = t - 20, h = g.quandrix.hold.hand, hx = h.x; t = run(g, t, t + 300, true);
  assert.equal(slamWindow(g.quandrix.hold.held), 'early');
  t = run(g, t, t + 20, false); assert.ok(g.quandrix.hold.released, 'let go early: it lingers');
  const ticks0 = taken(e); t = run(g, t, t + 600, false); assert.ok(taken(e) > ticks0, 'it goes on striking under it'); assert.equal(h.x, hx, 'it stays where it slammed');
  const before = taken(e), end = untilBurst(g, t, 4000);
  assert.ok(Math.abs(end.t - started - S.max * 1000) <= 60, `bursts at its charge's end (${end.t - started} ms)`);
  assert.ok(taken(e) - before >= wayfarerDamage(g.quandrixPower() * S.burst.released) * .99, 'the full charge\'s burst');
  assert.ok(g.quandrix.flashes.some((f) => f.kind === 'released' && f.life > 0)); assert.equal(g.message, QUANDRIX.messages.released);
});

test('awakened with Mage\'s Hand let go early: the suction cup keeps pulling foes in while reeled home, then bursts', () => {
  const { g } = arena([[2.6, 0], [2.6, 1.6], [4.2, -.8]], { awakened: true, mageHand: true }), [, b, c] = g.enemies;
  let t = begin(g, 450); t = run(g, t, t + 100, true); const h = g.quandrix.hold.hand;
  t = run(g, t, t + 20, false); assert.ok(g.quandrix.hold.released && g.quandrix.hold.mode === 'suction');
  const d0 = Math.hypot(c.x + .5 - h.x, c.y + .45 - h.y), h0 = h.x; t = run(g, t, t + 800, false);
  assert.ok(h.x < h0 - .5, `still reeled toward the Wayfarer (${h0} -> ${h.x})`);
  for (const e of [b, c]) assert.ok(Math.hypot(e.x + .5 - h.x, e.y + .45 - h.y) < 1.2, `${e.id} pulled into the hand after the release`);
  assert.ok(Math.hypot(c.x + .5 - h.x, c.y + .45 - h.y) < d0);
  const end = untilBurst(g, t, 4000); assert.ok(end.t < t + 4000, 'it burst'); assert.ok(g.quandrix.flashes.some((f) => f.kind === 'released' && f.life > 0));
});

test('en route: a let-go fist far out bursts where it is when its time runs out, before it gets home', () => {
  const { g } = arena([[4.1, 0]], { mageHand: true }), e = g.enemies[0];
  let t = begin(g, 1560); t = run(g, t, t + 60, true); t = run(g, t, t + 20, false); assert.ok(g.quandrix.hold.released);
  const x0 = g.quandrix.hold.hand.x, end = untilBurst(g, t, 3000);
  assert.ok(end.last.x < x0 - .3, `it travelled toward the Wayfarer after the release (${x0} -> ${end.last.x})`);
  const burst = g.quandrix.flashes.find((f) => f.kind === 'fist' && f.life > 0), out = burst.x - (g.player.x + .5);
  assert.ok(out > F.arrive + .3, `burst ${out.toFixed(2)} tiles out, short of the Wayfarer`); assert.ok(taken(e) > 0);
  // the suction cup chasing a Wayfarer who walks away: it never arrives, and bursts where it is
  const q = arena([], { awakened: true, mageHand: true }); let u = begin(q.g, 1500); u = run(q.g, u, u + 40, true); u = run(q.g, u, u + 20, false);
  const fin = untilBurst(q.g, u, 4000, false, { x: -1, y: 0 }), far = Math.hypot(fin.last.x - (q.g.player.x + .5), fin.last.y - (q.g.player.y + .45));
  assert.ok(far > U.arrive + .3, `the cup burst ${far.toFixed(2)} tiles from her, en route`); assert.ok(q.g.quandrix.flashes.some((f) => f.kind === 'released' && f.life > 0));
});

test('a full hold is unchanged: the fist bursts at its time, the slam overcharges at max, never marked let go', () => {
  { const { g } = arena([[3.4, 0]], { mageHand: true }), e = g.enemies[0]; let t = begin(g, 900); const started = t - 20; let released = false;
    const end = (() => { for (; g.quandrix.hold.on && t < started + 3000; t += 20) { frame(g, t, true); released ||= g.quandrix.hold.released; } return t; })();
    assert.equal(released, false); assert.ok(Math.abs(end - started - F.time * 1000) <= 60); assert.ok(taken(e) >= wayfarerDamage(g.quandrixPower() * F.burst.share) * .99); }
  { const { g } = arena([[2.3, 0]], { awakened: true }); let t = begin(g, 300); const started = t - 20;
    for (; g.quandrix.hold.on && t < started + 4000; t += 20) { frame(g, t, true); assert.equal(g.quandrix.hold.released, false); }
    assert.ok(Math.abs(t - started - S.max * 1000) <= 60); assert.ok(g.quandrix.flashes.some((f) => f.kind === 'overcharge')); assert.equal(g.message, QUANDRIX.messages.overcharge); }
});

test('the gold window: letting go inside it still bursts at once for the perfect burst (slam and suction cup)', () => {
  for (const mageHand of [false, true]) {
    const { g } = arena([[2.3, 0]], { awakened: true, mageHand }), e = g.enemies[0]; let t = begin(g, 300);
    while (slamWindow(g.quandrix.hold.held) !== 'perfect') { frame(g, t, true); t += 20; }
    t = run(g, t, t + 60, true); assert.equal(slamWindow(g.quandrix.hold.held), 'perfect');
    const before = taken(e); frame(g, t, false);
    assert.equal(g.quandrix.hold.on, false, 'it burst on the release'); assert.ok(g.quandrix.flashes.some((f) => f.kind === 'perfect'));
    assert.equal(g.message, QUANDRIX.messages.perfect); assert.ok(taken(e) - before >= wayfarerDamage(g.quandrixPower() * S.burst.perfect) * .99);
  }
  // a late release (past the window) is not perfect: it lingers to max like any other let-go slam
  const { g } = arena([[2.3, 0]], { awakened: true }); let t = begin(g, 300);
  while (slamWindow(g.quandrix.hold.held) !== 'late') { frame(g, t, true); t += 20; }
  frame(g, t, false); assert.ok(g.quandrix.hold.on && g.quandrix.hold.released);
});

test('the Wayfarer is free once she lets go: she moves, casts plain hands, and a held press never makes a second hold', () => {
  const { g } = arena([[3.4, 0]], { mageHand: true }); let t = begin(g, 900); t = run(g, t, t + 100, true); t = run(g, t, t + 20, false);
  const H = g.quandrix.hold, fistHand = H.hand; assert.ok(H.released);
  const x0 = g.player.x; t = run(g, t, t + 200, false, { x: 0, y: 1 }); assert.ok(g.player.y > 10.2 && Math.abs(g.player.x - x0) < .2, 'she walks');
  g.player.attackReadyAt = 0; const n = liveHands(g); press(g, t); t = run(g, t, t + 400, true);
  assert.equal(liveHands(g), n + 1, 'a held press while it lingers: a plain hand'); assert.equal(H.hand, fistHand, 'the same hold'); assert.equal(latestHand(g).mode, 'drift');
  g.player.attackReadyAt = 0; assert.ok(press(g, t, null), 'a tap too');
  // a knock-down drops a hold still held, but not a hand let go
  g.player.stunnedUntil = t + 200; t = run(g, t, t + 100, false); assert.ok(H.on && H.released, 'still lingering through a knock-down');
  const q = arena([[3.4, 0]], { mageHand: true }); let u = begin(q.g, 900); q.g.player.stunnedUntil = u + 200; run(q.g, u, u + 40, true); assert.equal(q.g.quandrix.hold.on, false, 'a held hold is lost to a knock-down, as before');
});

test('both views draw the let-go hand and its clock while it lingers', () => {
  const calls = { arc: 0, captured: 0 }, noop = () => {};
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (k === 'arc' ? () => calls.arc++ : noop), set: (o, k, v) => { o[k] = v; return true; } });
  for (const [mageHand, awakened] of [[true, false], [false, true], [true, true]]) {
    const { g } = arena([[2.4, 0]], { mageHand, awakened }); let t = begin(g, 300); t = run(g, t, t + 60, true); run(g, t, t + 100, false); assert.ok(g.quandrix.hold.released);
    const a0 = calls.arc; drawQuandrix(ctx, g, (q) => [q.x * 40, q.y * 40], 40, 1); assert.ok(calls.arc > a0, 'standard view');
    const c0 = calls.captured; drawQuandrix(ctx, g, (q) => [q.x * 40, q.y * 40], 40, 1, { captureActor: (spec) => { calls.captured++; assert.ok(spec.sample()?.kind?.startsWith('quandrix')); spec.draw(ctx, 40); return true; } });
    assert.ok(calls.captured > c0, 'Close View captures the hand');
  }
});

function roundTrip(g, now) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}
function journey(awakened, mageHand) {
  const j = freshSave(); j.seed = 'QS-RELEASE-RESUME'; j.level = 15; j.equipment.primary = staff(); if (awakened) j.equipment.primary.awakened = { resonance: 'x', version: 1 };
  j.perception.aperture = 3255; j.farArray = { listeners: 1 }; ensureLattice(j); if (mageHand) j.lattice.passives = [KEY];
  const g = new Game(j, 0); g.player.invulnerableUntil = 1e15; j.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('ashling', g.player.x + 1.3, g.player.y), { id: 'qs-held', hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] })];
  return g;
}
test('exact resume: a hand let go mid-linger reloads where it was, on its clock, with its foes, and bursts on the same frame', () => {
  for (const [awakened, mageHand] of [[false, true], [true, false], [true, true]]) {
    const g = journey(awakened, mageHand); let t = 1000; press(g, t); t = run(g, t, t + 40); t = run(g, t, t + 200);
    g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 400, true); t = run(g, t, t + 200, false); assert.ok(g.quandrix.hold.released, `${awakened}/${mageHand} lingering`);
    const saved = roundTrip(g, t), rec = saved.session.playerRuntime.quandrixHold; assert.equal(rec.v, QUANDRIX.release.record); assert.deepEqual(normalizeQuandrixHold(rec), rec, 'canonical');
    const h = new Game(saved, 90000), A = g.quandrix.hold, B = h.quandrix.hold;
    assert.ok(B.on && B.released); assert.equal(B.mode, A.mode); assert.equal(B.held, A.held); assert.equal(B.tick, A.tick); assert.equal(B.power, A.power); assert.equal(B.n, A.n);
    assert.equal(B.hand.x, A.hand.x); assert.equal(B.hand.y, A.hand.y); assert.equal(B.hand.mode, A.hand.mode);
    h.player.x = g.player.x; h.player.y = g.player.y; // the reload's own position is the save's (the same tile); held level for the comparison
    let ta = t, tb = 90000, frames = 0;
    while ((A.on || B.on) && frames < 300) {
      assert.equal(A.on, B.on, `both end on the same frame (${frames})`);
      if (A.on) { assert.ok(Math.abs(A.hand.x - B.hand.x) < 1e-9 && Math.abs(A.hand.y - B.hand.y) < 1e-9, 'the same place'); assert.ok(Math.abs(A.held - B.held) < 1e-9); }
      frame(g, ta, false); frame(h, tb, false); ta += 20; tb += 20; frames++;
    }
    assert.equal(A.on, false); assert.equal(B.on, false); assert.ok(frames > 5);
    const fa = g.quandrix.flashes.find((f) => f.life > 0 && f.kind !== 'puff'), fb = h.quandrix.flashes.find((f) => f.life > 0 && f.kind !== 'puff');
    assert.equal(fa.kind, fb.kind); assert.ok(Math.abs(fa.x - fb.x) < 1e-9 && Math.abs(fa.y - fb.y) < 1e-9, 'the same burst in the same place');
    assert.equal(savedQuandrixHold(h), null, 'nothing left to save once it burst');
  }
  // never resumed elsewhere, without the staff, or from a damaged record
  const g = journey(false, true); let t = 1000; press(g, t); t = run(g, t, t + 240); g.player.attackReadyAt = 0; press(g, t); t = run(g, t, t + 400, true); t = run(g, t, t + 40, false);
  const saved = roundTrip(g, t);
  const other = structuredClone(saved); other.session.playerRuntime.quandrixHold.where = 'dungeon:elsewhere'; assert.ok(!new Game(other, 5e4).quandrix?.hold.on);
  const bare = structuredClone(saved); bare.equipment.primary = null; assert.ok(!new Game(bare, 5e4).quandrix?.hold.on);
  for (const bad of [{ ...saved.session.playerRuntime.quandrixHold, x: 'NaN' }, { ...saved.session.playerRuntime.quandrixHold, mode: 'hammer' }, { v: 99 }, 7, null]) assert.equal(normalizeQuandrixHold(bad), null);
  const future = structuredClone(saved); future.session.playerRuntime.quandrixHold = { v: QUANDRIX.release.record + 1, opaque: true }; const fg = new Game(future, 5e4);
  assert.ok(!fg.quandrix?.hold.on); assert.deepEqual(fg.exportSnapshot(5e4).session.playerRuntime.quandrixHold, { v: QUANDRIX.release.record + 1, opaque: true }, 'a newer record kept opaque');
});

test('stress: sixty seconds of presses, holds and early releases in every mode with the cooldown wiped: bounded, finite, on time', () => {
  for (const [mageHand, awakened] of [[true, false], [false, true], [true, true]]) {
    const foes = Array.from({ length: 10 }, (_, i) => [1.5 + (i % 5) * .9, -1.5 + Math.floor(i / 5) * 3, i === 0 ? { boss: true } : {}]);
    const { g } = arena(foes, { mageHand, awakened, blocked: [17] }); let t = 1000, k = 0, lingerFrom = -1, lingers = 0, longest = 0;
    const limit = (mageHand && !awakened ? F.time : S.max) * 1000 + 60;
    for (; t < 61000; t += 20, k++) {
      g.player.attackReadyAt = 0; if (k % 3 === 0) press(g, t, k % 53 < 30 ? 'attack' : null);
      for (const e of g.enemies) if (e.dead || e.hp < 1e5) { e.dead = false; e.hp = 1e6; }
      const held = (k % 53) < 18, move = { x: Math.sin(k / 40), y: Math.cos(k / 57) }; // short holds: most let go early
      frame(g, t, held, move); g.player.x = Math.max(4, Math.min(15, g.player.x)); g.player.y = Math.max(4, Math.min(26, g.player.y));
      const K = g.quandrix; if (!K) continue; const H = K.hold;
      assert.equal(K.hands.length, QUANDRIX.hand.maxLive); assert.equal(K.flashes.length, QUANDRIX.flash.max); assert.ok(H.n <= H.grab.length && H.grab.length === Math.max(F.maxGrab, U.maxPull));
      assert.ok(K.hands.filter((h) => h.on && h.mode !== 'drift').length <= 1, 'at most one held or let-go hand');
      if (H.on) { assert.ok(H.hand?.on && H.hand.kind === 'own'); assert.ok([H.hand.x, H.hand.y, H.held, H.tick, H.power].every(Number.isFinite)); }
      if (H.on && H.released) { if (lingerFrom < 0) { lingerFrom = t; lingers++; } longest = Math.max(longest, t - lingerFrom); assert.ok(t - lingerFrom <= limit, 'a let-go hand bursts within its clock'); } else lingerFrom = -1;
      for (const h of K.hands) if (h.on) assert.ok([h.x, h.y, h.age, h.power].every(Number.isFinite) && Object.keys(h.hits).length <= g.enemies.length);
      for (const e of g.enemies) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp), `${e.id} finite`);
      if (k % 500 === 250 && H.on) { const r = savedQuandrixHold(g); assert.deepEqual(normalizeQuandrixHold(JSON.parse(JSON.stringify(r))), r); }
    }
    assert.ok(lingers >= 5, `${lingers} early releases lingered (longest ${longest} ms)`);
    assert.ok(g.projectiles.length < 8 && g.effects.length < 16, 'nothing piles up in the shared lists');
  }
});
