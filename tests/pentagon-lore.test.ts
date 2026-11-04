// The Pentagons' lore (Tim, 2026-11-04; docs/narrative-bible.md section 1): nobody is certain what they are. Sparse marks in a
// few chambers' walls that contradict each other; vent-life lines in the Codex; a line for each Tesseract set that grows quieter;
// one Glimpse from inside a Pentagon wall. None of it explains anything, counts anything, or changes a number.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { PENTAGON, PENTAGON_LORE, pentagonPlan, generatePentagonChamber, inscriptionIn, addPentagonInscription, readPentagonInscription, inscriptionsRead } from '../src/pentagon.ts';
import { TESSERACTS, grantTesseract, setTesseract, tesseractBonus, tesseractEcho, ensureTesseracts } from '../src/tesseracts.ts';
import { GLIMPSES, GLIMPSE_ORDER, GLIMPSE_PLACED, GLIMPSE_CHANCE, pickGlimpse, glimpseFor, witnessGlimpse, witnessedGlimpses, glimpseAllowed } from '../src/glimpses.ts';
import { hasGlimpseRenderer, drawGlimpse } from '../src/glimpse-render.ts';
import { MONSTER_PACK } from '../src/monster-pack.ts';

const chambers = (seed, cx, cy, V = PENTAGON.version) => { const P = pentagonPlan(seed, cx, cy, V); return P.nodes.map((q) => `${P.base}:f${q.n + 1}`); };
const save = (seed) => { const s = freshSave(); s.seed = seed; return s; };
const ctx = () => new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });

test('the marks: a short table, three readings and one in no hand at all, none of them long', () => {
  const L = PENTAGON_LORE.inscriptions, by = (lean) => L.filter((q) => q.lean === lean).length;
  assert.ok(L.length >= 9 && L.length <= 12, `${L.length} marks`);
  for (const lean of ['outcrop', 'people', 'seam']) assert.ok(by(lean) >= 3 && by(lean) <= 5, lean);
  assert.equal(by('none'), 1); assert.match(L.find((q) => q.lean === 'none').text, /no hand at all/);
  assert.equal(new Set(L.map((q) => q.id)).size, L.length);
  for (const q of L) assert.ok(q.text.length <= 200, q.id);
  assert.ok(PENTAGON_LORE.chance > 0 && PENTAGON_LORE.chance <= .3, 'rare');
});

test('placement is deterministic and sparse: at most one a chamber, many chambers none, and never at the way in', () => {
  let all = 0, marked = 0; const perPentagon = [];
  for (let i = 0; i < 40; i++) { const seed = `L${i}`, s = save(seed); let here = 0;
    for (const id of chambers(seed, i * 8, -i * 8)) { all++; const a = inscriptionIn(s, id); assert.equal(inscriptionIn(s, id), a, 'the same twice');
      const map = generatePentagonChamber(seed, id), o = addPentagonInscription(map, s, id); assert.equal(!!o, !!a, id);
      assert.equal(addPentagonInscription(map, s, id), null, 'one a chamber'); assert.equal(map.objects.filter((q) => q.kind === 'pentInscription').length, a ? 1 : 0);
      if (!o) continue; marked++; here++;
      const again = addPentagonInscription(generatePentagonChamber(seed, id), s, id); assert.deepEqual([again.x, again.y, again.inscription], [o.x, o.y, o.inscription], 'the same place');
      const W = map.width, t = map.tiles[o.y * W + o.x]; assert.ok(!t.blocked && !t.doorway && !t.plate, id);
      assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.tiles[(o.y + dy) * W + o.x + dx]?.blocked), 'against a wall');
      assert.ok(Math.abs(o.x - map.entry.x) + Math.abs(o.y - map.entry.y) >= PENTAGON_LORE.minFromEntry);
      assert.ok(!map.objects.some((q) => q !== o && Math.round(q.x) === o.x && Math.round(q.y) === o.y) && !map.enemySpawns.some((e) => Math.round(e.x) === o.x && Math.round(e.y) === o.y), 'clear of everything else'); }
    perPentagon.push(here); }
  const share = marked / all; assert.ok(share > .12 && share < .32, `${marked} of ${all}`);
  assert.ok(perPentagon.every((n) => n <= 12), `${Math.max(...perPentagon)} in one Pentagon`);
  assert.equal(inscriptionIn(save('X'), 'dungeon:X:g1:3:4:hollow'), null, 'Pentagons only');
});

test('the chambers themselves are untouched: every version regenerates byte for byte, with or without marks laid over them', () => {
  for (const V of [1, 2, 3, 4, 5]) for (let i = 0; i < 6; i++) { const seed = `B${V}${i}`, s = save(seed);
    for (const id of chambers(seed, 16 + i * 8, 8, V)) { const a = JSON.stringify(generatePentagonChamber(seed, id)), m = generatePentagonChamber(seed, id), tiles = JSON.stringify(m.tiles), spawns = JSON.stringify(m.enemySpawns), n = m.objects.length;
      addPentagonInscription(m, s, id); assert.equal(JSON.stringify(m.tiles), tiles); assert.equal(JSON.stringify(m.enemySpawns), spawns); assert.ok(m.objects.length - n <= 1);
      assert.equal(JSON.stringify(generatePentagonChamber(seed, id)), a, `${id} regenerates`); } }
});

