// The Pentagon (Tim, 2026-11-04: "so large that you don't know where it's gonna go... when you're walking by, you're like,
// what is that... as large as the Houses of Parliament... the Pentagon... so many different corridors... a central Courtyard...
// intimidating and imposing... then you get to go inside... explore the abandoned building... inhabited by ghouls"; roads go
// round it; ghouls, its story in relics; keys, trial rooms and pressure plates).
//
// A Pentagon covers a 3×3 block of sections round its centre section. Seen from the land it is a five-sided wall of building
// that runs on from section to section. Inside its outer ring of building lie five ring courts, walled apart at the corners;
// inside them an inner ring of building; inside that the central court, and in it the Heart, whose way down leads to the vault.
// The rings' buildings are chambers (areas of their own, like a labyrinth's): ten round the outer ring, five round the inner,
// joined round each ring by doors (some fallen shut), and opening onto the courts by doors of their own. Two gates in the
// outer facade let you in. The way to the Heart passes a sealed door whose key lies elsewhere, a door held shut unless a block
// is built onto its pressure plate, and the Heart itself stays sealed until three trial chambers have been cleared of their
// ghouls. Relics in the chambers tell what happened to the Fivefold Court. Everything is a hash of the seed and the centre;
// a Pentagon stands only where all nine sections are new ground (`atlas.pentVersion`).
import { hashSeed, rng, byHash } from "./random.js?v=r951-4925ab3898c1";
import { CLOSE_VIEW_ROOM_ROUTING, layCloseViewRooms, routingStairPair, routingNearLanding } from "./close-view-room-routing.js?v=r951-4925ab3898c1";
import { BUILDINGS, layFloor, layFloorV3, addInteriorTerrain, farthest } from "./great-buildings.js?v=r951-4925ab3898c1";
import { carveMaze } from "./labyrinths.js?v=r951-4925ab3898c1";
import { LIFT_PER_LEVEL as LIFT } from "./landscape.js?v=r951-4925ab3898c1";
import { grantTesseract } from "./tesseracts.js?v=r951-4925ab3898c1";
import { PENTAGON_HALLS, assignPentagonHalls, layPentagonHall, dressPentagonHall, pentagonChamberSigils } from "./pentagon-halls.js?v=r951-4925ab3898c1";
const PENTAGON_HALLS_FLOOR = (type) => PENTAGON_HALLS.types[type]?.floor || "flagFloor";
import { ADVENTURE_PENTAGON as AP, ADVENTURE_THEMES, ADVENTURE_AREAS, ADVENTURE_LINKS, composeDistrict, adventureThemePick, adventureRoster, adventureAreaSize, layAdventureArea, adventureCreatureTheme } from "./adventures.js?v=r951-4925ab3898c1";
import { pickAdventureCreature, adventureSpawnSpot } from "./adventure-creatures.js?v=r951-4925ab3898c1";
import { SIGIL_BOUNDS, sigilFits, inlaySigil } from "./watcher.js?v=r951-4925ab3898c1";

export const PENTAGON = {
  version: 9, // 9: spacious branching ordinary chambers; 8: grand halls, murals and the Watcher's sigil (pentagon-halls.ts); earlier versions remain pinned. The legacy baseline: new ground takes 10 (release 844 room routing) or 11 (the adventure: adventures.ts ADVENTURE_PENTAGON), chosen in game.ts recoverPentagonVersion
  every: 8, chance: .5, minRing: 10, // centre sections on a grid of `every`; this share of the eligible ones
  bands: { out: 36, outer: 29, court: 23, inner: 18, heart: 3 }, // pentagon "apothem" bands (tiles from the centre, along each face's normal)
  approach: 12, // tiles of paved way out from each gate
  wall: 1.3, // half-width of the walls between the ring courts, at the corners
  floors: { outer: 4, inner: 3, heart: 5, radial: 1 },
  size: [27, 19],
  guards: ["weepingSaint", "hangedChoir", "graveLantern", "pallidCrawler", "mirrorShade", "ashling"], ghouls: [2, 3], trialGuards: 5,
  regent: "hollowMarshal", trials: 3, broken: 3, // ring doors fallen shut (of the ten outer)
  name: "The Pentagon", court: "the Fivefold Court",
  relics: [
    "A tablet, its letters worn: “Five sat at the five faces, and none above the others. So the Court was made, and it was good.”",
    "Scratched into a door: “The Heart beneath the court was never to be opened. The Regent opened it.”",
    "A ledger, the last page torn: “Grain for the North Face: none. Grain for the South Face: none. Lamps for the Heart: forty.”",
    "On a cracked plinth: “They came up out of the Heart in the third winter, and they were the people we had lost.”",
    "A child’s chalk on a wall: five faces in a ring, and in the middle one face with no eyes.",
    "A bronze plaque, half melted: “By order of the Regent the five gates are shut. None leaves. None mourns.”",
    "A last note, folded small: “If you have come this far, do not wake her in the vault. Or wake her, and end it.”",
  ],
  names: { outer: "Outer Ring", inner: "Inner Ring", heart: ["The Heart", "The Under-Heart", "The Regent's Vault"], faces: ["North-East Face", "South-East Face", "South Face", "South-West Face", "North-West Face"] },
  // Version 2 (Tim, 2026-11-04: "like Bloodborne... you're going so far... then you finally get like a puzzle piece... on lots
  // of doors... it actually gets kind of scary... actual bosses... the Chalice Dungeons... deeper and deeper... pull three
  // levers... at different portions within the courtyard... then the gate opens... not too tedious"):
  // - three levers in three ring courts; until all three are pulled the inner ring's doors into the central court stay shut;
  // - the Fivefold Seal, in the chamber farthest from the gates: it opens every sigil door (the fallen ring doors, doors from
  //   outer chambers into their courts, and the way down past the Under-Heart), shortcuts back across the rings;
  // - the trial chambers each hold a lord (a named boss) and two ghouls; the Heart runs six floors down, a boss on each, its
  //   way down shut while that boss lives; the Regent in the vault at the bottom;
  // - the deeper in, the darker (`dread`, the share of the screen the dark closes over).
  // Version 3 (Tim, 2026-11-04: "when you get the Fivefold Seal, I don't want it to unlock all the doors... if you get to the
  // end without beating all the bosses or unlocking all the doors, that's fine. But I still want you to be able to go back and
  // complete any other puzzles and secrets"):
  // - the Seal opens only the way on below the Under-Heart;
  // - the fallen ring doors are shortcuts barred from the far side (open them from there, and they stay open);
  // - two hidden reliquaries, each behind a door that wants its own shard; one shard lies somewhere in the rings, the other
  //   deep in the Heart; each reliquary holds a Tesseract glyph (tesseracts.ts);
  // - the Heart's keepers are champions, not gates: a keeper's way down is never held shut. The deep keepers (from the Bone
  //   Stair down) each give a Tesseract glyph; the Regent's hoard gives a Sovereign one if every champion (the lords and the
  //   keepers) fell before him.
  // Version 4 (Tim, 2026-11-04: "you have to beat all the bosses to get through... you can't go through their ladders until you
  // beat them... the doors that are locked when you get to the final boss remain locked. But you can get that [Seal]... any
  // door that you find will just become unlocked... when you go to them and interact with them"; the Regent drops it; the
  // reliquaries keep their shards):
  // - every keeper holds its ladder down shut until it falls (as in version 2);
  // - the Fivefold Seal is the Regent's: it is yours when he falls;
  // - the sigil doors (the fallen ring doors, and doors into the courts where none stood) stay shut until, Seal in hand, you
  //   open each one by using it (`sigilKey`, recorded in pentOpened); none open by themselves;
  // - the reliquaries and their shards as in version 3.
  // Version 5 (Tim, 2026-11-04: "there might be secrets and things that you hadn't seen... that you can access with the key"):
  // three sealed chambers, each off a chamber of the rings behind a sigil door of its own, so reached only with the Regent's
  // Seal: in each a warden (a named boss), a Sealed Tesseract glyph (tesseracts.ts) and a relic found nowhere else.
  sealed: 3, sealedNames: ["Sealed Chamber of the Five Faces", "Sealed Chamber of the Eyeless One", "Sealed Chamber of the Last Court"],
  sealedRelics: [
    "Under the dust, a throne of five seats with one seat taken: “She sits here still, in the Heart. We sealed the door on her and on ourselves.”",
    "A mirror with no glass, and behind it a name scratched out five times: the Regent's own, before she took the Heart.",
    "A will, unsigned: “To whoever holds the Seal: the Court is yours now. Keep the doors shut, or open them all and let the Pentagon breathe.”",
  ],
  // Version 6 (Tim, 2026-11-04: "In the Pentagon there should be shortcuts... you have to traverse until you get to open doors
  // with keys and open shortcuts. The first time you go through you might be forced to take a long path; the second time you
  // can just go through the shortcut to a deeper level"; and "exterior doors in the Pentagon's outer walls that are locked from
  // outside and only open from the inside... multiple entrances... different starting places along the journey"):
  // - shortcut links, opened only from their deep side and open for good after (history `labOpen`, `link:<id>`): a lift from
  //   the first gate's chamber down to every Heart floor below the first, and `ring` links from deep in the rings (the first
  //   always an inner chamber with a door onto the central court) back to a chamber you come in by;
  // - side entrances round the outer wall (`entrances`): some open from the start, into outer chambers the gates already lead
  //   to (so they never pass a key, a lever, a trial, a keeper or a sigil), the rest exterior shortcut doors, bolted from
  //   within until you reach them inside and draw the bolts (`x:<key>`).
  // A Pentagon begun before version 6 keeps its tiles; its lifts and ring links are laid over it as objects on open floor
  // (history `pentLinks`, the `overlay` version), in spots the later dungeon dressings never take.
  shortcuts: {
    overlay: 1, ring: [2, 4], minHops: 3, // ring links a Pentagon; how many doors the long way from a link's near end to its deep end at least
    ringKinds: ["door", "ladder", "gate"], heartKind: "lift", spacing: 2, nearEntry: 5, // where a link end stands: within `nearEntry` of where you come in, or by the side walls
    kinds: {
      lift: { name: "A lift cage", deepName: "A lift cage and its winch", barred: "The cage hangs somewhere far below. Barred from the other side: only its winch down there can send it up.", opens: "You throw the winch. Chains scream, and the cage rides up toward the gates: this way back stays open.", ride: "The cage carries you" },
      ladder: { name: "A ladder's foot", deepName: "A ladder, hooked up out of reach", barred: "A ladder hangs hooked up out of reach. Barred from the other side.", opens: "You kick the ladder loose. It crashes down to the floor below and stays there: a short way back.", ride: "You take the ladder" },
      door: { name: "A bolted door", deepName: "A door bolted on this side", barred: "Barred from the other side.", opens: "You draw the bolt. The door swings wide onto a hall you know, and it stays open.", ride: "You go through the door" },
      gate: { name: "A portcullis", deepName: "A portcullis and its lever", barred: "The portcullis will not lift from here. Its lever is on the other side.", opens: "You heave the lever. The portcullis grinds up and locks: the way back is open.", ride: "You duck under the portcullis" },
    },
    exterior: { barred: "Barred from within. Only from inside the Pentagon can its bolts be drawn.", opens: "You draw the great bolts. The door swings out onto the land, and it stays open: you can come in this way now." },
    notice: "A SHORTCUT OPENS", burst: 1.2,
  },
  entrances: { count: [3, 5], exterior: [1, 2], approach: 5 }, // side entrances round the outer wall (open ones and exterior shortcut doors); tiles of paved way out from each
  // The finale (Tim, 2026-11-04: "If you finish the Pentagon, you've done a lot, so you should be rewarded with something
  // beautiful. After you beat the boss, a wall opens and a Starfield annex opens up: a short Starfield walkway that winds a
  // little. At its end there's a nice little ceremonial dais you can touch; it says 'Transit' and takes you back to the
  // Pentagon's front door — only there, because you don't have the coordinates to transit anywhere else"). Every version:
  // when the Regent falls, a wall of the vault opens (history `pentFinale` on the base floor, `version`), laid over the vault
  // as an object on its outer wall, never into its tiles. Beyond it, a floor of its own (`${base}:finale`): open stars, a
  // pale walkway winding over them, a dais at its far end. The stars are not walkable (no fall, no foes: a quiet place).
  finale: {
    version: 1, size: [29, 15], // `version`: the opening's history value; size: the walkway floor (W, H)
    // the walkway floor's generator, pinned on its history (`finaleFloor`): 1 (release 750) stars you cannot step onto; 2 (Tim,
    // 2026-11-04: "Falling off the pathway will kill you, but it'll just take you to the front of the pathway of the Starfield
    // passage") stars you can step off into and fall: a death that wakes you at the walkway's start, beside the doorway back
    floor: 2,
    // the dais's rerolls (Tim, 2026-11-04: "one reroll on a Tesseract passive; and if you have Divine Viscera you can pay 10
    // Divine Viscera to reroll one more Tesseract passive. Only those two times"), per Pentagon, counted on its base floor's
    // history (`pentRerolls`); `list`: how many Tesseracts the dais offers at once (set ones first, then the newest)
    reroll: { free: 1, paid: 1, viscera: 10, list: 12 },
    walk: { half: 1, waves: 1.25, amp: [2, 3.2] }, // the walkway's half-width; how many bends it makes; how far it swings (tiles)
    dais: { r: 2.3, inset: 4 }, // the dais's round landing (radius) and how far in from the far end it stands
    shards: 7, shardClear: 2, // floating stones in the void (looks only, never walkable), and how far from the walkway
    burst: 1.6, arriveOut: 1.5, // the notice's burst (seconds); how far out along the gate's paved way the dais sets you down (tiles)
    names: { floor: "The Starfield Walk", wall: "The opened wall · a walkway among the stars", back: "The opened wall · back to the Regent's Vault", dais: "Transit · a ceremonial dais" },
    notice: "THE WALL OPENS", detail: "beyond it, a walkway among the stars",
    messages: {
      opens: "With a sound like a held breath let go, the vault's far wall splits along its seams and swings outward. Beyond it there is no stone at all: only stars, and a pale way across them.",
      walk: "The Pentagon falls away behind you. A pale path winds out over the dark, and the stars go down for ever on either side.",
      back: "You step back through the wall, into the Regent's Vault.",
      dais: "A low round dais of five steps, ringed in pale light. One word is cut into its face: Transit. It holds a single set of coordinates, and they are the Pentagon's own front door.",
      fell: "You step off the path and fall, and fall, through the stars. Then stone underfoot again: you wake at the start of the walkway, the vault's doorway behind you.",
      reroll: "Choose a Tesseract glyph, then the line on it the dais should cut again.",
      rerolled: "The dais's light runs through the glyph. One line of it fades and is cut again",
      rerollsDone: "The dais has cut what it will cut. Only Transit remains.",
      needViscera: "The dais wants Divine Viscera for another cutting",
      noTesseract: "The dais would cut a Tesseract glyph again, but you carry none.",
      arrive: "The dais takes you. Stars, a cold wind, then stone underfoot: you stand outside the Pentagon's gate. The dais knew no other place to send you.",
    },
  },
  // Version 7 (Tim, 2026-11-04: "There could be interesting puzzles using drone traversal. There could be ledges on the outside of
  // the Pentagon where you can jump down from the roof and not go all the way to death — jump down to a balcony a story or two
  // down — and then use that to enter the Pentagon"; and "We should be able to use the roof — the roof is just another path"):
  // - the outer ring's roof is ground you walk, at `roof.elev`, all the way round its five faces and over its section seams; its
  //   inner edge is a parapet (blocked, as high as the roof), so no step, drop, glide or drone lift reaches a court from it;
  // - an outer stair (`stair`) climbs the south face from the land to the roof, a level a step (slopes), for anyone; the drone's
  //   booster (vehicle-gates.ts DRONE_LIFT: 5 levels over the jump's start) also lifts you from the land onto the roof or a
  //   balcony;
  // - balconies (`balconies`) stand out from the outer faces (the south-looking first), `below` 1 or 2 levels under the roof (a drop of 1 is safe,
  //   of 2 costs .15 of max HP: landscape.ts FALL_DAMAGE). Each has a door into an outer chamber you otherwise reach the long way
  //   (at least `minHops` doors from the land with every lock, plate, lever, trial and sigil shut), so it never lets you past any
  //   of them: the roof and its balconies count as the land (`balcony` world doors; their tiles `pentBalcony`).
  // A section the landscape left flat is given heights for the roof (placePentagonSection), so the roof runs on whole.
  roof: { elev: 5, perch: { spacing: 4, max: 8, margin: 2 } }, // perches: roof tiles a roof creature may hold (pentagonRoofSpots)
  balconies: { count: [2, 3], minHops: 3, fallbackHops: 2, south: [1, 2, 3], // on any face, the south-looking ones (whose facades show) first; a chamber barred from the land by an exterior door last
    t: [4, 15, 19], halfWidth: 1.5, depth: 1.6, below: [1, 2], clear: 1, maxT: 22,
    name: "The Pentagon: a balcony door", identity: "a door onto a balcony high in the five-sided wall", exit: "Door out · the balcony" },
  stair: { face: 2, steps: 4, clear: 1, t: 20 }, // `steps` slopes from the land (level 0) up to the roof (level 5), on face `face`, within `t` of its middle
  warden: { hp: 3.4, damage: 1.4, affixes: 2, ghouls: 2 },
  secrets: 2, shardDeep: 3, deepGlyphFrom: 2, // reliquaries; the Heart floor that holds the second shard; keepers from this floor give glyphs
  secretNames: ["Hidden Reliquary of the Faces", "Hidden Reliquary of the Heart"], shardNames: ["Shard of the Faces", "Shard of the Heart"],
  levers: 3,
  deep: ["The Heart", "The Under-Heart", "The Bone Stair", "The Drowned Choir", "The Lightless Nave", "The Regent's Vault"],
  bosses: { weepingSaint: "The Weeping Abbess", hangedChoir: "The Hanged Choir", amalgam: "The Amalgam of the Lost", gnawingMaw: "The Maw Beneath",
    cinderSeraph: "The Ash Seraph", lumenWraith: "The Lamplighter's Wraith", veilSpinner: "The Veil Spinner", riftLynx: "The Regent's Hound",
    sunderjaw: "Sunderjaw, Keeper of the Gate", thunderhorn: "The Thunderhorn", mirrorShade: "The Mirror Steward", graveLantern: "The Grave Lantern",
    pallidCrawler: "The Pallid Crawler", siegeBeetle: "The Siege Beetle" },
  lord: { hp: 3.2, damage: 1.35, affixes: 2, ghouls: 2 }, // a trial's lord
  deepBoss: { hp: 3.6, damage: 1.4, affixes: 2, perFloor: .35, ghouls: [1, 2] }, // a Heart floor's boss (hp and damage grow `perFloor` a floor down)
  regentBoss: { hp: 6, damage: 1.7, affixes: 3 },
  dread: { outer: .3, inner: .45, heart: .58, perFloor: .06, max: .86 },
  messages: {
    lever: "The lever grinds down. Somewhere in the rings, chains run",
    leversDone: "Far off, the inner ring's great doors grind open onto the central court.",
    gate: "The great door will not move. Its chains run off into the courts: levers pulled",
    sigil: "A five-sided sigil is cut into the door. It wants the Fivefold Seal.",
    sigilV4: "A five-sided sigil is cut into the door. It wants the Fivefold Seal, and the Regent holds it.",
    sigilOpens: "The Fivefold Seal fits the sigil. The door grinds open, and stays open.",
    sealV4: "In her hand, the Fivefold Seal: every sigil door in the rings will open to it, one by one, as you come to them.",
    seal: "The Fivefold Seal: five faces round an eyeless one. Every sigil door in the rings will open to it now.",
    bossGate: "The way down is held shut while its keeper lives",
    hoardHeld: "The Regent's hand is still on her hoard. It will not open while she lives.",
    bossDown: "falls. The way down opens",
    arrive: "A wall of building runs on as far as you can see, its face turning at a great angle: the Pentagon.",
    sealed: "The Heart is sealed. Three trials remain to be cleared within the rings",
    plate: "The door will not hold open. Something heavy on the plate would hold it: build a block there.",
    rubble: "You take what stone the rubble gives",
    trial: "A trial chamber falls silent",
    relic: "A relic of the Fivefold Court",
  },
};

