// The Rimeglaciers (landscape version 24; the daily world-regions work, Tim 2026-10-29: "find ways to make the map have
// interesting features... beautiful collections of regions... rich and vibrant... without decreasing performance"; his list:
// "great ice world", "great mountain ranges"). Mountain regions, and regions still wild or bare plains after version 23, whose
// site is at least REGIONS_V24.minRing sections out, may become rimeglaciers: a stepped ice sheet flowing one way per region,
// with icefalls, firn tops, moraine streaks, melt pools, lethal crevasse slots spanned by snow bridges, serac towers and now and
// then a cache on a top firn plate. Ground first seen at version 23 or older regenerates byte for byte.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, REGION_BANNER } from '../src/game.ts';
import { generateRegion, sectionExits } from '../src/world.ts';
import { GLACIER, REGIONS_V24, REGION_GROUNDS, REGION_NAMES, REGIONS, applyLandscape, applyDream, DREAM_VERSION, sectionRegion, regionName, reachableFromPlaza, trappedTiles,
  coherenceCore, joinsCore, cohereSection, isLandscapeKind, canStep, LETHAL_KINDS, biomeFor, glacierFlow, glacierAt, fallDamage } from '../src/landscape.ts';
import { ATLAS_TILE_COLORS, sectionAtlasColor } from '../src/atlas-colors.ts';
import { drawLandscapeTile, landscapeTileAnimated, landscapeAtlasColor } from '../src/landscape-render.ts';
import { FAR_POCKETS } from '../src/far-realms.ts';

const SEED = 'RIME24', W = 32, idx = (x, y) => y * W + x, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KINDS = ['glacierIce', 'firn', 'moraine', 'meltPool', 'snowBridge', 'serac', 'lakeIce', 'abyss'];
const make = (x, y, version = 24, opts = {}, seed = SEED) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version, ...opts }); return m; };
const walk = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
// the pins below were taken with this fingerprint on main (release 891, 8af65ea6) before this change; the Far Sleep's
// landscape.version label follows the constant (as it always has), so it is left out
const fp = (m) => createHash('sha1').update(JSON.stringify({ tiles: m.tiles, objects: m.objects, spawns: m.enemySpawns || null, canopy: m.canopy || null, mushrooms: m.mushrooms || null, weather: m.weather || null, landscape: m.landscape?.biome === 'dream' ? { ...m.landscape, version: 0 } : m.landscape || null })).digest('hex').slice(0, 16);
const pinned = (seed, x, y, v) => { const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: v }); applyDream(m, seed, x, y, DREAM_VERSION); return m; };
let found = null;
const sections = () => found ||= (() => { const out = []; for (let x = 20; x < 400 && out.length < 36; x += 3) for (let y = 20; y < 400 && out.length < 36; y += 5) { const r = sectionRegion(SEED, x, y, 24); if (r.type !== 'glacier' || r.hold < .5) continue; const m = make(x, y); if (m.glacier) out.push({ x, y, m, id: r.id }); } return out; })();

