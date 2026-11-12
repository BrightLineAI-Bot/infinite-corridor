// The Gaunt (duelists.ts; Tim, 2026-11-12): three hooded, stick-thin duelists (sword, daggers, polearm). Stats against their tier,
// the smarter AI (approach, strafe, hops that clear one level, a hop out after an attack, no stacking, stagger respected), the attack
// shapes and their telegraphs, spawn gating (old floors and existing generation untouched), the Close View body (budgets,
// proportions, every animation finite) and a save round trip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DUELISTS, DUELIST_KINDS, duelistStats, duelistPlan, duelistSpawns, findHop, hopClear } from '../src/duelists.ts';
import { MONSTER_PACK, PACK_KINDS, GUARDIAN_POOL, PACK_ECOLOGY_ADDITIONS, OVERWORLD_PACK_POOLS, ATTACK_MODULES, packVariant, updatePackMonster, tickPackEffects, addPackEffect, freshPackState, resetPackRuntime, staggerClass } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { regionalScale, Game, generatePinnedDungeon, pinDungeonLayout, footprintOpen, footprintHazard } from '../src/game.ts';
import { regionalThreat, dungeonId } from '../src/world.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { elevationAt } from '../src/landscape.ts';
import { drawPackMonster } from '../src/monster-render.ts';
import { duelistPose } from '../src/duelist-render.ts';
import { BEAST_SLOT } from '../src/close-view-beast-rig.ts';
import { CLOSE_VIEW_BEASTS, DUELIST_SLOT, closeViewBeastEligible } from '../src/close-view-beasts.ts';
import { DUELIST_RIG, DUELIST_SKELETON, WAYFARER_CV_HEIGHT, duelistMeshFor, createDuelistTrack, sampleDuelist, duelistBone } from '../src/close-view-beast-duelist.ts';
import { DUELIST_BODY } from '../src/close-view-beast-duelist-body.ts';

// ---------------------------------------------------------------- a pack world (the adventure creatures' test world, with levels)
function world({ size = 26, walls = [], level = () => 0, player = { x: 13, y: 13 } } = {}) {
  const blocked = new Set(walls.map(([x, y]) => `${x},${y}`)), cell = (v) => Math.floor(v + .5);
  const open = (x, y) => { const tx = cell(x), ty = cell(y); return tx >= 0 && ty >= 0 && tx < size && ty < size && !blocked.has(`${tx},${ty}`); };
  const lv = (x, y) => level(cell(x), cell(y));
  const w = {
    player: { ...player, hp: 1e6 }, width: size, height: size, dt: 1 / 30, now: 0, enemies: [], effects: [], hurts: [], playerVelocity: { x: 0, y: 0 }, playerFacing: { x: 1, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), projectileOpen: (x, y) => open(x - .5, y - .5), elevation: lv,
    los(a, b) { const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4) || 1; for (let i = 1; i < steps; i++) if (!open(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false; return true; },
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; if (!e.flying && lv(e.x + dx, e.y + dy) !== lv(e.x, e.y)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source, at: w.now, jumpable: !!opts.jumpable }); w.player.hp -= amount; return true; },
    slow() {}, addEffect(effect) { addPackEffect(w.effects, effect, w.now); },
  };
  return w;
}
function spawn(kind, x, y, w) { const e = createCombatant(kind, x, y); e.id = `gaunt:${kind}:${x}:${y}:${w.enemies.length}`; e.aggro = true; w.enemies.push(e); return e; }
function step(w, seconds, each = null) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) updatePackMonster(e, w); w.effects = tickPackEffects(w.effects, w); each?.(w); } }
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ---------------------------------------------------------------- the roster and its numbers
test('three kinds, kept out of every existing roster, pool, Echo list and hybrid roll', () => {
  assert.deepEqual(DUELIST_KINDS, ['gauntDuelist', 'gauntCutthroat', 'gauntLongarm']);
  for (const k of DUELIST_KINDS) {
    const d = MONSTER_PACK[k]; assert.ok(d.prototypeOnly && d.duelistKin && d.noEcho, k); assert.equal(d.brain, 'fencer');
    assert.ok(!PACK_KINDS.includes(k)); assert.ok(!GUARDIAN_POOL.includes(k));
    for (const list of Object.values(PACK_ECOLOGY_ADDITIONS)) assert.ok(!list.some(([q]) => q === k));
    for (const list of Object.values(OVERWORLD_PACK_POOLS)) assert.ok(!(list || []).includes(k));
    assert.deepEqual(packVariant(k, 'any'), { hybridAttack: null, donor: null });
    assert.equal(staggerClass(createCombatant(k, 1, 1)), null); // an ordinary creature: the ordinary stagger governor and windup hold apply
  }
  // existing creatures' hybrid rolls never draw a Gaunt blade
  const blades = new Set(Object.keys(DUELISTS.attacks));
  for (const k of PACK_KINDS) for (let i = 0; i < 40; i++) assert.ok(!blades.has(packVariant(k, `id${i}`).hybridAttack));
});

