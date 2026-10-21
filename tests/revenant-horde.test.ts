// Release 269 (Tim, 2026-10-21): the Gate Revenant horde.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { HORDE, rollHorde, hordeKill } from '../src/revenant-horde.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { ensureFarArray } from '../src/far-array.ts';

test('about one new dungeon in two hundred is a horde, of 28 to 44, decided on the first visit only; deep dungeons never', () => {
  const s = freshSave(); let n = 0;
  for (let i = 0; i < 20000; i++) { const h = { visits: 0 }; const q = rollHorde(s, `dungeon:${s.seed}:g1:${i}:7:door`, h); if (q) { n++; assert.ok(q.total >= HORDE.total[0] && q.total <= HORDE.total[1] && q.left === q.total); } }
  assert.ok(n > 60 && n < 150, `about 0.5% (${n}/20000)`);
  assert.equal(rollHorde(s, 'dungeon:x:g1:1:1:door', { visits: 2 }), null, 'a dungeon already entered never becomes one');
  assert.equal(rollHorde(s, 'dungeon:x:g1:1:1:deep-v1', { visits: 0 }), null);
  const h = { visits: 0, horde: { total: 30, left: 12 } }; assert.equal(rollHorde(s, 'dungeon:y', h).left, 12, 'kept once decided');
});

test('the last kill breaks the horde and locks a Far Gate piece', () => {
  const s = freshSave(), h = { horde: { total: 2, left: 2 } }, before = ensureFarArray(s).pieces;
  assert.match(hordeKill(s, h).message, /1 Gate Revenant remain/); const last = hordeKill(s, h);
  assert.equal(last.cleared, true); assert.equal(s.farArray.pieces, before + 1); assert.equal(h.resolved, true); assert.equal(hordeKill(s, h), null);
});

function hordeDungeon() {
  for (let rx = -8; rx < 8; rx++) for (let ry = -8; ry < 8; ry++) {
    const s = freshSave(); s.seed = 'HORDE'; s.level = 12; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
    const d = g.map.objects.find((o) => o.kind === 'dungeon'); if (!d) continue;
    const id = `dungeon:${s.seed}:g${s.worldGeneration}:${rx}:${ry}:${d.id}`; const h = dungeonHistory(s, id); h.horde = { total: 30, left: 30 };
    Object.assign(g.player, { x: d.x, y: d.y + 1 }); g.interact(d.actions?.[0], d.id);
    if (g.area !== 'dungeon' || g.map.multiLevel) continue;
    return { s, g, id: s.session.activeDungeonId };
  }
  throw new Error('no dungeon');
}
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };

test('in a horde dungeon only Revenants stand, three at a time, and they keep coming as they fall; the count persists', () => {
  const { s, g, id } = hordeDungeon(), horde = s.consequences.dungeons[id].horde;
  assert.ok(g.enemies.length === HORDE.active && g.enemies.every((e) => e.kind === 'gateRevenant' && e.hordeOf === id), `only ${HORDE.active} Revenants (${g.enemies.map((e) => e.kind)})`);
  g.player.hp = 1e9; const one = g.enemies[0]; one.hp = 0; one.dead = true; g.defeatEnemy(one);
  assert.equal(horde.left, 29); assert.equal(s.consumables.crossingSigil || 0, 0, 'no sigil per horde kill');
  let t = 1000; for (let k = 0; k < (HORDE.respawn + 1) * 20; k++) { g.update(.05, idle, t += 50); g.player.hp = 1e9; }
  assert.equal(g.enemies.filter((e) => e.hordeOf === id && !e.dead).length, HORDE.active, 'another came');
  g.snapshotArea(); g.loadArea('dungeon', false);
  assert.equal(horde.left, 29, 'kept in the save'); assert.equal(g.enemies.length, HORDE.active);
});

test('aggroed Revenants follow the Wayfarer out; a kill outside still counts; dying sends the rest home without counting', () => {
  const { s, g, id } = hordeDungeon(), horde = s.consequences.dungeons[id].horde;
  for (const e of g.enemies) e.aggro = true;
  g.leaveDungeon();
  const out = g.enemies.filter((e) => e.hordeOf === id && !e.dead); assert.equal(out.length, HORDE.active, 'all three follow');
  out[0].hp = 0; out[0].dead = true; g.defeatEnemy(out[0]); assert.equal(horde.left, 29, 'a kill outside counts');
  g.player.hp = 0; g.update(.05, idle, 5000); assert.equal(horde.left, 29, 'dying does not count the others');
});
