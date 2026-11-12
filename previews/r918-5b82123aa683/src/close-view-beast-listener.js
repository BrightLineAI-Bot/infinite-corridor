// The Listener in Close View: both of the bodies its fight uses, on one 40-bone hierarchy of the shared beast rig.
// - Open (mirror) form, as the standard view draws it (monster-render.ts BODY.listener): a cloaked figure shaped like the
//   Wayfarer, a long robe flaring to the floor in the Listener's dusk violet, a round hooded head whose face is a violet void
//   ringed in violet, and a pale blade held out from its right hand, raised high as it winds up. It sweeps, lances, blinks
//   behind you to cut down, and drives the blade into the floor for the shockwave.
// - Walled form, the Morphling (listener-morph.ts, drawn by drawMorphling): a hunched, V-shaped titan of dark violet flesh on
//   goat's legs, plated pectorals split by a glowing chamber of teeth, two great arms that run out into suckered tendrils (a
//   claw at the left, a dragon's jaw at the right when it bites), a crown of six back tentacles, and a head of flesh caged in
//   riveted iron with a grille jaw, hoses and mismatched optics. It follows the game's own `e.morph` moves: the cables
//   (tentacles thrown out along each cable), the jaw (the right arm stretches like putty to where you stood and clamps), the
//   sink (it shrinks into a bubbling pool and erupts), the worms (a convulsion), the spin (arms and crown flung out, turning),
//   the lunge (rears, then dives as a streaming mass), the beams (arms out in the beams' cross, turning with them), the orbs
//   (turning with the spiral) and the barbs (one arm flung per volley); and between them its pack kit (bite, devouring pull,
//   ground rupture, shockwave, flesh bloom) on the attack clocks.
// The two bodies share the bone hierarchy; each has its own bind fit (CLOAK_FIT, MORPH_FIT: the same names and parents with
// each body's joint positions), and the pose switches fit with the form. The reflections and the worms keep their billboards
// (close-view-beasts.ts). Nothing here changes timing, damage, reach or targeting.
import { ATTACK_MODULES, BOSS_PACE } from "./monster-pack.js?v=r918-5b82123aa683";
import { MORPH_FORM } from "./listener-morph.js?v=r918-5b82123aa683";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, solveTwoBone,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, easeOut, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r918-5b82123aa683";

export const LISTENER_RIG = Object.freeze({
  closeViewScale: 1.25, // as every Close View beast (presentation only)
  // the robed figure: gait and timing
  cloak: Object.freeze({ upperArm: .24, foreArm: .22, thigh: .22, shin: .2, ankle: .05, feet: .08, stride: .45, stance: .6, footLift: .07, stepAt: .07, stepTime: .3, bob: .012, shimmer: .2, hiddenAlpha: .25 }),
  // the Morphling: limb lengths (MORPH_FIT), gait, tentacle lengths
  morph: Object.freeze({ upperArm: .4, foreArm: .34, thigh: .26, shin: .19, cannon: .1, feet: .2, stride: .5, stance: .62, footLift: .1, stepAt: .1, stepTime: .38, bob: .02,
    tentacle: Object.freeze([.95, 1.07, 1.19]), tendril: .64, jawReachMs: 650, jawOpenMs: 450, riseMs: 380, emergeMs: 520, spinRate: 9, throwMs: 320, sinkDepth: .55 }),
  turnRate: 5, standTurnRate: 4, attackTurnRate: 10, blendMs: 150, hitMs: 260, deathMs: 1900, breathe: .3, strikeMs: 320,
  // the robed figure's poses: crouch, lean (+ forward), twist (+ toward its right), head (+ up), the right and left hands (in the
  // body's bind frame, f r u), the blade's pitch (+ up) and yaw (+ toward its right) in the chest's frame
  cloakPoses: Object.freeze({
    idle: { crouch: 0, lean: .04, twist: 0, head: 0, rF: .2, rR: .24, rU: .54, lF: .06, lR: -.2, lU: .4, bP: .55, bY: .55 },
    raise: { crouch: 0, lean: -.06, twist: 0, head: .15, rF: .1, rR: .32, rU: 1.06, lF: .1, lR: -.2, lU: .5, bP: 1.5, bY: 0 },
    sweepWind: { crouch: .04, lean: .02, twist: .55, head: 0, rF: -.12, rR: .4, rU: .7, lF: .2, lR: -.15, lU: .6, bP: .05, bY: 1.6 },
    sweepEnd: { crouch: .06, lean: .14, twist: -.55, head: 0, rF: .36, rR: .04, rU: .66, lF: -.04, lR: -.24, lU: .5, bP: 0, bY: -1 },
    stabWind: { crouch: .04, lean: -.08, twist: .25, head: 0, rF: -.1, rR: .24, rU: .62, lF: .22, lR: -.12, lU: .66, bP: .05, bY: 0 },
    stabEnd: { crouch: .08, lean: .25, twist: -.15, head: -.05, rF: .42, rR: .12, rU: .7, lF: -.05, lR: -.24, lU: .5, bP: -.02, bY: -.1 },
    gather: { crouch: .12, lean: .22, twist: .1, head: -.1, rF: 0, rR: .26, rU: .42, lF: .12, lR: -.18, lU: .45, bP: -.3, bY: .7 },
    slash: { crouch: .1, lean: .35, twist: -.1, head: -.1, rF: .3, rR: .08, rU: .5, lF: .1, lR: -.2, lU: .45, bP: -.7, bY: -.05 },
    slam: { crouch: .2, lean: .4, twist: 0, head: -.1, rF: .26, rR: .1, rU: .46, lF: .24, lR: -.08, lU: .46, bP: -.85, bY: 0 },
    open: { crouch: 0, lean: -.1, twist: 0, head: .2, rF: .16, rR: .42, rU: .66, lF: .16, lR: -.42, lU: .66, bP: .6, bY: .9 },
    point: { crouch: .04, lean: .12, twist: -.1, head: -.1, rF: .38, rR: .12, rU: .58, lF: .04, lR: -.22, lU: .42, bP: -.5, bY: 0 },
    dazed: { crouch: .1, lean: .3, twist: .1, head: -.4, rF: .06, rR: .2, rU: .38, lF: .04, lR: -.2, lU: .38, bP: -.4, bY: .3 },
  }),
  // the Morphling's poses: crouch, lean, twist, head; the wrists (bind frame); each tendril's direction (chest frame); the crown
  // (fan: 0 a crown, 1 flung out flat round it; stream: swept back behind a dive), the chamber's gape and the tendrils' curl
  morphPoses: Object.freeze({
    idle: { crouch: .03, lean: .15, twist: 0, head: -.1, lF: .14, lR: -1, lU: .66, rF: .14, rR: 1, rU: .66, ldF: .4, ldR: -.85, ldU: -.25, rdF: .4, rdR: .85, rdU: -.25, fan: 0, gape: .1, curl: .7, stream: 0 },
    rear: { crouch: -.02, lean: -.12, twist: 0, head: .25, lF: .15, lR: -.95, lU: 1.6, rF: .15, rR: .95, rU: 1.6, ldF: .1, ldR: -.55, ldU: .85, rdF: .1, rdR: .55, rdU: .85, fan: .25, gape: .7, curl: .55, stream: 0 },
    slam: { crouch: .25, lean: .55, twist: 0, head: .1, lF: .45, lR: -.55, lU: .55, rF: .45, rR: .55, rU: .55, ldF: .35, ldR: -.1, ldU: -1, rdF: .35, rdR: .1, rdU: -1, fan: .1, gape: .4, curl: .1, stream: 0 },
    spread: { crouch: .05, lean: .05, twist: 0, head: 0, lF: 0, lR: -1.3, lU: 1.05, rF: 0, rR: 1.3, rU: 1.05, ldF: 0, ldR: -1, ldU: .05, rdF: 0, rdR: 1, rdU: .05, fan: 1, gape: .55, curl: 0, stream: 0 },
    reach: { crouch: .06, lean: .3, twist: -.25, head: .05, lF: .15, lR: -.8, lU: .55, rF: .68, rR: .4, rU: 1, ldF: .4, ldR: -.35, ldU: -.8, rdF: 1, rdR: 0, rdU: .02, fan: .15, gape: .3, curl: 0, stream: 0 },
    coil: { crouch: .04, lean: -.05, twist: .35, head: .1, lF: .2, lR: -.8, lU: .6, rF: -.2, rR: .85, rU: 1, ldF: .4, ldR: -.4, ldU: -.7, rdF: .3, rdR: .6, rdU: .7, fan: .2, gape: .5, curl: .6, stream: 0 },
    open: { crouch: 0, lean: -.15, twist: 0, head: .2, lF: .35, lR: -1.05, lU: .95, rF: .35, rR: 1.05, rU: .95, ldF: .35, ldR: -.9, ldU: .2, rdF: .35, rdR: .9, rdU: .2, fan: .55, gape: 1, curl: .2, stream: 0 },
    lunge: { crouch: .25, lean: 1.1, twist: 0, head: .6, lF: -.15, lR: -.8, lU: .6, rF: -.15, rR: .8, rU: .6, ldF: -.3, ldR: -.3, ldU: -1, rdF: -.3, rdR: .3, rdU: -1, fan: 0, gape: 1, curl: 0, stream: 1 },
    writhe: { crouch: .12, lean: .35, twist: 0, head: -.1, lF: .25, lR: -.72, lU: .45, rF: .25, rR: .72, rU: .45, ldF: .3, ldR: -.5, ldU: -.8, rdF: .3, rdR: .5, rdU: -.8, fan: .35, gape: .6, curl: .9, stream: 0 },
    throwR: { crouch: .05, lean: .25, twist: -.35, head: .05, lF: -.05, lR: -.85, lU: .75, rF: .66, rR: .45, rU: 1.15, ldF: -.2, ldR: -.6, ldU: -.6, rdF: 1, rdR: .05, rdU: .15, fan: .3, gape: .4, curl: 0, stream: 0 },
    throwL: { crouch: .05, lean: .25, twist: .35, head: .05, lF: .66, lR: -.45, lU: 1.15, rF: -.05, rR: .85, rU: .75, ldF: 1, ldR: -.05, ldU: .15, rdF: -.2, rdR: .6, rdU: -.6, fan: .3, gape: .4, curl: 0, stream: 0 },
    dazed: { crouch: .15, lean: .45, twist: .1, head: -.4, lF: .15, lR: -.75, lU: .42, rF: .15, rR: .75, rU: .42, ldF: 0, ldR: -.2, ldU: -1, rdF: 0, rdR: .2, rdU: -1, fan: .1, gape: .2, curl: .2, stream: 0 },
  }),
});
const CK = ['crouch', 'lean', 'twist', 'head', 'rF', 'rR', 'rU', 'lF', 'lR', 'lU', 'bP', 'bY'];
const MK = ['crouch', 'lean', 'twist', 'head', 'lF', 'lR', 'lU', 'rF', 'rR', 'rU', 'ldF', 'ldR', 'ldU', 'rdF', 'rdR', 'rdU', 'fan', 'gape', 'curl', 'stream'];
const KN = Math.max(CK.length, MK.length);
const vecs = (table, keys) => Object.freeze(Object.fromEntries(Object.entries(table).map(([n, p]) => { const v = new Float64Array(KN); keys.forEach((k, i) => { v[i] = p[k] || 0; }); return [n, v]; })));
const CPOSE = vecs(LISTENER_RIG.cloakPoses, CK), MPOSE = vecs(LISTENER_RIG.morphPoses, MK);
// indices into a pose vector
const C_ = Object.freeze(Object.fromEntries(CK.map((k, i) => [k, i]))), M_ = Object.freeze(Object.fromEntries(MK.map((k, i) => [k, i])));

