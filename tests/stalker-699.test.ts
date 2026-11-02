// Release 699 (Tim, 2026-11-02): "go to where his marker is on the map and go and find him... you should be able to hunt him if
// you want"; "more frequent than the world bosses, but not so frequent that every 6 squares"; out of a pen "he breaks out... and
// then he starts tracking you again... you can escape it for a little bit"; and "an echo for the stalker for killing him... a
// mist form... when you're dashed, you turn into mist... reduces their overall health".
import test from 'node:test';
import assert from 'node:assert/strict';
import { STALKER, ensureStalker, stalkerLair, stalkerEscaped, stalkerSlain, stalkerNewSection } from '../src/stalker.ts';
import { ECHOES, STALKER_MIST, mistRot, echoEvent, tickEchoes, grantSlainEchoes, ensureEchoState } from '../src/echoes.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';

const save = (seed = 'LAIR') => { const s = freshSave(); s.seed = seed; return s; };
function game(seed = 'LAIR', rx = 4, ry = 3) { const s = save(seed); s.perception.aperture = 80; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); g.enemies = []; return g; }
const far = (l, rx, ry) => Math.max(Math.abs(l.rx - rx), Math.abs(l.ry - ry));

test('it hunts less often: 500-700 tiles of ground between hunts; still 30-40 new sections of rest after a kill', () => {
  assert.deepEqual(STALKER.hunt.need, [500, 700]); assert.deepEqual(STALKER.reset, [30, 40]);
  const q = ensureStalker(save()); assert.ok(q.need >= 500 && q.need <= 700, `need ${q.need}`);
});

test('the lair: a real section four off, that trails the Wayfarer and closes in as the hunt fills; none while it rests', () => {
  const s = save(), q = ensureStalker(s), l = stalkerLair(s, 0, 0); assert.equal(far(l, 0, 0), STALKER.lair.start, 'starts four sections off');
  assert.deepEqual(stalkerLair(s, 0, 0), l, 'it stays put while the Wayfarer does');
  // The Wayfarer goes far (a Wayglass): it follows to within four.
  const m = stalkerLair(s, 40, -12); assert.ok(far(m, 40, -12) <= STALKER.lair.start);
  // The hunt nearly full: it is a section away.
  q.ground = q.need * .95; assert.equal(far(stalkerLair(s, 40, -12), 40, -12), STALKER.lair.near);
  // Locked or resting: no lair.
  assert.equal(stalkerLair(save(), 0, 0, false), null);
  stalkerSlain(s); assert.equal(q.lair, null); assert.equal(stalkerLair(s, 0, 0), null, 'resting');
  while (!stalkerNewSection(s)); assert.ok(stalkerLair(s, 0, 0), 'back on the hunt, a new lair');
  // Saved additively and normalised.
  const t = save(); ensureStalker(t).lair = { rx: 'x' }; assert.equal(ensureStalker(t).lair, null);
  const u = save(); u.stalker = { lair: { rx: 3, ry: -2 } }; assert.deepEqual(migrateSave(u).stalker.lair, { rx: 3, ry: -2 });
});

test('in the game: the marker and the Atlas point to the lair; walking into that section finds the Stalker', () => {
  const g = game(); g.tickStalker(.05, 50); const lair = g.stalkerLairPin(); assert.ok(lair, 'a lair while it hunts');
  const m = g.stalkerMarker(); assert.ok(m && /4 sections off/.test(m.text), m?.text);
  const want = Math.atan2((lair.ry - g.ry) * 32 + 16 - (g.player.y + .5), (lair.rx - g.rx) * 32 + 16 - (g.player.x + .5)); assert.ok(Math.abs(Math.atan2(Math.sin(m.angle - want), Math.cos(m.angle - want))) < 1e-9, 'it points at the lair');
  // Into the lair's section.
  g.rx = lair.rx; g.ry = lair.ry; g.loadArea('overworld', false); g.enemies = []; g._stalkPrev = null;
  let found = null; for (let i = 0; i < 20 && !found; i++) { g.tickStalker(.05, 100 + i * 50); found = g.enemies.find((e) => e.stalker && !e.dead); }
  if (!g.map.openSea) { assert.ok(found, 'it is there'); assert.match(g.message, /found the Stalker/); assert.equal(g.stalkerLairPin(), null, 'no pin while it fights'); }
});

