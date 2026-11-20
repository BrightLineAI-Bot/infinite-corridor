// The Earth Apatosaurus in Close View (Tim, 2026-11-18): the same beast as its standard-view art (apato-render.ts: a moss-green
// sauropod, paler beneath, a bank of brown earth with grass and stones across its back, a seed sprout on its head that glows for
// the beam), as a solid skinned body on the shared beast rig (close-view-beast-rig.ts), and its tree clones as a cheaper wooden
// body in the minion allowance (BEAST_SLOT.minion). It follows the pose contract (earth-apato.ts): e.apatoPose, apatoHeading,
// apatoGlow, apatoNeckLift, apatoNeckReach, apatoLash and apatoWrap; nothing here reads attack timing or changes the game.
//
// The long neck is a chain of twelve bones (n1..n12) under one continuous loft, so it bends smoothly along its whole length. Each
// frame the chain is laid along a target curve: at rest and in its moves a cubic from the shoulders to the head (the standard view's
// own curve); in the lash the game's own snake path over the ground (apatoLash), resampled by arc length; in the wrap the path out to
// the held Wayfarer or foe, its last five bones coiled round them. Each bone is placed by its offset in its parent's frame and aimed
// at the next, never scaled, so the neck keeps its girth however far it runs (the skin between two bones stretches along the path).
// Bounded: 39 bones, the triangle counts below; no allocation per frame.
import { APATO_ART, APATO_FX } from "./apato-render.js?v=r1045-0ffc4cf4987b";
import { APATO } from "./earth-apato.js?v=r1045-0ffc4cf4987b";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r1045-0ffc4cf4987b";

const hex = (s) => parseInt(s.slice(1), 16);
export const APATO_RIG = Object.freeze({
  closeViewScale: 1.2,
  hip: .92, femur: .36, tibia: .32, hindCannon: .14, humerus: .34, radius: .3, foreCannon: .12, foot: .045, hipWidth: .22, shoulderWidth: .2,
  walk: Object.freeze({ stride: .7, stance: .66 }),
  settle: 6, stepAt: .1, stepTime: .34, turnRate: 3, attackTurnRate: 6, standTurnRate: 2, standTurnMax: 1.4, footLift: .1, bob: .016,
  ease: 9, deathMs: 2600, hitMs: 320,
  breathe: Object.freeze({ rate: 1.1, chest: .01 }),
  // the neck: its base (chest-local f, u), its rest head (root-local f, u), how lift and reach move the head (as apato-render.ts)
  neckBase: Object.freeze([.24, .1]), headRest: Object.freeze([1.38, 2.14]), headUp: .9, headLow: .12,
  // the lash over the ground: the head skims `skim` tiles up; the wrap's coil: `coil` bones round the held one, `coilR` tiles out,
  // from `coilLow` to `coilHigh` tiles up, `coilTurn` radians a bone
  skim: .45, coil: 5, coilR: 1.05, coilLow: .45, coilHigh: 2.1, coilTurn: 1.45,
});
const G0 = APATO_RIG, A = APATO_ART, NB = 12, Cd0 = { dustFollow: 260 };
// trunk spine (f, u): hips, back, chest; the tail falls from the hips to its tip
const SPINE = { pelvis: [-.36, .98], spine: [0, 1.04], chest: [.36, 1.0], tail1: [-.72, .98], tail2: [-1.02, .9], tail3: [-1.34, .76], tail4: [-1.66, .58], tail5: [-1.98, .4] };
// the neck's bind curve: chest base to the head (a cubic, as the standard view's rest pose)
const NECK0 = [.62, 1.12], NC1 = [.94, 1.34], NC2 = [.96, 1.72], HEAD0 = [1.38, 2.14];
const bez = (a, b, c, d, t) => { const m = 1 - t; return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d; };
const NECK_AT = Array.from({ length: NB + 1 }, (_, i) => { const t = i / NB; return [bez(NECK0[0], NC1[0], NC2[0], HEAD0[0], t), bez(NECK0[1], NC1[1], NC2[1], HEAD0[1], t)]; });
const NECK = Array.from({ length: NB }, (_, i) => 'n' + (i + 1));
const TAIL = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5'];
const BONES = (() => {
  const W = {}, out = [], add = (name, parent, w) => { W[name] = w; const p = parent ? W[parent] : [0, 0, 0]; out.push({ name, parent, at: [w[0] - p[0], w[1] - p[1], w[2] - p[2]] }); };
  const S = (n) => [SPINE[n][0], 0, SPINE[n][1]];
  add('root', null, [0, 0, 0]); add('pelvis', 'root', S('pelvis')); add('spine', 'pelvis', S('spine')); add('chest', 'spine', S('chest'));
  NECK.forEach((n, i) => add(n, i ? NECK[i - 1] : 'chest', [NECK_AT[i][0], 0, NECK_AT[i][1]]));
  add('head', NECK[NB - 1], [HEAD0[0], 0, HEAD0[1]]); add('jaw', 'head', [HEAD0[0] + .03, 0, HEAD0[1] - .05]);
  TAIL.forEach((n, i) => add(n, i ? TAIL[i - 1] : 'pelvis', S(n)));
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const hx = SPINE.pelvis[0], hz = G0.hip, hy = s * G0.hipWidth;
    add('thigh' + side, 'pelvis', [hx, hy, hz]); add('shin' + side, 'thigh' + side, [hx, hy, hz - G0.femur]); add('hock' + side, 'shin' + side, [hx, hy, hz - G0.femur - G0.tibia]); add('footH' + side, 'hock' + side, [hx, hy, hz - G0.femur - G0.tibia - G0.hindCannon]);
    const fx = SPINE.chest[0] + .06, fz = G0.humerus + G0.radius + G0.foreCannon + G0.foot, fy = s * G0.shoulderWidth;
    add('arm' + side, 'chest', [fx, fy, fz]); add('fore' + side, 'arm' + side, [fx, fy, fz - G0.humerus]); add('wrist' + side, 'fore' + side, [fx, fy, fz - G0.humerus - G0.radius]); add('footF' + side, 'wrist' + side, [fx, fy, fz - G0.humerus - G0.radius - G0.foreCannon]);
  }
  return out;
})();
export const APATO_SKELETON = defineSkeleton(BONES);
const BI = APATO_SKELETON.index, NI = Int16Array.from(NECK.map((n) => BI[n])), TI = Int16Array.from(TAIL.map((n) => BI[n]));
const E_EYE = 1, E_SPROUT = 2;
const LEGS = [
  { top: 'thighL', mid: 'shinL', low: 'hockL', foot: 'footHL', hind: true, side: -1 },
  { top: 'armL', mid: 'foreL', low: 'wristL', foot: 'footFL', hind: false, side: -1 },
  { top: 'thighR', mid: 'shinR', low: 'hockR', foot: 'footHR', hind: true, side: 1 },
  { top: 'armR', mid: 'foreR', low: 'wristR', foot: 'footFR', hind: false, side: 1 },
];
const WALK_PHASE = [0, .25, .5, .75];

// ------------------------------------------------------------------------------------------------ the body
let PAL = null;
const pal = () => PAL ||= { hide: hex(A.hide), light: hex(A.hideLight), dark: hex(A.hideDark), belly: hex(A.belly), earth: hex(A.earth), earthL: hex(A.earthLight), earthD: hex(A.earthDark),
  grass: hex(A.grass), grassD: hex(A.grassDark), stone: hex(A.stone), sprout: hex(A.sprout), sproutD: hex(A.sproutDark), eye: hex(A.eye), pupil: hex(A.pupil), mouth: hex(A.mouth), nail: 0xe8e0c0, pad: 0x24401a };
