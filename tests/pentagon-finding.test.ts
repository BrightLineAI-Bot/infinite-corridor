// Pentagon finding (Tim, 2026-11-05): "The sigils on the ground — we need to make sure that they actually point to a Pentagon...
// They can be really far away"; "the map is divided into regions around each Pentagon... whenever you're within that region, the
// Pentagon sigils start pointing in that direction"; a Pentagon hunt "lines out 1 to 2 Pentagons at a time in different
// locations on the map". pentagon.ts PENTAGON_FINDING; game.ts pentagonSigil / readPentagonSigil / offerPentagonHunt.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { render } from '../src/renderer.ts';
import { regionSettled } from '../src/world.ts';
import { hamletSection } from '../src/settlements.ts';
import { openSeaSection } from '../src/landscape.ts';
import { PENTAGON, PENTAGON_FINDING, pentagonAt, pentagonCandidate, pentagonCentre, pentagonCatchment, pentagonSigilRoll, pentagonHeading, pentagonHuntsOpen, ensurePentagonFinding } from '../src/pentagon.ts';

const F = PENTAGON_FINDING;
const game = (seed, save = null) => { const s = save || freshSave(); s.seed = seed; return new Game(s, 0); };
const visit = (g, rx, ry) => { g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; };
const realAt = (seed, cx, cy) => { const g = visit(game(seed), cx, cy); return g.map.pentagon?.cx === cx && g.map.pentagon?.cy === cy; }; // a fresh journey, standing on its centre
const sigilsNear = (g, rx, ry, want, span = 40) => { const out = []; for (let k = 0; k < span * span && out.length < want; k++) { const x = rx + (k % span), y = ry + Math.floor(k / span);
  if (!pentagonSigilRoll(g.save.seed, x, y)) continue; visit(g, x, y); const o = g.map.objects.find((q) => q.kind === 'pentWaysign'); if (o) out.push({ x, y, o }); } return out; };
const bearingOk = (o, rx, ry) => { const want = Math.atan2((o.targetRy - ry) * 32 + 16 - (o.y + .5), (o.targetRx - rx) * 32 + 16 - (o.x + .5)), got = Math.atan2(o.dirY, o.dirX); return Math.abs(want - got) < 1e-9; };

test('the cheap test never refuses a real Pentagon, and the catchment is the nearest real one within reach (brute force)', () => {
  for (const seed of ['TIM1', 'PF2']) { const g = game(seed), cheap = g.pentagonCheap();
    for (let cx = -96; cx <= 96; cx += PENTAGON.every) for (let cy = -96; cy <= 96; cy += PENTAGON.every) if (g.pentagonReal(cx, cy)) assert.ok(pentagonCandidate(seed, cx, cy, cheap), `${seed} ${cx},${cy}`);
    for (let i = 0; i < 40; i++) { const rx = -60 + (i * 37) % 120, ry = -60 + (i * 53) % 120, got = g.pentagonCatchmentAt(rx, ry); let best = null;
      for (let cx = Math.floor((rx - F.reach) / 8) * 8; cx <= rx + F.reach; cx += 8) for (let cy = Math.floor((ry - F.reach) / 8) * 8; cy <= ry + F.reach; cy += 8) { const d = Math.hypot(cx - rx, cy - ry); if (d > F.reach || !g.pentagonHere(cx, cy)) continue;
        if (!best || d < best.d || (d === best.d && (cy < best.cy || (cy === best.cy && cx < best.cx)))) best = { cx, cy, d }; }
      assert.deepEqual(got && { cx: got.cx, cy: got.cy }, best && { cx: best.cx, cy: best.cy }, `${seed} ${rx},${ry}`); } }
});

test('every sigil points at a real Pentagon (the centre loads it), along the true bearing, with words for the way and the distance', () => {
  let n = 0; for (const [seed, rx, ry] of [['TIM1', 10, -30], ['PF2', -40, 20]]) { const g = game(seed);
    for (const { x, y } of sigilsNear(g, rx, ry, 4)) { n++; visit(g, x, y); const o = g.map.objects.find((q) => q.kind === 'pentWaysign'); g.player.x = o.x; g.player.y = o.y;
      assert.ok(realAt(seed, o.targetRx, o.targetRy), `${seed}: the sigil at ${x},${y} points at ${o.targetRx},${o.targetRy}`);
      assert.ok(bearingOk(o, x, y)); assert.ok(Math.hypot(o.targetRx - x, o.targetRy - y) <= F.reach); assert.deepEqual(o.actions, ['read']);
      assert.ok(!g.map.tiles[o.y * 32 + o.x].blocked);
      const r = g.interact('read', o.id); assert.ok(r.ok); assert.match(r.message, new RegExp(`points ${pentagonHeading(o.targetRx - x, o.targetRy - y)}: a Pentagon stands that way, .+ \\(about \\d+ sections?\\)`));
      assert.deepEqual([g.save.pentagonFinding.follow.cx, g.save.pentagonFinding.follow.cy], [o.targetRx, o.targetRy]);
      assert.equal(g.compassRequest, undefined, 'the compass is left alone (Tim, 2026-11-05)'); assert.doesNotMatch(r.message, /compass/i); } }
  assert.ok(n >= 6, `${n} sigils`);
});

