import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD_BEASTS, BEAST_HOMES, worldBeastFor } from '../src/world-beasts.ts';
import { NOVA_FOG, novaFogCapable, novaFog, tickNovaFog } from '../src/open-sea.ts';
import { MONSTER_PACK, ATTACK_MODULES, GIANT, updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { ECHOES } from '../src/echoes.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster, drawPackEffects } from '../src/monster-render.ts';
import { GIANT_EFFECT_KINDS, knockdownPose, GIANT_KNOCKDOWN, giantFoot, GIANT_ART } from '../src/lightning-giant-render.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

function world({ size = 32, player = { x: 16, y: 12 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 100000 }, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], stuns: [], playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source }); w.player.hp -= amount; return true; },
    stun(seconds) { w.stuns.push(seconds); }, shocks: 0, shockHit() { w.shocks++; }, slow() {}, push() {}, pull() {}, poison() {},
    added: [], addEffect(effect) { w.added.push(effect); addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
  };
  return w;
}
function giant(w, only, x = 13, y = 12) {
  const e = createCombatant('lightningGiant', x, y, true, []); Object.assign(e, { id: 'giant-1', aggro: true, hp: 5000, maxHp: 5000, damage: 40 });
  if (only) e.packAttacks = [only];
  e.giantDashCd = 1e9; // attack tests isolate the attack from traversal dashes (tested separately)
  w.enemies.push(e); return e;
}
function until(w, e, id, max = 5) { for (let t = 0; t < max && e.pack.attack !== id; t += w.dt) step(w, w.dt); assert.equal(e.pack.attack, id, `${id} starts`); }
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(); } }

test('registry: a canyon-home roaming world beast with seven attacks and its own Echo', () => {
  const B = WORLD_BEASTS.lightningGiant, def = MONSTER_PACK.lightningGiant;
  assert.equal(B.kind, 'lightningGiant'); assert.equal(B.home, 'canyon'); assert.ok(BEAST_HOMES.canyon); assert.equal(B.tries, 3);
  assert.deepEqual(def.attacks, ['giantArcs', 'giantShock', 'giantSwing', 'giantSlam', 'giantMenace', 'giantUpswing', 'giantElectrify']);
  for (const id of def.attacks) assert.ok(ATTACK_MODULES[id], id);
  assert.ok(ECHOES.lightningGiant);
  const e = createCombatant('lightningGiant', 0, 0, true, []); assert.ok(e.scale > createCombatant('voidWalker', 0, 0, true, []).scale, 'bigger than the Void Walker');
});

test('Tesla arcs link the Giant to the player and hurt only within reach', () => {
  const w = world(), e = giant(w, 'giantArcs');
  until(w, e, 'giantArcs'); step(w, ATTACK_MODULES.giantArcs.windup + .5);
  const arc = w.fx.find((f) => f.kind === 'giantArc');
  assert.ok(arc, 'arcs fire'); assert.equal(arc.connected, true); assert.deepEqual({ x: arc.tx, y: arc.ty }, { x: w.player.x, y: w.player.y });
  assert.ok(w.hurts.some((h) => h.source === 'giantArcs'));
  const far = world({ player: { x: 30, y: 30 } }), g2 = giant(far, 'giantArcs', 2, 2); g2.packAttacks = ['giantArcs'];
  far.fx.push({ kind: 'giantArc', owner: g2.id, x: g2.x, y: g2.y, range: GIANT.arcRange, tick: 0, life: 1, total: 1, damage: 5 });
  far.fx = tickPackEffects(far.fx, far);
  assert.equal(far.fx[0].connected, false); assert.equal(far.hurts.length, 0, 'out of reach: no damage');
  void e;
});

test('the shock marks the ground, then adds a pip to the shock counter when it lands', () => {
  const w = world({ player: { x: 18, y: 12 } }), e = giant(w, 'giantShock');
  until(w, e, 'giantShock'); step(w, 1);
  assert.ok(w.hurts.some((h) => h.source === 'giantShock'));
  assert.equal(w.shocks, 1);
  const dodge = world({ player: { x: 18, y: 12 } }), d = giant(dodge, 'giantShock');
  until(dodge, d, 'giantShock'); dodge.player.x += 3; step(dodge, 1);
  assert.equal(dodge.shocks, 0, 'stepping off the mark avoids it');
});