export const lerpHex = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
const at = (bone, p) => { const i = BI[bone] * 3, w = APATO_SKELETON.bindWorld; return [p[0] - w[i], p[1] - w[i + 1], p[2] - w[i + 2]]; };
const hash = (n) => { let x = (n | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
// The trunk and tail sections, tail tip to chest: [f, u, half width, half height, bone a, bone b, weight on b].
const TRUNK = [
  [-2.3, .26, .01, .01, 'tail5'], [-2.18, .3, .025, .024, 'tail5'], [-2.0, .38, .045, .043, 'tail5', 'tail4', .3], [-1.82, .48, .065, .063, 'tail4', 'tail5', .3], [-1.66, .57, .085, .082, 'tail4'],
  [-1.5, .66, .105, .102, 'tail4', 'tail3', .5], [-1.34, .75, .13, .127, 'tail3'], [-1.18, .83, .16, .156, 'tail3', 'tail2', .5], [-1.02, .9, .2, .195, 'tail2'], [-.86, .95, .26, .255, 'tail2', 'tail1', .5],
  [-.72, .98, .32, .31, 'tail1', 'pelvis', .3], [-.56, .99, .39, .38, 'pelvis'], [-.36, 1.0, .44, .43, 'pelvis', 'spine', .3], [-.14, 1.01, .47, .46, 'spine'], [.08, 1.0, .47, .46, 'spine', 'chest', .4],
  [.28, .99, .45, .44, 'chest'], [.44, 1.0, .41, .41, 'chest'], [.56, 1.02, .35, .36, 'chest', 'n1', .2], [.66, 1.06, .27, .29, 'chest', 'n1', .5],
];
function buildApatoMesh(tier) {
  const C = pal(), full = tier === 'full', low = tier === 'low', B = meshBuilder(APATO_SKELETON, TIER_DETAIL[tier]);
  const tone = (i, k, st) => { let c = lerpHex(C.hide, C.light, .3 + Math.max(0, st) * .5); if (st < -.2) c = lerpHex(c, C.belly, Math.min(1, (-.2 - st) * 1.8)); if (i % 3 === 1 && st > -.1 && st < .5) c = lerpHex(c, C.dark, .25); return c; };
  B.color(C.hide).loft({ seg: low ? 9 : full ? 16 : 12, sections: (low ? TRUNK.filter((_, i) => i % 2 === 0 || i === TRUNK.length - 1) : TRUNK).map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })), tone });
  // the neck: one loft from the chest through the twelve bones into the back of the head; three rings a bone (two on low)
  { const per = low ? 2 : full ? 3 : 2, S = [];
    for (let i = 0; i <= NB * per; i++) { const t = i / (NB * per), j = Math.min(NB - 1, Math.floor(t * NB)), w = t * NB - j, f = bez(NECK0[0], NC1[0], NC2[0], HEAD0[0], t), u = bez(NECK0[1], NC1[1], NC2[1], HEAD0[1], t), r = .26 - .16 * Math.pow(t, .75);
      const a = NECK[j], b = j + 1 < NB ? NECK[j + 1] : 'head'; S.push({ at: [f, 0, u], rx: r * .92, rz: r, bones: [a, b, smooth(w)] }); }
    S.unshift({ at: [.5, 0, 1.0], rx: .3, rz: .3, bones: ['chest', 'n1', .1] });
    B.color(C.hide).loft({ seg: low ? 7 : full ? 12 : 9, sections: S, tone: (i, k, st) => st < -.3 ? lerpHex(C.hide, C.belly, .75) : st > .45 ? lerpHex(C.hide, C.light, .7) : (i % 3 ? C.hide : lerpHex(C.hide, C.light, .25)) }); }
  // the head: a small rounded skull with a blunt snout, the jaw beneath, gold eyes, the sprout on its crown
  const hb = (p) => at('head', p), H = HEAD0;
  B.bone('head').color(C.hide).loft({ seg: low ? 7 : full ? 12 : 9, sections: [[-.04, .0, .07, .075], [.02, .01, .1, .1], [.1, .01, .1, .095], [.18, -.005, .085, .078], [.26, -.02, .065, .058], [.31, -.03, .04, .036], [.33, -.035, .01, .01]].map(([f, u, rx, rz]) => ({ at: [H[0] + f, 0, H[1] + u], rx, rz, bones: ['head', 'head', 0] })),
    tone: (i, k, st) => st < -.3 ? C.belly : st > .5 ? C.light : C.hide });
  B.bone('jaw').color(C.dark).loft({ seg: low ? 6 : 8, sections: [[0, .0, .07, .03], [.1, -.005, .065, .028], [.2, -.01, .045, .02], [.26, -.01, .02, .01]].map(([f, u, rx, rz]) => ({ at: [H[0] + .03 + f, 0, H[1] - .05 + u], rx, rz, bones: ['jaw', 'jaw', 0] })), tone: (i, k, st) => st > .3 ? C.mouth : C.dark });
  B.bone('head');
  for (const s of [-1, 1]) {
    B.color(C.eye, E_EYE).ellipsoid({ at: hb([H[0] + .1, s * .085, H[1] + .045]), radius: [.028, .012, .022], rings: 3, seg: 6 });
    if (!low) B.color(C.pupil).ellipsoid({ at: hb([H[0] + .108, s * .095, H[1] + .045]), radius: [.006, .004, .018], rings: 2, seg: 4 });
    B.color(C.dark).ellipsoid({ at: hb([H[0] + .095, s * .075, H[1] + .075]), radius: [.05, .022, .014], rings: 2, seg: 5, F: [1, -s * .1, -.3] }); // brow
    if (!low) B.color(C.pad).ellipsoid({ at: hb([H[0] + .3, s * .025, H[1] - .005]), radius: [.01, .007, .007], rings: 2, seg: 4 }); // nostril
  }
  // the sprout: a stem and two broad leaves on the crown, lit (E_SPROUT) as it gathers the beam
  B.color(C.sproutD, E_SPROUT).lathe({ at: hb([H[0] + .04, 0, H[1] + .1]), F: [0, 0, 1], U: [1, 0, 0], rings: [[0, .014], [.08, .01], [.13, .006]], seg: low ? 4 : 6, caps: true });
  for (const s of [-1, 1]) B.color(C.sprout, E_SPROUT).ellipsoid({ at: hb([H[0] + .04, s * .05, H[1] + .23]), radius: [.035, .06, .012], rings: 3, seg: low ? 5 : 8, F: [1, 0, 0], U: [0, -s * .55, 1] });
  B.color(C.sprout, E_SPROUT).ellipsoid({ at: hb([H[0] + .04, 0, H[1] + .25]), radius: [.016, .016, .03], rings: 2, seg: 5 });
  // the earth across its back: a brown bank over the spine with stones, clods and tufts of grass
  B.bone('spine').color(C.earth).ellipsoid({ at: at('spine', [-.05, 0, 1.33]), radius: [.6, .38, .17], rings: low ? 4 : 6, seg: low ? 10 : full ? 18 : 14 });
  B.bone('pelvis').color(C.earthD).ellipsoid({ at: at('pelvis', [-.55, 0, 1.25]), radius: [.24, .28, .12], rings: low ? 3 : 4, seg: low ? 7 : 10 });
  B.bone('chest').color(C.earthD).ellipsoid({ at: at('chest', [.42, 0, 1.27]), radius: [.2, .26, .1], rings: low ? 3 : 4, seg: low ? 7 : 10 });
  if (!low) for (let i = 0; i < (full ? 8 : 5); i++) { const f = -.5 + hash(i * 3) * 1.0, r = (hash(i * 5) - .5) * .4, sz = .03 + hash(i * 7) * .03, bone = f < -.25 ? 'pelvis' : f > .25 ? 'chest' : 'spine';
    B.bone(bone).color(i % 3 ? C.stone : C.earthL).ellipsoid({ at: at(bone, [f, r, 1.44 - Math.abs(r) * .25]), radius: [sz * 1.3, sz, sz * .7], rings: 2, seg: 5 }); }
  for (let i = 0; i < (low ? 8 : full ? 30 : 18); i++) { const f = -.65 + hash(i * 11 + 1) * 1.25, r = (hash(i * 13 + 2) - .5) * .56, bone = f < -.25 ? 'pelvis' : f > .25 ? 'chest' : 'spine', hgt = .1 + hash(i * 17) * .1;
    B.bone(bone).color(i % 3 ? C.grass : C.grassD).lathe({ at: at(bone, [f, r, 1.47 - Math.abs(r) * .4]), F: [hash(i) * .5 - .25, r * .8, 1], U: [1, 0, 0], rings: [[0, .024], [hgt, .002]], seg: 3, caps: false }); }
  // two young saplings sprouting from the earth
  if (!low) for (const [f, r] of [[-.3, .12], [.15, -.14]]) { const bone = f < -.25 ? 'pelvis' : 'spine'; B.bone(bone).color(C.earthD).lathe({ at: at(bone, [f, r, 1.47]), F: [0, 0, 1], U: [1, 0, 0], rings: [[0, .012], [.16, .008]], seg: 4, caps: false });
    for (const sd of [-1, 1]) B.color(C.sprout).ellipsoid({ at: at(bone, [f, r + sd * .04, 1.63]), radius: [.025, .045, .01], rings: 2, seg: 5, F: [1, 0, 0], U: [0, -sd * .6, 1] }); }
  // legs: thick columns from inside the body to round padded feet with pale nails
  const HIND = [[.14, .16, .17, 'p'], [0, .17, .18, 'p', 't', .5], [-.1, .16, .165, 't'], [-.24, .14, .145, 't', 'm', .5], [-.38, .12, .125, 'm'], [-.56, .11, .115, 'm', 'l', .5], [-.7, .105, .11, 'l'], [-.8, .12, .12, 'l']];
  const FORE = [[.12, .14, .15, 'p'], [0, .15, .16, 'p', 't', .5], [-.12, .14, .148, 't'], [-.3, .12, .128, 't', 'm', .5], [-.48, .108, .113, 'm'], [-.64, .1, .105, 'm', 'l', .5], [-.74, .098, .102, 'l'], [-.8, .112, .112, 'l']];
  for (const L of LEGS) {
    const W = APATO_SKELETON.bindWorld, t = BI[L.top] * 3, x = W[t], y = W[t + 1], z = W[t + 2], parent = L.hind ? 'pelvis' : 'chest';
    const name = (c) => c === 'p' ? parent : c === 't' ? L.top : c === 'm' ? L.mid : L.low, src = L.hind ? HIND : FORE;
    const rows = src.filter((_, i) => !low || i % 2 === 0 || i === src.length - 1);
    B.color(C.hide).loft({ seg: low ? 6 : full ? 11 : 8, up: [1, 0, 0], sections: rows.map(([u, rx, rz, a, b, w]) => ({ at: [x, y, z + u], rx, rz, bones: [name(a), name(b ?? a), w || 0] })),
      tone: (i, k, st) => i >= rows.length - 2 ? lerpHex(C.dark, C.hide, .3) : lerpHex(C.hide, C.dark, Math.max(0, -st) * .3 + i * .025) });
    B.bone(L.foot).color(C.pad).ellipsoid({ at: [.0, 0, .015], radius: [.13, .12, .035], rings: 3, seg: low ? 7 : 10 });
    for (let c = 0; c < (low ? 0 : 3); c++) B.color(C.nail).ellipsoid({ at: [.1, (c - 1) * .06, .03], radius: [.025, .02, .02], rings: 2, seg: 4 });
  }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function apatoMesh(tier = 'full') { return MESHES[tier] ||= buildApatoMesh(MESHES[tier] === undefined ? 'full' : tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createApatoTrack() {
  return {
    pose: createPose(APATO_SKELETON),
    gait: createGait(LEGS.map((L, k) => ({ side: L.side * .2, fore: L.hind ? SPINE.pelvis[0] : SPINE.chest[0] + .06, phase: WALK_PHASE[k] }))),
    lift: 0, reach: 0, front: 0, glow: 0, yaw: NaN, at: NaN, hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null, deathDir: 1, x: 0, y: 0, z: 0,
    nt: new Float64Array((NB + 2) * 3), pl: new Float64Array(64 * 3),
    frame: { kind: 'earthApato', tier: 'full', mesh: null, skin: null, boneCount: APATO_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false },
  };
}
const TMP = [0, 0, 0], TMP2 = [0, 0, 0], H = new Float64Array(3), T = new Float64Array(3), LEGBONES = new Int16Array(4), LENS = new Float64Array(3);
// The neck's target points (bone origins n1..n12, then the head's, then one past it for the head's aim) into tr.nt, world units.
function neckCurve(tr, P, e, S, lift, reach, look) {
  const nt = tr.nt, up = Math.max(0, lift), down = Math.max(0, -lift);
  const base = boneLocalToWorld(P, 'chest', G0.neckBase[0], 0, G0.neckBase[1], TMP);
  // root-local cubic (f, r, u), the standard view's: head forward and up, low to the ground when it grazes or slams
  const hf = G0.headRest[0] + .5 * reach + .45 * down - .22 * up, hu = G0.headRest[1] + G0.headUp * up - (G0.headRest[1] - G0.headLow) * smooth(down);
  const bf = NECK0[0], bu = NECK0[1], c1f = bf + .32 + .2 * reach + .2 * down, c1u = bu + .22 + .15 * up - .15 * down, c2f = hf - .42 - .1 * up + .3 * down, c2u = hu - .42 - .3 * up + .4 * down;
  const bx = base[0], by = base[1], bz = base[2]; const b0 = boneLocalToWorld(P, 'root', bf, 0, bu, TMP2), ox = bx - b0[0], oy = by - b0[1], oz = bz - b0[2];
  for (let i = 0; i <= NB + 1; i++) { const t = Math.min(1.08, i / NB), f = bez(bf, c1f, c2f, hf, t), u = bez(bu, c1u, c2u, hu, t), r = look * (f - bf) * .55 * t;
    const p = boneLocalToWorld(P, 'root', f, r, u, TMP2); nt[i * 3] = p[0] + ox * (1 - t); nt[i * 3 + 1] = p[1] + oy * (1 - t); nt[i * 3 + 2] = p[2] + oz * (1 - t); }
}
// The neck laid along a polyline (tr.pl, n points, world): resampled by arc length into tr.nt.
function neckAlong(tr, n) {
  const pl = tr.pl, nt = tr.nt; let total = 0; for (let i = 1; i < n; i++) total += Math.hypot(pl[i * 3] - pl[i * 3 - 3], pl[i * 3 + 1] - pl[i * 3 - 2], pl[i * 3 + 2] - pl[i * 3 - 1]);
  let seg = 1, acc = 0, segLen = n > 1 ? Math.hypot(pl[3] - pl[0], pl[4] - pl[1], pl[5] - pl[2]) : 0;
  for (let i = 0; i <= NB + 1; i++) { const want = total * Math.min(1, i / NB) + (i > NB ? .2 : 0);
    while (seg < n - 1 && acc + segLen < want) { acc += segLen; seg++; segLen = Math.hypot(pl[seg * 3] - pl[seg * 3 - 3], pl[seg * 3 + 1] - pl[seg * 3 - 2], pl[seg * 3 + 2] - pl[seg * 3 - 1]); }
    const k = segLen > 1e-6 ? Math.max(0, Math.min(1.2, (want - acc) / segLen)) : 0, a = (seg - 1) * 3, b = seg * 3;
    nt[i * 3] = pl[a] + (pl[b] - pl[a]) * k; nt[i * 3 + 1] = pl[a + 1] + (pl[b + 1] - pl[a + 1]) * k; nt[i * 3 + 2] = pl[a + 2] + (pl[b + 2] - pl[a + 2]) * k; }
}
// Places the chain on tr.nt: each bone at its point (its offset in its parent's frame), aimed at the next; the head at the end.
function layNeck(tr, P) {
  const nt = tr.nt, wr = P.wr, wp = P.wp, sk = APATO_SKELETON;
  for (let i = 0; i <= NB; i++) {
    const b = i < NB ? NI[i] : BI.head, p = sk.parent[b], q = p * 9, s = Math.hypot(wr[q], wr[q + 1], wr[q + 2]) || 1;
    const dx = nt[i * 3] - wp[p * 3], dy = nt[i * 3 + 1] - wp[p * 3 + 1], dz = nt[i * 3 + 2] - wp[p * 3 + 2];
    // the point in the parent's frame (its columns carry its scale), less the bind offset
    const lf = (wr[q] * dx + wr[q + 1] * dy + wr[q + 2] * dz) / (s * s), lr = (wr[q + 3] * dx + wr[q + 4] * dy + wr[q + 5] * dz) / (s * s), lu = (wr[q + 6] * dx + wr[q + 7] * dy + wr[q + 8] * dz) / (s * s);
    setOffset(P, b, lf - sk.bind[b * 3], lr - sk.bind[b * 3 + 1], lu - sk.bind[b * 3 + 2]);
    const j = Math.min(NB + 1, i + 1), ax = nt[j * 3] - nt[i * 3], ay = nt[j * 3 + 1] - nt[i * 3 + 1], az = nt[j * 3 + 2] - nt[i * 3 + 2];
    if (Math.hypot(ax, ay, az) > 1e-6) aimWorld(P, b, 0, ax, ay, az, 0, 0, 1);
    resolveBone(P, b);
  }
  resolveBone(P, BI.jaw);
}
export const apatoPoseName = (e) => e?.dead ? 'dead' : e?.apatoPose || 'idle';
export function sampleApato(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(6, Number(env.scale) || 1)), P = tr.pose, G = APATO_RIG;
  const dt = Number.isFinite(tr.at) ? Math.min(.1, Math.max(0, (now - tr.at) / 1000)) : 0; tr.at = now;
  const dead = !!env.dead; if (dead && tr.deathAt == null) tr.deathAt = now; if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs; if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, ox = env.x - (Number(e.x) || 0), oy = env.y - (Number(e.y) || 0), name = apatoPoseName(e), first = !Number.isFinite(tr.yaw);
  // eased neck and body values (the standard view's own targets)
  const p = e.apatoPose, liftT = dead ? -1 : p === 'graze' || p === 'feed' ? -.9 : p === 'beamLift' || p === 'beam' || p === 'sweep' ? .9 : Number(e.apatoNeckLift) || 0, reachT = dead ? .2 : p === 'slamRaise' ? APATO_FX.cock : Number(e.apatoNeckReach) || 0;
  const frontT = (p === 'seedStamp' || p === 'spireStamp' || p === 'handsCall') && e.pack?.phase === 'windup' ? .9 : p === 'stomp' && e.pack?.phase === 'windup' ? .6 : 0;
  const ease = (cur, to, r = G.ease) => first || reduce || !(dt > 0) ? to : cur + (to - cur) * Math.min(1, dt * r);
  const snap = p === 'slam' ? APATO_FX.snap : G.ease; tr.lift = ease(tr.lift, liftT, snap); tr.reach = ease(tr.reach, reachT, snap); // the slam snaps down from its cocked wind-up tr.front = ease(tr.front, frontT, 12); tr.glow = ease(tr.glow, clamp01(Number(e.apatoGlow) || 0), 6);
  const stun = dead ? 0 : clamp01(Number(e.poiseBreak) || 0), daze = stun && !reduce ? stun * Math.sin(t * 3.4) : 0;
  // facing: the game's heading (its body turns at its own pace there)
  const h = e.apatoHeading; let aim = h && Math.hypot(h.x, h.y) > .01 ? Math.atan2(h.y, h.x) : tr.yaw; if (!Number.isFinite(aim)) aim = (Number(e.facingX) || 1) < 0 ? Math.PI : 0;
  if (first) tr.yaw = aim;
  if (!dead) { const d = Math.atan2(Math.sin(aim - tr.yaw), Math.cos(aim - tr.yaw)), attacking = !!e.pack?.attack; tr.yaw += Math.max(-1, Math.min(1, dt * (attacking ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate))) * d; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.hitSide = Math.sign((px - x) * -sf + (py - y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 14, 9) : 0;
  for (let k = 0; k < 4; k++) { tr.gait.side[k] = LEGS[k].side * (LEGS[k].hind ? G.hipWidth : G.shoulderWidth) * S; tr.gait.fore[k] = (LEGS[k].hind ? SPINE.pelvis[0] : SPINE.chest[0] + .06) * S; }
  const still = (!!e.pack?.attack && p !== 'stomp' && p !== 'hydra') || dead || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.walk.stride * S, stance: G.walk.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime, maxStepping: 2 });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  resetPose(P);
  let rollAngle = 0, alpha = e.fleeFade != null ? clamp01(e.fleeFade) : 1;
  if (dead) { const side = smooth((death - .2) / .35); rollAngle = 1.2 * side * tr.deathDir; alpha *= 1 - clamp01((death - .82) / .18);
    if (death < 1e-9) { const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.deathDir = (px - x) * -sf + (py - y) * cf > 0 ? -1 : 1; } }
  setEuler(P, BI.root, yaw, 0, rollAngle); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z - (dead ? .25 * S * smooth(death / .3) : 0));
  const bob = moving * G.bob * (.5 - .5 * Math.cos(cyc * 2)), sway = reduce ? 0 : moving * .01 * Math.sin(cyc), breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe.rate / 3);
  const front = tr.front, stomp = name === 'stomp' && !reduce ? .02 * Math.abs(Math.sin(t * 5.7)) : 0;
  setOffset(P, BI.pelvis, 0, sway, -bob - .03 * Math.abs(hit) - stomp); setEuler(P, BI.pelvis, 0, -front * .34 + daze * .03, -sway * 1.2 + daze * .05); resolveBone(P, BI.pelvis);
  setEuler(P, BI.spine, 0, 0, 0); resolveBone(P, BI.spine);
  setEuler(P, BI.chest, 0, -front * .08, 0); P.scl[BI.chest] = 1 + breathe * G.breathe.chest; resolveBone(P, BI.chest);
  // the neck: along the game's lash path, out to the wrap, or the eased curve of its pose
  const L = e.apatoLash, W = e.apatoWrap, lookTo = env.target && !dead ? Math.max(-.7, Math.min(.7, Math.atan2(Math.sin(Math.atan2(env.target.y - y, env.target.x - x) - yaw), Math.cos(Math.atan2(env.target.y - y, env.target.x - x) - yaw)))) * .6 : 0;
  const base = boneLocalToWorld(P, 'chest', G.neckBase[0], 0, G.neckBase[1], TMP), pl = tr.pl, gz = env.z;
  if (!dead && L?.on && L.n >= 1) {
    const n = Math.min(L.n, 60); pl[0] = base[0]; pl[1] = base[1]; pl[2] = base[2];
    for (let i = 1; i <= n; i++) { const k = i / n, hgt = (base[2] - gz) * (1 - k) * (1 - k) + G.skim * S * .4 * (1 - (1 - k) * (1 - k)) + (reduce ? 0 : Math.sin(t * 8 - i * .9) * .05 * S * k); pl[i * 3] = L.xs[i] + ox; pl[i * 3 + 1] = L.ys[i] + oy; pl[i * 3 + 2] = gz + hgt; }
    neckAlong(tr, n + 1);
  } else if (!dead && W?.on && W.phase !== 'track') {
    const k = W.phase === 'lunge' ? smooth(W.t) : 1, tx = base[0] + (W.x + ox - base[0]) * k, ty = base[1] + (W.y + oy - base[1]) * k, coil = W.phase === 'hold' || W.phase === 'throw' ? 1 : 0;
    // out to the held one: up and over, then (held) coiled round it, rising
    const mx = (base[0] + tx) / 2, my = (base[1] + ty) / 2, mz = Math.max(base[2], gz + 1.2 * S * .4) + .3 * S;
    let n = 0; const put = (X, Y, Z) => { pl[n * 3] = X; pl[n * 3 + 1] = Y; pl[n * 3 + 2] = Z; n++; };
    put(base[0], base[1], base[2]); put(mx, my, mz);
    const dxw = tx - mx, dyw = ty - my, dm = Math.hypot(dxw, dyw) || 1, a0 = Math.atan2(-dyw, -dxw);
    if (coil) { for (let i = 0; i <= G.coil; i++) { const a = a0 + i * G.coilTurn * (1 + (reduce ? 0 : .04 * Math.sin(t * 3 + i))), r = G.coilR * (1 - .15 * i / G.coil); put(tx + Math.cos(a) * r, ty + Math.sin(a) * r, gz + G.coilLow + (G.coilHigh - G.coilLow) * i / G.coil); } }
    else put(tx - dxw / dm * .3, ty - dyw / dm * .3, gz + .5 + (mz - gz - .5) * (1 - k) * .5), put(tx, ty, gz + .45);
    neckAlong(tr, n);
  } else neckCurve(tr, P, e, S, tr.lift + (reduce ? 0 : .03 * wobble(t * .5, 2)) + daze * .2 + ((name === 'leaf' || name === 'leafReady') && !reduce ? Math.sin(t * (name === 'leaf' ? 16 : 6)) * .15 : 0), tr.reach, lookTo + (name === 'leaf' && !reduce ? Math.sin(t * 11) * .5 : 0));
  layNeck(tr, P);
  const open = name === 'leaf' || name === 'leafReady' || name === 'wrapTrack' ? .5 : name === 'graze' && !reduce ? .25 * Math.max(0, Math.sin(t * 6)) : dead ? .3 : 0;
  setEuler(P, BI.jaw, 0, .5 * open, 0); resolveBone(P, BI.jaw);
  // where its eyes are this frame (presentation only, never saved): the beam's column starts there (drawApatoCloseFx)
  { const q = boneLocalToWorld(P, 'head', .12, 0, .05, TMP2); let eye = e.apatoEyeCV; if (!eye) { eye = { x: 0, y: 0, z: 0, gz: 0, at: -1, slamAt: -1e9, sx: 0, sy: 0 }; Object.defineProperty(e, 'apatoEyeCV', { value: eye, enumerable: false, configurable: true, writable: true }); }
    eye.x = q[0]; eye.y = q[1]; eye.z = q[2]; eye.gz = gz; eye.at = now;
    if (p === 'slam' && (tr.pose0 !== 'slam' || now - eye.slamAt < Cd0.dustFollow)) { if (tr.pose0 !== 'slam') eye.slamAt = now; eye.sx = q[0]; eye.sy = q[1]; } tr.pose0 = p; } // follows the head down for its first moments // the slam's contact: dust where the head lands
  // the tail: a slow sway, lifted a little as it stamps
  for (let i = 0; i < TAIL.length; i++) { const w = (i + 1) / TAIL.length, swing = reduce ? 0 : (.06 * Math.sin(t * 1.3 - i * .55) * w + moving * .05 * Math.sin(cyc - i * .5)) * (1 - stun * .5);
    setEuler(P, TI[i], swing + (i === 0 ? hit * .1 * tr.hitSide : 0), -.03 + front * (i < 2 ? .18 : .05) + (dead ? .1 : 0), 0); resolveBone(P, TI[i]); }
  // the legs: planted feet by the gait; the forefeet raised as it rears to stamp
  for (let k = 0; k < 4; k++) {
    const Lg = LEGS[k], top = BI[Lg.top], hi = top * 3, len = (Lg.hind ? G.femur + G.tibia + G.hindCannon : G.humerus + G.radius + G.foreCannon) * S;
    resolveBone(P, top); H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    const lift = tr.gait.out[k * 4 + 2]; let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], fz = env.z + (G.foot + .01) * S + lift * G.footLift * S;
    if (!Lg.hind && name === 'stomp' && (Number(e.apatoStepLift) || 0) > .02 && ((Number(e.apatoStep) || 0) % 2 === 0) === (Lg.side < 0)) { const up = smooth(Number(e.apatoStepLift)); fz += .35 * S * up * .4; fx += Math.cos(yaw) * .15 * S * up; fy += Math.sin(yaw) * .15 * S * up; } // the stomp chase: the next forefoot rising
    if (!Lg.hind && front > .01) { const q = boneLocalToWorld(P, 'chest', .45, Lg.side * G.shoulderWidth, -.55, TMP2); fx += (q[0] - fx) * front; fy += (q[1] - fy) * front; fz += (q[2] - fz) * front; }
    if (dead) { const q = boneLocalToWorld(P, 'root', Lg.hind ? SPINE.pelvis[0] : SPINE.chest[0], Lg.side * .25, G.foot + .2 * smooth(death / .3), TMP2); fx = q[0]; fy = q[1]; fz = q[2]; }
    T[0] = fx; T[1] = fy; T[2] = fz; void len;
    LEGBONES[0] = top; LEGBONES[1] = BI[Lg.mid]; LEGBONES[2] = BI[Lg.low]; LEGBONES[3] = BI[Lg.foot];
    LENS[0] = (Lg.hind ? G.femur : G.humerus) * S; LENS[1] = (Lg.hind ? G.tibia : G.radius) * S; LENS[2] = (Lg.hind ? G.hindCannon : G.foreCannon) * S;
    const bend = Math.min(1, lift * .9 + (Lg.hind ? 0 : front * .5));
    poseAnimalLeg(P, LEGBONES, H, T, LENS, cf, sf, Lg.hind, bend, lift > 0 ? -.4 * lift : 0, Lg.hind ? -.04 - .4 * bend : .02 + .8 * bend);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1;
  F.emitK[0] = life * (1 + 2.5 * tr.glow) + (reduce ? 0 : .06 * Math.sin(t * 2.1)) * life; F.emitK[1] = life * (.35 + 2.2 * tr.glow + (reduce ? 0 : .1 * Math.sin(t * 1.7))); F.emitK[2] = 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = apatoMesh(F.tier); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = 0; F.shadow = 1; F.phase = name; F.contact = 0; F.cloud = false;
  return F;
}
export const apatoBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };

