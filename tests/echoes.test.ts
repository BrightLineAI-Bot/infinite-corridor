import test from 'node:test';
import assert from 'node:assert/strict';
import { ECHOES, ECHO_IDS, NOTCHES, notchesUsed, toggleEcho, echoDrop, ensureEchoState, echoEvent } from '../src/echoes.ts';
import { PACK_KINDS } from '../src/monster-pack.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

function arena(echoes, foes = [[12, 10]]) {
  const s = freshSave(), g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  for (const id of echoes) s.echoes.owned[id] = true;
  s.echoes.equipped = [...echoes];
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', stamina: 50, hp: 40 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant('rootBrute', x, y), { id: `foe-${i}`, hp: 300, maxHp: 300, damage: 0, cooldown: 99 }));
  return { s, g };
}
const idle = { state: { x: 0, y: 0 }, consume: () => false };
const run = (g, ms, from, input = idle) => { for (let t = 0; t < ms; t += 50) g.update(.05, input, from + t); };
const once = (key, x = 1, y = 0) => { let done = false; return { state: { x, y }, consume: (k) => k === key && !done && (done = true) }; };

test('every pack creature has exactly one Echo; notches cap what can be set at once', () => {
  assert.deepEqual([...ECHO_IDS].sort(), [...PACK_KINDS].sort());
  for (const e of Object.values(ECHOES)) assert.ok(e.cost >= 1 && e.cost <= 3 && e.text && e.trigger, e.name);
  const s = freshSave();
  assert.deepEqual(s.echoes.equipped, []);
  assert.equal(toggleEcho(s, 'thunderhorn').ok, false, 'must own it first');
  for (const id of ['thunderhorn', 'amalgam', 'weepingSaint']) s.echoes.owned[id] = true;
  assert.equal(toggleEcho(s, 'thunderhorn').ok, true); assert.equal(toggleEcho(s, 'amalgam').ok, true);
  assert.equal(notchesUsed(s.echoes.equipped), NOTCHES);
  assert.equal(toggleEcho(s, 'weepingSaint').ok, false, 'no notches left');
  assert.equal(toggleEcho(s, 'thunderhorn').ok, true, 'set aside'); assert.deepEqual(s.echoes.equipped, ['amalgam']);
  const old = freshSave(); delete old.echoes;
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(old))).echoes.equipped, []);
  const bad = { echoes: { owned: { weepingSaint: true, fake: true }, equipped: ['weepingSaint', 'fake', 'weepingSaint'] } };
  ensureEchoState(bad); assert.deepEqual(bad.echoes.equipped, ['weepingSaint']); assert.equal(bad.echoes.owned.fake, undefined);
});

test('guardians always leave their Echo once; ordinary pack kills rarely; summons never', () => {
  const s = freshSave();
  assert.equal(echoDrop(s, { id: 'g', packKind: 'gnawingMaw' }, true, 1), 'gnawingMaw');
  assert.equal(echoDrop(s, { id: 'g2', packKind: 'gnawingMaw' }, true, 2), null, 'already owned');
  assert.equal(echoDrop(s, { id: 'c', packKind: 'pallidCrawler', summonedBy: 'x' }, true, 3), null);
  let got = 0; for (let n = 0; n < 600; n++) { const t = freshSave(); if (echoDrop(t, { id: `e${n}`, packKind: 'riftLynx' }, false, n)) got++; }
  assert.ok(got > 8 && got < 50, `about 4% (${got}/600)`);
});

