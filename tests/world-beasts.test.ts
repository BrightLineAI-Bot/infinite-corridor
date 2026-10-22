import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { WORLD_BEASTS, ensureWorldBeasts, worldBeastFor, worldBeastPlayerFell, worldBeastSlain, tuneWorldBeast, worldBeastTriesLeft } from '../src/world-beasts.ts';
import { MONSTER_PACK, BLOB, WORM, TURTLE, KNIGHT, CRYSTAL, nanoScatters, glyphsReachSwarm, reflectShots, updatePackMonster, tickPackEffects, addPackEffect, freshPackState, packCombatantFields } from '../src/monster-pack.ts';
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
  const s = opened(freshSave()); s.seed = 'WB'; ensureWorldBeasts(s);
  const map = generateRegion(s.seed, 9, 9);
  let claimed = null;
  for (let ry = 6; ry < 40 && !claimed; ry++) for (let rx = 6; rx < 40 && !claimed; rx++) { const m = generateRegion(s.seed, rx, ry); if (m.settlement) continue; const sp = worldBeastFor(s, m, rx, ry); if (sp) claimed = { rx, ry, sp }; }
  assert.ok(claimed, 'a beast claims a section sooner or later');
  const id = claimed.sp.worldBeast; assert.ok(WORLD_BEASTS[id]); assert.equal(claimed.sp.kind, WORLD_BEASTS[id].kind);
  assert.deepEqual(worldBeastFor(s, generateRegion(s.seed, claimed.rx, claimed.ry), claimed.rx, claimed.ry)?.id, claimed.sp.id, 'it stays in its section');
  assert.equal(worldBeastFor(s, map, 1, 1), null, 'never near the Refuge');
  assert.equal(worldBeastTriesLeft(s, id), 4); // release 307: four tries
  assert.match(worldBeastPlayerFell(s, claimed.rx, claimed.ry, [id]), /3 tries remain/);
  assert.equal(worldBeastPlayerFell(s, claimed.rx, claimed.ry, []), null, 'only while it lives');
  worldBeastPlayerFell(s, claimed.rx, claimed.ry, [id]); worldBeastPlayerFell(s, claimed.rx, claimed.ry, [id]); // release 307: four tries
  assert.equal(worldBeastPlayerFell(s, claimed.rx, claimed.ry, [id]), WORLD_BEASTS[id].gone);
  assert.equal(s.worldBeasts[id].active, null); assert.equal(s.worldBeasts[id].cooldown, WORLD_BEASTS[id].cooldownEscaped);
  const t = opened(freshSave()); t.worldBeasts = { morphingBlob: { active: { rx: 8, ry: 8, tries: 1 }, cycle: 2 } }; ensureWorldBeasts(t); const marks = t.currency;
  const won = worldBeastSlain(t, 'morphingBlob'); assert.equal(t.currency, marks + won.marks); assert.equal(t.worldBeasts.morphingBlob.active, null); assert.equal(t.worldBeasts.morphingBlob.slain, 1);
  const q = opened(freshSave()); ensureWorldBeasts(q); q.questingBeast = { active: { rx: 30, ry: 30, tries: 0 } };
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

test('the worm\'s tentacles cannot be outrun: left behind, they sink and come up around you again', () => {
  // Tim (2026-10-20): "wherever you go … they'll go back in the ground and pop up around you … you can't really escape them".
  const w = world({ size: 40, player: { x: 12, y: 12 } }), m = worm(w, 6, 12);
  m.packAttacks = ['wormTentacles']; m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 }; m.pack.gap = 0; step(w, 1.6);
  m.packAttacks = []; const field = w.enemies.filter((q) => q.wormOf === m.id && !q.dead); assert.equal(field.length, WORM.fieldTentacles);
  field[0].hp = 7; const modes = field.map((q) => q.tentacleMode);
  w.player.x = 34; w.player.y = 34; m.pack.worm = { mode: 'surfaced', t: 99, trips: 0 };
  let sank = false; step(w, 1, () => { m.pack.worm.t = 99; });
  assert.ok(field.every((q) => !q.hidden), 'not at once');
  step(w, WORM.tentacleFollowDelay + WORM.tentacleSink + .2, () => { m.pack.worm.t = 99; sank ||= field.some((q) => q.hidden); });
  assert.ok(sank, 'they go back into the ground');
  step(w, WORM.tentacleUnder[1] + WORM.tentacleRise + .5, () => { m.pack.worm.t = 99; });
  for (const q of field) { assert.ok(!q.dead && !q.hidden && !q.untargetable, 'and come up again'); assert.ok(Math.hypot(q.x - 34, q.y - 34) <= WORM.tentacleRing[1] + 2.1, `around you: ${q.x},${q.y}`); }
  assert.equal(field[0].hp, 7, 'the same tentacle, wounds and all'); assert.deepEqual(field.map((q) => q.tentacleMode), modes);
  assert.equal(w.enemies.filter((q) => q.wormOf === m.id && !q.dead).length, WORM.fieldTentacles, 'no new ones');
});

// Release 239: retreat.
import { BEAST_HOMES, RETREAT, retreatPath, worldBeastPatience, beginRetreat, retreatSide, retreatTarget, retreatCrossed, worldBeastsLost } from '../src/world-beasts.ts';
import { Game } from '../src/game.ts';

