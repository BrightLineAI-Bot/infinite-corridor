// Awakened arts (Tim, 2026-11-13; weapon-arts.ts AWAKENED_ARTS, awakened-arts.ts): one awakened move per primary weapon in place
// of the shared crescent, each upgraded when the weapon's own art is selected too. Verge Cleaver: Fissure (+ Lava Slash: a lava
// crack). Fourfold Daggers: Returning blades (+ Blade Stream: a ring of blades). Cinder Pike: Lance (+ Cinder Javelin: the pike
// flies back). Iron Fists: a roundhouse kick after the uppercut (+ Ki Blast: an axe kick on landing). Salvage Blade: Spell runes
// (+ Transpose: spells cast in the seal pulse). The Quandrix Staff and the tools are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { IRON_FISTS } from '../src/brawler-spells.ts';
import { normalizeSockets } from '../src/glyphs.ts';
import { WEAPON_ARTS, AWAKENED_ARTS, AWAKENED_IDS, awakenedFor, awakenedUp, artFor, javelinInFlight } from '../src/weapon-arts.ts';
import { writeCloseViewHeroEquipment, MODEL_MAX_VERTICES, MODEL_FLOATS } from '../src/close-view-models.ts';
import { awakenedArtsState, liveAwakened, runeOn, drawAwakenedArts, awakenedSwing, awakenedArtRelease, awakenedSpellCast } from '../src/awakened-arts.ts';
import { awakenedText, awaken } from '../src/constellation.ts';
import { ensureLattice } from '../src/transit-lattice.ts';
import { snapshotSave, splitSnapshot, assembleSave } from '../src/persistence.ts';
import { decodeCloseViewHero, createHeroPoseState, createHeroFrame, sampleCloseViewHero } from '../src/close-view-hero.ts';

const M = AWAKENED_ARTS.moves, DT = .02, AWAKE = { resonance: 'wildfire', version: 1 };
const WEAPONS = {
  'verge-cleaver': () => ({ id: 'primary-verge-cleaver', name: 'Verge Cleaver', slot: 'primary', power: 10, property: 'impact', tier: 'rare', affixes: [] }),
  'cinder-pike': () => ({ id: 'primary-cinder-pike', name: 'Cinder Pike', slot: 'primary', power: 10, property: 'reach', tier: 'rare', affixes: [] }),
  'fourfold-daggers': () => ({ id: 'primary-fd-test', name: 'Fourfold Daggers', slot: 'primary', power: 10, property: 'paired', tier: 'rare', affixes: [] }),
  'iron-fists': () => ({ id: 'primary-if-test', name: 'Iron Fists', slot: 'primary', power: 10, property: 'brawler', tier: 'rare', affixes: [] }),
  'salvage-blade': () => ({ id: 'primary-sb-test', name: 'Salvage Blade', slot: 'primary', power: 10, property: 'steady', tier: 'rare', affixes: [] }),
  'quandrix-staff': () => ({ id: 'primary-qs-test', name: 'Quandrix Staff', slot: 'primary', power: 10, property: 'arcane', tier: 'rare', affixes: [] }),
};
const foe = (fx, fy, extra = {}, i = 0) => Object.assign(createCombatant('ashling', 10 + fx, 10 + fy), { id: `foe-${i}`, hp: 1e6, maxHp: 1e6, speedMultiplier: 1e-6, damage: 0, cooldown: 99, meleePatterns: [] }, extra);
function arena(move, { weapon = M[move]?.weapon || move, foes = [[3, 0]], awakened = true, passive = false } = {}) {
  const s = freshSave(); s.seed = 'AWAKENED-ARTS'; s.level = 15; s.equipment.primary = { ...WEAPONS[weapon](), ...(awakened ? { awakened: { ...AWAKE } } : {}) };
  s.perception.aperture = 3255; s.farArray = { listeners: 1 }; ensureLattice(s); s.lattice.passives = passive && M[move] ? [`field:${M[move].passive}`] : [];
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon';
  Object.assign(g.player, { x: 10, y: 10, facing: 'right', invulnerableUntil: 1e15 }); s.lastAim = { x: 1, y: 0 };
  g.enemies = foes.map(([fx, fy, extra], i) => foe(fx, fy, extra || {}, i));
  return { s, g, clock: { t: 1000 } };
}
function frame(g, clock, held = false) { g.player.invulnerableUntil = clock.t + 1e6; g.update(DT, { state: { x: 0, y: 0 }, consume: () => false, held: (k) => k === 'attack' && held }, clock.t); clock.t += DT * 1000; }
const idle = (g, clock, n) => { for (let i = 0; i < n; i++) frame(g, clock, false); };
function press(g, clock, action = null) { g.attackAction = action; try { return g.primaryAttack(clock.t, { x: 1, y: 0 }); } finally { g.attackAction = null; } }
const swings = (g, clock, n, gap = 30) => { for (let i = 0; i < n; i++) { press(g, clock); idle(g, clock, gap); } };
function charge(g, clock, seconds) { press(g, clock, 'attack'); for (let i = 0; i < Math.round((WEAPON_ARTS.hold.grace + seconds) / DT) + 1; i++) frame(g, clock, true); frame(g, clock, false); }
function spy(g) { const log = []; const own = g.artBlow.bind(g); g.artBlow = (e, amount, ...rest) => { log.push({ id: e.id, amount, t: g.lastUpdateNow }); return own(e, amount, ...rest); }; return log; }
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

