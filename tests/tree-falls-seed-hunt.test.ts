// Tree falls and seed-hunt follow-ups (Tim, 2026-11-19).
// (1) "Falling has always felt instant... when you try to make the transition between platforms, if you don't make it onto the
// platform, you just die instantly; there's no fall down to the platform below." Found headless on real generated trees: with the
// glider found, leaving a great tree's platform over a drop of four levels or more to the ground began the closed freefall at once,
// which dropped the Wayfarer's motion and cut her dodge short, so she fell straight down the gap to the ground (always lethal from
// up there); without the glider the very same move landed on the branch below. game.ts TREE_FALL: a fall off a great tree is the
// ordinary fall (it lands on whatever she is over: a lower branch, else the ground), the glider's freefall takes over only once she
// is clear of the platforms a missed transition could land on, and the doom cue, the rescues and exact resume are the fall's own.
// (2) Seed hunts: tree spots may be any great-tree platform the Wayfarer can reach, hops included (game.ts huntTreeReach); and each
// live hunt is one of the quests the compass cycles through when tapped (atlas-view.ts seedHuntObjectives, main.ts objectiveList).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave, normalizeGuidance } from '../src/types.ts';
import { Game, JUMP, FALL, GLIDE, TREE_FALL, FALL_RESCUE, fallAirtime, seedHuntSpots, huntTreeReach } from '../src/game.ts';
import { canStep, fallDamage, LETHAL_KINDS } from '../src/landscape.ts';
import { TALL_TOWERS, activeSeedHunts } from '../src/tall-towers.ts';
import { SEEDS } from '../src/skylands.ts';
import { compassGuidance, seedHuntObjectives, objectiveKey, SEED_HUNT_PICK } from '../src/atlas-view.ts';
import { APERTURE_SKILLS, APERTURE_BANDS } from '../src/items.ts';
import { ALT_UNLOCK_TIER, learnRank, BRANCHES, riftStep } from '../src/constellation.ts';
import { DRONE, ensureMech } from '../src/vehicle-gates.ts';

const W = 32, N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], V = 27; // landscape version the sections below are pinned to
const at = (m, x, y) => (x < 0 || y < 0 || x >= W || y >= W) ? null : m.tiles[y * W + x];
const footing = (t) => !!t && !t.blocked && !LETHAL_KINDS.has(t.kind);
const under = (g) => at(g.map, Math.floor(g.player.x + .5), Math.floor(g.player.y + .75));
const deaths = (g) => g.save.worldFlags.deaths || 0;
const same = (t, u) => !!t && !!u && t.x === u.x && t.y === u.y; // tiles of two loads of one section
const press = (x, y, key = null) => { let k = key; return { state: { x, y }, consume: (q) => q === k ? (k = null, true) : false, held: () => false }; };
// A section as a journey that first saw it at landscape `version` has it (great-tree-climb.test.ts loadAt).
function loadAt(seed, x, y, version = V, setup = (s) => {}) {
  const s0 = freshSave(); s0.seed = seed; const g0 = new Game(s0, 0); g0.rx = x; g0.ry = y; g0.loadArea('overworld');
  const pin = { ...s0.atlas[`${x},${y}`], landscapeVersion: version }, s = freshSave(); s.seed = seed; s.atlas = { [`${x},${y}`]: pin }; setup(s);
  const g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld'); g.enemies = []; g.map.enemySpawns = [];
  g.update(.05, press(0, 0), 900); g.enemies = []; g.player.hp = g.save.maxHp; g.player.stamina = 100; return g;
}
const full = (g) => g.save.maxHp, hurt = (g, levels) => fallDamage(levels, g.save.maxHp);
const TREE = ['CLIMB18', 70, 14], GROVE = ['CLIMB18', 73, 14]; // a spire 36 levels tall; a canopy grove (crowns at 26)
// A branch tile A at least `minL` up with, `d` along it, open ground (the gap) and then a lower branch B 2 or 3 levels under A.
function lowerAcrossGap(m, minL = 6) {
  for (const a of [...m.tiles].sort((p, q) => ((q.elev || 0) - (p.elev || 0)) || (p.y - q.y) || (p.x - q.x))) if (a.canopy && footing(a) && a.kind !== 'canopyTrunk' && (a.elev || 0) >= minL) for (const [dx, dy] of N4) {
    const gap = at(m, a.x + dx, a.y + dy), b = at(m, a.x + 2 * dx, a.y + 2 * dy), drop = (a.elev || 0) - (b?.elev || 0);
    if (gap && footing(gap) && !gap.canopy && !(gap.elev > 0) && b && footing(b) && b.canopy && drop >= 2 && drop <= 3) return { a, b, dx, dy, drop };
  }
  return null;
}
// A hop between twin tips (a sky platform, one tile of open ground, a canopy tile no lower than a level under it), at least `minL` up.
function hopAt(m, minL) {
  const out = []; for (const a of m.tiles) if (a.skyPlatform && a.canopy && (a.elev || 0) >= minL) for (const [dx, dy] of N4) {
    const gap = at(m, a.x + dx, a.y + dy), b = at(m, a.x + 2 * dx, a.y + 2 * dy);
    if (gap && footing(gap) && !gap.canopy && !(gap.elev > 0) && b?.canopy && (b.elev || 0) >= (a.elev || 0) - 1) out.push({ a, b, gap, dx, dy });
  }
  return out.sort((p, q) => (q.a.elev - p.a.elev) || (p.a.y - q.a.y) || (p.a.x - q.a.x))[0] || null;
}
function drive(g, t0 = 1000) { let t = t0; return { step(x = 0, y = 0, key = null) { t += 50; g.lastUpdateNow = t; g.update(.05, press(x, y, key), t); g.enemies = []; return t; }, now: () => t }; }

