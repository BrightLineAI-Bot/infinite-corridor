import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { openQuest, questEvent } from '../src/quest-places.ts';
import { questState, stepCount } from '../src/quests.ts';
import { ensureSeeds } from '../src/skylands.ts';
import { CANYON, canyonIdFor, ensureCanyonHistory } from '../src/canyon.ts';

const foe = (g, kind, n) => g.createEnemyFromSpawn({ id: `recovery-${kind}-${n}`, kind, x: g.player.x + 1, y: g.player.y }, g.area);
const fell = (g, e) => { g.enemies.push(e); e.hp = 0; e.dead = true; g.defeatEnemy(e); };
const tomb = (g) => ({ kind: 'watcherTomb', id: 'recovery-tomb', x: g.player.x, y: g.player.y, where: 'field' });

test('Glyph Mine replaces five uncollected sigils after their Pumice realm is destroyed', () => {
  const s = freshSave(); s.seed = 'QUEST-TOKEN-REALM'; openQuest(s, 'glyph-mine'); ensureSeeds(s).pumice = 2;
  const g = new Game(s, 0); g.loadArea('overworld', false); g.map.objects.push(tomb(g));
  assert.ok(g.enterSeedRealm(tomb(g), 'pumice').ok);
  const first = g.areaId(); g.enemies = [];
  for (let i = 0; i < 5; i++) fell(g, foe(g, 'veinWraith', i));
  assert.equal(questState(s, 'glyph-mine').tokens.length, 5, 'all five uncollected sigils are recorded');

  g.leaveSeedRealm();
  assert.equal(questState(s, 'glyph-mine').tokens.length, 0, 'normal realm destruction repairs the orphan records');
  assert.equal(stepCount(s, 'glyph-mine', 'wraiths'), 0, 'lost objects grant no progress');
  assert.ok(!s.session.areas[first] && !s.consequences.dungeons[first], 'the old realm really is gone');

  g.map.objects.push(tomb(g)); assert.ok(g.enterSeedRealm(tomb(g), 'pumice').ok); g.enemies = [];
  for (let i = 0; i < 5; i++) {
    fell(g, foe(g, 'veinWraith', 10 + i));
    const token = g.map.objects.find((o) => o.kind === 'questToken'); assert.ok(token);
    assert.ok(g.questTokenAct(token).ok);
  }
  assert.equal(stepCount(s, 'glyph-mine', 'wraiths'), 5);
  assert.equal(questState(s, 'glyph-mine').tokens.length, 0);
  g.loadArea('dungeon', false);
  assert.equal(g.map.objects.filter((o) => o.kind === 'questToken').length, 0, 'reload cannot duplicate collected sigils');
});

test('only a collapsed canyon loses quest tokens; revisitable history and collected counts survive', () => {
  const s = freshSave(); s.seed = 'QUEST-TOKEN-CANYON'; openQuest(s, 'corridor-golem');
  const g = new Game(s, 0), id = canyonIdFor(s.seed, 9, 4);
  s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 9, ry: 4, x: 16, y: 16 }; g.rx = 9; g.ry = 4; g.loadArea('dungeon', false); g.enemies = [];
  for (let i = 0; i < 5; i++) fell(g, foe(g, 'earthGolem', i));
  const held = g.map.objects.find((o) => o.kind === 'questToken'); assert.ok(held); assert.ok(g.questTokenAct(held).ok);
  assert.equal(stepCount(s, 'corridor-golem', 'golems'), 1);
  assert.equal(questState(s, 'corridor-golem').tokens.length, 4);
  g.loadArea('dungeon', false);
  assert.equal(questState(s, 'corridor-golem').tokens.length, 4, 'an open crater remains revisitable');

  const h = ensureCanyonHistory(s.consequences.dungeons[id]); h.caveIns = CANYON.caveIn.limit - 1;
  assert.equal(g.caveIn({ x: 2, y: 2 }, h, 1000), true, 'the production collapse path seals the crater');
  g.rx = 9; g.ry = 4; g.loadArea('overworld', false);
  assert.equal(questState(s, 'corridor-golem').tokens.length, 0, 'buried hearts no longer block replacements');
  assert.equal(stepCount(s, 'corridor-golem', 'golems'), 1, 'the already collected heart is preserved');
  assert.equal(questEvent(s, { on: 'kill', kind: 'earthGolem', where: ['canyon'], areaId: 'canyon:other', x: 3, y: 3 }).lay.length, 1, 'a later qualifying kill can replace one, without farming progress');
});

