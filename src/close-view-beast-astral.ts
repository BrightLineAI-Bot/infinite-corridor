// The Astral Worm in Close View: the standard view's ink creature (astral-worm-render.ts drawAstralWorm: "an elongated blackness
// that makes and unmakes its own limbs") as one skinned body on the shared beast rig. Every form the fight uses lives on one
// skeleton, and the body morphs between them on the game's own morph clock (e.astral.form, previousForm, clock - morphStart over
// ASTRAL.morphTime), exactly where drawAstralMorph cross-fades its silhouettes:
// - worm (and the rings, the mirage and the ink worm): nine ink beads, the front the largest, a travelling wave down the length;
// - flight: the beads lifted, two pairs of long translucent insect wings buzzing, hooked mandibles and bulb eyes at the head, and
//   the mouth beam to the ground where the game's beam hazard stands (astralBeamAnchors);
// - trample (and the ink trample): ink limbs grown along both sides, churning the ground as it charges;
// - bite: the limbs, and a round maw ringed with teeth that opens and snaps on the game's bite clock;
// - pool (and the ink pool): the beads melt into a puddle of ink whose spikes erupt when the pool goes live;
// - griffin: the beads gather into an eagle's breast, neck and head (hooked beak, swept crest), a lion's barrel and haunch,
//   eagle wings, raptor forelegs and lion hind legs with padded paws, a tufted tail, crouching and pouncing on the pounce clock.
// Parts a form does not use are drawn back into the body (scaled to nothing at their root), so a morph grows and unmakes limbs.
// Nothing here changes timing, damage, reach or targeting.
import {
  defineSkeleton, createPose, resetPose, setEuler, resolveBone, writeSkin, meshBuilder, clamp01, smooth, span, kick, wobble,
} from "./close-view-beast-rig.ts";
import { ASTRAL, ASTRAL_GEOMETRY, ASTRAL_INK_FORMS } from "./astral-worm.ts";

const SEGS = 9, U2 = ASTRAL_GEOMETRY.drawScale; // the standard view draws in units of .65 tiles (scale q.u x .65)
export const ASTRAL_CV_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  hover: .7, // the worm's beads float with their centres .7 tiles up (the standard view's line at y -.12 over its ground at .95)
  flightLift: ASTRAL_GEOMETRY.flightLift / 1.25, // the standard view lifts the flier by .8 tiles x scale; the root carries x 1.25 of that
  trampleHover: .56, griffinHover: .66,
  wave: .085, waveRate: 5, waveStep: .65, sway: .05, // the standard view's bead wave (sin(t*5 - i*.65) * .13 units)
  buzz: 34, buzzAmp: .2, // the insect wings' beat
  turnRate: 4, attackTurnRate: 9, deathMs: 1900, hitMs: 300, travelSettle: 6,
  // the bite's maw and jaw, the trample's churn, the griffin's pounce body
  biteOpen: .35, biteShut: .17, churnFast: 15, churnSlow: 7, pounceArc: .42, crouch: .2,
  hidden: .001,
});

// ------------------------------------------------------------------------------------------------ skeleton
// model space: f forward, r right, u up; the root on the ground under the actor. `body` carries the hover. The beads hang
// directly off the body, so every form places each one where it wants it (the morph blends those places).
const HOVER = ASTRAL_CV_RIG.hover;
const BEAD_F = Array.from({ length: SEGS }, (_, i) => (.8 - .35 * i) * U2), BEAD_R = Array.from({ length: SEGS }, (_, i) => (.42 - .025 * i) * U2);
// the griffin's layout (from the standard view's griffin, in tiles, relative to its body centre .66 up)
const GH = ASTRAL_CV_RIG.griffinHover;
const GRIFFIN_BEADS = Object.freeze([
  // [f, u, scale]: s0 the head, s1 the neck, s2 the breast, s3..s6 the barrel to the haunch, s7..s8 drawn into the tail root
  [.70, .5, .78], [.58, .33, .72], [.32, .1, 1.2], [.06, .03, 1.28], [-.2, .01, 1.32], [-.42, .02, 1.36], [-.6, .05, 1.42], [-.7, .04, .35], [-.72, .04, .2],
]);
const FORE_AT = [.34, .155, -.05], HIND_AT = [-.58, .175, -.1], LEG = Object.freeze({ fore: [.31, .3], hind: [.27, .31] });
const LIMB_SEG = [1, 4, 7];
export const ASTRAL_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'body', parent: 'root', at: [0, 0, HOVER] },
  ...BEAD_F.map((f, i) => ({ name: 's' + i, parent: 'body', at: [f, 0, 0] })),
  // on the head: the bite's upper maw and its jaw, the flier's mandibles, the griffin's beak and crest, the beam's mouth
  { name: 'maw', parent: 's0', at: [.12, 0, .02] }, { name: 'jaw', parent: 's0', at: [.12, 0, -.02] },
  { name: 'mandL', parent: 's0', at: [.18, -.11, -.04] }, { name: 'mandR', parent: 's0', at: [.18, .11, -.04] },
  { name: 'ghead', parent: 's0', at: [0, 0, 0] },
  { name: 'beamTop', parent: 's0', at: [.27, 0, -.1] },
  { name: 'gwingL', parent: 'body', at: [.16, -.17, .2] }, { name: 'gwingR', parent: 'body', at: [.16, .17, .2] },
  { name: 'fwingL', parent: 'body', at: [-.02, -.12, .14] }, { name: 'fwingR', parent: 'body', at: [-.02, .12, .14] },
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
    return [{ name: 'fu' + tag, parent: 'body', at: [FORE_AT[0], s * FORE_AT[1], FORE_AT[2]] }, { name: 'fl' + tag, parent: 'fu' + tag, at: [0, 0, -LEG.fore[0]] },
      { name: 'hu' + tag, parent: 'body', at: [HIND_AT[0], s * HIND_AT[1], HIND_AT[2]] }, { name: 'hl' + tag, parent: 'hu' + tag, at: [0, 0, -LEG.hind[0]] }]; }),
  { name: 'tail0', parent: 'body', at: [-.7, 0, .02] }, { name: 'tail1', parent: 'tail0', at: [-.3, 0, .08] },
  { name: 'pool', parent: 'root', at: [-.1, 0, 0] }, { name: 'spikes', parent: 'pool', at: [0, 0, 0] },
  ...LIMB_SEG.flatMap((sg, g) => ['L', 'R'].map((tag) => ({ name: 'limb' + g + tag, parent: 'body', at: [BEAD_F[sg], (tag === 'L' ? -1 : 1) * BEAD_R[sg] * .7, -.04] }))),
  { name: 'beamFoot', parent: 'root', at: [ASTRAL_GEOMETRY.mouthX * U2 / 1.25, 0, .02] },
]);
const BI = ASTRAL_SKELETON.index, NB = ASTRAL_SKELETON.count;
// emissive: 3 the translucent membranes and the beam's halo (two-sided, dithered); 4 the beam's core and its splash
const E_VEIL = 3, E_BEAM = 4;