test('version 24 turns some far mountain, wild and plains regions into rimeglaciers; every other region, the heartland and the near world keep their version 23 type', () => {
  assert.deepEqual(REGIONS_V24.from, ['mountains', 'wild', 'ashfields', 'glasslands', 'emberlands']); assert.ok(REGIONS_V24.minRing > REGIONS.heartland + REGIONS.fadeIn);
  const seen = new Set(); let turned = 0, from = 0, all = 0, glacier = 0;
  for (let x = -150; x < 150; x += 3) for (let y = -150; y < 150; y += 3) {
    const a = sectionRegion(SEED, x, y, 23), b = sectionRegion(SEED, x, y, 24); seen.add(b.type); assert.equal(a.id, b.id); assert.equal(a.hold, b.hold); all++;
    if (Math.hypot(x + .5, y + .5) < REGIONS.heartland) assert.equal(b.type, 'wild', 'the heartland keeps the old mix');
    if (!REGIONS_V24.from.includes(a.type)) assert.equal(b.type, a.type, `${x},${y}`); else if (b.type === 'glacier') turned++; else assert.equal(b.type, a.type);
    if (REGIONS_V24.from.includes(a.type) && Math.hypot(x, y) > REGIONS_V24.minRing + REGIONS.cell * 2) from++;
    if (b.type === 'glacier') { glacier++; const [cx, cy] = b.id.split(',').map(Number); assert.ok(Math.hypot((cx + .5) * REGIONS.cell, (cy + .5) * REGIONS.cell) >= REGIONS_V24.minRing - REGIONS.cell, 'a glacier lies far out'); }
  }
  assert.ok(seen.has('glacier') && seen.has('mountains'), 'glaciers, and mountains still'); assert.ok(turned / from > .15 && turned / from < .7, `${turned} of ${from}`);
  assert.ok(glacier / all > .015, `${glacier} of ${all} sections are glacier: a region you meet`);
  for (let x = -26; x <= 26; x++) for (let y = -26; y <= 26; y++) if (Math.hypot(x, y) < 22) assert.notEqual(sectionRegion(SEED, x, y, 24).type, 'glacier', 'none near the Refuge');
  const { x, y } = sections()[0]; assert.notEqual(sectionRegion(SEED, x, y, 23).type, 'glacier', 'version 23 has no glaciers');
  assert.ok(REGION_GROUNDS.glacier && REGION_BANNER.kinds.glacier === 'Rimeglacier' && REGION_NAMES.nouns.glacier.length >= 4);
  assert.ok(REGION_NAMES.nouns.glacier.some((n) => regionName(SEED, sectionRegion(SEED, x, y, 24)).endsWith(` ${n}`)));
  assert.equal(FAR_POCKETS.blobByRegion.glacier, 'frostBlob'); assert.equal(landscapeAtlasColor('glacier'), REGION_GROUNDS.glacier.atlas);
});

