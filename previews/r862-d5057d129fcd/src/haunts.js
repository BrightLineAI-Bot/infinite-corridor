// The haunts (release 731). Tim, 2026-11-04: "cool creatures that... floated around... put them in the keeps... in various
// places... they can confuse you. So that instead of moving forward, you move backwards for a time. And... they can multiply if
// enough... get together, then they form one big... ghost creature... a fatter body. The big, scary mouth and face and arms and
// legs... sharp pointy... points at the ends of its arms and legs." Original creatures in that spirit:
// - Gloomwisps (monster-pack.ts `gloomwisp`): small floating orbs of dark gas with a grin and two eyes. Their puff (`wispBewilder`)
//   confuses: for `confuse.wisp` seconds the Wayfarer's movement is reversed (Game: player.confusedUntil). Now and then a wisp that
//   is hunting splits in two (`split`), `max` times, up to `cap` in the area; the children neither split nor give a reward.
// - The Gloomgorge (`gloomgorge`): when `merge.count` wisps drift within `merge.radius` of one another they pour together into one
//   squat, fat ghost with a huge grinning mouth and stubby clawed arms and legs: claws, a gaping inhale, a pouncing rake and a howl
//   that confuses for longer (`confuse.gorge`). One forms in an area each visit.
// Where (`places`): keeps, arcologies and the courts of the Great Castles on the overworld (`keep`), the floors inside the great buildings, castles and the Pentagon
// (`interior`), and now and then the fog moors and the Far Sleep (`wild`). Spawns are hashed from the seed and the area, so a
// haunted place is haunted every visit.
import { hashSeed } from "./random.js?v=r862-d5057d129fcd";
import { LETHAL_KINDS } from "./landscape.js?v=r862-d5057d129fcd";

export const HAUNT = {
  confuse: { wisp: 3.2, gorge: 5 }, // seconds the Wayfarer's movement is reversed
  split: { every: [11, 18], cap: 10, range: 1.2, max: 2 }, // seconds between a hunting wisp's splits (hashed), area cap, spawn offset; only a wisp that was placed splits, `max` times (so a haunt is bounded)
  merge: { count: 5, radius: 4.2, check: .5 }, // wisps this close together pour into a Gloomgorge
  clear: { entry: 5 }, // release 735: inside, wisps keep this far from where you come in (and off holes, doorways and objects)
  places: { keep: { chance: .7, count: [3, 5] }, interior: { chance: .3, count: [2, 4] }, wild: { chance: .035, count: [2, 3], minDepth: 8 } },
  // Release 737 (Tim, 2026-11-04: "ability debilitations... one that you can't shoot, one that you can't attack, one that you
  // can't jump, another one you can't dodge... can't use tools... can't use spells... can't use items/potions", and one that
  // chunks maximum health for a while, like the Stalker's mist). Besides turning you about, every landed puff lays `lay.wisp`
  // curse and the howl `lay.gorge`, picked by `weight` (hashed per wisp and per hit). Each wears off after `duration` seconds;
  // `cap` at once (a new one past the cap replaces the oldest); laying one already on you adds its duration again, up to
  // `extendCap` durations left. `blocks` is the action it forbids (Game.cursed); `maxHp` the share of maximum health held back
  // (save.rot, the Stalker's mechanism) until it wears off. Walking always works.
  curse: { cap: 4, lay: { wisp: 1, gorge: 2 }, extendCap: 2, nag: .7 /* seconds between repeated "you can't" messages */ },
  curses: [
    { id: "noShoot", label: "NO SHOOT", duration: 7, weight: 3, blocks: "shoot", text: "The gloom is in your aim: you cannot shoot." },
    { id: "noAttack", label: "NO ATTACK", duration: 5, weight: 2, blocks: "attack", text: "Your arms will not strike: you cannot attack." },
    { id: "noJump", label: "NO JUMP", duration: 7, weight: 3, blocks: "jump", text: "Your legs are lead: you cannot jump." },
    { id: "noDodge", label: "NO DODGE", duration: 5, weight: 2, blocks: "dodge", text: "The gloom holds you fast: you cannot dodge." },
    { id: "noTools", label: "NO TOOLS", duration: 7, weight: 3, blocks: "tools", text: "Your hands forget their tools." },
    { id: "noSpells", label: "NO SPELLS", duration: 6, weight: 3, blocks: "spells", text: "The words slip away: you cannot cast." },
    { id: "noItems", label: "NO ITEMS", duration: 6, weight: 3, blocks: "items", text: "Your fingers fumble: you cannot use items." },
    { id: "frail", label: "FRAIL", duration: 9, weight: 2, maxHp: .2, text: "The gloom hollows you: maximum health falls for a while." },
  ],
  text: { confused: "Your head swims: left is right, forward is back.", merge: "The wisps pour into one another and something huge grins out of the dark: a Gloomgorge.", split: "A wisp tears in two." },
};
export const isHaunt = (e) => e?.kind === "gloomwisp" || e?.kind === "gloomgorge";

