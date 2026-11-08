import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTOR_CONTACT, actorContactContext, actorContactStats, ordinaryContactEnemy, ordinaryContactPlayer } from '../src/actor-contact.ts';
import { Game, BRAWLER_GEAR, moveAxis, footprintOpen, platformUnder, updateEnemyAI } from '../src/game.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { freshSave } from '../src/types.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';

const floor = (width = 24, height = 16) => ({ width, height, objects: [], enemySpawns: [], entry: { x: 3, y: 5 },
  tiles: Array.from({ length: width * height }, (_, i) => ({ x: i % width, y: Math.floor(i / width), kind: 'flagFloor', blocked: false, elev: 0 })) });
const foe = (x = 5, y = 5, extra = {}) => Object.assign(createCombatant('rootBrute', x, y), extra);
const harness = (enemies = [foe()], map = floor()) => ({ map, enemies, player: { x: 3, y: 5, hp: 100, isPlayer: true }, save: {} });
const move = (g, e, dx, dy, onStep = null) => moveAxis(e, dx, dy, g.map, g.map.width, false, onStep, false, actorContactContext(g, e, dx, dy));
const gap = (g, e = g.enemies[0]) => Math.hypot(g.player.x - e.x, g.player.y - e.y);
const radius = (e) => ACTOR_CONTACT.playerRadius + enemyBodyRadius(e);
const input = (x, y, action = '') => { let used = false; return { state: { x, y }, consume: k => k === action && !used && (used = true), held: () => false }; };
function gameFixture(view = false) {
  const { game: g } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', seed: 'CONTACT-REGRESSION', now: 1000 });
  g.map = floor(); g.save.closeView = view; g.enemies = [foe(5, 5, { hitStun: 1e6 })];
  Object.assign(g.player, { x: 3, y: 5, hp: g.save.maxHp, invulnerableUntil: 1e9 });
  return g;
}

test('swept head-on contact stops both subjects and does not push the other body', () => {
  const g = harness(), e = g.enemies[0];
  move(g, g.player, 8, 0);
  assert.ok(Math.abs(gap(g) - radius(e)) < 1e-6);
  assert.deepEqual([e.x, e.y], [5, 5]);
  const before = g.player.x;
  move(g, e, -5, 0);
  assert.equal(g.player.x, before); assert.ok(gap(g) >= radius(e) - 1e-7);
});

test('diagonal slide, grazing and high-speed crossing retain legal terrain footprints', () => {
  const g = harness(); g.player.x = 4.2;
  move(g, g.player, 2, 1.5);
  assert.ok(g.player.y > 6); assert.ok(gap(g) >= radius(g.enemies[0]) - 1e-7);
  const h = harness(); h.player.y = 5 + radius(h.enemies[0]) - .001;
  move(h, h.player, 12, 0);
  assert.ok(h.player.x < 5, 'near tangent crossing is clipped even with a far endpoint');
  for (let y = 0; y < g.map.height; y++) g.map.tiles[y * g.map.width + 7].blocked = true;
  move(g, g.player, 5, 2);
  assert.equal(footprintOpen(g.map, g.map.width, g.player.x, g.player.y), true);
  assert.ok(g.player.x + .76 < 7); assert.ok(g.player.y > 7);
});

test('narrow doorway permits retreat and body contact cannot push either actor through a corner', () => {
  const g = harness([foe(6, 5)]);
  for (const t of g.map.tiles) t.blocked = t.y !== 5;
  g.player.x = 4; move(g, g.player, 8, 0);
  assert.ok(g.player.x < 6); assert.ok(gap(g) >= radius(g.enemies[0]) - 1e-7);
  const stopped = g.player.x; move(g, g.player, -2, 0);
  assert.ok(g.player.x < stopped - 1.9, 'contact does not latch the corridor closed behind the player');
  assert.equal(footprintOpen(g.map, g.map.width, g.player.x, g.player.y), true);
});

test('old partial and coincident overlaps can separate but cannot deepen or reenter', () => {
  for (const offset of [0, .3]) {
    const g = harness(); g.player.x = 5 - offset;
    if (offset) { move(g, g.player, .1, 0); assert.equal(g.player.x, 5 - offset); }
    move(g, g.player, -2, 0); assert.ok(g.player.x < 3.5);
    move(g, g.player, 4, 0); assert.ok(gap(g) >= radius(g.enemies[0]) - 1e-7);
  }
});

test('multiple simultaneous blockers are deterministic under array reversal and Game interleaving', () => {
  const run = (reverse) => { const g = harness([foe(5, 4.7), foe(5, 5.3)]); if (reverse) g.enemies.reverse();
    const c = actorContactContext(g, g.player, 6, .3); const other = harness(); move(other, other.player, 3, 0);
    moveAxis(g.player, 6, .3, g.map, g.map.width, false, null, false, c); return [g.player.x, g.player.y]; };
  assert.deepEqual(run(false), run(true));
});

