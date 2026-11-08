// Release 791 (Tim: "in options, there should just be Enter Proving Ground... you can start messing with things based on
// your save, and then you can go back to options and hit exit to game, and then you should be able to just go back to your
// save to where you were as if nothing had happened"; and a setting so it "can turn it off later").
//
// The handoff is one-way and one-shot. The production page flushes its journey, then writes ONE record (a copy of the save)
// into the Proving Ground's own IndexedDB database, and opens the Proving Ground page. The Proving Ground reads that record
// and deletes it in the same transaction, then plays a scratch copy in memory. It never imports persistence.ts (the release
// artifact refuses a laboratory graph that does) and nothing in this module names a production storage key, so nothing the
// player does in the Proving Ground can reach a production journey. Exit to game opens the production page, which loads the
// journey it flushed, untouched.
import { Game } from "./game.js?v=r837-c5344e998396";
import { migrateSave } from "./types.js?v=r837-c5344e998396";

export const PROVING_GROUND_HANDOFF = Object.freeze({
  namespace: "ic-proving-ground-scratch-v1", // the Proving Ground's storage namespace (proving-ground-mobile.ts resets it)
  db: "ic-proving-ground-scratch-v1:handoff", // its own IndexedDB database, never the production journeys database
  store: "handoff",
  key: "journey",
  format: "ic-proving-ground-handoff",
  version: 1,
  maxAgeMs: 15 * 60 * 1000, // a record older than this was left by an entry that never arrived; it is dropped, not played
  entryPath: "proving-ground/?from=game", // relative to the production page
});

// "Proving Ground access" (Options → System): on by default; off hides Enter Proving Ground.
export const provingGroundAccess = (settings) => settings?.provingGround !== false;
// The rows Options → System shows for it, in order: the setting always, the entry only while access is on.
export const provingGroundOptionRows = (settings) => provingGroundAccess(settings) ? ["access", "enter"] : ["access"];

export function handoffRecord(save, { release = null, slot = 1, returnUrl = "", now = Date.now() } = {}) {
  return { format: PROVING_GROUND_HANDOFF.format, version: PROVING_GROUND_HANDOFF.version, release, slot, returnUrl: String(returnUrl || ""), createdAt: now, save };
}

function openHandoffDb(idb) {
  return new Promise((resolve, reject) => {
    const q = idb.open(PROVING_GROUND_HANDOFF.db, 1);
    q.onupgradeneeded = () => { if (!q.result.objectStoreNames.contains(PROVING_GROUND_HANDOFF.store)) q.result.createObjectStore(PROVING_GROUND_HANDOFF.store); };
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });
}
function done(db, tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close?.(); resolve(undefined); };
    tx.onerror = tx.onabort = () => { db.close?.(); reject(tx.error || new Error("Proving Ground handoff failed")); };
  });
}

// Production side. IndexedDB copies the record as it is put, so the live save is never shared with the laboratory.
export async function writeHandoff(record, idb = globalThis.indexedDB) {
  if (!idb) throw new Error("This browser has no IndexedDB, so the Proving Ground cannot take a copy of the journey.");
  const db = await openHandoffDb(idb), tx = db.transaction(PROVING_GROUND_HANDOFF.store, "readwrite"), finished = done(db, tx);
  tx.objectStore(PROVING_GROUND_HANDOFF.store).put(record, PROVING_GROUND_HANDOFF.key);
  await finished;
}

// Proving Ground side: read and delete in one transaction, so a record plays at most once.
export async function takeHandoff(idb = globalThis.indexedDB, now = Date.now()) {
  if (!idb) return null;
  const db = await openHandoffDb(idb), tx = db.transaction(PROVING_GROUND_HANDOFF.store, "readwrite"), finished = done(db, tx), store = tx.objectStore(PROVING_GROUND_HANDOFF.store);
  let record = null;
  const q = store.get(PROVING_GROUND_HANDOFF.key);
  q.onsuccess = () => { record = q.result ?? null; store.delete(PROVING_GROUND_HANDOFF.key); };
  await finished;
  if (!record || record.format !== PROVING_GROUND_HANDOFF.format || !record.save || typeof record.save !== "object") return null;
  if (!(now - Number(record.createdAt) <= PROVING_GROUND_HANDOFF.maxAgeMs)) return null;
  return record;
}

// "Reset Proving Ground data" also drops a handoff that was never taken.
export function clearHandoff(idb = globalThis.indexedDB) {
  return new Promise((resolve) => { try { const q = idb.deleteDatabase(PROVING_GROUND_HANDOFF.db); q.onsuccess = q.onerror = q.onblocked = () => resolve(undefined); } catch { resolve(undefined); } });
}

// The laboratory's journey: a scratch copy of the handed-over save (its own objects, migrated like any load), played in
// memory. Its fields follow the other lab fixtures so the panel's report and teleports work unchanged.
export function createJourneyFixture(record, now = 0) {
  const save = migrateSave(structuredClone(record.save));
  const game = new Game(save, now);
  game.installSystems();
  if (game.paused) game.setPaused(false, now); // Options paused it for the flush; the laboratory starts it running
  return { lab: "journey", scenario: "your-journey", label: `Your journey: ${save.name || "Wayfarer"} (scratch copy)`, seed: save.seed, variant: 0, production: "handoff", journey: true, record, save, game };
}

// Where the production game lives, seen from the laboratory page: only the /proving-ground/ page has one beside it (a
// frozen candidate preview is the laboratory alone).
export function productionHome(href) {
  const url = new URL(href);
  if (!/\/proving-ground\/(index\.html)?$/.test(url.pathname)) return null;
  return url.origin + url.pathname.replace(/proving-ground\/(index\.html)?$/, ""); // the parent folder (a frozen preview allows no parent-path literal)
}
// Get latest release reads the published identity from the site root (the laboratory's worker never caches it).
export const releaseIdentityUrl = (href) => new URL("release-identity.json", productionHome(href) || new URL("./", href)).href;
// Exit to game: the page the journey came from when it is that production page (same origin, beside this laboratory),
// otherwise the production home.
export function exitTarget(href, record = null) {
  const home = productionHome(href);
  if (!home) return null;
  try { const back = new URL(record?.returnUrl || "", home); if (back.origin === new URL(home).origin && back.pathname === new URL(home).pathname) return back.href; } catch {}
  return home;
}
