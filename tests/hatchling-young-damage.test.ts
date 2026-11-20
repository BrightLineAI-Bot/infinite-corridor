// The young Triceratops's damage (Tim, 2026-11-20): no buff to the Wayfarer; instead his own moves (beam, gatling, charge, whirl,
// stomp, bite) deal about as much as a +10% damage buff would, over the course of a REAL fight: about HATCHLING.young.dpsShare (10%) of
// the damage the Wayfarer deals in the same fight; since Tim's 2026-11-20 follow-up, less against packs (about .08) and more
// against one elite or world beast (about .14). Measured here with the real game update (Game.update: the foes' own AI moving,
// keeping range and attacking, his approach, cooldowns, misses and target switching) and a Wayfarer who walks to the nearest foe,
// presses her primary attack every .45 to .8 s once in reach and dodges away every few seconds, in four typical encounters: an
// early pack, a mid-game pack (ranged foes among them), a single affixed elite and a world-beast segment, over several seeds.
// His damage is counted from his own effects' hits (game.ts hatchHit: `hatch` effects), hers is the rest of what the foes lose.
import test from "node:test";
import assert from "node:assert/strict";
import { Game, regionalScale } from "../src/game.ts";
import { freshSave } from "../src/types.ts";
import { HATCHLING, hatchlingBonus, hatchFocus } from "../src/hatchling.ts";
import { createCombatant, wayfarerDamage } from "../src/combat.ts";
import { regionalThreat } from "../src/world.ts";
import { rollAffixes } from "../src/affixes.ts";