const mod = (a, n) => ((a % n) + n) % n;
// The centre section of a Pentagon this section could belong to.
export function pentagonCentre(rx, ry) { const E = PENTAGON.every, cx = Math.round(rx / E) * E, cy = Math.round(ry / E) * E; return Math.abs(rx - cx) <= 1 && Math.abs(ry - cy) <= 1 ? { cx, cy } : null; }
export function pentagonAt(seed, cx, cy, ok) { const P = PENTAGON; if ((hashSeed(`${seed}:pentagon:v1:${cx}:${cy}`) % 1000) / 1000 >= P.chance) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const rx = cx + dx, ry = cy + dy; if (Math.abs(rx) + Math.abs(ry) < P.minRing || !ok(rx, ry)) return false; } return true; }
const toGlobal = (cx, cy, rx, ry, x, y) => ({ gx: (rx - cx + 1) * 32 + x, gy: (ry - cy + 1) * 32 + y });
const toLocal = (cx, cy, gx, gy) => ({ rx: cx - 1 + Math.floor(gx / 32), ry: cy - 1 + Math.floor(gy / 32), x: mod(gx, 32), y: mod(gy, 32) });

// The geometry: each face i of the pentagon (point up) has its outward normal at -54° + 72°·i.
const C0 = 48, NORM = [0, 1, 2, 3, 4].map((i) => { const a = (-54 + 72 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; });
const VERT = [0, 1, 2, 3, 4].map((i) => { const a = (-90 + 72 * i) * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }); // vertex i sits between faces i-1 and i
export function regionAt(gx, gy) {
  const B = PENTAGON.bands, dx = gx + .5 - C0, dy = gy + .5 - C0; let m = -1e9, face = 0;
  for (let i = 0; i < 5; i++) { const v = dx * NORM[i][0] + dy * NORM[i][1]; if (v > m) { m = v; face = i; } }
  if (m > B.out) return { kind: "outside", face, m };
  if (m > B.outer) { const t = dx * -NORM[face][1] + dy * NORM[face][0]; return { kind: "outer", face, half: t < 0 ? 0 : 1, m }; }
  if (m > B.court) { for (const [vx, vy] of VERT) { const along = dx * vx + dy * vy, across = Math.abs(dx * -vy + dy * vx); if (along > 0 && across < PENTAGON.wall) return { kind: "wall", face, m }; } return { kind: "court", face, m }; }
  if (m > B.inner) return { kind: "inner", face, m };
  if (Math.abs(dx) <= B.heart && Math.abs(dy) <= B.heart) return { kind: "heart", face, m };
  return { kind: "central", face, m };
}
// WG-03: within one Pentagon its courts run on over section edges, so the Wayfarer crosses a seam where they stand. Is the
// stretch of edge at `along` (tiles a..b along it) open court on both sides of the seam from section (rx, ry) by (dx, dy)?
// Only the court and the central court count: anywhere else (building, the walls between the courts, outside) the seam is
// crossed at the lane, as every other edge is.
// v7 (`roof` true: the Pentagon is version 7 or later and has its roof): its roof runs on over the seams too, and is crossed
// anywhere along it (the parapet is not roof).
export function pentagonSeamOpen(cx, cy, rx, ry, dx, dy, a, b, roof = false) {
  const nx = rx + dx, ny = ry + dy; if (Math.abs(nx - cx) > 1 || Math.abs(ny - cy) > 1 || Math.abs(rx - cx) > 1 || Math.abs(ry - cy) > 1) return false;
  const open = (sx, sy, x, y) => { const g = toGlobal(cx, cy, sx, sy, x, y), k = regionAt(g.gx, g.gy).kind; return k === "court" || k === "central" || (roof && k === "outer" && !pentagonParapet(g.gx, g.gy)); };
  for (let v = a; v <= b; v++) { if (v < 0 || v > 31) return false;
    const here = dx ? [dx > 0 ? 31 : 0, v] : [v, dy > 0 ? 31 : 0], there = dx ? [dx > 0 ? 0 : 31, v] : [v, dy > 0 ? 0 : 31];
    if (!open(rx, ry, ...here) || !open(nx, ny, ...there)) return false; }
  return true;
}
// A point a distance `m` out along face i's normal, `t` along the face.
const FACE_T = 9; // how far along a face from its middle a half's door stands
const facePoint = (i, m, t) => { const [nx, ny] = NORM[i]; return { gx: Math.floor(C0 + nx * m - ny * t), gy: Math.floor(C0 + ny * m + nx * t) }; };
const faceT = (i, gx, gy) => (gx + .5 - C0) * -NORM[i][1] + (gy + .5 - C0) * NORM[i][0]; // how far along face i a cell's middle lies

// ------------------------------------------------------------------------------------------------ v7: the roof and its ledges
const N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
// Is this cell of the outer ring the roof's parapet: beside (8 ways) anything of the rings within? The parapet stays blocked, as
// high as the roof, so the roof never runs into a court. Pure, from the geometry, so the sections of a seam agree.
export function pentagonParapet(gx, gy) {
  if (regionAt(gx, gy).kind !== "outer") return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = regionAt(gx + dx, gy + dy).kind; if (k !== "outer" && k !== "outside") return true; }
  return false;
}
const roofCell = (gx, gy) => regionAt(gx, gy).kind === "outer" && !pentagonParapet(gx, gy);
// The balconies and the outer stair of a version 7 Pentagon, in its own tiles (gx, gy over the 3×3 block). Pure: hashes of the
// plan's key, and the geometry. A balcony goes to an outer chamber (south-looking faces first) holding no open land door, at least
// `minHops` doors from the land with every lock, plate, lever, trial, sigil, shard and barred door shut (so its door is a way
// in you would otherwise walk the long way to, and passes nothing); its cells stand just outside the face, apart from every
// approach, door and other ledge, inside one section. The stair is a run of slopes along the south face from the land up to
// the roof's edge.
function planLedges(key, cx, cy, world, edges) {
  const P = PENTAGON, B = P.bands, Bc = P.balconies, St = P.stair, R0 = P.roof.elev, gk = (gx, gy) => `${gx},${gy}`, occ = new Set();
  const near = (c, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (occ.has(gk(c.gx + dx, c.gy + dy))) return true; return false; };
  const oneSection = (cells) => { const L0 = toLocal(cx, cy, cells[0].gx, cells[0].gy); return cells.every((c) => { const L = toLocal(cx, cy, c.gx, c.gy); return L.rx === L0.rx && L.ry === L0.ry && L.x >= 2 && L.x <= 29 && L.y >= 2 && L.y <= 29; }); };
  for (const w of world) if (w.place === "land" && !w.toGate) { const i = Number(w.node.slice(1)), f = i >> 1, o = facePoint(f, B.out + 1.2, i & 1 ? FACE_T : -FACE_T), [nx, ny] = NORM[f]; // the approaches, as placePentagonSection paints them
    for (let k = 0; k < (w.side ? P.entrances.approach : P.approach); k += .5) for (const side of [-1, -.5, 0, .5, 1]) occ.add(gk(Math.floor(o.gx + .5 + nx * k - ny * side), Math.floor(o.gy + .5 + ny * k + nx * side))); }
  // the long way: hops from the land with every gate shut
  const adj = new Map(), link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (const e of edges) if (!e.cut && !e.sigil && !e.shortcut && !e.secret && !e.plate) link(e.a, e.b);
  for (const w of world) if (!w.toGate && !w.sigil && !w.exterior && !w.lock && !w.gate && !w.sealed) link(w.node, w.place);
  const free = hopsFrom(adj, "land"), landed = new Set(world.filter((w) => w.place === "land" && !w.exterior).map((w) => w.node)), barred = new Set(world.filter((w) => w.exterior).map((w) => w.node)), north = (i) => Bc.south.includes(i >> 1) ? 0 : 1;
  const deep = (h) => [...Array(10).keys()].filter((i) => !landed.has(`o${i}`) && (free.get(`o${i}`) ?? 0) >= h), cand = (deep(Bc.minHops).length ? deep(Bc.minHops) : deep(Bc.fallbackHops)) // where no chamber lies `minHops` in, one `fallbackHops` in
    .sort((a, b) => +barred.has(`o${a}`) - +barred.has(`o${b}`) || north(a) - north(b) || free.get(`o${b}`) - free.get(`o${a}`) || hashSeed(`${key}:balcony:${a}`) - hashSeed(`${key}:balcony:${b}`));
  const want = Bc.count[0] + hashSeed(`${key}:balconies`) % (Bc.count[1] - Bc.count[0] + 1), balconies = [];
  for (const i of cand) { if (balconies.length >= want) break; const f = i >> 1, sign = i & 1 ? 1 : -1;
    const ts = [...Bc.t].sort((a, b) => hashSeed(`${key}:balcony-t:${i}:${a}`) - hashSeed(`${key}:balcony-t:${i}:${b}`));
    for (const tv of ts) { const t0 = sign * tv; if (Math.abs(t0) > Bc.maxT) continue; const at = facePoint(f, B.out + 1, t0), cells = [];
      for (let gy = at.gy - 4; gy <= at.gy + 4; gy++) for (let gx = at.gx - 4; gx <= at.gx + 4; gx++) { const R = regionAt(gx, gy); if (R.kind === "outside" && R.face === f && R.m <= B.out + Bc.depth && Math.abs(faceT(f, gx, gy) - t0) <= Bc.halfWidth) cells.push({ gx, gy }); }
      if (cells.length < 3 || !oneSection(cells) || cells.some((c) => near(c, Bc.clear))) continue;
      const set = new Set(cells.map((c) => gk(c.gx, c.gy))), seen = new Set([gk(cells[0].gx, cells[0].gy)]), st = [cells[0]]; // one piece
      while (st.length) { const c = st.pop(); for (const [dx, dy] of N4) { const k = gk(c.gx + dx, c.gy + dy); if (set.has(k) && !seen.has(k)) { seen.add(k); st.push({ gx: c.gx + dx, gy: c.gy + dy }); } } }
      if (seen.size !== cells.length) continue;
      const edge = cells.filter((c) => N4.some(([dx, dy]) => roofCell(c.gx + dx, c.gy + dy))).sort((a, b) => Math.abs(faceT(f, a.gx, a.gy) - t0) - Math.abs(faceT(f, b.gx, b.gy) - t0) || a.gy - b.gy || a.gx - b.gx);
      if (!edge.length) continue; const out = edge[0], [nx, ny] = NORM[f];
      const back = N4.filter(([dx, dy]) => roofCell(out.gx + dx, out.gy + dy)).sort((a, b) => (a[0] * nx + a[1] * ny) - (b[0] * nx + b[1] * ny))[0], door = { gx: out.gx + back[0], gy: out.gy + back[1] };
      const below = Bc.below[0] + hashSeed(`${key}:balcony-below:${i}`) % (Bc.below[1] - Bc.below[0] + 1);
      for (const c of cells) occ.add(gk(c.gx, c.gy)); balconies.push({ key: `balc${i}`, node: `o${i}`, f, t: t0, elev: R0 - below, cells, out: { ...out }, door }); break; } }
  // the outer stair: a slope a level, along the south face, its top step beside the roof
  let stair = null; const f = St.face, ts = []; for (let t = -St.t; t <= St.t; t++) for (const dir of [-1, 1]) ts.push({ t, dir });
  ts.sort((a, b) => hashSeed(`${key}:stair:${a.t}:${a.dir}`) - hashSeed(`${key}:stair:${b.t}:${b.dir}`));
  for (const { t, dir } of ts) { const cells = []; for (let k = 0; k <= St.steps; k++) cells.push({ ...facePoint(f, B.out + .5, t + k * dir), elev: k });
    if (!cells.every((c) => regionAt(c.gx, c.gy).kind === "outside") || !oneSection(cells) || cells.some((c) => near(c, St.clear))) continue;
    if (!cells.every((c, k) => !k || Math.abs(c.gx - cells[k - 1].gx) + Math.abs(c.gy - cells[k - 1].gy) === 1)) continue;
    const top = cells[cells.length - 1]; if (!N4.some(([dx, dy]) => roofCell(top.gx + dx, top.gy + dy))) continue;
    stair = { cells, foot: { gx: cells[0].gx, gy: cells[0].gy } }; break; }
  return { balconies, stair };
}

