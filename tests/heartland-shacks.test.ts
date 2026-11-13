// Tim, 2026-11-13: "within three squares of the Ember Refuge you find a shack you can climb onto, whichever direction you go".
// Every way out of the Refuge's section leads into one of the four sections beside it. Ground first seen from now on there
// (world.ts HEARTLAND_SHACK, pinned per section as atlas heartlandShackVersion) always holds a shack, and the heartland's low roof
// decks (roof-decks.ts ROOF_DECKS.heartland) make it one jump up. Ground already seen regenerates exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { freshSave } from '../src/types.ts';
import { Game, footprintOpen, heartlandShackStep } from '../src/game.ts';
import { generateRegion, HEARTLAND_SHACK, heartlandShackSection } from '../src/world.ts';
import { ROOF_DECKS, roofDeckIndex } from '../src/roof-decks.ts';

const W = 32, RING = [[0, -1], [1, 0], [0, 1], [-1, 0]], hash = (v: any) => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
function at(seed: string, rx: number, ry: number, atlas: any = null) {
  const s: any = freshSave(); s.seed = seed; s.maxHp = 100; if (atlas) s.atlas = atlas; Object.assign(s.session, { area: 'overworld', rx, ry, x: 16, y: 16 });
  const g: any = new Game(s, 0); g.enemies = []; g.player.hp = g.save.maxHp; return g;
}
const inp = (x: number, y: number, jump = false) => { let j = jump; return { state: { x, y }, consume: (k: string) => k === 'jump' && j ? (j = false, true) : false, held: () => false }; };

test('new journeys: every section beside the Refuge holds a shack whose roof is one jump up (40 seeds, every direction)', () => {
  let added = 0;
  for (let k = 0; k < 40; k++) for (const [rx, ry] of RING) {
    const g = at(`HEARTLAND-${k}`, rx, ry), decks = roofDeckIndex(g.map).decks;
    assert.ok(decks.length >= 1, `HEARTLAND-${k} ${rx},${ry}: a climbable roof`);
    for (const d of decks) assert.equal(d.level - d.base, ROOF_DECKS.heartland.levels, 'one level: one jump');
    assert.equal(g.save.atlas[`${rx},${ry}`].heartlandShackVersion, HEARTLAND_SHACK.version, 'pinned when first seen');
    if (g.map.objects.some((o: any) => o.heartland)) added++;
  }
  assert.ok(added > 40, `most of them needed one (${added} of 160)`);
});

test('a guaranteed shack is a real shelter: enterable by its door, its roof reached by a jump and left by a step down', () => {
  const g = at('B', -1, 0), shack = g.map.objects.find((o: any) => o.kind === 'shack');
  assert.ok(shack?.heartland && shack.schemaVersion === 2 && shack.enterable, 'the shelter pipeline made it a schema-2 shelter');
  const d = roofDeckIndex(g.map).decks[0], p = g.player, my = Math.floor((d.y0 + d.y1) / 2); p.x = d.x0 - 2; p.y = my - .25; assert.ok(footprintOpen(g.map, W, p.x, p.y));
  let t = 1000; for (let i = 0; i < 60; i++) { t += 1000 / 60; g.update(1 / 60, inp(1, 0, i === 8), t); g.enemies = []; }
  assert.equal(g.roofDeck?.id, d.id, 'on its roof'); const hp = p.hp;
  for (let i = 0; i < 240; i++) { t += 1000 / 60; g.update(1 / 60, inp(1, 0), t); g.enemies = []; }
  assert.equal(g.roofDeck, null); assert.equal(p.hp, hp, 'off it unhurt');
});

test('ground already seen never gains one: a section pinned without heartlandShackVersion regenerates byte for byte', () => {
  // Atlas record a release-927 journey wrote for these sections; fingerprints of their tiles and objects taken on origin/main 85991ba9c.
  const PIN = { terrain: 'ash', landscapeVersion: 25, hamletVersion: 2, travelVersion: 1, seaVersion: 3, dreamVersion: 4, watcherVersion: 1, guideVersion: 1, skyVersion: 3, skyPlace: 2, skySummitVersion: 1, seedFindVersion: 1, cacheVersion: 1, deepVersion: 1, buildingVersion: 3, farVersion: 6, compoundVersion: 2, labVersion: 4, castleVersion: 3, pentVersion: 9, sigilVersion: 1, canyonVersion: 1, ascendVersion: 1, coherenceVersion: 1, indoorDungeonVersion: 1 };
  for (const [rx, ry, want] of [[1, 0, '7aa622b5bd0fdd14'], [-1, 0, 'f8f51a8bcb895e49']] as const) {
    const g = at('PLAY-926', rx, ry, { [`${rx},${ry}`]: { ...PIN } });
    assert.equal(hash({ tiles: g.map.tiles, objects: g.map.objects }), want, `${rx},${ry}: unchanged`);
    assert.ok(!g.map.objects.some((o: any) => o.kind === 'shack'), 'no shack added'); assert.equal(g.save.atlas[`${rx},${ry}`].heartlandShackVersion, undefined, 'no pin added');
  }
  // generateRegion's callers that pass nothing (previews, probes) get exactly the old map
  for (const [seed, rx, ry, want] of [['PLAY-926', 1, 0, '13379ad30dc32f9f'], ['PLAY-926', -1, 0, '79d9c80481be8cf8'], ['C', 1, 0, 'b320d56417cc8e70'], ['PLAY-926', 2, 0, '9b263a6aa9d90a1b']] as const)
    assert.equal(hash(generateRegion(seed, rx, ry, 1)), want, `${seed} ${rx},${ry}`);
});

test('only the four sections beside the Refuge, and only from the version they were first seen with', () => {
  for (const [rx, ry] of RING) assert.equal(heartlandShackSection(rx, ry), true);
  for (const [rx, ry] of [[0, 0], [1, 1], [2, 0], [-3, 1]]) { assert.equal(heartlandShackSection(rx, ry), false); assert.deepEqual(heartlandShackStep(null, rx, ry), {}); }
  assert.deepEqual(heartlandShackStep(null, 1, 0), { heartlandShack: HEARTLAND_SHACK.version }, 'unseen: the current version');
  assert.deepEqual(heartlandShackStep({ landscapeVersion: 25 }, 1, 0), {}, 'seen before: none');
  assert.deepEqual(heartlandShackStep({ heartlandShackVersion: 1 }, 1, 0), { heartlandShack: 1 }, 'seen with it: kept');
  const far = at('HEARTLAND-0', 2, 0); assert.equal(far.save.atlas['2,0'].heartlandShackVersion, undefined, 'never pinned further out');
});
