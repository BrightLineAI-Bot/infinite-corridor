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