// ------------------------------------------------------------------------------------------------ the skeleton
// One hierarchy of 40 bones. The tendrils, claws, jaw, chamber, crown and pool carry the Morphling only; the robed figure uses
// the trunk, arms (its blade on the right hand) and legs. Limbs and tendrils are bound hanging (-u toward the child), the
// crown pointing up (+u toward the child).
const TENT = [];
for (const [tag, s] of [['L', -1], ['R', 1]]) for (let j = 0; j < 3; j++) TENT.push({ tag, s, j, a: `back${tag}${j}a`, b: `back${tag}${j}b` });
function bones(fit) {
  const M = LISTENER_RIG.morph, cl = fit === 'cloak';
  return [
    { name: 'root', parent: null, at: [0, 0, 0] },
    { name: 'pelvis', parent: 'root', at: cl ? [0, 0, .46] : [0, 0, .54] },
    { name: 'chest', parent: 'pelvis', at: cl ? [0, 0, .3] : [.02, 0, .42] },
    { name: 'head', parent: 'chest', at: cl ? [.01, 0, .2] : [.16, 0, .36] },
    ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
      return [
        { name: 'arm' + tag, parent: 'chest', at: cl ? [0, s * .19, .05] : [-.02, s * .62, .16] },
        { name: 'fore' + tag, parent: 'arm' + tag, at: [0, 0, -(cl ? LISTENER_RIG.cloak.upperArm : M.upperArm)] },
        { name: 'hand' + tag, parent: 'fore' + tag, at: [0, 0, -(cl ? LISTENER_RIG.cloak.foreArm : M.foreArm)] },
        { name: 'ten' + tag + '0', parent: 'hand' + tag, at: [0, 0, -.08] },
        { name: 'ten' + tag + '1', parent: 'ten' + tag + '0', at: [0, 0, -.2] },
        { name: 'ten' + tag + '2', parent: 'ten' + tag + '1', at: [0, 0, -.2] },
        { name: 'claw' + tag, parent: 'ten' + tag + '2', at: [0, 0, -.16] },
      ]; }),
    { name: 'jawU', parent: 'tenR2', at: [0, 0, -.1] }, { name: 'jawD', parent: 'tenR2', at: [0, 0, -.1] },
    { name: 'maw', parent: 'chest', at: cl ? [.1, 0, -.1] : [.27, 0, -.14] },
    ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
      return [
        { name: 'thigh' + tag, parent: 'pelvis', at: cl ? [0, s * .08, -.02] : [0, s * .2, -.04] },
        { name: 'shin' + tag, parent: 'thigh' + tag, at: [0, 0, -(cl ? LISTENER_RIG.cloak.thigh : M.thigh)] },
        { name: 'hock' + tag, parent: 'shin' + tag, at: [0, 0, -(cl ? LISTENER_RIG.cloak.shin : M.shin)] },
      ]; }),
    ...TENT.flatMap(({ a, b, s, j }) => [{ name: a, parent: 'chest', at: [-.2, s * (.18 + j * .13), .2 - j * .06] }, { name: b, parent: a, at: [0, 0, M.tentacle[j] * .5] }]),
    { name: 'pool', parent: 'root', at: [0, 0, .02] },
  ];
}
export const MORPH_FIT = defineSkeleton(bones('morph'));
export const CLOAK_FIT = defineSkeleton(bones('cloak'));
export const LISTENER_SKELETON = MORPH_FIT;
const BI = MORPH_FIT.index;
// emissive channels: 1 the void face / the chamber's core and the jaw's eye; 2 the blade and the face's ring / the optics
const E_FACE = 1, E_EDGE = 2;

// ------------------------------------------------------------------------------------------------ mesh helpers
const hexOf = (c) => parseInt(String(c).slice(1), 16);
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// A tube through cross-sections in model bind space, like the rig's loft, but each vertex may blend its own pair of bones:
// sections [{ at, rx, rz, bones: [a, b, w] | (k, cos, sin) => [a, b, w] }]. Every ring keeps a radius (no point ends), so
// every normal is well defined; the ends are capped unless `caps: false`.
function tube(B, S, o) {
  const d = B.detail, seg = Math.max(o.minSeg || 4, Math.round((o.seg || 10) * (d >= 1 ? 1 : d >= .6 ? .7 : .5))), rings = [];
  const pick = (sec, k, ct, st) => typeof sec.bones === 'function' ? sec.bones(k, ct, st) : sec.bones;
  const frames = [];
  for (let i = 0; i < S.length; i++) {
    const c = S[i].at, prev = S[Math.max(0, i - 1)].at, next = S[Math.min(S.length - 1, i + 1)].at, t = norm3(sub3(next, prev));
    let side = cross3(o.up || [1, 0, 0], t); if (Math.hypot(side[0], side[1], side[2]) < 1e-4) side = [0, 1, 0]; side = norm3(side);
    const up = norm3(cross3(t, side)), rx = Math.max(.003, S[i].rx), rz = Math.max(.003, S[i].rz ?? S[i].rx);
    const rp = S[Math.max(0, i - 1)], rn = S[Math.min(S.length - 1, i + 1)], span3 = Math.hypot(...sub3(next, prev)) || 1;
    const slope = ((rp.rx + (rp.rz ?? rp.rx)) - (rn.rx + (rn.rz ?? rn.rx))) / 2 / span3;
    frames.push({ c, t, side, up });
    const row = [];
    for (let k = 0; k < seg; k++) {
      const th = (k / seg) * Math.PI * 2 + (o.phase || 0), ct = Math.cos(th), st = Math.sin(th);
      const n = norm3([side[0] * ct / rx + up[0] * st / rz, side[1] * ct / rx + up[1] * st / rz, side[2] * ct / rx + up[2] * st / rz]);
      const [a, b, w] = pick(S[i], k, ct, st);
      row.push(B.vertexBlend(c[0] + side[0] * ct * rx + up[0] * st * rz, c[1] + side[1] * ct * rx + up[1] * st * rz, c[2] + side[2] * ct * rx + up[2] * st * rz,
        n[0] + t[0] * slope, n[1] + t[1] * slope, n[2] + t[2] * slope, a, b ?? a, w || 0, o.tone ? o.tone(i, k, st, ct) : null));
    }
    rings.push(row);
  }
  for (let i = 0; i < rings.length - 1; i++) { const a = rings[i], b = rings[i + 1];
    for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; B.tri(a[k], a[k2], b[k2]); B.tri(a[k], b[k2], b[k]); } }
  if (o.caps !== false) for (const [i, sgn] of [[0, -1], [rings.length - 1, 1]]) {
    const f = frames[i], [a, b, w] = pick(S[i], 0, 1, 0), r = rings[i];
    const ctr = B.vertexBlend(f.c[0], f.c[1], f.c[2], f.t[0] * sgn, f.t[1] * sgn, f.t[2] * sgn, a, b ?? a, w || 0, o.tone ? o.tone(i, 0, sgn, 0) : null);
    for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg; if (sgn > 0) B.tri(r[k], r[k2], ctr); else B.tri(r[k2], r[k], ctr); }
  }
  return B;
}

