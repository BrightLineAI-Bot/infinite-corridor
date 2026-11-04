// Imbue Weapon (Tim, 2026-11-04): a timed spell that gives the Wayfarer an aura and adds magic damage to every melee hit,
// from Focus alone. Zero at the starting Focus, so a Might build gains (almost) nothing; on a Focus build it makes melee usable
// but keeps it below a pure Might build's melee and below the build's own spells.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, characterStats, GAME_CLOCKS, RESUME_GAME_CLOCKS } from '../src/game.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS, spellOpen } from '../src/items.ts';
import { CASTABLES, availableCastables, setSlot } from '../src/spell-slots.ts';
import { IMBUE, IMBUE_COLORS, imbueAmount, imbueSpark, drawBrawlerAuras, BRAWLER } from '../src/brawler-spells.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const HP = 5e9;
// Fixed reference builds of the same investment: level 28, Aperture 17,900, relic gear at +10; 200 points in Might or in Focus.
function build(kind, { fists = false, tool = null } = {}) {
  const s = freshSave(); s.seed = 'IMBUE-REF'; s.level = 28; s.weaponLevel = 12; s.perception.aperture = 17900;
  s.stats = { Might: kind === 'might' ? 200 : 1, Finesse: 4, Focus: kind === 'focus' ? 200 : 1, Vigor: 77, Resolve: 75 };
  s.equipment.primary = fists ? { id: 'primary-ref-fists', name: 'Iron Fists', slot: 'primary', power: 44, tier: 'relic', basePower: 34, upgradeRank: 10, affixes: [], glyphs: [] }
    : { id: 'primary-ref', name: 'Verge Cleaver', slot: 'primary', power: 44, tier: 'relic', basePower: 34, upgradeRank: 10, affixes: [{ id: 'attack', value: 5 }], glyphs: [] };
  s.equipment.secondary = tool ? { id: 'secondary-ref-tool', name: tool, slot: 'secondary', power: 37, tier: 'relic', basePower: 27, upgradeRank: 10, affixes: [], glyphs: [] }
    : { id: 'secondary-ref', name: 'Lumen Spindle', slot: 'secondary', power: 37, tier: 'relic', basePower: 27, upgradeRank: 10, affixes: [{ id: 'attack', value: 5 }], glyphs: [] };
  s.equipment.armor = { id: 'armor-ref', name: 'Kiln Mantle', slot: 'armor', power: 45, tier: 'relic', basePower: 35, upgradeRank: 10, affixes: [], glyphs: [] };
  s.spellGlyphs = {};
  return s;
}
function arena(s, foes = [['dummy', 11.2, 10]]) {
  const g = new Game(s, 0); g.paused = false; s.session.paused = false;
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; s.maxHp = characterStats(s).maxHp; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: s.maxHp }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: HP, maxHp: HP, damage: 0, cooldown: 99, speed: 0 }));
  return g;
}
// Damage a second against a still dummy for `secs`: swinging whenever ready, casting Imbue to keep it up, casting `spells`.
function dps(s, { swing = false, imbue = false, spells = [], secs = 30 } = {}) {
  const g = arena(s); let t = 1000; g.update(.05, idle, t);
  for (let i = 0; i < secs * 20; i++) {
    t += 50; const e = g.enemies[0]; Object.assign(e, { x: 11.2, y: 10, dead: false }); Object.assign(g.player, { x: 10, y: 10, hp: s.maxHp });
    if (imbue && !(t < (g.imbueUntil || 0) - 200)) g.castSpell('imbue-weapon');
    for (const id of spells) g.castSpell(id);
    if (swing) g.primaryAttack(t);
    g.update(.05, idle, t);
  }
  return (HP - g.enemies[0].hp) / secs;
}

test('Imbue Weapon is a spell like the others: Infinite III, a castable, slots, a cooldown shorter than its duration', () => {
  const sp = SPELLS['imbue-weapon'];
  assert.ok(sp && sp.brawler && sp.imbue && sp.cooldown > 0 && sp.text, 'a spell entry');
  assert.ok(sp.cooldown < IMBUE.seconds, 'can be recast before it runs out (the weaving loop)');
  assert.equal(sp.lifetime, IMBUE.seconds);
  assert.ok(CASTABLES['spell:imbue-weapon']);
  const low = freshSave(); assert.equal(spellOpen(low, 'imbue-weapon'), false);
  const s = build('focus'); assert.ok(availableCastables(s).includes('spell:imbue-weapon'));
  assert.equal(setSlot(s, 'b', 'spell:imbue-weapon').ok, true); assert.equal(s.magicSkills.slots.b, 'spell:imbue-weapon');
  assert.ok(GAME_CLOCKS.includes('imbueUntil') && RESUME_GAME_CLOCKS.includes('imbueUntil'));
});

