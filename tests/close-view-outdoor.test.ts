// Overworld Close View fidelity pass: the open world's sky, per-tile ground and static solids (src/close-view-outdoor.ts).
// Pure builders only: the GPU side is covered by the Close View GL transaction tests, and the overworld with Close View
// off by tests/close-view-overworld-793.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { OUTDOOR, OUTDOOR_FLOATS, outdoorTerrainData, outdoorMesh, outdoorScene, outdoorSky, outdoorSkyId, outdoorOutcrop, outdoorTreeObject, outdoorSurface, outdoorSignature } from '../src/close-view-outdoor.ts';

function section(rx: number, ry: number) { const s = freshSave(); s.seed = 'CINDER-VERGE-47'; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g.map; }

test('the per-tile ground carries each tile colour and its water, outcrop, level and surface flags', () => {
  const map: any = section(0, 3), { data, w, h } = outdoorTerrainData(map);
  assert.equal(w * h, map.tiles.length); assert.equal(data.length, w * h * 4);
  for (let i = 0; i < map.tiles.length; i++) { const t = map.tiles[i], a = data[i * 4 + 3];
    assert.equal((a & 2) === 2, outdoorOutcrop(t), `outcrop ${t.kind}`);
    assert.equal((a >> 2) & 7, Math.max(0, Math.min(7, Math.round(t.elev || 0))), `level ${t.kind}`);
    assert.equal(a >> 5, outdoorSurface(t.kind)); }
  const water: any = section(-2, 0), wd = outdoorTerrainData(water).data;
  assert.ok(water.tiles.some((t: any, i: number) => /ocean|shallows/.test(t.kind) && (wd[i * 4 + 3] & 1) === 1), 'sea tiles are water');
  assert.ok(water.tiles.every((t: any, i: number) => !((wd[i * 4 + 3] & 2) === 2 && /ocean|water|shallow/i.test(t.kind))), 'water never stands up as an outcrop');
});

test('outcrops and standing trees are bounded, deterministic solids with outward normals', () => {
  for (const [rx, ry] of [[0, 0], [0, 3], [-3, -2], [10, -12]]) {
    const map: any = section(rx, ry), sky = outdoorSky(map), a = outdoorMesh(map, sky), b = outdoorMesh(map, sky);
    assert.deepEqual(Array.from(a.data), Array.from(b.data), 'the same section builds the same buffer');
    assert.equal(a.data.length, a.verts * OUTDOOR_FLOATS); assert.equal(a.verts % 3, 0);
    assert.equal(a.outcrops, Math.min(OUTDOOR.maxOutcrops, map.tiles.filter(outdoorOutcrop).length));
    assert.equal(a.trees, Math.min(OUTDOOR.maxTrees, map.objects.filter(outdoorTreeObject).length));
    assert.ok(a.verts <= a.outcrops * 72 + a.trees * 240, 'within its preallocated bound');
    for (let v = 0; v < a.verts; v++) { const o = v * OUTDOOR_FLOATS, n = Math.hypot(a.data[o + 3], a.data[o + 4], a.data[o + 5]);
      assert.ok(Math.abs(n - 1) < 1e-4, 'unit normal'); assert.ok(a.data[o + 2] >= 0, 'nothing below the ground'); assert.ok([0, 1, 2, 3, 4, 5, 6].includes(a.data[o + 9])); }
  }
});

test('the outdoor scene is cached per section and rebuilt only when a tile or a tree changes', () => {
  const map: any = section(0, 3), first = outdoorScene(map);
  assert.equal(outdoorScene(map), first, 'unchanged: the same scene, nothing rebuilt');
  const open = map.tiles.find((t: any) => !t.blocked && !/water|ocean|shallow/.test(t.kind)), before = outdoorSignature(map);
  open.blocked = true; try { assert.notEqual(outdoorSignature(map), before); const next = outdoorScene(map); assert.notEqual(next, first); assert.notEqual(next.key, first.key); assert.ok(next.mesh.outcrops === first.mesh.outcrops + (outdoorOutcrop(open) ? 1 : 0)); }
  finally { open.blocked = false; }
  const tree = map.objects.find(outdoorTreeObject); if (tree) { const was = tree.state; tree.state = 'felled'; try { assert.equal(outdoorScene(map).mesh.trees, first.mesh.trees - 1); } finally { tree.state = was; } }
});

test('each section takes a sky by its landscape; every sky is complete and in range', () => {
  assert.equal(outdoorSkyId(section(2, 0)), 'desert'); assert.equal(outdoorSkyId(section(0, 3)), 'cold'); assert.equal(outdoorSkyId(section(-2, 0)), 'sea'); assert.equal(outdoorSkyId(section(0, 0)), 'waste');
  for (const [id, k] of Object.entries(OUTDOOR.skies) as any) {
    for (const c of ['zenith', 'horizon', 'haze', 'ridge', 'sun', 'crown', 'bark']) { assert.equal(k[c].length, 3, `${id}.${c}`); assert.ok(k[c].every((v: number) => v >= 0 && v <= 255)); }
    assert.ok(k.sunEl > 0 && k.sunEl < 90 && k.clouds >= 0 && k.clouds <= 1 && k.ridgeH >= 0 && k.ridgeH < .2, id); }
  for (const id of Object.values(OUTDOOR.skyOf)) assert.ok(OUTDOOR.skies[id as string], `${id} exists`);
  const sky = outdoorSky(section(2, 0)); assert.ok(Math.abs(Math.hypot(...sky.sun) - 1) < 1e-9 && sky.sun[2] > 0, 'the sun is above the horizon');
  for (const q of ['low', 'balanced', 'full'] as const) assert.ok(OUTDOOR.view[q].far > OUTDOOR.view[q].near && OUTDOOR.view[q].far <= 40, q);
});
