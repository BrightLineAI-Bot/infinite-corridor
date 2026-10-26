// Release 439 (Tim, with a screenshot of the Wayfarer alone in the dark after "The annex resolves around you in impossible
// clarity": "It's still starting me in random places... intermittently"): every remaining fixed dungeon landing (the
// Aperture annex and its return, displacement thresholds, the Listener's Hall, Viewport hunt instances, the elite portal)
// now lands on the map's own entry and then through settleArrival, as release 419's arrivals do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { generatePinnedDungeon, footprintOpen, mapWidth, settleDungeonArrival } from '../src/game.ts';

test('the old fixed annex landing (4, 5) was off the floor in many annexes; the entry is on it', () => {
  let off = 0;
  for (let i = 0; i < 30; i++) {
    const s = freshSave(); s.seed = `ANX${i}`; const m = generatePinnedDungeon(s, `dungeon:ANX${i}:g1:${3 + i % 9}:${i % 4}:room-${i}:aperture-annex`), w = mapWidth(m, 'dungeon');
    if (settleDungeonArrival(m, w, { x: 4, y: 5 }, [], false)) off++;
    const at = { x: m.entry?.x ?? 4, y: m.entry?.y ?? 5 }, to = settleDungeonArrival(m, w, at, [], false) || at;
    assert.ok(footprintOpen(m, w, to.x, to.y), `annex ${i} lands on open floor`);
  }
  assert.ok(off > 0, 'the bug was real');
});

test('every fixed dungeon landing is followed by settleArrival', () => {
  const g = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  for (const marker of ['"The annex resolves around you', '"You step back through the unseen crossing', "The threshold folds the room into somewhere else", 'The dais folds the line shut behind you', 'Viewport closes the Held Aperture', 'elite-portal:${this.save.seed}:knife-choir']) {
    const i = g.indexOf(marker); assert.ok(i > 0, marker); const window = g.slice(Math.max(0, i - 700), i + 700);
    assert.match(window, /settleArrival\(\)/, `${marker} settles`);
  }
});
