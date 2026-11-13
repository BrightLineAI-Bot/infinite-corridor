// QA pass on release 926: just after a section crossing the edge just crossed holds for a moment (EDGE_HOLD), and a pause shifts
// that clock, but a reload dropped it: pushed straight back at the edge, the reloaded Wayfarer crossed back at once while the
// uninterrupted one was held. The hold is now saved additively (playerRuntime.edgeHold, schema 14) as its elapsed time.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, EDGE_HOLD } from '../src/game.ts';

const up = { state: { x: 0, y: -1 }, consume: () => false, held: () => false };
function crossed(seed = 'QA3') {
  const s: any = freshSave(); s.seed = seed; Object.assign(s.session, { area: 'overworld', rx: 0, ry: 0, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.update(1 / 60, { ...up, state: { x: 0, y: 0 } }, 1000);
  g.transitionSection(0, 1); g.enemies = []; g.player.y = .02; // just over the north edge of the new section, facing back
  return g;
}

test('a reload just after a crossing keeps the edge hold, so twins pushed back at the edge stay together', () => {
  for (const pauseMs of [0, 5000]) {
    const a = crossed(); let now = 1000 + 100;
    assert.deepEqual([a.edgeHold.dx || 0, a.edgeHold.dy], [0, -1]);
    const b: any = new Game(structuredClone(a.exportSnapshot(now)), now + pauseMs); b.enemies = [];
    assert.ok(b.edgeHold, 'the hold is restored'); assert.equal(now - a.edgeHold.at, now + pauseMs - b.edgeHold.at, 'with the same time left');
    if (pauseMs) { a.setPaused(true, now); a.setPaused(false, now + pauseMs); }
    for (let k = 0; k < 40; k++) {
      now += 1000 / 60; a.update(1 / 60, up, now + pauseMs); b.update(1 / 60, up, now + pauseMs); a.enemies = []; b.enemies = [];
      assert.deepEqual([b.rx, b.ry, b.player.x, b.player.y], [a.rx, a.ry, a.player.x, a.player.y], `frame ${k} (pause ${pauseMs} ms)`);
    }
  }
});

test('a damaged or spent saved hold is dropped', () => {
  const a = crossed(), s = structuredClone(a.exportSnapshot(1100));
  for (const bad of [{ dx: 0, dy: -1, elapsed: EDGE_HOLD.ms + 1 }, { dx: 1, dy: -1, elapsed: 0 }, { dx: 2, dy: 0, elapsed: 0 }, { dx: 0, dy: -1, elapsed: -5 }, { dx: 0, dy: -1, elapsed: 'x' }, null]) {
    s.session.playerRuntime.edgeHold = bad; const b: any = new Game(structuredClone(s), 2000); assert.equal(b.edgeHold ?? null, null, JSON.stringify(bad));
  }
});
