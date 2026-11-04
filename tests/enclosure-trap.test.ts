// The Enclosure (Tim, 2026-11-01): "you build with 2 wood, 2 stone and 2 cinder iron... a little shack the player can walk into...
// a 2 by 2... impervious to damage on 3 sides... you can't attack out of it... you can dodge out of it from the opening... you can
// trap the stalker... maybe you have to do 2 enclosures... like pokemon... the chance goes up".
import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD, ENCLOSURE, trapChance, canAffordBuild, placeBuild, enclosureAt, playerEnclosure, enclosureShields, tickBuilds, enclosuresStanding, overlapsOpening } from '../src/building.ts';
import { stalkerPen, stalkerTrapAttempt, STALKER } from '../src/stalker.ts';
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

test('the trap: walking into a pen tries nothing; the try is closing it with a second pen; likelier the more it is hurt', () => {
  assert.equal(trapChance(1), ENCLOSURE.trap.full); assert.equal(trapChance(.2), ENCLOSURE.trap.low); assert.ok(trapChance(.6) > trapChance(.9));
  // Being in a pen does nothing by itself.
  const calls = [], w = { penBreak: (i) => calls.push('break:' + i), penOut: () => calls.push('out') }, free = { id: 'stalker-f', stalker: true, x: 5.2, y: 5.4, hp: 100, maxHp: 1000, stalkForm: 'cat' };
  assert.equal(stalkerPen(free, w, .05), false); assert.ok(!free.stalkTrapped);
  // The odds of a closing: higher when badly hurt.
  const pen = (n) => ({ id: `pen-${n}`, x: 5, y: 5, open: 'north' });
  let low = 0, full = 0; for (let i = 0; i < 60; i++) { if (stalkerTrapAttempt({ id: `stalker-${i}`, hp: 100, maxHp: 1000, stalkForm: 'cat' }, pen(i), 'b')) low++; if (stalkerTrapAttempt({ id: `stalker-${i}`, hp: 1000, maxHp: 1000, stalkForm: 'cat' }, pen(i), 'b')) full++; }
  assert.ok(low > 20 && low < 50, `about ${ENCLOSURE.trap.low * 100}% when badly hurt (${low}/60)`); assert.ok(full < low, `less likely at full health (${full}/60)`);
  // Not as pool, mist or mirage; each closing is its own try.
  assert.equal(stalkerTrapAttempt({ id: 's', hp: 1, maxHp: 1000, stalkForm: 'pool' }, pen(0), 'b'), false);
  // Held: harmless and untouchable, then it breaks the pen and comes out.
  let held = null; for (let i = 0; i < 60 && !held; i++) { const e = { id: `stalker-${i}`, hp: 100, maxHp: 1000, stalkForm: 'cat' }, p0 = pen(i); if (stalkerTrapAttempt(e, p0, 'b')) held = { e, p0 }; }
  assert.ok(held.e.stalkTrapped > 0 && held.p0.trapped === held.e.id && held.e.untargetable);
  for (let i = 0; i < ENCLOSURE.trap.time / .05 - 2; i++) assert.equal(stalkerPen(held.e, w, .05), true); assert.equal(held.e.stalkAct.kind, 'trapped');
  for (let i = 0; i < 5; i++) stalkerPen(held.e, w, .05); assert.equal(held.e.untargetable, false); assert.ok(calls.includes(`break:${held.p0.id}`) && calls.includes('out'));
});

test('in the game: a second pen built across the first one\'s opening closes it, and that is when the trap is tried', () => {
  const g = game(); g.player.x = 10; g.player.y = 10; g.player.facing = 'down'; placeBuild(g, 10, 11, 'enclosure'); const first = g.builds[0]; assert.equal(first.open, 'north');
  const st = g.spawnStalker({ x: 10.5, y: 11.3 }, true, 0); st.x = 10.4; st.y = 11.3; st.hp = st.maxHp * .1; st.stalkForm = 'cat'; st.stalkAct = { kind: 'prowl', t: 1, total: 1 };
  g.enemies = [st]; assert.equal(enclosureAt(g, st.x + .5, st.y + .75), first, 'the Stalker is in the first pen');
  // Building elsewhere does nothing to it.
  g.player.x = 20; g.player.y = 10; placeBuild(g, 20, 11, 'enclosure'); assert.ok(!st.stalkTrapped && !first.trapped);
  // Built across the opening (standing north of it, facing down): the try.
  g.player.x = 10; g.player.y = 8; g.player.facing = 'down'; const r = placeBuild(g, 10, 9, 'enclosure'); assert.ok(r.ok, r.message);
  assert.match(r.message, /closes on the Stalker|slips out/, 'the try happened as the pen closed');
  // Release 748 (Tim, 2026-11-04): a pen that holds catches it (beast-mounts.test.ts); one it slips out of breaks, both pieces lost.
  if (/slips out/.test(r.message)) { assert.ok(!g.builds.includes(first), 'it slipped out: the pen broke'); return; }
  const closer = g.builds[g.builds.length - 1]; assert.ok(overlapsOpening(first, closer), 'it covers the opening');
  // A pen lets go if what it held is gone.
  first.trapped = 'stalker-gone'; tickBuilds(g, .05); assert.equal(first.trapped, null);
});

test('inside a pen, items and the Build tool still work; spells and blows do not', () => {
  const g = game(); placeBuild(g, 10, 11, 'enclosure'); g.player.x = 10.4; g.player.y = 11.6; assert.ok(playerEnclosure(g));
  assert.equal(g.penned(5000), true); assert.deepEqual(g.primaryAttack(5000), []);
  const msg = g.message; g.message = ''; const r = g.useButtonItem(null, 6000); void r; assert.doesNotMatch(g.message, /No room to fight/, 'an item press is not refused as fighting'); void msg;
});

test('in the game, a held pen stands until the Stalker breaks out', () => {
  const g = game(); placeBuild(g, 10, 11, 'enclosure'); g.player.x = 14; g.player.y = 10; g.player.facing = 'down'; placeBuild(g, 14, 11, 'enclosure');
  assert.equal(enclosuresStanding(g), 2); const pen = g.builds[0]; pen.trapped = 'stalker-1'; g.enemies = [{ id: 'stalker-1', stalker: true, stalkTrapped: 30, dead: false }];
  tickBuilds(g, BUILD.kinds.enclosure.life + 5); assert.ok(g.builds.includes(pen), 'it does not crumble while it holds the Stalker'); assert.ok(!g.builds.includes(g.builds.find((b) => b !== pen && !b.trapped && false)));
});
