// Release 533 (Tim, 2026-10-28): the Rift Bombard is physical; a Needle Caster at +6 becomes a Blunderbuss (three shots at
// once); Lattice tool forms: Arc Wave (the Blunderbuss's cone becomes one wave) and Nanoknives (the Great Sweep's daggers).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { rangedWeapon, normalizeItemUpgrade, BLUNDERBUSS_RANK } from '../src/items.ts';
import { TOOL_FORM_KEYS, FIELD_KEYS, fieldForm } from '../src/lattice-fields.ts';
import { toggleLatticePassive } from '../src/constellation.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { MIRAGE, ARC_WAVE, GOLEM, CLUSTER } from '../src/tool-forms.ts';

function arena(tool, passives = [], stats = {}) {
  const s = freshSave(); s.seed = 'TOOLS'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; s.stats = { ...s.stats, ...stats }; ensureLattice(s); s.lattice.passives = passives.map((id) => `field:${id}`);
  s.equipment.secondary = normalizeItemUpgrade({ id: 't', slot: 'secondary', property: 'quick', tier: 'relic', affixes: [], power: 5, ...tool });
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 100 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 14, 10), { id: 'foe', hp: 50000, maxHp: 50000, damage: 0, cooldown: 99 })];
  return { s, g };
}

test('the Rift Bombard is physical and grows with Might', () => {
  assert.equal(rangedWeapon({ name: 'Rift Bombard' }).damageType, 'physical');
  const dmg = (Might) => { const { g } = arena({ name: 'Rift Bombard', property: 'blast' }, [], { Might }); g.fireSecondary(1000, { x: 1, y: 0 }); return g.projectiles.find((p) => String(p.id).startsWith('shot-')).damage; };
  assert.ok(dmg(30) > dmg(1) + 40);
});

test('a Needle Caster at +6 becomes a Blunderbuss: three pellets in a cone; it survives a save round trip', () => {
  assert.equal(BLUNDERBUSS_RANK, 6);
  assert.equal(normalizeItemUpgrade({ name: 'Needle Caster', power: 10, basePower: 5, upgradeRank: 5 }).name, 'Needle Caster');
  const item = normalizeItemUpgrade({ id: 'secondary-needle-caster', name: 'Needle Caster', power: 11, basePower: 5, upgradeRank: 6 });
  assert.equal(item.name, 'Blunderbuss'); assert.equal(rangedWeapon(item).pellets, 3);
  const s = freshSave(); s.equipment.secondary = { ...item, slot: 'secondary', name: 'Needle Caster' };
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).equipment.secondary.name, 'Blunderbuss');
  const { g } = arena({ name: 'Needle Caster', basePower: 5, power: 11, upgradeRank: 6 });
  g.fireSecondary(1000, { x: 1, y: 0 });
  const shots = g.projectiles.filter((p) => String(p.id).startsWith('shot-'));
  assert.equal(shots.length, 3); assert.ok(shots.every((p) => p.damageType === 'physical'));
  assert.ok(new Set(shots.map((p) => p.dy.toFixed(3))).size === 3, 'three directions');
});

test('Arc Wave turns each shot of the cone into a piercing wave', () => {
  assert.equal(TOOL_FORM_KEYS.length, 4); // release 535: the Corridor Golem; 537: Cluster Shell assert.equal(FIELD_KEYS.length, 5);
  for (const k of TOOL_FORM_KEYS) assert.ok(fieldForm(k));
  const { s, g } = arena({ name: 'Blunderbuss', basePower: 5, power: 11, upgradeRank: 6 }, ['arc-wave']);
  assert.equal(toggleLatticePassive(s, 'field:arc-wave').ok, true); assert.equal(toggleLatticePassive(s, 'field:arc-wave').ok, true); // clear and set again
  g.fireSecondary(1000, { x: 1, y: 0 });
  const shots = g.projectiles.filter((p) => String(p.id).startsWith('shot-'));
  // Release 549 (Tim: "three larger crescents... follow the same path of the blunderbuss's original shots"; was one wave).
  assert.equal(shots.length, 3); assert.ok(shots.every((q) => q.arcWave && q.grow >= ARC_WAVE.grow && q.pierce >= ARC_WAVE.pierce));
  assert.equal(new Set(shots.map((q) => q.dy.toFixed(3))).size, 3, 'along the cone');
});

// Release 649: the Nanoknives passive became Mirage of Blades (tests/mirage-blades-649.test.ts covers its flight).
test('Mirage of Blades: a Great Sweep press throws one spinning blade instead of sweeping, physical and on the tool', () => {
  const { g } = arena({ name: 'Great Sweep', property: 'impact' }, ['nanoknives']);
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true);
  const blades = g.projectiles.filter((p) => p.mirage); assert.equal(blades.length, 1); assert.equal(g.effects.filter((e) => e.brawler).length, 0, 'no sweep');
  assert.ok(blades.every((p) => p.damageType === 'physical' && p.glyphHost === 'tool'));
  assert.equal(g.fireSecondary(1100, { x: 1, y: 0 }), false, 'the press cooldown');
});

test('without Mirage of Blades the Great Sweep still sweeps', () => {
  const { g } = arena({ name: 'Great Sweep', property: 'impact' });
  g.fireSecondary(1000, { x: 1, y: 0 }); assert.ok(g.effects.some((e) => e.brawler)); assert.equal(g.projectiles.filter((p) => p.mirage).length, 0);
});

