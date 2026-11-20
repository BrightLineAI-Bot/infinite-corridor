// The young Triceratops's presence (Tim, 2026-11-20): while his young form is out (summoned and alive; not the baby, not the ridden big
// form) the Wayfarer deals 10% more damage with every attack and spell, applied by the same path as the baby's buffs (game.ts
// armorGlyphBonus: attackDamage and spellDamage). It adds to the baby's buffs once, never twice, and ends when he goes.
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { HATCHLING, hatchlingBonus, youngOut, ensureHatchling } from "../src/hatchling.ts";

const flat = () => ({ width: 32, height: 32, exits: { west: 16, east: 16, north: 16, south: 16 }, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
function setup(form = "young", xp = HATCHLING.growth.big) {
  const save = freshSave(); save.seed = "HATCH-AURA";
  const g = new Game(save, 0); g.map = flat(); g.enemies = []; g.builds = []; g.projectiles = [];
  Object.assign(g.player, { x: 10, y: 10, facing: "right", hp: 100, stamina: 100 });
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp, form }); h.quest.state = "rescued"; h.buffs = {};
  return { save, g, h };
}

test("the aura is data: +10% damage, shown in the young form's Pack text", () => {
  assert.equal(HATCHLING.young.aura.damage, .1);
  assert.match(HATCHLING.forms.young.text, /\+10% damage while he's out/);
  assert.doesNotMatch(HATCHLING.forms.baby.text, /damage while/);
});

test("on while the young form is out; off when dismissed, fallen, the baby or the big form", () => {
  const { save, g, h } = setup("young");
  assert.equal(hatchlingBonus(save), null, "not out yet");
  const base = g.meleePower();
  g.toggleHatchling(); assert.ok(h.out && youngOut(h));
  assert.deepEqual({ ...hatchlingBonus(save) }, { attackDamage: .1, spellDamage: .1 });
  assert.ok(Math.abs(g.meleePower() / base - 1.1) < 1e-9, `${g.meleePower()} / ${base}`);
  g.toggleHatchling(); assert.equal(h.out, null); assert.equal(hatchlingBonus(save), null, "sent to rest");
  assert.equal(g.meleePower(), base);
  g.toggleHatchling(); g.hatchlingFall(); assert.equal(hatchlingBonus(save), null, "fallen");
  g.toggleHatchling(); g.chooseHatchlingForm("baby"); assert.ok(h.out, "the baby is out"); assert.equal(hatchlingBonus(save), null, "the baby gives no aura");
  assert.equal(g.meleePower(), base);
  g.chooseHatchlingForm("big"); assert.equal(h.out, null); assert.equal(hatchlingBonus(save), null, "the big form gives no aura");
  // an unowned or stale state never gives it
  assert.equal(youngOut({ owned: false, form: "young", out: {} }), false);
  assert.equal(youngOut(null), false);
});

test("it adds once to the baby's buffs still running, and to nothing else", () => {
  const { save, g, h } = setup("young");
  g.toggleHatchling();
  h.buffs = { damage: 20, defence: 20, stamina: 20 };
  const b = hatchlingBonus(save);
  assert.ok(Math.abs(b.attackDamage - .12) < 1e-12 && Math.abs(b.spellDamage - .12) < 1e-12, JSON.stringify(b));
  assert.equal(b.damageTaken, -.1); assert.equal(b.staminaRegen, .05);
  assert.deepEqual(Object.keys(b).sort(), ["attackDamage", "damageTaken", "spellDamage", "staminaRegen"]);
  // asked many times (every frame) it never grows, and the shared aura object is never changed by a sum
  for (let i = 0; i < 5; i++) hatchlingBonus(save);
  h.buffs = {}; const a = hatchlingBonus(save); assert.deepEqual({ ...a }, { attackDamage: .1, spellDamage: .1 }); assert.ok(Object.isFrozen(a));
  h.buffs = { damage: 5 }; hatchlingBonus(save); h.buffs = {}; assert.deepEqual({ ...hatchlingBonus(save) }, { attackDamage: .1, spellDamage: .1 });
});

test("a save with him out keeps the aura through a reload", () => {
  const { save, g } = setup("young"); g.toggleHatchling();
  const copy = JSON.parse(JSON.stringify(save)); ensureHatchling(copy.mounts);
  assert.ok(youngOut(copy.mounts.hatchling)); assert.deepEqual({ ...hatchlingBonus(copy) }, { attackDamage: .1, spellDamage: .1 });
});