test('one data table: a move for each primary but the staff, about the crescent\'s .7 a foe; the upgrades are small', () => {
  assert.deepEqual(AWAKENED_IDS, ['fissure', 'returning-blades', 'lance', 'roundhouse', 'spell-runes']);
  assert.deepEqual(AWAKENED_IDS.map((id) => M[id].weapon), ['verge-cleaver', 'fourfold-daggers', 'cinder-pike', 'iron-fists', 'salvage-blade']);
  assert.deepEqual(AWAKENED_IDS.map((id) => M[id].passive), ['lava-slash', 'blade-stream', 'cinder-javelin', 'ki-blast', 'transpose']);
  for (const id of AWAKENED_IDS) assert.equal(WEAPON_ARTS.arts[M[id].passive].weapon, M[id].weapon, `${id}: its weapon's own art`);
  assert.ok(Object.isFrozen(AWAKENED_ARTS) && Object.isFrozen(M) && AWAKENED_IDS.every((id) => Object.isFrozen(M[id]) && Object.isFrozen(M[id].up)));
  assert.equal(AWAKENED_ARTS.every, 3);
  assert.equal(M.fissure.share, .7); assert.equal(M.lance.share, .7); assert.equal(M['spell-runes'].share, .7); assert.equal(M['returning-blades'].share * 2, .7, 'a cut out and a cut back'); assert.ok(M.roundhouse.share <= .8);
  assert.ok(M.fissure.up.share * M.fissure.up.life / M.fissure.up.tick <= .4, 'the lava crack is a small bonus');
  assert.ok(M.lance.up.returnShare < 1 && M['returning-blades'].up.share < M['returning-blades'].share && M.roundhouse.up.share < 1 && M['spell-runes'].up.share < 1);
  for (const [weapon, id] of [['verge-cleaver', 'fissure'], ['fourfold-daggers', 'returning-blades'], ['cinder-pike', 'lance'], ['iron-fists', 'roundhouse'], ['salvage-blade', 'spell-runes'], ['quandrix-staff', null]]) {
    const { s } = arena(id || weapon, { weapon }); assert.equal(awakenedFor(s), id, weapon);
    assert.equal(awakenedFor(arena(id || weapon, { weapon, awakened: false }).s), null, `${weapon}: not awakened`);
    if (id) { assert.equal(awakenedUp(s, id), false, 'awakened only'); assert.equal(awakenedUp(arena(id, { passive: true }).s, id), true, 'both'); assert.equal(awakenedUp(arena(id, { passive: true, awakened: false }).s, id), false, 'the art only'); }
  }
  for (const id of AWAKENED_IDS) assert.match(awakenedText({ ...WEAPONS[M[id].weapon](), awakened: AWAKE }), new RegExp(M[id].text.slice(0, 20)));
  assert.match(awakenedText({ ...WEAPONS['quandrix-staff'](), awakened: AWAKE }), /slam/, 'the staff keeps its own');
});

test('the third swing releases the weapon\'s move (never the crescent), only when awakened', () => {
  for (const id of ['fissure', 'returning-blades', 'lance', 'spell-runes']) {
    const foes = id === 'spell-runes' ? [[1.2, 0]] : [[3, 0]];
    for (const awakened of [true, false]) {
      const { g, clock } = arena(id, { awakened, foes }); swings(g, clock, 2);
      const live = () => { const n = liveAwakened(g); return n.fissures + n.blades + n.lances + n.runes; };
      assert.equal(live(), 0, `${id}: not on the first two`);
      press(g, clock); frame(g, clock);
      assert.equal(live() > 0, awakened, `${id} awakened=${awakened}: the third swing`);
      assert.equal(g.projectiles.some((p) => p.crescent), false, `${id}: no crescent`);
      if (awakened) assert.equal(g.player.attackVisual?.awakenedArt, id, 'the third swing wears the move\'s pose');
      idle(g, clock, Math.round((M['spell-runes'].life + 1) / DT)); swings(g, clock, 2); assert.equal(live(), 0, `${id}: nothing until the sixth`); press(g, clock); frame(g, clock); assert.equal(live() > 0, awakened, `${id}: the sixth`);
    }
  }
  { const { g, clock } = arena('returning-blades', { foes: [] }); for (let i = 0; i < 2; i++) { press(g, clock); idle(g, clock, 30); }
    press(g, clock); idle(g, clock, 2); assert.equal(liveAwakened(g).blades, 1, 'the daggers\' second cut is no swing'); }
});

