// The Crimson Tyrant and the Doom Chaser in Close View: the two dragons of the standard view (crimson-dragon-render.ts and
// doom-chaser-render.ts drawDragonBody: four legs, two great membrane wings, a long horned head on an S-curved neck, a heavy
// tail that is never still), as one skinned dragon on the shared beast rig, each in its own art table's colours. Built from the
// Questing Beast's body (close-view-beast-questing.ts: the blended hide, real folding wings with a body membrane, three-segment
// legs). It moves as the game poses it: every attack phase sets `dragonPose` (rise, fly, land, rear, slam, wingLash, breath,
// tailL/R, spin, roll, nova, colonize, roar ...), `dragonAir` lifts it, `dragonSpin` turns it, `dragonCharge` lights its mouth;
// the blows land as the game resolves them. Nothing here changes timing, damage, reach or targeting.
// The art tables are read lazily (monster-pack.ts reaches close-view.ts, which loads this module first).
// Second pass (Tim, 2026-11-12): one skin from tail tip to nose with the haunch, thighs and tail root grown out of it; big
// five-fingered wings with scalloped edges, spread and beating whenever it is aloft, half open as a threat on the move; the roar
// rears with them outspread; the aerial slam (Skyfall, dragonDive; the Doom Chaser's doomFall) hangs, dives and lands wings up.
import { DRAGON_ART } from "./crimson-dragon-render.js?v=r938-730fe2d66825";
import { DOOM_ART } from "./doom-chaser-render.js?v=r938-730fe2d66825";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, setWorldAxes, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, easeOut, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r938-730fe2d66825";