test('the ice: a flow per region, icefalls to level 3, every step one level, crevasses spanned by bridges, seracs, caches; Atlas colours; bounded', () => {
  const list = sections(); assert.ok(list.length >= 30, `${list.length} sections`);
  const flows = new Set(list.map((s) => { const f = glacierFlow(SEED, s.id); assert.ok(Math.abs(Math.hypot(f.ux, f.uy) - 1) < 1e-9); return `${f.ux.toFixed(3)},${f.uy.toFixed(3)}`; })); assert.ok(flows.size >= 2, 'regions flow different ways');
  let crevasses = 0, bridges = 0, seracs = 0, caches = 0, tiles = 0, moraine = 0, melt = 0; const levels = [0, 0, 0, 0];
  for (const { x, y, m } of list) {
    const mine = m.tiles.filter((t) => t.landscape === 'glacier'); tiles += mine.length;
    for (const t of mine) { assert.ok(KINDS.includes(t.kind), t.kind); assert.equal(!!t.blocked, t.kind === 'serac', `${x},${y} ${t.kind}`); assert.equal(t.kind === 'abyss', !!t.crevasse);
      if (t.crevasse) { crevasses++; assert.equal(t.elev || 0, 0, 'a crevasse is a slot at the foot of the ice'); } else if (!t.blocked) { assert.ok((t.elev || 0) <= GLACIER.height.levels); levels[t.elev || 0]++; }
      if (t.kind === 'snowBridge') bridges++; if (t.kind === 'moraine') moraine++; if (t.kind === 'meltPool') { melt++; } if (t.kind === 'firn') assert.ok((t.elev || 0) >= 1, `${x},${y}: firn tops the high ice`); }
    for (const t of mine) if (walk(t)) for (const [dx, dy] of N4) { const n = m.tiles[idx(t.x + dx, t.y + dy)]; if (t.x + dx < 0 || t.x + dx > 31 || !n || n.landscape !== 'glacier' || !walk(n)) continue; assert.ok(Math.abs((n.elev || 0) - (t.elev || 0)) <= 1, `${x},${y}: a step of two at ${t.x},${t.y}`); }
    const towers = m.seracs || []; assert.ok(towers.length <= GLACIER.seracMax); seracs += towers.length; for (const s of towers) assert.equal(m.tiles[idx(s.x, s.y)].kind, 'serac');
    assert.equal(m.crevasses || 0, mine.filter((t) => t.crevasse).length);
    const added = m.objects.filter((o) => String(o.id).startsWith('glacier-')); assert.ok(added.length <= 1); caches += added.length;
    for (const o of added) { assert.equal(o.kind, 'chest'); assert.equal(o.rewardSource, 'chest'); assert.ok(m.tiles[idx(o.x, o.y)].elev >= GLACIER.cache.minLevel); assert.ok(reachableFromPlaza(m)[idx(o.x, o.y)], 'the cache is reached'); }
    if (biomeFor(SEED, x, y, 24) !== 'mountains') assert.equal(m.weather, generateRegion(SEED, x, y).weather, 'no weather of its own: nothing more each frame');
  }
  assert.ok(levels.every((n) => n > tiles * .04), JSON.stringify(levels)); assert.ok(moraine > tiles * .02 && melt > tiles * .01, `${moraine} moraine, ${melt} melt of ${tiles}`);
  assert.ok(crevasses >= list.length * 4 && crevasses < tiles * .06, `${crevasses} crevasse tiles in ${tiles}`); assert.ok(bridges > 10, `${bridges} snow bridges`);
  assert.ok(seracs >= list.length, `${seracs} seracs`); assert.ok(caches >= 3, `${caches} caches`);
  for (const k of KINDS) { assert.ok(ATLAS_TILE_COLORS[k], `${k} on the Atlas`); if (k !== 'abyss') assert.ok(isLandscapeKind(k), k); }
  for (const k of KINDS.filter((k) => k !== 'abyss')) assert.equal(landscapeTileAnimated({ kind: k, landscape: 'glacier' }), false, `${k}: drawn once into the ground cache`);
  assert.equal(landscapeTileAnimated({ kind: 'abyss', landscape: 'glacier', crevasse: true }), false, 'a crevasse is drawn once too');
  const ctx = new Proxy({}, { get: (_, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  const m = list.find((s) => s.m.crevasses).m; for (const t of m.tiles) if (t.landscape === 'glacier') assert.equal(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, W), true);
  const full = list.map((s) => s.m).sort((a, b) => b.tiles.filter((t) => t.landscape === 'glacier').length - a.tiles.filter((t) => t.landscape === 'glacier').length)[0];
  const c = sectionAtlasColor(full), [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); assert.ok(b > r + 15 && b >= g && r + g + b > 330, `${c}: the Atlas reads pale glacier blue`);
  for (let k = 0; k < 2000; k++) { const gx = (k * 7919) % 900 - 450, gy = (k * 104729) % 900 - 450, a = glacierAt(SEED, { ux: 1, uy: 0 }, gx, gy); assert.ok(a.level >= 0 && a.level <= GLACIER.height.levels); if (a.bridge) assert.ok(a.crevasse); }
});

// The solver: the real movement rules (landscape.ts canStep for the Wayfarer: walk level, jump one up, drop any height; lethal
// ground excluded; thin walls counted), searched both ways from the plaza; every land exit, the cache and every walkable tile
// the plaza reached both ways with no crevasse or serac laid must be reached and lead back.
function solve(m, from, reverse = false) {
  const go = new Uint8Array(1024), q = [idx(from.x, from.y)]; go[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const i = q[h], x = i % W, y = (i - x) / W; for (const [dx, dy] of N4) { const nx = x + dx, ny = y + dy, j = idx(nx, ny); if (nx < 0 || ny < 0 || nx >= W || ny >= W || go[j] || !walk(m.tiles[j])) continue;
    const [a, b] = reverse ? [j, i] : [i, j], ax = a % W, ay = (a - ax) / W, bx = b % W, by = (b - bx) / W;
    if (!canStep({ isPlayer: true, jumping: true }, m, W, ax, ay, bx, by)) continue; if (fallDamage((m.tiles[a].elev || 0) - (m.tiles[b].elev || 0), 100) === Infinity) continue; go[j] = 1; q.push(j); } }
  return go;
}
test('traversable (solver): no trap, every exit and the cache join the plaza both ways, no drop kills, crevasses and seracs never cut ground off', () => {
  let unOld = 0, unNew = 0, checked = 0;
  for (const { x, y } of sections().slice(0, 30)) {
    const m = make(x, y, 24, { coherence: 1 }); cohereSection(m); assert.equal(trappedTiles(m, W, W, { x: 16, y: 16 }, true).length, 0, `${x},${y}: a trap`);
    const core = coherenceCore(m), ex = sectionExits(SEED, x, y), go = solve(m, { x: 16, y: 16 }), back = solve(m, { x: 16, y: 16 }, true);
    for (const [ex_, ey] of [[ex.north, 0], [ex.south, 31], [0, ex.west], [31, ex.east]]) { const t = m.tiles[idx(ex_, ey)]; if (!walk(t)) continue; assert.ok(joinsCore(m, { x: ex_, y: ey }, core), `${x},${y}: exit ${ex_},${ey}`); assert.ok(go[idx(ex_, ey)], `${x},${y}: the solver reaches exit ${ex_},${ey}`); assert.ok(back[idx(ex_, ey)], `${x},${y}: from exit ${ex_},${ey} back to the plaza`); checked++; }
    for (const o of m.objects.filter((q) => String(q.id).startsWith('glacier-cache'))) { assert.ok(joinsCore(m, o, core), `${x},${y}: the cache`); assert.ok(go[idx(o.x, o.y)] && back[idx(o.x, o.y)], 'up to the cache and down again'); }
    for (let i = 0; i < 1024; i++) if (go[i]) for (const [dx, dy] of N4) { const a = m.tiles[i], b = m.tiles[idx(a.x + dx, a.y + dy)]; if (b && walk(b) && a.landscape === 'glacier') assert.ok((a.elev || 0) - (b.elev || 0) < 4, 'no fatal ledge'); }
    const plain = structuredClone(m); for (const t of plain.tiles) if (t.crevasse || t.kind === 'serac') { delete t.crevasse; t.kind = 'glacierIce'; t.blocked = false; }
    // with every hazard lifted (each at its foot), the ground reached both ways is no larger than with them
    const pg = solve(plain, { x: 16, y: 16 }), pb = solve(plain, { x: 16, y: 16 }, true); for (let i = 0; i < 1024; i++) if (pg[i] && pb[i] && walk(m.tiles[i]) && plain.tiles[i].kind === m.tiles[i].kind && !(go[i] && back[i])) assert.fail(`${x},${y}: ${i % 32},${i >> 5} cut off by the ice`);
    const old = make(x, y, 23), ra = reachableFromPlaza(old), rb = solve(m, { x: 16, y: 16 }); for (let i = 0; i < 1024; i++) { if (!ra[i] && walk(old.tiles[i])) unOld++; if (!rb[i] && walk(m.tiles[i])) unNew++; }
  }
  assert.ok(checked > 60, `${checked} exits`); assert.ok(unNew <= unOld + 30, `walkable ground the plaza cannot reach: ${unNew} (version 23 on the same ground: ${unOld})`);
});

test('the real movement rules: a jump climbs each icefall, a ramp walks one, a crevasse is lethal ground the brink stops, creatures still have room', () => {
  const { x, y, m } = sections().find(({ m }) => m.crevasses && m.tiles.some((t) => t.landscape === 'glacier' && t.elev === 3));
  let up = 0, ramps = 0; for (const a of m.tiles) for (const [dx, dy] of N4) { const b = m.tiles[idx(a.x + dx, a.y + dy)]; if (a.x + dx < 0 || a.x + dx > 31 || !walk(a) || !walk(b) || b.landscape !== 'glacier' || (b.elev || 0) !== (a.elev || 0) + 1) continue;
    assert.ok(canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y), `${x},${y}: jump ${a.x},${a.y} -> ${b.x},${b.y}`); assert.equal(canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y), !!(a.slope || b.slope)); up++; if (a.slope || b.slope) ramps++; }
  assert.ok(up > 20 && ramps > 0, `${up} steps up, ${ramps} by ramp`);
  const slot = m.tiles.find((t) => t.crevasse); assert.ok(LETHAL_KINDS.has(slot.kind) && !slot.blocked, 'open lethal ground, as every chasm');
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok(g.map.tiles.some((t) => t.crevasse), 'the game lays the same crevasses');
  assert.ok((g.map.enemySpawns || []).length > 0, 'creatures still place'); for (const e of g.map.enemySpawns) assert.ok(walk(g.map.tiles[idx(Math.round(e.x), Math.round(e.y))]), 'on open ground');
});