test('out of patience, a beast picks the nearest home section and heads for it; unfollowed, it is gone; it takes no tries', () => {
  const s = freshSave(); s.seed = 'FLEE'; s.worldBeasts = { morphingBlob: { active: { rx: 5, ry: 5, tries: 1 }, cycle: 4 } }; ensureWorldBeasts(s);
  assert.equal(worldBeastPatience(s, 'morphingBlob', WORLD_BEASTS.morphingBlob.patience - 1), false);
  assert.equal(worldBeastPatience(s, 'morphingBlob', 1.5), true);
  const probe = (rx, ry) => ({ biome: rx === 8 && ry === 4 ? 'blight' : rx === 2 && ry === 9 ? 'swamp' : 'ash' });
  const r = beginRetreat(s, 'morphingBlob', 5, 5, probe);
  assert.deepEqual([r.home.rx, r.home.ry, r.home.found], [8, 4, true], 'the nearest mire (4 sections away, not 7)');
  assert.match(r.message, /Blight Mire/);
  const q = s.worldBeasts.morphingBlob.active; assert.equal(retreatSide(q.retreat, 5, 5), 'east'); assert.equal(retreatSide(q.retreat, 8, 5), 'north'); assert.equal(retreatSide(q.retreat, 8, 4), null);
  assert.equal(worldBeastPlayerFell(s, 5, 5, ['morphingBlob']), null, 'a retreating beast takes no tries');
  const m = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(m.worldBeasts.morphingBlob.active.retreat.home, { rx: 8, ry: 4, found: true }, 'the retreat survives a save');
  retreatCrossed(s, 'morphingBlob', 'east'); const q2 = s.worldBeasts.morphingBlob.active; assert.deepEqual([q2.rx, q2.ry, q2.retreat.side], [6, 5, 'west']);
  assert.deepEqual(worldBeastsLost(s, 'overworld', 6, 5), [], 'followed: still there');
  const spawn = worldBeastFor(s, generateRegion(s.seed, 6, 5), 6, 5); assert.ok(spawn.retreating); assert.ok(spawn.x < 3, 'it comes in by the west gate');
  assert.deepEqual(worldBeastsLost(s, 'overworld', 6, 6), ['morphingBlob'], 'not followed: gone');
  assert.equal(s.worldBeasts.morphingBlob.active, null); assert.equal(s.worldBeasts.morphingBlob.escaped, 1); assert.equal(s.worldBeasts.morphingBlob.cycle, 5);
  const t = freshSave(); t.worldBeasts = { tremorWorm: { active: { rx: 0, ry: 9, tries: 0 } } }; ensureWorldBeasts(t);
  const far = beginRetreat(t, 'tremorWorm', 0, 9, () => ({ biome: 'ash' })); assert.equal(far.home.found, false); assert.equal(Math.abs(far.home.rx) + Math.abs(far.home.ry - 9), RETREAT.fallback, 'no home in reach: it flees into the distance');
  assert.ok(BEAST_HOMES.mire && BEAST_HOMES.dunes && BEAST_HOMES.water && BEAST_HOMES.canyon && BEAST_HOMES.glass && BEAST_HOMES.dungeon);
});

test('a retreating beast cannot be hurt, goes straight when it has no path, leaves by its gate, and fades into its home ground', () => {
  const w = world(), b = blob(w, 4, 12); w.open = () => false; w.tileOpen = () => false; // nothing is open: it moves by its own laws
  b.fleeTo = { x: 20, y: 12, side: 'east' }; b.fleeSpeed = 4; step(w, 1);
  assert.ok(b.untargetable); assert.ok(b.x > 7, 'straight through'); assert.equal(w.hurts.length, 0, 'it no longer fights');
  step(w, 4); assert.ok(b.fleeDone, 'it reaches its gate');
  const v = world(), m = worm(v, 4, 12); m.fleeTo = { x: 6, y: 12, home: true }; m.fleeSpeed = 4; let hid = false; step(v, .8, () => { hid ||= m.hidden; });
  assert.ok(hid, 'the worm swims under the ground'); assert.ok(m.fleeFade < 1 && !m.fleeDone, 'and sinks into its home');
  step(v, RETREAT.fade + .2); assert.ok(m.fleeDone);
  const map = { tiles: [{ x: 3, y: 3, kind: 'ash' }, { x: 9, y: 4, kind: 'toxicWater' }, { x: 25, y: 25, kind: 'swampWater' }], objects: [] };
  const t = retreatTarget({ home: { rx: 1, ry: 1, found: true } }, 'morphingBlob', map, 1, 1, { east: 10, west: 10, north: 10, south: 10 }, { x: 5, y: 5 });
  assert.deepEqual([t.x, t.y, t.home], [9, 4, true], 'the nearest pool');
});

test('in a real game: the Blob runs out of patience, flees through the gate, and is there when you follow', () => {
  const s = freshSave(); s.seed = 'FLEE-GAME'; s.level = 6;
  let rx = 7, ry = 2; while (generateRegion(s.seed, rx, ry).settlement) rx++;
  s.worldBeasts = { morphingBlob: { active: { rx, ry, tries: 0, patience: WORLD_BEASTS.morphingBlob.patience - .5 }, cycle: 0 } };
  const g = new Game(s, 0); g.rx = rx; g.ry = ry; g.loadArea('overworld');
  const b = g.enemies.find((e) => e.worldBeast === 'morphingBlob'); assert.ok(b); g.player.x = b.x + 3; g.player.y = b.y; g.player.hp = 1e6;
  const idle = { state: { x: 0, y: 0 }, consume: () => false };
  let t = 1000; for (let i = 0; i < 60; i++) { g.update(1 / 30, idle, t += 33); g.player.hp = 1e6; }
  const q = s.worldBeasts.morphingBlob.active; assert.ok(q.retreat, 'it gives up'); assert.ok(b.untargetable && b.fleeTo);
  const before = g.enemies.filter((e) => !e.dead).length;
  for (let i = 0; i < 30 * 40 && g.enemies.includes(b); i++) { g.update(1 / 30, idle, t += 33); g.player.hp = 1e6; }
  if (!q.retreat.home.found || q.rx !== rx || q.ry !== ry) {
    assert.ok(!g.enemies.includes(b), 'it has left the section');
    const side = b.fleeTo.side; assert.ok(side); const [dx, dy] = { east: [1, 0], west: [-1, 0], south: [0, 1], north: [0, -1] }[side];
    g.transitionSection(dx, dy);
    const again = g.enemies.find((e) => e.worldBeast === 'morphingBlob' && !e.dead); assert.ok(again && again.retreating, 'followed: there it is, still fleeing');
    g.transitionSection(-dx, -dy); assert.equal(s.worldBeasts.morphingBlob.active, null, 'turn back and it is gone');
  }
  assert.ok(before >= 0);
});

