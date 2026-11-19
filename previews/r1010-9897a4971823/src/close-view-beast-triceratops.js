// The Triceratops in Close View (Tim, 2026-11-18: "refine him and make him look a little bit better ... more Triceratops-like", the
// Stegosaurus and the Spinosaurus as the bar): the same friendly, slightly goofy but solid beast as its standard-view art
// (triceratops-render.ts: the bright yellow hide, darker-yellow markings over the shoulders and haunches, a broad frill edged with
// knobs, two long brow horns, a short nose horn, a hooked beak, pillar legs on broad padded feet and a thick tapering tail), as a
// skinned body on the shared beast rig (close-view-beast-rig.ts).
//
// Two uses, one body: a wild herd member (its pack attack and phase: ramCharge, heavySweep, shockwave), and the ridden mount (the
// accepted pose fields only: the horn pose of beast-mounts.ts triceratopsHornPose, the Silly Goose's drill roll, the leap's lift and
// the landing stomp), which also wears its saddle (the ridden meshes; the Silly Goose's tack is teal with a goose feather). Both read
// the shared pose table (TRI_POSES) so the two views agree. Nothing here reads attack timing or changes the game.
//
// Body units u are the standard view's (a tile times the actor's scale); the root carries S = scale x closeViewScale.
import { TRI_ART, TRI_POSES, TRI_KEYS, triceratopsPoseName, triceratopsTailBounces, triceratopsHornOverlay } from "./triceratops-render.js?v=r1010-9897a4971823";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r1010-9897a4971823";

const hex = (s) => parseInt(s.slice(1), 16);
export const TRICERATOPS_RIG = Object.freeze({
  closeViewScale: 1.1, // wild herds (the ridden mount is drawn at its mount scale, so the saddle and rider card fit it)
  hip: .6, crouchDrop: .14, headScale: 1.09, femur: .22, tibia: .165, hindCannon: .075, humerus: .2, radius: .16, foreCannon: .07, /* 2026-11-18 legs pass: the sums meet the ground from the hip and shoulder with a slight knee, not a crouch */ foot: .05, hipWidth: .2, shoulderWidth: .19,
  walk: Object.freeze({ stride: .5, stance: .66 }),
  settle: 6, stepAt: .09, stepTime: .32, turnRate: 3.2, attackTurnRate: 8, standTurnRate: 2.2, standTurnMax: 1.5, footLift: .1, bob: .016,
  ease: 10, strikeEase: 18, deathMs: 2400, hitMs: 320, landMs: 380, tailBounce: .16,
  breathe: Object.freeze({ rate: 1.2, chest: .012 }),
  // budget (triangles per tier, measured: never above the Spinosaurus's hide body at any tier)
  budget: Object.freeze({ full: 3218, balanced: 1694, low: 668 }),
});
const G0 = TRICERATOPS_RIG, A = TRI_ART, K = TRI_KEYS.length, KI = Object.freeze(Object.fromEntries(TRI_KEYS.map((k, i) => [k, i])));
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(TRI_POSES).map(([n, p]) => [n, Float64Array.from(TRI_KEYS, (k) => p[k] || 0)])));

// ------------------------------------------------------------------------------------------------ skeleton
// The trunk's bind spine (forward f, height u, body units): the hips behind the middle, the back highest over the hips, low
// shoulders, a short thick neck and the big head carried low; the tail from the hips back and down.
const SPINE_AT = { pelvis: [-.3, G0.hip], spine: [-.06, .62], chest: [.18, .57], neck: [.34, .52], head: [.46, .5],
  tail1: [-.5, .6], tail2: [-.7, .55], tail3: [-.88, .49], tail4: [-1.04, .43] };
