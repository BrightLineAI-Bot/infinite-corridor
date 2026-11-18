// Falls everywhere (Tim, 2026-11-18): "Aerial Step works the same everywhere: open world, every dungeon/interior/labyrinth/Pentagon/
// annex, including places with elevation"; "lethal falls play out over real time... death happens only on landing if nothing saved
// them"; during the fall Aerial Step, Rift Step and the drone save the Wayfarer; a pause or reload mid-fall resumes exactly and never
// duplicates a death; the weapon is put away for Aerial Step's cast. game.ts fallFloor/fallArea (FALL_EVERYWHERE), FALL_RESCUE,
// fallDoomed, droneCallable; constellation.ts riftCommit; renderer.ts drawFallDoom, aerialHandsFreeStd; close-view-hero.ts
// aerialHandsFree.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, FALL, FALL_RESCUE, AERIAL, fallFloor } from '../src/game.ts';
import { fallDamage } from '../src/landscape.ts';
import { APERTURE_SKILLS, APERTURE_BANDS } from '../src/items.ts';
import { ALT_UNLOCK_TIER, toggleAlt, learnRank, BRANCHES, riftStep, aerialChargeMax } from '../src/constellation.ts';
import { DRONE, ensureMech } from '../src/vehicle-gates.ts';
import { render, aerialHandsFreeStd } from '../src/renderer.ts';
import { ACTION_MOTION } from '../src/action-motion.ts';

const BUILDING = 'building:CINDER-VERGE-47:30:-3:hive:3r:f1', ROW = 20;
const inp = (x: number, y = 0, jump = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
// A Wayfarer inside a great building's floor (an interior heightfield: interiorTerrain, not a tall tower), with Aerial Step (and
// Quickening to rank 3 for Quickened Stride), Rift Step, and optionally a built drone set in the frame, docked.
function inside({ stride = false, rift = false, drone = false } = {}) {
  const s: any = freshSave(); s.seed = 'CINDER-VERGE-47'; s.maxHp = 100; s.perception.aperture = Math.max(3255, APERTURE_BANDS[ALT_UNLOCK_TIER].threshold);
  s.magicSkills.learned = { quickening: 3, 'aerial-step': 1 }; s.constellation.mods['light-feet'] = true; s.constellation.caps.motion = 'aerial-step';
  if (stride) assert.equal(toggleAlt(s, 'quickening').ok, true);
  if (rift) for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) learnRank(s, 'rift');
  if (drone) { s.farArray = { listeners: 10, gate: 5 }; s.mech = { built: true, active: false, mode: 'drone', fuel: DRONE.carry }; ensureMech(s); }
  const g: any = new Game(s, 0); g.save.session.activeDungeonId = BUILDING; g.save.session.dungeonReturn = { rx: 30, ry: -3, x: 16, y: 16 }; g.loadArea('dungeon', false);
  g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.player.maxHp = s.maxHp; return g;
}
// Rows ROW-1..ROW+1 of the hall (open, level 3 in the generated floor) re-laid: `at(x)` gives each tile's level.
function lay(g: any, at: (x: number) => number, place = true, x0 = 4, x1 = 36) {
  const W = g.map.width; for (let y = ROW - 1; y <= ROW + 1; y++) for (let x = x0; x <= x1; x++) Object.assign(g.map.tiles[y * W + x], { blocked: false, elev: at(x), slope: false, rampDir: undefined, hole: undefined, kind: 'rubbleFloor' });
  if (place) { g.player.x = 8.1; g.player.y = ROW - .75; }
}
const ledge = (g: any, high = 5, place = true) => lay(g, (x) => x <= 9 ? high : 0, place); // a raised floor five levels over the hall floor (lethal)
const pit = (g: any) => lay(g, (x) => x >= 9 && x <= 12 ? 0 : 3); // a pit three levels deep in a level-3 floor
function drive(g: any, hz = 60, t0 = 5000) { let t = t0; const dt = 1 / hz; return { step(x = 0, y = 0, jump = false) { t += 1000 / hz; g.lastUpdateNow = t; g.update(dt, inp(x, y, jump), t); g.enemies = []; return t; }, now: () => t }; }
const deaths = (g: any) => g.save.worldFlags.deaths || 0;
const dead = (g: any, d0 = 0) => deaths(g) > d0 || g.player.hp <= 0 || g._fatalFall === true;
const cast = (g: any, now: number, id = 'aerial-step') => { g.lastUpdateNow = now; return g.activateApertureSkill(id); };

