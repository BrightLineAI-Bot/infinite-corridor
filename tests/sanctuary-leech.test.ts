// Sanctuary reworked (Tim, 2026-11-18): while Veil Guard holds, the Wayfarer's hits heal SANCTUARY.leech (12%) of the damage they
// deal, and the shared heal-on-hit cap (TESSERACTS.hitHealCap, 5% of maximum health a second) rises to TESSERACTS.hitHealCapElite
// (15%) for heals from hits on elites and stronger. The flat 20% mend over the guard is gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, eliteOrStronger } from '../src/game.ts';
import { createCombatant } from '../src/combat.ts';
import { TESSERACTS } from '../src/tesseracts.ts';
import { BRANCHES, SANCTUARY, sanctuaryOn, learnRank, learnMod, chooseCap, hasNode, tickConstellation } from '../src/constellation.ts';
import { APERTURE_SKILLS } from '../src/items.ts';

const MAX = 200;
function arena({ node = true, guard = true, echo = false, line = 0 } = {}) {
  const s = freshSave(); s.seed = 'SANCT'; s.perception.aperture = 90; s.materials.lumenDust = 50;
  if (node) { for (let i = 0; i < APERTURE_SKILLS['veil-guard'].maxRank; i++) assert.ok(learnRank(s, 'veil').ok); assert.ok(learnMod(s, 'veil').ok); assert.ok(chooseCap(s, 'veil', 'sanctuary').ok); assert.ok(hasNode(s, 'sanctuary')); }
  if (guard) s.magicSkills.active = { id: 'veil-guard', remaining: 30 };
  if (echo) { s.echoes.owned.bloblet = true; s.echoes.equipped = ['bloblet']; }
  if (line) { s.perception.aperture = Math.max(s.perception.aperture, 17900); s.tesseracts.owned.push({ uid: 'c', kind: 'ward', grade: 'sovereign', name: 'Test', roll: 3, lines: [{ k: 'meleeHeal', v: line, bad: false }, { k: 'hitHeal', v: .019, bad: false }] }); s.tesseracts.slots[0] = 'c'; }
  const g = new Game(s, 0); s.maxHp = MAX; Object.assign(g.player, { x: 10, y: 10, hp: 10, maxHp: MAX });
  const mk = (id, extra = {}) => Object.assign(createCombatant('rootBrute', 12, 10), { id, hp: 1e7, maxHp: 1e7, damage: 0, cooldown: 1e9 }, extra);
  g.enemies = [mk('plain'), mk('elite', { eliteId: 'x', elite: true }), mk('boss', { boss: true }), mk('beast', { worldBeast: 'briarStag' }), mk('guard', { packGuardian: true }), mk('stego', { stegoRoom: true }), mk('spino', { spinoRoom: true })];
  return { s, g, foe: (id) => g.enemies.find((e) => e.id === id) };
}
// Every heal-on-hit source, many big hits within one calendar second (the budget is per second); returns the health gained.
function second(g, target, sec, hits = 20, dmg = 40) {
  const start = g.player.hp;
  for (let k = 0; k < hits; k++) { const t = sec * 1000 + k * 38; g.tesseractHitHeal(k % 2 ? 'melee' : 'spell', t, target); g.landHit(target, dmg, t); }
  return g.player.hp - start;
}
const near = (a, b) => Math.abs(a - b) < 1e-9;

test('data and text: 12% leech, 15% cap on elites and stronger, 5% base; the old mend is gone from the text', () => {
  assert.equal(SANCTUARY.leech, .12); assert.equal(TESSERACTS.hitHealCap, .05); assert.equal(TESSERACTS.hitHealCapElite, .15);
  const node = BRANCHES.veil.caps.find((c) => c.id === 'sanctuary'); assert.match(node.text, /12% of the damage/); assert.match(node.text, /15%.*5%/); assert.doesNotMatch(node.text, /20%/);
  for (const id of ['elite', 'boss', 'beast', 'guard', 'stego', 'spino']) assert.ok(eliteOrStronger(arena({ node: false }).foe(id)), id);
  assert.equal(eliteOrStronger(arena({ node: false }).foe('plain')), false);
});

