// Tim, 2026-11-12: "those enemies, when they have the invulnerable tether, you should be able to walk through them. They can't take
// hits from you, but they can still deal out damage." A shaman-warded creature (and the Listener hiding behind its callers) lets the
// Wayfarer pass through; when the link breaks it is solid again and a Wayfarer caught inside is eased out, never into a wall.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTOR_CONTACT, ordinaryContactEnemy } from '../src/actor-contact.ts';
import { PHASE_SHIELD, phaseShielded, SHAMAN } from '../src/affixes.ts';
import { footprintOpen, autoAimable } from '../src/game.ts';
import { createCombatant, enemyBodyRadius } from '../src/combat.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

const W = 24, H = 16;
// An open room whose top-left corner is walled (x <= 2 or y <= 2 blocked).
const room = () => ({ width: W, height: H, objects: [], enemySpawns: [], entry: { x: 6, y: 6 },
  tiles: Array.from({ length: W * H }, (_, i) => { const x = i % W, y = Math.floor(i / W); return { x, y, kind: 'flagFloor', blocked: x <= 2 || y <= 2 || x >= W - 1 || y >= H - 1, elev: 0 }; }) });
const foe = (id, x, y, extra = {}) => Object.assign(createCombatant('rootBrute', x, y), { id, ...extra });
const input = (x, y) => ({ state: { x, y }, consume: () => false, held: () => false });
const gap = (g, e) => Math.hypot(g.player.x - e.x, g.player.y - e.y);
const radius = (e) => ACTOR_CONTACT.playerRadius + enemyBodyRadius(e);

function fixture({ warded = true, frozen = true } = {}) {
  const { game: g } = createLabFixture({ lab: 'close-view', scenario: 'terrain-ramps', seed: 'PHASE-SHIELDED', now: 1000 });
  g.map = room(); g.save.closeView = false;
  const hold = frozen ? { hitStun: 1e6 } : {};
  const shaman = foe('sh', 11, 8, { fracShaman: true, hitStun: 1e6 });
  const ward = warded ? { wardBy: 'sh' } : {};
  // The Wayfarer stands in the corner; three packmates hem it in.
  const pack = [foe('a', 4.3, 3.2, { ...hold, ...ward }), foe('b', 3.2, 4.3, { ...hold, ...ward }), foe('c', 4.3, 4.3, { ...hold, ...ward })];
  g.enemies = [...pack, shaman];
  Object.assign(g.player, { x: 3.2, y: 3.2, hp: g.save.maxHp, invulnerableUntil: 1e12 });
  assert.equal(footprintOpen(g.map, W, g.player.x, g.player.y), true, 'the corner spot is open floor');
  return { g, pack, shaman };
}
const walk = (g, x, y, frames, from = 1000) => { for (let i = 0; i < frames; i++) g.update(.05, input(x, y), from + i * 50); return from + frames * 50; };

test('the shaman ward is phase-shielded; the Listener hiding behind its callers too; nothing else changes', () => {
  assert.equal(phaseShielded({ warded: true, hp: 10 }), true);
  assert.equal(phaseShielded({ warded: true, hp: 0 }), false, 'the dead are not');
  assert.equal(phaseShielded({ farArrayBoss: 'listener', untargetable: true, hp: 10 }), true);
  assert.equal(phaseShielded({ farArrayBoss: 'listener', untargetable: true, hp: 10, morph: { sunk: true } }), false);
  for (const e of [{ untargetable: true, hp: 10 }, { wardBy: 'sh', hp: 10 }, { farArrayBoss: 'listener', hp: 10 }]) assert.equal(phaseShielded(e), false);
  // Only the Wayfarer's contact changes: the plain untargetable flag still stays solid, a ward does not.
  assert.equal(ordinaryContactEnemy(foe('u', 5, 5, { untargetable: true })), true);
  assert.equal(ordinaryContactEnemy(foe('w', 5, 5, { untargetable: true, warded: true })), false);
  assert.ok(PHASE_SHIELD.alpha > 0 && PHASE_SHIELD.alpha < 1);
  // It is read from fields the creature record already carries, so a saved and restored record (exact resume) reads the same.
  const e = foe('r', 5, 5, { wardBy: 'sh', warded: true, untargetable: true });
  assert.equal(phaseShielded(JSON.parse(JSON.stringify(e))), true);
});

