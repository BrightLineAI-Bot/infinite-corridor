// Release 694 (Tim's diagnostic, 2026-11-01: "the screen is all messed up"; recentErrors: ellipse "major-axis radius provided
// (-6.10623e-13) is negative" at the affix-hazard draw): the frame a warning mark is laid, rounding could put its fill a hair below
// zero, and the browser threw mid-frame. The mark's fill is now clamped; this canvas throws on negative radii as Chrome does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { AFFIXES } from '../src/affixes.ts';
import { KIT_MOVES } from '../src/boss-kit.ts';

function strictCtx() {
  let depth = 0; const base = { save() { depth++; }, restore() { depth--; }, get depth() { return depth; }, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1 }),
    ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError(`The major-axis radius provided (${rx}) is negative.`); },
    arc(x, y, r) { if (r < 0) throw new RangeError(`The radius provided (${r}) is negative.`); } };
  return new Proxy(base, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
}

test('a warning mark drawn the frame it is laid never draws a negative radius', () => {
  const s = freshSave(); s.seed = 'CANVAS'; const g = new Game(s, 0); g.loadArea('overworld');
  // Find frame times where the old formula, 1 - (armAt - now) / (arm * 1000) with armAt = now + arm * 1000, rounds below zero.
  let rounding = 0; const hz = [];
  for (const [kind, A] of [...Object.entries(AFFIXES), ...Object.entries(KIT_MOVES)]) {
    if (!A.arm) continue;
    for (let i = 0; i < 200000; i++) { const now = 12345.6789 + i * 16.6667, armAt = now + A.arm * 1000; if (1 - (armAt - now) / (A.arm * 1000) < 0) { rounding++; hz.push({ kind, x: g.player.x + .5, y: g.player.y + .5, radius: A.radius || 1, armAt, until: armAt + 250, damage: 1, by: 'x', struck: false, now }); break; } }
  }
  assert.ok(rounding > 0, 'the rounding really happens');
  const ctx = strictCtx();
  for (const h of hz) { g.affixHazards = [h]; assert.doesNotThrow(() => render(ctx, g, 360, 640, h.now), h.kind); }
});

test('affixed, warded and shaman elites draw without throwing, and every save is restored (the 691 comment had swallowed one)', () => {
  const s = freshSave(); s.seed = 'CANVAS'; const g = new Game(s, 0); g.loadArea('overworld');
  const near = (dx, f) => Object.assign(g.createEnemyFromSpawn({ id: `e${dx}`, kind: 'ashling', x: g.player.x + dx, y: g.player.y + 1 }), { aggro: true }, f);
  g.enemies = [near(1, { affixes: ['droneSwarm', 'volcanic'] }), near(2, { warded: true, wardBy: 'e3' }), near(3, { fracShaman: true }), near(-1, { affixes: ['spiked'], fracRank: 'rare', packName: 'Gloommaw' })];
  const ctx = strictCtx(); assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); assert.equal(ctx.depth, 0, 'every save restored');
});