test('physical exclusions are explicit; shield, stun, untargetability and hostile summons stay solid', () => {
  for (const flags of [{ untargetable: true }, { shield: true }, { hitStun: 50 }, { summonedBy: 'foe' }]) assert.equal(ordinaryContactEnemy(foe(5, 5, flags)), true);
  for (const flags of [{ dead: true }, { hp: 0 }, { friendly: true }, { ambient: true }, { passiveBehavior: 'wander' }, { kind: 'npc' }, { flying: true }, { aloft: true }, { hidden: true }, { phases: true }, { phasing: true }, { mist: true }, { worldBeast: 'mountainTurtle' }, { astralCompanionOf: 'player' }]) assert.equal(ordinaryContactEnemy(foe(5, 5, flags)), false, JSON.stringify(flags));
  const g = harness(); g.player.jumping = true; assert.ok(ordinaryContactPlayer(g));
  g.mechUp = () => true; assert.ok(ordinaryContactPlayer(g), 'grounded powered suit is solid');
  for (const key of ['droneLift', 'mechBoosting', 'glide']) { g[key] = true; assert.equal(ordinaryContactPlayer(g), false); g[key] = false; }
  g.wading = () => true; assert.equal(ordinaryContactPlayer(g), false);
});

test('separate support levels bypass bodies, while a same-level ordinary jump remains solid', () => {
  const g = harness(); g.map.landscape = { interior: true }; g.map.interiorTerrain = { version: 1, maxLevel: 5 };
  g.map.tiles[5 * g.map.width + 5].elev = 2;
  const c = actorContactContext(g, g.player, 3, 0);
  assert.equal(c.clip(4, 5, .16, 0), 1, 'foe is two support levels above this approach');
  g.map.tiles[5 * g.map.width + 5].elev = 0;
  g.player.jumping = true; move(g, g.player, 5, 0);
  assert.ok(gap(g) >= radius(g.enemies[0]) - 1e-7);
  g.player.x = 3; g.player.airElev = 2; move(g, g.player, 4, 0);
  assert.ok(g.player.x > 6, 'a real platform launch level carries above actors on the lower floor');
});

test('bounded contact work never enlarges substeps or silently omits a nearby blocker', () => {
  const g = harness([foe(90, 5.7)], floor(160, 16)), c = actorContactContext(g, g.player, 100, 0), steps = [];
  moveAxis(g.player, 100, 0, g.map, g.map.width, false, (ax, ay, bx, by) => steps.push(Math.hypot(bx - ax, by - ay)), false, c);
  assert.equal(steps.length, ACTOR_CONTACT.maxSteps); assert.ok(steps.every(n => n <= .160000001));
  assert.equal(actorContactStats(g).budgetStops, 1); assert.ok(g.player.x < 44);
  assert.equal(moveAxis(g.player, Infinity, 0, g.map, g.map.width, false, null, false, c), false);
  const crowded = harness(Array.from({ length: 300 }, (_, i) => foe(5 + i / 1000, 5)));
  move(crowded, crowded.player, 3, 0); assert.ok(gap(crowded) >= radius(crowded.enemies[0]) - 1e-7);
  const before = actorContactStats(crowded).checks; move(crowded, crowded.enemies[0], -.1, 0);
  assert.equal(actorContactStats(crowded).checks - before, 1, 'enemy checks only the player, never all pairs');
});

test('unobstructed contact query reproduces legacy X/Y movement and callback trace exactly', () => {
  const g = harness([foe(6, 5.7)]), plain = { ...g.player }, a = [], b = [];
  const dx = 2.5, dy = -.4;
  moveAxis(plain, dx, dy, g.map, g.map.width, false, (...p) => a.push(p));
  move(g, g.player, dx, dy, (...p) => b.push(p));
  assert.deepEqual(g.player, plain); assert.deepEqual(b, a);
});

test('real Game walking and dodging are solid in both views without changing action clocks', () => {
  const results = [];
  for (const view of [false, true]) {
    const g = gameFixture(view); g.player.invulnerableUntil = 0;
    g.update(.05, input(1, 0, 'dodge'), 1000);
    assert.equal(g.player.dodgeUntil, 1260); assert.equal(g.player.invulnerableUntil, 1420);
    for (let i = 1; i < 40; i++) g.update(.05, input(1, 0), 1000 + i * 50);
    assert.ok(Math.abs(gap(g) - radius(g.enemies[0])) < 1e-6);
    results.push([g.player.x, g.player.y, g.player.hp, g.player.dodgeUntil, g.player.invulnerableUntil, g.enemies[0].hp]);
  }
  assert.deepEqual(results[0], results[1]);
});