// ------------------------------------------------------------------------------------------------ the tree clone (a minion body)
// Twelve bones: a barrel of bark on four stiff root legs, a three-bone neck with a knotted head, a two-bone branching tail; a mane of
// leaves. It coils (apatoLatched) by bending its neck down round the Wayfarer.
export const CLONE_RIG = Object.freeze({ closeViewScale: 1.2, deathMs: 900, hitMs: 280, legLen: .55 });
const CLONE_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] }, { name: 'body', parent: 'root', at: [0, 0, .62] },
  { name: 'c1', parent: 'body', at: [.38, 0, .12] }, { name: 'c2', parent: 'c1', at: [.14, 0, .2] }, { name: 'c3', parent: 'c2', at: [.12, 0, .2] }, { name: 'chead', parent: 'c3', at: [.1, 0, .12] },
  { name: 'ct1', parent: 'body', at: [-.4, 0, 0] }, { name: 'ct2', parent: 'ct1', at: [-.35, 0, -.1] },
  { name: 'lfl', parent: 'body', at: [.25, -.16, -.1] }, { name: 'lfr', parent: 'body', at: [.25, .16, -.1] }, { name: 'lhl', parent: 'body', at: [-.25, -.16, -.1] }, { name: 'lhr', parent: 'body', at: [-.25, .16, -.1] },
]);
export { CLONE_SKELETON };
const CI = CLONE_SKELETON.index;
function buildCloneMesh(tier) {
  const low = tier === 'low', full = tier === 'full', B = meshBuilder(CLONE_SKELETON, TIER_DETAIL[tier]), bark = hex(A.bark), barkD = hex(A.barkDark), barkL = hex(A.barkLight), leaf = hex(A.leaf), leafD = hex(A.leafDark);
  const W = CLONE_SKELETON.bindWorld, bw = (n) => [W[CI[n] * 3], W[CI[n] * 3 + 1], W[CI[n] * 3 + 2]];
  const grain = (i, k, st) => { const ridge = (k + (i >> 2)) % 3; return lerpHex(ridge === 0 ? lerpHex(barkD, 0x140c06, .45) : ridge === 1 ? bark : lerpHex(bark, barkL, .45), barkL, Math.max(0, st) * .25) }; // grain runs along the trunk, not round it
  B.color(bark).loft({ seg: low ? 5 : full ? 9 : 7, sections: [[-.85, .58, .02, .02, 'ct2'], [-.7, .6, .05, .05, 'ct2', 'ct1', .3], [-.45, .62, .12, .11, 'ct1', 'body', .3], [-.25, .64, .2, .19, 'body'], [.05, .66, .23, .21, 'body'], [.3, .66, .2, .19, 'body'], [.42, .72, .12, .12, 'body', 'c1', .5],
    [.5, .88, .085, .085, 'c1', 'c2', .5], [.6, 1.06, .07, .07, 'c2', 'c3', .5], [.68, 1.22, .06, .06, 'c3', 'chead', .6], [.74, 1.32, .055, .055, 'chead']].map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })), tone: grain });
  // bark: dark ridges running along the trunk, two knots and a broken branch stub (not on the low tier)
  if (!low) { for (let i = 0; i < (full ? 5 : 3); i++) { const a = (i / (full ? 5 : 3)) * Math.PI * 2 + .3, r = .2; B.bone('body').color(barkD).lathe({ at: [-.32, Math.cos(a) * r, Math.sin(a) * r * .95 + .04], F: [1, 0, 0], U: [0, 0, 1], seg: 3, rings: [[0, .018], [.3, .024], [.62, .014]], caps: false }); }
    for (const [f, side] of [[-.1, 1], [.15, -1]]) B.bone('body').color(barkD).ellipsoid({ at: [f, side * .2, .05], radius: [.04, .02, .035], rings: 2, seg: 5 });
    B.bone('body').color(barkL).lathe({ at: [-.05, .1, .17], F: [-.2, .6, .7], U: [0, 0, 1], seg: 3, rings: [[0, .025], [.12, .012]], caps: true }); }
  const hd = bw('chead'); B.bone('chead').color(barkL).ellipsoid({ at: [.08, 0, .01], radius: [.11, .055, .05], rings: low ? 2 : 3, seg: low ? 5 : 8 });
  if (!low) for (const s of [-1, 1]) B.color(0xc8ff6a, 1).ellipsoid({ at: [.1, s * .045, .025], radius: [.014, .008, .012], rings: 2, seg: 4 });
  B.color(leaf).ellipsoid({ at: [-.02, 0, .07], radius: [.03, .012, .05], rings: 2, seg: 5 }); void hd;
  for (const n of ['lfl', 'lfr', 'lhl', 'lhr']) { B.bone(n).color(barkD).lathe({ at: [0, 0, 0], F: [0, 0, -1], U: [1, 0, 0], rings: low ? [[0, .07], [.5, .06]] : [[0, .07], [.3, .055], [.5, .07]], seg: low ? 4 : 6, caps: !low });
    if (!low) for (let r = 0; r < 3; r++) { const a = r * 2.1; B.color(barkD).lathe({ at: [0, 0, -.48], F: [Math.cos(a), Math.sin(a), -.5], U: [0, 0, 1], rings: [[0, .025], [.12, .004]], seg: 3, caps: false }); } }
  B.bone('ct2').color(barkD).lathe({ at: [-.1, 0, 0], F: [-.4, .5, .8], U: [0, 0, 1], rings: [[0, .02], [.2, .004]], seg: 3, caps: false });
  if (!low) B.color(leaf).ellipsoid({ at: [-.18, .1, .15], radius: [.06, .03, .04], rings: 2, seg: 5 });
  for (let i = 0; i < (low ? 3 : full ? 7 : 5); i++) { const f = -.3 + i * .6 / (low ? 2 : full ? 6 : 4); B.bone('body').color(i % 2 ? leaf : leafD).ellipsoid({ at: [f, (hash(i) - .5) * .12, .2], radius: [.09, .07, .045], rings: 2, seg: low ? 5 : 6, F: [1, 0, .4] }); }
  return B.done();
}
const CMESH = { full: null, balanced: null, low: null };
export function apatoCloneMesh(tier = 'full') { return CMESH[tier] ||= buildCloneMesh(CMESH[tier] === undefined ? 'full' : tier); }
export function createApatoCloneTrack() {
  return { pose: createPose(CLONE_SKELETON), yaw: NaN, at: NaN, hp: NaN, hitAt: -Infinity, deathAt: null, phase: 0, px: NaN, py: NaN, x: 0, y: 0, z: 0,
    frame: { kind: 'apatoClone', tier: 'full', mesh: null, skin: null, boneCount: CLONE_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4), x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false } };
}
export function sampleApatoClone(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(4, Number(env.scale) || 1)), P = tr.pose, G = CLONE_RIG;
  const dt = Number.isFinite(tr.at) ? Math.min(.1, Math.max(0, (now - tr.at) / 1000)) : 0; tr.at = now;
  const dead = !!env.dead; if (dead && tr.deathAt == null) tr.deathAt = now; if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs; if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, h = e.apatoHeading, first = !Number.isFinite(tr.yaw);
  let aim = h && Math.hypot(h.x, h.y) > .01 ? Math.atan2(h.y, h.x) : env.target ? Math.atan2(env.target.y - y, env.target.x - x) : 0; if (first) tr.yaw = aim;
  if (!dead) tr.yaw += Math.max(-1, Math.min(1, dt * 6)) * Math.atan2(Math.sin(aim - tr.yaw), Math.cos(aim - tr.yaw));
  const moved = Number.isFinite(tr.px) ? Math.hypot(x - tr.px, y - tr.py) : 0; tr.px = x; tr.py = y; if (!reduce && moved < 2) tr.phase += moved * 7;
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) tr.hitAt = now; tr.hp = e.hp;
  const hit = (now - tr.hitAt) / 1000 < G.hitMs / 1000 ? kick((now - tr.hitAt) / 1000, 14, 9) : 0, p = e.apatoPose, coil = !!e.apatoLatched;
  const lift = p === 'slamRaise' ? .7 : p === 'slam' ? -1 : coil ? -.8 : 0, reach = Math.max(0, Number(e.apatoNeckReach) || 0), tail = p === 'tail' && !reduce ? Math.sin(t * 14) * .9 : reduce ? 0 : Math.sin(t * 1.6) * .12;
  resetPose(P); setEuler(P, CI.root, tr.yaw, 0, dead ? 1.2 * smooth(death / .5) : 0); P.scl[CI.root] = S; resolveBone(P, CI.root, x, y, env.z - (dead ? .3 * S * death : 0));
  setOffset(P, CI.body, 0, 0, -.02 * Math.abs(Math.sin(tr.phase))); setEuler(P, CI.body, 0, hit * .1, 0); resolveBone(P, CI.body);
  const wig = reduce ? 0 : .08 * Math.sin(t * 2.2);
  setEuler(P, CI.c1, coil ? Math.sin(t * 6) * .3 : 0, -lift * .45 - reach * .5 + wig, 0); resolveBone(P, CI.c1);
  setEuler(P, CI.c2, coil ? .6 : 0, -lift * .4 - reach * .35, 0); resolveBone(P, CI.c2);
  setEuler(P, CI.c3, coil ? .8 : 0, -lift * .35 - reach * .2, 0); resolveBone(P, CI.c3);
  setEuler(P, CI.chead, 0, -lift * .2 + .3 * reach, 0); resolveBone(P, CI.chead);
  setEuler(P, CI.ct1, tail * .6, .1, 0); resolveBone(P, CI.ct1); setEuler(P, CI.ct2, tail * .8, .15, 0); resolveBone(P, CI.ct2);
  for (const [n, o] of [['lfl', 0], ['lhr', 0], ['lfr', Math.PI], ['lhl', Math.PI]]) { setEuler(P, CI[n], 0, reduce || dead ? 0 : .35 * Math.sin(tr.phase + o) * Math.min(1, moved * 30), 0); resolveBone(P, CI[n]); }
  writeSkin(P);
  if (p === 'slam' && tr.pose0 !== 'slam') { const q = boneLocalToWorld(P, 'chead', .1, 0, 0, TMP2); let eye = e.apatoEyeCV; if (!eye) { eye = { x: 0, y: 0, z: 0, gz: 0, at: -1, slamAt: -1e9, sx: 0, sy: 0 }; Object.defineProperty(e, 'apatoEyeCV', { value: eye, enumerable: false, configurable: true, writable: true }); }
    eye.slamAt = now; eye.sx = q[0]; eye.sy = q[1]; eye.at = now; } tr.pose0 = p; // the clone's slam: dust where its head lands (presentation only)
  const F = tr.frame; F.emitK[0] = 1.2; F.emitK[1] = 0; F.emitK[2] = 0; F.emitK[3] = 0; F.emitA[0] = F.emitA[1] = F.emitA[2] = F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = apatoCloneMesh(F.tier); F.skin = P.skin; F.alpha = dead ? 1 - death : 1; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = tr.yaw; F.scale = S; F.air = 0; F.shadow = 1; F.phase = coil ? 'coil' : p || 'idle'; F.contact = 0; F.cloud = false;
  return F;
}