// ------------------------------------------------------------------------------------------------ the maze of chambers
// Nodes: o0..o9 (outer ring, two a face), i0..i4 (inner ring), h0..h2 (the Heart down to the vault). World places: the land,
// the ring courts c0..c4, the central court.
const memo = new Map();
const hopsFrom = (adj, from) => { const dist = new Map([[from, 0]]), q = [from]; for (let h = 0; h < q.length; h++) { const v = q[h]; for (const u of adj.get(v) || []) if (!dist.has(u)) { dist.set(u, dist.get(v) + 1); q.push(u); } } return dist; };
// ------------------------------------------------------------------------------------------------ v11: the adventure
// Version 11 (Tim, 2026-11-11: large self-contained adventure worlds, winding and interconnected; adventures.ts). Each face of
// the Pentagon becomes a district between its two outer halls: the ring's own door between those halls gives way to the
// district's areas (composeDistrict: rows of streets, plazas and courts, a high gallery and a low undercroft running past them,
// side areas, a vista), entered from both halls, its keep at the far end joined on to the inner ring's chamber of that face.
// Ways run across from one district into the next beyond the ring. A district may wear the Pentagon's accent theme. Each area's
// door stands on the wall that faces the area it leads to (`sides`). Pure: hashes of the plan's key.
const SIDE_TO = (q, o) => o.row > q.row + .25 ? "top" : o.row < q.row - .25 ? "bottom" : o.col > q.col ? "right" : "left";
function planAdventureDistricts(key, V, nodes, edges, add, pass) {
  const sizeKey = (hashSeed(`${key}:adventure-size:v1`) % 100) < AP.sizes.vast.weight ? "vast" : "grand", themes = adventureThemePick(key, V);
  for (let f = 0; f < 5; f++) { const k = edges.findIndex((e) => e.a === `o${2 * f}` && e.b === `o${2 * f + 1}`); if (k >= 0) edges.splice(k, 1); }
  const districts = [], byId = new Map(), wardsUsed = new Set();
  for (let f = 0; f < 5; f++) { const theme = themes.districts[f], T = ADVENTURE_THEMES[theme], D = composeDistrict(key, { id: `d${f}`, size: sizeKey, theme });
    const wards = [...T.wards].sort(byHash((w) => `${key}:ward:${f}:${w}`)), ward = wards.find((w) => !wardsUsed.has(w)) || wards[0]; wardsUsed.add(ward);
    const named = new Map(); // an area's name, unique within its ward ("II" and on after its template's names run out)
    for (const q of D.nodes) { const names = [...(T.areas[q.template] || T.areas.street)].sort(byHash((nm) => `${key}:area-name:${q.id}:${nm}`)), pickName = names.find((nm) => !named.has(nm)) || names[0], seen = (named.get(pickName) || 0) + 1; named.set(pickName, seen);
      const name = seen > 1 ? `${pickName} ${["", "I", "II", "III", "IV", "V", "VI"][seen] || seen}` : pickName, [W, H] = adventureAreaSize(`${key}:${q.id}`, q.template);
      const n = add(q.id, "district", `${ward} · ${name}`, "adventure"); Object.assign(n, { area: q.template, district: f, theme, row: q.row, col: q.col, W, H, ...(q.layer ? { layer: q.layer } : {}), ...(q.side ? { side: true } : {}) }); byId.set(q.id, n); }
    for (const e of D.edges) { const a = byId.get(e.a), b = byId.get(e.b); pass(e.a, e.b, { via: e.via, sides: { [e.a]: SIDE_TO(a, b), [e.b]: SIDE_TO(b, a) } }); }
    const front = D.front.map((id) => byId.get(id)), deep = byId.get(D.deep);
    pass(`o${2 * f}`, front[0].id, { via: "passage", sides: { [`o${2 * f}`]: "right", [front[0].id]: "bottom" } });
    pass(`o${2 * f + 1}`, front.at(-1).id, { via: "passage", sides: { [`o${2 * f + 1}`]: "left", [front.at(-1).id]: "bottom" } });
    pass(deep.id, `i${f}`, { via: "stair", sides: { [deep.id]: "top", [`i${f}`]: "bottom" } });
    for (const id of [`o${2 * f}`, `o${2 * f + 1}`, `i${f}`]) nodes.find((q) => q.id === id).theme = theme;
    districts.push({ id: D.id, face: f, theme, ward, front: D.front, deep: D.deep, rows: D.rows, routes: D.routes, sides: D.sides }); }
  for (const q of nodes) if (q.kind === "heart") q.theme = "tomb"; // the Heart is the Pentagon's own, whatever its wards wear
  // ways across, beyond the ring: from a district's far rows into the next district's middle
  const cross = []; for (let f = 0; f < 5; f++) if ((hashSeed(`${key}:adv-cross:${f}`) % 1000) / 1000 < AP.cross) cross.push(f);
  for (const f of [...Array(5).keys()].sort(byHash((f) => `${key}:adv-cross-extra:${f}`))) { if (cross.length >= AP.minCross) break; if (!cross.includes(f)) cross.push(f); }
  for (const f of cross.sort((a, b) => a - b)) { const A = districts[f], B = districts[(f + 1) % 5], aRow = A.rows[Math.max(0, A.rows.length - 2)], bRow = B.rows[Math.min(1, B.rows.length - 1)];
    const a = aRow.at(-1), b = bRow[0]; pass(a, b, { via: "bridge", cross: true, sides: { [a]: "right", [b]: "left" } }); }
  return { size: sizeKey, themes, districts, cross, hub: "w0" };
}
// The Waystone hall (`w0`): joined to both gates' halls, and by a shortcut gate from every district's keep, barred on the hall's
// side until opened from the keep (ADVENTURE_LINKS.shortcut). A vast Pentagon has a second Waystone, deep in its district
// farthest from the gates.
function planAdventureHub(key, adv, gates, nodes, add, pass) {
  const hub = add(adv.hub, "waystone", AP.hub.name, "adventure"), [W, H] = AP.hub.size; Object.assign(hub, { area: "waystone", W, H, theme: adv.themes.primary, waystone: 1, row: 0, col: 0 });
  for (const g of gates) pass(adv.hub, `o${g}`, { via: "passage", sides: { [adv.hub]: "bottom", [`o${g}`]: "top" } });
  const S = ADVENTURE_LINKS.shortcut, hubSides = ["left", "top", "right", "left", "right"];
  for (const D of adv.districts) pass(D.deep, adv.hub, { via: "passage", shortcut: `adv:${D.id}`, far: D.deep, advShortcut: S.kinds[hashSeed(`${key}:adv-sc:${D.id}`) % S.kinds.length], sides: { [D.deep]: "left", [adv.hub]: hubSides[D.face] } });
  if (AP.sizes[adv.size].waystones > 1) { const gf = new Set(gates.map((g) => g >> 1)), far = adv.districts.filter((D) => !gf.has(D.face)).sort(byHash((D) => `${key}:waystone2:${D.id}`))[0] || adv.districts[0];
    const row = far.rows[Math.max(0, far.rows.length - 2)], q = nodes.find((n) => n.id === row[0]); if (q) q.waystone = 2; }
}
export function pentagonPlan(seed, cx, cy, V = 1) {
  const key = `${seed}:${cx}:${cy}`, mkey = `${key}:v${V}`; if (memo.has(mkey)) return memo.get(mkey);
  const P = PENTAGON, r = rng(`pentagon:${key}:plan`), B = P.bands, N = P.names, nodes = [], edges = [];
  const add = (id, kind, name, floorKind) => { const q = { id, kind, name, floorKind, ports: [], n: nodes.length }; nodes.push(q); return q; };
  for (let i = 0; i < 10; i++) add(`o${i}`, "outer", `${N.outer} · ${N.faces[i >> 1]}${i & 1 ? " (east)" : " (west)"}`, r() < .35 ? "cellar" : "hall");
  for (let i = 0; i < 5; i++) add(`i${i}`, "inner", `${N.inner} · ${N.faces[i]}`, r() < .3 ? "cellar" : "hall");
  const nh = V >= 2 ? P.deep.length : 3; for (let i = 0; i < nh; i++) add(`h${i}`, "heart", V >= 2 ? P.deep[i] : N.heart[i], (V >= 2 ? i & 1 : i === 1) ? "cellar" : "hall");
  const node = (id) => nodes.find((q) => q.id === id), pass = (a, b, extra = {}) => edges.push({ a, b, ...extra });
  // round the outer ring (some doors fallen shut), round the inner, down the Heart
  const shut = new Set(); while (shut.size < P.broken) shut.add(Math.floor(r() * 10));
  for (let i = 0; i < 10; i++) if (!shut.has(i)) pass(`o${i}`, `o${(i + 1) % 10}`); else if (V === 3) pass(`o${i}`, `o${(i + 1) % 10}`, { shortcut: `fall${i}` }); else if (V >= 2) pass(`o${i}`, `o${(i + 1) % 10}`, { sigil: true }); // v2: a fallen door opens to the Seal; v3: a shortcut barred from its far side
  for (let i = 0; i < 5; i++) if (r() < .6) pass(`i${i}`, `i${(i + 1) % 5}`);
  for (let i = 0; i < nh - 1; i++) pass(`h${i}`, `h${i + 1}`, (V === 2 || V === 3) && i === 1 ? { sigil: true } : {});
  const adv = V >= AP.version ? planAdventureDistricts(key, V, nodes, edges, add, pass) : null; // v11: the districts (adventures.ts)
  // world doors: two gates in the outer facade; court doors from the outer ring and into the inner; the central court's doors
  const world = []; const gates = []; while (gates.length < 2) { const g = Math.floor(r() * 10); if (!gates.includes(g) && (gates.length === 0 || Math.abs(g - gates[0]) >= 3)) gates.push(g); }
  for (const g of gates) world.push({ node: `o${g}`, place: "land", key: `gate${g}` });
  for (let i = 0; i < 10; i++) if (r() < .55) world.push({ node: `o${i}`, place: `c${i >> 1}`, key: `court${i}` });
  for (let f = 0; f < 5; f++) { if (!world.some((w) => w.place === `c${f}`)) world.push({ node: `o${2 * f + (r() < .5 ? 0 : 1)}`, place: `c${f}`, key: `court${2 * f}x` }); if (r() < .7) world.push({ node: `i${f}`, place: `c${f}`, key: `ring${f}` }); }
  for (let f = 0; f < 5; f++) if (r() < .45) world.push({ node: `i${f}`, place: "central", key: `centre${f}` });
  if (!world.some((w) => w.place === "central")) world.push({ node: "i0", place: "central", key: "centre0" });
  world.push({ node: "h0", place: "central", key: "heart", sealed: "trials" });
  world.push({ node: `h${nh - 1}`, place: "land", key: "vaultout", toGate: true }); // the vault's way out: to the first gate
  if (adv) planAdventureHub(key, adv, gates, nodes, add, pass); // v11: the Waystone hall, its shortcuts back from every district
  // solvability over places and chambers (ignoring locks), then the locks laid on the way
  const graph = () => { const adj = new Map(), link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
    for (const e of edges) if (!e.cut && !e.sigil && !e.shortcut) link(e.a, e.b); for (const w of world) if (!w.toGate && !w.sigil && !w.exterior && !w.balcony) link(w.node, w.place); return adj; }; // sigil doors are shortcuts, never the only way
  const reach = (from, skip = () => false) => { const adj = graph(), seen = new Set([from]), st = [from]; while (st.length) { const v = st.pop(); for (const u of adj.get(v) || []) if (!seen.has(u) && !skip(v, u)) { seen.add(u); st.push(u); } } return seen; };
  // make sure every chamber (and so the central court) can be reached: reopen a fallen ring door, or join the inner ring, as need be
  const lost = () => { const R = reach("land"); return nodes.some((q) => q.kind !== "heart" && !R.has(q.id)); }; // one walk per check (the same answer as one per chamber)
  for (const i of [...shut].sort((a, b) => a - b)) if (lost()) { const e = edges.find((q) => q.a === `o${i}` && (q.sigil || q.shortcut)); if (e) { delete e.sigil; delete e.shortcut; } else pass(`o${i}`, `o${(i + 1) % 10}`); }
  for (let i = 0; i < 5 && lost(); i++) if (!edges.some((e) => e.a === `i${i}` && e.b === `i${(i + 1) % 5}`)) pass(`i${i}`, `i${(i + 1) % 5}`);
  for (let f = 0; f < 5 && lost(); f++) if (!world.some((w) => w.node === `i${f}` && w.place === `c${f}`)) world.push({ node: `i${f}`, place: `c${f}`, key: `ring${f}` });
  // v2: the outer ring and its courts must be open without the central court (its doors wait on the levers)
  if (V >= 2) { const lostOuter = () => { const R = reach("land", (v, u) => v === "central" || u === "central"); return nodes.some((q) => q.kind === "outer" && !R.has(q.id)); };
    for (const i of [...shut].sort((a, b) => a - b)) if (lostOuter()) { const e = edges.find((q) => q.a === `o${i}` && (q.sigil || q.shortcut)); if (e) { delete e.sigil; delete e.shortcut; } } }
  // v2: sigil doors from outer chambers into their courts where no door stands
  if (V === 2 || V >= 4) for (let i = 0; i < 10; i++) if (!world.some((w) => w.node === `o${i}` && w.place === `c${i >> 1}`)) world.push({ node: `o${i}`, place: `c${i >> 1}`, key: `sigil${i}`, sigil: true });
  if (V >= 4) for (let i = 0; i < 5; i++) if (!edges.some((e) => e.a === `i${i}` && e.b === `i${(i + 1) % 5}`)) pass(`i${i}`, `i${(i + 1) % 5}`, { sigil: true }); // v4: and round the inner ring where it is broken
  if (V === 2 || V >= 4) for (let f = 0; f < 5; f++) if (!world.some((w) => w.node === `i${f}` && w.place === `c${f}`)) world.push({ node: `i${f}`, place: `c${f}`, key: `isigil${f}`, sigil: true }); // and from inner chambers
  let keyNode = null, lockW = null, sealNode = null; const levers = [];
  if (V < 2) {
    // the key: on a door the way to the central court must pass if it can; the key in a chamber reachable without it
    const centralDoors = world.filter((w) => w.place === "central" && w.node.startsWith("i"));
    lockW = centralDoors.length === 1 ? centralDoors[0] : centralDoors[Math.floor(r() * centralDoors.length)];
    const before = reach("land", (v, u) => (v === lockW.node && u === "central") || (u === lockW.node && v === "central")), keyRoom = [...before].filter((v) => /^[oi]\d/.test(v) && v !== lockW.node);
    keyNode = keyRoom.length ? keyRoom[Math.floor(r() * keyRoom.length)] : null;
    if (keyNode) { lockW.lock = "key0"; node(keyNode).key = { id: "key0", name: "Regent's Key" }; }
  } else { // v2: the Seal in the chamber farthest from the land; the central doors shut on three levers in three courts
    const adj = graph(), dist = new Map([["land", 0]]), q = ["land"]; while (q.length) { const v = q.shift(); for (const u of adj.get(v) || []) if (!dist.has(u)) { dist.set(u, dist.get(v) + 1); q.push(u); } }
    sealNode = nodes.filter((n) => /^[oi]\d/.test(n.id) && dist.has(n.id)).sort((a, b) => dist.get(b.id) - dist.get(a.id) || a.n - b.n)[0].id; if (V >= 4) sealNode = null; else node(sealNode).seal = true; // v4: the Regent's
    for (const w of world) if (w.place === "central" && w.node.startsWith("i")) w.gate = "levers";
    while (levers.length < P.levers) { const f = Math.floor(r() * 5); if (!levers.includes(f)) levers.push(f); }
  }
  // the plate: on a ring door in a chamber reachable from the land
  let plateE = null;
  if (adv) { // v11: on a way between two areas of a district, its plate on the side you can reach without it
    const ways = edges.filter((e) => e.via === "passage" && node(e.a).kind === "district" && node(e.b).kind === "district" && !node(e.a).side && !node(e.b).side).sort(byHash((e) => `${key}:adv-plate:${e.a}-${e.b}`));
    for (const e of ways) { const R = reach("land", (v, u) => v === "central" || u === "central" || (v === e.a && u === e.b) || (v === e.b && u === e.a)); if (R.has(e.a) || R.has(e.b)) { plateE = e; e.plate = R.has(e.a) ? e.a : e.b; break; } } }
  else { const ring = edges.filter((e) => e.a.startsWith("o") && e.b.startsWith("o") && !e.sigil && !e.shortcut && reach("land").has(e.a)); plateE = ring.length ? ring[Math.floor(r() * ring.length)] : null;
  if (plateE) plateE.plate = plateE.a; } // the plate stands in chamber `a`, by its door to `b`
  // three trial chambers (not the Heart), reachable from the land
  const trials = [];
  if (adv) { const R = reach("land", (v, u) => v === "central" || u === "central"); trials.push(...adv.districts.map((D) => D.deep).filter((id) => R.has(id)).sort(byHash((id) => `${key}:adv-trial:${id}`)).slice(0, AP.trials)); } // v11: a district's keep holds the lord
  else { const can = [...reach("land")].filter((v) => /^[oi]\d/.test(v) && v !== keyNode && v !== sealNode);
  while (trials.length < Math.min(P.trials, can.length)) { const t = can[Math.floor(r() * can.length)]; if (!trials.includes(t)) trials.push(t); } }
  for (const t of trials) node(t).trial = true;
  if (V >= 2) { const kinds = Object.keys(P.bosses), used = new Set(); // v2: each trial's lord, each Heart floor's keeper
    const pick = (id) => { const own = adv && node(id).theme ? ADVENTURE_THEMES[node(id).theme].bosses.filter((k) => P.bosses[k]) : null, ks = own?.length ? own : kinds; // v11: a district's lord from its theme
      for (let j = 0; ; j++) { const k = ks[hashSeed(`${key}:boss:${id}:${j}`) % ks.length]; if (!used.has(k) || j > 20) { used.add(k); return { kind: k, name: P.bosses[k] }; } } };
    for (const t of trials) node(t).lord = pick(t); for (let i = 0; i < nh - 1; i++) node(`h${i}`).boss = pick(`h${i}`); }
  // v3: the hidden reliquaries, each off a chamber of the rings by a door that wants its shard
  if (V >= 3) { const hosts = nodes.filter((n) => /^[oi]\d/.test(n.id) && n.id !== sealNode).sort(byHash((a) => `${key}:host:${a.id}`));
    for (let k = 0; k < P.secrets; k++) { const host = hosts[k], sq = add(`s${k}`, "secret", P.secretNames[k], "cellar"); sq.reliquary = true; pass(host.id, sq.id, { secret: `shard${k}`, shardName: P.shardNames[k] });
      const keep = k === 1 ? node(`h${Math.min(P.shardDeep, nh - 2)}`) : hosts.slice(P.secrets).find((n) => !n.trial && n.id !== host.id && !n.key); if (keep) keep.shard = { id: `shard${k}`, name: P.shardNames[k] }; }
    const adj = graph(), dist = new Map([["land", 0]]), q = ["land"]; while (q.length) { const v = q.shift(); for (const u of adj.get(v) || []) if (!dist.has(u)) { dist.set(u, dist.get(v) + 1); q.push(u); } }
    for (const e of edges) if (e.shortcut && !e.far) e.far = (dist.get(e.a) ?? 99) >= (dist.get(e.b) ?? 99) ? e.a : e.b;
    if (V >= 5) { const used = new Set(edges.filter((e) => e.secret).map((e) => e.a)), kinds = Object.keys(P.bosses), taken = new Set(nodes.flatMap((n) => [n.lord?.kind, n.boss?.kind]).filter(Boolean)); // v5: the sealed chambers
      const hostsK = nodes.filter((n) => /^[oi]\d/.test(n.id) && !used.has(n.id)).sort(byHash((a) => `${key}:sealed-host:${a.id}`));
      for (let k = 0; k < P.sealed; k++) { const host = hostsK[k], kq = add(`k${k}`, "sealed", P.sealedNames[k], k === 1 ? "cellar" : "hall"); kq.sealedVault = k; pass(host.id, kq.id, { sigil: true });
        let wk = kinds[hashSeed(`${key}:warden:${k}`) % kinds.length]; for (let j = 0; taken.has(wk) && j < kinds.length; j++) wk = kinds[(kinds.indexOf(wk) + 1) % kinds.length]; taken.add(wk); kq.warden = { kind: wk, name: P.bosses[wk] }; } } } // a shortcut opens from its far side
  // v6: side entrances round the outer wall, in outer chambers that hold no gate; the farthest of them from the gates are
  // exterior shortcut doors, bolted from within
  if (V >= 6) { const E = P.entrances, gn = new Set(gates.map((g) => `o${g}`)), dist = hopsFrom(graph(), "land");
    const hid = (i) => NORM[i >> 1][1] < -.5 ? 1 : 0, site = (i) => { const f = i >> 1, t = i & 1 ? FACE_T : -FACE_T, d = facePoint(f, B.out - .5, t), o = facePoint(f, B.out + 1.2, t), L = toLocal(cx, cy, o.gx, o.gy), D = toLocal(cx, cy, d.gx, d.gy); return L.rx === D.rx && L.ry === D.ry && L.x >= 2 && L.x <= 29 && L.y >= 2 && L.y <= 29; };
    const cand = [...Array(10).keys()].filter((i) => !gn.has(`o${i}`) && site(i)).sort((a, b) => hid(a) - hid(b) || hashSeed(`${key}:entrance:${a}`) - hashSeed(`${key}:entrance:${b}`)); // doors on the faces that look south first (a north face's own roofs hide a door from the land)
    const n = Math.min(cand.length, E.count[0] + hashSeed(`${key}:entrances`) % (E.count[1] - E.count[0] + 1)), pick = cand.slice(0, n);
    const nx = Math.max(0, Math.min(n - 1, E.exterior[0] + hashSeed(`${key}:exteriors`) % (E.exterior[1] - E.exterior[0] + 1)));
    const ext = new Set([...pick].sort((a, b) => (dist.get(`o${b}`) ?? 0) - (dist.get(`o${a}`) ?? 0) || pick.indexOf(a) - pick.indexOf(b)).slice(0, nx));
    for (const i of pick) world.push({ node: `o${i}`, place: "land", key: `side${i}`, side: true, ...(ext.has(i) ? { exterior: `x:side${i}` } : {}) }); }
  // v7: the roof's balconies (planLedges), each a door from the land (the roof counts as the land) into an outer chamber far in
  const ledges = V >= 7 ? planLedges(key, cx, cy, world, edges) : null; if (ledges) for (const b of ledges.balconies) world.push({ node: b.node, place: "land", key: b.key, balcony: true, door: b.door, out: b.out });
  // relics, one a chamber in seven of them
  const relicRooms = nodes.filter((q) => q.kind !== "heart" && q.kind !== "sealed").sort(() => r() - .5).slice(0, P.relics.length); relicRooms.forEach((q, i) => (q.relic = i));
  // v8: a few ring chambers are grand halls, larger (pentagon-halls.ts): their size is their own (`q.W`, `q.H`), by hashes only
  if (V >= 8) for (const q of assignPentagonHalls(key, nodes, V)) if (adv && AP.halls.size[q.hall.type]) [q.W, q.H] = AP.halls.size[q.hall.type]; // v11: larger, for the camera
  // v11: every chamber but a grand hall is an open area too (the camera's room: adventures.ts ADVENTURE_PENTAGON.camera), not a hall of rooms;
  // the rings' halls are plazas and courts, the Heart's floors keeps, a reliquary a side room, a sealed chamber a court
  if (adv) for (const q of nodes) if (!q.area && !q.hall) { q.area = { outer: "plaza", inner: "court", heart: "keep", secret: "side", sealed: "court" }[q.kind] || "street"; [q.W, q.H] = adventureAreaSize(`${key}:${q.id}`, q.area); }
  // ports: each chamber's doors on its walls (world doors top and bottom, ring doors left and right, the Heart's ladders inside)
  const [W0, H0] = V >= 9 ? [45, 39] : P.size;
  for (const q of nodes) { const W = q.W || W0, H = q.H || H0, used = new Set(), slot = (side, k) => { for (let j = 0; j < 30; j++) { const h = hashSeed(`${key}:port:${q.id}:${k}:${j}`), along = side === "top" || side === "bottom" ? W : H, p = 3 + 2 * (h % Math.floor((along - 6) / 2)), x = side === "left" ? 0 : side === "right" ? W - 1 : p, y = side === "top" ? 0 : side === "bottom" ? H - 1 : p, id = `${x},${y}`;
        if (!used.has(id)) { used.add(id); return { x, y, inner: { x: x === 0 ? 1 : x === W - 1 ? W - 2 : x, y: y === 0 ? 1 : y === H - 1 ? H - 2 : y } }; } } return null; };
    for (const e of edges) if (e.a === q.id || e.b === q.id) { const other = e.a === q.id ? e.b : e.a, heart = q.kind === "heart";
      const side = heart ? null : e.sides?.[q.id] ? e.sides[q.id] : other.startsWith("s") || other.startsWith("k") ? "top" : q.kind === "secret" || q.kind === "sealed" ? "bottom" : (other === `${q.id[0]}${(Number(q.id.slice(1)) + 1) % (q.kind === "outer" ? 10 : 5)}` ? "right" : "left");
      q.ports.push({ kind: "pass", to: other, edge: e, ...(heart ? (() => { const h = hashSeed(`${key}:ladder:${q.id}:${other}`); const x = 3 + 2 * (h % 10), y = 3 + 2 * ((h >>> 5) % 6); return { x, y, inner: { x, y } }; })() : slot(side, other)) }); }
    for (const w of world) if (w.node === q.id) q.ports.push({ kind: "world", world: w, ...slot(w.place === "land" || w.place.startsWith("c") && q.kind === "inner" ? "bottom" : "top", w.key) }); }
  // world positions of every world door (pure: from the geometry)
  const T = FACE_T;
  for (const w of world) { const i = Number(w.node.slice(1)), f = w.node.startsWith("o") ? i >> 1 : w.node.startsWith("i") ? i : 0, t = w.node.startsWith("o") ? (i & 1 ? T : -T) : 0;
    if (w.key === "heart") { w.door = { gx: C0, gy: C0 + B.heart - 1 }; w.out = { gx: C0, gy: C0 + B.heart }; continue; }
    if (w.toGate || w.balcony) continue;
    const [mDoor, mOut] = w.place === "land" ? [B.out - .5, B.out + 1.2] : w.place === "central" ? [B.inner + .5, B.inner - 1.2] : w.node.startsWith("o") ? [B.outer + .5, B.outer - 1.2] : [B.court - .5, B.court + 1.2];
    w.door = facePoint(f, mDoor, t); w.out = facePoint(f, mOut, t); }
  const first = world.find((w) => w.place === "land" && !w.toGate); world.find((w) => w.toGate).out = first.out;
  // a lever stands on the side of its court the ring's roofs do not hide from view (the near side of a south-facing court)
  const leverAt = levers.map((f) => { const t = hashSeed(`${key}:lever:${f}`) & 1 ? 4 : -4, m = NORM[f][1] > 0 ? B.court + 1.5 : B.outer - 1.5; let at = facePoint(f, m, t);
    for (let k = 0; k < 6 && regionAt(at.gx, at.gy).kind !== "court"; k++) at = facePoint(f, m, t * (1 - (k + 1) / 6)); return { f, ...at }; });
  // shortcut links (every version: v6 lays them in, a Pentagon begun before has them laid over it): pure, from the graph
  const links = [], S = P.shortcuts; { const adj = graph(), fromLand = hopsFrom(adj, "land"), hub = adv ? adv.hub : first.node, entries = [...new Set(world.filter((w) => w.place === "land" && !w.toGate && !w.exterior && !w.balcony).map((w) => w.node))];
    for (let i = 1; i < nh; i++) links.push({ id: `lift${i}`, kind: S.heartKind, near: hub, deep: `h${i}`, heart: i });
    const deepC = nodes.filter((n) => (n.kind === "inner" || n.kind === "outer") && !entries.includes(n.id) && fromLand.has(n.id)).sort((a, b) => fromLand.get(b.id) - fromLand.get(a.id) || hashSeed(`${key}:link:${a.id}`) - hashSeed(`${key}:link:${b.id}`));
    const onCentral = deepC.find((n) => n.kind === "inner" && world.some((w) => w.node === n.id && w.place === "central")), order = onCentral ? [onCentral, ...deepC.filter((n) => n !== onCentral)] : deepC;
    const want = S.ring[0] + hashSeed(`${key}:links`) % (S.ring[1] - S.ring[0] + 1), far = new Map(entries.map((e) => [e, hopsFrom(adj, e)]));
    for (const d of order) { const k = links.length - (nh - 1); if (k >= want) break; const near = [...entries.slice(k % entries.length), ...entries.slice(0, k % entries.length)].find((e) => (far.get(e).get(d.id) ?? 0) >= S.minHops); if (!near) continue;
      links.push({ id: `link${k}`, kind: S.ringKinds[hashSeed(`${key}:link-kind:${d.id}`) % S.ringKinds.length], near, deep: d.id }); } }
  const plan = { key, seed, cx, cy, V, base: `pentagon:${seed}:${cx}:${cy}${V >= 2 ? `:v${V}` : ""}`, nodes, edges, world, W: W0, H: H0, trials, keyNode, plateE, lockW, gate: first, sealNode, levers: leverAt, nh, links, ...(ledges ? { ledges } : {}), ...(adv ? { adventure: { size: adv.size, primary: adv.themes.primary, accent: adv.themes.accent, hub: adv.hub, districts: adv.districts } } : {}) };
  if(V === CLOSE_VIEW_ROOM_ROUTING.pentagonVersion && nh > 2) {
    const hi=hashSeed(`${plan.base}:optional-heart-pair:v2`)%Math.max(1,nh-2), a=nodes.find(n=>n.id===`h${hi}`), b=nodes.find(n=>n.id===`h${hi+1}`);
    const ap=a.ports.find(p=>p.to===b.id),bp=b.ports.find(p=>p.to===a.id);
    const layout=n=>layCloseViewRooms(`${plan.base}:${n.id}`,1,n.W||W0,n.H||H0,BUILDINGS.styles.keep,n.ports[0]?.inner||{x:W0>>1,y:H0>>1},n.ports.flatMap(p=>[{x:p.x,y:p.y,v:2},{...p.inner,v:2}]));
    if(ap&&bp&&!a.hall&&!b.hall) {
      const point=routingStairPair(plan.base,layout(a),layout(b),ap.inner,bp.inner,a.ports,b.ports,plan.base);
      plan.optionalRoutes=[{id:`heart-${hi}-${hi+1}`,a:a.id,b:b.id,...point}];
    } else plan.optionalRoutes=[{id:`heart-${hi}-${hi+1}`,reason:"no equivalent ordinary Heart pair"}];
  }
  if (memo.size > 8) memo.clear(); memo.set(mkey, plan); return plan;
}
const chamberId = (plan, q) => `${plan.base}:f${q.n + 1}`;
const ID = /^pentagon:(.+):(-?\d+):(-?\d+):(?:v(\d+):)?f(\d+)$/;
export const isPentagonId = (id) => ID.test(String(id || ""));
export function parsePentagonId(id) { const m = String(id || "").match(ID); return m ? { seed: m[1], cx: Number(m[2]), cy: Number(m[3]), V: Number(m[4] || 1), n: Number(m[5]) - 1, base: `pentagon:${m[1]}:${m[2]}:${m[3]}${m[4] ? `:v${m[4]}` : ""}` } : null; }