test('no sigil in a Pentagon\'s own nine sections or outside every catchment; sigils on about a fifth of a catchment', () => {
  const g = game('TIM1'); let roll = 0, sections = 0;
  for (let x = -60; x < 60; x++) for (let y = -60; y < 60; y++) { const c = g.pentagonCatchmentAt(x, y); if (!c) continue; sections++; if (pentagonSigilRoll('TIM1', x, y)) roll++; }
  assert.ok(Math.abs(roll / sections - F.sigil.chance) < .03, `${roll}/${sections}`);
  let checked = 0; for (let x = -60; x < 60 && checked < 6; x += 3) for (let y = -60; y < 60 && checked < 6; y += 3) { const pc = pentagonCentre(x, y); if (!pc || !g.pentagonReal(pc.cx, pc.cy) || !pentagonSigilRoll('TIM1', x, y)) continue; visit(g, x, y); checked++; assert.ok(!g.map.objects.some((o) => o.kind === 'pentWaysign'), `${x},${y}`); }
  let none = 0; for (let x = -200; x < 200 && none < 3; x += 7) for (let y = -200; y < 200 && none < 3; y += 11) { if (!pentagonSigilRoll('TIM1', x, y) || g.pentagonCatchmentAt(x, y)) continue; visit(g, x, y); none++; assert.ok(!g.map.objects.some((o) => o.kind === 'pentWaysign')); }
});

test('consistency: walking the way any sigil points, every sigil met leads to the same Pentagon until you reach it', () => {
  let walks = 0, met = 0; for (const seed of ['TIM1', 'PF2', 'PF3']) { const g = game(seed);
    for (let i = 0; i < 60; i++) { const sx = -150 + (i * 41) % 300, sy = -150 + (i * 67) % 300, c = g.pentagonCatchmentAt(sx, sy); if (!c) continue; walks++;
      let x = sx, y = sy; for (let k = 0; k < 120 && !(Math.abs(x - c.cx) <= 1 && Math.abs(y - c.cy) <= 1); k++) { // the arrow's way, a section at a time
        const a = Math.atan2(c.cy - y, c.cx - x); if (Math.abs(Math.cos(a)) > .38) x += Math.sign(Math.cos(a)); if (Math.abs(Math.sin(a)) > .38) y += Math.sign(Math.sin(a));
        const q = g.pentagonCatchmentAt(x, y); assert.deepEqual(q && [q.cx, q.cy], [c.cx, c.cy], `${seed}: from ${sx},${sy} at ${x},${y}`); if (pentagonSigilRoll(seed, x, y)) met++; } } }
  assert.ok(walks > 60 && met > walks, `${walks} walks, ${met} sigils met`);
});

test('far out (past 1000) the sigils and the hunts still lead to real Pentagons', () => {
  for (const [seed, rx, ry] of [['TIM1', 1040, -1210], ['PF2', -1500, 820]]) { const g = game(seed);
    const s = sigilsNear(g, rx, ry, 1, 30); assert.ok(s.length, `${seed} a sigil near ${rx},${ry}`); assert.ok(realAt(seed, s[0].o.targetRx, s[0].o.targetRy));
    g.rx = rx; g.ry = ry; for (let i = 0; i < 8 && pentagonHuntsOpen(g.save).length < 2; i++) g.offerPentagonHunt();
    const open = pentagonHuntsOpen(g.save); assert.equal(open.length, 2); for (const h of open) { assert.ok(realAt(seed, h.cx, h.cy)); assert.ok(Math.hypot(h.cx - rx, h.cy - ry) >= F.hunts.near - F.reach - 2); } }
});

