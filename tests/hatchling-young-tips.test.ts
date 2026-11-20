// The young Triceratops's beam and gatling origins follow his drawn head (Tim, 2026-11-20: the lion's carriage carries the head up over
// the chest). HATCH_ART.tips (the beam, drawn in his charge wind-up) and HATCH_ART.gatlingTips (the gatling horns, drawn in the rear)
// sit on the standard view's horn tips in the pose each move shows: far brow, near brow, nose.
import test from "node:test";
import assert from "node:assert/strict";
import { drawTriceratopsBody, TRI_ART as A } from "../src/triceratops-render.ts";
import { HATCH_ART, hatchlingPack } from "../src/hatchling-render.ts";
import { HATCHLING } from "../src/hatchling.ts";

// the horn tips as drawn (body units from his feet, y up): each horn's path is moveTo(base) then a curve to its tip
function hornTips(pack: any) {
  let path: number[][] = []; const out: Record<string, number[]> = {};
  const grad = () => { const g: any = { stops: [] as string[], addColorStop(_: number, c: string) { g.stops.push(c); } }; return g; };
  const ctx: any = new Proxy({
    beginPath() { path = []; }, moveTo(x: number, y: number) { path.push([x, y]); }, lineTo(x: number, y: number) { path.push([x, y]); },
    quadraticCurveTo(_a: number, _b: number, x: number, y: number) { path.push([x, y]); },
    fill() { const s = ctx.fillStyle?.stops?.join(","); const tip = path[1] && [path[1][0], -path[1][1]];
      if (s === [A.shade, A.hornBase, A.horn].join(",")) out.far = tip; else if (s === [A.hornBase, A.horn, A.hornTip].join(",")) out.near = tip; else if (s === [A.hornBase, A.hornTip].join(",")) out.nose = tip; },
    createLinearGradient: grad, createRadialGradient: grad,
  }, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
  const e: any = { id: `tips-${Math.random()}`, kind: "triceratops", triForm: "young", x: 0, y: 0, scale: HATCHLING.forms.young.scale, facingX: 1, hp: 1, maxHp: 1, pack };
  for (let i = 0; i < 60; i++) drawTriceratopsBody(ctx, { k: 0, b: 0, u: 1, s: 1, t: 1, flip: 1, state: "idle", e }, 1000 + i * 16);
  return [out.far, out.near, out.nose];
}

test("the young's beam and gatling origins sit on his drawn horn tips in each move's pose", () => {
  const M = HATCHLING.young.moves.beam;
  const beam = hornTips(hatchlingPack({ act: { kind: "beam", left: M.charge + .25 - M.charge * .5 } }));
  const gat = hornTips(hatchlingPack({ act: { kind: "gatling" } }));
  for (const [name, drawn, table] of [["beam", beam, HATCH_ART.tips], ["gatling", gat, HATCH_ART.gatlingTips]] as const) {
    assert.equal(table.length, 3);
    drawn.forEach((p, i) => { assert.ok(p, `${name} horn ${i} drawn`); assert.ok(Math.hypot(p[0] - table[i][0], p[1] - table[i][1]) < .04, `${name} tip ${i}: drawn ${p.map((v) => v.toFixed(3))} vs ${table[i]}`); });
  }
  // the beams meet ahead of the nose
  assert.ok(HATCH_ART.focus[0] > Math.max(...HATCH_ART.tips.map((t) => t[0])) + .2);
});
