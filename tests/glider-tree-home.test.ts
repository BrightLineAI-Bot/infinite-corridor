// Tim, 2026-11-05: "if you're in the glider and you try to fly over the walls, you'll just die. And it'll take you back to the top
// of the tree — that's just the way dying on a glider works: if you jump from the top of the tree and haven't touched the ground yet,
// and you die — going over a Pentagon, or going over deep water — you just spawn back at the top of the tree, and you think about
// your decisions." And: "there's a window around the tree where you can't travel north while gliding, so you can't fly up the
// platforms... You can use the drone for that."
// 1. TREE_GLIDE.home: a glide from a great tree's crown that ends in death, before the Wayfarer stands on anything, wakes them on
//    that crown (whichever section the glide reached); a glide from lower, or a death after landing, is the ordinary death.
// 2. TREE_GLIDE.window: inside the tree's window a glide cannot go north; east, west and south still can; it cannot be pinned;
//    walking and the drone are untouched.
// 3. The 763 height rule, swept over real trees: a glide begun anywhere on or near a tree never ends on ground above its start.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, GLIDE, crownSpot } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, LANDSCAPE_VERSION, LIFT_PER_LEVEL, CANOPY_LIFT, elevationAt } from '../src/landscape.ts';
import { TREE_GLIDE, treeGlideWindowAt, canopyTop, GLIDER_FORBIDDEN, DRONE, setMechMode } from '../src/vehicle-gates.ts';
import { PENTAGON } from '../src/pentagon.ts';

