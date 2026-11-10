import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BUILDINGS, INTERIOR_TERRAIN, generateBuildingFloor } from '../src/great-buildings.ts';
import { compoundTopology, generateCompoundFloor } from '../src/compounds.ts';
import { castleTopology, generateCastleFloor } from '../src/castles.ts';
import { labyrinthPlan, generateLabyrinthChamber } from '../src/labyrinths.ts';
import { pentagonPlan, generatePentagonChamber } from '../src/pentagon.ts';
import { canStep } from '../src/landscape.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

// Interior terrain v2 (great-buildings.ts INTERIOR_TERRAIN): the optional jump platform never makes a one-way pocket, never
// seals ground off, and never stands on a creature's spawn. Version 1 stays exactly as every floor generated before.

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Forward and backward reach from the entry under the real step rules, jumping (a gap of holes may be jumped across either
// way, as the audit's checker counts it; the generator itself is stricter and never counts a hole on the way back).
function reach(map) {
  const W = map.width, H = map.height, T = map.tiles, start = Math.round(map.entry.y) * W + Math.round(map.entry.x);
  const step = (a, b) => canStep({ isPlayer: true, jumping: true, airElev: T[a].interiorPlatform ? T[a].elev : undefined }, map, W, a % W, ((a / W) | 0) - .25, b % W, ((b / W) | 0) - .25);
  const flood = (backward) => {
    const seen = new Uint8Array(W * H), q = [start]; seen[start] = 1;
    for (let i = 0; i < q.length; i++) {
      const k = q[i], x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy, n = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[n] || !T[n] || T[n].blocked) continue;
        if (!T[k].hole && !T[n].hole && !(backward ? step(n, k) : step(k, n))) continue;
        seen[n] = 1; q.push(n);
      }
    }
    return seen;
  };
  return { forward: flood(false), back: flood(true), W };
}

function problems(map) {
  const out = [], { forward, back, W } = reach(map), T = map.tiles;
  let pocket = 0; for (let k = 0; k < T.length; k++) if (forward[k] && !back[k] && !T[k].hole) pocket++;
  if (pocket) out.push(`${map.id}: ${pocket} tiles reachable with no way back`);
  for (const s of map.enemySpawns || []) {
    const k = Math.round(s.y) * W + Math.round(s.x);
    if (!forward[k]) out.push(`${map.id}: ${s.id} unreachable${map.building?.trial ? ' (trial)' : ''}`);
    if (T[k]?.interiorPlatform) out.push(`${map.id}: ${s.id} on the jump platform`);
  }
  for (const o of map.objects || []) {
    const x = Math.round(o.x), y = Math.round(o.y), k = y * W + x;
    if (T[k] && !T[k].blocked && !T[k].hole && T[k].interiorPlatform) out.push(`${map.id}: ${o.id} on the jump platform`);
  }
  const chain = T.filter((t) => t.interiorPlatform);
  if (chain.length) {
    const first = chain.find((t) => t.elev === 1), before = T[first.y * W + first.x - 1];
    if (!before || before.blocked || before.hole || before.interiorPlatform || !forward[first.y * W + first.x - 1]) out.push(`${map.id}: the first step has no open approach`);
  }
  return out;
}

// Every generator family that lays interior terrain, at the given terrain version.
function* maps(seeds, T) {
  for (const seed of seeds) for (let i = 0; i < 4; i++) {
    const rx = i * 9 - 17, ry = (i * 13) % 23 - 7;
    for (const style of ['keep', 'apartment', 'hive']) {
      const S = BUILDINGS.styles[style];
      for (const floors of [S.floors[0], S.floors[1]]) for (const V of style === 'keep' ? [3, 4, 5] : [3, 4]) {
        const base = `building:${seed}:${rx}:${ry}:${style}:${floors}${i & 1 ? 'r' : ''}`;
        for (let f = 1; f <= floors; f++) yield generateBuildingFloor(seed, `${base}:f${f}`, V, T);
      }
    }
    if (i < 2) {
      const C = compoundTopology(seed, rx, ry, ['keep', 'apartment', 'hive'][i % 3], 3);
      for (const q of C.parts) { const base = `compound:${seed}:${rx}:${ry}:${C.style || ['keep', 'apartment', 'hive'][i % 3]}:${q.part}:${q.floors}${q.hatch ? 'r' : ''}`; for (let f = 1; f <= q.floors; f++) { const m = generateCompoundFloor(seed, `${base}:f${f}`, 4, 3, T); if (m) yield m; } }
      const K = castleTopology(seed, rx, ry);
      for (const q of [...K.wings, K.keep]) for (let f = 1; f <= q.floors; f++) yield generateCastleFloor(seed, `castle:${seed}:${rx}:${ry}:${q.part}:${q.floors}:f${f}`, 4, 3, T);
      const lb = `labyrinth:${seed}:${rx}:${ry}:${['keep', 'apartment', 'hive'][i % 3]}`, plan = labyrinthPlan(lb);
      for (const n of plan?.nodes || []) yield generateLabyrinthChamber(seed, `${lb}:f${n.n + 1}`, 4, T);
    }
  }
  for (const seed of seeds) for (const [cx, cy] of [[16, -8], [24, 8]]) for (const V of [9, 10]) {
    const plan = pentagonPlan(seed, cx, cy, V);
    for (const n of plan.nodes) yield generatePentagonChamber(seed, `${plan.base}:f${n.n + 1}`, T);
  }
}

