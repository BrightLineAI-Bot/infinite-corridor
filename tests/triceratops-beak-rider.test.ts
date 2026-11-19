// Tim, 2026-11-19 (after release 1025): "the tip of the beak is kind of hanging off; it's not connected" and "the frill shouldn't
// impact the rider's body ... the rider should be positioned behind the frill". Presentation only: these check the beak joins the
// shortened snout in both views for every form, and that the rider clears the frill through the ridden moves in both views.
import test from "node:test";
import assert from "node:assert/strict";
import { MOUNT_BEASTS } from "../src/beast-mounts.ts";
import { drawMount, MOUNT_DRAW } from "../src/beast-mounts-render.ts";
import { TRI_ART, TRI_BEAK } from "../src/triceratops-render.ts";
import { triceratopsMesh, createTriceratopsTrack, sampleTriceratops, TRICERATOPS_SKELETON, TRICERATOPS_SEAT, TRICERATOPS_RIG, TRICERATOPS_BEAK } from "../src/close-view-beast-triceratops.ts";

const FORMS: [string, any][] = [["baby", { triForm: "baby" }], ["young", { triForm: "young" }], ["wild", null], ["ridden", { mountView: true, triceratopsDisposition: "good" }], ["silly", { mountView: true, triceratopsDisposition: "silly" }]];
const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
const BEAK_RGB = [hex(TRI_ART.beak), hex(TRI_ART.beakLight)];
const HORN = { hold: { phase: "hold", pitch: .16, reach: -.035, lower: .06, x: 1, y: 0 }, windup: { phase: "windup", pitch: .25, reach: -.08, lower: .06, x: 1, y: 0 }, bash: { phase: "bash", pitch: .1, reach: .16, lower: .025, x: 1, y: 0 }, horn: { phase: "horn", pitch: -.12, reach: -.1, lower: .025, x: 1, y: 0 }, dash: { phase: "dash", pitch: .12, reach: .08, lower: .035, x: 1, y: 0 } } as any;
const MOVES = ["rest", "hold", "windup", "bash", "horn", "dash", "leap", "fall", "land"];
const airAt = (move: string, i: number, n: number) => { const t = i / (n - 1); return move === "leap" ? 1.2 * t : move === "fall" ? 1.2 * (1 - t) : move === "land" ? (i < 10 ? 1 - i / 10 : 0) : 0; };

