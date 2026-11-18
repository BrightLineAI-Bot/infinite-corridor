// The Deep's lairs (DEEP_FLOOR_GEN 3; Tim's log at about floor 50: "if you're in the depths, it should spawn all of these types of
// dungeons, maybe not the Threefold dungeons, but those other different special creature dungeons"): a share of floors, larger the
// deeper you go, are the lair of a special creature (the-deep.ts DEEP_SPECIALS). Floors at generation 1 and 2 never are, and a floor
// at generation 3 that is not a lair is the generation 2 floor exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon, pinDungeonLayout } from '../src/game.ts';
import { shaftHere, deepIdFor, deepShaft, DEEP_FLOOR_GEN, DEEP_SPECIALS, floorSpecial, specialChance, lairScale, floorPlan, floorScale } from '../src/the-deep.ts';
import { generateExpeditionDungeon, THEME_POOL_VERSION } from '../src/underlands.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { LETHAL_KINDS, canStep } from '../src/landscape.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { WORLD_BEASTS } from '../src/world-beasts.ts';

const SEED = 'DEEP677';
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function shaft(seed = SEED) {
  for (let rx = 6; rx < 90; rx++) for (let ry = -30; ry < 30; ry++) if (shaftHere(seed, rx, ry)) {
    const s = freshSave(); s.seed = seed; s.level = 30; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false);
    const o = g.map.objects.find((q) => q.kind === 'deepShaft'); if (o) { g.player.x = o.x; g.player.y = o.y; assert.ok(g.interact('descend:1', o.id).ok); return { s, g, id: g.areaId() }; }
  }
  throw new Error('no shaft');
}
// Down to floor `f` the way the Deep Stair takes you (descendDeep from the floor above).
const goTo = (g, f) => { g.map.deepFloor = f - 1; assert.ok(g.descendDeep({}).ok); assert.equal(g.map.deepFloor, f); };
const floorOf = (id, row, from = 1) => { for (let f = from; f < 2000; f++) if (floorSpecial(SEED, id, f)?.id === row) return f; return null; };

test('the roll: fixed per seed, shaft and floor; none before generation 3; never the Threefold; rarer near the top', () => {
  const ids = Array.from({ length: 12 }, (_, i) => deepIdFor('S' + i, 40 + i, -3));
  for (const id of ids) for (let f = 1; f <= 60; f++) {
    assert.equal(floorSpecial('S', id, f, 1), null); assert.equal(floorSpecial('S', id, f, 2), null);
    assert.deepEqual(floorSpecial('S', id, f, 3), floorSpecial('S', id, f, 3));
  }
  for (const r of DEEP_SPECIALS.rows) { assert.ok(!/threefold|horde|deep-v/i.test(`${r.id}${r.theme}`), r.id); assert.ok(MONSTER_PACK[r.beast] && WORLD_BEASTS[r.beast], r.beast); }
  assert.ok(specialChance(1) < specialChance(10) && specialChance(10) < specialChance(25) && specialChance(25) < specialChance(50) && specialChance(50) < specialChance(100));
  assert.equal(specialChance(500), DEEP_SPECIALS.chance.at(-1)[1]);
  const share = (lo, hi) => { let n = 0, all = 0; for (let k = 0; k < 400; k++) for (let f = lo; f <= hi; f++) { all++; if (floorSpecial('Q' + k, `the-deep:Q${k}:9:9`, f)) n++; } return n / all; };
  const top = share(1, 5), deep = share(45, 55);
  assert.ok(Math.abs(top - specialChance(3)) < .03, `top ${top}`); assert.ok(Math.abs(deep - specialChance(50)) < .03, `deep ${deep}`); assert.ok(deep > top * 2.5);
  const seen = new Map(); for (let k = 0; k < 400; k++) for (let f = 40; f <= 60; f++) { const r = floorSpecial('Q' + k, `the-deep:Q${k}:9:9`, f); if (r) seen.set(r.id, (seen.get(r.id) || 0) + 1); }
  const total = [...seen.values()].reduce((a, b) => a + b, 0), weight = DEEP_SPECIALS.rows.reduce((a, r) => a + r.weight, 0);
  for (const r of DEEP_SPECIALS.rows) assert.ok(Math.abs(seen.get(r.id) / total - r.weight / weight) < .04, `${r.id} ${seen.get(r.id)}`);
  assert.ok(lairScale(1).hp < lairScale(50).hp && lairScale(500).hp === DEEP_SPECIALS.lair.hp.max && lairScale(500).damage === DEEP_SPECIALS.lair.damage.max);
});

