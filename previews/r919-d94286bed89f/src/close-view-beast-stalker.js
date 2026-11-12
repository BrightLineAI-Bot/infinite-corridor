// The Stalker in Close View (stalker.ts, stalker-render.ts): the standard view's silver hunter as solid skinned bodies on the shared
// beast rig. The fight moves it between forms, and the two it fights in are built here on one skeleton (40 bones), each body
// hidden by scale while the other is out:
// - the cat: a white six-legged snow leopard, lithe and low-slung, a dip behind the shoulders, a round haunch, a lean wedge of a
//   head carried low with ears laid back and burning cyan almond eyes, blue chevrons on its flanks, a long rope of a tail in an S
//   ending in a silver tip (drawCat, drawCatSit, drawCatClimb);
// - the ape: a white silverback leaning forward on its knuckles, a great hump, a silver saddle, dark chest and face under a heavy
//   brow, cyan eyes, short thick legs, and bat wings with three finger bones, folded like a cape, spread in flight, wrapped round
//   it like a cloak when it perches (drawApe, drawApeArm).
// Each body is one hide (Tim's review of 912: "a bunch of pieces instead of a coherent body"): the cat's trunk runs from rump to
// skull skinned across its spine bones, its six legs grow out of it through shoulder and haunch masses, and its tail flows from
// the hips; the ape's arms roll out of the hump through the deltoid, its legs out of the rump, its wings out of the shoulder
// blades. Their gaits carry weight: the cat's prowl rolls haunch against shoulders under a level head, the ape's hump rolls
// and sinks onto the planted knuckles.
// What grows out of its back is on the same skeleton: the turret, the appendage (sword, three spikes, the tendril into the ground),
// the two great liquid blades that cross in an X, the gorilla's launched fists on stretching arms, the energized sphere and the
// liquid shield (stalker.ts sets every one of them; this module reads them). The pool, the mist, the tide and the copies and decoys
// keep the standard view's billboard (close-view-beasts.ts `eligible`); the hidden states (lying in wait, the fog's veil, the
// mirage) already do (`hidden`). Its marks, eruptions, chomping puddles and flying shots lie on the floor (drawStalkerCloseViewFloor),
// where Close View draws an admitted beast's ground work. Nothing here changes timing, damage, reach or targeting.
import { STALKER } from "./stalker.js?v=r919-d94286bed89f";
import { drawStalkerMarks } from "./stalker-render.js?v=r919-d94286bed89f";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, solveTwoBone, boneLocalToWorld,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeOut, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r919-d94286bed89f";

export const STALKER_RIG = Object.freeze({
  closeViewScale: 1.25, // as every Close View beast (presentation only)
  turnRate: 7, attackTurnRate: 14, blendMs: 130, morphMs: 260, deathMs: 2000, hitMs: 260, strikeMs: 170,
  cat: Object.freeze({ thigh: .16, shin: .16, paw: .035, stride: .95, stance: .55, footLift: .1, bob: .018, settle: 6,
    // leg hips (f, r) by pair: fore, middle, hind; the hind knee bends forward
    legs: Object.freeze([[.3, .085], [0, .08], [-.34, .09]]), splay: 1.05, crouch: .12,
    // the prowl's roll (haunch and shoulders opposed), its fore-and-aft rock, and the tail's swing against the stride (radians)
    roll: .045, rock: .025, tailSwing: .14 }),
  ape: Object.freeze({ upper: .34, fore: .3, thigh: .18, shin: .16, foot: .045, fist: .07, stride: .85, stance: .6, footLift: .09, bob: .03, settle: 5,
    shoulder: Object.freeze([.26, .25, .68]), hip: Object.freeze([-.22, .16, .38]), crouch: .1,
    // the knuckle walk's weight on the planted arm: roll and yaw of the hump (radians), its sideways slide (model units), its sink
    weightRoll: .09, weightYaw: .06, weightShift: .035, weightSink: .07 }),
  // where the back moves rise from (body-local, on the cat's spine and the ape's chest), and the fist's height above its ground
  backCat: Object.freeze([-.02, 0, .15]), backApe: Object.freeze([-.18, 0, .2]), fistHeight: .3,
  bladeLength: 1, swordLength: 1, spikeLength: 1, // authored lengths (model units); the game's lengths set the bone scale
  auraRadius: 1, shieldRadius: 1.1, shieldArc: .9,
});
const SIDES = Object.freeze([['L', -1], ['R', 1]]);

// ------------------------------------------------------------------------------------------------ skeleton (40 bones)
// model space: f forward, r right, u up, at the standard view's size (u units); the root on the ground carries yaw and scale.
const CR = STALKER_RIG.cat, AR = STALKER_RIG.ape;
const CAT_LEG_PARENT = ['cChest', 'cSpine', 'cBody'], CAT_HIP_WORLD = CR.legs.map(([f, r]) => [f, r, .3]);
const BW = { cBody: [-.32, 0, .37], cSpine: [0, 0, .36], cChest: [.3, 0, .38] };
const rel = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const STALKER_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'fx', parent: 'root', at: [0, 0, .4] },
  // the cat
  { name: 'cBody', parent: 'root', at: BW.cBody }, { name: 'cSpine', parent: 'cBody', at: rel(BW.cSpine, BW.cBody) },
  { name: 'cChest', parent: 'cSpine', at: rel(BW.cChest, BW.cSpine) }, { name: 'cHead', parent: 'cChest', at: [.28, 0, .12] },
  { name: 'cTail1', parent: 'cBody', at: [-.2, 0, .03] }, { name: 'cTail2', parent: 'cTail1', at: [-.3, 0, -.14] },
  ...[0, 1, 2].flatMap((k) => SIDES.flatMap(([tag, s]) => {
    const hip = [CAT_HIP_WORLD[k][0], s * CAT_HIP_WORLD[k][1], CAT_HIP_WORLD[k][2]];
    return [{ name: `cThigh${k}${tag}`, parent: CAT_LEG_PARENT[k], at: rel(hip, BW[CAT_LEG_PARENT[k]]) }, { name: `cShin${k}${tag}`, parent: `cThigh${k}${tag}`, at: [0, 0, -CR.thigh] }];
  })),
  // the ape
  { name: 'aHips', parent: 'root', at: [-.24, 0, .42] }, { name: 'aChest', parent: 'aHips', at: [.38, 0, .28] }, { name: 'aHead', parent: 'aChest', at: [.3, 0, 0] },
  ...SIDES.flatMap(([tag, s]) => [
    { name: 'aArm' + tag, parent: 'aChest', at: [AR.shoulder[0] - .14, s * AR.shoulder[1], AR.shoulder[2] - .7] }, { name: 'aFore' + tag, parent: 'aArm' + tag, at: [0, 0, -AR.upper] },
    { name: 'aFist' + tag, parent: 'aFore' + tag, at: [0, 0, -AR.fore] },
    { name: 'aThigh' + tag, parent: 'aHips', at: [AR.hip[0] + .24, s * AR.hip[1], AR.hip[2] - .42] }, { name: 'aShin' + tag, parent: 'aThigh' + tag, at: [0, 0, -AR.thigh] },
    { name: 'aWing' + tag, parent: 'aChest', at: [-.18, s * .14, .16] },
  ]),
  // what grows out of its back
  { name: 'turret', parent: 'root', at: [0, 0, .6] }, { name: 'limb', parent: 'root', at: [-.02, 0, .55] }, { name: 'limbTip', parent: 'limb', at: [.5, 0, .1] },
  { name: 'bladeA', parent: 'root', at: [0, .1, .7] }, { name: 'bladeB', parent: 'root', at: [0, -.1, .7] },
]);
const BI = STALKER_SKELETON.index;
const E_EYE = 1, E_GLOW = 2, E_AURA = 3, E_SHIELD = 4;

