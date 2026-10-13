import test from 'node:test';
import assert from 'node:assert/strict';
import { MONSTER_PACK, PACK_KINDS, ATTACK_MODULES, MOVEMENT_MODES, BRAINS, GUARDIAN_POOL, composeMonster, validateMonster, packVariant, guardianKindFor, availableAttacks, updatePackMonster, tickPackEffects, addPackEffect, resetPackRuntime, freshPackState } from '../src/monster-pack.ts';
import { createCombatant, CREATURE_FORMS } from '../src/combat.ts';
import { populateDungeonEncounters, generateUnifiedDungeon } from '../src/arenas.ts';
import { pinDungeonLayout } from '../src/game.ts';
import { freshSave } from '../src/types.ts';
import { drawPackMonster, drawPackTelegraphs, drawPackEffects, drawPackPortrait } from '../src/monster-render.ts';
import { createLabFixture } from '../src/proving-ground-labs.ts';

// A flat test floor with optional walls, and a world adapter shaped like the game's packWorld.
function world({ size = 20, walls = [], player = { x: 10, y: 10 } } = {}) {
  const blocked = new Set(walls.map(([x, y]) => `${x},${y}`)), open = (x, y) => { const tx = Math.floor(x + .5), ty = Math.floor(y + .5); return tx >= 0 && ty >= 0 && tx < size && ty < size && !blocked.has(`${tx},${ty}`); };
  const w = {
    player: { ...player, hp: 100 }, width: size, height: size, dt: 1 / 30, now: 0, enemies: [], effects: [], hurts: [], slowed: 0, jumping: false, playerVelocity: { x: 0, y: 0 },
    open, tileOpen: (x, y) => open(x - .5, y - .5),
    los(a, b) { const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4) || 1; for (let i = 1; i < steps; i++) if (!open(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false; return true; },
    move(e, dx, dy, opts = {}) { if (opts.phase) { e.x += dx; e.y += dy; return true; } if (!open(e.x + dx, e.y + dy)) return false; e.x += dx; e.y += dy; return true; },
    hurt(source, amount, opts = {}) { if (source?.illusion) return false; if (opts.jumpable && w.jumping) return false; w.hurts.push({ amount, source: opts.source }); w.player.hp -= amount; return true; },
    slow(factor) { w.slowed = factor; },
    addEffect(effect) { addPackEffect(w.effects, effect, w.now); },
    spawnIllusion(owner, x, y, i) { const c = createCombatant(owner.kind, x, y); Object.assign(c, { id: `${owner.id}:illusion:${i}`, illusion: true, noRewards: true, summonedBy: owner.id, bornAt: w.now, hp: 1, maxHp: 1, aggro: true, packAttacks: owner.packAttacks.filter((a) => !a.startsWith('mirror')) }); w.enemies.push(c); return c; },
  };
  return w;
}
function step(w, e, seconds) { for (let t = 0; t < seconds; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); w.effects = tickPackEffects(w.effects, w); } }
function forceAttack(e, w, id) { e.aggro = true; e.packAttacks = [id]; e.pack = freshPackState(); e.pack.gap = 0; }

test('the pack defines ten valid, distinct creatures from shared tables', () => {
  assert.equal(PACK_KINDS.length, 10);
  for (const id of PACK_KINDS) assert.deepEqual(validateMonster(MONSTER_PACK[id]), [], id);
  assert.equal(new Set(PACK_KINDS.map((id) => MONSTER_PACK[id].render)).size, 10);
  assert.ok(new Set(PACK_KINDS.map((id) => MONSTER_PACK[id].movement)).size >= 6, 'varied movement');
  assert.ok(new Set(PACK_KINDS.map((id) => MONSTER_PACK[id].brain)).size >= 6, 'varied brains');
  assert.ok(new Set(PACK_KINDS.map((id) => MONSTER_PACK[id].sizeClass)).size >= 4, 'varied sizes');
  for (const required of ['sweepBeam', 'stillnessCurse', 'burrowAmbush', 'blinkStrike', 'phaseCharge', 'diveBomb']) assert.ok(PACK_KINDS.some((id) => MONSTER_PACK[id].attacks.includes(required)), required);
  for (const id of PACK_KINDS) assert.ok(CREATURE_FORMS[id], `${id} is a registered creature form`);
});

