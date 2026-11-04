// Sunburst Ricochet (Tim, 2026-11-04): "the passive for the Lumen Spindle: when the shots hit a wall they bounce — they ricochet
// — and break off into a bunch of little pieces, like a sunburst, and those little pieces do damage... the ricocheting shots do
// damage as well". A Lattice tool form (`field:lumen-sunburst`); tool-forms.ts SUNBURST holds its numbers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, updateProjectiles, projectileTileOpen } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { normalizeItemUpgrade } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { TOOL_FORMS, fieldForm } from '../src/lattice-fields.ts';
import { toggleLatticePassive } from '../src/constellation.ts';
import { SUNBURST } from '../src/tool-forms.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const W = 32;
const spindle = (extra = {}) => normalizeItemUpgrade({ id: 'secondary-lumen-spindle', name: 'Lumen Spindle', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], power: 20, upgradeRank: 4, ...extra });
// A room: open floor with a wall along x = 16 (and, with `sides`, along y = 7 and y = 12).
function arena({ passive = true, wall = true, sides = false, foes = [], area = 'dungeon', item = {} } = {}) {
  const s = freshSave(); s.seed = 'SUNBURST'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; s.stats.Focus = 30; ensureLattice(s);
  s.lattice.passives = passive ? ['field:lumen-sunburst'] : []; s.equipment.secondary = spindle(item); s.activeWeaponSlot = 'secondary';
  const g = new Game(s, 0);
  g.map = { ...g.map, width: W, height: W, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: W * W }, (_, i) => { const x = i % W, y = Math.floor(i / W); return { x, y, kind: 'ash', blocked: (wall && x === 16) || (sides && (y === 7 || y === 12) && x > 8) }; }) };
  g.area = area; g.paused = false; g.projectiles = []; g.effects = []; Object.assign(g.player, { x: 10, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: 'foe' + i, hp: 1e9, maxHp: 1e9, damage: 0, cooldown: 99, speed: 0, aggro: false }));
  return { s, g };
}
const step = (g, frames, t0, each = () => {}) => { let t = t0; for (let i = 0; i < frames; i++) { each(t); t += 50; g.update(.05, idle, t); g.player.x = 10; g.player.y = 9.55; } return t; };
const fire = (g, t, d = { x: 1, y: 0 }) => { g.player.attackReadyAt = 0; return g.fireSecondary(t, d); };

test('Sunburst Ricochet is a Lattice tool form whose numbers live in SUNBURST', () => {
  assert.ok(TOOL_FORMS['lumen-sunburst']); assert.equal(fieldForm('field:lumen-sunburst').name, 'Sunburst Ricochet');
  assert.match(TOOL_FORMS['lumen-sunburst'].text, new RegExp(`${SUNBURST.shards} small shards`));
  for (const k of ['ricochets', 'shards', 'share', 'spread', 'speed', 'life', 'pierce', 'perEnemy', 'maxLive']) assert.ok(SUNBURST[k] > 0, k);
  const { s } = arena({ passive: false }); assert.equal(toggleLatticePassive(s, 'field:lumen-sunburst').ok, true); assert.ok(s.lattice.passives.includes('field:lumen-sunburst'));
});

test('without the passive a Spindle shot behaves as before: it turns at a wall, dies at a wall on its way back, throws nothing', () => {
  const { g } = arena({ passive: false });
  fire(g, 1000); const shot = g.projectiles[0];
  assert.equal(shot.ricochet, undefined); assert.equal(shot.sunburst, undefined);
  let turnedAt = null; step(g, 40, 1000, () => { if (turnedAt === null && shot.returning) turnedAt = { dx: shot.dx, dy: shot.dy }; assert.equal(g.projectiles.filter((p) => p.shard).length, 0); });
  assert.ok(turnedAt && turnedAt.dx === -1 && turnedAt.dy === 0, 'turned straight back at the wall');
  // The pure stepper with no ricochet field: identical to the old rule, and a returning shot dies at a wall.
  const map = { tiles: Array.from({ length: W * W }, (_, i) => ({ blocked: i % W === 12 })) };
  const back = { id: 'b', x: 11.5, y: 5.5, dx: 1, dy: 0, speed: 10, life: 1, damage: 5, path: 'boomerang', age: 0, turnAfter: .8, returning: true, hits: {} };
  assert.equal(updateProjectiles([back], [], map, W, .1).length, 0, 'a returning shot ends at the wall');
});

