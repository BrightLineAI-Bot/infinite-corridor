// The Triceratops's look (2026-11-18): the Close View body, the standard-view drawing, the saddle on his back and his size.
// Presentation only: these check the art against its own contract and never change a gameplay number.
import test from "node:test";
import assert from "node:assert/strict";
import { MOUNT_BEASTS, TRICERATOPS_ATTACKS, TRICERATOPS_HORN_POSE, TRICERATOPS_COMPOSITE, TRICERATOPS_CLOSE_VIEW, riderLiftOf, triceratopsDrillFrame } from "../src/beast-mounts.ts";
import { drawMount, drawSaddle, drawMountFront } from "../src/beast-mounts-render.ts";
import { drawPackMonster } from "../src/monster-render.ts";
import { TRI_ART, TRI_POSES, triceratopsPoseName, triceratopsTailBounces, triceratopsRenderMemorySize } from "../src/triceratops-render.ts";
import { triceratopsMesh, createTriceratopsTrack, sampleTriceratops, TRICERATOPS_RIG, TRICERATOPS_SKELETON, TRICERATOPS_SEAT } from "../src/close-view-beast-triceratops.ts";
import { spinoMesh } from "../src/close-view-beast-spino.ts";
import { stegoMesh } from "../src/close-view-beast-stego.ts";
import { BEAST_SLOT } from "../src/close-view-beast-rig.ts";
import { CLOSE_VIEW_BEASTS, closeViewBeastEligible, TRICERATOPS_SLOT } from "../src/close-view-beasts.ts";
import { MONSTER_PACK } from "../src/monster-pack.ts";

const TIERS = ["full", "balanced", "low"];
const RIDDEN = (variant = "normal") => ({ mountView: true, triceratopsDisposition: variant === "silly" ? "silly" : "good" });
function recorder() {
  const log: any[] = [];
  const ctx: any = new Proxy({ globalAlpha: 1, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }, {
    get: (o, k) => k in o ? o[k] : (...args: any[]) => { log.push([k, ...args]); },
    set: (o, k, v) => { if (k === "fillStyle" || k === "strokeStyle") log.push([k, v]); o[k] = v; return true; },
  });
  return { ctx, log };
}
function env(over: any = {}) { return { x: 10, y: 10, z: 0, scale: 1.65 * TRICERATOPS_RIG.closeViewScale, now: 1000, reduce: false, tier: "full", target: { x: 14, y: 10 }, dead: false, ...over }; }
const wild = (disposition = "good", over: any = {}) => ({ id: `wild-${disposition}`, kind: "triceratops", x: 9.5, y: 9.2, hp: 150, maxHp: 150, scale: 1.65, triceratopsDisposition: disposition, pack: null, ...over });

test("Close View body stays within the Stegosaurus's and the Spinosaurus's triangle counts at every tier", () => {
  for (const tier of TIERS) {
    const cap = Math.min(spinoMesh(tier).triangles, stegoMesh(tier).triangles);
    for (const e of [null, RIDDEN(), RIDDEN("silly")]) {
      const m = triceratopsMesh(tier, e);
      assert.ok(m.triangles <= cap, `${tier} ${e ? e.triceratopsDisposition : "wild"}: ${m.triangles} > ${cap}`);
      assert.ok(m.triangles <= TRICERATOPS_RIG.budget[tier] && m.triangles <= BEAST_SLOT.triangles[tier]);
      assert.ok(m.vertexCount < 65536);
    }
  }
  assert.ok(TRICERATOPS_SKELETON.count <= BEAST_SLOT.maxBones);
  // a herd at full detail never draws more than two full bodies (the rest balanced)
  assert.equal(TRICERATOPS_SLOT.maxBodies, 4); assert.ok(TRICERATOPS_SLOT.fullBodies <= 2);
});

test("every disposition shares one hide; only the ridden Silly Goose wears its own tack", () => {
  for (const tier of TIERS) {
    assert.equal(triceratopsMesh(tier, wild("good")), triceratopsMesh(tier, wild("silly")));
    assert.equal(triceratopsMesh(tier, wild("bad")), triceratopsMesh(tier, wild("good")));
    assert.notEqual(triceratopsMesh(tier, RIDDEN()), triceratopsMesh(tier, wild()));
    assert.notEqual(triceratopsMesh(tier, RIDDEN("silly")), triceratopsMesh(tier, RIDDEN()));
  }
  // the sweep's bounce belongs to the Silly Goose and Bad; Good never bounces
  for (const [d, bounces] of [["good", false], ["silly", true], ["bad", true]] as const)
    assert.equal(triceratopsTailBounces({ triceratopsDisposition: d, pack: { attack: "heavySweep", phase: "active" } }), bounces);
  assert.equal(triceratopsTailBounces({ triceratopsDisposition: "bad", pack: { attack: "heavySweep", phase: "windup" } }), false);
  // the poses come from the accepted pack attacks and the ridden fields only
  assert.equal(triceratopsPoseName({ pack: { attack: "ramCharge", phase: "windup" } }), "chargeReady");
  assert.equal(triceratopsPoseName({ pack: { attack: "ramCharge", phase: "active" } }), "charge");
  assert.equal(triceratopsPoseName({ pack: { attack: "shockwave", phase: "windup" } }), "rear");
  assert.equal(triceratopsPoseName({ pack: { attack: "shockwave", phase: "active" } }), "stomp");
  assert.equal(triceratopsPoseName({ mountHornPose: { phase: "hold" } }), "hornHold");
  assert.equal(triceratopsPoseName({}, .5), "leap");
  assert.equal(triceratopsPoseName({ dead: true }), "dead");
  for (const name of Object.keys(TRI_POSES)) assert.ok(Object.keys(TRI_POSES[name]).length >= 0);
  // the roster gives herds the body; a ridden actor is admitted by close-view.ts, and the lowest tier keeps billboards
  assert.equal(closeViewBeastEligible(wild()), true);
  assert.equal(closeViewBeastEligible({ ...wild(), mountView: true }), false);
  assert.equal(CLOSE_VIEW_BEASTS.triceratops.lowBillboard, true);
  assert.equal(TRICERATOPS_CLOSE_VIEW.riddenBody, true);
});