export const DRAGON_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  hip: .57, femur: .24, tibia: .23, hindMeta: .13, humerus: .22, radius: .23, foreMeta: .12, paw: .04, halfWidth: .16,
  // each dragon's bulk (its art table's build: the Tyrant long and lean, the Doom Chaser heavy): trunk width and depth, neck,
  // head and limb girth over the shared skeleton
  bulk: Object.freeze({ crimsonTyrant: { trunkW: 1.3, trunkH: 1.22, neck: 1.25, head: 1.3, limb: 1.4, tail: 1.3 }, doomChaser: { trunkW: 1.5, trunkH: 1.34, neck: 1.45, head: 1.45, limb: 1.6, tail: 1.5 } }),
  // the body's shape (buildDragonMesh): the tail's half-thickness where it leaves the hips (× bulk.tail); the trunk's sections
  // [f, u, half width, half height, bone, bone b, weight b] (× bulk.trunkW/H) from the tail root over the haunch, waist and chest;
  // the limbs [g (0 hip/shoulder, 1 knee/elbow, 2 hock/wrist, 3 paw), half width, half depth, forward, bone, bone b, weight b]
  // (× bulk.limb; p trunk, t upper, m middle, l lower limb bone) and the sections the low tier keeps; where the wing meets the haunch
  mesh: Object.freeze({
    tailRoot: .135,
    trunk: Object.freeze([[-.55, .865, .175, .185, 'pelvis', 'tail0', .3], [-.47, .875, .215, .218, 'pelvis'], [-.38, .87, .232, .228, 'pelvis'], [-.28, .86, .215, .215, 'pelvis', 'spine', .25],
      [-.17, .855, .172, .185, 'pelvis', 'spine', .6], [-.05, .86, .155, .178, 'spine'], [.08, .855, .168, .2, 'spine', 'chest', .45], [.2, .84, .19, .23, 'chest'], [.31, .835, .19, .238, 'chest'],
      [.41, .87, .15, .195, 'chest', 'neck', .4]]),
    hind: Object.freeze([[-.6, .05, .1, -.02, 'p'], [-.32, .1, .19, 0, 'p', 't', .2], [-.06, .138, .215, .02, 'p', 't', .5], [.25, .132, .2, .035, 't'], [.58, .095, .14, .03, 't'],
      [.95, .07, .085, .01, 't', 'm', .5], [1.25, .066, .088, -.025, 'm'], [1.6, .05, .06, -.01, 'm'], [2.0, .042, .047, 0, 'm', 'l', .5], [2.45, .037, .042, 0, 'l'], [2.85, .034, .04, 0, 'l'], [3.0, .036, .042, 0, 'l']]),
    fore: Object.freeze([[-.55, .035, .07, 0, 'p'], [-.28, .062, .1, .01, 'p', 't', .25], [0, .074, .11, .01, 'p', 't', .5], [.3, .072, .1, -.005, 't'], [.65, .064, .082, -.01, 't'],
      [.95, .062, .075, 0, 't', 'm', .5], [1.3, .06, .072, .012, 'm'], [1.65, .046, .052, 0, 'm'], [2.0, .037, .042, 0, 'm', 'l', .5], [2.45, .034, .039, 0, 'l'], [2.85, .033, .038, 0, 'l'], [3.0, .035, .04, 0, 'l']]),
    lowKeep: Object.freeze([0, 2, 4, 5, 8, 10, 11]), wingHaunch: -.42,
    // the Doom Chaser's glowing cracks: [f, angle round the section (0 the side, + up), half length, tilt]
    cracks: Object.freeze([[-.4, .1, .07, .5], [-.3, -.35, .06, -.4], [.22, .05, .07, .6], [-.05, .3, .06, -.3], [.3, -.4, .05, .3], [-.47, .55, .05, -.6], [.1, -.15, .05, .2], [-.2, .05, .055, .9], [.36, .35, .045, -.5]]), wingRoot: Object.freeze([.62, .75]),
  }),
  // the wings: beats per second in flight and hovering, the beat's half-angle (rad), how far the fingers lag, how much the
  // upstroke folds them, and how much the body heaves (× scale); spread on the move (a threat display) and at rest when roused
  flight: Object.freeze({ beat: 1.15, hoverBeat: .8, amp: .56, hoverAmp: .72, lag: .45, upFold: .22, heave: .05, moveSpread: .5, restSpread: .2, mantle: .8, foldFace: .2 }),
  walk: Object.freeze({ stride: .5, stance: .62 }), gallop: Object.freeze({ stride: 1.5, stance: .38 }), gallopSpeed: 3,
  hockLean: -.4, settle: 7, stepAt: .09, stepTime: .22, standTurnRate: 3.5, standTurnMax: 2.4, turnRate: 1.6, attackTurnRate: 12,
  footLift: .16, bob: .022, blendMs: 110, poseBlendMs: Object.freeze({ hang: 320, dive: 200, diveLand: 70, roar: 220, rise: 260 }), deathMs: 2300, landMs: 450, hitMs: 300, impactMs: 360,
  // rear (+ body up about the hind hips), head (+ raises), swing (head turned, + right), crouch (body down), lean (+ nose down),
  // wings (0 folded .. 1 spread), paw (the striking forepaw raised and cocked back: + right paw, - left), open (jaw)
  // the game's dragonPose names (crimson-dragon-render.ts POSES) as body poses; tail (+ swung left, - right)
  poses: Object.freeze({
    idle: { open: .1 }, dazed: { rear: -.06, head: -.55, swing: .15, crouch: .16, lean: .06, wings: .15, open: .4 },
    rise: { rear: .3, head: .2, wings: 1, open: .3, flap: 1.2 }, fly: { rear: -.1, head: .05, lean: .1, wings: 1, open: .2, flap: 1 }, land: { rear: -.1, head: -.3, crouch: .2, wings: .8, lift: .35, open: .3 },
    rear: { rear: .45, head: .45, wings: .8, paw: 1, open: .8 }, rearBoth: { rear: .55, head: .5, wings: .9, open: .9 },
    slam: { rear: -.12, head: -.4, crouch: .18, lean: .1, wings: .6, open: .9 }, slamBoth: { rear: -.14, head: -.45, crouch: .22, lean: .12, wings: .7, open: 1 },
    crouch: { rear: -.06, head: -.3, crouch: .2, wings: .3, open: .3 }, hop: { rear: .05, head: -.1, wings: .7, open: .3 },
    wingLash: { rear: .1, head: -.2, swing: .3, wings: 1, open: .6 }, headUp: { rear: .15, head: .7, wings: .4, open: .6 },
    charge: { head: .15, crouch: .08, lean: -.05, wings: .5, open: .45 }, breath: { head: -.1, lean: .1, wings: .5, open: 1 },
    colonize: { rear: .45, head: .8, wings: 1, lift: .25, open: .7 }, roar: { rear: .5, head: .6, wings: 1, lift: .4, sweep: -.15, open: 1, tremble: 1 },
    spinReady: { crouch: .15, wings: .3, tail: .5 }, spin: { crouch: .1, wings: .6, tail: .3 }, tailSpin: { crouch: .12, wings: .4, tail: 1 },
    tailReady: { swing: -.3, crouch: .1, tail: -.8 }, tailL: { swing: .3, crouch: .08, tail: 1 }, tailR: { swing: -.3, crouch: .08, tail: -1 },
    roll: { head: -.4, crouch: .2 }, nova: { rear: .3, head: .6, wings: 1, open: .8 },
    // the Doom Chaser's own (doom-chaser-render.ts): walking on its folded wings, the lunging bite, hanging under its black sun
    // (wslam: the wing slammed down, - left, + right; the other is raised for the next)
    wingWalk: { rear: -.08, head: -.2, crouch: .14, lean: .12, wings: .9, lift: -.35, open: .4 }, wingL: { rear: -.12, head: -.3, swing: .3, crouch: .16, lean: .12, wings: 1, lift: -.2, wslam: -1, open: .6 },
    wingR: { rear: -.06, head: -.25, swing: -.3, crouch: .12, lean: .1, wings: .9, lift: -.2, wslam: 1, open: .6 }, bite: { rear: -.1, head: -.25, crouch: .12, lean: .12, wings: .3, open: .9 },
    eclipse: { rear: .3, head: .5, wings: 1, open: .8, flap: .7 },
    // the aerial slam (Skyfall, monster-pack.ts dragonDive; the Doom Chaser's doomFall): it hangs upright on wide slow beats with
    // its head down on you, folds its wings back and falls nose first, and lands with them flung up
    hang: { rear: .6, head: -1.05, wings: 1, open: .6, flap: 1.3 }, dive: { rear: -.85, head: .3, wings: .5, sweep: .9, lift: .25, open: .9, glide: 1 },
    diveLand: { rear: -.08, head: -.32, crouch: .12, lean: .06, wings: 1, lift: .95, sweep: -.1, open: 1 },
  }),
});
const PK = ['rear', 'head', 'swing', 'crouch', 'lean', 'wings', 'paw', 'open', 'reach', 'tail', 'lift', 'sweep', 'flap', 'glide', 'tremble', 'wslam'], K = PK.length;
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(DRAGON_RIG.poses).map(([n, p]) => [n, Float64Array.from(PK.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
const R = DRAGON_RIG, TAIL = 6;
// The right wing spread, in model space (f forward, r right, u up); the left mirrors it. Bind pose = spread.
const WING = Object.freeze({ shoulder: [.24, .15, 1.06], elbow: [.08, .6, 1.26], wrist: [.36, 1.14, 1.4], tip0: [.06, 1.98, 1.3], tipA: [-.22, 1.9, 1.2], tip1: [-.46, 1.68, 1.1], tipB: [-.66, 1.42, 1.0], tip2: [-.78, 1.08, .94] });
// wing bone directions (model frame, right side), spread and folded, and the membrane's facing (the hint) in each
const WING_BONES = Object.freeze([ // [bone, from, to, folded direction, folded membrane facing (r: - inward, + outward)]
  ['wing', 'shoulder', 'elbow', [-.95, .16, .04], -1], ['wingMid', 'elbow', 'wrist', [.97, -.02, .1], 1],
  ['wingTip', 'wrist', 'tip0', [-.98, .06, -.02], -1], ['wingF1', 'wrist', 'tip1', [-.97, .08, -.1], -1], ['wingF2', 'wrist', 'tip2', [-.96, .1, -.17], -1]]);
// an orthonormal frame (rows: aimed axis, the hint's remainder, their cross) into out[9]
function wingFrame(out, dx, dy, dz, hx, hy, hz) {
  let l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l; const d = hx * dx + hy * dy + hz * dz; hx -= d * dx; hy -= d * dy; hz -= d * dz; l = Math.hypot(hx, hy, hz) || 1; hx /= l; hy /= l; hz /= l;
  out[0] = dx; out[1] = dy; out[2] = dz; out[3] = hx; out[4] = hy; out[5] = hz; out[6] = dy * hz - dz * hy; out[7] = dz * hx - dx * hz; out[8] = dx * hy - dy * hx; return out;
}
const WING_SIDES = Object.freeze([['L', -1], ['R', 1]]);
const WING_BIND = WING_BONES.map(([, a, b]) => [WING[b][0] - WING[a][0], WING[b][1] - WING[a][1], WING[b][2] - WING[a][2]]);
const WING_BF_R = WING_BIND.map((v) => wingFrame(new Float64Array(9), v[0], v[1], v[2], 0, 0, 1)), WING_BF_L = WING_BIND.map((v) => wingFrame(new Float64Array(9), v[0], -v[1], v[2], 0, 0, 1));
const WF = new Float64Array(9), WT = new Float64Array(9), RM = new Float64Array(9);
export const DRAGON_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', at: [-.42, 0, R.hip] },
  ...Array.from({ length: TAIL }, (_, i) => ({ name: 'tail' + i, parent: i ? 'tail' + (i - 1) : 'pelvis', at: i ? [-.165, 0, -.022 - .012 * i] : [-.2, 0, .02] })),
  { name: 'thighL', parent: 'pelvis', at: [0, -R.halfWidth, -.02] }, { name: 'shinL', parent: 'thighL', at: [0, 0, -R.femur] }, { name: 'metaHL', parent: 'shinL', at: [0, 0, -R.tibia] }, { name: 'pawHL', parent: 'metaHL', at: [0, 0, -R.hindMeta] },
  { name: 'thighR', parent: 'pelvis', at: [0, R.halfWidth, -.02] }, { name: 'shinR', parent: 'thighR', at: [0, 0, -R.femur] }, { name: 'metaHR', parent: 'shinR', at: [0, 0, -R.tibia] }, { name: 'pawHR', parent: 'metaHR', at: [0, 0, -R.hindMeta] },
  { name: 'spine', parent: 'pelvis', at: [.4, 0, .02] },
  { name: 'chest', parent: 'spine', at: [.38, 0, -.02] },
  { name: 'armL', parent: 'chest', at: [0, -R.halfWidth, -.06] }, { name: 'foreL', parent: 'armL', at: [0, 0, -R.humerus] }, { name: 'metaFL', parent: 'foreL', at: [0, 0, -R.radius] }, { name: 'pawFL', parent: 'metaFL', at: [0, 0, -R.foreMeta] },
  { name: 'armR', parent: 'chest', at: [0, R.halfWidth, -.06] }, { name: 'foreR', parent: 'armR', at: [0, 0, -R.humerus] }, { name: 'metaFR', parent: 'foreR', at: [0, 0, -R.radius] }, { name: 'pawFR', parent: 'metaFR', at: [0, 0, -R.foreMeta] },
  { name: 'neck', parent: 'chest', at: [.1, 0, .16] }, { name: 'neck2', parent: 'neck', at: [.17, 0, .1] }, { name: 'head', parent: 'neck2', at: [.14, 0, .05] },
  { name: 'jaw', parent: 'head', at: [.05, 0, -.07] },
  // each wing: an arm (wing), a forearm (wingMid) and three long fingers from the wrist (wingTip leading, wingF1, wingF2), bound
  // spread (WING below); the membrane runs between the fingers and from the last finger back to the flank (Tim, 2026-11-11:
  // "they should still be able to unfurl and fly ... a membrane that connects them to the back"). Folded, the arm lies back
  // along the top of the back, the forearm forward beside it and the fingers back over the flank, the membrane draped like a cape.
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1, d = (a, b) => [WING[b][0] - WING[a][0], s * (WING[b][1] - WING[a][1]), WING[b][2] - WING[a][2]];
    return [{ name: 'wing' + tag, parent: 'chest', at: [-.12, s * .15, .22] }, { name: 'wingMid' + tag, parent: 'wing' + tag, at: d('shoulder', 'elbow') },
      { name: 'wingTip' + tag, parent: 'wingMid' + tag, at: d('elbow', 'wrist') }, { name: 'wingF1' + tag, parent: 'wingMid' + tag, at: d('elbow', 'wrist') },
      { name: 'wingF2' + tag, parent: 'wingMid' + tag, at: d('elbow', 'wrist') }]; }),
]);
const BI = DRAGON_SKELETON.index;
const E_EYE = 1, E_FIRE = 2, E_MOUTH = 3, E_CRACK = 4;
const LEGS = [
  { top: 'thighL', mid: 'shinL', low: 'metaHL', paw: 'pawHL', hind: true, side: -1 }, { top: 'armL', mid: 'foreL', low: 'metaFL', paw: 'pawFL', hind: false, side: -1 },
  { top: 'thighR', mid: 'shinR', low: 'metaHR', paw: 'pawHR', hind: true, side: 1 }, { top: 'armR', mid: 'foreR', low: 'metaFR', paw: 'pawFR', hind: false, side: 1 },
];
const WALK_PHASE = [0, .25, .5, .75], GALLOP_PHASE = [0, .58, .12, .7];

