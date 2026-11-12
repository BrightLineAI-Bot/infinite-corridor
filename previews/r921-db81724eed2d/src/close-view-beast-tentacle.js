// The Tremor Worm's field tentacles in Close View (the `wormTentacles` attack's `wormTentacle` minions; monster-pack.ts
// tentacleTurret; the standard view's monster-render.ts wormTentacle: a tapering limb out of broken ground, suckers along its
// inside curve, a mouth, lens, bulb, vents, pincers or bone blades at the tip by its mode). One small skinned body on the beast
// rig, in the worm's own tentacle flesh (close-view-beast-worm.ts buildTendril and TENTACLE_LOOK), rising from a small crack:
// - rising and sinking on the game's `rising` share (it unfurls out of the crack, and twists back down into it);
// - idle, a travelling wave of sway, leaning toward the Wayfarer with its suckers on the inside of the curve;
// - fire, spread and orbs: it rears and its tip swells and brightens toward each shot (the game's own countdown), snaps
//   forward as it spits and recoils;
// - the laser: it rears up through the charge as the lens brightens, then holds the beam, its glowing tip turned along the
//   game's beam angle as that turns after the Wayfarer;
// - grab: it coils, then stretches out to whoever it holds; swipe: it winds round and whips flat round on the game's swing;
// - death: it flops over and sinks into the crack.
// Under the ground (hidden) it keeps the billboard (which draws nothing then: the game draws the cracks). Nothing here
// changes timing, damage, reach or targeting. Kept small for the minion allowance (BEAST_SLOT.minion).
import {
  BEAST_SLOT, defineSkeleton, createPose, resetPose, setEuler, setOffset, resolveBone, aimWorld, writeSkin, meshBuilder, clamp01, smooth, kick, wobble,
} from "./close-view-beast-rig.js?v=r921-db81724eed2d";
import { buildTendril, lerpHex, TENTACLE_LOOK } from "./close-view-beast-worm.js?v=r921-db81724eed2d";

const SEG = 7;
export const TENTACLE_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts' shared Close View size
  bone: .16, tipBone: .12, root: .17, tip: .05, // the chain's bind lengths and the limb's root and tip radii (the standard view's .2 to .06 tile half width)
  lean: .2, curl: -.16, wave: .17, roll: .13, speed: 2.2, travel: .8, turnRate: 4,
  // the shot: how far ahead it rears (s), how hard it rears and snaps forward
  windupS: .45, rear: .55, snap: .28,
  laserRear: .35, laserTilt: -.18, // the laser: how it rears through the charge; the beam's downward tilt at the tip
  grabStretch: .5, swipeRoll: 1.5, // the grab's extra bind length per bone at full reach; the swipe's whip round
  sinkTwist: 2.4, deathMs: 1100, hitMs: 300,
});
const MODES = Object.freeze(['fire', 'laser', 'orbs', 'spread', 'grab', 'swipe']);
const modeOf = (e) => MODES.includes(e?.tentacleMode) ? e.tentacleMode : 'fire';

// ------------------------------------------------------------------------------------------------ skeleton
// root on the ground at the crack; the chain straight up from it; the tip carries the mouth, lens or club; dirt is the earth
// it throws off as it breaks out
export const TENTACLE_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  ...Array.from({ length: SEG }, (_, i) => ({ name: 's' + i, parent: i ? 's' + (i - 1) : 'root', at: [0, 0, i ? TENTACLE_RIG.bone : 0] })),
  { name: 'tip', parent: 's' + (SEG - 1), at: [0, 0, TENTACLE_RIG.tipBone] },
  { name: 'dirt', parent: 'root', at: [0, 0, 0] },
]);
const BI = TENTACLE_SKELETON.index, CHAIN = [...Array.from({ length: SEG }, (_, i) => 's' + i), 'tip'];
const TIP_Z = TENTACLE_RIG.bone * (SEG - 1) + TENTACLE_RIG.tipBone;

