// Glimpses (release 193; docs/narrative-bible.md section 5). A Glimpse is a short first-person scene: the Corridor seen
// for a few seconds through someone's, or something's, eyes. This module holds the catalogue and the rules (where a
// Glimpse may surface, how rarely it repeats, which fragment it gives); the drawing lives in glimpse-render.ts.
// Pure data and rules: no DOM.
import { readingAt, bookPieces, ensureLore, creditPiece } from "./lore.js?v=r682-b73c5512a0b0";

// `human` places a Glimpse on the drift from human residue (1) to the wholly unhuman (0). Near Ember Refuge the
// Corridor offers mostly human Glimpses, far out mostly unhuman ones, but every region keeps some of the other end.
export const GLIMPSES = {
  wagonAtDusk: { name: "The Wagon at Dusk", human: 1, seconds: 14, eyes: "two", reduced: [.18, .55, .9] },
  lanternFaceted: { name: "The Lantern, Faceted", human: .55, seconds: 12, eyes: "compound", reduced: [.2, .6, .92] },
  theRule: { name: "The Rule", human: 0, seconds: 13, eyes: "none", reduced: [.25, .6, .95] },
  // Release 199: the first batch of the full suite.
  theSky: { name: "The Sky", human: .95, seconds: 15, eyes: "two", reduced: [.2, .45, .75] },
  rainAtWindow: { name: "Rain at the Window", human: 1, seconds: 14, eyes: "two", reduced: [.2, .59, .85] },
  underTheIce: { name: "Under the Ice", human: .45, seconds: 13, eyes: "two", reduced: [.2, .6, .75] },
  theSpheres: { name: "The Spheres", human: .1, seconds: 14, eyes: "none", reduced: [.2, .5, .9] },
  edgeLight: { name: "Edge-Light", human: .05, seconds: 13, eyes: "none", reduced: [.2, .55, .9] },
  glyphRain: { name: "Glyph Rain", human: .2, seconds: 13, eyes: "other", reduced: [.1, .5, .62] },
  // Release 203: horror and violence (Tim: "some of the scenes need to be scenes of horror … some of them should be violent").
  fourthFloor: { name: "The Fourth Floor", human: .95, seconds: 14, eyes: "two", reduced: [.2, .5, .8], mature: true },
  theHunt: { name: "The Hunt", human: .4, seconds: 12, eyes: "heat", reduced: [.3, .66, .8], mature: true },
  theTrench: { name: "The Trench", human: .9, seconds: 14, eyes: "two", reduced: [.3, .55, .7], mature: true },
  theDrowning: { name: "The Drowning", human: .7, seconds: 13, eyes: "two", reduced: [.2, .5, .75], mature: true },
  theWheat: { name: "The Wheat", human: .75, seconds: 13, eyes: "two", reduced: [.3, .6, .8], mature: true },
  burningPlain: { name: "The Burning Plain", human: .3, seconds: 15, eyes: "two", reduced: [.2, .5, .8], mature: true },
  // Release 219: the legends. Gilgamesh (Tim: "the legend of Gilgamesh, this is what I meant"): the plant of life lost to a snake.
  thePlant: { name: "The Plant at the Bottom", human: .85, seconds: 16, eyes: "two", reduced: [.08, .38, .76] },
};
export const GLIMPSE_ORDER = Object.keys(GLIMPSES);
// How often each kind of moment surfaces a Glimpse, and how many times one Glimpse may ever be seen in a journey.
// Release 215 (Tim): story beats come from strange things (always), not from felling trees; ruins and crossings rarely.
export const GLIMPSE_CHANCE = { strange: 1, touch: .15, crossing: .2 };
export const GLIMPSE_MAX_SEEN = 1; // release 481 (Tim: "I shouldn't be [seeing] the same glimpses multiple times... just see them once, and then if I wanna see them again... look in the book"): was 3
// Depth (sections from the Refuge) at which the Corridor has wholly forgotten it was human.
export const GLIMPSE_DRIFT_DEPTH = 40;
export const GLIMPSE_FLOOR = .15; // the least weight any Glimpse keeps anywhere

export function glimpseSeen(save, id) { return Math.max(0, Number(save.lore?.glimpses?.[id]) || 0); }
// The human-ness the Corridor leans toward at this section: 1 at the Refuge, 0 at GLIMPSE_DRIFT_DEPTH and beyond.
export function humanDrift(rx, ry) { return Math.max(0, 1 - (Math.abs(Number(rx) || 0) + Math.abs(Number(ry) || 0)) / GLIMPSE_DRIFT_DEPTH); }
export function glimpseWeight(id, rx, ry) { return Math.max(GLIMPSE_FLOOR, 1 - Math.abs(GLIMPSES[id].human - humanDrift(rx, ry))); }

// Picks the Glimpse for a moment here, or null. Unseen Glimpses come first; once all are seen, one may return until
// it has been seen GLIMPSE_MAX_SEEN times. `rand` returns [0, 1).
// Release 293 (Tim: "a child safety setting... it turns off the terrifying or horror glimpses... the creatures and monsters
// are fine, but the glimpses that show like people getting killed... should be turned off"): with `family`, Glimpses marked
// `mature` (release 203's horror and violence) never surface. They stay in the save; turning the setting off brings them back.
export const glimpseAllowed = (id, family = false) => !!GLIMPSES[id] && !(family && GLIMPSES[id].mature);
export function pickGlimpse(save, rx, ry, rand, { family = false } = {}) {
  const order = GLIMPSE_ORDER.filter((id) => glimpseAllowed(id, family)), unseen = order.filter((id) => !glimpseSeen(save, id));
  const pool = unseen.length ? unseen : order.filter((id) => glimpseSeen(save, id) < GLIMPSE_MAX_SEEN);
  if (!pool.length) return null;
  const weights = pool.map((id) => glimpseWeight(id, rx, ry)), total = weights.reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll < 0) return pool[i]; }
  return pool[pool.length - 1];
}
// Should this moment surface a Glimpse? Returns its id or null.
export function glimpseFor(save, kind, rx, ry, rand, options = {}) {
  if (!(rand() < (GLIMPSE_CHANCE[kind] || 0))) return null;
  return pickGlimpse(save, rx, ry, rand, options);
}

// Records a Glimpse as witnessed at this section. The first sighting of a Glimpse gives the region one of its
// Glimpse fragments. Returns { readingId, piece, completed } when a fragment is found, else null.
export function witnessGlimpse(save, id, rx, ry) {
  ensureLore(save);
  if (!GLIMPSES[id]) return null;
  const first = !glimpseSeen(save, id);
  save.lore.glimpses[id] = glimpseSeen(save, id) + 1;
  if (!first) return null;
  const readingId = readingAt(rx, ry), have = save.lore.pieces[readingId] || [];
  return creditPiece(save, readingId, bookPieces(readingId).find((p) => p.kind === "glimpse" && !have.includes(p.id)));
}
export function witnessedGlimpses(save) { return GLIMPSE_ORDER.filter((id) => glimpseSeen(save, id)); }
