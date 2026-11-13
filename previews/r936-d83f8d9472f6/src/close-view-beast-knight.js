// The Nanobot Knight in Close View: the same knight as its standard-view art (monster-render.ts BODY.nanobotKnight: black plate
// with a red seam of light, flat-shaded and angular; a tall helm with a red visor slit and a spike; broad pauldrons; angular
// greaves on a wide stance; a long black greatsword with a red edge held low; an arm that opens into a cannon; a cape that is
// not cloth but the swarm itself, motes pouring off its shoulders and thinning to nothing; in mist only the swarm), as a solid
// skinned body on the shared beast rig (close-view-beast-rig.ts), animated from its real attack clocks (monster-pack.ts
// ATTACK_MODULES.knight*, KNIGHT). Every cut reaches its blow on the tick the game resolves it (`data.cutAt`), the slides and
// dashes skid, the thrust is outstretched while the game has it thrusting, the cannon opens and tracks the beam's real angle.
// Nothing here changes timing, damage, reach or targeting.
//
// Body units are the standard view's (a tile times the actor's scale). monster-pack.ts reaches close-view.ts, which loads this
// module before monster-pack.ts has finished loading, so its tables are read lazily (never at module load).
import { ATTACK_MODULES, BOSS_PACE, KNIGHT } from "./monster-pack.js?v=r936-d83f8d9472f6";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, boneLocalToWorld, writeSkin, solveTwoBone,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, easeOut, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r936-d83f8d9472f6";
import { KNIGHT_BODY } from "./close-view-beast-knight-body.js?v=r936-d83f8d9472f6";

