// Close View play-through of 926, bug 14: "shacks next to Ember Refuge have no roof deck". Decided: they stay without one for now.
// The sections round the Refuge are the old heartland: no landscape, so every tile is level 0, walking ignores levels
// (landscape.ts canStep) and the fall model does not apply (game.ts fallApplies). A deck there would be two levels over flat
// ground that no jump reaches, and stepping off it would drop the Wayfarer with no fall at all. Decks are derived (no map or
// save change either way); enabling them on heartland ground needs the fall and ledge rules there first (a question for Tim).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { roofDeckIndex, roofDecksApply } from '../src/roof-decks.ts';

const at = (rx: number, ry: number) => { const s: any = freshSave(); s.seed = 'PLAY-926'; Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 }); return new Game(s, 0) as any; };

test('926 bug 14: the heartland shacks beside Ember Refuge have no roof deck, because the heartland has no levels or falls', () => {
  for (const [rx, ry] of [[0, 1], [0, -1]]) {
    const g = at(rx, ry), m = g.map, before = JSON.stringify(m.tiles);
    assert.ok(m.tiles.some((t: any) => /^shack/.test(t.structure || '')), `(${rx},${ry}) has a shack`);
    assert.equal(!!m.landscape, false, 'old heartland: no landscape');
    assert.ok(m.tiles.every((t: any) => !(t.elev > 0)), 'flat: every tile level 0');
    assert.equal(g.fallApplies(), false, 'no fall model here');
    assert.equal(roofDecksApply(m), false); assert.equal(roofDeckIndex(m).decks.length, 0); assert.equal(g.decksApply(), false);
    assert.equal(JSON.stringify(m.tiles), before, 'reading decks never writes the map');
  }
  const wild = at(-1, -1); assert.equal(!!wild.map.landscape, true); assert.ok(roofDeckIndex(wild.map).decks.length > 0, 'a landscape section nearby keeps its decks');
});
