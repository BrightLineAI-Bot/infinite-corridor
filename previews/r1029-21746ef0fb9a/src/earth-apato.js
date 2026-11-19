// The Earth Apatosaurus (Tim, 2026-11-18): a hostile world beast at the Spinosaurus's and the Wild Stegosaurus's level. A long-necked
// sauropod, green with brown earth across its back and a seed sprout on its head. Its moves (ATTACK_MODULES entries APATO_ATTACKS, the
// numbers in APATO), its tree clones (APATO_CLONE), its big-room spawns (APATO_ROOMS) and its duel with the Spinosaurus and the Wild
// Stegosaurus (dino-duel.ts pairs) live here. monster-pack.ts hands this module its shared helpers once (installApatoKit) and calls
// apatoFx (every frame: its bounded hazards), apatoTick (every fighting frame, before the shared brain), apatoCan (attack readiness),
// apatoAfflicted (a duel foe it holds or has dazed) and the START / RUN entries (APATO_START, APATO_RUN).
//
// Bounded for the phone (APATO.caps): at most 6 saplings, 3 tree clones, 6 root necks, 4 rock hands, 6 spires, 12 leaves in flight
// (and 8 thrown rocks, 6 seeds, 6 stomp waves). Every hazard lives in a pool on the beast allocated once (e.apatoFx); nothing is
// allocated per frame. Every choice is hashed from stable ids (no Math.random), so the same fight plays the same on every run.
//
// The pose contract the art reads (never timing):
//   e.apatoPose: null | "slamRaise" | "slam" | "lashReady" | "lash" | "lashBack" | "hydra" | "seedStamp" | "beamLift" | "beam" | "sweep" |
//     "spireStamp" | "handsCall" | "leafReady" | "leaf" | "stomp" | "wrapTrack" | "wrapLunge" | "wrapHold" | "wrapThrow" | "stagger" |
//     "graze" | "feed";
//   e.apatoHeading { x, y } (its body's facing); e.apatoGlow (0..1, the sprout on its head lit for the beam);
//   e.apatoNeckLift (-1 down .. 1 up) and e.apatoNeckReach (0..1 stretched forward);
//   e.apatoLash { on, n, xs, ys } (the true neck's path, from its shoulders, index 0, to its head, index n, in tiles);
//   e.apatoBeam { on, x, y, ax, ay, len, width } (from the head, along ax, ay); e.apatoWrap { on, who, phase, t, x, y } (the mark);
//   e.apatoStep (0..3, the foot that last came down in the stomp chase) and e.apatoStepLift (0..1, the next foot rising); e.apatoFx (the pools) and e.apatoSaplings ([{ x, y, grow }]).
import { hashSeed } from "./random.js?v=r1029-21746ef0fb9a";
import { doseCreature, tickCreatureVenom } from "./apato-poison.js?v=r1029-21746ef0fb9a";
import { stegoRoomGround, stegoRoomSquare } from "./wild-stego.js?v=r1029-21746ef0fb9a";

