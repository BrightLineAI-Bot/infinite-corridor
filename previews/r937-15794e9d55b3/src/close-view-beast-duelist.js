// The Gaunt in Close View (duelists.ts; Tim, 2026-11-12: "in close view they walk around and swing their swords... hoods over their
// faces (use the rogue's hood to cover their whole faces)... slightly taller than the Wayfarer"). One body for the three kinds: the
// RPG Character Pack Rogue converted for the shared beast rig (close-view-beast-duelist-body.ts, made by
// docs/asset-sources/hooded-duelist/convert-duelist.mjs): the Rogue's own hood kept and its face turned to the dark inside the cowl,
// limbs and torso slimmed to about half their thickness about their bones, the head a tenth larger, the hands a fifth larger, the
// whole 1.1 x the Wayfarer's Close View height. Each kind carries its own weapon (a long sword; two knives; a polearm) and its own
// shade of wraps, all on the same skeleton, animated from the game's own clocks (monster-pack.ts duelCombo, duelTwinCuts, duelThrust,
// duelSweep and the hop, DUELISTS): each cut reaches its blow on the tick the game resolves it, the dart and the hop carry the body,
// it faces the Wayfarer while it circles (so a strafe reads as a strafe), it flinches when struck and folds when it dies.
// Nothing here changes timing, damage, reach or targeting.
//
// Body units are the standard view's (a tile times the actor's scale). monster-pack.ts reaches close-view.ts, which loads this module
// before monster-pack.ts has finished loading, so its tables are read lazily (never at module load).
import { DUELISTS } from "./duelists.js?v=r937-15794e9d55b3";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, solveTwoBone,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, span, kick, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r937-15794e9d55b3";
import { DUELIST_BODY } from "./close-view-beast-duelist-body.js?v=r937-15794e9d55b3";