// The upper beak's triangles (the head bone's, beak-coloured) and the lower beak's tip (the jaw's foremost vertex), in bind space.
function beakParts(tier: string, e: any) {
  const m: any = triceratopsMesh(tier, e), P = m.positions, C = m.colors, SK = m.skin, I = m.indices, head = TRICERATOPS_SKELETON.index.head, jaw = TRICERATOPS_SKELETON.index.jaw;
  const isBeak = (v: number) => (SK[v * 4] | 0) === head && BEAK_RGB.some((c) => Math.abs(C[v * 3] - c[0]) < .01 && Math.abs(C[v * 3 + 1] - c[1]) < .01 && Math.abs(C[v * 3 + 2] - c[2]) < .01);
  const tris: number[] = [], skull: number[] = [], H = (v: number) => (SK[v * 4] | 0) === head;
  for (let t = 0; t < m.coreIndices; t += 3) { if (isBeak(I[t]) && isBeak(I[t + 1]) && isBeak(I[t + 2])) tris.push(I[t], I[t + 1], I[t + 2]); if (H(I[t]) && H(I[t + 1]) && H(I[t + 2])) skull.push(I[t], I[t + 1], I[t + 2]); }
  const beakRGB = (v: number) => BEAK_RGB.some((c) => Math.abs(C[v * 3] - c[0]) < .01 && Math.abs(C[v * 3 + 1] - c[1]) < .01 && Math.abs(C[v * 3 + 2] - c[2]) < .01);
  let tip = -1; for (let v = 0; v < m.vertexCount; v++) if ((SK[v * 4] | 0) === jaw && beakRGB(v) && (tip < 0 || P[v * 3] > P[tip * 3])) tip = v; // (not the Silly Goose's tongue)
  return { P, tris, skull, tip: [P[tip * 3], P[tip * 3 + 1] + 7e-4, P[tip * 3 + 2]] }; // (just off the middle line: a ray along a seam counts twice)
}
// Connected pieces among the triangles (shared positions join them).
function pieces(P: Float32Array, tris: number[]) {
  const key = (v: number) => `${P[v * 3].toFixed(5)},${P[v * 3 + 1].toFixed(5)},${P[v * 3 + 2].toFixed(5)}`, parent = new Map<string, string>();
  const find = (k: string): string => { let r = k; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(k, r); return r; };
  for (const v of tris) { const k = key(v); if (!parent.has(k)) parent.set(k, k); }
  for (let t = 0; t < tris.length; t += 3) { const a = find(key(tris[t])); for (const v of [tris[t + 1], tris[t + 2]]) { const b = find(key(v)); if (a !== b) parent.set(b, a); } }
  return new Set([...parent.keys()].map(find)).size;
}
// Whether the lower beak's tip is held in the upper beak: the beak's skin straight under it (the hook wraps round in front of and
// below it) and the head's skin straight over it.
function rayHits(P: Float32Array, tris: number[], p: number[], up: boolean) {
  let n = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]].map((v) => [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]);
    const d = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]); if (Math.abs(d) < 1e-12) continue;
    const u = ((p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1])) / d, w = ((b[0] - a[0]) * (p[1] - a[1]) - (p[0] - a[0]) * (b[1] - a[1])) / d;
    if (u < 0 || w < 0 || u + w > 1) continue;
    if ((a[2] + u * (b[2] - a[2]) + w * (c[2] - a[2]) > p[2]) === up) n++;
  }
  return n;
}
const held = (P: Float32Array, beak: number[], skull: number[], p: number[]) => rayHits(P, beak, p, false) > 0 && rayHits(P, skull, p, true) > 0;

test("Close View: the beak's hook is one skin with the upper beak, and the lower beak's tip tucks inside it, every form and tier", () => {
  const up = TRICERATOPS_BEAK.upper; assert.deepEqual(up[up.length - 1].slice(2), [0, 0], "the upper beak closes to the hook's point");
  for (let i = 1; i < up.length; i++) assert.ok(up[i][0] - up[i - 1][0] > -1e-9, "it curls down without turning back on itself (no twisted skin)");
  for (const tier of ["full", "balanced", "low"]) for (const [name, e] of FORMS) {
    const { P, tris, skull, tip } = beakParts(tier, e);
    assert.ok(tris.length > 0);
    assert.equal(pieces(P, tris), 1, `${name}/${tier}: no separate hook piece`);
    assert.ok(held(P, tris, skull, tip), `${name}/${tier}: the lower beak's tip is held inside the upper beak and its hook (no gap)`);
  }
});

// The standard view's beak, in head units before the muzzle (the same map applies to all of it, so a join here is a join drawn).
function pathPoints(cmds: readonly (readonly number[])[]) {
  const out: number[][] = []; let px = 0, py = 0;
  for (const c of cmds) { if (c.length === 2) { out.push([c[0], c[1]]); px = c[0]; py = c[1]; continue; }
    for (let k = 1; k <= 12; k++) { const t = k / 12, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t; out.push([a * px + b * c[0] + d * c[2], a * py + b * c[1] + d * c[3]]); } px = c[2]; py = c[3]; }
  return out;
}
function inPoly(poly: number[][], [x, y]: number[]) { let n = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) n = !n; } return n; }
function edgeDist(poly: number[][], [x, y]: number[]) { let d = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1))); d = Math.min(d, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return d; }
export function standardBeakGap() { // signed: the lower beak's front point against the upper beak's outline (< 0: inside it)
  const upper = pathPoints(TRI_BEAK.upper), p = TRI_BEAK.lower.reduce((a, b) => b[0] > a[0] ? b : a) as number[];
  return (inPoly(upper, p) ? -1 : 1) * edgeDist(upper, p);
}