// ------------------------------------------------------------------------------------------------ the bodies
const hexOf = (c) => parseInt(String(c).slice(1), 16);
// stalker-render.js?v=r919-d94286bed89f's colours, as numbers
const C = Object.freeze({ fur: hexOf("#f1f3f6"), sheen: hexOf("#fbfcfd"), shade: hexOf("#c9d1dc"), leg: hexOf("#e9edf2"), paw: hexOf("#eef1f5"), silver: hexOf("#d8e2ee"),
  earIn: hexOf("#b9c2cf"), nose: hexOf("#8b7a84"), brow: hexOf("#9aa4b4"), eye: hexOf("#9feeff"), chevron: hexOf("#96dcff"), lip: hexOf("#7f8898"),
  saddle: hexOf("#c7d0dc"), skin: hexOf("#5d6573"), face: hexOf("#4f5664"), apeBrow: hexOf("#3d434e"), muzzle: hexOf("#3a404a"), fist: hexOf("#59606c"), edge: hexOf("#7e8898"),
  wing: hexOf("#3a2f44"), wingDark: hexOf("#251d2e"), finger: hexOf("#b4abc4"), claw: hexOf("#cfc8db"),
  turret: hexOf("#8e98a8"), barrel: hexOf("#dfe8f3"), muzzleGlow: hexOf("#96ebff"), blade: hexOf("#cfd9e6"), bladeEdge: hexOf("#ffffff"), limb: hexOf("#dbe4ef"),
  aura: hexOf("#78dcff"), shield: hexOf("#e2eaf4") });
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
const bw = (name) => { const i = BI[name] * 3, w = STALKER_SKELETON.bindWorld; return [w[i], w[i + 1], w[i + 2]]; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
// The cat's one hide: a trunk from rump to the back of the skull, each section skinned across the body bones by where it lies
// (no seams where the spine bends), legs that grow out of it and a tail that flows from the hips.
// [f, u, half width, half height]: a round haunch, a tucked waist, a deep chest, the neck rising into the head.
const CAT_TRUNK = Object.freeze([[-.63, .385, .035, .035], [-.6, .385, .08, .085], [-.54, .385, .118, .122], [-.45, .385, .138, .142], [-.34, .38, .136, .138],
  [-.22, .365, .12, .118], [-.1, .355, .108, .104], [.02, .355, .11, .106], [.13, .365, .122, .122], [.24, .375, .135, .142], [.33, .39, .132, .14],
  [.41, .415, .112, .118], [.48, .445, .09, .096], [.54, .475, .074, .08], [.6, .5, .062, .066], [.64, .51, .04, .044]]);
// Bones along the trunk: [f of the bone's origin, name]; a point between two is skinned linearly across them.
const CAT_SPINE = Object.freeze([[-.32, 'cBody'], [0, 'cSpine'], [.3, 'cChest'], [.58, 'cHead']]);
function spineBones(f) {
  if (f <= CAT_SPINE[0][0]) return [CAT_SPINE[0][1], CAT_SPINE[0][1], 0];
  for (let i = 0; i < CAT_SPINE.length - 1; i++) { const [f0, a] = CAT_SPINE[i], [f1, b] = CAT_SPINE[i + 1]; if (f <= f1) return [a, b, (f - f0) / (f1 - f0)]; }
  return [CAT_SPINE[CAT_SPINE.length - 1][1], CAT_SPINE[CAT_SPINE.length - 1][1], 0];
}
// The trunk's half width and centre at f (for what lies on its flank).
function trunkAt(f) {
  const T = CAT_TRUNK; let i = 0; while (i < T.length - 2 && T[i + 1][0] < f) i++;
  const k = clamp01((f - T[i][0]) / (T[i + 1][0] - T[i][0])), m = (j) => T[i][j] + (T[i + 1][j] - T[i][j]) * k;
  return { u: m(1), rx: m(2), rz: m(3) };
}
// A leg, top to paw: [distance down from the hip (negative above it, inside the trunk), inward pull toward the spine (share of the
// hip's offset), half width across, half depth fore and aft, weight on the upper leg, weight on the lower leg]; the hind haunch
// and the fore shoulder differ in mass.
const CAT_LEG_FORE = Object.freeze([[-.15, .55, .03, .07, 0, 0], [-.1, .35, .058, .1, 0, 0], [-.045, .12, .068, .1, .2, 0], [0, 0, .066, .088, .5, 0],
  [.05, 0, .056, .072, .9, 0], [.11, 0, .046, .056, 1, 0], [.16, 0, .038, .042, 1, .5], [.2, 0, .033, .036, 1, .9], [.27, 0, .029, .031, 1, 1],
  [.31, 0, .026, .028, 1, 1]]);
const CAT_LEG_MID = Object.freeze([[-.12, .55, .028, .055, 0, 0], [-.08, .35, .046, .075, 0, 0], [-.04, .12, .058, .085, .2, 0], [0, 0, .06, .08, .5, 0],
  [.05, 0, .054, .068, .9, 0], [.11, 0, .045, .054, 1, 0], [.16, 0, .037, .041, 1, .5], [.2, 0, .032, .035, 1, .9], [.27, 0, .028, .03, 1, 1],
  [.31, 0, .026, .028, 1, 1]]);
const CAT_LEG_HIND = Object.freeze([[-.16, .55, .035, .08, 0, 0], [-.11, .35, .07, .13, 0, 0], [-.05, .12, .084, .13, .2, 0], [0, 0, .084, .115, .5, 0],
  [.05, 0, .07, .09, .9, 0], [.11, 0, .052, .062, 1, 0], [.16, 0, .038, .044, 1, .5], [.2, 0, .032, .036, 1, .9], [.27, 0, .028, .03, 1, 1],
  [.31, 0, .026, .028, 1, 1]]);
function buildCat(B, low, full) {
  const seg = low ? 8 : full ? 14 : 12;
  // the trunk: white above, a cool shade beneath, a sheen down the spine
  B.color(C.fur).loft({ seg, sections: CAT_TRUNK.filter((_, i) => !low || i % 2 === 0 || i === CAT_TRUNK.length - 1).map(([f, u, rx, rz]) => ({ at: [f, 0, u], rx, rz, bones: spineBones(f) })),
    tone: (i, k, st) => st < -.45 ? C.shade : st > .88 ? C.sheen : C.fur });
  // the blue chevrons on its flank (Tim: "I did like those blue chevrons"), lying on the hide and skinned with it
  if (!low) for (const [, s] of SIDES) for (const f0 of [-.3, -.1, .12]) {
    const pts = [[f0, .04], [f0 + .045, 0], [f0, -.035]].map(([f, du]) => { const T = trunkAt(f); return [f, s * (T.rx * Math.sqrt(Math.max(0, 1 - (du / T.rz) ** 2)) + .004), T.u + du]; });
    B.color(C.chevron, E_GLOW).loft({ seg: 4, minSeg: 4, caps: false, sections: pts.map((at) => ({ at, rx: .008, rz: .008, bones: spineBones(at[0]) })) });
  }
  // the head: a lean wedge, the brow sloping to a short deep muzzle, a chin, ears angled back, narrow cyan almond eyes
  B.bone('cHead').color(C.fur).ellipsoid({ at: [-.01, 0, .01], radius: [.13, .095, .085], rings: low ? 4 : 6, seg: low ? 7 : 12 });
  B.bone('cHead').color(C.fur).ellipsoid({ at: [.12, 0, -.022], radius: [.085, .066, .06], rings: low ? 3 : 5, seg: low ? 6 : 10 });
  B.bone('cHead').color(C.paw).ellipsoid({ at: [.15, 0, -.035], radius: [.06, .07, .045], rings: 3, seg: low ? 6 : 8 });
  B.bone('cHead').color(C.nose).ellipsoid({ at: [.205, 0, -.005], radius: [.018, .028, .016], rings: 2, seg: 5 });
  B.bone('cHead').color(C.paw).ellipsoid({ at: [.08, 0, -.075], radius: [.06, .045, .02], rings: 2, seg: low ? 5 : 7 });
  if (!low) B.bone('cHead').color(C.lip).box({ at: [.14, 0, -.062], size: [.045, .05, .004], bevel: 0 });
  for (const [, s] of SIDES) {
    const ear = [-.07, s * .055, .07];
    B.bone('cHead').color(C.fur).lathe({ at: ear, F: [-.7, s * .35, .62], rings: [[0, .034], [.04, .024], [.075, .004]], rs: .45, seg: low ? 4 : 6 });
    if (!low) B.bone('cHead').color(C.earIn).lathe({ at: add(ear, [.012, 0, .004]), F: [-.7, s * .35, .62], rings: [[0, .022], [.06, .003]], rs: .2, seg: 4, caps: false });
    B.bone('cHead').color(C.brow).ellipsoid({ at: [.05, s * .06, .05], radius: [.06, .02, .014], rings: 2, seg: 5, F: [1, -s * .3, -.2] });
    B.bone('cHead').color(C.eye, E_EYE).ellipsoid({ at: [.07, s * .072, .028], radius: [.035, .012, .014], rings: 2, seg: 6, F: [1, -s * .35, -.25] });
    // the cheek ruff
    if (!low) B.bone('cHead').color(C.paw).lathe({ at: [-.06, s * .06, -.05], F: [-.7, s * .3, -.4], rings: [[0, .04], [.07, .012]], seg: 4, caps: false });
  }
  // the tail: a thick rope of fur that flows out of the haunch, sags low, then rises in an S to a curled silver tip
  const TAIL = [[-.5, .41, .06, 'cBody'], [-.56, .4, .058, 'cBody', 'cTail1', .5], [-.63, .375, .056, 'cTail1'], [-.71, .33, .054, 'cTail1'],
    [-.79, .285, .053, 'cTail1', 'cTail2', .35], [-.87, .27, .052, 'cTail1', 'cTail2', .8], [-.95, .29, .052, 'cTail2'], [-1.02, .34, .052, 'cTail2'],
    [-1.065, .41, .05, 'cTail2'], [-1.085, .48, .048, 'cTail2'], [-1.085, .55, .044, 'cTail2'], [-1.07, .6, .038, 'cTail2'], [-1.05, .635, .03, 'cTail2'],
    [-1.035, .65, .018, 'cTail2']];
  B.color(C.fur).loft({ seg: low ? 6 : full ? 8 : 7, minSeg: 5, up: [0, 1, 0], sections: TAIL.filter((_, i) => !low || i % 2 === 0 || i === 1 || i === TAIL.length - 1)
    .map(([f, u, r, a, b, w]) => ({ at: [f, 0, u], rx: r, rz: r, bones: [a, b ?? a, w || 0] })), tone: (i, k, st) => (i >= TAIL.length - 4 && !low ? C.silver : st < -.5 ? C.shade : C.fur) });
  // six legs, each one limb of hide: it starts inside the trunk, swells into the shoulder or the haunch, blends through the hip,
  // a muscled upper leg tapering to the knee, a slim lower leg to the wrist, then a broad soft paw with its toes
  for (let k = 0; k < 3; k++) for (const [tag, s] of SIDES) {
    const th = `cThigh${k}${tag}`, sh = `cShin${k}${tag}`, par = CAT_LEG_PARENT[k], hip = bw(th), table = k === 2 ? CAT_LEG_HIND : k === 1 ? CAT_LEG_MID : CAT_LEG_FORE;
    const rows = table.filter((_, i) => !low || [0, 3, 6, 9].includes(i));
    B.color(C.fur).loft({ seg: low ? 6 : 8, minSeg: low ? 4 : 5, caps: false, up: [1, 0, 0], sections: rows.map(([d, pull, rx, rz, w1, w2]) => ({
      at: [hip[0] - (k === 2 && d < 0 ? .02 : 0), hip[1] * (1 - pull), hip[2] - d * (CR.thigh + CR.shin) / .32], rx, rz,
      bones: w2 > 0 ? [th, sh, w2] : [par, th, w1] })), tone: (i, kk, st) => (i >= rows.length - 3 ? C.leg : C.fur) });
    B.bone(sh).color(C.paw).ellipsoid({ at: [.025, 0, -CR.shin + .004], radius: [.062, .046, .03], rings: low ? 2 : 3, seg: low ? 6 : 8 });
    if (full) for (const d of [-.022, 0, .022]) B.bone(sh).color(C.paw).ellipsoid({ at: [.072 - Math.abs(d) * .6, d, -CR.shin - .004], radius: [.022, .015, .016], rings: 2, seg: 4 });
  }
}
function buildApe(B, low, full) {
  const seg = low ? 8 : full ? 16 : 12;
  // the body: long and hunched, the great hump at the shoulders sloping to a low rump; the silver saddle down the back
  const BODY = [[-.5, .36, .08, .08, 'aHips'], [-.45, .38, .15, .13, 'aHips'], [-.32, .43, .2, .17, 'aHips'], [-.14, .54, .24, .22, 'aHips', 'aChest', .5],
    [.04, .66, .29, .25, 'aChest'], [.18, .7, .31, .24, 'aChest'], [.32, .64, .25, .2, 'aChest'], [.42, .58, .14, .14, 'aChest'], [.46, .56, .06, .07, 'aChest']];
  B.color(C.fur).loft({ seg, sections: BODY.map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })),
    tone: (i, k, st) => (st > .55 && i < 5 ? (st > .9 ? C.silver : C.saddle) : st < -.5 ? C.shade : C.fur) });
  B.bone('aChest').color(C.skin).ellipsoid({ at: [.18, 0, -.12], radius: [.08, .16, .16], rings: low ? 3 : 4, seg: low ? 6 : 9 });
  if (!low) for (const [, s] of SIDES) for (const d of [-.3, -.12]) B.bone(d < -.2 ? 'aHips' : 'aChest').color(C.chevron, E_GLOW)
    .box({ at: d < -.2 ? [.08, s * .19, .2] : [-.06, s * .22, .03], size: [.05, .006, .008], F: [.7, 0, -.7], U: [0, s, 0], bevel: 0 });
  // the head: low and forward between the shoulders, a crest, the dark face under a heavy brow, cyan eyes, a dark muzzle
  B.bone('aHead').color(C.fur).ellipsoid({ at: [-.02, 0, .0], radius: [.14, .14, .13], rings: low ? 4 : 6, seg: low ? 7 : 11 });
  B.bone('aHead').color(C.paw).ellipsoid({ at: [-.04, 0, .1], radius: [.1, .05, .07], rings: 3, seg: low ? 5 : 7 });
  B.bone('aHead').color(C.face).ellipsoid({ at: [.08, 0, -.01], radius: [.08, .11, .1], rings: 3, seg: low ? 6 : 9 });
  B.bone('aHead').color(C.apeBrow).ellipsoid({ at: [.12, 0, .045], radius: [.035, .095, .022], rings: 2, seg: low ? 5 : 7 });
  B.bone('aHead').color(C.muzzle).ellipsoid({ at: [.14, 0, -.055], radius: [.05, .07, .04], rings: 3, seg: low ? 5 : 7 });
  for (const [, s] of SIDES) B.bone('aHead').color(C.eye, E_EYE).ellipsoid({ at: [.15, s * .045, .02], radius: [.012, .022, .011], rings: 2, seg: 5 });
  // arms: one limb of hide each from the top of the hump: the trapezius and the great deltoid roll out of the chest into a thick
  // upper arm, the elbow, a heavy forearm swelling below it, the wrist into dark knuckles; legs short and thick out of the rump
  for (const [tag, s] of SIDES) {
    const up = 'aArm' + tag, fo = 'aFore' + tag, fi = 'aFist' + tag, sh = bw(up), el = bw(fo), wr = bw(fi), ch = 'aChest';
    const at = (base, f, r, u) => [base[0] + f, base[1] + s * r, base[2] + u];
    const ARM = [[at(sh, -.08, -.15, .16), .07, .09, [ch, ch, 0]], [at(sh, -.04, -.09, .11), .12, .14, [ch, up, .15]], [at(sh, -.01, -.035, .05), .14, .15, [ch, up, .4]],
      [at(sh, 0, 0, -.02), .13, .135, [ch, up, .75]], [at(sh, 0, 0, -.1), .115, .118, [up, up, 0]], [at(sh, 0, 0, -.2), .1, .1, [up, up, 0]],
      [at(el, 0, 0, .04), .086, .09, [up, fo, .3]], [at(el, 0, 0, -.01), .085, .09, [up, fo, .65]], [at(el, 0, 0, -.07), .094, .1, [fo, fo, 0]],
      [at(el, 0, 0, -.15), .088, .092, [fo, fo, 0]], [at(wr, 0, 0, .04), .066, .07, [fo, fi, .4]], [at(wr, 0, 0, -.01), .062, .066, [fo, fi, .9]]];
    const arm = ARM.filter((_, i) => !low || [0, 2, 4, 6, 8, 11].includes(i));
    B.color(C.fur).loft({ seg: low ? 7 : full ? 10 : 9, minSeg: 5, caps: false, up: [1, 0, 0], sections: arm.map(([p, rx, rz, bones]) => ({ at: p, rx, rz, bones })),
      tone: (i, k, st) => (i >= arm.length - 2 ? lerpHex(C.fur, C.shade, .5) : C.fur) });
    B.bone(fi).color(C.fist).ellipsoid({ at: [.01, 0, -.02], radius: [.088, .078, .07], rings: 3, seg: low ? 6 : 8 });
    if (!low) for (const d of [-.035, 0, .035]) B.bone(fi).color(C.edge).ellipsoid({ at: [.07, d, -.045], radius: [.018, .016, .016], rings: 2, seg: 4 });
    const th = 'aThigh' + tag, sn = 'aShin' + tag, hip = bw(th), knee = bw(sn), hp = 'aHips';
    const LEG = [[at(hip, -.02, -.08, .12), .08, .1, [hp, hp, 0]], [at(hip, 0, -.03, .05), .12, .14, [hp, th, .3]], [at(hip, 0, 0, -.02), .12, .13, [hp, th, .7]],
      [at(hip, .01, 0, -.1), .1, .11, [th, th, 0]], [at(knee, 0, 0, .02), .085, .09, [th, sn, .4]], [at(knee, 0, 0, -.04), .08, .084, [th, sn, .85]],
      [at(knee, 0, 0, -AR.shin + .05), .065, .068, [sn, sn, 0]]];
    const leg = LEG.filter((_, i) => !low || [0, 2, 4, 6].includes(i));
    B.color(C.fur).loft({ seg: low ? 7 : full ? 11 : 8, minSeg: 5, caps: false, up: [1, 0, 0], sections: leg.map(([p, rx, rz, bones]) => ({ at: p, rx, rz, bones })) });
    B.bone(sn).color(C.fist).ellipsoid({ at: [.04, 0, -AR.shin + .005], radius: [.1, .062, .042], rings: 3, seg: low ? 6 : 8 });
  }
  // the wings: authored spread (out along r from the shoulder blade): an arm bone to the wrist, three long fingers fanning from it,
  // the membrane scalloped between the tips and back to the body; skinned from the chest (its root edge) out to the wing bone
  for (const [tag, s] of SIDES) {
    const wb = 'aWing' + tag, o = bw(wb), P = (f, r, u) => [o[0] + f, o[1] + s * r, o[2] + u];
    const wrist = [-.12, .5, .16], tips = [[-.42, .98, .02], [-.62, .82, -.24], [-.5, .5, -.4]];
    const out = [[.04, .08, .03], [-.03, .3, .11], wrist, [-.26, .76, .12], tips[0], [-.48, .82, -.06], tips[1], [-.5, .62, -.24], tips[2], [-.42, .32, -.36], [-.36, .12, -.36]].filter((_, c) => !low || c % 2 === 0 || c === 1);
    const root = [[.04, .03, .0], [-.36, .04, -.36]], rows = low ? 3 : full ? 6 : 4, grid = [];
    for (let r = 0; r < rows; r++) { const k = r / (rows - 1), row = [];
      for (let c = 0; c < out.length; c++) { const q = c / (out.length - 1), rp = [root[0][0] + (root[1][0] - root[0][0]) * q, root[0][1], root[0][2] + (root[1][2] - root[0][2]) * q], E = out[c];
        const sag = .04 * Math.sin(Math.PI * k) * Math.sin(Math.PI * q);
        row.push(P(rp[0] + (E[0] - rp[0]) * k - sag * .5, rp[1] + (E[1] - rp[1]) * k, rp[2] + (E[2] - rp[2]) * k - sag)); }
      grid.push(row); }
    B.sheet({ grid, vertBones: (r) => ['aChest', wb, smooth(span(r / (rows - 1), .05, .45))], tone: (r, c) => (r === rows - 1 ? lerpHex(C.wing, C.finger, .25) : c % 2 ? C.wingDark : C.wing) });
    const bone = (a, b, r0, r1) => B.color(C.finger).loft({ seg: 4, minSeg: 3, sections: [{ at: P(...a), rx: r0, rz: r0, bones: [wb, wb, 0] }, { at: P(...b), rx: r1, rz: r1, bones: [wb, wb, 0] }] });
    // the wing's arm grows out of the shoulder blade: a furred root skinned from the chest into the wing bone, then the bare arm
    B.color(C.finger).loft({ seg: low ? 5 : 7, minSeg: low ? 4 : 5, caps: !low, sections: [{ at: P(.05, -.08, -.04), rx: .075, rz: .075, bones: ['aChest', 'aChest', 0] },
      { at: P(.02, .01, 0), rx: .06, rz: .06, bones: ['aChest', wb, .45] }, { at: P(-.03, .12, .07), rx: .036, rz: .036, bones: [wb, wb, 0] }, { at: P(...wrist), rx: .022, rz: .022, bones: [wb, wb, 0] }],
      tone: (i) => (i < 2 ? C.fur : i === 2 ? lerpHex(C.fur, C.finger, .6) : C.finger) });
    if (!low) for (const tp of tips) bone(wrist, tp, .016, .006);
    B.bone(wb).color(C.claw).lathe({ at: rel(P(...wrist), o), F: [.3, s * .2, 1], rings: [[0, .022], [.07, .003]], seg: 4 });
  }
}
function buildBack(B, low) {
  // the turret: a dome on its back, a barrel, a muzzle that glows as it aims
  B.bone('turret').color(C.turret).ellipsoid({ at: [0, 0, 0], radius: [.12, .1, .07], rings: 3, seg: low ? 6 : 9 });
  B.bone('turret').color(C.barrel).lathe({ at: [.02, 0, .03], F: [1, 0, 0], rings: [[0, .035], [.26, .028], [.28, .022]], seg: low ? 5 : 7 });
  B.bone('turret').color(C.muzzleGlow, E_GLOW).ellipsoid({ at: [.31, 0, .03], radius: [.04, .04, .04], rings: 3, seg: 6 });
  // the appendage: a sinuous limb of liquid silver rising out of its back and reaching to its tip (stretching), three spikes there
  const l0 = bw('limb'), l1 = bw('limbTip');
  B.color(C.limb).loft({ seg: low ? 6 : 8, minSeg: 4, sections: [{ at: add(l0, [0, 0, -.04]), rx: .06, rz: .06, bones: ['limb', 'limb', 0] }, { at: add(l0, [.02, 0, .08]), rx: .07, rz: .07, bones: ['limb', 'limb', 0] },
    { at: add(l0, [.1, 0, .14]), rx: .06, rz: .06, bones: ['limb', 'limbTip', .3] }, { at: add(l0, [.3, 0, .13]), rx: .052, rz: .052, bones: ['limb', 'limbTip', .7] },
    { at: l1, rx: .045, rz: .045, bones: ['limbTip', 'limbTip', 0] }] });
  for (const a of [-STALKER.limb.spikes.spread, 0, STALKER.limb.spikes.spread]) B.bone('limbTip').color(C.bladeEdge).lathe({ at: [0, 0, 0], F: [Math.cos(a), Math.sin(a), 0], rings: [[0, .05], [STALKER_RIG.spikeLength, .006]], seg: low ? 4 : 6 });
  // the two great liquid blades: from the root along +f, a slight curve, a mirror-bright edge, a cyan core
  for (const bn of ['bladeA', 'bladeB']) {
    const L = STALKER_RIG.bladeLength, pts = [[0, -.06], [L * .55, -.075], [L, 0], [L * .5, .042], [0, .06]];
    B.bone(bn).color(C.blade).slab({ points: pts.map(([f, u]) => [f, u]), thick: .025, bevel: .008 });
    B.bone(bn).color(C.bladeEdge).box({ at: [L * .5, 0, -.07], size: [L * .45, .016, .008], F: [1, 0, -.04], bevel: 0 });
    if (!low) B.bone(bn).color(C.chevron, E_GLOW).box({ at: [L * .42, 0, 0], size: [L * .36, .016, .006], bevel: 0 });
  }
}
function buildStalkerMesh(tier) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(STALKER_SKELETON, TIER_DETAIL[tier] ?? 1);
  buildCat(B, low, full); buildApe(B, low, full); buildBack(B, low);
  // shown only while they are up: the energized sphere (translucent cyan) and the liquid shield (a bright arc before it)
  B.mark();
  B.bone('fx').color(C.aura, E_AURA).ellipsoid({ at: [0, 0, 0], radius: [STALKER_RIG.auraRadius, STALKER_RIG.auraRadius, STALKER_RIG.auraRadius * .85], rings: low ? 5 : 8, seg: low ? 10 : 16, U: [0, 0, 1] });
  const R = STALKER_RIG.shieldRadius, A = STALKER_RIG.shieldArc, cols = low ? 6 : 12, grid = [], fxAt = bw('fx');
  for (const u of [-.3, -.1, .1, .3]) { const row = []; for (let c = 0; c <= cols; c++) { const a = -A + 2 * A * c / cols, rr = R * Math.sqrt(1 - (u / 1.1) ** 2); row.push([fxAt[0] + rr * Math.cos(a), fxAt[1] + rr * Math.sin(a), fxAt[2] + u * R]); } grid.push(row); }
  B.color(C.shield, E_SHIELD).sheet({ grid, vertBones: () => ['fx', 'fx', 0], tone: (r) => (r === 1 || r === 2 ? C.shield : C.bladeEdge) });
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function stalkerMesh(tier = 'full') { return MESHES[tier] ||= buildStalkerMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
const CAT_PHASE = [.33, .83, .17, .67, 0, .5]; // a ripple down each side, the sides half a cycle apart (fore, mid, hind; L, R)
const APE_PHASE = [.25, .75, .5, 0]; // arms L, R; legs L, R (a knuckle walk: each arm opposite its leg)
export function createStalkerTrack() {
  return {
    pose: createPose(STALKER_SKELETON), yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(12), shown: new Float64Array(12),
    form: '', formAt: -Infinity, formFrom: '', act: '', actN: -1, strikeAt: -Infinity, strike: '', landAt: -Infinity, liftWas: 0,
    hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null, deathForm: 'cat', x: 0, y: 0, z: 0, px: NaN, py: NaN, climb: 0, slash: 0, slashN: 0, strikeN: 0,
    catGait: createGait([0, 1, 2].flatMap((k) => SIDES.map(([, s], j) => ({ side: s * CR.legs[k][1], fore: CR.legs[k][0], phase: CAT_PHASE[k * 2 + j] })))),
    apeGait: createGait([...SIDES.map(([, s], j) => ({ side: s * .3, fore: .34, phase: APE_PHASE[j] })), ...SIDES.map(([, s], j) => ({ side: s * .17, fore: -.2, phase: APE_PHASE[2 + j] }))]),
    frame: { kind: 'stalker', tier: 'full', mesh: null, skin: null, boneCount: STALKER_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(12), phase: '', contact: 0, cloud: false, form: 'cat' },
  };
}

// The act's progress on the game's own clock (0 at its start, 1 at its end).
const prog = (a) => (a && a.total > 0 ? clamp01(1 - Math.max(0, a.t) / a.total) : 0);
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
// Pose targets by form. Cat: [crouch, pitch (+ nose up), head up, tail up, tail lash, stretch (leap), sit, near paw up, far paw up,
// tuck, melt, climb]. Ape: [crouch, lean (+ forward), head up, wing spread, wing wrap, raise R, raise L, punch R, punch L, kick, tuck,
// head down].
const W = new Float64Array(12);
function catTargets(e, a, k, tr, now) {
  W.fill(0); const kind = a?.kind || 'prowl';
  W[3] = .1; W[4] = .2;
  if (e.stalkClimb || kind === 'climb') { W[11] = 1; W[4] = .3; return 'climb'; }
  if (kind === 'wait' || kind === 'lurk') { if (e.stalkPerch) { W[0] = 1; W[9] = .8; W[2] = -.35; W[3] = -.3; return 'perch'; } W[6] = 1; W[2] = .1; W[3] = -.2; W[4] = .15; return 'sit'; }
  if (kind === 'prowl' && e.stalkPerch) { W[0] = 1; W[9] = .8; W[2] = -.35; W[3] = -.3; return 'perch'; }
  if (kind === 'trapped') { W[0] = .8; W[2] = -.1; W[4] = 1; W[3] = .4; return 'trapped'; }
  if (kind === 'pounceWarn') { W[0] = .9 * smooth(k * 3); W[1] = -.12; W[2] = -.15; W[3] = .8; W[4] = 1; return 'pounceWarn'; }
  if (kind === 'pounce' || kind === 'hop') { W[5] = Math.sin(Math.PI * Math.min(1, k * 1.15)); W[1] = kind === 'hop' ? .25 * (1 - 2 * k) : .12 * (1 - 2 * k); W[2] = -.05; W[3] = .1; return kind; }
  if (kind === 'swipeWarn') { W[7] = smooth(k * 1.6); W[1] = .14 * smooth(k * 2); W[2] = .1; W[3] = .4; W[4] = .6; return 'swipeWarn'; }
  if (kind === 'spring') { W[9] = .7 * Math.sin(Math.PI * k); W[1] = .12; W[2] = .15; W[3] = .3; return 'spring'; }
  if (kind === 'flurryWarn') { W[0] = .5; W[7] = .55; W[8] = .55; W[1] = .08; W[4] = .8; W[3] = .4; return 'flurryWarn'; }
  if (kind === 'flurry') { W[0] = .3; W[1] = .1; W[4] = .8; W[3] = .4; return 'flurry'; }
  if (kind === 'tideWarn') { W[0] = .6; W[10] = smooth(k); W[2] = -.2; W[4] = .5; return 'tideWarn'; }
  if (kind === 'guard') { W[0] = .45; W[2] = -.05; W[3] = .1; return 'guard'; }
  if (e.stalkCreep && kind === 'prowl') { W[0] = .7; W[2] = -.2; W[3] = -.1; W[4] = .1; return 'creep'; }
  return 'move';
}
function apeTargets(e, a, k, tr, now) {
  W.fill(0); const kind = a?.kind || 'prowl', fists = e.stalkFists?.length || 0, strike = e.stalkStrike;
  W[1] = .35;
  if (kind === 'wait' || kind === 'lurk' || (kind === 'prowl' && e.stalkPerch) || kind === 'trapped') { W[0] = .8; W[4] = 1; W[1] = .2; W[2] = .1; return kind === 'trapped' ? 'trapped' : 'perch'; }
  if (kind === 'leapWarn') { W[0] = smooth(k * 2); W[3] = .45 * k; W[6] = .4 * k; W[5] = .4 * k; W[1] = .5; return 'leapWarn'; }
  if (kind === 'leap') { W[3] = 1; W[10] = 1; W[5] = .7; W[6] = .7; W[1] = .1; W[2] = .2; return 'leap'; }
  if (kind === 'spring') { W[3] = .8; W[10] = .6; W[1] = .2; return 'spring'; }
  if (kind === 'fistWarn') { W[5] = smooth(k * 1.4); W[1] = .15; W[2] = .3; W[3] = .2; return 'fistWarn'; }
  if (kind === 'chargeWarn') { W[0] = .5 * smooth(k * 2); W[11] = 1; W[1] = .65; W[3] = -.3; return 'chargeWarn'; }
  if (kind === 'charge') { W[11] = 1; W[1] = .75; W[3] = -.4; return 'charge'; }
  if (kind === 'lasersWarn') { W[5] = smooth(k * 2) * .8; W[6] = smooth(k * 2) * .8; W[1] = .15; W[2] = .2; W[3] = .3; return 'lasersWarn'; }
  if (kind === 'lasers') { W[7] = 1; W[8] = 1; W[1] = .3; W[3] = .3; return 'lasers'; }
  if (kind === 'comboWarn') { W[1] = .3; W[0] = .2; return 'combo'; }
  if (kind === 'guard') { W[0] = .4; W[7] = .35; W[8] = .35; W[1] = .3; W[3] = .5; return 'guard'; }
  if (fists) { W[1] = .3; W[3] = .25; W[0] = .2; return 'fists'; }
  if (strike) { W[1] = .3; return 'strike'; }
  return 'move';
}
const H = [0, 0, 0], T = [0, 0, 0], J = [0, 0, 0], Q = [0, 0, 0], POLE = [0, 0, 0];
// Place bone i's origin at world point p (an offset from its bind place, in its parent's frame).
function placeAt(P, i, px, py, pz) {
  const p = P.skeleton.parent[i], Wr = P.wr, o = p * 9, sc = Math.hypot(Wr[o], Wr[o + 1], Wr[o + 2]) || 1, dx = px - P.wp[p * 3], dy = py - P.wp[p * 3 + 1], dz = pz - P.wp[p * 3 + 2];
  for (let c = 0; c < 3; c++) P.off[i * 3 + c] = (Wr[o + c * 3] * dx + Wr[o + c * 3 + 1] * dy + Wr[o + c * 3 + 2] * dz) / (sc * sc) - P.skeleton.bind[i * 3 + c];
}
// A two-bone limb from bone `top` (resolved, its parent too) to world target T; `pole` the side the joint bends toward; `hf` the
// heading hint for the bones' f axis.
function poseLimb(P, top, mid, L1, L2, Tt, pole, cf, sf) {
  resolveBone(P, top); const h = top * 3; H[0] = P.wp[h]; H[1] = P.wp[h + 1]; H[2] = P.wp[h + 2];
  solveTwoBone(H, Tt, L1, L2, pole, J);
  aimWorld(P, top, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], cf, sf, 0); resolveBone(P, top);
  aimWorld(P, mid, -3, Tt[0] - J[0], Tt[1] - J[1], Tt[2] - J[2], cf, sf, 0); resolveBone(P, mid);
}

