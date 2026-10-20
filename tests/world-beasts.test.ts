import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { generateRegion } from '../src/world.ts';
import { WORLD_BEASTS, ensureWorldBeasts, worldBeastFor, worldBeastPlayerFell, worldBeastSlain, tuneWorldBeast, worldBeastTriesLeft } from '../src/world-beasts.ts';
import { MONSTER_PACK, BLOB, updatePackMonster, tickPackEffects, addPackEffect, freshPackState, packCombatantFields } from '../src/monster-pack.ts';
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
  assert.equal(claimed.sp.kind, 'morphingBlob'); assert.equal(claimed.sp.worldBeast, 'morphingBlob');
  assert.deepEqual(worldBeastFor(s, generateRegion(s.seed, claimed.rx, claimed.ry), claimed.rx, claimed.ry)?.id, claimed.sp.id, 'it stays in its section');
  assert.equal(worldBeastFor(s, map, 1, 1), null, 'never near the Refuge');
  assert.equal(worldBeastTriesLeft(s, 'morphingBlob'), 3);
  assert.match(worldBeastPlayerFell(s, claimed.rx, claimed.ry, ['morphingBlob']), /2 tries remain/);
  assert.equal(worldBeastPlayerFell(s, claimed.rx, claimed.ry, []), null, 'only while it lives');
  worldBeastPlayerFell(s, claimed.rx, claimed.ry, ['morphingBlob']);
  assert.match(worldBeastPlayerFell(s, claimed.rx, claimed.ry, ['morphingBlob']), /seeps away/);
  assert.equal(s.worldBeasts.morphingBlob.active, null); assert.equal(s.worldBeasts.morphingBlob.cooldown, WORLD_BEASTS.morphingBlob.cooldownEscaped);
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