const flat = () => ({ width: 32, height: 32, exits: { west: 16, east: 16, north: 16, south: 16 }, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: "savannaGrass", elev: 0, blocked: false })), objects: [], enemySpawns: [] });
// ring: the region's threat ring (regionalScale, as every spawned foe); power: her weapon's power (a mid-game blade); foes: kind and place
// (tiles from her), optional affixes (an elite), a world beast's tag, and a fixed health for the long fights (a segment of them)
const ENCOUNTERS: Record<string, any> = {
  "early pack": { ring: 1, foes: [{ kind: "ashenHound", x: 5, y: -1 }, { kind: "ashenHound", x: 6, y: 1 }, { kind: "ashling", x: 7, y: 0 }, { kind: "rootBrute", x: 6, y: 2 }] },
  "mid-game pack": { ring: 12, power: 40, foes: [{ kind: "ashenHound", x: 5, y: -1 }, { kind: "rootBrute", x: 6, y: 1 }, { kind: "sparkWarden", x: 7, y: 0 }, { kind: "veilMoth", x: 6, y: 2 }, { kind: "ashenHound", x: 7, y: -2 }] },
  "affixed elite": { ring: 6, power: 25, foes: [{ kind: "rootBrute", x: 5, y: 0, affixes: 2, hp: 900 }] },
  "world beast": { ring: 6, power: 25, foes: [{ kind: "voidWalker", x: 5, y: 0, boss: true, worldBeast: "voidWalker", hp: 6000 }] },
};
// One fight (at most `seconds`): his damage over hers.
function fight(enc: any, seed: string, seconds = 45) {
  let rs = [...seed].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7); const rnd = () => { rs = (rs * 1103515245 + 12345) >>> 0; return rs / 4294967296; };
  const save = freshSave(); save.seed = seed;
  if (enc.power) save.equipment.primary.power = save.equipment.primary.basePower = enc.power;
  const g: any = new Game(save, 0); g.map = flat(); g.builds = []; g.projectiles = []; g.effects = [];
  Object.assign(g.player, { x: 15, y: 16, facing: "right", stamina: 100 });
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp: HATCHLING.growth.big, form: "young" }); h.quest.state = "rescued"; h.buffs = {};
  const q = regionalThreat(enc.ring, 0);
  g.enemies = enc.foes.map((f: any, i: number) => { const e: any = createCombatant(f.kind, 15 + f.x, 16 + f.y, !!f.boss); e.id = `foe${i}`; e.aggro = true; if (f.affixes) e.affixes = rollAffixes(`${seed}:${i}`, f.affixes); if (f.worldBeast) e.worldBeast = f.worldBeast; if (f.hp) e.hp = e.maxHp = f.hp; return regionalScale(e, q); });
  g.toggleHatchling(); assert.ok(h.out);
  const dt = 1 / 30, seen = new Map(); let now = 1000, his = 0, total = 0, nextPress = 0, dodgeLeft = 0, nextDodge = 2 + rnd() * 3, dir = [0, 0];
  for (let t = 0; t < seconds; t += dt) {
    g.player.hp = 1e6; g.player.stamina = 100; // she stays in the fight (her hurt is not what is measured)
    const p = g.player, alive = g.enemies.filter((e: any) => !e.dead && e.hp > 0); if (!alive.length) break;
    let foe: any = null, d = Infinity; for (const e of alive) { const k = Math.hypot(e.x - p.x, e.y - p.y); if (k < d) { d = k; foe = e; } }
    let mx = 0, my = 0, attack = false, dodge = false;
    if (t > nextDodge) { dodge = true; const a = rnd() * Math.PI * 2; dir = [Math.cos(a), Math.sin(a)]; dodgeLeft = .35; nextDodge = t + 2.5 + rnd() * 3; }
    if (dodgeLeft > 0) { dodgeLeft -= dt; [mx, my] = dir; }
    else if (d > 1.1) { mx = (foe.x - p.x) / d; my = (foe.y - p.y) / d; }
    else if (t >= nextPress) { attack = true; nextPress = t + .45 + rnd() * .35; p.facing = Math.abs(foe.x - p.x) > Math.abs(foe.y - p.y) ? (foe.x > p.x ? "right" : "left") : (foe.y > p.y ? "down" : "up"); }
    const before = new Map(g.enemies.map((e: any) => [e, Math.max(0, e.hp)])), used = { attack: false, dodge: false };
    g.update(dt, { state: { x: mx, y: my }, consume: (k: string) => (k === "attack" && attack && !used.attack && (used.attack = true)) || (k === "dodge" && dodge && !used.dodge && (used.dodge = true)), held: () => false, reset: () => {} }, now);
    now += dt * 1000;
    let lost = 0; for (const [e, hp] of before) lost += Math.max(0, hp - Math.max(0, e.hp));
    // his: each new hit of his live shots (a shot's circles share one hits record), at the damage it lands
    let mine = 0; const live = new Set(); for (const fx of g.effects) if (fx.hatch && !live.has(fx.hits)) { live.add(fx.hits); const n = Object.keys(fx.hits).length, was = seen.get(fx.hits) || 0; if (n > was) { mine += (n - was) * wayfarerDamage(fx.damage); seen.set(fx.hits, n); } }
    for (const k of [...seen.keys()]) if (!live.has(k)) seen.delete(k);
    total += lost; his += Math.min(mine, lost);
  }
  return his / Math.max(1, total - his);
}

// Tim, 2026-11-20: "more powerful versus single targets than groups ... some single-target boss damage" (HATCHLING.young.focus).
const TARGETS: Record<string, [number, number]> = { "early pack": [.065, .095], "mid-game pack": [.065, .095], "affixed elite": [.12, .16], "world beast": [.12, .16] };
test("over real fights he is best against one tough foe: packs about .08 of the Wayfarer's damage, an elite and a world beast about .14", () => {
  assert.equal(HATCHLING.young.dpsShare, .1);
  const means: Record<string, number> = {};
  for (const [name, enc] of Object.entries(ENCOUNTERS)) {
    const r = ["YOUNG-FIGHT-A", "YOUNG-FIGHT-B", "YOUNG-FIGHT-C"].map((seed) => fight(enc, seed)), m = r.reduce((a, b) => a + b) / r.length; means[name] = m;
    const [lo, hi] = TARGETS[name]; assert.ok(m >= lo && m <= hi, `${name}: ${m.toFixed(3)} (${r.map((v) => v.toFixed(3)).join(", ")}), want ${lo} to ${hi}`);
  }
  const packs = Math.max(means["early pack"], means["mid-game pack"]), all = Object.values(means).map((v) => v.toFixed(3)).join(", ");
  assert.ok(means["affixed elite"] > packs && means["world beast"] > packs, `single targets above both packs: ${all}`);
  const avg = Object.values(means).reduce((a, b) => a + b) / 4; assert.ok(avg >= .09 && avg <= .13, `average ${avg.toFixed(3)} (${all})`);
});

