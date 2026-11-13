// The Stego Bait (Tim, 2026-11-12): the Wild Stegosaurus's severed tail drops as a world pickup; picked up it is one "Stego
// Bait", a stackable consumable; used, the bait lies in front of the Wayfarer for STEGO.baitSeconds and every creature that may
// be lured attacks only it until it is gone or eaten. Bosses and the set-piece finale beasts pay it no heed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STEGO_BAIT, ensureStegoBait, onStegoTailSevered, stegoBaitLures, stegoBaitHealth, placeStegoBait, tickStegoBait, biteStegoBait, recordStegoTail, drawStegoTail, drawStegoBait } from '../src/stego-bait.ts';
import { STEGO, updatePackMonster } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { serializeSave, deserializeSave } from '../src/persistence.ts';
import { BUTTON_ITEMS } from '../src/spell-slots.ts';

const DT = 1 / 30;
const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
// A game in wild open ground (no settlement's sanctuary), its own creatures cleared away.
function wild(seed = 'BAIT') {
  const s = freshSave(); s.seed = seed; const g = new Game(s, 0); g.rx = 9; g.ry = 3; g.loadArea('overworld');
  g.enemies = []; g.save.maxHp = g.player.maxHp = g.player.hp = 1e6; g.player.facing = 'right';
  g.tickWorldBeasts = () => {}; // no beast wanders in during the test
  return g;
}
function open(g, x, y) { const t = g.map.tiles[Math.round(y) * 32 + Math.round(x)]; return t && !t.blocked && !t.structure && !t.environment; }
// Puts the Wayfarer on open ground with open ground `room` tiles around.
function stand(g) {
  for (let y = 6; y < 26; y++) for (let x = 6; x < 26; x++) { let ok = true; for (let dy = -4; dy <= 4 && ok; dy++) for (let dx = -6; dx <= 6 && ok; dx++) ok = open(g, x + dx, y + dy); if (ok) { g.player.x = x; g.player.y = y; return; } }
  assert.fail('no open ground');
}
function run(g, seconds, now, each = () => {}) { for (let t = 0; t < seconds; t += DT) { now.t += 1000 * DT; g.player.hp = Math.max(g.player.hp, 1); g.update(DT, idle, now.t); each(); } }
function monster(g, kind, x, y, extra = {}) { const e = createCombatant(kind, x, y, false, []); Object.assign(e, { id: `${kind}-test-${g.enemies.length}`, aggro: true, hp: 1e6, maxHp: 1e6 }, extra); g.enemies.push(e); return e; }

test('the tail drops one pickup, once, where it fell (and a big-room Stegosaurus drops one too)', () => {
  const g = wild(); stand(g); const p = g.player;
  const e = createCombatant('wildStego', p.x + 3, p.y, true, []); Object.assign(e, { id: 'world-beast:wildStego:0', worldBeast: 'wildStego', stegoHeading: { x: 1, y: 0 } }); g.enemies.push(e);
  const w = g.packWorld(DT, 1000); onStegoTailSevered(e, w); onStegoTailSevered(e, w); g.layStegoTail(e, e.stegoTailDrop);
  const tails = g.map.objects.filter((o) => o.kind === 'stegoTail'); assert.equal(tails.length, 1); assert.equal(g.save.stegoBait.drops.length, 1);
  assert.ok(Math.hypot(tails[0].x - e.stegoTailDrop.x, tails[0].y - e.stegoTailDrop.y) <= 3 * Math.SQRT2 + .01, 'it lies near where it fell');
  // the real cut: blows landed from behind wear the tail through, then it never drops again
  const r = createCombatant('wildStego', p.x + 3, p.y, true, []); Object.assign(r, { id: 'keep:f1:wild-stego', stegoRoom: true, boss: false, aggro: true, stegoHeading: { x: 1, y: 0 } }); r.packAttacks = []; g.enemies.push(r);
  p.x = r.x - 3.5; p.y = r.y; updatePackMonster(r, g.packWorld(DT, 1100)); assert.ok(r.stegoTailHp > 0);
  r.hp -= r.stegoTailHp + 1; updatePackMonster(r, g.packWorld(DT, 1200)); assert.equal(r.stegoTail, 'cut');
  r.hp -= 50; updatePackMonster(r, g.packWorld(DT, 1300)); r.stegoTailDrop = null; r.stegoTail = 'cut'; onStegoTailSevered(r, g.packWorld(DT, 1400));
  assert.equal(g.map.objects.filter((o) => o.kind === 'stegoTail').length, 2, 'one more tail, for the big-room beast');
  assert.equal(g.save.stegoBait.drops.filter((d) => d.id === 'stego-tail:keep:f1:wild-stego').length, 1, 'recorded once');
});

