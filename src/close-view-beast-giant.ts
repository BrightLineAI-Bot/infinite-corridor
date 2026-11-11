// The Lightning Giant in Close View (release 887): the same machine as its standard-view art (lightning-giant-render.ts,
// release 257: a big armoured, Armored Core-style robot that has lost one arm, a Tesla mace in the other, a booster in the
// empty socket, three coil jets and a lead generator fanned like plumage over the back of its helm, a Tesla coil pylon on
// the club shoulder, a glowing chest core), built as a solid skinned body on the shared beast rig (close-view-beast-rig.ts)
// and animated from its real attack clocks (monster-pack.ts ATTACK_MODULES.giant*, GIANT). Every blow reaches its contact
// pose at the instant the game resolves it: the swing's two cuts at the start and the middle of its active phase, the slam at
// the end of its wind-up, the menacing slam at the end of each strike wait, the upswing as each upswing begins. Nothing
// here changes timing, damage, reach or targeting.
//
// Proportions are GIANT_ART's, in body units (the standard view's u: one tile times the actor's scale), so the Close View
// body is exactly as tall as the sprite: 1.12 u to the helm, the jets above it.
import { GIANT_ART } from "./lightning-giant-render.ts";
import { ATTACK_MODULES, BOSS_PACE, GIANT } from "./monster-pack.ts";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, setWorldAxes, aimWorld, boneLocalToWorld, writeSkin, solveTwoBone,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, easeOut, mix, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.ts";

const A = GIANT_ART;
const hex = (s) => parseInt(s.slice(1), 16);
// Balance-free presentation numbers (body units, seconds, radians), in one table.
export const GIANT_RIG = Object.freeze({
  // Tim, 2026-11-11: "he should be 100% larger", then "50%", then "maybe 25%". Close View draws the Giant a quarter larger than
  // its standard-view size (presentation only: its body radius, reach, hit areas and timings are the game's and do not change).
  closeViewScale: 1.25,
  hip: .56, thigh: .265, shin: .265, ankle: .06, hipWidth: .14, upperArm: .21, foreArm: .2, club: .62,
  stride: .62, stance: .6, footLift: .12, bob: .022, sway: .028, settle: 4,
  turnRate: 3.2, attackTurnRate: 9, blendMs: 150, deathMs: 2600, landMs: 420, hitMs: 360,
  breathe: Object.freeze({ rate: 1.15, chest: .006, lift: .004 }),
  // Club key poses in the chest frame: grip offset from the shoulder (f, r, u), the club's direction (f, r, u), and the body:
  // chest twist (yaw, + to its right), chest pitch (+ forward), pelvis drop (crouch), pelvis shift forward, lean (whole-body pitch).
  poses: Object.freeze({
    idle: { grip: [.17, .06, -.3], dir: [.55, .2, -.81], twist: 0, pitch: .04, crouch: .015, shift: 0, lean: 0 },
    arcsLoad: { grip: [.06, .1, -.24], dir: [.35, .25, -.9], twist: .18, pitch: .1, crouch: .05, shift: -.02, lean: 0 },
    arcs: { grip: [.38, .02, -.08], dir: [.97, -.05, -.22], twist: -.12, pitch: .12, crouch: .06, shift: .04, lean: .06 },
    pointLoad: { grip: [.12, .08, -.06], dir: [.35, .1, .93], twist: .22, pitch: -.04, crouch: .03, shift: -.03, lean: 0 },
    point: { grip: [.37, 0, -.04], dir: [.95, 0, -.3], twist: -.18, pitch: .1, crouch: .04, shift: .05, lean: .05 },
    swingReady: { grip: [-.08, .14, .12], dir: [-.62, .32, .72], twist: .62, pitch: -.04, crouch: .07, shift: -.04, lean: 0 },
    swingCut1: { grip: [.33, .1, -.06], dir: [.92, .02, -.38], twist: .05, pitch: .14, crouch: .09, shift: .05, lean: .06 },
    swingFore: { grip: [.24, -.12, -.2], dir: [.38, -.84, -.38], twist: -.62, pitch: .2, crouch: .1, shift: .06, lean: .05 },
    swingBackLoad: { grip: [.2, -.16, -.05], dir: [.1, -.92, .38], twist: -.72, pitch: .1, crouch: .08, shift: .02, lean: .02 },
    swingCut2: { grip: [.34, .06, -.1], dir: [.95, .1, -.28], twist: -.05, pitch: .16, crouch: .09, shift: .05, lean: .05 },
    swingBack: { grip: [.08, .22, -.15], dir: [-.25, .9, -.35], twist: .6, pitch: .14, crouch: .09, shift: .02, lean: .03 },
    slamRaise: { grip: [.05, .02, .36], dir: [-.3, .04, .95], twist: .1, pitch: -.18, crouch: -.02, shift: -.05, lean: -.04 },
    slamDown: { grip: [.36, .02, -.17], dir: [.62, 0, -.78], twist: -.04, pitch: .34, crouch: .13, shift: .07, lean: .1 },
    raise: { grip: [.04, .03, .38], dir: [.06, .04, 1], twist: .05, pitch: -.14, crouch: 0, shift: -.03, lean: -.03 },
    menace: { grip: [0, .06, .35], dir: [-.42, .12, .9], twist: .2, pitch: -.06, crouch: .04, shift: -.02, lean: 0 },
    chest: { grip: [.06, .2, -.28], dir: [.25, .62, -.74], twist: .08, pitch: -.12, crouch: .05, shift: -.03, lean: -.05 },
    chargeLow: { grip: [-.12, .14, -.3], dir: [-.66, .3, -.69], twist: .38, pitch: .3, crouch: .12, shift: .05, lean: .16 },
    upswing: { grip: [.32, .04, .1], dir: [.62, -.05, .78], twist: -.2, pitch: -.05, crouch: .02, shift: .06, lean: .04 },
    upswingHigh: { grip: [.12, .02, .34], dir: [-.2, -.05, .98], twist: -.1, pitch: -.14, crouch: -.01, shift: .02, lean: 0 },
    air: { grip: [.06, .06, .3], dir: [.2, .1, .97], twist: 0, pitch: -.08, crouch: 0, shift: 0, lean: 0 },
    dazed: { grip: [.16, .08, -.33], dir: [.3, .25, -.92], twist: .1, pitch: .22, crouch: .09, shift: .02, lean: .03 },
  }),
});
const POSE_KEYS = ['grip', 'dir', 'twist', 'pitch', 'crouch', 'shift', 'lean'];
const K = 11; // grip 3, dir 3, twist, pitch, crouch, shift, lean
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(GIANT_RIG.poses).map(([name, p]) => {
  const v = new Float64Array(K); v.set(p.grip, 0); const l = Math.hypot(...p.dir); v[3] = p.dir[0] / l; v[4] = p.dir[1] / l; v[5] = p.dir[2] / l;
  v[6] = p.twist; v[7] = p.pitch; v[8] = p.crouch; v[9] = p.shift; v[10] = p.lean; return [name, v];
})));
void POSE_KEYS;