// ---------------------------------------------------------------------------------------------------------------- tree falls
test('the root cause: with the glider, a dodge off a branch toward the branch below no longer drops straight down the gap; it lands there, hurt by levels', () => {
  const probe = loadAt(...TREE), sc = lowerAcrossGap(probe.map); assert.ok(sc, 'a branch with a lower branch across a one-tile gap');
  const want = hurt(probe, sc.drop); assert.ok(want > 0 && want < full(probe), `${sc.drop} levels hurt but do not kill`);
  for (const glider of [false, true]) {
    const g = loadAt(...TREE, V, (s) => { s.glider = glider; }), d = drive(g); g.player.x = sc.a.x; g.player.y = sc.a.y - .25;
    let airborne = 0, sawGlide = false, landed = null;
    let over = false; // the thumb lets go once she is over the branch below (held on, she carries on past it)
    for (let i = 0; i < 80 && !landed; i++) { if (same(under(g), sc.b)) over = true; d.step(over ? 0 : sc.dx, over ? 0 : sc.dy, i === 0 ? 'dodge' : null); if (g.fall) airborne++; if (g.glide) sawGlide = true; if (i > 2 && !g.fall && !g.glide) landed = under(g); }
    assert.deepEqual([landed?.x, landed?.y], [sc.b.x, sc.b.y], `glider ${glider}: down on the branch below (${sc.b.x},${sc.b.y}@${sc.b.elev})`);
    assert.equal(g.player.hp, full(g) - want, `glider ${glider}: the fall table, by ${sc.drop} levels`); assert.equal(deaths(g), 0); assert.equal(sawGlide, false, 'no freefall on the way');
    assert.ok(airborne >= 3, `a real fall (${airborne} frames in the air)`);
  }
});

test('a missed hop onto the branch below: the sky jump carries her over the gap, the fall lands on the lower branch with level damage', () => {
  const probe = loadAt(...TREE), sc = lowerAcrossGap(probe.map);
  const g = loadAt(...TREE, V, (s) => { s.glider = true; }), d = drive(g); g.player.x = sc.a.x; g.player.y = sc.a.y - .25; let over = false, landed = null;
  for (let i = 0; i < 90 && !landed; i++) { if (same(under(g), sc.b)) over = true; d.step(over ? 0 : sc.dx, over ? 0 : sc.dy, i === 0 ? 'jump' : null); if (over && !(d.now() < g.jumpUntil) && !g.fall && !g.glide && i > 3) landed = under(g); }
  assert.ok(same(landed, sc.b), 'on the lower branch'); assert.equal(g.player.hp, full(g) - hurt(g, sc.drop)); assert.equal(deaths(g), 0);
});