// ------------------------------------------------------------------------------------------------ a section of it, outside
const I = (x, y) => y * 32 + x;
export function placePentagonSection(map, seed, cx, cy, rx, ry, V = 1) {
  if (!map?.tiles?.length || map.greatBuilding) return null;
  const P = PENTAGON, plan = pentagonPlan(seed, cx, cy, V), cells = { outer: [], inner: [], wall: [], heart: [] };
  const roofed = V >= 7 && !!plan.ledges, R0 = P.roof.elev, roofLift = (1 + P.floors.outer * .55) / (R0 * LIFT), parapet = []; // v7: the outer ring's roof
  // A section the landscape left flat (nothing to raise there: landscape.ts applyLandscape) still carries the roof's heights, so
  // the roof runs on whole over every seam: its ground is all level 0, and heights now count in it (no biome, version 0: no
  // landscape-only sea creatures or dive sites come with it).
  if (roofed && !map.landscape) map.landscape = { version: 0, biome: null, name: null, pentagon: true };
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const { gx, gy } = toGlobal(cx, cy, rx, ry, x, y), R = regionAt(gx, gy), i = I(x, y);
    if (R.kind === "outside") continue;
    const t = map.tiles[i], built = R.kind !== "court" && R.kind !== "central";
    map.tiles[i] = { ...t, x, y, kind: built ? "castleWall" : "castleCourt", landscape: "castle", blocked: built, elev: 0, slope: false, environment: undefined, canopy: undefined, structure: undefined, greatBuilding: true, pentagon: R.kind, courtyard: !built || undefined };
    if (roofed && R.kind === "outer") { const edge = pentagonParapet(gx, gy); if (edge) parapet.push({ x, y }); // the parapet: blocked, as high as the roof
      map.tiles[i] = edge ? { ...map.tiles[i], elev: R0, roofLift, pentParapet: true } : { ...map.tiles[i], kind: "castleCourt", blocked: false, elev: R0, roofLift, structure: "buildingRoof", pentRoof: true }; }
    if (built) cells[R.kind].push({ x, y }); }
  // v7: the balconies and the outer stair, raised ground just outside the outer face (drawn with the roof, at its scale)
  const ledges = [];
  if (roofed) { const lay = (c, extra) => { const l = toLocal(cx, cy, c.gx, c.gy); if (l.rx !== rx || l.ry !== ry) return null; const i = I(l.x, l.y);
      map.tiles[i] = { ...map.tiles[i], x: l.x, y: l.y, kind: "castleCourt", landscape: "castle", blocked: false, slope: false, environment: undefined, canopy: undefined, structure: undefined, greatBuilding: true, roofLift, ...extra }; return l; };
    for (const b of plan.ledges.balconies) for (const c of b.cells) { const l = lay(c, { elev: b.elev, structure: "buildingRoof", pentagon: "balcony", pentBalcony: b.key }); if (l) ledges.push({ x: l.x, y: l.y, kind: "balcony", elev: b.elev, key: b.key, ...(c.gx === b.out.gx && c.gy === b.out.gy ? { door: (({ x, y }) => ({ x, y }))(toLocal(cx, cy, b.door.gx, b.door.gy)), face: b.f } : {}) }); }
    const S = plan.ledges.stair; if (S) for (const [k, c] of S.cells.entries()) { const l = lay(c, k ? { elev: c.elev, slope: c.elev < R0, structure: "buildingRoof", pentagon: "stair", pentStair: k } : { elev: 0, greatBuilding: undefined, roofLift: undefined, causeway: true, pentStair: 0 }); if (l && k) ledges.push({ x: l.x, y: l.y, kind: "stair", elev: c.elev, step: k }); } }
  // approaches before the gates (a short paved way out from each)
  // (each section paints the stretch that falls in it, so an approach runs on over a section's edge; it bridges canyon and rock)
  for (const w of plan.world) if (w.place === "land" && !w.toGate && !w.balcony) { const [nx, ny] = NORM[Number(w.node.slice(1)) >> 1];
    for (let k = 0; k < (w.side ? P.entrances.approach : P.approach); k += .5) for (const side of [-1, -.5, 0, .5, 1]) { const gx = Math.floor(w.out.gx + .5 + nx * k - ny * side), gy = Math.floor(w.out.gy + .5 + ny * k + nx * side), l = toLocal(cx, cy, gx, gy); if (l.rx !== rx || l.ry !== ry) continue; const i = I(l.x, l.y); if (map.tiles[i].greatBuilding) continue; map.tiles[i] = { ...map.tiles[i], kind: "castleCourt", landscape: "castle", blocked: false, elev: 0, slope: false, environment: undefined, structure: undefined, canopy: undefined, causeway: true }; } }
  const inP = (o) => { const t = map.tiles[I(Math.round(o.x), Math.round(o.y))]; return t?.greatBuilding || t?.causeway; };
  map.objects = (map.objects || []).filter((o) => !inP(o)); map.enemySpawns = (map.enemySpawns || []).filter((e) => !inP(e));
  // the doors that stand in this section
  const N = P.names, doors = [];
  for (const w of plan.world) { if (w.toGate) continue; const L = toLocal(cx, cy, w.out.gx, w.out.gy), D = toLocal(cx, cy, w.door.gx, w.door.gy); if (L.rx !== rx || L.ry !== ry) continue;
    if (w.balcony) { const q = plan.nodes.find((n) => n.id === w.node), B = P.balconies; // v7: a balcony's door, reached only from up on the roof or the balcony (as a roof hatch is: game.ts reachOf)
      map.objects.push({ id: `pent-${w.key}`, kind: "dungeon", buildingDoor: true, pentagonDoor: true, pentBalcony: w.key, ...(roofed ? { roofHatch: true, elev: map.tiles[I(L.x, L.y)].elev } : {}), dungeonId: chamberId(plan, q), pentBase: plan.base, dungeonType: "pentagon", name: B.name, identity: B.identity, x: L.x, y: L.y, state: "open", actions: ["enter"], enterAt: w.key }); continue; }
    const q = plan.nodes.find((n) => n.id === w.node), name = w.key === "heart" ? N.heart[0] : w.exterior ? `${P.name}: a door barred from within` : w.side ? `${P.name}: a side door` : w.place === "land" ? `${P.name}: a gate` : q.name;
    map.objects.push({ id: `pent-${w.key}`, kind: "dungeon", buildingDoor: true, pentagonDoor: true, dungeonId: chamberId(plan, q), pentBase: plan.base, dungeonType: "pentagon", ...(w.sigil ? { sigil: true, ...(V >= 4 ? { sigilKey: `w:${w.key}` } : {}) } : {}), name, identity: w.side ? "a door in the five-sided wall" : w.place === "land" ? "one of the five-sided wall's two gates" : "a door into the rings", ...(w.side ? { pentLand: true } : {}), ...(w.exterior ? { barred: true, shortcutKey: w.exterior } : {}), x: L.x, y: L.y, state: "open", actions: ["enter"], enterAt: w.key, ...(w.sealed ? { pentSeal: w.sealed } : {}), ...(w.place === "land" && !w.side ? { landmark: true, lore: `${P.name}: a wall of building on five faces, round courts within courts. The Fivefold Court is long gone; something else keeps it now.` } : {}) });
    if (D.rx === rx && D.ry === ry) doors.push({ x: D.x, y: D.y, face: L.y > D.y ? "south" : L.y < D.y ? "north" : L.x > D.x ? "east" : "west" }); }
  // v2: the great levers, one in each of three courts
  for (const L of plan.levers) { const l = toLocal(cx, cy, L.gx, L.gy); if (l.rx !== rx || l.ry !== ry) continue;
    map.objects.push({ id: `pent-lever-${L.f}`, kind: "pentLever", lever: L.f, pentBase: plan.base, name: `A great lever · ${P.names.faces[L.f]} court`, x: l.x, y: l.y, state: "waiting", actions: ["pull"], lore: "A lever as tall as a man, its chain running off under the paving toward the inner ring." }); }
  // the courts are held
  const hh = (k) => hashSeed(`${seed}:pent-court:${cx}:${cy}:${rx}:${ry}:${k}`), court = map.tiles.filter((t) => t.courtyard && t.pentagon), kinds = P.guards;
  for (let i = 0; i < Math.min(3, Math.floor(court.length / 60)); i++) { const c = court[hh(`g${i}`) % court.length]; if (!map.objects.some((o) => Math.round(o.x) === c.x && Math.round(o.y) === c.y)) map.enemySpawns.push({ id: `pent-${rx}-${ry}-${i}`, kind: kinds[hh(`k${i}`) % kinds.length], x: c.x, y: c.y, courtyardGuard: true }); }
  const F = P.floors, blocks = [{ part: "outer", cells: cells.outer, faceH: 1 + F.outer * .55, floors: F.outer }, { part: "inner", cells: cells.inner, faceH: 1 + F.inner * .55, floors: F.inner }, { part: "wall", cells: cells.wall, faceH: 1.1, floors: 1, wall: true }, { part: "t", cells: cells.heart, faceH: 1 + F.heart * .5, floors: F.heart }].filter((b) => b.cells.length);
  if (!blocks.length && !doors.length) return null;
  const all = blocks.flatMap((b) => b.cells), xs = all.map((c) => c.x), ys = all.map((c) => c.y), bx = xs.length ? Math.min(...xs) : 0, by = ys.length ? Math.min(...ys) : 0;
  const rec = { id: `pentagon-${cx}-${cy}-${rx}-${ry}`, kind: "greatBuilding", v: 2, pentagon: true, big: true, name: P.name, style: "keep", x: 16, y: 31, bounds: { x: bx, y: by, w: xs.length ? Math.max(...xs) - bx + 1 : 1, h: ys.length ? Math.max(...ys) - by + 1 : 1 }, footprint: all, blocks, doors, hatches: [], crumbled: [], grain: hh("grain") % 97, state: "closed", actions: [] };
  if (roofed) Object.assign(rec, { pentRoof: R0, parapet, ledges }); // v7: the roof's parapet and its ledges, for drawing (renderer greatBlocks)
  map.objects.push(rec); map.greatBuilding = { id: rec.id, pentagon: true, cx, cy, version: V }; map.pentagon = { cx, cy, V, base: plan.base };
  if (roofed) { map.pentagon.roof = true; const S = plan.ledges.stair, f = S && toLocal(cx, cy, S.foot.gx, S.foot.gy); if (f && f.rx === rx && f.ry === ry) map.pentagon.stairFoot = { x: f.x, y: f.y }; } // the stair's foot is joined to the land (game.ts loadArea)
  return rec;
}