test('Fissure: a crack along the aim that erupts a beat later on every foe on it; walls stop it', () => {
  const { g, clock } = arena('fissure', { foes: [[3, 0], [4.3, .3], [3, 1.6], [6, 0]] }), log = spy(g), hit = g.meleePower();
  swings(g, clock, 2); press(g, clock); const t0 = clock.t;
  for (let i = 0; i < 12; i++) frame(g, clock); assert.equal(log.length, 0, 'not yet');
  idle(g, clock, 10); const struck = log.map((q) => q.id).sort(); assert.deepEqual(struck, ['foe-0', 'foe-1'], 'along the line, not beside it nor past its end');
  assert.ok(log[0].t - t0 >= M.fissure.delay * 1000 - DT * 1000 - 1e-6, 'a beat later');
  for (const q of log) assert.ok(near(q.amount, hit * M.fissure.share), `${q.amount} vs ${hit * .7}`);
  idle(g, clock, 200); assert.equal(log.length, 2, 'once, and no lava without Lava Slash'); assert.equal(liveAwakened(g).fissures, 0);
  { const { g, clock } = arena('fissure', { foes: [[4, 0]] }), log = spy(g); g.map.tiles[10 * 32 + 12] = { x: 12, y: 10, kind: 'wall', blocked: true };
    swings(g, clock, 3); idle(g, clock, 30); assert.equal(log.length, 0, 'the wall stops the crack'); }
});

test('Fissure with Lava Slash: a burning crack for 3 s that strikes foes on it; without the awakening, no fissure at all', () => {
  const { g, clock } = arena('fissure', { foes: [[3, 0]], passive: true }), log = spy(g), hit = g.meleePower(), U = M.fissure.up;
  swings(g, clock, 2); press(g, clock); idle(g, clock, 20); assert.equal(log.length, 1, 'the eruption');
  idle(g, clock, Math.round((U.life + .3) / DT)); const ticks = log.slice(1);
  assert.equal(ticks.length, Math.round(U.life / U.tick), 'a tick each half second'); for (const q of ticks) assert.ok(near(q.amount, hit * U.share));
  assert.equal(liveAwakened(g).fissures, 0, 'it cools');
  const { g: g2, clock: c2 } = arena('fissure', { foes: [[3, 0]], passive: true, awakened: false }); swings(g2, c2, 3); assert.equal(liveAwakened(g2).fissures, 0); assert.equal(g2.awakenedArts, undefined);
});

test('Returning blades: out four tiles and back to the hand, each foe cut going and coming; with Blade Stream a ring follows the burst', () => {
  const { g, clock } = arena('returning-blades', { foes: [[3, 0], [5.5, 0]] }), log = spy(g), hit = g.meleePower();
  swings(g, clock, 2); press(g, clock); idle(g, clock, 120);
  const a = log.filter((q) => q.id === 'foe-0'); assert.equal(a.length, 2, 'out and back'); for (const q of a) assert.ok(near(q.amount, hit * M['returning-blades'].share));
  assert.equal(log.filter((q) => q.id === 'foe-1').length, 0, 'beyond the throw'); assert.equal(liveAwakened(g).blades, 0, 'back in hand');
  for (const [awakened, passive, want] of [[true, true, M['returning-blades'].up.count], [false, true, 0]]) {
    const { g, clock } = arena('returning-blades', { foes: [], awakened, passive }); swings(g, clock, 3); idle(g, clock, 120);
    charge(g, clock, 1.15); assert.equal(liveAwakened(g).blades, want, `awakened=${awakened}: the ring`); idle(g, clock, 150); assert.equal(liveAwakened(g).blades, 0);
  }
  const { g: g3, clock: c3 } = arena('returning-blades', { foes: [[1.25, 2.1], [-2.5, 0]], passive: true }), l3 = spy(g3); swings(g3, c3, 3); idle(g3, c3, 120); l3.length = 0;
  charge(g3, c3, 1.15); idle(g3, c3, 150); assert.ok(l3.some((q) => q.id === 'foe-0' && near(q.amount, g3.artPower(c3.t) * M['returning-blades'].up.share, 1e-3)), 'the ring cuts all round');
});

test('Lance: a line of cinder light six tiles along the aim strikes every foe on it at once', () => {
  const { g, clock } = arena('lance', { foes: [[3, 0], [5.8, .2], [7.5, 0], [3, 1.5]] }), log = spy(g), hit = g.meleePower();
  swings(g, clock, 2); log.length = 0; press(g, clock); assert.deepEqual(log.map((q) => q.id).sort(), ['foe-0', 'foe-1']); for (const q of log) assert.ok(near(q.amount, hit * M.lance.share));
  idle(g, clock, 40); assert.equal(liveAwakened(g).lances, 0, 'the light fades');
});