test("his hit is split among the foes it catches; a move aimed at an elite or a boss is focused", () => {
  const save = freshSave(); save.seed = "YOUNG-SPLIT";
  const g: any = new Game(save, 0); g.map = flat(); g.builds = []; g.projectiles = []; g.effects = [];
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp: HATCHLING.growth.big, form: "young" }); h.quest.state = "rescued"; h.buffs = {}; g.toggleHatchling();
  const foe = (id: string, x: number, y: number) => { const e: any = createCombatant("rootBrute", x, y); e.id = id; e.hp = e.maxHp = 1e6; return e; };
  const power = g.meleePower(), share = .5, at = (n: number) => { g.enemies = Array.from({ length: n }, (_, i) => foe(`f${i}`, 10 + i * .2, 10)); g.effects = []; h.out.carry = 0; g.hatchHit(10.7, 10.45, 1.2, share); return g.effects[0].damage; };
  assert.equal(at(1), Math.floor(power * share)); assert.equal(at(3), Math.floor(power * share / 3 ** HATCHLING.young.focus.spread));
  assert.equal(hatchFocus(null), 1); assert.equal(hatchFocus(foe("plain", 0, 0)), 1);
  assert.equal(hatchFocus({ affixes: ["a"] }), HATCHLING.young.focus.elite); assert.equal(hatchFocus({ boss: true }), HATCHLING.young.focus.boss); assert.equal(hatchFocus({ worldBeast: "voidWalker" }), HATCHLING.young.focus.boss);
  assert.ok(HATCHLING.young.focus.elite > 1 && HATCHLING.young.focus.boss > 1);
});

test("he picks the elite in reach over a nearer common foe", () => {
  const save = freshSave(); save.seed = "YOUNG-PREFER";
  const g: any = new Game(save, 0); g.map = flat(); g.builds = []; g.projectiles = []; g.effects = [];
  Object.assign(g.player, { x: 15, y: 16 });
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp: HATCHLING.growth.big, form: "young" }); h.quest.state = "rescued"; h.buffs = {}; g.toggleHatchling();
  const near: any = createCombatant("ashenHound", 17, 16); near.id = "near"; const elite: any = createCombatant("rootBrute", 20, 16); elite.id = "elite"; elite.affixes = rollAffixes("YOUNG-PREFER:e", 2);
  g.enemies = [near, elite]; h.out.act = null; h.out.target = "near";
  g.tickHatchYoung(h, h.out, HATCHLING.forms.young, 1 / 30, 1000);
  assert.equal(h.out.target, "elite");
});

test("his hits carry their fractions: small shares land as their true share at low power, never rounded up", () => {
  const save = freshSave(); save.seed = "YOUNG-CARRY";
  const g: any = new Game(save, 0); g.map = flat(); g.enemies = []; g.builds = []; g.projectiles = []; g.effects = [];
  const h = save.mounts.hatchling; Object.assign(h, { owned: true, xp: HATCHLING.growth.big, form: "young" }); h.quest.state = "rescued"; h.buffs = {}; g.toggleHatchling();
  const share = HATCHLING.young.moves.gatling.share, n = 200; let sum = 0;
  for (let i = 0; i < n; i++) { g.effects = []; g.hatchHit(5, 5, .4, share); sum += g.effects[0].damage; }
  assert.ok(Math.abs(sum - g.meleePower() * share * n) <= 1, `${sum} vs ${g.meleePower() * share * n}`);
  assert.ok(h.out.carry >= 0 && h.out.carry < 1);
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
