// The Void Walker in Close View (the world beast): the same traveller as its standard-view art (monster-render.ts
// BODY.voidWalker: a figure the size of a Wayfarer in a short split coat, the hood drawn over a recessed face of night sky with
// a few pale stars, a violet clasp at the throat, violet hems), as a solid skinned body on the shared beast rig. Its body is
// the RPG Character Pack Rogue (CC0) converted for the rig with the hood kept (close-view-beast-walker-body.ts; converter in
// docs/asset-sources/void-walker/). Its offence is in the rends, wraiths, rifts and horizons the game draws where they strike,
// so the body only gathers, gestures and moves (docs/void-walker-design.md, docs/close-view-boss-rig-manifest.md): restrained
// stance and steps, hands gathered and brought down as the rends are cast, arms opened for the wraiths and rifts, a
// supernova charge, the dash's forward lean, the teleport's flicker. Nothing here changes timing, damage, reach or targeting.
import { ATTACK_MODULES, BOSS_PACE } from "./monster-pack.js?v=r942-f19bda103f46";
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, solveTwoBone,
  createGait, stepGait, meshBuilder, clamp01, smooth, easeIn, span, kick, wobble, TIER_DETAIL,
} from "./close-view-beast-rig.js?v=r942-f19bda103f46";
import { WALKER_BODY } from "./close-view-beast-walker-body.js?v=r942-f19bda103f46";

function walkerJoints() {
  const J = WALKER_BODY.joints, d = (a, b) => Math.hypot(J[a][0] - J[b][0], J[a][1] - J[b][1], J[a][2] - J[b][2]);
  return { hip: J.pelvis[2], thigh: d('thighR', 'shinR'), shin: d('shinR', 'footR'), ankle: J.footR[2], upperArm: d('armR', 'foreR'), foreArm: d('foreR', 'handR') };
}
export const WALKER_RIG = Object.freeze({
  closeViewScale: 1.25, // as every Close View beast (presentation only); the body is sized so the Walker stands about as tall as the Wayfarer
  ...walkerJoints(), stand: .02,
  stride: .5, stance: .62, footLift: .06, settle: 6, stepAt: .06, stepTime: .3, turnRate: 5, standTurnRate: 4, attackTurnRate: 10,
  blendMs: 160, castMs: 260, hitMs: 220, deathMs: 1800, breathe: .25, bob: .008,
  // body poses: crouch, lean (+ forward), twist, head (+ up), both hands (in the body's frame, model units: f, r, u), spread
  // (the coat's hem lifting), all restrained: it gathers and gestures; the rends strike where the game draws them
  poses: Object.freeze({
    idle: { crouch: .01, lean: .03, twist: 0, head: 0, lF: .02, lR: -.16, lU: .42, rF: .02, rR: .16, rU: .42 },
    gather: { crouch: .03, lean: .06, twist: 0, head: -.05, lF: .2, lR: -.06, lU: .66, rF: .2, rR: .06, rU: .66 }, // hands drawn together before the chest
    cast: { crouch: .06, lean: .16, twist: 0, head: -.2, lF: .28, lR: -.12, lU: .48, rF: .28, rR: .12, rU: .48 }, // open hands brought down
    open: { crouch: .02, lean: -.02, twist: 0, head: .15, lF: .12, lR: -.36, lU: .74, rF: .12, rR: .36, rU: .74 }, // arms opened wide: wraiths, rifts
    raise: { crouch: .0, lean: -.08, twist: 0, head: .35, lF: .06, lR: -.16, lU: 1.02, rF: .06, rR: .16, rU: 1.02 }, // the supernova's charge
    dash: { crouch: .08, lean: .42, twist: 0, head: -.1, lF: -.16, lR: -.2, lU: .4, rF: -.16, rR: .2, rU: .4 }, // the forward lean of a dash
    dazed: { crouch: .08, lean: .25, twist: .1, head: -.4, lF: .08, lR: -.18, lU: .36, rF: .08, rR: .18, rU: .36 },
  }),
});
const PK = ['crouch', 'lean', 'twist', 'head', 'lF', 'lR', 'lU', 'rF', 'rR', 'rU'], K = PK.length;
const POSE_VEC = Object.freeze(Object.fromEntries(Object.entries(WALKER_RIG.poses).map(([n, p]) => [n, Float64Array.from(PK.map((k) => p[k] || 0))])));