test('club swings: a forward swing then a re-aimed back-swing', () => {
  const w = world({ player: { x: 15.4, y: 12 } }), e = giant(w, 'giantSwing', 13, 12);
  until(w, e, 'giantSwing'); step(w, 1.2);
  assert.equal(w.hurts.filter((h) => h.source === 'giantSwing').length, 2);
});

test('the slam sometimes calls a delayed sky strike and sometimes throws three bolts in a tight cone at the player', () => {
  let sky = 0, cone = 0;
  for (let seq = 0; seq < 40; seq++) {
    const w = world({ player: { x: 16.5, y: 12 } }), e = giant(w, 'giantSlam', 13, 12);
    e.id = `giant-${seq}`; e.pack.seq = seq;
    until(w, e, 'giantSlam'); step(w, ATTACK_MODULES.giantSlam.windup + .1);
    if (w.added.some((f) => f.kind === 'giantSky')) sky++;
    const bolts = w.added.filter((f) => f.kind === 'giantBolt');
    if (bolts.length) {
      cone++; assert.equal(bolts.length, GIANT.coneBolts);
      for (const b of bolts) { const toward = Math.atan2(w.player.y - b.y, w.player.x - b.x), a = Math.atan2(b.vy, b.vx); assert.ok(Math.abs(a - toward) <= GIANT.coneSpread * Math.PI / 360 + .2, 'within the cone toward the player'); }
    }
    assert.ok(w.added.some((f) => f.kind === 'shock'), 'the slam ring');
  }
  assert.ok(sky > 5 && sky < 40, `sky strikes are occasional (${sky}/40)`);
  assert.ok(cone > 5 && cone < 40, `cone volleys are occasional (${cone}/40)`);
});

test('electrify: lightning strikes the raised club, then it runs fast while bolts drop around it, and it wears off', () => {
  const w = world({ player: { x: 26, y: 12 } }), e = giant(w, 'giantElectrify', 13, 12);
  until(w, e, 'giantElectrify'); step(w, ATTACK_MODULES.giantElectrify.windup + .1);
  assert.ok(w.added.some((f) => f.kind === 'giantStrike'), 'struck');
  assert.ok(e.giantCharged > 0, 'charged');
  e.packAttacks = []; const x0 = e.x; step(w, 1);
  const storms = w.added.filter((f) => f.kind === 'giantSky' && f.storm);
  assert.ok(storms.length >= 1, 'storm bolts'); for (const f of storms) assert.ok(Math.hypot(f.x - e.x, f.y - e.y) <= GIANT.stormRing[1] + 2);
  // Same Giant, same start, charged versus not: the charged one covers more ground.
  const run = (charged) => { const v = world({ player: { x: 28, y: 12 } }), g = giant(v, null, 5, 12); g.packAttacks = []; g.giantCharged = charged ? 99 : 0; const x = g.x; step(v, 1); return g.x - x; };
  assert.ok(run(true) > run(false) * 1.3, 'moves faster while charged');
  void x0;
  step(w, GIANT.chargeTime + 1); assert.equal(e.giantCharged, 0);
});

test('retreat home: at its chasm a storm cloud forms under it and carries it up', () => {
  const w = world(), e = giant(w, null); Object.assign(e, { retreating: true, untargetable: true, fleeTo: { x: e.x, y: e.y, home: true }, fleePath: [], fleeSpeed: 3, fleeFadeTime: 1.4 });
  updatePackMonster(e, w);
  assert.equal(e.giantCloud, true); assert.ok(e.fleeFade > 0 && e.fleeFade <= 1);
  for (let i = 0; i < 90 && !e.fleeDone; i++) { w.now += 33; updatePackMonster(e, w); }
  assert.equal(e.fleeDone, true, 'gone into the sky');
});

