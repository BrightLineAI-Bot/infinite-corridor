// Tim's action-rule decisions of 2026-11-13 (claude/action-rules):
// 3. The glider is for great trees only: it deploys only when the Wayfarer leaves a great tree's crown or canopy (game.ts treeLaunch,
//    CANOPY_FALL_MS); the 926 Jump-mid-fall glider catch and the 641 freefall off any 4+ drop are gone, so those drops are ordinary
//    falls with their damage. Jump mid-fall with nothing to catch you says so (FALL.nothing). A closed glide in an old save that was
//    not a tree's (no `tree` mark, no glideHome) resumes as a fall at its height.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, FALL, GLIDE, CANOPY_FALL_MS, JUMP } from '../src/game.ts';
import { fallDamage } from '../src/landscape.ts';
import { learnRank, BRANCHES, riftStep } from '../src/constellation.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { DRONE, DRONE_LIFT, setMechMode } from '../src/vehicle-gates.ts';

const SEED = 'ROOF', W = 32, ROW = 30; let M = 100;
const inp = (x: number, y = 0, jump = false, hold = false, dodge = false) => { let j = jump, d = dodge; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : k === 'dodge' && d ? (d = false, true) : false, held: (k: string) => k === 'jump' && hold }; };
export function wayfarer({ rift = false, drone = false, glider = false } = {}) {
  const s: any = freshSave(); s.seed = SEED; s.maxHp = 100; s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; s.materials.lumenDust = 50;
  if (rift) { for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) learnRank(s, 'rift'); s.magicSkills.selected = 'rift-step'; }
  if (glider) s.glider = true;
  Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.player.hp = g.player.maxHp = s.maxHp;
  if (drone) { setMechMode(s, 'drone'); g.useConsumable('submersible', 0); s.mech.fuel = DRONE.carry; assert.ok(g.droneUp(), 'the drone is up'); }
  g.update(1 / 60, inp(0), 4000); g.enemies = []; g.player.hp = g.player.maxHp; M = g.save.maxHp; return g;
}
const open = (g: any, x: number, y: number, elev: number, extra = {}) => Object.assign(g.map.tiles[y * W + x], { kind: 'ash', blocked: false, elev, slope: false, environment: undefined, structure: undefined, buildingId: undefined, canopy: false, skyPlatform: false, ...extra });
// A cliff on row ROW: x 1..4 at `high` (a great tree's canopy platform when `tree`), x 5..20 at `low`.
function cliff(g: any, high: number, low = 0, tree = false) { for (let y = ROW - 1; y <= ROW + 1; y++) for (let x = 1; x <= 20; x++) open(g, x, y, x <= 4 ? high : low, x <= 4 && tree ? { canopy: true, skyPlatform: true } : {}); g.player.x = 3.6; g.player.y = ROW - .25; }
function drive(g: any, hz = 60, t0 = 5000) { let t = t0; const dt = 1 / hz; return { step(x = 0, y = 0, jump = false, hold = false, dodge = false) { t += 1000 / hz; g.update(dt, inp(x, y, jump, hold, dodge), t); g.enemies = []; return t; }, now: () => t, dt }; }
const deaths = (g: any) => g.save.worldFlags.deaths || 0;

test('3. a long drop off a great tree\'s canopy is still the tree glide (freefall, Jump opens it); off plain ground it is a fall', () => {
  const g = wayfarer({ glider: true }); cliff(g, 6, 0, true); const d = drive(g); for (let i = 0; i < 90 && !g.glide; i++) d.step(1);
  assert.ok(g.glide && g.glide.open === false && g.glide.tree === true, 'off the tree: the freefall glide'); assert.equal(g.message, GLIDE.falling);
  d.step(0, 0, true); assert.equal(g.glide.open, true, 'Jump opens it'); for (let k = 0; k < 600 && g.glide; k++) d.step(0); assert.equal(g.player.hp, M, 'down unharmed');
  const k = wayfarer({ glider: true }); cliff(k, 6); const dk = drive(k); let fell = false; for (let i = 0; i < 90 && !k.glide && !fell; i++) { dk.step(1); fell = !!k.fall; }
  assert.ok(fell && !k.glide, 'plain ground: an ordinary fall');
});

test('3. the tree launch lasts CANOPY_FALL_MS after leaving the canopy; later, a drop is an ordinary fall', () => {
  const g = wayfarer({ glider: true }); assert.equal(g.treeLaunch(5000), false, 'never on a tree');
  g.lastCrownAt = 5000; assert.equal(g.treeLaunch(5000 + CANOPY_FALL_MS - 1), true); assert.equal(g.treeLaunch(5000 + CANOPY_FALL_MS), false);
});