// ------------------------------------------------------------------------------------------------ the body
// each dragon's colours from its art table (read when its mesh is first built)
const hexOf = (c) => parseInt(String(c).slice(1), 16);
function palette(variant) { const A = variant === 'doomChaser' ? DOOM_ART : DRAGON_ART;
  return Object.freeze({ hide: hexOf(A.hide), hideLight: hexOf(A.hideLight), dark: hexOf(A.hideDark), belly: hexOf(A.belly), plate: hexOf(A.bellyDark), ember: hexOf(A.fire), emberHot: hexOf(A.ember),
    core: hexOf(A.fireCore), bone: hexOf(A.teeth), boneDark: hexOf(A.hornLight), horn: hexOf(A.horn), claw: hexOf(A.bone), membrane: hexOf(A.membrane), membraneEdge: hexOf(A.membraneLight),
    wingBone: hexOf(A.hideDark), eye: hexOf(A.eye), scale: hexOf(A.hideDark) }); }
let C = null;
function buildDragonMesh(tier, variant) {
  C = palette(variant);
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(DRAGON_SKELETON, d), bw0 = DRAGON_SKELETON.bindWorld;
  // The hide is authored at a hip height of .84; LOW sets it onto the skeleton's lower hip. `bw` is the bind pose raised by LOW
  // (so bone-local parts authored at the old heights land right) and M() lowers model-space points.
  const LOW = .84 - R.hip, bw = bw0.map((v, i) => i % 3 === 2 ? v + LOW : v), M = (p) => [p[0], p[1], p[2] - LOW];
  const BK = R.bulk[variant] || R.bulk.crimsonTyrant, MS = R.mesh;
  const lerpHex = (a, b, t) => { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  // The hide (Tim, 2026-11-12: "the back halves are boxy and weird"): ONE skin from the tail's tip to the nose. The tail grows
  // thick out of the hips and tapers to the club; the haunch is the widest, deepest part of the trunk, a smooth muscular mass
  // that narrows into the waist, swells again over the deep chest and runs up the long neck into a wedge of a skull. No
  // separate lumps: the muscle is in the cross-sections. Lit along the top, banded plates beneath.
  const tailRows = [];
  for (let i = 0; i < TAIL; i++) { const k = BI['tail' + i] * 3, g = Math.pow(1 - i / (TAIL + .4), 1.15);
    tailRows.push([bw[k], bw[k + 2], (MS.tailRoot * g + .012) * BK.tail, (MS.tailRoot * .98 * g + .012) * BK.tail, 'tail' + i, i < TAIL - 1 ? 'tail' + (i + 1) : 'tail' + i, i < TAIL - 1 ? .3 : 0, 't']); }
  { const k = BI['tail' + (TAIL - 1)] * 3; tailRows.push([bw[k] - .1, bw[k + 2] - .01, .016, .016, 'tail' + (TAIL - 1), 'tail' + (TAIL - 1), 0, 't']); }
  const BODY = [ // [f, u, half width, half height, bone, bone b, weight b, kind: t tail, b trunk, n neck, h head]
    ...tailRows.reverse(),
    ...MS.trunk.map(([f, u, rx, rz, a, b, w]) => [f, u, rx, rz, a, b ?? a, w || 0, 'b']),
    [.5, .96, .1, .125, 'neck', 'neck', 0, 'n'], [.58, 1.03, .078, .095, 'neck', 'neck2', .5, 'n'], [.66, 1.09, .068, .08, 'neck2', 'neck2', 0, 'n'], [.74, 1.13, .066, .078, 'neck2', 'head', .6, 'n'],
    [.8, 1.15, .068, .08, 'head', 'head', 0, 'h'], [.87, 1.15, .058, .066, 'head', 'head', 0, 'h'], [.94, 1.135, .043, .052, 'head', 'head', 0, 'h'], [1.0, 1.115, .033, .04, 'head', 'head', 0, 'h'],
    [1.06, 1.1, .026, .031, 'head', 'head', 0, 'h'], [1.11, 1.085, .018, .022, 'head', 'head', 0, 'h'], [1.14, 1.077, .006, .007, 'head', 'head', 0, 'h']];
  for (const row of BODY) { const kd = row[7], [gw, gh] = kd === 'b' ? [BK.trunkW, BK.trunkH] : kd === 'n' ? [BK.neck, BK.neck] : kd === 'h' ? [BK.head, BK.head * .9] : [1, 1]; row[2] *= gw; row[3] *= gh; }
  const trunk0 = tailRows.length;
  const shade = (i, k, st) => {
    // scale bands across the back, a darker spine line, ribs over the waist; lit along the top
    const band = (i + (k % 2)) % 2 ? .1 : 0, ribs = i >= trunk0 + 4 && i <= trunk0 + 6 && Math.abs(st) < .55 && k % 2 === 0 ? .18 : 0;
    let c = lerpHex(C.hide, C.hideLight, Math.max(0, (st - .2) / .8) * .75); c = lerpHex(c, C.dark, band + ribs + (st > .9 ? .25 : 0) + (BODY[i][7] === 't' && i < 3 ? .3 : 0));
    // banded ventral plates under the throat, chest and belly (not under the tail's end)
    return st < -.3 && BODY[i][7] !== 'h' ? lerpHex(lerpHex(c, C.belly, Math.min(1, (-.3 - st) / .4) * (BODY[i][7] === 't' ? .5 : 1)), i % 2 ? C.plate : C.dark, st < -.65 ? .4 : 0) : c; };
  B.color(C.hide).loft({ seg: low ? 12 : 16, sections: BODY.map(([f, u, rx, rz, a, b, w]) => ({ at: M([f, 0, u]), rx, rz, bones: [a, b ?? a, w || 0] })), tone: shade, caps: false });
  // a row of spikes down the tail and the spiked club at its end
  for (let i = 1; i < TAIL - 1; i += low ? 2 : 1) { const b = 'tail' + i, r = (MS.tailRoot * Math.pow(1 - i / (TAIL + .4), 1.15) + .012) * BK.tail;
    B.bone(b).color(C.dark).lathe({ at: [-.04, 0, r * .8], F: [-.45, 0, .9], rings: [[0, .022], [.075 - i * .007, 0]], seg: 5, caps: false }); }
  B.bone('tail' + (TAIL - 1)).color(C.dark).ellipsoid({ at: [-.1, 0, 0], radius: [.085 * BK.tail * .8, .055 * BK.tail * .8, .055 * BK.tail * .8], rings: 3, seg: low ? 6 : 8 });
  for (const [a, b] of low ? [[0, 1]] : [[0, 1], [0, -1], [1, 0], [-1, 0], [.7, .7]]) B.color(C.horn).lathe({ at: [-.1, a * .05, b * .05], F: [-.2, a, b], rings: [[0, .018], [.07, 0]], seg: 4, caps: false });
  // cords up the neck (flat, so they read as muscle under the hide, not lumps)
  const mass = (bone, p, r, F = [1, 0, 0], U = [0, 0, 1], tone = C.hideLight) => B.bone(bone).color(tone).ellipsoid({ at: at(bone, [p[0], p[1] * (bone === 'neck' ? BK.neck : BK.trunkW), .84 + (p[2] - .84) * (bone === 'neck' ? 1 : BK.trunkH)]), radius: r, rings: low ? 3 : 4, seg: low ? 6 : 9, F, U });
  if (!low) for (const s of [-1, 1]) {
    mass('neck', [.52, s * .055, .99], [.1, .035, .045], [.6, 0, .8], [-.8, 0, .6], C.hide);
  }
  // spines down the back, longest over the shoulders and the hips (on the bone beneath each)
  { const n = low ? 6 : full ? 15 : 11; for (let i = 0; i < n; i++) { const f = i / (n - 1), x = .44 - f * 1.0, h = (.2 - Math.abs(f - .25) * .16) * (i % 2 ? .75 : 1);
      let q = trunk0; while (q < BODY.length - 2 && BODY[q + 1][0] < x) q++; const top = BODY[q][1] + BODY[q][3] - .015, bone = x < -.25 ? 'pelvis' : x < .12 ? 'spine' : 'chest';
      B.bone(bone).color(i % 3 === 0 ? C.boneDark : C.dark).lathe({ at: at(bone, [x, 0, top]), F: [-.45, 0, .9], rings: [[0, .03], [h * .6, .012], [h, 0]], rs: .55, seg: low ? 4 : 6, caps: false }); } }
  // the skull's detail: a brow ridge over each slit eye, teeth along the upper jaw; the lower jaw opens on fire
  for (const s of [-1, 1]) {
    if (!low) B.bone('head').color(C.dark).ellipsoid({ at: at('head', [.88, s * .045 * BK.head, 1.19]), radius: [.08, .024, .02], rings: 3, seg: 7, F: [1, 0, -.15] });
    B.bone('head').color(C.eye, E_EYE).ellipsoid({ at: at('head', [.9, s * .052 * BK.head, 1.165]), radius: [.025, .006, .009], rings: 2, seg: 6 });
    if (!low) for (let i = 0; i < 5; i++) B.color(C.bone).lathe({ at: at('head', [.88 + i * .045, s * (.03 - i * .003) * BK.head, 1.085]), F: [0, 0, -1], rings: [[0, .009], [.03, 0]], seg: 4, caps: false });
  }
  { const J = [[.8, 1.08, .05, .026], [.9, 1.065, .038, .02], [.98, 1.05, .028, .015], [1.05, 1.035, .016, .01], [1.08, 1.03, .004, .003]];
    B.color(C.dark).loft({ seg: low ? 6 : 8, sections: J.map(([f, u, rx, rz]) => ({ at: M([f, 0, u]), rx: rx * BK.head, rz: rz * 1.3, bones: ['jaw', 'jaw', 0] })), caps: false });
    if (!low) B.bone('jaw').color(C.ember, E_MOUTH).ellipsoid({ at: at('jaw', [.92, 0, 1.085]), radius: [.07, .025, .008], rings: 2, seg: 6 }); }
  // horns: thick at the brow, swept back over the skull and turning up at the tips, ridged
  for (const s of [-1, 1]) { const hw = s * BK.head, pts = low ? [[.84, hw * .05, 1.2], [.62, hw * .1, 1.27], [.46, hw * .11, 1.31], [.38, hw * .1, 1.38]] : [[.84, hw * .05, 1.2], [.74, hw * .08, 1.25], [.62, hw * .1, 1.27], [.52, hw * .115, 1.29], [.44, hw * .11, 1.33], [.38, hw * .1, 1.39]];
    B.color(C.horn).loft({ seg: low ? 4 : 7, sections: pts.map((p, i) => ({ at: M(p), rx: .05 * (1 - i / pts.length) + .004, rz: .042 * (1 - i / pts.length) + .004, bones: ['head', 'head', 0] })), tone: (i) => i > 3 ? C.bone : i > 1 ? C.boneDark : C.horn }); }
  if (!low) for (const [y, f] of [[0, .76], [-.035, .74], [.035, .74]]) B.bone('head').color(C.horn).lathe({ at: at('head', [f, y, 1.2]), F: [-.6, y * 4, .8], rings: [[0, .016], [.06, 0]], seg: 4, caps: false });
  // The wings (Tim, 2026-11-12: "pretty large and properly dragon-like"): an arm and forearm of bone, five long fingers fanned
  // from the wrist (three on their own bones, two between them skinned half to each), the membrane stretched between them with
  // its trailing edge scalloped between the fingertips, and the broad last panel from the hindmost finger back to the flank and
  // down to the haunch. Bound spread (WING); folded, it lies over the back like a cape. Dark at the root, lit toward the edges.
  const bodyAt = (f) => { let k = trunk0; while (k < BODY.length - 2 && BODY[k + 1][0] < f) k++;
    const A = BODY[k], Bq = BODY[k + 1], q = Math.max(0, Math.min(1, (f - A[0]) / (Bq[0] - A[0] || 1))), m = (n) => A[n] + (Bq[n] - A[n]) * q, row = q < .5 ? A : Bq;
    return { u: m(1), rx: m(2), rz: m(3), bone: (row[6] || 0) >= .5 ? row[5] : row[4] }; };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const memTone = (edge, root) => lerpHex(lerpHex(C.membrane, C.membraneEdge, edge * .85), C.dark, root * .35);
  const scallop = (variant === 'doomChaser' ? DOOM_ART : DRAGON_ART).scallop ?? .3;
  for (const s of [-1, 1]) {
    const tag = s < 0 ? 'L' : 'R', Wp = (n) => [WING[n][0], s * WING[n][1], WING[n][2]], wr = Wp('wrist'), el = Wp('elbow'), sh = Wp('shoulder');
    // the fingers, leading to trailing: [tip, bone a, bone b, weight b]
    const FING = ['tip0', 'tipA', 'tip1', 'tipB', 'tip2'].map((n) => [Wp(n)]);
    // a finger's skin as a place on the chain wingTip (0) .. wingF1 (1) .. wingF2 (2); between two fingers it is interpolated
    const CHAIN = ['wingTip' + tag, 'wingF1' + tag, 'wingF2' + tag], chainSkin = (p) => p < 1 ? [CHAIN[0], CHAIN[1], p] : [CHAIN[1], CHAIN[2], Math.min(1, p - 1)];
    // between the fingers: fans from the wrist, each trailing edge scalloped in between its two fingertips
    const radial = low ? 2 : full ? 5 : 3, across = low ? 2 : full ? 4 : 3;
    for (let f = 0; f < FING.length - 1; f += low ? 2 : 1) { const f2 = low ? f + 2 : f + 1, grid = [];
      for (let r = 0; r < radial; r++) { const t = .05 + .95 * r / (radial - 1), row = [];
        for (let c = 0; c < across; c++) { const u = c / (across - 1), out = lerp3(FING[f][0], FING[f2][0], u), k = t * (1 - scallop * Math.sin(Math.PI * u) * t * t);
          row.push(lerp3(wr, out, k)); }
        grid.push(row); }
      B.sheet({ grid: grid.map((row) => row.map(M)), vertBones: (r, c) => chainSkin((f + (f2 - f) * c / (across - 1)) / 2), tone: (r, c) => memTone(r / (radial - 1), 1 - r / (radial - 1)) }); }
    // from the hindmost finger and the arm back to the flank: u runs from the finger (0) to the body (1), t from the arm (0) to the
    // trailing edge (1). The body edge follows the flank from the shoulder to the haunch.
    const nu = low ? 3 : full ? 6 : 4, nt = low ? 3 : full ? 7 : 4, haunchF = MS.wingHaunch, grid = [], bones = [], tip2 = FING[4][0];
    const front = (u) => u < .5 ? lerp3(wr, el, u * 2) : lerp3(el, sh, u * 2 - 1);
    const flank = (t) => { const f = sh[0] + (haunchF - sh[0]) * t, b = bodyAt(f); return [f, s * b.rx * MS.wingRoot[0], b.u + b.rz * MS.wingRoot[1]]; };
    for (let r = 0; r < nu; r++) { const u = r / (nu - 1), row = [], brow = [];
      for (let c = 0; c < nt; c++) { const t = c / (nt - 1), back = lerp3(tip2, flank(1), u), sag = scallop * .9 * Math.sin(Math.PI * u) * t * t;
        let p = lerp3(front(u), back, t * (1 - sag)); const fl = flank(t), w = u * u * u * u;
        p = c === 0 ? front(u) : r === nu - 1 ? fl : [p[0] + (fl[0] - p[0]) * w, p[1] + (fl[1] - p[1]) * w, p[2] + (fl[2] - p[2]) * w];
        row.push(p);
        const body = bodyAt(p[0]).bone;
        brow.push(u < .45 ? ['wingF2' + tag, 'wingMid' + tag, clamp01(1 - t * 3.5)] : ['wing' + tag, body, smooth((u - .45) / .55)]); }
      grid.push(row); bones.push(brow); }
    B.sheet({ grid: grid.map((row) => row.map(M)), vertBones: (r, c) => bones[r][c], tone: (r, c) => memTone(c / (nt - 1) * (1 - r / (nu - 1) * .5), r / (nu - 1)) });
    // the bones: a heavy arm and forearm, long fingers tapering to points, a hooked thumb claw at the wrist
    const segs = low ? 4 : 6;
    B.color(C.wingBone).loft({ seg: segs, sections: [[sh, .045, ['wing' + tag, 'wing' + tag, 0]], [lerp3(sh, el, .5), .034, ['wing' + tag, 'wing' + tag, 0]], [el, .032, ['wing' + tag, 'wingMid' + tag, .5]],
      [lerp3(el, wr, .5), .026, ['wingMid' + tag, 'wingMid' + tag, 0]], [wr, .03, ['wingMid' + tag, 'wingMid' + tag, 0]]].filter((_, i) => !low || i % 2 === 0).map(([p, r0, bn]) => ({ at: M(p), rx: r0 * 1.3, rz: r0 * 1.1, bones: bn })) });
    for (let f = 0; f < FING.length; f++) { if (low && f % 2) continue; const tp = FING[f][0], r0 = f === 0 ? .022 : .016;
      B.color(C.wingBone).loft({ seg: low ? 3 : 4, sections: [[wr, r0], [lerp3(wr, tp, .5), r0 * .65], [tp, .003]].filter((_, i) => !low || i !== 1).map(([p, rr]) => ({ at: M(p), rx: rr * 1.3, rz: rr * 1.3, bones: chainSkin(f / 2) })) }); }
    if (!low) { B.bone('wingMid' + tag).color(C.bone).lathe({ at: at('wingMid' + tag, wr), F: [.8, s * .1, .5], rings: [[0, .018], [.09, 0]], seg: 4, caps: false });
      B.bone('wingTip' + tag).color(C.bone).lathe({ at: at('wingTip' + tag, FING[0][0]), F: [-.3, s * .9, -.2], rings: [[0, .008], [.05, 0]], seg: 4, caps: false }); }
  }
  // the Doom Chaser's scales are burnt glass with violet fire showing through the cracks between them (doom-chaser-render.ts
  // cracks): thin glowing seams over its flanks, neck and haunch (emissive channel 4, kept out of the outline)
  if (variant === 'doomChaser' && !low) for (const [f, th, len, tilt] of MS.cracks.slice(0, full ? MS.cracks.length : 6)) for (const s of [-1, 1]) {
    const b = bodyAt(f), ct = Math.cos(th), st = Math.sin(th), p = [f, s * b.rx * ct * 1.01, b.u + b.rz * st * 1.01], nrm = [0, s * ct / b.rx, st / b.rz];
    B.bone(b.bone).color(C.ember, E_CRACK).ellipsoid({ at: at(b.bone, p), radius: [len, .007, .004], rings: 2, seg: 4, F: [Math.cos(tilt), 0, Math.sin(tilt)], U: nrm }); }
  // Legs grown out of the body (Tim, 2026-11-12: "the hind legs should grow out of the haunch with real thigh muscle ... no visible
  // seams"): each limb's skin starts inside the trunk on the trunk's own bone and blends onto the limb over its first sections,
  // so the haunch flows into a broad drumstick of a thigh, a lean shin, a jointed hock; the foreleg out of the chest the same way.
  // Sections in limb units g (0 at the hip or shoulder, 1 at the knee or elbow, 2 at the hock or wrist, 3 at the paw).
  for (const L of LEGS) {
    const top = BI[L.top] * 3, x = bw0[top], y = bw0[top + 1], parent = L.hind ? 'pelvis' : 'chest', name = (c) => c === 'p' ? parent : c === 't' ? L.top : c === 'm' ? L.mid : L.low;
    const J = [L.top, L.mid, L.low, L.paw].map((n) => bw0[BI[n] * 3 + 2]), hAt = (g) => g <= 0 ? J[0] - g * (J[0] - J[1]) : g >= 3 ? J[3] : J[Math.floor(g)] + (J[Math.floor(g) + 1] - J[Math.floor(g)]) * (g - Math.floor(g));
    const lg = BK.limb, prof = L.hind ? MS.hind : MS.fore, keep = low ? MS.lowKeep : null;
    B.color(C.hide).loft({ seg: low ? 7 : 12, up: [1, 0, 0], sections: prof.filter((_, i) => !keep || keep.includes(i)).map(([g, rx, rz, fw, a, b, w]) => ({ at: [x + fw * lg, y + L.side * Math.max(0, rx * lg - .14) * (g < .6 ? .45 : 0), hAt(g)], rx: rx * lg, rz: rz * lg, bones: [name(a), name(b ?? a), w || 0] })),
      // the limb's rings are measured fore and aft (st), so its tone runs down the leg: the trunk's own flank colour where it
      // grows out of the body (no seam), darkening toward the scaled lower leg
      tone: (i, k) => { const g = prof[keep ? keep[i] : i][0]; return g >= 2.1 ? C.dark : lerpHex(C.hide, C.dark, clamp01((g - .3) * .22) + (k % 2 && g > .9 ? .08 : 0)); } });
    B.bone(L.paw).color(C.dark).ellipsoid({ at: [.03, 0, -.01], radius: [.075 * lg, .058 * lg, .032], rings: 3, seg: low ? 6 : 8 });
    for (const c of low ? [0] : [-1, 0, 1]) B.color(C.claw).lathe({ at: [.08 + .03 * lg, c * .032 * lg, -.012], F: [1, c * .25, -.6], rings: [[0, .016 * lg], [.075 * lg, 0]], seg: 4, caps: false });
  }
  return B.done();
}
const MESHES = new Map();
export function dragonMesh(tier = 'full', variant = 'crimsonTyrant') { const k = variant + ':' + tier; let m = MESHES.get(k); if (!m) { m = buildDragonMesh(tier, variant); MESHES.set(k, m); } return m; }
// function declarations, not consts: the render modules' import cycle reaches the roster before this module finishes loading
export function tyrantMesh(tier) { return dragonMesh(tier, 'crimsonTyrant'); }
export function doomMesh(tier) { return dragonMesh(tier, 'doomChaser'); }

// ------------------------------------------------------------------------------------------------ track and act
export function createDragonTrack(variant = 'crimsonTyrant') {
  return { pose: createPose(DRAGON_SKELETON), gait: createGait(LEGS.map((L, k) => ({ side: L.side * .12, fore: L.hind ? -.42 : .36, phase: WALK_PHASE[k] }))),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, blendFor: 0, from: new Float64Array(K), shown: new Float64Array(K), hp: NaN, hitAt: -Infinity, hitSide: 1,
    airWas: 0, flapPh: 0, landAt: -Infinity, landHard: 0, impactAt: -Infinity, impactK: 0, contactWas: 0, beatSeq: -1, beatAt: -Infinity, beatK: 0, deathAt: null, x: 0, y: 0, z: 0, deathDir: 1, gallop: 0, speed: 0,
    variant, frame: { kind: variant, tier: 'full', mesh: null, skin: null, boneCount: DRAGON_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false } };
}
const V = new Float64Array(K), W = new Float64Array(K);
const setVec = (o, n) => o.set(POSE_VEC[n] || POSE_VEC.idle);
const ACT = { pose: '', aim: false, aimX: 0, aimY: 0, watch: false, still: false, gallop: false, contact: 0, phase: '', beat: -1, beatK: 0, fire: 0, airTuck: 0, spinYaw: NaN };
const CONTACT = new Set(['slam', 'slamBoth', 'wingLash', 'roar', 'tailL', 'tailR', 'wingL', 'wingR', 'bite', 'diveLand']);
// the Doom Chaser's Falling Dark (monster-pack.ts doomFall) poses only rise, fly and slamBoth; its stages are the aerial slam's
const FALL_POSE = Object.freeze({ track: 'hang', drop: 'dive', done: 'diveLand' });
function act(e, tr, now, target) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, pose = e.dragonPose;
  ACT.pose = ''; ACT.aim = false; ACT.watch = false; ACT.still = !!id; ACT.gallop = false; ACT.contact = 0; ACT.phase = id ? `${id}:${ph}:${pose || ''}` : 'move'; ACT.beat = -1; ACT.beatK = 0; ACT.fire = 0; ACT.airTuck = 0; ACT.spinYaw = NaN;
  const aimDir = (a) => { if (a && Math.hypot(a.x, a.y) > .01) { const l = Math.hypot(a.x, a.y); ACT.aimX = a.x / l; ACT.aimY = a.y / l; ACT.aim = true; } };
  if (!id && !pose) { setVec(V, 'idle'); ACT.watch = true; return; }
  const shown = id === 'doomFall' && FALL_POSE[d.mode] ? FALL_POSE[d.mode] : pose;
  setVec(V, POSE_VEC[shown] ? shown : 'idle'); ACT.pose = shown || '';
  if (d.aim) aimDir(d.aim); else if (target) aimDir({ x: target.x - e.x, y: target.y - e.y });
  if (pose === 'fly' || pose === 'roll') ACT.still = false; // it moves under the game's strafe or roll
  if (CONTACT.has(shown)) ACT.contact = 1;
  ACT.fire = Math.max(Number(e.dragonCharge) || 0, pose === 'breath' ? 1.2 : pose === 'charge' ? .6 : 0);
  ACT.airTuck = (Number(e.dragonAir) || 0) > .1 ? 1 : 0;
}