// ------------------------------------------------------------------------------------------------ skeleton
const R = GIANT_RIG;
export const GIANT_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'cloud', parent: 'root', at: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', at: [0, 0, R.hip] },
  { name: 'thighL', parent: 'pelvis', at: [0, -R.hipWidth, -.01] },
  { name: 'shinL', parent: 'thighL', at: [0, 0, -R.thigh] },
  { name: 'footL', parent: 'shinL', at: [0, 0, -R.shin] },
  { name: 'thighR', parent: 'pelvis', at: [0, R.hipWidth, -.01] },
  { name: 'shinR', parent: 'thighR', at: [0, 0, -R.thigh] },
  { name: 'footR', parent: 'shinR', at: [0, 0, -R.shin] },
  { name: 'spine', parent: 'pelvis', at: [0, 0, .07] },
  { name: 'chest', parent: 'spine', at: [0, 0, .12] },
  { name: 'neck', parent: 'chest', at: [0, 0, .19] },
  { name: 'head', parent: 'neck', at: [.02, 0, .035] },
  { name: 'jet0', parent: 'head', at: [-.163, 0, .307] },
  { name: 'jet1', parent: 'head', at: [-.222, 0, .229] },
  { name: 'jet2', parent: 'head', at: [-.226, 0, .154] },
  { name: 'jet3', parent: 'head', at: [-.085, 0, .365] },
  { name: 'shoulderR', parent: 'chest', at: [-.01, .3, .15] },
  { name: 'upperArmR', parent: 'shoulderR', at: [0, 0, 0] },
  { name: 'foreArmR', parent: 'upperArmR', at: [0, 0, -R.upperArm] },
  { name: 'handR', parent: 'foreArmR', at: [0, 0, -R.foreArm] },
  { name: 'club', parent: 'handR', at: [0, 0, 0] },
  { name: 'clubArc', parent: 'club', at: [R.club, 0, 0] },
  { name: 'pylon', parent: 'chest', at: [-.07, .27, .27] },
  { name: 'pylonArc', parent: 'pylon', at: [-.05, 0, .215] },
  { name: 'socketL', parent: 'chest', at: [-.04, -.29, .14] },
  { name: 'plume', parent: 'socketL', at: [-.02, -.03, 0] },
  { name: 'spark0', parent: 'chest', at: [0, 0, 0] },
  { name: 'spark1', parent: 'chest', at: [0, 0, 0] },
  { name: 'spark2', parent: 'chest', at: [0, 0, 0] },
]);
const BI = GIANT_SKELETON.index;
// Emissive channels (close-view-beast-gl.ts): 1 core and visor, 2 coils, club capacitor and trim, 3 jet bursts and the
// booster, 4 loose lightning.
const E_CORE = 1, E_COIL = 2, E_BURST = 3, E_BOLT = 4;

// The four helm jets (from lightning-giant-render.ts crest(): root, 2D direction, coil length, radius, burst length).
const JETS = [[-.09, .245, -2.45, .085, .032, .26], [-.145, .199, -2.78, .07, .027, .2], [-.165, .148, -3.04, .055, .022, .14], [-.03, .267, -2.08, .1, .036, .36]];
const jetDir = (a) => [Math.cos(a), 0, -Math.sin(a)]; // 2D (x forward, y down) to (f, r, u)

