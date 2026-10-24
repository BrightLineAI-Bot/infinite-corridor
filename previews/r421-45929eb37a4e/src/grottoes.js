// Underwater grottoes (water world W6, docs/water-world-design.md; design-decisions "Traversal horizon — water",
// stage three). Dive generator 2: every new dive leads into one of four themed grottoes. The 107 Sunken Reach stays
// dive generator 1 for dive histories made before (pinned in `history.diveGenerator`). A grotto is a longer cave
// with currents that push back along the climb, air pockets within one breath, grotto beasts on the sea-creature
// runtime and an Elder Wyrm coiled in the final chamber, guarding the sunken cache. Data and pure generation.
import { hashSeed, rng } from "./random.js?v=r421-45929eb37a4e";
import { annotateDungeon } from "./dungeon-framework.js?v=r421-45929eb37a4e";
import { DIVE } from "./diving.js?v=r421-45929eb37a4e";

export const DIVE_GENERATOR = 2;
export const GROTTO_THEMES = {
  drownedChapel: { name: "Drowned Chapel", floor: "chapelFloor", wall: "chapelWall", beasts: ["grottoEel", "angler"], lore: "Pews and a cracked altar under fathoms of water. The bell still hangs, silent." },
  kelpCathedral: { name: "Kelp Cathedral", floor: "kelp", wall: "kelpWall", beasts: ["grottoEel", "abyssalBeast"], lore: "Kelp grown into vaults and aisles, swaying like a congregation." },
  pearlTrench: { name: "Pearl Trench", floor: "pearlSand", wall: "trenchWall", beasts: ["angler", "abyssalBeast"], lore: "A cleft in the seabed lined with pearl beds, glowing faintly in the dark." },
  sunkenSettlement: { name: "Sunken Settlement", floor: "ruinFloor", wall: "ruinWall", beasts: ["grottoEel", "angler", "abyssalBeast"], lore: "Streets and doorways of a town the sea took whole." },
};
export const GROTTO = {
  width: 34,
  height: 32,
  currentSpeed: 1.1,   // tiles per second; the diver swims 2.4 x DIVE.speed, so currents slow but never stop the climb
  currents: 2,         // stretches of current per grotto
  currentLength: 4,    // path tiles per stretch
  beasts: [3, 4],      // min, max grotto beasts
  chamberRadius: 4.4,
};
export const grottoTheme = (seed, id) => Object.keys(GROTTO_THEMES)[hashSeed(`${seed}:grotto:theme:${id}`) % 4];

