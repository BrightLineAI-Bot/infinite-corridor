// Close View play-through of 926, bug 9: the Gaunt duelists ended up 0.25-0.33 tiles inside the Wayfarer after hops or their
// approach. They now keep DUELISTS.separation.wayfarer (0.6 tiles) off them: no hop lands or passes nearer (findHop, hopClear),
// a landing the Wayfarer walked onto mid-hop is set down at that distance, the Gaunt Combo's steps and the Twin Cuts' dart stop
// short, and walking in without sight never closes past it. Their blows still land from there.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DUELISTS, DUELIST_KINDS, findHop, hopClear, duelStepTooClose } from '../src/duelists.ts';
import { updatePackMonster, tickPackEffects, addPackEffect } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

const KEEP = DUELISTS.separation.wayfarer;
function world({ size = 26, player = { x: 13, y: 13 }, los = () => true } = {}) {
  const cell = (v: number) => Math.floor(v + .5), open = (x: number, y: number) => { const tx = cell(x), ty = cell(y); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w: any = {
    player: { ...player, hp: 1e6 }, width: size, height: size, dt: 1 / 30, now: 0, enemies: [], effects: [], hurts: [], playerVelocity: { x: 0, y: 0 }, playerFacing: { x: 1, y: 0 },
    open, tileOpen: (x: number, y: number) => open(x - .5, y - .5), projectileOpen: (x: number, y: number) => open(x - .5, y - .5), elevation: () => 0, los,
    move(e: any, dx: number, dy: number) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(_s: any, amount: number, opts: any = {}) { w.hurts.push({ amount, source: opts.source }); return true; },
    slow() {}, addEffect(effect: any) { addPackEffect(w.effects, effect, w.now); },
  };
  return w;
}
// `walk`: the Wayfarer's pace toward the duelist each second, stopping where their bodies would meet (ACTOR_CONTACT, about .56).
function fight(kind: string, seconds = 40, walk = 0, w = world()) {
  const e: any = createCombatant(kind, 9, 13); e.id = `gaunt:${kind}`; e.aggro = true; w.enemies.push(e); let min = Infinity;
  for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000;
    if (walk) { const dx = e.x - w.player.x, dy = e.y - w.player.y, d = Math.hypot(dx, dy); if (d > .62 + walk * w.dt) { w.player.x += dx / d * walk * w.dt; w.player.y += dy / d * walk * w.dt; } }
    updatePackMonster(e, w); w.effects = tickPackEffects(w.effects, w);
    if (!e.pack?.duelHop) min = Math.min(min, Math.hypot(e.x - w.player.x, e.y - w.player.y)); }
  return { min, hurts: w.hurts.length, e };
}

test('926 bug 9: each Gaunt keeps 0.6 tiles off a Wayfarer standing still or pressing in, and its blows still land', () => {
  for (const kind of DUELIST_KINDS) for (const walk of [0, 2.4]) {
    const { min, hurts } = fight(kind, 40, walk);
    assert.ok(min >= KEEP - 1e-6, `${kind} (walk ${walk}): nearest ${min.toFixed(2)}`);
    assert.ok(hurts >= 8, `${kind} (walk ${walk}): its blows land (${hurts})`);
  }
});

test('926 bug 9: no hop lands or passes within 0.6 of the Wayfarer', () => {
  const w = world(), e: any = { id: 'g', x: 11, y: 13 };
  assert.equal(hopClear(w, e, { x: 13.4, y: 13 }), false, 'a landing inside the keep distance');
  assert.equal(hopClear(w, e, { x: 15, y: 13 }), false, 'a hop across the Wayfarer');
  assert.equal(hopClear(w, e, { x: 11, y: 15 }), true, 'a hop aside, clear of them');
  for (const mode of ['close', 'back', 'side', 'circle']) for (let seq = 0; seq < 12; seq++) {
    const to = findHop({ id: `g${seq}`, x: 12.2, y: 13.1 }, w, w.player, mode, seq, [1.5, 2.4]);
    if (to) assert.ok(Math.hypot(to.x - 13, to.y - 13) >= KEEP, `${mode}/${seq} lands ${Math.hypot(to.x - 13, to.y - 13).toFixed(2)} away`);
  }
});

test('926 bug 9: a hop whose landing the Wayfarer walks onto sets down 0.6 from them', () => {
  const w = world(), e: any = createCombatant('gauntDuelist', 9, 13); e.id = 'g'; e.aggro = true; w.enemies.push(e);
  updatePackMonster(e, w); e.pack.duelHop = { from: { x: 9, y: 13 }, to: { x: 11, y: 13 }, t: 0, climb: 0, mode: 'close' };
  w.player.x = 11.1; w.player.y = 13; // the Wayfarer stepped onto the landing
  for (let i = 0; i < 20 && e.pack.duelHop; i++) { w.now += w.dt * 1000; updatePackMonster(e, w); }
  assert.equal(e.pack.duelHop, null, 'landed');
  assert.ok(Math.abs(Math.hypot(e.x - w.player.x, e.y - w.player.y) - KEEP) < 1e-6, 'set down at the keep distance');
});

test('926 bug 9: a step that carries a duelist nearer than 0.6 is refused; one that leaves is not; without sight it does not walk in', () => {
  assert.equal(duelStepTooClose({ x: 12.3, y: 13 }, { x: 13, y: 13 }, .22, 0), true);
  assert.equal(duelStepTooClose({ x: 12.5, y: 13 }, { x: 13, y: 13 }, -.22, 0), false, 'moving away is always allowed');
  assert.equal(duelStepTooClose({ x: 11, y: 13 }, { x: 13, y: 13 }, .22, 0), false);
  const blind = world({ los: () => false }), e: any = createCombatant('gauntDuelist', 12.5, 13); e.id = 'blind'; e.aggro = true; blind.enemies.push(e);
  for (let t = 0; t < 3; t += blind.dt) { blind.now += blind.dt * 1000; updatePackMonster(e, blind); }
  assert.ok(Math.hypot(e.x - 13, e.y - 13) >= KEEP - .05, `gives ground (${Math.hypot(e.x - 13, e.y - 13).toFixed(2)})`);
});