test('a retreat respects the land: around walls, over chasms with a bound, by the bridge over water; the worm under walls, the turtle through all', () => {
  // Tim (2026-10-20): "if there's a wall … go around it … a creature that can't fly … find a bridge … jump over the large chasms".
  const W = 12, map = (paint) => ({ tiles: Array.from({ length: W * W }, (_, i) => paint(i % W, Math.floor(i / W))) });
  const t = (x, y, kind, blocked = false) => ({ x, y, kind, blocked });
  const wall = map((x, y) => x === 6 && y < 10 ? t(x, y, 'ash', true) : t(x, y, 'ash'));
  const p1 = retreatPath(wall, { x: 2, y: 2 }, { x: 10, y: 2 }, 'walk', W); assert.ok(p1); assert.ok(p1.some((q) => q.y >= 10), 'round the end of the wall');
  const wp = retreatPath(wall, { x: 2, y: 2 }, { x: 10, y: 2 }, 'burrow', W); assert.ok(wp.every((q) => q.y < 4), 'the worm goes under it');
  const river = map((x, y) => x === 6 ? (y === 9 ? t(x, y, 'bridge') : t(x, y, 'river', true)) : t(x, y, 'ash'));
  const p2 = retreatPath(river, { x: 2, y: 2 }, { x: 10, y: 2 }, 'walk', W); assert.ok(p2.some((q) => q.x === 6 && q.y === 9) || p2.some((q, i) => i && q.y >= 8), 'by the bridge');
  const sea = map((x, y) => x === 6 ? t(x, y, 'lakeWater', true) : t(x, y, 'ash'));
  assert.equal(retreatPath(sea, { x: 2, y: 2 }, { x: 10, y: 2 }, 'walk', W), null, 'no bridge, no way (it then goes by its own laws)');
  assert.equal(retreatPath(sea, { x: 2, y: 2 }, { x: 10, y: 2 }, 'burrow', W), null, 'not even under the water');
  assert.ok(retreatPath(sea, { x: 2, y: 2 }, { x: 10, y: 2 }, 'through', W), 'the turtle wades through');
  const canyon = map((x, y) => x >= 5 && x <= 7 ? t(x, y, 'canyon', true) : t(x, y, 'ash'));
  const p3 = retreatPath(canyon, { x: 2, y: 2 }, { x: 10, y: 2 }, 'walk', W); assert.ok(p3.some((q) => q.leap), 'it bounds over the chasm');
  const w = world(), b = blob(w, 2, 2); b.fleeTo = { x: 10, y: 2, side: 'east' }; b.fleePath = p3; b.fleeSpeed = 4; let lift = 0; step(w, 4, () => { lift = Math.max(lift, b.hopLift || 0); });
  assert.ok(lift > .5, 'airborne over it'); assert.ok(b.fleeDone);
  const v = world(), m = worm(v, 2, 2); m.fleeTo = { x: 12, y: 2, side: 'east' }; m.fleeSpeed = 3; step(v, 2);
  assert.ok(v.fx.filter((f) => f.kind === 'furrow').length >= 3, 'the worm leaves a wake of churned earth'); assert.ok(v.hurts.length === 0);
  step(v, 2.5); assert.ok(!v.fx.some((f) => f.kind === 'furrow' && f.age > 2.3), 'which settles away');
});

// Release 241: the Mountain Turtle.
function turtle(w, x = 6, y = 12) { const c = createCombatant('mountainTurtle', x, y, true, []); Object.assign(c, { id: 'turtle-1', aggro: true, hp: 3000, maxHp: 3000, damage: 20 }); w.enemies.push(c); return c; }

test('the Mountain Turtle: about twice the Questing Beast, slow, a world beast that goes home to a canyon through everything', () => {
  assert.ok(MONSTER_PACK.mountainTurtle.form.scale >= MONSTER_PACK.questingBeast.form.scale * 1.9); assert.equal(MONSTER_PACK.mountainTurtle.movement, 'lurch'); assert.equal(MONSTER_PACK.mountainTurtle.unique, true);
  assert.equal(WORLD_BEASTS.mountainTurtle.home, 'canyon'); assert.equal(WORLD_BEASTS.mountainTurtle.retreatMoves, 'through');
  const s = freshSave(); s.level = 10; const c = createCombatant('mountainTurtle', 5, 5, true, []); tuneWorldBeast(c, s, 'mountainTurtle', { meleeBonus: 4 }); assert.ok(c.hp > 700); assert.equal(c.evasive, true);
});

