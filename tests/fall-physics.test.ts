// Fall physics (Tim, 2026-11-12: "falls need real physics... a fall speed, airtime that depends on where you are and how high, and
// fall damage that follows from it"; "Rift Step up into the air and, while falling, use the drone (or glider) to catch himself").
// game.ts FALL: in the open world, on foot, a Wayfarer over ground more than FALL.minDrop below falls under gravity to a terminal
// speed, with real airtime; the damage is the old table's, by the distance fallen; the drone or the glider catches a fall.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, FALL, GLIDE, fallAirtime, stepFall } from '../src/game.ts';
import { fallDamage, canStep } from '../src/landscape.ts';
import { learnRank, BRANCHES, riftStep } from '../src/constellation.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { DRONE, DRONE_LIFT, setMechMode } from '../src/vehicle-gates.ts';
import { render, standardStep } from '../src/renderer.ts';
import { createCombatant } from '../src/combat.ts';

const SEED = 'ROOF', W = 32, ROW = 30; let M = 100; // M: the Wayfarer's full health (the derived maximum)
const inp = (x: number, y = 0, jump = false, hold = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: (k: string) => k === 'jump' && hold }; };
// A Wayfarer in an open-world section (seed ROOF, -2,0); `rift` learns Rift Step, `drone` builds the drone and calls it up, `glider` owns it.
function wayfarer({ rift = false, drone = false, glider = false } = {}) {
  const s: any = freshSave(); s.seed = SEED; s.maxHp = 100; s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; s.materials.lumenDust = 50;
  if (rift) { for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) learnRank(s, 'rift'); s.magicSkills.selected = 'rift-step'; }
  if (glider) s.glider = true;
  Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.player.maxHp = s.maxHp;
  if (drone) { setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry; assert.ok(g.droneUp(), 'the drone is up'); }
  g.update(1 / 60, inp(0), 4000); g.enemies = []; g.player.hp = g.player.maxHp; assert.equal(g.player.maxHp, g.save.maxHp); M = g.save.maxHp; return g;
}
const open = (g: any, x: number, y: number, elev: number) => Object.assign(g.map.tiles[y * W + x], { kind: 'ash', blocked: false, elev, slope: false, environment: undefined, structure: undefined, buildingId: undefined });
// A cliff on row ROW: x 1..4 at `high`, x 5..20 at `low` (rows ROW-1..ROW+1 the same, so the box never meets a wall).
function cliff(g: any, high: number, low = 0) { for (let y = ROW - 1; y <= ROW + 1; y++) for (let x = 1; x <= 20; x++) open(g, x, y, x <= 4 ? high : low); g.player.x = 3.6; g.player.y = ROW - .25; }
function drive(g: any, hz = 60, t0 = 5000) { let t = t0; const dt = 1 / hz; return { step(x = 0, y = 0, jump = false, hold = false) { t += 1000 / hz; g.update(dt, inp(x, y, jump, hold), t); g.enemies = []; return t; }, now: () => t, dt }; }
const deaths = (g: any) => g.save.worldFlags.deaths || 0;
// Walk east off the cliff; returns the frames spent in the air and what was lost.
function walkOff(g: any, hz = 60, walkFrames = 0) {
  const d = drive(g, hz), hp0 = g.player.hp, d0 = deaths(g); let first = -1, last = -1, low = hp0, maxSpeed = 0, fall: any = null, same = true;
  for (let i = 0; i < hz * 6; i++) { d.step(i < (walkFrames || hz * .6) ? 1 : 0); low = Math.min(low, g.player.hp);
    if (g.fall) { if (first < 0) { first = i; fall = g.fall; } else if (g.fall !== fall) same = false; maxSpeed = Math.max(maxSpeed, -g.fall.vz); }
    else if (first >= 0 && last < 0) last = i;
    if (last >= 0 && i > last + 3) break; }
  return { first, last, air: (last - first) / hz, lost: hp0 - low, dead: deaths(g) > d0 || g.player.hp <= 0 || g._fatalFall === true, maxSpeed, same, x: g.player.x };
}