test('old-save exact resume recovers only permanent-loss tokens and preserves opaque quest state', () => {
  const s = freshSave(); s.seed = 'QUEST-TOKEN-OLD-SAVE'; openQuest(s, 'glyph-mine'); openQuest(s, 'corridor-golem'); ensureSeeds(s).pumice = 1;
  const g = new Game(s, 0); g.loadArea('overworld', false); g.map.objects.push(tomb(g)); assert.ok(g.enterSeedRealm(tomb(g), 'pumice').ok);
  const active = g.areaId(), glyph = questState(s, 'glyph-mine'), canyon = questState(s, 'corridor-golem');
  glyph.counts = { wraiths: 2 }; glyph.futureQuestField = { keep: 'glyph' };
  glyph.tokens = [
    { id: 'glyph-mine:wraiths:active', step: 'wraiths', area: active, x: 8, y: 8, futureTokenField: 'active' },
    { id: 'glyph-mine:wraiths:orphan', step: 'wraiths', area: 'seedrealm:OLD:v1:pumice:7', x: 9, y: 9, futureTokenField: 'lost' },
    { id: 'glyph-mine:wraiths:ordinary', step: 'wraiths', area: 'dungeon:revisitable', x: 10, y: 10, futureTokenField: 'ordinary' },
  ];
  canyon.counts = { golems: 1 }; canyon.futureQuestField = { keep: 'canyon' };
  canyon.tokens = [
    { id: 'corridor-golem:golems:sealed', step: 'golems', area: 'canyon:sealed', x: 11, y: 11, futureTokenField: 'buried' },
    { id: 'corridor-golem:golems:open', step: 'golems', area: 'canyon:open', x: 12, y: 12, futureTokenField: 'open' },
  ];
  s.consequences.dungeons['canyon:sealed'] = { canyon: { caveIns: 3, sealed: true, pulled: false, drilled: [], strained: [] } };
  s.consequences.dungeons['canyon:open'] = { canyon: { caveIns: 1, sealed: false, pulled: false, drilled: [4], strained: [] }, futureHistoryField: 'keep' };
  s.futureSaveField = { keep: 42 };

  const migrated = migrateSave(JSON.parse(JSON.stringify(g.exportSnapshot(1200))));
  assert.deepEqual(migrated.futureSaveField, { keep: 42 });
  assert.deepEqual(questState(migrated, 'glyph-mine').futureQuestField, { keep: 'glyph' });
  assert.equal(questState(migrated, 'glyph-mine').tokens.find((t) => t.id.endsWith(':ordinary')).futureTokenField, 'ordinary');
  assert.equal(stepCount(migrated, 'glyph-mine', 'wraiths'), 2); assert.equal(stepCount(migrated, 'corridor-golem', 'golems'), 1);

  const resumed = new Game(migrated, 1200);
  assert.equal(resumed.areaId(), active, 'the current seed realm resumes normally');
  assert.deepEqual(questState(migrated, 'glyph-mine').tokens.map((t) => t.id).sort(), ['glyph-mine:wraiths:active', 'glyph-mine:wraiths:ordinary']);
  assert.deepEqual(questState(migrated, 'corridor-golem').tokens.map((t) => t.id), ['corridor-golem:golems:open']);
  assert.ok(resumed.map.objects.some((o) => o.id === 'quest-token:glyph-mine:wraiths:active'), 'the active realm token is laid on real reload');
  assert.equal(stepCount(migrated, 'glyph-mine', 'wraiths'), 2); assert.equal(stepCount(migrated, 'corridor-golem', 'golems'), 1);
  assert.deepEqual(questState(migrated, 'corridor-golem').futureQuestField, { keep: 'canyon' });
  assert.equal(migrated.consequences.dungeons['canyon:open'].futureHistoryField, 'keep');
});