test('health 1.6 to 2 times an ordinary creature of the same tier; damage inside the ordinary range; no blow above the strongest ordinary one', () => {
  const medium = PACK_KINDS.filter((k) => MONSTER_PACK[k].sizeClass === 'medium' && !MONSTER_PACK[k].unique && !MONSTER_PACK[k].minion).map((k) => MONSTER_PACK[k].stats[0]).sort((a, b) => a - b);
  assert.equal(DUELISTS.reference.hp, medium[Math.floor(medium.length / 2)], 'the reference is the medium ordinary median');
  const ordinary = PACK_KINDS.filter((k) => !MONSTER_PACK[k].unique && MONSTER_PACK[k].stats[0] < 120), dmg = ordinary.map((k) => MONSTER_PACK[k].stats[1]);
  const strongest = Math.max(...ordinary.flatMap((k) => MONSTER_PACK[k].attacks.map((a) => MONSTER_PACK[k].stats[1] * (ATTACK_MODULES[a]?.damage ?? 1))));
  for (const k of DUELIST_KINDS) {
    const [hp, damage] = duelistStats(k); assert.deepEqual(MONSTER_PACK[k].stats, [hp, damage, 0]);
    assert.ok(hp >= 1.6 * DUELISTS.reference.hp && hp <= 2 * DUELISTS.reference.hp, `${k} hp ${hp}`);
    assert.ok(damage >= Math.min(...dmg) && damage <= Math.max(...dmg), `${k} damage ${damage}`);
    for (const a of MONSTER_PACK[k].attacks) assert.ok(Math.ceil(damage * ATTACK_MODULES[a].damage) <= strongest, `${k} ${a}`);
  }
  // after the same regional scaling (the one helper every spawn takes), the ratio to an ordinary medium creature holds at every ring
  for (const ring of [0, 12, 40, 80, 150]) {
    const q = regionalThreat(ring, 0), lynx = regionalScale(createCombatant('riftLynx', 1, 1), q);
    for (const k of DUELIST_KINDS) { const e = regionalScale(createCombatant(k, 1, 1), q), r = e.maxHp / lynx.maxHp; assert.ok(r >= 1.6 && r <= 2.02, `${k} ring ${ring}: ${r}`); assert.ok(e.damage <= lynx.damage * 1.15 + 1, `${k} ring ${ring} damage`); }
  }
});

// ---------------------------------------------------------------- the AI
test('it closes in from afar, then circles the Wayfarer inside its band', () => {
  for (const k of DUELIST_KINDS) {
    const w = world(), e = spawn(k, 3, 13, w), [near, far] = DUELISTS.ai[k].preferred;
    e.packAttacks = []; // no attacks: only movement
    step(w, 6); const d = dist(e, w.player); assert.ok(d <= far + .9 && d >= near - .9, `${k} settled at ${d}`);
    let turned = 0, prev = Math.atan2(e.y - 13, e.x - 13), min = Infinity, max = 0;
    step(w, 5, () => { const a = Math.atan2(e.y - 13, e.x - 13); turned += Math.abs(Math.atan2(Math.sin(a - prev), Math.cos(a - prev))); prev = a; const dd = dist(e, w.player); min = Math.min(min, dd); max = Math.max(max, dd); });
    assert.ok(turned > .9, `${k} strafed ${turned.toFixed(2)} rad`); assert.ok(min > .9 && max < far + 3, `${k} kept its distance ${min.toFixed(2)}..${max.toFixed(2)}`);
  }
});