test('the model is data: the drone booster\'s gravity, the closed glider\'s speed as terminal, airtime grows with height', () => {
  assert.equal(FALL.gravity, DRONE_LIFT.gravity, 'one gravity for every fall'); assert.equal(FALL.terminal, GLIDE.drop, 'terminal speed is the freefall\'s');
  assert.ok(FALL.minDrop > 0 && FALL.minDrop < 1 && FALL.stepDown === 1 && FALL.jumpExit > 0 && FALL.pose >= 1);
  // t = sqrt(2h/g) below terminal speed; a level is 1.2 tiles in Close View
  for (const h of [1, 2, 2.5]) assert.ok(Math.abs(fallAirtime(h) - Math.sqrt(2 * h / FALL.gravity)) < 1e-9, `${h} levels`);
  assert.ok(Math.abs(fallAirtime(1) - .378) < .001 && Math.abs(fallAirtime(2) - .535) < .001 && Math.abs(fallAirtime(4) - .766) < .001, 'one level 0.38 s, two 0.53 s, four 0.77 s');
  let prev = 0; for (let h = .5; h <= 60; h += .5) { const t = fallAirtime(h); assert.ok(t > prev, 'more height, more airtime'); prev = t; }
  // past terminal speed the rest is at terminal speed
  const vT = FALL.terminal, tT = vT / FALL.gravity, hT = vT * vT / (2 * FALL.gravity);
  assert.ok(Math.abs(fallAirtime(hT + 18) - (tT + 18 / vT)) < 1e-9);
  // a head start shortens it
  assert.ok(fallAirtime(3, -FALL.jumpExit) < fallAirtime(3));
  // the step, in place: never past terminal, never upward
  const f = { z: 50, vz: 0 }; for (let i = 0; i < 600; i++) { stepFall(f, 1 / 60); assert.ok(f.vz >= -FALL.terminal - 1e-9 && f.vz <= 0); } assert.equal(f.vz, -FALL.terminal);
});

test('walking off a ledge is a fall with real airtime, at 60 and 20 frames a second; the fall record is reused (no allocation)', () => {
  for (const hz of [60, 20]) for (const h of [2, 3]) {
    const g = wayfarer(); cliff(g, h); const r = walkOff(g, hz);
    assert.ok(r.first >= 0, `${h} levels at ${hz} Hz: a fall`);
    const model = fallAirtime(h); assert.ok(Math.abs(r.air - model) <= 1.5 / hz + 1e-9, `${h} levels at ${hz} Hz: ${r.air.toFixed(3)} s in the air (model ${model.toFixed(3)} s)`);
    assert.ok(r.same, 'one fall record from leaving the ledge to the landing');
    assert.equal(g.fall, null); assert.equal(g.playerLevel(), h === 2 ? 0 : 0, 'down');
  }
  // while in the air the Wayfarer is at the fall's height: creatures' reach reads it (playerLevel)
  const g = wayfarer(); cliff(g, 3); const d = drive(g); let seen = -1; for (let i = 0; i < 120 && seen < 0; i++) { d.step(1); if (g.fall && g.fall.z < 2.5) seen = g.playerLevel(); }
  assert.ok(seen > .5 && seen < 2.5, `in the air (${seen})`);
});

test('a slope is walked down, not fallen; a one-level ledge is a short fall that never hurts', () => {
  const g = wayfarer(); cliff(g, 1); Object.assign(g.map.tiles[ROW * W + 5], { slope: true }); for (const y of [ROW - 1, ROW + 1]) Object.assign(g.map.tiles[y * W + 5], { slope: true });
  const d = drive(g); let fell = false; for (let i = 0; i < 60; i++) { d.step(1); fell ||= !!g.fall; } assert.equal(fell, false, 'down the slope'); assert.equal(g.player.hp, M);
  const k = wayfarer(); cliff(k, 1); const r = walkOff(k); assert.ok(r.first >= 0 && Math.abs(r.air - fallAirtime(1)) <= 1.5 / 60, `one level: ${r.air.toFixed(3)} s`); assert.equal(r.lost, 0);
});

test('terminal speed: a long fall never falls faster than FALL.terminal, and a long drop is still death', () => {
  const g = wayfarer(); cliff(g, 14); const r = walkOff(g); assert.ok(r.first >= 0);
  assert.ok(Math.abs(r.maxSpeed - FALL.terminal) < 1e-9, `reached terminal (${r.maxSpeed})`);
  assert.ok(Math.abs(r.air - fallAirtime(14)) <= 1.5 / 60, `${r.air.toFixed(3)} s in the air for 14 levels (model ${fallAirtime(14).toFixed(3)})`); assert.ok(r.dead, 'fatal');
});