test('composition builds new creatures and rejects impossible ones', () => {
  const ember = composeMonster('riftLynx', { id: 'emberLynx', name: 'Ember Lynx', attacks: { add: ['firefall'] }, palette: ['#a33', '#200', '#fa3', '#fec'] });
  assert.ok(ember.attacks.includes('blinkStrike') && ember.attacks.includes('firefall'));
  assert.equal(MONSTER_PACK.riftLynx.attacks.includes('firefall'), false, 'base table is not mutated');
  assert.throws(() => composeMonster('thunderhorn', { attacks: { add: ['diveBomb'] } }), /requires flying/);
  assert.throws(() => composeMonster('thunderhorn', { attacks: ['stillnessCurse'] }), /active attack/);
  assert.throws(() => composeMonster('thunderhorn', { brain: 'telepath' }), /unknown brain/);
});

test('hybrid variants are deterministic and only borrow attacks the body can perform', () => {
  let hybrids = 0;
  for (let i = 0; i < 400; i++) {
    const kind = PACK_KINDS[i % 10], a = packVariant(kind, `id-${i}`), b = packVariant(kind, `id-${i}`);
    assert.deepEqual(a, b);
    if (!a.hybridAttack) continue;
    hybrids++;
    const attack = ATTACK_MODULES[a.hybridAttack];
    assert.ok(!attack.requires || MOVEMENT_MODES[MONSTER_PACK[kind].movement][attack.requires], `${kind} cannot use ${a.hybridAttack}`);
    assert.ok(!MONSTER_PACK[kind].attacks.includes(a.hybridAttack));
  }
  assert.ok(hybrids > 40 && hybrids < 140, `about a fifth are hybrids (${hybrids})`);
});

test('boss forms are larger, tougher and unlock attacks as health falls', () => {
  const normal = createCombatant('cinderSeraph', 4, 4), boss = createCombatant('cinderSeraph', 4, 4, true);
  assert.ok(boss.maxHp > normal.maxHp * 3 && boss.scale > normal.scale && boss.damage > normal.damage);
  assert.deepEqual(availableAttacks(boss).filter((id) => MONSTER_PACK.cinderSeraph.bossAttacks.includes(id)), []);
  boss.hp = boss.maxHp * .6; assert.ok(availableAttacks(boss).includes('sweepBeam'));
  boss.hp = boss.maxHp * .3; assert.ok(availableAttacks(boss).includes('shockwave'));
  assert.equal(normal.packBossAttacks.length, 0);
});

test('guardians vary across dungeons and are stable per dungeon', () => {
  const kinds = new Set(Array.from({ length: 80 }, (_, i) => guardianKindFor('SEED', `dungeon:${i}`)));
  assert.ok(kinds.size >= 8, `guardian variety (${kinds.size})`);
  assert.equal(guardianKindFor('SEED', 'dungeon:7'), guardianKindFor('SEED', 'dungeon:7'));
  for (const k of kinds) assert.ok(GUARDIAN_POOL.includes(k));
});

test('pack population is denser, includes pack residents, and leaves legacy population unchanged', () => {
  const make = () => { const m = generateUnifiedDungeon('DENSE', 'dungeon:DENSE:3:4', 'kiln'); m.enemySpawns = m.enemySpawns.filter((e) => !e.encounterSpawn); m.encounterVersion = 0; return m; };
  const legacyA = populateDungeonEncounters(make()), legacyB = populateDungeonEncounters(make(), { monsterPack: false });
  assert.deepEqual(legacyA.enemySpawns.map((e) => e.kind), legacyB.enemySpawns.map((e) => e.kind));
  const packed = populateDungeonEncounters(make(), { monsterPack: true });
  assert.ok(packed.enemySpawns.length >= legacyA.enemySpawns.length + 1, 'denser');
  assert.ok(packed.enemySpawns.some((e) => MONSTER_PACK[e.kind]), 'pack residents');
  assert.ok(packed.activeEnemyCap > legacyA.activeEnemyCap);
  assert.deepEqual(populateDungeonEncounters(make(), { monsterPack: true }).enemySpawns.map((e) => e.kind), packed.enemySpawns.map((e) => e.kind), 'deterministic');
});

