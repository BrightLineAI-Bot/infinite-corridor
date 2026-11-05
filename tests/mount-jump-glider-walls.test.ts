// Tim's decisions of 2026-11-05 on riding, the glider and the drone:
// 1. A jump on a mount does not dodge attacks (no invulnerability, unlike a dodge). The general jump rules stay: ground attacks
//    marked `jumpable` pass under any jump, and on foot a jump still clears an ordinary creature's blow.
// 2. The glider cannot fly over the Pentagon's walls or a Great Castle's wings: it is held off the drone fizzle's zones
//    (vehicle-gates.ts DRONE_FIZZLE) at any height, with the zone's message. A glide off the Pentagon's roof still works.
// 3. After a drone fizzle the drone is stowed, not lost, and it stays so over a save and exact resume.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, GLIDE } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave } from '../src/types.ts';
import { stableMount, MOUNT_BEASTS } from '../src/beast-mounts.ts';
import { DRONE, DRONE_FIZZLE, droneZoneOf, droneForbiddenAt, setMechMode } from '../src/vehicle-gates.ts';
import { PENTAGON, pentagonClosedAt } from '../src/pentagon.ts';
import { quarterSection, castleTopology } from '../src/castles.ts';
import { roofLanding } from '../src/great-buildings.ts';

const W = 32, SEED = 'TIM1', SECTION_EDGE = 31.2;
const T = (g, x, y) => g.map.tiles[y * W + x];
const input = (f = {}) => ({ state: { x: f.x || 0, y: f.y || 0 }, consume: (k) => k === 'jump' && !!f.jump, held: (k) => k === 'jump' && !!f.hold });
function fly(g, frames, plan, t0) { let t = t0; for (let i = 0; i < frames; i++) { const f = plan(i) || {}; g.update(.05, input(f), t); t += 50; if (f.until?.()) break; } return t; }
const deaths = (g) => g.save.worldFlags.deaths || 0;

// ---------------------------------------------------------------------------------------------- 1. a mount's jump dodges nothing
function flat(g) { for (const t of g.map.tiles) Object.assign(t, { kind: 'grass', blocked: false, structure: null, buildingId: null, perch: false, door: null, slope: null, elev: 0, environment: null, landscape: undefined, chasm: undefined, skyPlatform: undefined, greatBuilding: undefined, pentagon: undefined }); g.map.objects = []; }
function field(seed, mounted) {
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = 4; g.ry = 3; g.loadArea('overworld', false); flat(g); g.enemies = []; g.builds = []; g.map.enemySpawns = [];
  g.player.x = 10; g.player.y = 10; g.player.facing = 'right';
  if (mounted) { stableMount(g.save, 'briarStag'); assert.match(g.summonMount().message, /answers/); assert.ok(g.mountRide()); }
  return g;
}

test('a mounted jump grants no invulnerability: the dodge clock and the hit guard are untouched by the leap', () => {
  const g = field('MJ1', true), p = g.player; let t = 1000;
  t = fly(g, 2, () => ({}), t); const inv = p.invulnerableUntil || 0, dodge = p.dodgeUntil || 0;
  t = fly(g, 1, () => ({ jump: true }), t); assert.ok(t - 50 < g.jumpUntil, 'in the air'); assert.ok(g.mountLeap(t - 50), 'a mount\'s leap');
  assert.ok(g.jumpDur > 520 * 1.4, `the mount leaps farther (${g.jumpDur} ms)`);
  for (let i = 0; i < 6; i++) { assert.equal(p.invulnerableUntil || 0, inv, 'no i-frames from the leap'); assert.equal(p.dodgeUntil || 0, dodge, 'not a dodge'); t = fly(g, 1, () => ({}), t); }
});

