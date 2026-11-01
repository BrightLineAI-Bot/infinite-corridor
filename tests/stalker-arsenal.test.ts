// The Stalker's second kit (Tim, 2026-11-01): a turret that pops out of its back (homing orbs, a laser cone, a ring of orbs
// launched one by one, the crossed-blade X beam), an energized sphere, a liquid shield, and the cat climbing trees, hopping
// ledges and breaking out of an enclosure.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STALKER, updateStalker, stalkerSoften } from '../src/stalker.ts';

function field(player = { x: 10, y: 10 }, extra = {}) {
  const hurts = [];
  const w = { player, dt: .05, now: 0, sheltered: false, door: null, playerVelocity: { x: 0, y: 0 }, open: (x, y) => x > 0 && y > 0 && x < 40 && y < 40, move(e, dx, dy) { const nx = e.x + dx, ny = e.y + dy; if (!this.open(nx, ny)) return false; e.x = nx; e.y = ny; return !!(dx || dy); }, elev: () => 0, hurt: (e, n) => { hurts.push(n); return true; }, ownerAlive: () => true, summon: () => 0, decoys: () => 0, ...extra };
  return { w, hurts };
}
const actor = (x = 4, y = 10, extra = {}) => ({ id: 'stalker-k', stalker: true, kind: 'stalker', x, y, hp: 800, maxHp: 800, damage: 50, scale: STALKER.size, aggro: true, stalkForm: 'cat', ...extra });

test('the turret pops out and fires each of its moves in turn, with its shots bounded', () => {
  const { w, hurts } = field(), e = actor(6, 10), fired = [];
  let prev = null;
  for (let i = 0; i < 1600; i++) { updateStalker(e, w); const m = e.stalkTurret?.move; if (m && m !== prev) fired.push(m); prev = m; assert.ok((e.stalkShots?.length || 0) <= STALKER.turret.cap, 'never more shots than the cap'); }
  for (const m of STALKER.turret.moves) assert.ok(fired.includes(m), `fired ${m}`);
  assert.ok(e.stalkTurretUp >= 0 && e.stalkTurretUp <= 1); assert.ok(hurts.length > 0);
});

test('the laser cone strikes only inside its wedge; homing orbs turn toward the Wayfarer', () => {
  const { w, hurts } = field({ x: 12, y: 10 }), e = actor(8, 10, { stalkAct: { kind: 'wait', t: 0, total: 0 } });
  e.stalkTurretClock = 99; e.stalkEnergyClock = 99; e.stalkTurret = { move: 'cone', t: .01, total: .6, aim: 0 };
  w.sheltered = false; e.stalkAct = { kind: 'prowl', t: 99, total: 99 };
  const near = { ...e }; updateStalker(e, w); assert.equal(hurts.length, 1, 'in the wedge');
  const { w: w2, hurts: h2 } = field({ x: 8, y: 14 }), f = actor(8, 10); f.stalkTurretClock = 99; f.stalkEnergyClock = 99; f.stalkAct = { kind: 'prowl', t: 99, total: 99 }; f.stalkTurret = { move: 'cone', t: .01, total: .6, aim: 0 };
  updateStalker(f, w2); assert.equal(h2.length, 0, 'outside the wedge it misses'); void near;
  // An orb fired away from the Wayfarer bends back toward them.
  const { w: w3 } = field({ x: 10, y: 20 }), g = actor(10, 10); g.stalkTurretClock = 99; g.stalkEnergyClock = 99; g.stalkAct = { kind: 'prowl', t: 99, total: 99 };
  g.stalkShots = [{ kind: 'orb', x: 10, y: 10, vx: 4, vy: 0, home: STALKER.turret.orbs.turn, life: 3, radius: .3, damage: .45 }];
  for (let i = 0; i < 10; i++) updateStalker(g, w3);
  const q = g.stalkShots[0]; assert.ok(q.vy > 0, 'it turned toward the Wayfarer');
});