// The hide, tail tip to neck: [f, u, half width, half height, bone a, bone b, weight on b].
const BODY = [
  [-1.2, .385, .008, .008, 'tail4'], [-1.13, .405, .034, .032, 'tail4'], [-1.02, .44, .058, .056, 'tail4', 'tail3', .35], [-.9, .48, .085, .082, 'tail3'],
  [-.78, .52, .115, .11, 'tail3', 'tail2', .5], [-.66, .555, .155, .15, 'tail2'], [-.55, .585, .205, .2, 'tail2', 'tail1', .55], [-.44, .605, .25, .25, 'tail1', 'pelvis', .55],
  [-.32, .6, .29, .28, 'pelvis'], [-.19, .6, .315, .29, 'pelvis', 'spine', .5], [-.05, .59, .325, .29, 'spine'], [.08, .575, .315, .28, 'spine', 'chest', .5],
  [.2, .555, .28, .26, 'chest'], [.3, .55, .22, .235, 'chest', 'neck', .5], [.38, .53, .165, .18, 'neck'], [.45, .515, .135, .15, 'neck', 'head', .5], [.51, .505, .12, .135, 'head'],
];
function sectionAt(f) { for (let i = 1; i < BODY.length; i++) if (BODY[i][0] >= f) { const a = BODY[i - 1], b = BODY[i], t = (f - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } return BODY[BODY.length - 1].slice(1, 4); }
// The Silly Goose's drill whirlwind (Tim, 2026-11-18: no spin of the body, "show the spin with an effect"): `bands` helical ribbons of
// dust and air round the long axis through `at` (f, u), `turns` turns each from the head (`front`) back past the tail tip (`back`),
// `radius` round the body tapering to a point behind the tail (the drill bit), `width` wide; translucent (emit channel 3, alpha
// `alpha`). Built only into the ridden Silly Goose's full and balanced meshes, as the mesh's optional section: drawn only while drilling.
const WHIRL = Object.freeze({ at: Object.freeze([-.3, .58]), front: .75, back: -1.55, radius: .5, tip: .05, turns: 2.2, width: .07, alpha: .55,
  bands: Object.freeze({ full: 3, balanced: 2 }), cols: Object.freeze({ full: 26, balanced: 12 }) });
const SEAT_F = -.13, HS0 = TRI_ART.headScale * G0.headScale; // the head's scale (the standard view's, a little bigger in the round) // the saddle's place along the back (the standard view's seat sits over the body's middle)
const BONES = (() => {
  const W = {}, out = [], add = (name, parent, w) => { W[name] = w; const p = parent ? W[parent] : [0, 0, 0]; out.push({ name, parent, at: [w[0] - p[0], w[1] - p[1], w[2] - p[2]] }); };
  const S = (n) => [SPINE_AT[n][0], 0, SPINE_AT[n][1]];
  add('root', null, [0, 0, 0]); add('pelvis', 'root', S('pelvis')); add('spine', 'pelvis', S('spine')); add('chest', 'spine', S('chest'));
  add('neck', 'chest', S('neck')); add('head', 'neck', S('head')); add('jaw', 'head', [SPINE_AT.head[0] + .06 * HS0, 0, SPINE_AT.head[1] - .07 * HS0]);
  add('frill', 'head', [SPINE_AT.head[0] - .06 * HS0, 0, SPINE_AT.head[1] + .14 * HS0]); // over the back of the skull, its lower edges wrapping the cheeks
  add('tail1', 'pelvis', S('tail1')); add('tail2', 'tail1', S('tail2')); add('tail3', 'tail2', S('tail3')); add('tail4', 'tail3', S('tail4'));
  { const [u, , rz] = sectionAt(SEAT_F); add('saddle', 'spine', [SEAT_F, 0, u + rz]); }
  add('whirl', 'root', [WHIRL.at[0], 0, WHIRL.at[1]]); // the drill's whirlwind, turning about the body's long axis
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const hx = -.3, hz = G0.hip - .1, hy = s * G0.hipWidth;
    add('thigh' + side, 'pelvis', [hx, hy, hz]); add('shin' + side, 'thigh' + side, [hx, hy, hz - G0.femur]); add('hock' + side, 'shin' + side, [hx, hy, hz - G0.femur - G0.tibia]); add('footH' + side, 'hock' + side, [hx, hy, hz - G0.femur - G0.tibia - G0.hindCannon]);
    const fx = .2, fz = .48, fy = s * G0.shoulderWidth;
    add('arm' + side, 'chest', [fx, fy, fz]); add('fore' + side, 'arm' + side, [fx, fy, fz - G0.humerus]); add('wrist' + side, 'fore' + side, [fx, fy, fz - G0.humerus - G0.radius]); add('footF' + side, 'wrist' + side, [fx, fy, fz - G0.humerus - G0.radius - G0.foreCannon]);
  }
  return out;
})();
export const TRICERATOPS_SKELETON = defineSkeleton(BONES);
const BI = TRICERATOPS_SKELETON.index;
const LEGS = [ // gait order: hind left, fore left, hind right, fore right
  { top: 'thighL', mid: 'shinL', low: 'hockL', foot: 'footHL', hind: true, side: -1 },
  { top: 'armL', mid: 'foreL', low: 'wristL', foot: 'footFL', hind: false, side: -1 },
  { top: 'thighR', mid: 'shinR', low: 'hockR', foot: 'footHR', hind: true, side: 1 },
  { top: 'armR', mid: 'foreR', low: 'wristR', foot: 'footFR', hind: false, side: 1 },
];
const WALK_PHASE = [0, .25, .5, .75], TAIL = ['tail1', 'tail2', 'tail3', 'tail4'];
const LEG_FORE = { hind: -.3, fore: .2 };
// The seat height (body units over the feet at the saddle): the standard view's seat sits here too (beast-mounts.ts).
export const TRICERATOPS_SEAT = (() => { const [u, , rz] = sectionAt(SEAT_F); return u + rz; })();