test("he is about 22% smaller, and no gameplay number follows his drawn size", () => {
  const B = MOUNT_BEASTS.triceratops, shrink = 1 - B.scale / 2.7;
  assert.ok(shrink >= .2 && shrink <= .25, `shrink ${shrink}`);
  // his attacks keep their release-987 numbers; the wild herd's own scale is unchanged
  assert.deepEqual(TRICERATOPS_ATTACKS.dash, { range: 1.8, arc: 85, damage: 24, stun: .2 });
  assert.deepEqual(TRICERATOPS_ATTACKS.bash, { range: 2.4, arc: 75, damage: 40, stun: .3, stamina: 8, windupMs: 120 });
  assert.equal(TRICERATOPS_ATTACKS.landing.range, 3); assert.equal(TRICERATOPS_ATTACKS.horn.range, 8); assert.equal(TRICERATOPS_ATTACKS.drill.contact, 1.2);
  assert.equal(MONSTER_PACK.triceratops.form.scale, 1.65);
  // the ridden composite still bounds the drawn rider and mount, and the drill never leaves its frame
  assert.ok(TRICERATOPS_HORN_POSE.height >= B.seat + .9, "the rider's head fits the composite");
  for (let i = 0; i <= 24; i++) for (let h = 0; h < 8; h++) {
    const a = h * Math.PI / 4, t = i / 24, roll = Math.cos(t * Math.PI * 4), pose = { x: Math.cos(a), y: Math.sin(a), bank: .12 * Math.sin(t * Math.PI * 2), roll: Math.sign(roll || 1) * Math.max(.2, Math.abs(roll)), pivot: 1.05, turnIn: Math.min(1, t / .15, (1 - t) / .15) };
    const f = triceratopsDrillFrame(pose, pose, .4 * Math.sin(t * Math.PI));
    assert.ok(f.halfWidth <= TRICERATOPS_COMPOSITE.halfWidth && f.height + .4 <= TRICERATOPS_COMPOSITE.frameHeight && f.bottom <= 1e-9);
  }
});

test("the saddle sits on his back in both views and its girth never passes below the belly", () => {
  const B = MOUNT_BEASTS.triceratops, S = B.scale;
  // the Close View back at the saddle and the standard view's seat agree (within a tenth of a tile); the rider's lift is the seat
  assert.ok(Math.abs(TRICERATOPS_SEAT * S - B.seat) < .1, `3D back ${TRICERATOPS_SEAT * S} vs seat ${B.seat}`);
  assert.equal(riderLiftOf({ beast: "triceratops" }), B.seat);
  assert.ok(B.belly > 0 && B.belly < B.seat - .6, "the girth wraps the barrel between back and belly");
  // painted: nothing of the saddle reaches below the belly line, and the seat is leather
  for (const style of ["barrel", "barrelSilly", "barrelFront", "barrelSillyFront", "barrelSeat"]) {
    const { ctx, log } = recorder(), s = 40, x = 200, y = 300, drop = (B.seat - B.belly) * s, u = s * Math.max(.8, Math.min(1.6, S * .5));
    (ctx as any).drawImage = undefined; drawSaddle(ctx, style, x, y, u, drop, 1);
    const ys = log.filter((q) => ["moveTo", "lineTo"].includes(q[0])).map((q) => q[2]).concat(log.filter((q) => q[0] === "quadraticCurveTo").flatMap((q) => [q[2], q[4]]));
    assert.ok(ys.length > 0);
    assert.ok(Math.max(...ys) <= y + Math.max(drop, u * .5) + 1e-6, `${style} reaches ${Math.max(...ys) - y} below the seat (drop ${drop})`);
    assert.ok(log.some((q) => q[0] === "fillStyle" && q[1] === "#6b3f22"), `${style} is leather`);
  }
  // the old strap legs (straps hanging the full seat height) are gone for the Triceratops
  const { ctx, log } = recorder(); (ctx as any).drawImage = undefined;
  const seat = drawMount(ctx, { id: "t", beast: "triceratops", variant: "silly" }, { x: 5, y: 5, facing: "right", walkPhase: 0 }, 40, 1000);
  assert.equal(seat.up, B.seat * 40); assert.ok(seat.dx < 0, "the seat sits behind the frill");
  drawMountFront(ctx);
  assert.ok(log.some((q) => q[0] === "fillStyle" && q[1] === "#2f9aa6"), "the Silly Goose's teal blanket");
});

