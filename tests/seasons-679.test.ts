// Release 679 (Tim, 2026-11-01): seasons in the forest and great-tree woods. A forest or jungle region shares one season (spring,
// summer, fall, winter), which turns after 30–40 sections are explored outside that region; the trees wear it (blossom, lush,
// red and bare, snow-capped) and a little seasonal weather falls. Nothing generated changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { sectionRegion, LANDSCAPE_VERSION } from '../src/landscape.ts';
import { SEASONS, seasonOf, trackSeason, noteSeasonDiscovery, seasonTurnsIn, treeSeason } from '../src/seasons.ts';
import { render } from '../src/renderer.ts';

const SEED = 'SEASON679';
let wood = null; const findWood = (type = 'forest') => { if (wood) return wood; for (let r = 8; r < 80 && !wood; r++) for (let a = 0; a < 24 && !wood; a++) { const x = Math.round(Math.cos(a / 24 * 6.283) * r), y = Math.round(Math.sin(a / 24 * 6.283) * r); if (sectionRegion(SEED, x, y, LANDSCAPE_VERSION).type === type) wood = [x, y]; } return wood; };

test('one season per region, kept per journey; junk dropped', () => {
  assert.deepEqual(freshSave().seasons, {});
  const s = freshSave(); s.seasons = { a: { t: 2, n: 5 }, b: { t: -1, n: 'x' } }; assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).seasons, { a: { t: 2, n: 5 }, b: { t: 0, n: 0 } });
  const r = { id: 'r1', type: 'forest' }, s2 = freshSave(); s2.seed = SEED; assert.ok(SEASONS.order.includes(seasonOf(s2, r))); assert.equal(seasonOf(s2, { id: 'x', type: 'desert' }), null);
});

test('the season turns after 30–40 sections explored outside the region, never for ones inside it', () => {
  const s = freshSave(); s.seed = SEED; const r = { id: 'woods', type: 'forest' }, first = trackSeason(s, r), need = seasonTurnsIn(SEED, 'woods', 0);
  assert.ok(need >= 30 && need <= 40, `${need}`);
  for (let i = 0; i < 100; i++) noteSeasonDiscovery(s, 'woods'); assert.equal(seasonOf(s, r), first, 'inside: no turn');
  for (let i = 0; i < need - 1; i++) noteSeasonDiscovery(s, 'elsewhere'); assert.equal(seasonOf(s, r), first);
  noteSeasonDiscovery(s, 'elsewhere'); const next = SEASONS.order[(SEASONS.order.indexOf(first) + 1) % 4]; assert.equal(seasonOf(s, r), next);
});

test('in the game: a forest section knows its season, exploring elsewhere counts, and the trees draw in every season', () => {
  const [x, y] = findWood(), s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); assert.ok(g.season, 'a season here');
  const id = sectionRegion(SEED, x, y, LANDSCAPE_VERSION).id; assert.ok(s.seasons[id], 'tracked');
  g.rx = x + 40; g.ry = y + 40; g.loadArea('overworld'); assert.ok(s.seasons[id].n >= (sectionRegion(SEED, x + 40, y + 40, LANDSCAPE_VERSION).id === id ? 0 : 1));
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: [] }) }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  g.rx = x; g.ry = y; g.loadArea('overworld');
  for (const season of SEASONS.order) { g.season = season; assert.doesNotThrow(() => render(ctx, g, 360, 640, 1000), season); }
  let bare = 0, bloom = 0; for (let i = 0; i < 200; i++) { if (treeSeason('fall', i, 3).bare) bare++; if (treeSeason('spring', i, 3).bloom) bloom++; }
  assert.ok(bare > 20 && bare < 120 && bloom > 40, `${bare} bare in fall, ${bloom} in bloom in spring`);
});
