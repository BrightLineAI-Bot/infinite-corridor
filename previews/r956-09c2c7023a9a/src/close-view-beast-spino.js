// The Spinosaurus in Close View: the standard view's hunter (spino-render.ts drawSpino: a biped with a heavy tail, a deep
// mottled body in light orange, rust and amber with a paler belly, a tall dark-orange sail of spines, a long crocodile snout
// full of teeth, muscular clawed arms and digitigrade legs) as one skinned body on the shared beast rig, and its fossil (the same
// silhouette as bone: vertebrae, bare sail spines, a ribcage, limb bones and a skull with embers in its sockets). Two meshes on
// one skeleton, chosen by the foe (`spinoMesh(tier, foe)`): the hide until spinoFossil, then the bones; through the shed
// (spinoShed 0 → 1) the bones show with pieces of hide tearing away and falling (an optional section on its own chunk bones).
// It moves as the game poses it, from the pose contract only (the spino spec): spinoPose names the pose (SPINO_POSES, shared
// with the standard view; a strike's anticipation plays through the attack's windup), spinoAir lifts it (tiles), spinoGrab's
// hold lifts the head with the jaws open on the prey (the game draws the prey), spinoDig buries the snout, and the fossil's rib
// spears grow out of the ribcage to the sides and thrust together ahead of it. Nothing here changes timing, damage, reach or
// targeting.
import { SPINO_ART, SPINO_POSE_KEYS, spinoPoseVector, spinoStrike, spinoFossilShare } from "./spino-render.js?v=r956-09c2c7023a9a";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, boneLocalToWorld, writeSkin, solveTwoBone, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r956-09c2c7023a9a";

export const SPINO_RIG = Object.freeze({
  // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  closeViewScale: 1.25,
  // limb lengths and placement (model units: the standard view's body units)
  hip: .84, halfWidth: .13, thigh: .36, shin: .34, meta: .15, foot: .04, upperArm: .2, foreArm: .18, shoulderW: .12,
  walk: Object.freeze({ stride: .62, stance: .62 }), run: Object.freeze({ stride: 1.3, stance: .42 }), runSpeed: 2.6,
  footLift: .14, bob: .02, settle: 7, stepAt: .1, stepTime: .26, turnRate: 1.8, standTurnRate: 3.2, standTurnMax: 2.2, attackTurnRate: 10,
  blendMs: 140, deathMs: 2400, hitMs: 300, impactMs: 380, landMs: 420, chew: 9, tremble: 30,
  // the fossil's shed: below this share the hide still shows (trembling); after it the bones, the hide's pieces falling away
  shedSwitch: .12, chunkFall: 1.2, chunkSpin: 5, chunkStagger: .55, chunkSize: 1.45,
  // the rib spears: length (model units), how far out to the sides, where they converge ahead of the chest
  spear: .78, spearOut: Object.freeze([[.15, .95, .3], [-.25, .95, -.2]]), spearPoint: Object.freeze([1.25, 0, -.1]),
  // ground the snout: the plough drags the jaw along it, the dig drives it under
  ploughHead: -.2, digHead: -1.05,
});
const PK = SPINO_POSE_KEYS, NK = PK.length, KI = Object.fromEntries(PK.map((k, i) => [k, i]));

// ------------------------------------------------------------------------------------------------ skeleton
const R = SPINO_RIG, TAIL = 6, G_CHUNK = SPINO_RIG.chunkSize;
const CHUNKS = Object.freeze([
  // [name, model position (f, r, u), outward normal, radii (along, across, thick), tone]
  ['flankL', [.06, -.2, .78], [0, -1, .15], [.2, .14, .035], 'body'], ['flankR', [.06, .2, .78], [0, 1, .15], [.2, .14, .035], 'body'],
  ['haunchL', [-.2, -.18, .74], [0, -1, 0], [.16, .15, .035], 'mottle'], ['haunchR', [-.2, .18, .74], [0, 1, 0], [.16, .15, .035], 'mottle'],
  ['neckL', [.46, -.09, .92], [0, -1, .2], [.12, .08, .03], 'body'], ['neckR', [.46, .09, .92], [0, 1, .2], [.12, .08, .03], 'body'],
  ['tail', [-.6, 0, .96], [0, 0, 1], [.2, .08, .03], 'mottle'], ['sail', [-.02, 0, 1.25], [0, 1, 0], [.18, .14, .02], 'sail'],
]);
export const SPINO_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', at: [-.14, 0, R.hip] },
  ...Array.from({ length: TAIL }, (_, i) => ({ name: 'tail' + i, parent: i ? 'tail' + (i - 1) : 'pelvis', at: i ? [-.18, 0, -.02 - .01 * i] : [-.2, 0, .02] })),
  { name: 'spine', parent: 'pelvis', at: [.22, 0, .015] },
  { name: 'chest', parent: 'spine', at: [.22, 0, 0] },
  { name: 'neck0', parent: 'chest', at: [.13, 0, -.025] }, { name: 'neck1', parent: 'neck0', at: [.07, 0, .1] }, { name: 'head', parent: 'neck1', at: [.19, 0, .13] },
  { name: 'jaw', parent: 'head', at: [-.01, 0, -.03] },
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
    return [{ name: 'thigh' + tag, parent: 'pelvis', at: [.02, s * R.halfWidth, -.04] }, { name: 'shin' + tag, parent: 'thigh' + tag, at: [0, 0, -R.thigh] },
      { name: 'meta' + tag, parent: 'shin' + tag, at: [0, 0, -R.shin] }, { name: 'foot' + tag, parent: 'meta' + tag, at: [0, 0, -R.meta] }]; }),
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
    return [{ name: 'arm' + tag, parent: 'chest', at: [.06, s * R.shoulderW, -.16] }, { name: 'fore' + tag, parent: 'arm' + tag, at: [0, 0, -R.upperArm] },
      { name: 'hand' + tag, parent: 'fore' + tag, at: [0, 0, -R.foreArm] }]; }),
  // the fossil's rib spears (two a side, out of the ribcage: hidden until they grow)
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
    return [{ name: 'spear0' + tag, parent: 'spine', at: [.1, s * .15, -.06] }, { name: 'spear1' + tag, parent: 'chest', at: [-.02, s * .16, -.08] }]; }),
  // the shed's pieces of hide (each on its own bone so it can fall and tumble)
  ...CHUNKS.map(([name, p]) => ({ name: 'chunk' + name, parent: 'root', at: p.slice() })),
]);
const BI = SPINO_SKELETON.index;
const E_EYE = 1;

