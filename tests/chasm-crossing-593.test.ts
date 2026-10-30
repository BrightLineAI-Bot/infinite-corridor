// Release 593 (Tim, 2026-10-30): "the whole dungeon should just be made pretty much a chasm with just bridges... walkways and
// some larger platforms... if you step off, you die... maybe there's some walls". A share of crossings first generated from now
// on are chasm crossings: the walls fall away into a sheer drop, the rooms stay as platforms and the corridors as walkways.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, generatePinnedDungeon, CHASM, chasmRoll } from '../src/game.ts';
import { LETHAL_KINDS } from '../src/landscape.ts';
import { readFileSync } from 'node:fs';

const seed = 'CH593';
const ids = (want, n) => { const out = []; for (let x = 1; x < 400 && out.length < n; x++) { const id = `dungeon:${seed}:g1:${x}:${x % 7}:room`; if (chasmRoll(seed, id) === want) out.push(id); } return out; };
const save = () => { const s = freshSave(); s.seed = seed; return s; };

test('about one crossing in eight is a chasm, decided once per crossing', () => {
  let n = 0; for (let x = 0; x < 2000; x++) if (chasmRoll(seed, `dungeon:${seed}:g1:${x}:3:room`)) n++;
  assert.ok(Math.abs(n / 2000 - CHASM.chance) < .03, `${n} of 2000`);
});

test('a chasm crossing: walls become a lethal drop, every floor tile and everything placed is where it was', () => {
  for (const id of ids(true, 4)) {
    const s = save(), m = generatePinnedDungeon(s, id); assert.equal(s.consequences.dungeons[id].chasm, CHASM.version); assert.equal(m.chasm, CHASM.version); assert.match(m.name, / · Chasm$/);
    const plain = save(); plain.consequences.dungeons[id] = { chasm: 0 }; const p = generatePinnedDungeon(plain, id);
    assert.equal(m.tiles.length, p.tiles.length); let drop = 0, kept = 0;
    m.tiles.forEach((t, i) => { const q = p.tiles[i]; if (!q.blocked) assert.deepEqual(t, q, 'floors are untouched'); else if (t.chasm) { drop++; assert.ok(LETHAL_KINDS.has(t.kind) && !t.blocked); } else kept++; });
    assert.ok(drop > kept * 2, `${drop} drop, ${kept} walls`); assert.ok(kept > 0, 'some walls stand');
    const w = m.width; for (let x = 0; x < w; x++) assert.ok(m.tiles[x].blocked && m.tiles[(m.height - 1) * w + x].blocked, 'the outer edge stays');
    assert.deepEqual(m.objects.map((o) => [o.kind, o.x, o.y]), p.objects.map((o) => [o.kind, o.x, o.y])); assert.deepEqual(m.entry, p.entry);
    assert.deepEqual(generatePinnedDungeon(s, id), m, 'deterministic');
  }
});

test('crossings already entered, other crossings, Poison Crypts and Sleeper\'s Halls are never chasms', () => {
  const [id] = ids(true, 1), s = save(); s.session.areas[id] = { objects: {} }; const m = generatePinnedDungeon(s, id);
  assert.ok(!m.chasm && !m.tiles.some((t) => t.chasm), 'a crossing seen before keeps its walls');
  for (const other of ids(false, 3)) { const q = generatePinnedDungeon(save(), other); assert.ok(!q.chasm && !q.tiles.some((t) => t.chasm)); }
  const crypt = save(); crypt.consequences.dungeons[id] = { mire: { version: 1, merged: 0, found: false } }; assert.ok(!generatePinnedDungeon(crypt, id).chasm);
});

test('in the game: the drop is a lethal edge the creatures keep off', () => {
  const [id] = ids(true, 1), s = save(); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 3, ry: 2, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); assert.equal(g.map.chasm, CHASM.version);
  for (const e of g.enemies) { const t = g.map.tiles[Math.floor(e.y + .75) * g.map.width + Math.floor(e.x + .5)]; assert.ok(!t?.chasm, `${e.kind} stands on a walkway`); }
});

// Release 597 (Tim: "if you fall off them, you die... stars in the background... a penumbra around the character"): stepping
// off a walkway is a fall into the stars; the drop is drawn as a starfield (renderer.ts drawStarChasm, glitterChasm, the penumbra).
test('walking off the edge of a chasm crossing is a fall to your death, into the stars', () => {
  const [id] = ids(true, 1), s = save(); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 3, ry: 2, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); g.enemies = []; const w = g.map.width;
  const edge = g.map.tiles.find((t) => !t.blocked && !t.chasm && g.map.tiles[t.y * w + t.x + 1]?.chasm); Object.assign(g.player, { x: edge.x, y: edge.y - .25 });
  const before = s.worldFlags.deaths || 0, move = { state: { x: 1, y: 0 }, consume: () => false, held: () => false }; let t = 1000, said = '';
  for (let i = 0; i < 30 && (s.worldFlags.deaths || 0) === before; i++) { t += 50; g.update(.05, move, t); said = g.message; }
  assert.equal((s.worldFlags.deaths || 0) - before, 1, 'one step off is death'); assert.match(said, /fell away into the stars/);
  const src = readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'); assert.match(src, /function drawStarChasm/); assert.match(src, /map\?\.chasm\) \{ const P = CHASM_STARS\.penumbra/);
});