test('the Turtle\'s attacks: a stomp you jump, a dash that leaves fire or bursting ice, a spin that flings lasting twisters, an ice comet, an ice shield', () => {
  const w = world({ size: 40, player: { x: 12, y: 20 } }), t = turtle(w, 12, 12); w.pulled = 0; w.pull = (src, step) => { w.pulled += step; }; w.slowed = 0; w.slow = () => { w.slowed++; };
  const run = (id, seconds, dx = 2.5, dy = 0, seq = 0) => { t.x = 12; t.y = 12; w.player.x = t.x + dx; w.player.y = t.y + dy; t.packAttacks = [id]; t.pack = freshPackState(); t.pack.gap = 0; t.pack.seq = seq; w.hurts = []; step(w, seconds); };
  run('turtleStomp', 1); assert.ok(w.hurts.some((h) => h.source === 'turtleStomp')); assert.ok(w.fx.some((f) => f.kind === 'shock' && f.stone), 'a ring of heaved ground rolls out');
  w.fx = []; run('turtleDash', 1.8, 6, 0, 0); const trailA = w.fx.filter((f) => f.kind === 'flameTrail' || f.kind === 'frostTrail');
  assert.ok(trailA.length >= 3, 'a trail'); assert.ok(t.x > 15, 'it bursts forward');
  w.fx = []; let kinds = new Set(trailA.map((f) => f.kind)); for (let q = 1; q < 6 && kinds.size < 2; q++) { w.fx = []; run('turtleDash', 1.8, 6, 0, q); for (const f of w.fx) if (f.kind === 'flameTrail' || f.kind === 'frostTrail') kinds.add(f.kind); }
  assert.deepEqual([...kinds].sort(), ['flameTrail', 'frostTrail'], 'fire one time, ice another');
  const ice = { kind: 'frostTrail', owner: t.id, x: 30, y: 30, radius: .75, arming: 0, life: 2.1, total: 2.1, damage: 3, burst: 9 }; w.fx = [ice]; t.packAttacks = []; w.player.x = 30.5; w.player.y = 30; w.hurts = []; step(w, 2.4);
  assert.ok(w.hurts.some((h) => h.source === 'frostTrail'), 'the ice stings'); assert.ok(w.hurts.some((h) => h.source === 'iceBurst'), 'and bursts after a couple of seconds');
  w.fx = []; run('turtleSpin', 3.2, 2.2); const tw = w.fx.filter((f) => f.kind === 'twister'); assert.ok(tw.length >= 3 && tw.length <= TURTLE.twisterMax, `twisters: ${tw.length}`);
  assert.ok(w.hurts.some((h) => h.source === 'turtleSpin')); t.packAttacks = []; w.player.x = 38; w.player.y = 38; step(w, 5); assert.ok(w.fx.filter((f) => f.kind === 'twister').length === tw.length, 'they persist'); assert.ok(tw.some((f) => Math.hypot(f.x - 12, f.y - 12) > 3), 'and wander off');
  w.fx = []; run('turtleComet', 3, 6); assert.ok(w.hurts.some((h) => h.source === 'turtleComet'), 'the comet bursts on you'); assert.ok(w.fx.some((f) => f.kind === 'frostTrail' && f.radius === TURTLE.cometFrost), 'and leaves the ground frozen');
  run('turtleShield', .8, 5); assert.ok(t.iceShield && t.untargetable, 'shielded, nothing reaches it'); step(w, 3.6 + .5); assert.ok(!t.iceShield && !t.untargetable, 'then the ice falls away');
  const v = world(), u = turtle(v, 12, 12); u.packAttacks = []; u.evasive = true; v.player.x = 13.5; v.player.y = 12; v.playerSwinging = true; const x0 = u.x; step(v, .1);
  assert.ok(u.tucked && u.untargetable, 'its dodge: it pulls into its shell'); assert.equal(u.x, x0, 'without springing anywhere'); v.playerSwinging = false; step(v, 1); assert.ok(!u.tucked);
});

