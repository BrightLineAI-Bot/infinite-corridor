// A mix of rooms (Tim, 2026-11-15: "there should be a mix of dark rooms and light rooms... dungeons and rooms that are well lit,
// rooms that are gloomy, dark rooms... The Deep could be darker, fine, we have the Lantern. It just shouldn't be all dark... the
// Lantern can still give a little glow around you if you're outside on a dark night"). INTERIOR_LIGHT version 2: each room of
// an interior takes a tier (lit, gloomy, dark) from a hash of the map and the room, blended across room edges; presentation
// only. The Lantern glows outdoors under a night sky.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CLOSE_VIEW, INTERIOR_LIGHT, closeViewTheme, interiorAmbient, outdoorNight, roomLightAt, roomLightField, roomLightShares, roomTierFor, tierValue } from '../src/close-view.ts';
import { moodFor } from '../src/close-view-outdoor.ts';
import { LANTERN, lanternNightReach } from '../src/spell-slots.ts';
import { drawRoomDim, roomDimAlpha } from '../src/renderer.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

// A floor of n x n rooms, each `size` tiles square inside one-tile walls, joined to its neighbours by one-tile doors.
function roomsMap(n: number, extra: any = {}, size = 5) {
  const W = n * (size + 1) + 1, H = W, tiles: any[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x % (size + 1) === 0, wy = y % (size + 1) === 0, mid = Math.floor(size / 2) + 1;
    const door = (wx && !wy && (y % (size + 1)) === mid && x > 0 && x < W - 1) || (wy && !wx && (x % (size + 1)) === mid && y > 0 && y < H - 1);
    tiles.push((wx || wy) && !door ? { kind: 'wall', blocked: true } : { kind: 'floor', blocked: false });
  }
  return { width: W, height: H, tiles, name: 'Test Floor', ...extra };
}
const keepMap = (n: number, k: number) => { for (let b = 0; b < 400; b++) { const m = roomsMap(n, { id: `test-keep-${k}-${b}`, seed: `S${k}`, building: { style: 'keep', base: `base-${k}-${b}` } }); if (closeViewTheme(m).id === 'keep') return m; } throw new Error('no keep'); };
const deepMap = (n: number, k: number) => roomsMap(n, { id: `test-deep-${k}`, seed: `D${k}`, deepFloor: 1 + k, theme: 'fungal' });
const hash = (o: any) => createHash('sha256').update(JSON.stringify(o)).digest('hex');
const counts = (maps: any[]) => { const c = [0, 0, 0]; for (const m of maps) for (const t of roomLightField(m)!.tier) c[t]++; const n = c[0] + c[1] + c[2]; return c.map((v) => v / n); };

test('INTERIOR_LIGHT version 2: tiers, shares and levels in the one table', () => {
  assert.equal(INTERIOR_LIGHT.version, 2); assert.deepEqual([...INTERIOR_LIGHT.tiers], ['lit', 'gloomy', 'dark']);
  for (const [id, sh] of Object.entries(INTERIOR_LIGHT.shares)) assert.ok(Math.abs((sh as number[]).reduce((a, b) => a + b, 0) - 1) < 1e-9, `${id} shares sum to 1`);
  assert.deepEqual([...INTERIOR_LIGHT.shares.default], [.3, .45, .25]);
  const K = INTERIOR_LIGHT.keep.interior; assert.ok(K[0] < K[1] && K[1] < K[2], 'lit < gloomy < dark'); assert.equal(K[1], .6, 'gloomy is release 976\'s light');
  assert.ok(K[2] >= .9, 'dark is close to the old dark');
  const D = INTERIOR_LIGHT.keep.deep; for (let i = 0; i < 3; i++) assert.ok(D[i] > K[i], 'the Deep is darker at every tier');
  assert.equal(tierValue(K, 0), K[0]); assert.equal(tierValue(K, 2), K[2]); assert.ok(Math.abs(tierValue(K, .5) - (K[0] + K[1]) / 2) < 1e-12);
  assert.equal(roomTierFor(0, [.3, .45, .25]), 0); assert.equal(roomTierFor(.5, [.3, .45, .25]), 1); assert.equal(roomTierFor(.9, [.3, .45, .25]), 2);
  assert.equal(roomLightShares('nothing', 'deep'), INTERIOR_LIGHT.shares.deep); assert.equal(roomLightShares('livedIn', 'interior'), INTERIOR_LIGHT.shares.livedIn);
});