// ------------------------------------------------------------------------------------------------ skeleton
const KJ = WALKER_BODY.joints, rel = (a, b) => b ? [KJ[a][0] - KJ[b][0], KJ[a][1] - KJ[b][1], KJ[a][2] - KJ[b][2]] : KJ[a].slice();
export const WALKER_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'pelvis', parent: 'root', at: rel('pelvis') },
  { name: 'thighL', parent: 'pelvis', at: rel('thighL', 'pelvis') }, { name: 'shinL', parent: 'thighL', at: rel('shinL', 'thighL') }, { name: 'footL', parent: 'shinL', at: rel('footL', 'shinL') },
  { name: 'thighR', parent: 'pelvis', at: rel('thighR', 'pelvis') }, { name: 'shinR', parent: 'thighR', at: rel('shinR', 'thighR') }, { name: 'footR', parent: 'shinR', at: rel('footR', 'shinR') },
  { name: 'spine', parent: 'pelvis', at: rel('spine', 'pelvis') }, { name: 'chest', parent: 'spine', at: rel('chest', 'spine') },
  { name: 'neck', parent: 'chest', at: rel('neck', 'chest') }, { name: 'head', parent: 'neck', at: rel('head', 'neck') },
  { name: 'armL', parent: 'chest', at: rel('armL', 'chest') }, { name: 'foreL', parent: 'armL', at: rel('foreL', 'armL') }, { name: 'handL', parent: 'foreL', at: rel('handL', 'foreL') },
  { name: 'armR', parent: 'chest', at: rel('armR', 'chest') }, { name: 'foreR', parent: 'armR', at: rel('foreR', 'armR') }, { name: 'handR', parent: 'foreR', at: rel('handR', 'foreR') },
  { name: 'rend', parent: 'root', at: [0, 0, 0] }, // the teleport's rend behind it (scaled from nothing)
]);
const BI = WALKER_SKELETON.index;
const E_FACE = 1, E_TRIM = 2, E_REND = 3;