test('no repeats: each mark is read once, a chamber keeps the marks read in it, and when all are read new chambers hold none', () => {
  const seed = 'NR', s = save(seed), ids = []; for (let i = 0; i < 60 && ids.length < 400; i++) ids.push(...chambers(seed, 16 + i * 8, 24));
  const firsts = [], where = new Map();
  for (const id of ids) { const map = generatePentagonChamber(seed, id), o = addPentagonInscription(map, s, id); if (!o) continue;
    if (where.has(id)) continue; const r = readPentagonInscription(s, o); assert.ok(r.ok); assert.equal(r.message, r.text); assert.doesNotMatch(r.message, /\d+ of \d+/, 'never counted');
    if (r.first) firsts.push(o.inscription); where.set(id, o.inscription); }
  assert.deepEqual([...firsts].sort(), PENTAGON_LORE.inscriptions.map((q) => q.id).sort(), 'every mark read, each once');
  assert.equal(inscriptionsRead(s).length, PENTAGON_LORE.inscriptions.length);
  for (const [id, mark] of where) { const o = addPentagonInscription(generatePentagonChamber(seed, id), s, id); assert.equal(o.inscription, mark, 'kept'); assert.equal(o.state, 'read'); assert.equal(readPentagonInscription(s, o).first, false); }
  const fresh = ids.filter((id) => !where.has(id)).map((id) => addPentagonInscription(generatePentagonChamber(seed, id), s, id)); assert.ok(fresh.every((o) => o === null), 'nothing more once all are read');
  assert.ok(Object.keys(s.lore.inscribedAt).length <= PENTAGON_LORE.inscriptions.length, 'bounded');
  // the save: additive at schema 14, kept through migration; nonsense dropped, unknown ids kept; a fresh save has neither field
  s.lore.inscriptions.push('future0', 7); s.lore.inscribedAt.broken = 3; const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.version, 14); assert.ok(m.lore.inscriptions.includes('future0') && !m.lore.inscriptions.includes(7)); assert.equal(m.lore.inscribedAt.broken, undefined);
  assert.equal(Object.keys(m.lore.inscribedAt).length, where.size); assert.equal(freshSave().lore.inscriptions, undefined); assert.equal(freshSave().lore.inscribedAt, undefined);
});

test('in the game: marks in a chamber read once, into the Journal and the save, and may open the Glimpse from inside the wall', () => {
  const s = save('TIM1'), g = new Game(s, 0); let found = null;
  outer: for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) { if (!g.pentagonHere(cx, cy)) continue;
    for (const id of chambers('TIM1', cx, cy)) { if (!inscriptionIn(g.save, id)) continue; g.save.session.activeDungeonId = id; g.loadArea('dungeon', false); found = g.map.objects.find((o) => o.kind === 'pentInscription'); if (found) break outer; } }
  assert.ok(found, 'a chamber with marks'); assert.doesNotThrow(() => { g.player.x = found.x; g.player.y = found.y; render(ctx(), g, 360, 640, 5000); });
  g.player.x = found.x; g.player.y = found.y; const r = g.interact('read', found.id);
  assert.ok(r.ok); assert.equal(g.message, PENTAGON_LORE.inscriptions.find((q) => q.id === found.inscription).text);
  assert.ok(g.save.lore.inscriptions.includes(found.inscription)); assert.equal(g.glimpseCue, 'pentagon');
  const j = g.save.narrative.journal.filter((e) => e.recordId === `pentagon-inscription:${found.inscription}`); assert.equal(j.length, 1); assert.equal(j[0].title, PENTAGON_LORE.title);
  g.glimpseCue = null; g.interact('read', found.id); assert.equal(g.glimpseCue, null, 'only the first reading'); assert.equal(g.save.narrative.journal.filter((e) => e.recordId === `pentagon-inscription:${found.inscription}`).length, 1);
  const id = found.chamberId; g.loadArea('dungeon', false); const back = g.map.objects.find((o) => o.kind === 'pentInscription'); assert.equal(back.inscription, found.inscription); assert.equal(back.state, 'read'); assert.equal(g.areaId(), id);
});

test('vent-life: a few creatures of the keeps and Pentagons, and their Codex lines, data only', () => {
  const V = PENTAGON_LORE.vent, ids = Object.keys(V); assert.ok(ids.length >= 2 && ids.length <= 3);
  for (const id of ids) { assert.ok(PENTAGON.guards.includes(id), `${id} lives in the Pentagons`); assert.ok(V[id].length <= 200); assert.match(V[id], /warm/); }
  assert.ok(ids.some((id) => /two pages meet/.test(V[id])));
  for (const id of ids) if (MONSTER_PACK[id]) assert.ok(!MONSTER_PACK[id].lore.includes(V[id]), 'the creature itself is unchanged');
});

