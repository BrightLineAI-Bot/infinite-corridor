// The Gloomvast in Close View (haunts.ts GLOOM_FINALE: the Pentagon finale's haunt): the standard view's ghost (monster-render.ts
// drawGloomvast over drawGloomgorge: a fat body only half here, dark at its heart and paler at its rim, soft spines along its
// back and a ragged fringe of smoke below the waist; two slanted slits of light for eyes over a wide grin of pale teeth lit
// from far down the throat; arms and legs tapering out of the body into long hooked talons; behind it a great mantle of two
// veils sweeping up off its shoulders, ribbed with filaments of cold light; a corona of small lights on an arc over its head;
// a heart of light showing through its body; long tendrils trailing below) as one skinned body on the shared beast rig.
// Everything of gas is dithered (emissive channels 3 and 4: the body's shell and arm roots on 3; the veils, tendrils, haloes
// and the corona's arc on 4); the face, the core behind it, the forearms and talons are solid so they read.
// It moves on the game's own clocks (monster-pack.ts ATTACK_MODULES.vast*, devourPull, vastDark; e.pack's attack, phase and
// time left): the talons rake, it inhales for the devouring pull, throws back its head to wail, raises its hands and brings the
// gloom down, draws its corona down into its mouth and looses the grave lights, gathers and plunges, and draws the light into
// itself as it calls the Dark. Veiled among its cold lights it keeps the standard view's billboard (close-view-beasts.ts).
// Nothing here changes timing, damage, reach or targeting.
import { ATTACK_MODULES, BOSS_PACE } from "./monster-pack.js?v=r953-59250bbc63d3";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, boneLocalToWorld, solveTwoBone, writeSkin, meshBuilder,
  clamp01, smooth, span, kick, wobble,
} from "./close-view-beast-rig.js?v=r953-59250bbc63d3";

// the pose vector: body lean (+ forward), head (+ thrown back), mouth open, hand target (forward, out, up; in the upper body's
// frame), veil spread (+ raised and out), veil sweep (+ wrapped forward), body swell, corona drawn in (+ in, - flared),
// tendril trail (+ forward), inner light, roll
const NP = 13;
export const GLOOMVAST_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  hover: 1, bob: .035, bobRate: 1.6, // its middle above the ground, and the standard view's bob (HAUNT_SPRITE.bob, in body units)
  body: Object.freeze([.5, .68, .52]), // the shell's half depth, width and height (drawGloomgorge: W .68, H .52 body units)
  turnRate: 2.4, attackTurnRate: 7, followRate: 9, attackFollowRate: 20, deathMs: 2400, hitMs: 320,
  arm: Object.freeze([.36, .36]), // upper arm and forearm, body units
  jawDrop: .15, // how far the lower lip falls when the mouth is wide open
  phasingAlpha: .5, // through the plunge's lane it is half there (the standard view's .45)
  shellAlpha: [.6, .08], gasAlpha: [.5, .06], // channel 3 and 4 dither: base and flicker (the standard view's flicker .86 +- .14)
  poses: Object.freeze({
    //          lean  head  open  hf    hr    hu    sprd  swp   swell crown trail glow  roll
    idle:      [0,    0,    .2,   .24,  .98,  -.22, 0,    0,    1,    0,    0,    .55,  0],
    rakeLoad:  [-.14, .14,  .5,   -.3,  1.08, .34,  .35,  -.2,  1.03, 0,    .1,   .8,   0],
    rakeStrike: [.24, -.05, .78,  .82,  .5,   -.06, .15,  .25,  1,    0,    -.1,  .95,  0],
    rakeFollow: [.28, -.08, .7,   .6,   .02,  -.22, .1,   .3,   1,    0,    -.15, .8,   0],
    devourDraw: [-.1, .28,  .92,  .46,  1.02, .1,   .3,   .55,  1.08, 0,    .4,   .95,  0],
    devourHold: [.18, 0,    1,    .72,  .68,  0,    .2,   .85,  1.04, 0,    .6,   1.15, 0],
    devourBite: [.14, -.08, .02,  .42,  .82,  -.1,  .1,   .3,   .96,  0,    .2,   .7,   0],
    wailDraw:  [-.22, .58,  1,    .1,   1.12, .32,  .85,  -.2,  1.06, -.15, .1,   1.1,  0],
    wailCry:   [-.18, .55,  1,    .16,  1.18, .38,  1,    -.32, 1.1,  -.3,  -.2,  1.35, 0],
    fallRaise: [-.1,  .24,  .55,  .32,  .7,   .8,   .45,  .1,   1.04, 0,    .1,   .9,   0],
    fallSlam:  [.22,  -.1,  .62,  .6,   .78,  -.52, -.2,  .2,   .96,  0,    -.1,  .85,  0],
    lightsDraw: [.15, -.12, .95,  -.12, 1.02, -.08, .2,   0,    1.02, .6,   .2,   1.15, 0],
    lightsLoose: [-.12, .16, 1,   .05,  1.05, 0,    .35,  -.1,  1.04, -.3,  -.1,  1.35, 0],
    plungeGather: [-.3, .1,  .6,   -.32, .72,  .12,  .3,   -.6,  .9,   .1,   .4,   1,    0],
    plungeDive: [.85, .5,   .8,   .85,  .42,  -.04, -.1,  -1,   1,    0,    -1,   1.1,  0],
    darkCall:  [-.05, -.2,  0,    .55,  .12,  -.04, -.2,  1,    .95,  1,    .5,   1.5,  0],
    dazed:     [-.12, -.38, .35,  .12,  .8,   -.46, -.5,  .1,   .95,  .3,   .2,   .3,   .25],
    death:     [-.1,  .5,   .9,   .1,   1.15, .3,   .6,   -.2,  1.25, -.6,  .3,   1.4,  0],
  }),
  // each move's keyframes through its phases: [progress through the phase, pose]; the blow lands where windup meets recover
  moves: Object.freeze({
    vastRake: { windup: [[0, 'idle'], [.62, 'rakeLoad'], [.86, 'rakeLoad'], [1, 'rakeStrike']], recover: [[0, 'rakeStrike'], [.3, 'rakeFollow'], [1, 'idle']] },
    devourPull: { windup: [[0, 'idle'], [1, 'devourDraw']], active: [[0, 'devourDraw'], [.25, 'devourHold'], [1, 'devourHold']], recover: [[0, 'devourBite'], [1, 'idle']] },
    vastWail: { windup: [[0, 'idle'], [.85, 'wailDraw'], [1, 'wailCry']], recover: [[0, 'wailCry'], [.55, 'wailCry'], [1, 'idle']] },
    vastGloomfall: { windup: [[0, 'idle'], [.8, 'fallRaise'], [1, 'fallRaise']], recover: [[0, 'fallRaise'], [.18, 'fallSlam'], [.5, 'fallSlam'], [1, 'idle']] },
    vastLights: { windup: [[0, 'idle'], [.9, 'lightsDraw'], [1, 'lightsDraw']], recover: [[0, 'lightsLoose'], [.4, 'lightsLoose'], [1, 'idle']] },
    vastPlunge: { windup: [[0, 'idle'], [.75, 'plungeGather'], [.9, 'plungeGather'], [1, 'plungeDive']], active: [[0, 'plungeDive'], [1, 'plungeDive']], recover: [[0, 'plungeDive'], [.3, 'rakeFollow'], [1, 'idle']] },
    vastDark: { windup: [[0, 'idle'], [.7, 'darkCall'], [1, 'darkCall']], recover: [[0, 'darkCall'], [1, 'idle']] },
    // anything else it is given (a hybrid's borrowed move): its talons, raised and brought down
    other: { windup: [[0, 'idle'], [1, 'rakeLoad']], active: [[0, 'rakeStrike'], [1, 'rakeStrike']], recover: [[0, 'rakeStrike'], [1, 'idle']] },
  }),
  // the moment each move lands (phase, progress): a shudder through the body
  contact: Object.freeze({ vastRake: ['recover', 0], vastGloomfall: ['recover', .18], vastWail: ['recover', 0], vastLights: ['recover', 0], devourPull: ['recover', 0], vastPlunge: ['active', 0] }),
  tendrils: Object.freeze([[-.42, -.1, 1.15], [-.2, 0, 1.45], [0, -.12, 1.3], [.2, .02, 1.5], [.42, -.1, 1.1]]), // [right, forward, length]
});
const G = GLOOMVAST_RIG;
const POSE_VEC = Object.fromEntries(Object.entries(G.poses).map(([k, v]) => [k, Float64Array.from(v)]));