test('generation 1 and 2 floors and generation 3 floors that are not lairs regenerate byte for byte', () => {
  const { s, id } = shaft(), old = (floor, gen) => { const plan = floorPlan(s.seed, id, floor); return generateExpeditionDungeon(s.seed, plan.genId, plan.recipe, { layoutPool: 5, themePool: THEME_POOL_VERSION, theme: plan.theme || 'none', sizeProfile: 'standard', ...(gen >= 2 ? { warpAny: true } : {}) }); };
  let lairs = 0, plain = 0; const pinned = (floor, gen) => { deepShaft(s, id).floor = floor; delete s.consequences.dungeons[id]; pinDungeonLayout(s, id); dungeonHistory(s, id).deepGen = gen; return generatePinnedDungeon(s, id); };
  const later = new Set(['emberDoor', 'watcherTomb']); // laid over the generator's floor by the Deep and the Watcher passes, as before
  for (let floor = 1; floor <= 70; floor++) for (const gen of [1, 2, 3]) {
    const map = pinned(floor, gen), lair = floorSpecial(s.seed, id, floor, gen);
    if (gen < 3) assert.equal(lair, null);
    if (lair) { lairs++; assert.equal(map.deepLair.id, lair.id); continue; }
    assert.equal(map.deepLair, undefined);
    if (gen === 3) { plain++; const { deepGen: a, ...three } = map, { deepGen: b, ...two } = pinned(floor, 2); assert.equal(a, 3); assert.equal(b, 2); assert.equal(JSON.stringify(three), JSON.stringify(two), `floor ${floor}: generation 3 without a lair is generation 2`); continue; }
    const want = old(floor, gen);
    assert.equal(JSON.stringify(map.tiles), JSON.stringify(want.tiles), `floor ${floor} gen ${gen} tiles`);
    assert.equal(JSON.stringify(map.enemySpawns), JSON.stringify(want.enemySpawns), `floor ${floor} gen ${gen} spawns`);
    assert.equal(JSON.stringify(map.objects.filter((o) => !later.has(o.kind))), JSON.stringify(want.objects.filter((o) => !(floor > 1 && o.kind === 'exit'))), `floor ${floor} gen ${gen} objects`);
  }
  assert.ok(lairs > 5 && plain > 20, `${lairs} lairs, ${plain} plain`);
});

// The Wayfarer's ground: what base movement reaches from the entry (no swimming, no robot).
function reach(map) {
  const W = map.width, H = map.height || map.tiles.length / W, seen = new Set([map.entry.y * W + map.entry.x]), q = [map.entry], body = { isPlayer: true, jumping: true };
  for (let i = 0; i < q.length; i++) { const p = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = y * W + x, t = map.tiles[k]; if (x < 0 || y < 0 || x >= W || y >= H || seen.has(k) || !t || t.blocked || LETHAL_KINDS.has(t.kind) || !canStep(body, map, W, p.x, p.y, x, y)) continue; seen.add(k); q.push({ x, y }); } }
  return seen;
}
test('every lair is solvable: its beast stands where base movement reaches, on its own ground, across seeds and depths', () => {
  const s = freshSave(); let n = 0; const kinds = new Set();
  for (let k = 0; k < 60; k++) {
    s.seed = `LAIR${k}`; const id = deepIdFor(s.seed, 30 + k, 7);
    for (let floor = 1; floor <= 120; floor++) {
      const row = floorSpecial(s.seed, id, floor); if (!row) continue;
      deepShaft(s, id).floor = floor; delete s.consequences.dungeons[id]; pinDungeonLayout(s, id); dungeonHistory(s, id).deepGen = DEEP_FLOOR_GEN.version;
      const map = generatePinnedDungeon(s, id), at = reach(map), W = map.width, b = map.enemySpawns.filter((e) => e.deepLair);
      assert.equal(b.length, 1, `${s.seed} ${floor}`); const e = b[0]; n++; kinds.add(row.id);
      assert.equal(e.dungeonRole, 'gateWarden'); assert.ok(e.boss); assert.equal(e.kind, row.beast); assert.equal(e.deepLair, row.id);
      assert.ok(at.has(Math.round(e.y) * W + Math.round(e.x)) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at.has((Math.round(e.y) + dy) * W + Math.round(e.x) + dx)), `${s.seed} floor ${floor}: ${row.id} out of reach`);
      const exit = map.objects.find((o) => o.kind === 'emberDoor'); assert.ok(exit && at.has(exit.y * W + exit.x), 'the Ember Door is reachable');
      if (row.id === 'psychicCrystal') assert.ok(map.tiles.some((t) => t.kind === 'dungeonWater'), 'the Crystal has its water');
      if (row.id === 'tremorWorm') assert.ok(map.tiles.some((t) => t.kind === 'lava'), 'the Worm has its lava');
      if (row.id === 'poisonCrypt') { assert.ok(map.mireLair && map.seepPools?.length, 'the Crypt has its lair and pools'); assert.equal(dungeonHistory(s, id).mire.found, false); }
      assert.equal(map.theme, row.theme);
    }
  }
  assert.equal(kinds.size, DEEP_SPECIALS.rows.length); assert.ok(n > 600, `${n} lairs checked`);
});