test('every floor with height carries the fall model; flat floors and underwater scenes never do', () => {
  const g = inside(); assert.ok(g.map.interiorTerrain && !g.map.tallTower, 'a great building, not an Upwell'); assert.equal(g.fallApplies(), true);
  assert.equal(fallFloor(g.map), true); assert.equal(fallFloor({ tiles: [], interiorTerrain: { version: 1 } }), true);
  assert.equal(fallFloor({ tiles: [] }), false, 'a flat floor'); assert.equal(fallFloor({ tiles: [], landscape: {}, underwater: true }), false, 'underwater');
  assert.equal(fallFloor({ tiles: [], landscape: {}, building: {} }), false, 'an old flat interior');
});

test('indoors, a lethal ledge is a fall over real time: the body drops, the red cue shows, and death comes only on landing', () => {
  const g = inside(); ledge(g); const d = drive(g); let air = 0, doomed = 0, posed = 0, aliveInAir = true, d0 = deaths(g);
  for (let i = 0; i < 400 && !dead(g, d0); i++) { d.step(i < 60 ? 1 : 0); if (g.fall) { air++; if (g.fallDoomed()) doomed++; if (g.fallPoseDue()) posed++; if (g.player.hp <= 0) aliveInAir = false; } }
  assert.ok(dead(g, d0), 'five levels kill'); assert.ok(aliveInAir, 'alive all through the air');
  assert.ok(air >= 40, `real airtime (${air} frames at 60 a second)`); assert.ok(doomed >= air - 2, 'the doom cue for the whole fall'); assert.ok(posed > 10, 'the falling pose');
  // a two-level step down is a fall too, and costs the old 15% on landing (non-lethal falls are unchanged)
  const k = inside(); ledge(k, 2); const dk = drive(k); let doom2 = false; for (let i = 0; i < 200 && !(i > 60 && !k.fall); i++) { dk.step(i < 60 ? 1 : 0); doom2 ||= k.fallDoomed(); }
  assert.equal(doom2, false, 'no doom cue for a fall it survives'); assert.equal(k.player.maxHp - k.player.hp, fallDamage(2, k.save.maxHp));
});

test('indoors, Aerial Step walks on air at its cast height over a lethal drop and over a pit, as in the open world', () => {
  const g = inside(); ledge(g); const d = drive(g); assert.equal(cast(g, d.now()), true);
  for (let i = 0; i < 90; i++) d.step(1);
  assert.ok(g.player.x > 11, `out over the drop (${g.player.x.toFixed(2)})`); assert.ok(g.fall && g.fall.z === 5 && g.fall.vz === 0, 'held at the cast height');
  assert.equal(g.aerialHeld(), true); assert.equal(g.playerLevel(), 5); assert.equal(g.fallDoomed(), false, 'held: no doom'); assert.equal(g.player.hp, g.player.maxHp);
  // it ends over the hall floor: the fall goes on from the held height, under FALL, lethal
  const d0 = deaths(g); for (let i = 0; i < 600 && !dead(g, d0); i++) d.step(0); assert.ok(dead(g, d0), 'five levels from the held height');
  // the pit: walked across on the held level, out onto the far floor, nothing lost
  const k = inside(); pit(k); const dk = drive(k); assert.equal(cast(k, dk.now()), true);
  for (let i = 0; i < 130; i++) dk.step(1); assert.ok(k.player.x > 13, `across (${k.player.x.toFixed(2)})`);
  for (let i = 0; i < 30; i++) dk.step(0); assert.equal(k.fall, null, 'standing on the far floor'); assert.equal(k.playerLevel(), 3); assert.equal(k.player.hp, k.player.maxHp);
  // without it, the pit is a three-level fall with its 40%, after the airtime
  const n = inside(); pit(n); const dn = drive(n); let air = 0; for (let i = 0; i < 200 && !(air && !n.fall); i++) { dn.step(i < 50 ? 1 : 0); if (n.fall) air++; }
  assert.ok(air > 15, 'a real fall'); assert.equal(n.player.maxHp - n.player.hp, fallDamage(3, n.save.maxHp)); assert.equal(n.playerLevel(), 0, 'in the pit');
});