test('the ring of orbs circles it, then launches one at a time', () => {
  const { w } = field({ x: 20, y: 10 }), e = actor(10, 10); e.stalkTurretClock = 99; e.stalkEnergyClock = 99; e.stalkAct = { kind: 'prowl', t: 99, total: 99 };
  e.stalkTurret = { move: 'ring', t: .01, total: .6, aim: 0 }; updateStalker(e, w);
  assert.equal(e.stalkShots.filter((q) => q.orbit).length, STALKER.turret.ring.count);
  let launched = []; for (let i = 0; i < 60; i++) { updateStalker(e, w); launched.push(e.stalkShots.filter((q) => !q.orbit).length); }
  assert.ok(launched.some((n) => n > 0 && n < STALKER.turret.ring.count), 'at different times, not all at once');
});

test('energized: it hurts to touch, softens blows by half, and throws the sphere as it ends', () => {
  const { w, hurts } = field({ x: 10.5, y: 10 }), e = actor(10, 10); e.stalkTurretClock = 99; e.stalkAct = { kind: 'prowl', t: 99, total: 99 }; e.stalkCharges = 0;
  e.stalkEnergyClock = 0; updateStalker(e, w); assert.ok(e.stalkCharged > 0, 'energized');
  updateStalker(e, w); assert.ok(hurts.length >= 1, 'touching the sphere hurts');
  e.stalkLastHp = 800; e.hp = 700; stalkerSoften(e, 800, .05); assert.equal(e.hp, 750, 'half the blow');
  e.stalkCharged = .01; e.stalkShots = []; w.player = { x: 20, y: 10 }; updateStalker(e, w); assert.ok(e.stalkShots.some((q) => q.kind === 'sphere'), 'the sphere is thrown');
});

test('the liquid shield rises when blows come thick and fast, softens them and gives ground, with a cooldown', () => {
  const e = actor(); e.stalkForm = 'cat';
  stalkerSoften(e, 800, .05); assert.ok(!(e.stalkShield > 0));
  e.hp = 800 - 800 * STALKER.shield.burst - 1; stalkerSoften(e, 800, .05); assert.ok(e.stalkShield > 0, 'shield up');
  const before = e.hp; e.hp -= 40; stalkerSoften(e, before, .05); assert.equal(Math.round(before - e.hp), 10, 'three quarters turned');
  const { w } = field(); e.stalkTurretClock = 99; e.stalkEnergyClock = 99; e.stalkLastHp = e.hp; e.stalkAct = { kind: 'prowl', t: 1, total: 1 }; e.stalkCharges = 0;
  updateStalker(e, w); assert.equal(e.stalkAct.kind, 'guard', 'it repositions behind the shield');
  e.stalkShield = 0; e.hp -= 300; stalkerSoften(e, e.hp + 300, .05); assert.ok(!(e.stalkShield > 0), 'not again until the cooldown passes');
});

test('the cat breaks out of an enclosure and climbs a wall to reach the Wayfarer', () => {
  // A walled pen round the cat (x 3–7, y 8–12), the Wayfarer outside it.
  const pen = (x, y) => (x >= 2.6 && x <= 7.4 && (Math.abs(y - 7.6) < .5 || Math.abs(y - 12.4) < .5)) || (y >= 7.6 && y <= 12.4 && (Math.abs(x - 2.6) < .5 || Math.abs(x - 7.4) < .5));
  const { w, hurts } = field({ x: 15, y: 10 }, { open: (x, y) => x > 0 && y > 0 && x < 40 && y < 40 && !pen(x, y), free: (x, y) => x > 0 && y > 0 && x < 40 && y < 40 });
  const e = actor(5, 10); e.stalkTurretClock = 999; e.stalkEnergyClock = 999; e.stalkCharges = 0;
  let climbed = false; for (let i = 0; i < 600 && !(e.x > 8); i++) { updateStalker(e, w); climbed ||= !!e.stalkClimb; if (e.stalkForm === 'pool' || e.stalkForm === 'ape') e.stalkForm = 'cat'; }
  assert.ok(e.x > 8, `it got out (${e.x.toFixed(2)})`); assert.ok(climbed, 'by climbing');
  // A ledge it cannot walk up, the Wayfarer close: it hops.
  const ledge = (x) => x > 7 && x < 8;
  const { w: w2 } = field({ x: 9, y: 10 }, { open: (x, y) => x > 0 && y > 0 && x < 40 && y < 40 && !ledge(x) });
  const f = actor(6, 10); f.stalkTurretClock = 999; f.stalkEnergyClock = 999; let hopped = false;
  for (let i = 0; i < 200 && !hopped; i++) { updateStalker(f, w2); hopped = f.stalkAct.kind === 'hop'; }
  assert.ok(hopped, 'it hops the ledge'); void hurts;
});

