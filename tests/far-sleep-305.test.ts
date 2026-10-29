// Release 305 (docs/narrative-bible.md section 7, step 4, "The Far Sleep made strange"): sections past the far band of
// Readings, first seen from now on, become dream terrain; explored ones never change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, applyDream, farSleepSection, reachableFromPlaza, trappedTiles, DREAM_VERSION, dreamPocket } from '../src/landscape.ts';
import { drawLandscapeTile } from '../src/landscape-render.ts';
import { readingAt } from '../src/lore.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

const SEED = 'FARSLEEP';
const dreamSection = (rx, ry) => { const m = generateRegion(SEED, rx, ry); applyLandscape(m, SEED, rx, ry); applyDream(m, SEED, rx, ry, 2); return m; }; // release 557: version 3 dreams only in pockets; the ground is version 2's

test('the Far Sleep begins where the Readings say it does', () => {
  for (const [rx, ry] of [[36, 0], [0, -36], [20, 16], [35, 0], [10, 10]]) assert.equal(farSleepSection(rx, ry), readingAt(rx, ry) === 'dreamlands', `${rx},${ry}`);
  const near = generateRegion(SEED, 30, 0); applyLandscape(near, SEED, 30, 0); const before = JSON.stringify(near.tiles); applyDream(near, SEED, 30, 0);
  assert.equal(JSON.stringify(near.tiles), before, 'nearer sections are untouched');
});

test('dream sections are dream terrain, fully reachable and never traps', () => {
  const kinds = new Set(); let made = 0;
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : /Gradient$/.test(String(k)) ? () => ({ addColorStop() {} }) : () => {}), set: (t, k, v) => ((t[k] = v), true) });
  for (let i = 0; i < 24; i++) {
    const rx = 36 + (i % 6), ry = -Math.floor(i / 6) * 3, m = dreamSection(rx, ry);
    if (!m.dream) { assert.ok(m.openSea || m.settlement, `${rx},${ry} skipped only for open sea or a settlement`); continue; }
    made++;
    assert.equal(m.landscape.biome, 'dream'); assert.equal(m.weather, 'petals'); assert.equal(m.dream, 2);
    for (const t of m.tiles) if (t.landscape === 'dream') kinds.add(t.kind);
    const seen = reachableFromPlaza(m);
    for (const o of m.objects.filter((q) => q.actions?.length)) { const ox = Math.round(o.x), oy = Math.round(o.y); assert.ok(seen[oy * 32 + ox] || [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => seen[(oy + dy) * 32 + ox + dx]), `${rx},${ry}: ${o.kind} reachable`); }
    assert.equal(trappedTiles(m, 32, 32, { x: 16, y: 16 }).length, 0, `${rx},${ry}: no traps`);
    for (const t of m.tiles.filter((q) => q.landscape === 'dream')) assert.ok(drawLandscapeTile(ctx, t, t.x, t.y, 32, m.tiles, 32), `${t.kind} painted`);
  }
  assert.ok(made >= 12, `most far sections dream (${made}/24)`);
  for (const k of ['sleepMeadow', 'dreamMarble', 'dreamStair', 'starVoid', 'sleeperStone']) assert.ok(kinds.has(k), `${k} appears`);
});

test('only sections first seen now dream; an explored one keeps its ground; at sea only the islands dream', () => {
  const s = freshSave(SEED); s.seed = SEED; const g = new Game(s, 0);
  let land = null, sea = null;
  for (let rx = 36; rx < 200 && !(land && sea); rx++) { if (!dreamPocket(SEED, rx, 0)) continue; /* release 557: only pockets dream */ g.rx = rx; g.ry = 0; g.loadArea('overworld'); if (g.map.settlement) continue; if (g.map.openSea) sea ||= rx; else land ||= rx; }
  assert.ok(land && sea, `found a land (${land}) and a sea (${sea}) section`);
  g.rx = sea; g.loadArea('overworld'); assert.equal(g.map.dream, DREAM_VERSION); assert.equal(g.map.weather, 'petals');
  assert.ok(g.map.tiles.some((t) => ['ocean', 'deepOcean'].includes(t.kind)), 'the sea stays sea'); assert.ok(!g.map.tiles.some((t) => t.kind === 'starVoid'), 'no void at sea');
  g.rx = land; g.loadArea('overworld'); assert.equal(g.map.landscape.biome, 'dream'); assert.equal(s.atlas[`${land},0`].dreamVersion, DREAM_VERSION);
  assert.equal(s.narrative.facts['farSleep.entered'], true);
  const before = JSON.stringify(g.map.tiles); g.loadArea('overworld'); assert.equal(JSON.stringify(g.map.tiles), before, 'reloading gives the same dream');
  const old = land + [...Array(40).keys()].find((k) => k > 0 && dreamPocket(SEED, land + k, 0)); s.atlas[`${old},0`] = { terrain: 'ash', landscapeVersion: 3 }; g.rx = old; g.loadArea('overworld');
  assert.ok(!g.map.dream && g.map.landscape?.biome !== 'dream', 'a section explored before this release does not dream');
  const fresh = freshSave(SEED); fresh.seed = SEED; const h = new Game(fresh, 0); h.rx = land; h.ry = 0; h.loadArea('overworld'); assert.match(h.message, /dreaming/, 'the first dream section says so');
});