// Where an area is haunted, and by how many: null or { place, count }.
export function hauntPlan(seed, areaKey, { keep = false, interior = false, wild = false, depth = 0 } = {}) {
  const place = keep ? "keep" : interior ? "interior" : wild && depth >= HAUNT.places.wild.minDepth ? "wild" : null; if (!place) return null;
  const P = HAUNT.places[place], h = (k) => hashSeed(`${seed}:haunt:v1:${areaKey}:${k}`);
  if ((h("roll") % 1000) / 1000 >= P.chance) return null;
  return { place, count: P.count[0] + h("n") % (P.count[1] - P.count[0] + 1) };
}
// The wisps' spawns: open, safe floor, inside `box` when given (a keep's court), in a loose knot, hashed from the area.
export function hauntSpawns(map, width, seed, areaKey, plan, box = null, where = null) {
  if (!plan || !map?.tiles?.length) return [];
  const h = (k) => hashSeed(`${seed}:haunt-at:v1:${areaKey}:${k}`), height = Math.floor(map.tiles.length / width);
  const ok = (t, x, y) => t && !t.blocked && !LETHAL_KINDS.has(t.kind) && !t.pit && x > 1 && y > 1 && x < width - 2 && y < height - 2 && (!box || (x >= box.x && y >= box.y && x < box.x + box.w && y < box.y + box.h)) && (!where || where(t));
  // release 735: never on a hole, a doorway or an object's tile (a stair, a chest, a door); inside, clear of the way in
  const objAt = new Set((map.objects || []).filter((o) => o.dir !== "roofExit").map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)), ins = plan.place === "interior"; // release 746: the vault's roof exit is laid over the floor later; the haunts stand where they always did
  const arrivals = ins ? [map.entry, ...Object.values(map.building?.entries || {})].filter((p) => Number.isFinite(p?.x) && Number.isFinite(p?.y)) : [];
  const clear = (t, x, y) => !t.hole && !t.doorway && !objAt.has(`${x},${y}`), far = (x, y) => arrivals.every((p) => Math.hypot(x - p.x, y - p.y) >= HAUNT.clear.entry);
  const cand = []; for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const t = map.tiles[y * width + x]; if (ok(t, x, y) && clear(t, x, y)) cand.push([x, y]); }
  const strict = cand.filter(([x, y]) => far(x, y)), open = strict.length >= plan.count ? strict : cand;
  if (!open.length) return [];
  const [ax, ay] = open[h("anchor") % open.length], near = open.filter(([x, y]) => Math.hypot(x - ax, y - ay) <= 5);
  const pool = near.length >= plan.count ? near : open, out = [], used = new Set();
  for (let i = 0; out.length < plan.count && i < plan.count * 8; i++) { const [x, y] = pool[h(`p${i}`) % pool.length]; if (used.has(`${x},${y}`)) continue; used.add(`${x},${y}`); out.push({ id: `haunt:${areaKey}:${out.length}`, kind: "gloomwisp", x, y, haunt: plan.place, traits: [] }); }
  return out;
}
// Wisps that could pour together: the largest knot of `merge.count` or more within `merge.radius` of their centre, or null.
export function hauntKnot(wisps) {
  const M = HAUNT.merge; let best = null;
  for (const a of wisps) { const near = wisps.filter((b) => Math.hypot(b.x - a.x, b.y - a.y) <= M.radius); if (near.length >= M.count && (!best || near.length > best.length)) best = near; }
  if (!best) return null; const knot = best.slice(0, Math.max(M.count, best.length));
  return { wisps: knot, x: knot.reduce((s, e) => s + e.x, 0) / knot.length, y: knot.reduce((s, e) => s + e.y, 0) / knot.length };
}
export const splitDelay = (id, n) => { const S = HAUNT.split.every; return S[0] + (hashSeed(`split:${id}:${n}`) % 1000) / 1000 * (S[1] - S[0]); };

