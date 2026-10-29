// Release 557 (Tim, 2026-10-29): far out the land varies again, with the Far Sleep in pockets; a hunt taken up on ground
// already explored moves to unexplored ground; trap damage grows with level; the robot walks out to sea as a submersible.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, applyDream, dreamPocket, DREAM_VERSION, FAR_SLEEP_DEPTH } from '../src/landscape.ts';
import { ensureViewportState, acceptViewportHunt, retargetExploredHunt } from '../src/foundry.ts';
import { DUNGEON_TRAPS, TRAP_LEVEL_GROWTH, trapShareScale, tickNewTraps } from '../src/dungeon-traps.ts';
import { BOAT, aboard, submersible, ensureBoatState } from '../src/boats.ts';

test('the Far Sleep dreams in pockets: about a quarter of far sections, none nearer, the rest keep their own land', () => {
  assert.equal(DREAM_VERSION, 3);
  let far = 0, dreams = 0;
  for (const seed of ['A', 'B']) for (let rx = -120; rx <= 120; rx += 2) for (let ry = -120; ry <= 120; ry += 2) {
    const depth = Math.abs(rx) + Math.abs(ry);
    if (depth <= FAR_SLEEP_DEPTH) { assert.equal(dreamPocket(seed, rx, ry), false); continue; }
    far++; if (dreamPocket(seed, rx, ry)) dreams++;
  }
  assert.ok(dreams / far > .15 && dreams / far < .4, `share dreaming ${(dreams / far).toFixed(3)}`);
  const SEED = 'POCKET'; let plain = null, pocket = null;
  for (let rx = 40; rx < 160 && !(plain && pocket); rx++) { const m = generateRegion(SEED, rx, -60); if (m.settlement) continue; (dreamPocket(SEED, rx, -60) ? (pocket ||= rx) : (plain ||= rx)); }
  const make = (rx, v) => { const m = generateRegion(SEED, rx, -60); applyLandscape(m, SEED, rx, -60); const before = JSON.stringify(m.tiles); applyDream(m, SEED, rx, -60, v); return { m, same: JSON.stringify(m.tiles) === before }; };
  const kept = make(plain, 3); assert.ok(kept.same && !kept.m.dream, 'outside a pocket the ground is its own');
  assert.equal(make(pocket, 3).m.dream, 3, 'a pocket dreams');
  assert.equal(make(plain, 2).m.dream, 2, 'a section pinned to version 2 still dreams as it always did');
});

test('a hunt taken up on explored ground moves to an unexplored section; one under way, or on new ground, stays', () => {
  const s = freshSave(); s.seed = 'HUNTS'; const v = ensureViewportState(s);
  const q = Object.values(v.contracts).find((c) => c.target && c.status === 'available' && !c.finalTarget);
  assert.ok(q, 'an available hunt');
  const was = { ...q.target }; s.explored = {};
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) s.explored[`${was.rx + dx},${was.ry + dy}`] = true;
  const avoid = (x, y) => x === was.rx + 3 && y === was.ry;
  const r = acceptViewportHunt(s, q.id, { avoid });
  const t = s.viewport.contracts[q.id].target;
  assert.ok(!s.explored[`${t.rx},${t.ry}`], `moved to unexplored ${t.rx},${t.ry}`); assert.ok(!avoid(t.rx, t.ry));
  assert.equal(Math.max(Math.abs(t.rx - was.rx), Math.abs(t.ry - was.ry)), 3, 'the nearest ring with open ground');
  assert.match(r.message, new RegExp(`near ${t.rx},${t.ry}`));
  assert.equal(retargetExploredHunt(s, q.id), null, 'accepted: it stays');
  const fresh = freshSave(); fresh.seed = 'HUNTS'; fresh.explored = {}; const w = ensureViewportState(fresh), other = w.contracts[q.id];
  assert.equal(retargetExploredHunt(fresh, q.id), null, 'unexplored target: it stays'); assert.deepEqual(other.target, was);
  // The same seed and explored ground give the same new target.
  const again = freshSave(); again.seed = 'HUNTS'; again.explored = { ...s.explored }; ensureViewportState(again); acceptViewportHunt(again, q.id, { avoid });
  assert.deepEqual(again.viewport.contracts[q.id].target, t);
});