test('damage parity: every drop costs what the old fallDamage table charged (1 free, 2 = 15%, 3 = 40%, 4+ fatal)', () => {
  const table: string[] = [];
  for (const h of [1, 2, 3, 4, 5, 8]) { const g = wayfarer(); cliff(g, h); const r = walkOff(g), old = fallDamage(h, M);
    table.push(`${h}: ${r.dead ? 'dead' : r.lost} (old ${old === Infinity ? 'dead' : old})`);
    if (old === Infinity) assert.ok(r.dead, `${h} levels: lethal`); else { assert.equal(r.lost, old, `${h} levels`); assert.equal(r.dead, false); } }
  assert.deepEqual(table, ['1: 0 (old 0)', `2: ${fallDamage(2, M)} (old ${fallDamage(2, M)})`, `3: ${fallDamage(3, M)} (old ${fallDamage(3, M)})`, '4: dead (old dead)', '5: dead (old dead)', '8: dead (old dead)']);
  // a fall onto lower ground part way (stepping off 4, coming down on a 2-level shelf) is the drop to where it lands
  const g = wayfarer(); cliff(g, 4); for (let y = ROW - 1; y <= ROW + 1; y++) for (let x = 5; x <= 7; x++) open(g, x, y, 2);
  const r = walkOff(g, 60, 33); assert.ok(r.first >= 0); assert.equal(r.lost, fallDamage(2, M)); assert.equal(r.dead, false);
});

test('the glider: a long fall is still the freefall (Jump opens it), now under the fall model; stowing it is a fall from there', () => {
  const g = wayfarer({ glider: true }); cliff(g, 6); const d = drive(g); let i = 0; for (; i < 90 && !g.glide; i++) d.step(1);
  assert.ok(g.glide && g.glide.open === false, 'a freefall'); assert.equal(g.fall, null); const z0 = g.glide.z;
  d.step(0); d.step(0); assert.ok(g.glide.vz < 0 && g.glide.vz > -GLIDE.drop, `it gathers speed (${g.glide.vz.toFixed(2)})`); assert.ok(g.glide.z < z0);
  d.step(0, 0, true); assert.equal(g.glide.open, true, 'Jump opens it'); for (let k = 0; k < 300 && g.glide; k++) d.step(0); assert.equal(g.player.hp, M, 'caught: no damage');
});

test('mid-fall catches: Jump with the drone up catches the fall (same fuel and rules); its damage counts afresh from the catch', () => {
  const g = wayfarer({ drone: true }); cliff(g, 7); const d = drive(g); const fuel0 = g.save.mech.fuel;
  let i = 0; for (; i < 120 && !(g.fall && g.fall.z < 5); i++) d.step(1); assert.ok(g.fall, 'falling from seven levels (lethal)');
  const z = g.fall.z; d.step(0, 0, true, true); assert.equal(g.fall, null, 'caught'); assert.ok(g.droneLift, 'on the drone'); assert.ok(Math.abs(g.droneLift.z - z) < .5, 'where it was caught');
  assert.equal(g.droneLift.vz >= 0 || g.droneLift.vz > -1, true, 'the catch stops the fall');
  for (let k = 0; k < 40; k++) d.step(0, 0, false, true); assert.ok(g.save.mech.fuel < fuel0, 'the same fuel');
  // let it down gently (feathered) and land: no damage, although the cliff was lethal
  for (let k = 0; k < 600 && g.droneLift; k++) d.step(0, 0, false, g.droneLift.vz < -1.5); // brake only while dropping faster than 1.5 levels a second
  assert.equal(g.droneLift, null); assert.ok(g.player.hp > 0 && deaths(g) === 0, 'alive');
  // no drone, no fuel: Jump does nothing but say so
  const k = wayfarer({ drone: true }); cliff(k, 3); const dk = drive(k); for (let j = 0; j < 120 && !k.fall; j++) dk.step(1); k.save.mech.fuel = 0; dk.step(0, 0, true); assert.ok(k.fall, 'still falling'); assert.equal(k.message, DRONE_LIFT.none);
});