const W = 32, T = (g, x, y) => g.map.tiles[y * W + x];
const input = (f = {}) => { let jump = !!f.jump; return { state: { x: f.x || 0, y: f.y || 0 }, consume: (k) => (k === 'jump' && jump ? (jump = false, true) : false), held: (k) => k === 'jump' && !!f.hold }; };
function fly(g, frames, plan, t0) { let t = t0; for (let i = 0; i < frames; i++) { const f = plan(i) || {}; g.enemies = []; g.update(.05, input(f), t); t += 50; if (f.until?.()) break; } return t; }
const deaths = (g) => g.save.worldFlags.deaths || 0;
const SEED = 'GLIDEHOME';
const save = (seed = SEED) => { const s = freshSave(); s.seed = seed; s.maxHp = 100; s.glider = true; s.capabilities = { ...(s.capabilities || {}), swim: false }; return s; };
// Tree sections of new ground (landscape version 19), found by generation alone, then built in a Game.
const trees = {}; function treesOf(seed, n) {
  if (trees[seed]?.length >= n) return trees[seed]; const out = trees[seed] = [];
  for (let x = 14; x < 400 && out.length < n; x++) for (let y = 14; y < 400 && out.length < n; y += 5) { if (sectionRegion(seed, x, y, LANDSCAPE_VERSION).type !== 'jungle') continue; const m = generateRegion(seed, x, y); applyLandscape(m, seed, x, y, { version: LANDSCAPE_VERSION }); if (m.canopy?.top) { out.push([x, y]); x += 6; } }
  return out;
}
const visit = (rx, ry, seed = SEED) => { const g = new Game(save(seed), 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.save.maxHp; return g; };
const atTree = (k = 0, seed = SEED) => { const [x, y] = treesOf(seed, k + 1)[k]; return visit(x, y, seed); };
// Walk off the crown's edge (west, east or south first) into the freefall, then open the glider: the real launch.
function launch(g, open = true) {
  const top = g.map.canopy.top, dirs = [[-1, 0], [1, 0], [0, 1], [0, -1]], crown = g.map.tiles.filter((t) => t.kind === 'canopyTrunk' && t.elev === top);
  let pick = null; for (const d of dirs) { for (const t of crown) { const n = T(g, t.x + d[0], t.y + d[1]); if (n && !n.blocked && !n.canopy && (n.elev || 0) <= top - GLIDE.minDrop) { pick = { t, d }; break; } } if (pick) break; }
  assert.ok(pick, 'a crown edge over open air'); Object.assign(g.player, { x: pick.t.x, y: pick.t.y - .25 }); let t = 1000;
  t = fly(g, 40, () => ({ x: pick.d[0], y: pick.d[1], until: () => !!g.glide }), t); assert.ok(g.glide, 'the freefall'); if (open) t = fly(g, 1, () => ({ jump: true, x: pick.d[0], y: pick.d[1] }), t);
  return { t, d: pick.d };
}
const onCrown = (g) => { const u = T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75)); return !!u && u.kind === 'canopyTrunk' && u.elev === g.map.canopy?.top; };
const cpKey = (c) => c && [c.rx, c.ry, c.x, c.y].join(',');
let pent = null; const findPentagon = () => pent ||= (() => { const g = new Game(save(), 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { cx, cy }; return null; })();
// Open land with a Pentagon tile straight east of it.
function pentagonEdgeIn(g) {
  for (let ty = 2; ty < 30; ty++) for (let tx = 6; tx < 30; tx++) { if (!T(g, tx, ty).pentagon) continue; const ok = (q) => q && !q.blocked && !q.pentagon && !['lava', 'canyon', 'river', 'abyss', 'deepWater', 'ocean'].includes(q.kind);
    if ([1, 2, 3, 4, 5].every((d) => ok(T(g, tx - d, ty)) && !T(g, tx - d, ty - 1).pentagon && !T(g, tx - d, ty + 1).pentagon)) return { x: tx - .8, y: ty - .5, tx, ty }; }
  return null;
}
// The active rest point set far from the tree (the launch walks over the Crown Rest and makes it the rest point).
const refuge = (g) => { g.save.activeCheckpoint = { rx: 0, ry: 0, x: 16, y: 16, name: 'Ember Refuge' }; };
// The tree's own section turned to open sea round the tree, the glide moved off over the water far from it, low.
function overSea(g) { const b = g.map.canopy.box, mx = b.x + b.n / 2, my = b.y + b.n / 2; for (const q of g.map.tiles) if (!q.canopy) Object.assign(q, { kind: 'ocean', blocked: false, elev: 0, structure: null, landscape: 'sea' });
  const far = g.map.tiles.filter((q) => !q.canopy && q.x > 1 && q.y > 1 && q.x < 30 && q.y < 30).sort((a, c) => Math.hypot(c.x - mx, c.y - my) - Math.hypot(a.x - mx, a.y - my))[0]; g.player.x = far.x; g.player.y = far.y - .5; g.glide.z = 2; g.glide.vx = g.glide.vy = 0; }
// Carry the glide (as it is) into another section, as a long glide over the seams would.
function carryTo(g, rx, ry, x, y) { const keep = g.glide, home = g.glideHome; g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; g.glide = keep; g.glideHome = home; g.player.x = x; g.player.y = y; }

test('the tables: the window is drawn at the tree\'s own scale, and the crown spot neither opens the door nor moves the rest point', () => {
  assert.ok(Math.abs(TREE_GLIDE.window.drawn - LIFT_PER_LEVEL * CANOPY_LIFT) < 1e-9, 'TREE_GLIDE.window.drawn = LIFT_PER_LEVEL × CANOPY_LIFT');
  assert.ok(TREE_GLIDE.window.margin >= 1 && TREE_GLIDE.window.on === true && TREE_GLIDE.window.skimFree === true); assert.equal(TREE_GLIDE.home.crownWithin, 0);
  for (const [x, y] of treesOf(SEED, 4)) { const g = visit(x, y), s = crownSpot(g.map), gate = g.map.objects.find((o) => o.kind === 'canopyGate'), rest = g.map.objects.find((o) => o.kind === 'crownRest');
    assert.ok(s); g.player.x = s.x; g.player.y = s.y; assert.ok(onCrown(g), 'on the crown'); assert.ok(!(gate && Math.floor(s.x + .5) === gate.x && Math.floor(s.y + .75) === gate.y), 'not the door');
    assert.equal(g.touchCrownRest(), false, 'the Crown Rest is not touched'); assert.ok(rest); assert.ok(canopyTop(g.map.canopy) >= g.map.canopy.top); }
});

test('a glide from the crown that dies over a Pentagon (in another section) wakes on the crown it left, and its Crown Rest becomes the rest point', () => {
  const g = atTree(0), tree = [g.rx, g.ry], before = deaths(g), draughts = g.save.consumables.restorativeDraught;
  g.save.materials = { ...(g.save.materials || {}), wood: 7 }; const marks = g.save.marks, xp = g.save.xp;
  let { t } = launch(g); refuge(g); const cp0 = cpKey(g.save.activeCheckpoint); assert.ok(g.glide?.open, 'gliding'); assert.deepEqual([g.glideHome.rx, g.glideHome.ry], tree, 'the tree is remembered');
  const P = findPentagon(); assert.ok(P); let at = null, sec = null; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = visit(P.cx + dx, P.cy + dy); at = pentagonEdgeIn(v); if (at) { sec = [v.rx, v.ry]; break; } }
  assert.ok(at, 'a Pentagon edge'); g.deathBeat = 1;
  carryTo(g, sec[0], sec[1], at.x, at.y); g.glide.z = (T(g, at.tx, at.ty).elev || 0) + 6; let said = false;
  t = fly(g, 200, () => ({ x: 1, until: () => { said ||= g.message === GLIDER_FORBIDDEN.message; return g.player.hp <= 0 || !g.glide; } }), t);
  assert.ok(said, 'the Pentagon kills the glide'); assert.equal(g.player.hp, 0); t = fly(g, 80, () => ({}), t);
  assert.equal(deaths(g) - before, 1, 'still a death'); assert.deepEqual([g.rx, g.ry], tree, 'back at the tree\'s section'); assert.ok(onCrown(g), 'standing on its crown');
  assert.match(g.message, new RegExp(TREE_GLIDE.home.wake.slice(0, 30))); const rest = g.map.objects.find((o) => o.kind === 'crownRest'); assert.notEqual(cpKey(g.save.activeCheckpoint), cp0); assert.equal(cpKey(g.save.activeCheckpoint), cpKey({ rx: tree[0], ry: tree[1], x: rest.x, y: rest.y }), 'Decision 14 (2026-11-05): the crown\'s Crown Rest is now the rest point (was: unchanged)');
  assert.equal(g.glide, null); assert.equal(g.glideHome, null); assert.equal(g.save.glider, true, 'the glider is kept'); assert.equal(g.player.hp, g.save.maxHp);
  assert.equal(g.save.materials.wood, 7, 'carried wood is kept (release 345)'); assert.equal(g.save.marks, marks); assert.equal(g.save.xp, xp); assert.ok(g.save.consumables.restorativeDraught >= Math.min(2, draughts ?? 2));
  t = fly(g, 20, () => ({}), t); assert.ok(g.player.hp > 0 && onCrown(g), 'and stays there, alive');
});

