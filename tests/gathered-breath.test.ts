// Gathered Breath (Tim, 2026-11-14): a glyph that shortens every charged attack, ×.7 per copy set in the weapon, tool or armor,
// never below a .15 s charge; rarer than the first ten (its own v2 drop stream) and dearer to inscribe. With it, the Iron Fists'
// charge rhythm pulls far ahead; without it, the shorter base charge (.96 s) keeps the rhythm 15-30% ahead of perfect taps.
// Numbers: glyphs.ts CHARGE_GLYPH, brawler-spells.ts IRON_FISTS, tool-forms.ts CARBINE and ORRERY, weapon-arts.ts, quandrix-staff.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { GLYPHS, GLYPH_IDS, GLYPH_V1_IDS, SKILL_GLYPHS, ARMOR_GLYPHS, RESONANCES, TRIADS, CHARGE_GLYPH, chargeScale, chargeGlyphCount, glyphDustCost, glyphDrop, craftGlyph, ensureGlyphState, normalizeSockets, socketGlyph, DUST_PER_GLYPH } from '../src/glyphs.ts';
import { IRON_FISTS } from '../src/brawler-spells.ts';
import { CARBINE, ORRERY, orreryPress, tickOrrery } from '../src/tool-forms.ts';
import { WEAPON_ARTS } from '../src/weapon-arts.ts';
import { QUANDRIX } from '../src/quandrix-staff.ts';
import { QUANDRIX_STAFF, normalizeItemUpgrade, CARBINE_RANK } from '../src/items.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { hashSeed } from '../src/random.ts';
import { snapshotSave, splitSnapshot, assembleSave } from '../src/persistence.ts';

const B = CHARGE_GLYPH, ID = B.id, F = IRON_FISTS, DT = 1 / 60;
const armor = () => normalizeSockets({ id: 'armor-breath', name: 'Coat', slot: 'armor', power: 5, tier: 'relic', affixes: [] });
// Set `n` Gathered Breath glyphs in a relic coat (three sockets).
function breathe(s, n) { s.equipment.armor = armor(); s.glyphs[ID] = (s.glyphs[ID] || 0) + n; for (let i = 0; i < n; i++) assert.equal(socketGlyph(s, 'armor', i, ID).ok, true); return s; }
const flat = (g) => { g.map = { ...g.map, width: 40, height: 40, exits: null, objects: [], enemySpawns: [], landscape: false, tiles: Array.from({ length: 1600 }, (_, i) => ({ x: i % 40, y: Math.floor(i / 40), kind: 'ash', blocked: false })) }; g.area = 'dungeon'; g.paused = false; g.projectiles = []; g.effects = []; };
const foe = (x, y, kind = 'ashling') => Object.assign(createCombatant(kind, x, y), { id: `foe-${x}-${y}`, hp: 1e9, maxHp: 1e9, speedMultiplier: 1e-6, speed: 0, damage: 0, cooldown: 99, meleePatterns: [], aggro: false });

test('one data table: ×.7 a copy, a .15 s floor, dearer to inscribe, rarer to find; plain text in every host; no rule of its own', () => {
  assert.ok(Object.isFrozen(B)); assert.equal(B.per, .7); assert.equal(B.floor, .15); assert.equal(B.dust, 12); assert.equal(B.drop, .01); assert.deepEqual([...B.hosts], ['melee', 'tool', 'armor']);
  assert.ok(GLYPHS[ID] && GLYPHS[ID].name === 'Gathered Breath'); assert.ok(GLYPH_IDS.includes(ID)); assert.deepEqual([...GLYPH_V1_IDS], GLYPH_IDS.slice(0, 10), 'the first ten, in their order');
  for (const h of ['melee', 'tool', 'spell', 'armor', 'skill']) assert.ok(GLYPHS[ID].text[h]?.length > 20, h);
  for (const h of ['melee', 'tool', 'armor']) assert.match(GLYPHS[ID].text[h], /30% sooner/); assert.match(GLYPHS[ID].text.spell, /nothing/); assert.ok(SKILL_GLYPHS[ID]);
  assert.equal(GLYPHS[ID].mods, undefined); assert.equal(GLYPHS[ID].hit, undefined); assert.equal(ARMOR_GLYPHS[ID], undefined, 'no armor stat');
  for (const r of [...Object.values(RESONANCES), ...Object.values(TRIADS)]) assert.ok(!r.pair.includes(ID), r.name);
  assert.equal(glyphDustCost(ID), 12); assert.equal(glyphDustCost('ignite'), DUST_PER_GLYPH);
});