test('Cinder Javelin with the awakened Lance: the pike flies back to the hand and strikes again, only with both', () => {
  for (const [awakened, want] of [[true, 2], [false, 1]]) {
    const { g, clock } = arena('lance', { foes: [[4, 0]], passive: true, awakened }); swings(g, clock, 3); idle(g, clock, 60); const log = spy(g);
    charge(g, clock, 1.15); idle(g, clock, 120); const own = log.filter((q) => q.id === 'foe-0');
    assert.equal(own.length, want, `awakened=${awakened}`); if (want === 2) assert.ok(near(own[1].amount / own[0].amount, M.lance.up.returnShare), 'the return is a share of the throw');
    assert.equal(g.weaponArts.shots.filter((s) => s.on).length, 0, 'back in hand');
  }
});

test('Iron Fists: awakened, a fourth press after the uppercut is a roundhouse kick all round; never without the awakening', () => {
  for (const awakened of [true, false]) {
    const { g, clock } = arena('roundhouse', { foes: [[1.2, 0], [-1.2, 0], [0, 1.2], [3.5, 0]], awakened }), log = spy(g);
    for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 8); }
    assert.equal(g.fistCombo?.step ?? null, awakened ? 3 : null, 'the uppercut leaves the window open only when awakened');
    [[1.2, 0], [-1.2, 0], [0, 1.2], [3.5, 0]].forEach(([dx, dy], i) => Object.assign(g.enemies[i], { x: g.player.x + dx, y: g.player.y + dy })); log.length = 0; // round her where the combo left her
    press(g, clock); idle(g, clock, 2);
    if (awakened) { assert.deepEqual(log.map((q) => q.id).sort(), ['foe-0', 'foe-1', 'foe-2'], 'all round, not the far foe'); for (const q of log) assert.ok(near(q.amount, g.fistPower() * M.roundhouse.share));
      assert.equal(g.fistCombo, null); assert.ok(g.fistRecoverUntil > clock.t - 100, 'then it recovers'); assert.equal(g.player.attackVisual.awakenedArt, 'roundhouse'); assert.match(g.message, /Roundhouse/); }
    else { assert.equal(log.length, 0); assert.doesNotMatch(g.message, /Roundhouse/); assert.equal(g.awakenedArts, undefined, 'the uppercut ends the combo as ever'); }
  }
  // the punches themselves are unchanged
  const { g, clock } = arena('roundhouse', { foes: [[1.2, 0]] }); const hp0 = g.enemies[0].hp; press(g, clock); idle(g, clock, 2); assert.ok(g.enemies[0].hp < hp0); assert.equal(g.fistCombo.step, 1);
  // the kick press counts toward arming Ki Blast
  { const { g, clock } = arena('roundhouse', { foes: [[1.2, 0]], passive: true }); press(g, clock); idle(g, clock, 8); press(g, clock); idle(g, clock, 8);
    assert.equal(g.weaponArts.presses, 2); assert.equal(g.weaponArts.armed, false); press(g, clock); idle(g, clock, 8); assert.equal(g.weaponArts.armed, true, 'the uppercut arms it'); }
  { const { g, clock } = arena('roundhouse', { foes: [[1.2, 0]], passive: true }); g.weaponArts = undefined; press(g, clock); idle(g, clock, 8); press(g, clock); idle(g, clock, 8);
    g.weaponArts.presses = 1; press(g, clock); idle(g, clock, 8); assert.equal(g.weaponArts.presses, 2); // tap the uppercut
    press(g, clock); frame(g, clock, false); idle(g, clock, 4); assert.equal(g.weaponArts.presses, 3, 'the kick is a press'); }
});

test('Ki Blast with the awakened Iron Fists: the airborne blast ends with an axe kick where she lands; only with both', () => {
  for (const awakened of [true, false]) {
    const { g, clock } = arena('roundhouse', { foes: [[1, .2], [6, 0]], passive: true, awakened }); for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 40); }
    idle(g, clock, 40); press(g, clock); idle(g, clock, 5); press(g, clock); idle(g, clock, 5); // the dash punch and jab: the uppercut is next
    const log = spy(g); charge(g, clock, 1.15); const air = clock.t < g.jumpUntil;
    assert.equal(air, true, 'the uppercut blast pops her up'); assert.equal(liveAwakened(g).axes, awakened ? 1 : 0);
    idle(g, clock, 80); const axe = log.filter((q) => q.id === 'foe-0' && near(q.amount, g.artPower(clock.t) * M.roundhouse.up.share, 1e-3));
    assert.equal(axe.length, awakened ? 1 : 0, `awakened=${awakened}: the axe kick`); assert.equal(liveAwakened(g).axes, 0);
    if (awakened) assert.match(g.message, /Axe kick/);
  }
});