// Release 737: the haunt curses. A curse on the Wayfarer is { id, at, until, rot } (`at`/`until` on the game clock, ms; `rot`
// the maximum health it holds back). These helpers are pure; Game lays, enforces, expires and saves them.
export const curseDef = (id) => HAUNT.curses.find((c) => c.id === id) || null;
// `n` distinct curse ids for one landed hit, hashed from `key` (the haunt and its hit count), by weight.
export function rollCurses(key, n) {
  const pool = [...HAUNT.curses], out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((s, c) => s + c.weight, 0); let r = (hashSeed(`curse:v1:${key}:${i}`) % 10000) / 10000 * total, k = 0;
    while (k < pool.length - 1 && r >= pool[k].weight) { r -= pool[k].weight; k++; }
    out.push(pool[k].id); pool.splice(k, 1);
  }
  return out;
}
// Lays curse `id` on `list` at `now`: an active one is extended; past the cap the oldest is replaced. Returns
// { curse, fresh, dropped } (dropped: the curse that made room, so its held-back health can be given back), or null.
export function layCurse(list, id, now) {
  const def = curseDef(id); if (!def) return null; const ms = def.duration * 1000, C = HAUNT.curse;
  const had = list.find((c) => c.id === id && c.until > now);
  if (had) { had.until = Math.min(had.until + ms, now + ms * C.extendCap); return { curse: had, fresh: false, dropped: null }; }
  let dropped = null; const live = list.filter((c) => c.until > now);
  if (live.length >= C.cap) { dropped = live.reduce((a, b) => (b.at < a.at ? b : a)); list.splice(list.indexOf(dropped), 1); }
  const curse = { id, at: now, until: now + ms, rot: 0 }; list.push(curse);
  return { curse, fresh: true, dropped };
}
// The active curse that forbids `action` ("shoot", "attack", "jump", "dodge", "tools", "spells", "items"), or null.
export const curseBlocking = (list, action, now) => (list || []).find((c) => c.until > now && curseDef(c.id)?.blocks === action) || null;
// Removes and returns the curses that have worn off.
export function expireCurses(list, now) { const gone = []; for (let i = list.length - 1; i >= 0; i--) if (!(list[i].until > now)) gone.push(...list.splice(i, 1)); return gone; }
// For the save (remaining ms) and back.
export const cursesOut = (list, clock) => (list || []).filter((c) => c.until > clock).map((c) => ({ id: c.id, left: Math.round(c.until - clock), ago: Math.round(clock - c.at), rot: c.rot || 0 }));
export function cursesIn(raw, now) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.filter((c) => c && curseDef(c.id) && Number(c.left) > 0 && !seen.has(c.id) && seen.add(c.id)).slice(-HAUNT.curse.cap)
    .map((c) => ({ id: c.id, at: now - Math.max(0, Number(c.ago) || 0), until: now + Math.min(Number(c.left), curseDef(c.id).duration * 1000 * HAUNT.curse.extendCap), rot: Math.max(0, Number(c.rot) || 0) }));
}

