// Close View play-through of 926, bug 14, and Tim's decision (2026-11-13: "within three squares of the Ember Refuge you find a
// shack you can climb onto, whichever direction you go"). The four sections beside the Refuge have no landscape (flat, level 0,
// no falls), so their houses had no roof deck. They now have low ones (roof-decks.ts ROOF_DECKS.heartland: one level), reached by
// an ordinary jump from the ground beside the house and left by a one-level step down. The decks are derived beside the map: the
// generated map (tiles and objects) and the save are exactly what they were; only the deck derivation turns on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, footprintOpen } from '../src/game.ts';
import { ROOF_DECKS, heartlandDeckSection, roofDeckIndex, roofDecksApply } from '../src/roof-decks.ts';

const W = 32, hash = (v: any) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
// The atlas record these sections were first seen with (seed PLAY-926): a pinned section always regenerates exactly.
const PIN = { terrain: 'ash', landscapeVersion: 25, hamletVersion: 2, travelVersion: 1, seaVersion: 3, dreamVersion: 4, watcherVersion: 1, guideVersion: 1, skyVersion: 3, skyPlace: 2, skySummitVersion: 1, seedFindVersion: 1, cacheVersion: 1, deepVersion: 1, buildingVersion: 3, farVersion: 6, compoundVersion: 2, labVersion: 4, castleVersion: 3, pentVersion: 9, sigilVersion: 1, canyonVersion: 1, ascendVersion: 1, coherenceVersion: 1, indoorDungeonVersion: 1 };
// Fingerprints of the generated tiles and objects, taken on origin/main 85991ba9c (release 927) before heartland decks existed.
const BEFORE: Record<string, string> = { '0,1': '05c629fd13092f8f', '0,-1': 'ad320e1e9a49a894' }, ATLAS_BEFORE: Record<string, string> = { '0,1': '87dc3929b7c23436', '0,-1': '29ac51e39882259c' };
function at(rx: number, ry: number, seed = 'PLAY-926', pin = true) {
  const s: any = freshSave(); s.seed = seed; s.maxHp = 100; if (pin) s.atlas = { [`${rx},${ry}`]: { ...PIN } }; Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.player.hp = g.save.maxHp; return g;
}
const inp = (x: number, y: number, jump = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };
const run = (g: any, frames: number, t: number, f: (i: number) => any) => { for (let i = 0; i < frames; i++) { t += 1000 / 60; g.update(1 / 60, f(i), t); g.enemies = []; } return t; };

test('heartland decks: the shacks beside Ember Refuge have a low roof deck; tiles, objects, atlas and save are unchanged', () => {
  for (const [rx, ry] of [[0, 1], [0, -1]]) {
    const g = at(rx, ry), m = g.map, key = `${rx},${ry}`;
    assert.equal(!!m.landscape, false, 'heartland: no landscape'); assert.ok(m.tiles.every((t: any) => !(t.elev > 0)), 'flat');
    assert.equal(hash({ tiles: m.tiles, objects: m.objects }), BEFORE[key], `${key}: the generated map is byte for byte what it was`);
    assert.equal(hash(g.save.atlas[key]), ATLAS_BEFORE[key], `${key}: the atlas record is what it was (nothing new is saved)`);
    const save0 = JSON.stringify(g.save), map0 = JSON.stringify({ tiles: m.tiles, objects: m.objects });
    assert.equal(roofDecksApply(m), true); assert.equal(g.decksApply(), true);
    const decks = roofDeckIndex(m).decks; assert.ok(decks.length >= 1, `${key}: the shack has a deck`);
    for (const d of decks) { assert.equal(d.base, 0); assert.equal(d.level, ROOF_DECKS.heartland.levels, 'one level up: one jump'); }
    assert.equal(JSON.stringify({ tiles: m.tiles, objects: m.objects }), map0, 'deriving the decks never writes the map');
    assert.equal(JSON.stringify(g.save), save0, 'nor the save');
  }
});

test('heartland decks: a jump from the ground beside the shack lands on its roof; stepping off is a step down, never a fall', () => {
  const g = at(0, 1), d = roofDeckIndex(g.map).decks[0], my = Math.floor((d.y0 + d.y1) / 2), p = g.player;
  p.x = d.x0 - 2; p.y = my - .25; assert.ok(footprintOpen(g.map, W, p.x, p.y));
  let t = run(g, 60, 1000, (i) => inp(1, 0, i === 8)); assert.equal(g.roofDeck?.id, d.id, 'on the roof'); assert.equal(g.playerLevel(), 1);
  // exact resume on the roof
  g.setPaused(true, t); const back: any = new Game(migrateSave(structuredClone(g.exportSnapshot(t))), t + 5000);
  assert.equal(back.roofDeck?.id, d.id, 'reloaded on the roof'); assert.equal(back.player.x, p.x); assert.equal(back.player.y, p.y);
  g.setPaused(false, t);
  const hp = p.hp; t = run(g, 240, t, () => inp(1, 0));
  assert.equal(g.roofDeck, null, 'walked off'); assert.equal(g.fall, null, 'no fall on heartland ground'); assert.equal(p.hp, hp, 'unhurt'); assert.equal(g.playerLevel(), 0);
});

test('heartland decks only beside the Refuge: not the Refuge itself, not further out, not on landscape rules', () => {
  assert.equal(heartlandDeckSection(0, 0), false); for (const [x, y] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) assert.equal(heartlandDeckSection(x, y), true);
  for (const [x, y] of [[1, 1], [2, 0], [0, -2], [5, 5]]) assert.equal(heartlandDeckSection(x, y), false);
  const refuge = at(0, 0, 'PLAY-926', false); assert.equal(roofDecksApply(refuge.map), false, 'the Refuge keeps no decks');
  const wild = at(-1, -1, 'PLAY-926', false); assert.equal(!!wild.map.landscape, true);
  for (const d of roofDeckIndex(wild.map).decks) assert.ok(d.level - d.base >= ROOF_DECKS.minLevels, 'landscape decks keep their height');
});