test('the curve: each copy in weapon, tool or armor compounds; a spell socket does not count; never under the floor', () => {
  for (const n of [0, 1, 2, 3]) { const s = breathe(freshSave(), n); assert.equal(chargeGlyphCount(s), n); assert.ok(Math.abs(chargeScale(s, 1) - B.per ** n) < 1e-12, `${n}`); }
  const s = freshSave(); s.equipment.primary = normalizeSockets({ id: 'p', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] });
  s.equipment.secondary = normalizeSockets({ id: 's', name: 'Spark Coil', slot: 'secondary', power: 10, property: 'focus', tier: 'rare', affixes: [] }); s.equipment.armor = armor(); s.glyphs[ID] = 4;
  for (const h of ['melee', 'tool', 'armor']) socketGlyph(s, h, 0, ID); socketGlyph(s, 'ember-ring', 0, ID);
  assert.equal(chargeGlyphCount(s), 3, 'weapon, tool and armor; not the spell'); assert.ok(Math.abs(chargeScale(s) - .343) < 1e-12);
  const three = breathe(freshSave(), 3); assert.equal(chargeScale(three, .3), .5, 'a .3 s charge: never under .15 s'); assert.equal(chargeScale(three, .1), 1, 'never slower than none');
  // the shortest key point of any charged attack, with three: still above the floor
  for (const span of [F.perfect[0], CARBINE.charge.full - CARBINE.charge.grace, WEAPON_ARTS.charge.perfect[0], QUANDRIX.slam.perfect[0], ORRERY.charge.full - ORRERY.charge.grace]) assert.ok(span * chargeScale(three, span) >= B.floor - 1e-12);
  // saves: additive at schema 14; the count is normalised, sockets keep it
  const old = freshSave(); delete old.glyphs[ID]; const m = migrateSave(JSON.parse(JSON.stringify(old))); assert.equal(m.glyphs[ID], 0); assert.equal(m.version, 14);
  const back = assembleSave(...Object.values(splitSnapshot(snapshotSave(three)))); ensureGlyphState(back); assert.deepEqual(back.equipment.armor.glyphs, [ID, ID, ID]); assert.equal(chargeScale(back), chargeScale(three));
});

// The Iron Fists: the cross held to its perfect window, with and without three.
function fists(n) {
  const s = breathe(freshSave(), n); s.seed = 'BREATH'; s.level = 15; s.equipment.primary = normalizeSockets({ id: 'p', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] });
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = []; const g = new Game(s, 0); flat(g); Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [foe(11.2, 10)];
  return g;
}
const frameOf = (g, t, press, held, action = 'attack') => { let used = false; g.player.invulnerableUntil = t + 1e6; g.update(DT, { state: { x: 0, y: 0 }, consume: (k) => k === action && press && !used && (used = true), held: (k) => k === action && held }, t); return t + DT * 1000; };

