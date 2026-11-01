// Release 651 (Tim, 2026-11-01): Fractured mode, a per-journey challenge setting: more creatures in packs with champions and
// rares, more keep coming, towns and cleared places stay safe, and a place left a while fills up again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { FRACTURED, CHAMPION, RARE, fracturedMode, rankXp } from '../src/fractured.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const at = (mode, rx, ry) => { const s = freshSave(); s.seed = 'FRACTURE'; s.fractured = mode; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); return { s, g }; };
const hostile = (g) => g.enemies.filter((e) => !e.dead && !e.ambient && !e.passiveBehavior && !e.retreating && e.kind !== 'npc');
let wild = null; const wildSection = () => { if (wild) return wild; for (let x = 4; x < 40 && !wild; x++) for (let y = 4; y < 40 && !wild; y += 3) { const { g } = at('fractured', x, y); if (g.fracturedHere() && hostile(g).some((e) => !e.fractured) && g.enemies.filter((e) => e.fractured).length >= 4) wild = [x, y]; } return wild; };

test('the setting: off for every journey until chosen, kept per journey, junk dropped', () => {
  assert.equal(freshSave().fractured, null); assert.equal(fracturedMode(freshSave()), null);
  const s = freshSave(); s.fractured = 'frenzied'; assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).fractured, 'frenzied');
  s.fractured = 'chaos'; assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).fractured, null);
});

test('more creatures, in packs with champions and rares, the same each visit; nothing changes with the mode off', () => {
  const [x, y] = wildSection(), off = at(null, x, y).g, on = at('fractured', x, y).g;
  assert.ok(!off.enemies.some((e) => e.fractured), 'off: as it always was');
  const placed = off.map.enemySpawns.filter((q) => !q.ambient && !q.passiveBehavior && !q.retreating && q.kind !== 'npc').length, added = on.enemies.filter((e) => e.fractured).length;
  assert.ok(added >= Math.round(Math.max(placed, 4) * (FRACTURED.modes.fractured.density - 1)) - 1, `${placed} placed, ${added} more`); assert.ok(hostile(on).length > hostile(off).length);
  assert.deepEqual(at('fractured', x, y).g.enemies.map((e) => [e.id, e.kind, e.x, e.y]), on.enemies.map((e) => [e.id, e.kind, e.x, e.y]), 'deterministic');
  let champs = 0, rares = 0; for (let k = 4; k < 40; k++) for (const e of at('frenzied', k, k + 3).g.enemies) { if (e.fracRank === 'champion') champs++; if (e.fracRank === 'rare') { rares++; assert.ok(e.packName && rankXp(e) === RARE.xp); } }
  assert.ok(champs > 0 && rares > 0, `${champs} champions, ${rares} rares`);
});

test('towns, home and the start are safe', () => {
  const { g } = at('frenzied', 0, 0); assert.equal(g.fracturedHere(), null); assert.ok(!g.enemies.some((e) => e.fractured));
});

test('after a doorway\'s grace a pack comes in from out of sight, never past the cap; clearing all in sight buys a lull', () => {
  const [x, y] = wildSection(), { g } = at('frenzied', x, y), M = FRACTURED.modes.frenzied;
  for (const e of g.enemies) if (!e.ambient) e.dead = true; // a cleared place
  g.update(.05, idle, 1000); const before = g.enemies.length; g.update(.05, idle, 1000 + (FRACTURED.grace - 1) * 1000); assert.equal(g.enemies.length, before, 'grace');
  g.update(.05, idle, 1000 + (FRACTURED.grace + M.lull + 1) * 1000);
  const come = g.enemies.filter((e) => e.fracReinforcement && !e.dead); assert.ok(come.length >= M.pack[0], `${come.length} arrived`);
  assert.ok(come.filter((e) => !e.fracShaman).every((e) => Math.hypot(e.x - g.player.x, e.y - g.player.y) >= FRACTURED.spawnDistance[0] - FRACTURED.near - 1 && e.aggro), 'from out of sight, hunting (657: a shaman stands apart from its pack)');
  for (let t = 0; t < 40; t++) g.tickFractured(1e6 + t * 60000); assert.ok(hostile(g).length <= M.cap, `${hostile(g).length} ≤ ${M.cap}`);
});

test('a reinforcement seldom drops and leaves no lasting flag; a champion is tougher and drops more', () => {
  const [x, y] = wildSection(), { s, g } = at('fractured', x, y);
  const dropFlags = () => Object.keys(s.worldFlags).filter((k) => k.startsWith('drop:v1')).length, flags = dropFlags(), c0 = s.dropCounter;
  for (let i = 0; i < 20; i++) { const e = g.createEnemyFromSpawn({ id: `frac-r-t${i}`, kind: 'ashling', x: 5, y: 5, fractured: true, fracReinforcement: true }); g.enemies.push(e); g.defeatEnemy(e); }
  assert.equal(dropFlags(), flags, 'no drop flags');
  assert.ok(!Object.keys(s.worldFlags).some((k) => k.includes('frac-r-t')), 'no flag per reinforcement'); assert.ok(s.dropCounter - c0 < 20, `${s.dropCounter - c0} items from 20`);
  const plain = g.createEnemyFromSpawn({ id: 'p', kind: 'ashling', x: 5, y: 5 }), champ = g.createEnemyFromSpawn({ id: 'c', kind: 'ashling', x: 5, y: 5, fractured: true, fracRank: 'champion', traits: ['keen'] });
  assert.ok(champ.maxHp >= plain.maxHp * CHAMPION.hp * .99); const d0 = s.dropCounter; g.enemies.push(champ); g.defeatEnemy(champ); assert.equal(s.dropCounter - d0, 1 + CHAMPION.drops);
});

test('a place left a while fills up again; one left a moment ago does not', () => {
  const [x, y] = wildSection(), { s, g } = at('fractured', x, y);
  for (const e of g.enemies) if (e.fractured) { e.dead = true; e.hp = 0; }
  g.loadArea('overworld'); assert.ok(g.enemies.filter((e) => e.fractured).every((e) => e.dead), 'back at once: still cleared');
  g.snapshotArea(); g.rx += 1; g.loadArea('overworld', false); s.playSeconds += FRACTURED.repopulate + 1; g.snapshotArea(); g.rx -= 1; g.loadArea('overworld', false); // away and back
  assert.ok(g.enemies.filter((e) => e.fractured).every((e) => !e.dead), 'back later: full again');
});