// ------------------------------------------------------------------------------------------------ a chamber
// Version nine's rooms can leave a solid band inside the outer wall. Keep one
// quiet alcove connected to the entry so the unchanged finale finder has a place.
function reservePentagonFinaleAlcove(tiles, W, H, entry, ports, id, floorKind) {
  const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]], start = entry.y * W + entry.x;
  const reached = new Set([start]), queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i], x = k % W, y = Math.floor(k / W);
    for (const [dx, dy] of steps) {
      const nx = x + dx, ny = y + dy, n = ny * W + nx, t = tiles[n];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || !t || t.blocked || t.hole || reached.has(n)) continue;
      reached.add(n); queue.push(n);
    }
  }
  // Grow inward-only paths from the existing reachable floor. Each predecessor
  // leads to that floor, and no other outer wall or port needs to be changed.
  const distance = new Int32Array(W * H).fill(-1), previous = new Int32Array(W * H).fill(-1);
  for (const k of reached) distance[k] = 0;
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i], x = k % W, y = Math.floor(k / W);
    for (const [dx, dy] of steps) {
      const nx = x + dx, ny = y + dy, n = ny * W + nx;
      if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1 || distance[n] >= 0) continue;
      distance[n] = distance[k] + 1; previous[n] = k; queue.push(n);
    }
  }
  const clearOfWays = (x, y) => ports.every(p => Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) > 2);
  const candidates = [], add = (x, y, ix, iy) => {
    const wall = tiles[y * W + x], inner = tiles[iy * W + ix], k = iy * W + ix;
    if (!wall?.blocked || wall.doorway || !inner || inner.doorway || distance[k] < 0 || !clearOfWays(x, y) || !clearOfWays(ix, iy)) return;
    candidates.push({ x, y, inner: { x: ix, y: iy }, k, carve: distance[k], fromEntry: Math.hypot(ix - entry.x, iy - entry.y), hash: hashSeed(`${id}:finale-alcove:${x},${y}`) });
  };
  for (let y = 2; y <= H - 3; y++) { add(0, y, 1, y); add(W - 1, y, W - 2, y); }
  for (let x = 2; x <= W - 3; x++) add(x, 0, x, 1);
  candidates.sort((a, b) => a.carve - b.carve || b.fromEntry - a.fromEntry || a.hash - b.hash);
  const spot = candidates[0];
  if (!spot) return null;
  for (let k = spot.k; k >= 0 && distance[k] > 0; k = previous[k]) {
    tiles[k] = { ...tiles[k], kind: floorKind, blocked: false, doorway: false };
  }
  // Reserve both the wall and its approach from ordinary objects, foes and the
  // later shortcut placement; their clearance is stricter than the finder needs.
  for (const t of tiles) {
    if (Math.max(Math.abs(t.x - spot.x), Math.abs(t.y - spot.y)) <= 2
      || Math.max(Math.abs(t.x - spot.inner.x), Math.abs(t.y - spot.inner.y)) <= 2) t.pentFinaleClear = true;
  }
  return { x: spot.x, y: spot.y, inner: spot.inner };
}
export function generatePentagonChamber(seed, id, T = 1) { // `T`: the chamber's interior terrain version (great-buildings.ts INTERIOR_TERRAIN)
  const Pp = parsePentagonId(id); if (!Pp) return null; const plan = pentagonPlan(Pp.seed, Pp.cx, Pp.cy, Pp.V), q = plan.nodes[Pp.n]; if (!q) return null;
  const P = PENTAGON, S = BUILDINGS.styles.keep, W = q.W || plan.W, H = q.H || plan.H, base = `${Pp.base}:${q.id}`, open = q.ports.map((p) => ({ x: p.x, y: p.y, inner: p.inner, wall: p.x === 0 || p.y === 0 || p.x === W - 1 || p.y === H - 1 }));
  const plateSpot = plan.plateE && plan.plateE.plate === q.id ? q.ports.find((p) => p.edge === plan.plateE) : null;
  const arrive = open[0]?.inner || { x: W >> 1, y: H >> 1 };
  // v8 changes only the halls: every other chamber is laid out as v7 lays it (the floor plan keyed on the v7 base), so the floors
  // played and tuned under v7 stand as they were; what is placed on them is still keyed on the chamber's own id
  const laid = plan.V >= 8 ? `${Pp.base.replace(/:v\d+$/, ":v7")}:${q.id}` : base;
  let grid, room = null, mat = null, routing = null, area = null;
  const A = plan.V >= AP.version, theme = A ? ADVENTURE_THEMES[q.theme || "tomb"] : null; // v11: every chamber wears its ward's theme
  if (q.hall) grid = null; // v8: a grand hall lays its own floor plan (pentagon-halls.ts), below; its size is its own (q.W, q.H)
  else if (A && q.area) { area = layAdventureArea(base, q.area, W, H, open, arrive); grid = area.grid; } // v11: a district's area, or the Waystone hall
  else if (q.floorKind === "cellar" && plan.V < 9) grid = carveMaze(laid, { n: q.n }, W, H, open);
  else { const layout = plan.V === CLOSE_VIEW_ROOM_ROUTING.pentagonVersion ? layCloseViewRooms : plan.V >= 9 ? layFloorV3 : layFloor;
    const F = layout(plan.V >= 9 ? base : laid, 1, W, H, S, arrive, open.flatMap((p) => [{ x: p.x, y: p.y, v: 2 }, { ...p.inner, v: 2 }])); grid = F.grid; room = F.room; mat = F.mat; routing = F.routing || null; }
  const tiles = q.hall ? layPentagonHall(base, q.hall.type, W, H, open, arrive, S.wall) : [];
  if (q.hall && A) for (let k = 0; k < tiles.length; k++) { const t = tiles[k]; if (t.column && (hashSeed(`${base}:keep-column:${t.x},${t.y}`) % 1000) / 1000 >= AP.halls.columns) tiles[k] = { x: t.x, y: t.y, kind: PENTAGON_HALLS_FLOOR(q.hall.type), blocked: false, doorway: false, detail: (t.x * 7 + t.y * 3) % 4, hall: t.hall }; } // v11: most columns taken out (open floor for the camera)
  const AT = area ? theme.tiles : null, low = area && ADVENTURE_AREAS[q.area]?.low, surfKind = AT ? [AT.path, AT.floor[0], AT.floor[1] || AT.floor[0], AT.accent, AT.low] : null;
  if (!q.hall) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = y * W + x, v = grid[k], cellar = q.floorKind === "cellar";
    if (area) { tiles.push(v === 5 ? { x, y, kind: "hallVoid", blocked: true, hallVoid: true, detail: (x * 3 + y) % 4 } : v === 1 ? { x, y, kind: low ? AT.under : AT.wall, blocked: true, detail: (x * 3 + y) % 4 } : { x, y, kind: surfKind[area.surf[k]] || AT.path, blocked: false, doorway: v === 2, detail: (x * 7 + y * 3) % 4 }); continue; }
    if (v === 1 || v === 4) tiles.push({ x, y, kind: v === 4 ? "rubbleFloor" : cellar ? "cellarWall" : S.wall, blocked: true, detail: (x * 3 + y) % 4 });
    else tiles.push({ x, y, kind: cellar ? "cellarFloor" : room && room[k] >= 0 ? mat[room[k]] : S.hall, blocked: false, doorway: v === 2, detail: (x * 7 + y * 3) % 4 }); }
  if (plan.V >= 2) { // v2: a ladder that the rooms' walls fell on is dug free, and joined to the floor by the shortest way
    const free = (x, y) => { const t = tiles[y * W + x]; if (t.blocked) tiles[y * W + x] = { ...t, kind: area ? AT.path : q.floorKind === "cellar" ? "cellarFloor" : S.hall, blocked: false, ...(t.hallVoid ? { hallVoid: undefined } : {}) }; };
    for (const p of q.ports) if (p.kind === "pass" && q.kind === "heart") { free(p.x, p.y); const seen = new Set([arrive.y * W + arrive.x]), st = [arrive]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = tiles[k]; if (!t || t.blocked || seen.has(k)) continue; seen.add(k); st.push({ x, y }); } }
      if (seen.has(p.y * W + p.x)) continue; let best = null; for (const k of seen) { const x = k % W, y = (k / W) | 0, d = Math.abs(x - p.x) + Math.abs(y - p.y); if (!best || d < best.d) best = { x, y, d }; }
      if (best) { let x = p.x, y = p.y; while (x !== best.x) { x += Math.sign(best.x - x); free(x, y); } while (y !== best.y) { y += Math.sign(best.y - y); free(x, y); } } } }
  const finaleAlcove = plan.V >= 9 && q.id === `h${plan.nh - 1}`
    ? reservePentagonFinaleAlcove(tiles, W, H, arrive, q.ports, id, area ? AT.path : q.floorKind === "cellar" ? "cellarFloor" : S.hall)
    : null;
  if (A && !area) for (const t of tiles) { const k = theme.remap[t.kind]; if (k) t.kind = k; } // v11: ring chambers, halls and the Heart in their theme's stone (the Heart's is the tomb's own)
  const objects = [], exitsTo = {}, entries = {}, N = P.names;
  for (const p of q.ports) { if (p.kind === "world") { const w = p.world, oid = `building-exit-${w.key}`; entries[w.key] = { ...p.inner };
      const to = w.toGate ? plan.gate.out : w.out, L = toLocal(plan.cx, plan.cy, to.gx, to.gy);
      objects.push({ id: oid, kind: "exit", name: w.toGate ? "Way out · the outer gate" : w.balcony ? P.balconies.exit : w.exterior ? "Door out · bolted on this side" : w.side ? "Side door out" : w.place === "land" ? "Gate out" : w.place === "central" ? "Door · the central court" : `Door · ${N.faces[Number(w.place.slice(1))]} court`, x: p.x, y: p.y, state: "open", actions: ["exit"], ...(w.lock ? { lock: w.lock, lockName: "Regent's Key" } : {}), ...(w.gate ? { gate: w.gate } : {}), ...(w.sigil ? { sigil: true, ...(plan.V >= 4 ? { sigilKey: `w:${w.key}` } : {}) } : {}), ...(w.exterior ? { shortcutOpens: w.exterior } : {}) });
      exitsTo[oid] = { rx: L.rx, ry: L.ry, x: L.x, y: L.y }; continue; }
    const o = plan.nodes.find((n) => n.id === p.to), there = o.ports.find((pp) => pp.kind === "pass" && pp.to === q.id), heart = q.kind === "heart", dir = heart ? (o.n > q.n ? "down" : "up") : "door";
    objects.push({ id: `lab-pass-${o.n}`, kind: "buildingStair", name: `${p.edge.advShortcut ? P.shortcuts.kinds[p.edge.advShortcut][p.edge.far === q.id ? "deepName" : "name"] : dir === "door" ? (A && p.edge.via ? ADVENTURE_LINKS[p.edge.via].name : "Door") : dir === "down" ? "Ladder down" : "Ladder up"} · ${o.name}`, ...(p.edge.advShortcut ? { advShortcut: p.edge.advShortcut } : {}), x: p.x, y: p.y, state: "open", actions: [dir === "down" ? "descend" : "climb"], toId: chamberId(plan, o), toX: there.inner.x, toY: there.inner.y, dir, labyrinth: true, ...(plateSpot && p === plateSpot ? { plateLock: true } : {}), ...(p.edge.sigil ? { sigil: true } : {}), ...(dir === "down" && q.boss && (plan.V === 2 || plan.V >= 4) ? { bossGate: true } : {}), ...(p.edge.sigil && plan.V >= 4 ? { sigilKey: `e:${p.edge.a}-${p.edge.b}` } : {}),
      ...(p.edge.shortcut ? (p.edge.far === q.id ? { shortcutOpens: p.edge.shortcut } : { barred: true, shortcutKey: p.edge.shortcut }) : {}), ...(p.edge.secret && o.kind === "secret" ? { lock: p.edge.secret, lockName: p.edge.shardName, secretDoor: true } : {}) }); }
  const route=plan.optionalRoutes?.find(r=>!r.reason&&(r.a===q.id||r.b===q.id)), optionalLandings=route?[route]:[];
  if(route) {
    const other=plan.nodes.find(n=>n.id===(route.a===q.id?route.b:route.a)), original=objects.find(o=>o.id===`lab-pass-${other.n}`);
    // Clone the complete directed transition, including every ordered Game guard/effect field.
    // Coordinates/identity alone differ; existing ports and macro edges remain untouched.
    objects.push({...original,id:`routing-${route.id}-${q.id}`,counterpartId:`routing-${route.id}-${other.id}`,routeId:route.id,equivalentId:original.id,
      name:`Side ${original.name.toLowerCase()}`,x:route.x,y:route.y,toX:route.x,toY:route.y,toFloor:other.n+1});
  }
  const pid = plan.V >= 8 && !q.hall ? `${laid.slice(0, -q.id.length - 1)}:f${q.n + 1}` : id, h = (k) => hashSeed(`${pid}:${k}`), taken = new Set(objects.map((o) => o.y * W + o.x)), ok = (x, y) => { const t = tiles[y * W + x]; return t && !t.blocked && !t.doorway && !t.pentFinaleClear && !taken.has(y * W + x) && !routingNearLanding(optionalLandings,x,y); };
  const reach = new Set([arrive.y * W + arrive.x]), st = [arrive]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = tiles[k]; if (!t || t.blocked || reach.has(k)) continue; reach.add(k); st.push({ x, y }); } }
  const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (ok(x, y) && reach.has(y * W + x) && Math.abs(x - arrive.x) + Math.abs(y - arrive.y) >= 5) cells.push({ x, y });
  cells.sort(byHash((a) => `${pid}:c:${a.x},${a.y}`)); /* v8: an ordinary chamber places as v7 does (`pid`, the v7 id) */ const take = () => { const c = cells.find((p) => !taken.has(p.y * W + p.x)); if (c) taken.add(c.y * W + c.x); return c; };
  // v11: the Waystone (in the hall's round, or a vast Pentagon's second, deep in), a vista's view, a side area's or an untried keep's cache
  if (A) { const near = (to) => { if (!to) return take(); let best = null; for (const c of cells) if (!taken.has(c.y * W + c.x)) { const d = Math.abs(c.x - to.x) + Math.abs(c.y - to.y); if (!best || d < best.d) best = { c, d }; } if (best) taken.add(best.c.y * W + best.c.x); return best?.c || null; }, Wy = AP.waystone;
    if (q.waystone) { const c = near(area?.centre); if (c) objects.push({ id: "adv-waystone", kind: "pentWaystone", waystone: q.waystone, pentBase: Pp.base, chamberId: id, name: q.waystone === 1 ? Wy.name : Wy.deepName, x: c.x, y: c.y, state: "ready", actions: ["rest"], lore: Wy.lore }); }
    if (q.area === "vista") { const c = near(area?.landmark); if (c) objects.push({ id: "adv-vista", kind: "advVista", name: `A view · ${theme.landmark.name}`, x: c.x, y: c.y, state: "waiting", actions: ["look"], lore: theme.landmark.lore }); }
    if (q.side || (q.area === "keep" && !q.trial)) { const c = take(); if (c) objects.push({ id: "adv-cache", kind: "chest", advCache: true, name: AP.cache.name, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache, lore: AP.cache.lore }); } }
  // the pressure plate beside its door, and rubble to build with
  if (plateSpot) { const near = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]].map(([dx, dy]) => ({ x: plateSpot.inner.x + dx, y: plateSpot.inner.y + dy })).find((c) => ok(c.x, c.y) && reach.has(c.y * W + c.x));
    if (near) { tiles[near.y * W + near.x] = { ...tiles[near.y * W + near.x], plate: true }; taken.add(near.y * W + near.x); }
    const rub = take(); if (rub) objects.push({ id: "pent-rubble", kind: "pentRubble", name: "Loose rubble", x: rub.x, y: rub.y, state: "open", actions: ["take"], lore: "Fallen masonry: enough sound stone for a block or two." }); }
  if (q.key) { const c = take(); if (c) objects.push({ id: `lab-${q.key.id}`, kind: "labKey", keyId: q.key.id, name: q.key.name, x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: "The Regent's key, heavy and cold. A sealed door into the central court waits for it." }); }
  if (q.relic !== undefined) { const c = take(); if (c) objects.push({ id: `pent-relic-${q.relic}`, kind: "pentRelic", relic: q.relic, name: "A relic of the Fivefold Court", x: c.x, y: c.y, state: "waiting", actions: ["read"], lore: P.relics[q.relic] }); }
  if (q.shard) { const c = take(); if (c) objects.push({ id: `lab-${q.shard.id}`, kind: "labKey", keyId: q.shard.id, name: q.shard.name, x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: "A shard of carved stone, warm to the touch. Somewhere a hidden door has a hollow it would fit." }); }
  if (q.sealedVault !== undefined) { const c = take(); if (c) objects.push({ id: "pent-sealed", kind: "chest", sealedVault: true, name: `${q.name}: its hoard`, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache });
    const r = take(); if (r) objects.push({ id: `pent-relic-${P.relics.length + q.sealedVault}`, kind: "pentRelic", relic: P.relics.length + q.sealedVault, name: "A relic of the Fivefold Court", x: r.x, y: r.y, state: "waiting", actions: ["read"], lore: P.sealedRelics[q.sealedVault] }); }
  if (q.reliquary) { const c = take(); if (c) objects.push({ id: "pent-reliquary", kind: "chest", reliquary: true, name: q.name, x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache }); }
  if (q.seal) { const c = take(); if (c) objects.push({ id: "pent-seal", kind: "pentSigil", name: "The Fivefold Seal", x: c.x, y: c.y, state: "waiting", actions: ["take"], lore: P.messages.seal }); }
  const V2 = plan.V >= 2, vault = q.id === `h${plan.nh - 1}`, enemySpawns = [], hi = q.kind === "heart" ? Number(q.id.slice(1)) : 0;
  const G = A && q.area && !q.lord && !q.warden ? ADVENTURE_AREAS[q.area].guards : null, roster = A ? adventureRoster(q.theme || "tomb", plan.V) : P.guards;
  const ng = G ? G[0] + h("n") % (G[1] - G[0] + 1) : V2 && q.warden ? P.warden.ghouls : V2 && q.lord ? P.lord.ghouls : V2 && q.boss ? P.deepBoss.ghouls[0] + h("n") % (P.deepBoss.ghouls[1] - P.deepBoss.ghouls[0] + 1) : q.trial ? P.trialGuards : P.ghouls[0] + h("n") % (P.ghouls[1] - P.ghouls[0] + 1);
  // v2: a lord or a floor's keeper, a named boss: a lord at the far end of its hall, a keeper by the way down it holds
  const boss = V2 && (q.lord || q.boss || q.warden); if (boss) { const down = q.ports.find((p) => p.kind === "pass" && plan.nodes.find((n) => n.id === p.to).n > q.n), toward = down ? down.inner : null, d = (c) => toward ? Math.abs(c.x - toward.x) + Math.abs(c.y - toward.y) : -(Math.abs(c.x - arrive.x) + Math.abs(c.y - arrive.y));
    const c = cells.filter((p) => !taken.has(p.y * W + p.x)).sort((a, b) => d(a) - d(b))[0]; if (c) { taken.add(c.y * W + c.x); const B = q.lord ? P.lord : q.warden ? P.warden : P.deepBoss, grow = q.lord || q.warden ? 1 : 1 + B.perFloor * hi;
      enemySpawns.push({ id: `${id}:lord`, kind: boss.kind, x: c.x, y: c.y, buildingGuard: true, boss: true, packGuardian: true, pentBoss: { name: boss.name, hp: B.hp * grow, damage: B.damage * grow, affixes: B.affixes } }); } }
  // v11: a share of a chamber's ordinary guards are its theme's adventure creatures (adventure-creatures.ts), placed by habitat
  // once the floor's heights are laid (below); the rest as before
  const advModule = A ? adventureCreatureTheme(q.theme || "tomb") : null, advSlots = [];
  for (let i = 0; i < ng; i++) { const c = take(); if (!c) break; const adv = advModule && (hashSeed(`${id}:adventure-slot:${i}`) % 1000) / 1000 < AP.creatures.share ? pickAdventureCreature(advModule, `${id}:g${i}`) : null;
    if (adv) { advSlots.push({ i, c, kind: adv.kind }); continue; } enemySpawns.push({ id: `${id}:g${i}`, kind: roster[h(`k${i}`) % roster.length], x: c.x, y: c.y, buildingGuard: true }); }
  if (V2 ? vault : q.id === "h2") { const c = take(); if (c) objects.push({ id: "building-cache", kind: "chest", name: "The Regent's Hoard", x: c.x, y: c.y, state: "closed", actions: ["open"], rewardSource: S.cache });
    const g = take(); if (g) enemySpawns.push({ id: `${id}:guardian`, kind: P.regent, x: g.x, y: g.y, buildingGuard: true, buildingGuardian: true, ...(V2 ? { boss: true, packGuardian: true, pentBoss: { name: "The Regent", ...P.regentBoss } } : {}) }); }
  const AD = AP.dread, advDread = A && (q.kind === "district" || q.kind === "waystone") ? Math.min(AD.max, q.kind === "waystone" ? AD.hub : AD.front + AD.perRow * (q.row || 0) + (q.layer === "upper" ? AD.upper : q.layer === "lower" ? AD.lower : 0)) : null;
  const D = P.dread, dread = advDread !== null ? advDread : V2 ? Math.min(D.max, q.kind === "outer" ? D.outer : q.kind === "inner" || q.kind === "secret" || q.kind === "sealed" ? D.inner : D.heart + D.perFloor * hi) : 0;
  const depth = q.kind === "outer" || q.kind === "district" || q.kind === "waystone" ? 1 : q.kind === "inner" || q.kind === "secret" || q.kind === "sealed" ? 2 : 3 + Number(q.id.slice(1));
  // v8: a grand hall's record, murals, sigils and backdrop; in any other chamber, the Watcher's sigil over some of its doors
  // (pentagon-halls.ts; data for Close View). Laid last, so nothing placed above moves; older versions get none of it.
  const dress = q.hall ? dressPentagonHall({ W, H, tiles, objects, enemySpawns }, Pp.base, q, plan.V) : plan.V >= 8 ? { sigils: pentagonChamberSigils(Pp.base, q, W, H, plan.V) } : null;
  const chamber = { seed, id, recipe: "greatBuilding", name: `${P.name} · ${q.name}${q.trial ? " · a trial" : ""}`, identity: `${P.name}: ${q.name}`, danger: "ghouls", width: W, height: H, tiles, entry: { ...arrive }, exit: null, objects, enemySpawns,
    building: { base: Pp.base, style: "keep", ...(routing ? {routing,optionalRoutes:plan.optionalRoutes} : {}), floor: depth, floors: V2 ? 3 + plan.nh - 1 : 5, labyrinth: true, pentagon: true, node: q.n, kind: q.floorKind, of: plan.nodes.length, keys: plan.keyNode ? [{ id: "key0", name: "Regent's Key" }] : plan.V >= 3 ? P.shardNames.slice(0, P.secrets).map((name, k) => ({ id: `shard${k}`, name })) : [], trial: !!q.trial, trials: plan.trials.length, entries, exitsTo, vault: V2 ? vault : q.id === "h2", ...(V2 ? { V: plan.V, dread, boss: !!boss, levers: plan.levers.length, champions: plan.trials.length + plan.nh - 1, heartFloor: q.kind === "heart" ? hi : -1 } : {}), ...(A ? { adventure: { theme: q.theme || "tomb", district: q.district ?? null, area: q.area || null, waystone: q.waystone || 0, size: plan.adventure.size, cv: { ...theme.cv }, palette: { ...theme.palette } } } : {}), breachEntry: null, roofLadder: null, fallTo: null }, layoutVersion: 1, themePool: 0, ...(dress || {}) };
  // The temporary reservation makes optional platform placement prove a walking
  // route to the alcove too. It is never an interactable in the returned chamber.
  const terrain = addInteriorTerrain(finaleAlcove ? { ...chamber, objects: [...objects, { ...finaleAlcove.inner }] } : chamber, Pp.base, plan.V >= 9 ? 3 : 1, T);
  terrain.objects = objects;
  if (advSlots.length) { // v11: by habitat (a perch, a vantage, open floor, a sand flat), near the slot's own spot, on floor reached from the way in
    const TT = terrain.tiles, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : TT[y * W + x]), held = new Set([...objects, ...terrain.enemySpawns].map((o) => Math.round(o.y) * W + Math.round(o.x))), used = [];
    const area = { width: W, height: H, open: (x, y) => { const t = at(x, y); return !!t && !t.blocked && !t.hole; }, level: (x, y) => at(x, y)?.elev || 0,
      safe: (x, y) => { const t = at(x, y); return !!t && reach.has(y * W + x) && !t.doorway && !t.plate && !t.pentFinaleClear && !t.slope && !held.has(y * W + x) && !routingNearLanding(optionalLandings, x, y); } };
    for (const { i, c, kind } of advSlots) { const p = adventureSpawnSpot(area, kind, c, used) || c; used.push(p); held.add(p.y * W + p.x); terrain.enemySpawns.push({ id: `${id}:g${i}`, kind, x: p.x, y: p.y, buildingGuard: true, adventureCreature: advModule }); } }
  if (A) layAdventureMosaic(terrain, id, q, theme); // v11: the Watcher's sigil in the floor, last (floor marks only)
  return terrain;
}
// v11 (adventures.ts ADVENTURE_PENTAGON.mosaics): the Watcher's sigil as a large floor mosaic in a grand hall, a keep, the Waystone
// hall and a share of the plazas, courts and vistas. The spot: the first, out from the middle (seeded), where the sigil and its
// border lie on open, level floor clear of doorways, plates, slopes, the finale's reserve and any floor mark already laid. Only
// `sigil` (the part) and `sigilTint` change on those tiles; the chamber's sigils list records it. Pure.
function layAdventureMosaic(map, id, q, theme) {
  const M = AP.mosaics, want = q.hall ? M.hall : M[q.area] ?? 0; if (!want || (hashSeed(`${id}:mosaic`) % 1000) / 1000 >= want) return null;
  const W = map.width, T = map.tiles, tint = theme.palette.light;
  if (T.some((t) => t.sigil)) { for (const t of T) if (t.sigil) t.sigilTint = tint; map.watcherPlaced = true; return null; } // a hall that inlays the sigil itself (ballroom, arena) keeps its own, in the ward's light
  const open = (t) => !!t && !t.blocked && !t.doorway && !t.plate && !t.slope && !t.hole && !t.pentFinaleClear && !t.inlay && !t.sigil, ok = (t, x, y, cx, cy) => open(t) && (t.elev || 0) === (T[cy * W + cx]?.elev || 0);
  const Hh = map.height, S = new Int32Array((W + 1) * (Hh + 1)); // a summed table of the tiles that may not carry it: a box is tested in O(1) before the full test
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) S[(y + 1) * (W + 1) + x + 1] = (open(T[y * W + x]) ? 0 : 1) + S[y * (W + 1) + x + 1] + S[(y + 1) * (W + 1) + x] - S[y * (W + 1) + x];
  const boxClear = (x0, y0, x1, y1) => S[(y1 + 1) * (W + 1) + x1 + 1] - S[y0 * (W + 1) + x1 + 1] - S[(y1 + 1) * (W + 1) + x0] + S[y0 * (W + 1) + x0] === 0;
  const H = map.height, mx = (W >> 1) + (hashSeed(`${id}:mosaic-jx`) % 5) - 2, my = (H >> 1) + (hashSeed(`${id}:mosaic-jy`) % 5) - 2, m = M.margin, spots = [];
  for (let y = 1 - SIGIL_BOUNDS.minY + m; y < H - 1 - SIGIL_BOUNDS.maxY - m; y++) for (let x = 1 - SIGIL_BOUNDS.minX + m; x < W - 1 - SIGIL_BOUNDS.maxX - m; x++) spots.push({ x, y, d: (x - mx) ** 2 + (y - my) ** 2 });
  spots.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x); // every spot, nearest the (seeded) middle first: at most a chamber's tiles
  const spot = spots.find((p) => boxClear(p.x + SIGIL_BOUNDS.minX - m, p.y + SIGIL_BOUNDS.minY - m, p.x + SIGIL_BOUNDS.maxX + m, p.y + SIGIL_BOUNDS.maxY + m) && sigilFits(map, W, p.x, p.y, ok, m)); if (!spot) return null;
  inlaySigil(map, W, spot.x, spot.y, { mosaic: true });
  for (let y = spot.y + SIGIL_BOUNDS.minY - 1; y <= spot.y + SIGIL_BOUNDS.maxY + 1; y++) for (let x = spot.x + SIGIL_BOUNDS.minX - 1; x <= spot.x + SIGIL_BOUNDS.maxX + 1; x++) { const t = T[y * W + x]; if (t?.sigil) t.sigilTint = tint; }
  (map.sigils ||= []).push({ x: spot.x, y: spot.y, kind: "inlay", mosaic: true, scale: SIGIL_BOUNDS.maxY - SIGIL_BOUNDS.minY + 1 });
  map.watcherPlaced = true; // the chamber's sigil is this one: watcher.ts placeWatcherDungeon lays no second over it
  return spot;
}

