// Release 259 (Tim, 2026-10-21): the Psychic Crystal dodges only after a few hits, and in a dungeon it never goes
// beyond the dungeon's edge into the black.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CRYSTAL, updatePackMonster } from '../src/monster-pack.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';

const IDLE = { state: { x: 0, y: 0 }, consume: () => false };
function mapOf(width = 32, height = width) {
  return { width, height, entry: { x: 4, y: 5 }, objects: [], enemySpawns: [], tiles: Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'wall', blocked: true })) };
}
function rect(map, x0, y0, x1, y1, kind = 'floor') { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) Object.assign(map.tiles[y * map.width + x], { kind, blocked: false }); return map; }
// Two rooms side by side behind a 3-thick wall, a far room no corridor reaches, and solid black all around.
function dungeon() { const m = mapOf(); rect(m, 3, 3, 9, 9); rect(m, 13, 3, 19, 9); rect(m, 24, 22, 27, 25); return m; }
function fixture(map = dungeon(), at = { x: 5, y: 5 }) {
  const game = Object.assign(Object.create(Game.prototype), { save: freshSave(), area: 'dungeon', map, player: { x: 7, y: 7, hp: 1e6, facing: 'down' }, enemies: [], projectiles: [], effects: [], packEffects: [], performanceStats: { pathfindingWork: 0 } });
  const e = createCombatant('psychicCrystal', at.x, at.y, true, []); Object.assign(e, { id: 'c', worldBeast: 'psychicCrystal', aggro: true, hp: 3000, maxHp: 3000, packAttacks: [], packBossAttacks: [] });
  game.enemies = [e]; return { game, e, map };
}
const ok = (g, x, y) => g.roamerBounds()[y * g.map.width + x] === 1;

test('a dungeon Crystal may be over any room (even one walking cannot reach), the walls touching it and walls between rooms, never the black beyond', () => {
  const { game } = fixture();
  assert.ok(ok(game, 5, 5) && ok(game, 25, 23), 'rooms, including one no corridor reaches');
  assert.ok(ok(game, 2, 5) && ok(game, 10, 5), 'walls touching a room');
  assert.ok(ok(game, 11, 5), 'the middle of a 3-thick wall between two rooms');
  assert.ok(!ok(game, 0, 0) && !ok(game, 31, 31) && !ok(game, 5, 13) && !ok(game, 1, 5), 'the black beyond the dungeon\'s edge');
});

test('in play it never ends a tick in the black; one saved out there comes back on load', () => {
  const s = freshSave(); s.seed = 'ROAM-REVIEW'; s.level = 8; const g = new Game(s, 0), id = 'dungeon:ROAM-REVIEW:g1:5:5:site-59'; s.session.activeDungeonId = id;
  s.worldBeasts.psychicCrystal.active = { dungeon: id, tries: 0 }; g.loadArea('dungeon', false);
  const c = g.enemies.find((q) => q.worldBeast === 'psychicCrystal'); assert.ok(c, 'the haunt is there');
  const W = g.map.width, bounds = g.roamerBounds(), outside = bounds.findIndex((v) => !v); assert.ok(outside >= 0, 'this dungeon has black beyond its edge');
  c.x = outside % W; c.y = Math.floor(outside / W); assert.equal(g.roamerInBounds(c), false);
  g.snapshotArea(); g.loadArea('dungeon', false);
  const back = g.enemies.find((q) => q.worldBeast === 'psychicCrystal'); assert.ok(g.roamerInBounds(back), `brought back from the black (${back.x},${back.y})`);
  back.aggro = true; let t = 1000;
  for (let i = 0; i < 150; i++) { g.update(1 / 30, IDLE, t += 33); g.player.hp = 1e6; assert.ok(g.roamerInBounds(back), `in bounds at ${back.x},${back.y}`); }
});

test('poise: the Crystal still dodges freely; enough landed hits break it to the floor, helpless, then it rises and springs away', () => {
  const { game, e } = fixture(dungeon(), { x: 6, y: 6 }); e.evasive = true; game.player.x = 7; game.player.y = 6;
  const w = game.packWorld(1 / 30, 0); w.playerSwinging = true; w.los = () => true;
  const tick = () => { w.now += 33; updatePackMonster(e, w); };
  tick(); assert.ok(e.pack.evade, 'it still dodges a swing before it has been hit');
  while (e.pack.evade) tick(); e.pack.cd.qbEvade = 1e9; // keep it standing for the hits
  for (let k = 1; k < CRYSTAL.poiseHits; k++) { e.hp -= 50; tick(); assert.ok(!(e.pack.broken > 0), `holds after ${k} hit(s)`); }
  e.hp -= 50; tick(); assert.ok(e.pack.broken > 0, `breaks after ${CRYSTAL.poiseHits} hits`);
  for (let i = 0; i < 12; i++) tick(); assert.equal(e.crystalFall, 1, 'down on the floor');
  e.pack.cd.qbEvade = 0; const at = { x: e.x, y: e.y };
  for (let i = 0; i < 30; i++) { tick(); assert.equal(!!e.pack.evade, false, 'no dodge while broken'); assert.equal(e.untargetable, false, 'it can be hit'); assert.equal(e.pack.attack, null, 'no attacks'); }
  assert.deepEqual({ x: e.x, y: e.y }, at, 'it does not move');
  let t = 0; while (e.pack.broken > 0 && t++ < 200) tick();
  assert.ok(e.pack.evade && e.untargetable, 'up again, it springs away'); assert.equal(e.crystalFall, 0);
  const d0 = Math.hypot(at.x - game.player.x, at.y - game.player.y); while (e.pack.evade) tick();
  assert.ok(Math.hypot(e.x - game.player.x, e.y - game.player.y) > d0, 'away from the Wayfarer');
});

test('poise forgets: hits spread out more than poiseForget apart never break it', () => {
  const { game, e } = fixture(dungeon(), { x: 6, y: 6 }); const w = game.packWorld(1 / 30, 0); w.los = () => true;
  const tick = () => { w.now += 33; updatePackMonster(e, w); };
  for (let k = 0; k < CRYSTAL.poiseHits * 2; k++) { e.hp -= 10; tick(); for (let i = 0; i < Math.ceil(CRYSTAL.poiseForget * 30) + 2; i++) tick(); assert.ok(!(e.pack.broken > 0)); }
});
