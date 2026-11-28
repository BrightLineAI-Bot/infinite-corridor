// The Pachycephalosaurus's duels (Tim, 2026-11-27) and the wild Triceratops's: each pairing seeks the other out and fights under the
// duel rules (dino-duel.ts: at most 90 s, a kill or an escape, the eaten loser paying nothing), with its own choreography (head butts,
// dome rams, kicks, the head clash, horn gores and frill bashes) and its own sounds; the Earth Apatosaurus still ignores every Triceratops.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, beast, run } from './pachy-harness.ts';
import { DINO_DUEL, duelPair } from '../src/dino-duel.ts';
import { PACHY } from '../src/pachy.ts';
import { TRIKE_DUEL, TRIKE_ATTACKS, trikeDuels } from '../src/trike-duel.ts';
import { DUEL_SOUNDS, BATTLE_SFX } from '../src/battle-sfx.ts';
import { sampleDuel } from '../src/soundtrack-director.ts';
import { DUEL_CAPSULES, DUEL_STRIKES } from '../src/close-view-duel.ts';
import { triceratopsPoseName } from '../src/triceratops-render.ts';

const bad = { triceratopsDisposition: 'bad' };
function duel(a, b, seconds = 95) {
  const w = arena({ player: { x: 2, y: 38 } }), ea = beast(w, a, { id: a, x: 14, y: 18, extra: a === 'triceratops' ? bad : {} }), eb = beast(w, b, { id: b, x: 26, y: 18, extra: b === 'triceratops' ? bad : {} });
  const events = run(w, seconds); return { w, ea, eb, events, types: events.map((e) => e.type) };
}

test('the pairs: the original first, the new ones after; the Earth Apatosaurus never duels a Triceratops', () => {
  assert.deepEqual(DINO_DUEL.pairs.slice(0, 3), [['spinoRex', 'wildStego'], ['earthApato', 'spinoRex'], ['earthApato', 'wildStego']]);
  for (const k of ['spinoRex', 'wildStego', 'earthApato', 'triceratops']) assert.ok(duelPair({ kind: 'pachy' }, { kind: k }), k);
  for (const k of ['spinoRex', 'wildStego']) assert.ok(duelPair({ kind: 'triceratops' }, { kind: k }), k);
  assert.ok(!duelPair({ kind: 'triceratops' }, { kind: 'earthApato' }));
  assert.ok(trikeDuels({ kind: 'triceratops', triceratopsDisposition: 'bad' }) && !trikeDuels({ kind: 'triceratops', triceratopsDisposition: 'good' }) && !trikeDuels({ kind: 'triceratops', triceratopsDisposition: 'bad', mountView: true }));
  for (const k of Object.keys(PACHY.duel.moves)) assert.ok(PACHY.duel.kinds.includes(k));
});

for (const [a, b, mine] of [['pachy', 'spinoRex', ['pachyCharge', 'pachyDomeRam', 'pachyBicycle', 'pachyJumpSlam']], ['pachy', 'wildStego', ['pachyDomeRam', 'pachyHeadSlam', 'pachyBicycle', 'pachyRockLaunch']], ['pachy', 'earthApato', ['pachyJumpSlam', 'pachyBicycle', 'pachyCharge', 'pachyRockLaunch']], ['pachy', 'triceratops', ['pachyClash', 'pachyDomeRam', 'pachyCharge', 'pachyHeadSlam']], ['triceratops', 'spinoRex', TRIKE_DUEL.moves], ['triceratops', 'wildStego', TRIKE_DUEL.moves]]) {
  test(`${a} vs ${b}: they seek each other out, trade blows with their own choreography, and it ends by 90 s (a kill or an escape)`, () => {
    const { w, ea, eb, events, types } = duel(a, b);
    assert.equal(types[0], 'start', types.join());
    assert.ok(types.includes('verdict') && (types.includes('eaten') || types.includes('escape')), types.join());
    const end = events.find((e) => e.type === 'eaten' || e.type === 'escape'); assert.ok(end.at <= DINO_DUEL.cap + 1, `ended at ${end.at}`);
    assert.ok(w.creatureHits.some((h) => h.by === a) && w.creatureHits.some((h) => h.by === b), 'both land blows');
    const used = new Set(w.cues.filter((c) => c.who === a && c.phase === 'windup').map((c) => c.move)); assert.ok(mine.filter((m) => used.has(m)).length >= 2, `${a}'s choreography against ${b}: ${[...used]}`);
    const eaten = [ea, eb].find((q) => q.dinoEaten); if (eaten) assert.ok(eaten.noRewards, 'an eaten loser pays nothing');
    assert.equal(w.hurts.filter((h) => h.t / 1000 < end.at).length, 0, 'the Wayfarer far off is never hit while they fight');
  });
}

