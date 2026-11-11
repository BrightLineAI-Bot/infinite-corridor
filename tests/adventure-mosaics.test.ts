// Adventure Pentagons (version 11): the Watcher's sigil worked into the floors as a large mosaic (Tim, 2026-11-11: "We can
// incorporate some of the Watcher's sigils into the Pentagon mosaic floors"). The sigil of the tombs and shrines (watcher.ts)
// with its tessera border, in grand halls, keeps, the Waystone hall and a share of plazas, courts and vistas, tinted from the
// ward's theme light. Presentation only: the chamber's collision, objects and creatures are exactly as without it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pentagonPlan, generatePentagonChamber } from '../src/pentagon.ts';
import { SIGIL_CELLS } from '../src/watcher.ts';
import { closeViewMask } from '../src/close-view-gl.ts';
import { ADVENTURE_PENTAGON as AP, ADVENTURE_THEMES } from '../src/adventures.ts';

const V = AP.version, chambers = (n, pre) => { const out = []; for (let i = 0; i < n; i++) { const seed = `${pre}${i}`, P = pentagonPlan(seed, i * 8, -i * 8, V); for (const q of P.nodes) out.push({ seed, P, q, id: `${P.base}:f${q.n + 1}` }); } return out; };
const strip = (m) => JSON.stringify({ tiles: m.tiles.map(({ sigil, sigilTint, ...t }) => t), objects: m.objects, enemySpawns: m.enemySpawns, entry: m.entry });

test('mosaics: in most keeps and grand halls, every Waystone hall that has room, a share of plazas; whole sigils in the ward\'s light', () => {
  const by = {}, eye = SIGIL_CELLS.length;
  for (const { seed, q, id } of chambers(8, 'MO')) { const m = generatePentagonChamber(seed, id, 2), k = q.hall ? 'hall' : q.area; (by[k] ||= [0, 0])[1]++;
    const tinted = m.tiles.filter((t) => t.sigilTint); if (!tinted.length) { assert.ok(!m.tiles.some((t) => t.sigil) || !q.hall, `${id}: a hall's own sigil is tinted`); continue; } by[k][0]++;
    const T = ADVENTURE_THEMES[q.theme || 'tomb']; assert.ok(tinted.every((t) => t.sigilTint === T.palette.light && !t.blocked), `${id}: in its light, on open floor`);
    assert.ok(tinted.filter((t) => !['tessera', 'border'].includes(t.sigil)).length >= eye, `${id}: the whole sigil`);
    assert.ok(m.sigils.some((s) => s.kind === 'inlay'), `${id}: recorded`); }
  const share = (k) => by[k] ? by[k][0] / by[k][1] : 0;
  assert.ok(share('keep') > .8 && share('hall') > .5 && share('plaza') > .25 && share('waystone') > .5, JSON.stringify(by));
  for (const k of ['street', 'gallery', 'undercroft', 'side']) assert.equal(by[k]?.[0] || 0, 0, `${k}: none`);
});

test('mosaics are presentation only: collision, objects, creatures and entry are as without them', () => {
  const saved = { ...AP.mosaics }; let checked = 0;
  try { for (const { seed, q, id } of chambers(3, 'MP')) { const withM = generatePentagonChamber(seed, id, 2); if (!withM.tiles.some((t) => t.sigilTint)) continue;
      for (const k of Object.keys(AP.mosaics)) if (k !== 'margin') AP.mosaics[k] = 0; const without = generatePentagonChamber(seed, id, 2); Object.assign(AP.mosaics, saved);
      assert.equal(strip(withM), strip(without), id); checked++; } }
  finally { Object.assign(AP.mosaics, saved); }
  assert.ok(checked > 30, `${checked} chambers compared`);
});

test('Close View reads the mosaic from its floor data in v11 chambers (inlay codes), and generation is deterministic', () => {
  const { seed, id } = chambers(4, 'MC').find(({ seed, id }) => generatePentagonChamber(seed, id, 2).tiles.some((t) => t.sigilTint && !t.blocked) && !generatePentagonChamber(seed, id, 2).hall);
  const m = generatePentagonChamber(seed, id, 2), mask = closeViewMask(m), W = m.width;
  const k = m.tiles.findIndex((t) => t.sigil === 'pupil'); assert.ok(k >= 0); assert.equal(mask.data[k * 4 + 3] >> 1, 4, 'the eye lit');
  const ring = m.tiles.findIndex((t) => t.sigil === 'ring'); assert.equal(mask.data[ring * 4 + 3] >> 1, 3, 'the sigil inlaid');
  assert.equal(JSON.stringify(generatePentagonChamber(seed, id, 2).tiles), JSON.stringify(m.tiles)); void W;
});
