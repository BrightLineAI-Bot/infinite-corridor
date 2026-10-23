// Release 353 (Tim, 2026-10-23: "it'll hunt you through different tiles, and you can run away and it can chase you. So it's
// health, only resets when you die"): a world beast's wounds belong to its hunt, not to the section it was loaded in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.ts';
import { ensureWorldBeasts } from '../src/world-beasts.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const hunt = (triesOff = false) => {
  const s = freshSave(); s.seed = 'WOUND'; s.perception.aperture = 3255;
  for (const k of Object.keys(s.worldBeasts)) s.worldBeasts[k].active = null;
  s.worldBeasts.morphingBlob.active = { rx: 6, ry: 2, tries: 0 };
  const g = new Game(s, 0); g.beastTries = !triesOff; g.rx = 6; g.ry = 2; g.loadArea('overworld');
  return { s, g, b: g.enemies.find((e) => e.worldBeast === 'morphingBlob') };
};
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };

test('its wounds are kept on the hunt and survive a lost section record and a save round trip', () => {
  const { s, g, b } = hunt(); assert.ok(b); b.hp = Math.round(b.maxHp * .3);
  g.update(.05, idle, 1000); assert.ok(Math.abs(s.worldBeasts.morphingBlob.active.wounds - .3) < .01);
  g.transitionSection(1, 0); delete s.session.areas[`overworld:6:2:g${s.worldGeneration}`]; // whatever the section forgot
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.ok(back.worldBeasts.morphingBlob.active.wounds > 0, 'saved');
  g.transitionSection(-1, 0); const c = g.enemies.find((e) => e.worldBeast === 'morphingBlob');
  assert.ok(c.hp <= Math.round(c.maxHp * .31), `still hurt (${c.hp}/${c.maxHp})`);
});

test('a death heals it, with tries on or off', () => {
  for (const off of [false, true]) {
    const { s, g, b } = hunt(off); b.hp = Math.round(b.maxHp * .4); g.update(.05, idle, 1000);
    g.player.hp = 0; g.update(.05, idle, 1050);
    assert.equal(b.hp, b.maxHp, `tries ${off ? 'off' : 'on'}`); assert.equal(s.worldBeasts.morphingBlob.active?.wounds, undefined);
  }
});

test('the save field is additive and only kept when it means something', () => {
  const s = freshSave(); s.worldBeasts.morphingBlob.active = { rx: 1, ry: 1, tries: 0, wounds: 'x' }; s.worldBeasts.lightningGiant.active = { rx: 2, ry: 2, tries: 0, wounds: .5 };
  ensureWorldBeasts(s); assert.equal(s.worldBeasts.morphingBlob.active.wounds, undefined); assert.equal(s.worldBeasts.lightningGiant.active.wounds, .5);
});