test('render: every pose, the cloud and every lightning effect draw without mutating the actor', () => {
  const calls = []; const ctx = new Proxy({ getTransform: undefined, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (o, k) => k in o ? o[k] : (...a) => calls.push(k), set: () => true });
  for (const pose of [null, 'arcs', 'point', 'pointFire', 'swingReady', 'swingFore', 'swingBack', 'slamRaise', 'slamDown', 'raise', 'menace', 'chest', 'chargeLow', 'upswing']) for (const reduceMotion of [false, true]) {
    const e = createCombatant('lightningGiant', 3, 3, true, []); Object.assign(e, { id: 'r', giantPose: pose, giantCharged: pose === 'raise' ? 2 : 0, giantAir: pose === 'upswing' ? 1.5 : 0, giantThrust: pose === 'chargeLow', reduceMotion });
    const before = JSON.stringify(e); assert.equal(drawPackMonster(ctx, e, 40, 1000, 'right'), true); assert.equal(JSON.stringify(e), before);
  }
  const cloud = createCombatant('lightningGiant', 3, 3, true, []); Object.assign(cloud, { id: 'c', giantCloud: true, fleeFade: .5 }); drawPackMonster(ctx, cloud, 40, 1000, 'right');
  for (const reduceMotion of [false, true]) { const sea = createCombatant('lightningGiant', 3, 3, true, []); Object.assign(sea, { id: 's', marine: true, reduceMotion }); const before = JSON.stringify(sea); assert.equal(drawPackMonster(ctx, sea, 40, 1000, 'right'), true); assert.equal(JSON.stringify(sea), before, 'riding its cloud at sea'); }
  const fx = [{ kind: 'giantArc', x: 1, y: 1, tx: 4, ty: 1, connected: true, life: 1 }, { kind: 'giantBolt', x: 1, y: 1, vx: 1, vy: 0, life: .5 }, { kind: 'giantShock', x: 1, y: 1, radius: 1, life: .3, total: .5 },
    { kind: 'giantSky', x: 1, y: 1, radius: 1, arming: .5, armTotal: 1, life: .4, total: .4 }, { kind: 'giantSky', x: 1, y: 1, radius: 1, arming: 0, life: .2, total: .4 }, { kind: 'giantStrike', x: 1, y: 1, life: .3, total: .5 }, { kind: 'giantChest', x: 1, y: 1, tx: 4, ty: 1, life: .2, total: .3 }];
  for (const f of fx) assert.ok(GIANT_EFFECT_KINDS.has(f.kind));
  drawPackEffects(ctx, fx, 40, 1000);
  assert.ok(calls.length > 100);
});

test('the knocked-down Wayfarer tips over, shakes, then gets back up; reduced motion does not shake', () => {
  const total = GIANT.stunTime * 1000;
  assert.equal(knockdownPose(0, total).angle, -0); assert.ok(Math.abs(knockdownPose(total / 2, total).angle + Math.PI / 2) < 1e-9);
  assert.ok(Math.abs(knockdownPose(total - 1, total).angle) < .02);
  assert.equal(knockdownPose(total / 2, total, true).shake, 0);
  assert.ok(GIANT_KNOCKDOWN.fall + GIANT_KNOCKDOWN.rise < total);
});

test('while knocked down the Wayfarer cannot move or act; the stun pauses with the game', () => {
  const save = freshSave(); save.seed = 'GIANT-STUN'; const g = new Game(save, 0);
  const consumed = []; const input = { state: { x: 1, y: 0 }, consume: (k) => { consumed.push(k); return k === 'attack'; } };
  const p = g.player; const x0 = p.x; p.stunnedAt = 1000; p.stunnedUntil = 1000 + GIANT.stunTime * 1000;
  g.update(.05, input, 1100);
  assert.equal(p.x, x0, 'no movement'); assert.ok(consumed.includes('attack') && consumed.includes('dodge'));
  g.setPaused(true, 1200); g.setPaused(false, 5200);
  assert.equal(p.stunnedUntil, 1000 + GIANT.stunTime * 1000 + 4000, 'stun timer shifts across a pause');
});

