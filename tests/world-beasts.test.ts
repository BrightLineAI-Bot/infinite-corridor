import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { WORLD_BEASTS, ensureWorldBeasts, worldBeastFor, worldBeastPlayerFell, worldBeastSlain, tuneWorldBeast, worldBeastTriesLeft } from '../src/world-beasts.ts';
import { MONSTER_PACK, BLOB, WORM, updatePackMonster, tickPackEffects, addPackEffect, freshPackState, packCombatantFields } from '../src/monster-pack.ts';
import { createCombatant } from '../src/combat.ts';

function world({ size = 24, player = { x: 12, y: 12 } } = {}) {
  const open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size; };
  const w = {
    player: { ...player, hp: 1000 }, width: size, height: size, dt: 1 / 30, now: 0, enemies: [], fx: [], hurts: [], pushed: 0, poisoned: 0, playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5), los: () => true,
    move(e, dx, dy) { if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { w.hurts.push({ amount, source: opts.source }); w.player.hp -= amount; return true; },
    slow() {}, push(src, step) { w.pushed += step; }, poison() { w.poisoned++; },
    addEffect(effect) { addPackEffect(w.fx, effect, w.now); }, effects: () => w.fx,
    spawnMinion(owner, kind, x, y, i) { const c = createCombatant(kind, x, y, false, []); Object.assign(c, { id: `${owner.id}:brood:${w.now}:${i}`, noRewards: true, summonedBy: owner.id, broodOf: owner.id, aggro: true }); w.enemies.push(c); return c; },
  };
  return w;
}
function step(w, seconds, each = () => {}) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; for (const e of w.enemies) if (!e.dead) updatePackMonster(e, w); w.fx = tickPackEffects(w.fx, w); each(); } }
function blob(w, x = 6, y = 12) { const c = createCombatant('morphingBlob', x, y, true, []); Object.assign(c, { id: 'blob-1', aggro: true, hp: 2000, maxHp: 2000, damage: 20 }); w.enemies.push(c); return c; }

test('world beasts: rare, one per section, never where the Questing Beast is, three tries, bounty and cooldown', () => {
  const s = freshSave(); s.seed = 'WB'; ensureWorldBeasts(s);
  const map = generateRegion(s.seed, 9, 9);
  let claimed = null;
  for (let ry = 6; ry < 40 && !claimed; ry++) for (let rx = 6; rx < 40 && !claimed; rx++) { const m = generateRegion(s.seed, rx, ry); if (m.settlement) continue; const sp = worldBeastFor(s, m, rx, ry); if (sp) claimed = { rx, ry, sp }; }
  assert.ok(claimed, 'a beast claims a section sooner or later');
  const id = claimed.sp.worldBeast; assert.ok(WORLD_BEASTS[id]); assert.equal(claimed.sp.kind, WORLD_BEASTS[id].kind);
  assert.deepEqual(worldBeastFor(s, generateRegion(s.seed, claimed.rx, claimed.ry), claimed.rx, claimed.ry)?.id, claimed.sp.id, 'it stays in its section');
  assert.equal(worldBeastFor(s, map, 1, 1), null, 'never near the Refuge');
  assert.equal(worldBeastTriesLeft(s, id), 3);
  assert.match(worldBeastPlayerFell(s, claimed.rx, claimed.ry, [id]), /2 tries remain/);
  assert.equal(worldBeastPlayerFell(s, claimed.rx, claimed.ry, []), null, 'only while it lives');
  worldBeastPlayerFell(s, claimed.rx, claimed.ry, [id]);
  assert.equal(worldBeastPlayerFell(s, claimed.rx, claimed.ry, [id]), WORLD_BEASTS[id].gone);
  assert.equal(s.worldBeasts[id].active, null); assert.equal(s.worldBeasts[id].cooldown, WORLD_BEASTS[id].cooldownEscaped);
  const t = freshSave(); t.worldBeasts = { morphingBlob: { active: { rx: 8, ry: 8, tries: 1 }, cycle: 2 } }; ensureWorldBeasts(t); const marks = t.currency;
  const won = worldBeastSlain(t, 'morphingBlob'); assert.equal(t.currency, marks + won.marks); assert.equal(t.worldBeasts.morphingBlob.active, null); assert.equal(t.worldBeasts.morphingBlob.slain, 1);
  const q = freshSave(); ensureWorldBeasts(q); q.questingBeast = { active: { rx: 30, ry: 30, tries: 0 } };
  for (let i = 0; i < 40; i++) assert.equal(worldBeastFor(q, generateRegion(q.seed, 30, 30), 30, 30), null, 'the Questing Beast\'s section is its own');
});