// ------------------------------------------------------------------------------------------------ the body
const lerpHex = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
const palette = () => ({
  body: hex(A.body), light: hex(A.bodyLight), dark: hex(A.bodyDark), shade: hex(A.shade), belly: hex(A.belly), mark: hex(A.mark), stripe: hex(A.stripe),
  frill: hex(A.frill), frillInner: hex(A.frillInner), frillSpot: hex(A.frillSpot), frillEdge: hex(A.frillEdge), knob: hex(A.knob),
  horn: hex(A.horn), hornBase: hex(A.hornBase), beak: hex(A.beak), beakLight: hex(A.beakLight), eye: hex(A.eye), pupil: hex(A.pupil), toe: hex(A.toe), pad: hex(A.pad), tongue: hex(A.tongue),
  leather: 0x6b3f22, leatherDark: 0x3a2112, brass: 0xc9a05a, iron: 0x4a4f57,
});
const at = (bone, p) => { const i = BI[bone] * 3, w = TRICERATOPS_SKELETON.bindWorld; return [p[0] - w[i], p[1] - w[i + 1], p[2] - w[i + 2]]; };
// The markings (Tim, 2026-11-18): darker-yellow bands across the haunch and the shoulder masses, in the hide's own vertex colours
// (no triangles of their own). `band(f)`: 0..1, how strongly a section at f carries a band.
const MARKS = Object.freeze({ haunch: Object.freeze([-.5, -.12]), shoulder: Object.freeze([.02, .26]) });
function markAt(f) {
  for (const [a, b] of [MARKS.haunch, MARKS.shoulder]) if (f >= a && f <= b) return 1;
  return 0;
}
function buildTriceratopsMesh(tier, saddle) {
  const C = palette(), d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(TRICERATOPS_SKELETON, d);
  // The hide: one loft from the tail tip to the neck, the back lighter, a pale belly, warm bands across the back and darker-yellow
  // markings over the haunches and shoulders (on the flanks, where the leg masses meet the body).
  const tone = (i, k, st) => {
    const f = BODY[i][0]; let c = lerpHex(C.body, C.light, .2 + Math.max(0, st) * .55);
    if (st < -.3) c = lerpHex(c, C.belly, Math.min(1, (-.3 - st) * 2));
    if (st > .55 && i % 2 === 1 && f > -.9 && f < .3) c = lerpHex(c, C.stripe, .45);
    if (st > -.4 && st < .65 && markAt(f)) c = lerpHex(c, C.mark, k % 3 === 0 ? .35 : 1); // banded: dark stripes along the mass, every third ring lighter
    return c;
  };
  const hide = BODY.map((r, i) => [r, i]).filter(([, i]) => !low || i % 2 === 0 || i === 1 || i === BODY.length - 1);
  B.color(C.body).loft({ seg: low ? 8 : full ? 16 : 12, sections: hide.map(([[f, u, rx, rz, a, b, w]]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })), tone: (i, k, st) => tone(hide[i][1], k, st) });
  // ---- the head (bone-local, the standard view's head scaled by its headScale; f forward, u up)
  const HS = HS0, hb = (p) => at('head', [SPINE_AT.head[0] + p[0] * HS, p[1] * HS, SPINE_AT.head[1] + p[2] * HS]);
  const HW = (p) => [SPINE_AT.head[0] + p[0] * HS, p[1] * HS, SPINE_AT.head[1] + p[2] * HS];
  B.bone('head');
  // The skull (2026-11-18 pass 2): deep and broad at the cheeks (the jugal flare), the brow rising behind the eyes, the snout narrowing
  // to a hooked parrot beak; a dark cheek line runs back from the beak; it ends in the beak's dark keratin, all one skin.
  const SKULL = [[-.09, 0, .085, .115], [-.02, .01, .125, .15], [.05, .02, .12, .15], [.12, .02, .09, .135], [.19, .005, .07, .115], [.26, -.015, .056, .095], [.3, -.028, .05, .084], [.335, -.04, .038, .068], [.355, -.05, .02, .044]];
  const skull = low ? SKULL.filter((_, i) => i % 2 === 0) : SKULL, beakF = .3;
  B.color(C.body).loft({ seg: low ? 7 : full ? 14 : 10, sections: skull.map(([f, u, rx, rz]) => ({ at: HW([f, 0, u]), rx: rx * HS, rz: rz * HS, bones: ['head', 'head', 0] })),
    tone: (i, k, st) => { const f = skull[i][0]; if (f >= beakF) return st > .2 ? C.beakLight : C.beak; if (st < -.2 && st > -.55 && f > .02) return lerpHex(C.dark, C.beak, .35); return st > .3 ? C.light : st < -.5 ? C.dark : C.body; } });
  // the upper beak's hook, curling down over the lower beak
  B.color(C.beak).lathe({ at: hb([.35, 0, -.055]), F: [.25, 0, -.97], rings: [[0, .03 * HS], [.035 * HS, .02 * HS], [.06 * HS, 0]], seg: low ? 4 : 6, rs: .75 });
  // the brow horns: each grows out of a swelling of the brow, thick at the base, curving forward and up to a fine tip (one lofted skin)
  for (const s of [-1, 1]) {
    if (!low) B.color(C.body).ellipsoid({ at: hb([.115, s * .07, .115]), radius: [.06 * HS, .045 * HS, .04 * HS], rings: 3, seg: 7, F: [.9, 0, .45] });
    const pts = [[.105, s * .066, .1], [.15, s * .074, .16], [.22, s * .08, .23], [.29, s * .085, .28], [.38, s * .088, .315], [.45, s * .088, .33]], rad = [.05, .042, .034, .025, .014, .002];
    const use = low ? [0, 2, 4, 5] : [0, 1, 2, 3, 4, 5];
    B.loft({ seg: low ? 4 : full ? 8 : 6, caps: false, sections: use.map((i) => ({ at: HW(pts[i]), rx: rad[i] * HS, rz: rad[i] * HS, bones: ['head', 'head', 0] })), tone: (i, k, st) => lerpHex(C.hornBase, C.horn, i / (use.length - 1)) });
    // the cheek horns (the jugal points) under the frill's edge
    if (!low) B.color(C.hornBase).lathe({ at: hb([-.01, s * .115, -.07]), F: [-.35, s * .55, -.75], rings: [[0, .03 * HS], [.075 * HS, 0]], seg: 4, caps: false });
    // the eyes: big and bright, a dark pupil looking forward
    B.color(C.eye).ellipsoid({ at: hb([.1, s * .095, .05]), radius: [.036 * HS, .02 * HS, .032 * HS], rings: low ? 2 : 3, seg: low ? 5 : 7 });
    B.color(C.pupil).ellipsoid({ at: hb([.115, s * .11, .05]), radius: [.018 * HS, .009 * HS, .02 * HS], rings: 2, seg: low ? 4 : 5 });
  }
  // the nose horn: short, blunt and leaning forward off the top of the snout
  B.loft({ seg: low ? 4 : 6, caps: false, sections: [[.255, .055, .04], [.28, .1, .03], [.305, .15, .016], [.32, .18, .002]].map(([f, u, r]) => ({ at: HW([f, 0, u]), rx: r * HS, rz: r * HS, bones: ['head', 'head', 0] })), tone: (i) => lerpHex(C.hornBase, C.horn, i / 3) });
  // the lower jaw (opens with the pose), its beak tip dark; the ridden Silly Goose's tongue
  { const J = TRICERATOPS_SKELETON.bindWorld, j = BI.jaw * 3; B.bone('jaw');
    B.color(C.dark).loft({ seg: low ? 5 : 8, sections: [[-.04, .0, .08, .03], [.06, .005, .07, .03], [.15, .01, .052, .026], [.22, .014, .034, .02], [.26, .016, .01, .009]].map(([f, u, rx, rz]) => ({ at: [J[j] + f * HS, 0, J[j + 2] + u * HS], rx: rx * HS, rz: rz * HS, bones: ['jaw', 'jaw', 0] })),
      tone: (i, k, st) => i >= 3 ? C.beak : st > .3 ? 0x7a2a1c : C.dark }); // the lower beak (its dark tip) under the hook
    if (saddle === "silly" && !low) B.color(C.tongue).ellipsoid({ at: [.26 * HS, 0, .035 * HS], radius: [.06 * HS, .022 * HS, .01 * HS], F: [1, 0, -.4], rings: 2, seg: low ? 4 : 6 }); }
  // ---- the frill: a broad shield rising up and back off the skull, its front face orange, a pale rim with knobs
  B.bone('frill');
  // A dish, not a flat plate: rows run out from the skull to the rim, columns round the fan; its sides sweep back, so it reads broad
  // from the side as well as the front. Its face is orange with two dark spots, its rim pale, its back the hide's yellow.
  { const R = .32 * HS, Hh = .38 * HS, rows = low ? 3 : full ? 5 : 4, cols = low ? 6 : full ? 12 : 9, Fw = [.78, 0, .62], Up = [-.62, 0, .78];
    const grid = [], ring = [], rimAt = (a, r) => { const x = Math.cos(a) * R * r, y = (Math.sin(a) * Hh + .03 * HS) * r, back = -((x / R) ** 2) * .2 * HS * r - r * r * .03 * HS;
      return [Up[0] * y + Fw[0] * back, x, Up[2] * y + Fw[2] * back]; };
    for (let r = 0; r < rows; r++) { const rr = .18 + .82 * r / (rows - 1), row = []; for (let c = 0; c < cols; c++) { const a = -.12 + (Math.PI + .24) * c / (cols - 1); row.push(rimAt(a, rr)); } grid.push(row); ring.push(['frill', 'frill', 0]); }
    const spot = (r, c) => { const rr = .18 + .82 * r / (rows - 1), a = -.12 + (Math.PI + .24) * c / (cols - 1); return rr > .45 && rr < .85 && Math.abs(Math.sin(a)) > .55 && Math.abs(Math.cos(a)) > .2 && Math.abs(Math.cos(a)) < .65; };
    const FB = TRICERATOPS_SKELETON.bindWorld, fo = BI.frill * 3; // the sheet takes model-space points: the frill bone's bind position added
    B.sheet({ grid: grid.map((row) => row.map((q) => [q[0] + FB[fo], q[1] + FB[fo + 1], q[2] + FB[fo + 2]])), rowBones: ring, tone: (r, c) => r === rows - 1 ? C.frillEdge : !low && spot(r, c) ? C.frillSpot : r === 0 ? C.body : lerpHex(C.frillInner, C.frill, r / (rows - 1)) });
    if (!low) for (let i = 0; i <= (full ? 12 : 7); i++) { const a = -.06 + (Math.PI + .12) * i / (full ? 12 : 7);
      B.color(C.knob).ellipsoid({ at: rimAt(a, 1.04), radius: [.022 * HS, .026 * HS, .026 * HS], rings: 2, seg: full ? 5 : 4 }); }
  }
  // ---- legs: thick pillars of hide from the body to broad round feet with three pale toenails; markings over the leg tops
  // Each row: [u along the leg from its top joint, half width, half depth, bone a, bone b, weight on b, inset]. The top two rows sit inside
  // the body (`inset` pulls them toward the middle), so the thigh and upper arm grow out of the hip and shoulder masses with no edge; the
  // rows follow the bone lengths exactly (thigh, knee, shin, hock, foot), so no segment parts from the next in any pose.
  const G = G0, hf = G.femur, ht = G.femur + G.tibia, hl = ht + G.hindCannon, af = G.humerus, at2 = G.humerus + G.radius, al = at2 + G.foreCannon;
  const HIND = [[.14, .1, .12, 'p', 'p', 0, .45], [.05, .16, .17, 'p', 't', .4, .8], [-.04, .16, .165, 't', 't', 0, 1], [-hf * .6, .135, .14, 't', 't', 0, 1], [-hf, .11, .115, 't', 'm', .5, 1],
    [-hf - G.tibia * .5, .1, .1, 'm', 'm', 0, 1], [-ht, .095, .095, 'm', 'l', .5, 1], [-ht - G.hindCannon * .6, .095, .095, 'l', 'l', 0, 1], [-hl + .01, .105, .1, 'l', 'l', 0, 1]];
  const FORE = [[.12, .085, .1, 'p', 'p', 0, .5], [.04, .13, .14, 'p', 't', .4, .85], [-.04, .13, .135, 't', 't', 0, 1], [-af * .6, .11, .115, 't', 't', 0, 1], [-af, .095, .1, 't', 'm', .5, 1],
    [-af - G.radius * .5, .087, .09, 'm', 'm', 0, 1], [-at2, .082, .085, 'm', 'l', .5, 1], [-at2 - G.foreCannon * .6, .082, .084, 'l', 'l', 0, 1], [-al + .01, .092, .088, 'l', 'l', 0, 1]];
  for (const L of LEGS) {
    const W = TRICERATOPS_SKELETON.bindWorld, t = BI[L.top] * 3, x = W[t], y = W[t + 1], z = W[t + 2], parent = L.hind ? 'pelvis' : 'chest';
    const name = (c) => c === 'p' ? parent : c === 't' ? L.top : c === 'm' ? L.mid : L.low, src = L.hind ? HIND : FORE;
    const rows = src.filter((_, i) => !low || i % 2 === 0 || i === src.length - 1);
    B.color(C.body).loft({ seg: low ? 6 : full ? 10 : 8, up: [1, 0, 0], sections: rows.map(([u, rx, rz, a, b, w, inset]) => ({ at: [x, y * inset, z + u], rx, rz, bones: [name(a), name(b), w] })),
      tone: (i, k, st) => i >= rows.length - 1 ? C.dark : lerpHex(C.body, C.dark, Math.max(0, -st) * .3 + i * .025) });
    B.bone(L.foot).color(C.pad).ellipsoid({ at: [.01, 0, -.005], radius: [.11, .1, .04], rings: low ? 2 : 3, seg: low ? 6 : 9 });
    if (!low) for (let c = 0; c < 3; c++) { const s = c - 1; B.color(C.toe).ellipsoid({ at: [.085, s * .045, -.008], radius: [.026, .02, .024], rings: 2, seg: 4 }); }
  }
  // ---- the saddle (ridden meshes): a blanket draped over the back, a girth round the barrel, a leather seat with cantle and pommel
  if (saddle) {
    const silly = saddle === 'silly', cloth = silly ? 0x2f9aa6 : 0x8a2c34, clothDark = silly ? 0x1d6a74 : 0x5a1a20, trim = silly ? 0xffd84a : C.brass;
    const [u0, rx0, rz0] = sectionAt(SEAT_F), seatZ = u0 + rz0;
    // the blanket: a grid over the hide's upper half, a little proud of it, from behind to in front of the seat
    const cols = low ? 3 : 5, rowsN = low ? 3 : 5, grid = [], rowBones = [];
    for (let r = 0; r < rowsN; r++) { const f = SEAT_F - .17 + .34 * r / (rowsN - 1), [u, rx, rz] = sectionAt(f), row = [];
      for (let c = 0; c < cols; c++) { const a = Math.PI * (.08 + .84 * c / (cols - 1)); row.push([f, Math.cos(a) * (rx + .014), u + Math.sin(a) * (rz + .014)]); }
      grid.push(row); rowBones.push(['spine', 'spine', 0]); }
    B.sheet({ grid, rowBones, tone: (r, c) => c === 0 || c === cols - 1 ? trim : silly && (r + c) % 2 ? lerpHex(cloth, trim, .45) : cloth });
    B.bone('saddle');
    // the girth: a band right round the barrel under the seat
    B.color(C.leather).loft({ seg: low ? 8 : 14, caps: false, up: [0, 0, 1], sections: [-.05, .05].map((df) => ({ at: [SEAT_F + .04 + df, 0, u0], rx: rx0 + .018, rz: rz0 + .018, bones: ['spine', 'spine', 0] })), tone: (i, k, st) => st > .2 ? C.leather : C.leatherDark });
    B.color(C.brass).box({ at: [.04, rx0 * .87 + .022, -rz0 * .5], size: [.05, .008, .04], bevel: 0 });
    // the seat, its high cantle behind and pommel in front
    B.color(C.leather).ellipsoid({ at: [0, 0, .025], radius: [.13, .1, .03], rings: low ? 2 : 3, seg: low ? 6 : 8 });
    B.color(C.leather).box({ at: [-.12, 0, .07], size: [.025, .09, .055], bevel: .3, taper: .3 });
    if (!low) B.color(C.brass).ellipsoid({ at: [.13, 0, .07], radius: [.025, .025, .04], rings: 2, seg: 5 });
    // stirrups on short leathers down each side
    if (!low) for (const s of [-1, 1]) { B.color(C.leatherDark).box({ at: [.0, s * (rx0 * .7 + .03), -.1], size: [.012, .006, .1], bevel: 0, U: [0, -s * .35, 1] });
      B.color(C.iron).box({ at: [.0, s * (rx0 * .76 + .05), -.21], size: [.03, .02, .008], bevel: 0 }); }
    if (silly && !low) B.color(0xfbfbf4).lathe({ at: [-.13, 0, .1], F: [-.35, 0, .94], rings: [[0, .006], [.04, .03], [.16, .02], [.22, 0]], seg: 5, rs: .25 });
    void clothDark; void seatZ;
  }
  // ---- the drill's whirlwind (the optional section: the frame asks for it while drilling)
  if (saddle === 'silly' && !low) {
    B.mark().bone('whirl');
    const W = WHIRL, n = W.bands[tier] ?? 2, cols = W.cols[tier] ?? 12, wb = TRICERATOPS_SKELETON.bindWorld, o = BI.whirl * 3;
    for (let k = 0; k < n; k++) {
      const grid = [[], []];
      for (let c = 0; c < cols; c++) { const t = c / (cols - 1), f = W.front + (W.back - W.front) * t, ang = k * Math.PI * 2 / n + t * W.turns * Math.PI * 2;
        const r = (W.tip + (W.radius - W.tip) * Math.min(1, (f - W.back) / (W.at[0] - .25 - W.back))) * (t < .1 ? .75 + 2.5 * t : 1);
        for (const side of [0, 1]) grid[side].push([f + (side ? .5 : -.5) * W.width, wb[o + 1] + Math.cos(ang) * r, wb[o + 2] + Math.sin(ang) * r]); } // model space round the whirl bone's axis
      B.color(0xf6ecd2, 3).sheet({ grid, rowBones: [['whirl', 'whirl', 0], ['whirl', 'whirl', 0]], tone: (r, c) => lerpHex(0xfff8e4, 0xd9c49a, c / (cols - 1)) });
    }
  }
  return B.done();
}
const MESHES = new Map();
function meshFor(tier, saddle) { const k = `${saddle || 'wild'}:${tier}`; let m = MESHES.get(k); if (!m) { m = buildTriceratopsMesh(tier, saddle); MESHES.set(k, m); } return m; }
// The body this actor shows: the wild hide, or (the ridden mount) the hide with its saddle, the Silly Goose's own tack.
export function triceratopsMesh(tier = 'full', e = null) { return meshFor(tier, e?.mountView ? (e.triceratopsDisposition === 'silly' ? 'silly' : 'normal') : null); }