test('neighbours agree on their shared edge: the same exit, open and at ground level on both sides; the ice runs on over the border', () => {
  let pair = null; for (let x = 20; x < 400 && !pair; x += 2) for (let y = 20; y < 400 && !pair; y += 3) if (sectionRegion(SEED, x, y, 24).type === 'glacier' && sectionRegion(SEED, x + 1, y, 24).type === 'glacier' && sectionRegion(SEED, x, y, 24).hold >= 1) pair = [x, y];
  assert.ok(pair); const [x, y] = pair, a = make(x, y, 24, { coherence: 1 }), b = make(x + 1, y, 24, { coherence: 1 }); cohereSection(a); cohereSection(b);
  const e = sectionExits(SEED, x, y).east; assert.equal(sectionExits(SEED, x + 1, y).west, e);
  const ta = a.tiles[idx(31, e)], tb = b.tiles[idx(0, e)]; assert.ok(walk(ta) && walk(tb)); assert.deepEqual([ta.elev || 0, tb.elev || 0], [0, 0]);
  assert.ok(joinsCore(a, { x: 31, y: e }) && joinsCore(b, { x: 0, y: e }));
  const f = glacierFlow(SEED, sectionRegion(SEED, x, y, 24).id); let n = 0, near = 0, same = 0;
  for (let yy = 2; yy < 30; yy++) { if (Math.abs(yy - e) <= 2) continue; const p = a.tiles[idx(30, yy)], q = b.tiles[idx(1, yy)]; if (p.landscape !== 'glacier' || q.landscape !== 'glacier' || !walk(p) || !walk(q)) continue; n++; if (Math.abs((p.elev || 0) - (q.elev || 0)) <= 1) near++;
    const fa = glacierAt(SEED, f, x * 32 + 30, y * 32 + yy), fb = glacierAt(SEED, f, (x + 1) * 32 + 1, y * 32 + yy); if (Math.abs(fa.level - fb.level) <= 1) same++; }
  assert.ok(n > 8, `${n}`); assert.equal(near, n, 'no cliff opens at the border'); assert.equal(same, n, 'both sides read the one world field');
});

