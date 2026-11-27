// The crown is its own space (Tim, 2026-11-26): "on top of a great tree's crown, creatures on the ground floor can still attack
// him and even jump up to him, and he can lock on to them and hit them if they're in range." game.ts VERTICAL_SEPARATION: with
// the Wayfarer `levels` or more above a creature that does not fly, the creature loses interest (no notice, no leap, no blow, no
// new shot) and the Wayfarer cannot pick it with a swing, a spell, a tool or the lock; only the Carbine takes aim down there, and
// only its full charge (the shot that passes through terrain) strikes. Fliers still reach the crown. Coming down, all is as before.
// The real Game on the rite tree of Tim's journey (crown at 38 levels, on flat ground).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, crownSpot, VERTICAL_SEPARATION, ELEVATION_REACH, farBelow, strikesBelow, pickMeleeTarget, selectRangedAim, updateEffects } from '../src/game.ts';
import { normalizeItemUpgrade, CARBINE_RANK } from '../src/items.ts';
import { CARBINE } from '../src/tool-forms.ts';

const W = 32, still = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const coil = (rank = CARBINE_RANK) => normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + rank, upgradeRank: rank });
function tree({ carbine = false } = {}) {
  const s = freshSave(); s.seed = 'CORRIDOR-MWQDXDQA1BNE5V'; s.maxHp = 100; s.ascendancy = { '-3,1': { tries: 1, done: true, risen: true, bloom: true } };
  if (carbine) { s.equipment.secondary = coil(); s.activeWeaponSlot = 'secondary'; s.rounds = { ...(s.rounds || {}), loaded: 1e5 }; s.materials = { ...(s.materials || {}), cinderIron: 1e7 }; }
  const g = new Game(s, 0); g.rx = -3; g.ry = 1; g.loadArea('overworld', false); g.enemies = []; g.map.enemySpawns = []; g.projectiles = []; g.effects = [];
  const crown = crownSpot(g.map); Object.assign(g.player, crown);
  let ground = null, bd = Infinity; // the nearest open ground at level 0 (beside the trunk, under the crown's rim)
  for (const t of g.map.tiles) { if (t.canopy || t.blocked || (t.elev || 0) !== 0) continue; const d = Math.hypot(t.x - crown.x, t.y - crown.y); if (d < bd) { bd = d; ground = t; } }
  return { g, crown, ground: { x: ground.x, y: ground.y - .25 } };
}
const foe = (g, kind, at, extra = {}) => { const e = g.createEnemyFromSpawn({ id: `t-${kind}`, kind, x: at.x, y: at.y }); Object.assign(e, extra); g.enemies.push(e); return e; };
const still2 = { hp: 1e6, maxHp: 1e6, damage: 0, speedMultiplier: 0 }; // a target that stays where it is
const levelUnder = (g, e) => g.map.tiles[Math.floor(e.y + .75) * W + Math.floor(e.x + .5)]?.elev || 0;
// Frames with the Wayfarer held at `spot`; health is kept topped up so every blow that lands is counted.
function hold(g, spot, frames, t = 2000) {
  let lost = 0, highest = 0, aggro = false; const full = () => Math.min(100, Number(g.save.maxHp) || 100); // the Game sets maximum health from the build
  for (let i = 0; i < frames; i++) { Object.assign(g.player, spot); const H = (g.player.hp = full()); g.player.invulnerableUntil = 0; g.update(1 / 60, still, t += 1000 / 60); lost += Math.max(0, H - g.player.hp); for (const e of g.enemies) { highest = Math.max(highest, levelUnder(g, e)); aggro ||= !!e.aggro; } }
  return { lost, highest, aggro, t };
}

