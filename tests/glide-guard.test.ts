// Pre-publish review of 927 (blocker): an inline `// FALL:` comment in 926 swallowed the glide invulnerability assignment, so a
// Wayfarer gliding above GLIDE.safe took every blow again. The GLIDE contract: out of reach of blows while above `safe`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, GLIDE } from '../src/game.ts';

const still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
for (const open of [true, false]) test(`a ${open ? 'open' : 'closed'} glide above GLIDE.safe is out of reach of blows`, () => {
  const s = freshSave(); s.seed = 'GLIDEGUARD'; s.glider = true; const g = new Game(s, 0); g.enemies = []; const p = g.player;
  g.glide = { z: 12, vx: 0, vy: 0, vz: 0, open, fallFrom: 12, told: false };
  let t = 1000, high = 0;
  for (let i = 0; i < 30 && g.glide; i++) { t += 1000 / 60; g.update(1 / 60, still, t); if (g.glide && g.glide.z > GLIDE.safe) { high++; assert.ok((p.invulnerableUntil || 0) > t, `invulnerable at glide height ${g.glide.z.toFixed(2)}`); } }
  assert.ok(high > 5, 'the glide stayed above GLIDE.safe long enough to check');
});
