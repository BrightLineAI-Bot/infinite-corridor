// Release 523 (Tim, 2026-10-28): traps that throw lantern-style orbs which land, spin and fire five-pointed stars; lava
// vents that burst and fling lava; dart slits that fire three darts across the room. Only in crossings first generated
// from this release on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, generatePinnedDungeon } from '../src/game.ts';
import { DUNGEON_TRAPS, NEW_TRAP_KINDS, addNewTraps, tickNewTraps } from '../src/dungeon-traps.ts';

const room = () => ({ width: 20, height: 20, entry: { x: 2, y: 2 }, objects: [], tiles: Array.from({ length: 400 }, (_, i) => { const x = i % 20, y = Math.floor(i / 20), wall = x === 0 || y === 0 || x === 19 || y === 19; return { x, y, kind: wall ? 'wall' : 'stone', blocked: wall }; }) });
const world = (player, level = 10) => ({ player, level, now: 0, projectiles: [], effects: [], seeds: [] });

test('placement: 2 to 4 new traps, deterministic, darts against a wall facing into the room', () => {
  const a = addNewTraps(room(), 'S', 'dungeon:S:g1:9:9:hollow'), b = addNewTraps(room(), 'S', 'dungeon:S:g1:9:9:hollow');
  assert.ok(a.length >= DUNGEON_TRAPS.count[0] && a.length <= DUNGEON_TRAPS.count[1], `${a.length}`);
  assert.deepEqual(a.map((t) => [t.trapType, t.x, t.y]), b.map((t) => [t.trapType, t.x, t.y]));
  let darts = 0; for (let k = 0; k < 40; k++) { const m = room(); for (const t of addNewTraps(m, 'S', `id-${k}`)) { assert.ok(NEW_TRAP_KINDS.includes(t.trapType)); assert.ok(Math.hypot(t.x - 2, t.y - 2) >= DUNGEON_TRAPS.minFromEntry); if (t.trapType === 'dart') { darts++; assert.ok(m.tiles[(t.y - t.dirY) * 20 + (t.x - t.dirX)].blocked, 'a wall behind it'); } } }
  assert.ok(darts > 0, 'some dart traps');
  const m = room(); addNewTraps(m, 'S', 'x'); assert.deepEqual(addNewTraps(m, 'S', 'x'), [], 'placed once');
});

test('a sigil trap lobs five orbs that land, spin and fire five-pointed stars', () => {
  const trap = { id: 't', kind: 'trap', trapType: 'sigil', newTrap: 1, x: 10, y: 10, phase: 'armed', timer: 0 }, w = world({ x: 10.2, y: 10 }), S = DUNGEON_TRAPS.sigil;
  tickNewTraps([trap], w, .05); assert.equal(trap.phase, 'warning');
  for (let i = 0; i < 20; i++) tickNewTraps([trap], w, .05);
  assert.equal(w.seeds.length, S.seeds); assert.equal(w.projectiles.length, 0);
  for (let i = 0; i < 40; i++) tickNewTraps([trap], w, .05);
  assert.equal(w.projectiles.length, S.seeds * S.points); assert.equal(w.seeds.length, 0);
  assert.ok(w.projectiles.every((p) => p.hostile && p.jumpable && p.sigilStar));
});

test('sigil orbs land short of walls', () => {
  const m = room(), trap = { id: 's2', kind: 'trap', trapType: 'sigil', newTrap: 1, x: 1, y: 10, phase: 'warning', timer: 0 }, w = { ...world({ x: 1, y: 10 }), open: (x, y) => !m.tiles[Math.floor(y) * 20 + Math.floor(x)]?.blocked };
  tickNewTraps([trap], w, .05); assert.equal(w.seeds.length, DUNGEON_TRAPS.sigil.seeds); assert.ok(w.seeds.every((q) => w.open(q.tx, q.ty)), 'every orb on open floor');
});

test('a lava vent bursts and flings lava that splashes where it lands', () => {
  const trap = { id: 'l', kind: 'trap', trapType: 'lava', newTrap: 1, x: 5, y: 5, phase: 'armed', timer: 0 }, w = world({ x: 5, y: 5.2 }, 30);
  for (let i = 0; i < 20; i++) tickNewTraps([trap], w, .05);
  assert.equal(w.effects.filter((e) => e.hostile && e.kind === 'enemy-blast').length, 1);
  assert.equal(w.projectiles.filter((p) => p.hostile && p.path === 'grenade' && p.lava).length, DUNGEON_TRAPS.lava.blobs);
  assert.equal(w.effects[0].damage, Math.round(DUNGEON_TRAPS.lava.base + DUNGEON_TRAPS.lava.perLevel * 30));
});

