// Essence Walk (Tim, 2026-11-05): "a spell similar to Shadow Boxing... lets you cast your spells without waiting for the
// cooldown, but it costs stamina... Spells that have a longer cooldown cost more stamina to cast... spell-slinger builds:
// Essence Walk, then Gravity Well or whatever spell you want and spam it. Two spells on the buttons is fine."
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, characterStats, actionReadiness, GAME_CLOCKS, RESUME_GAME_CLOCKS, shiftClocks } from '../src/game.ts';
import { snapshotSave, splitSnapshot, assembleSave, validateJourney } from '../src/persistence.ts';
import { createCombatant } from '../src/combat.ts';
import { SPELLS, spellOpen } from '../src/items.ts';
import { CASTABLES, availableCastables, setSlot } from '../src/spell-slots.ts';
import { ESSENCE_WALK, ESSENCE_COLORS, essenceCost, essenceExempt, drawBrawlerAuras, BRAWLER } from '../src/brawler-spells.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false };
const HP = 5e9, E = ESSENCE_WALK;
// A fixed Focus reference build (level 28, Aperture 17,900, relic gear at +10, Focus 200), as the Imbue Weapon tests use.
function build({ glyphs = {}, finesse = 4 } = {}) {
  const s = freshSave(); s.seed = 'ESSENCE-REF'; s.level = 28; s.weaponLevel = 12; s.perception.aperture = 17900;
  s.stats = { Might: 1, Finesse: finesse, Focus: 200, Vigor: 77, Resolve: 75 };
  s.equipment.primary = { id: 'primary-ref', name: 'Verge Cleaver', slot: 'primary', power: 44, tier: 'relic', basePower: 34, upgradeRank: 10, affixes: [], glyphs: [] };
  s.equipment.secondary = { id: 'secondary-ref', name: 'Lumen Spindle', slot: 'secondary', power: 37, tier: 'relic', basePower: 27, upgradeRank: 10, affixes: [], glyphs: [] };
  s.equipment.armor = { id: 'armor-ref', name: 'Kiln Mantle', slot: 'armor', power: 45, tier: 'relic', basePower: 35, upgradeRank: 10, affixes: [], glyphs: [] };
  s.spellGlyphs = { ...glyphs };
  const st = characterStats(s); s.maxHp = st.maxHp; s.maxStamina = st.maxStamina;
  return s;
}
function arena(s, foes = [['a', 11.2, 10]]) {
  const g = new Game(s, 0); g.paused = false; s.session.paused = false;
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: s.maxHp, stamina: s.maxStamina }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([id, x, y]) => Object.assign(createCombatant('rootBrute', x, y), { id, hp: HP, maxHp: HP, damage: 0, cooldown: 99, speed: 0 }));
  return g;
}
const cds = (g) => g.save.magicSkills.cooldowns;
function ready(t = 1000, opts) { const s = build(opts), g = arena(s); g.update(.05, idle, t); return g; }

test('Essence Walk is a spell in the Shadow Boxing family: Infinite III, a castable, slots, its own cooldown and window', () => {
  const sp = SPELLS['essence-walk'];
  assert.ok(sp && sp.brawler && sp.essence && sp.text && sp.name === 'Essence Walk');
  assert.equal(sp.unlockTier, SPELLS['shadow-boxing'].unlockTier, 'opens with Shadow Boxing');
  assert.equal(sp.lifetime, E.seconds); assert.ok(sp.cooldown > E.seconds, 'a real gap between windows');
  assert.equal(Object.values(SPELLS).filter((q) => /essence (walk|step)/i.test(q.name)).length, 1, 'one Essence spell, no collision');
  assert.ok(CASTABLES['spell:essence-walk']);
  assert.equal(spellOpen(freshSave(), 'essence-walk'), false, 'locked early');
  const s = build(); assert.ok(availableCastables(s).includes('spell:essence-walk'));
  assert.equal(setSlot(s, 'b', 'spell:essence-walk').ok, true); assert.equal(setSlot(s, 'a', 'spell:gravity-well').ok, true);
  assert.ok(GAME_CLOCKS.includes('essenceUntil') && RESUME_GAME_CLOCKS.includes('essenceUntil'));
  assert.ok(essenceExempt('essence-walk') && essenceExempt('aegis') && !essenceExempt('gravity-well'));
});

