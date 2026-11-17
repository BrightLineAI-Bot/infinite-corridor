import test from "node:test";
import assert from "node:assert/strict";
import { freshSave } from "../src/types.ts";
import { deserializeSave, serializeSave } from "../src/save-codec.ts";
import {
  TRICERATOPS_RIDE, damagePersistentMount, mountById, noteBeastRecoveryTransition,
  noteRideSection, releaseMount, retrieveBeast, stableMount, startRide, tickRide,
} from "../src/beast-mounts.ts";

const capture = (save, disposition = "good") =>
  stableMount(save, "triceratops", { triceratopsDisposition: disposition }).mount;
const reload = (save) => deserializeSave(serializeSave(save));

test("normal and Silly Goose unlocks survive travel, stable turnover, and reload", () => {
  let save = freshSave();
  const normal = capture(save), silly = capture(save, "silly");
  assert.notEqual(normal.id, silly.id);
  assert.equal(capture(save, "bad").id, normal.id);
  startRide(save, normal.id);
  tickRide(save, 10_000);
  for (let i = 0; i < 60; i++) noteRideSection(save, i + ",0");
  for (const beast of ["stalker", "briarStag", "ashenMoth", "mountainTurtle"]) stableMount(save, beast);
  assert.equal(releaseMount(save, normal.id), null);
  save = reload(save);
  assert.equal(save.version, 14);
  assert.equal(save.mounts.riding, normal.id);
  assert.equal(mountById(save, silly.id)?.variant, "silly");
  assert.equal(save.mounts.stable.filter(m => m.beast !== "triceratops").length, 3);
});

test("puncture blocks resummon and requires resolving the persistent early encounter", () => {
  let save = freshSave();
  const { id } = capture(save);
  startRide(save, id);
  assert.equal(damagePersistentMount(save, 1, { puncture: true, home: "6,3", location: "6,3" })?.admitted, true);
  save = reload(save);
  assert.equal(startRide(save, id), null);
  assert.equal(retrieveBeast(save, id), null);
  const mount = mountById(save, id);
  assert.equal(mount.recovery.reason, "puncture");
  assert.equal(mount.recovery.homeAtAdmission, "6,3");
  mount.recovery.encounterComplete = true;
  save = reload(save);
  assert.equal(retrieveBeast(save, id)?.hp, TRICERATOPS_RIDE.health);
  assert.equal(startRide(save, id)?.id, id);
});

test("three distinct depletions admit once and backtracking cannot farm recovery", () => {
  let save = freshSave();
  const { id } = capture(save);
  for (let defeat = 1; defeat <= 3; defeat++) {
    assert.equal(startRide(save, id)?.id, id);
    assert.equal(damagePersistentMount(save, TRICERATOPS_RIDE.health, { location: "0,0" })?.admitted, defeat === 3);
    assert.equal(damagePersistentMount(save, TRICERATOPS_RIDE.health), null);
    save = reload(save);
  }
  for (let i = 0; i < 20; i++) {
    noteBeastRecoveryTransition(save, "1,0");
    noteBeastRecoveryTransition(save, "0,0");
  }
  assert.equal(mountById(save, id)?.recovery.progress, 1);
  for (let i = 2; i < 40; i++) noteBeastRecoveryTransition(save, i + ",0");
  assert.equal(mountById(reload(save), id)?.recovery.progress, TRICERATOPS_RIDE.recoveryTransitions);
});
import { Game } from "../src/game.ts";
import { updatePackMonster, freshPackState } from "../src/monster-pack.ts";
import { placeBuild, enclosureAt } from "../src/building.ts";
import { createLabFixture } from "../src/proving-ground-labs.ts";

test("living Triceratops can be penned with the real Build action and called from the stable", () => {
  for (const disposition of ["good", "silly", "bad"]) {
    const save = freshSave();
    save.seed = "TRIKE-PEN";
    Object.assign(save.materials, { wood: 400, stone: 400, cinderIron: 400 });
    const game = new Game(save, 0);
    game.rx = 4; game.ry = 3; game.loadArea("overworld", false);
    for (const tile of game.map.tiles) Object.assign(tile, {
      kind: "grass", blocked: false, structure: null, buildingId: null, door: null,
      slope: null, elev: 0, environment: null, enclosure: undefined, chasm: undefined,
    });
    game.map.objects = [];
    game.builds = [];
    const foe = game.createEnemyFromSpawn({
      id: "trike-" + disposition, kind: "triceratops", triceratopsDisposition: disposition, x: 10.5, y: 8,
    }, "overworld");
    foe.hp = 1;
    game.enemies = [foe];
    let caught = false;
    for (let attempt = 0; attempt < 40 && !caught; attempt++) {
      Object.assign(game.player, { x: 10, y: 6, facing: "down" });
      assert.equal(placeBuild(game, 10, 7, "enclosure").ok, true);
      const pen = game.builds.at(-1);
      foe.x = pen.x + pen.size / 2 - .5;
      foe.y = pen.y + pen.size / 2 - .75;
      assert.equal(enclosureAt(game, foe.x + .5, foe.y + .75), pen);
      game.player.y = pen.y - pen.size - 2;
      const close = placeBuild(game, 10, pen.y - pen.size, "enclosure");
      assert.equal(close.ok, true, close.message);
      caught = /is caught/.test(close.message);
      if (!caught) assert.match(close.message, /slips out/);
    }
    assert.equal(caught, true, disposition);
    const mount = save.mounts.stable[0];
    assert.equal(mount.variant, disposition === "silly" ? "silly" : "normal");
    assert.equal(game.summonMount(mount.id).ok, true);
    assert.equal(game.mountRide()?.id, mount.id);
  }
});