test('only never-entered dungeon histories adopt the pack', () => {
  const save = freshSave('PIN'), fresh = pinDungeonLayout(save, 'dungeon:PIN:1:1');
  assert.ok(fresh.monsterPack >= 1);
  const visitedSave = freshSave('PIN'); visitedSave.session.areas['dungeon:PIN:2:2'] = { enemies: [] };
  assert.equal(pinDungeonLayout(visitedSave, 'dungeon:PIN:2:2').monsterPack, 0);
  fresh.visits = 5; assert.ok(pinDungeonLayout(save, 'dungeon:PIN:1:1').monsterPack >= 1, 'pin is permanent');
});

test('sweeping beams burn along their line and stop at walls', () => {
  const w = world({ player: { x: 13, y: 10 } }), e = createCombatant('lumenWraith', 8, 10); forceAttack(e, w, 'sweepBeam');
  step(w, e, 3); assert.ok(w.hurts.some((h) => h.source === 'sweepBeam'), 'beam hits in the open');
  const shielded = world({ player: { x: 13, y: 10 }, walls: [[10, 8], [10, 9], [10, 10], [10, 11], [10, 12]] }), e2 = createCombatant('lumenWraith', 8, 10); forceAttack(e2, shielded, 'sweepBeam');
  e2.packAttacks = ['sweepBeam']; step(shielded, e2, 3); assert.equal(shielded.hurts.filter((h) => h.source === 'sweepBeam').length, 0, 'walls block the beam');
});

test('the Grave Lantern punishes standing still but not moving', () => {
  const still = world({ player: { x: 10, y: 10 } }), lantern = createCombatant('graveLantern', 6, 10); lantern.aggro = true; lantern.packAttacks = ['stillnessCurse']; lantern.pack.gap = 99;
  step(still, lantern, 3); assert.ok(still.hurts.some((h) => h.source === 'condemn'), 'a still player is condemned');
  const moving = world({ player: { x: 10, y: 10 } }), lantern2 = createCombatant('graveLantern', 6, 10); lantern2.aggro = true; lantern2.packAttacks = ['stillnessCurse']; lantern2.pack.gap = 99;
  for (let t = 0; t < 3; t += moving.dt) { moving.player.x = 10 + Math.sin(t * 2.4) * 2; moving.now += moving.dt * 1000; updatePackMonster(lantern2, moving); moving.effects = tickPackEffects(moving.effects, moving); }
  assert.equal(moving.hurts.filter((h) => h.source === 'condemn').length, 0, 'moving avoids the curse');
});

test('burrowers cannot be hit while tunnelling and erupt under the player', () => {
  const w = world({ player: { x: 12, y: 10 } }), e = createCombatant('sunderjaw', 6, 10); forceAttack(e, w, 'burrowAmbush');
  let sawHidden = false; for (let t = 0; t < 4; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); if (e.untargetable && e.hidden) sawHidden = true; }
  assert.ok(sawHidden, 'untargetable underground'); assert.ok(w.hurts.some((h) => h.source === 'burrowAmbush')); assert.equal(e.untargetable, false, 'surfaces afterwards');
  const jumping = world({ player: { x: 12, y: 10 } }), e2 = createCombatant('sunderjaw', 6, 10); forceAttack(e2, jumping, 'burrowAmbush'); jumping.jumping = true; step(jumping, e2, 4);
  assert.equal(jumping.hurts.filter((h) => h.source === 'burrowAmbush').length, 0, 'eruptions can be jumped');
});

test('phase charges pass through walls and always surface on open floor', () => {
  const walls = []; for (let y = 4; y < 16; y++) walls.push([11, y]);
  const w = world({ player: { x: 14, y: 10 }, walls }), e = createCombatant('strataEel', 7, 10); forceAttack(e, w, 'phaseCharge');
  let crossed = false; for (let t = 0; t < 3; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); if (e.x > 11.5) crossed = true; }
  assert.ok(crossed, 'crossed the wall'); assert.ok(w.open(e.x, e.y), 'ended on open floor'); assert.equal(e.untargetable, false);
});

