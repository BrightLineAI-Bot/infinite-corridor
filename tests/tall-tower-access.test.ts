// Tall towers: getting in, and what waits inside (Tim, 2026-11-14, a High Upwell at -159,-116 on his journey: "almost impossible to
// get to on standard view... the platform is on the wrong side"; and inside, a creature that one-shot him and took "a million hits").
// The way up to a raised door is the floating steps on the row before the face; the movement always allowed the climb, but the
// Standard View drew the face over every step above the first (renderer.ts towerStepsOver now draws them over it). The creatures on
// the walls took the region's threat twice (TALL_TOWERS.dwellerVitals 1): now once, like every creature, and old saves are mended.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, DUNGEON_BOOST } from '../src/game.ts';
import { canStep, coherenceCore } from '../src/landscape.ts';
import { TALL_TOWERS, towerHere, tierOf } from '../src/tall-towers.ts';
import { render, towerStepsPlan } from '../src/renderer.ts';

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const visit = (seed, rx, ry) => { const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; return g; };
const input = (x, y, jump = false) => ({ state: { x, y }, consume: (k) => k === 'jump' && jump, held: () => false });

// Drive the real game (Game.update, the player's own movement and jump) from the foot of the steps up each step to the door:
// steer at the next step's middle, pressing Jump every few frames. Returns true when the Wayfarer stands on the door's ledge.
function climbSteps(g, T, door) {
  const p = g.player; let t = 5000; p.x = door.towerDoors.foot.x; p.y = door.towerDoors.foot.y;
  for (const st of T.steps.slice().reverse()) { let ok = false;
    for (let i = 0; i < 120 && !ok; i++) { const dx = st.x - p.x, dy = st.y - p.y, ax = Math.abs(dx) > .08 ? Math.sign(dx) : 0, ay = Math.abs(dy) > .08 ? Math.sign(dy) : 0;
      g.update(.05, input(ax, ay, i % 3 === 0), t); t += 50; if (p.hp < p.maxHp) p.hp = p.maxHp;
      ok = Math.round(p.x) === st.x && Math.round(p.y) === st.y && Math.abs(g.playerLevel() - st.elev) < .3 && !(t - 50 < (g.jumpUntil || 0)); }
    if (!ok) return false; }
  return Math.abs(g.playerLevel() - door.atLevel) < .3;
}
function* towers(seeds, R, want) {
  let n = 0; for (const seed of seeds) for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) { if (n >= want) return; const p = towerHere(seed, x, y); if (!p) continue; const g = visit(seed, x, y); if (!g.map.tallTower) continue; n++; yield { seed, x, y, p, g }; }
}

test('every Upwell door is reached on foot: a raised one up its steps by the real movement and jump, a ground one from the section\'s heart', () => {
  let raised = 0, ground = 0;
  for (const { seed, x, y, p, g } of towers(['TOWERS', 'CINDER-VERGE-47', 'NIOH', 'UPWELL-SWEEP', 'CORRIDOR-MUHAPQHU'], 14, 70)) {
    const m = g.map, door = m.objects.find((o) => o.towerDoor), T = m.objects.find((o) => o.kind === 'tallTower'), at = (q) => q.y * 32 + q.x;
    // from the plaza's ground (the section's joined core) to the foot of the steps or the door, walking and jumping (canStep)
    const core = coherenceCore(m), start = door.towerDoors.foot; assert.ok(core[at(start)] || N4.some(([dx, dy]) => core[at({ x: start.x + dx, y: start.y + dy })]), `${seed} ${x},${y}: the foot joins the section`);
    if (!p.door) { ground++; const t = m.tiles[at(door)]; assert.ok(!t.blocked && !(t.elev > 0), 'a ground door opens onto the ground');
      g.player.x = door.x; g.player.y = door.y; assert.ok(g.interact('enter', door.id).ok, `${seed} ${x},${y}: the ground door opens`); assert.equal(g.area, 'dungeon'); continue; }
    raised++; assert.ok(climbSteps(g, T, door), `${seed} ${x},${y}: climbed the ${T.steps.length} steps to the raised door (Standard View and Close View share this movement)`);
    const r = g.interact('enter', door.id); assert.ok(r.ok, `${seed} ${x},${y}: ${r.message}`); assert.equal(g.area, 'dungeon');
  }
  console.log(`tower doors reached: ${raised} raised (climbed), ${ground} at the foot`);
  assert.ok(raised >= 20 && ground >= 15, `${raised} raised, ${ground} ground`);
});

test('Tim\'s High Upwell (-159,-116): its steps run west along the face (levels 1, 2, 3); climbed from the foot, the door opens', () => {
  const g = visit('CORRIDOR-MUHAPQHU', -159, -116), T = g.map.objects.find((o) => o.kind === 'tallTower'), door = g.map.objects.find((o) => o.towerDoor);
  assert.deepEqual(g.map.tallTower && [g.map.tallTower.tier, g.map.tallTower.levels, g.map.tallTower.door], [3, 13, 3]);
  assert.deepEqual(T.steps.map((s) => [s.x, s.y, s.elev]), [[15, 7, 3], [14, 7, 2], [13, 7, 1]]); assert.deepEqual(door.towerDoors.foot, { x: 12, y: 7 });
  assert.ok(climbSteps(g, T, door)); assert.ok(g.interact('enter', door.id).ok); assert.equal(g.area, 'dungeon');
});