test('cost is bounded: centres looked at, full tests asked, the memo; a remembered lookup is cheap', () => {
  const g = game('TIM1'), most = (2 * Math.floor(F.reach / PENTAGON.every) + 1) ** 2; let full = 0, n = 0;
  for (let i = 0; i < 60; i++) { const rx = 300 + (i * 29) % 200, ry = -300 + (i * 31) % 200; let asked = 0;
    const r = pentagonCatchment('TIM1', rx, ry, { real: (cx, cy) => { asked++; return g.pentagonReal(cx, cy); }, cheap: g.pentagonCheap() }); assert.ok(asked <= most); if (r) assert.equal(r.checked, asked); full += asked; n++; }
  assert.ok(full / n < 4, `${full / n} full tests a lookup`);
  assert.ok(g._pentReal.size <= F.memo);
  let again = 0; const here = g.pentagonHere.bind(g); g.pentagonHere = (cx, cy) => { again++; return here(cx, cy); };
  for (let i = 0; i < 60; i++) g.pentagonCatchmentAt(300 + (i * 29) % 200, -300 + (i * 31) % 200); assert.equal(again, 0, 'the same lookups again ask no full test');
  g._pentReal = new Map(Array.from({ length: F.memo }, (_, i) => [`m${i}`, false])); g.pentagonReal(8, 8); assert.ok(g._pentReal.size <= F.memo);
});