const TAU = Math.PI * 2;
export const APATO = {
  version: 1,
  turn: 1.5, /* radians a second its body turns toward what it fights, between moves */
  // Phone budget: live entities at once.
  caps: { saplings: 6, clones: 3, roots: 6, hands: 4, spires: 6, leaves: 12, rocks: 8, seeds: 6, waves: 6 },
  // Neck slam: the head comes down on the marked circle `reach` past its body (tracked until `lockAt` s before the drop); the ground
  // rings out from it (`ring` tiles, `ringShare` of the blow, jumpable).
  slam: { reach: 3.4, radius: 1.5, lockAt: .3, follow: 4, ring: 3.2, ringShare: .4 },
  // Long neck lash: the true neck runs out across the ground like a snake, its head turning `turn` rad/s toward the Wayfarer at
  // `speed` tiles/s, up to `reach` tiles of neck (`segs` joints), then draws back over `back` s. The head bites once (`radius`).
  lash: { reach: 11, segs: 14, speed: 10, turn: 3, radius: .75, back: .55, sway: .35 },
  // Hydra: `roots` vine necks burst out round it in every direction and hunt for `life` s (tips turning `turn` rad/s at `speed`
  // tiles/s, at most `reach` from where they rose), each tip biting (`radius`) at most every `gap` s for `share` of the move's
  // damage. Meanwhile the true neck draws back and it walks on at `walk` of its pace.
  hydra: { roots: 5, rise: .45, life: 4.2, speed: 3.1, turn: 2.4, reach: 7, radius: .5, gap: .9, share: 1, walk: .55, spread: 1.2 },
  // Seed scatter: it stamps and `count` seeds fly from its back (`flight` s each, staggered `stagger` s), one onto the Wayfarer and the
  // rest round it and round the beast; a seed hurts in `radius` and lodges as a sapling where the ground is open.
  seeds: { count: 5, flight: .75, stagger: .12, radius: .9, near: [1.2, 3.2], far: [2.4, 5.5] },
  // Saplings: grow only while the beam touches them (`grow` s of light in all), then become a tree clone (APATO_CLONE). Unlit, one
  // withers after `wither` s. `touch`: the beam's half-width plus this reaches one.
  sapling: { grow: .7, wither: 45, touch: .45 },
  // The eye beam: its head lifts and the sprout glows (the wind-up, the line following the Wayfarer until `lockAt` s before it fires),
  // then light pours from its eyes along the line for the active time, `reach` tiles at most (walls cut it), `width` across; the
  // Wayfarer on it is hurt every `tick` s. The sweep waves the head across `arc` degrees (a cone) over its active time.
  beam: { reach: 10, width: .55, tick: .3, lockAt: .35, follow: 2.5, arc: 110 },
  // Rock spires: `count` spires marked (one under the Wayfarer, the rest round them `ring` tiles out), each bursting after `warn` s
  // (staggered `stagger` s) in `radius`, standing `up` s, then crumbling.
  spires: { count: 4, warn: .8, stagger: .22, radius: .75, up: 1, ring: [1.6, 3.2] },
  // Earth hands: `count` hands rise `ring` tiles from the Wayfarer (hashed spots), each throwing `throws` rocks at them, `every` s apart
  // (the first after `rise` s), then sinking (`life` s in all). A rock flies `speed` tiles/s for at most `range` tiles and hits once.
  hands: { count: 3, rise: .7, throws: 2, every: 1.2, life: 3.6, ring: [3.5, 6.5], speed: 7.5, range: 11, radius: .4 },
  // Razor leaf: `volleys` fans of `fan` spinning leaves `spread` degrees wide, `every` s apart, flying `speed` tiles/s for `life` s.
  leaves: { volleys: 3, fan: 4, spread: 36, every: .32, speed: 8.5, life: 1.4, radius: .32 },
  // Stomp chase: it walks after the Wayfarer at `speed` of its pace, a foot coming down every `every` s (`steps` in all), each sending
  // out a wave (`wave` tiles over `waveTime` s, jumpable, `waveShare` of the move's damage); close at the end (`close` tiles past its
  // body), both forefeet come down in `radius` for the move's full damage.
  stomp: { steps: 6, every: .5, speed: 2, wave: 3.2, waveTime: .55, waveShare: .3, close: 2.2, radius: 2, turn: 2.2 },
  // Neck wrap (the grab): a coil mark follows the Wayfarer, locking `lockAt` s before the end; the neck shoots out (`lunge` s) and, if
  // they are inside `radius`, wraps them `hold` s (held fast), spraying venom `sprays` times (`dose` stacks each, the strongest venom:
  // POISON.sources.wrap; `sprayShare` of the move's damage each), then flings them `throw` tiles (`throwShare`).
  wrap: { lockAt: .4, follow: 5, markMax: 7, radius: 1.15, lunge: .35, hold: 2.2, sprays: 4, dose: 2.6, sprayShare: .18, throw: 2.6, throwShare: .45, slack: .3,
    // the duel: the foe wrapped `creatureHold` s, `creatureSprays` sprays of `creatureDose` venom stacks and `creatureShare` of the move's
    // damage each, then dazed `daze` s
    creatureHold: 3, creatureSprays: 4, creatureDose: 2.5, creatureShare: .5, daze: 3.5 },
  // The dino duel (dino-duel.ts): the Spinosaurus or the Wild Stegosaurus within `sight` draws it; with you within `close` it turns on
  // you only at `youChance` % of its choices (chosen again after `refocus` s, `refocusYou` s when it chose you). It closes to `gap`
  // tiles past both bodies; `share`/`floor` as the stego's; it holds its blow while the foe's is coming (`wait`).
  duel: { kinds: ["spinoRex", "wildStego"], sight: 16, refocus: 5, refocusYou: 2, close: 6, youChance: 22, share: .035, floor: .08, gap: .6, speed: .85, wait: true,
    moves: ["apatoWrap", "apatoNeckSlam", "apatoLash", "apatoStomp", "apatoSpires", "apatoLeaves"] },
  graze: { every: 7, time: 2.6 },
  text: {
    clone: "The sapling drinks the light and heaves itself up: a tree, shaped like the beast!",
    wrapped: "Its neck coils round you! Venom sprays into the wound.",
    latched: "A tree clone coils round you! Strike, strike, strike to break free.",
    free: "You tear free of the coils.", slip: "You slip out of the coils.",
  },
};
// Its tree clones: weaker, wooden, a few at once for a while.
export const APATO_CLONE = {
  version: 1,
  hp: .1, damage: .45, scale: .62, life: 32, /* `hp` and `damage`: shares of its maker's */
  slam: { reach: 1.5, radius: .9 },
  tail: { reach: 2.1, arc: 160 },
  thorn: { speed: 8, life: 1.1, radius: .3, cap: 3 },
  // Coil snap: the head darts `reach` past its body in `dart` s; inside `radius` it latches, then pulls itself to the Wayfarer
  // (`pull` tiles/s) and holds on. Latched clones dose venom: `dose` stacks a second, times (1 + `ramp` × seconds held) and
  // (1 + `crowd` × other latched clones), never past POISON.sources.clone. Breaking free: `mash` attack presses, plus `mashPer`
  // for each clone after the first; or any jump of the Wayfarer more than `slip` tiles (Rift Step, the Shadow Clone's step). Flung
  // clones are stunned `stun` s and cannot coil again for `again` s. A latch lets go after `max` s on its own.
  coil: { reach: 1.8, dart: .28, radius: .85, pull: 4, close: .55, dose: .7, ramp: .3, crowd: .6, mash: 6, mashPer: 3, slip: 1.1, stun: 1.2, again: 5, max: 7, chip: .15, chipEvery: 1 },
};
// The moves (spread into monster-pack.ts ATTACK_MODULES). Times are seconds; `damage` multiplies the creature's damage.
export const APATO_ATTACKS = {
  apatoNeckSlam: { id: "apatoNeckSlam", name: "Neck Slam", range: [0, 5.2], cooldown: 4.4, windup: .85, active: .3, recover: .8, damage: 1.5, tags: ["melee", "ground"], text: "It rears its long neck high, the marked circle following you, and brings its head down like a hammer; the ground rings out from it. Out of the circle, then jump the ring." },
  apatoLash: { id: "apatoLash", name: "Serpent Neck", range: [2.5, 12], cooldown: 8, windup: .7, active: 2.6, recover: .6, damage: 1.25, tags: ["melee", "charge"], text: "Its neck runs out impossibly long across the ground, slithering after you like a snake. Dodge through the head as it strikes." },
  apatoHydra: { id: "apatoHydra", name: "Hydra Roots", range: [0, 12], cooldown: 16, windup: .9, active: 3.2, recover: .6, damage: .5, tags: ["summon", "ground"], text: "Root necks burst out of its back in every direction and hunt you for a few seconds while it walks on. Keep moving; dodge the heads." },
  apatoSeeds: { id: "apatoSeeds", name: "Seed Scatter", range: [1, 10], cooldown: 12, windup: .7, active: 1.3, recover: .6, damage: .6, tags: ["ranged", "ground"], text: "It stamps and seeds spray from its back onto the marked spots. Where they land they lodge as saplings." },
  apatoBeam: { id: "apatoBeam", name: "Sprout Beam", range: [2, 11], cooldown: 11, windup: 1.3, active: 1.5, recover: .8, damage: .4, los: true, tags: ["ranged", "beam"], text: "It lifts its head; the sprout on it glows and the line follows you, then light pours from its eyes along it. A sapling the light touches grows into a tree clone." },
  apatoBeamSweep: { id: "apatoBeamSweep", name: "Nurturing Sweep", range: [2, 10], cooldown: 15, windup: 1.3, active: 2.2, recover: .8, damage: .35, tags: ["ranged", "beam"], text: "It waves its glowing head across a wide cone, the eye beams sweeping the ground and nurturing every sapling in it. Get under or behind it." },
  apatoSpires: { id: "apatoSpires", name: "Rock Spires", range: [0, 10], cooldown: 9, windup: .7, active: 1.6, recover: .6, damage: 1.1, tags: ["ground"], text: "It stamps: spires of rock burst from the marked ground one after another, stand a moment, then crumble." },
  apatoHands: { id: "apatoHands", name: "Earth Hands", range: [2, 12], cooldown: 14, windup: .8, active: .5, recover: .6, damage: .6, tags: ["ranged", "summon"], text: "Hands of earth rise round you and throw rocks. Keep moving and the rocks miss." },
  apatoLeaves: { id: "apatoLeaves", name: "Razor Leaf", range: [2, 10], cooldown: 6, windup: .55, active: 1, recover: .5, damage: .35, tags: ["ranged"], text: "It shakes its head and spinning leaves fly at you in fans. Step between them." },
  apatoStomp: { id: "apatoStomp", name: "Stomp Chase", range: [2.5, 10], cooldown: 10, windup: .6, active: 3.4, recover: .9, damage: 1.4, tags: ["ground", "charge"], text: "It comes after you, stomping: every footfall sends a wave along the ground (jump them), and close at the end both forefeet come down." },
  apatoWrap: { id: "apatoWrap", name: "Venom Coil", range: [0, 7], cooldown: 15, windup: 1.5, active: 3.4, recover: .8, damage: 1, tags: ["grab", "poison"], text: "A coil mark follows you. Be out from under it when it stops, or the neck wraps you, sprays venom and flings you down." },
  // its tree clones
  apatoCloneSlam: { id: "apatoCloneSlam", name: "Timber Slam", range: [0, 2.6], cooldown: 3, windup: .55, recover: .7, damage: .9, tags: ["melee"], text: "A tree clone rears its wooden neck and slams it down in front of it." },
  apatoCloneTail: { id: "apatoCloneTail", name: "Branch Whip", range: [0, 2.8], cooldown: 3.5, windup: .45, active: .45, recover: .6, damage: .7, tags: ["melee"], text: "It whips its branching tail across the ground behind and beside it." },
  apatoCloneThorn: { id: "apatoCloneThorn", name: "Thorn Shot", range: [2, 8], cooldown: 4, windup: .5, recover: .6, damage: .45, los: true, tags: ["ranged"], text: "It spits a thorn at you." },
  apatoCloneCoil: { id: "apatoCloneCoil", name: "Coil Snap", range: [0, 4], cooldown: 6, windup: .55, active: .6, recover: .8, damage: .3, tags: ["grab", "poison"], text: "Its head darts at you; caught, it coils round you and pulls itself in, dosing venom the longer it holds. Strike again and again to break free, or step away with a Rift Step or your Shadow Clone." },
};
// Big rooms (as the Wild Stegosaurus's, wild-stego.ts): a great building's floor or an adventure Pentagon's chamber first generated
// from this version on (pinned on the floor's own history as `apatoRooms` by game.ts generatePinnedDungeon) may hold one in its
// biggest open square, unless a stego or Spinosaurus already holds that room. A floor generated before holds none, and never gains one.
export const APATO_ROOMS = { version: 1, chance: .1, side: 10 };
export const isApato = (e) => e?.kind === "earthApato";
export const isApatoClone = (e) => e?.kind === "apatoClone";
export const apatoTuned = (e) => !!e?.apatoRoom;
// Never its business: it ignores every Triceratops, wild or ridden (Tim, 2026-11-18), and every creature but its duel foes.
export const apatoIgnores = (q) => !q || q.kind === "triceratops" || !!q.mountView || !!q.mount;