// A hop that falls short: Jump at the tip's edge toward the twin tip, the stick let go once over the gap, so the jump ends there.
function shortHop(g, d, hop) {
  g.player.x = hop.a.x + hop.dx * .45; g.player.y = hop.a.y - .25 + hop.dy * .45; let over = false;
  for (let i = 0; i < 60 && !g.fall && !g.glide; i++) { if (same(under(g), hop.gap)) over = true; d.step(over ? 0 : hop.dx, over ? 0 : hop.dy, i === 0 ? 'jump' : null); }
  assert.ok(g.fall && same(under(g), hop.gap), 'the jump ended over the gap: a fall'); return d.now();
}
// The dodge toward the branch below (the first test), up to the frame the fall is under way.
function dodgeOff(g, d, sc) {
  g.player.x = sc.a.x; g.player.y = sc.a.y - .25; let over = false;
  for (let i = 0; i < 60 && !(g.fall && g.fall.t > .1); i++) { if (same(under(g), sc.b)) over = true; d.step(over ? 0 : sc.dx, over ? 0 : sc.dy, i === 0 ? 'dodge' : null); }
  return () => same(under(g), sc.b);
}

test('a missed hop over the ground from high up: a real fall over its airtime, the red cue, death only on landing (and once)', () => {
  const probe = loadAt(...TREE), hop = hopAt(probe.map, 12); assert.ok(hop, 'a high hop'); const L = hop.a.elev;
  const g = loadAt(...TREE), d = drive(g), jumpEnd = shortHop(g, d, hop); assert.equal(g.fall.tree, true, 'a fall off the tree'); assert.equal(g.glide, null);
  let doomed = 0, fell = 0, deathAt = null, aliveInAir = 0;
  for (let i = 0; i < 200 && deathAt == null; i++) { if (g.fall) { fell++; if (g.fallDoomed()) doomed++; if (g.player.hp > 0) aliveInAir++; } d.step(0); if (deaths(g) > 0) deathAt = d.now(); }
  assert.ok(deathAt, 'died on landing');
  const air = (deathAt - jumpEnd) / 1000, want = fallAirtime(L, -FALL.jumpExit); assert.ok(air >= want * .8, `${air.toFixed(2)} s in the air from ${L} levels (model ${want.toFixed(2)} s)`);
  assert.ok(doomed >= fell - 1 && doomed > 10, `the red cue the whole way down (${doomed}/${fell})`); assert.equal(aliveInAir, fell, 'alive until the landing'); assert.equal(deaths(g), 1);
  for (let i = 0; i < 40; i++) d.step(0); assert.equal(deaths(g), 1, 'never a second death');
});

test('with the glider: the fall off the tree says Jump opens it, Jump opens it in the fall; left alone, the freefall takes over once clear of the platforms', () => {
  const probe = loadAt(...TREE), hop = hopAt(probe.map, 12);
  const run = (jumpAfter) => { const g = loadAt(...TREE, V, (s) => { s.glider = true; }), d = drive(g); shortHop(g, d, hop); assert.equal(g.message, GLIDE.falling, 'Falling! Jump to open the glider.'); let freefallAt = null;
    for (let i = 0; i < 120 && !g.glide && !deaths(g); i++) { d.step(0, 0, i === jumpAfter ? 'jump' : null); if (g.glide) freefallAt = { open: g.glide.open, z: g.glide.z, from: g.glide.fallFrom }; }
    return { g, freefallAt };
  };
  const open = run(2); assert.equal(open.g.glide?.open, true, 'Jump in the fall opens the glider'); assert.equal(open.g.message, GLIDE.open); assert.equal(open.g.player.hp, full(open.g));
  const left = run(null); assert.equal(left.freefallAt?.open, false, 'then the closed freefall'); assert.ok(left.freefallAt.from - left.freefallAt.z >= TREE_FALL.clear - 1e-9, 'only once clear of the platforms below');
  assert.equal(left.g.message, GLIDE.falling); assert.equal(left.g.fallDoomed(), true, 'still lethal until the glider opens');
});