test('an ordinary creature\'s blow lands on a rider mid-leap; on foot the jump still clears it', () => {
  const hits = {};
  for (const mounted of [false, true]) {
    const g = field('MJ2', mounted), e = createCombatant('ashling', 10.6, 10, false, []); g.enemies = [e];
    const hp0 = g.player.hp; let t = 1000;
    for (let i = 0; i < 120; i++) { g.jumpStart = t; g.jumpUntil = t + 400; g.update(.05, input(), t); t += 50; } // held in the air the whole time
    hits[mounted ? 'mounted' : 'foot'] = hp0 - g.player.hp;
  }
  assert.equal(hits.foot, 0, 'on foot, in the air: the blow passes under (the general jump rule)');
  assert.ok(hits.mounted > 0, `riding, in the air: the blow lands (${hits.mounted} lost)`);
});

test('a creature\'s attack lands on a rider mid-leap unless it is a jumpable ground attack (that rule is every jump\'s)', () => {
  const g = field('MJ3', true), p = g.player, src = createCombatant('ashling', 11, 10, false, []); g.enemies = [src];
  let t = fly(g, 1, () => ({ jump: true }), 1000); const now = t - 25; assert.ok(g.mountLeap(now));
  p.invulnerableUntil = 0; const hp = p.hp;
  assert.equal(g.packHurt(src, 10, { jumpable: true }, now), false, 'a ground wave passes under the leap'); assert.equal(p.hp, hp);
  assert.equal(g.packHurt(src, 10, {}, now), true, 'anything else lands'); assert.ok(p.hp < hp);
  // the same on foot, for comparison: jumpable passes, the rest lands
  const f = field('MJ3', false), q = f.player, s2 = createCombatant('ashling', 11, 10, false, []); f.enemies = [s2]; t = fly(f, 1, () => ({ jump: true }), 1000);
  q.invulnerableUntil = 0; const h2 = q.hp; assert.equal(f.packHurt(s2, 10, { jumpable: true }, t - 25), false); assert.equal(f.packHurt(s2, 10, {}, t - 25), true); assert.ok(q.hp < h2);
  assert.ok(MOUNT_BEASTS.briarStag.jump > 1, 'the mount still jumps farther');
});

