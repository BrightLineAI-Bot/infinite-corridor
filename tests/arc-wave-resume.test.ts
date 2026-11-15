import test from "node:test";
import assert from "node:assert/strict";
import { BLUNDERBUSS_SHOT_SPEEDS, normalizePendingToolUse } from "../src/action-motion.ts";
import { ARC_WAVE } from "../src/tool-forms.ts";

// Release 973 review fix: an Arc Wave Blunderbuss press saved during its Close View startup must survive the reload.
test("the pending tool-use validator admits the current Arc Wave crescent speed", () => {
  assert.ok(BLUNDERBUSS_SHOT_SPEEDS.includes(ARC_WAVE.speed), "ARC_WAVE.speed must be an admitted Blunderbuss shot speed");
  assert.ok(BLUNDERBUSS_SHOT_SPEEDS.includes(14) && BLUNDERBUSS_SHOT_SPEEDS.includes(11), "plain and pre-966 Arc Wave records still load");
});

import { Game } from "../src/game.ts";
import { migrateSave } from "../src/types.ts";
import { createLabFixture } from "../src/proving-ground-labs.ts";
import { ensureLattice } from "../src/transit-lattice.ts";

test("an Arc Wave Blunderbuss press saved during its Close View startup resumes and fires", () => {
  const now = 100000, g: any = createLabFixture({ lab: "combat-assets", scenario: "blade-spark-ashling", now }).game;
  g.enemies = []; g.projectiles = []; g.effects = []; g.save.closeView = true; g.save.activeWeaponSlot = "primary";
  g.save.equipment.secondary = { id: "secondary-blunderbuss", name: "Blunderbuss", slot: "secondary", power: 11, basePower: 5, upgradeRank: 6, property: "quick" };
  ensureLattice(g.save); g.save.lattice.passives = ["field:arc-wave"];
  for (const t of g.map.tiles) { t.blocked = false; t.openAir = false; t.courtyard = false; t.pentRoof = false; t.pentBalcony = false; if (t.kind === "yardGrass") t.kind = "flagFloor"; }
  assert.equal(g.fireSecondary(now, { x: 1, y: 0 }), true);
  assert.ok(g.pendingToolUse, "the press is pending during startup");
  assert.ok(g.pendingToolUse.payload.shot.arcWave, "the pending shot is an Arc Wave crescent");
  const saved = g.savedPendingToolUse(now + 10);
  assert.ok(saved, "the pending Arc Wave press is saved (was dropped since release 966)");
  assert.ok(normalizePendingToolUse(saved));
  const snap = g.exportSnapshot(now + 10);
  assert.ok(snap.session.playerRuntime.pendingToolUse, "the snapshot keeps the pending press");
  const back: any = new Game(migrateSave(structuredClone(snap)), now + 10);
  assert.ok(back.pendingToolUse, "the press resumes after reload");
  const r = back.releasePendingToolUse(back.pendingToolUse.releaseAt);
  assert.equal(r.released, true);
  assert.ok(back.projectiles.filter((p: any) => p.arcWave).length >= 3, "the crescents fire after the reload");
});
