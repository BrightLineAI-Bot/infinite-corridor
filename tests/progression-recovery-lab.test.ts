import test from 'node:test';
import assert from 'node:assert/strict';
import { createLabFixture, labReport, scenariosForLab } from '../src/proving-ground-labs.ts';
import { stepCount } from '../src/quests.ts';

test('recovery lab repairs an ended Husk and uses real defeat and Act for its replacement sigil', () => {
  assert.ok(scenariosForLab('recovery').some((q) => q.id === 'quest-token-recovery'));
  const fixture = createLabFixture({ lab: 'recovery', scenario: 'quest-token-recovery', seed: 'PG-QUEST-TOKEN', now: 1000 });
  const { game, save } = fixture, first = labReport(fixture), d0 = first.diagnostics.questTokenRecovery;
  assert.equal(first.scratch, true); assert.equal(save.version, 14); assert.equal(game.area, 'dungeon'); assert.equal(game.map.seedRealm.realm, 'husk');
  assert.equal(d0.orphanBefore, 5); assert.equal(d0.orphanCount, 0); assert.equal(d0.questCount, 0);
  assert.deepEqual(d0.tokenQuota, { need: 5, lying: 0, remaining: 5 });
  assert.notEqual(d0.endedRealmId, d0.realmId); assert.equal(d0.compassUnchanged, true);
  assert.ok(!save.session.areas[d0.endedRealmId] && !save.consequences.dungeons[d0.endedRealmId], 'the first realm is genuinely destroyed');
  assert.ok(game.map.tiles.length > 0 && game.map.objects.length > 0, 'the ordinary Husk scene remains renderable');

  const wraith = game.enemies.find((e) => e.id === 'proving:replacement-vein-wraith');
  assert.ok(wraith); assert.equal(wraith.kind, 'veinWraith'); assert.equal(wraith.hp, 1); assert.equal(wraith.passiveBehavior, 'practice');
  wraith.hp = 0; wraith.dead = true; game.defeatEnemy(wraith);
  const token = game.map.objects.find((o) => o.kind === 'questToken' && o.quest === 'glyph-mine'); assert.ok(token);
  const laid = labReport(fixture).diagnostics.questTokenRecovery;
  assert.deepEqual(laid.tokenQuota, { need: 5, lying: 1, remaining: 4 }); assert.equal(laid.replacementTokens, 1);
  assert.ok(game.questTokenAct(token).ok, 'normal Act collection succeeds');
  const collected = labReport(fixture).diagnostics.questTokenRecovery;
  assert.equal(stepCount(save, 'glyph-mine', 'wraiths'), 1); assert.equal(collected.questCount, 1);
  assert.deepEqual(collected.tokenQuota, { need: 5, lying: 0, remaining: 4 }); assert.equal(collected.replacementTokens, 0);
  assert.equal(collected.orphanCount, 0); assert.equal(collected.compassUnchanged, true);

  const reset = createLabFixture({ lab: 'recovery', scenario: 'quest-token-recovery', seed: 'PG-QUEST-TOKEN', now: 2000 });
  assert.equal(stepCount(reset.save, 'glyph-mine', 'wraiths'), 0, 'a new scratch fixture receives no progress from the prior one');
});