// ------------------------------------------------------------------------------------------------ the pose
export function sampleStalker(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = STALKER_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  const form = dead ? tr.deathForm : e.stalkForm === 'ape' ? 'ape' : 'cat', a = dead ? null : e.stalkAct, k = prog(a), kind = a?.kind || 'prowl';
  if (!dead) tr.deathForm = form;
  // the shift between forms: the one it leaves shrinks into silver as the other grows out of it
  if (tr.form === '') { tr.form = form; tr.formFrom = form; tr.formAt = -Infinity; }
  else if (form !== tr.form) { tr.formFrom = tr.form; tr.form = form; tr.formAt = gapMs <= 400 ? now : -Infinity; }
  const morph = tr.formAt === -Infinity || reduce ? 1 : clamp01((now - tr.formAt) / G.morphMs);
  // events on the game's own transitions: the blow at the end of a wind-up, a landing
  if (!dead && kind !== tr.act) {
    if (tr.act === 'swipeWarn') { tr.strikeAt = now; tr.strike = 'swipe'; }
    else if (tr.act === 'fistWarn') { tr.strikeAt = now; tr.strike = 'hammer'; }
    else if (tr.act === 'slam') { tr.strikeAt = now; tr.strike = 'slam'; }
    if ((tr.act === 'leap' || tr.act === 'hop' || tr.act === 'pounce') && tr.act !== '') tr.landAt = now;
    tr.act = kind;
  }
  if (e.stalkSlash && e.stalkSlash.n !== tr.slashN) { tr.slashN = e.stalkSlash.n; tr.slash = (tr.slash + 1) % 2; }
  const strikeK = clamp01((now - tr.strikeAt) / G.strikeMs), striking = now - tr.strikeAt < G.strikeMs * 2.2;
  // the pose targets, blended between states
  const key = dead ? 'death' : form + ':' + (form === 'ape' ? apeTargets(e, a, k, tr, now) : catTargets(e, a, k, tr, now));
  if (dead) W.fill(0);
  if (tr.key === '' || !(gapMs <= G.blendMs * 4)) { tr.shown.set(W); tr.from.set(W); tr.key = key; tr.blendAt = -Infinity; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let i = 0; i < 12; i++) tr.shown[i] = tr.from[i] + (W[i] - tr.from[i]) * blend;
  const V = tr.shown;
  // facing: the attack's aim or its course; springing back or shielded it faces the Wayfarer; else where it goes
  const mx = Number.isFinite(tr.px) ? env.x - tr.px : 0, my = Number.isFinite(tr.py) ? env.y - tr.py : 0; tr.px = env.x; tr.py = env.y;
  const tx = (env.target?.x ?? env.x) - env.x, ty = (env.target?.y ?? env.y) - env.y, toTarget = Math.hypot(tx, ty) > .2 ? Math.atan2(ty, tx) : NaN;
  let want = NaN, attack = false;
  if (a && Number.isFinite(a.aim) && /flurry|tide|grab|sweep|spin|lasers|charge|combo/.test(kind)) { want = kind === 'spin' ? a.aim + Math.PI * k : a.aim; attack = true; }
  else if (a?.to && a?.from && (kind === 'pounce' || kind === 'leap' || kind === 'hop')) { want = Math.atan2(a.to.y - a.from.y, a.to.x - a.from.x); attack = true; }
  else if (a?.to && (kind === 'pounceWarn' || kind === 'leapWarn')) { want = Math.atan2(a.to.y - e.y, a.to.x - e.x); attack = true; }
  else if (a?.at && (kind === 'slamWarn' || kind === 'slam' || kind === 'mouthWarn')) { want = Math.atan2(a.at.y - e.y, a.at.x - e.x); attack = true; }
  else if (/spring|guard|swipeWarn|fistWarn|wait|lurk|trapped|retract/.test(kind) || e.stalkTurret || e.stalkBlades || e.stalkLimb) { want = toTarget; attack = !/wait|lurk/.test(kind); }
  if (!Number.isFinite(want) && Math.hypot(mx, my) > .004 && Math.hypot(mx, my) < 1.5) want = Math.atan2(my, mx);
  if (!Number.isFinite(want)) want = Number.isFinite(toTarget) ? toTarget : (e.facingX < 0 ? Math.PI : 0);
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) tr.yaw += Math.max(-1, Math.min(1, dt * (attack ? G.attackTurnRate : G.turnRate))) * wrapA(want - tr.yaw);
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // hit: a small flinch away from the blow (it is never staggered)
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; tr.hitSide = Math.sign(tx * -sf + ty * cf) || 1; }
  tr.hp = e.hp; const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 11) : 0;
  // lift: the game's own (leap, hop, the ape's spring); a low arc on the pounce and the cat's spring back
  let lift = dead ? 0 : Math.max(0, Number(e.stalkLift) || 0);
  if (!dead && kind === 'pounce') lift += .18 * S * Math.sin(Math.PI * k);
  if (!dead && kind === 'spring' && form === 'cat') lift += .16 * S * Math.sin(Math.PI * k);
  if (tr.liftWas > .1 && lift <= .05) tr.landAt = now; tr.liftWas = lift;
  const landT = (now - tr.landAt) / 1000, land = landT < .35 ? Math.max(0, kick(landT, 9, 7)) : 0;
  const deathK = dead ? smooth(death / .45) : 0, melt = dead ? smooth(span(death, .3, .85)) : 0;
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z + lift);
  const catS = form === 'cat' ? Math.max(.001, morph) : Math.max(.001, 1 - morph * 2), apeS = form === 'ape' ? Math.max(.001, morph) : Math.max(.001, 1 - morph * 2);
  const shown = (s) => s > .01;
  const still = dead || lift > .05 || kind === 'trapped' || kind === 'wait' || kind === 'lurk' || kind === 'climb' || e.stalkClimb;
  if (form === 'cat' || shown(catS)) poseCat(tr, e, env, a, k, V, S, catS, cf, sf, t, reduce, still, lift, land, hit, strikeK, striking, deathK, melt, dt, now);
  else hideForm(P, 'cat');
  if (form === 'ape' || shown(apeS)) poseApe(tr, e, env, a, k, V, S, apeS, cf, sf, t, reduce, still, lift, land, hit, strikeK, striking, deathK, melt, dt, now);
  else hideForm(P, 'ape');
  poseBack(tr, e, env, form, S, cf, sf, t, reduce, dead);
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 1.4) : 1, energized = !dead && (e.stalkCharged || 0) > 0, warn = !dead && /Warn$/.test(kind);
  const pulse = reduce ? 1 : .85 + .15 * Math.sin(now / 200);
  F.emitK[0] = life * pulse * (energized ? 2 : warn ? 1.7 : 1.25) + (morph < 1 ? 1 - morph : 0);
  const aiming = !dead && e.stalkTurret ? (reduce ? 1.6 : 1.3 + .7 * Math.sin(now / 60)) : 0;
  F.emitK[1] = life * Math.max(energized ? 1.6 : .75, aiming, e.stalkConeFlash ? 2.4 : 0);
  F.emitK[2] = energized ? (reduce ? 1.2 : 1 + .3 * Math.sin(now / 110)) : 0;
  F.emitK[3] = 1.3;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = energized ? .35 + (reduce ? .1 : .1 * Math.sin(now / 110)) : 0; F.emitA[3] = !dead && (e.stalkShield || 0) > 0 ? .5 + (reduce ? 0 : .15 * Math.sin(now / 90)) : 0;
  // fading: hiding in its own mist at a distance, coming out of hiding, dying into silver
  const hide = clamp01(Number(e.stalkHide) || 0), reveal = e.stalkReveal > 0 ? 1 - .9 * clamp01(e.stalkReveal / STALKER.lurk.reveal) : 1;
  F.tier = env.tier || 'full'; F.mesh = stalkerMesh(F.tier); F.skin = P.skin; F.alpha = (dead ? 1 - span(death, .55, 1) : (1 - .6 * hide) * reveal);
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .6 + Math.max(0, hit) * .3;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = lift; F.shadow = 1 - Math.min(.6, lift / (3 * S)); F.form = form;
  F.phase = dead ? 'death' : `${form}:${kind}`; F.contact = striking ? 1 - strikeK : 0; F.cloud = F.emitA[2] > 0 || F.emitA[3] > 0;
  return F;
}
function hideForm(P, form) {
  const top = form === 'cat' ? BI.cBody : BI.aHips; P.scl[top] = .001;
  const first = top, last = form === 'cat' ? BI.aHips - 1 : BI.turret - 1;
  for (let i = first; i <= last; i++) resolveBone(P, i);
}

