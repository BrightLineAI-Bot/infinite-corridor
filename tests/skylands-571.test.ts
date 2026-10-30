// Release 571 (Tim, 2026-10-29): the Skylands, divine challenges with Ascension tiers: a Sky Stair in rare new sections; three
// waves (pack, elites, boss) made stronger by the tier; tier N costs N Ascension Sigils and repays max(1, N); repeatable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
// Release 587: the skyway door is climbed to (its top disc); these tests stand the Wayfarer there.
const hasStair = (x, y) => { const s = freshSave(); s.seed = 'SKY'; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return g.map.objects.some((o) => o.kind === 'skyStair'); };
const onTop = (g, st) => { if (st.disc) g.skyLevel = st.elev; };
import { validActions } from '../src/interactions.ts';
import { SKYLANDS, ensureSkylands, skylandSection, skylandTiers, beginSkyland, completeSkyland, skylandScale, skylandLabel, rollSkylandMode, skylandPlan } from '../src/skylands.ts';
// Release 589: each climb rolls a mode; a sky gate spends nothing. These tests climb at a stair and run whose mode is not one.
const notGate = (s, at) => { while (rollSkylandMode(s.seed, at, s.skylands.runs + 1) === 'gate') s.skylands.runs++; return at; };

test('Sky Stairs are rare, deterministic and never near Ember Refuge', () => {
  let n = 0, total = 0; for (let x = -80; x < 80; x++) for (let y = -80; y < 80; y++) { total++; if (skylandSection('S', x, y)) { n++; assert.ok(Math.abs(x) + Math.abs(y) >= SKYLANDS.minDepth); assert.equal(skylandSection('S', x, y), true); } }
  assert.ok(n > 100 && n / total < 1 / 40, `${n} stairs in ${total} sections`);
});

test('the Ascension economy: tier N costs N, repays max(1, N); one tier above the best; spending is kept', () => {
  const s = freshSave(); s.seed = 'S'; assert.deepEqual(ensureSkylands(s), { sigils: 0, best: -1, runs: 0, clears: 0 });
  assert.deepEqual(skylandTiers(s), [0]);
  assert.equal(beginSkyland(s, { rx: 20, ry: 0 }, 1).ok, false, 'tier 1 locked before tier 0 is cleared');
  assert.equal(beginSkyland(s, notGate(s, { rx: 20, ry: 0 }), 0).ok, true); assert.equal(completeSkyland(s, 0).sigils, 1);
  assert.deepEqual(skylandTiers(s), [0, 1]); const b = beginSkyland(s, notGate(s, { rx: 20, ry: 0 }), 1); assert.ok(b.ok); assert.equal(s.skylands.sigils, 0, 'spent');
  completeSkyland(s, 1); assert.equal(s.skylands.sigils, 1); assert.equal(s.skylands.best, 1);
  assert.deepEqual(skylandTiers(s), [0, 1], 'tier 2 needs 2 sigils: farm a lower tier'); completeSkyland(s, 0); assert.deepEqual(skylandTiers(s), [0, 1, 2]);
  const r = completeSkyland(s, 4); assert.equal(r.sigils, 4); assert.equal(r.weaponSphere + r.armorSphere, 4); assert.equal(r.marks, SKYLANDS.marks + 4 * SKYLANDS.marksPerTier);
  assert.ok(skylandScale(5).hp > skylandScale(1).hp && skylandScale(5).damage > skylandScale(1).damage);
  assert.match(skylandLabel('ascend:2', s), /Ascension 2/); assert.equal(skylandLabel('enter', s), null);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.skylands, s.skylands, 'kept through a save');
  const old = migrateSave(JSON.parse(JSON.stringify({ ...freshSave(), skylands: undefined }))); assert.equal(old.skylands.best, -1);
});

test('in the game: climb, clear three waves, earn a sigil, come down, and leave nothing behind', () => {
  const s = freshSave(); s.seed = 'SKY'; let at = null;
  for (let r = 14; r < 60 && !at; r++) for (let x = -r; x <= r && !at; x++) { const y = r - Math.abs(x); if (skylandSection('SKY', x, y) && hasStair(x, y)) at = [x, y]; } /* release 587: a section with room for its skyway */
  ensureSkylands(s); while (rollSkylandMode('SKY', { rx: at[0], ry: at[1] }, s.skylands.runs + 1) !== 'rush') s.skylands.runs++; // release 589: a divine challenge, which comes back down the stair
  const g = new Game(s, 0); g.rx = at[0]; g.ry = at[1]; g.loadArea('overworld');
  const stair = g.map.objects.find((o) => o.kind === 'skyStair'); assert.ok(stair, 'a Sky Stair stands there'); assert.deepEqual(validActions(stair, s), ['ascend:0', 'ascend:1'], 'release 589: the next tier is shown, locked');
  assert.ok(s.atlas[`${at[0]},${at[1]}`].sites.some((q) => q.kind === 'skyStair'), 'on the Atlas');
  g.player.x = stair.x; g.player.y = stair.y; onTop(g, stair); assert.equal(g.interact('ascend:0', stair.id).ok, true);
  assert.equal(g.area, 'dungeon'); assert.ok(g.map.skyland); const first = g.enemies.filter((e) => !e.dead).length; assert.equal(first, skylandPlan(g.areaId(), s)[0].count);
  const move = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; let t = 1000; g.player.invulnerableUntil = 1e12; const id = g.areaId();
  for (let k = 0; k < 6 && !s.consequences.dungeons[id]?.resolved; k++) { for (const e of g.enemies) { e.hp = 0; e.dead = true; g.defeatEnemy(e); } for (let i = 0; i < 60; i++) { t += 50; g.update(.05, move, t); } }
  assert.equal(s.consequences.dungeons[id].resolved, true); assert.equal(s.skylands.sigils, 1); assert.equal(s.skylands.best, 0);
  assert.ok(g.questNotices.some((q) => q.title === 'SKYLAND CLEARED'));
  const exit = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = exit.x; g.player.y = exit.y; assert.ok(g.interact('exit', exit.id).ok); assert.equal(g.area, 'overworld');
  assert.equal(Object.keys(s.session.areas).filter((k) => k.startsWith('skyland:')).length, 0); assert.equal(Object.keys(s.consequences.dungeons).filter((k) => k.startsWith('skyland:')).length, 0);
  assert.deepEqual(validActions(g.map.objects.find((o) => o.kind === 'skyStair'), s), ['ascend:0', 'ascend:1', 'ascend:2'], 'repeatable, and Ascension 1 is open (2 shown, locked)');
});

test('Ascension makes the foes stronger', () => {
  const run = (tier) => { const s = freshSave(); s.seed = 'SKY'; s.skylands = { sigils: 10, best: 9, runs: 0, clears: 0 }; let at = null;
    for (let r = 14; r < 60 && !at; r++) for (let x = -r; x <= r && !at; x++) { const y = r - Math.abs(x); if (skylandSection('SKY', x, y) && hasStair(x, y)) at = [x, y]; } /* release 587: a section with room for its skyway */
    const g = new Game(s, 0); g.rx = at[0]; g.ry = at[1]; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair'); g.player.x = st.x; g.player.y = st.y; onTop(g, st); g.interact(`ascend:${tier}`, st.id);
    return g.enemies.reduce((n, e) => n + e.maxHp, 0); };
  assert.ok(run(5) > run(0) * 3, 'Ascension 5 foes have far more health');
});
