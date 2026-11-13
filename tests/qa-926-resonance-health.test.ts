// QA pass on release 926: a new Aperture Resonance tier raised the derived maximum health (APERTURE_RESONANCE.hp a tier) but left
// save.maxHp and the HUD at the old value, and the next load (syncCharacterStats) then raised the maximum and handed the difference
// to current health too: a free heal on reload. Now the tier is applied the frame it is gained, as a level-up applies a level: the
// maximum and current health both rise by the difference, and a reload changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave } from '../src/types.ts';
import { Game, APERTURE_RESONANCE, apertureResonance, characterStats } from '../src/game.ts';
import { gainAperture } from '../src/interactions.ts';

const inp = () => ({ state: { x: 0, y: 0 }, consume: () => false, held: () => false });
function threshold() { for (let a = 0; a < 20000; a++) if (apertureResonance({ perception: { aperture: a } }) >= 1) return a; throw new Error('no Resonance tier'); }

test('a Resonance tier gained mid-session raises maximum and current health at once, and a reload does not heal', () => {
  const s: any = freshSave(); s.seed = 'HPSYNC'; Object.assign(s.session, { area: 'overworld', rx: 3, ry: 0, x: 16, y: 16 });
  s.perception.aperture = threshold() - 1;
  const g: any = new Game(s, 0); g.enemies = []; g.map.enemySpawns = []; let t = 1000;
  for (let i = 0; i < 5; i++) { g.update(1 / 60, inp(), t += 16); g.enemies = []; }
  const max0 = g.save.maxHp; g.player.hp = max0 - 20; const hp0 = g.player.hp;
  gainAperture(g.save, 5, 'qa-926-test');
  assert.equal(apertureResonance(g.save), 1);
  g.update(1 / 60, inp(), t += 16); g.enemies = [];
  assert.equal(g.save.maxHp, max0 + APERTURE_RESONANCE.hp, 'save.maxHp follows the new tier');
  assert.equal(g.save.maxHp, characterStats(g.save).maxHp, 'and matches the derived maximum');
  assert.equal(g.player.hp, hp0 + APERTURE_RESONANCE.hp, 'current health rises by the same amount, as on a level-up');
  const b: any = new Game(structuredClone(g.exportSnapshot(t)), t);
  assert.equal(b.save.maxHp, g.save.maxHp, 'the reload keeps the maximum');
  assert.equal(b.player.hp, g.player.hp, 'the reload does not heal');
});

test('a tier gained just before a save (no frame between) is applied in the snapshot, so the reload does not heal', () => {
  const s: any = freshSave(); s.seed = 'HPSYNC'; Object.assign(s.session, { area: 'overworld', rx: 3, ry: 0, x: 16, y: 16 });
  s.perception.aperture = threshold() - 1;
  const g: any = new Game(s, 0); g.enemies = []; g.update(1 / 60, inp(), 1000); g.player.hp = 30;
  gainAperture(g.save, 5, 'qa-926-test-2');
  const snap = structuredClone(g.exportSnapshot(1016));
  assert.equal(snap.maxHp, characterStats(snap).maxHp);
  assert.equal(snap.session.playerRuntime.hp, 30 + APERTURE_RESONANCE.hp);
  const b: any = new Game(snap, 1016); assert.equal(b.player.hp, 30 + APERTURE_RESONANCE.hp);
});
