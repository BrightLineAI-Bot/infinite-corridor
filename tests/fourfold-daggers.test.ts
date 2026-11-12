// The Fourfold Daggers (Tim, 2026-11-12; items.ts FOURFOLD_DAGGERS, game.ts daggerCutHits): two quick cuts a press, each a
// narrow cone angled across the facing so the two cross like an X; front-close takes both, angled one, straight-far none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats, daggerCutHits, grantMilestoneGear } from '../src/game.ts';
import { createCombatant, wayfarerDamage } from '../src/combat.ts';
import { FOURFOLD_DAGGERS, PRIMARY_PROFILES, primaryProfile, isFourfoldDaggers, generateItem, isValidItem, weaponScaling, itemMechanicalStats } from '../src/items.ts';

const D = FOURFOLD_DAGGERS, PROFILE = PRIMARY_PROFILES[D.key];
const daggers = (power = 10) => ({ id: 'primary-fd-test', name: D.name, slot: 'primary', power, basePower: power, upgradeRank: 0, property: D.property, tier: 'rare', affixes: [] });
function arena(foes, { stats = {}, level = 15, primary = daggers(15) } = {}) {
  const s = freshSave(); s.seed = 'DAGGERS'; s.level = level; s.stats = { ...s.stats, ...stats }; s.equipment.primary = primary;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right' }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => Object.assign(createCombatant('rootBrute', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6 }, extra || {}));
  return { s, g };
}
const step = (g, from, to) => { for (let t = from; t < to; t += 20) g.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, t); };
const taken = (e) => 1e6 - e.hp;
// Offsets from the Wayfarer, facing right (+x): ahead and to the side (y).
const FRONT_CLOSE = [.8, 0], ANGLED = [1.3, -.35], ANGLED_OTHER = [1.3, .35], STRAIGHT_FAR = [1.45, 0];

test('the daggers are one data table, named in one place', () => {
  assert.equal(D.name, 'Fourfold Daggers'); assert.equal(D.key, 'primary-fourfold-daggers');
  assert.equal(D.cuts, 2); assert.ok(D.gapMs >= 60 && D.gapMs <= 100, 'two cuts 0.06-0.1 s apart');
  assert.ok(D.angle >= 20 && D.angle <= 30, 'each cut angled 20-30 degrees off the facing'); assert.ok(D.half <= 12, 'narrow cones');
  assert.equal(primaryProfile(daggers()), PROFILE); assert.equal(primaryProfile({ name: D.name, slot: 'primary' }), PROFILE, 'by name, as loot ids are random');
  assert.equal(PROFILE.shape, 'daggers'); assert.ok(isFourfoldDaggers(daggers()));
  assert.equal(itemMechanicalStats(daggers()).damage, PROFILE.damage);
});

test('cone geometry: front-close is in both cuts, angled in one, straight ahead and further out in neither', () => {
  const player = { x: 10, y: 10, facing: 'right' }, map = { tiles: Array.from({ length: 1024 }, () => ({ kind: 'ash', blocked: false })) };
  const at = ([fx, fy]) => ({ id: `${fx},${fy}`, x: 10 + fx, y: 10 + fy, bodyRadius: .38 });
  const count = (q) => [0, 1].filter((cut) => daggerCutHits(player, [at(q)], map, 32, PROFILE, { x: 1, y: 0 }, cut).length).length;
  assert.equal(count(FRONT_CLOSE), 2, 'front, close');
  assert.equal(count([.5, 0]), 2, 'right up against the Wayfarer');
  assert.equal(count(ANGLED), 1, 'off at an angle'); assert.equal(count(ANGLED_OTHER), 1, 'off at the other angle');
  assert.equal(count(STRAIGHT_FAR), 0, 'straight ahead, further out: the gap between the cuts');
  assert.equal(count([-.8, 0]), 0, 'behind'); assert.equal(count([3, 0]), 0, 'out of reach');
  // The two cones are mirror images: each angled foe is in a different cut.
  const which = (q) => [0, 1].find((cut) => daggerCutHits(player, [at(q)], map, 32, PROFILE, { x: 1, y: 0 }, cut).length);
  assert.notEqual(which(ANGLED), which(ANGLED_OTHER));
  // Facing another way turns the X with it.
  const down = { x: 10, y: 10, facing: 'down' }, n = (q) => [0, 1].filter((cut) => daggerCutHits(down, [at(q)], map, 32, PROFILE, { x: 0, y: 1 }, cut).length).length;
  assert.equal(n([0, .8]), 2); assert.equal(n([.35, 1.3]), 1); assert.equal(n([0, 1.45]), 0);
});

