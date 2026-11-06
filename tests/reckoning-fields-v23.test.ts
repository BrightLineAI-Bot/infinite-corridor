// The Reckoning Fields (landscape version 23; the daily world-regions work, Tim 2026-10-29: "find ways to make the map have
// interesting features... beautiful collections of regions... rich and vibrant... without decreasing performance";
// docs/narrative-bible.md section 1: farther out the Corridor forgets it was ever human, "patterns that compute themselves").
// Regions still wild or bare plains after version 21, whose site is at least REGIONS_V23.minRing sections out, may become
// reckoning fields: one self-similar figure (a sieve, a carpet or a cross) computed from the region's own site, its coarse and
// mid scales raised as plates, its fine scale lit as cells, a few black monoliths, now and then a cache on a top plate. Ground
// first seen at version 22 or older regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { LANDSCAPE_VERSION, RECKONING, REGIONS_V23, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, biomeFor, reckoningFigure, reckoningAt, fallDamage } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';

const SEED = 'RECK23', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['ruleSlate', 'ruleCell', 'ruleNode', 'ruleMonolith'];
const make = (x, y, version = 23, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the pins below were taken with this fingerprint on main (release 789), before this change; the Far Sleep's landscape.version
// label follows the constant (as it always has), so it is left out
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (let x = 14; x < 400 && out.length < 40; x += 3) for (let y = 14; y < 400 && out.length < 40; y += 5) { const r = sectionRegion(SEED, x, y, 23); if (r.type !== 'reckoning' || r.hold < .5) continue; const m = make(x, y); if (m.reckoning) out.push({ x, y, m, rule: reckoningFigure(SEED, r.id).rule.id }); } return out; })();

test('version 23 turns some far wild and plains regions into reckoning fields; every other region, the heartland and the near world keep their version 22 type', () => {
  assert.equal(LANDSCAPE_VERSION, 23); assert.deepEqual(REGIONS_V23.from, ['wild', 'ashfields', 'glasslands', 'emberlands']); assert.ok(REGIONS_V23.minRing > REGIONS.heartland + REGIONS.fadeIn);
  const seen = new Set(); let turned = 0, from = 0;
  for (let x = -150; x < 150; x += 3) for (let y = -150; y < 150; y += 3) {
    const a = sectionRegion(SEED, x, y, 22), b = sectionRegion(SEED, x, y, 23); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold);
    if (Math.hypot(x + .5, y + .5) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
    if (!REGIONS_V23.from.includes(a.type)) assert.equal(b.type, a.type, `${x},${y}`); else if (b.type === 'reckoning') turned++; else { assert.equal(b.type, a.type); }
    if (REGIONS_V23.from.includes(a.type)) from++;
    if (b.type === 'reckoning') { const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V23.minRing - REGIONS.cell, 'a reckoning region lies far out'); }
  }
  assert.ok(seen.has('reckoning')); assert.ok(turned / from > .3 && turned / from < .8, `${turned} of ${from}`);
  for (let x = -20; x <= 20; x++) for (let y = -20; y <= 20; y++) if (Math.hypot(x, y) < 18) assert.notEqual(sectionRegion(SEED, x, y, 23).type, 'reckoning', 'none near the Refuge');
  const { x, y } = sections()[0]; assert.notEqual(sectionRegion(SEED, x, y, 22).type, 'reckoning', 'version 22 has no reckoning fields');
  assert.ok(REGION_GROUNDS.reckoning && REGION_BANNER.kinds.reckoning === 'Reckoning fields' && REGION_NAMES.nouns.reckoning.length >= 4);
  assert.ok(REGION_NAMES.nouns.reckoning.some((n) => regionName(SEED, sectionRegion(SEED, x, y, 23)).endsWith(` ${n}`)));
  assert.equal(FAR_POCKETS.blobByRegion.reckoning, 'duskBlob'); assert.equal(landscapeAtlasColor('reckoning'), REGION_GROUNDS.reckoning.atlas);
});

