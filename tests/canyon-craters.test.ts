// Canyon craters (Tim, 2026-10-30 and 2026-11-01): dungeons packed with dirt clods you drill through (green safe, yellow
// strains, red caves in; enough cave-ins collapse it for good), with caverns, lava, water and a bridged ravine, and the wreck
// of the fallen divine thing at the bottom, holding Divine Viscera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { CANYON, canyonHere, generateCanyon, isClod, clodSecret } from '../src/canyon.ts';
import { createCombatant } from '../src/combat.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { MONSTER_PACK, validateMonster } from '../src/monster-pack.ts';
import { ECHOES } from '../src/echoes.ts';

const SEED = 'CANYON1';
let spot = null; const findCrater = () => { if (spot) return spot; for (let x = 6; x < 90 && !spot; x++) for (let y = -40; y < 40 && !spot; y++) if (canyonHere(SEED, x, y)) { const s = freshSave(); s.seed = SEED; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); if (g.map.objects.some((o) => o.dungeonType === 'canyon')) spot = [x, y]; } return spot; };
const enter = (robot = true) => { const [x, y] = findCrater(), s = freshSave(); s.seed = SEED; if (robot) s.mech = { built: true, active: true, mode: 'robot', plate: 10 }; const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); const o = g.map.objects.find((q) => q.dungeonType === 'canyon'); g.player.x = o.x; g.player.y = o.y; const r = g.interact('enter', o.id); assert.ok(r.ok, r.message); return { s, g, o }; };
const standBy = (g, t, dx) => { g.player.x = t.x - dx; g.player.y = t.y - .1; };
const drill = (g, dx, seconds, step = .05) => { let r = null; for (let k = 0; k < seconds / step; k++) { r = g.drillAhead(dx, 0, step, 1000 + k * 50) || r; if (g.area === "dungeon") g.canyonTick(step, 1000 + k * 50); } return r; };
const history = (g) => g.save.consequences.dungeons[g.areaId()].canyon;

test('a crater is mostly clods, with caverns, lava, water, a bridged ravine and the wreck; the wreck can be dug to', () => {
  const m = generateCanyon(SEED, 'canyon:X:1:2'), clods = m.tiles.filter(isClod).length;
  assert.ok(clods > m.tiles.length * .45, `${clods} clods`); assert.ok(m.tiles.some((t) => t.kind === 'lava') && m.tiles.some((t) => t.kind === 'lakeWater') && m.tiles.some((t) => t.kind === 'skyBridge') && m.tiles.some((t) => t.kind === 'abyss'));
  const wreck = m.objects.find((o) => o.kind === 'divineWreck'), W = m.width, seen = new Set([m.entry.y * W + m.entry.x]), q = [m.entry];
  const pass = (t) => t && t.kind !== CANYON.kinds.wall && !['lava', 'abyss', 'lakeWater'].includes(t.kind);
  while (q.length) { const p = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, k = y * W + x; if (seen.has(k) || !pass(m.tiles[k])) continue; seen.add(k); q.push({ x, y }); } }
  assert.ok(seen.has(wreck.y * W + wreck.x), 'the wreck can be dug to');
  assert.deepEqual(generateCanyon(SEED, 'canyon:X:1:2').tiles.map((t) => t.kind), m.tiles.map((t) => t.kind), 'the same each time');
});

test('on foot the clods will not give; in the robot, push into a plain clod and the auger drills it out, and it stays out', () => {
  const foot = enter(false).g, ft = foot.map.tiles.find((q) => q.kind === CANYON.kinds.plain && !foot.map.tiles[q.y * foot.map.width + q.x - 1].blocked); standBy(foot, ft, 1); drill(foot, 1, 2); assert.ok(ft.blocked, 'by hand: no'); assert.match(foot.message, /robot/);
  const { g } = enter(); assert.ok(g.map.canyon);
  const t = g.map.tiles.find((q) => q.kind === CANYON.kinds.plain && !g.map.tiles[q.y * g.map.width + q.x - 1].blocked); assert.ok(t, 'a plain clod beside open ground');
  standBy(g, t, 1); const r = drill(g, 1, 1.2); assert.ok(r?.broke, 'drilled out'); assert.equal(t.blocked, false);
  g.loadArea('dungeon', false); assert.equal(g.map.tiles[t.y * g.map.width + t.x].blocked, false, 'stays drilled');
});

test('an unstable clod held too long climbs green → yellow → red; drilled in bursts it holds; red caves in, and the third kills and seals', () => {
  const { s, g } = enter(), W = g.map.width, besideOpen = (q) => !g.map.tiles[q.y * W + q.x - 1].blocked;
  const gs = g.map.tiles.filter((q) => q.kind === CANYON.kinds.green && besideOpen(q));
  standBy(g, gs[0], 1); drill(g, 1, .35); assert.equal(gs[0].kind, CANYON.kinds.yellow, 'strained yellow'); drill(g, 1, .3); assert.equal(gs[0].kind, CANYON.kinds.red, 'then red'); assert.ok(gs[0].blocked, 'not yet broken');
  standBy(g, gs[1], 1); for (let i = 0; i < 8 && gs[1].blocked; i++) { drill(g, 1, .2); drill(g, 0, .3); } assert.ok(!gs[1].blocked, 'drilled in bursts it broke'); assert.equal(history(g).caveIns, 0, 'without a cave-in');
  const hp = g.player.hp; standBy(g, gs[0], 1); drill(g, 1, 1); assert.equal(history(g).caveIns, 1); assert.ok(g.player.hp < hp, 'the cave-in hurts');
  const h = history(g); h.caveIns = CANYON.caveIn.limit - 1; const r = g.map.tiles.find((q) => q.kind === CANYON.kinds.red && q.blocked && besideOpen(q)); g.player.hp = s.maxHp; g.player.invulnerableUntil = 0; standBy(g, r, 1); drill(g, 1, 1.2);
  assert.equal(h.sealed, true); assert.ok(g.player.hp <= 0, 'the third cave-in kills');
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; for (let i = 0; i < 40 && g.area === 'dungeon'; i++) g.update(.05, idle, 5000 + i * 50);
  assert.equal(g.area, 'overworld', 'ejected');
  g.rx = findCrater()[0]; g.ry = findCrater()[1]; g.loadArea('overworld', false); assert.ok(g.map.objects.some((o) => o.name === 'Collapsed Crater') && !g.map.objects.some((o) => o.dungeonType === 'canyon'), 'sealed: no way in');
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).consequences.dungeons[Object.keys(s.consequences.dungeons).find((k) => k.startsWith('canyon:'))].canyon.sealed, true);
});

