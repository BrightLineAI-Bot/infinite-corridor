// Waystone warp (Tim, 2026-11-28): a Waystone rested at joins the Wayglass travel list, and a warp there is a plain arrival at the
// stone; at any Waystone, "Travel out" returns to the last Wayglass used, or to the Pentagon's outer gate with none. Saves stay
// additive at schema 14; Pentagons before version 11 have no Waystones and get nothing new.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, restedWaystones, WAYSTONE_WARP, footprintOpen, mapWidth } from '../src/game.ts';
import { validActions } from '../src/interactions.ts';
import { PENTAGON, pentagonPlan, pentagonFrontDoor } from '../src/pentagon.ts';
import { ADVENTURE_PENTAGON as AP } from '../src/adventures.ts';

const site = (seed) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { s, g, cx, cy }; return null; };
const start = (seed = 'TIM1') => { const { s, g, cx, cy } = site(seed); g.rx = cx; g.ry = cy + 1; g.loadArea('overworld', false); const P = pentagonPlan(seed, cx, cy, g.map.pentagon.V); return { s, g, P }; };
const go = (g, P, q) => { g.save.session.activeDungeonId = `${P.base}:f${q.n + 1}`; g.save.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false); };
const hubOf = (P) => P.nodes.find((n) => n.id === 'w0');
const stoneIn = (g) => g.map.objects.find((o) => o.kind === 'pentWaystone');
const rest = (g, P, q = hubOf(P)) => { go(g, P, q); const o = stoneIn(g); g.player.x = o.x; g.player.y = o.y; return g.interact('rest', o.id); };
const reload = (s) => new Game(migrateSave(JSON.parse(JSON.stringify(s))), 5000);
const H = (s, P) => s.consequences.dungeons[`${P.base}:f1`];

test('a rested Waystone joins the Wayglass list, named for its Pentagon, hall and ring; one not rested at does not', () => {
  const { s, g, P } = start(); assert.ok(P.V >= AP.version && P.adventure, 'a version-11 Pentagon');
  assert.deepEqual(restedWaystones(s), [], 'nothing before a rest');
  assert.ok(rest(g, P).ok); const list = restedWaystones(s), hub = hubOf(P);
  assert.equal(list.length, 1); assert.equal(list[0].id, `${P.base}:f${hub.n + 1}`); assert.equal(list[0].key, `${WAYSTONE_WARP.prefix}${list[0].id}`);
  assert.match(list[0].label, /^Waystone · .+ Pentagon, The Waystone Hall \(ring \d+\)$/); assert.equal(list[0].ring, Math.abs(P.cx) + Math.abs(P.cy));
  const w2 = P.nodes.find((q) => q.waystone === 2); if (w2) assert.ok(!list.some((w) => w.id === `${P.base}:f${w2.n + 1}`), 'the deep Waystone waits for its own rest');
  // and the same list after a save and reload
  assert.deepEqual(restedWaystones(migrateSave(JSON.parse(JSON.stringify(s)))).map((w) => w.key), list.map((w) => w.key));
});

test('a rest from before this release (advRest only) counts; a pre-v11 Pentagon or a stray record never does', () => {
  const { s, P } = start(), hub = hubOf(P), id = `${P.base}:f${hub.n + 1}`;
  s.consequences.dungeons[`${P.base}:f1`] = { advRest: { id, x: 20, y: 20, name: 'The Waystone' } };
  const old = P.base.replace(/:v\d+$/, ':v10'); s.consequences.dungeons[`${old}:f1`] = { advWaystones: [{ id: `${old}:f3`, x: 5, y: 5, name: 'The Waystone', waystone: 1 }], advRest: { id: `${old}:f3`, x: 5, y: 5 } };
  s.consequences.dungeons[`${P.base.replace(/:-?\d+:-?\d+:/, ':0:0:')}:f1`] = { advWaystones: [{ id, x: 1, y: 1 }] }; // an id from another Pentagon's history
  const back = migrateSave(JSON.parse(JSON.stringify(s))), list = restedWaystones(back);
  assert.deepEqual(list.map((w) => w.id), [id]);
});

