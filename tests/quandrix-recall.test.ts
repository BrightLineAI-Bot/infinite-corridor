// The Quandrix Staff (Tim, 2026-11-26: he likes it but it "isn't doing the job"): the hands go back to their speed, life,
// rehit and share from before release 1070; the awakened slam yanks the foes about it in hard and builds Encumbered as a pull
// does; and, awakened, a hold recalls every other hand out: each flies to the locked (else auto-aimed) foe and claps there
// once, consumed, so more hands out mean more claps. With no foe they converge on the held hand. Everything stays bounded.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { QUANDRIX_STAFF, PRIMARY_PROFILES } from '../src/items.ts';
import { QUANDRIX, castHand, liveHands } from '../src/quandrix-staff.ts';
import { ensureLattice } from '../src/transit-lattice.ts';

const R = QUANDRIX.recall, Y = QUANDRIX.slam.yank, KEY = `field:${QUANDRIX.passive}`;
const staff = (power = 15) => ({ id: 'primary-qs-recall', name: QUANDRIX_STAFF.name, slot: 'primary', power, basePower: power, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [] });
function arena(foes = [], { mageHand = false, awakened = true } = {}) {
  const s = freshSave(); s.seed = 'QUANDRIX-RECALL'; s.level = 15; s.stats = { ...s.stats, Focus: 11 }; s.equipment.primary = staff();
  if (awakened) s.equipment.primary.awakened = { resonance: 'x', version: 1 };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); if (mageHand) s.lattice.passives = [KEY];
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra || {}));
  const blows = []; const blow = g.quandrixBlow.bind(g); g.quandrixBlow = (e, amount, ...rest) => { blows.push({ id: e.id, amount }); return blow(e, amount, ...rest); };
  return { s, g, blows };
}
const frame = (g, t, held) => { g.player.invulnerableUntil = t + 1e6; g.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' && held }, t); };
function run(g, from, to, held = false, each = null) { let t = from; for (; t < to; t += 20) { frame(g, t, typeof held === 'function' ? held(t) : held); if (each) each(t); } return t; }
const press = (g, t, action = 'attack', dir = { x: 1, y: 0 }) => { g.attackAction = action; try { return g.primaryAttack(t, dir); } finally { g.attackAction = null; } };
// `n` hands cast in turn toward `dirs`, then a held press until the hold begins. Returns the time.
function handsThenHold(g, dirs, t = 1000) {
  for (const [dx, dy] of dirs) { g.player.attackReadyAt = 0; press(g, t, null, { x: dx, y: dy }); t = run(g, t, t + 100); }
  g.player.attackReadyAt = 0; press(g, t); for (let i = 0; i < 40 && !g.quandrix.hold.on; i++) { frame(g, t, true); t += 20; }
  assert.ok(g.quandrix.hold.on, 'the hold began'); return t;
}
const recalled = (g) => [...g.quandrix.hands, ...g.quandrix.extras].filter((h) => h.on && h.mode === 'recall');
const claps = (g, blows) => blows.filter((b) => Math.abs(b.amount - g.quandrixPower() * R.share) < 1e-6);

test('the hands are back to their speed from before release 1070 (2.2 tiles/s, 2.2 s, rehit .3), share .33', () => {
  const H = QUANDRIX.hand;
  assert.deepEqual([H.speed, H.life, H.rehit, H.share], [2.2, 2.2, .3, .33]); // share .4, then .33: behind the Might build (Tim, 2026-11-26)
  assert.ok(Math.abs(H.speed * H.life - PRIMARY_PROFILES['primary-quandrix-staff'].range) < 1e-9, 'the reach is where a hand dissipates');
  assert.ok(H.step <= H.radius, 'still sub-stepped: no tunnelling');
  // The new tables: every number bounded and in data, the yank within the hold's grab pool.
  for (const v of Object.values(R)) assert.ok(Number.isFinite(v) && v > 0);
  for (const v of Object.values(Y)) assert.ok(Number.isFinite(v) && v > 0);
  assert.ok(R.max >= QUANDRIX.hand.maxLive - 1 + QUANDRIX.extra.maxLive, 'every hand that can be out can be recalled');
  assert.ok(Y.pull > QUANDRIX.suction.pull * 3, 'a yank, far harder than the suction cup\'s draw');
});

test('the awakened slam yanks the unanchored foes about it in hard and holds them; a boss holds its ground; Encumbered builds', () => {
  const { g } = arena([[2.5, 2.5], [-2.8, .6], [0, -3.2], [6, 6], [3, -2, { boss: true }]], { awakened: true });
  const built = []; const pb = g.pullBuild?.bind(g); g.pullBuild = (e, n, now) => { built.push(e.id); return pb?.(e, n, now); };
  let t = 1000; g.player.attackReadyAt = 0; press(g, t); for (let i = 0; i < 40 && !g.quandrix.hold.on; i++) { frame(g, t, true); t += 20; }
  const H = g.quandrix.hold, h = H.hand; assert.equal(H.mode, 'slam'); const at = { x: h.x, y: h.y };
  const dist = (e) => Math.hypot(e.x + .5 - at.x, e.y + .45 - at.y), [a, b, c, far, boss] = g.enemies, before = g.enemies.map(dist), bossAt = { x: boss.x, y: boss.y };
  assert.ok(before.slice(0, 3).every((d) => d > 2.5 && d <= Y.radius), 'three foes start well out, inside the yank');
  t = run(g, t, t + 400, true);
  for (const e of [a, b, c]) assert.ok(dist(e) < 1, `${e.id} yanked in (${dist(e).toFixed(2)} tiles, from ${before[g.enemies.indexOf(e)].toFixed(2)})`);
  assert.ok(Math.abs(dist(far) - before[3]) < .05, 'a foe beyond the yank is left alone');
  assert.ok(Math.hypot(boss.x - bossAt.x, boss.y - bossAt.y) < .01, 'a boss is never yanked');
  t = run(g, t, t + 600, true);
  for (const e of [a, b, c]) assert.ok(dist(e) < 1, `${e.id} held under the slam`);
  assert.ok([a, b, c].every((e) => built.includes(e.id)), 'the slam\'s blows count as a pull\'s (Encumbered)');
  run(g, t, t + 3000, false); assert.equal(g.quandrix.hold.on, false, 'and it bursts');
});

test('awakened: a hold recalls every other hand to the locked foe; each claps once on arrival and is gone', () => {
  for (const n of [1, 2, 3]) { // at most four hands besides the slammed one: the fifth slot is the slam's
    const { g, blows } = arena([[2, 4], [1.2, 0]]), [locked, near] = g.enemies; g.targetId = locked.id;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].slice(0, n + 1); // the last is the one the hold slams
    let t = handsThenHold(g, dirs); const H = g.quandrix.hold;
    const out = recalled(g); assert.equal(out.length, n + 1, `${n} earlier hands and the press's own (the hold slams the one before it)`);
    for (const h of out) assert.equal(h.target, locked.id, 'each flies for the lock, not the nearer foe');
    const mark = blows.length, hpBefore = locked.hp;
    let peak = 0; t = run(g, t, t + 1500, true, () => { peak = Math.max(peak, recalled(g).length); });
    assert.equal(recalled(g).length, 0, 'every recalled hand arrived'); assert.ok(peak <= n + 1);
    const c = claps(g, blows.slice(mark)).filter((b) => b.id === locked.id);
    assert.equal(c.length, n + 1, `${n + 1} hands recalled, ${n + 1} claps on the lock (one each, never flown through and back)`);
    assert.ok(locked.hp < hpBefore);
    assert.equal(liveHands(g), 1, 'only the slammed hand is left: the claps consumed the rest');
    assert.ok(H.on && H.mode === 'slam');
  }
});

