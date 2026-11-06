// Fog of war in labyrinths (Tim, 2026-11-06: "if there were fog that would be better, so I'd be able to kind of explore and
// figure out where I need to go"). Play only: sight round the Wayfarer, stopped by walls; seen tiles remembered (dimmed) per
// chamber, through save and reload; creatures only in sight; chambers laid exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { render, rendererDiagnostics, seenInDungeon, shownInDungeon } from '../src/renderer.ts';
import { LAB_FOG, HOLE_DROPS, labyrinthPlan, generateLabyrinthChamber, holeDrops, labFogOn, labFogOf, labFogLook, labFogState, labFogAt, labFogTile, encodeLabFog, decodeLabFog, ensureLabFog } from '../src/labyrinths.ts';

const BASE = 'labyrinth:LB5:5:5:keep', N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const inLab = (node, seed = 'LB5', base = BASE) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); s.session.activeDungeonId = `${base}:f${node + 1}`; s.session.dungeonReturn = { rx: 5, ry: 5, x: 16, y: 16 }; g.loadArea('dungeon', false); return g; };
const nodeOf = (kind, base = BASE) => labyrinthPlan(base).nodes.find((q) => q.kind === kind);
// A synthetic chamber (a labyrinth id, so the fog is on): open floor split by a wall at x = 10 with no gap.
const room = (W = 21, H = 11) => ({ id: 'labyrinth:T:0:0:keep:f1', width: W, height: H, building: { labyrinth: true }, objects: [], enemySpawns: [],
  tiles: Array.from({ length: W * H }, (_, i) => { const x = i % W, y = (i / W) | 0, wall = x === 0 || y === 0 || x === W - 1 || y === H - 1 || x === 10; return { x, y, kind: wall ? 'wall' : 'floor', blocked: wall }; }) });
// Base movement: walk, and jump a one-tile hole (as the generator assumes in galleries).
const reach = (m, from) => { const W = m.width, H = m.height, ok = (x, y) => { const t = x >= 0 && y >= 0 && x < W && y < H ? m.tiles[y * W + x] : null; return !!t && !t.blocked && !t.hole; }, seen = new Set([from.y * W + from.x]), st = [from];
  while (st.length) { const p = st.pop(); for (const [dx, dy] of N4) { let x = p.x + dx, y = p.y + dy; const t = m.tiles[y * W + x]; if (!t || t.blocked) continue; if (t.hole) { x += dx; y += dy; if (!ok(x, y)) continue; } const k = y * W + x; if (!seen.has(k)) { seen.add(k); st.push({ x, y }); } } }
  return seen; };

test('sight: tiles within the radius are seen, walls stop it, a wall beside floor in sight is seen; out of sight a tile stays seen (dimmed)', () => {
  const m = room(), W = m.width; assert.ok(labFogOn(m));
  const F = labFogLook(m, 4, 5); assert.equal(F.looks, 1);
  assert.equal(labFogState(m, 4, 5), 2, 'the Wayfarer\'s own tile'); assert.equal(labFogState(m, 9, 5), 2, 'open floor in reach');
  assert.equal(labFogState(m, 10, 5), 2, 'the wall itself'); for (let y = 1; y < 10; y++) assert.equal(labFogState(m, 11, y), 0, 'nothing behind the wall');
  assert.equal(labFogState(m, 0, 0), 2, 'a corner wall beside floor in sight');
  const far = room(41, 11); for (let i = 0; i < far.tiles.length; i++) { const t = far.tiles[i]; if (t.x === 10) { t.blocked = false; t.kind = 'floor'; } }
  labFogLook(far, 2, 5); assert.equal(labFogState(far, 2 + LAB_FOG.radius, 5), 2); assert.equal(labFogState(far, 3 + LAB_FOG.radius, 5), 0, 'not past the radius');
  // diagonal pinch: two blocked tiles touching at a corner stop sight through it
  const pinch = room(); for (const [x, y] of [[5, 4], [4, 5]]) Object.assign(pinch.tiles[y * W + x], { blocked: true, kind: 'wall' });
  for (const [x, y] of [[5, 5], [5, 6], [6, 5], [6, 6], [4, 4]]) Object.assign(pinch.tiles[y * W + x], { blocked: true, kind: 'wall' }); // a pocket open only at its corners
  labFogLook(pinch, 3, 3); assert.equal(labFogState(pinch, 7, 7), 0, 'not through a diagonal pinch');
  // same tile: nothing worked out again; a new tile: worked out again, the old ground remembered
  labFogLook(m, 4, 5); assert.equal(F.looks, 1); const stamp = F.stamp;
  labFogLook(m, 1, 1); assert.equal(F.looks, 2); assert.ok(F.stamp > stamp);
  assert.equal(labFogState(m, 9, 9), 1, 'seen before, out of sight now'); assert.equal(labFogState(m, 1, 2), 2);
  assert.ok(F.dirty); assert.equal(labFogState({ ...m, id: 'pentagon:T:0:0:f1' }, 15, 5), 2, 'no fog off a labyrinth');
});

