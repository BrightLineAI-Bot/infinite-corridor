// Release 359 (Tim, 2026-10-23): every Arcanum passive (each branch's modifier and two capstones) has a secondary form,
// switched with a button from Infinite III; only the chosen form works.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BRANCHES, ALT_PASSIVES, ALT_UNLOCK_TIER, altUnlocked, toggleAlt, nodeOn, altOn, ensureConstellation, extraReduction, skillDurationScale, strikeAmplifier, onConstellationDodge, onConstellationKill, respec } from '../src/constellation.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { Game } from '../src/game.ts';
import { freshSave, migrateSave } from '../src/types.ts';

const III = APERTURE_BANDS[ALT_UNLOCK_TIER].threshold;
const learned = (aperture = III) => { const s = freshSave(); s.perception.aperture = aperture; for (const b of Object.values(BRANCHES)) { s.magicSkills.learned[b.active] = 5; s.constellation.mods[b.mod.id] = true; s.constellation.caps[Object.keys(BRANCHES).find((k) => BRANCHES[k] === b)] = b.caps[0].id; s.constellation.caps2[Object.keys(BRANCHES).find((k) => BRANCHES[k] === b)] = b.caps[1].id; } return s; };
const active = (s, id) => { s.magicSkills.active = { id, rank: 1, remaining: 5 }; };

test('every modifier and capstone has a secondary form with its own name and text', () => {
  const ids = Object.values(BRANCHES).flatMap((b) => [b.mod, ...b.caps]);
  assert.equal(ids.length, 15);
  for (const n of ids) { const A = ALT_PASSIVES[n.id]; assert.ok(A, n.id); assert.notEqual(A.name, n.name); assert.ok(A.text.length > 10); assert.ok(['while', 'always', 'changes'].includes(A.kind)); }
});

test('the switch opens at Infinite III, needs the node learned, and flips back and forth', () => {
  const low = learned(III - 1); assert.equal(altUnlocked(low), false); assert.equal(toggleAlt(low, 'colossus').ok, false);
  low.constellation.alt = { colossus: true }; assert.equal(altOn(low, 'colossus'), false, 'a stored choice waits for the band'); assert.equal(nodeOn(low, 'colossus'), true);
  const s = learned(); assert.equal(toggleAlt(s, 'ember-skin').ok, true); assert.equal(altOn(s, 'ember-skin'), true); assert.equal(nodeOn(s, 'ember-skin'), false);
  assert.equal(toggleAlt(s, 'ember-skin').ok, true); assert.equal(nodeOn(s, 'ember-skin'), true);
  const blank = freshSave(); blank.perception.aperture = III; assert.equal(toggleAlt(blank, 'fold').ok, false, 'not learned');
  assert.equal(toggleAlt(s, 'nope').ok, false);
});

test('the choice is saved, normalised, and a shrine respec clears it', () => {
  const s = learned(); toggleAlt(s, 'fold'); toggleAlt(s, 'overflow');
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.deepEqual(back.constellation.alt, { fold: true, overflow: true });
  s.constellation.alt.junk = true; s.constellation.alt.anchor = 'yes'; ensureConstellation(s); assert.deepEqual(s.constellation.alt, { fold: true, overflow: true });
  s.materials.lumenDust = 999; assert.ok(respec(s).ok); assert.equal(s.constellation.alt, undefined);
  const plain = freshSave(); ensureConstellation(plain); assert.equal(plain.constellation.alt, undefined, 'no field until a choice');
});

test('only the chosen form works: reductions, durations and the amplifier', () => {
  const s = learned(); active(s, 'ember-form');
  assert.equal(extraReduction(s), .15); assert.equal(skillDurationScale(s, 'ember-form'), 1.5);
  toggleAlt(s, 'colossus'); assert.equal(extraReduction(s), 0, 'Ember Mend gives no guard'); assert.equal(skillDurationScale(s, 'ember-form'), ALT_PASSIVES.colossus.duration);
  active(s, 'veil-guard'); assert.equal(extraReduction(s), 0); toggleAlt(s, 'mirror-veil'); assert.equal(extraReduction(s), ALT_PASSIVES['mirror-veil'].guard);
  assert.equal(skillDurationScale(s, 'veil-guard'), 1); toggleAlt(s, 'sanctuary'); assert.equal(skillDurationScale(s, 'veil-guard'), 1.5);
  active(s, 'force-channel'); assert.equal(strikeAmplifier(s), 1.5); toggleAlt(s, 'amplifier'); assert.equal(strikeAmplifier(s), 1); assert.equal(extraReduction(s), ALT_PASSIVES.amplifier.guard);
  assert.equal(skillDurationScale(s, 'quickening'), 1); toggleAlt(s, 'aerial-step'); assert.equal(skillDurationScale(s, 'quickening'), 1.5);
});

test('Second Wind heals on a dodge instead of saving stamina; Harvest heals on a kill instead of extending', () => {
  const s = learned(), p = { hp: 50, stamina: 10 }; s.maxHp = 100; s.maxStamina = 50; const g = { save: s, player: p, enemies: [], glyphWorld: () => ({ blast() {} }) };
  onConstellationDodge(g); assert.equal(p.stamina, 13); assert.equal(p.hp, 50);
  toggleAlt(s, 'light-feet'); onConstellationDodge(g); assert.equal(p.stamina, 13); assert.equal(p.hp, 53);
  active(s, 'force-channel'); onConstellationKill(g); assert.equal(s.magicSkills.active.remaining, 6);
  toggleAlt(s, 'resonant-force'); onConstellationKill(g); assert.equal(s.magicSkills.active.remaining, 6); assert.equal(p.hp, 57);
});

test('Rift: Quick Fold is one charge that recovers faster; Rift Ward guards longer; Aerial Step cannot be cast on its secondary', () => {
  const s = learned(); s.seed = 'ALT'; const g = new Game(s, 0); g.rx = 2; g.ry = 2; g.loadArea('overworld'); g.enemies = [];
  const w = g.map.width || 32, open = g.map.tiles.find((t) => t.x > 4 && t.x < 20 && !t.blocked && [1, 2, 3, 4, 5, 6].every((k) => { const q = g.map.tiles[t.y * w + t.x + k]; return q && !q.blocked && !q.environment && !(q.elev > (t.elev || 0)); }));
  const step = () => { Object.assign(g.player, { x: open.x, y: open.y, lastMoveVector: { x: 1, y: 0 } }); s.magicSkills.cooldowns['rift-step'] = 0; delete s.magicSkills.riftCharges; g.player.invulnerableUntil = 0; const ok = g.activateApertureSkill('rift-step'); assert.ok(ok, g.message); return ok; };
  g.lastUpdateNow = 1000; step(); const base = s.magicSkills.cooldowns['rift-step']; assert.equal(s.magicSkills.riftCharges, 1, 'Fold: two charges, one spent');
  toggleAlt(s, 'fold'); toggleAlt(s, 'rift-wake'); step();
  assert.equal(s.magicSkills.riftCharges, 0); assert.ok(Math.abs(s.magicSkills.cooldowns['rift-step'] - base * ALT_PASSIVES.fold.cooldown) < 1e-9);
  assert.equal(g.player.invulnerableUntil, 1000 + ALT_PASSIVES['rift-wake'].guardMs);
  s.magicSkills.learned['aerial-step'] = 1; toggleAlt(s, 'aerial-step'); assert.equal(g.activateApertureSkill('aerial-step'), false); assert.match(g.message, /secondary/);
});
