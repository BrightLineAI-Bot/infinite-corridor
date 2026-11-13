// The Wild Stegosaurus in Close View (Tim, 2026-11-12, for his kid): the same beast as its standard-view art (wild-stego-render.ts:
// mostly blue, light-blue stripes on two staggered rows of back plates, dark-blue accents, a lighter belly, a thick tail with four
// spikes, a small toothed beak and a fierce yellow eye), as a solid skinned body on the shared beast rig (close-view-beast-rig.ts).
// It follows the same pose contract the standard view reads (e.stegoPose, stegoAir, stegoRoll, stegoSwim, stegoTail, stegoTree,
// stegoPlates, stegoClimb, stegoClimbDir) through the standard view's own pose table (STEGO_POSES), so both views agree; nothing
// here reads attack timing or changes the game.
//
// Body units u are the standard view's (a tile times the actor's scale); the root carries S = e.scale x closeViewScale.
import { STEGO_ART, STEGO_POSES } from "./wild-stego-render.js?v=r936-d83f8d9472f6";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, boneLocalToWorld, writeSkin, poseAnimalLeg,
  createGait, stepGait, meshBuilder, clamp01, smooth, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r936-d83f8d9472f6";

const hex = (s) => parseInt(s.slice(1), 16);
export const STEGO_RIG = Object.freeze({
  closeViewScale: 1.25,
  hip: .74, crouchDrop: .16, femur: .3, tibia: .28, hindCannon: .12, humerus: .22, radius: .2, foreCannon: .085, foot: .04, hipWidth: .19, shoulderWidth: .16,
  walk: Object.freeze({ stride: .62, stance: .64 }),
  settle: 6, stepAt: .09, stepTime: .3, turnRate: 4, attackTurnRate: 9, standTurnRate: 2.4, standTurnMax: 1.6, footLift: .12, bob: .018,
  ease: 11, strikeEase: 22, sinkEase: 3, deathMs: 2400, hitMs: 320, landMs: 520,
  wheelHeight: .78, curlJoint: .56, climbLift: .55, swimSink: .98, plateMin: .12,
  breathe: Object.freeze({ rate: 1.4, chest: .012 }),
  // the wielded tree's sideways sweep (yaw, + to its right) by pose; its lift is the standard view's `tree` angle
  treeYaw: Object.freeze({ swingL: -.85, swingR: .55 }),
  // the plate positions along the back (body units forward of the hips) and their parents
  plates: Object.freeze([[-.47, 'tail2'], [-.31, 'tail1'], [-.16, 'pelvis'], [0, 'pelvis'], [.16, 'pelvis'], [.31, 'spine'], [.47, 'chest'], [.62, 'neck1']]),
});
const G0 = STEGO_RIG, A = STEGO_ART;
const KEYS = ["pitch", "head", "reach", "open", "crouch", "tailUp", "tailSide", "tailReach", "curl", "frontLift", "clawNear", "clawFar", "kick", "tuck", "flare", "tree"], K = KEYS.length;
const KI = Object.freeze(Object.fromEntries(KEYS.map((k, i) => [k, i])));
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(STEGO_POSES).map(([n, p]) => [n, Float64Array.from(KEYS.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
// The trunk's bind spine (forward f, height u, in body units): hips at f 0, the back sloping down to low shoulders, a short neck,
// the small head carried low; the tail rising gently from its tip to the hips.
const SPINE_AT = { pelvis: [0, G0.hip], spine: [.22, .7], chest: [.42, .6], neck1: [.6, .52], neck2: [.73, .45], head: [.85, .41],
  tail1: [-.2, .72], tail2: [-.37, .68], tail3: [-.53, .63], tail4: [-.68, .58], tail5: [-.82, .54] };
// The body's sections, tail tip to snout: [f, u (centre), half width, half height, bone a, bone b, weight on b].
const BODY = [
  [-.99, .53, .014, .013, 'tail5'], [-.93, .535, .034, .032, 'tail5'], [-.82, .55, .052, .046, 'tail5', 'tail4', .25], [-.7, .575, .07, .06, 'tail4'],
  [-.6, .6, .085, .072, 'tail4', 'tail3', .6], [-.5, .63, .105, .088, 'tail3'], [-.42, .655, .125, .105, 'tail3', 'tail2', .7], [-.33, .685, .16, .13, 'tail2', 'tail1', .5],
  [-.24, .715, .2, .165, 'tail1'], [-.14, .74, .25, .2, 'tail1', 'pelvis', .55], [-.05, .755, .29, .24, 'pelvis'], [.05, .755, .31, .26, 'pelvis'],
  [.14, .74, .31, .26, 'pelvis', 'spine', .5], [.23, .71, .3, .25, 'spine'], [.32, .665, .27, .235, 'spine', 'chest', .5], [.41, .615, .23, .21, 'chest'],
  [.49, .57, .17, .165, 'chest', 'neck1', .4], [.57, .53, .115, .115, 'neck1'], [.65, .495, .085, .085, 'neck1', 'neck2', .5], [.72, .468, .072, .072, 'neck2'],
  [.79, .447, .068, .068, 'neck2', 'head', .5], [.85, .44, .07, .068, 'head'], [.91, .435, .064, .058, 'head'], [.96, .427, .052, .046, 'head'],
  [1.01, .416, .036, .032, 'head'], [1.045, .406, .02, .018, 'head'], [1.06, .402, .006, .006, 'head'],
];
function sectionAt(f) { for (let i = 1; i < BODY.length; i++) if (BODY[i][0] >= f) { const a = BODY[i - 1], b = BODY[i], t = (f - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } return BODY[BODY.length - 1].slice(1, 4); }
function topAt(f) { const [u, , rz] = sectionAt(f); return u + rz; }
const BONES = (() => {
  const W = {}, out = [], add = (name, parent, w) => { W[name] = w; const p = parent ? W[parent] : [0, 0, 0]; out.push({ name, parent, at: [w[0] - p[0], w[1] - p[1], w[2] - p[2]] }); };
  const S = (n) => [SPINE_AT[n][0], 0, SPINE_AT[n][1]];
  add('root', null, [0, 0, 0]); add('pelvis', 'root', S('pelvis')); add('spine', 'pelvis', S('spine')); add('chest', 'spine', S('chest'));
  add('neck1', 'chest', S('neck1')); add('neck2', 'neck1', S('neck2')); add('head', 'neck2', S('head')); add('jaw', 'head', [SPINE_AT.head[0] + .02, 0, SPINE_AT.head[1] - .035]);
  add('tree', 'head', [SPINE_AT.head[0] + .14, 0, SPINE_AT.head[1] - .02]);
  add('tail1', 'pelvis', S('tail1')); add('tail2', 'tail1', S('tail2')); add('tail3', 'tail2', S('tail3')); add('tail4', 'tail3', S('tail4')); add('tail5', 'tail4', S('tail5'));
  add('stump', 'tail2', S('tail3'));
  for (const [side, s] of [['L', -1], ['R', 1]]) {
    const hx = -.02, hz = G0.hip - .05, hy = s * G0.hipWidth;
    add('thigh' + side, 'pelvis', [hx, hy, hz]); add('shin' + side, 'thigh' + side, [hx, hy, hz - G0.femur]); add('hock' + side, 'shin' + side, [hx, hy, hz - G0.femur - G0.tibia]); add('footH' + side, 'hock' + side, [hx, hy, hz - G0.femur - G0.tibia - G0.hindCannon]);
    const fx = .44, fz = .5, fy = s * G0.shoulderWidth;
    add('arm' + side, 'chest', [fx, fy, fz]); add('fore' + side, 'arm' + side, [fx, fy, fz - G0.humerus]); add('wrist' + side, 'fore' + side, [fx, fy, fz - G0.humerus - G0.radius]); add('footF' + side, 'wrist' + side, [fx, fy, fz - G0.humerus - G0.radius - G0.foreCannon]);
  }
  G0.plates.forEach(([f, parent], i) => add('plate' + i, parent, [f, 0, topAt(f) - .03]));
  return out;
})();
export const STEGO_SKELETON = defineSkeleton(BONES);
const BI = STEGO_SKELETON.index;
const E_EYE = 1, E_STRIPE = 2;
const LEGS = [ // gait order: hind left, fore left, hind right, fore right
  { top: 'thighL', mid: 'shinL', low: 'hockL', foot: 'footHL', hind: true, side: -1 },
  { top: 'armL', mid: 'foreL', low: 'wristL', foot: 'footFL', hind: false, side: -1 },
  { top: 'thighR', mid: 'shinR', low: 'hockR', foot: 'footHR', hind: true, side: 1 },
  { top: 'armR', mid: 'foreR', low: 'wristR', foot: 'footFR', hind: false, side: 1 },
];
const WALK_PHASE = [0, .25, .5, .75];
const TRUNK = ['pelvis', 'spine', 'chest', 'neck1', 'neck2', 'head'], TAIL = ['tail1', 'tail2', 'tail3', 'tail4', 'tail5'];


// ------------------------------------------------------------------------------------------------ the body
let PALETTE = null;
const palette = () => PALETTE ||= {
  body: hex(A.body), light: hex(A.bodyLight), dark: hex(A.bodyDark), belly: hex(A.belly), plate: hex(A.plate), plateFar: hex(A.plateFar), stripe: hex(A.plateStripe),
  spike: hex(A.spike), spikeBase: hex(A.spikeBase), claw: hex(A.claw), eye: hex(A.eye), pupil: 0x140a00, mouth: hex(A.mouth), tooth: hex(A.tooth), flesh: hex(A.flesh),
  fleshDark: hex(A.fleshDark), bark: hex(A.bark), barkDark: hex(A.barkDark), leaf: hex(A.leaf), leafDark: hex(A.leafDark), dirt: hex(A.dirt), pad: 0x0f2a5c,
};
const lerpHex = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };
const at = (bone, p) => { const i = BI[bone] * 3, w = STEGO_SKELETON.bindWorld; return [p[0] - w[i], p[1] - w[i + 1], p[2] - w[i + 2]]; };
// A plate's outline in its own (forward, up) plane: a broad kite leaning back toward the tail, widest at mid height.
const PLATE = [[-.42, 0], [.42, 0], [.52, .42], [.14, .9], [-.16, 1], [-.6, .55]];
function buildStegoMesh(tier) {
  const C = palette(), d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(STEGO_SKELETON, d);
  // The hide: one loft from the tail tip to the beak, blended across the trunk and tail bones; the back lighter, a dark-blue
  // stripe across the back every other section, a lighter belly.
  const tone = (i, k, st) => {
    const f = BODY[i][0]; let c = lerpHex(C.body, C.light, .35 + Math.max(0, st) * .65);
    if (st > -.25 && i % 2 === 1 && f > -.9 && f < .6) c = lerpHex(c, C.dark, .85 * Math.min(1, (st + .25) * 1.6));
    if (st < -.25) c = lerpHex(c, C.belly, Math.min(1, (-.25 - st) * 2.2));
    if (f > .99 && st > -.3) c = lerpHex(c, C.dark, .8);
    return c;
  };
  B.color(C.body).loft({ seg: low ? 10 : full ? 16 : 13, sections: BODY.map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx, rz, bones: [a, b ?? a, w || 0] })), tone });
  // the head: brow ridges over fierce yellow eyes, nostrils, the mouth's dark inside, the lower jaw and teeth
  B.bone('head');
  const hb = (p) => at('head', p);
  for (const s of [-1, 1]) {
    B.color(C.eye, E_EYE).ellipsoid({ at: hb([.9, s * .056, .452]), radius: [.02, .01, .016], rings: 3, seg: 6 });
    if (!low) B.color(C.pupil).ellipsoid({ at: hb([.905, s * .064, .452]), radius: [.004, .004, .013], rings: 2, seg: 4 });
    B.color(C.dark).ellipsoid({ at: hb([.895, s * .05, .482]), radius: [.04, .02, .012], rings: 3, seg: 6, F: [1, -s * .15, -.45] });
    if (!low) B.color(C.pad).ellipsoid({ at: hb([1.025, s * .02, .42]), radius: [.008, .005, .005], rings: 2, seg: 4 });
  }
  B.color(C.mouth).ellipsoid({ at: hb([.96, 0, .388]), radius: [.085, .035, .018], rings: 3, seg: 7 });
  const teeth = (bone, x0, x1, z, down, n) => { B.bone(bone); for (const s of [-1, 1]) for (let i = 0; i < n; i++) { const f = x0 + (x1 - x0) * i / Math.max(1, n - 1), r = sectionAt(f)[1] * .62 * (1 - .3 * i / n);
    B.color(C.tooth).lathe({ at: at(bone, [f, s * r, z]), F: [0, 0, down ? -1 : 1], rings: [[0, .008], [.022, .001]], seg: 3, caps: false }); } };
  if (!low) teeth('head', .89, 1.025, .392, true, full ? 5 : 3);
  { const J = STEGO_SKELETON.bindWorld, j = BI.jaw * 3; B.bone('jaw');
    B.color(C.dark).loft({ seg: low ? 6 : 9, sections: [[0, .0, .05, .024], [.05, -.003, .046, .022], [.1, -.006, .036, .017], [.15, -.006, .024, .012], [.18, -.004, .012, .007], [.192, -.003, .004, .003]].map(([f, u, rx, rz]) => ({ at: [J[j] + f, 0, J[j + 2] + u], rx, rz, bones: ['jaw', 'jaw', 0] })),
      tone: (i, k, st) => st > .3 ? C.mouth : st < -.3 ? C.belly : C.dark }); }
  if (!low) teeth('jaw', .9, 1.015, .382, false, full ? 4 : 3);
  // Plates: two staggered rows along the back (left a little behind, right a little ahead), each on its own bone so the launch
  // can shrink and regrow them; a light-blue stripe band (or two) inset on both faces.
  const NP = G0.plates.length, gap = (G0.plates[NP - 1][0] - G0.plates[0][0]) / (NP - 1);
  G0.plates.forEach(([f0], i) => {
    const sN = (f0 / A.length) + A.hipAt, prof = Math.max(.22, Math.sin(Math.PI * (sN - .14) / .78) ** .9), h = A.plateMax * prof, w = h * .78;
    B.bone('plate' + i);
    for (const side of [-1, 1]) {
      const f = side * gap * .25, base = topAt(f0 + f) - (topAt(f0) - .03) - .05, ou = [0, side * .2, 1], th = .018 + h * .03;
      const layer = (scale, thick, color, emit) => { const cxp = -.04, cyp = .42, pts = PLATE.map(([a, b]) => [(cxp + (a - cxp) * scale) * w, (cyp + (b - cyp) * scale) * h]);
        B.color(color, emit).slab({ at: [f, side * .03, base], F: [1, 0, 0], U: ou, points: pts, thick }); };
      layer(1, th, side < 0 ? C.plate : C.light, 0);
      if (!low) { layer(.8, th + .008, C.stripe, E_STRIPE); layer(.64, th + .014, side < 0 ? C.plate : C.light, 0); }
      if (full) { layer(.46, th + .02, C.stripe, E_STRIPE); layer(.3, th + .026, side < 0 ? C.plate : C.light, 0); }
    }
  });
  // The thagomizer: four spikes off the tail near its tip, swept out, up and back.
  B.bone('tail5');
  for (const [f, s, dir, len] of [[-.88, -1, [-.45, -.78, .45], .3], [-.88, 1, [-.45, .78, .45], .3], [-.95, -1, [-.6, -.62, .5], .27], [-.95, 1, [-.6, .62, .5], .27]]) {
    const r = sectionAt(f)[1], base = at('tail5', [f, s * r * .6, sectionAt(f)[0] + .01]);
    B.color(C.spikeBase).lathe({ at: base, F: dir, rings: [[0, .032], [len * .3, .026]], seg: low ? 4 : 6, caps: false });
    B.color(C.spike).lathe({ at: [base[0] + dir[0] * len * .3, base[1] + dir[1] * len * .3, base[2] + dir[2] * len * .3], F: dir, rings: [[0, .026], [len * .7, .002]], seg: low ? 4 : 6, caps: false });
  }
  // The stump (shown when the tail is cut): raw flesh with a pale bone at its heart, facing back.
  { B.bone('stump'); const r = sectionAt(-.53); B.color(C.flesh).ellipsoid({ at: [.0, 0, 0], radius: [.02, r[1] * .95, r[2] * .95], rings: 3, seg: low ? 6 : 9 });
    if (!low) B.color(C.tooth).ellipsoid({ at: [-.015, 0, 0], radius: [.012, .022, .022], rings: 2, seg: 5 }); }
  // Legs: thick columns of hide from inside the body through thigh or upper arm to a broad padded foot with three pale claws.
  const HIND = [[.1, .11, .13, 'p'], [0, .13, .15, 'p', 't', .5], [-.08, .125, .14, 't'], [-.2, .1, .11, 't'], [-.29, .085, .09, 't', 'm', .5], [-.42, .072, .075, 'm'], [-.56, .064, .066, 'm', 'l', .5], [-.64, .06, .062, 'l'], [-.7, .066, .064, 'l']];
  const FORE = [[.08, .09, .1, 'p'], [0, .1, .11, 'p', 't', .5], [-.08, .094, .1, 't'], [-.18, .08, .084, 't', 'm', .5], [-.3, .067, .07, 'm'], [-.4, .06, .063, 'm', 'l', .5], [-.47, .058, .06, 'l'], [-.505, .064, .062, 'l']];
  for (const L of LEGS) {
    const W = STEGO_SKELETON.bindWorld, t = BI[L.top] * 3, x = W[t], y = W[t + 1], z = W[t + 2], parent = L.hind ? 'pelvis' : 'chest';
    const name = (c) => c === 'p' ? parent : c === 't' ? L.top : c === 'm' ? L.mid : L.low;
    const rows = (L.hind ? HIND : FORE).filter((_, i) => !low || i % 2 === 0 || i === (L.hind ? HIND : FORE).length - 1);
    B.color(C.body).loft({ seg: low ? 6 : 10, up: [1, 0, 0], sections: rows.map(([u, rx, rz, a, b, w]) => ({ at: [x, y, z + u], rx, rz, bones: [name(a), name(b ?? a), w || 0] })),
      tone: (i, k, st) => i >= rows.length - 2 ? C.dark : lerpHex(C.body, C.dark, Math.max(0, -st) * .3 + i * .03) });
    B.bone(L.foot).color(C.pad).ellipsoid({ at: [.015, 0, .012], radius: [.085, .072, .032], rings: 3, seg: low ? 6 : 9 });
    for (let c = 0; c < (low ? 2 : 3); c++) { const s = low ? (c ? .5 : -.5) : c - 1; B.color(C.claw).lathe({ at: [.07, s * .032, .012], F: [1, s * .25, -.35], rings: [[0, .014], [.045, .002]], seg: low ? 3 : 5, caps: false }); }
  }
  // The tree it wields (shown only while it holds one): roots and a clod of earth behind its jaws, a tall thin trunk, a spire crown.
  B.bone('tree');
  B.color(C.dirt).ellipsoid({ at: [-.06, 0, 0], radius: [.06, .07, .055], rings: 3, seg: low ? 5 : 7 });
  if (!low) for (let r = 0; r < 4; r++) { const a = r / 4 * Math.PI * 2 + .4; B.color(C.barkDark).lathe({ at: [-.06, 0, 0], F: [-.6, Math.cos(a) * .6, Math.sin(a) * .6], rings: [[0, .014], [.13, .003]], seg: 3, caps: false }); }
  B.color(C.bark).lathe({ at: [-.02, 0, 0], F: [1, 0, 0], U: [0, 0, 1], rings: [[0, .036], [.6, .026], [1.3, .012]], seg: low ? 5 : 7, caps: true });
  for (let l = 0; l < (low ? 2 : 4); l++) { const a = .45 + l * .2, r = .22 - l * .042; B.color(l % 2 ? C.leafDark : C.leaf).lathe({ at: [a, 0, 0], F: [1, 0, 0], U: [0, 0, 1], rings: [[0, .02], [.03, r], [.32, .012]], seg: low ? 5 : 8, caps: true }); }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function stegoMesh(tier = 'full') { return MESHES[tier] ||= buildStegoMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createStegoTrack() {
  return {
    pose: createPose(STEGO_SKELETON),
    gait: createGait(LEGS.map((L, k) => ({ side: L.side * .16, fore: L.hind ? -.02 : .44, phase: WALK_PHASE[k] }))),
    v: new Float64Array(K), poseName: '', poseAt: -Infinity, yaw: NaN, at: NaN, sink: 0, roll: 0, rx: NaN, ry: NaN,
    hp: NaN, hitAt: -Infinity, hitSide: 1, airWas: 0, landAt: -Infinity, landHard: 0, deathAt: null, deathDir: 1, x: 0, y: 0, z: 0,
    frame: { kind: 'wildStego', tier: 'full', mesh: null, skin: null, boneCount: STEGO_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(8), phase: '', contact: 0, cloud: false },
  };
}
// The pose a foe shows (the contract's name, or idle), as the standard view reads it.
export function stegoPoseName(e) { return e?.dead ? 'dead' : e?.stegoPose && POSE_VEC[e.stegoPose] ? e.stegoPose : 'idle'; }

// ------------------------------------------------------------------------------------------------ the pose
const H = new Float64Array(3), T = new Float64Array(3), LEGBONES = new Int16Array(4), LENS = new Float64Array(3), TMP = [0, 0, 0], RING = new Float64Array(3);
const TV = new Float64Array(K);
export function sampleStego(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = STEGO_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  // the pose's numbers, eased (snappier for the strikes); a stagger blends toward the dazed pose
  const name = dead ? 'dead' : stegoPoseName(e), stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (name !== tr.poseName) { tr.poseName = name; tr.poseAt = now; }
  const want = POSE_VEC[name], dz = POSE_VEC.dazed; for (let k = 0; k < K; k++) TV[k] = want[k] + (dz[k] - want[k]) * stun;
  const rate = /bite|claw|swipe|tail[LR]|whip|buck|Slam/.test(name) ? G.strikeEase : G.ease, V = tr.v, first = !Number.isFinite(tr.yaw);
  for (let k = 0; k < K; k++) V[k] = first || reduce || !(dt > 0) ? TV[k] : V[k] + (TV[k] - V[k]) * Math.min(1, dt * rate);
  const roll = dead ? 0 : clamp01(Number(e.stegoRoll) || 0), curl = Math.max(V[KI.curl], roll), cw = smooth(curl), air = dead ? 0 : Math.max(0, Number(e.stegoAir) || 0);
  const swim = dead ? 0 : Number(e.stegoSwim) || 0, climb = dead ? 0 : clamp01(Number(e.stegoClimb) || 0), climbing = climb > 0 || name === 'climb', cut = e.stegoTail === 'cut';
  const plates = e.stegoPlates != null && Number.isFinite(Number(e.stegoPlates)) ? clamp01(Number(e.stegoPlates)) : 1;
  const holding = !dead && !!e.stegoTree && (e.stegoTree.phase === 'pull' || e.stegoTree.phase === 'swing');
  const sinkTo = !dead && ((swim === 1 && air < .05 && name !== 'breach') || name === 'dive') ? 1 : 0; tr.sink = first || reduce || !(dt > 0) ? sinkTo : tr.sink + (sinkTo - tr.sink) * Math.min(1, dt * G.sinkEase);
  // facing: up the wall it climbs; else where it goes; standing, the Wayfarer
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let aim = tr.yaw;
  if (climbing && e.stegoClimbDir && Math.hypot(e.stegoClimbDir.x, e.stegoClimbDir.y) > .01) aim = Math.atan2(e.stegoClimbDir.y, e.stegoClimbDir.x);
  else if (e.pack?.data?.aim && Math.hypot(e.pack.data.aim.x, e.pack.data.aim.y) > .01) aim = Math.atan2(e.pack.data.aim.y, e.pack.data.aim.x);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60) && cw < .5) aim = Math.atan2(dy, dx);
  else if (env.target && !dead && cw < .5) { const tx = env.target.x - x, ty = env.target.y - y; if (Math.hypot(tx, ty) > .3) aim = Math.atan2(ty, tx); }
  if (!Number.isFinite(aim)) aim = e.facingX < 0 ? Math.PI : 0;
  if (first) tr.yaw = aim;
  if (!dead) { const delta = Math.atan2(Math.sin(aim - tr.yaw), Math.cos(aim - tr.yaw)), attacking = !!e.pack?.attack || !!e.stegoPose; let turn = Math.max(-1, Math.min(1, dt * (attacking ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate))) * delta;
    if (!attacking && tr.gait.moving < .1) turn = Math.max(-G.standTurnMax * dt, Math.min(G.standTurnMax * dt, turn)); tr.yaw += turn; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // the wheel turns by the ground it covers
  const moved = Number.isFinite(tr.rx) ? Math.hypot(x - tr.rx, y - tr.ry) : 0; tr.rx = x; tr.ry = y;
  if (!reduce && moved < 3 * S) tr.roll += (moved / Math.max(.2, .55 * S) + dt * 2.2) * roll;
  // hits and landings
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.hitSide = Math.sign((px - x) * -sf + (py - y) * cf) || 1; }
  tr.hp = e.hp;
  if (tr.airWas > .1 && air <= .1) { tr.landAt = now; tr.landHard = Math.min(1, tr.airWas / 2 + .3); }
  tr.airWas = air;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 16, 10) : 0, landT = (now - tr.landAt) / 1000, land = landT < G.landMs / 1000 ? Math.max(0, kick(landT, 8, 6)) * tr.landHard : 0;
  const daze = stun > 0 && !reduce ? stun * Math.sin(t * 3.6) : 0;
  // gait (feet planted by the ground travelled; still while it strikes, flies, swims under, rolls or dies)
  for (let k = 0; k < 4; k++) { tr.gait.side[k] = LEGS[k].side * (LEGS[k].hind ? G.hipWidth : G.shoulderWidth) * S; tr.gait.fore[k] = (LEGS[k].hind ? -.02 : .44) * S; }
  const still = (!!e.pack?.attack && name !== 'walk') || air > .1 || dead || cw > .3 || tr.sink > .5 || climbing || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.walk.stride * S, stance: G.walk.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime, maxStepping: 2 });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;

  // ------------------------------------------------------------------ the trunk, tail and head
  resetPose(P);
  const pitch = climbing ? V[KI.pitch] * Math.max(climb, name === 'climb' ? .6 : 0) : V[KI.pitch];
  let rootZ = env.z + air + climb * G.climbLift * S - tr.sink * G.swimSink * S, alpha = 1, rollAngle = 0;
  if (e.fleeFade != null) alpha = clamp01(e.fleeFade);
  if (dead) { // it sinks onto its belly, then rolls onto its side
    const fall = smooth(death / .3), side = smooth((death - .25) / .3), bounce = death > .55 ? Math.max(0, kick((death - .55) * G.deathMs / 1000, 10, 6)) * .06 : 0;
    rollAngle = (1.3 * side - bounce) * tr.deathDir; alpha *= 1 - clamp01((death - .82) / .18); void fall;
    if (death < 1e-9) { const px = env.target?.x ?? x, py = env.target?.y ?? y; tr.deathDir = (px - x) * -sf + (py - y) * cf > 0 ? -1 : 1; }
  }
  const pose = (rootPitch, rx, ry, rz) => {
    setEuler(P, BI.root, yaw, rootPitch, rollAngle); P.scl[BI.root] = S; resolveBone(P, BI.root, rx, ry, rz);
    const bob = moving * G.bob * (.5 - .5 * Math.cos(cyc * 2)), sway = reduce ? 0 : moving * .012 * Math.sin(cyc), breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe.rate / 3);
    // nose up turns about the hips; nose down about the shoulders (the hips rise to keep the chest where it stands)
    const nd = Math.max(0, -pitch), chestF = SPINE_AT.chest[0];
    setOffset(P, BI.pelvis, -(1 - Math.cos(nd)) * chestF * 0, sway, -V[KI.crouch] * G.crouchDrop - bob + Math.sin(nd) * chestF - .03 * Math.abs(hit) - .05 * land);
    setEuler(P, BI.pelvis, (reduce ? 0 : -moving * .03 * Math.sin(cyc)), -pitch - .02 * land, -sway * 1.4 + daze * .05); resolveBone(P, BI.pelvis);
    const cj = G.curlJoint * cw, look = env.target && !dead && cw < .5 ? (() => { const a = Math.atan2(env.target.y - y, env.target.x - x) - yaw; return Math.max(-.6, Math.min(.6, Math.atan2(Math.sin(a), Math.cos(a)))) * .5; })() : 0;
    setEuler(P, BI.spine, 0, cj, 0); resolveBone(P, BI.spine);
    setEuler(P, BI.chest, 0, cj, 0); P.scl[BI.chest] = 1 + breathe * G.breathe.chest; resolveBone(P, BI.chest);
    const head = V[KI.head] + .25 * hit, shake = name === 'shake' && !reduce ? Math.sin(t * 26) * .45 : 0, reach = V[KI.reach] * (1 - cw);
    const treeYaw = (G.treeYaw[name] || 0) * (holding ? 1 : 0);
    setOffset(P, BI.neck1, reach * .05, 0, 0); setEuler(P, BI.neck1, look * .35 + shake * .4 + treeYaw * .3, -head * .32 + cj, 0); resolveBone(P, BI.neck1);
    setOffset(P, BI.neck2, reach * .06, 0, 0); setEuler(P, BI.neck2, look * .3 + shake * .4 + treeYaw * .3, -head * .32 + cj + bob * 3, 0); resolveBone(P, BI.neck2);
    setOffset(P, BI.head, reach * .06, 0, 0); setEuler(P, BI.head, look * .25 + shake * .2, -head * .25 + cj + (reduce ? 0 : .02 * wobble(t * .7, 3)), -hit * .2 * tr.hitSide); resolveBone(P, BI.head);
    const since = (now - tr.poseAt) / 1000, snap = name === 'bite' ? Math.max(0, 1 - since * 6) : 0, chew = name === 'graze' && !reduce ? .25 * Math.max(0, Math.sin(t * 7)) : 0;
    setEuler(P, BI.jaw, 0, .62 * clamp01(V[KI.open] * (1 - snap) + chew + (dead ? .2 : 0)), 0); resolveBone(P, BI.jaw);
    // the tree: lifted by the pose's angle off the snout's line, swept sideways in the swings, shaken with the head
    setEuler(P, BI.tree, treeYaw + shake * .6, -(V[KI.tree] || 0), 0); P.scl[BI.tree] = holding ? 1 : .001; resolveBone(P, BI.tree);
    // tail: up and over for the raise and slam, sideways for the whack and whip, braced down on the wall as it climbs, curled under
    // in the wheel; nose-up poses keep it level (it props the body as it rears)
    const tailUp = V[KI.tailUp], tailSide = V[KI.tailSide], tailReach = V[KI.tailReach];
    for (let i = 0; i < TAIL.length; i++) {
      const w = (i + 1) / TAIL.length, lift = tailUp * (i < 2 ? .62 : .32) + tailReach * (i >= 2 ? .32 : 0) + (i === 0 && !climbing ? pitch * .85 : 0) - (climbing ? .08 : 0) + (i === 0 ? V[KI.kick] * .15 : 0) - cj * 1.05;
      const swing = tailSide * .34 * (1 - cw) + (reduce ? 0 : (.05 * Math.sin(t * 1.7 - i * .6) * w) * (1 - stun) * (1 - cw));
      setEuler(P, BI[TAIL[i]], swing, lift, 0); if (cut && i === 2) P.scl[BI[TAIL[i]]] = .001; resolveBone(P, BI[TAIL[i]]);
    }
    P.scl[BI.stump] = cut ? 1 : .001; resolveBone(P, BI.stump);
    // plates: on their own bones, shrunk to stubs as they launch and regrown after; they sway as it climbs and swims
    for (let i = 0; i < G.plates.length; i++) { const b = BI['plate' + i], sw = reduce ? 0 : (climbing ? .12 : tr.sink > .5 ? .05 : .025) * Math.sin(t * 3 + i * .7);
      setEuler(P, b, 0, 0, sw); P.scl[b] = G.plateMin + (1 - G.plateMin) * plates; resolveBone(P, b); }
  };
  pose(0, x, y, rootZ);
  // the wheel: the trunk and tail curl round (above); set the ring's centre at its rolling height and turn it about that centre
  if (cw > 1e-3) {
    let cx = 0, cy = 0, cz = 0; for (const n of [...TRUNK, ...TAIL]) { const i = BI[n] * 3; cx += P.wp[i]; cy += P.wp[i + 1]; cz += P.wp[i + 2]; } cx /= 11; cy /= 11; cz /= 11;
    const ty = cz + (env.z + air + G.wheelHeight * S - cz) * cw, spin = -tr.roll * cw;
    // the body's offset from its ring centre, turned about the creature's right axis by the spin (Ryaw Rpitch Ryaw^T)
    const vx = x - cx, vy = y - cy, vz = rootZ - cz, a = vx * cf + vy * sf, b = -vx * sf + vy * cf, c = vz, cs = Math.cos(spin), sn = Math.sin(spin);
    const a2 = a * cs + c * sn, c2 = -a * sn + c * cs;
    RING[0] = cx; RING[1] = cy; RING[2] = ty;
    pose(spin, cx + a2 * cf - b * sf, cy + a2 * sf + b * cf, ty + c2);
  }
  // ------------------------------------------------------------------ the legs
  for (let k = 0; k < 4; k++) {
    const L = LEGS[k], top = BI[L.top], hi = top * 3, can = (L.hind ? G.hindCannon : G.foreCannon) * S, footH = (G.foot + .01) * S, len = ((L.hind ? G.femur + G.tibia + G.hindCannon : G.humerus + G.radius + G.foreCannon)) * S;
    H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    const lift = tr.gait.out[k * 4 + 2]; let fx = tr.gait.out[k * 4], fy = tr.gait.out[k * 4 + 1], fz = env.z + footH + lift * G.footLift * S + (swim === 2 ? 0 : 0);
    const body = L.hind ? 'pelvis' : 'chest', bodyAt = (f, u, w) => { const p = boneLocalToWorld(P, body, f, L.side * (L.hind ? G.hipWidth : G.shoulderWidth) + 0, u, TMP); fx += (p[0] - fx) * w; fy += (p[1] - fy) * w; fz += (p[2] - fz) * w; };
    const jf = STEGO_SKELETON.bindWorld[hi] - STEGO_SKELETON.bindWorld[BI[body] * 3], ju = STEGO_SKELETON.bindWorld[hi + 2] - STEGO_SKELETON.bindWorld[BI[body] * 3 + 2];
    if (air > .1 || tr.sink > .3 && swim !== 2) bodyAt(jf + (L.hind ? -.05 : .06), ju - len / S * .9, 1);
    if (climbing) bodyAt(jf + (L.hind ? -.02 : .06) + (reduce ? 0 : .08 * Math.sin(t * 4.2 + (L.hind ? Math.PI : 0) + (L.side > 0 ? 0 : Math.PI))), ju - len / S * .84, Math.max(climb, .6));
    if (!L.hind) { const c = L.side > 0 ? V[KI.clawNear] : V[KI.clawFar], lifted = Math.max(V[KI.frontLift], c); if (lifted > .01) bodyAt(jf + .16 + .24 * c, ju - .24 + .42 * c, Math.min(1, lifted)); }
    if (L.hind && V[KI.kick] > .01) bodyAt(jf - .48, ju - .2, V[KI.kick]);
    if (V[KI.tuck] > .01) bodyAt(jf + (L.hind ? .12 : -.08), ju - len / S * .55, V[KI.tuck]);
    if (cw > .01) { fx += (RING[0] - fx) * cw * .7; fy += (RING[1] - fy) * cw * .7; fz += (RING[2] - fz) * cw * .7; }
    if (dead) { const p = boneLocalToWorld(P, 'root', L.hind ? -.02 : .44, L.side * .2, G.foot + .14 * smooth(death / .3), T); fx = p[0]; fy = p[1]; fz = p[2]; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    const fold = Math.max(V[KI.tuck], cw, V[KI.frontLift] * (L.hind ? 0 : 1)), bend = Math.min(1, lift * .9 + fold * .8), toe = climbing ? .6 : lift > 0 || fold > .05 ? -.5 * Math.max(lift, fold) : 0;
    LEGBONES[0] = top; LEGBONES[1] = BI[L.mid]; LEGBONES[2] = BI[L.low]; LEGBONES[3] = BI[L.foot];
    LENS[0] = (L.hind ? G.femur : G.humerus) * S; LENS[1] = (L.hind ? G.tibia : G.radius) * S; LENS[2] = can;
    // stego legs are columns: the low bone stands near upright
    poseAnimalLeg(P, LEGBONES, H, T, LENS, cf, sf, L.hind, bend, toe, L.hind ? -.08 - .5 * bend : .02 + .9 * bend);
    tr.frame.feet[k * 2] = tr.gait.out[k * 4 + 3]; tr.frame.feet[k * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1, angry = !!e.pack?.attack || !!e.stegoPose;
  F.emitK[0] = life * (angry || stun ? 1.5 : 1.15) + (reduce ? 0 : .08 * Math.sin(t * 2.3)) * life;
  F.emitK[1] = life * (.85 + 1.1 * V[KI.flare] + (name === 'whip' ? .4 : 0)); F.emitK[2] = 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = stegoMesh(F.tier); F.skin = P.skin; F.alpha = alpha; F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air + climb * G.climbLift * S; F.shadow = tr.sink > .5 ? 0 : 1 - Math.min(.6, F.air / (3 * S)); F.phase = name; F.contact = 0; F.cloud = false;
  return F;
}
export const stegoBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