// ------------------------------------------------------------------------------------------------ the pose
const H = new Float64Array(3), T = new Float64Array(3), LEGBONES = new Int16Array(4), LENS = new Float64Array(3);
export function sampleDragon(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(4, Number(env.scale) || 1)), P = tr.pose, G = DRAGON_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  const dxm = env.x - tr.gait.x, dym = env.y - tr.gait.y, sp = Number.isFinite(dxm) && dt > 0 ? Math.hypot(dxm, dym) / dt / S : 0; tr.speed += (sp - tr.speed) * Math.min(1, dt * 8);
  if (!dead) act(e, tr, now, env.target); else { setVec(V, 'dazed'); ACT.aim = false; ACT.watch = false; ACT.still = true; ACT.gallop = false; ACT.contact = 0; ACT.phase = 'death'; ACT.beat = -1; ACT.fire = 0; ACT.airTuck = 0; ACT.spinYaw = NaN; }
  if (!ACT.still && tr.speed > G.gallopSpeed / Math.max(1, S)) ACT.gallop = true;
  let want = tr.yaw;
  if (Number.isFinite(ACT.spinYaw)) want = ACT.spinYaw;
  else if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (Number.isFinite(dxm) && Math.hypot(dxm, dym) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dym, dxm);
  else if (ACT.watch && env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate;
    let turn = Math.max(-1, Math.min(1, dt * rate)) * delta; if (!e.pack?.attack && tr.gait.moving < .1) turn = Math.max(-G.standTurnMax * dt, Math.min(G.standTurnMax * dt, turn)); tr.yaw += turn; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // a new pose inside one attack blends too (the aerial slam's hang, dive and landing), over its own time where it has one
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}:${ACT.pose}` : e.pack?.evade?.t > 0 ? 'evade' : dead ? 'death' : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs)) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.blendFor = G.poseBlendMs[ACT.pose] || G.blendMs; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / (tr.blendFor || G.blendMs));
  for (let k = 0; k < K; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  W.set(tr.shown);
  if (ACT.beat >= 0 && ACT.beat !== tr.beatSeq) { tr.beatSeq = ACT.beat; tr.beatAt = now; tr.beatK = ACT.beatK; } else if (ACT.beat < 0) tr.beatSeq = -1;
  if (ACT.contact && !tr.contactWas) { tr.impactAt = now; tr.impactK = /Wave|Pounce|leapSlam|Dive|Fall/.test(ACT.phase) ? 1 : .55; }
  tr.contactWas = ACT.contact;
  const impT = (now - tr.impactAt) / 1000, impact = impT < G.impactMs / 1000 ? kick(impT, 22, 9) * tr.impactK : 0;
  W[3] += .04 * Math.abs(impact); W[1] -= .1 * impact;
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const air = dead ? 0 : Math.max(0, Number(e.dragonAir) || 0) * S * .8 + Math.max(0, Number(e.hopLift) || 0); // dragonAir is in body units (the standard view's u)
  if (tr.airWas > .15 && air <= .15) { tr.landAt = now; tr.landHard = Math.min(1, tr.airWas / 2 + .3); }
  tr.airWas = air;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 16, 10) : 0;
  W[2] -= .35 * hit * tr.hitSide; W[1] += .2 * hit; W[3] += .03 * Math.abs(hit);
  const landT = (now - tr.landAt) / 1000, land = landT < G.landMs / 1000 ? Math.max(0, kick(landT, 9, 7)) * tr.landHard : 0;
  W[3] += .14 * land; W[1] -= .25 * land;
  const stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0) { const dz = POSE_VEC.dazed; for (let k = 0; k < K; k++) W[k] += (dz[k] - W[k]) * stun; }
  const daze = stun > 0 && !reduce ? stun * Math.sin(t * 4) : 0;
  
  // gait
  const gallop = ACT.gallop && !dead; tr.gallop += ((gallop ? 1 : 0) - tr.gallop) * Math.min(1, dt * 8);
  const gs = gallop ? G.gallop : G.walk, phases = gallop ? GALLOP_PHASE : WALK_PHASE;
  for (let k = 0; k < 4; k++) { tr.gait.offsets[k] = phases[k]; tr.gait.side[k] = LEGS[k].side * (G.halfWidth + .015) * S; tr.gait.fore[k] = (LEGS[k].hind ? -.42 : .36) * S; }
  const still = (ACT.still && !gallop) || air > .15 || dead || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: gs.stride * S, stance: gs.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime, maxStepping: 2 });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  resetPose(P);
  let alpha = e.fleeFade != null ? clamp01(e.fleeFade) : 1, roll = 0;
  if (dead) { const sink = smooth(death / .35), side = easeIn(span(death, .25, .55)); W[3] += .2 * sink; W[1] = -.4 * sink; roll = 1.3 * side * tr.deathDir; alpha *= 1 - span(death, .82, 1);
    if (death < 1e-9) { const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.deathDir = (px - e.x) * -sf + (py - e.y) * cf > 0 ? -1 : 1; } }
  if (e.phasing || e.untargetable && !e.aloft && !(e.pack?.evade?.t > 0)) alpha *= .55;
  // Roused, it carries its wings half open as a threat display, wider on the move (Tim, 2026-11-12); aloft they are always spread
  // and beating (unless it folds them to fall), in deep slow strokes while it hovers, the body heaving on each downstroke.
  const FL = G.flight;
  if (ACT.watch && !dead) W[5] = Math.max(W[5], FL.restSpread + (FL.moveSpread - FL.restSpread) * clamp01(tr.speed / .3));
  const glide = clamp01(W[13]), aloft = air > .15 && !dead, hover = clamp01((W[12] - 1) / .3);
  const flapAmt = reduce || dead ? 0 : Math.max(clamp01(W[12]), aloft ? 1 : 0) * (1 - glide), amp = FL.amp + (FL.hoverAmp - FL.amp) * hover;
  tr.flapPh = (tr.flapPh + dt * Math.PI * 2 * (FL.beat + (FL.hoverBeat - FL.beat) * hover)) % (Math.PI * 200);
  const heave = flapAmt * FL.heave * S * -Math.sin(tr.flapPh - .4), tremble = reduce ? 0 : .035 * W[14];
  const spin = Number(e.dragonSpin) || 0, rolling = e.dragonPose === 'roll' && !dead && !reduce ? t * 9 : 0; // the claw and tail spins turn it; the roll tumbles it
  setEuler(P, BI.root, yaw + spin, 0, roll + rolling); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z + air + heave * (aloft ? 1 : 0) + (rolling ? .25 * S : 0));
  const breathe = reduce ? 0 : Math.sin(t * 2.4);
  const bob = moving * G.bob * (1 + tr.gallop * 1.8) * (.5 - .5 * Math.cos(cyc * 2)), sway = moving * .014 * Math.sin(cyc) * (1 - tr.gallop);
  const gallopFlex = reduce ? 0 : tr.gallop * moving * .14 * Math.sin(cyc * 2);
  setOffset(P, BI.pelvis, 0, sway, -W[3] - bob); setEuler(P, BI.pelvis, 0, -W[0] + W[4] + gallopFlex * .6, -sway * 1.4 + daze * .06); resolveBone(P, BI.pelvis);
  for (let i = 0; i < TAIL; i++) { const wave = reduce ? 0 : Math.sin(t * (2.2 + tr.gallop * 3) - i * .7) * (.12 + .05 * i) * (1 - stun * .5);
    setEuler(P, BI['tail' + i], wave + (i === 0 ? W[2] * -.3 : 0) + W[9] * (.3 - .03 * i), (i === 0 ? -.15 - .25 * W[0] + .2 * tr.gallop : .06 + .03 * i - .04 * tr.gallop) - W[0] * .1, 0); resolveBone(P, BI['tail' + i]); }
  setEuler(P, BI.spine, reduce ? 0 : -moving * .05 * Math.sin(cyc), -gallopFlex, 0); resolveBone(P, BI.spine);
  setEuler(P, BI.chest, W[2] * .2, -.04 * W[3] - gallopFlex * .4, -W[6] * .12); P.scl[BI.chest] = 1 + breathe * .01; resolveBone(P, BI.chest);
  let look = 0; if (env.target && !dead && !ACT.contact) { const a = Math.atan2(env.target.y - e.y, env.target.x - e.x) - yaw; look = Math.max(-.6, Math.min(.6, Math.atan2(Math.sin(a), Math.cos(a)))) * .6; }
  setEuler(P, BI.neck, W[2] * .4 + look * .4, -W[1] * .45 + bob * 3, 0); resolveBone(P, BI.neck);
  setEuler(P, BI.neck2, W[2] * .35 + look * .3, -W[1] * .35, 0); resolveBone(P, BI.neck2);
  setEuler(P, BI.head, W[2] * .25 + look * .3, -W[1] * .2 + (reduce ? 0 : .02 * wobble(t * .9, 4)), W[2] * .2); resolveBone(P, BI.head);
  setEuler(P, BI.jaw, 0, .5 * W[7] * (1 + (reduce ? 0 : .08 * Math.sin(t * 30))), 0); resolveBone(P, BI.jaw);
  // the wings: each bone is turned from its spread (bind) direction to a direction blended between folded and spread in the
  // chest's frame. Folded they lie over the back and breathe; spread they open wide, and in the air (or rearing up) they beat.
  { const ci = BI.chest * 9, sc = Math.hypot(P.wr[ci], P.wr[ci + 1], P.wr[ci + 2]) || 1, stream = tr.gallop * moving, open = Math.max(clamp01(W[5]), .22 * stream, aloft ? 1 - .5 * glide : 0);
    for (const [tag, s] of WING_SIDES) for (let b = 0; b < WING_BONES.length; b++) {
      const [name, , , fold, face] = WING_BONES[b], bd = WING_BIND[b], ripple = reduce ? 0 : (1 - open) * .05 * Math.sin(t * 1.8 + b * .9 + s);
      // the beat: the arm leads, the forearm and then the fingers follow a little behind; held a touch high on average
      const ph = tr.flapPh - (b === 0 ? 0 : b === 1 ? .5 : 1) * FL.lag, g = Math.sin(ph) + .22 * Math.sin(2 * ph), beat = flapAmt * (amp * g + .06) * (b === 0 ? 1 : 1.15);
      // on the upstroke the hand folds in a little (cupping air on the way down)
      // half open, the arm is raised out first and the hand stays furled (a mantling threat, not a fan of fingers)
      const ob = b === 0 ? Math.pow(open, .7) : b === 1 ? open : open * open, o = b >= 2 ? Math.max(0, ob - FL.upFold * flapAmt * Math.max(0, Math.cos(ph))) : ob;
      // the direction (model frame, right side), lifted about the body's long axis by the beat and the pose, then swept back
      let dx = fold[0] + (bd[0] - fold[0]) * o, dy = fold[1] + (bd[1] - fold[1]) * o, dz = fold[2] + (bd[2] - fold[2]) * o - .12 * stream * (b > 1 ? 1 : 0);
      const th = beat + ripple + (W[10] + FL.mantle * open * (1 - open) * (1 - flapAmt)) * (b === 0 ? 1 : 1.12) + tremble * Math.sin(t * 31 + b * 1.7 + s) + W[15] * (W[15] * s > 0 ? -.55 : -.35) * s * (b === 0 ? 1 : .8), c = Math.cos(th), sn = Math.sin(th), y2 = dy * c - dz * sn; dz = dy * sn + dz * c; dy = y2;
      // the membrane faces: up when spread, outward over the flank (so it hangs down the flank) when folded
      let hx = 0, hy = FL.foldFace * face * (1 - o), hz = .3 + .7 * o; const hy2 = hy * c - hz * sn; hz = hy * sn + hz * c; hy = hy2;
      const sw = W[11] * (b === 0 ? .8 : 1), cw = Math.cos(sw), swn = Math.sin(sw), dx2 = dx * cw - dy * swn; dy = dx * swn + dy * cw; dx = dx2; const hx2 = hx * cw - hy * swn; hy = hx * swn + hy * cw; hx = hx2;
      wingFrame(WF, dx, s * dy, dz, hx, s * hy, hz);
      // world = chest frame * model frame
      for (let k = 0; k < 3; k++) { const vx = WF[k * 3], vy = WF[k * 3 + 1], vz = WF[k * 3 + 2];
        WT[k * 3] = (P.wr[ci] * vx + P.wr[ci + 3] * vy + P.wr[ci + 6] * vz) / sc; WT[k * 3 + 1] = (P.wr[ci + 1] * vx + P.wr[ci + 4] * vy + P.wr[ci + 7] * vz) / sc; WT[k * 3 + 2] = (P.wr[ci + 2] * vx + P.wr[ci + 5] * vy + P.wr[ci + 8] * vz) / sc; }
      // R = target frame * bind frame^T (bind frames per side)
      const BF = s < 0 ? WING_BF_L[b] : WING_BF_R[b];
      for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) RM[col * 3 + row] = WT[row] * BF[col] + WT[3 + row] * BF[3 + col] + WT[6 + row] * BF[6 + col];
      const bi = BI[name + tag]; setWorldAxes(P, bi, RM[0], RM[1], RM[2], RM[3], RM[4], RM[5], RM[6], RM[7], RM[8]); resolveBone(P, bi);
    } }
  for (let k = 0; k < 4; k++) {
    const L = LEGS[k], top = BI[L.top], can = (L.hind ? G.hindMeta : G.foreMeta) * S, pawH = (G.paw + .012) * S;
    resolveBone(P, top); H[0] = P.wp[top * 3]; H[1] = P.wp[top * 3 + 1]; H[2] = P.wp[top * 3 + 2];
    let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], lift = tr.gait.out[k * 4 + 2], fz = env.z + pawH + lift * G.footLift * S * (1 + tr.gallop);
    const strikePaw = !L.hind && ((L.side > 0 && W[6] > .05) || (L.side < 0 && W[6] < -.05)) ? Math.abs(W[6]) : 0; // the raking forepaw
    const hang = ACT.pose === 'hang' ? .45 : 1, fold = L.hind ? Math.max(ACT.airTuck * .7, air > .15 ? .5 : 0) * hang : Math.max(air > .15 ? .6 : 0, W[0] > .3 ? (W[0] - .2) * 1.5 : 0);
    if (still && !dead && (fold > .05 || air > .15 || strikePaw > 0)) {
      // the striking paw: cocked high and back (reach 0), or raked out forward and low (reach 1)
      const rest = (L.hind ? -.42 : .36) * S, rk = clamp01(W[8]), reach = strikePaw > 0 ? (-.05 + .4 * rk) * strikePaw : 0, ax = x + cf * (rest + reach * S), ay = y + sf * (rest + reach * S);
      fx = ax - sf * L.side * G.halfWidth * S; fy = ay + cf * L.side * G.halfWidth * S;
      const len = (L.hind ? G.femur + G.tibia + G.hindMeta : G.humerus + G.radius + G.foreMeta) * S;
      fz = Math.max(env.z + pawH, H[2] - len * (1 - .45 * Math.max(fold, strikePaw * (.75 - .45 * rk))));
    }
    if (dead) { const p = boneLocalToWorld(P, 'root', L.hind ? -.42 : .36, L.side * .14, G.paw, T); fx = p[0]; fy = p[1]; fz = p[2]; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    LEGBONES[0] = top; LEGBONES[1] = BI[L.mid]; LEGBONES[2] = BI[L.low]; LEGBONES[3] = BI[L.paw];
    LENS[0] = (L.hind ? G.femur : G.humerus) * S; LENS[1] = (L.hind ? G.tibia : G.radius) * S; LENS[2] = can;
    const bend = Math.min(1, lift * .9 + fold + strikePaw), toe = lift > 0 || fold > .05 || strikePaw ? -.5 * Math.max(lift, fold, strikePaw) : 0;
    poseAnimalLeg(P, LEGBONES, H, T, LENS, cf, sf, L.hind, bend, toe, L.hind ? G.hockLean - .5 * bend : .1 + 1.1 * bend);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1, beat = .5 + .5 * Math.sin(t * (ACT.fire > .8 ? 22 : 6));
  F.emitK[0] = life * 1.3; F.emitK[1] = 0;
  F.emitK[2] = life * (.6 + 1.2 * Math.max(W[7], ACT.fire) + (reduce ? 0 : .2 * beat * ACT.fire));
  F.emitA[0] = 1; F.emitA[1] = 0; F.emitA[2] = W[7] > .25 || ACT.fire > .1 ? 1 : 0;
  // the Doom Chaser's cracks smoulder, flaring as it charges
  F.emitK[3] = tr.variant === 'doomChaser' ? life * (.7 + .8 * ACT.fire + (reduce ? 0 : .15 * Math.sin(t * 2.1))) : 0; F.emitA[3] = tr.variant === 'doomChaser' ? 1 : 0;
  F.tier = env.tier || 'full'; F.mesh = dragonMesh(F.tier, tr.variant); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air; F.shadow = 1 - Math.min(.6, air / (4 * S)); F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = false;
  return F;
}
export const dragonBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