test('deep water: a glide from the crown that comes down in the sea (no Tidemantle) wakes on the crown, with the death beat too', () => {
  for (const beat of [0, 1]) {
    const g = atTree(1), tree = [g.rx, g.ry], before = deaths(g); g.deathBeat = beat;
    let { t } = launch(g); refuge(g); overSea(g); // then the ground below is the open sea: everything but the tree itself
    t = fly(g, 600, () => ({ until: () => g.player.hp <= 0 || deaths(g) > before }), t); assert.ok(g.player.hp <= 0 || deaths(g) > before, 'drowned');
    t = fly(g, 80, () => ({}), t); assert.equal(deaths(g) - before, 1); assert.deepEqual([g.rx, g.ry], tree); assert.ok(onCrown(g), `on the crown (beat ${beat})`); assert.match(g.message, /^Lost beneath the water/);
  }
});

test('a folded glider\'s fatal drop and a glide that crosses seams before dying both wake on the crown', () => {
  { const g = atTree(2), tree = [g.rx, g.ry], before = deaths(g); let { t } = launch(g, false); assert.equal(g.glide.open, false, 'still folded');
    t = fly(g, 200, () => ({ until: () => deaths(g) > before || !g.glide }), t); t = fly(g, 3, () => ({}), t); assert.equal(deaths(g) - before, 1, 'the drop kills'); assert.deepEqual([g.rx, g.ry], tree); assert.ok(onCrown(g)); }
  { const g = atTree(0), tree = [g.rx, g.ry], before = deaths(g); let { t } = launch(g); // carried two sections west, then over open sea
    carryTo(g, tree[0] - 2, tree[1], 20, 15); for (const q of g.map.tiles) Object.assign(q, { kind: 'ocean', blocked: false, elev: 0, structure: null, canopy: false, pentagon: undefined, greatBuilding: undefined });
    g.glide.z = 3; t = fly(g, 300, () => ({ until: () => deaths(g) > before }), t); t = fly(g, 3, () => ({}), t);
    assert.equal(deaths(g) - before, 1); assert.deepEqual([g.rx, g.ry], tree, 'the tree\'s section is loaded again'); assert.ok(onCrown(g)); }
});