// ------------------------------------------------------------------------------------------------ the bodies
const hexOf = (c) => parseInt(String(c).slice(1), 16);
const A = SPINO_ART;
const C = Object.freeze({ body: hexOf(A.body), light: hexOf(A.bodyLight), dark: hexOf(A.bodyDark), belly: hexOf(A.belly), sail: hexOf(A.sail), sailLight: hexOf(A.sailLight), sailDark: hexOf(A.sailDark),
  m0: hexOf(A.mottle[0]), m1: hexOf(A.mottle[1]), m2: hexOf(A.mottle[2]), stripe: hexOf(A.stripe), mouth: hexOf(A.mouth), gum: hexOf(A.gum), tooth: hexOf(A.tooth), claw: hexOf(A.claw), clawDark: hexOf(A.clawDark),
  eye: hexOf(A.eye), eyeHot: hexOf(A.eyeHot), brow: hexOf(A.brow), bone: hexOf(A.bone), boneShade: hexOf(A.boneShade), boneDark: hexOf(A.boneDark), joint: hexOf(A.joint), socket: hexOf(A.socket), ember: hexOf(A.ember) });
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
const hash = (i, j = 0) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
const bwOf = (name) => { const i = BI[name] * 3, b = SPINO_SKELETON.bindWorld; return [b[i], b[i + 1], b[i + 2]]; };
const at = (bone, p) => { const q = bwOf(bone); return [p[0] - q[0], p[1] - q[1], p[2] - q[2]]; };

// The hide's sections, tail tip to the back of the skull: [f, u (centre), half width, half height, bone a, bone b, weight b]. The
// centre sits below the spine where the belly is deep (the standard view's depth above and below its spine).
const BODY = (() => {
  const rows = [];
  const tailPts = [[-1.42, .58]], tb = [];
  for (let i = TAIL - 1; i >= 0; i--) { const p = bwOf('tail' + i); tb.push([p[0], p[2], 'tail' + i]); }
  rows.push([-1.42, .58, .012, .016, 'tail5', 'tail5', 0]);
  tb.forEach(([f, u, b], j) => { const k = (j + 1) / (TAIL + 1), top = .03 + .17 * Math.pow(k, .8), bot = .022 + .15 * k, i = TAIL - 1 - j;
    rows.push([f, u + (top - bot) / 2, (.016 + .08 * Math.pow(k, 1.1)), (top + bot) / 2, 'tail' + i, i > 0 ? 'tail' + (i - 1) : 'pelvis', i > 0 ? .25 : .3]); });
  void tailPts;
  rows.push([-.26, .84 - .04, .165, .205, 'pelvis', 'tail0', .2], [-.14, .84 - .055, .215, .24, 'pelvis'], [-.02, .845 - .06, .222, .255, 'pelvis', 'spine', .5],
    [.08, .855 - .055, .22, .26, 'spine'], [.2, .855 - .05, .215, .255, 'spine', 'chest', .5], [.3, .85 - .04, .2, .235, 'chest'], [.38, .84 - .03, .16, .19, 'chest', 'neck0', .3]);
  // the neck rising to the skull
  rows.push([.45, .85, .125, .14, 'neck0'], [.5, .92, .105, .12, 'neck0', 'neck1', .5], [.56, .99, .09, .1, 'neck1'], [.63, 1.04, .08, .085, 'neck1', 'head', .5], [.67, 1.06, .07, .075, 'head']);
  return Object.freeze(rows.map(Object.freeze));
})();
const NECK0 = BODY.findIndex((r) => r[4] === 'neck0');
// The full tier's hide: a section between every two (the mottles and stripes are vertex colours, so they need the rows); each
// in-between row is skinned by the average of its neighbours' weights, kept to the two strongest bones.
const BODY_FINE = (() => {
  const wts = (r) => { const m = {}; m[r[4]] = (m[r[4]] || 0) + 1 - (r[6] || 0); m[r[5] ?? r[4]] = (m[r[5] ?? r[4]] || 0) + (r[6] || 0); return m; };
  const out = [];
  for (let i = 0; i < BODY.length; i++) {
    out.push(BODY[i]);
    if (i === BODY.length - 1 || i >= NECK0) continue;
    const a = BODY[i], b = BODY[i + 1], m = wts(a), n = wts(b), all = {};
    for (const k in m) all[k] = (all[k] || 0) + m[k] / 2; for (const k in n) all[k] = (all[k] || 0) + n[k] / 2;
    const top = Object.entries(all).sort((x, y) => y[1] - x[1]).slice(0, 2), sum = top.reduce((q, x) => q + x[1], 0);
    out.push(Object.freeze([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, (a[3] + b[3]) / 2, top[0][0], (top[1] || top[0])[0], top[1] ? top[1][1] / sum : 0]));
  }
  return Object.freeze(out);
})();
// the back's top at a given f (for the sail and the ribs)
function bodyAt(f) { let k = 0; while (k < BODY.length - 2 && BODY[k + 1][0] < f) k++; const a = BODY[k], b = BODY[k + 1], q = clamp01((f - a[0]) / ((b[0] - a[0]) || 1)), m = (n) => a[n] + (b[n] - a[n]) * q;
  return { u: m(1), rx: m(2), rz: m(3), bone: q < .5 ? (a[6] >= .5 ? a[5] : a[4]) : (b[6] >= .5 ? b[5] : b[4]) }; }
const trunkBone = (f) => f < -.3 ? ['tail0', 'pelvis', smooth(span(f, -.5, -.3))] : f < 0 ? ['pelvis', 'spine', smooth(span(f, -.12, .05))] : f < .25 ? ['spine', 'chest', smooth(span(f, .12, .25))] : ['chest', 'chest', 0];
// the sail: base and top per spine (model space); its profile peaks a little behind mid-back as the standard view's
const SAIL = (() => {
  const n = SPINO_ART.sailN, out = [];
  for (let i = 0; i < n; i++) { const q = i / (n - 1), f = -.55 + q * .97, b = bodyAt(f), prof = Math.pow(Math.sin(Math.PI * Math.min(1, .06 + q * .94)), .85) * (1 - .18 * q) + .04;
    const top = b.u + b.rz, h = SPINO_ART.sailH * prof, lean = -.22 + .12 * q; out.push(Object.freeze([f, top - .03, f + Math.sin(lean) * h, top + Math.cos(lean) * h])); }
  return Object.freeze(out);
})();