test('a dart trap fires three darts along its line, and only when you cross it', () => {
  const trap = { id: 'd', kind: 'trap', trapType: 'dart', newTrap: 1, x: 1, y: 8, dirX: 1, dirY: 0, phase: 'armed', timer: 0 };
  const off = world({ x: 6, y: 12 }); for (let i = 0; i < 20; i++) tickNewTraps([trap], off, .05); assert.equal(off.projectiles.length, 0);
  const w = world({ x: 6, y: 8.2 }); for (let i = 0; i < 30; i++) tickNewTraps([trap], w, .05);
  assert.equal(w.projectiles.length, DUNGEON_TRAPS.dart.darts); assert.ok(w.projectiles.every((p) => p.dx === 1 && Math.abs(p.dy) < 1e-9 && p.jumpable));
});

test('in play, the darts hurt the Wayfarer', () => {
  const s = freshSave(); s.seed = 'TR'; const g = new Game(s, 0);
  g.map = { ...room(), exits: null, enemySpawns: [] }; g.area = 'dungeon'; g.enemies = []; Object.assign(g.player, { x: 8, y: 8, hp: 100 }); s.maxHp = 100;
  g.map.objects = [{ id: 'd', kind: 'trap', trapType: 'dart', newTrap: 1, x: 1, y: 8, dirX: 1, dirY: 0, phase: 'armed', timer: 0 }];
  let t = 1000; for (let i = 0; i < 40; i++) { t += 50; g.update(.05, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, t); }
  assert.ok(g.player.hp < 100, `hit (${g.player.hp})`);
});

test('only crossings first generated from now on get the new traps', () => {
  const s = freshSave(); s.seed = 'TRV'; s.worldGeneration = 1;
  generatePinnedDungeon(s, 'dungeon:TRV:g1:3:4:hollow');
  assert.equal(s.consequences.dungeons['dungeon:TRV:g1:3:4:hollow'].trapsVersion, DUNGEON_TRAPS.version);
  const old = freshSave(); old.seed = 'TRV'; old.consequences.dungeons['dungeon:TRV:g1:3:4:hollow'] = { discovered: true, visits: 2, generatorVersion: 2 };
  generatePinnedDungeon(old, 'dungeon:TRV:g1:3:4:hollow'); assert.equal(old.consequences.dungeons['dungeon:TRV:g1:3:4:hollow'].trapsVersion, undefined);
});

// Release 525 (Tim: "the trap should do more damage. All across the board... the pitfall trap... two seconds before the
// ground falls out. And you die if you stay on the ground. But you can just move").
test('a pit cracks, gives two seconds, then drops whoever stays; stepping off or jumping is safe', async () => {
  const { DUNGEON_TRAPS: T } = await import('../src/dungeon-traps.ts');
  const run = (move, airborne = false) => { const trap = { id: 'p', kind: 'trap', trapType: 'pit', newTrap: 2, x: 5, y: 5, phase: 'armed', timer: 0 }, player = { x: 5, y: 5 }; let fell = 0;
    const w = { ...world(player), airborne, fall: () => fell++ };
    for (let i = 0; i < 60; i++) { if (move && trap.phase === 'warning' && i > 10) player.x = 7; tickNewTraps([trap], w, .05); } return { fell, trap }; };
  assert.ok(T.pit.warn >= 2);
  assert.ok(run(false).fell > 0, 'stayed: falls'); assert.equal(run(true).fell, 0, 'stepped off'); assert.equal(run(false, true).fell, 0, 'in the air');
});
test('every trap hits for at least a share of maximum health', async () => {
  const { TRAP_DAMAGE_SHARE, trapShareScale } = await import('../src/dungeon-traps.ts'); const { updateTraps } = await import('../src/game.ts');
  const trap = { id: 'o', kind: 'trap', trapType: 'spikes', x: 5, y: 5, phase: 'armed', timer: 0, damage: 14, loadGrace: 0, hits: {} }, player = { x: 5, y: 5, hp: 400 };
  for (let i = 0; i < 40 && player.hp === 400; i++) updateTraps([trap], player, .05, false, 400);
  assert.equal(400 - player.hp, Math.round(400 * TRAP_DAMAGE_SHARE));
  const dart = { id: 'd', kind: 'trap', trapType: 'dart', newTrap: 2, x: 1, y: 8, dirX: 1, dirY: 0, phase: 'armed', timer: 0 }, w = { ...world({ x: 6, y: 8.2 }, 5), maxHp: 400 };
  for (let i = 0; i < 30; i++) tickNewTraps([dart], w, .05); assert.equal(w.projectiles[0].damage, Math.round(400 * DUNGEON_TRAPS.dart.share * trapShareScale(5))); // release 557: the share grows with level
});
test('crossings stamped with version 1 keep their three kinds and placement', () => {
  const a = addNewTraps(room(), 'S', 'dungeon:S:g1:9:9:hollow', 1); assert.ok(a.every((t) => t.trapType !== 'pit' && t.newTrap === 1));
  let pits = 0; for (let k = 0; k < 30; k++) pits += addNewTraps(room(), 'S', `v2-${k}`).filter((t) => t.trapType === 'pit').length; assert.ok(pits > 0);
});