// ---------------------------------------------------------------- the shared helpers monster-pack.ts hands over
let K = null;
export function installApatoKit(kit) { K = kit; }
// ---------------------------------------------------------------- math without allocation
const hyp = Math.hypot;
function segDist(px, py, ax, ay, bx, by) { const vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)); return hyp(px - (ax + vx * t), py - (ay + vy * t)); }
const wrapAngle = (a) => ((a % TAU) + TAU * 1.5) % TAU - Math.PI;
function heading(e) { const h = e.apatoHeading; if (!h || !Number.isFinite(h.x) || !Number.isFinite(h.y) || !(h.x || h.y)) e.apatoHeading = { x: e.facingX < 0 ? -1 : 1, y: 0 }; return e.apatoHeading; }
function face(e, x, y) { const m = hyp(x, y); if (!(m > 1e-9)) return; const h = heading(e); h.x = x / m; h.y = y / m; if (Math.abs(h.x) > .05) e.facingX = h.x >= 0 ? 1 : -1; }
function turnToward(e, x, y, rate, dt) { const h = heading(e), cur = Math.atan2(h.y, h.x), diff = wrapAngle(Math.atan2(y - e.y, x - e.x) - cur), a = cur + Math.max(-rate * dt, Math.min(rate * dt, diff)); face(e, Math.cos(a), Math.sin(a)); }
const hashK = (key, n) => hashSeed(key) % n;
const frac = (key) => (hashSeed(key) % 1000) / 1000;
const open = (w, x, y) => !w.open || w.open(x, y);
function playerAt(w) { return w.player; }
function preyOf(w, s) { const id = s?.data?.prey; if (!id) return null; for (const q of w.enemies || []) if (q.id === id && !q.dead) return q; return null; }
// What a move aims at: its prey in a duel, else the Wayfarer.
function quarry(w, s) { return preyOf(w, s) || playerAt(w); }
const dmg = (e, id, share = 1) => Math.max(1, Math.ceil(K.damageOf(e, id) * share));
// A blow on the Wayfarer inside the circle (x0, y0, r) (or within r of the segment to x1, y1 when `seg`), and on its duel prey if
// the near side of its bulk is. True if anything was hit. No allocation unless something is hit.
const within = (x, y, seg, x0, y0, x1, y1, r) => seg ? segDist(x, y, x0, y0, x1, y1) <= r : hyp(x - x0, y - y0) <= r;
function strike(e, s, w, id, x0, y0, r, share = 1, seg = false, x1 = 0, y1 = 0) {
  const p = playerAt(w), n = dmg(e, id, share); let landed = false;
  if (within(p.x, p.y, seg, x0, y0, x1, y1, r) && (!w.los || w.los(e, p))) landed = !!w.hurt(e, n, { jumpable: false, source: id });
  const prey = preyOf(w, s);
  if (prey && !apatoIgnores(prey)) { const at = K.duelReachPoint(e, prey); if (within(at.x, at.y, seg, x0, y0, x1, y1, r)) { K.woundRival(w, e, prey, Math.max(n, Math.ceil((Number(prey.maxHp) || 1) * APATO.duel.share))); K.cue(w, e, "hit", id, prey, { victim: prey.kind }); landed = true; } }
  return landed;
}
// ---------------------------------------------------------------- the pools (one allocation, on first sight)
function pool(n, make) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = make(); return a; }
export function apatoPools(e) {
  if (e.apatoFx && e.apatoFx.v === APATO.version) return e.apatoFx;
  const C = APATO.caps;
  e.apatoFx = {
    v: APATO.version,
    roots: pool(C.roots, () => ({ on: false, bx: 0, by: 0, x: 0, y: 0, hx: 1, hy: 0, t: 0, life: 0, next: 0, prey: null })),
    hands: pool(C.hands, () => ({ on: false, x: 0, y: 0, t: 0, life: 0, throws: 0, next: 0, prey: null })),
    rocks: pool(C.rocks, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, left: 0, dmg: 0, prey: null })),
    spires: pool(C.spires, () => ({ on: false, x: 0, y: 0, t: 0, warn: 0, up: 0, hit: false, dmg: 0, prey: null })),
    leaves: pool(C.leaves, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, left: 0, dmg: 0, spin: 0, prey: null })),
    seeds: pool(C.seeds, () => ({ on: false, fx: 0, fy: 0, tx: 0, ty: 0, t: 0, total: 0, delay: 0, dmg: 0 })),
    waves: pool(C.waves, () => ({ on: false, x: 0, y: 0, r: 0, max: 0, t: 0, total: 0, hit: false, preyHit: false, dmg: 0, prey: null })),
  };
  return e.apatoFx;
}
function take(list) { for (let i = 0; i < list.length; i++) if (!list[i].on) return list[i]; return null; }
export function apatoLive(e, kind) { const L = e?.apatoFx?.[kind]; if (!L) return 0; let n = 0; for (let i = 0; i < L.length; i++) if (L[i].on) n++; return n; }
function clearPools(e) { const F = e.apatoFx; if (!F) return; for (const k of ["roots", "hands", "rocks", "spires", "leaves", "seeds", "waves"]) for (const q of F[k] || []) q.on = false; }
// The art's records, made once.
function lashRec(e) { const N = APATO.lash.segs; if (!e.apatoLash || !Array.isArray(e.apatoLash.xs) || e.apatoLash.xs.length !== N + 1) e.apatoLash = { on: false, n: 0, xs: new Array(N + 1).fill(0), ys: new Array(N + 1).fill(0) }; return e.apatoLash; }
function beamRec(e) { return e.apatoBeam && typeof e.apatoBeam === "object" ? e.apatoBeam : (e.apatoBeam = { on: false, x: 0, y: 0, ax: 1, ay: 0, len: 0, width: APATO.beam.width }); }
function wrapRec(e) { return e.apatoWrap && typeof e.apatoWrap === "object" ? e.apatoWrap : (e.apatoWrap = { on: false, who: null, phase: null, t: 0, x: 0, y: 0 }); }
// The pose contract's resting values.
export const apatoPoseDefaults = () => ({ apatoPose: null, apatoGlow: 0, apatoNeckLift: 0, apatoNeckReach: 0, apatoStep: 0, apatoStepLift: 0 });
// A reload: no move, hazard, beam, wrap or lash resumes mid-way. Its saplings are kept (they lie on the ground).
export function resetApatoRuntime(e) {
  Object.assign(e, apatoPoseDefaults()); clearPools(e);
  if (e.apatoLash) e.apatoLash.on = false; if (e.apatoBeam) e.apatoBeam.on = false; if (e.apatoWrap) e.apatoWrap.on = false;
  if (Array.isArray(e.apatoSaplings)) e.apatoSaplings = e.apatoSaplings.filter((q) => q && Number.isFinite(q.x) && Number.isFinite(q.y)).slice(0, APATO.caps.saplings).map((q) => ({ x: q.x, y: q.y, grow: Math.max(0, Math.min(APATO.sapling.grow, Number(q.grow) || 0)), age: Math.max(0, Number(q.age) || 0) }));
  delete e.apatoHeldBy; e.apatoLatched = false; e.apatoLatchT = 0; e.apatoDazed = 0;
  return e;
}
// Where the true neck rises (its shoulders) and where its head is at rest, in tiles.
const NECK = { base: .55, head: 1.6 };
function neckBase(e, out) { const h = heading(e), r = K.bodyRadius(e); out.x = e.x + h.x * r * NECK.base; out.y = e.y + h.y * r * NECK.base; return out; }
function headAt(e, out) { const h = heading(e), r = K.bodyRadius(e); out.x = e.x + h.x * r * NECK.head; out.y = e.y + h.y * r * NECK.head; return out; }
const P0 = { x: 0, y: 0 }, P1 = { x: 0, y: 0 };

// ---------------------------------------------------------------- saplings and clones
export function apatoSaplings(e) { if (!Array.isArray(e.apatoSaplings)) e.apatoSaplings = []; return e.apatoSaplings; }
function plant(e, w, x, y) {
  const list = apatoSaplings(e); if (list.length >= APATO.caps.saplings) return false;
  if (!open(w, x, y) || w.oceanAt?.(x, y)) return false;
  for (const q of list) if (hyp(q.x - x, q.y - y) < .7) return false;
  list.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, grow: 0, age: 0 }); return true;
}
export function apatoClones(e, w) { let n = 0; for (const q of w.enemies || []) if (q.apatoCloneOf === e.id && !q.dead) n++; return n; }
// A beam segment (from x0, y0 along ax, ay for len) lights the saplings it touches for dt; a full-grown one becomes a clone.
function lightSaplings(e, w, x0, y0, ax, ay, len, width, dt) {
  const list = apatoSaplings(e), S = APATO.sapling;
  for (let i = list.length - 1; i >= 0; i--) {
    const q = list[i]; if (segDist(q.x, q.y, x0, y0, x0 + ax * len, y0 + ay * len) > width + S.touch) continue;
    q.grow = Math.min(S.grow, q.grow + dt); q.age = 0;
    if (q.grow >= S.grow && apatoClones(e, w) < APATO.caps.clones) {
      const c = w.spawnApatoClone?.(e, q.x, q.y, (e.apatoCloneN = (Number(e.apatoCloneN) || 0) + 1));
      if (c) { list.splice(i, 1); w.say?.(APATO.text.clone); K.cue(w, e, "grow", "apatoClone", c); }
    }
  }
}
// A new clone's numbers from its maker (game.ts and the bare test world both call it).
export function tuneApatoClone(c, owner, n = 1) {
  const C = APATO_CLONE, hp = Math.max(8, Math.round((Number(owner.maxHp) || 100) * C.hp));
  Object.assign(c, { apatoCloneOf: owner.id, summonedBy: owner.id, noRewards: true, aggro: true, hp, maxHp: hp, damage: Math.max(1, Math.round((Number(owner.damage) || 10) * C.damage)), apatoCloneLife: C.life, apatoLatched: false, apatoLatchT: 0, apatoCoilAgain: 0, packName: "Tree Clone", ...(owner.apatoRoom ? { apatoRoom: false } : {}) });
  c.scale = (Number(owner.scale) || 1.9) * C.scale; c.bodyRadius = Math.max(.38, (Number(owner.bodyRadius) || .9) * C.scale);
  c.id = `${owner.id}:tree:${n}`; c.packAttacks = ["apatoCloneSlam", "apatoCloneTail", "apatoCloneThorn", "apatoCloneCoil"];
  return c;
}