function poseCat(tr, e, env, a, k, V, S, scale, cf, sf, t, reduce, still, lift, land, hit, strikeK, striking, deathK, melt, dt, now) {
  const P = tr.pose, kind = a?.kind || 'prowl', crouch = V[0], pitch0 = V[1], headUp = V[2], tailUp = V[3], lash = V[4], stretch = V[5], sit = V[6], pawN = V[7], pawF = V[8], tuck = V[9], meltV = V[10], climb = V[11];
  const G = tr.catGait;
  for (let q = 0; q < 6; q++) { const L = CR.legs[q >> 1]; G.side[q] = (q & 1 ? 1 : -1) * L[1] * CR.splay * S; G.fore[q] = L[0] * S; }
  stepGait(G, env.x, env.y, tr.yaw, now, { stride: CR.stride * S * (kind === 'prowl' && !e.stalkCreep ? 1.25 : 1), stance: CR.stance, settle: CR.settle, still: still || stretch > .3, snapDistance: 2.5 * S, stepAt: .2 * S, stepTime: .22, maxStepping: 2 });
  const moving = G.moving, cyc = G.phase * Math.PI * 2;
  const breathe = reduce ? 0 : Math.sin(t * 2.4);
  const bob = reduce ? 0 : moving * CR.bob * (.5 - .5 * Math.cos(cyc * 2)), sway = reduce ? 0 : Math.sin(t * (lash > .7 ? 11 : 2.3)) * (.15 + .5 * lash);
  const shakeT = kind === 'trapped' && !reduce ? Math.sin(t * 22) * .03 : 0, lunge = kind === 'trapped' && !reduce ? Math.max(0, Math.sin(t * 3.1)) ** 6 : 0;
  const meltAll = Math.max(meltV, melt);
  // the body: crouched low, pitched, sitting back on its haunch, or upright on the climb
  const sitPitch = .55 * sit, climbPitch = 1.15 * climb, deathRoll = 1.35 * deathK * (tr.hitSide || 1);
  setOffset(P, BI.cBody, .02 * stretch + lunge * .12, shakeT, -CR.crouch * crouch - bob - .05 * land - .24 * sit + .12 * climb - .2 * deathK - .06 * tuck);
  // the prowl rolls through it: the haunch dips toward each hind paw as it lands and the shoulders answer the other way
  const gRoll = reduce ? 0 : moving * CR.roll * Math.sin(cyc), gPitch = reduce ? 0 : moving * CR.rock * Math.sin(cyc * 2 + .6);
  setEuler(P, BI.cBody, 0, -(pitch0 + sitPitch + climbPitch) + .06 * hit - .08 * stretch + gPitch, .2 * hit * tr.hitSide + deathRoll + gRoll);
  P.scl[BI.cBody] = scale; resolveBone(P, BI.cBody);
  // (melting for the tide or in death: the whole body flattens toward the ground; non-uniform scale is out, so the bones squash it)
  if (meltAll > 0) { P.off[BI.cBody * 3 + 2] -= .2 * meltAll; resolveBone(P, BI.cBody); }
  const wave = reduce ? 0 : moving * .05 * Math.sin(cyc);
  setEuler(P, BI.cSpine, wave * .6, .05 * crouch + .12 * stretch * -1 + .1 * sit, 0); P.scl[BI.cSpine] = 1 + breathe * .006; resolveBone(P, BI.cSpine);
  setEuler(P, BI.cChest, wave * .4, -.05 * crouch + .06 * stretch + .05 * sit - gPitch * 1.6, -gRoll * 2.2); resolveBone(P, BI.cChest);
  // the head: level and low, watching the Wayfarer; up on the sit, down on the perch
  let look = 0; if (env.target) { const lx = env.target.x - env.x, ly = env.target.y - env.y, aa = Math.atan2(ly, lx) - tr.yaw; look = Math.max(-.7, Math.min(.7, wrapA(aa))) * .7; }
  // (the head stays level through the prowl: it takes back the shoulders' roll and rock)
  setEuler(P, BI.cHead, look * (1 - climb) - wave * .8, -headUp + .15 * crouch + .3 * sit + (pitch0 + sitPitch) * .6 + .35 * climb + .08 * deathK + gPitch * .6, (reduce ? 0 : .03 * wobble(t * .6, 3)) - .4 * deathK + gRoll * 1.2);
  resolveBone(P, BI.cHead);
  // the tail: low then an S up; lashing before the pounce; trailing straight in the leap
  const tSwing = reduce ? 0 : moving * CR.tailSwing * Math.sin(cyc - 1.2);
  setEuler(P, BI.cTail1, sway * .6 + tSwing, .25 - tailUp * .5 + .2 * stretch + .4 * sit, sway * .2); resolveBone(P, BI.cTail1);
  setEuler(P, BI.cTail2, sway - tSwing * 1.4, .3 - tailUp * 1 + .9 * stretch - .6 * sit + .5 * climb, 0); resolveBone(P, BI.cTail2);
  // six legs: planted by the gait; folded under on the perch; flung out in the leap; sitting, the hind pair folds under the haunch
  const pawH = CR.paw * S;
  for (let q = 0; q < 6; q++) {
    const pair = q >> 1, s = q & 1 ? 1 : -1, tag = s < 0 ? 'L' : 'R', top = BI[`cThigh${pair}${tag}`], mid = BI[`cShin${pair}${tag}`], L = CR.legs[pair];
    let fx = G.out[q * 4], fy = G.out[q * 4 + 1], fz = env.z + pawH + G.out[q * 4 + 2] * CR.footLift * S;
    // pose targets in the root's frame (f, r, u) for the off-ground poses, mixed toward them by how far the pose has gone
    let off = 0, lf = L[0], lr = s * L[1] * CR.splay, lu = CR.paw;
    if (stretch > 0) { off = Math.max(off, stretch); lf += pair === 0 ? .4 : pair === 1 ? .02 : -.48; lu += pair === 0 ? .14 : pair === 1 ? .15 : .2; }
    if (tuck > 0) { off = Math.max(off, tuck); lf += pair === 0 ? .08 : pair === 2 ? -.04 : 0; lu += .02; lr *= 1.1; }
    if (sit > 0) { off = Math.max(off, sit); lf = pair === 0 ? .26 : pair === 1 ? .06 : -.12; lr = s * (pair === 2 ? .17 : .1); }
    if (climb > 0) { off = Math.max(off, climb); const c = reduce ? 0 : Math.sin(t * 8 + q * 1.3 + (s > 0 ? Math.PI : 0)); lf = L[0] * .4 + .55 + .12 * c * (pair === 2 ? -1 : 1); lu = .25 + L[0] * 1.6 + .08 * c; }
    if (lift > .05) off = Math.max(off, clamp01(lift / (.3 * S)));
    if (deathK > 0) { off = Math.max(off, deathK); lf = L[0] * 1.2; lr = s * (.28 + .1 * pair); lu = .1; }
    // the near forepaw raised to swipe (and down across on the blow); both forepaws in the flurry, by turns
    const isFore = pair === 0, near = s > 0;
    let raise = isFore ? (near ? pawN : pawF) : 0, paw = 0;
    if (isFore && kind === 'flurry' && e.stalkSlash) { const sk = 1 - clamp01(e.stalkSlash.t / .14); raise = ((tr.slash === 1) === near) ? 1 - sk : .4; }
    if (isFore && near && striking && tr.strike === 'swipe') raise = Math.max(0, 1 - strikeK * 1.2);
    if (raise > 0 || (isFore && striking && tr.strike === 'swipe' && near)) {
      off = 1; const sw = isFore && near && striking && tr.strike === 'swipe' ? strikeK : 0;
      lf = .44 + .06 * raise + .2 * sw; lr = s * (.12 - .2 * sw); lu = .1 + .28 * raise - .04 * sw; paw = Math.max(raise, 1 - sw);
    }
    if (pair === 2 && kind === 'trapped') { off = Math.max(off, lunge); }
    if (off > 0) { const p = boneLocalToWorld(P, 'root', lf, lr, lu, Q); fx += (p[0] - fx) * off; fy += (p[1] - fy) * off; fz += (p[2] - fz) * off; }
    if (meltAll > 0) fz = Math.min(fz, env.z + pawH + (1 - meltAll) * 1);
    T[0] = fx; T[1] = fy; T[2] = fz;
    // (a raised forepaw: the elbow lifts forward and up, the paw curled below it)
    const pf = (pair === 2 ? 1 : -1) * (1 - paw) + .4 * paw;
    POLE[0] = cf * pf; POLE[1] = sf * pf; POLE[2] = climb * .5 + 1.4 * paw;
    poseLimb(P, top, mid, CR.thigh * S * scale, CR.shin * S * scale, T, POLE, cf, sf);
    tr.frame.feet[q * 2] = G.out[q * 4 + 3]; tr.frame.feet[q * 2 + 1] = G.out[q * 4 + 2];
  }
}