test('stun counter: every third landed lightning hit knocks the Wayfarer down briefly; club blows count only while electrified', () => {
  const save = freshSave(); save.seed = 'GIANT-COUNTER'; const g = new Game(save, 0), p = g.player;
  let now = 1000; const w = () => g.packWorld(.05, now);
  w().shockHit(); w().shockHit(); assert.equal(p.shockCount, 2); assert.ok(!(now < (p.stunnedUntil || 0)));
  w().shockHit(); assert.equal(p.shockCount, 0, 'counter resets'); assert.equal(p.stunnedUntil, now + GIANT.stunTime * 1000);
  w().shockHit(); assert.equal(p.shockCount, 0, 'no pips while down');
  now += GIANT.stunTime * 1000 + 1; w().shockHit(); assert.equal(p.shockCount, 1);
  const input = { state: { x: 0, y: 0 }, consume: () => false }; now += GIANT.shockDecay * 1000 + 100; g.update(.05, input, now);
  assert.equal(p.shockCount, 0, 'the counter fades without hits');
  // Club: plain blows add nothing; electrified blows add a pip.
  for (const charged of [false, true]) {
    const v = world({ player: { x: 15.4, y: 12 } }), e = giant(v, 'giantSwing', 13, 12); e.giantCharged = charged ? 99 : 0;
    until(v, e, 'giantSwing'); step(v, 1.2);
    assert.ok(v.hurts.some((h) => h.source === 'giantSwing')); assert.equal(v.shocks > 0, charged);
  }
});

test('menacing slam: it stalks with the club up, slams (or fires a chest bolt) only within reach, up to twice', () => {
  let slams = 0, bolts = 0;
  for (let seq = 0; seq < 12; seq++) {
    const w = world({ player: { x: 20, y: 12 } }), e = giant(w, 'giantMenace', 13, 12); e.id = `menace-${seq}`; e.pack.seq = seq;
    until(w, e, 'giantMenace'); step(w, ATTACK_MODULES.giantMenace.windup + .05);
    assert.equal(e.giantPose, 'menace', 'club held high');
    for (let t = 0; t < 8 && e.pack.attack === 'giantMenace'; t += w.dt) step(w, w.dt);
    const hits = w.hurts.filter((h) => h.source === 'giantMenace' || h.source === 'giantChest').length;
    slams += w.added.filter((f) => f.kind === 'shock').length; bolts += w.added.filter((f) => f.kind === 'giantChest').length;
    assert.ok(hits >= 1 && hits <= GIANT.menaceStrikes * 2, `committed strikes land (${hits})`);
    assert.ok(w.added.filter((f) => f.kind === 'shock' || f.kind === 'giantChest').length <= GIANT.menaceStrikes);
  }
  assert.ok(slams > 0 && bolts > 0, `both finishers occur (${slams} slams, ${bolts} bolts)`);
  // Kept far out of reach (the Wayfarer keeps running away), it never slams; its two honest beams fall short.
  const w = world({ size: 64, player: { x: 20, y: 12 } }), e = giant(w, 'giantMenace', 13, 12);
  until(w, e, 'giantMenace');
  for (let t = 0; t < 6 && e.pack.attack === 'giantMenace'; t += w.dt) { w.player.x = e.x + 12; step(w, w.dt); }
  assert.notEqual(e.pack.attack, 'giantMenace', 'gives up'); assert.equal(w.added.filter((f) => f.kind === 'shock' || f.kind === 'giantChest' && !f.honest).length, 0, 'no strike without an opening');
  assert.equal(w.hurts.length, 0, 'the honest beams fall short');
});

test('menacing slam with no opening: two staggered honest chest beams in a small cone, the second tracking', () => {
  // The Wayfarer stays just out of reach (beyond the slam and the chest bolt, within the beams' range).
  const w = world({ size: 64, player: { x: 20, y: 12 } }), e = giant(w, 'giantMenace', 13, 12); e.giantDashCd = 1e9;
  until(w, e, 'giantMenace');
  const fired = [];
  for (let t = 0; t < 8 && e.pack.attack === 'giantMenace'; t += w.dt) {
    w.player.x = e.x + 7.5; w.player.y = 12 + (fired.length ? 1.2 : 0);
    const n = w.added.length; step(w, w.dt); for (const f of w.added.slice(n)) if (f.kind === 'giantChest') fired.push({ f, at: w.now, y: w.player.y });
  }
  assert.equal(fired.length, GIANT.honestShots, 'two beams'); assert.ok(fired.every(({ f }) => f.honest));
  assert.ok(fired[1].at - fired[0].at >= GIANT.honestStagger * 1000 - 20, 'staggered, one at a time');
  const ang = ({ f }) => Math.atan2(f.ty - f.y, f.tx - f.x), turn = ang(fired[1]) - ang(fired[0]);
  assert.ok(turn > 0, 'the second beam turns toward where the Wayfarer moved');
  assert.ok(turn <= (GIANT.honestTrack + GIANT.honestCone) * Math.PI / 180 + 1e-6, 'only slightly');
  assert.ok(w.hurts.some((h) => h.source === 'giantChest'), 'a beam lands on a Wayfarer standing in range');
  assert.notEqual(e.pack.attack, 'giantMenace', 'then it lowers the club');
});

