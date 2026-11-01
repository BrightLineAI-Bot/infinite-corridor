// Release 672 (Tim, 2026-11-01: "the world is too peaceful"): the Stalker, a silver beast that hunts the Wayfarer on the
// overworld only, waits by the door of anywhere it cannot follow, and once killed returns only after 30–40 new sections.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STALKER, ensureStalker, stalkerTrack, stalkerWarning, stalkerNewSection, stalkerLost, stalkerSlain, stalkerEngaged, stalkerWaitAtDoor, stalkerDoorHere, stalkerPlayerFell, stalkerVitals, updateStalker, stalkerAfterimage, nextForm } from '../src/stalker.ts';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { regionalThreat } from '../src/world.ts';

const save = (seed = 'STALK') => { const s = freshSave(); s.seed = seed; return s; };
// A Game on an overworld section with the Stalker unlocked (Resonant and beyond).
function game(seed = 'STALK', rx = 4, ry = 3) { const s = save(seed); s.perception.aperture = 80; const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld', false); return g; }
// Walk the Wayfarer back and forth until the Stalker comes out (or `frames` pass).
function walkUntilAmbush(g, frames = 600, now = { t: 0 }) {
  for (let i = 0; i < frames; i++) { now.t += 50; g.player.x += i % 40 < 20 ? .05 : -.05; g.tickStalker(.05, now.t); const e = g.enemies.find((q) => q.stalker && !q.dead); if (e) return e; }
  return null;
}
// A flat open field for the fight AI on its own.
function field(player = { x: 10, y: 10 }, extra = {}) {
  const hurts = [], summons = [], decoys = [];
  return { hurts, summons, decoys, w: { player, dt: .05, now: 0, sheltered: false, door: null, playerVelocity: { x: 0, y: 0 }, open: (x, y) => x > 0 && y > 0 && x < 40 && y < 40, move(e, dx, dy) { e.x += dx; e.y += dy; return !!(dx || dy); }, elev: () => 0, hurt: (e, n) => { hurts.push(n); return true; }, ownerAlive: () => true, summon: (e, n) => { summons.push(n); return n; }, decoys: (e, n) => { decoys.push(n); return n; }, ...extra } };
}
const stalkerActor = (x = 4, y = 10) => ({ id: 'stalker-0-0', stalker: true, kind: 'stalker', x, y, hp: 800, maxHp: 800, damage: 50, scale: STALKER.size, aggro: true, stalkForm: 'cat' });

test('the hunt clock: ground covered on foot brings it closer, warnings grow, then it is ready', () => {
  const s = save(), q = ensureStalker(s);
  assert.ok(q.need >= STALKER.hunt.need[0] && q.need <= STALKER.hunt.need[1], `need ${q.need}`);
  assert.equal(q.quiet, null, 'a fresh journey is hunted'); assert.equal(stalkerWarning(s), null);
  assert.deepEqual(stalkerTrack(s, 1, false), { ready: false, warn: null }, 'nothing before it is unlocked'); assert.equal(q.ground, 0);
  stalkerTrack(s, 40, true); assert.equal(q.ground, 0, 'a jump between places (a Wayglass, a section edge) is not ground covered');
  const warnings = []; let ready = false, steps = 0;
  while (!ready && steps < 10000) { const r = stalkerTrack(s, .5, true); if (r.warn) warnings.push(r.warn); ready = r.ready; steps++; }
  assert.ok(ready); assert.equal(steps, Math.ceil(q.need / .5), 'exactly the ground it needs');
  assert.deepEqual(warnings, STALKER.texts, 'each warning once, in order, ending with "The Stalker is close"');
  assert.equal(stalkerWarning(s).stage, 3);
  // Lost in a fight (it was met, then the Wayfarer left by an edge or a Wayglass): it hangs back and comes again.
  stalkerEngaged(s, 500); stalkerLost(s);
  assert.equal(q.ground, q.need - STALKER.hunt.follow); assert.equal(q.active.hp, 500, 'it keeps its wounds'); assert.equal(q.active.engaged, false);
  let more = 0; while (!stalkerTrack(s, 1, true).ready) more++; assert.equal(more + 1, STALKER.hunt.follow, 'you cannot outrun it for good');
});

test('in the game it closes in by walking and comes from behind; never in a dungeon, never inside a town', () => {
  const g = game(), q = ensureStalker(g.save); q.ground = q.need - 2;
  g.area = 'dungeon'; for (let i = 0; i < 100; i++) { g.player.x += .05; g.tickStalker(.05, i * 50); }
  assert.equal(q.ground, q.need - 2, 'ground covered in a dungeon does not count'); assert.ok(!g.enemies.some((e) => e.stalker));
  g.area = 'overworld'; g.loadArea('overworld', false);
  const e = walkUntilAmbush(g);
  assert.ok(e, 'it ambushes'); assert.ok(Math.hypot(e.x - g.player.x, e.y - g.player.y) >= STALKER.hunt.spawn[0] - .5, 'from out of reach');
  assert.equal(e.boss, true); assert.equal(e.scale, STALKER.size); assert.ok(e.affixes.length >= 1 && e.affixes.length <= 2, 'one or two affixes');
  assert.ok(g.save.stalker.active.engaged); assert.match(g.message, /STALKER/);
  // Home (Ember Refuge) is a town: it never comes out there.
  const h = game('STALK', 0, 0), hq = ensureStalker(h.save); hq.ground = hq.need; h.player.x = 16; h.player.y = 16;
  for (let i = 0; i < 50; i++) { h.player.x += i % 2 ? .05 : -.05; h.tickStalker(.05, i * 50); }
  assert.ok(!h.enemies.some((e) => e.stalker), 'no ambush inside a town');
});

test('door-waiting: it waits by the dungeon door the Wayfarer went in, and is there when they come out', () => {
  const g = game(), now = { t: 0 }, q = ensureStalker(g.save); q.ground = q.need - 1;
  const e = walkUntilAmbush(g, 600, now); assert.ok(e); e.hp = 600; g.tickStalker(.05, now.t += 50);
  const door = { x: g.player.x, y: g.player.y };
  // Into a dungeon: the creature is gone with the section, and it waits by that door.
  g.area = 'dungeon'; g.enemies = []; g.tickStalker(.05, now.t += 50);
  assert.deepEqual(q.active.door, { rx: g.rx, ry: g.ry, x: door.x, y: door.y }); assert.equal(q.active.hp, 600);
  for (let i = 0; i < 40; i++) g.tickStalker(.05, now.t += 50);
  assert.ok(!g.enemies.some((x) => x.stalker), 'it never enters the dungeon');
  // Out again in the same section: there it is, by the door, with its wounds.
  g.area = 'overworld'; g.loadArea('overworld', false); g.player.x = door.x; g.player.y = door.y; g.tickStalker(.05, now.t += 50);
  const back = g.enemies.find((x) => x.stalker && !x.dead);
  assert.ok(back, 'waiting'); assert.ok(Math.hypot(back.x - door.x, back.y - door.y) < 2); assert.equal(back.hp, 600); assert.match(g.message, /waiting by the door/);
  assert.equal(q.active.door, null);
  // Out by another way (another section): it has lost the trail for now and hangs back.
  g.area = 'dungeon'; g.enemies = []; g.tickStalker(.05, now.t += 50); assert.ok(q.active.door);
  g.area = 'overworld'; g.rx += 1; g.loadArea('overworld', false); g.tickStalker(.05, now.t += 50);
  assert.ok(!g.enemies.some((x) => x.stalker)); assert.equal(q.active.door, null); assert.equal(q.ground, q.need - STALKER.hunt.follow);
  assert.equal(stalkerDoorHere(g.save, g.rx, g.ry), null);
});

test('a building, shelter or town: it waits outside on the last open ground and does not attack', () => {
  const { w, hurts } = field({ x: 10, y: 10 }, { sheltered: true, door: { x: 8, y: 10 } }), e = stalkerActor(3, 10);
  for (let i = 0; i < 200; i++) updateStalker(e, w);
  assert.equal(hurts.length, 0, 'no blow lands while the Wayfarer is inside'); assert.equal(e.stalkAct.kind, 'wait');
  assert.ok(Math.hypot(e.x - 8, e.y - 10) <= 1.5, 'it sits by the door'); assert.equal(e.untargetable, false);
  w.sheltered = false; for (let i = 0; i < 400; i++) updateStalker(e, w);
  assert.ok(hurts.length > 0, 'out again, it attacks');
});

test('the reset count: killed, it hunts again only after 30–40 new sections (saved, additive)', () => {
  const s = save(), q = ensureStalker(s); s.currency = 0; q.ground = 120; stalkerEngaged(s, 300);
  const won = stalkerSlain(s);
  assert.ok(q.quiet >= STALKER.reset[0] && q.quiet <= STALKER.reset[1], `quiet ${q.quiet}`); assert.equal(q.kills, 1); assert.equal(q.active, null); assert.equal(q.ground, 0);
  assert.equal(s.currency, won.marks); assert.ok(won.marks >= STALKER.reward.marks); assert.equal(s.materials[won.sphere], 1);
  const quiet = q.quiet;
  for (let i = 0; i < 1000; i++) assert.equal(stalkerTrack(s, 1, true).ready, false); assert.equal(q.ground, 0, 'it does not hunt while it rests');
  // It survives a save round trip at schema 14.
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.version, 14); assert.equal(back.stalker.quiet, quiet); assert.equal(back.stalker.kills, 1);
  for (let i = 1; i < quiet; i++) assert.equal(stalkerNewSection(back), false);
  assert.equal(back.stalker.quiet, 1); assert.equal(stalkerNewSection(back), true, 'the last new section wakes it'); assert.equal(back.stalker.quiet, null); assert.equal(back.stalker.ground, 0);
  // An old save without it gains the field; one with junk is mended.
  const old = JSON.parse(JSON.stringify(freshSave())); delete old.stalker; const m = migrateSave(old); assert.equal(m.stalker.quiet, null); assert.equal(m.stalker.kills, 0);
  const junk = migrateSave({ ...JSON.parse(JSON.stringify(freshSave())), stalker: { ground: 'x', quiet: -4, active: { door: { rx: 'a' } } } }); assert.equal(junk.stalker.ground, 0); assert.equal(junk.stalker.quiet, null); assert.equal(junk.stalker.active.door, null);
  // Falling to it lets the Wayfarer go: it starts again.
  const f = save(), fq = ensureStalker(f); fq.ground = 200; stalkerEngaged(f, 100); stalkerPlayerFell(f); assert.equal(fq.ground, 0); assert.equal(fq.active, null);
  assert.equal(stalkerWaitAtDoor(f, { rx: 0, ry: 0, x: 1, y: 1 }), false, 'nothing waits when nothing was met');
});

