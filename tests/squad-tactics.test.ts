// Squad tactics for ordinary creatures (Tim, 2026-11-15; src/squad-tactics.ts): roles from each family's strengths, places in a
// formation (front, flanks, an encircling swarm, casters behind with a clear line), pressure and punish windows, blows that may
// land together (the combo window), pack courage, a longer tell from behind, the surround caps (never below 975's), a caster's
// fall back, determinism, no effect without a board, resume, the phone budget and the difficulty harness: clearly harder, and
// a moving, dodging, prioritising Wayfarer takes far less than a careless or standing one (tests/squad-tactics-harness.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { TACTICS, tacticRole, tacticsAllow, tacticsWindup, tacticsHurtWindow, createTactics, baseCaps } from '../src/squad-tactics.ts';
import { BEHAVIOUR, behaviourProfile, createSquad, squadFrame, holdsToken } from '../src/enemy-behaviour.ts';
import { resetPackRuntime } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { flatWorld, spawn, frame, busyByPool } from './enemy-behaviour-harness.ts';
import { COMPOSITIONS, LEVELS, squadWorld, squadFight, standStill } from './squad-tactics-harness.ts';

const run = (w, seconds, each = null) => { for (let t = 0; t < seconds; t += w.dt) { frame(w); each?.(w, t); } };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const offFront = (e, P, front) => { const a = Math.atan2(e.y - P.y, e.x - P.x) - front; return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI; };
const group = (w, comp) => { const P = w.player; for (const [k, dx, dy] of comp) spawn(w, k, P.x + dx, P.y + dy, { aggro: true }); return w; };
const withBhv = (e) => { Object.defineProperty(e, 'bhv', { value: { v: BEHAVIOUR.version, wait: 0, press: 0, comboLeft: 0, rest: 0, arrive: 0 }, writable: true, enumerable: false, configurable: true }); return e; };

test('the table: every family and kind names a known role; the Gaunt, adventure creatures, the Saint and anything without a profile have none', () => {
  const roles = new Set(Object.keys(TACTICS.roles));
  for (const [family, role] of Object.entries(TACTICS.families)) { assert.ok(BEHAVIOUR.families[family], family); assert.ok(role === null || roles.has(role), `${family}: ${role}`); }
  for (const [kind, role] of Object.entries(TACTICS.kinds)) { assert.ok(BEHAVIOUR.kinds[kind], kind); assert.ok(role === null || roles.has(role), `${kind}: ${role}`); }
  const role = (k) => tacticRole(createCombatant(k, 5, 5));
  assert.equal(role('thunderhorn'), 'front'); assert.equal(role('mirrorShade'), 'front'); assert.equal(role('riftLynx'), 'flank'); assert.equal(role('ashenHound'), 'flank');
  assert.equal(role('pallidCrawler'), 'swarm'); assert.equal(role('ashling'), 'swarm'); assert.equal(role('lumenWraith'), 'ranged'); assert.equal(role('sparkWarden'), 'ranged'); assert.equal(role('veilSpinner'), 'ranged');
  for (const k of ['gauntDuelist', 'lamplighter', 'weepingSaint', 'graveLantern', 'morphingBlob', 'wildStego']) assert.equal(role(k), null, k);
  assert.equal(tacticRole({ ...createCombatant('riftLynx', 5, 5), boss: true }), null, 'never a boss');
  assert.equal(tacticRole({ ...createCombatant('riftLynx', 5, 5), eliteId: 'x' }), null, 'never an elite');
  for (const k of ['melee', 'swarm', 'ranged']) assert.ok(TACTICS.tokens[k].max >= baseCaps()[k], `the surround never goes below 975 (${k})`);
  assert.ok(TACTICS.hurt.stack >= 2 && TACTICS.hurt.iframes > 0, 'a combo of blows, then a window');
});

test('no board, no tactics: without a squad board nothing is made; with the tactics part switched off no record is kept and the hurt window is the game\'s', () => {
  const w = flatWorld({ squad: false }); group(w, COMPOSITIONS.mixed); run(w, 3);
  for (const e of w.enemies) { assert.equal(e.bhv, undefined); assert.equal(tacticsHurtWindow(e, w.now, 700, w.player), 700); }
  const w2 = flatWorld(); w2.squad.tac = null; group(w2, COMPOSITIONS.mixed); run(w2, 3);
  for (const e of w2.enemies) { assert.equal(e.bhv?.tac, undefined, e.kind); assert.equal(tacticsHurtWindow(e, w2.now, 700, w2.player), 700); }
  assert.equal(tacticsHurtWindow({ boss: true, kind: 'riftLynx' }, 0, 700, {}), 700, 'bosses and every other source keep their window');
});

