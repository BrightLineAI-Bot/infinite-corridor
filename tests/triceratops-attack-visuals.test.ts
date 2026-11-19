// The ridden Triceratops's attacks as drawn (2026-11-18 pass 2): the Horn Shot leaves the horns (origin and drawn launch), its drawing
// settles onto the gameplay path within its settle time, the drill's shadow stays at the feet, the Bash arc is raised to the horns,
// and the attack poses follow the accepted horn-pose clock. Presentation only: no damage, timing or save numbers are touched here.
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { stableMount, startRide, TRICERATOPS_ATTACKS, TRICERATOPS_HORN_SHOT, MOUNT_BEASTS, triceratopsWhirlAngle, triceratopsDrillFacing } from "../src/beast-mounts.ts";
import { drawMount, drawMountShadow, MOUNT_DRAW } from "../src/beast-mounts-render.ts";
import { projectileVisualPoint } from "../src/actor-presentation.ts";
import { render } from "../src/renderer.ts";
import { TRI_ART, TRI_KEYS, TRI_HORN_BODY, triceratopsHornOverlay, triceratopsHornAmount, drawTriceratopsBody } from "../src/triceratops-render.ts";
import { createTriceratopsTrack, sampleTriceratops, triceratopsHornTip } from "../src/close-view-beast-triceratops.ts";

const flat = () => ({ tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
function mounted(variant = "normal") {
  const save = freshSave(); save.seed = "TRI-ATTACK-VISUALS";
  const g = new Game(save, 0); g.map = flat(); g.enemies = []; g.builds = [];
  Object.assign(g.player, { x: 10, y: 10, facing: "right", hp: save.maxHp, stamina: 100, jumping: false, lastMoveVector: { x: 1, y: 0 } });
  const m = stableMount(save, "triceratops", { triceratopsDisposition: variant === "silly" ? "silly" : "good" }).mount; startRide(save, m.id);
  return g;
}
const holdInput = (action = null, held = true) => ({ state: { x: 0, y: 0 }, consume: (k) => k === action, held: (k) => held && k === "dodge" });
function hornShot(g) {
  g.update(.01, holdInput("dodge"), 1000); g.tickTriceratopsCharge(1950, false); g.tickTriceratopsCharge(2130, false);
  const shot = g.projectiles.find((p) => p.triceratopsHorn); assert.ok(shot); return shot;
}
function recorder() {
  const log: any[] = [];
  const ctx: any = new Proxy({ globalAlpha: 1, canvas: { width: 390, height: 844 }, measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}) }, {
    get: (o, k) => k in o ? o[k] : (...args: any[]) => { log.push([k, ...args]); },
    set: (o, k, v) => { if (k === "fillStyle" || k === "strokeStyle") log.push([k, v]); o[k] = v; return true; },
  });
  return { ctx, log };
}

test("the Horn Shot's gameplay origin is ahead of the body at horn height; its damage, speed and range are unchanged", () => {
  const g = mounted(), shot = hornShot(g), H = TRICERATOPS_HORN_SHOT, B = TRICERATOPS_ATTACKS.horn;
  assert.ok(Math.abs(shot.x - (g.player.x + .5 + H.forward)) < 1e-9 && Math.abs(shot.y - (g.player.y + .45)) < 1e-9, `origin ${shot.x - g.player.x - .5}`);
  assert.equal(shot.visualHeight, H.height);
  assert.deepEqual([shot.damage, shot.speed, shot.life, shot.dx, shot.dy], [B.damage, B.speed, B.range / B.speed, 1, 0]);
  assert.deepEqual(shot.visualLaunch, { v: 1, dx: H.tip - H.forward, dy: 0, dz: 0, settle: H.settle });
  // a wall between the body and the horn tips: neither the origin nor the drawn launch passes it
  const w = mounted(); w.map.tiles[10 * 32 + 12].blocked = true; const s2 = hornShot(w), wall = 12;
  assert.ok(s2.x < wall && s2.x + s2.visualLaunch.dx < wall, `origin ${s2.x}, drawn ${s2.x + s2.visualLaunch.dx}`);
  const close = mounted(); close.map.tiles[10 * 32 + 11].blocked = true; const s3 = hornShot(close);
  assert.ok(s3.x < 11 && s3.x + s3.visualLaunch.dx < 11);
});

test("the drawn horn converges onto the gameplay path within its settle time and never slides backward", () => {
  const g = mounted(), shot = hornShot(g), H = TRICERATOPS_HORN_SHOT, x0 = shot.x, v = TRICERATOPS_ATTACKS.horn.speed;
  assert.ok(H.settle <= .2);
  let last = -Infinity;
  for (let i = 0; i <= 40; i++) {
    const age = i * .01, q = { ...shot, x: x0 + v * age, age }, p = projectileVisualPoint(q, 0);
    assert.ok(p.x >= last - 1e-9, `drawn horn slides back at ${age}`); last = p.x;
    if (age >= H.settle) assert.ok(Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9, `converged by ${age}`);
    if (age === 0) assert.ok(Math.abs(p.x - (g.player.x + .5 + H.tip)) < 1e-9, "it is drawn leaving the horn tips");
    assert.ok(Math.abs(p.z - H.height) < 1e-9, "at horn height");
  }
});