test('killed in the game: elite-tier rewards, its copies go with it, and the count starts', () => {
  const g = game(), q = ensureStalker(g.save); q.ground = q.need - 1; const e = walkUntilAmbush(g); assert.ok(e);
  g.spawnStalkerKin(e, 3); const kin = g.enemies.filter((x) => x.stalkerKin); assert.ok(kin.length > 0 && kin.every((x) => x.noRewards && x.summonedBy === e.id));
  const marks = g.save.currency, inv = g.save.inventory.length, draughts = g.save.consumables.restorativeDraught;
  e.hp = 0; e.dead = true; g.defeatEnemy(e);
  assert.ok(g.save.currency - marks >= STALKER.reward.marks + 6, 'its own bounty plus a boss\'s marks');
  assert.ok(g.save.inventory.length > inv || g.save.materials.cinderIron > 0, 'loot'); assert.ok(g.save.consumables.restorativeDraught >= draughts);
  assert.ok(kin.every((x) => x.dead), 'the swarm goes with it'); assert.equal(g.defeatNotice.title, 'THE STALKER FALLS');
  assert.ok(q.quiet >= 30 && q.quiet <= 40); assert.equal(q.kills, 1);
});

test('it can never be staggered', () => {
  const { w } = field(), e = stalkerActor(8.5, 10);
  updateStalker(e, w); const before = JSON.stringify(e.stalkAct);
  for (let i = 0; i < 30; i++) { e.hitStun = 1; e.recoil = .5; updateStalker(e, w); assert.equal(e.hitStun, 0); assert.equal(e.recoil, 0); }
  assert.notEqual(JSON.stringify(e.stalkAct), before, 'it kept fighting through every blow'); assert.equal(e.staggerImmune, true);
  // In the game, a heavy blow's stun does not hold it either.
  const g = game(), q = ensureStalker(g.save); q.ground = q.need - 1; const s = walkUntilAmbush(g); s.hitStun = 3; updateStalker(s, g.stalkerWorld(.05, 99999)); assert.equal(s.hitStun, 0);
});