// ---------------------------------------------------------------- every frame: its hazards (and a dead beast's clean-up)
function target(w, id) { if (!id) return null; for (const q of w.enemies || []) if (q.id === id && !q.dead) return q; return null; }
// A hazard reaching a duel foe: the near side of its bulk within `r` of `at`.
function hitPrey(e, w, q, at, r, n, id) { if (!q || apatoIgnores(q)) return false; const a = K.duelReachPoint(e, q); if (hyp(a.x - at.x, a.y - at.y) > r + .2) return false; K.woundRival(w, e, q, Math.max(n, Math.ceil((Number(q.maxHp) || 1) * APATO.duel.share * .5))); K.cue(w, e, "hit", id, q, { victim: q.kind }); return true; }
export function apatoFx(e, w) {
  const F = apatoPools(e), dt = w.dt; if (!(dt > 0)) return;
  if (e.dead) { clearPools(e); e.apatoSaplings = []; for (const q of w.enemies || []) if (q.apatoCloneOf === e.id && !q.dead) { q.hp = 0; q.dead = true; q.noRewards = true; q.rewarded = true; } return; }
  const p = playerAt(w);
  // saplings wither unlit
  const sap = apatoSaplings(e); for (let i = sap.length - 1; i >= 0; i--) { sap[i].age += dt; if (sap[i].age >= APATO.sapling.wither && sap[i].grow <= 0) sap.splice(i, 1); }
  // seeds: in flight, then a burst and a sapling
  for (const q of F.seeds) { if (!q.on) continue; if (q.delay > 0) { q.delay -= dt; continue; } q.t += dt; if (q.t < q.total) continue;
    q.on = false; if (hyp(p.x - q.tx, p.y - q.ty) <= APATO.seeds.radius) w.hurt(e, q.dmg, { jumpable: false, source: "apatoSeeds" }); plant(e, w, q.tx, q.ty); }
  // root necks: tips hunt the Wayfarer (or the duel foe)
  const H = APATO.hydra;
  for (const q of F.roots) { if (!q.on) continue; q.t += dt; if (q.t >= q.life) { q.on = false; continue; }
    if (q.t < H.rise) continue;
    const foe = target(w, q.prey), tx = foe ? foe.x : p.x, ty = foe ? foe.y : p.y, cur = Math.atan2(q.hy, q.hx), diff = wrapAngle(Math.atan2(ty - q.y, tx - q.x) - cur), a = cur + Math.max(-H.turn * dt, Math.min(H.turn * dt, diff));
    q.hx = Math.cos(a); q.hy = Math.sin(a); let nx = q.x + q.hx * H.speed * dt, ny = q.y + q.hy * H.speed * dt;
    const far = hyp(nx - q.bx, ny - q.by); if (far > H.reach) { nx = q.bx + (nx - q.bx) / far * H.reach; ny = q.by + (ny - q.by) / far * H.reach; }
    if (open(w, nx, ny)) { q.x = nx; q.y = ny; }
    q.next -= dt; if (q.next > 0) continue;
    if (hyp(p.x - q.x, p.y - q.y) <= H.radius + .25 && w.hurt(e, dmg(e, "apatoHydra", H.share), { jumpable: false, source: "apatoHydra" })) q.next = H.gap;
    else if (foe && hitPrey(e, w, foe, q, H.radius, dmg(e, "apatoHydra", H.share), "apatoHydra")) q.next = H.gap; }
  // earth hands: rise, throw, sink
  const Hd = APATO.hands;
  for (const q of F.hands) { if (!q.on) continue; q.t += dt; if (q.t >= q.life) { q.on = false; continue; }
    if (q.t < Hd.rise || q.throws <= 0) continue; q.next -= dt; if (q.next > 0) continue;
    const r = take(F.rocks); q.next = Hd.every; q.throws--; if (!r) continue;
    const foe = target(w, q.prey), tx = foe ? foe.x : p.x, ty = foe ? foe.y : p.y, m = hyp(tx - q.x, ty - q.y) || 1;
    r.on = true; r.x = q.x; r.y = q.y; r.vx = (tx - q.x) / m * Hd.speed; r.vy = (ty - q.y) / m * Hd.speed; r.left = Hd.range / Hd.speed; r.dmg = dmg(e, "apatoHands"); r.prey = q.prey; K.cue(w, e, "fling", "apatoHands", q); }
  for (const q of F.rocks) { if (!q.on) continue; const ox = q.x, oy = q.y; q.x += q.vx * dt; q.y += q.vy * dt; q.left -= dt;
    if (q.left <= 0 || (w.tileOpen && !w.tileOpen(q.x + .5, q.y + .5))) { q.on = false; continue; }
    if (segDist(p.x, p.y, ox, oy, q.x, q.y) <= Hd.radius + .3) { q.on = false; w.hurt(e, q.dmg, { jumpable: false, source: "apatoHands" }); continue; }
    const foe = target(w, q.prey); if (foe && hitPrey(e, w, foe, q, Hd.radius + .6, q.dmg, "apatoHands")) q.on = false; }
  // spires: warn, burst, stand, crumble
  const Sp = APATO.spires;
  for (const q of F.spires) { if (!q.on) continue; q.t += dt;
    if (!q.hit && q.t >= q.warn) { q.hit = true; if (hyp(p.x - q.x, p.y - q.y) <= Sp.radius + .2) w.hurt(e, q.dmg, { jumpable: false, source: "apatoSpires" }); hitPrey(e, w, target(w, q.prey), q, Sp.radius + .4, q.dmg, "apatoSpires"); K.cue(w, e, "land", "apatoSpires", q); }
    if (q.t >= q.warn + q.up) q.on = false; }
  // razor leaves
  const L = APATO.leaves;
  for (const q of F.leaves) { if (!q.on) continue; const ox = q.x, oy = q.y; q.x += q.vx * dt; q.y += q.vy * dt; q.left -= dt; q.spin += dt;
    if (q.left <= 0 || (w.tileOpen && !w.tileOpen(q.x + .5, q.y + .5))) { q.on = false; continue; }
    if (segDist(p.x, p.y, ox, oy, q.x, q.y) <= L.radius + .3) { q.on = false; w.hurt(e, q.dmg, { jumpable: false, source: "apatoLeaves" }); continue; }
    const foe = target(w, q.prey); if (foe && hitPrey(e, w, foe, q, L.radius + .5, q.dmg, "apatoLeaves")) q.on = false; }
  // stomp waves (rings along the ground: jump them)
  for (const q of F.waves) { if (!q.on) continue; q.t += dt; const k = Math.min(1, q.t / q.total); q.r = q.max * k;
    if (!q.hit && Math.abs(hyp(p.x - q.x, p.y - q.y) - q.r) < .45) { q.hit = true; w.hurt(e, q.dmg, { jumpable: true, source: "apatoStomp" }); }
    const foe = target(w, q.prey); if (foe && !q.preyHit && Math.abs(hyp(foe.x - q.x, foe.y - q.y) - q.r) < K.bodyRadius(foe) + .4) { q.preyHit = true; hitPrey(e, w, foe, foe, 99, q.dmg, "apatoStomp"); }
    if (k >= 1) q.on = false; }
}
function wave(e, w, x, y, max, time, n, prey) { const q = take(apatoPools(e).waves); if (!q) return; q.on = true; q.x = x; q.y = y; q.r = 0; q.max = max; q.t = 0; q.total = time; q.hit = false; q.preyHit = false; q.dmg = n; q.prey = prey || null; }

