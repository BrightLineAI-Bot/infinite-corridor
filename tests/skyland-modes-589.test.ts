// Release 589 (Tim, 2026-10-30): "when you go into the skylands, you're not exactly sure what you're going to get". Each climb
// rolls a mode: a divine challenge of echoes of the world beasts you have slain, several at once; a cloud hold of winged things
// whose gate drops you somewhere far off; both together; or a sky gate that drops you far off at once. The next Ascension
// tier is always shown, locked or not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { validActions } from '../src/interactions.ts';
import { SKY_MODES, rollSkylandMode, skylandModeOf, skylandPlan, skylandHops, skylandHop, skylandWave, skylandActions, skylandLabel, beginSkyland, SKYLANDS, skylandSection } from '../src/skylands.ts';
import { WORLD_BEASTS } from '../src/world-beasts.ts';

const hasStair = (x, y) => { const s = freshSave(); s.seed = 'SKY'; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); return g.map.objects.some((o) => o.kind === 'skyStair'); };
let stairAt = null; const stair = () => { for (let r = 14; r < 60 && !stairAt; r++) for (let x = -r; x <= r && !stairAt; x++) { const y = r - Math.abs(x); if (skylandSection('SKY', x, y) && hasStair(x, y)) stairAt = [x, y]; } return stairAt; };
// Climbs with the mode forced: `runs` is set so the next run rolls `mode`.
function climb(mode, setup = () => {}) {
  const [rx, ry] = stair(), s = freshSave(); s.seed = 'SKY'; s.skylands = { sigils: 5, best: 3, runs: 0, clears: 0 }; setup(s);
  let run = s.skylands.runs + 1; while (rollSkylandMode('SKY', { rx, ry }, run) !== mode) run++; s.skylands.runs = run - 1;
  const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld'); const st = g.map.objects.find((o) => o.kind === 'skyStair');
  g.player.x = st.x; g.player.y = st.y; if (st.disc) g.skyLevel = st.elev; const r = g.interact('ascend:1', st.id);
  return { g, s, r, rx, ry };
}
const clearAll = (g, s) => { const move = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; let t = 1000; g.player.invulnerableUntil = 1e12; const id = g.areaId(), seen = [];
  for (let k = 0; k < 10 && !s.consequences.dungeons[id]?.resolved; k++) { seen.push(g.enemies.filter((e) => !e.dead).map((e) => ({ kind: e.kind, echo: e.skyEcho, hp: e.maxHp, damage: e.damage, worldBeast: e.worldBeast, noRewards: e.noRewards }))); for (const e of g.enemies) { e.hp = 0; e.dead = true; g.defeatEnemy(e); } for (let i = 0; i < 60; i++) { t += 50; g.update(.05, move, t); } }
  return { id, seen }; };

test('the four modes are all rolled, deterministically; a 571 run keeps its three waves', () => {
  const seen = {}; for (let r = 1; r <= 200; r++) { const m = rollSkylandMode('S', { rx: 20, ry: 3 }, r); seen[m] = (seen[m] || 0) + 1; assert.equal(rollSkylandMode('S', { rx: 20, ry: 3 }, r), m); }
  assert.deepEqual(Object.keys(seen).sort(), ['cloud', 'gate', 'gauntlet', 'rush']);
  assert.equal(skylandModeOf('skyland:S:20,3:t0:r4'), null); assert.equal(skylandModeOf('skyland:S:20,3:mrush:t2:r4'), 'rush');
  const old = skylandPlan('skyland:S:20,3:t0:r4', null, 'riftColossus'); assert.equal(old.length, SKYLANDS.waves.length); assert.deepEqual(old[2].kinds, ['riftColossus']);
  const w = skylandWave('skyland:S:20,3:t0:r4', 2, [{ x: 10, y: 10 }, { x: 11, y: 10 }], { x: 10, y: 10 }, 'riftColossus'); assert.equal(w[0].kind, 'riftColossus'); assert.ok(w[0].boss);
});

test('the next Ascension tier is always in sight, with what it takes', () => {
  const s = freshSave(); s.seed = 'S'; assert.deepEqual(skylandActions(s), ['ascend:0', 'ascend:1']);
  assert.match(skylandLabel('ascend:1', s), /locked \(clear Ascension 0\)/);
  s.skylands = { sigils: 1, best: 3, runs: 0, clears: 0 }; assert.deepEqual(skylandActions(s), ['ascend:0', 'ascend:1', 'ascend:2']); assert.match(skylandLabel('ascend:2', s), /2 sigils; you hold 1/);
  assert.equal(beginSkyland(s, { rx: 20, ry: 0 }, 2).ok, false);
});