test('rescues mid-fall off a tree: Aerial Step holds it, Rift Step steps out of it, a docked drone answers Jump', () => {
  const probe = loadAt(...TREE), hop = hopAt(probe.map, 12);
  const skills = (s, { rift = false, drone = false } = {}) => { s.perception.aperture = Math.max(3255, APERTURE_BANDS[ALT_UNLOCK_TIER].threshold); s.magicSkills.learned = { quickening: 3, 'aerial-step': 1 }; s.constellation.mods['light-feet'] = true; s.constellation.caps.motion = 'aerial-step';
    if (rift) for (let i = 0; i < APERTURE_SKILLS[BRANCHES.rift.active].maxRank; i++) learnRank(s, 'rift'); if (drone) { s.farArray = { listeners: 10, gate: 5 }; s.mech = { built: true, active: false, mode: 'drone', fuel: DRONE.carry }; ensureMech(s); } };
  const intoFall = (opts) => { const g = loadAt(...TREE, V, (s) => skills(s, opts)), d = drive(g); shortHop(g, d, hop);
    for (let i = 0; i < 60 && !(g.fall && g.fall.z < hop.a.elev - 2); i++) d.step(0); assert.ok(g.fall?.tree && g.fallDoomed(), 'in a lethal fall off the tree'); return { g, d }; };
  { const { g, d } = intoFall(); g.lastUpdateNow = d.now(); assert.equal(g.activateApertureSkill('aerial-step'), true); d.step(0); assert.equal(g.aerialHeld(), true, 'Aerial Step catches it'); assert.equal(g.fallDoomed(), false); assert.equal(g.player.hp, full(g)); }
  { const { g, d } = intoFall({ rift: true }); g.player.lastMoveVector = { x: 1, y: 0 }; g.lastUpdateNow = d.now(); assert.equal(riftStep(g, d.now()), true); assert.equal(g.fall, null); assert.equal(g.message, FALL_RESCUE.rift); for (let i = 0; i < 20; i++) d.step(0); assert.equal(deaths(g), 0); }
  { const { g, d } = intoFall({ drone: true }); assert.equal(g.droneCallable(), true); d.step(0, 0, 'jump'); assert.equal(g.fall, null, 'caught'); assert.ok(g.droneLift); assert.equal(g.message, FALL_RESCUE.callDrone); }
});

