// Release 407 (Tim: the Supernova's fog hid the Void Walker and every creature; it attacked too often).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATTACK_MODULES } from '../src/monster-pack.ts';
import { WORLD_BEASTS } from '../src/world-beasts.ts';

test('the Void Walker paces its attacks', () => {
  assert.ok(WORLD_BEASTS.voidWalker.attackGap >= 1);
  for (const [k, min] of Object.entries({ voidHand: 3.8, voidClaw: 4.3, voidSword: 4.8, voidSlash: 5, voidSpikes: 5.8, voidWraiths: 8, voidRifts: 13, voidConstellation: 15, voidHorizons: 13, voidSupernova: 30 })) assert.equal(ATTACK_MODULES[k].cooldown, min, k);
});

test('the Supernova fog no longer closes in around the Wayfarer', () => {
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8');
  assert.match(src, /const level = g\.seaHazards\?\.fogLevel \|\| 0, time = now \/ 1000;/);
});