test('the crossed blades rise, swing and cross in front of it (a blow there), then a larger X flies straight, not homing', () => {
  const { w, hurts } = field({ x: 11.5, y: 10 }, { move: () => false }), e = actor(10, 10); e.stalkEnergyClock = 99; e.stalkCharges = 0; e.stalkAct = { kind: 'prowl', t: 99, total: 99 };
  e.stalkTurret = { move: 'xblade', t: .01, total: .6, aim: 0 }; updateStalker(e, w);
  assert.equal(e.stalkBlades.phase, 'rise'); assert.ok(!e.stalkTurret, 'one back move at a time');
  const phases = new Set(); for (let i = 0; i < 40 && e.stalkBlades; i++) { phases.add(e.stalkBlades.phase); if (e.stalkBlades.phase === 'hold') { w.player.x = 11.5; w.player.y = 20; } updateStalker(e, w); }
  assert.deepEqual([...phases], ['rise', 'swing', 'hold']); assert.ok(hurts.length >= 1, 'the cross strikes in front of it');
  const X = e.stalkShots.find((q) => q.kind === 'xblade'); assert.ok(X, 'the X flies');
  assert.ok(X.radius >= STALKER.turret.xblade.length / 2, 'larger than the blades on its back'); assert.ok(X.radius * 2 > STALKER.size, 'longer than its body');
  w.player.x = 11.5; w.player.y = 20; const v0 = { x: X.vx, y: X.vy }; updateStalker(e, w); updateStalker(e, w);
  const q = e.stalkShots.find((s) => s.kind === 'xblade'); assert.deepEqual({ x: q.vx, y: q.vy }, v0, 'a straight line where the Wayfarer was');
});

test('the mist: it cannot be hit, surrounds the Wayfarer and rushes through them, each touch rotting a tenth of their health', () => {
  const rots = [], { w } = field({ x: 10, y: 10 }, { rot: (e, share) => { rots.push(share); return true; }, free: (x, y) => x > 0 && y > 0 && x < 40 && y < 40 }), e = actor(6, 10);
  e.stalkTurretClock = 99; e.stalkEnergyClock = 99; e.stalkCharges = 0;
  e.stalkCycle = STALKER.mist.every - 2; e.stalkAct = { kind: 'spring', t: .01, total: .3, from: { x: 10, y: 10 } }; updateStalker(e, w);
  assert.equal(e.stalkForm, 'mist'); assert.equal(e.untargetable, true);
  const kinds = new Set(); for (let i = 0; i < 400 && e.stalkForm === 'mist'; i++) { updateStalker(e, w); kinds.add(e.stalkAct.kind); if (e.stalkForm === 'mist') assert.equal(e.untargetable, true); }
  for (const k of ['mistGather', 'mistRing', 'mistPass']) assert.ok(kinds.has(k), k);
  assert.equal(rots.length, STALKER.mist.passes, 'one rot per pass through'); assert.ok(rots.every((r) => r === .1));
  assert.equal(e.stalkForm, 'cat'); assert.equal(e.untargetable, false, 'it re-forms to be fought');
});

