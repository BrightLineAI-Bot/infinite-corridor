// Release 365 (Tim, 2026-10-23): three spells from Infinite III: the Shadow Clone (Tim's design), Gravity Well and Stillpoint.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHADOW_CLONE, cloneOffset, clampPlacement, tickSpellFields, GRAVITY_WELL } from '../src/late-spells.ts';
import { SPELLS, spellOpen, APERTURE_BANDS } from '../src/items.ts';
import { availableCastables, setSlot } from '../src/spell-slots.ts';
import { Game } from '../src/game.ts';
import { freshSave } from '../src/types.ts';

const III = APERTURE_BANDS[13].threshold;
const LATE = ['shadow-clone', 'gravity-well', 'stillpoint'];
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
function arena() {
  const s = freshSave(); s.seed = 'SHADE'; s.perception.aperture = III; const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); g.enemies = [];
  const w = g.map.width || 32; for (const t of g.map.tiles) Object.assign(t, { kind: 'ash', blocked: false, environment: null, elev: 0, slope: false, landscape: null, structure: null, build: null }); // flat open ground
  Object.assign(g.player, { x: 15, y: 15 }); g.lastUpdateNow = 1000; return { s, g, w };
}

test('the three open at Infinite III and not before', () => {
  for (const id of LATE) { assert.ok(SPELLS[id]); assert.equal(SPELLS[id].unlockTier, 13); }
  const low = freshSave(); low.perception.aperture = III - 1;
  for (const id of LATE) { assert.equal(spellOpen(low, id), false); assert.ok(!availableCastables(low).includes(`spell:${id}`)); assert.equal(setSlot(low, 'a', `spell:${id}`).ok, false); }
  const s = freshSave(); s.perception.aperture = III; for (const id of LATE) assert.ok(availableCastables(s).includes(`spell:${id}`));
  assert.ok(spellOpen(low, 'grave-sun'), 'the first spells need no band');
});

test('the clone falls in behind a moving Wayfarer, beside a still one; a tap sets it within two tiles', () => {
  const back = cloneOffset({ x: 1, y: 0 }, { x: 0, y: 1 }); assert.deepEqual(back, { x: -SHADOW_CLONE.distance, y: -0 });
  const side = cloneOffset(null, { x: 0, y: 1 }); assert.ok(Math.abs(Math.abs(side.x) - SHADOW_CLONE.distance) < 1e-9 && Math.abs(side.y) < 1e-9, 'beside: left or right');
  assert.deepEqual(clampPlacement(1, 1), { x: 1, y: 1 }); const far = clampPlacement(6, 8); assert.ok(Math.abs(Math.hypot(far.x, far.y) - SHADOW_CLONE.placeRange) < 1e-9);
});

test('cast, place, follow, copy blows, then step into it; a wall says Blocked', () => {
  const { s, g, w } = arena(); setSlot(s, 'a', 'spell:shadow-clone');
  assert.equal(g.castSlot('a'), true); assert.ok(g.shadowCloneActive()); assert.equal(g.cloneAim, true);
  assert.equal(g.placeShadowClone(15.5 + 2, 15.45), true); assert.equal(g.cloneAim, false); assert.ok(Math.abs(g.shadowClone.ox - 2) < 1e-9);
  assert.equal(g.placeShadowClone(10, 10), false, 'only the first tap places it');
  g.player.x = 10; assert.ok(Math.abs(g.player.x + g.shadowClone.ox - 12) < 1e-9, 'it keeps its offset as you move');
  const foe = g.createEnemyFromSpawn({ kind: 'ashling', x: 13, y: 15 }); foe.maxHp = foe.hp = 500; g.enemies = [foe]; s.lastAim = { x: 1, y: 0 }; g.player.meleeAim = { x: 1, y: 0 };
  const before = foe.hp; g.player.attackReadyAt = 0; const hits = g.primaryAttack(1000, { x: 1, y: 0 }); assert.equal(hits.length, 0, 'the Wayfarer is out of reach'); assert.ok(foe.hp < before, 'the clone struck');
  g.player.attackReadyAt = 0; assert.ok(g.fireSecondary(1100, { x: 0, y: -1 })); const copy = g.projectiles.find((p) => p.shadow), own = g.projectiles.find((p) => !p.shadow && !p.hostile);
  assert.ok(copy && own, 'the clone fires its own shot'); assert.ok(Math.abs(copy.x - own.x - 2) < 1e-9); assert.ok(copy.damage <= Math.ceil(own.damage * SHADOW_CLONE.share));
  const wall = g.map.tiles[15 * w + 12]; wall.blocked = true; wall.kind = 'wall';
  assert.equal(g.castSlot('a'), false); assert.match(g.message, /Blocked/); assert.ok(g.shadowClone.blockedUntil > 1000);
  wall.blocked = false; wall.kind = 'ash'; assert.equal(g.castSlot('a'), true); assert.ok(Math.abs(g.player.x - 12) < 1e-9, 'stepped into it'); assert.equal(g.shadowCloneActive(), false);
  assert.equal(g.castSlot('a'), false, 'then it recovers'); assert.match(g.message, /recovers/);
});

test('the clone ends with its time and when you leave the area', () => {
  const { s, g } = arena(); setSlot(s, 'a', 'spell:shadow-clone'); g.castSlot('a');
  assert.equal(g.shadowCloneActive(1000 + SPELLS['shadow-clone'].lifetime * 1000 + 1), false);
  g.loadArea('overworld'); assert.equal(g.shadowClone, null);
});

test('Gravity Well drags foes in (bosses barely); Stillpoint slows foes and unmakes hostile shots', () => {
  const well = { kind: 'gravity-well', x: 10, y: 10, radius: 3, life: 2 }, a = { id: 'a', x: 11.5, y: 9.55 }, b = { id: 'b', x: 11.5, y: 9.55, boss: true };
  tickSpellFields([well], [a, b], [], 1, 0); assert.ok(Math.abs(a.x + .5 - 10) < Math.abs(12 - 10) - 1, `pulled (${a.x})`); assert.ok(b.x > a.x, 'a boss moves less');
  const c = { id: 'c', x: 11.5, y: 9.55 }; tickSpellFields([well], [c], [], 1, 0, () => false); assert.equal(c.x, 11.5, 'never into a wall');
  const still = { kind: 'stillpoint', x: 5, y: 5, radius: 2.8, life: 3 }, e = { id: 'e', x: 5, y: 5 }, shot = { hostile: true, x: 5.5, y: 5 }, mine = { x: 5.5, y: 5 };
  tickSpellFields([still], [e], [shot, mine], .1, 100); assert.ok(e.glyphSlow.factor <= .4); assert.equal(shot.dead, true); assert.equal(mine.dead, undefined);
  assert.ok(GRAVITY_WELL.pull > GRAVITY_WELL.bossPull);
});

test('Gravity Well and Stillpoint cast as fields that pulse damage', () => {
  const { s, g } = arena(); setSlot(s, 'a', 'spell:gravity-well'); setSlot(s, 'b', 'spell:stillpoint');
  assert.ok(g.castSlot('a')); assert.ok(g.castSlot('b')); assert.deepEqual(g.effects.map((f) => f.kind).sort(), ['gravity-well', 'stillpoint']);
  const foe = g.createEnemyFromSpawn({ kind: 'ashling', x: 15, y: 15 }); foe.maxHp = foe.hp = 500; g.enemies = [foe];
  g.update(.05, idle, 1050); assert.ok(foe.hp < 500);
});