test('each lair on a real descent: its beast is the guardian, tuned by the lair table, and felling it opens the Deep Stair', () => {
  const { s, g, id } = shaft();
  for (const row of DEEP_SPECIALS.rows) {
    const floor = floorOf(id, row.id, 2); assert.ok(floor, row.id); goTo(g, floor);
    assert.equal(g.map.deepLair.id, row.id); assert.match(g.defeatNotice.detail, /lair/); assert.equal(g.message, row.lore);
    const e = g.enemies.find((q) => q.deepLair && !q.dead); assert.ok(e, `${row.id} on floor ${floor}`);
    assert.equal(e.kind, row.beast); assert.equal(e.dungeonRole, 'gateWarden'); assert.ok(e.boss); assert.ok(!e.worldBeast, 'kin, not the hunt');
    assert.ok(!e.kitRole && !(e.affixes || []).length, 'no boss kit or affix'); assert.equal(e.packName, row.name);
    if (row.heart) assert.ok(e.mireHeart && g.mireHere(), 'the Crypt is live');
    // the lair factor in place of the floor's: a lair beast on a deep floor is not floorScale(f) times a beast
    const k = lairScale(floor); assert.ok(k.hp < floorScale(floor).hp || floor < 4);
    assert.ok(e.maxHp > 100 && e.damage >= 1, `${row.id} ${e.maxHp}/${e.damage}`);
    for (let t = 0; t < 40; t++) g.update(.05, idle, 1000 + t * 50); // its brain runs on the floor
    assert.ok(!g.save.voidScars?.areas || !Object.keys(g.save.voidScars.areas).some((k) => k.includes('the-deep:')), 'the floor is never scarred');
    for (const q of g.enemies) if (!q.dead && !q.ambient) { q.hp = 0; g.defeatEnemy(q); q.dead = true; }
    assert.ok(g.map.objects.some((o) => o.kind === 'deepStair'), `${row.id}: the stair opens`);
    assert.ok(deepShaft(s, id).best >= floor);
  }
});

test('a lair floor survives a reload as it was, and the next floor leaves its Crypt state behind', () => {
  const { s, g, id } = shaft(), floor = floorOf(id, 'poisonCrypt', 2); goTo(g, floor);
  g.mireHere().state.merged = 2; const hp = g.enemies.find((q) => q.mireHeart).maxHp;
  g.snapshotArea(false); const m = migrateSave(JSON.parse(JSON.stringify(s))), g2 = new Game(m, 0); g2.loadArea('dungeon', false);
  assert.equal(g2.map.deepLair.id, 'poisonCrypt'); assert.equal(m.consequences.dungeons[id].mire.merged, 2);
  assert.equal(g2.enemies.find((q) => q.mireHeart).maxHp, hp);
  for (const q of g2.enemies) if (!q.dead && !q.ambient) { q.hp = 0; g2.defeatEnemy(q); q.dead = true; }
  const st = g2.map.objects.find((o) => o.kind === 'deepStair'); g2.player.x = st.x; g2.player.y = st.y; assert.ok(g2.interact('descend', st.id).ok);
  const next = floorSpecial(SEED, id, floor + 1); if (next?.id !== 'poisonCrypt') assert.ok(!g2.mireHere(), 'the Crypt went with its floor');
});