test('roles are assigned in a mixed pack and every engaged member gets a place each frame', () => {
  const w = flatWorld(); w.player.inv = Infinity; group(w, COMPOSITIONS.mixed); run(w, 2);
  for (const e of w.enemies) { const t = e.bhv?.tac; if (!tacticRole(e)) continue; assert.ok(t, e.kind); assert.equal(t.role, tacticRole(e)); assert.equal(t.frame, w.squad.tac.frame, `${e.kind} placed this frame`); assert.ok(Number.isFinite(t.slot)); }
  const counts = {}; for (const e of w.enemies) { const r = tacticRole(e); if (r) counts[r] = (counts[r] || 0) + 1; }
  assert.ok(counts.front >= 2 && counts.flank >= 3 && counts.ranged >= 2, JSON.stringify(counts));
});

test('flankers reach the sides and back of the front line; the 975 ring leaves them in front', () => {
  const comp = [['thunderhorn', 4, 0], ['mirrorShade', 4, 1.5], ['riftLynx', 4, -1], ['ashenHound', 4.5, 1], ['crystalCrab', 5, -.5]];
  const measure = (tactics) => {
    const w = flatWorld(); const P = w.player; P.inv = Infinity; if (!tactics) w.squad.tac = null; group(w, comp); let n = 0, off = 0, side = 0;
    run(w, 16, (w, t) => {
      if (t < 4) return; let fx = 0, fy = 0; for (const e of w.enemies) if (behaviourProfile(e)?.family === 'brute' || behaviourProfile(e)?.family === 'humanoid') { fx += (e.x - P.x) / (dist(e, P) || 1); fy += (e.y - P.y) / (dist(e, P) || 1); }
      const front = Math.atan2(fy, fx);
      for (const e of w.enemies) if (behaviourProfile(e)?.family === 'beast' && !holdsToken(e)) { const a = offFront(e, P, front); n++; off += a; if (a >= 90) side++; }
    });
    return { mean: off / n, beside: side / n };
  };
  const before = measure(false), after = measure(true);
  assert.ok(after.mean >= 95 && after.beside >= .55, `flankers ${after.mean.toFixed(0)} deg off the front, ${(after.beside * 100).toFixed(0)}% beside or behind (975: ${before.mean.toFixed(0)} deg)`);
  assert.ok(after.mean > before.mean + 20, `farther round than the 975 ring (${after.mean.toFixed(0)} vs ${before.mean.toFixed(0)})`);
});

test('a swarm encircles: spread evenly round the Wayfarer instead of queueing on one side, and led round to where it heads', () => {
  const comp = Array.from({ length: 10 }, (_, i) => ['pallidCrawler', 4 + (i % 3) * .3, (i - 5) * .3]);
  const widest = (tactics) => {
    const w = flatWorld(); const P = w.player; P.inv = Infinity; if (!tactics) w.squad.tac = null; group(w, comp); let sum = 0, n = 0; const angles = [];
    run(w, 12, (w, t) => { if (t < 4) return; angles.length = 0; for (const e of w.enemies) if (dist(e, P) > .2) angles.push(Math.atan2(e.y - P.y, e.x - P.x)); if (angles.length < 3) return; angles.sort((a, b) => a - b); let g = 0; for (let i = 0; i < angles.length; i++) g = Math.max(g, (i + 1 < angles.length ? angles[i + 1] : angles[0] + 2 * Math.PI) - angles[i]); sum += g * 180 / Math.PI; n++; });
    return n ? sum / n : 360; // the 975 brood pile onto one spot (no ring at all)
  };
  const after = widest(true), before = widest(false);
  assert.ok(after < 100, `widest gap in the ring ${after.toFixed(0)} deg (975: ${before.toFixed(0)})`);
  assert.ok(after < before, `tighter than the 975 queue (${after.toFixed(0)} vs ${before.toFixed(0)})`);
  // led round: the Wayfarer runs east; one place turns into its escape lane
  const s = createSquad(), P = { x: 0, y: 0, hp: 100 }, crawlers = Array.from({ length: 4 }, (_, i) => Object.assign(createCombatant('pallidCrawler', -3, i - 1.5), { id: `c${i}`, aggro: true }));
  for (const e of crawlers) Object.defineProperty(e, 'bhv', { value: { v: BEHAVIOUR.version, wait: 0, press: 0, comboLeft: 0, rest: 0, arrive: 0 }, writable: true, enumerable: false, configurable: true });
  for (let i = 0; i < 30; i++) { P.x += .1; squadFrame(s, crawlers, P, i * 33, 1 / 30); }
  const east = (e) => Math.abs(Math.atan2(Math.sin(e.bhv.tac.slot), Math.cos(e.bhv.tac.slot))) * 180 / Math.PI;
  assert.ok(Math.min(...crawlers.map(east)) < 1, `a place right in its escape lane, east (${Math.min(...crawlers.map(east)).toFixed(1)} deg off)`);
  for (let i = 0; i < 30; i++) squadFrame(s, crawlers, P, 1000 + i * 33, 1 / 30); // it stops: the ring settles back
  assert.ok(Math.min(...crawlers.map(east)) > 5, 'standing still, no slot is pinned to the east');
});

