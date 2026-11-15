// The dino duel in Close View (Tim, 2026-11-14: "two dinosaurs fighting in a crazy battle ... not clipping in and out of each other
// in a random way"). After the Spinosaurus's and the Wild Stegosaurus's bodies are sampled each frame (close-view.ts admitBeasts),
// stageDuel places them against each other, drawing only (the game's positions are never touched):
//
// - Capsules (DUEL_CAPSULES): each rig's body as a few dozen bone-to-bone capsules in groups (trunk, neck, head, tail, legs, arms),
//   radii in model units (times the body's scale). duelOverlap measures how deep one body's capsules go into the other's.
// - Spacing (spaceDuellists): two duellists not holding each other are pushed apart along the line between them until the `space`
//   bodies no longer overlap (plus `margin`), half each, never more than `maxSep` tiles from where the game stands them. The push
//   eases back at `ease`, never below what is needed. The part a move strikes with (DUEL_STRIKES) is left out while it strikes.
// - Holding (holdInJaws): a beast held in the other's jaws is drawn in them: the Spinosaurus by its tail in the stego's beak (the
//   tail heave), the stego by its belly in the Spinosaurus's jaws (the belly lift). Never below its own ground (`ground`).
// Bounded: two bodies, at most 40 capsules each, a few passes; no allocation per frame.
import { boneLocalToWorld } from "./close-view-beast-rig.js?v=r979-25bd8edd3b39";
import { spinoJawPoint, spinoHoldPoint } from "./close-view-beast-spino.js?v=r979-25bd8edd3b39";
import { stegoJawPoint, stegoHoldPoint } from "./close-view-beast-stego.js?v=r979-25bd8edd3b39";

