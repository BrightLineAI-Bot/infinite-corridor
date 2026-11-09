// Beast mounts (release 748; Tim, 2026-11-04): a pen closed on a world beast (or the Stalker) that holds catches it, and the
// Wayfarer keeps it in a stable of three and rides it. Riding is faster, jumps go farther and carry over chasms while in the
// air, and the Wayfarer's own attacks, spells and tools work from its back; the mount itself never fights. Each mount gives
// `MOUNT_RIDE.seconds` of riding or `MOUNT_RIDE.sections` different sections ridden, whichever comes first, and is then gone.
// Tim's decisions (2026-11-04): a catch pays nothing (no marks, materials, spoils, XP or reward flags; its hunt still ends as a
// fall does); the Questing Beast, the Psychic Crystal, the Void Walker, the Lightning Giant and the Nanobot Knight can never be caught.
// Data and save rules only; game.ts calls in, renderer.ts draws.
import { hashSeed } from "./random.js?v=r851-1a2c35ae7ab9";
import { trapChance } from "./building.js?v=r851-1a2c35ae7ab9";

// One row per catchable beast. `pen`: the pen's side in tiles it takes (scaled to its footprint); `scale`: its renderer's scale as a
// mount, its real size as met in the world (Tim, 2026-11-04: "so you can be riding a pretty huge beast"; the pack form's scale x the
// world-beast boss scale, the Stalker's STALKER.size); `seat`: how high on its back the Wayfarer sits, in tiles; `saddle`: what is
// strapped on under the rider ("strap", a saddle with girth and stirrups; "harness", a seat frame lashed round a body; "frame", a
// riding frame braced between the wings and the neck; "bowl", a shallow cup the rider sits in, bobbing on the Blob; "girth", a band
// right round the worm's body, the seat on its back behind the head); `seatX`: tiles along its facing from the middle of its feet
// (+ toward the head); `band` / `bandX`: the body's width where a girth goes round it, and its axis from the seat (tiles along facing); `bob`: how far a seat bobs with the body, in tiles; `speed`: walking speed multiplier while riding; `jump`: jump time multiplier (dodges unchanged).
export const MOUNT_BEASTS = {
  stalker: { name: "The Stalker", pen: 2, scale: 1.4, seat: .62, saddle: "strap", speed: 1.75, jump: 1.6 },
  morphingBlob: { name: "The Morphing Blob", pen: 2, scale: 1.96, seat: 1.05, saddle: "bowl", bob: .08, speed: 1.45, jump: 1.5 },
  tremorWorm: { name: "The Tremor Worm", pen: 3, scale: 2.3, seat: 3, seatX: -.45, band: 2.1, bandX: .85, saddle: "girth", speed: 1.6, jump: 1.5 },
  mountainTurtle: { name: "The Mountain Turtle", pen: 4, scale: 3.92, seat: 2.3, saddle: "harness", speed: 1.4, jump: 1.45 },
  astralWorm: { name: "The Astral Worm", pen: 3, scale: 1.35, seat: .2, saddle: "harness", speed: 1.7, jump: 1.6 },
  briarStag: { name: "The Briar Stag", pen: 3, scale: 2.36, seat: 1.75, saddle: "strap", speed: 1.85, jump: 1.7 },
  ashenMoth: { name: "The Ashen Moth", pen: 3, scale: 2.16, seat: 1.2, saddle: "frame", speed: 1.7, jump: 1.75 },
  crimsonTyrant: { name: "The Crimson Tyrant", pen: 4, scale: 3.51, seat: 2.75, seatX: .8, saddle: "frame", speed: 1.7, jump: 1.75 },
  doomChaser: { name: "The Doom Chaser", pen: 4, scale: 3.38, seat: 2.65, seatX: .78, saddle: "frame", speed: 1.75, jump: 1.75 },
};
export const MOUNT_IDS = Object.keys(MOUNT_BEASTS);
export const SADDLE_NAMES = { strap: "Saddled", harness: "Harnessed", frame: "Riding frame", bowl: "Riding bowl", girth: "Girth-strapped" };
// Never penned or caught (Tim, 2026-11-04; the Nanobot Knight the same day: "not rideable").
export const MOUNT_NEVER = ["questingBeast", "psychicCrystal", "voidWalker", "lightningGiant", "nanobotKnight"];
// `cap` mounts in the stable; a catch beyond it lets the oldest go. `seconds` / `sections`: a mount's riding life (Tim: "10–15
// minutes... or 30–40 unique sections"). `knockoff`: one frame's loss of this share of maximum health throws the Wayfarer off.
// `sense`: a pen is sized for the biggest catchable beast within this many tiles (building.ts PEN_COST prices each size).
// Tim, 2026-11-04: "The mounts shouldn't give you any extra defense. You're just riding them. If you take them into fire or something,
// it should hurt the character. The only defense they give you: if you go into lava, it's not an instant kill, it's like a two-second
// kill." `lavaSeconds`: standing in lava on a mount takes this long to burn through full health (on foot lava kills at once).
export const MOUNT_RIDE = { cap: 3, seconds: 720, sections: 35, knockoff: .35, sense: 14, lavaSeconds: 2,
  lavaWade: "Your mount wades into the lava and it burns you both: ride out of it, now!", lavaDeath: "The lava burns through the saddle, and takes the Wayfarer." };