test('picking up the tail gives one bait (Act on it, or walk over it); the bait is a button item with a Pack row', () => {
  const g = wild(); stand(g); const p = g.player;
  const a = createCombatant('wildStego', p.x + 2, p.y, true, []); a.id = 'a'; g.layStegoTail(a, { x: p.x + 1, y: p.y });
  const o = g.map.objects.find((q) => q.kind === 'stegoTail'); const r = g.interact(null, o.id);
  assert.ok(r.ok); assert.equal(g.save.consumables.stegoBait, 1); assert.ok(!g.map.objects.some((q) => q.kind === 'stegoTail')); assert.equal(g.save.stegoBait.drops.length, 0);
  const b = createCombatant('wildStego', p.x + 2, p.y, true, []); b.id = 'b'; g.layStegoTail(b, { x: p.x, y: p.y });
  const now = { t: 2000 }; run(g, DT * 2, now); assert.equal(g.save.consumables.stegoBait, 2, 'walking over it picks it up');
  assert.ok(BUTTON_ITEMS.includes('stegoBait'));
  for (let i = 0; i < 12; i++) recordStegoTail(g.save, `t${i}`, 'x', 0, 0); assert.equal(g.save.stegoBait.drops.length, STEGO_BAIT.drops, 'bounded');
});

test('using it lays one bait in front of the Wayfarer, for STEGO.baitSeconds, with health from its table', () => {
  const g = wild(); stand(g); const p = g.player; g.save.consumables.stegoBait = 2;
  assert.ok(g.useConsumable('stegoBait', 1000)); const b = g.save.stegoBait.placed;
  assert.equal(g.save.consumables.stegoBait, 1); assert.equal(b.left, STEGO.baitSeconds); assert.equal(STEGO.baitSeconds, 30);
  assert.ok(Math.abs(b.x - (p.x + STEGO_BAIT.ahead)) < 1e-9 && b.y === p.y, 'in front (facing right)');
  assert.equal(b.hp, stegoBaitHealth(g.save.maxHp)); assert.equal(stegoBaitHealth(100), 300); assert.equal(stegoBaitHealth(1), STEGO_BAIT.health.min);
  assert.ok(!g.useConsumable('stegoBait', 1100), 'one at a time'); assert.equal(g.save.consumables.stegoBait, 1);
  g.save.consumables.stegoBait = 0; g.save.stegoBait.placed = null; assert.ok(!g.useConsumable('stegoBait', 1200), 'none left');
});

test('lured creatures go for the bait and leave the Wayfarer alone for 30 s, then turn back to the Wayfarer', () => {
  const g = wild(); stand(g); const p = g.player; g.save.consumables.stegoBait = 1;
  assert.ok(g.useConsumable('stegoBait', 1000)); const b = g.save.stegoBait.placed; b.x = p.x + 5; b.hp = b.maxHp = 1e9; // far enough apart to tell who they chase
  const pack = monster(g, 'sunderjaw', p.x - 2, p.y), plain = monster(g, 'ashling', p.x - 1.5, p.y + 1);
  const hp0 = p.hp, now = { t: 1000 }; let near = 0;
  run(g, 29, now, () => { p.invulnerableUntil = 0; if (Math.hypot(pack.x - b.x, pack.y - b.y) < 2.5 && Math.hypot(plain.x - b.x, plain.y - b.y) < 2.5) near++; });
  assert.equal(p.hp, hp0, 'no blow reached the Wayfarer'); assert.ok(b.hp < b.maxHp, 'the bait was bitten'); assert.ok(near > 30, 'both went to the bait');
  run(g, 2, now); assert.equal(g.save.stegoBait.placed, null, 'gone after 30 s'); assert.equal(g.message, STEGO_BAIT.say.gone);
  run(g, 15, now, () => { p.invulnerableUntil = 0; }); assert.ok(p.hp < hp0, 'they come back for the Wayfarer');
});

