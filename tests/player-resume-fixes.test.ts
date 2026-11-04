// Release 736: player-systems and exact-resume fixes from the full-game review (player F3 floor, F4-F14; saves S7-S9;
// combat C12/C13). Each test failed before the fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, dodgeCost, DODGE_COST, PLAYER_CLOCKS, GAME_CLOCKS } from '../src/game.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { ASCENDANCY, saplingHere } from '../src/ascendancy.ts';
import { grantTidemantle } from '../src/water-traversal.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';
import { WORLD_BEAST_IDS } from '../src/world-beasts.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const move = (x, y, presses = []) => { const p = new Set(presses); return { state: { x, y }, consume: (a) => p.delete(a), held: () => false }; };
const fresh = (seed = 'RESUME-736') => { const s = freshSave(); s.seed = seed; return s; };
// The real save path, without IndexedDB: snapshot, split into records, reassemble, validate (and migrate).
function roundTrip(g, now) {
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(now)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts))));
  assert.equal(v.health, 'healthy', v.error); return v.save;
}

test('F3: stacked dodge-cost reductions never make a dodge free or give stamina back; at the glyph cap it still costs 6', () => {
  const s = fresh();
  s.equipment.armor = { ...s.equipment.armor, tier: 'relic', glyphs: ['still', 'still', 'still'] };
  assert.equal(dodgeCost(s), 6, 'three still glyphs reach the cap of 60%: unchanged');
  const tess = (uid) => ({ uid, kind: 'gale', grade: 1, name: uid, lines: [{ k: 'dodgeCost', v: .15 }], from: 'test' });
  s.tesseracts = { ...(s.tesseracts || {}), owned: [tess('t1'), tess('t2'), tess('t3')], slots: ['t1', 't2', 't3'] };
  assert.ok(dodgeCost(s) >= DODGE_COST.min && DODGE_COST.min > 0, `cost ${dodgeCost(s)}`);
  const g = new Game(s, 0); g.player.stamina = 10; let t = 1000;
  g.update(1 / 30, move(1, 0, ['dodge']), t); assert.ok(g.player.stamina < 10, 'a dodge takes stamina');
});

test('F4: a grip, slow, confusion, stun and a glide end at death; the Wayfarer respawns able to move', () => {
  const g = new Game(fresh(), 0), p = g.player, t = 1000;
  Object.assign(p, { heldUntil: t + 60000, heldBy: 'crystal-1', slowUntil: t + 60000, slowFactor: .3, confusedUntil: t + 60000, stunnedUntil: t + 60000, stunnedAt: t });
  g.glide = { z: 4, vx: 0, vy: 0, open: true, told: false }; g.swimming = true;
  p.hp = 0; g.update(.05, idle, t);
  assert.equal(p.hp, g.save.maxHp, 'respawned');
  for (const k of ['heldUntil', 'slowUntil', 'confusedUntil', 'stunnedUntil']) assert.equal(p[k], 0, k);
  assert.equal(g.glide, null); assert.equal(g.swimming, false);
  const x0 = p.x, y0 = p.y; let now = t + 50; for (let i = 0; i < 30; i++) { g.update(1 / 30, move(i % 2 ? 1 : 0, i % 2 ? 0 : 1), now); now += 33; }
  assert.ok(Math.hypot(p.x - x0, p.y - y0) > .3, 'moves after respawning');
});