// ----------------------------------------------------------------------------------------- 2. the glider and the closed blocks
const save = () => { const s = freshSave(); s.seed = SEED; s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; s.maxHp = 100; s.glider = true; return s; };
const visit = (rx, ry) => { const g = new Game(save(), 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.save.maxHp; return g; };
let pent = null; const findPentagon = () => pent ||= (() => { const g = new Game(save(), 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { cx, cy }; return null; })();
let cas = null; const findCastle = () => cas ||= (() => { const g = visit(0, 0); for (let d = 3; d < 60; d += 3) for (let X = -d; X <= d; X += 3) for (const Y of [d - Math.abs(X), Math.abs(X) - d]) if (g.castleHere(X, Y)) return { X, Y }; return null; })();
// A spot on flat open ground with a `zone` block straight east: three clear tiles west of it.
function wallSpot(g, zone) {
  for (let ty = 2; ty < 30; ty++) for (let tx = 5; tx < 30; tx++) {
    if (droneZoneOf(T(g, tx, ty))?.id !== zone) continue;
    const run = [1, 2, 3, 4].map((d) => T(g, tx - d, ty)), e0 = run[0].elev || 0;
    if (run.every((q) => !q.blocked && !droneZoneOf(q) && !q.slope && (q.elev || 0) === e0 && !['lava', 'canyon', 'river', 'abyss', 'deepWater', 'ocean'].includes(q.kind)) && [ty - 1, ty + 1].every((yy) => !droneZoneOf(T(g, tx - 1, yy))))
      return { x: tx - .8, y: ty - .5, tx, ty, e0 };
  }
  return null;
}
function pentagonWall() { const P = findPentagon(); assert.ok(P, 'a Pentagon'); for (const [dx, dy] of [[1, 0], [0, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) { const g = visit(P.cx + dx, P.cy + dy); const at = wallSpot(g, 'pentagon'); if (at) return { g, at }; } assert.fail('no Pentagon wall'); }
function castleWall() { const C = findCastle(); assert.ok(C, 'a Great Castle'); for (const q of [0, 1, 2, 3]) { const s = quarterSection(C.X, C.Y, q), g = visit(s.rx, s.ry), at = wallSpot(g, 'castle'); if (at) return { g, at }; } assert.fail('no castle wing'); }
const glideAt = (g, x, y, z) => { g.player.x = x; g.player.y = y; g.glide = { z, vx: 0, vy: 0, open: true, told: false }; g.skyAir = null; };

for (const [what, find, zone] of [['the Pentagon\'s walls', pentagonWall, 'pentagon'], ['a Great Castle\'s wing', castleWall, 'castle']]) {
  test(`a glide high over ${what} is held off it, says why once, and comes down alive short of the wall`, () => {
    const { g, at } = find(), Z = DRONE_FIZZLE.zones.find((q) => q.id === zone), wallElev = T(g, at.tx, at.ty).elev || 0, z = wallElev + 3;
    assert.ok(z - .5 > wallElev, 'higher than the wall: only the zone holds it'); const before = deaths(g), rx = g.rx, ry = g.ry;
    glideAt(g, at.x, at.y, z); let t = 1000, said = 0;
    t = fly(g, 200, () => ({ x: 1, until: () => { if (g.message === Z.glide) said++; return !g.glide; } }), t);
    assert.equal(g.glide, null, 'landed'); assert.ok(g.player.x + .76 <= at.tx + 1e-6, `never over the wall (x ${g.player.x.toFixed(2)}, wall ${at.tx})`);
    assert.equal(droneForbiddenAt(g.map, W, g.player.x, g.player.y), null); assert.equal(`${g.rx},${g.ry}`, `${rx},${ry}`);
    assert.ok(said >= 1, 'the zone\'s message shows'); assert.match(Z.glide, /rules are different here/);
    assert.ok(g.save.narrative.journal.some((j) => j.recordId === `glide-held:${zone}`), 'journalled once');
    assert.equal(g.save.narrative.journal.filter((j) => j.recordId === `glide-held:${zone}`).length, 1);
    assert.equal(deaths(g), before, 'alive'); assert.equal(g.player.hp, g.save.maxHp, 'an open glide lands softly');
    assert.equal(g.save.glider, true, 'the glider is still yours');
  });
}

test('the glider elsewhere is unchanged: over an ordinary wall it passes when higher, and a glide from beside a zone steered away is free', () => {
  const g = visit(3, 3); flat(g); for (let y = 0; y < 32; y++) for (let x = 14; x < 16; x++) Object.assign(T(g, x, y), { blocked: true, kind: 'rock', elev: 1 });
  glideAt(g, 10, 10.5, 4); let t = fly(g, 200, () => ({ x: 1, until: () => !g.glide }), 1000); assert.ok(g.player.x > 16, `over the ordinary wall (x ${g.player.x.toFixed(2)})`); assert.equal(g.player.hp, g.save.maxHp);
  const { g: h, at } = pentagonWall(); glideAt(h, at.x, at.y, 6); t = fly(h, 12, () => ({ x: -1 }), 1000);
  assert.ok(h.glide && h.player.x < at.x - .8, `steered away from the wall, it glides on freely (x ${h.player.x.toFixed(2)})`); assert.equal(h.glide.held, undefined); assert.notEqual(h.message, DRONE_FIZZLE.zones[0].glide);
});

function roofSection() {
  const P = findPentagon(); for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const g = visit(P.cx + dx, P.cy + dy); if (!g.map.pentagon?.roof) continue;
    // a roof tile with open land straight outward (east or west) for six tiles
    for (let y = 3; y < 29; y++) for (let x = 6; x < 26; x++) { const r = T(g, x, y); if (!r.pentRoof) continue;
      for (const d of [1, -1]) { const run = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => T(g, x + d * k, y)); if (run.every((q) => q && !q.blocked && !q.greatBuilding && !droneZoneOf(q) && (q.elev || 0) <= 1) && [y - 1, y + 1].every((yy) => run.every((q, k) => !droneZoneOf(T(g, x + d * (k + 1), yy)))) && !droneZoneOf(T(g, x - d, y)) && !droneZoneOf(T(g, x, y - 1)) && !droneZoneOf(T(g, x, y + 1))) return { g, x, y, d }; } } }
  return null;
}

test('the Pentagon\'s roof (release 752): a glide off it outward carries you down over the land; one from higher ground lands on the roof against the parapet', () => {
  const R = roofSection(); assert.ok(R, 'a roof edge with land beyond'); const { g, x, y, d } = R;
  assert.equal(T(g, x, y).elev, PENTAGON.roof.elev); g.player.x = x - .5 + .5 * 0; g.player.y = y - .5; const before = deaths(g);
  assert.equal(droneForbiddenAt(g.map, W, g.player.x, g.player.y), null, 'the roof is not a zone');
  let t = fly(g, 40, () => ({ x: d, until: () => !!g.glide }), 1000); assert.ok(g.glide, 'off the edge: a freefall'); t = fly(g, 1, () => ({ jump: true, x: d }), t); assert.equal(g.glide?.open, true, 'Jump opens the glider');
  const rx = g.rx; t = fly(g, 200, (i) => ({ x: i < 10 ? d : 0, until: () => !g.glide }), t); assert.equal(g.glide, null); assert.equal(g.rx, rx); assert.equal(deaths(g), before, 'alive'); assert.ok(g.player.hp > 0);
  assert.ok(d > 0 ? g.player.x > x + 3 : g.player.x < x - 3, 'out over the land'); assert.ok(!T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75)).pentRoof, 'down on the land');
  assert.ok(!g.save.narrative.journal.some((j) => j.recordId === 'glide-held:pentagon'), 'nothing held it');
  // From higher ground outside, steered in: it comes down on the roof, held off the parapet beyond.
  const h = visit(g.rx, g.ry); glideAt(h, x + d * 3 - .5, y - .5, PENTAGON.roof.elev + 2.5); t = fly(h, 300, () => ({ x: -d, until: () => !h.glide }), 1000);
  assert.equal(h.glide, null); const under = T(h, Math.floor(h.player.x + .5), Math.floor(h.player.y + .75)); assert.ok(under.pentRoof, `on the roof (${under.kind} e${under.elev})`);
  assert.equal(h.player.hp, h.save.maxHp); assert.equal(droneForbiddenAt(h.map, W, h.player.x, h.player.y), null);
});