test('zero Focus adds zero; the amount grows with Focus and with the magic bonus once Focus is in', () => {
  assert.equal(imbueAmount(1, 69), 0, 'starting Focus, any magic bonus: nothing');
  assert.equal(imbueAmount(0, 500), 0); assert.equal(imbueAmount(undefined, 500), 0); assert.equal(imbueAmount(NaN, NaN), 0);
  let last = 0; for (const f of [2, 10, 50, 100, 200, 400]) { const n = imbueAmount(f, 100); assert.ok(n > last && Number.isFinite(n), `Focus ${f}: ${n}`); last = n; }
  assert.ok(imbueAmount(200, 300) > imbueAmount(200, 100), 'magic bonus counts');
  assert.ok(imbueAmount(5, 300) < imbueAmount(5, 0) + IMBUE.magic * 300 * .05, 'and is gated by Focus put in');
  // In the game: a Might build (Focus 1) swings exactly as hard with it as without.
  const g = arena(build('might')); g.update(.05, idle, 1000); g.castSpell('imbue-weapon');
  assert.equal(g.imbueBonus(1100), 0); assert.ok(g.imbueUntil > 1000, 'it still runs (the aura shows)');
});

test('it applies only while active, and expires after its duration', () => {
  const s = build('focus'), g = arena(s); g.update(.05, idle, 1000);
  const swing = (t) => { g.player.attackReadyAt = 0; const e = g.enemies[0], before = e.hp; g.primaryAttack(t); return before - e.hp; };
  const plain = swing(1100);
  assert.equal(g.castSpell('imbue-weapon'), true);
  const per = g.imbueBonus(1200); assert.ok(per > 100, `per hit ${per}`);
  const imbued = swing(1200); assert.equal(imbued - plain, Math.round(per), `${plain} -> ${imbued}`);
  assert.ok((g.imbueSparks || []).some((q) => q.at === 1200), 'a hit flash where it landed');
  assert.ok(g.spellBuffLeft('imbue-weapon', 1200) > .98, 'the button fills');
  const end = 1000 + IMBUE.seconds * 1000 + 50; assert.equal(g.imbueBonus(end), 0); assert.equal(swing(end), plain, 'gone after it runs out');
  assert.equal(g.spellBuffLeft('imbue-weapon', end), 0);
  assert.equal(g.spellRunning(1500), false, 'not "a spell running": no Spellblade or Charged Air from it');
  // a recast refreshes to the full time, it never stacks
  const h = arena(build('focus')); h.update(.05, idle, 1000); h.castSpell('imbue-weapon'); const a = h.imbueBonus(1100);
  h.save.magicSkills.cooldowns['spell:imbue-weapon'] = 0; h.lastUpdateNow = 9000; h.castSpell('imbue-weapon');
  assert.equal(h.imbueUntil, 9000 + IMBUE.seconds * 1000); assert.equal(h.imbueBonus(9100), a);
});

test('Iron Fists punches and the Hammerfall and Great Sweep blows carry it too', () => {
  for (const [opts, act] of [[{ fists: true }, (g, t) => g.fistPunch(2, 0, t)], [{ tool: 'Great Sweep' }, (g, t) => { g.toolReadyAt = 0; g.fireSecondary(t, { x: 1, y: 0 }); }], [{ tool: 'Hammerfall' }, (g, t) => { g.toolReadyAt = 0; g.fireSecondary(t, { x: 1, y: 0 }); }]]) {
    const hit = (imbue) => { const g = arena(build('focus', opts)); let t = 1000; g.update(.05, idle, t); if (imbue) g.castSpell('imbue-weapon'); act(g, t + 50); for (let i = 0; i < 20; i++) g.update(.05, idle, (t += 50)); return { d: HP - g.enemies[0].hp, per: g.imbueBonus(1100) }; };
    const a = hit(false), b = hit(true);
    assert.ok(a.d > 0 && b.d - a.d >= Math.round(b.per) - 1, `${JSON.stringify(opts)}: ${a.d} -> ${b.d} (per ${b.per})`);
  }
});