test('in every chamber of 40 labyrinths (every style, both interior versions) walking every tile reachable with base movement sees every passage, key, cache and creature, and the sight never passes the radius or a wall run', () => {
  let chambers = 0, looks = 0, ms = 0, maxSight = 0; const bad = [];
  for (let i = 0; i < 40; i++) for (const V of [1, 2]) { const style = ['keep', 'apartment', 'hive', 'shell'][i % 4], seed = style === 'shell' ? `LF${i}~shell1` : `LF${i}`, base = `labyrinth:${seed}:${i}:${-i - 7}:${style}`, P = labyrinthPlan(base);
    for (const q of P.nodes) { const m = generateLabyrinthChamber(`LF${i}`, `${base}:f${q.n + 1}`, V), W = m.width, walk = reach(m, m.entry); chambers++;
      const F = labFogLook(m, m.entry.x, m.entry.y); assert.equal(labFogState(m, m.entry.x, m.entry.y), 2);
      for (const [dx, dy] of N4) { const t = m.tiles[(m.entry.y + dy) * W + m.entry.x + dx]; if (t) assert.equal(labFogAt(F, t.x, t.y), 2, 'a tile beside you is always in sight'); }
      const t0 = performance.now();
      for (const k of walk) { const x = k % W, y = (k / W) | 0; labFogLook(m, x, y); looks++; let n = 0;
        for (let j = 0; j < F.sight.length; j++) if (F.sight[j]) { n++; const d = Math.hypot((j % W) - x, ((j / W) | 0) - y); if (d > LAB_FOG.radius + 1.5) bad.push(`${m.id}: in sight ${d.toFixed(1)} away`); }
        maxSight = Math.max(maxSight, n); }
      ms += performance.now() - t0;
      for (const o of [...m.objects, ...m.enemySpawns]) if (!labFogState(m, o.x, o.y)) bad.push(`${m.id}: ${o.kind} at ${o.x},${o.y} never seen`); } }
  assert.deepEqual(bad.slice(0, 5), []);
  assert.ok(chambers > 1000, `${chambers} chambers`); assert.ok(maxSight <= Math.PI * (LAB_FOG.radius + 1.5) ** 2, `at most ${maxSight} tiles in sight`);
  console.log(`# fog: ${chambers} chambers, ${looks} looks, ${(ms / looks * 1000).toFixed(1)} µs a look, at most ${maxSight} tiles in sight`);
});

test('what was seen is kept per chamber on its history, through save, reload and exact resume; a bad record is dropped on load, a good one kept', () => {
  const q = nodeOf('hall'), g = inLab(q.n), id = g.areaId(), W = g.map.width; g.labFogTick();
  const h = dungeonHistory(g.save, id); assert.match(h.labFog, /^27x19:[A-Za-z0-9_-]{86}$/); assert.ok(h.labFog.length <= 94, `${h.labFog.length} characters`);
  const open = [...reach(g.map, g.map.entry)]; for (const k of open.slice(0, 40)) { g.player.x = k % W; g.player.y = ((k / W) | 0) - .25; g.labFogTick(); }
  const seen = Array.from(labFogOf(g.map).seen), stored = dungeonHistory(g.save, id).labFog;
  assert.deepEqual(Array.from(decodeLabFog(stored, 27, 19)), seen, 'stored as seen');
  assert.equal(encodeLabFog(decodeLabFog(stored, 27, 19), 27, 19), stored, 'the record round-trips');
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(200))), 900); assert.equal(r.areaId(), id);
  const RF = labFogOf(r.map); for (let k = 0; k < seen.length; k++) if (seen[k]) assert.equal(RF.seen[k], 1, `tile ${k} still seen after the reload`);
  // another chamber of the same labyrinth keeps its own record
  const other = labyrinthPlan(BASE).nodes.find((n) => n.n !== q.n && n.kind !== 'gaps'), g2 = inLab(other.n); g2.save.consequences = g.save.consequences; g2.loadArea('dungeon', false); g2.labFogTick();
  assert.notEqual(dungeonHistory(g2.save, g2.areaId()).labFog, stored); assert.equal(dungeonHistory(g2.save, id).labFog, stored);
  // saves: additive, normalised, unknown fields kept
  assert.equal(Object.values(freshSave().consequences.dungeons).some((v) => 'labFog' in v), false);
  const raw = JSON.parse(JSON.stringify(g.save)); raw.consequences.dungeons['labyrinth:X:1:1:keep:f2'] = { visits: 1, labFog: 42, mine: 'kept' }; raw.consequences.dungeons['labyrinth:X:1:1:keep:f3'] = { visits: 1, labFog: '27x19:' + 'A'.repeat(600) };
  const m = migrateSave(raw); assert.equal(m.version, 14); assert.equal(m.consequences.dungeons[id].labFog, stored, 'a good record kept');
  assert.ok(!('labFog' in m.consequences.dungeons['labyrinth:X:1:1:keep:f2'])); assert.equal(m.consequences.dungeons['labyrinth:X:1:1:keep:f2'].mine, 'kept');
  assert.ok(!('labFog' in m.consequences.dungeons['labyrinth:X:1:1:keep:f3']), 'an over-long record dropped');
  assert.deepEqual(Array.from(decodeLabFog('19x27:////', 27, 19)), new Array(27 * 19).fill(0), 'a record for another size adds nothing');
  assert.equal(ensureLabFog({}).consequences, undefined);
});