test('the glider catches a fall over enough air (a drone stowed in the air), and the landing then costs nothing', () => {
  const g = wayfarer({ drone: true, glider: true }); cliff(g, 0); const d = drive(g);
  d.step(0, 0, true); d.step(0, 0, true, true); assert.ok(g.droneLift, 'on the booster'); g.droneLift.z = 5; g.droneLift.vz = 0; d.step(0, 0, false, true); assert.ok(g.droneLift.z > 4.5, 'up on the booster');
  g.toggleMech(); d.step(0); assert.equal(g.droneLift, null); assert.ok(g.fall && g.fall.z > 4, 'stowed in the air: a fall');
  d.step(0); assert.ok(g.fall.vz < 0 && g.fall.z < g.fall.from + 1e-9);
  d.step(0, 0, true); assert.equal(g.fall, null); assert.ok(g.glide && g.glide.open, 'the glider caught it'); for (let k = 0; k < 400 && g.glide; k++) d.step(0); assert.equal(g.player.hp, M);
  // too near the ground for the glider: Jump leaves the fall alone
  const k2 = wayfarer({ glider: true }); cliff(k2, 3); const d2 = drive(k2); for (let j = 0; j < 120 && !k2.fall; j++) d2.step(1); d2.step(0, 0, true); assert.equal(k2.glide, null); assert.ok(k2.fall || k2.player.hp < M);
});

test('a drone that ends in the air (stowed) falls from where it was, with the old damage', () => {
  for (const [z, n] of [[2.05, 2], [3.05, 3]] as const) {
    const g = wayfarer({ drone: true }); cliff(g, 0); const d = drive(g); d.step(0, 0, true); d.step(0, 0, true, true); assert.ok(g.droneLift);
    g.droneLift.z = z; g.droneLift.vz = 0; g.toggleMech(); d.step(0); assert.ok(g.fall, `${z}: a fall`); let k = 0; while (g.fall && k++ < 200) d.step(0);
    assert.ok(k > 5, 'with airtime'); assert.equal(M - g.player.hp, fallDamage(n, M), `${z} levels up: a ${n}-level fall`);
  }
});

test('Rift Step out over a drop falls from there; while falling it is allowed and keeps the fall (its speed and where it counts from)', () => {
  // out over the drop: the step lands on nothing, so the Wayfarer falls from the height they stepped from
  const g = wayfarer({ rift: true }); cliff(g, 3); g.player.lastMoveVector = { x: 1, y: 0 }; g.lastUpdateNow = 5000;
  assert.equal(riftStep(g, 5000), true); assert.ok(g.player.x > 5, 'out past the edge'); assert.ok(g.fall && g.fall.z === 3 && g.fall.vz === 0, 'in the air at the height it left');
  assert.equal(g.player.hp, M, 'no damage yet'); const d = drive(g); let n = 0; while (g.fall && n++ < 200) d.step(0);
  assert.ok(Math.abs(n / 60 - fallAirtime(3)) <= 1.5 / 60, `airtime ${(n / 60).toFixed(3)}`); assert.equal(M - g.player.hp, fallDamage(3, M));
  // a step while falling: still falling, at the same speed and counting from the same height
  const k = wayfarer({ rift: true }); cliff(k, 3); const dk = drive(k); for (let j = 0; j < 120 && !(k.fall && k.fall.vz < -2); j++) dk.step(1);
  const { z, vz, from } = k.fall; k.player.lastMoveVector = { x: 1, y: 0 }; k.lastUpdateNow = dk.now(); assert.equal(riftStep(k, dk.now()), true, 'allowed');
  assert.ok(k.fall && Math.abs(k.fall.z - z) < 1e-9 && k.fall.vz === vz && k.fall.from === from, 'momentum and accounting kept');
  n = 0; while (k.fall && n++ < 200) dk.step(0); assert.equal(M - k.player.hp, fallDamage(3, M), 'the same damage');
  // from four levels a blink off is still death, after the airtime
  const c = wayfarer({ rift: true }); cliff(c, 4); c.player.lastMoveVector = { x: 1, y: 0 }; c.lastUpdateNow = 5000; assert.equal(riftStep(c, 5000), true); assert.equal(c.player.hp, M);
  const dc = drive(c); n = 0; while (c.fall && n++ < 200) dc.step(0); assert.ok(c.player.hp <= 0 || deaths(c) === 1 || c._fatalFall, 'four levels: death');
});

