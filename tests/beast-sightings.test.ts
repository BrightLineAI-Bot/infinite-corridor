// Beast sightings (Tim, 2026-11-11: "the world bosses seem to be in constant retreat now... almost every other time I see a world
// boss it's in retreat"). A passing beast was rolled on every section with no beast of its own, with no regard to the buffer
// between meetings or to the beasts themselves, so passers nearly matched real fights (266 against 343 over 7,200 wandered
// sections of real terrain; at Aperture tier 3 more passers than fights). Now most sightings are hunts you can fight: on this
// synthetic walk 71% / 80% / 87% at tiers 3 / 5 / 8 (the old passer rule, same walk: 41% / 57% / 63%).
import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, migrateSave } from '../src/types.ts';
import { hashSeed } from '../src/random.ts';
import {
  WORLD_BEASTS, WORLD_BEAST_IDS, PASSING, ENCOUNTER, worldBeastFor, passingBeastFor, passingSeen, noteSectionVisit, encounterMet,
  ensureBeastGap, ensureWorldBeasts, worldBeastsLost, beginRetreat, retreatSide, retreatCrossed, worldBeastSlain, retreatsUnderWay,
} from '../src/world-beasts.ts';

const open = () => ({ width: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'floor', blocked: false })), objects: [] });
const probe = (x, y) => ({ biome: (x + y) % 5 === 0 ? 'desert' : 'plains', dominant: (x * 7 + y) % 9 === 0 ? 'glass' : null, canyon: (x * 3 + y) % 7 === 0, dungeon: (x + 2 * y) % 6 === 0, forest: (x - y) % 8 === 0, firelands: (x + y) % 11 === 0 });
const APERTURE = { 3: 36, 5: 124, 8: 470 }; // tier: the Aperture that opens it (items.ts APERTURE_BANDS)

// A Wayfarer wanders (mostly onward, sometimes turning or doubling back), fights each hunt it meets (most fall, some run out
// of patience and retreat, a few outlast the Wayfarer), and counts what every section showed. The game's own order of calls.
function wander(seed, aperture, sections = 2500) {
  const save = freshSave(); save.seed = seed; save.perception.aperture = aperture; save.level = 30; save.playSeconds = 1000; save.explored = {};
  ensureWorldBeasts(save, false);
  const c = { fight: 0, retreat: 0, passing: 0 }, rnd = (k) => (hashSeed(`${seed}:walk:${k}`) % 10000) / 10000;
  let rx = 12, ry = 12, heading = hashSeed(seed) % 4;
  for (let i = 0; i < sections; i++) {
    const r = rnd(i); if (r < .25) heading = (heading + 1) % 4; else if (r < .4) heading = (heading + 3) % 4; else if (r < .5) heading = (heading + 2) % 4;
    const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][heading]; rx += dx; ry += dy; if (Math.abs(rx) + Math.abs(ry) < 8) { rx = 12; ry = 12; }
    save.playSeconds += 20;
    worldBeastsLost(save, 'overworld', rx, ry); noteSectionVisit(save, `${rx},${ry}`);
    const map = open(), spawn = worldBeastFor(save, map, rx, ry);
    if (spawn) {
      const id = spawn.worldBeast, q = save.worldBeasts[id].active;
      if (spawn.retreating) { const side = retreatSide(q.retreat, rx, ry, id); if (side) { c.retreat++; retreatCrossed(save, id, side); } else { c.fight++; worldBeastSlain(save, id); } } // at home it turns at bay
      else {
        c.fight++; save.playSeconds += 90; const o = rnd(`o${i}`);
        if (id === 'voidWalker' || id === 'astralWorm' || o < .6) worldBeastSlain(save, id);
        else if (o < .9) beginRetreat(save, id, rx, ry, probe);
        else { const b = save.worldBeasts[id]; b.escaped++; b.cycle++; b.active = null; b.cooldown = WORLD_BEASTS[id].cooldownEscaped; }
      }
    } else if (passingBeastFor(save, map, rx, ry, Object.keys(save.explored).length)) { c.passing++; passingSeen(save); }
    save.explored[`${rx},${ry}`] = true;
  }
  return c;
}

test('most world-beast sightings are hunts you can fight; passers stay a rare sight at every Aperture tier', () => {
  const all = { fight: 0, retreat: 0, passing: 0 };
  for (const [tier, aperture] of Object.entries(APERTURE)) {
    const t = { fight: 0, retreat: 0, passing: 0 };
    for (const seed of ['SIGHT-A', 'SIGHT-B']) { const c = wander(`${seed}-${tier}`, aperture); for (const k in t) t[k] += c[k]; }
    const seen = t.fight + t.retreat + t.passing;
    assert.ok(t.fight / seen >= .65, `tier ${tier}: ${t.fight} fights of ${seen} sightings (${t.retreat} retreats, ${t.passing} passers)`);
    assert.ok(t.passing <= t.fight * .45, `tier ${tier}: ${t.passing} passers against ${t.fight} fights`);
    assert.ok(t.passing > 0, `tier ${tier}: passers are still seen`);
    for (const k in all) all[k] += t[k];
  }
  const seen = all.fight + all.retreat + all.passing;
  assert.ok(all.fight / seen >= .75, `${all.fight} of ${seen} sightings are fights (${all.retreat} retreats, ${all.passing} passers)`);
  assert.ok(all.retreat > 0, 'a retreat under way is still met now and then');
});

