// The Tremor Worm in Close View: the standard view's worm (monster-render.ts tremorWorm: a ringed column of sand-coloured
// armour standing out of a hole of broken ground, its head a round maw ringed with teeth and lit from deep in the throat, small
// tentacles writhing at its lips) as one skinned body on the shared beast rig. It stands at the game's `wormLift` share of its
// length (half out by default, all the way up for the maw, the sweep and the slam), comes up out of the hole on the emergence
// clock, opens its maw wide to drink the air, lashes its lip tentacles out along the maw's lanes, swings its length across the
// sweep's arc on the game's `swing`, rears back for the slam and lies along the line when it lands. Under the ground (hidden,
// or about to burst up) it keeps the standard view's heaving mound. Nothing here changes timing, damage, reach or targeting.
import {
  defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, meshBuilder, clamp01, smooth, span, kick, wobble,
} from "./close-view-beast-rig.js?v=r913-730e3668c9ab";

const SEGS = 10, TENTS = 6;
export const WORM_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  seg: .17, // each ring's length; the column is SEGS rings, the head on top (about the standard view's 1.4 tile height above ground at full lift)
  radius: .36, headRadius: .46, lean: .28, // the standard view's ring and head sizes and its lean toward the Wayfarer
  turnRate: 3, attackTurnRate: 9, blendMs: 160, deathMs: 2200, hitMs: 320, emergeTime: .7,
});

// ------------------------------------------------------------------------------------------------ skeleton
// model space: f forward (toward its aim), r right, u up; the hole at the origin. Each ring is a bone up the column.
export const WORM_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  ...Array.from({ length: SEGS }, (_, i) => ({ name: 'seg' + i, parent: i ? 'seg' + (i - 1) : 'root', at: [0, 0, i ? WORM_RIG.seg : -.3] })),
  { name: 'head', parent: 'seg' + (SEGS - 1), at: [0, 0, WORM_RIG.seg] },
  { name: 'throat', parent: 'head', at: [0, 0, .32] },
  ...Array.from({ length: TENTS }, (_, i) => { const a = (i / TENTS) * Math.PI * 2, r = .3;
    return [{ name: 'tent' + i, parent: 'head', at: [Math.cos(a) * r, Math.sin(a) * r, .36] }, { name: 'tentB' + i, parent: 'tent' + i, at: [0, 0, .2] }]; }).flat(),
]);
const BI = WORM_SKELETON.index;
const E_THROAT = 1, E_FIRE = 2;

