import test from "node:test";
import assert from "node:assert/strict";
import { footprintOpen, moveAxis } from "../src/game.ts";
import { createLabFixture, labReport, restoreRoomRoutingFixture, teleportTargets } from "../src/proving-ground-labs.ts";

const fixture = (family, mode, seed = "CINDER-VERGE-47") => createLabFixture({
  lab: "close-view", scenario: `padding-${family}-${mode}`, seed, now: 1000,
});

function walk(map, from, to) {
  const actor = { ...from, isPlayer: true };
  moveAxis(actor, to.x - from.x, to.y - from.y, map, map.width);
  return Math.hypot(actor.x - to.x, actor.y - to.y) < 1e-8;
}

function withoutSaveTimestamps(save) {
  const { updatedAt, session: { savedAt, ...session }, ...rest } = save;
  return { ...rest, session };
}

for (const [family, version] of [["keep", 5], ["pentagon", 10]]) {
  test(`${family} clearance changes only three ordinary walls after base placement`, () => {
    const reference = fixture(family, "reference");
    const pilot = fixture(family, "pilot");
    const { mode, ...witness } = pilot.roomPadding;
    const { mode: referenceMode, ...referenceWitness } = reference.roomPadding;
    assert.equal(mode, "pilot");
    assert.equal(referenceMode, "reference");
    assert.equal(witness.found, true);
    assert.deepEqual(witness, referenceWitness);
    assert.deepEqual(fixture(family, "pilot").roomPadding, pilot.roomPadding);
    assert.equal(pilot.diagnostics.routing.version, version);
    assert.deepEqual(pilot.diagnostics.routing, reference.diagnostics.routing);
    assert.deepEqual(withoutSaveTimestamps(pilot.save), withoutSaveTimestamps(reference.save));
    assert.deepEqual(pilot.game.enemies, reference.game.enemies);

    const { tiles: original, ...base } = reference.game.map;
    const { tiles: changed, ...padded } = pilot.game.map;
    assert.deepEqual(padded, base);
    const cellKeys = new Set(witness.cells.map(({ x, y }) => y * base.width + x));
    const floor = original[witness.approach.y * base.width + witness.approach.x];
    assert.equal(cellKeys.size, 3);
    for (const [index, tile] of original.entries()) {
      if (cellKeys.has(index)) {
        assert.equal(tile.blocked, true);
        assert.deepEqual(changed[index], { ...tile, kind: floor.kind, elev: floor.elev, blocked: false });
      } else {
        assert.deepEqual(changed[index], tile);
      }
    }
  });

  test(`${family} player footprint can enter and leave the recess without breaching its collar`, () => {
    const reference = fixture(family, "reference", "ROUTING0");
    const pilot = fixture(family, "pilot", "ROUTING0");
    assert.equal(pilot.roomPadding.found, true);
    const { approach, cells, direction } = pilot.roomPadding;
    const map = pilot.game.map;
    for (const cell of cells) {
      // The outer cells are diagonal from the approach. Walk both ways through the
      // production axis mover and test fractional footprints along the new edge.
      assert.equal(walk(reference.game.map, approach, cell), false);
      assert.equal(walk(map, approach, cell), true);
      assert.equal(walk(map, cell, approach), true);
      assert.ok(footprintOpen(map, map.width, cell.x + .1, cell.y + .1));
      const behind = { x: cell.x + direction.x, y: cell.y + direction.y };
      assert.equal(walk(map, cell, behind), false);
    }
    assert.deepEqual(teleportTargets(pilot).find(({ id }) => id === "room-clearance"),
      { id: "room-clearance", label: "Room clearance approach", ...approach });
    assert.equal(labReport(pilot).diagnostics.roomPadding.active, true);
    assert.throws(() => restoreRoomRoutingFixture(pilot, pilot.game.exportSnapshot(1000), 2000), /restart from their scratch scenario/);
    pilot.game.loadArea("overworld", false);
    assert.equal(labReport(pilot).diagnostics.roomPadding.active, false);
    assert.ok(!teleportTargets(pilot).some(({ id }) => id === "room-clearance"));
  });
}
