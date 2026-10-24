// Release 387: the Wayfarer tab's "Your journey" figures, and digging finds that grow with the Aperture tier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { journeyStats } from '../src/persistence.ts';
import { DIG, wallTreasure, digStep, saveTier } from '../src/digging.ts';

test('journey figures come from what the save already keeps', () => {
  const s = freshSave(); s.playSeconds = 5400; s.explored = { '0,0': true, '1,0': true }; s.farArray = { listeners: 2 }; s.worldBeasts = { blob: { slain: 2 }, worm: { slain: 1 } };
  s.consequences.dungeons = { a: { resolved: true }, b: { guardianDefeated: true }, c: {} }; s.hometowns = { towns: [{}, {}] }; s.digging = { dug: { a: ['1,1', '2,2'], b: ['3,3'] } };
  const rows = Object.fromEntries(journeyStats(s));
  assert.equal(rows['Time played'], '1.5 h'); assert.equal(rows['Sections explored'], 2); assert.equal(rows['Dungeons cleared'], 2);
  assert.equal(rows['World bosses felled'], 3); assert.equal(rows['Listeners felled'], 2); assert.equal(rows['Towns raised'], 2); assert.equal(rows['Blocks dug'], 3);
  assert.doesNotThrow(() => journeyStats({}));
});

test('walls hold more, and more of it, as the Aperture opens; tier 0 is unchanged', () => {
  let low = 0, high = 0, lowMarks = 0, highMarks = 0;
  for (let x = 0; x < 60; x++) for (let y = 0; y < 60; y++) {
    const a = wallTreasure('SEED', 'dungeon:SEED:g1:1:1:a', x, y), b = wallTreasure('SEED', 'dungeon:SEED:g1:1:1:a', x, y, 13);
    if (a) { low++; if (a.id === 'marks') lowMarks += a.n; } if (b) { high++; if (b.id === 'marks') highMarks += b.n; }
    if (a) assert.ok(b, 'a wall that held something still does');
  }
  assert.ok(high > low, `${high} > ${low}`); assert.ok(highMarks > lowMarks * 1.5);
  assert.equal(digStep(13), 3); assert.equal(digStep(3), 0);
  const s = freshSave(); s.perception.aperture = 3255; assert.equal(saveTier(s), 13);
  assert.deepEqual(wallTreasure('S', 'k', 4, 4), wallTreasure('S', 'k', 4, 4, 0));
  assert.equal(DIG.tierScale.every, 4);
});

// Release 387 (Tim: the Shadow Clone "should target... if you click on something... larger range... cast directly behind
// you... the normal distance is 5").
import { Game } from '../src/game.ts';
import { SHADOW_CLONE, cloneOffset, clampPlacement } from '../src/late-spells.ts';
test('the shadow falls 5 behind a moving Wayfarer, sets up to 5 away, and shoots at the locked target', () => {
  assert.deepEqual(cloneOffset({ x: 0, y: 1 }, { x: 1, y: 0 }), { x: -0, y: -5 }); assert.equal(SHADOW_CLONE.placeRange, 5);
  const far = clampPlacement(8, 0); assert.equal(far.x, 5);
  const s = freshSave(); s.seed = 'SHADE'; s.perception.aperture = 3255; const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); g.enemies = [];
  for (const t of g.map.tiles) Object.assign(t, { kind: 'ash', blocked: false, environment: null, elev: 0, slope: false, landscape: null, structure: null, build: null });
  Object.assign(g.player, { x: 15, y: 15 }); g.lastUpdateNow = 1000;
  g.shadowClone = { ox: 0, oy: 4, until: 1e9 };
  const foe = g.createEnemyFromSpawn({ kind: 'ashling', x: 19, y: 15 }); foe.maxHp = foe.hp = 500; g.enemies = [foe]; g.lockTarget(foe.id);
  g.player.attackReadyAt = 0; assert.ok(g.fireSecondary(1100, { x: 1, y: 0 }));
  const copy = g.projectiles.find((p) => p.shadow); assert.ok(copy);
  const want = Math.atan2(15 + .45 - (19 + .45), 19 + .5 - (15 + .5)), got = Math.atan2(copy.dy, copy.dx); assert.ok(Math.abs(got - want) < 1e-6, 'aimed from the shadow at the target');
});