const hexOf = (c) => parseInt(String(c).slice(1), 16);
// MONSTER_PACK.wormTentacle.palette and the tips monster-render.ts paints
const C = Object.freeze({ pit: hexOf("#120a06"), crack: hexOf("#22160c"), rubble: hexOf("#7a6044"), rubbleDark: hexOf("#56422e"), lip: hexOf("#2a0a04"), dark: hexOf("#3a1a12"),
  fire: hexOf("#ff7a2a"), ember: hexOf("#ffcf6a"), sclera: hexOf("#ffe8d0"), iris: hexOf("#ff3a2a"), pupil: hexOf("#1a0604"), orb: hexOf("#c06aff"), orbCore: hexOf("#f0d0ff"),
  orbSkin: hexOf("#2a0a3a"), bone: hexOf("#f3e2c0"), grip: hexOf("#ffd8c0") });
const HALO = Object.freeze({ fire: C.fire, laser: C.iris, orbs: C.orb, spread: C.fire, grab: C.grip, swipe: C.fire });
const hash = (n) => { let x = (n | 0) * 374761393 + 668265263; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };

function buildTentacleMesh(tier, mode) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(TENTACLE_SKELETON, full ? 1 : low ? .4 : .7), R = TENTACLE_RIG;
  // the crack it stands in: a small dark pit, cracks running out, broken chunks on the rim
  B.bone('root').color(C.pit).ellipsoid({ at: [0, 0, .004], radius: [.27, .27, .004], rings: 3, seg: low ? 6 : 12, U: [0, 0, 1] });
  if (!low) for (let i = 0; i < 5; i++) { const a = i * 1.3 + hash(i) * .6, len = .14 + hash(i * 3) * .16, r0 = .25 + len / 2;
    B.bone('root').color(C.crack).box({ at: [Math.cos(a) * r0, Math.sin(a) * r0, .003], F: [Math.cos(a), Math.sin(a), 0], U: [0, 0, 1], size: [len / 2, .016, .002], bevel: 0, taper: .7 }); }
  for (let i = 0; i < (low ? 3 : 7); i++) { const a = (i / (low ? 3 : 7)) * Math.PI * 2 + hash(i * 5) * .5, r = .25 + hash(i * 7) * .06, sz = .03 + hash(i * 11) * .03;
    B.bone('root').color(i % 2 ? C.rubble : C.rubbleDark).box({ at: [Math.cos(a) * r, Math.sin(a) * r, sz * .5], F: [Math.cos(a + i), Math.sin(a + i), .3], U: [hash(i) - .5, .2, 1], size: [sz * 1.2, sz, sz * .7], bevel: 0 }); }
  // the limb: the worm's own tentacle flesh, thick at the root, its suckers down the inside of the curve
  buildTendril(B, { bones: CHAIN, root: [0, 0, 0], length: TIP_Z + .04, sink: -.08, r0: R.root, rTip: R.tip, bulb: .22, rootTone: TENTACLE_LOOK.back,
    rings: low ? 5 : full ? 12 : 9, seg: low ? 5 : full ? 9 : 7, minSeg: 5, suckers: low ? 2 : full ? 6 : 5, suckerSize: .36, full });
  // the tip, by its mode (bone-local to the tip bone; the limb runs up +u)
  const tip = B.bone('tip'), ts = low ? 5 : full ? 10 : 8;
  if (mode === 'laser') { // a single lidded lens
    tip.color(C.dark).lathe({ at: [0, 0, -.02], F: [0, 0, 1], U: [1, 0, 0], seg: ts, rings: [[0, R.tip * 1.1], [.05, R.tip * 1.9], [.09, R.tip * 1.75], [.1, R.tip * 1.35]], caps: false });
    tip.color(C.sclera).ellipsoid({ at: [0, 0, .07], radius: [R.tip * 1.5, R.tip * 1.5, R.tip * 1.1], F: [0, 0, 1], rings: 3, seg: ts });
    tip.color(C.iris, 1).ellipsoid({ at: [0, 0, .07 + R.tip * 1.02], radius: [R.tip * .25, R.tip * .85, R.tip * .85], F: [0, 0, 1], U: [1, 0, 0], rings: 2, seg: ts });
    tip.color(C.pupil).ellipsoid({ at: [0, 0, .07 + R.tip * 1.22], radius: [R.tip * .1, R.tip * .36, R.tip * .36], F: [0, 0, 1], U: [1, 0, 0], rings: 2, seg: 6 });
  } else if (mode === 'orbs') { // a bulb that swells with an orb
    tip.color(C.orbSkin).ellipsoid({ at: [0, 0, .05], radius: [R.tip * 2, R.tip * 2, R.tip * 2.2], F: [0, 0, 1], rings: 4, seg: ts });
    tip.color(C.orb, 1).ellipsoid({ at: [0, 0, .05 + R.tip * 1.5], radius: [R.tip * .5, R.tip * 1.25, R.tip * 1.25], F: [0, 0, 1], U: [1, 0, 0], rings: 2, seg: ts });
    tip.color(C.orbCore, 1).ellipsoid({ at: [0, 0, .05 + R.tip * 1.95], radius: [R.tip * .25, R.tip * .6, R.tip * .6], F: [0, 0, 1], U: [1, 0, 0], rings: 2, seg: 6 });
  } else if (mode === 'grab') { // hooked pincers round a pale grip
    for (const s of [-1, 1]) for (const [k, h] of [[0, .0], [1, .055]]) tip.color(C.dark).box({ at: [s * (R.tip * .9 + k * .035), 0, .03 + h], F: [s * (k ? -.5 : .7), 0, 1], U: [0, 1, 0], size: [.045, .016, .02 - k * .005], bevel: 0, taper: .5 });
    tip.color(C.grip).ellipsoid({ at: [0, 0, .03], radius: [R.tip * .9, R.tip * .9, R.tip * .7], F: [0, 0, 1], rings: 3, seg: ts });
  } else if (mode === 'swipe') { // a club ridged with bone blades
    tip.color(C.dark).ellipsoid({ at: [0, 0, .03], radius: [R.tip * 1.9, R.tip * 1.4, R.tip * 2.2], F: [0, 0, 1], U: [1, 0, 0], rings: 4, seg: ts });
    for (let k = 2; k < SEG; k += low ? 3 : 2) { const b = 's' + k, r = R.root * (1 - .7 * k / SEG);
      B.bone(b).color(C.bone).box({ at: [r * .9, 0, .05], F: [.25, 0, 1], U: [1, 0, 0], size: [.05, .006, .03], bevel: 0, taper: .8 }); }
  } else { // fire and spread: a burning mouth (spread: flared, pocked with vents)
    const flare = mode === 'spread' ? 1.35 : 1;
    tip.color(C.lip).lathe({ at: [0, 0, -.02], F: [0, 0, 1], U: [1, 0, 0], seg: ts, rings: [[0, R.tip * 1.1], [.05, R.tip * 1.7 * flare], [.08, R.tip * 1.5 * flare], [.07, R.tip * .95 * flare]], caps: false });
    tip.color(C.fire, 1).lathe({ at: [0, 0, .05], F: [0, 0, 1], U: [1, 0, 0], seg: ts, rings: [[0, R.tip * .95 * flare], [-.04, R.tip * .5 * flare], [-.05, 0]], caps: false });
    tip.color(C.ember, 1).ellipsoid({ at: [0, 0, .015], radius: [R.tip * .45, R.tip * .45, R.tip * .25], F: [0, 0, 1], rings: 2, seg: 6 });
    if (mode === 'spread' && !low) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2;
      tip.color(C.ember, 1).ellipsoid({ at: [Math.cos(a) * R.tip * 1.55, Math.sin(a) * R.tip * 1.55, .045], radius: [R.tip * .26, R.tip * .26, R.tip * .2], F: [0, 0, 1], rings: 2, seg: 5 }); }
  }
  // the earth thrown off as it breaks out (hidden but for that)
  for (let i = 0; i < (low ? 3 : 7); i++) { const a = (i / (low ? 3 : 7)) * Math.PI * 2 + hash(i * 13), r = .16 + hash(i * 17) * .08, sz = .016 + hash(i * 19) * .02;
    B.bone('dirt').color(i % 2 ? C.rubbleDark : C.rubble).box({ at: [Math.cos(a) * r, Math.sin(a) * r, hash(i * 23) * .12], F: [Math.cos(a + i), Math.sin(a + i), .5], U: [.3, hash(i) - .5, 1], size: [sz, sz * .7, sz * .6], bevel: 0, taper: .4 }); }
  // the glow round the tip (channel 3: two-sided and dithered; shown while it charges, holds a beam or spits)
  B.mark();
  B.bone('tip').color(lerpHex(HALO[mode], 0xffffff, .2), 3).ellipsoid({ at: [0, 0, .07], radius: [R.tip * 2.6, R.tip * 2.6, R.tip * 2.6], F: [0, 0, 1], rings: 3, seg: low ? 6 : 8 });
  return B.done();
}
const MESHES = { full: Object.create(null), balanced: Object.create(null), low: Object.create(null) };
// `foe` picks the tip its mode carries (one cached mesh per tier and mode, built on first use)
export function tentacleMesh(tier = 'full', foe = null) { const T = MESHES[tier] || MESHES.full, m = modeOf(foe); return T[m] ||= buildTentacleMesh(MESHES[tier] ? tier : 'full', m); }
export const TENTACLE_MODES = MODES;