test('interior terrain v2: no one-way pockets, every guard and trial guard reachable, nothing on a platform', () => {
  assert.equal(INTERIOR_TERRAIN.version, 2);
  const seeds = ['CINDER-VERGE-47', 'ZZ-0042', 'PLAT-1', 'PLAT-2', 'q', 'tide-9', 'AUDIT-ALPHA-1'];
  let n = 0, platforms = 0, trials = 0; const bad = [];
  for (const map of maps(seeds, 2)) {
    n++; platforms += map.tiles.some((t) => t.interiorPlatform); trials += !!map.building?.trial;
    assert.deepEqual(map.interiorTerrain, { version: 1, maxLevel: 5, platform: 2 }, map.id);
    bad.push(...problems(map));
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} problems in ${n} maps`);
  assert.ok(n >= 2500, `${n} maps`);
  assert.ok(trials >= 20, `${trials} trial chambers`);
  assert.ok(platforms / n > .5, `optional jump chains still appear (${platforms} of ${n})`);
});

test('the audited floors that trapped the Wayfarer under v1 are sound under v2', () => {
  const cases = [
    ['building', 'building:CINDER-VERGE-47:-26:17:keep:4:f2', 5],
    ['building', 'building:CINDER-VERGE-47:30:-3:hive:3r:f1', 4],
    ['pentagon', 'pentagon:CINDER-VERGE-47:24:8:v10:f22'],
    ['pentagon', 'pentagon:ZZ-0042:16:-8:v9:f18'],
  ];
  for (const [kind, id, V] of cases) {
    const seed = id.split(':')[1], gen = (T) => kind === 'building' ? generateBuildingFloor(seed, id, V, T) : generatePentagonChamber(seed, id, T);
    const old = gen(1), fixed = gen(2);
    assert.ok(problems(old).some((p) => /no way back/.test(p)), `${id}: v1 keeps its pocket (pinned)`);
    assert.deepEqual(problems(fixed), [], id);
  }
});

// Digests of terrain-v1 output by family, taken before interior terrain v2 existed: interior v1–v5, compounds, castles,
// labyrinths and Pentagon v8–v10 regenerate byte for byte, with the terrain version left out or passed as 1.
const LEGACY = [
  ['building v1', '0f7d8a4cd8a18eeffc950ebab751a4f81e044da7e0624981767356e9e0ef238f'],
  ['building v2', 'b15be9d7b411e9e2b5a0e2cfec5d74954f2df973d4847925e7ddf9a9f5da03e1'],
  ['building v3', 'aded1b5c25e72510b6992c8ab1c9d7b88e56d44f1839c1924000b86d3b904a37'],
  ['building v4', '22ad344352117b3cf175f98e8b89ff7799f096e03933bd104b828da7afa6e253'],
  ['building v5', '784383580793aeede6b758fe61b10dac3752269430b710ab359a1d159793876e'],
  ['compound v4', '0e5ec4983afb94b4c6de038bae456c041d79e590a7a90782e85897b418ffec3b'],
  ['castle v4', '406e3d45c48c68ec41b4fe378b0b9c6b3be22d3a2e12c847602ff15246ac6fa6'],
  ['labyrinth v4', '96036795086a247ce8c82efa01144bbb1a1a1be89e9bfd42149fd719a9c3afff'],
  ['pentagon v8', '81cddd138c208d9ce26dc62c8d2af76940a47f5f10f4f94c9d1d878368603130'],
  ['pentagon v9', '0c691968bf7e14e65757873c64f6800c2fb9e83b1fe6bceb4105c2d249e75850'],
  ['pentagon v10', 'ca52bf956aa8de9a27b3be4c6e44f08c68386abf4ccc070f837851acc0e315ce'],
];
function legacyDigests(T) {
  const fam = {}, add = (k, m) => (fam[k] ||= createHash('sha256')).update(JSON.stringify(m));
  const t = T === undefined ? [] : [T];
  for (const seed of ['PINA', 'PINB', 'CINDER-VERGE-47']) for (let i = 0; i < 3; i++) {
    const rx = i * 7 - 12, ry = 5 - i * 6;
    for (const style of ['keep', 'apartment', 'hive']) for (const V of style === 'keep' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4]) {
      const base = `building:${seed}:${rx}:${ry}:${style}:3r`;
      for (let f = 1; f <= 3; f++) add(`building v${V}`, generateBuildingFloor(seed, `${base}:f${f}`, V, ...t));
    }
    const C = compoundTopology(seed, rx, ry, 'keep', 3);
    for (const q of C.parts.slice(0, 3)) { const base = `compound:${seed}:${rx}:${ry}:keep:${q.part}:${q.floors}${q.hatch ? 'r' : ''}`; for (let f = 1; f <= q.floors; f++) add('compound v4', generateCompoundFloor(seed, `${base}:f${f}`, 4, 3, ...t)); }
    const K = castleTopology(seed, rx, ry);
    for (const q of [...K.wings.slice(0, 2), K.keep]) { const base = `castle:${seed}:${rx}:${ry}:${q.part}:${q.floors}`; for (let f = 1; f <= q.floors; f++) add('castle v4', generateCastleFloor(seed, `${base}:f${f}`, 4, 3, ...t)); }
    const lb = `labyrinth:${seed}:${rx}:${ry}:keep`;
    for (const n of labyrinthPlan(lb).nodes.slice(0, 6)) add('labyrinth v4', generateLabyrinthChamber(seed, `${lb}:f${n.n + 1}`, 4, ...t));
  }
  for (const seed of ['PINA', 'ZZ-0042']) for (const [cx, cy] of [[16, -8], [24, 8]]) for (const V of [8, 9, 10]) {
    const plan = pentagonPlan(seed, cx, cy, V);
    for (const n of plan.nodes) add(`pentagon v${V}`, generatePentagonChamber(seed, `${plan.base}:f${n.n + 1}`, ...t));
  }
  return Object.entries(fam).map(([k, h]) => [k, h.digest('hex')]);
}

test('interior terrain v1 and every older interior and Pentagon version regenerate byte for byte', () => {
  assert.deepEqual(legacyDigests(), LEGACY);
  assert.deepEqual(legacyDigests(1), LEGACY);
});

function enter(seed, id, history) {
  const save = freshSave(); save.seed = seed;
  if (history) ((save.consequences ||= {}).dungeons ||= {})[id] = { ...history };
  const game = new Game(save, 0);
  game.save.session.activeDungeonId = id; game.save.session.dungeonReturn = { rx: 0, ry: 0, x: 16, y: 16 };
  game.loadArea('dungeon', false);
  return game;
}
const heights = (map) => map.tiles.map((t) => `${t.elev || 0}${t.interiorPlatform ? 'P' : ''}`).join(',');

test('the game pins terrain v2 on floors and chambers generated from now on, and keeps v1 on floors generated before', () => {
  for (const [id, V] of [['building:CINDER-VERGE-47:30:-3:hive:3r:f1', 4], ['pentagon:CINDER-VERGE-47:24:8:v10:f22', null]]) {
    const seed = id.split(':')[1], gen = (T) => V ? generateBuildingFloor(seed, id, V, T) : generatePentagonChamber(seed, id, T);
    const pin = V ? { interiorVersion: V } : {};
    const fresh = enter(seed, id, V ? pin : null);
    assert.equal(fresh.save.consequences.dungeons[id].terrainVersion, 2, id);
    assert.equal(fresh.map.interiorTerrain.platform, 2, id);
    assert.equal(heights(fresh.map), heights(gen(2)), id);
    // a floor an earlier release generated (its history already pinned a generator) keeps the platform it had
    const old = enter(seed, id, { ...pin, generatorVersion: 5 });
    assert.equal(old.save.consequences.dungeons[id].terrainVersion, 1, id);
    assert.equal(old.map.interiorTerrain.platform, undefined, id);
    assert.equal(heights(old.map), heights(gen(1)), id);
    assert.notEqual(heights(gen(1)), heights(gen(2)), `${id}: the sample differs between versions`);
    // the pin holds once recorded
    const again = enter(seed, id, { ...pin, generatorVersion: 5, terrainVersion: 2 });
    assert.equal(heights(again.map), heights(gen(2)), id);
  }
});