test('ram charges stun the ram when it hits a wall', () => {
  const walls = []; for (let y = 0; y < 20; y++) walls.push([13, y]);
  const w = world({ player: { x: 10.5, y: 10 }, walls }), e = createCombatant('thunderhorn', 5, 10); forceAttack(e, w, 'ramCharge');
  let stunned = false; for (let t = 0; t < 3; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); if (e.pack.phase === 'stunned') stunned = true; }
  assert.ok(stunned);
});

test('blink strikes land behind the player on open floor', () => {
  const w = world({ player: { x: 10, y: 10 } }), e = createCombatant('riftLynx', 4, 10); w.playerVelocity = { x: 1, y: 0 }; forceAttack(e, w, 'blinkStrike');
  step(w, e, .2); const dest = e.pack.data?.dest; assert.ok(dest && w.open(dest.x, dest.y)); assert.ok(dest.x < 10, 'behind a player moving right');
  step(w, e, 1.5); assert.ok(w.hurts.some((h) => h.source === 'blinkStrike'));
});

test('mirror clones are capped, harmless and break in one hit', () => {
  const w = world({ player: { x: 10, y: 10 } }), e = createCombatant('mirrorShade', 7, 10); w.enemies.push(e); forceAttack(e, w, 'mirrorClones');
  step(w, e, 1.5); e.pack.cd = {}; e.pack.gap = 0; step(w, e, 1.5);
  const clones = w.enemies.filter((q) => q.illusion && !q.dead); assert.equal(clones.length, 2);
  assert.ok(clones.every((c) => c.hp === 1 && c.noRewards));
  const before = w.hurts.length; for (const c of clones) step(w, c, 4); assert.equal(w.hurts.length, before, 'illusions deal no damage');
});

test('dive bombs rise out of reach, track, lock and crash', () => {
  const w = world({ player: { x: 10, y: 10 } }), e = createCombatant('cinderSeraph', 5, 10); forceAttack(e, w, 'diveBomb');
  let aloft = false; for (let t = 0; t < 4; t += w.dt) { w.now += w.dt * 1000; updatePackMonster(e, w); if (e.aloft && e.untargetable) aloft = true; }
  assert.ok(aloft); assert.ok(w.hurts.some((h) => h.source === 'diveBomb')); assert.equal(e.aloft, false);
});

test('webs slow and mortars land where the player is heading', () => {
  const w = world({ player: { x: 10, y: 10 } }), spinner = createCombatant('veilSpinner', 6, 10); forceAttack(spinner, w, 'webSpit'); step(w, spinner, 1.5);
  assert.ok(w.effects.some((f) => f.kind === 'web')); assert.equal(w.slowed, .5);
  const m = world({ player: { x: 10, y: 10 } }), beetle = createCombatant('siegeBeetle', 4, 10); m.playerVelocity = { x: 0, y: 2 }; forceAttack(beetle, m, 'mortarVolley'); step(m, beetle, .7);
  const shells = m.effects.filter((f) => f.kind === 'mortar'); assert.equal(shells.length, 3); assert.ok(shells.some((f) => f.y > 11.5), 'leads a moving target');
});

test('restored pack creatures never resume mid-attack', () => {
  const e = createCombatant('sunderjaw', 3, 3); Object.assign(e, { untargetable: true, hidden: true }); e.pack.attack = 'burrowAmbush'; e.pack.phase = 'travel'; e.pack.cd = { bite: 1 };
  resetPackRuntime(e); assert.equal(e.pack.attack, null); assert.equal(e.untargetable, false); assert.deepEqual(e.pack.cd, { bite: 1 });
});