test('retreat fixes: a fleeing beast passes through settlements and the Questing Beast\'s ground, says it is fleeing, and a claim with nowhere to stand is let go', () => {
  const s = freshSave(); s.seed = 'FIX'; s.worldBeasts = { tremorWorm: { active: { rx: 3, ry: 4, tries: 0, retreat: { home: { rx: 9, ry: 4, found: true }, side: 'west', legs: 2 } }, cycle: 1 } }; ensureWorldBeasts(s);
  const settled = { settlement: { id: 'x' }, tiles: [] }; const sp = worldBeastFor(s, settled, 3, 4); assert.ok(sp && sp.retreating, 'through a settlement');
  const g = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'); assert.match(g, /is fleeing through here toward/); assert.match(g, /beast&&!worldBeastFound\?\.retreating\?null:worldBeastFound/); assert.match(g, /get canyon\(\)/);
  // Release 261: the Mountain Turtle now walks the sea on ice, so the land-bound Blob stands in for "nowhere to stand".
  const t = freshSave(); t.worldBeasts = { morphingBlob: { active: { rx: 7, ry: 7, tries: 0 }, cycle: 0 } }; ensureWorldBeasts(t);
  const sea = { tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ocean', blocked: true })) };
  assert.equal(worldBeastFor(t, sea, 7, 7), null); assert.equal(t.worldBeasts.morphingBlob.active, null, 'all water: it does not hold the section');
});

test('the Turtle\'s second spin: it careens around rebounding off walls, flinging icicles every way', () => {
  // Tim (2026-10-20): "a second variant … it spins around and bounces around the stage … launches icicles that fly out in all directions".
  const w = world({ size: 20, player: { x: 4, y: 10 } }), t = turtle(w, 10, 10); t.packAttacks = ['turtleCyclone']; t.pack.gap = 0;
  const xs = []; let maxIcicles = 0; const angles = new Set();
  step(w, 4, () => { xs.push(t.x); const ice = w.fx.filter((f) => f.kind === 'orb' && f.icicle); maxIcicles = Math.max(maxIcicles, ice.length); for (const f of ice) angles.add(Math.round(Math.atan2(f.vy, f.vx) * 2)); });
  const turns = xs.slice(2).filter((x, i) => Math.sign(x - xs[i + 1]) !== Math.sign(xs[i + 1] - xs[i]) && Math.abs(x - xs[i + 1]) > 1e-6).length;
  assert.ok(turns >= 1, 'it rebounds'); assert.ok(angles.size >= 8, `icicles every way (${angles.size} headings)`); assert.ok(maxIcicles <= 30, `bounded (${maxIcicles})`);
  assert.ok(w.hurts.some((h) => h.source === 'turtleCyclone' || h.source === 'orb'), 'it hurts whoever it meets');
  assert.ok(MONSTER_PACK.mountainTurtle.attacks.includes('turtleSpin') && MONSTER_PACK.mountainTurtle.attacks.includes('turtleCyclone'), 'both spins');
});

// Release 245: the Nanobot Knight.
function knight(w, x = 6, y = 12) { const c = createCombatant('nanobotKnight', x, y, true, []); Object.assign(c, { id: 'knight-1', aggro: true, hp: 3000, maxHp: 3000, damage: 20 }); w.enemies.push(c); return c; }

test('plain steel scatters the Nanobot Knight; elements, spells and an Echo-glyphed weapon reach it', () => {
  // Tim (2026-10-19): "physical hits scatter it unless the attack is elemental, a spell, or the weapon has the echo glyph".
  const k = { kind: 'nanobotKnight' };
  assert.equal(nanoScatters(k, { physical: true }), true, 'a plain sword or arrow');
  assert.equal(nanoScatters(k, { physical: true, echoGlyph: true }), false, 'a weapon carrying the Echo glyph');
  assert.equal(nanoScatters(k, { physical: false }), false, 'magic shots, spells, glyph procs, burns, echoes');
  assert.equal(nanoScatters({ kind: 'questingBeast' }, { physical: true }), false, 'nobody else');
  const g = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  assert.match(g, /scattered = this\.scatterCheck\(e, true, glyphsReachSwarm\(glyphs\), now\), dealt = scattered \? 0/, 'melee swings');
  assert.match(g, /this\.scatterCheck\(e, shot\.damageType === "physical", !!shot\.glyphHost && glyphsReachSwarm\(this\.glyphLoadout\(shot\.glyphHost\)\), now\)\) \? 0/, 'shots');
  const has = (...ids) => ({ has: (id) => ids.includes(id) }); // release 249: an elemental glyph reaches it as well
  for (const id of ['echo', 'ignite', 'chain', 'volatile']) assert.equal(glyphsReachSwarm(has(id)), true, id);
  for (const id of ['heavy', 'swift', 'pierce', 'leech']) assert.equal(glyphsReachSwarm(has(id)), false, id);
  assert.equal(WORLD_BEASTS.nanobotKnight.home, 'glass'); assert.equal(MONSTER_PACK.nanobotKnight.unique, true);
});

test('the Knight\'s attacks: sliding cuts, a tracking arm cannon, swordfall, seeker orbs, a missile barrage, mist step; no orbital lance', () => {
  const w = world({ size: 40, player: { x: 20, y: 20 } }), kn = knight(w, 14, 20);
  const run = (id, seconds, px = 20, py = 20, seq = 0) => { kn.x = 14; kn.y = 20; w.player.x = px; w.player.y = py; kn.packAttacks = [id]; kn.pack = freshPackState(); kn.pack.gap = 0; kn.pack.seq = seq; w.hurts = []; w.fx = []; step(w, seconds); };
  run('knightSlide', 2.4); assert.ok(w.hurts.filter((h) => h.source === 'knightSlide').length >= 2, 'it skids in and cuts, again and again'); assert.ok(kn.x > 16, 'sliding');
  run('knightCannon', 2.2, 19, 23); assert.ok(w.hurts.some((h) => h.source === 'knightCannon'), 'the cannon tracked you while charging');
  run('knightSwordfall', 2.4); assert.equal(w.fx.filter((f) => f.kind === 'swordfall').length, KNIGHT.swords); assert.ok(w.hurts.some((h) => h.source === 'swordfall'), 'one falls on you');
  assert.ok(![...MONSTER_PACK.nanobotKnight.attacks, ...MONSTER_PACK.nanobotKnight.bossAttacks].includes('knightOrbital'), 'the orbital sky beam belongs to the Crystal, not the Knight');
  assert.ok(![...MONSTER_PACK.nanobotKnight.attacks, ...MONSTER_PACK.nanobotKnight.bossAttacks].includes('psyOrbital'));
  for (const seq of [0, 1]) {
    run('knightOrbs', .65, 24, 20, seq); const orbs = w.fx.filter((f) => f.kind === 'nanoOrb'); assert.equal(orbs.length, KNIGHT.orbs, 'orbs gather');
    assert.ok(orbs.every((f) => Math.hypot(f.x - kn.x, f.y - kn.y) < KNIGHT.orbOrbit + .2), 'circling it');
    step(w, KNIGHT.orbFloat + .1); const sent = orbs.filter((f) => f.state !== 'circle').length;
    assert.ok(seq ? sent >= 1 : sent >= 1, 'then sent'); step(w, 3); assert.ok(w.hurts.some((h) => h.source === 'knightOrb'), 'they find you');
  }
  run('knightMissiles', .8, 22, 26); assert.equal(w.fx.filter((f) => f.kind === 'missile').length, KNIGHT.missiles); w.player.x = 39; w.player.y = 39; step(w, KNIGHT.missileFuel + 1);
  assert.equal(w.fx.filter((f) => f.kind === 'missile').length, 0, 'out of fuel, they burst');
  run('knightMist', 1.5, 24, 20); assert.ok(Math.hypot(kn.x - 24, kn.y - 20) < KNIGHT.mistLand + 1.5, 'it comes together beside you'); assert.ok(w.hurts.some((h) => h.source === 'knightMist'));
});

