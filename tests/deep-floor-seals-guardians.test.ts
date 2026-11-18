// Tim's log (Unreleased): in the Deep with Fractured/Frenzied on, one Fracture Warden sealed every deeper floor (the seal was
// keyed on the shaft, not the floor), and every floor had the same guardian species (keyed on the shaft too). Floors entered from
// DEEP_FLOOR_GEN 2 on key both per floor; a seal written before stays with the floor it was set on (dropped on the next floor).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { shaftHere, DEEP_FLOOR_GEN } from '../src/the-deep.ts';
import { fractureKey } from '../src/fractured.ts';
import { guardianKindFor } from '../src/monster-pack.ts';

const SEED = 'DEEP677';
function shaft(mode = null) {
  for (let rx = 6; rx < 90; rx++) for (let ry = -30; ry < 30; ry++) if (shaftHere(SEED, rx, ry)) {
    const s = freshSave(); s.seed = SEED; s.fractured = mode; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false);
    const o = g.map.objects.find((q) => q.kind === 'deepShaft'); if (o) { g.player.x = o.x; g.player.y = o.y; assert.ok(g.interact('descend:1', o.id).ok); return { s, g }; }
  }
  throw new Error('no shaft');
}
const clear = (g) => { for (const e of g.enemies) if (!e.dead && !e.ambient) { e.hp = 0; g.defeatEnemy(e); e.dead = true; } };
const down = (g) => { clear(g); const st = g.map.objects.find((q) => q.kind === 'deepStair'); g.player.x = st.x; g.player.y = st.y; assert.ok(g.interact('descend', st.id).ok); };

test('a floor entered now is generation 2: its own fracture key and its own guardian roll', () => {
  const { s, g } = shaft(), id = g.areaId(), kinds = [];
  for (let f = 1; f <= 5; f++) {
    assert.equal(g.map.deepFloor, f); assert.equal(s.consequences.dungeons[id].deepGen, DEEP_FLOOR_GEN.version);
    assert.equal(g.fractureAreaKey(), `${fractureKey('dungeon', id)}:f${f}`);
    const guardian = g.enemies.find((e) => e.boss && e.dungeonRole === 'gateWarden'); assert.ok(guardian, `floor ${f} guardian`);
    assert.equal(guardian.kind, guardianKindFor(SEED, `${id}:f${f}`)); kinds.push(guardian.kind);
    if (f < 5) down(g);
  }
  assert.ok(new Set(kinds).size > 1, `not one species on every floor: ${kinds}`);
});

test('Fractured: a Warden\'s seal holds its own floor only; the next floor fills its meter and gets its packs again', () => {
  const { s, g } = shaft('fractured'), id = g.areaId();
  assert.ok(g.fracturedHere(), 'floor 1 is fractured'); assert.ok(g.enemies.some((e) => e.fractured), 'density packs');
  s.fractureSeals = { ...s.fractureSeals, [g.fractureAreaKey()]: { kills: 99, sealed: true } };
  assert.equal(g.fracturedHere(), null, 'sealed here'); assert.equal(g.fractureMeter(), null);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.fractureSeals[`${fractureKey('dungeon', id)}:f1`].sealed, true, 'kept across a reload');
  down(g); assert.equal(g.map.deepFloor, 2);
  assert.ok(g.fracturedHere(), 'floor 2 is not sealed'); assert.ok(g.enemies.some((e) => e.fractured), 'floor 2 has its packs');
  assert.equal(s.fractureSeals[`${fractureKey('dungeon', id)}:f1`], undefined, 'the floor left behind takes its seal with it');
  assert.equal(g.fractureMeter().kills, 0);
});

test('a floor begun before (no deepGen) keeps the shaft-wide key and guardian; its old seal applies there, then no deeper', () => {
  const { s, g } = shaft('fractured'), id = g.areaId(), legacy = fractureKey('dungeon', id), h = s.consequences.dungeons[id];
  delete h.deepGen; delete h.guardianKind; s.fractureSeals = { [legacy]: { kills: 54, sealed: true, note: 'kept' } };
  for (const k of Object.keys(s.session.areas)) if (k.startsWith('the-deep:')) delete s.session.areas[k];
  const m = migrateSave(JSON.parse(JSON.stringify(s))), g2 = new Game(m, 0); g2.loadArea('dungeon', false);
  assert.equal(g2.map.deepGen, 1); assert.equal(g2.fractureAreaKey(), legacy, 'old key on the old floor');
  assert.equal(g2.fracturedHere(), null, 'its old seal still holds the floor it is on');
  const guardian = g2.enemies.find((e) => e.boss && e.dungeonRole === 'gateWarden'); assert.equal(guardian.kind, guardianKindFor(SEED, id), 'old guardian roll');
  assert.ok(!g2.map.objects.some((o) => o.kind === 'warpDais'), 'and no daises laid over it');
  down(g2); assert.equal(g2.map.deepFloor, 2); assert.equal(m.consequences.dungeons[id].deepGen, DEEP_FLOOR_GEN.version);
  assert.equal(m.fractureSeals[legacy], undefined, 'the shaft-wide seal is gone with its floor'); assert.ok(g2.fracturedHere(), 'floor 2 is fractured');
});
