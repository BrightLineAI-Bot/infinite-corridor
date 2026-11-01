// Release 675 (Tim, 2026-11-01): deep annexes are a rare, named dungeon type (so they can be skipped); the Starfield Deep Annex
// is three floors, each harder, the third another country, and its far door lets you out at a random place in the world.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, chasmRoll } from '../src/game.ts';
import { dungeonId } from '../src/world.ts';
import { DEEP_ANNEX, annexRecord, annexFloorId, annexScale, annexExit, annexEligible } from '../src/deep-annex.ts';

const SEED = 'ANNEX';
const findAnnex = () => {
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0);
  for (let rx = 3; rx < 60; rx++) for (let ry = -20; ry < 20; ry++) { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); const o = g.map.objects.find((q) => q.deepAnnex); if (o) return { s, g, o }; }
  return null;
};
const clearFloor = (g) => { for (const e of g.enemies) if (!e.dead && !e.ambient) { e.hp = 0; g.defeatEnemy(e); e.dead = true; } };
let found; const annex = () => (found ||= findAnnex());

test('rare, eligible only for ordinary overworld crossings, and the same for the same seed', () => {
  const ids = []; for (let i = 0; i < 4000; i++) ids.push(dungeonId(SEED, 1, i % 70, Math.floor(i / 70), 'dungeon-gate-' + (i % 3)));
  const n = ids.filter((id) => annexRecord(SEED, id, chasmRoll(SEED, id))).length; assert.ok(n > 40 && n < 240, `${n} of 4000`);
  assert.ok(ids.every((id) => !annexRecord(SEED, id, false)), 'only Starfield crossings');
  assert.ok(!annexEligible(dungeonId(SEED, 1, 0, 0)) && !annexEligible(`${ids[0]}:canopy`) && !annexEligible('dungeon:X:g1:deep-v2:descent'));
  assert.deepEqual(annexRecord(SEED, annexFloorId(ids[0], 3)), { version: 1, floor: 3, base: ids[0] });
});

test('its entrance names it before you go in; inside, the first floor is a Starfield floor with floor dots', () => {
  const { g, o } = annex(); assert.equal(o.name, DEEP_ANNEX.name);
  g.player.x = o.x; g.player.y = o.y; const r = g.interact('enter', o.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'dungeon'); assert.deepEqual(g.map.annexFloor, { floor: 1, of: 3 }); assert.match(g.map.annexName, /Starfield Deep Annex · Floor 1/);
  const h = g.save.consequences.dungeons[g.areaId()]; assert.equal(h.deepAnnex.floor, 1); assert.ok(h.chasm, 'a Starfield floor'); assert.ok(!h.mire && !h.dream);
});

test('clearing a floor opens the stair down; floors two and three are harder, the third another country', () => {
  const { g } = annex(); const base = g.areaId(); clearFloor(g);
  let st = g.map.objects.find((q) => q.kind === 'annexStair'); assert.ok(st, 'the stair opens'); assert.ok(g.map.objects.some((q) => q.completionExit), 'and the way home');
  g.player.x = st.x; g.player.y = st.y; let r = g.interact('descend', st.id); assert.ok(r.ok, r.message);
  assert.equal(g.areaId(), annexFloorId(base, 2)); assert.equal(g.map.annexFloor.floor, 2); assert.ok(g.save.consequences.dungeons[g.areaId()].chasm);
  const foe = g.enemies.find((e) => !e.ambient && e.annexScaled); assert.ok(foe, 'scaled foes'); 
  clearFloor(g); st = g.map.objects.find((q) => q.kind === 'annexStair'); assert.ok(st); g.player.x = st.x; g.player.y = st.y; r = g.interact('descend', st.id); assert.ok(r.ok, r.message);
  const h3 = g.save.consequences.dungeons[g.areaId()]; assert.equal(g.map.annexFloor.floor, 3); assert.ok(!h3.chasm, 'not the stars'); assert.ok(DEEP_ANNEX.third.includes(h3.generationOptions.theme));
  clearFloor(g); assert.ok(!g.map.objects.some((q) => q.kind === 'annexStair'), 'no stair below the last floor');
  const from = { ...g.save.session.dungeonReturn }, out = g.map.objects.find((q) => q.completionExit); assert.ok(out, 'the far door');
  g.player.x = out.x; g.player.y = out.y; r = g.interact('exit', out.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'overworld'); const d = Math.hypot(g.rx - from.rx, g.ry - from.ry); assert.ok(d >= DEEP_ANNEX.exit.near - 1, `${d} sections away`); assert.match(g.message, /somewhere else/);
});

test('the scale grows by floor, and the far door avoids open sea', () => {
  assert.ok(annexScale(3).hp > annexScale(2).hp && annexScale(2).hp > annexScale(1).hp);
  const p = annexExit(SEED, 'b', { rx: 0, ry: 0 }, {}, (x) => x > 0); assert.ok(p.rx <= 0);
});
