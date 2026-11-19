// Tim, 2026-11-19: the free Triceratops (release 734's production gift) is taken from every journey and every journey earns the
// Triceratops through the Beast Hotel rescue (hatchling.ts). Only the gift's own mounts go; caught Triceratops and every other mount
// stay. Riding the gift when the journey was saved, the Wayfarer is set down on safe ground.
import test from "node:test";
import assert from "node:assert/strict";
import { freshSave, migrateSave } from "../src/types.ts";
import { serializeSave, deserializeSave } from "../src/save-codec.ts";
import { Game } from "../src/game.ts";
import { ensureMounts, ensureProductionTriceratops, stableMount, startRide, FREE_TRICERATOPS_ID, FREE_TRICERATOPS_REMOVAL, TRICERATOPS_RIDE, MOUNT_RIDE } from "../src/beast-mounts.ts";

const gift = (id = "mount-free-triceratops-v1") => ({ id, beast: "triceratops", variant: "normal", caughtAt: 0, left: MOUNT_RIDE.seconds, seen: [], hp: TRICERATOPS_RIDE.health, defeats: 0, recovery: null });
// A journey as release 1013 left it: the gift in the stable, no removal marker, no hatchling record.
function oldJourney({ ride = false, extra = [] } = {}) {
  const save = freshSave(); save.seed = "OLD-GIFT"; for (const b of extra) stableMount(save, b.beast, b.actor);
  const q = save.mounts; q.stable.unshift(gift()); q.standardTriceratopsGrant = 1; delete q.freeTriceratopsRemoved; delete q.hatchling;
  if (ride) q.riding = q.last = "mount-free-triceratops-v1";
  return JSON.parse(JSON.stringify(save));
}
const tri = (save) => save.mounts.stable.filter((m) => m.beast === "triceratops");

test("loading an old journey removes only the gift, once, and the quest is open to it", () => {
  const raw = oldJourney({ extra: [{ beast: "briarStag" }, { beast: "triceratops", actor: { triceratopsDisposition: "silly" } }] });
  const caught = raw.mounts.stable.filter((m) => m.id !== "mount-free-triceratops-v1").map((m) => structuredClone(m));
  const save = migrateSave(raw);
  assert.deepEqual(save.mounts.stable, caught, "the stag and the caught Silly Goose stay exactly");
  assert.equal(tri(save).length, 1); assert.equal(tri(save)[0].variant, "silly");
  assert.equal(save.mounts.freeTriceratopsRemoved, FREE_TRICERATOPS_REMOVAL);
  assert.equal(save.mounts.hatchling.owned, false); assert.equal(save.mounts.hatchling.quest.state, "none");
  // the production hooks never grant one again
  ensureProductionTriceratops(save); ensureProductionTriceratops(save); assert.equal(tri(save).length, 1);
  // every suffix of the gift's id family goes; a caught normal Triceratops (an ordinary id) stays
  const many = oldJourney(); many.mounts.stable.push(gift("mount-free-triceratops-v1-2")); const good = freshSave(); const c = stableMount(good, "triceratops").mount;
  many.mounts.stable.push(structuredClone(c)); const m2 = migrateSave(many); assert.deepEqual(tri(m2).map((m) => m.id), [c.id]);
  assert.ok(FREE_TRICERATOPS_ID.test("mount-free-triceratops-v1-12") && !FREE_TRICERATOPS_ID.test("mount-3") && !FREE_TRICERATOPS_ID.test("mount-hatchling-triceratops-v1"));
});

test("the gift in recovery at the Beast Hotel goes too; a caught one recovering stays", () => {
  const raw = oldJourney(); raw.mounts.stable[0].recovery = { reason: "defeats", progress: 3, recent: [], opponentId: "x", encounterStarted: false, encounterComplete: false };
  const s = freshSave(), caught = stableMount(s, "triceratops", { triceratopsDisposition: "silly" }).mount; caught.recovery = { reason: "puncture", progress: 1, recent: [], opponentId: "y", encounterStarted: false, encounterComplete: false };
  raw.mounts.stable.push(structuredClone(caught));
  const save = migrateSave(raw); assert.deepEqual(tri(save).map((m) => m.id), [caught.id]); assert.equal(tri(save)[0].recovery.reason, "puncture");
});

test("riding the gift when saved: the Wayfarer is set down where it stood, on safe footing", () => {
  const save = migrateSave(oldJourney({ ride: true }));
  assert.equal(save.mounts.riding, null); assert.equal(save.mounts.last, undefined); assert.equal(save.mounts.freeTriceratopsDismount, true);
  const before = { ...save.position }, g = new Game(save, 0);
  assert.equal(save.mounts.freeTriceratopsDismount, undefined, "consumed on load"); assert.equal(g.mountRide?.() ?? null, null);
  const W = g.map.width || 32, t = g.map.tiles[Math.floor(g.player.y + .72) * W + Math.floor(g.player.x + .5)]; assert.ok(t && !t.blocked);
  void before;
  // over lava (a mount could wade it), the Wayfarer is moved to the nearest safe ground instead
  const flat = { width: 32, height: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] };
  for (let y = 8; y <= 12; y++) for (let x = 8; x <= 12; x++) flat.tiles[y * 32 + x].kind = "lava";
  g.map = flat; g.area = "dungeon"; Object.assign(g.player, { x: 10, y: 10 }); g.save.mounts.freeTriceratopsDismount = true;
  assert.equal(g.settleFreeDismount(), true); const u = flat.tiles[Math.floor(g.player.y + .72) * 32 + Math.floor(g.player.x + .5)]; assert.notEqual(u.kind, "lava");
  assert.ok(Math.hypot(g.player.x - 10, g.player.y - 10) < 4, "the nearest safe ground");
  // safe footing already: the Wayfarer stays exactly where they were
  g.save.mounts.freeTriceratopsDismount = true; const at = { x: g.player.x, y: g.player.y }; assert.equal(g.settleFreeDismount(), false); assert.deepEqual({ x: g.player.x, y: g.player.y }, at);
});

test("the removal runs once: its marker survives a reload, and new saves start marked with no Triceratops", () => {
  const save = migrateSave(oldJourney()), copy = deserializeSave(serializeSave(save));
  assert.equal(copy.mounts.freeTriceratopsRemoved, FREE_TRICERATOPS_REMOVAL); assert.equal(tri(copy).length, 0);
  // after the removal, a mount that happens to carry the old id is never touched again
  copy.mounts.stable.push(gift()); ensureMounts(copy); assert.equal(tri(copy).length, 1);
  const fresh = freshSave(); assert.equal(fresh.mounts.freeTriceratopsRemoved, FREE_TRICERATOPS_REMOVAL); assert.equal(tri(ensureProductionTriceratops(fresh)).length, 0);
});

test("riding a caught Triceratops when saved is untouched by the removal", () => {
  const s = freshSave(); const m = stableMount(s, "triceratops").mount; startRide(s, m.id); delete s.mounts.freeTriceratopsRemoved;
  const save = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(save.mounts.riding, m.id); assert.equal(save.mounts.freeTriceratopsDismount, undefined);
});