// ------------------------------------------------------------------------------------------------ the body
const hexOf = (c) => parseInt(String(c).slice(1), 16);
// drawAstralWorm's colours, as numbers
const C = Object.freeze({ ink: hexOf("#07090e"), inkMid: hexOf("#0b1017"), inkHi: hexOf("#263039"), deep: hexOf("#030508"), rim: hexOf("#697785"), sheen: hexOf("#28333b"),
  shade: hexOf("#2c3843"), scale: hexOf("#3b4752"), claw: hexOf("#aeb8c0"), clawFill: hexOf("#12161c"), eye: hexOf("#abb8c1"), brow: hexOf("#b3bcc2"), beak: hexOf("#10151c"),
  wing: hexOf("#233442"), wingEdge: hexOf("#71828d"), vein: hexOf("#8193a1"), mandLine: hexOf("#354450"), bristle: hexOf("#8e9ba5"),
  gum: hexOf("#4b2830"), mouth: hexOf("#020204"), tongue: hexOf("#713941"), tooth: hexOf("#bfb5a6"), toothDark: hexOf("#8b8075"), lip: hexOf("#9a5862"),
  beamCore: hexOf("#fff1fb"), beamGlow: hexOf("#db9fc5"), poolSheen: hexOf("#37434b") });
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
// ink: lit grey-blue on top, black beneath (the standard view's radial gradient #263039 -> #0b1017 -> #030508)
const inkTone = (st, hi = C.inkHi) => st > .35 ? lerpHex(C.inkMid, hi, (st - .35) / .65) : lerpHex(C.deep, C.inkMid, (st + 1) / 1.35);
function buildAstralMesh(tier) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(ASTRAL_SKELETON, full ? 1 : low ? .4 : .7), bw = ASTRAL_SKELETON.bindWorld;
  const W = (bone) => [bw[BI[bone] * 3], bw[BI[bone] * 3 + 1], bw[BI[bone] * 3 + 2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  // a bead: an ink ellipsoid as a loft (so it can be toned: lit on top, a pale rim round its back edge where the bead behind
  // tucks under it, as the standard view outlines every oval)
  const bead = (bone, a, r, rimAt = 2, seg = 14) => {
    const c = W(bone), n = low ? 3 : full ? 6 : 5, secs = [];
    for (let k = 0; k <= n; k++) { const ph = .12 + (Math.PI - .24) * (k / n), f = Math.cos(ph) * a, rr = Math.sin(ph) * r; secs.push({ at: [c[0] + f, c[1], c[2]], rx: rr, rz: rr, bones: [bone, bone, 0] }); }
    const rimK = n - rimAt;
    B.color(C.ink).loft({ seg: low ? 8 : seg, minSeg: low ? 4 : 5, sections: secs, caps: true, tone: (i, k, st) => i === rimK ? lerpHex(C.rim, C.inkHi, .25 + .3 * (1 - st)) : inkTone(st) });
  };
  // ---- the beads (the worm's length; every other form rearranges them)
  for (let i = 0; i < SEGS; i++) {
    const b = 's' + i, r = BEAD_R[i];
    bead(b, r * 1.1, r, low ? 1 : 2, full ? 11 : 10);
    // the sheen: a dull lit oval along the top of each bead (the standard view's #28333b stroke)
    if (!low && i < 7) B.bone(b).color(C.sheen).ellipsoid({ at: [-.05 * U2, 0, r * .9], radius: [r * .62, r * .34, r * .14], rings: 2, seg: full ? 8 : 6, U: [0, 0, 1] });
  }
  // ---- the bite's maw: a ring of dark gum facing forward, black within, the teeth hooked in; the upper half on `maw`, the
  // lower on `jaw`, so the jaw drops and snaps
  { const R0 = .22;
    for (const [bone, sgn] of [['maw', 1], ['jaw', -1]]) {
      // the gum: a half-ring tube round the mouth, darker within, its lip line paler
      { const n2 = low ? 3 : full ? 7 : 5, secs = [], o2 = W(bone);
        for (let i = 0; i <= n2; i++) { const a = -.12 + (Math.PI + .24) * (i / n2); secs.push({ at: [o2[0] + .12, o2[1] + Math.cos(a) * R0, o2[2] + sgn * Math.sin(a) * R0 * 1.1], rx: .05, rz: .045, bones: [bone, bone, 0] }); }
        B.color(C.gum).loft({ seg: low ? 4 : 7, minSeg: 4, up: [1, 0, 0], sections: secs, caps: true, tone: (i, k, st) => k === 0 ? C.lip : lerpHex(C.gum, C.mouth, clamp01(-Math.cos((k / (low ? 4 : 7)) * Math.PI * 2)) * .5) }); }
      // the dark within (a half disc)
      B.bone(bone).color(C.mouth).ellipsoid({ at: [.1, 0, sgn * .07], radius: [.03, R0 * .95, R0 * .62], rings: 2, seg: low ? 6 : 8 });
      // teeth along the half-ring, pointing in toward the throat and a little back
      const nt = low ? 2 : full ? 7 : 5;
      for (let i = 0; i < nt; i++) { const a = ((i + .5) / nt) * Math.PI, y = Math.cos(a) * R0 * .92, z = sgn * Math.sin(a) * R0 * .98;
        B.bone(bone).color(i % 3 ? C.tooth : C.toothDark).lathe({ at: [.15, y, z], F: [.25, -y * 3.2, -z * 3.2], rings: [[0, .022], [.075, .002]], seg: 4, caps: false }); }
    }
    // the tongue on the jaw
    B.bone('jaw').color(C.tongue).ellipsoid({ at: [.08, 0, -.06], radius: [.1, .07, .03], rings: 3, seg: low ? 6 : 8 });
  }
  // ---- the flier's mandibles: a broad root, a knuckle, a hooked blade with teeth along its inner edge; a bulb eye and bristles
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'mandL' : 'mandR', o = W(bone);
    const P = [[0, 0, 0, .05], [.11, .07, -.01, .045], [.25, .1, -.02, .035], [.38, .07, -.02, .026], [.46, .0, -.015, .016], [.49, -.05, -.01, .006]];
    B.color(C.ink).loft({ seg: low ? 4 : 6, minSeg: 4, sections: (low ? P.filter((_, j) => j % 2 === 0 || j === P.length - 1) : P).map(([f, r, u, rad], j) => ({ at: [o[0] + f, o[1] + s * r, o[2] + u], rx: rad, rz: rad * .75, bones: [bone, bone, 0] })),
      tone: (i, k, st) => i === 2 ? C.mandLine : inkTone(st, C.shade) });
    if (!low) for (const [f, r] of [[.3, .07], [.38, .045]]) B.bone(bone).color(C.toothDark).lathe({ at: [f, s * r, -.02], F: [0, -s, -.15], rings: [[0, .014], [.045, .001]], seg: 4, caps: false });
    B.bone(bone).color(C.ink).ellipsoid({ at: [-.06, s * .05, .13], radius: [.1, .09, .09], rings: low ? 2 : 4, seg: low ? 5 : 8 });
    B.bone(bone).color(C.rim).ellipsoid({ at: [-.01, s * .07, .17], radius: [.04, .035, .025], rings: 2, seg: 6 });
    if (!low) for (let j = 0; j < 2; j++) B.bone(bone).color(C.bristle).lathe({ at: [-.12 - j * .06, s * .02, .14], F: [-.3, s * .25, 1], rings: [[0, .008], [.16, .001]], seg: 3, caps: false });
  }
  // ---- the griffin's head (on the head bead, which the griffin shrinks to .78): a cere and hooked upper beak, a lower
  // mandible, pale eyes under a pale brow stroke, a swept crest of liquid points
  { const g = 1 / GRIFFIN_BEADS[0][2], o = W('ghead'), at = (f, r, u) => [o[0] + f * g, o[1] + r * g, o[2] + u * g], loc = (f, r, u) => [f * g, r * g, u * g];
    B.color(C.beak).loft({ seg: low ? 6 : 9, minSeg: 4, sections: [[.13, .06, .07], [.22, .055, .06], [.3, .035, .045], [.36, .0, .03], [.385, -.06, .018], [.37, -.11, .006]]
      .map(([f, u, r]) => ({ at: at(f, 0, u), rx: r * g * .8, rz: r * g, bones: ['ghead', 'ghead', 0] })), tone: (i, k, st) => lerpHex(C.beak, C.shade, clamp01(st) * .5) });
    B.color(C.ink).loft({ seg: low ? 5 : 7, minSeg: 4, sections: [[.14, -.03, .045], [.23, -.035, .035], [.3, -.05, .015]]
      .map(([f, u, r]) => ({ at: at(f, 0, u), rx: r * g * .8, rz: r * g * .6, bones: ['ghead', 'ghead', 0] })) });
    for (const s of [-1, 1]) {
      B.bone('ghead').color(C.eye).ellipsoid({ at: loc(.1, s * .115, .06), radius: [.028 * g, .014 * g, .022 * g], rings: 3, seg: 6 });
      B.bone('ghead').color(C.brow).ellipsoid({ at: loc(.06, s * .118, .1), radius: [.075 * g, .01 * g, .012 * g], rings: 2, seg: 5, F: [1, 0, .15] });
      if (!low) B.bone('ghead').color(C.scale).ellipsoid({ at: loc(-.02, s * .1, -.04), radius: [.08 * g, .012 * g, .05 * g], rings: 2, seg: 5, F: [-.6, 0, -.8] });
    }
    for (let j = low ? 1 : 0; j < (low ? 3 : 4); j++) { const r = (j - 1.5) * .045;
      B.bone('ghead').color(C.ink).lathe({ at: loc(-.08, r, .1 - Math.abs(r) * .3), F: [-.9, r * 1.5, .45 - j * .05], rings: [[0, .045 * g], [.12 * g, .025 * g], [.24 * g, .002]], seg: low ? 4 : 5, caps: false }); }
  }
  // ---- the griffin's eagle wings: a raised membrane of coverts and long separate primaries (built spread along r)
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'gwingL' : 'gwingR', o = W(bone), span = 1.15, rows = low ? 1 : full ? 3 : 2, cols = low ? 3 : full ? 6 : 4;
    const lead = (q) => .06 + .05 * Math.sin(Math.PI * q), chord = (q) => .34 - .12 * q;
    const grid = [];
    for (let r = 0; r <= rows; r++) { const k = r / rows, row = [];
      for (let c = 0; c <= cols; c++) { const q = c / cols; row.push([o[0] + lead(q) - chord(q) * k, o[1] + s * (.02 + span * q), o[2] + .04 * Math.sin(Math.PI * q) - .03 * k]); }
      grid.push(row); }
    B.sheet({ grid, vertBones: () => [bone, bone, 0], tone: (r, c) => r === 0 ? lerpHex(C.ink, C.rim, .18) : (c + r) % 2 ? C.inkMid : C.deep });
    const np = low ? 2 : full ? 7 : 5;
    for (let i = 0; i < np; i++) { const q = i / (np - 1), root = [o[0] - .02 - q * .3, o[1] + s * (span * (.78 + .22 * (1 - q))), o[2]], len = .5 - .12 * Math.abs(q - .3), dir = [-.25 - .9 * q, s * (1 - q * .6), 0], dl = Math.hypot(dir[0], dir[1]);
      B.bone(bone).color(i % 2 ? C.inkMid : C.ink).lathe({ at: [root[0] - o[0], root[1] - o[1], root[2] - o[2]], F: [dir[0] / dl, dir[1] / dl, 0], U: [0, 0, 1], rs: 1, us: .22, rings: [[0, .045], [len * .55, .05], [len, .004]], seg: low ? 4 : 6, caps: false }); }
  }
  // ---- the griffin's legs: raptor forelegs (a feathered upper leg with a ragged hem, a scaled tarsus, three forward toes and
  // a hallux with hooked pale claws) and lion hind legs (a muscled thigh; gaskin, hock and a padded paw with three claws)
  for (const s of [-1, 1]) {
    const tag = s < 0 ? 'L' : 'R', fu = 'fu' + tag, fl = 'fl' + tag, hu = 'hu' + tag, hl = 'hl' + tag;
    { const o = W(fu), L1 = LEG.fore[0];
      B.color(C.ink).loft({ seg: low ? 5 : 8, sections: ([[.03, .02, .11, .1], [.0, -.12, .1, .09], [-.02, -L1 * .78, .06, .055], [0, -L1, .04, .035]].filter((_, j) => !low || j !== 1))
        .map(([f, u, rx, rz]) => ({ at: [o[0] + f, o[1], o[2] + u], rx, rz, bones: [fu, fu, 0] })), tone: (i, k, st) => inkTone(st) });
      if (!low) for (let j = 0; j < (full ? 4 : 3); j++) { const a = -1.1 + j * .7; B.bone(fu).color(j % 2 ? C.inkMid : C.ink).lathe({ at: [-.02 + .04 * Math.cos(a), .06 * Math.sin(a), -L1 * .55], F: [-.35, .3 * Math.sin(a), -1], rings: [[0, .035], [.12, .002]], seg: 4, caps: false }); }
      const o2 = W(fl), L2 = LEG.fore[1];
      B.color(C.ink).loft({ seg: low ? 5 : 7, minSeg: 4, sections: [[0, 0, .038], [.01, -L2 * .5, .03], [.02, -L2 + .03, .026]]
        .map(([f, u, r]) => ({ at: [o2[0] + f, o2[1], o2[2] + u], rx: r, rz: r, bones: [fl, fl, 0] })), tone: (i, k, st) => (i === 1 ? C.scale : inkTone(st)) });
      const toes = low ? [[.16, 0]] : full ? [[.15, -.05], [.17, 0], [.15, .05], [-.09, 0]] : [[.15, -.04], [.15, .04], [-.09, 0]];
      for (const [tf, tr] of toes) { const dir = [tf, tr, -.02], dl = Math.hypot(...dir);
        B.bone(fl).color(C.ink).lathe({ at: [.02, 0, -L2 + .02], F: [dir[0] / dl, dir[1] / dl, dir[2] / dl], rings: [[0, .022], [dl, .014]], seg: 4, caps: false });
        if (!low) B.bone(fl).color(C.claw).lathe({ at: [.02 + tf, tr, -L2 + .015], F: [Math.sign(tf) * .6, 0, -.8], rings: [[0, .011], [.05, .001]], seg: 4, caps: false }); }
    }
    {
      B.bone(hu).color(C.ink).ellipsoid({ at: [-.01, 0, -.1], radius: [.16, .1, .2], rings: low ? 3 : 4, seg: low ? 6 : 8, F: [.3, 0, -1], U: [1, 0, .3] });
      if (!low) B.bone(hu).color(C.shade).ellipsoid({ at: [.03, s * .08, -.04], radius: [.12, .012, .06], rings: 2, seg: 5, F: [1, 0, -.4] });
      const o2 = W(hl), L2 = LEG.hind[1];
      B.color(C.ink).loft({ seg: low ? 4 : 7, minSeg: 4, sections: (low ? [[.0, 0, .07], [-.13, -.15, .045], [-.02, -LEG.hind[1] + .045, .036]] : [[.0, 0, .07], [-.08, -.07, .062], [-.13, -.15, .045], [-.09, -.22, .036], [-.02, -L2 + .045, .036]])
        .map(([f, u, r]) => ({ at: [o2[0] + f, o2[1], o2[2] + u], rx: r * .85, rz: r, bones: [hl, hl, 0] })), tone: (i, k, st) => inkTone(st) });
      B.bone(hl).color(C.ink).ellipsoid({ at: [.04, 0, -L2 + .035], radius: [.1, .07, .04], rings: low ? 2 : 3, seg: low ? 5 : 8 });
      for (const cr of low ? [] : [-.04, 0, .04]) B.bone(hl).color(C.claw).lathe({ at: [.13, cr, -L2 + .02], F: [.6, 0, -.8], rings: [[0, .012], [.04, .001]], seg: 4, caps: false });
    }
  }
  // ---- the lion's tail: a tapering sweep back and up, ending in a flame-shaped tuft of ink points
  { const a = W('tail0'), b = W('tail1');
    B.color(C.ink).loft({ seg: low ? 5 : 7, minSeg: 4, sections: [[a, .05, 'tail0', 'tail0', 0], [[a[0] - .16, 0, a[2] + .02], .042, 'tail0', 'tail1', .3], [b, .036, 'tail1', 'tail1', 0], [[b[0] - .14, 0, b[2] + .13], .028, 'tail1', 'tail1', 0], [[b[0] - .22, 0, b[2] + .3], .022, 'tail1', 'tail1', 0]]
      .map(([p, r, x, y, w]) => ({ at: p, rx: r, rz: r, bones: [x, y, w] })), tone: (i, k, st) => inkTone(st) });
    for (let j = low ? 1 : 0; j < (low ? 2 : 4); j++) { const a2 = (j - 1.5) * .45;
      B.bone('tail1').color(C.ink).lathe({ at: [-.22, 0, .3], F: [-.8, .3 * Math.sin(a2), .25 + .3 * Math.cos(a2)], rings: [[0, .04], [.06, .03], [.17, .002]], seg: low ? 4 : 5, caps: false }); }
  }
  // ---- the pool: a domed puddle of ink with a grey sheen, and twelve spikes thrown out round it (built standing out)
  { const o = W('pool');
    B.color(C.ink).loft({ seg: low ? 8 : 14, up: [1, 0, 0], sections: [[.0, .02], [.012, .9], [.06, .82], [.12, .6], [.16, .32], [.175, .04]]
      .map(([u, r]) => ({ at: [o[0], o[1], u], rx: r, rz: r * .86, bones: ['pool', 'pool', 0] })), tone: (i) => i === 2 ? lerpHex(C.rim, C.ink, .4) : i >= 3 ? lerpHex(C.inkMid, C.inkHi, (i - 3) / 2) : C.deep });
    if (!low) B.bone('pool').color(C.poolSheen).ellipsoid({ at: [.05, 0, .16], radius: [.32, .14, .012], rings: 2, seg: 8, F: [1, .2, 0] });
    const n = low ? 6 : 12;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + .13, ca = Math.cos(a), sa = Math.sin(a), len = .6 + .1 * ((i * 7) % 3);
      B.bone('spikes').color(i % 2 ? C.ink : C.inkMid).lathe({ at: [ca * .45, sa * .4, .02], F: [ca * .78, sa * .78, .62], rings: low ? [[0, .08], [len, .003]] : [[0, .09], [len * .5, .05], [len, .003]], seg: low ? 4 : 5, caps: false }); }
  }
  // ---- the trample's and the bite's ink limbs: three to a group along each side, bent at an elbow, every third a splayed hand
  for (let g = 0; g < LIMB_SEG.length; g++) for (const s of [-1, 1]) {
    const bone = 'limb' + g + (s < 0 ? 'L' : 'R'), o = W(bone);
    for (let j = 0; j < 3; j++) { if (!full && j === 1 || low && j === 2) continue; const fo = (j - 1) * .2, reach = .5 - .05 * Math.abs(j - 1);
      const pts = [[fo * .3, 0, 0, .045], [fo + .06, s * .26, .12, .04], [fo + .02, s * .4, -.1, .032], [fo, s * .46, -reach, .014]];
      B.color(C.ink).loft({ seg: 4, minSeg: 4, sections: (low ? pts.filter((_, q) => q !== 2) : pts).map(([f, r, u, rad]) => ({ at: [o[0] + f, o[1] + r, o[2] + u], rx: rad, rz: rad, bones: [bone, bone, 0] })), caps: false,
        tone: (i, k, st) => i === 1 ? lerpHex(C.ink, C.rim, .35 + .25 * st) : inkTone(st) });
      if ((g + j) % 3 === 0 && full) for (let q = 0; q < 4; q++) B.bone(bone).color(C.ink).lathe({ at: [fo, s * .46, -reach + .01], F: [(q - 1.5) * .35, s * .25, -1], rings: [[0, .014], [.08, .002]], seg: 3, caps: false });
    }
  }
  // ---- optional (flight only): the insect wings, two to a side fanned back (translucent, channel 3); the mouth beam from
  // the mouth to the beam's ground point (its core channel 4, its halo channel 3) with a splash where it strikes
  B.mark();
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'fwingL' : 'fwingR', o = W(bone), cols = low ? 5 : full ? 9 : 7, rows = low ? 2 : 3;
    for (let j = 0; j < 2; j++) {
      const len = 1.32 - j * .08, back = .42 + j * .38, dir = [-Math.sin(back), s * Math.cos(back)], side = [dir[1] * s, -dir[0] * s], wide = .14 - j * .01;
      const grid = [];
      for (let r = 0; r <= rows; r++) { const k = (r / rows) * 2 - 1, row = [];
        for (let c = 0; c <= cols; c++) { const q = c / cols, half = wide * Math.sin(Math.PI * Math.min(1, q * 1.08 + .04)) * (q < .1 ? .4 + 6 * q : 1) + .02;
          row.push([o[0] + dir[0] * len * q + side[0] * s * half * k * (k < 0 ? 1.2 : .8), o[1] + dir[1] * len * q + side[1] * s * half * k, o[2] - .02 * j + .03 * q]); }
        grid.push(row); }
      B.color(C.wing, E_VEIL).sheet({ grid, vertBones: () => [bone, bone, 0], tone: (r, c) => r === 0 || r === rows ? C.wingEdge : r === rows / 2 || (rows === 3 && r === 1) ? lerpHex(C.wing, C.vein, .5) : C.wing });
    }
  }
  { const top = W('beamTop'), foot = W('beamFoot'), n = 4;
    for (const [rad, col, ch, sg] of [[.075, C.beamGlow, E_VEIL, low ? 6 : 10], [.026, C.beamCore, E_BEAM, low ? 5 : 8]]) {
      const secs = [];
      for (let i = 0; i <= n; i++) { const q = i / n; secs.push({ at: [top[0] + (foot[0] - top[0]) * q, top[1] + (foot[1] - top[1]) * q, top[2] + (foot[2] - top[2]) * q], rx: rad * (.75 + .25 * q), rz: rad * (.75 + .25 * q), bones: ['beamTop', 'beamFoot', q] }); }
      B.color(col, ch).loft({ seg: sg, up: [1, 0, 0], sections: secs, caps: true });
    }
    B.bone('beamFoot').color(C.beamCore, E_BEAM).ellipsoid({ at: [0, 0, 0], radius: [.14, .14, .025], rings: 3, seg: low ? 8 : 12, U: [0, 0, 1] });
    B.bone('beamFoot').color(C.beamGlow, E_VEIL).ellipsoid({ at: [0, 0, .01], radius: [.32, .32, .05], rings: 3, seg: low ? 8 : 14, U: [0, 0, 1] });
  }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function astralMesh(tier = 'full') { return MESHES[tier] ||= buildAstralMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
const FORMS = ['worm', 'pool', 'trample', 'bite', 'flight', 'griffin'];
export function createAstralTrack() {
  return {
    pose: createPose(ASTRAL_SKELETON), yaw: NaN, at: NaN, px: NaN, py: NaN, travel: 0, hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null, x: 0, y: 0, z: 0,
    snap: new Float64Array(NB * 7), snapped: false,
    frame: { kind: 'astralWorm', tier: 'full', mesh: null, skin: null, boneCount: NB, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ what it is doing
// The game's attack clock as presentation numbers (all from e.astral: move, elapsed, its phases' constants).
const ACT = { rear: 0, lunge: 0, open: 0, churn: 0, spike: 0, beam: 0, wings: 0, crouch: 0, leap: -1, land: 0, pulse: 0, drain: 0, contact: 0, lock: false, phase: 'move' };
function act(a) {
  ACT.rear = 0; ACT.lunge = 0; ACT.open = 0; ACT.churn = 0; ACT.spike = 0; ACT.beam = 0; ACT.wings = 0; ACT.crouch = 0; ACT.leap = -1; ACT.land = 0; ACT.pulse = 0; ACT.drain = 0; ACT.contact = 0; ACT.lock = false;
  const mv = a?.move, t = Math.max(0, Number(a?.elapsed) || 0), wu = ASTRAL.windup, live = t >= wu;
  ACT.phase = mv ? `astral:${mv}:${live ? 'active' : 'windup'}` : 'move';
  if (!mv) return;
  if (ASTRAL_INK_FORMS[mv]) {
    // the ink throw: it draws back while the landing marks show, flings the three gouts out, and takes them back in
    const A = ASTRAL.inkWarning, Bo = A + ASTRAL.inkOutbound, Cs = Bo + ASTRAL.inkSplat;
    ACT.lock = true;
    if (t < A) ACT.rear = smooth(t / A);
    else if (t < Bo) { const q = (t - A) / ASTRAL.inkOutbound; ACT.rear = 1 - smooth(q * 2); ACT.lunge = Math.sin(Math.PI * Math.min(1, q * 1.3)); }
    else if (t < Cs) { ACT.lunge = .2 * (1 - (t - Bo) / ASTRAL.inkSplat); ACT.contact = 1; }
    else ACT.rear = .3 * Math.sin(Math.PI * clamp01((t - Cs) / ASTRAL.inkRecall));
    ACT.phase = `astral:${mv}:${t < A ? 'windup' : t < Cs ? 'active' : 'recover'}`;
    ACT.spike = mv === 'inkPool' ? .45 * ACT.rear + .7 * ACT.lunge : 0;
    ACT.churn = mv === 'inkTrample' ? .35 : 0;
    return;
  }
  switch (mv) {
    case 'pool': ACT.spike = live ? 1 : .35 * smooth(t / wu); ACT.contact = live ? 1 : 0; break;
    case 'trample': ACT.churn = live ? 1 : .35; ACT.rear = live ? 0 : .6 * smooth(t / wu); ACT.lunge = live ? .35 : 0; ACT.contact = live ? 1 : 0; break;
    case 'bite': {
      ACT.churn = .45;
      if (!live) { ACT.open = smooth(t / wu) * .8; ACT.rear = .6 * smooth(t / wu); break; }
      const p = (t - wu) % ASTRAL.biteGap, snapT = ASTRAL.biteActive;
      // each bite: the maw gapes over the gap, then snaps shut on the active window with a lunge
      if (p < snapT) { ACT.open = 0; ACT.lunge = 1 - p / snapT * .4; ACT.contact = 1; }
      else { const q = (p - snapT) / (ASTRAL.biteGap - snapT); ACT.open = smooth(q * 1.4); ACT.rear = .5 * smooth(q * 1.6); ACT.lunge = .6 * (1 - smooth(q * 3)); }
      break;
    }
    case 'flight': ACT.lock = true; ACT.wings = 1; ACT.beam = live ? 1 : 0; ACT.rear = live ? 0 : .3 * smooth(t / wu); ACT.contact = live ? 1 : 0; break;
    case 'griffin': {
      const G = ASTRAL, p = t % G.pounceGap;
      if (p < G.pounceWindup) ACT.crouch = smooth(p / G.pounceWindup);
      else if (p < G.pounceWindup + G.pounceActive) { ACT.leap = (p - G.pounceWindup) / G.pounceActive; ACT.contact = 1; }
      else ACT.land = 1 - (p - G.pounceWindup - G.pounceActive) / Math.max(1e-3, G.pounceGap - G.pounceWindup - G.pounceActive);
      ACT.phase = `astral:griffin:${p < G.pounceWindup ? 'windup' : ACT.leap >= 0 ? 'active' : 'recover'}`;
      break;
    }
    case 'rings': {
      const sp = ASTRAL.ringWarning + ASTRAL.ringActive + ASTRAL.ringGap, p = t % sp;
      if (p < ASTRAL.ringWarning) ACT.rear = .7 * smooth(p / ASTRAL.ringWarning);
      else if (p < ASTRAL.ringWarning + ASTRAL.ringActive) { ACT.pulse = 1; ACT.lunge = .5; ACT.contact = 1; }
      else ACT.pulse = 1 - (p - ASTRAL.ringWarning - ASTRAL.ringActive) / ASTRAL.ringGap;
      break;
    }
    case 'mirage': ACT.rear = .55; ACT.drain = a.enclosed > 0 ? 1 : 0; break;
  }
}

// ------------------------------------------------------------------------------------------------ the forms
// A form's pose: each bone's [f, r, u, yaw, pitch, roll, scale] in its parent's frame. Two forms are posed and blended on the
// game's morph clock.
const TA = new Float64Array(NB * 7), TB = new Float64Array(NB * 7), TO = new Float64Array(NB * 7), HID = ASTRAL_CV_RIG.hidden;
const bind = ASTRAL_SKELETON.bind;
function put(T, i, f, r, u, yaw = 0, pitch = 0, roll = 0, s = 1) { const o = i * 7; T[o] = f; T[o + 1] = r; T[o + 2] = u; T[o + 3] = yaw; T[o + 4] = pitch; T[o + 5] = roll; T[o + 6] = s; }
function hideAll(T) { for (let i = 0; i < NB; i++) put(T, i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2], 0, 0, 0, HID); }
const CTX = { t: 0, travel: 0, reduce: false, lift: 0, hurt: 0, daze: 0 };
// the worm's line of beads: the wave runs head to tail, the tail swaying wider; the head rears, lunges and pulses on ACT
function beads(T, amp, rate, len = 1, sc = 1) {
  const t = CTX.t, R = ASTRAL_CV_RIG;
  for (let i = 0; i < SEGS; i++) {
    const ph = t * rate - i * R.waveStep, head = Math.max(0, 1 - i / 3);
    const u = amp * Math.sin(ph) + head * (.22 * ACT.rear - .06 * ACT.lunge) - CTX.daze * .12 * head, f = BEAD_F[i] * len + head * (.16 * ACT.lunge - .08 * ACT.rear) + (BEAD_F[i] < 0 ? -.04 * ACT.pulse : .04 * ACT.pulse);
    const r = (R.sway * (.3 + i / SEGS)) * Math.sin(t * rate * .55 - i * .6) + CTX.hurt * .08 * (i / SEGS);
    const pitch = -amp * Math.cos(ph) * 1.5 - head * (.5 * ACT.rear - .35 * ACT.lunge) + CTX.daze * .3 * head;
    put(T, BI['s' + i], f, r, u, 0, pitch, 0, sc * (1 + .1 * ACT.pulse * Math.sin(Math.PI * (i + 1) / (SEGS + 1)) + .05 * ACT.drain * Math.sin(t * 9 - i)));
  }
}
function limbs(T, show, rate, swing) {
  for (let g = 0; g < LIMB_SEG.length; g++) for (const s of [-1, 1]) {
    const sg = LIMB_SEG[g], o = BI['s' + sg] * 7, i = BI['limb' + g + (s < 0 ? 'L' : 'R')];
    const ph = CTX.t * rate + g * 2.1 + (s < 0 ? 0 : Math.PI), sw = Math.sin(ph), up = Math.max(0, Math.cos(ph));
    put(T, i, T[o], T[o + 1] + s * BEAD_R[sg] * .7, T[o + 2] - .04, 0, swing * sw, s * (.35 * up * swing + .05), show ? 1 : HID);
  }
}
function legPitch(T, top, low, H, Ft, L1, L2, bendFwd) {
  // a planar two-bone leg in the body's f-u plane: the upper bone's pitch, then the lower's, the joint bending forward or back
  let df = Ft[0] - H[0], du = Ft[1] - H[1]; const raw = Math.hypot(df, du) || 1e-6, d = Math.min(L1 + L2 - 1e-4, Math.max(Math.abs(L1 - L2) + 1e-4, raw));
  const base = Math.atan2(-df, -du), al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const th1 = base + (bendFwd ? -al : al), jf = H[0] - Math.sin(th1) * L1, ju = H[1] - Math.cos(th1) * L1, th2 = Math.atan2(-(Ft[0] - jf), -(Ft[1] - ju));
  T[top * 7 + 4] = th1; T[low * 7 + 4] = th2 - th1;
}
const HP = [0, 0], FP = [0, 0];
function formPose(T, form) {
  const t = CTX.t, R = ASTRAL_CV_RIG;
  hideAll(T);
  // hidden parts wait drawn in at their roots: the limbs on their beads, the legs and wings in the body, the beam in the mouth
  put(T, BI.body, 0, 0, HOVER, 0, 0, 0, 1);
  switch (form) {
    case 'pool': {
      put(T, BI.body, 0, 0, .2, 0, 0, 0, 1);
      for (let i = 0; i < SEGS; i++) put(T, BI['s' + i], BEAD_F[i] * .3 - .1, 0, -.1, 0, 0, 0, HID);
      const heave = CTX.reduce ? 0 : .04 * Math.sin(t * 2.4) + .05 * ACT.rear;
      put(T, BI.pool, -.1, 0, 0, CTX.reduce ? 0 : .1 * Math.sin(t * .7), 0, 0, 1 + heave);
      // the spikes stand out of the puddle as the pool goes live (sunk inside it while it gathers)
      const sp = ACT.spike, wob = CTX.reduce ? 0 : .06 * Math.sin(t * 2 * Math.PI / .9);
      put(T, BI.spikes, 0, 0, -.32 * (1 - sp), CTX.reduce ? 0 : .06 * Math.sin(t * 1.3), 0, 0, Math.max(HID, .3 + .7 * sp + wob * sp));
      break;
    }
    case 'flight': {
      put(T, BI.body, 0, 0, HOVER + CTX.lift, 0, 0, 0, 1);
      beads(T, R.wave * .6, R.waveRate, 1);
      // the head bows to the beam
      T[BI.s0 * 7 + 4] += .28 + .15 * ACT.beam; T[BI.s1 * 7 + 4] += .1;
      const buzz = CTX.reduce ? 0 : Math.sin(t * R.buzz) * R.buzzAmp;
      for (const s of [-1, 1]) {
        const tag = s < 0 ? 'L' : 'R', jaw = CTX.reduce ? .12 : .12 + .1 * Math.sin(t * 5 + s);
        put(T, BI['mand' + tag], bind[BI['mand' + tag] * 3], bind[BI['mand' + tag] * 3 + 1], bind[BI['mand' + tag] * 3 + 2], s * jaw, .15, 0, 1);
        put(T, BI['fwing' + tag], bind[BI['fwing' + tag] * 3], bind[BI['fwing' + tag] * 3 + 1], bind[BI['fwing' + tag] * 3 + 2], 0, 0, s * (.32 + buzz), 1);
      }
      if (ACT.beam > 0) { const bt = BI.beamTop, bf = BI.beamFoot; put(T, bt, bind[bt * 3], 0, bind[bt * 3 + 2], 0, 0, 0, 1); T[bf * 7 + 6] = 1; }
      break;
    }
    case 'trample': {
      put(T, BI.body, 0, 0, R.trampleHover, 0, 0, 0, 1);
      beads(T, R.wave * .7, R.waveRate * 1.6, 1);
      limbs(T, true, ACT.churn > .5 ? R.churnFast : R.churnSlow, .5);
      break;
    }
    case 'bite': {
      beads(T, R.wave, R.waveRate, 1);
      limbs(T, true, R.churnSlow, .65);
      const o = ACT.open;
      // gaping, the ring of teeth stands open (the jaw dropped); shut, its halves clench together into one toothed seam
      put(T, BI.maw, bind[BI.maw * 3] + .03 * ACT.lunge, 0, bind[BI.maw * 3 + 2] + .04 * o - R.biteShut * (1 - o), 0, -R.biteOpen * .35 * o, 0, 1);
      put(T, BI.jaw, bind[BI.jaw * 3] + .03 * ACT.lunge, 0, bind[BI.jaw * 3 + 2] - .04 * o + R.biteShut * (1 - o), 0, R.biteOpen * o, 0, 1);
      break;
    }
    case 'griffin': {
      // the pounce: crouch (the body sinks, the wings rise), the leap (an arc, forelegs reaching, hind legs thrust back, the
      // wings beating down), the landing (the body absorbs it)
      const cr = ACT.crouch, lp = ACT.leap, ld = ACT.land, breathe = CTX.reduce ? 0 : .012 * Math.sin(t * 2.2);
      const air = lp >= 0 ? R.pounceArc * Math.sin(Math.PI * lp) : 0, bh = GH - R.crouch * cr - .08 * ld * ld + air + breathe;
      const bp = lp >= 0 ? -.3 + .5 * lp : .12 * cr - .05 * ld;
      put(T, BI.body, 0, 0, bh, 0, bp, CTX.hurt * .2, 1);
      for (let i = 0; i < SEGS; i++) { const [f, u, s] = GRIFFIN_BEADS[i]; put(T, BI['s' + i], f, 0, u, 0, 0, 0, s); }
      // the head and neck: lowered and drawn back in the crouch, thrust out in the leap
      const reach = lp >= 0 ? Math.sin(Math.PI * Math.min(1, lp * 1.2)) : 0;
      T[BI.s0 * 7] += .08 * reach - .02 * cr; T[BI.s0 * 7 + 2] += -.12 * cr - .04 * reach; T[BI.s0 * 7 + 4] = .15 * cr - .1 + .2 * reach - (CTX.reduce ? 0 : .04 * Math.sin(t * 1.3));
      T[BI.s1 * 7] += .05 * reach - .03 * cr; T[BI.s1 * 7 + 2] += -.04 * cr;
      put(T, BI.ghead, 0, 0, 0, 0, 0, 0, 1);
      // wings: raised high in the crouch, swept down through the leap
      const wr = lp >= 0 ? 1.2 - 1.25 * smooth(lp) : .75 + .45 * cr + .15 * ld + (CTX.reduce ? 0 : .04 * Math.sin(t * 1.7));
      for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', i = BI['gwing' + tag]; put(T, i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2], s * (.75 - .25 * cr), -.1, s * wr, 1); }
      // legs: feet on the ground (in the body's frame, through its pitch), tucked and reaching in the leap
      const cp = Math.cos(bp), sp = Math.sin(bp), toBody = (F, U, out) => { const dU = U - bh; out[0] = F * cp - dU * sp; out[1] = F * sp + dU * cp; return out; };
      for (const s of [-1, 1]) {
        const tag = s < 0 ? 'L' : 'R', fu = BI['fu' + tag], fl = BI['fl' + tag], hu = BI['hu' + tag], hl = BI['hl' + tag];
        put(T, fu, FORE_AT[0], s * FORE_AT[1], FORE_AT[2], 0, 0, 0, 1); put(T, fl, 0, 0, -LEG.fore[0], 0, 0, 0, 1);
        put(T, hu, HIND_AT[0], s * HIND_AT[1], HIND_AT[2], 0, 0, 0, 1); put(T, hl, 0, 0, -LEG.hind[0], 0, 0, 0, 1);
        const stag = s < 0 ? .03 : -.03;
        if (lp >= 0) { FP[0] = FORE_AT[0] + .28 * Math.sin(Math.PI * lp) + .05; FP[1] = FORE_AT[2] - .42 + .1 * Math.sin(Math.PI * lp); }
        else toBody(FORE_AT[0] + .04 + stag, .03, FP);
        HP[0] = FORE_AT[0]; HP[1] = FORE_AT[2]; legPitch(T, fu, fl, HP, FP, LEG.fore[0], LEG.fore[1], false);
        if (lp >= 0) { FP[0] = HIND_AT[0] - .3 * Math.sin(Math.PI * Math.min(1, lp * 1.3)) - .02; FP[1] = HIND_AT[2] - .44 + .12 * smooth(lp); }
        else toBody(HIND_AT[0] - .02 - stag, .02, FP);
        HP[0] = HIND_AT[0]; HP[1] = HIND_AT[2]; legPitch(T, hu, hl, HP, FP, LEG.hind[0], LEG.hind[1], true);
      }
      // the tail: up and swaying, streaming out behind the leap
      const sway = CTX.reduce ? 0 : .3 * Math.sin(t * 1.9);
      put(T, BI.tail0, bind[BI.tail0 * 3], 0, bind[BI.tail0 * 3 + 2], sway, -.15 + .35 * (lp >= 0 ? Math.sin(Math.PI * lp) : 0) - .15 * cr, 0, 1);
      put(T, BI.tail1, bind[BI.tail1 * 3], 0, bind[BI.tail1 * 3 + 2], sway * .8, -.2, 0, 1);
      break;
    }
    default: {
      // the worm (rings, mirage and the ink worm)
      beads(T, R.wave * (1 + .4 * CTX.travel), R.waveRate * (1 + .5 * CTX.travel), 1);
    }
  }
  if (form !== 'griffin') put(T, BI.body, T[BI.body * 7], T[BI.body * 7 + 1], T[BI.body * 7 + 2] - CTX.daze * .1, 0, T[BI.body * 7 + 4], CTX.hurt * .25, 1);
}
// death: the ink loses its shape: the beads slump and sink into a spreading pool that fades
function deathPose(T, k) {
  hideAll(T);
  put(T, BI.body, 0, 0, HOVER * (1 - k) + .05, 0, 0, 0, 1);
  for (let i = 0; i < SEGS; i++) put(T, BI['s' + i], BEAD_F[i] * (1 - .5 * k), 0, -.04 * i * k, 0, .2 * k, 0, Math.max(HID, 1 - k));
  put(T, BI.pool, -.1, 0, 0, 0, 0, 0, Math.max(HID, smooth(k) * 1.1));
  put(T, BI.spikes, 0, 0, -.32, 0, 0, 0, HID);
}

// ------------------------------------------------------------------------------------------------ the pose
const FX = new Float64Array(2);
function beamFootLocal(e, env, yaw, S) {
  // the game's beam ground point (astralBeamAnchors: mouthX x drawScale x scale ahead along its facing), in the root's frame
  const sc = Math.max(ASTRAL_GEOMETRY.minScale, Number(e.scale) || 1), fx = (e.astral?.facingX < 0 ? -1 : 1) * ASTRAL_GEOMETRY.mouthX * U2 * sc;
  const c = Math.cos(yaw), s = Math.sin(yaw); FX[0] = (fx * c) / S; FX[1] = (-fx * s) / S; return FX;
}
export function sampleAstral(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = ASTRAL_CV_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) { tr.deathAt = now; tr.snapped = false; }
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const a = e.astral, x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  if (!dead) act(a); else { act(null); ACT.phase = 'death'; }
  // travel: how fast it is moving (the wave quickens)
  const mx = Number.isFinite(tr.px) ? env.x - tr.px : 0, my = Number.isFinite(tr.py) ? env.y - tr.py : 0, moved = Math.hypot(mx, my); tr.px = env.x; tr.py = env.y;
  const speed = dt > 0 && moved < 1.5 ? moved / dt : 0; tr.travel += (clamp01(speed / ASTRAL.speed) - tr.travel) * Math.min(1, dt * G.travelSettle);
  // facing: the flier and the ink thrower keep the game's own facing (their beam and gouts leave along it); otherwise where it
  // goes, else at the Wayfarer
  let want = tr.yaw;
  if (ACT.lock && !dead) want = a?.facingX < 0 ? Math.PI : 0;
  else if (moved > .004 * Math.max(1, dt * 60) && moved < 1.5) want = Math.atan2(my, mx);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = (a?.facingX ?? e.facingX) < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)); tr.yaw += Math.max(-1, Math.min(1, dt * (a?.move ? G.attackTurnRate : G.turnRate))) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp; const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 10) : 0;
  CTX.t = t; CTX.reduce = reduce; CTX.travel = reduce ? 0 : tr.travel; CTX.hurt = hit * tr.hitSide; CTX.daze = dead ? 0 : clamp01(Number(e.poiseBreak) || 0);
  CTX.lift = G.flightLift + Math.max(0, Number(a?.flightLiftExtra) || 0) / S;
  // the morph: the game's own clock (drawAstralMorph's progress); Reduced Motion changes shape at once, as the standard view
  const form = FORMS.includes(a?.form) ? a.form : 'worm', prev = FORMS.includes(a?.previousForm) ? a.previousForm : form;
  const k = reduce || prev === form ? 1 : smooth((Number(a?.clock) - Number(a?.morphStart)) / ASTRAL.morphTime);
  if (dead) {
    if (!tr.snapped) { tr.snap.set(TO); tr.snapped = true; }
    deathPose(TB, smooth(death / .55)); const b = smooth(death / .3);
    for (let i = 0; i < TO.length; i++) TO[i] = tr.snap[i] + (TB[i] - tr.snap[i]) * b;
  } else {
    formPose(TB, form);
    if (k < 1) { formPose(TA, prev); for (let i = 0; i < TO.length; i++) TO[i] = TA[i] + (TB[i] - TA[i]) * k; } else TO.set(TB);
  }
  // the beam's foot stands where the game's beam strikes
  if (TO[BI.beamFoot * 7 + 6] > .01) { const fl = beamFootLocal(e, env, yaw, S); TO[BI.beamFoot * 7] = fl[0]; TO[BI.beamFoot * 7 + 1] = fl[1]; TO[BI.beamFoot * 7 + 2] = .02; }
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  for (let i = 1; i < NB; i++) {
    const o = i * 7; P.off[i * 3] = TO[o] - bind[i * 3]; P.off[i * 3 + 1] = TO[o + 1] - bind[i * 3 + 1]; P.off[i * 3 + 2] = TO[o + 2] - bind[i * 3 + 2];
    setEuler(P, i, TO[o + 3], TO[o + 4], TO[o + 5]); P.scl[i] = Math.max(HID, TO[o + 6]); resolveBone(P, i);
  }
  writeSkin(P);
  const F = tr.frame, beamOn = !dead && TO[BI.beamFoot * 7 + 6] > .05, wingsOn = !dead && TO[BI.fwingL * 7 + 6] > .02;
  const flicker = reduce ? 1 : .85 + .15 * Math.sin(now / 1000 * 37);
  F.emitK[0] = 0; F.emitK[1] = 0;
  F.emitK[2] = 1; // the membranes keep their own dim colour; the beam's halo glows pink
  F.emitK[3] = (beamOn ? 1.7 : 0) * flicker;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = wingsOn || beamOn ? .55 : 0; F.emitA[3] = beamOn ? 1 : 0;
  F.tier = env.tier || 'full'; F.mesh = astralMesh(F.tier); F.skin = P.skin; F.alpha = dead ? 1 - span(death, .55, 1) : 1;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = Math.max(0, TO[BI.body * 7 + 2] - HOVER); F.shadow = 1;
  F.phase = dead ? 'death' : `${form}:${ACT.phase}`; F.contact = ACT.contact; F.cloud = F.emitA[2] > 0 || F.emitA[3] > 0;
  return F;
}
export const astralBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
// Ridden (a Walker boarding, on or getting down from its saddle) the Worm keeps the standard view: the rider's saddle, pillar
// and lift are drawn against its billboard (astralMountPresentation). `scene` is the game (its enemies), when the caller has it.
const HELD = ['mounted', 'landing', 'boarding'];
export function astralRidden(e, scene) {
  const list = scene?.enemies; if (!Array.isArray(list) || !e?.id) return false;
  for (let i = 0; i < list.length; i++) { const m = list[i]?.astralMount; if (m && m.ownerId === e.id && HELD.includes(m.status) && !list[i].dead) return true; }
  return false;
}
