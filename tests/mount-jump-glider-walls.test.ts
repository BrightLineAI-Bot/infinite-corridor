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
import { DRONE, DRONE_LIFT, DRONE_FIZZLE, GLIDER_FORBIDDEN, gliderForbiddenAt, droneZoneOf, setMechMode } from '../src/vehicle-gates.ts';
import { PENTAGON } from '../src/pentagon.ts';
import { quarterSection, castleTopology } from '../src/castles.ts';
import { roofLanding } from '../src/great-buildings.ts';

const W = 32, SEED = 'TIM1';
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
function wallSpot(g, zone, outside = false) { // outside: the run and its sides lie off every Pentagon tile (not in a court)
  for (let ty = 2; ty < 30; ty++) for (let tx = 5; tx < 30; tx++) {
    if (droneZoneOf(T(g, tx, ty))?.id !== zone) continue;
    const run = [1, 2, 3, 4].map((d) => T(g, tx - d, ty)), e0 = run[0].elev || 0;
    if (run.every((q) => !q.blocked && !droneZoneOf(q) && !(outside && q.pentagon) && !q.slope && (q.elev || 0) === e0 && !['lava', 'canyon', 'river', 'abyss', 'deepWater', 'ocean'].includes(q.kind)) && [ty - 1, ty + 1].every((yy) => !droneZoneOf(T(g, tx - 1, yy)) && !(outside && [1, 2, 3, 4].some((d) => T(g, tx - d, yy).pentagon))))
      return { x: tx - .8, y: ty - .5, tx, ty, e0 };
  }
  return null;
}
function pentagonWall(outside = false) { const P = findPentagon(); assert.ok(P, 'a Pentagon'); for (const [dx, dy] of [[1, 0], [0, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) { const g = visit(P.cx + dx, P.cy + dy); const at = wallSpot(g, 'pentagon', outside); if (at) return { g, at }; } assert.fail('no Pentagon wall'); }
function castleWall() { const C = findCastle(); assert.ok(C, 'a Great Castle'); for (const q of [0, 1, 2, 3]) { const s = quarterSection(C.X, C.Y, q), g = visit(s.rx, s.ry), at = wallSpot(g, 'castle'); if (at) return { g, at }; } assert.fail('no castle wing'); }
// A spot on open land outside a Pentagon with its first tile (wall or roof) straight east: { x, y, tx, ty }.
function pentagonEdge() {
  const P = findPentagon(); assert.ok(P, 'a Pentagon');
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const g = visit(P.cx + dx, P.cy + dy);
    for (let ty = 2; ty < 30; ty++) for (let tx = 6; tx < 30; tx++) { if (!T(g, tx, ty).pentagon) continue;
      const ok = (q) => q && !q.blocked && !q.pentagon && !['lava', 'canyon', 'river', 'abyss', 'deepWater', 'ocean'].includes(q.kind);
      if ([1, 2, 3, 4, 5].every((d) => ok(T(g, tx - d, ty)) && !T(g, tx - d, ty - 1).pentagon && !T(g, tx - d, ty + 1).pentagon)) return { g, at: { x: tx - .8, y: ty - .5, tx, ty } }; } }
  assert.fail('no Pentagon edge');
}
const glideAt = (g, x, y, z) => { g.player.x = x; g.player.y = y; g.glide = { z, vx: 0, vy: 0, open: true, told: false }; g.skyAir = null; };

const pentTile = (g, x, y) => !!gliderForbiddenAt(g.map, W, x, y);
// Frames of a glide, recording the largest rise of z from one frame to the next (Tim: a glide never climbs).
function glideWatch(g, frames, plan, t0) { let t = t0, rise = -Infinity, last = g.glide?.z; for (let i = 0; i < frames && g.glide; i++) { const f = plan(i) || {}; g.update(.05, input(f), t); t += 50; if (g.glide) { rise = Math.max(rise, g.glide.z - last); last = g.glide.z; } if (f.until?.()) break; } return { t, rise }; }

test('a glide that reaches a Pentagon wall kills the Wayfarer, whatever its height, says why and journals it once', () => {
  for (const z of [2, 9]) {
    const { g, at } = pentagonEdge(); const before = deaths(g); g.deathBeat = 1; glideAt(g, at.x, at.y, (T(g, at.tx, at.ty).elev || 0) + z); let t = 1000, said = false;
    t = fly(g, 200, () => ({ x: 1, until: () => { said ||= g.message === GLIDER_FORBIDDEN.message; return !g.glide; } }), t);
    assert.equal(g.glide, null); assert.ok(said, `the message shows (z ${z})`); assert.equal(g.player.hp, 0, 'dead');
    fly(g, 60, () => ({}), t); assert.equal(deaths(g) - before, 1, 'the ordinary death');
    assert.equal(g.save.narrative.journal.filter((j) => j.recordId === GLIDER_FORBIDDEN.journal).length, 1, 'journalled once');
    assert.equal(g.save.glider, true, 'the glider is not lost');
  }
  assert.match(GLIDER_FORBIDDEN.message, /rules are different here/);
});

test('a Great Castle\'s wing still only holds the glider off: it comes down alive short of the wall', () => {
  const { g, at } = castleWall(), Z = DRONE_FIZZLE.zones.find((q) => q.id === 'castle'), z = (T(g, at.tx, at.ty).elev || 0) + 3, before = deaths(g);
  glideAt(g, at.x, at.y, z); let said = 0; fly(g, 200, () => ({ x: 1, until: () => { if (g.message === Z.glide) said++; return !g.glide; } }), 1000);
  assert.equal(g.glide, null); assert.ok(g.player.x + .76 <= at.tx + 1e-6, 'never over the wall'); assert.ok(said >= 1);
  assert.equal(g.save.narrative.journal.filter((j) => j.recordId === 'glide-held:castle').length, 1); assert.equal(deaths(g), before); assert.equal(g.player.hp, g.save.maxHp);
});

test('the glider elsewhere: over an ordinary wall it passes when higher, and a glide beside a Pentagon steered away is free', () => {
  const g = visit(3, 3); flat(g); for (let y = 0; y < 32; y++) for (let x = 14; x < 16; x++) Object.assign(T(g, x, y), { blocked: true, kind: 'rock', elev: 1 });
  glideAt(g, 10, 10.5, 4); fly(g, 200, () => ({ x: 1, until: () => !g.glide }), 1000); assert.ok(g.player.x > 16, `over the ordinary wall (x ${g.player.x.toFixed(2)})`); assert.equal(g.player.hp, g.save.maxHp);
  const { g: h, at } = pentagonEdge(); glideAt(h, at.x, at.y, 6); fly(h, 12, () => ({ x: -1 }), 1000);
  assert.ok(h.glide && h.player.x < at.x - .8, 'steered away, it glides on'); assert.ok(h.player.hp > 0);
});

function roofSection() {
  const P = findPentagon(); for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const g = visit(P.cx + dx, P.cy + dy); if (!g.map.pentagon?.roof) continue;
    for (let y = 3; y < 29; y++) for (let x = 6; x < 26; x++) { const r = T(g, x, y); if (!r.pentRoof) continue;
      for (const d of [1, -1]) { const run = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => T(g, x + d * k, y)); if (run.every((q) => q && !q.blocked && !q.pentagon && (q.elev || 0) <= 1) && [y - 1, y + 1].every((yy) => run.every((q, k) => !T(g, x + d * (k + 1), yy).pentagon)) && T(g, x - d, y).pentRoof && T(g, x - 2 * d, y).pentRoof) return { g, x, y, d }; } } }
  return null;
}