// ------------------------------------------------------------------------------------------------ the body
const C = {
  metal: hex(A.metal), dark: hex(A.metalDark), edge: hex(A.metalEdge), plate: hex(A.plate), copper: hex(A.copper), copperDark: hex(A.copperDark),
  core: hex(A.core), hot: hex(A.coreHot), trim: hex(A.trim), rivet: hex(A.rivet), visor: 0x1a2026, haft: 0x59626c, steel: 0xd6dde4, rod: 0xc9d3dc,
  farTone: 0x4a535d, hydraulic: 0x3e464f, cloudDark: 0x3d4550, cloudMid: 0x5f6a76, cloudLight: 0x8a95a1, cloudCap: 0xb4bec8,
};
function buildGiantMesh(tier) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(GIANT_SKELETON, d);
  const U = [0, 0, 1], F = [1, 0, 0], DOWN = [0, 0, -1];
  // Legs: armoured thigh, knee cap, shin with guard and calf hydraulics, heavy wedge foot with toe plate and heel.
  for (const side of ['L', 'R']) {
    const s = side === 'R' ? 1 : -1;
    B.bone('thigh' + side).color(C.metal).box({ at: [0, 0, -.115], size: [.105, .085, .125], bevel: .25, taper: -.12 });
    if (!low) B.color(C.plate).box({ at: [.065, s * .02, -.1], size: [.04, .07, .095], bevel: 0, F: [1, 0, -.15] });
    B.bone('shin' + side).color(C.plate).box({ at: [.055, 0, .005], size: [.06, .07, .055], bevel: 0, taper: .2 }); // knee cap
    B.color(C.metal).box({ at: [0, 0, -.12], size: [.085, .075, .12], bevel: .25, taper: -.15 });
    if (!low) B.color(C.plate).box({ at: [.075, 0, -.1], size: [.022, .052, .1], bevel: 0, taper: .15 }); // shin guard
    if (!low) {
      B.color(C.hydraulic).lathe({ at: [-.07, 0, -.04], F: DOWN, rings: [[0, .024], [.1, .024]], seg: 6 });
      B.color(C.rod).lathe({ at: [-.07, 0, -.14], F: DOWN, rings: [[0, .011], [.07, .011]], seg: 5, caps: false });
    }
    if (full) B.color(C.trim, E_COIL).box({ at: [.1, 0, -.02], size: [.006, .05, .007], bevel: 0 });
    if (!low) B.bone('foot' + side).color(C.dark).ellipsoid({ at: [0, 0, .005], radius: [.05, .05, .05], rings: 3, seg: 6 }); // ankle
    B.bone('foot' + side).color(C.dark).box({ at: [.035, 0, -.03], size: [.14, .085, .032], bevel: .3, taper: .25, skew: -.02 });
    B.color(C.plate).box({ at: [.16, 0, -.042], size: [.045, .075, .022], bevel: 0, taper: .3 }); // toe plate
    if (!low) B.color(C.dark).box({ at: [-.085, 0, -.035], size: [.035, .07, .028], bevel: 0 }); // heel
  }
  // Pelvis and the hip skirt (tassets over both thigh roots).
  B.bone('pelvis').color(C.dark).box({ at: [0, 0, 0], size: [.15, .2, .07], bevel: .25 });
  if (!low) for (const s of [-1, 1]) B.color(C.dark).box({ at: [.07, s * .11, -.07], size: [.06, .085, .075], bevel: 0, U: [.35, 0, 1], F: [1, 0, -.35] });
  if (!low) B.color(C.metal).box({ at: [-.1, 0, -.05], size: [.04, .16, .07], bevel: 0, F: [1, 0, .3] });
  // Waist: two segmented collars.
  B.bone('spine').color(C.dark).box({ at: [0, 0, .0], size: [.13, .16, .035], bevel: 0 });
  if (!low) { B.color(C.edge).box({ at: [0, 0, .045], size: [.12, .15, .012], bevel: 0 }); B.color(C.dark).box({ at: [0, 0, .08], size: [.14, .17, .035], bevel: 0 }); }
  // Chest: a barrel torso, breastplate around the glowing core, a back pack, collar, trim seams and rivets.
  B.bone('chest').color(C.metal).box({ at: [0, 0, .07], size: [.2, .28, .13], bevel: .28, taper: -.1 });
  B.color(C.plate).box({ at: [.12, 0, .06], size: [.1, .22, .11], bevel: .3, taper: .12, skew: .01 });
  B.color(C.dark).lathe({ at: [.21, .0, .055], F, rings: [[-.01, .09], [.02, .088], [.025, .07]], seg: 10, smooth: false, caps: false });
  B.color(C.core, E_CORE).ellipsoid({ at: [.235, 0, .055], radius: [.022, .068, .068], rings: 3 });
  if (!low) B.color(C.hot, E_CORE).ellipsoid({ at: [.252, 0, .055], radius: [.012, .036, .036], rings: 2, seg: 6 });
  if (!low) for (const s of [-1, 1]) B.color(C.trim, E_COIL).box({ at: [.2, s * .16, .06], size: [.012, .045, .008], bevel: 0, F: [1, s * .5, 0] });
  B.color(C.dark).box({ at: [-.17, 0, .08], size: [.07, .19, .11], bevel: 0, taper: .1 }); // back pack
  if (full) for (const z of [.04, .09, .14]) B.color(C.edge).box({ at: [-.24, 0, z], size: [.006, .15, .01], bevel: 0 }); // vents
  B.color(C.dark).box({ at: [0, 0, .2], size: [.15, .18, .04], bevel: 0, taper: .1 }); // raised collar
  if (full) for (const [f, r, u] of [[.2, -.17, .13], [.2, .19, .13], [.21, -.19, -.01], [.21, .2, -.01]]) B.color(C.rivet).box({ at: [f, r, u], size: [.012, .012, .012], bevel: 0 });
  // Head: a heavy dome with a jutting brow, a visor slit (lit), a jaw guard, the crown cap with its lit channel, and the four
  // coil jets fanned back from the crown.
  B.bone('head').color(C.metal).ellipsoid({ at: [.01, 0, .115], radius: [.155, .14, .13], rings: 4, seg: 9, F: U, U: [1, 0, 0] });
  if (!low) B.color(C.plate).box({ at: [.13, 0, .145], size: [.04, .125, .022], bevel: 0, F: [1, 0, -.2] }); // brow
  B.color(C.visor).box({ at: [.145, 0, .1], size: [.025, .105, .028], bevel: 0 });
  B.color(C.core, E_CORE).box({ at: [.168, 0, .1], size: [.006, .085, .009], bevel: 0 });
  B.color(C.dark).box({ at: [.115, 0, .035], size: [.05, .095, .04], bevel: 0, taper: .2 }); // jaw guard
  B.color(C.metal).box({ at: [-.02, 0, .225], size: [.12, .1, .035], bevel: .35, taper: .25 }); // crown cap
  if (!low) B.color(C.trim, E_COIL).box({ at: [-.01, 0, .262], size: [.1, .012, .006], bevel: 0, F: [1, 0, -.15] }); // lit channel
  JETS.forEach(([x0, y0, a, len, r], n) => {
    if (low && n < 2) return;
    const dir = jetDir(a), at = [x0, 0, y0], Fj = dir, tip = len + r * .3;
    B.color(C.hydraulic).lathe({ at, F: Fj, rings: [[0, r], [len * .82, r * .9]], seg: 6, smooth: false, caps: false });
    if (!low) for (let k = 0; k < 2; k++) { const f = len * (.2 + .35 * k); B.color(k % 2 ? C.copperDark : C.copper).lathe({ at, F: Fj, rings: [[f, r * 1.1], [f + len * .18, r * 1.1]], seg: 6, caps: false }); }
    B.color(C.metal).lathe({ at, F: Fj, rings: [[len * .78, r * .95], [tip, r * 1.4]], seg: 6, smooth: false, caps: false });
    B.color(C.hot, E_BURST).lathe({ at, F: Fj, rings: [[tip - .002, r * 1.3], [tip, 0]], seg: 6, caps: false });
  });
  // The bursts: a lightning-bolt glyph of energy out of each nozzle, crossed so it reads from every side.
  JETS.forEach(([, , a, , r, burst], n) => {
    if (low && n < 2) return;
    const dir = jetDir(a), w = r * 1.5, L = burst, glyph = [[0, -w * .55], [L * .5, -w * .15], [L * .44, -w * .85], [L, 0], [L * .52, w * .2], [L * .58, w * .9], [0, w * .55]];
    B.bone('jet' + n).color(C.hot, E_BURST);
    // two flat crossed planes (the emissive shader lights both faces the same)
    const Pa = B.frame({ F: dir, U: [0, 1, 0] }), Pb = B.frame({ F: dir, U: [-dir[2], 0, dir[0]] });
    B.poly(glyph.map(([a, b]) => Pa(a, 0, b))); B.poly(glyph.map(([a, b]) => Pb(a, 0, b)));
  });
  // The club arm: pauldron with its blue rim, armoured upper arm, elbow, gauntlet and fist.
  B.bone('shoulderR').color(C.plate).ellipsoid({ at: [-.005, .035, .03], radius: [.15, .13, .1], rings: 4, F: U, U: [1, 0, 0] });
  B.color(C.trim, E_COIL).lathe({ at: [-.005, .035, -.035], F: U, rings: [[0, .145], [.012, .14]], seg: 10, rs: 1, us: .87, caps: false });
  if (full) for (const [f, r] of [[-.08, .05], [.02, .1], [.1, .07]]) B.color(C.rivet).box({ at: [f, r, .1], size: [.012, .012, .012], bevel: 0 });
  B.bone('upperArmR').color(C.metal).box({ at: [0, 0, -.1], size: [.07, .065, .1], bevel: .3 });
  B.bone('foreArmR').color(C.plate).ellipsoid({ at: [0, 0, 0], radius: [.065, .065, .065], rings: 4 });
  B.color(C.metal).box({ at: [0, 0, -.1], size: [.085, .08, .105], bevel: .28, taper: .12 });
  if (!low) B.color(C.dark).box({ at: [.07, 0, -.11], size: [.02, .055, .08], bevel: 0 });
  B.bone('handR').color(C.dark).box({ at: [0, 0, -.02], size: [.078, .072, .055], bevel: 0, taper: .1 });
  if (!low) for (const r of [-.035, 0, .035]) B.color(C.edge).box({ at: [.075, r, -.02], size: [.006, .006, .04], bevel: 0 }); // knuckles
  // The Tesla mace along +f: steel haft with grip wraps, a lower flange, the flanged capacitor head wound in copper, two
  // vents and the capacitor cap.
  B.bone('club').color(C.haft).lathe({ at: [0, 0, 0], F, rings: [[-.09, .034], [.37, .037]], seg: 8 });
  if (!low) for (const f of [-.05, .02, .09]) B.color(0x2a2f35).lathe({ at: [0, 0, 0], F, rings: [[f, .041], [f + .025, .041]], seg: 8, caps: false });
  B.color(C.dark).lathe({ at: [0, 0, 0], F, rings: [[.33, .045], [.37, .13], [.385, .085]], seg: 8, smooth: false });
  B.color(C.metal).lathe({ at: [0, 0, 0], F, rings: [[.38, .1], [.42, .125], [.57, .118], [.605, .075], [.615, .03]], seg: 8, smooth: false });
  if (!low) for (const f of [.44, .485, .53]) {
    B.color(f === .485 ? C.copper : C.copperDark).lathe({ at: [0, 0, 0], F, rings: [[f, .127], [f + .028, .127]], seg: 8, caps: false });
  }
  for (const s of [-1, 1]) B.color(C.core, E_COIL).box({ at: [.555, s * .06, .1], size: [.018, .016, .01], bevel: 0 });
  B.color(C.hot, E_COIL).ellipsoid({ at: [.615, 0, 0], radius: [.032, .045, .045], rings: 3 });
  // The coil pylon on the club shoulder (leaning back): a vented mount, a core rod, copper windings and a steel toroid.
  const lean = [-.22, 0, .975];
  B.bone('pylon').color(C.dark).box({ at: [0, 0, .02], size: [.06, .06, .025], bevel: 0, taper: .2 });
  B.color(C.farTone).lathe({ at: [0, 0, .04], F: lean, rings: [[0, .024], [.17, .02]], seg: 6 });
  for (let i = 0; i < (low ? 0 : 5); i++) B.color(i % 2 ? C.copperDark : C.copper).lathe({ at: [0, 0, .04], F: lean, rings: [[.03 + i * .028, .04 - i * .003], [.05 + i * .028, .04 - i * .003]], seg: 7, caps: false });
  B.color(C.steel).lathe({ at: [-.045, 0, .23], F: lean, rings: [[-.014, .03], [0, .062], [.014, .03]], seg: 9 });
  // The lost arm's socket: a ring housing with severed cable stubs, a steady glow inside.
  B.bone('socketL').color(C.farTone).lathe({ at: [0, -.01, 0], F: [0, -1, 0], rings: [[-.02, .075], [.04, .095], [.06, .07]], seg: 10, smooth: false, caps: false });
  B.color(C.core, E_CORE).lathe({ at: [0, -.01, 0], F: [0, -1, 0], rings: [[.05, .06], [.056, 0]], seg: 10, caps: false });
  if (!low) for (const [a, l] of [[2.5, .06], [3.2, .045], [3.9, .055]]) {
    const c = Math.cos(a), sn = Math.sin(a);
    B.color(C.copperDark).lathe({ at: [c * .06, -.07, -sn * .065], F: [c * .3, -1, -sn * .3 - .3], rings: [[0, .012], [l, .009]], seg: 4 });
  }
  // The booster's eruption (scaled in while it boosts): layered cones out behind the machine, white at the mouth.
  const plumeDir = [-.82, -.5, .12];
  B.bone('plume').color(C.core, E_BURST).lathe({ at: [0, 0, 0], F: plumeDir, rings: [[0, .065], [.12, .085], [.34, .05], [.5, 0]], seg: 8 });
  if (!low) B.color(C.hot, E_BURST).lathe({ at: [0, 0, 0], F: plumeDir, rings: [[-.01, .045], [.08, .05], [.24, .022], [.32, 0]], seg: 7 });
  // Loose lightning (scaled in when it crackles): from the pylon's toroid, from the club head, and three arcs round the body.
  B.bone('pylonArc').color(C.hot, E_BOLT).bolt({ points: [[0, 0, 0], [.03, .02, .05], [-.01, -.02, .1], [.04, .01, .16]], width: .008 });
  B.bone('clubArc').color(C.hot, E_BOLT).bolt({ points: [[0, 0, 0], [.05, .04, .03], [.09, -.03, .06], [.16, .02, .04], [.2, -.02, .1]], width: .01 });
  for (let n = 0; n < (full ? 3 : 1); n++) B.bone('spark' + n).color(C.hot, E_BOLT).bolt({ points: [[.42, 0, -.2], [.46, .1, -.1], [.4, .16, 0], [.44, .26, .12], [.36, .3, .22]], width: .01 });
  // The storm cloud it rides at sea and rises on at its chasm (scaled in only then): billows, lit caps and dark bellies.
  const puffs = low ? [[-.3, 0, .0, .2], [0, .05, .05, .24], [.3, -.03, 0, .2], [0, -.25, -.02, .18], [.05, .28, -.02, .18]]
    : [[-.38, .0, .0, .19], [-.2, -.12, .04, .18], [-.02, .05, .1, .22], [.2, -.06, .1, .22], [.4, .02, .04, .18], [.55, -.02, -.02, .12], [-.1, .28, -.02, .17], [.18, -.3, -.02, .16], [-.55, -.05, -.05, .13], [.05, .02, -.08, .26]];
  B.mark(); // the cloud is an optional section, drawn only while it rides or rises on it
  puffs.forEach(([f, r, u, rad], n) => B.bone('cloud').color(n % 3 === 0 ? C.cloudCap : n % 3 === 1 ? C.cloudLight : C.cloudMid).ellipsoid({ at: [f, r, u], radius: [rad, rad * .9, rad * .6], rings: 3, seg: low ? 6 : 7 }));
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function giantMesh(tier = 'full') { return MESHES[tier] ||= buildGiantMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track (render-only state)
export function createGiantTrack() {
  return {
    pose: createPose(GIANT_SKELETON),
    gait: createGait([{ side: -.15, phase: .5 }, { side: .15, phase: 0 }]),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(K), shown: new Float64Array(K), target: new Float64Array(K),
    hp: NaN, hitAt: -Infinity, hitSide: 0, airWas: 0, landAt: -Infinity, landHard: 0, fired: 0, firedAt: -Infinity, struckAt: -Infinity,
    deathAt: null, x: 0, y: 0, z: 0, scale: 1, deathDir: 1, seq: -1, mode: '', strikes: -1, impactAt: -Infinity,
    frame: { kind: 'lightningGiant', tier: 'full', mesh: null, skin: null, boneCount: GIANT_SKELETON.count, alpha: 1, hit: 0,
      emitK: new Float32Array(4), emitA: new Float32Array(4), x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0,
      feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ the pose
const V = new Float64Array(K), W2 = new Float64Array(K), H = new Float64Array(3), T = new Float64Array(3), J = new Float64Array(3), POLE = new Float64Array(3);
function setVec(out, name) { out.set(POSE_VEC[name] || POSE_VEC.idle); }
function lerpVec(out, a, b, t) { const pa = POSE_VEC[a] || POSE_VEC.idle, pb = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) out[k] = pa[k] + (pb[k] - pa[k]) * t; normDir(out); }
function lerpInto(out, b, t) { const pb = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) out[k] += (pb[k] - out[k]) * t; normDir(out); }
function normDir(v) { const l = Math.hypot(v[3], v[4], v[5]) || 1; v[3] /= l; v[4] /= l; v[5] /= l; }
// Seconds since the phase began and its share, for pack phase clocks (s.t counts down; paced bosses stretch the wind-up).
function phaseOf(pack, id) {
  const mod = ATTACK_MODULES[id] || {}, d = pack.phase === 'windup' ? (mod.windup || .5) * (pack.paced ? BOSS_PACE.windup : 1) : pack.phase === 'active' ? mod.active || 0 : mod.recover || .5;
  const t = Number.isFinite(pack.t) ? pack.t : 0; return d > 0 ? clamp01(1 - t / d) : 1;
}
// The movement and attack the body acts out this frame: fills V (the pose vector) and returns facts the rest of the pose
// uses (the aim to face, the share of a strike, the glows). Pure in (e, its pack state, the time); `tr` carries only the
// moments of impulses it has already seen.
const ACT = { aimX: 0, aimY: 0, aim: false, coil: 0, core: 0, plume: 0, bolts: 0, still: false, contact: 0, phase: '', tremble: 0, airTuck: 0, brace: 0 };
function act(e, tr, now, target) {
  const pack = e.pack, id = pack?.attack, ph = pack?.phase, d = pack?.data || {}, g = e.giantPose;
  ACT.aim = false; ACT.coil = 0; ACT.core = 0; ACT.plume = e.giantThrust ? 1 : 0; ACT.bolts = 0; ACT.still = false; ACT.contact = 0; ACT.phase = id ? `${id}:${ph}` : 'move'; ACT.tremble = 0; ACT.airTuck = 0; ACT.brace = 0;
  const aimAt = (x, y) => { const dx = x - e.x, dy = y - e.y, l = Math.hypot(dx, dy); if (l > .01) { ACT.aimX = dx / l; ACT.aimY = dy / l; ACT.aim = true; } };
  const aimDir = (a) => { if (a && Number.isFinite(a.x) && Number.isFinite(a.y) && Math.hypot(a.x, a.y) > .01) { const l = Math.hypot(a.x, a.y); ACT.aimX = a.x / l; ACT.aimY = a.y / l; ACT.aim = true; } };
  const x = id ? phaseOf(pack, id) : 0;
  if (!id) {
    setVec(V, 'idle');
    if (e.giantThrust) { lerpInto(V, 'chargeLow', 1); ACT.still = true; ACT.brace = 1; } // a traversal burst
    return;
  }
  ACT.still = true;
  if (id === 'giantArcs') {
    if (target) aimAt(target.x, target.y);
    if (ph === 'windup') { lerpVec(V, 'idle', 'arcsLoad', smooth(x / .7)); if (x > .7) lerpInto(V, 'arcs', easeIn(span(x, .7, 1))); ACT.coil = .4 + 1.1 * x; ACT.bolts = x > .6 ? 1 : 0; ACT.contact = x > .97 ? 1 : 0; }
    else if (ph === 'active') { setVec(V, 'arcs'); ACT.coil = 1.6; ACT.bolts = 1; ACT.tremble = 1; ACT.contact = 1; }
    else { lerpVec(V, 'arcs', 'idle', smooth(x)); ACT.coil = 1.2 * (1 - x); }
  } else if (id === 'giantShock') {
    const p = d.target; if (p) aimAt(p.x, p.y); else if (target) aimAt(target.x, target.y);
    if (ph === 'windup') { lerpVec(V, 'idle', 'pointLoad', smooth(x / .45)); if (x > .45) lerpInto(V, 'point', easeOut(span(x, .45, .85))); ACT.coil = .3 + 1.2 * x; ACT.bolts = x > .8 ? 1 : 0; }
    else { // pointFire: the shock went off at the end of the wind-up; the club kicks up and settles
      setVec(V, 'point'); const k = kick(x * (ATTACK_MODULES.giantShock.recover || .5), 10, 6); V[5] += .35 * k; V[7] -= .06 * k; normDir(V);
      lerpInto(V, 'idle', smooth(span(x, .35, 1))); ACT.coil = 1.6 * (1 - x); ACT.bolts = x < .3 ? 1 : 0; ACT.contact = x < .15 ? 1 : 0;
    }
  } else if (id === 'giantSwing') {
    aimDir(d.aim);
    if (ph === 'windup') { // load to the cocked swing, hold the tension, then the fore-cut reaches contact as the wind-up ends
      lerpVec(V, 'idle', 'swingReady', smooth(x / .55));
      if (x > .55 && x <= .8) { V[6] += .04 * Math.sin((x - .55) * 40) * (x - .55) * 4; ACT.tremble = .5; }
      if (x > .8) lerpInto(V, 'swingCut1', easeIn(span(x, .8, 1)));
      ACT.coil = .4 + .8 * x; ACT.contact = x > .98 ? 1 : 0;
    } else if (ph === 'active') {
      // cut 1 resolved at x = 0: follow through to the left; re-cock; cut 2 resolves at x = .5 (the back-swing, re-aimed)
      if (x < .2) lerpVec(V, 'swingCut1', 'swingFore', easeOut(x / .2));
      else if (x < .36) lerpVec(V, 'swingFore', 'swingBackLoad', smooth(span(x, .2, .36)));
      else if (x < .5) lerpVec(V, 'swingBackLoad', 'swingCut2', easeIn(span(x, .36, .5)));
      else if (x < .72) lerpVec(V, 'swingCut2', 'swingBack', easeOut(span(x, .5, .72)));
      else setVec(V, 'swingBack');
      ACT.coil = 1.1; ACT.contact = x < .06 || (x >= .5 && x < .56) ? 1 : 0;
    } else lerpVec(V, 'swingBack', 'idle', smooth(x));
  } else if (id === 'giantSlam') {
    aimDir(d.aim);
    if (ph === 'windup') { lerpVec(V, 'idle', 'slamRaise', smooth(x / .66)); if (x > .66 && x <= .82) ACT.tremble = .6; if (x > .82) lerpInto(V, 'slamDown', easeIn(span(x, .82, 1))); ACT.coil = .4 + 1.3 * x; ACT.bolts = x > .5 ? 1 : 0; ACT.contact = x > .98 ? 1 : 0; }
    else { // the blow landed at the end of the wind-up: impact, the club bedded in the ground, then it hauls it free
      setVec(V, 'slamDown'); const k = kick(x * (ATTACK_MODULES.giantSlam.recover || .7), 14, 8); V[8] += .045 * k; V[7] += .06 * k;
      if (x > .45) lerpInto(V, 'idle', smooth(span(x, .45, 1))); ACT.coil = 1.6 * (1 - x); ACT.bolts = x < .25 ? 1 : 0; ACT.contact = x < .12 ? 1 : 0;
    }
  } else if (id === 'giantElectrify') {
    if (ph === 'windup') {
      lerpVec(V, 'idle', 'raise', smooth(x / .3)); const at = GIANT.strikeAt, since = (x - at) * (ATTACK_MODULES.giantElectrify.windup || 1.6) * (pack.paced ? BOSS_PACE.windup : 1);
      if (x >= at) { const k = kick(since, 22, 5); V[8] += .03 * Math.abs(k); V[7] -= .05 * k; ACT.bolts = 1; ACT.coil = 2.2 - .4 * span(x, at, 1); ACT.contact = since < .15 ? 1 : 0; }
      else { ACT.coil = .5 + 1.2 * x / at; ACT.tremble = .3 * x; }
    } else { lerpVec(V, 'raise', 'idle', smooth(x)); ACT.coil = 1.8; ACT.bolts = 1; }
  } else if (id === 'giantMenace') {
    if (target) aimAt(target.x, target.y); if (d.aim && (d.mode === 'strike' || d.mode === 'bolt' || d.mode === 'honest')) aimDir(d.aim);
    if (ph === 'windup') { lerpVec(V, 'idle', 'menace', smooth(x)); V[8] += .05 * Math.sin(Math.PI * clamp01(x * 1.4)); ACT.coil = .6 + .6 * x; }
    else if (ph === 'active') {
      if (d.mode === 'stalk') { setVec(V, 'menace'); ACT.still = false; ACT.coil = 1; }
      else if (d.mode === 'strike') { const y = 1 - clamp01((d.wait ?? 0) / GIANT.menaceWindup); lerpVec(V, 'menace', 'slamRaise', smooth(y / .62)); if (y > .62) lerpInto(V, 'slamDown', easeIn(span(y, .62, 1))); ACT.coil = .8 + .9 * y; ACT.contact = y > .97 ? 1 : 0; }
      else if (d.mode === 'beat') { const y = 1 - clamp01((d.wait ?? 0) / GIANT.menaceBeat), struck = e.giantPose === 'slamDown';
        if (struck) { setVec(V, 'slamDown'); const k = kick(y * GIANT.menaceBeat, 14, 8); V[8] += .045 * k; lerpInto(V, 'menace', smooth(span(y, .35, 1))); ACT.contact = y < .3 ? 1 : 0; }
        else { setVec(V, 'chest'); V[7] -= .06 * kick(y * GIANT.menaceBeat, 12, 7); lerpInto(V, 'menace', smooth(span(y, .3, 1))); }
        ACT.coil = 1.2; }
      else if (d.mode === 'bolt' || d.mode === 'honest') { const total = d.mode === 'bolt' ? GIANT.chestWindup : d.shot ? GIANT.honestStagger : GIANT.honestWindup, y = 1 - clamp01((d.wait ?? 0) / total);
        lerpVec(V, 'menace', 'chest', smooth(clamp01(y * 2.5))); ACT.core = 1 + 1.2 * y; ACT.coil = 1; ACT.contact = y > .95 ? 1 : 0; }
      else setVec(V, g === 'chest' ? 'chest' : 'menace');
    } else lerpVec(V, g === 'chest' ? 'chest' : 'slamDown', 'idle', smooth(x));
  } else if (id === 'giantUpswing') {
    if (d.aim) aimDir(d.aim); else if (target) aimAt(target.x, target.y);
    if (ph === 'windup') { lerpVec(V, 'idle', 'chargeLow', smooth(x)); ACT.coil = .6 + .6 * x; ACT.plume = x > .5 ? (x - .5) * 2 : 0; ACT.brace = x; }
    else if (ph === 'active') {
      const m = d.mode;
      if (m === 'dash') { setVec(V, 'chargeLow'); ACT.plume = e.giantThrust ? 1 : .5; ACT.brace = 1; ACT.coil = 1; if (d.dash?.dir) aimDir(d.dash.dir); }
      else if (m === 'upswing') { const y = 1 - clamp01((d.left ?? 0) / GIANT.upswingTime); // contact as the mode began: travel fast, then follow through high
        lerpVec(V, 'chargeLow', 'upswing', easeOut(clamp01(y / .14))); if (y > .14) lerpInto(V, 'upswingHigh', easeOut(span(y, .14, .6))); ACT.coil = 1.4; ACT.contact = y < .14 ? 1 : 0; ACT.bolts = y < .3 ? 1 : 0; }
      else if (m === 'air') {
        setVec(V, 'air'); ACT.airTuck = 1; ACT.coil = 1.3;
        if (d.air === 'barrage') { if (d.fired !== tr.fired) { tr.fired = d.fired; tr.firedAt = now; } const k = kick((now - tr.firedAt) / 1000, 16, 9); V[3] += .5 * Math.max(0, k); V[5] -= .4 * Math.max(0, k); normDir(V); ACT.bolts = 1; }
        else if (d.clock <= 0) { lerpInto(V, 'chargeLow', .7); ACT.plume = 1; ACT.bolts = 1; }
      } else if (m === 'slamFall') { const y = 1 - clamp01((d.left ?? 0) / GIANT.landWarn); lerpVec(V, 'air', 'slamRaise', smooth(y / .6)); if (y > .7) lerpInto(V, 'slamDown', easeIn(span(y, .7, 1))); ACT.airTuck = 1 - y; ACT.coil = 1.6; ACT.contact = y > .97 ? 1 : 0; }
      else if (m === 'fall') { setVec(V, 'air'); ACT.airTuck = .3; }
      else setVec(V, 'chargeLow');
    } else lerpVec(V, g === 'slamDown' ? 'slamDown' : g === 'upswing' ? 'upswingHigh' : 'chargeLow', 'idle', smooth(x));
  } else setVec(V, 'idle');
  if (!ACT.aim && target) aimAt(target.x, target.y);
}

// Sample the Giant's pose for this frame. env: { x, y, z (ground under its feet, world), scale, now (ms), reduce, tier,
// target (the Wayfarer, for the head and arcs), dead (true once the game killed it) }. Returns the track's frame, or null.
export function sampleGiant(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(4, Number(env.scale) || 1)), P = tr.pose, G = GIANT_RIG;
  const dt = Number.isFinite(tr.at) ? Math.min(.1, Math.max(0, (now - tr.at) / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; tr.scale = S; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  // what it is doing
  if (!dead) act(e, tr, now, env.target); else { setVec(V, 'dazed'); ACT.still = true; ACT.aim = false; ACT.coil = 0; ACT.core = 0; ACT.plume = 0; ACT.bolts = 0; ACT.contact = 0; ACT.phase = 'death'; ACT.tremble = 0; ACT.airTuck = 0; ACT.brace = 0; }
  // facing: commit to the aim of the blow; otherwise turn toward where it walks, slowly (a heavy machine)
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y;
  let want = tr.yaw;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dy, dx);
  else if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : G.turnRate * (e.giantCharged > 0 ? 1.4 : 1); tr.yaw += Math.max(-1, Math.min(1, dt * rate)) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // crossfade between acts (a new attack, a new sub-mode): never across a contact, which lives inside one act's timeline
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}:${e.pack.data?.mode || ''}:${e.pack.data?.strikes || 0}` : e.giantThrust ? 'thrust' : dead ? 'death' : 'move';
  if (tr.key === '') { tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < K; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  normDir(tr.shown); W2.set(tr.shown);
  // hits, landings and the stagger (additive)
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const air = dead ? 0 : Math.max(0, Number(e.giantAir) || 0);
  if (tr.airWas > .05 && air <= .05) { tr.landAt = now; tr.landHard = Math.min(1, tr.airWas / 1.2 + .4); }
  tr.airWas = air;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 11) : 0;
  W2[7] -= .1 * hit; W2[6] -= .12 * hit * tr.hitSide; W2[8] += .02 * Math.abs(hit);
  const landT = (now - tr.landAt) / 1000, land = landT < G.landMs / 1000 ? Math.max(0, kick(landT, 9, 7)) * tr.landHard : 0;
  W2[8] += .11 * land; W2[7] += .12 * land;
  const stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0) { const dz = POSE_VEC.dazed; for (let k = 0; k < K; k++) W2[k] += (dz[k] - W2[k]) * stun; normDir(W2); }
  if (ACT.tremble && !reduce) { const q = Math.sin(t * 61) * .5 + Math.sin(t * 43) * .5; W2[7] += .012 * q * ACT.tremble; W2[6] += .01 * q * ACT.tremble; }
  // gait: planted feet driven by the distance it actually travelled
  const still = ACT.still || !!e.giantThrust || air > .05 || dead || !!e.marine || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.stride * S, stance: G.stance, settle: G.settle, still, snapDistance: 3 * S });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  // root: position, yaw, scale; death topples it like a felled tower (pivot at the feet), away from its killer
  resetPose(P);
  let rootZ = env.z + air, alpha = 1;
  const cloud = (e.marine && e.fleeFade == null) || (e.giantCloud && e.fleeFade != null);
  if (e.marine && e.fleeFade == null) rootZ += S * (A.cloudRide + (reduce ? 0 : Math.sin(t * 1.6) * A.cloudBob));
  if (e.fleeFade != null && e.giantCloud) { rootZ += (1 - e.fleeFade) * S * 2.4; alpha = Math.min(1, e.fleeFade * 1.6); }
  else if (e.fleeFade != null) { alpha = clamp01(e.fleeFade); rootZ -= (1 - e.fleeFade) * S * .4; }
  let topple = 0;
  if (dead) {
    if (death < 1e-9 || tr.deathDir === 0) { const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.deathDir = (px - e.x) * cf + (py - e.y) * sf > 0 ? -1 : 1; } // falls away from the Wayfarer
    const buckle = smooth(death / .14), fall = easeIn(span(death, .12, .5)), bounce = death > .5 ? Math.max(0, kick((death - .5) * G.deathMs / 1000, 12, 6)) * .05 : 0;
    topple = tr.deathDir * (1.42 * fall - bounce); W2[8] += .14 * buckle; alpha *= 1 - span(death, .8, 1); rootZ -= S * .05 * span(death, .75, 1);
  }
  setEuler(P, BI.root, yaw, topple, 0); P.scl[BI.root] = S;
  resolveBone(P, BI.root, x, y, rootZ);
  P.scl[BI.cloud] = cloud ? 1 : 0; setOffset(P, BI.cloud, 0, 0, -.02); resolveBone(P, BI.cloud);
  // pelvis: crouch, weight forward, the gait's bob (down at each plant) and sway over the stance foot, breathing
  const breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe.rate / 2.4);
  const bob = moving * G.bob * (.5 - .5 * Math.cos(cyc * 2)), sway = moving * G.sway * Math.sin(cyc);
  setOffset(P, BI.pelvis, W2[9], sway * (reduce ? .5 : 1), -W2[8] - bob + breathe * G.breathe.lift * .5);
  setEuler(P, BI.pelvis, (reduce ? 0 : moving * .06 * Math.sin(cyc)), W2[10] + (ACT.brace ? .05 * ACT.brace : 0), -sway * .8);
  resolveBone(P, BI.pelvis);
  // legs (resolved below, after the upper body: they hang from the pelvis already resolved)
  // spine and chest: twist toward the blow, lean, counter-rotate the stride, breathe
  setEuler(P, BI.spine, W2[6] * .4 - (reduce ? 0 : moving * .05 * Math.sin(cyc)), W2[7] * .4, sway * .6); resolveBone(P, BI.spine);
  setEuler(P, BI.chest, W2[6] * .6, W2[7] * .6, 0); setOffset(P, BI.chest, 0, 0, breathe * G.breathe.lift);
  P.scl[BI.chest] = 1 + breathe * G.breathe.chest * .4; resolveBone(P, BI.chest);
  // head: looks where it will strike (or at the Wayfarer), steadied against the stride, within a machine's neck
  setEuler(P, BI.neck, 0, -W2[7] * .3 + bob * 2, 0); resolveBone(P, BI.neck);
  let lookYaw = 0, lookPitch = 0;
  if (env.target && !dead) { const lx = env.target.x - e.x, ly = env.target.y - e.y, ang = Math.atan2(ly, lx) - yaw - W2[6]; lookYaw = Math.max(-.7, Math.min(.7, Math.atan2(Math.sin(ang), Math.cos(ang)))) * (ACT.contact ? .3 : .75); }
  if (stun > 0) lookPitch = .35 * stun + (reduce ? 0 : .12 * Math.sin(t * 3.1) * stun);
  if (dead) lookPitch = .4 * span(death, .1, .4);
  setEuler(P, BI.head, lookYaw, lookPitch - .08 * hit + (reduce ? 0 : .015 * wobble(t * .5, 3)), 0); resolveBone(P, BI.head);
  // jets: each burst pulses on its own beat (scale along its length)
  for (let n = 0; n < 4; n++) { const i = BI['jet' + n]; P.scl[i] = dead ? Math.max(0, 1 - death * 2.5) : reduce ? .85 : .75 + .25 * Math.sin(t * 13 + n * 2.1) + .2 * Math.min(1, ACT.coil * .3); resolveBone(P, i); }
  // club arm: two-bone IK from the shoulder to the grip, elbow out and down; the club aims along its direction
  resolveBone(P, BI.shoulderR);
  const ci = BI.chest * 9, Wc = P.wr, cs = Math.hypot(Wc[ci], Wc[ci + 1], Wc[ci + 2]) || 1;
  const toWorld = (f, r, u, o) => { for (let k = 0; k < 3; k++) o[k] = (Wc[ci + k] * f + Wc[ci + 3 + k] * r + Wc[ci + 6 + k] * u) / cs; };
  const si = BI.shoulderR * 3; H[0] = P.wp[si]; H[1] = P.wp[si + 1]; H[2] = P.wp[si + 2];
  let gf = W2[0], gr = W2[1], gu = W2[2];
  if (!ACT.still && !dead) { gf += moving * .05 * Math.sin(cyc + Math.PI); gu += moving * .02 * Math.cos(cyc * 2); } // the club swings a little with the stride
  if (!reduce && !e.pack?.attack && !dead) { gf += .008 * breathe; gr += .006 * wobble(t * .4, 1); }
  toWorld(gf * S, gr * S, gu * S, T); T[0] += H[0]; T[1] += H[1]; T[2] += H[2];
  toWorld(-.15, .6, -.75, POLE); // the elbow out and down (back for a raised club)
  if (W2[5] > .5) { toWorld(-.6, .55, -.2, POLE); }
  solveTwoBone(H, T, G.upperArm * S, G.foreArm * S, POLE, J);
  toWorld(1, 0, 0, POLE);
  aimWorld(P, BI.upperArmR, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, BI.upperArmR);
  aimWorld(P, BI.foreArmR, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, BI.foreArmR);
  toWorld(W2[3], W2[4], W2[5], V); // (V is free now) the club direction in the world
  aimWorld(P, BI.handR, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], V[0], V[1], V[2]); resolveBone(P, BI.handR);
  toWorld(0, 0, 1, POLE); if (Math.abs(V[0] * POLE[0] + V[1] * POLE[1] + V[2] * POLE[2]) > .9) toWorld(-1, 0, 0, POLE);
  aimWorld(P, BI.club, 0, V[0], V[1], V[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, BI.club);
  const flick = reduce ? 0 : Math.floor(now / 70); // lightning re-forms every 70 ms (lightning-giant-render.ts lightningBolt flicker)
  const boltsOn = !reduce && !dead && (ACT.bolts || e.giantCharged > 0);
  P.scl[BI.clubArc] = boltsOn && (ACT.bolts || flick % 3 === 0) ? .8 + .4 * ((flick * 7) % 5) / 5 : 0;
  setEuler(P, BI.clubArc, (flick % 4) * 1.57, (flick % 3 - 1) * .5, 0); resolveBone(P, BI.clubArc);
  // pylon and its spark (the 2D sprite's stray arc when sin(t*7) > .85, always while charged or arcing)
  resolveBone(P, BI.pylon);
  P.scl[BI.pylonArc] = !reduce && !dead && (e.giantCharged > 0 || ACT.bolts || e.giantPose === 'arcs' || Math.sin(t * 7 + .29) > .85) ? 1 : 0;
  setEuler(P, BI.pylonArc, (flick % 5) * 1.26, 0, 0); resolveBone(P, BI.pylonArc);
  // the socket and its eruption: scaled in while it boosts (or during the charge's flare), flickering
  resolveBone(P, BI.socketL);
  const plume = dead ? 0 : Math.max(ACT.plume, e.giantThrust ? 1 : 0);
  P.scl[BI.plume] = plume > 0 ? plume * (reduce ? 1 : .85 + .15 * (Math.sin(t * 38) * .5 + .5)) : 0; resolveBone(P, BI.plume);
  // loose arcs round the body while it runs hot, re-forming each flicker
  for (let n = 0; n < 3; n++) { const i = BI['spark' + n]; P.scl[i] = boltsOn && e.giantCharged > 0 && ((flick + n) % 3 !== 2) ? 1 : 0; setEuler(P, i, n * 2.1 + flick * .9, ((flick + n) % 3 - 1) * .3, 0); resolveBone(P, i); }
  // legs: two-bone IK to planted (or swinging) feet, knees forward; braced while boosting, tucked in the air
  const pi = BI.pelvis * 9, Wp = P.wr, ps = Math.hypot(Wp[pi], Wp[pi + 1], Wp[pi + 2]) || 1;
  const fwdX = cf, fwdY = sf;
  for (let side = 0; side < 2; side++) {
    const tag = side ? 'R' : 'L', sgn = side ? 1 : -1, ti = BI['thigh' + tag];
    resolveBone(P, ti); const hi = ti * 3; H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    let fx = tr.gait.out[side * 4], fy = tr.gait.out[side * 4 + 1], lift = tr.gait.out[side * 4 + 2];
    let fz = env.z + G.ankle * S + lift * G.footLift * S;
    if (still || dead) {
      // braced stance: the club-side foot back for the swing and the charge, the other forward; or tucked in the air
      const lead = ACT.brace ? (side ? -1.4 : 1.2) * .12 : (W2[6] > .3 ? (side ? -.07 : .06) : W2[6] < -.3 ? (side ? .06 : -.05) : 0);
      const spread = .15 + .03 * Math.min(1, Math.abs(W2[6]) + ACT.brace);
      const hx = x + (fwdX * lead - fwdY * sgn * spread) * S, hy = y + (fwdY * lead + fwdX * sgn * spread) * S;
      if (air > .05 || e.marine || e.fleeFade != null) { fx = hx; fy = hy; fz = rootZ + (G.ankle + .02 + .12 * ACT.airTuck * (side ? 1 : .7)) * S; }
      else if (tr.gait.out[side * 4 + 3] && !ACT.brace && Math.hypot(fx - hx, fy - hy) < .1 * S) { /* stay planted */ }
      else { fx = hx; fy = hy; }
    }
    T[0] = fx; T[1] = fy; T[2] = fz;
    if (dead) boneLocalToWorld(P, 'root', -.02, sgn * .16, G.ankle, T); // toppling: the legs go down with the body
    for (let k = 0; k < 3; k++) POLE[k] = Wp[pi + k] / ps; POLE[2] += .05; // knees forward
    solveTwoBone(H, T, G.thigh * S, G.shin * S, POLE, J);
    aimWorld(P, ti, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, ti);
    const si2 = BI['shin' + tag]; aimWorld(P, si2, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, si2);
    // the foot lies flat on the ground (toe pitched down in the swing, toward its heading)
    const toe = lift > 0 ? -.35 * lift : 0, fi = BI['foot' + tag], fyaw = yaw + sgn * .08;
    const cfx = Math.cos(fyaw) * Math.cos(toe), cfy = Math.sin(fyaw) * Math.cos(toe), cfz = Math.sin(toe);
    if (topple) { const ri = BI.root * 9; aimWorld(P, fi, 0, P.wr[ri] / S, P.wr[ri + 1] / S, P.wr[ri + 2] / S, P.wr[ri + 6] / S, P.wr[ri + 7] / S, P.wr[ri + 8] / S); }
    else aimWorld(P, fi, 0, cfx, cfy, cfz, 0, 0, 1);
    resolveBone(P, fi);
    tr.frame.feet[side * 2] = tr.gait.out[side * 4 + 3]; tr.frame.feet[side * 2 + 1] = lift;
  }
  writeSkin(P);
  // emissive channels: core and visor breathe (racing while charged), coils charge with the blow, bursts pulse, lightning flickers
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1, charged = e.giantCharged > 0;
  F.emitK[0] = life * Math.max(ACT.core, .55 + .45 * (reduce ? .6 : Math.sin(t * (charged ? 14 : 4)) * .5 + .5) * (charged ? 1.4 : 1));
  F.emitK[1] = life * Math.max(.55, ACT.coil, charged ? 1.2 + (reduce ? 0 : .3 * Math.sin(t * 17)) : 0);
  F.emitK[2] = life * (reduce ? .9 : .9 + .25 * Math.sin(t * 9));
  F.emitK[3] = life * 1.6;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = (flick % 2) ? 1 : .7;
  F.tier = env.tier || 'full'; F.mesh = giantMesh(F.tier); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0, 1)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air + (rootZ - env.z - air); F.shadow = cloud ? .5 : 1 - Math.min(.6, air / (2 * S)); F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = cloud;
  return F;
}
// What the tests read: the world position of a named bone after the last sample.
export const giantBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
