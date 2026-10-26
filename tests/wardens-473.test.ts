// Release 473 (Tim: "when you die in a dungeon, the wardens respawn and you get more pages... wardens can only die once...
// it's disruptive... you have to stop and select the page... just a random buff applies... the wardens need to be...
// about half the strength of the Gate Revenant... put in some of the elite monsters as wardens").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, characterStats } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { tuneGatePredator } from '../src/monster-pack.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { RULES, marginRun } from '../src/marginalia.ts';
import { dungeonHistory } from '../src/interactions.ts';

function crossing(seed = 'WARD473') {
  const s = freshSave(); s.seed = seed; s.level = 40; s.perception.aperture = APERTURE_BANDS[RULES.tier].threshold;
  const id = `dungeon:${seed}:g1:7:2:room`; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 7, ry: 2, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); return { s, g, id };
}

test('wardens are elite monsters at half a Gate Revenant, never the crossing guardian, never the elite hunt', () => {
  const { s, g } = crossing(), w = g.enemies.filter((e) => e.marginWarden);
  assert.ok(w.length >= 1); const rev = tuneGatePredator(Object.assign(createCombatant('gateRevenant', 0, 0, false, []), { gatePredator: true }), s, characterStats(s));
  for (const e of w) { assert.ok(RULES.warden.elites.includes(e.kind), e.kind); assert.ok(e.eliteModules?.length >= 0); assert.equal(e.boss, false);
    assert.equal(e.maxHp, Math.round(rev.maxHp * .5)); assert.equal(e.damage, Math.round(rev.damage * .5)); assert.match(e.foundryName, /^Margin Warden · /); }
  const marks = s.currency; w[0].hp = 0; w[0].dead = true; g.defeatEnemy(w[0]); assert.equal(s.elites?.defeated?.[w[0].kind], undefined, 'not the elite\'s own hunt');
});

test('a felled warden stays felled, even when the crossing is rebuilt from scratch; the page came without a choice', () => {
  const { s, g, id } = crossing(), w = g.enemies.find((e) => e.marginWarden); w.hp = 0; w.dead = true; g.defeatEnemy(w);
  assert.deepEqual(dungeonHistory(s, id).wardensSlain, [w.id]); assert.equal(marginRun(s, id).perks.length, 1); assert.equal(g.marginOfferRequested, undefined);
  delete s.session.areas[g.areaStateId()]; g.loadArea('dungeon', false); assert.equal(g.enemies.some((e) => e.id === w.id), false);
  assert.doesNotMatch(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /this\.marginOfferRequested = true/);
});
