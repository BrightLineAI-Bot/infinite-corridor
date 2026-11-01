// Release 647 (Tim, 2026-11-01: "you jump, and then you hit the jump button again, and you hold it... you boost all the way up to...
// 5... feather it... fuel... if it drops you... you're gonna die... vertical traversal on the trees... don't need to change anything
// about how the drone works in the dungeon"): on the overworld the drone is a booster.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRONE, DRONE_LIFT, setMechMode } from '../src/vehicle-gates.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

const ready = () => { const s = freshSave(); s.seed = 'DRONE'; s.perception.aperture = 3255; s.farArray = { listeners: 4 }; s.consumables.submersible = 1; s.maxHp = 100; return s; };
const flying = () => { const s = ready(), g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = []; setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry;
  const w = 32; for (const t of g.map.tiles) Object.assign(t, { kind: 'ash', blocked: false, elev: 0, slope: false, environment: null, structure: null, buildingId: null }); g.map.objects = []; g.map.enemySpawns = [];
  Object.assign(g.player, { x: 10, y: 10, hp: 100, maxHp: 100 }); return { s, g, w }; };
// Drive the game: `plan(i)` gives { jump: pressed this frame, hold: Jump held, x, y }.
function fly(g, frames, plan, t0 = 1000) { let t = t0; for (let i = 0; i < frames; i++) { const f = plan(i) || {}; g.update(.05, { state: { x: f.x || 0, y: f.y || 0 }, consume: (k) => k === 'jump' && !!f.jump, held: (k) => k === 'jump' && !!f.hold }, t); t += 50; } return t; }
const deaths = (s) => s.worldFlags.deaths || 0;

test('Jump, then Jump again in the air: the booster lifts the Wayfarer to five levels and holds them there while Jump is held', () => {
  const { s, g } = flying(); assert.ok(g.droneUp());
  fly(g, 2, (i) => ({ jump: i === 0, hold: false })); assert.equal(g.droneLift, null, 'one press is an ordinary jump');
  fly(g, 30, (i) => ({ jump: i === 0, hold: true }), 1100);
  assert.ok(g.droneLift, 'the booster fires'); assert.equal(g.droneLift.z, DRONE_LIFT.max, 'no higher than five levels'); assert.ok(s.mech.fuel < DRONE.carry, 'it burns its carry');
  const x0 = g.player.x; fly(g, 6, () => ({ hold: true, x: 1 }), 2700); assert.ok(g.player.x > x0 + .5, 'moves across at the top'); assert.equal(g.droneLift.z, DRONE_LIFT.max);
  assert.equal(g.player.hp, 100);
});

test('let go at the top and it drops you: a five-level fall kills', () => {
  const { s, g } = flying(); const before = deaths(s);
  fly(g, 1, () => ({ jump: true })); fly(g, 30, (i) => ({ jump: i === 0, hold: true }), 1100); assert.equal(g.droneLift.z, DRONE_LIFT.max);
  fly(g, 40, () => ({ hold: false }), 2700);
  assert.equal(deaths(s) - before, 1, 'dead');
});

test('feathered, it brings you down safely; run dry high up, it drops you', () => {
  { const { s, g } = flying(); const before = deaths(s);
    fly(g, 1, () => ({ jump: true })); fly(g, 30, (i) => ({ jump: i === 0, hold: true }), 1100);
    fly(g, 200, (i) => ({ hold: i % 3 === 0 }), 2700); // a tap every third frame
    assert.equal(g.droneLift, null, 'landed'); assert.equal(deaths(s), before); assert.equal(g.player.hp, 100, 'unhurt'); }
  { const { s, g } = flying(); const before = deaths(s); s.mech.fuel = 1.4; // enough to climb, not to hover
    fly(g, 1, () => ({ jump: true })); fly(g, 80, (i) => ({ jump: i === 0, hold: true }), 1100);
    assert.equal(deaths(s) - before, 1, 'the booster sputtered out at the top'); }
});

test('a short hop with the booster hurts no more than its drop; the lift resumes after a save; in a dungeon the drone carries as before', () => {
  { const { s, g } = flying(); fly(g, 1, () => ({ jump: true })); fly(g, 8, (i) => ({ jump: i === 0, hold: true }), 1100); // about 1.4 levels up
    const z = g.droneLift.z; assert.ok(z > 1 && z < 2, `${z}`);
    const snap = g.exportSnapshot(1550), g2 = new Game(JSON.parse(JSON.stringify(snap)), 0); assert.ok(g2.droneLift && Math.abs(g2.droneLift.z - z) < 1e-9, 'resumes in the air');
    fly(g, 40, () => ({ hold: false }), 1550); assert.equal(g.droneLift, null); assert.equal(g.player.hp, 100, 'a one-level drop is safe'); }
  { const { s, g } = flying(); g.area = 'dungeon'; fly(g, 1, () => ({ jump: true })); fly(g, 4, (i) => ({ jump: i === 0, hold: true }), 1100); assert.equal(g.droneLift, null, 'no booster below ground'); }
});