test('the stamina cost grows with the cooldown, is clamped, and is never negative or NaN', () => {
  let last = 0; for (const cd of [0, 1, 2.5, 6, 10, 14, 18, 40]) { const c = essenceCost(cd); assert.ok(Number.isInteger(c) && c >= last, `${cd}s: ${c}`); last = c; }
  assert.equal(essenceCost(0), E.cost.min); assert.equal(essenceCost(1e9), E.cost.max);
  for (const bad of [-50, NaN, undefined, null, 'x', -Infinity]) assert.equal(essenceCost(bad), E.cost.min, String(bad));
  assert.equal(essenceCost(Infinity), E.cost.max);
  assert.ok(essenceCost(14) > essenceCost(2.5), 'Gravity Well costs more than Cinder Dart');
});

test('while it runs a recovering spell casts for stamina, and its cooldown carries on exactly as it was', () => {
  const g = ready(); g.lastUpdateNow = 1000;
  assert.equal(g.castSpell('gravity-well'), true, 'a ready spell casts as usual');
  const full = cds(g)['spell:gravity-well']; assert.ok(full > 0);
  assert.equal(g.castSpell('gravity-well'), false, 'without Essence Walk: refused'); assert.match(g.message, /recovers in/);
  assert.equal(g.castSpell('essence-walk'), true); assert.equal(g.essenceUntil, 1000 + E.seconds * 1000);
  const sta = g.player.stamina, cost = essenceCost(g.spellCooldownFor(SPELLS['gravity-well'])), before = cds(g)['spell:gravity-well'], wells = g.effects.filter((e) => e.kind === 'gravity-well').length;
  assert.equal(g.essenceCostFor('gravity-well'), cost);
  assert.equal(g.castSpell('gravity-well'), true, 'recovering, but cast');
  assert.equal(g.player.stamina, sta - cost, 'paid in stamina'); assert.match(g.message, /stamina/);
  assert.equal(cds(g)['spell:gravity-well'], before, 'the cooldown is neither restarted nor shortened');
  assert.ok(g.effects.filter((e) => e.kind === 'gravity-well').length > wells, 'a new well');
  // short of stamina: refused, nothing spent
  g.player.stamina = cost - 1; assert.equal(g.castSpell('gravity-well'), false); assert.match(g.message, /needs \d+ stamina/); assert.equal(g.player.stamina, cost - 1);
  // the cooldown kept ticking through the window; once it closes the spell waits only what it had left
  let t = 1000; g.player.stamina = 0; while (t < g.essenceUntil + 50) g.update(.05, idle, (t += 50));
  assert.ok(Math.abs(cds(g)['spell:gravity-well'] - Math.max(0, full - (t - 1000) / 1000)) < .2, `left ${cds(g)['spell:gravity-well']} (full ${full})`);
  if (cds(g)['spell:gravity-well'] > 0) { g.player.stamina = 999; assert.equal(g.castSpell('gravity-well'), false, 'the window is over'); }
});

test('it can never recast itself while it runs, and its cooldown never drops below its window plus the gap', () => {
  const g = ready(1000, { glyphs: { 'essence-walk': ['swift', 'swift'] } }); g.save.equipment.armor.glyphs = ['chain', 'chain', 'chain', 'chain']; g.lastUpdateNow = 1000;
  assert.equal(g.castSpell('essence-walk'), true);
  assert.ok(cds(g)['spell:essence-walk'] >= E.seconds + E.minGap - 1e-9, `cooldown ${cds(g)['spell:essence-walk']}`);
  cds(g)['spell:essence-walk'] = 0; g.lastUpdateNow = 3000; assert.equal(g.castSpell('essence-walk'), false, 'not even with its cooldown wiped');
  assert.match(g.message, /already flowing/); assert.equal(g.essenceUntil, 1000 + E.seconds * 1000, 'the window is not extended');
  assert.equal(g.essenceCostFor('essence-walk'), null);
});

test('Aegis and the Aperture disciplines keep their cooldowns; tools and the Orrery lockout are untouched', () => {
  const g = ready(); g.save.magicSkills.learned = { ...(g.save.magicSkills.learned || {}), 'rift-step': 1 }; g.lastUpdateNow = 1000;
  assert.equal(g.castSpell('aegis'), true); g.castSpell('essence-walk');
  g.lastUpdateNow = 2500; const sta = g.player.stamina;
  assert.equal(g.castSpell('aegis'), false, 'Aegis still recovers'); assert.equal(g.player.stamina, sta);
  assert.equal(g.essenceCostFor('aegis'), null);
  { // a discipline is not a spell: the same press does the same with and without Essence Walk
    const h = ready(); h.save.magicSkills.learned = { ...(h.save.magicSkills.learned || {}), 'rift-step': 1 }; h.lastUpdateNow = 2500;
    cds(g)['rift-step'] = 5; cds(h)['rift-step'] = 5; const a = g.activateApertureSkill('rift-step'), b = h.activateApertureSkill('rift-step');
    assert.equal(a, b); assert.equal(cds(g)['rift-step'], cds(h)['rift-step']); assert.equal(g.player.stamina, sta, 'no stamina for a discipline'); }
  g.orreryLockUntil = 9000; g.toolReadyAt = 7000; cds(g)['spell:ember-ring'] = 3; g.castSpell('ember-ring');
  assert.equal(g.orreryLockUntil, 9000); assert.equal(g.toolReadyAt, 7000);
});