function poseApe(tr, e, env, a, k, V, S, scale, cf, sf, t, reduce, still, lift, land, hit, strikeK, striking, deathK, melt, dt, now) {
  const P = tr.pose, kind = a?.kind || 'prowl', crouch = V[0], lean = V[1], headUp = V[2], spread = V[3], wrap = V[4], raiseR = V[5], raiseL = V[6];
  const punchR = V[7], punchL = V[8], tuck = V[10], headDown = V[11];
  const G = tr.apeGait;
  for (let q = 0; q < 4; q++) { const arm = q < 2, s = q & 1 ? 1 : -1; G.side[q] = s * (arm ? .3 : .17) * S; G.fore[q] = (arm ? .36 : -.2) * S; }
  const gallop = kind === 'charge';
  stepGait(G, env.x, env.y, tr.yaw, now, { stride: AR.stride * S * (gallop ? 1.7 : 1), stance: AR.stance, settle: AR.settle, still: still || kind === 'leap', snapDistance: 3 * S, stepAt: .22 * S, stepTime: .26, maxStepping: 2 });
  const moving = G.moving, cyc = G.phase * Math.PI * 2, breathe = reduce ? 0 : Math.sin(t * 2);
  const bob = reduce ? 0 : moving * AR.bob * (.5 - .5 * Math.cos(cyc * 2)) * (gallop ? 2 : 1), roll = reduce ? 0 : moving * .05 * Math.sin(cyc) * (gallop ? .4 : 1);
  const shakeT = kind === 'trapped' && !reduce ? Math.sin(t * 20) * .03 : 0;
  // the knuckle walk's weight: as one arm swings, the hump rolls and slides onto the planted one and sinks into it; it rises
  // again as the swinging fist lands (the hips answer the legs the same way, more softly)
  const liftAL = reduce ? 0 : G.out[2], liftAR = reduce ? 0 : G.out[6], liftLL = reduce ? 0 : G.out[10], liftLR = reduce ? 0 : G.out[14];
  const armShift = liftAR - liftAL, legShift = liftLR - liftLL, sink = Math.max(liftAL, liftAR);
  setOffset(P, BI.aHips, shakeT, -AR.weightShift * (armShift * .4 + legShift * .6) * moving, -AR.crouch * crouch - bob - .05 * land - .2 * deathK - .3 * melt + .04 * tuck);
  setEuler(P, BI.aHips, 0, .1 * lean - .12 - .1 * tuck, roll + AR.weightRoll * .5 * legShift * moving + .2 * hit * tr.hitSide + 1.2 * deathK * (tr.hitSide || 1)); P.scl[BI.aHips] = scale; resolveBone(P, BI.aHips);
  setEuler(P, BI.aChest, -roll * .5 - AR.weightYaw * armShift * moving, .2 * lean - .02 + .25 * headDown - .15 * (raiseR + raiseL) * .5 - .1 * wrap + AR.weightSink * sink * moving,
    AR.weightRoll * armShift * moving); P.scl[BI.aChest] = 1 + breathe * .01; resolveBone(P, BI.aChest);
  let look = 0; if (env.target) { const lx = env.target.x - env.x, ly = env.target.y - env.y, aa = Math.atan2(ly, lx) - tr.yaw; look = Math.max(-.6, Math.min(.6, wrapA(aa))) * .6; }
  setEuler(P, BI.aHead, look + AR.weightYaw * armShift * moving, -headUp - .4 * lean + .25 + .3 * headDown - AR.weightSink * .7 * sink * moving + (reduce ? 0 : .03 * wobble(t * .5, 5)), -.5 * deathK - AR.weightRoll * .8 * armShift * moving); resolveBone(P, BI.aHead);
  // wings: folded like a cape, half open on the wind-up, spread and beating in the air, swept back in the charge, wrapped round
  // it like a cloak on the perch
  const beat = reduce ? 0 : Math.sin(t * 13) * spread;
  for (const [tag, s] of SIDES) {
    const fold = clamp01(1 - spread), back = spread < 0 ? -spread : 0;
    const keep = 1 - wrap, yawW = s * ((1.35 * fold + .2 * spread + .6 * back) * keep - .35 * wrap), droop = (1.05 * fold - .25 * spread - .55 * beat - .2 * back) * keep + 1.15 * wrap;
    setEuler(P, BI['aWing' + tag], yawW, (.25 * fold + .2 * back) * keep + .1 * wrap, -s * droop); resolveBone(P, BI['aWing' + tag]);
  }
  // legs: short and thick, planted by the gait; tucked in the air; the kick
  const strike = e.stalkStrike, strikeN = strike ? strike.n : -1, sk = strike ? 1 - clamp01(strike.t / .14) : 0;
  for (const [tag, s] of SIDES) {
    const q = 2 + (s > 0 ? 1 : 0), top = BI['aThigh' + tag], mid = BI['aShin' + tag];
    let fx = G.out[q * 4], fy = G.out[q * 4 + 1], fz = env.z + AR.foot * S + G.out[q * 4 + 2] * AR.footLift * S, off = 0, lf = -.2, lr = s * .17, lu = AR.foot;
    if (tuck > 0 || lift > .05) { off = Math.max(tuck, clamp01(lift / (.3 * S))); lf = -.08; lu = .2; }
    if (deathK > 0) { off = deathK; lf = -.1; lr = s * .3; lu = .08; }
    if (s > 0 && (kind === 'comboWarn' && a?.n === 2 || strikeN === 2)) { off = 1; const out = strikeN === 2 ? Math.sin(Math.PI * Math.min(1, sk * 1.2)) : .3 * smooth(k * 2); lf = .05 + .5 * out; lu = .12 + .3 * out; }
    if (off > 0) { const p = boneLocalToWorld(P, 'root', lf, lr, lu, Q); fx += (p[0] - fx) * off; fy += (p[1] - fy) * off; fz += (p[2] - fz) * off; }
    T[0] = fx; T[1] = fy; T[2] = fz; POLE[0] = cf; POLE[1] = sf; POLE[2] = 0;
    poseLimb(P, top, mid, AR.thigh * S * scale, AR.shin * S * scale, T, POLE, cf, sf);
  }
  // arms: on the knuckles; raised overhead and brought down; jabs and crosses; launched fists on stretching arms
  const fists = e.stalkFists || [];
  for (const [tag, s] of SIDES) {
    const q = s > 0 ? 1 : 0, up = BI['aArm' + tag], fo = BI['aFore' + tag], fi = BI['aFist' + tag], fist = fists.length ? fists[s > 0 ? 0 : 1] : null;
    if (fist) {
      // the fist where the game has it (`stalkFists`): the upper arm reaches toward it and the forearm stretches the rest of the way
      const fz = env.z + Math.max(0, Number(fist.lift) || 0) + G0.fistHeight * S;
      resolveBone(P, up); const h = up * 3; H[0] = P.wp[h]; H[1] = P.wp[h + 1]; H[2] = P.wp[h + 2];
      const dx = fist.x + .5 - H[0], dy = fist.y + .82 - H[1], dz = fz - H[2];
      aimWorld(P, up, -3, dx, dy, dz, cf, sf, 0); resolveBone(P, up);
      aimWorld(P, fo, -3, dx, dy, dz, cf, sf, 0); resolveBone(P, fo);
      aimWorld(P, fi, -3, dx, dy, dz, cf, sf, 0); placeAt(P, fi, fist.x + .5, fist.y + .82, fz); resolveBone(P, fi);
      continue;
    }
    let fx = G.out[q * 4], fy = G.out[q * 4 + 1], fz = env.z + AR.fist * S + G.out[q * 4 + 2] * AR.footLift * S, off = 0, lf = .36, lr = s * .3, lu = AR.fist;
    let raise = s > 0 ? raiseR : raiseL, punch = s > 0 ? punchR : punchL;
    // the combo: a jab (left), a cross (right), each cocked during its wind-up and thrown on the game's strike
    if (kind === 'comboWarn' && a) { const mine = (a.n === 0 && s < 0) || (a.n === 1 && s > 0); if (mine) punch = -.6 * smooth(k * 1.5); }
    if (strike && ((strikeN === 0 && s < 0) || (strikeN === 1 && s > 0) || (kind === 'lasers') || (kind === 'mirage'))) punch = Math.max(punch, Math.sin(Math.PI * Math.min(1, sk * 1.3)) * 1.1);
    if (kind === 'lasers' && !reduce) punch = .8 + .2 * Math.sin(t * 40 + s);
    if (striking && s > 0 && tr.strike === 'hammer') { raise = Math.max(0, 1 - strikeK * 1.6); off = 1; }
    if (raise > 0) { off = Math.max(off, raise); lf = .2 + .5 * (1 - raise) * (striking && tr.strike === 'hammer' ? 1 : 0); lr = s * .22; lu = .2 + 1.05 * raise; }
    if (punch > 0) { off = 1; lf = .3 + .7 * punch; lr = s * (.26 - .14 * punch); lu = .45 + .05 * punch; }
    else if (punch < 0) { off = 1; lf = .1 + .3 * punch; lr = s * .3; lu = .5; }
    if (kind === 'guard') { off = 1; lf = .42; lr = -s * .06; lu = .52; }
    if (wrap > .5) { off = Math.max(off, wrap); lf = .4; lr = s * .26; lu = AR.fist; }
    if (lift > .05) { off = Math.max(off, clamp01(lift / (.3 * S))); if (raise <= 0) { lf = .5; lu = .7 * spread + .25; lr = s * .32; } }
    if (deathK > 0) { off = deathK; lf = .4; lr = s * .45; lu = .08; }
    if (off > 0) { const p = boneLocalToWorld(P, 'root', lf, lr, lu, Q); fx += (p[0] - fx) * off; fy += (p[1] - fy) * off; fz += (p[2] - fz) * off; }
    T[0] = fx; T[1] = fy; T[2] = fz; POLE[0] = -cf + -sf * s * .6; POLE[1] = -sf + cf * s * .6; POLE[2] = -.3;
    poseLimb(P, up, fo, AR.upper * S * scale, AR.fore * S * scale, T, POLE, cf, sf);
    setEuler(P, fi, 0, 0, 0); resolveBone(P, fi);
  }
}
const G0 = STALKER_RIG;

