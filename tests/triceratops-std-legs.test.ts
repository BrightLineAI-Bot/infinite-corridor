// The Triceratops's legs in the standard view (Tim, 2026-11-20: "The feet detach from the legs when he moves and walks, and the legs
// look like pillars ... make sure the feet are attached when he moves and walks"). Every form (baby, young, adult wild of each nature,
// ridden, the Silly Goose) through the walk cycle and every move: each leg is jointed (the knee or elbow where both bones reach), its
// foot hangs from its ankle and is drawn in the same one shape as the leg (no gap), planted feet do not slide while he walks, and no
// foot sinks into the ground.
import test from "node:test";
import assert from "node:assert/strict";
import { drawTriceratopsBody, TRI_LEG_PROBE, TRI_LEGS, TRI_HORN_BODY, triForm } from "../src/triceratops-render.ts";
import { HATCHLING } from "../src/hatchling.ts";
import { MOUNT_BEASTS } from "../src/beast-mounts.ts";

// a 2D context that keeps each filled path's points (as drawn, in body units with y down) and nothing else
function recorder() {
  let path: number[][] = []; const fills: number[][][] = [];
  const ctx: any = new Proxy({
    beginPath() { path = [[]]; }, moveTo(x: number, y: number) { path.push([x, y]); }, lineTo(x: number, y: number) { path[path.length - 1].push(x, y); },
    quadraticCurveTo(_a: number, _b: number, x: number, y: number) { path[path.length - 1].push(x, y); }, fill() { fills.push(path.filter((p) => p.length)); },
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }),
  }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  return { ctx, fills, clear: () => { fills.length = 0; } };
}

const FORMS: [string, any][] = [
  ["baby", { triForm: "baby", scale: HATCHLING.forms.baby.scale }], ["young", { triForm: "young", scale: HATCHLING.forms.young.scale }],
  ["adult good", { scale: 1.6, triceratopsDisposition: "good" }], ["adult bad", { scale: 1.6, triceratopsDisposition: "bad" }],
  ["ridden", { scale: MOUNT_BEASTS.triceratops.scale, mountView: true }], ["ridden silly", { scale: MOUNT_BEASTS.triceratops.scale, mountView: true, triceratopsDisposition: "silly" }],
];
const horn = (phase: string) => ({ phase, pitch: (TRI_HORN_BODY.full as any)[phase] * (phase === "horn" ? -1 : 1), reach: .05, lower: .03, x: 1, y: 0 });
const MOVES: [string, any, any][] = [
  ["idle", {}, {}], ["walk", {}, { speed: 2 }], ["run", {}, { speed: 5 }], ["walk up the screen", {}, { speed: 2, dy: 1 }],
  ["charge windup", { pack: { attack: "ramCharge", phase: "windup" } }, {}], ["charge", { pack: { attack: "ramCharge", phase: "active" } }, { speed: 5 }],
  ["sweep", { pack: { attack: "heavySweep", phase: "active" } }, {}], ["rear", { pack: { attack: "shockwave", phase: "windup" } }, {}], ["stomp", { pack: { attack: "shockwave", phase: "active" } }, {}],
  ["dazed", { poiseBreak: 1 }, {}], ["dead", { dead: true }, {}], ["lying sick", { resting: "sick" }, {}], ["lying well", { resting: "well" }, {}],
];
const RIDDEN: [string, any, any][] = [
  ["hold", { mountHornPose: horn("hold") }, {}], ["windup", { mountHornPose: horn("windup") }, {}], ["horn shot", { mountHornPose: horn("horn") }, {}],
  ["bash", { mountHornPose: horn("bash") }, { speed: 3 }], ["dash", { mountHornPose: horn("dash") }, { speed: 6 }],
  ["leap", {}, { air: (i: number) => Math.min(1.2, i * .03) }], ["fall", {}, { air: (i: number) => Math.max(0, 1.4 - i * .03) }], ["drill", { mountDrill: true }, { air: () => .6 }],
];

// draws `frames` frames of a move, calling `each` with the probe's legs and the frame's filled paths
function run(form: any, extra: any, opt: any, frames: number, each: (legs: Float64Array, fills: number[][][], e: any, i: number) => void) {
  const { ctx, fills, clear } = recorder();
  const e: any = { id: `std-legs-${Math.random()}`, kind: "triceratops", x: 0, y: 0, facingX: 1, hp: 1, maxHp: 1, pack: null, ...form, ...extra };
  TRI_LEG_PROBE.on = true;
  try {
    for (let i = 0; i < frames; i++) {
      const v = (opt.speed || 0) * .016; e.x = opt.dy ? 0 : i * v; e.y = opt.dy ? i * v : 0; e.mountAir = opt.air ? opt.air(i) : 0;
      clear(); drawTriceratopsBody(ctx, { k: 0, b: 0, u: 40 * Math.max(.6, e.scale), s: 40, t: (1000 + i * 16) / 1000, flip: 1, state: "idle", e }, 1000 + i * 16);
      assert.equal(TRI_LEG_PROBE.count, 4, "four legs drawn");
      each(TRI_LEG_PROBE.data, fills, e, i);
    }
  } finally { TRI_LEG_PROBE.on = false; }
}
const hasPoint = (path: number[], x: number, y: number) => { for (let j = 0; j < path.length; j += 2) if (Math.hypot(path[j] - x, path[j + 1] + y) < 1e-9) return true; return false; };

