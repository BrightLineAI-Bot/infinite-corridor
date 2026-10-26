// Release 469 (Tim: "a select all in the gear menu... salvage"; "the targeting seems a little bit long... I'll be moving past
// enemies and the targeting won't hit them"; a probe with slow frames during attack spam): select-and-salvage, swings that
// go to the foe in reach, and glows without shadowBlur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, pickMeleeTarget, salvageInventoryItems, AUTO_AIM, TARGET_LOCK } from '../src/game.ts';

const flat = (w = 32) => ({ width: w, height: w, tiles: Array.from({ length: w * w }, (_, i) => ({ x: i % w, y: Math.floor(i / w), kind: 'floor', blocked: false })), objects: [], enemySpawns: [] });
const foe = (id, x, y) => ({ id, kind: 'ashling', x, y, hp: 50, maxHp: 50 });

test('a foe in reach beats a farther one ahead, even when it is behind you', () => {
  const map = flat(), player = { x: 10, y: 10, facing: 'right' }, behind = foe('behind', 9, 10), ahead = foe('ahead', 12.6, 10);
  const pick = pickMeleeTarget(player, [behind, ahead], map, 32, 1.4 + AUTO_AIM.meleeExtra, 1.4 + TARGET_LOCK.meleeSlack);
  assert.equal(pick.e.id, 'behind'); assert.ok(pick.d.x < -.9);
  assert.equal(pickMeleeTarget(player, [ahead], map, 32, 1.4 + AUTO_AIM.meleeExtra, 1.4).e.id, 'ahead', 'with none in reach, auto aim still reaches for one');
  assert.equal(AUTO_AIM.meleeExtra, 3);
});

test('release 471: a tapped lock leads the swing as before (up to 5 past reach); without a lock, the foe beside you wins', () => {
  const s = freshSave(), g = new Game(s, 0); g.map = flat(); g.area = 'overworld';
  const near = foe('near', g.player.x - 1, g.player.y), far = foe('far', g.player.x + 4, g.player.y); g.enemies = [near, far]; g.targetId = 'far'; g.lastUpdateNow = 1000;
  const d = g.meleeAimAt(1.4, 32); assert.ok(d.x > .9, 'the locked foe, as before'); assert.equal(g.aimMark.id, 'far'); assert.equal(TARGET_LOCK.meleeReach, 5);
  g.targetId = null; const d2 = g.meleeAimAt(1.4, 32); assert.ok(d2.x < -.9, 'no lock: the foe in reach'); assert.equal(g.aimMark.id, 'near');
});

test('salvage several carried pieces at once', () => {
  const s = freshSave(), mk = (n, tier) => ({ id: `i${n}`, name: `Piece ${n}`, slot: 'charm', tier, power: 2 }); s.inventory = [mk(1, 'common'), mk(2, 'rare'), mk(3, 'common')]; const iron = s.materials.cinderIron || 0;
  const r = salvageInventoryItems(s, [s.inventory[0], s.inventory[2]]); assert.equal(r.count, 2); assert.deepEqual(s.inventory.map((q) => q.id), ['i2']); assert.equal(s.materials.cinderIron, iron + r.iron);
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(main, /uiButton\("Select all"/); assert.match(main, /Salvage selected \(\$\{n\}\)/); assert.match(main, /if \(gearPick\.has\(item\)\) gearPick\.delete\(item\); else gearPick\.add\(item\)/);
});

test('no shadowBlur glow left in the swing arc, the Watcher tomb or the dais', () => {
  for (const f of ['../src/main.ts', '../src/renderer.ts']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /shadowBlur = (?!0)/);
});