test('a glide over a seam inside a Pentagon is held off the walls of the section beyond (pure geometry of the section beyond)', () => {
  const P = findPentagon(); let found = null;
  for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0], [-1, 1], [0, 1]]) { const g = visit(P.cx + dx, P.cy + dy), roof = !!g.map.pentagon?.roof;
    for (let ty = 2; ty < 30 && !found; ty++) { const near = [27, 28, 29, 30, 31].map((x) => T(g, x, ty)); if (!near.every((q) => !q.blocked && !droneZoneOf(q) && (q.elev || 0) === (near[0].elev || 0))) continue;
      if ([ty - 1, ty + 1].some((yy) => [27, 28, 29, 30, 31].some((x) => droneZoneOf(T(g, x, yy))))) continue;
      if (pentagonClosedAt(P.cx, P.cy, g.rx + 1, g.ry, 0, ty, roof) || pentagonClosedAt(P.cx, P.cy, g.rx + 1, g.ry, 1, ty, roof)) found = { g, ty }; }
    if (found) break; }
  assert.ok(found, 'a seam where the far side is wall and the near side open');
  const { g, ty } = found, rx = g.rx; assert.equal(g.glideSeamZone(31.3, ty - .5)?.id, 'pentagon'); assert.equal(g.glideSeamZone(20, ty - .5), null, 'in the section: not a seam');
  glideAt(g, 27.5, ty - .5, 8); let t = fly(g, 200, () => ({ x: 1, until: () => !g.glide }), 1000);
  assert.equal(g.rx, rx, 'it never crossed into the wall'); assert.equal(g.glide, null); assert.ok(g.player.x <= SECTION_EDGE, `held at the seam (x ${g.player.x.toFixed(2)})`); assert.equal(g.player.hp, g.save.maxHp);
  // The court of one section runs on into the court of the next: there the seam is open and the glide crosses.
  for (let cy = 0; cy < 32; cy++) for (let x = 0; x < 2; x++) assert.equal(pentagonClosedAt(P.cx, P.cy, P.cx + 5, P.cy, x, cy), false, 'outside the Pentagon: nothing');
});