// ------------------------------------------------------------------------------------------------ what stands above the floor
// Close View draws the floor from the standard view's capture (apato-render.ts drawApatoGround draws only the floor's part there:
// the marks, the beam's track, the waves, the saplings); what stands up from it is drawn here with the scene's camera-facing cards
// (close-view.ts `card`: kind 7 a stone spike, kind 0 a dark disc, kind 11 an added glow of the colour given). Bounded by the
// beast's own pools (APATO.caps); nothing allocated. `card(X, Y, z0, z1, halfWidth, kind, alpha, colour, light)`.
export const APATO_CARDS = Object.freeze({ spire: 1.9, spireW: .42, rock: .26, rockZ: .7, hand: 1.2, handW: .34, leaf: .16, leafZ: .55, seedArc: 2.2, rootZ: 1.6, rootBeads: 7, rootR: .2, rockZ0: 1.3, rockUp: 1.6, rockFall: 1.3, rockLow: .45, beamZ: 3.4, beamCards: 56, beamW: .12, beamGrow: .1, star: .09, resolveRoots: 18, waveDust: 8, venomDrops: 8, trail: .22, sapGrow: .7, sapSize: [.9, 1.1], sapTall: [.6, 1.4] });
export function drawApatoCloseFx(enemies, card, reduce = false, now = 0, resolve = null) {
  const Cd = APATO_CARDS, t = reduce ? 0 : now / 1000;
  // Earth Resolve (its Echo): roots rising round the sigil's rim (short stone-dark spikes) and a green glow at its heart, fading at its end
  if (resolve) { const fade = Math.max(0, Math.min(1, (resolve.until - now) / 1000)), born = Math.max(0, Math.min(1, (now - resolve.at) / 450)), n = Math.min(Cd.resolveRoots, Math.round(6 + resolve.r * 3));
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3, x = resolve.x + Math.cos(a) * resolve.r * .9, y = resolve.y + .3 + Math.sin(a) * resolve.r * .9, h = (.35 + .25 * ((i * 7) % 3) / 2) * born * fade; card(x, y, 0, h, .07, 7, .9 * fade, 0, 0); card(x, y, h * .7, h + .08, .06, 11, .7 * fade, 0x9cff5a, 0); } // a root with a living tip
    card(resolve.x, resolve.y + .3, 0, .9 * fade, resolve.r * .5, 11, .35 * fade, 0x9cff5a, 0); }
  for (const e of enemies || []) {
    if (e.apatoDazed > 0 && !e.dead) { const z = 2.2 * Math.max(.6, Number(e.scale) || 1) * .55; for (let i = 0; i < 4; i++) { const a = t * 3 + i * Math.PI / 2; card(e.x + .5 + Math.cos(a) * .6, e.y + .75 + Math.sin(a) * .6, z - Cd.star, z + Cd.star, Cd.star, 11, .9, 0xfff6a0, 0); } }
    const eye = e.apatoEyeCV; if (eye && !reduce && !e.dead) { const age = (now - eye.slamAt) / APATO_FX.dustMs; if (age >= 0 && age < 1) { // dust and grit thrown up where a head struck
      const big = e.kind === 'earthApato' ? 1.6 : .8, fade = 1 - age, r = big * (.6 + .8 * smooth(age)), n = APATO_FX.dustPuffs;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .2, x = eye.sx + Math.cos(a) * r, y = eye.sy + Math.sin(a) * r, h = big * (.1 + .3 * age) * (1 + .3 * (i % 2)), w = big * (.26 + .26 * age);
        card(x, y, h * .2, h * .2 + w * 1.6, w, 0, .55 * fade, 0, 0); card(x, y, h * .3, h * .3 + w * 1.3, w * .85, 11, .4 * fade, 0xc8a878, 0); }
      for (let i = 0; i < 4; i++) { const a = i * 1.7 + .5, k = smooth(age * 1.6), x = eye.sx + Math.cos(a) * big * .5 * k, y = eye.sy + Math.sin(a) * big * .5 * k, z = big * .9 * Math.sin(Math.PI * Math.min(1, age * 1.3)); card(x, y, z, z + .07, .05, 0, .9 * fade, 0, 0); } } } // flung clods
    if (e.kind !== 'earthApato' || e.dead) continue;
    const F = e.apatoFx; if (!F) continue;
    for (const q of F.leaves) { if (!q.on) continue; const m = Math.hypot(q.vx, q.vy) || 1, dx = q.vx / m, dy = q.vy / m, c = q.thorn ? 0xe8e0c0 : 0x8fe04a, z = Cd.leafZ + (q.thorn || reduce ? 0 : .06 * Math.sin(q.spin * 9));
      card(q.x + .5, q.y + .62, z - Cd.leaf, z + Cd.leaf, Cd.leaf, 11, .85, c, 0); for (let j = 1; j <= 3; j++) card(q.x + .5 - dx * j * Cd.trail, q.y + .62 - dy * j * Cd.trail, z - Cd.leaf * (1 - j * .22), z + Cd.leaf * (1 - j * .22), Cd.leaf * (1 - j * .22), 11, .45 - j * .12, c, 0); } // and its streak
    if (e.apatoBeam?.on) for (const q of e.apatoSaplings || []) if (q.grow > 0) card(q.x + .5, q.y + .62, .2, 1.2, .45, 11, .5 + (reduce ? 0 : .2 * Math.sin(t * 20)), 0xeaff9a, 0); // a sapling drinking the light
    for (const q of F.seeds) { if (!q.on || q.delay > 0) continue; const k = Math.min(1, q.t / (q.total || 1)), x = q.fx + (q.tx - q.fx) * k, y = q.fy + (q.ty - q.fy) * k, z = 1.5 * (1 - k) + Math.sin(Math.PI * k) * Cd.seedArc; card(x + .5, y + .62, z, z + .2, .1, 0, .9, 0, 0); card(x + .5, y + .62, z + .12, z + .3, .07, 11, .7, 0x9cff5a, 0); } // a seed and its sprout
    // the stomp's waves: a skirt of dust thrown up along each ring as it runs (the ring itself is on the floor)
    for (const q of F.waves) { if (!q.on || reduce) continue; const r = Math.max(.1, q.r), fade = 1 - Math.min(1, r / Math.max(.5, q.max || 1)), n = Cd.waveDust;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + r * .7, x = q.x + .5 + Math.cos(a) * r, y = q.y + .62 + Math.sin(a) * r, h = .18 + .12 * ((i + Math.floor(r * 3)) % 2); card(x, y, 0, h, .2, 0, .28 * fade, 0, 0); card(x, y, .02, h * .8, .14, 11, .22 * fade, 0xc8a878, 0); } }
    // the wrap's venom: green drops arcing from its mouth onto the one it holds, a sick haze round them
    const W = e.apatoWrap, eyeW = e.apatoEyeCV; if (W?.on && W.phase === 'hold' && eyeW && Math.abs(now - eyeW.at) < 250) { const tx = W.x + .5, ty = W.y + .62, n = Cd.venomDrops;
      card(tx, ty, .3, 1.7, .55, 11, .22, 0x7fe03a, 0);
      for (let i = 0; i < n; i++) { const k = reduce ? (i + .5) / n : (t * 1.6 + i / n) % 1, x = eyeW.x + (tx - eyeW.x) * k, y = eyeW.y + (ty - eyeW.y) * k, z = eyeW.z + (eyeW.gz + 1.1 - eyeW.z) * k + Math.sin(Math.PI * k) * .35;
        card(x, y, z - .06, z + .06, .06, 11, .85, 0x9cff3a, 0, true); } }
    const B = e.apatoBeam; if (B?.on) { // one continuous column from its eyes (where Close View drew them this frame) to the far end of its line
      const eye = e.apatoEyeCV, live = !!eye && Math.abs(now - eye.at) < 250, n = Cd.beamCards, ex = B.x + B.ax * B.len + .5, ey = B.y + B.ay * B.len + .62;
      const sx = live ? eye.x : B.x + .5, sy = live ? eye.y : B.y + .62, step = Math.hypot(ex - sx, ey - sy) / n, sz = live ? eye.z : Cd.beamZ, gz = live ? eye.gz : 0, flick = reduce ? 1 : .9 + .1 * Math.sin(t * 40);
      for (let i = 0; i <= n; i++) { const k = i / n, x = sx + (ex - sx) * k, y = sy + (ey - sy) * k, z = sz + (gz + .12 - sz) * k, dz = Math.abs(sz - gz) / n, w = (Cd.beamW + Cd.beamGrow * k) * flick;
        const gap = dz * 1.2 + step * .5; card(x, y, z - w - gap, z + w + gap, Math.max(w * 1.4, step * .8), 11, .4, 0xf4ff9a, 0, live); card(x, y, z - w * .4 - gap, z + w * .4 + gap, Math.max(w * .5, step * .6), 11, .8, 0xffffff, 0, live); } // overlapping, so the column reads unbroken
      if (live) card(sx, sy, sz - .22, sz + .22, .26, 11, .9, 0xffffff, 0, true); } // the flare at its eyes
  }
}