test('casters keep their distance behind the front line and never take a shot through a friend', () => {
  const w = flatWorld(); const P = w.player; P.inv = Infinity; group(w, [['thunderhorn', 3, 0], ['mirrorShade', 3, 1.5], ['lumenWraith', 3.5, .2], ['siegeBeetle', 3.6, -.3], ['sparkWarden', 3.2, .5]]);
  const casters = w.enemies.filter((e) => tacticRole(e) === 'ranged'); let n = 0, far = 0;
  run(w, 14, (w, t) => { if (t < 4) return; for (const e of casters) { n++; far += dist(e, P); } });
  assert.ok(far / n >= 3.6, `casters hold ${(far / n).toFixed(2)} tiles`);
  // a friend in the line of fire: the shot is held and the caster steps aside until its line is clear
  const w2 = flatWorld(); const Q = w2.player; Q.inv = Infinity; const wall = spawn(w2, 'thunderhorn', Q.x + 2.4, Q.y, { aggro: true }); wall.pack.gap = 99; wall.pack.cd = { ramCharge: 99, shockwave: 99, bite: 99 };
  const caster = spawn(w2, 'lumenWraith', Q.x + 4.8, Q.y, { aggro: true }); run(w2, 1.2);
  let blockedSeen = false, clearAt = -1, shotWhileBlocked = 0, lastSeq = caster.pack.seq;
  run(w2, 6, (w, t) => { const tac = caster.bhv.tac; wall.x = Q.x + 2.4; wall.y = Q.y; if (tac.blocked) blockedSeen = true; else if (blockedSeen && clearAt < 0) clearAt = t;
    if (caster.pack.seq !== lastSeq) { lastSeq = caster.pack.seq; if (tac.blocked && caster.pack.rangedPool) shotWhileBlocked++; } });
  assert.ok(blockedSeen, 'it saw the friend in its line'); assert.ok(clearAt >= 0 && clearAt < 3, `and stepped clear (${clearAt.toFixed(2)} s)`); assert.equal(shotWhileBlocked, 0, 'no shot through a friend');
});

test('pressure and punish windows: rests are shorter; deep in a swing, just out of a dodge or drinking, a creature in reach commits at once', () => {
  const s = createSquad(), P = { x: 0, y: 0, hp: 50, maxHp: 100, dodgeUntil: 0 }, e = withBhv(Object.assign(createCombatant('riftLynx', 1.5, 0), { id: 'l', aggro: true }));
  let now = 0; const step = (swinging = false) => { now += 1000 / 30; squadFrame(s, [e], P, now, 1 / 30, swinging); };
  step(); e.bhv.rest = 1; step(); assert.equal(s.tac.punish, false); assert.ok(Math.abs(e.bhv.rest - TACTICS.aggression.rest) < 1e-9, `a fresh rest is shortened (${e.bhv.rest})`);
  e.bhv.rest -= .1; step(); assert.ok(Math.abs(e.bhv.rest - (TACTICS.aggression.rest - .1)) < 1e-9, 'once only');
  for (let i = 0; i < 6; i++) step(true); assert.equal(s.tac.punish, true, 'deep in a swing'); assert.equal(e.bhv.rest, 0, 'the rest is cut');
  for (let i = 0; i < 12; i++) step(); assert.equal(s.tac.punish, false, 'the window closes');
  P.dodgeUntil = now + 10; step(); step(); assert.equal(s.tac.punish, true, 'just out of a dodge'); for (let i = 0; i < 20; i++) step();
  assert.equal(s.tac.punish, false); P.hp += 30; step(); assert.equal(s.tac.punish, true, 'a drink');
});