test('hidden: creatures only in sight, objects on seen tiles; a safe drop\'s green rim only in sight', () => {
  const g = inLab(nodeOf('hall').n); g.labFogTick(); const F = labFogOf(g.map), W = g.map.width;
  let unseen = -1, remembered = -1; for (let k = 0; k < F.seen.length; k++) if (!F.seen[k] && !g.map.tiles[k].blocked) { unseen = k; break; }
  assert.ok(unseen >= 0); const e = { id: 'probe', kind: 'skeleton', x: unseen % W, y: (unseen / W) | 0, hp: 10, maxHp: 10 }, o = { id: 'o', kind: 'chest', x: e.x, y: e.y };
  assert.equal(shownInDungeon(g, e), false); assert.equal(seenInDungeon(g, o), false, 'an object on a tile never seen');
  const here = labFogTile(g.player); e.x = here.x; e.y = here.y; assert.equal(shownInDungeon(g, e), true, 'in sight');
  // walk away: what stood here is remembered, the creature is not shown, the object is
  const open = [...reach(g.map, g.map.entry)].sort((a, b) => Math.hypot(b % W - here.x, ((b / W) | 0) - here.y) - Math.hypot(a % W - here.x, ((a / W) | 0) - here.y));
  for (const k of open) { labFogLook(g.map, k % W, (k / W) | 0); if (labFogState(g.map, here.x, here.y) === 1) { remembered = k; break; } }
  assert.ok(remembered >= 0, 'somewhere out of sight of the way in'); o.x = here.x; o.y = here.y;
  assert.equal(shownInDungeon(g, e), false, 'a creature out of sight is hidden'); assert.equal(seenInDungeon(g, o), true, 'an object on a remembered tile shows');
  // the green rim
  const gq = labyrinthPlan(BASE).nodes.find((q) => q.kind === 'gaps' && holeDrops(generateLabyrinthChamber('LB5', `${BASE}:f${q.n + 1}`))?.some((v) => v === 1));
  if (!gq) return; const h = inLab(gq.n), M = h.map, mask = holeDrops(M); let stand = null;
  const walk = reach(M, M.entry); for (let k = 0; k < mask.length && !stand; k++) if (mask[k]) for (const j of walk) { const x = j % M.width, y = (j / M.width) | 0; if (Math.hypot(x - (k % M.width), y - ((k / M.width) | 0)) <= 2) { stand = { x, y }; break; } }
  assert.ok(stand, 'a floor tile beside a safe drop');
  h.player.x = stand.x; h.player.y = stand.y - .25; h.enemies = [];
  const rims = () => { const styles = []; const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), stroke() { styles.push(String(ctx.strokeStyle)); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
    render(ctx, h, 360, 640, 5000); return styles.filter((s) => s.startsWith(`rgba(${HOLE_DROPS.rim.rgb}`)).length; };
  assert.ok(rims() > 0, 'a safe drop in sight shows its rim'); labFogOf(M).sight.fill(0); assert.equal(rims(), 0, 'out of sight: no rim');
});