// ------------------------------------------------------------------------------------------------ standing hazards as real geometry
// The rock spires, the earth hands (and the rock each holds) and the thrown rocks are small solid meshes drawn by the beast program
// (one bone each: the skin matrix is written straight from the hazard's place, rise and spin). A frame for every pool slot is made
// once (APATO.caps: 6 spires, 4 hands, 8 rocks), so a frame allocates nothing; close-view.ts appends the live ones to the beast list
// as it does the folk. Triangles: PROP_TRIS below (a full set of 22 live props stays under one clone body per kind).
const PROP_SKELETON = defineSkeleton([{ name: 'root', parent: null, at: [0, 0, 0] }]);
const rockC = hex(A.rock), rockD = hex(A.rockDark), rockL = hex(A.rockLight), earthC = hex(A.earth), earthD = hex(A.earthDark), earthL = hex(A.earthLight), grassC = hex(A.grass);
function buildSpire(low) { const B = meshBuilder(PROP_SKELETON, low ? .4 : 1); B.bone('root');
  B.color(rockD).lathe({ at: [0, 0, -.05], F: [0, 0, 1], U: [1, 0, 0], seg: low ? 5 : 7, rings: [[0, .5], [.1, .44], [.45, .3], [.8, .18], [1.15, .07], [1.3, 0]], caps: false });
  if (!low) for (let i = 0; i < 3; i++) { const a = i * 2.1 + .4; B.color(i % 2 ? rockC : rockL).lathe({ at: [Math.cos(a) * .3, Math.sin(a) * .3, -.05], F: [Math.cos(a) * .35, Math.sin(a) * .35, 1], U: [0, 0, 1], seg: 4, rings: [[0, .16], [.3, .08], [.48, 0]], caps: false }); }
  return B.done(); }
