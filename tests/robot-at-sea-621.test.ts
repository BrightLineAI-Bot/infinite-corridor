// Release 621 (Tim, 2026-10-31): "When you [leave] the water with the robot... it leaves a boat behind... why is there a boat
// behind?"; and "the power armor version... should also be a submersible... you should be able to switch to it while it's on
// the water... it floats above the water... a slight crater around it... where the water is depressed due to the thrusters...
// it can also... go down underneath the water". Also: the 619 wading effect is taken out ("let's go back to the way it was").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { BOAT, aboard, submersible, ensureBoatState, disembark, skiffMooring } from '../src/boats.ts';

const move = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false });
function robotAshore(moored = { rx: 0, ry: 0, x: 5, y: 5 }) {
  const s = freshSave(); s.seed = 'SUB'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; s.capabilities = { ...(s.capabilities || {}), swim: false };
  s.boat = { owned: true, hull: BOAT.maxHull, aboard: false, home: { rx: 0, ry: 0, x: 5, y: 5 }, moored }; ensureBoatState(s);
  const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = [];
  assert.equal(g.useConsumable('submersible', 0), true, g.message); assert.ok(g.mechUp());
  g.map.tiles = g.map.tiles.map((t) => ({ ...t, kind: t.x < 14 ? 'ash' : 'ocean', blocked: false, structure: null, buildingId: null, environment: null, elev: 0, slope: false }));
  g.map.objects = g.map.objects.filter((o) => o.kind === 'skiff'); Object.assign(g.player, { x: 12, y: 16, hp: 100 }); s.maxHp = 100;
  return { s, g };
}
const voyage = (s, g) => { let t = 1000;
  for (let i = 0; i < 60 && !aboard(s); i++) { t += 50; g.update(.05, move(1, 0), t); } assert.ok(aboard(s) && submersible(s), `at sea: ${g.message}`);
  return { ashore: (dy = 0) => { for (let i = 0; i < 160 && aboard(s); i++) { t += 50; g.update(.05, move(-1, dy), t); } assert.ok(!aboard(s), `ashore: ${g.message}`); }, t: () => (t += 50) }; };

test('the robot comes ashore without leaving a skiff behind; the skiff stays where it was moored', () => {
  const { s, g } = robotAshore(), v = voyage(s, g);
  assert.ok(!g.map.objects.some((o) => o.id === 'skiff-moored'), 'no skiff in this section while the robot is at sea');
  v.ashore(); assert.ok(g.mechUp(), 'the robot stands again');
  assert.deepEqual(s.boat.moored, { rx: 0, ry: 0, x: 5, y: 5 }, 'the skiff is still at its mooring'); assert.equal(s.boat.mechSubFrom, undefined);
  assert.ok(!g.map.objects.some((o) => o.kind === 'skiff'), 'no boat left on the shore');
});

test('a skiff moored in the same section stays in sight at its mooring, at sea and after', () => {
  const { s, g } = robotAshore({ rx: 3, ry: 3, x: 5, y: 5 }), v = voyage(s, g);
  const at = () => g.map.objects.filter((o) => o.id === 'skiff-moored').map((o) => [o.x, o.y]);
  assert.deepEqual(at(), [[5, 5]], 'at sea, the skiff is still moored where it was'); assert.deepEqual(skiffMooring(s), { rx: 3, ry: 3, x: 5, y: 5 });
  v.ashore(1); assert.deepEqual(at(), [[5, 5]], 'ashore, still the one skiff, where it was');
});

test('at sea the robot button goes round: power armor (with cinder iron), then out into your skiff (release 639); Dodge still dives', () => {
  const { s, g } = robotAshore(); voyage(s, g); s.materials.cinderIron = 10;
  assert.equal(g.useConsumable('submersible', 0), true, g.message); assert.equal(s.mech.empowered, true); assert.match(g.message, /power armor lifts/);
  assert.ok(aboard(s) && submersible(s), 'still a submersible'); assert.equal(s.consumables.submersible, 0, 'no frame was fitted');
  assert.equal(g.useConsumable('submersible', 0), true); assert.ok(!s.mech.empowered && !s.mech.active, 'the robot folded away'); assert.ok(aboard(s) && !s.boat.mechSub, 'sitting in the skiff'); assert.equal(s.boat.mechSubFrom, undefined); assert.match(g.message, /sitting in your skiff/);
  assert.ok(!g.map.objects.some((o) => o.id === 'skiff-moored'), 'the skiff is under you, not at its old mooring');
  const again = robotAshore(); voyage(again.s, again.g); again.s.materials.cinderIron = 0;
  assert.equal(again.g.useConsumable('submersible', 0), true, 'no iron: straight out'); assert.ok(!again.s.mech.active && aboard(again.s));
});

test('wading in the robot without a skiff, it will not fold away and drop you in water you cannot swim', () => {
  const { s, g } = robotAshore(); s.boat = { owned: false }; ensureBoatState(s); let t = 1000;
  for (let i = 0; i < 40; i++) { t += 50; g.update(.05, move(1, 0), t); }
  assert.ok(g.wading()); s.materials.cinderIron = 0; assert.equal(g.useConsumable('submersible', 0), false); assert.ok(s.mech.active); assert.match(g.message, /wade the robot ashore/);
});

test('saves: mechSubFrom is kept only on a robot voyage; a voyage begun before 621 moors where it lands, as before', () => {
  const s = freshSave(); s.boat = { owned: true, hull: 10, aboard: true, mechSub: true, mechSubFrom: { rx: 1, ry: 2, x: 3, y: 4 } }; ensureBoatState(s);
  assert.deepEqual(s.boat.mechSubFrom, { rx: 1, ry: 2, x: 3, y: 4 });
  const plain = freshSave(); plain.boat = { owned: true, hull: 10, aboard: true, mechSubFrom: { rx: 1, ry: 2, x: 3, y: 4 } }; ensureBoatState(plain); assert.equal(plain.boat.mechSubFrom, undefined);
  const old = freshSave(); old.boat = { owned: true, hull: 10, aboard: true, mechSub: true }; ensureBoatState(old);
  assert.deepEqual(disembark(old, { rx: 7, ry: 7, x: 2, y: 2 }), { rx: 7, ry: 7, x: 2, y: 2 });
});

test('the power armor hovers over a thruster dip at sea and dims beneath when it dives; the 619 wading is gone', () => {
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(src, /function drawThrustDip/); assert.match(src, /g\._seaSuit = !!\(g\.save\.boat\.mechSub && g\.save\.mech\?\.active && g\.save\.mech\.empowered\)/);
  assert.doesNotMatch(src, /drawWade|wadeAt|WADE/);
});

test('the robot at sea boarding its own moored skiff ends the voyage: the skiff sails with you and moors where you land', () => {
  const { s, g } = robotAshore({ rx: 3, ry: 3, x: 16, y: 5 }); voyage(s, g);
  const o = g.map.objects.find((q) => q.id === 'skiff-moored'); Object.assign(g.player, { x: o.x, y: o.y });
  assert.ok(g.boatAction(o, 'board').ok, g.message); assert.ok(aboard(s)); assert.equal(s.boat.mechSub, false); assert.equal(s.boat.mechSubFrom, undefined);
  assert.equal(disembark(s, { rx: 3, ry: 3, x: 15, y: 9 }).x, 15, 'moored where it landed');
});