// ------------------------------------------------------------------------------------------------ the robed figure
// BODY.listener's palette ["#3b3550", "#0d0b14", "#c9a6ff", "#f3eaff"]: robe shading from dusk violet to near black, a violet
// face and ring, a pale blade
const CC = Object.freeze({ robe: hexOf('#3b3550'), robeLit: hexOf('#554c72'), dark: hexOf('#0d0b14'), mid: hexOf('#221d31'), violet: hexOf('#c9a6ff'), deep: hexOf('#6b4fa8'), pale: hexOf('#f3eaff') });
function buildCloakMesh(tier) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(CLOAK_FIT, d), bw = CLOAK_FIT.bindWorld;
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  const W = (bone) => [bw[BI[bone] * 3], bw[BI[bone] * 3 + 1], bw[BI[bone] * 3 + 2]];
  // The robe: one hide from the shoulders to the floor, the upper part on the chest and pelvis, the skirt below the knees
  // following each leg on its own side (so the hem swings with the steps). Lit dusk violet on the front and shoulders, near
  // black toward the hem and the back, as the standard view's shading.
  const skirt = (wl) => (k, ct) => { const side = ct < 0 ? 'L' : 'R', q = Math.abs(ct); return ['pelvis', 'shin' + side, wl * q]; };
  const ROBE = [
    [.86, .12, .08, ['chest', 'chest', 0]], [.8, .2, .12, ['chest', 'chest', 0]], [.7, .2, .13, ['chest', 'chest', 0]], [.58, .19, .13, ['pelvis', 'chest', .5]],
    [.46, .2, .14, ['pelvis', 'pelvis', 0]], [.34, .22, .16, skirt(.15)], [.2, .25, .18, skirt(.4)], [.08, .28, .2, skirt(.6)], [.015, .3, .21, skirt(.7)],
  ].filter((_, i) => !low || i % 2 === 0 || i === 8);
  B.color(CC.robe);
  tube(B, ROBE.map(([z, rr, rf, bn]) => ({ at: [0, 0, z], rx: rr, rz: rf, bones: bn })), { seg: low ? 8 : full ? 18 : 12, up: [1, 0, 0],
    tone: (i, k, st, ct) => { const front = .5 + .5 * st, top = 1 - i / (ROBE.length - 1); return lerpHex(lerpHex(CC.dark, CC.mid, top), lerpHex(CC.robe, CC.robeLit, top), front * (.45 + .55 * top)); }, caps: false });
  // the hem's underside, so a low eye sees cloth, not the inside of the skirt
  B.bone('root').color(CC.dark).ellipsoid({ at: [0, 0, .016], radius: [.21, .3, .008], rings: 2, seg: low ? 8 : 14 });
  // feet, peeking from under the hem
  for (const tag of ['L', 'R']) B.bone('hock' + tag).color(CC.dark).ellipsoid({ at: [.05, 0, -.02], radius: [.09, .045, .035], rings: 3, seg: low ? 5 : 8 });
  // the sleeves: wide, hanging from the shoulder, a dark cuff; small dark hands
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const a = W('arm' + tag), f = W('fore' + tag), h = W('hand' + tag);
    B.color(CC.robe);
    tube(B, [[a, .075, 'arm' + tag, 'arm' + tag, 0], [[(a[0] + f[0]) / 2, (a[1] + f[1]) / 2, (a[2] + f[2]) / 2], .065, 'arm' + tag, 'arm' + tag, 0], [f, .062, 'arm' + tag, 'fore' + tag, .5],
      [[h[0], h[1], h[2] + .08], .085, 'fore' + tag, 'fore' + tag, 0], [[h[0], h[1], h[2] + .03], .095, 'fore' + tag, 'fore' + tag, 0]].map(([p, r, x, y, w]) => ({ at: p, rx: r, rz: r, bones: [x, y, w] })),
    { seg: low ? 6 : 10, up: [1, 0, 0], tone: (i, k, st, ct) => i >= 4 ? CC.dark : lerpHex(CC.mid, CC.robeLit, .4 + .4 * ct * s), caps: true });
    B.bone('hand' + tag).color(CC.dark).ellipsoid({ at: [0, 0, -.03], radius: [.04, .035, .05], rings: 3, seg: low ? 5 : 8 });
  }
  // the pale blade from the right hand: a narrow lance of light along the hand's -u (the pose aims it); a short guard
  B.bone('handR').color(CC.deep).box({ at: [0, 0, -.06], size: [.012, .05, .012], bevel: 0 });
  B.bone('handR').color(CC.pale, E_EDGE).lathe({ at: [0, 0, -.06], F: [0, 0, -1], U: [1, 0, 0], rings: [[0, .016], [.42, .012], [.52, .003]], rs: .45, seg: low ? 4 : 6, caps: true });
  // the head: a round dark head in a hood, the hood's ring of violet round a violet void of a face
  B.bone('head').color(CC.dark).ellipsoid({ at: [0, 0, 0], radius: [.16, .16, .17], rings: low ? 4 : 7, seg: low ? 8 : 14 });
  // the hood: a shell drawn over the crown and back, peaked a little behind
  B.bone('head').color(CC.robe).ellipsoid({ at: [-.03, 0, .015], radius: [.165, .19, .18], rings: low ? 4 : 6, seg: low ? 8 : 14, F: [1, 0, -.12], U: [.12, 0, 1] });
  B.bone('head').color(CC.robe).ellipsoid({ at: [-.1, 0, -.1], radius: [.1, .15, .14], rings: low ? 3 : 5, seg: low ? 7 : 12, F: [1, 0, .5], U: [-.5, 0, 1] });
  // the ring round the face opening (the standard view's violet outline) and the void (the violet face, a deeper inner well)
  const fx = .155, fz = -.005;
  B.bone('head').color(CC.violet, E_FACE).lathe({ at: [fx - .02, 0, fz], F: [1, 0, 0], U: [0, 0, 1], rings: [[0, .118], [.012, .122], [.024, .112]], rs: 1.25, us: .95, seg: low ? 10 : 18, caps: false, smooth: true });
  B.bone('head').color(CC.dark).ellipsoid({ at: [fx - .005, 0, fz], radius: [.03, .13, .1], rings: 3, seg: low ? 10 : 16 });
  B.bone('head').color(CC.violet, E_FACE).ellipsoid({ at: [fx + .016, 0, fz], radius: [.018, .1, .06], rings: 3, seg: low ? 10 : 16 });
  if (!low) B.bone('head').color(CC.deep, E_FACE).ellipsoid({ at: [fx + .024, 0, fz], radius: [.012, .06, .034], rings: 3, seg: 12 });
  if (full) B.bone('head').color(CC.pale, E_FACE).ellipsoid({ at: [fx + .03, 0, fz + .008], radius: [.006, .022, .01], rings: 2, seg: 8 });
  // the shoulders' drape: a cowl over the yoke, so the hood sits in the robe
  B.bone('chest').color(CC.robe).ellipsoid({ at: at('chest', [-.01, 0, .84]), radius: [.15, .23, .07], rings: low ? 3 : 5, seg: low ? 8 : 14 });
  return B.done();
}

// ------------------------------------------------------------------------------------------------ the Morphling
// MORPH_INK (monster-render.ts), and the iron, hoses and optics of its head
const MC = Object.freeze({ flesh: hexOf('#3a1d44'), mid: hexOf('#2a1433'), deep: hexOf('#110812'), sheen: hexOf('#9a62b0'), rim: hexOf('#e08cff'), vein: hexOf('#c45cff'),
  core: hexOf('#ff7be6'), coreHot: hexOf('#fff0fb'), eye: hexOf('#ff4fd8'), bone: hexOf('#e2d6c0'), cable: hexOf('#262a33'), sucker: hexOf('#c98fd0'), maw: hexOf('#0a0309'),
  iron: hexOf('#4e4a45'), ironLit: hexOf('#8d877c'), ironDark: hexOf('#1f1c1b'), rust: hexOf('#7a4a2c'), hose: hexOf('#3b3634'), lens: hexOf('#ff6a2a'), lensRed: hexOf('#ff5a3a'), hoof: hexOf('#18121a') });