test('a hop clears one level (never two), lands on open ground and never through a wall', () => {
  // the Wayfarer on a terrace one level up: walking cannot change level, so only a hop gets it there
  const terrace = (x, y) => (x >= 15 ? 1 : 0), w = world({ level: terrace, player: { x: 18, y: 13 } }), e = spawn('gauntDuelist', 8, 13, w); e.packAttacks = [];
  let landed = null; step(w, 10, () => { if (landed == null && w.elevation(e.x, e.y) === 1 && !e.pack.duelHop) landed = { ...e }; });
  assert.ok(landed, 'it reached the terrace by a hop'); assert.ok(w.open(landed.x, landed.y));
  // two levels up: it never gets there
  const cliff = (x, y) => (x >= 15 ? 2 : 0), w2 = world({ level: cliff, player: { x: 18, y: 13 } }), e2 = spawn('gauntDuelist', 8, 13, w2); e2.packAttacks = [];
  step(w2, 10, () => assert.ok(w2.elevation(e2.x, e2.y) === 0 || e2.pack.duelHop, 'never onto a two-level rise'));
  // the pure rule
  const W = world({ level: (x) => (x >= 10 ? 1 : 0) });
  assert.ok(hopClear(W, { x: 8, y: 5 }, { x: 10, y: 5 })); assert.ok(!hopClear(world({ level: (x) => (x >= 10 ? 2 : 0) }), { x: 8, y: 5 }, { x: 10, y: 5 }));
  assert.ok(!hopClear(world({ walls: [[9, 5]] }), { x: 8, y: 5 }, { x: 10, y: 5 }), 'not through a wall');
  for (const mode of ['close', 'back', 'side', 'circle']) { const to = findHop({ id: 'h', x: 8, y: 8 }, W, { x: 12, y: 8 }, mode); assert.ok(to && hopClear(W, { x: 8, y: 8 }, to), mode); }
});

test('after it attacks it hops back or aside; the Cutthroat always darts back out', () => {
  const w = world(), e = spawn('gauntCutthroat', 9, 13, w); let out = 0, attacks = 0, lastEnd = null, was = false;
  step(w, 14, () => {
    const s = e.pack; if (s.attack) { was = true; return; }
    if (was) { was = false; attacks++; lastEnd = dist(e, w.player); }
    if (s.duelHop && s.duelHop.mode === 'back' && lastEnd != null) { out++; lastEnd = null; }
  });
  assert.ok(attacks >= 3, `${attacks} attacks`); assert.ok(out >= attacks - 1, `${out} hops out of ${attacks}`);
  const w2 = world(), e2 = spawn('gauntCutthroat', 9, 13, w2); let after = null, before = null;
  step(w2, 6, () => { const s = e2.pack; if (s.attack && s.phase === 'recover') before = dist(e2, w2.player); if (s.duelHop?.mode === 'back' && before != null && after == null) after = s.duelHop.to; });
  assert.ok(after && dist(after, w2.player) > before + .5, 'farther after its hop');
});

test('a band never stacks: they keep apart while they fight', () => {
  const w = world(); for (let i = 0; i < 3; i++) spawn(DUELIST_KINDS[i], 6 + i * .05, 13, w);
  let worst = Infinity; step(w, 8, (W) => { if (W.now < 1500) return; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) worst = Math.min(worst, dist(W.enemies[i], W.enemies[j])); });
  assert.ok(worst > .55, `closest pair ${worst.toFixed(2)}`);
});

test('a stunned Gaunt starts no hop and no attack; a hop in flight still lands; a windup blow holds, never cancels', () => {
  const w = world(), e = spawn('gauntDuelist', 10, 13, w);
  e.hitStun = 5; const seq = e.pack.seq; step(w, .5); assert.equal(e.pack.seq, seq); assert.ok(!e.pack.duelHop); // (past .6 s the stagger governor frees it: no stun-lock)
  const w2 = world(), h = spawn('gauntDuelist', 10, 13, w2); h.pack.duelHop = { from: { x: 10, y: 13 }, to: { x: 11.5, y: 13 }, t: 0, climb: 0, mode: 'side' }; h.hitStun = .5;
  step(w2, .2); assert.ok(h.pack.duelHop && h.hopLift > 0 && h.x > 10, 'in the air under the blow'); step(w2, .25);
  assert.ok(!h.pack.duelHop && Math.abs(h.x - 11.5) < 1e-6 && h.hopLift === 0, 'landed');
  // a blow during a windup holds it (release 561), never cancels it: the swing still comes
  const w3 = world({ player: { x: 11.6, y: 13 } }), c = spawn('gauntDuelist', 10, 13, w3); c.packAttacks = ['duelCombo']; let held = false;
  step(w3, 3, () => { if (!held && c.pack.attack === 'duelCombo' && c.pack.phase === 'windup') { held = true; c.hitStun = .2; } });
  assert.ok(held && w3.hurts.some((q) => q.source === 'duelCombo'), 'the held swing lands');
  // after a reload a hop never resumes mid-air
  e.pack.duelHop = { from: { x: 11, y: 13 }, to: { x: 12, y: 13 }, t: .1, climb: 0, mode: 'side' }; e.hopLift = .5; resetPackRuntime(e); assert.ok(!e.pack.duelHop && e.hopLift === 0);
});

