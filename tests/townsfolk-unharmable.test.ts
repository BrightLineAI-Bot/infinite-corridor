// Tim (2026-11-20): "you can't kill townspeople". Every non-hostile person is unharmable by every source of the Wayfarer's;
// real enemies still take damage; old saves that recorded harm load with everyone restored; no text offers the old system.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, updateProjectiles, updateEffects } from "../src/game.ts";
import { freshSave, migrateSave } from "../src/types.ts";
import { applyInteraction, validActions, currentObjective } from "../src/interactions.ts";
import { unharmablePerson, keepPersonWhole, retiredJournalEntry, ensureTownsfolkPeace, TOWNSFOLK_PEACE } from "../src/townsfolk.ts";
import { updateSkirmisher, skirmishFields, MILITIA } from "../src/skirmishes.ts";
import { serializeSave, deserializeSave } from "../src/persistence.ts";

const idle = () => ({ state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset: () => {} });
// A quiet Refuge section with a hamlet warden of a skirmish beside an ordinary foe, both in reach of the Wayfarer.
function fixture() {
  const g = new Game(freshSave(), 0);
  g.map.tiles.fill({ blocked: false });
  Object.assign(g.player, { x: 10, y: 10 });
  g.player.invulnerableUntil = 1e12;
  const warden = g.createEnemyFromSpawn({ id: "skirmish:test:a:0", kind: "militia", x: 11, y: 10, skirmishId: "skirmish:test", skirmishSide: "a", skirmishFriendly: true, noRewards: true, traits: [] });
  const foe = g.createEnemyFromSpawn({ id: "foe", kind: "ashling", x: 11, y: 10.4, traits: [] });
  g.enemies = [warden, foe];
  g.save.lastAim = { x: 1, y: 0 };
  return { g, warden, foe };
}
const whole = (w) => { assert.equal(w.hp, MILITIA.hp, "no health lost"); assert.equal(w.dead, false, "not dead"); assert.ok(!(w.hitFlash > 0), "no flinch"); assert.ok(!w.aggro && !w.skirmishProvoked, "never turned hostile"); };

test("the predicate covers the residents and the wardens, never a hostile human", () => {
  assert.ok(unharmablePerson({ kind: "npc" }));
  assert.ok(unharmablePerson({ kind: "militia" }));
  assert.ok(unharmablePerson({ kind: "ashling", nonHostilePerson: true }));
  for (const kind of ["ashling", "duelist", "knifeChoir", "nanobotKnight", "gateRevenant", "hollowMarshal"]) assert.equal(unharmablePerson({ kind }), false, kind);
  const { warden } = fixture();
  assert.equal(warden.hp, MILITIA.hp);
  assert.equal(skirmishFields({ kind: "militia", skirmishFriendly: true }).noRewards, true);
});

test("melee, shots, spell pulses and blasts never touch a warden; the ordinary foe beside it takes the blow", () => {
  { const { g, warden, foe } = fixture(); const before = foe.hp; g.primaryAttack(1); g.update(.05, idle(), 400); whole(warden); assert.ok(foe.hp < before, "melee still lands on a foe"); }
  { const { g, warden, foe } = fixture(); const before = foe.hp;
    const shots = [{ id: "shot", x: 10.5, y: 10.45, dx: 1, dy: 0, speed: 20, life: 2, damage: 18, pierce: 3 }];
    updateProjectiles(shots, [warden, foe], g.map, 32, .1); whole(warden); assert.ok(foe.hp < before, "a shot still lands on a foe"); }
  { const { g, warden, foe } = fixture(); const before = foe.hp;
    const fx = [{ id: "ring", kind: "ember-ring", x: 11.5, y: 10.6, life: 3, radius: 1.5, pulse: 1, untilPulse: 0, damage: 18, pulseIndex: 0, hits: {} }];
    updateEffects(fx, [warden, foe], .1); whole(warden); assert.ok(foe.hp < before, "a spell pulse still lands on a foe"); }
  { const { g, warden } = fixture();
    g.projectiles = [{ id: "p", x: 10.5, y: 10.45, dx: 1, dy: 0, speed: 20, life: 2, damage: 18 }];
    g.effects = [{ id: "b", kind: "rift-blast", x: 11.5, y: 10.45, life: .3, radius: 2, untilPulse: 0, pulse: 99, damage: 40, hits: {} }];
    g.update(.1, idle(), 500); whole(warden); }
});