test('3. a jump off high plain ground: Jump mid-jump opens no glider; off a great tree it does', () => {
  for (const tree of [false, true]) {
    const g = wayfarer({ glider: true }); cliff(g, 6, 0, tree); g.player.x = 4.4; const d = drive(g); d.step(0); d.step(1, 0, true); for (let i = 0; i < 6; i++) d.step(1);
    assert.ok(g.jumpUntil > d.now(), 'mid-jump'); d.step(1, 0, true);
    if (tree) { assert.ok(g.glide && g.glide.open && g.glide.tree, 'opened mid-jump off the tree'); assert.equal(g.message, GLIDE.open); }
    else { assert.equal(g.glide, null, 'no glider off plain ground'); }
  }
});

test('3. Rift Step out over a 4+ drop with the glider owned is an ordinary (lethal) fall, not a freefall glide', () => {
  const g = wayfarer({ rift: true, glider: true }); cliff(g, 5); g.player.lastMoveVector = { x: 1, y: 0 }; g.lastUpdateNow = 5000;
  assert.equal(riftStep(g, 5000), true); assert.equal(g.glide, null, 'no glide'); assert.ok(g.fall && g.fall.z === 5, 'a fall from five levels');
  const d = drive(g, 60, 5000), d0 = deaths(g); for (let i = 0; i < 200 && deaths(g) === d0 && g.player.hp > 0; i++) d.step(0); assert.ok(deaths(g) > d0 || g.player.hp <= 0, 'fatal, as the table says');
  assert.equal(fallDamage(5, 100), Infinity);
});

test('3. Jump while falling with no drone says nothing can catch you, and the fall goes on', () => {
  const g = wayfarer({ glider: true }); cliff(g, 3); const d = drive(g); for (let i = 0; i < 90 && !g.fall; i++) d.step(1); assert.ok(g.fall);
  d.step(0, 0, true); assert.equal(g.message, FALL.nothing); assert.ok(g.fall, 'still falling'); assert.equal(g.glide, null);
  for (let i = 0; i < 120 && g.fall; i++) d.step(0); assert.equal(M - g.player.hp, fallDamage(3, M), 'the ordinary three-level damage');
});

test('3. old saves: a closed glide that was not a tree\'s resumes as a fall at its height; a tree\'s closed glide and an open glide resume as glides', () => {
  const g = wayfarer({ glider: true }); cliff(g, 0); g.player.x = 10; const snap = JSON.parse(JSON.stringify(g.exportSnapshot(6000)));
  // as release 926 wrote a 641 freefall: closed, no tree mark, no glideHome
  snap.session.playerRuntime.glide = { z: 6.5, vx: .3, vy: 0, open: false, fallFrom: 7, vz: -2 }; snap.session.playerRuntime.glideHome = null; snap.session.playerRuntime.fall = null;
  const a: any = new Game(migrateSave(JSON.parse(JSON.stringify(snap))), 0);
  assert.equal(a.glide, null, 'no glide'); assert.deepEqual([a.fall.z, a.fall.vz, a.fall.from], [6.5, -2, 7], 'a fall at its height and speed, counted from where it began');
  const da = drive(a, 60, 7000), d0 = deaths(a); for (let i = 0; i < 200 && deaths(a) === d0 && a.player.hp > 0; i++) da.step(0); assert.ok(deaths(a) > d0 || a.player.hp <= 0, 'seven levels: the lethal fall it was');
  // a tree's closed glide (marked) and an open glide stay glides
  for (const q of [{ z: 6.5, vx: 0, vy: 0, open: false, fallFrom: 7, vz: -2, tree: true }, { z: 6.5, vx: 0, vy: 0, open: true, fallFrom: null }]) {
    const s2 = JSON.parse(JSON.stringify(snap)); s2.session.playerRuntime.glide = q; const b: any = new Game(migrateSave(s2), 0); assert.ok(b.glide && b.glide.open === q.open, 'still a glide'); assert.equal(b.fall, null);
    const back = JSON.parse(JSON.stringify(b.exportSnapshot(6000))); assert.equal(back.session.playerRuntime.glide.tree, true, 'saved as a tree glide');
  }
  // a closed glide with a glideHome (a crown launch before the mark existed) stays a glide
  const s3 = JSON.parse(JSON.stringify(snap)); s3.session.playerRuntime.glideHome = { rx: -2, ry: 0, x: 10, y: 10 }; const c: any = new Game(migrateSave(s3), 0); assert.ok(c.glide && c.glide.open === false);
});

