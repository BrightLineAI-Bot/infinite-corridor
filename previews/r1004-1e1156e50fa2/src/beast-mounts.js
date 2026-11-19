// Beast mounts (release 748; Tim, 2026-11-04): a pen closed on a world beast (or the Stalker) that holds catches it, and the
// Wayfarer keeps it in a stable of three and rides it. Riding is faster, jumps go farther and carry over chasms while in the
// air, and the Wayfarer's own attacks, spells and tools work from its back; the mount itself never fights. Each mount gives
// `MOUNT_RIDE.seconds` of riding or `MOUNT_RIDE.sections` different sections ridden, whichever comes first, and is then gone.
// Tim's decisions (2026-11-04): a catch pays nothing (no marks, materials, spoils, XP or reward flags; its hunt still ends as a
// fall does); the Questing Beast, the Psychic Crystal, the Void Walker, the Lightning Giant and the Nanobot Knight can never be caught.
// Data and save rules only; game.ts calls in, renderer.ts draws.
import { hashSeed } from "./random.js?v=r1004-1e1156e50fa2";
import { trapChance } from "./building.js?v=r1004-1e1156e50fa2";

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
// Legacy hunt mounts retain their capacity and expiry contract.
export const MOUNT_IDS = Object.keys(MOUNT_BEASTS);
MOUNT_BEASTS.triceratops = { name: "The Triceratops", pen: 4, scale: 2.7, seat: 1.65, saddle: "strap", speed: 1.65, jump: 1.5 };
export const PERSISTENT_MOUNT_IDS = ["triceratops"];
// Dedicated attacks reuse accepted Dodge and Jump; the rider retains ordinary Attack and spells.
export const TRICERATOPS_ATTACKS = {
  dash: { range: 1.8, arc: 85, damage: 24, stun: .2 },
  landing: { range: 3, arc: 360, damage: 32, stun: .4 },
  drill: { acquire: 5, travel: 3, speed: 5, step: .2, maxSteps: 8, stop: 1.05, contact: 1.2, damage: 12, stun: .08, pulses: 3, pulseMs: 120, windupMs: 100, maxMs: 900 },
  charge: { shortMs: 450, longMs: 950, maxMs: 2500 },
  bash: { range: 2.4, arc: 75, damage: 40, stun: .3, stamina: 8, windupMs: 120 },
  horn: { range: 8, speed: 12, damage: 48, stamina: 14, windupMs: 180, maxProjectiles: 2 },
};
// Tim, 2026-11-18: while riding a Triceratops, slots B, C and D (actions spell, spell2, spell3) become its own attacks and Jump
// reads as its landing. A display and input override only: each press runs the accepted Dodge path (`charge` = the held-Dodge
// charge tier it releases at: 1 the short Bash, 2 the long Horn Shot), the loadout and presets are untouched and nothing is saved.
export const TRICERATOPS_CONTROLS = Object.freeze({
  spell: Object.freeze({ attack: "dash", name: "Horn Dash", charge: 0 }),
  spell2: Object.freeze({ attack: "bash", name: "Bash", charge: 1 }),
  spell3: Object.freeze({ attack: "horn", name: "Horn Shot", charge: 2 }),
  jump: Object.freeze({ normal: "Stomp", silly: "Drill" }),
});
// Presentation reads accepted gameplay phases; the short contact receipt uses the pause-adjusted clock.
export const TRICERATOPS_HORN_POSE = Object.freeze({ recoverMs: 240, halfWidth: 3.9, height: 3.6 });
export function triceratopsHornPose(g, mount, now, reduced = false) {
  if (mount?.beast !== "triceratops" || !(g.player?.hp > 0) || g.fallen || g.swimming || g.fall || g.glide || g.droneLift) return null;
  const clock = g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now, logical = clock - (g.presentationPausedMs || 0);
  if (clock < (g.player.stunnedUntil || 0) || clock < (g.player.heldUntil || 0) || g.mountLeap?.(clock)) return null;
  const q = g.triceratopsCharge, contact = g.triceratopsHornContact, dash = g.triceratopsDash;
  let phase, pitch = 0, reach = 0, lower = 0, aim;
  if (q?.mount === mount.id && q.phase === "hold" && clock >= q.start && clock - q.start <= TRICERATOPS_ATTACKS.charge.maxMs) {
    const t = Math.min(1, (clock - q.start) / TRICERATOPS_ATTACKS.charge.longMs);
    phase = "hold"; pitch = .16 * t; lower = .06 * t; reach = -.035 * t; aim = q;
  } else if (q?.mount === mount.id && q.phase === "windup" && TRICERATOPS_ATTACKS[q.kind]?.windupMs && clock <= q.contactAt) {
    const t = Math.max(0, Math.min(1, 1 - (q.contactAt - clock) / TRICERATOPS_ATTACKS[q.kind].windupMs));
    phase = "windup"; pitch = .16 + .09 * t; lower = .06; reach = -.035 - .045 * t; aim = q;
  } else if (contact?.mount === mount.id && logical >= contact.at && logical - contact.at < TRICERATOPS_HORN_POSE.recoverMs) {
    const t = 1 - (logical - contact.at) / TRICERATOPS_HORN_POSE.recoverMs;
    phase = contact.kind; pitch = (phase === "bash" ? .1 : -.12) * t; reach = (phase === "bash" ? .16 : -.1) * t; lower = .025 * t; aim = contact;
  } else if (dash?.mount === mount.id && clock < dash.until) {
    phase = "dash"; pitch = .12; reach = .08; lower = .035; aim = dash;
  } else return null;
  const amount = reduced ? .4 : 1;
  return { phase, pitch: pitch * amount, reach: reach * amount, lower: lower * amount, x: aim.x, y: aim.y };
}
// The leap receipt resumes its remaining travel and contacts; elapsed time also anchors the shared pose.
// Additive schema-14 action receipt. Unknown future versions stay opaque and never execute here.
export function normalizeTriceratopsDrill(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (Number.isInteger(raw.v) && raw.v > 1) return { ...raw };
  const C = TRICERATOPS_ATTACKS.drill, text = v => typeof v === "string" && v.length > 0 && v.length <= 512, number = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  if (raw.v !== 1 || !["overworld", "dungeon"].includes(raw.area) || !["areaId", "levelId", "mount"].every(k => text(raw[k])) || raw.variant !== "silly" || !(raw.target === null || text(raw.target))) return null;
  if (!number(raw.elapsed, 0, C.maxMs) || !number(raw.jumpLeft, 1e-6, 10000) || !number(raw.drillLeft, 1e-6, C.maxMs) || !number(raw.nextLeft, 0, Math.max(C.windupMs, C.pulseMs)) || !number(raw.travel, 0, C.travel) || !Number.isInteger(raw.pulses) || !number(raw.pulses, 0, C.pulses) || !number(raw.hp, 1e-6, 1e9) || !["atX", "atY"].every(k => number(raw[k], -1e4, 1e4)) || !["x", "y"].every(k => number(raw[k], -1, 1)) || Math.abs(Math.hypot(raw.x, raw.y) - 1) > 1e-6) return null;
  if (Math.abs(raw.elapsed + raw.drillLeft - Math.min(C.maxMs, raw.elapsed + raw.jumpLeft)) > 1e-5 || raw.pulses > 0 && (raw.elapsed < C.windupMs + (raw.pulses - 1) * C.pulseMs || raw.nextLeft > C.pulseMs) || raw.pulses === 0 && raw.elapsed + raw.nextLeft < C.windupMs - 1e-5) return null;
  return { ...raw };
}
export const TRICERATOPS_DRILL_POSE = Object.freeze({ halfWidth: 4.2, height: 5.2, below: 2.8, pivot: 1.25, turns: 2 });
export const TRICERATOPS_COMPOSITE = Object.freeze({ halfWidth: 4.6, drillHeight: 9.2, frameHeight: 9.7, normalHeight: 4.2, cameraPull: 3, margin: .1 });
// The rotating side portrait must stay above its support plane. Bounds include the
// saddle and rider; this lift is presentation only and never changes jump/contact state.
export function triceratopsDrillFrame(pose, aim = pose, jump = 0) {
  const angle = (Math.atan2(aim.y, aim.x) + pose.bank) * pose.turnIn;
  const c = Math.cos(angle), s = Math.sin(angle), B = TRICERATOPS_HORN_POSE;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  for (const x of [-B.halfWidth, B.halfWidth]) for (const y of [-B.height, 0]) {
    const dy = (y + pose.pivot) * pose.roll, xx = x * c - dy * s, yy = x * s + dy * c - pose.pivot;
    left = Math.min(left, xx); right = Math.max(right, xx); top = Math.min(top, yy); bottom = Math.max(bottom, yy);
  }
  const clearance = Math.max(0, bottom - jump + .02);
  return { angle, clearance, halfWidth: Math.max(Math.abs(left), Math.abs(right)), height: -top + clearance, bottom: bottom - clearance - jump };
}
export function triceratopsDrillPose(g, mount, now, reduced = false) {
  const q = g.triceratopsJump, clock = g.paused && Number.isFinite(g.pauseStarted) ? g.pauseStarted : now;
  if (mount?.beast !== "triceratops" || mount.variant !== "silly" || q?.kind !== "drill" || q.mount !== mount.id || q.start !== g.jumpStart || q.until !== g.jumpUntil || !(clock >= q.start && clock < q.drillUntil) || !(g.player?.hp > 0) || g.player.hp < q.hp || g.fallen || g.swimming || g.fall || g.glide || g.droneLift || g.plunge || g.cycloneHeel || g.shadowDash || g.artRush || g.wallCling || g.wallKick || clock < (g.player.stunnedUntil || 0) || clock < (g.player.heldUntil || 0) || clock < (g.player.dodgeUntil || 0)) return null;
  const t = Math.max(0, Math.min(1, (clock - q.start) / Math.max(1, q.drillUntil - q.start))), roll = Math.cos(t * Math.PI * 2 * TRICERATOPS_DRILL_POSE.turns);
  return { x: q.x, y: q.y, bank: reduced ? .08 : .12 * Math.sin(t * Math.PI * 2), roll: reduced ? 1 : Math.sign(roll || 1) * Math.max(.2, Math.abs(roll)), pivot: TRICERATOPS_DRILL_POSE.pivot, turnIn: Math.min(1, t / .15, (1 - t) / .15) };
}
export const TRICERATOPS_RIDE = { health: 180, defeats: 3, recoveryTransitions: 20, recentLocations: 6, hotelVersion: 1 };
export const persistentMount = (m) => PERSISTENT_MOUNT_IDS.includes(m?.beast);
export const triceratopsVariant = (actor) => actor?.triceratopsDisposition === "silly" || actor?.variant === "silly" ? "silly" : "normal";
export const SADDLE_NAMES = { strap: "Saddled", harness: "Harnessed", frame: "Riding frame", bowl: "Riding bowl", girth: "Girth-strapped" };
// Never penned or caught (Tim, 2026-11-04; the Nanobot Knight the same day: "not rideable").
export const MOUNT_NEVER = ["questingBeast", "psychicCrystal", "voidWalker", "lightningGiant", "nanobotKnight"];
// `cap` mounts in the stable; a catch beyond it lets the oldest go. `seconds` / `sections`: a mount's riding life (Tim: "10–15
// minutes... or 30–40 unique sections"). `knockoff`: one frame's loss of this share of maximum health throws the Wayfarer off.
// `sense`: a pen is sized for the biggest catchable beast within this many tiles (building.ts PEN_COST prices each size).
// Tim, 2026-11-04: "The mounts shouldn't give you any extra defense. You're just riding them. If you take them into fire or something,
// it should hurt the character. The only defense they give you: if you go into lava, it's not an instant kill, it's like a two-second
// kill." `lavaSeconds`: standing in lava on a mount takes this long to burn through full health (on foot lava kills at once).
// `callHold` (Tim, 2026-11-18: "About 0.6 s"): seconds holding Act, with nothing near, to call the mount or get down; a tap does neither.
export const MOUNT_RIDE = { cap: 3, seconds: 720, sections: 35, knockoff: .35, sense: 14, lavaSeconds: 2, callHold: .6,
  lavaWade: "Your mount wades into the lava and it burns you both: ride out of it, now!", lavaDeath: "The lava burns through the saddle, and takes the Wayfarer." };
