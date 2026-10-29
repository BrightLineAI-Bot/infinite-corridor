// Release 559 (Tim, 2026-10-29): the Atlas shows each explored section in its own colours; relay markers only where relays
// really are, and new crossings hold relays wherever the pattern is alive; a QUEST COMPLETE banner for finished hunts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, walkerCrossingMap } from '../src/game.ts';
import { sectionAtlasColor, ATLAS_TILE_COLORS } from '../src/atlas-colors.ts';
import { relayCell, relayEdge, relayHeld, relayNodeDecision, knownRelaySections, RELAY_PLACEMENT } from '../src/relay-network.ts';

test('a section is recorded in its own colours: sea reads blue, dream reads pale violet', () => {
  assert.equal(sectionAtlasColor({ tiles: [{ kind: 'ocean' }, { kind: 'ocean' }] }), ATLAS_TILE_COLORS.ocean);
  assert.equal(sectionAtlasColor({ tiles: [] }), null);
  assert.equal(sectionAtlasColor({ tiles: [{ kind: 'no-such-kind' }] }), ATLAS_TILE_COLORS.ash);
  const s = freshSave(); s.seed = 'COLOURS'; const g = new Game(s, 0); g.rx = 3; g.ry = 2; g.loadArea('overworld');
  const rec = s.atlas['3,2']; assert.match(rec.color, /^#[0-9a-f]{6}$/);
  assert.equal(rec.color, sectionAtlasColor(g.map), 'the colour is the visited map\'s');
  assert.equal(sectionAtlasColor(walkerCrossingMap(s, 3, 2)), rec.color, 'the Atlas fill-in reproduces it from the pinned map');
  const blue = (hex) => { const n = parseInt(hex.slice(1), 16); return (n & 255) > ((n >> 16) & 255); };
  assert.ok(blue(sectionAtlasColor({ tiles: Array(10).fill({ kind: 'deepOcean' }) })));
});

test('crossings first entered from 559 hold a relay wherever the pattern is alive; earlier decisions stand', () => {
  assert.equal(RELAY_PLACEMENT.version, 3);
  let edge = 0, alive = 0; for (let x = -40; x < 40; x++) for (let y = -40; y < 40; y++) { if (relayEdge('R', x, y)) edge++; if (relayHeld('R', x, y)) alive++; assert.equal(relayHeld('R', x, y, 2), relayEdge('R', x, y)); }
  assert.ok(alive > edge * 2, `${alive} alive vs ${edge} edges`);
  const s = freshSave(); s.seed = 'R';
  let at = null; for (let x = 5; x < 60 && !at; x++) if (relayCell('R', x, 7) && !relayEdge('R', x, 7)) at = x;
  const id = `dungeon:R:g1:${at}:7:hollow`, h = { visits: 0 };
  assert.equal(relayNodeDecision(s, id, h, 'dungeon:R:g1'), true); assert.equal(h.relayPattern, 3);
  const old = { visits: 0, relayNode: false }; assert.equal(relayNodeDecision(s, id, old, 'dungeon:R:g1'), false, 'decided before: unchanged');
});

test('the Atlas marks only explored crossings that really hold a relay', () => {
  const s = freshSave(); s.seed = 'R'; s.explored = {}; s.atlas = {}; s.consequences.dungeons = {};
  const cells = []; for (let x = 5; x < 80 && cells.length < 3; x++) if (relayCell('R', x, 9)) cells.push(x);
  const dead = [...Array(80).keys()].find((x) => x > 5 && !relayCell('R', x, 9));
  const put = (x, crossing = true) => { s.explored[`${x},9`] = true; s.atlas[`${x},9`] = { terrain: 'ash', sites: crossing ? [{ kind: 'dungeon', name: 'c', x: 5, y: 5 }] : [] }; };
  put(cells[0]); put(cells[1], false); put(cells[2]); put(dead);
  s.consequences.dungeons[`dungeon:R:g1:${cells[2]}:9:hollow`] = { visits: 2, relayNode: false };
  s.relayNetwork = { version: 1, nodes: { [`dungeon:R:g1:${cells[0]}:9:hollow`]: { choice: 'restore' } }, fragments: 1 };
  const k = knownRelaySections(s);
  assert.equal(k.get(`${cells[0]},9`), 'answered');
  assert.equal(k.has(`${cells[1]},9`), false, 'alive but no crossing: no relay');
  assert.equal(k.has(`${cells[2]},9`), false, 'its crossing was decided without one');
  assert.equal(k.has(`${dead},9`), false, 'dead cell: no relay');
  s.consequences.dungeons = {}; assert.equal(knownRelaySections(s).get(`${cells[2]},9`), 'dormant', 'not yet entered: it will hold one');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.ok(!/relayEdge\(save\.seed/.test(main) && !/relayCell\(save\.seed/.test(main), 'the overlay no longer draws the bare pattern');
});

test('a finished hunt queues a QUEST COMPLETE banner', () => {
  const game = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(game, /questNotices\|\|=\[\]\)\.push\(\{title:'QUEST COMPLETE'/);
  assert.match(main, /function watchQuests/); assert.match(main, /Old Quillon's errand/); assert.match(main, /The Seven Bells · all seven have rung/);
});