test('touching the ground ends it: a death after landing, or a glide begun below the crown, is the ordinary death', () => {
  { const g = atTree(0), before = deaths(g); let { t, d } = launch(g);
    for (const q of g.map.tiles) if (!q.canopy) Object.assign(q, { kind: 'grass', blocked: false, elev: 0, structure: null }); // open ground below
    t = fly(g, 800, () => ({ x: d[0], y: d[1] > 0 ? 1 : 0, until: () => !g.glide }), t); assert.equal(g.glide, null); assert.ok(g.player.hp > 0, 'landed alive');
    t = fly(g, 2, () => ({}), t); assert.equal(g.glideHome, null, 'standing on the ground clears it'); refuge(g); const cp = g.save.activeCheckpoint;
    g.player.hp = 0; t = fly(g, 3, () => ({}), t); assert.equal(deaths(g) - before, 1); assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [cp.rx, cp.ry, cp.x, cp.y], 'woke at the active rest point'); }
  { const g = atTree(0), top = g.map.canopy.top; // a branch well below the crown, over open air
    const br = g.map.tiles.find((t) => t.canopy && t.kind !== 'canopyTrunk' && !t.slope && t.elev >= GLIDE.minDrop + 2 && t.elev <= top - 6 && [[-1, 0], [1, 0], [0, 1]].some(([a, b]) => { const n = T(g, t.x + a, t.y + b); return n && !n.canopy && !n.blocked && (n.elev || 0) <= t.elev - GLIDE.minDrop; }));
    assert.ok(br, 'a low branch over open air'); const [a, b] = [[-1, 0], [1, 0], [0, 1]].find(([a, b]) => { const n = T(g, br.x + a, br.y + b); return n && !n.canopy && !n.blocked && (n.elev || 0) <= br.elev - GLIDE.minDrop; });
    refuge(g); Object.assign(g.player, { x: br.x, y: br.y - .25 }); let t = fly(g, 40, () => ({ x: a, y: b, until: () => !!g.glide }), 1000); assert.ok(g.glide, 'a freefall off the branch'); assert.equal(g.glideHome, null, 'not from the crown: nothing remembered');
    const cp = g.save.activeCheckpoint, n0 = deaths(g); t = fly(g, 200, () => ({ until: () => deaths(g) > n0 || !g.glide }), t); g.player.hp = 0; t = fly(g, 3, () => ({}), t);
    assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [cp.rx, cp.ry, cp.x, cp.y], 'the ordinary recovery'); }
});