// Release 748 (Tim, 2026-11-04: "hits should land on the rider where drawn"): how far above its feet the rider sits, in tiles. While
// mounted, the hostile phase of each frame sees the Wayfarer there (game.ts riderUp / riderDown); terrain stays at the feet.
export const riderLiftOf = (m) => Number(MOUNT_BEASTS[m?.beast]?.seat) || 0;

// Which mount a live actor would be, or null. `never` names an excluded beast.
export function mountIdFor(e) {
  if (!e) return null;
  if (e.kind === "triceratops") return "triceratops";
  if (e.stalker && !e.stalkerKin && !e.stalkerDecoy) return "stalker";
  if (e.worldBeast && MOUNT_BEASTS[e.worldBeast]) return e.worldBeast;
  return null;
}
export function neverCaught(e) { return !!e && (e.questingBeast || MOUNT_NEVER.includes(e.worldBeast)); }
// A real hunt actor (never a copy, decoy, mirage, summon, passing beast or one already leaving).
export const catchableActor = (e) => !!e && !e.dead && e.hp > 0 && !e.summonedBy && !e.illusion && !e.astralCompanionOf && !e.astralOwner && !e.passingBeast && !e.noRewards && !e.beastHotelOpponent && !!mountIdFor(e);
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
  if (persistentMount(m)) {
    m.variant = triceratopsVariant(m);
    m.hp = Math.max(0, Math.min(TRICERATOPS_RIDE.health, Number.isFinite(Number(m.hp)) ? Number(m.hp) : TRICERATOPS_RIDE.health));
    m.defeats = Math.max(0, Math.min(TRICERATOPS_RIDE.defeats, Math.floor(Number(m.defeats) || 0)));
    if (m.recovery && typeof m.recovery === "object" && !Array.isArray(m.recovery)) {
      const r = m.recovery;
      r.progress = Math.max(0, Math.min(TRICERATOPS_RIDE.recoveryTransitions, Math.floor(Number(r.progress) || 0)));
      r.recent = (Array.isArray(r.recent) ? r.recent : []).filter(k => typeof k === "string").slice(-TRICERATOPS_RIDE.recentLocations);
      r.opponentId = typeof r.opponentId === "string" ? r.opponentId : `hotel-opponent:${m.id}`;
      r.encounterStarted = r.encounterStarted === true; r.encounterComplete = r.encounterComplete === true;
    } else m.recovery = null;
  } else if (left <= 0 || seen.length >= MOUNT_RIDE.sections) return null;
  return Object.assign(m, { left, seen, caughtAt: Math.max(0, Number(m.caughtAt) || 0) }); // in place: callers keep their record
}
export function ensureMounts(save) {
  const q = save.mounts && typeof save.mounts === "object" && !Array.isArray(save.mounts) ? save.mounts : {};
  const all = (Array.isArray(q.stable) ? q.stable : []).map(cleanMount).filter(Boolean).filter((m, i, a) => a.findIndex((o) => o.id === m.id) === i);
  const temporary = all.filter(m => !persistentMount(m)).slice(-MOUNT_RIDE.cap);
  const permanent = all.filter(persistentMount).filter((m, i, a) => a.findIndex(o => o.beast === m.beast && o.variant === m.variant) === i);
  const stable = all.filter(m => temporary.includes(m) || permanent.includes(m));
  const caught = q.caught && typeof q.caught === "object" ? Object.fromEntries(Object.entries(q.caught).map(([k, v]) => [k, Math.max(0, Math.floor(Number(v) || 0))])) : {};
  save.mounts = Object.assign(q, { stable, riding: stable.some((m) => m.id === q.riding && !m.recovery && (!persistentMount(m) || m.hp > 0)) ? q.riding : null, seq: Math.max(0, Math.floor(Number(q.seq) || 0)), caught });
  return save.mounts;
}
// A production-journey gift, deliberately separate from generic save creation/migration and scratch fixtures.
// The permanent normal slot satisfies the grant even when injured or at the hotel; it is never replaced or healed.
export function ensureProductionTriceratops(save) {
  const q = ensureMounts(save);
  if (Number.isSafeInteger(q.standardTriceratopsGrant) && q.standardTriceratopsGrant >= 1) return save;
  if (!q.stable.some(m => m.beast === "triceratops" && m.variant === "normal")) {
    const base = "mount-free-triceratops-v1"; let id = base, suffix = 1;
    while (q.stable.some(m => m.id === id)) id = `${base}-${suffix++}`;
    const caughtAt = Number.isFinite(save.playSeconds) ? Math.max(0, save.playSeconds) : 0;
    // A distinct id namespace leaves the capture sequence alone. Older mounts retain their default-selection order.
    q.stable.unshift({ id, beast: "triceratops", variant: "normal", caughtAt, left: MOUNT_RIDE.seconds, seen: [], hp: TRICERATOPS_RIDE.health, defeats: 0, recovery: null });
  }
  q.standardTriceratopsGrant = 1;
  return save;
}
export const mountById = (save, id) => ensureMounts(save).stable.find((m) => m.id === id) || null;
export const ridingMount = (save) => { const q = save.mounts; return q?.riding ? q.stable?.find((m) => m.id === q.riding) || null : null; };
export const mountName = (m) => persistentMount(m) && m.variant === "silly" ? "The Silly Goose Triceratops" : MOUNT_BEASTS[m?.beast]?.name || "Your mount";
export const mountSectionsLeft = (m) => MOUNT_RIDE.sections - (m?.seen?.length || 0);
// "12:00 · 35 sections" style remaining-life text.
export function mountLifeText(m) { if (persistentMount(m)) return m.recovery ? `Beast Hotel · ${m.recovery.progress}/${TRICERATOPS_RIDE.recoveryTransitions} recovery` : `permanent companion · ${Math.ceil(m.hp)}/${TRICERATOPS_RIDE.health} health · ${m.defeats}/${TRICERATOPS_RIDE.defeats} defeats`; const s = Math.ceil(m.left), mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, "0"); const n = mountSectionsLeft(m); return `${mm}:${ss} of riding · ${n} section${n === 1 ? "" : "s"}`; }