test('F5/C12: unpausing shifts every wall-clock timer by the paused time, so none runs out while paused', () => {
  const g = new Game(fresh(), 0), p = g.player, t = 1000, gap = 60000, set = {};
  for (const k of PLAYER_CLOCKS) p[k] = set[`p.${k}`] = t + 5000;
  for (const k of GAME_CLOCKS) g[k] = set[`g.${k}`] = t + 5000;
  g.golem = { x: 1, y: 1, start: t, nextAt: t + 700, sinkAt: null }; g.rite = { key: '0,0', at: { x: 1, y: 1 }, started: t, until: t + 300000, nextAt: t + 4000, n: 0 };
  g.shadowClone = { ox: 0, oy: 0, until: t + 3000 }; g.edgeHold = { dx: 1, dy: 0, at: t }; p.echoMist = { until: t + 900, hit: {} }; g.echoPatches = [{ kind: 'web', until: t + 3000 }];
  g.setPaused(true, t); g.setPaused(false, t + gap);
  for (const k of PLAYER_CLOCKS) assert.equal(p[k], set[`p.${k}`] + gap, `player.${k}`);
  for (const k of GAME_CLOCKS) assert.equal(g[k], set[`g.${k}`] + gap, k);
  for (const k of ['toolReadyAt', 'golemReadyAt', 'aegisUntil', 'boxingUntil', 'inkUntil', 'subDiveUntil', 'unstickReadyAt', 'fistRecoverUntil']) assert.ok(GAME_CLOCKS.includes(k), `${k} is in the list`);
  for (const k of ['slowUntil', 'confusedUntil', 'echoPounceUntil', 'echoWardReadyAt', 'echoMirrorReadyAt']) assert.ok(PLAYER_CLOCKS.includes(k), `${k} is in the list`);
  assert.deepEqual([g.golem.start, g.golem.nextAt, g.golem.sinkAt], [t + gap, t + 700 + gap, null]);
  assert.deepEqual([g.rite.started, g.rite.until, g.rite.nextAt], [t + gap, t + 300000 + gap, t + 4000 + gap]);
  assert.equal(g.shadowClone.until, t + 3000 + gap); assert.equal(g.edgeHold.at, t + gap, 'the edge hold'); assert.equal(p.echoMist.until, t + 900 + gap); assert.equal(g.echoPatches[0].until, t + 3000 + gap);
  // and a confusion of 3 s still reverses the stick after an 18 s pause (combat review C12)
  const h = new Game(fresh(), 0); h.player.confusedUntil = t + 3000; h.setPaused(true, t + 100); h.setPaused(false, t + 18500);
  const x0 = h.player.x; h.update(.05, move(1, 0), t + 18550); assert.ok(h.player.x < x0, 'still confused: right goes left');
});

test('F6/C13: a reload keeps the tool and golem cooldowns, confusion, stun, grip, slow, burning and the frenzy, as time remaining', () => {
  const s = fresh(), g = new Game(s, 0), p = g.player, t = 1000;
  Object.assign(p, { slowUntil: t + 4000, slowFactor: .5, confusedUntil: t + 3000, heldUntil: t + 2000, heldBy: 'crystal-9', stunnedUntil: t + 1500, stunnedAt: t - 200 });
  g.toolReadyAt = t + 7000; g.golemReadyAt = t + 9000; g.aegisUntil = t + 2500;
  g.playerFire = { left: 3, dps: 4, tick: .5 }; g.frenzy = { build: 2, active: false, forget: 3 };
  const later = 500000, h = new Game(roundTrip(g, t), later), q = h.player;
  assert.equal(q.slowUntil, later + 4000); assert.equal(q.slowFactor, .5);
  assert.equal(q.confusedUntil, later + 3000);
  assert.equal(q.heldUntil, later + 2000); assert.equal(q.heldBy, 'crystal-9');
  assert.equal(q.stunnedUntil, later + 1500); assert.equal(q.stunnedAt, later - 200);
  assert.equal(h.toolReadyAt, later + 7000); assert.equal(h.golemReadyAt, later + 9000); assert.equal(h.aegisUntil, later + 2500);
  assert.deepEqual(h.playerFire, { left: 3, dps: 4, tick: .5 }); assert.deepEqual(h.frenzy, { build: 2, active: false, forget: 3 });
  // saved while paused: the clock is the pause start, as for the other cooldowns
  const k = new Game(fresh(), 0); k.toolReadyAt = t + 5000; k.setPaused(true, t + 1000); const r = new Game(roundTrip(k, t + 90000), 0); assert.equal(r.toolReadyAt, 4000);
  // a status that has ended is not brought back
  const e = new Game(roundTrip(new Game(roundTrip(g, t + 10000), 0), 0), 0); assert.ok(!(e.player.slowUntil > 0) && !(e.toolReadyAt > 0) && e.playerFire?.left === 3);
});

