// The drone fizzle (Tim, 2026-11-04): "If you try to fly the drone across some area of the Pentagon that would break the whole map,
// the drone just isn't able to fly there. You can start flying there, but your drone will explode or fizzle out, noticeably, so you
// know: something is wrong with the Corridor here; the rules are different here. Then you fall and die. The drone works wherever
// else you want." The zones are the closed blocks a structure's route runs through: the Pentagon's walls and a Great Castle's wings
// and walls (vehicle-gates.ts DRONE_FIZZLE). Courts, roofs and the castle keep's top stay open air; the glider is unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DRONE, DRONE_LIFT, DRONE_FIZZLE, droneZoneOf, droneForbiddenAt, setMechMode } from '../src/vehicle-gates.ts';
import { Game, GLIDE } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { fallDamage } from '../src/landscape.ts';
import { PENTAGON } from '../src/pentagon.ts';
import { castleTopology, quarterSection } from '../src/castles.ts';
import { roofLanding } from '../src/great-buildings.ts';
import { render } from '../src/renderer.ts';

const SEED = 'TIM1', W = 32;
const save = () => { const s = freshSave(); s.seed = SEED; s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; s.maxHp = 100; return s; };
const visit = (rx, ry) => { const g = new Game(save(), 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.save.maxHp; return g; };
const full = (g) => g.save.maxHp;
const droneOut = (g) => { setMechMode(g.save, 'drone'); g.useConsumable('submersible', 0); g.save.mech.fuel = DRONE.carry; assert.ok(g.droneUp()); };
// Drive the game: `plan(i)` gives { jump: pressed this frame, hold: Jump held, x, y }.
function fly(g, frames, plan, t0) { let t = t0; for (let i = 0; i < frames; i++) { const f = plan(i) || {}; g.update(.05, { state: { x: f.x || 0, y: f.y || 0 }, consume: (k) => k === 'jump' && !!f.jump, held: (k) => k === 'jump' && !!f.hold }, t); t += 50; if (f.until?.()) break; } return t; }
const lift = (g, t0 = 1000) => { let t = fly(g, 1, () => ({ jump: true }), t0); t = fly(g, 30, (i) => ({ jump: i === 0, hold: true }), t); assert.equal(g.droneLift?.z, (g.droneLift?.base || 0) + DRONE_LIFT.max, 'up at the top'); return t; };
const T = (g, x, y) => g.map.tiles[y * W + x];
const deaths = (g) => g.save.worldFlags.deaths || 0;
// A spot on flat open ground with a `zone` block straight east of it: { x, y } for the Wayfarer, three clear tiles west of the block.
function wallSpot(g, zone) {
  for (let ty = 2; ty < 30; ty++) for (let tx = 5; tx < 30; tx++) {
    if (droneZoneOf(T(g, tx, ty))?.id !== zone) continue;
    const run = [1, 2, 3, 4].map((d) => T(g, tx - d, ty)), e0 = run[0].elev || 0;
    if (run.every((q) => !q.blocked && !droneZoneOf(q) && !q.slope && (q.elev || 0) === e0 && !['lava', 'canyon', 'river', 'abyss', 'deepWater', 'ocean'].includes(q.kind)) && [ty - 1, ty + 1].every((yy) => !droneZoneOf(T(g, tx - 1, yy))))
      return { x: tx - .8, y: ty - .5, tx, ty };
  }
  return null;
}
let pent = null; const findPentagon = () => pent ||= (() => { const g = new Game(save(), 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { cx, cy }; return null; })();
let cas = null; const findCastle = () => cas ||= (() => { const g = visit(0, 0); for (let d = 3; d < 60; d += 3) for (let X = -d; X <= d; X += 3) for (const Y of [d - Math.abs(X), Math.abs(X) - d]) if (g.castleHere(X, Y)) return { X, Y }; return null; })();
// A section of the found Pentagon (or castle quarter) with a spot by one of its walls.
function pentagonWall() { const P = findPentagon(); assert.ok(P, 'a Pentagon'); for (const [dx, dy] of [[1, 0], [0, 0], [-1, 0], [0, 1], [0, -1], [1, 1]]) { const g = visit(P.cx + dx, P.cy + dy); assert.ok(g.map.pentagon); const at = wallSpot(g, 'pentagon'); if (at) return { g, at }; } assert.fail('no Pentagon wall to fly at'); }
function castleWall() { const C = findCastle(); assert.ok(C, 'a Great Castle'); for (const q of [0, 1, 2, 3]) { const s = quarterSection(C.X, C.Y, q), g = visit(s.rx, s.ry), at = wallSpot(g, 'castle'); if (at) return { g, at }; } assert.fail('no castle wing to fly at'); }
const place = (g, at) => { g.player.x = at.x; g.player.y = at.y; g.player.facing = 'right'; };

for (const [what, find, re] of [['the Pentagon', pentagonWall, /fizzles out over the Pentagon's walls\. The Corridor's rules are different here\./], ['a Great Castle wing', castleWall, /fizzles out over the Great Castle\. The Corridor's rules are different here\./]]) {
  test(`flying the drone into ${what} fizzles it, says why, and the fall from five levels kills`, () => {
    const { g, at } = find(); droneOut(g); place(g, at); g.deathBeat = 1; // the played game's death beat: the frame's message is what the player reads
    let t = lift(g); const before = deaths(g); assert.equal(g.player.hp, full(g));
    t = fly(g, 40, () => ({ hold: true, x: 1, until: () => !!g.droneFizzleFx }), t);
    const fz = g.droneFizzleFx; assert.ok(fz, 'it fizzles at the wall'); assert.equal(fz.zone, what === 'the Pentagon' ? 'pentagon' : 'castle');
    assert.ok(Math.abs(fz.levels - DRONE_LIFT.max) < .01, `the burst shows where the drone was, ${fz.levels.toFixed(2)} levels up`); assert.ok(fz.until - fz.at === DRONE_FIZZLE.burst * 1000);
    assert.match(g.message, re); assert.match(g.message, /falls 5 levels/, 'and the fall that follows');
    assert.equal(g.save.mech.active, false, 'the drone is stowed'); assert.equal(g.droneLift, null, 'the lift is over'); assert.equal(g.player.hp, 0, 'a five-level fall');
    assert.ok(g.player.x + .76 <= at.tx + 1e-6, 'never over the wall'); assert.ok(g.save.narrative.journal.some((j) => j.recordId === `drone-fizzle:${fz.zone}` && /rules are different here/.test(j.text)), 'the journal keeps it');
    fly(g, 60, () => ({}), t); assert.equal(deaths(g) - before, 1, 'the Wayfarer dies');
    // The burst is drawn (and the frame renders with it).
    const g2 = find().g; droneOut(g2); place(g2, find().at); lift(g2); fly(g2, 40, () => ({ hold: true, x: 1, until: () => !!g2.droneFizzleFx }), 3000);
    const calls = []; const ctx = new Proxy({}, { get: (o, k) => k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : k === 'canvas' ? { width: 390, height: 844 } : typeof o[k] !== 'undefined' ? o[k] : (...a) => { calls.push(k); }, set: (o, k, v) => { o[k] = v; return true; } });
    assert.doesNotThrow(() => render(ctx, g2, g2.droneFizzleFx.at + 200));
  });
}

test('short drops: a fizzle a level or so up is harmless; two levels hurt 15%, three 40%, four kill (the ordinary fall rule)', () => {
  assert.equal(fallDamage(1, 100), 0); assert.equal(fallDamage(2, 100), 15); assert.equal(fallDamage(3, 100), 40); assert.equal(fallDamage(4, 100), Infinity);
  for (const [z, n] of [[.4, 0], [1.05, 1], [2.05, 2], [3.05, 3]]) {
    const { g, at } = pentagonWall(); droneOut(g); place(g, at); const before = deaths(g);
    let t = fly(g, 1, () => ({ jump: true }), 1000); t = fly(g, 1, () => ({ jump: true, hold: true }), t); assert.ok(g.droneLift);
    g.droneLift.z = g.droneLift.base + z; g.droneLift.vz = 0; t = fly(g, 20, () => ({ x: 1, hold: true, until: () => !!g.droneFizzleFx }), t);
    assert.ok(g.droneFizzleFx, `fizzles at ${z} levels`); assert.equal(deaths(g), before, `${z} levels: not a death`); const lost = n > 1 ? fallDamage(n, full(g)) : 0; assert.equal(full(g) - g.player.hp, lost, `${z} levels up: ${lost} health lost`);
  }
  // Starting to fly right at the wall: the lift fails at once, a step off the ground.
  const { g, at } = pentagonWall(); droneOut(g); place(g, at); g.player.x += .02;
  let t = fly(g, 1, () => ({ jump: true, x: 1 }), 1000); t = fly(g, 4, (i) => ({ jump: i === 0, hold: true, x: 1, until: () => !!g.droneFizzleFx }), t);
  assert.ok(g.droneFizzleFx); assert.equal(g.player.hp, full(g), 'nothing lost'); assert.equal(deaths(g), 0);
});

test('the drone works elsewhere: in a Pentagon court, onto an ordinary roof, past an ordinary wall, and on open ground', () => {
  // In the Pentagon's own court: up to the top and feathered down again, no fizzle.
  { const { g, at } = pentagonWall(); droneOut(g); place(g, { x: at.x - 2, y: at.y }); let t = lift(g); t = fly(g, 200, (i) => ({ hold: i % 3 === 0, until: () => !g.droneLift }), t);
    assert.equal(g.droneLift, null, 'landed'); assert.equal(g.droneFizzleFx, undefined); assert.equal(g.player.hp, full(g)); assert.ok(g.save.mech.active, 'still out'); }
  // A flat field: an ordinary great building's roof (walkable, 4 levels up) beside a closed ordinary block; neither is a zone.
  const g = visit(3, 3); for (const t of g.map.tiles) Object.assign(t, { kind: 'ash', blocked: false, elev: 0, slope: false, environment: null, structure: null, buildingId: null, greatBuilding: undefined, pentagon: undefined, landscape: undefined, courtyard: undefined }); g.map.objects = [];
  for (let y = 8; y < 14; y++) for (let x = 14; x < 18; x++) Object.assign(T(g, x, y), { kind: 'castleCourt', landscape: 'castle', structure: 'buildingRoof', greatBuilding: true, elev: 4 });
  for (let y = 16; y < 20; y++) for (let x = 14; x < 18; x++) Object.assign(T(g, x, y), { blocked: true, greatBuilding: true });
  droneOut(g); g.player.x = 11.2; g.player.y = 10.5; let t = lift(g); t = fly(g, 30, () => ({ hold: true, x: 1 }), t);
  assert.ok(g.player.x > 14, `over the roof (x ${g.player.x.toFixed(2)})`); assert.equal(g.droneFizzleFx, undefined, 'an ordinary roof is open air');
  t = fly(g, 200, (i) => ({ hold: i % 3 === 0, until: () => !g.droneLift }), t); assert.equal(g.player.hp, full(g)); assert.equal(T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75)).elev, 4, 'landed on the roof');
  const h = visit(3, 3); for (const q of h.map.tiles) Object.assign(q, T(g, q.x, q.y)); h.map.objects = []; droneOut(h); h.player.x = 11.2; h.player.y = 17.5; t = lift(h); t = fly(h, 30, () => ({ hold: true, x: 1 }), t);
  assert.equal(h.droneFizzleFx, undefined, 'an ordinary closed block only stops the drone, as before'); assert.ok(h.player.x < 14 && h.droneLift, 'held at its side, still flying');
  // The zone table: allowed and opt-in flags (for later layouts such as ledges and balconies), and the old landscape castles.
  const wall = { kind: 'castleWall', landscape: 'castle', blocked: true, greatBuilding: true };
  assert.equal(droneZoneOf({ ...wall, pentagon: 'outer' }).id, 'pentagon'); assert.equal(droneZoneOf(wall).id, 'castle');
  assert.equal(droneZoneOf({ ...wall, pentagon: 'outer', droneOk: true }), null, 'a tile marked droneOk is flyable');
  assert.equal(droneZoneOf({ kind: 'castleCourt', pentagon: 'court', elev: 3, droneZone: 'pentagon' }).id, 'pentagon', 'a walkable tile can opt into a zone');
  assert.equal(droneZoneOf({ kind: 'castleCourt', pentagon: 'court', courtyard: true }), null, 'courts are open air');
  assert.equal(droneZoneOf({ kind: 'castleWall', landscape: 'castle', blocked: true, elev: 2 }), null, 'an overland castle\'s wall (landscape) is not a Great Castle');
  assert.equal(droneZoneOf({ kind: 'castleCourt', landscape: 'castle', structure: 'buildingRoof', greatBuilding: true, elev: 5 }), null, 'the keep\'s top');
  assert.equal(droneForbiddenAt({ tiles: [] }, 32, 0, 0), null);
});

test('the castle keep\'s roof exit: the top is open air beside courts, the glider still carries you off it, and the drone lets you down into the court', () => {
  const C = findCastle(), k = quarterSection(C.X, C.Y, castleTopology(SEED, C.X, C.Y).k);
  const keepTop = (g) => { const rec = g.map.objects.find((o) => o.castle && o.blocks?.some((b) => b.part === 't')); return rec.blocks.find((b) => b.part === 't').cells; };
  // The landing the 746 roof exit uses is on the keep's 3×3 top, not a zone; round the top is only court (no wing touches it).
  { const g = visit(k.rx, k.ry), L = roofLanding(g.map, 'keep'), cells = keepTop(g), set = new Set(cells.map((c) => c.y * W + c.x)); assert.ok(L);
    assert.equal(droneZoneOf(T(g, L.x, L.y)), null); assert.equal(T(g, L.x, L.y).elev, 5);
    for (const c of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const i = (c.y + dy) * W + c.x + dx; if (set.has(i)) continue; assert.equal(droneZoneOf(g.map.tiles[i]), null, 'beside the top: court'); assert.ok(g.map.tiles[i].courtyard); } }
  // The glider: off the edge toward the middle of the land, a freefall, Jump opens it, and it carries you down alive (over the wings).
  { const g = visit(k.rx, k.ry), L = roofLanding(g.map, 'keep'); g.save.glider = true; g.player.x = L.x; g.player.y = L.y; const dx = L.x > 16 ? -1 : 1, dy = L.y > 16 ? -1 : 1, before = deaths(g);
    let t = fly(g, 30, () => ({ x: dx, until: () => !!g.glide }), 1000); assert.ok(g.glide, 'off the top: a freefall'); assert.equal(g.glide.open, false);
    t = fly(g, 1, () => ({ jump: true, x: dx, y: dy }), t); assert.equal(g.glide.open, true, 'Jump opens the glider');
    t = fly(g, 200, () => ({ x: dx, y: dy, until: () => !g.glide }), t); assert.equal(g.glide, null, 'down'); assert.equal(deaths(g), before, 'alive'); assert.ok(g.player.hp > 0); }
  // The drone: lift off the top, over the court beside it, feathered down.
  { const g = visit(k.rx, k.ry), L = roofLanding(g.map, 'keep'), cells = keepTop(g); droneOut(g); g.player.x = L.x; g.player.y = L.y;
    const minX = Math.min(...cells.map((c) => c.x)), inner = L.x > 16; // the court ring is two tiles wide on the land side
    const before = deaths(g); let t = fly(g, 1, () => ({ jump: true }), 1000); t = fly(g, 3, (i) => ({ jump: i === 0, hold: true }), t); assert.ok(g.droneLift, 'a short lift off the top');
    t = fly(g, 40, (i) => ({ hold: i % 2 === 0, x: inner ? -1 : 1, until: () => Math.abs(g.player.x - (inner ? minX - 1.5 : Math.max(...cells.map((c) => c.x)) + 1.2)) < .2 }), t);
    assert.equal(g.droneFizzleFx, undefined, 'no fizzle over the court'); t = fly(g, 260, (i) => ({ hold: i % 3 === 0, until: () => !g.droneLift }), t);
    assert.equal(g.droneLift, null); assert.equal(deaths(g), before, 'alive'); assert.equal(g.player.hp, full(g), 'down safely'); { const q = T(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75)); assert.ok(q.courtyard, `in the keep's court (${g.player.x.toFixed(2)},${g.player.y.toFixed(2)} ${q.kind} e${q.elev} L ${L.x},${L.y})`); } }
});

test('exact resume: a fizzle is settled in its frame, so a save just after it reloads on the ground with the drone stowed', () => {
  const { g, at } = pentagonWall(); droneOut(g); place(g, at); let t = fly(g, 1, () => ({ jump: true }), 1000); t = fly(g, 1, () => ({ jump: true, hold: true }), t);
  g.droneLift.z = g.droneLift.base + 1.05; t = fly(g, 20, () => ({ x: 1, hold: true, until: () => !!g.droneFizzleFx }), t);
  const snap = JSON.parse(JSON.stringify(g.exportSnapshot(t))); assert.equal(snap.playerRuntime?.droneLift ?? null, null, 'no lift to resume'); assert.equal(snap.mech?.active ?? g.save.mech.active, false);
  const back = new Game(snap, 9000); assert.equal(back.droneLift, null); assert.equal(back.droneUp(), false); assert.equal(back.player.x, g.player.x); assert.equal(back.player.y, g.player.y);
});