test('a divine challenge: echoes of the beasts you slew, several at once, shared out, no beast hunt touched', () => {
  const { g, s, r } = climb('rush', (s) => { s.worldBeasts = { lightningGiant: { slain: 1 }, morphingBlob: { slain: 2 }, mountainTurtle: { slain: 1 } }; });
  assert.ok(r.ok); assert.equal(skylandModeOf(g.areaId()), 'rush'); assert.match(g.map.name, /Divine Challenge · Ascension 1/); assert.ok(g.map.skyCloud);
  const before = JSON.stringify(s.worldBeasts), { id, seen } = clearAll(g, s);
  assert.equal(s.consequences.dungeons[id].resolved, true); assert.deepEqual(seen.slice(0, 3).map((w) => w.length), SKY_MODES.rushRounds);
  for (const w of seen.slice(0, 3)) for (const e of w) { assert.ok(['lightningGiant', 'morphingBlob', 'mountainTurtle'].includes(e.echo), e.kind); assert.equal(e.kind, WORLD_BEASTS[e.echo].kind); assert.equal(e.worldBeast, undefined); assert.ok(e.noRewards); }
  assert.equal(new Set(seen[2].map((e) => e.echo)).size, 3, 'three different beasts at once');
  const solo = seen[0][0], trio = seen[2].find((e) => e.echo === solo.echo); if (trio) assert.ok(trio.hp < solo.hp, 'shared out');
  assert.equal(JSON.stringify(s.worldBeasts), before, 'the beasts themselves are untouched');
  assert.equal(s.skylands.best, 3); assert.ok(s.skylands.clears === 1);
  const exit = g.map.objects.find((o) => o.kind === 'exit'), [rx, ry] = stair(); g.player.x = exit.x; g.player.y = exit.y; g.interact('exit', exit.id);
  assert.equal(g.area, 'overworld'); assert.deepEqual([g.rx, g.ry], [rx, ry], 'a divine challenge brings you back down the stair');
});

test('no beast slain yet: the keepers stand in', () => {
  const plan = skylandPlan('skyland:S:20,3:mrush:t0:r1', freshSave()); assert.ok(plan.every((w) => w.boss && !w.echoes.length && w.kinds === SKY_MODES.keepers));
  const two = skylandPlan('skyland:S:20,3:mrush:t0:r1', { worldBeasts: { tremorWorm: { slain: 1 } } }); assert.deepEqual(two[2].echoes, ['tremorWorm'], 'one beast, two keepers');
});

test('a cloud hold: winged things, then its gate drops you far off', () => {
  const { g, s, rx, ry } = climb('cloud'); assert.match(g.map.name, /Cloud Hold/); assert.equal(g.map.weather, 'sunbreak');
  const { id, seen } = clearAll(g, s); assert.equal(s.consequences.dungeons[id].resolved, true);
  assert.ok(seen.slice(0, 3).flat().every((e) => SKY_MODES.winged.includes(e.kind))); assert.ok(skylandHops(id)); assert.match(g.message, /gate of cloud/);
  const exit = g.map.objects.find((o) => o.kind === 'exit'); g.player.x = exit.x; g.player.y = exit.y; assert.ok(g.interact('exit', exit.id).ok);
  assert.equal(g.area, 'overworld'); const d = Math.hypot(g.rx - rx, g.ry - ry); assert.ok(d >= SKY_MODES.hop[0] - 1, `${d} sections away`);
  assert.equal(Object.keys(s.consequences.dungeons).filter((k) => k.startsWith('skyland:')).length, 0, 'nothing left behind');
});

test('a gauntlet ends in a divine challenge; a sky gate drops you at once and spends nothing', () => {
  const plan = skylandPlan('skyland:S:20,3:mgauntlet:t0:r1', { worldBeasts: { nanobotKnight: { slain: 1 }, psychicCrystal: { slain: 1 } } });
  assert.equal(plan.length, SKY_MODES.gauntletCloud + SKY_MODES.gauntletRounds.length); assert.ok(!plan[0].boss && plan[plan.length - 1].echoes.length === 2);
  const hops = Array.from({ length: 40 }, (_, i) => skylandHops(`skyland:S:20,3:mgauntlet:t0:r${i}`)); assert.ok(hops.includes(true) && hops.includes(false), 'sometimes far off, sometimes not');
  const { g, s, r, rx, ry } = climb('gate'); assert.ok(r.ok); assert.equal(g.area, 'overworld'); assert.equal(s.skylands.sigils, 5, 'no sigils spent');
  assert.ok(Math.hypot(g.rx - rx, g.ry - ry) >= SKY_MODES.hop[0] - 1); assert.deepEqual(skylandHop('skyland:x:mgate:t0:r1', 0, 0), skylandHop('skyland:x:mgate:t0:r1', 0, 0));
});