// ---------------------------------------------------------------- the attacks
function oneAttack(kind, id, player, { feint = null } = {}) {
  const w = world({ player }), e = spawn(kind, 10, 13, w); e.packAttacks = [id];
  const log = { teleAt: null, hitAt: null, shapes: new Set(), feint: false, hits: 0, end: null };
  step(w, 4, () => { const s = e.pack; if (s.attack === id) { if (s.tele && log.teleAt == null) log.teleAt = w.now; if (s.tele) log.shapes.add(s.tele.type); if (s.data?.feint) log.feint = true; if (s.phase === 'recover' && log.end == null) log.end = w.now; } if (w.hurts.length && log.hitAt == null) log.hitAt = w.now; log.hits = w.hurts.length; if (log.end != null) e.packAttacks = []; });
  return { ...log, w, e };
}
test('each attack shows its shape before any blow, at least .4 s, and hits only inside it', () => {
  const cases = [['gauntDuelist', 'duelCombo', 'arc', 3], ['gauntCutthroat', 'duelTwinCuts', 'lane', 2], ['gauntLongarm', 'duelThrust', 'rect', 1], ['gauntLongarm', 'duelSweep', 'arc', 1]];
  for (const [kind, id, shape, cuts] of cases) {
    const inside = id === 'duelThrust' ? { x: 12.8, y: 13 } : id === 'duelTwinCuts' ? { x: 12.5, y: 13 } : { x: 11.6, y: 13 };
    const r = oneAttack(kind, id, inside);
    assert.ok(r.shapes.has(shape), `${id}: ${[...r.shapes]}`); assert.ok(r.hitAt != null, `${id} lands inside its shape`);
    assert.ok(r.hitAt - r.teleAt >= 400 - 1, `${id}: telegraph ${r.hitAt - r.teleAt} ms before the blow`);
    assert.equal(r.hits, cuts, `${id}: ${r.hits} blows`);
    assert.ok(ATTACK_MODULES[id].windup >= .4);
  }
  // the long thrust reaches 3.5 tiles down a narrow line, and misses a step to the side
  assert.ok(oneAttack('gauntLongarm', 'duelThrust', { x: 13.3, y: 13 }).hits === 1);
  { const w = world({ player: { x: 12.8, y: 13 } }), e = spawn('gauntLongarm', 10, 13, w); e.packAttacks = ['duelThrust']; // the aim is fixed when the windup starts
    step(w, 3, () => { if (e.pack.attack === 'duelThrust') w.player.y = 14.4; }); assert.ok(!w.hurts.length, 'a step off the line and the thrust misses'); }
  // behind the sword's arc: no blow (the Wayfarer steps behind it right after the windup starts)
  const w = world({ player: { x: 11.6, y: 13 } }), e = spawn('gauntDuelist', 10, 13, w); e.packAttacks = ['duelCombo'];
  step(w, 4, () => { if (e.pack.attack === 'duelCombo') { w.player.x = 8.6; w.player.y = 13; } });
  assert.ok(!w.hurts.some((h) => h.source === 'duelCombo'), 'behind it, every cut misses');
  // the sweep is low: a jump clears it (jumpable)
  assert.ok(oneAttack('gauntLongarm', 'duelSweep', { x: 11.6, y: 13 }).w.hurts.every((h) => h.jumpable));
});

test('feints hold some swings longer, the telegraph shown all the while', () => {
  let feints = 0, plain = 0;
  for (let i = 0; i < 30; i++) {
    const w = world({ player: { x: 11.6, y: 13 } }), e = createCombatant('gauntDuelist', 10, 13); e.id = `feint:${i}`; e.aggro = true; w.enemies.push(e); e.packAttacks = ['duelCombo'];
    let start = null, first = null, feint = false; step(w, 2.5, () => { const s = e.pack; if (s.attack && start == null) start = w.now; if (s.data?.feint) feint = true; if (w.hurts.length && first == null) first = w.now; if (s.attack && s.phase === 'windup') assert.ok(s.tele); });
    if (first == null) continue; const wind = first - start;
    if (feint) { feints++; assert.ok(wind >= (DUELISTS.attacks.duelCombo.windup + DUELISTS.feint.delay) * 1000 - 40, `feint ${wind}`); } else { plain++; assert.ok(wind < (DUELISTS.attacks.duelCombo.windup + DUELISTS.feint.delay) * 1000 - 100); }
  }
  assert.ok(feints >= 3 && plain >= 10, `${feints} feints, ${plain} plain`);
});