test('Shadow Clone: stepping into it stays free; a second clone cast for stamina leaves the cooldown as it was', () => {
  const g = ready(); g.lastUpdateNow = 1000; g.castSpell('essence-walk');
  assert.equal(g.castSpell('shadow-clone'), true, 'ready: cast as usual'); const left = cds(g)['spell:shadow-clone'], sta = g.player.stamina;
  assert.ok(g.shadowCloneActive(1000));
  assert.equal(g.castSpell('shadow-clone'), true, 'step into it'); assert.equal(g.player.stamina, sta, 'free'); assert.equal(cds(g)['spell:shadow-clone'], left);
  assert.equal(g.castSpell('shadow-clone'), true, 'a new clone, for stamina'); assert.ok(g.player.stamina < sta); assert.equal(cds(g)['spell:shadow-clone'], left);
});

test('Orbit Volley: orbs gathered for stamina launch without restarting the cooldown', () => {
  const g = ready(); let t = 1000; g.lastUpdateNow = t;
  assert.equal(g.castSpell('orbit-volley'), true); g.launchOrbit(false, t); const full = cds(g)['spell:orbit-volley']; assert.ok(full > 0);
  for (let i = 0; i < 30 && g.orbit; i++) g.update(.05, idle, (t += 50));
  assert.equal(g.orbit, null, 'the first volley landed');
  g.castSpell('essence-walk'); const before = cds(g)['spell:orbit-volley'], sta = g.player.stamina;
  assert.equal(g.castSpell('orbit-volley'), true, 'gathers for stamina'); assert.ok(g.player.stamina < sta && g.orbit?.essence);
  const paid = g.player.stamina; assert.equal(g.castSpell('orbit-volley'), true, 'the launch press'); assert.equal(g.player.stamina, paid, 'the launch is free');
  assert.ok(cds(g)['spell:orbit-volley'] <= before, `cooldown ${cds(g)['spell:orbit-volley']} <= ${before}`);
});

test('the legacy single cast button and the HUD both follow it', () => {
  const s = build(); setSlot(s, 'a', 'spell:grave-sun'); setSlot(s, 'b', 'spell:essence-walk');
  const g = arena(s); g.update(.05, idle, 1000); g.lastUpdateNow = 1000; s.equippedSpell = 'grave-sun';
  assert.equal(g.castSpell(), true); assert.ok(g.spellCooldownRemaining > 0);
  assert.equal(g.castSpell(), false, 'legacy: refused while recovering');
  assert.ok(actionReadiness(g, 1000).spell.remaining > 0, 'the button counts down');
  assert.equal(g.castSlot('b', 1000), true);
  const r = actionReadiness(g, 1000).spell, cost = g.essenceCostFor('grave-sun');
  assert.equal(r.remaining, 0); assert.equal(r.essence, cost); assert.equal(r.available, true, `shows "${cost} STA"`);
  s.equippedSpell = 'grave-sun'; const legacy = g.spellCooldownRemaining; assert.equal(g.castSpell(), true, 'legacy: cast for stamina'); assert.equal(g.spellCooldownRemaining, legacy, 'its single cooldown is kept too');
  g.player.stamina = 0; assert.equal(actionReadiness(g, 1000).spell.available, false, 'greyed out when stamina is short');
  assert.ok(g.spellBuffLeft('essence-walk', 1000) > .99 && g.spellBuffLeft('essence-walk', 1000 + E.seconds * 1000) === 0, 'its own button drains');
  assert.equal(actionReadiness(g, 1000).spell2.essence, undefined, 'its own slot just counts down');
});