test('every pack creature, telegraph and effect renders without a canvas error', () => {
  const calls = { n: 0 }, gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get(target, key) { if (key in target) return target[key]; if (['createRadialGradient', 'createLinearGradient'].includes(key)) return () => gradient; return () => { calls.n++; }; }, set(target, key, value) { target[key] = value; return true; } });
  for (const kind of PACK_KINDS) {
    const e = createCombatant(kind, 5, 5, kind === 'thunderhorn'); drawPackMonster(ctx, e, 32, 1000);
    Object.assign(e, { hidden: true, aloft: true, phasing: true, illusion: true, hitFlash: .1 }); drawPackMonster(ctx, e, 32, 2000);
    assert.equal(drawPackPortrait(ctx, kind, 128, 0), true);
  }
  const teles = [{ type: 'arc', aim: { x: 1, y: 0 }, radius: 1.5, arc: 90 }, { type: 'rect', aim: { x: 0, y: 1 }, length: 3, width: .5 }, { type: 'beam', angle: 1, length: 5, charging: true }, { type: 'beam', angle: 1, length: 5 }, { type: 'circle', x: 3, y: 3, radius: 1.2 }, { type: 'blink', x: 4, y: 4 }, { type: 'lane', aim: { x: 1, y: 0 }, length: 6, width: .6, phase: true }, { type: 'ring', radius: 3 }, { type: 'shadow', x: 2, y: 2, locked: true }, { type: 'spit', target: { x: 1, y: 1 } }, { type: 'brace' }];
  drawPackTelegraphs(ctx, teles.map((tele, i) => ({ id: `t${i}`, kind: PACK_KINDS[i % 10], x: 5, y: 5, pack: { tele, t: .3 } })), 32, 500);
  const kinds = ['rupture', 'sigil', 'condemn', 'mortar', 'web', 'ember', 'shock', 'dust', 'crash', 'blinkTrail'];
  drawPackEffects(ctx, kinds.flatMap((kind) => [{ kind, x: 3, y: 3, radius: 1, arming: .5, from: { x: 1, y: 1 } }, { kind, x: 3, y: 3, radius: 1, arming: 0, life: .3, ring: 1 }]), 32, 800);
  assert.ok(calls.n > 500);
});

test('the Proving Ground offers every pack creature and its boss form in the real game loop', () => {
  const input = { state: { x: 0, y: 0 }, consume: () => false, reset: () => {} };
  for (const scenario of [...PACK_KINDS, ...PACK_KINDS.map((k) => `pack-boss-${k}`)]) {
    const f = createLabFixture({ lab: 'combat', scenario, seed: 'PACK-LAB', variant: 1 }), g = f.game, e = g.enemies[0];
    assert.ok(e.packKind, scenario); assert.equal(e.boss, scenario.startsWith('pack-boss-'));
    for (const t of g.map.tiles) if (['canyon', 'river', 'dungeonWater'].includes(t.kind)) { t.kind = 'hollowFloor'; t.blocked = false; }
    const spot = g.map.tiles.find((t) => !t.blocked && Math.hypot(t.x - e.x, t.y - e.y) > 2.5 && Math.hypot(t.x - e.x, t.y - e.y) < 4);
    g.player.x = spot.x; g.player.y = spot.y;
    let attacked = false; for (let i = 0; i < 600; i++) { g.update(1 / 60, input, 1000 + i * 1000 / 60); if (g.enemies.some((q) => q.pack?.attack)) attacked = true; if (g.player.hp < 30) g.player.hp = g.save.maxHp; }
    assert.ok(attacked, `${scenario} attacks within ten seconds`);
  }
});

test('pack guardians clear their crossing, while the story dungeon and visited dungeons keep the Marshal', async () => {
  const { Game, isCrossingGuardian } = await import('../src/game.ts'), { dungeonId } = await import('../src/world.ts');
  const story = freshSave('GUARD'), sg = new Game(story, 0); story.session.activeDungeonId = dungeonId(story.seed, story.worldGeneration); sg.loadArea('dungeon');
  assert.ok(sg.enemies.some((e) => e.kind === 'hollowMarshal'), 'story Marshal kept'); assert.ok(!sg.enemies.some((e) => e.packKind), 'story dungeon untouched');
  let id = null; for (let i = 0; i < 40 && !id; i++) { const candidate = dungeonId('GUARD', 0, i, 3, 'other'); if (guardianKindFor('GUARD', candidate) !== 'hollowMarshal') id = candidate; }
  const save = freshSave('GUARD'), g = new Game(save, 0); save.session.activeDungeonId = id; g.loadArea('dungeon');
  const guardian = g.enemies.find((e) => isCrossingGuardian(e));
  assert.ok(guardian?.packGuardian && guardian.packKind && guardian.boss, `pack guardian in ${id}`);
  assert.ok(g.enemies.filter((e) => e.packKind && !e.boss).length > 0, 'pack residents');
  for (const e of g.enemies) if (e !== guardian) { e.dead = true; g.defeatEnemy(e); }
  guardian.dead = true; g.defeatEnemy(guardian);
  assert.equal(save.consequences.dungeons[id].resolved, true, 'crossing permanently cleared');
  const old = freshSave('GUARD'); old.session.areas[id] = { enemies: [] }; const og = new Game(old, 0); old.session.activeDungeonId = id; og.loadArea('dungeon');
  assert.ok(og.enemies.some((e) => e.kind === 'hollowMarshal'), 'a previously entered dungeon keeps its original guardian');
  assert.ok(!og.enemies.some((e) => e.packKind), 'and its original population');
});