// A catch goes into the stable. Full, the oldest is let go. Returns { mount, released }.
export function stableMount(save, beast, actor = null) {
  const q = ensureMounts(save); if (!MOUNT_BEASTS[beast]) return { mount: null, released: null };
  q.caught[beast] = (q.caught[beast] || 0) + 1;
  const permanent = PERSISTENT_MOUNT_IDS.includes(beast), variant = triceratopsVariant(actor);
  const owned = permanent && q.stable.find(m => m.beast === beast && m.variant === variant);
  if (owned) return { mount: owned, released: null };
  let released = null;
  while (!permanent && q.stable.filter(m => !persistentMount(m)).length >= MOUNT_RIDE.cap) { let i = q.stable.findIndex((m) => !persistentMount(m) && m.id !== q.riding); if (i < 0) i = q.stable.findIndex(m => !persistentMount(m)); released = q.stable.splice(i, 1)[0]; if (released.id === q.riding) q.riding = null; }
  const mount = { id: `mount-${(q.seq += 1)}`, beast, caughtAt: Number(save.playSeconds) || 0, left: MOUNT_RIDE.seconds, seen: [] };
  if (permanent) Object.assign(mount, { variant, hp: TRICERATOPS_RIDE.health, defeats: 0, recovery: null });
  q.stable.push(mount);
  return { mount, released };
}
export function releaseMount(save, id) {
  const q = ensureMounts(save), i = q.stable.findIndex((m) => m.id === id); if (i < 0) return null;
  if (persistentMount(q.stable[i])) return null; // an earned permanent unlock cannot be discarded
  const [m] = q.stable.splice(i, 1); if (q.riding === id) q.riding = null; return m;
}
// Mounting in section `key`: it counts as ridden. Returns the mount, or null.
export function startRide(save, id, key = null) {
  const q = ensureMounts(save), m = q.stable.find((o) => o.id === id); if (!m || m.recovery || persistentMount(m) && m.hp <= 0) return null;
  q.riding = m.id; q.last = m.id; if (key) noteRideSection(save, key); return ridingMount(save);
}
export function stopRide(save) { const q = ensureMounts(save), m = ridingMount(save); q.riding = null; return m; }
// Spent: gone from the stable. Returns the message.
function spend(save, m, why) { releaseMount(save, m.id); return `${mountName(m)} has carried you as far as it will ${why}: it leaves you, and is gone from your stable.`; }
// Riding time runs while mounted (never while paused). Returns a message when the mount is spent, else null.
export function tickRide(save, dt) {
  const m = ridingMount(save); if (!m || persistentMount(m) || !(dt > 0)) return null;
  m.left = Math.max(0, m.left - dt);
  return m.left <= 0 ? spend(save, m, "in time") : null;
}
// A section ridden into. Returns a message when that spends the mount, else null.
export function noteRideSection(save, key) {
  const m = ridingMount(save); if (!m || persistentMount(m) || typeof key !== "string") return null;
  if (!m.seen.includes(key)) m.seen.push(key);
  return m.seen.length >= MOUNT_RIDE.sections ? spend(save, m, "across the land") : null;
}
// The mount to call when none is named: the one ridden last, else the newest.
export function defaultMount(save) { const q = ensureMounts(save), ready = q.stable.filter(m => !m.recovery); return ready.find((m) => m.id === q.last) || ready[ready.length - 1] || null; }