test('dodge Echoes: charge tramples, pounce empowers the next strike, skitter saves stamina, web slows, phase extends', () => {
  let { s, g } = arena(['thunderhorn'], [[11.2, 10]]);
  g.update(.05, once('dodge'), 1000); run(g, 400, 1050, { state: { x: 1, y: 0 }, consume: () => false });
  assert.ok(g.enemies[0].hp < 300, 'trampled');
  ({ s, g } = arena(['pallidCrawler']));
  g.update(.05, once('dodge'), 1000); assert.equal(g.player.stamina >= 40 - 1, true, `stamina ${g.player.stamina}`);
  ({ s, g } = arena(['veilSpinner'], [[10.2, 11]]));
  g.update(.05, once('dodge', 0, -1), 1000);
  assert.equal(g.echoPatches.length, 1); run(g, 300, 1050);
  assert.ok((g.enemies[0].glyphSlow?.until || 0) > 1000, 'foe in the web is slowed');
  ({ s, g } = arena(['strataEel']));
  g.update(.05, once('dodge'), 1000); assert.ok(g.player.invulnerableUntil >= (g.player.dodgeUntil || 0) + 250);
  // pounce: compare a strike after a dodge with a plain strike
  const plain = arena([], [[11.2, 10]]); plain.g.primaryAttack(5000, { x: 1, y: 0 });
  ({ s, g } = arena(['riftLynx'], [[11.2, 10]]));
  echoEvent(g, 'dodge', 4900); g.primaryAttack(5000, { x: 1, y: 0 });
  assert.ok(300 - g.enemies[0].hp > (300 - plain.g.enemies[0].hp) * 1.4, 'pounce +60%');
});

test('landing, kill, hurt, spell and shot Echoes fire from play', () => {
  let { s, g } = arena(['sunderjaw'], [[11, 10]]);
  g.update(.05, once('jump'), 1000); run(g, 1200, 1050);
  assert.ok(g.enemies[0].hp < 300, 'rupture on landing');
  ({ s, g } = arena(['gnawingMaw', 'amalgam'], [[12, 10], [14.5, 10]]));
  const [dead, far] = g.enemies; dead.hp = 0; dead.dead = true; g.defeatEnemy(dead); echoEvent(g, 'kill', 2000, { enemy: dead });
  assert.ok(far.x < 14.5, 'pulled toward the body'); assert.ok(g.echoPatches.some((q) => q.kind === 'flesh'));
  ({ s, g } = arena(['cinderSeraph'], [[12, 10], [13, 10]]));
  echoEvent(g, 'kill', 2000, { enemy: g.enemies[0] }); assert.ok(g.enemies[1].glyphBurn, 'embers ignite a neighbour');
  ({ s, g } = arena(['hangedChoir'], [[11, 10]]));
  run(g, 100, 1000); g.player.hp -= 5; run(g, 100, 1100); assert.ok(g.enemies[0].hp < 300, 'lament on hurt');
  ({ s, g } = arena(['mirrorShade'], [[13, 10]]));
  run(g, 100, 1000); g.player.hp -= 5; run(g, 60, 1100);
  assert.ok(g.player.x > 12.5 && g.enemies[0].x < 10.5, `swapped places (${g.player.x}, ${g.enemies[0].x})`);
  ({ s, g } = arena(['lumenWraith'], [[13, 10]]));
  echoEvent(g, 'spell', 2000); assert.ok(g.enemies[0].hp < 300, 'lantern beam');
  ({ s, g } = arena(['siegeBeetle'], [[14, 10]]));
  for (let k = 0; k < 3; k++) echoEvent(g, 'shot', 2000 + k, { shot: { x: 10.5, y: 10.45, dx: 1, dy: 0, speed: 12, life: 1.6 } });
  assert.equal(g.echoPatches.filter((q) => q.kind === 'mortar').length, 1, 'every third shot'); run(g, 900, 2100);
  assert.ok(g.enemies[0].hp < 300, 'mortar landed');
});

test('continuous Echoes: the Saint slows only foes you face; the Lantern mends while still', () => {
  const { g } = arena(['weepingSaint'], [[13, 10], [7, 10]]);
  run(g, 200, 1000);
  assert.ok((g.enemies[0].glyphSlow?.until || 0) > 1000, 'faced foe slowed'); assert.ok(!g.enemies[1].glyphSlow, 'foe behind is not');
  const l = arena(['graveLantern'], []); l.g.player.hp = 20;
  run(l.g, 3000, 1000); assert.ok(l.g.player.hp >= 23, `mended to ${l.g.player.hp}`);
});

test('the Forge lab has an Echoes sandbox with every Echo owned', () => {
  const f = createLabFixture({ lab: 'forge', scenario: 'echoes', now: 0 });
  assert.equal(Object.keys(f.save.echoes.owned).length, ECHO_IDS.length);
});
