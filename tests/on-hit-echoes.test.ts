// On-hit Echoes (Tim, 2026-11-18; Bloblet Mend and Tentacle Ember revised the same day): Triceratops Cunning (new, from a Bad
// Triceratops only), Bloblet Mend and Tentacle Ember (both reworked from on-kill), and the `hit` trigger the Game fires when the
// Wayfarer's own blow lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ECHOES, ECHO_IDS, ON_HIT_ECHOES, ON_HIT_IDS, echoDrop, echoEvent, onHitMarkOf, ensureEchoState, plungeAfterimage } from '../src/echoes.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';

function arena(echoes, foes = [[12, 10]], kind = 'rootBrute') {
  const s = freshSave(); s.seed = 'on-hit'; const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  for (const id of echoes) s.echoes.owned[id] = true;
  s.echoes.equipped = [...echoes];
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', stamina: 50, hp: 40 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([x, y], i) => Object.assign(createCombatant(kind, x, y), { id: `foe-${i}`, hp: 1000, maxHp: 1000, damage: 0, cooldown: 99 }));
  return { s, g };
}
const hit = (g, e, damage, now) => echoEvent(g, 'hit', now, { enemy: e, damage });
const M = ON_HIT_ECHOES.mend, E = ON_HIT_ECHOES.ember;
const trice = (disposition, extra = {}) => Object.assign(createCombatant('triceratops', 5, 5), { id: `tri-${disposition}`, triceratopsDisposition: disposition }, extra);

test('the three on-hit Echoes: data, costs and triggers', () => {
  assert.deepEqual(ON_HIT_IDS, ['bloblet', 'wormTentacle']);
  for (const id of ON_HIT_IDS) assert.equal(ECHOES[id].trigger, 'hit', id);
  assert.equal(ECHOES.triceratops.name, 'Triceratops Chop'); assert.equal(ECHOES.triceratops.trigger, 'swing'); assert.equal(ECHOES.triceratops.cost, 2);
  assert.equal(ECHOES.bloblet.name, 'Bloblet Mend'); assert.equal(ECHOES.bloblet.cost, 1);
  assert.equal(ECHOES.wormTentacle.name, 'Tentacle Ember'); assert.equal(ECHOES.wormTentacle.cost, 1);
  assert.ok(ECHO_IDS.includes('triceratops'), 'on the Echoes screen');
  assert.equal(MONSTER_PACK.triceratops.noEcho, true, 'the Triceratops keeps noEcho');
  assert.deepEqual([M.share, M.perSecond], [.01, 3]);
  assert.deepEqual([E.stacks, E.share, E.radius, E.burning, E.lapseMs], [3, .4, 1.5, 1.75, 3000]);
  assert.match(ECHOES.bloblet.text, /1% of your maximum health/); assert.match(ECHOES.wormTentacle.text, /third bursts/);
});

test('Triceratops Cunning drops only from a Bad Triceratops, certainly and once', () => {
  for (let n = 0; n < 40; n++) { const s = freshSave(); s.seed = `roll-${n}`; assert.equal(echoDrop(s, trice('bad'), false, n), 'triceratops', `certain (${n})`); assert.equal(s.echoes.owned.triceratops, true); }
  const s = freshSave(); echoDrop(s, trice('bad'), false, 1);
  assert.equal(echoDrop(s, trice('bad', { id: 'tri-bad-2' }), false, 2), null, 'owned once');
  for (const d of ['good', 'silly']) assert.equal(echoDrop(freshSave(), trice(d), true, 1), null, d);
  assert.equal(echoDrop(freshSave(), trice('good', { triceratopsBetrayed: true }), true, 1), null, 'a betrayed Good one is still Good');
  assert.equal(echoDrop(freshSave(), trice(undefined), true, 1), null, 'no disposition');
  assert.equal(echoDrop(freshSave(), trice('bad', { caught: true, noRewards: true }), true, 1), null, 'caught');
  assert.equal(echoDrop(freshSave(), trice('bad', { noRewards: true }), true, 1), null, 'no rewards (a duel eaten loser)');
  assert.equal(echoDrop(freshSave(), trice('bad', { summonedBy: 'x' }), true, 1), null, 'summoned');
});

