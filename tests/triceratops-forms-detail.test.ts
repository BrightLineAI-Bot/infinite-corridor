// Tim, 2026-11-20: the Triceratops's three forms in detail. The player's ridden adult has one brow horn broken off halfway (a jagged
// break), wild ones keep both; the cheek spikes grow in with age (none on the baby or the young); the young is his own animal (a long
// powerful neck, a deep chest, a tight waist, a thick tail, a smaller frill grown from the skull); the baby's frill is a small crest.
// Presentation only, both views; within the triangle budgets.
import test from "node:test";
import assert from "node:assert/strict";
import { TRI_ART, TRI_FORMS, TRI_STD_FORMS, TRI_FORM_ADULT, TRI_SHAPE, triceratopsChip, drawTriceratopsBody } from "../src/triceratops-render.ts";
import { triceratopsMesh, TRICERATOPS_RIG, TRICERATOPS_SKELETON, TRICERATOPS_HORN_TIP } from "../src/close-view-beast-triceratops.ts";
import { BEAST_SLOT } from "../src/close-view-beast-rig.ts";

const TIERS = ["full", "balanced", "low"];
const RIDDEN = { mountView: true, triceratopsDisposition: "good" }, SILLY = { mountView: true, triceratopsDisposition: "silly" };
const hexRGB = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
const near = (C: Float32Array, v: number, rgb: number[]) => Math.abs(C[v * 3] - rgb[0]) < .01 && Math.abs(C[v * 3 + 1] - rgb[1]) < .01 && Math.abs(C[v * 3 + 2] - rgb[2]) < .01;
function recorder() {
  const log: any[] = [];
  const ctx: any = new Proxy({ globalAlpha: 1, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }, {
    get: (o, k) => k in o ? o[k] : (...args: any[]) => { log.push([k, ...args]); },
    set: (o, k, v) => { if (k === "fillStyle" || k === "strokeStyle") log.push([k, v]); o[k] = v; return true; },
  });
  return { ctx, log };
}
function drawn(e: any, flip = 1) {
  const { ctx, log } = recorder();
  drawTriceratopsBody(ctx, { k: 100, b: 200, u: 80, s: 40, t: 1, flip, e: { id: `t-${Math.random()}`, kind: "triceratops", x: 0, y: 0, scale: 2, facingX: flip, hp: 1, maxHp: 1, pack: null, ...e }, state: "idle" }, 1000);
  return log;
}
const fills = (log: any[], colour: string) => log.filter((c) => c[0] === "fillStyle" && c[1] === colour).length;

test("the chipped horn is data, on the ridden normal mount only", () => {
  const CH = TRI_ART.chippedHorn;
  assert.ok(CH.side === "left" || CH.side === "right"); assert.equal(CH.at, .5);
  assert.equal(triceratopsChip(RIDDEN), CH);
  for (const e of [{}, { triceratopsDisposition: "good" }, { triceratopsDisposition: "bad" }, SILLY, { triForm: "baby" }, { triForm: "young" }, null]) assert.equal(triceratopsChip(e), null, JSON.stringify(e));
  // the Horn Shot still leaves between the horns (unchanged)
  assert.deepEqual([...TRICERATOPS_HORN_TIP], [.45, 0, .33]);
});

test("standard view: the ridden mount draws its broken horn's core, both ways; wild ones and the Silly Goose do not", () => {
  for (const flip of [1, -1]) {
    assert.ok(fills(drawn(RIDDEN, flip), TRI_ART.chippedHorn.face) + fills(drawn(RIDDEN, flip), TRI_ART.chippedHorn.faceDark) > 0, `flip ${flip}`);
    for (const e of [{ triceratopsDisposition: "good" }, SILLY, { triForm: "young" }]) {
      const log = drawn(e, flip); assert.equal(fills(log, TRI_ART.chippedHorn.face) + fills(log, TRI_ART.chippedHorn.faceDark), 0, JSON.stringify(e));
    }
  }
  // facing right the near horn is his right one: a left chip is the far horn (drawn darker), facing left the near one
  const side = TRI_ART.chippedHorn.side === "left";
  assert.ok(fills(drawn(RIDDEN, 1), side ? TRI_ART.chippedHorn.faceDark : TRI_ART.chippedHorn.face) > 0);
  assert.ok(fills(drawn(RIDDEN, -1), side ? TRI_ART.chippedHorn.face : TRI_ART.chippedHorn.faceDark) > 0);
});

// The brow horns' highest point on each side of the head (bind space; the head bone's vertices).
function hornTops(e: any, tier = "full") {
  const m: any = triceratopsMesh(tier, e), P = m.positions, SK = m.skin, head = TRICERATOPS_SKELETON.index.head; let L = -Infinity, R = -Infinity;
  for (let v = 0; v < m.vertexCount; v++) if ((SK[v * 4] | 0) === head) { const y = P[v * 3 + 1], z = P[v * 3 + 2]; if (y < -.03) L = Math.max(L, z); else if (y > .03) R = Math.max(R, z); }
  return { L, R };
}
test("Close View: the ridden normal mount's chipped horn reaches about half as high; wild, Silly Goose and every tier", () => {
  for (const tier of TIERS) {
    const w = hornTops(null, tier); assert.ok(Math.abs(w.L - w.R) < 1e-5, `${tier} wild: both horns whole`);
    const s = hornTops(SILLY, tier); assert.ok(Math.abs(s.L - s.R) < 1e-5, `${tier} silly: both horns whole`);
    const r = hornTops(RIDDEN, tier), [chip, whole] = TRI_ART.chippedHorn.side === "left" ? [r.L, r.R] : [r.R, r.L]; // the animal's left is -y
    assert.ok(Math.abs(whole - w.L) < 1e-5, `${tier}: the other horn is whole`);
    assert.ok(whole - chip > .05, `${tier}: the chipped horn is clearly shorter (${chip} vs ${whole})`);
  }
});