test('standard view: drawn in every pose without throwing; poses keyed for the sprite cache', () => {
  const calls = { n: 0 }, ctx = new Proxy({}, { get: (t, k) => k in t ? t[k] : (typeof k === 'string' && /^(fillStyle|strokeStyle|lineWidth|lineCap|lineJoin|globalAlpha|globalCompositeOperation|font|textAlign)$/.test(k) ? undefined : () => { calls.n++; return { addColorStop() {} }; }), set: (t, k, v) => { t[k] = v; return true; } });
  for (const k of DUELIST_KINDS) {
    const w = world(), e = spawn(k, 10, 13, w); const poses = new Set();
    step(w, 6, () => { poses.add(duelistPose(e, e.pack.attack ? (e.pack.phase === 'windup' ? 'windup' : 'attack') : 'idle')); assert.ok(drawPackMonster(ctx, e, 32, w.now)); });
    assert.ok(poses.size >= 4, `${k}: ${[...poses]}`);
  }
  assert.ok(calls.n > 100);
});

// ---------------------------------------------------------------- placement and gating
const game = (seed = 'GAUNT1', aperture = 40) => { const s = freshSave(); s.seed = seed; s.perception.aperture = aperture; return new Game(s, 0); };
function enterDungeon(g, rx, ry, before = null) {
  g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const d = g.map.objects.find((o) => o.kind === 'dungeon' && !o.dungeonType); if (!d) return null;
  const s = g.save, id = dungeonId(s.seed, s.worldGeneration, rx, ry, d.id);
  before?.(id); s.session.dungeonReturn = { rx, ry, x: d.x, y: d.y + 1 }; s.session.activeDungeonId = id; g.loadArea('dungeon'); return id;
}
const SPOTS = [[4, -5], [5, -5], [4, -4], [6, -4], [7, -4], [5, -3]];
test('new crossings from tier 3 get a band, the same on every fresh load; spawns stand on safe, reachable, movable floor', () => {
  let bands = 0;
  for (const [rx, ry] of SPOTS) {
    const a = game(), b = game(), ia = enterDungeon(a, rx, ry); enterDungeon(b, rx, ry); if (!ia) continue;
    const da = a.enemies.filter((e) => e.duelist), db = b.enemies.filter((e) => e.duelist);
    assert.deepEqual(da.map((e) => [e.id, e.kind, e.x, e.y, e.maxHp]), db.map((e) => [e.id, e.kind, e.x, e.y, e.maxHp]));
    assert.equal(a.save.consequences.dungeons[ia].duelistVersion, DUELISTS.version);
    assert.ok(da.length <= DUELISTS.spawn.maxPerArea);
    const M = a.map, W = M.width || Math.round(Math.sqrt(M.tiles.length)), objs = new Set(M.objects.map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
    for (const e of da) {
      assert.ok(footprintOpen(M, W, e.x, e.y) && !footprintHazard(M, W, e.x, e.y), 'open, not lethal'); assert.ok(!objs.has(`${e.x},${e.y}`), 'not on a stair, door or chest');
      const t = M.tiles[e.y * W + e.x]; assert.ok(!t.doorway && !t.door && !t.hole, 'not a doorway');
      const lv = elevationAt(M, W, e.x, e.y); let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (footprintOpen(M, W, e.x + dx, e.y + dy) && elevationAt(M, W, e.x + dx, e.y + dy) === lv) n++;
      assert.ok(n >= DUELISTS.spawn.minMoves, 'room to move');
      assert.ok(Math.hypot(e.x - M.entry.x, e.y - M.entry.y) >= DUELISTS.spawn.clearEntry);
      // regional scaling applied: more than its bare stats far out (these crossings are a few rings out)
      assert.ok(e.maxHp >= duelistStats(e.kind)[0], 'scaled up, never down');
    }
    bands += da.length > 0;
  }
  assert.ok(bands >= 2, `${bands} bands`);
});

test('crossings entered before (or below tier 3) get none, and the floor itself is byte-identical with or without the band', () => {
  for (const [rx, ry] of SPOTS) {
    const fresh = game(), old = game(), low = game('GAUNT1', 0);
    const id = enterDungeon(fresh, rx, ry); if (!id) continue;
    enterDungeon(old, rx, ry, (k) => { pinDungeonLayout(old.save, k); old.save.consequences.dungeons[k].duelistVersion = 0; });
    enterDungeon(low, rx, ry);
    assert.equal(old.enemies.filter((e) => e.duelist).length, 0); assert.equal(low.enemies.filter((e) => e.duelist).length, 0);
    const strip = (g) => JSON.stringify({ tiles: g.map.tiles, objects: g.map.objects, spawns: g.map.enemySpawns.filter((q) => !q.duelist) });
    assert.equal(strip(fresh), strip(old), `${rx},${ry}: only the band differs`);
  }
  // the generator is untouched: generatePinnedDungeon gives the same map whatever the pin
  const a = freshSave(), b = freshSave(); a.seed = b.seed = 'GAUNT-GEN'; const id = dungeonId(a.seed, a.worldGeneration, 4, -5, 'd0');
  pinDungeonLayout(a, id); pinDungeonLayout(b, id); b.consequences.dungeons[id].duelistVersion = 0;
  assert.equal(JSON.stringify(generatePinnedDungeon(a, id)), JSON.stringify(generatePinnedDungeon(b, id)));
  // a history visited before pins version 0
  const s = freshSave(); s.seed = 'V'; const vid = 'dungeon:V:g0:1:1:x'; s.session.areas[vid] = { enemies: [] }; assert.equal(pinDungeonLayout(s, vid).duelistVersion, 0);
});

test('the plan and the placement are pure and bounded', () => {
  let n = 0; for (let i = 0; i < 2000; i++) { const p = duelistPlan('S', `k${i}`, 'crossing', 3); assert.deepEqual(p, duelistPlan('S', `k${i}`, 'crossing', 3)); if (p) { n++; assert.ok(p.count >= 1 && p.count <= DUELISTS.spawn.maxPerArea && p.kinds.every((k) => DUELIST_KINDS.includes(k))); } }
  assert.ok(Math.abs(n / 2000 - DUELISTS.spawn.places.crossing.chance) < .04);
  assert.equal(duelistPlan('S', 'k', 'crossing', 2), null, 'below tier 3');
  assert.equal(duelistPlan('S', 'k', 'nowhere'), null);
  // a pocket of floor cut off from the way in is never chosen; lethal ground never
  const W = 12, tiles = []; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) tiles.push({ x, y, kind: x === 6 ? 'lava' : 'floor', blocked: x === 0 || y === 0 || x === W - 1 || y === W - 1 });
  const map = { tiles, objects: [], enemySpawns: [] }, open = (x, y) => { const t = tiles[Math.round(y) * W + Math.round(x)]; return !!t && !t.blocked && t.kind !== 'lava'; };
  for (let i = 0; i < 40; i++) for (const q of duelistSpawns(map, W, `s${i}`, 'a', { count: 3, kinds: DUELIST_KINDS }, { open, arrivals: [{ x: 2, y: 2 }] })) { assert.ok(q.x < 6, 'on the reachable side'); assert.ok(open(q.x, q.y)); }
});

