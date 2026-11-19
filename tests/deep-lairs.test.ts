// The Deep's lairs (DEEP_FLOOR_GEN 3; Tim's log at about floor 50: "if you're in the depths, it should spawn all of these types of
// dungeons, maybe not the Threefold dungeons, but those other different special creature dungeons"): a share of floors, larger the
// deeper you go, are the lair of a special creature (the-deep.ts DEEP_SPECIALS). Floors at generation 1 and 2 never are, and a floor
// at generation 3 that is not a lair is the generation 2 floor exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, generatePinnedDungeon, pinDungeonLayout, footprintOpen } from '../src/game.ts';
import { hashSeed } from '../src/random.ts';
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

// ------------------------------------------------------------------------------------------------ DEEP_FLOOR_GEN 4 (Tim, 2026-11-19)
// Four more lairs, the world beasts' kin with their own moves: the Mountain Turtle, the Briar Stag, the Ashen Moth and the Astral Worm.
// Never the Lightning Giant, the Nanobot Knight, the Crimson Tyrant or the Doom Chaser (Tim). A floor rolled at generation 3 keeps
// its lair (or none) exactly; a generation 4 floor is either the generation 3 answer or one of the new lairs.
const NEW_LAIRS = ['mountainTurtle', 'briarStag', 'ashenMoth', 'astralWorm'];
const NEVER = ['lightningGiant', 'nanobotKnight', 'crimsonTyrant', 'doomChaser'];
// The generation 3 roll as it shipped, frozen here: six rows, weights 3 3 3 2 2 2.
const GEN3_ROWS = [['poisonCrypt', 3], ['psychicCrystal', 3], ['tremorWorm', 3], ['voidWalker', 2], ['wildStego', 2], ['spinoRex', 2]];
function gen3Roll(seed, id, floor) {
  if ((hashSeed(`${seed}:deep-special:v1:${id}:${floor}`) % 10000) / 10000 >= specialChance(floor)) return null;
  let k = hashSeed(`${seed}:deep-special-row:v1:${id}:${floor}`) % 15;
  for (const [r, w] of GEN3_ROWS) { if (k < w) return r; k -= w; }
  return null;
}

test('generation 4 roll: generation 3 floors keep their lairs; a generation 4 floor is the generation 3 answer or a new lair, at the new weights', () => {
  assert.equal(DEEP_FLOOR_GEN.version, 4);
  assert.deepEqual(DEEP_SPECIALS.rows.filter((r) => r.gen === 4).map((r) => r.id), NEW_LAIRS);
  for (const r of DEEP_SPECIALS.rows) assert.ok(!NEVER.includes(r.beast) && !NEVER.includes(r.id), `${r.id}: Tim does not want this lair`);
  const counts = new Map(); let n = 0, same = 0, moved = 0;
  for (let k = 0; k < 300; k++) {
    const seed = 'G' + k, id = deepIdFor(seed, 20 + k, -k);
    for (let f = 1; f <= 80; f++) {
      const three = floorSpecial(seed, id, f, 3), four = floorSpecial(seed, id, f, 4);
      assert.equal(three?.id ?? null, gen3Roll(seed, id, f), `${seed} floor ${f}: generation 3 as it shipped`);
      if (three) assert.ok(!three.gen, 'generation 3 never rolls a generation 4 row');
      assert.equal(!!three, !!four, 'the same floors are lairs');
      if (!four) continue;
      n++; counts.set(four.id, (counts.get(four.id) || 0) + 1); assert.ok(!NEVER.includes(four.beast));
      if (four.id === three.id) same++; else { moved++; assert.ok(NEW_LAIRS.includes(four.id), `${four.id} replaced ${three.id}`); }
    }
  }
  const total = DEEP_SPECIALS.rows.reduce((a, r) => a + r.weight, 0), fresh = NEW_LAIRS.reduce((a, id) => a + DEEP_SPECIALS.rows.find((r) => r.id === id).weight, 0);
  assert.ok(Math.abs(moved / n - fresh / total) < .03, `new lairs ${moved}/${n}`); assert.ok(same > moved);
  for (const r of DEEP_SPECIALS.rows) assert.ok(Math.abs((counts.get(r.id) || 0) / n - r.weight / total) < .025, `${r.id} ${counts.get(r.id)} of ${n}`);
  for (const id of NEW_LAIRS) { const r = DEEP_SPECIALS.rows.find((q) => q.id === id); assert.ok(MONSTER_PACK[r.beast] && WORLD_BEASTS[r.beast]); assert.ok(r.noEcho); assert.ok(r.lore && r.name && r.theme); }
});

test('a generation 4 floor that is not one of the new lairs is the generation 3 floor byte for byte', () => {
  const { s, id } = shaft(); let plain = 0, fresh = 0;
  const pinned = (floor, gen) => { deepShaft(s, id).floor = floor; delete s.consequences.dungeons[id]; pinDungeonLayout(s, id); dungeonHistory(s, id).deepGen = gen; return generatePinnedDungeon(s, id); };
  for (let floor = 1; floor <= 90; floor++) {
    const lair = floorSpecial(s.seed, id, floor, 4), map = pinned(floor, 4);
    if (lair?.gen === 4) { fresh++; assert.equal(map.deepLair.id, lair.id); assert.equal(map.theme, lair.theme); continue; }
    plain++; const { deepGen: a, ...four } = map, { deepGen: b, ...three } = pinned(floor, 3); assert.equal(a, 4); assert.equal(b, 3);
    assert.equal(JSON.stringify(four), JSON.stringify(three), `floor ${floor}: generation 4 without a new lair is generation 3`);
  }
  assert.ok(plain > 40 && fresh > 2, `${plain} plain, ${fresh} new lairs`);
});