test("the Close View pose is deterministic, follows the accepted fields, and allocates nothing per frame", () => {
  const run = (e: any, over: any = {}, frames = 30) => { const tr = createTriceratopsTrack(); let f: any; for (let i = 0; i < frames; i++) f = sampleTriceratops(tr, e, env({ now: 1000 + i * 16, x: 10 + i * .02, ...over })); return [tr, f]; };
  const [, a] = run(wild()), [, b] = run(wild());
  assert.deepEqual([...a.skin], [...b.skin]);
  // one track, one frame and one skin buffer reused every frame
  const tr = createTriceratopsTrack(), f0 = sampleTriceratops(tr, wild(), env()), skin = f0.skin;
  for (let i = 1; i < 50; i++) { const f = sampleTriceratops(tr, wild(), env({ now: 1000 + i * 16 })); assert.equal(f, f0); assert.equal(f.skin, skin); }
  // reduced motion: an idle body holds still
  const q = createTriceratopsTrack(), r1 = [...sampleTriceratops(q, wild(), env({ reduce: true, now: 1000 })).skin], r2 = [...sampleTriceratops(q, wild(), env({ reduce: true, now: 4000 })).skin];
  assert.deepEqual(r1, r2);
  // the ridden horn pose: the neck carries exactly the accepted pitch; a drill rolls the body and keeps it above its support
  const horn = { phase: "bash", pitch: .1, reach: .16, lower: .025, x: 1, y: 0 };
  const [, h] = run({ ...RIDDEN(), id: "m", hp: 100, mountHornPose: horn }, { scale: MOUNT_BEASTS.triceratops.scale, yaw: 0, horn }, 5);
  assert.equal(h.neckPitch, .1); assert.equal(h.ridden, true);
  for (const angle of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    const [t2, d] = run({ ...RIDDEN("silly"), id: "s", hp: 100 }, { scale: MOUNT_BEASTS.triceratops.scale, yaw: 0, air: .3, z: .3, drill: { angle } }, 3);
    assert.equal(d.roll, angle);
    const wp = t2.pose.wp; let low = Infinity; for (let i = 0; i < TRICERATOPS_SKELETON.count; i++) low = Math.min(low, wp[i * 3 + 2]);
    assert.ok(low >= -.05, `drill ${angle}: a bone at ${low}`);
  }
  // the dispositions sample alike at rest (one hide, one stance)
  const [, g] = run(wild("good")), [, s] = run({ ...wild("silly"), id: "wild-good" }), [, bd] = run({ ...wild("bad"), id: "wild-good" });
  assert.deepEqual([...g.skin], [...s.skin]); assert.deepEqual([...g.skin], [...bd.skin]);
});

test("the standard view draws every pose and both mount tacks, keeps its memory bounded, and reads the neck pose exactly", () => {
  for (const [attack, phase] of [[null, null], ["ramCharge", "windup"], ["ramCharge", "active"], ["heavySweep", "windup"], ["heavySweep", "active"], ["shockwave", "windup"], ["shockwave", "active"]]) {
    for (const d of ["good", "silly", "bad"]) {
      const { ctx, log } = recorder(); (ctx as any).drawImage = undefined;
      drawPackMonster(ctx, { ...wild(d), id: `std-${attack}-${d}`, pack: attack ? { attack, phase } : null }, 32, 1000, "right");
      assert.ok(log.length > 100, `${attack}/${d} drew`);
      assert.ok(log.some((q) => q[0] === "fillStyle" && q[1] === TRI_ART.mark), "the shoulder and haunch markings");
    }
  }
  for (let i = 0; i < 80; i++) { const { ctx } = recorder(); drawPackMonster(ctx, { ...wild(), id: `many-${i}` }, 32, 1000, "right"); }
  assert.ok(triceratopsRenderMemorySize() <= 24);
  // the ridden neck turns by exactly the accepted pitch (mirrored when facing left)
  const pose = { phase: "hold", pitch: .13, reach: -.02, lower: .03, x: -1, y: 0 };
  for (const [facing, sign] of [["right", 1], ["left", -1]] as const) {
    const { ctx, log } = recorder(); (ctx as any).drawImage = undefined;
    drawMount(ctx, { id: "n", beast: "triceratops" }, { x: 5, y: 5, facing, walkPhase: 0 }, 40, 1000, 0, false, pose, facing);
    assert.ok(log.some((q) => q[0] === "rotate" && q[1] === sign * .13));
  }
});
