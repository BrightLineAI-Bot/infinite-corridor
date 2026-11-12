// Release 791: Options → System → Enter Proving Ground plays a scratch copy of the journey in the laboratory, and Exit to
// game resumes the production journey as if nothing had happened. These tests drive the real persistence module and the
// real handoff module against an in-memory IndexedDB that keeps each database apart, so they can show which database
// every write lands in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { freshSave, migrateSave } from '../src/types.ts';
import { Game } from '../src/game.ts';
import { normalizeSettings, DEFAULT_SETTINGS } from '../src/persistence.ts';
import { PROVING_GROUND_HANDOFF, provingGroundAccess, provingGroundOptionRows, handoffRecord, writeHandoff, takeHandoff, clearHandoff, createJourneyFixture, productionHome, exitTarget, releaseIdentityUrl } from '../src/proving-ground-handoff.ts';

// An in-memory IndexedDB with one key space per database name, plus localStorage.
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
const freshPersistence = () => import(`../src/persistence.ts?pg791=${++instance}`); // a new page load: module state anew
const PRODUCTION_DB = 'infinite-corridor';
const dump = (ctl, name) => JSON.stringify([...(ctl.dbs.get(name) || new Map()).entries()].sort(([a], [b]) => String(a).localeCompare(String(b))));
const dumpLs = (ctl) => JSON.stringify([...ctl.ls.entries()].sort());
const walk = (g, frames, x, y, start) => { const input = { state: { x, y }, consume: () => false, held: () => false }; let t = start; for (let i = 0; i < frames; i++) { g.update(0.05, input, t); t += 50; } return t; };

// A journey with unknown fields at every level, part way through a walk, saved the way Options saves it (paused, flushed).
async function productionJourney(ctl, P) {
  const s = freshSave(); s.seed = 'PG-791'; s.name = 'Handoff Wayfarer';
  s.futureField = { kept: [1, 2, 3] }; s.session.futureSession = 'kept'; s.session.playerRuntime.futureRuntime = { kept: true };
  s.lumenDust = 7;
  P.setActiveSlot(1);
  const game = new Game(s, 1000);
  let now = walk(game, 30, 1, 0.4, 1000);
  game.player.hp = Math.max(1, game.player.hp - 9); // a wound, for the exact resume
  game.setPaused(true, now); // Options open: the Corridor is paused
  await P.saveGame(game.exportSnapshot(now)); await P.flushSaves(); // persist(); flushSaves()
  return { save: s, game, now };
}