function buildMorphMesh(tier) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(MORPH_FIT, d), bw = MORPH_FIT.bindWorld, M = LISTENER_RIG.morph;
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  const W = (bone) => [bw[BI[bone] * 3], bw[BI[bone] * 3 + 1], bw[BI[bone] * 3 + 2]];
  const fleshTone = (lit) => (i, k, st, ct) => lerpHex(MC.mid, lerpHex(MC.flesh, MC.sheen, lit ? .35 : .15), clamp01(.4 + .4 * st + .2 * ct));
  const muscle = (bone, p, r, F, U, lit = .5) => B.bone(bone).color(lerpHex(MC.mid, lerpHex(MC.flesh, MC.sheen, .35), .4 + .6 * lit)).ellipsoid({ at: at(bone, p), radius: r, rings: low ? 3 : 4, seg: low ? 6 : 9, F, U });
  // The torso: a V from a narrow waist to massive shoulders, lit high on the front, dark below and behind
  const TORSO = [[.46, .2, .16, ['pelvis', 'pelvis', 0]], [.58, .24, .18, ['pelvis', 'pelvis', 0]], [.72, .34, .22, ['pelvis', 'chest', .6]], [.86, .5, .27, ['chest', 'chest', 0]],
    [1, .6, .3, ['chest', 'chest', 0]], [1.12, .6, .28, ['chest', 'chest', 0]], [1.22, .42, .22, ['chest', 'chest', 0]], [1.28, .2, .16, ['chest', 'chest', 0]]].filter((_, i) => !low || i % 2 === 1 || i === 0);
  B.color(MC.flesh);
  tube(B, TORSO.map(([z, rr, rf, bn]) => ({ at: [-.02, 0, z], rx: rr, rz: rf, bones: bn })), { seg: low ? 8 : full ? 16 : 12, up: [1, 0, 0],
    tone: (i, k, st) => lerpHex(lerpHex(MC.deep, MC.mid, i / TORSO.length), lerpHex(MC.flesh, MC.sheen, i / TORSO.length), clamp01(.5 + .6 * st)) });
  // the muscles: traps, deltoids, pectorals, the ridged abdomen
  for (const s of [-1, 1]) {
    muscle('chest', [-.04, s * .3, 1.2], [.2, .24, .1], [1, 0, 0], [0, -s * .35, 1], .35);
    muscle('arm' + (s < 0 ? 'L' : 'R'), [0, s * .64, 1.08], [.2, .19, .2], [1, 0, 0], [0, 0, 1], .55);
    muscle('chest', [.16, s * .23, 1.0], [.12, .24, .16], [1, 0, .15], [-.15, 0, 1], .6);
    if (!low) for (let r = 0; r < 3; r++) muscle('pelvis', [.13 - r * .01, s * .085, .8 - r * .12], [.05, .075, .06], [1, 0, 0], [0, 0, 1], .4);
  }
  // The chamber between the pectorals: a dark split rimmed in teeth, its core glowing (the maw bone opens it)
  B.bone('maw').color(MC.maw).ellipsoid({ at: [0, 0, 0], radius: [.05, .07, .24], rings: low ? 3 : 5, seg: low ? 6 : 10 });
  B.bone('maw').color(MC.core, E_FACE).ellipsoid({ at: [.02, 0, 0], radius: [.04, .045, .17], rings: 3, seg: low ? 6 : 8 });
  if (!low) B.bone('maw').color(MC.coreHot, E_FACE).ellipsoid({ at: [.045, 0, 0], radius: [.012, .018, .08], rings: 2, seg: 6 });
  for (let i = 0; i < (low ? 3 : full ? 7 : 5); i++) for (const s of [-1, 1]) { const z = -.2 + i * (.4 / ((low ? 3 : full ? 7 : 5) - 1));
    B.bone('chest').color(MC.bone).lathe({ at: at('chest', [W('maw')[0] + .02, s * .075, W('maw')[2] + z]), F: [.2, -s, 0], U: [0, 0, 1], rings: [[0, .022], [.05, .003]], seg: 4, minSeg: 3, caps: true }); }
  // The arms: deltoid on the shoulder, a heavy upper arm and bicep, the forearm, a swelling wrist, and the tendril out of it,
  // ridged and suckered, tapering to a curling tip; claws on the end (the left; the right shows the jaw when it bites)
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const a = W('arm' + tag), f = W('fore' + tag), h = W('hand' + tag), t0 = W('ten' + tag + '0'), t1 = W('ten' + tag + '1'), t2 = W('ten' + tag + '2'), cw = W('claw' + tag);
    B.color(MC.flesh);
    tube(B, [[a, .16, 'arm' + tag, 'arm' + tag, 0], [[a[0], a[1], a[2] - .2], .15, 'arm' + tag, 'arm' + tag, 0], [f, .125, 'arm' + tag, 'fore' + tag, .5],
      [[f[0], f[1], f[2] - .14], .14, 'fore' + tag, 'fore' + tag, 0], [h, .1, 'fore' + tag, 'hand' + tag, .5]].map(([p, r, x, y, w]) => ({ at: p, rx: r, rz: r * 1.08, bones: [x, y, w] })),
    { seg: low ? 7 : full ? 12 : 10, up: [1, 0, 0], tone: fleshTone(s < 0), caps: false });
    muscle('arm' + tag, [a[0] + .07, a[1], a[2] - .2], [.12, .12, .16], [1, 0, 0], [0, 0, 1], s < 0 ? .75 : .45);
    muscle('fore' + tag, [f[0], f[1], f[2]], [.12, .12, .1], [1, 0, 0], [0, 0, 1], .5);
    muscle('hand' + tag, [h[0], h[1], h[2] - .02], [.12, .12, .1], [1, 0, 0], [0, 0, 1], .55);
    // the tendril
    const TD = [[[h[0], h[1], h[2] - .04], .1, 'hand' + tag, 'hand' + tag, 0], [t0, .09, 'hand' + tag, 'ten' + tag + '0', .6], [[t0[0], t0[1], (t0[2] + t1[2]) / 2], .078, 'ten' + tag + '0', 'ten' + tag + '0', 0],
      [t1, .066, 'ten' + tag + '0', 'ten' + tag + '1', .5], [[t1[0], t1[1], (t1[2] + t2[2]) / 2], .056, 'ten' + tag + '1', 'ten' + tag + '1', 0], [t2, .047, 'ten' + tag + '1', 'ten' + tag + '2', .5],
      [[t2[0], t2[1], (t2[2] + cw[2]) / 2], .04, 'ten' + tag + '2', 'ten' + tag + '2', 0], [cw, .034, 'ten' + tag + '2', 'ten' + tag + '2', 0]].filter((_, i) => !low || i % 2 === 1 || i === 0 || i === 7);
    B.color(MC.flesh);
    tube(B, TD.map(([p, r, x, y, w]) => ({ at: p, rx: r, rz: r, bones: [x, y, w] })), { seg: low ? 6 : full ? 11 : 8, up: [1, 0, 0],
      tone: (i, k, st, ct) => (i % 2 ? lerpHex(MC.mid, MC.flesh, .5 + .5 * st) : lerpHex(MC.flesh, MC.sheen, .3 + .4 * st)) });
    // suckers along the tendril's underside
    if (!low) for (let i = 0; i < (full ? 5 : 4); i++) { const q = (i + .5) / (full ? 5 : 4), z = h[2] - .08 - q * (h[2] - cw[2] - .1), bone = q < .3 ? 'ten' + tag + '0' : q < .62 ? 'ten' + tag + '1' : 'ten' + tag + '2', r = .085 - q * .05;
      B.bone(bone).color(MC.sucker).ellipsoid({ at: at(bone, [h[0] - r * .8, h[1], z]), radius: [.012, r * .38, r * .38], rings: 2, seg: 6, F: [-1, 0, 0], U: [0, 0, 1] }); }
    // the claws: four hooked bone claws round the tendril's end
    const claws = low ? 3 : 4;
    for (let c = 0; c < claws; c++) { const ang = (c / claws) * Math.PI * 2 + .4, ca = Math.cos(ang), sa = Math.sin(ang);
      B.bone('claw' + tag).color(MC.bone).lathe({ at: [ca * .03, sa * .03, .01], F: [ca * .55, sa * .55, -1], U: [-ca, -sa, 0], rings: [[0, .022], [.07, .014], [.13, .003]], seg: 4, minSeg: 3, caps: true });
      B.bone('claw' + tag).color(MC.bone).lathe({ at: [ca * .1, sa * .1, -.1], F: [-ca * .4, -sa * .4, -1], U: [ca, sa, 0], rings: [[0, .013], [.06, .002]], seg: 4, minSeg: 3, caps: true }); }
  }
  // the dragon's jaw on the right tendril (shown as it bites or reaches): upper and lower jaws of flesh, a row of teeth, an eye
  for (const [bone, sgn] of [['jawU', 1], ['jawD', -1]]) {
    B.bone(bone).color(MC.flesh).box({ at: [sgn * .04, 0, -.13], size: [.035, .07, .14], bevel: .2, taper: .5, F: [1, 0, 0], U: [0, 0, -1] });
    for (let i = 0; i < (low ? 2 : 4); i++) B.bone(bone).color(MC.bone).lathe({ at: [sgn * .005, (i % 2 ? .04 : -.04), -.04 - i * .05], F: [-sgn, 0, 0], U: [0, 0, 1], rings: [[0, .014], [.04, .002]], seg: 4, minSeg: 3, caps: true });
  }
  B.bone('jawU').color(MC.eye, E_FACE).ellipsoid({ at: [.07, .05, -.08], radius: [.02, .02, .02], rings: 2, seg: 6 });
  // The head: a hunched skull of flesh caged in riveted iron, a slatted grille over the jaw, mismatched optics
  B.bone('head').color(MC.flesh).ellipsoid({ at: [0, 0, 0], radius: [.17, .16, .17], rings: low ? 4 : 6, seg: low ? 8 : 12 });
  B.bone('head').color(MC.iron).ellipsoid({ at: [-.03, 0, .055], radius: [.17, .17, .13], rings: low ? 3 : 5, seg: low ? 8 : 12, F: [1, 0, -.2], U: [.2, 0, 1] });
  B.bone('head').color(MC.ironLit).box({ at: [.04, 0, .15], size: [.12, .012, .012], bevel: 0, F: [1, 0, -.3], U: [.3, 0, 1] });
  if (!low) for (const [f, r, u] of [[.1, -.1, .1], [.12, .1, .08], [-.05, -.15, .12], [-.06, .15, .12], [.02, 0, .18], [-.14, 0, .14]]) B.bone('head').color(MC.ironLit).ellipsoid({ at: [f, r, u], radius: [.012, .012, .012], rings: 2, seg: 4 });
  if (full) for (const [f, r, u] of [[.05, -.13, .1], [-.08, .1, .16]]) B.bone('head').color(MC.rust).ellipsoid({ at: [f, r, u], radius: [.03, .03, .012], rings: 2, seg: 6, U: [0, 0, 1] });
  B.bone('head').color(MC.iron).box({ at: [.13, 0, -.1], size: [.05, .1, .07], bevel: .15, taper: .3, F: [1, 0, 0], U: [0, 0, -1] });
  if (!low) for (let i = -2; i <= 2; i++) B.bone('head').color(MC.ironDark).box({ at: [.182, i * .035, -.1], size: [.006, .007, .06], bevel: 0 });
  // the optics: one big dull lens in an iron socket, a cluster of three small ones
  B.bone('head').color(MC.ironDark).ellipsoid({ at: [.14, .07, .0], radius: [.03, .06, .06], rings: 3, seg: low ? 6 : 10, F: [1, 0, 0], U: [0, 0, 1] });
  B.bone('head').color(MC.lens, E_EDGE).ellipsoid({ at: [.165, .07, .0], radius: [.018, .042, .042], rings: 3, seg: low ? 6 : 10, F: [1, 0, 0], U: [0, 0, 1] });
  for (const [r, u, sz] of [[-.075, .01, .022], [-.1, -.02, .015], [-.055, -.025, .013]].slice(0, low ? 1 : 3)) {
    B.bone('head').color(MC.ironDark).ellipsoid({ at: [.15, r, u], radius: [.012, sz + .008, sz + .008], rings: 2, seg: 6 });
    B.bone('head').color(MC.lensRed, E_EDGE).ellipsoid({ at: [.16, r, u], radius: [.01, sz, sz], rings: 2, seg: 6 }); }
  // hoses from the grille down into the shoulders, and cables from the back of the skull
  const hd = W('head');
  if (!low) for (const s of [-1, 1]) {
    B.color(MC.hose);
    tube(B, [[[hd[0] + .1, hd[1] + s * .07, hd[2] - .16], 'head', 'head', 0], [[hd[0] + .08, hd[1] + s * .17, hd[2] - .26], 'head', 'chest', .5], [[hd[0] + .02, s * .27, hd[2] - .3], 'chest', 'chest', 0], [[hd[0] - .06, s * .34, 1.06], 'chest', 'chest', 0]]
      .map(([p, x, y, w]) => ({ at: p, rx: .034, rz: .034, bones: [x, y, w] })), { seg: 6, minSeg: 4, up: [0, 0, 1], tone: (i) => (i % 2 ? MC.ironLit : MC.hose) });
    B.color(MC.cable);
    tube(B, [[[hd[0] - .12, hd[1] + s * .08, hd[2] + .05], 'head', 'head', 0], [[hd[0] - .26, s * .2, hd[2] - .06], 'head', 'chest', .6], [[-.2, s * .4, 1.18], 'chest', 'chest', 0]]
      .map(([p, x, y, w]) => ({ at: p, rx: .014, rz: .014, bones: [x, y, w] })), { seg: 4, minSeg: 4, up: [0, 0, 1], tone: () => MC.cable });
  }
  // Goat's legs: a heavy thigh, a backward-bent shank, a cannon down to a cloven hoof
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const th = W('thigh' + tag), sh = W('shin' + tag), hk = W('hock' + tag), hf = [hk[0], hk[1], hk[2] - M.cannon];
    B.color(MC.flesh);
    tube(B, [[[th[0], th[1], th[2] + .05], .19, 'thigh' + tag, 'thigh' + tag, 0], [[th[0], th[1], th[2] - .1], .17, 'thigh' + tag, 'thigh' + tag, 0], [sh, .1, 'thigh' + tag, 'shin' + tag, .5],
      [[sh[0], sh[1], (sh[2] + hk[2]) / 2], .07, 'shin' + tag, 'shin' + tag, 0], [hk, .06, 'shin' + tag, 'hock' + tag, .5], [[hf[0], hf[1], hf[2] + .025], .048, 'hock' + tag, 'hock' + tag, 0]]
      .filter((_, i) => !low || i !== 3).map(([p, r, x, y, w]) => ({ at: p, rx: r, rz: r * 1.1, bones: [x, y, w] })), { seg: low ? 7 : full ? 12 : 9, up: [1, 0, 0], tone: fleshTone(s < 0), caps: true });
    muscle('thigh' + tag, [th[0] + .05, th[1] + s * .04, th[2] - .08], [.15, .13, .17], [1, 0, 0], [0, 0, 1], s < 0 ? .75 : .4);
    for (const dd of [-1, 1]) B.bone('hock' + tag).color(MC.hoof).box({ at: [.03, dd * .028, -M.cannon + .01], size: [.05, .024, .025], bevel: .2, taper: .3 });
  }
  // The crown: six back tentacles, thick at the root, tapering and suckered (the middle ones)
  for (const { j, a, b } of TENT) {
    const A = W(a), len = M.tentacle[j], r0 = .13 - j * .016;
    const n = low ? 4 : full ? 7 : 6, secs = [];
    for (let i = 0; i <= n; i++) { const q = i / n, z = A[2] + len * q, w = smooth(span(q, .2, .8));
      secs.push({ at: [A[0], A[1], z], rx: Math.max(.012, r0 * (1 - .88 * Math.pow(q, .85))), rz: Math.max(.012, r0 * (1 - .88 * Math.pow(q, .85))), bones: [a, b, w] }); }
    B.color(MC.flesh);
    tube(B, secs, { seg: low ? 5 : full ? 8 : 7, minSeg: 4, up: [1, 0, 0], tone: (i, k, st) => lerpHex(MC.mid, lerpHex(MC.flesh, MC.sheen, .35), clamp01(.25 + .45 * st + (i % 2 ? .12 : 0) - i * .04)) });
    if (j === 1 && !low) for (let i = 1; i < (full ? 6 : 4); i++) { const q = i / (full ? 6 : 4), bone = q < .5 ? a : b, r = r0 * (1 - .88 * Math.pow(q, .85));
      B.bone(bone).color(MC.sucker).ellipsoid({ at: at(bone, [A[0] + r * .85, A[1], A[2] + len * q]), radius: [.008, r * .45, r * .45], rings: 2, seg: 5, F: [1, 0, 0], U: [0, 0, 1] }); }
  }
  // The pool it sinks into: a low dark mound of flesh, a violet heart welling in it, a few tips curling out of the surface
  B.bone('pool').color(MC.deep).ellipsoid({ at: [0, 0, 0], radius: [.6, .6, .07], rings: 3, seg: low ? 10 : 14 });
  B.bone('pool').color(MC.mid).ellipsoid({ at: [.05, -.04, .03], radius: [.42, .4, .06], rings: 3, seg: low ? 8 : 12 });
  B.bone('pool').color(MC.vein, E_EDGE).ellipsoid({ at: [0, 0, .06], radius: [.16, .14, .03], rings: 2, seg: low ? 6 : 10 });
  for (let i = 0; i < (low ? 3 : 5); i++) { const a = i * 1.3, r = .26 + .12 * (i % 2), x = Math.cos(a) * r, y = Math.sin(a) * r, h = .26 + .1 * (i % 3), cx = Math.cos(a + 1.4), cy = Math.sin(a + 1.4);
    B.color(MC.flesh);
    tube(B, [[0, .05], [.35, .042], [.7, .03], [1, .014]].map(([q, rr]) => ({ at: [x + cx * .1 * q * q + Math.cos(a) * .05 * q, y + cy * .1 * q * q + Math.sin(a) * .05 * q, .04 + h * Math.sin(q * 1.4) / Math.sin(1.4)], rx: rr, rz: rr, bones: ['pool', 'pool', 0] })),
      { seg: low ? 4 : 5, minSeg: 4, up: [0, 0, 1], tone: (k2) => (k2 % 2 ? MC.sheen : MC.flesh) }); }
  return B.done();
}
const MESHES = { cloak: { full: null, balanced: null, low: null }, morph: { full: null, balanced: null, low: null } };
// (function declarations: the roster reads these while monster-pack.ts, which this module imports, is still loading)
export function cloakMesh(tier = 'full') { return MESHES.cloak[tier] ||= buildCloakMesh(tier); }
export function morphMesh(tier = 'full') { return MESHES.morph[tier] ||= buildMorphMesh(tier); }
// Which body the game's state shows: the Morphling once its walls stand (listenerPhase "walled"), else the robed figure.
export function listenerForm(e) { return e?.listenerPhase === 'walled' ? 'morph' : 'cloak'; }
// The roster's mesh: the body this Listener shows (close-view.ts prepares the one it will draw).
export function listenerMesh(tier = 'full', e = null) { return listenerForm(e) === 'morph' ? morphMesh(tier) : cloakMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createListenerTrack() {
  return {
    pose: createPose(MORPH_FIT), form: '', formAt: -Infinity,
    gait: createGait([{ side: -.08, phase: .5 }, { side: .08, phase: 0 }]),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(KN), shown: new Float64Array(KN),
    hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null, x: 0, y: 0, z: 0, contactWas: 0, strikeAt: -Infinity,
    // the Morphling's move, seen on the render clock: when it began, the barbs fired, its spin, the sink and the rise
    mKey: '', mAt: -Infinity, fired: 0, throwAt: -Infinity, throwSide: 1, spin: 0, sunk: false, sink: 0, riseAt: -Infinity,
    frame: { kind: 'listener', tier: 'full', mesh: null, skin: null, boneCount: MORPH_FIT.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ what it is doing
const V = new Float64Array(KN), Wv = new Float64Array(KN);
const ACT = { form: 'cloak', aim: false, aimX: 0, aimY: 0, watch: false, still: false, phase: '', glow: 0, contact: 0, shimmer: 0,
  jaw: 0, jawShow: 0, reach: 0, reachX: 0, reachY: 0, stretch: 0, spin: false, yawLock: NaN, cables: null, sink: 0, writhe: 0, slam: 0 };
const TBL = { cloak: CPOSE, morph: MPOSE };
const setVec = (n) => V.set(TBL[ACT.form][n] || TBL[ACT.form].idle);
function lerpVec(a, b, t) { const T = TBL[ACT.form], A = T[a] || T.idle, Bv = T[b] || T.idle; for (let k = 0; k < KN; k++) V[k] = A[k] + (Bv[k] - A[k]) * t; }
function lerpInto(b, t) { const T = TBL[ACT.form], Bv = T[b] || T.idle; for (let k = 0; k < KN; k++) V[k] += (Bv[k] - V[k]) * t; }
// progress through the current phase (0 at its start, 1 at its end) on the game's own attack clock
function phaseOf(pack, id) {
  const m = ATTACK_MODULES[id] || {}, ph = pack.phase;
  const dur = ph === 'windup' ? (m.windup || .5) * (pack.paced ? BOSS_PACE.windup : 1) : ph === 'active' ? m.active || 0 : ph === 'strike' ? LISTENER_RIG.strikeMs / 1000 : ph === 'recover' ? m.recover || .5 : 0;
  return dur > 0 ? clamp01(1 - (Number(pack.t) || 0) / dur) : 1;
}
// a committed blow: anticipation to `wind` over the first `load` of the windup, the fast travel to `hit` at its end (the
// contact); the recover holds the blow, then eases home
function blow(ph, x, wind, hit, load = .7, home = 'idle') {
  if (ph === 'windup') { if (x < load) lerpVec(home, wind, smooth(x / load)); else lerpVec(wind, hit, easeIn(span(x, load, 1))); ACT.glow = x; ACT.contact = x > .97 ? 1 : 0; }
  else { setVec(hit); lerpInto(home, smooth(span(x, .3, 1))); ACT.glow = 1 - x; if (x < .08) ACT.contact = 1; }
}
function resetAct(form) {
  ACT.form = form; ACT.aim = false; ACT.watch = false; ACT.still = false; ACT.phase = 'move'; ACT.glow = 0; ACT.contact = 0; ACT.shimmer = 0;
  ACT.jaw = 0; ACT.jawShow = 0; ACT.reach = 0; ACT.stretch = 0; ACT.spin = false; ACT.yawLock = NaN; ACT.cables = null; ACT.sink = 0; ACT.writhe = 0; ACT.slam = 0;
}
function aimAt(e, px, py) { const dx = px - e.x, dy = py - e.y, l = Math.hypot(dx, dy); if (l > .01) { ACT.aimX = dx / l; ACT.aimY = dy / l; ACT.aim = true; } }
function aimData(e, s, target) {
  const a = s?.data?.aim; if (a && Number.isFinite(a.x) && Number.isFinite(a.y) && Math.hypot(a.x, a.y) > .01) { ACT.aimX = a.x; ACT.aimY = a.y; ACT.aim = true; }
  else if (target) aimAt(e, target.x, target.y);
}
// The robed figure: its blade on the pack's clocks
function actCloak(e, target) {
  const s = e.pack, id = s?.attack, ph = s?.phase, x = id ? phaseOf(s, id) : 0;
  if (!id) { setVec('idle'); ACT.watch = true; return; }
  ACT.still = true; ACT.phase = `${id}:${ph}`; aimData(e, s, target);
  if (id === 'clawSweep') blow(ph, x, 'sweepWind', 'sweepEnd', .72);
  else if (id === 'longStab' || id === 'bite') blow(ph, x, 'stabWind', 'stabEnd', .74);
  else if (id === 'blinkStrike') {
    // the shimmer as it gathers itself; it is behind you when the strike phase begins: raised, then cut down
    if (ph === 'windup') { lerpVec('idle', 'gather', smooth(x / .6)); ACT.shimmer = smooth(x); ACT.glow = x; }
    else if (ph === 'strike') { if (x < .5) lerpVec('gather', 'raise', smooth(x / .5)); else lerpVec('raise', 'slash', easeIn(span(x, .5, 1))); ACT.glow = 1; ACT.contact = x > .97 ? 1 : 0; }
    else { setVec('slash'); lerpInto('idle', smooth(span(x, .3, 1))); ACT.glow = 1 - x; if (x < .08) ACT.contact = 1; }
  } else if (id === 'shockwave' || id === 'groundRupture') blow(ph, x, id === 'shockwave' ? 'raise' : 'point', id === 'shockwave' ? 'slam' : 'point', id === 'shockwave' ? .7 : .9);
  else if (id === 'devourPull') { if (ph === 'windup') lerpVec('idle', 'open', smooth(x)); else if (ph === 'active') setVec('open'); else { setVec('open'); lerpInto('idle', smooth(x)); } ACT.glow = ph === 'recover' ? 1 - x : 1; }
  else blow(ph, x, 'raise', 'slash', .7);
}
// The Morphling: its own moves (e.morph, listener-morph.ts) first, then its pack kit
function actMorph(e, tr, now, target, env) {
  const m = e.morph || null, move = m?.move || null, el = now - tr.mAt, R = LISTENER_RIG.morph, s = e.pack, id = s?.attack;
  if (move) {
    ACT.still = true; ACT.phase = `morph:${move}`;
    if (move === 'cables') {
      const tele = MORPH_FORM.cables.telegraph * 1000; lerpVec('idle', 'spread', easeOut(clamp01(el / (tele * .6)))); ACT.cables = m.cables || null; ACT.glow = clamp01(el / tele); ACT.contact = el >= tele ? 1 : 0; aimData(e, null, target);
    } else if (move === 'jaw' && m.jaw) {
      // the right arm stretches to where you stood, its end a dragon's jaw that opens, then clamps (the game's `bit`)
      const j = m.jaw, reach = clamp01(el / R.jawReachMs), open = j.bit ? 0 : clamp01((el - R.jawReachMs) / R.jawOpenMs);
      lerpVec('coil', 'reach', easeOut(reach)); ACT.jawShow = 1; ACT.jaw = .2 + .8 * open; ACT.reach = easeOut(reach); ACT.reachX = j.to.x; ACT.reachY = j.to.y + .3; ACT.contact = j.bit ? 1 : 0;
      aimAt(e, j.to.x - .5, j.to.y - .45); ACT.glow = open;
    } else if (move === 'sink') { setVec('writhe'); ACT.sink = 1; ACT.glow = .5; }
    else if (move === 'worms') { setVec('writhe'); ACT.writhe = 1; ACT.glow = .8; aimData(e, null, target); }
    else if (move === 'spin') { setVec('spread'); ACT.spin = true; ACT.glow = .6; }
    else if (move === 'lunge' && m.lunge) {
      const l = m.lunge; ACT.aimX = l.dir.x; ACT.aimY = l.dir.y; ACT.aim = true;
      if (!(l.gone > 0)) { lerpVec('idle', 'rear', smooth(el / (MORPH_FORM.lunge.telegraph * 1000 * .7))); ACT.glow = clamp01(el / 600); } else { setVec('lunge'); ACT.glow = 1; ACT.contact = l.hit ? 1 : 0; }
    } else if (move === 'beams' && m.beams) {
      // the cross: the chamber is beam 0, the arms beams 1 and 3; it turns with them
      const b = m.beams, tele = MORPH_FORM.beams.telegraph * 1000, live = Math.max(0, el - tele) / 1000;
      lerpVec('idle', 'spread', smooth(el / (tele * .6))); V[M_.gape] = 1; V[M_.fan] = .4; ACT.yawLock = b.a0 + b.turn * MORPH_FORM.beams.turn * live; ACT.glow = el >= tele ? 1 : el / tele; ACT.contact = el >= tele ? 1 : 0;
    } else if (move === 'orbs' && m.orbs) { setVec('open'); ACT.yawLock = m.orbs.a; ACT.glow = 1; }
    else if (move === 'barbs' && m.barbs) { setVec(tr.throwSide > 0 ? 'throwR' : 'throwL'); lerpInto('open', 1 - clamp01(1 - (now - tr.throwAt) / R.throwMs)); ACT.glow = .8; aimData(e, null, target); }
    else { setVec('idle'); aimData(e, null, target); }
    return;
  }
  if (!id) { setVec('idle'); ACT.watch = true; return; }
  const ph = s.phase, x = phaseOf(s, id);
  ACT.still = true; ACT.phase = `${id}:${ph}`; aimData(e, s, target);
  if (id === 'bite') { blow(ph, x, 'coil', 'reach', .72); ACT.jawShow = 1; ACT.jaw = ph === 'windup' ? (x < .72 ? smooth(x / .72) : 1 - easeIn(span(x, .72, 1))) : 0; }
  else if (id === 'devourPull') { if (ph === 'windup') lerpVec('idle', 'open', smooth(x)); else if (ph === 'active') { setVec('open'); V[M_.lean] -= .1; } else { setVec('open'); lerpInto('idle', smooth(x)); } ACT.glow = ph === 'recover' ? 1 - x : 1; ACT.writhe = ph === 'active' ? .5 : 0; }
  else if (id === 'fleshBloom') { blow(ph, x, 'rear', 'slam', .6); V[M_.gape] = Math.max(V[M_.gape], ph === 'windup' ? x : 1 - x); }
  else { blow(ph, x, 'rear', 'slam', id === 'groundRupture' ? .6 : .7); ACT.slam = ACT.contact; }
}

// ------------------------------------------------------------------------------------------------ the pose
// the cables (listener-morph.ts): unit directions, and which one each crown tentacle (0..5) and arm (6 left, 7 right) takes
const CABLE_N = MORPH_FORM.cables.count, CAB = new Float64Array(CABLE_N * 2), CSLOT = new Int8Array(8);
const crownAngle = (s, j) => Math.PI - s * (.45 + j * .5);
let USED = 0;
function takeCable(slot, a) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < CABLE_N; i++) { if (USED & (1 << i)) continue; const c = Math.atan2(CAB[i * 2 + 1], CAB[i * 2]) - a, d = Math.abs(Math.atan2(Math.sin(c), Math.cos(c))); if (d < bd) { bd = d; best = i; } }
  USED |= 1 << best; CSLOT[slot] = best;
}
function assignCables(cables, yaw) {
  for (let i = 0; i < CABLE_N; i++) { const c = cables[i], x = c?.b && c?.a ? c.b.x - c.a.x : 0, y = c?.b && c?.a ? c.b.y - c.a.y : 0, l = Math.hypot(x, y); if (!(l > 1e-3)) return false; CAB[i * 2] = x / l; CAB[i * 2 + 1] = y / l; }
  USED = 0; takeCable(6, yaw - Math.PI / 2); takeCable(7, yaw + Math.PI / 2);
  for (let n = 0; n < TENT.length; n++) takeCable(n, yaw + crownAngle(TENT[n].s, TENT[n].j));
  return true;
}
const H = new Float64Array(3), T = new Float64Array(3), J = new Float64Array(3), POLE = new Float64Array(3), D = new Float64Array(3), D2 = new Float64Array(3), AX = new Float64Array(9);
// a bone's unit world axes (its scale folded out) into AX (f 0..2, r 3..5, u 6..8)
function axes(P, i) { const o = i * 9; for (let c = 0; c < 3; c++) { const l = Math.hypot(P.wr[o + c * 3], P.wr[o + c * 3 + 1], P.wr[o + c * 3 + 2]) || 1; for (let r = 0; r < 3; r++) AX[c * 3 + r] = P.wr[o + c * 3 + r] / l; } }
// the world point of a model-space point given relative to the chest's bind position, carried by the chest (lean, twist)
function chestPoint(P, fit, f, r, u, out) {
  const ci = BI.chest, o = ci * 9, b = fit.bindWorld;
  const lf = f - b[ci * 3], lr = r - b[ci * 3 + 1], lu = u - b[ci * 3 + 2];
  for (let k = 0; k < 3; k++) out[k] = P.wp[ci * 3 + k] + P.wr[o + k] * lf + P.wr[o + 3 + k] * lr + P.wr[o + 6 + k] * lu;
}
function chestDir(P, f, r, u, out) { axes(P, BI.chest); for (let k = 0; k < 3; k++) out[k] = AX[k] * f + AX[3 + k] * r + AX[6 + k] * u; const l = Math.hypot(out[0], out[1], out[2]) || 1; out[0] /= l; out[1] /= l; out[2] /= l; }
function armIK(P, fit, tag, s, tf, tr_, tu, l1, l2, S, cf, sf) {
  const ai = BI['arm' + tag]; resolveBone(P, ai); H[0] = P.wp[ai * 3]; H[1] = P.wp[ai * 3 + 1]; H[2] = P.wp[ai * 3 + 2];
  chestPoint(P, fit, tf, tr_, tu, T);
  POLE[0] = -cf * .4 - sf * s * .7; POLE[1] = -sf * .4 + cf * s * .7; POLE[2] = -.5;
  solveTwoBone(H, T, l1 * S, l2 * S, POLE, J);
  aimWorld(P, ai, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], cf, sf, 0); resolveBone(P, ai);
  const fi = BI['fore' + tag]; aimWorld(P, fi, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], cf, sf, 0); resolveBone(P, fi);
}
export function sampleListener(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(6, Number(env.scale) || 1)), P = tr.pose, G = LISTENER_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  // the body: the game's form; a dead Listener keeps the one it fell in
  const form = dead && tr.form ? tr.form : listenerForm(e), morph = form === 'morph', fit = morph ? MORPH_FIT : CLOAK_FIT, R = morph ? G.morph : G.cloak;
  if (form !== tr.form) { if (tr.form) tr.formAt = now; tr.form = form; tr.key = ''; }
  P.skeleton = fit;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  // the Morphling's move on the render clock: its start, each volley of barbs, the sink and the rise
  const m = morph && !dead ? e.morph : null, mKey = m?.move ? `${m.move}:${m.t0}` : '';
  if (mKey !== tr.mKey) { tr.mKey = mKey; tr.mAt = now; tr.fired = 0; }
  if (m?.barbs && (m.barbs.fired || 0) > tr.fired) { tr.fired = m.barbs.fired; tr.throwAt = now; tr.throwSide = tr.fired % 2 ? 1 : -1; }
  const sunk = !!m?.sunk; if (tr.sunk && !sunk) tr.riseAt = now; tr.sunk = sunk;
  resetAct(form);
  if (dead) { setVec('dazed'); ACT.still = true; ACT.phase = 'death'; }
  else if (morph) actMorph(e, tr, now, env.target, env);
  else actCloak(e, env.target);
  // facing: a locked yaw (the beams' cross, the orbs' spiral), the attack's aim, else where it goes, else the Wayfarer. A
  // blink or a rise from the floor is a discontinuity: the facing snaps with it
  const jumped = Number.isFinite(tr.gait.x) && Math.hypot(env.x - tr.gait.x, env.y - tr.gait.y) > 1.2;
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let want = tr.yaw;
  if (Number.isFinite(ACT.yawLock)) want = ACT.yawLock;
  else if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (!jumped && Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dy, dx);
  else if (ACT.watch && env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw) || jumped) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = Number.isFinite(ACT.yawLock) ? 30 : e.pack?.attack || ACT.phase !== 'move' ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate; tr.yaw += Math.max(-1, Math.min(1, dt * rate)) * delta; }
  if (ACT.spin && !dead) tr.spin += dt * R.spinRate; else tr.spin = 0;
  const yaw = tr.yaw + (reduce ? 0 : tr.spin), cf = Math.cos(yaw), sf = Math.sin(yaw);
  // blend between poses
  const key = dead ? 'death' : `${form}:${ACT.phase}:${e.pack?.seq ?? ''}`;
  if (tr.key === '' || !(gapMs <= G.blendMs) || jumped) { tr.shown.set(V); tr.from.set(V); tr.key = key; tr.blendAt = -Infinity; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < KN; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  Wv.set(tr.shown);
  // the blow lands: a small jolt through the body
  if (ACT.contact && !tr.contactWas) tr.strikeAt = now; tr.contactWas = ACT.contact;
  const stT = (now - tr.strikeAt) / 1000, jolt = stT < .3 ? kick(stT, 20, 10) : 0;
  // hit: a flinch away from the blow; stagger: dazed
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 10) : 0;
  Wv[1] += .05 * jolt - .18 * hit; Wv[2] -= .2 * hit * tr.hitSide; Wv[3] += .12 * hit;
  const stun = dead ? 0 : clamp01(Number(e.poiseBreak) || 0);
  if (stun > 0) { const dz = TBL[form].dazed; for (let k = 0; k < KN; k++) Wv[k] += (dz[k] - Wv[k]) * stun; }
  if (dead) { const k = smooth(death / .45); Wv[0] += (morph ? .3 : .25) * k; Wv[1] += (morph ? .35 : .4) * k; Wv[3] -= .4 * k; }
  // the sink, the rise, the emergence from the robe: how much of the body stands above the floor
  const sinkEl = ACT.sink ? (now - tr.mAt) / (MORPH_FORM.sink.under * 1000) : 0;
  tr.sink = ACT.sink ? smooth(clamp01(sinkEl / .45)) : 0;
  const riseT = (now - tr.riseAt) / R.riseMs, rising = morph && !ACT.sink && riseT >= 0 && riseT < 1;
  const emergeT = (now - tr.formAt) / (G.morph.emergeMs), emerging = morph && emergeT >= 0 && emergeT < 1;
  let body = 1 - tr.sink * .97;
  if (rising) { body = .15 + .85 * easeOut(riseT) + .12 * Math.sin(Math.PI * riseT); Wv[3] += .3 * (1 - riseT); }
  if (emerging) body *= .55 + .45 * easeOut(emergeT) + .08 * Math.sin(Math.PI * emergeT);
  // gait: planted feet, sides at this body's hips
  const carry = ACT.spin || ACT.phase === 'morph:lunge' || tr.sink > 0, still = (ACT.still && !morph) || dead || carry;
  tr.gait.side[0] = -R.feet * S; tr.gait.side[1] = R.feet * S;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: R.stride * S, stance: R.stance, settle: 6, still, snapDistance: 1.2, stepAt: R.stepAt * S, stepTime: R.stepTime });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  const breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe), bob = moving * R.bob * (.5 - .5 * Math.cos(cyc * 2));
  const crouch = Wv[0], lean = Wv[1], twist = Wv[2], head = Wv[3];
  // the trunk
  const sinkDrop = tr.sink * G.morph.sinkDepth;
  setOffset(P, BI.pelvis, 0, moving * .008 * Math.sin(cyc), -crouch - bob - sinkDrop);
  setEuler(P, BI.pelvis, twist * .3, lean * .45, reduce ? 0 : (morph ? .03 : .015) * Math.sin(t * 1.3) * (1 - moving));
  P.scl[BI.pelvis] = Math.max(.001, body); resolveBone(P, BI.pelvis);
  setEuler(P, BI.chest, twist * .7, lean * .55 + (morph ? .02 : .01) * breathe, reduce ? 0 : .02 * wobble(t * .6, 2)); P.scl[BI.chest] = 1 + breathe * (morph ? .012 : .006); resolveBone(P, BI.chest);
  let look = 0; if (env.target && !dead) { const lx = env.target.x - e.x, ly = env.target.y - e.y, a = Math.atan2(ly, lx) - yaw; look = Math.max(-.7, Math.min(.7, Math.atan2(Math.sin(a), Math.cos(a)))); }
  if (ACT.spin || Number.isFinite(ACT.yawLock)) look = 0;
  setEuler(P, BI.head, (look - twist) * .5, -head * .6 - lean * .55, 0); resolveBone(P, BI.head);
  if (!morph) {
    // the robed figure: hands to their places (two-bone IK), the blade aimed in the chest's frame
    for (const [tag, s, o] of [['L', -1, C_.lF], ['R', 1, C_.rF]]) {
      const sway = ACT.still ? 0 : moving * .04 * Math.sin(cyc + (s > 0 ? 0 : Math.PI));
      armIK(P, fit, tag, s, Wv[o] + sway, Wv[o + 1], Wv[o + 2], R.upperArm, R.foreArm, S, cf, sf);
    }
    const bp = Wv[C_.bP], by = Wv[C_.bY]; chestDir(P, Math.cos(bp) * Math.cos(by), Math.cos(bp) * Math.sin(by), Math.sin(bp), D);
    aimWorld(P, BI.handR, -3, D[0], D[1], D[2], AX[6], AX[7], AX[8]); resolveBone(P, BI.handR);
    resolveBone(P, BI.handL);
    for (let i = BI.tenL0; i <= BI.clawL; i++) resolveBone(P, i);
    for (let i = BI.tenR0; i < BI.thighL; i++) resolveBone(P, i);
    for (const { a, b } of TENT) { resolveBone(P, BI[a]); resolveBone(P, BI[b]); }
  } else {
    // the Morphling's arms, then each tendril along its direction, waving and curling; the right one stretches to the jaw.
    // Thrown along the cables, each tentacle and tendril takes the cable nearest its own side.
    const cabled = !!ACT.cables && ACT.cables.length === CABLE_N && assignCables(ACT.cables, yaw);
    for (const [tag, s, o, od] of [['L', -1, M_.lF, M_.ldF], ['R', 1, M_.rF, M_.rdF]]) {
      const sway = ACT.still ? 0 : moving * .06 * Math.sin(cyc + (s > 0 ? 0 : Math.PI));
      const ar = reduce ? 0 : .03 * wobble(t * .9, s * 3);
      armIK(P, fit, tag, s, Wv[o] + sway, Wv[o + 1], Wv[o + 2] + ar, R.upperArm, R.foreArm, S, cf, sf);
      const jawArm = s > 0 && ACT.reach > 0;
      if (jawArm) { D[0] = ACT.reachX - P.wp[BI.handR * 3]; D[1] = ACT.reachY - P.wp[BI.handR * 3 + 1]; D[2] = env.z + .45 - P.wp[BI.handR * 3 + 2]; const l = Math.hypot(D[0], D[1], D[2]) || 1; for (let k = 0; k < 3; k++) D[k] /= l; }
      else if (cabled) { const c = CSLOT[s < 0 ? 6 : 7]; D[0] = CAB[c * 2]; D[1] = CAB[c * 2 + 1]; D[2] = .05; }
      else chestDir(P, Wv[od], Wv[od + 1], Wv[od + 2], D);
      // the wrist turns into the tendril
      const fi = BI['fore' + tag], hi = BI['hand' + tag]; axes(P, fi);
      D2[0] = -AX[6] + D[0]; D2[1] = -AX[7] + D[1]; D2[2] = -AX[8] + D[2];
      aimWorld(P, hi, -3, D2[0], D2[1], D2[2], cf, sf, 0); resolveBone(P, hi);
      // stretch: the jaw arm runs out to where you stood (as the standard view's arm); the wave and the curl
      let extra = 0;
      if (jawArm) { const want = Math.hypot(ACT.reachX - P.wp[hi * 3], ACT.reachY - P.wp[hi * 3 + 1]) / S; extra = Math.max(0, want - R.tendril) * ACT.reach / 3; }
      const curl = Wv[M_.curl] * (jawArm ? 0 : 1), stiff = jawArm || ACT.spin || ACT.cables ? .3 : 1;
      // a perpendicular to wave in (horizontal, across the tendril), and one to curl toward (down / inward)
      let px = -D[1], py = D[0]; const pl = Math.hypot(px, py) || 1; px /= pl; py /= pl;
      for (let k = 0; k < 3; k++) {
        const bi = BI['ten' + tag + k], wave = reduce ? 0 : .3 * stiff * Math.sin(t * 4.6 - k * 1.3 + s * 1.7) * (k + 1) / 3, c = curl * (k + 1) * .35;
        D2[0] = D[0] + px * wave * s + cf * c * .35; D2[1] = D[1] + py * wave * s + sf * c * .35; D2[2] = D[2] + c * .55 + (reduce ? 0 : .12 * stiff * Math.cos(t * 3.1 - k + s));
        if (extra > 0) setOffset(P, bi, 0, 0, -extra * (k === 0 ? .4 : k === 1 ? 1 : 1.6));
        aimWorld(P, bi, -3, D2[0], D2[1], D2[2], cf, sf, 0); resolveBone(P, bi);
      }
      // claws (hidden behind the jaw while it shows) and the jaw itself
      const ci = BI['claw' + tag], showJaw = s > 0 && ACT.jawShow > 0;
      setEuler(P, ci, reduce ? 0 : .4 * Math.sin(t * .7 + s), 0, 0); P.scl[ci] = showJaw ? .001 : 1; resolveBone(P, ci);
      if (s > 0) { const op = ACT.jaw * .7; setEuler(P, BI.jawU, 0, -op, 0); P.scl[BI.jawU] = showJaw ? 1 : .001; resolveBone(P, BI.jawU);
        setEuler(P, BI.jawD, 0, op, 0); P.scl[BI.jawD] = showJaw ? 1 : .001; resolveBone(P, BI.jawD); }
    }
    // the chamber gapes
    const gape = clamp01(Wv[M_.gape] + (reduce ? 0 : .06 * Math.sin(t * 4)));
    P.scl[BI.maw] = .55 + .75 * gape; resolveBone(P, BI.maw);
    // the crown: a fan of tentacles up from behind the shoulders, flung out flat round it (fan), swept back (stream), or each
    // thrown along one of the cables
    const fan = clamp01(Wv[M_.fan]), stream = clamp01(Wv[M_.stream]), wr = ACT.writhe;
    for (let n = 0; n < TENT.length; n++) {
      const { s, j, a, b } = TENT[n], ai = BI[a], bi = BI[b], ph = n * 1.7, cu = (1 - fan) * (1 - stream);
      // in the crown: the root rises steeply, the outer half arcs out and over (the standard view's curve)
      const ang = .55 + j * .42 + (reduce ? 0 : .16 * Math.sin(t * 1.4 + ph) + .35 * wr * Math.sin(t * 9 + ph));
      // flat round it: at even angles from the back, or along the cables
      let fx, fy;
      if (cabled) { fx = CAB[CSLOT[n] * 2]; fy = CAB[CSLOT[n] * 2 + 1]; }
      else { const wa = yaw + crownAngle(s, j) + (reduce ? 0 : .1 * Math.sin(t * 2 + ph)); fx = Math.cos(wa); fy = Math.sin(wa); }
      // streaming behind a dive
      const sx = -cf * .9 - sf * s * (.25 + j * .2), sy = -sf * .9 + cf * s * (.25 + j * .2), sz = .25 - j * .15;
      for (let seg2 = 0; seg2 < 2; seg2++) {
        const an = seg2 ? ang + .6 + (reduce ? 0 : .12 * Math.sin(t * 2.3 + ph)) : ang - .4;
        chestDir(P, seg2 ? -.5 : -.3, s * Math.sin(an), Math.cos(an), D);
        const rip = reduce ? 0 : seg2 * Math.sin(t * 2.6 + ph) * (.2 + .5 * wr) * (1 - cu);
        D2[0] = D[0] * cu + (fx - fy * rip) * fan * (1 - stream) + sx * stream;
        D2[1] = D[1] * cu + (fy + fx * rip) * fan * (1 - stream) + sy * stream;
        D2[2] = D[2] * cu + (.1 + seg2 * .06) * fan * (1 - stream) + (sz - seg2 * .15) * stream;
        aimWorld(P, seg2 ? bi : ai, 2, D2[0], D2[1], D2[2], cf, sf, 0); resolveBone(P, seg2 ? bi : ai);
      }
    }
  }
  // legs: planted feet (hips to feet by two-bone IK); the Morphling's are goat's legs, the hock behind the hoof
  for (let side = 0; side < 2; side++) {
    const tag = side ? 'R' : 'L', sgn = side ? 1 : -1, ti = BI['thigh' + tag];
    resolveBone(P, ti); H[0] = P.wp[ti * 3]; H[1] = P.wp[ti * 3 + 1]; H[2] = P.wp[ti * 3 + 2];
    let fx = tr.gait.out[side * 4], fy = tr.gait.out[side * 4 + 1]; const lift = tr.gait.out[side * 4 + 2];
    let tuck = 0;
    if (dead || carry) { fx = x - sf * sgn * R.feet * S; fy = y + cf * sgn * R.feet * S; tuck = carry && !tr.sink ? .35 : 0; }
    if (!morph) {
      T[0] = fx; T[1] = fy; T[2] = env.z + R.ankle * S + lift * R.footLift * S; POLE[0] = cf; POLE[1] = sf; POLE[2] = .05;
      solveTwoBone(H, T, R.thigh * S * body, R.shin * S * body, POLE, J);
      aimWorld(P, ti, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], cf, sf, 0); resolveBone(P, ti);
      const si = BI['shin' + tag]; aimWorld(P, si, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], cf, sf, 0); resolveBone(P, si);
      const hk = BI['hock' + tag], toe = lift > 0 ? -.3 * lift : 0, fyaw = yaw + sgn * .12;
      aimWorld(P, hk, -3, 0, 0, -1, Math.cos(fyaw) * Math.cos(toe), Math.sin(fyaw) * Math.cos(toe), Math.sin(toe)); resolveBone(P, hk);
    } else {
      // the hock sits behind and above the hoof; the knee bends forward
      const fz = env.z + lift * R.footLift * S + tuck * S, lean0 = -.35 - .5 * lift - tuck;
      T[0] = fx + cf * Math.sin(lean0) * R.cannon * S * body; T[1] = fy + sf * Math.sin(lean0) * R.cannon * S * body; T[2] = fz + Math.cos(lean0) * R.cannon * S * body;
      POLE[0] = cf; POLE[1] = sf; POLE[2] = 0;
      solveTwoBone(H, T, R.thigh * S * body, R.shin * S * body, POLE, J);
      aimWorld(P, ti, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], cf, sf, 0); resolveBone(P, ti);
      const si = BI['shin' + tag]; aimWorld(P, si, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], cf, sf, 0); resolveBone(P, si);
      const hk = BI['hock' + tag]; aimWorld(P, hk, -3, fx - T[0], fy - T[1], fz - T[2], cf, sf, 0); resolveBone(P, hk);
    }
    tr.frame.feet[side * 2] = tr.gait.out[side * 4 + 3]; tr.frame.feet[side * 2 + 1] = lift;
  }
  // the pool: shown while it sinks and as it rises out of it
  const pool = morph ? Math.max(tr.sink, rising ? 1 - riseT : 0) : 0;
  setEuler(P, BI.pool, reduce ? 0 : t * .8, 0, 0); P.scl[BI.pool] = Math.max(.001, smooth(pool)); resolveBone(P, BI.pool);
  writeSkin(P);
  // the frame
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 1.6) : 1, pulse = reduce ? 0 : Math.sin(t * 5);
  let alpha = dead ? 1 - span(death, .35, 1) : 1;
  if (!morph && !dead) {
    if (e.untargetable) alpha *= R.hiddenAlpha;
    if (ACT.shimmer > 0) alpha *= 1 - R.shimmer * ACT.shimmer * (reduce ? .5 : .5 + .5 * Math.sin(t * 60));
  }
  if (morph) {
    F.emitK[0] = life * (.55 + .6 * clamp01(Wv[M_.gape]) + .25 * ACT.glow + .1 * pulse);
    F.emitK[1] = life * (.9 + .15 * (reduce ? 0 : Math.sin(t * 2.5)) + .3 * ACT.glow);
  } else {
    F.emitK[0] = life * (.8 + .08 * pulse + .35 * ACT.glow);
    F.emitK[1] = life * (.9 + .9 * ACT.glow + .6 * Math.abs(jolt));
  }
  for (let k = 0; k < 2; k++) F.emitK[k] = Math.max(0, Math.min(3, F.emitK[k]));
  F.emitK[2] = 0; F.emitK[3] = 0; F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 0; F.emitA[3] = 0;
  F.tier = env.tier || 'full'; F.mesh = morph ? morphMesh(F.tier) : cloakMesh(F.tier); F.skin = P.skin; F.boneCount = fit.count; F.alpha = alpha;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = 0; F.shadow = morph ? 1 - .7 * tr.sink : 1; F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = false;
  return F;
}
export const listenerBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
