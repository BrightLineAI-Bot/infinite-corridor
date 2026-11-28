// Tim 2026-11-28: the Wayfarer's body changes at Oren Vale or any Listener town's Keeper (who also retrain stats) for 500 marks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BODY_SWAP, swapBody, validActions } from '../src/interactions.ts';
import { ensureWayfarerBody, wayfarerBody } from '../src/journey-start.ts';

const journey = (marks) => { const s = { currency: marks, stats: { might: 1 }, statPoints: 0, perception: {} }; ensureWayfarerBody(s); return s; };

test('the body swap costs 500 marks and flips the body; nothing else changes', () => {
  assert.equal(BODY_SWAP.marks, 500);
  const s = journey(1200), before = JSON.stringify({ ...s, currency: 0, wayfarer: null });
  let r = swapBody(s); assert.equal(r.ok, true); assert.equal(r.transition, 'reshape'); assert.equal(wayfarerBody(s), 'female'); assert.equal(s.currency, 700);
  r = swapBody(s, 'The Ashfold Keeper'); assert.equal(r.ok, true); assert.match(r.message, /^The Ashfold Keeper/); assert.equal(wayfarerBody(s), 'male'); assert.equal(s.currency, 200);
  assert.equal(JSON.stringify({ ...s, currency: 0, wayfarer: null }), before, 'stats, gear and the rest are untouched');
  r = swapBody(s); assert.equal(r.ok, false); assert.match(r.message, /500 marks; you have 200/); assert.equal(wayfarerBody(s), 'male'); assert.equal(s.currency, 200);
});

test('offered right after retraining, by Oren and by every town Keeper; generated lists are not changed', () => {
  const s = journey(0);
  const keeper = { kind: 'townKeeper', name: 'The Ashfold Keeper', state: 'calm', actions: ['upgrade', 'attune', 'retrain'] };
  assert.deepEqual(validActions(keeper, s), ['upgrade', 'attune', 'retrain', 'reshape']);
  assert.deepEqual(keeper.actions, ['upgrade', 'attune', 'retrain']);
  const oren = { kind: 'npc', id: 'warden-oren', name: 'Oren Vale', actions: ['speak'] };
  const list = validActions(oren, s); assert.equal(list[list.indexOf('retrain') + 1], 'reshape'); assert.deepEqual(oren.actions, ['speak']);
  assert.ok(!validActions({ kind: 'npc', id: 'someone', name: 'A farmer', actions: ['speak'] }, s).includes('reshape'), 'only those who retrain');
});