test("every form, in every move, draws each leg jointed with its foot attached in the same one shape", () => {
  let worstGap = 0;
  for (const [fl, form] of FORMS) for (const [ml, extra, opt] of [...MOVES, ...(form.mountView ? RIDDEN : [])]) {
    run(form, extra, opt, 90, (L, fills, e) => {
      const FM = triForm(e);
      for (let g = 0; g < 4; g++) {
        const o = g * 20, hind = L[o] === 1, S = hind ? TRI_LEGS.hind : TRI_LEGS.fore, [jx, jy, kx, ky, ax, ay, l1, l2] = [L[o + 2], L[o + 3], L[o + 4], L[o + 5], L[o + 6], L[o + 7], L[o + 8], L[o + 9]];
        const label = `${fl} ${ml} ${hind ? "hind" : "fore"} ${L[o + 1] ? "near" : "far"}`;
        // jointed: the upper bone reaches the knee, the lower bone runs from the knee to the ankle (stretching a little at most)
        assert.ok(Math.abs(Math.hypot(kx - jx, ky - jy) - l1) < 1e-9, `${label}: upper bone joined at the knee`);
        assert.ok(Math.abs(Math.hypot(ax - kx, ay - ky) - l2) < 1e-9, `${label}: lower bone joined at the ankle`);
        const lk = FM.leg * (hind ? 1 : FM.foreLeg ?? 1); // (the young's longer forelegs)
        assert.ok(Math.abs(l1 - S.upper * lk) < 1e-12 && l2 >= S.lower * lk - 1e-12 && l2 <= S.lower * lk * TRI_LEGS.stretch + 1e-12, `${label}: bone lengths`);
        // the foot hangs from the ankle: its sole within a foot's size of it
        assert.ok(Math.abs(L[o + 11] - ax) < L[o + 14] && ay - L[o + 10] > 0 && ay - L[o + 10] <= L[o + 14], `${label}: the foot hangs from the ankle`);
        // no foot sinks into the ground
        assert.ok(L[o + 10] >= L[o + 12] - 1e-6, `${label}: sole ${L[o + 10]} below the ground ${L[o + 12]}`);
      }
      // drawn as one shape: for each leg one filled path, a single unbroken subpath, runs down the leg to its ankle and on round the
      // sole; the leg's lowest cross-section and the foot share the ankle's corner, so the gap between them is nil
      for (let g = 0; g < 4; g++) {
        const o = g * 20, one = fills.find((f) => f.length === 1 && hasPoint(f[0], L[o + 16], L[o + 17]) && hasPoint(f[0], L[o + 18], L[o + 19]));
        assert.ok(one, `${fl} ${ml} leg ${g}: the leg and its foot in one shape`);
        const p = one![0]; let ankle = -1; for (let j = 0; j < p.length; j += 2) if (Math.hypot(p[j] - L[o + 16], -p[j + 1] - L[o + 17]) < 1e-9) ankle = j;
        worstGap = Math.max(worstGap, Math.hypot(p[ankle] - L[o + 16], -p[ankle + 1] - L[o + 17]));
      }
    });
  }
  assert.ok(worstGap < 1e-9, `leg to foot gap ${worstGap}`);
});

test("walking and running, the planted feet stay put on the ground and the swinging feet lift", () => {
  for (const [fl, form] of FORMS) for (const speed of form.triForm === "baby" ? [1.5, 3.1] : [1.5, 3, 6]) { // the baby's top speed is 3.1 tiles a second (HATCHLING.forms.baby.speed)
    const last = new Float64Array(4).fill(NaN); let planted = 0, lifted = 0, worst = 0;
    run(form, {}, { speed }, 240, (L, _f, e, i) => {
      const unit = Math.max(.6, e.scale); // a tile in body units: 1 / unit
      for (let g = 0; g < 4; g++) {
        const o = g * 20, onGround = Math.abs(L[o + 10] - L[o + 12]) < 1e-6 && Math.abs(L[o + 15]) < 1e-9, world = e.x / unit + L[o + 11];
        if (i > 150 && onGround && Number.isFinite(last[g])) { worst = Math.max(worst, Math.abs(world - last[g])); planted++; }
        if (i > 150 && L[o + 10] - L[o + 12] > .02) lifted++;
        last[g] = onGround ? world : NaN;
      }
    });
    assert.ok(planted > 40 && lifted > 40, `${fl} at ${speed}: feet both planted (${planted}) and lifted (${lifted})`);
    assert.ok(worst < 2e-3, `${fl} at ${speed}: a planted foot slid ${worst} body units in a frame`);
  }
});

test("the walk is a four-beat gait: at least two feet are always down, and diagonal pairs do not step together", () => {
  run(FORMS[2][1], {}, { speed: 2 }, 240, (L, _f, _e, i) => {
    if (i < 150) return; let down = 0; for (let g = 0; g < 4; g++) if (Math.abs(L[g * 20 + 10] - L[g * 20 + 12]) < 1e-6) down++;
    assert.ok(down >= 2, `frame ${i}: ${down} feet down`);
  });
  const P = TRI_LEGS.phase; assert.equal(new Set([P.nearHind, P.nearFore, P.farHind, P.farFore]).size, 4);
});

test("standing still (and under Reduced Motion) every foot is flat on the ground", () => {
  for (const [fl, form] of FORMS) for (const reduceMotion of [false, true]) run(form, { reduceMotion }, { speed: reduceMotion ? 3 : 0 }, 60, (L, _f, _e, i) => {
    if (i < 40) return; for (let g = 0; g < 4; g++) { const o = g * 20; assert.ok(Math.abs(L[o + 10] - L[o + 12]) < 1e-6 && L[o + 15] === 0, `${fl} reduce=${reduceMotion}: leg ${g} flat on the ground`); }
  });
});