test('a bait eaten early ends the lure', () => {
  const g = wild(); stand(g); const p = g.player; g.save.consumables.stegoBait = 1;
  assert.ok(g.useConsumable('stegoBait', 1000)); const b = g.save.stegoBait.placed; b.hp = 1;
  monster(g, 'ashling', b.x + .6, b.y); const now = { t: 1000 };
  run(g, 6, now); assert.equal(g.save.stegoBait.placed, null); assert.equal(g.message, STEGO_BAIT.say.eaten);
  const hp0 = p.hp; run(g, 8, now, () => { p.invulnerableUntil = 0; }); assert.ok(p.hp < hp0, 'the lure is over');
});

test('bosses and the finale beasts ignore the bait; the roaming beasts are lured', () => {
  const lured = (e) => stegoBaitLures({ kind: 'ashling', ...e });
  assert.ok(lured({})); assert.ok(lured({ boss: true, worldBeast: 'wildStego' })); assert.ok(lured({ boss: true, questingBeast: true })); assert.ok(lured({ stegoRoom: true }));
  for (const k of ['farArrayBoss', 'farArraySummon', 'pentFinaleBeast', 'gloomFinale', 'mireHeart', 'pentBoss', 'passingBeast', 'passiveBehavior']) assert.ok(!lured({ [k]: true }), k);
  assert.ok(!lured({ boss: true }), 'a dungeon boss'); assert.ok(!lured({ boss: true, dungeonRole: 'finalBoss' })); assert.ok(!stegoBaitLures({ kind: 'gloomvast' }));
  const g = wild(); stand(g); const p = g.player; g.save.consumables.stegoBait = 1; assert.ok(g.useConsumable('stegoBait', 1000)); const b = g.save.stegoBait.placed; b.x = p.x + 5; b.hp = b.maxHp = 1e9;
  const boss = monster(g, 'ashling', p.x - 1.2, p.y, { boss: true }), finale = monster(g, 'sunderjaw', p.x - 1.5, p.y + 1, { pentFinaleBeast: 'sunderjaw' });
  const hp0 = p.hp, now = { t: 1000 }; run(g, 10, now, () => { p.invulnerableUntil = 0; });
  assert.ok(p.hp < hp0, 'they still fight the Wayfarer'); assert.equal(b.hp, b.maxHp, 'and never touch the bait'); assert.ok(boss && finale);
});

test('save and reload keep the bait carried, a tail lying and the placed bait\'s remaining time (exact resume); additive at schema 14', () => {
  const g = wild(); stand(g); const p = g.player; g.save.consumables.stegoBait = 3;
  const e = createCombatant('wildStego', p.x + 2, p.y, true, []); e.id = 'world-beast:wildStego:4'; g.layStegoTail(e, { x: p.x + 4, y: p.y });
  assert.ok(g.useConsumable('stegoBait', 1000)); const now = { t: 1000 }; run(g, 5, now); const left = g.save.stegoBait.placed.left, hp = g.save.stegoBait.placed.hp;
  g.snapshotArea(false); const r = new Game(deserializeSave(serializeSave(g.exportSnapshot(300))), 900);
  assert.equal(r.save.version, 14); assert.equal(r.save.consumables.stegoBait, 2);
  assert.deepEqual([r.save.stegoBait.placed.left, r.save.stegoBait.placed.hp], [left, hp]); assert.ok(r.stegoBaitHere(), 'still down after the reload');
  assert.ok(r.map.objects.some((o) => o.kind === 'stegoTail' && o.id === 'stego-tail:world-beast:wildStego:4'), 'the tail is laid again');
  r.rx += 1; r.loadArea('overworld'); assert.equal(r.save.stegoBait.placed, null, 'leaving the area ends it'); assert.ok(!r.map.objects.some((o) => o.kind === 'stegoTail'));
  const old = freshSave(); delete old.stegoBait; old.mystery = 7; const m = migrateSave(JSON.parse(JSON.stringify(old)));
  assert.deepEqual([m.stegoBait.v, m.stegoBait.drops, m.stegoBait.placed], [1, [], null]); assert.equal(m.mystery, 7);
  const odd = migrateSave({ ...JSON.parse(JSON.stringify(old)), stegoBait: { keep: 'me', drops: [{ id: 'a', area: 'z', x: 1, y: 2 }, 'junk', { id: 'a', area: 'z', x: 1, y: 2 }], placed: { id: 'p', area: 'z', x: 1, y: 1, hp: NaN, left: 5 } } });
  assert.equal(odd.stegoBait.keep, 'me'); assert.equal(odd.stegoBait.drops.length, 1); assert.equal(odd.stegoBait.placed.hp, odd.stegoBait.placed.maxHp);
  const spent = ensureStegoBait({ stegoBait: { placed: { id: 'p', area: 'z', x: 1, y: 1, hp: 5, maxHp: 5, left: 0 } } }); assert.equal(spent.placed, null);
});

