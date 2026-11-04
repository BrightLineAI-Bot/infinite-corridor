// Tim's play report (2026-11-04, r735, on a great building's roof): "hard to see where the Wayfarer was... two versions of the
// character... it looked like it stood at an edge"; the roof hatch "took several presses of Act"; update() spikes in the
// interiors with many creatures. The Wayfarer on a roof is drawn once, lifted to the roof, over it; the roof's cutaway and the
// draw read the tile under the feet as movement does; Act reaches the hatch from it or any tile round it, at the first press;
// the creatures' way-round search is cheaper, kept while nothing moved, and bounded per frame, with the same answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, chaseSearch, boundedChaseStep, navTick, navStats, NAV, footprintOpen, activeDungeonEnemies, shouldSimulateEnemy } from '../src/game.ts';
import { render, roofTileUnder, standingOnRoof } from '../src/renderer.ts';
import { tileUnder, liftAt } from '../src/landscape.ts';
import { generateBuildingFloor } from '../src/great-buildings.ts';
import { generateCompoundFloor } from '../src/compounds.ts';
import { isDungeonHunter } from '../src/monster-pack.ts';

// GREAT1 section -4,-2: an Old Keep (v2, L-shaped) with a roof at elevation 5, a hatch at 21,7, fallen-in cells at 18,5 17,7 20,8.
const SEED = 'GREAT1', RX = -4, RY = -2;
const onSection = (x, y) => { const s = freshSave(); s.seed = SEED; Object.assign(s.session, { area: 'overworld', rx: RX, ry: RY, x, y }); return new Game(s, 0); };
const VISOR = '#171817'; // the Wayfarer's visor: drawn by the player sprite only
function recordingCtx() {
  const stack = [], visors = []; let tx = 0, ty = 0, alpha = 1, fill = '';
  const base = {
    save() { stack.push([tx, ty, alpha]); }, restore() { [tx, ty, alpha] = stack.pop() || [0, 0, 1]; },
    translate(x, y) { tx += x; ty += y; },
    set fillStyle(v) { fill = v; }, get fillStyle() { return fill; },
    set globalAlpha(v) { alpha = v; }, get globalAlpha() { return alpha; },
    fillRect(x, y, w, h) { if (fill === VISOR) visors.push({ x: x + tx, y: y + ty, alpha }); },
    createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null,
    measureText: () => ({ width: 10 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }), get visors() { return visors; },
  };
  return new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { if (k === 'fillStyle' || k === 'globalAlpha') o[k] = v; return true; } });
}
const W = 475, H = 661;

test('the section really has a roof to stand on, with its hatch', () => {
  const g = onSection(21, 6), B = g.map.objects.find((o) => o.kind === 'greatBuilding');
  assert.ok(B?.roof, 'a roofed great building'); assert.deepEqual(B.roof.hatch, { x: 21, y: 7 });
  assert.equal(g.map.tiles[7 * 32 + 21].structure, 'buildingRoof');
});

test('the drawing reads the roof under the feet exactly as movement does (tileUnder), edge bands included', () => {
  const g = onSection(21, 6); let checked = 0;
  for (let y = 1; y <= 11; y += .05) for (let x = 13; x <= 27; x += .25) { const p = { x, y }, t = tileUnder(g.map, 32, x, y);
    assert.equal(roofTileUnder(g.map.tiles, 32, p), t?.structure === 'buildingRoof', `${x.toFixed(2)},${y.toFixed(2)}`); checked++; }
  assert.ok(checked > 10000);
});

test('on the roof the Wayfarer is drawn once, lifted to the roof, where the camera centres: at the rim, by a fallen cell, on the hatch', () => {
  // y + .3 and y - .6 are the bands where rounding (the old cutaway test) and the feet (movement) disagreed
  for (const [x, y] of [[21, 6], [21, 7], [23, 8], [23, 9.2], [18, 2.35], [18, 2.6], [17.4, 6.3], [24, 6.3], [19.2, 8.25], [16, 4.3]]) {
    const g = onSection(x, y); g.player.x = x; g.player.y = y;
    assert.ok(standingOnRoof(g, 32), `${x},${y} is on the roof`);
    const s = Math.round(Math.max(28, Math.min(44, W / 12))), lift = liftAt(g.map, 32, x, y);
    assert.ok(lift > 2, 'the roof is drawn high, at the top of its facade');
    const ctx = recordingCtx(); render(ctx, g, W, H, 5000);
    const v = ctx.visors.filter((q) => q.alpha === 1);
    assert.equal(v.length, 1, `${x},${y}: one Wayfarer (was two: one hidden under the roof, one at ground level ${lift.toFixed(1)} tiles south)`);
    assert.ok(Math.abs(v[0].y - H / 2) < s * .6, `${x},${y}: drawn where it stands (screen y ${v[0].y.toFixed(0)} of centre ${H / 2})`);
    assert.ok(Math.abs(v[0].x - W / 2) < s * .6);
  }
});