// The Wayfarer's Close View height in tiles (close-view.ts: the imported hero is drawn 1.68 x .82 tall); the Gaunt stand 1.1 x that.
export const WAYFARER_CV_HEIGHT = 1.68 * .82;
function measure() {
  const J = DUELIST_BODY.joints, d = (a, b) => Math.hypot(J[a][0] - J[b][0], J[a][1] - J[b][1], J[a][2] - J[b][2]);
  return { hip: J.pelvis[2], thigh: d('thighR', 'shinR'), shin: d('shinR', 'footR'), ankle: J.footR[2], upperArm: d('armR', 'foreR'), foreArm: d('foreR', 'handR'), height: DUELIST_BODY.height };
}
// A pose: crouch (hips down), lean (+ forward), twist (+ turns the right shoulder forward), head (+ up); the weapon hand (grip) and
// its blade's direction, the off hand and its blade's direction (a knife's; for the polearm the off hand rides the shaft), all in the
// body's frame: f forward, r to its right, u up from the ground (model units).
const P = (crouch, lean, twist, head, grip, blade, off = [.02, -.2, .52], offBlade = [.7, 0, -.5]) => Object.freeze({ crouch, lean, twist, head, grip, blade, off, offBlade });
export const DUELIST_RIG = Object.freeze({
  closeViewScale: 1, // the body is already built 1.1 x the Wayfarer at the standard view's scale (presentation only)
  ...measure(), grip: .055, stand: .02, airScale: .5, // grip: the weapon sits this far down the fist; air: Close View lift per unit of hopLift
  stride: .36, stance: .5, footLift: .09, settle: 7, stepAt: .06, stepTime: .22, turnRate: 9, standTurnRate: 7, attackTurnRate: 16, watchRange: 7,
  blendMs: 110, hitMs: 260, deathMs: 1800, breathe: .35, bob: .018, runLean: .12, armSwing: .16,
  weapon: Object.freeze({ gauntDuelist: "sword", gauntCutthroat: "daggers", gauntLongarm: "polearm" }),
  sword: Object.freeze({ blade: .64, width: .026, grip: .1 }), knife: Object.freeze({ blade: .27, width: .022, grip: .07 }),
  polearm: Object.freeze({ front: 1.02, back: .5, head: .3, width: .05, shaft: .016, offAt: .34 }),
  poses: Object.freeze({
    sword: Object.freeze({
      idle: P(.02, .04, 0, 0, [.12, .2, .55], [.6, .12, -.6]),
      ready: P(.05, .1, -.1, 0, [.2, .14, .72], [.7, -.12, .5], [.1, -.18, .62]),
      load0: P(.06, -.06, -.5, .05, [-.02, .24, 1.02], [-.3, .35, .85], [.18, -.12, .72]),
      cut0: P(.09, .22, .5, -.05, [.32, -.1, .62], [.55, -.75, -.32], [-.04, -.24, .6]),
      load1: P(.07, .08, .45, 0, [.14, -.2, .92], [-.15, -.62, .72], [-.02, -.26, .62]),
      cut1: P(.1, .24, -.45, -.05, [.32, .28, .64], [.55, .78, -.22], [.12, -.16, .64]),
      load2: P(.06, -.08, -.1, .1, [.04, .1, 1.1], [-.25, .05, 1], [.16, -.14, .76]),
      cut2: P(.13, .3, .05, -.12, [.38, .04, .56], [.8, 0, -.58], [.06, -.22, .58]),
      stagger: P(.08, -.22, .3, .2, [.06, .24, .6], [.4, .4, -.6], [-.08, -.24, .6]),
      air: P(-.02, .14, 0, .05, [.16, .2, .78], [.6, .2, .2], [.0, -.26, .8]),
    }),
    daggers: Object.freeze({
      idle: P(.02, .05, 0, 0, [.14, .18, .55], [.7, .1, -.45], [.14, -.18, .55], [.7, -.1, -.45]),
      ready: P(.06, .14, 0, 0, [.22, .15, .7], [.8, .15, .3], [.18, -.16, .66], [.8, -.15, .3]),
      crouch: P(.13, .34, 0, .05, [.0, .24, .62], [.35, .55, .25], [.04, -.24, .62], [.35, -.55, .25]),
      dart: P(.09, .45, 0, .1, [.34, .13, .72], [1, .05, .05], [.3, -.13, .74], [1, -.05, .05]),
      cutA: P(.1, .32, .4, 0, [.36, -.1, .66], [.4, -.9, -.12], [.18, -.22, .7], [.8, -.2, .2]),
      cutB: P(.1, .3, -.4, 0, [.2, .22, .7], [.8, .2, .2], [.36, .1, .66], [.4, .9, -.12]),
      stagger: P(.08, -.22, .2, .2, [.08, .22, .6], [.5, .3, -.5], [.08, -.22, .6], [.5, -.3, -.5]),
      air: P(-.02, .2, 0, .05, [.18, .2, .8], [.7, .3, .3], [.16, -.2, .8], [.7, -.3, .3]),
    }),
    polearm: Object.freeze({
      idle: P(.02, .04, 0, 0, [.06, .18, .6], [.5, -.05, .86]),
      ready: P(.05, .08, -.1, 0, [.0, .17, .64], [.93, -.06, .36]),
      aim: P(.07, -.08, -.25, 0, [-.18, .16, .67], [1, -.03, .06]),
      thrust: P(.08, .32, .25, -.05, [.3, .1, .68], [1, -.03, .03]),
      wind: P(.1, -.08, -.75, .05, [-.06, .27, .76], [-.12, .95, .26]),
      swept: P(.14, .18, .75, -.05, [.16, -.12, .6], [.28, -.95, -.12]),
      stagger: P(.08, -.22, .2, .2, [.0, .2, .62], [.6, -.1, .8]),
      air: P(-.02, .12, 0, .05, [.02, .2, .76], [.8, -.05, .58]),
    }),
  }),
});
const PK = 16; // crouch, lean, twist, head, grip(3), blade(3), off(3), offBlade(3)
const vecOf = (p) => Float64Array.from([p.crouch, p.lean, p.twist, p.head, ...p.grip, ...p.blade, ...p.off, ...p.offBlade]);
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(DUELIST_RIG.poses).map(([wk, set]) => [wk, Object.freeze(Object.fromEntries(Object.entries(set).map(([n, p]) => [n, vecOf(p)])))])));