test('one press: two cuts, the second about 80 ms after the first; damage per cut and in total', () => {
  const { g } = arena([FRONT_CLOSE]), e = g.enemies[0];
  g.primaryAttack(1000, { x: 1, y: 0 });
  const first = taken(e), bonus = g.weaponBonus(), cut = wayfarerDamage((PROFILE.damage + bonus) * D.share);
  assert.equal(first, cut, 'the first cut lands at once');
  step(g, 1020, 1000 + D.gapMs - 20); assert.equal(taken(e), first, 'nothing more before the gap');
  step(g, 1000 + D.gapMs - 20, 1000 + D.gapMs + 40); assert.equal(taken(e), 2 * cut, 'the second cut lands after the gap');
  step(g, 1100, 1400); assert.equal(taken(e), 2 * cut, 'and only two');
  const normal = wayfarerDamage(PROFILE.damage + bonus);
  assert.ok(cut < normal, 'each cut is lighter than a normal hit');
  assert.ok(2 * cut >= normal * .95 && 2 * cut <= normal * 1.2, `two cuts (${2 * cut}) come to about a normal hit (${normal})`);
});

test('an angled foe takes one cut and a foe in the gap none; a crowd is poorly served', () => {
  const { g } = arena([FRONT_CLOSE, ANGLED, STRAIGHT_FAR, [1.2, .9]]), [front, angled, far, wide] = g.enemies;
  g.primaryAttack(1000, { x: 1, y: 0 }); step(g, 1000, 1300);
  const cut = wayfarerDamage((PROFILE.damage + g.weaponBonus()) * D.share);
  assert.equal(taken(front), 2 * cut); assert.equal(taken(angled), cut); assert.equal(taken(far), 0); assert.equal(taken(wide), 0);
});

test('each cut staggers slightly, less than a swing, and the stagger governor still rules', () => {
  const { g } = arena([FRONT_CLOSE]), e = g.enemies[0];
  g.primaryAttack(1000, { x: 1, y: 0 }); assert.equal(e.hitStun, D.stun.ordinary); assert.equal(e.recoil, D.recoil);
  assert.ok(D.stun.ordinary < .22 && D.stun.boss < .12 && D.recoil < .2, 'lighter than a normal swing (.22 / .12 boss, recoil .2)');
  const b = arena([[.8, 0, { boss: true }]]); b.g.primaryAttack(1000, { x: 1, y: 0 }); assert.equal(b.g.enemies[0].hitStun, D.stun.boss);
  // A guarded foe (the governor's guard after a stagger lock) shrugs the cuts off.
  const q = arena([[.8, 0, { boss: true, staggerGuard: 2 }]]), f = q.g.enemies[0];
  q.g.primaryAttack(1000, { x: 1, y: 0 }); step(q.g, 1000, 1200); assert.equal(f.hitStun, 0); assert.ok(taken(f) > 0, 'the blows still land');
});

test('the daggers scale with Finesse, the stamina stat, not Might', () => {
  assert.equal(weaponScaling(daggers()), 'stamina');
  const hit = (stats) => { const { g } = arena([FRONT_CLOSE], { stats }); g.primaryAttack(1000, { x: 1, y: 0 }); step(g, 1000, 1300); return taken(g.enemies[0]); };
  const plain = hit({}), finesse = hit({ Finesse: 21 }), might = hit({ Might: 21 });
  assert.equal(might, plain, 'Might adds nothing');
  assert.ok(finesse > plain * 1.5, `Finesse 21: ${plain} -> ${finesse}`);
  const s = freshSave(); s.stats.Finesse = 21; s.equipment.primary = daggers();
  assert.equal(characterStats(s).weaponBonus - characterStats(s).meleeBonus, 40, '+2 a rank, as Might gives a Might weapon');
});

test('switching away between the cuts cancels the second', () => {
  const { s, g } = arena([FRONT_CLOSE]), e = g.enemies[0];
  g.primaryAttack(1000, { x: 1, y: 0 }); const first = taken(e);
  s.equipment.primary = { id: 'salvage-blade', name: 'Salvage Blade', slot: 'primary', power: 6, basePower: 6, upgradeRank: 0, property: 'steady' };
  step(g, 1000, 1300); assert.equal(taken(e), first);
});

test('obtainable: milestone gear at level 12, and a share of generated weapons', () => {
  const s = freshSave(); s.level = D.milestone.level - 1; grantMilestoneGear(s); assert.ok(!s.inventory.some(isFourfoldDaggers));
  s.level = D.milestone.level; grantMilestoneGear(s);
  const got = s.inventory.find(isFourfoldDaggers); assert.ok(got, 'granted at level 12'); assert.equal(got.power, D.milestone.power); assert.ok(isValidItem(got));
  grantMilestoneGear(s); assert.equal(s.inventory.filter(isFourfoldDaggers).length, 1, 'once');
  let primaries = 0, found = 0;
  for (let i = 0; i < 4000; i++) { const it = generateItem(`DAGGER-LOOT-${i}`, 12); if (it.slot !== 'primary') continue; primaries++; if (isFourfoldDaggers(it)) { found++; assert.ok(isValidItem(it)); assert.equal(it.property, D.property); } }
  assert.ok(found > primaries * .08 && found < primaries * .25, `${found} of ${primaries} generated weapons`);
});

