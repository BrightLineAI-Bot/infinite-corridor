// Great buildings (Tim, 2026-11-03): real buildings, shut and opaque outside, drawn like the shacks; inside, floors that are
// areas of their own, rooms with their own floors (mosaic, carpet, planks...), a way up to find, holes that drop you a floor,
// sometimes a broken back; the guardian and the cache on top. They take the keeps' and arcologies' place on new ground.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { BUILDINGS, buildingHere, buildingPlan, generateBuildingFloor, parseBuildingId, FLOOR_KINDS } from '../src/great-buildings.ts';
import { KEEPS, keepHere } from '../src/keeps.ts';

const SEED = 'GREAT1';
const visit = (rx, ry, save = null) => { const s = save || freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const found = {};
const find = (style) => { if (found[style]) return found[style]; for (let d = BUILDINGS.minRing; d < 40 && !found[style]; d++) for (let x = -d; x <= d && !found[style]; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { const p = buildingHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION)); if (!p || p.style !== style) continue; const g = visit(x, y); if (g.map.greatBuilding) { found[style] = { x, y }; break; } } return found[style]; };
const enter = (style) => { const at = find(style), g = visit(at.x, at.y), o = g.map.objects.find((q) => q.buildingDoor && !q.breachDoor); g.player.x = o.x; g.player.y = o.y; const r = g.interact('enter', o.id); assert.ok(r.ok, r.message); return { g, o }; };
const walk = (map, from, holesBlock = true) => { const W = map.width, seen = new Set([from.y * W + from.x]), q = [from];
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = y * W + x, t = map.tiles[k]; if (!t || seen.has(k) || t.blocked || (holesBlock && t.hole)) continue; seen.add(k); q.push({ x, y }); } }
  return seen; };

test('rolled past the heartland, apartments in the machine-touched lands, and most rolls find room', () => {
  let rolled = 0, near = 0; for (let x = -30; x <= 30; x++) for (let y = -30; y <= 30; y++) { const r = sectionRegion(SEED, x, y, LANDSCAPE_VERSION), p = buildingHere(SEED, x, y, r); if (!p) continue; rolled++;
    assert.ok(Math.abs(x) + Math.abs(y) >= BUILDINGS.minRing); if (BUILDINGS.machine.includes(r.type)) assert.equal(p.style, 'apartment');
    const S = BUILDINGS.styles[p.style]; assert.ok(p.floors >= S.floors[0] && p.floors <= S.floors[1]); }
  assert.ok(rolled > 200 && rolled < 500, `${rolled} of 3721`);
  let tried = 0, built = 0; for (let x = 4; x < 16; x++) for (let y = -8; y < 8; y++) if (buildingHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) { tried++; if (visit(x, y).map.greatBuilding) built++; }
  assert.ok(tried > 4 && built / tried >= .35, `${built} of ${tried} built`);
  assert.ok(find('keep') && find('apartment'));
});

test('outside: a closed block with one door facing the way in; the section stays passable; the same each visit', () => {
  for (const style of ['keep', 'apartment']) { const at = find(style), g = visit(at.x, at.y), B = g.map.objects.find((o) => o.kind === 'greatBuilding'), b = B.bounds;
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) assert.ok(g.map.tiles[y * 32 + x].blocked, 'opaque and solid: no walking in from the side');
    const door = g.map.objects.find((o) => o.buildingDoor && !o.breachDoor); assert.ok(door && door.kind === 'dungeon'); assert.ok(!g.map.tiles[door.y * 32 + door.x].blocked);
    assert.match(door.dungeonId, new RegExp(`^building:${SEED}:${at.x}:${at.y}:${style}:\\d:f1$`));
    assert.ok(!g.map.enemySpawns.some((e) => e.x >= b.x && e.x < b.x + b.w && e.y >= b.y && e.y < b.y + b.h), 'nothing spawns inside the walls');
    const again = visit(at.x, at.y); assert.deepEqual(again.map.objects.find((o) => o.kind === 'greatBuilding').bounds, b); }
});