test('Rift Step up into the air, the fall, and the drone catching it', () => {
  const g = wayfarer({ rift: true, drone: true }); cliff(g, 5); g.player.lastMoveVector = { x: 1, y: 0 }; g.lastUpdateNow = 5000;
  assert.equal(riftStep(g, 5000), true); assert.ok(g.fall && g.fall.z === 5, 'five levels up, over open ground');
  const d = drive(g); for (let j = 0; j < 12; j++) d.step(0); assert.ok(g.fall && g.fall.z < 5 && g.fall.vz < 0, 'falling');
  d.step(0, 0, true, true); assert.ok(g.droneLift && !g.fall, 'the drone has it');
  for (let k = 0; k < 600 && g.droneLift; k++) d.step(0, 0, false, g.droneLift.vz < -1.5); // brake only while dropping faster than 1.5 levels a second assert.ok(g.player.hp > 0 && deaths(g) === 0, 'down alive (it would have been a five-level death)');
});

test('pause holds a fall exactly; a save mid-fall resumes in the air and goes on frame for frame as it would have', () => {
  const g = wayfarer(); cliff(g, 3); const d = drive(g); for (let j = 0; j < 120 && !(g.fall && g.fall.vz < -1.5); j++) d.step(1);
  const before = { ...g.fall }, x = g.player.x; g.setPaused(true, d.now());
  for (let j = 0; j < 30; j++) d.step(1); assert.deepEqual({ ...g.fall }, before, 'paused: nothing moves'); assert.equal(g.player.x, x);
  g.setPaused(false, d.now());
  // exact resume
  const saved = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(d.now())))); assert.ok(saved.session.playerRuntime.fall, 'the fall is saved (schema 14, additive)');
  assert.equal(saved.version ?? 14, 14);
  const back: any = new Game(saved, d.now()); back.enemies = [];
  assert.deepEqual({ z: back.fall.z, vz: back.fall.vz, from: back.fall.from }, { z: g.fall.z, vz: g.fall.vz, from: g.fall.from }, 'resumed in the air');
  assert.equal(back.player.x, g.player.x); assert.equal(back.player.y, g.player.y);
  const db = drive(back, 60, d.now()); for (let j = 0; j < 40; j++) { d.step(0); db.step(0);
    assert.equal(back.player.x, g.player.x); assert.equal(!!back.fall, !!g.fall, `frame ${j}`); if (g.fall) { assert.ok(Math.abs(back.fall.z - g.fall.z) < 1e-12); assert.ok(Math.abs(back.fall.vz - g.fall.vz) < 1e-12); } assert.equal(back.player.hp, g.player.hp); }
  assert.equal(g.fall, null); assert.equal(g.player.hp, M - fallDamage(3, M));
});

test('reload mid-fall: a lethal fall is still lethal; a saved fall that no longer fits is dropped safely; old saves load', () => {
  const g = wayfarer(); cliff(g, 6); const d = drive(g); for (let j = 0; j < 120 && !(g.fall && g.fall.z < 5); j++) d.step(1);
  const saved: any = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(d.now())))), back: any = new Game(saved, d.now()); back.enemies = []; assert.ok(back.fall);
  const db = drive(back, 60, d.now()); let n = 0; while (back.fall && n++ < 200) db.step(0); assert.ok(back.player.hp <= 0 || deaths(back) === 1 || back._fatalFall, 'the reload does not save you');
  // a malformed record (or one from another area) is no fall
  const bad: any = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(d.now())))); bad.session.playerRuntime.fall = { z: 'high', vz: null, from: 3 }; assert.equal(new Game(bad, 0).fall, null);
  const old: any = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(d.now())))); delete old.session.playerRuntime.fall; assert.equal(new Game(old, 0).fall, null, 'a save from before has none');
  // a saved fall below the ground there now (the ground changed): it lands on the next frame by the ordinary rule
  const low: any = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(d.now())))); low.session.playerRuntime.fall = { z: -1, vz: -3, from: 2 };
  const L: any = new Game(low, 0); L.enemies = []; const dl = drive(L, 60, 100); dl.step(0); assert.equal(L.fall, null); assert.equal(L.player.hp, L.save.maxHp - fallDamage(2, L.save.maxHp));
});