// ------------------------------------------------------------------------------------------------ the body
const C = Object.freeze({ cloth: 0x29213f, clothLit: 0x463a63, dark: 0x0c0918, coat: 0x1d1730, boot: 0x14121b, violet: 0xb779ff, pale: 0xf1ddff, face: 0x140e30, faceMid: 0x68419b, star: 0xe5d7ff });
function buildWalkerMesh(tier) {
  const d = TIER_DETAIL[tier], full = tier === 'full', low = tier === 'low', B = meshBuilder(WALKER_SKELETON, d), bw = WALKER_SKELETON.bindWorld;
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  const J0 = WALKER_BODY.joints;
  // the body: coat and hood in the Walker's cloth, boots and gloves darker, light and shade from the source texture
  { const dec = (b64, T) => { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };
    const P = dec(WALKER_BODY.positions, Float32Array), N = dec(WALKER_BODY.normals, Int8Array), Bn = dec(WALKER_BODY.bone, Uint8Array), Wt = dec(WALKER_BODY.weight, Uint8Array), L = dec(WALKER_BODY.shade, Uint8Array);
    const IX = dec(full ? WALKER_BODY.indices : low ? WALKER_BODY.indicesLow : WALKER_BODY.indicesBalanced, Uint16Array), names = WALKER_BODY.bones;
    const lerp = (a, b, t) => { const c = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (c(16) << 16) | (c(8) << 8) | c(0); };
    const base = (bn) => /hand|foot/.test(bn) ? [C.dark, C.boot] : /head|neck/.test(bn) ? [C.coat, C.clothLit] : [C.dark, C.clothLit];
    const ids = new Array(WALKER_BODY.vertexCount);
    for (let v = 0; v < WALKER_BODY.vertexCount; v++) { const a = names[Bn[v * 2]], b = names[Bn[v * 2 + 1]], [lo, hi] = base(a);
      ids[v] = B.vertexBlend(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], N[v * 3] / 127, N[v * 3 + 1] / 127, N[v * 3 + 2] / 127, a, b, Wt[v] / 255, lerp(lo, hi, Math.pow(L[v] / 255, 1.1))); }
    for (let i = 0; i < IX.length; i += 3) B.tri(ids[IX[i]], ids[IX[i + 1]], ids[IX[i + 2]]); }
  // the hood: a peak swept back off the crown and a lip over the brow, so the head reads as a drawn hood, not a helmet
  { const h = J0.head, top = 1.1;
    B.bone('head').color(C.cloth).lathe({ at: at('head', [h[0] - .055, 0, top - .04]), F: [-.85, 0, -.35], U: [0, 0, 1], rings: [[0, .06], [.06, .04], [.12, 0]], rs: 1, us: .8, seg: low ? 5 : 8 });
    B.color(C.clothLit).ellipsoid({ at: at('head', [h[0] + .092, 0, top - .046]), radius: [.026, .064, .013], rings: 3, seg: low ? 7 : 12, F: [1, 0, -.25], U: [.25, 0, 1] }); }
  // the face: a recessed panel of night sky in the hood's opening, the nebula slanting across it, a few pale stars (not eyes,
  // not a visor)
  { const h = J0.head, fx = h[0] + .1, fz = h[2] + .1;
    // the hood's opening: a dark rim round an oval of night sky, set back under the brow
    B.bone('head').color(C.dark).ellipsoid({ at: at('head', [fx - .004, 0, fz]), radius: [.014, .046, .056], rings: 3, seg: low ? 8 : 14, F: [1, 0, 0], U: [0, 0, 1] });
    B.bone('head').color(C.face, E_FACE).ellipsoid({ at: at('head', [fx + .002, 0, fz - .003]), radius: [.01, .038, .047], rings: 3, seg: low ? 8 : 14, F: [1, 0, 0], U: [0, 0, 1] });
    if (!low) { B.color(C.faceMid, E_FACE).ellipsoid({ at: at('head', [fx + .007, -.004, fz + .004]), radius: [.003, .026, .008], rings: 2, seg: 8, F: [1, 0, 0], U: [0, .55, 1] });
      for (const [y, z] of [[-.016, .02], [.014, .026], [.022, -.008], [-.008, -.022], [.002, .004]]) B.color(C.star, E_FACE).ellipsoid({ at: at('head', [fx + .01, y, fz + z]), radius: [.002, .0035, .0035], rings: 2, seg: 4 }); } }
  // the coat: flaring from the waist to mid-thigh with a violet hem, and two long tails behind to the boots (its short split coat)
  { const pz = J0.pelvis[2], px = J0.pelvis[0];
    B.bone('pelvis').color(C.coat).loft({ seg: low ? 8 : 14, up: [1, 0, 0], sections: [[pz + .06, .1, .075], [pz - .02, .118, .088], [pz - .1, .132, .1], [pz - .17, .142, .108]].map(([z, ry, rx]) => ({ at: [px, 0, z], rx: ry, rz: rx, bones: ['pelvis', 'pelvis', 0] })),
      tone: (i, k, st) => st > .5 ? C.cloth : C.coat, caps: false });
    if (!low) B.color(C.violet, E_TRIM).loft({ seg: 14, up: [1, 0, 0], sections: [[pz - .165, .144, .11], [pz - .18, .144, .11]].map(([z, ry, rx]) => ({ at: [px, 0, z], rx: ry, rz: rx, bones: ['pelvis', 'pelvis', 0] })), caps: false });
    for (const s of [-1, 1]) B.color(C.coat).box({ at: at('pelvis', [px - .085, s * .05, pz - .29]), size: [.004, .045, .15], bevel: 0, taper: -.25, F: [-1, 0, -.06], U: [-.06, 0, 1] }); }
  // the violet clasp at the throat
  B.bone('chest').color(C.violet, E_TRIM).box({ at: at('chest', [J0.chest[0] + .088, 0, J0.neck[2] - .06]), size: [.004, .011, .011], bevel: 0, F: [1, 0, 0], U: [0, 1, 1] });
  // ---- optional: the rend that opens behind it as it teleports: a dark ellipse of star-space with pale specks
  B.mark();
  B.bone('rend').color(C.dark, E_REND).lathe({ at: at('rend', [-.15, 0, .55]), F: [1, 0, 0], U: [0, 0, 1], rings: [[0, .32], [.01, 0]], us: 1.8, rs: 1, seg: low ? 8 : 14, caps: false });
  for (let i = 0; i < (low ? 4 : 9); i++) { const a = i / 9 * Math.PI * 2; B.color(C.star, E_REND).box({ at: at('rend', [-.14, Math.cos(a) * .22, .55 + Math.sin(a) * .4]), size: [.012, .012, .012], bevel: 0 }); }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function walkerMesh(tier = 'full') { return MESHES[tier] ||= buildWalkerMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createWalkerTrack() {
  return {
    pose: createPose(WALKER_SKELETON),
    gait: createGait([{ side: -.08, phase: .5 }, { side: .08, phase: 0 }]),
    yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(K), shown: new Float64Array(K),
    hp: NaN, hitAt: -Infinity, hitSide: 1, castAt: -Infinity, contactWas: 0, flash: 0, deathAt: null, x: 0, y: 0, z: 0,
    frame: { kind: 'voidWalker', tier: 'full', mesh: null, skin: null, boneCount: WALKER_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
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
const OPEN = new Set(['voidWraiths', 'voidRifts', 'voidConstellation', 'voidHorizons']);
const ACT = { aim: false, aimX: 0, aimY: 0, watch: false, still: false, dash: false, cast: 0, phase: '', glow: 0, charge: 0 };
function act(e, tr, now, target) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, x = id ? phaseOf(s, id) : 0;
  ACT.aim = false; ACT.watch = false; ACT.still = !!id; ACT.dash = false; ACT.cast = 0; ACT.phase = id ? `${id}:${ph}` : 'move'; ACT.glow = 0; ACT.charge = 0;
  const aimAt = (px, py) => { const dx = px - e.x, dy = py - e.y, l = Math.hypot(dx, dy); if (l > .01) { ACT.aimX = dx / l; ACT.aimY = dy / l; ACT.aim = true; } };
  if (!id) { setVec(V, 'idle'); ACT.watch = true; return; }
  if (target) aimAt(target.x, target.y);
  if (id === 'voidSupernova') {
    // the long charge: arms raised, the light gathering; then the dash passes (each a lean along the snapshot line)
    if (ph === 'windup') { lerpVec(V, 'idle', 'raise', smooth(x / .6)); ACT.charge = x; ACT.glow = x; }
    else if (ph === 'active') {
      const dash = d.dash; if (e.voidCharging) { setVec(V, 'raise'); ACT.charge = 1; ACT.glow = 1; }
      else if (dash && dash.stage === 'run') { setVec(V, 'dash'); ACT.dash = true; ACT.still = false; if (dash.dir) { ACT.aimX = dash.dir.x; ACT.aimY = dash.dir.y; ACT.aim = true; } }
      else if (dash && dash.stage === 'warn') { setVec(V, 'gather'); lerpInto(V, 'dash', .4); if (dash.dir) { ACT.aimX = dash.dir.x; ACT.aimY = dash.dir.y; ACT.aim = true; } }
      else setVec(V, 'gather');
    } else { setVec(V, 'gather'); lerpInto(V, 'idle', smooth(x)); }
  } else if (OPEN.has(id)) {
    // arms opened wide as the wraiths, rifts or horizons come
    if (ph === 'windup') { lerpVec(V, 'idle', 'gather', smooth(x / .5)); if (x > .5) lerpInto(V, 'open', smooth(span(x, .5, 1))); ACT.glow = x; ACT.cast = x > .98 ? 1 : 0; }
    else { setVec(V, 'open'); lerpInto(V, 'idle', smooth(x)); ACT.glow = 1 - x; }
  } else {
    // the rends (hand, claw, sword, slash, spikes): hands gathered before the chest, then brought down open as it casts; the
    // blows land later, where the rends open, on their own arming clocks
    if (ph === 'windup') { lerpVec(V, 'idle', 'gather', smooth(x / .6)); if (x > .7) lerpInto(V, 'cast', easeIn(span(x, .7, 1))); ACT.glow = x; ACT.cast = x > .98 ? 1 : 0; }
    else { setVec(V, 'cast'); lerpInto(V, 'idle', smooth(span(x, .2, 1))); ACT.glow = 1 - x; if (x < .1) ACT.cast = 1; }
  }
}

// ------------------------------------------------------------------------------------------------ the pose
const H = new Float64Array(3), T = new Float64Array(3), J = new Float64Array(3), POLE = new Float64Array(3);
export function sampleWalker(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = WALKER_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  if (!dead) act(e, tr, now, env.target);
  else { setVec(V, 'dazed'); ACT.aim = false; ACT.watch = false; ACT.still = true; ACT.dash = false; ACT.cast = 0; ACT.phase = 'death'; ACT.glow = 0; ACT.charge = 0; }
  const dashing = !dead && (ACT.dash || !!e.voidDashing);
  if (e.voidDashing && !ACT.dash) { setVec(V, 'dash'); ACT.still = false; }
  // facing: the cast's aim, else where it goes, else the Wayfarer. A teleport is a discontinuity: the facing snaps with it
  const jumped = Number.isFinite(tr.gait.x) && Math.hypot(env.x - tr.gait.x, env.y - tr.gait.y) > 1.2;
  const dx = env.x - tr.gait.x, dy = env.y - tr.gait.y; let want = tr.yaw;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (!jumped && Number.isFinite(dx) && Math.hypot(dx, dy) > .004 * Math.max(1, dt * 60)) want = Math.atan2(dy, dx);
  else if (ACT.watch && env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw) || jumped) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)), rate = e.pack?.attack ? G.attackTurnRate : tr.gait.moving < .1 ? G.standTurnRate : G.turnRate; tr.yaw += Math.max(-1, Math.min(1, dt * rate)) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  const key = e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}:${e.pack.data?.dash?.stage || ''}:${e.voidCharging ? 1 : 0}` : dead ? 'death' : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs) || jumped) { if (key !== tr.key) tr.blendAt = -Infinity; tr.shown.set(V); tr.from.set(V); tr.key = key; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < K; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  W.set(tr.shown);
  // the cast: a small settle through the body as the hands come down
  if (ACT.cast && !tr.contactWas) tr.castAt = now; tr.contactWas = ACT.cast;
  const castT = (now - tr.castAt) / 1000, cast = castT < G.castMs / 1000 ? kick(castT, 18, 9) : 0; W[0] += .015 * Math.abs(cast); W[1] += .04 * cast;
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp;
  const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 10) : 0; W[1] -= .2 * hit; W[2] -= .25 * hit * tr.hitSide; W[3] += .15 * hit;
  const stun = dead ? 0 : Math.max(0, Math.min(1, Number(e.poiseBreak) || 0));
  if (stun > 0) { const dz = POSE_VEC.dazed; for (let k = 0; k < K; k++) W[k] += (dz[k] - W[k]) * stun; }
  // gait: restrained steps; in a dash the feet skid braced with the body; a teleport snaps the feet with it
  const still = (ACT.still && !dashing) || dashing || dead || e.fleeFade != null;
  stepGait(tr.gait, env.x, env.y, yaw, now, { stride: G.stride * S, stance: G.stance, settle: G.settle, still, snapDistance: 1.2, stepAt: G.stepAt * S, stepTime: G.stepTime });
  const moving = tr.gait.moving, cyc = tr.gait.phase * Math.PI * 2;
  resetPose(P);
  // the teleport flash: it flickers and the rend shows behind it for the flash's length; the death: it sinks and fades into the dark
  tr.flash = Math.max(0, Number(e.voidTeleport) || 0) / .25;
  let alpha = 1; if (e.fleeFade != null) alpha = clamp01(e.fleeFade);
  if (tr.flash > 0) alpha *= .64 + (reduce ? 0 : .2 * Math.sin(t * 70));
  if (dead) { W[0] = .12 * smooth(death / .4); W[1] = .3 * smooth(death / .4); W[3] = -.4 * smooth(death / .4); alpha *= 1 - span(death, .35, 1); }
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  const breathe = dashing || reduce ? 0 : Math.sin(t * Math.PI * 2 * G.breathe);
  const bob = moving * G.bob * (.5 - .5 * Math.cos(cyc * 2));
  setOffset(P, BI.pelvis, 0, moving * .006 * Math.sin(cyc), -W[0] - bob - G.stand); setEuler(P, BI.pelvis, W[2] * .2, W[1] * .3, 0); resolveBone(P, BI.pelvis);
  setEuler(P, BI.spine, W[2] * .3, W[1] * .35, 0); resolveBone(P, BI.spine);
  setEuler(P, BI.chest, W[2] * .4, W[1] * .35, reduce ? 0 : .008 * wobble(t * .6, 2)); P.scl[BI.chest] = 1 + breathe * .006; resolveBone(P, BI.chest);
  let look = 0; if (env.target && !dead) { const lx = env.target.x - e.x, ly = env.target.y - e.y, a = Math.atan2(ly, lx) - yaw; look = Math.max(-.7, Math.min(.7, Math.atan2(Math.sin(a), Math.cos(a)))); }
  setEuler(P, BI.neck, (look - W[2]) * .3, -W[3] * .4 - W[1] * .3, 0); resolveBone(P, BI.neck);
  setEuler(P, BI.head, (look - W[2]) * .4, -W[3] * .5 - W[1] * .3, 0); resolveBone(P, BI.head);
  // the hands to their places in the body's frame (two-bone IK), elbows out and down
  const ri = BI.root * 9, fwX = P.wr[ri] / S, fwY = P.wr[ri + 1] / S, rtX = P.wr[ri + 3] / S, rtY = P.wr[ri + 4] / S;
  const tw = W[2] * .6, ct = Math.cos(tw), st = Math.sin(tw);
  for (const [tag, s, o] of [['L', -1, 4], ['R', 1, 7]]) {
    const ai = BI['arm' + tag]; resolveBone(P, ai); H[0] = P.wp[ai * 3]; H[1] = P.wp[ai * 3 + 1]; H[2] = P.wp[ai * 3 + 2];
    const gf = W[o] * ct - W[o + 1] * st, gr = W[o] * st + W[o + 1] * ct, sway = moving * .03 * Math.sin(cyc + (s > 0 ? 0 : Math.PI)) * (1 - (ACT.still ? 1 : 0));
    T[0] = x + (fwX * (gf + sway) + rtX * gr) * S; T[1] = y + (fwY * (gf + sway) + rtY * gr) * S; T[2] = env.z + (W[o + 2] - W[0] - G.stand) * S;
    POLE[0] = -fwX * .4 + rtX * s * .6; POLE[1] = -fwY * .4 + rtY * s * .6; POLE[2] = -.6;
    solveTwoBone(H, T, G.upperArm * S, G.foreArm * S, POLE, J);
    aimWorld(P, ai, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], fwX, fwY, 0); resolveBone(P, ai);
    const fi = BI['fore' + tag]; aimWorld(P, fi, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], fwX, fwY, 0); resolveBone(P, fi);
    resolveBone(P, BI['hand' + tag]);
  }
  // legs: planted feet; braced in a dash
  for (let side = 0; side < 2; side++) {
    const tag = side ? 'R' : 'L', sgn = side ? 1 : -1, ti = BI['thigh' + tag];
    resolveBone(P, ti); const hi = ti * 3; H[0] = P.wp[hi]; H[1] = P.wp[hi + 1]; H[2] = P.wp[hi + 2];
    let fx = tr.gait.out[side * 4], fy = tr.gait.out[side * 4 + 1], lift = tr.gait.out[side * 4 + 2], fz = env.z + G.ankle * S + lift * G.footLift * S;
    if (dashing || dead) { const lead = dashing ? (side ? -.14 : .16) : 0; fx = x + (fwX * lead + rtX * sgn * .1) * S; fy = y + (fwY * lead + rtY * sgn * .1) * S; fz = env.z + G.ankle * S; }
    T[0] = fx; T[1] = fy; T[2] = fz; POLE[0] = fwX; POLE[1] = fwY; POLE[2] = .05;
    solveTwoBone(H, T, G.thigh * S, G.shin * S, POLE, J);
    aimWorld(P, ti, -3, J[0] - H[0], J[1] - H[1], J[2] - H[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, ti);
    const si = BI['shin' + tag]; aimWorld(P, si, -3, T[0] - J[0], T[1] - J[1], T[2] - J[2], POLE[0], POLE[1], POLE[2]); resolveBone(P, si);
    const toe = lift > 0 ? -.3 * lift : 0, fo = BI['foot' + tag], fyaw = yaw + sgn * .1;
    aimWorld(P, fo, 0, Math.cos(fyaw) * Math.cos(toe), Math.sin(fyaw) * Math.cos(toe), Math.sin(toe), 0, 0, 1); resolveBone(P, fo);
    tr.frame.feet[side * 2] = tr.gait.out[side * 4 + 3]; tr.frame.feet[side * 2 + 1] = lift;
  }
  P.scl[BI.rend] = Math.max(.001, tr.flash > 0 ? smooth(tr.flash) : 0); resolveBone(P, BI.rend);
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 2) : 1;
  F.emitK[0] = life * (.8 + .9 * ACT.glow + (reduce ? 0 : .1 * Math.sin(t * 1.3))); // the night-sky face brightens as it casts
  F.emitK[1] = life * (.6 + 1.2 * Math.max(ACT.glow, ACT.charge)); // the violet clasp and hems
  F.emitK[2] = 1; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = tr.flash > 0 ? .9 : 0; F.emitA[3] = 1;
  F.tier = env.tier || 'full'; F.mesh = walkerMesh(F.tier); F.skin = P.skin; F.alpha = alpha;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = 0; F.shadow = tr.flash > 0 ? .5 : 1; F.phase = ACT.phase; F.contact = ACT.cast; F.cloud = tr.flash > 0;
  return F;
}
export const walkerBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