test('cornered by unwarded creatures the Wayfarer is stuck; by warded ones it walks out through them', () => {
  const plain = fixture({ warded: false });
  walk(plain.g, 1, 1, 40);
  assert.ok(plain.g.player.x < 4 && plain.g.player.y < 4, `blocked as before (${plain.g.player.x.toFixed(2)}, ${plain.g.player.y.toFixed(2)})`);

  const { g, pack } = fixture();
  walk(g, 1, 1, 2);
  assert.ok(pack.every((e) => e.warded && e.untargetable), 'the shaman wards its pack');
  walk(g, 1, 1, 40, 1100);
  assert.ok(g.player.x > 6 && g.player.y > 6, `walked out through them (${g.player.x.toFixed(2)}, ${g.player.y.toFixed(2)})`);
  assert.equal(footprintOpen(g.map, W, g.player.x, g.player.y), true);
  // Still warded: it cannot be targeted or harmed.
  for (const e of pack) { assert.ok(e.warded && e.untargetable && !autoAimable(e)); assert.equal(e.hp, e.maxHp); }
  // Walking straight back through one works too.
  const a = pack[0]; Object.assign(a, { x: 8, y: 9 }); Object.assign(g.player, { x: 6, y: 9 });
  walk(g, 1, 0, 30, 4000);
  assert.ok(g.player.x > a.x + radius(a), 'passes right through the body');
});

test('a warded creature still attacks and hurts the Wayfarer, and still moves', () => {
  const { g, pack } = fixture({ frozen: false });
  for (const e of pack) e.aggro = true;
  g.player.invulnerableUntil = 0; const hp0 = g.player.hp, start = pack.map((e) => [e.x, e.y]);
  for (let i = 0; i < 160 && g.player.hp === hp0; i++) g.update(.05, input(0, 0), 1000 + i * 50);
  assert.ok(pack.every((e) => e.warded), 'still warded while it hits');
  assert.ok(g.player.hp < hp0, `the Wayfarer is hurt (${hp0} -> ${g.player.hp})`);
  // And it still moves: lead the Wayfarer away and the pack follows.
  Object.assign(g.player, { x: 12, y: 12, invulnerableUntil: 1e12 });
  for (let i = 0; i < 60; i++) g.update(.05, input(0, 0), 20000 + i * 50);
  assert.ok(pack.some((e, i) => Math.hypot(e.x - start[i][0], e.y - start[i][1]) > .5), 'the warded pack still walks');
});

test('the shaman dies: collision returns, and a Wayfarer inside a body is eased out, never into a wall', () => {
  const { g, pack, shaman } = fixture();
  walk(g, 0, 0, 2);
  // The Wayfarer stands inside packmate b, against the corner walls.
  const b = pack[1]; Object.assign(g.player, { x: b.x + .05, y: b.y - .1 });
  assert.ok(gap(g, b) < radius(b));
  Object.assign(shaman, { dead: true, hp: 0 });
  walk(g, 0, 0, 3, 2000);
  assert.ok(pack.every((e) => !e.warded && !e.untargetable && ordinaryContactEnemy(e)), 'solid again');
  for (const e of pack) assert.ok(gap(g, e) >= radius(e) - 1e-6, `clear of ${e.id} (${gap(g, e).toFixed(3)} / ${radius(e).toFixed(3)})`);
  assert.equal(footprintOpen(g.map, W, g.player.x, g.player.y), true, 'on open floor, not inside a wall');
  // Walking back into a body is blocked again.
  const c = pack[2]; Object.assign(g.player, { x: c.x - 2, y: c.y }); walk(g, 1, 0, 30, 3000);
  assert.ok(gap(g, c) >= radius(c) - 1e-6 && g.player.x < c.x, 'contact blocks once more');
});

test('a coincident overlap in a tight corner still resolves onto open floor', () => {
  const { g, pack, shaman } = fixture();
  walk(g, 0, 0, 2);
  const a = pack[0]; Object.assign(g.player, { x: a.x, y: a.y });
  Object.assign(shaman, { dead: true, hp: 0 });
  walk(g, 0, 0, 3, 2000);
  for (const e of pack) assert.ok(gap(g, e) >= radius(e) - 1e-6, `clear of ${e.id}`);
  assert.equal(footprintOpen(g.map, W, g.player.x, g.player.y), true);
  // The ward reaches only SHAMAN.radius: a creature walking out of it is solid as well (the same release path).
  assert.ok(SHAMAN.radius > 0);
});