test('world beasts survive migration; nonsense is cleaned; unknown beasts are kept', () => {
  const s = freshSave(); s.worldBeasts = { morphingBlob: { active: { rx: 4, ry: -6, tries: 2 }, cycle: 3, slain: 1 }, futureBeast: { x: 1 } };
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.worldBeasts.morphingBlob.active, { rx: 4, ry: -6, tries: 2 }); assert.equal(m.worldBeasts.morphingBlob.cycle, 3); assert.deepEqual(m.worldBeasts.futureBeast, { x: 1 });
  const bad = migrateSave({ ...JSON.parse(JSON.stringify(s)), worldBeasts: { morphingBlob: { active: { rx: 'a' }, cooldown: -4 } } });
  assert.equal(bad.worldBeasts.morphingBlob.active, null); assert.equal(bad.worldBeasts.morphingBlob.cooldown, 0);
  assert.deepEqual(freshSave().worldBeasts.morphingBlob, { cycle: 0, cooldown: 0, active: null, slain: 0, escaped: 0 });
});

test('a world beast is tuned to the Wayfarer like the Questing Beast, and dodges', () => {
  const s = freshSave(); s.level = 10; const c = createCombatant('morphingBlob', 5, 5, true, []);
  tuneWorldBeast(c, s, 'morphingBlob', { meleeBonus: 4 });
  assert.equal(c.worldBeast, 'morphingBlob'); assert.ok(c.hp > 600); assert.equal(c.evasive, true); assert.equal(c.boss, true);
});

test('the Blob grows, burns what touches it, and spatters ooze that lies until it dies', () => {
  const w = world(), b = blob(w); b.packAttacks = []; const start = b.scale;
  step(w, 30); assert.ok(b.scale > start, 'it swells'); assert.ok(b.bodyRadius > .4);
  w.player.x = b.x + .2; w.player.y = b.y; const before = w.hurts.length; step(w, 1);
  assert.ok(w.hurts.some((h) => h.source === 'blobTouch'), 'touching it burns'); assert.ok(w.hurts.length > before);
  w.player.x = 22; w.player.y = 22; b.hp -= 50; step(w, .7);
  const oozes = w.fx.filter((f) => f.kind === 'ooze'); assert.ok(oozes.length >= 1 && oozes.length <= BLOB.oozePerHit);
  step(w, 20); assert.ok(w.fx.some((f) => f.kind === 'ooze' && !(f.arming > 0)), 'the ooze is still lying there');
  b.dead = true; step(w, 1.5); assert.ok(!w.fx.some((f) => f.kind === 'ooze'), 'and goes when the Blob dies');
});

test('the Blob\'s attacks: tendrils, a poison jet that blows you back, gas in every direction, bloblets that merge home', () => {
  const w = world(), b = blob(w);
  const run = (id, seconds, near = 2.5) => { w.player.x = b.x + near; w.player.y = b.y; b.packAttacks = [id]; b.pack = freshPackState(); b.pack.gap = 0; w.hurts = []; step(w, seconds); };
  run('blobTendrils', 1.2); assert.ok(w.hurts.some((h) => h.source === 'blobTendrils'));
  run('blobGasJet', 2.2, 3); assert.ok(w.pushed > 0 && w.poisoned > 0); assert.ok(w.hurts.some((h) => h.source === 'blobGasJet'));
  w.fx = []; run('blobGasCloud', 1.2, 6); assert.equal(w.fx.filter((f) => f.kind === 'gas').length, BLOB.clouds);
  run('blobBloblets', 1, 6); const kids = w.enemies.filter((e) => e.blobletOf === b.id); assert.ok(kids.length >= 1 && kids.length <= BLOB.blobletsMax);
  b.packAttacks = []; b.hp = 1000; w.player.x = 22; w.player.y = 2; step(w, 12);
  assert.ok(kids.every((k) => k.dead && k.merged), 'they crawl home and merge'); assert.ok(b.hp > 1000, 'merging heals it');
  run('blobEngulf', 1.8, 3); assert.ok(w.hurts.some((h) => h.source === 'blobEngulf' || h.source === 'blobTouch'));
});

