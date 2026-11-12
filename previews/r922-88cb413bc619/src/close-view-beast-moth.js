// The Ashen Moth in Close View (and its far kin, the Grove Moth): the standard view's moth (ashen-moth-render.ts drawAshenMoth:
// two ash-grey fore-wings and rounded hind-wings with ember veins and a glowing eye-spot on each fore-wing, a furred thorax, a
// banded abdomen, a hooded head with feathered antennae ending in ember lanterns, a cocoon of ash with ember cracks) as one
// skinned body on the shared beast rig. It moves as the game poses it: every attack phase sets `mothPose` (beat, shake, raise,
// climb, dive, spin, fold) with a wing spread and a flap rate (MOTH_RIG.poses mirrors the standard view's table), `mothAir`
// lifts it, `mothKindled` sets it burning from wingtip to wingtip and `mothCocoon` closes it in ash. Nothing here changes
// timing, damage, reach or targeting.
import {
  defineSkeleton, createPose, resetPose, setEuler, resolveBone, writeSkin, meshBuilder, clamp01, smooth, span, kick, wobble,
} from "./close-view-beast-rig.js?v=r922-88cb413bc619";

export const MOTH_RIG = Object.freeze({
  closeViewScale: 1.25, // the beasts share the Giant's Close View size (Tim, 2026-11-11)
  hover: .75, airLift: .9, bob: .06, flap: 7, // as the standard view (MOTH_ART): hover height, lift per unit of mothAir, bob, flap rate
  turnRate: 4, attackTurnRate: 10, blendMs: 140, deathMs: 1800, hitMs: 300,
  // [spread (0 folded .. 1 open), flap rate, body pitch (+ nose up), wing lift (+ raised)] by the game's mothPose
  poses: Object.freeze({
    idle: [1, 1, 0, 0], raise: [1.1, .6, .45, .5], beat: [1, 2.2, .1, 0], shake: [1, 2.8, 0, .1], climb: [.9, 1.8, .35, .15],
    dive: [.25, 0, -.6, .3], spin: [1, 1.6, 0, 0], fold: [0, 0, .05, .4], dazed: [.55, .4, -.25, -.25],
  }),
});

// ------------------------------------------------------------------------------------------------ skeleton
// model space: f forward, r right, u up; the thorax at the origin's height (the root is on the ground; `body` carries the hover)
const LEG_AT = [[.07, .06], [0, .07], [-.07, .06]];
export const MOTH_SKELETON = defineSkeleton([
  { name: 'root', parent: null, at: [0, 0, 0] },
  { name: 'body', parent: 'root', at: [0, 0, MOTH_RIG.hover] },
  { name: 'abd0', parent: 'body', at: [-.12, 0, -.01] }, { name: 'abd1', parent: 'abd0', at: [-.14, 0, -.015] }, { name: 'abd2', parent: 'abd1', at: [-.13, 0, -.02] },
  { name: 'head', parent: 'body', at: [.19, 0, .02] },
  ...['L', 'R'].flatMap((tag) => { const s = tag === 'L' ? -1 : 1;
    return [{ name: 'ant' + tag, parent: 'head', at: [.05, s * .035, .05] }, { name: 'antTip' + tag, parent: 'ant' + tag, at: [.13, s * .1, .16] },
      { name: 'fore' + tag, parent: 'body', at: [.04, s * .08, .05] }, { name: 'foreOut' + tag, parent: 'fore' + tag, at: [0, s * .5, 0] },
      { name: 'hind' + tag, parent: 'body', at: [-.05, s * .07, .02] },
      ...LEG_AT.map(([f, r], i) => ({ name: 'leg' + i + tag, parent: 'body', at: [f, s * r, -.07] }))]; }),
  { name: 'cocoon', parent: 'root', at: [0, 0, MOTH_RIG.hover] },
]);
const BI = MOTH_SKELETON.index;
const E_EYE = 1, E_VEIN = 2, E_CRACK = 3, E_FLAME = 4;