test('a wall hit ricochets the shot (reflected, still cutting) and bursts into shards fanned away from the wall', () => {
  const { g } = arena({ foes: [[13.2, 11.2]] });
  const d = { x: Math.cos(.5), y: Math.sin(.5) }; fire(g, 1000, d); const shot = g.projectiles[0];
  assert.equal(shot.ricochet, SUNBURST.ricochets); assert.equal(shot.damageType, 'magic');
  let shards = [];
  step(g, 30, 1000, () => { for (const p of g.projectiles) if (p.shard && !shards.includes(p)) shards.push(p); if (shot.ricochet < SUNBURST.ricochets && !shot.seen) { shot.seen = true; assert.ok(shot.dx < 0 && shot.dy > 0, 'reflected off the wall: x turned, y kept'); assert.ok(shot.returning, 'a ricochet is its turn'); } });
  assert.ok(shot.seen, 'it ricocheted');
  assert.equal(shards.length, SUNBURST.shards);
  assert.ok(shards.every((p) => p.dx < 0 && p.damageType === 'magic' && p.damage === Math.max(1, Math.round(shot.damage * SUNBURST.share)) && p.glyphHost === null && !p.ricochet), 'fanned out of the wall, magic, a share of the shot');
  const spread = Math.max(...shards.map((p) => Math.atan2(p.dy, p.dx) < 0 ? Math.atan2(p.dy, p.dx) + 2 * Math.PI : Math.atan2(p.dy, p.dx))) - Math.min(...shards.map((p) => Math.atan2(p.dy, p.dx) < 0 ? Math.atan2(p.dy, p.dx) + 2 * Math.PI : Math.atan2(p.dy, p.dx)));
  assert.ok(spread <= SUNBURST.spread + 1e-9 && spread > SUNBURST.spread / 2, `a fan ${spread.toFixed(2)} wide`);
});

test('shards strike each foe once, and at most SUNBURST.perEnemy of one burst strike the same foe', () => {
  const { g } = arena({ foes: [[14.6, 9.0]] }); const foe = g.enemies[0];
  const shot = { id: 'x', x: 15.9, y: 9.5, dx: 1, dy: 0, damage: 100, damageType: 'magic', sunburst: true, ricochet: 1 };
  assert.equal(g.sunburst(shot, -1, 0), SUNBURST.shards);
  const shards = g.projectiles.filter((p) => p.shard); assert.ok(shards.every((p) => p.burst === shards[0].burst));
  const hp = foe.hp; let t = 1000; for (let i = 0; i < 12; i++) { t += 50; g.update(.05, idle, t); g.player.x = 10; foe.x = 14.6; foe.y = 9.0; }
  const n = Math.round((hp - foe.hp) / shards[0].damage);
  assert.ok(n >= 1 && n <= SUNBURST.perEnemy, `struck by ${n} shards`);
  assert.ok(shards.every((p) => Object.keys(p.hits).length <= 1), 'each shard struck the foe once at most');
});

test('the map edge is not a wall: no ricochet there', () => {
  const { g } = arena({ wall: false }); g.player.x = W - 3;
  const shot = { id: 'e', x: W - .3, y: 9.5, dx: 1, dy: 0, speed: 10, life: 1, damage: 5, path: 'boomerang', age: 0, turnAfter: .8, returning: false, hits: {}, ricochet: 2, sunburst: true };
  let calls = 0; updateProjectiles([shot], [], g.map, W, .1, undefined, undefined, null, undefined, undefined, undefined, [], null, () => calls++);
  assert.equal(calls, 0); assert.equal(shot.ricochet, 2); assert.ok(shot.returning, 'it turns back as before');
});

test('caps hold: firing every frame for 60 s in a corridor (awakened, with the shadow of more shots) stays bounded and finite', () => {
  const { g } = arena({ sides: true, foes: [[13, 9.5], [14.5, 8.5], [14.5, 10.5]], item: { awakened: { resonance: 'afterimage', version: 1 } } });
  let t = 1000, maxShards = 0, maxShots = 0, bursts = 0; const seen = new Set();
  for (let i = 0; i < 1200; i++) {
    g.player.attackReadyAt = 0; g.fireSecondary(t, { x: Math.cos(i * .37), y: Math.sin(i * .37) * .8 });
    t += 50; g.update(.05, idle, t); g.player.x = 10; g.player.y = 9.55;
    const shards = g.projectiles.filter((p) => p.shard), shots = g.projectiles.filter((p) => !p.shard);
    maxShards = Math.max(maxShards, shards.length); maxShots = Math.max(maxShots, shots.length);
    for (const p of shots) { assert.ok(p.ricochet >= 0 && p.ricochet <= SUNBURST.ricochets); assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.dx)); }
    for (const p of shards) { assert.ok(Number.isFinite(p.x) && Number.isFinite(p.damage)); if (!seen.has(p.burst)) { seen.add(p.burst); bursts++; } }
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp));
    if (seen.size > 400) seen.clear();
  }
  assert.ok(maxShards > 0 && maxShards <= SUNBURST.maxLive, `shards ${maxShards}`);
  assert.ok(maxShots <= 32 + 4, `shots ${maxShots}`); assert.ok(g.projectiles.length <= 32 + 4 + SUNBURST.maxLive);
  assert.ok(bursts > 50, 'it kept bursting');
});