const RITE_SEED = 'RITE1';
let daisAt = null;
const findDais = () => { for (let x = 4; x < 80 && !daisAt; x++) for (let y = -30; y < 30 && !daisAt; y++) if (saplingHere(RITE_SEED, x, y)) { const g = new Game(fresh(RITE_SEED), 0); g.rx = x; g.ry = y; g.loadArea('overworld', false); if (g.map.objects.some((o) => o.kind === 'saplingDais')) daisAt = [x, y]; } return daisAt; };

test('F7: reloading during a Rite of Ascendancy resumes it: its clock, its waves, its creatures and the burning dais', () => {
  const [x, y] = findDais(), s = fresh(RITE_SEED), g = new Game(s, 0); g.rx = x; g.ry = y; g.loadArea('overworld', false);
  const o = g.map.objects.find((q) => q.kind === 'saplingDais'); g.player.x = o.x; g.player.y = o.y + 1; g.lastUpdateNow = 1000;
  assert.ok(g.interact('begin', o.id).ok);
  const t = 1000 + ASCENDANCY.grace * 1000 + 10; g.riteTick(.05, t);
  const foes = g.enemies.filter((e) => e.riteFoe && !e.dead).map((e) => e.id).sort(); assert.ok(foes.length >= 2);
  const at = t + 30000, saved = roundTrip(g, at), later = 9e6, h = new Game(structuredClone(saved), later);
  assert.ok(h.rite, 'the rite is still burning'); assert.equal(h.rite.key, `${x},${y}`); assert.equal(h.rite.n, g.rite.n);
  assert.equal(h.rite.until - later, g.rite.until - at, 'the same time left'); assert.equal(later - h.rite.started, at - g.rite.started);
  assert.deepEqual(h.enemies.filter((e) => e.riteFoe && !e.dead).map((e) => e.id).sort(), foes, 'its creatures are still there');
  assert.equal(h.map.objects.find((q) => q.kind === 'saplingDais').state, 'burning'); assert.equal(h.save.ascendancy[`${x},${y}`].tries, 1);
  h.riteTick(.05, later + ASCENDANCY.duration * 1000); assert.equal(h.rite, null); assert.equal(h.save.ascendancy[`${x},${y}`].done, true, 'and can be won');
  // A journey saved mid-rite by an earlier build (no rite kept): the attempt is given back, with a notice.
  const old = structuredClone(saved); delete old.session.playerRuntime.rite; const k = new Game(old, later);
  assert.equal(k.rite ?? null, null); assert.equal(k.save.ascendancy[`${x},${y}`].tries, 0, 'attempt refunded'); assert.ok(k.questNotices?.some((n) => n.title === 'THE RITE IS LOST'), 'a notice says so'); assert.ok(k.save.narrative.journal.some((j) => j.text === ASCENDANCY.messages.resumeRefund), 'and the journal');
  assert.equal(k.map.objects.find((q) => q.kind === 'saplingDais').state, 'open');
  // One broken by leaving or dying stays spent.
  const d = new Game(structuredClone(saved), later); d.player.hp = 0; d.update(.05, idle, later + 50); assert.equal(d.save.ascendancy[`${x},${y}`].tries, 1);
  d.rx = x; d.ry = y; d.loadArea('overworld', false); assert.equal(d.save.ascendancy[`${x},${y}`].tries, 1, 'no refund for a broken rite');
});

test('F8: Wayglass travel lands the Wayfarer on foot (no glide, no swim, no grip)', () => {
  const g = new Game(fresh(), 0); g.glide = { z: 4, vx: 1, vy: 0, open: true, told: false }; g.swimming = true; g.player.heldUntil = 1e12; g.player.slowUntil = 1e12;
  assert.ok(g.travelToCheckpoint()); assert.equal(g.glide, null); assert.equal(g.swimming, false); assert.equal(g.player.heldUntil, 0); assert.equal(g.player.slowUntil, 0);
});