// ------------------------------------------------------------------------------------------------ skeleton
const R = DUELIST_RIG, DJ = DUELIST_BODY.joints, rel = (a, b) => b ? [DJ[a][0] - DJ[b][0], DJ[a][1] - DJ[b][1], DJ[a][2] - DJ[b][2]] : DJ[a].slice();
export const DUELIST_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', at: rel('pelvis') },
  { name: 'thighL', parent: 'pelvis', at: rel('thighL', 'pelvis') }, { name: 'shinL', parent: 'thighL', at: rel('shinL', 'thighL') }, { name: 'footL', parent: 'shinL', at: rel('footL', 'shinL') },
  { name: 'thighR', parent: 'pelvis', at: rel('thighR', 'pelvis') }, { name: 'shinR', parent: 'thighR', at: rel('shinR', 'thighR') }, { name: 'footR', parent: 'shinR', at: rel('footR', 'shinR') },
  { name: 'spine', parent: 'pelvis', at: rel('spine', 'pelvis') }, { name: 'chest', parent: 'spine', at: rel('chest', 'spine') },
  { name: 'neck', parent: 'chest', at: rel('neck', 'chest') }, { name: 'head', parent: 'neck', at: rel('head', 'neck') },
  { name: 'armL', parent: 'chest', at: rel('armL', 'chest') }, { name: 'foreL', parent: 'armL', at: rel('foreL', 'armL') }, { name: 'handL', parent: 'foreL', at: rel('handL', 'foreL') },
  { name: 'armR', parent: 'chest', at: rel('armR', 'chest') }, { name: 'foreR', parent: 'armR', at: rel('foreR', 'armR') }, { name: 'handR', parent: 'foreR', at: rel('handR', 'foreR') },
  // the weapons, in the fists (a little down each hand) along their bone's +f
  { name: 'weaponR', parent: 'handR', at: [0, 0, -R.grip] }, { name: 'weaponL', parent: 'handL', at: [0, 0, -R.grip] },
]);
const BI = DUELIST_SKELETON.index;

// ------------------------------------------------------------------------------------------------ the bodies
// The palettes (Tim left the colour to us): ash-grey or bone wraps, a charcoal cowl with only dark inside it, a dull crimson sash,
// bone-wrapped hands, grey steel. Each class is [shadow, light]; the source texture's shade picks between them. No glow anywhere.
const SHARED = { cowl: [0x1d1d22, 0x34343b], void: [0x060607, 0x0d0d10], hand: [0x9c937f, 0xd2c8b0], guard: [0x2a2725, 0x4a4542], boot: [0x1f1d1b, 0x3a3633],
  steel: 0xb9bec7, edge: 0xe6eaf0, dark: 0x2a2a30, wood: 0x3b2e24, band: 0x6e2626 };
