// Release 932 (Tim): standing stones, shrines, Wayglasses and chests are solid like the Watcher's tomb (game.ts PROP_SOLIDS).
// A sweep of generated sections proves no prop closes a pocket off: every tile the Wayfarer could reach before is still reachable,
// but for a solid prop's own tile. Act, the Wayglass and a chest still answer from beside them, and an aimed Rift Step at one lands
// beside it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, mapWidth, PROP_SOLIDS, footprintOpen, footprintHazard, propBlocked, solidProps, WAYGLASS_ZONE } from '../src/game.ts';
import { canStep } from '../src/landscape.ts';
import { learnRank, riftStepTo } from '../src/constellation.ts';

const W = 32, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], WALKER = Object.freeze({});
function at(seed: string, rx: number, ry: number) {
  const s: any = freshSave(); s.seed = seed; s.maxHp = 100; s.perception.aperture = 3255; s.materials.lumenDust = 50; for (let i = 0; i < 5; i++) learnRank(s, 'rift'); s.magicSkills.selected = 'rift-step';
  Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 }); const g: any = new Game(s, 0); g.enemies = []; return g;
}
// Connected parts of the walkable tile grid (standing points at tile corners, as entities stand); with `props`, a standing point
// in a solid prop and a step whose middle is in one are left out.
function parts(map: any, props: boolean, W = 32, H = W) {
  const n = W * H, ok = new Uint8Array(n), label = new Int32Array(n).fill(-1), block = (x: number, y: number) => props && propBlocked(map, W, x, y);
  for (let i = 0; i < n; i++) { const x = i % W, y = (i / W) | 0; ok[i] = footprintOpen(map, W, x, y) && !footprintHazard(map, W, x, y) && !block(x, y) ? 1 : 0; }
  let next = 0;
  for (let i = 0; i < n; i++) { if (!ok[i] || label[i] >= 0) continue; const q = [i]; label[i] = next;
    for (let k = 0; k < q.length; k++) { const a = q[k], ax = a % W, ay = (a / W) | 0;
      for (const [dx, dy] of N4) { const bx = ax + dx, by = ay + dy, b = by * W + bx; if (bx < 0 || by < 0 || bx >= W || by >= H || !ok[b] || label[b] >= 0) continue;
        if (!canStep(WALKER, map, W, ax, ay, bx, by) || !canStep(WALKER, map, W, bx, by, ax, ay) || block(ax + dx / 2, ay + dy / 2)) continue; label[b] = next; q.push(b); } }
    next++; }
  return { ok, label };
}
const SEEDS = ['SOLID-A', 'SOLID-B', 'SOLID-C', 'PLAY-926'], SPOTS = [[0, 1], [1, 0], [-1, 0], [0, -1], [2, 1], [-2, -1], [3, 0], [0, 3], [-3, 2], [4, -1], [5, 5], [-6, 3], [7, -2], [-8, -8], [10, 4], [-12, 6], [14, -3], [16, 16], [-20, 2], [3, -24], [25, 9], [-30, -1], [40, 12], [-42, 0], [60, -7], [-75, 30]];
const sweep: any[] = [];
for (const seed of SEEDS) for (const [rx, ry] of SPOTS) sweep.push([seed, rx, ry]);