// Release 748 (Tim, 2026-11-04: "hits should land on the rider where drawn"): how far above its feet the rider sits, in tiles. While
// mounted, the hostile phase of each frame sees the Wayfarer there (game.ts riderUp / riderDown); terrain stays at the feet.
export const riderLiftOf = (m) => Number(MOUNT_BEASTS[m?.beast]?.seat) || 0;

// Which mount a live actor would be, or null. `never` names an excluded beast.
export function mountIdFor(e) {
  if (!e) return null;
  if (e.stalker && !e.stalkerKin && !e.stalkerDecoy) return "stalker";
  if (e.worldBeast && MOUNT_BEASTS[e.worldBeast]) return e.worldBeast;
  return null;
}
export function neverCaught(e) { return !!e && (e.questingBeast || MOUNT_NEVER.includes(e.worldBeast)); }
// A real hunt actor (never a copy, decoy, mirage, summon, passing beast or one already leaving).
export const catchableActor = (e) => !!e && !e.dead && !e.summonedBy && !e.illusion && !e.astralCompanionOf && !e.astralOwner && !e.passingBeast && !e.noRewards && !!mountIdFor(e);
// Why a beast in a closed pen gets away, or null when the roll may be tried.
export function catchRefusal(e, pen) {
  if (neverCaught(e)) return `${e.questingBeast ? "The Questing Beast" : nameOf(e.worldBeast)} cannot be penned: it is through the walls before they close.`;
  const id = mountIdFor(e); if (!id || !catchableActor(e)) return "Nothing that can be caught is inside it.";
  const need = MOUNT_BEASTS[id].pen;
  if ((Number(pen?.size) || 2) < need) return `${MOUNT_BEASTS[id].name} is too big for this pen: it takes one ${need}×${need}.`;
  if (e.retreating || e.fleeTo || e.untargetable || e.aloft || e.hidden) return `${MOUNT_BEASTS[id].name} slips out before the pen can close on it.`;
  return null;
}
const nameOf = (id) => ({ psychicCrystal: "The Psychic Crystal", voidWalker: "The Void Walker", lightningGiant: "The Lightning Giant", nanobotKnight: "The Nanobot Knight" })[id] || "It";
// One roll per closing (hashed by beast, pen and closer), at the Stalker's trap odds of its health.
export function catchRoll(e, pen, salt = "") {
  return (hashSeed(`${e.id}:catch:${pen?.id}:${salt}`) % 1000) / 1000 < trapChance(e.hp / Math.max(1, e.maxHp));
}