test("the Close View horns' tips at the end of the wind-up are where the shot is drawn leaving them", () => {
  const H = TRICERATOPS_HORN_SHOT, horn = { phase: "windup", pitch: .25, reach: -.08, lower: .06, x: 1, y: 0 }, tr = createTriceratopsTrack();
  for (let i = 0; i < 10; i++) sampleTriceratops(tr, { id: "m", kind: "triceratops", mountView: true, hp: 100, mountHornPose: horn }, { x: 10, y: 10, z: 0, scale: MOUNT_BEASTS.triceratops.scale, now: 1000 + i * 16, reduce: false, tier: "full", target: null, dead: false, yaw: 0, air: 0, horn });
  const t = triceratopsHornTip(tr);
  assert.ok(Math.abs(t[0] - 10 - H.tip) < .35, `tip forward ${t[0] - 10}`); assert.ok(Math.abs(t[1] - 10) < 1e-6); assert.ok(Math.abs(t[2] - H.height) < .35, `tip height ${t[2]}`);
});

test("the drill keeps the composite upright, its shadow at the feet, and wraps him in a whirlwind (slow under Reduced Motion)", () => {
  for (const reduce of [false, true]) {
    const g = mounted("silly"); g.save.closeView = false; g.presentation = { effectiveQuality: "full", reduceMotion: reduce }; g.save.lastAim = { x: 1, y: 0 };
    g.update(.01, { state: { x: 0, y: 0 }, consume: (k) => k === "jump", held: () => false }, 100000);
    const q = g.triceratopsJump; assert.equal(q?.kind, "drill");
    for (let now = q.start + 15; now < q.drillUntil; now += 40) {
      const { ctx, marks, depth } = tracked(); render(ctx, g, 390, 844, now); assert.equal(depth(), 0, "balanced canvas state");
      // nothing of the mount, saddle or rider is drawn squashed or turned more than the wobble
      for (const [k, v, m] of marks) if (["#171817", "#6b3f22", TRI_ART.body].includes(v) || /^#2f9aa6/.test(v)) {
        assert.ok(m[3] > 0 && Math.abs(Math.hypot(m[2], m[3]) / Math.hypot(m[0], m[1]) - 1) < 1e-6, `${v} upright and unsquashed`);
        assert.ok(Math.abs(Math.atan2(m[1], m[0])) <= .05, `${v} turned ${Math.atan2(m[1], m[0])}`); }
      assert.ok(marks.some(([k, v]) => k === "strokeStyle" && /^rgba\(246,236,210,/.test(v)), "the whirlwind's bands");
      assert.ok(marks.some(([k, v, m]) => k === "fillStyle" && /^rgba\(4,4,6,/.test(v) && m[1] === 0 && m[2] === 0), "the shadow on the ground, untransformed");
    }
    // Reduced Motion: the bands turn slowly; otherwise they turn several times over the drill
    assert.ok(triceratopsWhirlAngle(700, 780, true) < 1); assert.ok(triceratopsWhirlAngle(700, 780, false) > 4 * Math.PI);
  }
  // the shadow: drawn at the feet by the composite (the body skips its own), never twice
  const r = recorder(); assert.equal(drawMountShadow(r.ctx, { beast: "triceratops" }, { x: 3, y: 4 }, 40, 30), true);
  const e = r.log.find((q) => q[0] === "ellipse"); assert.deepEqual([e[1], e[2]], [3.5 * 40, 4.82 * 40]);
  MOUNT_DRAW.skipBody = true; try { assert.equal(drawMountShadow(recorder().ctx, { beast: "triceratops" }, { x: 3, y: 4 }, 40), false); } finally { MOUNT_DRAW.skipBody = false; }
  const b = recorder(); drawMount(b.ctx, { id: "s", beast: "triceratops", variant: "silly" }, { x: 3, y: 4, facing: "left", walkPhase: 0 }, 40, 1000, 12, false, null, "left", { x: 1, y: 0 });
  assert.equal(b.log.some((q) => q[0] === "fillStyle" && /^rgba\(4,4,6,/.test(q[1])), false);
  // tail first: the Silly Goose faces away from the drill's aim
  assert.equal(triceratopsDrillFacing(null, { x: 1, y: 0 }), "left"); assert.equal(triceratopsDrillFacing("left", { x: -1, y: 0 }), "right");
});

test("the Bash's contact arc is raised to the horns' height in both its record and the Standard View", () => {
  const g = mounted(); g.update(.01, holdInput("dodge"), 1000); g.tickTriceratopsCharge(1000 + TRICERATOPS_ATTACKS.charge.shortMs, false);
  g.tickTriceratopsCharge(g.triceratopsCharge.contactAt, false);
  const arc = g.glyphVisuals.find((v) => v.kind === "arc"); assert.ok(arc); assert.equal(arc.z, TRICERATOPS_HORN_SHOT.bashArc);
  assert.equal(arc.x, g.player.x + .5); assert.equal(arc.y, g.player.y + .45); // its gameplay-side place is unchanged
  g.save.closeView = false; g.presentation = { effectiveQuality: "full" };
  const { ctx, log } = recorder(); render(ctx, g, 390, 844, g.triceratopsHornContact.at + 20);
  const i = log.findIndex((q) => q[0] === "strokeStyle" && q[1] === "#fff0a0"), move = log.slice(0, i).reverse().find((q) => q[0] === "moveTo");
  assert.ok(move, "the arc is drawn"); const s = move[1] / arc.x;
  assert.ok(Math.abs(move[2] - (arc.y - (arc.z - .37)) * s) < 1e-6, "drawn at the horns, not the feet");
});

test("the attack poses are the accepted horn pose's own amount: no clock of their own, zero without one", () => {
  const out = new Float64Array(TRI_KEYS.length);
  assert.ok(triceratopsHornOverlay(null, out).every((v) => v === 0));
  for (const phase of ["hold", "windup", "horn", "bash", "dash"]) {
    const full = TRI_HORN_BODY.full[phase], a = triceratopsHornOverlay({ phase, pitch: full * (phase === "horn" ? -1 : 1) }, new Float64Array(TRI_KEYS.length)), half = triceratopsHornOverlay({ phase, pitch: full / 2 * (phase === "horn" ? -1 : 1) }, new Float64Array(TRI_KEYS.length));
    assert.equal(triceratopsHornAmount({ phase, pitch: full * 3 }), 1);
    for (let i = 0; i < TRI_KEYS.length; i++) { assert.equal(a[i], TRI_HORN_BODY[phase][TRI_KEYS[i]] || 0); assert.ok(Math.abs(half[i] - a[i] / 2) < 1e-12); }
  }
  // the body's lean stays small: the saddle and rider keep their anchor (release 988)
  for (const phase of ["hold", "windup", "horn", "bash", "dash"]) assert.ok(Math.abs(TRI_HORN_BODY[phase].lean || 0) <= .5);
});

test("the standard view draws every ridden attack phase without error and leaves the canvas state balanced", () => {
  for (const variant of ["good", "silly"]) for (const phase of [null, "hold", "windup", "horn", "bash", "dash"]) for (const extra of [{}, { mountAir: .5 }, { mountDrill: true, noShadow: true }]) for (const reduceMotion of [false, true]) {
    const { ctx, log } = recorder(), horn = phase ? { phase, pitch: TRI_HORN_BODY.full[phase] * (phase === "horn" ? -1 : 1), reach: .05, lower: .03, x: 1, y: 0 } : null;
    const e = { id: `ridden-${variant}`, kind: "triceratops", mountView: true, triceratopsDisposition: variant, mountHornPose: horn, x: 5, y: 5, scale: MOUNT_BEASTS.triceratops.scale, hp: 1, reduceMotion, ...extra };
    for (const now of [1000, 1016, 1400]) drawTriceratopsBody(ctx, { k: 220, b: 240, u: 80, s: 40, t: now / 1000, flip: variant === "silly" ? -1 : 1, state: "idle", e }, now);
    const saves = log.filter((q) => q[0] === "save").length, restores = log.filter((q) => q[0] === "restore").length;
    assert.equal(saves, restores, `${variant}/${phase}`);
  }
});

// A 2D context that tracks its transform, so a test can see how a draw call lands on the screen.
function tracked() {
  let m = [1, 0, 0, 1, 0, 0]; const stack: number[][] = [], marks: any[] = [];
  const mul = (n: number[]) => { const [a, b, c, d, e, f] = m; m = [a * n[0] + c * n[1], b * n[0] + d * n[1], a * n[2] + c * n[3], b * n[2] + d * n[3], a * n[4] + c * n[5] + e, b * n[4] + d * n[5] + f]; };
  const base: any = { globalAlpha: 1, canvas: { width: 390, height: 844 }, measureText: () => ({ width: 10 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => ({}),
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }), save: () => stack.push(m.slice()), restore: () => { m = stack.pop() || [1, 0, 0, 1, 0, 0]; },
    translate: (x: number, y: number) => mul([1, 0, 0, 1, x, y]), scale: (x: number, y: number) => mul([x, 0, 0, y, 0, 0]), rotate: (r: number) => mul([Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]),
    transform: (a: number, b: number, c: number, d: number, e: number, f: number) => mul([a, b, c, d, e, f]), setTransform: (a: any, b?: number, c?: number, d?: number, e?: number, f?: number) => { m = typeof a === "object" ? [a.a, a.b, a.c, a.d, a.e, a.f] : [a, b!, c!, d!, e!, f!]; } };
  const ctx: any = new Proxy(base, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { if (k === "fillStyle" || k === "strokeStyle") marks.push([k, v, m.slice()]); o[k] = v; return true; } });
  return { ctx, marks, depth: () => stack.length };
}