test('the leech: only while Veil Guard holds, only with the node taken', () => {
  let { g, foe } = arena(); assert.ok(sanctuaryOn(g.save));
  g.landHit(foe('plain'), 50, 1000); assert.ok(near(g.player.hp, 10 + 50 * .12), `12% of 50 (${g.player.hp})`);
  ({ g, foe } = arena({ guard: false })); assert.equal(sanctuaryOn(g.save), false); g.landHit(foe('plain'), 50, 1000); assert.equal(g.player.hp, 10, 'no guard: nothing');
  ({ g, foe } = arena({ node: false })); assert.equal(sanctuaryOn(g.save), false); g.landHit(foe('plain'), 50, 1000); assert.equal(g.player.hp, 10, 'no node: nothing');
  ({ g, foe } = arena()); g.save.magicSkills.active.remaining = 0; g.landHit(foe('plain'), 50, 1000); assert.equal(g.player.hp, 10, 'the guard ended');
  // a real swing is a hit that leeches
  ({ g, foe } = arena()); g.enemies = [Object.assign(foe('plain'), { x: 11.2, y: 10 })]; g.save.lastAim = { x: 1, y: 0 }; g.player.facing = 'right';
  g.primaryAttack(5000, { x: 1, y: 0 }); const took = 1e7 - g.enemies[0].hp; assert.ok(took > 0); assert.ok(near(g.player.hp, 10 + Math.min(took * .12, MAX * .05)), `swing leech (${g.player.hp}, took ${took})`);
});

test('the old flat mend is gone: Veil Guard with Sanctuary heals nothing over time', () => {
  const { g } = arena(); g.player.hp = 50; g._cLastHp = 50;
  for (let t = 0; t < 10; t += .1) tickConstellation(g, .1, 1000 + t * 1000);
  assert.equal(g.player.hp, 50);
});

test('the cap: 15% a second only against elites and stronger, 5% against ordinary foes', () => {
  for (const id of ['elite', 'boss', 'beast', 'guard', 'stego', 'spino']) { const { g, foe } = arena(); assert.ok(near(second(g, foe(id), 1), MAX * .15), id); }
  { const { g, foe } = arena(); assert.ok(near(second(g, foe('plain'), 1), MAX * .05), 'ordinary: 5%'); }
  { const { g, foe } = arena({ guard: false, line: .05 }); assert.ok(near(second(g, foe('boss'), 1), MAX * .05), 'no guard: a boss is held at 5% too'); }
  { const { g, foe } = arena({ node: false, line: .05 }); assert.ok(near(second(g, foe('boss'), 1), MAX * .05), 'no node: 5%'); }
});

test('the shared cap: the leech, the Tesseract lines and Bloblet Mend together never pass it', () => {
  const { g, foe } = arena({ echo: true, line: .05 });
  // ordinary first fill the 5%, then a boss takes it to 15%, and ordinary hits after add nothing
  let got = second(g, foe('plain'), 1, 10); assert.ok(near(got, MAX * .05), `ordinary first: ${got}`);
  got += second(g, foe('boss'), 1, 10); assert.ok(near(got, MAX * .15), `then a boss: ${got}`);
  const hp = g.player.hp; for (let k = 0; k < 5; k++) { g.tesseractHitHeal('melee', 1950, foe('plain')); g.landHit(foe('plain'), 40, 1950 + k); } assert.equal(g.player.hp, hp, 'past 5% an ordinary hit adds nothing');
  // a minute of mixed seconds: never past 15%, nor past 5% when only ordinary foes are struck
  for (let sec = 10; sec < 70; sec++) { g.player.hp = 10; const plain = sec % 3 === 0, got = second(g, foe(plain ? 'plain' : (sec % 2 ? 'boss' : 'elite')), sec, 25);
    assert.ok(Number.isFinite(got) && got <= MAX * (plain ? .05 : .15) + 1e-9, `s${sec}: ${got}`); }
  g.player.hp = MAX - 1; second(g, foe('boss'), 80); assert.equal(g.player.hp, MAX, 'never past maximum health');
});

test('save-compatible: a journey that took Sanctuary keeps it and gets the new effect', () => {
  const { s } = arena({ guard: false });
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.ok(hasNode(back, 'sanctuary'));
  back.magicSkills.active = { id: 'veil-guard', remaining: 10 }; assert.ok(sanctuaryOn(back));
  const g = new Game(back, 0); back.maxHp = MAX; g.player.hp = 10; const e = Object.assign(createCombatant('rootBrute', 12, 10), { id: 'f', hp: 1e5, maxHp: 1e5 });
  g.enemies = [e]; g.landHit(e, 25, 1000); assert.ok(near(g.player.hp, 13));
});
