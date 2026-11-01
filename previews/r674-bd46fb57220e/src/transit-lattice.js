// The Transit Lattice (release 363; Tim, 2026-10-23: "after infinite 3, you get... [a Transit Lattice] that lets you mix...
// passive abilities... an echo ability or one of your arcanum... passive abilities... tied to the gate system... every
// time you complete the gate... you get... [Transit Coordinates]... as many... as... components... to complete the gate + 1
// [for the Listener]... 2 slots for constellation passives, and one slot for echoes... up to... 3 more... and 3 more
// passive echoes... spend [coordinates] to unlock a new... slot... unlocked after [the] Listener quest one time and...
// infinite 3"). The lore is Tim's too: the Lattice bends reality to bridge different eventualities, drawing in the
// coordinates of other Transit Lattices in the Corridor, where that passive also exists, and merging them into yours.
//
// State: save.lattice (additive): `coordinates` to spend, `paidFor` (Listener kills already paid out), `extra` slots bought
// per kind, and what is set: `passives` (a constellation node id for its primary form, `id:alt` for its secondary) and
// `echoes` (Echo ids). What a passive or Echo set here does is read by constellation.ts (nodeOn/altOn) and echoes.ts
// (activeEchoes); setting one is done there, so this module stays free of both. Balance as data.
import { APERTURE_BANDS, apertureBand } from "./items.js?v=r674-bd46fb57220e";
import { piecesNeeded } from "./far-array.js?v=r674-bd46fb57220e";

export const TRANSIT_LATTICE = { openTier: 13, openListeners: 1, base: { passive: 2, echo: 1 }, extra: { passive: 3, echo: 3 }, costs: [4, 4, 5, 5, 6, 6] };
export const LATTICE_LORE = "The Transit Lattice bends the air between eventualities. Each Transit Coordinate is the place of another Lattice somewhere in the Corridor, in a history where a different passive was learned; drawn in, it merges with yours, though it was always the same Lattice. So passives from other possibilities can hold in you at once.";
export const KINDS = ["passive", "echo"];

const listenersOf = (save) => Math.max(0, Math.floor(Number(save?.farArray?.listeners) || 0));
// Coordinates a Listener kill pays: the pieces its Gate needed, plus one for the Listener. Gate k was open for kill k.
export const coordinatesFor = (kill) => piecesNeeded(kill) + 1;

export function ensureLattice(save) {
  const l = save.lattice && typeof save.lattice === "object" ? save.lattice : {}, int = (v, max = Infinity) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const list = (v) => (Array.isArray(v) ? v : []).filter((q, i, a) => typeof q === "string" && q && a.indexOf(q) === i);
  const extra = { passive: int(l.extra?.passive, TRANSIT_LATTICE.extra.passive), echo: int(l.extra?.echo, TRANSIT_LATTICE.extra.echo) };
  save.lattice = { coordinates: int(l.coordinates), paidFor: int(l.paidFor), extra, passives: list(l.passives).slice(0, TRANSIT_LATTICE.base.passive + extra.passive), echoes: list(l.echoes).slice(0, TRANSIT_LATTICE.base.echo + extra.echo) };
  grantCoordinates(save);
  return save.lattice;
}
// Pays every Listener kill not yet paid (kills from before this release included). Returns the coordinates added.
export function grantCoordinates(save) {
  const l = save.lattice; if (!l) return 0;
  let added = 0; while (l.paidFor < listenersOf(save)) { l.paidFor++; added += coordinatesFor(l.paidFor); }
  l.coordinates += added;
  return added;
}
export const latticeOpen = (save) => APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0)) >= TRANSIT_LATTICE.openTier && listenersOf(save) >= TRANSIT_LATTICE.openListeners;
export function latticeWhy(save) {
  if (latticeOpen(save)) return "";
  const band = APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0)) >= TRANSIT_LATTICE.openTier, fell = listenersOf(save) >= TRANSIT_LATTICE.openListeners;
  return `The Transit Lattice opens at the ${APERTURE_BANDS[TRANSIT_LATTICE.openTier].name} band${band ? "" : " (not yet)"} once a Listener has fallen${fell ? "" : " (not yet)"}.`;
}
export const latticeSlots = (save, kind) => TRANSIT_LATTICE.base[kind] + (save?.lattice?.extra?.[kind] || 0);
export const nextSlotCost = (save) => TRANSIT_LATTICE.costs[(save?.lattice?.extra?.passive || 0) + (save?.lattice?.extra?.echo || 0)] ?? null;
// What works now (nothing while the Lattice is closed).
export const latticePassives = (save) => (latticeOpen(save) ? (save.lattice?.passives || []) : []);
export const latticeEchoes = (save) => (latticeOpen(save) ? (save.lattice?.echoes || []) : []);

export function unlockSlot(save, kind) {
  const l = ensureLattice(save), cost = nextSlotCost(save);
  if (!KINDS.includes(kind)) return { ok: false, message: "Unknown slot." };
  if (!latticeOpen(save)) return { ok: false, message: latticeWhy(save) };
  if (l.extra[kind] >= TRANSIT_LATTICE.extra[kind]) return { ok: false, message: `The Lattice holds no more ${kind === "echo" ? "Echo" : "passive"} slots.` };
  if (cost === null || l.coordinates < cost) return { ok: false, message: `A new slot takes ${cost} Transit Coordinates (you have ${l.coordinates}).` };
  l.coordinates -= cost; l.extra[kind]++;
  return { ok: true, message: `${cost} coordinates drawn in: the Lattice opens another ${kind === "echo" ? "Echo" : "passive"} slot (${latticeSlots(save, kind)}).` };
}
// Sets or clears `key` in a kind's slots; `check(key)` returns a reason it cannot be set, or "". Used by constellation.ts
// and echoes.ts, which know what a key means.
export function toggleLatticeSlot(save, kind, key, label, check = () => "") {
  const l = ensureLattice(save), list = kind === "echo" ? l.echoes : l.passives;
  if (!latticeOpen(save)) return { ok: false, message: latticeWhy(save) };
  const i = list.indexOf(key);
  if (i >= 0) { list.splice(i, 1); return { ok: true, message: `${label} leaves the Lattice.` }; }
  const why = check(key); if (why) return { ok: false, message: why };
  if (list.length >= latticeSlots(save, kind)) return { ok: false, message: `Every ${kind === "echo" ? "Echo" : "passive"} slot in the Lattice is set. Clear one, or unlock another.` };
  list.push(key);
  return { ok: true, message: `${label} is drawn in from another history: it holds in the Lattice.` };
}