test('real ordinary AI and grounded pack movement stop at the player while melee remains reachable', () => {
  const g = gameFixture(); g.enemies = [foe(6, 5)]; const e = g.enemies[0]; let hits = 0;
  for (let i = 0; i < 300; i++) if (updateEnemyAI(e, g.player, g.map, g.map.width, .05, 1000 + i * 50, false, null, (s, dx, dy) => g.moveGrounded(s, dx, dy))) hits++;
  assert.ok(gap(g) >= radius(e) - 1e-7); assert.ok(hits > 0, 'body radius must not prevent a valid melee attack');
  e.x = 6; e.y = 5; g.packWorld(.05, 20000).move(e, -8, 0);
  assert.ok(Math.abs(gap(g) - radius(e)) < 1e-6);
});

test('accepted player endpoint prevents false lava death; moving around the body onto lava still kills', () => {
  const g = gameFixture(); g.enemies[0].x = 4.8;
  for (const t of g.map.tiles) if (t.x >= 5) t.kind = 'lava';
  for (let i = 0; i < 25; i++) g.update(.05, input(1, 0), 1000 + i * 50);
  assert.equal(g.player.hp, g.save.maxHp); assert.ok(g.player.x < 4.1);
  const stops = []; g.resolveDeath = (...args) => stops.push(args);
  g.player.y = 8;
  for (let i = 0; i < 10 && !stops.length; i++) g.update(.05, input(1, 0), 3000 + i * 50);
  assert.ok(stops.length, 'unblocked lethal terrain keeps its death consequence');
});

test('section transitions consume the accepted endpoint and retain all ordinary legal exits', () => {
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const g = new Game(freshSave(), 1000); g.map = floor(32, 32); g.map.exits = { north: 8, south: 8, east: 8, west: 8 };
    Object.assign(g.player, { x: dx ? (dx > 0 ? 31.1 : .1) : 8, y: dy ? (dy > 0 ? 31 : .1) : 8 });
    const e = foe(g.player.x + dx * .8, g.player.y + dy * .8, { hitStun: 1e6 }); g.enemies = [e];
    const transitions = []; g.transitionSection = (x, y) => transitions.push([x, y]);
    g.update(.1, input(dx, dy), 1100); assert.equal(transitions.length, 0, 'body stops the requested edge crossing');
    if (dx) e.y += .72; else e.x += .72;
    g.update(.1, input(dx, dy), 1200); assert.deepEqual(transitions, [[dx, dy]], 'nearby body off the route must not close the exit');
  }
});

test('accepted trace preserves raft occupancy instead of inventing a fall from an unaccepted step', () => {
  const g = gameFixture(); g.player.x = 4; g.player.y = 5; g.enemies[0].x = 4.8;
  for (const t of g.map.tiles) { t.chasm = true; t.kind = 'canyon'; }
  g.map.movers = [{ id: 'hover', pts: [{ x: 4, y: 5 }, { x: 4, y: 5 }], amp: -1 }];
  assert.ok(platformUnder(g.map, g.player.x, g.player.y, 0));
  g.update(.3, input(1, 0), 1300);
  assert.equal(g.player.hp, g.save.maxHp); assert.ok(platformUnder(g.map, g.player.x, g.player.y, g.save.playSeconds)); assert.equal(g.raftZ, -1);
});

test('normal schema-14 paused save preserves an overlapping pair and its old generation pins exactly', () => {
  const s = freshSave(); s.seed = 'CONTACT-RESUME'; const g = new Game(s, 1000);
  g.transitionSection(2, 1); const e = g.enemies.find(ordinaryContactEnemy); assert.ok(e);
  g.player.x = e.x; g.player.y = e.y;
  const snap = g.exportSnapshot(1000), loaded = deserializeSave(serializeSave(snap)), before = structuredClone(loaded.consequences);
  const restored = new Game(loaded, 5000);
  assert.equal(restored.save.version, 14); assert.deepEqual([restored.player.x, restored.player.y], [e.x, e.y]);
  const kept = restored.enemies.find(q => q.id === e.id); assert.ok(kept); assert.deepEqual([kept.x, kept.y], [e.x, e.y]);
  assert.deepEqual(restored.save.consequences, before); assert.equal('actorContact' in restored.exportSnapshot(5000), false);
});