// ---------------------------------------------------------------- the moves
function windupOf(s, id) { return s.windupTotal || APATO_ATTACKS[id]?.windup || .5; }
export const APATO_START = {
  apatoNeckSlam(e, s) { const A = APATO.slam; s.data.mark = { x: 0, y: 0 }; s.windupTotal = s.t; slamPoint(e, s.data.target, A.reach, s.data.mark); s.tele = { type: "circle", x: s.data.mark.x, y: s.data.mark.y, radius: A.radius }; e.apatoPose = "slamRaise"; },
  apatoLash(e, s) { s.windupTotal = s.t; e.apatoPose = "lashReady"; const L = lashRec(e); L.on = false; L.n = 0; },
  apatoHydra(e, s) { s.windupTotal = s.t; e.apatoPose = "hydra"; s.tele = { type: "ring", radius: K.bodyRadius(e) + 1.2 }; },
  apatoSeeds(e, s) { s.windupTotal = s.t; e.apatoPose = "seedStamp"; s.data.marks = seedMarks(e, s); s.tele = null; },
  apatoBeam(e, s) { s.windupTotal = s.t; e.apatoPose = "beamLift"; s.data.aim2 = { x: s.data.aim.x, y: s.data.aim.y }; s.tele = { type: "lane", aim: s.data.aim2, length: APATO.beam.reach, width: APATO.beam.width * 2 }; },
  apatoBeamSweep(e, s) { s.windupTotal = s.t; e.apatoPose = "beamLift"; const B = APATO.beam, a = Math.atan2(s.data.aim.y, s.data.aim.x), side = hashK(`${e.id}:sweep:${s.seq}`, 2) ? 1 : -1; s.data.from = a - side * B.arc * Math.PI / 360; s.data.to = a + side * B.arc * Math.PI / 360; s.data.aim2 = { x: Math.cos(s.data.from), y: Math.sin(s.data.from) }; s.tele = { type: "cone", aim: { x: s.data.aim.x, y: s.data.aim.y }, radius: B.reach, arc: B.arc }; },
  apatoSpires(e, s, w) { s.windupTotal = s.t; e.apatoPose = "spireStamp"; s.tele = null; s.data.marks = spireMarks(e, s, w); },
  apatoHands(e, s) { s.windupTotal = s.t; e.apatoPose = "handsCall"; s.tele = null; },
  apatoLeaves(e, s) { s.windupTotal = s.t; e.apatoPose = "leafReady"; s.tele = null; s.data.n = 0; s.data.next = 0; },
  apatoStomp(e, s) { s.windupTotal = s.t; e.apatoPose = "stomp"; s.tele = null; s.data.n = 0; s.data.next = APATO.stomp.every; },
  apatoWrap(e, s) { const at = s.data.target; s.windupTotal = s.t; s.data.mark = { x: at.x, y: at.y }; s.data.stage = "track"; s.tele = { type: "circle", x: at.x, y: at.y, radius: APATO.wrap.radius }; e.apatoPose = "wrapTrack"; },
  apatoCloneSlam(e, s) { const A = APATO_CLONE.slam; s.data.mark = { x: 0, y: 0 }; slamPoint(e, s.data.target, A.reach, s.data.mark); s.tele = { type: "circle", x: s.data.mark.x, y: s.data.mark.y, radius: A.radius }; e.apatoPose = "slamRaise"; },
  apatoCloneTail(e, s) { s.tele = { type: "arc", aim: { x: -s.data.aim.x, y: -s.data.aim.y }, radius: K.bodyRadius(e) + APATO_CLONE.tail.reach, arc: APATO_CLONE.tail.arc }; e.apatoPose = "tailReady"; },
  apatoCloneThorn(e, s) { s.tele = null; e.apatoPose = "leafReady"; },
  apatoCloneCoil(e, s) { s.tele = { type: "lane", aim: { x: s.data.aim.x, y: s.data.aim.y }, length: K.bodyRadius(e) + APATO_CLONE.coil.reach, width: APATO_CLONE.coil.radius * 1.2 }; e.apatoPose = "lashReady"; },
};
function slamPoint(e, t, reach, out) { const max = K.bodyRadius(e) + reach, dx = t.x - e.x, dy = t.y - e.y, m = hyp(dx, dy); if (m <= max) { out.x = t.x; out.y = t.y; } else { out.x = e.x + dx / m * max; out.y = e.y + dy / m * max; } return out; }
function seedMarks(e, s) {
  const S = APATO.seeds, t = s.data.target, out = [{ x: t.x, y: t.y }];
  for (let i = 1; i < S.count; i++) { const k = `${e.id}:seed:${s.seq}:${i}`, a = frac(k) * TAU, nearYou = i % 2 === 1, [lo, hi] = nearYou ? S.near : S.far, r = lo + (hi - lo) * frac(`${k}:r`), c = nearYou ? t : e; out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }); }
  return out;
}
function spireMarks(e, s, w) {
  const S = APATO.spires, t = s.data.target, out = [{ x: t.x, y: t.y }];
  for (let i = 1; i < S.count; i++) { const k = `${e.id}:spire:${s.seq}:${i}`, a = frac(k) * TAU, r = S.ring[0] + (S.ring[1] - S.ring[0]) * frac(`${k}:r`), x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r; if (open(w, x, y)) out.push({ x, y }); }
  return out;
}
export const APATO_RUN = {
  apatoNeckSlam(e, s, w) {
    const A = APATO.slam, d = s.data;
    if (s.phase === "windup") { const q = quarry(w, s); if (s.t > A.lockAt) { const k = Math.min(1, w.dt * A.follow); P0.x = d.mark.x + (q.x - d.mark.x) * k; P0.y = d.mark.y + (q.y - d.mark.y) * k; slamPoint(e, P0, A.reach, d.mark); } else s.tele.locked = true;
      s.tele.x = d.mark.x; s.tele.y = d.mark.y; face(e, d.mark.x - e.x, d.mark.y - e.y); e.apatoNeckLift = Math.min(1, 1 - s.t / windupOf(s, "apatoNeckSlam") * .2); e.apatoNeckReach = .2;
      if (s.t <= 0) { e.apatoPose = "slam"; e.apatoNeckLift = -1; e.apatoNeckReach = 1; s.tele = null; const m = d.mark;
        strike(e, s, w, "apatoNeckSlam", m.x, m.y, A.radius + .2);
        wave(e, w, m.x, m.y, A.ring, .5, dmg(e, "apatoNeckSlam", A.ringShare), d.prey); K.cue(w, e, "land", "apatoNeckSlam", m); K.toPhase(s, "active", APATO_ATTACKS.apatoNeckSlam.active); }
      return; }
    if (s.phase === "active" && s.t <= 0) K.toPhase(s, "recover", APATO_ATTACKS.apatoNeckSlam.recover);
    if (s.phase === "recover") { e.apatoNeckLift = -1 + Math.min(1, (APATO_ATTACKS.apatoNeckSlam.recover - s.t) * 1.5); e.apatoNeckReach = Math.max(0, s.t); }
  },
  apatoLash(e, s, w) {
    const A = APATO.lash, d = s.data, L = lashRec(e), step = A.reach / A.segs;
    if (s.phase === "windup") { const q = quarry(w, s); face(e, q.x - e.x, q.y - e.y); e.apatoNeckLift = .4; e.apatoNeckReach = -.3;
      if (s.t <= 0) { neckBase(e, P0); L.on = true; L.n = 1; L.xs[0] = P0.x; L.ys[0] = P0.y; headAt(e, P1); L.xs[1] = P1.x; L.ys[1] = P1.y; const h = heading(e); d.hx = h.x; d.hy = h.y; d.trail = 0; d.hit = false; d.back = 0; e.apatoPose = "lash"; K.toPhase(s, "active", APATO_ATTACKS.apatoLash.active); K.cue(w, e, "swing", "apatoLash"); }
      return; }
    if (s.phase === "active") {
      neckBase(e, P0); L.xs[0] = P0.x; L.ys[0] = P0.y;
      if (!d.back) {
        const q = quarry(w, s), hx = L.xs[L.n], hy = L.ys[L.n], cur = Math.atan2(d.hy, d.hx), wob = Math.sin((APATO_ATTACKS.apatoLash.active - s.t) * 9) * A.sway, diff = wrapAngle(Math.atan2(q.y - hy, q.x - hx) - cur), a = cur + Math.max(-A.turn * w.dt, Math.min(A.turn * w.dt, diff)) + wob * w.dt * 3;
        d.hx = Math.cos(a); d.hy = Math.sin(a); const nx = hx + d.hx * A.speed * w.dt, ny = hy + d.hy * A.speed * w.dt;
        const blocked = w.tileOpen && !w.tileOpen(nx + .5, ny + .5);
        if (!blocked) { L.xs[L.n] = nx; L.ys[L.n] = ny; d.trail += A.speed * w.dt; if (d.trail >= step && L.n < A.segs) { d.trail -= step; L.n++; L.xs[L.n] = nx; L.ys[L.n] = ny; } }
        if (!d.hit && strike(e, s, w, "apatoLash", L.xs[L.n], L.ys[L.n], A.radius + .25)) d.hit = true;
        if (d.hit || blocked || L.n >= A.segs || s.t <= A.back) { d.back = A.back; e.apatoPose = "lashBack"; }
      } else {
        // drawn back along its own path, head first
        d.back -= w.dt; const keep = Math.max(1, Math.round(L.n * Math.max(0, d.back) / A.back)); L.n = Math.min(L.n, keep);
        if (d.back <= 0) { L.on = false; L.n = 0; K.toPhase(s, "recover", APATO_ATTACKS.apatoLash.recover); }
      }
      return;
    }
    L.on = false; e.apatoNeckReach = 0; e.apatoNeckLift = 0;
  },
  apatoHydra(e, s, w) {
    const H = APATO.hydra, d = s.data;
    if (s.phase === "windup") { e.apatoNeckLift = .6; if (s.t > 0) return;
      const F = apatoPools(e), seq = s.seq; let made = 0;
      for (let i = 0; i < H.roots; i++) { const r = take(F.roots); if (!r) break; const a = frac(`${e.id}:hydra:${seq}`) * TAU + i * TAU / H.roots, br = K.bodyRadius(e) * .6;
        r.on = true; r.bx = e.x + Math.cos(a) * br; r.by = e.y + Math.sin(a) * br; r.x = e.x + Math.cos(a) * (br + H.spread); r.y = e.y + Math.sin(a) * (br + H.spread); r.hx = Math.cos(a); r.hy = Math.sin(a); r.t = 0; r.life = H.life; r.next = H.rise; r.prey = d.prey || null; made++; }
      s.tele = null; d.made = made; K.cue(w, e, "launch", "apatoHydra"); K.toPhase(s, "active", APATO_ATTACKS.apatoHydra.active); return; }
    if (s.phase === "active") { // the true neck draws back while it walks on
      e.apatoNeckLift = .2; e.apatoNeckReach = -.4; const q = quarry(w, s), dx = q.x - e.x, dy = q.y - e.y, m = hyp(dx, dy) || 1, sp = .82 * H.walk * (e.speedMultiplier || 1) * w.dt;
      turnToward(e, q.x, q.y, APATO.turn, w.dt); if (m > K.bodyRadius(e) + 1.5) w.move(e, dx / m * sp, dy / m * sp);
      if (s.t <= 0) K.toPhase(s, "recover", APATO_ATTACKS.apatoHydra.recover); }
  },
  apatoSeeds(e, s, w) {
    const S = APATO.seeds, d = s.data;
    if (s.phase === "windup") { if (s.t > 0) return; const F = apatoPools(e), n = dmg(e, "apatoSeeds");
      for (let i = 0; i < d.marks.length; i++) { const q = take(F.seeds); if (!q) break; q.on = true; q.fx = e.x; q.fy = e.y; q.tx = d.marks[i].x; q.ty = d.marks[i].y; q.t = 0; q.total = S.flight; q.delay = i * S.stagger; q.dmg = n; }
      e.apatoPose = "seedStamp"; K.cue(w, e, "land", "apatoSeeds", e); K.toPhase(s, "active", APATO_ATTACKS.apatoSeeds.active); return; }
    if (s.phase === "active" && s.t <= 0) { e.apatoPose = null; K.toPhase(s, "recover", APATO_ATTACKS.apatoSeeds.recover); }
  },
  apatoBeam(e, s, w) { beamRun(e, s, w, "apatoBeam"); },
  apatoBeamSweep(e, s, w) { beamRun(e, s, w, "apatoBeamSweep"); },
  apatoSpires(e, s, w) {
    const S = APATO.spires, d = s.data;
    if (s.phase === "windup") { if (s.t > 0) return; const F = apatoPools(e), n = dmg(e, "apatoSpires");
      for (let i = 0; i < d.marks.length; i++) { const q = take(F.spires); if (!q) break; q.on = true; q.x = d.marks[i].x; q.y = d.marks[i].y; q.t = 0; q.warn = S.warn + i * S.stagger; q.up = S.up; q.hit = false; q.dmg = n; q.prey = i === 0 ? d.prey || null : null; }
      K.cue(w, e, "land", "apatoSpireStamp", e); K.toPhase(s, "active", APATO_ATTACKS.apatoSpires.active); return; }
    if (s.phase === "active" && s.t <= 0) { e.apatoPose = null; K.toPhase(s, "recover", APATO_ATTACKS.apatoSpires.recover); }
  },
  apatoHands(e, s, w) {
    const Hd = APATO.hands, d = s.data;
    if (s.phase === "windup") { if (s.t > 0) return; const F = apatoPools(e), t = quarry(w, s);
      for (let i = 0; i < Hd.count; i++) { const k = `${e.id}:hand:${s.seq}:${i}`, a = frac(k) * TAU + i * TAU / Hd.count, r = Hd.ring[0] + (Hd.ring[1] - Hd.ring[0]) * frac(`${k}:r`), x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r;
        if (!open(w, x, y)) continue; const q = take(F.hands); if (!q) break; q.on = true; q.x = x; q.y = y; q.t = 0; q.life = Hd.life; q.throws = Hd.throws; q.next = Hd.rise + i * .2; q.prey = d.prey || null; }
      K.cue(w, e, "launch", "apatoHands"); K.toPhase(s, "active", APATO_ATTACKS.apatoHands.active); return; }
    if (s.phase === "active" && s.t <= 0) { e.apatoPose = null; K.toPhase(s, "recover", APATO_ATTACKS.apatoHands.recover); }
  },
  apatoLeaves(e, s, w) {
    const L = APATO.leaves, d = s.data;
    if (s.phase === "windup") { const q = quarry(w, s); face(e, q.x - e.x, q.y - e.y); if (s.t > 0) return; e.apatoPose = "leaf"; K.toPhase(s, "active", APATO_ATTACKS.apatoLeaves.active); return; }
    if (s.phase === "active") { d.next -= w.dt;
      if (d.next <= 0 && d.n < L.volleys) { d.n++; d.next = L.every; const q = quarry(w, s), F = apatoPools(e); headAt(e, P0); const base = Math.atan2(q.y - P0.y, q.x - P0.x), n = dmg(e, "apatoLeaves"), off = (d.n % 2 ? .5 : 0);
        for (let i = 0; i < L.fan; i++) { const f = take(F.leaves); if (!f) break; const a = base + ((i + off) / Math.max(1, L.fan - 1) - .5 - off / Math.max(1, L.fan - 1) * .5) * L.spread * Math.PI / 180;
          f.on = true; f.x = P0.x; f.y = P0.y; f.vx = Math.cos(a) * L.speed; f.vy = Math.sin(a) * L.speed; f.left = L.life; f.dmg = n; f.spin = 0; f.prey = d.prey || null; }
        K.cue(w, e, "swing", "apatoLeaves"); }
      if (s.t <= 0) { e.apatoPose = null; K.toPhase(s, "recover", APATO_ATTACKS.apatoLeaves.recover); } }
  },
  apatoStomp(e, s, w) {
    const S = APATO.stomp, d = s.data;
    if (s.phase === "windup") { if (s.t <= 0) K.toPhase(s, "active", APATO_ATTACKS.apatoStomp.active); return; }
    if (s.phase !== "active") return;
    const q = quarry(w, s); turnToward(e, q.x, q.y, S.turn, w.dt);
    const h = heading(e), sp = .82 * S.speed * (e.speedMultiplier || 1) * w.dt, near = hyp(q.x - e.x, q.y - e.y) <= K.bodyRadius(e) + S.close * .6;
    if (!near && !w.move(e, h.x * sp, h.y * sp)) w.detour?.(e, sp);
    d.next -= w.dt; e.apatoStepLift = d.n < S.steps ? Math.max(0, Math.min(1, d.next / S.every)) : 0; // the forefoot rising for its next footfall (the art)
    if (d.next <= 0 && d.n < S.steps) { d.n++; d.next = S.every; e.apatoStep = d.n % 4; const side = d.n % 2 ? 1 : -1, r = K.bodyRadius(e) * .5, fx = e.x + h.x * r * (d.n % 4 < 2 ? .6 : -.6) - h.y * r * side, fy = e.y + h.y * r * (d.n % 4 < 2 ? .6 : -.6) + h.x * r * side;
      wave(e, w, fx, fy, S.wave, S.waveTime, dmg(e, "apatoStomp", S.waveShare), d.prey); K.cue(w, e, "land", "apatoStep", { x: fx, y: fy }); }
    if (d.n >= S.steps && d.next <= .2 && !d.slammed) { d.slammed = true; const at = { x: e.x + h.x * (K.bodyRadius(e) + S.close * .5), y: e.y + h.y * (K.bodyRadius(e) + S.close * .5) };
      if (hyp(q.x - e.x, q.y - e.y) <= K.bodyRadius(e) + S.close + 1) { strike(e, s, w, "apatoStomp", at.x, at.y, S.radius + .2); K.cue(w, e, "land", "apatoStomp", at); } }
    if (s.t <= 0) K.toPhase(s, "recover", APATO_ATTACKS.apatoStomp.recover);
  },
  apatoWrap(e, s, w) { wrapRun(e, s, w); },
  apatoCloneSlam(e, s, w) {
    const A = APATO_CLONE.slam, d = s.data;
    if (s.phase === "windup") { if (s.t > 0) return; e.apatoPose = "slam"; s.tele = null; const m = d.mark; if (hyp(w.player.x - m.x, w.player.y - m.y) <= A.radius + .2) w.hurt(e, dmg(e, "apatoCloneSlam"), { jumpable: false, source: "apatoCloneSlam" }); K.toPhase(s, "recover", APATO_ATTACKS.apatoCloneSlam.recover); }
  },
  apatoCloneTail(e, s, w) {
    const A = APATO_CLONE.tail, d = s.data;
    if (s.phase === "windup") { if (s.t > 0) return; e.apatoPose = "tail"; d.hit = false; K.toPhase(s, "active", APATO_ATTACKS.apatoCloneTail.active); return; }
    if (s.phase === "active") { if (!d.hit && K.inArc(e, w.player, s.tele.aim, K.bodyRadius(e) + A.reach, A.arc)) { d.hit = true; w.hurt(e, dmg(e, "apatoCloneTail"), { jumpable: false, source: "apatoCloneTail" }); }
      if (s.t <= 0) { s.tele = null; K.toPhase(s, "recover", APATO_ATTACKS.apatoCloneTail.recover); } }
  },
  apatoCloneThorn(e, s, w) {
    if (s.phase !== "windup" || s.t > 0) return;
    const owner = (w.enemies || []).find((q) => q.id === e.apatoCloneOf && !q.dead), T = APATO_CLONE.thorn, F = owner ? apatoPools(owner) : null, f = F && take(F.leaves);
    if (f) { const p = w.player, m = hyp(p.x - e.x, p.y - e.y) || 1; f.on = true; f.x = e.x; f.y = e.y; f.vx = (p.x - e.x) / m * T.speed; f.vy = (p.y - e.y) / m * T.speed; f.left = T.life; f.dmg = dmg(e, "apatoCloneThorn"); f.spin = 0; f.prey = null; f.thorn = true; }
    e.apatoPose = "leaf"; K.toPhase(s, "recover", APATO_ATTACKS.apatoCloneThorn.recover);
  },
  apatoCloneCoil(e, s, w) {
    const C = APATO_CLONE.coil, d = s.data;
    if (s.phase === "windup") { if (s.t > 0) return; d.fx = e.x; d.fy = e.y; d.left = C.dart; s.tele = null; e.apatoPose = "lash"; K.toPhase(s, "active", APATO_ATTACKS.apatoCloneCoil.active); return; }
    if (s.phase !== "active") return;
    d.left -= w.dt; e.apatoNeckReach = Math.min(1, 1 - Math.max(0, d.left) / C.dart);
    if (d.left > 0) return;
    const p = w.player, hx = e.x + d.aim.x * (K.bodyRadius(e) + C.reach), hy = e.y + d.aim.y * (K.bodyRadius(e) + C.reach);
    if (!d.done) { d.done = true; if (segDist(p.x, p.y, e.x, e.y, hx, hy) <= C.radius && (w.apatoLatch ? w.apatoLatch(e) : true)) { e.apatoLatched = true; e.apatoLatchT = 0; e.apatoChipT = 0; w.hurt(e, dmg(e, "apatoCloneCoil"), { jumpable: false, source: "apatoCloneCoil", piercing: true }); w.say?.(APATO.text.latched); K.cue(w, e, "grab", "apatoCloneCoil", p); } }
    K.toPhase(s, "recover", APATO_ATTACKS.apatoCloneCoil.recover); e.apatoNeckReach = 0;
  },
};
function beamRun(e, s, w, id) {
  const B = APATO.beam, d = s.data, Bm = beamRec(e), sweep = id === "apatoBeamSweep", A = APATO_ATTACKS[id];
  if (s.phase === "windup") {
    const total = windupOf(s, id); e.apatoGlow = Math.min(1, 1 - s.t / total); e.apatoNeckLift = .9; e.apatoPose = "beamLift";
    if (!sweep) { const q = quarry(w, s); headAt(e, P0); if (s.t > B.lockAt) { const want = Math.atan2(q.y - P0.y, q.x - P0.x), cur = Math.atan2(d.aim2.y, d.aim2.x), a = cur + wrapAngle(want - cur) * Math.min(1, w.dt * B.follow * 3); d.aim2.x = Math.cos(a); d.aim2.y = Math.sin(a); } else s.tele.locked = true; s.tele.length = K.rayLength(w, P0, d.aim2, B.reach); }
    face(e, d.aim2.x, d.aim2.y);
    if (s.t <= 0) { e.apatoPose = sweep ? "sweep" : "beam"; d.tick = 0; d.span = A.active; s.tele = null; K.cue(w, e, "roar", id); K.toPhase(s, "active", A.active); }
    return;
  }
  if (s.phase === "active") {
    if (sweep) { const k = Math.min(1, 1 - Math.max(0, s.t) / d.span), a = d.from + (d.to - d.from) * (.5 - .5 * Math.cos(Math.PI * k)); d.aim2.x = Math.cos(a); d.aim2.y = Math.sin(a); face(e, d.aim2.x, d.aim2.y); }
    headAt(e, P0); const len = K.rayLength(w, P0, d.aim2, B.reach);
    Bm.on = true; Bm.x = P0.x; Bm.y = P0.y; Bm.ax = d.aim2.x; Bm.ay = d.aim2.y; Bm.len = len; Bm.width = B.width; e.apatoGlow = 1;
    lightSaplings(e, w, P0.x, P0.y, d.aim2.x, d.aim2.y, len, B.width, w.dt);
    d.tick -= w.dt;
    if (d.tick <= 0) { d.tick = B.tick; const x1 = P0.x + d.aim2.x * len, y1 = P0.y + d.aim2.y * len; strike(e, s, w, id, P0.x, P0.y, B.width + .25, 1, true, x1, y1); }
    if (s.t <= 0) { Bm.on = false; e.apatoGlow = .4; e.apatoPose = null; K.toPhase(s, "recover", A.recover); }
    return;
  }
  Bm.on = false; e.apatoGlow = Math.max(0, (e.apatoGlow || 0) - w.dt * 1.5); e.apatoNeckLift = Math.max(0, e.apatoNeckLift - w.dt * 2);
}
function wrapRun(e, s, w) {
  const A = APATO_ATTACKS.apatoWrap, G = APATO.wrap, d = s.data, Wr = wrapRec(e), prey = preyOf(w, s), who = d.prey || "player";
  if (s.phase === "windup") {
    const q = quarry(w, s);
    if (s.t > G.lockAt) { const k = Math.min(1, w.dt * G.follow); P0.x = d.mark.x + (q.x - d.mark.x) * k; P0.y = d.mark.y + (q.y - d.mark.y) * k; slamPoint(e, P0, G.markMax, d.mark); } else s.tele.locked = true;
    s.tele.x = d.mark.x; s.tele.y = d.mark.y; face(e, d.mark.x - e.x, d.mark.y - e.y); e.apatoPose = "wrapTrack"; e.apatoNeckReach = -.3; e.apatoNeckLift = .5;
    Wr.on = true; Wr.who = who; Wr.phase = "track"; Wr.t = Math.max(0, Math.min(1, 1 - s.t / windupOf(s, "apatoWrap"))); Wr.x = d.mark.x; Wr.y = d.mark.y;
    if (s.t <= 0) { d.stage = "lunge"; d.left = G.lunge; e.apatoPose = "wrapLunge"; Wr.phase = "lunge"; Wr.t = 0; K.toPhase(s, "active", A.active); K.cue(w, e, "swing", "apatoWrap"); }
    return;
  }
  if (s.phase === "recover") { Wr.on = false; e.apatoNeckReach = 0; return; }
  if (s.phase !== "active") return;
  d.left -= w.dt;
  if (d.stage === "lunge") {
    Wr.t = Math.min(1, 1 - Math.max(0, d.left) / G.lunge); e.apatoNeckReach = Wr.t;
    if (d.left > 0) return;
    s.tele = null;
    const caught = d.prey ? !!prey && hyp(prey.x - d.mark.x, prey.y - d.mark.y) <= G.radius + K.bodyRadius(prey) * .6 && !apatoIgnores(prey)
      : hyp(w.player.x - d.mark.x, w.player.y - d.mark.y) <= G.radius && (!w.los || w.los(e, w.player)) && !!w.spinoHold?.(e, G.hold + G.slack);
    if (!caught) { Wr.on = false; e.apatoPose = null; K.toPhase(s, "recover", A.recover); return; }
    const hold = prey ? G.creatureHold : G.hold, sprays = prey ? G.creatureSprays : G.sprays;
    Object.assign(d, { stage: "hold", left: hold, hold, sprays, n: 0, next: hold / (sprays + 1) }); s.apatoHolding = who; e.apatoPose = "wrapHold"; Wr.phase = "hold"; Wr.t = 0;
    if (prey) { prey.apatoHeldBy = e.id; if (prey.pack?.attack) K.endAttack(prey, prey.pack); K.cue(w, e, "grab", "apatoWrap", prey, { victim: prey.kind }); }
    else { w.say?.(APATO.text.wrapped); K.cue(w, e, "grab", "apatoWrap", w.player); }
    return;
  }
  if (d.stage === "hold") {
    Wr.t = Math.max(0, Math.min(1, 1 - d.left / d.hold)); Wr.x = prey ? prey.x : w.player.x; Wr.y = prey ? prey.y : w.player.y;
    if (prey) { if (prey.dead) d.left = 0; } else if (!w.held?.(e)) d.left = 0;
    d.next -= w.dt;
    if (d.next <= 0 && d.n < d.sprays && d.left > 0) { d.n++; d.next = d.hold / (d.sprays + 1);
      if (prey) { K.woundRival(w, e, prey, Math.max(dmg(e, "apatoWrap", G.creatureShare), Math.ceil((Number(prey.maxHp) || 1) * APATO.duel.share)), .5); doseCreature(prey, G.creatureDose); K.cue(w, e, "hit", "apatoWrap", prey, { victim: prey.kind }); }
      else if (w.hurt(e, dmg(e, "apatoWrap", G.sprayShare), { jumpable: false, source: "apatoWrap", piercing: true, beam: true })) w.apatoPoison?.(G.dose, "wrap"); }
    if (d.left > 0) return;
    const h = heading(e);
    if (prey) { delete prey.apatoHeldBy; if (!prey.dead) { prey.apatoDazed = G.daze; K.setDown(w, prey, e); } }
    else if (w.held?.(e)) { w.release?.(e); w.throwPlayer?.(e, h, G.throw); w.hurt(e, dmg(e, "apatoWrap", G.throwShare), { jumpable: false, source: "apatoWrap", piercing: true, beam: true }); }
    s.apatoHolding = null; d.stage = "throw"; d.left = .35; e.apatoPose = "wrapThrow"; Wr.phase = "throw"; Wr.t = 0; K.cue(w, e, "land", "apatoWrapThrow", prey || w.player);
    return;
  }
  Wr.t = Math.min(1, 1 - Math.max(0, d.left) / .35);
  if (d.left <= 0 || s.t <= 0) { Wr.on = false; e.apatoPose = null; K.toPhase(s, "recover", A.recover); }
}
// Let go of whatever it holds (a move that ended early, its death, a reload).
export function apatoLetGo(e, s, w) {
  const held = s?.apatoHolding; if (s) s.apatoHolding = null; if (e.apatoWrap) e.apatoWrap.on = false; if (e.apatoLash) e.apatoLash.on = false; if (e.apatoBeam) e.apatoBeam.on = false;
  if (!held) return;
  if (held === "player") { w.release?.(e); return; }
  for (const q of w.enemies || []) if (q.id === held && q.apatoHeldBy === e.id) { delete q.apatoHeldBy; K.setDown(w, q, e); }
}

