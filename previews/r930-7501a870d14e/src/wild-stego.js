// The Wild Stegosaurus in the big rooms (Tim, 2026-11-12: it "can also turn up in big rooms of adventure keeps, arcologies and
// adventure Pentagons, if they have large enough rooms", and never in ordinary dungeons). Pure and deterministic.
//
// A floor or chamber is eligible when it is a great building's floor (an Old Keep or a Ruined Arcology: great-buildings.ts styles
// `keep` and `apartment`) or an adventure Pentagon's chamber (pentagon.ts v11, its `building.adventure`), but never a trial chamber,
// the vault or the finale. Only floors and chambers first generated from this version (STEGO_ROOMS.version, pinned on the floor's own
// dungeon history as `stegoRooms` by game.ts generatePinnedDungeon) can hold one: a floor generated before keeps exactly what it had.
// An eligible floor holds one, at `chance`, when it has a room big enough: an open square at least `side` tiles across, its centre at
// least `fromEntry` from the way in. The beast is a spawn on the floor (`stegoRoom`), tuned to the Wayfarer like the roaming beast.
import { hashSeed } from "./random.js?v=r930-7501a870d14e";
import { LETHAL_KINDS } from "./landscape.js?v=r930-7501a870d14e";

export const STEGO_ROOMS = { version: 1, chance: .12, side: 9, fromEntry: 8, styles: ["keep", "apartment"] };
// Whether a floor's building can hold one (the id's own kind is checked by the caller: a great building or a Pentagon chamber).
export function stegoRoomGround(kind, map) {
  const B = map?.building; if (!B) return false;
  if (kind === "building") return STEGO_ROOMS.styles.includes(B.style);
  if (kind === "pentagon") return !!B.adventure && !B.trial && !B.vault && !B.finale;
  return false;
}
const roomOpen = (t) => !!t && !t.blocked && !t.pit && !t.slope && !t.stair && !LETHAL_KINDS.has(t.kind);
// The biggest open square on the map clear of the way in (a single pass over the tiles), as { x, y, side }, or null.
export function stegoRoomSquare(map, fromEntry = STEGO_ROOMS.fromEntry) {
  const tiles = map?.tiles || [], W = Number(map?.width) || Math.round(Math.sqrt(tiles.length)), H = Math.floor(tiles.length / (W || 1)); if (!W || !H) return null;
  const run = new Uint16Array(W * H), entry = map.entry || null; let best = null;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!roomOpen(tiles[i])) continue;
    const n = x && y ? 1 + Math.min(run[i - 1], run[i - W], run[i - W - 1]) : 1; run[i] = n;
    const c = { x: x - (n - 1) / 2, y: y - (n - 1) / 2 };
    if ((!best || n > best.side) && (!entry || Math.hypot(c.x - entry.x, c.y - entry.y) >= fromEntry)) best = { x: Math.round(c.x), y: Math.round(c.y), side: n };
  }
  return best;
}
// The spawn a floor holds, or null. `kind`: "building" or "pentagon" (anything else holds none: ordinary dungeons never do).
export function stegoRoomSpawn(seed, id, map, kind, V = STEGO_ROOMS.version) {
  if (!(V >= 1) || !stegoRoomGround(kind, map)) return null;
  if ((hashSeed(`${seed}:wild-stego-room:v${V}:${id}`) % 1000) / 1000 >= STEGO_ROOMS.chance) return null;
  const sq = stegoRoomSquare(map); if (!sq || sq.side < STEGO_ROOMS.side) return null;
  return { id: `${id}:wild-stego`, kind: "wildStego", x: sq.x, y: sq.y, boss: false, stegoRoom: true };
}