// ---------------------------------------------------------------- Close View
test('Close View: registered with its own slots, bounded per tier, valid and cached', () => {
  assert.ok(DUELIST_SKELETON.count <= BEAST_SLOT.maxBones); assert.equal(BEAST_SLOT.maxBeasts, 2, 'the world beasts keep their two slots'); assert.equal(DUELIST_SLOT.maxDuelists, 3);
  for (const k of DUELIST_KINDS) {
    assert.ok(CLOSE_VIEW_BEASTS[k].duelist); assert.ok(closeViewBeastEligible(createCombatant(k, 1, 1)));
    let prev = Infinity;
    for (const tier of ['full', 'balanced', 'low']) {
      const m = duelistMeshFor(k, tier); assert.ok(m.coreTriangles <= DUELIST_SLOT.triangles[tier] && m.coreTriangles <= BEAST_SLOT.triangles[tier], `${k} ${tier}: ${m.coreTriangles}`); assert.ok(m.coreTriangles < prev); prev = m.coreTriangles;
      for (const i of m.indices) assert.ok(i < m.vertexCount);
      for (let v = 0; v < m.vertexCount; v++) { assert.ok(m.skin[v * 4] < DUELIST_SKELETON.count && m.skin[v * 4 + 2] < DUELIST_SKELETON.count); assert.ok(Math.abs(Math.hypot(m.normals[v * 3], m.normals[v * 3 + 1], m.normals[v * 3 + 2]) - 1) < 1e-3); }
      assert.strictEqual(duelistMeshFor(k, tier), m);
      for (let i = 0; i < m.colors.length; i += 3) assert.ok(m.skin[(i / 3) * 4 + 1] === 0, 'no emissive part: no glowing face');
    }
  }
});