test('rooms are read from the floor and their tiers are deterministic and stable per map', () => {
  const a = keepMap(6, 1), b = keepMap(6, 1), F = roomLightField(a)!, G = roomLightField(b)!;
  assert.equal(F.rooms, 36, 'one room behind each door'); assert.deepEqual([...F.tier], [...G.tier], 'the same map, the same tiers');
  assert.equal(roomLightField(a), F, 'built once and cached');
  const C = roomLightField(keepMap(6, 2))!; assert.notDeepEqual([...C.tier], [...F.tier], 'another map, another mix');
  // a room's tiles share one room; a wall takes none
  const W = F.W; assert.equal(F.room[0], -1); assert.equal(F.room[1 * W + 1], F.room[5 * W + 5]); assert.notEqual(F.room[3 * W + 3], F.room[3 * W + 9]);
  // a big open floor is cut into sections; a maze of narrow passages still gets rooms
  const cave = roomsMap(1, { id: 'cave', seed: 'C', deepFloor: 1, theme: 'fungal' }, 40); assert.ok(roomLightField(cave)!.rooms >= 9, 'a cave in sections');
  const maze = roomsMap(8, { id: 'maze', seed: 'M', building: { style: 'keep', base: 'm' } }, 1); assert.ok(roomLightField(maze)!.rooms >= 1);
  assert.equal(roomLightField({ width: 0, tiles: [] }), null); assert.equal(roomLightAt({}, 3, 3), 1, 'no field: gloomy (release 976)');
});

test('the mix is roughly 30% lit, 45% gloomy, 25% dark; the Deep is mostly dark, almost never lit', () => {
  const keep = counts(Array.from({ length: 40 }, (_, k) => keepMap(6, 100 + k)));
  const S = INTERIOR_LIGHT.shares.default; for (let i = 0; i < 3; i++) assert.ok(Math.abs(keep[i] - S[i]) < .05, `keep tier ${i}: ${keep[i].toFixed(3)}`);
  const deep = counts(Array.from({ length: 40 }, (_, k) => deepMap(6, k)));
  assert.ok(deep[2] >= .62 && deep[0] <= .08, `the Deep: ${deep.map((v) => v.toFixed(3))}`); assert.ok(deep[1] > deep[0], 'a few gloomy, fewer lit');
  // every interior theme with shares has all three tiers somewhere (no theme is all dark)
  for (const [id, sh] of Object.entries(INTERIOR_LIGHT.shares)) assert.ok((sh as number[]).every((v) => v > 0), `${id}: a mix`);
});

test('the light blends continuously from room to room (no pops)', () => {
  const F0 = keepMap(6, 7), F = roomLightField(F0)!, W = F.W;
  // walk along row y = 3.5 (through the doors between rooms on that row) across the whole floor
  let prev = roomLightAt(F0, 1, 3.5), maxStep = 0;
  for (let x = 1; x <= W - 1; x += .02) { const v = roomLightAt(F0, x, 3.5); maxStep = Math.max(maxStep, Math.abs(v - prev)); prev = v; assert.ok(v >= 0 && v <= 2); }
  assert.ok(maxStep < .05, `largest step a 0.02-tile pace: ${maxStep}`);
  // the light in a room's heart is the room's own tier
  for (let r = 0; r < 6; r++) { const cx = r * 6 + 3.5, t = F.tier[F.room[3 * W + r * 6 + 3]]; assert.ok(Math.abs(roomLightAt(F0, cx, 4) - t) < .35, `room ${r}`); }
  // and so the ambient: lit brighter than gloomy brighter than dark, continuous in between
  const a = (s: number) => interiorAmbient(CLOSE_VIEW.light.ambient, 'interior', 1, s);
  assert.ok(a(0) > a(1) && a(1) > a(2)); assert.ok(Math.abs(a(1) - .52) < 1e-9, 'gloomy: release 976\'s .52'); assert.ok(Math.abs(a(1.001) - a(1)) < .001);
});

test('presentation only: building the field changes no map, no save and no generation', () => {
  const m = keepMap(5, 3), before = hash(m); roomLightField(m); roomLightAt(m, 4, 4); assert.equal(hash(m), before);
  const one = createLabFixture({ lab: 'close-view', scenario: 'keep', now: 100000 }) as any, two = createLabFixture({ lab: 'close-view', scenario: 'keep', now: 100000 }) as any;
  const tilesBefore = hash(one.game.map.tiles), saveBefore = hash(one.game.save);
  const F = roomLightField(one.game.map)!; assert.ok(F.rooms > 3, 'the lab keep has rooms');
  assert.equal(hash(one.game.map.tiles), tilesBefore); assert.equal(hash(one.game.save), saveBefore);
  assert.equal(hash(two.game.map.tiles), tilesBefore, 'generation is unchanged');
  assert.deepEqual([...roomLightField(two.game.map)!.tier], [...F.tier], 'the same keep, the same mix');
  assert.ok(!JSON.stringify(one.game.save).includes('roomLight'), 'no save field');
});

