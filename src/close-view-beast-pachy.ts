// The Pachycephalosaurus in Close View (Tim, 2026-11-27): the same beast as its standard-view art (pachy-render.ts) as a solid skinned
// body on the shared beast rig (close-view-beast-rig.ts), at the Wild Stegosaurus's and the Spinosaurus's standard: one continuous hide
// lofted from the tail tip to the crown, its legs grown out of the body (each leg one loft from inside the hips to the foot), tones that
// blend (green over the top, gray beneath with a soft blend up into the green), exact side counts per tier. Four meshes, chosen by the
// foe as the Spinosaurus's hide and bone are: FLESH; ARMOR (the same body as a machine of itself: steel plating over the hide with
// seams and rivets, plated shins and feet, a banded steel dome and a red visor); FOSSIL (bone: vertebrae, ribs, the bare skull with its
// dome and knobs, embers in the sockets); and ROCK (the disguise: a boulder too round and too smooth, a pale cap ringed with knobs).
// It follows the pose contract the standard view reads (e.pachyPose, pachyAir, pachyForm, pachyShift, pachyDisguised) through the
// standard view's own pose table (PACHY_POSES), so both views agree; nothing here reads attack timing or changes the game.
// Body units u are the standard view's (a tile times the actor's scale); the root carries S = env.scale.
import { PACHY_ART, PACHY_POSES, pachyPoseName, pachyLook } from "./pachy-render.ts";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.ts";