// The back moves: the turret, the appendage, the crossed blades, the energized sphere and the shield. Each is placed in the
// world where the game's state puts it (relative to the body that carries it) and hidden by scale while it is down.
function poseBack(tr, e, env, form, S, cf, sf, t, reduce, dead) {
  const P = tr.pose, back = form === 'ape' ? G0.backApe : G0.backCat, carrier = form === 'ape' ? 'aChest' : 'cSpine';
  const bp = boneLocalToWorld(P, carrier, back[0], back[1], back[2], [0, 0, 0]);
  const baseX = env.x, baseY = env.y, z0 = env.z;
  // the turret, rising out of its back as stalkTurretUp, its barrel on the aim
  const up = dead ? 0 : clamp01(Number(e.stalkTurretUp) || 0);
  placeAt(P, BI.turret, bp[0], bp[1], bp[2] + .04 * S * up);
  const tAim = Number.isFinite(e.stalkTurret?.aim) ? e.stalkTurret.aim : e.stalkConeFlash ? e.stalkConeFlash.aim : Math.atan2(sf, cf);
  aimWorld(P, BI.turret, 0, Math.cos(tAim), Math.sin(tAim), .25, 0, 0, 1); P.scl[BI.turret] = Math.max(.001, smooth(up)); resolveBone(P, BI.turret);
  // the appendage
  const l = dead ? null : e.stalkLimb, L = l ? STALKER.limb[l.move] : null, lk = l ? prog(l) : 0;
  placeAt(P, BI.limb, bp[0], bp[1], bp[2]);
  let tipX = bp[0] + cf * .3 * S, tipY = bp[1] + sf * .3 * S, tipZ = bp[2] + .15 * S, tipScale = .001, limbOn = !!l && l.move !== 'boomerang', sword = null;
  if (l?.move === 'sword') { const ang = l.aim - L.arc + 2 * L.arc * Math.min(1, lk * 1.15); tipX = baseX + Math.cos(ang) * .9; tipY = baseY + Math.sin(ang) * .9; tipZ = z0 + .55 * S; sword = ang; }
  else if (l?.move === 'spikes') { const out = Math.sin(Math.PI * Math.min(1, lk)); tipX = baseX + Math.cos(l.aim) * .55; tipY = baseY + Math.sin(l.aim) * .55; tipZ = z0 + .35 * S; tipScale = STALKER.limb.spikes.length * (.35 + .65 * out) / (S * G0.spikeLength); }
  else if (l?.move === 'tendril') { tipX = baseX + Math.cos(l.aim) * 1.2; tipY = baseY + Math.sin(l.aim) * 1.2; tipZ = z0 - .15; }
  const dx = tipX - bp[0], dy = tipY - bp[1], dz = tipZ - bp[2];
  aimWorld(P, BI.limb, 0, dx, dy, Math.max(dz, 0) + .4 * Math.hypot(dx, dy), 0, 0, 1); P.scl[BI.limb] = limbOn ? 1 : .001; resolveBone(P, BI.limb);
  if (limbOn) { const ang = l.move === 'spikes' ? l.aim : Math.atan2(dy, dx); aimWorld(P, BI.limbTip, 0, Math.cos(ang), Math.sin(ang), l.move === 'tendril' ? -1.2 : 0, 0, 0, 1); placeAt(P, BI.limbTip, tipX, tipY, tipZ); }
  P.scl[BI.limbTip] = Math.max(.001, tipScale); resolveBone(P, BI.limbTip);
  // the blades: risen from the back, swung forward to cross in an X in front of it, held; or the sword on the appendage
  const b = dead ? null : e.stalkBlades, X = STALKER.turret.xblade;
  for (const [bn, side] of [['bladeA', 1], ['bladeB', -1]]) {
    const i = BI[bn];
    if (sword != null && side > 0) {
      placeAt(P, i, tipX, tipY, tipZ); aimWorld(P, i, 0, Math.cos(sword), Math.sin(sword), -.05, 0, 0, 1); P.scl[i] = (STALKER.limb.sword.reach - .9) / (S * G0.swordLength); resolveBone(P, i); continue;
    }
    if (!b) { P.scl[i] = .001; placeAt(P, i, bp[0], bp[1], bp[2]); resolveBone(P, i); continue; }
    const bk = prog(b), ca = Math.cos(b.aim), sa = Math.sin(b.aim), half = X.length / 2;
    // raised: from its back, up and splayed to its side; crossed: centred `reach` ahead, at ±45 degrees across the aim
    const rdx = -sa * side, rdy = ca * side;
    const raisedDir = [rdx * .45, rdy * .45, .9], crossDir = [rdx * Math.SQRT1_2, rdy * Math.SQRT1_2, side * Math.SQRT1_2];
    const crossC = [baseX + ca * X.reach, baseY + sa * X.reach, z0 + .55 * S];
    let q = 0, len = X.length, root0 = [bp[0] + rdx * .08 * S, bp[1] + rdy * .08 * S, bp[2]];
    if (b.phase === 'rise') { len = X.length * (.3 + .7 * bk); q = 0; }
    else q = b.phase === 'swing' ? smooth(bk) : 1;
    const dir = [raisedDir[0] + (crossDir[0] - raisedDir[0]) * q, raisedDir[1] + (crossDir[1] - raisedDir[1]) * q, raisedDir[2] + (crossDir[2] - raisedDir[2]) * q];
    const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1; dir[0] /= dl; dir[1] /= dl; dir[2] /= dl;
    const rootX = q > 0 ? root0[0] + (crossC[0] - dir[0] * half - root0[0]) * q : root0[0], rootY = q > 0 ? root0[1] + (crossC[1] - dir[1] * half - root0[1]) * q : root0[1], rootZ = q > 0 ? root0[2] + (crossC[2] - dir[2] * half - root0[2]) * q : root0[2];
    placeAt(P, i, rootX, rootY, rootZ); aimWorld(P, i, 0, dir[0], dir[1], dir[2], ca, sa, 0); P.scl[i] = len / (S * G0.bladeLength); resolveBone(P, i);
  }
  // the energized sphere round it and the shield before it (the shield on the Wayfarer's side, as the game aims it)
  const shieldAim = Number.isFinite(e.stalkShieldAim) ? e.stalkShieldAim : Math.atan2(sf, cf);
  setOffset(P, BI.fx, 0, 0, 0); resolveBone(P, BI.fx);
  aimWorld(P, BI.fx, 0, Math.cos(shieldAim), Math.sin(shieldAim), 0, 0, 0, 1);
  P.scl[BI.fx] = STALKER.energized.aura / (S * G0.auraRadius); resolveBone(P, BI.fx);
}

