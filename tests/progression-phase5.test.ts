// Progression Phase 5 (docs/progression-design.md revision 3, 4A.4 and section 7 row 5): the Training Yard. A how-to page's
// Try it hands the journey to the Proving Ground through the release-791 handoff with one owned ability named; the laboratory
// plays a scratch copy on the Standard Test Tile with practice dummies and a suited foe. These tests drive the real handoff and
// persistence modules against an in-memory IndexedDB (one key space per database) to show where every write lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game, BRAWLER_GEAR } from '../src/game.ts';
import { startJourney, ownership, PROGRESSION_ROWS } from '../src/progression.ts';
import { ECHO_IDS } from '../src/echoes.ts';
import { weaponKey } from '../src/items.ts';
import { PROVING_GROUND_HANDOFF, handoffRecord, writeHandoff, takeHandoff, createJourneyFixture } from '../src/proving-ground-handoff.ts';
import { createYardFixture, TEST_TILE } from '../src/proving-ground-labs.ts';
import { TRAINING_YARD, yardOffer, yardRefusal, yardRequest, yardSetup, lendYardAbility } from '../src/training-yard.ts';

function fakeStorage() {
  const dbs = new Map(), ls = new Map(), ctl = { dbs, ls, opened: [] };
  const space = (name) => { if (!dbs.has(name)) dbs.set(name, new Map()); return dbs.get(name); };
  const inRange = (k, r) => r && typeof r === 'object' ? k >= r.lower && k <= r.upper : k === r;
  function database(name) {
    const data = space(name), keysIn = (r) => [...data.keys()].filter((k) => inRange(k, r)).sort();
    const transaction = () => {
      const tx = { pending: 0, error: null, settled: false };
      const settle = () => setTimeout(() => { if (tx.pending || tx.settled) return; tx.settled = true; if (tx.error) tx.onerror?.(); else tx.oncomplete?.(); }, 0);
      const request = (fn) => { const q = {}; tx.pending++; setTimeout(() => { try { q.result = fn(); q.onsuccess?.(); } catch (e) { q.error = tx.error = e; q.onerror?.(); } tx.pending--; settle(); }, 0); return q; };
      tx.objectStore = () => ({
        get: (k) => request(() => structuredClone(data.get(k))),
        put: (v, k) => request(() => { data.set(k, structuredClone(v)); }),
        delete: (k) => request(() => { for (const key of keysIn(k)) data.delete(key); }),
        getAllKeys: (r) => request(() => keysIn(r)),
        getAll: (r) => request(() => keysIn(r).map((k) => structuredClone(data.get(k)))),
      });
      return tx;
    };
    return { objectStoreNames: { contains: () => true }, createObjectStore() {}, transaction, close() {} };
  }
  globalThis.IDBKeyRange = { bound: (lower, upper) => ({ lower, upper }) };
  globalThis.indexedDB = {
    open: (name) => { ctl.opened.push(name); const q = {}; setTimeout(() => { q.result = database(name); q.onsuccess?.(); }, 0); return q; },
    deleteDatabase: (name) => { const q = {}; setTimeout(() => { dbs.delete(name); q.onsuccess?.(); }, 0); return q; },
  };
  globalThis.localStorage = { getItem: (k) => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => { ls.set(k, String(v)); }, removeItem: (k) => { ls.delete(k); }, key: (i) => [...ls.keys()][i] ?? null, get length() { return ls.size; } };
  return ctl;
}
let instance = 0;
const freshPersistence = () => import(`../src/persistence.ts?yard5=${++instance}`);
const PRODUCTION_DB = 'infinite-corridor';
const dump = (ctl, name) => JSON.stringify([...(ctl.dbs.get(name) || new Map()).entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
const dumpLs = (ctl) => JSON.stringify([...ctl.ls.entries()].sort());
const run = (g, frames, x, y, start) => { const input = { state: { x, y }, consume: () => false, held: () => false }; let t = start; for (let i = 0; i < frames; i++) { g.update(0.05, input, t); t += 50; } return t; };
const classic = (seed = 'YARD-C') => { const s = freshSave(); s.seed = seed; startJourney(s, { mode: 0 }); new Game(s, 0); return s; };
const exploration = (seed = 'YARD-X') => { const s = freshSave(); s.seed = seed; startJourney(s); new Game(s, 0); return s; };
const yardOf = (s, ability, now = 0) => createYardFixture(handoffRecord(s, { yard: { ability } }), now);

test('phase 5: Try it is offered only for owned abilities the yard can show', () => {
  for (const s of [classic(), exploration()]) {
    const states = ownership(s);
    for (const row of PROGRESSION_ROWS) {
      const offer = yardOffer(s, row.id);
      if (states[row.id] !== 'owned') assert.equal(offer, null, `${row.id} is ${states[row.id]}: no button`);
      else assert.equal(!!offer, !!yardSetup(row.id), `${row.id} owned: a button exactly when the yard has a setup`);
    }
    assert.ok(PROGRESSION_ROWS.some((r) => yardOffer(s, r.id)), 'something is offered on a fresh journey');
  }
  const c = classic(); c.perception.aperture = 6;
  assert.equal(ownership(c)['skill:ember-form'], 'open', 'open to learn is not owned');
  assert.equal(yardOffer(c, 'skill:ember-form'), null);
  assert.equal(yardOffer(c, 'spell:aegis'), null, 'Classic: Aegis waits for Infinite III');
  assert.ok(yardOffer(exploration(), 'spell:aegis'), 'Exploration: Aegis is held from the start');
  assert.equal(yardOffer(c, 'no-such-ability'), null);
  // The how-to page draws the button from yardOffer, only while Proving Ground access is on, through the one handoff.
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /const offer=provingGroundAccess\(settings\)\?yardOffer\(save,id\):null;\s*if\(offer\)/);
  assert.match(main, /handOverJourney\(b,\{yard:yardRequest\(save,offer\.id\)/);
  assert.match(main, /writeHandoff\(handoffRecord\(save,\{release:\d+,slot:getActiveSlot\(\),returnUrl:location\.href\.split\("#"\)\[0\],yard\}\)\)/);
  assert.equal(TRAINING_YARD.practice, 'Practice: nothing here is kept');
});

test('phase 5: the preset lends only owned abilities; an unowned id is refused and nothing is granted', () => {
  const c = classic(), before = JSON.stringify(c);
  for (const id of ['spell:aegis', 'skill:rift-step', 'skill:ember-form', 'gear:quandrix-staff', 'no-such-ability', undefined]) {
    assert.ok(yardRefusal(c, id), `${id} refused`);
    assert.throws(() => yardRequest(c, id), `${id}: no request`);
    const copy = structuredClone(c); assert.throws(() => lendYardAbility(copy, id), `${id}: not lent`);
    assert.equal(JSON.stringify(copy), before, `${id}: a refused lend leaves the save as it was`);
    assert.throws(() => yardOf(c, id), /not yours yet|does not know|cannot be practised/, `${id}: no yard built`);
  }
  assert.throws(() => createYardFixture(handoffRecord(c), 0), 'a plain journey handoff is not a yard');
  // A forged record naming an unowned ability is refused on the laboratory side too.
  const forged = handoffRecord(c); forged.yard = { ability: 'spell:aegis', version: 1 };
  assert.throws(() => createYardFixture(forged, 0), /Aegis is not yours yet/);
  assert.equal(JSON.stringify(c), before, 'the journey is never touched');
});

test('phase 5: an owned ability is readied on the scratch copy only (slot, notch, hand)', () => {
  const c = classic(); const echo = ECHO_IDS[0]; c.echoes.owned[echo] = true;
  c.inventory.push(structuredClone(BRAWLER_GEAR.find((q) => q.item.name === 'Iron Fists').item)); // a found pair, in the pack
  const before = JSON.stringify(c);
  const spell = yardOf(c, 'spell:ember-ring');
  assert.ok(Object.values(spell.save.magicSkills.slots).includes('spell:ember-ring'));
  assert.match(spell.lent, /Ember Ring is in slot/);
  const e = yardOf(c, `echo:${echo}`);
  assert.ok(e.save.echoes.equipped.includes(echo), 'the Echo is set in a notch');
  assert.equal(e.save.echoes.owned[echo], true);
  const fists = c.inventory.findIndex((q) => q.slot === 'primary' && weaponKey(q) === 'iron-fists');
  assert.ok(fists >= 0, 'the brawler gear is in the pack');
  const g = yardOf(c, 'gear:iron-fists');
  assert.equal(weaponKey(g.save.equipment.primary), 'iron-fists', 'equipped in the yard');
  assert.equal(weaponKey(c.equipment.primary), 'salvage-blade', 'not in the journey');
  assert.equal(JSON.stringify(c), before, 'the journey object is unchanged by every lend');
  const x = exploration(); const aegis = yardOf(x, 'spell:aegis');
  assert.ok(Object.values(aegis.save.magicSkills.slots).includes('spell:aegis'));
  // Nothing new is learned: what the copy owns is what the journey owns.
  for (const f of [spell, e, g]) { const a = ownership(f.save), b = ownership(c); for (const id of Object.keys(b)) if (b[id] !== 'owned') assert.notEqual(a[id], 'owned', `${id} was not lent`); }
});

test('phase 5: the yard is the Standard Test Tile with dummies and foes suited to the ability', () => {
  const c = classic(), x = exploration();
  const check = (f, setupKey) => {
    const setup = TRAINING_YARD.setups[setupKey];
    assert.equal(f.setup, setupKey); assert.equal(f.yard, true); assert.equal(f.journey, true);
    assert.equal(f.game.area, 'overworld'); assert.equal(f.game.rx, TEST_TILE.rx); assert.equal(f.game.ry, TEST_TILE.ry);
    assert.equal(f.game.map.testTile, true); assert.equal(f.save.seed, TEST_TILE.seed);
    assert.equal(f.game.paused, false);
    const dummies = f.game.enemies.filter((q) => q.yardDummy), foes = f.game.enemies.filter((q) => !q.yardDummy);
    assert.equal(dummies.length, setup.dummies); assert.deepEqual(foes.map((q) => q.kind), [...setup.foes]);
    for (const d of dummies) { assert.equal(d.passiveBehavior, 'practice'); assert.equal(d.hp, TRAINING_YARD.dummy.hp); }
    assert.ok(f.game.message.includes(TRAINING_YARD.practice));
    return { dummies, foes };
  };
  check(yardOf(c, 'gear:salvage-blade'), 'standard');
  const area = check(yardOf(c, 'spell:ember-ring'), 'area');
  const spread = Math.max(...area.dummies.map((a) => Math.max(...area.dummies.map((b) => Math.hypot(a.x - b.x, a.y - b.y)))));
  assert.ok(spread <= 3, `area dummies stand together (${spread})`);
  check(yardOf(x, 'spell:aegis'), 'parry');
  // Deterministic: the same journey and ability give the same yard.
  const a = yardOf(c, 'gear:salvage-blade', 0), b = yardOf(c, 'gear:salvage-blade', 0);
  assert.deepEqual(a.game.enemies.map((q) => [q.id, q.kind, q.x, q.y]), b.game.enemies.map((q) => [q.id, q.kind, q.x, q.y]));
  // A journey left in a dungeon still comes to the yard.
  const deep = classic('YARD-D'); Object.assign(deep.session, { area: 'dungeon', activeDungeonId: 'somewhere:1', dungeonReturn: { rx: 3, ry: 4, x: 10, y: 10 } });
  const d = yardOf(deep, 'gear:salvage-blade'); assert.equal(d.game.area, 'overworld'); assert.equal(d.save.session.activeDungeonId, null);
  // The dummies take hits and stay put; the yard runs.
  const f = yardOf(c, 'spell:ember-ring'), start = f.game.enemies.map((q) => [q.x, q.y]);
  run(f.game, 40, 0, 0, 1000);
  assert.deepEqual(f.game.enemies.filter((q) => q.yardDummy).map((q) => [q.x, q.y]), start.slice(0, 5), 'practice dummies stand still');
});

test('phase 5: the yard handoff writes only the laboratory database, and the round trip leaves the journey byte-identical', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  const s = freshSave(); s.seed = 'YARD-TRIP'; s.name = 'Yard Wayfarer'; startJourney(s, { mode: 0 });
  s.futureField = { kept: [1, 2] }; s.session.futureSession = 'kept';
  P.setActiveSlot(1);
  const game = new Game(s, 1000); let now = run(game, 20, 1, 0.3, 1000);
  game.player.hp = Math.max(1, game.player.hp - 7); game.setPaused(true, now); // the Journal is open: paused
  await P.saveGame(game.exportSnapshot(now)); await P.flushSaves();
  const before = dump(ctl, PRODUCTION_DB), beforeLs = dumpLs(ctl), live = JSON.stringify(s);
  assert.ok(ctl.dbs.get(PRODUCTION_DB).size > 0);

  // Try it: the same one record, with the yard request in it, into the laboratory's own database.
  const offer = yardOffer(s, 'gear:salvage-blade'); assert.ok(offer);
  ctl.opened.length = 0;
  await writeHandoff(handoffRecord(s, { release: 0, slot: P.getActiveSlot(), returnUrl: 'https://x.test/', yard: yardRequest(s, offer.id) }));
  assert.deepEqual(ctl.opened, [PROVING_GROUND_HANDOFF.db], 'only the laboratory database is opened');
  assert.equal(dump(ctl, PRODUCTION_DB), before, 'the production database is untouched'); assert.equal(dumpLs(ctl), beforeLs);

  const record = await takeHandoff();
  assert.deepEqual(record.yard, { ability: 'gear:salvage-blade', version: TRAINING_YARD.version });
  assert.equal(await takeHandoff(), null, 'taken once');
  const recordText = JSON.stringify(record.save);
  const yard = createYardFixture(record, 50000);
  assert.notEqual(yard.save, record.save);
  // Practise: fight, wound, spend, export as a save would.
  let t = run(yard.game, 120, -1, 0.2, 50000);
  yard.save.currency = 99999; yard.save.level = 70; yard.game.player.hp = 1; yard.save.futureField.kept.push(3);
  yard.game.exportSnapshot(t);
  assert.equal(JSON.stringify(record.save), recordText, 'the record is not changed by the yard');
  assert.equal(dump(ctl, PRODUCTION_DB), before, 'the yard never wrote the production database');
  assert.equal(dumpLs(ctl), beforeLs, 'nor production localStorage');
  assert.equal(JSON.stringify(s), live, 'nor the production page\'s journey object');
  assert.deepEqual([...ctl.dbs.keys()].sort(), [PRODUCTION_DB, PROVING_GROUND_HANDOFF.db].sort());

  // Back to your journey: production loads again, byte-identical, and resumes where it was.
  const stored = migrateSave(structuredClone(record.save));
  const resumed = await (await freshPersistence()).loadSave();
  assert.equal(JSON.stringify(resumed), JSON.stringify(stored), 'byte-identical journey after the round trip');
  assert.deepEqual(resumed.futureField, { kept: [1, 2] }); assert.equal(resumed.session.futureSession, 'kept');
  const back = new Game(resumed, 90000);
  assert.equal(back.area, game.area); assert.equal(back.rx, game.rx); assert.equal(back.ry, game.ry);
  assert.equal(back.player.x, game.player.x); assert.equal(back.player.y, game.player.y); assert.equal(back.player.hp, game.player.hp);
  assert.equal(back.paused, true);
  // The plain journey entry still plays the journey where it was (the yard field is only read when present).
  const plain = createJourneyFixture(handoffRecord(s), 0); assert.equal(plain.game.rx, game.rx); assert.equal(plain.yard, undefined);
  assert.equal(handoffRecord(s).yard, undefined, 'a plain entry carries no yard field');
});

test('phase 5: the yard lives in the laboratory graph, isolated, and is wired through the existing handoff', () => {
  const seen = new Set(), sources = new Map();
  const visit = (name) => {
    if (seen.has(name)) return; seen.add(name);
    const path = new URL(`../src/${name}.ts`, import.meta.url); assert.ok(existsSync(path), name);
    const text = readFileSync(path, 'utf8'); sources.set(name, text);
    for (const m of text.matchAll(/(?:from\s*|import\s*)["']\.\/([\w-]+)\.ts["']/g)) visit(m[1]);
  };
  visit('proving-ground-mobile');
  assert.ok(seen.has('training-yard'), 'the yard is part of the laboratory');
  assert.equal(seen.has('persistence'), false); assert.equal(seen.has('main'), false);
  const yard = sources.get('training-yard');
  assert.doesNotMatch(yard, /indexedDB|localStorage|sessionStorage|["'`]infinite-corridor/, 'the yard opens no storage');
  const pg = sources.get('proving-ground');
  assert.match(pg, /if\(record\.yard\)openYard\(\);else openJourney\(\)/);
  assert.match(pg, /selectedLab==="yard"\?createYardFixture\(journeyRecord,performance\.now\(\)\)/);
  assert.match(pg, /yardBar\.querySelector\("#yardBack"\)\.onclick=exitToGame/, 'Back to your journey is Exit to game');
  assert.match(readFileSync(new URL('../styles.css', import.meta.url), 'utf8'), /body\.training-yard #provingGroundPanel,body\.training-yard #pgIdentity\{display:none\}/, 'developer chrome hidden');
  for (const f of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(f, import.meta.url), 'utf8'), /src\/training-yard\.js\?v=\d+/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'training-yard'/);
});