test("direct blows (reflect, tool orrery, staff, arts, glyph bursts, Echo/Rift/companion) are refused or undone at once", () => {
  const { g, warden, foe } = fixture();
  assert.equal(g.reflectBlow(warden, 30, 100), 0, "a reflect");
  assert.equal(g.orreryStrike(warden, 30, 100, true), 0, "the Aether Orrery");
  whole(warden);
  // A path that hurts any foe it is handed (glyph bursts, an Echo, a Rift void, a companion): undone before anyone acts on it.
  g.glyphWorld(100).damage(warden, 25); warden.hitFlash = .18; warden.aggro = true;
  g.update(.05, idle(), 200); whole(warden);
  // A lethal one: the kill is refused and the warden stands, with no reward and no kill-heal.
  warden.hp = -5; warden.dead = true; const xp = g.save.xp; g.defeatEnemy(warden); whole(warden); assert.equal(g.save.xp, xp);
  assert.equal(warden.rewarded, false);
  const before = foe.hp; g.glyphWorld(100).damage(foe, 25); g.update(.05, idle(), 300); assert.ok(foe.hp < before, "a foe keeps its wound");
});

test("a warden never turns on the Wayfarer, but the battle's creatures can still wound and kill it", () => {
  const { g, warden } = fixture(), watcher = g.createEnemyFromSpawn({ id: "skirmish:test:b:0", kind: "voidSentinel", x: 11.4, y: 10, skirmishId: "skirmish:test", skirmishSide: "b", traits: [] });
  const units = [warden, watcher];
  updateSkirmisher(warden, units, g.map, .016); // its first tick learns its health
  warden.hp -= 10; // a blow the battle did not deal: the Wayfarer's
  updateSkirmisher(warden, units, g.map, .016);
  whole(warden);
  // The watcher's own blows are real: a warden it wounds keeps the wound, and one it kills stays fallen.
  for (let i = 0; i < 400 && !warden.dead; i++) { watcher.skirmishCd = 0; updateSkirmisher(watcher, units, g.map, .1); }
  assert.equal(warden.dead, true, "the creatures can still kill a warden");
  keepPersonWhole(warden); g.defeatEnemy(warden);
  assert.equal(warden.dead, true, "the battle's kill is not undone");
});

test("residents offer no harm: no attack, no stand down, every shop open, the objective unchanged", () => {
  const s = freshSave(), g = new Game(s, 0);
  for (const o of g.map.objects.filter((q) => q.kind === "npc")) {
    assert.ok(!validActions(o, s).includes("attack") && !validActions(o, s).includes("standDown"), o.id);
    assert.equal(applyInteraction(o, "attack", s).ok, false);
    assert.equal(applyInteraction(o, "standDown", s).ok, false);
  }
  for (const id of ["vendor-iona", "resident-tarn", "vendor-mora", "resident-esh"]) assert.equal(applyInteraction({ id, kind: "npc", actions: ["speak", "trade", "attack", "standDown"], settlement: "glasshaven" }, "attack", s).ok, false);
  assert.match(currentObjective(s), /question Vela/);
  assert.ok(Object.values(s.consequences.npcs).every((n) => n.hp === 36 && n.status === "alive" && n.disposition === "neutral"));
});

