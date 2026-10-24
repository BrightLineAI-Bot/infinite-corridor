// Release 377 (Tim, 2026-10-24): bosses, guardians, elites and Gate Revenants can be staggered for a while, never locked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGGER_GOVERNOR, staggerGovernor, staggerClass } from '../src/monster-pack.ts';

// Hit every `every` seconds for `stun` seconds of hit-stun; returns the share of time spent stunned, and when the guard came.
function hammer(e, seconds, every = .42, stun = .22, dt = .05) {
  let stunned = 0, guardAt = null, next = 0;
  for (let t = 0; t < seconds; t += dt) {
    if (t >= next) { e.hitStun = Math.max(e.hitStun || 0, stun); next += every; }
    e.hitStun = Math.max(0, (e.hitStun || 0) - dt); if (staggerGovernor(e, dt) && guardAt === null) guardAt = t;
    if (e.hitStun > 0) stunned += dt;
  }
  return { share: stunned / seconds, guardAt };
}

test('who it covers: bosses, guardians, elites, Revenants and great beasts; not ordinary creatures', () => {
  assert.equal(staggerClass({ gatePredator: true }), 'revenant'); assert.equal(staggerClass({ boss: true }), 'boss');
  assert.equal(staggerClass({ dungeonRole: 'gateWarden' }), 'boss'); assert.equal(staggerClass({ worldBeast: 'x' }), 'boss');
  assert.equal(staggerClass({ eliteId: 'e' }), 'elite'); assert.equal(staggerClass({ kind: 'ashling' }), null);
  const pawn = { kind: 'ashling' }; assert.ok(hammer(pawn, 20).share > .45, 'a common foe can still be kept staggered');
});

test('a Revenant under constant swings is stunned for a while, then shrugs the stuns off', () => {
  const r = { gatePredator: true }, out = hammer(r, 20);
  assert.ok(out.guardAt !== null && out.guardAt < 6, `guarded by ${out.guardAt}s`); assert.ok(out.share < .4, `stunned ${Math.round(out.share * 100)}% of the time`);
});

test('bosses and elites likewise; the meter drains when the blows stop, and the guard ends', () => {
  for (const e of [{ boss: true }, { eliteId: 'x' }]) { const out = hammer(e, 30); assert.ok(out.guardAt !== null, JSON.stringify(e)); assert.ok(out.share < .45); }
  const b = { boss: true }; hammer(b, 1.5); const m = b.staggerMeter; assert.ok(m > 0);
  for (let i = 0; i < 100; i++) staggerGovernor(b, .05); assert.ok(!(b.staggerMeter >= m), 'drains');
  const g = { boss: true, staggerGuard: STAGGER_GOVERNOR.guard }; for (let i = 0; i < 70; i++) { g.hitStun = .2; staggerGovernor(g, .05); } assert.ok(!(g.staggerGuard > 0)); g.hitStun = .2; staggerGovernor(g, .05); assert.ok(g.hitStun > 0, 'after the guard, stuns land again');
});

test('release 377: every large crossing first found from now on has its pair of daises, at any tier; older ones keep theirs', async () => {
  const { Game } = await import('../src/game.ts'); const { freshSave } = await import('../src/types.ts'); const { dungeonHistory } = await import('../src/interactions.ts'); const { generateExpeditionDungeon } = await import('../src/underlands.ts');
  let large = 0, withDais = 0;
  for (const ap of [0, 3300]) for (let i = 0; i < 60; i++) {
    const s = freshSave(); s.seed = `WD${ap}:${i}`; s.perception.aperture = ap; const g = new Game(s, 0); const id = `dungeon:${s.seed}:g1:3:3:d-${i}`;
    s.session.dungeonReturn = { rx: 3, ry: 3, x: 16, y: 16 }; s.session.activeDungeonId = id; g.loadArea('dungeon');
    assert.equal(dungeonHistory(s, id).warpVersion, 2);
    if (g.map.sizeProfile === 'extended' && !g.map.plain) { large++; if (g.map.objects.filter((o) => o.kind === 'warpDais').length === 2) withDais++; }
  }
  assert.ok(large > 10); assert.equal(withDais, large);
  const old = generateExpeditionDungeon('OLD', 'dungeon:OLD:g1:1:1:x', 'hollow', { layoutPool: 5, themePool: 3 }), again = generateExpeditionDungeon('OLD', 'dungeon:OLD:g1:1:1:x', 'hollow', { layoutPool: 5, themePool: 3 });
  assert.equal(!!old.warpDaises, !!again.warpDaises, 'without the flag, the old chance');
});