test('the Knight turns to mist at random when any attack comes at it: blade, shot or spell, even mid-attack', () => {
  // Tim (2026-10-20): "periodically … he'll dodge your attack … turn to mist … doesn't matter if it's a magic attack or a physical attack … it can be random".
  const tally = (setup) => { let mists = 0, rolls = 0; for (let n = 0; n < 60; n++) { const v = world(), m = knight(v, 12, 12); m.id = `knight-${n}`; m.packAttacks = []; m.evasive = true; setup(v, m); step(v, .1); rolls++; if (m.mist) mists++; } return mists / rolls; };
  const blade = tally((v) => { v.player.x = 13.5; v.player.y = 12; v.playerSwinging = true; });
  const shot = tally((v) => { v.player.x = 9; v.player.y = 12; v.playerShots = [{ x: 10.5, y: 12.45, dx: 1, dy: 0, damageType: 'magic' }]; });
  const spell = tally((v) => { v.player.x = 8; v.player.y = 12; v.playerBlasts = [{ x: 12.8, y: 12.5, radius: 1.2, damage: 9 }]; });
  for (const [name, r] of [['blade', blade], ['shot', shot], ['spell', spell]]) assert.ok(r > .15 && r < .7, `${name}: sometimes, not always (${r.toFixed(2)})`);
  const v = world(), m = knight(v, 12, 12); m.evasive = true; v.player.x = 15; v.player.y = 12; m.packAttacks = ['knightCannon']; m.pack.gap = 0; step(v, .4); assert.equal(m.pack.attack, 'knightCannon');
  let n = 0; for (; n < 40 && !m.mist; n++) { m.pack.cd.qbEvade = 0; v.playerShots = [{ x: 14, y: 12.45, dx: -1, dy: 0 }]; step(v, 1 / 30); }
  assert.ok(m.mist, 'it can vanish out of its own attack'); assert.equal(m.pack.attack, null);
  const at = { x: m.x, y: m.y }; v.playerShots = []; step(v, .5); assert.ok(!m.mist && Math.hypot(m.x - at.x, m.y - at.y) > 1, 'and comes together aside');
});

test('the Knight\'s blade: a thrust along any of eight ways with a beam off the tip at times, fore and back cuts with energy arcs, a retreating slash', () => {
  // Tim (2026-10-20): a thrust "forward or sideways … cardinal directions and diagonally", "a forward swing, a back swing", "a dodging
  // swing where he jumps back … while swinging", energy off the sword "about as large as the player's weapon melee attacks".
  const dirs = new Set(), beams = { yes: 0, no: 0 };
  for (let seq = 0; seq < 24; seq++) {
    const w = world({ size: 40, player: { x: 23, y: 21 } }), k = knight(w, 18, 20); k.packAttacks = ['knightThrust']; k.pack.gap = 0; k.pack.seq = seq; const x0 = k.x, y0 = k.y;
    step(w, .5); const d = k.pack.data?.dir; if (d) { dirs.add(`${Math.round(d.x)},${Math.round(d.y)}`); assert.ok(Math.abs(Math.hypot(d.x, d.y) - 1) < .01); }
    step(w, .4); if (Math.hypot(k.x - x0, k.y - y0) > 2) { if (w.fx.some((f) => f.kind === 'swordBeam')) beams.yes++; else beams.no++; }
  }
  assert.ok(dirs.size >= 3, `at you, and off at angles (${[...dirs]})`); assert.ok(beams.yes > 0 && beams.no > 0, `a beam off the tip, not always (${beams.yes}/${beams.no})`);
  // fore and back cuts; an energized cut reaches a Wayfarer standing beyond the blade
  let far = 0;
  for (let seq = 0; seq < 12; seq++) { const w = world({ size: 30, player: { x: 15 + .67 + KNIGHT.slideReach + 1.2, y: 12 } }), k = knight(w, 15, 12); k.packAttacks = ['knightCombo']; k.pack.gap = 0; k.pack.seq = seq; const swings = []; let arc = false; step(w, .75, () => { /* the first pair of cuts, before it dashes */ if (k.swing) swings.push(k.swing); arc ||= w.fx.some((f) => f.kind === 'swordArc'); }); assert.ok(swings.includes('fore') && swings.includes('back'), 'a cut forward and a cut back'); if (w.hurts.some((h) => h.source === 'knightCombo')) far++; assert.ok(!w.hurts.length || arc, 'the far hit came with an energy arc'); }
  assert.ok(far > 0 && far < 12, `only an energized cut reaches that far (${far}/12)`);
  { // the onslaught: six cuts, two dashes after you between the pairs
    const lengths = new Set();
    for (let seq = 0; seq < 20; seq++) {
      const w = world({ size: 40, player: { x: 20, y: 20 } }), k = knight(w, 14, 20); k.packAttacks = ['knightCombo']; k.pack.gap = 0; k.pack.seq = seq; let dashes = 0, was = false, cuts = 0;
      step(w, 4.5, () => { if (k.sliding && !was) dashes++; was = !!k.sliding; if (w.player.x < 34 && k.pack.data?.cuts > cuts) { cuts = k.pack.data.cuts; w.player.x += 2.2; } if (!k.pack.attack) k.packAttacks = []; });
      assert.ok([2, 4, 6].includes(cuts), `two, four or six cuts (${cuts})`); assert.equal(dashes, cuts / 2 - 1, 'a dash between each pair'); lengths.add(cuts);
    }
    assert.deepEqual([...lengths].sort(), [2, 4, 6], 'it varies how far it takes the onslaught');
  }
  // the retreating slash: it leaps away while its energy arc still finds you
  const w = world({ size: 30, player: { x: 13.5, y: 12 } }), k = knight(w, 12, 12); k.packAttacks = ['knightBackslash']; k.pack.gap = 0; step(w, .8);
  assert.ok(k.x < 10.5, 'it leaps back'); assert.ok(w.hurts.some((h) => h.source === 'knightBackslash'), 'cutting as it goes');
  // and sometimes, when it slips an attack, it leaps back slashing instead of turning to mist
  let slashes = 0, mists = 0; for (let n = 0; n < 60; n++) { const v = world(), m = knight(v, 12, 12); m.id = `kb-${n}`; m.packAttacks = []; m.evasive = true; v.player.x = 13.5; v.player.y = 12; v.playerSwinging = true; step(v, .1); if (m.pack.attack === 'knightBackslash') slashes++; if (m.mist) mists++; }
  assert.ok(slashes > 0 && mists > 0, `both answers (${slashes} slashes, ${mists} mists)`);
});