test('the bait\'s rules are pure and deterministic, and nothing goes NaN', () => {
  const play = () => {
    const g = wild('BAIT'); stand(g); const p = g.player; g.save.consumables.stegoBait = 1; assert.ok(g.useConsumable('stegoBait', 1000));
    const a = monster(g, 'sunderjaw', p.x - 3, p.y), c = monster(g, 'ashling', p.x + 4, p.y + 2), now = { t: 1000 };
    run(g, 12, now, () => { for (const q of [a, c]) assert.ok(Number.isFinite(q.x) && Number.isFinite(q.y)); assert.ok(g.packEffects.length < 64); });
    const b = g.save.stegoBait.placed || {}; return JSON.stringify([b.hp, b.left, a.x, a.y, c.x, c.y, g.save.consumables]);
  };
  assert.equal(play(), play());
  const s = freshSave(); s.consumables.stegoBait = 1; assert.ok(placeStegoBait(s, 'z', 1, 1, 100, 30).ok);
  assert.ok(biteStegoBait(s, 10)); assert.ok(!biteStegoBait(s, 10), 'one bite in biteGap'); tickStegoBait(s, STEGO_BAIT.biteGap); assert.ok(biteStegoBait(s, 10)); assert.equal(s.stegoBait.placed.hp, 280);
  assert.ok(!biteStegoBait(s, NaN)); tickStegoBait(s, NaN); assert.ok(Number.isFinite(s.stegoBait.placed.left));
  const calls = []; const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push([k, a]); }), set: (t, k, v) => { t[k] = v; return true; } });
  drawStegoTail(ctx, { x: 3, y: 4 }, 32, 0); drawStegoBait(ctx, s.stegoBait.placed, 32, 500);
  for (const [, a] of calls) for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v));
});

test('a lured creature\'s ground effects strike the bait, not the Wayfarer standing in them; its world holds no grip on the Wayfarer', () => {
  const g = wild(); stand(g); const p = g.player; g.save.consumables.stegoBait = 1; assert.ok(g.useConsumable('stegoBait', 1000)); const b = g.save.stegoBait.placed; b.hp = b.maxHp = 1e6;
  const e = monster(g, 'sunderjaw', p.x + 8, p.y + 3); e.packAttacks = []; const hp0 = p.hp;
  g.packEffects = [{ kind: 'shockBurst', owner: e.id, x: p.x, y: p.y, radius: 1, arming: 0, life: .4, damage: 50 }, { kind: 'shockBurst', owner: e.id, x: b.x, y: b.y, radius: 1, arming: 0, life: .4, damage: 50 }];
  const now = { t: 1000 }; run(g, DT, now);
  assert.equal(p.hp, hp0, 'the blast under the Wayfarer passes them by'); assert.equal(b.hp, b.maxHp - 50, 'the one on the bait bites it');
  const lure = g.stegoBaitTick(0), w = g.stegoLureWorld(g.packWorld(DT, 2000), lure, 2000); const x0 = p.x;
  assert.equal(w.player, lure.target); assert.equal(w.wayfarer, p); assert.ok(!w.pull({ x: p.x + 1, y: p.y }, 1, 5)); assert.ok(!w.push({ x: p.x + 1, y: p.y }, 1, 5)); assert.ok(!w.grab(e)); w.stun(3); w.slow(.2, 3); w.poison(3, 9);
  assert.equal(p.x, x0); assert.ok(!(p.stunnedUntil > 2000)); assert.ok(!(p.slowUntil > 2000));
  const st = g.stegoLureStalker(g.stalkerWorld(DT, 2000), lure); assert.equal(st.player, lure.target); assert.ok(!st.displace(1, 0)); assert.equal(p.x, x0);
});