test('out of a held pen it tears free and leaves, wounds and all; the hunt starts over and the lair goes back out', () => {
  const g = game(); g.tickStalker(.05, 50); const q = ensureStalker(g.save); q.ground = q.need * .8;
  const e = g.spawnStalker({ x: 10, y: 10 }, true, 100); assert.ok(e); e.hp = Math.round(e.maxHp * .3); const kin = { id: 'k', stalkerOf: e.id, stalkerKin: true, dead: false }; g.enemies.push(kin);
  g.stalkerBreaksOut(e); assert.ok(e.dead && e.noRewards && kin.dead); assert.match(g.message, /gone.*still on your trail/);
  assert.equal(q.ground, 0); assert.equal(q.active.engaged, false); assert.equal(q.active.hp, e.hp, 'its wounds are kept'); assert.equal(q.quiet, null, 'still hunting');
  g.tickStalker(.05, 200); assert.ok(!g.enemies.includes(e), 'gone from the field'); assert.equal(far(g.stalkerLairPin(), g.rx, g.ry), STALKER.lair.start, 'its lair is back out');
  const back = g.spawnStalker({ x: 10, y: 10 }, true, 300); assert.equal(back.hp, e.hp, 'it comes back as hurt as it left');
});

test("Stalker's Mist: a dodge is mist; each foe passed through loses a share of its maximum health, once a dodge, at most a third", () => {
  assert.equal(ECHOES.stalker.trigger, 'dodge'); assert.equal(ECHOES.stalker.cost, 3);
  const hits = []; const world = { damage: (e, n) => { hits.push(n); e.hp -= n; if (e.hp <= 0) e.dead = true; } };
  const foe = { id: 'f', maxHp: 1000, hp: 1000 }; assert.equal(mistRot(foe, world), 60); assert.deepEqual([foe.maxHp, foe.hp], [940, 940]);
  for (let i = 0; i < 20; i++) mistRot(foe, world); assert.equal(foe.maxHp, Math.round(1000 * (1 - STALKER_MIST.cap)), 'never more than a third'); assert.equal(mistRot(foe, world), 0);
  const weak = { id: 'w', maxHp: 100, hp: 3 }; mistRot(weak, world); assert.ok(weak.dead, 'it can finish a foe');
  // In the game.
  const g = game(); ensureEchoState(g.save); g.save.echoes.owned.stalker = true; g.save.echoes.equipped = ['stalker'];
  const p = g.player, e = { id: 'm', kind: 'ashenHound', x: p.x, y: p.y, hp: 500, maxHp: 500 }; g.enemies = [e]; p.dodgeUntil = 1300;
  echoEvent(g, 'dodge', 1000); assert.ok(p.echoMist && p.echoMist.until > 1300);
  tickEchoes(g, .05, 1050, { x: 0, y: 0 }); assert.equal(e.maxHp, 470); tickEchoes(g, .05, 1100, { x: 0, y: 0 }); assert.equal(e.maxHp, 470, 'once a dodge');
  tickEchoes(g, .05, 2000, { x: 0, y: 0 }); p.dodgeUntil = 2300; echoEvent(g, 'dodge', 2000); tickEchoes(g, .05, 2050, { x: 0, y: 0 }); assert.equal(e.maxHp, 440, 'a new dodge, a new cut');
});

test("the first kill leaves Stalker's Mist; a Wayfarer who killed it before gets it on load", () => {
  const g = game(); const e = g.spawnStalker({ x: 10, y: 10 }, true, 0); e.hp = 1; g.glyphWorld(0).damage(e, 50);
  assert.ok(e.dead); assert.equal(g.save.echoes.owned.stalker, true); assert.match(g.defeatNotice?.detail || '', /Stalker's Mist/);
  const s = save(); s.stalker = { kills: 2 }; ensureEchoState(s); assert.deepEqual(grantSlainEchoes(s), ['stalker']);
  const t = save(); t.stalker = { kills: 1 }; assert.equal(migrateSave(t).echoes.owned.stalker, true);
});

test('the misted dodge and the mist puff draw cleanly (no negative radius, every save restored)', async () => {
  const { render } = await import('../src/renderer.ts');
  let depth = 0; const base = { save() { depth++; }, restore() { depth--; }, createRadialGradient: (a, b, r0, c, d, r1) => { if (r0 < 0 || r1 < 0) throw new RangeError('negative gradient radius'); return { addColorStop() {} }; }, createLinearGradient: () => ({ addColorStop() {} }), createPattern: () => null, measureText: () => ({ width: 10 }), getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    ellipse(x, y, rx, ry) { if (rx < 0 || ry < 0) throw new RangeError('negative ellipse'); }, arc(x, y, r) { if (r < 0) throw new RangeError('negative arc'); } };
  const ctx = new Proxy(base, { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
  const g = game(); g.player.dodgeUntil = 5300; g.player.dodgeX = 1; g.player.echoMist = { until: 5400, hit: {} }; g.glyphVisuals = [{ kind: 'mist', x: 10, y: 10, life: .2, max: .45 }, { kind: 'mist', x: 11, y: 10, life: 0, max: .45 }];
  assert.doesNotThrow(() => render(ctx, g, 360, 640, 5000)); assert.equal(depth, 0);
});