export const DUELIST_PALETTES = Object.freeze({
  gauntDuelist: Object.freeze({ ...SHARED, wrap: [0x5a5650, 0x88837a], wrapDark: [0x3a3835, 0x5a5650], sash: [0x5a1e1f, 0x8a3030] }),
  gauntCutthroat: Object.freeze({ ...SHARED, wrap: [0x4c4944, 0x726d66], wrapDark: [0x302e2c, 0x4c4844], sash: [0x4e1a1b, 0x7a2828] }),
  gauntLongarm: Object.freeze({ ...SHARED, wrap: [0x6c6760, 0x9a9488], wrapDark: [0x403d39, 0x625d57], sash: [0x4a1a20, 0x74283a] }),
});
function lerpRGB(a, b, t) { const c = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (c(16) << 16) | (c(8) << 8) | c(0); }
function decode(b64, T) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); }
function buildDuelistMesh(kind, tier) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(DUELIST_SKELETON, d), bw = DUELIST_SKELETON.bindWorld, C = DUELIST_PALETTES[kind] || DUELIST_PALETTES.gauntDuelist;
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  const box = (bone, tone, p, size, o = {}) => B.bone(bone).color(tone).box({ at: at(bone, p), size, bevel: o.bevel ?? .2, taper: o.taper || 0, F: o.F, U: o.U });
  // ---- the converted body: every vertex on its two bones, coloured by its class from its kind's palette, shaded from the source
  { const Pz = decode(DUELIST_BODY.positions, Float32Array), N = decode(DUELIST_BODY.normals, Int8Array), Bn = decode(DUELIST_BODY.bone, Uint8Array), Wt = decode(DUELIST_BODY.weight, Uint8Array), L = decode(DUELIST_BODY.shade, Uint8Array), K = decode(DUELIST_BODY.cls, Uint8Array);
    const IX = decode(full ? DUELIST_BODY.indices : low ? DUELIST_BODY.indicesLow : DUELIST_BODY.indicesBalanced, Uint16Array), names = DUELIST_BODY.bones, classes = DUELIST_BODY.classes, ids = new Array(DUELIST_BODY.vertexCount);
    for (let v = 0; v < DUELIST_BODY.vertexCount; v++) { const [lo, hi] = C[classes[K[v]]] || C.wrap;
      ids[v] = B.vertexBlend(Pz[v * 3], Pz[v * 3 + 1], Pz[v * 3 + 2], N[v * 3] / 127, N[v * 3 + 1] / 127, N[v * 3 + 2] / 127, names[Bn[v * 2]], names[Bn[v * 2 + 1]], Wt[v] / 255, lerpRGB(lo, hi, Math.pow(L[v] / 255, 1.1))); }
    for (let i = 0; i < IX.length; i += 3) B.tri(ids[IX[i]], ids[IX[i + 1]], ids[IX[i + 2]]); }
  // ---- the weapons (each along its bone's +f from the fist)
  const wpn = R.weapon[kind] || 'sword', W0 = (bone) => [bw[BI[bone] * 3], bw[BI[bone] * 3 + 1], bw[BI[bone] * 3 + 2]];
  const blade = (bone, S, along0) => { // a grip, a small guard, a tapered blade and its point
    const [x, y, z] = W0(bone), Q = (f, r, u) => [x + f, y + r, z + u], L = S.blade;
    box(bone, C.band, Q(-S.grip * .35, 0, 0), [S.grip * .65, .012, .012], { bevel: 0 });
    box(bone, C.dark, Q(S.grip * .4, 0, 0), [.01, .018, S.width * 2.1], { bevel: low ? 0 : .3 });
    box(bone, C.steel, Q(S.grip * .4 + L * .44 + along0, 0, 0), [L * .44, .005, S.width], { taper: .25, bevel: 0 });
    B.bone(bone).color(C.edge).poly([at(bone, Q(S.grip * .4 + L * .88 + along0, 0, S.width * .8)), at(bone, Q(S.grip * .4 + L + along0, 0, 0)), at(bone, Q(S.grip * .4 + L * .88 + along0, 0, -S.width * .8))]);
    B.bone(bone).color(C.edge).poly([at(bone, Q(S.grip * .4 + L * .88 + along0, 0, -S.width * .8)), at(bone, Q(S.grip * .4 + L + along0, 0, 0)), at(bone, Q(S.grip * .4 + L * .88 + along0, 0, S.width * .8))]);
    if (!low) box(bone, C.edge, Q(S.grip * .4 + L * .44 + along0, 0, S.width * .9), [L * .42, .006, .003], { bevel: 0 }); // the lit edge
  };
  if (wpn === 'sword') blade('weaponR', R.sword, 0);
  else if (wpn === 'daggers') { blade('weaponR', R.knife, 0); blade('weaponL', R.knife, 0); }
  else { // the polearm: a long dark shaft through both fists, bound in crimson below a curved glaive's blade; a butt spike behind
    const S = R.polearm, [x, y, z] = W0('weaponR'), Q = (f, r, u) => [x + f, y + r, z + u];
    B.bone('weaponR').color(C.wood).lathe({ at: at('weaponR', Q(-S.back, 0, 0)), F: [1, 0, 0], U: [0, 0, 1], rings: [[0, S.shaft * .8], [S.back + S.front, S.shaft]], seg: low ? 4 : 6, smooth: true, caps: false });
    box('weaponR', C.band, Q(S.front - .03, 0, 0), [.035, S.shaft * 1.5, S.shaft * 1.5], { bevel: 0 });
    B.bone('weaponR').color(C.dark).lathe({ at: at('weaponR', Q(-S.back, 0, 0)), F: [-1, 0, 0], U: [0, 0, 1], rings: [[0, S.shaft], [.07, 0]], seg: 4, smooth: false, caps: false }); // the butt spike
    const h = S.head, base = S.front, w = S.width, pts = [[base, -w * .4], [base + h * .35, -w * 1.1], [base + h * .75, -w * .9], [base + h, w * .5], [base + h * .6, w * .7], [base, w * .5]];
    B.bone('weaponR').color(C.steel).slab({ at: at('weaponR', Q(0, 0, 0)), F: [1, 0, 0], U: [0, 0, 1], thick: .008, points: pts, bevel: low ? 0 : .003 });
    if (!low) B.bone('weaponR').color(C.edge).slab({ at: at('weaponR', Q(0, 0, 0)), F: [1, 0, 0], U: [0, 0, 1], thick: .0085, points: [[base + h * .35, -w * 1.12], [base + h * .75, -w * .92], [base + h, w * .5], [base + h * .97, w * .38], [base + h * .72, -w * .8], [base + h * .34, -w * .98]] });
  }
  return B.done();
}
const MESHES = new Map();
export function duelistMesh(tier = 'full', foe = null) { const kind = foe?.kind in R.weapon ? foe.kind : 'gauntDuelist', key = `${kind}:${tier}`; let m = MESHES.get(key); if (!m) { m = buildDuelistMesh(kind, tier); MESHES.set(key, m); } return m; }
export const duelistMeshFor = (kind, tier = 'full') => duelistMesh(tier, { kind });

