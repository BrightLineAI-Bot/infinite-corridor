// Adventure Pentagons (version 11), Tim's answers of 2026-11-11: grand halls with murals come back, rebuilt wide for the camera;
// resting at a Waystone brings the Pentagon's ordinary creatures back, Dark Souls style (never a boss, lord, keeper, warden, the
// Regent or a trial chamber's; keys, levers, shortcuts and caches stay as they are), deterministic, saved and resumed exactly;
// and in a vast Pentagon you travel between the Waystones you have rested at.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { PENTAGON, pentagonPlan, generatePentagonChamber } from '../src/pentagon.ts';
import { PENTAGON_HALLS } from '../src/pentagon-halls.ts';
import { ADVENTURE_PENTAGON as AP, ADVENTURE_THEMES, adventureCreatureTheme } from '../src/adventures.ts';

const V = AP.version, input = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
const site = (seed) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); for (let cx = -64; cx <= 64; cx += PENTAGON.every) for (let cy = -64; cy <= 64; cy += PENTAGON.every) if (g.pentagonHere(cx, cy)) return { s, g, cx, cy }; return null; };
const start = (seed = 'TIM1') => { const { s, g, cx, cy } = site(seed); g.rx = cx; g.ry = cy + 1; g.loadArea('overworld', false); const P = pentagonPlan(seed, cx, cy, g.map.pentagon.V); return { s, g, P }; };
const go = (g, P, q) => { g.save.session.activeDungeonId = `${P.base}:f${q.n + 1}`; g.save.session.dungeonReturn = { rx: g.rx, ry: g.ry, x: 16, y: 16 }; g.loadArea('dungeon', false); };
const slay = (g) => { for (const e of g.enemies) Object.assign(e, { dead: true, rewarded: true, hp: 0 }); g.update(.05, input, 1000); g.snapshotArea(); };
const rest = (g, P, q = P.nodes.find((n) => n.id === 'w0')) => { go(g, P, q); const o = g.map.objects.find((x) => x.kind === 'pentWaystone'); g.player.x = o.x; g.player.y = o.y; return g.interact('rest', o.id); };
const H = (g, P) => g.save.consequences.dungeons[`${P.base}:f1`];

test('grand halls return in v11: 4-6 ring halls, larger, murals and sigils laid, most columns taken out for the camera', () => {
  let halls = 0, murals = 0;
  for (let i = 0; i < 40; i++) { const seed = `GH${i}`, P = pentagonPlan(seed, i * 8, 8, V), hs = P.nodes.filter((q) => q.hall);
    assert.ok(hs.length >= PENTAGON_HALLS.count[0] && hs.length <= PENTAGON_HALLS.count[1], `${seed}: ${hs.length} halls`);
    for (const q of hs) { halls++; assert.deepEqual([q.W, q.H], AP.halls.size[q.hall.type]); assert.ok(!q.area); const m = generatePentagonChamber(seed, `${P.base}:f${q.n + 1}`, 2);
      assert.ok(m.hall && m.murals && m.sigils, `${seed} ${q.id}: dressed`); murals += m.objects.filter((o) => o.kind === 'pentMural').length;
      const T = ADVENTURE_THEMES[q.theme || 'tomb']; assert.ok(m.tiles.some((t) => t.kind === T.tiles.wall || t.kind === T.remap.keepWall), `${seed} ${q.id}: in its ward's stone`);
      const v10 = pentagonPlan(seed, i * 8, 8, 10).nodes.find((n) => n.id === q.id); if (v10?.hall?.type === q.hall.type) { const old = generatePentagonChamber(seed, `${pentagonPlan(seed, i * 8, 8, 10).base}:f${v10.n + 1}`, 2); assert.ok(m.tiles.filter((t) => t.column).length <= old.tiles.filter((t) => t.column).length); } } }
  assert.ok(halls >= 160 && murals >= halls * 3, `${halls} halls, ${murals} murals`);
});