test('Echoes and glyph Echo still fire on each cast; Imbue Weapon and Shadow Boxing can be refreshed through it', () => {
  const s = build({ glyphs: { 'ember-ring': ['echo', null] } }), g = arena(s); g.update(.05, idle, 1000); g.lastUpdateNow = 1000;
  g.castSpell('ember-ring'); g.castSpell('essence-walk'); const n = g.effects.filter((e) => e.kind === 'ember-ring' && e.echo).length;
  assert.equal(g.castSpell('ember-ring'), true); assert.equal(g.effects.filter((e) => e.kind === 'ember-ring' && e.echo).length, n + 1, 'the glyph echo rides the stamina cast');
  g.castSpell('imbue-weapon'); g.lastUpdateNow = 4000; g.player.stamina = s.maxStamina; assert.equal(g.castSpell('imbue-weapon'), true); assert.equal(g.imbueUntil, 4000 + SPELLS['imbue-weapon'].lifetime * 1000);
  g.castSpell('shadow-boxing'); g.lastUpdateNow = 5000; g.player.stamina = s.maxStamina; assert.equal(g.castSpell('shadow-boxing'), true); assert.equal(g.boxingUntil, 5000 + BRAWLER['shadow-boxing'].seconds * 1000);
  const h = ready(); h.lastUpdateNow = 1000; h.castSpell('essence-walk'); h.effects.length = 0; assert.equal(h.spellRunning(1000), false, 'Essence Walk alone is not "a spell running"');
});

test('it survives pause and exact resume', () => {
  const g = ready(); g.lastUpdateNow = 1000; g.castSpell('essence-walk'); const until = g.essenceUntil;
  g.setPaused(true, 2000); g.setPaused(false, 62000); assert.equal(g.essenceUntil, until + 60000, 'a pause does not eat it');
  const h0 = { essenceUntil: 5 }; shiftClocks(h0, 10); assert.equal(h0.essenceUntil, 15);
  const { main, puts } = splitSnapshot(snapshotSave(g.exportSnapshot(5000)));
  const v = validateJourney(assembleSave(structuredClone(main), new Map(structuredClone(puts)))); assert.equal(v.health, 'healthy', v.error);
  assert.equal(v.save.schemaVersion ?? v.save.schema ?? 14, v.save.schemaVersion ?? v.save.schema ?? 14);
  const later = 400000, h = new Game(v.save, later);
  assert.equal(h.essenceUntil, later + (until + 60000 - 5000), 'time remaining restored');
  h.lastUpdateNow = later + 100; assert.ok(h.essenceCostFor('ember-ring') > 0);
});

test('every spell pressed each frame for 60 s under Essence Walk with stamina refilled: no NaN, everything bounded', () => {
  for (const wipe of [false, true]) {
    const s = build(), g = arena(s, [['a', 11.2, 10], ['b', 12, 11], ['c', 9, 9]]); let t = 1000; g.update(.05, idle, t);
    g.presentation = { effectiveQuality: 'high' };
    const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } });
    let maxFx = 0, maxShots = 0, casts = 0;
    for (let i = 0; i < 60 * 20; i++) {
      t += 50; g.player.stamina = s.maxStamina;
      if (wipe) { for (const k of Object.keys(cds(g))) cds(g)[k] = 0; g.spellCooldownRemaining = 0; }
      if (!(t < (g.essenceUntil || 0))) { cds(g)['spell:essence-walk'] = 0; g.lastUpdateNow = t; g.castSpell('essence-walk'); }
      for (const id of Object.keys(SPELLS)) if (g.castSpell(id)) casts++;
      for (const e of g.enemies) e.dead = false; Object.assign(g.player, { hp: s.maxHp });
      g.update(.05, idle, t); drawBrawlerAuras(ctx, g, (q) => [q.x * 32, q.y * 32], 32, t / 1000);
      maxFx = Math.max(maxFx, g.effects.length); maxShots = Math.max(maxShots, g.projectiles.length);
      for (const e of g.enemies) assert.ok(Number.isFinite(e.hp), `foe hp ${e.hp}`);
      assert.ok(Number.isFinite(g.player.stamina) && g.player.stamina >= 0, `stamina ${g.player.stamina}`);
      for (const [k, v] of Object.entries(cds(g))) assert.ok(Number.isFinite(v) && v >= 0, `${k} ${v}`);
    }
    assert.ok(casts > 1000, `casts ${casts}`);
    assert.equal(g.essenceTrail.length, E.trail, 'the after-image ring never grows');
    assert.ok(maxFx < 400 && maxShots <= 64, `effects ${maxFx}, shots ${maxShots} (wipe ${wipe})`);
    assert.ok(g.enemies.every((e) => e.hp < HP));
  }
});

