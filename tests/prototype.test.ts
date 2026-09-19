import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  generateRegion,
  generateDungeon,
  dungeonId,
  sectionExits,
  sectionSummary,
  sectionSites,
  regionalThreat,
  perceptionOverlay,
  apertureTier,
  apertureEncounterSpawns,
  perceived,
  wayfindingCues,
} from "../src/world.ts";
import { freshSave, migrateSave } from "../src/types.ts";
import { serializeSave, deserializeSave } from "../src/persistence.ts";
import { dodge, createCombatant, CREATURE_TRAITS, CREATURE_FORMS, enemyBodyRadius } from "../src/combat.ts";
import { generateItem, isValidItem, SPELLS } from "../src/items.ts";
import {
  Game,
  moveAxis,
  updateEnemyAI,
  settlementSanctuary,
  enforceSanctuary,
  attackInRange,
  enemyDangerRadius,
  selectMeleeAim,
  updateTraps,
  actionReadiness,
  settleProgression,
  awardExperience,
  characterStats,
  syncCharacterStats,
  footprintOpen,
  tileOpen,
  relocateIfStranded,
  footprintTouchesCanyon,
  footprintHazard,
  projectileTileOpen,
  updateProjectiles,
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
  progressLead,
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
test("player power outgrows static early-region enemies instead of treadmill scaling",()=>{
  const low=freshSave(),high=freshSave();high.level=50;syncCharacterStats(high);
  const a=new Game(low,0),b=new Game(high,0),earlyA=a.enemies.filter(e=>!e.apertureEncounter).map(e=>[e.kind,e.maxHp,e.damage]),earlyB=b.enemies.filter(e=>!e.apertureEncounter).map(e=>[e.kind,e.maxHp,e.damage]);
  assert.deepEqual(earlyB,earlyA);
  assert.ok(characterStats(high).meleeBonus>characterStats(low).meleeBonus+20);
  assert.ok(characterStats(high).magicBonus>characterStats(low).magicBonus+15);
});
test("Aperture adds rare exceptional encounters without scaling the regular roster",()=>{
  const region=generateRegion("aperture-encounters",0,0,1),counts=[0,0,0,0];
  for(let i=0;i<200;i++)for(const[tier,value]of [[0,0],[1,6],[2,18],[3,36]])counts[tier]+=apertureEncounterSpawns("aperture-encounters",`overworld:${i}:0:g1`,value,region.tiles).length;
  assert.equal(counts[0],0);
  assert.ok(counts[1]>0&&counts[1]<=counts[2]&&counts[2]<=counts[3]);
  const high=Array.from({length:200},(_,i)=>apertureEncounterSpawns("aperture-encounters",`overworld:${i}:0:g1`,36,region.tiles)[0]).find(Boolean);
  assert.equal(high.apertureEncounter,true);assert.equal(high.apertureTier,3);assert.ok(high.threatMultiplier>2);
  assert.deepEqual(generateRegion("aperture-encounters",0,0,1).enemySpawns,region.enemySpawns);
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
  assert.ok(d.sites.some((q) => q.kind === "checkpoint"));
});
test("Atlas section sites expose discovered structures at their local coordinates", () => {
  const s=freshSave(),sites=sectionSites("weather-housing",1,1,1,s);
  assert.ok(sites.every((q)=>Number.isFinite(q.x)&&Number.isFinite(q.y)));
  const remembered=structuredClone(s);remembered.checkpoints["9,9"]={rx:9,ry:9,x:7,y:11,name:"Old Glass"};
  assert.ok(sectionSites(remembered.seed,9,9,remembered.worldGeneration,remembered).some((q)=>q.kind==="checkpoint"&&q.x===7&&q.y===11));
});
test("ordinary Wayglass generation is sparse but nonzero",()=>{
  let checkpoints=0,total=0;
  for(let y=-18;y<=18;y++)for(let x=-18;x<=18;x++){if(x===0&&y===0||x===4&&y===-2||x===-5&&y===3)continue;total++;if(generateRegion("sparse-wayglass",x,y,1).objects.some(o=>o.kind==="checkpoint"))checkpoints++;}
  assert.ok(checkpoints>30);assert.ok(checkpoints/total<.12);
});
test("Atlas details do not reveal unvisited generated terrain",()=>{
  const source=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");
  assert.match(source,/if \(!save\.explored\[key\]\)/);
  assert.match(source,/uncharted\. No terrain or landmark data has been recorded/);
  const guard=source.indexOf("if (!save.explored[key])"),summary=source.indexOf("sectionSummary(save.seed",guard);
  assert.ok(guard>=0&&summary>guard);
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
test("jump ignores melee impact while spark ranged attacks launch visible bolts", () => {
  const make = (kind) => {
    const g = new Game(freshSave(), 0);
    g.map.tiles.fill({ blocked: false });
    g.rx=2;
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
  assert.equal(ranged.player.hp, hp);
  assert.equal(ranged.projectiles.length,1);
  ranged.update(0.02,idle(),120);
  assert.equal(ranged.player.hp,hp-10);
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
test("tool profiles support distinct straight and boomerang flight paths", async()=>{
  const {rangedWeapon}=await import("../src/items.ts"),{updateProjectiles}=await import("../src/game.ts"),
    map={tiles:Array.from({length:49},()=>({blocked:false}))},
    enemy={id:"turn-target",x:1.7,y:2,hp:30,maxHp:30,dead:false},
    shot={x:1.2,y:2.45,dx:1,dy:0,speed:4,life:2,damage:6,path:"boomerang",turnAfter:.6,age:0,returning:false,hits:{}};
  assert.equal(rangedWeapon({id:"spark-coil"}).path,"straight");
  assert.equal(rangedWeapon({name:"Lumen Spindle"}).path,"boomerang");
  let active=updateProjectiles([shot],[enemy],map,7,.25);
  assert.equal(enemy.hp,24);
  assert.equal(active.length,1);
  assert.equal(active[0].returning,false);
  active=updateProjectiles(active,[enemy],map,7,.4);
  assert.equal(active[0].returning,true);
  assert.equal(active[0].dx,-1);
  assert.equal(enemy.hp,24);
});
test("Rift Bombard detonates once at its aimed endpoint with a localized blast",async()=>{
  const {rangedWeapon}=await import("../src/items.ts"),{updateProjectiles}=await import("../src/game.ts"),w=rangedWeapon({name:"Rift Bombard"}),map={tiles:Array.from({length:49},()=>({blocked:false}))};
  assert.equal(w.path,"grenade");let blasts=0,p=[{id:"g",x:1,y:2,dx:1,dy:0,speed:4,life:.25,damage:16,path:"grenade",blastRadius:w.radius}];
  p=updateProjectiles(p,[],map,7,.25,()=>{},shot=>{blasts++;assert.equal(shot.blastRadius,2.15)});
  assert.equal(p.length,0);assert.equal(blasts,1);
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
  const tonicStock=velaShop(s).limited.ironbarkTonic;
  assert.equal(buyFromVela(s, "ironbarkTonic", 99).quantity, tonicStock);
  assert.equal(buyFromVela(s, "ironbarkTonic").ok, false);
  const item = velaShop(s).equipment[0],
    r = buyFromVela(s, item.id);
  assert.equal(r.ok, true);
  assert.equal(buyFromVela(s, item.id).ok, false);
  const round = deserializeSave(serializeSave(s));
  assert.deepEqual(round.shop, s.shop);
});
test("vendor essentials remain while limited stock and equipment rotate with exploration",async()=>{
  const {velaShop}=await import("../src/game.ts"),s=freshSave(),first=structuredClone(velaShop(s));
  for(let i=0;i<4;i++)s.explored[`${i+1},0`]=true;
  const next=velaShop(s);
  assert.equal(next.rotation,1);assert.notDeepEqual(next.equipment.map(i=>i.id),first.equipment.map(i=>i.id));assert.ok(next.limited.ironbarkTonic>=1);assert.ok(next.limited.lumenPhial>=1);
});
test("activated sparse Wayglass is physically restored after generation changes",()=>{
  const s=freshSave();s.session.rx=11;s.session.ry=13;s.checkpoints["11,13"]={rx:11,ry:13,x:8,y:9,name:"Remembered Light"};const g=new Game(s,0);g.rx=11;g.ry=13;g.loadArea("overworld",false);const mark=g.map.objects.find(o=>o.kind==="checkpoint");assert.ok(mark);assert.equal(mark.name,"Remembered Light");assert.equal(g.map.tiles[9*32+8].blocked,false);
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
  const overlapping = { id: "overlap", x: 1.65, y: 3, hp: 9 };
  assert.deepEqual(
    primaryAttackHits(
      p,
      [overlapping],
      map,
      7,
      primaryProfile({ id: "salvage-blade" }),
      { x: 1, y: 0 },
    ).map((x) => x.id),
    ["overlap"],
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
test("Attack and Tool buttons execute immediately and keep their selected mode",()=>{
  const g=new Game(freshSave(),0),press=(action)=>({state:{x:0,y:0},consume:key=>key===action});
  g.enemies=[];g.map.tiles.forEach(t=>t.blocked=false);g.save.lastAim={x:1,y:0};
  g.update(.016,press("attack"),1000);
  assert.equal(g.save.aimMode,"attack");assert.ok(g.player.meleeStrike);
  g.player.attackReadyAt=0;g.update(.016,press("tool"),2000);
  assert.equal(g.save.aimMode,"tool");assert.equal(g.save.toolMode,true);assert.equal(g.projectiles.length,1);
  g.player.attackReadyAt=0;g.update(.016,press("tool"),3000);
  assert.equal(g.save.aimMode,"tool");assert.equal(g.projectiles.length,2);
  g.player.attackReadyAt=0;g.update(.016,press("attack"),4000);
  assert.equal(g.save.aimMode,"attack");assert.equal(g.save.toolMode,false);
});
test("Act executes immediately stays selected and supports targeted world taps",()=>{
  const g=new Game(freshSave(),0),press=(action)=>({state:{x:0,y:0},consume:key=>key===action});
  g.update(.016,press("interact"),1000);
  assert.equal(g.save.aimMode,"act");assert.equal(g.save.toolMode,false);assert.ok(g.interactionRequested);
  const vela=g.map.objects.find(o=>o.id==="vendor-vela");
  g.interactionRequested=null;const result=g.interactAt(vela.x,vela.y);
  assert.equal(result.ok,true);assert.equal(g.interactionRequested,"vendor-vela");
  g.update(.016,press("attack"),2000);assert.equal(g.save.aimMode,"attack");
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
  let launched=false;
  assert.equal(updateEnemyAI(e, p, map, 10, 0.02, 3,null,()=>launched=true), false);
  assert.equal(launched,true);
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
test("closing temporary overlays resumes play without reopening Pause",()=>{
  const source=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");
  assert.match(source,/function pauseForOverlay\(\)[\s\S]*overlayPause = true;[\s\S]*pause\(false\)/);
  assert.match(source,/if \(overlayPause\) resume\(\);\s*else pausePanel\.showModal\(\)/);
  assert.match(source,/\$\("#mapClose"\)\.onclick = \(\) => atlas\.close\(\)/);
  assert.doesNotMatch(source,/\$\("#mapClose"\)[\s\S]{0,100}pause\(\)/);
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
  assert.match(source, /Math\.max\(0\.6, Math\.min\(3\.2/);
  assert.match(style, /#mapCanvas\s*\{[\s\S]*?touch-action:\s*none/);
});
test("expanded creature ecology is deterministic and recorded in the field codex", () => {
  const kinds=new Set();
  for(let y=-4;y<=4;y++)for(let x=-4;x<=4;x++)for(const e of generateRegion("ecology",x,y,1).enemySpawns)kinds.add(e.kind);
  for(const kind of ["ashenHound","veilMoth","rootBrute","coilStalker","cinderWisp"])assert.ok(kinds.has(kind),kind);
  const s=freshSave(),g=new Game(s,0);
  assert.equal(s.version,9);
  assert.ok(Object.keys(s.codex.creatures).length>=1);
  assert.equal(s.codex.places["terrain:"+g.map.dominant],true);
  const migrated=migrateSave({...freshSave(),version:8,codex:undefined});
  assert.equal(migrated.version,9);
  assert.deepEqual(migrated.codex,{creatures:{},places:{},features:{},variants:{}});
});
test("journal exposes encounter codex sections and an always-available symbol guide",()=>{
  const source=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");
  assert.match(source,/Creatures/);assert.match(source,/Places/);assert.match(source,/Features/);assert.match(source,/Rules & symbols/);assert.match(source,/Open ring — Wayglass/);
});
test("journal and pack expose illustrated field-card hooks",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
  assert.match(main,/CREATURE_PORTRAITS/);assert.match(main,/creature-portrait/);assert.match(main,/dataset\.slot = slot/);assert.match(css,/bestiary-atlas-v1\.png/);assert.match(css,/\.codex-card/);
});
test("production build packages offline image assets",()=>{
  const build=readFileSync(new URL("../scripts/build.mjs",import.meta.url),"utf8");
  assert.match(build,/new URL\('\.\.\/assets\//);assert.match(build,/recursive:true/);
});
test("compatible procedural traits create deterministic mechanical creature variants",()=>{
  const a=generateRegion("traits",8,-3,1),b=generateRegion("traits",8,-3,1);
  assert.deepEqual(a.enemySpawns,b.enemySpawns);
  assert.ok(a.enemySpawns.some(e=>e.traits.length));
  for(const e of a.enemySpawns){assert.ok(!(e.traits.includes("feral")&&e.traits.includes("plated")));for(const t of e.traits)assert.ok(CREATURE_TRAITS[t]);}
  const base=createCombatant("ashling",1,1),plated=createCombatant("ashling",1,1,false,["plated"]),swift=createCombatant("ashling",1,1,false,["swift"]);
  assert.ok(plated.maxHp>base.maxHp);assert.ok(swift.speedMultiplier>base.speedMultiplier);
  const s=freshSave(),g=new Game(s,0);g.transitionSection(8,-3);assert.ok(Object.keys(s.codex.variants).length);
});

test("creature classes vary scale independently of strength and limit segmented forms",()=>{
  const mite=createCombatant("glassMite",1,1),warden=createCombatant("sparkWarden",2,2),brute=createCombatant("rootBrute",3,3),marshal=createCombatant("hollowMarshal",4,4,true),coil=createCombatant("coilStalker",5,5),colossus=createCombatant("riftColossus",6,6,true),renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");
  assert.ok(mite.scale<1);assert.ok(warden.damage>mite.damage&&warden.scale<1.1);assert.ok(brute.scale>1.2);assert.ok(marshal.scale>=1.6);assert.ok(colossus.scale>2);assert.equal(coil.segments,3);assert.equal(colossus.segments,4);assert.equal(Object.values(CREATURE_FORMS).filter(f=>f.segments>1).length,2);assert.ok(enemyBodyRadius(colossus)>enemyBodyRadius(mite));
  assert.match(renderer,/segments > 1/);assert.match(renderer,/segmentSpacing/);assert.match(renderer,/e\.scale/);assert.match(renderer,/ctx\.ellipse\(cx, cy/);
});

test("large creature warnings use one truthful outer boundary without an obscuring inner barrier",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");
  assert.match(main,/large: \(Number\(e\.scale\) \|\| 1\) > 1\.25/);assert.match(main,/if \(!q\.large\) ctx\.fill\(\)/);assert.match(main,/radius: enemyDangerRadius\(e\)/);assert.doesNotMatch(renderer,/r \* 0\.72/);assert.doesNotMatch(renderer,/enemyDangerRadius/);
});

test("rotating creature wards are a rare explicit trait and scale outside the body",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),common=createCombatant("riftColossus",4,4,true),warded=createCombatant("riftColossus",4,4,true,["orbital"]);
  assert.equal(common.traits.includes("orbital"),false);assert.equal(warded.traits.includes("orbital"),true);assert.equal(CREATURE_TRAITS.orbital.name,"Orbital");assert.match(main,/e\.traits\?\.includes\("orbital"\)/);assert.match(main,/Math\.max\(\.68,\(Number\(e\.scale\)\|\|1\)\*\.62\)/);assert.doesNotMatch(main,/!e\.dead && e\.visualTier\) \{/);
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
test("standing settlements enforce a nine-tile sanctuary around residents",()=>{
  const s=freshSave(),g=new Game(s,0),z=settlementSanctuary(g.map,0,0,s),e=g.enemies[0];
  assert.equal(z.radius,9);Object.assign(e,{x:16,y:16,telegraph:1});assert.equal(enforceSanctuary(e,z),true);assert.ok(Math.hypot(e.x-16,e.y-16)>9);assert.equal(e.telegraph,0);
  s.consequences.settlements['ember-refuge'].status='fallen';assert.equal(settlementSanctuary(g.map,0,0,s),null);
});
test("Signal Ledger leads persist track and award a complete story arc",()=>{
  const s=freshSave(),board=generateRegion(s.seed,0,0,1).objects.find(o=>o.kind==='questBoard');
  assert.ok(board);assert.equal(applyInteraction(board,'inspect',s).ok,true);assert.equal(s.narrative.facts['leads.active'],true);
  progressLead(s,'distance');progressLead(s,'hunt');progressLead(s,'guardian');
  assert.equal(s.narrative.facts['leads.complete'],true);assert.equal(s.currency,38);assert.equal(s.consumables.restorativeDraught,5);assert.match(currentObjective(s),/Signal Ledger|Missing Crossing/);
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

test("regional environment is deterministic, dense, and keeps a safe bridge", () => {
  let found = null;
  for (let y = -6; y <= 6 && !found; y++) {
    const region = generateRegion("environment-network", 2, y, 1);
    if (region.environment) found = region;
  }
  assert.ok(found, "expected a river or canyon within the sampled world bands");
  assert.deepEqual(found, generateRegion("environment-network", found.rx, found.ry, 1));
  assert.ok(found.objects.filter(o => o.kind === "tree").length >= 8);
  assert.ok(found.objects.filter(o => o.kind === "rock").length >= 3);
  const obstacle = found.tiles.filter(t => t.environment && t.kind !== "bridge");
  const bridge = found.tiles.filter(t => t.kind === "bridge" && t.bridgeOver);
  assert.ok(obstacle.length > 0);
  assert.ok(obstacle.every(t => t.blocked));
  assert.ok(bridge.length >= 3);
  assert.ok(bridge.every(t => !t.blocked));
});

test("cutting a designated bank tree creates and preserves a real log crossing",()=>{
  const s=freshSave();let region,tree;for(let y=-8;!tree&&y<=8;y++)for(let x=-8;!tree&&x<=8;x++){const q=generateRegion(s.seed,x,y,1),t=q.objects.find(o=>o.crossingTiles?.length);if(t){region=q;tree=t}}assert.ok(tree);Object.assign(s.session,{area:"overworld",rx:region.rx,ry:region.ry,x:tree.x,y:tree.y});s.position={area:"overworld",rx:region.rx,ry:region.ry,x:tree.x,y:tree.y};const g=new Game(s,0),live=g.map.objects.find(o=>o.id===tree.id);assert.equal(g.interact("cut",live.id).ok,true);assert.ok(live.crossingTiles.every(p=>{const t=g.map.tiles[p.y*32+p.x];return t.kind==="logBridge"&&!t.blocked}));g.exportSnapshot(0);const resumed=new Game(s,0),again=resumed.map.objects.find(o=>o.id===tree.id);assert.equal(again.state,"fallen");assert.ok(again.crossingTiles.every(p=>resumed.map.tiles[p.y*32+p.x].kind==="logBridge"));
});

test("environment interactions persist distinct tree and boulder states", () => {
  const save = freshSave(), tree = {id:"env-tree-test",kind:"tree",state:"standing",actions:["cut","ignite"],environmental:true};
  assert.equal(applyInteraction(tree,"ignite",save).ok,true);
  assert.equal(tree.state,"charred");
  assert.equal(save.worldFlags["env-tree-test:ignite"],true);
  const rock = {id:"env-rock-test",kind:"rock",state:"sealed",actions:["move","break"],environmental:true};
  save.stats.Might=3;
  assert.equal(applyInteraction(rock,"break",save).ok,true);
  assert.equal(rock.state,"broken");
  assert.equal(save.worldFlags["env-rock-test:break"],true);
  assert.equal(save.worldFlags["rock-1:opened"],undefined);
});

test("Pack spell cards do not reference an undefined inventory item", () => {
  const source=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");
  assert.doesNotMatch(source,/row\.dataset\.slot\s*=\s*item\.slot/);
  assert.match(source,/row\.dataset\.slot\s*=\s*["']spell["']/);
});

test("combat grants repeatable marks with larger exceptional rewards", () => {
  const ordinary=freshSave(),g=new Game(ordinary,0),before=ordinary.currency,e=g.enemies[0];g.defeatEnemy(e);assert.ok(ordinary.currency>before);
  const bossSave=freshSave(),bossGame=new Game(bossSave,0),boss={...bossGame.enemies[0],id:"reward-boss",boss:true,rewarded:false},bossBefore=bossSave.currency;bossGame.defeatEnemy(boss);assert.equal(bossSave.currency-bossBefore,12);
});

test("weather and open-world shacks are deterministic bounded environment features", () => {
  const weather=new Set(),shacks=[];
  for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++){const a=generateRegion("weather-housing",x,y,1),b=generateRegion("weather-housing",x,y,1);assert.equal(a.weather,b.weather);weather.add(a.weather);shacks.push(...a.objects.filter(o=>o.kind==="shack"));}
  assert.ok(weather.has("rain"));assert.ok(weather.has("snow"));assert.ok(weather.has("sunbreak"));assert.ok(shacks.length>0);assert.ok(shacks.every(o=>o.bounds?.w>=6&&o.bounds?.w<=9&&o.bounds?.h>=5&&o.bounds?.h<=7));assert.ok(new Set(shacks.map(o=>`${o.bounds.w}x${o.bounds.h}`)).size>3);assert.ok(new Set(shacks.map(o=>o.facadeStyle)).size>=4);assert.ok(new Set(shacks.map(o=>o.condition)).size>=5);assert.ok(shacks.every(o=>o.door?.side==="south"&&o.roofProfile&&o.entrances?.length));assert.ok(shacks.some(o=>o.door.width===2));assert.ok(shacks.some(o=>o.entrances.length>1));
});

test("field shelters fully conceal interiors and use continuous architectural facades",()=>{
  const renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");assert.match(renderer,/t\.structure === "shackWall"/);assert.match(renderer,/activeBuildingId === t\.buildingId/);assert.match(renderer,/inside=insideShelter\(o,p\)/);assert.match(renderer,/if\(inside\).*strokeRect/);assert.match(renderer,/frontY=y\+h-s\*3\.12/);assert.match(renderer,/facadeStyle/);assert.match(renderer,/roofProfile/);assert.match(renderer,/condition===\"collapsed\"/);assert.match(renderer,/condition===\"overgrown\"/);assert.match(renderer,/quadraticCurveTo/);assert.match(renderer,/function shelterSigil/);assert.match(renderer,/backY=y\+s\*\.16/);assert.doesNotMatch(renderer,/inside=p\.x>=b\.x\+1/);assert.match(renderer,/const windows=Math\.max/);
});

test("shelter walls use thin physical edges and reveal only from true interior floor",()=>{
  let region,shelter;for(let y=-12;!shelter&&y<=12;y++)for(let x=-12;!shelter&&x<=12;x++){const q=generateRegion("thin-shelter",x,y,1),o=q.objects.find(v=>v.kind==="shack");if(o){region=q;shelter=o}}
  assert.ok(shelter);const b=shelter.bounds,west=region.tiles[(b.y+2)*32+b.x],interior=region.tiles[(b.y+2)*32+b.x+1];assert.equal(west.structure,"shackWall");assert.equal(west.blocked,false);assert.deepEqual(west.wallSides,["west"]);assert.equal(interior.structure,"shackInterior");assert.equal(tileOpen(region,32,b.x+.12,b.y+2.5),false);assert.equal(tileOpen(region,32,b.x+.32,b.y+2.5),true);
});

test("player remains foregrounded while approaching a shelter entrance",()=>{
  const renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");assert.match(renderer,/const frontShelter=g\.map\.objects\.find/);assert.match(renderer,/p\.y>=o\.bounds\.y\+o\.bounds\.h-1/);assert.match(renderer,/if\(frontShelter\)actor\(ctx,p\.x,p\.y-lift\/s/);
});

test("shelter cutaway remains active beside every thin interior wall",()=>{
  const renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");assert.match(renderer,/function insideShelter/);assert.match(renderer,/cx=p\.x\+\.5,cy=p\.y\+\.7,inset=\.22/);assert.match(renderer,/activeShelter=g\.map\.objects\.find\(o=>o\.kind===\"shack\"&&insideShelter\(o,p\)\)/);assert.doesNotMatch(renderer,/structure===\"shackInterior\"\|\|q\?\.structure/);
});

test("journal renders the same minimalist trail marks used on the floor",()=>{
  const source=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(source,/function trailMark/);assert.match(source,/Open ring — Wayglass/);assert.match(source,/Open chevron — Crossing/);assert.match(source,/Hollow triangle — Major danger/);assert.match(source,/Open spiral — Unusual site/);assert.match(source,/MAJOR THREAT/);assert.match(source,/SITE REACHED/);assert.match(html,/id="eventBanner"/);
});

test("world discovery banners identify their destination and suppress activated Wayglasses",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");assert.match(main,/WAYGLASS REACHED/);assert.match(main,/CROSSING REACHED/);assert.match(main,/CORRIDOR BREACH/);assert.match(main,/SITE REACHED/);assert.match(main,/q\.kind===\"checkpoint\"&&activatedHere/);assert.doesNotMatch(main,/UNUSUAL SITE REACHED/);
});

test("Atlas shows unresolved distant signals without revealing intervening terrain",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");assert.match(main,/signalBySection=new Map/);assert.match(main,/!seen && !frontier && !signal/);assert.match(main,/drawWaymarkIcon\(mctx,signal\.signalKind/);assert.match(main,/UNRESOLVED SIGNAL/);assert.match(main,/signals\.length} unresolved signals/);
});

test("rare architectural districts provide deterministic city arcology and cloister exploration",()=>{
  const districts=[],styles=new Set(),shapes=new Set(),sizes=new Set(),uses=new Set(),profiles=new Set();
  for(let y=-22;y<=22;y++)for(let x=-22;x<=22;x++){const a=generateRegion("architectural-texture",x,y,1),b=generateRegion("architectural-texture",x,y,1);if(a.district){assert.deepEqual(a,b);districts.push(a);styles.add(a.district.style);}}
  assert.ok(districts.length>8&&districts.length<130);assert.deepEqual([...styles].sort(),["arcology","city","cloister"]);
  for(const region of districts.slice(0,30)){const buildings=region.objects.filter(o=>o.kind==="architecturalBuilding");assert.ok(buildings.length>=2);for(const building of buildings){assert.equal(region.tiles[building.door.y*32+building.door.x].blocked,false);assert.equal(region.tiles[building.door.y*32+building.door.x].structure,"districtDoor");assert.ok(building.entrances?.length>=1);for(const entrance of building.entrances){assert.equal(region.tiles[entrance.y*32+entrance.x].blocked,false);assert.equal(region.tiles[entrance.y*32+entrance.x].structure,"districtDoor")}assert.ok(building.bounds.w>=7&&building.bounds.h>=6);assert.ok(building.footprint.length>20);shapes.add(building.shape);sizes.add(`${building.bounds.w}x${building.bounds.h}`);uses.add(building.buildingUse);profiles.add(building.roofProfile)}assert.ok(sectionSites(region.seed,region.rx,region.ry,1).some(o=>o.kind==="architecturalDistrict"));}
  assert.deepEqual([...shapes].sort(),["notched","rect","wing"]);assert.ok(sizes.size>=8);assert.ok(uses.size>=10);assert.deepEqual([...profiles].sort(),["flat","gable","spire","stepped"]);
});

test("building roofs conceal contents outside and cut away only in their own interior",()=>{
  const renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");assert.match(renderer,/pt\?\.buildingId===o\.id/);assert.match(renderer,/if\(inside\).*return/);assert.match(renderer,/for\(const o of g\.map\.objects\).*architecturalBuilding/);assert.match(renderer,/roofs render after actors so exterior views conceal contents/);assert.match(renderer,/facadeRhythm/);assert.match(renderer,/roofProfile/);assert.match(renderer,/districtDoor/);
});

test("Atlas pans from compact discovery records and details only current or selected sections",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),game=readFileSync(new URL("../src/game.ts",import.meta.url),"utf8"),renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");assert.match(game,/this\.save\.atlas \|\|=/);assert.match(game,/terrain: this\.map\.dominant/);assert.match(main,/save\.atlas\?\.\[key\]/);assert.match(main,/w \/ \(2 \* cell\)/);assert.match(main,/detailed\?sites:compact/);assert.doesNotMatch(main,/const region = generateRegion\(save\.seed, rx, ry/);assert.match(renderer,/ctx\.beginPath\(\);for\(const c of cells\)ctx\.rect/);assert.equal((renderer.match(/new Set\(cells\.map/g)||[]).length,1);
});

test("district streets and every walk-in building remain reachable from the section hub",()=>{
  let region;for(let y=-30;!region&&y<=30;y++)for(let x=-30;!region&&x<=30;x++){const q=generateRegion("district-reachability",x,y,1);if(q.district)region=q}assert.ok(region);
  const seen=new Set(["16,16"]),queue=[[16,16]];while(queue.length){const [x,y]=queue.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(a>=0&&a<32&&b>=0&&b<32&&!seen.has(k)&&!region.tiles[b*32+a].blocked){seen.add(k);queue.push([a,b])}}}
  for(const building of region.objects.filter(o=>o.kind==="architecturalBuilding")){assert.ok(seen.has(`${building.door.x},${building.door.y}`));assert.ok(seen.has(`${building.x},${building.y}`));}
});

test("resume safety relocates a stranded save without carving changed world geometry",()=>{
  let q;for(let y=-25;!q&&y<=25;y++)for(let x=-25;!q&&x<=25;x++){const r=generateRegion("CINDER-VERGE-47",x,y,1);if(r.district)q=r}assert.ok(q);const wall=q.tiles.find(t=>t.structure==="districtWall"),s=freshSave();Object.assign(s.session,{rx:q.rx,ry:q.ry,x:wall.x+.2,y:wall.y+.2});s.position={area:"overworld",rx:q.rx,ry:q.ry,x:wall.x+.2,y:wall.y+.2};const g=new Game(s,0);assert.equal(g.map.tiles[wall.y*32+wall.x].blocked,true);assert.equal(footprintOpen(g.map,32,g.player.x,g.player.y),true);assert.match(g.message,/nearest stable ground/);
});

test("resume safety preserves valid positions exactly and handles any blocked terrain",()=>{
  const map={tiles:Array.from({length:25},(_,i)=>({x:i%5,y:Math.floor(i/5),blocked:false}))},valid={x:2.125,y:2.25};assert.equal(relocateIfStranded(valid,map,5),false);assert.deepEqual(valid,{x:2.125,y:2.25});map.tiles[2*5+2].blocked=true;const stranded={x:2.125,y:2.25};assert.equal(relocateIfStranded(stranded,map,5),true);assert.equal(footprintOpen(map,5,stranded.x,stranded.y),true);assert.notDeepEqual(stranded,{x:2.125,y:2.25});
});

test("district inspection records optional architectural lore",()=>{
  const s=freshSave(),o={id:"district-test",kind:"architecturalDistrict",name:"Hollow Ward",districtStyle:"city",state:"unread",actions:["inspect"]},result=applyInteraction(o,"inspect",s,"overworld:8,8:g1");assert.equal(result.ok,true);assert.equal(result.transition,"district");assert.ok(s.narrative.journal.some(j=>j.title==="Hollow Ward"));
});

test("equipped gear uses deterministic family silhouettes elemental accents and power marks",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");
  assert.match(main,/function itemIconDescriptor/);assert.match(main,/"pike"/);assert.match(main,/"cleaver"/);assert.match(main,/"sword"/);assert.match(main,/"bombard"/);assert.match(main,/"spindle"/);assert.match(main,/"caster"/);assert.match(main,/"mantle"/);assert.match(main,/"coat"/);assert.match(main,/gearIcon\(item,slot\)/);assert.match(main,/dataset\.family/);assert.match(main,/Math\.ceil\(q\.power\/3\)/);assert.match(css,/\.gear-icon/);assert.doesNotMatch(css,/\.gear-card::before/);
});

test("journal trail examples invoke the exact ground-waymark drawing function",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");
  assert.match(renderer,/export function drawWaymarkIcon/);assert.match(renderer,/drawWaymarkIcon\(ctx,o\.signalKind,s\)/);assert.match(main,/import \{ screenToWorld, drawWaymarkIcon \}/);assert.match(main,/drawWaymarkIcon\(ctx,signal,82\)/);assert.doesNotMatch(main,/M 13 0 A 13 13/);
});

test("rare shelters host deterministic merchants creatures and displacement thresholds",()=>{
  const kinds=new Set();for(let y=-30;y<=30;y++)for(let x=-30;x<=30;x++){const a=generateRegion("shelter-surprises",x,y,1),b=generateRegion("shelter-surprises",x,y,1),q=a.objects.find(o=>["shelterMerchant","shelterCreature","displacementDevice"].includes(o.kind));assert.deepEqual(a,b);if(q){kinds.add(q.kind);assert.equal(a.tiles[Math.floor(q.y)*32+Math.floor(q.x)].structure,"shackInterior")}}
  assert.deepEqual([...kinds].sort(),["displacementDevice","shelterCreature","shelterMerchant"]);
});

test("shelter creature gifts are once-only and displacement travel is explicitly guarded",()=>{
  const s=freshSave(),c={id:"gift",kind:"shelterCreature",name:"Hearth Moth",gift:"aperture",state:"watching",actions:["commune"]};assert.equal(applyInteraction(c,"commune",s,"overworld:2:3:g1").ok,true);const value=s.perception.aperture;applyInteraction(c,"commune",s,"overworld:2:3:g1");assert.equal(s.perception.aperture,value);
  const game=readFileSync(new URL("../src/game.ts",import.meta.url),"utf8");assert.match(game,/activeDisplacement/);assert.match(game,/displacementJourney/);assert.match(game,/guardian lives/);assert.match(game,/Reach a physical Wayglass/);
});

test("canyons kill grounded wayfarers but do not block either side's projectiles",()=>{
  const map={tiles:Array.from({length:25},(_,i)=>({x:i%5,y:Math.floor(i/5),kind:"ash",blocked:false}))};map.tiles[2*5+2]={x:2,y:2,kind:"canyon",blocked:true,environment:"canyon"};
  assert.equal(projectileTileOpen(map,5,2.5,2.5),true);assert.equal(tileOpen(map,5,2.5,2.5),false);assert.equal(footprintTouchesCanyon(map,5,1.5,1.5),true);
  const enemy=createCombatant("ashling",3,2),shots=[{id:"cross",x:1.2,y:2.45,dx:1,dy:0,speed:5,life:1,damage:9,path:"straight",hits:{}}];
  updateProjectiles(shots,[enemy],map,5,.45);assert.ok(enemy.hp<enemy.maxHp);
  const s=freshSave(),g=new Game(s,0);g.map.tiles=Array.from({length:1024},(_,i)=>({x:i%32,y:Math.floor(i/32),kind:"ash",blocked:false}));g.player.x=1;g.player.y=1;g.map.tiles[1*32+2]={x:2,y:1,kind:"canyon",blocked:true,environment:"canyon"};g.update(.3,{state:{x:1,y:0},consume:()=>false},100);assert.equal(s.worldFlags.deaths,1);assert.match(g.message,/Lost to the canyon/);
});

test("void sentinels are rare deterministic deep-region creatures with animated appendages",()=>{
  let found=null,count=0;for(let y=-25;y<=25;y++)for(let x=-25;x<=25;x++){const a=generateRegion("sentinel-ecology",x,y,1),b=generateRegion("sentinel-ecology",x,y,1);assert.deepEqual(a,b);for(const e of a.enemySpawns)if(e.kind==="voidSentinel"){found=e;count++;assert.ok(Math.abs(x)+Math.abs(y)>7)}}assert.ok(found);assert.ok(count<300);
  const c=createCombatant("voidSentinel",4,4);assert.equal(c.tentacles,7);assert.ok(c.range>=6);const renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");assert.match(renderer,/kind==="voidSentinel"/);assert.match(renderer,/Math\.sin\(Number\(frame\)\*\.18/);
});

test("Atlas imports its wayfinding dependency and frame errors cannot terminate animation",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8");assert.match(main,/wayfindingCues,\s*\} from "\.\/world\.ts"/);assert.match(main,/function frame\(now\) \{\s*try \{/);assert.match(main,/finally \{\s*requestAnimationFrame\(frame\)/);
});

test("full-footprint shelter collision prevents doorway wall pockets",()=>{
  const map={tiles:Array.from({length:25},(_,i)=>({x:i%5,y:Math.floor(i/5),kind:"ash",blocked:false}))};map.tiles[2*5+2]={x:2,y:2,kind:"ash",blocked:false,structure:"shackWall",wallSides:["south"]};const p={x:1,y:2.2};moveAxis(p,1,0,map,5);assert.ok(p.x<2,"cannot slide sideways into the thin south-wall pocket");
  map.tiles[2*5+2]={...map.tiles[2*5+2],structure:"shackDoor",wallSides:[]};const door={x:1,y:2.2};moveAxis(door,1,0,map,5);assert.ok(door.x>1.8,"the actual doorway remains passable");
});

test("ranged ecology mixes visible bolts with uncanny instant strikes",()=>{
  const bolt=createCombatant("sparkWarden",2,2),instant=createCombatant("veilMoth",2,2),map={tiles:Array.from({length:100},()=>({kind:"ash",blocked:false}))},p={x:3,y:2};bolt.telegraph=instant.telegraph=.01;let shots=0;assert.equal(updateEnemyAI(bolt,p,map,10,.02,1,null,()=>shots++),false);assert.equal(shots,1);assert.equal(instant.instantStrike,true);assert.equal(updateEnemyAI(instant,p,map,10,.02,1,null,()=>shots++),true);assert.equal(shots,1);
});

test("release 68 loads one coherent version across the entire module graph",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8"),sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
  const build=readFileSync(new URL("../scripts/build.mjs",import.meta.url),"utf8");
  assert.match(html,/styles\.css\?v=68/);assert.match(html,/sw\.js\?v=\$\{release\}/);assert.match(html,/main\.js\?v=68/);assert.match(html,/controllerchange/);
  assert.match(sw,/infinite-corridor-v68/);assert.match(sw,/styles\.css\?v=68/);assert.match(sw,/main\.js\?v=68/);assert.match(sw,/combat\.js\?v=68/);assert.match(sw,/renderer\.js\?v=68/);
  assert.match(build,/release='68'/);assert.match(build,/\.js\?v=\$\{release\}/);
});

test("water is lethal to footprints but transparent to projectiles",()=>{
  const map={tiles:Array.from({length:16},(_,i)=>({x:i%4,y:Math.floor(i/4),kind:"ash",blocked:false}))};
  map.tiles[5]={x:1,y:1,kind:"river",blocked:true,environment:"river"};
  assert.equal(footprintHazard(map,4,.8,.4),"river");
  assert.equal(projectileTileOpen(map,4,1.5,1.5),true);
  map.tiles[5]={...map.tiles[5],kind:"bridge",blocked:false,bridgeOver:"river"};
  assert.equal(footprintHazard(map,4,.8,.4),null);
});

test("ambient fauna stay sparse, deterministic, passive, and recognizable",()=>{
  let found=null;
  for(let y=-12;y<=12&&!found;y++)for(let x=-12;x<=12&&!found;x++){const a=generateRegion("quiet-ecology",x,y,1),b=generateRegion("quiet-ecology",x,y,1);assert.deepEqual(a,b);found=a.enemySpawns.find(e=>e.ambient);}
  assert.ok(found);assert.ok(["graze","follow","vanish"].includes(found.passiveBehavior));assert.ok(["mossGrazer","lanternDoe","hushling"].includes(found.kind));
  const e=createCombatant(found.kind,3,3);e.ambient=true;e.passiveBehavior=found.passiveBehavior;const map={tiles:Array.from({length:100},()=>({kind:"ash",blocked:false}))},p={x:3.5,y:3.5};assert.equal(updateEnemyAI(e,p,map,10,.1,1,null,()=>assert.fail("passive fauna cannot fire")),false);
});

test("danger waymarks fill only their forward corner while other silhouettes point naturally",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),renderer=readFileSync(new URL("../src/renderer.ts",import.meta.url),"utf8");
  assert.match(renderer,/if\(signalKind==='danger'\).*lineTo\(s\*\.07,-s\*\.09\).*lineTo\(s\*\.07,s\*\.09\)/);assert.doesNotMatch(renderer,/lineTo\(s\*\.43,0\)/);assert.match(main,/open side of the ring faces the route/);assert.match(main,/vertex where the two lines meet points toward the crossing/);assert.match(main,/corner filled with a red wedge faces the route/);assert.match(main,/open end of the spiral faces the route/);assert.match(main,/canvas\.width=canvas\.height=96/);
});

test("Map defaults to a bounded dungeon floor plan and toggles simply to the Corridor Atlas",()=>{
  const main=readFileSync(new URL("../src/main.ts",import.meta.url),"utf8"),html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(html,/id="mapTitle"/);assert.match(html,/id="mapModeToggle"/);assert.match(html,/id="mapLegend"/);
  assert.match(main,/function drawDungeonMap/);assert.match(main,/size=24/);assert.match(main,/game\.map\.tiles/);assert.match(main,/game\.map\.objects/);assert.match(main,/game\.player\.x/);assert.match(main,/mapMode = game\.area === "dungeon" \? "dungeon" : "atlas"/);assert.match(main,/mapMode=mapMode==="dungeon"\?"atlas":"dungeon"/);assert.match(main,/local\?"Corridor Atlas":"Dungeon Map"/);assert.match(main,/if\(mapMode==="dungeon"\)return/);
});
