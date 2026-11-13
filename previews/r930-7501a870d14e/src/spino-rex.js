// The Spinosaurus (Tim, 2026-11-12): where it is met besides the open world (world-beasts.ts WORLD_BEASTS.spinoRex), and the two screen
// moments its moves ask for. Pure and deterministic; the drawing helpers take a canvas context and nothing else.
//
// Big rooms (SPINO_ROOMS): as the Wild Stegosaurus's (wild-stego.ts), a great building's floor (an Old Keep, a Ruined Arcology) or an
// adventure Pentagon's chamber first generated from this version on (pinned on the floor's own dungeon history as `spinoRooms` by
// game.ts generatePinnedDungeon) may hold one in its biggest open square. A floor generated before holds none and never gains one; a
// floor whose big room already holds the Wild Stegosaurus holds no Spinosaurus too (it would come hunting it as an interloper). Ordinary
// dungeons never do.
//
// The interloper (SPINO_INTERLOPER): while the Wayfarer fights a Wild Stegosaurus or the Briar Stag, the Spinosaurus may come in from off
// screen with a roar to hunt the prey (and the Wayfarer). Whether it comes is rolled once per fight on a hashed seed (the prey's id names
// the fight: a world beast's id carries its hunt's cycle), so it is the same on every reload. It comes at most once per fight: the
// fights it came to are kept in save.spinoInterlopers (additive at schema 14, the newest `keep`), and while it lives the area's snapshot
// keeps it. It is tuned to the Wayfarer like the roaming beast, with no hunt (no tries, retreat or bounty): game.ts tuneSpinoBeast.
import { hashSeed } from "./random.js?v=r930-7501a870d14e";
import { stegoRoomGround, stegoRoomSquare } from "./wild-stego.js?v=r930-7501a870d14e";

