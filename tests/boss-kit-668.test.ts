// Release 668 (Tim, 2026-11-01: the crossing guardians "just stand there and take the hits"): guardians and elites get varied
// movesets, more aggression and adds that come in during the fight; world beasts are left alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_KIT, KIT_MOVES, kitRole, applyBossKit, tickBossKit } from '../src/boss-kit.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const guardianSpawn = (kind = 'thunderhorn') => ({ id: 'guard-1', kind, x: 5, y: 5, boss: true, dungeonRole: 'gateWarden', packGuardian: true });

test('who gets the kit: guardians and elites, never world beasts, revenants, wardens or summons', () => {
  assert.equal(kitRole({ dungeonRole: 'gateWarden' }), 'guardian'); assert.equal(kitRole({ packGuardian: true }), 'guardian'); assert.equal(kitRole({ dungeonRole: 'finalBoss' }), 'guardian');
  assert.equal(kitRole({ eliteId: 'vesperwing' }), 'elite'); assert.equal(kitRole({ fracRank: 'rare', affixes: ['spiked'] }), 'elite'); assert.equal(kitRole({ fracRank: 'champion' }), null, 'a champion pack member that is not its leader');
  for (const e of [{ worldBeast: 'tremorWorm', dungeonRole: 'gateWarden' }, { questingBeast: true }, { gatePredator: true }, { fracWarden: true }, { farArrayBoss: 'guardian', dungeonRole: 'finalBoss' }, { summonedBy: 'x', eliteId: 'y' }, {}]) assert.equal(kitRole(e), null, JSON.stringify(e));
});

test('a crossing guardian gains moves, signature moves and aggression, the same each time', () => {
  const s = freshSave(); s.seed = 'KIT'; const g = new Game(s, 0);
  const plain = MONSTER_PACK.thunderhorn.attacks.length + (MONSTER_PACK.thunderhorn.bossAttacks?.length || 0);
  const a = g.createEnemyFromSpawn(guardianSpawn(), 'dungeon'), b = g.createEnemyFromSpawn(guardianSpawn(), 'dungeon');
  assert.equal(a.kitRole, 'guardian'); assert.deepEqual(a.packAttacks, b.packAttacks); assert.deepEqual(a.kitMoves, b.kitMoves);
  assert.ok(a.packAttacks.length >= MONSTER_PACK.thunderhorn.attacks.length + 1, 'more modules'); assert.ok(plain > 0);
  assert.equal(a.kitMoves.length, BOSS_KIT.guardian.moves); assert.ok(a.kitMoves.every((m) => KIT_MOVES[m]));
  assert.ok(a.attackGap <= BOSS_KIT.guardian.attackGap && a.attackCooldownScale < 1);
  const ash = g.createEnemyFromSpawn({ id: 'x', kind: 'ashling', x: 5, y: 5 }, 'dungeon'); assert.equal(ash.kitRole, undefined, 'plain creatures are unchanged');
  const once = applyBossKit({ ...a }, s.seed, () => true); assert.deepEqual(once.packAttacks, a.packAttacks, 'never applied twice');
});

test('signature moves are telegraphed marks that strike once; adds come at each health threshold and go when it falls', () => {
  const e = { id: 'g', kitRole: 'guardian', kitMoves: ['barrage', 'quake'], x: 10, y: 10, hp: 100, maxHp: 100, damage: 20, aggro: true };
  const game = { player: { x: 12, y: 10 }, enemies: [e], affixHazards: [] }; const calls = [];
  const spawn = (owner, n) => { calls.push(n); for (let i = 0; i < n; i++) game.enemies.push({ id: `a${calls.length}-${i}`, kitAddOf: owner.id, summonedBy: owner.id, hp: 10, maxHp: 10, x: 9, y: 9 }); return n; };
  for (let t = 0; t < 12000; t += 50) tickBossKit(game, .05, t, spawn);
  let marked = 0; const g2 = { ...game, affixHazards: [] }; for (let t = 12000; t < 30000; t += 50) { tickBossKit(g2, .05, t, spawn); marked = Math.max(marked, g2.affixHazards.length); }
  assert.ok(marked >= 1, 'it marks the ground'); assert.ok(g2.affixHazards.every((h) => h.armAt > 0 && KIT_MOVES[h.kind]), 'with a warning first');
  assert.equal(calls.length, 0, 'no adds at full health');
  e.hp = 70; tickBossKit(game, .05, 31000, spawn); assert.equal(calls.length, 1); tickBossKit(game, .05, 31050, spawn); assert.equal(calls.length, 1, 'once per threshold');
  e.hp = 20; tickBossKit(game, .05, 31100, spawn); tickBossKit(game, .05, 31150, spawn); tickBossKit(game, .05, 31200, spawn); assert.equal(calls.length, 3, 'one per threshold passed');
  assert.ok(game.enemies.filter((q) => q.kitAddOf && !q.dead).length <= BOSS_KIT.guardian.adds.cap + 3);
  e.dead = true; tickBossKit(game, .05, 31250, spawn); assert.ok(game.enemies.filter((q) => q.kitAddOf).every((q) => q.dead && q.noRewards), 'its adds go with it');
});

test('in the game, a hurt guardian calls the area\'s creatures round itself, as summons with no rewards', () => {
  const s = freshSave(); s.seed = 'KIT'; const g = new Game(s, 0); g.area = 'dungeon';
  const guard = g.createEnemyFromSpawn({ ...guardianSpawn(), x: g.player.x + 3, y: g.player.y }, 'dungeon'); guard.aggro = true; g.enemies = [guard, g.createEnemyFromSpawn({ id: 'o', kind: 'ashling', x: g.player.x - 3, y: g.player.y })];
  const n = g.spawnKitAdds(guard, 2, 0); assert.ok(n >= 1, `${n} came`);
  const adds = g.enemies.filter((q) => q.kitAddOf === guard.id); assert.ok(adds.every((q) => q.noRewards && q.summonedBy === guard.id && q.aggro && !q.kitRole));
});