test('it survives pause and exact resume', () => {
  const g = arena(build('focus')); g.update(.05, idle, 1000); g.castSpell('imbue-weapon');
  const until = g.imbueUntil; g.setPaused(true, 2000); g.setPaused(false, 62000);
  assert.equal(g.imbueUntil, until + 60000, 'a pause does not eat it');
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(5000)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts)))); assert.equal(v.health, 'healthy', v.error);
  const later = 400000, h = new Game(v.save, later);
  assert.equal(h.imbueUntil, later + (until + 60000 - 5000), 'time remaining restored');
  assert.ok(h.imbueBonus(later + 100) > 0 && h.spellBuffLeft('imbue-weapon', later + 100) > 0);
});

test('balance: a Focus build\'s imbued melee stays clearly below pure-Might melee and below its own spells; a Might build gains nothing', () => {
  const mightMelee = dps(build('might'), { swing: true }), mightImbued = dps(build('might'), { swing: true, imbue: true });
  const focusMelee = dps(build('focus'), { swing: true }), focusImbued = dps(build('focus'), { swing: true, imbue: true });
  const focusSpells = dps(build('focus'), { spells: ['cinder-dart', 'ember-ring'] });
  const line = `Might melee ${Math.round(mightMelee)} (imbued ${Math.round(mightImbued)}); Focus melee ${Math.round(focusMelee)} (imbued ${Math.round(focusImbued)}); Focus spells ${Math.round(focusSpells)}`;
  assert.equal(mightImbued, mightMelee, line);
  assert.ok(focusImbued > focusMelee * 1.3, `it is worth casting on a Focus build: ${line}`);
  assert.ok(focusImbued < mightMelee * .6, `clearly below pure Might: ${line}`);
  assert.ok(focusImbued < focusSpells * .85, `below its own spells: ${line}`);
});

test('every spell cast each frame for 60 s with cooldowns wiped: no NaN, bounded effects, sparks and projectiles', () => {
  const s = build('focus'), g = arena(s, [['a', 11.2, 10], ['b', 12, 11], ['c', 9, 9]]); let t = 1000; g.update(.05, idle, t);
  let maxFx = 0, maxShots = 0;
  for (let i = 0; i < 60 * 20; i++) {
    t += 50; for (const k of Object.keys(s.magicSkills.cooldowns)) s.magicSkills.cooldowns[k] = 0; g.spellCooldownRemaining = 0; g.player.attackReadyAt = 0; g.toolReadyAt = 0;
    for (const id of Object.keys(SPELLS)) g.castSpell(id);
    g.primaryAttack(t); g.fireSecondary(t, { x: 1, y: 0 });
    for (const e of g.enemies) e.dead = false; Object.assign(g.player, { hp: s.maxHp });
    g.update(.05, idle, t);
    maxFx = Math.max(maxFx, g.effects.length); maxShots = Math.max(maxShots, g.projectiles.length);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp), `foe hp ${e.hp} at ${t}`);
    assert.ok(Number.isFinite(g.imbueBonus(t)) && Number.isFinite(g.player.hp));
  }
  assert.equal((g.imbueSparks || []).length, IMBUE.sparks, 'the spark ring never grows');
  assert.ok(maxFx < 400 && maxShots <= 64, `effects ${maxFx}, shots ${maxShots}`);
  assert.ok(g.enemies.every((e) => e.hp < HP), 'they were hit');
  assert.ok(BRAWLER['shadow-boxing'], 'the other brawler spells are untouched');
});

test('the aura, motes and hit flashes are red (Tim: "red, not violet"), with a dark edge to read on lava and fire', () => {
  const used = new Set(), ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { if (k === 'fillStyle' || k === 'strokeStyle') used.add(v); o[k] = v; return true; } });
  const game = { lastUpdateNow: 5000, imbueUntil: 9000, player: { x: 3, y: 3 } }; imbueSpark(game, 4, 3, 4950);
  drawBrawlerAuras(ctx, game, (p) => [p.x * 32, p.y * 32], 32, 5);
  for (const c of Object.values(IMBUE_COLORS)) assert.ok(used.has(c), `${c} drawn`);
  const red = (hex) => { const n = parseInt(hex.slice(1, 7), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return r > g * 2 && r > b * 1.5; };
  for (const k of ['glow', 'rim', 'mote', 'spark']) assert.ok(red(IMBUE_COLORS[k]), `${k} ${IMBUE_COLORS[k]} is red`);
  assert.ok(![...used].some((c) => /9a8cff|b7adff|d8d0ff|c9c0ff/i.test(c)), 'no violet left');
});