test('Tesseracts: each set says a line, quieter each time, then nothing; moving a glyph says nothing; no number changes', () => {
  const E = TESSERACTS.echoes; assert.ok(E.length >= 6 && E.length <= 8); assert.ok(E.includes('You set it. Something you knew is not there now. You do not miss it.'));
  assert.ok(E.every((x, i) => i === 0 || x.length < E[0].length), 'none says as much as the first'); assert.ok(E.slice(-2).every((x) => x.length <= 12), 'near-silence at the end');
  assert.equal(tesseractEcho(E.length + 1), null); assert.equal(tesseractEcho(0), null);
  const s = save('TE'), glyphs = Array.from({ length: E.length + 3 }, (_, i) => grantTesseract(s, `src${i}`, 'deep', 0));
  assert.equal(s.tesseracts.echo, undefined, 'nothing saved until a glyph is set');
  const said = []; for (const q of glyphs) { const before = JSON.stringify(tesseractBonus(s)), r = setTesseract(s, 0, q.uid); assert.ok(r.ok); said.push(r.echo);
    const plain = save('TE'); plain.tesseracts = JSON.parse(JSON.stringify(s.tesseracts)); delete plain.tesseracts.echo; assert.deepEqual(tesseractBonus(s), tesseractBonus(plain), 'flavour only'); assert.ok(before); }
  assert.deepEqual(said.slice(0, E.length), E); assert.ok(said.slice(E.length).every((x) => x === null), 'then silence'); assert.equal(s.tesseracts.echo, glyphs.length);
  const last = glyphs[glyphs.length - 1], r = setTesseract(s, 1, last.uid); assert.equal(r.echo, null, 'a move is not a set'); assert.equal(s.tesseracts.echo, glyphs.length); assert.match(r.message, /set\.$/);
  const t = save('TF'), a = grantTesseract(t, 'x', 'labyrinth'), first = setTesseract(t, 0, a.uid); assert.equal(first.message, `${a.name}. ${E[0]}`);
  assert.equal(setTesseract(t, 0, null).echo, null); assert.equal(setTesseract(t, 0, a.uid).echo, E[1], 'set again after clearing: the next line');
  const m = migrateSave(JSON.parse(JSON.stringify(t))); assert.equal(m.tesseracts.echo, 2); assert.equal(ensureTesseracts({ tesseracts: { echo: 'x' } }).tesseracts.echo, 0);
});

test('the Glimpse from inside the wall: defined, drawn, kept out of the general pool, surfacing in a Pentagon at most once', () => {
  const G = GLIMPSES.insideTheWall; assert.ok(G && hasGlimpseRenderer('insideTheWall')); assert.equal(G.place, 'pentagon'); assert.equal(G.eyes, 'none');
  assert.ok(G.seconds >= 8 && G.seconds <= 20 && G.reduced.length >= 2 && !G.mature); assert.ok(glimpseAllowed('insideTheWall', true), 'family-safe');
  assert.ok(!GLIMPSE_ORDER.includes('insideTheWall')); assert.deepEqual(GLIMPSE_PLACED.pentagon, ['insideTheWall']); assert.ok(GLIMPSE_CHANCE.pentagon > 0 && GLIMPSE_CHANCE.pentagon <= .3, 'rare');
  const s = save('GW'); let r = 0; const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 400; i++) assert.notEqual(pickGlimpse(s, 30, 30, rand), 'insideTheWall');
  for (let i = 0; i < 200; i++) assert.notEqual(glimpseFor(s, 'touch', 30, 30, rand), 'insideTheWall');
  assert.equal(glimpseFor(s, 'pentagon', 30, 30, () => .999), null, 'by chance only');
  assert.equal(glimpseFor(s, 'pentagon', 30, 30, () => 0), 'insideTheWall');
  witnessGlimpse(s, 'insideTheWall', 30, 30); assert.ok(witnessedGlimpses(s).includes('insideTheWall'), 'the Tome can replay it');
  assert.equal(glimpseFor(s, 'pentagon', 30, 30, () => 0), null, 'once');
  // drawn cheaply: a canvas painted once, then a few strokes a frame
  const keep = globalThis.OffscreenCanvas; let made = 0; globalThis.OffscreenCanvas = class { constructor(w, h) { made++; this.width = w; this.height = h; } getContext() { return ctx(); } };
  try { const state = { quality: 'low' }; for (const t of [0, .1, .3, .5, .7, .9, 1, ...G.reduced]) assert.doesNotThrow(() => drawGlimpse(ctx(), 'insideTheWall', t, 360, 640, state), `t ${t}`); assert.ok(made <= 2, `${made} canvases`); }
  finally { if (keep === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = keep; }
});
