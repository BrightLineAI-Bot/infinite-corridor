import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  generateRegion,
  generateDungeon,
  dungeonId,
  sectionExits,
  sectionSummary,
  regionalThreat,
  perceptionOverlay,
  apertureTier,
  perceived,
  wayfindingCues,
} from "../src/world.ts";
import { freshSave, migrateSave } from "../src/types.ts";
import { serializeSave, deserializeSave } from "../src/persistence.ts";
import { dodge } from "../src/combat.ts";
import { generateItem, isValidItem, SPELLS } from "../src/items.ts";
import {
  Game,
  moveAxis,
  updateEnemyAI,
  attackInRange,
  enemyDangerRadius,
  selectMeleeAim,
  updateTraps,
  actionReadiness,
  settleProgression,
  awardExperience,
  characterStats,
  syncCharacterStats,
} from "../src/game.ts";
import { rng, pick } from "../src/random.ts";
import {
  normalizeVector,
  shapeStick,
  smoothAxis,
  dragVector,
} from "../src/input.ts";
import {
  CONTENT_PACK,
  validateContentPack,
  applyNarrative,
  applyInteraction,
  validActions,
  selectRecordVariant,
  preconditionsMet,
  currentObjective,
  recordNpcDamage,
  commitRelay,
  dungeonHistory,
  abandonDungeon,
  resolveThread,
  gainAperture,
} from "../src/interactions.ts";
const idle = () => ({ state: { x: 0, y: 0 }, consume: () => false });
test("regional threat is symmetric and leaves origin unchanged", () => {
  assert.deepEqual(regionalThreat(0, 0), {
    ring: 0,
    hpMultiplier: 1,
    damageMultiplier: 1,
    xpMultiplier: 1,
  });
  assert.deepEqual(regionalThreat(3, 4), regionalThreat(-3, -4));
  assert.ok(regionalThreat(3, 4).hpMultiplier > 1);
});
test("Aperture overlay is deterministic independent and threshold gated", () => {
  const base = generateDungeon("s", "dungeon:s:g1"),
    a = perceptionOverlay("s", "dungeon:s:g1", base.tiles),
    b = perceptionOverlay("s", "dungeon:s:g1", base.tiles);
  assert.deepEqual(a, b);
  assert.equal(
    base.objects.some((o) => o.kind === "apertureDoor"),
    false,
  );
  const s = migrateSave(freshSave()),
    door = a.objects.find((o) => o.kind === "apertureDoor");
  assert.equal(perceived(door, s), false);
  s.perception.aperture = 18;
  s.session.activeDungeonId = "dungeon:s:g1";
  s.consequences.dungeons[s.session.activeDungeonId] = { resolved: true };
  assert.equal(perceived(door, s), true);
  assert.equal(apertureTier(18), 2);
});
test("completed dungeons reveal a persistent annex and return to the parent", () => {
  const s = freshSave(),
    g = new Game(s, 0),
    gate = g.map.objects.find((o) => o.kind === "dungeon");
  Object.assign(g.player, { x: gate.x, y: gate.y });
  g.interact("enter", gate.id);
  const parent = g.areaId();
  s.perception.aperture = 18;
  dungeonHistory(s, parent).resolved = true;
  g.loadArea("dungeon", false);
  const door = g.map.objects.find((o) => o.kind === "apertureDoor");
  assert.ok(door && perceived(door, s));
  Object.assign(g.player, { x: door.x, y: door.y });
  g.interact("enter", door.id);
  assert.match(g.areaId(), /aperture-annex$/);
  const exit = g.map.objects.find((o) => o.kind === "exit");
  Object.assign(g.player, { x: exit.x, y: exit.y });
  g.interact("exit", exit.id);
  assert.equal(g.areaId(), parent);
});
test("Aperture gains deduplicate and idle time never replaces exploration", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  assert.equal(gainAperture(s, 2, "quest:x"), 2);
  assert.equal(gainAperture(s, 2, "quest:x"), 0);
  assert.equal(s.perception.aperture, 2);
  g.update(600, idle(), 1);
  assert.equal(s.perception.aperture, 2);
  g.setPaused(true, 2);
  g.update(600, idle(), 122);
  assert.equal(s.perception.aperture, 2);
  g.setPaused(false, 123);
  g.update(600, idle(), 724);
  assert.equal(s.perception.aperture, 2);
});
test("fresh outward encounters scale once and exact snapshots win on revisit", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  g.transitionSection(3, 4);
  const e = g.enemies[0],
    scaled = e.maxHp;
  assert.equal(e.threatRing, 5);
  e.hp = 2;
  g.snapshotArea();
  g.loadArea("overworld", false);
  assert.equal(g.enemies[0].hp, 2);
  assert.equal(g.enemies[0].maxHp, scaled);
});
test("regions and dungeons are deterministic", () => {
  assert.deepEqual(generateRegion("s", -7, 9), generateRegion("s", -7, 9));
  assert.deepEqual(generateDungeon("s"), generateDungeon("s"));
});
test("neighbor passages match and are three tiles wide", () => {
  for (let x = -3; x < 4; x++)
    for (let y = -3; y < 4; y++) {
      const a = sectionExits("s", x, y);
      assert.equal(a.east, sectionExits("s", x + 1, y).west);
      assert.equal(a.south, sectionExits("s", x, y + 1).north);
      const r = generateRegion("s", x, y);
      for (let d = -1; d <= 1; d++)
        assert.equal(r.tiles[a.north + d].blocked, false);
    }
});
test("movement transition supports negative coordinates without row wrap", () => {
  const g = new Game(freshSave(), 0);
  g.player.x = 0.01;
  g.player.y = g.map.exits.west;
  g.update(0.1, { state: { x: -1, y: 0 }, consume: () => false }, 10);
  assert.deepEqual([g.rx, g.ry, g.player.x], [-1, 0, 30.75]);
  g.player.y = 0.01;
  g.player.x = g.map.exits.north;
  g.update(0.1, { state: { x: 0, y: -1 }, consume: () => false }, 20);
  assert.deepEqual([g.rx, g.ry], [-1, -1]);
});
test("ordinary movement crosses and returns through every section edge", () => {
  for (const [dx, dy, edge, axis] of [
    [1, 0, "east", "y"],
    [-1, 0, "west", "y"],
    [0, 1, "south", "x"],
    [0, -1, "north", "x"],
  ]) {
    const g = new Game(freshSave(), 0), input = { state: { x: dx, y: dy }, consume: () => false };
    g.player[axis] = g.map.exits[edge];
    if (dx) g.player.x = dx > 0 ? 30.5 : 0.5;
    if (dy) g.player.y = dy > 0 ? 30.5 : 0.5;
    for (let i = 0; i < 180 && g.rx === 0 && g.ry === 0; i++) g.update(1 / 60, input, i * 17);
    assert.deepEqual([g.rx, g.ry], [dx, dy], `failed ${edge} crossing`);
    input.state = { x: -dx, y: -dy };
    for (let i = 0; i < 180 && (g.rx !== 0 || g.ry !== 0); i++) g.update(1 / 60, input, 4000 + i * 17);
    assert.deepEqual([g.rx, g.ry], [0, 0], `failed ${edge} return`);
  }
});
test("wayfinding cues are deterministic and point toward real destinations", () => {
  const s = freshSave(), map = generateRegion(s.seed, 2, 0, s.worldGeneration),
    a = wayfindingCues(s.seed, 2, 0, s.worldGeneration, s, map),
    b = wayfindingCues(s.seed, 2, 0, s.worldGeneration, s, map),
    home = a.find((q) => q.signalKind === "beacon");
  assert.deepEqual(a, b);
  assert.ok(home);
  assert.equal(home.dirX, -1);
  assert.equal(map.tiles[home.y * 32 + home.x].blocked, false);
});
test("section encounter snapshots are independent and exact", () => {
  const g = new Game(freshSave(), 0);
  g.enemies[0].hp = 2;
  g.transitionSection(1, 0);
  g.enemies[0].dead = true;
  g.transitionSection(-1, 0);
  assert.equal(g.enemies[0].hp, 2);
  assert.equal(g.enemies[0].dead, false);
  g.transitionSection(1, 0);
  assert.equal(g.enemies[0].dead, true);
});
test("schema migrations preserve location and select legacy generation zero", () => {
  const s = migrateSave({
    version: 2,
    seed: "old",
    position: { area: "overworld", x: 4, y: 7 },
    session: {
      area: "overworld",
      x: 4,
      y: 7,
      playerRuntime: { hp: 22 },
      areas: {
        "overworld:0:0": { legacy: true },
        "dungeon:old": { dungeon: true },
      },
    },
    explored: {},
  });
  assert.equal(s.version, 9);
  assert.equal(s.worldGeneration, 0);
  assert.deepEqual(
    [s.session.rx, s.session.ry, s.session.x, s.session.y],
    [0, 0, 4, 7],
  );
  assert.equal(s.session.areas["overworld:0:0:g0"].legacy, true);
  assert.equal(s.session.areas["dungeon:old:g0"].dungeon, true);
});
test("save roundtrip preserves stats equipment and waypoint", () => {
  const s = freshSave();
  s.stats.Might = 4;
  s.equipment.primary.power = 9;
  s.waypoint = { rx: -2, ry: 5 };
  const r = deserializeSave(serializeSave(s));
  assert.deepEqual(
    [r.stats.Might, r.equipment.primary.power, r.waypoint.rx],
    [4, 9, -2],
  );
});
test("dungeon exit returns to exact entrance section and position", () => {
  const g = new Game(freshSave(), 0);
  g.rx = -2;
  g.ry = 3;
  g.player.x = 5;
  g.player.y = 5;
  g.interact("enter");
  assert.equal(g.area, "dungeon");
  const exit = g.map.objects.find((o) => o.kind === "exit");
  g.player.x = exit.x;
  g.player.y = exit.y;
  g.interact("exit");
  assert.deepEqual(
    [g.area, g.rx, g.ry, g.player.x, g.player.y],
    ["overworld", -2, 3, 5, 5],
  );
});
test("pause freezes simulation and action deadlines", () => {
  const g = new Game(freshSave(), 100);
  g.player.dodgeReadyAt = 600;
  g.setPaused(true, 200);
  const before = structuredClone(g.enemies);
  g.update(10, { state: { x: 1, y: 1 }, consume: () => false }, 5000);
  g.setPaused(false, 5200);
  assert.deepEqual(g.enemies, before);
  assert.equal(g.player.dodgeReadyAt, 5600);
});
test("exact resume retains section player and enemy state", () => {
  const g = new Game(freshSave(), 100);
  g.transitionSection(-1, 2);
  g.player.x = 12.5;
  g.player.y = 8.25;
  g.enemies[0].hp = 3;
  const r = new Game(
    deserializeSave(serializeSave(g.exportSnapshot(200))),
    900,
  );
  assert.deepEqual(
    [r.rx, r.ry, r.player.x, r.player.y, r.enemies[0].hp],
    [-1, 2, 12.5, 8.25, 3],
  );
});
test("death alone returns to active checkpoint", () => {
  const s = freshSave();
  s.activeCheckpoint = { rx: -4, ry: 6, x: 14, y: 12, name: "Beacon" };
  const g = new Game(s, 0);
  g.rx = 2;
  g.ry = 2;
  g.loadArea("overworld");
  g.player.hp = 0;
  g.update(0, idle(), 1);
  assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [-4, 6, 14, 12]);
  assert.equal(s.worldFlags.deaths, 1);
});
test("item generation remains table-valid", () => {
  for (let i = 0; i < 80; i++)
    assert.equal(isValidItem(generateItem(`i${i}`, 2)), true);
});
test("atlas exploration set remains bounded to visited sections", () => {
  const g = new Game(freshSave(), 0);
  for (let i = 0; i < 5; i++) g.transitionSection(1, 0);
  assert.equal(Object.keys(g.save.explored).length, 6);
  assert.equal(g.save.explored["5,0"], true);
  assert.equal(g.save.explored["6,0"], undefined);
});
test("paused snapshot deadlines do not age with wall clock", () => {
  const g = new Game(freshSave(), 100);
  g.player.dodgeReadyAt = 700;
  g.setPaused(true, 200);
  g.exportSnapshot(50000);
  assert.equal(g.save.session.playerRuntime.dodgeCooldown, 500);
});
test("generation zero origin exactly matches the former tile algorithm", () => {
  const seed = "legacy-proof",
    r = rng(`${seed}:region:0:0`),
    expected = [];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const edge = r(),
        kind = edge < 0.16 ? "blocked" : pick(r, ["ash", "glass", "ember"]);
      expected.push({ x, y, kind, blocked: kind === "blocked" });
    }
  for (let y = 13; y < 20; y++)
    for (let x = 13; x < 20; x++)
      expected[y * 32 + x] = { x, y, kind: "refuge", blocked: false };
  assert.deepEqual(generateRegion(seed, 0, 0, 0).tiles, expected);
  assert.equal(generateRegion(seed, 0, 0, 0).objects[0].id, "tree-1");
});
test("structured sections use coherent ruins and every spawn or landmark is reachable", () => {
  for (const [rx, ry] of [
    [0, 0],
    [4, -3],
    [-8, 2],
  ]) {
    const r = generateRegion("paths", rx, ry, 1);
    assert.ok(r.ruinCount >= 2 && r.ruinCount <= 3);
    const seen = new Set(["16,16"]),
      q = [[16, 16]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const a = x + dx,
          b = y + dy,
          k = `${a},${b}`;
        if (
          a >= 0 &&
          a < 32 &&
          b >= 0 &&
          b < 32 &&
          !seen.has(k) &&
          !r.tiles[b * 32 + a].blocked
        ) {
          seen.add(k);
          q.push([a, b]);
        }
      }
    }
    for (const e of [...r.objects, ...r.enemySpawns]) {
      assert.equal(r.tiles[e.y * 32 + e.x].blocked, false);
      assert.ok(
        seen.has(`${e.x},${e.y}`),
        `${e.kind} unreachable at ${rx},${ry}`,
      );
    }
  }
});
test("atlas section summary reports detail flags", () => {
  const s = freshSave();
  s.session.rx = 2;
  s.session.ry = -1;
  s.explored["2,-1"] = true;
  s.checkpoints["2,-1"] = {};
  s.waypoint = { rx: 2, ry: -1 };
  const d = sectionSummary(s.seed, 2, -1, s.worldGeneration, s);
  assert.deepEqual(
    [d.rx, d.ry, d.checkpoint, d.current, d.waypoint],
    [2, -1, true, true, true],
  );
  assert.ok(d.terrain && d.landmark);
});
test("input math normalizes diagonals, shapes dead zone, and smooths", () => {
  const n = normalizeVector(1, 1);
  assert.ok(Math.abs(Math.hypot(n.x, n.y) - 1) < 1e-9);
  assert.deepEqual(shapeStick(0.05, 0.05), { x: 0, y: 0 });
  assert.ok(shapeStick(0.8, 0).x > 0.4);
  assert.ok(smoothAxis(0, 1, 0.1) > 0 && smoothAxis(0, 1, 0.1) < 1);
});
test("sprite-footprint movement slides along walls without visual overlap or tunneling", () => {
  const map = {
      tiles: Array.from({ length: 25 }, (_, i) => ({ blocked: i % 5 === 2 })),
    },
    e = { x: 1, y: 1 };
  moveAxis(e, 1, 0.4, map, 5);
  assert.ok(e.x <= 1.24, "right foot must stop at the wall face");
  assert.ok(e.y > 1.3, "free axis should continue sliding");
  const before = e.x;
  moveAxis(e, 3, 0, map, 5);
  assert.equal(
    e.x,
    before,
    "large dodge step must not tunnel through the wall",
  );
});
test("enemy patrol moves but never enters blocked tiles", () => {
  const map = {
      tiles: Array.from({ length: 25 }, (_, i) => ({ blocked: i % 5 === 4 })),
    },
    e = {
      id: "ashling-a",
      kind: "ashling",
      x: 2,
      y: 2,
      cooldown: 0,
      telegraph: 0,
      range: 0,
    };
  const p = { x: 20, y: 20 };
  for (let i = 0; i < 30; i++) updateEnemyAI(e, p, map, 5, 0.1, i * 100);
  assert.ok(Math.hypot(e.x - 2, e.y - 2) > 0);
  assert.equal(map.tiles[Math.floor(e.y) * 5 + Math.floor(e.x)].blocked, false);
});
test("enemy impact rechecks range after telegraph", () => {
  const map = {
      tiles: Array.from({ length: 100 }, () => ({ blocked: false })),
    },
    e = {
      id: "warden",
      kind: "sparkWarden",
      x: 2,
      y: 2,
      cooldown: 0,
      telegraph: 0.01,
      range: 3,
    },
    p = { x: 2, y: 2 };
  p.x = 9;
  assert.equal(updateEnemyAI(e, p, map, 10, 0.02, 100), false);
  assert.equal(attackInRange(e, p), false);
});
test("narrative pack validates, selection is deterministic, and effects are one-time", () => {
  assert.equal(validateContentPack(CONTENT_PACK), true);
  const s = freshSave(),
    o = { id: "shrine-1", kind: "shrine" };
  const r = CONTENT_PACK.records[0];
  assert.equal(
    selectRecordVariant(r, "one", s),
    selectRecordVariant(r, "one", s),
  );
  const a = applyNarrative(o, "inspect", s, "shrine-1:inspect"),
    hp = s.hp,
    journal = s.narrative.journal.length,
    b = applyNarrative(o, "inspect", s, "shrine-1:inspect");
  assert.equal(a.ok, true);
  assert.equal(b.duplicate, true);
  assert.equal(s.hp, hp);
  assert.equal(s.narrative.journal.length, journal);
  assert.equal(s.narrative.facts["array.heard"], true);
});
test("v3 migration creates valid narrative state without losing progress", () => {
  const s = migrateSave({
    ...freshSave(),
    version: 3,
    narrative: undefined,
    xp: 44,
  });
  assert.equal(s.version, 9);
  assert.equal(s.xp, 44);
  assert.ok(Array.isArray(s.narrative.journal));
  assert.equal(s.narrative.schema, "infinite-corridor-narrative/1.0.0");
});
test("narrative preconditions are explicit and deterministic", () => {
  const s = freshSave(),
    r = { when: { fact: "gate.ready", equals: true } };
  assert.equal(preconditionsMet(r, s), false);
  s.narrative.facts["gate.ready"] = true;
  assert.equal(preconditionsMet(r, s), true);
  assert.equal(
    preconditionsMet({ when: { factAbsent: "gate.ready" } }, s),
    false,
  );
});
test("Vela remains interactable after speech while narrative effects dedupe globally", () => {
  const s = freshSave(),
    vela = generateRegion(s.seed, 0, 0, 1).objects.find(
      (o) => o.id === "vendor-vela",
    );
  const first = applyInteraction(vela, "speak", s, "overworld:0:0:g1"),
    journal = s.narrative.journal.length,
    second = applyInteraction(vela, "speak", s, "overworld:0:0:g1");
  assert.equal(first.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(vela.state, "calm");
  assert.deepEqual(validActions(vela, s), ["speak", "trade", "attack"]);
  assert.equal(s.narrative.journal.length, journal);
  applyInteraction(vela, "speak", s, "overworld:1:0:g1");
  assert.equal(s.narrative.journal.length, journal);
});
test("stick shaping caps extreme cardinal and diagonal input", () => {
  for (const [x, y] of [
    [5, 0],
    [3, 4],
    [5, 5],
  ]) {
    const v = shapeStick(x, y);
    assert.ok(Math.hypot(v.x, v.y) <= 1 + 1e-12);
    assert.ok(Math.abs(v.x * y - v.y * x) < 1e-9);
  }
});
test("game defensively caps movement input and uses deliberate pacing", () => {
  const g = new Game(freshSave(), 0),
    x = g.player.x,
    y = g.player.y;
  g.map.tiles.fill({ blocked: false });
  g.update(1, { state: { x: 5, y: 0 }, consume: () => false }, 1);
  assert.ok(Math.abs(g.player.x - x - 2.4) < 1e-9);
  assert.equal(g.player.y, y);
  g.player.dodgeUntil = 1000;
  g.player.dodgeX = 1;
  g.player.dodgeY = 0;
  const before = g.player.x;
  g.update(0.5, { state: { x: 1, y: 0 }, consume: () => false }, 10);
  assert.ok(Math.abs(g.player.x - before - 2.4) < 1e-9);
});
test("enemy telegraph impacts once then respects recovery", () => {
  const map = {
      tiles: Array.from({ length: 100 }, () => ({ blocked: false })),
    },
    e = {
      id: "ash",
      kind: "ashling",
      x: 2,
      y: 2,
      cooldown: 0,
      telegraph: 0.01,
      range: 0,
    },
    p = { x: 2.5, y: 2 };
  assert.equal(updateEnemyAI(e, p, map, 10, 0.02, 10), true);
  assert.equal(e.telegraph, 0);
  assert.equal(e.cooldown, 1.9);
  for (let i = 0; i < 10; i++)
    assert.equal(updateEnemyAI(e, p, map, 10, 0.1, 20 + i), false);
});
test("legacy negative telegraph normalizes and wall rejects impact", () => {
  const map = { tiles: Array.from({ length: 25 }, () => ({ blocked: false })) },
    e = {
      id: "legacy",
      kind: "sparkWarden",
      x: 1.2,
      y: 2.2,
      cooldown: 0,
      telegraph: -4,
      range: 5,
    },
    p = { x: 3.2, y: 2.2 };
  map.tiles[2 * 5 + 2].blocked = true;
  updateEnemyAI(e, p, map, 5, 0, 0);
  assert.equal(e.telegraph, 0);
  e.telegraph = 0.01;
  assert.equal(updateEnemyAI(e, p, map, 5, 0.02, 10), false);
  assert.equal(e.telegraph, 0);
});
test("post-hit immunity prevents simultaneous burst and death grants protection", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  g.map.tiles.fill({ blocked: false });
  g.enemies = [0, 1].map((i) => ({
    id: "e" + i,
    kind: "ashling",
    x: g.player.x + 0.2,
    y: g.player.y,
    hp: 1,
    maxHp: 1,
    damage: 5,
    range: 0,
    cooldown: 0,
    telegraph: 0.01,
    dead: false,
    ai: { homeX: g.player.x, homeY: g.player.y, phase: 0 },
  }));
  const hp = g.player.hp;
  g.update(0.02, idle(), 100);
  assert.equal(g.player.hp, hp - 5);
  g.player.hp = 0;
  let reset = false;
  g.update(
    0,
    {
      state: { x: 1, y: 1 },
      consume: () => false,
      reset: () => {
        reset = true;
      },
    },
    200,
  );
  assert.equal(reset, true);
  assert.equal(g.player.invulnerableUntil, 2200);
  assert.match(g.message, /Felled — recovered at .*protected briefly/);
});
test("v4 migration adds consumables without losing progress", () => {
  const old = freshSave();
  old.version = 4;
  old.xp = 77;
  delete old.consumables;
  const s = migrateSave(old);
  assert.equal(s.version, 9);
  assert.equal(s.xp, 77);
  assert.deepEqual(s.consumables, {
    restorativeDraught: 3,
    ironbarkTonic: 1,
    lumenPhial: 1,
    crossingSigil: 0,
  });
});
test("draught heals without waste and tonic persists remaining guard", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  assert.equal(g.useConsumable("restorativeDraught"), false);
  assert.equal(s.consumables.restorativeDraught, 3);
  g.player.hp = 20;
  assert.equal(g.useConsumable("restorativeDraught"), true);
  assert.deepEqual([g.player.hp, s.consumables.restorativeDraught], [50, 2]);
  assert.equal(g.useConsumable("ironbarkTonic"), true);
  g.update(5, idle(), 10);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(10))), 100);
  assert.equal(r.guardRemaining, 40);
});
test("stationary dodge uses movement memory and moves immediately", () => {
  const g = new Game(freshSave(), 0);
  g.map.tiles.fill({ blocked: false });
  g.player.facing = "left";
  g.player.lastMoveVector = { x: 1, y: 0 };
  const x = g.player.x;
  let used = false;
  g.update(
    0.1,
    {
      state: { x: 0, y: 0 },
      consume: (k) => k === "dodge" && !used && (used = true),
    },
    10,
  );
  assert.ok(g.player.x > x);
  assert.equal(g.player.dodgeX, 1);
});
test("jump ignores melee impact but spark ranged impact lands", () => {
  const make = (kind) => {
    const g = new Game(freshSave(), 0);
    g.map.tiles.fill({ blocked: false });
    g.enemies = [
      {
        id: kind,
        kind,
        x: g.player.x + 0.1,
        y: g.player.y,
        hp: 10,
        maxHp: 10,
        damage: 10,
        range: kind === "sparkWarden" ? 5 : 0,
        cooldown: 0,
        telegraph: 0.01,
        dead: false,
        ai: { homeX: g.player.x, homeY: g.player.y, phase: 0 },
      },
    ];
    g.jumpUntil = 1000;
    return g;
  };
  const melee = make("ashling"),
    hp = melee.player.hp;
  melee.update(0.02, idle(), 100);
  assert.equal(melee.player.hp, hp);
  const ranged = make("sparkWarden");
  ranged.update(0.02, idle(), 100);
  assert.equal(ranged.player.hp, hp - 10);
});
test("guard reduces damage then expires", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  g.map.tiles.fill({ blocked: false });
  g.guardRemaining = 1;
  g.enemies = [
    {
      id: "e",
      kind: "ashling",
      x: g.player.x + 0.1,
      y: g.player.y,
      hp: 10,
      maxHp: 10,
      damage: 10,
      range: 0,
      cooldown: 0,
      telegraph: 0.01,
      dead: false,
      ai: { homeX: g.player.x, homeY: g.player.y, phase: 0 },
    },
  ];
  g.update(0.02, idle(), 10);
  assert.equal(g.player.hp, 53);
  g.player.invulnerableUntil = 0;
  g.enemies[0].telegraph = 0.01;
  g.update(1.1, idle(), 2000);
  assert.equal(g.player.hp, 43);
});
test("enemy strike is persisted as remaining-time state", () => {
  const g = new Game(freshSave(), 0),
    e = g.enemies[0];
  e.strike = 0.2;
  const restored = new Game(
    deserializeSave(serializeSave(g.exportSnapshot(10))),
    999,
  );
  assert.equal(restored.enemies[0].strike, 0.2);
});
test("player attack animation remains relative across pause and reload", () => {
  const g = new Game(freshSave(), 100);
  g.player.attackUntil = 340;
  g.setPaused(true, 200);
  assert.equal(g.exportSnapshot(9999).session.playerRuntime.attackMotion, 140);
  g.setPaused(false, 1200);
  assert.equal(g.player.attackUntil, 1340);
  const restored = new Game(
    deserializeSave(serializeSave(g.exportSnapshot(1250))),
    5000,
  );
  assert.equal(restored.player.attackUntil, 5090);
});
test("v5 to v8 retains explicit zero supplies and ranged state", () => {
  const old = freshSave();
  old.version = 5;
  old.consumables = { restorativeDraught: 0, ironbarkTonic: 0 };
  const s = migrateSave(old);
  assert.equal(s.version, 9);
  assert.deepEqual(s.consumables, {
    restorativeDraught: 0,
    ironbarkTonic: 0,
    lumenPhial: 1,
    crossingSigil: 0,
  });
  assert.equal(s.activeWeaponSlot, "primary");
  assert.deepEqual(s.lastAim, { x: 0, y: 1 });
});
test("death tops draughts to two without reducing larger stacks", () => {
  for (const [count, want] of [
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 3],
  ]) {
    const s = freshSave(),
      g = new Game(s, 0);
    s.consumables.restorativeDraught = count;
    g.player.hp = 0;
    g.update(0, idle(), 1);
    assert.equal(s.consumables.restorativeDraught, want);
    assert.match(g.message, count < 2 ? /replenished to 2/ : /Felled/);
  }
});
test("projectile direction and swept collision are deterministic", async () => {
  const { projectileDirection, updateProjectiles } = await import(
    "../src/game.ts"
  );
  assert.deepEqual(projectileDirection(0, 0, "left"), { x: -1, y: 0 });
  const map = { tiles: Array.from({ length: 25 }, () => ({ blocked: false })) },
    enemy = { id: "e", x: 3, y: 2, hp: 5, maxHp: 5, dead: false };
  map.tiles[2 * 5 + 2].blocked = true;
  let rewards = 0,
    p = [{ x: 1.2, y: 2.45, dx: 1, dy: 0, speed: 20, life: 2, damage: 9 }];
  p = updateProjectiles(p, [enemy], map, 5, 0.2, () => rewards++);
  assert.equal(enemy.hp, 5);
  assert.equal(rewards, 0);
  assert.equal(p.length, 0);
  map.tiles[2 * 5 + 2].blocked = false;
  p = [{ x: 1.2, y: 2.45, dx: 1, dy: 0, speed: 20, life: 2, damage: 9 }];
  updateProjectiles(p, [enemy], map, 5, 0.2, () => rewards++);
  assert.equal(enemy.dead, true);
  assert.equal(rewards, 1);
});
test("shop is deterministic, capped, affordable, and persisted", async () => {
  const { velaShop, buyFromVela } = await import("../src/game.ts"),
    s = freshSave(),
    a = structuredClone(velaShop(s));
  assert.deepEqual(a, velaShop(s));
  s.currency = 30;
  assert.equal(buyFromVela(s, "restorativeDraught", 5).quantity, 5);
  assert.deepEqual([s.currency, s.consumables.restorativeDraught], [15, 8]);
  s.consumables.restorativeDraught = 99;
  assert.equal(buyFromVela(s, "restorativeDraught").ok, false);
  s.currency = 100;
  assert.equal(buyFromVela(s, "ironbarkTonic", 2).quantity, 2);
  assert.equal(buyFromVela(s, "ironbarkTonic").ok, false);
  const item = velaShop(s).equipment[0],
    r = buyFromVela(s, item.id);
  assert.equal(r.ok, true);
  assert.equal(buyFromVela(s, item.id).ok, false);
  const round = deserializeSave(serializeSave(s));
  assert.deepEqual(round.shop, s.shop);
});
test("supply cache is stable, reachable, and collected once", () => {
  const s = freshSave(),
    r = generateRegion(s.seed, 4, -3, 1),
    o = r.objects.find(
      (x) => x.kind === "supplyCache" || x.kind === "weaponCache",
    );
  assert.ok(o);
  assert.equal(r.tiles[o.y * 32 + o.x].blocked, false);
  const g = new Game(s, 0);
  g.rx = 4;
  g.ry = -3;
  g.loadArea("overworld");
  const q = g.map.objects.find((x) => x.id === o.id);
  g.player.x = q.x;
  g.player.y = q.y;
  const first = g.interact("collect");
  assert.equal(first.ok, true);
  g.snapshotArea();
  g.loadArea("overworld", false);
  const restored = g.map.objects.find((x) => x.id === o.id);
  assert.equal(restored.state, "used");
  assert.deepEqual(validActions(restored, s), []);
});
test("primary profiles respect direction arc reach and walls", async () => {
  const { primaryAttackHits } = await import("../src/game.ts"),
    { primaryProfile } = await import("../src/items.ts"),
    map = { tiles: Array.from({ length: 49 }, () => ({ blocked: false })) },
    p = { x: 2, y: 3, facing: "right" },
    front = { id: "f", x: 3.3, y: 3, hp: 9 },
    side = { id: "s", x: 2, y: 4.4, hp: 9 },
    far = { id: "x", x: 4.1, y: 3, hp: 9 };
  assert.deepEqual(
    primaryAttackHits(
      p,
      [front, side, far],
      map,
      7,
      primaryProfile({ id: "salvage-blade" }),
      { x: 1, y: 0 },
    ).map((x) => x.id),
    ["f"],
  );
  assert.ok(
    primaryAttackHits(
      p,
      [far],
      map,
      7,
      primaryProfile({ name: "Cinder Pike" }),
      { x: 1, y: 0 },
    ).length,
  );
  assert.ok(
    primaryAttackHits(
      p,
      [side],
      map,
      7,
      primaryProfile({ name: "Verge Cleaver" }),
      { x: 1, y: 0 },
    ).length,
  );
  map.tiles[3 * 7 + 3].blocked = true;
  assert.equal(
    primaryAttackHits(
      p,
      [front],
      map,
      7,
      primaryProfile({ id: "salvage-blade" }),
      { x: 1, y: 0 },
    ).length,
    0,
  );
});
test("Tool toggles persistently and aimed taps can repeatedly fire", () => {
  const g = new Game(freshSave(), 0);
  assert.equal(g.fireSecondary(1), false);
  assert.equal(g.save.toolMode, true);
  assert.equal(g.save.aimMode, "tool");
  g.aimAt(g.player.x + 4, g.player.y);
  assert.equal(g.fireSecondary(2, { x: 1, y: 0 }), true);
  assert.equal(g.projectiles.length, 1);
  g.player.attackReadyAt = 0;
  g.aimAt(g.player.x, g.player.y + 4);
  assert.equal(g.fireSecondary(3, { x: 0, y: 1 }), true);
  assert.equal(g.projectiles.length, 2);
  assert.equal(g.save.toolMode, true);
});
test("Ember Ring lingers, pulses once per enemy per pulse, persists, and pauses", () => {
  const g = new Game(freshSave(), 0);
  g.map.tiles.fill({ blocked: false });
  g.enemies = [
    { id: "e", x: g.player.x, y: g.player.y, hp: 50, maxHp: 50, dead: false },
  ];
  assert.equal(g.castSpell(), true);
  g.update(0.1, idle(), 1);
  const hp = g.enemies[0].hp;
  g.update(0.1, idle(), 2);
  assert.equal(g.enemies[0].hp, hp);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(3))), 100);
  assert.equal(r.effects.length, 1);
  r.setPaused(true, 100);
  const life = r.effects[0].life;
  r.update(2, idle(), 200);
  assert.equal(r.effects[0].life, life);
});
test("equipment swaps primary secondary armor and charm safely", async () => {
  const { equipInventoryItem } = await import("../src/game.ts");
  for (const slot of ["primary", "secondary", "armor", "charm"]) {
    const s = freshSave(),
      prior = s.equipment[slot],
      item = {
        id: `new-${slot}`,
        name: `New ${slot}`,
        slot,
        power: 4,
        property: "guard",
      };
    s.inventory = [item];
    assert.equal(equipInventoryItem(s, 0), true);
    assert.equal(s.equipment[slot].id, item.id);
    if (prior) assert.equal(s.inventory[0].id, prior.id);
    else assert.equal(s.inventory.length, 0);
  }
});
test("snapshot immediately persists both timed buffs and deterministic spell ids", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  g.magicBuffRemaining = 17;
  g.castSpell();
  const first = g.effects[0].id;
  g.spellCooldownRemaining = 0;
  g.castSpell();
  assert.notEqual(g.effects[1].id, first);
  const snap = g.exportSnapshot(1);
  assert.equal(snap.magicBuff, 17);
  assert.equal(snap.spellCooldown, 6);
  assert.equal(snap.effectCounter, 2);
});
test("v6 to v8 preserves location ranged aim snapshots and new defaults", () => {
  const o = freshSave();
  o.version = 6;
  o.session.x = 7;
  o.session.y = 9;
  o.pendingAim = { x: 3, y: 4 };
  o.session.areas.keep = { enemies: [] };
  delete o.toolMode;
  const s = migrateSave(o);
  assert.equal(s.version, 9);
  assert.deepEqual([s.session.x, s.session.y], [7, 9]);
  assert.deepEqual(s.pendingAim, { x: 3, y: 4 });
  assert.ok(s.session.areas.keep);
  assert.equal(s.toolMode, false);
});
test("melee autoaim sees behind excludes walls and range and preserves ranged aim", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  g.map = { tiles: Array.from({ length: 100 }, () => ({ blocked: false })) };
  g.player.x = g.player.y = 4;
  g.player.facing = "right";
  g.enemies = [
    { id: "b", x: 3, y: 4, hp: 99, maxHp: 99, dead: false },
    { id: "a", x: 3, y: 4, hp: 99, maxHp: 99, dead: false },
    { id: "far", x: 9, y: 4, hp: 99, maxHp: 99, dead: false },
  ];
  s.pendingAim = { x: 12, y: 12 };
  s.lastAim = { x: 1, y: 0 };
  const d = selectMeleeAim(g.player, g.enemies, g.map, 10, 2);
  assert.ok(d.x < 0);
  g.primaryAttack(1);
  assert.deepEqual(s.pendingAim, { x: 12, y: 12 });
  assert.deepEqual(s.lastAim, { x: 1, y: 0 });
  assert.equal(g.enemies[0].hp, g.enemies[1].hp);
  g.map.tiles[4 * 10 + 3].blocked = true;
  assert.equal(
    selectMeleeAim(
      g.player,
      [{ id: "w", x: 2, y: 4, dead: false }],
      g.map,
      10,
      3,
    ),
    null,
  );
});
test("story is global order-independent and remains completable after Vela dies", () => {
  const s = freshSave(),
    v = {
      id: "vendor-vela",
      kind: "npc",
      state: "calm",
      actions: ["speak", "attack"],
    };
  applyInteraction(v, "attack", s);
  applyInteraction(v, "attack", s);
  assert.match(currentObjective(s), /Hollow Marshal/);
  const sh = { id: "x", kind: "shrine", state: "quiet", actions: ["inspect"] };
  applyInteraction(sh, "inspect", s, "one");
  const n = s.narrative.journal.length;
  applyInteraction({ ...sh, id: "y" }, "inspect", s, "two");
  assert.equal(s.narrative.journal.length, n);
  const chest = {
    id: "dungeon-chest",
    kind: "chest",
    state: "closed",
    actions: ["open"],
  };
  applyInteraction(chest, "open", s, "early");
  s.narrative.facts["crossing.marshal"] = true;
  assert.ok(!validActions(chest, s).includes("open"));
  const restored = commitRelay(
    s,
    "restore",
    dungeonId(s.seed, s.worldGeneration),
  );
  assert.equal(restored.ok, true);
  assert.equal(s.consequences.choices.relay, "restore");
});
test("entrances recipes dungeon identities and snapshots are deterministic and independent", () => {
  const a = generateRegion("S", 4, -3, 1),
    b = generateRegion("S", 4, -3, 1);
  assert.deepEqual(a, b);
  const ids = [
    dungeonId("S", 1, 1, 2, "a"),
    dungeonId("S", 1, 2, 2, "b"),
    dungeonId("S", 1, 3, 2, "c"),
  ];
  for (const id of ids)
    assert.deepEqual(generateDungeon("S", id), generateDungeon("S", id));
  const s = freshSave(),
    g = new Game(s, 0);
  s.session.activeDungeonId = ids[0];
  g.loadArea("dungeon");
  g.enemies[0].hp = 1;
  g.snapshotArea();
  s.session.activeDungeonId = ids[1];
  g.loadArea("dungeon", false);
  assert.notEqual(g.enemies[0].hp, 1);
});
test("trap phases use simulation time reload grace and jump evasion", () => {
  const t = {
      kind: "trap",
      trapType: "spikes",
      x: 1,
      y: 1,
      phase: "armed",
      timer: 0,
      hits: {},
    },
    p = { x: 1, y: 1, hp: 50 };
  updateTraps([t], p, 0.1, false);
  assert.equal(t.phase, "warning");
  assert.equal(t.timer, 0.7);
  const paused = t.timer;
  assert.equal(t.timer, paused);
  updateTraps([t], p, 0.7, true);
  updateTraps([t], p, 0.1, true);
  assert.equal(p.hp, 50);
  const active = {
    ...t,
    phase: "active",
    timer: 0.3,
    hits: {},
    loadGrace: undefined,
  };
  updateTraps([active], p, 0.05, false);
  assert.equal(p.hp, 50);
});
test("vine traversal persists pauses completes and clears safely on death return", () => {
  const s = freshSave();
  s.session.activeDungeonId = dungeonId(s.seed, 1, 2, 2, "vine");
  const g = new Game(s, 0);
  g.loadArea("dungeon", false);
  g.map.objects.push({
    id: "v",
    kind: "vine",
    x: g.player.x,
    y: g.player.y,
    toX: g.player.x + 3,
    toY: g.player.y,
    actions: ["swing"],
  });
  g.interact("swing");
  assert.ok(g.traversal);
  g.setPaused(true, 1);
  const t = g.traversal.t;
  g.update(0.5, idle(), 2);
  assert.equal(g.traversal.t, t);
  const snap = g.exportSnapshot(2);
  const r = new Game(deserializeSave(serializeSave(snap)), 10);
  assert.ok(r.traversal);
  r.setPaused(false, 10);
  r.update(0.8, idle(), 11);
  assert.equal(r.traversal, null);
  r.traversal = { kind: "swing", t: 0.5 };
  r.player.hp = 0;
  r.update(0.01, idle(), 12);
  assert.equal(r.traversal, null);
});
test("Attack and Tool are exclusive persistent aim modes", () => {
  const s = freshSave();
  s.toolMode = true;
  s.aimMode = "tool";
  s.activeWeaponSlot = "secondary";
  s.pendingAim = { x: 30, y: 16 };
  const g = new Game(s, 0);
  assert.equal(g.toggleAttackMode(), "attack");
  assert.equal(s.toolMode, false);
  g.primaryAttack(1);
  assert.equal(s.toolMode, false);
  assert.equal(g.projectiles.length, 1);
  assert.equal(s.pendingAim, null);
  g.fireSecondary(2);
  assert.equal(s.aimMode, "tool");
  assert.equal(s.toolMode, true);
});
test("dodge preserves a normalized live diagonal instead of cardinalizing", () => {
  const p = { stamina: 50, facing: "right", lastMoveVector: { x: 0, y: 1 } };
  assert.equal(dodge(p, 10, 0.8, -0.6).ok, true);
  assert.ok(p.dodgeX > 0 && p.dodgeY < 0);
  assert.ok(Math.abs(Math.hypot(p.dodgeX, p.dodgeY) - 1) < 1e-9);
  assert.deepEqual(p.lastMoveVector, { x: p.dodgeX, y: p.dodgeY });
});
test("released-stick dodge falls back to persisted diagonal movement memory", () => {
  const s = freshSave();
  s.session.playerRuntime.lastMoveVector = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
  const g = new Game(s, 0);
  assert.equal(dodge(g.player, 1, 0, 0).ok, true);
  assert.ok(g.player.dodgeX > 0 && g.player.dodgeY > 0);
  assert.ok(Math.abs(g.player.dodgeX - g.player.dodgeY) < 1e-9);
  const snap = g.exportSnapshot(2),
    r = new Game(deserializeSave(serializeSave(snap)), 10);
  r.player.dodgeReadyAt = 0;
  r.player.stamina = 50;
  assert.equal(dodge(r.player, 11, 0.01, 0.01).ok, true);
  assert.ok(r.player.dodgeX > 0 && r.player.dodgeY > 0);
  assert.ok(Math.abs(Math.hypot(r.player.dodgeX, r.player.dodgeY) - 1) < 1e-9);
});
test("procedural score uses evolving harmony filtered ambience restrained percussion and safe mute", async () => {
  const { readFileSync } = await import("node:fs"),
    src = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(src, /addEventListener\(["']pointerdown["'],\s*startAmbience/);
  assert.match(src, /chords\s*=\s*\[\s*\[55,\s*82\.41,\s*110,\s*130\.81\]/);
  assert.match(src, /createDynamicsCompressor/);
  assert.match(src, /delay\.delayTime\.value\s*=\s*0?\.37/);
  assert.match(src, /game\.paused/);
  assert.match(src, /linearRampToValueAtTime\(muted\s*\?\s*0\s*:\s*0?\.06/);
  assert.doesNotMatch(src, /type\s*=\s*["']square["']/);
});
test("enemy danger radius exactly matches attack threshold for melee ranged and bosses", () => {
  for (const e of [{ range: 0 }, { range: 3 }, { range: 8, boss: true }]) {
    const r = enemyDangerRadius(e);
    assert.equal(
      attackInRange({ ...e, x: 0, y: 0 }, { x: r - 0.001, y: 0 }),
      true,
    );
    assert.equal(attackInRange({ ...e, x: 0, y: 0 }, { x: r, y: 0 }), false);
    assert.equal(
      attackInRange({ ...e, x: 0, y: 0 }, { x: r + 0.001, y: 0 }),
      false,
    );
  }
});
test("enemy telegraph duration persists until the exact impact update", () => {
  const map = {
      tiles: Array.from({ length: 100 }, () => ({ blocked: false })),
    },
    e = {
      id: "readable",
      kind: "sparkWarden",
      x: 2,
      y: 2,
      cooldown: 0,
      telegraph: 0.9,
      range: 3,
    },
    p = { x: 3, y: 2 };
  assert.equal(updateEnemyAI(e, p, map, 10, 0.3, 1), false);
  assert.ok(Math.abs(e.telegraph - 0.6) < 1e-9);
  assert.equal(updateEnemyAI(e, p, map, 10, 0.59, 2), false);
  assert.ok(e.telegraph > 0);
  assert.equal(updateEnemyAI(e, p, map, 10, 0.02, 3), true);
  assert.equal(e.telegraph, 0);
  assert.equal(e.strike, 0.24);
});
test("three identifiable refuge residents and deliberate Act choice preserve neutral state", () => {
  const g = new Game(freshSave(), 0),
    n = g.map.objects.filter((o) => o.kind === "npc");
  assert.equal(n.length, 3);
  for (const o of n) {
    assert.ok(o.name && o.role);
    assert.equal(o.maxHp, 36);
  }
  const v = n.find((o) => o.id === "vendor-vela");
  Object.assign(g.player, { x: v.x, y: v.y });
  g.interact();
  assert.equal(g.interactionRequested, v.id);
  assert.equal(g.save.consequences.npcs[v.id].hp, 36);
  assert.equal(g.shopRequested, undefined);
});
test("NPC wounds spare death and shop denial are permanent without rewards", async () => {
  const { buyFromVela } = await import("../src/game.ts");
  const s = freshSave(),
    g = new Game(s, 0),
    v = g.map.objects.find((o) => o.id === "vendor-vela");
  Object.assign(g.player, { x: v.x, y: v.y });
  const xp = s.xp,
    drops = s.dropCounter;
  assert.equal(g.interact("attack", v.id).ok, true);
  assert.equal(s.consequences.npcs[v.id].hp, 18);
  assert.equal(buyFromVela(s, "restorativeDraught").ok, false);
  assert.equal(g.interact("standDown", v.id).ok, true);
  assert.equal(s.consequences.npcs[v.id].disposition, "spared");
  const restored = new Game(
    deserializeSave(serializeSave(g.exportSnapshot(3))),
    100,
  );
  assert.equal(restored.save.consequences.npcs[v.id].hp, 18);
  restored.interact("attack", v.id);
  assert.equal(restored.save.consequences.npcs[v.id].status, "dead");
  assert.equal(buyFromVela(restored.save, "restorativeDraught").ok, false);
  assert.equal(restored.save.xp, xp);
  assert.equal(restored.save.dropCounter, drops);
  const rep = restored.save.consequences.settlements["ember-refuge"].reputation;
  restored.interact("attack", v.id);
  assert.equal(
    restored.save.consequences.settlements["ember-refuge"].reputation,
    rep,
  );
  assert.equal(
    restored.save.narrative.journal.filter(
      (j) => j.recordId === "death:" + v.id,
    ).length,
    1,
  );
});
test("refuge falls only on final resident death and occupation snapshots never respawn defeated monsters", () => {
  const g = new Game(freshSave(), 0),
    residents = g.map.objects.filter((o) => o.kind === "npc");
  for (let i = 0; i < residents.length; i++) {
    recordNpcDamage(g.save, residents[i], 36);
    g.reconcileConsequences();
    assert.equal(
      g.save.consequences.settlements["ember-refuge"].status,
      i < 2 ? "standing" : "fallen",
    );
  }
  const occupiers = g.enemies.filter((e) => e.id.startsWith("occupation-"));
  assert.equal(occupiers.length, 2);
  occupiers[0].hp = 0;
  occupiers[0].dead = true;
  occupiers[0].rewarded = true;
  occupiers[1].hp = 7;
  g.transitionSection(1, 0);
  g.transitionSection(-1, 0);
  assert.equal(g.enemies.find((e) => e.id === occupiers[0].id).dead, true);
  assert.equal(g.enemies.find((e) => e.id === occupiers[1].id).hp, 7);
  const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(4))), 99);
  assert.equal(
    r.enemies.filter((e) => e.id.startsWith("occupation-")).length,
    2,
  );
  assert.equal(r.enemies.find((e) => e.id === occupiers[0].id).dead, true);
  assert.equal(
    r.map.objects.filter((o) => o.kind === "npc" && !o.dead).length,
    0,
  );
});
test("melee collateral can kill a neutral resident without enemy rewards", () => {
  const g = new Game(freshSave(), 0),
    v = g.map.objects.find((o) => o.id === "vendor-vela");
  g.enemies = [];
  g.map.tiles.fill({ blocked: false });
  Object.assign(g.player, { x: v.x - 1, y: v.y });
  g.save.lastAim = { x: 1, y: 0 };
  g.save.stats.Might = 30;
  g.primaryAttack(1);
  assert.equal(g.save.consequences.npcs[v.id].status, "dead");
  assert.equal(g.save.consequences.npcs[v.id].intent, "collateral");
  assert.equal(g.save.xp, 0);
  assert.equal(g.save.dropCounter, 0);
});
test("projectiles and spell pulses hurt NPCs once and preserve exact paused wounds", () => {
  for (const cause of ["projectile", "spell"]) {
    const g = new Game(freshSave(), 0),
      v = g.map.objects.find((o) => o.id === "vendor-vela");
    g.enemies = [];
    g.map.tiles.fill({ blocked: false });
    if (cause === "projectile")
      g.projectiles = [
        {
          id: "collateral",
          x: v.x - 1,
          y: v.y + 0.45,
          dx: 1,
          dy: 0,
          speed: 20,
          life: 2,
          damage: 18,
        },
      ];
    else
      g.effects = [
        {
          id: "collateral",
          kind: "ember-ring",
          x: v.x + 0.5,
          y: v.y + 0.45,
          life: 3,
          radius: 0.5,
          pulse: 1,
          untilPulse: 0,
          damage: 18,
          pulseIndex: 0,
          hits: {},
        },
      ];
    g.update(0.1, idle(), 1);
    assert.equal(g.save.consequences.npcs[v.id].hp, 18);
    g.setPaused(true, 2);
    const r = new Game(
      deserializeSave(serializeSave(g.exportSnapshot(2))),
      100,
    );
    r.update(20, idle(), 200);
    assert.equal(r.save.consequences.npcs[v.id].hp, 18);
    assert.equal(r.save.xp, 0);
  }
});
test("action enumeration never switches dungeon identity", () => {
  const s = freshSave(),
    g = new Game(s, 0),
    before = s.session.activeDungeonId,
    gate = g.map.objects.find((o) => o.kind === "dungeon");
  validActions(gate, s);
  Object.assign(g.player, { x: gate.x, y: gate.y });
  g.nearestObject();
  assert.equal(s.session.activeDungeonId, before);
});
test("bypass enter abandonment resume death and resolution retain per-visit history", () => {
  const s = freshSave(),
    g = new Game(s, 0),
    gate = g.map.objects.find((o) => o.kind === "dungeon"),
    id = dungeonId(s.seed, s.worldGeneration);
  Object.assign(g.player, { x: gate.x, y: gate.y });
  g.interact("bypass", gate.id);
  assert.equal(s.consequences.dungeons[id].bypassed, true);
  assert.equal(s.consequences.dungeons[id].visits, 0);
  g.interact("enter", gate.id);
  g.enemies[0].hp = 3;
  g.interact("exit", "dungeon-exit");
  assert.equal(s.consequences.dungeons[id].abandoned, 1);
  abandonDungeon(s, id);
  assert.equal(s.consequences.dungeons[id].abandoned, 1);
  g.interact("enter", gate.id);
  assert.equal(g.enemies[0].hp, 3);
  g.player.hp = 0;
  g.update(0, idle(), 1);
  assert.equal(g.area, "dungeon");
  assert.deepEqual([g.player.x, g.player.y], [4, 5]);
  assert.equal(s.consequences.dungeons[id].abandoned, 1);
  assert.notEqual(g.enemies[0].hp, 3);
  g.interact("exit", "dungeon-exit");
  Object.assign(g.player, { x: gate.x, y: gate.y });
  g.interact("enter", gate.id);
  s.narrative.facts["crossing.marshal"] = true;
  commitRelay(s, "restore", id);
  g.interact("exit", "dungeon-exit");
  assert.equal(s.consequences.dungeons[id].abandoned, 2);
  assert.equal(s.consequences.dungeons[id].visits, 3);
  assert.equal(s.consequences.dungeons[id].resolved, true);
});
test("Relay endings are exclusive idempotent and story progress is order independent", () => {
  for (const choice of ["restore", "sever"]) {
    const s = freshSave(),
      id = dungeonId(s.seed, s.worldGeneration);
    assert.equal(commitRelay(s, choice, id).ok, false);
    s.narrative.facts["crossing.marshal"] = true;
    const before = s.consumables.restorativeDraught,
      dust = s.materials.lumenDust;
    assert.equal(commitRelay(s, choice, id).ok, true);
    assert.equal(
      commitRelay(s, choice === "restore" ? "sever" : "restore", id).ok,
      false,
    );
    assert.equal(commitRelay(s, choice, id).ok, false);
    assert.equal(
      s.consumables.restorativeDraught,
      before + (choice === "restore" ? 2 : 0),
    );
    assert.equal(s.materials.lumenDust, dust + (choice === "sever" ? 3 : 0));
    applyInteraction(
      { id: "shrine-1", kind: "shrine", actions: ["inspect"] },
      "inspect",
      s,
    );
    assert.equal(s.consequences.choices.relay, choice);
    const r = deserializeSave(serializeSave(s));
    assert.equal(r.consequences.choices.relay, choice);
    assert.equal(r.consequences.dungeons[id].resolved, true);
  }
});
test("procedural Marshal and chest cannot progress the main Relay story", () => {
  const s = freshSave(),
    g = new Game(s, 0),
    id = dungeonId(s.seed, s.worldGeneration, 2, 2, "other");
  s.session.activeDungeonId = id;
  g.loadArea("dungeon");
  const boss = g.enemies.find((e) => e.kind === "hollowMarshal");
  boss.dead = true;
  g.defeatEnemy(boss);
  assert.equal(s.narrative.facts["crossing.marshal"], undefined);
  assert.equal(s.consequences.dungeons[id].resolved, true);
  assert.equal(
    g.map.objects.some((o) => o.kind === "relayTerminal"),
    false,
  );
  const chest = g.map.objects.find((o) => o.kind === "chest");
  Object.assign(g.player, { x: chest.x, y: chest.y });
  g.interact("open", chest.id);
  assert.equal(s.narrative.facts["crossing.restored"], undefined);
  const drops = s.dropCounter;
  g.interact("open", chest.id);
  assert.equal(s.dropCounter, drops);
  assert.equal(commitRelay(s, "restore", id).ok, false);
});
test("canonical Marshal unlocks a reachable explicit Relay terminal and retains one ending", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  s.session.activeDungeonId = dungeonId(s.seed, s.worldGeneration);
  g.loadArea("dungeon");
  const boss = g.enemies.find((e) => e.kind === "hollowMarshal");
  boss.dead = true;
  g.defeatEnemy(boss);
  assert.equal(s.narrative.facts["crossing.marshal"], true);
  const terminal = g.map.objects.find((o) => o.kind === "relayTerminal");
  assert.ok(terminal);
  assert.equal(g.map.tiles[terminal.y * 24 + terminal.x].blocked, false);
  Object.assign(g.player, { x: terminal.x, y: terminal.y });
  g.interact();
  assert.equal(g.interactionRequested, terminal.id);
  assert.equal(g.interact("sever", terminal.id).ok, true);
  assert.equal(g.interact("restore", terminal.id).ok, false);
  assert.equal(s.consequences.choices.relay, "sever");
});
test("v7 migration preserves old Relay completion dead Vela and unrelated exact runtime", () => {
  const old = freshSave();
  old.version = 7;
  delete old.consequences;
  old.worldFlags["vendor-vela:dead"] = true;
  old.narrative.facts["crossing.restored"] = true;
  old.narrative.facts["crossing.complete"] = true;
  old.session.x = 7.25;
  old.session.playerRuntime.attackCooldown = 77;
  old.session.areas.keep = { enemies: [{ id: "retain", hp: 3 }] };
  old.currency = 47;
  const s = migrateSave(old);
  assert.equal(s.version, 9);
  assert.equal(s.consequences.choices.relay, "restore");
  assert.equal(s.consequences.npcs["vendor-vela"].status, "dead");
  assert.equal(s.consequences.settlements["ember-refuge"].status, "standing");
  assert.equal(s.session.x, 7.25);
  assert.equal(s.session.playerRuntime.attackCooldown, 77);
  assert.deepEqual(s.session.areas.keep, old.session.areas.keep);
  assert.equal(s.currency, 47);
});
test("v8 paused save roundtrip retains wounds choices active visit and effect dedupe exactly", () => {
  const s = freshSave(),
    g = new Game(s, 0),
    v = g.map.objects.find((o) => o.id === "vendor-vela");
  recordNpcDamage(s, v, 5, "spell", "collateral");
  g.effects = [
    {
      id: "pulse",
      life: 2,
      untilPulse: 0.4,
      pulse: 1,
      hits: { "1:vendor-vela": true },
      pulseIndex: 1,
    },
  ];
  g.setPaused(true, 20);
  g.player.attackReadyAt = 220;
  const snapshot = structuredClone(g.exportSnapshot(999));
  const restored = deserializeSave(serializeSave(snapshot));
  assert.deepEqual(restored.consequences, snapshot.consequences);
  const r = new Game(restored, 500);
  assert.equal(r.player.attackReadyAt, 700);
  assert.deepEqual(r.effects, g.effects);
  assert.equal(r.paused, true);
});

test("fallen refuge closes its own thread while solitary Array and both chapter endings remain available", () => {
  for (const ending of ["restore", "sever"]) {
    const s = freshSave(),
      g = new Game(s, 0);
    for (const o of g.map.objects.filter((o) => o.kind === "npc"))
      recordNpcDamage(s, o, 36);
    g.reconcileConsequences();
    assert.deepEqual(s.consequences.threads["ember-refuge"], {
      status: "resolved",
      ending: "fallen",
    });
    assert.equal(s.consequences.threads["missing-crossing"].status, "open");
    assert.match(currentObjective(s), /Array route/);
    const array = g.map.objects.find((o) => o.kind === "shrine");
    Object.assign(g.player, { x: array.x, y: array.y });
    g.interact("inspect", array.id);
    assert.equal(s.narrative.facts["crossing.objective"], true);
    const gate = g.map.objects.find((o) => o.kind === "dungeon");
    Object.assign(g.player, { x: gate.x, y: gate.y });
    g.interact("enter", gate.id);
    const boss = g.enemies.find((e) => e.kind === "hollowMarshal");
    boss.dead = true;
    g.defeatEnemy(boss);
    const terminal = g.map.objects.find((o) => o.kind === "relayTerminal");
    Object.assign(g.player, { x: terminal.x, y: terminal.y });
    assert.equal(g.interact(ending, terminal.id).ok, true);
    assert.deepEqual(s.consequences.threads["missing-crossing"], {
      status: "resolved",
      ending,
    });
    assert.match(currentObjective(s), /resolved.*Explore further crossings/);
    assert.equal(s.consequences.settlements["ember-refuge"].status, "fallen");
    const exit = g.map.objects.find((o) => o.kind === "exit");
    Object.assign(g.player, { x: exit.x, y: exit.y });
    g.interact("exit", exit.id);
    g.transitionSection(1, 0);
    assert.equal(g.area, "overworld");
    assert.equal(g.rx, 1);
    assert.equal(g.map.tiles.length, 1024);
    g.transitionSection(-1, 0);
    Object.assign(g.player, { x: gate.x, y: gate.y });
    assert.equal(g.interact("enter", gate.id).ok, true);
    assert.equal(g.area, "dungeon");
    assert.equal(s.consequences.threads["missing-crossing"].ending, ending);
  }
});
test("finite thread endings cannot overwrite incompatible outcomes and remain reusable for future threads", () => {
  const s = freshSave();
  assert.equal(resolveThread(s, "future-crossing", "bypassed"), true);
  assert.equal(resolveThread(s, "future-crossing", "bypassed"), true);
  assert.equal(resolveThread(s, "future-crossing", "cleared"), false);
  assert.deepEqual(
    deserializeSave(serializeSave(s)).consequences.threads["future-crossing"],
    { status: "resolved", ending: "bypassed" },
  );
});

test("death preserves the complete carried build and progression", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  s.inventory = [generateItem("kept", 3)];
  s.currency = 41;
  s.materials = { cinderIron: 7, lumenDust: 4 };
  s.xp = 23;
  s.level = 2;
  s.statPoints = 1;
  s.consumables = { restorativeDraught: 5, ironbarkTonic: 3, lumenPhial: 2 };
  const before = structuredClone({
    inventory: s.inventory,
    currency: s.currency,
    materials: s.materials,
    xp: s.xp,
    level: s.level,
    statPoints: s.statPoints,
    consumables: s.consumables,
    equipment: s.equipment,
  });
  g.player.hp = 0;
  g.update(0, idle(), 100);
  assert.deepEqual(
    {
      inventory: s.inventory,
      currency: s.currency,
      materials: s.materials,
      xp: s.xp,
      level: s.level,
      statPoints: s.statPoints,
      consumables: s.consumables,
      equipment: s.equipment,
    },
    before,
  );
  assert.match(g.message, /No items, marks, equipment, or XP were lost/);
});
test("action readiness reports local cooldowns and potion availability", () => {
  const s = freshSave(),
    g = new Game(s, 100);
  g.player.attackReadyAt = 520;
  g.player.dodgeReadyAt = 950;
  g.jumpUntil = 620;
  g.spellCooldownRemaining = 3;
  s.consumables.restorativeDraught = 2;
  g.player.hp = 30;
  const r = actionReadiness(g, 100);
  assert.deepEqual(
    [
      r.attack.remaining,
      r.tool.remaining,
      r.dodge.remaining,
      r.dodge.available,
      r.dodge.cost,
      r.jump.remaining,
      r.spell.remaining,
      r.potion.count,
      r.potion.available,
    ],
    [0.42, 0.42, 0, true, 15, 0.52, 3, 2, true],
  );
  g.player.hp = s.maxHp;
  assert.equal(actionReadiness(g, 100).potion.available, false);
});

test("experience rolls over, preserves excess, and grants one stat point per level", () => {
  const s = freshSave();
  s.xp = 60;
  assert.equal(settleProgression(s), 1);
  assert.deepEqual([s.level, s.xp, s.nextXp, s.statPoints], [2, 30, 51, 1]);
  assert.equal(awardExperience(s, 21), 1);
  assert.deepEqual([s.level, s.xp, s.nextXp, s.statPoints], [3, 0, 79, 2]);
});
test("loading an overfilled legacy XP bar settles progression immediately", () => {
  const s = freshSave();
  s.xp = 60;
  const g = new Game(s, 0);
  assert.deepEqual(
    [g.save.level, g.save.xp, g.save.nextXp, g.save.statPoints],
    [2, 30, 51, 1],
  );
});

test("levels and allocated stats visibly improve survivability", () => {
  const s = freshSave();
  s.level = 6;
  syncCharacterStats(s);
  assert.deepEqual([s.maxHp, s.maxStamina], [90, 55]);
  const g = new Game(s, 0);
  g.save.statPoints = 2;
  assert.equal(g.allocate("Vigor"), true);
  assert.equal(g.save.maxHp, 98);
  assert.equal(g.allocate("Finesse"), true);
  assert.equal(g.save.maxStamina, 58);
  g.save.equipment.armor = { name: "Ward Plate", power: 4 };
  assert.equal(characterStats(g.save).damageReduction, 0.1);
});

test("direct drag movement is radial and the old joystick is absent", () => {
  assert.deepEqual(dragVector(0, 0), { x: 0, y: 0 });
  const diagonal = dragVector(100, 100);
  assert.ok(diagonal.x > 0.6 && diagonal.y > 0.6);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const source = readFileSync(
    new URL("../src/input.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(html, /id="stick"/);
  assert.match(source, /worldtap/);
  assert.match(source, /setPointerCapture/);
  assert.match(source, /pointers = new Map/);
  assert.match(source, /movementPointer/);
});

test("ordinary enemies and guardians advance Aperture once per identity", () => {
  const s = freshSave(),
    g = new Game(s, 0),
    enemy = g.enemies.find((e) => !e.boss);
  g.defeatEnemy(enemy);
  assert.equal(s.perception.aperture, 1);
  g.defeatEnemy(enemy);
  assert.equal(s.perception.aperture, 1);
  const guardian = { id: "test-guardian", kind: "hollowMarshal", boss: true };
  g.defeatEnemy(guardian);
  assert.equal(s.perception.aperture, 5);
  g.defeatEnemy(guardian);
  assert.equal(s.perception.aperture, 5);
});

test("explicit melee direction overrides closer automatic targets", () => {
  const g = new Game(freshSave(), 0);
  g.map.tiles.fill({ blocked: false });
  Object.assign(g.player, { x: 10, y: 10 });
  g.save.equipment.primary = {
    id: "primary-cinder-pike",
    name: "Cinder Pike",
    slot: "primary",
    power: 1,
  };
  g.enemies = [
    { id: "east", kind: "ashling", x: 11, y: 10, hp: 30, maxHp: 30 },
    { id: "west", kind: "ashling", x: 9, y: 10, hp: 30, maxHp: 30 },
  ];
  g.primaryAttack(1, { x: -1, y: 0 });
  assert.equal(g.enemies[0].hp, 30);
  assert.ok(g.enemies[1].hp < 30);
});

test("dodge is limited by stamina rather than a separate cooldown", () => {
  const p = {
    stamina: 45,
    dodgeReadyAt: 99999,
    lastMoveVector: { x: 1, y: 0 },
  };
  assert.equal(dodge(p, 100, 1, 0).ok, true);
  assert.equal(dodge(p, 101, 1, 0).ok, true);
  assert.equal(dodge(p, 102, 1, 0).ok, true);
  assert.equal(p.stamina, 0);
  assert.deepEqual(dodge(p, 100000, 1, 0), { ok: false, reason: "stamina" });
});
test("equippable spells expose distinct power and cooldown profiles", () => {
  const spells = Object.values(SPELLS);
  assert.ok(spells.length >= 3);
  assert.ok(new Set(spells.map((s) => s.cooldown)).size >= 3);
  assert.ok(
    Math.max(...spells.map((s) => s.damage)) >
      Math.min(...spells.map((s) => s.damage)),
  );
  const s = freshSave(),
    g = new Game(s, 0);
  s.equippedSpell = "grave-sun";
  assert.equal(g.castSpell(), true);
  assert.equal(g.spellCooldownRemaining, SPELLS["grave-sun"].cooldown);
});

test("compact HUD markup retains ticker viewport and left Map Pack utilities", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /id="messageViewport"/);
  assert.match(html, /class="utility-buttons"/);
  assert.match(html, /data-action="map">Map/);
  assert.match(html, /data-action="menu">Pack/);
  assert.doesNotMatch(html, /combat-pad[^<]*[\s\S]*class="aux pack"/);
});
test("HUD ticker speed remains readable and scales with overflow", async () => {
  const source = readFileSync(
    new URL("../src/main.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /function tickerSeconds\(distance\)/);
  assert.match(source, /distance\)\s*\/\s*45\s*\+\s*6/);
  assert.match(source, /prefers-reduced-motion|ticker/);
});

test("action diamond is separate from the bottom utility row", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8"),
    style = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /class="quick-row buttons"/);
  assert.match(html, /class="action-diamond buttons"/);
  assert.match(style, /\.action-diamond\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?right:/);
  assert.match(style, /\.quick-row\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?left:/);
});

test("checkpoint travel returns without death or carried losses", () => {
  const s = freshSave(),
    g = new Game(s, 0);
  g.transitionSection(2, -1);
  g.player.hp = 19;
  s.currency = 33;
  s.consumables.restorativeDraught = 7;
  s.inventory = [generateItem("travel-kept", 2)];
  const carried = structuredClone({
    hp: g.player.hp,
    currency: s.currency,
    consumables: s.consumables,
    inventory: s.inventory,
    xp: s.xp,
  });
  assert.equal(g.returnToCheckpoint(), true);
  assert.deepEqual(
    [g.area, g.rx, g.ry, g.player.x, g.player.y],
    ["overworld", 0, 0, 16, 16],
  );
  assert.deepEqual(
    {
      hp: g.player.hp,
      currency: s.currency,
      consumables: s.consumables,
      inventory: s.inventory,
      xp: s.xp,
    },
    carried,
  );
  assert.match(g.message, /Nothing carried was lost/);
});
test("atlas travel accepts activated Wayglass destinations and keeps respawn choice", () => {
  const s = freshSave(), g = new Game(s, 0), active = { ...s.activeCheckpoint };
  s.checkpoints["2,-1"] = { rx: 2, ry: -1, x: 16, y: 16, name: "Far Wayglass" };
  assert.equal(g.travelToCheckpoint("2,-1"), true);
  assert.deepEqual([g.rx, g.ry, g.player.x, g.player.y], [2, -1, 16, 16]);
  assert.deepEqual(s.activeCheckpoint, active);
  assert.equal(g.travelToCheckpoint("99,99"), false);
  assert.equal(g.returnHome(), true);
  assert.deepEqual([g.rx, g.ry], [0, 0]);
});
test("HUD keeps compact vitals and ticker while details expand on demand", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8"),
    style = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(html, /class="health-row"/);
  assert.match(html, /id="healthBar"/);
  assert.match(html, /id="healthText"/);
  assert.match(html, /id="staminaBar"[^>]*aria-label="Stamina"/);
  assert.match(html, /id="hudExpand"[^>]*aria-controls="hudDetails"/);
  assert.match(html, /id="hudDetails" hidden/);
  assert.match(html, /id="loadout"/);
  assert.match(html, /id="attackInfo"/);
  assert.match(html, /id="spellInfo"/);
  assert.match(html, /id="toolInfo"/);
  assert.match(html, /id="mapTravel"/);
  assert.match(style, /#hudDetails\[hidden\]\s*\{\s*display:\s*none/);
});
test("atlas supports direct pointer panning without sacrificing tap selection", () => {
  const source = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8"),
    style = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.match(source, /pointerdown/);
  assert.match(source, /pointermove/);
  assert.match(source, /pointerup/);
  assert.match(source, /suppressMapClick/);
  assert.match(source, /mapView\.x\s*-=\s*Math\.round/);
  assert.match(source, /atlasPointers\.size === 2/);
  assert.match(source, /atlasPinch\.zoom \* distance \/ atlasPinch\.distance/);
  assert.match(source, /Math\.max\(0\.6, Math\.min\(1\.8/);
  assert.match(style, /#mapCanvas\s*\{[\s\S]*?touch-action:\s*none/);
});
test("expanded creature ecology is deterministic and recorded in the field codex", () => {
  const kinds=new Set();
  for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)for(const e of generateRegion("ecology",x,y,1).enemySpawns)kinds.add(e.kind);
  for(const kind of ["ashenHound","veilMoth","rootBrute","coilStalker","cinderWisp"])assert.ok(kinds.has(kind),kind);
  const s=freshSave(),g=new Game(s,0);
  assert.equal(s.version,9);
  assert.ok(Object.keys(s.codex.creatures).length>=3);
  assert.equal(s.codex.places["terrain:"+g.map.dominant],true);
  const migrated=migrateSave({...freshSave(),version:8,codex:undefined});
  assert.equal(migrated.version,9);
  assert.deepEqual(migrated.codex,{creatures:{},places:{},features:{}});
});
test("journal exposes encounter codex sections and an always-available symbol guide",()=>{
  const source=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");
  assert.match(source,/Creatures/);assert.match(source,/Places/);assert.match(source,/Features/);assert.match(source,/Rules & symbols/);assert.match(source,/Ring: Wayglass/);
});

test("dungeon seals checkpoint travel and Crossing Sigil exits without losing carried state", () => {
  const s = freshSave(),
    g = new Game(s, 0),
    gate = g.map.objects.find((o) => o.kind === "dungeon");
  Object.assign(g.player, { x: gate.x, y: gate.y });
  g.interact("enter", gate.id);
  const id = g.areaId(),
    before = structuredClone({ currency: s.currency, explored: s.explored });
  assert.equal(g.returnToCheckpoint(), false);
  assert.equal(g.area, "dungeon");
  assert.match(g.message, /sealed inside a dungeon/);
  s.consumables.crossingSigil = 1;
  assert.equal(g.useCrossingSigil(), true);
  assert.equal(g.area, "overworld");
  assert.equal(s.consumables.crossingSigil, 0);
  assert.deepEqual({ currency: s.currency, explored: s.explored }, before);
  assert.equal(s.consequences.dungeons[id].abandoned, 1);
});
test("named sparse settlements are inhabited and special dungeons expose mechanical identities", () => {
  for (const [rx, ry, name, vendor] of [
    [4, -2, "Glasshaven", "vendor-iona"],
    [-5, 3, "Coilmarket", "vendor-mora"],
  ]) {
    const r = generateRegion("CINDER-VERGE-47", rx, ry, 1);
    assert.equal(r.settlement.name, name);
    assert.ok(r.objects.some((o) => o.id === vendor && o.kind === "npc"));
    assert.ok(r.objects.some((o) => o.kind === "checkpoint"));
  }
  const seen = new Set();
  for (let x = -8; x <= 8; x++)
    for (let y = -8; y <= 8; y++) {
      const r = generateRegion("CINDER-VERGE-47", x, y, 1),
        gate = r.objects.find((o) => o.kind === "dungeon");
      if (gate) {
        const d = generateDungeon(
          "CINDER-VERGE-47",
          dungeonId("CINDER-VERGE-47", 1, x, y, gate.id),
        );
        seen.add(d.identity);
        assert.ok(d.objects.find((o) => o.kind === "chest").rewardSource);
        if (d.identity === "salvage vault")
          assert.ok(d.objects.some((o) => o.id === "vault-cache"));
        if (d.identity === "sentinel den") assert.ok(d.enemySpawns.length > 3);
      }
    }
  assert.ok(seen.size >= 2);
});
test("combat indicators use the exact snapshotted damage geometry and ranged fire clears it", () => {
  const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8"),
    game = readFileSync(new URL("../src/game.ts", import.meta.url), "utf8");
  assert.match(
    game,
    /function meleeAttackGeometry\(player,\s*profile,\s*direction\)/,
  );
  assert.match(game, /meleeStrike\s*=\s*\{\s*\.\.\.geometry\s*\}/);
  assert.match(
    game,
    /meleeUntil\s*=\s*0;[\s\S]*?this\.player\.meleeStrike\s*=\s*null;[\s\S]*?this\.projectiles\.push/,
  );
  assert.match(main, /game\.player\.meleeStrike/);
  assert.match(main, /radius:\s*enemyDangerRadius\(e\)/);
  assert.match(main, /ctx\.arc\(cx,\s*cy,\s*r\s*\*\s*0?\.9/);
  assert.doesNotMatch(main, /ctx\.moveTo\(cx,\s*cy\);\s*ctx\.arc\(cx,\s*cy,\s*q\.range\s*\*\s*s/);
  assert.match(main, /drawDungeonSystems\s*=\s*drawTruthfulCombatGeometry/);
});
test("Fold cover portrait and unfolded landscape layouts use safe areas and resize observers", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8"),
    main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
  assert.match(css, /@media\s*\(orientation:\s*portrait\)/);
  assert.match(css, /orientation:\s*portrait\) and \(max-width:\s*390px/);
  assert.match(css, /orientation:\s*landscape\) and \(max-height:\s*540px/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(main, /visualViewport\?\.addEventListener\(["']resize["']/);
  assert.match(main, /new ResizeObserver\(resize\)/);
  assert.match(main, /screen\.orientation\?\.addEventListener\(["']change["']/);
  assert.match(main, /input\.reset\(\)/);
});