// ------------------------------------------------------------------------------------------------ the body
const hexOf = (c) => parseInt(String(c).slice(1), 16);
// MOTH_ART (ashen-moth-render.ts), as numbers
const C = Object.freeze({ wing: hexOf("#55504a"), wingDark: hexOf("#2c2824"), wingEdge: hexOf("#14110e"), vein: hexOf("#ff8a2a"), eye: hexOf("#ff6a1a"), eyeCore: hexOf("#ffe2b0"),
  body: hexOf("#3a3430"), fur: hexOf("#6a625a"), ember: hexOf("#ffb04a"), fire: hexOf("#ff7a1a"), ash: hexOf("#8a847c"), ashPale: hexOf("#9a948c"), ashDark: hexOf("#3a3530") });
// the wings' outlines (right side, model space at the shoulder): from the leading root round the edge to the trailing root
const FORE = Object.freeze([[.06, .02], [.16, .3], [.22, .6], [.24, .86], [.17, .98], [-.02, 1.0], [-.2, .92], [-.32, .72], [-.35, .46], [-.25, .2], [-.08, .06]]);
const HIND = Object.freeze([[-.04, .02], [-.14, .3], [-.28, .56], [-.46, .64], [-.62, .52], [-.66, .3], [-.54, .1], [-.32, .03]]);
function lerpHex(a, b, t) { t = clamp01(t); const ch = (sh) => Math.round(((a >> sh) & 255) + ((((b >> sh) & 255) - ((a >> sh) & 255)) * t)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); }
function buildMothMesh(tier) {
  const full = tier === 'full', low = tier === 'low', B = meshBuilder(MOTH_SKELETON, tier === 'full' ? 1 : tier === 'balanced' ? .7 : .4), bw = MOTH_SKELETON.bindWorld;
  const at = (bone, p) => { const i = BI[bone] * 3; return [p[0] - bw[i], p[1] - bw[i + 1], p[2] - bw[i + 2]]; };
  const H = MOTH_RIG.hover;
  // The wings: each a sheet from a short root along the body out to its scalloped edge, skinned to the wing bone (the fore-wing's
  // outer half to its outer bone, so it flexes on the beat). Ash grey at the root darkening to the edge; dark between the veins.
  for (const s of [-1, 1]) {
    const tag = s < 0 ? 'L' : 'R', fb = 'fore' + tag, fo = 'foreOut' + tag, hb = 'hind' + tag;
    const wing = (outline, root, bone, outer, rows, z0) => {
      const n = outline.length, sh = [bw[BI[bone] * 3], bw[BI[bone] * 3 + 1], bw[BI[bone] * 3 + 2]], grid = [];
      for (let r = 0; r < rows; r++) { const k = r / (rows - 1), row = [];
        for (let c = 0; c < n; c++) { const q = c / (n - 1), rf = root[0] + (root[1] - root[0]) * q, E = outline[c], sag = .025 * Math.sin(Math.PI * k) * Math.sin(Math.PI * q);
          row.push([sh[0] + rf + (E[0] - rf) * k, sh[1] + s * (.01 + (E[1] - .01) * k), sh[2] + z0 - sag + .04 * k * k]); }
        grid.push(row); }
      B.sheet({ grid, vertBones: (r, c) => outer ? [bone, outer, smooth(span(r / (rows - 1), .35, .8))] : [bone, bone, 0],
        tone: (r, c) => { const k = r / (rows - 1); let col = lerpHex(C.wing, C.wingDark, k * .8); if (r === rows - 1) col = C.wingEdge; else if (c % 2 && k > .2) col = lerpHex(col, C.wingDark, .45); return col; } });
    };
    const rows = low ? 3 : full ? 6 : 4;
    wing(HIND, [-.04, -.3], hb, null, rows, -.01);
    wing(FORE, [.06, -.08], fb, fo, rows, 0);
    // ember veins fanning from the root (emissive; they glow brighter kindled)
    const vein = (bone, from, to, w) => { const dx = to[0] - from[0], dy = to[1] - from[1], len = Math.hypot(dx, dy);
      B.bone(bone).color(C.vein, E_VEIN).ellipsoid({ at: at(bone, [(from[0] + to[0]) / 2, s * (from[1] + to[1]) / 2, bw[BI[bone] * 3 + 2] + .012]), radius: [len / 2, w, .004], rings: 2, seg: 4, F: [dx / len, s * dy / len, 0], U: [0, 0, 1] }); };
    const fsh = [bw[BI[fb] * 3], bw[BI[fb] * 3 + 1] * s], hsh = [bw[BI[hb] * 3], bw[BI[hb] * 3 + 1] * s];
    const fv = low ? [[.2, .8], [-.2, .76]] : [[.22, .8], [.12, .95], [-.06, .94], [-.22, .8], [-.3, .5]];
    for (const [f, r] of fv) vein(r > .55 ? fo : fb, [fsh[0] + .02, fsh[1] + .04], [fsh[0] + f * .85, fsh[1] + r * .85], .007);
    if (!low) for (const [f, r] of [[-.36, .52], [-.56, .38]]) vein(hb, [hsh[0] - .02, hsh[1] + .04], [hsh[0] + f * .85, hsh[1] + r * .85], .006);
    // the eye-spot on each fore-wing: a dark ring, an ember iris, a hot core
    const ex = fsh[0] - .05, ey = fsh[1] + .6, ez = bw[BI[fo] * 3 + 2] + .02;
    B.bone(fo).color(C.wingEdge).ellipsoid({ at: at(fo, [ex, s * ey, ez]), radius: [.12, .1, .006], rings: low ? 3 : 4, seg: low ? 10 : 16, U: [0, 0, 1] });
    B.bone(fo).color(C.eye, E_EYE).ellipsoid({ at: at(fo, [ex, s * ey, ez + .006]), radius: [.085, .07, .006], rings: low ? 3 : 4, seg: low ? 10 : 16, U: [0, 0, 1] });
    if (!low) B.bone(fo).color(C.eyeCore, E_EYE).ellipsoid({ at: at(fo, [ex, s * ey, ez + .011]), radius: [.035, .03, .005], rings: 3, seg: 10, U: [0, 0, 1] });
    // the antenna: a feathered stalk bending out to its ember lantern
    const ab = 'ant' + tag, atb = 'antTip' + tag, a0 = [bw[BI[ab] * 3], bw[BI[ab] * 3 + 1], bw[BI[ab] * 3 + 2]], a1 = [bw[BI[atb] * 3], bw[BI[atb] * 3 + 1], bw[BI[atb] * 3 + 2]];
    B.color(C.body).loft({ seg: 4, minSeg: 3, sections: [[a0, .009, [ab, ab, 0]], [[(a0[0] + a1[0]) / 2, (a0[1] + a1[1]) / 2, (a0[2] + a1[2]) / 2 + .02], .007, [ab, atb, .5]], [a1, .005, [atb, atb, 0]]].map(([p, r, bn]) => ({ at: p, rx: r, rz: r, bones: bn })) });
    if (!low) for (let i = 1; i < 6; i++) { const q = i / 6, p = [a0[0] + (a1[0] - a0[0]) * q, a0[1] + (a1[1] - a0[1]) * q, a0[2] + (a1[2] - a0[2]) * q + .02 * Math.sin(Math.PI * q)], bone = q < .5 ? ab : atb;
      for (const side of [-1, 1]) B.bone(bone).color(C.fur).lathe({ at: at(bone, p), F: [-.5, side * .7, .3], rings: [[0, .006], [.045 * (1 - q * .5), 0]], seg: 3, caps: false }); }
    B.bone(atb).color(C.ember, E_EYE).ellipsoid({ at: [0, 0, 0], radius: [.028, .028, .028], rings: 3, seg: 6 });
    // six thin legs folded under the thorax
    for (let i = 0; i < 3; i++) { const lb = 'leg' + i + tag, o = [bw[BI[lb] * 3], bw[BI[lb] * 3 + 1], bw[BI[lb] * 3 + 2]], kx = (1 - i) * .06;
      B.color(C.body).loft({ seg: 4, minSeg: 3, sections: [[o, .012], [[o[0] + kx, o[1] + s * .1, o[2] - .05], .009], [[o[0] + kx * 1.6, o[1] + s * .13, o[2] - .16], .005]].filter((_, j) => !low || j !== 1).map(([p, r]) => ({ at: p, rx: r, rz: r, bones: [lb, lb, 0] })) }); }
  }
  // the body: a furred thorax, a banded abdomen tapering behind, the hooded head with two great dark eyes
  const ABD = [[.02, H + .005, .1, .1, 'body'], [-.1, H, .11, .1, 'abd0'], [-.2, H - .01, .1, .09, 'abd0', 'abd1', .5], [-.3, H - .02, .088, .08, 'abd1'], [-.42, H - .035, .07, .065, 'abd1', 'abd2', .5],
    [-.52, H - .05, .05, .046, 'abd2'], [-.6, H - .06, .025, .024, 'abd2'], [-.635, H - .065, 0, 0, 'abd2']];
  B.color(C.body).loft({ seg: low ? 7 : 12, sections: ABD.map(([f, u, rx, rz, a, b, w]) => ({ at: [f, 0, u], rx: rx * 1.35, rz: rz * 1.35, bones: [a, b ?? a, w || 0] })), tone: (i, k, st) => (i % 2 ? lerpHex(C.body, C.ash, .5 + .3 * st) : lerpHex(C.wingDark, C.body, .5 + .5 * st)), caps: false });
  B.bone('body').color(C.fur).ellipsoid({ at: [0, 0, .01], radius: [.19, .16, .16], rings: low ? 4 : 6, seg: low ? 8 : 12 });
  if (!low) for (let i = 0; i < (full ? 16 : 10); i++) { const a = (i / (full ? 16 : 10)) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    B.bone('body').color(i % 2 ? C.ash : C.fur).lathe({ at: [.08, .13 * sa, .1 * ca + .02], F: [-.8, sa * .5, ca * .4], rings: [[0, .03], [.035, .012], [.05, 0]], seg: 4, caps: false }); } // the ruff of fur round the collar, swept back
  B.bone('head').color(C.body).ellipsoid({ at: [.04, 0, 0], radius: [.1, .095, .088], rings: low ? 3 : 5, seg: low ? 7 : 10 });
  B.bone('head').color(C.fur).ellipsoid({ at: [.01, 0, .045], radius: [.09, .1, .05], rings: 3, seg: low ? 7 : 10 }); // the hood
  for (const s of [-1, 1]) B.bone('head').color(C.wingEdge).ellipsoid({ at: [.08, s * .065, .005], radius: [.05, .04, .05], rings: 3, seg: 7 });
  // the cocoon (drawn only while it hides in it): grey ash with ember cracks
  B.mark();
  B.bone('cocoon').color(C.ashPale).ellipsoid({ at: [0, 0, 0], radius: [.34, .32, .5], rings: low ? 5 : 8, seg: low ? 8 : 12 });
  for (let i = 0; i < (low ? 3 : 6); i++) { const a = i * 2.1, z = -.36 + i * .14, r = .33 * Math.sqrt(Math.max(.05, 1 - (z / .5) ** 2));
    B.bone('cocoon').color(C.fire, E_CRACK).ellipsoid({ at: [r * Math.cos(a) * 1.01, r * Math.sin(a) * 1.01, z], radius: [.012, .14, .012], rings: 2, seg: 4, F: [Math.cos(a), Math.sin(a), 0], U: [-Math.sin(a), Math.cos(a), .4] }); }
  // kindled: flame along each fore-wing's leading edge (channel 4, shown only while it burns)
  for (const s of [-1, 1]) { const tag = s < 0 ? 'L' : 'R';
    for (let i = 0; i < (low ? 3 : 6); i++) { const q = i / ((low ? 3 : 6) - 1), E = FORE[1 + Math.round(q * 3)], bone = q > .4 ? 'foreOut' + tag : 'fore' + tag, sh = [bw[BI['fore' + tag] * 3], bw[BI['fore' + tag] * 3 + 1]];
      B.bone(bone).color(C.fire, E_FLAME).lathe({ at: at(bone, [sh[0] + E[0], sh[1] + s * E[1], bw[BI['fore' + tag] * 3 + 2] + .03]), F: [0, 0, 1], rings: [[0, .03], [.04, .02], [.08, 0]], seg: 4, caps: false }); } }
  return B.done();
}
const MESHES = { full: null, balanced: null, low: null };
export function mothMesh(tier = 'full') { return MESHES[tier] ||= buildMothMesh(tier); }