test('791: Proving Ground access is on by default, survives a round trip, and off hides only the entry', () => {
  assert.equal(DEFAULT_SETTINGS.provingGround, true);
  assert.equal(normalizeSettings({}).provingGround, true);
  assert.equal(normalizeSettings({ provingGround: false }).provingGround, false);
  assert.equal(normalizeSettings(JSON.parse(JSON.stringify(normalizeSettings({ provingGround: false })))).provingGround, false);
  assert.equal(normalizeSettings({ provingGround: 'yes' }).provingGround, true, 'only an explicit false turns it off');
  assert.equal(provingGroundAccess(normalizeSettings({})), true);
  assert.deepEqual(provingGroundOptionRows(normalizeSettings({})), ['access', 'enter']);
  assert.deepEqual(provingGroundOptionRows(normalizeSettings({ provingGround: false })), ['access'], 'the setting stays so it can be turned back on');
  // Options → System builds exactly these rows, and Enter Proving Ground exists nowhere else.
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  assert.match(main, /grid\.append\(pre,copy,latest\);provingGroundRows\(grid\)/);
  assert.match(main, /function provingGroundRows\(grid\)\{for\(const row of provingGroundOptionRows\(settings\)\)/);
  assert.equal(main.match(/enterProvingGround\(/g).length, 2, 'defined once, called once (from the entry row)');
  assert.equal(main.match(/"Enter Proving Ground"/g).length, 1);
});

test('791: the handoff is written to the laboratory database only, and taken exactly once', async () => {
  const ctl = fakeStorage();
  const save = freshSave(); save.seed = 'ONCE';
  await writeHandoff(handoffRecord(save, { release: 791, slot: 2, returnUrl: 'https://x.test/', now: Date.now() }));
  assert.deepEqual([...ctl.dbs.keys()], [PROVING_GROUND_HANDOFF.db]);
  assert.ok(PROVING_GROUND_HANDOFF.db.startsWith(PROVING_GROUND_HANDOFF.namespace));
  assert.notEqual(PROVING_GROUND_HANDOFF.db, PRODUCTION_DB);
  const first = await takeHandoff();
  assert.equal(first.save.seed, 'ONCE'); assert.equal(first.slot, 2); assert.equal(first.release, 791);
  assert.equal(ctl.dbs.get(PROVING_GROUND_HANDOFF.db).size, 0, 'taking it deletes it');
  assert.equal(await takeHandoff(), null, 'a second take finds nothing');
  // A record left by an entry that never arrived is dropped, not played; so is anything not a handoff.
  await writeHandoff(handoffRecord(save, { now: Date.now() - PROVING_GROUND_HANDOFF.maxAgeMs - 1 }));
  assert.equal(await takeHandoff(), null); assert.equal(ctl.dbs.get(PROVING_GROUND_HANDOFF.db).size, 0);
  await writeHandoff({ format: 'something-else', save });
  assert.equal(await takeHandoff(), null); assert.equal(ctl.dbs.get(PROVING_GROUND_HANDOFF.db).size, 0);
  await writeHandoff(handoffRecord(save)); await clearHandoff();
  assert.equal(ctl.dbs.has(PROVING_GROUND_HANDOFF.db), false, 'Reset Proving Ground data drops a waiting handoff');
});

test('791: enter and exit leave the production journey byte-identical, and the scratch copy starts from it', async () => {
  const ctl = fakeStorage(), P = await freshPersistence();
  const { save, game, now } = await productionJourney(ctl, P);
  const before = dump(ctl, PRODUCTION_DB), beforeLs = dumpLs(ctl), live = JSON.stringify(save);
  assert.ok(ctl.dbs.get(PRODUCTION_DB).size > 0, 'the journey is stored');

  // Enter: the copy goes to the laboratory's own database; nothing production changes.
  await writeHandoff(handoffRecord(save, { release: 791, slot: P.getActiveSlot(), returnUrl: 'https://x.test/' }));
  assert.equal(dump(ctl, PRODUCTION_DB), before); assert.equal(dumpLs(ctl), beforeLs);

  // The laboratory takes it once and plays a scratch copy.
  const record = await takeHandoff();
  assert.ok(record); assert.equal(await takeHandoff(), null);
  const stored = await (await freshPersistence()).loadSave(); // what a reload of production would load
  assert.deepEqual(migrateSave(structuredClone(record.save)), stored, 'the scratch copy starts from the flushed production journey');
  assert.equal(record.save.updatedAt, stored.updatedAt, 'the very save that was flushed');
  const lab = createJourneyFixture(record, 50000);
  assert.equal(lab.game.area, game.area); assert.equal(lab.game.rx, game.rx); assert.equal(lab.game.ry, game.ry);
  assert.equal(lab.game.player.x, game.player.x); assert.equal(lab.game.player.y, game.player.y);
  assert.equal(lab.game.player.hp, game.player.hp, 'same wound');
  assert.deepEqual(lab.save.equipment, save.equipment, 'same gear');
  assert.deepEqual(lab.save.futureField, { kept: [1, 2, 3] }); assert.equal(lab.save.session.futureSession, 'kept');
  assert.equal(lab.game.paused, false, 'the laboratory starts the copy running');
  assert.notEqual(lab.save, record.save, 'a copy of the record, not the record');

  // Mess with things: walk away, spend, wound, change gear, export as a save would.
  let t = walk(lab.game, 120, -1, -0.6, 50000);
  assert.ok(Math.hypot(lab.game.player.x - game.player.x, lab.game.player.y - game.player.y) > 1, 'the scratch Wayfarer walked away');
  lab.save.lumenDust = 999; lab.save.level = 60; lab.save.equipment.primary = null; lab.game.player.hp = 1;
  lab.save.futureField.kept.push(4); lab.save.session.futureSession = 'changed';
  lab.game.exportSnapshot(t);
  assert.equal(dump(ctl, PRODUCTION_DB), before, 'the laboratory never wrote the production database');
  assert.equal(dumpLs(ctl), beforeLs, 'nor production localStorage');
  assert.equal(JSON.stringify(save), live, 'nor the production page\'s own journey object');
  assert.deepEqual([...ctl.dbs.keys()].sort(), [PRODUCTION_DB, PROVING_GROUND_HANDOFF.db].sort());

  // Exit to game: production loads again and resumes exactly where it was.
  const P2 = await freshPersistence(), resumed = await P2.loadSave();
  assert.equal(JSON.stringify(resumed), JSON.stringify(stored), 'byte-identical journey after the round trip');
  assert.deepEqual(resumed.futureField, { kept: [1, 2, 3] }); assert.equal(resumed.session.futureSession, 'kept');
  assert.deepEqual(resumed.session.playerRuntime.futureRuntime, { kept: true });
  assert.equal(resumed.lumenDust, 7);
  const back = new Game(resumed, 90000);
  assert.equal(back.area, game.area); assert.equal(back.rx, game.rx); assert.equal(back.ry, game.ry);
  assert.equal(back.player.x, game.player.x); assert.equal(back.player.y, game.player.y);
  assert.equal(back.player.hp, game.player.hp); assert.equal(back.player.facing, game.player.facing);
  assert.equal(back.paused, true, 'it comes back paused, as Options left it');
  assert.deepEqual(back.save.equipment, save.equipment);
  void now;
});

test('791: the laboratory page never loads production persistence or names a production key', () => {
  const seen = new Set(), sources = new Map();
  const visit = (name) => {
    if (seen.has(name)) return; seen.add(name);
    const path = new URL(`../src/${name}.ts`, import.meta.url);
    assert.ok(existsSync(path), name);
    const text = readFileSync(path, 'utf8'); sources.set(name, text);
    for (const m of text.matchAll(/(?:from\s*|import\s*)["']\.\/([\w-]+)\.ts["']/g)) visit(m[1]);
  };
  visit('proving-ground-mobile');
  assert.ok(seen.has('proving-ground-handoff'));
  assert.equal(seen.has('persistence'), false, 'no persistence.ts in the laboratory graph');
  assert.equal(seen.has('main'), false, 'no main.ts in the laboratory graph');
  // Only the reviewed handoff and candidate-scoped recovery adapters may open IndexedDB.
  const idb = [...sources].filter(([, text]) => /indexedDB/.test(text)).map(([name]) => name);
  assert.deepEqual(idb.sort(), ['proving-ground-handoff', 'proving-ground-recovery']);
  const handoff = sources.get('proving-ground-handoff');
  assert.doesNotMatch(handoff, /["'`]infinite-corridor["':]/, 'no production database or key');
  assert.match(handoff, /idb\.open\(PROVING_GROUND_HANDOFF\.db/);
  // The laboratory's own localStorage keys stay under its own names.
  for (const [name, text] of sources) assert.doesNotMatch(text, /["'`]infinite-corridor:/, `${name} names a production localStorage key`);
  // A frozen candidate preview refuses any parent-path literal in its modules (release-artifact.mjs validatePreview).
  for (const [name, text] of sources) assert.doesNotMatch(text, /["'`]\.\.\//, `${name} has a parent-path literal`);
  // Its worker never caches the published identity, and the production worker precaches the new module.
  assert.match(readFileSync(new URL('../proving-ground/sw.js', import.meta.url), 'utf8'), /release-identity\.json"\)\)return/);
  for (const f of ['../sw.js', '../proving-ground/sw.js']) assert.match(readFileSync(new URL(f, import.meta.url), 'utf8'), /src\/proving-ground-handoff\.js\?v=926/);
  assert.match(readFileSync(new URL('../scripts/build.mjs', import.meta.url), 'utf8'), /'proving-ground-handoff'/);
});

test('791: Exit to game and Get latest release find the production page beside the laboratory only', () => {
  assert.equal(productionHome('https://x.test/proving-ground/?from=game'), 'https://x.test/');
  assert.equal(productionHome('https://x.test/sub/proving-ground/index.html'), 'https://x.test/sub/');
  assert.equal(productionHome('https://x.test/previews/r791-abc/'), null, 'a candidate preview is the laboratory alone');
  assert.equal(exitTarget('https://x.test/proving-ground/?from=game', { returnUrl: 'https://x.test/?perf' }), 'https://x.test/?perf');
  assert.equal(exitTarget('https://x.test/proving-ground/', { returnUrl: 'https://evil.test/' }), 'https://x.test/', 'never another site');
  assert.equal(exitTarget('https://x.test/proving-ground/', { returnUrl: 'https://x.test/proving-ground/' }), 'https://x.test/');
  assert.equal(exitTarget('https://x.test/proving-ground/', null), 'https://x.test/');
  assert.equal(exitTarget('https://x.test/previews/r1/', null), null);
  assert.equal(releaseIdentityUrl('https://x.test/proving-ground/'), 'https://x.test/release-identity.json');
  assert.equal(releaseIdentityUrl('https://x.test/previews/r1/'), 'https://x.test/previews/r1/release-identity.json');
  // The laboratory page carries both buttons; Exit starts hidden and shows only where a game is beside it.
  const html = readFileSync(new URL('../proving-ground/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="pgLatest"[^>]*>Get latest release</); assert.match(html, /id="pgExit" type="button" hidden>Exit to game</);
  assert.match(html, /document\.documentElement\.dataset\.release = release/);
  const pg = readFileSync(new URL('../src/proving-ground.ts', import.meta.url), 'utf8');
  assert.match(pg, /exit\.hidden=!exitTarget\(location\.href,null\)/);
  assert.match(pg, /if\(query\.get\("from"\)==="game"\)takeHandoff\(\)/);
});

test('791: a journey copy migrates like any load, so an older journey plays in the laboratory too', () => {
  const old = JSON.parse(JSON.stringify(freshSave())); old.seed = 'OLD'; old.version = 9; old.legacyThing = 'kept';
  const lab = createJourneyFixture(handoffRecord(old), 0);
  assert.equal(lab.save.legacyThing, 'kept');
  assert.equal(lab.save.version, migrateSave(structuredClone(old)).version);
  assert.equal(old.version, 9, 'the record itself is not migrated in place');
});