// Stand the Wayfarer (who cannot die here) by the beast and let it fight for `frames` frames, circling.
function brawl(g, e, frames, t0 = 1000) {
  const W = g.map.width, p = g.player; p.maxHp = 1e9;
  for (const [dx, dy] of [[3, 0], [0, 3], [-3, 0], [0, -3], [0, 0]]) { const x = Math.round(e.x) + dx, y = Math.round(e.y) + dy, t = g.map.tiles[y * W + x]; if (t && !t.blocked && !LETHAL_KINDS.has(t.kind)) { p.x = x; p.y = y; break; } }
  const attacks = new Set();
  for (let t = 0; t < frames; t++) {
    const d = Math.floor(t / 8) % 4, input = { state: { x: [1, 0, -1, 0][d], y: [0, 1, 0, -1][d] }, consume: () => false, held: () => false };
    p.hp = 1e9; g.update(.05, t % 32 < 24 ? input : idle, t0 + t * 50); if (e.pack?.attack) attacks.add(e.pack.attack);
  }
  return attacks;
}
test('each new lair fights on a Deep floor: its moves run without leaving a mark on the stone, it stays on open ground, and its fall opens the stair and pays no Echo', () => {
  for (const seed of [SEED, 'LAIRS4']) {
    const { s, g, id } = shaft(seed);
    for (const want of NEW_LAIRS) {
      let floor = 2; while (floorSpecial(seed, id, floor)?.id !== want) floor++;
      goTo(g, floor); const row = DEEP_SPECIALS.rows.find((r) => r.id === want);
      assert.equal(g.map.deepLair.id, want); assert.equal(g.message, row.lore); assert.equal(g.map.theme, row.theme);
      const e = g.enemies.find((q) => q.deepLair && !q.dead); assert.ok(e, `${seed} ${want} on floor ${floor}`);
      assert.equal(e.kind, row.beast); assert.equal(e.dungeonRole, 'gateWarden'); assert.ok(e.boss && !e.worldBeast && !e.kitRole && !(e.affixes || []).length);
      assert.ok(e.maxHp > 100 && e.damage >= 1, `${want} ${e.maxHp}/${e.damage}`);
      const tiles = JSON.stringify(g.map.tiles), beasts = JSON.stringify(s.worldBeasts || {});
      const attacks = brawl(g, e, 300);
      assert.ok(attacks.size >= 2, `${seed} ${want}: it fought (${[...attacks]})`);
      assert.equal(JSON.stringify(g.map.tiles), tiles, `${seed} ${want}: no move changed the floor`);
      assert.ok(!g.save.voidScars?.areas || !Object.keys(g.save.voidScars.areas).some((q) => q.includes('the-deep:')));
      assert.equal(g.seaIce ?? null, null, 'no sea ice in the Deep');
      const W = g.map.width; if (!e.aloft && !e.untargetable && row.contain) { g.update(.05, idle, 1000 + 301 * 50); assert.ok(e.aloft || e.untargetable || footprintOpen(g.map, W, e.x, e.y, true), `${seed} ${want} stands on open ground`); }
      assert.ok(!g.enemies.some((q) => q.worldBeast), 'no world beast joins it');
      const echoes = JSON.stringify(s.echoes.owned);
      for (const q of g.enemies) if (!q.dead && !q.ambient) { q.hp = 0; g.defeatEnemy(q); q.dead = true; }
      assert.ok(g.map.objects.some((o) => o.kind === 'deepStair'), `${want}: the stair opens`); assert.ok(deepShaft(s, id).best >= floor);
      assert.equal(JSON.stringify(s.echoes.owned), echoes, `${want}: no Echo`);
      assert.equal(JSON.stringify(s.worldBeasts || {}), beasts, `${want}: no hunt began, ended or paid`);
      assert.ok(!(s.turtleShells?.shells || []).length, 'no shell is left in the Deep');
    }
  }
});

test('a new lair resumes exactly after a save and load, mid-fight, and still opens the stair', () => {
  const { s, g, id } = shaft();
  for (const want of NEW_LAIRS) {
    let floor = 2; while (floorSpecial(SEED, id, floor)?.id !== want) floor++;
    goTo(g, floor); const e = g.enemies.find((q) => q.deepLair && !q.dead); brawl(g, e, 60); e.hp = Math.round(e.maxHp * .6);
    g.snapshotArea(false); const m = migrateSave(JSON.parse(JSON.stringify(s))), g2 = new Game(m, 0); g2.loadArea('dungeon', false);
    assert.equal(g2.map.deepLair.id, want); assert.equal(g2.map.deepGen, 4);
    const b = g2.enemies.find((q) => q.deepLair && !q.dead); assert.ok(b, want);
    for (const key of ['id', 'kind', 'hp', 'maxHp', 'damage', 'deepLair', 'boss', 'x', 'y']) assert.equal(b[key], e[key], `${want} ${key}`);
    if (want === 'astralWorm') assert.equal(JSON.stringify(b.astral), JSON.stringify(e.astral), 'the Worm\'s own state resumes as it was');
    brawl(g2, b, 40);
    for (const q of g2.enemies) if (!q.dead && !q.ambient) { q.hp = 0; g2.defeatEnemy(q); q.dead = true; }
    assert.ok(g2.map.objects.some((o) => o.kind === 'deepStair'), `${want}: the stair opens after the reload`);
  }
});