test('in the game the mist rot lowers maximum health by a tenth each touch, a dodge passes through, and rot past it all kills', async () => {
  const { freshSave } = await import('../src/types.ts'), { Game } = await import('../src/game.ts'), { healthCeiling, rotTick } = await import('../src/water-traversal.ts');
  const s = freshSave(); s.seed = 'MIST'; const g = new Game(s, 0); g.rx = 4; g.ry = 3; g.loadArea('overworld', false); const max = g.save.maxHp, tenth = Math.round(max * .1); g.player.hp = max; g.save.rot = 0;
  const e = { id: 'stalker-m', x: g.player.x, y: g.player.y };
  let w = g.stalkerWorld(.05, 10000); assert.equal(w.rot(e, .1), true); assert.equal(g.save.rot, tenth); assert.equal(healthCeiling(g.save), max - tenth); assert.ok(g.player.hp <= max - tenth);
  w = g.stalkerWorld(.05, 10100); assert.equal(w.rot(e, .1), false, 'still recovering: no second rot at once');
  g.player.invulnerableUntil = 20500; w = g.stalkerWorld(.05, 20000); assert.equal(w.rot(e, .1), false, 'a dodge passes through');
  g.save.rot = max * .9; rotTick(g.save, 'toxicMire', 1); assert.ok(g.save.rot >= max * .9, 'the bog never lowers it past its own cap');
  g.save.rot = max - 1; g.player.invulnerableUntil = 0; w = g.stalkerWorld(.05, 30000); w.rot(e, .1); assert.equal(g.player.hp, 0, 'rotted past its whole health, the Wayfarer falls');
});

// ---- The appendage and the gorilla's arms ----
import { STALKER as K, apeMoveNext, spikeLines } from '../src/stalker.ts';
const backMove = (move, player = { x: 12, y: 10 }, extra = {}) => { const { w, hurts } = field(player, { move: () => false, ...extra }), e = actor(10, 10); e.stalkEnergyClock = 99; e.stalkCharges = 0; e.stalkAct = { kind: 'prowl', t: 99, total: 99 }; e.stalkTurret = { move, t: .01, total: .6, aim: Math.atan2(player.y - 10, player.x - 10) }; return { w, hurts, e }; };

test('the appendage: a sword sweep hits inside its arc; three spikes strike and fire three blasts that bounce off blocks', () => {
  let { w, hurts, e } = backMove('sword'); for (let i = 0; i < 12; i++) updateStalker(e, w); assert.equal(hurts.length, 1, 'the sweep, once');
  ({ w, hurts, e } = backMove('sword', { x: 7, y: 10 })); for (let i = 0; i < 12; i++) updateStalker(e, w); assert.equal(hurts.length, 0, 'behind it, the sweep misses');
  ({ w, hurts, e } = backMove('spikes', { x: 12.5, y: 10 })); updateStalker(e, w);
  assert.equal(hurts.length, 1, 'a spike'); assert.equal(e.stalkShots.filter((q) => q.kind === 'blast').length, 3, 'three blasts');
  assert.equal(spikeLines(e, 0).length, 3);
  // A blast into a wall comes back.
  const wall = (x) => x > 15; const { w: w2 } = field({ x: 10, y: 30 }, { move: () => false, shotBlocked: (x) => wall(x) }), g = actor(10, 10); g.stalkTurretClock = 99; g.stalkEnergyClock = 99; g.stalkAct = { kind: 'prowl', t: 99, total: 99 };
  g.stalkShots = [{ kind: 'blast', x: 14, y: 10, vx: 7, vy: 0, life: 2, radius: .3, damage: .4, bounces: 2 }];
  for (let i = 0; i < 10; i++) updateStalker(g, w2); assert.ok(g.stalkShots[0].vx < 0 && g.stalkShots[0].bounces === 1, 'bounced once');
});

