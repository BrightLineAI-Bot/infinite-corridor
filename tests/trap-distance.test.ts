// Traps by distance (Tim, 2026-11-27: trap and rockslide damage "should scale with distance from the Ember Refuge, the way creatures
// do. The farther out you go, the harder they hit"). dungeon-traps.ts TRAP_REGION: a ring multiplier on top of the level growth, the
// share kept under maxShare of maximum health, and with the Threat Sigil under hardCap; near the Refuge nothing changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, updateTraps, sigilTrapHit, THREAT_SIGIL } from '../src/game.ts';
import { DUNGEON_TRAPS, TRAP_DAMAGE_SHARE, TRAP_REGION, trapRingScale, trapShareScale, trapHit, tickNewTraps } from '../src/dungeon-traps.ts';
import { RANGES, rockslideDamage, tickRockslides, rockslideFallTime } from '../src/landscape.ts';
import { regionalThreat } from '../src/world.ts';

const spikes = (hp, ring, sigil = 1, level = 1) => { const trap = { id: 'o', kind: 'trap', trapType: 'spikes', x: 5, y: 5, phase: 'armed', timer: 0, damage: 14, loadGrace: 0, hits: {} }, p = { x: 5, y: 5, hp };
  for (let i = 0; i < 40 && p.hp === hp; i++) updateTraps([trap], p, .05, false, hp, level, ring, sigil); return hp - p.hp; };
const dart = (hp, ring, level = 5) => { const t = { id: 'd', kind: 'trap', trapType: 'dart', newTrap: 2, x: 1, y: 8, dirX: 1, dirY: 0, phase: 'armed', timer: 0 }, w = { player: { x: 6, y: 8.2 }, level, maxHp: hp, ring, now: 0, projectiles: [], effects: [], seeds: [] };
  for (let i = 0; i < 30; i++) tickNewTraps([t], w, .05); return w.projectiles[0].damage; };
const rocks = (hp, ring, sigil = 1, level = 10) => { const z = { id: 'z', x: 10, y: 5, dx: 0, dy: 1, len: 4, period: 0, phase: 'armed', timer: 0, hits: {} }, tiles = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) tiles.push({ x, y }); for (let d = 0; d <= 4; d++) tiles[(5 + d) * 32 + 10].rockslide = 'z';
  const p = { x: 10, y: 7.25, hp }, w = { player: p, guarded: false, level, maxHp: hp, ring, sigil }; let n = 0; for (let t = 0; t < RANGES.rockslide.warn + rockslideFallTime(z) + .2; t += 1 / 30) n += tickRockslides({ tiles, rockslides: [z] }, w, 1 / 30); return n; };

test('the table: a data table by ring, rising with distance, flat near the Refuge and past its last row', () => {
  assert.ok(TRAP_REGION.rows.every(([r, m], i, a) => i === 0 || (r > a[i - 1][0] && m >= a[i - 1][1])), 'rings and multipliers rise');
  assert.equal(trapRingScale(0), 1); assert.equal(trapRingScale(TRAP_REGION.rows[0][0]), 1);
  for (const r of [30, 45, 100, 190, 400]) assert.ok(trapRingScale(r) > 1, `ring ${r}`);
  assert.ok(trapRingScale(190) > trapRingScale(100) && trapRingScale(100) > trapRingScale(45));
  assert.equal(trapRingScale(5000), TRAP_REGION.rows.at(-1)[1]);
  assert.ok(TRAP_REGION.maxShare < 1 && TRAP_REGION.hardCap < 1, 'never a whole health bar');
});

test('near the Refuge every trap and rockslide hits as before; far out they hit harder', () => {
  // as before (tests/dungeon-traps-523, far-hunts-traps-robot-557, great-ranges-v30 pin the same numbers)
  assert.equal(spikes(400, 0), Math.round(400 * TRAP_DAMAGE_SHARE)); assert.equal(spikes(400, 12), spikes(400, 0));
  assert.equal(dart(400, 0), Math.round(400 * DUNGEON_TRAPS.dart.share * trapShareScale(5))); assert.equal(dart(400, 14), dart(400, 0));
  assert.equal(rocks(200, 0), Math.round(200 * RANGES.rockslide.share * trapShareScale(10))); assert.equal(rockslideDamage(10, 200, 10), rockslideDamage(10, 200, 0));
  for (const ring of [45, 100, 190, 400]) {
    assert.ok(spikes(400, ring) > spikes(400, 0), `spikes at ring ${ring}`); assert.ok(dart(400, ring) > dart(400, 0), `a dart at ring ${ring}`); assert.ok(rocks(200, ring) > rocks(200, 0), `a rockslide at ring ${ring}`);
    assert.equal(spikes(400, ring), Math.round(400 * TRAP_DAMAGE_SHARE * trapRingScale(ring)));
  }
  assert.ok(spikes(400, 190) > spikes(400, 45));
});

test('the bounds: no share past maxShare of maximum health, no hit past hardCap even with the Threat Sigil at its height', () => {
  const top = 1 + THREAT_SIGIL.damage * THREAT_SIGIL.max;
  for (const hp of [60, 80, 184, 429, 905, 1399, 5000]) for (const level of [1, 15, 35, 70, 90, 200]) for (const ring of [0, 45, 100, 190, 400, 2000]) {
    for (const kind of ['sigil', 'lava', 'dart', 'vortex']) { const K = DUNGEON_TRAPS[kind]; if (!K.share) continue; const n = trapHit(K.share, K.base + K.perLevel * level, level, hp, ring); assert.ok(n <= Math.round(TRAP_REGION.maxShare * hp) || n <= 1, `${kind} ${hp} ${level} ${ring}: ${n}`); }
    assert.ok(rockslideDamage(level, hp, ring) <= Math.round(TRAP_REGION.maxShare * hp)); assert.ok(sigilTrapHit(trapHit(TRAP_DAMAGE_SHARE, 14, level, hp, ring), top, hp) <= TRAP_REGION.hardCap * hp);
  }
  assert.ok(spikes(400, 400, top, 200) < 400 && rocks(400, 400, top, 200) < 400, 'never one blow from full health');
  assert.equal(spikes(400, 0, 1.5), Math.round(400 * TRAP_DAMAGE_SHARE * 1.5), 'the Threat Sigil multiplies a trap as it does a blow');
});

test('in the game: the ring is the section\'s, as its creatures take it (a dungeon keeps its entrance section), and the Threat Sigil', () => {
  const s = freshSave(); s.seed = 'TRAPRING'; const g = new Game(s, 0);
  for (const [rx, ry] of [[0, 0], [45, 0], [-70, 72], [190, 3]]) { g.rx = rx; g.ry = ry; assert.equal(g.trapRing(), regionalThreat(rx, ry).ring); }
  g.area = 'dungeon'; g.rx = 100; g.ry = 0; assert.equal(g.trapRing(), 100, 'in a dungeon, its entrance section\'s ring');
  assert.equal(g.trapSigil(), 1); s.threatSigil = { step: 4 }; assert.ok(Math.abs(g.trapSigil() - (1 + THREAT_SIGIL.damage * 4)) < 1e-9);
});