test("the selected hometown's hotel opens, persists its fight, and retrieves a companion", () => {
  let save = freshSave();
  save.seed = "TRIKE-HOTEL";
  save.hometowns = { home: "4,3", towns: [{ rx: 4, ry: 3, name: "West Reach", listener: 1 }] };
  const { id } = capture(save);
  startRide(save, id);
  damagePersistentMount(save, 1, { puncture: true, home: "4,3", location: "4,3" });
  let game = new Game(save, 0);
  assert.equal(game.map.objects.some(o => o.beastHotelDoor), false);
  game.rx = 4; game.ry = 3; game.loadArea("overworld");
  const door = game.map.objects.find(o => o.beastHotelDoor);
  assert.ok(door);
  Object.assign(game.player, { x: door.x, y: door.y });
  game.rite = true;
  assert.equal(game.interact("enter", door.id).riteSealed, true);
  game.rite = false;
  assert.equal(game.interact("enter", door.id).ok, true);
  assert.equal(game.map.beastHotel, true);
  assert.equal(game.enemies.length, 0);
  const bed = game.map.objects.find(o => o.mountId === id);
  Object.assign(game.player, { x: bed.x, y: bed.y });
  assert.equal(game.interact("visit", bed.id).ok, true);
  const opponentId = game.enemies[0].id;
  assert.ok(opponentId);
  game.enemies[0].hp = 37;
  game.snapshotArea(false);
  game.sync();
  save = reload(save);
  game = new Game(save, 0);
  assert.equal(game.map.beastHotel, true);
  assert.equal(game.enemies[0].id, opponentId);
  assert.equal(game.enemies[0].hp, 37);
  const opponent = game.enemies[0];
  opponent.hp = 1;
  Object.assign(game.player, { x: opponent.x, y: opponent.y - 1, facing: "down" });
  const actions = new Set(["attack"]);
  const input = { state: { x: 0, y: 0 }, consume: action => actions.delete(action), held: () => false };
  for (let now = 1100; now < 2350 && !opponent.dead; now += 25) game.update(.025, input, now);
  assert.equal(opponent.dead, true);
  Object.assign(game.player, { x: bed.x, y: bed.y });
  assert.equal(game.interact("visit", bed.id).ok, true);
  assert.equal(mountById(save, id)?.recovery, null);
  assert.equal(game.mountRide()?.id, id);
  assert.equal(game.leaveDungeon(), true);
  assert.equal(game.area, "overworld");
  assert.deepEqual([game.rx, game.ry], [4, 3]);
});

test("the scratch capture and hotel fixtures expose ordinary entry points", () => {
  const dispositions = ["good", "silly", "bad"];
  const actors = dispositions.map(disposition => {
    const { game } = createLabFixture({ lab: "triceratops-recovery", scenario: "triceratops-" + disposition, seed: "TRIKE-LAB" });
    assert.equal(game.area, "overworld");
    assert.equal(game.enemies.length, 1);
    return game.enemies[0];
  });
  assert.deepEqual(actors.map(e => e.triceratopsDisposition), dispositions);
  assert.equal(new Set(actors.map(e => e.scale)).size, 1);
  const { game, save } = createLabFixture({ lab: "triceratops-recovery", scenario: "triceratops-hotel", seed: "TRIKE-LAB" });
  const mount = save.mounts.stable[0];
  for(let i = 1; i <= TRICERATOPS_RIDE.recoveryTransitions; i++) noteBeastRecoveryTransition(save, "world:" + i + ",0");
  const door = game.map.objects.find(o => o.beastHotelDoor);
  assert.ok(door);
  assert.equal(game.enterBeastHotel(door).ok, true);
  assert.equal(game.map.objects.find(o => o.mountId === mount.id)?.state, "healthy");
  assert.ok(game.enemies.find(e => e.beastHotelOpponent === mount.id));
  assert.equal(retrieveBeast(save, mount.id), null);
});

test("an accepted hostile horn contact admits a ridden Triceratops", () => {
  const { game, save } = createLabFixture({ lab: "triceratops-recovery", scenario: "triceratops-bad", seed: "TRIKE-HORN" });
  const mount = capture(save);
  assert.equal(game.summonMount(mount.id).ok, true);
  const foe = game.enemies[0];
  game.player.x = 10; game.player.y = 8;
  foe.x = 9; foe.y = 8;
  foe.aggro = true;
  foe.pack = { ...freshPackState(), attack: "ramCharge", phase: "active", t: .5, total: 1.1, data: { aim: { x: 1, y: 0 } } };
  updatePackMonster(foe, game.packWorld(1 / 30, 1000));
  assert.equal(mountById(save, mount.id)?.recovery?.reason, "puncture");
  assert.equal(game.mountRide(), null);
});