test('Standard View: the raised door\'s steps are drawn over the tower\'s face, and the Wayfarer with them while up on one', () => {
  const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 10 }), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const g = visit('CORRIDOR-MUHAPQHU', -159, -116), T = g.map.objects.find((o) => o.kind === 'tallTower'), door = g.map.objects.find((o) => o.towerDoor);
  g.player.x = 20; g.player.y = 12; let plan = towerStepsPlan(g, T, 32);
  assert.deepEqual(plan.steps.map((s) => s.elev), [1, 2, 3], 'every step, lowest first'); assert.equal(plan.player, false, 'on the ground away from them: drawn once, as ever');
  assert.doesNotThrow(() => render(ctx, g, 412, 915, 5000));
  assert.ok(climbSteps(g, T, door)); plan = towerStepsPlan(g, T, 32); assert.equal(plan.player, true, 'up on the steps: drawn again over the face');
  assert.doesNotThrow(() => render(ctx, g, 412, 915, 9000));
  const ground = [...towers(['TOWERS'], 9, 40)].find((q) => !q.p.door); assert.ok(ground); assert.equal(towerStepsPlan(ground.g, ground.g.map.objects.find((o) => o.kind === 'tallTower'), 32), null, 'a ground door has no steps');
});

// A tier-3 Upwell far out (ring ~196, where Tim met them) and the Eave Gargoyle the crossing adds as an extra (DUNGEON_BOOST):
// the same kind in the same place, scaled once by region and never by tier. A dweller is that, times its tier's scale.
function farTower() {
  const s = freshSave(); s.seed = 'CORRIDOR-MUHAPQHU'; const g = new Game(s, 0); g.rx = -159; g.ry = -116; g.loadArea('overworld', false);
  const door = g.map.objects.find((o) => o.towerDoor); g.player.x = door.x; g.player.y = door.y; g.skyAir = door.atLevel; assert.ok(g.interact('enter', door.id).ok); return { g, door };
}
test('the creatures on an Upwell\'s walls take the region once, then their tier: in line with their own kind out there', () => {
  const { g } = farTower(), k = tierOf(3).scale, extra = g.enemies.find((e) => e.extraSpawn || /:extra:/.test(e.id)), dw = g.enemies.filter((e) => e.towerDweller);
  assert.ok(extra && extra.kind === 'roofGargoyle' && DUNGEON_BOOST.count > 0, 'the crossing\'s extra gargoyle stands for the ordinary one');
  assert.ok(dw.length >= 3);
  for (const e of dw) { assert.equal(e.towerVitals, TALL_TOWERS.dwellerVitals); assert.equal(e.threatRing, 196); }
  const garg = dw.find((e) => e.kind === 'roofGargoyle');
  assert.ok(Math.abs(garg.maxHp / extra.maxHp - k.hp) < .02, `health ${garg.maxHp} vs its kind's ${extra.maxHp} (x${k.hp})`);
  assert.ok(Math.abs(garg.damage / extra.damage - k.damage) < .02, `damage ${garg.damage} vs its kind's ${extra.damage} (x${k.damage})`);
  assert.ok(garg.maxHp < 6000 && garg.damage < 600, `${garg.maxHp} health, ${garg.damage} damage (release 949: 109923 and 5407)`);
});

test('a dweller saved with the region taken twice is mended on load: its true health and damage, its wounds kept; the dead stay dead', () => {
  const { g, door } = farTower(), id = g.areaId(), want = new Map(g.enemies.filter((e) => e.towerDweller).map((e) => [e.id, { maxHp: e.maxHp, damage: e.damage }]));
  const [a, b] = g.enemies.filter((e) => e.towerDweller);
  for (const e of g.enemies.filter((q) => q.towerDweller)) { e.maxHp *= 33; e.hp = e.maxHp; e.damage *= 15; delete e.towerVitals; } // as release 937-949 laid them
  a.hp = Math.round(a.maxHp * .4); b.hp = 0; b.dead = true;
  g.loadArea('overworld', true); assert.ok(g.save.session.areas[id]?.enemies?.some((e) => e.towerDweller && !e.towerVitals), 'the old snapshot is held');
  g.player.x = door.x; g.player.y = door.y; g.skyAir = door.atLevel; assert.ok(g.interact('enter', door.id).ok);
  const A = g.enemies.find((e) => e.id === a.id), B = g.enemies.find((e) => e.id === b.id);
  assert.equal(A.maxHp, want.get(a.id).maxHp); assert.equal(A.damage, want.get(a.id).damage); assert.equal(A.hp, Math.round(A.maxHp * .4), 'its wounds kept'); assert.equal(A.towerVitals, TALL_TOWERS.dwellerVitals);
  assert.ok(B.dead && !(B.hp > 0), 'the dead stay dead');
  // and mended once: out and in again changes nothing
  const again = { maxHp: A.maxHp, hp: A.hp, damage: A.damage }; g.loadArea('overworld', true); g.player.x = door.x; g.player.y = door.y; g.skyAir = door.atLevel; assert.ok(g.interact('enter', door.id).ok);
  const A2 = g.enemies.find((e) => e.id === a.id); assert.deepEqual({ maxHp: A2.maxHp, hp: A2.hp, damage: A2.damage }, again);
});