test('F8: lethal ground is judged where the Wayfarer ends up: a dodge into blocked lava or abyss stops at it and does not kill', () => {
  for (const [kind, blocked, dies] of [['lava', true, false], ['abyss', true, false], ['lava', false, true], ['canyon', true, true]]) {
    const g = new Game(fresh('WALL'), 0); g.loadArea('dungeon');
    g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], landscape: null, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: Math.floor(i / 32) === 12 ? kind : 'ash', blocked: Math.floor(i / 32) === 12 ? blocked : false })) };
    g.enemies = []; Object.assign(g.player, { x: 10, y: 10.5, hp: 60 }); let t = 1000, died = false;
    for (let i = 0; i < 60; i++) { g.update(1 / 60, move(0, 1), t); t += 16.7; }
    g.update(1 / 20, move(0, 1, ['dodge']), t); t += 50; if (g.player.hp <= 0 || g.save.worldFlags.deaths) died = true;
    for (let i = 0; i < 10 && !died; i++) { g.update(1 / 20, move(0, 1), t); t += 50; if (g.player.hp <= 0 || g.save.worldFlags.deaths) died = true; }
    assert.equal(died, dies, `${kind} blocked=${blocked}`);
  }
});

test('F9: the production frame loop never takes a negative time step after resume', () => {
  assert.match(readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'), /const dt = Math\.min\(0\.05, Math\.max\(0, \(now - last\) \/ 1000\)\)/);
});

test('F11: the Proving Ground "Scattered Isles" landscape scenario builds', () => {
  const f = createLabFixture({ lab: 'landscape', scenario: 'isles' });
  assert.equal(f.diagnostics.biome, 'isles');
});

test('F12: an upgrade sphere never lowers gear and is kept when it cannot help', () => {
  const s = fresh(); s.weaponLevel = 12; s.materials.weaponSphere = 1; const g = new Game(s, 0);
  assert.equal(g.useUpgradeSphere('weapon'), false); assert.equal(s.weaponLevel, 12); assert.equal(s.materials.weaponSphere, 1);
  s.weaponLevel = 5; assert.equal(g.useUpgradeSphere('weapon'), true); assert.equal(s.weaponLevel, 6); assert.equal(s.materials.weaponSphere, 0);
  s.equipment.armor.power = 14; s.materials.armorSphere = 1; assert.equal(g.useUpgradeSphere('armor'), false); assert.equal(s.equipment.armor.power, 14);
});

test('F13: the save keeps XP past level 80 (the curve passes 1e12 there)', () => {
  const s = fresh(); s.level = 90; s.xp = 3e13; s.nextXp = 5e13; const m = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(m.xp, 3e13); assert.equal(m.nextXp, 5e13);
});

test('F14: an exhausted swimmer loses whole points of health', () => {
  const s = fresh(); grantTidemantle(s, 'test'); const g = new Game(s, 0), w = 32;
  for (let y = 20; y <= 27; y++) for (let x = 4; x <= 11; x++) Object.assign(g.map.tiles[y * w + x], { kind: 'lakeWater', blocked: false, structure: undefined, buildingId: undefined, elev: 0 });
  Object.assign(g.player, { x: 7, y: 23, stamina: 0, hp: 60 }); let t = 1000;
  for (let i = 0; i < 50; i++) { g.update(1 / 60, idle, t); t += 16.7; g.player.stamina = 0; }
  assert.ok(g.swimming, 'swimming'); assert.ok(g.player.hp < 60, `hurt (${g.player.hp})`); assert.ok(Number.isInteger(g.player.hp), `whole health (${g.player.hp})`);
});

test('S7: unknown fields survive migrate and a save and reload in every nested system, the player runtime and the atlas', () => {
  const s = JSON.parse(JSON.stringify(fresh())), Z = { added: 'r999' }, beast = WORLD_BEAST_IDS[0];
  const spots = {
    'farQuests entry': (q) => q.farQuests.crystal?.note,
    questingBeast: (q) => q.questingBeast.zzFuture, 'worldBeasts entry': (q) => q.worldBeasts[beast].zzFuture,
    glyphs: (q) => q.glyphs.zzFuture, glyphCodex: (q) => q.glyphCodex.zzFuture, glyphLayouts: (q) => q.glyphLayouts.zzFuture,
    echoes: (q) => q.echoes.zzFuture, constellation: (q) => q.constellation.zzFuture, farArray: (q) => q.farArray.zzFuture,
    hometowns: (q) => q.hometowns.zzFuture, lattice: (q) => q.lattice.zzFuture, wanderer: (q) => q.wanderer.zzFuture,
    reciters: (q) => q.reciters.zzFuture, codex: (q) => q.codex.zzFuture, 'ascendancy entry': (q) => q.ascendancy['5,5']?.zzFuture,
    'linkedDungeons entry': (q) => q.linkedDungeons['dungeon:future:g1']?.zzFuture, 'dragonLava entry': (q) => q.dragonLava['3,3']?.zzFuture,
  };
  s.farQuests = { crystal: { status: 'open', rx: 90, ry: 90, note: Z } };
  for (const k of ['questingBeast', 'glyphs', 'glyphCodex', 'glyphLayouts', 'echoes', 'constellation', 'farArray', 'hometowns', 'lattice', 'wanderer', 'reciters', 'codex']) { s[k] = s[k] && typeof s[k] === 'object' ? s[k] : {}; s[k].zzFuture = Z; }
  s.worldBeasts = { ...s.worldBeasts, [beast]: { ...(s.worldBeasts?.[beast] || {}), zzFuture: Z } };
  s.ascendancy = { '5,5': { tries: 1, done: false, risen: false, bloom: false, zzFuture: Z } };
  s.linkedDungeons = { 'dungeon:future:g1': { a: { rx: 1, ry: 1, x: 16, y: 16 }, b: { rx: 4, ry: 4 }, zzFuture: Z } };
  s.dragonLava = { '3,3': { casts: 1, nextAt: null, tiles: [], zzFuture: Z } };
  const m = migrateSave(JSON.parse(JSON.stringify(s)));
  for (const [name, get] of Object.entries(spots)) assert.deepEqual(get(m), Z, `${name}: kept on migrate`);
  const g = new Game(m, 0), once = roundTrip(g, 0);
  for (const [name, get] of Object.entries(spots)) assert.deepEqual(get(once), Z, `${name}: kept after a save and reload`);
  once.session.playerRuntime.zzFuture = Z; once.atlas['0,0'].zzFuture = Z;
  const twice = roundTrip(new Game(once, 0), 0);
  assert.deepEqual(twice.session.playerRuntime.zzFuture, Z, 'playerRuntime: kept on the next save');
  assert.deepEqual(twice.atlas['0,0'].zzFuture, Z, "the current section's atlas entry: kept on the next visit and save");
  assert.equal(new Game(twice, 0).save.farQuests.crystal.status, 'open');
});

test('S8: the skiff keeps its way, the mire its soak, and the swim and raft state across a reload', () => {
  const g = new Game(fresh(), 0), p = g.player; p.sailVx = 1.5; p.sailVy = -.5; g.poisonSoak = 1.2; g.raftZ = .75; g.swimming = true; g.swimKind = 'lakeWater';
  const h = new Game(roundTrip(g, 1000), 2000);
  assert.deepEqual([h.player.sailVx, h.player.sailVy, h.poisonSoak, h.raftZ, h.swimming, h.swimKind], [1.5, -.5, 1.2, .75, true, 'lakeWater']);
});

test('S9: an unknown area, a position far outside the section, a list of explored sections and bad history counts are normalised', () => {
  const s = JSON.parse(JSON.stringify(fresh()));
  s.session.area = 'moon'; s.session.x = 500; s.session.y = -500; s.explored = ['0,0', '1,0', 7, 'junk'];
  s.consequences = { ...(s.consequences || {}), dungeons: { 'dungeon:X:g1': { discovered: true, visits: 'x', abandoned: -4, zz: 1 } } };
  const m = migrateSave(s);
  assert.equal(m.session.area, 'overworld');
  assert.deepEqual(m.explored, { '0,0': true, '1,0': true });
  const h = m.consequences.dungeons['dungeon:X:g1']; assert.equal(h.visits, 0); assert.equal(h.abandoned, 0); assert.equal(h.zz, 1);
  const g = new Game(m, 0); assert.equal(g.area, 'overworld');
  assert.ok(g.player.x >= -.24 && g.player.x <= 31.24 && g.player.y >= -.5 && g.player.y <= 31.12, `${g.player.x},${g.player.y}`);
  g.update(1 / 30, idle, 1000); assert.deepEqual([g.rx, g.ry], [0, 0], 'still in its own section');
  const ok = migrateSave(JSON.parse(JSON.stringify(fresh()))); assert.equal(ok.session.area, 'overworld'); assert.deepEqual(ok.explored, { '0,0': true });
});
