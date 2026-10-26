// Release 459 (Tim: "each time you go into a dungeon... you can find different marginalia, and they'll change how you play
// in the dungeon... a Scrapbook... paste them in when you get into the dungeon... several guardians in the dungeon...
// killing one is the one that you need to exit... as you kill a guardian, you get to select different marginalia... they
// call in reinforcements"): Margin Wardens, marginalia for one crossing, the Scrapbook.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, characterStats, isCrossingGuardian, isDungeonGuardian } from '../src/game.ts';
import { APERTURE_BANDS } from '../src/items.ts';
import { RULES, MARGINALIA, MARGINALIA_IDS, marginRun, wardenSpawns, ensureMarginalia } from '../src/marginalia.ts';

const idle = { state: { x: 0, y: 0 }, consume: () => false, held: () => false, reset() {} };
function crossing({ tier = RULES.tier, seed = 'MARGINALIA459', at = [7, 2] } = {}) {
  const s = freshSave(); s.seed = seed; s.level = 40; s.perception.aperture = APERTURE_BANDS[tier].threshold;
  const id = `dungeon:${seed}:g1:${at[0]}:${at[1]}:room`; s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: at[0], ry: at[1], x: 16, y: 16 };
  const g = new Game(s, 0); g.loadArea('dungeon', false); return { s, g, id };
}
const wardens = (g) => g.enemies.filter((e) => e.marginWarden);

test('the marginalia; Margin Wardens stand only from Infinite IV, in ordinary crossings, on floor the entry reaches', () => {
  assert.ok(MARGINALIA_IDS.length >= 9); for (const id of MARGINALIA_IDS) assert.ok(MARGINALIA[id].name && MARGINALIA[id].text && (MARGINALIA[id].bonus || MARGINALIA[id].rule));
  assert.equal(wardens(crossing({ tier: RULES.tier - 1 }).g).length, 0, 'not before Infinite IV');
  let seen = 0;
  for (let k = 0; k < 12; k++) {
    const { g } = crossing({ seed: `MW${k}`, at: [3 + k, -2] }), w = wardens(g); seen += w.length;
    assert.ok(w.length >= 1 && w.length <= 3, `${w.length} wardens`);
    for (const e of w) { assert.equal(isCrossingGuardian(e), false); assert.equal(e.boss, false, 'never the guardian that opens the way out'); assert.ok(Math.hypot(e.x - g.map.entry.x, e.y - g.map.entry.y) >= RULES.wardenMinFromEntry); }
    assert.deepEqual(wardenSpawns(g.save, { ...g.map, enemySpawns: g.map.enemySpawns.filter((q) => !q.marginWarden) }, g.areaId()).map((q) => [q.x, q.y]), w.map((e) => [e.x, e.y]), 'by seed');
  }
  assert.ok(seen >= 12);
  const s = freshSave(); s.perception.aperture = APERTURE_BANDS[RULES.tier].threshold;
  assert.deepEqual(wardenSpawns(s, crossing().g.map, 'displacement:1:2:x'), []);
});

test('felling a warden: a page applied at once (release 473: no choice), reinforcements called, kept for the crossing', () => {
  const { s, g, id } = crossing(), w = wardens(g)[0]; g.player.x = g.map.entry.x; g.player.y = g.map.entry.y;
  const live = g.enemies.filter((e) => !e.dead).length;
  w.hp = 0; w.dead = true; g.defeatEnemy(w);
  const run = marginRun(s, id); assert.equal(run.offer, null); assert.equal(run.perks.length, 1); assert.deepEqual(ensureMarginalia(s).found, run.perks); assert.equal(g.defeatNotice.title, 'A MARGIN WARDEN FALLS'); assert.ok(g.defeatNotice.detail.includes(MARGINALIA[run.perks[0]].name));
  const called = g.enemies.filter((e) => e.reinforcement); assert.ok(called.length > 0 && called.length <= RULES.reinforcements.count); assert.ok(called.every((e) => e.aggro && !e.dead));
  assert.ok(g.enemies.filter((e) => !e.dead).length <= Math.max(live, RULES.reinforcements.liveCap));
  g.player.hp = 0; g.update(.001, idle, 5000); assert.equal(g.area, 'dungeon', 'a fall restarts you at the entrance'); assert.equal(marginRun(s, id).perks.length, 1, 'still inside: the run holds');
  assert.equal(wardens(g).some((e) => e.id === w.id && !e.dead), false, 'release 473: the fallen warden does not stand again');
  g.leaveDungeon('out'); assert.equal(g.area, 'overworld'); assert.equal(s.session.marginRun, null, 'leaving ends the run');
  assert.deepEqual(ensureMarginalia(migrateSave(JSON.parse(JSON.stringify(s)))).found, run.perks.length ? ensureMarginalia(s).found : [], 'the Scrapbook keeps it');
});

