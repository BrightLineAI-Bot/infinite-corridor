// Dome Rush, the Pachycephalosaurus's Echo, redesigned (Tim, 2026-11-27): after a dodge, three blows landed within the window turn the
// Wayfarer into an Earth Golem for a few seconds (more damage dealt, less taken, drawn larger in rocky plates), then a rest. Hits count
// once per attack; proc damage is no blow. Its clocks pause with the game and resume exactly on a reload.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, PLAYER_CLOCKS, RESUME_PLAYER_CLOCKS, shiftClocks } from '../src/game.ts';
import { ECHOES, PACHY_ECHO, echoEvent, domeRushHit, golemArm, golemOn, golemScale, golemGuard } from '../src/echoes.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { drawPachyGolem, GOLEM_ART } from '../src/pachy-render.ts';
import { drawPachyGolemClose } from '../src/close-view-beast-pachy.ts';

const D = PACHY_ECHO;
const echoSave = (on = true) => { const s = freshSave(); s.seed = 'GOLEM'; if (on) { s.echoes.owned.pachy = true; s.echoes.equipped = ['pachy']; } return s; };
const mini = (on = true) => ({ save: echoSave(on), player: { x: 3, y: 5, hp: 100 }, enemies: [], glyphVisuals: [], defeatEnemy() {}, glyphWorld: () => ({ arc() {}, damage() {}, blast() {} }) });
const foe = () => ({ id: 'f', x: 5, y: 5, hp: 1000, maxHp: 1000 });
// three attacks, `gap` ms apart, from `t0`
const land = (g, e, t0, n = D.hits, gap = 400, dmg = 40) => { let r = null; for (let i = 0; i < n; i++) r = domeRushHit(g, t0 + i * gap, e, dmg); return r; };

test('the Echo: data-driven numbers in one table and a card that says what it does', () => {
  assert.deepEqual({ ...D }, { window: 3000, hits: 3, perAttackMs: 200, seconds: 3, damage: .25, guard: .3, scale: 1.25, cooldown: 10000 });
  const E = ECHOES.pachy; assert.equal(E.name, 'Dome Rush'); assert.equal(E.trigger, 'dodge'); assert.ok(E.cost >= 1 && E.cost <= 3);
  for (const bit of ['dodge', '3 blows', '3 s', 'Earth Golem', '+25% damage', '30% less damage', '10 s']) assert.ok(E.text.includes(bit), `${bit}: ${E.text}`);
});

test('a dodge then three blows within the window: the Earth Golem, for its seconds', () => {
  const g = mini(), p = g.player, e = foe(), t = 10000;
  echoEvent(g, 'dodge', t, {}); assert.equal(p.echoGolemArmUntil, t + D.window); assert.equal(p.echoGolemHits, 0);
  assert.equal(domeRushHit(g, t + 300, e, 40), 'count'); assert.equal(domeRushHit(g, t + 700, e, 40), 'count'); assert.ok(!golemOn(p, t + 700));
  assert.equal(domeRushHit(g, t + 1100, e, 40), 'golem'); assert.ok(golemOn(p, t + 1100)); assert.equal(p.echoGolemUntil, t + 1100 + D.seconds * 1000);
  assert.equal(e.hp, 1000, 'the three blows that woke it get no bonus themselves'); assert.ok(/Earth Golem/.test(g.message));
  assert.ok(golemOn(p, p.echoGolemUntil - 1)); assert.ok(!golemOn(p, p.echoGolemUntil), 'it lasts its seconds and no more');
  assert.equal(golemScale(p, p.echoGolemUntil - 1000, true), D.scale); assert.equal(golemScale(p, p.echoGolemUntil + 1, true), 1);
});

test('not without the dodge, not without the Echo, not after the window, and a swing\'s several foes count once', () => {
  let g = mini(), e = foe(); assert.equal(land(g, e, 10000), null, 'no dodge: nothing'); assert.ok(!golemOn(g.player, 11000));
  g = mini(false); echoEvent(g, 'dodge', 10000, {}); golemArm(g.player, 10000); assert.equal(land(g, e, 10100), null, 'not equipped: nothing');
  g = mini(); echoEvent(g, 'dodge', 10000, {}); domeRushHit(g, 10100, e, 40); domeRushHit(g, 10500, e, 40); assert.equal(domeRushHit(g, 10000 + D.window, e, 40), null, 'the window has closed'); assert.ok(!golemOn(g.player, 13100));
  // one attack striking three foes in the same frame, and its sub-hits close behind, counts once
  g = mini(); echoEvent(g, 'dodge', 20000, {}); for (const x of [foe(), foe(), foe()]) domeRushHit(g, 20100, x, 40); domeRushHit(g, 20100 + D.perAttackMs - 1, e, 40);
  assert.equal(g.player.echoGolemHits, 1, 'one attack'); assert.ok(!golemOn(g.player, 20300));
  domeRushHit(g, 20500, e, 40); assert.equal(domeRushHit(g, 20900, e, 40), 'golem', 'the third attack');
  // a new dodge starts the count again
  g = mini(); echoEvent(g, 'dodge', 30000, {}); domeRushHit(g, 30100, e, 40); domeRushHit(g, 30500, e, 40); echoEvent(g, 'dodge', 30700, {});
  assert.equal(g.player.echoGolemHits, 0); assert.equal(domeRushHit(g, 30900, e, 40), 'count');
});