test('a Bad Triceratops slain in play leaves the Echo; a Good, a Silly one, a catch and a ride never do', () => {
  for (const [d, want] of [['bad', true], ['good', undefined], ['silly', undefined]]) {
    const { s, g } = arena([]); const e = trice(d); g.enemies = [e]; e.hp = 0; e.dead = true; g.defeatEnemy(e);
    assert.equal(s.echoes.owned.triceratops, want, d);
  }
  const { s, g } = arena([]); const e = trice('bad', { x: 11, y: 10 }); g.enemies = [e];
  g.catchBeast(e, 'triceratops');
  assert.ok(e.caught && !g.enemies.includes(e)); assert.equal(s.echoes.owned.triceratops, undefined, 'caught: no Echo');
  assert.ok(s.mounts.stable.some((m) => m.beast === 'triceratops'), 'it went to the stable');
  const before = { ...s.echoes.owned }; g.defeatEnemy(e); assert.deepEqual(s.echoes.owned, before, 'a caught (rewarded) beast is never paid again');
});

test('Bloblet Mend: 1% of maximum health a hit, at most 3 mends in any second', () => {
  const { s, g } = arena(['bloblet'], [[12, 10], [13, 10]]); s.maxHp = 200; g.player.hp = 100;
  for (let t = 0; t < 1000; t += 100) hit(g, g.enemies[t / 100 % 2], 5, 1000 + t);
  assert.equal(g.player.hp, 106, '3 mends of 2 (1% of 200) in the first second');
  hit(g, g.enemies[0], 5, 2000); assert.equal(g.player.hp, 108, 'a 4th, a second after the 1st');
  hit(g, g.enemies[0], 5, 2050); hit(g, g.enemies[1], 5, 2080); assert.equal(g.player.hp, 108, 'the window still holds 3 (1100, 1200, 2000)');
  s.maxHp = 50; g.player.hp = 49.8; hit(g, g.enemies[0], 5, 9000); assert.equal(g.player.hp, 50, 'never past maximum');
  const quiet = arena([]); quiet.g.player.hp = 10; hit(quiet.g, quiet.g.enemies[0], 5, 1000); assert.equal(quiet.g.player.hp, 10, 'not set: nothing');
});

test('Tentacle Ember: the 3rd stack bursts the foe and foes within 1.5 tiles, ×1.75 on burning foes, igniting nothing', () => {
  const { g } = arena(['wormTentacle'], [[12, 10], [13, 10], [12, 11.2], [15, 10]]), [a, near, burning, far] = g.enemies;
  burning.glyphBurn = { until: 99999, dps: 1, tick: 0 };
  hit(g, a, 20, 1000); hit(g, a, 20, 1500); assert.equal(a.hp, 1000, 'two stacks: nothing');
  assert.equal(onHitMarkOf(a).embers, 2);
  hit(g, a, 20, 2000);
  assert.equal(a.hp, 1000 - 8, '40% of the triggering hit'); assert.equal(near.hp, 992, 'a foe within 1.5 tiles');
  assert.equal(burning.hp, 1000 - 14, '×1.75 against a burning foe'); assert.equal(far.hp, 1000, 'out of reach');
  for (const e of [a, near, far]) assert.equal(e.glyphBurn, undefined, 'the burst ignites nothing');
  assert.equal(onHitMarkOf(a).embers, 0, 'stacks clear on the burst');
  assert.equal(onHitMarkOf(near), null, 'the burst lays no stack and is no hit on the foes it strikes');
  // the burst on a burning foe that triggered it
  a.glyphBurn = { until: 99999, dps: 1, tick: 0 }; const hp = a.hp;
  hit(g, a, 20, 2500); hit(g, a, 20, 3000); hit(g, a, 20, 3500); assert.equal(a.hp, hp - 14);
});

test('Tentacle Ember: stacks lapse after 3 s without a hit', () => {
  const { g } = arena(['wormTentacle']), e = g.enemies[0];
  hit(g, e, 20, 1000); hit(g, e, 20, 2000); hit(g, e, 20, 5001); assert.equal(e.hp, 1000, 'the stacks lapsed before the third');
  assert.equal(onHitMarkOf(e).embers, 1);
  hit(g, e, 20, 7000); hit(g, e, 20, 9900); assert.equal(e.hp, 992, 'three within 3 s of each other burst');
});