test('deterministic: two fresh generations and two fresh game loads match; a hamlet keeps the colours but stays flat', () => {
  for (const { x, y, m } of sections().slice(0, 8)) assert.equal(fp(make(x, y)), fp(m), `${x},${y}`);
  const { x, y } = sections()[1], load = () => { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return { g, s }; };
  const one = load(), two = load(); assert.equal(JSON.stringify(one.g.map.tiles), JSON.stringify(two.g.map.tiles)); assert.deepEqual(one.g.map.objects.map((o) => o.id), two.g.map.objects.map((o) => o.id));
  assert.equal(one.s.atlas[`${x},${y}`].landscapeVersion, 25); assert.ok(one.g.map.tiles.some((t) => t.landscape === 'glacier'));
  assert.equal(one.s.schemaVersion ?? 14, 14);
  const h = make(x, y, 24, { hamlet: true }); assert.ok(h.tiles.some((t) => t.landscape === 'glacier')); assert.ok(h.tiles.filter((t) => t.landscape === 'glacier').every((t) => !t.elev && t.kind !== 'serac' && !t.crevasse));
  assert.ok(!h.objects.some((o) => String(o.id).startsWith('glacier-')));
});

test('older ground regenerates byte for byte: sections fingerprinted on main (release 891) before this change', () => {
  for (const [seed, v, x, y, hash] of [
    ['RIME24', 23, 34, 75, 'c4c3463b25216184'], ['RIME24', 22, 34, 75, 'c4c3463b25216184'], ['RIME24', 21, 34, 75, 'c4c3463b25216184'], ['RIME24', 11, 34, 75, 'c4c3463b25216184'],
    ['RIME24', 5, 34, 75, 'c4c3463b25216184'], ['RIME24', 4, 34, 75, 'c4c3463b25216184'], ['RIME24', 2, 34, 75, '3b1cc1767f3d5374'], ['AUDIT-A', 23, 20, 262, '11eeefb906fca874'],
    ['AUDIT-A', 22, 20, 262, 'a7ec6261e7e4344f'], ['AUDIT-A', 21, 20, 262, '216f262c27fe1f80'], ['AUDIT-A', 11, 20, 262, 'b599c8b3cc80d295'], ['AUDIT-A', 5, 20, 262, 'c5bd6c6282b68984'],
    ['AUDIT-A', 4, 20, 262, '849f2d7db62a45f8'], ['AUDIT-A', 2, 20, 262, 'd98a8658913706e8'], ['RIME24', 23, 41, 75, '6f4ba87b53a1ea3f'], ['RIME24', 23, 55, 383, '386b0bf155adc418'],
    ['RIME24', 23, 69, 20, '93b368a2bb84dfa0'], ['RIME24', 23, 76, 262, 'ec95ebeaaf763c6d'], ['RIME24', 23, 83, 218, '70265ab73592b3e0'], ['AUDIT-A', 23, 34, 20, '38a5d0698d459464'],
    ['AUDIT-A', 23, 34, 86, '9bd883ca760f5bd1'], ['AUDIT-A', 23, 48, 273, '11d8aa5b3ed85659'], ['AUDIT-A', 23, 62, 31, '0b6033a217639d77'], ['AUDIT-A', 23, 69, 31, 'ca025130131926bf'],
    ['RIME24', 23, 3, 5, 'b9845998e92ec5d2'], ['RIME24', 23, 20, -30, '58c3c2e70c318e54'], ['RIME24', 23, 1150, 3, 'cc264d4b197f4362'], ['RIME24', 17, 1150, 3, 'c299a7fccea35de4'],
    ['RIME24', 9, 41, 75, 'd3a468bbfda2a903'], ['AUDIT-A', 23, -60, 44, '469f062e325f5f1b'],
  ]) assert.equal(fp(pinned(seed, x, y, v)), hash, `${seed} v${v} ${x},${y}`);
  assert.ok(!pinned('AUDIT-A', 20, 262, 23).tiles.some((t) => t.landscape === 'glacier') && make(20, 262, 24, {}, 'AUDIT-A').tiles.some((t) => t.landscape === 'glacier'), 'the same ground first seen at 24 is glaciated');
});

test('in the game: ground first seen at version 23 keeps its version 23 ground; new ground pins 24', () => {
  const { x, y } = sections()[0], s = freshSave(); s.seed = SEED; s.atlas = { [`${x},${y}`]: { landscapeVersion: 23 } }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 23); assert.ok(!g.map.tiles.some((t) => t.landscape === 'glacier'), 'no ice on version 23 ground');
  const t = freshSave(); t.seed = SEED; const h = new Game(t, 0); h.rx = x; h.ry = y; h.loadArea('overworld'); assert.equal(t.atlas[`${x},${y}`].landscapeVersion, 25); assert.ok(h.map.tiles.some((q) => q.landscape === 'glacier'));
});