test('Spell runes: the third swing runes the nearest struck foe (unruned first); a spell that strikes one detonates it; one a foe; they fade', () => {
  const { g, clock } = arena('spell-runes', { foes: [[1.2, 0], [1.2, .5]] }), hit = g.meleePower(); swings(g, clock, 2); press(g, clock);
  // Tim, 2026-11-13: one rune a third swing, on the nearest struck foe not yet runed; all runed: the nearest is refreshed
  assert.equal(runeOn(g, g.enemies[0]), true, 'the nearest'); assert.equal(runeOn(g, g.enemies[1]), false, 'one a swing'); assert.equal(liveAwakened(g).runes, 1);
  idle(g, clock, 30); swings(g, clock, 2); press(g, clock); assert.equal(runeOn(g, g.enemies[1]), true, 'the next unruned foe'); assert.equal(liveAwakened(g).runes, 2);
  idle(g, clock, 30); swings(g, clock, 2); press(g, clock); assert.equal(liveAwakened(g).runes, 2, 'one rune a foe: a new mark refreshes it');
  const log = spy(g); const [a] = g.enemies;
  g.effects.push({ id: 'test-spell', kind: 'test', x: a.x + .5, y: a.y + .45, life: .3, radius: .3, pulse: 99, untilPulse: 0, damage: 1, pulseIndex: 0, hits: {}, glyphHost: 'spell', glyphSpell: 'ember-ring' });
  idle(g, clock, 3); assert.equal(runeOn(g, a), false, 'detonated'); assert.ok(log.length >= 1 && log.every((q) => near(q.amount, hit * M['spell-runes'].share)), 'the burst');
  assert.ok(log.some((q) => q.id === 'foe-0'));
  // a swing (not a spell) does not detonate one; the rune fades after its life; a foe gone drops it
  const { g: g2, clock: c2 } = arena('spell-runes', { foes: [[1.2, 0]] }); swings(g2, c2, 3); const l2 = spy(g2); press(g2, c2); idle(g2, c2, 20); assert.equal(l2.length, 0); assert.equal(runeOn(g2, g2.enemies[0]), true);
  idle(g2, c2, Math.round(M['spell-runes'].life / DT)); assert.equal(runeOn(g2, g2.enemies[0]), false, 'faded');
  const { g: g3, clock: c3 } = arena('spell-runes', { foes: [[1.2, 0]] }); swings(g3, c3, 3); assert.equal(liveAwakened(g3).runes, 1); g3.enemies[0].dead = true; idle(g3, c3, 1); assert.equal(liveAwakened(g3).runes, 0);
  // not awakened: no runes, and spells strike as ever
  const { g: g4, clock: c4 } = arena('spell-runes', { foes: [[1.2, 0]], awakened: false }); swings(g4, c4, 3); assert.equal(g4.awakenedArts, undefined);
});

test('Transpose with the awakened Salvage Blade: each spell cast in the seal pulses from it; only with both', () => {
  for (const awakened of [true, false]) {
    const { s, g, clock } = arena('spell-runes', { foes: [[1.4, 0]], passive: true, awakened }); swings(g, clock, 3); idle(g, clock, 40); charge(g, clock, .5);
    assert.equal(g.weaponArts.seal.on, true); idle(g, clock, 5); const log = spy(g);
    s.magicSkills = { ...(s.magicSkills || {}), cooldowns: {} }; g.spellCooldownRemaining = 0; const cast = g.castSpell('ember-ring'); assert.ok(cast, 'cast');
    idle(g, clock, 2); const pulse = log.filter((q) => near(q.amount, g.artPower(clock.t) * M['spell-runes'].up.share, 1e-3));
    assert.equal(pulse.length, awakened ? 1 : 0, `awakened=${awakened}`);
    if (awakened) { const t1 = clock.t + 1000; assert.equal(awakenedSpellCast(g, t1), true); idle(g, clock, 1); assert.equal(awakenedSpellCast(g, t1 + 10), false, 'one a gap'); g.player.x += 4; assert.equal(awakenedSpellCast(g, t1 + 2000), false, 'outside the seal: none'); }
  }
});

