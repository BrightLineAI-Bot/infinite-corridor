// Bounded r603 migration audit. Representative synthetic legacy fixtures, not archived user saves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { splitSnapshot, assembleSave } from '../src/persistence.ts';
const clone = (x) => JSON.parse(JSON.stringify(x));
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };

for (let version = 1; version <= 14; version++) test(`audit migration: supported schema ${version} retains representative journey and runs`, () => {
  const raw = { version, seed: `AUDIT-LEGACY-${version}`, name: 'Legacy traveler', hp: 37,
    level: 3, currency: 71, stats: { Might: 4 },
    position: { area: 'overworld', x: 16, y: 16 },
    session: { area: 'overworld', rx: 0, ry: 0, x: 16, y: 16,
      playerRuntime: { hp: 37, stamina: 31 },
      areas: { 'overworld:0:0': { enemies: [], objects: [], unknownAreaMarker: { retained: true } } },
      unknownSessionMarker: 'keep' },
    worldFlags: { historicalMilestone: true },
    narrative: { journal: [{ recordId: 'audit-old', text: 'Kept journal' }], facts: { oldFact: true }, appliedInstanceKeys: { 'audit-old': true } },
    consequences: { dungeons: { 'dungeon:historical': { generatorVersion: 3, visits: 2, guardianDefeated: true } } },
    unknownRootMarker: { nested: ['kept', version] } };
  const m = migrateSave(clone(raw));
  assert.equal(m.version, 14); assert.equal(m.worldGeneration, version < 3 ? 0 : 1);
  assert.equal(m.seed, raw.seed); assert.equal(m.name, raw.name); assert.equal(m.currency, 71);
  assert.equal(m.stats.Might, 4); assert.equal(m.worldFlags.historicalMilestone, true);
  assert.deepEqual(m.unknownRootMarker, raw.unknownRootMarker);
  assert.equal(m.session.unknownSessionMarker, 'keep');
  assert.deepEqual(m.session.areas[`overworld:0:0:g${m.worldGeneration}`].unknownAreaMarker, { retained: true });
  assert.equal(m.narrative.journal[0].recordId, 'audit-old');
  assert.equal(m.narrative.appliedInstanceKeys['audit-old'], true);
  assert.equal(m.consequences.dungeons['dungeon:historical'].generatorVersion, 3);
  assert.equal(m.consequences.dungeons['dungeon:historical'].layoutVersion, 0);
  const g = new Game(m, 1000); g.update(.016, idle, 1016);
  assert.ok(Number.isFinite(g.player.hp));
  assert.deepEqual([g.rx, g.ry], [0, 0]);
});

test('audit migration: absent additive state is created without regenerating visited history', () => {
  const s = freshSave(); s.seed = 'AUDIT-ADDITIVE';
  for (const key of ['mech', 'lattice', 'skylands', 'lore', 'mapMarks', 'playSeconds', 'marginalia', 'build', 'regrowth', 'presetGear', 'worldBeasts']) delete s[key];
  s.consequences.dungeons['dungeon:kept'] = { generatorVersion: 2, layoutVersion: 0, visits: 4, guardianDefeated: true };
  s.session.areas['dungeon:kept'] = { enemies: [{ id: 'dead', kind: 'hollowMarshal', dead: true, hp: 0 }], objects: [{ id: 'kept-chest', state: 'open' }] };
  const before = clone(s.session.areas), migrated = migrateSave(clone(s));
  assert.deepEqual(migrated.session.areas, before);
  assert.equal(migrated.consequences.dungeons['dungeon:kept'].generatorVersion, 2);
  assert.equal(migrated.consequences.dungeons['dungeon:kept'].guardianDefeated, true);
  assert.equal(migrated.playSeconds, 0); assert.ok(Array.isArray(migrated.mapMarks));
  assert.doesNotThrow(() => new Game(migrated, 0));
});

test('audit migration: real Game snapshot preserves runtime clock offsets and split area records', () => {
  const s = freshSave(); s.seed = 'AUDIT-SNAPSHOT'; const g = new Game(s, 1000);
  g.player.hp = 37; g.player.stamina = 29; g.player.attackReadyAt = 1800;
  g.player.dodgeReadyAt = 2200; g.player.invulnerableUntil = 1600;
  g.jumpUntil = 1500; g.guardRemaining = .8;
  const snapshot = clone(g.exportSnapshot(1200));
  const split = splitSnapshot(snapshot), assembled = assembleSave(clone(split.main), new Map(clone(split.puts)));
  const migrated = migrateSave(assembled);
  assert.deepEqual(migrated.session.areas, snapshot.session.areas);
  assert.deepEqual(migrated.session.playerRuntime, snapshot.session.playerRuntime);
  const resumed = new Game(migrated, 9000);
  assert.equal(resumed.player.hp, 37); assert.equal(resumed.player.stamina, 29);
  assert.equal(resumed.player.attackReadyAt, 9600); assert.equal(resumed.player.dodgeReadyAt, 10000);
  assert.equal(resumed.player.invulnerableUntil, 9400); assert.equal(resumed.jumpUntil, 9300);
  assert.equal(resumed.guardRemaining, .8);
});

test('audit migration: documented damaged-container repairs still create a playable save', () => {
  const mutations = [
    s => { s.inventory = {}; }, s => { s.narrative.journal = {}; },
    s => { s.session.areas = { bad: null }; }, s => { s.consequences.dungeons = { bad: null }; },
    s => { s.narrative = 7; }, s => { s.session = 'bad'; },
    s => { s.stats = null; }, s => { s.currency = '1e309'; s.playSeconds = -50; }
  ];
  for (const mutate of mutations) {
    const s = clone(freshSave()); mutate(s); const m = migrateSave(s);
    const g = new Game(m, 0); g.update(.016, idle, 16);
    assert.ok(Number.isFinite(g.player.hp)); assert.ok(Number.isFinite(m.currency));
  }
});