export const SPINO_ROOMS = { version: 1, chance: .1, side: 10 };
export const SPINO_INTERLOPER = {
  version: 1,
  chance: .35, /* of fights with a prey below that bring the Spinosaurus */
  prey: ["wildStego", "briarStag"],
  after: 6, /* seconds of fighting the prey before it can arrive */
  range: 12, /* the Wayfarer within this of the prey, and the prey roused: a fight */
  arrive: 11, /* how far from the Wayfarer it comes in (off screen) */
  keep: 24, /* fights remembered */
  text: { arrive: "A roar shakes the ground. Something has smelled the blood: the Spinosaurus is coming for the kill!" },
};
// The spawn a floor holds, or null. `kind`: "building" or "pentagon" (anything else holds none). `taken`: a stego already there.
export function spinoRoomSpawn(seed, id, map, kind, V = SPINO_ROOMS.version, taken = false) {
  if (!(V >= 1) || taken || !stegoRoomGround(kind, map)) return null;
  if ((hashSeed(`${seed}:spino-room:v${V}:${id}`) % 1000) / 1000 >= SPINO_ROOMS.chance) return null;
  const sq = stegoRoomSquare(map); if (!sq || sq.side < SPINO_ROOMS.side) return null;
  return { id: `${id}:spino-rex`, kind: "spinoRex", x: sq.x, y: sq.y, boss: false, spinoRoom: true };
}
// save.spinoInterlopers: the prey ids of the fights it came to (strings, the newest last, at most `keep`).
export function ensureSpinoState(save) {
  if (!save || typeof save !== "object") return [];
  const list = Array.isArray(save.spinoInterlopers) ? save.spinoInterlopers.filter((q) => typeof q === "string" && q) : [];
  save.spinoInterlopers = [...new Set(list)].slice(-SPINO_INTERLOPER.keep);
  return save.spinoInterlopers;
}
export const interloperRoll = (seed, preyId) => (hashSeed(`${seed}:spino-interloper:v${SPINO_INTERLOPER.version}:${preyId}`) % 1000) / 1000 < SPINO_INTERLOPER.chance;
export const interloperCame = (save, preyId) => Array.isArray(save?.spinoInterlopers) && save.spinoInterlopers.includes(preyId);
export function noteInterloper(save, preyId) { const list = ensureSpinoState(save); if (!list.includes(preyId)) list.push(preyId); save.spinoInterlopers = list.slice(-SPINO_INTERLOPER.keep); }
// The prey the Wayfarer is fighting, or null: a roused Wild Stegosaurus or Briar Stag of a real hunt (the roaming world beast, or the
// stego of a big room), alive, standing its ground, near the Wayfarer.
export function interloperPrey(enemies, player) {
  let best = null, bd = SPINO_INTERLOPER.range;
  for (const q of enemies || []) {
    if (!q || q.dead || !SPINO_INTERLOPER.prey.includes(q.kind) || !(q.worldBeast || q.stegoRoom) || !q.aggro || q.retreating || q.passingBeast || q.fleeTo || q.illusion || !q.id) continue;
    const d = Math.hypot((Number(q.x) || 0) - player.x, (Number(q.y) || 0) - player.y); if (d <= bd) { bd = d; best = q; }
  }
  return best;
}
// Where it comes in: open ground `arrive` from the Wayfarer, away from the prey if it can (16 tries at most, in a hashed order).
export function interloperSpot(seed, preyId, player, prey, open) {
  const turn = (hashSeed(`${seed}:spino-arrive:${preyId}`) % 628) / 100, away = Math.atan2(player.y - prey.y, player.x - prey.x);
  for (const r of [SPINO_INTERLOPER.arrive, SPINO_INTERLOPER.arrive * .7, SPINO_INTERLOPER.arrive * .45]) for (let i = 0; i < 16; i++) {
    const a = (i % 2 ? turn : away) + Math.floor((i + 1) / 2) * Math.PI / 8 * (i % 4 < 2 ? 1 : -1), x = player.x + Math.cos(a) * r, y = player.y + Math.sin(a) * r;
    if (open(x, y)) return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }
  return null;
}
// ---------------------------------------------------------------- screen moments
// The roar's shake: an offset in pixels for this moment, from a fixed wave (never random), none under reduced motion.
export const SPINO_SCREEN = { shake: { amplitude: 9, reduced: 0, speed: .045 }, bite: { ms: 650 } };
export function shakeOffset(shake, now, quiet = false) {
  if (!shake || !(now < shake.until) || quiet && !SPINO_SCREEN.shake.reduced) return { x: 0, y: 0 };
  const k = Math.max(0, Math.min(1, (shake.until - now) / Math.max(1, shake.until - shake.at))) * (Number(shake.power) || 0) * SPINO_SCREEN.shake.amplitude * (quiet ? SPINO_SCREEN.shake.reduced : 1), t = now * SPINO_SCREEN.shake.speed;
  return { x: Math.sin(t * 1.7) * k, y: Math.cos(t * 2.3) * k * .7 };
}
// A landed bite: a big bite mark over the screen (`k`: the game's spinoBiteMark, 1 when it lands, fading to 0), two arcs of tooth marks
// that close a little as it fades (they hold still under reduced motion).
export function drawBiteMark(ctx, w, h, mark, quiet = false) {
  const k = Math.max(0, Math.min(1, Number(mark) || 0)); if (!(k > 0)) return false;
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * .42, close = quiet ? 0 : (1 - k) * .08;
  ctx.save();
  ctx.fillStyle = `rgba(90,0,6,${(.22 * k).toFixed(3)})`; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `rgba(150,8,16,${(.85 * k).toFixed(3)})`; ctx.strokeStyle = `rgba(30,0,0,${(.8 * k).toFixed(3)})`; ctx.lineWidth = 2;
  for (const jaw of [-1, 1]) for (let i = 0; i < 9; i++) {
    const t = i / 4 - 1, x = cx + t * R, y = cy + jaw * (R * (.42 - close) - (1 - t * t) * R * .16), len = R * (i % 2 ? .16 : .24);
    ctx.beginPath(); ctx.moveTo(x - R * .045, y); ctx.lineTo(x, y - jaw * len); ctx.lineTo(x + R * .045, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  return true;
}