test('the hit trigger fires from a swing and a spell, never from burns, Echo or proc damage, a glyph echo or an afterimage', () => {
  let { g } = arena(['wormTentacle'], [[11.2, 10]]);
  g.primaryAttack(5000, { x: 1, y: 0 }); assert.ok(g.enemies[0].hp < 1000, 'the swing landed'); assert.equal(onHitMarkOf(g.enemies[0])?.embers, 1, 'a swing is a hit');
  ({ g } = arena(['wormTentacle'], [[12, 10]]));
  const blast = (extra) => g.effects.push({ id: `fx-${g.effects.length}`, kind: 'rift-blast', x: 12.5, y: 10.45, life: .3, radius: 1, pulse: 99, untilPulse: 0, pulseIndex: 0, damage: 10, hits: {}, ...extra });
  blast({ echo: true }); blast({ hostile: true }); blast({ afterimage: true });
  g.update(.05, { state: { x: 0, y: 0 }, consume: () => false }, 6000);
  assert.equal(onHitMarkOf(g.enemies[0]), null, 'glyph echoes, hostile effects and afterimages are no hits');
  blast({}); g.update(.05, { state: { x: 0, y: 0 }, consume: () => false }, 6100);
  assert.equal(onHitMarkOf(g.enemies[0])?.embers, 1, 'a spell pulse is a hit');
  // a burn's tick, glyphWorld damage (every Echo, glyph and passive proc) and the Spinosaur's afterimage slam: never hits
  ({ g } = arena(['wormTentacle', 'bloblet'], [[12, 10]])); const e = g.enemies[0];
  e.glyphBurn = { until: 99999, dps: 50, tick: 0 }; g.tickGlyphs(.5, 1000); assert.ok(e.hp < 1000, 'the burn ticked');
  g.glyphWorld(1100).damage(e, 10); g.glyphWorld(1200).blast(12.5, 10.45, 1, 10);
  assert.equal(onHitMarkOf(e), null);
  assert.equal(plungeAfterimage({ kind: 'plunge-slam', damage: 10, life: .3 }, 'a', null).afterimage, true);
  // the Wayfarer's own blows funnel through landHit; nothing lands for no damage
  g.landHit(e, 0, 2000); assert.equal(onHitMarkOf(e), null);
  g.landHit(e, 5, 2000); assert.equal(onHitMarkOf(e).embers, 1);
});

test('rate limits: a foe\'s same-instant hits count once, and at most 12 hits a second reach the Echoes', () => {
  const { g } = arena(['wormTentacle'], Array.from({ length: 20 }, (_, i) => [2 + i, 2]));
  const e = g.enemies[0]; hit(g, e, 10, 1000); hit(g, e, 10, 1000); hit(g, e, 10, 1030); assert.equal(onHitMarkOf(e).embers, 1);
  hit(g, e, 10, 1080); assert.equal(onHitMarkOf(e).embers, 2, 'the daggers\' second cut (80 ms) still counts');
  for (const f of g.enemies.slice(1)) hit(g, f, 10, 1100);
  const counted = g.enemies.slice(1).filter((f) => onHitMarkOf(f)?.embers === 1).length;
  assert.equal(counted, ON_HIT_ECHOES.perSecond - 2, 'the second\'s budget holds');
  hit(g, g.enemies[19], 10, 2100); assert.equal(onHitMarkOf(g.enemies[19]).embers, 1, 'a new second, a new budget');
});

