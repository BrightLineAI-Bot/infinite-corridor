// Release 397 (Tim: hits from the Lightning Giant and the Turtle landed unseen; every floor warning one pale hot pink).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DANGER, GIANT, tickPackEffects } from '../src/monster-pack.ts';
import { readFileSync } from 'node:fs';

test('one warning colour: translucent pale hot pink', () => {
  assert.match(DANGER.fill, /rgba\(255,80,190,\.\d+\)/); assert.match(DANGER.edge, /rgba\(255,130,210,\.\d+\)/);
  const src = readFileSync(new URL('../src/monster-render.ts', import.meta.url), 'utf8'), tele = src.slice(src.indexOf('export function drawPackTelegraphs('), src.indexOf('function drawWarningCircle('));
  for (const old of ['#c0404034', '#c0404030', '#ff9a7acc', '#ffd25a99', '#ff4a4a88']) assert.equal(tele.includes(old), false, `old warning colour ${old} is gone`);
});

test("the Giant's slam bolts hold, lane shown, before they fly; its arcs show their reach", () => {
  assert.ok(GIANT.boltWarn >= .3);
  const p = { x: 10, y: 4 }, hits = []; const bolt = { kind: 'giantBolt', owner: 'g', x: 4, y: 4, vx: GIANT.boltSpeed, vy: 0, radius: GIANT.boltRadius, arming: GIANT.boltWarn, life: GIANT.boltLife, damage: 5 };
  const w = { dt: .1, player: p, enemies: [], hurt: (...a) => { hits.push(a); return true; }, tileOpen: () => true, addEffect() {} };
  tickPackEffects([bolt], w); assert.equal(bolt.x, 4, 'it waits while armed');
  const src = readFileSync(new URL('../src/monster-pack.ts', import.meta.url), 'utf8'); assert.match(src, /giantArcs\(e, s\) \{ s\.tele = \{ type: "ring", radius: GIANT\.arcRange \}/);
});