test('exact resume: a glide saved mid-air keeps its tree and its state; a later death after reload still wakes on the crown', () => {
  const g = atTree(1), tree = [g.rx, g.ry]; let { t, d } = launch(g); t = fly(g, 6, () => ({ x: d[0], y: d[1] > 0 ? 1 : 0 }), t);
  const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t))); assert.deepEqual(snap.session.playerRuntime.glideHome, g.glideHome);
  const b = new Game(migrateSave(snap), 9000); b.enemies = [];
  assert.deepEqual(b.glideHome, g.glideHome, 'the tree is kept'); assert.deepEqual([b.rx, b.ry, b.player.x, b.player.y], [g.rx, g.ry, g.player.x, g.player.y], 'where it was');
  assert.deepEqual([b.glide.z, b.glide.vx, b.glide.vy, b.glide.open], [g.glide.z, g.glide.vx, g.glide.vy, g.glide.open], 'the glide as it was');
  refuge(b); overSea(b); const before = deaths(b);
  let u = fly(b, 600, () => ({ until: () => deaths(b) > before }), 9000); u = fly(b, 3, () => ({}), u); assert.equal(deaths(b) - before, 1); assert.deepEqual([b.rx, b.ry], tree); assert.ok(onCrown(b));
  // and once landed, a save carries no stale tree (playerRuntime keeps unknown fields, so the key is always written)
  const h = atTree(1); ({ t } = launch(h)); for (const q of h.map.tiles) if (!q.canopy) Object.assign(q, { kind: 'grass', blocked: false, elev: 0, structure: null });
  t = fly(h, 800, () => ({ x: d[0], until: () => !h.glide }), t); t = fly(h, 2, () => ({}), t); const s2 = JSON.parse(JSON.stringify(h.exportSnapshot(t))); assert.equal(s2.session.playerRuntime.glideHome, null); assert.equal(new Game(migrateSave(s2), 0).glideHome, null);
  // Wayglass travel clears it too
  const w = atTree(1); launch(w); assert.ok(w.glideHome); w.clearCarriedStates(); assert.equal(w.glideHome, null);
});

// --------------------------------------------------------------------------------------------------------------- the window
test('inside the window a glide cannot go north (stick or momentum); east, west and south still move it; outside it, north works', () => {
  const g = atTree(0), b = g.map.canopy.box, M = TREE_GLIDE.window.margin, north = Math.ceil(canopyTop(g.map.canopy) * TREE_GLIDE.window.drawn);
  assert.ok(treeGlideWindowAt(g.map, b.x + b.n / 2 - .5, b.y + b.n / 2 - .7), 'the tree\'s middle'); assert.ok(treeGlideWindowAt(g.map, b.x + b.n / 2 - .5, b.y - north - M + .1 - .69), 'the drawn rows north of it');
  assert.ok(!treeGlideWindowAt(g.map, b.x - M - 1.6, b.y), 'beyond the margin west'); assert.ok(!treeGlideWindowAt(g.map, b.x + b.n / 2, b.y + b.n + M + .5), 'beyond the margin south');
  const glideAt = (x, y, z = 60, vy = 0) => { g.player.x = x; g.player.y = y; g.glide = { z, vx: 0, vy, open: true, told: false }; g.skyAir = null; };
  const mx = b.x + b.n / 2 - .5, my = b.y + b.n / 2 - .7; let t = 1000;
  glideAt(mx, my, 60, -GLIDE.speed); const y0 = g.player.y; let minY = y0; t = fly(g, 40, () => ({ y: -1, until: () => { minY = Math.min(minY, g.player.y); return !g.glide; } }), t);
  assert.ok(minY >= y0 - 1e-9, `held north (moved ${(y0 - minY).toFixed(3)} north)`); assert.ok(g.glide.vy >= 0);
  for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [-1, -1]]) { glideAt(mx, my); const x0 = g.player.x, yy = g.player.y; t = fly(g, 10, () => ({ x, y }), t);
    if (x) assert.ok(Math.sign(g.player.x - x0) === x && Math.abs(g.player.x - x0) > .5, `x ${x}`); if (y > 0) assert.ok(g.player.y - yy > .5, 'south'); if (y < 0) assert.ok(g.player.y >= yy - 1e-9, 'a diagonal keeps only its east-west part'); }
  glideAt(b.x - M - 3, 20); const y1 = g.player.y; t = fly(g, 10, () => ({ y: -1 }), t); assert.ok(y1 - g.player.y > .5, 'outside the window north is free');
});