test('Pentagon hunts: two at a time, real, apart in bearing, far out; a found one, a completed one, and the next laid out', () => {
  const s = freshSave(); s.seed = 'TIM1'; const g = new Game(s, 0); g.rx = 20; g.ry = 20;
  for (let i = 0; i < 6 && pentagonHuntsOpen(s).length < 2; i++) g.offerPentagonHunt();
  const [a, b] = pentagonHuntsOpen(s); assert.ok(a && b); assert.notDeepEqual([a.cx, a.cy], [b.cx, b.cy]);
  const ba = Math.atan2(a.cy - 20, a.cx - 20), bb = Math.atan2(b.cy - 20, b.cx - 20), apart = Math.abs(((ba - bb + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI); assert.ok(apart >= F.hunts.spread / 2, `${apart}`);
  assert.equal(g.offerPentagonHunt(), null, 'no third while two are open');
  for (const h of [a, b]) assert.ok(realAt('TIM1', h.cx, h.cy));
  assert.ok(!(g.questNotices || []).length, 'a hunt opens with no banner (Tim, 2026-11-05)');
  visit(g, a.cx + 1, a.cy); assert.equal(a.status, 'found'); assert.ok(g.questNotices.some((q) => q.title === F.messages.huntFound));
  s.consequences.dungeons[`${g.pentagonBase(a.cx, a.cy)}:f1`] = { pentArenaWon: true }; visit(g, a.cx + 3, a.cy + 3);
  assert.equal(s.pentagonFinding.hunts.find((h) => h.id === a.id).status, 'done'); assert.ok(g.questNotices.some((q) => q.title === F.messages.huntDone));
  for (let i = 0; i < 6 && pentagonHuntsOpen(s).length < 2; i++) g.offerPentagonHunt(); const next = pentagonHuntsOpen(s).find((h) => h.id !== b.id);
  assert.ok(next && !(next.cx === a.cx && next.cy === a.cy), 'the next hunt is another Pentagon');
  assert.ok(!(g.pentagonCatchmentAt(a.cx + 3, a.cy + 3)?.cx === a.cx && g.pentagonCatchmentAt(a.cx + 3, a.cy + 3)?.cy === a.cy), 'a completed Pentagon holds no catchment');
});

test('hunts are looked for once a section has settled, never on every frame', () => {
  const s = freshSave(); s.seed = 'TIM1'; const g = visit(new Game(s, 0), 30, 30); let calls = 0; const off = g.offerPentagonHunt.bind(g); g.offerPentagonHunt = () => { calls++; return off(); };
  const input = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
  for (let i = 0; i < 400; i++) try { g.update(1 / 60, input, 1000 + i * 16); } catch { /* the rest of the frame is not under test */ }
  assert.ok(calls <= 2, `${calls} searches in 400 frames`);
});

test('the save: additive at schema 14, normalised by freshSave and migrateSave, round trip with unknown fields kept', () => {
  const f = freshSave(); assert.deepEqual(f.pentagonFinding, { version: 1, follow: null, hunts: [], n: 0, read: 0 }); assert.equal(f.version, 14);
  const raw = JSON.parse(JSON.stringify({ ...f, pentagonFinding: { follow: { cx: 16, cy: -24, rx: 3, ry: 4 }, hunts: [{ id: 'pentagon-hunt-1', n: 1, cx: 40, cy: 8, status: 'found' }, { cx: 'x' }, { id: 'h2', cx: 8, cy: 8, status: '??' }], n: 2, read: 5, later: { kept: true } } }));
  const m = migrateSave(raw); assert.deepEqual(m.pentagonFinding.follow, { cx: 16, cy: -24, rx: 3, ry: 4 }); assert.equal(m.pentagonFinding.hunts.length, 2); assert.equal(m.pentagonFinding.hunts[1].status, 'open');
  assert.equal(m.pentagonFinding.n, 2); assert.equal(m.pentagonFinding.read, 5); assert.deepEqual(m.pentagonFinding.later, { kept: true });
  const again = migrateSave(JSON.parse(JSON.stringify(m))); assert.deepEqual(again.pentagonFinding, m.pentagonFinding);
  const old = JSON.parse(JSON.stringify(f)); delete old.pentagonFinding; assert.deepEqual(migrateSave(old).pentagonFinding, f.pentagonFinding);
  const done = { pentagonFinding: { hunts: Array.from({ length: 20 }, (_, i) => ({ id: `h${i}`, cx: 8 * i, cy: 8, status: 'done' })) } }; ensurePentagonFinding(done); assert.equal(done.pentagonFinding.hunts.length, F.hunts.keep);
});

test('explored ground keeps its tiles: a sigil is an object only, and Pentagons stand where they stood', () => {
  const g = game('TIM1'), plain = game('TIM1'); plain.pentagonSigil = () => null; let compared = 0;
  for (const { x, y } of sigilsNear(g, 10, -30, 3)) { visit(g, x, y); visit(plain, x, y); assert.ok(JSON.stringify(g.map.tiles) === JSON.stringify(plain.map.tiles), `${x},${y}: the same tiles`); compared++;
    assert.deepEqual(g.map.objects.filter((o) => o.kind !== 'pentWaysign').map((o) => o.id), plain.map.objects.map((o) => o.id)); }
  assert.ok(compared >= 3);
  // ground first seen before the sigils (an atlas entry with no sigilVersion) shows none, and keeps the release 729 gold cue exactly
  for (const { x, y } of sigilsNear(game('TIM1'), 10, -30, 3)) { const pin = { [`${x},${y}`]: { landscapeVersion: 21, pentVersion: 7 } };
    const a = freshSave(); a.seed = 'TIM1'; a.atlas = structuredClone(pin); const ga = visit(new Game(a, 0), x, y); assert.ok(!ga.map.objects.some((o) => o.kind === 'pentWaysign'), `${x},${y}: none on old ground`);
    assert.equal(a.atlas[`${x},${y}`].sigilVersion, undefined, 'and no pin is added to it'); }
  // where Pentagons stand is untouched (the release 772 rule: its hash, its ring, no town, hamlet or open sea, no far domain's centre
  // on ground all new), centre by centre, and the memo answers as the full test does
  const s = freshSave(); s.seed = 'TIM1'; const h = new Game(s, 0);
  for (let cx = -96; cx <= 96; cx += 8) for (let cy = -96; cy <= 96; cy += 8) { const want = pentagonAt('TIM1', cx, cy, (rx, ry) => !regionSettled(rx, ry) && !hamletSection('TIM1', rx, ry) && !openSeaSection('TIM1', rx, ry) && !h.domainCentreAt(rx, ry));
    assert.equal(h.pentagonHere(cx, cy), want, `${cx},${cy}`); assert.equal(h.pentagonReal(cx, cy), want); }
  assert.equal(PENTAGON.version, 8); /* release 795: grand halls */ assert.equal(PENTAGON.every, 8); assert.equal(PENTAGON.chance, .5); assert.equal(PENTAGON.minRing, 10);
});

test('determinism: two fresh journeys lay the same sigils and the same hunts', () => {
  const a = game('PF4'), b = game('PF4'), sa = sigilsNear(a, -20, 60, 3), sb = sigilsNear(b, -20, 60, 3);
  assert.deepEqual(sa.map((q) => q.o), sb.map((q) => q.o));
  for (const g of [a, b]) { g.rx = 0; g.ry = 40; for (let i = 0; i < 6 && pentagonHuntsOpen(g.save).length < 2; i++) g.offerPentagonHunt(); }
  assert.deepEqual(a.save.pentagonFinding.hunts, b.save.pentagonFinding.hunts);
});

test('a section with a sigil draws without throwing', () => {
  const g = game('TIM1'); const [{ x, y }] = sigilsNear(g, 10, -30, 1); visit(g, x, y); const o = g.map.objects.find((q) => q.kind === 'pentWaysign'); g.player.x = o.x; g.player.y = o.y + 1;
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({}), ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative'); } }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); g.interact('read', o.id); assert.equal(o.state, 'read'); assert.doesNotThrow(() => render(ctx, g, 360, 640, 5100)); void x; void y;
});