test('charging upswing: burst dashes and upswings in one of four plans; sometimes a leap with an air attack, landing plainly or in a tracking slam', () => {
  const seen = { jump: 0, barrage: 0, dash: 0, slamLand: 0, plain: 0 }, plans = new Set();
  for (let seq = 0; seq < 40; seq++) {
    const w = world({ player: { x: 19, y: 12 } }), e = giant(w, 'giantUpswing', 12, 12); e.id = `up-${seq}`; e.pack.seq = seq;
    until(w, e, 'giantUpswing'); const x0 = e.x;
    let peak = 0, plan = null, thrust = false;
    for (let t = 0; t < 7 && e.pack.attack === 'giantUpswing'; t += w.dt) { step(w, w.dt); plan ||= e.pack.data?.plan; thrust ||= !!e.giantThrust; if (e.pack.data?.mode === 'air' || e.pack.data?.mode === 'slamFall' || e.pack.data?.mode === 'fall') peak = Math.max(peak, e.giantAir || 0); }
    plans.add(plan.join('+'));
    assert.ok(e.x > x0 + 2, 'it burst in'); assert.ok(thrust, 'shoulder thrusters fire');
    const swings = plan.filter((x) => x === 'swing').length;
    if (swings) assert.ok(w.hurts.some((h) => h.source === 'giantUpswing'), 'an upswing connects');
    else assert.equal(peak, 0, 'a dash-only plan never leaps');
    assert.equal(e.giantAir || 0, 0, 'always lands');
    if (peak > 0) { seen.jump++; if (w.added.some((f) => f.kind === 'giantBolt')) seen.barrage++; if (w.added.some((f) => f.kind === 'giantArc')) seen.dash++; if (w.added.some((f) => f.kind === 'shock')) seen.slamLand++; else seen.plain++; }
  }
  assert.deepEqual([...plans].sort(), GIANT.chargePlans.map((p) => p.join('+')).sort(), 'all four charge plans occur');
  for (const k of Object.keys(seen)) assert.ok(seen[k] > 0, `${k} happens (${JSON.stringify(seen)})`);
});

test('traversal: it walks slowly but closes distance in up to two shoulder-thruster burst dashes, sometimes hopping', () => {
  let hops = 0, doubles = 0;
  for (let n = 0; n < 16; n++) {
    const w = world({ size: 64, player: { x: 40, y: 12 } }), e = giant(w, null, 12, 12); e.id = `trav-${n}`; e.packAttacks = []; e.giantDashCd = 0; e.speedMultiplier = WORLD_BEASTS.lightningGiant.speed;
    let peak = 0, bursts = 0, was = false;
    const x0 = e.x;
    for (let t = 0; t < 1.5; t += w.dt) { step(w, w.dt); peak = Math.max(peak, e.giantAir || 0); const on = !!e.giantDash && e.giantDash.gap <= 0; if (on && !was) bursts++; was = on; }
    assert.ok(e.x - x0 > GIANT.dashSpeed * GIANT.dashTime * .8, 'a burst covers ground fast');
    assert.ok(bursts >= 1 && bursts <= GIANT.dashMax);
    if (peak > 0) hops++; if (bursts === 2) doubles++;
  }
  assert.ok(hops > 0, 'some dashes hop through the air'); assert.ok(doubles > 0, 'some chains are two dashes');
  // Close by, it just walks (slowly) and never dashes.
  const w = world({ player: { x: 15, y: 12 } }), e = giant(w, null, 12, 12); e.packAttacks = []; e.giantDashCd = 0;
  for (let t = 0; t < 1; t += w.dt) step(w, w.dt); assert.equal(e.giantDash ?? null, null);
  assert.ok(WORLD_BEASTS.lightningGiant.speed < 1, 'slow on foot');
});