test('only on new ground: a section first seen before keeps its keep and gets no great building', () => {
  let k = null; for (let x = 5; x < 80 && !k; x++) for (let y = -30; y < 30 && !k; y++) if (keepHere(SEED, x, y)) { const s = freshSave(); (s.atlas ||= {})[`${x},${y}`] = { keepVersion: KEEPS.version, landscapeVersion: LANDSCAPE_VERSION }; const g = visit(x, y, s); if (g.map.keep) k = g; }
  assert.ok(k, 'an old keep still stands'); assert.ok(!k.map.greatBuilding);
  const at = find('keep'), s = freshSave(); (s.atlas ||= {})[`${at.x},${at.y}`] = { landscapeVersion: LANDSCAPE_VERSION }; assert.ok(!visit(at.x, at.y, s).map.greatBuilding, 'explored before: no building appears');
  const g = visit(at.x, at.y); assert.equal(g.save.atlas[`${at.x},${at.y}`].buildingVersion, BUILDINGS.version); assert.ok(!g.save.atlas[`${at.x},${at.y}`].keepVersion);
});

test('inside: rooms walled apart with doorways, every room its own floor, all of the floor reachable from the way in', () => {
  for (const style of ['keep', 'apartment']) { const { g } = enter(style), m = g.map, S = BUILDINGS.styles[style];
    assert.equal(g.area, 'dungeon'); assert.equal(m.building.floor, 1); assert.ok(m.name.startsWith(S.name));
    const kinds = new Set(m.tiles.filter((t) => !t.blocked && !t.doorway).map((t) => t.kind)); assert.ok(kinds.size >= 2, `${[...kinds]}`); assert.ok([...kinds].every((k) => FLOOR_KINDS.includes(k)));
    assert.ok(kinds.has(S.hall), 'the hall'); assert.ok(m.tiles.filter((t) => t.kind === S.wall).length > m.width * 2 + m.height * 2, 'inner walls');
    const seen = walk(m, m.entry); assert.ok(m.tiles.every((t, k) => t.blocked || seen.has(k)), 'every open cell reachable');
    assert.ok(m.objects.some((o) => o.kind === 'exit'), 'the door out'); assert.ok(m.objects.some((o) => o.kind === 'buildingStair' && o.dir === 'up'), 'a stair up');
    assert.ok(!m.objects.some((o) => o.kind === 'buildingStair' && o.dir === 'down'), 'nothing below the ground floor'); assert.ok(m.tiles.every((t) => !t.hole), 'no holes on the ground floor'); }
});

test('the stairs: up to the next floor and back, each floor an area of its own; the top holds the guardian and the cache', () => {
  const { g } = enter('apartment'), base = parseBuildingId(g.areaId()).base, floors = parseBuildingId(g.areaId()).floors;
  for (let f = 1; f < floors; f++) { const st = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'), seen = walk(g.map, g.map.entry.x != null && f === 1 ? g.map.entry : { x: Math.round(g.player.x), y: Math.round(g.player.y) });
    assert.ok(seen.has(st.y * g.map.width + st.x), `floor ${f}: the stair up is reachable without stepping in a hole`);
    g.player.x = st.x; g.player.y = st.y; const r = g.interact('climb', st.id); assert.ok(r.ok, r.message);
    assert.equal(g.areaId(), `${base}:f${f + 1}`); assert.equal(g.map.building.floor, f + 1);
    const down = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'); assert.deepEqual([down.x, down.y], [st.x, st.y], 'the stairwell lines up');
    assert.ok(Math.hypot(g.player.x - st.x, g.player.y - st.y) <= 1.5, 'you arrive by the stair'); }
  const top = g.map; assert.ok(!top.objects.some((o) => o.kind === 'buildingStair' && o.dir === 'up')); assert.ok(top.objects.some((o) => o.kind === 'chest' && o.rewardSource === 'arcology-cache'));
  const guardian = g.enemies.find((e) => e.id.endsWith(':guardian')); assert.ok(guardian, 'the guardian'); assert.ok(guardian.buildingScaled && guardian.affixes?.length);
  const plain = g.enemies.find((e) => !e.id.endsWith(':guardian') && e.buildingScaled); assert.ok(guardian.maxHp > plain.maxHp);
  const down = top.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'); g.player.x = down.x; g.player.y = down.y; const r = g.interact('descend', down.id); assert.ok(r.ok, r.message);
  assert.equal(g.map.building.floor, floors - 1);
});

