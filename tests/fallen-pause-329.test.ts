// Release 329 (Tim, 2026-10-22): felled by a world beast, the Wayfarer lies fallen for a few seconds while the beast paces,
// then recovers at the checkpoint as before. Other deaths recover at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, DEATH_PAUSE } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const field = () => { const s = freshSave(); s.seed = 'FALL'; const g = new Game(s, 0); g.deathPause = true; g.rx = 2; g.ry = 1; g.loadArea('overworld'); g.enemies = []; return { s, g }; };

test('a world beast kill pauses before the recovery, and the beast paces instead of attacking', () => {
  const { s, g } = field(), w = g.map.width || 32; for (let y = 10; y < 22; y++) for (let x = 10; x < 26; x++) Object.assign(g.map.tiles[y * w + x], { kind: 'ash', blocked: false });
  Object.assign(g.player, { x: 14, y: 16 }); const beast = g.createEnemyFromSpawn({ kind: 'ashling', x: 18, y: 16 });
  beast.worldBeast = 'mountainTurtle'; g.enemies = [beast];
  const at = { x: g.player.x, y: g.player.y }; g.player.hp = 0;
  g.update(.05, idle, 1000);
  assert.ok(g.fallen, 'fallen'); assert.equal(g.rx, 2); assert.equal(g.player.x, at.x, 'still where they fell');
  const start = { x: beast.x, y: beast.y }; let t = 1000, moved = 0;
  while (t < 1000 + DEATH_PAUSE.seconds * 1000 - 100) { t += 50; g.update(.05, idle, t); moved = Math.max(moved, Math.hypot(beast.x - start.x, beast.y - start.y)); }
  assert.ok(g.fallen, 'still paused'); assert.ok(moved > .3, `the beast paced (${moved.toFixed(2)})`); assert.ok(moved <= DEATH_PAUSE.millRadius + .1);
  g.update(.05, idle, t + 200);
  assert.equal(g.fallen, null); assert.equal(g.rx, s.activeCheckpoint.rx); assert.equal(g.ry, s.activeCheckpoint.ry); assert.equal(g.player.hp, s.maxHp, 'recovered');
});

test('other deaths recover at once, and simulations without the pause recover at once even with a beast', () => {
  const { s, g } = field(); g.player.hp = 0; g.update(.05, idle, 1000);
  assert.ok(!g.fallen); assert.equal(g.player.hp, s.maxHp); assert.equal(g.rx, s.activeCheckpoint.rx);
  const b = field(); b.g.deathPause = false; const e = b.g.createEnemyFromSpawn({ kind: 'ashling', x: 18, y: 16 }); e.worldBeast = 'mountainTurtle'; b.g.enemies = [e]; b.g.player.hp = 0; b.g.update(.05, idle, 1000); assert.ok(!b.g.fallen);
});
