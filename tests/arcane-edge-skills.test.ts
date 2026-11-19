// Arcane Edge on skills (Tim, 2026-11-19; src/hit-cast-passives.ts ARCANE_EDGE, edgeArm; game.ts activateApertureSkill): using an
// Aperture skill (movement skills too) arms Arcane Edge with the skill's own element, exactly as a spell does. Skills arm only
// Arcane Edge: never Casting Wind, Glyph Mine's sigil, Echoing Cast or the Echo "spell" event. Rift Step arms once a step taken,
// never on arming its aim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { APERTURE_SKILLS } from '../src/items.ts';
import { CASTABLES } from '../src/spell-slots.ts';
import { BRANCHES, learnRank, learnMod, chooseCap } from '../src/constellation.ts';
import { ARCANE_EDGE, PASSIVE_TEXT, edgeCharges, glyphMinesOf } from '../src/hit-cast-passives.ts';

const SKILLS = [['form', 'ember-form'], ['motion', 'quickening'], ['veil', 'veil-guard'], ['force', 'force-channel'], ['motion', 'aerial-step'], ['rift', 'rift-step']];
// Every branch mastered with its modifier; Aerial Step and Fold taken; the on-cast nodes in `nodes`.
function arena({ nodes = ['arcane-edge'] } = {}) {
  const s = freshSave(); s.seed = 'EDGE-SKILLS'; s.perception.aperture = 900; s.materials.lumenDust = 50;
  for (const b of ['form', 'motion', 'veil', 'force', 'rift']) {
    for (let i = 0; i < APERTURE_SKILLS[BRANCHES[b].active].maxRank; i++) assert.equal(learnRank(s, b).ok, true, b);
    assert.equal(learnMod(s, b).ok, true);
  }
  assert.equal(chooseCap(s, 'motion', 'aerial-step').ok, true); assert.equal(chooseCap(s, 'rift', 'fold').ok, true);
  for (const id of nodes) s.constellation.mods[id] = true;
  const g = new Game(s, 0);
  g.map = { ...g.map, width: 32, height: 32, exits: null, objects: [], enemySpawns: [], tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'ash', blocked: false })) };
  g.area = 'dungeon'; Object.assign(g.player, { x: 6, y: 6, facing: 'right', hp: 100, stamina: 20 }); s.maxHp = 100; s.maxStamina = 100; s.lastAim = { x: 1, y: 0 }; g.player.lastMoveVector = { x: 1, y: 0 };
  g.enemies = [Object.assign(createCombatant('rootBrute', 20, 20), { id: 'foe-0', hp: 50000, maxHp: 50000, damage: 0, cooldown: 99, speed: 0 })];
  g.lastUpdateNow = 1000;
  return { s, g, e: g.enemies[0] };
}

test('each skill arms Arcane Edge with its own element', () => {
  const want = { 'ember-form': 'fire', quickening: 'wind', 'veil-guard': 'ward', 'force-channel': 'force', 'aerial-step': 'wind', 'rift-step': 'rift' };
  for (const [, id] of SKILLS) {
    const { g } = arena(); assert.equal(CASTABLES[`skill:${id}`].attr, want[id]);
    assert.equal(edgeCharges(g), null, 'nothing before');
    assert.equal(g.activateApertureSkill(id), true, id);
    assert.deepEqual(edgeCharges(g), { n: ARCANE_EDGE.hits, el: want[id] }, id);
  }
  // without the node, nothing
  const { g } = arena({ nodes: [] }); assert.equal(g.activateApertureSkill('ember-form'), true); assert.equal(edgeCharges(g), null);
  // a skill refused (on cooldown) arms nothing
  const { g: g2 } = arena(); g2.save.magicSkills.cooldowns['veil-guard'] = 5; assert.equal(g2.activateApertureSkill('veil-guard'), false); assert.equal(edgeCharges(g2), null);
});

test('the skill\'s element rides the melee hit (Ember Form: a burn); charges do not expire', () => {
  const { g, e } = arena(); e.x = 7; e.y = 6;
  g.activateApertureSkill('ember-form');
  for (let i = 0; i < 600; i++) g.update(1 / 60, { state: { x: 0, y: 0 }, consume: () => false, held: () => false }, 1000 + i * 1000 / 60);
  assert.equal(edgeCharges(g)?.n, ARCANE_EDGE.hits, 'still armed 10 s later');
  const b = e.hp; g.landHit(e, 100, 20000, 'melee');
  assert.ok(b - e.hp >= Math.round(100 * ARCANE_EDGE.bonus), 'the bonus'); assert.ok(e.glyphBurn?.until > 20000, 'Fire burns');
  assert.equal(edgeCharges(g).n, ARCANE_EDGE.hits - 1, 'a charge spent');
});

