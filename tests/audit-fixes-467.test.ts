// Release 467: fixes for the validated findings of the Codex audit of release 455 (docs/test-runs/2026-10-26-release-455
// on branch claude/audit-test-runs-2026-10-26): F001–F006 and I002–I003. I001 is covered by the effect it adds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, isCrossingGuardian, footprintOpen } from '../src/game.ts';
import { validateJourney } from '../src/persistence.ts';
import { ensureMeal, eatMeal } from '../src/meals.ts';
import { ensureMarginalia } from '../src/marginalia.ts';
import { tickGlyphStatus } from '../src/glyphs.ts';

const reach = (map, from) => { const w = map.width, h = Math.floor(map.tiles.length / w), st = Math.round(from.y) * w + Math.round(from.x), seen = new Set([st]), q = [st]; while (q.length) { const i = q.pop(), x = i % w, y = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = (y + dy) * w + x + dx; if (x + dx < 0 || y + dy < 0 || x + dx >= w || y + dy >= h || seen.has(j) || map.tiles[j]?.blocked) continue; seen.add(j); q.push(j); } } return seen; };

test('F001: the cistern pool never cuts a Mislaid Threshold guardian off from the entry', () => {
  for (const k of [32, 38, 45, 52, 65, 82]) {
    const s = freshSave(); s.seed = `THRESH451-${k}`; s.level = 30; const g = new Game(s, 0); g.rx = 5; g.ry = -3; g.loadArea('overworld', false);
    const o = { id: `seam-${k}`, kind: 'displacementDevice', x: 16, y: 16, state: 'armed', actions: ['enter'] }; g.map.objects.push(o); g.startDisplacement(o, false);
    const guard = g.enemies.find(isCrossingGuardian); if (!guard) continue;
    const seen = reach(g.map, g.player), w = g.map.width; let ok = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (seen.has((Math.round(guard.y) + dy) * w + Math.round(guard.x) + dx)) ok = true;
    assert.ok(ok, `THRESH451-${k}: guardian reachable`);
  }
});

test('F002: the Proving Ground Diagnostics dialog shows when opened', () => {
  assert.match(readFileSync(new URL('../src/proving-ground-mobile.ts', import.meta.url), 'utf8'), /dialog\.hidden=false;dialog\.showModal\(\)/);
  assert.match(readFileSync(new URL('../styles.css', import.meta.url), 'utf8'), /body\.proving-ground #pgDiagnostics\[open\]\{display:block!important\}/);
});

test('F003: inherited names are never ingredients, marginalia or Readings; such a save loads', () => {
  for (const a of ['constructor', '__proto__', 'toString']) {
    const s = freshSave(); s.meal = { a, b: 'ironroot', remaining: 10 }; const r = validateJourney(JSON.parse(JSON.stringify(s)));
    assert.equal(r.health, 'healthy'); assert.equal(r.save.meal, undefined); assert.doesNotThrow(() => new Game(r.save, 0));
    assert.equal(eatMeal({ currency: 99 }, a, 'ironroot').ok, false); assert.deepEqual(ensureMarginalia({ marginalia: { found: [a, 'glassEdge'] } }).found, ['glassEdge']);
  }
  const s = freshSave(); s.lore = { pieces: { constructor: ['voice:0'] }, entered: { constructor: true } }; assert.doesNotThrow(() => new Game(migrateSave(JSON.parse(JSON.stringify(s))), 0));
});

test('F004: save numbers come back finite and in range', () => {
  const s = JSON.parse(JSON.stringify(freshSave())); Object.assign(s, { currency: '1e309', playSeconds: '1e309', level: -4, xp: 'NaN' }); s.stats.Vigor = '1e309'; s.materials.cinderIron = -50; s.consumables.crossingSigil = Infinity;
  const r = validateJourney(s), m = r.save; assert.equal(r.health, 'healthy');
  for (const v of [m.currency, m.playSeconds, m.level, m.xp, m.stats.Vigor, m.materials.cinderIron, m.consumables.crossingSigil]) assert.ok(Number.isFinite(v) && v >= 0, String(v));
  assert.ok(m.level >= 1); const g = new Game(m, 0); assert.ok(Number.isFinite(g.save.maxHp));
  m.currency = 30; eatMeal(m, 'ironroot', 'ironroot'); assert.equal(m.currency, 10);
});

test('F005: damaged containers are normalised, not thrown on', () => {
  const muts = [(s) => { s.inventory = {}; }, (s) => { s.narrative.journal = {}; }, (s) => { s.session.areas = { 'dungeon:x': null }; }, (s) => { s.consequences.dungeons = { 'dungeon:x': null }; }, (s) => { s.narrative = 7; }, (s) => { s.session = 'x'; }];
  for (const f of muts) { const s = JSON.parse(JSON.stringify(freshSave())); f(s); assert.doesNotThrow(() => migrateSave(s)); }
  const s = JSON.parse(JSON.stringify(freshSave())); s.inventory = [{ id: 'kept', slot: 'charm', name: 'Kept', power: 1 }]; assert.equal(migrateSave(s).inventory[0].id, 'kept', 'good data untouched');
});

test('F006: every Wayglass can be walked to; the Lattice Wayglass at CLOUD-WORLD-24 (48,10) gets a path', () => {
  const s = freshSave(); s.seed = 'CLOUD-WORLD-24'; const g = new Game(s, 0);
  for (const [rx, ry] of [[48, 10], [3, 4], [-6, 2], [12, -9]]) {
    g.rx = rx; g.ry = ry; g.loadArea('overworld', false);
    for (const o of g.map.objects.filter((q) => q.kind === 'checkpoint')) {
      const w = g.map.width || 32; let open = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (footprintOpen(g.map, w, Math.round(o.x) + dx, Math.round(o.y) + dy, true)) open++;
      assert.ok(open > 0, `${rx},${ry} ${o.name}`);
    }
  }
  g.rx = 48; g.ry = 10; g.loadArea('overworld', false); assert.ok(g.map.tiles.some((t) => t.wayglassPath), 'the path was cleared');
});

test('I002: Swift and Heavy change Shadow Clone recovery; I003: a stronger slow takes hold at once', () => {
  const src = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'); assert.match(src, /cds\[key\] = spell\.cooldown \* this\.glyphLoadout\("spell", spell\.id\)\.mods\.cooldown/);
  assert.match(src, /hits:\{\},\.\.\.\(!shot\.hostile&&shot\.glyphHost\?\{glyphHost:shot\.glyphHost\}:\{\}\)/, 'I001: the Bombard blast keeps its host');
  const e = { speedMultiplier: 1, glyphSlow: { factor: .6, until: 5000 } }; tickGlyphStatus([e], .016, 1000); assert.equal(e.speedMultiplier, .6);
  e.glyphSlow = { factor: .5, until: 5000 }; tickGlyphStatus([e], .016, 1100); assert.equal(e.speedMultiplier, .5, 'the stronger slow');
  tickGlyphStatus([e], .016, 6000); assert.equal(e.speedMultiplier, 1, 'restored after');
});