test('foes that hold their ground take the awakened blows but are never knocked', () => {
  const { g, clock } = arena('roundhouse', { foes: [[1.2, 0], [-1.2, 0, { boss: true }], [0, 1.2, { eliteId: 'x' }]] }), at = g.enemies.map((e) => [e.x, e.y]), log = spy(g);
  for (let i = 0; i < 3; i++) { press(g, clock); idle(g, clock, 8); }
  [[1.2, 0], [-1.2, 0], [0, 1.2]].forEach(([dx, dy], i) => Object.assign(g.enemies[i], { x: g.player.x + dx, y: g.player.y + dy })); at.splice(0, 3, ...g.enemies.map((e) => [e.x, e.y])); log.length = 0;
  press(g, clock); idle(g, clock, 8);
  assert.ok(log.some((q) => q.id === 'foe-1') && log.some((q) => q.id === 'foe-2'), 'struck');
  assert.ok(Math.hypot(g.enemies[0].x - at[0][0], g.enemies[0].y - at[0][1]) > .2, 'the ordinary foe is thrown');
  for (const i of [1, 2]) assert.ok(Math.hypot(g.enemies[i].x - at[i][0], g.enemies[i].y - at[i][1]) < 1e-4, 'anchored');
  const { g: g2, clock: c2 } = arena('fissure', { foes: [[3, 0, { worldBeast: true }]] }); const x0 = g2.enemies[0].x; swings(g2, c2, 3); idle(g2, c2, 30); assert.ok(g2.enemies[0].hp < 1e6); assert.ok(Math.abs(g2.enemies[0].x - x0) < 1e-4, 'not knocked');
});

test('runtime only: a reload drops everything in play; a new area drops it too', () => {
  const { s, g, clock } = arena('fissure', { foes: [[3, 0]], passive: true }); swings(g, clock, 2); press(g, clock); idle(g, clock, 20); assert.equal(liveAwakened(g).fissures, 1, 'the lava');
  const save = assembleSave(...Object.values(splitSnapshot(snapshotSave(s)))), back = new Game(save, clock.t);
  assert.equal(back.awakenedArts, undefined); assert.equal(JSON.stringify(save).includes('awakenedArts'), false); assert.equal(JSON.stringify(save).includes('awakenSwings'), false);
  assert.deepEqual(save.equipment.primary.awakened, AWAKE, 'the awakening itself is kept');
  g.area = 'overworld'; frame(g, clock); assert.deepEqual(liveAwakened(g), { fissures: 0, blades: 0, lances: 0, runes: 0, axes: 0 });
});

test('the Quandrix Staff and the tools are untouched', () => {
  const { s, g, clock } = arena('quandrix-staff', { weapon: 'quandrix-staff' }); assert.equal(awakenedFor(s), null);
  for (let i = 0; i < 6; i++) { press(g, clock); idle(g, clock, 30); } assert.equal(g.awakenedArts, undefined); assert.equal(g.projectiles.some((p) => p.crescent), false);
  assert.equal(awakenedSwing(g, clock.t, { x: 1, y: 0 }, 10, []), false, 'no move of its own here');
  const { s: s2, g: g2 } = arena('lance'); s2.equipment.secondary = normalizeSockets({ id: 'secondary-needle-caster', name: 'Needle Caster', slot: 'secondary', power: 4, property: 'quick', tier: 'rare', affixes: [], awakened: { resonance: 'wildfire' } });
  const before = g2.projectiles.length; g2.fireSecondary(5000, { x: 1, y: 0 }); assert.equal(g2.projectiles.length - before, 3, 'an awakened tool still fans three'); assert.equal(g2.awakenedArts, undefined);
  assert.equal(awakenedArtRelease(g2, 'lava-slash', 0), false);
  // awakening a weapon names its move
  const s3 = freshSave(); s3.equipment.primary = normalizeSockets({ ...WEAPONS['cinder-pike'](), upgradeRank: 4, glyphs: ['ignite', 'chain'] }); s3.materials.lumenDust = 999;
  const r = awaken(s3, 'primary'); if (r.ok) assert.match(r.message, /Lance/);
});