test('trap damage grows with level, up to its cap; a level-1 Wayfarer is hit as before', () => {
  assert.equal(trapShareScale(1), 1); assert.ok(trapShareScale(60) > 1.6); assert.equal(trapShareScale(1000), TRAP_LEVEL_GROWTH.max);
  const hit = (level) => { const dart = { id: 'd', kind: 'trap', trapType: 'dart', newTrap: 2, x: 1, y: 8, dirX: 1, dirY: 0, phase: 'armed', timer: 0 }, w = { player: { x: 6, y: 8.2 }, level, maxHp: 1000, now: 0, projectiles: [], effects: [], seeds: [] };
    for (let i = 0; i < 30; i++) tickNewTraps([dart], w, .05); return w.projectiles[0].damage; };
  assert.equal(hit(1), Math.round(1000 * DUNGEON_TRAPS.dart.share)); assert.equal(hit(80), Math.round(1000 * DUNGEON_TRAPS.dart.share * trapShareScale(80)));
  const g = new Game(Object.assign(freshSave(), { seed: 'TRAP', level: 80 }), 0); assert.equal(g.save.level, 80);
});

const move = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false });
function robotAshore(owned = true) {
  const s = freshSave(); s.seed = 'SUB'; s.perception.aperture = 3255; s.farArray = { listeners: 2 }; s.consumables.submersible = 1; s.capabilities = { ...(s.capabilities || {}), swim: false };
  if (owned) { s.boat = { owned: true, hull: BOAT.maxHull, aboard: false, home: { rx: 0, ry: 0, x: 5, y: 5 }, moored: { rx: 0, ry: 0, x: 5, y: 5 } }; ensureBoatState(s); }
  const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = [];
  assert.equal(g.useConsumable('submersible', 0), true, g.message); assert.ok(g.mechUp());
  g.map.tiles = g.map.tiles.map((t) => ({ ...t, kind: t.x < 14 ? 'ash' : 'ocean', blocked: false, structure: null, buildingId: null, environment: null, elev: 0, slope: false }));
  g.map.objects = []; Object.assign(g.player, { x: 12, y: 16, hp: 100 }); s.maxHp = 100;
  return { s, g };
}

test('the robot walks out to sea as a submersible (so Dodge can dive) and stands up again ashore', () => {
  const { s, g } = robotAshore(); let t = 1000;
  for (let i = 0; i < 60 && !aboard(s); i++) { t += 50; g.update(.05, move(1, 0), t); }
  assert.ok(aboard(s), `aboard at sea: ${g.message}`); assert.ok(submersible(s), 'a submersible'); assert.equal(s.mech.active, true, 'the robot is only folded');
  assert.equal(s.boat.sub, false, 'no frame was fitted or spent');
  for (let i = 0; i < 120 && aboard(s); i++) { t += 50; g.update(.05, move(-1, 0), t); }
  assert.ok(!aboard(s), `ashore: ${g.message}`); assert.ok(g.mechUp(), 'the robot stands again'); assert.equal(s.boat.mechSub, false);
});

test('a robot with no skiff wades as before', () => {
  const { s, g } = robotAshore(false); let t = 1000;
  for (let i = 0; i < 40; i++) { t += 50; g.update(.05, move(1, 0), t); }
  assert.ok(!aboard(s)); assert.ok(g.wading(), 'wading in the robot');
});

test('by a Wayglass, Act answers the Wayglass, never the boat or a neighbour, and no skiff is built there', async () => {
  const { WAYGLASS_ZONE } = await import('../src/game.ts');
  const { s, g } = robotAshore(); s.materials = { ...(s.materials || {}), wood: 99 }; s.capabilities.swim = true; g.save.mech.active = false;
  g.map.objects = [{ id: 'wg', kind: 'checkpoint', name: 'Test Wayglass', x: 12, y: 18, state: 'quiet', actions: ['activate'] }, { id: 'npc-x', kind: 'npc', name: 'Someone', x: 13, y: 16, actions: ['talk'], lore: 'Hello.' }];
  Object.assign(g.player, { x: 13, y: 16.2 }); assert.ok(g.wayglassNear(), 'within the zone'); assert.ok(WAYGLASS_ZONE.reach >= 2);
  g.interact(); assert.ok(s.checkpoints?.[`${g.rx},${g.ry}`], `the Wayglass answered: ${g.message}`); assert.ok(!aboard(s), 'no skiff');
  assert.equal(g.buildSkiffHere().ok, false, 'no skiff by the Wayglass');
  g.map.objects = []; assert.equal(g.wayglassNear(), null);
});