test('the combo window: two blows from an activated pack may land on the same frame; then a short window, never for other sources', () => {
  const e = withBhv(Object.assign(createCombatant('riftLynx', 1, 0), { id: 'x', aggro: true })); e.bhv.tac = { role: 'flank' };
  const t0 = 50000, P0 = {}; assert.ok(tacticsHurtWindow(e, t0, 700, P0) < 0, 'the first blow opens no window'); const w2 = tacticsHurtWindow(e, t0, 700, P0); assert.equal(Object.keys(P0).length, 0, 'nothing enumerable on the Wayfarer'); assert.equal(tacticsHurtWindow(e, t0, 700, {}) < 0, true, 'each Wayfarer its own count'); assert.equal(tacticsHurtWindow(e, t0, 700), 700, 'no Wayfarer: the usual window');
  assert.ok(w2 > 0 && w2 <= TACTICS.hurt.iframes * 1000, `the second closes it (${w2} ms)`);
  // standing in a swarm: different attackers land together (within a frame), which the 975 window never allowed
  const together = (tactics) => { const w = squadWorld('swarm', 0, { tactics }); const r = standStill(w, Infinity, { limit: 20 }); let n = 0; for (let i = 1; i < w.hurts.length; i++) if (w.hurts[i].id !== w.hurts[i - 1].id && w.hurts[i].at - w.hurts[i - 1].at < 1) n++; return [n, r]; };
  const [after] = together(true), [before] = together(false);
  assert.ok(after > 0, `blows landing together (${after})`); assert.equal(before, 0, 'none with the tactics off');
});

test('readable and avoidable: no windup is shortened, a blow from behind gets a longer tell, and a dodge still clears a combo', () => {
  const s = createSquad(), P = { x: 0, y: 0, hp: 100, facing: 'right' }, a = withBhv(Object.assign(createCombatant('riftLynx', 1.5, 0), { id: 'a', aggro: true })), b = withBhv(Object.assign(createCombatant('riftLynx', -1.5, 0), { id: 'b', aggro: true }));
  squadFrame(s, [a, b], P, 1000, 1 / 30);
  assert.equal(tacticsWindup(s, a, a.bhv, .5), 0, 'in front: as it was'); assert.equal(tacticsWindup(s, b, b.bhv, .5), TACTICS.tell.rear, 'behind: a longer tell');
  for (const wd of [.1, .4, 1.2]) for (const q of [a, b]) assert.ok(tacticsWindup(s, q, q.bhv, wd) >= 0);
  // pack windups in a real fight never start shorter than their attack module (the 975 floor), with every hook on
  const w = squadWorld('hunters', 40); w.player.inv = Infinity; const seen = new Map(); let checked = 0;
  run(w, 15, () => { for (const e of w.enemies) { const p = e.pack; if (!p?.attack || p.phase !== 'windup' || seen.get(e.id) === p.seq) continue; seen.set(e.id, p.seq); checked++; assert.ok(p.t >= .3 - 1e-9 || e.heavy, `${e.kind} ${p.attack} ${p.t}`); } });
  assert.ok(checked > 10);
  // a dodge (its own i-frames) clears every blow that lands inside it, however many come together
  const w2 = squadWorld('swarm', 0); run(w2, 3); let inside = 0, outside = 0;
  for (let k = 0; k < 5; k++) { w2.player.inv = w2.now + 420; const n = w2.hurts.length; run(w2, .4); inside += w2.hurts.length - n; const m = w2.hurts.length; run(w2, 1); outside += w2.hurts.length - m; }
  assert.equal(inside, 0, 'nothing lands inside a dodge'); assert.ok(outside > 0, 'and the swarm is biting between them');
});

