// Release 672 (Tim, 2026-11-01: "I haven't seen any tall trees or skyways, or chasm (Starfield) explorations... run tests to see if
// those are working and how those are showing up"). A survey of great trees, Sky Stairs (skyways) and Starfield crossings per
// distance band, before (landscape 13, Sky Stair placement 1, Starfield .12) and after (landscape 14, placement 2, .2); and the
// rules that keep ground explored before this release exactly as it was.
// SURVEY=1 widens the sample (three seeds, more sections per band) and prints the table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRegion, dungeonId } from '../src/world.ts';
import { applyLandscape, sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { skylandSection, SKY_PLACE } from '../src/skylands.ts';
import { TREES_V14 } from '../src/trees.ts';
import { hashSeed } from '../src/random.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, CHASM, chasmRoll } from '../src/game.ts';

const WIDE = !!process.env.SURVEY, SEEDS = WIDE ? ['SURVEY-A', 'SURVEY-B', 'SURVEY-C'] : ['SURVEY-A'], BANDS = [[1, 8], [8, 16], [16, 32], [32, 64]];
const PER_BAND = WIDE ? 24 : 4, DUNGEON_SAMPLE = WIDE ? 120 : 30;
const ring = (lo, hi) => { const out = []; for (let rx = -hi; rx <= hi; rx++) for (let ry = -hi; ry <= hi; ry++) { const d = Math.abs(rx) + Math.abs(ry); if (d >= lo && d < hi) out.push([rx, ry]); } return out; };
const sample = (seed, list, n, k) => [...list].sort((a, b) => hashSeed(`${seed}:${k}:${a}`) - hashSeed(`${seed}:${k}:${b}`)).slice(0, n);
const treeAt = (seed, rx, ry, version) => { const m = generateRegion(seed, rx, ry); applyLandscape(m, seed, rx, ry, { version }); return m.canopy; };
const TREE_LANDS = new Set(Object.keys(TREES_V14.regions));
const old12 = (seed, id) => hashSeed(`${seed}:chasm-crossing:v1:${id}`) % 1000 < 120;

test('survey: great trees, skyways and Starfield crossings per distance band, before and after', () => {
  const rows = [];
  for (const seed of SEEDS) for (const [lo, hi] of BANDS) {
    const all = ring(lo, hi), n = all.length;
    // Skyways: every section in the band (a pure hash).
    let sky1 = 0, sky2 = 0; for (const [rx, ry] of all) { if (skylandSection(seed, rx, ry, 1)) sky1++; if (skylandSection(seed, rx, ry, 2)) sky2++; }
    // Great trees: the share of the band whose centre lies in a tree region, times the share of a sample of those that grows one.
    const lands = all.filter(([rx, ry]) => TREE_LANDS.has(sectionRegion(seed, rx, ry, LANDSCAPE_VERSION).type)), jungle = all.filter(([rx, ry]) => sectionRegion(seed, rx, ry, 13).type === 'jungle');
    const s13 = sample(seed, jungle, PER_BAND, 'j'), s14 = sample(seed, lands, PER_BAND, 't');
    const g13 = s13.filter(([rx, ry]) => treeAt(seed, rx, ry, 13)).length, g14 = s14.filter(([rx, ry]) => treeAt(seed, rx, ry, 14)).length;
    const trees13 = s13.length ? jungle.length * g13 / s13.length : 0, trees14 = s14.length ? lands.length * g14 / s14.length : 0;
    // Starfield: crossings among the dungeons of a sample of the band's sections.
    let dungeons = 0, star12 = 0, star20 = 0;
    for (const [rx, ry] of sample(seed, all, DUNGEON_SAMPLE, 'd')) for (const o of generateRegion(seed, rx, ry).objects) if (o.kind === 'dungeon') { const id = dungeonId(seed, 1, rx, ry, o.id); dungeons++; if (old12(seed, id)) star12++; if (chasmRoll(seed, id)) star20++; }
    rows.push({ seed, band: `${lo}-${hi - 1}`, sections: n, sky1, sky2, trees13: +trees13.toFixed(1), trees14: +trees14.toFixed(1), dungeonsPerSection: +(dungeons / Math.min(n, DUNGEON_SAMPLE)).toFixed(2), starfieldBefore: dungeons ? +(star12 / dungeons).toFixed(2) : 0, starfieldAfter: dungeons ? +(star20 / dungeons).toFixed(2) : 0 });
  }
  if (WIDE) console.table(rows);
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  assert.ok(sum('sky2') >= 2 * sum('sky1'), `skyways: ${sum('sky1')} before, ${sum('sky2')} after`);
  assert.ok(rows.filter((r) => r.band === '1-7' || r.band === '8-15').some((r) => r.sky2 > 0), 'skyways nearer the start now');
  assert.equal(sum('sky1') > 0 ? rows.filter((r) => r.band === '1-7').every((r) => r.sky1 === 0) : true, true, 'never within 14 before');
  assert.ok(sum('trees14') > sum('trees13'), `great trees: ${sum('trees13').toFixed(1)} before, ${sum('trees14').toFixed(1)} after`);
  assert.ok(sum('starfieldAfter') >= sum('starfieldBefore'));
});

test('nearest skyway from the start, before and after', () => {
  for (const seed of SEEDS) {
    const near = (place) => { for (let d = 1; d < 120; d++) for (const [rx, ry] of ring(d, d + 1)) if (skylandSection(seed, rx, ry, place)) return d; return Infinity; };
    const a = near(1), b = near(2); if (WIDE) console.log(`${seed}: nearest skyway ${a} sections out before, ${b} after`);
    assert.ok(b <= a && b >= SKY_PLACE[2].minDepth, `${a} → ${b}`);
  }
});

test('placement 2 keeps every placement 1 Sky Stair; sections seen before keep placement 1; the Atlas keeps it', () => {
  const seed = 'SKYPLACE';
  for (let rx = -40; rx <= 40; rx++) for (let ry = -40; ry <= 40; ry++) if (skylandSection(seed, rx, ry, 1)) assert.ok(skylandSection(seed, rx, ry, 2), `${rx},${ry}`);
  let at = null; for (let x = 6; x < 60 && !at; x++) for (let y = 0; y < 30 && !at; y++) if (skylandSection(seed, x, y, 2) && !skylandSection(seed, x, y, 1)) at = [x, y];
  assert.ok(at, 'a section only placement 2 gives a stair');
  const fresh = freshSave(); fresh.seed = seed; const g = new Game(fresh, 0); g.rx = at[0]; g.ry = at[1]; g.loadArea('overworld');
  if (!g.map.settlement) assert.ok(g.map.objects.some((o) => o.kind === 'skyStair'), 'new ground: a stair'); assert.equal(fresh.atlas[`${at}`].skyPlace, SKY_PLACE.version);
  const old = freshSave(); old.seed = seed; old.atlas = { [`${at}`]: { terrain: 'ash', skyVersion: 3, landscapeVersion: 13 } }; const o = new Game(old, 0); o.rx = at[0]; o.ry = at[1]; o.loadArea('overworld');
  assert.ok(!o.map.objects.some((q) => q.kind === 'skyStair'), 'ground seen before this release stays as it was'); assert.equal(old.atlas[`${at}`].skyPlace, undefined);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(fresh))).atlas[`${at}`].skyPlace, SKY_PLACE.version);
});