test('932: across 104 generated sections no solid prop closes a pocket off, and every one still answers from beside it', () => {
  let sections = 0, solid = 0, kinds: Record<string, number> = {}, listed = 0; const bad: string[] = [];
  for (const [seed, rx, ry] of sweep) {
    const g = at(seed, rx, ry), map = g.map, L = solidProps(map, W); sections++;
    listed += (map.objects || []).filter((o: any) => PROP_SOLIDS.kinds[o.kind]).length;
    const before = parts(map, false), after = parts(map, true), propTiles = new Set<number>();
    for (let i = 0; i < L.length; i += 4) { solid++; const x = Math.floor(L[i]), y = Math.floor(L[i + 1]); propTiles.add(y * W + x);
      const o = map.objects.find((q: any) => Number(q.x) + PROP_SOLIDS.cx === L[i] && Number(q.y) + PROP_SOLIDS.cy === L[i + 1] && PROP_SOLIDS.kinds[q.kind]); kinds[o.kind] = (kinds[o.kind] || 0) + 1;
      // reach: a standing point beside it, reachable, from which Act (1.5, as nearestObject) or the Wayglass zone reaches it
      const reach = o.kind === 'checkpoint' ? WAYGLASS_ZONE.reach : 1.5; let near = false;
      for (let yy = y - 2; yy <= y + 2 && !near; yy++) for (let xx = x - 2; xx <= x + 2; xx++) { const j = yy * W + xx; if (xx >= 0 && yy >= 0 && xx < W && yy < W && after.ok[j] && Math.hypot(Number(o.x) - xx, Number(o.y) - yy) < reach) { near = true; break; } }
      if (!near && before.label[y * W + x] >= 0) bad.push(`${seed} ${rx},${ry} ${o.kind} ${o.id}: nothing beside it reaches it`); }
    // every part reachable before is one part still (but for the props' own tiles)
    const seen = new Map<number, number>();
    for (let i = 0; i < W * W; i++) { const b = before.label[i]; if (b < 0) continue; const a = after.label[i];
      if (a < 0) { if (!propTiles.has(i)) bad.push(`${seed} ${rx},${ry}: tile ${i % W},${(i / W) | 0} lost`); continue; }
      if (!seen.has(b)) seen.set(b, a); else if (seen.get(b) !== a) { bad.push(`${seed} ${rx},${ry}: part ${b} split at ${i % W},${(i / W) | 0}`); break; } }
  }
  console.log(`prop solids sweep: ${sections} sections, ${listed} listed props, ${solid} solid ${JSON.stringify(kinds)}`);
  assert.ok(sections >= 100); assert.ok(solid >= 40, `solid props were met (${solid})`); assert.deepEqual(bad, []);
});

test('932: Act, the Wayglass and a chest still answer from beside a solid prop; walking stops at it', () => {
  // a real shrine or Wayglass that is solid, and a chest set down on open ground in the same section
  let done = false;
  for (const [seed, rx, ry] of sweep) {
    const g = at(seed, rx, ry), L = solidProps(g.map, W); let o: any = null;
    for (let i = 0; i < L.length && !o; i += 4) o = g.map.objects.find((q: any) => ['shrine', 'checkpoint'].includes(q.kind) && Number(q.x) + .5 === L[i] && Number(q.y) + .62 === L[i + 1]);
    if (!o) continue;
    const p = g.player; let t = 1000; p.x = o.x - 1.6; p.y = o.y - .25;
    if (!footprintOpen(g.map, W, p.x, p.y) || propBlocked(g.map, W, p.x, p.y)) { p.x = o.x + 1.6; }
    if (!footprintOpen(g.map, W, p.x, p.y)) continue;
    const dir = Math.sign(o.x - p.x);
    for (let i = 0; i < 60; i++) { t += 1000 / 60; g.update(1 / 60, { state: { x: dir, y: 0 }, consume: () => false, held: () => false }, t); g.enemies = []; }
    assert.equal(propBlocked(g.map, W, p.x, p.y), false, `${o.kind}: walking stops beside it`);
    if (o.kind === 'checkpoint') assert.equal(g.wayglassNear()?.id, o.id, 'the Wayglass answers'); else assert.equal(g.nearestObject()?.id, o.id, 'Act reaches the shrine');
    // a chest beside the way
    const cx = Math.round(p.x) + (dir < 0 ? 2 : -2), cy = Math.round(p.y + .25);
    g.map.objects = [...g.map.objects, { id: 'test-chest', kind: 'chest', name: 'Chest', x: cx, y: cy, state: 'closed', actions: ['open'] }];
    if (!solidProps(g.map, W).some((v: number, i: number) => i % 4 === 0 && v === cx + .5)) continue;
    p.x = cx + (dir < 0 ? -1.2 : 1.2); p.y = cy - .25; if (!footprintOpen(g.map, W, p.x, p.y) || propBlocked(g.map, W, p.x, p.y)) continue;
    assert.equal(g.nearestObject()?.id, 'test-chest', 'the chest is reached from beside it');
    const r = g.interact('open', 'test-chest'); assert.notEqual(g.map.objects.find((q: any) => q.id === 'test-chest').state, 'closed', `opened (${r?.message || g.message})`);
    done = true; break;
  }
  assert.ok(done, 'a solid shrine or Wayglass with room beside it was found');
});

