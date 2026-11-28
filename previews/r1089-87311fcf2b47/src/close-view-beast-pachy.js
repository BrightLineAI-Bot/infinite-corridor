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
import { PACHY_ART, PACHY_POSES, PACHY_DAZE_ART, pachyPoseName, pachyLook, pachyDazeLeft } from "./pachy-render.js?v=r1089-87311fcf2b47";
import { PACHY_ECHO } from "./echoes.js?v=r1089-87311fcf2b47"; // Dome Rush's Earth Golem (drawPachyGolemClose)
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r1089-87311fcf2b47";

const hex = (s) => parseInt(s.slice(1), 16);
export const PACHY_RIG = Object.freeze({
  closeViewScale: 1.2,
  hip: .66, crouchDrop: .2, femur: .31, tibia: .3, meta: .15, foot: .035, hipWidth: .09,
  walk: Object.freeze({ stride: .55, stance: .6 }),
  settle: 6, stepAt: .08, stepTime: .28, turnRate: 4.5, attackTurnRate: 10, footLift: .14, bob: .02,
  ease: 12, strikeEase: 24, deathMs: 2200, hitMs: 320, landMs: 500,
  breathe: Object.freeze({ rate: 1.6, chest: .014 }),
  // exact side counts (ring segments) per tier for the lofts: the hide, the legs, the stripe
  seg: Object.freeze({ hide: Object.freeze({ full: 20, balanced: 14, low: 8 }), leg: Object.freeze({ full: 14, balanced: 10, low: 6 }), stripe: Object.freeze({ full: 6, balanced: 5, low: 4 }) }),
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
// The head continues the same hide (no seam at the throat): the skull under the dome, then the gray snout tapering to its tip.
const HEAD_ROWS = [[.66, .855, .1, .098, 'head'], [.71, .85, .09, .088, 'head'], [.76, .836, .074, .07, 'head'], [.805, .818, .058, .054, 'head'],
  [.845, .804, .042, .038, 'head'], [.872, .796, .025, .022, 'head'], [.888, .792, .009, .008, 'head'], [.892, .792, 0, 0, 'head']];
const HIDE = BODY.concat(HEAD_ROWS);
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
// Paint markers: parts built in one of these colours are painted afterwards (paintMesh) by one skin function of bind-space position and
// normal, so the hide, the head, the legs and the arms share one continuous colouring across every join (no part reads stuck on).
const MARK = Object.freeze({ hide: 0x010203, dome: 0x010204, rock: 0x010205 });
const sm = (a, b, x) => smooth(clamp01((x - a) / (b - a)));
// The flesh's skin at a bind-space point p (f, r, u) with normal n: green over the top (lighter along the back), gray beneath with a soft
// blend up into the green, gray markings on the flanks; the head yellow from behind the eye, the snout and mouth gray; the feet darker.
function fleshSkin(C, p, n) {
  const [f, r, u] = p, nz = n[2];
  let c = lerpHex(C.body, C.bodyLight, sm(.45, .95, nz) * .55 * sm(.6, .7, u));
  const inner = r * n[1] < 0 && u < .62 ? sm(.2, .8, -Math.sign(r) * n[1]) * .3 : 0; // the inside of the thighs a little paler
  c = lerpHex(c, C.belly, Math.max(sm(-.04, -.62, nz) * (u > .5 ? 1 : .25 + .75 * sm(.3, .5, u)), inner) * .92); // the legs keep their green below the belly
  const blot = Math.sin(f * 29 + u * 11) * Math.sin(f * 17 - u * 23 + Math.abs(r) * 9); // soft gray markings, continuous in space
  if (f < .5 && Math.abs(f) > .2 && u > .45 && Math.abs(nz) < .6 && blot > .55) c = lerpHex(c, C.knob, sm(.55, .85, blot) * .55);
  c = lerpHex(c, C.bodyDark, sm(.2, .04, u) * .7); // the feet
  // the head: yellow from the back of the skull (the throat stays gray), the snout gray, the mouth's line darker
  const head = sm(.57, .64, f) * (nz > -.35 ? 1 : .25);
  if (head > 0) c = lerpHex(c, lerpHex(C.head, C.headLight, sm(.5, 1, nz) * .5), head);
  const snout = sm(.79, .84, f) * (nz > -.2 ? 1 : 0) + sm(.72, .78, f) * (nz <= -.2 ? 1 : 0); if (snout > 0) c = lerpHex(c, C.snout, snout);
  if (f > .7 && nz < -.25) c = lerpHex(c, C.mouth, sm(-.25, -.6, nz) * sm(.7, .76, f));
  return c;
}
function steelSkin(C, p, n) {
  const [f, , u] = p, nz = n[2];
  let c = lerpHex(C.steel, C.steelLight, sm(.45, .95, nz) * .5);
  c = lerpHex(c, C.steelDark, sm(.05, -.65, nz) * .9);
  if (f > .74) c = lerpHex(c, C.steelDark, sm(.74, .79, f) * .85); // the muzzle plate
  c = lerpHex(c, C.steelDark, .16); // the plates a shade darker than their lit lips
  return lerpHex(c, C.steelDark, sm(.22, .05, u) * .5);
}
function domeSkin(C, p, n, steel) {
  const nz = n[2];
  if (steel) return lerpHex(lerpHex(C.steelDark, C.steel, sm(-.3, .2, nz)), C.steelLight, sm(.5, .95, nz));
  return lerpHex(lerpHex(C.headDark, C.head, sm(-.4, .15, nz)), C.headLight, sm(.55, .95, nz) * .8);
}
function rockSkin(C, p, n) {
  const [f, r, u] = p, nz = n[2];
  let c = lerpHex(C.rockDark, C.rock, sm(-.5, .1, nz));
  c = lerpHex(c, C.rockLight, sm(.4, .9, nz - n[1] * .4 - n[0] * .2) * .6);
  const moss = Math.sin(f * 7 + 1.3) * Math.sin(r * 6 - .4); if (moss > .6 && u < .3) c = lerpHex(c, C.moss, sm(.6, .9, moss) * .5);
  return c;
}
function paintMesh(m, C, form) {
  const P = m.positions, N = m.normals, K = m.colors, mk = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
  const H = mk(MARK.hide), D = mk(MARK.dome), R = mk(MARK.rock), eq = (i, q) => Math.abs(K[i] - q[0]) < 1e-3 && Math.abs(K[i + 1] - q[1]) < 1e-3 && Math.abs(K[i + 2] - q[2]) < 1e-3;
  for (let i = 0; i < m.vertexCount; i++) { const j = i * 3, p = [P[j], P[j + 1], P[j + 2]], n = [N[j], N[j + 1], N[j + 2]];
    const h = eq(j, H) ? (form === 'armor' ? steelSkin(C, p, n) : fleshSkin(C, p, n)) : eq(j, D) ? domeSkin(C, p, n, form === 'armor') : eq(j, R) ? rockSkin(C, p, n) : null;
    if (h != null) { K[j] = ((h >> 16) & 255) / 255; K[j + 1] = ((h >> 8) & 255) / 255; K[j + 2] = (h & 255) / 255; } }
  return m;
}
// The head on its bone (model offsets from the head's bind point): the skull and snout are the hide itself; here the dome above and
// behind the eye, its knobs, the eyes and the jaw.
const DOME = { f: .03, u: .075, r: [.16, .112, .105], F: [1, 0, -.32] };
// The dome's top at a forward offset df from its centre (its outline in the mid plane, tilted along DOME.F).
function domeTop(df) {
  const l = Math.hypot(...DOME.F), cf = DOME.F[0] / l, sf = DOME.F[2] / l; let best = -1, near = Infinity;
  for (let i = 0; i <= 96; i++) { const t = i / 96 * Math.PI, a = Math.cos(t) * DOME.r[0], c = Math.sin(t) * DOME.r[2], x = a * cf - c * sf, z = a * sf + c * cf, d = Math.abs(x - df); if (d < near) { near = d; best = z; } }
  return best;
}
function headParts(B, C, low, full, form) {
  const bone = form === 'fossil', steel = form === 'armor', hb = (f, r, u) => at('head', [HEAD[0] + f, r, HEAD[1] + u]);
  const W = PACHY_SKELETON.bindWorld;
  B.bone('head');
  if (bone) { // the bare skull and its beak (the fossil has no hide)
    B.color(C.bone).ellipsoid({ at: hb(.04, 0, .0), radius: [.12, .085, .085], rings: low ? 4 : 6, seg: low ? 7 : 10 });
    const h = BI.head * 3;
    B.color(C.boneShade).loft({ seg: low ? 6 : full ? 10 : 8, sections: HEAD_ROWS.slice(2).map(([f, u, rx, rz]) => ({ at: [f, 0, u], rx: rx * .85, rz: rz * .85, bones: ['head', 'head', 0] })), tone: (i, k, st) => st < -.35 ? C.boneDark : C.boneShade }); void h;
  }
  // the dome: the great crown above and behind the eye, banded in the armor
  B.color(bone ? C.bone : MARK.dome).ellipsoid({ at: hb(DOME.f, 0, DOME.u), F: DOME.F, radius: DOME.r, rings: low ? 5 : full ? 9 : 7, seg: low ? 8 : full ? 14 : 11 });
  if (steel) { // the steel dome: a seamed rim band and a raised crest from the nape to the brow
    B.color(C.steelLight).loft({ seg: 4, minSeg: 4, sections: [[-.14, .018, .01], [-.08, .022, .014], [-.01, .022, .014], [.06, .016, .01], [.1, .004, .004]].map(([df, rx, rz]) => ({ at: [HEAD[0] + DOME.f + df, 0, HEAD[1] + DOME.u + domeTop(df) - .004], rx, rz, bones: ['head', 'head', 0] })) }); }
  // the knobs ringing the dome's rim, larger round the back of the skull (gray; rivets on the steel dome; bone on the fossil), a few down the snout
  const nk = low ? 8 : full ? 14 : 11, knob = bone ? C.boneShade : steel ? C.rivet : C.knob;
  for (let i = 0; i < nk; i++) { const a = i / nk * Math.PI * 2; if (Math.cos(a) > .55) continue; const back = Math.max(0, -Math.cos(a)), r = (i % 2 ? .02 : .025) + back * .01;
    B.color(knob).ellipsoid({ at: hb(DOME.f + Math.cos(a) * DOME.r[0] * .93, Math.sin(a) * DOME.r[1] * .93, DOME.u - .045 - Math.cos(a) * DOME.r[0] * .93 * .3 - back * .01), radius: [r, r, r * .85], rings: low ? 2 : 3, seg: low ? 4 : 6 }); }
  if (!low) for (let i = 0; i < 3; i++) for (const s of [-1, 1]) B.color(knob).ellipsoid({ at: hb(.17 + i * .04, s * (.05 - i * .01), -.002 - i * .014), radius: [.016, .016, .013], rings: 2, seg: 4 });
  // the eyes: dark under the dome's brow; a red visor band in the armor; embers in the fossil's sockets
  for (const s of [-1, 1]) {
    if (steel) B.color(C.seam).ellipsoid({ at: hb(.095, s * .079, .018), radius: [.05, .014, .02], rings: 2, seg: 6 });
    if (bone) B.color(C.socket).ellipsoid({ at: hb(.09, s * .068, .02), radius: [.03, .018, .026], rings: 3, seg: 6 });
    B.color(steel ? C.visor : bone ? C.ember : C.eye, steel ? E_VISOR : E_EYE).ellipsoid({ at: steel || bone ? hb(.095, s * (steel ? .088 : .074), .02) : hb(.125, s * .077, -.014), radius: steel ? [.036, .006, .01] : bone ? [.017, .01, .014] : [.02, .012, .017], rings: 2, seg: 6 });
    if (!steel && !bone && !low) B.color(C.eyeShine).ellipsoid({ at: hb(.13, s * .088, -.008), radius: [.004, .003, .004], rings: 2, seg: 4 });
  }
  // the lower jaw (opens on the jaw bone): gray, the mouth's dark inside on it
  const J = BI.jaw * 3; B.bone('jaw');
  B.color(bone ? C.boneShade : steel ? C.steelDark : C.snout).loft({ seg: low ? 6 : 8, sections: [[-.02, .01, .07, .035], [.05, -.002, .06, .03], [.12, -.008, .045, .022], [.17, -.008, .026, .013], [.19, -.006, .006, .005]].map(([f, u, rx, rz]) => ({ at: [W[J] + f, 0, W[J + 2] + u], rx, rz, bones: ['jaw', 'jaw', 0] })),
    tone: (i, k, st) => st > .3 ? (bone ? C.boneDark : C.mouth) : (bone ? C.boneShade : steel ? C.steelDark : lerpHex(C.snout, C.belly, .3)) });
}
// The black stripe: a thin ridge along the top of the hide, from the crown down the neck and back to the tail tip.
function stripe(B, C, tier) {
  const rows = [];
  for (const [f, u, , rz, a, b, w] of BODY.filter((q) => q[0] < .55)) rows.push({ at: [f, 0, u + rz * .96], rx: Math.min(.026, .006 + rz * .16), rz: Math.min(.011, .003 + rz * .05), bones: [a, b ?? a, w || 0] });
  // up the back of the dome and over its crown (the dome is tilted forward: its top falls toward the snout) to the brow
  for (const [df, rx, rz, w] of [[-.11, .024, .008, .75], [-.07, .022, .008, 1], [-.01, .017, .007, 1], [.04, .008, .005, 1], [.065, .003, .003, 1]]) rows.push({ at: [HEAD[0] + DOME.f + df, 0, HEAD[1] + DOME.u + domeTop(df) - .006], rx, rz: rz + .002, bones: ['neck', 'head', w] });
  B.color(C.stripe).loft({ seg: G0.seg.stripe[tier], minSeg: 4, sections: rows });
}
// The legs: each one loft grown out of the body (from inside the hips) through the thigh and shin to the foot, then a foot with three
// claws; rows: [u below the hip, half width, half height, bone code (p pelvis, t thigh, m shin, l metatarsus), bone b, weight].
const LEG = [[.18, .1, .2, 'p'], [.08, .112, .215, 'p', 't', .5], [-.03, .11, .195, 't'], [-.13, .094, .15, 't'], [-.24, .085, .1, 't', 'm', .5], [-.35, .064, .072, 'm'], [-.48, .052, .058, 'm'], [-.58, .048, .052, 'm', 'l', .5], [-.67, .043, .046, 'l'], [-.75, .046, .046, 'l']];
function legs(B, C, tier, form) {
  const low = tier === 'low', bone = form === 'fossil', steel = form === 'armor';
  for (const L of LEGS) {
    const W = PACHY_SKELETON.bindWorld, t = BI[L.top] * 3, x = W[t], y = W[t + 1], z = W[t + 2], name = (c) => c === 'p' ? 'pelvis' : c === 't' ? L.top : c === 'm' ? L.mid : L.low;
    let rows = (low ? LEG.filter((_, i) => i % 2 === 0 || i === LEG.length - 1) : LEG).filter((r) => !bone || r[0] < .1).map(([u, rx, rz, a, b, w]) => bone ? [u, rx * (u > -.25 ? .36 : .3), rz * (u > -.25 ? .22 : .3), a, b, w] : [u, rx, rz, a, b, w]), kinds = rows.map(() => 'plate');
    if (steel) { // plated: the thigh plate, a shin guard flared at the knee, an ankle cuff; each lapping the one below it over a dark seam
      const R2 = [], K2 = []; for (const r of rows) { const lip = r[0] === -.24 || r[0] === -.03 || r[0] === -.58 || (low && (r[0] === -.35 || r[0] === -.67));
        if (lip) { R2.push([r[0], r[1] * 1.16, r[2] * 1.12, r[3], r[4], r[5]]); K2.push('lip'); R2.push([r[0] - .014, r[1], r[2], r[3], r[4], r[5]]); K2.push('seam'); }
        else { R2.push([r[0], r[1] * 1.05, r[2] * 1.05, r[3], r[4], r[5]]); K2.push('plate'); } }
      rows = R2; kinds = K2; }
    B.color(bone ? C.bone : MARK.hide).loft({ seg: G0.seg.leg[tier], up: [1, 0, 0], sections: rows.map(([u, rx, rz, a, b, w]) => ({ at: [x, y, z + u], rx, rz, bones: [name(a), name(b ?? a), w || 0] })),
      tone: steel ? (i, k, st) => kinds[i] === 'seam' ? C.seam : kinds[i] === 'lip' ? C.steelLight : MARK.hide : undefined });
    if (bone) for (const n of [L.mid, L.low]) B.bone(n).color(C.boneShade).ellipsoid({ at: [0, 0, 0], radius: [.035, .035, .035], rings: 2, seg: 5 });
    if (steel) { // a knee cap set into the guard, rivets down the shin
      B.bone(L.mid).color(C.steelLight).ellipsoid({ at: [.045, 0, .01], radius: [.045, .06, .05], rings: 3, seg: low ? 6 : 8 });
      if (!low) for (const u of [-.07, -.17]) B.bone(L.mid).color(C.rivet).ellipsoid({ at: [.07, 0, u], radius: [.011, .011, .011], rings: 2, seg: 4 });
      B.bone(L.mid).color(C.seam).lathe({ at: [-.055, 0, -.02], F: [0, 0, -1], rings: [[0, .018], [.22, .014]], seg: low ? 4 : 6, caps: false }); // a piston down the back of the shin
      if (!low) B.color(C.steelLight).lathe({ at: [-.055, 0, -.14], F: [0, 0, -1], rings: [[0, .009], [.14, .009]], seg: 4, caps: false });
    }
    B.bone(L.foot).color(bone ? C.boneShade : steel ? C.steelDark : MARK.hide).ellipsoid({ at: [.04, 0, .01], radius: [.1, .06, .03], rings: 3, seg: low ? 6 : 8 });
    for (let c = 0; c < 3; c++) { const s = c - 1; B.color(C.claw).lathe({ at: [.12, s * .03, .01], F: [1, s * .3, -.3], rings: [[0, .014], [.05, .002]], seg: low ? 3 : 4, caps: false }); }
  }
  // the little arms: a short loft on each arm, three small claws
  for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', a = BI['arm' + tag] * 3, f = BI['fore' + tag] * 3, W = PACHY_SKELETON.bindWorld;
    B.color(bone ? C.bone : MARK.hide).loft({ seg: low ? 5 : 7, sections: [[W[a] - .07, W[a + 2] + .06, .055], [W[a], W[a + 2], .042], [W[f], W[f + 2], .03], [W[f] + .04, W[f + 2] - .05, .022]].map(([x, z, r], i) => ({ at: [x, W[a + 1] + s * (i ? .01 : 0), z], rx: bone ? r * .4 : r, rz: bone ? r * .4 : r, bones: [i < 2 ? 'arm' + tag : 'fore' + tag, i < 2 ? 'arm' + tag : 'fore' + tag, 0] })) });
    B.bone('fore' + tag); for (let c = 0; c < 2; c++) B.color(C.claw).lathe({ at: at('fore' + tag, [W[f] + .04, W[f + 1] + (c - .5) * .02, W[f + 2] - .05]), F: [.5, 0, -.8], rings: [[0, .01], [.035, 0]], seg: 3, caps: false }); }
}
// The armor's hide: the same body as one stepped loft of overlapping steel plates (shingled tail to head: at each joint the plate in
// front laps over the one behind it, a dark seam under its lit rear lip), a gold-trimmed gorget at the neck, rivets along each lip and
// a raised steel ridge down the back. One skin, so the plating is built onto the body, never floating bands.
const PLATE_JOINTS = [-.87, -.63, -.39, -.15, .07, .28, .45], PLATE = Object.freeze({ lap: 1.075, body: 1.03, tuck: 1.0, gap: .016 });
function armorHide(B, C, tier) {
  const rows = [], kinds = [], low = tier === 'low';
  for (const [f, u, rx, rz, a, b, w] of HIDE) {
    const bones = [a, b ?? a, w || 0];
    if (PLATE_JOINTS.includes(f)) { const [u0] = sectionAt(f - PLATE.gap);
      rows.push({ at: [f - PLATE.gap, 0, u0], rx: rx * PLATE.tuck, rz: rz * PLATE.tuck, bones }); kinds.push('seam');
      rows.push({ at: [f, 0, u], rx: rx * PLATE.lap, rz: rz * PLATE.lap, bones }); kinds.push('lip'); }
    else { const s = f > .5 ? 1 : PLATE.body; rows.push({ at: [f, 0, u], rx: rx * s, rz: rz * s, bones }); kinds.push('plate'); }
  }
  B.color(MARK.hide).loft({ seg: G0.seg.hide[tier], sections: rows, tone: (i, k, st) => kinds[i] === 'seam' ? C.seam : kinds[i] === 'gold' ? (st > -.6 ? C.gold : C.steelDark) : kinds[i] === 'lip' && st > -.2 ? C.steelLight : MARK.hide });
  // rivets just behind each lip, over the top half
  if (!low) for (const f of PLATE_JOINTS) { const i = HIDE.findIndex((q) => q[0] === f), [, u, rx, rz, a] = HIDE[i], n = tier === 'full' ? 5 : 3;
    for (let j = 0; j < n; j++) { const th = Math.PI * (.12 + .76 * j / (n - 1)); B.bone(a).color(C.rivet).ellipsoid({ at: at(a, [f + .03, Math.cos(th) * rx * PLATE.lap, u + Math.sin(th) * rz * PLATE.lap]), radius: [.011, .011, .011], rings: 2, seg: 4 }); } }
  // the machine showing through: glowing vents on the chest plate, each side
  for (const sd of [-1, 1]) for (let j = 0; j < (low ? 2 : 3); j++) { const f = .31 + j * .045, [u, rx] = sectionAt(f), uu = u + .01 - j * .012;
    B.bone('chest').color(C.visor, E_VISOR).ellipsoid({ at: at('chest', [f, sd * rx * PLATE.body * .985, uu]), radius: [.032, .008, .007], rings: 2, seg: 5 }); }
  // the steel ridge down the back, raised over the lips
  B.color(C.steelLight).loft({ seg: 4, minSeg: 4, sections: BODY.slice(3, -3).map(([f, u, , rz, a, b, w]) => ({ at: [f, 0, u + rz * PLATE.lap + .004], rx: .014, rz: .018 + rz * .06, bones: [a, b ?? a, w || 0] })) });
}
function buildMesh(tier, form) {
  const C = palette(), B = meshBuilder(PACHY_SKELETON, TIER_DETAIL[tier]), low = tier === 'low', full = tier === 'full', bone = form === 'fossil', steel = form === 'armor';
  if (form === 'rock') { // the disguise: one boulder, too round and too smooth (shaded and mossed by rockSkin), a pale cap ringed with knobs
    B.bone('rock').color(MARK.rock).ellipsoid({ at: [0, 0, 0], radius: [.5, .42, .36], rings: low ? 6 : 9, seg: low ? 10 : 16 });
    B.color(C.rockCap).ellipsoid({ at: [.1, 0, .25], radius: [.24, .22, .13], rings: low ? 3 : 5, seg: low ? 8 : 12 });
    for (let i = 0; i < (low ? 7 : 11); i++) { const a = i / (low ? 7 : 11) * Math.PI * 2; B.color(C.knob).ellipsoid({ at: [.1 + Math.cos(a) * .23, Math.sin(a) * .21, .29], radius: [.04, .04, .034], rings: 2, seg: 5 }); }
    return paintMesh(B.done(), C, form);
  }
  if (bone) {
    // the column: a rounded vertebra (with its spine) on every section from the tail tip to the neck, threaded on one bone; the ribs as
    // hoops following the trunk's own section; the pelvis over the hips where the femurs meet it; chevrons under the tail
    for (let i = 1; i < BODY.length; i++) { const [f, u, , rz, a, b, w] = BODY[i], bn = (w || 0) >= .5 && b ? b : a, r = Math.max(.018, Math.min(.05, rz * .27));
      B.bone(bn).color(i % 2 ? C.boneShade : C.bone).ellipsoid({ at: at(bn, [f, 0, u + rz * .5]), radius: [r * .85, r * 1.1, r], rings: low ? 2 : 3, seg: low ? 5 : 6 });
      if (!low && f > -.8 && f < .45) B.color(C.bone).lathe({ at: at(bn, [f, 0, u + rz * .5 + r * .6]), F: [-.25, 0, 1], rings: [[0, r * .45], [r * 1.6, r * .12]], seg: 3, caps: false }); }
    B.color(C.bone).loft({ seg: low ? 4 : 5, minSeg: 4, sections: BODY.slice(1).map(([f, u, , rz, a, b, w]) => ({ at: [f, 0, u + rz * .5], rx: .016, rz: .018, bones: [a, b ?? a, w || 0] })) });
    for (const [f, bn] of [[.12, 'spine'], [.19, 'spine'], [.26, 'spine'], [.33, 'chest'], [.4, 'chest']].filter((_, i) => !low || i % 2 === 0)) for (const sd of [-1, 1]) {
      const [u, rx, rz] = sectionAt(f), pts = []; for (let j = 0; j < 6; j++) { const th = Math.PI * (.42 - j * .19), rr = .9 - (j > 3 ? (j - 3) * .1 : 0); pts.push([f + .015 * j, sd * Math.max(.02, Math.cos(th) * rx * rr), u + .02 + Math.sin(th) * rz * .88]); }
      B.color(C.boneShade).loft({ seg: 4, minSeg: 3, sections: pts.map((p, j) => ({ at: p, rx: .012, rz: j === 0 ? .016 : .011, bones: [bn, bn, 0] })) }); }
    B.bone('pelvis').color(C.bone).ellipsoid({ at: at('pelvis', [.02, 0, .7]), radius: [.17, .085, .06], rings: low ? 3 : 4, seg: low ? 6 : 8 }); // the ilium blades
    for (const sd of [-1, 1]) B.color(C.boneShade).ellipsoid({ at: at('pelvis', [.02, sd * G0.hipWidth, G0.hip]), radius: [.05, .04, .05], rings: low ? 2 : 3, seg: low ? 5 : 6 }); // the hip sockets
    B.color(C.boneShade).loft({ seg: 4, minSeg: 3, sections: [[.0, .68, .02], [.05, .58, .018], [.12, .5, .014], [.14, .48, .02]].map(([f, u, r]) => ({ at: [f, 0, u], rx: r, rz: r, bones: ['pelvis', 'pelvis', 0] })) }); // the pubis
    if (!low) for (const n of ['tail1', 'tail2', 'tail3']) B.bone(n).color(C.boneShade).lathe({ at: [0, 0, -.025], F: [-.3, 0, -1], rings: [[0, .016], [.08, .004]], seg: 3, caps: false });
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
    void tone;
    if (!steel) { B.color(MARK.hide).loft({ seg: G0.seg.hide[tier], sections: HIDE.map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })) }); stripe(B, C, tier); }
    else armorHide(B, C, tier);
  }
  headParts(B, C, low, full, form);
  legs(B, C, tier, form);
  return paintMesh(B.done(), C, form);
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
  const rate = /kick|slam|butt|clash|charge|bonk|drum/.test(name) ? G.strikeEase : G.ease, V = tr.v, first = !Number.isFinite(tr.yaw);
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