const hex = (s) => parseInt(s.slice(1), 16);
export const PACHY_RIG = Object.freeze({
  closeViewScale: 1.2,
  hip: .66, crouchDrop: .2, femur: .31, tibia: .3, meta: .15, foot: .035, hipWidth: .14,
  walk: Object.freeze({ stride: .55, stance: .6 }),
  settle: 6, stepAt: .08, stepTime: .28, turnRate: 4.5, attackTurnRate: 10, footLift: .14, bob: .02,
  ease: 12, strikeEase: 24, deathMs: 2200, hitMs: 320, landMs: 500,
  breathe: Object.freeze({ rate: 1.6, chest: .014 }),
  // exact side counts (ring segments) per tier for the lofts: the hide, the legs, the stripe
  seg: Object.freeze({ hide: Object.freeze({ full: 16, balanced: 12, low: 8 }), leg: Object.freeze({ full: 12, balanced: 9, low: 6 }), stripe: Object.freeze({ full: 6, balanced: 5, low: 4 }) }),
});
const G0 = PACHY_RIG, A = PACHY_ART;
const KEYS = ["pitch", "head", "crouch", "tuck", "kick", "arms", "dig", "tail", "daze"], K = KEYS.length;
const KI = Object.freeze(Object.fromEntries(KEYS.map((k, i) => [k, i])));
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(PACHY_POSES).map(([n, p]) => [n, Float64Array.from(KEYS.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
// The trunk's bind spine (forward f, height u): hips at f 0, a level back, a short thick neck rising to the head; the tail straight back.
const SPINE_AT = { pelvis: [0, G0.hip + .06], spine: [.2, .72], chest: [.38, .72], neck: [.5, .76], head: [.62, .86],
  tail1: [-.2, .71], tail2: [-.42, .68], tail3: [-.64, .65], tail4: [-.84, .62], tail5: [-1.0, .6] };
// The hide's sections, tail tip to the back of the head: [f, u (centre), half width, half height, bone a, bone b, weight on b].
const BODY = [
  [-1.16, .595, .006, .006, 'tail5'], [-1.1, .597, .022, .02, 'tail5'], [-.99, .602, .038, .035, 'tail5', 'tail4', .3], [-.87, .612, .054, .05, 'tail4'],
  [-.75, .625, .07, .066, 'tail4', 'tail3', .5], [-.63, .64, .088, .084, 'tail3'], [-.51, .66, .108, .104, 'tail3', 'tail2', .5], [-.39, .68, .132, .128, 'tail2'],
  [-.27, .7, .16, .156, 'tail2', 'tail1', .5], [-.15, .715, .188, .185, 'tail1', 'pelvis', .55], [-.04, .725, .208, .205, 'pelvis'], [.07, .728, .218, .214, 'pelvis', 'spine', .4],
  [.18, .725, .214, .21, 'spine'], [.28, .722, .2, .198, 'spine', 'chest', .5], [.37, .727, .175, .175, 'chest'], [.45, .745, .14, .142, 'chest', 'neck', .5],
  [.52, .775, .112, .114, 'neck'], [.57, .808, .1, .102, 'neck', 'head', .5], [.61, .84, .098, .098, 'head'],
];
function sectionAt(f) { for (let i = 1; i < BODY.length; i++) if (BODY[i][0] >= f) { const a = BODY[i - 1], b = BODY[i], t = (f - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } return BODY[BODY.length - 1].slice(1, 4); }
const BONES = (() => {
  const W = {}, out = [], add = (name, parent, w) => { W[name] = w; const p = parent ? W[parent] : [0, 0, 0]; out.push({ name, parent, at: [w[0] - p[0], w[1] - p[1], w[2] - p[2]] }); };
  const S = (n) => [SPINE_AT[n][0], 0, SPINE_AT[n][1]];
  add('root', null, [0, 0, 0]); add('pelvis', 'root', S('pelvis')); add('spine', 'pelvis', S('spine')); add('chest', 'spine', S('chest'));
  add('neck', 'chest', S('neck')); add('head', 'neck', S('head')); add('jaw', 'head', [SPINE_AT.head[0] + .06, 0, SPINE_AT.head[1] - .07]);
  add('tail1', 'pelvis', S('tail1')); add('tail2', 'tail1', S('tail2')); add('tail3', 'tail2', S('tail3')); add('tail4', 'tail3', S('tail4')); add('tail5', 'tail4', S('tail5'));
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const hx = .02, hz = G0.hip, hy = s * G0.hipWidth;
    add('thigh' + side, 'pelvis', [hx, hy, hz]); add('shin' + side, 'thigh' + side, [hx, hy, hz - G0.femur]); add('meta' + side, 'shin' + side, [hx, hy, hz - G0.femur - G0.tibia]); add('foot' + side, 'meta' + side, [hx, hy, hz - G0.femur - G0.tibia - G0.meta]);
    add('arm' + side, 'chest', [.42, s * .1, .64]); add('fore' + side, 'arm' + side, [.47, s * .11, .55]);
  }
  add('rock', 'root', [0, 0, .32]);
  return out;
})();
export const PACHY_SKELETON = defineSkeleton(BONES);
const BI = PACHY_SKELETON.index;
const E_EYE = 1, E_VISOR = 2;
const LEGS = [{ top: 'thighL', mid: 'shinL', low: 'metaL', foot: 'footL', side: -1 }, { top: 'thighR', mid: 'shinR', low: 'metaR', foot: 'footR', side: 1 }];
const TAIL = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5'];

// ------------------------------------------------------------------------------------------------ the meshes
let PALETTE = null;
const palette = () => PALETTE ||= Object.fromEntries(Object.entries(A).filter(([, v]) => typeof v === 'string' && v[0] === '#').map(([k, v]) => [k, hex(v)]));
const lerpHex = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
const at = (bone, p) => { const i = BI[bone] * 3, w = PACHY_SKELETON.bindWorld; return [p[0] - w[i], p[1] - w[i + 1], p[2] - w[i + 2]]; };
const HEAD = SPINE_AT.head;
// The head on its bone (model offsets from the head's bind point): the skull, the dome above and behind the eye, the gray snout, the jaw.
const DOME = { f: -.01, u: .1, r: [.15, .13, .12] };
function headParts(B, C, low, full, form) {
  const bone = form === 'fossil', steel = form === 'armor', hb = (f, r, u) => at('head', [HEAD[0] + f, r, HEAD[1] + u]);
  const skull = bone ? C.bone : steel ? C.steel : C.head, dome = bone ? C.bone : steel ? C.steelLight : C.head, snout = bone ? C.boneShade : steel ? C.steelDark : C.snout;
  B.bone('head');
  B.color(skull).ellipsoid({ at: hb(.03, 0, .01), radius: [.13, .095, .1], rings: low ? 4 : 6, seg: low ? 7 : 10 });
  // the snout: a short tapering loft forward and a little down, gray (the mouth's line under it)
  const W = PACHY_SKELETON.bindWorld, h = BI.head * 3;
  B.color(snout).loft({ seg: low ? 6 : full ? 10 : 8, sections: [[.05, -.01, .08, .075], [.12, -.03, .068, .064], [.18, -.045, .052, .05], [.225, -.055, .036, .034], [.25, -.06, .016, .016], [.258, -.061, .004, .004]].map(([f, u, rx, rz]) => ({ at: [W[h] + f, 0, W[h + 2] + u], rx, rz, bones: ['head', 'head', 0] })),
    tone: (i, k, st) => st < -.35 ? (bone ? C.boneDark : C.mouth) : snout });
  // the dome: the great crown above and behind the eye, banded in the armor
  B.color(dome).ellipsoid({ at: hb(DOME.f, 0, DOME.u), radius: DOME.r, rings: low ? 5 : full ? 9 : 7, seg: low ? 8 : full ? 14 : 11 });
  if (!bone && !steel && !low) B.color(C.headLight).ellipsoid({ at: hb(DOME.f - .01, 0, DOME.u + .075), radius: [.08, .07, .05], rings: 3, seg: 8 });
  if (steel) for (const f of [-.06, .04]) B.color(C.seam).lathe({ at: hb(DOME.f + f, 0, DOME.u - .07), F: [0, 0, 1], U: [1, 0, 0], rings: [[0, .132], [.1, .1], [.17, .02]], seg: low ? 8 : 12, caps: false, rs: .2 });
  // the knobs ringing the dome (gray; rivets on the steel dome; bone on the fossil), and a few down the snout
  const nk = low ? 8 : full ? 14 : 11, knob = bone ? C.boneShade : steel ? C.rivet : C.knob;
  for (let i = 0; i < nk; i++) { const a = i / nk * Math.PI * 2, r = i % 2 ? .022 : .028;
    B.color(knob).ellipsoid({ at: hb(DOME.f + Math.cos(a) * DOME.r[0] * .95, Math.sin(a) * DOME.r[1] * .95, DOME.u - .045), radius: [r, r, r * .9], rings: 2, seg: low ? 4 : 6 }); }
  if (!low) for (let i = 0; i < 3; i++) for (const s of [-1, 1]) B.color(knob).ellipsoid({ at: hb(.13 + i * .04, s * (.05 - i * .008), .02 - i * .018), radius: [.014, .014, .012], rings: 2, seg: 4 });
  // the eyes: dark under the dome's brow; a red visor band in the armor; embers in the fossil's sockets
  for (const s of [-1, 1]) {
    if (steel) B.color(C.seam).ellipsoid({ at: hb(.085, s * .078, .03), radius: [.05, .014, .022], rings: 2, seg: 6 });
    if (bone) B.color(C.socket).ellipsoid({ at: hb(.08, s * .074, .03), radius: [.03, .018, .026], rings: 3, seg: 6 });
    B.color(steel ? C.visor : bone ? C.ember : C.eye, steel ? E_VISOR : E_EYE).ellipsoid({ at: hb(.085, s * (steel ? .088 : .082), .03), radius: steel ? [.036, .006, .01] : [.016, .01, .014], rings: 2, seg: 6 });
    if (!steel && !bone && !low) B.color(C.eyeShine).ellipsoid({ at: hb(.09, s * .09, .036), radius: [.004, .003, .004], rings: 2, seg: 4 });
  }
  // the lower jaw (opens on the jaw bone): gray, the mouth's dark inside on it
  const J = BI.jaw * 3; B.bone('jaw');
  B.color(snout).loft({ seg: low ? 6 : 8, sections: [[0, 0, .06, .03], [.07, -.004, .052, .026], [.13, -.008, .036, .018], [.17, -.008, .02, .01], [.185, -.007, .005, .004]].map(([f, u, rx, rz]) => ({ at: [W[J] + f, 0, W[J + 2] + u], rx, rz, bones: ['jaw', 'jaw', 0] })),
    tone: (i, k, st) => st > .3 ? (bone ? C.boneDark : C.mouth) : snout });
}
// The black stripe: a thin ridge along the top of the hide, from the crown down the neck and back to the tail tip.
function stripe(B, C, tier) {
  const rows = [];
  for (const [f, u, , rz, a, b, w] of BODY) rows.push({ at: [f, 0, u + rz * .96], rx: Math.min(.034, .006 + rz * .2), rz: Math.min(.012, .003 + rz * .05), bones: [a, b ?? a, w || 0] });
  rows.push({ at: [HEAD[0] - .03, 0, HEAD[1] + DOME.u + DOME.r[2] * .9], rx: .03, rz: .012, bones: ['head', 'head', 0] }, { at: [HEAD[0] + .02, 0, HEAD[1] + DOME.u + DOME.r[2] * .98], rx: .02, rz: .01, bones: ['head', 'head', 0] }, { at: [HEAD[0] + .05, 0, HEAD[1] + DOME.u + DOME.r[2] * .9], rx: .004, rz: .004, bones: ['head', 'head', 0] });
  B.color(C.stripe).loft({ seg: G0.seg.stripe[tier], minSeg: 4, sections: rows });
}
// The legs: each one loft grown out of the body (from inside the hips) through the thigh and shin to the foot, then a foot with three
// claws; rows: [u below the hip, half width, half height, bone code (p pelvis, t thigh, m shin, l metatarsus), bone b, weight].
const LEG = [[.18, .13, .2, 'p'], [.08, .15, .21, 'p', 't', .5], [-.03, .145, .19, 't'], [-.13, .115, .15, 't'], [-.24, .085, .1, 't', 'm', .5], [-.35, .064, .072, 'm'], [-.48, .052, .058, 'm'], [-.58, .048, .052, 'm', 'l', .5], [-.67, .043, .046, 'l'], [-.75, .046, .046, 'l']];
function legs(B, C, tier, form) {
  const low = tier === 'low', bone = form === 'fossil', steel = form === 'armor';
  for (const L of LEGS) {
    const W = PACHY_SKELETON.bindWorld, t = BI[L.top] * 3, x = W[t], y = W[t + 1], z = W[t + 2], name = (c) => c === 'p' ? 'pelvis' : c === 't' ? L.top : c === 'm' ? L.mid : L.low;
    const rows = (low ? LEG.filter((_, i) => i % 2 === 0 || i === LEG.length - 1) : LEG).map(([u, rx, rz, a, b, w]) => bone ? [u, rx * .28, rz * .28, a, b, w] : [u, rx, rz, a, b, w]);
    B.color(bone ? C.bone : steel ? C.steel : C.body).loft({ seg: G0.seg.leg[tier], up: [1, 0, 0], sections: (bone ? rows.slice(2) : rows).map(([u, rx, rz, a, b, w]) => ({ at: [x, y, z + u], rx, rz, bones: [name(a), name(b ?? a), w || 0] })),
      tone: bone ? undefined : (i, k, st) => steel ? lerpHex(C.steel, C.steelDark, Math.max(0, -st) * .6) : lerpHex(lerpHex(C.body, C.belly, smooth(clamp01((.15 - st) / .9)) * .85), C.bodyDark, i / rows.length * .35) });
    if (bone) for (const n of [L.mid, L.low]) B.bone(n).color(C.boneShade).ellipsoid({ at: [0, 0, 0], radius: [.035, .035, .035], rings: 2, seg: 5 });
    if (steel) { // plating: a knee cap and a shin guard, the foot plated
      B.bone(L.mid).color(C.steelLight).ellipsoid({ at: [.06, 0, 0], radius: [.06, .07, .06], rings: 3, seg: low ? 6 : 8 });
      B.bone(L.mid).color(C.steelDark).slab({ at: [.05, 0, -.13], F: [0, 0, 1], U: [1, 0, 0], points: [[-.12, 0], [.12, 0], [.1, .05], [-.1, .05]], thick: .09 });
      if (!low) for (const u of [-.06, -.2]) B.bone(L.mid).color(C.rivet).ellipsoid({ at: [.1, 0, u], radius: [.012, .012, .012], rings: 2, seg: 4 });
    }
    B.bone(L.foot).color(bone ? C.boneShade : steel ? C.steelDark : C.bodyDark).ellipsoid({ at: [.04, 0, .01], radius: [.1, .06, .03], rings: 3, seg: low ? 6 : 8 });
    for (let c = 0; c < 3; c++) { const s = c - 1; B.color(C.claw).lathe({ at: [.12, s * .03, .01], F: [1, s * .3, -.3], rings: [[0, .014], [.05, .002]], seg: low ? 3 : 4, caps: false }); }
  }
  // the little arms: a short loft on each arm, three small claws
  for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', a = BI['arm' + tag] * 3, f = BI['fore' + tag] * 3, W = PACHY_SKELETON.bindWorld;
    B.color(bone ? C.bone : steel ? C.steel : C.body).loft({ seg: low ? 5 : 7, sections: [[W[a] - .04, W[a + 2] + .04, .05], [W[a], W[a + 2], .042], [W[f], W[f + 2], .03], [W[f] + .04, W[f + 2] - .05, .022]].map(([x, z, r], i) => ({ at: [x, W[a + 1] + s * (i ? .01 : 0), z], rx: bone ? r * .4 : r, rz: bone ? r * .4 : r, bones: [i < 2 ? 'arm' + tag : 'fore' + tag, i < 2 ? 'arm' + tag : 'fore' + tag, 0] })) });
    B.bone('fore' + tag); for (let c = 0; c < 2; c++) B.color(C.claw).lathe({ at: at('fore' + tag, [W[f] + .04, W[f + 1] + (c - .5) * .02, W[f + 2] - .05]), F: [.5, 0, -.8], rings: [[0, .01], [.035, 0]], seg: 3, caps: false }); }
}
function buildMesh(tier, form) {
  const C = palette(), B = meshBuilder(PACHY_SKELETON, TIER_DETAIL[tier]), low = tier === 'low', full = tier === 'full', bone = form === 'fossil', steel = form === 'armor';
  if (form === 'rock') { // the disguise: one boulder, too round and too smooth, a pale cap ringed with knobs, a smear of moss
    B.bone('rock').color(C.rock).ellipsoid({ at: [0, 0, 0], radius: [.5, .42, .34], rings: low ? 5 : 8, seg: low ? 9 : 14 });
    B.color(C.rockDark).ellipsoid({ at: [.03, .02, -.2], radius: [.47, .4, .16], rings: low ? 3 : 4, seg: low ? 9 : 14 });
    B.color(C.rockCap).ellipsoid({ at: [.1, 0, .3], radius: [.25, .23, .16], rings: low ? 3 : 5, seg: low ? 8 : 12 });
    for (let i = 0; i < (low ? 7 : 11); i++) { const a = i / (low ? 7 : 11) * Math.PI * 2; B.color(C.knob).ellipsoid({ at: [.1 + Math.cos(a) * .25, Math.sin(a) * .23, .31], radius: [.045, .045, .04], rings: 2, seg: 5 }); }
    if (!low) B.color(C.rockLight).ellipsoid({ at: [-.25, -.3, .18], radius: [.16, .1, .06], rings: 3, seg: 8 });
    B.color(C.moss).ellipsoid({ at: [-.35, .25, .05], radius: [.16, .14, .1], rings: 3, seg: 7 });
    return B.done();
  }
  if (bone) {
    // the column: a vertebra on every section from the tail tip to the neck, joined by a thin bone; ribs off the trunk; the pelvis
    for (let i = 1; i < BODY.length; i++) { const [f, u, rx, rz, a, b, w] = BODY[i], bn = (w || 0) >= .5 && b ? b : a, r = Math.max(.02, Math.min(.06, rz * .32));
      B.bone(bn).color(i % 2 ? C.boneShade : C.bone).ellipsoid({ at: at(bn, [f, 0, u + rz * .55]), radius: [r * .9, r * 1.2, r * 1.1], rings: 2, seg: low ? 5 : 6 }); void rx; }
    B.color(C.bone).loft({ seg: low ? 4 : 5, minSeg: 4, sections: BODY.slice(1).map(([f, u, , rz, a, b, w]) => ({ at: [f, 0, u + rz * .55], rx: .018, rz: .018, bones: [a, b ?? a, w || 0] })) });
    for (const [f, bn] of [[.02, 'pelvis'], [.12, 'pelvis'], [.2, 'spine'], [.28, 'spine'], [.36, 'chest']].filter((_, i) => !low || i % 2 === 0)) for (const s of [-1, 1]) {
      const [u, rx, rz] = sectionAt(f), pts = [[f, s * .02, u + rz * .5], [f + .02, s * rx * .9, u + rz * .1], [f + .04, s * rx * .75, u - rz * .55], [f + .06, s * .03, u - rz * .85]];
      B.color(C.boneShade).loft({ seg: 4, minSeg: 3, sections: pts.map((p, j) => ({ at: p, rx: .012, rz: .012, bones: [bn, bn, 0] })) }); }
    B.bone('pelvis').color(C.bone).ellipsoid({ at: at('pelvis', [0, 0, .68]), radius: [.14, .12, .07], rings: low ? 3 : 4, seg: low ? 6 : 8 });
    // the tail's chevrons, a few
    if (!low) for (const n of ['tail2', 'tail3']) B.bone(n).color(C.boneShade).lathe({ at: [0, 0, -.02], F: [-.3, 0, -1], rings: [[0, .016], [.08, .004]], seg: 3, caps: false });
  } else {
    // the hide: one loft from the tail tip to the back of the head. Green over the top (lighter along the back), gray beneath with a
    // soft blend up into the green, a few gray markings along the flank; the armor: steel, darker below, with plate seams
    const tone = (i, k, st) => {
      if (steel) { let c = lerpHex(C.steel, C.steelDark, smooth(clamp01((.1 - st) / .9)) * .8); if (st > .45) c = lerpHex(c, C.steelLight, (st - .45) * 1.2); if (i % 3 === 0 && i > 3 && i < BODY.length - 3) c = lerpHex(c, C.seam, .55); return c; }
      let c = lerpHex(C.body, C.bodyLight, Math.max(0, st - .3) * .9);
      c = lerpHex(c, C.belly, smooth(clamp01((.2 - st) / .75)));
      if (st > -.1 && st < .45 && (i * 7 + k * 3) % 11 === 0 && i > 2) c = lerpHex(c, C.knob, .55);
      return c;
    };
    B.color(steel ? C.steel : C.body).loft({ seg: G0.seg.hide[tier], sections: BODY.map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx: rx * (steel ? 1.03 : 1), rz: rz * (steel ? 1.03 : 1), bones: [a, b ?? a, w || 0] })), tone });
    if (!steel) stripe(B, C, tier);
    if (steel) { // the plating: back plates on each trunk bone (overlapping slabs, their edges seamed), rivets along them, collar plates
      // steel bands round the body, each on its own bone, a rivet line along each band's edge, and a steel ridge down the back
      const bands = [[-.7, 'tail3'], [-.5, 'tail2'], [-.3, 'tail1'], [-.1, 'pelvis'], [.1, 'pelvis'], [.28, 'spine']];
      for (const [f, bn] of bands.filter((_, i) => !low || i % 2 === 1)) { const [u, rx, rz] = sectionAt(f), r = Math.max(rx, rz) * 1.08;
        B.bone(bn).color(C.steelDark).lathe({ at: at(bn, [f - .04, 0, u]), F: [1, 0, 0], U: [0, 0, 1], rings: [[0, r * .97], [.015, r], [.07, r * 1.01], [.085, r * .97]], seg: G0.seg.hide[tier], caps: false, rs: rz / rx });
        if (full) for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .45; B.color(C.rivet).ellipsoid({ at: at(bn, [f + .03, Math.sin(a) * rx * 1.12, u + Math.cos(a) * rz * 1.12]), radius: [.01, .01, .01], rings: 2, seg: 4 }); } }
      B.color(C.steelLight).loft({ seg: 4, minSeg: 4, sections: BODY.slice(2, -2).map(([f, u, , rz, a, b, w]) => ({ at: [f, 0, u + rz * 1.02], rx: .018, rz: .03 + rz * .08, bones: [a, b ?? a, w || 0] })) });
      B.bone('chest').color(C.steelDark).lathe({ at: at('chest', [.45, 0, .745]), F: [1, 0, .35], rings: [[0, .16], [.05, .155]], seg: G0.seg.hide[tier], caps: false, rs: .9 });
      B.color(C.gold).lathe({ at: at('chest', [.47, 0, .752]), F: [1, 0, .35], rings: [[0, .148], [.012, .146]], seg: G0.seg.hide[tier], caps: false, rs: .9 });
    }
  }
  headParts(B, C, low, full, form);
  legs(B, C, tier, form);
  return B.done();
}
const MESHES = new Map();
function meshFor(tier, form) { const k = `${form}:${tier}`; let m = MESHES.get(k); if (!m) { m = buildMesh(tier, form); MESHES.set(k, m); } return m; }
// The mesh a foe shows: the rock while it lies disguised, else its form (the armor once its plating has mostly closed, the bone once its
// flesh has mostly fallen: pachy-render.ts pachyLook, both views agreeing).
export function pachyCloseForm(e) { return e?.pachyDisguised && !e?.dead ? 'rock' : pachyLook(e).form; }
export function pachyMesh(tier = 'full', e = null) { return meshFor(tier, pachyCloseForm(e)); }
export const pachyFormMesh = (tier, form) => meshFor(tier, form);