test('overworld sections respawn with terrain-matched pack creatures, deterministically and more densely', async () => {
  const { generateRegion } = await import('../src/world.ts'), { populateOverworldPack, OVERWORLD_PACK_POOLS } = await import('../src/monster-pack.ts');
  let before = 0, after = 0, pack = 0;
  for (const [rx, ry] of [[1, 0], [2, 3], [-4, 1], [5, -5], [0, -6], [-6, 6]]) {
    const a = generateRegion('OWP', rx, ry), b = generateRegion('OWP', rx, ry);
    const ambient = a.enemySpawns.filter((e) => e.ambient).map((e) => `${e.kind}@${e.x},${e.y}`);
    before += a.enemySpawns.filter((e) => !e.ambient).length;
    populateOverworldPack(a, 'OWP', rx, ry); populateOverworldPack(b, 'OWP', rx, ry);
    assert.deepEqual(a.enemySpawns.map((e) => `${e.kind}@${e.x},${e.y}`), b.enemySpawns.map((e) => `${e.kind}@${e.x},${e.y}`), 'deterministic');
    assert.deepEqual(a.enemySpawns.filter((e) => e.ambient).map((e) => `${e.kind}@${e.x},${e.y}`), ambient, 'wildlife untouched');
    after += a.enemySpawns.filter((e) => !e.ambient).length;
    for (const e of a.enemySpawns.filter((q) => MONSTER_PACK[q.kind])) { pack++; assert.ok((OVERWORLD_PACK_POOLS[a.dominant] || PACK_KINDS).includes(e.kind)); assert.ok(!a.tiles[e.y * 32 + e.x]?.blocked); }
  }
  assert.ok(after > before, `denser (${before} -> ${after})`); assert.ok(pack >= 8, `pack creatures present (${pack})`);
  const home = generateRegion('OWP', 0, 0); populateOverworldPack(home, 'OWP', 0, 0);
  assert.ok(!home.enemySpawns.some((e) => MONSTER_PACK[e.kind]), 'the starting section stays gentle');
});

test('pack creatures stay out of settlement sanctuaries and cannot hurt the player inside one', async () => {
  const { Game, settlementSanctuary } = await import('../src/game.ts');
  const save = freshSave('OVER'), g = new Game(save, 0); g.rx = 4; g.ry = -2; g.loadArea('overworld');
  const zone = settlementSanctuary(g.map, 4, -2, save);
  assert.ok(zone, 'fixture section has a settlement');
  assert.ok(g.enemies.some((e) => e.packKind), 'pack creatures outside it');
  assert.ok(!g.enemies.some((e) => e.packKind && Math.hypot(e.x - zone.x, e.y - zone.y) < zone.radius), 'none spawn inside');
  const e = g.enemies.find((q) => q.packKind); Object.assign(g.player, { x: zone.x, y: zone.y }); e.x = zone.x + 1; e.y = zone.y; e.aggro = true;
  const hp = g.player.hp, input = { state: { x: 0, y: 0 }, consume: () => false, reset: () => {} };
  for (let i = 0; i < 300; i++) g.update(1 / 60, input, 1000 + i * 16.7);
  assert.ok(Math.hypot(e.x - zone.x, e.y - zone.y) >= zone.radius, 'pushed out of the sanctuary');
  assert.equal(g.player.hp, hp, 'no damage inside the sanctuary');
});