test('the wreck gives its Divine Viscera once', () => {
  const { s, g } = enter(), w = g.map.objects.find((o) => o.kind === 'divineWreck'), before = Number(s.skylands?.viscera) || 0;
  g.player.x = w.x; g.player.y = w.y; assert.ok(g.interact('pull', w.id).ok); assert.equal(s.skylands.viscera, before + CANYON.viscera);
  assert.ok(!g.interact('pull', w.id).ok); assert.equal(s.skylands.viscera, before + CANYON.viscera);
});

// Part 2 (Tim: "earth golems... crystal hermit crabs... finds"): the crater's own creatures, a Golem Warden by the wreck, and clods
// that hide a golem or a find.
test('the craters hold earth golems and crystal hermits, and a Golem Warden beside the wreck; both are sound and drawn', () => {
  const m = generateCanyon(SEED, 'canyon:X:1:2'), kinds = new Set(m.enemySpawns.map((e) => e.kind)), wreck = m.objects.find((o) => o.kind === 'divineWreck');
  assert.ok([...kinds].every((k) => ['earthGolem', 'crystalCrab'].includes(k)), [...kinds].join());
  const warden = m.enemySpawns.find((e) => e.boss); assert.equal(warden.kind, 'earthGolem'); assert.ok(Math.hypot(warden.x - wreck.x, warden.y - wreck.y) <= 2.5, 'by the wreck');
  for (const e of m.enemySpawns) assert.equal(m.tiles[e.y * m.width + e.x].blocked, false, `${e.id} stands on open ground`);
  for (const id of ['earthGolem', 'crystalCrab']) { assert.deepEqual(validateMonster(MONSTER_PACK[id]), []); assert.ok(MONSTER_PACK[id].dungeonOnly && ECHOES[id], id);
    const calls = []; const ctx = new Proxy({ getTransform: undefined, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) }, { get: (o, k) => k in o ? o[k] : () => calls.push(k), set: () => true });
    for (const hidden of [false, true]) { const e = createCombatant(id, 3, 4, false, []); e.hidden = hidden; assert.ok(drawPackMonster(ctx, e, 40, 1000, 'left')); } assert.ok(calls.length > 20, `${id} is drawn`); }
});

test('a clod may hide a golem that bursts out when drilled open, or a find; each pays once', () => {
  const { s, g } = enter(), W = g.map.width, id = g.areaId();
  const golemClod = g.map.tiles.find((q) => q.kind === CANYON.kinds.plain && clodSecret(SEED, id, q.x, q.y) === 'golem'), findClod = g.map.tiles.find((q) => q.kind === CANYON.kinds.plain && typeof clodSecret(SEED, id, q.x, q.y) === 'object' && clodSecret(SEED, id, q.x, q.y));
  assert.ok(golemClod && findClod, 'both kinds of secret exist');
  for (const t of [golemClod, findClod]) { g.map.tiles[t.y * W + t.x - 1].blocked = false; } // open a way to stand beside each
  const n = g.enemies.length; standBy(g, golemClod, 1); drill(g, 1, 1.2); assert.equal(golemClod.blocked, false);
  const golem = g.enemies.find((e) => e.kind === 'earthGolem' && e.id.includes(':clod:')); assert.ok(golem && golem.aggro, 'a golem bursts out'); assert.equal(g.enemies.length, n + 1); assert.match(g.message, /Golem/);
  const f = clodSecret(SEED, id, findClod.x, findClod.y), before = Number(s.materials?.[f.id]) || 0; standBy(g, findClod, 1); drill(g, 1, 1.2);
  assert.equal(s.materials[f.id], f.id === 'stone' ? Math.min(99, before + f.n) : before + f.n, `+${f.n} ${f.id}`);
  g.loadArea('dungeon', false); assert.equal(g.map.tiles[findClod.y * W + findClod.x].blocked, false, 'drilled for good: nothing to find again');
  assert.equal(clodSecret(SEED, id, findClod.x, findClod.y)?.n, f.n, 'hashed, the same each time');
});

test('the Golem Warden is a boss that leaves its Echo; the golem punches and the hermit sidles', () => {
  const w = createCombatant('earthGolem', 5, 5, true, []); assert.ok(w.boss && w.burrows && w.packAttacks.includes('golemPunch'));
  const c = createCombatant('crystalCrab', 5, 5, false, []); assert.ok(c.packAttacks.includes('clawSweep'));
});
