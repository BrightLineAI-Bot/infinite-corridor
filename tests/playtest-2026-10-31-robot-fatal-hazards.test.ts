// Independent audit at 4a30ef332f219bc5e1905a688b6f98bb0d4d0c45.
// No terrain mutation, gameplay monkeypatching, or simulated damage injection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, chasmRoll } from '../src/game.ts';

function runChasm(robot: boolean, frames = 30) {
  const s = freshSave(); s.seed = 'CH593';
  s.perception.aperture = 3255; s.farArray = { listeners: 2 };
  s.consumables.submersible = 1; s.materials.cinderIron = 99;
  const id = 'dungeon:CH593:g1:13:6:room';
  assert.equal(chasmRoll(s.seed, id), true);
  s.session.activeDungeonId = id;
  s.session.dungeonReturn = { rx: 3, ry: 2, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false);
  g.enemies = []; // Isolate traversal from combat; do not alter generated terrain.
  if (robot) { assert.equal(g.useConsumable('submersible', 0), true); assert.equal(g.mechUp(), true); }
  const w = g.map.width;
  const edge = g.map.tiles.find(t => !t.blocked && !t.chasm && g.map.tiles[t.y * w + t.x + 1]?.chasm);
  assert.ok(edge); assert.deepEqual([edge.x, edge.y], [24, 3]);
  Object.assign(g.player, { x: edge.x, y: edge.y - .25 });
  const input = { state: { x: 1, y: 0 }, consume: () => false, held: () => false };
  const deathsBefore = s.worldFlags.deaths || 0, trace = [];
  for (let i = 0; i < frames && (s.worldFlags.deaths || 0) === deathsBefore; i++) {
    g.update(.05, input, 1050 + i * 50);
    trace.push({ frame: i, hp: g.player.hp, x: g.player.x, y: g.player.y,
      deaths: (s.worldFlags.deaths || 0) - deathsBefore, plate: s.mech?.plate,
      replateIn: s.mech?.replateIn, message: g.message });
  }
  return { g, s, trace, deaths: (s.worldFlags.deaths || 0) - deathsBefore };
}

test('audit control: walking off a naturally generated chasm kills the unarmored Wayfarer', () => {
  const r = runChasm(false);
  assert.equal(r.deaths, 1);
  assert.equal(r.trace.length, 5);
  assert.deepEqual([r.g.player.x, r.g.player.y], [22, 4]);
});

test('audit regression: active robot must not mitigate the fatal unboosted chasm fall', (t) => {
  const r = runChasm(true);
  t.diagnostic(JSON.stringify(r.trace));
  // AGENT_CONTEXT: pits are lethal on purpose. Robot traversal uses held-Jump boost;
  // neither the input nor the production state enables boost in this scenario.
  assert.equal(r.g.mechBoosting, false);
  assert.equal(r.deaths, 1, 'walking into the same chasm must count a death and recover, not remain alive at the rim');
});

function runSkyFall(robot: boolean) {
  const s = freshSave(); s.seed = 'SKY';
  s.perception.aperture = 3255; s.farArray = { listeners: 2 };
  s.consumables.submersible = 1; s.materials.cinderIron = 99;
  const g = new Game(s, 0); g.rx = -16; g.ry = 7; g.loadArea('overworld');
  g.enemies = []; const discs = g.map.skyDiscs, p = g.player;
  assert.ok(discs?.length >= 4, 'naturally generated four-level skyway');
  let now = 1000;
  const input = (x: number, y: number, jump = false) => {
    let press = jump;
    return { state: { x, y }, consume: (k: string) => k === 'jump' && press ? (press = false, true) : false, held: () => false };
  };
  const idle = () => { while (now <= (g.jumpUntil || 0)) { now += 50; g.update(.05, input(0, 0), now); } };
  const walkTo = (fx: number, fy: number, ms: number) => {
    for (let i = 0; i < ms / 50; i++) {
      const dx = fx - p.x - .5, dy = fy - p.y - .75, d = Math.hypot(dx, dy);
      if (d < .12) break;
      now += 50; g.update(.05, input(dx / d, dy / d), now);
    }
  };
  const jumpTo = (fx: number, fy: number) => {
    idle(); const dx = fx - p.x - .5, dy = fy - p.y - .75, d = Math.hypot(dx, dy);
    now += 50; g.update(.05, input(dx / d, dy / d, true), now);
    walkTo(fx, fy, 1200); idle();
  };
  // Position on the ground beside disc one, then ascend all four using real input.
  // Never assign skyLevel or substitute terrain/elevation.
  Object.assign(p, { x: discs[0].x - .5 - 1.6, y: discs[0].y - .75 });
  let previous = null;
  for (const d of discs.slice(0, 4)) {
    if (previous) { const a = Math.atan2(d.y - previous.y, d.x - previous.x); walkTo(previous.x + Math.cos(a) * .8, previous.y + Math.sin(a) * .8, 1500); }
    jumpTo(d.x, d.y); assert.equal(g.skyLevel, d.level, 'real-input ascent reaches each disc'); previous = d;
  }
  if (robot) { assert.equal(g.useConsumable('submersible', now), true); assert.equal(g.mechUp(), true); }
  const before = s.worldFlags.deaths || 0, d4 = discs[3];
  const direction = Math.atan2(d4.y - discs[2].y, d4.x - discs[2].x) + Math.PI / 2;
  for (let i = 0; i < 30 && g.skyLevel === 4 && (s.worldFlags.deaths || 0) === before; i++) {
    now += 50; g.update(.05, input(Math.cos(direction), Math.sin(direction)), now);
  }
  return { deaths: (s.worldFlags.deaths || 0) - before, skyLevel: g.skyLevel,
    hp: p.hp, x: p.x, y: p.y, mech: s.mech, message: g.message, boosting: g.mechBoosting };
}

test('audit control: genuine ascent then unboosted four-disc fall kills the unarmored Wayfarer', () => {
  const r = runSkyFall(false);
  assert.equal(r.deaths, 1); assert.deepEqual([r.x, r.y], [16, 16]);
});

test('audit regression: active robot must not mitigate a fatal four-level skyway fall', (t) => {
  const r = runSkyFall(true); t.diagnostic(JSON.stringify(r));
  assert.equal(r.boosting, false); assert.equal(r.skyLevel, 0, 'landed on the ground from level four');
  assert.equal(r.deaths, 1, 'four-level fall must be fatal, not converted into a mitigated blow');
});