test('a Waystone rest brings ordinary creatures back as you come to them; trial chambers and bosses stay as they fell; saved and resumed', () => {
  const { s, g, P } = start(), street = P.nodes.find((q) => q.area === 'street'), trial = P.nodes.find((q) => P.trials.includes(q.id)), heart = P.nodes.find((q) => q.kind === 'heart' && q.boss);
  go(g, P, street); const ordinary = g.enemies.filter((e) => e.buildingGuard && !e.boss).map((e) => e.id); assert.ok(ordinary.length); slay(g);
  go(g, P, trial); slay(g); go(g, P, heart); const boss = g.enemies.find((e) => e.pentBoss); assert.ok(boss); slay(g);
  assert.ok((H(g, P).pentBosses || []).includes(heart.n), 'the keeper is down');
  const r = rest(g, P); assert.ok(r.ok); assert.match(r.message, /stand again/); assert.equal(H(g, P).advRespawn, 1);
  const back = new Game(migrateSave(JSON.parse(JSON.stringify(s))), 2000); back.rx = g.rx; back.ry = g.ry; // exact resume: the count is saved
  for (const game of [g, back]) {
    go(game, P, street); for (const id of ordinary) assert.ok(game.enemies.some((e) => e.id === id && !e.dead), `${id} stands again`);
    go(game, P, trial); assert.ok(game.enemies.filter((e) => e.buildingGuard).every((e) => e.dead), 'a trial chamber stays cleared');
    go(game, P, heart); assert.ok(!game.enemies.some((e) => e.id === boss.id && !e.dead), 'the keeper stays down'); assert.ok(game.enemies.filter((e) => e.buildingGuard && e.id !== boss.id && !String(e.id).endsWith(':lord')).every((e) => !e.dead), 'its ghouls stand again'); }
  go(g, P, street); slay(g); go(g, P, street); assert.ok(g.enemies.filter((e) => e.buildingGuard).every((e) => e.dead), 'no rest since: they stay down');
  assert.deepEqual(H(g, P).pentTrials || [], H(back, P).pentTrials || []);
});

test('levers, shortcuts, caches and keys are untouched by a rest', () => {
  const { g, P } = start(), D = P.adventure.districts[0], keep = P.nodes.find((q) => q.id === D.deep); go(g, P, keep);
  const gate = g.map.objects.find((o) => o.shortcutOpens === `adv:${D.id}`); g.player.x = gate.x; g.player.y = gate.y; g.interact(null, gate.id); const opened = [...H(g, P).labOpen];
  H(g, P).pentLevers = [0]; rest(g, P); assert.deepEqual(H(g, P).labOpen, opened); assert.deepEqual(H(g, P).pentLevers, [0]);
  const shut = g.map.objects.find((o) => o.shortcutKey === `adv:${D.id}`); assert.ok(shut.opened, 'the shortcut stays open');
});

test('travel between Waystones in a vast Pentagon: offered once both are rested at, and it takes you there', () => {
  let found = null; for (const seed of ['TIM1', 'ASH5', 'V0', 'V1', 'V2']) { const x = start(seed); if (x.P.adventure.size === 'vast') { found = x; break; } }
  assert.ok(found, 'a vast Pentagon'); const { g, P } = found, w2 = P.nodes.find((q) => q.waystone === 2), hub = P.nodes.find((q) => q.id === 'w0');
  rest(g, P); go(g, P, hub); assert.deepEqual(g.map.objects.find((o) => o.kind === 'pentWaystone').actions, ['rest'], 'no other Waystone known yet');
  rest(g, P, w2); go(g, P, hub); const o = g.map.objects.find((x) => x.kind === 'pentWaystone'); assert.deepEqual(o.actions, ['rest', 'travel:2']); assert.match(o.actionLabels['travel:2'], /Travel/);
  g.player.x = o.x; g.player.y = o.y; const r = g.interact('travel:2', o.id); assert.ok(r.ok); assert.equal(g.areaId(), `${P.base}:f${w2.n + 1}`);
  const there = g.map.objects.find((x) => x.kind === 'pentWaystone'); assert.deepEqual(there.actions, ['rest', 'travel:1']);
  assert.equal(g.interact('travel:9', there.id).ok, false);
});

test('every theme row names its id in the adventure creatures module', () => {
  assert.deepEqual(Object.keys(ADVENTURE_THEMES).map(adventureCreatureTheme), ['tomb', 'verdantRuin', 'ashWaste', 'lamplitCity', 'alienCapital', 'frostCitadel', 'emberFoundry']);
});