// Release 249: the Psychic Crystal.
import { worldBeastForDungeon, beginDungeonRetreat } from '../src/world-beasts.ts';
const opened = (s) => { s.perception.aperture = 1e6; return s; }; // release 273: world beasts are met only from their Aperture tier (world-beasts.ts BEAST_APERTURE)
function crystal(w, x = 10, y = 12) { const c = createCombatant('psychicCrystal', x, y, true, []); Object.assign(c, { id: 'crystal-1', aggro: true, hp: 3000, maxHp: 3000, damage: 20 }); w.enemies.push(c); return c; }

test('the Psychic Crystal: push, pull, a command grab you can dodge or struggle out of, hurled debris', () => {
  assert.equal(MONSTER_PACK.psychicCrystal.unique, true); assert.equal(MONSTER_PACK.psychicCrystal.movement, 'hover'); assert.equal(WORLD_BEASTS.psychicCrystal.home, 'water'); assert.ok(WORLD_BEASTS.psychicCrystal.dungeonChance > 0);
  const make = () => { const w = world({ size: 30, player: { x: 13, y: 12 } }); w.pulled = 0; w.pull = (src, st) => { w.pulled += st; }; let heldUntil = 0, dodging = false; w.grab = () => { if (dodging) return false; heldUntil = w.now + CRYSTAL.grabHold * 1000; return true; }; w.held = () => w.now < heldUntil; w.release = () => { heldUntil = 0; }; w.struggle = () => { heldUntil -= 3000; }; w.dodge = (on) => { dodging = on; }; return w; };
  const run = (w, c, id, seconds, seq = 0) => { c.packAttacks = [id]; c.pack = freshPackState(); c.pack.gap = 0; c.pack.seq = seq; w.hurts = []; step(w, seconds); c.packAttacks = []; };
  let w = make(), c = crystal(w); run(w, c, 'psyPush', 1.2); assert.ok(w.pushed > 0, 'thrown back'); assert.ok(w.hurts.some((h) => h.source === 'psyPush'));
  w = make(); c = crystal(w); w.player.x = 16; run(w, c, 'psyPull', 2); assert.ok(w.pulled > 0, 'drawn in');
  w = make(); c = crystal(w); run(w, c, 'psyGrab', .8); assert.ok(w.held(), 'seized'); step(w, CRYSTAL.grabHold + .2); assert.ok(w.hurts.some((h) => h.source === 'psyGrab'), 'and crushed');
  w = make(); c = crystal(w); run(w, c, 'psyGrab', .8); assert.ok(w.held()); w.struggle(); step(w, CRYSTAL.grabHold + .2); assert.ok(!w.hurts.some((h) => h.source === 'psyGrab'), 'struggled free: no crush');
  w = make(); c = crystal(w); w.dodge(true); run(w, c, 'psyGrab', .8); assert.ok(!w.held(), 'dodged as it reached'); step(w, 3); assert.ok(!w.hurts.some((h) => h.source === 'psyGrab'));
  w = make(); c = crystal(w); w.player.x = 17; c.packAttacks = ['psyDebris']; c.pack.gap = 0; step(w, 1.2);
  const rocks = w.fx.filter((f) => f.kind === 'debris'); assert.equal(rocks.length, CRYSTAL.debris, 'stones rise'); assert.ok(rocks.some((f) => f.state === 'lift'));
  c.packAttacks = []; step(w, 2.5); assert.ok(w.hurts.some((h) => h.source === 'psyDebris'), 'and are flung at you one by one');
});

