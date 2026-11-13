// The Briar Stag in Close View (release 890): the same beast as its standard-view art (briar-stag-render.ts, release 705/708:
// a stag as big as a cart-horse, its hide bark and its crown a thicket of antler and bramble hung with pale blossom, a moss mane
// and a bramble vine along the spine, green eyes, green fire on the crown in the Wild Hunt), as a solid skinned body on the
// shared beast rig (close-view-beast-rig.ts), animated from its real attack clocks (monster-pack.ts ATTACK_MODULES.stag*, STAG).
// Each blow reaches its contact pose on the tick the game resolves it: every antler hook and the toss on its cut tick, each
// stamp as the forehooves land, the bellow's push at the end of its wind-up, the leap's landing as it touches down. Nothing here
// changes timing, damage, reach or targeting.
//
// Body units u are the standard view's (a tile times the actor's scale). Read lazily: monster-pack.ts reaches close-view.ts,
// which loads this module before briar-stag-render.ts and monster-pack.ts have finished loading.
import { STAG_ART } from "./briar-stag-render.js?v=r930-7501a870d14e";
import { ATTACK_MODULES, BOSS_PACE, STAG } from "./monster-pack.js?v=r930-7501a870d14e";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, easeOut, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r930-7501a870d14e";

const hex = (s) => parseInt(s.slice(1), 16);
export const STAG_RIG = Object.freeze({
  // Tim set the Lightning Giant a quarter larger than its standard view (2026-11-11); the beasts share that Close View size.
  closeViewScale: 1.25,
  hip: .58, shoulder: .6, femur: .2, tibia: .23, hindCannon: .15, humerus: .2, radius: .22, foreCannon: .17, hoof: .035, halfWidth: .11,
  walk: Object.freeze({ stride: .6, stance: .62 }), gallop: Object.freeze({ stride: 1.6, stance: .38 }),
  settle: 6, stepAt: .08, stepTime: .26, standTurnRate: 2.6, standTurnMax: 1.7, footLift: .14, bob: .02, turnRate: 4.5, attackTurnRate: 10, blendMs: 140, deathMs: 2400, landMs: 520, hitMs: 320, impactMs: 380,
  breathe: Object.freeze({ rate: 1.6, chest: .012 }),
  // Body poses (after the standard view's POSES): rear (+ body pitch up about the hind hips), head (+ raises), swing (head
  // turned, + to its right), tuck (forelegs folded), squat (haunches dropped), open (mouth), crouch (whole body down), lean
  // (whole body pitched forward, + nose down).
  poses: Object.freeze({
    idle: { rear: 0, head: 0, swing: 0, tuck: 0, squat: 0, open: 0, crouch: 0, lean: 0 },
    lower: { rear: -.04, head: -.8, swing: 0, tuck: 0, squat: .15, open: 0, crouch: .04, lean: .05 },
    hookL: { rear: -.03, head: -.5, swing: -.75, tuck: 0, squat: .1, open: 0, crouch: .03, lean: .04 },
    hookR: { rear: -.03, head: -.4, swing: .75, tuck: 0, squat: .1, open: 0, crouch: .03, lean: .04 },
    loadL: { rear: -.02, head: -.75, swing: .55, tuck: 0, squat: .2, open: 0, crouch: .05, lean: 0 },
    loadR: { rear: -.02, head: -.75, swing: -.55, tuck: 0, squat: .2, open: 0, crouch: .05, lean: 0 },
    toss: { rear: .16, head: .5, swing: 0, tuck: .1, squat: 0, open: .3, crouch: -.02, lean: -.02 },
    tossLoad: { rear: -.06, head: -.95, swing: 0, tuck: 0, squat: .35, open: 0, crouch: .07, lean: .08 },
    charge: { rear: -.05, head: -.85, swing: 0, tuck: 0, squat: 0, open: 0, crouch: .02, lean: .08 },
    rear: { rear: .62, head: .35, swing: 0, tuck: .6, squat: .25, open: .5, crouch: 0, lean: 0 },
    stamp: { rear: -.08, head: -.25, swing: 0, tuck: 0, squat: .1, open: 0, crouch: .06, lean: .04 },
    shake: { rear: 0, head: .05, swing: .4, tuck: 0, squat: .05, open: 0, crouch: .02, lean: 0 },
    shakeB: { rear: 0, head: .05, swing: -.4, tuck: 0, squat: .05, open: 0, crouch: .02, lean: 0 },
    crouch: { rear: -.1, head: -.25, swing: 0, tuck: .35, squat: .75, open: 0, crouch: .12, lean: 0 },
    leap: { rear: .12, head: .2, swing: 0, tuck: 1, squat: 0, open: 0, crouch: 0, lean: 0 },
    fall: { rear: -.15, head: -.3, swing: 0, tuck: .2, squat: 0, open: 0, crouch: 0, lean: .1 },
    land: { rear: -.12, head: -.35, swing: 0, tuck: .3, squat: .7, open: 0, crouch: .12, lean: .05 },
    bellow: { rear: .2, head: .55, swing: 0, tuck: 0, squat: .2, open: 1, crouch: 0, lean: -.03 },
    mend: { rear: .14, head: .62, swing: 0, tuck: 0, squat: .1, open: 0, crouch: 0, lean: 0 },
    paw: { rear: -.03, head: -.6, swing: 0, tuck: 0, squat: .25, open: 0, crouch: .03, lean: 0 },
    dazed: { rear: -.06, head: -.55, swing: .2, tuck: 0, squat: .3, open: .2, crouch: .1, lean: .05 },
  }),
});
const PK = ['rear', 'head', 'swing', 'tuck', 'squat', 'open', 'crouch', 'lean'], K = PK.length;
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(STAG_RIG.poses).map(([n, p]) => [n, Float64Array.from(PK.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
const R = STAG_RIG;
export const STAG_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', at: [-.32, 0, R.hip] },
  { name: 'tail', parent: 'pelvis', at: [-.22, 0, .04] },
  { name: 'thighL', parent: 'pelvis', at: [0, -R.halfWidth, -.03] },
  { name: 'shinL', parent: 'thighL', at: [0, 0, -R.femur] },
  { name: 'hockL', parent: 'shinL', at: [0, 0, -R.tibia] },
  { name: 'hoofHL', parent: 'hockL', at: [0, 0, -R.hindCannon] },
  { name: 'thighR', parent: 'pelvis', at: [0, R.halfWidth, -.03] },
  { name: 'shinR', parent: 'thighR', at: [0, 0, -R.femur] },
  { name: 'hockR', parent: 'shinR', at: [0, 0, -R.tibia] },
  { name: 'hoofHR', parent: 'hockR', at: [0, 0, -R.hindCannon] },
  { name: 'spine', parent: 'pelvis', at: [.32, 0, .04] },
  { name: 'chest', parent: 'spine', at: [.3, 0, .0] },
  { name: 'armL', parent: 'chest', at: [0, -R.halfWidth, -.05] },
  { name: 'foreL', parent: 'armL', at: [0, 0, -R.humerus] },
  { name: 'kneeL', parent: 'foreL', at: [0, 0, -R.radius] },
  { name: 'hoofFL', parent: 'kneeL', at: [0, 0, -R.foreCannon] },
  { name: 'armR', parent: 'chest', at: [0, R.halfWidth, -.05] },
  { name: 'foreR', parent: 'armR', at: [0, 0, -R.humerus] },
  { name: 'kneeR', parent: 'foreR', at: [0, 0, -R.radius] },
  { name: 'hoofFR', parent: 'kneeR', at: [0, 0, -R.foreCannon] },
  { name: 'neck', parent: 'chest', at: [.08, 0, .2] },
  { name: 'neck2', parent: 'neck', at: [.15, 0, .09] },
  { name: 'head', parent: 'neck2', at: [.13, 0, .07] },
  { name: 'jaw', parent: 'head', at: [.08, 0, -.04] },
  { name: 'earL', parent: 'head', at: [-.04, -.06, .04] },
  { name: 'earR', parent: 'head', at: [-.04, .06, .04] },
  { name: 'antlerL', parent: 'head', at: [-.01, -.045, .06] },
  { name: 'antlerR', parent: 'head', at: [-.01, .045, .06] },
  { name: 'fire', parent: 'head', at: [0, 0, 0] },
]);
const BI = STAG_SKELETON.index;
const E_EYE = 1, E_FIRE = 3, E_BLOSSOM = 2;
const LEGS = [ // gait order: hind left, fore left, hind right, fore right
  { tag: 'HL', top: 'thighL', mid: 'shinL', low: 'hockL', hoof: 'hoofHL', hind: true, side: -1 },
  { tag: 'FL', top: 'armL', mid: 'foreL', low: 'kneeL', hoof: 'hoofFL', hind: false, side: -1 },
  { tag: 'HR', top: 'thighR', mid: 'shinR', low: 'hockR', hoof: 'hoofHR', hind: true, side: 1 },
  { tag: 'FR', top: 'armR', mid: 'foreR', low: 'kneeR', hoof: 'hoofFR', hind: false, side: 1 },
];
const WALK_PHASE = [0, .25, .5, .75], GALLOP_PHASE = [0, .55, .1, .65];

// ------------------------------------------------------------------------------------------------ the body
let PALETTE = null;
const palette = () => { const A = STAG_ART; return PALETTE ||= {
  // a shade lighter than the standard view's hide (Tim, 2026-11-11: "make his color a little bit lighter"), with pale dapples
  hide: 0x6f5840, hideDark: 0x4e3c2a, hideLight: 0x947658, speckle: 0xe2cfaa, bark: hex(A.bark), moss: hex(A.moss), mossLight: hex(A.mossLight), leaf: 0x4f7230, leafDark: 0x38521f,
  antler: hex(A.antler), antlerDark: hex(A.antlerDark), bramble: hex(A.bramble), thorn: hex(A.thorn), blossom: hex(A.blossom), blossomCore: hex(A.blossomCore),
  eye: hex(A.eye), fire: hex(A.fire), fireCore: hex(A.fireCore), muzzle: 0x3a2a1c, innerEar: 0xc9a888, hoof: 0x2a1d12, belly: 0x5a4632, throat: 0x8c7254,
}; };
// The crown (pass 1): a stag's antler in 3D, read from the standard view's branching fan. A main beam curves out, back and up
// from the skull, then forward at the top; a brow tine, a bez tine and a trez tine reach forward and up off it, and the beam
// ends in a crown of three tines. Tips collect for blossom and fire.
const BEAM = [[0, 0, 0], [-.03, .09, .06], [-.07, .17, .13], [-.09, .24, .2], [-.07, .29, .27], [-.02, .32, .32]];
const TINES = [[0, [.85, .2, .45], .13], [1, [.85, .3, .4], .12], [2, [.65, .35, .65], .11], [4, [.5, .45, .75], .09], [5, [-.1, .55, .8], .09], [5, [.6, .1, .8], .08]];
function antler(B, C, side, depth, tips) {
  const S = 1.15, P = (p) => [p[0] * S, p[1] * side * S, p[2] * S], seg = (a, b, w0, w1, tone, sides) => { const dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...dir);
    B.color(tone).lathe({ at: a, F: dir, U: [0, 0, 1], rings: [[0, w0], [l, w1]], seg: sides, caps: false }); };
  const pts = BEAM.map(P), n = pts.length - 1;
  for (let k = 0; k < n; k++) seg(pts[k], pts[k + 1], .03 - .0035 * k, .03 - .0035 * (k + 1), k < 2 ? C.antlerDark : C.antler, depth >= 2 ? 7 : 5);
  tips.push(pts[n]);
  TINES.forEach(([at, dir, len], i) => {
    if (depth < 2 && i % 2) return; if (depth < 1 && i > 2) return;
    const a = pts[at], d = [dir[0], dir[1] * side, dir[2]], l = Math.hypot(...d), e = [a[0] + d[0] / l * len * S, a[1] + d[1] / l * len * S, a[2] + d[2] / l * len * S];
    seg(a, e, .017, .006, C.antler, depth >= 2 ? 6 : 4); tips.push(e);
  });
  B.color(C.antlerDark).ellipsoid({ at: [0, 0, -.005], radius: [.035, .035, .025], rings: 2, seg: 7 }); // the burr
}
function buildStagMesh(tier) {
  const C = palette(), d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(STAG_SKELETON, d);
  const F = [1, 0, 0], U = [0, 0, 1], DOWN = [0, 0, -1];
  // The hide (Tim, 2026-11-11: "he just looks like ... a bunch of component like segments ... cobbled together"): one continuous
  // skin swept from the tail to the nose, through rump, haunch, flank, barrel, chest, withers, neck, skull and muzzle,
  // blended across the pelvis, spine, chest, neck and head bones, so the body bends as one animal. Bark mottling and the darker
  // belly are colours on that same skin, not separate parts.
  // the standard view's shading as hide colour, continuous (no patches): lighter along the back and over the haunch and
  // shoulder masses, a darker belly, and soft bark furrows running round the barrel
  const lerpHex = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
  const mott = (i, k, st) => {
    const muscle = Math.max(Math.exp(-((i - 4) ** 2) / 2), Math.exp(-((i - 9) ** 2) / 2)) * (1 - Math.min(1, Math.abs(st) / .7));
    const furrow = .5 + .5 * Math.sin(i * 2.6 + Math.sin(k * 1.3) * .8);
    let c = lerpHex(C.hide, C.hideLight, Math.max(0, (st - .2) / .8) * .9 + muscle * .55);
    c = lerpHex(c, C.hideDark, furrow * .3);
    // dapples: pale specks over the back and upper flanks of the body (not the neck)
    const h = (((i * 2654435761) ^ (k * 40503)) >>> 0) % 1000 / 1000;
    if (i >= 2 && i <= 10 && st > -.1 && st < .9 && h < .12) c = lerpHex(c, C.speckle, .35);
    return st < -.3 ? lerpHex(c, C.belly, Math.min(1, (-.3 - st) / .4)) : c;
  };
  // (Tim, 2026-11-11: "his belly is a little bit big ... like a hot dog"): a deep chest that tucks hard into a slim waist and
  // rises into the haunch, so the underline sweeps up; the back line stays level. The head is sculpted: a domed cranium, the
  // brow, a narrowing face and a fine muzzle.
  const BODY = [ // [f, u, half width, half height, bone a, bone b, weight on b]
    [-.575, .66, 0, 0, 'pelvis'], [-.55, .66, .06, .07, 'pelvis'], [-.5, .65, .11, .13, 'pelvis'], [-.42, .64, .145, .175, 'pelvis'],
    [-.32, .63, .155, .195, 'pelvis'], [-.2, .655, .14, .17, 'pelvis', 'spine', .45], [-.07, .67, .128, .152, 'spine'], [.06, .645, .14, .19, 'spine', 'chest', .35],
    [.18, .615, .152, .228, 'chest'], [.28, .62, .148, .232, 'chest'], [.37, .67, .124, .2, 'chest', 'neck', .3], [.43, .77, .098, .135, 'neck'],
    [.5, .86, .08, .1, 'neck', 'neck2', .5], [.57, .92, .068, .083, 'neck2'], [.63, .97, .064, .074, 'neck2', 'head', .6], [.68, 1.0, .064, .072, 'head'],
    [.725, 1.0, .058, .064, 'head'], [.77, .985, .047, .052, 'head'], [.81, .965, .038, .044, 'head'], [.845, .948, .031, .036, 'head'], [.875, .936, .025, .029, 'head'],
    [.898, .928, .017, .02, 'head'], [.91, .924, 0, 0, 'head']];
  B.color(C.hide).loft({ seg: low ? 10 : 16, sections: BODY.map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })),
    tone: (i, k, st) => i >= BODY.length - 3 ? (st > -.3 ? C.muzzle : C.hideDark) : i >= 11 && st < -.4 ? C.throat : mott(i, k, st), caps: false });
  // The mane (Tim, 2026-11-11: "a bunch of flowers and leaves ... growing along his back ... like a mane"): from the rump along
  // the spine and up the crest of the neck to the poll, leaves splayed to either side, moss tufts and pale blossoms through the
  // bramble, seated on the hide's top line and bound to the bone beneath so it moves with the body.
  { const top = (f) => { let a = BODY[1], b = BODY[BODY.length - 2]; for (let q = 1; q < BODY.length - 1; q++) if (BODY[q][0] <= f && BODY[q + 1][0] >= f) { a = BODY[q]; b = BODY[q + 1]; break; }
      const t = Math.max(0, Math.min(1, (f - a[0]) / ((b[0] - a[0]) || 1))); return a[1] + a[3] + (b[1] + b[3] - a[1] - a[3]) * t; };
    const boneAt = (f) => f < -.25 ? 'pelvis' : f < .1 ? 'spine' : f < .38 ? 'chest' : f < .52 ? 'neck' : 'neck2';
    const bw = STAG_SKELETON.bindWorld;
    const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
    const leaf = (bone, base, side, len, w, tone) => { // a two-sided leaf splayed out and back from the crest
      const d = [-.45, side * .7, .55], l = Math.hypot(...d), u = [d[0] / l, d[1] / l, d[2] / l], n = [-side * .2, .1 * side, 1];
      const tip = [base[0] + u[0] * len, base[1] + u[1] * len, base[2] + u[2] * len], mid = [base[0] + u[0] * len * .45, base[1] + u[1] * len * .45, base[2] + u[2] * len * .45];
      const sx = [-u[1] * w * side, u[0] * w * side, 0], pts = [base, [mid[0] + sx[0], mid[1] + sx[1], mid[2] + w * .4], tip, [mid[0] - sx[0], mid[1] - sx[1], mid[2] - w * .4]].map((p) => at(bone, p));
      void n; B.bone(bone).color(tone); B.poly(pts); B.poly(pts.slice().reverse()); };
    const bloom = (bone, c) => { // five flat petals round a core, both faces
      B.bone(bone).color(C.blossom, E_BLOSSOM); const r = .03;
      for (let q = 0; q < 5; q++) { const a0 = q / 5 * Math.PI * 2, a1 = a0 + .55, p = [c, [c[0] + Math.cos(a0) * r, c[1] + Math.sin(a0) * r, c[2] + .006], [c[0] + Math.cos(a1) * r, c[1] + Math.sin(a1) * r, c[2] + .006]].map((x) => at(bone, x)); B.poly(p); B.poly(p.slice().reverse()); }
      B.color(C.blossomCore, E_BLOSSOM).ellipsoid({ at: at(bone, [c[0], c[1], c[2] + .008]), radius: [.008, .008, .006], rings: 2, seg: 4 }); };
    // a mossy ridge along the crest that the leaves grow from (blended along the spine bones)
    if (!low) { const R2 = [[-.48, 'pelvis'], [-.3, 'pelvis'], [-.12, 'pelvis', 'spine', .5], [.06, 'spine', 'chest', .4], [.24, 'chest'], [.38, 'chest', 'neck', .4], [.5, 'neck', 'neck2', .5], [.62, 'neck2', 'head', .3]];
      B.color(C.moss).loft({ seg: 6, up: [0, 0, 1], sections: R2.map(([f, a, b, w], q) => ({ at: [f, 0, top(f) - .004], rx: q === 0 || q === R2.length - 1 ? .012 : .028, rz: .016, bones: [a, b ?? a, w || 0] })), tone: (q, k, st) => st > .3 ? C.mossLight : C.moss }); }
    const n = low ? 7 : full ? 26 : 16;
    for (let q = 0; q < n; q++) {
      const f = -.46 + q * (1.12 / (n - 1)), z = top(f) - .006, bone = boneAt(f), side = q % 2 ? 1 : -1, big = f > .35 ? .75 : 1;
      leaf(bone, [f, side * .012, z], side, (.075 + .02 * ((q * 7) % 3)) * big, .038 * big, q % 3 === 0 ? C.leafDark : q % 3 === 1 ? C.leaf : C.mossLight);
      if (!low) leaf(bone, [f + .02, -side * .01, z + .004], -side, .055 * big, .03 * big, q % 2 ? C.moss : C.leaf);
      if (q % (low ? 4 : 3) === 1) bloom(bone, [f, (q % 2 ? .02 : -.02), z + .03]);
    }
  }
  // Dapples (Tim, 2026-11-11: "make them a little speckled"): small pale discs seated on the hide over the back and upper flanks,
  // each on the body's surface and bound to the bone beneath (crisp, where a coloured vertex would only smear).
  { const nSp = low ? 0 : full ? 34 : 18, bw = STAG_SKELETON.bindWorld;
    const sec = (f) => { for (let q = 1; q < BODY.length - 1; q++) if (BODY[q][0] <= f && BODY[q + 1][0] >= f) { const a = BODY[q], b = BODY[q + 1], t = (f - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } return BODY[4].slice(1, 4); };
    for (let q = 0; q < nSp; q++) {
      const h1 = ((q * 2654435761) >>> 0) % 1000 / 1000, h2 = ((q * 40503 + 977) >>> 0) % 1000 / 1000, f = -.4 + h1 * .66, side = q % 2 ? 1 : -1, th = (.18 + h2 * .52) * Math.PI;
      const [cu, rx, rz] = sec(f), ct = Math.cos(th) * side, st = Math.sin(th), bone = f < -.25 ? 'pelvis' : f < .1 ? 'spine' : 'chest', bi = BI[bone] * 3;
      const nrm = [0, ct / rx, st / rz], nl = Math.hypot(...nrm), n = [0, nrm[1] / nl, nrm[2] / nl], c = [f, ct * rx * 1.006, cu + st * rz * 1.006];
      const r = .011 + .008 * h2, t1 = [1, 0, 0], t2 = [0, -n[2], n[1]], pts = [];
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; pts.push([c[0] + (t1[0] * Math.cos(a) + t2[0] * Math.sin(a)) * r * 1.3 - bw[bi], c[1] + (t2[1] * Math.sin(a)) * r - bw[bi + 1], c[2] + (t2[2] * Math.sin(a)) * r - bw[bi + 2]]); }
      B.bone(bone).color(C.speckle); const nn = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]], mm = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]];
      const fn = [nn[1] * mm[2] - nn[2] * mm[1], nn[2] * mm[0] - nn[0] * mm[2], nn[0] * mm[1] - nn[1] * mm[0]];
      B.poly(fn[0] * n[0] + fn[1] * n[1] + fn[2] * n[2] >= 0 ? pts : pts.slice().reverse());
    }
  }
  B.bone('tail').color(C.hideDark).lathe({ at: [-.02, 0, 0], F: [-.6, 0, .8], rings: [[0, .035], [.05, .04], [.09, 0]], seg: 6 });
  // The bramble vine along the back with thorns raking backward (pelvis to withers).
  const vine = (bone, pts) => { if (low) return; B.bone(bone); for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dir = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...dir);
    B.color(C.bramble).lathe({ at: a, F: dir, rings: [[0, .016], [l, .016]], seg: 5, caps: false });
    if (!low) B.color(C.thorn).lathe({ at: [(a[0] + b[0]) / 2, a[1], (a[2] + b[2]) / 2 + .01], F: [-.6, 0, .8], rings: [[0, .009], [.045, 0]], seg: 4, caps: false }); } };
  vine('pelvis', [[-.2, 0, .17], [-.1, .01, .19], [0, -.01, .19], [.1, 0, .2]]);
  vine('spine', [[-.12, 0, .17], [0, .01, .18], [.12, -.01, .18], [.24, 0, .19]]);
  vine('chest', [[-.06, 0, .21], [.04, .01, .23], [.12, 0, .2]]);
  // Neck: a tapered column, wide where it meets the shoulders, with a moss mane along its crest and a lighter throat.
  B.bone('neck'); for (let i = 0; i < (low ? 0 : 4); i++) { const f = -.04 + i * (low ? .1 : .055); B.color(i % 2 ? C.mossLight : C.moss).ellipsoid({ at: [f * .7 - .02, 0, .035 + f * .7], radius: [.05, .028, .03], rings: 3, seg: 6, F: [.7, 0, .7], U: [-.7, 0, .7] }); } // moss mane
  B.bone('neck2'); for (let i = 0; i < (low ? 0 : 3); i++) { const f = -.04 + i * .06; B.color(i % 2 ? C.moss : C.mossLight).ellipsoid({ at: [f * .85, 0, .04 + f * .5], radius: [.045, .025, .026], rings: 3, seg: 6, F: [.85, 0, .5], U: [-.5, 0, .85] }); }
  if (!low) B.color(C.mossLight).ellipsoid({ at: [-.08, 0, .1], radius: [.06, .035, .03], rings: 3, seg: 6, F: [.7, 0, .7], U: [-.7, 0, .7] }); // moss at the withers
  // Head: a long deer skull (brow, tapering muzzle, dark muzzle tip and nostrils), the brow ridge, glowing green eyes, ears.
  B.bone('head'); for (const s of [-1, 1]) {
    B.color(C.hideDark).ellipsoid({ at: [.055, s * .05, .03], radius: [.03, .014, .012], rings: 3, seg: 7, F: [1, s * .25, -.15] }); // brow over the eye
    B.color(C.eye, E_EYE).ellipsoid({ at: [.055, s * .058, .015], radius: [.016, .008, .011], rings: 3, seg: 6 });
  }
  if (!low) { const J = STAG_SKELETON.bindWorld, j = BI.jaw * 3, jx = J[j], jz = J[j + 2]; // the lower jaw, a smooth tapering loft
    B.color(C.hideDark).loft({ seg: 10, sections: [[-.04, .012, .03, .02], [.02, .004, .026, .017], [.07, -.004, .019, .013], [.11, -.01, .011, .008], [.125, -.012, 0, 0]].map(([f, u, rx, rz]) => ({ at: [jx + f, 0, jz + u], rx, rz, bones: ['jaw', 'jaw', 0] })), caps: false, tone: (i, k, st) => st > .3 ? C.hideDark : C.throat }); }
  for (const s of ['L', 'R']) {
    const side = s === 'R' ? 1 : -1;
    B.bone('ear' + s).color(C.hide).ellipsoid({ at: [-.02, side * .05, .02], radius: [.03, .06, .015], rings: 3, seg: 7, F: [0, side, .4], U: [-1, 0, 0] });
    if (!low) B.color(C.innerEar).ellipsoid({ at: [-.012, side * .05, .028], radius: [.018, .045, .006], rings: 3, seg: 6, F: [0, side, .4], U: [-1, 0, 0] });
  }
  // The crown: two antlers, bramble wound between tines, pale blossom on every third tip, green fire on the tips in the Hunt.
  const depth = full ? 2 : d >= .6 ? 1 : 0;
  for (const s of ['L', 'R']) {
    const side = s === 'R' ? 1 : -1, tips = []; B.bone('antler' + s); antler(B, C, side, depth, tips);
    if (!low) for (let i = 0; i + 2 < tips.length; i += 3) { const a = tips[i], b = tips[i + 2]; B.color(C.bramble).bolt({ points: [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 - .05], b], width: .006 }); }
    tips.forEach((p, i) => {
      if (i % 3 === 0) { // a blossom: five petals round a core
        const n = low ? 3 : 5; for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 + i; B.color(C.blossom, E_BLOSSOM).ellipsoid({ at: [p[0] + Math.cos(a) * .018, p[1], p[2] + Math.sin(a) * .018], radius: [.014, .014, .014], rings: 2, seg: 4 }); }
        B.color(C.blossomCore, E_BLOSSOM).ellipsoid({ at: p, radius: [.01, .01, .01], rings: 2, seg: 4 });
      }
      if (!low || i % 2 === 0) { B.bone('fire'); const base = boneOffset('antler' + s, 'head', p); // green flame tongues, shown in the Hunt
        B.color(C.fire, E_FIRE).lathe({ at: base, F: U, rings: [[0, .022], [.05, .018], [.11, 0]], seg: 5, caps: true });
        if (!low) B.color(C.fireCore, E_FIRE).lathe({ at: [base[0], base[1], base[2] + .005], F: U, rings: [[0, .011], [.06, 0]], seg: 4, caps: true });
        B.bone('antler' + s); }
    });
  }
  // Legs: each one limb of hide that starts inside the body and blends through hip or shoulder, stifle or elbow, hock or knee,
  // a muscled top tapering to a slim cannon, then the cloven hoof and its fetlock moss.
  const HIND = [[.6, .036, .055, 'p'], [.53, .05, .08, 'p', 't', .5], [.46, .066, .095, 't'], [.37, .046, .06, 't', 'm', .5], [.25, .033, .043, 'm'], [.14, .025, .031, 'm', 'l', .5], [.1, .02, .024, 'l'], [0, .018, .02, 'l'], [-.025, .02, .024, 'l']];
  const FORE = [[.6, .034, .05, 'p'], [.54, .045, .07, 'p', 't', .5], [.47, .05, .066, 't'], [.37, .036, .046, 't', 'm', .5], [.26, .03, .036, 'm'], [.16, .024, .03, 'm', 'l', .5], [.1, .019, .022, 'l'], [0, .018, .02, 'l'], [-.02, .02, .023, 'l']];
  for (const L of LEGS) {
    const at = STAG_SKELETON.bindWorld, top = BI[L.top] * 3, x = at[top], y = at[top + 1], parent = L.hind ? 'pelvis' : 'chest';
    const name = (c) => c === 'p' ? parent : c === 't' ? L.top : c === 'm' ? L.mid : L.low;
    B.color(C.hide).loft({ seg: 10, up: [1, 0, 0], sections: (L.hind ? HIND : FORE).map(([u, rx, rz, a, b, w]) => ({ at: [x + (L.hind && u > .4 ? .015 : 0), y, u], rx, rz, bones: [name(a), name(b ?? a), w || 0] })),
      tone: (i, k, st) => i >= 6 ? C.hideDark : i < 4 ? mott(L.hind ? 4 : 9, k, st) : lerpHex(C.hide, C.hideDark, .1 + .08 * (i - 3)) });
    const can = L.hind ? R.hindCannon : R.foreCannon;
    if (!low) B.bone(L.low).color(C.moss).ellipsoid({ at: [0, 0, -can + .012], radius: [.028, .028, .013], rings: 3, seg: 6 });
    for (const s of low ? [0] : [-1, 1]) B.bone(L.hoof).color(C.hoof).box({ at: [.012, s * .013, -.018], size: [.028, low ? .022 : .011, .018], bevel: 0, taper: .3, skew: .006 });
  }
  return B.done();
}
// Fire tips are made on the antler bone's frame but bound to the 'fire' bone (at the head origin): convert the point.
function boneOffset(from, to, p) { const a = STAG_SKELETON.bindWorld, i = BI[from] * 3, j = BI[to] * 3; return [p[0] + a[i] - a[j], p[1] + a[i + 1] - a[j + 1], p[2] + a[i + 2] - a[j + 2]]; }
const MESHES = { full: null, balanced: null, low: null };
export function stagMesh(tier = 'full') { return MESHES[tier] ||= buildStagMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createStagTrack() {
  return {
    pose: createPose(STAG_SKELETON),
    gait: createGait(LEGS.map((L, k) => ({ side: L.side * .11, fore: L.hind ? -.32 : .3, phase: WALK_PHASE[k] }))),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(K), shown: new Float64Array(K),
    hp: NaN, hitAt: -Infinity, hitSide: 1, airWas: 0, landAt: -Infinity, landHard: 0, impactAt: -Infinity, impactK: 0, contactWas: 0, beatSeq: -1, beatAt: -Infinity,
    deathAt: null, x: 0, y: 0, z: 0, deathDir: 1, gallop: 0,
    frame: { kind: 'briarStag', tier: 'full', mesh: null, skin: null, boneCount: STAG_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ what it is doing
const V = new Float64Array(K), W = new Float64Array(K);
const setVec = (o, n) => o.set(POSE_VEC[n] || POSE_VEC.idle);
function lerpVec(o, a, b, t) { const A = POSE_VEC[a] || POSE_VEC.idle, Bv = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) o[k] = A[k] + (Bv[k] - A[k]) * t; }
function lerpInto(o, b, t) { const Bv = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) o[k] += (Bv[k] - o[k]) * t; }
function phaseOf(pack, id) {
  const m = ATTACK_MODULES[id] || {}, dur = pack.phase === 'windup' ? (m.windup || .5) * (pack.paced ? BOSS_PACE.windup : 1) : pack.phase === 'active' ? m.active || 0 : m.recover || .5;
  return dur > 0 ? clamp01(1 - (Number(pack.t) || 0) / dur) : 1;
}
const ACT = { aim: false, aimX: 0, aimY: 0, watch: false, still: false, gallop: false, contact: 0, phase: '', paw: 0, shake: 0, beat: -1, beatK: 0, fire: 0, glow: 0, airTuck: 0 };
function act(e, tr, now, target) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, x = id ? phaseOf(s, id) : 0;
  ACT.aim = false; ACT.watch = false; ACT.still = !!id; ACT.gallop = false; ACT.contact = 0; ACT.phase = id ? `${id}:${ph}` : 'move'; ACT.paw = 0; ACT.shake = 0; ACT.beat = -1; ACT.beatK = 0; ACT.glow = 0; ACT.airTuck = 0;
  const aimAt = (px, py) => { const dx = px - e.x, dy = py - e.y, l = Math.hypot(dx, dy); if (l > .01) { ACT.aimX = dx / l; ACT.aimY = dy / l; ACT.aim = true; } };
  const aimDir = (a) => { if (a && Math.hypot(a.x, a.y) > .01) { const l = Math.hypot(a.x, a.y); ACT.aimX = a.x / l; ACT.aimY = a.y / l; ACT.aim = true; } };
  if (e.playing) { setVec(V, e.stagPose === 'lower' ? 'lower' : 'idle'); ACT.gallop = true; return; } // at play with the Stalker: it bounds round in a circle
  if (!id) { setVec(V, 'idle'); ACT.watch = true; return; }
  if (target && id !== 'stagCharge') aimAt(target.x, target.y);
  if (id === 'stagGore') {
    if (d.aim) aimDir(d.aim);
    const N = STAG.goreCuts;
    if (ph === 'windup') { lerpVec(V, 'idle', 'lower', smooth(x / .6)); if (x > .6) lerpInto(V, 'loadL', smooth(span(x, .6, 1))); ACT.contact = x > .98 ? 1 : 0; }
    else if (ph === 'active') {
      // cut k lands on its tick; between ticks: follow through the last hook, then load the next one (opposite side, or low for the toss)
      const k = d.cut || 0, last = k - 1, gap = STAG.goreGap, y = 1 - clamp01((d.next ?? 0) / gap);
      const hit = (c) => c === N - 1 ? 'toss' : c % 2 ? 'hookR' : 'hookL', load = (c) => c === N - 1 ? 'tossLoad' : c % 2 ? 'loadR' : 'loadL';
      if (last < 0) setVec(V, 'loadL');
      else if (k >= N) { setVec(V, 'toss'); lerpInto(V, 'idle', smooth(y)); }
      else { setVec(V, hit(last)); lerpInto(V, load(k), smooth(span(y, .25, .82))); if (y > .82) lerpInto(V, hit(k), easeIn(span(y, .82, 1))); }
      if (last >= 0 && y < .2) ACT.contact = 1; ACT.beat = k; ACT.beatK = k === N ? 1 : .6;
    } else { setVec(V, 'toss'); lerpInto(V, 'idle', smooth(x)); }
  } else if (id === 'stagCharge') {
    aimDir(d.aim);
    if (ph === 'windup') { lerpVec(V, 'idle', 'paw', smooth(x / .35)); if (x > .75) lerpInto(V, 'charge', smooth(span(x, .75, 1))); ACT.paw = x < .8 ? 1 : 0; }
    else if (ph === 'active') {
      if (d.mode === 'run') { setVec(V, 'charge'); ACT.gallop = true; ACT.still = false; ACT.contact = d.hit && !tr.chargeHitSeen ? 1 : 0; }
      else { setVec(V, 'lower'); ACT.still = false; } // wheeling round for the next rush
    } else lerpVec(V, 'charge', 'idle', smooth(x));
  } else if (id === 'stagStomp' || id === 'stagRoots' || id === 'stagCage' || id === 'stagGrove') {
    // rear up over the wind-up; the forehooves come down as it ends (stomp: and again at its second stamp)
    if (ph === 'windup') { lerpVec(V, 'idle', 'rear', smooth(x / .72)); if (x > .72 && x <= .84) ACT.paw = 0; if (x > .84) lerpInto(V, 'stamp', easeIn(span(x, .84, 1))); ACT.contact = x > .98 ? 1 : 0; }
    else if (ph === 'active' && id === 'stagStomp') {
      const y = 1 - clamp01((d.next ?? 0) / STAG.stompGap);
      if ((d.stamps || 0) < 2) { lerpVec(V, 'stamp', 'rear', smooth(span(y, .08, .7))); if (y > .78) lerpInto(V, 'stamp', easeIn(span(y, .78, 1))); }
      else setVec(V, 'stamp');
      ACT.beat = d.stamps || 0; ACT.beatK = 1;
    } else { setVec(V, 'stamp'); lerpInto(V, 'idle', smooth(span(x, .2, 1))); if (x < .1) ACT.contact = 1; }
  } else if (id === 'stagThorns') {
    if (ph === 'windup') { lerpVec(V, 'idle', 'lower', smooth(x)); V[1] = -.4 * smooth(x); }
    else if (ph === 'active') { setVec(V, (d.volley || 0) % 2 ? 'shake' : 'shakeB'); ACT.beat = d.volley || 0; ACT.beatK = .8; ACT.shake = 1; }
    else { setVec(V, 'shake'); lerpInto(V, 'idle', smooth(x)); }
  } else if (id === 'stagLeap') {
    if (ph === 'windup') { lerpVec(V, 'idle', 'crouch', smooth(x)); ACT.contact = 0; }
    else if (ph === 'active') {
      const st = d.stage;
      if (st === 'rise') { const y = 1 - clamp01((d.left ?? 0) / STAG.leapRise); lerpVec(V, 'crouch', 'leap', easeOut(clamp01(y * 2))); ACT.airTuck = 1; }
      else if (st === 'hang') { setVec(V, 'leap'); V[1] = -.35; ACT.airTuck = 1; } // looking down at the ground it will land on
      else { const y = 1 - clamp01((d.left ?? 0) / STAG.leapFall); lerpVec(V, 'leap', 'fall', smooth(y)); ACT.airTuck = 1 - y; }
    } else { setVec(V, 'land'); lerpInto(V, 'idle', smooth(span(x, .3, 1))); if (x < .08) ACT.contact = 1; }
  } else if (id === 'stagHunt' || id === 'stagBirds') {
    if (ph === 'windup') { lerpVec(V, 'idle', 'lower', smooth(x / .4)); if (x > .4) lerpInto(V, 'bellow', easeOut(span(x, .4, id === 'stagHunt' ? .97 : .9))); ACT.contact = id === 'stagHunt' && x > .97 ? 1 : 0; ACT.glow = x; }
    else if (ph === 'active') { setVec(V, 'bellow'); ACT.beat = d.birds || 0; ACT.beatK = .5; } // a call for each bird
    else { setVec(V, 'bellow'); lerpInto(V, 'idle', smooth(x)); }
  } else if (id === 'stagMend') {
    if (ph === 'windup') lerpVec(V, 'idle', 'mend', smooth(x)); else if (ph === 'active') { setVec(V, 'mend'); ACT.glow = 1; } else lerpVec(V, 'mend', 'idle', smooth(x));
  } else if (id === 'stagMire') {
    if (ph === 'windup') { lerpVec(V, 'idle', 'paw', smooth(x / .3)); ACT.paw = 1; } else { setVec(V, 'stamp'); lerpInto(V, 'idle', smooth(x)); }
  } else setVec(V, 'idle');
}

// ------------------------------------------------------------------------------------------------ the pose
const H = new Float64Array(3), T = new Float64Array(3), LEGBONES = new Int16Array(4), LENS = new Float64Array(3);
export function sampleStag(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(4, Number(env.scale) || 1)), P = tr.pose, G = STAG_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  if (!dead) act(e, tr, now, env.target);
  else { setVec(V, 'dazed'); ACT.aim = false; ACT.watch = false; ACT.still = true; ACT.gallop = false; ACT.contact = 0; ACT.phase = 'death'; ACT.paw = 0; ACT.shake = 0; ACT.beat = -1; ACT.glow = 0; ACT.airTuck = 0; }
  // facing: the blow's aim; else where it goes; standing, the Wayfarer
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let want = tr.yaw;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dy, dx);
  else if (ACT.watch && env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : (tr.gait.moving < .1 ? G.standTurnRate : G.turnRate) * (e.stagHunt > 0 ? 1.4 : 1); let turn = Math.max(-1, Math.min(1, dt * rate)) * delta; if (!e.pack?.attack && tr.gait.moving < .1) turn = Math.max(-G.standTurnMax * dt, Math.min(G.standTurnMax * dt, turn)); tr.yaw += turn; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // crossfade between acts (never across a contact: those live inside an act's timeline)
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}:${e.pack.data?.mode || ''}:${e.pack.data?.stage || ''}` : e.playing ? 'play' : dead ? 'death' : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs)) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < K; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  W.set(tr.shown);
  // beats inside an act (each hook, stamp, thorn volley or call): the rising edge starts a short kick
  if (ACT.beat >= 0 && ACT.beat !== tr.beatSeq) { tr.beatSeq = ACT.beat; tr.beatAt = now; tr.beatK = ACT.beatK; } else if (ACT.beat < 0) tr.beatSeq = -1;
  const beatT = (now - tr.beatAt) / 1000, beat = beatT < .4 ? kick(beatT, 20, 9) * (tr.beatK || .5) : 0;
  if (ACT.shake && !reduce) W[2] += .5 * beat; // the thorn volley's head-whip
  else { W[6] += .03 * Math.abs(beat); W[0] -= .05 * beat; }
  if (ACT.contact && !tr.contactWas) { tr.impactAt = now; tr.impactK = /Stomp|Roots|Cage|Grove|Leap/.test(ACT.phase) ? 1 : .6; }
  tr.contactWas = ACT.contact;
  const impT = (now - tr.impactAt) / 1000, impact = impT < G.impactMs / 1000 ? kick(impT, 22, 9) * tr.impactK : 0;
  W[6] += .03 * Math.abs(impact); W[1] -= .12 * impact;
  if (e.pack?.data?.hit) tr.chargeHitSeen = true; else tr.chargeHitSeen = false;
  // hits, landings, stagger
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const air = dead ? 0 : Math.max(0, Number(e.stagAir) || 0) + (e.playing ? Math.max(0, Number(e.hopLift) || 0) * .5 : 0);
  if (tr.airWas > .1 && air <= .1) { tr.landAt = now; tr.landHard = Math.min(1, tr.airWas / 2 + .3); }
  tr.airWas = air;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 16, 10) : 0;
  W[2] -= .4 * hit * tr.hitSide; W[1] += .25 * hit; W[6] += .03 * Math.abs(hit);
  const landT = (now - tr.landAt) / 1000, land = landT < G.landMs / 1000 ? Math.max(0, kick(landT, 8, 6)) * tr.landHard : 0;
  W[4] += .7 * land; W[6] += .08 * land; W[1] -= .3 * land;
  const stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0) { const dz = POSE_VEC.dazed; for (let k = 0; k < K; k++) W[k] += (dz[k] - W[k]) * stun; }
  const daze = stun > 0 && !reduce ? stun * Math.sin(t * 3.6) : 0;
  // gait: walk, or a gallop in the rush and at play (feet planted by distance travelled; stepped round when it turns)
  const gallop = ACT.gallop && !dead; tr.gallop += ((gallop ? 1 : 0) - tr.gallop) * Math.min(1, dt * 8);
  const gs = gallop ? G.gallop : G.walk, phases = gallop ? GALLOP_PHASE : WALK_PHASE;
  for (let k = 0; k < 4; k++) { tr.gait.offsets[k] = phases[k]; tr.gait.side[k] = LEGS[k].side * (G.halfWidth + .01) * S; tr.gait.fore[k] = (LEGS[k].hind ? -.3 : .3) * S; }
  const still = (ACT.still && !gallop) || air > .1 || dead || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: gs.stride * S, stance: gs.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime, maxStepping: 2 });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  // root
  resetPose(P);
  let rootZ = env.z + air, alpha = 1, roll = 0;
  if (e.fleeFade != null) { alpha = clamp01(e.fleeFade); }
  if (dead) { // the forelegs fold, it sinks onto its chest, then rolls onto its side
    const kneel = smooth(death / .3), sideFall = easeIn(span(death, .25, .55)), bounce = death > .55 ? Math.max(0, kick((death - .55) * G.deathMs / 1000, 10, 6)) * .06 : 0;
    W[6] += .18 * kneel; W[0] -= .12 * kneel; W[1] = -.3 * kneel - .5 * sideFall; roll = (1.35 * sideFall - bounce) * tr.deathDir; alpha *= 1 - span(death, .82, 1);
    if (death < 1e-9) { const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.deathDir = (px - e.x) * -sf + (py - e.y) * cf > 0 ? -1 : 1; }
  }
  setEuler(P, BI.root, yaw, 0, roll); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, rootZ);
  // pelvis: the hind hips pivot for the rear; squat drops the haunches; the gait bobs and rolls; breathing
  const breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe.rate / 3);
  const bob = moving * G.bob * (1 + tr.gallop * 1.5) * (.5 - .5 * Math.cos(cyc * 2)), sway = moving * .012 * Math.sin(cyc) * (1 - tr.gallop);
  const gallopPitch = reduce ? 0 : tr.gallop * moving * .09 * Math.sin(cyc * 2);
  setOffset(P, BI.pelvis, -.02 * W[4], sway, -W[6] - .1 * W[4] - bob);
  setEuler(P, BI.pelvis, 0, -W[0] + W[7] + gallopPitch, -sway * 1.5 + daze * .06); resolveBone(P, BI.pelvis);
  setEuler(P, BI.tail, (reduce ? 0 : .15 * Math.sin(t * 2.3)) * (1 - stun), -.3 * W[0] - .2 * tr.gallop, 0); resolveBone(P, BI.tail);
  setEuler(P, BI.spine, (reduce ? 0 : -moving * .04 * Math.sin(cyc)), .1 * W[4], 0); resolveBone(P, BI.spine);
  // the shoulders roll into a sweep of the crown
  setEuler(P, BI.chest, W[2] * .18, -.05 * W[4], -W[2] * .14); P.scl[BI.chest] = 1 + breathe * G.breathe.chest * .5; resolveBone(P, BI.chest);
  // neck and head: raise/lower and turn (the hooks swing the crown sideways); ears flick; jaw opens to bellow
  const headUp = W[1], headSwing = W[2];
  let look = 0;
  if (env.target && !dead && !ACT.contact) { const lx = env.target.x - e.x, ly = env.target.y - e.y, a = Math.atan2(ly, lx) - yaw; look = Math.max(-.6, Math.min(.6, Math.atan2(Math.sin(a), Math.cos(a)))) * .6; }
  setEuler(P, BI.neck, headSwing * .45 + look * .4, -headUp * .45 + bob * 3, 0); resolveBone(P, BI.neck);
  setEuler(P, BI.neck2, headSwing * .35 + look * .3, -headUp * .33, 0); resolveBone(P, BI.neck2);
  setEuler(P, BI.head, headSwing * .2 + look * .3, -headUp * .25 + .2 + (reduce ? 0 : .02 * wobble(t * .7, 2)), headSwing * .25); resolveBone(P, BI.head);
  setEuler(P, BI.jaw, 0, .45 * W[5] * (1 + (reduce ? 0 : .1 * Math.sin(t * 25)) * W[5]), 0); resolveBone(P, BI.jaw);
  for (const [n, s] of [['earL', -1], ['earR', 1]]) { const flick = reduce ? 0 : Math.max(0, Math.sin(t * .9 + s * 1.7)) ** 30 * .5; setEuler(P, BI[n], s * (.25 + flick), .5 * Math.max(0, -W[1]), s * .2); resolveBone(P, BI[n]); }
  for (const n of ['antlerL', 'antlerR']) resolveBone(P, BI[n]);
  const hunting = e.stagHunt > 0 && !dead;
  P.scl[BI.fire] = hunting ? (reduce ? 1 : .85 + .2 * Math.sin(t * 13)) : 0; resolveBone(P, BI.fire);
  // legs: three segments; the cannon stays near upright (sloping on the hind leg), two-bone IK above it; hind stifles forward,
  // fore elbows back; forelegs fold when it rears or leaps, hind legs tuck in the air; the near forehoof paws the ground
  for (let k = 0; k < 4; k++) {
    const L = LEGS[k], top = BI[L.top], can = (L.hind ? G.hindCannon : G.foreCannon) * S, hoofH = (G.hoof + .015) * S;
    resolveBone(P, top); const hi = top * 3; H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], lift = tr.gait.out[k * 4 + 2], fz = env.z + hoofH + lift * G.footLift * S * (1 + tr.gallop);
    const fold = L.hind ? Math.max(ACT.airTuck * .8, air > .1 ? .6 : 0) : Math.max(W[3], air > .1 ? .7 : 0);
    if (still && !dead && (fold > .05 || air > .1 || e.fleeFade != null)) {
      // folded under the body (reared, airborne): the hoof is carried below and behind/under the joint
      const back = L.hind ? -.06 : .02, rest = (L.hind ? -.3 : .3) * S;
      const ax = x + cf * rest, ay = y + sf * rest; fx = ax + cf * back * S - sf * L.side * G.halfWidth * S; fy = ay + sf * back * S + cf * L.side * G.halfWidth * S;
      fz = Math.max(env.z + hoofH, H[2] - (L.hind ? G.femur + G.tibia + G.hindCannon : G.humerus + G.radius + G.foreCannon) * S * (1 - .45 * fold));
    }
    if (!L.hind && L.side > 0 && ACT.paw && !reduce && !dead) { const pw = Math.max(0, Math.sin(t * 9)); fz += pw * .12 * S; fx += cf * pw * .05 * S; fy += sf * pw * .05 * S; } // pawing
    if (dead) { const p = boneLocalToWorld(P, 'root', L.hind ? -.3 : .3, L.side * .12, G.hoof, T); fx = p[0]; fy = p[1]; fz = p[2] + .1 * S * (L.hind ? 0 : smooth(death / .3)); }
    T[0] = fx; T[1] = fy; T[2] = fz;
    const bend = Math.min(1, lift * .9 + fold), toe = lift > 0 || fold > .05 ? -.6 * Math.max(lift, fold) : 0;
    LEGBONES[0] = top; LEGBONES[1] = BI[L.mid]; LEGBONES[2] = BI[L.low]; LEGBONES[3] = BI[L.hoof];
    LENS[0] = (L.hind ? G.femur : G.humerus) * S; LENS[1] = (L.hind ? G.tibia : G.radius) * S; LENS[2] = can;
    poseAnimalLeg(P, LEGBONES, H, T, LENS, cf, sf, L.hind, bend, toe);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1;
  F.emitK[0] = life * (hunting ? 1.6 : (e.stagMending || ACT.glow > .5 ? 1.3 : .9) + (reduce ? 0 : .1 * Math.sin(t * 2.2)));
  F.emitK[1] = life * (e.stagMending ? 1.2 + (reduce ? 0 : .2 * Math.sin(t * 5)) : .55); // blossom glows faintly, bright as it mends
  F.emitK[2] = hunting ? 1.6 : 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = hunting ? 1 : 0; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = stagMesh(F.tier); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air; F.shadow = 1 - Math.min(.6, air / (3 * S)); F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = false;
  return F;
}
export const stagBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