test('the Questing Beast is a little smaller; the Blob and its bloblets are never in spawn pools', () => {
  assert.equal(MONSTER_PACK.questingBeast.form.scale, 1.5);
  assert.equal(MONSTER_PACK.morphingBlob.unique, true); assert.equal(MONSTER_PACK.bloblet.unique, true);
  const g = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.match(g, /worldBeastFor\(this\.save,this\.map,this\.rx,this\.ry\)/); assert.match(g, /tuneWorldBeast\(c, this\.save, e\.worldBeast/); assert.match(g, /worldBeastSlain\(this\.save, e\.worldBeast\)/); assert.match(g, /worldBeastPlayerFell\(/);
});

test('high ground (elevation 4 and up) stays above the Blob; every bloblet that merges swells it', () => {
  // Tim: "ground that's level four or above … the ooze will not spread to you"; "each ooze creature that joins him makes the blob noticeably bigger".
  const w = world(), b = blob(w); b.packAttacks = []; w.elevation = (x, y) => (x > 13 ? 5 : 0);
  w.player.x = b.x + .2; w.player.y = b.y; step(w, 1); assert.ok(w.hurts.some((h) => h.source === 'blobTouch'), 'low ground: it burns');
  b.x = 14.2; b.y = 12; w.player.x = 14.4; w.player.y = 12; w.hurts = []; step(w, 1.5);
  assert.ok(!w.hurts.some((h) => h.source === 'blobTouch'), 'high ground: its touch cannot reach you');
  w.fx = []; b.x = 15; b.hp -= 60; w.player.x = 2; w.player.y = 2; step(w, 1);
  assert.ok(w.fx.filter((f) => f.kind === 'ooze').every((f) => f.x <= 13.5), 'no ooze lands on high ground');
  const v = world(), c = blob(v); c.packAttacks = []; step(v, .1); const before = c.scale;
  v.player.x = c.x + 6; v.player.y = c.y; c.packAttacks = ['blobBloblets']; c.pack = freshPackState(); c.pack.gap = 0; step(v, 1); c.packAttacks = []; v.player.x = 22; v.player.y = 2; step(v, 12);
  const merged = v.enemies.filter((q) => q.merged).length; assert.ok(merged >= 1);
  assert.ok(c.blobMerged >= BLOB.mergeGrow, 'merging records the swell'); assert.ok(c.scale > before + .3, `noticeably bigger: ${before} → ${c.scale}`);
});

// Release 237: the Tremor Worm.
function worm(w, x = 6, y = 12) { const c = createCombatant('tremorWorm', x, y, true, []); Object.assign(c, { id: 'worm-1', aggro: true, hp: 2000, maxHp: 2000, damage: 20 }); w.enemies.push(c); return c; }

test('the Tremor Worm fights surfaced, then sinks, swims unseen and comes up near you', () => {
  const w = world(), m = worm(w); m.packAttacks = []; w.player.x = 12; w.player.y = 12;
  step(w, WORM.surfaceTime - .3); assert.ok(!m.hidden && !m.untargetable, 'up and open to blows');
  let sank = false; step(w, .6, () => { sank ||= m.hidden && m.untargetable; }); assert.ok(sank, 'it sinks under the ground');
  let up = false; step(w, WORM.travelTime + WORM.emergeTime + .5, () => { up ||= !m.hidden && !m.untargetable; });
  assert.ok(up, 'and surfaces again'); const d = Math.hypot(m.x - w.player.x, m.y - w.player.y);
  assert.ok(d >= WORM.surfaceRange[0] - .6 && d <= WORM.surfaceRange[1] + .6, `near the Wayfarer: ${d}`);
  assert.equal(MONSTER_PACK.tremorWorm.unique, true); assert.equal(MONSTER_PACK.wormTentacle.unique, true); assert.ok(WORLD_BEASTS.tremorWorm);
});

test('the Tremor Worm\'s attacks: maw tentacles, suction, rising tentacles that spit fire or hold lasers until cut down, rising under you, rocks', () => {
  const w = world(), m = worm(w); w.pulled = 0; w.pull = (src, step) => { w.pulled += step; };
  const run = (id, seconds, near = 2.5) => { w.player.x = m.x + near; w.player.y = m.y; m.packAttacks = [id]; m.pack = freshPackState(); m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 }; m.pack.gap = 0; m.hidden = false; m.untargetable = false; w.hurts = []; step(w, seconds); };
  run('wormMaw', 1.2, 4); assert.ok(w.hurts.some((h) => h.source === 'wormMaw'), 'the maw tentacles reach four tiles');
  run('wormSuction', 2.6, 5); assert.ok(w.pulled > 0, 'it drags you in');
  run('wormRocks', 2.5, 6); assert.ok(w.fx.some((f) => f.kind === 'mortar' && f.rock) || w.hurts.some((h) => h.source === 'mortar'), 'rocks are thrown');
  w.fx = []; run('wormTentacles', 1, 8);
  let field = w.enemies.filter((q) => q.wormOf === m.id && !q.dead); assert.equal(field.length, WORM.fieldTentacles);
  assert.ok(field.some((q) => q.tentacleMode === 'laser') && field.some((q) => q.tentacleMode === 'fire'), 'one of each');
  for (let i = 0; i < 4; i++) { m.pack = freshPackState(); m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 }; m.pack.gap = 0; m.pack.seq = i + 1; step(w, 1); }
  field = w.enemies.filter((q) => q.wormOf === m.id && !q.dead); assert.ok(field.length <= WORM.tentaclesMax); assert.ok(field.filter((q) => q.tentacleMode === 'laser').length <= WORM.lasersMax);
  m.packAttacks = []; m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 }; w.hurts = []; w.fx = [];
  const laser = field.find((q) => q.tentacleMode === 'laser'), xy = [laser.x, laser.y];
  w.player.x = laser.x + 3; w.player.y = laser.y; step(w, 4);
  assert.ok(w.hurts.filter((h) => h.source === 'wormLaser').length >= 3, 'the laser stays on you'); assert.deepEqual([laser.x, laser.y], xy, 'tentacles never move');
  assert.ok(w.fx.some((f) => f.kind === 'orb' && f.fire), 'fire tentacles spit fireballs');
  laser.dead = true; w.hurts = []; for (const q of field) if (q !== laser && q.tentacleMode === 'laser') q.dead = true; step(w, 2);
  assert.ok(!w.hurts.some((h) => h.source === 'wormLaser'), 'cut down, the lasers stop');
  m.dead = true; step(w, .2); assert.ok(field.every((q) => q.dead), 'the tentacles sink when the worm dies');
  const v = world(), n = worm(v); v.player.x = 14; v.player.y = 12; n.packAttacks = ['wormRise']; n.pack.worm = { mode: 'surfaced', t: 99, trips: 0 }; n.pack.gap = 0;
  let hid = false; step(v, 3.5, () => { hid ||= n.hidden; });
  assert.ok(hid, 'it dives'); assert.ok(v.hurts.some((h) => h.source === 'wormRise'), 'and bursts up under a Wayfarer who stands still');
});