test('Close View proportions: 1.1 x the Wayfarer tall; limbs and torso about half as thick; head and hands no smaller', () => {
  const tall = DUELIST_BODY.height * MONSTER_PACK.gauntDuelist.form.scale * DUELIST_RIG.closeViewScale;
  assert.ok(Math.abs(tall / WAYFARER_CV_HEIGHT - 1.1) < .02, `height ratio ${(tall / WAYFARER_CV_HEIGHT).toFixed(3)}`);
  for (const g of ['leg', 'arm', 'torso', 'waist']) assert.ok(DUELIST_BODY.proportions[g].rad >= .45 && DUELIST_BODY.proportions[g].rad <= .55, g);
  assert.ok(DUELIST_BODY.proportions.head.rad >= 1 && DUELIST_BODY.proportions.hand.rad >= 1);
  // measured on the converted body: mean distance of single-bone vertices from their bone, against the source's
  const dec = (b64, T) => new T(Uint8Array.from(Buffer.from(b64, 'base64')).buffer), P = dec(DUELIST_BODY.positions, Float32Array), Bn = dec(DUELIST_BODY.bone, Uint8Array), Wt = dec(DUELIST_BODY.weight, Uint8Array), J = DUELIST_BODY.joints;
  const segs = { leg: [['thighR', 'shinR'], ['shinR', 'footR'], ['thighL', 'shinL'], ['shinL', 'footL']], arm: [['armR', 'foreR'], ['foreR', 'handR'], ['armL', 'foreL'], ['foreL', 'handL']] };
  for (const [g, list] of Object.entries(segs)) {
    let sum = 0, n = 0;
    for (let v = 0; v < DUELIST_BODY.vertexCount; v++) { const b = DUELIST_BODY.bones[Bn[v * 2]], seg = list.find(([a]) => a === b); if (!seg || Wt[v] > 50) continue;
      const a = J[seg[0]], c = J[seg[1]], p = [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]], ab = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / L2));
      sum += Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t); n++; }
    const ratio = sum / n / DUELIST_BODY.sourceRadius[g]; assert.ok(ratio >= .4 && ratio <= .6, `${g} thickness ratio ${ratio.toFixed(3)}`);
  }
  // the head sits high: big head and hood, a long thin body below
  assert.ok(J.head[2] / DUELIST_BODY.height > .65);
});

const finite = (a) => { for (const v of a) if (!Number.isFinite(v)) return false; return true; };
function cvFight(kind, seconds, each, { player = { x: 13, y: 13 }, level = () => 0, reduce = false, tier = 'full' } = {}) {
  const w = world({ player, level }), e = spawn(kind, 6, 13, w), tr = createDuelistTrack(); let now = 1000;
  for (let t = 0; t < seconds; t += w.dt) {
    w.now += w.dt * 1000; now += w.dt * 1000; updatePackMonster(e, w); w.effects = tickPackEffects(w.effects, w);
    const f = sampleDuelist(tr, e, { x: e.x + .5, y: e.y + .82, z: w.elevation(e.x, e.y) * .5, scale: e.scale, now, reduce, tier, target: w.player, dead: !!e.dead });
    each(f, e, tr, w, now);
  }
  return { e, tr };
}
test('Close View: every animation (walk, run, hop, strafe, each attack, hit, death, reduced motion) samples finite', () => {
  for (const k of DUELIST_KINDS) {
    const phases = new Set(); let frames = 0;
    const look = (f, e, w) => { assert.ok(f && finite(f.skin), `${k}: finite`); assert.ok(f.alpha >= 0 && f.alpha <= 1); phases.add(f.phase); frames++; if (w.now > 4000 && w.now < 4100) e.hp -= 5; };
    for (const reduce of [false, true]) for (const tier of ['full', 'low']) cvFight(k, 9, (f, e, tr, w) => look(f, e, w), { reduce, tier, level: (x) => (x >= 16 ? 1 : 0), player: { x: 17, y: 13 } });
    for (const id of MONSTER_PACK[k].attacks) cvFight(k, 5, (f, e, tr, w) => { e.packAttacks = [id]; look(f, e, w); }, { player: { x: 8.4, y: 13 } });
    for (const id of MONSTER_PACK[k].attacks) for (const ph of ['windup', 'active', 'recover']) assert.ok(phases.has(`${id}:${ph}`), `${k} ${id}:${ph} in ${[...phases]}`);
    assert.ok(phases.has('hop') && phases.has('move'), `${k}: ${[...phases]}`);
    // death: folds and fades over its time, then gone
    const tr = createDuelistTrack(), e = createCombatant(k, 4, 4); let gone = false; for (let i = 0; i < 160; i++) { const f = sampleDuelist(tr, e, { x: 4.5, y: 4.8, z: 0, scale: e.scale, now: 1000 + i * 16, reduce: false, tier: 'full', target: { x: 8, y: 4 }, dead: i > 5 }); if (!f) { gone = true; break; } assert.ok(finite(f.skin)); }
    assert.ok(gone); assert.ok(frames > 500);
  }
});

