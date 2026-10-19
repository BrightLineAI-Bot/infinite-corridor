import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { TYRANT_HUNT, tyrantVisit, tickTyrantHunt, tyrantRisePoint } from '../src/tyrant-hunt.ts';

test('on ocean water the Tyrant may come, at most twice a visit, never while one is there', () => {
  const v = tyrantVisit(3, 4), always = () => 0, never = () => .99;
  assert.equal(tickTyrantHunt(v, TYRANT_HUNT.every - 1, true, false, always), false, 'not before the clock runs out');
  assert.equal(tickTyrantHunt(v, 1, true, false, always), true);
  assert.equal(tickTyrantHunt(v, TYRANT_HUNT.every, true, true, always), false, 'not while one is in the section');
  assert.equal(tickTyrantHunt(v, TYRANT_HUNT.every, false, false, always), false, 'not off the ocean');
  assert.equal(tickTyrantHunt(v, TYRANT_HUNT.every, true, false, never), false, 'a chance, not a certainty');
  assert.equal(tickTyrantHunt(v, TYRANT_HUNT.every, true, false, always), true);
  assert.equal(v.count, TYRANT_HUNT.perVisit);
  assert.equal(tickTyrantHunt(v, TYRANT_HUNT.every * 3, true, false, always), false, 'twice a visit at most');
  assert.equal(tickTyrantHunt(tyrantVisit(3, 4), TYRANT_HUNT.every, true, false, always), true, 'a new visit starts afresh');
  assert.equal(TYRANT_HUNT.perVisit, 2);
});

test('it rises from ocean water a few tiles away, or not at all on a small pond', () => {
  const tiles = []; for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) tiles.push({ x, y, kind: x > 10 ? 'deepOcean' : 'ash', blocked: false });
  const p = tyrantRisePoint({ tiles }, 12, 16, () => .5), d = Math.hypot(p.x - 12, p.y - 16);
  assert.ok(d >= TYRANT_HUNT.range[0] && d <= TYRANT_HUNT.range[1]); assert.equal(tiles[p.y * 32 + p.x].kind, 'deepOcean');
  const pond = tiles.map((t) => ({ ...t, kind: t.x === 12 && t.y === 16 ? 'ocean' : 'ash' }));
  assert.equal(tyrantRisePoint({ tiles: pond }, 12, 16, () => .5), null);
});

test('in the game it rises as a hunting Tyrant Mosasaur that stalks unseen first, and is not kept when you leave', () => {
  const s = freshSave(), g = new Game(s); g.loadArea('overworld', false);
  for (const t of g.map.tiles) Object.assign(t, { kind: 'deepOcean', blocked: false });
  g.player.x = 16; g.player.y = 16; g.tyrantVisit = tyrantVisit(g.rx, g.ry);
  const c = g.riseTyrant();
  assert.ok(c); assert.equal(c.seaKind, 'tyrantMosasaur'); assert.equal(c.hunting, true); assert.equal(c.hidden, true);
  assert.match(g.message, /Tyrant Mosasaur/);
  g.snapshotArea(); g.loadArea('overworld', false);
  assert.ok(!g.enemies.some((e) => e.hunting), 'the hunt ends when the section reloads');
  assert.match(readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'), /tickTyrantHunt\(this\.tyrantVisit, dt, onOcean, present, Math\.random\)/);
});