test("standard view: the lower beak meets the hook with no gap, and the upper beak is joined to the skull", () => {
  const upper = pathPoints(TRI_BEAK.upper), skull = TRI_BEAK.skull.map((p) => [...p]);
  assert.ok(standardBeakGap() < 0, `the lower beak's point is inside the hook (${standardBeakGap()})`);
  // the lower beak's top edge runs under the upper beak or the skull all the way to its point: nothing shows between them
  const [a, b] = [TRI_BEAK.lower[0], TRI_BEAK.lower[1]];
  for (let k = 0; k <= 20; k++) { const p = [a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20 + .002]; assert.ok(inPoly(upper, p) || inPoly(skull, p), `top edge at ${p} is covered`); }
  // the upper beak's back overlaps the skull's front
  assert.ok(upper.some((p) => inPoly(skull, p)));
});

// A 2D context that tracks its transform and keeps the frill's ellipse (the one 0.28 x 0.36 shield) as drawn, in pixels.
function frillCtx(hit: (pts: number[][]) => void) {
  let m = [1, 0, 0, 1, 0, 0]; const stack: number[][] = [];
  const mul = (a: number, b: number, c: number, d: number, e: number, f: number) => { const [A, B, C, D, E, F] = m; m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F]; };
  const fns: any = {
    save: () => stack.push(m.slice()), restore: () => { m = stack.pop() || [1, 0, 0, 1, 0, 0]; },
    translate: (x: number, y: number) => mul(1, 0, 0, 1, x, y), scale: (x: number, y: number) => mul(x, 0, 0, y, 0, 0),
    rotate: (a: number) => mul(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0), setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => { m = [a, b, c, d, e, f]; },
    ellipse: (x: number, y: number, rx: number, ry: number) => { if (x === 0 && y === 0 && Math.abs(ry / rx - .36 / .28) < 1e-9) { const pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, X = Math.cos(a) * (rx + .03), Y = Math.sin(a) * (ry + .03); pts.push([m[0] * X + m[2] * Y + m[4], m[1] * X + m[3] * Y + m[5]]); } hit(pts); } },
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }),
  };
  return new Proxy(fns, { get: (o, k) => k in o ? o[k] : k === "drawImage" ? undefined : () => {}, set: () => true });
}
const RIDER = Object.freeze({ half: .25, up: 1, down: .25, radius: .22 }); // the seated Wayfarer: a box (standard view) or capsule (Close View) round the seat, tiles