function head(B, low, fossil) {
  // the skull: long and low, a crest over the eyes, the snout curling up into a rosette at its tip (head-local: f along the
  // snout, the hinge at the origin). [f, u, half width, half height]
  const SK = [[-.08, .03, .06, .05], [-.02, .045, .085, .075], [.07, .05, .085, .075], [.15, .04, .07, .062], [.25, .026, .054, .048], [.35, .016, .044, .038], [.45, .012, .039, .033], [.52, .02, .046, .038], [.58, .016, .038, .032], [.62, .01, .018, .018]];
  const seg = low ? 8 : 12, hb = bwOf('head');
  const toneU = (i, k, st) => fossil ? (st > .2 ? C.bone : C.boneShade) : st < -.4 ? C.belly : (i > 2 && (i + k) % 5 === 0 && st > 0) ? C.m0 : lerpHex(C.body, C.dark, Math.max(0, st) * .5);
  B.color(fossil ? C.bone : C.body).loft({ seg, sections: SK.filter((_, i) => !low || i % 2 === 0 || i === SK.length - 1).map(([f, u, rx, rz]) => ({ at: [hb[0] + f, hb[1], hb[2] + u], rx: fossil ? rx * .8 : rx, rz: fossil ? rz * .9 : rz, bones: ['head', 'head', 0] })), tone: toneU });
  // the lower jaw (opens on the jaw bone), the mouth's dark inside on it
  const JW = [[-.06, -.025, .065, .04], [.06, -.03, .066, .038], [.2, -.026, .054, .032], [.34, -.02, .044, .026], [.46, -.014, .035, .02], [.54, -.012, .03, .017], [.6, -.012, .012, .01]];
  const jb = bwOf('jaw');
  B.color(fossil ? C.boneShade : C.dark).loft({ seg: low ? 6 : 10, sections: JW.filter((_, i) => !low || i % 2 === 0 || i === JW.length - 1).map(([f, u, rx, rz]) => ({ at: [jb[0] + f, jb[1], hb[2] + u], rx, rz, bones: ['jaw', 'jaw', 0] })), tone: (i, k, st) => fossil ? C.boneShade : st < -.2 ? C.belly : C.dark });
  B.bone('jaw').color(fossil ? C.socket : C.mouth).ellipsoid({ at: [.25, 0, .015], radius: [.26, .04, .008], rings: 2, seg: low ? 5 : 8 });
  B.bone('head').color(fossil ? C.socket : C.gum).ellipsoid({ at: [.26, 0, -.015], radius: [.27, .042, .01], rings: 2, seg: low ? 5 : 8 });
  // teeth: conical, longest at the rosette
  if (!low) for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
    const f = .04 + i * .065, big = f > .48 ? 1.7 : 1, rx = SK[Math.min(SK.length - 2, Math.floor(f / .065))][2] * .75;
    B.bone('head').color(C.tooth).lathe({ at: [f, s * Math.min(.045, rx), -.012], F: [0, 0, -1], rings: [[0, .009 * big], [.03 * big, 0]], seg: 3, caps: false });
    if (i < 8) B.bone('jaw').color(C.tooth).lathe({ at: [f + .03, s * Math.min(.04, rx * .9), .002], F: [0, 0, 1], rings: [[0, .008 * big], [.024 * big, 0]], seg: 3, caps: false });
  }
  // the eyes (fierce amber under a heavy brow; as bone, embers deep in the sockets) and the nostrils set back on the snout
  for (const s of [-1, 1]) {
    if (fossil) { B.bone('head').color(C.socket).ellipsoid({ at: [.12, s * .058, .062], radius: [.045, .022, .036], rings: 3, seg: 7 }); B.bone('head').color(C.socket).ellipsoid({ at: [.25, s * .042, .036], radius: [.06, .016, .02], rings: 2, seg: 6 }); B.bone('head').color(C.socket).ellipsoid({ at: [-.02, s * .045, .06], radius: [.035, .02, .025], rings: 2, seg: 6 }); B.bone('jaw').color(C.socket).ellipsoid({ at: [.1, s * .052, -.025], radius: [.05, .014, .012], rings: 2, seg: 5 }); }
    else if (!low) B.bone('head').color(C.brow).ellipsoid({ at: [.11, s * .066, .1], radius: [.07, .022, .018], rings: 3, seg: 6, F: [1, 0, -.25] });
    B.bone('head').color(fossil ? C.ember : C.eye, E_EYE).ellipsoid({ at: [.13, s * (fossil ? .062 : .078), .068], radius: fossil ? [.014, .01, .014] : [.022, .012, .018], rings: 2, seg: 6 });
    if (!low) B.bone('head').color(fossil ? C.socket : C.brow).ellipsoid({ at: [.42, s * .03, .045], radius: [.02, .01, .008], rings: 2, seg: 4 });
  }
}