test('the window never pins a glide: held skimming with only north open, it gets out; high and walled in, it simply sinks and lands', () => {
  const g = atTree(0), b = g.map.canopy.box, cx = Math.floor(b.x + b.n / 2), cy = Math.max(3, b.y - 3); // a spot inside the window, north of the tree
  assert.ok(treeGlideWindowAt(g.map, cx - .5, cy - .7));
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) Object.assign(T(g, x, y), { kind: 'rock', blocked: true, elev: 0, canopy: false, slope: false, structure: null }); // low blocked rock: nowhere to land
  for (let y = cy - 1; y <= cy + 1; y++) { Object.assign(T(g, cx - 1, y), { elev: 9 }); Object.assign(T(g, cx + 1, y), { elev: 9 }); } Object.assign(T(g, cx, cy + 1), { elev: 9 }); // tall walls east, west, south
  for (let y = 0; y < cy; y++) Object.assign(T(g, cx, y), { kind: 'grass', blocked: false }); // open ground just north
  g.player.x = cx; g.player.y = cy - .5; g.glide = { z: .3, vx: 0, vy: 0, open: true, told: false }; const y0 = g.player.y; // footprint on tile (cx, cy) alone
  let t = fly(g, 400, () => ({ y: -1, until: () => !g.glide }), 1000); assert.equal(g.glide, null, 'it came down'); assert.ok(g.player.y < y0 - .3, `it went north to land (${(y0 - g.player.y).toFixed(2)})`); assert.ok(g.player.hp > 0);
  const h = atTree(0); for (const q of h.map.tiles) Object.assign(q, { kind: 'grass', blocked: false, elev: 0, canopy: false, slope: false, structure: null }); // high in the window, walled east, west, south by nothing it can pass: it lands
  for (let y = cy - 1; y <= cy + 1; y++) { Object.assign(T(h, cx - 1, y), { elev: 30 }); Object.assign(T(h, cx + 1, y), { elev: 30 }); } Object.assign(T(h, cx, cy + 1), { elev: 30 });
  h.player.x = cx; h.player.y = cy - .5; h.glide = { z: 20, vx: 0, vy: 0, open: true, told: false }; fly(h, 400, (i) => ({ x: [1, -1, 0, 0][i % 4], y: [0, 0, 1, -1][i % 4], until: () => !h.glide }), 1000);
  assert.equal(h.glide, null, 'landed'); assert.ok(h.player.hp > 0);
  // Held over a wide flat roof of blocked rock (no window here), it skims on across it to open ground and lands; before, it hung there.
  const r = atTree(0); for (const q of r.map.tiles) Object.assign(q, { kind: 'rock', blocked: true, elev: 0, canopy: false, slope: false, structure: null }); r.map.canopy = null;
  for (let y = 0; y < 32; y++) for (let x = 20; x < 32; x++) Object.assign(T(r, x, y), { kind: 'grass', blocked: false }); r.player.x = 10; r.player.y = 10; r.glide = { z: .3, vx: 0, vy: 0, open: true, told: false };
  fly(r, 30, () => ({}), 1000); assert.ok(r.glide && r.player.x === 10, 'held over the rock'); fly(r, 300, () => ({ x: 1, until: () => !r.glide }), 3000); assert.equal(r.glide, null); assert.ok(r.player.x > 19, 'came down on the grass'); assert.ok(r.player.hp > 0);
});

