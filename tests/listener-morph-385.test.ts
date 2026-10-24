// Release 385 (Tim, 2026-10-24): the Listener's walled form becomes the Morphling: cables across the hall with riding
// pulses, a dragon-jaw clamp, sinking and rising, worms that crawl back to heal it, a bouncing spin and a writhing lunge.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MORPH_FORM, isMorph, tickMorphListener, tickWorm, pulseAt } from '../src/listener-morph.ts';
import { LISTENER_FORMS } from '../src/far-array.ts';

const W = 24;
function world(over = {}) {
  const hits = [], shocks = [], enemies = [];
  const w = { now: 0, dt: 1 / 60, enemies, projectiles: [], player: { x: 12, y: 16 }, hits, shocks,
    open: (x, y) => x >= 1 && y >= 1 && x <= W - 2 && y <= W - 2,
    hurtAs: (source, amount, o) => { hits.push({ source: source.id, amount, ...o }); return true; },
    shock: (source, radius, damage) => shocks.push({ radius, damage }),
    spawnWorm: (owner, x, y, i, f) => { const c = { id: `${owner.id}:worm:${i}`, morphWorm: true, summonedBy: owner.id, x, y, hp: 10, maxHp: 10, ...f }; enemies.push(c); return c; }, ...over };
  return w;
}
const boss = () => ({ id: 'L', farArrayBoss: 'listener', listenerPhase: 'walled', x: 12, y: 8, hp: 500, maxHp: 1000, damage: 20, scale: 1.5, bodyRadius: .6 });
function run(e, w, move, seconds, step = 1 / 60) { e.morph ||= { next: 0, seq: 0 }; e.morph.next = 0; e.morph.last = null; const keep = MORPH_FORM.moves; MORPH_FORM.moves = [move]; try { const end = w.now + seconds * 1000; while (w.now < end) { w.now += step * 1000; w.dt = step; tickMorphListener(e, w); } } finally { MORPH_FORM.moves = keep; } }

test('the walled form is the Morphling, and grows into its imposing size once', () => {
  const e = boss(), w = world(); w.enemies.push(e); assert.equal(isMorph(e), true);
  tickMorphListener(e, w); assert.equal(e.scale, 1.5 * MORPH_FORM.scale); tickMorphListener(e, w); assert.equal(e.scale, 1.5 * MORPH_FORM.scale);
  assert.equal(LISTENER_FORMS.walled.attacks.includes('ramCharge'), false);
});

test('cables reach to the walls in every direction; a riding pulse hurts, and can be jumped', () => {
  const e = boss(), w = world(); w.enemies.push(e);
  run(e, w, 'cables', .1); const c = e.morph.cables; assert.equal(c.length, MORPH_FORM.cables.count);
  for (const k of c) assert.ok(k.len > 3 && !w.open(k.b.x - .5, k.b.y - .45) || k.len >= MORPH_FORM.cables.length - .5, 'ends at a wall');
  assert.equal(w.hits.length, 0, 'nothing during the telegraph');
  const k = c[0]; w.player.x = k.a.x + (k.b.x - k.a.x) * .5 - .5; w.player.y = k.a.y + (k.b.y - k.a.y) * .5 - .52;
  run(e, w, 'cables', MORPH_FORM.cables.telegraph + MORPH_FORM.cables.live);
  assert.ok(w.hits.some((h) => h.jumpable), 'the pulse found you');
  assert.ok(pulseAt({ liveAt: 0, len: 8 }, 1000) <= 1);
});

test('the jaw clamps where you stood; step out of the ring and it misses', () => {
  const e = boss(), w = world(); w.enemies.push(e); w.player.x = 12; w.player.y = 12;
  run(e, w, 'jaw', 1.4); assert.equal(w.hits.length, 1);
  const f = boss(), v = world(); v.enemies.push(f); v.player.x = 12; v.player.y = 12; f.morph = { next: 0, seq: 0 };
  MORPH_FORM.moves = ['jaw']; v.now += 16; tickMorphListener(f, v); MORPH_FORM.moves = ['cables', 'jaw', 'sink', 'worms', 'spin', 'lunge'];
  v.player.x = 18; for (let i = 0; i < 90; i++) { v.now += 16; v.dt = .016; tickMorphListener(f, v); } assert.equal(v.hits.length, 0);
});

test('it sinks (untouchable) and rises near you in an eruption', () => {
  const e = boss(), w = world(); w.enemies.push(e);
  run(e, w, 'sink', .2); assert.equal(e.untargetable, true); assert.equal(e.morph.sunk, true);
  run(e, w, 'sink', MORPH_FORM.sink.under + .2); assert.equal(e.untargetable, false); assert.equal(w.shocks.length >= 1, true);
  const d = Math.hypot(e.x + .5 - (w.player.x + .5), e.y + .45 - (w.player.y + .52)); assert.ok(d <= MORPH_FORM.sink.near[1] + 1.5, `rose near you (${d.toFixed(1)})`);
});

test('worms crawl back to heal it, nip you when close, and dry up', () => {
  const e = boss(), w = world(); w.enemies.push(e); run(e, w, 'worms', .05);
  const worms = w.enemies.filter((q) => q.morphWorm); assert.ok(worms.length >= MORPH_FORM.worms.count[0]);
  const hp = e.hp; for (let i = 0; i < 60 * 8; i++) { w.now += 16; w.dt = .016; for (const q of worms) if (!q.dead) tickWorm(q, w); }
  assert.ok(worms.some((q) => q.rejoined), 'a worm made it back'); assert.ok(e.hp > hp, 'and healed it');
  const near = world(); near.enemies.push(e); const wq = near.spawnWorm(e, 12, 16, 9, { lifeUntil: 1e9 }); near.player = { x: 12, y: 16 }; near.now = 1000; tickWorm(wq, near); assert.equal(near.hits.length, 1, 'nipped');
  wq.lifeUntil = 0; tickWorm(wq, near); assert.equal(wq.dead, true);
});

test('the spin bounces off walls and stays in the hall; the lunge dives along its line', () => {
  const e = boss(), w = world(); w.enemies.push(e); w.player.x = 3; w.player.y = 3;
  run(e, w, 'spin', MORPH_FORM.spin.time - .1); assert.ok(w.open(e.x, e.y), 'never into a wall');
  const f = boss(), v = world(); v.enemies.push(f); v.player.x = 12; v.player.y = 14;
  run(f, v, 'lunge', MORPH_FORM.lunge.telegraph + .9); assert.ok(f.y > 8 + 3, 'it dived toward you'); assert.equal(v.hits.length, 1, 'one hit as it passes');
});