test('the table: separate spaces from six levels up (over every roof, ledge and landscape height), the Carbine\'s full charge reaches down', () => {
  assert.equal(VERTICAL_SEPARATION.levels, 6); assert.ok(VERTICAL_SEPARATION.levels > ELEVATION_REACH.levels, 'body blows already stop at two levels; interest at six');
  assert.deepEqual({ ...VERTICAL_SEPARATION.below }, { weapon: 'carbine', shot: 'pierce' });
  assert.equal(strikesBelow({ carbine: true, charge: 1 }), true, 'a full charge'); assert.equal(strikesBelow({ carbine: true, charge: .5, carbineCharged: true }), false, 'a part charge passes over');
  assert.equal(strikesBelow({ carbine: true, charge: 0 }), false, 'a tap passes over'); assert.equal(strikesBelow({ charge: 1 }), false, 'any other shot passes over');
  const { g, ground } = tree(), map = g.map;
  assert.equal(g.playerLevel(), 38, 'on the crown');
  assert.equal(farBelow(map, W, { x: ground.x, y: ground.y, kind: 'ashling' }, 38), true);
  assert.equal(farBelow(map, W, { x: ground.x, y: ground.y, kind: 'ashling' }, 5), false, 'five up (a great roof): not separate');
  assert.equal(farBelow(map, W, { x: ground.x, y: ground.y, kind: 'veilMoth' }, 38), false, 'a flier is never far below');
  assert.equal(farBelow({ ...map, landscape: null }, W, { x: ground.x, y: ground.y, kind: 'ashling' }, 38), false, 'no levels, no separation');
});

test('a ground leaper beside the trunk neither notices, leaps up to, nor hurts the Wayfarer on the crown (it did with the rule lifted)', () => {
  const run = (levels, kind) => { const keep = VERTICAL_SEPARATION.levels; VERTICAL_SEPARATION.levels = levels;
    try { const { g, crown, ground } = tree(); foe(g, kind, ground); return hold(g, crown, 900); } finally { VERTICAL_SEPARATION.levels = keep; } };
  for (const kind of ['pallidCrawler', 'crystalCrab', 'veilSpinner']) {
    const open = run(99, kind), ruled = run(VERTICAL_SEPARATION.levels, kind);
    assert.equal(open.highest, 38, `${kind}: without the rule it leaps up onto the crown (Tim's report)`); assert.ok(open.lost > 0, `${kind}: and hurts him (${open.lost})`);
    assert.equal(ruled.highest, 0, `${kind}: with it, it stays on the ground`); assert.equal(ruled.lost, 0, `${kind}: nothing lands`);
  }
  // an ordinary (legacy) creature too: it goes quiet rather than standing under him
  const { g, crown, ground } = tree(), e = foe(g, 'ashling', ground, { aggro: true }); const r = hold(g, crown, 600);
  assert.equal(r.lost, 0); assert.equal(e.aggro, false, 'it lost interest'); assert.ok(!(e.telegraph > 0), 'no windup');
});

test('it re-engages when he climbs down; a creature that flies still reaches the crown', () => {
  const { g, crown, ground } = tree(), e = foe(g, 'pallidCrawler', ground, { aggro: true });
  const up = hold(g, crown, 300); assert.equal(up.lost, 0); assert.equal(e.aggro, false); assert.equal(e.farBelow, true);
  const beside = g.map.tiles.filter((t) => !t.canopy && !t.blocked && !(t.elev || 0) && Math.hypot(t.x - e.x, t.y - .25 - e.y) >= .9).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
  const down = hold(g, { x: beside.x, y: beside.y - .25 }, 900, up.t); assert.equal(e.farBelow, false, 'on the ground together'); assert.ok(down.aggro, 'it notices him again'); assert.ok(down.lost > 0, `and its blows land (${down.lost})`);
  // a moth from the same ground flies up and strikes
  const h = tree(), moth = foe(h.g, 'veilMoth', h.ground, { aggro: true }); const r = hold(h.g, h.crown, 900);
  assert.notEqual(moth.farBelow, true, 'a flier is never far below'); assert.ok(r.lost > 0, `the moth reaches the crown (${r.lost})`);
});