test('saves: the daggers survive migrateSave and a round trip; old saves are unchanged', () => {
  const s = freshSave(); s.seed = 'DAGGER-SAVE'; s.equipment.primary = daggers(11); s.inventory.push({ ...daggers(9), id: 'primary-fd-spare', glyphs: [null], extra: 'kept' });
  const back = migrateSave(JSON.parse(JSON.stringify(s)));
  assert.equal(back.version, 14); assert.ok(isFourfoldDaggers(back.equipment.primary)); assert.equal(back.equipment.primary.power, 11);
  assert.equal(primaryProfile(back.equipment.primary), PROFILE); assert.equal(back.inventory[0].extra, 'kept', 'unknown fields are kept');
  const old = migrateSave(JSON.parse(JSON.stringify(freshSave())));
  assert.equal(old.equipment.primary.name, 'Salvage Blade'); assert.ok(!old.inventory.some(isFourfoldDaggers));
});

test('glyphs: the daggers take sockets, and a melee Echo repeats both cuts at its share', async () => {
  const { normalizeSockets, socketGlyph, socketCount } = await import('../src/glyphs.ts');
  const { s, g } = arena([FRONT_CLOSE], { primary: normalizeSockets(daggers(15)) }), e = g.enemies[0];
  assert.ok(socketCount(s.equipment.primary) > 0, 'the daggers have glyph sockets');
  g.primaryAttack(1000, { x: 1, y: 0 }); step(g, 1000, 2500); const plain = taken(e);
  const q = arena([FRONT_CLOSE], { primary: normalizeSockets(daggers(15)) }); q.s.glyphs.echo = 1; assert.equal(socketGlyph(q.s, 'melee', 0, 'echo').ok, true);
  q.g.primaryAttack(1000, { x: 1, y: 0 }); step(q.g, 1000, 2500);
  assert.ok(taken(q.g.enemies[0]) > plain * 1.2, `the Echo adds its own two cuts: ${plain} -> ${taken(q.g.enemies[0])}`);
});

// Tim (2026-11-12): a cancel before the second cut starts drops it (only the first lands); a cancel after it keeps both. The
// first cut resolves at the press itself, so it has always landed by the time any cancel can come.
test('a cancel before the second cut drops it; a cancel after keeps both', () => {
  const press = () => { const a = arena([FRONT_CLOSE]); a.s.stamina = a.g.player.stamina = 100; a.g.primaryAttack(1000, { x: 1, y: 0 }); return a; };
  const cut = (g) => wayfarerDamage((PROFILE.damage + g.weaponBonus()) * D.share);
  // Dodge between the cuts: the game's melee cancel signal (cancelPendingMeleeContact('dodge')).
  { const { g } = press(), e = g.enemies[0]; assert.equal(taken(e), cut(g), 'the first cut landed at the press');
    step(g, 1000, 1040); let dodged = false; g.update(.02, { state: { x: 0, y: 1 }, consume: (k) => k === 'dodge' && !dodged && (dodged = true), held: () => false }, 1040);
    assert.ok(dodged && g.player.dodgeUntil > 1040, 'the dodge went off'); step(g, 1060, 1400); assert.equal(taken(e), cut(g), 'dodge: only the first cut'); }
  // Every other cancel path goes through the same signal: a tool, a cast, a stun, a switch.
  for (const reason of ['tool', 'presentation-interrupted', 'knockdown', 'equipment-switch']) {
    const { g } = press(), e = g.enemies[0]; step(g, 1000, 1040); assert.equal(g.cancelPendingMeleeContact(reason), true, `${reason}: it dropped the pending cut`);
    step(g, 1040, 1400); assert.equal(taken(e), cut(g), `${reason}: only the first cut`);
  }
  // A cancel after the second cut has started keeps both.
  { const { g } = press(), e = g.enemies[0]; step(g, 1000, 1000 + D.gapMs + 40); assert.equal(taken(e), 2 * cut(g));
    assert.equal(g.cancelPendingMeleeContact('dodge'), false, 'nothing left to cancel'); step(g, 1000 + D.gapMs + 40, 1400); assert.equal(taken(e), 2 * cut(g), 'both cuts kept'); }
});