test('exact resume: a glide saved while held at a Pentagon wall reloads where it was and is still held', () => {
  const { g, at } = pentagonWall(); glideAt(g, at.x, at.y, 7); let t = fly(g, 8, () => ({ x: 1 }), 1000);
  assert.ok(g.glide && g.glide.held === 'pentagon', 'held'); const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t)));
  const b = new Game(snap, 9000); assert.ok(b.glide, 'the glide resumes in the air'); assert.equal(b.player.x, g.player.x); assert.equal(b.player.y, g.player.y); assert.equal(b.glide.z, g.glide.z); assert.equal(b.glide.open, true);
  const tb = fly(b, 200, () => ({ x: 1, until: () => !b.glide }), 9000); assert.ok(tb > 9000); assert.equal(b.glide, null);
  assert.ok(b.player.x + .76 <= at.tx + 1e-6, 'still never over the wall'); assert.equal(b.player.hp, b.save.maxHp);
});

test('the castle keep\'s top: a glide off it is held by the wings and comes down alive in the keep\'s court', () => {
  const C = findCastle(), k = quarterSection(C.X, C.Y, castleTopology(SEED, C.X, C.Y).k), g = visit(k.rx, k.ry), L = roofLanding(g.map, 'keep'); assert.ok(L);
  g.player.x = L.x; g.player.y = L.y; const dx = L.x > 16 ? -1 : 1, dy = L.y > 16 ? -1 : 1, before = deaths(g);
  let t = fly(g, 30, () => ({ x: dx, until: () => !!g.glide }), 1000); assert.ok(g.glide); t = fly(g, 1, () => ({ jump: true, x: dx, y: dy }), t); assert.equal(g.glide.open, true);
  t = fly(g, 300, () => ({ x: dx, y: dy, until: () => !g.glide }), t); assert.equal(g.glide, null); assert.equal(deaths(g), before, 'alive');
  const q = T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75)); assert.ok(q.courtyard, `in the court (${q.kind})`);
});

// ------------------------------------------------------------------------------------------ 3. the drone, stowed after a fizzle
test('a drone fizzle stows the drone (built, not lost): it can be called again at once, and after a save and reload', () => {
  const { g, at } = pentagonWall(); setMechMode(g.save, 'drone'); g.useConsumable('submersible', 0); g.save.mech.fuel = DRONE.carry; assert.ok(g.droneUp());
  g.player.x = at.x; g.player.y = at.y; let t = fly(g, 1, () => ({ jump: true }), 1000); t = fly(g, 1, () => ({ jump: true, hold: true }), t); assert.ok(g.droneLift);
  g.droneLift.z = g.droneLift.base + 1.05; g.droneLift.vz = 0; t = fly(g, 20, () => ({ x: 1, hold: true, until: () => !!g.droneFizzleFx }), t);
  assert.ok(g.droneFizzleFx, 'fizzled'); assert.equal(g.player.hp, g.save.maxHp, 'a level up: no harm');
  const m = g.save.mech; assert.equal(m.active, false, 'stowed'); assert.equal(m.built, true, 'not lost'); assert.equal(m.mode, 'drone'); assert.equal(g.save.consumables.submersible, 0, 'no new frame needed');
  t = fly(g, 4, () => ({}), t); const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t)));
  const b = new Game(snap, 9000); assert.equal(b.droneUp(), false); assert.equal(b.save.mech.built, true); assert.equal(b.save.mech.mode, 'drone'); assert.equal(b.player.x, g.player.x); assert.equal(b.player.y, g.player.y);
  assert.equal(b.toggleMech(), true, b.message); assert.ok(b.droneUp(), 'called up again after the reload'); assert.match(b.message, /drone lifts off/);
  assert.equal(g.toggleMech(), true, g.message); assert.ok(g.droneUp(), 'and in the same session');
});