test('a jump onto a one-level ledge lands as before: same reach, no fall; jumping off a ledge falls after the jump ends', () => {
  // the ledge: x 5.. one level up; from a run-up the jump carries the Wayfarer onto it
  const g = wayfarer(); for (let y = ROW - 1; y <= ROW + 1; y++) for (let x = 1; x <= 20; x++) open(g, x, y, x >= 6 ? 1 : 0); g.player.x = 3; g.player.y = ROW - .25;
  const d = drive(g); let fell = false; for (let i = 0; i < 90; i++) { d.step(i < 70 ? 1 : 0, 0, i === 40); fell ||= !!g.fall; }
  assert.equal(fell, false); assert.equal(g.playerLevel(), 1, 'up on it'); assert.ok(Math.abs(g.player.x - 5.8) < 1e-9, `exactly where origin/main put it (x 5.80; here ${g.player.x.toFixed(4)})`);
  assert.equal(canStep({ isPlayer: true, jumping: true }, g.map, W, 5.4, ROW, 5.6, ROW), true, 'one jump, one level');
  // a jump off a three-level ledge: the jump holds its height; the fall follows from it when the jump ends, and costs the old 40%
  const k = wayfarer(); cliff(k, 3); const dk = drive(k); let held = false, i = 0;
  for (; i < 200; i++) { dk.step(i < 40 ? 1 : 0, 0, i === 10); if (k.fall && k.jumpUntil > dk.now()) { held = true; assert.equal(k.fall.z, 3, 'held at the launch height'); } if (i > 20 && !k.fall && k.jumpUntil < dk.now()) break; }
  assert.ok(held, 'held by the jump'); assert.equal(M - k.player.hp, fallDamage(3, M));
});

test('creatures are unchanged: they still never step off a ledge, and the model only ever carries the Wayfarer', () => {
  const g = wayfarer(); cliff(g, 3);
  assert.equal(canStep({ isPlayer: false }, g.map, W, 4.4, ROW, 4.6, ROW), false, 'a creature stops at the edge');
  assert.equal(canStep({ isPlayer: true }, g.map, W, 4.4, ROW, 4.6, ROW), true, 'the Wayfarer may drop');
  g.save.mech = g.save.mech || {}; assert.equal(g.fallApplies(), true); g.area = 'dungeon'; assert.equal(g.fallApplies(), false, 'not indoors'); g.area = 'overworld';
});

