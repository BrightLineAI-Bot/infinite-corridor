// Release 461 (Tim: "a button in the options where we can toggle on or off damage numbers... how much they do to us and
// how much we do to them... each dodge leaves behind a shadow clone for like 3 seconds... cool down... come up with...
// more, so we have 20"): damage numbers, and eleven more marginalia.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave } from '../src/types.ts';
import { Game, characterStats, DAMAGE_NUMBERS } from '../src/game.ts';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/persistence.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { RULES, MARGINALIA, MARGINALIA_IDS, INK_SHIELD, GILDED } from '../src/marginalia.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
function crossing(perks = []) {
  const s = freshSave(); s.seed = 'DMG461'; s.level = 40; s.perception.aperture = APERTURE_BANDS[RULES.tier].threshold;
  const id = `dungeon:DMG461:g1:7:2:room`; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 7, ry: 2, x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); s.session.marginRun = { dungeon: id, perks, secondWind: false, offer: null }; return { s, g, id };
}

test('damage numbers: on by default, a setting; foes losing health show gold, the Wayfarer red; heals show nothing', () => {
  assert.equal(DEFAULT_SETTINGS.damageNumbers, true); assert.equal(normalizeSettings({}).damageNumbers, true); assert.equal(normalizeSettings({ damageNumbers: false }).damageNumbers, false);
  const { g } = crossing(); g.damageNumbers = true; const foe = g.enemies.find((e) => !e.dead); g.enemies = [foe];
  g.trackDamageNumbers(0); foe.hp -= 17; g.player.hp -= 5; g.trackDamageNumbers(16);
  assert.deepEqual(g.damageFloaters.map((f) => [f.kind, f.text]), [['dealt', '17'], ['taken', '5']]);
  g.player.hp += 20; foe.hp += 3; g.trackDamageNumbers(32); assert.equal(g.damageFloaters.length, 2, 'heals are not numbers');
  g.trackDamageNumbers(32 + DAMAGE_NUMBERS.life + 1); assert.equal(g.damageFloaters.length, 0, 'they fade');
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(main, /toggleSetting\("damageNumbers"\)/); assert.match(main, /game\.damageNumbers=settings\.damageNumbers!==false/);
  assert.match(readFileSync(new URL('../src/renderer.ts', import.meta.url), 'utf8'), /if\(g\.damageNumbers\)drawDamageNumbers\(ctx,g,s,now\)/);
});

test('twenty marginalia, each a stat rule or an event rule', () => {
  assert.equal(MARGINALIA_IDS.length, 20); assert.equal(new Set(MARGINALIA_IDS.map((id) => MARGINALIA[id].name)).size, 20);
  for (const id of MARGINALIA_IDS) assert.ok(MARGINALIA[id].text && (MARGINALIA[id].bonus || MARGINALIA[id].rule), id);
});

test('Shadow Step, Ink Shield, Long Arm, Lifeblood, Hourglass, Gilded Margin, Smith\'s Note, Sigil Page', () => {
  { const { g } = crossing(['shadowStep']); g.enemies = []; Object.assign(g.player, { stamina: 100 }); let pressed = false;
    g.update(1 / 30, { ...idle, consume: (k) => k === 'dodge' && !pressed ? (pressed = true) : false }, 1000); assert.ok(g.shadowCloneActive(1500) && !g.shadowCloneActive(4500), 'a shadow for 3 seconds'); }
  { const { s } = crossing(['longArm', 'lifeblood']), base = characterStats({ ...s, session: { ...s.session, marginRun: null } }); const st = characterStats(s);
    assert.ok(Math.abs(st.attackReach - base.attackReach - .3) < 1e-9, 'Long Arm'); assert.ok(st.maxHp > base.maxHp * 1.2, 'Lifeblood'); }
  { const { s, g } = crossing(['hourglass', 'gildedMargin', 'smithsNote', 'sigilPage']); s.magicSkills.cooldowns = { 'spell:ember-ring': 5 }; const marks = s.currency, sigils = s.consumables.crossingSigil || 0, spheres = (s.materials.weaponSphere || 0) + (s.materials.armorSphere || 0);
    const w = g.enemies.find((e) => e.marginWarden); w.hp = 0; w.dead = true; g.defeatEnemy(w);
    assert.equal(s.magicSkills.cooldowns['spell:ember-ring'], 4, 'Hourglass'); assert.ok(s.currency >= marks + GILDED.marks, 'Gilded Margin');
    assert.equal((s.materials.weaponSphere || 0) + (s.materials.armorSphere || 0), spheres + 1, "Smith's Note"); assert.equal(s.consumables.crossingSigil, sigils + 1, 'Sigil Page'); }
});

test('Ink Shield turns aside the first hit, then waits its 10 seconds', () => {
  const { g } = crossing(['inkShield']), p = g.player;
  p.hp = 88; assert.equal(g.applyInkShield(100, 1000), true); assert.equal(p.hp, 100, 'the hit is turned aside');
  p.hp = 88; assert.equal(g.applyInkShield(100, 5000), false); assert.equal(p.hp, 88, 'not again within 10 s');
  assert.equal(g.applyInkShield(100, 1000 + INK_SHIELD.seconds * 1000), true, 'ready again');
  const { g: plain } = crossing([]); plain.player.hp = 88; assert.equal(plain.applyInkShield(100, 1000), false, 'only with the page');
});