test('warp in: from the open world to the Waystone, a plain arrival on clear floor beside the stone (no rest, no respawn)', () => {
  const { s, g, P } = start(); rest(g, P); const respawns = H(s, P).advRespawn;
  g.leaveDungeon(''); assert.equal(g.area, 'overworld'); assert.ok(g.travelToCheckpoint('0,0')); g.player.hp = 5;
  const w = restedWaystones(s)[0]; assert.ok(g.travelToWaystone(w.key), g.message);
  assert.equal(g.area, 'dungeon'); assert.equal(g.areaId(), w.id); const o = stoneIn(g), p = g.player;
  assert.ok(Math.hypot(p.x - o.x, p.y - o.y) <= 3, `beside the stone: ${p.x},${p.y} vs ${o.x},${o.y}`);
  assert.ok(footprintOpen(g.map, mapWidth(g.map, 'dungeon'), p.x, p.y, false, false, false, true), 'on clear floor');
  assert.ok(g.enemies.every((e) => e.dead || Math.hypot(e.x - p.x, e.y - p.y) >= WAYSTONE_WARP.clear), 'nothing on top of you');
  assert.equal(H(s, P).advRespawn, respawns, 'not a rest: nothing stands again'); assert.equal(p.hp, 5, 'not a rest: no healing');
  assert.equal(g.glide, null); assert.equal(g.swimming, false);
  assert.deepEqual(s.session.dungeonReturn, pentagonFrontDoor(P), 'with no door taken, the way out is the outer gate');
  // exact resume after the warp
  g.sync(); const back = reload(s); assert.equal(back.area, 'dungeon'); assert.equal(back.areaId(), w.id);
  assert.ok(Math.abs(back.player.x - p.x) < 1e-6 && Math.abs(back.player.y - p.y) < 1e-6, 'the same spot');
});

test('warp in is refused where Wayglass travel is: in a dungeon (a Pentagon too), the Rite, after a displacement, and unknown stones', () => {
  const { s, g, P } = start(); rest(g, P); const w = restedWaystones(s)[0];
  assert.equal(g.travelToWaystone(w.key), false, 'inside the Pentagon itself'); assert.match(g.message, /Wayglass travel/);
  g.leaveDungeon(''); assert.equal(g.travelToWaystone(`${WAYSTONE_WARP.prefix}${P.base}:f1`), false); assert.match(g.message, /Rest against it first/);
  s.session.displacementJourney = { source: {}, destination: {} }; assert.equal(g.travelToWaystone(w.key), false); s.session.displacementJourney = null;
  g.rite = { key: '0,0', at: { x: 1, y: 1 } }; assert.equal(g.travelToWaystone(w.key), false); g.rite = null;
  assert.equal(g.area, 'overworld'); assert.ok(g.travelToWaystone(w.key));
});

test('Travel out returns to the last Wayglass used, where Wayglass travel would set you down; round trip with reloads between', () => {
  const { s, g, P } = start(); rest(g, P); g.leaveDungeon(''); assert.ok(g.travelToCheckpoint('0,0'));
  assert.deepEqual({ ...s.waystoneWarp.lastWayglass }, { rx: 0, ry: 0, x: s.checkpoints['0,0'].x, y: s.checkpoints['0,0'].y, name: s.checkpoints['0,0'].name });
  const ref = { x: g.player.x, y: g.player.y };
  let game = reload(s); const w = restedWaystones(game.save)[0]; assert.ok(game.travelToWaystone(w.key));
  game.sync(); game = reload(game.save); assert.equal(game.areaId(), w.id);
  const o = stoneIn(game); assert.ok(validActions(o, game.save).includes(WAYSTONE_WARP.out)); assert.match(o.actionLabels[WAYSTONE_WARP.out], /^Travel out · /);
  game.player.x = o.x; game.player.y = o.y; const r = game.interact(WAYSTONE_WARP.out, o.id); assert.ok(r.ok, r.message);
  assert.equal(game.area, 'overworld'); assert.equal(game.rx, 0); assert.equal(game.ry, 0);
  assert.ok(Math.hypot(game.player.x - ref.x, game.player.y - ref.y) < 1.5, 'where the Wayglass sets you down');
  const h = game.save.consequences.dungeons[w.id]; assert.equal(h.visitOpen, false); assert.ok(!(h.abandoned > 0), 'a walk out, not an abandoned crossing');
  game.sync(); const after = reload(game.save); assert.equal(after.area, 'overworld'); assert.equal(after.rx, 0);
  assert.equal(restedWaystones(after.save).length, 1, 'the Waystone stays on the list');
});