// save.mounts = { stable: [{ id, beast, caughtAt, left, seen: ["rx,ry"] }], riding: id | null, seq, caught: { beast: n } }
// (additive at schema 14). `left` riding seconds; `seen` the different sections ridden (at most MOUNT_RIDE.sections).
function cleanMount(m) {
  if (!m || typeof m !== "object" || typeof m.id !== "string" || !MOUNT_BEASTS[m.beast]) return null;
  const left = Math.max(0, Math.min(MOUNT_RIDE.seconds, Number.isFinite(Number(m.left)) ? Number(m.left) : MOUNT_RIDE.seconds));
  const seen = (Array.isArray(m.seen) ? m.seen : []).filter((k, i, a) => typeof k === "string" && /^-?\d+,-?\d+$/.test(k) && a.indexOf(k) === i).slice(0, MOUNT_RIDE.sections);
  if (left <= 0 || seen.length >= MOUNT_RIDE.sections) return null;
  return Object.assign(m, { left, seen, caughtAt: Math.max(0, Number(m.caughtAt) || 0) }); // in place: callers keep their record
}
export function ensureMounts(save) {
  const q = save.mounts && typeof save.mounts === "object" && !Array.isArray(save.mounts) ? save.mounts : {};
  const stable = (Array.isArray(q.stable) ? q.stable : []).map(cleanMount).filter(Boolean).filter((m, i, a) => a.findIndex((o) => o.id === m.id) === i).slice(-MOUNT_RIDE.cap);
  const caught = q.caught && typeof q.caught === "object" ? Object.fromEntries(Object.entries(q.caught).map(([k, v]) => [k, Math.max(0, Math.floor(Number(v) || 0))])) : {};
  save.mounts = Object.assign(q, { stable, riding: stable.some((m) => m.id === q.riding) ? q.riding : null, seq: Math.max(0, Math.floor(Number(q.seq) || 0)), caught });
  return save.mounts;
}
export const mountById = (save, id) => ensureMounts(save).stable.find((m) => m.id === id) || null;
export const ridingMount = (save) => { const q = save.mounts; return q?.riding ? q.stable?.find((m) => m.id === q.riding) || null : null; };
export const mountName = (m) => MOUNT_BEASTS[m?.beast]?.name || "Your mount";
export const mountSectionsLeft = (m) => MOUNT_RIDE.sections - (m?.seen?.length || 0);
// "12:00 · 35 sections" style remaining-life text.
export function mountLifeText(m) { const s = Math.ceil(m.left), mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, "0"); const n = mountSectionsLeft(m); return `${mm}:${ss} of riding · ${n} section${n === 1 ? "" : "s"}`; }

// A catch goes into the stable. Full, the oldest is let go. Returns { mount, released }.
export function stableMount(save, beast) {
  const q = ensureMounts(save); if (!MOUNT_BEASTS[beast]) return { mount: null, released: null };
  q.caught[beast] = (q.caught[beast] || 0) + 1;
  let released = null;
  while (q.stable.length >= MOUNT_RIDE.cap) { const i = q.stable.findIndex((m) => m.id !== q.riding); released = q.stable.splice(i < 0 ? 0 : i, 1)[0]; if (released.id === q.riding) q.riding = null; }
  const mount = { id: `mount-${(q.seq += 1)}`, beast, caughtAt: Number(save.playSeconds) || 0, left: MOUNT_RIDE.seconds, seen: [] };
  q.stable.push(mount);
  return { mount, released };
}
export function releaseMount(save, id) {
  const q = ensureMounts(save), i = q.stable.findIndex((m) => m.id === id); if (i < 0) return null;
  const [m] = q.stable.splice(i, 1); if (q.riding === id) q.riding = null; return m;
}
// Mounting in section `key`: it counts as ridden. Returns the mount, or null.
export function startRide(save, id, key = null) {
  const q = ensureMounts(save), m = q.stable.find((o) => o.id === id); if (!m) return null;
  q.riding = m.id; q.last = m.id; if (key) noteRideSection(save, key); return ridingMount(save);
}
export function stopRide(save) { const q = ensureMounts(save), m = ridingMount(save); q.riding = null; return m; }
// Spent: gone from the stable. Returns the message.
function spend(save, m, why) { releaseMount(save, m.id); return `${mountName(m)} has carried you as far as it will ${why}: it leaves you, and is gone from your stable.`; }
// Riding time runs while mounted (never while paused). Returns a message when the mount is spent, else null.
export function tickRide(save, dt) {
  const m = ridingMount(save); if (!m || !(dt > 0)) return null;
  m.left = Math.max(0, m.left - dt);
  return m.left <= 0 ? spend(save, m, "in time") : null;
}
// A section ridden into. Returns a message when that spends the mount, else null.
export function noteRideSection(save, key) {
  const m = ridingMount(save); if (!m || typeof key !== "string") return null;
  if (!m.seen.includes(key)) m.seen.push(key);
  return m.seen.length >= MOUNT_RIDE.sections ? spend(save, m, "across the land") : null;
}
// The mount to call when none is named: the one ridden last, else the newest.
export function defaultMount(save) { const q = ensureMounts(save); return q.stable.find((m) => m.id === q.last) || q.stable[q.stable.length - 1] || null; }
