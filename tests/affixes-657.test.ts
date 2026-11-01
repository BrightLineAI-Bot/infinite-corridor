// Release 657 (Tim, 2026-11-01): elite affixes, champion auras and shamans that ward their pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AFFIXES, AFFIX_IDS, AURA, SHAMAN, rollAffixes, tickAffixes, affixNames } from '../src/affixes.ts';
import { packSpawns } from '../src/fractured.ts';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const foe = (id, x, y, more = {}) => ({ id, x, y, hp: 100, maxHp: 100, damage: 20, dead: false, scale: 1, speedMultiplier: 1, ...more });
const world = (enemies, px = 10, py = 10) => ({ player: { x: px, y: py }, enemies, projectiles: [], affixHazards: [] });
function run(g, from, ms, opts = {}) { let hurt = 0, poisoned = 0; for (let t = from; t < from + ms; t += 50) { if (opts.move) opts.move(g, t); tickAffixes(g, .05, t, (n) => { if (!(opts.dodging && opts.dodging(t))) hurt += n; }, () => { poisoned++; }); } return { hurt, poisoned }; }

test('affixes roll the same for the same key, different ones within a creature', () => {
  assert.deepEqual(rollAffixes('k', 2), rollAffixes('k', 2)); assert.equal(new Set(rollAffixes('k', 2)).size, 2);
  const seen = new Set(); for (let i = 0; i < 60; i++) for (const a of rollAffixes(`k${i}`, 1)) seen.add(a); assert.equal(seen.size, AFFIX_IDS.length, 'every affix turns up');
  assert.deepEqual(affixNames({ affixes: ['spiked', 'volcanic'] }), ['Spiked', 'Volcanic']);
});

test('Spiked: stand still and the spikes find you; keep moving and they miss', () => {
  const still = world([foe('e', 14, 10, { affixes: ['spiked'] })]); assert.ok(run(still, 0, 8000).hurt > 0, 'standing');
  const moving = world([foe('e', 14, 10, { affixes: ['spiked'] })]); const r = run(moving, 0, 8000, { move: (g, t) => { g.player.x = 10 + Math.sin(t / 150) * 2.2; g.player.y = 10 + Math.cos(t / 150) * 2.2; } });
  assert.ok(r.hurt < run(world([foe('e', 14, 10, { affixes: ['spiked'] })]), 0, 8000).hurt, `moving takes less (${r.hurt})`);
});

test('a dodge passes through a strike; Sky Assault and Volcanic hurt, Venomous poisons, Drone Swarm shoots', () => {
  assert.equal(run(world([foe('e', 13, 10, { affixes: ['skyAssault'] })]), 0, 9000, { dodging: () => true }).hurt, 0, 'dodging');
  assert.ok(run(world([foe('e', 13, 10, { affixes: ['skyAssault'] })]), 0, 9000).hurt > 0);
  assert.ok(run(world([foe('e', 13, 10, { affixes: ['volcanic'] })]), 0, 9000).hurt > 0);
  assert.ok(run(world([foe('e', 13, 10, { affixes: ['venomous'] })]), 0, 9000).poisoned > 0);
  const d = world([foe('e', 13, 10, { affixes: ['droneSwarm'] })]); run(d, 0, 5000); assert.ok(d.projectiles.some((p) => p.hostile && p.affixShot));
  const far = world([foe('e', 40, 40, { affixes: ['spiked'] })]); assert.equal(run(far, 0, 5000).hurt, 0, 'out of reach, quiet');
});

test('Enraged: below half its health it grows, hits harder and moves faster', () => {
  const e = foe('e', 13, 10, { affixes: ['enraged'] }), g = world([e]); run(g, 0, 100); assert.ok(!e.enragedOn);
  e.hp = 40; run(g, 100, 100); assert.ok(e.enragedOn && e.damage === 30 && e.speedMultiplier > 1 && e.scale > 1);
});

test('the aura: packmates near a living leader take less and deal more; the leader dead, they are plain again', () => {
  const lead = foe('lead', 12, 10, { affixes: ['spiked'] }), m = foe('m', 13, 10, { auraBy: 'lead' }), g = world([lead, m], 30, 30);
  run(g, 0, 100); assert.equal(m.damage, Math.round(20 * AURA.damage));
  m.hp -= 50; run(g, 100, 50); assert.equal(m.hp, 50 + 50 * AURA.reduce);
  lead.dead = true; run(g, 200, 50); assert.equal(m.damage, 20); const before = m.hp; m.hp -= 10; run(g, 300, 50); assert.equal(m.hp, before - 10);
});

test('the shaman: its packmates cannot be harmed while it lives and stands near; then they can', () => {
  const sh = foe('sh', 17, 10, { fracShaman: true }), m = foe('m', 12, 10, { wardBy: 'sh' }), g = world([sh, m], 30, 30);
  run(g, 0, 50); assert.ok(m.warded && m.untargetable);
  sh.dead = true; run(g, 50, 50); assert.ok(!m.warded && !m.untargetable);
});

test('packs: a champion or rare leader carries affixes and an aura; some packs have a shaman apart', () => {
  let shamans = 0, led = 0; for (let i = 0; i < 80; i++) { const out = packSpawns(`K${i}`, ['ashling'], 15, 15, 4, i % 2 ? 'champion' : 'rare', () => true, `p${i}`);
    const lead = out[0]; if (lead.affixes?.length === (i % 2 ? 1 : 2) && out.filter((q) => !q.fracShaman).slice(1).every((q) => q.auraBy === lead.id)) led++;
    const s = out.find((q) => q.fracShaman); if (s) { shamans++; assert.ok(Math.hypot(s.x - 15, s.y - 15) >= SHAMAN.distance[0] - 1, 'apart'); assert.ok(out.filter((q) => q !== s).every((q) => q.wardBy === s.id)); } }
  assert.equal(led, 80); assert.ok(shamans > 5 && shamans < 40, `${shamans} shamans`);
});

test('every crossing guardian carries an affix, the same one each time', () => {
  const s = freshSave(); s.seed = 'AFFIX'; const g = new Game(s, 0);
  const a = g.createEnemyFromSpawn({ id: 'guard-1', kind: 'hollowMarshal', x: 5, y: 5, boss: true, dungeonRole: 'gateWarden' }, 'dungeon'), b = g.createEnemyFromSpawn({ id: 'guard-1', kind: 'hollowMarshal', x: 5, y: 5, boss: true, dungeonRole: 'gateWarden' }, 'dungeon');
  assert.equal(a.affixes.length, 1); assert.deepEqual(a.affixes, b.affixes); assert.ok(AFFIXES[a.affixes[0]]);
  assert.equal(g.createEnemyFromSpawn({ id: 'x', kind: 'ashling', x: 5, y: 5 }).affixes, undefined, 'plain creatures carry none');
});