function buildHand(low) { const B = meshBuilder(PROP_SKELETON, low ? .4 : 1); B.bone('root');
  B.color(earthD).ellipsoid({ at: [0, 0, 0], radius: [.42, .42, .1], rings: 2, seg: low ? 6 : 9 }); // the mound
  B.color(earthC).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: low ? 5 : 7, rings: [[0, .2], [.45, .17], [.78, .2]], caps: true }); // the forearm
  B.color(earthL).ellipsoid({ at: [0, 0, .86], radius: [.2, .1, .14], rings: 2, seg: low ? 5 : 7 }); // the palm
  for (let i = 0; i < 4; i++) { const sx = (i - 1.5) * .1, tilt = (i - 1.5) * .25; B.color(i % 2 ? earthC : earthD).lathe({ at: [sx, 0, .95], F: [tilt, .15, 1], U: [1, 0, 0], seg: low ? 3 : 4, rings: [[0, .05], [.22, .04], [.3, 0]], caps: false }); }
  B.color(earthD).lathe({ at: [-.2, 0, .82], F: [-1, .2, .6], U: [0, 0, 1], seg: low ? 3 : 4, rings: [[0, .05], [.18, 0]], caps: false }); // thumb
  if (!low) for (let i = 0; i < 3; i++) B.color(grassC).lathe({ at: [(i - 1) * .12, .14, .3 + i * .15], F: [0, .4, 1], U: [1, 0, 0], seg: 3, rings: [[0, .02], [.1, 0]], caps: false });
  return B.done(); }