test('pack courage: a hurt beast with its pack about it presses on; alone it may still break off; a hurt caster falls back behind a healthy front-liner once', () => {
  const w = flatWorld(); const P = w.player; P.inv = Infinity; group(w, [['crystalCrab', 1.5, 0], ['riftLynx', 1.5, 1.5], ['riftLynx', -1.5, 0]]); run(w, 1.5);
  const crab = w.enemies[0]; crab.hp = Math.floor(crab.maxHp * .15); let retreated = false, attacks = 0, seq = crab.pack.seq;
  run(w, 6, () => { if (crab.regroup || crab.bhv.retreat > 0) retreated = true; if (crab.pack.seq !== seq) { seq = crab.pack.seq; attacks++; } });
  assert.equal(retreated, false, 'it never turns tail with its pack about it'); assert.ok(attacks >= 1, 'it keeps attacking'); assert.ok(w.squad.tac.stats.brave >= 1);
  // a caster behind a front line
  const w2 = flatWorld(); const Q = w2.player; Q.inv = Infinity; group(w2, [['mirrorShade', 3, 0], ['lumenWraith', 4.5, .5]]); w2.enemies[0].pack.gap = 1e9; run(w2, 2);
  const [cover, caster] = w2.enemies; caster.hp = Math.floor(caster.maxHp * .25); let behind = 0, frames = 0;
  run(w2, TACTICS.regroup.time - .2, (w, t) => { if (t < 1) return; frames++; if (dist(caster, Q) > dist(cover, Q) + .3) behind++; });
  assert.equal(caster.bhv.tac.regrouped, true); assert.ok(behind / frames > .5, `behind its cover ${(behind / frames * 100).toFixed(0)}% of the time`);
  run(w2, 4); assert.equal(caster.bhv.tac.regroup, 0, 'it comes back'); assert.equal(w2.squad.tac.stats.regroups, 1, 'once only');
});

test('the token caps never fall below the 975 caps; with the surround on they grow with the group', () => {
  for (const comp of ['mixed', 'swarm', 'hunters']) {
    const w = squadWorld(comp, 0); w.player.inv = Infinity; const peak = { melee: 0, swarm: 0, ranged: 0 };
    run(w, 15, (w) => { const b = busyByPool(w); for (const k of ['melee', 'swarm', 'ranged']) { assert.ok(b[k] <= w.squad.cap[k], `${comp} ${k} ${b[k]} > ${w.squad.cap[k]}`); peak[k] = Math.max(peak[k], b[k]); } });
    if (comp === 'swarm') assert.ok(peak.swarm >= 4, `the swarm presses (${peak.swarm})`);
    if (comp === 'hunters') assert.ok(peak.melee >= 2, `the hunters press (${peak.melee})`);
  }
  const was = TACTICS.surround; TACTICS.surround = true;
  try {
    const s = createSquad(), crawlers = Array.from({ length: 12 }, (_, i) => withBhv(Object.assign(createCombatant(i % 2 ? 'pallidCrawler' : 'riftLynx', i, 0), { id: `c${i}`, aggro: true })));
    squadFrame(s, crawlers, { x: 0, y: 0 }, 0, 1 / 30);
    assert.equal(s.cap.melee, TACTICS.tokens.melee.max); assert.equal(s.cap.swarm, Math.min(TACTICS.tokens.swarm.max, TACTICS.tokens.swarm.base + 3));
    for (const k of ['melee', 'swarm', 'ranged']) assert.ok(s.cap[k] >= baseCaps()[k] || s.engaged[k] === 0);
  } finally { TACTICS.surround = was; }
});

test('determinism: the same fight twice is the same fight', () => {
  const once = () => { const w = squadWorld('mixed', 40, { shift: .37 }); const r = squadFight(w, 'mid', { limit: 25, model: 'skilled' }); return JSON.stringify([r, w.enemies.map((e) => [e.x, e.y, e.hp, e.bhv?.tac?.slot, e.bhv?.tac?.regroup]), w.squad.tac.stats]); };
  assert.equal(once(), once());
});

