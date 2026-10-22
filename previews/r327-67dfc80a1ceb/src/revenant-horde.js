// The Gate Revenant horde (release 269; Tim, 2026-10-21: "There's a 1/2 a percent chance that you spawn a dungeon
// that's all gate revenants, and those gate revenants can leave the dungeon... chase you until you die, and that
// dungeon will... keep its gate revenants... until they're all cleared out... If you kill 2... while they're chasing
// you, then... they'll be 18 in the dungeon next time"; "it's capped at for spawning... a different number per dungeon...
// randomly chosen... It should be a slog... they just keep coming... like 36... 3 gate revenants at a time is probably
// even a challenge"; "If you complete a... revenant swarm dungeon, then you get a piece of the gate").
//
// A horde dungeon holds only Gate Revenants. At most HORDE.active stand at once; when one falls, another comes after
// HORDE.respawn seconds, until the dungeon's count is spent. Aggroed ones follow the Wayfarer out and across sections
// (the Gate Revenant's own pursuit); a kill anywhere counts down the dungeon's number. Those still alive when the
// Wayfarer dies (or loses them) simply go back: the count only falls by kills. The last kill grants a Far Gate piece.
// State: save.consequences.dungeons[id].horde = { total, left } (additive; decided once, on the first visit).
import { hashSeed } from "./random.js?v=r327-67dfc80a1ceb";
import { isDeepDungeonId } from "./world.js?v=r327-67dfc80a1ceb";
import { ensureFarArray, piecesNeeded, gateOpen } from "./far-array.js?v=r327-67dfc80a1ceb";

// Release 273 (Tim: "in the swarm dungeon... maybe you'll get like four crossing sigils throughout... you can break it into
// waves"): the count is cut into `sigils` waves, and the kill that ends each wave leaves a Crossing Sigil.
export const HORDE = { perThousand: 5, total: [28, 44], tasteTotal: [12, 18], active: 3, respawn: 4, version: 1, sigils: 4 };
const wave = (q) => Math.floor((q.total - q.left) * HORDE.sigils / q.total);

const eligible = (id) => typeof id === "string" && id.startsWith("dungeon:") && !isDeepDungeonId(id);
// Decided on the first visit only (`history.visits` still 0), so dungeons already entered never become hordes.
// Release 319: `rung` is the dungeon ladder's word for crossings that have one ("full", "taste" or null; undefined keeps the
// old rule). A taste is a smaller horde (`tasteTotal`).
export function rollHorde(save, id, history, rung) {
  if (history.horde !== undefined || history.visits > 0 || !eligible(id) || history.mire) return history.horde || null; // release 303: a Poison Crypt is never also a horde
  const h = hashSeed(`${save.seed}:revenant-horde:v${HORDE.version}:${id}`);
  if (h % 1000 >= HORDE.perThousand || rung === null) return null;
  const [lo, hi] = rung === "taste" ? HORDE.tasteTotal : HORDE.total, total = lo + (h >>> 10) % (hi - lo + 1);
  history.horde = { total, left: total };
  return history.horde;
}
export function ensureHorde(history) {
  const q = history?.horde; if (!q || typeof q !== "object") return null;
  const total = Math.max(1, Math.floor(Number(q.total) || 0)), left = Math.max(0, Math.min(total, Math.floor(Number(q.left) || 0)));
  q.total = total; q.left = left; return q; // normalised in place
}
// A horde Revenant fell (anywhere). Returns a message, and the Gate piece's message on the last one.
export function hordeKill(save, history) {
  const q = ensureHorde(history); if (!q || q.left <= 0) return null;
  const before = wave(q); q.left -= 1; const sigils = wave(q) > before ? 1 : 0;
  if (q.left > 0) return { message: `${sigils ? "A wave breaks; a Crossing Sigil falls. " : ""}${q.left} Gate Revenant${q.left === 1 ? "" : "s"} remain in that crossing.`, sigils };
  history.resolved = true;
  const f = ensureFarArray(save); f.pieces = Math.min(piecesNeeded(f.gate), f.pieces + 1); f.history.push({ run: f.runs, gate: f.gate, won: "horde" });
  return { sigils, message: `The horde is broken${sigils ? ", and its last Crossing Sigil falls" : ""}. ${gateOpen(f) ? `The last piece locks into the Gate. It stands whole. Gate ${f.gate} is open.` : `A piece of the Gate locks into place (${f.pieces}/${piecesNeeded(f.gate)}).`}`, cleared: true };
}
// The spawn points for a horde dungeon: open tiles far from the entrance, spread out.
export function hordeSpawnPoints(map, entry, n = 6, reach = null) {
  const w = map.width || 32, open = map.tiles.filter((t) => !t.blocked && t.x > 1 && t.y > 1 && t.x < w - 2 && (!reach || reach.has(t.y * w + t.x))); // only floor the Wayfarer can reach
  const far = open.map((t) => ({ t, d: Math.hypot(t.x - entry.x, t.y - entry.y) })).sort((a, b) => b.d - a.d).slice(0, Math.max(n * 12, 40));
  const out = []; for (const { t } of far) { if (out.every((q) => Math.hypot(q.x - t.x, q.y - t.y) >= 4)) out.push({ x: t.x, y: t.y }); if (out.length >= n) break; }
  return out;
}
