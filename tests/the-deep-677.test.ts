// Release 677 (Tim, 2026-11-01): the Deep, an endless descent from Deep Shafts: harder each floor, checkpoints every five,
// a Return Ember (never a Crossing Sigil) for each floor's guardian, loot that improves only near your deepest floor, and the
// record of your deepest floor on the Wayfarer's page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { journeyStats } from '../src/persistence.ts';
import { THE_DEEP, shaftHere, startFloors, floorScale, lootBonus, guardianAffixes, deepIdFor } from '../src/the-deep.ts';

const SEED = 'DEEP677';
const findShaft = () => { for (let rx = 6; rx < 90; rx++) for (let ry = -30; ry < 30; ry++) if (shaftHere(SEED, rx, ry)) { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); const o = g.map.objects.find((q) => q.kind === 'deepShaft'); if (o) return { s, g, o }; } return null; };
const clearFloor = (g) => { for (const e of g.enemies) if (!e.dead && !e.ambient) { e.hp = 0; g.defeatEnemy(e); e.dead = true; } };
let found; const shaft = () => (found ||= findShaft());

test('rare shafts, only past the heartland; a shaft offers floor 1 and each checkpoint reached', () => {
  let n = 0; for (let x = -60; x < 60; x++) for (let y = -60; y < 60; y++) if (shaftHere(SEED, x, y)) { n++; assert.ok(Math.abs(x) + Math.abs(y) >= THE_DEEP.minRing); }
  assert.ok(n > 40 && n < 400, `${n} shafts in 14400 sections`);
  assert.deepEqual(startFloors({ best: 0 }), [1]); assert.deepEqual(startFloors({ best: 12 }), [1, 5, 10]);
  const { o } = shaft(); assert.ok(o, 'a shaft stands in its section'); assert.deepEqual(o.actions, ['descend:1']);
});

test('down the shaft: a floor, an ember for its guardian, the stair down, harder below, no free way up', () => {
  const { s, g, o } = shaft(); g.player.x = o.x; g.player.y = o.y; let r = g.interact('descend:1', o.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'dungeon'); assert.equal(g.map.deepFloor, 1); assert.ok(g.map.objects.some((q) => q.kind === 'exit'), 'floor 1 keeps its way out');
  assert.ok(g.map.objects.some((q) => q.kind === 'emberDoor'));
  const hp1 = Math.max(...g.enemies.filter((e) => !e.ambient).map((e) => e.maxHp));
  clearFloor(g); assert.equal(s.theDeep.embers, 1); assert.equal(s.theDeep.record, 1);
  const st = g.map.objects.find((q) => q.kind === 'deepStair'); assert.ok(st, 'the Deep Stair');
  g.player.x = st.x; g.player.y = st.y; r = g.interact('descend', st.id); assert.ok(r.ok, r.message);
  assert.equal(g.map.deepFloor, 2); assert.ok(!g.map.objects.some((q) => q.kind === 'exit'), 'no free way up below floor 1');
  assert.ok(g.enemies.filter((e) => !e.ambient).every((e) => e.deepScaled), 'scaled'); assert.ok(floorScale(2).hp > 1 && hp1 > 0);
  assert.ok(Object.keys(s.session.areas).filter((k) => k.startsWith('the-deep:')).length <= 1, 'only the floor you are on is kept');
  const door = g.map.objects.find((q) => q.kind === 'emberDoor'); g.player.x = door.x; g.player.y = door.y; r = g.interact('burn', door.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'overworld'); assert.equal(s.theDeep.embers, 0);
});

test('without an ember the door stays cold; a checkpoint reached is offered; the record shows on the Wayfarer page', () => {
  const { s, g, o } = shaft(); const id = deepIdFor(SEED, g.rx, g.ry); s.theDeep.shafts[id.replace(/^the-deep:[^:]*:/, '')].best = 6; s.theDeep.record = Math.max(s.theDeep.record, 6);
  g.loadArea('overworld', false); const o2 = g.map.objects.find((q) => q.kind === 'deepShaft'); assert.deepEqual(o2.actions, ['descend:1', 'descend:5']);
  g.player.x = o2.x; g.player.y = o2.y; assert.ok(g.interact('descend:5', o2.id).ok); assert.equal(g.map.deepFloor, 5);
  s.theDeep.embers = 0; const door = g.map.objects.find((q) => q.kind === 'emberDoor'); g.player.x = door.x; g.player.y = door.y; const r = g.interact('burn', door.id); assert.ok(!r.ok); assert.equal(g.area, 'dungeon');
  assert.ok(journeyStats(s).some(([k, v]) => /Deep/.test(k) && v === 6));
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.theDeep.record, 6); assert.equal(freshSave().theDeep.record, 0);
});

test('loot improves only near your deepest floor, capped; guardians carry two affixes from floor 20', () => {
  assert.equal(lootBonus(10, 10), 2); assert.equal(lootBonus(10, 30), 0, 'shallow repeats give ordinary loot'); assert.equal(lootBonus(200, 200), THE_DEEP.loot.max);
  assert.equal(guardianAffixes(19), 1); assert.equal(guardianAffixes(20), 2);
});