test('walking behind a building on the ground, the Wayfarer is drawn where it is, and shows through the roof as a faint ghost', () => {
  const g = onSection(19, 1.5); g.player.x = 19; g.player.y = 1.5; assert.ok(!standingOnRoof(g, 32));
  const ctx = recordingCtx(); render(ctx, g, W, H, 5000);
  const solid = ctx.visors.filter((q) => q.alpha === 1), ghost = ctx.visors.filter((q) => q.alpha < 1);
  assert.equal(solid.length, 1); assert.equal(ghost.length, 1, 'a ghost over the roof that hides it');
  assert.ok(Math.abs(ghost[0].y - solid[0].y) < .5 && Math.abs(ghost[0].x - solid[0].x) < .5, 'the ghost is the same Wayfarer, at the same place');
});

test('Act takes the roof hatch at the first press from it or any tile round it, and only from the roof', () => {
  const press = (g, now) => { let used = false; g.update(1 / 60, { state: { x: 0, y: 0 }, consume: (a) => (a === 'interact' && !used ? (used = true) : false), held: () => false }, now); };
  for (const [dx, dy] of [[0, 0], [0, -.6], [.4, .3], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1], [.49, -.74], [-.49, 1.24]]) {
    const g = onSection(21 + dx, 7 + dy); g.player.x = 21 + dx; g.player.y = 7 + dy; let now = 1000;
    for (let i = 0; i < 3; i++) g.update(1 / 60, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, now += 17);
    press(g, now += 17);
    assert.equal(g.area, 'dungeon', `from ${dx},${dy}: down through the hatch at the first press (${g.message})`);
    assert.equal(g.map.building.floor, g.map.building.floors, 'onto the top floor');
  }
  // two tiles off it is out of reach; nothing down on the ground is reached from the roof
  const g = onSection(23, 7); g.player.x = 23; g.player.y = 7; assert.notEqual(g.nearestObject()?.roofHatch, true);
  const B = g.map.objects.find((o) => o.kind === 'greatBuilding'), door = g.map.objects.find((o) => o.buildingDoor && !o.roofHatch && !o.breachDoor);
  const above = { x: door.x, y: door.y - 1 }; assert.equal(g.map.tiles[above.y * 32 + above.x].structure, 'buildingRoof', 'the roof cell over the front door');
  g.player.x = above.x; g.player.y = above.y; assert.notEqual(g.nearestObject()?.id, door.id, 'the door on the ground below is not reached from the roof');
  g.player.x = door.x; g.player.y = door.y; assert.equal(g.nearestObject()?.id, door.id, 'from the ground it is');
  assert.ok(B.roof);
});

// The way-round search as it was (strings, arrays and a Map per cell), kept here to prove the new one answers the same.
function oldStep(entity, player, map, width, radius = 12) {
  const sx = Math.round(entity.x), sy = Math.round(entity.y), gx = Math.round(player.x), gy = Math.round(player.y), start = `${sx},${sy}`, queue = [[sx, sy]], seen = new Set([start]), first = new Map([[start, null]]); let best = [sx, sy], bestDistance = Math.hypot(gx - sx, gy - sy);
  for (let index = 0; index < queue.length && index < 625; index++) {
    const [x, y] = queue[index], distance = Math.hypot(gx - x, gy - y); if (distance < bestDistance) { best = [x, y]; bestDistance = distance; } if (x === gx && y === gy) { best = [x, y]; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, key = `${nx},${ny}`; if (seen.has(key) || Math.abs(nx - sx) > radius || Math.abs(ny - sy) > radius || !footprintOpen(map, width, nx, ny, false, entity._marineTraversal === true)) continue; seen.add(key); queue.push([nx, ny]); first.set(key, first.get(`${x},${y}`) || [nx, ny]); }
  }
  return first.get(`${best[0]},${best[1]}`) || null;
}