test('indoors, cast while falling it catches; two casts an airtime with Quickened Stride\'s two charges, the same rules as outside', () => {
  const g = inside({ stride: true }); assert.equal(aerialChargeMax(g.save), 2); ledge(g); const d = drive(g);
  for (let i = 0; i < 160 && !(g.fall && g.fall.z < 3.5); i++) d.step(1); assert.ok(g.fall && g.fall.vz < 0, 'falling');
  const z = g.fall.z; assert.equal(cast(g, d.now()), true); assert.equal(g.fall.vz, 0); assert.equal(g.fall.hold, z); assert.equal(g.fall.from, z, 'counted afresh from the catch');
  for (let i = 0; i < 30; i++) d.step(0); assert.ok(Math.abs(g.fall.z - z) < 1e-12, 'held');
  g.save.magicSkills.active.remaining = 0; d.step(0); assert.ok(g.fall && g.fall.hold === undefined, 'ended: falling again');
  for (let i = 0; i < 4; i++) d.step(0); assert.equal(cast(g, d.now()), true, 'the second charge, the second cast this airtime');
  g.save.magicSkills.active.remaining = 0; d.step(0); g.save.magicSkills.aerialCharges = 2; g.save.magicSkills.cooldowns['aerial-step'] = 0;
  assert.equal(cast(g, d.now()), false, 'a third is refused before the feet touch ground'); assert.equal(g.message, AERIAL.capped);
});

test('indoors, Rift Step mid-fall steps out of it onto the ground with nothing charged; the docked drone answers Jump and catches', () => {
  const g = inside({ rift: true }); ledge(g); const d = drive(g);
  for (let i = 0; i < 160 && !(g.fall && g.fall.z < 3); i++) d.step(1); assert.ok(g.fall && g.fall.vz < 0 && g.fallDoomed(), 'a lethal fall under way');
  g.player.lastMoveVector = { x: 1, y: 0 }; assert.equal(riftStep(g, d.now()), true); assert.equal(g.fall, null); assert.equal(g.message, FALL_RESCUE.rift);
  for (let i = 0; i < 60; i++) d.step(0); assert.equal(g.player.hp, g.player.maxHp, 'alive and whole'); assert.equal(g.playerLevel(), 0);
  const k = inside({ drone: true }); ledge(k); assert.equal(k.droneUp(), false, 'docked'); assert.equal(k.droneCallable(), true); const dk = drive(k);
  for (let i = 0; i < 160 && !(k.fall && k.fall.z < 3.5); i++) dk.step(1); assert.ok(k.fall, 'falling');
  dk.step(0, 0, true); assert.equal(k.fall, null, 'caught'); assert.ok(k.droneLift, 'on the drone'); assert.equal(k.droneUp(), true, 'called up'); assert.equal(k.message, FALL_RESCUE.callDrone);
  for (let i = 0; i < 600 && k.droneLift; i++) dk.step(0, 0, k.droneLift.vz < -1.5); assert.ok(k.player.hp > 0 && deaths(k) === 0, 'down alive');
});

test('pause and reload mid-fall indoors resume exactly, and the landing kills once (no second death on the reloaded copy)', () => {
  const g = inside(); ledge(g); const d = drive(g); for (let i = 0; i < 200 && !(g.fall && g.fall.z < 4); i++) d.step(1);
  assert.ok(g.fall && g.fall.z > 2, 'mid-fall'); const snap = JSON.parse(JSON.stringify(g.exportSnapshot(d.now()))), z = g.fall.z, vz = g.fall.vz, t = g.fall.t, x = g.player.x;
  // pause: nothing moves
  g.setPaused(true, d.now()); for (let i = 0; i < 30; i++) d.step(1); assert.equal(g.fall.z, z); assert.equal(g.player.x, x); g.setPaused(false, d.now());
  // reload: in the air at the same height, speed and clock, then on frame for frame as the original
  const r: any = new Game(migrateSave(snap), d.now()); r.enemies = []; ledge(r, 5, false); // the test's hand-laid ledge (the floor itself regenerates as generated)
  assert.equal(r.area, 'dungeon'); assert.ok(r.fall, 'still in the air'); assert.equal(r.fall.z, z); assert.equal(r.fall.vz, vz); assert.equal(r.fall.t, t); assert.equal(r.fall.from, 5); assert.equal(r.player.x, x);
  const dg = drive(g, 60, d.now()), dr = drive(r, 60, d.now()), g0 = deaths(g), r0 = deaths(r); let same = true;
  for (let i = 0; i < 120 && (g.fall || r.fall); i++) { dg.step(0); dr.step(0); if (!!g.fall !== !!r.fall || g.fall && Math.abs(g.fall.z - r.fall.z) > 1e-9) same = false; }
  for (let i = 0; i < 30; i++) { dg.step(0); dr.step(0); }
  assert.ok(same, 'frame for frame'); assert.equal(deaths(g) - g0, 1, 'one death'); assert.equal(deaths(r) - r0, 1, 'one death on the reloaded copy');
  for (let i = 0; i < 60; i++) dr.step(0); assert.equal(deaths(r) - r0, 1, 'and never a second');
});

