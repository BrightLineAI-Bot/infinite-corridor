// Release 591 (Tim, 2026-10-30): "I like the platforms that you built. You can make those platforms a part of the world...
// sections of the world that have those tall platforms... so that we can do it like dungeons on top of them". Pillar lands:
// red sandstone and hoodoos, with mesas of the skyway's stone climbed by stairs of pillars, a dungeon on top where there is one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { generateRegion } from '../src/world.ts';
import { applyLandscape, sectionRegion, regionName, REGION_NAMES, LANDSCAPE_VERSION, PILLARS, canStep, fallDamage } from '../src/landscape.ts';

const SEED = 'R';
const sections = (n, ok = () => true) => { const out = []; for (let x = 14; x < 160 && out.length < n; x++) for (let y = 14; y < 160 && out.length < n; y += 3) { const r = sectionRegion(SEED, x, y, 8); if (r.type === 'pillars' && r.hold >= 1 && ok(x, y)) out.push([x, y]); } return out; };
const make = (x, y, version = 8) => { const m = generateRegion(SEED, x, y); applyLandscape(m, SEED, x, y, { version }); return m; };
const at = (m, x, y) => m.tiles[y * 32 + x];

test('version 8 turns some still-wild regions into pillar lands; every other region keeps its version 7 type', () => {
  assert.equal(LANDSCAPE_VERSION, 8); const types = new Set();
  for (let x = 14; x < 120; x += 2) for (let y = 14; y < 120; y += 2) {
    const a = sectionRegion(SEED, x, y, 7), b = sectionRegion(SEED, x, y, 8); types.add(b.type);
    assert.equal(a.id, b.id); if (a.type !== 'wild') assert.equal(b.type, a.type); else assert.ok(['wild', 'pillars'].includes(b.type));
  }
  assert.ok(types.has('pillars') && types.has('volcanic') && types.has('wild'));
  const r = sectionRegion(SEED, ...sections(1)[0], 8); assert.ok(REGION_NAMES.nouns.pillars.some((n) => regionName(SEED, r).endsWith(` ${n}`)));
});

test('a mesa stands on stone, with a stair of pillars each one level lower and a gap apart; dungeons stand on top', () => {
  let dungeons = 0, held = 0;
  for (const [x, y] of sections(40)) {
    const m = make(x, y); assert.ok(m.tiles.some((t) => t.kind === 'pillarGround')); if (m.landscape.biome === 'pillars') assert.equal(m.landscape.name, 'Pillar Lands');
    assert.ok(m.tiles.filter((t) => t.kind === 'hoodoo').every((t) => t.blocked)); const d = m.objects.find((o) => o.kind === 'dungeon'); if (d) dungeons++;
    for (const q of m.mesas || []) {
      for (let j = 0; j < q.size; j++) for (let i = 0; i < q.size; i++) { const t = at(m, q.x0 + i, q.y0 + j); assert.equal(t.elev, PILLARS.height); assert.ok(t.skyPlatform && !t.blocked && !t.slope); assert.ok(!(q.x0 + i >= 12 && q.x0 + i <= 20 && q.y0 + j >= 12 && q.y0 + j <= 20), 'off the plaza'); }
      const levels = new Set(m.tiles.filter((t) => t.mesa).map((t) => t.elev)); for (let lv = 1; lv <= PILLARS.height; lv++) assert.ok(levels.has(lv), `a pillar at level ${lv}`);
      if (q.holds === 'dungeon') { held++; assert.equal(at(m, Math.round(d.x), Math.round(d.y)).elev, PILLARS.height, 'the dungeon is on top'); }
    }
    assert.ok(!(m.enemySpawns || []).some((q) => at(m, Math.round(q.x), Math.round(q.y))?.mesa), 'nothing spawns up there');
    assert.deepEqual(make(x, y), m, 'deterministic');
  }
  assert.ok(sections(40).some(([x, y]) => make(x, y).landscape.name === 'Pillar Lands')); assert.ok(dungeons >= 5 && held >= dungeons * .6, `${held} of ${dungeons} dungeons on a mesa`);
  const [x, y] = sections(1)[0], old = make(x, y, 7); assert.ok(!old.tiles.some((t) => t.kind === 'pillarGround' || t.mesa), 'ground pinned to version 7 has none');
});

test('every step of the stair is one jump up; creatures cannot climb; the drop from the top is not fatal', () => {
  const [x, y] = sections(20).find(([a, b]) => make(a, b).mesas), m = make(x, y), raised = m.tiles.filter((t) => t.mesa);
  for (const t of raised) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const n = at(m, t.x + dx, t.y + dy); if (!n || n.mesa) continue;
    assert.equal(canStep({ isPlayer: false }, m, 32, n.x, n.y, t.x, t.y), (n.elev || 0) >= t.elev, 'a creature cannot climb on');
  }
  assert.ok(raised.some((t) => t.elev === 1) && raised.every((t) => t.elev <= PILLARS.height)); assert.ok(Number.isFinite(fallDamage(PILLARS.height, 100)));
  const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld');
  assert.ok(g.map.mesas?.length, 'the game loads the same mesas'); assert.equal(s.atlas[`${x},${y}`].landscapeVersion, 8);
  const banner = (g.questNotices || []).find((q) => q.kind === 'discovery'); if (banner) assert.equal(banner.detail, 'Pillar lands');
});