test('reload mid-fall off a tree resumes exactly (height, speed, clock, the tree mark, the crown memory) and lands frame for frame', () => {
  const probe = loadAt(...TREE), sc = lowerAcrossGap(probe.map), hop = hopAt(probe.map, 12);
  for (const kind of ['lower', 'lethal']) {
    const g = loadAt(...TREE, V, (s) => { s.glider = true; }), d = drive(g);
    if (kind === 'lower') dodgeOff(g, d, sc); else { shortHop(g, d, hop); for (let i = 0; i < 4; i++) d.step(0); }
    assert.ok(g.fall?.tree, `${kind}: mid-fall`); const snap = JSON.parse(JSON.stringify(g.exportSnapshot(d.now())));
    assert.equal(snap.session.playerRuntime.fall.tree, true, 'saved with the fall (additive)');
    const r = new Game(migrateSave(snap), d.now()); r.enemies = []; r.map.enemySpawns = [];
    for (const k of ['z', 'vz', 'from', 't', 'tree']) assert.equal(r.fall?.[k], g.fall[k], `${kind}: fall.${k}`);
    assert.deepEqual([r.player.x, r.player.y], [g.player.x, g.player.y]); assert.deepEqual(r.glideHome, g.glideHome);
    const dg = drive(g, d.now()), dr = drive(r, d.now()); let match = true;
    const toward = (q) => kind === 'lower' && !same(under(q), sc.b) ? [sc.dx, sc.dy] : [0, 0]; // the thumb as before the save: on toward the branch below until over it
    for (let i = 0; i < 120 && (g.fall || r.fall || g.glide || r.glide); i++) { dg.step(...toward(g)); dr.step(...toward(r)); const a = g.fall || g.glide, b = r.fall || r.glide; if (!!a !== !!b || a && Math.abs(a.z - b.z) > 1e-9 || Math.abs(g.player.x - r.player.x) > 1e-9 || Math.abs(g.player.y - r.player.y) > 1e-9) match = false; }
    for (let k = 0; k < 10; k++) { dg.step(0); dr.step(0); }
    assert.ok(match, `${kind}: frame for frame`); assert.equal(r.player.hp, g.player.hp); assert.equal(deaths(r), deaths(g));
    if (kind === 'lower') { assert.ok(same(under(r), sc.b), 'the reloaded copy lands on the branch below too'); assert.equal(r.player.hp, full(r) - hurt(r, sc.drop)); }
    else assert.equal(deaths(r), 1, 'one death on the reloaded copy');
  }
});

// ---------------------------------------------------------------------------------------------------------------- seed hunts
// An independent solver with the real movement rules (canStep) and the trees' hops (the movesFrom of great-tree-climb and
// canopy-grove-v21): walks and one-level jumps that never hurt, and from a sky platform the sky jump over one gap tile.
const BUDGET = JUMP.sky / 1000 * 2.4;
function moves(m, a) {
  const out = []; for (const [dx, dy] of N4) {
    const b = at(m, a.x + dx, a.y + dy); if (footing(b) && (a.elev || 0) - (b.elev || 0) <= 1 && (canStep({ isPlayer: true, jumping: false }, m, W, a.x, a.y, b.x, b.y) || canStep({ isPlayer: true, jumping: true }, m, W, a.x, a.y, b.x, b.y))) out.push({ to: b, hop: false });
    if (!a.skyPlatform || !a.canopy) continue; const L = a.elev || 0; let prev = a;
    for (let k = 1; k <= 2 && k - .5 <= BUDGET; k++) { const g = at(m, a.x + dx * k, a.y + dy * k); if (!g || g.blocked || LETHAL_KINDS.has(g.kind) || !canStep({ isPlayer: true, jumping: true, airElev: L }, m, W, prev.x, prev.y, g.x, g.y)) break; if (g.canopy && (g.elev || 0) >= L - 1) { if (k > 1) out.push({ to: g, hop: true }); break; } prev = g; }
  }
  return out;
}
function solve(m, from, goal) { const seen = new Set([from.y * W + from.x]), q = [{ t: from, hops: 0 }]; for (let i = 0; i < q.length; i++) { if (goal(q[i].t)) return q[i]; for (const mv of moves(m, q[i].t)) { const j = mv.to.y * W + mv.to.x; if (!seen.has(j)) { seen.add(j); q.push({ t: mv.to, hops: q[i].hops + (mv.hop ? 1 : 0) }); } } } return null; }