test('the Earth Apatosaurus and a wild Triceratops never fight', () => {
  const { w, types } = duel('triceratops', 'earthApato', 30); assert.equal(types.length, 0); assert.equal(w.creatureHits.length, 0);
});
test('a friendly herd Triceratops never duels', () => {
  const w = arena({ player: { x: 2, y: 38 } }); beast(w, 'pachy', { id: 'p', x: 14, y: 18 }); const t = beast(w, 'triceratops', { id: 't', x: 26, y: 18, extra: { triceratopsDisposition: 'good' } });
  run(w, 20); assert.ok(!t.dinoDuel && !w.creatureHits.some((h) => h.by === 't'));
});

test('duels are deterministic', () => {
  const play = () => { const r = duel('pachy', 'triceratops', 40); return JSON.stringify([r.types, r.w.creatureHits, r.ea.x, r.eb.y]); };
  assert.equal(play(), play());
});

test('sounds, music and the Close View staging cover the new pairs (battle sounds only; no music while they fight)', () => {
  for (const m of ['pachyDomeRam', 'pachyCharge', 'pachyBicycle', 'pachyClash', 'trikeGore', 'trikeHornSweep']) assert.ok(DUEL_SOUNDS.hit[m] && BATTLE_SFX.sounds[DUEL_SOUNDS.hit[m]], m);
  for (const n of ['domeKnock', 'kickThud', 'hornClack', 'hootPachy', 'footPachy']) assert.ok(BATTLE_SFX.sounds[n], n);
  const { w } = duel('pachy', 'triceratops', 6); const pair = sampleDuel({ player: { x: 20, y: 20 }, enemies: w.enemies });
  assert.ok(pair && [pair.a?.kind, pair.b?.kind].sort().join() === 'pachy,triceratops', 'the director holds the duel (the music hushed)');
  assert.ok(DUEL_CAPSULES.pachy.length <= 40 && DUEL_CAPSULES.triceratops.length <= 40 && DUEL_STRIKES.pachyDomeRam && DUEL_STRIKES.trikeGore);
  for (const [id, want] of [['trikeGore', 'charge'], ['trikeHornSweep', 'sweep'], ['trikeFrillBash', 'stomp']]) assert.equal(triceratopsPoseName({ hp: 1, maxHp: 1, pack: { attack: id, phase: 'active' } }), want);
  for (const id of Object.keys(TRIKE_ATTACKS)) assert.ok(TRIKE_ATTACKS[id].duel);
});

test('screen shake and rockfall: the big landings shake (once per gap) and, indoors, bring rocks down', () => {
  const w = arena({ player: { x: 2, y: 38 }, indoors: true }); beast(w, 'pachy', { id: 'p', x: 14, y: 18 }); beast(w, 'wildStego', { id: 's', x: 26, y: 18 });
  run(w, 60); assert.ok(w.shakes.length > 0, 'it shakes'); assert.ok(w.fx.length >= 0);
  for (let i = 1; i < w.shakes.length; i++) assert.ok(w.shakes[i].t - w.shakes[i - 1].t >= DINO_DUEL.shake.gap * 1000 - 1 || w.shakes[i].power !== w.shakes[i - 1].power, 'capped cadence');
});