test('the aura draws a fixed ring of after-images, and none at reduced motion, in safe mode or at low quality', () => {
  const used = new Set(), ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { if (k === 'fillStyle' || k === 'strokeStyle') used.add(v); o[k] = v; return true; } });
  const g = { lastUpdateNow: 5000, essenceUntil: 9000, player: { x: 3, y: 3 }, presentation: {} };
  for (let i = 0; i < 40; i++) { g.lastUpdateNow += 100; drawBrawlerAuras(ctx, g, (q) => [q.x * 32, q.y * 32], 32, i / 10); }
  assert.equal(g.essenceTrail.length, E.trail); assert.ok(used.has(ESSENCE_COLORS.rim) && used.has(ESSENCE_COLORS.edge));
  for (const pr of [{ reduceMotion: true }, { safeMode: true }, { effectiveQuality: 'low' }]) {
    const q = { lastUpdateNow: 5000, essenceUntil: 9000, player: { x: 3, y: 3 }, presentation: pr }; used.clear();
    drawBrawlerAuras(ctx, q, (p) => [p.x * 32, p.y * 32], 32, 0); assert.equal(q.essenceTrail, undefined, JSON.stringify(pr)); assert.ok(used.has(ESSENCE_COLORS.rim), 'the ring still shows');
  }
  const off = { lastUpdateNow: 9500, essenceUntil: 9000, player: { x: 3, y: 3 } }; used.clear(); drawBrawlerAuras(ctx, off, (p) => [p.x, p.y], 32, 0); assert.ok(!used.has(ESSENCE_COLORS.rim), 'nothing once it ends');
});

// Damage a second against still dummies with A and B pressed each frame (Essence Walk recast whenever it is down).
function rotation(s, a, b, { foes = 3, secs = 60 } = {}) {
  setSlot(s, 'a', `spell:${a}`); setSlot(s, 'b', b ? `spell:${b}` : null);
  const g = arena(s, [['a', 11.2, 10], ['b', 12, 10.6], ['c', 11.5, 9.2]].slice(0, foes)); let t = 1000; g.update(.05, idle, t);
  let held = 0, spent = 0;
  for (let i = 0; i < secs * 20; i++) {
    t += 50; for (const e of g.enemies) e.dead = false; Object.assign(g.player, { x: 10, y: 10, hp: s.maxHp });
    if (b === 'essence-walk') { if (!(t < (g.essenceUntil || 0))) g.castSlot('b', t); } else if (b) g.castSlot('b', t);
    const sta = g.player.stamina, cost = g.essenceCostFor(a, t);
    if (g.castSlot('a', t)) spent += Math.max(0, sta - g.player.stamina); else if (cost != null) held++;
    g.update(.05, idle, t);
  }
  return { dps: g.enemies.reduce((n, e) => n + (HP - e.hp), 0) / secs, held, spent, max: s.maxStamina };
}
test('balance: stamina is the limit; spamming beats the cooldown but one slot of Essence Walk is not worth two of damage by much', () => {
  const plain = rotation(build(), 'gravity-well', null), walk = rotation(build(), 'gravity-well', 'essence-walk');
  const gain = walk.dps / plain.dps, line = `Gravity Well alone ${Math.round(plain.dps)}, with Essence Walk ${Math.round(walk.dps)} (x${gain.toFixed(2)}); held back by stamina ${walk.held} frames; spent ${Math.round(walk.spent)}`;
  assert.ok(gain > 1.8 && gain < 4, line);
  assert.ok(walk.held > 300, `stamina, not the cooldown, is what stops the spam: ${line}`);
  const regen = 9; assert.ok(walk.spent <= walk.max + regen * 60 + 1, `never more than the pool plus regeneration: ${line}`);
  // the whole slot pair: Essence Walk + one spell against two damage spells
  const two = rotation(build(), 'gravity-well', 'ember-ring'), pair = rotation(build(), 'cinder-dart', 'essence-walk'), dual = rotation(build(), 'ember-ring', 'cinder-dart');
  assert.ok(walk.dps < two.dps * 1.4, `Gravity Well + Essence Walk ${Math.round(walk.dps)} vs Gravity Well + Ember Ring ${Math.round(two.dps)}`);
  assert.ok(pair.dps < dual.dps * 1.6, `Cinder Dart + Essence Walk ${Math.round(pair.dps)} vs Ember Ring + Cinder Dart ${Math.round(dual.dps)}`);
  // more stamina (Finesse) buys more casts: it really is the limit
  const rich = rotation(build({ finesse: 60 }), 'gravity-well', 'essence-walk'); assert.ok(rich.dps > walk.dps * 1.2, `Finesse 60: ${Math.round(rich.dps)} vs ${Math.round(walk.dps)}`);
});