// ------------------------------------------------------------------------------------------------ skeleton
// model space: f forward, r right, u up; the body's middle at `hover` (the root is on the ground)
const C = G.hover, [BD, BW, BH] = G.body;
const SH = [.02, .5, -.02]; // the shoulder, from the body's middle (right side)
const HIP = [-.02, .28, -.3];
// a veil (right side) as model points: q runs along its outer edge from the tip (0) to its low corner (1), k from its root (0)
// to that edge (1); it billows back behind the body and its top edge bows up off the shoulder (drawGloomvast's mantle)
function veilPoint(s, q, k, scallop = 0) {
  const rt = [-.16 + (-.2 + .16) * q, .3 + (.44 - .3) * q, .32 + (-.04 - .32) * q];
  const ed = [-.42 + (-.28 + .42) * q, 1.42 + (.95 - 1.42) * q + .42 * Math.sin(q * Math.PI) + scallop, 1.6 + (-.44 - 1.6) * q];
  const f = rt[0] + (ed[0] - rt[0]) * k - .34 * Math.sin(k * Math.PI) + .1 * k * k, r = rt[1] + (ed[1] - rt[1]) * k, u = rt[2] + (ed[2] - rt[2]) * k + .24 * Math.sin(k * Math.PI) * (1 - q) * (1 - q);
  return [f, s * r, C + u];
}
const VEIL_BONES = [[.5, 0], [.4, .5], [.32, 1]];
const CORONA_AT = [-.12, 0, .8], CORONA_N = 9;
const coronaLight = (j) => { const a = Math.PI * (.1 + j * .1); return [-.12 * Math.sin(a), -Math.cos(a) * .82, Math.sin(a) * .42]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const GLOOMVAST_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'body', parent: 'root', at: [0, 0, C] },
  { name: 'belly', parent: 'body', at: [0, 0, -.2] },
  { name: 'head', parent: 'body', at: [0, 0, 0] },
  { name: 'jaw', parent: 'head', at: [.3, 0, -.08] },
  { name: 'heart', parent: 'body', at: [.12, 0, -.2] },
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1, v = VEIL_BONES.map(([q, k]) => veilPoint(s, q, k));
    return [
      { name: 'arm' + tag, parent: 'head', at: [SH[0], s * SH[1], SH[2]] }, { name: 'fore' + tag, parent: 'arm' + tag, at: [0, s * G.arm[0], 0] }, { name: 'hand' + tag, parent: 'fore' + tag, at: [0, s * G.arm[1], 0] },
      { name: 'leg' + tag, parent: 'belly', at: [HIP[0], s * HIP[1], HIP[2] + .2] },
      { name: 'veil' + tag, parent: 'head', at: sub(v[0], [0, 0, C]) }, { name: 'veilMid' + tag, parent: 'veil' + tag, at: sub(v[1], v[0]) }, { name: 'veilTip' + tag, parent: 'veilMid' + tag, at: sub(v[2], v[1]) },
    ]; }),
  { name: 'corona', parent: 'head', at: CORONA_AT },
  ...[0, 1, 2].map((g) => ({ name: 'corona' + g, parent: 'corona', at: [0, 0, 0] })),
  ...G.tendrils.flatMap(([r, f, len], i) => [{ name: `ten${i}_0`, parent: 'belly', at: [f, r, -.4] }, { name: `ten${i}_1`, parent: `ten${i}_0`, at: [0, 0, -len / 2] }]),
]);
const BI = GLOOMVAST_SKELETON.index;
const E_EYE = 1, E_GLOW = 2, E_SHELL = 3, E_GAS = 4;