test('the tendril: eruptions follow the Wayfarer, each marked first, at most a few; the boomerang blade goes out and comes back', () => {
  const { w, hurts, e } = backMove('tendril', { x: 13, y: 10 }); let most = 0, spots = [];
  for (let i = 0; i < 80; i++) { w.player.x = 13 + i * .05; updateStalker(e, w); most = Math.max(most, e.stalkErupts?.length || 0); for (const q of e.stalkErupts || []) if (!spots.includes(q.x)) spots.push(q.x); }
  assert.equal(spots.length, K.limb.tendril.count, 'one eruption per beat'); assert.ok(spots.every((x, i) => i === 0 || x > spots[i - 1]), 'each where the Wayfarer had moved to');
  assert.ok(most <= K.limb.tendril.cap); assert.ok(hurts.length >= 1, 'standing in them hurts');
  const b = backMove('boomerang', { x: 16, y: 10 }); updateStalker(b.e, b.w); assert.ok(b.e.stalkShots.some((q) => q.kind === 'boomer'));
  let far = 0; for (let i = 0; i < 80 && b.e.stalkShots.some((q) => q.kind === 'boomer'); i++) { updateStalker(b.e, b.w); const q = b.e.stalkShots.find((s) => s.kind === 'boomer'); if (q) far = Math.max(far, q.x - 10); }
  assert.ok(far > 3, 'it flew out'); assert.ok(!b.e.stalkShots.some((q) => q.kind === 'boomer'), 'and came home'); assert.ok(b.hurts.length >= 1 && b.hurts.length <= 2, 'at most a hit going and a hit coming back');
});

test('the gorilla runs through its arm moves: grab and pull, combo, slam, charge with knockback, sweep, spin', () => {
  const order = []; const e0 = {}; for (let i = 0; i < K.arms.pick.length; i++) order.push(apeMoveNext(e0)); assert.deepEqual(order, K.arms.pick);
  const shoves = [], { w, hurts } = field({ x: 13, y: 10 }, { displace: (dx, dy) => { shoves.push([dx, dy]); w.player.x += dx; w.player.y += dy; return true; } }), e = actor(9, 10, { stalkForm: 'ape' });
  e.stalkTurretClock = 999; e.stalkEnergyClock = 999; e.stalkCharges = 0; e.stalkCycle = 1; const seen = new Set();
  for (let i = 0; i < 4000; i++) { updateStalker(e, w); seen.add(e.stalkAct.kind); if (e.stalkForm !== 'ape') { e.stalkForm = 'ape'; e.untargetable = false; e.stalkAct = { kind: 'prowl', t: .2, total: .2 }; } if (Math.hypot(w.player.x - e.x, w.player.y - e.y) > 9) { w.player.x = e.x + 3; w.player.y = e.y; } }
  for (const k of ['grabWarn', 'grab', 'comboWarn', 'slamWarn', 'slam', 'chargeWarn', 'charge', 'sweepWarn', 'sweep', 'spinWarn', 'spin', 'retract']) assert.ok(seen.has(k), k);
  assert.ok(hurts.length > 5, 'its blows land'); assert.ok(shoves.length > 0, 'pulled in or knocked back');
});

test('the charge knocks the Wayfarer back, the grab pulls them in', () => {
  const shoves = [], { w } = field({ x: 13, y: 10 }, { displace: (dx, dy) => { shoves.push([dx, dy]); w.player.x += dx; return true; } }), e = actor(10, 10, { stalkForm: 'ape' }); e.stalkTurretClock = 999; e.stalkEnergyClock = 999;
  e.stalkAct = { kind: 'chargeWarn', t: .01, total: .5, aim: 0 }; for (let i = 0; i < 20 && !shoves.length; i++) updateStalker(e, w);
  assert.ok(shoves.length && shoves[0][0] > 0, 'knocked away from it'); assert.ok(Math.hypot(...shoves[0]) >= K.arms.charge.knock - .01);
  const pulls = [], { w: w2 } = field({ x: 15, y: 10 }, { displace: (dx, dy) => { pulls.push(dx); w2.player.x += dx; return true; } }), g = actor(10, 10, { stalkForm: 'ape' }); g.stalkTurretClock = 999; g.stalkEnergyClock = 999;
  g.stalkAct = { kind: 'grabWarn', t: .01, total: .45, aim: 0 }; for (let i = 0; i < 40; i++) updateStalker(g, w2);
  assert.ok(pulls.length && pulls.every((dx) => dx < 0), 'hauled toward it'); assert.ok(w2.player.x < 15);
});