test('chambers are laid exactly as before the fog (1,630 chambers, byte for byte), and walking one with the fog changes none of its tiles', () => {
  const hash = createHash('sha256'); let n = 0;
  for (let i = 0; i < 48; i++) for (const V of [1, 2]) { const style = ['keep', 'apartment', 'hive', 'shell'][i % 4], seed = style === 'shell' ? `FG${i}~shell1` : `FG${i}`, base = `labyrinth:${seed}:${i - 20}:${30 - i}:${style}`, P = labyrinthPlan(base);
    for (const q of P.nodes) { const m = generateLabyrinthChamber(`FG${i}`, `${base}:f${q.n + 1}`, V); hash.update(JSON.stringify([m.id, m.width, m.height, m.tiles, m.objects, m.enemySpawns, m.entry, m.building, m.name, m.dress || null])); n++; } }
  assert.equal(n, 1630); assert.equal(hash.digest('hex'), 'eb7e28a356a1f8db2fe902e9fef7c65eade3c1c19c0ee05c5b87027219218f74', 'the digest release 782 produced');
  const g = inLab((labyrinthPlan(BASE).nodes.find((q) => q.kind === 'cellar' || q.kind === 'court') || { n: 0 }).n), before = JSON.stringify(g.map.tiles), W = g.map.width;
  for (const k of reach(g.map, g.map.entry)) { g.player.x = k % W; g.player.y = ((k / W) | 0) - .25; g.labFogTick(); }
  assert.equal(JSON.stringify(g.map.tiles), before);
});

// A dependency-free recording canvas (as tests/void-walker-fog-render.test.ts), so the offscreen fog image path runs.
class RecCanvas { width; height; calls = []; constructor(w, h) { this.width = w; this.height = h; } getContext() { return recContext(this); } }
function recContext(canvas) {
  if (canvas.ctx) return canvas.ctx; const calls = canvas.calls, state = {};
  const base = { canvas, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), measureText: (t) => ({ width: String(t).length * 7 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    clearRect(...a) { if (a[0] === 0 && a[1] === 0 && a[2] >= canvas.width && a[3] >= canvas.height) calls.length = 0; calls.push(['clearRect', ...a]); }, drawImage(src, ...a) { calls.push(['drawImage', src, ...a]); }, fillRect(...a) { calls.push(['fillRect', state.fillStyle, ...a]); } };
  return canvas.ctx = new Proxy(base, { get: (o, k) => k in o ? o[k] : k in state ? state[k] : () => calls.push([k]), set: (o, k, v) => { state[k] = v; return true; } });
}
test('draw cost: the fog is one copy of a one-pixel-a-tile image a frame, redrawn only when the Wayfarer reaches a new tile; without an offscreen canvas, at most one fill per run of a row on screen', () => {
  const g = inLab(nodeOf('hall').n); g.enemies = []; const prior = globalThis.OffscreenCanvas; globalThis.OffscreenCanvas = RecCanvas;
  try {
    const screen = new RecCanvas(360, 640), ctx = screen.getContext(), F = labFogOf(g.map), d0 = rendererDiagnostics();
    for (let f = 0; f < 60; f++) { screen.calls.length = 0; render(ctx, g, 360, 640, 1000 + f * 16);
      const fog = screen.calls.filter((c) => c[0] === 'drawImage' && c[2] === 0 && c[3] === 0 && c[4] === F.W && c[5] === F.H); assert.equal(fog.length, 1, 'one copy of the fog a frame');
      assert.equal(fog[0][1].width, F.W); assert.equal(fog[0][1].height, F.H); }
    let d1 = rendererDiagnostics(); assert.equal(d1.labFogDraws - (d0.labFogDraws || 0), 60); assert.ok(d1.labFogBuilds - (d0.labFogBuilds || 0) <= 1, 'standing still: built once');
    // walk ten tiles: at most one rebuild for each
    const W = g.map.width, path = [...reach(g.map, g.map.entry)].slice(0, 10), b0 = d1.labFogBuilds;
    for (const k of path) for (let f = 0; f < 5; f++) { g.player.x = k % W; g.player.y = ((k / W) | 0) - .25; render(ctx, g, 360, 640, 2000 + f); }
    d1 = rendererDiagnostics(); assert.ok(d1.labFogBuilds - b0 <= path.length, `${d1.labFogBuilds - b0} rebuilds for ${path.length} tiles`);
    const fills = screen.calls.filter((c) => c[0] === 'drawImage' && c[4] === F.W)[0][1].calls.filter((c) => c[0] === 'fillRect');
    assert.ok(fills.length > 0 && fills.length <= F.W * F.H, `${fills.length} runs in the image`);
    assert.ok(fills.every((c) => c[1] === `rgba(${LAB_FOG.rgb},${LAB_FOG.dark})` || c[1] === `rgba(${LAB_FOG.rgb},${LAB_FOG.dim})`));
  } finally { if (prior === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = prior; }
  // no offscreen canvas: fills straight onto the view, bounded by the runs on screen
  const ctx2 = new Proxy({ drawImage: undefined, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }) }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  render(ctx2, g, 360, 640, 5000); const runs = rendererDiagnostics().labFogRuns; assert.ok(runs > 0 && runs <= g.map.width * g.map.height, `${runs} fills`); console.log(`# fog draw: ${runs} fills a frame without an offscreen canvas`);
});
