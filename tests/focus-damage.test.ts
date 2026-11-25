// Focus damage (Tim, 2026-11-25: "I just wasn't doing enough damage" with a Focus build against world bosses about 200 sections
// out). Measured on the real Game: a world beast made by createEnemyFromSpawn and scaled as scaleFresh scales it (regionalScale at
// ring 200), held still (the Great Sweep's freeze, which adds no damage) while a scripted Wayfarer at level 33 (Tim's save: every
// stat at 1, weapon level 12, relic gear at +9) taps Attack as fast as it is taken. At the same weapon bonus the Quandrix Staff's
// hands dealt .67 (Spinosaurus) to .83 (Crimson Tyrant) of the Verge Cleaver's damage per second at `hand.share` .32; at .4 they
// deal about .84 to 1.04. The Cleaver, the tools and the spells are untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, regionalScale, characterStats } from '../src/game.ts';
import { regionalThreat, APERTURE_THRESHOLDS } from '../src/world.ts';
import { normalizeItemUpgrade } from '../src/items.ts';
import { normalizeSockets } from '../src/glyphs.ts';
import { QUANDRIX } from '../src/quandrix-staff.ts';

const weapon = (name, property) => normalizeItemUpgrade(normalizeSockets({ id: `primary-${name.length}0953`, name, slot: 'primary', power: 53, basePower: 44, upgradeRank: 9, property, tier: 'relic', affixes: [{ id: 'attack', value: 5 }], glyphs: ['echo', 'leech', 'ignite'] }));
// Damage a second over `secs` of play, tapping Attack every third frame at 30 fps, `dist` tiles from the beast's centre line.
function dps(primary, beast, ring = 200, secs = 6, dist = 2.2) {
  const s = freshSave(); s.seed = 'FOCUS-DAMAGE'; s.level = 33; s.weaponLevel = 12; s.perception.aperture = APERTURE_THRESHOLDS[16];
  s.maxHp = characterStats(s).maxHp; s.hp = s.maxHp; s.equipment.primary = primary; s.activeWeaponSlot = 'primary';
  const g = new Game(s, 0); g.rx = ring; g.ry = 0; g.loadArea('overworld'); g.setPaused(false, 0); g.enemies = []; g.projectiles = [];
  for (const t of g.map.tiles) if (Math.abs(t.x - 16) < 9 && Math.abs(t.y - 15) < 6) Object.assign(t, { blocked: false, kind: 'grass', structure: null, environment: null, elev: 0 });
  const p = g.player, e = g.createEnemyFromSpawn({ id: `world-beast:${beast}:0`, kind: beast, x: 15 + dist, y: 15, boss: true, worldBeast: beast, traits: [] }, 'overworld');
  regionalScale(e, regionalThreat(ring, 0)); const big = 1e12; e.hp = e.maxHp = big; e.aggro = true; g.enemies.push(e);
  let now = 1000; const dt = 1 / 30, frames = Math.round(secs / dt);
  for (let i = 0; i < frames; i++) {
    let tap = i % 3 === 0;
    e.sweepFreeze = { build: 0, left: 30, hold: 30, guard: 0, tier: 0, idle: 0, calm: 0, fill: 0 }; e.x = 15 + dist; e.y = 15;
    g.update(dt, { state: { x: 0, y: 0 }, consume: (k) => (k === 'attack' && tap ? !(tap = false) : false), held: () => false }, now += dt * 1000);
    p.x = 15; p.y = 15; p.hp = s.maxHp; s.lastAim = { x: 1, y: 0 }; p.facing = 'right';
  }
  return (big - e.hp) / secs;
}

test('the Quandrix Staff\'s hands: .36 of the staff\'s power each (.32, then .4; .36 with the faster hands), a data-table number', () => {
  assert.equal(QUANDRIX.hand.share, .36);
});

test('at the same weapon bonus the Quandrix Staff now deals close to the Verge Cleaver\'s damage to a world beast at ring 200', () => {
  for (const beast of ['spinoRex', 'crimsonTyrant']) {
    const cleaver = dps(weapon('Verge Cleaver', 'impact'), beast), staff = dps(weapon('Quandrix Staff', 'arcane'), beast), ratio = staff / cleaver;
    assert.ok(cleaver > 0 && staff > 0, `${beast}: both land (${cleaver}, ${staff})`);
    // .67-.83 at share .32 and 2.2 tiles/s; .94-1.10 at .4; .87-1.09 at .36 with the faster hands (2026-11-25)
    assert.ok(ratio >= .85 && ratio <= 1.1, `${beast}: near parity (${ratio.toFixed(2)})`);
  }
});