// ---- How it looks: hiding, perching, creeping (drawing only) ----
import { stalkerLook, LOOK } from '../src/stalker.ts';
test('it hides in its mist at a distance, perches on high ground, creeps as it closes in', () => {
  const e = actor(0, 10), w = { player: { x: 14, y: 10 }, elev: () => 0 };
  for (let i = 0; i < 60; i++) stalkerLook(e, w, .05, 'prowl'); assert.ok(e.stalkHide > .8, `far off it hides (${e.stalkHide.toFixed(2)})`); assert.equal(e.stalkCreep, true);
  e.x = 12; for (let i = 0; i < 60; i++) stalkerLook(e, w, .05, 'prowl'); assert.ok(e.stalkHide < .1, 'close by, it shows itself'); assert.equal(e.stalkCreep, false);
  for (let i = 0; i < 60; i++) stalkerLook(e, w, .05, 'pounce'); assert.ok(e.stalkHide < .05, 'never hidden while it attacks');
  for (let i = 0; i < 60; i++) stalkerLook(e, w, .05, 'wait'); assert.ok(Math.abs(e.stalkHide - LOOK.hideWait) < .05, 'half-hidden while it waits by the door');
  const high = { player: { x: 14, y: 10 }, elev: (x) => x < 13 ? 3 : 0 }; stalkerLook(e, high, .05, 'prowl'); assert.equal(e.stalkPerch, true); assert.equal(e.facingX, 1, 'it looks down at the Wayfarer');
  stalkerLook(e, high, .05, 'pounce'); assert.equal(e.stalkPerch, false, 'not perched mid-attack');
  // In the fight loop, the look is kept up to date.
  const { w: fw } = field({ x: 30, y: 10 }), f = actor(5, 10); for (let i = 0; i < 40; i++) updateStalker(f, fw); assert.ok(f.stalkHide > 0, 'set while it fights');
});

// ---- Lying in wait; the flurry and the tide; the puddle's mouth and its chompers ----
import { stalkerLurk, catMoveNext } from '../src/stalker.ts';
test('lying in wait: unseen and still until the Wayfarer comes close, then it fades in and springs', () => {
  const reveals = [], { w } = field({ x: 20, y: 10 }, { revealed: () => reveals.push(1) }), e = actor(10, 10, { stalkLurk: { t: 0 }, hidden: true, untargetable: true });
  const start = { x: e.x, y: e.y }; for (let i = 0; i < 40; i++) updateStalker(e, w);
  assert.ok(e.stalkLurk && e.hidden && e.untargetable, 'still hidden'); assert.deepEqual({ x: e.x, y: e.y }, start, 'and still: it does not move'); assert.equal(e.stalkAct.kind, 'lurk');
  w.player.x = 10 + K.lurk.trigger - .2; updateStalker(e, w);
  assert.equal(e.stalkLurk, null); assert.equal(e.hidden, false); assert.equal(e.untargetable, false); assert.ok(e.stalkReveal > 0, 'it fades in'); assert.equal(reveals.length, 1);
  assert.ok(['pounceWarn', 'leapWarn'].includes(e.stalkAct.kind), 'and springs'); assert.ok(e.stalkAct.total <= K.lurk.spring + 1e-9, 'with almost no warning');
  // A blow reveals it too; left far behind, it creeps after the Wayfarer unseen.
  const g = actor(10, 10, { stalkLurk: { t: 0 }, hidden: true }); const { w: w2 } = field({ x: 30, y: 10 }); updateStalker(g, w2); const x0 = g.x; for (let i = 0; i < 20; i++) updateStalker(g, w2); assert.ok(g.x > x0 && g.stalkLurk, 'creeping, still hidden');
  g.hp -= 20; updateStalker(g, w2); assert.equal(g.stalkLurk, null, 'struck, it shows itself');
});