// ---------------------------------------------------------------- readiness
export function apatoCan(e, s, w, id) {
  if (e.kind === "apatoClone") { if (id === "apatoCloneCoil") return !e.apatoLatched && !((e.apatoCoilAgain || 0) > 0); return !e.apatoLatched; }
  const live = (k) => apatoLive(e, k), C = APATO.caps;
  if (id === "apatoHydra") return live("roots") === 0;
  if (id === "apatoHands") return live("hands") === 0;
  if (id === "apatoSpires") return live("spires") + APATO.spires.count <= C.spires;
  if (id === "apatoLeaves") return live("leaves") + APATO.leaves.fan <= C.leaves;
  if (id === "apatoSeeds") return apatoSaplings(e).length < C.saplings && live("seeds") === 0;
  // the beams nurture saplings: with saplings on the ground it favours them; with none, the plain beam only
  if (id === "apatoBeamSweep") return apatoSaplings(e).length > 0 && apatoClones(e, w) < C.clones;
  return true;
}

// ---------------------------------------------------------------- the duel and the afflicted foe
const rivalOk = (q, e) => !!q && q !== e && !q.dead && APATO.duel.kinds.includes(q.kind) && !q.retreating && !q.passingBeast && !q.fleeTo && !q.untargetable && !q.hidden && !q.illusion && !q.apatoHeldBy;
function rivalNear(e, w) { let best = null, bd = APATO.duel.sight; for (const q of w.enemies || []) { if (!rivalOk(q, e) && !(q?.apatoHeldBy === e.id)) continue; const dd = hyp(q.x - e.x, q.y - e.y); if (dd < bd) { bd = dd; best = q; } } return best; }
export const apatoRivalNear = rivalNear;
function rivalFocus(e, s, w, d) {
  const R = APATO.duel;
  s.apatoRefocus = (s.apatoRefocus ?? 0) - w.dt;
  if (s.apatoRefocus <= 0) {
    const near = rivalNear(e, w); s.apatoFocusN = (s.apatoFocusN || 0) + 1;
    const you = !!near && !K.duelWinner(e) && d <= R.close + K.bodyRadius(e) && hashK(`${e.id}:rival:${s.apatoFocusN}`, 100) < R.youChance;
    s.apatoRival = near && !you ? near.id : null; s.apatoRefocus = s.apatoRival ? R.refocus : R.refocusYou;
  }
  if (!s.apatoRival) return null;
  for (const q of w.enemies || []) if (q.id === s.apatoRival && (rivalOk(q, e) || q.apatoHeldBy === e.id)) return q;
  s.apatoRival = null; return null;
}
function rivalStep(e, s, w, rival) {
  const R = APATO.duel, fd = hyp(rival.x - e.x, rival.y - e.y);
  if (s.gap <= 0 && !(R.wait && K.blowComing(rival, e)) && !rival.apatoHeldBy) {
    let pick = null, n = 0;
    for (const id of R.moves) { const A = APATO_ATTACKS[id]; if (!(e.packAttacks || []).includes(id) || (s.cd[id] || 0) > 0 || fd < A.range[0] || fd > A.range[1] + K.bodyRadius(e) + K.duelReach) continue; if (!apatoCan(e, s, w, id)) continue; n++; if (hashK(`${e.id}:rival-pick:${s.seq}:${id}`, n) === 0) pick = id; }
    if (pick) { s.state = "attack"; s.last = pick; K.beginAttack(e, s, pick, w, rival); return true; }
  }
  const want = K.bodyRadius(e) + K.bodyRadius(rival) + R.gap + K.duelGap, step = .82 * R.speed * (e.speedMultiplier || 1) * w.dt, dx = rival.x - e.x, dy = rival.y - e.y, m = fd || 1;
  if (fd > want) w.move(e, dx / m * step, dy / m * step); else if (fd < want - K.duelSlack) w.move(e, -dx / m * step, -dy / m * step);
  return true;
}
// A duel foe this frame: wrapped in its neck (it does nothing, its body held where the coil is), or dazed after (it reels). Its venom
// runs either way (as a wound with no source, under the duel's floors). True when its frame is spent.
export function apatoAfflicted(e, s, w) {
  const dt = w.dt;
  if (e.apatoVenom > 0) { const n = tickCreatureVenom(e, dt); if (n > 0) K.woundRival(w, null, e, n); if (e.dead) return true; }
  if (e.apatoHeldBy) {
    let h = null; for (const q of w.enemies || []) if (q.id === e.apatoHeldBy) { h = q; break; }
    if (h && !h.dead && h.pack?.apatoHolding === e.id) { if (s?.attack) K.endAttack(e, s); const Wr = h.apatoWrap; if (Wr?.on) { /* drawn where the coil holds it */ } return true; }
    delete e.apatoHeldBy; K.setDown(w, e, h);
  }
  if (e.apatoDazed > 0) { e.apatoDazed = Math.max(0, e.apatoDazed - dt); if (s?.attack) K.endAttack(e, s); return e.apatoDazed > 0; }
  return false;
}

