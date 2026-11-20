// The young Triceratops's damage (Tim, 2026-11-20): no buff to the Wayfarer; instead his own moves (beam, gatling, charge, whirl,
// stomp, bite) deal about as much as a +10% damage buff would: his sustained damage while engaged is about HATCHLING.young.dpsShare
// (10%) of hers. Measured here: a minute of play against a target dummy (his real move choice, cooldowns, walking and hits, through
// the game's own effects), against her pressing her primary attack at its accepted rate (game.ts PRIMARY_PRESS).
import test from "node:test";
import assert from "node:assert/strict";
import { Game, updateEffects, PRIMARY_PRESS } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { HATCHLING, hatchlingBonus } from "../src/hatchling.ts";
import { createCombatant } from "../src/combat.ts";

const flat = () => ({ width: 32, height: 32, exits: { west: 16, east: 16, north: 16, south: 16 }, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
// His damage a second over `seconds` against a dummy `dist` tiles from the Wayfarer, over hers (her melee power per accepted press).
function youngDpsRatio(seed: string, dist: number, seconds = 60, power: number | null = null) {
  const save = freshSave(); save.seed = seed;
  const g = new Game(save, 0); g.map = flat(); g.builds = []; g.projectiles = []; g.effects = [];
  if (power != null) g.meleePower = () => power; // a stronger Wayfarer: his hits are shares of her melee power
  Object.assign(g.player, { x: 10, y: 10, facing: "right", hp: 1e6, stamina: 100 });
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp: HATCHLING.growth.big, form: "young" }); h.quest.state = "rescued"; h.buffs = {};
  const foe: any = createCombatant("rootBrute", 10 + dist, 10); foe.hp = foe.maxHp = 1e12; g.enemies = [foe];
  g.toggleHatchling();
  const dt = 1 / 30; let now = 0, dealt = 0;
  for (let i = 0; i < seconds / dt; i++) {
    now += dt * 1000; g.tickHatchling(dt, now);
    const before = foe.hp; g.effects = g.effects.filter((fx: any) => fx.life > 0); updateEffects(g.effects, g.enemies, dt); dealt += before - foe.hp;
    foe.x = 10 + dist; foe.y = 10; // a dummy: it stays put
  }
  return (dealt / seconds) / (g.meleePower() / (PRIMARY_PRESS.ms / 1000));
}

test("his sustained damage is about a tenth of the Wayfarer's (0.08 to 0.12), close in and at range, weak or strong", () => {
  assert.equal(HATCHLING.young.dpsShare, .1);
  for (const seed of ["YOUNG-DPS-A", "YOUNG-DPS-B"]) for (const dist of [1.2, 4]) for (const power of [null, 60]) {
    const r = youngDpsRatio(seed, dist, 60, power);
    assert.ok(r >= .08 && r <= .12, `${seed} at ${dist} tiles, power ${power ?? "fresh"}: ${r.toFixed(3)}`);
  }
});

test("the young gives the Wayfarer no buff of his own; the baby's buffs are unchanged", () => {
  const save = freshSave(); save.seed = "YOUNG-NO-AURA";
  const g = new Game(save, 0); g.map = flat(); g.enemies = []; g.builds = []; g.projectiles = [];
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp: HATCHLING.growth.big, form: "young" }); h.quest.state = "rescued"; h.buffs = {};
  const base = g.meleePower(); g.toggleHatchling(); assert.ok(h.out);
  assert.equal(hatchlingBonus(save), null); assert.equal(g.meleePower(), base);
  assert.equal((HATCHLING.young as any).aura, undefined); assert.doesNotMatch(HATCHLING.forms.young.text, /%/);
  h.buffs = { damage: 10 }; assert.deepEqual({ ...hatchlingBonus(save) }, { attackDamage: .02, spellDamage: .02 });
});
