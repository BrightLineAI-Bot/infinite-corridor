// Tim's follow-up (2026-11-25): the faster Quandrix hands never tunnel past a foe; the Salvage Blade's Focus boost (a data-table
// share) and its look, a blue forked blade with one fork snapped halfway up. (The solid dodge is pinned in
// briar-stag-stutter.test.ts, the penultimate slam in charge-holds-touch.test.ts.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, regionalScale, characterStats } from '../src/game.ts';
import { regionalThreat, APERTURE_THRESHOLDS } from '../src/world.ts';
import { normalizeItemUpgrade, PRIMARY_PROFILES, QUANDRIX_STAFF } from '../src/items.ts';
import { normalizeSockets } from '../src/glyphs.ts';
import { createCombatant } from '../src/combat.ts';
import { QUANDRIX, castHand, latestHand, tickQuandrix } from '../src/quandrix-staff.ts';
import { CLOSE_VIEW_HERO_WEAPON_FORM, MODEL_FLOATS, writeCloseViewHeroGear } from '../src/close-view-models.ts';
import { SALVAGE_BLADE_STD } from '../src/renderer.ts';

test('the hands fly at 2.2 tiles/s again (Tim, 2026-11-26; 3.025 in release 1070) with the same reach and the same blows per tile', () => {
  const H = QUANDRIX.hand;
  assert.equal(H.speed, 2.2, `${H.speed} tiles/s`); assert.equal(H.life, 2.2); assert.equal(H.rehit, .3);
  assert.ok(Math.abs(H.speed * H.life - PRIMARY_PROFILES['primary-quandrix-staff'].range) < .01, 'reach unchanged');
  assert.ok(Math.abs(H.speed * H.rehit - 2.2 * .3) < .01);
  assert.ok(H.step <= H.radius, 'a hand moves no further than its own radius between body checks');
});

test('a long frame cannot carry a hand past a foe: bodies are checked at every sub-step', () => {
  const s = freshSave(); s.seed = 'HANDS-TUNNEL'; s.level = 15; s.equipment.primary = { id: 'primary-qs', name: QUANDRIX_STAFF.name, slot: 'primary', power: 15, basePower: 15, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [] };
  const g = new Game(s, 0); g.area = 'dungeon';
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 });
  const h = castHand(g, 1000, 1, 0); g.quandrix.where = g.orreryWhere(); const x0 = h.x, dt = 1, end = x0 + QUANDRIX.hand.speed * dt, reach = QUANDRIX.hand.radius + .38;
  const e = Object.assign(createCombatant('ashling', 0, 0), { id: 'foe', hp: 1e6, maxHp: 1e6 }); e.x = (x0 + end) / 2 - .5; e.y = h.y - .45; g.enemies = [e];
  assert.ok(Math.abs(e.x + .5 - x0) > reach && Math.abs(e.x + .5 - end) > reach, 'neither the start nor the end touches the foe');
  tickQuandrix(g, dt, 1600, false);
  assert.ok(latestHand(g) && Math.abs(latestHand(g).x - end) < 1e-6, 'the hand covered the whole frame');
  assert.ok(e.hp < 1e6, 'and struck the foe it passed through');
});

// As tests/focus-damage.test.ts: a world beast at ring 200, held still, Tim's level-33 Wayfarer tapping Attack.
const weapon = (name, property) => normalizeItemUpgrade(normalizeSockets({ id: `primary-${name.length}0953`, name, slot: 'primary', power: 53, basePower: 44, upgradeRank: 9, property, tier: 'relic', affixes: [{ id: 'attack', value: 5 }], glyphs: ['echo', 'leech', 'ignite'] }));
function dps(primary, beast = 'spinoRex', ring = 200, secs = 6, dist = 2.2) {
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

test('the Salvage Blade: its cuts at 1.2 (a data-table share), about .93 of the Verge Cleaver at the same bonus (was .77)', () => {
  assert.equal(PRIMARY_PROFILES['salvage-blade'].share, 1.2);
  for (const [k, v] of Object.entries(PRIMARY_PROFILES)) if (k !== 'salvage-blade') assert.equal(v.share, undefined, `${k} unchanged`);
  const cleaver = dps(weapon('Verge Cleaver', 'impact')), blade = dps(weapon('Salvage Blade', 'steady')), ratio = blade / cleaver;
  assert.ok(ratio >= .85 && ratio <= 1, `near parity, not past it (${ratio.toFixed(3)})`);
  assert.ok(ratio / 1.2 < .8, `before, it trailed (${(ratio / 1.2).toFixed(3)})`);
});

test('the Salvage Blade\'s look: blue, two tines, one whole to the point and one snapped about halfway (Close View and Standard View)', () => {
  const F = CLOSE_VIEW_HERO_WEAPON_FORM.salvage, B = F.blade, out = new Float32Array(256 * 3 * MODEL_FLOATS), id = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const end = writeCloseViewHeroGear(out, 0, { profile: 'salvage-blade', leftSocket: id, rightSocket: id }), k = .82;
  assert.equal(end / MODEL_FLOATS / 3, 58, 'inside its old 58: the held primary and the largest tool share one 256-triangle slot');
  const rgb = (c) => [(c >> 16) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255], is = (i, c) => rgb(c).every((x, j) => Math.abs(out[i + 6 + j] - x) < 1e-4);
  for (const c of Object.values(F.colors)) { const [r, g, b] = rgb(c); assert.ok(b > r && b > g, 'blue'); }
  // The tines: socket +X is up the blade; the recipe's Y (the blade's width) lands on the socket's Z, its sign flipped.
  const tops = { whole: -Infinity, broken: -Infinity }; let breakFace = 0;
  for (let i = 0; i < end; i += MODEL_FLOATS) {
    if (is(i, F.colors.tine)) { const side = out[i + 2] < 0 ? 'whole' : 'broken'; tops[side] = Math.max(tops[side], out[i]); }
    if (is(i, F.colors.break)) breakFace++;
  }
  const up = (z) => (z - .79) * k, half = B.fork + (B.tip - B.fork) * B.broken.at;
  assert.ok(Math.abs(tops.whole - up(B.tip)) < 1e-5, `one tine runs to the point (${JSON.stringify(tops)} ${up(B.tip)})`);
  assert.ok(Math.abs(tops.broken - up(half)) <= Math.max(...B.broken.jag) * k + 1e-5 && tops.broken < tops.whole - .1, `the other stops about halfway (${tops.broken.toFixed(3)} of ${tops.whole.toFixed(3)})`);
  assert.equal(breakFace, 6, 'a jagged, bright break (two triangles)');
  assert.ok(new Set(B.broken.jag).size === 4, 'its four corners at four heights');
  // Standard View: the same blues, a whole tine longer than the snapped one.
  assert.ok(SALVAGE_BLADE_STD.prong[0] > SALVAGE_BLADE_STD.broken * 1.6);
  for (const c of [SALVAGE_BLADE_STD.blade, SALVAGE_BLADE_STD.tine, SALVAGE_BLADE_STD.break]) assert.ok(Object.values(F.colors).includes(parseInt(c.slice(1), 16)));
});