test('the standard view: an indoor fall is drawn over the floor with its shadow, and a doomed fall pulses red at the edges', () => {
  const g = inside(); ledge(g); const d = drive(g); const stops: string[] = []; let shadows = 0;
  const ctx: any = new Proxy({}, { get: (o: any, k: any) => k === 'createRadialGradient' ? () => ({ addColorStop: (_: number, c: string) => stops.push(c) }) : k === 'createLinearGradient' || k === 'createPattern' ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 10 }) : k === 'canvas' ? { width: 390, height: 844 } : k === 'getTransform' ? () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) : k === 'ellipse' ? () => { if (o.fillStyle === '#05050466') shadows++; } : k in o ? o[k] : () => {}, set: (o: any, k: any, v: any) => { o[k] = v; return true; } });
  for (let i = 0; i < 160 && !(g.fall && g.fall.z < 4); i++) d.step(1); assert.ok(g.fall && g.fallDoomed());
  render(ctx, g, 390, 844, d.now()); assert.ok(stops.some((c) => c.startsWith(`rgba(${FALL_RESCUE.flash.color},`) && !c.endsWith(',0)')), 'the red edge'); assert.ok(shadows > 0, 'the shadow below');
  stops.length = 0; g.presentation = { reduceMotion: true }; render(ctx, g, 390, 844, d.now()); assert.ok(stops.includes(`rgba(${FALL_RESCUE.flash.color},${FALL_RESCUE.flash.still.toFixed(3)})`), 'Reduced Motion: a steady tint');
  const k = inside(); ledge(k, 2); const dk = drive(k); for (let i = 0; i < 80 && !k.fall; i++) dk.step(1); stops.length = 0; render(ctx, k, 390, 844, dk.now());
  assert.ok(!stops.some((c) => c.startsWith(`rgba(${FALL_RESCUE.flash.color},`)), 'a survivable fall: no red');
});

test('the open world: a great tree\'s closed freefall is doomed until the glider opens, and Rift Step steps out of it too', () => {
  const s: any = freshSave(); s.seed = 'ROOF'; s.maxHp = 100; s.perception.aperture = 3255; for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) learnRank(s, 'rift');
  Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 }); const g: any = new Game(s, 0); g.enemies = []; g.player.hp = g.player.maxHp = s.maxHp;
  const W = 32; for (let y = 28; y <= 31; y++) for (let x = 1; x <= 20; x++) Object.assign(g.map.tiles[y * W + x], { kind: 'ash', blocked: false, elev: 0, slope: false, environment: undefined, structure: undefined, buildingId: undefined, canopy: undefined, skyPlatform: undefined });
  g.player.x = 6; g.player.y = 29; g.glide = { z: 12, vx: 0, vy: 0, vz: -4, open: false, fallFrom: 14, told: false, tree: true };
  assert.equal(g.fallDoomed(), true, 'the closed freefall'); g.glide.open = true; assert.equal(g.fallDoomed(), false, 'open: it glides down'); g.glide.open = false;
  g.player.lastMoveVector = { x: 1, y: 0 }; g.lastUpdateNow = 6000; assert.equal(riftStep(g, 6000), true); assert.equal(g.glide, null); assert.equal(g.fall, null); assert.equal(g.message, FALL_RESCUE.rift);
  const d = drive(g, 60, 6000); for (let i = 0; i < 30; i++) d.step(0); assert.equal(g.player.hp, g.player.maxHp);
});

test('the weapon is put away for Aerial Step\'s cast in both views, and back when it is over', () => {
  const g = inside(); const d = drive(g); g.save.equipment.primary = g.save.equipment.primary || { id: 'salvage-blade' };
  assert.equal(aerialHandsFreeStd(g, d.now()), false, 'in hand before'); assert.equal(cast(g, d.now()), true);
  d.step(0); assert.equal(aerialHandsFreeStd(g, d.now()), true, 'put away while it is cast');
  for (let i = 0; i < Math.ceil(ACTION_MOTION.castMs / 16) + 20; i++) d.step(0); assert.equal(aerialHandsFreeStd(g, d.now()), false, 'back after');
  const cv = fs.readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8'), rd = fs.readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(cv, /const handsFree=aerialHandsFree\(state\.heroPose\);if\(handsFree\)gear\.profile='';/, 'Close View: no weapon drawn');
  assert.match(cv, /if \(offhandTool && !handsFree\) offset = writeCloseViewHeldTool/, 'nor the off-hand tool');
  assert.match(rd, /if \(!STD_HANDS_FREE\) rect\(p\[2\]/, 'the standard view: no blade'); assert.match(rd, /!handsFree && g\.save\.activeWeaponSlot !== "secondary" && isQuandrixStaff/, 'nor the Quandrix Staff');
});