test('the three forms: the cat pounces and springs back, the ape leaps up, the pool cannot be hit', () => {
  const { w, hurts } = field(), e = stalkerActor(6, 10), seen = new Set();
  for (let i = 0; i < 1500; i++) { w.now += 50; updateStalker(e, w); seen.add(`${e.stalkForm}:${e.stalkAct.kind}`); if (e.stalkForm === 'pool') assert.equal(e.untargetable, true, 'the pool cannot be hit'); }
  for (const k of ['cat:pounceWarn', 'cat:pounce', 'cat:swipeWarn', 'cat:spring', 'ape:leapWarn', 'ape:leap', 'ape:fistWarn', 'ape:spring', 'pool:slide', 'pool:rise']) assert.ok(seen.has(k), k);
  assert.ok(hurts.length > 3, 'it lands blows');
  // The Wayfarer high above it (a great tree): it turns ape to fly up.
  const hi = stalkerActor(); assert.equal(nextForm(hi, { ...w, elev: (x, y) => x === w.player.x ? 4 : 0 }), 'ape');
});

test('the afterimage: some blows fall on an afterimage, with limited charges, and decoys follow', () => {
  const { w, decoys } = field(), e = stalkerActor(6, 10); updateStalker(e, w);
  let turned = 0;
  for (let i = 0; i < 60; i++) { e.stalkLastHp = e.hp; e.hp -= 10; e.stalkDodgeGap = 0; if (stalkerAfterimage(e, w)) turned++; }
  assert.equal(turned, STALKER.afterimage.charges, 'only as many as its charges'); assert.equal(decoys.length, turned);
  assert.ok(decoys.every((n) => n >= STALKER.afterimage.decoys[0] && n <= STALKER.afterimage.decoys[1]));
  // A gap between them: straight after one, the next blow lands.
  const f = stalkerActor(); f.stalkCharges = 3; f.stalkLastHp = 800; f.hp = 790; f.stalkDodgeGap = 2; assert.equal(stalkerAfterimage(f, w), false);
});