test('walk cycle: a planted foot never slides (it sweeps back exactly as fast as the body travels), and the swing lifts it', () => {
  const u = 100, S = GIANT_ART.stride * u, cycle = 2 * S / GIANT_ART.stanceShare; // body travel per full cycle, as the renderer uses
  for (const offset of [0, Math.PI]) {
    let prev = null, planted = 0, swung = 0;
    for (let i = 0; i <= 400; i++) {
      const phase = i / 400 * Math.PI * 2, body = phase / (Math.PI * 2) * cycle, f = giantFoot(phase, 1, offset), world = body + f.x * S;
      if (f.planted) { planted++; if (prev?.planted) assert.ok(Math.abs(world - prev.world) < 1e-6, 'no slide while planted'); assert.equal(f.lift, 0); }
      else { swung++; assert.ok(f.lift >= 0 && f.lift <= 1); }
      prev = { planted: f.planted, world };
    }
    assert.ok(planted > swung, 'more time on the ground than in the air');
  }
  assert.deepEqual(giantFoot(1.3, 0), { x: 0, lift: 0, planted: true }, 'standing still: feet under the hips');
  // The two feet are half a cycle apart: one is always planted.
  for (let i = 0; i < 100; i++) { const ph = i / 100 * Math.PI * 2; assert.ok(giantFoot(ph, 1, 0).planted || giantFoot(ph, 1, Math.PI).planted); }
});

test('Supernova fog: open sea or a 70% ocean section fogs over for 30 s, then clears; another Supernova renews it', () => {
  const section = (share) => ({ tiles: Array.from({ length: 1024 }, (_, i) => ({ kind: i < Math.round(1024 * share) ? 'ocean' : 'grass' })) });
  assert.equal(novaFogCapable(section(.69)), false); assert.equal(novaFogCapable(section(.7)), true); assert.equal(novaFogCapable(section(1)), true);
  assert.equal(novaFogCapable({ ...section(.2), openSea: true }), true, 'a section that can hold fog');
  let fog = novaFog(null, 16, 16, 3); const player = { x: 15.5, y: 15.3 };
  assert.ok(fog.fog.length >= 6, 'banks across the section');
  let t = 0; for (; t < 3; t += .1) fog = tickNovaFog(fog, .1, player);
  assert.ok(fog.alpha > .95 && fog.fogLevel > .5, 'the Wayfarer is in thick fog');
  for (; t < 20; t += .1) fog = tickNovaFog(fog, .1, player);
  const banks = fog.fog.length, same = fog;
  for (let k = 0; k < 5; k++) fog = novaFog(fog, 10 + k, 10, 4 + k);
  assert.equal(fog, same, 'renewed in place'); assert.equal(fog.fog.length, banks, 'no stacking: repeated Supernovas add no banks');
  assert.ok(Math.abs(fog.left - NOVA_FOG.duration) < 1e-9, 'the timer refreshes to 30 s'); assert.ok(fog.alpha > .95, 'without flickering out');
  let cleared = 0; for (let k = 0; k < 400 && fog; k++) { fog = tickNovaFog(fog, .1, player); cleared = (k + 1) * .1; }
  assert.equal(fog, null, 'the fog clears'); assert.ok(Math.abs(cleared - NOVA_FOG.duration) < .25, `after ${NOVA_FOG.duration} s (${cleared})`);
});

test('the Giant can be met at sea: it holds an all-ocean section, riding its cloud', () => {
  const save = freshSave(); save.seed = 'giant-sea'; worldBeastFor(save, null, 0, 0);
  save.worldBeasts.lightningGiant.active = { rx: 9, ry: 9, tries: 0 };
  const map = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'deepOcean', blocked: true })) };
  const spawn = worldBeastFor(save, map, 9, 9);
  assert.equal(spawn?.worldBeast, 'lightningGiant'); assert.equal(map.tiles[spawn.y * 32 + spawn.x].kind, 'deepOcean');
});
