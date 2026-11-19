// The Beast Hotel rescue (hatchling.ts; game.ts hatchMamaTalk, placeHatchRescue, freeHatchling): the mother gives the quest, the site
// is marked on the Atlas and compass, a pack guards the pen, and freeing him makes him the Wayfarer's companion. Every journey does it.
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { serializeSave, deserializeSave } from "../src/save-codec.ts";
import { HATCHLING, rescueGuidance, chooseRescueSite } from "../src/hatchling.ts";
import { beastHotelId } from "../src/beast-mounts.ts";

const guards = (g) => g.enemies.filter((e) => String(e.id).startsWith("hatchling-guard:"));
function start(seed = "HATCH-QUEST") { const save = freshSave(); save.seed = seed; return new Game(save, 0); }
function atSite(g) { const q = g.save.mounts.hatchling.quest; g.rx = q.rx; g.ry = q.ry; g.loadArea("overworld"); return g.map.objects.find((o) => o.kind === "hatchPen"); }

test("the hometown always has a Beast Hotel door, and inside, the sick mother gives the quest once", () => {
  const g = start();
  assert.ok(g.map.objects.some((o) => o.beastHotelDoor), "the door stands at the hometown with no Triceratops in the stable");
  const door = g.map.objects.find((o) => o.beastHotelDoor); Object.assign(g.player, { x: door.x, y: door.y });
  const r = g.enterBeastHotel(door); assert.equal(r.ok, true); assert.match(r.message, /mother Triceratops/);
  assert.equal(g.save.session.activeDungeonId, beastHotelId("0,0"));
  const mama = g.map.objects.find((o) => o.kind === "hatchMama"); assert.ok(mama); assert.equal(mama.state, "sick");
  const offer = g.hatchMamaTalk(mama), q = g.save.mounts.hatchling.quest;
  assert.equal(offer.ok, true); assert.equal(q.state, "active"); assert.equal(q.from, "0,0"); assert.equal(q.guards.length, HATCHLING.quest.guards);
  const d = Math.max(Math.abs(q.rx), Math.abs(q.ry)); assert.ok(d >= HATCHLING.quest.band[0] && d <= HATCHLING.quest.band[1], "a few sections from home");
  assert.ok(g.save.narrative.journal.some((j) => j.recordId === "hatchling:quest" && /Bring my little one home/.test(j.text)));
  const again = g.hatchMamaTalk(mama); assert.match(again.message, /Have you found my baby/); assert.deepEqual([q.rx, q.ry], [g.save.mounts.hatchling.quest.rx, g.save.mounts.hatchling.quest.ry]);
  assert.deepEqual(rescueGuidance(g.save.mounts.hatchling), { area: "overworld", rx: q.rx, ry: q.ry, kind: "guidance", name: HATCHLING.quest.names.quest }, "the compass and Atlas have it");
});

test("the site is deterministic from the seed and the hometown (the same journey twice picks the same place)", () => {
  const a = start("SITE-PIN"), b = start("SITE-PIN"); a.hatchMamaTalk(null); b.hatchMamaTalk(null);
  const qa = a.save.mounts.hatchling.quest, qb = b.save.mounts.hatchling.quest; assert.deepEqual([qa.rx, qa.ry], [qb.rx, qb.ry]);
  assert.deepEqual(chooseRescueSite("SITE-PIN", "0,0", () => false), chooseRescueSite("SITE-PIN", "0,0", () => false));
});

test("at the site a pack guards the pen; the pen opens only when they are driven off; freeing him makes him the companion", () => {
  const g = start(); g.hatchMamaTalk(null);
  const pen = atSite(g), q = g.save.mounts.hatchling.quest; assert.ok(pen); assert.equal(pen.state, "guarded");
  assert.deepEqual([pen.x, pen.y], [q.x, q.y], "the pen's spot is kept on the quest");
  const W = g.map.width || 32, t = g.map.tiles[q.y * W + q.x]; assert.ok(t && !t.blocked);
  assert.equal(guards(g).length, HATCHLING.quest.guards);
  const refused = g.freeHatchling(pen); assert.equal(refused.ok, false); assert.equal(g.save.mounts.hatchling.owned, false);
  const [first, ...rest] = guards(g); first.hp = 0; first.dead = true; g.defeatEnemy(first);
  assert.deepEqual(q.cleared, [first.id]);
  // leave and come back: a driven-off guard is not raised again, the others still stand
  g.rx += 1; g.loadArea("overworld"); g.rx -= 1; g.loadArea("overworld");
  assert.equal(guards(g).filter((e) => !e.dead).length, rest.length); assert.ok(!guards(g).some((e) => e.id === first.id && !e.dead));
  for (const e of guards(g)) if (!e.dead) { e.hp = 0; e.dead = true; g.defeatEnemy(e); }
  const open = g.map.objects.find((o) => o.kind === "hatchPen"); assert.equal(open.state, "open");
  const r = g.freeHatchling(open), h = g.save.mounts.hatchling;
  assert.equal(r.ok, true); assert.equal(h.owned, true); assert.equal(h.quest.state, "rescued"); assert.equal(h.form, "baby"); assert.ok(h.out, "he comes along at once");
  assert.equal(rescueGuidance(h), null, "the marker is gone");
  assert.ok(!g.map.objects.some((o) => o.kind === "hatchPen"));
  // reload: the pen and guards never come back; he is still the companion
  g.exportSnapshot?.(1000); const again = new Game(deserializeSave(serializeSave(g.save)), 1000);
  again.rx = q.rx; again.ry = q.ry; again.loadArea("overworld");
  assert.ok(!again.map.objects.some((o) => o.kind === "hatchPen")); assert.equal(guards(again).length, 0); assert.equal(again.save.mounts.hatchling.owned, true);
});

test("an active quest survives a reload exactly (site, pen spot and driven-off guards)", () => {
  const g = start(); g.hatchMamaTalk(null); atSite(g); const [e] = guards(g); e.hp = 0; e.dead = true; g.defeatEnemy(e);
  const before = structuredClone(g.save.mounts.hatchling.quest), loaded = deserializeSave(serializeSave(g.save));
  assert.deepEqual(loaded.mounts.hatchling.quest, before);
});