// ---------------------------------------------------------------- every fighting frame, before the shared brain
export function apatoTick(e, s, w, p, d) {
  const dt = w.dt;
  if (!e.apatoHeading) face(e, p.x - e.x, p.y - e.y);
  if (s.apatoHolding && s.attack !== "apatoWrap") apatoLetGo(e, s, w);
  if (s.attack !== "apatoLash" && e.apatoLash?.on) e.apatoLash.on = false;
  if (!s.attack?.startsWith?.("apatoBeam") && e.apatoBeam?.on) e.apatoBeam.on = false;
  if (!s.attack?.startsWith?.("apatoBeam")) e.apatoGlow = Math.max(0, (e.apatoGlow || 0) - dt * 1.5);
  if (!s.attack) { e.apatoNeckLift *= Math.max(0, 1 - dt * 4); e.apatoNeckReach *= Math.max(0, 1 - dt * 4); }
  if (K.feeds(e, s, w)) { e.apatoPose = e.dinoFeed > 0 ? "feed" : null; return e.dinoFeed > 0; }
  if (s.attack || s.broken > 0 || e.hitStun > 0 || s.evade) return false;
  if (e.apatoPose === "graze" || e.apatoPose === "feed" || e.apatoPose === "stagger") e.apatoPose = null;
  const rival = rivalFocus(e, s, w, d), at = rival || p;
  turnToward(e, at.x, at.y, APATO.turn, dt);
  if (rival) return rivalStep(e, s, w, rival);
  return false;
}
// Out of the fight it grazes now and then.
export function apatoIdle(e, s, w) {
  const G = APATO.graze; s.apatoIdleT = ((s.apatoIdleT ?? frac(`${e.id}:graze`) * G.every) + w.dt) % G.every;
  if (s.apatoIdleT < G.time) { e.apatoPose = "graze"; e.apatoNeckLift = -.8; return true; }
  if (e.apatoPose === "graze") e.apatoPose = null; e.apatoNeckLift = 0; return false;
}