test('walking, climbing and the drone are untouched by the window', () => {
  const g = atTree(0), b = g.map.canopy.box, cx = Math.floor(b.x + b.n / 2), cy = Math.max(4, b.y - 3);
  for (const q of g.map.tiles) Object.assign(q, { kind: 'grass', blocked: false, elev: 0, canopy: false, slope: false, structure: null, skyPlatform: undefined });
  g.player.x = cx - .5; g.player.y = cy; assert.ok(treeGlideWindowAt(g.map, g.player.x, g.player.y)); let y0 = g.player.y; fly(g, 10, () => ({ y: -1 }), 1000); assert.ok(y0 - g.player.y > .5, 'walking north');
  const d = atTree(0); for (const q of d.map.tiles) Object.assign(q, { kind: 'grass', blocked: false, elev: 0, canopy: false, slope: false, structure: null, skyPlatform: undefined });
  d.save.consumables.submersible = 1; d.save.perception.aperture = 3255; d.save.farArray = { listeners: 10, gate: 5 }; setMechMode(d.save, 'drone'); d.useConsumable('submersible', 0); assert.ok(d.droneUp()); d.save.mech.fuel = DRONE.carry;
  d.player.x = cx - .5; d.player.y = cy; d.droneLift = { base: 0, z: 3, vz: 0 }; d.jumpUntil = 1e9; y0 = d.player.y; fly(d, 10, () => ({ y: -1, hold: true }), 1000); assert.ok(y0 - d.player.y > .5, 'the drone flies north'); assert.equal(d.glide, null);
});

// ------------------------------------------------------------------------------------------------- the 763 height rule, swept
// From tiles on the tree and the ground about it, a glide at that tile's height steered by a seeded random stick (north included,
// with the window and without it) never rises from one frame to the next and never ends on ground higher than it began; a glide
// that ends on the tree ends no higher. The crown is excluded only as a landing: it is the start of the tallest glides.
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
test('a glide begun anywhere on or near a great tree never ends higher than it began, nor gains height on the way (with and without the window)', () => {
  let glides = 0, landedOnTree = 0, worst = -Infinity;
  for (const on of [true, false]) {
    TREE_GLIDE.window.on = on;
    try {
      for (const [k, seed] of [[0, SEED], [1, SEED], [0, 'GLIDEHOME2']]) {
        const base = atTree(k, seed), b = base.map.canopy.box, R = rng(k * 97 + seed.length * 31 + (on ? 1 : 0));
        const starts = base.map.tiles.filter((t) => t.x >= b.x - 3 && t.x < b.x + b.n + 3 && t.y >= b.y - 3 && t.y < b.y + b.n + 3 && !t.blocked && (t.canopy || (t.elev || 0) >= 0));
        for (let i = 0; i < 14; i++) {
          const st = starts[Math.floor(R() * starts.length)], g = visit(base.rx, base.ry, seed), z0 = Math.max(GLIDE.skim, (st.elev || 0) + (st.canopy ? 0 : GLIDE.minDrop));
          g.player.x = st.x; g.player.y = st.y - .25; g.glide = { z: z0, vx: 0, vy: 0, open: R() < .8, told: false }; if (!g.glide.open) g.glide.fallFrom = z0; g.skyAir = null;
          let last = z0, t = 1000, sx = 0, sy = -1;
          for (let f = 0; f < 700 && g.glide; f++) { if (f % 8 === 0) { const a = R() * Math.PI * 2; sx = Math.cos(a); sy = R() < .35 ? -1 : Math.sin(a); } g.enemies = []; g.update(.05, input({ x: sx, y: sy, jump: R() < .03 }), t); t += 50;
            if (g.glide) { worst = Math.max(worst, g.glide.z - last); assert.ok(g.glide.z <= last + 1e-9, `the glide rose ${g.glide.z - last}`); last = g.glide.z; } }
          if (g.glide || !(g.player.hp > 0)) continue; glides++;
          const w = 32, under = g.map.tiles[Math.floor(g.player.y + .75) * w + Math.floor(g.player.x + .5)], at = elevationAt(g.map, w, g.player.x, g.player.y);
          assert.ok(at <= z0 + 1e-6, `landed at ${at} from ${z0} (${seed} ${k}, window ${on})`); if (under?.canopy) { landedOnTree++; assert.ok((under.elev || 0) <= z0 + 1e-6); }
        }
      }
    } finally { TREE_GLIDE.window.on = true; }
  }
  if (process.env.SURVEY) console.log("SWEEP", glides, landedOnTree, worst);
  assert.ok(glides >= 40, `enough glides came down alive (${glides}; ${landedOnTree} on the tree)`); assert.ok(worst <= 0, `largest frame-to-frame change ${worst}`);
});
