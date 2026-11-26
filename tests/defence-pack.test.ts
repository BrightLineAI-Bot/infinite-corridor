// Defence pack (Tim, 2026-11-26: recommendations 1, 2, 3, 5, 6 and 10 of the defence research). Toughness beside the total
// damage cut; a higher, never-reached reduction ceiling (cap .80, knee 1.0) read from one table everywhere; the Aperture skills'
// guards as their own capped layer that multiplies the gear layer, with a floor that always lands; +3% maximum health a
// Resonance band; and the opt-in Threat Sigil set at a Wayglass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats, gearReadout, reductionCurve, DAMAGE_REDUCTION, DAMAGE_LAYERS, VEIL_GUARD, damageTakenScale, skillReduction, toughness, APERTURE_RESONANCE, apertureResonance, THREAT_SIGIL, threatStep } from '../src/game.ts';
import { reductionGuard } from '../src/stages.ts';
import { gainAperture } from '../src/interactions.ts';
import { APERTURE_BANDS } from '../src/items.ts';

const save = (seed = 'DEFPACK') => { const s: any = freshSave(); s.seed = seed; return s; };
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const item = (slot, power, ward = 0) => ({ id: `t-${slot}`, name: `T ${slot}`, slot, power, basePower: power, upgradeRank: 0, property: 'guard', glyphs: [null], ...(ward ? { affixes: [{ id: 'ward', value: ward }] } : {}) });
// Scripted builds (the measurement harness's): level, Resolve, Vigor, armor and charm power, ward affixes, Aperture band.
const BUILDS = {
  early3: { level: 3, Resolve: 2, Vigor: 2, armor: 3, charm: 0, ward: 0, band: 0 },
  mid15: { level: 15, Resolve: 6, Vigor: 6, armor: 14, charm: 8, ward: 0, band: 2 },
  late35: { level: 35, Resolve: 15, Vigor: 15, armor: 35, charm: 20, ward: .06, band: 6 },
  end70: { level: 70, Resolve: 30, Vigor: 30, armor: 70, charm: 40, ward: .12, band: 10 },
  timlike: { level: 70, Resolve: 30, Vigor: 30, armor: 80, charm: 40, ward: .12, band: 12 },
  strong90: { level: 90, Resolve: 50, Vigor: 50, armor: 120, charm: 60, ward: .2, band: 14 },
};
function build(name, seed = 'DEFPACK') {
  const b = BUILDS[name], s = save(seed); s.level = b.level; Object.assign(s.stats, { Resolve: b.Resolve, Vigor: b.Vigor });
  s.equipment.armor = item('armor', b.armor, b.ward / 2); s.equipment.charm = b.charm ? item('charm', b.charm, b.ward / 2) : null;
  s.perception.aperture = APERTURE_BANDS[b.band].threshold; s.maxHp = characterStats(s).maxHp; return s;
}

test('the reduction curve: cap .80, knee 1.0, one table; a Tim-like raw 3.1 stays about .70 and the cap is never reached', () => {
  assert.deepEqual(DAMAGE_REDUCTION, { soft: .45, cap: .8, knee: 1 });
  for (const r of [0, .2, .45]) assert.equal(reductionCurve(r), r);
  assert.ok(Math.abs(reductionCurve(3.1) - .70) < .01, `${reductionCurve(3.1)}`);
  assert.ok(Math.abs(reductionCurve(6) - .74) < .01 && Math.abs(reductionCurve(12) - .77) < .01);
  let prev = .45; for (const r of [.6, 1, 2, 4, 8, 50, 1e6]) { const d = reductionCurve(r); assert.ok(d > prev && d < DAMAGE_REDUCTION.cap, `${r} -> ${d}`); prev = d; }
  assert.equal(reductionGuard(2), DAMAGE_REDUCTION.cap); assert.equal(reductionGuard(-1), 0); assert.equal(reductionGuard('x'), 0);
});

