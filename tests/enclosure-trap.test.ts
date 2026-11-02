// The Enclosure (Tim, 2026-11-01): "you build with 2 wood, 2 stone and 2 cinder iron... a little shack the player can walk into...
// a 2 by 2... impervious to damage on 3 sides... you can't attack out of it... you can dodge out of it from the opening... you can
// trap the stalker... maybe you have to do 2 enclosures... like pokemon... the chance goes up".
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD, ENCLOSURE, trapChance, canAffordBuild, placeBuild, enclosureAt, playerEnclosure, enclosureShields, tickBuilds, enclosuresStanding } from '../src/building.ts';
import { stalkerPen, STALKER } from '../src/stalker.ts';
import { freshSave } from '../src/types.ts';
import { Game, footprintOpen } from '../src/game.ts';

// A flat open field round the Wayfarer at (10, 10), facing down.
function game() {
  const s = freshSave(); s.seed = 'PEN'; s.materials = { ...s.materials, wood: 10, stone: 10, cinderIron: 10 };
  const g = new Game(s, 0); g.rx = 4; g.ry = 3; g.loadArea('overworld', false); const W = 32;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) Object.assign(g.map.tiles[y * W + x], { kind: 'grass', blocked: false, structure: null, buildingId: null, perch: false, door: null, slope: null, elev: 0, environment: null, encSides: undefined, enclosure: undefined });
  g.enemies = []; g.builds = []; g.player.x = 10; g.player.y = 10; g.player.facing = 'down'; return g;
}

test('the enclosure: three materials, a 2x2 pen open toward the Wayfarer, one build of five', () => {
  const g = game(); assert.deepEqual(BUILD.kinds.enclosure.cost, { wood: 2, stone: 2, cinderIron: 2 });
  const r = placeBuild(g, 10, 11, 'enclosure'); assert.ok(r.ok, r.message);
  assert.deepEqual([g.save.materials.wood, g.save.materials.stone, g.save.materials.cinderIron], [8, 8, 8]);
  const pen = g.builds[0]; assert.equal(pen.kind, 'enclosure'); assert.equal(pen.open, 'north', 'open toward the Wayfarer above it'); assert.deepEqual([pen.x, pen.y], [10, 11]);
  assert.equal(enclosuresStanding(g), 1); assert.equal(g.builds.length, 1, 'one build');
  assert.ok(enclosureAt(g, 11.5, 12.5) === pen && !enclosureAt(g, 12.5, 12.5));
  // Walls: the far side blocks, the open side lets them walk in.
  assert.equal(footprintOpen(g.map, 32, 10.4, 11.3), true, 'inside the pen is open ground');
  assert.equal(footprintOpen(g.map, 32, 10.4, 12.3), false, 'the south wall blocks');
  assert.equal(footprintOpen(g.map, 32, 9.6, 11.3), false, 'the west wall blocks');
  assert.equal(footprintOpen(g.map, 32, 10.4, 10.4), true, 'the north side is open: they walk in');
  // Without the materials it is refused; it never goes up over the Wayfarer.
  const poor = game(); poor.save.materials.cinderIron = 1; assert.equal(canAffordBuild(poor.save, 'enclosure'), false); assert.equal(placeBuild(poor, 10, 11, 'enclosure').ok, false);
  // It stands its time, then is gone and the ground is as it was.
  tickBuilds(g, BUILD.kinds.enclosure.life + .1); assert.equal(g.builds.length, 0); assert.equal(g.map.tiles[11 * 32 + 10].encSides, undefined);
});

test('inside: blows from the walled sides do not land for a while, blows through the opening do; no fighting from inside', () => {
  const g = game(); placeBuild(g, 10, 11, 'enclosure'); g.player.x = 10.4; g.player.y = 11.6; assert.ok(playerEnclosure(g));
  tickBuilds(g, .05);
  assert.equal(enclosureShields(g, { x: 11, y: 15 }), true, 'from the south: the wall');
  assert.equal(enclosureShields(g, { x: 7, y: 12 }), true, 'from the west: the wall');
  assert.equal(enclosureShields(g, { x: 11, y: 8 }), false, 'from the north: the opening');
  const src = { x: 10.5, y: 15, hp: 10, damage: 5 }, hp = g.player.hp; assert.equal(g.packHurt({ ...src, x: 10, y: 14.4 }, 20, {}, 1000), false); assert.equal(g.player.hp, hp, 'the pen turned it');
  assert.deepEqual(g.primaryAttack(2000), [], 'no swing from inside'); assert.match(g.message, /enclosure/);
  assert.equal(g.fireSecondary(2000), false, 'no shot either');
  for (let i = 0; i < ENCLOSURE.guard / .05 + 2; i++) tickBuilds(g, .05);
  assert.equal(enclosureShields(g, { x: 11, y: 15 }), false, 'the guard runs out');
  g.player.x = 10.4; g.player.y = 8; for (let i = 0; i < ENCLOSURE.recharge / .05 + 2; i++) tickBuilds(g, .05); g.player.y = 11.6;
  assert.equal(enclosureShields(g, { x: 11, y: 15 }), true, 'and comes back after a while outside');
});