// An old journey that harmed townsfolk: every resident dead, a waystation trader hostile and wounded, the Refuge fallen with its
// thread closed, reputation lost, journal deaths, codex "Recorded dead.", a warden the Wayfarer struck and felled, plus an
// unknown field and progress that must survive.
function harmedSave() {
  const s = freshSave();
  for (const id of ["vendor-vela", "warden-oren", "keeper-sela"]) { Object.assign(s.consequences.npcs[id], { hp: 0, status: "dead", disposition: "hostile", deathCause: "attack", playerCaused: true, intent: "deliberate", futureNote: "kept" }); s.worldFlags[id + ":dead"] = true; }
  Object.assign(s.consequences.npcs["vendor-iona"], { hp: 9, disposition: "hostile" });
  Object.assign(s.consequences.npcs["resident-tarn"], { hp: 18, disposition: "spared" });
  s.consequences.settlements["ember-refuge"] = { status: "fallen", reputation: -3, mystery: 7 };
  s.consequences.settlements.glasshaven.reputation = -1;
  s.consequences.threads["ember-refuge"] = { status: "resolved", ending: "fallen" };
  s.consequences.choices.relay = "sever";
  s.narrative.journal.push({ recordId: "death:vendor-vela", title: "Consequences", text: "Vela Quen died by your hand. Their absence persists in ember-refuge." }, { recordId: "refuge-fallen", title: "Consequences", text: "With its last resident gone, Ember Refuge fell." }, { recordId: "spared:resident-tarn", title: "Consequences", text: "You stood down and spared Tarn Coil." }, { recordId: "kept-entry", title: "Elsewhere", text: "Still here." });
  s.codex.peoplePlaces = { "vendor-vela": { id: "vendor-vela", type: "person", facts: ["Recorded dead."], outcome: "dead" }, "ember-refuge": { id: "ember-refuge", type: "settlement", facts: [], outcome: "fallen" } };
  s.session.areas["overworld:4:0:g1"] = { enemies: [{ id: "skirmish:v1:4,0:a:0", kind: "militia", dead: true, rewarded: true, hp: -2, maxHp: 40, x: 9, y: 9, skirmishId: "skirmish:v1:4,0", skirmishFriendly: true, skirmishProvoked: true, noRewards: true }, { id: "skirmish:v1:4,0:a:1", kind: "militia", dead: true, rewarded: true, hp: 0, maxHp: 40, x: 10, y: 9, skirmishId: "skirmish:v1:4,0", skirmishFriendly: true, noRewards: true }, { id: "skirmish:v1:4,0:a:2", kind: "militia", hp: 30, maxHp: 40, x: 11, y: 9, skirmishId: "skirmish:v1:4,0", skirmishFriendly: true, skirmishProvoked: true, aggro: true, ai: {} }] };
  s.currency = 321; s.inventory.push({ id: "kept-blade", name: "Kept Blade", slot: "primary", power: 3 }); s.consumables.restorativeDraught = 4;
  s.someFutureField = { keep: true };
  return s;
}