// Dome Rush's Earth Golem on the Wayfarer in Close View (echoes.ts PACHY_ECHO): draw-time only, round the figure (close-view.ts draws
// the figure golemScale larger): stone shards jutting from the shoulders, back and hips (stone spike cards), an amber seam glowing at
// each one's root, and an earthen glow about the body that fades with the time left (the status cue). Cards only; no allocation.
// plates: [angle round the body, height of the root, reach out, length, half width]
export const GOLEM_CLOSE = Object.freeze({ plates: Object.freeze([[.3, .98, .22, .44, .12], [2.85, .98, .22, .44, .12], [1.0, 1.05, .2, .4, .11], [2.15, 1.05, .2, .4, .11], [4.4, 1.0, .2, .46, .12], [5.0, 1.0, .2, .46, .12], [5.7, .72, .24, .34, .1], [3.6, .72, .24, .34, .1], [.9, .45, .24, .28, .09], [2.25, .45, .24, .28, .09]]),
  seam: 0xffb347, glow: 0xc8803a, spin: .25, stone: .45 });
export function drawPachyGolemClose(p, card, reduce = false, now = 0) {
  if (!p || !(now < (Number(p.echoGolemUntil) || 0))) return false;
  const G = GOLEM_CLOSE, left = Math.max(0, Math.min(1, (p.echoGolemUntil - now) / (PACHY_ECHO.seconds * 1000))), t = reduce ? 0 : now / 1000, x = p.x + .5, y = p.y + .75, S = PACHY_ECHO.scale;
  card(x, y, 0, 1.9, .55, 11, .12 + .12 * left, G.glow, 0);
  for (let i = 0; i < G.plates.length; i++) { const [a0, z, r, h, w] = G.plates[i], a = a0 + t * G.spin, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r, zz = z * S + (reduce ? 0 : .015 * Math.sin(t * 3 + i));
    card(px, py, zz - h * .3, zz + h * .7, w, 7, .95, 0, G.stone); card(px, py, zz - w * .5, zz + w * .5, w * .8, 11, .6 + (reduce ? 0 : .3 * Math.sin(t * 6 + i)), G.seam, 0); }
  return true;
}