// ------------------------------------------------------------------------------------------------ what the walls say
// Tim, 2026-11-04 (docs/narrative-bible.md, section 1, "The Pentagons, the keeps and the Tesseracts" and "Why the game
// exists"): "Nobody is certain what the Pentagons are... It shouldn't be overdone... these are just interesting thoughts."
// A few chambers, not many, have marks in a wall. Each leans one way: the Corridor outcropping (`outcrop`), a people of
// the Corridor who built it (`people`), two realities pressed together at a fold (`seam`), or nothing anyone wrote
// (`none`). They contradict each other on purpose; nothing settles it, nothing counts them, and no quest follows.
//
// Placement is laid over a chamber when it loads (as a crossing's margin is): the chamber's own generation is untouched,
// so floors already explored regenerate byte for byte. Whether a chamber has marks is a hash of the seed and the chamber;
// which marks, one of those not yet read (a chamber where marks were read keeps them). Save (additive, schema 14,
// normalised in lore.ts ensureLore): save.lore.inscriptions = [ids read], save.lore.inscribedAt = { chamberId: id }.
// `vent`: vent-life. A few creatures of the keeps and Pentagons live on the warmth of the seam; their Codex entries say so.
export const PENTAGON_LORE = {
  chance: .22, minFromEntry: 4, // the share of chambers with marks; never right at the way in
  name: "Marks in the wall", title: "In the Pentagon's walls",
  inscriptions: [
    { id: "outcrop0", lean: "outcrop", text: "Scratched small beside a door: “We did not lay these stones. We found the rooms already square, and swept them.”" },
    { id: "outcrop1", lean: "outcrop", text: "Chalked along a lintel in a careful hand: “North Face measured again. Longer than last year. No one has built anything.”" },
    { id: "outcrop2", lean: "outcrop", text: "Cut low in the wall, the letters shallow: “It came up here the way frost comes up on a pane. All we did was name the rooms.”" },
    { id: "people0", lean: "people", text: "A builder’s dedication, deep and square: “Raised by the silver-handed, who walked the Corridor before it had roads, for those who come after and do not stay.”" },
    { id: "people1", lean: "people", text: "A mason’s tally of five marks, and beside it: “Our hands are longer than yours. Mind the high steps.”" },
    { id: "people2", lean: "people", text: "Pressed into the mortar, the print of a hand with too many joints, and under it, neatly: “I made this wall. Remember that someone did.”" },
    { id: "seam0", lean: "seam", text: "In a surveyor’s hand, beside a sketch of layered rock: “Not built. Folded. Two beds of stone that never lay together, pressed until they stood up.”" },
    { id: "seam1", lean: "seam", text: "Scratched with a nail: “The fold is warm. Put your palm where the two kinds of stone meet. It is warm all year.”" },
    { id: "seam2", lean: "seam", text: "Ruled lines, and a date in no calendar: “The grain of the outer wall runs one way and the grain of the inner another. Something came through here, and the stone set round it.”" },
    { id: "none0", lean: "none", text: "Lines in the stone in no hand at all: not cut, not written, as if the wall had grown them. You read them, and afterwards cannot say what they said." },
  ],
  vent: {
    pallidCrawler: "In the Pentagons they crowd into the angles where two walls meet wrongly, pressed flat to the stone, feeding on the warmth where two pages meet.",
    graveLantern: "Its light is brightest near the seams of the great buildings, where the stone is faintly warm. It seems to drink there, slowly, the way a wick drinks oil.",
    ashling: "The ashlings of the keeps are not the ashlings of the furnaces. They sleep in cracks where one kind of stone has grown into another, and those cracks are always warm.",
  },
};
const inscription = (id) => PENTAGON_LORE.inscriptions.find((q) => q.id === id) || null;
const readList = (save) => (Array.isArray(save?.lore?.inscriptions) ? save.lore.inscriptions : []);
// Which marks a chamber holds (an inscription id), or null. A chamber where marks were read keeps them; otherwise a hashed
// share of chambers hold one of the marks not yet read, and once every one is read, new chambers hold none.
export function inscriptionIn(save, chamberId) {
  if (!isPentagonId(chamberId)) return null;
  const L = PENTAGON_LORE, kept = save?.lore?.inscribedAt?.[chamberId]; if (typeof kept === "string" && inscription(kept)) return kept;
  const h = hashSeed(`${save?.seed}:pentagon-lore:v1:${chamberId}`); if ((h % 10000) / 10000 >= L.chance) return null;
  const read = new Set(readList(save)), left = L.inscriptions.filter((q) => !read.has(q.id));
  return left.length ? left[(h >>> 11) % left.length].id : null;
}
// Lays the chamber's marks on open floor against a wall, reachable from the way in, away from it, and clear of every other
// object and creature. Returns the object or null.
export function addPentagonInscription(map, save, chamberId) {
  if (!map?.building?.pentagon || !map.tiles?.length || map.objects?.some((o) => o.kind === "pentInscription")) return null;
  const id = inscriptionIn(save, chamberId); if (!id) return null;
  const W = map.width, H = map.height, T = map.tiles, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : T[y * W + x]), e = map.entry || { x: W >> 1, y: H >> 1 };
  const taken = new Set([...(map.objects || []), ...(map.enemySpawns || [])].map((o) => Math.round(o.y) * W + Math.round(o.x)));
  const reach = new Set([e.y * W + e.x]), st = [e]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, t = at(x, y); if (!t || t.blocked || reach.has(y * W + x)) continue; reach.add(y * W + x); st.push({ x, y }); } }
  const wallBy = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy)?.blocked);
  const spots = [...reach].map((k) => ({ x: k % W, y: (k / W) | 0 })).filter(({ x, y }) => { const t = at(x, y); return !t.doorway && !t.plate && !taken.has(y * W + x) && Math.abs(x - e.x) + Math.abs(y - e.y) >= PENTAGON_LORE.minFromEntry && wallBy(x, y); }).sort((a, b) => a.y - b.y || a.x - b.x);
  if (!spots.length) return null;
  const c = spots[hashSeed(`${save?.seed}:pentagon-lore-at:v1:${chamberId}`) % spots.length], read = readList(save).includes(id);
  const o = { id: "pent-inscription", kind: "pentInscription", inscription: id, chamberId, name: PENTAGON_LORE.name, x: c.x, y: c.y, state: read ? "read" : "waiting", actions: ["read"] };
  (map.objects ||= []).push(o); return o;
}
// Reading the marks: their words; the first time, remembered (save.lore). Returns { ok, first, text, message }.
export function readPentagonInscription(save, o) {
  const q = inscription(o?.inscription); if (!q) return { ok: false, message: "The marks are worn past reading." };
  const lore = (save.lore ||= {}), list = Array.isArray(lore.inscriptions) ? lore.inscriptions : (lore.inscriptions = []), first = !list.includes(q.id);
  if (first) list.push(q.id);
  if (o.chamberId) { if (!lore.inscribedAt || typeof lore.inscribedAt !== "object") lore.inscribedAt = {}; lore.inscribedAt[o.chamberId] = q.id; }
  o.state = "read";
  return { ok: true, first, text: q.text, message: q.text };
}
// The marks read so far, in the order of the table.
export function inscriptionsRead(save) { const read = new Set(readList(save)); return PENTAGON_LORE.inscriptions.filter((q) => read.has(q.id)); }
// ------------------------------------------------------------------------------------------------ the shortcut links' ends
// The link ends that stand in chamber `map` (as generated, before anything is taken from it): each on open floor reachable from
// where you come in, by it (within `nearEntry`) or by a side wall (x 1 or W - 2), so the dungeon dressings laid later (bells,
// pages, threads: x 2..W - 3, six or more from the entry; margins five or more) never see one; no tile changes. Pure.
export function pentagonLinkEnds(plan, map) {
  const S = PENTAGON.shortcuts, q = plan.nodes[map?.building?.node], ends = []; if (!q || !map?.tiles?.length) return ends;
  for (const L of plan.links || []) for (const end of ["near", "deep"]) if (L[end] === q.id) ends.push({ L, end, other: plan.nodes.find((n) => n.id === L[end === "near" ? "deep" : "near"]) });
  if (!ends.length) return [];
  const W = map.width, H = map.height, e = map.entry, taken = new Set([...(map.objects || []), ...(map.enemySpawns || [])].map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const ports = (map.objects || []).filter((o) => o.kind === "exit" || o.kind === "buildingStair");
  const seen = new Set([e.y * W + e.x]), st = [e]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x, t = map.tiles[k]; if (x < 0 || y < 0 || x >= W || y >= H || !t || t.blocked || seen.has(k)) continue; seen.add(k); st.push({ x, y }); } }
  const cand = map.tiles.filter((t) => seen.has(t.y * W + t.x) && !t.pentFinaleClear && !t.doorway && !t.plate && !t.hole && !t.environment && !/water|lava|pit|chasm|void|Gate/i.test(String(t.kind)) && !taken.has(`${t.x},${t.y}`) && (t.x !== e.x || t.y !== e.y)
    && (plan.V === CLOSE_VIEW_ROOM_ROUTING.pentagonVersion
      ? !t.interiorPlatform && !t.slope && [[0,0],[-1,0],[1,0],[0,-1],[0,1]].every(([dx,dy])=>{const q=map.tiles[(t.y+dy)*W+t.x+dx];return q&&!q.blocked&&!q.hole&&!q.interiorPlatform&&(q.elev||0)===(t.elev||0);})
      : (t.x <= 1 || t.x >= W - 2 || Math.hypot(t.x - e.x, t.y - e.y) < S.nearEntry)) && !ports.some((o) => Math.abs(o.x - t.x) <= 1 && Math.abs(o.y - t.y) <= 1))
    .map((t) => ({ t, d: Math.hypot(t.x - e.x, t.y - e.y), h: hashSeed(`${map.id}:link-spot:${t.x},${t.y}`) })).sort((a, b) => a.d - b.d || a.h - b.h);
  const out = [], picked = [];
  for (const { L, end, other } of ends) { const c = cand.find(({ t }) => picked.every((p) => Math.max(Math.abs(p.x - t.x), Math.abs(p.y - t.y)) >= S.spacing)); if (!c) continue; picked.push(c.t);
    const K = S.kinds[L.kind]; out.push({ id: `pent-link-${L.id}-${end}`, kind: "pentShortcut", link: L.id, linkKind: L.kind, end, name: `${end === "deep" ? K.deepName : K.name} · ${other.name}`, x: c.t.x, y: c.t.y, toId: chamberId(plan, other), state: "shut", actions: ["use"], lore: end === "deep" ? K.opens : K.barred }); }
  return out;
}
export const pentagonLinkKey = (id) => `link:${id}`;
// ------------------------------------------------------------------------------------------------ the finale: a walk among the stars
// The completion's Tesseract (Tim, 2026-11-05: "There should be at least one Tesseract for completing the Pentagon; one Tesseract
// per Pentagon"). Every version, whatever else it pays. A Pentagon is complete when its finale beast falls in the Stillworks
// (`pentArenaWon`), or, for one whose wall opened onto the walkway before the Stillworks (`pentFinale` with no `pentArena`),
// when its Regent fell, or when its Regent fell before release 750 (pentagonFellEarly). Paid once, on completion or (for one completed before) on the next start of the game; recorded on the
// base floor's history (`pentComplete`, the source), and the source is in `tesseracts.got` as every glyph's is.
export const PENTAGON_COMPLETE = {
  grade: "regent", from: "the Pentagon's completion",
  early: { upTo: 2, grade: "hollow" }, // Tim, 2026-11-05: versions 1 and 2 pay no other glyph; theirs leans hard toward costs (tesseracts.ts)
  notice: "THE PENTAGON IS COMPLETE",
  journal: "The Pentagon is complete. Something of it came away with you: a Tesseract glyph.",
};
export const pentagonCompleteSource = (base) => `${base}:complete`;
export function pentagonCompleteGrade(base) { const C = PENTAGON_COMPLETE, V = parsePentagonId(`${base}:f1`)?.V || 1; return V <= C.early.upTo ? C.early.grade : C.grade; }
export function pentagonCompleted(H) { return !!H && (!!H.pentArenaWon || (!!H.pentFinale && H.pentArena === undefined)); }
// A Pentagon finished before release 750 (Tim accepted "on load", 2026-11-05): its Regent fell (the base floor's `regentGrade`,
// or the vault's own `guardianDefeated`) before the wall ever opened, so neither `pentFinale` nor `pentArena` is recorded (from
// release 750 the Regent's fall opens the wall at once, and from 751 records `pentArena` first). Complete as it stands: paid on
// the next start. Its vault still opens onto the Stillworks as before; that win pays nothing more (the same source).
export function pentagonFellEarly(save, base) {
  const H = save?.consequences?.dungeons?.[`${base}:f1`]; if (!H || H.pentFinale || H.pentArena !== undefined || H.pentArenaWon) return false;
  if (H.regentGrade) return true;
  const p = parsePentagonId(`${base}:f1`), vault = p && pentagonVaultId(pentagonPlan(p.seed, p.cx, p.cy, p.V));
  return !!(vault && save.consequences.dungeons[vault]?.guardianDefeated);
}
// Pays the completion glyph if it is due (null otherwise, or if that source already gave one). Pure on the save.
export function payPentagonCompletion(save, base) {
  const H = save?.consequences?.dungeons?.[`${base}:f1`]; if (!H || H.pentComplete || !(pentagonCompleted(H) || pentagonFellEarly(save, base))) return null;
  const source = pentagonCompleteSource(base); H.pentComplete = source; return grantTesseract(save, source, pentagonCompleteGrade(base), 0, PENTAGON_COMPLETE.from);
}
// The Pentagons this journey holds whose completion glyph is still due (their bases), from the base floors' histories.
export function pentagonsDue(save) {
  const out = []; for (const [id, H] of Object.entries(save?.consequences?.dungeons || {})) { if (!H || H.pentComplete) continue; const p = parsePentagonId(id); if (p && p.n === 0 && (pentagonCompleted(H) || pentagonFellEarly(save, p.base))) out.push(p.base); }
  return out;
}