test('the trap: only with two pens standing; likelier the more it is hurt; held a while, then it breaks out', () => {
  assert.equal(trapChance(1), ENCLOSURE.trap.full); assert.equal(trapChance(.2), ENCLOSURE.trap.low); assert.ok(trapChance(.6) > trapChance(.9));
  const mk = (pens, id = 'stalker-t') => { const pen = { id: 'pen-a', x: 5, y: 5, open: 'north' }, calls = []; const w = { pen: (x, y) => x >= 5 && x < 7 && y >= 5 && y < 7 ? pen : null, pens: () => pens, penTrap: () => calls.push('trap'), penSlip: () => calls.push('slip'), penBreak: (i) => calls.push('break:' + i), penOut: () => calls.push('out') }; return { pen, calls, w, e: { id, stalker: true, x: 5.2, y: 5.4, hp: 100, maxHp: 1000, stalkForm: 'cat' } }; };
  const one = mk(1); assert.equal(stalkerPen(one.e, one.w, .05), false); assert.deepEqual(one.calls, [], 'one pen alone is not enough');
  let trapped = 0; for (let i = 0; i < 60; i++) { const t = mk(2, `stalker-${i}`); if (stalkerPen(t.e, t.w, .05)) trapped++; }
  assert.ok(trapped > 20 && trapped < 50, `about ${ENCLOSURE.trap.low * 100}% when badly hurt (${trapped}/60)`);
  let full = 0; for (let i = 0; i < 60; i++) { const t = mk(2, `stalker-${i}`); t.e.hp = 1000; if (stalkerPen(t.e, t.w, .05)) full++; }
  assert.ok(full < trapped, `less likely at full health (${full}/60)`);
  // Held: harmless and untouchable, then it breaks the pen and comes out.
  let held = null; for (let i = 0; i < 60 && !held; i++) { const t = mk(2, `stalker-${i}`); if (stalkerPen(t.e, t.w, .05)) held = t; }
  assert.ok(held.e.stalkTrapped > 0 && held.pen.trapped === held.e.id); assert.deepEqual(held.calls, ['trap']);
  for (let i = 0; i < ENCLOSURE.trap.time / .05 - 2; i++) assert.equal(stalkerPen(held.e, held.w, .05), true); assert.equal(held.e.untargetable, true); assert.equal(held.e.stalkAct.kind, 'trapped');
  for (let i = 0; i < 5; i++) stalkerPen(held.e, held.w, .05); assert.equal(held.e.untargetable, false); assert.ok(held.calls.includes('break:pen-a') && held.calls.includes('out'));
  // One try per pen.
  const again = mk(2, 'stalker-x'); again.e.hp = 1000; const first = stalkerPen(again.e, again.w, .05); if (!first) { assert.equal(stalkerPen(again.e, again.w, .05), false); assert.deepEqual(again.calls, ['slip'], 'it does not roll again in the same pen'); }
  void STALKER;
});

test('in the game, a held pen stands until the Stalker breaks out', () => {
  const g = game(); placeBuild(g, 10, 11, 'enclosure'); g.player.x = 14; g.player.y = 10; g.player.facing = 'down'; placeBuild(g, 14, 11, 'enclosure');
  assert.equal(enclosuresStanding(g), 2); const pen = g.builds[0]; pen.trapped = 'stalker-1';
  tickBuilds(g, BUILD.kinds.enclosure.life + 5); assert.ok(g.builds.includes(pen), 'it does not crumble while it holds the Stalker'); assert.ok(!g.builds.includes(g.builds.find((b) => b !== pen && !b.trapped && false)));
});