// ------------------------------------------------------------------------------------------------ the track
export function createTentacleTrack() {
  return {
    pose: createPose(TENTACLE_SKELETON), yaw: NaN, at: NaN, hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null, x: 0, y: 0, z: 0, fallSide: 1,
    shots: -1, shotAt: -Infinity, next: NaN, stage: '', bornAt: null, riseSeen: 0, phase: '',
    frame: { kind: 'wormTentacle', tier: 'full', mesh: null, skin: null, boneCount: TENTACLE_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: .55, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}

// ------------------------------------------------------------------------------------------------ what it is doing
// windup 0..1 toward the next shot; the shot's snap (render clock); the laser's charge and beam; the grab and the swipe
const ACT = { windup: 0, glow: .6, halo: 0, beam: false, beamA: 0, charge: 0, grab: 0, gx: 0, gy: 0, swing: 0, swingWind: 0, phase: '' };
function act(e, tr, now, mode) {
  const s = e.pack || {}, R = TENTACLE_RIG;
  ACT.windup = 0; ACT.glow = .6; ACT.halo = 0; ACT.beam = false; ACT.charge = 0; ACT.grab = 0; ACT.swing = 0; ACT.swingWind = 0; ACT.phase = mode;
  let shots = tr.shots;
  if (mode === 'fire' && s.fire) {
    const next = Number(s.fire.next) || 0; ACT.windup = clamp01(1 - next / R.windupS); shots = Number(s.fire.shots) || 0; ACT.phase = 'fire:' + (next < R.windupS ? 'windup' : 'rest');
  } else if (mode === 'laser' && s.laser) {
    const L = s.laser, charge = Number(L.charge) || 0; ACT.beamA = Number(L.angle) || 0; ACT.beam = true;
    ACT.charge = charge > 0 ? clamp01(1 - charge / 1.3) : 1; ACT.phase = charge > 0 ? 'laser:charge' : 'laser:hold';
  } else if (s.tent) {
    const T = s.tent, next = Number(T.next) || 0;
    if (mode === 'orbs') { ACT.windup = clamp01(1 - next / 1.6); if (Number.isFinite(tr.next) && next > tr.next + .2) shots = tr.shots + 1; ACT.phase = 'orbs'; }
    else if (mode === 'spread') { ACT.windup = T.stage === 'warn' ? clamp01(1 - (Number(T.t) || 0) / .45) : 0; if (tr.stage === 'warn' && T.stage === 'rest') shots = tr.shots + 1; ACT.phase = 'spread:' + T.stage; }
    else if (mode === 'grab') {
      ACT.windup = T.stage === 'warn' ? clamp01(1 - (Number(T.t) || 0) / .5) : 0;
      if (e.grabbing) { ACT.grab = 1; ACT.gx = Number(e.grabbing.x) || 0; ACT.gy = Number(e.grabbing.y) || 0; } ACT.phase = 'grab:' + (e.grabbing ? 'hold' : T.stage);
    } else if (mode === 'swipe') { ACT.swingWind = T.stage === 'warn' ? clamp01(1 - (Number(T.t) || 0) / .4) : 0; ACT.swing = clamp01((Number(e.tentSwing) || 0) / .3); ACT.phase = 'swipe:' + T.stage; }
    tr.next = next; tr.stage = T.stage;
  }
  if (tr.shots >= 0 && shots > tr.shots) tr.shotAt = now;
  tr.shots = shots;
  ACT.glow = mode === 'laser' ? .3 + 1.5 * ACT.charge : mode === 'grab' || mode === 'swipe' ? .5 : .6 + 1.1 * ACT.windup;
}

// ------------------------------------------------------------------------------------------------ the pose
const DIR = new Float64Array(3);
export function sampleTentacle(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = TENTACLE_RIG, mode = modeOf(e);
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, seed = (Math.abs(Math.round((Number(e.x) || 0) * 7 + (Number(e.y) || 0) * 13)) % 17) * .9;
  if (!dead) act(e, tr, now, mode); else { ACT.windup = 0; ACT.glow = .3; ACT.halo = 0; ACT.beam = false; ACT.charge = 0; ACT.grab = 0; ACT.swing = 0; ACT.swingWind = 0; ACT.phase = 'death'; }
  // facing: the beam, the grab, else the Wayfarer (the root turns its suckers' side to face it: the limb's yaw is the facing + pi)
  let want = tr.yaw;
  if (ACT.beam) want = ACT.beamA;
  else if (ACT.grab) want = Math.atan2(ACT.gy, ACT.gx);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .2) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)); tr.yaw += (ACT.beam || reduce ? 1 : Math.min(1, dt * G.turnRate)) * delta; }
  const yaw = tr.yaw;
  // hits: a jolt away from the blow
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; tr.hitSide = (Math.round(now / 97) % 2) ? 1 : -1; }
  tr.hp = e.hp; const hitT = (now - tr.hitAt) / 1000, hit = !reduce && hitT < G.hitMs / 1000 ? kick(hitT, 20, 10) : 0;
  // up out of the crack: the game's `rising` (1 under, 0 up), the sinking twist; the death: it flops over, then sinks
  const rising = clamp01(Number(e.rising) || 0), sinking = e.tentPhase === 'sinking', up = 1 - rising;
  const fall = dead ? smooth(death / .45) : 0, sinkD = dead ? smooth((death - .4) / .6) : 0, under = Math.max(rising, sinkD);
  const shotT = (now - tr.shotAt) / 1000, snap = reduce || shotT > .6 ? 0 : (shotT < .07 ? shotT / .07 : 1) * kick(Math.max(0, shotT - .07), 14, 7);
  resetPose(P);
  setEuler(P, BI.root, yaw + Math.PI, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  // the chain: lean toward its foe (negative pitch: the suckers' side), a curl, a travelling wave of sway; coming up it is
  // curled tight and unfurls; sinking it twists down; rearing for a shot it bends back, and snaps forward as it spits
  const unfurl = 1 - up, rear = ACT.windup * G.rear * (mode === 'laser' ? 0 : 1) + (mode === 'laser' ? G.laserRear * (1 - ACT.charge) * (ACT.charge < 1 ? 1 : 0) : 0);
  const grabbing = ACT.grab, grabD = grabbing ? Math.hypot(ACT.gx, ACT.gy) : 0;
  setOffset(P, BI.s0, 0, 0, -under * (TIP_Z + .1)); setEuler(P, BI.s0, (sinking ? G.sinkTwist * rising : 0) + .3 * unfurl, -.06 + .1 * hit * tr.hitSide, -fall * 1.25 * tr.fallSide); resolveBone(P, BI.s0);
  for (let k = 1; k < SEG; k++) {
    const f = k / (SEG - 1), ph = t * G.speed * (1 + ACT.windup) - k * G.travel + seed, amp = .5 + .7 * f;
    let pitch = (-G.lean * (.4 + f) + G.curl * f * f) * (1 - .8 * unfurl) + G.wave * amp * Math.sin(ph) + rear * (f < .6 ? .5 : -.25) - G.snap * snap * f;
    let roll = G.roll * amp * Math.sin(ph * .8 + 1.3) + .12 * hit * tr.hitSide * f;
    pitch += -.8 * unfurl * Math.max(0, f - .35) / .65 + .2 * fall;
    if (grabbing) pitch = k === 1 ? -1.05 : .04 * Math.sin(ph);
    if (ACT.swingWind > 0) roll += .5 * ACT.swingWind * f;
    if (ACT.swing > 0) { roll += -G.swipeRoll * Math.sin(Math.PI * (1 - ACT.swing)) * f * 1.2; pitch -= .35 * Math.sin(Math.PI * (1 - ACT.swing)); }
    if (reduce) { pitch = (-G.lean * (.4 + f) + G.curl * f * f) * (1 - .8 * unfurl) + rear * (f < .6 ? .5 : -.25) - .8 * unfurl * Math.max(0, f - .35) / .65 + .2 * fall; if (grabbing) pitch = k === 1 ? -1.05 : 0; }
    setOffset(P, BI['s' + k], 0, 0, grabbing ? Math.min(G.grabStretch, Math.max(0, (grabD / S - TIP_Z) / (SEG - 1))) : 0);
    setEuler(P, BI['s' + k], 0, pitch, roll); resolveBone(P, BI['s' + k]);
  }
  // the tip: its mouth, lens or bulb swells toward the shot; the laser's lens turns along the beam (down toward the ground)
  setEuler(P, BI.tip, 0, -.25 * ACT.windup - G.snap * snap * .6, 0); P.scl[BI.tip] = 1 + .3 * ACT.windup * (mode === 'laser' ? 0 : 1) + .15 * snap; resolveBone(P, BI.tip);
  if (ACT.beam && !dead) {
    const w = ACT.charge, ti = BI.tip * 9, sc = Math.hypot(P.wr[ti + 6], P.wr[ti + 7], P.wr[ti + 8]) || 1, c = Math.cos(G.laserTilt);
    DIR[0] = P.wr[ti + 6] / sc * (1 - w) + Math.cos(ACT.beamA) * c * w; DIR[1] = P.wr[ti + 7] / sc * (1 - w) + Math.sin(ACT.beamA) * c * w; DIR[2] = P.wr[ti + 8] / sc * (1 - w) + Math.sin(G.laserTilt) * w;
    const scl = P.scl[BI.tip]; aimWorld(P, BI.tip, 2, DIR[0], DIR[1], DIR[2], 0, 0, 1); P.scl[BI.tip] = scl; resolveBone(P, BI.tip);
  }
  // the earth thrown off as it breaks out of the crack
  const burst = rising > 0 && !sinking && !reduce ? 1 - rising : -1;
  if (burst >= 0 && burst < 1) { setOffset(P, BI.dirt, 0, 0, .9 * burst * (1 - burst)); setEuler(P, BI.dirt, burst * 2, 0, 0); P.scl[BI.dirt] = .7 + 1.4 * burst; } else P.scl[BI.dirt] = .001;
  resolveBone(P, BI.dirt);
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 1.6) : 1, flick = reduce ? 1 : .88 + .12 * Math.sin(t * 23 + seed);
  const hold = mode === 'laser' && ACT.charge >= 1 && !dead;
  F.emitK[0] = Math.min(2.6, life * (ACT.glow * flick + 1.2 * snap) * (.35 + .65 * up)); F.emitK[1] = 0; F.emitK[3] = 0;
  const halo = dead ? 0 : hold ? .55 * flick : mode === 'laser' ? .45 * ACT.charge : Math.max(.5 * snap, ACT.windup > .7 ? (ACT.windup - .7) / .3 * .35 : 0);
  F.emitK[2] = halo > 0 ? 1.3 + (hold ? .5 : 0) : 0; F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = Math.min(.5, halo); F.emitA[3] = 0;
  F.tier = env.tier || 'full'; F.mesh = tentacleMesh(F.tier, e); F.skin = P.skin; F.alpha = 1;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S * .6; F.air = 0; F.shadow = .55 * up; F.phase = dead ? 'death' : rising > 0 ? (sinking ? 'sinking' : 'rising') : ACT.phase;
  F.contact = snap > .5 || grabbing ? 1 : 0; F.cloud = F.emitA[2] > 0;
  return F;
}
export const tentacleBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
export { BEAST_SLOT };
