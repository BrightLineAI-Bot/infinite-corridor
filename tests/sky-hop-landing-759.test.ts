// Release 759 (pre-publish review of 758): a sky hop lands on the first footing past the gap (JUMP.landOnArrival), so a stick
// held to the end of the longer hop no longer carries the Wayfarer past the branch tip or disc it reached; and the great-tree
// straight-hop and axis-dodge footing never steer the drone's booster.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, JUMP } from '../src/game.ts';
import { skylandSection, discAt } from '../src/skylands.ts';
import { DRONE, setMechMode } from '../src/vehicle-gates.ts';

const SEED = 'CORRIDOR-MUHAPQHU', SX = 41, SY = 62;
function treePin() { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = SX; g.ry = SY; g.loadArea('overworld'); return { ...s.atlas[`${SX},${SY}`], landscapeVersion: 17 }; }
const PIN = treePin();
function treeGame(extra = (s) => {}) { const s = freshSave(); s.seed = SEED; s.atlas = { [`${SX},${SY}`]: PIN }; extra(s); const g = new Game(s, 0); g.rx = SX; g.ry = SY; g.loadArea('overworld'); g.enemies = []; return { s, g }; }

test('a held stick lands a branch-tip hop from anywhere on the launching tip', () => {
  assert.equal(JUMP.landOnArrival, true);
  for (const foot of [11.03, 11.4, 11.8, 11.95]) {
    const { s, g } = treeGame(); const W = 32; g.player.x = foot - .5; g.player.y = 10.4; g.player.hp = g.player.maxHp = 400; s.maxHp = 400; let t = 1000; const d0 = s.worldFlags.deaths || 0;
    const inp = (x, jump) => ({ state: { x, y: 0 }, consume: (k) => k === 'jump' && jump, held: () => false });
    g.update(.05, inp(1, true), t += 50); assert.ok(g.skyAir != null, 'a sky hop');
    let frames = 0; while (t + 50 <= g.jumpUntil && frames++ < 60) g.update(.05, inp(1, false), t += 50);
    for (let i = 0; i < 4; i++) g.update(.05, inp(0, false), t += 50);
    const u = g.map.tiles[Math.floor(g.player.y + .75) * W + Math.floor(g.player.x + .5)];
    assert.equal(u.x, 13, `foot ${foot}: lands on the far tip`); assert.ok(u.canopy, `foot ${foot}: on the branch`); assert.equal((s.worldFlags.deaths || 0) - d0, 0, `foot ${foot}: no fall`);
  }
});

test('a held stick lands a disc hop from the leading rim', () => {
  const s = freshSave(); s.seed = 'SKY'; const g = new Game(s, 0);
  outer: for (let r = 14; r < 80; r++) for (let x = -r; x <= r; x++) { const y = r - Math.abs(x); if (!skylandSection('SKY', x, y)) continue; s.atlas = {}; g.rx = x; g.ry = y; g.loadArea('overworld'); if (g.map.skyDiscs) { g.enemies = []; break outer; } }
  const [, a, b] = g.map.skyDiscs, L = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
  const inp = (x, y, jump) => { let j = jump; return { state: { x, y }, consume: (k) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
  for (const off of [0, .8, 1.0, 1.12]) {
    let t = 1000; g.player.hp = g.player.maxHp = 100; g.save.maxHp = 100; g.jumpUntil = 0; g.discAir = null; g.skyLevel = a.level; g.player.x = a.x + ux * off - .5; g.player.y = a.y + uy * off - .75;
    g.update(.05, inp(ux, uy, true), t += 50);
    let frames = 0; while (t + 50 <= g.jumpUntil && frames++ < 60) g.update(.05, inp(ux, uy, false), t += 50);
    for (let i = 0; i < 4; i++) g.update(.05, inp(0, 0, false), t += 50);
    assert.equal(g.skyLevel, b.level, `launch ${off}: on the next disc`); assert.equal(g.player.hp, 100, `launch ${off}: no fall`);
    assert.ok(discAt(g.map, g.player.x + .5, g.player.y + .75, { level: b.level }));
  }
});

test('the drone booster flies diagonally on a great-tree section', () => {
  const { s, g } = treeGame((s) => { s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; s.maxHp = 100; });
  setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry;
  const W = 32, at = (x, y) => g.map.tiles[y * W + x], bad = (t) => !t || t.blocked || t.canopy || (t.elev || 0) !== 0 || ['lava', 'river', 'abyss', 'canyon', 'deepOcean', 'ocean', 'lakeWater', 'swampWater', 'toxicWater'].includes(t.kind);
  let start = null; for (let y = 2; y < 24 && !start; y++) for (let x = 2; x < 24 && !start; x++) { let ok = true; for (let j = 0; j < 7 && ok; j++) for (let i = 0; i < 7 && ok; i++) if (bad(at(x + i, y + j))) ok = false; if (ok) start = [x + 1, y + 1]; }
  assert.ok(start, 'open ground');
  const fly = (n, plan, t0) => { let t = t0; for (let i = 0; i < n; i++) { const f = plan(i) || {}; g.update(.05, { state: { x: f.x || 0, y: f.y || 0 }, consume: (k) => k === 'jump' && !!f.jump, held: (k) => k === 'jump' && !!f.hold }, t); t += 50; } return t; };
  Object.assign(g.player, { x: start[0], y: start[1], hp: 100, maxHp: 100 }); const p0 = { x: g.player.x, y: g.player.y };
  fly(1, () => ({ jump: true }), 1000); fly(14, (i) => ({ jump: i === 0, hold: true }), 1100); assert.ok(g.droneLift, 'the booster is lit');
  fly(20, () => ({ hold: true, x: .7, y: .7 }), 1800);
  const dx = g.player.x - p0.x, dy = g.player.y - p0.y; assert.ok(dx > .8 && dy > .8, `diagonal flight (dx ${dx.toFixed(2)}, dy ${dy.toFixed(2)})`);
});