test('seed hunts: tree spots reach high into the crowns, hops included; every one is reached from the ground and left again by the real rules', () => {
  assert.equal(TALL_TOWERS.seedHunt.treeHops, true); assert.equal(TALL_TOWERS.seedHunt.treeGap, 1);
  let hopOnly = 0, highest = 0;
  for (const [seed, x, y] of [GROVE, TREE]) {
    const g = loadAt(seed, x, y), m = g.map, P = seedHuntSpots(m), top = m.canopy.top; assert.ok(P.tree.length, `${seed} ${x},${y}: tree spots`);
    assert.deepEqual(seedHuntSpots(loadAt(seed, x, y).map).tree.map((t) => [t.x, t.y]), P.tree.map((t) => [t.x, t.y]), 'deterministic');
    const ground = (t) => !t.canopy && P.ok[t.y * W + t.x] === 1;
    for (const t of P.tree) {
      const up = m.tiles.filter(ground).find((s) => solve(m, s, (q) => q === t) !== null); assert.ok(up, `${x},${y}: ${t.x},${t.y}@${t.elev} reached from the ground`);
      const down = solve(m, t, ground); assert.ok(down, `${x},${y}: and back down from ${t.x},${t.y}@${t.elev}`);
      if (P.ok[t.y * W + t.x] !== 1) hopOnly++; highest = Math.max(highest, t.elev / top);
    }
  }
  assert.ok(hopOnly >= 3, `${hopOnly} spots only the hop-aware climb reaches (release 1003 offered none of them)`); assert.ok(highest >= .9, 'up at the crowns');
});

test('seed hunts: a new tree placement uses the hop-aware spots; a hunt that already has its spot keeps it', () => {
  const [seed, x, y] = GROVE, probe = loadAt(seed, x, y), P = seedHuntSpots(probe.map), tower = `tower:${seed}:0:0:1:9:0`;
  const make = (extra) => loadAt(seed, x, y, V, (s) => { s.seedHunts = { [tower]: { v: 1, tower, from: { rx: 0, ry: 0 }, rx: x, ry: y, kind: 'crimson', state: 'active', ...extra } }; });
  const g = make({ where: 'tree' }), o = g.map.objects.find((q) => q.seedHunt === tower), h = g.save.seedHunts[tower];
  assert.ok(o && P.tree.some((t) => t.x === o.x && t.y === o.y), 'on a hop-aware tree spot'); assert.equal(o.cacheElev, h.elev); assert.equal(h.where, 'tree');
  const old = probe.map.tiles.find((t) => t.canopy && !t.slope && t.elev > 0 && P.ok[t.y * W + t.x] === 1 && !(t.x === o.x && t.y === o.y)) || P.tree.find((t) => !(t.x === o.x && t.y === o.y));
  const k = make({ where: 'tree', x: old.x, y: old.y, elev: old.elev }), ko = k.map.objects.find((q) => q.seedHunt === tower);
  if (ko.x === old.x && ko.y === old.y) assert.equal(k.save.seedHunts[tower].x, old.x, 'the kept spot stays'); else assert.ok(P.tree.some((t) => t.x === ko.x && t.y === ko.y), 'a kept spot that no longer stands is chosen again by the rule');
  const spot = P.tree.at(-1), kept = make({ where: 'tree', x: spot.x, y: spot.y, elev: spot.elev }), keptObj = kept.map.objects.find((q) => q.seedHunt === tower);
  assert.deepEqual([keptObj.x, keptObj.y, keptObj.cacheElev], [spot.x, spot.y, spot.elev], 'the saved spot is the spot');
  assert.ok(huntTreeReach(probe.map, P.ok)[spot.y * W + spot.x] === 1);
});

