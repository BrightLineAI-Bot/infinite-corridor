// The baby hatchling's defence buff (Tim, 2026-11-19): exactly 10% less damage taken from a blow, on top of (not inside) the
// Wayfarer's capped damage-reduction curve; it ends with the buff.
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { HATCHLING } from "../src/hatchling.ts";

const flat = () => ({ width: 32, height: 32, exits: { west: 16, east: 16, north: 16, south: 16 }, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
function blow(buffs) {
  const save = freshSave(); save.seed = "HATCH-DEFENCE";
  const g = new Game(save, 0); g.map = flat(); g.enemies = []; g.builds = []; g.projectiles = [];
  Object.assign(g.player, { x: 10, y: 10, facing: "right", hp: 100000, stamina: 100 }); save.maxHp = 100000;
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, form: "baby" }); h.buffs = buffs;
  const before = g.player.hp; g.packHurt(null, 10000, {}, 5000); return before - g.player.hp;
}
test("the defence buff takes exactly 10% off a blow; the other buffs leave a blow alone", () => {
  assert.equal(HATCHLING.buffs.kinds.defence.bonus.damageTaken, -.1);
  const plain = blow({}), guarded = blow({ defence: 30 }), others = blow({ damage: 30, stamina: 30 });
  assert.ok(plain > 0);
  assert.ok(Math.abs(guarded / plain - .9) < .001, `${guarded} / ${plain}`);
  assert.equal(others, plain);
});