test('no scattered .75 reduction clamp is left: every hit and reference reads the table', () => {
  const dir = new URL('../src/', import.meta.url), bad = [];
  for (const f of readdirSync(dir)) if (f.endsWith('.ts')) { const src = readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/Math\.min\(\s*0?\.75\s*,[^;\n]{0,80}(damageReduction|guard|veil)/g)) bad.push(`${f}: ${m[0]}`); }
  assert.deepEqual(bad, []);
  const g = String(Game.prototype.update) + String(Game.prototype.packHurt) + String(Game.prototype.frenzyTick);
  assert.ok((g.match(/damageTakenScale\(/g) || []).length >= 8, 'shots, blasts, sea creatures, contact, packs, burns, affixes, the frenzy');
  assert.ok(!/1\s*-\s*Math\.min\(\s*\.75/.test(g));
});

test('Toughness: maximum health over what gets through, beside the total damage cut for armor and charms', () => {
  const s = build('timlike'), st = characterStats(s);
  for (const slot of ['armor', 'charm']) {
    const rows = gearReadout(s, slot), cut = rows.findIndex((r) => r.id === 'reduction'), t = rows.find((r) => r.id === 'toughness');
    assert.ok(t && rows[cut + 1] === t, `${slot}: toughness follows the damage cut`);
    assert.equal(t.value, Math.round(st.maxHp / (1 - st.damageReduction))); assert.equal(t.value, toughness(st.maxHp, st.damageReduction)); assert.equal(t.better, 'higher');
  }
  assert.ok(!gearReadout(s, 'primary').some((r) => r.id === 'toughness'));
  const more = build('timlike'); more.equipment.armor = item('armor', 120, .06);
  assert.ok(gearReadout(more, 'armor').find((r) => r.id === 'toughness').value > gearReadout(s, 'armor').find((r) => r.id === 'toughness').value, 'better armor shows');
});

test('the skill layer multiplies the gear layer, capped; the gear reduction no longer carries the skills', () => {
  const s = build('late35'), gear = characterStats(s).damageReduction;
  assert.equal(skillReduction(s), 0); assert.ok(close(damageTakenScale(s), 1 - gear));
  s.magicSkills.learned['veil-guard'] = 1; s.magicSkills.active = { id: 'veil-guard', remaining: 5 };
  const veil = VEIL_GUARD.base + VEIL_GUARD.perRank;
  assert.equal(characterStats(s).damageReduction, gear, 'Veil Guard is not gear');
  assert.ok(close(skillReduction(s), veil)); assert.ok(close(damageTakenScale(s), (1 - gear) * (1 - veil)));
  assert.ok(close(damageTakenScale(s, true), (1 - gear) * (1 - veil) * DAMAGE_LAYERS.guard), 'a ward guard multiplies too');
  s.magicSkills.learned['veil-guard'] = 3; assert.ok(close(skillReduction(s), .36), 'rank 3 (.36) counts in full under the .5 cap');
  assert.equal(DAMAGE_LAYERS.skillCap, .5);
  // Stillwater (Mirror Veil's secondary form, open from Infinite III) on top: .36 + .2 is held at the cap.
  s.perception.aperture = APERTURE_BANDS[13].threshold; s.constellation.mods['mirror-veil'] = true; s.constellation.alt = { 'mirror-veil': true };
  assert.equal(skillReduction(s), DAMAGE_LAYERS.skillCap, 'Veil Guard and Stillwater together are held at the cap');
  // Colossus (Ember Form) and the secondary passives were added to the gear sum; now they are the skill layer.
  const e = build('late35'); e.constellation.mods.colossus = true; e.magicSkills.active = { id: 'ember-form', remaining: 5 };
  assert.equal(characterStats(e).damageReduction, gear); assert.ok(close(skillReduction(e), .15));
  // Late in the game a skill guard still counts in full against what the gear lets through (before, it hit the .75 clamp).
  const top = build('strong90'); top.magicSkills.learned['veil-guard'] = 3; top.magicSkills.active = { id: 'veil-guard', remaining: 5 };
  const g2 = characterStats(top).damageReduction; assert.ok(damageTakenScale(top) < (1 - Math.min(.75, g2 + .36)) * .9, 'more than a little');
});

test('the floor: at least 10% of a blow always lands', () => {
  const s = build('strong90'); s.equipment.armor = item('armor', 5000, .5); s.magicSkills.learned['veil-guard'] = 3; s.magicSkills.active = { id: 'veil-guard', remaining: 5 };
  const raw = (1 - characterStats(s).damageReduction) * (1 - skillReduction(s)) * DAMAGE_LAYERS.guard;
  assert.ok(raw < DAMAGE_LAYERS.floor, `${raw}`); assert.equal(damageTakenScale(s, true), DAMAGE_LAYERS.floor);
  assert.ok(damageTakenScale(s) > DAMAGE_LAYERS.floor, 'unguarded it is above the floor');
});

test('the hit sites take the layered share: pack blows, contact and the burn tick', () => {
  const s = build('late35', 'DEFHIT'); s.magicSkills.learned['veil-guard'] = 2; s.magicSkills.active = { id: 'veil-guard', remaining: 30 };
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; g.player.hp = 400; g.guardRemaining = 0;
  assert.equal(g.packHurt(null, 100, {}, 10000), true); assert.equal(400 - g.player.hp, Math.ceil(100 * damageTakenScale(g.save)));
  g.player.hp = 400; g.player.invulnerableUntil = 0; g.guardRemaining = 1; g.packHurt(null, 100, {}, 20000);
  assert.equal(400 - g.player.hp, Math.ceil(100 * damageTakenScale(g.save, true)), 'a ward guard multiplies');
});

test('Resonance: +3% maximum health a band past Resonant, on top of the flat health', () => {
  assert.equal(APERTURE_RESONANCE.hpShare, .03); assert.equal(APERTURE_RESONANCE.hp, 6);
  const s = save(); s.level = 40; s.stats.Vigor = 20;
  for (const band of [0, 3, 4, 8, 14]) { s.perception.aperture = APERTURE_BANDS[band].threshold; const r = apertureResonance(s), base = 60 + 39 * 6 + 19 * 8 + r * 6;
    assert.equal(characterStats(s).maxHp, Math.round(base * (1 + r * .03)), `band ${band}`); }
  s.perception.aperture = APERTURE_BANDS[3].threshold; assert.equal(apertureResonance(s), 0); assert.equal(characterStats(s).maxHp, 60 + 39 * 6 + 19 * 8, 'no Resonance, no change');
});

test('the Threat Sigil: saved additively, normalised, 0 by default; unknown fields kept', () => {
  assert.deepEqual(save().threatSigil, { step: 0, carry: 0 });
  const old = JSON.parse(JSON.stringify(save())); delete old.threatSigil; assert.deepEqual(migrateSave(old).threatSigil, { step: 0, carry: 0 });
  const odd = JSON.parse(JSON.stringify(save())); odd.threatSigil = { step: 99, carry: 'x', note: 'kept' };
  assert.deepEqual(migrateSave(odd).threatSigil, { step: THREAT_SIGIL.max, carry: 0, note: 'kept' });
  const neg = JSON.parse(JSON.stringify(save())); neg.threatSigil = 'loud'; assert.deepEqual(migrateSave(neg).threatSigil, { step: 0, carry: 0 });
  const kept = JSON.parse(JSON.stringify(save())); kept.threatSigil = { step: 4, carry: .3 }; assert.deepEqual(migrateSave(kept).threatSigil, { step: 4, carry: .3 });
  assert.deepEqual(THREAT_SIGIL.max, 10); assert.equal(THREAT_SIGIL.damage, .1); assert.equal(THREAT_SIGIL.health, .15); assert.equal(THREAT_SIGIL.loot, .1); assert.equal(THREAT_SIGIL.aperture, .1);
});

function atWayglass(seed = 'SIGILHP') { // this journey has a Wayglass (and foes) at section 4, 0
  const g: any = new Game(save(seed), 0); g.rx = 4; g.ry = 0; g.loadArea('overworld');
  const glass = g.map.objects.find((o) => o.kind === 'checkpoint'); assert.ok(glass, 'a Wayglass in the section');
  return { g, glass };
}
test('the Threat Sigil is set at a Wayglass, one step at a time, 0 to 10; away from one it is refused', () => {
  const { g, glass } = atWayglass();
  g.player.x = glass.x + 8; g.player.y = glass.y + 8; assert.equal(g.threatSigilGlass(), null);
  assert.equal(g.setThreatSigil(1).ok, false); assert.equal(threatStep(g.save), 0);
  g.player.x = glass.x + 1; g.player.y = glass.y;
  let r = g.setThreatSigil(1); assert.equal(r.ok, true); assert.equal(threatStep(g.save), 1); assert.match(r.message, /step 1 of 10/);
  r = g.interact('threatUp', glass.id); assert.equal(threatStep(g.save), 2, 'the Wayglass answers the action too');
  for (let i = 0; i < 20; i++) g.setThreatSigil(1); assert.equal(threatStep(g.save), 10); assert.equal(g.setThreatSigil(1).ok, false);
  for (let i = 0; i < 20; i++) g.setThreatSigil(-1); assert.equal(threatStep(g.save), 0); assert.equal(g.setThreatSigil(-1).ok, false);
  g.interact('threatDown', glass.id); assert.equal(threatStep(g.save), 0);
});

test('each step: foes deal 10% more and have 15% more health, across the whole world, and back down again', () => {
  const s = build('late35'), base = damageTakenScale(s);
  s.threatSigil.step = 3; assert.ok(close(damageTakenScale(s), base * 1.3)); s.threatSigil.step = 0; assert.equal(damageTakenScale(s), base, 'step 0 is exactly as before');
  const { g, glass } = atWayglass(); g.player.x = glass.x + 1; g.player.y = glass.y;
  const foes = g.enemies.filter((e) => !e.dead && e.maxHp > 0 && !e.ambient && !e.passiveBehavior && e.kind !== 'npc'); assert.ok(foes.length > 0);
  const hp0 = foes.map((e) => e.maxHp); foes[0].hp = Math.round(foes[0].maxHp / 2);
  for (let i = 0; i < 4; i++) g.setThreatSigil(1);
  foes.forEach((e, i) => { assert.ok(Math.abs(e.maxHp - hp0[i] * 1.6) <= 2, `${e.kind} ${e.maxHp} vs ${hp0[i] * 1.6}`); assert.equal(e.sigilHp, 4); }); // one step at a time, rounded each time
  assert.ok(Math.abs(foes[0].hp / foes[0].maxHp - .5) < .03, `its wounds kept as a share: ${foes[0].hp}/${foes[0].maxHp}`);
  const held = foes.map((e) => e.maxHp); g.applyThreatSigil(); assert.deepEqual(foes.map((e) => e.maxHp), held, 'never twice');
  const late = g.scaleToRegion(g.createEnemyFromSpawn({ id: 'late-1', kind: 'rootBrute', x: 5, y: 5 }));
  assert.equal(late.sigilHp, 4, 'a foe made later takes it');
  for (let i = 0; i < 4; i++) g.setThreatSigil(-1);
  foes.forEach((e, i) => { assert.ok(Math.abs(e.maxHp - hp0[i]) <= 2, `${e.kind} ${e.maxHp} vs ${hp0[i]}`); assert.equal(e.sigilHp, undefined); });
  // A section loaded while the sigil burns carries it; the stamp is saved with the foe, so a reload never doubles it.
  g.save.threatSigil.step = 2; g.rx = 7; g.ry = 0; g.loadArea('overworld');
  const here = g.enemies.filter((e) => !e.dead && e.maxHp > 0 && !e.ambient && !e.passiveBehavior && e.kind !== 'npc');
  assert.ok(here.length && here.every((e) => e.sigilHp === 2));
  const back: any = new Game(structuredClone(g.exportSnapshot(1000)), 1000), again = back.enemies.find((e) => e.id === here[0].id);
  assert.equal(again.maxHp, here[0].maxHp);
});

test('each step: 10% more Aperture (tenths carried) and a second, seeded gear roll', () => {
  const s = save(); s.perception.aperture = 0; s.threatSigil.step = 5;
  gainAperture(s, 10, 'sigil-a'); assert.equal(s.perception.aperture, 15);
  for (let i = 0; i < 4; i++) gainAperture(s, 1, `sigil-b${i}`); assert.equal(s.perception.aperture, 15 + 4 + 2); assert.equal(s.threatSigil.carry, 0);
  gainAperture(s, 1, 'sigil-c'); assert.equal(s.threatSigil.carry, .5);
  const z = save(); z.perception.aperture = 0; gainAperture(z, 7, 'z'); assert.equal(z.perception.aperture, 7, 'step 0 pays exactly the gain'); assert.equal(z.threatSigil.carry, 0);
  const drops = (step) => { const g: any = new Game(save('SIGLOOT'), 0); g.save.threatSigil.step = step; g.enemies = []; let n = 0; const real = g.obtainDrop.bind(g); g.obtainDrop = (...a) => { n++; return real(...a); };
    for (let i = 0; i < 300; i++) { const e = g.createEnemyFromSpawn({ id: `l${i}`, kind: 'rootBrute', x: 5, y: 5 }, 'overworld'); e.dead = true; g.enemies.push(e); g.defeatEnemy(e); } return n; };
  const d0 = drops(0), d10 = drops(10), d10b = drops(10);
  assert.equal(d10, d10b, 'seeded: the same journey drops the same'); assert.ok(d10 > d0 * 1.4, `${d0} -> ${d10}`);
});