// 4. The drone-catch trap (pre-publish review): a caught lift climbs no higher than the catch, so a catch never costs more than the
//    fall it caught. Before, holding Jump after catching a three-level fall climbed to base + DRONE_LIFT.max (5) and an empty booster
//    then dropped the Wayfarer five levels to their death.
test('4. a drone catch never leaves you worse off: the caught lift\'s ceiling is the catch height', () => {
  for (const fuel of [DRONE.carry, .6]) {
    const g = wayfarer({ drone: true }); cliff(g, 3); const d = drive(g); for (let i = 0; i < 120 && !(g.fall && g.fall.z < 2.6); i++) d.step(1); assert.ok(g.fall, 'falling from three levels');
    g.save.mech.fuel = fuel; const z = g.fall.z; d.step(0, 0, true, true); assert.ok(g.droneLift, 'caught'); assert.equal(g.droneLift.cap, z, 'the cap is the catch height');
    let top = 0; for (let k = 0; k < 600 && g.droneLift; k++) { d.step(0, 0, false, true); top = Math.max(top, g.droneLift?.z ?? 0); } // hold Jump the whole way
    for (let k = 0; k < 200 && (g.droneLift || g.fall); k++) d.step(0);
    assert.ok(top <= z + 1e-9, `never above the catch (${top.toFixed(3)} <= ${z.toFixed(3)})`);
    assert.ok(M - g.player.hp <= fallDamage(3, M), `no worse than the uncaught three-level fall (lost ${M - g.player.hp})`); assert.equal(deaths(g), 0);
  }
});

test('4. the cap survives a save and reload mid-lift (exact resume), and an ordinary jump lift has none', () => {
  const g = wayfarer({ drone: true }); cliff(g, 3); const d = drive(g); for (let i = 0; i < 120 && !(g.fall && g.fall.z < 2.6); i++) d.step(1);
  d.step(0, 0, true, true); for (let k = 0; k < 10; k++) d.step(0, 0, false, true); const L = { ...g.droneLift }, x = g.player.x, y = g.player.y;
  const back: any = new Game(migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(d.now())))), d.now());
  assert.deepEqual([back.droneLift.z, back.droneLift.vz, back.droneLift.base, back.droneLift.cap], [L.z, L.vz, L.base, L.cap]); assert.deepEqual([back.player.x, back.player.y], [x, y]);
  const k = wayfarer({ drone: true }); cliff(k, 0); const dk = drive(k); dk.step(0, 0, true); dk.step(0, 0, true, true); assert.ok(k.droneLift); assert.equal(k.droneLift.cap, undefined, 'a lift from a jump keeps base + max');
});

// 2. Jump held from the ground brings up the drone at the jump's peak (JUMP.liftAt), under the double press's rules.
test('2. holding Jump from the ground starts the drone lift at the jump\'s peak; a tap is a plain jump; the double press still works', () => {
  const g = wayfarer({ drone: true }); cliff(g, 0); const d = drive(g); const t0 = d.step(0, 0, true, true); const start = g.jumpStart; assert.ok(Number.isFinite(start));
  const peak = start + JUMP.base * JUMP.liftAt; let began = -1;
  for (let i = 0; i < 40 && began < 0; i++) { const t = d.step(0, 0, false, true); if (g.droneLift) began = t; }
  assert.ok(began >= peak && began < peak + 1000 / 60 + 1e-6, `the lift began at the peak (${began - start} ms in)`); assert.equal(g.message, DRONE_LIFT.engage);
  for (let i = 0; i < 30; i++) d.step(0, 0, false, true); assert.ok(g.droneLift.z > 1, 'climbing while held'); assert.ok(t0 > 0);
  // a tap, or a let-go before the peak: a plain jump
  for (const holdFrames of [0, 5]) { const k = wayfarer({ drone: true }); cliff(k, 0); const dk = drive(k); dk.step(0, 0, true, holdFrames > 0); for (let i = 0; i < holdFrames; i++) dk.step(0, 0, false, true);
    for (let i = 0; i < 60; i++) { dk.step(0); assert.equal(k.droneLift ?? null, null, `let go after ${holdFrames} frames: no lift`); } }
  // held from the ground with no fuel: a plain jump, nothing said about the drone
  const e = wayfarer({ drone: true }); cliff(e, 0); e.save.mech.fuel = 0; const de = drive(e); de.step(0, 0, true, true); for (let i = 0; i < 40; i++) { de.step(0, 0, false, true); assert.equal(e.droneLift ?? null, null); } assert.notEqual(e.message, DRONE_LIFT.none);
  // without the drone up: a plain jump
  const n = wayfarer(); cliff(n, 0); const dn = drive(n); dn.step(0, 0, true, true); for (let i = 0; i < 40; i++) dn.step(0, 0, false, true); assert.equal(n.droneLift ?? null, null);
  // the double press still works (before the peak, with no hold)
  const q = wayfarer({ drone: true }); cliff(q, 0); const dq = drive(q); dq.step(0, 0, true); dq.step(0, 0, true, true); assert.ok(q.droneLift, 'second press');
});
