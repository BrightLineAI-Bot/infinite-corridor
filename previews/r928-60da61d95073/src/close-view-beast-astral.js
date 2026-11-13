// The Astral Worm in Close View: the standard view's ink creature (astral-worm-render.ts drawAstralWorm: "an elongated blackness
// that makes and unmakes its own limbs") as one skinned body on the shared beast rig. Every form the fight uses lives on one
// skeleton, and the body morphs between them on the game's own morph clock (e.astral.form, previousForm, clock - morphStart over
// ASTRAL.morphTime), exactly where drawAstralMorph cross-fades its silhouettes:
// - worm (and the rings, the mirage and the ink worm): nine ink beads, the front the largest, a travelling wave down the length;
//   the front bead is the head, split along its length into an upper half and a hinged jaw, shut to a dark lip line;
// - flight: the beads lifted, two pairs of veined translucent insect wings (a dark leading edge, a wing spot, a pale rim)
//   buzzing, big hooked jointed mandibles with toothed inner edges working open and snapping shut, bulb eyes, and the mouth
//   beam from the open mouth to the ground where the game's beam hazard stands (astralBeamAnchors);
// - trample (and the ink trample): ink limbs grown along both sides, churning the ground as it charges;
// - bite: the limbs, and the head itself gaping: the jaw drops from its hinge, lips and gums rolled into the cut, teeth set
//   along both gums, a tongue, the palate darkening into a throat; wide over the game's bite gap, slammed shut on its active
//   window (biteGap, biteActive);
// - pool (and the ink pool): the beads melt into a puddle of ink whose spikes erupt when the pool goes live;
// - griffin: the beads gather small inside one lofted body: a lion's rump and haunch, a tucked waist, a deep ribcage and an
//   eagle's breast rising into the neck and head (hooked beak, swept crest); muscled legs grown from the trunk (raptor
//   forelegs, lion hind legs with padded paws), eagle wings rooted at the shoulders and a tufted tail from the haunch,
//   crouching and pouncing on the pounce clock.
// Parts a form does not use are drawn back into the body (scaled to nothing at their root), so a morph grows and unmakes limbs.
// Nothing here changes timing, damage, reach or targeting.
import {
  defineSkeleton, createPose, resetPose, setEuler, resolveBone, writeSkin, meshBuilder, clamp01, smooth, span, kick, wobble,
} from "./close-view-beast-rig.js?v=r928-60da61d95073";
import { ASTRAL, ASTRAL_GEOMETRY, ASTRAL_INK_FORMS } from "./astral-worm.js?v=r928-60da61d95073";

const SEGS = 9, U2 = ASTRAL_GEOMETRY.drawScale; // the standard view draws in units of .65 tiles (scale q.u x .65)
export const ASTRAL_CV_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  hover: .7, // the worm's beads float with their centres .7 tiles up (the standard view's line at y -.12 over its ground at .95)
  flightLift: ASTRAL_GEOMETRY.flightLift / 1.25, // the standard view lifts the flier by .8 tiles x scale; the root carries x 1.25 of that
  trampleHover: .56, griffinHover: .66,
  wave: .085, waveRate: 5, waveStep: .65, sway: .05, // the standard view's bead wave (sin(t*5 - i*.65) * .13 units)
  buzz: 34, buzzAmp: .2, // the insect wings' beat
  morphSwell: .16, // the swell that runs down the beads while the body changes shape
  turnRate: 4, attackTurnRate: 9, deathMs: 1900, hitMs: 300, travelSettle: 6,
  // the bite's maw and jaw, the trample's churn, the griffin's pounce body
  churnFast: 15, churnSlow: 7, pounceArc: .42, crouch: .2,
  // the bite: the jaw's gape (radians), the upper head's lift as it gapes, the head's swell, the share of the game's active window
  // over which the jaws slam shut (the rest of it they stay clenched), and the neck's stretch and narrowing behind the gaping head
  biteOpen: 1.05, biteLift: .22, biteSwell: .12, biteSnap: .45, biteReach: .14, biteNeck: .3,
  // the flier's mandibles: their rest spread, the open and the snap of their working cycle, and its rate
  mandRest: .12, mandOpen: .5, mandShut: -.1, mandRate: 2.3,
  // the head bead (s0-local, tiles): its half length over its radius, the upper and lower halves' heights, the hinge where the
  // jaw turns, the stations' end angles, the palate's depth (front, hinge), its slope back, the gums' inset (and their lip line's, tucked just inside the shell so it is hidden shut), the throat's rows past the hinge [back, share of the width]; the mandible's
  // sections [f, r out, u, radius] and the station of its joint ring
  head: Object.freeze({ len: 1.1, up: 1.05, down: .95, hinge: -.07, ph0: .035, ph1: .16, depth: Object.freeze([.5, .82]), slope: .03, inset: .86, tuck: .985, throat: Object.freeze([[.06, .55], [.12, .1]]),
    mandible: Object.freeze([[-.1, -.02, .03, .07], [.0, .03, .0, .078], [.08, .075, -.01, .07], [.12, .09, -.012, .04], [.155, .1, -.015, .04], [.2, .12, -.02, .068], [.31, .145, -.03, .06], [.43, .125, -.035, .047], [.53, .065, -.035, .034], [.59, -.02, -.03, .021], [.6, -.11, -.02, .009]]),
    mandJoint: Object.freeze([.12, .155]) }),
  // the griffin's trunk (body-local in its rest pose): [f, u, half width, half height, bone, bone, weight on the second]
  griffinTrunk: Object.freeze([
    [-.94, .1, .035, .035, 'ghaunch', 'ghaunch', 0], [-.9, .09, .11, .12, 'ghaunch', 'ghaunch', 0], [-.82, .07, .18, .2, 'ghaunch', 'ghaunch', 0], [-.7, .04, .225, .25, 'ghaunch', 'ghaunch', 0],
    [-.54, .03, .245, .265, 'ghaunch', 'ghaunch', 0], [-.38, .05, .215, .225, 'ghaunch', 'gchest', .2], [-.2, .08, .19, .19, 'ghaunch', 'gchest', .5],
    [-.02, .07, .21, .235, 'ghaunch', 'gchest', .85], [.14, .05, .245, .28, 'gchest', 'gchest', 0], [.28, .04, .255, .3, 'gchest', 'gchest', 0],
    [.4, .1, .22, .265, 'gchest', 'gchest', 0], [.5, .22, .155, .18, 'gchest', 'ghead', .15], [.58, .34, .115, .125, 'gchest', 'ghead', .5],
    [.65, .44, .1, .105, 'gchest', 'ghead', .85], [.72, .5, .085, .09, 'ghead', 'ghead', 0]]),
  // its wings (wing-local, spread along r): the arm along the leading edge [f, r, u, radius], the covert chord, the primaries' length
  griffinWing: Object.freeze({ arm: Object.freeze([[0, 0, 0, .075], [.02, .16, .02, .06], [.04, .38, .03, .045], [.01, .58, .03, .034], [-.07, .84, .02, .022], [-.16, 1.08, .01, .01]]), chord: .46, primary: .6 }),
  // its leg muscles (bone-local [f, u, half width, half depth, share on the trunk]): the eagle's shoulder and upper leg, the lion's ham
  foreMuscle: Object.freeze([[.0, .16, .08, .09, .5], [.02, .03, .1, .12, .12], [.0, -.1, .09, .1, 0], [-.01, -.2, .062, .066, 0], [0, -.31, .045, .045, 0]]),
  hindMuscle: Object.freeze([[.02, .2, .08, .1, .5], [.0, .05, .11, .17, .12], [-.01, -.08, .1, .145, 0], [.0, -.18, .072, .085, 0], [.0, -.27, .055, .055, 0]]),
  // the insect wings: [length, sweep back, chord, root offset] for the fore and hind pair
  insectWing: Object.freeze({ pairs: Object.freeze([[1.25, .22, .24, .04], [1.15, .68, .3, -.08]]) }),
  hidden: .001,
});

