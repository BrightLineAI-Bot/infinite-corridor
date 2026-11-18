// Tim's log (Unreleased): the Deep had no Watcher's daises. Its floors are generated at the 'standard' size, and daises were laid
// only on 'extended' crossings. Floors entered from DEEP_FLOOR_GEN 2 on get the pair (underlands.ts warpAny); a floor begun before
// keeps its layout; attunement stays with its floor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { shaftHere, floorPlan } from '../src/the-deep.ts';
import { generateExpeditionDungeon, WARP, THEME_POOL_VERSION } from '../src/underlands.ts';

const SEED = 'DEEP677';
function shaft() {
  for (let rx = 6; rx < 90; rx++) for (let ry = -30; ry < 30; ry++) if (shaftHere(SEED, rx, ry)) {
    const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false);
    const o = g.map.objects.find((q) => q.kind === 'deepShaft'); if (o) { g.player.x = o.x; g.player.y = o.y; assert.ok(g.interact('descend:1', o.id).ok); return { s, g }; }
  }
  throw new Error('no shaft');
}

test('the generator: warpAny lays the pair on a standard crossing, far apart, on open floor; its size, entry and creatures as before', () => {
  let laid = 0;
  for (let f = 1; f <= 12; f++) {
    const plan = floorPlan(SEED, 'the-deep:DEEP677:1:2', f), opts = { layoutPool: 5, themePool: THEME_POOL_VERSION, theme: plan.theme || 'none', sizeProfile: 'standard' };
    const before = generateExpeditionDungeon(SEED, plan.genId, plan.recipe, opts), after = generateExpeditionDungeon(SEED, plan.genId, plan.recipe, { ...opts, warpAny: true });
    assert.ok(!before.objects.some((o) => o.kind === 'warpDais'), 'none without it (old floors unchanged)');
    const d = after.objects.filter((o) => o.kind === 'warpDais'); if (d.length) { laid++; assert.equal(d.length, 2); assert.ok(Math.hypot(d[0].x - d[1].x, d[0].y - d[1].y) >= WARP.minApart); }
    assert.deepEqual([after.width, after.height, after.entry], [before.width, before.height, before.entry]); assert.deepEqual(after.enemySpawns, before.enemySpawns);
    for (const o of d) assert.equal(after.tiles[o.y * after.width + o.x].blocked, false, 'a dais stands on open floor (the theme keeps off it)');
  }
  assert.ok(laid >= 10, `${laid} of 12 floors have daises`);
});

test('in play: each Deep floor has its daises; attunement does not carry to the next floor', () => {
  const { s, g } = shaft(), id = g.areaId();
  const daises = g.map.objects.filter((o) => o.kind === 'warpDais'); assert.equal(daises.length, 2);
  s.worldFlags[`warp-dais:${id}:${daises[0].id}`] = true; s.worldFlags[`warp-dais:${id}:${daises[1].id}`] = true;
  for (const e of g.enemies) if (!e.dead && !e.ambient) { e.hp = 0; g.defeatEnemy(e); e.dead = true; }
  const st = g.map.objects.find((q) => q.kind === 'deepStair'); g.player.x = st.x; g.player.y = st.y; assert.ok(g.interact('descend', st.id).ok);
  assert.equal(g.map.deepFloor, 2); const next = g.map.objects.filter((o) => o.kind === 'warpDais');
  assert.equal(next.length, 2, 'floor 2 has its own'); assert.ok(next.every((o) => o.state === 'dormant'), 'to be found again');
  assert.ok(!Object.keys(s.worldFlags).some((k) => k.startsWith(`warp-dais:${id}:`)));
});