test('the Pentagon\'s roof: the glider cannot be used over it, off it or onto it (each is death); without the glider the roof is as release 752 made it', () => {
  const R = roofSection(); assert.ok(R, 'a roof edge with land beyond'); const { x, y, d } = R;
  // Off the edge with the glider: the freefall over the roof's edge is a glide over the Pentagon.
  { const g = visit(R.g.rx, R.g.ry); g.player.x = x - .5; g.player.y = y - .5; const before = deaths(g); g.deathBeat = 1; assert.equal(T(g, x, y).elev, PENTAGON.roof.elev);
    let t = fly(g, 40, () => ({ x: d, until: () => !!g.glide || g.player.hp <= 0 }), 1000); t = fly(g, 2, (i) => ({ jump: i === 0, x: d }), t);
    fly(g, 80, () => ({}), t); assert.equal(deaths(g) - before, 1, 'dead'); }
  // Jump on the roof and open the glider while still over it: death.
  { const g = visit(R.g.rx, R.g.ry); g.player.x = x - .5 - d * 1.5; g.player.y = y - .5; const before = deaths(g); assert.ok(pentTile(g, g.player.x, g.player.y), 'on the roof');
    g.deathBeat = 1; let t = fly(g, 1, () => ({ jump: true }), 1000); g.jumpFrom = PENTAGON.roof.elev + 4; t = fly(g, 1, () => ({ jump: true }), t); // opened mid-jump, over the roof
    t = fly(g, 3, () => ({}), t); assert.equal(g.glide, null); assert.equal(g.player.hp, 0); assert.equal(g.message, GLIDER_FORBIDDEN.message); fly(g, 80, () => ({}), t); assert.equal(deaths(g) - before, 1); }
  // From higher ground outside, steered onto the roof: death at its edge, never a landing on it.
  { const g = visit(R.g.rx, R.g.ry); g.deathBeat = 1; glideAt(g, x + d * 4 - .5, y - .5, PENTAGON.roof.elev + 2.5); const t = fly(g, 300, () => ({ x: -d, until: () => !g.glide }), 1000);
    assert.equal(g.player.hp, 0, 'dead'); assert.equal(g.message, GLIDER_FORBIDDEN.message); fly(g, 60, () => ({}), t); }
  // Walking on the roof with the glider in the pack is fine.
  { const g = visit(R.g.rx, R.g.ry); g.player.x = x - .5 - d; g.player.y = y - .5; fly(g, 10, () => ({ x: -d * .3 }), 1000); assert.equal(g.player.hp, g.save.maxHp, 'on the roof, nothing happens'); assert.equal(g.glide, null); }
});

