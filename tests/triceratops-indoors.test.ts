// Tim, 2026-11-20: the persistent Triceratops (the hatchling grown big, a caught one) may be called and ridden indoors too (Pentagons,
// arcologies, keeps, dungeons) where there is room for her (beast-mounts.ts TRICERATOPS_INDOOR); a corridor or a doorway is too
// cramped, and riding into one lets you down. Every other mount still stays outdoors.
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { stableMount, TRICERATOPS_INDOOR, MOUNT_RIDE } from "../src/beast-mounts.ts";

// A keep's floor: a big hall (x 1-10, y 1-12), a doorway at (11, 6) and a three-wide corridor east of it (x 12-22, y 5-7).
function keep() {
  const width = 24, height = 16, tiles = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const hall = x >= 1 && x <= 10 && y >= 1 && y <= 12, door = x === 11 && y === 6, hallway = x >= 12 && x <= 22 && y >= 5 && y <= 7;
    tiles.push({ x, y, kind: hall || door || hallway ? "dungeonFloor" : "dungeonWall", elev: 0, blocked: !(hall || door || hallway), ...(door ? { doorway: true } : {}) });
  }
  return { width, height, tiles, objects: [], enemySpawns: [], exits: {} };
}
function indoors(seed = "TRI-INDOORS") {
  const s = freshSave(); s.seed = seed;
  const g = new Game(s, 0); g.area = "dungeon"; g.map = keep(); g.enemies = []; g.builds = []; g.projectiles = [];
  s.session.activeDungeonId = "keep-test";
  Object.assign(g.player, { x: 5, y: 6, facing: "right", hp: 100 });
  return g;
}
const at = (g: any, x: number, y: number) => { g.player.x = x; g.player.y = y; };

test("her room is data: a radius about her length, most of it open floor, her trunk clear", () => {
  assert.ok(TRICERATOPS_INDOOR.radius >= 2 && TRICERATOPS_INDOOR.minOpen >= .8 && TRICERATOPS_INDOOR.body >= 1);
  assert.match(TRICERATOPS_INDOOR.cramped, /Too cramped in here for her/); assert.match(TRICERATOPS_INDOOR.climbDown, /Too cramped here: you climb down/);
});

test("in the open world she comes as before", () => {
  const s = freshSave(); s.seed = "TRI-OUT"; const g = new Game(s, 0); g.loadArea("overworld", false);
  const { mount } = stableMount(s, "triceratops"); g.player.x = 10; g.player.y = 6;
  const r = g.summonMount(mount.id); assert.ok(r.ok || !/cramped/i.test(r.message), r.message);
});

test("indoors: a big hall is roomy, a corridor or a doorway is too cramped for her", () => {
  const g = indoors(), { mount } = stableMount(g.save, "triceratops");
  at(g, 15, 6); let r = g.summonMount(mount.id); assert.equal(r.ok, false); assert.equal(r.message, TRICERATOPS_INDOOR.cramped); assert.equal(g.save.mounts.riding, null);
  at(g, 11, 6); r = g.summonMount(mount.id); assert.equal(r.message, TRICERATOPS_INDOOR.cramped, "in the doorway");
  at(g, 10, 6); r = g.summonMount(mount.id); assert.equal(r.message, TRICERATOPS_INDOOR.cramped, "her trunk would stand in the doorway");
  at(g, 5, 6); r = g.summonMount(mount.id); assert.ok(r.ok, r.message); assert.equal(g.save.mounts.riding, mount.id, "in the hall she answers");
  // a hold of Act indoors calls her (and the Act button offers it)
  g.dismount(); assert.ok(g.mountCallable()); r = g.actMount(); assert.ok(r?.ok, r?.message); assert.equal(g.save.mounts.riding, mount.id);
});

test("riding into the corridor lets you down there; in the hall the ride goes on and is judged once per tile", () => {
  const g = indoors(), { mount } = stableMount(g.save, "triceratops"); assert.ok(g.summonMount(mount.id).ok);
  for (let i = 0; i < 20; i++) g.tickMount(.05);
  assert.equal(g.save.mounts.riding, mount.id, "the hall is roomy: the ride goes on");
  const judged = g._roomy; g.tickMount(.05); assert.equal(g._roomy, judged, "the same tile is not judged again");
  at(g, 6, 6); g.tickMount(.05); assert.notEqual(g._roomy, judged, "a new tile is judged"); assert.equal(g.save.mounts.riding, mount.id);
  at(g, 14, 6); g.tickMount(.05);
  assert.equal(g.save.mounts.riding, null, "the corridor is too cramped"); assert.equal(g.message, TRICERATOPS_INDOOR.climbDown);
  assert.ok(g.save.mounts.stable.some((m: any) => m.id === mount.id), "she waits in the stable");
});

test("a saved ride indoors resumes exactly", () => {
  const g = indoors(), { mount } = stableMount(g.save, "triceratops"); assert.ok(g.summonMount(mount.id).ok);
  const copy = JSON.parse(JSON.stringify(g.save)), h = new Game(copy, 0); h.area = "dungeon"; h.map = keep(); h.enemies = []; at(h, 5, 6);
  assert.equal(copy.mounts.riding, mount.id); h.tickMount(.05); assert.equal(h.save.mounts.riding, mount.id);
});

test("every other mount still stays outdoors (the old refusal), the Silly Goose and the grown hatchling are Triceratops", () => {
  const g = indoors(), { mount } = stableMount(g.save, "briarStag");
  const r = g.summonMount(mount.id); assert.equal(r.ok, false); assert.match(r.message, /Mounts cannot be ridden in here/);
  assert.equal(g.mountCallable(), false, "indoors with no Triceratops, Act reads as before");
  const big = g.grantBigTriceratops(); assert.ok(big); assert.ok(g.summonMount(big.id).ok, "the hatchling grown big");
  g.dismount(); const silly = stableMount(g.save, "triceratops", { triceratopsDisposition: "silly" }).mount; assert.ok(g.summonMount(silly.id).ok, "the Silly Goose");
  void MOUNT_RIDE;
});

test("loading into a dungeon on her back: she comes in where there is room, else you climb down; another mount waits outside", () => {
  const s = freshSave(); s.seed = "TRI-LOAD"; const g = new Game(s, 0); g.loadArea("overworld", false); g.player.x = 10; g.player.y = 6;
  const { mount } = stableMount(s, "triceratops"); g.summonMount(mount.id);
  if (s.mounts.riding) { g.loadArea("dungeon", false); g.tickMount(.05); assert.equal(s.mounts.riding === mount.id, g.mountRoomy(), "she stays exactly where there is room"); }
  const s2 = freshSave(); s2.seed = "TRI-LOAD-2"; const g2 = new Game(s2, 0); g2.loadArea("overworld", false); g2.player.x = 10; g2.player.y = 6;
  const stag = stableMount(s2, "briarStag").mount; g2.summonMount(stag.id);
  if (s2.mounts.riding) { g2.loadArea("dungeon", false); assert.equal(s2.mounts.riding, null, "the stag waits outside"); }
});