test('932: an aimed Rift Step at a shrine, a Wayglass or a standing stone lands beside it', () => {
  let tried = 0;
  for (const [seed, rx, ry] of sweep) {
    const g = at(seed, rx, ry), L = solidProps(g.map, W);
    for (let i = 0; i < L.length; i += 4) { const o = g.map.objects.find((q: any) => ['shrine', 'checkpoint', 'ruinMarker'].includes(q.kind) && Number(q.x) + .5 === L[i] && Number(q.y) + .62 === L[i + 1]); if (!o) continue;
      const p = g.player; g.lastUpdateNow = 1000 + tried; g.save.magicSkills.riftCharges = 2; g.save.magicSkills.cooldowns['rift-step'] = 0; g.fall = null; g.jumpUntil = 0;
      let start = null; for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) { const x = o.x + dx, y = o.y + dy - .25; if (footprintOpen(g.map, W, x, y) && !footprintHazard(g.map, W, x, y)) { start = { x, y }; break; } }
      if (!start) continue; p.x = start.x; p.y = start.y;
      if (!riftStepTo(g, g.lastUpdateNow, { x: L[i], y: L[i + 1] })) continue; tried++;
      assert.equal(propBlocked(g.map, W, p.x, p.y), false, `${seed} ${rx},${ry} ${o.kind}: not inside it`);
      assert.ok(Math.hypot(p.x + .5 - L[i], p.y + .75 - L[i + 1]) <= 1.6, 'beside it');
    }
    if (tried >= 12) break;
  }
  assert.ok(tried >= 5, `aimed steps taken (${tried})`);
});

test('932: dungeon chests are solid where they close nothing off (the dungeons behind 20 sections)', () => {
  let dungeons = 0, solid = 0; const bad: string[] = [];
  for (const seed of ['SOLID-A', 'SOLID-B']) for (const [rx, ry] of [[2, 1], [-2, -1], [3, 0], [0, 3], [5, 5], [-6, 3], [7, -2], [10, 4], [14, -3], [-20, 2]]) {
    const g = at(seed, rx, ry), door = g.map.objects.find((q: any) => q.kind === 'dungeon' && /^dungeon-g/.test(q.id)); if (!door) continue;
    g.player.x = door.x; g.player.y = door.y - .2; g.interact('enter', door.id); if (g.area !== 'dungeon') continue; dungeons++;
    const w = mapWidth(g.map, g.area), h = Math.floor(g.map.tiles.length / w), L = solidProps(g.map, w), own = new Set<number>(); solid += L.length / 4;
    for (let i = 0; i < L.length; i += 4) own.add(Math.floor(L[i + 1]) * w + Math.floor(L[i]));
    const before = parts(g.map, false, w, h), after = parts(g.map, true, w, h), seen = new Map<number, number>();
    for (let i = 0; i < w * h; i++) { const b = before.label[i]; if (b < 0) continue; const a = after.label[i];
      if (a < 0) { if (!own.has(i)) bad.push(`${seed} ${rx},${ry} dungeon: tile ${i % w},${(i / w) | 0} lost`); continue; }
      if (!seen.has(b)) seen.set(b, a); else if (seen.get(b) !== a) { bad.push(`${seed} ${rx},${ry} dungeon: split at ${i % w},${(i / w) | 0}`); break; } }
  }
  console.log(`prop solids in dungeons: ${dungeons} dungeons, ${solid} solid chests`);
  assert.ok(dungeons >= 5 && solid >= 3); assert.deepEqual(bad, []);
});
