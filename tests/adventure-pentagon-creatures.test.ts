// Adventure Pentagons (version 11) with the adventure creatures (adventure-creatures.ts, release 894): a share of every v11
// chamber's ordinary guard slots go to its ward theme's own creatures, picked by pickAdventureCreature and placed by
// adventureSpawnSpot (perches and vantages on the floor's raised ground), scaled by Game.scaleToRegion. Older Pentagons are
// untouched (their digests are pinned in tests/adventure-pentagon.test.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber } from '../src/pentagon.ts';
import { ADVENTURE_CREATURES, isAdventureKind } from '../src/adventure-creatures.ts';
import { ADVENTURE_PENTAGON as AP, adventureCreatureTheme } from '../src/adventures.ts';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
test('v11 chambers: about half their ordinary guards are their ward\'s adventure creatures, placed on reachable floor, perchers often raised', () => {
  let slots = 0, adv = 0, raised = 0; const kinds = new Set();
  for (let i = 0; i < 12; i++) { const seed = `AC${i}`, P = pentagonPlan(seed, i * 8, -i * 8, AP.version);
    for (const q of P.nodes) { const m = generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`, 2), W = m.width, seen = new Set([m.entry.y * W + m.entry.x]), st = [m.entry];
      while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = m.tiles[k]; if (x < 0 || y < 0 || x >= W || y >= m.height || !t || seen.has(k) || t.blocked) continue; seen.add(k); st.push({ x, y }); } }
      for (const e of m.enemySpawns) { if (!e.buildingGuard || e.boss) continue; slots++; assert.ok(seen.has(e.y * W + e.x), `${seed} ${q.id}: ${e.kind} reachable`);
        if (!e.adventureCreature) { assert.ok(!isAdventureKind(e.kind)); continue; } adv++; kinds.add(e.kind);
        assert.equal(e.adventureCreature, adventureCreatureTheme(q.theme || 'tomb')); assert.ok(ADVENTURE_CREATURES[e.adventureCreature].some((c) => c.kind === e.kind), `${e.kind} of ${e.adventureCreature}`);
        const t = m.tiles[e.y * W + e.x]; assert.ok(!t.blocked && !t.doorway && !t.slope); if (t.elev) raised++; }
      assert.ok(m.enemySpawns.length <= 9, `${seed} ${q.id}: ${m.enemySpawns.length} placed`); } }
  assert.ok(adv / slots > AP.creatures.share - .1 && adv / slots < AP.creatures.share + .1, `${adv} of ${slots}`); assert.ok(raised > adv * .3, `${raised} of ${adv} raised`);
  assert.equal(kinds.size, Object.values(ADVENTURE_CREATURES).flat().length, [...kinds].join(' '));
});
test('older Pentagons never place an adventure creature', () => {
  for (const V of [8, 9, 10]) { const P = pentagonPlan('OLD1', 8, 8, V); for (const q of P.nodes) assert.ok(!generatePentagonChamber('OLD1', `${P.base}:f${q.n + 1}`, 2).enemySpawns.some((e) => e.adventureCreature || isAdventureKind(e.kind)), `v${V} ${q.id}`); }
});
test('in the game an adventure creature takes its region\'s threat (Game.scaleToRegion), and a Waystone rest brings it back', () => {
  const s = freshSave(); s.seed = 'TIM1'; const g = new Game(s, 0); let site = null;
  for (let cx = -64; cx <= 64 && !site; cx += PENTAGON.every) for (let cy = -64; cy <= 64 && !site; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) site = { cx, cy };
  g.rx = site.cx; g.ry = site.cy + 1; g.loadArea('overworld', false); const P = pentagonPlan(s.seed, site.cx, site.cy, 11);
  const go = (q) => { s.session.activeDungeonId = `${P.base}:f${q.n + 1}`; s.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false); };
  const q = P.nodes.find((n) => n.area && !P.trials.includes(n.id) && generatePentagonChamber(s.seed, `${P.base}:f${n.n + 1}`, 2).enemySpawns.some((e) => e.adventureCreature)); go(q);
  const a = g.enemies.find((e) => e.adventureCreature); assert.ok(a); assert.ok(Number.isFinite(a.threatRing), 'scaled to its region'); const id = a.id;
  for (const e of g.enemies) Object.assign(e, { dead: true, rewarded: true, hp: 0 }); g.snapshotArea();
  go(P.nodes.find((n) => n.id === 'w0')); const w = g.map.objects.find((o) => o.kind === 'pentWaystone'); g.player.x = w.x; g.player.y = w.y; g.interact('rest', w.id);
  go(q); const back = g.enemies.find((e) => e.id === id); assert.ok(back && !back.dead && back.adventureCreature && Number.isFinite(back.threatRing), 'it stands again');
});