test('bounded: 60 s of every move fired every frame (cooldowns wiped) keeps the pools and the game\'s lists fixed and finite', () => {
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => { o[k] = v; return true; } }), toScreen = (q) => [q.x * 32, q.y * 32];
  for (const id of AWAKENED_IDS) {
    const { g, clock } = arena(id, { foes: Array.from({ length: 10 }, (_, i) => [1 + (i % 5), (i >> 1) % 3 - 1]), passive: true }); g.presentation = { reduceMotion: id === 'lance' };
    swings(g, clock, 3); const K = awakenedArtsState(g);
    const sizes = () => Object.fromEntries(['fissures', 'blades', 'lances', 'runes', 'axes', 'flashes'].map((k) => [k, K[k].length]));
    const at = sizes(); g.weaponArts ||= undefined;
    for (let i = 0; i < 60 / DT; i++) {
      const t = clock.t;
      if (id === 'roundhouse') { g.fistCombo = { step: IRON_FISTS.punches.length, until: t + 900, landed: [], lead: 'right' }; g.fistRecoverUntil = 0; g.awakenedKick(t, { x: 1, y: 0 }); g.jumpUntil = t + 300; awakenedArtRelease(g, 'ki-blast', t, true); }
      else { awakenedSwing(g, t, { x: Math.cos(i * .1), y: Math.sin(i * .1) }, 10, g.enemies); if (id === 'returning-blades') awakenedArtRelease(g, 'blade-stream', t); }
      if (id === 'spell-runes') { g.weaponArts ||= { seal: null }; if (g.weaponArts.seal) Object.assign(g.weaponArts.seal, { on: true, x: g.player.x + .5, y: g.player.y + .45, left: 5 }); awakenedSpellCast(g, t);
        g.effects.push({ id: `spell-${i}`, kind: 'test', x: g.player.x + 1.7, y: g.player.y + .45, life: .05, radius: 3, pulse: 99, untilPulse: 0, damage: 1, pulseIndex: 0, hits: {}, glyphHost: 'spell', glyphSpell: 'ember-ring' }); }
      frame(g, clock); drawAwakenedArts(ctx, g, toScreen, 32, clock.t / 1000);
      for (const e of g.enemies) { e.hp = 1e6; e.dead = false; e.x = Math.min(Math.max(e.x, 3), 28); e.y = Math.min(Math.max(e.y, 3), 28); }
      Object.assign(g.player, { x: 10, y: 10, hp: Math.max(1, g.player.hp) });
    }
    assert.deepEqual(sizes(), at, `${id}: the pools never grow`);
    for (const b of K.blades) assert.equal(b.hit.length, AWAKENED_ARTS.pools.hits);
    assert.ok([g.player.x, g.player.y, ...g.enemies.flatMap((e) => [e.x, e.y, e.hp])].every(Number.isFinite), `${id}: finite`);
    assert.ok(g.effects.length < 200 && g.projectiles.length < 100, `${id}: the game's own lists stay bounded (${g.effects.length}, ${g.projectiles.length})`);
    assert.ok(artFor(g.save) === M[id].passive);
  }
});