test('resume: nothing tactical is saved; a reloaded fight re-derives every role and place within a frame', () => {
  const w = squadWorld('mixed', 0); w.player.inv = Infinity; run(w, 6);
  const saved = JSON.parse(JSON.stringify(w.enemies));
  for (const e of saved) { assert.equal('bhv' in e, false); assert.equal('tac' in e, false); }
  assert.equal(JSON.stringify(saved).includes('"slot"'), false);
  const w2 = flatWorld(); Object.assign(w2.player, { x: w.player.x, y: w.player.y, inv: Infinity }); w2.now = w.now; w2.enemies = saved.map((e) => (e.packKind ? resetPackRuntime(e) : e));
  frame(w2); frame(w2);
  for (const e of w2.enemies) if (tacticRole(e)) { assert.ok(e.bhv?.tac, e.kind); assert.equal(e.bhv.tac.frame, w2.squad.tac.frame); }
  run(w2, 6, (w) => { const b = busyByPool(w); for (const k of ['melee', 'swarm', 'ranged']) assert.ok(b[k] <= w.squad.cap[k]); });
});

test('the phone budget: 40 creatures with tactics cost about what the 975 board did, and the board never grows', () => {
  const soak = (tactics) => { const w = flatWorld({ size: 60, player: { x: 30, y: 30 } }); if (!tactics) w.squad.tac = null; w.player.inv = Infinity; const kinds = ['pallidCrawler', 'riftLynx', 'crystalCrab', 'ashling', 'glassMite', 'veilSpinner', 'lumenWraith', 'thunderhorn', 'mirrorShade', 'sparkWarden'];
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 3 + (i % 5); spawn(w, kinds[i % kinds.length], 30 + Math.cos(a) * r, 30 + Math.sin(a) * r, { aggro: true }); }
    let frames = 0; const t0 = performance.now(); run(w, 10, () => { frames++; }); return { ms: (performance.now() - t0) / frames, w };
  };
  soak(true); soak(false);
  const best = (tactics) => { let r = soak(tactics); for (let i = 0; i < 2; i++) { const q = soak(tactics); if (q.ms < r.ms) r = q; } return r; }; // the best of three: a busy machine is not the phone budget
  const before = best(false), after = best(true), T = after.w.squad.tac;
  assert.ok(after.ms < 4, `a frame of 40 creatures costs ${after.ms.toFixed(3)} ms (975 board ${before.ms.toFixed(3)} ms)`);
  assert.ok(after.ms < before.ms * 1.6 + .3, `within reach of the 975 cost (${after.ms.toFixed(3)} vs ${before.ms.toFixed(3)} ms)`);
  for (const k of Object.keys(T.roles)) { assert.equal(T.roles[k].e.length, TACTICS.rankCap); assert.ok(T.roles[k].n <= TACTICS.rankCap); }
  assert.equal(Object.keys(createTactics().roles).length, 4);
});

test('difficulty: clearly harder for a careless or standing Wayfarer; one who moves, dodges and kills priority targets takes far less', () => {
  const tot = {}; const add = (k, r) => { const c = (tot[k] ||= { taken: 0, time: 0 }); c.taken += r.taken; c.time += r.time; };
  for (const comp of Object.keys(COMPOSITIONS)) for (const L of LEVELS) for (const tactics of [false, true]) {
    const tag = tactics ? 'after' : 'before';
    for (const model of ['careless', 'skilled']) { const r = squadFight(squadWorld(comp, L.ring, { tactics, shift: .81 }), L.build, { limit: 180, model }); assert.ok(r.cleared, `${comp} ${L.build} ${model} cleared`); add(`${tag}:${model}`, r); }
    add(`${tag}:stand`, standStill(squadWorld(comp, L.ring, { tactics, shift: .81 }), Infinity, { limit: 20 }));
  }
  const dpm = (k) => tot[k].taken / tot[k].time * 60, rise = (m) => dpm(`after:${m}`) / dpm(`before:${m}`);
  assert.ok(rise('stand') >= 1.6, `standing still costs much more (x${rise('stand').toFixed(2)})`);
  assert.ok(rise('careless') >= 1.3, `fighting carelessly costs clearly more (x${rise('careless').toFixed(2)})`);
  assert.ok(dpm('after:skilled') <= dpm('after:careless') * .7, `skill decides: skilled ${dpm('after:skilled').toFixed(0)} vs careless ${dpm('after:careless').toFixed(0)} DPM`);
  assert.ok(rise('skilled') < rise('careless') && rise('skilled') < 1.8, `a skilled player feels it least (x${rise('skilled').toFixed(2)})`);
});