// PENTAGON.finale. The walkway is a floor of its own, `${base}:finale`, generated only once the Regent has fallen; every
// Pentagon version has the same one (a new id, so no explored floor changes). The opening in the vault is an object laid on
// the vault's outer wall, beside floor you can reach from the way in, clear of every door, link end and object (as generated,
// so it never moves); the vault's tiles are never touched. All pure.
export const pentagonFinaleId = (base) => `${base}:finale`;
const FINALE_ID = /^(pentagon:(.+):(-?\d+):(-?\d+)(?::v(\d+))?):finale$/;
export const isPentagonFinaleId = (id) => FINALE_ID.test(String(id || ""));
export function parsePentagonFinaleId(id) { const m = String(id || "").match(FINALE_ID); return m ? { base: m[1], seed: m[2], cx: Number(m[3]), cy: Number(m[4]), V: Number(m[5] || 1) } : null; }
// The vault chamber's id (the Regent's floor, the bottom of the Heart) and the Pentagon's front door on the land (its first gate,
// just outside: the same spot the vault's own way out leads to), as { rx, ry, x, y }.
export function pentagonVaultId(plan) { const q = plan.nodes.find((n) => n.id === `h${plan.nh - 1}`); return q ? chamberId(plan, q) : null; }
export function pentagonFrontDoor(plan) {
  const w = plan.gate, i = Number(w.node.slice(1)), o = w.out, L = toLocal(plan.cx, plan.cy, o.gx, o.gy), far = facePoint(i >> 1, PENTAGON.bands.out + 1.2 + PENTAGON.finale.arriveOut, i & 1 ? FACE_T : -FACE_T), A = toLocal(plan.cx, plan.cy, far.gx, far.gy);
  return A.rx === L.rx && A.ry === L.ry ? { rx: A.rx, ry: A.ry, x: A.x, y: A.y } : { rx: L.rx, ry: L.ry, x: L.x, y: L.y }; // a step out from the gate, on its paved way (or at the gate, where that step would cross into the next section)
}
// Where the vault's wall opens: a tile of its outer wall (left, right or top), the floor before it reachable from the way in,
// no door, stair, link end, object or creature within a tile of either (two of a way through); the farthest such from the way
// in. { x, y, inner } or null.
export function pentagonFinaleSpot(map) {
  if (!map?.tiles?.length || !map.entry) return null; const W = map.width, H = map.height, at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : map.tiles[y * W + x]), e = map.entry;
  const seen = new Set([e.y * W + e.x]), st = [e]; while (st.length) { const c = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, t = at(x, y); if (!t || t.blocked || seen.has(y * W + x)) continue; seen.add(y * W + x); st.push({ x, y }); } }
  const things = [...(map.objects || []), ...(map.enemySpawns || [])].map((o) => ({ x: Math.round(o.x), y: Math.round(o.y), way: o.kind === "exit" || o.kind === "buildingStair" || o.kind === "pentShortcut" }));
  const clear = (x, y) => things.every((o) => Math.max(Math.abs(o.x - x), Math.abs(o.y - y)) > (o.way ? 2 : 1));
  const sides = []; for (let y = 2; y <= H - 3; y++) sides.push([0, y, 1, y], [W - 1, y, W - 2, y]); for (let x = 2; x <= W - 3; x++) sides.push([x, 0, x, 1]);
  const cand = [];
  for (const [x, y, ix, iy] of sides) { const t = at(x, y), n = at(ix, iy); if (!t?.blocked || t.doorway || !n || n.blocked || n.doorway || n.plate || n.hole || !seen.has(iy * W + ix)) continue;
    if (!clear(x, y) || !clear(ix, iy)) continue;
    cand.push({ x, y, inner: { x: ix, y: iy }, d: Math.hypot(ix - e.x, iy - e.y), h: hashSeed(`${map.id}:finale-wall:${x},${y}`) }); }
  cand.sort((a, b) => b.d - a.d || a.h - b.h); const c = cand[0]; return c ? { x: c.x, y: c.y, inner: c.inner } : null;
}
export function pentagonFinaleWall(base, spot) {
  const F = PENTAGON.finale; return { id: "pent-finale-wall", kind: "pentFinaleWall", name: F.names.wall, x: spot.x, y: spot.y, inner: { ...spot.inner }, toId: pentagonFinaleId(base), face: spot.x === 0 ? "west" : spot.y === 0 ? "north" : "east", state: "open", actions: ["use"], lore: F.messages.opens };
}
// The walkway floor: stars (blocked: nothing to fall into), a pale walkway `walk.half` tiles either side of a line that bends
// gently from the opened wall (west) to the dais's round landing (east), and a few floating stones. The way back leads to the
// vault, beside its opened wall.
export function generatePentagonFinale(seed, id, floorV = PENTAGON.finale.floor) {
  const Pp = parsePentagonFinaleId(id); if (!Pp) return null; const plan = pentagonPlan(Pp.seed, Pp.cx, Pp.cy, Pp.V), F = PENTAGON.finale, [W, H] = F.size, A = F.walk;
  const h = (k) => hashSeed(`${id}:finale:v${F.version}:${k}`), u01 = (k) => (h(k) % 10000) / 10000;
  const mid = Math.round((H - 1) / 2), amp = A.amp[0] + u01("amp") * (A.amp[1] - A.amp[0]), phase = u01("phase") * Math.PI * 2, sign = h("sign") & 1 ? 1 : -1;
  const dx = W - 1 - F.dais.inset, R = Math.ceil(F.dais.r), lo = A.half + 1, hi = H - 2 - A.half;
  const row = (x) => { const u = Math.max(0, Math.min(1, (x - 1) / Math.max(1, dx - 1))); return Math.max(lo, Math.min(hi, Math.round(mid + sign * amp * Math.sin(Math.PI * u) * Math.sin(phase + 2 * Math.PI * A.waves * u)))); };
  const tiles = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles.push(floorV >= 2 ? { x, y, kind: "canyon", environment: "canyon", chasm: true, blocked: false, detail: (x * 7 + y * 3) % 4 } : { x, y, kind: "void", chasm: true, blocked: true, detail: (x * 7 + y * 3) % 4 }); // v2: a drop you can step into
  const floor = (x, y, kind = "starWalk") => { if (x < 1 || y < 1 || x > W - 2 || y > H - 2) return; const t = tiles[y * W + x]; if (kind === "starWalk" && (t.kind === "starWalk" || t.kind === "starDais")) return; tiles[y * W + x] = { x, y, kind, blocked: false, detail: t.detail, ...(kind === "starDais" ? { daisX: dx, daisY: dy } : {}) }; }; // a dais tile knows the dais's centre (its rings are painted across the landing)
  const dy = Math.max(R + 1, Math.min(H - 2 - R, row(dx)));
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (Math.hypot(x - dx, y - dy) <= F.dais.r) floor(x, y, "starDais");
  let prev = mid; for (let x = 1; x <= dx; x++) { const yc = row(x), a = Math.min(yc, prev), b = Math.max(yc, prev); for (let y = a - A.half; y <= b + A.half; y++) floor(x, y); prev = yc; }
  for (let y = Math.min(dy, prev); y <= Math.max(dy, prev); y++) floor(dx, y); // the walkway meets the dais's landing
  // floating stones in the void, well clear of the walkway (looks only)
  const open = (x, y) => !!tiles[y * W + x] && !tiles[y * W + x].blocked && !tiles[y * W + x].chasm, far = [];
  for (let y = 1; y < H - 1; y++) for (let x = 2; x < W - 1; x++) { let ok = true; for (let j = -F.shardClear; j <= F.shardClear && ok; j++) for (let i = -F.shardClear; i <= F.shardClear && ok; i++) if (x + i >= 0 && x + i < W && open(x + i, y + j)) ok = false; if (ok) far.push({ x, y }); }
  far.sort(byHash((c) => `${id}:finale-shard:${c.x},${c.y}`)); const shards = [];
  for (const c of far) { if (shards.length >= F.shards) break; if (shards.some((q) => Math.max(Math.abs(q.x - c.x), Math.abs(q.y - c.y)) < 3)) continue; shards.push(c); tiles[c.y * W + c.x] = { ...tiles[c.y * W + c.x], kind: "starShard", blocked: true, environment: undefined }; }
  const entry = { x: 1, y: mid }, vault = pentagonVaultId(plan);
  const objects = [
    { id: "pent-finale-back", kind: "pentFinaleWall", back: true, name: F.names.back, x: 0, y: mid, toId: vault, face: "east", state: "open", actions: ["use"], lore: F.messages.back },
    { id: "pent-finale-dais", kind: "pentDais", name: F.names.dais, x: dx, y: dy, state: "ready", actions: ["transit"], lore: F.messages.dais },
  ];
  return { seed, id, recipe: "greatBuilding", name: `${PENTAGON.name} · ${F.names.floor}`, identity: `${PENTAGON.name}: ${F.names.floor}`, danger: "none", width: W, height: H, tiles, entry, exit: null, objects, enemySpawns: [],
    building: { base: Pp.base, style: "keep", floor: 3 + plan.nh, floors: 3 + plan.nh, pentagon: true, finale: true, V: plan.V, node: -1, kind: "starfield", of: plan.nodes.length, keys: [], entries: {}, exitsTo: {}, vault: false, breachEntry: null, roofLadder: null, fallTo: null },
    pentFinale: F.version, finaleFloor: floorV, chasm: 1, movers: [], watcherPlaced: true, layoutVersion: 1, themePool: 0 };
}
// ------------------------------------------------------------------------------------------------ v7: the roof, for others
// Is tile (x, y) of the overworld section `map` part of a Pentagon's roof walk: the roof itself or one of its balconies (not
// the parapet, the outer stair or the ground)? Pure; false everywhere on a Pentagon without a roof (version 6 and earlier).
export function pentagonRoofAt(map, x, y) {
  if (!map?.pentagon?.roof || x < 0 || y < 0 || x > 31 || y > 31) return false;
  const t = map.tiles?.[I(Math.floor(x), Math.floor(y))]; return !!t && !t.blocked && !!(t.pentRoof || t.pentBalcony);
}
// Perches on this section's Pentagon roof: roof tiles (not balconies) at the roof's outer edge or by its parapet, `margin` or
// more from the section's edges, clear of objects and of the balconies and the stair's top, at least `spacing` apart (Chebyshev),
// at most `max`, in a hashed order of the Pentagon and the tile. Pure and deterministic; [] where there is no roof.
export function pentagonRoofSpots(map) {
  const K = PENTAGON.roof.perch; if (!map?.pentagon?.roof || !map.tiles?.length) return [];
  const at = (x, y) => (x < 0 || y < 0 || x > 31 || y > 31 ? null : map.tiles[I(x, y)]), held = new Set((map.objects || []).filter((o) => o.kind !== "greatBuilding").map((o) => I(Math.round(o.x), Math.round(o.y))));
  const busy = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = at(x + dx, y + dy); if (t?.pentBalcony || t?.pentStair || held.has(I(x + dx, y + dy))) return true; } return false; };
  const spots = [];
  for (let y = K.margin; y <= 31 - K.margin; y++) for (let x = K.margin; x <= 31 - K.margin; x++) { const t = at(x, y); if (!t?.pentRoof || t.blocked || busy(x, y)) continue;
    if (!N4.some(([dx, dy]) => { const n = at(x + dx, y + dy); return n && (n.pentParapet || !n.greatBuilding); })) continue; // at an edge: by the parapet, or over the land
    spots.push({ x, y, h: hashSeed(`${map.pentagon.base}:${map.greatBuilding?.id}:perch:${x},${y}`) }); }
  spots.sort((a, b) => a.h - b.h || a.y - b.y || a.x - b.x); const out = [];
  for (const s of spots) { if (out.length >= K.max) break; if (out.every((o) => Math.max(Math.abs(o.x - s.x), Math.abs(o.y - s.y)) >= K.spacing)) out.push({ x: s.x, y: s.y }); }
  return out;
}