test('the way-round search gives the old answers on great-building floors, compound floors and a dungeon', () => {
  const maps = []; for (let i = 0; i < 10; i++) maps.push(generateBuildingFloor('NAV', `building:NAV${i}:${i}:${i % 5}:${['keep', 'apartment', 'hive'][i % 3]}:4${i % 2 ? 'r' : ''}:f${1 + (i % 4)}`));
  const g = onSection(21, 6); g.rx = -1; g.ry = 4; g.loadArea('overworld', false);
  const door = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'outer'); if (door) maps.push(generateCompoundFloor(SEED, door.dungeonId));
  g.player.x = door.x; g.player.y = door.y; g.interact('enter', door.id); maps.push(g.map);
  let cases = 0;
  for (const m of maps) { const open = m.tiles.filter((t) => !t.blocked && !t.hole);
    for (let k = 0; k < 150; k++) { const a = open[(k * 7919) % open.length], b = open[(k * 104729 + 13) % open.length], e = { x: a.x + ((k % 5) - 2) * .1, y: a.y + ((k % 3) - 1) * .2 }, p = { x: b.x + .3, y: b.y - .2 };
      assert.deepEqual(chaseSearch(Math.round(e.x), Math.round(e.y), Math.round(p.x), Math.round(p.y), m, m.width), oldStep(e, p, m, m.width)); cases++; } }
  assert.ok(cases >= 1500, `${cases} searches compared`);
});

test('a creature\'s answer is kept while nothing moved, and no frame runs more than NAV.budget searches', () => {
  const m = generateBuildingFloor('NAV', 'building:NAVB:3:1:keep:4:f2'), open = m.tiles.filter((t) => !t.blocked && !t.hole), p = { x: open[0].x, y: open[0].y };
  navTick();
  const e = { x: open[open.length - 1].x, y: open[open.length - 1].y }, a = boundedChaseStep(e, p, m, m.width);
  assert.deepEqual(a, oldStep(e, p, m, m.width)); assert.equal(navStats().spent, 1);
  assert.deepEqual(boundedChaseStep(e, p, m, m.width), a); assert.equal(navStats().spent, 1, 'asked again from the same place: the kept answer');
  const crowd = open.slice(1, 40).map((t) => ({ x: t.x, y: t.y }));
  for (const c of crowd) boundedChaseStep(c, p, m, m.width);
  assert.equal(navStats().spent, NAV.budget, 'the rest wait for the next frame'); assert.equal(navStats().asked, crowd.length + 2);
  navTick(); for (const c of crowd.slice(0, NAV.budget)) assert.deepEqual(boundedChaseStep(c, p, m, m.width), oldStep(c, p, m, m.width));
});

test('the active creatures are chosen and ordered as before (hunters, the woken, bosses, the nearest, then by id)', () => {
  const g = onSection(21, 6), p = { x: 10, y: 10 }, list = [];
  for (let i = 0; i < 40; i++) list.push({ id: `c${(i * 37) % 41}`, kind: 'ashling', x: 10 + ((i * 7) % 13) - 6, y: 10 + ((i * 5) % 11) - 5, aggro: i % 3 === 0, boss: i % 11 === 0, dead: i % 13 === 5 });
  const cap = 9, old = list.filter((e) => shouldSimulateEnemy(e, p, 'dungeon')).sort((a, b) => Number(isDungeonHunter(b, 'dungeon')) - Number(isDungeonHunter(a, 'dungeon')) || Number(!!b.aggro) - Number(!!a.aggro) || Number(!!b.boss) - Number(!!a.boss) || Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y) || String(a.id).localeCompare(String(b.id))).slice(0, cap);
  assert.deepEqual(activeDungeonEnemies(list, p, { activeEnemyCap: cap }).map((e) => e.id), old.map((e) => e.id));
  assert.ok(g);
});

test('generation is untouched: great-building and compound floors hash as before the change', () => {
  const h = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
  const floors = []; for (let i = 0; i < 24; i++) { const style = ['keep', 'apartment', 'hive'][i % 3], n = 3 + (i % 3), roof = i % 2 ? 'r' : ''; for (let f = 1; f <= n; f++) floors.push(generateBuildingFloor('GOLD', `building:GOLD${i}:${i % 7}:${i % 5}:${style}:${n}${roof}:f${f}`, 1)); }
  assert.equal(h(floors), '4ea3364778fe83d5');
  const g = onSection(21, 6); g.rx = -1; g.ry = 4; g.loadArea('overworld', false);
  const door = g.map.objects.find((o) => o.compoundDoor && o.enterAt === 'outer'), base = door.dungeonId.replace(/:f\d+$/, ''), n = +base.match(/:(\d+)r?$/)[1], comp = [];
  for (let f = 1; f <= n; f++) comp.push(generateCompoundFloor(SEED, `${base}:f${f}`));
  assert.equal(h(comp), 'f7007e07b2264a00');
});