test('grounded mech uses body contact and retains its existing overworld void permission', () => {
  const g = gameFixture(); g.save.mech = { built: true, active: true, mode: 'robot', fuel: 30, hp: 100 };
  assert.equal(g.mechUp(), true);
  for (let i = 0; i < 30; i++) g.update(.05, input(1, 0), 1000 + i * 50);
  assert.ok(Math.abs(gap(g) - radius(g.enemies[0])) < 1e-6);
  g.area = 'overworld'; g.map.exits = {}; g.player.x = 3; g.player.y = 5; g.enemies[0].x = 6; g.enemies[0].y = 5.7;
  for (const t of g.map.tiles) if (t.x === 4) Object.assign(t, { kind: 'starVoid', landscape: 'dream', blocked: true });
  const expected = { ...g.player, isPlayer: true, voidSuit: true };
  moveAxis(expected, 2.5, -.4, g.map, g.map.width, true);
  const trace = g.planGroundedPlayerMove(2.5, -.4, g.map.width, 5000);
  assert.ok(trace); assert.deepEqual([trace.endX, trace.endY], [expected.x, expected.y]);
  assert.ok(trace.endX > 5, 'the suit retains its legal void traversal');
});

test('pack knockback and glyph nudge use grounded contact without changing dodge immunity', () => {
  const g = gameFixture(); g.player.x = 4; const w = g.packWorld(.05, 1000);
  w.push({ x: 2, y: 5 }, 2.5, 5);
  assert.ok(Math.abs(gap(g) - radius(g.enemies[0])) < 1e-6);
  const x = g.player.x; g.player.dodgeUntil = 2000;
  assert.equal(w.push({ x: 8, y: 5 }, 2.5, 5), false); assert.equal(g.player.x, x);
  g.player.dodgeUntil = 0; g.enemies[0].x = 6;
  g.glyphWorld(1000).nudge(g.enemies[0], -3, 0);
  assert.ok(Math.abs(gap(g) - radius(g.enemies[0])) < 1e-6);
});

test('body contact does not replace legal stair Act destinations even when arrival overlaps', () => {
  const { game: g } = createLabFixture({ lab: 'close-view', scenario: 'keep', seed: 'CONTACT-ACT', now: 1000 });
  const up = g.map.objects.find(o => o.kind === 'buildingStair' && o.dir === 'up'); assert.ok(up);
  g.player.x = up.x; g.player.y = up.y; g.enemies = [foe(up.x, up.y)];
  assert.equal(g.interact('climb', up.id).ok, true); assert.equal(g.map.building.floor, 2);
  const down = g.map.objects.find(o => o.kind === 'buildingStair' && o.dir === 'down'); assert.ok(down);
  g.player.x = down.x; g.player.y = down.y; g.enemies = [foe(down.x, down.y)];
  assert.equal(g.interact('descend', down.id).ok, true); assert.equal(g.map.building.floor, 1);
});

test('Fists retain exact clear dash arithmetic, damage and clocks, and place blocked strikes at the accepted endpoint', () => {
  const make = () => { const g = gameFixture(); g.save.equipment.primary = { ...BRAWLER_GEAR[0].item }; g.enemies = [foe(6.1, 5.8)]; g.lockTarget(g.enemies[0].id); return g; };
  const a = make(), b = make(); b.moveGuardedCombatStep = function(x, y) { this.player.x = x; this.player.y = y; return true; };
  a.fistPunch(1, 1, 1000); b.fistPunch(1, 1, 1000);
  assert.deepEqual([a.player.x, a.player.y, a.player.attackUntil, a.player.invulnerableUntil, a.fistCombo], [b.player.x, b.player.y, b.player.attackUntil, b.player.invulnerableUntil, b.fistCombo]);
  assert.deepEqual(a.effects, b.effects, 'clear dash keeps canonical post-dash origins and damage');
  const g = make(); g.enemies = [foe(3.9, 5)]; g.lockTarget(g.enemies[0].id);
  g.fistPunch(2, 1, 1200, { x: 1, y: 0 });
  assert.ok(Math.abs(gap(g) - radius(g.enemies[0])) < 1e-6);
  const effect = g.effects.find(q => q.kind === 'iron-fist'); assert.ok(effect);
  assert.equal(effect.x, g.player.x + .5 + .7); assert.equal(effect.y, g.player.y + .45);
});

test('Shadow Boxing retains exact clear travel and stops against an intervening large body', () => {
  const make = () => { const g = gameFixture(); g.enemies = [foe(8, 5.4)]; g.lockTarget(g.enemies[0].id); return g; };
  const a = make(), b = make(); b.moveGuardedCombatStep = function(x, y) { this.player.x = x; this.player.y = y; return true; };
  assert.equal(a.shadowBoxStep(2, 1000), true); assert.equal(b.shadowBoxStep(2, 1000), true);
  assert.deepEqual([a.player.x, a.player.y, a.player.meleeAim], [b.player.x, b.player.y, b.player.meleeAim]);
  const g = make(), block = foe(5, 5, { id: 'intervening', bodyRadius: .85 }); g.enemies.push(block);
  g.shadowBoxStep(2, 1000);
  assert.ok(g.player.x < 4); assert.ok(gap(g, block) >= radius(block) - 1e-7);
  assert.equal(footprintOpen(g.map, g.map.width, g.player.x, g.player.y), true);
});
