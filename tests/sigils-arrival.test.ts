// Release 263 (Tim, 2026-10-21): Crossing Sigils drop from world beasts and Gate Revenants, and, ultra rarely, from a
// guardian on a dungeon's second level or deeper (never its first); arriving on a lower level never puts the Wayfarer
// right beside its guardian.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, SIGIL_DROPS, ARRIVAL, sigilDrop, clearArrival, isDungeonGuardian } from '../src/game.ts';
import { DEEP_ARCHETYPE_IDS, deepV2Id } from '../src/deep-dungeons.ts';

const deep = { multiLevel: true, levels: [{ id: 'mouth' }, { id: 'lower' }], levelId: 'lower' };
test('sigils: world beasts and Gate Revenants always; a lower-level guardian ultra rarely; a first-level guardian never', () => {
  const s = freshSave();
  assert.equal(sigilDrop(s, { id: 'g', worldBeast: 'lightningGiant' }, {}, 1), SIGIL_DROPS.worldBeast);
  assert.equal(sigilDrop(s, { id: 'q', questingBeast: true }, {}, 1), SIGIL_DROPS.worldBeast);
  assert.equal(sigilDrop(s, { id: 'r', kind: 'gateRevenant' }, {}, 1), SIGIL_DROPS.gateRevenant);
  assert.equal(sigilDrop(s, { id: 'r', kind: 'gateRevenant', noRewards: true }, {}, 1), 0);
  let lower = 0, first = 0, plain = 0;
  for (let n = 0; n < 2000; n++) {
    lower += sigilDrop(s, { id: `b${n}`, kind: 'hollowMarshal', boss: true, dungeonRole: 'objectiveGuardian' }, deep, n);
    first += sigilDrop(s, { id: `b${n}`, kind: 'hollowMarshal', boss: true, dungeonRole: 'objectiveGuardian' }, { ...deep, levelId: 'mouth' }, n);
    plain += sigilDrop(s, { id: `b${n}`, kind: 'ashling' }, deep, n);
  }
  assert.ok(lower > 20 && lower < 110, `about ${SIGIL_DROPS.deepGuardian}% (${lower}/2000)`); assert.equal(first, 0); assert.equal(plain, 0);
  let three = 0; for (let n = 0; n < 2000; n++) three += sigilDrop(s, { id: `t${n}`, kind: 'hollowMarshal', boss: true, dungeonRole: 'wingMiniboss' }, { name: 'The Threefold Deep' }, n);
  assert.ok(SIGIL_DROPS.threefold > SIGIL_DROPS.deepGuardian && three > 70 && three < 180, `the Threefold Deep: about ${SIGIL_DROPS.threefold}% (${three}/2000)`);
});

test('a guardian kill in the game adds the sigil to the Wayfarer\'s consumables', () => {
  const s = freshSave(); s.seed = 'SIGIL'; const g = new Game(s, 0), before = s.consumables.crossingSigil || 0;
  const e = g.createEnemyFromSpawn({ id: 'rev', kind: 'gateRevenant', x: 10, y: 10 }); g.enemies.push(e); e.hp = 0; e.dead = true; g.defeatEnemy(e);
  assert.equal(s.consumables.crossingSigil, before + 1);
});

test('clearArrival walks the floor to the nearest spot clear of every guardian, and leaves a clear arrival alone', () => {
  const width = 30, map = { tiles: Array.from({ length: 900 }, (_, i) => { const x = i % 30, y = Math.floor(i / 30); return { x, y, kind: 'floor', blocked: x === 0 || y === 0 || x === 29 || y === 29 || (x === 15 && y < 25) }; }) };
  const guard = { x: 12, y: 5, boss: true, dungeonRole: 'objectiveGuardian' };
  const to = clearArrival(map, width, { x: 12, y: 7 }, [guard]); assert.ok(to, 'moved');
  assert.ok(Math.hypot(to.x - guard.x, to.y - guard.y) >= ARRIVAL.clear); assert.ok(to.x < 15, 'along the floor, not through the wall');
  assert.equal(clearArrival(map, width, { x: 3, y: 26 }, [guard]), null, 'already clear');
  assert.equal(clearArrival(map, width, { x: 12, y: 7 }, [{ ...guard, dead: true }]), null, 'a dead guardian is no threat');
  assert.equal(clearArrival(map, width, { x: 12, y: 7 }, [{ x: 12, y: 5, kind: 'ashling' }]), null, 'only guardians count');
});

test('going down every level of the deep dungeons never lands the Wayfarer within reach of a living guardian', () => {
  let checked = 0, near = 0;
  for (const archetype of DEEP_ARCHETYPE_IDS) for (let i = 0; i < 4; i++) {
    const s = freshSave(); s.seed = `ARRIVE-${i}`; const id = deepV2Id(s.seed, 1, i, -i, archetype);
    s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: i, ry: -i, x: 8, y: 8 }; const g = new Game(s, 0);
    g.loadArea('dungeon', false); if (!g.map.multiLevel) continue; s.session.activeDungeonLevelId = g.map.levelId; g.loadArea('dungeon', false);
    const seen = new Set();
    for (let hop = 0; hop < 6; hop++) {
      const down = g.map.objects.find((o) => o.kind === 'deepTransition' && !seen.has(o.toLevelId) && o.toLevelId !== g.map.levelId); if (!down) break;
      seen.add(g.map.levelId); Object.assign(g.player, { x: down.x, y: down.y }); if (!g.interact('travel', down.id).ok) break;
      const guards = g.enemies.filter((e) => !e.dead && isDungeonGuardian(e)); checked++; if (guards.some((e) => Math.hypot(e.x - down.toX, e.y - down.toY) < ARRIVAL.clear)) near++;
      for (const e of guards) assert.ok(Math.hypot(e.x - g.player.x, e.y - g.player.y) >= ARRIVAL.clear , `${archetype} ${g.map.levelId}: arrived ${Math.hypot(e.x - g.player.x, e.y - g.player.y).toFixed(1)} from ${e.kind}`);
    }
  }
  assert.ok(checked > 4, `levels checked (${checked})`); console.log(`# arrivals checked ${checked}, would have landed near a guardian ${near}`);
});
