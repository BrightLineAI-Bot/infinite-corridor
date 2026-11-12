// Pre-publish review of 916 (blocker): a Rift Step off a roof, whose end point left the feet off the roof but the collision box
// over the house's walls, landed on the ground wedged in the wall. It now lands on the roof's edge and walks off freely.
import test from "node:test";
import assert from "node:assert/strict";
import { freshSave } from "../src/types.ts";
import { Game, footprintOpen } from "../src/game.ts";
import { roofDeckById } from "../src/roof-decks.ts";
import { learnRank, riftStep, riftStepTo } from "../src/constellation.ts";

const W = 32;
const input = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false });
function onRoof() {
  const s = freshSave(); s.seed = "ROOF"; s.perception.aperture = 90; s.materials.lumenDust = 50; learnRank(s, "rift"); s.magicSkills.selected = "rift-step";
  Object.assign(s.session, { area: "overworld", rx: -2, ry: 0, x: 16, y: 16 });
  const g = new Game(s, 0); g.enemies = []; const d = roofDeckById(g.map, "shack--2-0"); assert.ok(d, "the test shack has a roof deck"); return { g, d };
}
function free(g, t) {
  const p = g.player, x0 = p.x, y0 = p.y; let moved = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let i = 0; i < 90; i++) { t += 16.7; g.update(.0167, input(dx, dy), t); g.enemies = []; moved = Math.max(moved, Math.hypot(p.x - x0, p.y - y0)); }
  return moved;
}
for (const mode of ["plain", "aimed"]) test(`a ${mode} Rift Step off a roof never leaves the Wayfarer wedged in the house wall`, () => {
  const { g, d } = onRoof(), p = g.player; g.lastUpdateNow = 1000;
  if (mode === "plain") { p.x = 10.7; p.y = 22.45; g.setRoofDeck(d); p.lastMoveVector = { x: -.7071, y: -.7071 }; riftStep(g, 1000); }
  else { p.x = 12; p.y = 22.75; g.setRoofDeck(d); riftStepTo(g, 1000, { x: 13.02, y: 22.9 }); }
  assert.ok(g.roofDeck || footprintOpen(g.map, W, p.x, p.y), `not wedged: on a roof's edge or on open ground (at ${p.x.toFixed(2)}, ${p.y.toFixed(2)})`);
  assert.ok(free(g, 1000) > 1, "the Wayfarer can walk away");
});