// ---------------------------------------------------------------- the clones
// Every frame of a clone, before the shared brain: its life runs out, it dies with its maker, and a latched clone pulls itself to
// the Wayfarer and holds on, dosing venom (stacked by time held and by how many hold). True when the frame is spent.
export function apatoCloneTick(e, s, w) {
  const C = APATO_CLONE, dt = w.dt, owner = (w.enemies || []).find((q) => q.id === e.apatoCloneOf);
  e.apatoCloneLife = (Number.isFinite(e.apatoCloneLife) ? e.apatoCloneLife : C.life) - dt;
  if (!owner || owner.dead || e.apatoCloneLife <= 0) { e.hp = 0; e.dead = true; e.noRewards = true; e.rewarded = true; e.apatoLatched = false; return true; }
  e.apatoCoilAgain = Math.max(0, (Number(e.apatoCoilAgain) || 0) - dt);
  if (!e.apatoLatched) return false;
  if (s.attack) K.endAttack(e, s);
  const p = w.player, K2 = C.coil; e.apatoLatchT = (Number(e.apatoLatchT) || 0) + dt; e.apatoPose = "coil";
  // it pulls itself in, round the Wayfarer (each clone on its own side)
  const idx = Number(String(e.id).split(":tree:")[1]) || 0, a = idx * 2.1, want = K.bodyRadius(e) * .5 + K2.close, tx = p.x + Math.cos(a) * want, ty = p.y + Math.sin(a) * want, gx = tx - e.x, gy = ty - e.y, gm = hyp(gx, gy);
  if (gm > .05) { const st = Math.min(gm, K2.pull * dt); if (!w.move(e, gx / gm * st, gy / gm * st)) { e.x += gx / gm * st; e.y += gy / gm * st; } }
  face(e, p.x - e.x, p.y - e.y); const at = e.apatoCoilAt && typeof e.apatoCoilAt === "object" ? e.apatoCoilAt : (e.apatoCoilAt = { x: 0, y: 0 }); at.x = p.x; at.y = p.y; // the art's coils
  // venom: stacked by time held and by the others holding on
  let others = 0; for (const q of w.enemies || []) if (q !== e && q.apatoCloneOf === e.apatoCloneOf && q.apatoLatched && !q.dead) others++;
  w.apatoPoison?.(K2.dose * (1 + K2.ramp * e.apatoLatchT) * (1 + K2.crowd * others) * dt, "clone");
  e.apatoChipT = (Number(e.apatoChipT) || 0) + dt; if (e.apatoChipT >= K2.chipEvery) { e.apatoChipT = 0; w.hurt(e, dmg(e, "apatoCloneCoil", K2.chip), { jumpable: false, source: "apatoCloneCoil", piercing: true, beam: true }); }
  if (e.apatoLatchT >= K2.max) apatoUnlatch(e, w, false);
  return true;
}
// A clone lets go: `flung` (broken free) stuns it and keeps it from coiling again for a while.
export function apatoUnlatch(e, w, flung = true) {
  if (!e.apatoLatched) return false;
  const C = APATO_CLONE.coil; e.apatoLatched = false; e.apatoLatchT = 0; e.apatoPose = null; e.apatoCoilAgain = C.again;
  if (flung) { e.hitStun = Math.max(e.hitStun || 0, C.stun); const p = w.player, dx = e.x - p.x, dy = e.y - p.y, m = hyp(dx, dy) || 1; w.move(e, dx / m * 1.2, dy / m * 1.2); }
  return true;
}
// The Wayfarer's struggle (game.ts calls it): the latched clones of any maker, the presses a break needs, and the break itself.
export function apatoLatchedClones(enemies, out = null) { let n = 0; for (const q of enemies || []) if (q.apatoLatched && !q.dead && q.kind === "apatoClone") { if (out) out.push(q); n++; } return n; }
export const apatoMashNeed = (n) => n > 0 ? APATO_CLONE.coil.mash + APATO_CLONE.coil.mashPer * (n - 1) : 0;
export function apatoBreakFree(enemies, w) { let n = 0; for (const q of enemies || []) if (q.apatoLatched && !q.dead && q.kind === "apatoClone" && apatoUnlatch(q, w, true)) n++; return n; }

// ---------------------------------------------------------------- big rooms
// The spawn a floor holds, or null. `kind`: "building" or "pentagon"; `taken`: a stego or a Spinosaurus already holds its big room.
export function apatoRoomSpawn(seed, id, map, kind, V = APATO_ROOMS.version, taken = false) {
  if (!(V >= 1) || taken || !stegoRoomGround(kind, map)) return null;
  if ((hashSeed(`${seed}:earth-apato-room:v${V}:${id}`) % 1000) / 1000 >= APATO_ROOMS.chance) return null;
  const sq = stegoRoomSquare(map); if (!sq || sq.side < APATO_ROOMS.side) return null;
  return { id: `${id}:earth-apato`, kind: "earthApato", x: sq.x, y: sq.y, boss: false, apatoRoom: true };
}