test('no passer in the sections after a meeting, and at most one between two meetings', () => {
  const s = freshSave(); s.seed = 'PASS-GAP'; s.perception.aperture = 470;
  const find = (from = 0) => { for (let i = from; i < from + 4000; i++) { const p = passingBeastFor(s, open(), 20 + (i % 50), 10 + Math.floor(i / 50), i); if (p) return i; } return -1; };
  const at = find(); assert.ok(at >= 0, 'one passes while the buffer is full');
  encounterMet(s); assert.equal(passingBeastFor(s, open(), 20 + (at % 50), 10 + Math.floor(at / 50), at), null, 'not just after a meeting');
  for (let k = 0; k < ENCOUNTER.newSections; k++) noteSectionVisit(s, `gap:${k}`);
  assert.ok(passingBeastFor(s, open(), 20 + (at % 50), 10 + Math.floor(at / 50), at), 'the buffer full again, it passes');
  passingSeen(s); assert.equal(s.beastGap.passed, true); assert.equal(find(), -1, 'no second passer before the next meeting');
  encounterMet(s); assert.equal(s.beastGap.passed, undefined, 'a meeting clears it');
  assert.ok(PASSING.chance > 0 && PASSING.chance < .045, 'rarer than before');
});

test('a passer is a free beast: never one holding, retreating or cooling down anywhere', () => {
  const s = freshSave(); s.seed = 'PASS-FREE'; s.perception.aperture = 470; const ids = WORLD_BEAST_IDS.filter((id) => id !== 'astralWorm' && id !== 'voidWalker');
  for (const [i, id] of ids.entries()) if (i % 3 === 0) s.worldBeasts[id].active = { rx: 90 + i, ry: 90, tries: 1 }; else if (i % 3 === 1) s.worldBeasts[id].cooldown = 5;
  const free = ids.filter((id, i) => i % 3 === 2), seen = new Set();
  for (let i = 0; i < 6000; i++) { const p = passingBeastFor(s, open(), 20 + (i % 50), 10 + Math.floor(i / 50), i); if (p) seen.add(p.passingBeast); }
  assert.ok(seen.size > 0); for (const id of seen) assert.ok(free.includes(id), `${id} passed while held or cooling down`);
});

test('the passer mark is additive save state: kept true through a reload, dropped when not true, old saves load ready', () => {
  const s = freshSave(); s.seed = 'PASS-SAVE'; passingSeen(s);
  const back = migrateSave(JSON.parse(JSON.stringify(s))); assert.equal(back.beastGap.passed, true);
  const odd = freshSave(); odd.beastGap = { fresh: 3, recent: ['1,1'], passed: 'yes', keep: 7 }; ensureBeastGap(odd);
  assert.equal(odd.beastGap.passed, undefined); assert.equal(odd.beastGap.keep, 7, 'unknown fields kept'); assert.equal(odd.beastGap.fresh, 3);
  const old = freshSave(); delete old.beastGap; assert.equal(ensureBeastGap(old).fresh, ENCOUNTER.newSections); assert.equal(old.beastGap.passed, undefined);
});

test('a claim that finds no ground keeps the passer mark', () => {
  const s = freshSave(); s.seed = 'PASS-CLAIM'; s.perception.aperture = 470; passingSeen(s);
  const water = { width: 32, tiles: Array.from({ length: 1024 }, (_, i) => ({ x: i % 32, y: Math.floor(i / 32), kind: 'lava', blocked: true })), objects: [] };
  for (let i = 0; i < 400; i++) { worldBeastFor(s, water, 30 + i, 30); assert.equal(s.beastGap.passed, true, `section ${i}`); }
});

test('fresh tracks are told once for each section a retreat reaches, not on every section load', async () => {
  const { Game } = await import('../src/game.ts');
  const s = freshSave(); s.seed = 'TRACKS'; s.playSeconds = 5000; const g = new Game(s, 0); // made first: its own start-up load is far away
  s.worldBeasts.morphingBlob.active = { rx: 9, ry: 5, tries: 1, retreat: { home: { rx: 9, ry: 1, found: true }, side: null, legs: 0, movedAt: 5000 } };
  const told = () => (g.questNotices || []).filter((n) => n.title === 'FRESH TRACKS').length;
  g.rx = 7; g.ry = 5; g.loadArea('overworld'); assert.equal(told(), 1, 'told on first sight of the trail');
  g.questNotices = []; g.rx = 7; g.ry = 6; g.loadArea('overworld'); assert.equal(told(), 0, 'not again while it has not moved');
  assert.ok(retreatsUnderWay(s).some((r) => r.id === 'morphingBlob'));
  s.playSeconds += 31; g.questNotices = []; g.rx = 7; g.ry = 5; g.loadArea('overworld'); assert.equal(told(), 1, 'told again once it has moved on');
});