test('more hands out, more clap damage; with no lock the auto-aimed foe; with no foe they converge on the slam and clap there', () => {
  const dealt = [];
  for (const n of [1, 3]) { const { g, blows } = arena([[3, 1]]); let t = handsThenHold(g, [[0, 1], [0, -1], [-1, 0], [1, 0]].slice(-(n + 1)));
    assert.ok(recalled(g).every((h) => h.target === 'foe-0'), 'no lock: auto aim picks the foe'); const mark = blows.length;
    run(g, t, t + 1500, true); dealt.push(claps(g, blows.slice(mark)).length); }
  assert.ok(dealt[1] > dealt[0] && dealt[1] === 4 && dealt[0] === 2, `claps ${dealt}`);
  const { g } = arena([]); let t = handsThenHold(g, [[0, -1], [-1, 0], [0, 1]]); const h = g.quandrix.hold.hand; // the slam below; the press's own hand flies right
  const out = recalled(g); assert.equal(out.length, 3); for (const r of out) assert.equal(r.target, null);
  let seen = 0; const flashes = () => g.quandrix.flashes.filter((f) => f.life > 0 && f.kind === 'clap' && Math.hypot(f.x - h.x, f.y - h.y) <= R.arrive + 1e-6).length;
  t = run(g, t, t + 1500, true, () => { seen = Math.max(seen, flashes()); });
  assert.equal(recalled(g).length, 0); assert.ok(seen >= 1, 'they clapped at the slam');
});