test("an old save with killed, hostile and wounded townsfolk loads with all of them restored and nothing lost", () => {
  const raw = JSON.parse(JSON.stringify(harmedSave())), s = migrateSave(raw);
  for (const id of Object.keys(s.consequences.npcs)) assert.deepEqual([s.consequences.npcs[id].hp, s.consequences.npcs[id].status, s.consequences.npcs[id].disposition], [36, "alive", "neutral"], id);
  assert.deepEqual(s.consequences.npcs["vendor-vela"].retired, { since: TOWNSFOLK_PEACE, hp: 0, status: "dead", disposition: "hostile", deadFlag: true });
  assert.equal(s.consequences.npcs["vendor-vela"].futureNote, "kept", "unknown fields survive");
  assert.equal(s.worldFlags["vendor-vela:dead"], true, "the old flag stays in place, unhonoured");
  assert.deepEqual(s.consequences.npcs["vendor-iona"].retired, { since: TOWNSFOLK_PEACE, hp: 9, status: "alive", disposition: "hostile" });
  const refuge = s.consequences.settlements["ember-refuge"];
  assert.equal(refuge.status, "standing"); assert.equal(refuge.reputation, 0); assert.equal(refuge.mystery, 7);
  assert.deepEqual(refuge.retired, { since: TOWNSFOLK_PEACE, status: "fallen", reputation: -3 });
  assert.equal(s.consequences.settlements.glasshaven.reputation, 0);
  assert.equal(s.consequences.threads["ember-refuge"].status, "open");
  assert.deepEqual(s.consequences.threads["ember-refuge"].retired, { since: TOWNSFOLK_PEACE, status: "resolved", ending: "fallen" });
  assert.equal(s.consequences.choices.relay, "sever", "a story choice is kept");
  assert.equal(s.consequences.threads["missing-crossing"].ending, "sever");
  assert.equal(s.narrative.journal.length, raw.narrative.journal.length, "no journal entry is deleted");
  assert.deepEqual(s.narrative.journal.filter((j) => !retiredJournalEntry(j)).map((j) => j.recordId), raw.narrative.journal.filter((j) => !/^(death:|spared:|refuge-fallen)/.test(j.recordId)).map((j) => j.recordId));
  assert.deepEqual(s.codex.peoplePlaces["vendor-vela"].facts, ["Encountered alive."]); assert.equal(s.codex.peoplePlaces["vendor-vela"].outcome, "alive");
  assert.equal(s.codex.peoplePlaces["ember-refuge"].outcome, "standing");
  const [struck, battleDead, angry] = s.session.areas["overworld:4:0:g1"].enemies;
  assert.equal(struck.dead, false, "a warden the Wayfarer felled stands again"); assert.equal(struck.hp, 40); assert.equal(struck.skirmishProvoked, false);
  assert.equal(battleDead.dead, true, "a warden the creatures killed (never provoked) stays fallen");
  assert.equal(angry.skirmishProvoked, false); assert.equal(angry.aggro, false); assert.equal(angry.hp, 30);
  assert.equal(s.currency, 321); assert.ok(s.inventory.some((i) => i.id === "kept-blade")); assert.equal(s.consumables.restorativeDraught, 4);
  assert.deepEqual(s.someFutureField, { keep: true });
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).consequences, s.consequences, "idempotent");
  assert.deepEqual(ensureTownsfolkPeace(structuredClone(s)).consequences, s.consequences);
});

test("the restored journey plays as if no one was ever harmed: residents stand, no occupation, shops and sanctuary open", async () => {
  const { buyFromVela, buyFromVendor, settlementSanctuary } = await import("../src/game.ts");
  const s = migrateSave(JSON.parse(JSON.stringify(harmedSave()))), g = new Game(s, 0);
  const people = g.map.objects.filter((o) => o.kind === "npc");
  assert.equal(people.length, 3); assert.ok(people.every((o) => !o.dead && o.hp === 36));
  assert.equal(g.enemies.filter((e) => String(e.id).startsWith("occupation-")).length, 0);
  const fresh = new Game(freshSave(), 0), refugeTiles = (m) => m.tiles.filter((t) => t.kind === "refuge").length;
  assert.equal(refugeTiles(g.map), refugeTiles(fresh.map), "the Refuge's ground is not turned to ash");
  assert.equal(settlementSanctuary(g.map, 0, 0, s).radius, 9);
  assert.equal(buyFromVela(s, "restorativeDraught").ok, true);
  assert.equal(buyFromVendor(s, "vendor-iona", "restorativeDraught").ok, true);
  assert.match(currentObjective(s), /Relay severed/);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(5))), 50);
  assert.ok(r.map.objects.filter((o) => o.kind === "npc").every((o) => !o.dead));
});

test("no text offers or records killing townsfolk any more", () => {
  const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
  const main = src("main.ts"), inter = src("interactions.ts"), readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  for (const phrase of ["Repeated strikes can kill", "Harm and death persist", "Stand down / Spare", "Keep weapon lowered", "· reputation ", "Ember Refuge · FALLEN"]) assert.ok(!main.includes(phrase), phrase);
  for (const phrase of ["by your hand", "Ember Refuge fell", "You stood down", "Lose all three of us", "even if we do not", "is wounded. You can stand down"]) assert.ok(!inter.includes(phrase), phrase);
  for (const phrase of ["a second strike can kill", "not invulnerable", "Stand down spares", "refuge permanently falls", "Reputation records local deaths"]) assert.ok(!readme.includes(phrase), phrase);
  assert.match(readme, /cannot be harmed/);
  assert.equal(retiredJournalEntry({ recordId: "death:vendor-vela" }), true);
  assert.equal(retiredJournalEntry({ recordId: "deathless-thing" }), false);
});