test('the cat flurry: swipe after swipe, pressing forward', () => {
  const seq = {}; assert.deepEqual([0, 1, 2, 3].map(() => catMoveNext(seq)), K.cat.pick);
  const { w, hurts } = field({ x: 11.2, y: 10 }, { move: () => true }), e = actor(10, 10); e.stalkTurretClock = 999; e.stalkEnergyClock = 999; e.stalkCharges = 0;
  e.stalkAct = { kind: 'flurryWarn', t: .01, total: .35, aim: 0 }; for (let i = 0; i < 30; i++) updateStalker(e, w);
  assert.equal(hurts.length, K.cat.flurry.strikes, 'every swipe lands on a Wayfarer who stands there');
});

test('the tide: three waves, each wider, each hitting once; it rides the first and cannot be hit meanwhile', () => {
  const { w, hurts } = field({ x: 14, y: 10 }, { free: () => true }), e = actor(10, 10); e.stalkTurretClock = 999; e.stalkEnergyClock = 999; e.stalkCharges = 0;
  e.stalkAct = { kind: 'tideWarn', t: .01, total: .55, aim: 0 }; updateStalker(e, w);
  assert.equal(e.stalkWaves.length, 3); assert.ok(e.stalkWaves.every((q, i) => i === 0 || q.width > e.stalkWaves[i - 1].width), 'each wider'); assert.equal(e.untargetable, true);
  for (let i = 0; i < 60 && e.stalkAct.kind === 'tide'; i++) { updateStalker(e, w); w.player.invulnerableUntil = 0; }
  assert.equal(hurts.length, 3, 'one hit per wave'); assert.equal(e.untargetable, false, 'it re-forms to be fought'); assert.ok(e.x > 12, 'where the wave carried it');
  // Off to the side of the narrow first wave but inside the wide last one: only the wider waves catch them.
  const { w: w2, hurts: h2 } = field({ x: 14, y: 11.3 }, { free: () => true }), f = actor(10, 10); f.stalkTurretClock = 999; f.stalkEnergyClock = 999; f.stalkCharges = 0; f.stalkAct = { kind: 'tideWarn', t: .01, total: .55, aim: 0 };
  for (let i = 0; i < 70; i++) updateStalker(f, w2); assert.equal(h2.length, 1, 'only the widest');
});

test('the puddle: under the Wayfarer, a mouth of blades rises and bites the marked spot; or six chompers that outlast it', () => {
  const { w, hurts } = field({ x: 13, y: 10 }, { free: () => true }), e = actor(10, 10, { stalkForm: 'pool', untargetable: true }); e.stalkTurretClock = 999; e.stalkEnergyClock = 999;
  e.stalkAct = { kind: 'under', t: 1, total: 1 }; const kinds = new Set(); for (let i = 0; i < 40 && e.stalkForm === 'pool'; i++) { updateStalker(e, w); kinds.add(e.stalkAct.kind); }
  for (const k of ['under', 'mouthWarn', 'mouth']) assert.ok(kinds.has(k), k); assert.equal(hurts.length, 1, 'the bite');
  const { w: w2, hurts: h2 } = field({ x: 13, y: 10 }, { free: () => true }), g = actor(10, 10, { stalkForm: 'pool', untargetable: true }); g.stalkTurretClock = 999; g.stalkEnergyClock = 999; g.stalkCharges = 0;
  g.stalkAct = { kind: 'split', t: .01, total: .35 }; updateStalker(g, w2); assert.equal(g.stalkChompers.length, K.pool.split.count);
  g.stalkAct = { kind: 'split', t: .01, total: .35 }; g.stalkForm = 'pool'; updateStalker(g, w2); assert.ok(g.stalkChompers.length <= K.pool.split.cap, 'capped');
  let rose = false; for (let i = 0; i < 120; i++) { updateStalker(g, w2); rose ||= g.stalkForm !== 'pool'; w2.player.invulnerableUntil = 0; }
  assert.ok(rose, 'it rose again'); assert.ok(g.stalkChompers.length > 0, 'the chompers go on after'); assert.ok(h2.length >= 2, 'and bite');
  for (let i = 0; i < 240; i++) updateStalker(g, w2); assert.equal(g.stalkChompers.length, 0, 'until they dry up');
});

