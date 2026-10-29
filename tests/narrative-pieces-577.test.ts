// Release 577 (Tim, 2026-10-29): the story's pieces are never stranded in one crossing. A bell crossing at any depth offers a
// bell not yet rung, a crossing that rang one keeps it, and the Journal points to the nearest crossing where a bell or a
// Surveyor's link was left behind.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { BELLS, bellIn, addBell, ringBell, bellsRung, nearestLeftBehind, noteLeftBehind } from '../src/bells.ts';
import { surveyorCrossing } from '../src/surveyor.ts';

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

test('entering a crossing and leaving its bell notes it; ringing it clears the note; the Journal points there', () => {
  const s = freshSave(); s.seed = seed; const c = bellCrossings(4, 10)[0];
  s.session.activeDungeonId = c.id; s.session.dungeonReturn = { rx: c.rx, ry: c.ry, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false);
  assert.deepEqual(nearestLeftBehind(s, 'bell', 0, 0), { kind: 'bell', rx: c.rx, ry: c.ry });
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).lore.leftBehind[`bell|${c.id}`], { kind: 'bell', rx: c.rx, ry: c.ry });
  const o = g.map.objects.find((q) => q.kind === 'crackedBell'); g.enemies = []; Object.assign(g.player, { x: o.x, y: o.y + .2 });
  assert.ok(g.interact('ring', o.id).ok); assert.equal(nearestLeftBehind(s, 'bell', 0, 0), null, 'rung: no longer noted');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /nearestLeftBehind\(save,"bell"/); assert.match(main, /add\("The Surveyor's Chain"/);
});

test('a Surveyor\'s link left in a crossing is noted too; the nearest is the one pointed to; the list stays short', () => {
  let id = null; for (let rx = 8; rx < 40 && !id; rx++) for (let ry = 0; ry < 20 && !id; ry++) { const q = `dungeon:${seed}:g1:${rx}:${ry}:room`; if (surveyorCrossing(seed, q)) id = q; }
  const s = freshSave(); s.seed = seed; const [, , , rx, ry] = id.split(':').map(Number);
  s.session.activeDungeonId = id; s.session.dungeonReturn = { rx, ry, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); assert.ok(g.map.objects.some((q) => q.kind === 'surveyorLink'));
  assert.deepEqual(nearestLeftBehind(s, 'link', rx, ry), { kind: 'link', rx, ry });
  noteLeftBehind(s, `dungeon:${seed}:g1:2:2:room`, 'bell', true); noteLeftBehind(s, `dungeon:${seed}:g1:30:30:room`, 'bell', true);
  assert.deepEqual(nearestLeftBehind(s, 'bell', 0, 0), { kind: 'bell', rx: 2, ry: 2 });
  for (let i = 0; i < BELLS.leftBehind + 10; i++) noteLeftBehind(s, `dungeon:${seed}:g1:${i}:50:room`, 'bell', true);
  assert.equal(Object.keys(s.lore.leftBehind).length, BELLS.leftBehind);
});