export const DUEL_STAGE = Object.freeze({ margin: .1, maxSep: 3.5, ease: 5, passes: 10, ground: .02, holdIn: .12, holdOver: 1.2 }); // holdIn: s a seized (or let go) body takes to come to (or leave) the jaws, lifted up to `holdOver` tiles on the way
// The parts a move strikes with (left out of the spacing while that move is on, so the blow reaches the other body).
export const DUEL_STRIKES = Object.freeze({
  spinoBite: ['head', 'neck'], spinoGrab: ['head', 'neck'], spinoBodySlam: ['head', 'neck'], spinoLeapSlam: ['head', 'neck'], spinoRoar: ['head'], spinoClaw: ['arms', 'head'], spinoTailSwipe: ['tail'], spinoRibSpears: ['arms'],
  stegoBite: ['head', 'neck'], stegoJaws: ['head', 'neck'], stegoClaw: ['legs', 'head'], stegoRearSwipe: ['legs', 'head', 'neck'], stegoTailWhack: ['tail'], stegoTailSlam: ['tail'], stegoBuck: ['tail', 'legs'], stegoPounce: ['legs', 'head'], stegoTreeClub: ['head', 'neck'],
});
const SPACE_A = new Uint8Array(40), SPACE_B = new Uint8Array(40);
function spaceMask(kind, e, out) { const strike = DUEL_STRIKES[e?.pack?.attack] || null, C = DUEL_CAPSULES[kind]; for (let i = 0; i < C.length; i++) out[i] = strike && strike.includes(C[i][3]) ? 0 : 1; }
// [bone, to (a bone, or a point [f, r, u] in the first bone's frame), radius (model units), group]
export const DUEL_CAPSULES = Object.freeze({
  spinoRex: Object.freeze([
    ['pelvis', 'spine', .2, 'trunk'], ['spine', 'chest', .2, 'trunk'], ['chest', 'neck0', .15, 'trunk'],
    ['neck0', 'neck1', .09, 'neck'], ['neck1', 'head', .08, 'neck'], ['head', [.42, 0, -.04], .065, 'head'],
    ['pelvis', 'tail0', .17, 'tail'], ['tail0', 'tail1', .13, 'tail'], ['tail1', 'tail2', .1, 'tail'], ['tail2', 'tail3', .08, 'tail'], ['tail3', 'tail4', .06, 'tail'], ['tail4', 'tail5', .045, 'tail'], ['tail5', [-.18, 0, 0], .03, 'tail'],
    ['thighL', 'shinL', .1, 'legs'], ['shinL', 'metaL', .06, 'legs'], ['metaL', 'footL', .045, 'legs'],
    ['thighR', 'shinR', .1, 'legs'], ['shinR', 'metaR', .06, 'legs'], ['metaR', 'footR', .045, 'legs'],
    ['armL', 'foreL', .04, 'arms'], ['foreL', 'handL', .035, 'arms'], ['armR', 'foreR', .04, 'arms'], ['foreR', 'handR', .035, 'arms'],
  ]),
  wildStego: Object.freeze([
    ['pelvis', 'spine', .25, 'trunk'], ['spine', 'chest', .23, 'trunk'], ['chest', 'neck1', .14, 'trunk'],
    ['neck1', 'neck2', .085, 'neck'], ['neck2', 'head', .07, 'neck'], ['head', [.2, 0, -.03], .055, 'head'],
    ['pelvis', 'tail1', .19, 'tail'], ['tail1', 'tail2', .15, 'tail'], ['tail2', 'tail3', .11, 'tail'], ['tail3', 'tail4', .08, 'tail'], ['tail4', 'tail5', .06, 'tail'], ['tail5', [-.17, 0, 0], .035, 'tail'],
    ['thighL', 'shinL', .12, 'legs'], ['shinL', 'hockL', .085, 'legs'], ['hockL', 'footHL', .07, 'legs'],
    ['thighR', 'shinR', .12, 'legs'], ['shinR', 'hockR', .085, 'legs'], ['hockR', 'footHR', .07, 'legs'],
    ['armL', 'foreL', .09, 'legs'], ['foreL', 'wristL', .07, 'legs'], ['wristL', 'footFL', .06, 'legs'],
    ['armR', 'foreR', .09, 'legs'], ['foreR', 'wristR', .07, 'legs'], ['wristR', 'footFR', .06, 'legs'],
  ]),
});
const CAP_A = new Float64Array(40 * 7), CAP_B = new Float64Array(40 * 7), PA = [0, 0, 0], PB = [0, 0, 0];
// This frame's capsules of a track (kind's table) into `out` (7 numbers each: a, b, radius in world units); returns the count.
export function duelCapsules(tr, kind, out) {
  const C = DUEL_CAPSULES[kind], P = tr?.pose; if (!C || !P) return 0;
  const S = Number(tr.frame?.scale) || 1, I = P.skeleton.index;
  for (let i = 0; i < C.length; i++) {
    const [a, b, r] = C[i], ia = I[a] * 3, o = i * 7; out[o] = P.wp[ia]; out[o + 1] = P.wp[ia + 1]; out[o + 2] = P.wp[ia + 2];
    if (typeof b === 'string') { const ib = I[b] * 3; out[o + 3] = P.wp[ib]; out[o + 4] = P.wp[ib + 1]; out[o + 5] = P.wp[ib + 2]; }
    else { boneLocalToWorld(P, a, b[0], b[1], b[2], PA); out[o + 3] = PA[0]; out[o + 4] = PA[1]; out[o + 5] = PA[2]; }
    out[o + 6] = r * S;
  }
  return C.length;
}
// The closest distance between segments p0-p1 and q0-q1 (offset by oq), its closest points into PA and PB.
function segDist(A, i, B, j, ox, oy) {
  const px = A[i], py = A[i + 1], pz = A[i + 2], ux = A[i + 3] - px, uy = A[i + 4] - py, uz = A[i + 5] - pz;
  const qx = B[j] + ox, qy = B[j + 1] + oy, qz = B[j + 2], vx = B[j + 3] + ox - qx, vy = B[j + 4] + oy - qy, vz = B[j + 5] - qz;
  const wx = px - qx, wy = py - qy, wz = pz - qz, a = ux * ux + uy * uy + uz * uz, b = ux * vx + uy * vy + uz * vz, c = vx * vx + vy * vy + vz * vz, d = ux * wx + uy * wy + uz * wz, e = vx * wx + vy * wy + vz * wz;
  const D = a * c - b * b; let s = 0, t = 0;
  if (a < 1e-9 && c < 1e-9) { s = 0; t = 0; } else if (a < 1e-9) { s = 0; t = Math.max(0, Math.min(1, e / c)); } else if (c < 1e-9) { t = 0; s = Math.max(0, Math.min(1, -d / a)); }
  else { s = D > 1e-9 ? Math.max(0, Math.min(1, (b * e - c * d) / D)) : 0; t = (b * s + e) / c; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -d / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - d) / a)); } }
  PA[0] = px + ux * s; PA[1] = py + uy * s; PA[2] = pz + uz * s; PB[0] = qx + vx * t; PB[1] = qy + vy * t; PB[2] = qz + vz * t;
  return Math.hypot(PA[0] - PB[0], PA[1] - PB[1], PA[2] - PB[2]);
}
const groupOf = (kind, i) => DUEL_CAPSULES[kind][i][3];
// How deep the two bodies go into each other (tiles; 0 when apart): the worst capsule pair, skipping the deliberate contact
// (`contact`: [groupA, groupB] pairs, "*" for any group). Returns { depth, a, b } (the groups of the worst pair).
export function duelOverlap(trA, kindA, trB, kindB, contact = null) {
  const na = duelCapsules(trA, kindA, CAP_A), nb = duelCapsules(trB, kindB, CAP_B); let depth = 0, ga = null, gb = null;
  for (let i = 0; i < na; i++) { const g1 = groupOf(kindA, i);
    for (let j = 0; j < nb; j++) { const g2 = groupOf(kindB, j);
      if (contact && contact.some(([x, y]) => (x === '*' || x === g1) && (y === '*' || y === g2))) continue;
      const pen = CAP_A[i * 7 + 6] + CAP_B[j * 7 + 6] - segDist(CAP_A, i * 7, CAP_B, j * 7, 0, 0); if (pen > depth) { depth = pen; ga = g1; gb = g2; } } }
  return { depth, a: ga, b: gb };
}
// Moves a sampled body (its skin's translations, its bone positions, its place) by (dx, dy, dz).
export function shiftBeastTrack(tr, dx, dy, dz) {
  const f = tr?.frame, s = f?.skin; if (!s) return;
  for (let b = 0; b < f.boneCount; b++) { s[b * 12 + 3] += dx; s[b * 12 + 7] += dy; s[b * 12 + 11] += dz; }
  const wp = tr.pose?.wp; if (wp) for (let b = 0; b < f.boneCount; b++) { wp[b * 3] += dx; wp[b * 3 + 1] += dy; wp[b * 3 + 2] += dz; }
  f.x += dx; f.y += dy; f.air = Math.max(0, (f.air || 0) + dz);
}
// The lowest point of a body (its capsules' undersides), world units.
export function duelLowest(tr, kind) { const n = duelCapsules(tr, kind, CAP_A); let z = Infinity; for (let i = 0; i < n; i++) { const o = i * 7; z = Math.min(z, CAP_A[o + 2] - CAP_A[o + 6], CAP_A[o + 5] - CAP_A[o + 6]); } return z; }
const JAW = [0, 0, 0], HOLD = [0, 0, 0];
// A held beast drawn in the other's jaws, and never below its own ground (frame z).
export function holdInJaws(tracks, now) {
  for (const [foe, tr] of tracks) {
    const by = foe.spinoHeldBy || foe.stegoHeldBy; if (!by || tr.seen !== now || foe.dead) continue;
    let holder = null, htr = null; for (const [q, t] of tracks) if (q.id === by && t.seen === now && !q.dead) { holder = q; htr = t; break; }
    if (!holder) continue;
    if (foe.spinoHeldBy && holder.kind === 'spinoRex' && foe.kind === 'wildStego') { spinoJawPoint(htr, JAW); stegoHoldPoint(tr, HOLD); }
    else if (foe.stegoHeldBy && holder.kind === 'wildStego' && foe.kind === 'spinoRex') { stegoJawPoint(htr, JAW); spinoHoldPoint(tr, HOLD); }
    else continue;
    let dz = JAW[2] - HOLD[2]; const floor = (Number(tr.frame.z) || 0) + DUEL_STAGE.ground, low = duelLowest(tr, foe.kind); if (low + dz < floor) dz = floor - low;
    // seized, it comes to the jaws over `holdIn` s (from where it was drawn), then stays in them
    if (tr.heldBy !== by) { tr.heldBy = by; tr.heldAt = now; tr.heldFromX = Number.isFinite(tr.drawnX) ? tr.drawnX : tr.frame.x; tr.heldFromY = Number.isFinite(tr.drawnY) ? tr.drawnY : tr.frame.y; } // where it was drawn (the world)
    const k = Math.min(1, Math.max(0, (now - tr.heldAt) / 1000 / DUEL_STAGE.holdIn)), e = k * k * (3 - 2 * k), kz = Math.min(1, k * 2.5), ez = kz * kz * (3 - 2 * kz); // up first, then in (over the holder, not through it)
    shiftBeastTrack(tr, (JAW[0] - HOLD[0]) * e + (tr.heldFromX - tr.frame.x) * (1 - e), (JAW[1] - HOLD[1]) * e + (tr.heldFromY - tr.frame.y) * (1 - e), dz * ez + Math.max(0, DUEL_STAGE.holdOver * Math.sin(Math.PI * k)));
  }
}
// Two duellists not holding each other, pushed apart along the line between them (the game's line, so the push never flips) until
// their `space` groups clear by `margin`: the least push that does, half each, at most `maxSep` tiles each. Once pushed, the push
// eases back at `ease` but never below what is needed, so they never clip on the way in or out.
function penetration(na, nb, push, ux, uy) {
  let worst = -Infinity; const D = DUEL_STAGE;
  for (let i = 0; i < na; i++) { if (!SPACE_A[i]) continue;
    for (let j = 0; j < nb; j++) { if (!SPACE_B[j]) continue;
      const pen = CAP_A[i * 7 + 6] + CAP_B[j * 7 + 6] + D.margin - segDist(CAP_A, i * 7, CAP_B, j * 7, ux * push, uy * push); if (pen > worst) worst = pen; } }
  return worst;
}
export function spaceDuellists(tracks, now) {
  let spino = null, stego = null, ts = null, tt = null;
  for (const [q, t] of tracks) { if (t.seen !== now || q.dead) continue; if (q.kind === 'spinoRex' && !spino) { spino = q; ts = t; } else if (q.kind === 'wildStego' && !stego) { stego = q; tt = t; } }
  if (!spino || !stego || spino.stegoHeldBy || stego.spinoHeldBy) { if (tt) tt.duelSep = 0; return; } // any two in sight: the push never pops as a duel ends
  const D = DUEL_STAGE, na = duelCapsules(ts, 'spinoRex', CAP_A), nb = duelCapsules(tt, 'wildStego', CAP_B); spaceMask('spinoRex', spino, SPACE_A); spaceMask('wildStego', stego, SPACE_B);
  let ux = tt.frame.x - ts.frame.x, uy = tt.frame.y - ts.frame.y; const um = Math.hypot(ux, uy); if (um < 1e-6) { ux = 1; uy = 0; } else { ux /= um; uy /= um; }
  // the least push that clears them (the whole push, applied to the stego in the measure)
  let need = 0; for (let pass = 0; pass < D.passes; pass++) { const pen = penetration(na, nb, need, ux, uy); if (pen <= 0) break; need += pen; }
  need = Math.min(need, D.maxSep * 2);
  const dt = Number.isFinite(tt.duelSepAt) ? Math.max(0, Math.min(.1, (now - tt.duelSepAt) / 1000)) : 0; tt.duelSepAt = now;
  const cur = Number(tt.duelSep) || 0, eased = dt > 0 ? cur + (need - cur) * Math.min(1, dt * D.ease) : need;
  tt.duelSep = Math.max(need, Math.min(cur, eased));
  const half = tt.duelSep / 2; shiftBeastTrack(tt, ux * half, uy * half, 0); shiftBeastTrack(ts, -ux * half, -uy * half, 0);
  tt.heldBy = ts.heldBy = null;
}
// Once a frame, after the beasts are sampled: the spacing, then the holds.
export function stageDuel(tracks, now) {
  spaceDuellists(tracks, now); holdInJaws(tracks, now);
  for (const [q, t] of tracks) {
    if (t.seen !== now || !t.frame) continue;
    // a body that changes how it is staged (let go, or now the holder, or no longer) moves there over `holdIn` s too, from where it
    // was drawn; the held body has its own (holdInJaws)
    let holds = false; for (const o of tracks.keys()) if (o !== q && (o.spinoHeldBy === q.id || o.stegoHeldBy === q.id)) holds = true;
    const held = !!(q.spinoHeldBy || q.stegoHeldBy), mode = held ? 2 : holds ? 1 : 0;
    if (!held && t.stageMode !== mode && Number.isFinite(t.drawnX)) { t.relAt = now; t.relFromX = t.drawnX; t.relFromY = t.drawnY; }
    t.stageMode = mode;
    if (!held) { t.heldBy = null;
      const k = Number.isFinite(t.relAt) ? (now - t.relAt) / 1000 / DUEL_STAGE.holdIn : 1;
      if (k < 1 && Number.isFinite(t.relFromX)) { const e = 1 - k * k * (3 - 2 * k); shiftBeastTrack(t, (t.relFromX - t.frame.x) * e, (t.relFromY - t.frame.y) * e, 0); } }
    t.drawnX = t.frame.x; t.drawnY = t.frame.y; // where each was drawn (a seizure or a release starts from there)
  }
}