test("the cheek spikes grow in with age: none on the baby or the young, in both views", () => {
  assert.equal(TRI_FORMS.baby.jugal, 0); assert.equal(TRI_FORMS.young.jugal, 0); assert.equal(TRI_FORM_ADULT.jugal, 1);
  assert.equal(TRI_STD_FORMS.baby.jugal, 0); assert.equal(TRI_STD_FORMS.young.jugal, 0);
  // Close View: no horn-coloured vertex under the head bone's level (the jugal points hang below it; the brow horns' roots sit above)
  const base = hexRGB(TRI_ART.hornBase), head = TRICERATOPS_SKELETON.index.head, hz = TRICERATOPS_SKELETON.bindWorld[head * 3 + 2];
  const low = (e: any) => { const m: any = triceratopsMesh("full", e); let n = 0; for (let v = 0; v < m.vertexCount; v++) if ((m.skin[v * 4] | 0) === head && near(m.colors, v, base) && m.positions[v * 3 + 2] < hz) n++; return n; };
  assert.ok(low(null) > 0, "the adult keeps them"); assert.equal(low({ triForm: "baby" }), 0); assert.equal(low({ triForm: "young" }), 0);
  // the standard view draws the adult's cheek horn and not the young's or the baby's (the horn base colour fills: the adult has one more)
  assert.ok(fills(drawn({}), TRI_ART.hornBase) > fills(drawn({ triForm: "young" }), TRI_ART.hornBase));
});

test("the young is his own form: a lion's carriage (high shoulders, long forelegs, the head up on a short neck), a long tail, a tight waist under a deep chest, short horns, a mane-like frill grown from the skull", () => {
  const Y = TRI_FORMS.young, T = TRI_SHAPE.thick.young, at = (s: number) => T.find((r) => r[0] === s)!;
  assert.ok(Y.neck < 1.2 && Y.tail > 1 && Y.brow < 1 && Y.nose < 1);
  // Tim, 2026-11-20: "the body of a lion with the head of a Triceratops": the back rises from the hips to the shoulders, the neck turns
  // upright, the forelegs are longer than the hind legs, and the head is held level or a little raised (its nod takes back the neck's turn)
  const HD = TRI_SHAPE.heading.young, hd = (s: number) => HD.find((r) => r[0] === s)!;
  assert.ok(hd(.55)[1] > .1 && hd(.65)[1] > .1, "the back slopes down from the shoulders to the hips");
  assert.ok(hd(.88)[1] > .5, "the neck carried upright");
  assert.ok((Y as any).foreLeg > 1, "long forelegs");
  assert.ok(hd(1)[1] + Y.nod > -.1 && hd(1)[1] + Y.nod < .2, "the head level or a little raised");
  assert.ok(TRICERATOPS_RIG.formBody.young.pitch > 0 && TRICERATOPS_RIG.formBody.young.foreLeg > 1 && TRICERATOPS_RIG.formBody.young.mane, "Close View: high shoulders, long forelegs, the mane");
  assert.ok(at(.53)[2] < at(.74)[2] * .6, "the waist is tucked up well under the chest");
  assert.ok(at(.45)[1] > at(.53)[1], "the haunch stands over the waist");
  // the frill: between the baby's crest and the adult's shield, in both views
  assert.ok(TRI_FORMS.baby.frill < Y.frill && Y.frill < 1);
  assert.equal(TRI_STD_FORMS.young.frillShelf, "youngFrill");
  const reach = (S: any) => Math.max(...S.path.flatMap((c: number[]) => [Math.hypot(c[c.length - 2] + .03, c[c.length - 1] - .05)]));
  assert.ok(reach(TRI_ART.shelf) < reach(TRI_ART.youngFrill), "the young's frill is bigger than the baby's crest");
  assert.ok(reach(TRI_ART.youngFrill) < .36, "and smaller than the adult's shield");
  // joined to the skull: the frill's path starts on the skull's top and its base runs back to that point
  const Y0 = TRI_ART.youngFrill.path[0], B = TRI_ART.youngFrill.base; assert.deepEqual(B[B.length - 1].slice(-2), Y0);
  assert.equal(TRI_ART.shelf.knobs.length, 0, "the baby's crest has no rim knobs");
  assert.ok(TRI_ART.youngFrill.knobs.length > 0);
  // Close View: the head carried up on the neck, heavier forelimbs, a long tail
  const FB = TRICERATOPS_RIG.formBody.young; assert.ok(FB.neck[1] < 0 && FB.foreW > 1 && FB.tail > 1);
});

test("every form stays within the triangle budget at every tier", () => {
  for (const tier of TIERS) for (const e of [null, RIDDEN, SILLY, { triForm: "baby" }, { triForm: "young" }]) {
    const m: any = triceratopsMesh(tier, e);
    assert.ok(m.triangles <= TRICERATOPS_RIG.budget[tier] && m.triangles <= BEAST_SLOT.triangles[tier], `${tier} ${JSON.stringify(e)}: ${m.triangles}`);
  }
});