// ------------------------------------------------------------------------------------------------ the body
const hexOf = (c) => parseInt(String(c).slice(1), 16);
// the standard view's colours (MONSTER_PACK.tremorWorm.palette and the ring shades monster-render.ts paints)
const C = Object.freeze({ sand: hexOf("#b08a5a"), sandLit: hexOf("#e6c896"), pale: hexOf("#f3e2c0"), dark: hexOf("#2a1c12"), tan: hexOf("#9a7448"), seam: hexOf("#1a100a"),
  pore: hexOf("#3a2a1a"), throat: hexOf("#1a0604"), fire: hexOf("#ff7a2a"), core: hexOf("#ffcf8a"), flesh: hexOf("#8a3a2a"), fleshTip: hexOf("#d27a5a"), tooth: hexOf("#f3e2c0"),
  pit: hexOf("#120a06"), rubble: hexOf("#7a6044"), rubbleDark: hexOf("#56422e") });
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
function buildWormMesh(tier) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(WORM_SKELETON, full ? 1 : low ? .4 : .7), bw = WORM_SKELETON.bindWorld, R = WORM_RIG;
  const zOf = (bone) => bw[BI[bone] * 3 + 2];
  // the column: one skin up the rings, each ring an armour plate swelling between the seams, its lower lip overlapping the
  // ring beneath; pale and tan plates alternating as the standard view's, lit along the ridge
  const sections = [];
  for (let i = 0; i < SEGS; i++) { const b = 'seg' + i, nb = i < SEGS - 1 ? 'seg' + (i + 1) : 'head', z0 = zOf(b), r = R.radius * (1 + .04 * Math.sin(i * 1.7) + .12 * (i / SEGS));
    sections.push({ at: [0, 0, z0 + .005], rx: r * .9, rz: r * .9, bones: [b, b, 0], ring: i, seam: true });
    sections.push({ at: [0, 0, z0 + R.seg * .35], rx: r * 1.04, rz: r * 1.04, bones: [b, b, 0], ring: i });
    if (!low) sections.push({ at: [0, 0, z0 + R.seg * .8], rx: r * .98, rz: r * .98, bones: [b, nb, .3], ring: i }); }
  sections.push({ at: [0, 0, zOf('head') - .01], rx: R.radius * 1.08, rz: R.radius * 1.08, bones: ['seg' + (SEGS - 1), 'head', .6], ring: SEGS });
  B.color(C.sand).loft({ seg: low ? 8 : full ? 16 : 12, up: [1, 0, 0], caps: false, sections: sections.map((q) => ({ at: q.at, rx: q.rx, rz: q.rz, bones: q.bones })),
    tone: (i, k, st) => { const q = sections[i]; if (q.seam) return C.seam; const base = q.ring % 2 ? lerpHex(C.sand, C.pale, .55) : lerpHex(C.tan, C.sandLit, .45); return lerpHex(base, st > .3 ? C.pale : C.dark, st > .3 ? (st - .3) * .5 : (.3 - st) * .25); } });
  // breathing pores along the sides of every other ring
  if (!low) for (let i = 1; i < SEGS; i += 2) for (const s of [-1, 1]) { const b = 'seg' + i, r = R.radius * (1.02 + .12 * (i / SEGS));
    B.bone(b).color(C.pore).ellipsoid({ at: [0, s * r, R.seg * .4], radius: [.03, .012, .03], rings: 2, seg: 6, U: [0, s, 0], F: [0, 0, 1] }); }
  // the head: a round cap wider than the column, the lip folding in to the maw
  const HR = R.headRadius;
  B.bone('head').color(C.sand).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], seg: low ? 9 : full ? 18 : 13,
    rings: [[-.01, R.radius * 1.08], [.08, HR * .98], [.18, HR], [.27, HR * .94], [.34, HR * .8], [.37, HR * .64]], caps: false,
    tone: (i) => i >= 4 ? C.pale : i % 2 ? C.sandLit : C.sand });
  // lip folds, the throat and the fire deep in it
  B.bone('head').color(C.tan).lathe({ at: [0, 0, .362], F: [0, 0, 1], U: [1, 0, 0], seg: low ? 9 : full ? 18 : 13, rings: [[0, HR * .66], [.012, HR * .6], [.006, HR * .52]], caps: false });
  B.bone('throat').color(C.throat).ellipsoid({ at: [0, 0, .0], radius: [HR * .64, HR * .64, .07], rings: low ? 3 : 5, seg: low ? 9 : 14 });
  B.bone('throat').color(lerpHex(C.throat, C.fire, .45), E_THROAT).ellipsoid({ at: [0, 0, .058], radius: [HR * .4, HR * .4, .016], rings: 3, seg: low ? 10 : 18 });
  B.bone('throat').color(C.fire, E_THROAT).ellipsoid({ at: [0, 0, .066], radius: [HR * .24, HR * .24, .014], rings: 3, seg: low ? 10 : 16 });
  B.bone('throat').color(C.core, E_THROAT).ellipsoid({ at: [0, 0, .075], radius: [HR * .08, HR * .08, .012], rings: 2, seg: 8 });
  // teeth ringing the maw, hooked inward
  { const n = low ? 8 : full ? 18 : 12;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r = HR * .58;
      B.bone('throat').color(C.tooth).lathe({ at: [c * r, s * r, .05], F: [-c * .7, -s * .7, .7], rings: [[0, .026], [.07, 0]], seg: 4, caps: false }); } }
  // the lip tentacles: each a tapering two-bone tendril, flesh dark at the root and pale at the tip
  for (let i = 0; i < TENTS; i++) { if (low && i % 2) continue; const a = 'tent' + i, b = 'tentB' + i, p0 = [bw[BI[a] * 3], bw[BI[a] * 3 + 1], bw[BI[a] * 3 + 2]];
    B.color(C.flesh).loft({ seg: low ? 4 : 6, minSeg: 3, sections: [[0, .038, a, a, 0], [.1, .03, a, b, .3], [.2, .022, b, b, 0], [.36, .012, b, b, 0], [.5, .003, b, b, 0]].filter((_, j) => !low || j !== 1 && j !== 3)
      .map(([h, r, ba, bb, w]) => ({ at: [p0[0], p0[1], p0[2] + h], rx: r, rz: r, bones: [ba, bb, w] })), tone: (j) => lerpHex(C.flesh, C.fleshTip, j / 4) }); }
  // the hole it stands in: a dark pit and broken rubble on its rim (on the root: it stays on the ground as the column moves)
  B.bone('root').color(C.pit).ellipsoid({ at: [0, 0, .006], radius: [.56, .56, .006], rings: 4, seg: low ? 10 : 16, U: [0, 0, 1] });
  { const n = low ? 6 : full ? 14 : 10;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + .2, r = .56 * (1 + (i % 3) * .06), sz = .06 + (i % 3) * .025;
      B.bone('root').color(i % 2 ? C.rubble : C.rubbleDark).ellipsoid({ at: [Math.cos(a) * r, Math.sin(a) * r, sz * .35], radius: [sz * 1.3, sz, sz * .7], rings: 2, seg: 5, F: [Math.cos(a + 1), Math.sin(a + 1), 0], U: [0, 0, 1] }); } }
  // lava spat from the throat (channel 3: shown only while it spews)
  B.mark();
  B.bone('throat').color(C.fire, 3).lathe({ at: [0, 0, 0], F: [0, 0, 1], U: [1, 0, 0], rings: [[0, HR * .4], [.25, HR * .5], [.5, HR * .3], [.7, 0]], seg: low ? 6 : 10, caps: false });
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function wormMesh(tier = 'full') { return MESHES[tier] ||= buildWormMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createWormTrack() {
  return {
    pose: createPose(WORM_SKELETON), yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(6), shown: new Float64Array(6),
    hp: NaN, lashSeen: null, lashAt: -Infinity, hitAt: -Infinity, hitSide: 1, deathAt: null, x: 0, y: 0, z: 0, contactWas: 0, contactAt: -Infinity,
    frame: { kind: 'tremorWorm', tier: 'full', mesh: null, skin: null, boneCount: WORM_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
// ------------------------------------------------------------------------------------------------ what it is doing
// The body as six numbers: height (the share of the column above ground), bend (total forward bend, + toward its aim), side
// (total sideways bend, + to its left), tilt (the base's forward topple), open (the maw), lash (the lip tentacles thrown forward)
const V = new Float64Array(6), W6 = new Float64Array(6);
const ACT = { aimX: 0, aimY: 0, aim: false, contact: 0, fire: 0, suck: 0, phase: '' };
function act(e, tr, now, t) {
  const s = e.pack, id = s?.attack, ph = s?.phase, d = s?.data || {}, Wk = s?.worm, R = WORM_RIG;
  const up = Wk?.mode === 'emerge' ? Math.max(.05, 1 - Math.max(0, Number(Wk.t) || 0) / R.emergeTime) : 1, lift = Math.max(.15, Math.min(1.2, Number.isFinite(e.wormLift) ? e.wormLift : 1));
  ACT.aim = false; ACT.contact = 0; ACT.fire = 0; ACT.suck = 0; ACT.phase = id ? `${id}:${ph}` : 'move';
  if (d.aim && Math.hypot(d.aim.x, d.aim.y) > .01) { const l = Math.hypot(d.aim.x, d.aim.y); ACT.aimX = d.aim.x / l; ACT.aimY = d.aim.y / l; ACT.aim = true; }
  let reach = 1, bend = R.lean, side = 0, tilt = 0, open = .7 + .06 * Math.sin(t * 1.7), lash = 0;
  if (ph === 'windup') open = .85;
  if (id === 'wormSuction' && ph !== 'recover') { open = 1; ACT.suck = 1; }
  if (id === 'wormMaw' && d.dirs) { bend = .55; if (ph === 'windup') lash = .25; else if (d.lashed && (d.lashed !== tr.lashSeen ? (tr.lashSeen = d.lashed, tr.lashAt = now, true) : now - tr.lashAt < 500)) { lash = 1; ACT.contact = 1; } else lash = ph === 'active' ? .6 : .2; }
  if (id === 'wormSweep' && ph === 'active') { side = -((Number(d.swing) || 0) * 2 - 1) * 1.3; bend = .6; reach = .85; ACT.contact = 1; }
  else if (id === 'wormSweep' && ph === 'windup') { side = .7; bend = .1; }
  else if (id === 'wormSlam' && ph === 'windup') { bend = -.5; reach = 1.12; }
  else if (id === 'wormSlam' && d.slammed) { bend = 1.6; tilt = .4; reach = 1; if (ph === 'active' || now - (d.slammedAt || 0) < 400) ACT.contact = 1; }
  if (id === 'wormLavaSpew' && ph !== 'recover') { open = 1; ACT.fire = ph === 'active' ? 1 : .5; bend = .5; }
  if (id === 'wormRocks' && ph === 'windup') { bend = -.35; open = .9; }
  if (id === 'shockwave' && ph === 'windup') { bend = -.2; reach = 1.1; open = 1; }
  V[0] = Math.max(.08, up * lift * reach); V[1] = bend; V[2] = side; V[3] = tilt; V[4] = open; V[5] = lash;
}

// ------------------------------------------------------------------------------------------------ the pose
const T = new Float64Array(3);
export function sampleWorm(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = WORM_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000;
  if (!dead) act(e, tr, now, t); else { V[0] = Math.max(.08, tr.shown[0] || .5); V[1] = .2; V[2] = 0; V[3] = 0; V[4] = .3; V[5] = 0; ACT.contact = 0; ACT.fire = 0; ACT.suck = 0; ACT.phase = 'death'; }
  // facing: the attack's aim, else the Wayfarer
  let want = tr.yaw;
  if (ACT.aim) want = Math.atan2(ACT.aimY, ACT.aimX);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)); tr.yaw += Math.max(-1, Math.min(1, dt * (e.pack?.attack ? G.attackTurnRate : G.turnRate))) * delta; }
  const yaw = tr.yaw, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // blend: the posture and the bends ease (the game's own lift already eases at its posture rate)
  const key = dead ? 'death' : e.pack?.attack ? `${e.pack.attack}:${e.pack.seq}:${e.pack.phase}:${e.pack.data?.slammed ? 1 : 0}` : 'move';
  if (tr.key === '' || !(gapMs <= G.blendMs * 4)) { tr.shown.set(V); tr.from.set(V); tr.key = key; tr.blendAt = -Infinity; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < 6; k++) W6[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  W6[0] = V[0]; W6[2] = e.pack?.attack === 'wormSweep' && e.pack.phase === 'active' ? V[2] : W6[2]; // the lift and the sweep's swing follow the game exactly
  tr.shown.set(W6);
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp; const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 10) : 0;
  if (ACT.contact && !tr.contactWas) tr.contactAt = now; tr.contactWas = ACT.contact;
  const cT = (now - tr.contactAt) / 1000, jolt = cT < .35 ? kick(cT, 20, 9) : 0;
  // death: it sinks back into its hole
  const sinkDeath = dead ? smooth(death / .8) : 0;
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  // the column: the base sunk so that `height` of it stands above the ground; the bends spread up it, most near the head
  const len = SEGS * G.seg, base = W6[0] * (1 - sinkDeath) * len - len; // seg0's height: `lift` of the column's length stands above the ground
  const sway = reduce ? 0 : .06 * wobble(t * .9, 1), suckShiver = ACT.suck && !reduce ? .012 * Math.sin(t * 18) : 0;
  setOffset(P, BI.seg0, 0, 0, base + .3 - .02 * jolt); setEuler(P, BI.seg0, 0, W6[3] + .04 * jolt, 0); resolveBone(P, BI.seg0);
  for (let i = 1; i < SEGS; i++) { const f = i / (SEGS - 1), wgt = (2 * f) / SEGS;
    setEuler(P, BI['seg' + i], .02 * sway, W6[1] * wgt + .15 * hit * f, -W6[2] * wgt + sway * .3 * Math.sin(f * Math.PI) + .2 * hit * tr.hitSide * f); P.scl[BI['seg' + i]] = 1 + suckShiver; resolveBone(P, BI['seg' + i]); }
  // the head: tilted toward the Wayfarer so the maw faces it; the throat opens wider as the maw opens
  setEuler(P, BI.head, 0, .6 + .25 * W6[1] - .2 * ACT.suck, 0); resolveBone(P, BI.head);
  const open = W6[4]; setOffset(P, BI.throat, 0, 0, .02 * (open - .7)); P.scl[BI.throat] = Math.max(.001, .6 + .45 * open); resolveBone(P, BI.throat);
  // the lip tentacles: writhing; thrown forward along the maw's lanes when it lashes; drawn in as it drinks the air
  const hi = BI.head * 9, hu = [P.wr[hi + 6], P.wr[hi + 7], P.wr[hi + 8]], hl = Math.hypot(hu[0], hu[1], hu[2]) || 1;
  for (let i = 0; i < TENTS; i++) {
    const a = (i / TENTS) * Math.PI * 2, wr = reduce ? 0 : wobble(t * 2.2, i), out = .5 + .35 * wr - .4 * ACT.suck, lash = W6[5];
    setEuler(P, BI['tent' + i], a, out * (1 - lash) + .1 * lash, 0); P.scl[BI['tent' + i]] = 1 + 1.6 * lash; resolveBone(P, BI['tent' + i]);
    if (lash > .05) { // the lash: the tendril aimed along its lane, forward from the maw
      const lane = (i - (TENTS - 1) / 2) * .22, dx = Math.cos(yaw + lane), dy = Math.sin(yaw + lane);
      T[0] = dx * (1 - lash) + hu[0] / hl * (1 - lash); T[1] = dy + hu[1] / hl * (1 - lash); T[2] = -.15 * lash + hu[2] / hl * (1 - lash);
      aimWorld(P, BI['tent' + i], 2, T[0], T[1], T[2], -sf, cf, 0); resolveBone(P, BI['tent' + i]);
    }
    setEuler(P, BI['tentB' + i], 0, (reduce ? .3 : .3 + .4 * wobble(t * 2.6, i + 7)) * (1 - lash), 0); resolveBone(P, BI['tentB' + i]);
  }
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 1.4) : 1, pulse = reduce ? 1 : .85 + .15 * Math.sin(t * 5);
  F.emitK[0] = life * pulse * (1 + .9 * Math.max(ACT.suck, ACT.fire) + .3 * (open - .7)); // the fire deep in the throat
  F.emitK[1] = 0; F.emitK[2] = ACT.fire > 0 ? (reduce ? 1.6 : 1.4 + .4 * Math.sin(t * 17)) : 0; F.emitK[3] = 0;
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = ACT.fire > .9 ? .8 : 0; F.emitA[3] = 0;
  F.tier = env.tier || 'full'; F.mesh = wormMesh(F.tier); F.skin = P.skin; F.alpha = 1;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = 0; F.shadow = 1; F.phase = ACT.phase; F.contact = ACT.contact; F.cloud = F.emitA[2] > 0;
  return F;
}
export const wormBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