// ------------------------------------------------------------------------------------------------ the track
export function createDuelistTrack() {
  return {
    pose: createPose(DUELIST_SKELETON),
    gait: createGait([{ side: -.08, phase: .5 }, { side: .08, phase: 0 }]),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(PK), shown: new Float64Array(PK),
    hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null, x: 0, y: 0, z: 0, px: NaN, py: NaN, pace: 0, contactWas: 0,
    frame: { kind: 'gauntDuelist', tier: 'full', mesh: null, skin: null, boneCount: DUELIST_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ what it is doing
const V = new Float64Array(PK), Wv = new Float64Array(PK);
let SET = POSE_VEC.sword;
const setVec = (n) => V.set(SET[n] || SET.idle || SET.ready);
function lerpVec(a, b, t) { const A = SET[a] || SET.ready, Bv = SET[b] || SET.ready; for (let k = 0; k < PK; k++) V[k] = A[k] + (Bv[k] - A[k]) * t; }
function lerpInto(b, t) { const Bv = SET[b] || SET.ready; for (let k = 0; k < PK; k++) V[k] += (Bv[k] - V[k]) * t; }
const ACT = { aim: false, aimX: 0, aimY: 0, watch: false, still: false, skid: false, contact: 0, phase: '' };
const phaseLen = (id, ph, data) => { const A = DUELISTS.attacks[id]; if (!A) return .5; return ph === 'windup' ? A.windup + (data?.feint ? DUELISTS.feint.delay : 0) : ph === 'active' ? A.active || .1 : A.recover; };
// The time each cut lands (seconds into the active phase), and how far through the move between cuts the body is at `at`.
function between(cuts, at) { for (let i = 0; i < cuts.length; i++) if (at < cuts[i]) { const a = i ? cuts[i - 1] : 0; return { next: i, y: clamp01((at - a) / Math.max(.01, cuts[i] - a)) }; } return { next: cuts.length, y: 1 }; }
function act(e, tr) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, wpn = R.weapon[e.kind] || 'sword';
  SET = POSE_VEC[wpn];
  ACT.aim = false; ACT.watch = false; ACT.still = !!id; ACT.skid = false; ACT.contact = 0; ACT.phase = id ? `${id}:${ph}` : 'move';
  const aimDir = (a) => { if (a && Math.hypot(a.x, a.y) > .01) { const l = Math.hypot(a.x, a.y); ACT.aimX = a.x / l; ACT.aimY = a.y / l; ACT.aim = true; } };
  if ((Number(e.hopLift) || 0) > .05 || e.aloft) { setVec('air'); ACT.phase = 'hop'; ACT.watch = true; return; }
  if (!id) { setVec(e.aggro ? 'ready' : 'idle'); ACT.watch = !!e.aggro; if (e.hitStun > 0) lerpInto('stagger', clamp01(e.hitStun / .25)); return; }
  aimDir(d.aim);
  const total = phaseLen(id, ph, d), x = total > 0 ? clamp01(1 - (Number(s.t) || 0) / total) : 1;
  if (id === 'duelCombo') {
    const A = DUELISTS.attacks.duelCombo;
    if (ph === 'windup') { // a feint holds the load a little longer, the blade quivering back
      lerpVec('ready', 'load0', smooth(d.feint ? x * 1.6 : x));
      if (d.feint && x > .62 && x < .9) lerpInto('cut0', .08 * Math.sin((x - .62) * 30));
    } else if (ph === 'active') {
      const at = A.active - Math.max(0, Number(s.t) || 0), b = between(A.cuts, at), n = b.next;
      if (n >= A.cuts.length) setVec('cut2');
      else if (n === 0) { setVec('load0'); lerpInto('cut0', easeIn(b.y)); }
      else { setVec(`cut${n - 1}`); lerpInto(`load${n}`, smooth(span(b.y, .05, .55))); if (b.y > .55) lerpInto(`cut${n}`, easeIn(span(b.y, .55, 1))); }
      ACT.contact = (d.cutAt && b.y < .25) ? 1 : 0;
    } else { setVec('cut2'); lerpInto('ready', smooth(x)); }
  } else if (id === 'duelTwinCuts') {
    const A = DUELISTS.attacks.duelTwinCuts;
    if (ph === 'windup') lerpVec('ready', 'crouch', smooth(x * 1.4));
    else if (ph === 'active') {
      const at = A.active - Math.max(0, Number(s.t) || 0);
      if (at < A.dash.time) { setVec('dart'); ACT.skid = true; ACT.still = false; }
      else { const b = between(A.cuts, at); if (b.next === 0) { setVec('dart'); lerpInto('cutA', easeIn(b.y)); } else if (b.next === 1) { setVec('cutA'); lerpInto('cutB', easeIn(b.y)); } else setVec('cutB'); ACT.contact = b.y < .25 && b.next > 0 ? 1 : 0; }
    } else { setVec('cutB'); lerpInto('ready', smooth(x)); }
  } else if (id === 'duelThrust') {
    if (ph === 'windup') lerpVec('ready', 'aim', smooth(x * 1.3));
    else if (ph === 'active') { setVec('thrust'); ACT.contact = 1; }
    else { setVec('thrust'); lerpInto('ready', smooth(span(x, .2, 1))); }
  } else if (id === 'duelSweep') {
    if (ph === 'windup') lerpVec('ready', 'wind', smooth(x * 1.25));
    else if (ph === 'active') { lerpVec('wind', 'swept', easeIn(Math.min(1, x * 2.5))); ACT.contact = 1; }
    else { setVec('swept'); lerpInto('ready', smooth(span(x, .2, 1))); }
  } else setVec('ready');
}

// ------------------------------------------------------------------------------------------------ the pose
const H = new Float64Array(3), T = new Float64Array(3), J = new Float64Array(3), POLE = new Float64Array(3), D = new Float64Array(3), D2 = new Float64Array(3), ARM_TAGS = Object.freeze(['R', 'L']);
export function sampleDuelist(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), Po = tr.pose, G = DUELIST_RIG, wpn = G.weapon[e.kind] || 'sword';
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  if (!dead) act(e, tr);
  else { SET = POSE_VEC[wpn]; setVec('stagger'); ACT.aim = false; ACT.watch = false; ACT.still = true; ACT.skid = false; ACT.contact = 0; ACT.phase = 'death'; }
  // its pace (tiles a second, smoothed): walk to run
  if (Number.isFinite(tr.px) && dt > 0) { const v = Math.hypot(x - tr.px, y - tr.py) / dt; tr.pace += (Math.min(6, v) - tr.pace) * Math.min(1, dt * 8); }
  tr.px = x; tr.py = y;
  // facing: the attack's aim; else, roused and near, the Wayfarer (a strafe or a back-step reads as one); else where it goes
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let want = tr.yaw;
  const tx = env.target ? env.target.x - x : 0, ty = env.target ? env.target.y - y : 0, near = env.target && Math.hypot(tx, ty) < G.watchRange * S;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (ACT.watch && near && !dead) want = Math.atan2(ty, tx);
  else if (Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dy, dx);
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate; tr.yaw += Math.max(-1, Math.min(1, dt * rate)) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // crossfade between acts
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}` : dead ? 'death' : ACT.phase;
  if (tr.key === '' || !(gapMs <= G.blendMs)) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < PK; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  Wv.set(tr.shown);
  // hits: a flinch away from the blow
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - x) * -sf + (py - y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 16, 9) : 0;
  Wv[1] -= .3 * hit; Wv[2] -= .35 * hit * tr.hitSide; Wv[3] += .25 * hit; Wv[0] += .04 * Math.abs(hit);
  // the hop: in the air (its lift on the rig's scale), knees drawn up
  const air = dead ? 0 : Math.max(0, Number(e.hopLift) || 0) * G.airScale;
  const run = clamp01((tr.pace - 1.2) / 2.5), still = ACT.still || ACT.skid || air > .03 || dead;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.stride * S * (1 + run * .5), stance: G.stance, settle: G.settle, still, snapDistance: 3 * S, stepAt: G.stepAt * S, stepTime: G.stepTime * (1 - run * .3) });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  if (!ACT.still && !e.pack?.attack) Wv[1] += moving * (G.runLean * run + .03);
  resetPose(Po);
  let alpha = 1;
  if (dead) { const fold = smooth(death / .35); Wv[0] = .5 * fold; Wv[1] = .7 * fold; Wv[3] = -.6 * fold; alpha = 1 - span(death, .7, 1); }
  setEuler(Po, BI.root, yaw, 0, 0); Po.scl[BI.root] = S; resolveBone(Po, BI.root, x, y, env.z + air);
  const breathe = reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe);
  const bob = moving * G.bob * (1 + run) * (.5 - .5 * Math.cos(cyc * 2)), sway = moving * .012 * Math.sin(cyc);
  setOffset(Po, BI.pelvis, 0, sway, -Wv[0] - bob - G.stand); setEuler(Po, BI.pelvis, Wv[2] * .25, Wv[1] * .3, -sway * 1.5); resolveBone(Po, BI.pelvis);
  setEuler(Po, BI.spine, Wv[2] * .35, Wv[1] * .35, 0); resolveBone(Po, BI.spine);
  setEuler(Po, BI.chest, Wv[2] * .4 + moving * .08 * Math.sin(cyc), Wv[1] * .35, 0); Po.scl[BI.chest] = 1 + breathe * .006; resolveBone(Po, BI.chest);
  let look = 0;
  if (env.target && !dead) { const a = Math.atan2(ty, tx) - yaw; look = Math.max(-.8, Math.min(.8, Math.atan2(Math.sin(a), Math.cos(a)))); }
  setEuler(Po, BI.neck, (look - Wv[2]) * .3, -Wv[3] * .4 - Wv[1] * .3, 0); resolveBone(Po, BI.neck);
  setEuler(Po, BI.head, (look - Wv[2]) * .4, -Wv[3] * .5 - Wv[1] * .3, 0); resolveBone(Po, BI.head);
  // the arms: each hand to its target (in the body's frame, turned with the shoulders), elbows out and down; the weapon along its line
  const rootW = Po.wr, ri = BI.root * 9, fwX = rootW[ri] / S, fwY = rootW[ri + 1] / S, rtX = rootW[ri + 3] / S, rtY = rootW[ri + 4] / S;
  const tw = Wv[2] * .6, ct = Math.cos(tw), st2 = Math.sin(tw);
  const bodyPt = (f, r, u, out) => { const ff = f * ct - r * st2, rr = f * st2 + r * ct; out[0] = x + (fwX * ff + rtX * rr) * S; out[1] = y + (fwY * ff + rtY * rr) * S; out[2] = env.z + air + (u - Wv[0] - G.stand) * S; return out; };
  const bodyDir = (f, r, u, out) => { const ff = f * ct - r * st2, rr = f * st2 + r * ct, l = Math.hypot(ff, rr, u) || 1; out[0] = (fwX * ff + rtX * rr) / l; out[1] = (fwY * ff + rtY * rr) / l; out[2] = u / l; return out; };
  const swing = !ACT.still && !e.pack?.attack ? moving * G.armSwing * (1 + run) * Math.sin(cyc) : 0; // arms pump with the stride
  bodyDir(Wv[7], Wv[8], Wv[9], D); bodyDir(Wv[13], Wv[14], Wv[15], D2);
  for (const tag of ARM_TAGS) {
    const right = tag === 'R', s = right ? 1 : -1, ai = BI['arm' + tag]; resolveBone(Po, ai); H[0] = Po.wp[ai * 3]; H[1] = Po.wp[ai * 3 + 1]; H[2] = Po.wp[ai * 3 + 2];
    if (right) bodyPt(Wv[4] + swing, Wv[5], Wv[6], T);
    else if (wpn === 'polearm') { bodyPt(Wv[4], Wv[5], Wv[6], T); const k = G.polearm.offAt * S; T[0] += D[0] * k; T[1] += D[1] * k; T[2] += D[2] * k; } // the far hand on the shaft
    else bodyPt(Wv[10] - swing, Wv[11], Wv[12], T);
    POLE[0] = -fwX * .3 + rtX * s * .7; POLE[1] = -fwY * .3 + rtY * s * .7; POLE[2] = -.5;
    solveTwoBone(H, T, G.upperArm * S, G.foreArm * S, POLE, J);
    aimWorld(Po, ai, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], fwX, fwY, 0); resolveBone(Po, ai);
    const fi = BI['fore' + tag]; aimWorld(Po, fi, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], fwX, fwY, 0); resolveBone(Po, fi);
    const hi = BI['hand' + tag], dir = right || wpn === 'polearm' ? D : D2;
    aimWorld(Po, hi, 0, dir[0], dir[1], dir[2], 0, 0, 1); resolveBone(Po, hi);
    const wi = BI['weapon' + tag]; aimWorld(Po, wi, 0, dir[0], dir[1], dir[2], 0, 0, 1); resolveBone(Po, wi);
  }
  // legs: two-bone IK to planted feet; darting, the feet slide braced with the body; in the air, tucked
  for (let side = 0; side < 2; side++) {
    const tag = side ? 'R' : 'L', sgn = side ? 1 : -1, ti = BI['thigh' + tag];
    resolveBone(Po, ti); const h3 = ti * 3; H[0] = Po.wp[h3]; H[1] = Po.wp[h3 + 1]; H[2] = Po.wp[h3 + 2];
    let fx = tr.gait.out[side * 4], fy = tr.gait.out[side * 4 + 1], lift = tr.gait.out[side * 4 + 2], fz = env.z + G.ankle * S + lift * G.footLift * S;
    if (ACT.skid || air > .03 || dead || ACT.still) {
      const lead = ACT.skid ? (side ? -.14 : .18) : air > .03 ? (side ? .08 : -.04) : (side ? -.06 : .08), spread = ACT.skid ? .12 : .1;
      if (ACT.skid || air > .03 || dead) { fx = x + (fwX * lead + rtX * sgn * spread) * S; fy = y + (fwY * lead + rtY * sgn * spread) * S; }
      if (air > .03) fz = env.z + air + (G.ankle + .14 + (side ? .04 : 0)) * S; // knees drawn up
    }
    T[0] = fx; T[1] = fy; T[2] = fz;
    POLE[0] = fwX; POLE[1] = fwY; POLE[2] = .05;
    solveTwoBone(H, T, G.thigh * S, G.shin * S, POLE, J);
    aimWorld(Po, ti, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], POLE[0], POLE[1], POLE[2]); resolveBone(Po, ti);
    const si2 = BI['shin' + tag]; aimWorld(Po, si2, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], POLE[0], POLE[1], POLE[2]); resolveBone(Po, si2);
    const toe = lift > 0 ? -.35 * lift : air > .03 ? -.5 : 0, fi = BI['foot' + tag], fyaw = yaw + sgn * .1;
    aimWorld(Po, fi, 0, Math.cos(fyaw) * Math.cos(toe), Math.sin(fyaw) * Math.cos(toe), Math.sin(toe), 0, 0, 1); resolveBone(Po, fi);
    tr.frame.feet[side * 2] = tr.gait.out[side * 4 + 3]; tr.frame.feet[side * 2 + 1] = lift;
  }
  writeSkin(Po);
  const F = tr.frame;
  F.emitK[0] = 0; F.emitK[1] = 0; F.emitK[2] = 0; F.emitK[3] = 0; F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = 1; F.emitA[3] = 1; // no glow: the cowl hides any face
  F.kind = e.kind; F.tier = env.tier || 'full'; F.mesh = duelistMesh(F.tier, e); F.skin = Po.skin; F.alpha = alpha;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = air; F.shadow = (1 - span(death, .5, 1)) / (1 + air * 2); F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = false;
  return F;
}
export const duelistBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