export function generateGrotto(seed, id) {
  const theme = grottoTheme(seed, id), T = GROTTO_THEMES[theme], r = rng(`${seed}:grotto:v2:${id}`), { width, height } = GROTTO, tiles = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push({ x, y, kind: T.wall, blocked: true, elev: 0, landscape: "underwater", detail: hashSeed(`${id}:${x}:${y}`) % 997 });
  const at = (x, y) => tiles[y * width + x], open = (x, y, kind = T.floor) => { if (x > 0 && y > 0 && x < width - 1 && y < height - 1) Object.assign(at(x, y), { kind, blocked: false }); };
  const entry = { x: 17, y: height - 3 }, lair = { x: 17, y: 6 }, path = [];
  let x = entry.x, y = entry.y;
  path.push({ x, y });
  while (y > lair.y + GROTTO.chamberRadius + 1) { // meander upward toward the lair
    const step = r(), pull = Math.sign(lair.x - x) * (y < 14 ? .25 : 0);
    if (step < .52) y--; else if (step < .76 - pull * .5) x = Math.max(4, x - 1); else x = Math.min(width - 5, x + 1);
    path.push({ x, y });
  }
  while (x !== lair.x) { x += Math.sign(lair.x - x); path.push({ x, y }); }
  while (y > lair.y) { y--; path.push({ x, y }); }
  for (const p of path) for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) open(p.x + dx, p.y + dy);
  const chambers = [];
  for (let i = 0; i < 3; i++) {
    const p = path[Math.floor((i + 1) * path.length / 5)], cx = Math.max(5, Math.min(width - 6, p.x + (r() < .5 ? -5 : 5))), cy = p.y;
    for (let yy = cy - 2; yy <= cy + 2; yy++) for (let xx = cx - 3; xx <= cx + 3; xx++) if (Math.hypot((xx - cx) / 1.3, yy - cy) <= 2.4) open(xx, yy);
    for (let k = Math.min(p.x, cx); k <= Math.max(p.x, cx); k++) open(k, cy);
    chambers.push({ x: cx, y: cy });
  }
  for (let yy = lair.y - 5; yy <= lair.y + 5; yy++) for (let xx = lair.x - 6; xx <= lair.x + 6; xx++) if (Math.hypot(xx - lair.x, (yy - lair.y) * 1.15) <= GROTTO.chamberRadius) open(xx, yy);
  if (theme === "kelpCathedral") for (const t of tiles) if (!t.blocked && r() < .1) t.kind = "seabed"; // clearings in the kelp
  else for (const t of tiles) if (!t.blocked && r() < .06) t.kind = "kelp";
  // air pockets along the path, and one at the lair's mouth; currents keep clear of them
  const objects = [], pockets = [];
  let since = 0;
  for (let i = 1; i < path.length; i++) { since++; const p = path[i]; if (since >= DIVE.maxPocketGap - 1 && i < path.length - 3) { pockets.push(p); since = 0; } }
  pockets.push(path[path.length - Math.round(GROTTO.chamberRadius) - 2]);
  // currents: stretches of the climb that push back down toward the entry (never on or beside an air pocket)
  const currents = [];
  for (let c = 0; c < GROTTO.currents; c++) {
    const start = Math.floor(path.length * (.25 + c * .3));
    for (let k = start; k < Math.min(path.length - 8, start + GROTTO.currentLength); k++) {
      const a = path[k], b = path[k + 1], dx = a.x - b.x, dy = a.y - b.y; // against the direction of travel
      for (let ox = -1; ox <= 1; ox++) { const t = at(a.x + ox, a.y); if (!t.blocked && !pockets.some((q) => Math.abs(q.x - t.x) + Math.abs(q.y - t.y) <= 1)) { Object.assign(t, { kind: "seaCurrent", current: { dx, dy } }); currents.push({ x: t.x, y: t.y, dx, dy }); } }
    }
  }
  pockets.forEach((p, i) => { open(p.x, p.y, "airVent"); delete at(p.x, p.y).current; objects.push({ id: `${id}:air-${i}`, kind: "airPocket", name: "Air pocket", x: p.x, y: p.y, state: "idle", actions: [] }); });
  objects.push({ id: `${id}:surface`, kind: "diveExit", name: "Surface line", x: entry.x, y: entry.y, state: "open", actions: ["surface"] });
  objects.push({ id: `${id}:cache`, kind: "chest", name: "Sunken cache", x: lair.x, y: lair.y - 3, state: "closed", actions: ["open"], rewardSource: "grotto-cache" });
  objects.push({ id: `${id}:lore`, kind: "ruinMarker", name: T.name, lore: T.lore, x: chambers[0].x, y: chambers[0].y, state: "quiet", actions: ["inspect"] });
  open(entry.x, entry.y);
  // grotto beasts on the climb (away from the entry and pockets), and the Elder Wyrm in its lair
  const seaSpawns = [], n = GROTTO.beasts[0] + (hashSeed(`${seed}:grotto:count:${id}`) % (GROTTO.beasts[1] - GROTTO.beasts[0] + 1));
  for (let i = 0; i < n; i++) {
    const p = path[Math.floor(path.length * (.2 + .55 * (i + .5) / n))], kind = T.beasts[hashSeed(`${seed}:grotto:beast:${id}:${i}`) % T.beasts.length];
    seaSpawns.push({ id: `${id}:sea:${i}`, kind, x: p.x, y: p.y });
  }
  seaSpawns.push({ id: `${id}:wyrm`, kind: "elderWyrm", x: lair.x, y: lair.y });
  return annotateDungeon({ seed, id, recipe: "grotto", arena: true, arenaKind: "dive", underwater: true, grottoTheme: theme, name: T.name, identity: "underwater grotto", width, height, tiles, entry, exit: entry,
    objects, enemySpawns: [], seaSpawns, landscape: { version: 1, biome: `underwater:${theme}`, name: T.name }, weather: "drip", path, pockets, currents, lair },
  { classification: "bounded-arena", discoveryEnabled: false, generatorVersion: DIVE_GENERATOR, sizeProfile: "arena" });
}
