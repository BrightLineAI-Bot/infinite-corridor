// Release 669 (Tim, 2026-11-01): a rest point on the crown of every great tree (touch it; die and you wake there), and the drone
// over the glider on Jump, the glider in a freefall.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { setMechMode } from '../src/vehicle-gates.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';

let tree = null; const treeAt = () => { for (let x = 14; x < 200 && !tree; x++) for (let y = 14; y < 200 && !tree; y += 3) { if (sectionRegion('CROWN', x, y, LANDSCAPE_VERSION).type !== 'jungle') continue; const s = freshSave(); s.seed = 'CROWN'; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); if (g.map.canopy) tree = [x, y]; } return tree; };
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };

test('a great tree\'s crown holds a rest point: step on it and it is where you wake', () => {
  const [x, y] = treeAt(), s = freshSave(); s.seed = 'CROWN'; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  const rest = g.map.objects.find((o) => o.kind === 'crownRest'); assert.ok(rest); const t = g.map.tiles[rest.y * 32 + rest.x]; assert.equal(t.kind, 'canopyTrunk'); assert.equal(t.elev, g.map.canopy.top);
  g.player.x = rest.x; g.player.y = rest.y; assert.ok(g.touchCrownRest()); assert.deepEqual([s.activeCheckpoint.rx, s.activeCheckpoint.ry, s.activeCheckpoint.x, s.activeCheckpoint.y], [x, y, rest.x, rest.y]);
  assert.ok(!g.touchCrownRest(), 'once');
  g.rx = 0; g.ry = 0; g.loadArea('overworld'); g.player.hp = 0; g.update(.05, idle, 1000); for (let i = 0; i < 200 && (g.rx !== x || g.ry !== y); i++) g.update(.05, idle, 1050 + i * 50);
  assert.deepEqual([g.rx, g.ry], [x, y], 'woke at the great tree'); assert.equal(g.map.tiles[Math.round(g.player.y) * 32 + Math.round(g.player.x)].kind, 'canopyTrunk');
});

// 2026-11-13 (Tim: the glider is for great trees only): the high tile is now a great tree's canopy platform; off plain ground the same
// drop is an ordinary fall (checked last). Was: an ash plateau, which freefell under the 641 rule.
test('with the drone out, a long fall off a great tree is still a freefall (Jump opens the glider); a drop off the booster is not', () => {
  const s = freshSave(); s.seed = 'CROWN'; s.perception.aperture = 3255; s.farArray = { listeners: 10, gate: 5 }; s.consumables.submersible = 1; s.glider = true;
  const g = new Game(s, 0); g.rx = 3; g.ry = 3; g.loadArea('overworld'); g.enemies = []; setMechMode(s, 'drone'); g.useConsumable('submersible', 0); assert.ok(g.droneUp());
  for (const t of g.map.tiles) Object.assign(t, { kind: 'ash', blocked: false, elev: 0, slope: false, environment: null, structure: null, buildingId: null });
  const hi = g.map.tiles[10 * 32 + 10]; Object.assign(hi, { elev: 8, canopy: true, skyPlatform: true }); Object.assign(g.player, { x: 10, y: 10.2, hp: 100, maxHp: 100 }); let t = 1000;
  for (let i = 0; i < 20 && !g.glide; i++) g.update(.05, { state: { x: 1, y: 0 }, consume: () => false, held: () => false }, t += 50);
  assert.ok(g.glide, 'freefall'); hi.elev = 0;
  g.glide = null; g.player.x = 15; g.player.y = 15; g.droneLift = { base: 0, z: 5, vz: 0 }; g.jumpUntil = t + 500;
  for (let i = 0; i < 40; i++) g.update(.05, idle, t += 50); assert.equal(g.glide, null, 'a booster drop is a fall, not a freefall');
  const s2 = freshSave(); s2.seed = 'CROWN'; s2.perception.aperture = 3255; s2.farArray = { listeners: 10, gate: 5 }; s2.consumables.submersible = 1; s2.glider = true;
  const k = new Game(s2, 0); k.rx = 3; k.ry = 3; k.loadArea('overworld'); k.enemies = []; setMechMode(s2, 'drone'); k.useConsumable('submersible', 0); assert.ok(k.droneUp());
  for (const q of k.map.tiles) Object.assign(q, { kind: 'ash', blocked: false, elev: 0, slope: false, environment: null, structure: null, buildingId: null });
  k.map.tiles[10 * 32 + 10].elev = 8; Object.assign(k.player, { x: 10, y: 10.2, hp: 100, maxHp: 100 }); t = 1000;
  let fell = false; for (let i = 0; i < 20 && !k.glide; i++) { k.update(.05, { state: { x: 1, y: 0 }, consume: () => false, held: () => false }, t += 50); fell ||= !!k.fall; }
  assert.equal(k.glide, null, 'off plain ground: no freefall glide'); assert.ok(fell, 'an ordinary fall');
});