export const beastHotelId = (home) => `beast-hotel:v1:${home}`;
export const isBeastHotelId = (id) => /^beast-hotel:v1:-?\d+,-?\d+$/.test(id || "");
// Depletions are counted at the health crossing, never again on reload or a later frame.
export function damagePersistentMount(save, amount, { puncture = false, home = "0,0", location = null } = {}) {
  const m = ridingMount(save); if (!persistentMount(m) || m.recovery || !(m.hp > 0) || !(amount > 0)) return null;
  m.hp = Math.max(0, m.hp - amount);
  if (!puncture && m.hp > 0) return { mount: m, defeated: false, admitted: false };
  if (m.hp <= 0) m.defeats = Math.min(TRICERATOPS_RIDE.defeats, m.defeats + 1);
  save.mounts.riding = null;
  const admitted = puncture || m.defeats >= TRICERATOPS_RIDE.defeats;
  if (admitted) m.recovery = { reason: puncture ? "puncture" : "defeats", admittedAt: Number(save.playSeconds) || 0, homeAtAdmission: home, progress: 0, recent: location ? [location] : [], lastLocation: location, opponentId: `hotel-opponent:${m.id}:${Number(save.playSeconds) || 0}`, encounterStarted: false, encounterComplete: false };
  else m.hp = TRICERATOPS_RIDE.health;
  return { mount: m, defeated: true, admitted };
}
export function noteBeastRecoveryTransition(save, location) {
  if (typeof location !== "string" || !location) return;
  for (const m of ensureMounts(save).stable) {
    const r = m.recovery; if (!r || r.lastLocation === location) continue;
    if (r.lastLocation && !r.recent.includes(location) && !isBeastHotelId(location)) r.progress = Math.min(TRICERATOPS_RIDE.recoveryTransitions, r.progress + 1);
    r.lastLocation = location; r.recent = [...r.recent, location].slice(-TRICERATOPS_RIDE.recentLocations);
  }
}
export function retrieveBeast(save, id) {
  const m = mountById(save, id), r = m?.recovery;
  if (!r || !r.encounterComplete) return null;
  m.hp = TRICERATOPS_RIDE.health; m.defeats = 0; m.recovery = null; return m;
}
