// Roof decks: walking or jumping off a roof (pre-publish review of 915). The roof ended when the feet left its tiles, while the
// collision box still stood over the house's wall strip: back on the ground, every step (and the spot itself) was closed, and the
// Wayfarer was wedged in the wall for good. Now the roof's edge holds them up until the whole box is clear of the walls, then they
// drop once, by the ordinary fall rule, where they come down.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen } from '../src/game.ts';
import { roofDeckIndex, roofDeckAt, roofDeckById, roofDeckUnderBox } from '../src/roof-decks.ts';
import { fallDamage, elevationAt } from '../src/landscape.ts';
import { DRONE, setMechMode } from '../src/vehicle-gates.ts';
import { stableMount } from '../src/beast-mounts.ts';

const W = 32;
const SHACK = { seed: 'ROOF', rx: -2, ry: 0, id: 'shack--2-0' };
const SECTIONS = { ROOF: [[-2, 0], [1, -4], [2, 3]], DECKS: [[1, 0], [0, 1], [-1, 0], [0, -1], [2, 1], [-2, -1], [3, 0], [0, 3], [-3, 2], [4, -1]] };
const KINDS = ['shack', 'hut', 'district 2', 'district 3']; // a shelter's shack, a hamlet's hut, district houses 2 and 3 levels high
const SIDES = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function at(sec, extra = (s) => {}) {
  const s = freshSave(); s.seed = sec.seed; s.maxHp = 100; extra(s); Object.assign(s.session, { area: 'overworld', rx: sec.rx, ry: sec.ry, x: 16, y: 16 });
  const g = new Game(s, 0); g.enemies = []; g.player.hp = g.save.maxHp; return { s, g };
}
const tile = (g, x, y) => g.map.tiles[y * W + x];
const stand = (g, x, y) => { g.player.x = x; g.player.y = y - .25; }; // the feet in the middle of tile (x, y)
const inp = (x, y, jump = false) => { let j = jump; return { state: { x, y }, consume: (k) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
function driver(g, dt, t0 = 1000) { let t = t0; const step = (x, y, jump = false) => { t += dt; g.update(dt / 1000, inp(x, y, jump), t); g.enemies = []; };
  return { step, walk: (x, y, ms) => { for (let i = 0; i < ms / dt; i++) step(x, y); }, now: () => t }; }
// A tile on a deck's side (nearest the side's middle) with a 3-wide, 4-deep yard outside it that can be opened (no house tile, in the map).
function side(g, d, name) {
  const [dx, dy] = SIDES[name], cells = d.cells.map((i) => [i % W, Math.floor(i / W)]);
  const edge = cells.filter(([x, y]) => !d.cells.includes((y + dy) * W + x + dx));
  edge.sort((a, b) => dx ? a[1] - b[1] : a[0] - b[0]); const mid = Math.floor(edge.length / 2);
  const order = edge.map((e, i) => [Math.abs(i - mid), e]).sort((a, b) => a[0] - b[0]).map((q) => q[1]); // nearest the middle first
  for (const [ex, ey] of order) { const yard = []; let ok = true;
    for (let k = 1; k <= 4 && ok; k++) for (let l = -1; l <= 1 && ok; l++) { const x = ex + dx * k + (dx ? 0 : l), y = ey + dy * k + (dy ? 0 : l);
      if (x < 1 || y < 1 || x > W - 2 || y > W - 2) { ok = false; break; } const t = tile(g, x, y); if (t.buildingId || t.structure) ok = false; else yard.push([x, y]); }
    if (ok) return { ex, ey, dx, dy, yard, door: tile(g, ex, ey).doorSide === name }; } // a door there: back in through it is the way in
  return null;
}
const openYard = (g, s, elev) => { for (const [x, y] of s.yard) Object.assign(tile(g, x, y), { kind: 'ash', blocked: false, elev, slope: false, environment: undefined, perch: undefined }); };
// Off the roof and free: no deck, on open ground, the box clear of every wall, and not inside the house.
function assertFree(g, d, why) {
  const p = g.player; assert.equal(g.roofDeck, null, `${why}: off the roof`); assert.equal(p.jumping, false, `${why}: landed`);
  assert.equal(footprintOpen(g.map, W, p.x, p.y), true, `${why}: not in a wall (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  assert.equal(roofDeckAt(g.map, p.x + .5, p.y + .75), null, `${why}: outside the house`);
}
// From where the Wayfarer stands, a tile's walk in each direction: away and along the wall they move; back into the house they don't.
function assertCanMove(g, d, s, dt, why) {
  const p = g.player, x0 = p.x, y0 = p.y, hp = p.hp, saved = { x: x0, y: y0 };
  for (const [mx, my] of DIRS) { p.x = saved.x; p.y = saved.y; const drive = driver(g, dt, g.lastUpdateNow + 100);
    // out of a doorway, a step along the wall first takes a step out of the doorway (as from any door)
    if (s.door && mx * s.dx + my * s.dy === 0) drive.walk(s.dx, s.dy, 250);
    const sx = p.x, sy = p.y; drive.walk(mx, my, 1000 / 2.4 + 120);
    const moved = Math.hypot(p.x - sx, p.y - sy), back = mx === -s.dx && my === -s.dy;
    if (back && !s.door) assert.ok(roofDeckUnderBox(g.map, p.x, p.y, Infinity, d.id) === null || moved < .05, `${why}: never back in through the wall`);
    else assert.ok(moved >= .9, `${why}: walks ${mx},${my} (${moved.toFixed(2)})`);
    assert.equal(footprintOpen(g.map, W, p.x, p.y), true, `${why}: ${mx},${my} never in a wall`); assert.equal(g.roofDeck, null, `${why}: still on the ground`); assert.equal(p.hp, hp, `${why}: no second fall`); }
}

// For every kind and side, the first deck of the two seeds' sections with a yard outside that side (houses touch: not every one has).
let CASES = null;
function cases() {
  if (CASES) return CASES; CASES = [];
  for (const kind of KINDS) for (const name of Object.keys(SIDES)) { let found = null;
    for (const [seed, list] of Object.entries(SECTIONS)) { for (const [rx, ry] of list) { const sec = { seed, rx, ry }, { g } = at(sec);
        for (const d of roofDeckIndex(g.map).decks) if ((d.kind === 'district' ? `district ${d.level - d.base}` : d.kind) === kind && side(g, d, name)) { found = { ...sec, id: d.id, kind, name }; break; }
        if (found) break; } if (found) break; }
    assert.ok(found, `a ${kind} with its ${name} side clear`); CASES.push(found); }
  return CASES;
}

test('walking off every side of every kind of roof, at 60 and 20 frames a second: one fall, then free to walk on', () => {
  let runs = 0, held = 0; const skipped = new Set();
  for (const sec of cases()) for (const dt of [1000 / 60, 50]) { const name = sec.name;
    const { g } = at(sec), d = roofDeckById(g.map, sec.id), s = side(g, d, name); if (!s) { skipped.add(`${sec.id} ${name}`); continue; } openYard(g, s, d.base);
    stand(g, s.ex - s.dx, s.ey - s.dy); if (!roofDeckAt(g.map, g.player.x + .5, g.player.y + .75)) stand(g, s.ex, s.ey); g.setRoofDeck(d);
    const drive = driver(g, dt), p = g.player; let edge = false;
    for (let i = 0; i < 2000 / dt && (g.roofDeck || g.fall); i++) { drive.step(s.dx, s.dy); if (g.roofDeck && !roofDeckAt(g.map, p.x + .5, p.y + .75)) edge = true; } // fall physics (game.ts FALL): on until the fall off it lands
    held += edge; const why = `${sec.kind} ${sec.id} ${name} ${Math.round(1000 / dt)}fps`;
    assertFree(g, d, why); assert.equal(p.hp, g.save.maxHp - fallDamage(d.level - d.base, g.save.maxHp), `${why}: one fall of ${d.level - d.base} levels`);
    assertCanMove(g, d, s, dt, why); runs++;
  }
  assert.deepEqual([...skipped], [], 'every side of every kind'); assert.equal(runs, KINDS.length * 4 * 2); assert.ok(held >= runs / 2, 'the edge held them over the walls on the way');
});

test('jumping off every side of every kind of roof, landing anywhere from the roof edge outwards: one fall, then free', () => {
  let runs = 0, edgeLandings = 0;
  for (const sec of cases()) for (const dt of [1000 / 60, 50]) for (const hold of [0, 60, 120, 200, 300, 520]) {
    const name = sec.name, { g } = at(sec), d = roofDeckById(g.map, sec.id), s = side(g, d, name); openYard(g, s, d.base);
    stand(g, s.ex, s.ey); g.setRoofDeck(d); const drive = driver(g, dt), p = g.player, why = `${sec.id} ${name} ${Math.round(1000 / dt)}fps stick ${hold}ms`;
    drive.step(s.dx, s.dy, true); drive.walk(s.dx, s.dy, hold); drive.walk(0, 0, 1400); // fall physics: the jump, then the fall's airtime
    assert.equal(p.jumping, false, `${why}: landed`); assert.equal(p.hp > 0, true);
    if (g.roofDeck) { if (!roofDeckAt(g.map, p.x + .5, p.y + .75)) edgeLandings++; assert.equal(p.hp, g.save.maxHp, `${why}: on the roof, unhurt`);
      for (let i = 0; i < 2000 / dt && (g.roofDeck || g.fall); i++) drive.step(s.dx, s.dy); } // then on off it (and down: fall physics)
    assertFree(g, d, why); assert.equal(p.hp, g.save.maxHp - fallDamage(d.level - d.base, g.save.maxHp), `${why}: one fall`);
    if (hold === 0 || hold === 200) assertCanMove(g, d, s, dt, why); runs++;
  }
  assert.ok(runs >= 100, `${runs}`); assert.ok(edgeLandings > 0, 'some jumps came down on the roof edge, over the walls');
});

// The reviewer's sweep: every deck of seeds ROOF and DECKS, walked off from its middle in each direction, as the ground lies.
test('the deck sweep over seeds ROOF and DECKS: no wedges, and every fall is the ordinary one for its drop', () => {
  const secs = SECTIONS;
  let total = 0, left = 0, wedged = 0, decks = 0; const bad = [];
  for (const dt of [50, 1000 / 60]) for (const [seed, list] of Object.entries(secs)) for (const [rx, ry] of list) {
    const all = roofDeckIndex(at({ seed, rx, ry }).g.map).decks; if (dt === 50) decks += all.length;
    for (const d0 of all) for (const [dx, dy] of DIRS) {
      const { g } = at({ seed, rx, ry }), d = roofDeckById(g.map, d0.id), c = d.cells[Math.floor(d.cells.length / 2)], p = g.player;
      stand(g, c % W, Math.floor(c / W)); g.setRoofDeck(d); const drive = driver(g, dt); total++;
      for (let i = 0; i < 8000 / dt && (g.roofDeck || g.fall) && p.hp > 0; i++) drive.step(dx, dy); // fall physics: until the fall off it lands
      if (g.roofDeck) continue; left++; // the way was barred (a higher roof, the map's edge): still up there, nothing to check
      const drop = d.level - elevationAt(g.map, W, p.x, p.y), want = drop > 1 ? fallDamage(drop, g.save.maxHp) : 0;
      if (p.hp <= 0) { if (want !== Infinity) bad.push(`${d.id} ${dx},${dy}: died of a ${drop}-level drop`); continue; }
      if (p.hp !== g.save.maxHp - want) bad.push(`${d.id} ${dx},${dy}: hp ${p.hp}, drop ${drop}`);
      const x0 = p.x, y0 = p.y; let moved = 0; for (const [ex, ey] of DIRS) { drive.walk(ex, ey, 600); moved = Math.max(moved, Math.hypot(p.x - x0, p.y - y0)); }
      if (moved < .3 || !footprintOpen(g.map, W, x0, y0, true)) { wedged++; bad.push(`${d.id} ${dx},${dy} wedged at ${x0},${y0}`); }
    }
  }
  assert.equal(decks, 14, 'the 14 decks of the review'); assert.ok(left >= total * .7, `${left}/${total} walked off`);
  assert.equal(wedged, 0, bad.join('\n')); assert.deepEqual(bad, []);
});

test('a save on the roof edge resumes exactly there, still up, and the walk off goes on as before', () => {
  for (const dt of [1000 / 60, 50]) {
    const { s, g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), sd = side(g, d, 'east'); openYard(g, sd, d.base); stand(g, sd.ex, sd.ey); g.setRoofDeck(d);
    const drive = driver(g, dt), p = g.player; for (let i = 0; i < 200 && !(g.roofDeck && !roofDeckAt(g.map, p.x + .5, p.y + .75)); i++) drive.step(1, 0);
    assert.ok(g.roofDeck && !roofDeckAt(g.map, p.x + .5, p.y + .75), 'on the edge, the feet past the roof');
    g.exportSnapshot(drive.now()); const saved = migrateSave(structuredClone(s)); assert.deepEqual(saved.session.playerRuntime.roofDeck, { id: d.id, level: d.level });
    const r = new Game(structuredClone(saved), drive.now() + 100); r.enemies = []; openYard(r, sd, d.base);
    assert.equal(r.player.x, p.x); assert.equal(r.player.y, p.y); assert.equal(r.roofDeck?.id, d.id, 'still on the edge'); assert.equal(r.playerLevel(), d.level);
    const rd = driver(r, dt, drive.now() + 100); for (let i = 0; i < 2000 / dt && (r.roofDeck || r.fall); i++) rd.step(1, 0); // fall physics: until it lands
    assertFree(r, d, 'resumed'); assert.equal(r.player.hp, r.save.maxHp - fallDamage(d.level - d.base, r.save.maxHp), 'one fall');
  }
});

test('the drone and the glider coming down over a roof edge land on the roof, never in its wall', () => {
  for (const dt of [1000 / 60, 50]) {
    // the drone: the lift spent with the feet just past the roof, the box still over the wall
    { const { s, g } = at(SHACK, (s) => { s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; });
      const d = roofDeckById(g.map, SHACK.id), sd = side(g, d, 'east'); openYard(g, sd, d.base); setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry; assert.ok(g.droneUp());
      g.player.x = sd.ex + .55; g.player.y = sd.ey - .25; assert.equal(roofDeckAt(g.map, g.player.x + .5, g.player.y + .75), null); assert.equal(footprintOpen(g.map, W, g.player.x, g.player.y), false, 'over the wall');
      g.droneLift = { base: d.base, z: d.level + .4, vz: 0 }; g.jumpUntil = 1100; g.skyAir = d.level; const drive = driver(g, dt);
      for (let i = 0; i < 4000 / dt && (g.droneLift || g.player.jumping); i++) drive.step(0, 0); drive.walk(0, 0, 200);
      assert.equal(g.droneLift, null, 'landed'); assert.equal(g.roofDeck?.id, d.id, 'on the roof edge'); assert.equal(g.player.hp, g.save.maxHp);
      for (let i = 0; i < 2000 / dt && (g.roofDeck || g.fall); i++) drive.step(1, 0); assertFree(g, d, 'drone'); assert.equal(g.player.hp, g.save.maxHp - fallDamage(d.level - d.base, g.save.maxHp)); assertCanMove(g, d, sd, dt, 'drone'); }
    // the glider
    { const { g } = at(SHACK, (s) => { s.glider = true; }), d = roofDeckById(g.map, SHACK.id), sd = side(g, d, 'east'); openYard(g, sd, d.base);
      g.player.x = sd.ex + .55; g.player.y = sd.ey - .25; g.glide = { z: d.level + .3, vx: 0, vy: 0, open: true, told: false }; const drive = driver(g, dt);
      for (let i = 0; i < 3000 / dt && g.glide; i++) drive.step(0, 0);
      assert.equal(g.glide, null, 'landed'); assert.equal(g.roofDeck?.id, d.id, 'on the roof edge, not pinned over the wall'); assert.equal(g.player.hp, g.save.maxHp);
      for (let i = 0; i < 2000 / dt && (g.roofDeck || g.fall); i++) drive.step(1, 0); assertFree(g, d, 'glider'); assertCanMove(g, d, sd, dt, 'glider'); }
  }
});

test('on a roof, a mount or the robot is refused (they never use decks); the drone may come out', () => {
  const { s, g } = at(SHACK, (s) => { s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; });
  const d = roofDeckById(g.map, SHACK.id), c = d.cells[Math.floor(d.cells.length / 2)]; stand(g, c % W, Math.floor(c / W)); g.setRoofDeck(d);
  stableMount(s, 'briarStag'); const r = g.summonMount(); assert.equal(r.ok, false); assert.match(r.message, /roof/); assert.equal(g.mountRide(), null); assert.equal(g.roofDeck?.id, d.id);
  setMechMode(s, 'robot'); assert.equal(g.useConsumable('submersible', 0), false, 'the robot does not unfold up here'); assert.match(g.message, /roof/); assert.equal(g.mechUp(), false);
  setMechMode(s, 'drone'); assert.equal(g.useConsumable('submersible', 0), true, 'the drone lifts off'); assert.equal(g.droneUp(), true);
  assert.equal(g.pressFrame('robot', 1000), false, 'nor does the drone turn into the robot'); assert.equal(g.mechUp(), false);
  driver(g, 50).walk(0, 0, 300); assert.equal(g.roofDeck?.id, d.id, 'still on the roof'); assert.equal(g.player.hp, g.save.maxHp);
});

test('a roof tile taken away under the Wayfarer (dug or scarred): they drop once, and can walk away', () => {
  for (const dt of [1000 / 60, 50]) for (const where of ['middle', 'wall', 'edge']) {
    const { g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), sd = side(g, d, 'east'); openYard(g, sd, d.base); g.setRoofDeck(d); const drive = driver(g, dt), p = g.player;
    let gone;
    if (where === 'middle') { const c = d.cells.find((i) => tile(g, i % W, Math.floor(i / W)).structure === 'shackInterior'); stand(g, c % W, Math.floor(c / W)); gone = c; }
    else if (where === 'wall') { stand(g, sd.ex, sd.ey); gone = sd.ey * W + sd.ex; }
    else { stand(g, sd.ex, sd.ey); for (let i = 0; i < 200 && !(g.roofDeck && !roofDeckAt(g.map, p.x + .5, p.y + .75)); i++) drive.step(1, 0); gone = sd.ey * W + sd.ex; }
    assert.equal(g.roofDeck?.id, d.id, `${where}: up`);
    const t = g.map.tiles[gone]; Object.assign(t, { kind: 'ash', blocked: false, elev: d.base, slope: false, structure: undefined, buildingId: undefined, wallSides: undefined, encSides: undefined });
    drive.walk(0, 0, 800); const why = `${where} ${Math.round(1000 / dt)}fps`; // fall physics: the drop has airtime
    assert.equal(g.roofDeck, null, `${why}: down`); assert.equal(p.hp, g.save.maxHp - fallDamage(d.level - d.base, g.save.maxHp), `${why}: one fall`);
    assert.equal(footprintOpen(g.map, W, p.x, p.y), true, `${why}: not in a wall`);
    const x0 = p.x, y0 = p.y; let moved = 0; for (const [mx, my] of DIRS) { drive.walk(mx, my, 600); moved = Math.max(moved, Math.hypot(p.x - x0, p.y - y0)); }
    assert.ok(moved >= .9, `${why}: walks away (${moved.toFixed(2)})`); assert.equal(p.hp, g.save.maxHp - fallDamage(d.level - d.base, g.save.maxHp), `${why}: no second fall`);
  }
});

test('the roof edge never lets the Wayfarer down into the house: back over the wall is back on the roof', () => {
  const { g } = at(SHACK), d = roofDeckById(g.map, SHACK.id), sd = side(g, d, 'east'); openYard(g, sd, d.base); stand(g, sd.ex, sd.ey); g.setRoofDeck(d);
  const drive = driver(g, 50), p = g.player; for (let i = 0; i < 200 && !(g.roofDeck && !roofDeckAt(g.map, p.x + .5, p.y + .75)); i++) drive.step(1, 0);
  assert.ok(g.roofDeck && !roofDeckAt(g.map, p.x + .5, p.y + .75), 'on the edge');
  drive.walk(-1, 0, 1500); assert.equal(g.roofDeck?.id, d.id, 'back on the roof'); assert.equal(roofDeckAt(g.map, p.x + .5, p.y + .75)?.id, d.id); assert.equal(p.hp, g.save.maxHp);
  // the edge holds only over the walls: from the ground outside a roof the Wayfarer cannot reach, nothing is held
  const k = at(SHACK).g; openYard(k, sd, d.base); stand(k, sd.ex + 1, sd.ey); assert.equal(k.deckEdgeHold(k.player.x - .3, k.player.y, d.base), null);
  assert.equal(k.deckEdgeHold(k.player.x - .3, k.player.y, d.level)?.id, d.id, 'over its wall, within reach');
});
