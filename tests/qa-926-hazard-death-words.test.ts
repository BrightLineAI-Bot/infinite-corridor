// QA pass on release 926: the waking message after a death on lethal ground named every hazard but the canyon "Lost beneath the
// water". game.ts HAZARD_DEATH now names each: water, lava, the abyss, a glacier's crevasse, a lunar rille, a chasm open to the stars.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, HAZARD_DEATH, hazardDeathWords } from '../src/game.ts';
import { DEEP_WATER } from '../src/landscape.ts';

const W = 32, ROW = 30;
const inp = (x = 0) => ({ state: { x, y: 0 }, consume: () => false, held: () => false });

test('hazardDeathWords names each lethal ground', () => {
  for (const k of ['river', 'dungeonWater', ...DEEP_WATER]) assert.equal(hazardDeathWords(k), HAZARD_DEATH.water, k);
  assert.equal(hazardDeathWords('lava'), 'Lost to the lava');
  assert.equal(hazardDeathWords('abyss'), 'Lost to the abyss');
  assert.equal(hazardDeathWords('canyon'), 'Lost to the canyon');
  assert.equal(hazardDeathWords('abyss', { kind: 'abyss', crevasse: true }), 'Lost in a crevasse');
  assert.equal(hazardDeathWords('abyss', { kind: 'abyss', rille: true }), 'Lost in a lunar rille');
  assert.equal(hazardDeathWords('canyon', { kind: 'canyon', chasm: true }), 'Lost to the stars');
  assert.equal(hazardDeathWords('abyss', { kind: 'abyss', chasm: true }), 'Lost to the abyss', "a crater's ravine is an abyss, not the stars");
  assert.equal(hazardDeathWords('abyss', { kind: 'ash', crevasse: true }), 'Lost to the abyss', 'a mark on another tile is not read');
  assert.equal(hazardDeathWords('somethingNew'), HAZARD_DEATH.other);
});

// Walk off a 2-level ledge (x 1..4) onto `tile` (x 5..9) and read the waking message.
function deathOn(tile: any) {
  const s: any = freshSave(); s.seed = 'ROOF'; s.maxHp = 100; Object.assign(s.session, { area: 'overworld', rx: -2, ry: 0, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.riftAimView = () => false; g.update(1 / 60, inp(), 4000);
  for (let y = ROW - 2; y <= ROW + 1; y++) for (let x = 1; x <= 20; x++) Object.assign(g.map.tiles[y * W + x], { kind: 'ash', blocked: false, elev: 0, slope: false, environment: undefined, structure: undefined, buildingId: undefined, crevasse: undefined, rille: undefined, chasm: undefined }, x <= 4 ? { elev: 2 } : x <= 9 ? tile : {});
  g.player.x = 3.6; g.player.y = ROW - .25; const d0 = g.save.worldFlags.deaths || 0; let t = 5000;
  for (let i = 0; i < 240 && (g.save.worldFlags.deaths || 0) === d0; i++) { t += 1000 / 60; g.update(1 / 60, inp(i < 30 ? 1 : 0), t); g.enemies = []; }
  assert.equal(g.save.worldFlags.deaths, d0 + 1, `a death on ${JSON.stringify(tile)}`); return g.message;
}

test('the waking message names the hazard that took the Wayfarer', () => {
  assert.match(deathOn({ kind: 'river', blocked: true }), /^Lost beneath the water — /);
  assert.match(deathOn({ kind: 'abyss' }), /^Lost to the abyss — /);
  assert.match(deathOn({ kind: 'abyss', crevasse: true }), /^Lost in a crevasse — /);
  assert.match(deathOn({ kind: 'abyss', rille: true }), /^Lost in a lunar rille — /);
  assert.match(deathOn({ kind: 'lava' }), /^Lost to the lava — /);
  assert.match(deathOn({ kind: 'canyon' }), /^Lost to the canyon — /);
});