test('no recall without the awakening; the awakened suction cup recalls too', () => {
  { const { g } = arena([[3, 0]], { awakened: false, mageHand: true }); handsThenHold(g, [[0, 1], [1, 0]]);
    assert.equal(g.quandrix.hold.mode, 'fist'); assert.equal(recalled(g).length, 0, 'the Mage\'s Hand fist alone recalls nothing'); }
  { const { g } = arena([[3, 0]], { awakened: false }); for (let i = 0; i < 3; i++) { g.player.attackReadyAt = 0; press(g, 1000 + i * 100); } run(g, 1000, 1600, true);
    assert.equal(g.quandrix.hold.on, false); assert.equal(recalled(g).length, 0, 'a plain staff holds nothing'); }
  { const { g } = arena([[3, 0]], { awakened: true, mageHand: true }); handsThenHold(g, [[0, 1], [1, 0]]);
    assert.equal(g.quandrix.hold.mode, 'suction'); assert.equal(recalled(g).length, 2, 'the first tap and the press\'s own'); }
});

test('a hand cast while every slot is taken by the held and recalled hands claps the oldest recalled one first', () => {
  const { g } = arena([[14, 0]]); g.targetId = 'foe-0'; // far: the recalled hands are still flying
  handsThenHold(g, [[0, 1], [0, -1], [-1, 0], [-1, 1], [0, 1]]); assert.equal(liveHands(g), 5); assert.equal(recalled(g).length, 4);
  const oldest = recalled(g).sort((a, b) => a.seq - b.seq)[0], seq = oldest.seq, was = { x: oldest.x, y: oldest.y };
  const h = castHand(g, 5000, 1, 0); assert.equal(h, oldest, 'its slot is reused'); assert.ok(h.seq > seq && h.mode === 'drift');
  assert.equal(recalled(g).length, 3); assert.equal(liveHands(g), 5);
  assert.ok(g.quandrix.flashes.some((f) => f.life > 0 && f.kind === 'clap' && Math.hypot(f.x - was.x, f.y - was.y) < 1e-9), 'it clapped where it was (its blow is not lost)');
});

test('sixty seconds of presses and holds in every awakened mode, cooldown wiped every frame: no NaN, every pool bounded', () => {
  for (const mageHand of [false, true]) {
    const foes = Array.from({ length: 10 }, (_, i) => [1.5 + (i % 5) * .9, -1.5 + Math.floor(i / 5) * 3, i === 0 ? { boss: true } : {}]);
    const { g } = arena(foes, { mageHand, awakened: true }); let t = 1000, k = 0, recalls = 0, clapsSeen = 0;
    const flashSlots = new Set();
    for (; t < 61000; t += 20, k++) {
      g.player.attackReadyAt = 0; if (k % 3 === 0) press(g, t, k % 53 < 30 ? 'attack' : null, { x: Math.cos(k), y: Math.sin(k) });
      if (k % 97 === 0) g.targetId = k % 2 ? 'foe-3' : null;
      for (const e of g.enemies) if (e.dead || e.hp < 1e5) { e.dead = false; e.hp = 1e6; }
      frame(g, t, (k % 53) < 18); g.player.x = Math.max(4, Math.min(15, g.player.x)); g.player.y = Math.max(4, Math.min(26, g.player.y));
      const K = g.quandrix; if (!K) continue;
      assert.equal(K.hands.length, QUANDRIX.hand.maxLive); assert.equal(K.extras.length, QUANDRIX.extra.maxLive); assert.equal(K.flashes.length, QUANDRIX.flash.max);
      const r = recalled(g).length; assert.ok(r <= R.max); if (r) recalls++;
      for (const f of K.flashes) { flashSlots.add(f); if (f.kind === 'clap' && f.life === QUANDRIX.flash.life) clapsSeen++; }
      for (const h of [...K.hands, ...K.extras]) if (h.on) { assert.ok([h.x, h.y, h.dx, h.dy, h.age, h.power, h.tx, h.ty].every(Number.isFinite), 'finite'); if (h.mode === 'recall') assert.ok(h.age <= R.maxTime + .03, 'a recalled hand never outlives its clock'); }
      assert.ok(K.hold.n <= K.hold.grab.length);
      for (const e of g.enemies) assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp), `${e.id} finite`);
    }
    assert.ok(recalls > 20 && clapsSeen > 20, `recalls ${recalls}, claps ${clapsSeen}`);
    assert.equal(flashSlots.size, QUANDRIX.flash.max, 'the flash pool never grew');
    assert.ok(g.projectiles.length < 8 && g.effects.length < 16, 'nothing piles up in the shared lists');
  }
});
