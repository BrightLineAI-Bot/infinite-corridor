// Release 417 (Tim: "it should spawn within that circle around the character when you give it the default press. It can get
// positioned up to the max distance by holding the clone button... a shadow should travel over the floor... the clone should
// spawn where the shadow is when you pick up your finger... tapping the button counts like the shortest press and hold").
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { setSlot } from '../src/spell-slots.ts';
import { SHADOW_CLONE, chargeDistance } from '../src/late-spells.ts';
import { APERTURE_BANDS } from '../src/items.ts';

const ready = () => {
  const s = freshSave(); s.seed = 'CLONE417'; s.perception.aperture = APERTURE_BANDS[13].threshold; const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); g.enemies = [];
  s.lastAim = { x: 0, y: 1 }; Object.assign(g.player, { x: 15, y: 15 }); g.lastUpdateNow = 1000; setSlot(s, 'a', 'spell:shadow-clone'); return { s, g };
};
const dist = (g) => Math.hypot(g.shadowClone.ox, g.shadowClone.oy);

test('the hold carries the shadow from beside you out to the full distance', () => {
  assert.equal(chargeDistance(0), SHADOW_CLONE.near); assert.equal(chargeDistance(SHADOW_CLONE.tapGrace), SHADOW_CLONE.near);
  assert.ok(chargeDistance(.4) > SHADOW_CLONE.near && chargeDistance(.4) < SHADOW_CLONE.distance); assert.equal(chargeDistance(5), SHADOW_CLONE.distance);
  assert.equal(SHADOW_CLONE.near, 1); assert.equal(SHADOW_CLONE.distance, 5);
});

test('a tap sets the clone right next to you', () => {
  const { g } = ready(); assert.equal(g.castSlot('a'), true); assert.equal(g.shadowClone.charging.action, 'spell');
  assert.ok(Math.abs(dist(g) - SHADOW_CLONE.near) < 1e-9); g.tickCloneCharge(false, 1050);
  assert.equal(g.shadowClone.charging, undefined); assert.ok(Math.abs(dist(g) - SHADOW_CLONE.near) < 1e-9, 'beside you');
});

test('holding sends the shadow out; letting go settles the clone there, and only then does it fight', () => {
  const { g } = ready(); g.castSlot('a'); const dir = { ...g.shadowClone.charging.dir };
  g.tickCloneCharge(true, 1300); const mid = dist(g); assert.ok(mid > SHADOW_CLONE.near && mid < SHADOW_CLONE.distance);
  assert.equal(g.cloneSwing({ damage: 5 }, { x: 1, y: 0 }, 1300), undefined);
  g.tickCloneCharge(true, 3000); assert.ok(Math.abs(dist(g) - SHADOW_CLONE.distance) < 1e-9, 'no farther than the full distance');
  g.tickCloneCharge(false, 3016); assert.equal(g.shadowClone.charging, undefined); assert.ok(Math.abs(dist(g) - SHADOW_CLONE.distance) < 1e-9, 'it stays where the shadow was');
  assert.ok(Math.abs(g.shadowClone.ox / dist(g) - dir.x) < 1e-9 && Math.abs(g.shadowClone.oy / dist(g) - dir.y) < 1e-9);
});

test('slot B listens to its own button; the update loop reads the held button', () => {
  const { s, g } = ready(); setSlot(s, 'b', 'spell:shadow-clone'); g.castSlot('b'); assert.equal(g.shadowClone.charging.action, 'spell2');
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /tickCloneCharge\(!!input\.held\?\.\(this\.shadowClone\.charging\.action\), now\)/);
  assert.match(readFileSync(new URL('../src/combat-visuals.ts', import.meta.url), 'utf8'), /if \(sc\.charging\)/);
});