test('ooze and bloblets keep clear of high ground, including the low ground a raised plateau is drawn over', () => {
  // Tim (2026-10-20): "Ooze can still land on high ground. And bloblets." A level-4 plateau is drawn about 1.4 tiles up,
  // so its top covers the low tiles just north of it; nothing of the Blob's may land there either.
  const w = world(), b = blob(w, 11, 10); b.packAttacks = []; w.elevation = (x, y) => (Math.floor(y + .75) >= 14 ? 4 : 0);
  w.player.x = 2; w.player.y = 2;
  for (let i = 0; i < 12; i++) { b.hp -= 40; step(w, .5); }
  const oozes = w.fx.filter((f) => f.kind === 'ooze'); assert.ok(oozes.length >= 4, 'it still spatters');
  assert.ok(oozes.every((f) => f.y + 1.5 < 13.25), `none on or under the plateau: ${oozes.map((f) => f.y.toFixed(2))}`);
  b.packAttacks = ['blobBloblets']; for (let i = 0; i < 3; i++) { b.pack = freshPackState(); b.pack.gap = 0; b.pack.seq = i; step(w, 1.2); }
  const kids = w.enemies.filter((q) => q.blobletOf === b.id); assert.ok(kids.length >= 1);
  for (const k of kids) assert.ok(w.elevation(k.x, k.y) < 4, 'no bloblet stands on high ground');
});

test('the Tremor Worm spews lava that spills outward, lies hot for a couple of seconds and burns', () => {
  const w = world(), m = worm(w, 6, 12); w.player.x = 9; w.player.y = 12; m.packAttacks = ['wormLavaSpew']; m.pack = freshPackState(); m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 }; m.pack.gap = 0;
  step(w, .65 + .5); const early = w.fx.filter((f) => f.kind === 'lava').map((f) => ({ id: f.id, x: f.x, r: f.radius }));
  assert.ok(early.length >= 4, 'it pours');
  step(w, .6); const later = w.fx.filter((f) => f.kind === 'lava');
  const moved = early.filter((q) => { const f = later.find((z) => z.id === q.id); return f && (f.x > q.x + .05 || f.radius > q.r + .05); });
  assert.ok(moved.length >= 1, 'it runs outward and spreads like spilled water');
  assert.ok(later.every((f) => f.x >= m.x - .5), 'along the way the worm faces');
  assert.ok(w.hurts.some((h) => h.source === 'wormLava'), 'it burns whoever stands in it');
  m.packAttacks = []; m.dead = true; step(w, WORM.lavaLife + .5); assert.ok(!w.fx.some((f) => f.kind === 'lava'), 'and cools away after a couple of seconds');
});