// ------------------------------------------------------------------------------------------------ the track
export function createMothTrack() {
  return {
    pose: createPose(MOTH_SKELETON), yaw: NaN, at: NaN, key: '', blendAt: -Infinity, from: new Float64Array(4), shown: new Float64Array(4),
    hp: NaN, hitAt: -Infinity, hitSide: 1, deathAt: null, x: 0, y: 0, z: 0, air: 0, phase: 0, cocoon: 0, spin: 0, px: NaN, py: NaN,
    frame: { kind: 'ashenMoth', tier: 'full', mesh: null, skin: null, boneCount: MOTH_SKELETON.count, alpha: 1, hit: 0, emitK: new Float32Array(4), emitA: new Float32Array(4),
      x: 0, y: 0, z: 0, yaw: 0, scale: 1, shadow: 1, air: 0, feet: new Float64Array(4), phase: '', contact: 0, cloud: false },
  };
}
const V = new Float64Array(4);
// ------------------------------------------------------------------------------------------------ the pose
export function sampleMoth(tr, e, env) {
  const now = env.now, reduce = !!env.reduce, S = Math.max(.25, Math.min(5, Number(env.scale) || 1)), P = tr.pose, G = MOTH_RIG;
  const gapMs = Number.isFinite(tr.at) ? now - tr.at : Infinity, dt = Number.isFinite(gapMs) ? Math.min(.1, Math.max(0, gapMs / 1000)) : 0; tr.at = now;
  const dead = !!env.dead;
  if (dead && tr.deathAt == null) tr.deathAt = now;
  if (!dead) { tr.deathAt = null; tr.x = env.x; tr.y = env.y; tr.z = env.z; }
  const death = tr.deathAt == null ? 0 : (now - tr.deathAt) / G.deathMs;
  if (death >= 1) return null;
  const x = tr.x, y = tr.y, t = reduce ? 0 : now / 1000, pose = dead ? 'fold' : e.mothPose;
  V.set(G.poses[pose] || G.poses.idle);
  const stun = dead ? 0 : clamp01(Number(e.poiseBreak) || 0); if (stun > 0) { const dz = G.poses.dazed; for (let k = 0; k < 4; k++) V[k] += (dz[k] - V[k]) * stun; }
  // blend between poses (a fold or a dive closes the wings over a moment, as the standard view eases its spread)
  const key = dead ? 'death' : pose || 'idle';
  if (tr.key === '' || !(gapMs <= G.blendMs * 4)) { tr.shown.set(V); tr.from.set(V); tr.key = key; tr.blendAt = -Infinity; }
  else if (key !== tr.key) { tr.from.set(tr.shown); tr.blendAt = now; tr.key = key; }
  const blend = tr.blendAt === -Infinity ? 1 : smooth((now - tr.blendAt) / G.blendMs);
  for (let k = 0; k < 4; k++) tr.shown[k] = tr.from[k] + (V[k] - tr.from[k]) * blend;
  const [spread0, rate, pitch0, lift0] = tr.shown;
  const cocoonWant = !dead && e.mothCocoon ? 1 : 0; tr.cocoon += (cocoonWant - tr.cocoon) * Math.min(1, dt * 8); if (!(dt > 0)) tr.cocoon = cocoonWant;
  const spread = spread0 * (1 - tr.cocoon);
  // the beat: the flap phase runs at the pose's rate (Reduced Motion holds the wings still at a third of a beat, as the standard view)
  tr.phase += dt * G.flap * rate; const flap = reduce ? .3 : Math.sin(tr.phase) * Math.min(1, rate);
  // facing: where it flies, else at the Wayfarer; the spin turns it round and round
  const mx = Number.isFinite(tr.px) ? env.x - tr.px : 0, my = Number.isFinite(tr.py) ? env.y - tr.py : 0; tr.px = env.x; tr.py = env.y;
  let want = tr.yaw;
  if (Math.hypot(mx, my) > .006 * Math.max(1, dt * 60) && Math.hypot(mx, my) < 1.5) want = Math.atan2(my, mx);
  else if (env.target && !dead) { const tx = env.target.x - e.x, ty = env.target.y - e.y; if (Math.hypot(tx, ty) > .3) want = Math.atan2(ty, tx); }
  if (!Number.isFinite(want)) want = e.facingX < 0 ? Math.PI : 0;
  if (!Number.isFinite(tr.yaw)) tr.yaw = want;
  if (!dead) { const delta = Math.atan2(Math.sin(want - tr.yaw), Math.cos(want - tr.yaw)); tr.yaw += Math.max(-1, Math.min(1, dt * (e.pack?.attack ? G.attackTurnRate : G.turnRate))) * delta; }
  if (pose === 'spin' && !reduce && !dead) tr.spin += dt * 9; else tr.spin = 0;
  const yaw = tr.yaw + tr.spin, cf = Math.cos(yaw), sf = Math.sin(yaw);
  // hit: a flinch away from the blow
  if (!dead && Number.isFinite(tr.hp) && e.hp < tr.hp) { tr.hitAt = now; const px = env.target?.x ?? e.x, py = env.target?.y ?? e.y; tr.hitSide = Math.sign((px - e.x) * -sf + (py - e.y) * cf) || 1; }
  tr.hp = e.hp; const hitT = (now - tr.hitAt) / 1000, hit = hitT < G.hitMs / 1000 ? kick(hitT, 18, 10) : 0;
  // height: the hover, the bob and mothAir; in death it drops to the ground
  const airWant = Math.max(0, Number(e.mothAir) || 0); tr.air += (airWant - tr.air) * Math.min(1, dt * 6); if (!(dt > 0)) tr.air = airWant;
  const bob = reduce ? 0 : Math.sin(t * 2.1) * G.bob - flap * .02, fall = dead ? smooth(death / .5) : 0;
  const lift = (tr.air * G.airLift + bob) * (1 - fall) - fall * (G.hover - .08);
  resetPose(P);
  setEuler(P, BI.root, yaw, 0, 0); P.scl[BI.root] = S; resolveBone(P, BI.root, x, y, env.z);
  const shake = pose === 'shake' && !reduce ? .08 * Math.sin(t * 40) : 0, roll = (pose === 'spin' && !reduce ? .25 * Math.sin(t * 9) : 0) + .25 * hit * tr.hitSide + shake;
  P.off[BI.body * 3 + 2] = lift; setEuler(P, BI.body, 0, -(pitch0 + (dead ? -.2 : 0)) - .04 * flap, roll); P.scl[BI.body] = Math.max(.001, 1 - tr.cocoon); resolveBone(P, BI.body);
  setEuler(P, BI.abd0, 0, .12 + .05 * flap + .1 * spread0 * 0, 0); resolveBone(P, BI.abd0);
  setEuler(P, BI.abd1, reduce ? 0 : .05 * wobble(t * .8, 1), .08, 0); resolveBone(P, BI.abd1);
  setEuler(P, BI.abd2, reduce ? 0 : .06 * wobble(t * .8, 2), .08, 0); resolveBone(P, BI.abd2);
  setEuler(P, BI.head, 0, .15 * pitch0, 0); resolveBone(P, BI.head);
  // wings: the spread sweeps them out from folded back over the abdomen like a tent; the beat raises and lowers them, the fore-wing's
  // outer half trailing the beat
  const fold = 1 - clamp01(spread), sweep = fold * 1.45, tent = -fold * .5, up = lift0 * .5 * (1 - fold);
  for (const [tag, s] of [['L', -1], ['R', 1]]) {
    setEuler(P, BI['fore' + tag], s * sweep, 0, s * (flap * .6 * (1 - fold) + up + tent)); resolveBone(P, BI['fore' + tag]);
    setEuler(P, BI['foreOut' + tag], s * .05 * fold, 0, s * (-.25 * flap * (1 - fold) + .05)); resolveBone(P, BI['foreOut' + tag]);
    setEuler(P, BI['hind' + tag], s * sweep * .7, 0, s * (flap * .45 * (1 - fold) + up * .7 + tent * .8 - .05)); resolveBone(P, BI['hind' + tag]);
    setEuler(P, BI['ant' + tag], s * .1 * (reduce ? 0 : wobble(t * 1.1, s)), -.1 * pitch0, 0); resolveBone(P, BI['ant' + tag]); resolveBone(P, BI['antTip' + tag]);
    for (let i = 0; i < 3; i++) { setEuler(P, BI['leg' + i + tag], 0, (reduce ? 0 : .08 * Math.sin(t * 3 + i)) + .2 * tr.air, 0); resolveBone(P, BI['leg' + i + tag]); }
  }
  // the cocoon swells into place while it hides; it trembles before it bursts
  const cc = tr.cocoon; setEuler(P, BI.cocoon, 0, 0, reduce ? 0 : .04 * Math.sin(t * 6) * cc); P.off[BI.cocoon * 3 + 2] = lift * .3; P.scl[BI.cocoon] = Math.max(.001, smooth(cc)); resolveBone(P, BI.cocoon);
  writeSkin(P);
  const F = tr.frame, life = dead ? Math.max(0, 1 - death * 1.5) : 1, kindled = !dead && e.mothKindled > 0;
  const pulse = reduce ? 1 : .8 + .2 * Math.sin(now / 240);
  F.emitK[0] = life * pulse * (kindled ? 2 : 1.3); // the eye-spots and lanterns
  F.emitK[1] = life * (kindled ? 2.2 : .8); // the veins
  F.emitK[2] = 1.2 * (reduce ? .9 : .6 + .4 * Math.sin(now / 120)); // the cocoon's cracks
  F.emitK[3] = reduce ? 1.6 : 1.4 + .4 * Math.sin(t * 13);
  F.emitA[0] = 1; F.emitA[1] = 1; F.emitA[2] = cc > .02 ? 1 : 0; F.emitA[3] = kindled ? .85 : 0;
  F.tier = env.tier || 'full'; F.mesh = mothMesh(F.tier); F.skin = P.skin; F.alpha = dead ? 1 - span(death, .5, 1) : 1;
  F.hit = Math.max(0, Math.min(1, Number(e.hitFlash) || 0)) * .8 + Math.max(0, hit) * .4;
  F.x = x; F.y = y; F.z = env.z; F.yaw = yaw; F.scale = S; F.air = Math.max(0, G.hover + lift); F.shadow = 1; F.phase = e.pack?.attack ? `${e.pack.attack}:${e.pack.phase}:${pose || ''}` : dead ? 'death' : 'move';
  F.contact = 0; F.cloud = F.emitA[2] > 0 || F.emitA[3] > 0;
  return F;
}
export const mothBone = (tr, name) => { const i = BI[name]; return [tr.pose.wp[i * 3], tr.pose.wp[i * 3 + 1], tr.pose.wp[i * 3 + 2]]; };