test('holes: only above the ground floor, over open floor below; step in and you fall a floor, hurt; jumping clears them', () => {
  const { g } = enter('keep'), st = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); g.player.x = st.x; g.player.y = st.y; g.interact('climb', st.id);
  const m = g.map, W = m.width, holes = m.tiles.filter((t) => t.hole); assert.ok(holes.length > 0, 'the floor has fallen through somewhere');
  const plan = buildingPlan(m.building.base), below = plan.floors[0]; for (const h of holes) assert.equal(below.grid[h.y * W + h.x], 0, 'open floor beneath every hole');
  const h = holes[0]; g.player.x = h.x; g.player.y = h.y; g.jumpUntil = Number.MAX_SAFE_INTEGER; g.update(.016, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 1000); assert.equal(g.map.building.floor, 2, 'a jump carries you over');
  g.jumpUntil = 0; const hp = g.player.hp; assert.ok(g.buildingFall()); assert.equal(g.map.building.floor, 1); assert.deepEqual([Math.round(g.player.x), Math.round(g.player.y)], [h.x, h.y]);
  assert.ok(g.player.hp < hp && g.player.hp >= 1); assert.match(g.message, /floor gives way/);
});

test('a broken back is a second way in; leaving by either door returns you outside', () => {
  let g = null, breach = null; for (let d = 4; d < 40 && !breach; d++) for (let x = -d; x <= d && !breach; x++) for (const y of [d - Math.abs(x), Math.abs(x) - d]) { if (!buildingHere(SEED, x, y, sectionRegion(SEED, x, y, LANDSCAPE_VERSION))) continue; const v = visit(x, y); const b = v.map.objects.find((o) => o.breachDoor); if (b) { g = v; breach = b; break; } }
  assert.ok(breach, 'some buildings have a broken back'); const rx = g.rx, ry = g.ry;
  g.player.x = breach.x; g.player.y = breach.y; let r = g.interact('enter', breach.id); assert.ok(r.ok, r.message);
  assert.ok(g.map.building.breachEntry); assert.deepEqual([g.player.x, g.player.y], [g.map.building.breachEntry.x, g.map.building.breachEntry.y]);
  const out = g.map.objects.find((o) => o.kind === 'exit' && o.id === 'building-breach'); assert.ok(out); g.player.x = out.x; g.player.y = out.y; r = g.interact('exit', out.id); assert.ok(r.ok, r.message);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [rx, ry]);
});

test('a floor is the same every time it is built, and its state is its own (a cleared floor stays cleared)', () => {
  const id = `building:${SEED}:9:2:keep:4:f2`, a = generateBuildingFloor(SEED, id), b = generateBuildingFloor(SEED, id);
  assert.deepEqual(a.tiles, b.tiles); assert.deepEqual(a.objects, b.objects); assert.deepEqual(a.enemySpawns, b.enemySpawns);
  const { g } = enter('keep'), first = g.areaId(); for (const e of g.enemies) { e.hp = 0; e.dead = true; }
  const st = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); g.player.x = st.x; g.player.y = st.y; g.interact('climb', st.id);
  const dn = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'down'); g.player.x = dn.x; g.player.y = dn.y; g.interact('descend', dn.id);
  assert.equal(g.areaId(), first); assert.ok(g.enemies.filter((e) => !e.dead && !e.ambient && e.buildingGuard).length === 0, 'the ground floor stays cleared');
});

test('the exterior is drawn after the creatures (opaque), and its doors are drawn by the building', () => {
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(src, /o\.kind === "greatBuilding"\),/); assert.match(src, /o\.kind==="greatBuilding"\?greatBuilding:/); assert.match(src, /o\.kind === "greatBuilding" \|\| o\.buildingDoor\)/);
  for (const k of FLOOR_KINDS) assert.ok(src.includes(`"${k}"`), k);
});

test('exact resume on an upper floor: the same floor, the same spot, the same wounded creature', async () => {
  const { serializeSave, deserializeSave } = await import('../src/persistence.ts');
  const { g } = enter('keep'), st = g.map.objects.find((o) => o.kind === 'buildingStair' && o.dir === 'up'); g.player.x = st.x; g.player.y = st.y; g.interact('climb', st.id);
  const id = g.areaId(), foe = g.enemies.find((e) => e.buildingGuard); foe.hp = 2; const at = [g.player.x, g.player.y];
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(200))), 900);
  assert.equal(r.area, 'dungeon'); assert.equal(r.areaId(), id); assert.equal(r.map.building.floor, 2); assert.deepEqual([r.player.x, r.player.y], at);
  assert.equal(r.enemies.find((e) => e.id === foe.id)?.hp, 2);
});
