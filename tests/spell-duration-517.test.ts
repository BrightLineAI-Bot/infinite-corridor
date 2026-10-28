// Release 517 (Tim, 2026-10-28): "shadow Boxing... The spell button doesn't show the duration... similar to every other
// spell". Lasting spells now drain the button's fill like Aperture skills do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { SPELLS } from '../src/items.ts';
import { BRAWLER } from '../src/brawler-spells.ts';

const game = () => { const s = freshSave(); s.seed = 'DUR'; s.perception.aperture = 3255; const g = new Game(s, 0); g.area = 'dungeon'; g.enemies = []; return g; };

test('Shadow Boxing drains from full to empty over its duration', () => {
  const g = game(); g.boxingUntil = 1000 + BRAWLER['shadow-boxing'].seconds * 1000;
  assert.equal(g.spellBuffLeft('shadow-boxing', 1000), 1);
  assert.ok(Math.abs(g.spellBuffLeft('shadow-boxing', 5000) - .5) < 1e-9);
  assert.equal(g.spellBuffLeft('shadow-boxing', 9001), 0);
});

test('Aegis, the Shadow Clone and lasting fields show their time', () => {
  const g = game(); g.aegisUntil = 1500; assert.ok(Math.abs(g.spellBuffLeft('aegis', 1000) - .5) < 1e-9);
  g.shadowClone = { ox: 1, oy: 0, until: 1000 + SPELLS['shadow-clone'].lifetime * 500 }; assert.ok(Math.abs(g.spellBuffLeft('shadow-clone', 1000) - .5) < 1e-9);
  g.shadowClone.boxing = true; assert.equal(g.spellBuffLeft('shadow-clone', 1000), 0, 'the boxing echo clone is not the spell');
  g.effects.push({ id: 'spell-1', kind: 'stillpoint', glyphHost: 'spell', glyphSpell: 'stillpoint', x: 1, y: 1, life: SPELLS.stillpoint.lifetime / 4, radius: 2, hits: {} });
  assert.ok(Math.abs(g.spellBuffLeft('stillpoint', 1000) - .25) < 1e-9);
  g.effects.push({ id: 'spell-2', kind: 'cinder-dart', glyphHost: 'spell', glyphSpell: 'cinder-dart', x: 1, y: 1, life: .5, radius: 1, hits: {} });
  assert.ok(Math.abs(g.spellBuffLeft('cinder-dart', 1000) - .5 / SPELLS['cinder-dart'].lifetime) < 1e-9, 'release 519: quick spells too');
  assert.equal(g.spellBuffLeft('ember-ring', 1000), 0, 'not cast');
});

// Release 519 (Tim: "all spells and skills should show their duration... a similar golden infill that winds down").
test('quick spells drain too: Cinder Dart while it burns, Orbit Volley while the orbs gather', () => {
  const g = game(); g.effects.push({ id: 'spell-3', kind: 'cinder-dart', glyphHost: 'spell', glyphSpell: 'cinder-dart', x: 1, y: 1, life: SPELLS['cinder-dart'].lifetime / 2, radius: 1, hits: {} });
  assert.ok(Math.abs(g.spellBuffLeft('cinder-dart', 1000) - .5) < 1e-9);
  g.orbit = { start: 1000, where: 'x' }; assert.equal(g.spellBuffLeft('orbit-volley', 1000), 1); assert.ok(g.spellBuffLeft('orbit-volley', 2000) < 1 && g.spellBuffLeft('orbit-volley', 2000) > 0);
  g.orbit.flight = { x: 0, y: 0 }; assert.equal(g.spellBuffLeft('orbit-volley', 9000), 1, 'in flight');
});
test('an instant Rift Step flashes its button briefly', async () => {
  const { RIFT_FLASH } = await import('../src/game.ts');
  const g = game(); assert.equal(g.riftFlashLeft(1000), 0); g.riftFlashAt = 1000;
  assert.equal(g.riftFlashLeft(1000), 1); assert.ok(g.riftFlashLeft(1000 + RIFT_FLASH * 500) > 0); assert.equal(g.riftFlashLeft(1000 + RIFT_FLASH * 1000 + 1), 0);
});