test('the compass: each live seed hunt is an entry in the tap list ("Seed hunt · <seed>"), and tracking it points at its section and its seed', () => {
  const tA = 'tower:C:0:0:1:9:0', tB = 'tower:C:5:5:1:9:0', s = freshSave(); s.seed = 'C';
  s.seedHunts = { [tA]: { v: 1, tower: tA, from: { rx: 0, ry: 0 }, rx: 4, ry: -2, kind: 'crimson', state: 'active', where: 'tree', x: 12, y: 9, elev: 20 }, [tB]: { v: 1, tower: tB, from: { rx: 5, ry: 5 }, rx: 1, ry: 1, kind: 'crimson', state: 'active', where: 'crossing', door: { x: 7, y: 21 }, dungeonId: 'x' } };
  const names = { crimson: SEEDS.crimson.name }, list = seedHuntObjectives(activeSeedHunts(s), names, 0, 0);
  assert.deepEqual(list.map((o) => [o.tower, o.rx, o.ry, o.x, o.y, o.name]), [[tB, 1, 1, 7, 21, `Seed hunt · ${SEEDS.crimson.name}`], [tA, 4, -2, 12, 9, `Seed hunt · ${SEEDS.crimson.name}`]], 'nearest first; the seed, or its crossing\'s door');
  assert.equal(objectiveKey(list[1]), `${SEED_HUNT_PICK}${tA}`); assert.equal(objectiveKey({ kind: 'crossing', rx: 3, ry: 4 }), '3,4', 'every other objective keeps its section key');
  assert.deepEqual(compassGuidance(s, { area: 'overworld', pick: list[1] }), { area: 'overworld', rx: 4, ry: -2, x: 12, y: 9, kind: 'guidance', name: `Seed hunt · ${SEEDS.crimson.name}` }, 'tracked: the section and the seed in it');
  assert.equal(normalizeGuidance({ pick: objectiveKey(list[1]) }).pick, `${SEED_HUNT_PICK}${tA}`, 'the pick survives a reload'); assert.equal(normalizeGuidance({ pick: 'seed-hunt:<script>' }), null);
  s.seedHunts[tA].state = 'found'; assert.deepEqual(seedHuntObjectives(activeSeedHunts(s), names).map((o) => o.tower), [tB], 'a found hunt leaves the list');
});

test('main.ts: the tap list holds the seed hunts and the tap cycles onto them, pick by pick, then lets go', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const fn = (name) => { const i = main.indexOf(`function ${name}(`), j = main.indexOf('\n}', i); return main.slice(i, j + 2); };
  const tapStart = main.indexOf('  const list=objectiveList();if(!list.length)'), tap = main.slice(tapStart, main.indexOf('\n});', tapStart));
  assert.ok(tapStart > 0 && /compassPick=objectiveKey\(next\)/.test(tap), 'the tap keys its pick by objectiveKey');
  const compassObjective = main.slice(main.indexOf('function compassObjective()'), main.indexOf('\n', main.indexOf('function compassObjective()')));
  const tA = 'tower:C:0:0:1:9:0', s = freshSave(); s.seed = 'C'; s.seedHunts = { [tA]: { v: 1, tower: tA, from: { rx: 0, ry: 0 }, rx: 3, ry: 0, kind: 'crimson', state: 'active' } };
  const game = { rx: 0, ry: 0, message: '' };
  const make = new Function('game', 'save', 'performance', 'wayfindingTargets', 'openChallengeSections', 'OBJECTIVE_KINDS', 'CHALLENGE_SITES', 'COMPASS_OBJECTIVE_LIMIT', 'activeSeedHunts', 'seedHuntObjectives', 'SEEDS', 'objectiveKey', 'compassHeading', 'rememberGuidance',
    `let objectiveCache={key:null,list:[],all:[]},compassPick=null,compassPin=null;\n${fn('objectiveList')}\n${compassObjective}\nfunction tapOnce(){${tap}\n}\nreturn {tapOnce,pick:()=>compassPick,current:()=>compassObjective()};`);
  const crossings = [{ kind: 'crossing', rx: 1, ry: 0, name: 'Crossing A' }, { kind: 'crossing', rx: -2, ry: 0, name: 'Crossing B' }];
  const api = make(game, s, { now: () => 0 }, () => crossings, () => new Map(), { hunt: { rank: 0 }, story: { rank: 1 }, challenge: { rank: 2 }, danger: { rank: 3 }, crossing: { rank: 4 }, event: { rank: 5 } }, {}, 12, activeSeedHunts, seedHuntObjectives, SEEDS, objectiveKey, () => 'east', () => {});
  const seen = []; for (let i = 0; i < 4; i++) { api.tapOnce(); seen.push(api.pick()); }
  assert.deepEqual(seen, [`${SEED_HUNT_PICK}${tA}`, '1,0', '-2,0', null], 'the seed hunt first, then the other objectives, then no needle');
  api.tapOnce(); assert.equal(api.current()?.name, `Seed hunt · ${SEEDS.crimson.name}`); assert.match(game.message, /Compass \(1\/3\): Seed hunt · /);
});