export function standardRiderClearance() {
  const s = 40; let worst = Infinity;
  for (const reduce of [false, true]) for (const variant of ["normal", "silly"]) for (const face of ["right", "left"]) for (const move of [...MOVES, ...(variant === "silly" ? ["drill"] : [])]) {
    const p: any = { x: 5, y: 5, facing: face, walkPhase: 0 }, m = { id: `beak-rider-${reduce}-${variant}-${face}-${move}`, beast: "triceratops", variant };
    for (let i = 0; i < 40; i++) {
      const air = airAt(move, i, 40); let pts: number[][] = [];
      const seat = drawMount(frillCtx((q) => { pts = q; }), m, p, s, 1000 + i * 16, air * s, reduce, HORN[move] || null, face, move === "drill" ? { x: face === "right" ? -1 : 1, y: 0 } : null);
      if (i < 12) continue;
      assert.ok(pts.length, "the frill was drawn");
      const cx = (p.x + .5) * s + seat.dx, sy = (p.y + .8) * s - air * s - seat.up, x0 = cx - RIDER.half * s, x1 = cx + RIDER.half * s, y0 = sy - RIDER.up * s, y1 = sy + RIDER.down * s;
      for (const [x, y] of pts) { const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1); worst = Math.min(worst, (dx || dy ? Math.hypot(dx, dy) : -Math.min(x - x0, x1 - x, y - y0, y1 - y)) / s); }
    }
  }
  return worst;
}
export function closeViewRiderClearance() {
  const B = MOUNT_BEASTS.triceratops, FR = TRICERATOPS_SKELETON.index.frill; let worst = Infinity;
  for (const reduce of [false, true]) for (const variant of ["good", "silly"]) for (const move of [...MOVES, ...(variant === "silly" ? ["drill"] : [])]) for (const yaw of [0, 2.2]) {
    const tr = createTriceratopsTrack(), e: any = { id: "m", kind: "triceratops", mountView: true, triceratopsDisposition: variant, hp: 1, maxHp: 1, pack: null, facingX: 1, mountDrill: move === "drill" };
    for (let i = 0; i < 40; i++) {
      const air = airAt(move, i, 40), env: any = { x: 5, y: 5, z: 0, scale: B.scale, now: 1000 + i * 16, reduce, tier: "full", target: null, dead: false, yaw, air, horn: HORN[move] || null, drill: move === "drill" ? { angle: i * .5, pivot: 1.05 } : null };
      const f: any = sampleTriceratops(tr, e, env); if (i < 12) continue;
      const m = f.mesh, P = m.positions, SK = m.skin, K = f.skin, z0 = env.z + B.seat + air; // the card's rider stands at the Wayfarer, on the seat
      for (let v = 0; v < m.vertexCount; v++) { if ((SK[v * 4] | 0) !== FR) continue; const o = FR * 12, q = [0, 1, 2].map((r) => K[o + r * 4] * P[v * 3] + K[o + r * 4 + 1] * P[v * 3 + 1] + K[o + r * 4 + 2] * P[v * 3 + 2] + K[o + r * 4 + 3]);
        const cz = Math.max(z0 - RIDER.down, Math.min(z0 + RIDER.up, q[2])); worst = Math.min(worst, Math.hypot(q[0] - env.x, q[1] - env.y, q[2] - cz) - RIDER.radius); }
    }
  }
  return worst;
}

test("standard view: the rider sits behind the frill, clear of it through every ridden move, both ways and both tacks", () => {
  assert.ok(MOUNT_BEASTS.triceratops.seatX < 0);
  const c = standardRiderClearance(); assert.ok(c > 0, `frill to rider ${c}`);
});

test("Close View: the rider's card stands on the saddle, and the ridden frill stays clear of the rider through every move", () => {
  // the card's rider is at the Wayfarer (no sideways shift on the card), the skinned saddle under them at the seat's height
  MOUNT_DRAW.skipBody = true;
  try { const seat = drawMount(frillCtx(() => {}), { id: "cv", beast: "triceratops", variant: "normal" }, { x: 5, y: 5, facing: "right", walkPhase: 0 }, 40, 1000); assert.equal(seat.dx, 0); }
  finally { MOUNT_DRAW.skipBody = false; }
  assert.ok(Math.abs(TRICERATOPS_SEAT * MOUNT_BEASTS.triceratops.scale - MOUNT_BEASTS.triceratops.seat) < .1);
  assert.ok(TRICERATOPS_RIG.riddenFrill.tilt > 0);
  const c = closeViewRiderClearance(); assert.ok(c > 0, `frill to rider ${c}`);
  // a wild herd's frill is as it was bound (the ridden setting is the mount's only)
  const tr = createTriceratopsTrack(); sampleTriceratops(tr, { id: "w", kind: "triceratops", hp: 1, maxHp: 1, pack: null, facingX: 1 } as any, { x: 5, y: 5, z: 0, scale: 1.8, now: 1000, reduce: true, tier: "full", target: null, dead: false } as any);
  const i = TRICERATOPS_SKELETON.index.frill; assert.deepEqual([tr.pose.off[i * 3], tr.pose.off[i * 3 + 1], tr.pose.off[i * 3 + 2]], [0, 0, 0]);
});