test('Travel out with no Wayglass used falls back to the outer gate; refused in a fight', () => {
  const { s, g, P } = start(); assert.equal(s.waystoneWarp.lastWayglass, null); rest(g, P); const o = stoneIn(g);
  assert.match(o.actionLabels[WAYSTONE_WARP.out], /outer gate/);
  const foe = { ...(g.enemies[0] || {}), id: 'test-foe', kind: 'ashHound', x: g.player.x + 2, y: g.player.y, hp: 10, maxHp: 10, dead: false, aggro: true }; g.enemies.push(foe);
  const r0 = g.interact(WAYSTONE_WARP.out, o.id); assert.equal(r0.ok, false); assert.match(r0.message, /fight/); assert.equal(g.area, 'dungeon');
  foe.dead = true; const r = g.interact(WAYSTONE_WARP.out, o.id); assert.ok(r.ok, r.message); assert.equal(g.area, 'overworld');
  const gate = pentagonFrontDoor(P); assert.equal(g.rx, gate.rx); assert.equal(g.ry, gate.ry); assert.ok(Math.hypot(g.player.x - gate.x, g.player.y - gate.y) < 3);
});

test('Act at a Waystone opens its choices; its generated actions stay as they were; resting keeps its rules', () => {
  const { g, P } = start(); go(g, P, hubOf(P)); const o = stoneIn(g); g.player.x = o.x; g.player.y = o.y;
  assert.deepEqual(o.actions, ['rest']); assert.deepEqual(validActions(o, g.save), ['rest', 'travelOut']);
  const r = g.interact(null, o.id); assert.ok(r.ok); assert.equal(g.interactionRequested, o.id); assert.equal(g.save.consequences.dungeons[`${P.base}:f1`]?.advRest, undefined, 'no rest until chosen');
  assert.ok(g.interact('rest', o.id).ok);
});

test('an arrival with a creature on top of it steps to clear floor, within a bounded search', () => {
  const { s, g, P } = start(); rest(g, P); g.leaveDungeon(''); const w = restedWaystones(s)[0]; assert.ok(g.travelToWaystone(w.key));
  const p = g.player; g.enemies.push({ id: 'on-top', kind: 'ashHound', x: p.x, y: p.y, hp: 10, maxHp: 10, dead: false });
  assert.ok(g.clearOfCreatures()); assert.ok(Math.hypot(p.x - g.enemies.at(-1).x, p.y - g.enemies.at(-1).y) >= WAYSTONE_WARP.clear);
  assert.ok(footprintOpen(g.map, mapWidth(g.map, 'dungeon'), p.x, p.y, false, false, false, true));
});

test('migration: an old save gains an empty waystoneWarp; a stored one and unknown fields are kept; a broken one is cleared', () => {
  const s = freshSave(); assert.deepEqual(s.waystoneWarp, { lastWayglass: null });
  const raw = JSON.parse(JSON.stringify(s)); delete raw.waystoneWarp; assert.deepEqual(migrateSave(raw).waystoneWarp, { lastWayglass: null });
  raw.waystoneWarp = { lastWayglass: { rx: 3, ry: -2, x: 10, y: 11, name: 'A Wayglass', crown: true }, later: 7 };
  const m = migrateSave(JSON.parse(JSON.stringify(raw))); assert.deepEqual(m.waystoneWarp, raw.waystoneWarp); assert.equal(m.version, 14);
  raw.waystoneWarp = { lastWayglass: { rx: 'x', ry: 0, x: null, y: 1 } }; assert.equal(migrateSave(raw).waystoneWarp.lastWayglass, null);
});