// ------------------------------------------------------------------------------------------------ skeleton
// model space: f forward, r right, u up; the root on the ground under the actor. `body` carries the hover. The beads hang
// directly off the body, so every form places each one where it wants it (the morph blends those places).
const HOVER = ASTRAL_CV_RIG.hover, HEAD = ASTRAL_CV_RIG.head;
const BEAD_F = Array.from({ length: SEGS }, (_, i) => (.8 - .35 * i) * U2), BEAD_R = Array.from({ length: SEGS }, (_, i) => (.42 - .025 * i) * U2);
// The griffin is its own body that the morph grows in round the beads (which shrink inside it): a lofted trunk on two spine
// bones (`gchest`, `ghaunch`), the neck and the head on `ghead`, the wings at the shoulders and the tail at the haunch. Every
// griffin bone's bind is where it stands in the griffin's rest pose (body-local, relative to the body), so the trunk, the
// neck, the leg muscles and the wing roots can blend across bones without tearing.
const GH = ASTRAL_CV_RIG.griffinHover;
const GCHEST = [.16, 0, .05], GHAUNCH = [-.56, 0, .05], GHEAD = [.74, 0, .5], GWING = [.2, .13, .3], GTAIL = [-.86, 0, .14];
// the beads' griffin places (body-local f, u, scale): gathered small inside the trunk, the head bead inside the skull
const GRIFFIN_BEADS = Object.freeze([
  [GHEAD[0], GHEAD[2], .42], [.6, .34, .42], [.3, .05, .55], [.06, .06, .55], [-.18, .08, .5], [-.4, .05, .55], [-.58, .05, .55], [-.74, .07, .4], [-.8, .08, .25],
]);
const FORE_AT = [.33, .15, -.06], HIND_AT = [-.58, .17, -.08], LEG = Object.freeze({ fore: [.31, .3], hind: [.27, .31] });
const LIMB_SEG = [1, 4, 7];
export const ASTRAL_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'body', parent: 'root', at: [0, 0, HOVER] },
  ...BEAD_F.map((f, i) => ({ name: 's' + i, parent: 'body', at: [f, 0, 0] })),
  // the head bead is two halves: the upper on s0, the lower on `jaw`, hinged at the back of the head (the bite's maw); the
  // flier's mandibles on the head
  { name: 'jaw', parent: 's0', at: [HEAD.hinge, 0, 0] },
  { name: 'mandL', parent: 's0', at: [.17, -.13, -.07] }, { name: 'mandR', parent: 's0', at: [.17, .13, -.07] },
  { name: 'gchest', parent: 'body', at: GCHEST }, { name: 'ghaunch', parent: 'body', at: GHAUNCH },
  { name: 'ghead', parent: 'gchest', at: [GHEAD[0] - GCHEST[0], 0, GHEAD[2] - GCHEST[2]] },
  { name: 'gwingL', parent: 'gchest', at: [GWING[0] - GCHEST[0], -GWING[1], GWING[2] - GCHEST[2]] }, { name: 'gwingR', parent: 'gchest', at: [GWING[0] - GCHEST[0], GWING[1], GWING[2] - GCHEST[2]] },
  { name: 'fwingL', parent: 'body', at: [.1, -.08, .2] }, { name: 'fwingR', parent: 'body', at: [.1, .08, .2] },
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
    return [{ name: 'fu' + tag, parent: 'body', at: [FORE_AT[0], s * FORE_AT[1], FORE_AT[2]] }, { name: 'fl' + tag, parent: 'fu' + tag, at: [0, 0, -LEG.fore[0]] },
      { name: 'hu' + tag, parent: 'body', at: [HIND_AT[0], s * HIND_AT[1], HIND_AT[2]] }, { name: 'hl' + tag, parent: 'hu' + tag, at: [0, 0, -LEG.hind[0]] }]; }),
  { name: 'tail0', parent: 'ghaunch', at: [GTAIL[0] - GHAUNCH[0], 0, GTAIL[2] - GHAUNCH[2]] }, { name: 'tail1', parent: 'tail0', at: [-.26, 0, .1] },
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
  gum: hexOf("#4b2830"), mouth: hexOf("#020204"), tongue: hexOf("#713941"), tooth: hexOf("#bfb5a6"), toothDark: hexOf("#8b8075"), lip: hexOf("#9a5862"), lipDark: hexOf("#2a1519"),
  beamCore: hexOf("#fff1fb"), beamGlow: hexOf("#db9fc5"), poolSheen: hexOf("#37434b") });
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
// ink: lit grey-blue on top, black beneath (the standard view's radial gradient #263039 -> #0b1017 -> #030508)
// (a standing limb's loft rings face forward, so their tone is even and the light does the shading)
const LEG_TONE = () => lerpHex(C.ink, C.inkMid, .6);
const inkTone = (st, hi = C.inkHi) => st > .35 ? lerpHex(C.inkMid, hi, (st - .35) / .65) : lerpHex(C.deep, C.inkMid, (st + 1) / 1.35);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
// the lower half's share on the jaw along the head (all of it ahead of the hinge, none of it behind)
const jawShare = (f) => smooth((f - HEAD.hinge + .1) / .14);
function buildAstralMesh(tier) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(ASTRAL_SKELETON, full ? 1 : low ? .4 : .7), bw = ASTRAL_SKELETON.bindWorld;
  const W = (bone) => [bw[BI[bone] * 3], bw[BI[bone] * 3 + 1], bw[BI[bone] * 3 + 2]];
  const Wb = (f, r, u) => [f, r, u + HOVER];
  // A one-sided surface through a grid of model-space points, each vertex blended between two bones (`bonesOf(r, c)`) and
  // toned (`toneOf(r, c)`); its normal from the grid, turned to face `outOf(r, c, p)`, or exactly `normalOf(r, c, p)`.
  const surf = ({ grid, bonesOf, toneOf, outOf, normalOf }) => {
    const R = grid.length, Cn = grid[0].length, ids = [];
    for (let r = 0; r < R; r++) { const row = [];
      for (let c = 0; c < Cn; c++) {
        const p = grid[r][c]; let n;
        if (normalOf) n = normalOf(r, c, p);
        else { const o = outOf(r, c, p);
          n = cross(sub(grid[Math.min(R - 1, r + 1)][c], grid[Math.max(0, r - 1)][c]), sub(grid[r][Math.min(Cn - 1, c + 1)], grid[r][Math.max(0, c - 1)]));
          if (Math.hypot(n[0], n[1], n[2]) < 1e-9) n = o; else if (dot(n, o) < 0) n = [-n[0], -n[1], -n[2]]; }
        n = unit(n); const [ba, bb, w] = bonesOf(r, c);
        row.push(B.vertexBlend(p[0], p[1], p[2], n[0], n[1], n[2], ba, bb, w, toneOf(r, c)));
      }
      ids.push(row); }
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < Cn - 1; c++) { B.tri(ids[r][c], ids[r + 1][c], ids[r + 1][c + 1]); B.tri(ids[r][c], ids[r + 1][c + 1], ids[r][c + 1]); }
  };
  // a bead: an ink ellipsoid as a loft (so it can be toned: lit on top, a pale rim round its back edge where the bead behind
  // tucks under it, as the standard view outlines every oval)
  const bead = (bone, a, r, rimAt = 2, seg = 14, caps = true) => {
    const c = W(bone), n = low ? 3 : 5, secs = [];
    for (let k = 0; k <= n; k++) { const ph = .12 + (Math.PI - .24) * (k / n), f = Math.cos(ph) * a, rr = Math.sin(ph) * r; secs.push({ at: [c[0] + f, c[1], c[2]], rx: rr, rz: rr, bones: [bone, bone, 0] }); }
    const rimK = n - rimAt;
    B.color(C.ink).loft({ seg: low ? 8 : seg, minSeg: low ? 4 : 5, sections: secs, caps, tone: (i, k, st) => i === rimK ? lerpHex(C.rim, C.inkHi, .25 + .3 * (1 - st)) : inkTone(st) });
  };
  // ---- the beads behind the head (the worm's length; every other form rearranges them)
  for (let i = 1; i < SEGS; i++) {
    const b = 's' + i, r = BEAD_R[i];
    bead(b, r * 1.1, r, low ? 1 : 2, i < 4 ? 10 : 9, !low || i === SEGS - 1);
    // the sheen: a dull lit oval along the top of each bead (the standard view's #28333b stroke)
    if (!low && i < 5) B.bone(b).color(C.sheen).ellipsoid({ at: [-.05 * U2, 0, r * .9], radius: [r * .62, r * .34, r * .14], rings: 2, seg: full ? 8 : 6, U: [0, 0, 1] });
  }
  // ---- the head: the front bead split along its length into an upper half (s0) and a lower (the jaw, hinged at the back of
  // the head). Shut, it is a bead with a dark lip line along its sides; open, the head itself gapes: lips and gums rolled
  // into the cut, teeth set along both gums, a tongue on the jaw, and the palate darkening to a throat that runs back into
  // the body.
  { const o = W('s0'), a0 = BEAD_R[0] * HEAD.len, r0 = BEAD_R[0], NS = low ? 4 : full ? 10 : 6, NC = low ? 3 : full ? 7 : 5;
    const ph = Array.from({ length: NS + 1 }, (_, i) => HEAD.ph0 + (Math.PI - HEAD.ph0 - HEAD.ph1) * (i / NS)), fOf = (i) => Math.cos(ph[i]) * a0;
    for (const sg of [1, -1]) {
      const rz = r0 * (sg > 0 ? HEAD.up : HEAD.down), rimRow = NS - (low ? 1 : 2);
      const grid = ph.map((p) => Array.from({ length: NC + 1 }, (_, j) => { const th = (sg > 0 ? 0 : Math.PI) + Math.PI * (j / NC); return [o[0] + Math.cos(p) * a0, o[1] + Math.cos(th) * Math.sin(p) * r0, o[2] + Math.sin(th) * Math.sin(p) * rz]; }));
      surf({ grid, bonesOf: (i) => sg > 0 ? ['s0', 's0', 0] : ['s0', 'jaw', jawShare(fOf(i))],
        normalOf: (i, j, p) => [(p[0] - o[0]) / (a0 * a0), (p[1] - o[1]) / (r0 * r0), (p[2] - o[2]) / (rz * rz)],
        toneOf: (i, j) => { const th = (sg > 0 ? 0 : Math.PI) + Math.PI * (j / NC), st = Math.sin(th), edge = Math.pow(1 - Math.abs(st), 3) * smooth((fOf(i) - HEAD.hinge) / (a0 * .4));
          const base = i === rimRow ? lerpHex(C.rim, C.inkHi, .25 + .3 * (1 - st)) : inkTone(st);
          return lerpHex(base, C.lipDark, edge * .9); } });
      // the gums and palate: from the lip line on each side, curled into the half and back to the throat
      // (past the hinge the palate narrows into a throat that closes, so the open mouth is a sealed cavity)
      const rows = []; for (let i = 0; i <= NS && fOf(i) > HEAD.hinge + .01; i++) rows.push([fOf(i), 1]); const lips = rows.length; rows.push([HEAD.hinge, 1]);
      for (const [d, m] of low ? HEAD.throat.slice(-1) : HEAD.throat) rows.push([HEAD.hinge - d, m]);
      const NP = low ? 2 : full ? 6 : 4, wh = r0 * Math.sqrt(Math.max(0, 1 - (HEAD.hinge / a0) ** 2));
      const pg = rows.map(([f, m], k) => { const w = f >= HEAD.hinge ? r0 * Math.sqrt(Math.max(0, 1 - (f / a0) ** 2)) : wh * m, d = HEAD.depth[0] + (HEAD.depth[1] - HEAD.depth[0]) * Math.min(1, k / lips);
        return Array.from({ length: NP + 1 }, (_, j) => { const q = Math.PI * (j / NP), edge = j === 0 || j === NP, sq = Math.sin(q);
          return [o[0] + f - sq * HEAD.slope, o[1] + Math.cos(q) * w * (edge ? HEAD.tuck : HEAD.inset), o[2] + sg * (sq * w * (rz / r0) * d + (edge ? .004 : 0))]; }); });
      surf({ grid: pg, bonesOf: (k) => sg > 0 ? ['s0', 's0', 0] : ['s0', 'jaw', jawShare(rows[k][0])], outOf: (k, j, p) => [o[0] + rows[k][0] - p[0], o[1] - p[1], o[2] - p[2] - sg * .02],
        toneOf: (k, j) => { const e = Math.min(j, NP - j), back = Math.min(1, k / lips); return k > lips ? C.mouth : e === 0 ? C.lip : e === 1 ? lerpHex(C.gum, C.lip, .35) : lerpHex(C.gum, C.mouth, .45 + .55 * back); } });
      // teeth set into the gum along both sides, raked back and in (long fangs at the front)
      const nt = low ? 2 : full ? 6 : 4, bone = sg > 0 ? 's0' : 'jaw', ob = sg > 0 ? 0 : HEAD.hinge;
      for (let t = 0; t < nt; t++) { const f = a0 * (.78 - .78 * (t / nt)) + HEAD.hinge * (t / nt) * .5, w = r0 * Math.sqrt(Math.max(0, 1 - (f / a0) ** 2)), L = Math.min(.12, w * .5) * (t === 0 ? 1.2 : 1);
        for (const s of [-1, 1]) { const d = unit([-.3, -s * .4, -sg]);
          B.bone(bone).color(t % 3 === 2 ? C.toothDark : C.tooth).lathe({ at: [f - ob, s * w * HEAD.inset * .97, sg * .012], F: d, rings: [[0, .022 + .006 * (t === 0)], [L, 0]], seg: low ? 3 : 4, caps: false }); } }
    }
    // the tongue on the jaw
    B.bone('jaw').color(C.tongue).ellipsoid({ at: [.13, 0, -.055], radius: [.11, .07, .03], rings: low ? 2 : 3, seg: low ? 6 : 8, F: [1, 0, .1] });
  }
  // ---- the flier's mandibles: big hooked insect jaws on the head's front corners: a broad basal segment, a pale joint ring
  // (the articulation), a curved blade sweeping out and hooking in at the tip, teeth along its inner edge; a bulb compound eye
  // over each, and bristles
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'mandL' : 'mandR', o = W(bone);
    const P = HEAD.mandible.filter((_, j) => !low || j === 3 || j === 4 || j % 3 === 0 || j === HEAD.mandible.length - 1);
    B.color(C.ink).loft({ seg: low ? 5 : 6, minSeg: low ? 3 : 4, sections: P.map(([f, r, u, rad]) => ({ at: [o[0] + f, o[1] + s * r, o[2] + u], rx: rad, rz: rad * (f > HEAD.mandJoint[1] ? .55 : .8), bones: [bone, bone, 0] })),
      tone: (i, k, st) => P[i][0] >= HEAD.mandJoint[0] && P[i][0] <= HEAD.mandJoint[1] ? lerpHex(C.rim, C.scale, .45) : P[i][0] < HEAD.mandJoint[0] ? lerpHex(C.inkMid, C.shade, .35 + .3 * st) : (k === 0 ? C.mandLine : inkTone(st, C.shade)) });
    for (const [f, r, L] of low ? [] : full ? [[.27, .14, .07], [.36, .13, .085], [.45, .1, .07], [.53, .04, .055]] : [[.3, .14, .07], [.45, .1, .07]])
      B.bone(bone).color(C.toothDark).lathe({ at: [f, s * (r - .03), -.03], F: unit([.15, -s, -.1]), rings: [[0, .016], [L, 0]], seg: 4, caps: false });
    B.bone(bone).color(lerpHex(C.inkHi, C.wing, .5)).ellipsoid({ at: [-.03, s * .04, .15], radius: [.12, .1, .1], rings: low ? 2 : 3, seg: low ? 5 : 9 });
    if (!low) B.bone(bone).color(C.eye).ellipsoid({ at: [.04, s * .09, .2], radius: [.03, .025, .02], rings: 2, seg: 5 });
    if (!low) for (let j = 0; j < 2; j++) B.bone(bone).color(C.bristle).lathe({ at: [-.06 - j * .05, s * .02, .2], F: [-.2, s * .25, 1], rings: [[0, .009], [.2, 0]], seg: 3, caps: false });
  }
  // ---- the griffin's trunk: one lofted body from the rump through the lion's haunch, the tucked waist and the deep ribcage to
  // the eagle's breast, rising into the neck and on into the head (the haunch on `ghaunch`, the chest on `gchest`, the neck
  // blending into `ghead`)
  { const T = ASTRAL_CV_RIG.griffinTrunk, keep = low ? T.filter((_, j) => j % 2 === 0 || j === T.length - 1) : T;
    // (the eagle's half feathered: from the ribs forward, rows of breast feathers in alternate bands down its front)
    const sk = full ? 14 : low ? 12 : 12, eagle = keep.findIndex((x) => x[0] >= .14);
    B.color(C.ink).loft({ seg: sk, minSeg: 6, sections: keep.map(([f, u, rx, rz, a, b, w]) => ({ at: Wb(f, 0, u), rx, rz, bones: [a, b, w] })), caps: true,
      tone: (i, k, st) => { const c = inkTone(st * .9 + .05); return i >= eagle && st < .5 && (i + (k % 2)) % 2 ? lerpHex(c, C.shade, .35) : c; } });
    // the eagle's head: a skull, the cere and hooked upper beak, a lower mandible, pale eyes under a pale brow stroke, cheek
    // feathers, a swept crest of liquid points
    const at = (f, r, u) => [f, r, u];
    B.bone('ghead').color(C.ink).ellipsoid({ at: [.02, 0, .02], radius: [.19, .13, .145], rings: low ? 3 : 4, seg: low ? 7 : 9, F: [1, 0, -.1] });
    const g = W('ghead');
    B.color(C.beak).loft({ seg: low ? 6 : 9, minSeg: 4, sections: [[.13, .06, .07], [.22, .055, .06], [.3, .035, .045], [.36, .0, .03], [.385, -.06, .018], [.37, -.11, .006]]
      .map(([f, u, r]) => ({ at: [g[0] + f, g[1], g[2] + u], rx: r * .8, rz: r, bones: ['ghead', 'ghead', 0] })), tone: (i, k, st) => lerpHex(C.beak, C.shade, clamp01(st) * .5) });
    if (!low) B.color(C.ink).loft({ seg: 7, minSeg: 4, sections: [[.14, -.03, .045], [.23, -.035, .035], [.3, -.05, .015]]
      .map(([f, u, r]) => ({ at: [g[0] + f, g[1], g[2] + u], rx: r * .8, rz: r * .6, bones: ['ghead', 'ghead', 0] })) });
    for (const s of [-1, 1]) {
      B.bone('ghead').color(C.eye).ellipsoid({ at: at(.1, s * .11, .06), radius: [.03, .016, .024], rings: low ? 2 : 3, seg: 6 });
      if (!low) B.bone('ghead').color(C.brow).ellipsoid({ at: at(.06, s * .115, .1), radius: [.08, .012, .013], rings: 2, seg: 5, F: [1, 0, .15] });
      if (!low) B.bone('ghead').color(C.shade).ellipsoid({ at: at(-.02, s * .1, -.03), radius: [.08, .012, .04], rings: 2, seg: 5, F: [-.7, 0, -.7] });
    }
    for (let j = low ? 1 : 0; j < (low ? 2 : 4); j++) { const r = (j - 1.5) * .045;
      B.bone('ghead').color(C.ink).lathe({ at: at(-.1, r, .1 - Math.abs(r) * .3), F: [-.9, r * 1.5, .45 - j * .05], rings: [[0, .045], [.12, .025], [.24, 0]], seg: low ? 4 : 5, caps: false }); }
  }
  // ---- the griffin's eagle wings, grown from the shoulders: a muscled arm along the leading edge (its root blended into the
  // back), a covert membrane joined to the back, and long separate primaries fanned from the hand (built spread along r)
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'gwingL' : 'gwingR', o = W(bone), A = ASTRAL_CV_RIG.griffinWing;
    const arm = A.arm.filter((_, j) => !low || j % 2 === 0 || j === A.arm.length - 1);
    B.color(C.ink).loft({ seg: low ? 5 : 7, minSeg: 4, sections: arm.map(([f, r, u, rad], j) => ({ at: [o[0] + f, o[1] + s * r, o[2] + u], rx: rad, rz: rad * .8, bones: j === 0 ? ['gchest', bone, .5] : [bone, bone, 0] })),
      tone: (i, k, st) => inkTone(st) });
    const cols = low ? 3 : full ? 6 : 4, rows = low ? 1 : 3, lead = (q) => { const k = q * (A.arm.length - 1), j = Math.min(A.arm.length - 2, Math.floor(k)), t = k - j, a = A.arm[j], b = A.arm[j + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
    const grid = [];
    for (let r = 0; r <= rows; r++) { const k = r / rows, row = [];
      for (let c = 0; c <= cols; c++) { const q = c / cols, L = lead(q), ch = A.chord * (1 - .55 * q) * (q < .1 ? .6 + 4 * q : 1); row.push([o[0] + L[0] - ch * k, o[1] + s * (L[1] + .02 * k), o[2] + L[2] - .02 - .03 * k]); }
      grid.push(row); }
    B.color(C.ink).sheet({ grid, vertBones: (r, c) => c === 0 ? ['gchest', bone, .5] : [bone, bone, 0], tone: (r, c) => r === 0 ? lerpHex(C.ink, C.rim, .2) : r % 2 ? lerpHex(C.inkMid, C.shade, .5) : c % 2 ? C.deep : C.ink });
    const np = low ? 2 : full ? 8 : 5;
    for (let i = 0; i < np; i++) { const q = i / (np - 1), L = lead(.5 + .5 * (1 - q)), len = A.primary * (1 - .35 * q * q), dir = unit([-.15 - 1.1 * q, s * (1 - q * .55), -.04]);
      B.bone(bone).color(i % 2 ? lerpHex(C.inkMid, C.shade, .45) : C.ink).lathe({ at: [L[0] - .05 - .12 * q, s * L[1], L[2] - .02], F: dir, U: [0, 0, 1], rs: 1, us: .22, rings: [[0, .05], [len * .5, .055], [len, 0]], seg: low ? 4 : 5, caps: false }); }
  }
  // ---- the griffin's legs, grown out of the trunk: raptor forelegs (a muscled feathered upper leg whose top melts into the
  // chest, a ragged hem, a scaled tarsus, three forward toes and a hallux with hooked pale claws) and lion hind legs (a heavy
  // ham blended into the haunch, the stifle, a gaskin and hock, and a padded paw with three claws)
  for (const s of [-1, 1]) {
    const tag = s < 0 ? 'L' : 'R', fu = 'fu' + tag, fl = 'fl' + tag, hu = 'hu' + tag, hl = 'hl' + tag;
    { const o = W(fu), L1 = LEG.fore[0], M = ASTRAL_CV_RIG.foreMuscle;
      B.color(C.ink).loft({ seg: low ? 6 : 8, minSeg: low ? 4 : 5, sections: M.filter((_, j) => full || j !== 2)
        .map(([f, u, rx, rz, w]) => ({ at: [o[0] + f, o[1] - s * .01, o[2] + u], rx, rz, bones: w > 0 ? [fu, 'gchest', w] : [fu, fu, 0] })), tone: LEG_TONE });
      const o2 = W(fl), L2 = LEG.fore[1];
      B.color(C.ink).loft({ seg: low ? 5 : 7, minSeg: 4, sections: [[0, .02, .05], [.01, -.05, .052], [.015, -L2 * .5, .032], [.02, -L2 + .03, .026]].filter((_, j) => !low || j !== 1)
        .map(([f, u, r]) => ({ at: [o2[0] + f, o2[1], o2[2] + u], rx: r, rz: r, bones: [fl, fl, 0] })), tone: (i, k, st) => (i >= 2 ? lerpHex(C.scale, C.ink, .3) : LEG_TONE()) });
      const toes = low ? [] : full ? [[.15, -.05], [.17, 0], [.15, .05], [-.09, 0]] : [[.15, -.04], [.15, .04], [-.09, 0]];
      for (const [tf, tr] of toes) { const dir = [tf, tr, -.02], dl = Math.hypot(...dir);
        B.bone(fl).color(C.ink).lathe({ at: [.02, 0, -L2 + .02], F: [dir[0] / dl, dir[1] / dl, dir[2] / dl], rings: [[0, .024], [dl, .015]], seg: 4, caps: false });
        if (!low) B.bone(fl).color(C.claw).lathe({ at: [.02 + tf, tr, -L2 + .015], F: [Math.sign(tf) * .6, 0, -.8], rings: [[0, .012], [.055, 0]], seg: 4, caps: false }); }
    }
    { const o = W(hu), M = ASTRAL_CV_RIG.hindMuscle;
      B.color(C.ink).loft({ seg: low ? 6 : 8, minSeg: low ? 4 : 5, sections: M.filter((_, j) => full || j !== 2)
        .map(([f, u, rx, rz, w]) => ({ at: [o[0] + f, o[1] + s * .01, o[2] + u], rx, rz, bones: w > 0 ? [hu, 'ghaunch', w] : [hu, hu, 0] })), tone: LEG_TONE });
      const o2 = W(hl), L2 = LEG.hind[1];
      B.color(C.ink).loft({ seg: low ? 5 : 7, minSeg: 4, sections: (low ? [[.0, .02, .075], [-.13, -.15, .045], [-.02, -L2 + .045, .036]] : [[.0, .02, .075], [-.07, -.07, .066], [-.13, -.15, .046], [-.09, -.22, .037], [-.02, -L2 + .045, .036]].filter((_, j) => full || j !== 3))
        .map(([f, u, r]) => ({ at: [o2[0] + f, o2[1], o2[2] + u], rx: r * .8, rz: r, bones: [hl, hl, 0] })), tone: LEG_TONE });
      B.bone(hl).color(C.ink).ellipsoid({ at: [.04, 0, -L2 + .038], radius: [.105, .075, .042], rings: low ? 2 : 3, seg: low ? 5 : 8 });
      for (const cr of low ? [] : [-.04, 0, .04]) B.bone(hl).color(C.claw).lathe({ at: [.13, cr, -L2 + .02], F: [.6, 0, -.8], rings: [[0, .013], [.045, 0]], seg: 4, caps: false });
    }
  }
  // ---- the lion's tail: grown from the rump, a tapering sweep back and up, ending in a flame-shaped tuft of ink points
  { const a = W('tail0'), b = W('tail1');
    B.color(C.ink).loft({ seg: low ? 5 : 7, minSeg: 4, sections: [[[a[0] + .1, 0, a[2] - .02], .085, 'ghaunch', 'tail0', .3], [a, .055, 'tail0', 'tail0', 0], [[a[0] - .14, 0, a[2] + .03], .045, 'tail0', 'tail1', .3], [b, .038, 'tail1', 'tail1', 0], [[b[0] - .14, 0, b[2] + .13], .03, 'tail1', 'tail1', 0], [[b[0] - .22, 0, b[2] + .3], .024, 'tail1', 'tail1', 0]].filter((_, j) => !low || j % 2 === 0 || j === 5)
      .map(([p, r, x, y, w]) => ({ at: p, rx: r, rz: r, bones: [x, y, w] })), tone: (i, k, st) => inkTone(st) });
    for (let j = low ? 1 : 0; j < (low ? 2 : full ? 4 : 3); j++) { const a2 = (j - 1.5) * .45;
      B.bone('tail1').color(C.ink).lathe({ at: [-.22, 0, .3], F: [-.8, .3 * Math.sin(a2), .25 + .3 * Math.cos(a2)], rings: [[0, .045], [.06, .034], [.18, 0]], seg: low ? 4 : 5, caps: false }); }
  }
  // ---- the pool: a domed puddle of ink with a grey sheen, and twelve spikes thrown out round it (built standing out)
  { const o = W('pool');
    B.color(C.ink).loft({ seg: low ? 8 : 12, up: [1, 0, 0], sections: [[.0, .02], [.012, .9], [.06, .82], [.12, .6], [.16, .32], [.175, .04]]
      .map(([u, r]) => ({ at: [o[0], o[1], u], rx: r, rz: r * .86, bones: ['pool', 'pool', 0] })), tone: (i) => i === 2 ? lerpHex(C.rim, C.ink, .4) : i >= 3 ? lerpHex(C.inkMid, C.inkHi, (i - 3) / 2) : C.deep });
    if (!low) B.bone('pool').color(C.poolSheen).ellipsoid({ at: [.05, 0, .16], radius: [.32, .14, .012], rings: 2, seg: 8, F: [1, .2, 0] });
    const n = low ? 6 : full ? 12 : 9;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + .13, ca = Math.cos(a), sa = Math.sin(a), len = .6 + .1 * ((i * 7) % 3);
      B.bone('spikes').color(i % 2 ? C.ink : C.inkMid).lathe({ at: [ca * .45, sa * .4, .02], F: [ca * .78, sa * .78, .62], rings: low ? [[0, .08], [len, 0]] : [[0, .09], [len * .5, .05], [len, 0]], seg: 4, caps: false }); }
  }
  // ---- the trample's and the bite's ink limbs: three to a group along each side, bent at an elbow, every third a splayed hand
  for (let g = 0; g < LIMB_SEG.length; g++) for (const s of [-1, 1]) {
    const bone = 'limb' + g + (s < 0 ? 'L' : 'R'), o = W(bone);
    for (let j = 0; j < 3; j++) { if (!full && j === 1 || low && j === 2) continue; const fo = (j - 1) * .2, reach = .5 - .05 * Math.abs(j - 1);
      const pts = [[fo * .3, 0, 0, .05], [fo + .06, s * .26, .12, .042], [fo + .02, s * .4, -.1, .032], [fo, s * .46, -reach, .014]];
      B.color(C.ink).loft({ seg: 3, minSeg: 3, sections: (low ? pts.filter((_, q) => q !== 2) : pts).map(([f, r, u, rad]) => ({ at: [o[0] + f, o[1] + r, o[2] + u], rx: rad, rz: rad, bones: [bone, bone, 0] })), caps: false,
        tone: (i, k, st) => i === 1 ? lerpHex(C.ink, C.rim, .35 + .25 * st) : inkTone(st) });
      if ((g + j) % 3 === 0 && full) for (let q = 0; q < 4; q++) B.bone(bone).color(C.ink).lathe({ at: [fo, s * .46, -reach + .01], F: [(q - 1.5) * .35, s * .25, -1], rings: [[0, .014], [.08, 0]], seg: 3, caps: false });
    }
  }
  // ---- optional (flight only): the insect wings, two pairs fanned back (translucent membranes on channel 3, with an opaque
  // leading-edge vein, a dark wing spot near the tip, a vein down the middle and a pale rim round the trailing edge); the
  // mouth beam from the open mouth to the beam's ground point (its core channel 4, its halo channel 3) with a splash where it
  // strikes
  B.mark();
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'fwingL' : 'fwingR', o = W(bone), cols = low ? 5 : full ? 10 : 7, rows = low ? 2 : full ? 4 : 3, FW = ASTRAL_CV_RIG.insectWing;
    for (let j = 0; j < 2; j++) {
      const [len, back, wide, rootF] = FW.pairs[j], dir = [-Math.sin(back), s * Math.cos(back)], aft = [-Math.cos(back), -s * Math.sin(back)];
      // the planform: a straight leading edge, the chord widening from a narrow root, a rounded tip; the hind pair broader at
      // its base
      const chord = (q) => wide * (j ? .62 + .38 * Math.cos(Math.PI * .5 * Math.min(1, Math.max(0, q - .15) / .7)) ** 2 : .45 + .55 * Math.sin(Math.PI * Math.min(1, q * 1.6) * .5)) * (q > .8 ? Math.sqrt(Math.max(0, 1 - ((q - .8) / .205) ** 2)) : 1) + .006;
      const pt = (q, k) => { const c = chord(q) * k - .2 * wide * (q > .8 ? ((q - .8) / .2) ** 2 : 0); return [o[0] + rootF + dir[0] * len * q + aft[0] * c, o[1] + dir[1] * len * q + aft[1] * c, o[2] + .05 * q - .015 * j]; };
      const grid = [];
      for (let r = 0; r <= rows; r++) { const row = []; for (let c = 0; c <= cols; c++) row.push(pt(.02 + .98 * (c / cols), r / rows)); grid.push(row); }
      B.color(C.wing, E_VEIL).sheet({ grid, vertBones: () => [bone, bone, 0], tone: (r, c) => r === rows ? C.wingEdge : (c % 2 === 0 || r % 2 === 1) ? lerpHex(C.wing, C.vein, .75) : lerpHex(C.wing, C.vein, .35) });
      // the veins: the leading edge (costa) thick and dark, the middle vein thin and pale, the trailing rim pale
      const vein = (k, rad0, rad1, col, n) => B.color(col).loft({ seg: 3, minSeg: 3, caps: false, sections: Array.from({ length: n + 1 }, (_, i) => { const q = .02 + .96 * (i / n); return { at: pt(q, k), rx: rad0 + (rad1 - rad0) * (i / n), rz: rad0 + (rad1 - rad0) * (i / n), bones: [bone, bone, 0] }; }) });
      vein(0, .02, .007, C.mandLine, low ? 3 : 6);
      if (!low) vein(.45, .007, .004, C.vein, full ? 5 : 3);
      if (full) vein(1, .006, .004, C.wingEdge, 6);
      const ps = pt(.87, .1); B.bone(bone).color(C.ink).ellipsoid({ at: [ps[0] - o[0], ps[1] - o[1], ps[2] - o[2]], radius: [.06, .022, .008], rings: 2, seg: 5, F: [dir[0], dir[1], 0], U: [0, 0, 1] });
    }
  }
  { const top = [W('jaw')[0] + .3, 0, W('jaw')[2] - .02], foot = W('beamFoot'), n = 4;
    for (const [rad, col, ch, sg] of [[.075, C.beamGlow, E_VEIL, low ? 6 : 10], [.026, C.beamCore, E_BEAM, low ? 5 : 8]]) {
      const secs = [];
      for (let i = 0; i <= n; i++) { const q = i / n; secs.push({ at: [top[0] + (foot[0] - top[0]) * q, top[1] + (foot[1] - top[1]) * q, top[2] + (foot[2] - top[2]) * q], rx: rad * (.6 + .4 * q), rz: rad * (.6 + .4 * q), bones: ['jaw', 'beamFoot', q] }); }
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
      if (!live) { ACT.open = smooth(t / wu); ACT.rear = .6 * smooth(t / wu); break; }
      const p = (t - wu) % ASTRAL.biteGap, snapT = ASTRAL.biteActive;
      // each bite: the jaws, wide at the end of the gap, slam shut at the start of the game's active window (its first share)
      // and stay clenched through it with a lunge; then the head rears back and gapes again over the gap
      if (p < snapT) { const q = p / snapT; ACT.open = 1 - smooth(q / ASTRAL_CV_RIG.biteSnap); ACT.lunge = 1 - q * .4; ACT.contact = 1; }
      else { const q = (p - snapT) / (ASTRAL.biteGap - snapT); ACT.open = smooth(q * 1.5); ACT.rear = .5 * smooth(q * 1.6); ACT.lunge = .6 * (1 - smooth(q * 3)); }
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
// (the jaw is the head bead's lower half, so it stays: it hides with its bead)
// (and a part hanging from a hidden part keeps its own size, so the morph grows it in once, with its parent)
const KEEP = new Uint8Array(NB); for (const n of ['jaw', 'ghead', 'gwingL', 'gwingR', 'tail0', 'tail1', 'flL', 'flR', 'hlL', 'hlR']) KEEP[BI[n]] = 1;
function hideAll(T) { for (let i = 0; i < NB; i++) put(T, i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2], 0, 0, 0, KEEP[i] ? 1 : HID); }
// the jaw: its gape (pitch down from the hinge) and a little forward slide as it opens
function jawOpen(T, g) { const i = BI.jaw; put(T, i, bind[i * 3] + .02 * clamp01(g), 0, bind[i * 3 + 2], 0, g, 0, 1); }
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
      // the head bows to the beam, the mouth opens on it
      T[BI.s0 * 7 + 4] += .28 + .15 * ACT.beam; T[BI.s1 * 7 + 4] += .1;
      // the mandibles work: a slow spread and a hard snap shut, the tips crossing (held wide while the beam pours out)
      const cyc = CTX.reduce ? .3 : (t * R.mandRate) % 1, work = cyc < .7 ? smooth(cyc / .7) : 1 - smooth((cyc - .7) / .12);
      const spread = R.mandRest + (ACT.beam > 0 ? R.mandOpen : R.mandShut + (R.mandOpen - R.mandShut) * work);
      jawOpen(T, .1 + .45 * ACT.beam + (CTX.reduce ? 0 : .06 * work * (1 - ACT.beam)));
      const buzz = CTX.reduce ? 0 : Math.sin(t * R.buzz), feather = CTX.reduce ? 0 : Math.cos(t * R.buzz);
      for (const s of [-1, 1]) {
        const tag = s < 0 ? 'L' : 'R', m = BI['mand' + tag], w = BI['fwing' + tag];
        put(T, m, bind[m * 3], bind[m * 3 + 1], bind[m * 3 + 2], s * spread, .18 - .1 * work, -s * .1 * work, 1);
        put(T, w, bind[w * 3], bind[w * 3 + 1], bind[w * 3 + 2], 0, .2 * feather, s * (.22 + R.buzzAmp * buzz), 1);
      }
      if (ACT.beam > 0) T[BI.beamFoot * 7 + 6] = 1;
      break;
    }
    case 'trample': {
      put(T, BI.body, 0, 0, R.trampleHover, 0, 0, 0, 1);
      beads(T, R.wave * .7, R.waveRate * 1.6, 1);
      limbs(T, true, ACT.churn > .5 ? R.churnFast : R.churnSlow, .5);
      jawOpen(T, .05 + .1 * ACT.churn);
      break;
    }
    case 'bite': {
      beads(T, R.wave, R.waveRate, 1);
      limbs(T, true, R.churnSlow, .65);
      // the head itself gapes: the jaw drops from its hinge, the upper head lifts and swells; shut, it is a bead again
      const o = ACT.open;
      jawOpen(T, R.biteOpen * o);
      T[BI.s0 * 7 + 4] -= R.biteLift * o; T[BI.s0 * 7 + 6] *= 1 + R.biteSwell * o;
      // the neck stretches as it gapes, so the throat runs back into the body rather than onto the next bead
      T[BI.s0 * 7] += R.biteReach * o * .5; T[BI.s1 * 7] -= R.biteReach * o; T[BI.s1 * 7 + 2] -= .3 * R.biteReach * o; T[BI.s1 * 7 + 6] *= 1 - R.biteNeck * o;
      break;
    }
    case 'griffin': {
      // the pounce: crouch (the body sinks, the wings rise), the leap (an arc, forelegs reaching, hind legs thrust back, the
      // wings beating down), the landing (the body absorbs it)
      const cr = ACT.crouch, lp = ACT.leap, ld = ACT.land, breathe = CTX.reduce ? 0 : Math.sin(t * 2.2);
      const air = lp >= 0 ? R.pounceArc * Math.sin(Math.PI * lp) : 0, bh = GH - R.crouch * cr - .08 * ld * ld + air + .012 * breathe;
      const bp = lp >= 0 ? -.3 + .5 * lp : .12 * cr - .05 * ld;
      put(T, BI.body, 0, 0, bh, 0, bp, CTX.hurt * .2, 1);
      // the spine: the chest heaves with the breath and rises into the leap; the haunch bunches in the crouch and kicks out
      const reach = lp >= 0 ? Math.sin(Math.PI * Math.min(1, lp * 1.2)) : 0;
      put(T, BI.gchest, GCHEST[0], 0, GCHEST[2] + .008 * breathe, 0, -.06 * reach + .04 * cr, 0, 1 + .012 * breathe);
      put(T, BI.ghaunch, GHAUNCH[0], 0, GHAUNCH[2] + .03 * cr, 0, .1 * cr - .12 * reach, 0, 1);
      // the head and neck: lowered and drawn back in the crouch, thrust out in the leap, turning to look about at rest
      const look = CTX.reduce ? 0 : .25 * wobble(t * .45, 2) * (1 - cr) * (lp >= 0 ? 0 : 1);
      const hf = bind[BI.ghead * 3] + .1 * reach - .04 * cr, hu = bind[BI.ghead * 3 + 2] - .14 * cr - .06 * reach;
      put(T, BI.ghead, hf, 0, hu, look, .2 * cr - .08 + .25 * reach - (CTX.reduce ? 0 : .05 * Math.sin(t * 1.3)), 0, 1);
      for (let i = 0; i < SEGS; i++) { const [f, u, s] = GRIFFIN_BEADS[i]; put(T, BI['s' + i], f, 0, u, 0, 0, 0, s); }
      T[BI.s0 * 7] = GCHEST[0] + hf; T[BI.s0 * 7 + 2] = GCHEST[2] + hu;
      // wings: half raised at rest, high in the crouch, swept down through the leap
      const wr = lp >= 0 ? 1.15 - 1.3 * smooth(lp) : .7 + .45 * cr + .1 * ld + (CTX.reduce ? 0 : .05 * Math.sin(t * 1.7));
      for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R', i = BI['gwing' + tag]; put(T, i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2], s * (.6 - .25 * cr - .35 * (lp >= 0 ? Math.sin(Math.PI * lp) : 0)), -.2, s * wr, 1); }
      // legs: feet on the ground (in the body's frame, through its pitch), tucked and reaching in the leap
      const cp = Math.cos(bp), sp = Math.sin(bp), toBody = (F, U, out) => { const dU = U - bh; out[0] = F * cp - dU * sp; out[1] = F * sp + dU * cp; return out; };
      for (const s of [-1, 1]) {
        const tag = s < 0 ? 'L' : 'R', fu = BI['fu' + tag], fl = BI['fl' + tag], hu2 = BI['hu' + tag], hl = BI['hl' + tag];
        put(T, fu, FORE_AT[0], s * FORE_AT[1], FORE_AT[2], 0, 0, 0, 1); put(T, fl, 0, 0, -LEG.fore[0], 0, 0, 0, 1);
        put(T, hu2, HIND_AT[0], s * HIND_AT[1], HIND_AT[2], 0, 0, 0, 1); put(T, hl, 0, 0, -LEG.hind[0], 0, 0, 0, 1);
        const stag = s < 0 ? .03 : -.03;
        if (lp >= 0) { FP[0] = FORE_AT[0] + .28 * Math.sin(Math.PI * lp) + .05; FP[1] = FORE_AT[2] - .42 + .1 * Math.sin(Math.PI * lp); }
        else toBody(FORE_AT[0] + .04 + stag, .03, FP);
        HP[0] = FORE_AT[0]; HP[1] = FORE_AT[2]; legPitch(T, fu, fl, HP, FP, LEG.fore[0], LEG.fore[1], false);
        if (lp >= 0) { FP[0] = HIND_AT[0] - .3 * Math.sin(Math.PI * Math.min(1, lp * 1.3)) - .02; FP[1] = HIND_AT[2] - .44 + .12 * smooth(lp); }
        else toBody(HIND_AT[0] - .02 - stag, .02, FP);
        HP[0] = HIND_AT[0]; HP[1] = HIND_AT[2]; legPitch(T, hu2, hl, HP, FP, LEG.hind[0], LEG.hind[1], true);
      }
      // the tail: up and swaying, streaming out behind the leap
      const sway = CTX.reduce ? 0 : .3 * Math.sin(t * 1.9);
      put(T, BI.tail0, bind[BI.tail0 * 3], 0, bind[BI.tail0 * 3 + 2], sway, -.1 + .35 * (lp >= 0 ? Math.sin(Math.PI * lp) : 0) - .15 * cr, 0, 1);
      put(T, BI.tail1, bind[BI.tail1 * 3], 0, bind[BI.tail1 * 3 + 2], sway * .8, -.2 + (CTX.reduce ? 0 : .12 * Math.sin(t * 1.9 - 1)), 0, 1);
      break;
    }
    default: {
      // the worm (rings, mirage and the ink worm): the mouth parts a little on the rings' pulse and as it rears
      beads(T, R.wave * (1 + .4 * CTX.travel), R.waveRate * (1 + .5 * CTX.travel), 1);
      jawOpen(T, .35 * ACT.pulse + .3 * ACT.rear);
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
    if (k < 1) {
      formPose(TA, prev); for (let i = 0; i < TO.length; i++) TO[i] = TA[i] + (TB[i] - TA[i]) * k;
      // the ink heaves as it changes shape: a swell runs from the head down the beads over the morph
      for (let i = 0; i < SEGS; i++) TO[BI['s' + i] * 7 + 6] *= 1 + G.morphSwell * Math.sin(Math.PI * k) * Math.max(0, Math.sin(Math.PI * (k * 2.2 - i / SEGS)));
    } else TO.set(TB);
  }
  // the beam's foot stands where the game's beam strikes
  if (TO[BI.beamFoot * 7 + 6] > .01) { const fl = beamFootLocal(e, env, yaw, S); TO[BI.beamFoot * 7] = fl[0]; TO[BI.beamFoot * 7 + 1] = fl[1]; TO[BI.beamFoot * 7 + 2] = .02; }
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  for (let i = 1; i < NB; i++) {
    const o = i * 7; P.off[i * 3] = TO[o] - bind[i * 3]; P.off[i * 3 + 1] = TO[o + 1] - bind[i * 3 + 1]; P.off[i * 3 + 2] = TO[o + 2] - bind[i * 3 + 2];
    setEuler(P, i, TO[o + 3], TO[o + 4], TO[o + 5]); P.scl[i] = Math.max(HID, TO[o + 6]); resolveBone(P, i);
  }
  // hidden, the beam's foot waits in the mouth (so the beam is drawn up inside the head)
  if (TO[BI.beamFoot * 7 + 6] <= .01) { const f = BI.beamFoot * 3, j = BI.jaw * 3; P.wp[f] = P.wp[j]; P.wp[f + 1] = P.wp[j + 1]; P.wp[f + 2] = P.wp[j + 2]; }
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