test('the standard view draws a fall at its height and the camera follows it; a step up is eased, never a cut', () => {
  const g = wayfarer(); cliff(g, 3); const d = drive(g); const ctx: any = new Proxy({}, { get: (o: any, k: any) => k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : k === 'canvas' ? { width: 390, height: 844 } : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  let frames = 0; for (let i = 0; i < 120; i++) { d.step(1); render(ctx, g, 390, 844, d.now()); if (g.fall) frames++; assert.equal(standardStep().off, 0, 'a fall draws its own height'); }
  assert.ok(frames > 20, 'a drawn fall');
  // a jump up onto a level: the drawn footing moves less than half a level a frame and arrives with the landing
  const k = wayfarer(); for (let y = ROW - 1; y <= ROW + 1; y++) for (let x = 1; x <= 20; x++) open(k, x, y, x >= 6 ? 1 : 0); k.player.x = 4.9; k.player.y = ROW - .25;
  const dk = drive(k); let last = NaN, most = 0; const LIFT = .34;
  for (let i = 0; i < 70; i++) { dk.step(i < 50 ? 1 : 0, 0, i === 2); render(ctx, k, 390, 844, dk.now()); const drawn = (k.playerLevel() === 1 && !(dk.now() < k.jumpUntil) ? LIFT : (k.map.tiles[Math.floor(k.player.y + .75) * W + Math.floor(k.player.x + .5)].elev || 0) * LIFT) + standardStep().off;
    if (Number.isFinite(last)) most = Math.max(most, Math.abs(drawn - last)); last = drawn; }
  assert.ok(most < LIFT * .4, `the footing eased (${most.toFixed(3)} a frame; a cut is ${LIFT})`); assert.equal(standardStep().off, 0, 'and arrived');
});

// Jump attacks (release 923) meet fall physics: a plunge that ends over a drop falls on, straight down at FALL.plunge, and slams
// where the fall lands; its fall damage is the drop from the jump's height, never skipped; a fall alone cannot plunge.
function presser(g: any, t0 = 5000) { let t = t0; return { step(press: string[] = [], x = 0) { const left = new Set(press); t += 1000 / 60; g.update(1 / 60, { state: { x, y: 0 }, consume: (k: string) => left.delete(k), held: () => false }, t); g.enemies = []; }, now: () => t }; }
const armed = () => { const g = wayfarer(); g.save.equipment.primary = { id: 'salvage-blade', name: 'Salvage Blade', slot: 'primary', power: 1 }; return g; };
function plungeOff(g: any, d: any) { for (let j = 0; j < 60 && !(g.player.x > 4.3); j++) d.step([], 1); d.step(['jump'], 1); for (let j = 0; j < 8; j++) d.step([], 1); }

test('a plunge off a ledge falls on to the ground below and slams there, with the fall\'s full damage', () => {
  const g = armed(); cliff(g, 3); const d = presser(g); plungeOff(g, d);
  assert.ok(g.fall && g.jumpUntil > d.now(), 'a jump over the drop holds a fall');
  d.step(['attack']); assert.ok(g.plunge, 'Plunge!'); assert.equal(g.fall.vz, -FALL.plunge, 'driven down');
  let slamAt = -1, landedAt = -1, airborneSlam = false;
  for (let k = 0; k < 120; k++) { d.step(['jump']); const slam = g.effects.some((e: any) => e.kind === 'plunge-slam'); if (g.fall && slam) airborneSlam = true;
    if (!g.fall && landedAt < 0) landedAt = k; if (slamAt < 0 && slam) slamAt = k; if (landedAt >= 0 && k > landedAt + 3) break; }
  assert.equal(airborneSlam, false, 'never in the air'); assert.ok(landedAt >= 0); assert.equal(slamAt, landedAt, 'the slam on the frame it lands');
  assert.equal(g.glide, null); assert.equal(g.droneLift, null, 'Jump catches nothing while the plunge is committed');
  assert.equal(M - g.player.hp, fallDamage(3, M), 'the three-level fall still costs its 40%');
  // a fall alone (walked off, no jump) has no jump to plunge from
  const k2 = armed(); cliff(k2, 3); const d2 = presser(k2); for (let j = 0; j < 120 && !k2.fall; j++) d2.step([], 1); d2.step(['attack']); assert.equal(k2.plunge ?? null, null, 'no plunge from a fall');
  // from a lethal height the plunge is still death
  const k3 = armed(); cliff(k3, 5); const d3 = presser(k3); plungeOff(k3, d3); d3.step(['attack']); assert.ok(k3.plunge);
  for (let j = 0; j < 120 && k3.fall; j++) d3.step(); assert.ok(k3.player.hp <= 0 || deaths(k3) > 0 || k3._fatalFall, 'five levels: death');
});

test('the Shadow Boxing dive off a ledge holds its launch height (skyAir), falls from it where the dive ends, and bursts on landing', () => {
  const g = armed(); cliff(g, 3); const foe = Object.assign(createCombatant('rootBrute', 7.5, ROW - .25), { id: 'foe', hp: 5000, maxHp: 5000, damage: 0, cooldown: 99 });
  let t = 5000; const step = (press: string[] = [], x = 0) => { const left = new Set(press); t += 1000 / 60; g.enemies = [foe]; g.update(1 / 60, { state: { x, y: 0 }, consume: (k: string) => left.delete(k), held: () => false }, t); };
  step(); g.castSpell('shadow-boxing'); assert.ok(g.boxingUntil > t, 'Shadow Boxing');
  step(['jump']); step(); step(['attack']); assert.ok(g.plunge?.dive, 'a dive'); assert.equal(g.skyAir, 3, 'it holds the height it left from');
  const hp0 = g.player.hp; let low = hp0, fell = false, burstInAir = false, landed = false;
  for (let k = 0; k < 120 && !(landed && !g.plunge); k++) { step(); fell ||= !!g.fall; low = Math.min(low, g.player.hp); if (g.fall && g.effects.some((e: any) => e.kind === 'plunge-burst')) burstInAir = true; landed ||= !g.fall && !(t < g.jumpUntil); }
  assert.ok(fell, 'a fall from the dive\'s height'); assert.equal(burstInAir, false); assert.ok(g.effects.some((e: any) => e.kind === 'plunge-burst'), 'the burst where it lands');
  assert.equal(g.playerLevel(), 0); assert.equal(g.fallLanded?.drop, 3, 'the fall counted from the dive\'s launch height'); assert.ok(hp0 - low > 0 && low <= hp0 - fallDamage(3, M) + Math.ceil(M * .15), `charged (${hp0} -> ${low}; the burst's Shadow Boxing heal comes back the same frame)`);
});
