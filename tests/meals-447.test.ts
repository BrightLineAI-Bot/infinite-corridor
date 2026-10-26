// Release 447 (Tim: "food buffs... 15 minutes... you should have to go back to the town to get another... similar to Monster
// Hunter... combinations of ingredients... extra damage, life, stamina, movement speed, attack speed... magic recovery...
// It shouldn't be crazy... something that... make it easier for world bosses to find you"): Refuge meals.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats } from '../src/game.ts';
import { MEAL, INGREDIENTS, INGREDIENT_IDS, mealName, mealBonus, mealPrice, eatMeal, tickMeal, ensureMeal } from '../src/meals.ts';
import { ENCOUNTER, encounterReady, encounterChance, ensureBeastGap } from '../src/world-beasts.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };

test('the pantry: two ingredients make one dish either way round; the same twice is a hearty helping; nothing crazy', () => {
  assert.equal(MEAL.seconds, 900);
  assert.equal(mealName('windleaf', 'emberPepper'), mealName('emberPepper', 'windleaf'));
  assert.equal(mealName('emberPepper', 'windleaf'), 'Ember pepper and windleaf stew');
  assert.equal(mealName('honeycomb', 'honeycomb'), 'Hearty honeycomb porridge');
  assert.deepEqual(mealBonus('honeycomb', 'honeycomb'), { staminaRegen: INGREDIENTS.honeycomb.bonus.staminaRegen * MEAL.hearty });
  assert.deepEqual(Object.keys(mealBonus('ironroot', 'quickgrain')).sort(), ['attackSpeed', 'hp']);
  for (const a of INGREDIENT_IDS) for (const b of INGREDIENT_IDS) for (const [k, v] of Object.entries(mealBonus(a, b))) if (!k.startsWith('lure')) assert.ok(v <= .55, `${a}+${b} ${k} ${v}`);
  assert.equal(mealPrice('ironroot', 'bloodmoss'), INGREDIENTS.ironroot.price + INGREDIENTS.bloodmoss.price);
});

test('eating: paid for, 15 minutes of play, one meal at a time; kept by a save, junk dropped', () => {
  const s = freshSave(); s.currency = 25;
  assert.equal(eatMeal(s, 'ironroot', 'nope').ok, false);
  assert.ok(eatMeal(s, 'ironroot', 'windleaf', 'Hollis').ok); assert.equal(s.currency, 5); assert.equal(s.meal.remaining, 900);
  assert.match(eatMeal(s, 'bloodmoss', 'bloodmoss').message, /costs 28 marks/); assert.equal(s.meal.a, 'ironroot', 'unpaid, the old meal stays');
  s.currency = 100; const r = eatMeal(s, 'honeycomb', 'emberPepper'); assert.match(r.message, /takes the place/); assert.deepEqual([s.meal.a, s.meal.b], ['emberPepper', 'honeycomb']);
  assert.equal(migrateSave(JSON.parse(JSON.stringify(s))).meal.remaining, 900);
  assert.equal(migrateSave({ ...JSON.parse(JSON.stringify(s)), meal: { a: 'cake', b: 'ironroot', remaining: 5 } }).meal, undefined);
  assert.equal(tickMeal(s, 899), false); assert.equal(tickMeal(s, 2), true); assert.equal(s.meal, undefined); assert.equal(ensureMeal(s), null);
});

test('a meal changes the Wayfarer while it lasts', () => {
  const s = freshSave(), base = characterStats(s); s.currency = 99;
  eatMeal(s, 'ironroot', 'windleaf'); const fed = characterStats(s);
  assert.ok(fed.maxHp > base.maxHp && fed.maxHp <= Math.ceil(base.maxHp * 1.13)); assert.ok(Math.abs(fed.moveSpeed - base.moveSpeed - .08) < 1e-9);
  delete s.meal; assert.equal(characterStats(s).maxHp, base.maxHp);
});

test('Bloodmoss: world bosses find you sooner and more often, only while it lasts', () => {
  const s = freshSave(); s.currency = 99; ensureBeastGap(s).fresh = Math.ceil(ENCOUNTER.newSections / 2);
  assert.equal(encounterReady(s), false); const plain = encounterChance(s);
  eatMeal(s, 'bloodmoss', 'ironroot'); assert.equal(encounterReady(s), true); assert.equal(encounterChance(s), plain * 2);
  eatMeal(s, 'bloodmoss', 'bloodmoss'); assert.equal(encounterChance(s), plain * 2.5);
});

test('Hollis cooks at Ember Refuge: Act opens his kitchen, you eat at his table, and it wears off in play', () => {
  const s = freshSave(); s.seed = 'MEAL447'; s.currency = 50; const g = new Game(s, 0); g.rx = 0; g.ry = 0; g.loadArea('overworld', false); g.enemies = [];
  const hollis = g.map.objects.find((o) => o.id === 'refuge-farmer'); assert.ok(hollis?.cook);
  Object.assign(g.player, { x: hollis.x, y: hollis.y + 1, facing: 'up' }); g.kitchenRequested = null; const r = g.interact();
  assert.ok(r.kitchen, g.message); assert.equal(g.kitchenRequested, 'refuge-farmer');
  const hp0 = s.maxHp; assert.ok(g.eatAt('refuge-farmer', 'ironroot', 'ironroot').ok); assert.ok(s.maxHp > hp0); assert.equal(s.currency, 30);
  g.player.x += 20; assert.equal(g.eatAt('refuge-farmer', 'windleaf', 'windleaf').ok, false, 'food is eaten at the table, not carried');
  s.meal.remaining = .01; g.update(.05, idle, 1000); assert.equal(s.meal, undefined); assert.equal(s.maxHp, hp0); assert.match(g.message, /worn off/);
});

test('every Listener town has a cook; the kitchen is built and on the HUD', () => {
  const s = freshSave(); s.seed = 'TOWN441'; const g = new Game(s, 0); let found = false;
  for (let rx = -12; rx <= 12 && !found; rx++) for (let ry = -12; ry <= 12 && !found; ry++) {
    g.rx = rx; g.ry = ry; g.loadArea('overworld', false); if (!g.map.settlement || !g.map.objects.some((o) => o.kind === 'checkpoint')) continue;
    s.hometowns = { towns: [{ rx, ry, name: 'Testford', listener: 1 }], home: null }; g.loadArea('overworld', false); found = true;
    const cook = g.map.objects.filter((o) => o.cook); assert.equal(cook.length, 1); assert.equal(cook[0].name, 'The Testford Cook');
  }
  assert.ok(found);
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8'); assert.match(main, /openKitchen\(id, game\.message\)/); assert.match(main, /buffs\.push\(`MEAL /);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'meals'/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/meals\.js\?v=/);
});