test('while it lasts: +25% damage dealt (straight to health, no new hit), 30% less taken; then the cooldown before it can arm again', () => {
  const g = mini(), p = g.player, e = foe(), t = 10000; let hits = 0; g.landHit = () => hits++;
  echoEvent(g, 'dodge', t, {}); land(g, e, t + 100); const end = p.echoGolemUntil;
  assert.equal(domeRushHit(g, t + 1500, e, 40), 'bonus'); assert.equal(e.hp, 1000 - Math.round(40 * D.damage)); assert.equal(hits, 0, 'the bonus is no hit: no proc chains');
  assert.equal(golemGuard(p, t + 1500), 1 - D.guard); assert.equal(golemGuard(p, end), 1);
  assert.equal(p.echoGolemReadyAt, end + D.cooldown);
  assert.equal(golemArm(p, t + 2000), false, 'no arming while it lasts'); assert.equal(golemArm(p, end + D.cooldown - 1), false, 'nor while it rests');
  echoEvent(g, 'dodge', end + 500, {}); assert.equal(land(g, e, end + 600), null, 'a dodge in the rest arms nothing');
  assert.equal(golemArm(p, end + D.cooldown), true, 'then it can arm again');
});

test('in the Game: the guard cuts the damage she takes by its share, and its kill is hers', () => {
  const s = echoSave(), g = new Game(s, 0), p = g.player, idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} }; g.enemies = [];
  const max = s.maxHp, now = 50000;
  p.hp = max; p.invulnerableUntil = 0; g.update(1 / 30, idle, now); const a0 = p.hp; g.packHurt(null, 200, {}, now + 100); const plain = a0 - p.hp;
  p.echoGolemUntil = now + 2000; p.hp = max; p.invulnerableUntil = 0; g.update(1 / 30, idle, now + 400); const b0 = p.hp; g.packHurt(null, 200, {}, now + 500); const golem = b0 - p.hp;
  assert.ok(golem > 0 && Math.abs(golem / plain - (1 - D.guard)) < .03, `less damage as a golem (${golem} vs ${plain})`);
  const e = { id: 'x', kind: 'rootBrute', x: p.x + 1, y: p.y, hp: 5, maxHp: 5 }; let fell = null; g.defeatEnemy = (q) => { fell = q; };
  domeRushHit(g, now + 600, e, 40); assert.ok(e.dead && fell === e);
});

test('its clocks pause with the game and resume exactly on a reload (the count too)', () => {
  for (const k of ['echoGolemArmUntil', 'echoGolemUntil', 'echoGolemReadyAt']) assert.ok(PLAYER_CLOCKS.includes(k) && RESUME_PLAYER_CLOCKS.includes(k), k);
  const s = echoSave(), g = new Game(s, 0), p = g.player, at = 40000;
  p.echoGolemArmUntil = at + 2000; p.echoGolemHits = 2; p.echoGolemHitAt = at - 100; p.echoGolemReadyAt = 0;
  shiftClocks(g, 500); assert.equal(p.echoGolemArmUntil, at + 2500, 'a pause shifts it');
  const roundTrip = (game, now) => { const { main, puts } = splitSnapshot(snapshotSave(game.exportSnapshot(now))); const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts)))); assert.equal(v.health, 'healthy', v.error); return v.save; };
  const later = 9e6, h = new Game(structuredClone(roundTrip(g, at)), later), q = h.player;
  assert.equal(q.echoGolemArmUntil - later, 2500, 'the window left'); assert.equal(q.echoGolemHits, 2, 'the count');
  const e = foe(); assert.equal(domeRushHit(h, later + 100, e, 40), 'golem', 'one more blow wakes it after the reload');
  // mid-golem and its rest
  const g2 = new Game(echoSave(), 0); g2.player.echoGolemUntil = at + 1200; g2.player.echoGolemReadyAt = at + 11200;
  const h2 = new Game(structuredClone(roundTrip(g2, at)), later); assert.equal(h2.player.echoGolemUntil - later, 1200); assert.equal(h2.player.echoGolemReadyAt - later, 11200);
  assert.ok(golemOn(h2.player, later + 1000) && !golemOn(h2.player, later + 1300)); assert.equal(golemArm(h2.player, later + 11199), false);
  // nothing armed: nothing saved for it
  const g3 = new Game(echoSave(), 0), h3 = new Game(structuredClone(roundTrip(g3, at)), later); assert.ok(!(h3.player.echoGolemArmUntil > 0) && !h3.player.echoGolemHits);
});

// a canvas that records nothing but must be called right; and the Close View card sink
function stubCtx() { const noop = () => {}; return new Proxy({ globalAlpha: 1 }, { get: (t, k) => k in t ? t[k] : noop, set: (t, k, v) => { t[k] = v; return true; } }); }
test('drawn in both views while it lasts: rocky plates and the draining ring (Standard View), stone cards and a glow (Close View)', () => {
  assert.ok(drawPachyGolem(stubCtx(), 100, 100, 32, D.scale, .5, 1000)); assert.ok(GOLEM_ART.plates.length >= 5);
  const p = { x: 4, y: 4, echoGolemUntil: 5000 }; let n = 0; const card = () => n++;
  assert.ok(drawPachyGolemClose(p, card, false, 3000)); assert.ok(n >= 9); n = 0; assert.equal(drawPachyGolemClose(p, card, false, 5000), false); assert.equal(n, 0, 'nothing once it ends');
});