test('a glide over a seam into a Pentagon section dies on arrival, inside the next section', () => {
  const P = findPentagon(); let found = null;
  // along every seam inside the Pentagon's 3x3 block, east or west: open land this side, a Pentagon tile just over it
  for (let dy = -1; dy <= 1 && !found; dy++) for (let dx = -1; dx <= 1 && !found; dx++) for (const s of [1, -1]) { if (Math.abs(dx + s) > 1 || found) continue;
    const g = visit(P.cx + dx, P.cy + dy), n = visit(P.cx + dx + s, P.cy + dy), xs = s > 0 ? [26, 27, 28, 29, 30, 31] : [0, 1, 2, 3, 4, 5], far = s > 0 ? [0, 1] : [30, 31];
    for (let ty = 2; ty < 30 && !found; ty++) { if (!xs.every((x) => !T(g, x, ty).pentagon && (T(g, x, ty).elev || 0) < 6)) continue;
      if (far.some((x) => T(n, x, ty).pentagon)) found = { g, ty, s }; } }
  assert.ok(found, 'a seam with open land this side and the Pentagon the other');
  const { g, ty, s } = found, rx = g.rx, before = deaths(g); g.deathBeat = 1; glideAt(g, s > 0 ? 26.5 : 4.5, ty - .5, 8); const t = fly(g, 200, () => ({ x: s, until: () => !g.glide }), 1000);
  assert.equal(g.rx, rx + s, 'it crossed'); assert.equal(g.player.hp, 0); assert.ok(s > 0 ? g.player.x < 2 : g.player.x > 29, 'at the edge it came in by'); assert.equal(g.message, GLIDER_FORBIDDEN.message); fly(g, 60, () => ({}), t); assert.equal(deaths(g) - before, 1);
});

test('exact resume: a glide saved while held off a castle wing reloads where it was and is held again', () => {
  const { g, at } = castleWall(); glideAt(g, at.x, at.y, 7); const t = fly(g, 8, () => ({ x: 1 }), 1000);
  assert.ok(g.glide && g.glide.held === 'castle', 'held'); const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t)));
  const b = new Game(snap, 9000); assert.ok(b.glide, 'the glide resumes in the air'); assert.equal(b.player.x, g.player.x); assert.equal(b.player.y, g.player.y); assert.equal(b.glide.z, g.glide.z); assert.equal(b.glide.open, true);
  b.enemies = []; fly(b, 200, () => ({ x: 1, until: () => !b.glide }), 9000); assert.equal(b.glide, null); assert.ok(b.player.x + .76 <= at.tx + 1e-6, 'still never over the wall'); assert.ok(b.player.hp >= g.player.hp, `unhurt ${b.player.hp} ${g.player.hp} ${b.save.maxHp} ${b.message}`);
});

// ------------------------------------------------------------------------------------------------ the glider never climbs
test('a glide never gains height: steering every way, north included, z only falls', () => {
  const g = visit(3, 3); flat(g); glideAt(g, 15, 15, 6);
  const dirs = [[0, -1], [1, -1], [-1, -1], [1, 0], [0, 1], [-1, 0], [0, -1], [0, -1]]; const r = glideWatch(g, 400, (i) => { const [x, y] = dirs[Math.floor(i / 6) % dirs.length]; return { x, y }; }, 1000);
  assert.ok(r.rise < 0, `every frame lower than the last (largest change ${r.rise})`);
  // folding and reopening (Jump, again and again) never adds height either
  const h = visit(3, 3); flat(h); glideAt(h, 15, 15, 8); const s = glideWatch(h, 400, (i) => ({ jump: i % 3 === 0, y: -1 }), 1000); assert.ok(s.rise < 0, `fold and reopen: ${s.rise}`);
});