// ------------------------------------------------------------------------------------------------ the body
const hexOf = (c) => parseInt(String(c).slice(1), 16);
// the standard view's palette (monster-pack.ts gloomvast: dark, deep, glow, eye) and the Gloomgorge's own talon and tooth colours
const COL = Object.freeze({ dark: hexOf("#5a8ad8"), deep: hexOf("#1c3a7c"), glow: hexOf("#9fdcff"), eye: hexOf("#f2fbff"), core: hexOf("#08122e"), hollow: hexOf("#06102a"),
  maw: hexOf("#02050f"), talonMid: hexOf("#b6cdf2"), talonTip: hexOf("#f6faff"), tooth: hexOf("#dce8fb"), light: hexOf("#f4fbff") });
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
// A closed surface round `at` through directions on the unit sphere: `shape(dir)` gives its point, `bones(p, dir)` its skin and
// `tone(dir)` its colour; normals from the surface itself.
function surface(B, o) {
  const { rings, seg } = o, ids = [], dir = (phi, th) => [Math.cos(phi) * Math.cos(th), Math.cos(phi) * Math.sin(th), Math.sin(phi)];
  for (let i = 0; i <= rings; i++) { const phi = -Math.PI / 2 + Math.PI * i / rings, row = [];
    for (let k = 0; k < (i === 0 || i === rings ? 1 : seg); k++) { const th = (k / seg) * Math.PI * 2, d = dir(phi, th), p = o.shape(d), e = 1e-3;
      const a = o.shape(dir(phi + e, th)), b = o.shape(dir(phi - e, th)), c = o.shape(dir(phi, th + e)), q = o.shape(dir(phi, th - e));
      const dp = sub(a, b), dt = sub(c, q); let n = [dt[1] * dp[2] - dt[2] * dp[1], dt[2] * dp[0] - dt[0] * dp[2], dt[0] * dp[1] - dt[1] * dp[0]];
      if (i === 0 || i === rings || Math.hypot(n[0], n[1], n[2]) < 1e-9) n = sub(p, o.centre);
      const [ba, bb, w] = o.bones(p, d); row.push(B.vertexBlend(p[0], p[1], p[2], n[0], n[1], n[2], ba, bb, w, o.tone(d))); }
    ids.push(row); }
  for (let i = 0; i < rings; i++) { const A = ids[i], Cc = ids[i + 1];
    for (let k = 0; k < seg; k++) { const k2 = (k + 1) % seg;
      if (A.length === 1) B.tri(A[0], Cc[k2], Cc[k]); else if (Cc.length === 1) B.tri(A[k], A[k2], Cc[0]); else { B.tri(A[k], A[k2], Cc[k2]); B.tri(A[k], Cc[k2], Cc[k]); } } }
}
// the shell's front at (r, u) from its middle (the face sits on it)
const shellFront = (r, u) => BD * Math.sqrt(Math.max(.02, 1 - (r / BW) ** 2 - (u / BH) ** 2));
const shellNormal = (r, u) => { const f = shellFront(r, u), n = [f / (BD * BD), r / (BW * BW), u / (BH * BH)], l = Math.hypot(...n); return [n[0] / l, n[1] / l, n[2] / l]; };
// a small three-sided spike (a tooth, a claw tip) between two bones, flat-shaded: base centre, axis to the tip, base radius
function spike(B, base, tip, rad, side, bones) {
  const ax = sub(tip, base), l = Math.hypot(...ax), F = [ax[0] / l, ax[1] / l, ax[2] / l];
  let s0 = Math.abs(F[2]) < .9 ? [0, 0, 1] : [1, 0, 0]; const dd = s0[0] * F[0] + s0[1] * F[1] + s0[2] * F[2]; s0 = [s0[0] - dd * F[0], s0[1] - dd * F[1], s0[2] - dd * F[2]];
  const sl = Math.hypot(...s0); s0 = [s0[0] / sl, s0[1] / sl, s0[2] / sl]; const s1 = [F[1] * s0[2] - F[2] * s0[1], F[2] * s0[0] - F[0] * s0[2], F[0] * s0[1] - F[1] * s0[0]];
  const ring = [0, 1, 2].map((j) => { const a = j * Math.PI * 2 / 3 + side; return [base[0] + (s0[0] * Math.cos(a) + s1[0] * Math.sin(a)) * rad, base[1] + (s0[1] * Math.cos(a) + s1[1] * Math.sin(a)) * rad, base[2] + (s0[2] * Math.cos(a) + s1[2] * Math.sin(a)) * rad]; });
  for (let j = 0; j < 3; j++) { const a = ring[j], b = ring[(j + 1) % 3], e1 = sub(b, a), e2 = sub(tip, a);
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]]; const mid = [(a[0] + b[0]) / 2 - base[0], (a[1] + b[1]) / 2 - base[1], (a[2] + b[2]) / 2 - base[2]];
    if (n[0] * mid[0] + n[1] * mid[1] + n[2] * mid[2] < 0) n = [-n[0], -n[1], -n[2]];
    const [ba, bb, w, ca, cb] = bones; B.tri(B.vertexBlend(...a, ...n, ba, bb, w, ca), B.vertexBlend(...b, ...n, ba, bb, w, ca), B.vertexBlend(...tip, ...n, ba, bb, w, cb)); }
}
function buildGloomvastMesh(tier) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(GLOOMVAST_SKELETON, full ? 1 : low ? .4 : .7), bw = GLOOMVAST_SKELETON.bindWorld;
  const bwOf = (bone) => [bw[BI[bone] * 3], bw[BI[bone] * 3 + 1], bw[BI[bone] * 3 + 2]], at = (bone, p) => sub(p, bwOf(bone));
  // The shell: the Gloomgorge's fat body, its outline breathing on three slow waves, thinning below the waist into a ragged fringe
  // of smoke. Deep blue, paler toward the top-left as the standard view lights it, catching the glow at the rim of the fringe and
  // where the heart shows through low on its front. Upper half on the head (it throws it back to wail), the fringe on the belly.
  const shellShape = (d) => { const th = Math.atan2(d[1], d[0]), below = Math.max(0, -d[2]);
    const r = 1 + .03 * Math.sin(3 * th + 1) + .018 * Math.sin(7 * th) + below * below * (.18 + .1 * Math.sin(9 * th + .5)), z = d[2] * (d[2] > 0 ? 1.06 : 1);
    return [d[0] * BD * r, d[1] * BW * r, C + z * BH * r]; };
  surface(B.color(COL.deep, E_SHELL), { rings: full ? 14 : low ? 7 : 11, seg: full ? 28 : low ? 12 : 20, centre: [0, 0, C], shape: shellShape,
    bones: (p, d) => d[2] < -.15 ? ['belly', 'body', smooth((d[2] + .65) / .5)] : ['body', 'head', smooth((d[2] + .15) / .45)],
    tone: (d) => { let c = lerpHex(COL.deep, COL.dark, clamp01(d[2] * .8 + .25 - d[1] * .2) * .55);
      c = lerpHex(c, COL.glow, clamp01((-d[2] - .45) * 1.6) * .55);
      const hz = Math.hypot(d[1] * 1.4, (d[2] + .38) * 1.8), front = clamp01(d[0]); return lerpHex(c, COL.eye, clamp01(1 - hz) * front * .7); } });
  // the dark heart behind the face, so the eyes and the grin glare out of it
  B.bone('head').color(COL.core).ellipsoid({ at: [-.04, 0, .1], radius: [.36, .5, .3], rings: low ? 5 : 7, seg: low ? 10 : 16 });
  // soft spines along the top of the back, part of the same gas
  for (let j = -2; j <= 2; j++) { if (low && j % 2) continue; const d0 = [-.42, j * .4, .82], l = Math.hypot(...d0), d = [d0[0] / l, d0[1] / l, d0[2] / l], p = shellShape(d), sz = 1 - Math.abs(j) * .12;
    B.bone('head').color(lerpHex(COL.deep, COL.dark, .4), E_SHELL).lathe({ at: at('head', [p[0] - d[0] * .04, p[1] - d[1] * .04, p[2] - d[2] * .04]), F: [d[0] - .25, d[1], d[2]], rings: [[0, .1 * sz], [.1, .06 * sz], [.26 * sz, .012]], seg: 6, minSeg: 4, caps: false }); }
  // the eyes: slits of light slanted down toward the middle, a dark pupil in each, a brow of deeper dark over them
  for (const s of [-1, 1]) { const er = s * .21, eu = .19, n = shellNormal(er, eu), f = shellFront(er, eu), tilt = .5;
    const U = [0, -s * Math.sin(tilt), Math.cos(tilt)];
    B.bone('head').color(COL.eye, E_EYE).ellipsoid({ at: [f + n[0] * .01, er + n[1] * .01, eu + n[2] * .01], radius: [.02, .13, .026], rings: low ? 3 : 4, seg: low ? 6 : 10, F: n, U });
    B.bone('head').color(COL.hollow).ellipsoid({ at: [f + n[0] * .03, er - s * .015 + n[1] * .03, eu - .006 + n[2] * .03], radius: [.01, .018, .03], rings: 2, seg: 6, F: n, U: [0, 0, 1] });
    const bn = shellNormal(s * .2, .27), bf = shellFront(s * .2, .27);
    B.bone('head').color(COL.hollow).ellipsoid({ at: [bf + bn[0] * .005, s * .2, .27], radius: [.03, .19, .04], rings: 3, seg: low ? 6 : 8, F: bn, U: [0, -s * Math.sin(-.3), Math.cos(-.3)] }); }
  // The grin: a wide gash wrapping round the front and curling up toward the cheeks, dark at the lips and lit from deep in the
  // throat (channel 2: it brightens as it opens). Its lower half and lower teeth ride the jaw, more so in the middle, so it
  // gapes at the centre and stays closed at the corners.
  const mw = .5, my = -.05, lift = .1, gap = .09, jw = (s, v) => v * (1 - .75 * s * s);
  const lipU = (s, v) => my + lift * s * s - v * (gap * (1 - s * s) + .008), mf = (s, v) => shellFront(s * mw, lipU(s, v)) + .02 - .03 * Math.sin(v * Math.PI) * (1 - .9 * s * s);
  { const cols = full ? 14 : low ? 8 : 10, rows = low ? 2 : 3, grid = [];
    for (let r = 0; r <= rows; r++) { const v = r / rows, row = []; for (let c = 0; c <= cols; c++) { const s = -1 + 2 * c / cols; row.push([mf(s, v), s * mw, C + lipU(s, v)]); } grid.push(row); }
    B.color(COL.maw, E_GLOW).sheet({ grid, vertBones: (r, c) => ['head', 'jaw', jw(-1 + 2 * c / cols, r / rows)],
      tone: (r, c) => { const s = -1 + 2 * c / cols, v = r / rows; return lerpHex(COL.maw, COL.glow, clamp01(1 - Math.hypot(s * 1.5, (v - .8) * 1.6)) * .95); } }); }
  // pale teeth, jagged from above and below
  B.color(COL.tooth);
  const nTop = full ? 13 : low ? 5 : 9, nBot = full ? 10 : low ? 4 : 7;
  for (let i = 0; i < nTop; i++) { const s = -1 + 2 * (i + .5) / nTop, mid = 1 - Math.abs(s) * .7, th = (.06 + .055 * mid) * (i % 2 ? .75 : 1), u = lipU(s, 0), f = mf(s, 0);
    spike(B, [f - .004, s * mw, C + u + .006], [f + .006, s * mw * .99, C + u - th], .022 * mid + .008, i, ['head', 'head', 0, COL.tooth, COL.light]); }
  for (let i = 0; i < nBot; i++) { const s = (-1 + 2 * (i + .5) / nBot) * .84, mid = 1 - Math.abs(s) * .7, th = (.05 + .045 * mid) * (i % 2 ? .8 : 1), u = lipU(s, 1), f = mf(s, 1);
    spike(B, [f - .004, s * mw, C + u - .006], [f + .006, s * mw * .99, C + u + th], .02 * mid + .007, i, ['head', 'jaw', jw(s, 1), COL.tooth, COL.light]); }
  // the heart of light, low behind the grin; the shell's own glow round it shows it through the gas
  B.bone('heart').color(COL.eye, E_EYE).ellipsoid({ at: [0, 0, 0], radius: [.11, .12, .12], rings: low ? 3 : 4, seg: low ? 6 : 10 });
  if (!low) B.bone('heart').color(COL.glow, E_GAS).ellipsoid({ at: [0, 0, 0], radius: [.2, .24, .22], rings: 4, seg: 10 });
  // the arms: tapering out of the body (gas at the root), dark forearms, three long hooked talons, pale at the points
  for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', a0 = bwOf('arm' + tag), e0 = bwOf('fore' + tag), w0 = bwOf('hand' + tag);
    B.color(COL.deep, E_SHELL).loft({ seg: 8, minSeg: 4, sections: [[[a0[0], a0[1] - s * .12, a0[2]], .13, 'arm' + tag, 'arm' + tag, 0], [a0, .11, 'arm' + tag, 'arm' + tag, 0], [[(a0[0] + e0[0]) / 2, (a0[1] + e0[1]) / 2, a0[2]], .095, 'arm' + tag, 'arm' + tag, 0], [e0, .085, 'arm' + tag, 'fore' + tag, .5]]
      .map(([p, r, ba, bb, w]) => ({ at: p, rx: r, rz: r, bones: [ba, bb, w] })), tone: (i) => lerpHex(COL.deep, COL.dark, i / 4), caps: false });
    B.color(lerpHex(COL.deep, COL.dark, .35)).loft({ seg: 8, minSeg: 4, sections: [[[e0[0], e0[1] - s * .04, e0[2]], .088, 'arm' + tag, 'fore' + tag, .6], [e0, .084, 'arm' + tag, 'fore' + tag, .5], [[(e0[0] + w0[0]) / 2, (e0[1] + w0[1]) / 2, e0[2]], .075, 'fore' + tag, 'fore' + tag, 0], [w0, .062, 'fore' + tag, 'hand' + tag, .5], [[w0[0], w0[1] + s * .06, w0[2]], .055, 'hand' + tag, 'hand' + tag, 0]]
      .map(([p, r, ba, bb, w]) => ({ at: p, rx: r, rz: r * .85, bones: [ba, bb, w] })), tone: (i) => lerpHex(COL.deep, COL.dark, .3 + i * .08) });
    for (let j = -1; j <= 1; j++) { const len = (j ? .2 : .25), sp = j * .45, dir = [Math.sin(sp) * .9, s * Math.cos(sp), 0], b0 = [w0[0] + j * .04, w0[1] + s * .07, w0[2]];
      const p = (k) => [b0[0] + dir[0] * len * k + .05 * k * k, b0[1] + dir[1] * len * k, b0[2] - len * (.12 * k + .5 * k * k)];
      B.color(COL.deep).loft({ seg: 5, minSeg: 3, sections: [[0, .03], [.4, .025], [.75, .016], [1, .004]].map(([k, r]) => ({ at: p(k), rx: r, rz: r * 1.2, bones: ['hand' + tag, 'hand' + tag, 0] })),
        tone: (i) => [COL.deep, COL.talonMid, lerpHex(COL.talonMid, COL.talonTip, .6), COL.talonTip][i] }); } }
  // the legs, out of the smoke, each ending in three short talons
  for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', h = bwOf('leg' + tag), foot = [h[0] + .03, h[1] + s * .05, h[2] - .24];
    B.color(COL.deep).loft({ seg: 7, minSeg: 4, sections: [[[h[0], h[1], h[2] + .08], .08], [h, .07], [[(h[0] + foot[0]) / 2 + .02, (h[1] + foot[1]) / 2, (h[2] + foot[2]) / 2], .055], [foot, .04]].map(([p, r]) => ({ at: p, rx: r, rz: r, bones: ['leg' + tag, 'leg' + tag, 0] })), tone: (i) => lerpHex(COL.deep, COL.dark, i * .12) });
    if (!low) for (let j = -1; j <= 1; j++) spike(B, [foot[0] + .02, foot[1] + j * .035, foot[2] + .01], [foot[0] + .1, foot[1] + j * .06, foot[2] - .06], .016, j, ['leg' + tag, 'leg' + tag, 0, COL.talonMid, COL.talonTip]); }
  // The mantle: two great veils sweeping up and out off its shoulders, deep at the root, paling to the glow at the frayed,
  // scalloped edge; ribbed with five filaments of cold light, each ending in a bright bead at the edge.
  for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', rows = full ? 7 : low ? 4 : 5, cols = full ? 13 : low ? 7 : 9, grid = [];
    const vb = (k) => k < .5 ? ['veil' + tag, 'veilMid' + tag, smooth(k / .5)] : ['veilMid' + tag, 'veilTip' + tag, smooth((k - .5) / .5)];
    for (let r = 0; r < rows; r++) { const k = r / (rows - 1), row = []; for (let c = 0; c < cols; c++) row.push(veilPoint(s, c / (cols - 1), k, r === rows - 1 && c % 2 ? .1 : 0)); grid.push(row); }
    B.color(COL.deep, E_GAS).sheet({ grid, vertBones: (r) => vb(r / (rows - 1)),
      tone: (r) => { const k = r / (rows - 1); return k < .55 ? lerpHex(COL.deep, COL.dark, k / .55) : lerpHex(COL.dark, COL.glow, (k - .55) / .45 * .75); } });
    const ribs = low ? [1, 3] : [0, 1, 2, 3, 4], ks = low ? [.05, .4, .75, 1] : [.05, .22, .42, .62, .82, 1];
    for (const j of ribs) { const q = (j + .6) / 5.6;
      B.color(COL.glow, E_EYE).loft({ seg: 4, minSeg: 3, sections: ks.map((k) => { const p = veilPoint(s, q, k); return { at: [p[0] + .03, p[1], p[2]], rx: .011 - k * .005, rz: .011 - k * .005, bones: vb(k) }; }),
        tone: (i) => lerpHex(lerpHex(COL.deep, COL.glow, .45), COL.glow, i / (ks.length - 1)) });
      const p = veilPoint(s, q, 1); B.bone('veilTip' + tag).color(COL.eye, E_EYE).ellipsoid({ at: at('veilTip' + tag, [p[0] + .03, p[1], p[2]]), radius: [.035, .035, .035], rings: 3, seg: 6 }); } }
  // the tendrils trailing out of the smoke below
  G.tendrils.forEach(([, , len], i) => { const t0 = bwOf(`ten${i}_0`), wid = .065 - Math.abs(i - 2) * .008;
    B.color(COL.deep, E_GAS).loft({ seg: 6, minSeg: 3, sections: [[0, 1], [.25, .85], [.5, .6], [.75, .38], [1, .12]].map(([k, r]) => ({ at: [t0[0], t0[1], t0[2] - len * k], rx: wid * r, rz: wid * r,
      bones: k < .5 ? [`ten${i}_0`, `ten${i}_1`, k > .3 ? (k - .3) / .4 : 0] : [`ten${i}_0`, `ten${i}_1`, Math.min(1, .5 + (k - .5))] })), tone: (j) => lerpHex(lerpHex(COL.deep, COL.dark, .5), COL.glow, j / 4 * .9), up: [1, 0, 0] }); });
  // the corona: small cold lights on a faint arc over its head (white cores, each in a halo of the glow)
  const cr = bwOf('corona');
  if (!low) { const pts = []; for (let j = -1; j <= CORONA_N; j++) { const p = coronaLight(j); pts.push([cr[0] + p[0], cr[1] + p[1], cr[2] + p[2]]); }
    B.color(COL.glow, E_GAS).loft({ seg: 4, minSeg: 3, sections: pts.map((p) => ({ at: p, rx: .012, rz: .012, bones: ['corona', 'corona', 0] })), up: [1, 0, 0] }); }
  for (let j = 0; j < CORONA_N; j++) { const p = coronaLight(j), r = j === 4 ? .065 : .042 + (j % 2) * .012, bone = 'corona' + (j % 3);
    B.bone(bone).color(COL.light, E_EYE).ellipsoid({ at: p, radius: [r, r, r], rings: 3, seg: 6 });
    if (!low) B.bone(bone).color(COL.glow, E_GAS).ellipsoid({ at: p, radius: [r * 2, r * 2, r * 2], rings: 3, seg: 6 }); }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function gloomvastMesh(tier = 'full') { return MESHES[tier] ||= buildGloomvastMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createGloomvastTrack() {
  return {
    pose: createPose(GLOOMVAST_SKELETON), yaw: NaN, at: NaN, shown: new Float64Array(NP), primed: false, hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null,
    x: 0, y: 0, z: 0, px: NaN, py: NaN, vf: 0, vr: 0, contactKey: '', contactAt: -Infinity, sway: 0,
    frame: { kind: 'gloomvast', tier: 'full', mesh: null, skin: null, boneCount: GLOOMVAST_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: .5, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
const V = new Float64Array(NP), H = [0, 0, 0], T = [0, 0, 0], J = new Float64Array(3), POLE = [0, 0, 0], TMP = [0, 0, 0];
// the move's pose at progress x through its phase (keyframes eased between)
function keyPose(out, keys, x) {
  let i = 0; while (i < keys.length - 2 && x > keys[i + 1][0]) i++;
  const [x0, a] = keys[i], [x1, b] = keys[Math.min(keys.length - 1, i + 1)], k = x1 > x0 ? smooth((x - x0) / (x1 - x0)) : 1, A = POSE_VEC[a], Bv = POSE_VEC[b];
  for (let n = 0; n < NP; n++) out[n] = A[n] + (Bv[n] - A[n]) * k;
}
const phaseLength = (id, pack) => { const m = ATTACK_MODULES[id] || {}; return pack.phase === 'windup' ? (m.windup || .5) * (pack.paced ? BOSS_PACE.windup : 1) : pack.phase === 'active' ? m.active || .5 : m.recover || .5; };
// a direction in a bone's frame to world (its scale left in; aimWorld normalises)
function toWorld(P, i, f, r, u, out) { const W = P.wr, o = i * 9; for (let k = 0; k < 3; k++) out[k] = W[o + k] * f + W[o + 3 + k] * r + W[o + 6 + k] * u; return out; }

// ------------------------------------------------------------------------------------------------ the pose
export function sampleGloomvast(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(6, Number(env.scale) || 1)), P = tr.pose;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, pack = dead ? null : e.pack, att = pack?.attack || null, ph = pack?.phase || '', d = pack?.data || {};
  // the move's pose from its keyframes and its clock (time left in the phase)
  let prog = 0;
  if (att && ph) { const keys = (G.moves[att] || G.moves.other)[ph] || G.moves.other[ph] || G.moves.other.recover; prog = clamp01(1 - (Number(pack.t) || 0) / phaseLength(att, pack)); keyPose(V, keys, prog); }
  else V.set(POSE_VEC.idle);
  if (dead) V.set(POSE_VEC.death);
  // facing: the move's aim, else the Wayfarer
  let want = tr.yaw;
  if (att && d.aim && Math.hypot(d.aim.x, d.aim.y) > .01) want = Math.atan2(d.aim.y, d.aim.x);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) tr.yaw += Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)) * Math.min(1, dt * (att ? G.attackTurnRate : G.turnRate));
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // drift: its motion in its own frame, eased (it leans into it and its tendrils and veils trail behind)
  const mx = Number.isFinite(tr.px) ? env.x - tr.px : 0, my = Number.isFinite(tr.py) ? env.y - tr.py : 0; tr.px = env.x; tr.py = env.y;
  const jump = Math.hypot(mx, my) > 1.5 || !(dt > 0), vx = jump ? 0 : mx / dt, vy = jump ? 0 : my / dt, ease = Math.min(1, dt * 5);
  tr.vf += (Math.max(-4, Math.min(4, vx * cf + vy * sf)) - tr.vf) * ease; tr.vr += (Math.max(-4, Math.min(4, -vx * sf + vy * cf)) - tr.vr) * ease;
  const plunging = att === 'vastPlunge' && ph === 'active', drift = plunging ? 0 : clamp01(Math.hypot(tr.vf, tr.vr) / 3);
  if (!plunging) { V[0] += .22 * clamp01(tr.vf / 3); V[10] -= .9 * drift; V[7] -= .3 * drift; V[12] += .12 * Math.max(-1, Math.min(1, tr.vr / 3)); }
  // dazed (the reveal's reel, any broken poise): it sags, its veils droop, its corona dims
  const stun = dead ? 0 : clamp01(Number(e.poiseBreak) || 0);
  if (stun > 0) { const dz = POSE_VEC.dazed; for (let k = 0; k < NP; k++) V[k] += (dz[k] - V[k]) * stun; }
  // ease the shown pose toward the target (fast through a move, so its blows keep their timing)
  if (!tr.primed || !(gapMs <= 400)) { tr.shown.set(V); tr.primed = true; }
  else { const k = Math.min(1, dt * (att ? G.attackFollowRate : G.followRate)); for (let n = 0; n < NP; n++) tr.shown[n] += (V[n] - tr.shown[n]) * k; }
  const W = tr.shown;
  // the blow lands: a shudder through it
  const ck = att && G.contact[att]; if (ck && ph === ck[0] && prog >= ck[1]) { const key = `${att}:${pack.seq ?? ''}`; if (tr.contactKey !== key) { tr.contactKey = key; tr.contactAt = now; } }
  const cT = (now - tr.contactAt) / 1000, shock = cT < .6 ? kick(cT, 16, 7) : 0;
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const hT = (now - tr.hitAt) / 1000, hit = hT < G.hitMs / 1000 ? kick(hT, 16, 9) : 0;
  // trembles and pulses on the clocks: a windup quivers; the inhale throbs; the wail shakes it
  const quiver = !reduce && ph === 'windup' ? .012 * Math.sin(t * 38) * prog : 0;
  const inhale = !reduce && att === 'devourPull' && ph === 'active' ? Math.sin(t * 11) : 0;
  const wail = !reduce && att === 'vastWail' && ph === 'recover' ? (1 - prog) * Math.sin(t * 47) : 0;
  const breathe = reduce ? 0 : .025 * Math.sin(t * 1.9) + .012 * Math.sin(t * 2.7 + 1);
  const fade = dead ? smooth(death) : 0;
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  // the body: hovering on its bob; in death it rises a little as it comes apart
  const bob = reduce ? 0 : Math.sin(t * G.bobRate) * G.bob;
  setOffset(P, BI.body, plunging ? .08 : 0, 0, bob + fade * .3 - .04 * shock);
  setEuler(P, BI.body, reduce ? 0 : .03 * wobble(t * .5, 3), W[0] + quiver - .12 * hit + .05 * shock, W[12] + .14 * hit * tr.hitSide + (stun > 0 && !reduce ? .1 * stun * Math.sin(t * 1.8) : 0) + .02 * wail);
  P.scl[BI.body] = Math.max(.001, W[8] * (1 + breathe + .025 * inhale + .04 * Math.abs(shock)) * (1 + .25 * fade)); resolveBone(P, BI.body);
  // the smoke below the waist sways on its own, and trails back as it drifts
  setEuler(P, BI.belly, reduce ? 0 : .08 * wobble(t * .7, 1), -.25 * drift - .3 * (plunging ? 1 : 0) + (reduce ? 0 : .04 * Math.sin(t * 1.3)), reduce ? 0 : .06 * wobble(t * .6, 5)); resolveBone(P, BI.belly);
  // the upper body and face: thrown back to wail, bowed to call the Dark
  setEuler(P, BI.head, reduce ? 0 : .02 * wobble(t * .4, 7), -W[1] + .6 * quiver, reduce ? 0 : .02 * wobble(t * .45, 2)); resolveBone(P, BI.head);
  const open = clamp01(W[2] + (reduce ? 0 : .04 * Math.sin(t * 2.1)) + .08 * inhale + .1 * Math.abs(wail));
  setOffset(P, BI.jaw, -.02 * open, 0, -G.jawDrop * Math.max(0, open - .2) / .8); setEuler(P, BI.jaw, 0, .2 * open, 0); resolveBone(P, BI.jaw);
  // the heart: it beats, and swells with the light it holds
  const beat = reduce ? 0 : Math.pow(Math.max(0, Math.sin(t * 2.6)), 6);
  P.scl[BI.heart] = Math.max(.001, (.85 + .25 * clamp01(W[11] - .5) + .18 * beat) * (1 - fade)); resolveBone(P, BI.heart);
  // the arms: each hand to its target in the upper body's frame by two-bone IK, the elbow hanging slack below and behind
  const hs = P.scl[BI.body] * S, L1 = G.arm[0] * hs, L2 = G.arm[1] * hs;
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const ai = BI['arm' + tag], fi = BI['fore' + tag], hi = BI['hand' + tag];
    resolveBone(P, ai); H[0] = P.wp[ai * 3]; H[1] = P.wp[ai * 3 + 1]; H[2] = P.wp[ai * 3 + 2];
    // devouring: the hands claw in toward the maw on each breath
    const claw = att === 'devourPull' && ph === 'active' && !reduce ? .12 * Math.sin(t * 5.5 + (s > 0 ? 0 : 1.4)) : 0, sway = reduce ? 0 : .04 * Math.sin(t * 1.3 + s);
    boneLocalToWorld(P, 'head', W[3] + claw, s * (W[4] - claw * .5), W[5] + sway, T);
    toWorld(P, BI.head, -.35, s * .15, -1, POLE);
    solveTwoBone(H, T, L1, L2, POLE, J);
    toWorld(P, BI.head, 1, 0, 0, TMP);
    aimWorld(P, ai, s > 0 ? 1 : -2, J[0] - H[0], J[1] - H[1], J[2] - H[2], TMP[0], TMP[1], TMP[2]); resolveBone(P, ai);
    resolveBone(P, fi); aimWorld(P, fi, s > 0 ? 1 : -2, T[0] - J[0], T[1] - J[1], T[2] - J[2], TMP[0], TMP[1], TMP[2]); resolveBone(P, fi);
    // the talons hook down and in, more so as they strike or close
    const curl = .15 + .35 * clamp01(W[0] * 2) + .3 * clamp01(W[9]);
    setEuler(P, hi, -s * .25, 0, -s * curl); resolveBone(P, hi);
  }
  // the legs dangle in the smoke
  for (const [tag, s] of [['L', -1], ['R', 1]]) { setEuler(P, BI['leg' + tag], reduce ? 0 : .06 * Math.sin(t * 1.1 + s), -.3 * drift + (reduce ? 0 : .08 * Math.sin(t * 1.5 + s * 2)), s * .08); resolveBone(P, BI['leg' + tag]); }
  // the veils: raised and spread, wrapped forward or streaming back; their edges flutter in a slow wave
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const fl = reduce ? 0 : 1, ph0 = s > 0 ? 0 : 1.7, spread = W[6], sweep = W[7] + (fl ? .05 * Math.sin(t * .9 + ph0) : 0);
    setEuler(P, BI['veil' + tag], -s * sweep * .55, -.08 * spread + .15 * Math.max(0, -sweep) * (plunging ? 1 : .5), s * (spread * .42 - .06 * Math.abs(shock) + .2 * fade)); resolveBone(P, BI['veil' + tag]);
    setEuler(P, BI['veilMid' + tag], -s * sweep * .3 + fl * .06 * Math.sin(t * 1.4 + ph0), fl * .07 * Math.sin(t * 1.1 + ph0), s * (spread * .15 + fl * .06 * Math.sin(t * 1.4 + ph0 + .9) + .08 * shock)); resolveBone(P, BI['veilMid' + tag]);
    setEuler(P, BI['veilTip' + tag], -s * sweep * .3 + fl * .1 * Math.sin(t * 1.4 + ph0 - .8), fl * .1 * Math.sin(t * 1.7 + ph0 - .6), s * (spread * .2 + fl * .09 * Math.sin(t * 1.4 + ph0 - .3) + .12 * shock)); resolveBone(P, BI['veilTip' + tag]);
  }
  // the corona: drawn in and down toward the mouth (the grave lights) or the heart (the Dark), flared out as they go; its lights twinkle
  const crown = W[9], inward = Math.max(0, crown), flare = Math.max(0, -crown);
  setOffset(P, BI.corona, inward * .25, 0, -inward * (att === 'vastDark' ? 1.05 : .72) + (reduce ? 0 : .025 * Math.sin(t * 1.2)));
  setEuler(P, BI.corona, reduce ? 0 : .05 * Math.sin(t * .6), .25 * inward, 0);
  P.scl[BI.corona] = Math.max(.001, (1 - .72 * inward + .3 * flare + .04 * Math.abs(shock)) * (1 - stun * .15) * (1 + fade * .8)); resolveBone(P, BI.corona);
  for (let g = 0; g < 3; g++) { P.scl[BI['corona' + g]] = reduce ? 1 : 1 + .05 * Math.sin(t * 2.3 + g * 2.1); setEuler(P, BI['corona' + g], 0, 0, reduce ? 0 : .03 * Math.sin(t * .8 + g)); resolveBone(P, BI['corona' + g]); }
  // the tendrils: hanging back and down, trailing harder as it drifts and streaming behind the plunge; swept toward the maw as it devours
  G.tendrils.forEach(([r0], i) => { const b0 = BI[`ten${i}_0`], b1 = BI[`ten${i}_1`], trail = W[10], w0 = reduce ? 0 : Math.sin(t * 1.7 + i * 1.3), w1 = reduce ? 0 : Math.sin(t * 1.7 + i * 1.3 - 1.1);
    toWorld(P, BI.belly, -1 + .7 * trail, r0 * .7 + .22 * w0, -.5 + .2 * Math.max(0, -trail), TMP); toWorld(P, BI.belly, 1, 0, 0, H);
    aimWorld(P, b0, -3, TMP[0], TMP[1], TMP[2], H[0], H[1], H[2]); resolveBone(P, b0);
    toWorld(P, BI.belly, -1.3 + 1.1 * trail, r0 * .6 + .4 * w1, -.12 + .12 * Math.max(0, -trail) + .15 * w0, TMP);
    aimWorld(P, b1, -3, TMP[0], TMP[1], TMP[2], H[0], H[1], H[2]); resolveBone(P, b1); });
  writeSkin(P);
  // light and gas: the shell and arm roots (3) and the veils, tendrils and haloes (4) flicker, never quite settled in this world
  const F = tr.frame, life = 1 - fade, glow = W[11], flick = reduce ? 0 : Math.sin(t * 2.3) * Math.sin(t * .7 + 1);
  F.emitK[0] = life * (1.25 + .4 * clamp01(glow - .5) + .25 * beat); // eyes, the heart, the corona's lights, the veils' ribs and beads
  F.emitK[1] = life * (.45 + 1.1 * open * (.6 + .4 * glow) + .1 * beat); // the throat
  F.emitK[2] = life * (.85 + .25 * clamp01(glow - .5) + .15 * beat);
  F.emitK[3] = life * (.6 + .25 * clamp01(glow - .5));
  F.emitA[0] = 1; F.emitA[1] = 1;
  F.emitA[2] = clamp01((G.shellAlpha[0] + G.shellAlpha[1] * flick) * life); F.emitA[3] = clamp01((G.gasAlpha[0] + G.gasAlpha[1] * flick) * life);
  F.tier = env.tier || 'full'; F.mesh = gloomvastMesh(F.tier); F.skin = P.skin;
  F.alpha = (dead ? 1 - span(death, .35, 1) : 1) * (plunging || e.phasing ? G.phasingAlpha : 1);
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = (C + bob) * S; F.shadow = .5 * (1 - fade);
  F.phase = att ? `${att}:${ph}` : dead ? 'death' : 'move'; F.contact = cT < .15 ? 1 : 0; F.cloud = false;
  return F;
}
export const gloomvastBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
