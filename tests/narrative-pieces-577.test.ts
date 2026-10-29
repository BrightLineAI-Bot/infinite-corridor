// Release 577 (Tim, 2026-10-29): the story's pieces are never stranded in one crossing. A bell crossing at any depth offers a
// bell not yet rung, and a crossing that rang one keeps it. Release 581 (Tim: "the journal doesn't have to track them"): no
// Active quests entry and no left-behind notes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { BELLS, bellIn, addBell, ringBell, bellsRung } from '../src/bells.ts';

const seed = 'PIECES577';
const bellCrossings = (lo, hi) => { const out = []; for (let rx = -hi; rx <= hi; rx++) for (let ry = -hi; ry <= hi; ry++) { const d = Math.abs(rx) + Math.abs(ry); if (d < lo || d > hi) continue; const id = `dungeon:${seed}:g1:${rx}:${ry}:room`; if (bellIn(seed, id)) out.push({ id, rx, ry }); } return out; };
const map = () => ({ width: 24, height: 24, entry: { x: 4, y: 5 }, objects: [], tiles: Array.from({ length: 576 }, (_, i) => ({ x: i % 24, y: Math.floor(i / 24), kind: 'floor', blocked: false })) });

test('bells hang far out too, and a crossing offers only a bell not yet rung', () => {
  assert.ok(bellCrossings(BELLS.maxDepth + 1, BELLS.maxDepth + 12).length > 5, 'past the old farthest band');
  const [a] = bellCrossings(4, 10), s = freshSave(); s.seed = seed;
  const first = addBell(map(), s, a.id).bell; s.lore.bells = String(first);
  const next = addBell(map(), s, a.id).bell; assert.notEqual(next, first, 'its bell was rung elsewhere: it offers another');
  s.lore.bells = '1234567'; assert.equal(addBell(map(), s, a.id).state, 'rung', 'all rung: it hangs silent');
});

test('a crossing that rang a bell keeps it: one crossing, one bell', () => {
  const [a] = bellCrossings(4, 10), s = freshSave(); s.seed = seed;
  const o = addBell(map(), s, a.id); assert.ok(ringBell(s, o).first);
  const again = addBell(map(), s, a.id); assert.equal(again.bell, o.bell); assert.equal(again.state, 'rung');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.lore.bellAt[o.bell], a.id, 'remembered through migration');
  assert.equal(bellsRung(back).length, 1);
});

test('the Journal does not track the bells or the chain; entering and ringing leave no notes', () => {
  const s = freshSave(); s.seed = seed; const c = bellCrossings(4, 10)[0];
  s.session.activeDungeonId = c.id; s.session.dungeonReturn = { rx: c.rx, ry: c.ry, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); const o = g.map.objects.find((q) => q.kind === 'crackedBell');
  g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y + .2 }); assert.ok(g.interact('ring', o.id).ok);
  assert.equal(s.lore.leftBehind, undefined); assert.ok(s.narrative.journal.some((j) => j.title === 'The Seven Bells'), 'the story is still written down');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /add\("The Seven Bells"/); assert.doesNotMatch(main, /add\("The Surveyor's Chain"/);
  const old = migrateSave(JSON.parse(JSON.stringify({ ...s, lore: { ...s.lore, leftBehind: { x: { kind: 'bell', rx: 1, ry: 2 } } } })));
  assert.deepEqual(old.lore.leftBehind, { x: { kind: 'bell', rx: 1, ry: 2 } }, 'notes saved by 577 are left as they were');
});