test('each charged attack honours it: the Iron Fists, the Carbine, the weapon arts, the Quandrix slam and the Aether Orrery', () => {
  // Iron Fists: three copies bring the perfect window to a third of the hold
  const fistHold = (n, seconds) => { const g = fists(n); let t = 1000; t = frameOf(g, t, true, true); const c = g.fistCharge; assert.ok(c); assert.ok(Math.abs(c.scale - chargeScale(g.save, F.perfect[0])) < 1e-12);
    while (t - c.start < seconds * 1000) t = frameOf(g, t, false, true); t = frameOf(g, t, false, false); for (let i = 0; i < 8; i++) t = frameOf(g, t, false, false); return g.message; };
  const short = F.tapGrace + (F.perfect[0] + F.perfect[1]) / 2 * .343;
  assert.match(fistHold(3, short), /Perfect/, 'three: perfect at a third of the hold'); assert.doesNotMatch(fistHold(0, short), /Perfect/, 'none: too early');
  assert.match(fistHold(0, F.tapGrace + (F.perfect[0] + F.perfect[1]) / 2), /Perfect/, 'none: the base window (.8-1.04 s of charge)');
  // the Carbine: a hold that is a third of a full charge is full with three
  const carbine = (n, seconds) => { const s = breathe(freshSave(), n); s.seed = 'CARB'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; Object.assign(s.stats, { Finesse: 30 }); ensureLattice(s); s.lattice.passives = [];
    s.equipment.secondary = normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + CARBINE_RANK, upgradeRank: CARBINE_RANK }); s.activeWeaponSlot = 'secondary';
    const g = new Game(s, 0); flat(g); Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [foe(20, 9.1, 'rootBrute')];
    let t = 1000; t = frameOf(g, t, true, true, 'tool'); const start = t; while (t - start < seconds * 1000) t = frameOf(g, t, false, true, 'tool'); t = frameOf(g, t, false, false, 'tool');
    return g.projectiles.find((p) => p.carbine && !p.echo && !p.shadow)?.charge; };
  const C = CARBINE.charge, hold = C.grace + (C.full - C.grace) * .343 + .05;
  assert.equal(carbine(3, hold), 1, 'three: full'); const none = carbine(0, hold); assert.ok(none > 0 && none < .5, `none: ${none}`);
  // the weapon arts (the Cleaver's Lava Slash): the charge counts 1 / .343 as fast past the grace
  const art = (n) => { const s = breathe(freshSave(), n); s.seed = 'ART'; s.level = 15; s.equipment.primary = { id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 10, property: 'impact', tier: 'rare', affixes: [] };
    s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = ['field:lava-slash']; const g = new Game(s, 0); flat(g); Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [foe(13, 10)];
    const clock = { t: 1000 }, step = (held) => { g.player.invulnerableUntil = clock.t + 1e6; g.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' && held }, clock.t); clock.t += 20; };
    const press = (action) => { g.attackAction = action; try { g.primaryAttack(clock.t, { x: 1, y: 0 }); } finally { g.attackAction = null; } };
    for (let i = 0; i < WEAPON_ARTS.arm.presses; i++) { press(null); for (let k = 0; k < 40; k++) step(false); g.player.x = 10; g.player.y = 10; }
    press('attack'); for (let i = 0; i < Math.round((WEAPON_ARTS.hold.grace + .2) / .02); i++) step(true); return g.weaponArts?.hold?.on ? g.weaponArts.hold.held : null; };
  const a0 = art(0), a3 = art(3); assert.ok(a0 > 0 && a3 > 0, `${a0} ${a3}`); assert.ok(Math.abs(a3 / a0 - 1 / .343) < .35, `${a3.toFixed(3)} vs ${a0.toFixed(3)}`);
  // the Quandrix Staff's slam (awakened): the same; the Mage's Hand grab keeps its own time
  const slam = (n) => { const s = breathe(freshSave(), n); s.seed = 'QS'; s.level = 15; s.equipment.primary = { id: 'primary-qs-test', name: QUANDRIX_STAFF.name, slot: 'primary', power: 15, basePower: 15, upgradeRank: 0, property: QUANDRIX_STAFF.property, tier: 'rare', affixes: [], awakened: { resonance: 'x', version: 1 } };
    s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); const g = new Game(s, 0); flat(g); Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [];
    let t = 1000; g.attackAction = 'attack'; try { g.primaryAttack(t, { x: 1, y: 0 }); } finally { g.attackAction = null; }
    for (let i = 0; i < 30; i++) { g.player.invulnerableUntil = t + 1e6; g.update(.02, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' }, t); t += 20; }
    const H = g.quandrix?.hold; return H?.on ? { mode: H.mode, held: H.held } : null; };
  const q0 = slam(0), q3 = slam(3); assert.equal(q0?.mode, 'slam'); assert.ok(Math.abs(q3.held / q0.held - 1 / .343) < .05, `${q3.held} vs ${q0.held}`);
  // the Aether Orrery: past its grace the charge fills 1 / .343 as fast (and overcharges as much sooner)
  const orrery = (n) => { const s = breathe(freshSave(), n); s.seed = 'ORR'; s.perception.aperture = 3255; s.equipment.secondary = { ...ORRERY.item, tier: 'relic', extraSockets: 1, glyphs: [] }; const g = new Game(s, 0); flat(g); Object.assign(g.player, { x: 10, y: 10, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [];
    assert.equal(orreryPress(g, 1000, { x: 1, y: 0 }, 'tool'), true); let t = 1000; for (let i = 0; i < 20; i++) { t += 16; tickOrrery(g, .016, t, true); } return g.orrery.charge?.held; };
  const o0 = orrery(0), o3 = orrery(3), G = ORRERY.charge.grace; assert.ok(o0 > G && o3 > G); assert.ok(Math.abs((o3 - G) / (o0 - G) - 1 / .343) < .2, `${o3} vs ${o0}`);
});

test('found like the others: a guardian always leaves one of the first ten; a kill that leaves none may leave Gathered Breath; old drops unchanged', () => {
  const old = (seed, source, n, guaranteed) => { const h = hashSeed(`${seed}:glyph-drop:v1:${source}:${n}`); return !guaranteed && h % 100 >= 12 ? null : GLYPH_V1_IDS[Math.floor(h / 100) % 10]; };
  let breath = 0, kills = 0;
  for (const seed of ['CINDER-VERGE-47', 'BREATH-A', 'BREATH-B']) for (let n = 0; n < 3000; n++) {
    const s = freshSave(); s.seed = seed; const want = old(seed, 'dungeon:foe', n, false), got = glyphDrop(s, 'dungeon:foe', n); kills++;
    if (want) assert.equal(got, want, `${seed} ${n}: the first stream's glyph is unchanged`); else { assert.ok(got === null || got === ID); if (got === ID) { breath++; assert.equal(s.glyphs[ID], 1); assert.equal(s.glyphCodex.glyphs[ID], true); } }
    if (n < 200) { const g2 = freshSave(); g2.seed = seed; assert.equal(glyphDrop(g2, 'boss', n, true), old(seed, 'boss', n, true), 'a guardian: as before'); }
  }
  const rate = breath / kills; assert.ok(rate > .005 && rate < .015, `about ${(B.drop * 88).toFixed(2)}% of kills (${(rate * 100).toFixed(2)}%)`);
  // inscribing: only once found, and for twice the dust
  const s = freshSave(); s.glyphDust = 20; assert.equal(craftGlyph(s, ID).ok, false, 'unknown pattern'); s.glyphCodex.glyphs[ID] = true; s.glyphDust = 11; assert.equal(craftGlyph(s, ID).ok, false);
  s.glyphDust = 12; assert.equal(craftGlyph(s, ID).ok, true); assert.equal(s.glyphDust, 0); assert.equal(s.glyphs[ID], 1);
});

// Damage per second with the real loop at 60 fps, the awakened fists with two Echoes in the fists and n Gathered Breath in the coat.
function fistArena(n) { const g = fists(0); const s = g.save; s.equipment.primary.awakened = { resonance: 'wildfire', version: 1 }; s.glyphs.echo = 2; for (let i = 0; i < 2; i++) assert.equal(socketGlyph(s, 'melee', i, 'echo').ok, true); breathe(s, n); return g; }
const opens = (g) => g.fistBeat ? g.fistBeat.opens : (g.fistRecoverUntil || 0);
const charger = (offset) => (g, t, st) => { const HOLD = (F.tapGrace + F.perfect[0] * (g.fistCharge?.scale || 1)) * 1000 + 1;
  if (st.holding) { if (g.fistCharge) { st.seen = true; if (t - g.fistCharge.start >= HOLD) { st.holding = false; return [false, false]; } return [false, true]; }
    if (st.seen || t - st.at > 400) { st.holding = false; st.seen = false; } else return [false, true]; }
  const o = opens(g); if (t >= o + offset && st.last !== o) { st.last = o; st.holding = true; st.seen = false; st.at = t; return [true, true]; } return [false, false]; };
const masher = (n) => (g, t, st) => { st.i = (st.i || 0) + 1; const p = st.i % n === 0; return [p, p]; };
const taps = (g, t, st) => { const o = opens(g), ok = !g.fistCharge && t >= o && st.last !== o; if (ok) st.last = o; return [ok, false]; };
function dps(play, n, seconds = 15) { const g = fistArena(n), st = {}; let t = 1000;
  const run = (secs) => { for (let i = 0; i < Math.round(secs / DT); i++) { const [press, held] = play(g, t, st); g.enemies[0].x = g.player.x + 1.2; g.enemies[0].y = g.player.y; t = frameOf(g, t, press, held); } };
  run(3); const hp = g.enemies[0].hp; run(seconds); return (hp - g.enemies[0].hp) / seconds / g.fistPower(); }

test('damage per second at 0-3 copies: the rhythm stays on top and pulls away; taps and mashing are untouched; off-rhythm charging stays under taps', () => {
  const base = { mash: 0, tap: 0 }, rows = [];
  for (const n of [0, 1, 2, 3]) {
    const mash = Math.max(...[2, 3, 6].map((k) => dps(masher(k), n))), tap = dps(taps, n), rhythm = dps(charger(0), n), off = Math.max(dps(charger(-60), n), dps(charger(F.gate * 1000 * (F.beat[1] - F.beat[0]) + 20), n));
    rows.push({ n, mash, tap, rhythm, off });
    if (n === 0) { Object.assign(base, { mash, tap }); const edge = rhythm / Math.max(mash, tap); assert.ok(edge >= 1.15 && edge <= 1.3, `the base edge ${((edge - 1) * 100).toFixed(1)}%`); }
    else { assert.ok(Math.abs(mash - base.mash) < .01 && Math.abs(tap - base.tap) < .01, 'taps and mashing have no charge to shorten'); assert.ok(rhythm > rows[n - 1].rhythm, 'each copy pulls the rhythm further ahead'); }
    assert.ok(rhythm > Math.max(mash, tap), `${n}: rhythm ${rhythm.toFixed(2)} on top`); assert.ok(off <= tap, `${n}: off-rhythm ${off.toFixed(2)} under taps ${tap.toFixed(2)}`);
  }
});

test('the Carbine with 0-3 copies: a full charge spammed stays within sensible bounds (under twice a tap, at most two rounds a second)', () => {
  const run = (n, full) => { const s = breathe(freshSave(), n); s.seed = 'CARB'; s.perception.aperture = 3255; s.farArray = { listeners: 1 }; Object.assign(s.stats, { Finesse: 30 }); ensureLattice(s); s.lattice.passives = [];
    s.equipment.secondary = normalizeItemUpgrade({ id: 'spark-coil', name: 'Spark Coil', slot: 'secondary', property: 'focus', tier: 'relic', affixes: [], basePower: 14, power: 14 + CARBINE_RANK, upgradeRank: CARBINE_RANK }); s.activeWeaponSlot = 'secondary';
    const g = new Game(s, 0); flat(g); Object.assign(g.player, { x: 3, y: 9.55, facing: 'right', hp: 1e6 }); s.lastAim = { x: 1, y: 0 }; g.enemies = [foe(8, 9.1, 'rootBrute')];
    let t = 1000, down = false, rounds = 0; const go = (secs) => { for (let i = 0; i < Math.round(secs / DT); i++) { s.rounds.loaded = 500; let press = false;
      if (!g.carbine?.charge && t >= (g.player.attackReadyAt || 0)) { press = true; down = full; } else if (down && (g.carbine?.charge?.held || 0) >= CARBINE.charge.full) down = false;
      t = frameOf(g, t, press, down, 'tool'); g.player.x = 3; g.player.y = 9.55; rounds += 500 - s.rounds.loaded; } };
    go(3); const hp = g.enemies[0].hp; rounds = 0; go(20); return { dps: (hp - g.enemies[0].hp) / 20, rounds: rounds / 20 }; };
  const tap = run(0, false); let prev = 0;
  for (const n of [0, 1, 2, 3]) { const full = run(n, true); assert.ok(full.dps > prev, `${n}: faster`); prev = full.dps; assert.ok(full.dps < 2 * tap.dps, `${n}: ${(full.dps / tap.dps).toFixed(2)}× a tap`); assert.ok(full.rounds <= 2, `${n}: ${full.rounds.toFixed(2)} rounds/s`); }
  assert.ok(Math.abs(run(3, false).dps - tap.dps) < 1e-9, 'taps unchanged');
});