test('from the crown: no swing, spell, tool or lock picks a foe far below; another ranged shot and a blast pass it by', () => {
  const { g, crown, ground } = tree(), e = foe(g, 'ashling', ground, still2); g.markFarBelow(); assert.equal(e.farBelow, true);
  assert.equal(pickMeleeTarget(g.player, g.enemies, g.map, W, 40), null, 'swings and spells (they pick by pickMeleeTarget) find nothing');
  assert.equal(selectRangedAim(g.player, g.enemies, g.map, W, 40), null, 'tool auto aim finds nothing');
  assert.equal(g.lockTarget(e.id), null, 'the lock is refused'); assert.equal(g.message, VERTICAL_SEPARATION.messages.lock); assert.equal(g.lockedTarget(), null);
  assert.equal(g.reachesBelow(), false, 'the starting Spark Coil is not the Carbine');
  // the Spark Coil's shot, aimed straight at it, flies over (with the rule lifted, the same shot strikes it)
  const coilShot = (levels) => { const keep = VERTICAL_SEPARATION.levels; VERTICAL_SEPARATION.levels = levels;
    try { const q = tree(), f = foe(q.g, 'ashling', q.ground, still2); q.g.markFarBelow(); const d = { x: f.x - q.g.player.x, y: f.y - q.g.player.y }, m = Math.hypot(d.x, d.y); q.g.player.attackReadyAt = 0;
      q.g.fireSecondary(3000, { x: d.x / m, y: d.y / m }, 'tool'); assert.ok(q.g.projectiles.length > 0, 'a shot was loosed'); hold(q.g, q.crown, 60, 3000); return 1e6 - f.hp; } finally { VERTICAL_SEPARATION.levels = keep; } };
  assert.ok(coilShot(99) > 0, 'control: without the rule the Spark Coil strikes it'); assert.equal(coilShot(VERTICAL_SEPARATION.levels), 0, 'the shot passed over it');
  // a blast (a spell's, a shell's) on top of it misses; the same blast on the ground with him lands
  const fx = (x, y) => ({ id: 'b', kind: 'rift-blast', x, y, life: .3, radius: 2, untilPulse: 0, pulse: 99, damage: 50, hostile: false, hits: {} });
  updateEffects([fx(e.x + .5, e.y + .45)], [e], 1 / 60); assert.equal(e.hp, 1e6, 'a blast far below misses');
  e.farBelow = false; updateEffects([fx(e.x + .5, e.y + .45)], [e], 1 / 60); assert.ok(e.hp < 1e6, 'the same blast lands when not separated');
});

test('with the Carbine: auto aim and the lock take a foe far below; its full charge strikes it, a tap does not; nothing else does', () => {
  const { g, crown, ground } = tree({ carbine: true }), e = foe(g, 'ashling', ground, still2); g.markFarBelow(); assert.equal(e.farBelow, true);
  assert.equal(g.reachesBelow(), true); assert.ok(selectRangedAim(g.player, g.enemies, g.map, W, CARBINE.range, true), 'Carbine auto aim finds it');
  assert.ok(g.lockTarget(e.id), 'the lock takes it'); assert.equal(g.lockedTarget(), e);
  assert.equal(g.reachLock(), null, 'but a swing, spell or skill does not use that lock'); assert.equal(pickMeleeTarget(g.player, g.enemies, g.map, W, 40), null);
  assert.equal(selectRangedAim(g.player, g.enemies, g.map, W, 40), null, 'other auto aim still finds nothing');
  const aim = () => { const d = { x: e.x - g.player.x, y: e.y - g.player.y }, m = Math.hypot(d.x, d.y); return { x: d.x / m, y: d.y / m }; };
  let t = 4000;
  assert.equal(g.carbineFire(t, aim(), 0), true, 'a tap'); t = hold(g, crown, 30, t).t; assert.equal(e.hp, 1e6, 'a tap passes over it');
  { const keep = VERTICAL_SEPARATION.levels; VERTICAL_SEPARATION.levels = 99; try { g.player.attackReadyAt = 0; g.carbineFire(t, aim(), 0); t = hold(g, crown, 30, t).t; assert.ok(e.hp < 1e6, 'control: without the rule the same tap strikes it'); } finally { VERTICAL_SEPARATION.levels = keep; } e.hp = 1e6; g.markFarBelow(); }
  g.player.attackReadyAt = 0; assert.equal(g.carbineFire(t, aim(), CARBINE.charge.full), true, 'a full charge'); hold(g, crown, 30, t); assert.ok(e.hp < 1e6, `the full charge strikes it (${1e6 - e.hp})`);
});