test('the swarm comes at its thresholds and is capped; health and damage scale with distance from the Refuge', () => {
  const { w, summons } = field(), e = stalkerActor(6, 10);
  updateStalker(e, w); assert.equal(summons.length, 0);
  e.hp = e.maxHp * .65; e.stalkLastHp = e.hp; updateStalker(e, w); assert.equal(summons.length, 1);
  e.hp = e.maxHp * .3; e.stalkLastHp = e.hp; updateStalker(e, w); updateStalker(e, w); assert.equal(summons.length, 2, 'once per threshold');
  const g = game(), q = ensureStalker(g.save); q.ground = q.need - 1; const s = walkUntilAmbush(g);
  for (let i = 0; i < 6; i++) g.spawnStalkerKin(s, 3);
  assert.ok(g.enemies.filter((x) => x.stalkerKin && !x.dead).length <= STALKER.swarm.cap, 'capped');
  const near = stalkerVitals(300, 50, regionalThreat(1, 0)), far = stalkerVitals(300, 50, regionalThreat(40, 0));
  assert.ok(far.hp > near.hp && far.damage > near.damage);
  assert.equal(stalkerVitals(300, 50).hp, 300, 'about a Gate Revenant\'s health'); assert.ok(stalkerVitals(300, 50).damage < 50, 'a little under a world beast\'s damage');
});