// Release 535 (Tim: "go with the quick golem").
test('Corridor Golem: a Hammerfall blow raises one golem that punches up to three times, retargets, then sinks', () => {
  const { g } = arena({ name: 'Hammerfall', property: 'impact' }, ['corridor-golem']);
  g.enemies.push(Object.assign(createCombatant('rootBrute', 12, 12), { id: 'foe2', hp: 1, maxHp: 1, damage: 0, cooldown: 99 }));
  assert.equal(g.fireSecondary(1000, { x: 1, y: 0 }), true); assert.ok(g.golem, 'it rises');
  assert.equal(g.fireSecondary(1000 + 1300, { x: 1, y: 0 }), true); assert.equal(g.golemReadyAt, 1000 + 320 + GOLEM.cooldown * 1000, 'one at a time');
  let t = 1000; const punches = () => g.effects.filter((e) => e.kind === 'golem-punch');
  for (let i = 0; i < 40 && g.golem && !g.golem.sinkAt; i++) { t += 100; g.tickGolem(t); for (const e of punches()) if (!e.done) { e.done = true; const f = g.enemies.find((q) => Math.hypot(q.x + .5 - e.x, q.y + .45 - e.y) < .1); if (f) { f.hp -= e.damage; if (f.hp <= 0) f.dead = true; } } }
  assert.equal(punches().length, GOLEM.punches); assert.ok(punches().every((e) => e.glyphHost === 'tool' && e.damage > 0));
  assert.ok(g.golem.sinkAt, 'blows spent: it sinks'); g.tickGolem(t + GOLEM.sink * 1000 + 1); assert.equal(g.golem, null);
});

test('without the Corridor Golem the hammer raises nothing', () => {
  const { g } = arena({ name: 'Hammerfall', property: 'impact' }); g.fireSecondary(1000, { x: 1, y: 0 }); assert.equal(g.golem || null, null);
});

// Release 537 (Tim: "two smaller explosions fly off... a very short distance... and then they explode").
test('Cluster Shell: a bursting Bombard shell throws two bomblets that burst in turn, and they do not split again', () => {
  const run = (passives) => { const { g } = arena({ name: 'Rift Bombard', property: 'blast' }, passives); g.enemies = []; g.fireSecondary(1000, { x: 1, y: 0 });
    const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
    const seen = new Set(); for (let i = 0; i < 60; i++) { g.update(.05, idle, 1000 + i * 50); for (const p of g.projectiles) seen.add(p.id); for (const e of g.effects) seen.add(e.id); } return [...seen]; };
  const plain = run([]), cluster = run(['cluster-shell']);
  assert.equal(plain.filter((id) => id.includes('-cluster')).length, 0);
  const bomblets = cluster.filter((id) => /^shot-.*-cluster\d$/.test(id)), blasts = cluster.filter((id) => id.startsWith('blast-'));
  assert.equal(bomblets.length, CLUSTER.count); assert.equal(blasts.length, 1 + CLUSTER.count, 'the shell and each bomblet burst once');
});

test('the tool forms draw without ctx.roundRect (older Safari and Chrome)', async () => {
  const { drawToolForms } = await import('../src/tool-forms.ts');
  const calls = []; const ctx = new Proxy({}, { get: (t, k) => k === 'roundRect' ? undefined : (k in t ? t[k] : (...a) => calls.push(k)), set: (t, k, v) => { t[k] = v; return true; } });
  const game = { lastUpdateNow: 5000, player: { x: 0, y: 0 }, effects: [], projectiles: [], knives: null, golem: { x: 1, y: 1, start: 4000, face: 1, sinkAt: null } };
  drawToolForms(ctx, game, (q) => [q.x * 40, q.y * 40], 40, 0);
  assert.equal(calls.filter((k) => k === 'save').length, calls.filter((k) => k === 'restore').length); assert.ok(calls.includes('arcTo'));
});

// Release 539 (Tim: "the golem cooldown should be... your tool cooldown... should be able to be reduced").
test('the golem cooldown shortens with the tool cooldown (Swift glyphs in the hammer)', () => {
  const plain = arena({ name: 'Hammerfall', property: 'impact' }, ['corridor-golem']).g; plain.fireSecondary(1000, { x: 1, y: 0 });
  const fast = arena({ name: 'Hammerfall', property: 'impact', glyphs: ['swift', 'swift', null] }, ['corridor-golem']).g; fast.fireSecondary(1000, { x: 1, y: 0 });
  assert.ok(fast.toolCooldownScale() < 1); assert.ok(fast.golemReadyAt < plain.golemReadyAt, `${fast.golemReadyAt} < ${plain.golemReadyAt}`);
  assert.equal(plain.golemReadyAt, 1000 + 320 + GOLEM.cooldown * 1000);
});

test('Cluster Shell bomblets fly to opposite ends of a line that turns from shell to shell, each its own blast radius out', async () => {
  const { g } = arena({ name: 'Rift Bombard', property: 'blast' }, ['cluster-shell']);
  const angles = [];
  for (const id of ['shot-a', 'shot-b', 'shot-c', 'shot-d']) {
    const shot = { id, x: 10, y: 10, dx: 1, dy: 0, blastRadius: 2.15, damage: 40, damageType: 'physical', glyphHost: 'tool', path: 'grenade' };
    g.projectiles = []; g.clusterShell(shot);
    const [p, q] = g.projectiles; assert.equal(g.projectiles.length, 2);
    assert.ok(Math.abs(p.dx + q.dx) < 1e-9 && Math.abs(p.dy + q.dy) < 1e-9, 'opposite ends');
    for (const b of [p, q]) assert.ok(Math.abs(b.speed * b.life - b.blastRadius) < 1e-9, 'edge meets the centre');
    angles.push(Math.atan2(p.dy, p.dx).toFixed(2));
  }
  assert.ok(new Set(angles).size >= 3, `the line turns: ${angles}`);
});
