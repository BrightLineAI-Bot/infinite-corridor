// Release 635 (Tim, 2026-11-01: "as he ascends the tree... once he gets to a certain height... show blue sky and cloud... you
// should have a parachute... control your flight left and right... descend more slowly... the only way you can glide is if you get
// up in a tall tree... float down... in any direction... if you're high enough you can glide into the next undiscovered tile").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, GLIDE } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion } from '../src/landscape.ts';

const SEED = 'CANOPY631';
const treeAt = (() => { let hit = null; return () => { for (let x = 14; x < 260 && !hit; x++) for (let y = 14; y < 260 && !hit; y += 3) { if (sectionRegion(SEED, x, y, 12).type !== 'jungle') continue; const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version: 12 }); if (m.canopy) hit = [x, y]; } return hit; }; })();
const stick = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false });
const atTree = (glider = true) => { const [x, y] = treeAt(), s = freshSave(); s.seed = SEED; s.maxHp = 100; if (glider) s.glider = true; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); g.enemies = []; g.player.hp = 100; return { s, g }; };
const tileAt = (g, x, y) => g.map.tiles[y * 32 + x];

test('the glider is found on the landing of a great tree', () => {
  const { s, g } = atTree(false), land = g.map.tiles.find((t) => t.kind === 'canopyCrown'); Object.assign(g.player, { x: land.x, y: land.y - .25 });
  g.update(.05, stick(0, 0), 1000); assert.equal(s.glider, true); assert.equal(g.message, GLIDE.found); assert.ok(s.narrative.journal.some((j) => j.text === GLIDE.found));
});

test('leaving the tree from high up opens the glider: no harm, a slow descent, steered freely, landing on open ground', () => {
  const { s, g } = atTree(), hi = g.map.tiles.filter((t) => t.kind === 'canopyBranch' && t.elev >= 10).find((t) => [[0, -1], [-1, 0], [1, 0], [0, 1]].some(([a, b]) => { const n = tileAt(g, t.x + a, t.y + b); return n && !n.blocked && !n.canopy; }));
  const [dx, dy] = [[0, -1], [-1, 0], [1, 0], [0, 1]].find(([a, b]) => { const n = tileAt(g, hi.x + a, hi.y + b); return n && !n.blocked && !n.canopy; });
  Object.assign(g.player, { x: hi.x, y: hi.y - .25 }); let t = 1000;
  for (let i = 0; i < 30 && !g.glide; i++) { t += 50; g.update(.05, stick(dx, dy), t); }
  assert.ok(g.glide, `the glider opened: ${g.message}`); const z0 = g.glide.z, hp0 = g.player.hp; assert.equal(hp0, g.player.maxHp || s.maxHp, 'the glider opened before any harm'); assert.ok(z0 >= GLIDE.minDrop);
  for (let i = 0; i < 20; i++) { t += 50; g.update(.05, stick(dx, dy), t); }
  assert.ok(g.glide && g.glide.z < z0 && z0 - g.glide.z <= GLIDE.sink * 1.1 + .01, 'sinking slowly');
  let sections = 0, last = `${g.rx},${g.ry}`;
  for (let i = 0; i < 2000 && g.glide; i++) { t += 50; g.enemies = []; g.update(.05, stick(dx, dy), t); if (`${g.rx},${g.ry}` !== last) { sections++; last = `${g.rx},${g.ry}`; } }
  assert.equal(g.glide, null, 'it comes down in the end'); assert.equal(g.player.hp, hp0, 'no harm'); assert.equal(s.worldFlags.deaths || 0, 0);
  assert.ok(sections >= 1, `it carried the Wayfarer over the edge into the next section (${sections})`);
  const under = tileAt(g, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75)); assert.ok(under && !under.blocked, 'landed on open ground');
});

test('over water or walls it holds above them until there is ground; a glide resumes after a reload', () => {
  const { s, g } = atTree(); s.capabilities = { ...(s.capabilities || {}), swim: false }; g.map.tiles.forEach((q) => Object.assign(q, { kind: 'deepOcean', blocked: false, elev: 0, landscape: 'sea', canopy: false }));
  Object.assign(g.player, { x: 10, y: 10 }); g.glide = { z: 1, vx: 0, vy: 0, told: false }; let t = 1000;
  for (let i = 0; i < 60; i++) { t += 50; g.update(.05, stick(0, 0), t); }
  assert.ok(g.glide && g.glide.z > 0 && g.glide.told, 'holding above the water'); assert.equal(s.worldFlags.deaths || 0, 0);
  const back = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(t)))), g2 = new Game(back, 0); assert.ok(g2.glide && Math.abs(g2.glide.z - Math.max(GLIDE.skim, g.glide.z)) < 1e-6, 'resumed in the air');
  g.map.tiles.forEach((q) => Object.assign(q, { kind: 'jungleFloor', landscape: 'jungle' })); for (let i = 0; i < 40 && g.glide; i++) { t += 50; g.update(.05, stick(0, 0), t); }
  assert.equal(g.glide, null, 'lands once there is ground');
});

test('without the glider a fall off the tree is still a hard landing; the glider never opens anywhere but a great tree', () => {
  const { s, g } = atTree(false); Object.assign(g.player, { x: 8, y: 8 }); g.lastCanopyAt = -1e9; assert.equal(g.glide ?? null, null);
  s.glider = true; const plain = freshSave(); assert.equal(plain.glider, undefined); assert.equal(migrateSave({ ...JSON.parse(JSON.stringify(plain)), glider: 'yes' }).glider, false);
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'); assert.match(src, /function drawSkyAbove/); assert.match(src, /function drawLeafGlider/);
});