// ------------------------------------------------------------------------------------------------ the track
export function createTriceratopsTrack() {
  return {
    pose: createPose(TRICERATOPS_SKELETON),
    gait: createGait(LEGS.map((L, k) => ({ side: L.side * .2, fore: L.hind ? LEG_FORE.hind : LEG_FORE.fore, phase: WALK_PHASE[k] }))),
    v: new Float64Array(K), w: new Float64Array(K), airV: 0, yaw: NaN, at: NaN, hp: NaN, hitAt: -Infinity, hitSide: 1, airWas: 0, landAt: -Infinity, deathAt: null, deathDir: 1, x: 0, y: 0,
    frame: { kind: 'triceratops', tier: 'full', mesh: null, skin: null, boneCount: TRICERATOPS_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false, ridden: false, neckPitch: 0, roll: 0 },
  };
}

// ------------------------------------------------------------------------------------------------ the pose
// env: { x, y, z, scale, now, reduce, tier, target, dead } and, for the ridden mount, yaw (its heading), air (the leap's lift in
// tiles), horn (triceratopsHornPose or null) and drill (the drill's progress 0..1 and its axial turns, or null).
const H = new Float64Array(3), T = new Float64Array(3), LEGBONES = new Int16Array(4), LENS = new Float64Array(3), TMP = [0, 0, 0], TV = new Float64Array(K);
export function sampleTriceratops(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(6, Number(env.scale) || 1)), P = tr.pose, G = TRICERATOPS_RIG, ridden = !!e?.mountView;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, air = dead ? 0 : Math.max(0, Number(env.air) || 0);
  // the pose's numbers, eased; a stagger blends toward the dazed pose; a fresh landing stomps
  if (dt > 0) tr.airV = (air - tr.airWas) / dt;
  if (tr.airWas > .05 && air <= .05) tr.landAt = now; tr.airWas = air;
  const name = dead ? 'dead' : triceratopsPoseName(e, air, tr.gait.moving, tr.airV >= 0), stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  const land = (name === 'idle' || name === 'walk') && !reduce ? Math.max(0, 1 - (now - tr.landAt) / G.landMs) : 0;
  const want = POSE_VEC[name] || POSE_VEC.idle, dz = POSE_VEC.dazed, ld = POSE_VEC.land;
  for (let k = 0; k < K; k++) { let v = want[k]; v += (ld[k] - v) * land; TV[k] = v + (dz[k] - v) * stun; }
  const rate = /charge|sweep|stomp|rear|leap|fall|drill/.test(name) ? G.strikeEase : G.ease, EV = tr.v, V = tr.w, first = !Number.isFinite(tr.yaw);
  for (let k = 0; k < K; k++) EV[k] = first || reduce || !(dt > 0) ? TV[k] : EV[k] + (TV[k] - EV[k]) * Math.min(1, dt * rate);
  // the ridden horn attack's body (TRI_HORN_BODY), straight from the accepted horn pose: locked to its clock, never eased behind it
  triceratopsHornOverlay(ridden ? env.horn : null, V); for (let k = 0; k < K; k++) V[k] += EV[k];
  // facing: the ridden mount's heading as given; a wild one where it goes, its attack's aim, else the Wayfarer
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let aim = tr.yaw;
  if (ridden && Number.isFinite(env.yaw)) aim = env.yaw;
  else if (e.pack?.data?.aim && Math.hypot(e.pack.data.aim.x, e.pack.data.aim.y) > .01) aim = Math.atan2(e.pack.data.aim.y, e.pack.data.aim.x);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) aim = Math.atan2(dy, dx);
  else if (env.target && !dead && e.pack?.attack) { const tx = env.target.x - x, ty = env.target.y - y; if (Math.hypot(tx, ty) > .3) aim = Math.atan2(ty, tx); }
  if (!Number.isFinite(aim)) aim = e.facingX < 0 ? Math.PI : 0;
  if (first || ridden && (reduce || env.drill)) tr.yaw = aim;
  if (!dead) { const delta = Math.atan2(Math.sin(aim - tr.yaw), Math.cos(aim - tr.yaw)), attacking = !!e.pack?.attack || ridden; let turn = Math.max(-1, Math.min(1, dt * (attacking ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate))) * delta;
    if (!attacking && tr.gait.moving < .1) turn = Math.max(-G.standTurnMax * dt, Math.min(G.standTurnMax * dt, turn)); tr.yaw += turn; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // hits
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.hitSide = Math.sign((px - x) * -sf + (py - y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 16, 10) : 0, daze = stun > 0 && !reduce ? stun * Math.sin(t * 3.6) : 0;
  // gait (feet planted by the ground travelled; still while it strikes, leaps or dies)
  for (let k = 0; k < 4; k++) { tr.gait.side[k] = LEGS[k].side * (LEGS[k].hind ? G.hipWidth : G.shoulderWidth) * S; tr.gait.fore[k] = (LEGS[k].hind ? LEG_FORE.hind : LEG_FORE.fore) * S; }
  const still = (!!e.pack?.attack) || air > .05 || dead || !!env.drill;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.walk.stride * S, stance: G.walk.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime, maxStepping: 2 });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  // ------------------------------------------------------------------ the trunk, tail and head
  resetPose(P);
  const horn = ridden ? env.horn : null, hornPitch = horn ? Number(horn.pitch) || 0 : 0;
  let alpha = 1, rollAngle = 0, rootZ = env.z + air * (ridden ? 0 : 1);
  if (e.fleeFade != null) alpha = clamp01(e.fleeFade);
  if (dead) { const side = smooth((death - .25) / .3), bounce = death > .55 ? Math.max(0, kick((death - .55) * G.deathMs / 1000, 10, 6)) * .06 : 0;
    if (death < 1e-9) { const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.deathDir = (px - x) * -sf + (py - y) * cf > 0 ? -1 : 1; }
    rollAngle = (1.25 * side - bounce) * tr.deathDir; alpha *= 1 - clamp01((death - .82) / .18); }
  // the ridden drill: the whole body turns about its long axis through its middle, kept above its support
  let rx = x, ry = y;
  if (env.drill) rollAngle = reduce ? 0 : .06 * Math.sin((env.drill.angle || 0) * .5); // upright: only a small wobble (the whirlwind turns)
  rootZ += env.lift || 0;
  setEuler(P, BI.root, yaw, 0, rollAngle); P.scl[BI.root] = S; resolveBone(P, BI.root, rx, ry, rootZ);
  const pitch = V[KI.pitch], lean = V[KI.lean] * A.lean;
  const bob = moving * G.bob * (.5 - .5 * Math.cos(cyc * 2)), sway = reduce ? 0 : moving * .012 * Math.sin(cyc), breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe.rate / 3);
  const nd = Math.max(0, -pitch), chestF = SPINE_AT.chest[0] - SPINE_AT.pelvis[0];
  const bounce = triceratopsTailBounces(e) ? (reduce ? .5 : Math.sin(t * 20)) * G.tailBounce : 0; // the Silly Goose's and Bad's tail bounce, the hindquarters hopping with it
  setOffset(P, BI.pelvis, lean, sway, Math.abs(bounce) * .12 -V[KI.crouch] * G.crouchDrop - bob + Math.sin(nd) * chestF - .03 * Math.abs(hit) - (horn && horn.phase !== 'dash' ? .02 : 0));
  setEuler(P, BI.pelvis, reduce ? 0 : -moving * .025 * Math.sin(cyc), -pitch, -sway * 1.4 + daze * .05); resolveBone(P, BI.pelvis);
  setEuler(P, BI.spine, 0, 0, 0); resolveBone(P, BI.spine);
  setEuler(P, BI.chest, 0, 0, 0); P.scl[BI.chest] = 1 + breathe * G.breathe.chest; resolveBone(P, BI.chest);
  const look = env.target && !dead && !ridden ? (() => { const a = Math.atan2(env.target.y - y, env.target.x - x) - yaw; return Math.max(-.5, Math.min(.5, Math.atan2(Math.sin(a), Math.cos(a)))) * .5; })() : 0;
  const head = V[KI.head] + .2 * hit, reach = V[KI.reach] + (horn ? Number(horn.reach) || 0 : 0) / Math.max(.01, A.headScale * .5);
  // the neck carries the ridden horn pose: its pitch (+ lowers the horns), reach and drop, exactly as the standard view's neck
  setOffset(P, BI.neck, reach * .12, 0, -(horn ? Number(horn.lower) || 0 : 0)); /* the shove carries the head forward */ setEuler(P, BI.neck, look * .5, -head * .35 + hornPitch, 0); resolveBone(P, BI.neck);
  setEuler(P, BI.head, look * .4, -head * .3 + (reduce ? 0 : .02 * wobble(t * .7, 3)), -hit * .2 * tr.hitSide); resolveBone(P, BI.head);
  setEuler(P, BI.jaw, 0, .55 * clamp01(V[KI.open] + (dead ? .2 : 0)), 0); resolveBone(P, BI.jaw);
  resolveBone(P, BI.frill);
  for (let i = 0; i < TAIL.length; i++) { const w = (i + 1) / TAIL.length;
    const lift = V[KI.tailUp] * (i < 2 ? .4 : .25) + (i === 0 ? Math.max(0, pitch) * .8 : 0) + bounce * (i === 0 ? 1 : .4);
    const swing = V[KI.tailSide] * .4 + (reduce ? 0 : .05 * Math.sin(t * 1.6 - i * .6) * w * (1 - stun));
    setEuler(P, BI[TAIL[i]], swing, lift, 0); resolveBone(P, BI[TAIL[i]]); }
  P.scl[BI.saddle] = 1; resolveBone(P, BI.saddle);
  setEuler(P, BI.whirl, 0, 0, env.drill ? env.drill.angle || 0 : 0); P.scl[BI.whirl] = env.drill ? 1 : .001; resolveBone(P, BI.whirl);
  // ------------------------------------------------------------------ the legs
  for (let k = 0; k < 4; k++) {
    const L = LEGS[k], top = BI[L.top], hi = top * 3, len = (L.hind ? G.femur + G.tibia + G.hindCannon : G.humerus + G.radius + G.foreCannon) * S;
    resolveBone(P, top); H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2]; // the hip or shoulder where its body is this frame
    const lift = tr.gait.out[k * 4 + 2]; let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], fz = env.z + (G.foot + .005) * S + lift * G.footLift * S;
    const body = L.hind ? 'pelvis' : 'chest', bodyAt = (f, u, w) => { const p = boneLocalToWorld(P, body, f, L.side * (L.hind ? G.hipWidth : G.shoulderWidth), u, TMP); fx += (p[0] - fx) * w; fy += (p[1] - fy) * w; fz += (p[2] - fz) * w; };
    const W = TRICERATOPS_SKELETON.bindWorld, jf = W[hi] - W[BI[body] * 3], ju = W[hi + 2] - W[BI[body] * 3 + 2];
    if (env.drill) bodyAt(jf + (L.hind ? .08 : -.05), ju - len / S * .62, 1); // tucked tight through the roll
    else if (air > .05) bodyAt(jf + (L.hind ? -.04 : .07), ju - len / S * .92, 1); // in the air the legs hang (the leap's tuck folds them, below; coming down, the forefeet reach)
    if (!L.hind && V[KI.frontLift] > .01) bodyAt(jf + .14, ju - len / S * .55, V[KI.frontLift]);
    if (V[KI.tuck] > .01 && !env.drill) bodyAt(jf + (L.hind ? .1 : -.06), ju - len / S * .6, V[KI.tuck]);
    if (dead) { const p = boneLocalToWorld(P, 'root', L.hind ? LEG_FORE.hind : LEG_FORE.fore, L.side * .22, G.foot + .14 * smooth(death / .3), T); fx = p[0]; fy = p[1]; fz = p[2]; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    const fold = Math.max(V[KI.tuck], env.drill ? 1 : 0, V[KI.frontLift] * (L.hind ? 0 : 1)), bend = Math.min(1, lift * .9 + fold * .8), toe = lift > 0 || fold > .05 ? -.4 * Math.max(lift, fold) : 0;
    LEGBONES[0] = top; LEGBONES[1] = BI[L.mid]; LEGBONES[2] = BI[L.low]; LEGBONES[3] = BI[L.foot];
    LENS[0] = (L.hind ? G.femur : G.humerus) * S; LENS[1] = (L.hind ? G.tibia : G.radius) * S; LENS[2] = (L.hind ? G.hindCannon : G.foreCannon) * S;
    // pillar legs: the low bone near upright
    poseAnimalLeg(P, LEGBONES, H, T, LENS, cf, sf, L.hind, bend, toe, L.hind ? -.04 - .5 * bend : .02 + .8 * bend);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1;
  F.emitK[0] = life; F.emitK[1] = 0; F.emitK[2] = 1.1; F.emitK[3] = 0; F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = WHIRL.alpha; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = triceratopsMesh(F.tier, e); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = rootZ - env.z; F.shadow = 1 - Math.min(.6, F.air / (3 * S)); F.phase = name; F.contact = 0; F.cloud = !!env.drill && ridden; // the whirlwind section
  F.ridden = ridden; F.neckPitch = hornPitch; F.roll = rollAngle;
  return F;
}
export const triceratopsBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
// The brow horns' tips this frame (world), between the two horns: where the Horn Shot leaves them (beast-mounts.ts TRICERATOPS_HORN_SHOT).
export const TRICERATOPS_HORN_TIP = Object.freeze([.45, 0, .33]); // head-local, in the standard view's head units (x the head's scale)
export function triceratopsHornTip(tr, out = [0, 0, 0]) {
  const T = TRICERATOPS_HORN_TIP, w = TRICERATOPS_SKELETON.bindWorld, h = BI.head * 3;
  return boneLocalToWorld(tr.pose, 'head', SPINE_AT.head[0] + T[0] * HS0 - w[h], T[1] * HS0 - w[h + 1], SPINE_AT.head[1] + T[2] * HS0 - w[h + 2], out);
}