test('version 14 grows great trees in forests and amberwood too, found wherever one fits; version 13 is unchanged', () => {
  const seed = 'WOODTREE'; let forest = null, n13 = 0, n14 = 0;
  for (let x = 6; x < 120 && !forest; x++) for (let y = 0; y < 40 && !forest; y += 2) { if (sectionRegion(seed, x, y, 14).type !== 'forest') continue; const c = treeAt(seed, x, y, 14); if (c?.region === 'forest') forest = [x, y, c]; }
  assert.ok(forest, 'a great tree in a forest'); assert.equal(forest[2].version, 14);
  assert.equal(treeAt(seed, forest[0], forest[1], 13), undefined, 'not at version 13');
  const m = generateRegion(seed, forest[0], forest[1]); applyLandscape(m, seed, forest[0], forest[1], { version: 14 }); const door = m.objects.find((o) => o.kind === 'canopyGate'); assert.ok(door);
  assert.ok(!m.objects.some((o) => o.forest && m.tiles[o.y * 32 + o.x]?.canopy), 'no forest tree stands in the wood');
  for (let x = 6; x < 80; x++) for (let y = 0; y < 30; y += 3) { if (sectionRegion(seed, x, y, 13).type !== 'jungle') continue; if (treeAt(seed, x, y, 13)) n13++; if (treeAt(seed, x, y, 14)) n14++; if (n13 + n14 > 20) break; }
  assert.ok(n14 >= n13, `jungle: ${n13} at 13, ${n14} at 14`);
  const v13 = (() => { for (let x = 6; x < 200; x++) for (let y = 0; y < 60; y += 3) { if (sectionRegion(seed, x, y, 13).type !== 'jungle') continue; const c = treeAt(seed, x, y, 13); if (c) return c; } })();
  assert.ok(v13 && v13.version === 13 && !v13.region && v13.form !== 'compact', 'a version 13 tree as before');
});

test('Starfield crossings: a fifth of new crossings, rolled once at first entry; every crossing that was one still is', () => {
  assert.equal(CHASM.chance, .2); const seed = 'STARS';
  let n = 0; for (let x = 0; x < 2000; x++) { const id = `dungeon:${seed}:g1:${x}:3:room`; if (old12(seed, id)) assert.ok(chasmRoll(seed, id)); if (chasmRoll(seed, id)) n++; }
  assert.ok(Math.abs(n / 2000 - .2) < .03, `${n}`);
});
