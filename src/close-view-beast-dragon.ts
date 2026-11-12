// The Crimson Tyrant and the Doom Chaser in Close View: the two dragons of the standard view (crimson-dragon-render.ts and
// doom-chaser-render.ts drawDragonBody: four legs, two great membrane wings, a long horned head on an S-curved neck, a heavy
// tail that is never still), as one skinned dragon on the shared beast rig, each in its own art table's colours. Built from the
// Questing Beast's body (close-view-beast-questing.ts: the blended hide, real folding wings with a body membrane, three-segment
// legs). It moves as the game poses it: every attack phase sets `dragonPose` (rise, fly, land, rear, slam, wingLash, breath,
// tailL/R, spin, roll, nova, colonize, roar ...), `dragonAir` lifts it, `dragonSpin` turns it, `dragonCharge` lights its mouth;
// the blows land as the game resolves them. Nothing here changes timing, damage, reach or targeting.
// The art tables are read lazily (monster-pack.ts reaches close-view.ts, which loads this module first).
import { DRAGON_ART } from "./crimson-dragon-render.ts";
import { DOOM_ART } from "./doom-chaser-render.ts";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, setWorldAxes, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, easeOut, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.ts";

export const DRAGON_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  hip: .62, femur: .24, tibia: .23, hindMeta: .13, humerus: .22, radius: .23, foreMeta: .12, paw: .04, halfWidth: .16,
  // each dragon's bulk (its art table's build: the Tyrant long and lean, the Doom Chaser heavy): trunk width and depth, neck,
  // head and limb girth over the shared skeleton
  bulk: Object.freeze({ crimsonTyrant: { trunkW: 1.3, trunkH: 1.22, neck: 1.25, head: 1.3, limb: 1.4, tail: 1.3 }, doomChaser: { trunkW: 1.5, trunkH: 1.34, neck: 1.45, head: 1.45, limb: 1.6, tail: 1.5 } }),
  walk: Object.freeze({ stride: .5, stance: .62 }), gallop: Object.freeze({ stride: 1.5, stance: .38 }), gallopSpeed: 3,
  settle: 7, stepAt: .09, stepTime: .22, standTurnRate: 3.5, standTurnMax: 2.4, turnRate: 1.6, attackTurnRate: 12,
  footLift: .16, bob: .022, blendMs: 110, deathMs: 2300, landMs: 450, hitMs: 300, impactMs: 360,
  // rear (+ body up about the hind hips), head (+ raises), swing (head turned, + right), crouch (body down), lean (+ nose down),
  // wings (0 folded .. 1 spread), paw (the striking forepaw raised and cocked back: + right paw, - left), open (jaw)
  // the game's dragonPose names (crimson-dragon-render.ts POSES) as body poses; tail (+ swung left, - right)
  poses: Object.freeze({
    idle: { open: .1 }, dazed: { rear: -.06, head: -.55, swing: .15, crouch: .16, lean: .06, wings: .15, open: .4 },
    rise: { rear: .2, head: .3, wings: 1, open: .3 }, fly: { rear: -.1, head: .05, lean: .1, wings: 1, open: .2 }, land: { rear: -.1, head: -.3, crouch: .2, wings: .6, open: .3 },
    rear: { rear: .45, head: .45, wings: .8, paw: 1, open: .8 }, rearBoth: { rear: .55, head: .5, wings: .9, open: .9 },
    slam: { rear: -.12, head: -.4, crouch: .18, lean: .1, wings: .6, open: .9 }, slamBoth: { rear: -.14, head: -.45, crouch: .22, lean: .12, wings: .7, open: 1 },
    crouch: { rear: -.06, head: -.3, crouch: .2, wings: .3, open: .3 }, hop: { rear: .05, head: -.1, wings: .7, open: .3 },
    wingLash: { rear: .1, head: -.2, swing: .3, wings: 1, open: .6 }, headUp: { rear: .15, head: .7, wings: .4, open: .6 },
    charge: { head: .15, crouch: .08, lean: -.05, wings: .5, open: .45 }, breath: { head: -.1, lean: .1, wings: .5, open: 1 },
    colonize: { rear: .4, head: .8, wings: 1, open: .7 }, roar: { rear: .2, head: .45, wings: .9, open: 1 },
    spinReady: { crouch: .15, wings: .3, tail: .5 }, spin: { crouch: .1, wings: .6, tail: .3 }, tailSpin: { crouch: .12, wings: .4, tail: 1 },
    tailReady: { swing: -.3, crouch: .1, tail: -.8 }, tailL: { swing: .3, crouch: .08, tail: 1 }, tailR: { swing: -.3, crouch: .08, tail: -1 },
    roll: { head: -.4, crouch: .2 }, nova: { rear: .3, head: .6, wings: 1, open: .8 },
    // the Doom Chaser's own (doom-chaser-render.ts): walking on its folded wings, the lunging bite, hanging under its black sun
    wingWalk: { rear: -.08, head: -.2, crouch: .14, lean: .12, wings: .9, open: .4 }, wingL: { rear: -.12, head: -.3, swing: .3, crouch: .16, lean: .12, wings: 1, open: .6 },
    wingR: { rear: -.06, head: -.25, swing: -.3, crouch: .12, lean: .1, wings: .8, open: .6 }, bite: { rear: -.1, head: -.25, crouch: .12, lean: .12, wings: .3, open: .9 },
    eclipse: { rear: .3, head: .5, wings: 1, open: .8 },
  }),
});
const PK = ['rear', 'head', 'swing', 'crouch', 'lean', 'wings', 'paw', 'open', 'reach', 'tail'], K = PK.length;
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(DRAGON_RIG.poses).map(([n, p]) => [n, Float64Array.from(PK.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
const R = DRAGON_RIG, TAIL = 6;
// The right wing spread, in model space (f forward, r right, u up); the left mirrors it. Bind pose = spread.
const WING = Object.freeze({ shoulder: [.24, .15, 1.06], elbow: [.11, .55, 1.24], wrist: [.33, 1.02, 1.36], tip0: [.04, 1.66, 1.28], tip1: [-.44, 1.38, 1.04], tip2: [-.7, .86, .92] });
// wing bone directions (model frame, right side), spread and folded, and the membrane's facing (the hint) in each
const WING_BONES = Object.freeze([ // [bone, from, to, folded direction, folded membrane facing (r: - inward, + outward)]
  ['wing', 'shoulder', 'elbow', [-.95, .16, .04], -1], ['wingMid', 'elbow', 'wrist', [.97, -.02, .1], 1],
  ['wingTip', 'wrist', 'tip0', [-.97, -.03, -.02], -1], ['wingF1', 'wrist', 'tip1', [-.93, -.04, -.28], -1], ['wingF2', 'wrist', 'tip2', [-.85, -.05, -.48], -1]]);
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
  ...Array.from({ length: TAIL }, (_, i) => ({ name: 'tail' + i, parent: i ? 'tail' + (i - 1) : 'pelvis', at: i ? [-.15, 0, -.025 - .012 * i] : [-.2, 0, .02] })),
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
  const BK = R.bulk[variant] || R.bulk.crimsonTyrant, girth = (i) => i <= 10 ? [BK.trunkW, BK.trunkH] : i <= 14 ? [BK.neck, BK.neck] : [BK.head, BK.head * .9];
  const lerpHex = (a, b, t) => { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  // The hide: tail root to nose in one skin. A heavy haunch, a tucked waist with ribs over a lean flank, a deep chest, a long
  // neck rising into an angular wedge of a skull with a narrow muzzle; lit along the top, dark beneath.
  const BODY = [ // [f, u, half width, half height, bone, bone b, weight b]
    [-.66, .86, .055, .065, 'pelvis'], [-.6, .86, .115, .135, 'pelvis'], [-.52, .85, .165, .19, 'pelvis'], [-.42, .84, .18, .21, 'pelvis'],
    [-.3, .84, .165, .195, 'pelvis', 'spine', .3], [-.16, .86, .135, .155, 'pelvis', 'spine', .65], [-.02, .86, .132, .16, 'spine'], [.12, .85, .158, .2, 'spine', 'chest', .4],
    [.24, .83, .175, .23, 'chest'], [.34, .83, .17, .235, 'chest'], [.43, .88, .135, .18, 'chest', 'neck', .4], [.5, .96, .1, .125, 'neck'],
    [.58, 1.03, .078, .095, 'neck', 'neck2', .5], [.66, 1.09, .068, .08, 'neck2'], [.74, 1.13, .066, .078, 'neck2', 'head', .6], [.8, 1.15, .068, .08, 'head'],
    [.87, 1.15, .058, .066, 'head'], [.94, 1.135, .043, .052, 'head'], [1.0, 1.115, .033, .04, 'head'], [1.06, 1.1, .026, .031, 'head'], [1.11, 1.085, .018, .022, 'head'], [1.145, 1.075, 0, 0, 'head']];
  const shade = (i, k, st) => { const rib = i >= 5 && i <= 7 && Math.abs(st) < .5 && k % 3 === 0 ? .35 : 0; // ribs over the lean flank
    const mot = ((((i * 2654435761) ^ (k * 40503)) >>> 0) % 100) / 100; // mottled fur
    let c = lerpHex(C.hide, C.hideLight, Math.max(0, (st - .3) / .7) * .8); c = lerpHex(c, C.dark, rib + (mot < .3 ? .35 : 0)); if (mot > .85) c = lerpHex(c, C.hideLight, .3);
    // banded ventral plates under the throat and belly
    return st < -.25 ? lerpHex(lerpHex(c, C.belly, Math.min(1, (-.25 - st) / .4)), i % 2 ? C.plate : C.dark, st < -.6 ? .45 : 0) : c; };
  for (let i = 0; i < BODY.length; i++) { const [gw, gh] = girth(i); BODY[i][2] *= gw; BODY[i][3] *= gh; }
  B.color(C.hide).loft({ seg: low ? 8 : 16, sections: BODY.map(([f, u, rx, rz, a, b, w]) => ({ at: M([f, 0, u]), rx, rz, bones: [a, b ?? a, w || 0] })), tone: shade, caps: false });
  // the tail: one tapering skin through six bones, a row of spikes, the bone blade at the end
  { const T = [[-.6, .86, .085 * BK.tail, .09 * BK.tail, 'pelvis', 'tail0', .4]]; for (let i = 0; i < TAIL; i++) { const p = [bw[BI['tail' + i] * 3], 0, bw[BI['tail' + i] * 3 + 2]], g = BK.tail * (1 - i / (TAIL + 1)); T.push([p[0], p[2], .07 * g + .008, .072 * g + .008, 'tail' + i, i < TAIL - 1 ? 'tail' + (i + 1) : 'tail' + i, .35]); }
    B.color(C.hide).loft({ seg: low ? 6 : 9, sections: T.map(([f, u, rx, rz, a, b, w]) => ({ at: M([f, 0, u]), rx, rz, bones: [a, b, w] })), tone: (i, k, st) => i > 3 ? C.dark : shade(6, k, st) });
    for (let i = 1; i < TAIL - 1; i += low ? 2 : 1) { const b = 'tail' + i; B.bone(b).color(C.dark).lathe({ at: [-.06, 0, .03], F: [-.4, 0, .9], rings: [[0, .022], [.07 - i * .006, 0]], seg: 5, caps: false }); }
    // the spiked club at its end
    B.bone('tail' + (TAIL - 1)).color(C.dark).ellipsoid({ at: [-.12, 0, 0], radius: [.08, .05, .05], rings: 3, seg: low ? 6 : 8 });
    for (const [a, b] of low ? [[0, 1]] : [[0, 1], [0, -1], [1, 0], [-1, 0], [.7, .7]]) B.color(C.horn).lathe({ at: [-.12, a * .045, b * .045], F: [-.2, a, b], rings: [[0, .016], [.06, 0]], seg: 4, caps: false }); }
  // Muscle (Tim, 2026-11-11: "more muscular ... more texture or detail"): masses over the hide on the bones that move them:
  // shoulder blades and deltoids over the forelegs, glutes and thighs on the haunch, a heavy forearm and calf, cords up the neck.
  const mass = (bone, p, r, F = [1, 0, 0], U = [0, 0, 1], tone = C.hideLight) => B.bone(bone).color(tone).ellipsoid({ at: at(bone, [p[0], p[1] * (bone === 'neck' ? BK.neck : BK.trunkW), .84 + (p[2] - .84) * (bone === 'neck' ? 1 : BK.trunkH)]), radius: r, rings: low ? 3 : 4, seg: low ? 6 : 9, F, U });
  for (const s of [-1, 1]) {
    mass('chest', [.3, s * .125, .9], [.13, .032, .085], [.6, 0, -.8], [.8, s * .2, .6]); // shoulder blade
    mass('chest', [.36, s * .135, .76], [.1, .035, .11], [.3, 0, -.95], [.95, 0, .3], C.hide); // deltoid over the arm root
    mass('pelvis', [-.44, s * .13, .9], [.15, .038, .11], [1, 0, -.3]); // glute
    mass('pelvis', [-.38, s * .145, .76], [.12, .04, .13], [.3, 0, -.95], [.95, 0, .3], C.hide); // haunch over the thigh root
    if (!low) { const [th, fa] = s < 0 ? ['thighL', 'foreL'] : ['thighR', 'foreR'];
      B.bone(th).color(C.hide).ellipsoid({ at: [.03, 0, -.08], radius: [.085, .07, .11], rings: 4, seg: 8 }); // thigh
      B.bone(fa).color(C.hide).ellipsoid({ at: [.01, 0, -.06], radius: [.055, .05, .08], rings: 4, seg: 8 }); // forearm
      mass('neck', [.52, s * .055, .99], [.1, .035, .045], [.6, 0, .8], [-.8, 0, .6], C.hide); } // neck cord
  }
  // spines down the back, longest over the shoulders (on the bone beneath each)
  { const n = low ? 6 : full ? 15 : 11; for (let i = 0; i < n; i++) { const f = i / (n - 1), x = .44 - f * 1.0, h = (.2 - Math.abs(f - .25) * .16) * (i % 2 ? .75 : 1);
      let q = 1; while (q < BODY.length - 2 && BODY[q + 1][0] < x) q++; const top = BODY[q][1] + BODY[q][3] - .01, bone = x < -.25 ? 'pelvis' : x < .12 ? 'spine' : 'chest';
      B.bone(bone).color(i % 3 === 0 ? C.boneDark : C.dark).lathe({ at: at(bone, [x, 0, top]), F: [-.45, 0, .9], rings: [[0, .03], [h * .6, .012], [h, 0]], rs: .55, seg: low ? 4 : 6, caps: false }); } }
  // the skull's detail: a brow ridge over each slit eye, cheek plates, teeth along the upper jaw; the lower jaw opens on fire
  for (const s of [-1, 1]) {
    if (!low) B.bone('head').color(C.dark).ellipsoid({ at: at('head', [.88, s * .045 * BK.head, 1.19]), radius: [.08, .024, .02], rings: 3, seg: 7, F: [1, 0, -.15] });
    B.bone('head').color(C.eye, E_EYE).ellipsoid({ at: at('head', [.9, s * .052 * BK.head, 1.165]), radius: [.025, .006, .009], rings: 2, seg: 6 });
    if (!low) for (let i = 0; i < 5; i++) B.color(C.bone).lathe({ at: at('head', [.88 + i * .045, s * (.03 - i * .003) * BK.head, 1.085]), F: [0, 0, -1], rings: [[0, .009], [.03, 0]], seg: 4, caps: false });
  }
  { const J = [[.82, 1.075, .045, .022], [.9, 1.065, .038, .02], [.98, 1.05, .028, .015], [1.05, 1.035, .016, .01], [1.08, 1.03, 0, 0]];
    B.color(C.dark).loft({ seg: 8, sections: J.map(([f, u, rx, rz]) => ({ at: M([f, 0, u]), rx: rx * BK.head, rz: rz * 1.3, bones: ['jaw', 'jaw', 0] })), caps: false });
    if (!low) B.bone('jaw').color(C.ember, E_MOUTH).ellipsoid({ at: at('jaw', [.92, 0, 1.085]), radius: [.07, .025, .008], rings: 2, seg: 6 }); } // the fire in its mouth
  // horns: thick at the brow, swept back over the skull and turning up at the tips, ridged
  for (const s of [-1, 1]) { const hw = s * BK.head, pts = low ? [[.84, hw * .05, 1.2], [.62, hw * .1, 1.27], [.46, hw * .11, 1.31], [.38, hw * .1, 1.38]] : [[.84, hw * .05, 1.2], [.74, hw * .08, 1.25], [.62, hw * .1, 1.27], [.52, hw * .115, 1.29], [.44, hw * .11, 1.33], [.38, hw * .1, 1.39]];
    B.color(C.horn).loft({ seg: low ? 5 : 7, sections: pts.map((p, i) => ({ at: M(p), rx: .05 * (1 - i / pts.length) + .004, rz: .042 * (1 - i / pts.length) + .004, bones: ['head', 'head', 0] })), tone: (i) => i > 3 ? C.bone : i > 1 ? C.boneDark : C.horn }); }
  // a crown of short horns behind the swept ones
  if (!low) for (const [y, f] of [[0, .76], [-.035, .74], [.035, .74]]) B.bone('head').color(C.horn).lathe({ at: at('head', [f, y, 1.2]), F: [-.6, y * 4, .8], rings: [[0, .016], [.06, 0]], seg: 4, caps: false });
  // The wings: an arm, a forearm and three long fingers; membranes stretched between the fingers, and the broad one from the last
  // finger back to the flank and down to the haunch, so the wing is joined to the body along its whole length. Bound spread
  // (WING); folded, it lies over the back like a cape. Dark at the root, wine-red toward the scalloped trailing edges.
  const bodyAt = (f) => { let k = 0; while (k < BODY.length - 2 && BODY[k + 1][0] < f) k++;
    const A = BODY[k], Bq = BODY[k + 1], q = Math.max(0, Math.min(1, (f - A[0]) / (Bq[0] - A[0] || 1))), m = (n) => A[n] + (Bq[n] - A[n]) * q, row = q < .5 ? A : Bq;
    return { u: m(1), rx: m(2), rz: m(3), bone: (row[6] || 0) >= .5 ? row[5] : row[4] }; };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const memTone = (edge, root) => lerpHex(lerpHex(C.membrane, C.membraneEdge, edge * .85), C.dark, root * .35);
  for (const s of [-1, 1]) {
    const tag = s < 0 ? 'L' : 'R', Wp = (n) => [WING[n][0], s * WING[n][1], WING[n][2]], wr = Wp('wrist'), el = Wp('elbow'), sh = Wp('shoulder');
    const tips = [Wp('tip0'), Wp('tip1'), Wp('tip2')], fb = ['wingTip' + tag, 'wingF1' + tag, 'wingF2' + tag];
    // between the fingers: fans from the wrist, the outer edge scalloped in between the fingertips
    const radial = low ? 2 : full ? 5 : 3, across = low ? 3 : full ? 4 : 3;
    for (let f = 0; f < 2; f++) { const grid = [];
      for (let r = 0; r < radial; r++) { const t = .06 + .94 * r / (radial - 1), row = [];
        for (let c = 0; c < across; c++) { const u = c / (across - 1), out = lerp3(tips[f], tips[f + 1], u), k = t * (1 - .24 * Math.sin(Math.PI * u) * t * t);
          row.push(lerp3(wr, out, k)); }
        grid.push(row); }
      B.sheet({ grid: grid.map((row) => row.map(M)), vertBones: (r, c) => [fb[f], fb[f + 1], c / (across - 1)], tone: (r, c) => memTone(r / (radial - 1), 1 - r / (radial - 1)) }); }
    // from the last finger and the arm back to the flank: u runs from the finger (0) to the body (1), t from the arm (0) to the
    // trailing edge (1). The body edge follows the flank from the shoulder to the haunch.
    const nu = low ? 3 : full ? 6 : 4, nt = low ? 3 : full ? 7 : 4, haunchF = -.52, grid = [], bones = [];
    const front = (u) => u < .5 ? lerp3(wr, el, u * 2) : lerp3(el, sh, u * 2 - 1);
    const flank = (t) => { const f = sh[0] + (haunchF - sh[0]) * t, b = bodyAt(f); return [f, s * b.rx * .78, b.u + b.rz * .6]; };
    for (let r = 0; r < nu; r++) { const u = r / (nu - 1), row = [], brow = [];
      for (let c = 0; c < nt; c++) { const t = c / (nt - 1), back = lerp3(tips[2], flank(1), u), sag = .2 * Math.sin(Math.PI * u) * t * t;
        let p = lerp3(front(u), back, t * (1 - sag)); const fl = flank(t), w = u * u * u * u;
        p = c === 0 ? front(u) : r === nu - 1 ? fl : [p[0] + (fl[0] - p[0]) * w, p[1] + (fl[1] - p[1]) * w, p[2] + (fl[2] - p[2]) * w];
        row.push(p);
        const body = bodyAt(p[0]).bone;
        brow.push(u < .45 ? [fb[2], 'wingMid' + tag, clamp01(1 - t * 3.5)] : [u < .75 ? 'wing' + tag : 'wing' + tag, body, smooth((u - .45) / .55)]); }
      grid.push(row); bones.push(brow); }
    B.sheet({ grid: grid.map((row) => row.map(M)), vertBones: (r, c) => bones[r][c], tone: (r, c) => memTone(c / (nt - 1) * (1 - r / (nu - 1) * .5), r / (nu - 1)) });
    // the bones: a heavy arm and forearm, long fingers tapering to points, a hooked thumb claw at the wrist
    const segs = low ? 4 : 6;
    B.color(C.wingBone).loft({ seg: segs, sections: [[sh, .04, ['wing' + tag, 'wing' + tag, 0]], [lerp3(sh, el, .5), .032, ['wing' + tag, 'wing' + tag, 0]], [el, .03, ['wing' + tag, 'wingMid' + tag, .5]],
      [lerp3(el, wr, .5), .024, ['wingMid' + tag, 'wingMid' + tag, 0]], [wr, .026, ['wingMid' + tag, 'wingMid' + tag, 0]]].filter((_, i) => !low || i % 2 === 0).map(([p, r0, bn]) => ({ at: M(p), rx: r0 * 1.3, rz: r0 * 1.1, bones: bn })) });
    for (let f = 0; f < 3; f++) { if (low && f === 1) continue;
      B.color(C.wingBone).loft({ seg: low ? 3 : 4, sections: [[wr, .018], [lerp3(wr, tips[f], .5), .012], [tips[f], .003]].filter((_, i) => !low || i !== 1).map(([p, r0]) => ({ at: M(p), rx: r0 * 1.3, rz: r0 * 1.3, bones: [fb[f], fb[f], 0] })) }); }
    if (!low) { B.bone('wingMid' + tag).color(C.bone).lathe({ at: at('wingMid' + tag, wr), F: [.8, s * .1, .5], rings: [[0, .016], [.08, 0]], seg: 4, caps: false });
      B.bone(fb[0]).color(C.bone).lathe({ at: at(fb[0], tips[0]), F: [-.3, s * .9, -.2], rings: [[0, .008], [.05, 0]], seg: 4, caps: false }); }
  }
  // legs: lean digitigrade limbs grown out of the body, muscled at the top; three claws on each paw
  // (Tim, 2026-11-11: the legs were "almost comically small"): heavy limbs, a big muscled thigh and forearm, stout lower legs
  const HIND = [[.86, .07, .11, 'p'], [.78, .12, .17, 'p', 't', .5], [.68, .115, .16, 't'], [.58, .08, .105, 't', 'm', .5], [.44, .062, .075, 'm'], [.28, .045, .052, 'm', 'l', .5], [.18, .037, .042, 'l'], [.07, .034, .04, 'l'], [.04, .036, .042, 'l']];
  const FORE = [[.84, .065, .1, 'p'], [.74, .105, .15, 'p', 't', .5], [.64, .1, .135, 't'], [.54, .07, .088, 't', 'm', .5], [.4, .058, .068, 'm'], [.24, .042, .048, 'm', 'l', .5], [.17, .035, .04, 'l'], [.07, .033, .038, 'l'], [.04, .035, .04, 'l']];
  for (const L of LEGS) {
    const top = BI[L.top] * 3, x = bw[top], y = bw[top + 1], parent = L.hind ? 'pelvis' : 'chest', name = (c) => c === 'p' ? parent : c === 't' ? L.top : c === 'm' ? L.mid : L.low;
    const base = L.hind ? bw0[BI.pelvis * 3 + 2] - R.hip : bw0[BI.chest * 3 + 2] - R.hip, kh = R.hip / .84, lg = BK.limb;
    B.color(C.hide).loft({ seg: low ? 6 : 10, up: [1, 0, 0], sections: (L.hind ? HIND : FORE).filter((_, i) => !low || i % 2 === 1 || i === 0 || i === 8).map(([u, rx, rz, a, b, w]) => ({ at: [x, y, u * kh + base], rx: rx * lg * (u > .5 ? 1.1 : 1), rz: rz * lg, bones: [name(a), name(b ?? a), w || 0] })),
      tone: (i, k, st) => i >= 6 ? C.dark : i < 3 ? shade(L.hind ? 3 : 8, k, st) : C.hide });
    B.bone(L.paw).color(C.dark).ellipsoid({ at: [.03, 0, -.01], radius: [.075 * lg, .058 * lg, .032], rings: 3, seg: 8 });
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
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(K), shown: new Float64Array(K), hp: NaN, hitAt: -Infinity, hitSide: 1,
    airWas: 0, landAt: -Infinity, landHard: 0, impactAt: -Infinity, impactK: 0, contactWas: 0, beatSeq: -1, beatAt: -Infinity, beatK: 0, deathAt: null, x: 0, y: 0, z: 0, deathDir: 1, gallop: 0, speed: 0,
    variant, frame: { kind: variant, tier: 'full', mesh: null, skin: null, boneCount: DRAGON_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false } };
}
const V = new Float64Array(K), W = new Float64Array(K);
const setVec = (o, n) => o.set(POSE_VEC[n] || POSE_VEC.idle);
function lerpVec(o, a, b, t) { const A = POSE_VEC[a], Bv = POSE_VEC[b]; for (let k = 0; k < K; k++) o[k] = A[k] + (Bv[k] - A[k]) * t; }
function lerpInto(o, b, t) { const Bv = POSE_VEC[b]; for (let k = 0; k < K; k++) o[k] += (Bv[k] - o[k]) * t; }
function phaseOf(s, id) { const m = ATTACK_MODULES[id] || {}, dur = s.phase === 'windup' ? (m.windup || .3) * (s.paced ? BOSS_PACE.windup : 1) : s.phase === 'active' ? m.active || 0 : s.phase === 'recover' ? m.recover || .3 : 0; return dur > 0 ? clamp01(1 - (Number(s.t) || 0) / dur) : 1; }
const ACT = { aim: false, aimX: 0, aimY: 0, watch: false, still: false, gallop: false, contact: 0, phase: '', beat: -1, beatK: 0, fire: 0, airTuck: 0, spinYaw: NaN };
const CONTACT = new Set(['slam', 'slamBoth', 'wingLash', 'roar', 'tailL', 'tailR', 'wingL', 'wingR', 'bite']);
function act(e, tr, now, target) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, pose = e.dragonPose;
  ACT.aim = false; ACT.watch = false; ACT.still = !!id; ACT.gallop = false; ACT.contact = 0; ACT.phase = id ? `${id}:${ph}:${pose || ''}` : 'move'; ACT.beat = -1; ACT.beatK = 0; ACT.fire = 0; ACT.airTuck = 0; ACT.spinYaw = NaN;
  const aimDir = (a) => { if (a && Math.hypot(a.x, a.y) > .01) { const l = Math.hypot(a.x, a.y); ACT.aimX = a.x / l; ACT.aimY = a.y / l; ACT.aim = true; } };
  if (!id && !pose) { setVec(V, tr.speed > .5 ? 'fly' : 'idle'); if (tr.speed > .5) setVec(V, 'idle'); ACT.watch = true; return; }
  setVec(V, POSE_VEC[pose] ? pose : 'idle');
  if (d.aim) aimDir(d.aim); else if (target) aimDir({ x: target.x - e.x, y: target.y - e.y });
  if (pose === 'fly' || pose === 'roll') ACT.still = false; // it moves under the game's strafe or roll
  if (CONTACT.has(pose)) ACT.contact = 1;
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
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}:${e.pack.phase === 'strike' ? 'strike' : ''}` : e.pack?.evade?.t > 0 ? 'evade' : dead ? 'death' : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs)) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < K; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  W.set(tr.shown);
  if (ACT.beat >= 0 && ACT.beat !== tr.beatSeq) { tr.beatSeq = ACT.beat; tr.beatAt = now; tr.beatK = ACT.beatK; } else if (ACT.beat < 0) tr.beatSeq = -1;
  if (ACT.contact && !tr.contactWas) { tr.impactAt = now; tr.impactK = /Wave|Pounce|leapSlam/.test(ACT.phase) ? 1 : .55; }
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
  const spin = Number(e.dragonSpin) || 0, rolling = e.dragonPose === 'roll' && !dead && !reduce ? t * 9 : 0; // the claw and tail spins turn it; the roll tumbles it
  setEuler(P, BI.root, yaw + spin, 0, roll + rolling); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z + air + (rolling ? .25 * S : 0));
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
  { const ci = BI.chest * 9, sc = Math.hypot(P.wr[ci], P.wr[ci + 1], P.wr[ci + 2]) || 1, sp = clamp01(W[5]), stream = tr.gallop * moving;
    const flap = reduce ? 0 : clamp01((sp - .55) / .45) * (air > .15 || W[0] > .25 ? 1 : .35), open = Math.max(sp, .22 * stream);
    for (const [tag, s] of WING_SIDES) for (let b = 0; b < WING_BONES.length; b++) {
      const [name, , , fold, face] = WING_BONES[b], bd = WING_BIND[b], beat = flap * (.62 * Math.sin(t * 9.5 - b * .5) + .1), ripple = reduce ? 0 : (1 - open) * .05 * Math.sin(t * 1.8 + b * .9 + s);
      // the direction (model frame, right side), lifted about the body's long axis by the beat
      let dx = fold[0] + (bd[0] - fold[0]) * open, dy = fold[1] + (bd[1] - fold[1]) * open, dz = fold[2] + (bd[2] - fold[2]) * open - .12 * stream * (b > 1 ? 1 : 0);
      const th = (b === 0 ? beat : beat * 1.25) + ripple, c = Math.cos(th), sn = Math.sin(th), y2 = dy * c - dz * sn; dz = dy * sn + dz * c; dy = y2;
      // the membrane faces: up when spread, outward over the flank when folded
      // so the membrane hangs down the flank when folded
      let hx = 0, hy = face * .95 * (1 - open), hz = .3 + .7 * open; const hy2 = hy * c - hz * sn; hz = hy * sn + hz * c; hy = hy2;
      wingFrame(WF, dx, s * dy, dz, 0, s * hy, hz);
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
    const fold = L.hind ? Math.max(ACT.airTuck * .7, air > .15 ? .5 : 0) : Math.max(air > .15 ? .6 : 0, W[0] > .3 ? (W[0] - .2) * 1.5 : 0);
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
    poseAnimalLeg(P, LEGBONES, H, T, LENS, cf, sf, L.hind, bend, toe, L.hind ? -.25 - .5 * bend : .1 + 1.1 * bend);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1, beat = .5 + .5 * Math.sin(t * (ACT.fire > .8 ? 22 : 6));
  F.emitK[0] = life * 1.3; F.emitK[1] = 0;
  F.emitK[2] = life * (.6 + 1.2 * Math.max(W[7], ACT.fire) + (reduce ? 0 : .2 * beat * ACT.fire)); F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 0; F.emitA[2] = W[7] > .25 || ACT.fire > .1 ? 1 : 0; F.emitA[3] = 0;
  F.tier = env.tier || 'full'; F.mesh = dragonMesh(F.tier, tr.variant); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air; F.shadow = 1 - Math.min(.6, air / (4 * S)); F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = false;
  return F;
}
export const dragonBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