// ------------------------------------------------------------------------------------------------ the track
export function createPachyTrack() {
  return {
    pose: createPose(PACHY_SKELETON),
    gait: createGait(LEGS.map((L, k) => ({ side: L.side * G0.hipWidth, fore: .02, phase: k * .5 }))),
    v: new Float64Array(K), poseName: '', poseAt: -Infinity, yaw: NaN, at: NaN, hp: NaN, hitAt: -Infinity, hitSide: 1, airWas: 0, landAt: -Infinity, landHard: 0, deathAt: null, deathDir: 1, x: 0, y: 0, z: 0,
    frame: { kind: 'pachy', tier: 'full', mesh: null, skin: null, boneCount: PACHY_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
const H = new Float64Array(3), T = new Float64Array(3), LEGBONES = new Int16Array(4), LENS = new Float64Array(3), TMP = [0, 0, 0], TV = new Float64Array(K);
export function samplePachy(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = PACHY_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, form = pachyCloseForm(e);
  const name = dead ? 'dead' : pachyPoseName(e) || 'idle';
  if (name !== tr.poseName) { tr.poseName = name; tr.poseAt = now; }
  const want = POSE_VEC[name] || POSE_VEC.idle; for (let k = 0; k < K; k++) TV[k] = want[k];
  const rate = /kick|slam|butt|clash|charge|bonk/.test(name) ? G.strikeEase : G.ease, V = tr.v, first = !Number.isFinite(tr.yaw);
  for (let k = 0; k < K; k++) V[k] = first || reduce || !(dt > 0) ? TV[k] : V[k] + (TV[k] - V[k]) * Math.min(1, dt * rate);
  const air = dead || form === 'rock' ? 0 : Math.max(0, Number(e.pachyAir) || 0);
  // facing: where its move aims; else where it goes; standing, the Wayfarer
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let aim = tr.yaw;
  if (e.pachyHeading && Math.hypot(e.pachyHeading.x, e.pachyHeading.y) > .01) aim = Math.atan2(e.pachyHeading.y, e.pachyHeading.x);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) aim = Math.atan2(dy, dx);
  else if (env.target && !dead) { const tx = env.target.x - x, ty = env.target.y - y; if (Math.hypot(tx, ty) > .3) aim = Math.atan2(ty, tx); }
  if (!Number.isFinite(aim)) aim = e.facingX < 0 ? Math.PI : 0;
  if (first) tr.yaw = aim;
  if (!dead && form !== 'rock') { const delta = Math.atan2(Math.sin(aim - tr.yaw), Math.cos(aim - tr.yaw)), attacking = !!e.pack?.attack || !!e.pachyPose; tr.yaw += Math.max(-1, Math.min(1, dt * (attacking ? G.attackTurnRate : G.turnRate))) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.hitSide = Math.sign((px - x) * -sf + (py - y) * cf) || 1; }
  tr.hp = e.hp;
  if (tr.airWas > .1 && air <= .1) { tr.landAt = now; tr.landHard = Math.min(1, tr.airWas / 2 + .3); }
  tr.airWas = air;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 16, 10) : 0, landT = (now - tr.landAt) / 1000, land = landT < G.landMs / 1000 ? Math.max(0, kick(landT, 8, 6)) * tr.landHard : 0;
  const daze = V[KI.daze] > 0 && !reduce ? V[KI.daze] * Math.sin(t * 7) : 0;
  for (let k = 0; k < 2; k++) { tr.gait.side[k] = LEGS[k].side * G.hipWidth * S; tr.gait.fore[k] = .02 * S; }
  const still = (!!e.pack?.attack && name !== 'walk') || air > .1 || dead || form === 'rock' || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.walk.stride * S, stance: G.walk.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime, maxStepping: 1 });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  // ------------------------------------------------------------------ the trunk, tail and head
  resetPose(P);
  let alpha = e.fleeFade != null ? clamp01(e.fleeFade) : 1, roll = 0;
  if (dead) { const side = smooth((death - .2) / .35); roll = 1.35 * side * tr.deathDir; alpha *= 1 - clamp01((death - .82) / .18);
    if (death < 1e-9) { const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.deathDir = (px - x) * -sf + (py - y) * cf > 0 ? -1 : 1; } }
  setEuler(P, BI.root, yaw, 0, roll); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z + air);
  const bob = moving * G.bob * (.5 - .5 * Math.cos(cyc * 2)), breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe.rate / 3), pitch = V[KI.pitch] + daze * .06;
  setOffset(P, BI.pelvis, 0, reduce ? 0 : moving * .015 * Math.sin(cyc), -V[KI.crouch] * G.crouchDrop - bob - .04 * Math.abs(hit) - .07 * land - (dead ? .3 * smooth(death / .3) : 0));
  setEuler(P, BI.pelvis, reduce ? 0 : -moving * .05 * Math.sin(cyc), -pitch, daze * .05); resolveBone(P, BI.pelvis);
  const look = env.target && !dead ? (() => { const a = Math.atan2(env.target.y - y, env.target.x - x) - yaw; return Math.max(-.6, Math.min(.6, Math.atan2(Math.sin(a), Math.cos(a)))) * .5; })() : 0;
  setEuler(P, BI.spine, 0, 0, 0); resolveBone(P, BI.spine);
  setEuler(P, BI.chest, 0, -.02 * land, 0); P.scl[BI.chest] = 1 + breathe * G.breathe.chest; resolveBone(P, BI.chest);
  const head = V[KI.head] + .3 * hit;
  setEuler(P, BI.neck, look * .4, -head * .45, 0); resolveBone(P, BI.neck);
  setEuler(P, BI.head, look * .3 + (reduce ? 0 : .02 * wobble(t * .7, 4)), -head * .45, -hit * .2 * tr.hitSide + daze * .1); resolveBone(P, BI.head);
  const open = name === 'burst' || name === 'feed' ? .45 : name === 'skullReady' || name === 'slamRaise' ? .25 : dead ? .2 : 0, chew = name === 'feed' && !reduce ? .25 * Math.max(0, Math.sin(t * 8)) : 0;
  setEuler(P, BI.jaw, 0, .5 * clamp01(open + chew), 0); resolveBone(P, BI.jaw);
  for (let i = 0; i < TAIL.length; i++) { const w = (i + 1) / TAIL.length, sw = reduce ? 0 : (.06 * Math.sin(t * 1.6 - i * .6) * w + moving * .05 * Math.sin(cyc + i * .5));
    setEuler(P, BI[TAIL[i]], sw, V[KI.tail] * (i < 2 ? .25 : .12) + (i === 0 ? pitch * .8 : 0) - .03 * land, 0); resolveBone(P, BI[TAIL[i]]); }
  for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', r = V[KI.arms]; setEuler(P, BI['arm' + tag], s * .1 * r, -.9 * r + (reduce ? 0 : .05 * Math.sin(t * 2 + s)), 0); resolveBone(P, BI['arm' + tag]); setEuler(P, BI['fore' + tag], 0, -.5 * r, 0); resolveBone(P, BI['fore' + tag]); }
  P.scl[BI.rock] = form === 'rock' ? 1 : .001; setOffset(P, BI.rock, 0, 0, reduce ? 0 : .01 * Math.sin(t * 1.3)); resolveBone(P, BI.rock);
  // ------------------------------------------------------------------ the legs
  for (let k = 0; k < 2; k++) {
    const L = LEGS[k], top = BI[L.top], hi = top * 3, len = (G.femur + G.tibia + G.meta) * S;
    resolveBone(P, top); H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    const lift = tr.gait.out[k * 4 + 2]; let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], fz = env.z + (G.foot + .01) * S + lift * G.footLift * S;
    const bodyAt = (f, u, w) => { const p = boneLocalToWorld(P, 'pelvis', f, L.side * G.hipWidth, u, TMP); fx += (p[0] - fx) * w; fy += (p[1] - fy) * w; fz += (p[2] - fz) * w; };
    const ju = PACHY_SKELETON.bindWorld[hi + 2] - PACHY_SKELETON.bindWorld[BI.pelvis * 3 + 2];
    if (air > .1) bodyAt(.04, ju - len / S * .85, 1);
    const kk = V[KI.kick] * L.side; if (kk > .01) bodyAt(.5, ju - .18, kk); if (kk < -.01) bodyAt(-.18, ju - len / S * .7, -kk * .6);
    if (V[KI.tuck] > .01) bodyAt(.14, ju - len / S * .5, V[KI.tuck]);
    if (dead) { const p = boneLocalToWorld(P, 'root', .02, L.side * .18, G.foot + .12 * smooth(death / .3), T); fx = p[0]; fy = p[1]; fz = p[2]; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    const fold = Math.max(V[KI.tuck], Math.abs(kk)), bend = Math.min(1, lift * .9 + fold * .8), toe = lift > 0 || fold > .05 ? -.5 * Math.max(lift, fold) : 0;
    LEGBONES[0] = top; LEGBONES[1] = BI[L.mid]; LEGBONES[2] = BI[L.low]; LEGBONES[3] = BI[L.foot];
    LENS[0] = G.femur * S; LENS[1] = G.tibia * S; LENS[2] = G.meta * S;
    poseAnimalLeg(P, LEGBONES, H, T, LENS, cf, sf, true, bend, toe, -.35 - .5 * bend); // a biped's digitigrade leg: the metatarsus slopes back
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1, angry = !!e.pack?.attack || !!e.pachyPose;
  F.emitK[0] = form === 'fossil' ? life * (1.4 + (reduce ? 0 : .2 * Math.sin(t * 3))) : life * (angry ? 1.2 : 1); F.emitK[1] = form === 'armor' ? life * (1.3 + (reduce ? 0 : .25 * Math.sin(t * 6))) : 0; F.emitK[2] = 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = meshFor(F.tier, form); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air; F.shadow = form === 'rock' ? .8 : 1 - Math.min(.6, air / (3 * S)); F.phase = name; F.contact = 0; F.cloud = false;
  return F;
}
export const pachyBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