// The Pachycephalosaurus's daze on the Wayfarer in Close View (pachy.ts PACHY.daze; the standard view's pachy-render.ts
// drawPachyDazeStars): little golden stars circling over her head while she is dazed, each a bright core in a soft halo, fading over
// the last of the time. Reduced Motion: they hold still. Cards only; no allocation.
export const DAZE_CLOSE = Object.freeze({ up: 1.42, rx: .27, ry: .27, halo: .085, core: .035, star: 0xffe45c, glow: 0xffb347 });
export function drawPachyDazeClose(p, card, reduce = false, now = 0) {
  const left = pachyDazeLeft(p, now); if (!(left > 0)) return false;
  const Z = PACHY_DAZE_ART, C = DAZE_CLOSE, t = reduce ? 0 : now / 1000, a = Math.min(1, left / Z.fade), x = p.x + .5, y = p.y + .75;
  for (let i = 0; i < Z.count; i++) { const ang = t * Z.spin + i / Z.count * Math.PI * 2, px = x + Math.cos(ang) * C.rx, py = y + Math.sin(ang) * C.ry, z = C.up + (reduce ? 0 : .03 * Math.sin(t * 5 + i)), tw = reduce ? 1 : .8 + .2 * Math.sin(t * Z.twinkle + i * 1.7);
    card(px, py, z - C.halo, z + C.halo, C.halo, 11, .55 * a * tw, C.glow, 0); card(px, py, z - C.core, z + C.core, C.core, 11, a * tw, C.star, 0); }
  return true;
}