function buildSpinoMesh(tier, fossil) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(SPINO_SKELETON, d);
  const bandAt = (f) => Math.abs(((f * 7.5) % 1 + 1) % 1 - .5) < .14;
  if (!fossil) {
    const ROWS = full ? BODY_FINE : BODY;
    // the hide: ONE skin from the tail tip to the skull's back, deep through the belly, mottled and striped like the standard view's
    const shade = (i, k, st) => {
      const f = ROWS[i][0], h = hash(i * 3.7 + k * 1.3, 5);
      let c = lerpHex(C.body, C.light, Math.max(0, (st - .3) / .7) * .5);
      if (st > .1 && bandAt(f) && i < ROWS.length - 4 && (k % 3)) c = lerpHex(c, C.stripe, .85);
      else if (h > .6) c = h > .87 ? C.m0 : h > .74 ? C.m1 : C.m2;
      if (st < -.35) c = lerpHex(c, C.belly, Math.min(1, (-.35 - st) / .35));
      return c;
    };
    B.color(C.body).loft({ seg: low ? 10 : full ? 18 : 12, sections: ROWS.map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })), tone: low ? (i, k, st) => st < -.35 ? C.belly : C.body : shade, caps: false });
    // a low crest of small spines down the tail
    if (!low) for (let i = 0; i < TAIL - 1; i++) { const p = bwOf('tail' + i), b = bodyAt(p[0]);
      B.bone('tail' + i).color(C.sailDark).lathe({ at: at('tail' + i, [p[0] - .05, 0, b.u + b.rz * .92]), F: [-.5, 0, .85], rings: [[0, .018], [.06 - i * .006, 0]], rs: .4, seg: 4, caps: false }); }
    // the sail: a membrane between the spines, its edge scalloped between their tips, dark orange darkening to the base
    const n = SAIL.length, cols = low ? n : 2 * n - 1, rows = low ? 2 : full ? 5 : 3, grid = [], bones = [];
    for (let r = 0; r < rows; r++) { const k = r / (rows - 1), row = [], brow = [];
      for (let c = 0; c < cols; c++) { const sp = low ? c : c / 2, i0 = Math.floor(sp), i1 = Math.min(n - 1, i0 + 1), q = sp - i0, s0 = SAIL[i0], s1 = SAIL[i1];
        const bf = s0[0] + (s1[0] - s0[0]) * q, bu = s0[1] + (s1[1] - s0[1]) * q, tf = s0[2] + (s1[2] - s0[2]) * q, tu = s0[3] + (s1[3] - s0[3]) * q - (q > 0 ? .06 * Math.sin(Math.PI * q) : 0);
        row.push([bf + (tf - bf) * k, 0, bu + (tu - bu) * k]); brow.push(trunkBone(bf)); }
      grid.push(row); bones.push(brow); }
    B.sheet({ grid, vertBones: (r, c) => bones[r][c], tone: (r, c) => { const k = r / (rows - 1), spine = low || c % 2 === 0; let col = lerpHex(C.sail, C.sailLight, k * .7); if (spine) col = lerpHex(col, C.sailDark, .45); if (r === 0) col = lerpHex(col, C.sailDark, .4); if (r === 1 && c % 4 === 1) col = lerpHex(col, C.stripe, .5); return col; } });
    // the spines' knobbed tips along the edge
    if (!low) for (let i = 0; i < n; i++) { const s = SAIL[i], bn = trunkBone(s[2])[0]; B.bone(bn).color(C.sailDark).ellipsoid({ at: at(bn, [s[2], 0, s[3]]), radius: [.016, .016, .02], rings: 2, seg: 5 }); }
  } else {
    // the fossil: vertebrae down the chain, bare sail spines, a ribcage, the pelvis
    const vert = (bone, p, r) => { B.bone(bone).color(C.joint).ellipsoid({ at: at(bone, p), radius: [r * .8, r * 1.15, r * 1.15], rings: 2, seg: low ? 4 : 6 }); B.bone(bone).color(C.bone).ellipsoid({ at: at(bone, [p[0] + r * .7, p[1], p[2]]), radius: [r * .7, r * 1.05, r], rings: low ? 2 : 3, seg: low ? 5 : 7 }); };
    for (let i = 0; i < BODY.length - 1; i += low ? 2 : 1) { const [f, u, , rz, a, b, w] = BODY[i], top = u + rz - (rz * 2) * .32; vert(w >= .5 ? b : a, [f, 0, i === 0 ? u : top], Math.max(.012, Math.min(.045, rz * .3))); }
    // the column itself, one thin bone through the vertebrae from the tail's tip to the skull
    if (!low) B.color(C.boneShade).loft({ seg: 5, minSeg: 4, sections: BODY.map(([f, u, , rz, a, b, w]) => ({ at: [f, 0, u + rz - rz * .64], rx: Math.max(.008, rz * .1), rz: Math.max(.008, rz * .1), bones: [a, b ?? a, w || 0] })) });
    for (let i = 0; i < SAIL.length; i++) { const s = SAIL[i], bn = trunkBone(s[0])[0], base = [s[0], 0, s[1] - .02], tip = [s[2], 0, s[3]], dx = tip[0] - base[0], dz = tip[2] - base[2], L = Math.hypot(dx, dz);
      B.bone(bn).color(C.bone).lathe({ at: at(bn, base), F: [dx / L, 0, dz / L], rings: [[0, .022], [L * .5, .014], [L, .008]], seg: low ? 4 : 5, caps: true });
      if (!low) B.bone(bn).color(C.boneShade).ellipsoid({ at: at(bn, tip), radius: [.014, .014, .014], rings: 2, seg: 4 }); }
    // ribs: arcs from the spine round to the belly, both sides (blended between the trunk bones by where they hang)
    const nr = low ? 4 : full ? 8 : 6;
    for (let i = 0; i < nr; i++) { const f = -.12 + .5 * i / (nr - 1), b = bodyAt(f), tb = trunkBone(f), spineU = b.u + b.rz * .4;
      for (const s of [-1, 1]) {
        const pts = [[f, s * .03, spineU], [f - .03, s * b.rx * .95, spineU - .07], [f - .07, s * b.rx * .92, b.u - b.rz * .35], [f - .1, s * b.rx * .45, b.u - b.rz * .92], [f - .1, s * .04, b.u - b.rz * .98]];
        B.color(i % 2 ? C.boneShade : C.bone).loft({ seg: low ? 3 : 4, minSeg: 3, sections: pts.filter((_, j) => !low || j % 2 === 0).map((p, j) => ({ at: p, rx: j === 0 ? .016 : .011, rz: j === 0 ? .016 : .011, bones: tb })) }); } }
    // the pelvis: the blade over the hips, the pubis's boot reaching down and forward, the ischium back
    B.bone('pelvis').color(C.bone).ellipsoid({ at: [.0, 0, .06], radius: [.16, .1, .07], rings: low ? 3 : 4, seg: low ? 6 : 8 });
    for (const [F, len, r] of [[[.45, 0, -.9], .26, .03], [[-.6, 0, -.8], .22, .025]]) B.bone('pelvis').color(C.boneShade).lathe({ at: [0, 0, .0], F, rings: [[0, r], [len * .8, r * .8], [len, r * 1.3]], seg: low ? 4 : 6, caps: true });
    // the spears (hidden until they grow): long barbed bone points along each spear bone's f
    for (const tag of ['L', 'R']) for (const k of ['0', '1']) { const bn = 'spear' + k + tag;
      B.bone(bn).color(C.bone).lathe({ at: [0, 0, 0], F: [1, 0, 0], rings: [[0, .028], [.12, .036], [R.spear * .75, .018], [R.spear, .002]], seg: low ? 4 : 6, caps: true });
      if (!low) for (const q of [.35, .55]) B.bone(bn).color(C.boneShade).lathe({ at: [R.spear * q, 0, .02], F: [-.7, 0, .7], rings: [[0, .012], [.07, 0]], seg: 3, caps: false }); }
  }
  head(B, low, fossil);
  // legs: the thigh a heavy drumstick grown out of the haunch: its upper sections stay inside the flank (held to the pelvis), and
  // it swells to its full girth only where it leaves the belly, so the join is under the body, in its shade, not a slab on its
  // side (Tim, 2026-11-12); a lean shin, the metatarsus, three clawed toes forward
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const top = bwOf('thigh' + tag), J = ['thigh', 'shin', 'meta', 'foot'].map((n) => bwOf(n + tag)[2]), hAt = (g) => g <= 0 ? J[0] - g * (J[0] - J[1]) : g >= 3 ? J[3] : J[Math.floor(g)] + (J[Math.floor(g) + 1] - J[Math.floor(g)]) * (g - Math.floor(g));
    const nm = (c) => c === 'p' ? 'pelvis' : c === 't' ? 'thigh' + tag : c === 'm' ? 'shin' + tag : 'meta' + tag;
    const prof = fossil
      ? [[0, .045, .05, 0, 't'], [.5, .035, .04, 0, 't'], [1, .04, .045, 0, 't', 'm', .5], [1.5, .028, .03, 0, 'm'], [2, .032, .034, 0, 'm', 'l', .5], [2.5, .022, .024, 0, 'l'], [3, .024, .026, 0, 'l']]
      : [[-.25, .04, .08, -.02, 'p'], [.05, .06, .12, 0, 'p', 't', .35], [.35, .062, .13, .02, 't', 'p', .12], [.62, .1, .14, .02, 't'], [1, .06, .07, 0, 't', 'm', .5], [1.3, .055, .065, -.01, 'm'], [1.8, .042, .048, 0, 'm'], [2, .042, .045, 0, 'm', 'l', .5], [2.5, .036, .04, 0, 'l'], [3, .038, .042, 0, 'l']];
    const keep = low ? (fossil ? [0, 2, 4, 6] : [0, 1, 3, 4, 6, 7, 9]) : null;
    B.color(fossil ? C.bone : C.body).loft({ seg: low ? 6 : fossil ? 6 : 12, up: [1, 0, 0], sections: prof.filter((_, i) => !keep || keep.includes(i)).map(([g, rx, rz, fw, a, b, w]) => ({ at: [top[0] + fw, top[1] + s * (fossil ? 0 : g < 0 ? -.03 : 0), hAt(g)], rx, rz, bones: [nm(a), nm(b ?? a), w || 0] })),
      tone: fossil ? undefined : (i, k) => { const g = prof[keep ? keep[i] : i][0]; return g >= 1.9 ? C.dark : g < .8 && hash(i + k * 3, 9 + s) > .7 ? C.m1 : lerpHex(C.body, C.dark, clamp01((g - .5) * .3)); } });
    if (fossil) for (const n of ['shin', 'meta']) B.bone(n + tag).color(C.joint).ellipsoid({ at: [0, 0, 0], radius: [.035, .035, .035], rings: 2, seg: 5 });
    const fb = 'foot' + tag;
    for (const c of low ? [0] : [-1, 0, 1]) {
      B.bone(fb).color(fossil ? C.boneShade : C.dark).lathe({ at: [-.01, c * .035, -.01], F: [1, c * .35, -.1], rings: [[0, .028], [.1, .02]], seg: low ? 4 : 5, caps: true });
      B.bone(fb).color(C.claw).lathe({ at: [.09, c * .035 * 1.35, -.015], F: [1, c * .3, -.5], rings: [[0, .016], [.06, 0]], seg: 4, caps: false });
    }
  }
  // arms: muscular, a bulging upper arm and a thick forearm, the hand with three big hooked claws (the thumb's the longest)
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const top = bwOf('arm' + tag), J = ['arm', 'fore', 'hand'].map((n) => bwOf(n + tag)[2]), hAt = (g) => g <= 0 ? J[0] - g * (J[0] - J[1]) : g >= 2 ? J[2] : J[Math.floor(g)] + (J[Math.floor(g) + 1] - J[Math.floor(g)]) * (g - Math.floor(g));
    const nm = (c) => c === 'p' ? 'chest' : c === 't' ? 'arm' + tag : 'fore' + tag;
    const prof = fossil ? [[0, .03, .032, 't'], [.5, .022, .024, 't'], [1, .026, .028, 't', 'm', .5], [1.5, .02, .022, 'm'], [2, .022, .024, 'm']]
      : [[-.3, .07, .09, 'p'], [0, .1, .12, 'p', 't', .5], [.35, .105, .12, 't'], [.75, .08, .09, 't'], [1, .06, .065, 't', 'm', .5], [1.35, .068, .072, 'm'], [2, .05, .052, 'm']];
    B.color(fossil ? C.bone : C.body).loft({ seg: low ? 6 : 9, up: [1, 0, 0], sections: prof.filter((_, i) => !low || i % 2 === 0 || i === prof.length - 1).map(([g, rx, rz, a, b, w]) => ({ at: [top[0], top[1], hAt(g)], rx, rz, bones: [nm(a), nm(b ?? a), w || 0] })),
      tone: fossil ? undefined : (i) => i > 4 ? C.dark : i === 2 ? C.m1 : C.body });
    if (fossil) B.bone('fore' + tag).color(C.joint).ellipsoid({ at: [0, 0, 0], radius: [.03, .03, .03], rings: 2, seg: 5 });
    const hb = 'hand' + tag;
    B.bone(hb).color(fossil ? C.boneShade : C.dark).ellipsoid({ at: [.02, 0, -.03], radius: [.05, .035, .04], rings: 3, seg: low ? 5 : 7 });
    for (let c = 0; c < (low ? 2 : 3); c++) { const len = c === 0 ? .14 : .1, off = (c - 1) * .025;
      B.bone(hb).color(C.claw).lathe({ at: [.05, off * s + (c === 0 ? -s * .02 : 0), -.05], F: [.55, 0, -.85], rings: [[0, .018], [len * .55, .012], [len, 0]], seg: 4, caps: false }); }
  }
  // the shed's pieces of hide (fossil only, drawn only while it sheds): torn slabs of the flesh's colours over the bones
  if (fossil) {
    B.mark();
    for (const [name, , nrm, rad, tone] of CHUNKS) {
      const col = tone === 'sail' ? C.sail : tone === 'mottle' ? C.m1 : C.light, n = nrm, along = [1, 0, 0], bn = 'chunk' + name;
      // each piece a torn slab of hide (raw beneath) with a smaller, mottled scrap torn with it
      for (const [df, sc, c2] of [[0, 1, col], [rad[0] * 1.1, .6, tone === 'sail' ? C.sailDark : C.m0]]) {
        B.bone(bn).color(c2).ellipsoid({ at: [df, 0, df ? rad[2] * .3 : 0], radius: [rad[0] * G_CHUNK * sc, rad[1] * G_CHUNK * sc * (df ? .8 : 1), rad[2]], rings: low ? 3 : 4, seg: low ? 6 : 9, F: along, U: n });
        if (!low) B.bone(bn).color(C.gum).ellipsoid({ at: [df - n[0] * rad[2] * .6, -n[1] * rad[2] * .6, -n[2] * rad[2] * .6], radius: [rad[0] * G_CHUNK * .7 * sc, rad[1] * G_CHUNK * .7 * sc, rad[2] * .5], rings: 2, seg: 6, F: along, U: n });
      }
    }
  }
  return B.done();
}
const MESHES = new Map();
function meshFor(tier, fossil) { const k = (fossil ? 'bone:' : 'hide:') + tier; let m = MESHES.get(k); if (!m) { m = buildSpinoMesh(tier, fossil); MESHES.set(k, m); } return m; }
// the body this foe shows: the hide, or (once it has turned and past the first moment of the shed) the bones
export function spinoShowsFossil(e) { return !!e?.spinoFossil && spinoFossilShare(e) >= R.shedSwitch; }
export function spinoMesh(tier = 'full', e = null) { return meshFor(tier, spinoShowsFossil(e)); }
export function spinoHideMesh(tier = 'full') { return meshFor(tier, false); }
export function spinoBoneMesh(tier = 'full') { return meshFor(tier, true); }

