// The Triceratops's legs in Close View (Tim, 2026-11-18: "the hind legs ... don't really fit together"): each leg is one continuous
// (the chest breathes: its scale, up to TRICERATOPS_RIG.breathe.chest, carries into the forelegs, so lengths are checked to 2.5%)
// skin from inside the hip (or shoulder) mass through knee, shin and hock to a planted foot. These check that the segments stay
// joined and weight-bearing in every pose the body shows, and that the leg's top is seated inside the body.
import test from "node:test";
import assert from "node:assert/strict";
import { createTriceratopsTrack, sampleTriceratops, triceratopsMesh, TRICERATOPS_RIG, TRICERATOPS_SKELETON } from "../src/close-view-beast-triceratops.ts";
import { MOUNT_BEASTS } from "../src/beast-mounts.ts";

const LEGS = [["thighL", "shinL", "hockL", "footHL", "femur", "tibia", "hindCannon"], ["thighR", "shinR", "hockR", "footHR", "femur", "tibia", "hindCannon"],
  ["armL", "foreL", "wristL", "footFL", "humerus", "radius", "foreCannon"], ["armR", "foreR", "wristR", "footFR", "humerus", "radius", "foreCannon"]] as const;
const BI = TRICERATOPS_SKELETON.index;
const pos = (tr: any, n: string) => { const i = BI[n] * 3; return [tr.pose.wp[i], tr.pose.wp[i + 1], tr.pose.wp[i + 2]]; };
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = (a: number[]) => Math.hypot(a[0], a[1], a[2]);

const SCENES: [string, any, any][] = [
  ["idle", {}, {}], ["walk", {}, { walk: 2.5 }], ["run", {}, { walk: 6 }],
  ["charge windup", { pack: { attack: "ramCharge", phase: "windup" } }, {}], ["charge", { pack: { attack: "ramCharge", phase: "active" } }, { walk: 5 }],
  ["sweep", { pack: { attack: "heavySweep", phase: "active" }, triceratopsDisposition: "bad" }, {}], ["rear", { pack: { attack: "shockwave", phase: "windup" } }, {}], ["stomp", { pack: { attack: "shockwave", phase: "active" } }, {}],
  ["ridden hold", { mountView: true, mountHornPose: { phase: "hold", pitch: .16 } }, { ridden: true, horn: { phase: "hold", pitch: .16, reach: -.035, lower: .06 } }],
  ["ridden bash", { mountView: true, mountHornPose: { phase: "bash", pitch: .1 } }, { ridden: true, horn: { phase: "bash", pitch: .1, reach: .16, lower: .025 } }],
  ["ridden dash", { mountView: true, mountHornPose: { phase: "dash", pitch: .12 } }, { ridden: true, horn: { phase: "dash", pitch: .12, reach: .08, lower: .035 }, walk: 6 }],
  ["ridden leap", { mountView: true }, { ridden: true, air: .5 }], ["ridden drill", { mountView: true, triceratopsDisposition: "silly" }, { ridden: true, air: .5, drill: { angle: 2 } }],
];

test("in every pose each leg's thigh, shin, hock and foot stay joined, weight-bearing and naturally bent", () => {
  for (const [label, extra, opt] of SCENES) {
    const tr = createTriceratopsTrack(), S = opt.ridden ? MOUNT_BEASTS.triceratops.scale : 1.65 * TRICERATOPS_RIG.closeViewScale;
    for (let i = 0; i < 60; i++) {
      const e = { id: "legs", kind: "triceratops", hp: 100, maxHp: 100, triceratopsDisposition: "good", ...extra };
      const f = sampleTriceratops(tr, e, { x: 10 + (opt.walk || 0) * i * .016, y: 10, z: 0, scale: S, now: 1000 + i * 16, reduce: false, tier: "full", target: { x: 16, y: 10 }, dead: false, yaw: opt.ridden ? 0 : NaN, air: opt.air || 0, horn: opt.horn || null, drill: opt.drill || null });
      assert.ok(f, label);
      for (const [top, mid, low, foot, l1, l2, l3] of LEGS) {
        const H = pos(tr, top), K = pos(tr, mid), A = pos(tr, low), F = pos(tr, foot), G = TRICERATOPS_RIG;
        assert.ok(Math.abs(len(sub(K, H)) - G[l1] * S) < .025 * G[l1] * S, `${label} ${top}: thigh joined to the knee`);
        assert.ok(Math.abs(len(sub(A, K)) - G[l2] * S) < .025 * G[l2] * S, `${label} ${mid}: shin joined to the hock`);
        assert.ok(Math.abs(len(sub(F, A)) - G[l3] * S) < .025 * G[l3] * S, `${label} ${low}: cannon joined to the foot`);
        const u = sub(K, H), v = sub(A, K), bend = Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (len(u) * len(v)))));
        const limit = opt.walk || opt.air || opt.drill || label === "rear" && top.startsWith("arm") ? 1.95 : 1.35; assert.ok(bend < limit, `${label} ${top}: the knee folds ${bend.toFixed(2)} rad`); // standing, a column; striding or tucked, a natural fold
        if (!opt.air && !opt.drill && label !== "rear") assert.ok(F[2] < H[2], `${label} ${top}: the foot is below the hip`);
      }
    }
  }
});

test("the legs' top rows are seated inside the hip and shoulder masses, within the triangle budget", () => {
  const m = triceratopsMesh("full"); assert.ok(m.triangles <= TRICERATOPS_RIG.budget.full);
  // every leg vertex skinned (wholly or partly) to the pelvis or chest lies within the body's half width at its height (no edge out of the flank)
  const skin = m.skin, P = m.positions, pel = BI.pelvis, ch = BI.chest; let n = 0;
  for (let v = 0; v < m.vertexCount; v++) { const a = skin[v * 4], b = skin[v * 4 + 2], w = skin[v * 4 + 3];
    const legTop = (a === pel || a === ch) && [BI.thighL, BI.thighR, BI.armL, BI.armR].includes(b) && w > 0 && w < 1;
    if (!legTop) continue; n++; assert.ok(Math.abs(P[v * 3 + 1]) <= .36, `leg top vertex at side ${P[v * 3 + 1]}`); }
  assert.ok(n > 0);
});

// Three times in this work a `//` comment placed mid-line silently swallowed the code after it (a leg length, a glint's variables, a
// neck pose). A cheap guard for the Triceratops's own modules: no line comment followed by more code on the same line.
import { readFileSync } from "node:fs";
test("no line comment swallows code in the Triceratops's modules", () => {
  for (const f of ["src/triceratops-render.ts", "src/close-view-beast-triceratops.ts"]) {
    readFileSync(new URL(`../${f}`, import.meta.url), "utf8").split("\n").forEach((line, i) => {
      const at = line.indexOf("// "); if (at < 0 || /["'`]/.test(line.slice(0, at).split("").filter((c) => /["'`]/.test(c)).length % 2 ? "x" : "")) return;
      const rest = line.slice(at);
      assert.ok(!/(;\s*(const|let|if|for|ctx\.|B\.|set[A-Z]\w*\()|\)?\s*const \w+ = |\b\w+: [-.\d]+[,}]\s*\w+:|\)\s*;\s*\w+\()/.test(rest), `${f}:${i + 1} code after a line comment: ${rest.slice(0, 80)}`);
    });
  }
});