test('in the overworld too, on a real generated section', () => {
  const s = freshSave(); s.seed = 'SUNBURST-OW'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = ['field:lumen-sunburst']; s.equipment.secondary = spindle(); s.activeWeaponSlot = 'secondary';
  const g = new Game(s, 0); g.paused = false; assert.equal(g.area, 'overworld');
  const w = g.map.width || Math.round(Math.sqrt(g.map.tiles.length)), h = g.map.tiles.length / w;
  let spot = null; // an open tile with three open tiles east of it, then a wall inside the map
  for (let y = 2; y < h - 2 && !spot; y++) for (let x = 2; x < w - 6 && !spot; x++) if ([0, 1, 2, 3].every((k) => projectileTileOpen(g.map, w, x + k + .5, y + .5)) && !projectileTileOpen(g.map, w, x + 4.5, y + .5) && g.map.tiles[y * w + x + 4]) spot = { x, y };
  assert.ok(spot, 'a wall to shoot at');
  g.enemies = []; g.projectiles = [];
  const shot = { id: 'ow', x: spot.x + 2.5, y: spot.y + .5, dx: 1, dy: 0, speed: 10, life: 1.5, damage: 40, damageType: 'magic', path: 'boomerang', age: 0, turnAfter: .8, returning: false, hits: {}, ricochet: SUNBURST.ricochets, sunburst: true, glyphHost: 'tool' };
  g.projectiles.push(shot); g.player.x = spot.x; g.player.y = spot.y; g.player.invulnerableUntil = 1e12;
  let shards = 0; let t = 1000; for (let i = 0; i < 6; i++) { t += 50; g.update(.05, idle, t); shards = Math.max(shards, g.projectiles.filter((p) => p.shard).length); }
  assert.ok(shot.ricochet < SUNBURST.ricochets, 'ricocheted in the overworld'); assert.ok(shards > 0, 'and burst');
});

test('clean on pause, death, travel and resume', () => {
  const { s, g } = arena({ foes: [[14.6, 9.0]] });
  g.sunburst({ id: 'p', x: 15.9, y: 9.5, damage: 50, damageType: 'magic', sunburst: true, ricochet: 1 }, -1, 0);
  const before = JSON.stringify(g.projectiles.map((p) => [p.x, p.y]));
  g.setPaused(true, 1000); g.update(.05, idle, 1050); g.update(.05, idle, 1100);
  assert.equal(JSON.stringify(g.projectiles.map((p) => [p.x, p.y])), before, 'paused: nothing moves'); g.setPaused(false, 1100);
  // Resume: the area snapshot carries the shards; a JSON round trip (a saved journey) restores them, finite, still capped per foe.
  g.snapshotArea(); const area = JSON.parse(JSON.stringify(s.session.areas[g.areaStateId()]));
  assert.doesNotThrow(() => migrateSave(JSON.parse(JSON.stringify(s))), 'the journey still migrates'); assert.ok(area.projectiles.filter((p) => p.shard).length === SUNBURST.shards);
  for (const p of area.projectiles) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.dx) && Number.isFinite(p.life) && p.burst && p.burst.cap === SUNBURST.perEnemy);
  const stepped = updateProjectiles(area.projectiles.map((p) => ({ ...p })), [], { tiles: g.map.tiles }, W, .5);
  assert.equal(stepped.length, 0, 'shards from a resumed journey expire on their own');
  // Travel and death drop them with every other projectile.
  g.loadArea('dungeon', false); const back = g.projectiles.filter((p) => p.shard);
  assert.equal(back.length, SUNBURST.shards, 'exact resume of the same area restores them'); assert.ok(back.every((p) => Number.isFinite(p.x) && p.life > 0));
  g.loadArea('overworld', true); assert.equal(g.projectiles.filter((p) => p.shard).length, 0, 'travel to another area leaves them behind');
  const left = migrateSave(JSON.parse(JSON.stringify(s))); assert.ok(Object.values(left.session.areas).every((a) => !(a.projectiles || []).some((p) => p.shard)), 'a left area keeps no shards (frozen motion)');
  const { g: g2 } = arena(); g2.sunburst({ id: 'd', x: 15.9, y: 9.5, damage: 50, damageType: 'magic', sunburst: true, ricochet: 1 }, -1, 0);
  g2.player.hp = 0; let t = 1000; for (let i = 0; i < 80 && g2.projectiles.length; i++) { t += 50; g2.update(.05, idle, t); }
  assert.equal(g2.projectiles.filter((p) => p.shard).length, 0, 'gone after death');
});