test('the figure: closed form, nested scales, every rule found; plates rise to level 2, every step one level; Atlas colours; bounded', () => {
  for (const R of RECKONING.rules) { // the fine figure lies inside the mid, the mid inside the coarse, at any distance from the site
    const f = { rule: R, ox: 0, oy: 0 }; for (let k = 0; k < 4000; k++) { const gx = (k * 7919) % 600 - 300, gy = (k * 104729) % 600 - 300, a = reckoningAt(f, gx, gy); assert.ok(a.from >= 0 && a.from <= R.digits); if (a.node) assert.equal(a.from, 0); assert.deepEqual(reckoningAt(f, -gx, gy), a, 'mirrored about the site'); } }
  const list = sections(); assert.ok(list.length >= 30, `${list.length} sections`); assert.ok(new Set(list.map((s) => s.rule)).size >= 2, 'more than one figure');
  let monoliths = 0, caches = 0, cells = 0, tiles = 0; const levels = [0, 0, 0];
  for (const { x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'reckoning'); tiles += mine.length;
    for (const t of mine) { assert.ok(KINDS.includes(t.kind), t.kind); assert.equal(!!t.blocked, t.kind === 'ruleMonolith', `${x},${y} ${t.kind}`); if (!t.blocked) { assert.ok((t.elev || 0) <= RECKONING.levels); levels[t.elev || 0]++; } if (t.kind !== 'ruleSlate') cells++; }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'reckoning' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two at ${t.x},${t.y}`); }
    const stones = m.monoliths || []; assert.ok(stones.length <= RECKONING.monoliths[1]); monoliths += stones.length;
    for (const s of stones) assert.equal(m.tiles[idx(s.x, s.y)].kind, 'ruleMonolith');
    const added = m.objects.filter((o) => String(o.id).startsWith('reckoning-')); assert.ok(added.length <= 1); caches += added.length;
    for (const o of added) { assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.ok(m.tiles[idx(o.x, o.y)].elev >= RECKONING.cache.minLevel); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached'); }
    if (biomeFor(SEED, x, y, 23) !== 'mountains') assert.equal(m.weather, generateRegion(SEED, x, y).weather, 'no weather of its own: nothing more each frame');
  }
  assert.ok(levels.every((n) => n > tiles * .05), JSON.stringify(levels)); assert.ok(cells > tiles * .15, `${cells} lit cells in ${tiles}`);
  assert.ok(monoliths >= list.length * .4, `${monoliths} monoliths`); assert.ok(caches >= 3, `${caches} caches`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); assert.ok(isLandscapeKind(k), k); assert.equal(landscapeTileAnimated({ kind: k, landscape: 'reckoning' }), false, `${k}: drawn once into the ground cache`); }
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  const m = list[0].m; for (const t of m.tiles) if (t.landscape === 'reckoning') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'reckoning').length - a.tiles.filter((t) => t.landscape === 'reckoning').length)[0];
  const c = sectionAtlasColor(full), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(b > r + 12 && b > g + 12 && r + g + b < 360, `${c}: the Atlas reads deep indigo`);
  assert.match(readFileSync(new URL('../src/landscape-render.ts', import.meta.url), 'utf8'), /PAINT\.ruleMonolith =/);
});

// The solver: the real movement rules (landscape.ts canStep for the Wayfarer: walk level, jump one up, drop any height; thin walls
// counted), searched both ways from the plaza; every land exit, the cache and every walkable tile the plaza reached before the
// monoliths stood must be reached and lead back.
function solve(m, from) {
  const go = new Uint8Array(1024), q = [idx(from.x, from.y)]; go[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= W || go[j] || !walk(m.tiles[j])) continue;
    if (!canStep({ isPlayer: true, jumping: true }, m, W, x, y, nx, ny)) continue; if (fallDamage((m.tiles[i].elev || 0) - (m.tiles[j].elev || 0), 100) === Infinity) continue; go[j] = 1; q.push(j); } }
  return go;
}
test('traversable (solver): no trap, every exit and the cache join the plaza both ways, no drop kills, monoliths never cut ground off', () => {
  let unOld = 0, unNew = 0;
  for (const { x, y } of sections().slice(0, 30)) {
    const m = make(x, y, 23, { coherence: 1 }); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(SEED, x, y), go = solve(m, { x: 16, y: 16 });
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`);
      const back = solve(m, { x: ex_, y: ey }); assert.ok(back[idx(16, 16)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('reckoning-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(solve(m, o)[idx(16, 16)], 'down from the cache'); }
    for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i], b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'reckoning') assert.ok((a.elev || 0) - (b.elev || 0) < 4, 'no fatal ledge'); }
    const plain = structuredClone(m); for (const t of plain.tiles) if (t.kind === 'ruleMonolith') { t.kind = 'ruleCell'; t.blocked = false; t.elev = 0; }
    const a = reachableFromPlaza(m, undefined, true), b = reachableFromPlaza(plain, undefined, true); for (let i = 0; i < 1024; i++) if (plain.tiles[i].kind !== m.tiles[i].kind) continue; else assert.equal(!!a[i], !!b[i], `${x},${y}: ${i % 32},${i >> 5}`);
    const old = make(x, y, 22), ra = reachableFromPlaza(old), rb = reachableFromPlaza(m, undefined, true); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!rb[i] && walk(m.tiles[i])) unNew++; }
  }
  assert.ok(unNew <= unOld, `walkable ground the plaza cannot reach: ${unNew} (version 22 on the same ground: ${unOld})`);
});