export const stalkerBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };

// ------------------------------------------------------------------------------------------------ the floor
// What the standard view draws on the ground round the Stalker, for Close View's floor while its body is the skinned one: the marks
// before each blow (drawStalkerMarks), the tendril's eruptions, the chomping puddles and its shots in flight. (The same shapes and
// colours as stalker-render.ts, which owns them; the body, the blades and the shield are the model's.)
const MARK_FILL = "rgba(255,80,190,.18)", MARK_EDGE = "rgba(255,130,210,.78)";
function oval(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2); }
export function drawStalkerCloseViewFloor(ctx, e, s, now) {
  if (!e || e.dead) return;
  drawStalkerMarks(ctx, e, s, now);
  ctx.save();
  const R = STALKER.limb.tendril.radius;
  for (const q of e.stalkErupts || []) { const cx = (q.x + .5) * s, cy = (q.y + .82) * s;
    if (q.t > 0) { const k = 1 - q.t / q.total; ctx.fillStyle = `rgba(255,80,190,${.12 + .15 * k})`; ctx.strokeStyle = MARK_EDGE; ctx.lineWidth = Math.max(2, s * .05); oval(ctx, cx, cy, R * s, R * s); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(220,235,250,.6)"; oval(ctx, cx, cy, R * s * k, R * s * k); ctx.fill(); }
    else { const k = Math.min(1, -q.t / q.burst); ctx.fillStyle = `rgba(235,244,252,${1 - k * .7})`; ctx.strokeStyle = "#8c96a6"; ctx.lineWidth = 1;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r0 = R * .2 * s, r1 = R * (1 - k * .4) * s, w = .3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0); ctx.closePath(); ctx.fill(); ctx.stroke(); } } }
  for (const q of e.stalkChompers || []) { const cx = (q.x + .5) * s, cy = (q.y + .82) * s, r = .32 * s, bite = q.state === "bite" ? 1 : q.state === "warn" ? .4 + .4 * Math.sin(now / 50) : .15;
    ctx.globalAlpha = Math.min(1, q.life / .6);
    if (q.state === "warn" && q.at) { ctx.fillStyle = MARK_FILL; ctx.strokeStyle = MARK_EDGE; ctx.lineWidth = Math.max(1.5, s * .04); const rr = STALKER.pool.split.radius * s; oval(ctx, (q.at.x + .5) * s, (q.at.y + .82) * s, rr, rr); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = "rgba(196,210,226,.92)"; oval(ctx, cx, cy, r, r * .8); ctx.fill(); ctx.fillStyle = "#2a3140"; oval(ctx, cx, cy, r * .45, r * .3 * bite + 1); ctx.fill(); ctx.globalAlpha = 1; }
  for (const q of e.stalkShots || []) { const qx = (q.x + .5) * s, qy = (q.y + .82) * s;
    if (q.kind === "laser") { const tx = qx - Math.cos(q.aim) * q.len * s, ty = qy - Math.sin(q.aim) * q.len * s; ctx.lineCap = "round"; ctx.strokeStyle = "rgba(120,200,255,.45)"; ctx.lineWidth = Math.max(4, s * .28); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(qx, qy); ctx.stroke(); ctx.strokeStyle = "#e9f8ff"; ctx.lineWidth = Math.max(2, s * .1); ctx.stroke(); }
    else if (q.kind === "xblade" || q.kind === "boomer") { const r = q.radius * s * (q.kind === "boomer" ? 1.6 : 1), a0 = q.kind === "boomer" ? q.spin || 0 : (q.aim ?? 0) + Math.PI / 4; ctx.strokeStyle = "#ffffff"; ctx.lineCap = "round"; ctx.lineWidth = Math.max(2, r * .22);
      for (const d of [0, Math.PI / 2]) { ctx.beginPath(); ctx.moveTo(qx - Math.cos(a0 + d) * r, qy - Math.sin(a0 + d) * r); ctx.lineTo(qx + Math.cos(a0 + d) * r, qy + Math.sin(a0 + d) * r); ctx.stroke(); }
      ctx.fillStyle = "rgba(200,245,255,.8)"; oval(ctx, qx, qy, r * .18, r * .18); ctx.fill(); }
    else { const r = q.radius * s; ctx.fillStyle = q.kind === "sphere" ? "rgba(120,220,255,.45)" : q.kind === "blast" ? "rgba(140,230,255,.5)" : "rgba(190,240,255,.85)"; oval(ctx, qx, qy, r, r); ctx.fill(); ctx.fillStyle = "#ffffff"; oval(ctx, qx, qy, r * .45, r * .45); ctx.fill(); } }
  ctx.restore();
}
