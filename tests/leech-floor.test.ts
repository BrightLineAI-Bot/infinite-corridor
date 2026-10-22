// Release 281 (Tim, 2026-10-22: "the leaching glyph isn't working, so I'm not getting health"): Leech heals a share of
// damage dealt, but never less than a share of max health per landed hit, so it still shows at high level.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GLYPHS, glyphHit, hostLoadout, socketGlyph, normalizeSockets } from '../src/glyphs.ts';
import { freshSave } from '../src/types.ts';

function healed(host, dealt, maxHp, glyphs = ['leech']) {
  const s = freshSave();
  s.equipment.primary = normalizeSockets({ id: 'p', name: 'Cleaver', slot: 'primary', power: 4, property: 'impact', tier: 'relic', affixes: [] });
  for (const [i, id] of glyphs.entries()) { s.glyphs[id] = (s.glyphs[id] || 0) + 1; assert.equal(socketGlyph(s, host === 'spell' ? (s.equippedSpell || 'ember-ring') : host, i, id).ok, true); }
  let total = 0; const world = { now: 0, enemies: [], maxHp, heal: (a) => { total += a; }, damage() {}, blast() {}, stamina() {} };
  glyphHit(world, hostLoadout(s, host), { id: 'f', x: 0, y: 0, hp: 100 }, dealt);
  return total;
}

test('Leech heals at least its floor of max health per landed hit, and its share of big hits', () => {
  assert.equal(healed('melee', 11, 328), 328 * GLYPHS.leech.floor.melee, 'a small hit at high level heals the floor');
  assert.equal(healed('melee', 500, 328), 500 * GLYPHS.leech.hit.melee, 'a big hit heals its share');
  assert.equal(healed('spell', 8, 328), 328 * GLYPHS.leech.floor.spell);
  assert.equal(healed('melee', 0, 328), 0, 'a hit that deals nothing heals nothing');
});