// ------------------------------------------------------------------------------------------------ finding a Pentagon
// Tim, 2026-11-05: "The sigils on the ground — we need to make sure that they actually point to a Pentagon... They can be really
// far away... if you go on a Pentagon hunt you're going to be hunting for a while... the markers on the floor need to be really
// good"; "the map is divided into regions around each Pentagon... whenever you're within that region, the Pentagon sigils start
// pointing in that direction"; "in some regions you have no Pentagon sigils and you're just wandering... when you get into a
// region that has a Pentagon sigil, you can follow it for a long time before you find the Pentagon"; and a Pentagon hunt that
// "lines out 1 to 2 Pentagons at a time in different locations on the map".
//
// Catchments: every Pentagon not yet completed holds the ground nearer to it than to any other such Pentagon (straight line,
// section to centre section), out to `reach` sections; ground farther than `reach` from every one holds no sigils. A catchment
// is convex (a Voronoi cell cut by a disc round its own Pentagon), so walking the way a sigil points never leaves it: every
// sigil met on the way points at the same Pentagon. Sigils stand on `sigil.chance` of the sections in a catchment, by a hash of
// the seed and the section. A sigil is an object laid on the section when it loads, never a tile, so no explored ground changes.
//
// The search is bounded: the centre sections within `reach` (at most (2·reach/every+1)² of them), nearest first, each first
// passing a cheap test (the Pentagon's own hash, its ring, and the caller's cheap exclusions such as towns and hamlets over the
// nine sections) before the caller's full test, which callers remember per centre. It stops at the first real Pentagon.
export const PENTAGON_FINDING = {
  version: 1, // the sigils' hash namespace and the hunts' (a change to where they stand or what they offer is a new version)
  reach: 28, // a catchment's radius (sections, straight line from the Pentagon's centre section)
  sigil: { chance: .2, spots: [[16, 15], [13, 16], [19, 17], [15, 19], [18, 12], [12, 12], [21, 20], [10, 19], [22, 11], [9, 9]] }, // share of a catchment's sections with a sigil; where on the section it is cut (the first clear one)
  memo: 1024, // centre sections whose full test a game remembers (cleared when full)
  hunts: { offer: 2, near: 18, far: 44, spread: 1.9, tries: 6, keep: 8, settle: 3 }, // hunts open at once; how far out (sections) one is looked for; how far apart in bearing (radians) two open ones must lie; bearings tried per search; finished hunts kept; seconds in a section before the one search there
  far: [[6, "close by"], [14, "a few crossings off"], [26, "many crossings off"], [48, "far off"], [Infinity, "very far off: a long journey"]], // distance words, by sections
  name: "A Pentagon sigil",
  retiredPin: "The Pentagon (the sigil's)", // the compass pin a sigil read set in release 775; main.ts lets it go on load
  messages: {
    read: "A five-sided sigil is cut into the ground, one of its points drawn out long. It points",
    // Tim, 2026-11-05: "it's gonna be on you to find them... I don't want to interrupt the game". A sigil read and a hunt laid
    // out touch neither the compass nor the Atlas, and a hunt opens with no banner: a Journal line in words (heading and how far,
    // never the section), and the ground's sigils, are all there is to go on.
    sigilJournal: (heading, far) => `A Pentagon sigil points ${heading}: a five-sided wall stands that way, ${far}.`,
    huntJournal: (heading, far) => `A Pentagon hunt opens: a five-sided wall stands to the ${heading}, ${far}. Nothing marks it on the map; it is yours to find.`,
    arrived: "THE SIGIL'S PENTAGON",
    arrivedDetail: "the five-sided wall the sigils pointed to",
    huntFound: "PENTAGON HUNT · FOUND",
    huntDone: "PENTAGON HUNT COMPLETE",
    huntDoneDetail: "another lies far out · see the Journal",
  },
};
const OCTANTS = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"];
// The heading from one section to another in eight compass words, by the true bearing (north is up, -y).
export function pentagonHeading(dx, dy) { if (!dx && !dy) return "here"; return OCTANTS[mod(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)), 8)]; }
export function pentagonFarWords(d) { for (const [upTo, w] of PENTAGON_FINDING.far) if (d <= upTo) return w; return PENTAGON_FINDING.far.at(-1)[1]; }
// The cheap necessary test for a Pentagon centred at (cx, cy): its hash, its ring, and `cheap(rx, ry)` (true: no Pentagon may
// cover that section) over its nine sections. A centre that fails it holds no Pentagon (pentagonAt refuses it too).
export function pentagonCandidate(seed, cx, cy, cheap = null) {
  const P = PENTAGON; if (mod(cx, P.every) || mod(cy, P.every)) return false;
  if ((hashSeed(`${seed}:pentagon:v1:${cx}:${cy}`) % 1000) / 1000 >= P.chance) return false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const rx = cx + dx, ry = cy + dy; if (Math.abs(rx) + Math.abs(ry) < P.minRing || (cheap && cheap(rx, ry))) return false; }
  return true;
}
// The centre sections within `reach` of (rx, ry), nearest first (ties: north first, then west), as [cx, cy, d²].
function centresNear(rx, ry, reach) {
  const E = PENTAGON.every, r2 = reach * reach, out = [];
  for (let cy = Math.ceil((ry - reach) / E) * E; cy <= ry + reach; cy += E) for (let cx = Math.ceil((rx - reach) / E) * E; cx <= rx + reach; cx += E) { const d2 = (cx - rx) ** 2 + (cy - ry) ** 2; if (d2 <= r2) out.push([cx, cy, d2]); }
  return out.sort((a, b) => a[2] - b[2] || a[1] - b[1] || a[0] - b[0]);
}
// The Pentagon whose catchment holds section (rx, ry): the nearest real one (`real(cx, cy)`, the game's full test) that `skip`
// does not set aside (completed ones), within `reach`; or null (sigil-less ground). Returns { cx, cy, d } (d in sections) and
// `checked`, how many full tests it asked for.
export function pentagonCatchment(seed, rx, ry, { real, skip = null, cheap = null, reach = PENTAGON_FINDING.reach } = {}) {
  let checked = 0;
  for (const [cx, cy, d2] of centresNear(rx, ry, reach)) { if (!pentagonCandidate(seed, cx, cy, cheap) || (skip && skip(cx, cy))) continue; checked++; if (real(cx, cy)) return { cx, cy, d: Math.sqrt(d2), checked }; }
  return null;
}
// Is section (rx, ry) one a sigil may stand on? (Where a catchment holds it, outside a Pentagon's own nine sections: game.ts.)
export function pentagonSigilRoll(seed, rx, ry) { return (hashSeed(`${seed}:pentagon-sigil:v${PENTAGON_FINDING.version}:${rx}:${ry}`) % 10000) / 10000 < PENTAGON_FINDING.sigil.chance; }
// What a sigil read at section (rx, ry) says of the Pentagon centred at (cx, cy).
export function pentagonSigilText(rx, ry, cx, cy) {
  const d = Math.round(Math.hypot(cx - rx, cy - ry));
  return `${PENTAGON_FINDING.messages.read} ${pentagonHeading(cx - rx, cy - ry)}: a Pentagon stands that way, ${pentagonFarWords(d)} (about ${d} section${d === 1 ? "" : "s"}).`;
}
// The save's Pentagon finding (additive at schema 14): `follow`, the Pentagon the last sigil read points at ({ cx, cy } and the
// section it was read in, rx, ry), or null; `hunts`, the Pentagon hunts ({ id, n, cx, cy, status: open | found | done });
// `n`, hunts offered so far; `read`, sigils read. Unknown fields are kept.
export function ensurePentagonFinding(save) {
  if (!save) return save; const raw = save.pentagonFinding && typeof save.pentagonFinding === "object" ? save.pentagonFinding : {};
  const at = (q) => !!q && Number.isInteger(q.cx) && Number.isInteger(q.cy);
  const hunts = (Array.isArray(raw.hunts) ? raw.hunts : []).filter(at); for (const q of hunts) if (!["open", "found", "done"].includes(q.status)) q.status = "open"; // kept as they are (callers may hold them)
  const live = hunts.filter((q) => q.status !== "done"), done = hunts.filter((q) => q.status === "done").slice(-PENTAGON_FINDING.hunts.keep);
  save.pentagonFinding = { ...raw, version: PENTAGON_FINDING.version, follow: at(raw.follow) ? { ...raw.follow } : null, hunts: [...done, ...live], n: Math.max(0, Math.floor(Number(raw.n) || 0)), read: Math.max(0, Math.floor(Number(raw.read) || 0)) };
  return save;
}
// Tim, 2026-11-06: the Journal lines release 775 wrote gave a Pentagon's section ("…points north-east to a Pentagon at 120, 44",
// "A Pentagon hunt: a five-sided wall stands at cx, cy…"); release 777 writes words only. `retired` holds 775's two shapes, by
// record id prefix: the pattern its text was written in and which groups hold the reading (or offering) section and the
// Pentagon's centre. A hunt's completion line (`pentagon-hunt-done:`) keeps its section: the Wayfarer stood there by then.
export const PENTAGON_JOURNAL = {
  retired: {
    "pentagon-sigil:": { text: /^A Pentagon sigil, read at (-?\d+), (-?\d+), points [a-z-]+ to a Pentagon at (-?\d+), (-?\d+)\.$/, from: [1, 2], to: [3, 4], say: "sigilJournal" },
    "pentagon-hunt:": { text: /^A Pentagon hunt: a five-sided wall stands at (-?\d+), (-?\d+), [a-z-]+ of (-?\d+), (-?\d+)\.$/, from: [3, 4], to: [1, 2], say: "huntJournal" },
  },
};
// The 775 line of one Journal record in 777's words, or null (not one of 775's lines, already in words, or not parsed).
export function pentagonJournalWords(rec) {
  if (!rec || typeof rec !== "object" || typeof rec.recordId !== "string" || typeof rec.text !== "string") return null;
  for (const [prefix, R] of Object.entries(PENTAGON_JOURNAL.retired)) {
    if (!rec.recordId.startsWith(prefix)) continue;
    const m = R.text.exec(rec.text); if (!m) return null;
    const [rx, ry, cx, cy] = [...R.from, ...R.to].map((i) => Number(m[i]));
    if (![rx, ry, cx, cy].every(Number.isSafeInteger) || (rx === cx && ry === cy)) return null;
    return PENTAGON_FINDING.messages[R.say](pentagonHeading(cx - rx, cy - ry), pentagonFarWords(Math.round(Math.hypot(cx - rx, cy - ry))));
  }
  return null;
}
// Additive at schema 14 (migrateSave): rewrites those 775 lines in place, every other field of the record kept. Idempotent (777's
// words never match 775's pattern); a record it cannot read is left as it is. Never throws on odd data.
export function ensurePentagonJournal(save) {
  const list = save?.narrative?.journal; if (!Array.isArray(list)) return save;
  for (let i = 0; i < list.length; i++) { const text = pentagonJournalWords(list[i]); if (text != null) list[i] = { ...list[i], text }; }
  return save;
}
export const pentagonHuntsOpen = (save) => (save?.pentagonFinding?.hunts || []).filter((q) => q.status !== "done");
// Where to look for hunt number `n`, offered at section (rx, ry): points `near`..`far` sections out on bearings hashed from the
// seed and `n`, each at least `spread` radians from the bearing of every hunt still open (so two open hunts lie in different
// directions). One search round each, nearest Pentagon to it (game.ts offerPentagonHunt).
export function pentagonHuntProbes(seed, n, rx, ry, open = []) {
  const H = PENTAGON_FINDING.hunts, v = PENTAGON_FINDING.version, base = (hashSeed(`${seed}:pentagon-hunt:v${v}:${n}`) % 3600) / 3600 * Math.PI * 2, out = [];
  const bearings = open.map((q) => Math.atan2(q.cy - ry, q.cx - rx)), clear = (a) => bearings.every((b) => Math.abs(mod(a - b + Math.PI, Math.PI * 2) - Math.PI) >= H.spread);
  for (let k = 0; k < H.tries; k++) { const a = base + k * Math.PI * 2 / H.tries; if (!clear(a)) continue; const d = H.near + hashSeed(`${seed}:pentagon-hunt-far:v${v}:${n}:${k}`) % (H.far - H.near + 1);
    out.push({ rx: Math.round(rx + Math.cos(a) * d), ry: Math.round(ry + Math.sin(a) * d), a }); }
  return out;
}
