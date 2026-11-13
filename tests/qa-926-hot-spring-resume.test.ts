// QA pass on release 926: the hot springs' clocks (the calm since the last hurt, the scan, the steam wisp, the visit's message) lived
// only in memory, so a reload restarted the calm and a twin run healed 0.08 health less about 1.3 s after the reload. They are
// now saved additively in playerRuntime.springSoak (schema 14) and restored, so a soak resumes exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { HOT_SPRINGS } from '../src/landscape.ts';

const SEED = 'TERR21', AT = [14, 179], idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
function load() {
  const s: any = freshSave(); s.seed = SEED; Object.assign(s.session, { area: 'overworld', rx: AT[0], ry: AT[1], x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.message = ''; return g;
}
function soak(g: any, t: any, frames: number, now: number, dt = .05) {
  for (let k = 0; k < frames; k++) { g.player.x = t.x; g.player.y = t.y; now += dt * 1000; g.update(dt, idle, now); g.enemies = []; }
  return now;
}

test('a reload mid-soak resumes the calm, the scan and the heal exactly', () => {
  const g = load(), pool = g.map.tiles.find((t: any) => t.kind === 'springPool' && t.x > 2 && t.y > 2 && t.x < 29 && t.y < 29);
  assert.ok(pool, 'a spring pool'); g.player.x = pool.x; g.player.y = pool.y; g.player.hp = Math.round(g.save.maxHp / 2); g.jumpUntil = 0;
  // Reload partway through the calm (not yet healing) and again once healing has begun: both twins stay identical.
  for (const at of [HOT_SPRINGS.calm - 1.3, HOT_SPRINGS.calm + 1.1]) {
    const a = load(); a.player.x = pool.x; a.player.y = pool.y; a.player.hp = g.player.hp; a.jumpUntil = 0;
    let now = soak(a, pool, Math.round(at / .05), 1000);
    const b: any = new Game(structuredClone(a.exportSnapshot(now)), now); b.enemies = [];
    assert.deepEqual(b.springSoak, a.springSoak, `the soak's clocks are restored (reload at ${at.toFixed(1)} s)`);
    for (let k = 0; k < 60; k++) { now = soak(a, pool, 1, now); soak(b, pool, 1, now - 50); assert.equal(b.player.hp, a.player.hp, `frame ${k} after a reload at ${at.toFixed(1)} s`); assert.deepEqual(b.springSoak, a.springSoak); }
    assert.ok(a.player.hp > g.player.hp, 'and it does heal');
  }
});

test('a saved soak that is damaged or missing falls back to a fresh one', () => {
  const g = load(); const s = structuredClone(g.exportSnapshot(1000));
  s.session.playerRuntime.springSoak = { calm: 'x', away: 1, scanIn: 0, wisp: 0 }; const b: any = new Game(structuredClone(s), 1000); assert.equal(b.springSoak ?? null, null);
  delete s.session.playerRuntime.springSoak; const c: any = new Game(structuredClone(s), 1000); assert.equal(c.springSoak ?? null, null);
  s.session.playerRuntime.springSoak = { calm: 3, away: 0, told: true, scanIn: 99, foes: false, wisp: -4 }; const d: any = new Game(s, 1000);
  assert.deepEqual(d.springSoak, { calm: 3, away: 0, told: true, scanIn: HOT_SPRINGS.scan, foes: false, wisp: 0 }, 'clamped to the clocks\' own ranges');
});