test('pasting in on entry; Red Margin mends, Quick Ink refreshes, Second Wind saves once, Ember Wake burns on a dodge', () => {
  const { s, g, id } = crossing(); s.marginalia = { found: [...MARGINALIA_IDS] };
  g.save.session.marginRun = null; g.loadArea('overworld', false); s.session.activeDungeonId = id; s.session.dungeonReturn = { rx: 7, ry: 2, x: 16, y: 16 };
  const entrance = { id: 'room', kind: 'dungeon', dungeonId: id, x: g.player.x, y: g.player.y, state: 'open', actions: ['enter'] }; g.map.objects.push(entrance);
  g.interact('enter', 'room'); assert.equal(g.area, 'dungeon'); assert.ok(g.marginPasteRequested); assert.deepEqual(marginRun(s, id).perks, []);
  for (const p of ['redMargin', 'quickInk']) { const r = g.pasteMarginaliaPage(p); if (p === 'redMargin') assert.ok(r.ok); else assert.equal(r.ok, false, 'one page pasted per crossing'); }
  const run = marginRun(s, id); run.perks.push('quickInk', 'secondWind', 'emberWake'); g.enemies = g.enemies.filter((e) => !e.dead);
  const foe = g.enemies.find((e) => !e.marginWarden && !isDungeonGuardian(e)); g.player.hp = 10; foe.hp = 0; foe.dead = true; g.defeatEnemy(foe); assert.ok(g.player.hp > 10, 'Red Margin');
  s.magicSkills.cooldowns = { 'spell:ember-ring': 9 }; const w = wardens(g)[0]; w.hp = 0; w.dead = true; g.defeatEnemy(w); assert.equal(s.magicSkills.cooldowns['spell:ember-ring'], 0, 'Quick Ink');
  g.enemies = []; const d0 = s.worldFlags.deaths || 0; g.player.hp = 0; g.update(.001, idle, 9000); assert.equal(s.worldFlags.deaths || 0, d0, 'not a fall'); assert.ok(g.player.hp > 0); assert.ok(run.secondWind);
  const deaths = s.worldFlags.deaths || 0; g.player.hp = 0; g.player.invulnerableUntil = 0; g.update(.001, idle, 20000); assert.equal(s.worldFlags.deaths || 0, deaths + 1, 'only once');
  const t = crossing({ seed: 'EMBER459' }); t.s.session.marginRun = { dungeon: t.id, perks: ['emberWake'], secondWind: false, offer: null };
  const near = t.g.enemies.find((e) => !e.dead && !e.boss); t.g.enemies = [near]; Object.assign(t.g.player, { x: near.x, y: near.y + .4, stamina: 100 }); const hp0 = near.hp;
  let pressed = false; t.g.update(1 / 30, { ...idle, consume: (k) => k === 'dodge' && !pressed ? (pressed = true) : false }, 30000); assert.ok(near.hp < hp0, 'Ember Wake');
});

test('wired: the offer and Scrapbook screens, the HUD, the map mark, the build', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /marginRun\(save, game\.areaId\(\)\)\?\.offer\?\.length\) \{ game\.marginOfferRequested = false; openMarginOffer\(\); \}/); assert.match(main, /openScrapbookPaste\(\); \}/); assert.match(main, /buffs\.push\(`MARGINALIA /);
  assert.match(readFileSync(new URL('../src/monster-pack.ts', import.meta.url), 'utf8'), /e\?\.marginWarden/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'marginalia'/);
  for (const sw of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(sw, import.meta.url), 'utf8'), /src\/marginalia\.js\?v=/);
});