function knightJoints() {
  const J = KNIGHT_BODY.joints, d = (a, b) => Math.hypot(J[a][0] - J[b][0], J[a][1] - J[b][1], J[a][2] - J[b][2]);
  return { hip: J.pelvis[2], hipWidth: Math.abs(J.thighR[1]), thigh: d('thighR', 'shinR'), shin: d('shinR', 'footR'), ankle: J.footR[2], upperArm: d('armR', 'foreR'), foreArm: d('foreR', 'handR'), shoulder: Math.abs(J.armR[1]) };
}
export const KNIGHT_RIG = Object.freeze({
  closeViewScale: 1.25, // a quarter larger than the standard view, like every Close View beast (presentation only)
  // the body's joints come from the converted human body (close-view-beast-knight-body.ts, Tim 2026-11-11: an RPG Character Pack
  // body, slightly longer and more slender than a human, 1.75 x the Wayfarer); the limb lengths are measured from them
  ...knightJoints(), blade: .85, stand: .03, // stand: knees a little bent at rest
  stride: .42, stance: .62, footLift: .07, settle: 6, stepAt: .07, stepTime: .28, turnRate: 6, standTurnRate: 5, attackTurnRate: 14,
  blendMs: 140, impactMs: 260, hitMs: 220, deathMs: 2200, breathe: .3, bob: .012, flowRate: .45, motes: 8,
  // body poses: crouch (hips down), lean (+ forward), twist (+ turns the right shoulder forward), head (+ up), the sword hand
  // (gripF, gripR, gripU: in the body's frame, model units) and the blade's direction (bladeF, bladeR, bladeU), cannon (0..1)
  poses: Object.freeze({
    idle: { crouch: .02, lean: .05, twist: 0, head: 0, gripF: .12, gripR: .23, gripU: 0.572, bladeF: .7, bladeR: .15, bladeU: -.55, cannon: 0 },
    ready: { crouch: .05, lean: .1, twist: -.1, head: 0, gripF: .2, gripR: .2, gripU: 0.66, bladeF: .85, bladeR: .05, bladeU: -.2, cannon: 0 },
    cutLoad: { crouch: .06, lean: -.05, twist: -.55, head: .05, gripF: -.04, gripR: .3, gripU: 1.045, bladeF: -.5, bladeR: .4, bladeU: .75, cannon: 0 },
    cutFore: { crouch: .08, lean: .22, twist: .55, head: -.05, gripF: .4, gripR: -.14, gripU: 0.682, bladeF: .6, bladeR: -.75, bladeU: -.2, cannon: 0 },
    loadBack: { crouch: .06, lean: .05, twist: .5, head: .05, gripF: .14, gripR: -.2, gripU: 1.045, bladeF: -.3, bladeR: -.6, bladeU: .75, cannon: 0 },
    cutBack: { crouch: .08, lean: .2, twist: -.5, head: -.05, gripF: .36, gripR: .3, gripU: 0.66, bladeF: .45, bladeR: .85, bladeU: -.1, cannon: 0 },
    slide: { crouch: .14, lean: .35, twist: -.2, head: .1, gripF: -.1, gripR: .28, gripU: 0.462, bladeF: -.85, bladeR: .25, bladeU: -.35, cannon: 0 },
    thrustLoad: { crouch: .08, lean: -.05, twist: -.4, head: .05, gripF: -.08, gripR: .24, gripU: 0.792, bladeF: 1, bladeR: 0, bladeU: .02, cannon: 0 },
    thrust: { crouch: .1, lean: .28, twist: .25, head: 0, gripF: .5, gripR: .06, gripU: 0.792, bladeF: 1, bladeR: 0, bladeU: 0, cannon: 0 },
    aimCannon: { crouch: .04, lean: .05, twist: .4, head: 0, gripF: .05, gripR: .25, gripU: 0.55, bladeF: .6, bladeR: .3, bladeU: -.6, cannon: 1 },
    summon: { crouch: .02, lean: -.08, twist: -.1, head: .3, gripF: .1, gripR: .16, gripU: 1.265, bladeF: .05, bladeR: 0, bladeU: 1, cannon: 0 },
    dazed: { crouch: .1, lean: .3, twist: .15, head: -.4, gripF: .2, gripR: .25, gripU: 0.44, bladeF: .5, bladeR: .2, bladeU: -.85, cannon: 0 },
  }),
});
const PK = ['crouch', 'lean', 'twist', 'head', 'gripF', 'gripR', 'gripU', 'bladeF', 'bladeR', 'bladeU', 'cannon'], K = PK.length;
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(KNIGHT_RIG.poses).map(([n, p]) => [n, Float64Array.from(PK.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
const R = KNIGHT_RIG, MOTES = R.motes;
const KJ = KNIGHT_BODY.joints, rel = (a, b) => b ? [KJ[a][0] - KJ[b][0], KJ[a][1] - KJ[b][1], KJ[a][2] - KJ[b][2]] : KJ[a].slice();
export const KNIGHT_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', at: rel('pelvis') },
  { name: 'thighL', parent: 'pelvis', at: rel('thighL', 'pelvis') }, { name: 'shinL', parent: 'thighL', at: rel('shinL', 'thighL') }, { name: 'footL', parent: 'shinL', at: rel('footL', 'shinL') },
  { name: 'thighR', parent: 'pelvis', at: rel('thighR', 'pelvis') }, { name: 'shinR', parent: 'thighR', at: rel('shinR', 'thighR') }, { name: 'footR', parent: 'shinR', at: rel('footR', 'shinR') },
  { name: 'spine', parent: 'pelvis', at: rel('spine', 'pelvis') }, { name: 'chest', parent: 'spine', at: rel('chest', 'spine') },
  { name: 'neck', parent: 'chest', at: rel('neck', 'chest') }, { name: 'head', parent: 'neck', at: rel('head', 'neck') },
  { name: 'armL', parent: 'chest', at: rel('armL', 'chest') }, { name: 'foreL', parent: 'armL', at: rel('foreL', 'armL') }, { name: 'handL', parent: 'foreL', at: rel('handL', 'foreL') },
  { name: 'cannon', parent: 'foreL', at: [0, 0, 0] }, // the forearm opened into a cannon (scaled up from nothing)
  { name: 'armR', parent: 'chest', at: rel('armR', 'chest') }, { name: 'foreR', parent: 'armR', at: rel('foreR', 'armR') }, { name: 'handR', parent: 'foreR', at: rel('handR', 'foreR') },
  { name: 'sword', parent: 'handR', at: [0, 0, 0] },
  // the cape: the swarm streaming back off the shoulders, four links
  { name: 'cape0', parent: 'chest', at: [-.09, 0, .07] }, { name: 'cape1', parent: 'cape0', at: [-.09, 0, -.2] }, { name: 'cape2', parent: 'cape1', at: [-.09, 0, -.2] }, { name: 'cape3', parent: 'cape2', at: [-.08, 0, -.19] },
  // motes flowing along the cape from the shoulders to the tail (placed each frame; in mist they are all there is)
  ...Array.from({ length: MOTES }, (_, i) => ({ name: 'mote' + i, parent: 'root', at: [0, 0, 0] })),
]);
const BI = KNIGHT_SKELETON.index;
const E_SEAM = 1, E_MUZZLE = 2, E_SPARK = 3;
const MIST_STRIKE = .22; // monster-pack.ts knightMist: toPhase(s, "strike", .22) after the travel

// ------------------------------------------------------------------------------------------------ the body
const C = Object.freeze({ plate: 0x2a2a33, lit: 0x40404c, bright: 0x464654, dark: 0x22222a, deep: 0x1c1c22, black: 0x101014, knee: 0x3a3a44, greave: 0x24242c, blade: 0x0a0a0e,
  helm: 0x2c2c36, spike: 0x16161c, red: 0xff2a2a, mote: 0x14121a, mote2: 0x201a28, guard: 0x30303a });
function buildKnightMesh(tier) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(KNIGHT_SKELETON, d), bw = KNIGHT_SKELETON.bindWorld;
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  const box = (bone, tone, p, size, o = {}) => B.bone(bone).color(tone, o.emit || 0).box({ at: at(bone, p), size, bevel: o.bevel ?? .2, taper: o.taper || 0, F: o.F, U: o.U });
  const h = (a, b = 0) => ((((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000) / 1000;
  // (Tim, 2026-11-11: "not so boxy ... he needs to look like a human ... use one of the models from the RPG creator"; "slightly
  // longer and slender ... and taller"): the converted human body, its limbs and torso in dark plate (the source texture's
  // light and shade kept as the plate's highlights), hands and feet darker; the armour below is fitted over it
  const J0 = KNIGHT_BODY.joints, hip = J0.pelvis[2], knee = J0.shinR[2], waist = J0.spine[2], chestZ = J0.chest[2], sh = J0.armR[2], headZ = J0.head[2];
  { const dec = (b64, T) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
    const P = dec(KNIGHT_BODY.positions, Float32Array), N = dec(KNIGHT_BODY.normals, Int8Array), Bn = dec(KNIGHT_BODY.bone, Uint8Array), Wt = dec(KNIGHT_BODY.weight, Uint8Array), L = dec(KNIGHT_BODY.shade, Uint8Array), IX = dec(full ? KNIGHT_BODY.indices : low ? KNIGHT_BODY.indicesLow : KNIGHT_BODY.indicesBalanced, Uint16Array);
    const names = KNIGHT_BODY.bones, lerp = (a, b, t) => { const c = (sh2) => Math.round(((a >> sh2) & 255) + ((((b >> sh2) & 255) - ((a >> sh2) & 255)) * t)); return (c(16) << 16) | (c(8) << 8) | c(0); };
    const base = (bn) => /hand|foot/.test(bn) ? [C.deep, C.lit] : /arm|fore|thigh|shin/.test(bn) ? [C.plate, C.bright] : [C.plate, C.bright];
    const ids = new Array(KNIGHT_BODY.vertexCount);
    for (let v = 0; v < KNIGHT_BODY.vertexCount; v++) { const a = names[Bn[v * 2]], b = names[Bn[v * 2 + 1]], [lo, hi] = base(a);
      ids[v] = B.vertexBlend(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], N[v * 3] / 127, N[v * 3 + 1] / 127, N[v * 3 + 2] / 127, a, b, Wt[v] / 255, lerp(lo, hi, Math.pow(L[v] / 255, 1.2))); }
    for (let i = 0; i < IX.length; i += 3) B.tri(ids[IX[i]], ids[IX[i + 1]], ids[IX[i + 2]]); }
  // ---- plate fitted over the limbs (pass: more fidelity where the budget allows): cuisses on the thighs, greaves on the shins
  // with a lit ridge down the front, vambraces on the forearms; each a shell hugging its bone, a little proud of the body
  if (!low) { const shell = (bone, x, y, z0, z1, r0, r1, tone) => B.bone(bone).color(tone).loft({ seg: full ? 10 : 7, up: [1, 0, 0],
      sections: [[z0, r0], [z0 + (z1 - z0) * .5, (r0 + r1) / 2 * 1.06], [z1, r1]].map(([z, r]) => ({ at: [x, y, z], rx: r, rz: r * 1.12, bones: [bone, bone, 0] })),
      tone: (i, k, st) => st > .55 ? C.lit : C.plate, caps: false });
    for (const tag of ['L', 'R']) { const t = J0['thigh' + tag], k = J0['shin' + tag], f = J0['foot' + tag], a = J0['arm' + tag], e = J0['fore' + tag], h = J0['hand' + tag];
      shell('thigh' + tag, t[0] + .005, t[1], t[2] - .04, k[2] + .05, .058, .046, C.plate);
      shell('shin' + tag, k[0] + .004, k[1], k[2] - .03, f[2] + .06, .046, .036, C.plate);
      if (full) box('shin' + tag, C.lit, [k[0] + .05, k[1], (k[2] + f[2]) / 2 + .01], [.006, .008, (k[2] - f[2]) * .38], { bevel: 0 });
      shell('fore' + tag, e[0], e[1], e[2] - .03, h[2] + .03, .036, .03, C.plate);
      void a; } }
  // ---- armour over it: knee cops, pointed sabatons; the faulds, tassets and tabard; the seams of light; the gorget
  for (const [s, tag] of [[-1, 'L'], [1, 'R']]) {
    const y = J0['thigh' + tag][1];
    B.bone('shin' + tag).color(C.knee).ellipsoid({ at: at('shin' + tag, [J0['shin' + tag][0] + .042, y, knee]), radius: [.022, .036, .03], rings: low ? 2 : 3, seg: low ? 5 : 7 }); // the knee cop
    box('foot' + tag, C.black, [J0['foot' + tag][0] + .06, y, .022], [.07, .034, .02], { taper: .4, skew: .025 }); // the pointed sabaton
  }
  if (!low) for (const s of [-1, 1]) box('pelvis', C.deep, [.0, s * .085, hip - .02], [.05, .04, .045], { taper: -.2, F: [1, 0, 0], U: [0, s * .25, 1] }); // tassets
  for (const sx of [1, -1]) { B.bone('pelvis').color(C.deep).box({ at: at('pelvis', [sx * .085, 0, hip - .07]), size: [.006, .05, .09], bevel: 0, taper: .3, F: [sx, 0, -.12 * sx], U: [sx * .15, 0, 1] });
    if (!low) B.color(C.red, E_SEAM).box({ at: at('pelvis', [sx * .1, 0, hip - .155]), size: [.004, .036, .003], bevel: 0, F: [sx, 0, 0] }); }
  box('spine', C.red, [.095, 0, waist], [.003, .08, .003], { bevel: 0, emit: E_SEAM }); // the seam across the waist
  box('chest', C.red, [.12, 0, chestZ], [.003, .003, .07], { bevel: 0, emit: E_SEAM }); // the seam, down the front
  if (!low) box('neck', C.deep, [J0.neck[0], 0, J0.neck[2] + .01], [.045, .05, .03], { taper: .2 }); // the gorget
  // ---- pauldrons: lean, swept, layered, angled down over the shoulders
  for (const [s, tag] of [[-1, 'L'], [1, 'R']]) {
    const y = J0['arm' + tag][1], ax = J0['arm' + tag][0];
    // a rounded shell over the shoulder, a lame below it, each a little out and down
    B.bone('arm' + tag).color(s > 0 ? C.bright : C.plate).lathe({ at: at('arm' + tag, [ax - .005, y - s * .015, sh + .005]), F: [0, s * .55, .85], U: [1, 0, 0], rings: [[0, .072], [.022, .068], [.042, .05], [.055, .026], [.06, 0]], rs: .85, seg: low ? 5 : 12, caps: false });
    if (!low) B.color(C.dark).lathe({ at: at('arm' + tag, [ax - .005, y + s * .012, sh - .035]), F: [0, s * .85, .5], U: [1, 0, 0], rings: [[0, .06], [.02, .055], [.03, 0]], rs: .85, seg: 8, caps: false });
    if (!low) box('fore' + tag, C.knee, [ax - .03, y, J0['fore' + tag][2]], [.022, .032, .022], { taper: .2 }); // the couter at the elbow
  }
  // the cannon in the left forearm: a barrel that slides out and opens, a red muzzle
  { const y = J0.foreL[1], el = J0.foreL[2];
    B.bone('cannon').color(C.plate).lathe({ at: at('cannon', [0, y, el]), F: [0, 0, -1], U: [1, 0, 0], rings: [[0, .036], [.12, .04], [.21, .048], [.25, .056]], seg: low ? 5 : 8, smooth: false, caps: true });
    if (!low) for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; B.color(C.bright).box({ at: at('cannon', [Math.cos(a) * .05, y + Math.sin(a) * .05, el - .19]), size: [.01, .01, .05], bevel: 0, F: [Math.cos(a), Math.sin(a), 0], U: [0, 0, 1] }); } // the opened plates
    B.color(C.red, E_MUZZLE).lathe({ at: at('cannon', [0, y, el - .255]), F: [0, 0, -1], U: [1, 0, 0], rings: [[0, .042], [.01, .038], [.012, 0]], seg: low ? 5 : 8, caps: false }); }
  // ---- the helm (Tim kept it: "I like his cone head ... the feather pointing off the top"): sculpted, rounded and tall, narrowing to a ridge, lit down the face; a red visor slit; a spike swept back
  { const hx = J0.head[0] + .008, H = [[-.1, .04, .044, .8], [-.055, .046, .05, .4], [-.015, .05, .054], [.03, .058, .064], [.09, .06, .068], [.14, .055, .063], [.18, .042, .05], [.205, .022, .03], [.215, 0, 0]];
    B.bone('head').color(C.helm).loft({ seg: low ? 7 : 16, up: [1, 0, 0], sections: H.map(([z, ry, rx, nw]) => ({ at: [hx, 0, headZ + z], rx: ry, rz: rx, bones: ['head', 'neck', nw || 0] })), // its neck guard follows the neck
      tone: (i, k, st) => st > .6 ? C.lit : st < -.5 ? C.deep : C.helm, caps: true });
    box('head', C.red, [hx + .067, 0, headZ + .1], [.003, .036, .005], { bevel: 0, emit: E_SEAM }); // the visor slit
    if (!low) box('head', C.dark, [hx + .052, 0, headZ + .055], [.012, .004, .045], { bevel: 0 }); // the ridge down the face
    B.bone('head').color(C.spike).lathe({ at: at('head', [hx - .02, 0, headZ + .19]), F: [-.45, 0, 1], U: [1, 0, 0], rings: [[0, .016], [.08, .009], [.15, 0]], seg: low ? 4 : 5, smooth: false }); }
  // ---- the greatsword (bound to the sword bone, along its +f): grip and pommel, a broad crossguard, the long black blade and
  // its red edge
  { const sw = bw[BI.sword * 3], sy = bw[BI.sword * 3 + 1], sz = bw[BI.sword * 3 + 2], P = (f, r, u) => [sw + f, sy + r, sz + u];
    box('sword', C.dark, P(-.05, 0, 0), [.05, .012, .012], { bevel: 0 });
    box('sword', C.lit, P(-.105, 0, 0), [.012, .018, .018], { bevel: 0 }); // the pommel
    box('sword', C.guard, P(.015, 0, 0), [.012, .02, .075], { bevel: .3 }); // the crossguard
    box('sword', C.blade, P(.035 + R.blade * .44, 0, 0), [R.blade * .44, .007, .032], { taper: .25, bevel: 0 });
    B.bone('sword').color(C.blade).poly([at('sword', P(.035 + R.blade * .88, 0, .024)), at('sword', P(.035 + R.blade, 0, 0)), at('sword', P(.035 + R.blade * .88, 0, -.024))]);
    B.bone('sword').color(C.blade).poly([at('sword', P(.035 + R.blade * .88, 0, -.024)), at('sword', P(.035 + R.blade, 0, 0)), at('sword', P(.035 + R.blade * .88, 0, .024))]);
    box('sword', C.red, P(.035 + R.blade * .44, 0, .028), [R.blade * .43, .009, .003], { bevel: 0, emit: E_SEAM }); } // the red edge
  // ---- the cape of motes: small dark facets streaming back off the shoulders, thinning toward the tail; a few red
  // fewer motes than before, so the budget goes to the body (Tim)
  const capeN = low ? 3 : full ? 36 : 22, cb = ['cape0', 'cape1', 'cape2', 'cape3'];
  for (let i = 0; i < capeN; i++) {
    const f = (i + .5) / capeN, seg = Math.min(2, Math.floor(f * 3)), w = f * 3 - seg, a = cb[seg], b2 = cb[seg + 1];
    const pa = [bw[BI[a] * 3], bw[BI[a] * 3 + 1], bw[BI[a] * 3 + 2]], pb = [bw[BI[b2] * 3], bw[BI[b2] * 3 + 1], bw[BI[b2] * 3 + 2]];
    const spread = .15 * (1 - f * .35), p = [pa[0] + (pb[0] - pa[0]) * w - .02 * h(i, 1), pa[1] + (pb[1] - pa[1]) * w + (h(i, 2) * 2 - 1) * spread, pa[2] + (pb[2] - pa[2]) * w + (h(i, 3) - .5) * .05];
    const sz = .026 * (1 - f * .6) + .007, red = i % 9 === 4;
    B.bone(w > .5 ? b2 : a).color(red ? C.red : i % 3 ? C.mote : C.mote2, red ? E_SPARK : 0).box({ at: at(w > .5 ? b2 : a, p), size: [sz, sz, sz], bevel: 0, F: [h(i, 4) - .5, h(i, 5) - .5, 1], U: [1, 0, 0] });
  }
  // the flowing motes: each mote bone carries a little cluster (placed along the cape, or swirling in mist, every frame)
  for (let m = 0; m < MOTES; m++) for (let k = 0; k < (low ? 1 : 4); k++) { const red = k === 3 && m % 2 === 0, sz = .016 + .008 * h(m, k);
    B.bone('mote' + m).color(red ? C.red : k % 2 ? C.mote : C.mote2, red ? E_SPARK : 0).box({ at: [(h(m, k + 7) - .5) * .06, (h(m, k + 9) - .5) * .06, (h(m, k + 11) - .5) * .06], size: [sz, sz, sz], bevel: 0, F: [h(m, k) - .5, .3, 1], U: [1, 0, 0] }); }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function knightMesh(tier = 'full') { return MESHES[tier] ||= buildKnightMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createKnightTrack() {
  return {
    pose: createPose(KNIGHT_SKELETON),
    gait: createGait([{ side: -.1, phase: .5 }, { side: .1, phase: 0 }]),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(K), shown: new Float64Array(K),
    hp: NaN, hitAt: -Infinity, hitSide: 1, impactAt: -Infinity, impactK: 0, contactWas: 0, cutSeen: -1, cutAt: -Infinity,
    mist: 0, deathAt: null, x: 0, y: 0, z: 0, deathDir: 1,
    frame: { kind: 'nanobotKnight', tier: 'full', mesh: null, skin: null, boneCount: KNIGHT_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ what it is doing
const V = new Float64Array(K), W = new Float64Array(K);
const setVec = (o, n) => o.set(POSE_VEC[n] || POSE_VEC.idle);
function lerpVec(o, a, b, t) { const A = POSE_VEC[a] || POSE_VEC.idle, Bv = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) o[k] = A[k] + (Bv[k] - A[k]) * t; }
function lerpInto(o, b, t) { const Bv = POSE_VEC[b] || POSE_VEC.idle; for (let k = 0; k < K; k++) o[k] += (Bv[k] - o[k]) * t; }
function phaseOf(pack, id) {
  const m = ATTACK_MODULES[id] || {}, dur = pack.phase === 'windup' ? (m.windup || .5) * (pack.paced ? BOSS_PACE.windup : 1) : pack.phase === 'active' ? m.active || 0 : pack.phase === 'recover' ? m.recover || .5 : 0;
  return dur > 0 ? clamp01(1 - (Number(pack.t) || 0) / dur) : 1;
}
// skid: the feet slide with the body (slides, dashes, thrusts); mist: dissolved to the swarm (0..1); charge: the cannon's glow
const ACT = { aim: false, aimX: 0, aimY: 0, watch: false, still: false, skid: false, contact: 0, phase: '', mist: 0, charge: 0, cannonAim: NaN, beat: 0 };
// a cut: from the pose that hits back toward the next load, then into the next blow as its tick comes (sub counts down to it)
function cutPose(lastFore, nextFore, y) {
  setVec(V, lastFore ? 'cutFore' : 'cutBack'); lerpInto(V, nextFore ? 'cutLoad' : 'loadBack', smooth(span(y, .25, .8))); if (y > .8) lerpInto(V, nextFore ? 'cutFore' : 'cutBack', easeIn(span(y, .8, 1)));
}
function act(e, tr, now, target) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, x = id ? phaseOf(s, id) : 0, K2 = KNIGHT;
  ACT.aim = false; ACT.watch = false; ACT.still = !!id; ACT.skid = false; ACT.contact = 0; ACT.phase = id ? `${id}:${ph}` : 'move'; ACT.mist = 0; ACT.charge = 0; ACT.cannonAim = NaN; ACT.beat = 0;
  const aimDir = (a) => { if (a && Math.hypot(a.x, a.y) > .01) { const l = Math.hypot(a.x, a.y); ACT.aimX = a.x / l; ACT.aimY = a.y / l; ACT.aim = true; } };
  const aimAt = (px, py) => aimDir({ x: px - e.x, y: py - e.y });
  if (e.mist && !id) { setVec(V, 'idle'); ACT.mist = 1; ACT.still = true; ACT.phase = 'mist'; return; } // its dodge: dissolved
  if (!id) { setVec(V, e.aggro ? 'ready' : 'idle'); ACT.watch = true; return; }
  if (target) aimAt(target.x, target.y);
  if (id === 'knightSlide') {
    aimDir(d.aim);
    if (ph === 'windup') lerpVec(V, 'ready', 'slide', smooth(x));
    else if (ph === 'active') {
      const n = d.cut || 0;
      if (d.mode === 'slide' || e.sliding) { setVec(V, 'slide'); ACT.skid = true; ACT.still = false; }
      else { const y = 1 - clamp01((d.sub ?? 0) / K2.slidePause); setVec(V, n % 2 ? 'cutFore' : 'cutBack'); lerpInto(V, 'slide', smooth(span(y, .4, 1))); ACT.contact = y < .3 ? 1 : 0; ACT.beat = n; }
    } else { setVec(V, (d.cut || 0) % 2 ? 'cutFore' : 'cutBack'); lerpInto(V, 'ready', smooth(x)); }
  } else if (id === 'knightCombo') {
    aimDir(d.aim);
    if (ph === 'windup') lerpVec(V, 'ready', 'cutLoad', smooth(x));
    else if (ph === 'active') {
      const cuts = d.cuts || 0, y = 1 - clamp01((d.sub ?? 0) / K2.comboPause);
      if (e.sliding) { setVec(V, 'slide'); ACT.skid = true; ACT.still = false; }
      else if (cuts === 0) { setVec(V, 'cutLoad'); if (y > .8) lerpInto(V, 'cutFore', easeIn(span(y, .8, 1))); }
      else cutPose((cuts - 1) % 2 === 0, cuts % 2 === 0, y);
      if (cuts > 0 && y < .2 && !e.sliding) ACT.contact = 1; ACT.beat = cuts;
    } else { setVec(V, (d.cuts || 0) % 2 ? 'cutFore' : 'cutBack'); lerpInto(V, 'ready', smooth(x)); }
  } else if (id === 'knightThrust') {
    if (d.dir) aimDir(d.dir);
    if (ph === 'windup') lerpVec(V, 'ready', 'thrustLoad', smooth(x / .8));
    else if (ph === 'active') { setVec(V, 'thrust'); ACT.skid = true; ACT.still = false; ACT.contact = s.hitOnce ? 1 : 0; }
    else { setVec(V, 'thrust'); lerpInto(V, 'ready', smooth(x)); }
  } else if (id === 'knightBackslash') {
    aimDir(d.aim);
    if (ph === 'windup') lerpVec(V, 'ready', 'loadBack', smooth(x));
    else if (ph === 'active') { setVec(V, d.cut ? 'cutBack' : 'loadBack'); if (!d.cut) lerpInto(V, 'cutBack', easeIn(x)); ACT.skid = true; ACT.contact = d.cut ? 1 : 0; }
    else { setVec(V, 'cutBack'); lerpInto(V, 'ready', smooth(x)); }
  } else if (id === 'knightMist' || id === 'blinkStrike') {
    // dissolves into the swarm, drifts, and comes together beside you mid-cut (the blink: a shimmer, then the cut)
    if (ph === 'windup') { lerpVec(V, 'ready', 'cutLoad', smooth(x)); ACT.mist = id === 'knightMist' ? easeIn(span(x, .3, 1)) : .35 * Math.sin(x * Math.PI); if (id === 'blinkStrike' && x > .82) lerpInto(V, 'cutFore', easeIn(span(x, .82, 1))); ACT.contact = id === 'blinkStrike' && x > .98 ? 1 : 0; }
    else if (ph === 'travel') { setVec(V, 'cutLoad'); ACT.mist = 1; }
    else if (ph === 'strike') { const st = clamp01(1 - (Number(s.t) || 0) / MIST_STRIKE); setVec(V, 'cutLoad'); lerpInto(V, 'cutFore', easeIn(st)); ACT.mist = 1 - smooth(st * 2); ACT.contact = st > .98 ? 1 : 0; }
    else { setVec(V, 'cutFore'); lerpInto(V, 'ready', smooth(x)); if (x < .1) ACT.contact = 1; }
  } else if (id === 'knightCannon') {
    // the left arm comes up along the beam and opens into the cannon; it charges (tracking), fires, closes
    if (Number.isFinite(d.angle)) { ACT.cannonAim = d.angle; aimDir({ x: Math.cos(d.angle - .35), y: Math.sin(d.angle - .35) }); }
    if (ph === 'windup') { lerpVec(V, 'ready', 'aimCannon', smooth(x / .4)); ACT.charge = .2 + .8 * x; }
    else if (ph === 'active') { setVec(V, 'aimCannon'); ACT.charge = 2; ACT.contact = 1; }
    else { lerpVec(V, 'aimCannon', 'ready', smooth(x)); ACT.charge = Math.max(0, 1 - x * 2); }
  } else if (id === 'knightSwordfall' || id === 'knightMissiles' || id === 'knightOrbs') {
    // raises the sword to the sky and the swords (or the missiles, the orbs) come; the blade drops as they are loosed
    if (ph === 'windup') { lerpVec(V, 'ready', 'summon', smooth(x / .7)); if (id === 'knightSwordfall' && x > .85) lerpInto(V, 'cutFore', easeIn(span(x, .85, 1)) * .6); ACT.contact = x > .98 ? 1 : 0; }
    else if (ph === 'active') { setVec(V, 'summon'); ACT.beat = 1; }
    else { setVec(V, 'summon'); lerpInto(V, 'ready', smooth(x)); }
  } else setVec(V, 'ready');
}

// ------------------------------------------------------------------------------------------------ the pose
const H = new Float64Array(3), T = new Float64Array(3), J = new Float64Array(3), POLE = new Float64Array(3), D = new Float64Array(3), CAPE = new Float64Array(15);
export function sampleKnight(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = KNIGHT_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  if (!dead) act(e, tr, now, env.target);
  else { setVec(V, 'dazed'); ACT.aim = false; ACT.watch = false; ACT.still = true; ACT.skid = false; ACT.contact = 0; ACT.phase = 'death'; ACT.mist = 0; ACT.charge = 0; ACT.cannonAim = NaN; ACT.beat = 0; }
  // facing
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let want = tr.yaw;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dy, dx);
  else if (ACT.watch && env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate; tr.yaw += Math.max(-1, Math.min(1, dt * rate)) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // crossfade between acts
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}` : dead ? 'death' : e.mist ? 'mist' : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs)) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < K; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  W.set(tr.shown);
  // the blow's shudder, hits, stagger
  if (ACT.contact && !tr.contactWas) { tr.impactAt = now; tr.impactK = 1; }
  tr.contactWas = ACT.contact;
  const impT = (now - tr.impactAt) / 1000, impact = impT < G.impactMs / 1000 ? kick(impT, 26, 10) : 0;
  W[1] += .06 * impact; W[0] += .02 * Math.abs(impact);
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 10) : 0;
  W[1] -= .25 * hit; W[2] -= .3 * hit * tr.hitSide; W[3] += .2 * hit;
  const stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0) { const dz = POSE_VEC.dazed; for (let k = 0; k < K; k++) W[k] += (dz[k] - W[k]) * stun; }
  const scat = dead ? 0 : Math.max(0, Number(e.scattered) || 0) / .45, jit = (n) => reduce || scat <= 0 ? 0 : Math.sin(t * 60 + n * 7) * .03 * Math.min(1, scat);
  // mist: the armour goes, the swarm stays
  tr.mist += ((dead ? 0 : ACT.mist) - tr.mist) * Math.min(1, dt * 14); const mist = clamp01(tr.mist);
  // gait: two feet, planted; skidding (slides, dashes, thrusts, the hop back), the feet slide braced with the body
  const air = dead ? 0 : Math.max(0, Number(e.hopLift) || 0);
  const still = ACT.still || ACT.skid || air > .05 || dead || mist > .5 || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.stride * S, stance: G.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  resetPose(P);
  let alpha = 1, fall = 0;
  if (e.fleeFade != null) alpha = clamp01(e.fleeFade);
  if (dead) { // to its knees, then it comes apart into the swarm
    const kneel = smooth(death / .3); W[0] = .26 * kneel; W[1] = .55 * kneel; W[3] = -.5 * kneel; fall = smooth(span(death, .35, .8));
    alpha *= 1 - span(death, .85, 1);
  }
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z + air);
  const breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe);
  const bob = moving * G.bob * (.5 - .5 * Math.cos(cyc * 2)), sway = moving * .01 * Math.sin(cyc);
  setOffset(P, BI.pelvis, jit(1), sway + jit(2), -W[0] - bob - G.stand); setEuler(P, BI.pelvis, W[2] * .25, W[1] * .3, -sway * 1.5); P.scl[BI.pelvis] = Math.max(.001, (1 - mist) * (1 - fall)); resolveBone(P, BI.pelvis);
  setEuler(P, BI.spine, W[2] * .35, W[1] * .35, 0); resolveBone(P, BI.spine);
  setOffset(P, BI.chest, jit(3), jit(4), 0); setEuler(P, BI.chest, W[2] * .4, W[1] * .35, (reduce ? 0 : .01 * wobble(t * .8, 1))); P.scl[BI.chest] = 1 + breathe * .006; resolveBone(P, BI.chest);
  let look = 0;
  if (env.target && !dead && !ACT.contact) { const lx = env.target.x - e.x, ly = env.target.y - e.y, a = Math.atan2(ly, lx) - yaw; look = Math.max(-.8, Math.min(.8, Math.atan2(Math.sin(a), Math.cos(a)))); }
  setEuler(P, BI.neck, (look - W[2]) * .3, -W[3] * .4 - W[1] * .3, 0); resolveBone(P, BI.neck);
  setOffset(P, BI.head, jit(5), jit(6), 0); setEuler(P, BI.head, (look - W[2]) * .4, -W[3] * .5 - W[1] * .3, 0); resolveBone(P, BI.head);
  // the sword arm: the hand to its grip (in the body's frame), the blade along its line; elbow out and down
  const rootW = P.wr, ri = BI.root * 9, fwX = rootW[ri] / S, fwY = rootW[ri + 1] / S, rtX = rootW[ri + 3] / S, rtY = rootW[ri + 4] / S;
  const bodyPt = (f, r, u, out) => { out[0] = x + (fwX * f + rtX * r) * S; out[1] = y + (fwY * f + rtY * r) * S; out[2] = env.z + air + (u - W[0] - G.stand) * S; return out; };
  // twist and lean move the hand with the shoulders: rotate the grip about the spine
  const tw = W[2] * .6, ct = Math.cos(tw), st2 = Math.sin(tw), gf = W[4] * ct - W[5] * st2, gr = W[4] * st2 + W[5] * ct;
  bodyPt(gf, gr, W[6], T);
  for (const [tag, s] of [['R', 1], ['L', -1]]) {
    const ai = BI['arm' + tag]; resolveBone(P, ai); H[0] = P.wp[ai * 3]; H[1] = P.wp[ai * 3 + 1]; H[2] = P.wp[ai * 3 + 2];
    if (s < 0) { // the cannon arm: at its side, or straight out along the beam
      const cn = clamp01(W[10]);
      bodyPt(.04, -.2, .55, T);
      if (cn > 0) { const a = Number.isFinite(ACT.cannonAim) ? ACT.cannonAim : yaw, reach = (G.upperArm + G.foreArm) * S * .97, ux = Math.cos(a), uy = Math.sin(a);
        T[0] += (H[0] + ux * reach - T[0]) * cn; T[1] += (H[1] + uy * reach - T[1]) * cn; T[2] += (H[2] - .02 * S - T[2]) * cn; }
    } else bodyPt(gf, gr, W[6], T);
    POLE[0] = -fwX * .3 + rtX * s * .6; POLE[1] = -fwY * .3 + rtY * s * .6; POLE[2] = -.6;
    solveTwoBone(H, T, G.upperArm * S, G.foreArm * S, POLE, J);
    aimWorld(P, ai, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], fwX, fwY, 0); resolveBone(P, ai);
    const fi = BI['fore' + tag]; aimWorld(P, fi, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], fwX, fwY, 0); resolveBone(P, fi);
    const hi = BI['hand' + tag];
    if (s > 0) { // the blade's line, turned with the shoulders
      let bf = W[7] * ct - W[8] * st2, br = W[7] * st2 + W[8] * ct, bu = W[9]; const l = Math.hypot(bf, br, bu) || 1; bf /= l; br /= l; bu /= l;
      D[0] = fwX * bf + rtX * br; D[1] = fwY * bf + rtY * br; D[2] = bu;
      aimWorld(P, hi, 0, D[0], D[1], D[2], 0, 0, 1); resolveBone(P, hi);
      const swd = BI.sword; aimWorld(P, swd, 0, D[0], D[1], D[2], 0, 0, 1); resolveBone(P, swd);
    } else { resolveBone(P, hi); P.scl[BI.cannon] = Math.max(.001, clamp01(W[10]) * (1 - mist)); resolveBone(P, BI.cannon); }
  }
  // the cape: the swarm streams back from the shoulders, lifting and blowing out behind as it moves; ripples at rest
  const stream = Math.min(1, moving + (ACT.skid ? 1.2 : 0) + air);
  for (let i = 0; i < 4; i++) { const b = BI['cape' + i], wave = reduce ? 0 : Math.sin(t * 2.4 - i * 1.1) * (.06 + .04 * i) * (1 + stream);
    setEuler(P, b, wave * .6, (i === 0 ? .3 : .05) - stream * (.25 + .1 * i) + W[1] * (i === 0 ? -.4 : 0), wave); P.scl[b] = 1 - mist * .4; resolveBone(P, b); }
  // the flowing motes: along the cape (shoulders to tail, then gone), or a swirl where the body was
  for (let i = 0; i < 4; i++) { const b = BI['cape' + i] * 3; CAPE[i * 3] = P.wp[b]; CAPE[i * 3 + 1] = P.wp[b + 1]; CAPE[i * 3 + 2] = P.wp[b + 2]; }
  { const c3 = BI.cape3 * 9; CAPE[12] = CAPE[9] + P.wr[c3] * -.12 + P.wr[c3 + 6] * -.12; CAPE[13] = CAPE[10] + P.wr[c3 + 1] * -.12 + P.wr[c3 + 7] * -.12; CAPE[14] = CAPE[11] + P.wr[c3 + 2] * -.12 + P.wr[c3 + 8] * -.12; }
  const flowT = reduce ? 0 : t * G.flowRate * (1 + stream);
  for (let m = 0; m < MOTES; m++) {
    const b = BI['mote' + m], f = (flowT + m / MOTES) % 1, sg = Math.min(3, Math.floor(f * 4)), w = f * 4 - sg;
    let px = CAPE[sg * 3] + (CAPE[sg * 3 + 3] - CAPE[sg * 3]) * w, py = CAPE[sg * 3 + 1] + (CAPE[sg * 3 + 4] - CAPE[sg * 3 + 1]) * w, pz = CAPE[sg * 3 + 2] + (CAPE[sg * 3 + 5] - CAPE[sg * 3 + 2]) * w;
    let sc = (1 - f * .8);
    const swirl = Math.max(mist, fall);
    if (swirl > 0) { // in mist (or dissolving in death): a cloud of the swarm turning where the body stood
      const a = m / MOTES * Math.PI * 2 + (reduce ? 0 : t * 3), r = (.2 + .1 * Math.sin(m * 1.7 + t)) * S * (1 + fall * 2), hz = env.z + air + (.25 + .6 * ((m * .37) % 1)) * S * (1 - fall * .6);
      px += (x + Math.cos(a) * r - px) * swirl; py += (y + Math.sin(a) * r - py) * swirl; pz += (hz - pz) * swirl; sc += (1.6 - sc) * swirl;
    }
    setEuler(P, b, (reduce ? 0 : t * 2) + m, 0, 0); P.scl[b] = Math.max(.001, sc * (dead ? 1 - span(death, .8, 1) : 1)); P.off[b * 3] = 0; resolveBone(P, b, 0, 0, 0);
    P.wp[b * 3] = px; P.wp[b * 3 + 1] = py; P.wp[b * 3 + 2] = pz; // placed directly in the world
  }
  // legs: two-bone IK to planted feet; skidding, the feet slide with the body, braced (front foot forward)
  for (let side = 0; side < 2; side++) {
    const tag = side ? 'R' : 'L', sgn = side ? 1 : -1, ti = BI['thigh' + tag];
    resolveBone(P, ti); const hi = ti * 3; H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    let fx = tr.gait.out[side * 4], fy = tr.gait.out[side * 4 + 1], lift = tr.gait.out[side * 4 + 2], fz = env.z + G.ankle * S + lift * G.footLift * S;
    if (ACT.skid || air > .05 || mist > .5 || dead) { const lead = ACT.skid ? (side ? -.16 : .2) : 0, spread = ACT.skid ? .14 : .11;
      fx = x + (fwX * lead + rtX * sgn * spread) * S; fy = y + (fwY * lead + rtY * sgn * spread) * S; fz = env.z + air + (G.ankle + (air > .05 ? .08 : 0)) * S; }
    T[0] = fx; T[1] = fy; T[2] = fz;
    POLE[0] = fwX; POLE[1] = fwY; POLE[2] = .05; // knees forward
    solveTwoBone(H, T, G.thigh * S, G.shin * S, POLE, J);
    aimWorld(P, ti, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, ti);
    const si2 = BI['shin' + tag]; aimWorld(P, si2, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, si2);
    const toe = lift > 0 ? -.35 * lift : 0, fi = BI['foot' + tag], fyaw = yaw + sgn * .12;
    aimWorld(P, fi, 0, Math.cos(fyaw) * Math.cos(toe), Math.sin(fyaw) * Math.cos(toe), Math.sin(toe), 0, 0, 1); resolveBone(P, fi);
    tr.frame.feet[side * 2] = tr.gait.out[side * 4 + 3]; tr.frame.feet[side * 2 + 1] = lift;
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 1.5) : 1;
  F.emitK[0] = life * (1.1 + (reduce ? 0 : .15 * Math.sin(t * 3.1)) + (ACT.contact ? .6 : 0)); // the seam, visor and edge
  F.emitK[1] = Math.min(3, ACT.charge * (1 + (reduce ? 0 : .25 * Math.sin(t * 30)))); // the cannon's muzzle
  F.emitK[2] = life * 1.2; F.emitK[3] = 0;
  F.emitA[0] = 1 - mist; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = knightMesh(F.tier); F.skin = P.skin; F.alpha = alpha * (scat > 0 ? .7 + .3 * (1 - Math.min(1, scat)) : 1);
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air; F.shadow = (1 - mist * .8) * (1 - fall); F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = false;
  return F;
}
export const knightBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
