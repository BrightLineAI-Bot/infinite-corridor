import test from 'node:test';
import assert from 'node:assert/strict';

test('Gate Revenant poise: rapid blows interrupt it but cannot lock it out of attacking', async () => {
  const { GATE_REVENANT: G, updateGatePredator, addPackEffect } = await import('../src/monster-pack.ts');
  const e = { id: 'gate', kind: 'gateRevenant', gatePredator: true, x: 0, y: 0, hp: 400, maxHp: 400, damage: 40, aggro: true };
  const fx = [];
  const w = { dt: .05, now: 0, player: { x: 3, y: 0 }, enemies: [e], effects: () => fx, addEffect: f => addPackEffect(fx, f, w.now),
    move: () => true, los: () => true, open: () => true, damagePlayer: () => {} };
  let attacks = 0, unstoppable = 0;
  for (let i = 0; i < 400; i++) {
    if (i % 3 === 0) e.hitStun = .25; // a blow every .15 s, faster than the stun wears off
    w.now += 50; updateGatePredator(e, w);
    if (e.gateAttack?.phase === 'warn' && e.gateAttack.left > 0 && e.telegraph > 0) attacks++;
    if (e.gateUnstoppable > 0) unstoppable++;
  }
  assert(unstoppable > 0, 'poise grants an unstoppable window');
  assert(attacks > 0, 'it still begins attacks under constant hits');
  assert(G.poise > 0 && G.unstoppable > 0);
});

test('a non-marine overworld Walker retreat may leave by any open tile on its exit edge, gate first', async () => {
  const { Game } = await import('../src/game.ts');
  const { freshSave } = await import('../src/types.ts');
  const save = freshSave(); save.seed = 'REVIEW-251-EDGE';
  const g = new Game(save, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld', false);
  if (g.map.tiles.some(t => /ocean|sea|water/i.test(t.kind || ''))) return; // marine sections use walkerSectionCrossings
  for (const side of ['east', 'west', 'north', 'south']) {
    const e = { x: 16, y: 16, fleeTo: { side, x: side === 'east' ? 31 : side === 'west' ? 0 : 16, y: side === 'south' ? 31 : side === 'north' ? 0 : 16 } };
    const out = g.walkerExitTargets(e, {});
    assert.deepEqual({ x: out[0].x, y: out[0].y }, { x: Math.min(31, e.fleeTo.x), y: Math.min(31, e.fleeTo.y) }, 'gate first');
    for (const p of out.slice(1)) assert(side === 'east' ? p.x === 31 : side === 'west' ? p.x === 0 : side === 'south' ? p.y === 31 : p.y === 0, `${side} edge`);
    assert.equal(new Set(out.map(p => `${p.x},${p.y}`)).size, out.length, 'no duplicates');
  }
});

test('an overworld Supernova at a section edge also scars the overlapping neighbor, which keeps it on load and save round-trip', async () => {
  const { Game } = await import('../src/game.ts');
  const { freshSave, migrateSave } = await import('../src/types.ts');
  const save = freshSave(); save.seed = 'REVIEW-251-SPILL';
  const g = new Game(save, 0); g.rx = 4; g.ry = 4; g.loadArea('overworld', false);
  const key = (rx, ry) => `overworld:${rx}:${ry}:g${save.worldGeneration}`;
  assert.deepEqual(g.spillVoidTerrain({ x: 16, y: 16 }, 7), [], 'an interior blast never touches a neighbor');
  const before = JSON.stringify(save.voidScars?.areas || {});
  const out = g.spillVoidTerrain({ x: 31.5, y: 16.62 }, 7);
  assert.deepEqual(out.map(o => `${o.rx},${o.ry}`), ['5,4'], 'only the east neighbor overlaps');
  assert.equal(out[0].result.ok, true);
  const row = save.voidScars.areas[key(5, 4)];
  if (out[0].result.changed) {
    assert(row && row.cells.length > 0);
    assert(row.cells.every(c => +c.split(',')[0] < 7), 'cells stay within the disk');
    assert.deepEqual(row.circles.map(c => [c.x, c.y, c.radius]), [[-.5, 16.62, 7]], 'center kept in neighbor coordinates');
  } else assert.equal(JSON.stringify(save.voidScars?.areas || {}), before);
  const round = migrateSave(JSON.parse(JSON.stringify(save)));
  assert.deepEqual(round.voidScars.areas[key(5, 4)], row, 'normalization keeps an out-of-section circle');
  if (row) { g.rx = 5; g.ry = 4; g.loadArea('overworld', false); assert.equal(g.map._voidScarCircles.length, 1); }
  // A corner blast reaches the three sections around that corner.
  g.rx = 4; g.ry = 4; g.loadArea('overworld', false);
  assert.deepEqual(g.spillVoidTerrain({ x: 31, y: 31 }, 3).map(o => `${o.rx},${o.ry}`).sort(), ['4,5', '5,4', '5,5']);
});

test('the flight beam is painted behind the mandibles and keeps a ground-impact effect', async () => {
  const { createCombatant } = await import('../src/combat.ts');
  const { createAstralState } = await import('../src/astral-worm.ts');
  const { drawPackMonster } = await import('../src/monster-render.ts');
  for (const reduceMotion of [true, false]) {
    const calls = [], state = {};
    const ctx = new Proxy({ getTransform: undefined, createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
      { get: (o, k) => k in o ? o[k] : k in state ? state[k] : (...args) => calls.push({ kind: k, args, fill: state.fillStyle, stroke: state.strokeStyle }), set: (o, k, v) => (state[k] = v, true) });
    const e = createCombatant('astralWorm', 3, 4, false, []); e.id = 'beam'; e.astral = createAstralState(); Object.assign(e.astral, { x: 3, y: 4, form: 'flight', previousForm: 'flight', facingX: 1, clock: 1.3 }); e.reduceMotion = reduceMotion;
    drawPackMonster(ctx, e, 44, 1000, 'right');
    const beam = calls.findIndex(c => c.kind === 'moveTo' && c.stroke === '#db9fc5'), mandible = calls.findIndex(c => c.kind === 'moveTo' && c.stroke === '#354450');
    assert(beam >= 0 && mandible > beam, 'beam before mandibles');
    assert(calls.some(c => c.kind === 'ellipse' && c.stroke === '#f2c4e2'), 'impact ring');
    assert.equal(calls.some(c => c.kind === 'fillRect' && c.fill === '#ffe3f4'), !reduceMotion, 'sparks only with motion');
  }
});