test('Rift Step arms once a step actually taken, never on arming the aim', () => {
  const { g, e } = arena(); e.x = 7; e.y = 6;
  // hold: arms the aim, not cast
  assert.equal(g.aimRiftStep(1000), false); assert.ok(g.riftAimArmed(), 'aim armed'); assert.equal(edgeCharges(g), null, 'arming the aim arms nothing');
  // press again: the plain step
  assert.equal(g.activateApertureSkill('rift-step'), true); assert.deepEqual(edgeCharges(g), { n: ARCANE_EDGE.hits, el: 'rift' });
  // spend one, arm the aim again: still two
  g.landHit(e, 50, 2000, 'melee'); assert.equal(edgeCharges(g).n, ARCANE_EDGE.hits - 1);
  g.lastUpdateNow = 2100; assert.equal(g.aimRiftStep(2100), false); assert.equal(edgeCharges(g).n, ARCANE_EDGE.hits - 1, 'the aim does not re-arm');
  // the aimed step (a tap on the world) arms it again
  const p = g.player; assert.equal(g.placeRiftAim(p.x + .5 + 1.5, p.y + .75, 2100), true); assert.equal(g.riftAimMark.ok, true, 'stepped');
  assert.equal(edgeCharges(g).n, ARCANE_EDGE.hits, 'one step, one arming');
  // no charges left: refused, nothing armed
  g.landHit(e, 50, 3000, 'melee'); assert.equal(g.save.magicSkills.riftCharges, 0);
  assert.equal(g.activateApertureSkill('rift-step'), false); assert.equal(edgeCharges(g).n, ARCANE_EDGE.hits - 1);
});

test('Aerial Step arms it (each charge used)', () => {
  const { g, e } = arena(); e.x = 7; e.y = 6;
  assert.equal(g.activateApertureSkill('aerial-step'), true); assert.deepEqual(edgeCharges(g), { n: ARCANE_EDGE.hits, el: 'wind' });
});

test('skills trigger only Arcane Edge: not Casting Wind, Glyph Mine, Echoing Cast or the Echo spell event', () => {
  for (const [, id] of SKILLS) {
    const { g } = arena({ nodes: ['arcane-edge', 'casting-wind', 'glyph-mine', 'echoing-cast'] });
    let spellEvents = 0; const real = g.passiveCast.bind(g); g.passiveCast = (...a) => { spellEvents++; return real(...a); };
    const stamina = g.player.stamina;
    for (let k = 0; k < 4; k++) { g.save.magicSkills.cooldowns[id] = 0; g.save.magicSkills.riftCharges = 2; g.save.magicSkills.aerialCharges = 1; g.aerialCasts = 0; g.save.magicSkills.active = null; g.activateApertureSkill(id); }
    assert.equal(spellEvents, 0, `${id}: no Echo spell event`);
    assert.equal(g.player.stamina, stamina, `${id}: no Casting Wind`);
    assert.equal(glyphMinesOf(g).length, 0, `${id}: no Glyph Mine sigil`);
    assert.equal(g._hcp?.casts || 0, 0, `${id}: Echoing Cast does not count it`); assert.equal(g._hcp?.echoDue || false, false);
    assert.ok(edgeCharges(g), `${id}: Arcane Edge armed`);
  }
  // a spell still does all four
  const { g } = arena({ nodes: ['arcane-edge', 'casting-wind', 'glyph-mine', 'echoing-cast'] }); g.player.stamina = 0; g.passiveCast(1000);
  assert.ok(g.player.stamina > 0); assert.equal(glyphMinesOf(g).length, 1); assert.equal(g._hcp.casts, 1);
});

test('text: spells or skills, and the charges wait', () => {
  assert.match(PASSIVE_TEXT['arcane-edge'], /Casting a spell or using a skill/); assert.match(PASSIVE_TEXT['arcane-edge'], /wait until you use them/);
  for (const k of ['casting-wind', 'echoing-cast', 'glyph-mine']) assert.doesNotMatch(PASSIVE_TEXT[k], /\bcast\b/, k);
  assert.match(PASSIVE_TEXT['glyph-mine'], /Rift Step/);
  assert.match(PASSIVE_TEXT['pocket-time'], /Aerial Step/);
});

test('stress: every skill used with cooldowns wiped every frame for 60 s: no NaN, bounded', () => {
  const { g, e } = arena({ nodes: ['arcane-edge', 'casting-wind', 'glyph-mine', 'echoing-cast', 'pocket-time'] }); e.x = 8; e.y = 6; e.hp = e.maxHp = 1e9;
  const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false }; let t = 1000;
  for (let f = 0; f < 3600; f++) {
    t += 1000 / 60; const st = g.save.magicSkills; for (const k of Object.keys(st.cooldowns)) st.cooldowns[k] = 0; st.riftCharges = 2; st.aerialCharges = 1; g.aerialCasts = 0;
    Object.assign(g.player, { x: 6, y: 6, hp: 100 }); g.lastUpdateNow = t;
    g.activateApertureSkill(SKILLS[f % SKILLS.length][1]); if (f % 3 === 0) g.landHit(e, 10, t, 'melee');
    g.update(1 / 60, idle, t);
  }
  const E = edgeCharges(g); assert.ok(!E || (E.n >= 0 && E.n <= ARCANE_EDGE.hits));
  assert.ok(Number.isFinite(e.hp) && Number.isFinite(g.player.stamina) && Number.isFinite(g.player.x));
  assert.equal(glyphMinesOf(g).length, 0); assert.ok(g.effects.length < 200 && g.projectiles.length < 200);
});