// ------------------------------------------------------------------------------------------------ track
export function createSpinoTrack() {
  return { pose: createPose(SPINO_SKELETON), gait: createGait([{ side: -.13, phase: .5 }, { side: .13, phase: 0 }]),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(NK), shown: new Float64Array(NK), poseName: '', poseAt: -Infinity,
    hp: NaN, hitAt: -Infinity, hitSide: 1, airWas: 0, landAt: -Infinity, impactAt: -Infinity, contactWas: 0, deathAt: null, deathDir: 1, x: 0, y: 0, z: 0, speed: 0, run: 0,
    frame: { kind: 'spinoRex', tier: 'full', mesh: null, skin: null, boneCount: SPINO_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false } };
}
const V = new Float64Array(NK), W = new Float64Array(NK), D = new Float64Array(NK);
const H = new Float64Array(3), T = new Float64Array(3), J = new Float64Array(3), POLE = new Float64Array(3), LEGB = new Int16Array(4), LENS = new Float64Array(3), Q = [0, 0, 0], Q2 = [0, 0, 0];
const CONTACT = new Set(['bite', 'clawL', 'clawR', 'headSlam', 'plough', 'landBite', 'tailL', 'tailR', 'grabLunge', 'ribsThrust', 'roar']);

export function sampleSpino(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(6, Number(env.scale) || 1)), P = tr.pose, G = R;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  const dxm = env.x - tr.gait.x, dym = env.y - tr.gait.y, sp = Number.isFinite(dxm) && dt > 0 ? Math.hypot(dxm, dym) / dt / S : 0; tr.speed += (sp - tr.speed) * Math.min(1, dt * 8);
  // the pose the game names, its anticipation through the windup
  const name = dead ? 'death' : e.spinoPose || 'idle';
  if (name !== tr.poseName) { tr.poseName = name; tr.poseAt = now; }
  const strike = dead ? 1 : spinoStrike(e, reduce ? Infinity : now - tr.poseAt);
  spinoPoseVector(name, strike, V);
  const running = !dead && (V[KI.run] > .5 || (!e.pack?.attack && tr.speed > G.runSpeed / Math.max(1, S)));
  // facing: at the target through an attack (unless it runs), where it goes on the move, at the Wayfarer when it stands
  let want = tr.yaw; const aim = e.pack?.data?.aim;
  if (e.pack?.attack && aim && Math.hypot(aim.x, aim.y) > .01 && name !== 'run') want = Math.atan2(aim.y, aim.x);
  else if (Number.isFinite(dxm) && Math.hypot(dxm, dym) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dym, dxm);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate;
    let turn = Math.max(-1, Math.min(1, dt * rate)) * delta; if (!e.pack?.attack && tr.gait.moving < .1) turn = Math.max(-G.standTurnMax * dt, Math.min(G.standTurnMax * dt, turn)); tr.yaw += turn; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // blend between poses (a strike's own anticipation is already in the vector)
  const key = dead ? 'death' : name;
  if (tr.key === '' || !(gapMs <= G.blendMs * 4)) { tr.shown.set(V); tr.from.set(V); tr.key = key; tr.blendAt = -Infinity; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  // a strike that has begun follows its own clock at once (the windup's anticipation into the blow)
  for (let k = 0; k < NK; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  if (blend >= 1) tr.from.set(V);
  W.set(tr.shown);
  const stun = dead ? 0 : clamp01(Number(e.poiseBreak) || 0);
  if (stun > 0) { spinoPoseVector('dazed', 1, D); for (let k = 0; k < NK; k++) W[k] += (D[k] - W[k]) * stun; }
  // impact: a jolt through the body on a blow; a hit: a flinch away from it
  const contact = CONTACT.has(name) && strike > .9 ? 1 : 0;
  if (contact && !tr.contactWas) tr.impactAt = now; tr.contactWas = contact;
  const impT = (now - tr.impactAt) / 1000, impact = !reduce && impT < G.impactMs / 1000 ? kick(impT, 20, 9) : 0;
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = !reduce && hitT < G.hitMs / 1000 ? kick(hitT, 16, 10) : 0;
  const air = dead ? 0 : Math.max(0, Number(e.spinoAir) || 0);
  if (tr.airWas > .15 && air <= .15) tr.landAt = now; tr.airWas = air;
  const landT = (now - tr.landAt) / 1000, land = !reduce && landT < G.landMs / 1000 ? Math.max(0, kick(landT, 9, 7)) : 0;
  W[KI.crouch] += .12 * land + .03 * Math.abs(impact); W[KI.pitch] -= .06 * impact;
  // gait
  tr.run += ((running ? 1 : 0) - tr.run) * Math.min(1, dt * 6);
  const gs = running ? G.run : G.walk;
  for (let k = 0; k < 2; k++) tr.gait.side[k] = (k ? 1 : -1) * G.halfWidth * S;
  const still = (!!e.pack?.attack && !running && name !== 'lunge' && name !== 'grabLunge') || air > .1 || dead || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: gs.stride * S, stance: gs.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  // the shed: the share of the hide gone, a tremble through the first moment of it
  const share = spinoFossilShare(e), bones = spinoShowsFossil(e), shedding = !!e.spinoFossil && share < 1 && !dead;
  const tremble = (shedding && !reduce ? (1 - share) * .025 : 0) + (W[KI.shake] > .05 && !reduce ? W[KI.shake] * .012 : 0);
  resetPose(P);
  let alpha = e.fleeFade != null ? clamp01(e.fleeFade) : 1, roll = 0, sink = 0;
  if (dead) { if (death < 1e-9 || tr.deathDir === 0) { const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.deathDir = (px - e.x) * -sf + (py - e.y) * cf > 0 ? -1 : 1; }
    sink = smooth(death / .35); roll = 1.35 * easeIn(span(death, .2, .55)) * tr.deathDir; alpha *= 1 - span(death, .82, 1); }
  setEuler(P, BI.root, yaw, 0, roll); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z + air * (1 - sink) + (dead ? .12 * S * span(death, .2, .55) : 0));
  const breathe = reduce ? 0 : Math.sin(t * 2.1);
  const bob = moving * G.bob * (1 + tr.run * 1.5) * (.5 - .5 * Math.cos(cyc * 2)), sway = reduce ? 0 : moving * .012 * Math.sin(cyc);
  const shiver = tremble ? tremble * Math.sin(t * G.tremble) : 0;
  setOffset(P, BI.pelvis, W[KI.lean] * .12, sway, -W[KI.crouch] * .2 - bob - .14 * sink + W[KI.tuck] * .05);
  setEuler(P, BI.pelvis, (reduce ? 0 : -moving * .04 * Math.sin(cyc)) + .2 * hit * tr.hitSide, -W[KI.pitch] * .8 + .08 * hit + tr.run * .06, -sway * 1.2 + shiver); resolveBone(P, BI.pelvis);
  // the tail: heavy, never still, swung through a swipe, raised or dropped with the body
  for (let i = 0; i < TAIL; i++) { const wave = reduce ? 0 : Math.sin(t * 1.4 - i * .55) * (.04 + .02 * i) * (1 - .5 * moving) + moving * .05 * Math.sin(cyc - i * .4);
    setEuler(P, BI['tail' + i], wave + W[KI.tailSide] * (.32 - .02 * i) - .25 * hit * tr.hitSide, (i === 0 ? W[KI.pitch] * .5 - W[KI.tailUp] * .2 + .1 * sink : -W[KI.tailUp] * .1 + .02 * tr.run) + (i ? .02 : 0), 0); resolveBone(P, BI['tail' + i]); }
  setEuler(P, BI.spine, reduce ? 0 : -moving * .03 * Math.sin(cyc), -W[KI.pitch] * .1, 0); resolveBone(P, BI.spine);
  setEuler(P, BI.chest, -W[KI.swing] * .1, -W[KI.pitch] * .1 + W[KI.lean] * .1, 0); P.scl[BI.chest] = 1 + breathe * .008; resolveBone(P, BI.chest);
  let look = 0; if (env.target && !dead && !contact && name !== 'run') { const a = Math.atan2(env.target.y - e.y, env.target.x - e.x) - yaw; look = Math.max(-.6, Math.min(.6, Math.atan2(Math.sin(a), Math.cos(a)))) * .6; }
  // the neck rises from the shoulders (raised, stretched out in a reach, bowed to the ground for the plough and the dig)
  const low = W[KI.low], dig = clamp01(W[KI.dig] * Math.max(.4, Math.min(1, Number(e.spinoDig) || (W[KI.dig] > .5 ? 1 : 0))));
  const neckP = -W[KI.neck] * .42 + W[KI.reach] * .3 + low * .7 + (reduce ? 0 : moving * .03 * Math.sin(cyc * 2));
  setEuler(P, BI.neck0, look * .3 - W[KI.swing] * .3, neckP * .6 - W[KI.pitch] * .1, 0); setOffset(P, BI.neck0, W[KI.reach] * .04, 0, 0); resolveBone(P, BI.neck0);
  setEuler(P, BI.neck1, look * .35 - W[KI.swing] * .45, neckP * .5, 0); setOffset(P, BI.neck1, W[KI.reach] * .05, 0, -W[KI.reach] * .02); resolveBone(P, BI.neck1);
  // the head: its own pitch from the pose, aimed down at the ground for the plough and the dig (in world terms, whatever the neck did)
  let headP = .2 - W[KI.head] * .75 - W[KI.neck] * .1 - W[KI.reach] * .35 + (reduce ? 0 : .02 * wobble(t * .8, 3));
  { const ni = BI.neck1 * 9, sc = Math.hypot(P.wr[ni], P.wr[ni + 1], P.wr[ni + 2]) || 1, neckPitch = Math.asin(Math.max(-1, Math.min(1, -P.wr[ni + 2] / sc)));
    if (low > .02) { const want2 = dig > .3 ? G.digHead : G.ploughHead; headP += (-(want2) - neckPitch - headP) * clamp01(low); } }
  setEuler(P, BI.head, look * .3 - W[KI.swing] * .35, headP, W[KI.swing] * .25); resolveBone(P, BI.head);
  const chew = W[KI.chew] > .05 ? (reduce ? .5 : .5 + .5 * Math.sin(t * G.chew)) * W[KI.chew] : 0;
  const open = Math.max(0, W[KI.open] - chew * .28 + (reduce ? 0 : W[KI.shake] * .04 * Math.sin(t * G.tremble)));
  setEuler(P, BI.jaw, 0, open * .85, 0); resolveBone(P, BI.jaw);
  // the arms: the hands to their places in the body's frame (two-bone IK), elbows back; a slash cocks a hand high then rakes it down
  const ri = BI.chest * 9, sc = Math.hypot(P.wr[ri], P.wr[ri + 1], P.wr[ri + 2]) || 1;
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    const ai = BI['arm' + tag]; H[0] = P.wp[ai * 3]; H[1] = P.wp[ai * 3 + 1]; H[2] = P.wp[ai * 3 + 2];
    const c = s < 0 ? W[KI.clawL] : W[KI.clawR], raise = W[KI.arms], swingA = reduce ? 0 : moving * .05 * Math.sin(cyc + (s > 0 ? 0 : Math.PI)) + .015 * wobble(t * .7, s);
    // the hand's place (chest frame: f, r, u from the shoulder)
    let hf = .2 + swingA + raise * .1 + (c < 0 ? -c * -.05 : c * .22), hr = s * (.04 + raise * .1), hu = -.28 + raise * .22 + (c < 0 ? -c * .42 : -c * .05);
    if (dead) { hf = .1; hu = -.3; }
    boneLocalToWorld(P, 'chest', 0, 0, 0, Q);
    for (let k = 0; k < 3; k++) T[k] = H[k] + (P.wr[ri + k] * hf + P.wr[ri + 3 + k] * hr + P.wr[ri + 6 + k] * hu) / sc * S;
    POLE[0] = -P.wr[ri] / sc * .6 + P.wr[ri + 3] / sc * s * .3; POLE[1] = -P.wr[ri + 1] / sc * .6 + P.wr[ri + 4] / sc * s * .3; POLE[2] = -P.wr[ri + 2] / sc * .6 - .4;
    solveTwoBone(H, T, G.upperArm * S, G.foreArm * S, POLE, J);
    aimWorld(P, ai, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], P.wr[ri] / sc, P.wr[ri + 1] / sc, P.wr[ri + 2] / sc); resolveBone(P, ai);
    const fi = BI['fore' + tag]; aimWorld(P, fi, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], P.wr[ri] / sc, P.wr[ri + 1] / sc, P.wr[ri + 2] / sc); resolveBone(P, fi);
    // the hand turns its claws forward and down, hooked through a slash
    const hk = c > 0 ? c * .6 : 0; setEuler(P, BI['hand' + tag], 0, -.3 + hk, 0); resolveBone(P, BI['hand' + tag]);
  }
  // the legs: planted feet; spread through a lunge; drawn up in the air; folded under it in death
  for (let k = 0; k < 2; k++) {
    const tag = k ? 'R' : 'L', s = k ? 1 : -1, top = BI['thigh' + tag];
    resolveBone(P, top); H[0] = P.wp[top * 3]; H[1] = P.wp[top * 3 + 1]; H[2] = P.wp[top * 3 + 2];
    let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], lift = tr.gait.out[k * 4 + 2], fz = env.z + G.foot * S + lift * G.footLift * S * (1 + tr.run);
    const spread = W[KI.stride] * (k ? .35 : -.3), tuck = Math.max(W[KI.tuck], air > .1 ? .6 : 0);
    if ((still && spread) || air > .1 || dead) {
      const fwd = .06 + spread + tuck * (k ? .14 : -.02);
      fx = x + (cf * fwd - sf * s * G.halfWidth) * S; fy = y + (sf * fwd + cf * s * G.halfWidth) * S;
      fz = Math.max(env.z + G.foot * S, H[2] - (G.thigh + G.shin + G.meta) * S * (1 - .4 * tuck));
      if (dead) { boneLocalToWorld(P, 'root', .05, s * G.halfWidth, G.foot, Q2); fx = Q2[0]; fy = Q2[1]; fz = Q2[2]; }
    } else if (spread) { fx += cf * spread * S; fy += sf * spread * S; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    LEGB[0] = top; LEGB[1] = BI['shin' + tag]; LEGB[2] = BI['meta' + tag]; LEGB[3] = BI['foot' + tag];
    LENS[0] = G.thigh * S; LENS[1] = G.shin * S; LENS[2] = G.meta * S;
    const bend = Math.min(1, lift * .9 + tuck), toe = lift > 0 || tuck > .05 ? -.5 * Math.max(lift, tuck) : 0;
    poseAnimalLeg(P, LEGB, H, T, LENS, cf, sf, true, bend, toe, -.25 - .5 * bend);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  // the fossil's rib spears: out of the ribcage to the sides as they grow, then all aimed at one point ahead of the chest
  const ribs = bones ? clamp01(W[KI.ribs]) : 0, thrust = clamp01(W[KI.thrust]);
  for (const [tag, s] of [['L', -1], ['R', 1]]) for (let j = 0; j < 2; j++) {
    const bi = BI['spear' + j + tag], o = G.spearOut[j], pi = SPINO_SKELETON.parent[bi] * 9, ps = Math.hypot(P.wr[pi], P.wr[pi + 1], P.wr[pi + 2]) || 1;
    resolveBone(P, bi);
    // out: the body frame's (f, r, u) direction to the side; thrust: toward the point ahead of the chest
    let dx = (P.wr[pi] * o[0] + P.wr[pi + 3] * o[1] * s + P.wr[pi + 6] * o[2]) / ps, dy = (P.wr[pi + 1] * o[0] + P.wr[pi + 4] * o[1] * s + P.wr[pi + 7] * o[2]) / ps, dz = (P.wr[pi + 2] * o[0] + P.wr[pi + 5] * o[1] * s + P.wr[pi + 8] * o[2]) / ps;
    if (thrust > 0) { boneLocalToWorld(P, 'chest', G.spearPoint[0], G.spearPoint[1], G.spearPoint[2], Q); const px = (Q[0] - P.wp[bi * 3]) / S, py = (Q[1] - P.wp[bi * 3 + 1]) / S, pz = (Q[2] - P.wp[bi * 3 + 2]) / S, l = Math.hypot(px, py, pz) || 1;
      const e2 = smooth(thrust); dx += (px / l - dx) * e2; dy += (py / l - dy) * e2; dz += (pz / l - dz) * e2; }
    aimWorld(P, bi, 0, dx, dy, dz, 0, 0, 1);
    // they grow to their full length (and to the point at the thrust)
    P.scl[bi] = Math.max(.001, smooth(ribs) * (1 + .25 * thrust)); resolveBone(P, bi);
  }
  // the shed's pieces: in place over the bones at first, then each tears away, falls and tumbles, and is gone
  for (let i = 0; i < CHUNKS.length; i++) {
    const bi = BI['chunk' + CHUNKS[i][0]], start = hash(i, 7) * G.chunkStagger, kk = shedding && bones ? clamp01((share - start) / .45) : 0;
    const show = shedding && bones && kk < 1;
    if (show) { const nrm = CHUNKS[i][2], fall = kk * kk * G.chunkFall * CHUNKS[i][1][2], out = kk * .3;
      setOffset(P, bi, W[KI.lean] * .12 + nrm[0] * out, nrm[1] * out, -W[KI.crouch] * .2 - fall);
      setEuler(P, bi, 0, (hash(i, 11) - .5) * G.chunkSpin * kk, (hash(i, 12) - .5) * G.chunkSpin * kk + nrm[1] * kk); }
    P.scl[bi] = show ? Math.max(.001, 1 - span(kk, .75, 1)) : .001; resolveBone(P, bi);
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1;
  F.emitK[0] = life * (bones ? (reduce ? 1.4 : 1.2 + .3 * Math.sin(t * 5)) : 1.15 + .3 * W[KI.shake]); F.emitK[1] = 0; F.emitK[2] = 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 0; F.emitA[3] = 0;
  F.tier = env.tier || 'full'; F.mesh = spinoMesh(F.tier, e); F.skin = P.skin; F.alpha = alpha;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air; F.shadow = 1 - Math.min(.6, air / (4 * S)); F.phase = e.pack?.attack ? `${e.pack.attack}:${e.pack.phase}:${name}` : dead ? 'death' : 'move';
  F.contact = contact; F.cloud = shedding && bones;
  return F;
}
export const spinoBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