test('60 s of every on-hit Echo under a storm of hits: deterministic, finite and bounded', () => {
  const run = () => {
    const { s, g } = arena(['triceratops', 'wormTentacle'], Array.from({ length: 8 }, (_, i) => [8 + (i % 4), 8 + Math.floor(i / 4)]));
    s.echoes.owned.bloblet = true; s.lattice = s.lattice || {}; s.echoes.equipped = ['triceratops', 'wormTentacle']; s.maxHp = 120; g.player.hp = 30;
    for (const e of g.enemies) { e.hp = e.maxHp = 1e7; }
    for (let t = 0; t < 60000; t += 16) { for (let k = 0; k < 3; k++) hit(g, g.enemies[(t / 16 + k * 3) % 8], 7 + k, t); if (t % 400 === 0) g.glyphVisuals = []; }
    return g.enemies.map((e) => [e.hp, onHitMarkOf(e)?.embers, onHitMarkOf(e)?.coolUntil, e.hitStun]).concat([[g.player.hp]]);
  };
  const a = run(), b = run();
  assert.deepEqual(a, b, 'the same hits, the same result');
  for (const row of a) for (const v of row) assert.ok(v === undefined || Number.isFinite(v), `finite (${v})`);
  assert.ok(a.slice(0, 8).every(([hp]) => hp < 1e7), 'every foe was gored or burst');
});

test('resume: marks and stacks are runtime only and dropped; ownership and the set Echoes are kept', () => {
  const { s, g } = arena(['triceratops', 'bloblet'], [[12, 10]]); const e = g.enemies[0];
  s.echoes.owned.wormTentacle = true;
  hit(g, e, 10, 1000); hit(g, e, 10, 1200);
  assert.ok(onHitMarkOf(e)); assert.ok(!Object.keys(e).some((k) => /mark/i.test(k)), 'non-enumerable');
  assert.equal(onHitMarkOf(JSON.parse(JSON.stringify(e))), null); assert.equal(onHitMarkOf(structuredClone(e)), null); assert.equal(onHitMarkOf({ ...e }), null);
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(back.echoes.owned.triceratops, true); assert.equal(back.echoes.owned.bloblet, true); assert.equal(back.echoes.owned.wormTentacle, true);
  assert.deepEqual(back.echoes.equipped, ['triceratops', 'bloblet']);
  assert.deepEqual(ensureEchoState(back).echoes.equipped, ['triceratops', 'bloblet'], 'within the notches (2 + 1)');
  const g2 = new Game(back, 0); assert.equal(g2._hitWindowN, undefined); assert.equal(g2._hitMend2, undefined, 'no runtime counter carried');
});

test('Bloblet Mend shares the heal-on-hit budget: with a hitHeal Tesseract, never more than 5% of maximum health in a second', async () => {
  const { TESSERACTS } = await import('../src/tesseracts.ts');
  assert.equal(TESSERACTS.hitHealCap, .05);
  const { s, g } = arena(['bloblet'], Array.from({ length: 6 }, (_, i) => [12 + i, 10]));
  s.perception.aperture = 17900; s.maxHp = 200;
  s.tesseracts.owned.push({ uid: 'c', kind: 'ward', grade: 'sovereign', name: 'Test', roll: 3, lines: [{ k: 'hitHeal', v: .019, bad: false }] }); s.tesseracts.slots[0] = 'c';
  for (let sec = 1; sec <= 5; sec++) {
    g.player.hp = 20; const start = g.player.hp;
    for (let k = 0; k < 10; k++) { const t = sec * 1000 + k * 90, e = g.enemies[k % 6]; g.tesseractHitHeal('melee', t); g.landHit(e, 5, t); }
    assert.ok(g.player.hp - start <= s.maxHp * TESSERACTS.hitHealCap + 1e-9, `second ${sec}: ${g.player.hp - start}`);
    assert.ok(g.player.hp - start > s.maxHp * TESSERACTS.hitHealCap - 1e-9, 'the budget is reached, so the cap is what holds');
  }
  // the Echo alone spends the same budget: a Tesseract hit after three mends gets only what is left
  const b = arena(['bloblet'], [[12, 10], [13, 10], [14, 10]]); b.s.maxHp = 200; b.g.player.hp = 20;
  for (let k = 0; k < 3; k++) b.g.landHit(b.g.enemies[k], 5, 1000 + k * 100);
  assert.equal(b.g.player.hp, 26, '3 mends of 1%'); assert.equal(b.g.hitHealGiven, 6, 'paid from hitHealGiven');
  assert.equal(b.g.grantHitHeal(100, 1500), 4, 'what the 5% budget has left');
});