function buildRoot(low) { const B = meshBuilder(PROP_SKELETON, low ? .4 : 1); B.bone('root'); const vine = hex(A.vine), vineD = hex(A.vineDark), bud = hex(A.bud), thorn = hex(A.thorn), n = low ? 6 : 12, S = [];
  // a serpent's neck: up out of the back, over in an arch with a sideways S, down to its bud on the ground; thick at the root
  for (let i = 0; i <= n; i++) { const f = i / n, r = .11 - .05 * f; S.push({ at: [f, .16 * Math.sin(Math.PI * 2 * f) * (1 - f * .6), Math.pow(1 - f, 1.4) + .45 * Math.sin(Math.PI * f) + .05 * (1 - f) + .04], rx: r, rz: r * 1.1, bones: ['root', 'root', 0] }); }
  B.color(vine).loft({ seg: low ? 4 : 6, sections: S, tone: (i, k, st) => st < -.3 ? lerpHex(vine, bud, .45) : (i + (k % 2)) % 3 ? vine : vineD }); // a paler belly, banded back
  B.color(bud).ellipsoid({ at: [1.02, 0, .08], radius: [.11, .08, .08], rings: 2, seg: low ? 5 : 7 });
  if (!low) for (const sd of [-1, 1]) B.color(thorn).lathe({ at: [1.08, sd * .05, .1], F: [1, sd * .6, .2], U: [0, 0, 1], seg: 3, rings: [[0, .025], [.08, 0]], caps: false });
  return B.done(); }