test('Close View: the feet hold while it walks; it faces the Wayfarer while it circles; the blade swings through each cut', () => {
  const e = createCombatant('gauntDuelist', 4, 10), tr = createDuelistTrack(); let now = 1000, checked = 0; const last = [null, null];
  for (let i = 0; i < 200; i++) { e.x += 1.6 / 60; now += 1000 / 60; sampleDuelist(tr, e, { x: e.x + .5, y: e.y + .82, z: 0, scale: e.scale, now, reduce: false, tier: 'full', target: null, dead: false });
    if (i < 40) continue; for (let k = 0; k < 2; k++) { const p = duelistBone(tr, k ? 'footR' : 'footL'), planted = tr.frame.feet[k * 2] === 1; if (planted && last[k]) { assert.ok(Math.hypot(p[0] - last[k][0], p[1] - last[k][1]) < 3e-3); checked++; } last[k] = planted ? p : null; } }
  assert.ok(checked > 60, `${checked}`);
  // strafing: moving sideways, it keeps facing the Wayfarer
  const s = createCombatant('gauntDuelist', 10, 10), ts = createDuelistTrack(); s.aggro = true; now = 1000;
  for (let i = 0; i < 90; i++) { s.y += 1 / 60; now += 1000 / 60; sampleDuelist(ts, s, { x: s.x + .5, y: s.y + .82, z: 0, scale: s.scale, now, reduce: false, tier: 'full', target: { x: 13.5, y: s.y + .82 }, dead: false }); }
  assert.ok(Math.abs(Math.atan2(Math.sin(ts.yaw), Math.cos(ts.yaw))) < .25, `yaw ${ts.yaw}`);
  // the sword's tip travels through the combo (the cuts are real swings)
  let travel = 0, prev = null;
  cvFight('gauntDuelist', 4, (f, e, tr) => { if (e.pack.attack === 'duelCombo' && e.pack.phase === 'active') { const tip = duelistBone(tr, 'weaponR'); if (prev) travel += Math.hypot(tip[0] - prev[0], tip[1] - prev[1], tip[2] - prev[2]); prev = tip; } }, { player: { x: 8.2, y: 13 } });
  assert.ok(travel > .5, `hand travel ${travel.toFixed(2)}`);
});

// ---------------------------------------------------------------- saves
test('a save round trip: the band comes back where it stood, wounds kept, never mid-hop or mid-swing', () => {
  let g = null, id = null; for (const [rx, ry] of SPOTS) { const t = game(); const k = enterDungeon(t, rx, ry); if (k && t.enemies.some((e) => e.duelist)) { g = t; id = k; break; } }
  assert.ok(g, 'a crossing with a band');
  const band = g.enemies.filter((e) => e.duelist); band[0].hp = Math.max(1, band[0].maxHp - 7); band[0].x += .5;
  band[0].pack.duelHop = { from: { x: band[0].x, y: band[0].y }, to: { x: band[0].x + 1, y: band[0].y }, t: .1, climb: 0, mode: 'side' }; band[0].hopLift = .4;
  const snap = JSON.parse(JSON.stringify(g.exportSnapshot(5000))); assert.equal(snap.version ?? snap.schemaVersion ?? 14, 14);
  const back = new Game(migrateSave(snap), 5000); assert.equal(back.save.session.activeDungeonId, id);
  const again = back.enemies.filter((e) => e.duelist);
  assert.deepEqual(again.map((e) => [e.id, e.kind]).sort(), band.map((e) => [e.id, e.kind]).sort());
  const r0 = again.find((e) => e.id === band[0].id); assert.equal(r0.hp, band[0].hp); assert.equal(r0.x, band[0].x); assert.ok(!r0.pack.duelHop && !r0.hopLift && !r0.pack.attack);
  assert.equal(back.save.consequences.dungeons[id].duelistVersion, DUELISTS.version);
  // and the slain stay slain
  for (const e of again) { e.dead = true; e.hp = 0; }
  const third = new Game(migrateSave(JSON.parse(JSON.stringify(back.exportSnapshot(6000)))), 6000);
  assert.ok(third.enemies.filter((e) => e.duelist).every((e) => e.dead));
});