test('the mirror wall sends arrows and bolts back; blades pass through; it falls with the Crystal', () => {
  const w = world({ size: 30, player: { x: 16, y: 12 } }), c = crystal(w); c.packAttacks = ['psyWall']; c.pack.gap = 0; step(w, .7); c.packAttacks = [];
  const wall = w.fx.find((f) => f.kind === 'psyWall'); assert.ok(wall, 'a wall stands between you'); assert.ok(wall.x > c.x && wall.x < 16);
  const arrow = { x: wall.x + .5 + 1, y: wall.y + .45, dx: -1, dy: 0, damage: 10 }, far = { x: 3, y: 3, dx: 1, dy: 0, damage: 10 }, foe = { x: wall.x + .5 + .2, y: wall.y + .45, dx: -1, dy: 0, damage: 10, hostile: true };
  arrow.x = wall.x + .5 + .2; assert.equal(reflectShots([arrow, far, foe], w.fx), 1);
  assert.ok(arrow.hostile && arrow.dx > 0, 'your arrow comes back at you'); assert.equal(arrow.damage, Math.round(10 * CRYSTAL.reflectShare)); assert.ok(!far.hostile && foe.dx < 0, 'others untouched');
  c.dead = true; step(w, .5); assert.ok(!w.fx.some((f) => f.kind === 'psyWall'), 'the wall goes with it');
  const g = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'); assert.match(g, /reflectShotStep\(p, mirrorWalls, step\)/, 'mirror contact is swept within projectile substeps'); assert.match(g, /this\.packEffects \|\| \[\]\)\.filter\(f => f\.kind === \"psyWall\"/, 'the production adapter passes mirror walls'); assert.match(g, /now < \(p\.heldUntil \|\| 0\)\) \{ x = 0; y = 0; if \(input\.consume\("dodge"\)\)/, 'held: no moving, and dodge struggles');
});

test('the Crystal haunts only dungeons with water, holds them, takes tries there, and retreats into the water', () => {
  const dry = { tiles: Array.from({ length: 900 }, (_, i) => ({ x: i % 30, y: Math.floor(i / 30), kind: 'deepFloor', blocked: false })), width: 30, entry: { x: 3, y: 3 } };
  const wet = { ...dry, tiles: dry.tiles.map((t) => (t.x >= 20 && t.x <= 22 && t.y >= 10 && t.y <= 14 ? { ...t, kind: 'dungeonWater', blocked: true } : t)) };
  const s = opened(freshSave()); s.seed = 'HAUNT'; s.level = 12; ensureWorldBeasts(s); s.worldBeasts.voidWalker.cooldown = 999; const dun = (tag, i) => `dungeon:HAUNT:g1:${3 + i}:4:${tag}-${i}`;
  for (let i = 0; i < 40; i++) assert.equal(worldBeastForDungeon(s, dry, dun('dry', i)), null, 'never without water');
  const young = opened(freshSave()); young.seed = 'HAUNT'; ensureWorldBeasts(young); young.worldBeasts.voidWalker.cooldown = 999; let youngSpawn = null; for (let i = 0; i < 40 && !youngSpawn; i++) youngSpawn = worldBeastForDungeon(young, wet, dun('wet', i)); assert.equal(youngSpawn?.kind, 'psychicCrystal', 'new Wayfarers can meet the level-eight-strength threat');
  for (const odd of ['dungeon:HAUNT:g1', 'arena:x', 'hunt-instance:y', 'dungeon:HAUNT:g1:1:1:near']) for (let n = 0; n < 5; n++) assert.equal(worldBeastForDungeon(s, wet, odd + (n ? `-${n}` : '')), null, `not ${odd}`);
  let id = null, spawn = null; for (let i = 0; i < 40 && !spawn; i++) { spawn = worldBeastForDungeon(s, wet, dun('wet', i)); if (spawn) id = dun('wet', i); }
  assert.ok(spawn && spawn.kind === 'psychicCrystal', 'some wet dungeons'); assert.ok(Math.hypot(spawn.x - 3, spawn.y - 3) >= 7, 'away from the entry');
  assert.ok(wet.tiles.some((t) => t.kind === 'dungeonWater' && Math.abs(t.x - spawn.x) + Math.abs(t.y - spawn.y) <= 4), 'near the water');
  assert.equal(worldBeastForDungeon(s, wet, id)?.id, spawn.id, 'it stays'); assert.equal(worldBeastForDungeon(s, wet, dun('other', 9)), null, 'one place at a time');
  assert.deepEqual(migrateSave(JSON.parse(JSON.stringify(s))).worldBeasts.psychicCrystal.active.dungeon, id, 'saved');
  assert.match(worldBeastPlayerFell(s, null, null, ['psychicCrystal'], id), /3 tries remain/); assert.equal(worldBeastPlayerFell(s, 5, 5, ['psychicCrystal']), null, 'not from the overworld');
  const r = beginDungeonRetreat(s, 'psychicCrystal', wet); assert.ok(r.home.found);
  const t = retreatTarget(s.worldBeasts.psychicCrystal.active.retreat, 'psychicCrystal', wet, 0, 0, {}, spawn); assert.ok(t.home && wet.tiles.find((q) => q.x === t.x && q.y === t.y).kind === 'dungeonWater', 'into the water');
  assert.deepEqual(worldBeastsLost(s, 'dungeon', 0, 0, id), [], 'while you are there'); assert.deepEqual(worldBeastsLost(s, 'overworld', 0, 0), ['psychicCrystal'], 'gone when you leave');
  const g = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8'); assert.match(g, /worldBeastForDungeon\(this\.save,this\.map,this\.areaId\(\)\)/); assert.match(g, /!c\.worldBeast\) tuneDungeonThreat\(c\)/);
});