// The Gloomvast (Tim, 2026-11-04: "We can make the ghost a finale creature, even more than the Gloomgorge: it gives you the
// curses, but its health and damage output are beefed up. It's blue and gorgeous... It has a move where it makes everything
// darkness: not completely dark, but much darker than usual, with just a small area of light around the Wayfarer. In the
// darkness you see lots of shadowy blue orbs moving around, and all of them can attack you. You can attack them but they don't
// really take damage. You don't know which one is him; you have to dodge... It could go on for a while."). A boss for the
// Pentagon's finale (monster-pack.ts `gloomvast`; its orbs `gloomShade`): the Gloomgorge grown grand and luminous, tuned to the
// Wayfarer like a world beast (`vitals`, from the live reference: health = `hitsToKill` of their blows plus `hpPerLevel` a
// level; a blow of 1x is `damageShare` of their maximum health after their damage reduction). Its haunt curses stack through
// HAUNT.curse. As its health falls past each `darkness.at` it calls the Dark: the light drains while it winds up, then for a
// hashed `duration` the view darkens to a small light round the Wayfarer (`light`; never fully black) and it comes apart into
// `orbs` shadowy decoys and itself, all alike. Every orb attacks (cold touches and curse puffs); a decoy keeps only `decoyTake`
// of what lands on it; the real one takes everything. Then the reveal: the decoys burst and it reels for `revealStagger` s.
// Everything here is data or pure; Game and the pack runtime read it.
export const GLOOM_FINALE = {
  kind: "gloomvast", orbKind: "gloomShade", version: 1,
  vitals: { hitsToKill: 58, hpPerLevel: 30, damageShare: .22, hpFloor: 1200, damageFloor: 8, scale: 2.1, staggerResistance: .7, attackGap: .55, cooldown: .9, speed: 1 },
  curse: { wail: 2, gloomfall: 1, lights: 1, touch: 1, puff: 1 }, // haunt curses laid by each landed move (HAUNT.curse caps and stacks them)
  confuse: { wail: 5 }, // seconds turned about by its Hollow Wail
  lights: { count: 6, speed: 3.2, home: 1.4, turn: 2.2, life: 3.6, radius: .32 }, // Grave Lights: slow homing motes
  gloomfall: { count: 5, radius: 1.3, arm: 1.15, spread: 2.2 }, // Gloomfall: one mark on you, one ahead of you, the rest round you
  darkness: {
    at: [.75, .45, .2], // shares of maximum health that call the Dark, each once
    gap: 10, // seconds after a reveal before the next Dark can be called
    windup: 1.6, // seconds the light drains before the Dark
    duration: [14, 18], // seconds of darkness (hashed per creature and per Dark)
    orbs: 9, cap: 10, // decoys laid with it (it is one more); never more than `cap` of its decoys alive
    spread: [2.6, 6.5], apart: 1.2, // decoys and it are laid this far from the Wayfarer, this far apart, on open safe floor
    decoyTake: .03, // a decoy keeps this share of each blow (a 560 blow leaves 17)
    decoyHp: 1, // a decoy's health, as a share of the Gloomvast's maximum (so no single blow can burst one)
    decoyDamage: .45, // a decoy's blows, as a share of the Gloomvast's damage
    brains: ["orbit", "flank", "orbit", "duelist", "orbit", "flank"], // how the orbs move round the Wayfarer (hashed per orb)
    fadeOut: .7, // seconds the dark takes to lift after the reveal
    revealStagger: 1.6, // seconds it reels once the dark lifts
    light: { inner: 1.45, edge: 1.7, alpha: .9, color: "4,8,22", lowRes: .5 }, // clear to `inner` tiles round the Wayfarer, dark by `inner + edge`; `alpha` < 1, so never fully black
  },
  text: {
    calling: "The Gloomvast draws the light into itself.",
    dark: "The light drains out of the world. Among the cold lights, one of them is it.",
    reveal: "The dark tears open, and there it is, reeling.",
  },
};
export const isGloomFinale = (e) => e?.kind === GLOOM_FINALE.kind;
export const isGloomOrb = (e) => e?.kind === GLOOM_FINALE.orbKind;
// The spawn record the finale arena lays (map.enemySpawns), or that Game.spawnGloomFinale makes and pushes at once. `id` must be
// stable for the arena (with the seed it keys every hashed choice of the fight); `opts.name` renames it; `opts.hpScale` and
// `opts.damageScale` (default 1) scale its tuned vitals, for an arena that wants it stronger or weaker.
export function gloomFinaleSpawn(id, x, y, opts = {}) {
  const k = (v) => Number(v) > 0 ? Number(v) : 1;
  return { id: String(id), kind: GLOOM_FINALE.kind, x, y, boss: true, gloomFinale: { v: GLOOM_FINALE.version, name: opts.name ? String(opts.name) : null, hpScale: k(opts.hpScale), damageScale: k(opts.damageScale) }, traits: [] };
}
// Its vitals for a tuning reference { level, perHit, maxHp, guard } (world-beasts.ts liveBeastReference).
export function gloomVitals(ref, opts = {}) {
  const V = GLOOM_FINALE.vitals, guard = Math.max(0, Math.min(.75, Number(ref?.guard) || 0));
  return {
    hp: Math.max(V.hpFloor, Math.round(((Number(ref?.perHit) || 0) * V.hitsToKill + V.hpPerLevel * (Number(ref?.level) || 1)) * (opts.hpScale || 1))),
    damage: Math.max(V.damageFloor, Math.round((Number(ref?.maxHp) || 60) * V.damageShare / (1 - guard) * (opts.damageScale || 1))),
  };
}
// The Dark it is due to call now (an index into darkness.at), or -1.
export function darkDue(e) {
  const D = GLOOM_FINALE.darkness, n = Math.max(0, Number(e?.gloomDarks) || 0);
  if (!e || n >= D.at.length || !(e.maxHp > 0) || (e.gloomGap || 0) > 0 || e.gloomDark) return -1;
  return e.hp / e.maxHp <= D.at[n] ? n : -1;
}
export const darkDuration = (key, n) => { const [lo, hi] = GLOOM_FINALE.darkness.duration; return lo + (hashSeed(`gloom:dark:v1:${key}:${n}`) % 1000) / 1000 * (hi - lo); };
// Where the orbs (and it) are laid for one Dark (`key`): up to `n` spots on open, safe floor round `center` (the Wayfarer),
// within darkness.spread and at least darkness.apart from one another; never on lethal ground, a pit, a hole, a doorway or an
// object's tile (stairs, chests, doors). Hashed from `key`, so a resumed Dark lays them the same. Bounded: one pass over the
// tiles within the outer spread.
export function gloomOrbSpots(map, width, center, n, key) {
  const D = GLOOM_FINALE.darkness, tiles = map?.tiles || [], W = Math.max(1, Number(width) || 1), height = Math.floor(tiles.length / W), cx = Number(center?.x) || 0, cy = Number(center?.y) || 0, far = D.spread[1];
  const objAt = new Set((map?.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)), cand = [], out = [];
  for (let y = Math.max(1, Math.floor(cy - far)); y <= Math.min(height - 2, Math.ceil(cy + far)); y++) for (let x = Math.max(1, Math.floor(cx - far)); x <= Math.min(W - 2, Math.ceil(cx + far)); x++) {
    const t = tiles[y * W + x], d = Math.hypot(x - cx, y - cy);
    if (!t || t.blocked || LETHAL_KINDS.has(t.kind) || t.pit || t.hole || t.doorway || objAt.has(`${x},${y}`) || d < D.spread[0] || d > far) continue;
    cand.push({ x, y, k: hashSeed(`gloom:spot:v1:${key}:${x},${y}`) });
  }
  cand.sort((a, b) => a.k - b.k || a.y - b.y || a.x - b.x);
  for (const c of cand) { if (out.length >= n) break; if (out.every((q) => Math.hypot(q.x - c.x, q.y - c.y) >= D.apart)) out.push({ x: c.x, y: c.y }); }
  return out;
}
// How dark the view is for one Gloomvast, 0 (none) to 1 (its full Dark): rising while it calls the Dark, held through it,
// lifting after the reveal (`gloomFade` seconds left).
export function gloomDarkLevel(e) {
  if (!e || e.dead) return 0; const D = GLOOM_FINALE.darkness;
  if (e.gloomDark?.left > 0) return 1;
  const s = e.pack; if (s?.attack === "vastDark" && s.phase === "windup") { const total = Math.max(.01, Number(s.data?.total) || D.windup); return Math.max(0, Math.min(1, 1 - Math.max(0, s.t) / total)); }
  return e.gloomFade > 0 ? Math.max(0, Math.min(1, e.gloomFade / D.fadeOut)) : 0;
}
