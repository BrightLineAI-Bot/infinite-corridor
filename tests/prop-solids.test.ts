// Close View play-through of 926, bug 5: an aimed Rift Step (Deepwood -42,0, tile 18,20) stood the Wayfarer inside the
// Pristine Tomb of the Watcher, and a hop from the shrine's eye could too. The tomb is now a solid prop (game.ts PROP_SOLIDS):
// an aimed step at it lands beside it, a plain step passes through it, walking and hopping stop at it, a Wayfarer already
// inside walks out, and a tomb that would close a way stays open. Generated maps and saves are unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import { freshSave } from "../src/types.ts";
import { Game, PROP_SOLIDS, propBlocked, solidProps } from "../src/game.ts";
import { learnRank, riftStep, riftStepTo } from "../src/constellation.ts";

const W = 32;
const input = (x, y, jump = null) => ({ state: { x, y }, consume: (k) => k === "jump" && jump && !jump.done ? (jump.done = true) : false, held: () => false });
function atShrine() {
  const s = freshSave(); s.seed = "PLAY-926"; s.perception.aperture = 3255; s.materials.lumenDust = 50; for (let i = 0; i < 5; i++) learnRank(s, "rift"); s.magicSkills.selected = "rift-step";
  Object.assign(s.session, { area: "overworld", rx: -42, ry: 0, x: 16, y: 16 });
  const g = new Game(s, 0); g.enemies = [];
  const tomb = g.map.objects.find((o) => o.kind === "watcherTomb");
  assert.ok(tomb && tomb.x === 18 && tomb.y === 20 && tomb.where === "shrine", "the play-through's tomb stands on the shrine's pupil at (18, 20)");
  return { g, s, tomb };
}
function walk(g, dx, dy, frames, t, jump = null) { for (let i = 0; i < frames; i++) { t += 1000 / 60; g.update(1 / 60, input(dx, dy, jump), t); g.enemies = []; } return t; }

test("926 bug 5: the play-through's aimed Rift Step lands beside the Watcher's tomb, never inside it", () => {
  const { g } = atShrine(), p = g.player; p.x = 17.11; p.y = 17.5; g.lastUpdateNow = 1000;
  { const L = solidProps(g.map, W); let tomb = false; for (let i = 0; i < L.length; i += 4) if (L[i] === 18.5 && L[i + 1] === 20.62) tomb = true; assert.ok(tomb, "the shrine tomb is solid"); }
  assert.ok(propBlocked(g.map, W, 18, 19.75), "where 926 put the Wayfarer is inside the tomb");
  assert.equal(riftStepTo(g, 1000, { x: 18.5, y: 20.5 }), true, "the step is still taken");
  assert.equal(propBlocked(g.map, W, p.x, p.y), false, `landed clear of the tomb (at ${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  assert.ok(Math.hypot(p.x + .5 - 18.5, p.y + .75 - 20.5) <= 1.5, "beside the tomb, near the point aimed at");
});

test("926 bug 5: a plain Rift Step along the shrine passes through the tomb and does not end in it", () => {
  const { g } = atShrine(), p = g.player; g.lastUpdateNow = 1000;
  p.x = 15.5; p.y = 19.75; p.lastMoveVector = { x: 1, y: 0 }; g.fall = null;
  riftStep(g, 1000);
  assert.equal(propBlocked(g.map, W, p.x, p.y), false, `not inside the tomb (at ${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
});

test("926 bug 5: walking and hopping from the shrine's eye stop at the tomb; a Wayfarer already inside walks out", () => {
  const { g } = atShrine(), p = g.player; let t = 2000;
  p.x = 16.6; p.y = 19.75; t = walk(g, 1, 0, 60, t);
  assert.equal(propBlocked(g.map, W, p.x, p.y), false, "walking stops outside the tomb");
  p.x = 16.6; p.y = 19.75; const jump = { done: false }; t = walk(g, 1, 0, 90, t, jump);
  assert.ok(jump.done, "the hop was taken");
  assert.equal(propBlocked(g.map, W, p.x, p.y), false, `a hop never ends inside the tomb (at ${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  // a journey saved inside the tomb (before this release) walks out
  p.x = 18; p.y = 19.75; g.fall = null; g.jumpUntil = 0; assert.ok(propBlocked(g.map, W, p.x, p.y));
  t = walk(g, 0, -1, 60, t);
  assert.equal(propBlocked(g.map, W, p.x, p.y), false, "out of the tomb");
  // the tomb is still touched from beside it
  p.x = 17.3; p.y = 19.75; assert.equal(g.nearestObject()?.kind, "watcherTomb");
});

test("926 bug 5: a listed prop that would close a way is not solid; other movers are untouched", () => {
  const tiles = Array.from({ length: W * W }, (_, i) => ({ x: i % W, y: Math.floor(i / W), kind: "grass", elev: 0, blocked: !(Math.floor(i / W) === 10) }));
  const corridor = { tiles, objects: [{ id: "t", kind: "watcherTomb", x: 12, y: 10, state: "sealed" }] };
  assert.equal(solidProps(corridor, W).length, 0, "a tomb in a one-tile corridor never blocks it");
  for (let y = 9; y <= 11; y++) for (let x = 10; x <= 14; x++) tiles[y * W + x].blocked = false;
  const room = { tiles, objects: corridor.objects };
  assert.equal(solidProps(room, W).length, 4, "with room round it, it is solid");
  const two = { tiles, objects: [...corridor.objects, { id: "u", kind: "watcherTomb", x: 13, y: 10 }] };
  assert.equal(solidProps(two, W).length, 0, "two listed props side by side are left open");
  assert.equal(PROP_SOLIDS.kinds.rock, undefined, "only the listed kinds");
});

test("926 bug 5: the solid props change no generated map and no save", () => {
  const { g, s } = atShrine(), before = JSON.stringify(g.map.objects) + JSON.stringify(g.map.tiles), saveBefore = JSON.stringify(s);
  solidProps(g.map, W); propBlocked(g.map, W, 18, 19.75); g.lastUpdateNow = 1000; g.player.x = 17.11; g.player.y = 17.5;
  assert.equal(JSON.stringify(g.map.objects) + JSON.stringify(g.map.tiles), before, "the map is read, never written");
  assert.equal(saveBefore.includes("propLevel"), false); g.update(1 / 60, input(0, 0), 1000); g.sync();
  assert.equal(JSON.stringify(s).includes("propLevel"), false, "nothing new is saved");
  assert.equal(solidProps(g.map, W), solidProps(g.map, W), "kept per map: no allocation while nothing changes");
});