// ---- The fog: it comes in the open, then fogs the section and fights on veiled ----
import { stalkerFog } from '../src/stalker.ts';
test('the fog: within range it fogs the section and veils itself; it veils again in the fight; nothing points to it', async () => {
  const fogs = [], { w } = field({ x: 20, y: 10 }, { fogged: (e, t) => fogs.push(t) }), e = actor(10, 10, { stalkFogPlan: true });
  e.stalkTurretClock = 999; e.stalkEnergyClock = 999; e.stalkCharges = 0;
  for (let i = 0; i < 5; i++) stalkerFog(e, w, .05); assert.equal(fogs.length, 0, 'out of range: it comes on in the open'); assert.ok(!e.hidden);
  w.player.x = 10 + K.fog.range - .5; stalkerFog(e, w, .05);
  assert.deepEqual(fogs, [K.fog.time]); assert.ok(e.stalkVeil > 0 && e.hidden, 'veiled'); assert.ok(!e.untargetable, 'a blow still lands');
  for (let i = 0; i < K.fog.time / .05 + 2; i++) stalkerFog(e, w, .05); assert.equal(e.hidden, false, 'the veil lifts');
  for (let i = 0; i < K.fog.again[1] / .05 + 2; i++) stalkerFog(e, w, .05); assert.equal(fogs.length, 2, 'and falls again in the fight'); assert.equal(fogs[1], K.fog.againTime);
  // In the game: alternate hunts come in the open; the fog shows over the section; the edge marker says nothing while it hides.
  const { freshSave } = await import('../src/types.ts'), { Game } = await import('../src/game.ts'), { ensureStalker } = await import('../src/stalker.ts');
  const s = freshSave(); s.seed = 'FOG'; s.perception.aperture = 80; const g = new Game(s, 0); g.rx = 4; g.ry = 3; g.loadArea('overworld', false);
  const q = ensureStalker(s); q.seq = 1; q.ground = q.need - .5; let now = 0, st = null;
  for (let i = 0; i < 400 && !st; i++) { now += 50; g.player.x += i % 40 < 20 ? .05 : -.05; g.tickStalker(.05, now); st = g.enemies.find((x) => x.stalker); }
  assert.ok(st && st.stalkFogPlan && !st.stalkLurk && !st.hidden, 'this hunt it comes in the open'); assert.match(g.message, /coming for you/);
  g.player.x = st.x + 2; g.player.y = st.y; updateStalker(st, g.stalkerWorld(.05, now += 50));
  assert.ok(g.stalkFog && st.stalkVeil > 0, 'the fog rolls in'); assert.equal(g.stalkerMarker(), null, 'no marker points to it');
  const lurkHunt = freshSave(); lurkHunt.seed = 'FOG'; lurkHunt.perception.aperture = 80; const h = new Game(lurkHunt, 0); h.rx = 4; h.ry = 3; h.loadArea('overworld', false); const lq = ensureStalker(lurkHunt); lq.ground = lq.need - .5;
  let l = null; for (let i = 0; i < 400 && !l; i++) { now += 50; h.player.x += i % 40 < 20 ? .05 : -.05; h.tickStalker(.05, now); l = h.enemies.find((x) => x.stalker); }
  assert.ok(l && l.stalkLurk, 'the other hunts lie in wait'); assert.equal(h.stalkerMarker(), null);
});