test('Close View reads the room underfoot each frame without allocation; the fog follows the tier', () => {
  const cv = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(cv, /const roomS = lightKind \? roomLightAt\(g\.map, footX\(p\), footY\(p\)\) : 1; ROOM_FRAME\.kind = lightKind; ROOM_FRAME\.s = roomS;/);
  assert.match(cv, /tierValue\(INTERIOR_LIGHT\.fogNear\[lightKind\], roomS\)/);
  assert.match(cv, /F\.amb\[0\] = tg\.amb\[0\] \* k; F\.amb\[1\] = tg\.amb\[1\] \* k; F\.amb\[2\] = tg\.amb\[2\] \* k;/, 'the GPU ambient is written in place');
  assert.match(cv, /Math\.round\(interiorAmbient\(Lt\.ambient, lightKind, 1, roomS\) \* ROOM_FRAME\.steps\) \/ ROOM_FRAME\.steps/, 'the 2D fallback steps its ambient (its gradient rebuilt only on a step)');
  for (const t of Object.values(CLOSE_VIEW.themes) as any[]) if (t?.fog) assert.ok(t.fog.near + Math.max(...INTERIOR_LIGHT.fogNear.interior) < t.fog.far - 1);
});

test('Standard View: a dark room alone takes a faint dim, painted once a map', () => {
  assert.equal(roomDimAlpha(0), 0); assert.equal(roomDimAlpha(1), 0, 'gloomy: none'); assert.equal(roomDimAlpha(2), INTERIOR_LIGHT.dim.alpha); assert.ok(INTERIOR_LIGHT.dim.alpha <= .35, 'faint');
  const prev = (globalThis as any).OffscreenCanvas; let fills = 0, draws = 0;
  (globalThis as any).OffscreenCanvas = class { width = 1; height = 1; getContext() { return { clearRect() {}, fillRect() { fills++; }, set fillStyle(_v: any) {} }; } };
  try {
    const map = keepMap(6, 9), F = roomLightField(map)!, dark = Array.from(F.s).filter((v) => roomDimAlpha(v) > 0).length;
    const ctx: any = { drawImage() { draws++; }, save() {}, restore() {}, imageSmoothingEnabled: true };
    assert.equal(drawRoomDim(ctx, { map, area: 'dungeon' }, 32, 'full'), true); assert.equal(fills, dark, 'only the dark tiles are painted');
    assert.equal(drawRoomDim(ctx, { map, area: 'dungeon' }, 32, 'full'), true); assert.equal(fills, dark, 'not again'); assert.equal(draws, 2, 'one copy a frame');
    assert.equal(drawRoomDim(ctx, { map: { ...map, chasm: true }, area: 'dungeon' }, 32, 'full'), false, 'a chasm keeps its own dark');
  } finally { if (prev === undefined) delete (globalThis as any).OffscreenCanvas; else (globalThis as any).OffscreenCanvas = prev; }
  const rd = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(rd, /if \(g\.area === "dungeon" && !closeViewCapturing\(\)\) drawRoomDim\(ctx, g, s, budget\.quality\);/, 'never baked into Close View\'s ground');
});

test('the Lantern glows outdoors under a night sky, not by day', () => {
  let night = null, day = null; for (let i = 0; i < 400 && (!night || !day); i++) { const s = `L${i}`, m = moodFor(s, 2, 3, undefined); if (m === 'night' && !night) night = s; if (m === 'day' && !day) day = s; }
  const at = (seed: any, area = 'overworld') => ({ area, map: { seed, rx: 2, ry: 3, tiles: [] } });
  assert.equal(outdoorNight(at(night)), true); assert.equal(outdoorNight(at(day)), false); assert.equal(outdoorNight(at(night, 'dungeon')), false, 'indoors is the rooms\' light');
  const lit = { lantern: { lit: true } }, shut = { lantern: { lit: false } };
  assert.equal(lanternNightReach(lit, true), LANTERN.night.reach); assert.ok(LANTERN.night.reach > 1 && LANTERN.night.reach <= LANTERN.closeReach, 'modest');
  assert.equal(lanternNightReach(lit, false), 1, 'by day nothing changes'); assert.equal(lanternNightReach(shut, true), 1);
  assert.ok(LANTERN.night.glow > 0 && LANTERN.night.glow <= LANTERN.glow * 1.2, 'a soft glow');
  const rd = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), cv = readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(rd, /else if \(!closeViewCapturing\(\) && outdoorNight\(g\) && lanternIsLit\(g\.save\)\) drawLanternGlow\(ctx, \(p\.x \+ \.5\) \* s, \(p\.y \+ \.55 - viewLift\) \* s, s, LANTERN\.night\.glow\)/);
  assert.match(cv, /lanternReach\(g\.save, g\.area\) \* lanternNightReach\(g\.save, outdoorNight\(g\)\)/);
});