function buildRock(low) { const B = meshBuilder(PROP_SKELETON, low ? .4 : 1); B.bone('root'); B.color(rockC).ellipsoid({ at: [0, 0, 0], radius: [.3, .26, .24], rings: low ? 2 : 3, seg: low ? 5 : 6 }); if (!low) B.color(rockL).ellipsoid({ at: [-.1, .05, .12], radius: [.12, .1, .08], rings: 2, seg: 4 }); return B.done(); }
function buildSapling(low) { const B = meshBuilder(PROP_SKELETON, low ? .4 : 1); B.bone('root'); const bark = hex(A.bark), barkD = hex(A.barkDark), leaf = hex(A.leaf), leafD = hex(A.leafDark);
  B.color(barkD).ellipsoid({ at: [0, 0, 0], radius: [.16, .16, .03], rings: 2, seg: low ? 5 : 7 }); // turned earth at its foot
  B.color(bark).lathe({ at: [0, 0, 0], F: [.08, 0, 1], U: [1, 0, 0], seg: low ? 4 : 5, rings: [[0, .045], [.5, .03], [.9, .016]], caps: false });
  for (let i = 0; i < (low ? 3 : 5); i++) { const a = i * 2.4, z = .45 + i * .1, c = i % 2 ? leaf : leafD; B.color(c).ellipsoid({ at: [Math.cos(a) * .1, Math.sin(a) * .1, z], radius: [.11, .05, .02], rings: 2, seg: low ? 4 : 6, F: [Math.cos(a), Math.sin(a), .5], U: [0, 0, 1] }); }
  B.color(hex(A.sprout)).ellipsoid({ at: [.07, 0, .92], radius: [.04, .04, .06], rings: 2, seg: low ? 4 : 5 }); // the bud at its tip
  return B.done(); }
const PROP_MESH = { full: null, low: null };
export function apatoPropMeshes(tier = 'full') { const k = tier === 'low' ? 'low' : 'full'; return PROP_MESH[k] ||= { spire: buildSpire(k === 'low'), hand: buildHand(k === 'low'), rock: buildRock(k === 'low'), root: buildRoot(k === 'low'), sapling: buildSapling(k === 'low') }; }
export const PROP_TRIS = Object.freeze({ get root() { return apatoPropMeshes().root.triangles; }, get spire() { return apatoPropMeshes().spire.triangles; }, get hand() { return apatoPropMeshes().hand.triangles; }, get rock() { return apatoPropMeshes().rock.triangles; }, get sapling() { return apatoPropMeshes().sapling.triangles; } });
const propFrame = () => ({ kind: 'apatoProp', tier: 'full', mesh: null, skin: new Float32Array(12), boneCount: 1, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: Float32Array.from([1, 1, 1, 1]), x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 0, air: 0, feet: new Float64Array(8), phase: 'prop', contact: 0, cloud: false, fogCap: 1 });
// One prop's skin: a uniform `size` (wide) by `tall` (up), turned `yaw`, at (x, y, z).
function placeProp(f, mesh, x, y, z, yaw, size, tall, alpha) {
  const c = Math.cos(yaw), s = Math.sin(yaw), k = f.skin; f.mesh = mesh; f.alpha = alpha; f.x = x; f.y = y; f.z = z;
  k[0] = c * size; k[1] = -s * size; k[2] = 0; k[3] = x; k[4] = s * size; k[5] = c * size; k[6] = 0; k[7] = y; k[8] = 0; k[9] = 0; k[10] = tall; k[11] = z; return f;
}
// Appends this frame's live props to the beast list `B` ({ items, count }). zAt(x, y): the floor's height; prepare(mesh): upload once (false: skip).
export function admitApatoProps(enemies, B, tier, now, reduce, zAt, prepare) {
  const Cd = APATO_CARDS, M = apatoPropMeshes(tier), t = reduce ? 0 : now / 1000; if (!prepare(M.spire) || !prepare(M.hand) || !prepare(M.rock) || !prepare(M.root) || !prepare(M.sapling)) return 0; let n = 0;
  for (const e of enemies || []) {
    if (e.kind !== 'earthApato' || e.dead || !e.apatoFx) continue; const F = e.apatoFx, P = e.apatoProps ||= { spires: F.spires.map(propFrame), hands: F.hands.map(propFrame), held: F.hands.map(propFrame), rocks: F.rocks.map(propFrame), roots: F.roots.map(propFrame), saps: Array.from({ length: APATO.caps.saplings }, propFrame) };
    Object.defineProperty(e, 'apatoProps', { value: P, enumerable: false, configurable: true, writable: true }); // presentation only, never saved
    for (let i = 0; i < F.spires.length; i++) { const q = F.spires[i]; if (!q.on || q.t < q.warn) continue; const k = Math.min(1, (q.t - q.warn) / .12), fade = Math.max(0, Math.min(1, (q.warn + q.up - q.t) / .25)), X = q.x + .5, Y = q.y + .62;
      B.items[B.count++] = placeProp(P.spires[i], M.spire, X, Y, zAt(X, Y) - .3 * (1 - fade), i * 1.7, .95, 1.6 * k * (.5 + .5 * fade), 1); n++; }
    for (let i = 0; i < F.hands.length; i++) { const q = F.hands[i]; if (!q.on) continue; const rise = Math.min(1, q.t / .7) * Math.max(0, Math.min(1, (q.life - q.t) / .5)); if (!(rise > .02)) continue; const X = q.x + .5, Y = q.y + .62, z = zAt(X, Y), tall = 1.15 * rise;
      B.items[B.count++] = placeProp(P.hands[i], M.hand, X, Y, z - .2 * (1 - rise), i * 2.3 + .3 * Math.sin(t * 2 + i), 1, tall, 1); n++;
      if (q.throws > 0 && q.next < .6) { B.items[B.count++] = placeProp(P.held[i], M.rock, X, Y, z + tall * 1.12, t * 2, .9, .9, 1); n++; } }
    // root necks: the arched vine laid from the beast's back (high) out to its hunting bud on the ground
    { const sc = Math.max(.6, Number(e.scale) || 1) * APATO_RIG.closeViewScale, backZ = 1.25 * sc;
      for (let i = 0; i < F.roots.length; i++) { const q = F.roots[i]; if (!q.on) continue; const rise = Math.min(1, q.t / .45) * Math.max(0, Math.min(1, (q.life - q.t) / .4)); if (!(rise > .02)) continue;
        const bx = q.bx + .5, by = q.by + .62, tx = bx + (q.x - q.bx) * rise, ty = by + (q.y - q.by) * rise, dx = tx - bx, dy = ty - by, L = Math.hypot(dx, dy) || .01, z0 = zAt(bx, by), f = P.roots[i], k = f.skin, h = backZ * rise, w = 1 + (reduce ? 0 : .15 * Math.sin(t * 6 + i));
        f.mesh = M.root; f.alpha = 1; f.x = bx; f.y = by; f.z = z0; // f axis along the root's run, r across (a vine's girth), u its height off the back
        k[0] = dx; k[1] = -dy / L * w; k[2] = 0; k[3] = bx; k[4] = dy; k[5] = dx / L * w; k[6] = 0; k[7] = by; k[8] = 0; k[9] = 0; k[10] = h; k[11] = z0;
        B.items[B.count++] = f; n++; } }
    // saplings: a young tree that grows (and, drinking the beam, trembles) toward the clone it becomes; at most APATO.caps.saplings
    { const sap = e.apatoSaplings || [], lit = !!e.apatoBeam?.on; for (let i = 0; i < sap.length && i < P.saps.length; i++) { const q = sap[i], g = Math.min(1, (Number(q.grow) || 0) / Cd.sapGrow), X = q.x + .5, Y = q.y + .62, shake = lit && g > 0 && !reduce ? .08 * Math.sin(t * 30 + i) : 0;
      B.items[B.count++] = placeProp(P.saps[i], M.sapling, X, Y, zAt(X, Y), i * 2.1 + shake, Cd.sapSize[0] + Cd.sapSize[1] * g, Cd.sapTall[0] + Cd.sapTall[1] * g, 1); n++; } }
    for (let i = 0; i < F.rocks.length; i++) { const q = F.rocks[i]; if (!q.on) continue; const X = q.x + .5, Y = q.y + .62;
      const fly = Math.max(0, APATO.hands.range / APATO.hands.speed - q.left), z = Math.max(Cd.rockLow, Cd.rockZ0 + Cd.rockUp * fly - Cd.rockFall * fly * fly); // thrown from the palm in an arc
      B.items[B.count++] = placeProp(P.rocks[i], M.rock, X, Y, zAt(X, Y) + z, (reduce ? 0 : now / 1000 * 9) + i, .9, .9, 1); n++; }
  }
  return n;
}
