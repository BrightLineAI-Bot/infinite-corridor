// Release 301 (Tim, 2026-10-22): short plain crossings in the mix, themed ones rarer, and paired Watcher's daises in the
// largest crossings. Only dungeons generated from now on (layout pool 5, theme pool 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateExpeditionDungeon, reachableInMap, THEME_POOLS, PLAIN, WARP } from '../src/underlands.ts';
import { generatePinnedDungeon, Game } from '../src/game.ts';
import { dungeonHistory } from '../src/interactions.ts';
import { freshSave } from '../src/types.ts';

const gen = (i, opts = {}) => generateExpeditionDungeon('PLAIN', `dungeon:PLAIN:g1:${i}:${i * 3}:site`, ['hollow', 'cistern', 'kiln'][i % 3], { layoutPool: 5, themePool: 3, ...opts });

test('about a quarter of new crossings are short plain boxes of a few rooms, never themed', () => {
  let plain = 0, themed = 0;
  for (let i = 0; i < 200; i++) {
    const m = gen(i);
    if (m.plain) {
      plain++; assert.equal(m.theme, undefined); assert.ok(m.width <= PLAIN.width + 1 && m.height <= PLAIN.height + 1, 'small');
      assert.equal(m.diagnostic.layoutGrammar, 'rooms'); assert.equal(m.sizeProfile, 'small');
      const seen = reachableInMap(m, m.entry); for (const o of m.objects) assert.ok(seen[o.y * m.width + o.x], `${i}: ${o.kind} reachable`);
      for (const e of m.enemySpawns) assert.ok(seen[Math.round(e.y) * m.width + Math.round(e.x)], `${i}: ${e.kind} reachable`);
    } else if (m.theme) themed++;
  }
  assert.ok(plain > 30 && plain < 75, `plain ${plain}/200`);
  assert.ok(themed > 25 && themed < 70, `themed ${themed}/200, about 30% of the rest`);
  assert.equal(THEME_POOLS[3].chance, 30);
  for (const id of ['starHive', 'geode', 'mosaic', 'rootwood', 'brass']) assert.equal(THEME_POOLS[3].ids.filter((q) => q === id).length, 1);
  for (const id of THEME_POOLS[1].ids) assert.equal(THEME_POOLS[3].ids.filter((q) => q === id).length, 2, 'the first six twice as likely');
  for (let i = 0; i < 40; i++) assert.ok(!generateExpeditionDungeon('PLAIN', `dungeon:PLAIN:g1:${i}:${i * 3}:site`, 'hollow', { layoutPool: 4 }).plain, 'older pools never plain');
});

test('only never-generated crossings adopt layout pool 5 and theme pool 3', () => {
  const s = freshSave('PIN301'); s.seed = 'PIN301';
  const fresh = 'dungeon:PIN301:g1:4:2:new'; generatePinnedDungeon(s, fresh);
  assert.equal(s.consequences.dungeons[fresh].layoutPool, 5); assert.equal(s.consequences.dungeons[fresh].themePool, 3);
  const old = 'dungeon:PIN301:g1:5:2:old', h = dungeonHistory(s, old); h.generatorVersion = 5; h.layoutPool = 4; h.themePool = 2; generatePinnedDungeon(s, old);
  assert.equal(h.layoutPool, 4); assert.equal(h.themePool, 2);
});

test('large crossings may hold paired daises: each must be found before either carries you', () => {
  let found = null;
  for (let i = 0; i < 300 && !found; i++) { const m = gen(i, { sizeProfile: 'extended' }); if (m.warpDaises) found = i; }
  assert.ok(found !== null, 'some extended crossing has daises');
  let paired = 0; for (let i = 0; i < 100; i++) if (gen(i, { sizeProfile: 'extended' }).warpDaises) paired++;
  assert.ok(paired > 20 && paired < 80, `about half the eligible extended crossings (${paired}/100; WARP.chance ${WARP.chance})`);
  for (let i = 0; i < 60; i++) assert.ok(!gen(i, { sizeProfile: 'compact' }).warpDaises && !gen(i, { sizeProfile: 'standard' }).warpDaises, 'only the largest');
  const m = gen(found, { sizeProfile: 'extended' }), [a, b] = m.objects.filter((o) => o.kind === 'warpDais');
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= WARP.minApart); const seen = reachableInMap(m, m.entry); assert.ok(seen[a.y * m.width + a.x] && seen[b.y * m.width + b.x]);
  const s = freshSave('PLAIN'); s.seed = 'PLAIN'; const g = new Game(s, 0); g.area = 'dungeon'; g.map = m; g.save.session.activeDungeonId = m.id; g.areaId = () => m.id;
  const at = (o) => { g.player.x = o.x; g.player.y = o.y + 1; };
  at(a); assert.equal(g.interact(null, a.id).ok, true); assert.equal(a.state, 'attuned'); assert.match(g.message, /twin/);
  assert.equal(g.interact(null, a.id).ok, false, 'its twin is not yet found');
  at(b); g.interact(null, b.id); assert.equal(b.state, 'attuned'); assert.match(g.message, /answers/);
  const r = g.interact(null, b.id); assert.equal(r.ok, true); assert.ok(Math.hypot(g.player.x - a.x, g.player.y - a.y) < 1.6, 'carried to the first dais');
});