test('the real movement rules: a jump climbs each plate, a ramp walks one, and creatures still have room', () => {
  const { x, y, m } = sections().find(({ m }) => m.tiles.some((t) => t.landscape === 'reckoning' && t.elev === 2));
  let up = 0, ramps = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'reckoning' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; if (a.slope || b.slope) ramps++; }
  assert.ok(up > 20 && ramps > 0, `${up} steps up, ${ramps} by ramp`);
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the figure runs on over the border', () => {
  let pair = null; for (let x = 14; x < 400 && !pair; x += 2) for (let y = 14; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 23).type === 'reckoning' && sectionRegion(SEED, x + 1, y, 23).type === 'reckoning' && sectionRegion(SEED, x, y, 23).hold >= 1) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 23, { coherence: 1 }), b = make(x + 1, y, 23, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  let n = 0, sameKind = 0, near = 0; for (let yy = 2; yy < 30; yy++) { if (Math.abs(yy - e) <= 2) continue; const p = a.tiles[idx(30, yy)], q = b.tiles[idx(1, yy)]; if (p.landscape !== 'reckoning' || q.landscape !== 'reckoning') continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++;
    const f = reckoningFigure(SEED, sectionRegion(SEED, x, y, 23).id), fa = reckoningAt(f, x * 32 + 30, y * 32 + yy), fb = reckoningAt(f, (x + 1) * 32 + 1, y * 32 + yy); if ((fa.from === 0) === (p.kind !== 'ruleSlate') && (fb.from === 0) === (q.kind !== 'ruleSlate')) sameKind++; }
  assert.ok(n > 10); assert.equal(near, n, 'no cliff opens at the border'); assert.equal(sameKind, n, 'both sides read the one world figure');
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat', () => {
  for (const { x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 23); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'reckoning'));
  const banner = (one.g.questNotices || []).find((q) => q.kind === 'discovery'); if (banner) assert.equal(banner.detail, 'Reckoning fields');
  const h = make(x, y, 23, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'reckoning')); assert.ok(h.tiles.filter((t) => t.landscape === 'reckoning').every((t) => !t.elev && t.kind !== 'ruleMonolith'));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('reckoning-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (release 789) before this change', () => {
  for (const [seed, v, x, y, hash] of [
    ['RECK23', 22, 28, 25, 'ba6d614b73139211'], ['RECK23', 21, 28, 25, '2b5efb499f416540'], ['RECK23', 11, 28, 25, '0695e145ce133283'], ['RECK23', 4, 28, 25, '9a95470f6e02174a'],
    ['RECK23', 2, 28, 25, '2b6b909943f474ce'], ['RECK23', 22, 42, 245, 'b0298e8c737f20f6'], ['RECK23', 22, 63, 69, '6f66f43fb379ee8b'], ['RECK23', 21, 63, 69, '6f66f43fb379ee8b'],
    ['RECK23', 22, 70, 69, '9eaa95fcb2bbc545'], ['RECK23', 22, 84, 102, '77504229a1f1eeb3'], ['RECK23', 21, 84, 102, 'a6a52f05ba52ac14'], ['RECK23', 22, 91, 399, 'be4bf23065a037bc'],
    ['RECK23', 22, 98, 399, '80a115e0a4f9ae7a'], ['RECK23', 21, 98, 399, '80a115e0a4f9ae7a'], ['RECK23', 22, 105, 267, 'edf16014a93359d7'], ['AUDIT-A', 22, 14, 388, '7f12a4182b4059d4'],
    ['AUDIT-A', 21, 14, 388, '66d4b0a9c993e07e'], ['AUDIT-A', 11, 14, 388, '7dac2c321ed276c3'], ['AUDIT-A', 4, 14, 388, 'b461e12c983f9064'], ['AUDIT-A', 2, 14, 388, 'a46ecd0198142885'],
    ['AUDIT-A', 22, 35, 355, '86ea94e85c024827'], ['AUDIT-A', 22, 42, 267, 'a2b0f50d32acf957'], ['AUDIT-A', 21, 42, 267, '7a2fdf6be0339273'], ['AUDIT-A', 22, 42, 278, '2d36047f4e1c0ed4'],
    ['AUDIT-A', 22, 42, 355, 'c889c79953544df0'], ['AUDIT-A', 21, 42, 355, '4d4cbe41bb5dcf0e'], ['AUDIT-A', 22, 56, 179, 'a19741cf7b8f09cd'], ['AUDIT-A', 22, 56, 311, 'd0821c0c731d350f'],
    ['AUDIT-A', 21, 56, 311, 'd0821c0c731d350f'], ['AUDIT-A', 22, 63, 157, '28c531c3e3b30007'], ['RECK23', 22, 20, -30, 'a320d9d00d857004'], ['RECK23', 22, 3, 5, '9e4a11c6f136b8ef'],
    ['RECK23', 22, 1150, 3, 'a754e183c56e12dd'], ['RECK23', 17, 1150, 3, 'cbb280996e653b13'],
  ]) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  assert.ok(!pinned('RECK23', 28, 25, 22).tiles.some((t) => t.landscape === 'reckoning') && make(28, 25).tiles.some((t) => t.landscape === 'reckoning'), 'the same ground first seen at 23 is reckoned');
});

test('in the game: ground first seen at version 22 keeps its version 22 ground; new ground pins 23', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 22 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 22); assert.ok(!g.map.tiles.some((t) => t.landscape === 'reckoning'), 'nothing reckoned on version 22 ground');
});