const meta = JSON.parse(fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.json', import.meta.url), 'utf8')), raw = fs.readFileSync(new URL('../assets/wayfarer/rogue-v2.bin', import.meta.url)), asset = decodeCloseViewHero(meta, raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
test('Close View: every awakened pose is finite, moves the body and returns to the carry at both ends; the kicks lift the right foot', () => {
  const sample = (heldProfile, action, reducedMotion = false) => { const st = createHeroPoseState(asset), f = createHeroFrame(asset); assert.ok(sampleCloseViewHero(asset, st, { nowMs: 2000, reducedMotion, x: 0, y: 0, groundZ: 0, liftZ: 0, yaw: 0, height: 1.3776, speed: 0, gaitPhase: 0, heldProfile, handProfile: heldProfile, action, alpha: 1, tint: [1, 1, 1], hitFlash: 0 }, f)); return { st, f }; };
  const cases = { fissure: ['verge-cleaver', 'verge-cleaver'], 'returning-blades': ['salvage-blade', 'melee'], lance: ['cinder-pike', 'cinder-pike'], 'spell-runes': ['salvage-blade', 'melee'], roundhouse: [null, 'fist'], 'axe-kick': [null, 'fist'] };
  for (const [art, [held, profile]] of Object.entries(cases)) for (const reducedMotion of [false, true]) {
    const act = (phase, extra = {}) => ({ kind: 'melee', profile, awakenedArt: art, phase, durationMs: 420, poseMs: 2000, fistStep: 3, fistLead: 'right', ...extra });
    const plain = (phase) => sample(held, { ...act(phase), awakenedArt: undefined }, reducedMotion).f;
    let moved = 0;
    for (const phase of [0, .15, .3, .45, .6, .8, 1]) { const a = sample(held, act(phase), reducedMotion);
      assert.ok(a.f.positionsNormals.every(Number.isFinite), `${art} ${phase}`); if (phase > 0 && phase < 1) assert.equal(a.st.clip, `derived-${art}`);
      const b = plain(phase); let d = 0; for (let i = 0; i < a.f.positionsNormals.length; i += 6) d = Math.max(d, Math.hypot(a.f.positionsNormals[i] - b.positionsNormals[i], a.f.positionsNormals[i + 1] - b.positionsNormals[i + 1], a.f.positionsNormals[i + 2] - b.positionsNormals[i + 2])); moved = Math.max(moved, d); }
    assert.ok(moved > .05, `${art} reduced=${reducedMotion}: the pose shows (${moved.toFixed(3)})`);
    for (const phase of [0, 1]) { const a = sample(held, act(phase), reducedMotion).f, b = plain(phase); for (let i = 0; i < a.positionsNormals.length; i++) assert.ok(Math.abs(a.positionsNormals[i] - b.positionsNormals[i]) < 1e-6, `${art} at ${phase}: the record's own pose`); }
  }
  // the kicks raise a foot: fewer of the body's points stay down at the floor
  const low = (f) => { let n = 0; for (let i = 0; i < f.positionsNormals.length; i += 6) if (f.positionsNormals[i + 2] < .08) n++; return n; };
  for (const [art, phase] of [['roundhouse', .45], ['axe-kick', .3]]) { const { f } = sample(null, { kind: 'melee', profile: 'fist', awakenedArt: art, phase, durationMs: 420, poseMs: 2000, fistStep: 3, fistLead: 'right' }, true), still = sample(null, null).f;
    assert.ok(low(f) < low(still) * .8, `${art}: a foot leaves the floor (${low(f)} vs ${low(still)})`); }
});

test('the pike leaves her hands while the Cinder Javelin flies, its way home included, and is back when it lands', () => {
  for (const awakened of [true, false]) {
    const { g, clock } = arena('lance', { foes: [[4, 0]], passive: true, awakened }); swings(g, clock, 3); idle(g, clock, 60);
    assert.equal(javelinInFlight(g), false, 'in hand while armed');
    press(g, clock, 'attack'); for (let i = 0; i < Math.round((WEAPON_ARTS.hold.grace + 1.15) / DT) + 1; i++) frame(g, clock, true); frame(g, clock, false);
    assert.equal(javelinInFlight(g), false, 'still in hand through the wind-up');
    let flew = 0, home = 0; for (let i = 0; i < 150; i++) { frame(g, clock); if (javelinInFlight(g)) { flew++; if (g.weaponArts.shots.some((s) => s.on && s.back)) home++; } }
    assert.ok(flew > 0, 'gone while it flies'); assert.equal(home > 0, awakened, 'the return leg counts as flight'); assert.equal(javelinInFlight(g), false, 'back in hand');
    g.weaponArts.shots[0].on = true; g.weaponArts.shots[0].kind = 'javelin'; g.weaponArts.pikeOut = true; g.weaponArts.artRecord = g.player.attackVisual; assert.equal(javelinInFlight(g), true); g.area = 'overworld'; frame(g, clock); assert.equal(javelinInFlight(g), false, 'a new area: back in hand');
  }
  // Close View blanks the held pike's gear while it flies (an empty gear profile draws no weapon)
  const src = fs.readFileSync(new URL('../src/close-view.ts', import.meta.url), 'utf8');
  assert.match(src, /gear\.profile==='cinder-pike'&&javelinInFlight\(g\)\)gear\.profile=''/);
  const sock = new Float64Array(16); sock[0] = sock[5] = sock[10] = sock[15] = 1;
  const out = new Float32Array(MODEL_MAX_VERTICES * MODEL_FLOATS);
  assert.ok(writeCloseViewHeroEquipment(out, 0, { profile: 'cinder-pike', rightSocket: sock, leftSocket: sock }, {}) > 0, 'the pike in hand');
  assert.equal(writeCloseViewHeroEquipment(out, 0, { profile: '', rightSocket: sock, leftSocket: sock }, {}), 0, 'none while it flies');
});

test('the throw can be cancelled at any time after the release: free at once, the pike back in hand, the javelin flies on and its return still strikes', () => {
  for (const cancel of ['dodge', 'attack']) {
    const { g, clock } = arena('lance', { foes: [[5, 0]], passive: true }); swings(g, clock, 3); idle(g, clock, 60); const log = spy(g);
    press(g, clock, 'attack'); for (let i = 0; i < Math.round((WEAPON_ARTS.hold.grace + 1.15) / DT) + 1; i++) frame(g, clock, true); frame(g, clock, false);
    while (!javelinInFlight(g)) frame(g, clock); frame(g, clock); assert.equal(javelinInFlight(g), true, 'thrown');
    if (cancel === 'dodge') { let used = false; g.player.stamina = 1e6; g.update(DT, { state: { x: 0, y: 1 }, consume: (k) => k === 'dodge' && !used && (used = true), held: () => false }, clock.t); clock.t += DT * 1000;
      assert.ok(g.player.dodgeUntil > clock.t - DT * 1000, 'the dodge was taken at once'); frame(g, clock); }
    else { const before = g.player.attackVisual; press(g, clock); assert.notEqual(g.player.attackVisual, before, 'the next attack swings at once'); frame(g, clock); }
    assert.equal(javelinInFlight(g), false, `${cancel}: the pike is back in her hands`);
    assert.ok(g.weaponArts.shots.some((s) => s.on && s.kind === 'javelin'), 'the javelin flies on');
    idle(g, clock, 150); const own = log.filter((q) => q.id === 'foe-0' && q.amount > 30);
    assert.equal(own.length, 2, `${cancel}: the throw and its return both strike (${JSON.stringify(log)})`); assert.equal(g.weaponArts.shots.filter((s) => s.on).length, 0);
  }
});