test('higher ground is a wall to a glide: it is held off a raised plateau instead of landing on top of it', () => {
  const raise = (g) => { flat(g); for (let y = 0; y < 32; y++) for (let x = 16; x < 22; x++) Object.assign(T(g, x, y), { elev: 3 }); g.map.landscape ||= { version: 0 }; };
  const g = visit(3, 3); raise(g); glideAt(g, 12, 10.5, 2.4); const r = glideWatch(g, 200, () => ({ x: 1, until: () => !g.glide }), 1000);
  assert.equal(g.glide, null); assert.ok(g.player.x + .5 < 16, `stopped at the cliff (x ${g.player.x.toFixed(2)})`); assert.equal(T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75)).elev, 0, 'landed below'); assert.ok(r.rise < 0);
  // a glide higher than the plateau still comes down onto it
  const h = visit(3, 3); raise(h); glideAt(h, 12, 10.5, 4.5); fly(h, 300, (i) => ({ x: h.player.x < 17 ? 1 : 0, until: () => !h.glide }), 1000);
  assert.equal(h.glide, null); assert.equal(T(h, Math.floor(h.player.x + .5), Math.floor(h.player.y + .75)).elev, 3, 'on the plateau');
});

test('skimming over a blocked low wall holds the glide up but never lifts it', () => {
  const g = visit(3, 3); flat(g); g.map.landscape ||= { version: 0 }; for (let y = 0; y < 32; y++) for (let x = 10; x < 30; x++) Object.assign(T(g, x, y), { blocked: true, kind: 'rock', elev: 0 });
  glideAt(g, 12, 10.5, .3); const r = glideWatch(g, 30, () => ({}), 1000); assert.ok(g.glide, 'held above'); assert.ok(r.rise <= 0, `never lifted (${r.rise})`); assert.ok(g.glide.z <= .3 + 1e-9);
});

test('over a seam onto higher ground the glide stays this side: the section is not entered and z does not rise', () => {
  const g = visit(3, 3); flat(g); const orig = g.transitionSection.bind(g); let raised = 0;
  g.transitionSection = (dx, dy) => { const r = orig(dx, dy); if (g.rx === 4) { raised++; for (const q of g.map.tiles) Object.assign(q, { kind: 'grass', blocked: false, elev: 4, structure: null, greatBuilding: undefined, pentagon: undefined }); g.map.landscape ||= { version: 0 }; } return r; };
  const origLoad = g.loadArea.bind(g); g.loadArea = (...a) => { const r = origLoad(...a); if (g.rx === 3) flat(g); return r; };
  glideAt(g, 28, 12.5, 3); const r = glideWatch(g, 200, () => ({ x: 1, until: () => !g.glide }), 1000);
  assert.equal(raised, 1, 'it tried the seam once, then the seam held it (no section load each frame)'); assert.equal(g.rx, 3, 'back this side'); assert.ok(r.rise < 0); assert.equal(g.glide, null); assert.ok(g.player.hp > 0);
});

test('with the drone out a glide still cannot climb: holding Jump in a glide only folds and opens it', () => {
  const g = visit(3, 3); flat(g); setMechMode(g.save, 'drone'); g.useConsumable('submersible', 0); g.save.mech.fuel = DRONE.carry; assert.ok(g.droneUp()); glideAt(g, 15, 15, 7);
  const r = glideWatch(g, 120, (i) => ({ jump: i % 4 === 0, hold: true, y: -1 }), 1000); assert.ok(r.rise < 0, `${r.rise}`); assert.equal(g.droneLift, null, 'no booster from a glide');
});

test('the drone\'s booster takes you at most five levels above where the jump began', () => {
  const g = visit(3, 3); flat(g); setMechMode(g.save, 'drone'); g.useConsumable('submersible', 0); g.save.mech.fuel = DRONE.carry;
  let top = 0; let t = fly(g, 1, () => ({ jump: true }), 1000); fly(g, 60, (i) => ({ jump: i === 0, hold: true, until: () => { top = Math.max(top, g.droneLift?.z || 0); return false; } }), t);
  assert.ok(Math.abs(top - DRONE_LIFT.max) < 1e-6, `top ${top}`); assert.equal(DRONE_LIFT.max, 5);
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
