// The Quandrix Staff (Tim, 2026-11-13): a magic primary weapon that scales with Focus (items.ts WEAPON_SCALING, read through
// game.ts weaponBonus as every primary is). Its numbers and rules live here; the item's identity (name, milestone, loot stream)
// is items.ts QUANDRIX_STAFF; game.ts supplies the hooks (quandrixPower, quandrixBlow, quandrixOpen, quandrixDrag,
// quandrixAim, quandrixCastVisual) and calls quandrixPress from primaryAttack and tickQuandrix every frame.
//
// - Tap: a spectral hand (an open palm, fingers splayed) drifts forward `hand.speed` tiles/s for `hand.life` s. It
//   passes through foes, striking each it touches for `hand.share` of the staff's power, again every `hand.rehit` s while it
//   is still inside that foe (a per-foe interval, so a big body takes more blows than a small one). It dissipates on a wall
//   or a blocked tile. At most `hand.maxLive` hands are out; a new one past that takes the oldest's place.
// - Mage's Hand (a selectable Lattice passive, lattice-fields.ts TOOL_FORMS["mages-hand"]; nothing with another weapon):
//   holding Attack past `hold.grace` s clenches the hand cast before this press's (see "The penultimate hand") into a fist. The fist grabs every foe it
//   touches (at most `fist.maxGrab`) and drags them toward the Wayfarer; after `fist.time` s it bursts wherever it is (far away,
//   it never got home). The burst strikes everything within `fist.burst.radius`. Letting go early (Tim, 2026-11-14) no longer
//   ends it: see "Let go" below.
// - Awakened (constellation.ts awaken; this replaces the crescent for the staff): holding Attack slams the hand cast before
//   this press's down where it is. While held it strikes everything under it every `slam.tick` s. A ring round the Wayfarer fills toward the
//   perfect window (`slam.perfect`, s after the slam); letting go inside it bursts at once for the strongest burst, and holding
//   to `slam.max` overcharges it and it bursts on its own for less than a perfect release.
//   The slam yanks (Tim, 2026-11-26): as it lands it hauls the unanchored foes about it in hard (`slam.yank`) and holds them
//   under it; its blows build Encumbered as a pull's do. And every other hand out is recalled (`recall`): each flies to the
//   locked or auto-aimed foe (none: the held hand) and claps there, once, and is gone; the suction cup recalls them too.
// - Awakened with Mage's Hand: the slammed hand becomes a suction cup: it pulls foes within `suction.radius` into itself (at
//   most `suction.maxPull`) while it is reeled back toward the Wayfarer, then bursts by the same release rules.
// - Let go (Tim, 2026-11-14: "if you let go of the charge, the slam will just stay there, and then it'll explode once its timer
//   is up"): letting go of Attack before the charge is done (any time for the fist; outside the gold window for the slam and
//   the suction cup) leaves the hand live (`hold.released`). It goes on exactly as while held (the fist grabs, drags and is
//   reeled home, the slam ticks, the suction cup pulls and is reeled home) on the same charge clock, and when that clock runs
//   out (`fist.time`, `slam.max`) it bursts where it is, home or not, for the full charge's burst (`fist.burst.share`,
//   `slam.burst.released`). The Wayfarer is free at once: a press while it lingers casts an ordinary hand (never a second
//   hold; `release.tapWhileLive`), and a knock-down no longer drops a hand already let go.
// - The penultimate hand (Tim, 2026-11-25): every press throws its own hand, held or not, and a hold takes the hand cast just
//   before it (the penultimate cast): tap then hold throws hand 2 and slams hand 1; tap, tap, hold throws hand 3 and slams
//   hand 2. A hold with no earlier hand out (the first press, or the earlier hand gone) makes its hold right at the Wayfarer's
//   feet (`hold.feet`). The hold's hand is never echoed or cloned and costs no cadence.
// - Bosses, world beasts, elites and the other anchored foes (`anchored`) are never grabbed, dragged or pulled (as the
//   Gravity Well's boss rule holds them); they still take every blow and the burst.
// - Echo glyphs and the Shadow Clone (Tim, 2026-11-13: yes to both): an Echo in the weapon casts an echo hand from the
//   Wayfarer `delay` ms after each of the Wayfarer's own hands, at the Echo's share (glyphs.ts echoPlan, the swing's numbers);
//   the clone, while it is out, casts its own hand from where it stands at SHADOW_CLONE.share. These extra hands drift, strike
//   and dissipate by the same rules, drawn fainter, in their own small pool (`extra.maxLive`, the oldest giving way), so the
//   Wayfarer's five and their oldest-gives-way rule never change; a hold never takes one (latestHand reads only her own).
// - Bounded: hands, the hold and the burst flashes are fixed pools made once (game.quandrix), reused, never grown; nothing
//   is allocated per frame. Everything runs on frame time (dt), so pause and background stop it exactly. A reload drops the
//   drifting hands; the held or let-go hand is saved (playerRuntime.quandrixHold, `release.record`, savedQuandrixHold) and
//   resumes as let go (the button is up after a reload), on its charge clock, with the foes it holds, and bursts on time.
import { unharmablePerson } from "./townsfolk.js?v=r1086-7fef40ac130c"; // Tim (2026-11-20): no non-hostile person can be harmed
// combat.ts enemyBodyRadius, restated so this module stays a leaf (lattice-fields.ts reads its numbers).
const enemyBodyRadius = (e) => Math.max(.28, Number(e?.bodyRadius) || .38);

export const QUANDRIX = Object.freeze({
  passive: "mages-hand", // lattice-fields.ts TOOL_FORMS key
  damageType: "magic", // every blow (hands, ticks, bursts) is magic: never scattered as plain steel is
  // `share` (Tim, 2026-11-25: "I just wasn't doing enough damage" with a Focus build against world bosses ~200 sections out): .32
  // before. Measured on the real Game at matched gear (tests/focus-damage.test.ts), the staff's hands dealt .67 to .83 of the
  // Verge Cleaver's damage per second at the same weapon bonus (the share varies with the beast's body); at .4, about .84 to 1.04.
  // .36 with the faster hands (release 1070), .4 again with the old hands (2026-11-26: .94 to 1.10 of the Cleaver), then .33, then .355
  // (Tim, 2026-11-26: tap spam sits "behind the Might build"; Focus builds have spells to make up the difference); .33 measured .79 to .92, too low (Tim: "eighty percent is too low"); .355 measures .84 to .98.
  // `speed`, `life`, `rehit` (Tim, 2026-11-26: back to the values before release 1070, which flew them at 3.025 tiles/s for
  // 1.6 s, rehit .218): the reach (speed x life, items.ts PRIMARY_PROFILES 4.84) and the blows per tile (speed x rehit .66)
  // are the same either way. `step`: the most a hand moves between wall and body checks (no tunnelling on a long frame).
  hand: Object.freeze({ cadenceMs: 420, speed: 2.2, life: 2.2, radius: .35, rehit: .3, share: .355, maxLive: 5, lift: .45, stun: .08, step: .2 }),
  hold: Object.freeze({ grace: .2, feet: 0 }), // `feet`: how far ahead of the Wayfarer's centre a hold with no earlier hand is made (tiles)
  // Let go before the charge is done (Tim, 2026-11-14): the hand lingers, keeps working and bursts when its clock runs out.
  // `tapWhileLive`: while one lingers a held press is a plain hand (one hold at a time). `record`: its saved shape's version.
  release: Object.freeze({ tapWhileLive: true, record: 1 }),
  fist: Object.freeze({ time: 1.4, speed: 2, arrive: 1, grab: .35, maxGrab: 4, pull: 9, hug: .3, slip: 2.5,
    burst: Object.freeze({ radius: 1.6, share: 2.2, stun: .5 }) }),
  slam: Object.freeze({ tick: .25, radius: 1.4, tickShare: .22, perfect: Object.freeze([1, 1.3]), max: 2, stun: .1,
    burst: Object.freeze({ radius: 1.8, early: Object.freeze([.8, 1.4]), perfect: 2.6, late: 1.4, overcharge: 1.6, stun: .6,
      released: 1.6 }),
    // The yank (Tim, 2026-11-26: "a strong yank of nearby enemies toward the slam point"): for the first `window` s of the
    // slam (its charge clock) every unanchored foe within `radius` of it (at most `maxPull`) is caught and hauled in at `pull`
    // tiles/s to `hug` from its centre, then held there while the slam lives, as the suction cup holds. The slam's ticks and
    // burst then count as a pull's damage (Encumbered's build-up), as the Mage's Hand's fist and suction cup do.
    yank: Object.freeze({ radius: 3.6, pull: 14, window: .35, maxPull: 6, hug: .35 }) }), // `released`: a slam let go outside the gold window bursts at `max` for this (the full charge's, as an overcharge)
  suction: Object.freeze({ radius: 3.2, pull: 3.2, maxPull: 6, reel: 2.6, arrive: 1, hug: .35 }),
  // The recall (Tim, 2026-11-26): awakened, the moment a hold begins (the slam or the suction cup) every other hand out, the
  // Wayfarer's and the echo and clone hands, at most `max`, turns and flies at `speed` tiles/s to the target (the lock, else
  // the foe auto aim picks within `reach` tiles; none: the held hand). A hand within `arrive` of the target's body claps: it
  // strikes everything within `radius` for `share` of its own power, stunning `stun` s, and is gone. One clap per hand, so
  // more hands out make more claps. Spectral, it passes walls on the way; past `maxTime` s it claps where it is.
  // `speed` 16 (was 9): Tim, 2026-11-26, the recalled hands "rush in" toward the enemy, about half a second from the edge of `reach`.
  recall: Object.freeze({ speed: 16, arrive: .15, radius: 1.1, share: .9, stun: .2, max: 8, maxTime: .8, reach: 8 }),
  // Foes that hold their ground (the Gravity Well's boss rule, widened to every heavy kind): never grabbed or pulled.
  anchored: Object.freeze(["boss", "worldBeast", "worldBoss", "farArrayBoss", "eliteId", "elite", "questingBeast", "stalker", "seaKind", "pentBoss", "domainBoss", "unique", "fracWarden", "kitRole"]),
  flash: Object.freeze({ max: 4, life: .4 }),
  extra: Object.freeze({ maxLive: 3, queue: 3, alpha: .55 }), // echo and clone hands: their own cap; Echo copies waiting to be cast
  // `staff`: the Standard View staff's drawn length unit (tiles), .95 before the Close View staff was cut to the hero's height
  // (2026-11-14: 1.79 to 1.68 recipe, the same 6% here).
  view: Object.freeze({ lift: .62, slamLift: .04, scale: 1, shadow: .3, ring: .62, drawn: 1.35, staff: .89 }),
  colors: Object.freeze({ glow: "#b896cf", core: "#efe4ff", deep: "#5b3f86", rune: "#c58cff", perfect: "#fff2a8", line: "#d9c4ff",
    staff: "#4a3a5c", wrap: "#5a4330", metal: "#c6a46f", emissive: 0xb896cf, emissiveCore: 0xc58cff, breath: "#9fd9e6" /* Gathered Breath's beads on the ring */ }),
  messages: Object.freeze({ recall: "The hands converge.", perfect: "A perfect release!", overcharge: "The hand overcharges and bursts.", grabbed: "The hand clenches.", released: "The hand you let go bursts." }),
});

// ---------------------------------------------------------------- pure rules
// The finishing burst's share of the staff's power for a slam (or suction) held `held` s and let go (or overcharged).
export function slamWindow(held) {
  const S = QUANDRIX.slam, h = Number(held) || 0;
  return h >= S.max ? "overcharge" : h < S.perfect[0] ? "early" : h <= S.perfect[1] ? "perfect" : "late";
}
export function slamBurstShare(held) {
  const B = QUANDRIX.slam.burst, S = QUANDRIX.slam, h = Math.max(0, Number(held) || 0), w = slamWindow(h);
  if (w === "early") return B.early[0] + (B.early[1] - B.early[0]) * Math.min(1, h / S.perfect[0]);
  return w === "perfect" ? B.perfect : w === "late" ? B.late : B.overcharge;
}
// How far round the ring is: 0 at the slam, 1 at `max` (the overcharge). The perfect window is [perfect[0], perfect[1]] / max.
export const slamFill = (held) => Math.max(0, Math.min(1, (Number(held) || 0) / QUANDRIX.slam.max));
export const staffAnchored = (e) => { if (!e) return true; for (const k of QUANDRIX.anchored) if (e[k]) return true; return false; };
const hittable = (e) => !!e && !e.dead && !e.untargetable && !e.hidden && !unharmablePerson(e) && Number(e.hp) > 0;
const touching = (e, x, y, r) => Math.hypot(e.x + .5 - x, e.y + .45 - y) < r + enemyBodyRadius(e);

// ---------------------------------------------------------------- runtime state (game.quandrix, never saved)
// `target`, `tx`, `ty`: a recalled hand's foe (its id, or null) and the point it last flew for (QUANDRIX.recall).
const newHand = () => ({ on: false, mode: "drift", seq: 0, x: 0, y: 0, dx: 1, dy: 0, age: 0, life: 0, power: 0, hits: {}, kind: "own", target: null, tx: 0, ty: 0 });
const GRAB_CAP = Math.max(QUANDRIX.fist.maxGrab, QUANDRIX.suction.maxPull, QUANDRIX.slam.yank.maxPull);
export function quandrixState(game) {
  return (game.quandrix ||= {
    seq: 0, where: "",
    hands: Array.from({ length: QUANDRIX.hand.maxLive }, newHand),
    press: { on: false, held: 0, action: "", dx: 1, dy: 0, tap: false, owed: 0, thrown: false, holding: false, prev: null, prevSeq: 0 }, // `tap`: let go before the hold began; `owed`: an earlier press's hand still to cast when this press came (at most one); `thrown`: this press's own hand is out; `prev`/`prevSeq`: the hand out before it (the one a hold takes)
    hold: { on: false, released: false, mode: "", hand: null, held: 0, tick: 0, power: 0, action: "", grab: Array.from({ length: GRAB_CAP }, () => ""), n: 0 },
    flashes: Array.from({ length: QUANDRIX.flash.max }, () => ({ life: 0, x: 0, y: 0, r: 0, kind: "" })),
    extras: Array.from({ length: QUANDRIX.extra.maxLive }, newHand), // echo and clone hands (never a hold's)
    queue: Array.from({ length: QUANDRIX.extra.queue }, () => ({ on: false, left: 0, dx: 1, dy: 0, power: 0 })), // Echo hands to come
  });
}
const clearHits = (h) => { for (const k in h.hits) delete h.hits[k]; };
function dropPress(P) { P.on = false; P.tap = false; P.owed = 0; P.thrown = false; P.holding = false; P.prev = null; P.prevSeq = 0; P.held = 0; }
function endHold(K) { const H = K.hold; H.on = false; H.released = false; H.mode = ""; H.hand = null; H.held = 0; H.tick = 0; H.n = 0; for (let i = 0; i < H.grab.length; i++) H.grab[i] = ""; }
// Drops every hand and any hold (an area change, the staff put away, a fall): nothing bursts.
export function clearQuandrix(game) {
  const K = game.quandrix; if (!K) return;
  for (const h of K.hands) { h.on = false; clearHits(h); }
  for (const h of K.extras) { h.on = false; clearHits(h); }
  for (const q of K.queue) q.on = false;
  dropPress(K.press); endHold(K);
  for (const f of K.flashes) f.life = 0;
}
export const liveHands = (game) => { let n = 0; for (const h of game.quandrix?.hands || []) if (h.on) n++; return n; };
export const liveExtras = (game, kind = null) => { let n = 0; for (const h of game.quandrix?.extras || []) if (h.on && (!kind || h.kind === kind)) n++; return n; };
// The most recently cast hand still drifting, or null.
export function latestHand(game) {
  let best = null; for (const h of game.quandrix?.hands || []) if (h.on && h.mode === "drift" && (!best || h.seq > best.seq)) best = h;
  return best;
}
function flash(K, x, y, r, kind) {
  let slot = K.flashes[0]; for (const f of K.flashes) { if (f.life <= 0) { slot = f; break; } if (f.life < slot.life) slot = f; }
  slot.life = QUANDRIX.flash.life; slot.x = x; slot.y = y; slot.r = r; slot.kind = kind;
}
const passiveOn = (game) => typeof game.quandrixMageHand === "function" ? !!game.quandrixMageHand() : false;
const awakenedOn = (game) => !!game.save?.equipment?.primary?.awakened;
// Which hold the staff makes: null (a plain staff holds nothing), "fist", "slam" or "suction".
export function holdMode(game) {
  const m = passiveOn(game), a = awakenedOn(game);
  return m && a ? "suction" : m ? "fist" : a ? "slam" : null;
}

// ---------------------------------------------------------------- casting
// The slot a new hand of the Wayfarer's takes: a free one, else the oldest drifting hand gives way, else the oldest recalled
// hand claps where it is now (its blow is never lost). The held hand never gives way. Null only if every slot is held.
function handSlot(game, now) {
  const K = game.quandrix; let slot = null, recalled = null;
  for (const h of K.hands) { if (!h.on) return h; if (h.mode === "drift" && (!slot || h.seq < slot.seq)) slot = h; if (h.mode === "recall" && (!recalled || h.seq < recalled.seq)) recalled = h; }
  if (slot || !recalled) return slot;
  clap(game, recalled, now); return recalled;
}
// One hand, toward (dx, dy). A free slot, else the oldest drifting hand gives way. Returns the hand, or null.
export function castHand(game, now, dx, dy) {
  const Q = QUANDRIX.hand, K = quandrixState(game), p = game.player;
  const slot = handSlot(game, now); if (!slot) return null;
  const m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, power = Number(game.quandrixPower()) || 0;
  slot.on = true; slot.mode = "drift"; slot.seq = ++K.seq; slot.x = p.x + .5 + ux * Q.lift; slot.y = p.y + .45 + uy * Q.lift; slot.dx = ux; slot.dy = uy;
  slot.age = 0; slot.life = Q.life; slot.power = power; clearHits(slot);
  p.attackReadyAt = now + Q.cadenceMs * (typeof game.quandrixCooldownScale === "function" ? game.quandrixCooldownScale() : 1);
  if (typeof game.quandrixCastVisual === "function") game.quandrixCastVisual(now, ux, uy);
  castCopies(game, now, ux, uy, power);
  return slot;
}
// An extra hand (an echo's or the clone's) from (x, y) toward (dx, dy) with `power` already its share. Its own pool: a free
// slot, else the oldest extra gives way. Never touches the Wayfarer's hands, her cooldown or her pose.
export function castExtra(game, x, y, dx, dy, power, kind) {
  const Q = QUANDRIX.hand, K = quandrixState(game);
  if (![x, y, dx, dy, power].every(Number.isFinite) || !(power > 0)) return null;
  let slot = null; for (const h of K.extras) { if (!h.on) { slot = h; break; } if (!slot || h.seq < slot.seq) slot = h; }
  if (slot.on && slot.mode === "recall") clap(game, slot, game.lastUpdateNow || 0); // a recalled extra giving way claps first
  const m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
  slot.on = true; slot.mode = "drift"; slot.kind = kind; slot.seq = ++K.seq; slot.x = x + ux * Q.lift; slot.y = y + uy * Q.lift; slot.dx = ux; slot.dy = uy;
  slot.age = 0; slot.life = Q.life; slot.power = power; clearHits(slot);
  return slot;
}
// The copies one of the Wayfarer's hands brings: the clone's hand now, and each Echo copy queued for its delay.
function castCopies(game, now, ux, uy, power) {
  const K = game.quandrix, c = typeof game.quandrixClone === "function" ? game.quandrixClone(now) : null;
  if (c) castExtra(game, c.x, c.y, c.aim?.x ?? ux, c.aim?.y ?? uy, power * c.share, "clone");
  const plan = typeof game.quandrixEchoPlan === "function" ? game.quandrixEchoPlan() : null;
  for (const copy of plan?.copies || []) {
    let slot = null; for (const q of K.queue) { if (!q.on) { slot = q; break; } if (!slot || q.left < slot.left) slot = q; } // full: the soonest gives way
    slot.on = true; slot.left = Math.max(0, Number(copy.delay) || 0) / 1000; slot.dx = ux; slot.dy = uy; slot.power = power * (Number(copy.share) || 0);
  }
}
// A press of Attack with the staff. Every press throws its own hand the moment the staff is ready; with a held button
// (`action`) and a hold to make, the press is kept: let go within `hold.grace` and it was a tap; hold on and the hold begins on
// the hand that was out before this press's own (the penultimate cast), or at the Wayfarer's feet when there was none.
// Reliable holds (Tim, 2026-11-25: "I hit it 3 times and then hold the last hit, and it won't make the hand slam down"): a
// button press that lands while the staff is between hands (`hand.cadenceMs`) is not dropped. It waits as the press and throws
// its hand the moment the staff is ready (a quick tap-tap-tap casts three); held past `hold.grace`, its hold begins at once
// (once an owed tap's hand is out) on the hand before its own, and its own hand follows when the staff is ready. A press that lands while a tap still waits for its hand takes over the press and the tap's hand stays owed
// (`owed`, at most one): it is cast first. A press with no button (a world tap) is still refused while the staff recovers.
export function quandrixPress(game, now, dir, action = null) {
  const K = quandrixState(game), p = game.player, P0 = K.press;
  if ((P0.on && !(P0.tap && action && !P0.thrown)) || (K.hold.on && !K.hold.released) || !(p.hp > 0)) return false;
  const owed = P0.on ? 1 : 0; // a tap still waiting: its hand is cast before this press's
  const early = now < (p.attackReadyAt || 0); if (early && !action) return false;
  const d = game.quandrixAim(dir); if (!K.hold.on) K.where = game.orreryWhere();
  const plain = !action || !holdMode(game) || (K.hold.on && QUANDRIX.release.tapWhileLive); // a hand let go still lingering: a plain hand
  if (!early && plain) return !!castHand(game, now, d.x, d.y);
  const P = K.press; dropPress(P); P.on = true; P.owed = owed; P.action = action; P.dx = d.x; P.dy = d.y;
  if (!early) throwOwn(game, now, P);
  return true;
}
// The press's own hand, noting the hand out before it (the one its hold would take).
function throwOwn(game, now, P) {
  const prev = latestHand(game); P.prev = prev; P.prevSeq = prev ? prev.seq : 0; P.thrown = true;
  castHand(game, now, P.dx, P.dy);
}
// A hand made for a hold with no earlier hand: at the Wayfarer's feet. No cadence, no Echo or clone copy, no cast pose.
function feetHand(game, now, dx, dy) {
  const K = game.quandrix, p = game.player, slot = handSlot(game, now);
  if (!slot) return null;
  const m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, f = QUANDRIX.hold.feet;
  slot.on = true; slot.mode = "drift"; slot.kind = "own"; slot.seq = ++K.seq; slot.x = p.x + .5 + ux * f; slot.y = p.y + .45 + uy * f; slot.dx = ux; slot.dy = uy;
  slot.age = 0; slot.life = QUANDRIX.hand.life; slot.power = Number(game.quandrixPower()) || 0; clearHits(slot);
  return slot;
}
function beginHold(game, now) {
  const K = game.quandrix, P = K.press, mode = holdMode(game); if (!mode || K.hold.on) return false;
  const prev = P.prev && P.prev.on && P.prev.mode === "drift" && P.prev.kind === "own" && P.prev.seq === P.prevSeq ? P.prev : null;
  const hand = prev || feetHand(game, now, P.dx, P.dy); if (!hand) return false;
  const H = K.hold; endHold(K);
  H.on = true; H.mode = mode; H.hand = hand; H.held = 0; H.tick = QUANDRIX.slam.tick; H.power = Number(game.quandrixPower()) || 0; H.action = P.action;
  hand.mode = mode === "fist" ? "fist" : "slam"; clearHits(hand);
  if (mode !== "fist") recallHands(game, hand); // awakened (the slam or the suction cup): every other hand out converges and claps
  return true;
}
// The recall (QUANDRIX.recall): every hand out but the held one turns for the target, at most `max`. Runtime only.
function recallHands(game, held) {
  const R = QUANDRIX.recall, K = game.quandrix, t = typeof game.quandrixTarget === "function" ? game.quandrixTarget() : null, foe = hittable(t) ? t : null;
  let n = 0;
  for (const pool of [K.hands, K.extras]) for (const h of pool) {
    if (n >= R.max) break;
    if (!h.on || h === held || h.mode !== "drift") continue;
    h.mode = "recall"; h.age = 0; h.target = foe ? foe.id : null; h.tx = foe ? foe.x + .5 : held.x; h.ty = foe ? foe.y + .45 : held.y; clearHits(h); n++;
  }
  if (n) game.message = QUANDRIX.messages.recall;
  return n;
}
// A recalled hand's flight: toward its foe (followed as it moves; once it is gone, where it was last), else the held hand
// (followed while it lives). It claps on arrival or past `maxTime`. It cannot overshoot: each step stops at the arrival.
function flyRecall(game, h, dt, now) {
  const R = QUANDRIX.recall, K = game.quandrix; h.age += dt;
  let reach = R.arrive;
  if (h.target !== null) { const e = findFoe(game, h.target); if (e && hittable(e)) { h.tx = e.x + .5; h.ty = e.y + .45; reach += enemyBodyRadius(e); } else h.target = null; }
  else if (K.hold.on && K.hold.hand?.on) { h.tx = K.hold.hand.x; h.ty = K.hold.hand.y; }
  const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
  if (d > 1e-6) { h.dx = dx / d; h.dy = dy / d; }
  const step = Math.min(R.speed * dt, Math.max(0, d - reach));
  if (step > 0) { h.x += h.dx * step; h.y += h.dy * step; }
  if (d - step <= reach + 1e-9 || h.age >= R.maxTime) clap(game, h, now);
}
// One recalled hand's clap where it is: every foe within `radius` takes `share` of the hand's own power; the hand is spent.
function clap(game, h, now) {
  const R = QUANDRIX.recall, x = h.x, y = h.y, amount = h.power * R.share;
  h.on = false; h.mode = "drift"; h.target = null; clearHits(h);
  if (amount > 0 && Number.isFinite(amount)) for (const e of game.enemies) if (hittable(e) && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= R.radius + Math.max(0, enemyBodyRadius(e) - .38)) game.quandrixBlow(e, amount, now, R.stun, x, y);
  flash(game.quandrix, x, y, R.radius, "clap");
}

// ---------------------------------------------------------------- the frame
function centre(game) { const p = game.player; return { x: p.x + .5, y: p.y + .45 }; }
function driftHand(game, h, dt, now) {
  const Q = QUANDRIX.hand; h.age += dt;
  if (h.age >= h.life) { h.on = false; return; }
  const dist = Q.speed * dt, steps = Math.max(1, Math.ceil(dist / Q.step)), step = dist / steps;
  for (let i = 0; i < steps; i++) { // bodies are checked at every sub-step: a long frame cannot carry the hand past a foe
    const nx = h.x + h.dx * step, ny = h.y + h.dy * step; if (!game.quandrixOpen(nx, ny)) { h.on = false; flash(game.quandrix, h.x, h.y, .5, "puff"); return; } h.x = nx; h.y = ny;
    handBlows(game, h, now, i === steps - 1);
  }
}
// The blows of a drifting hand where it is now. `last`: the frame's final sub-step, which also forgets foes it has left.
function handBlows(game, h, now, last) {
  const Q = QUANDRIX.hand;
  for (const e of game.enemies) {
    if (!hittable(e)) continue;
    const id = e.id, at = h.hits[id];
    if (!touching(e, h.x, h.y, Q.radius)) { if (last && at !== undefined && h.age >= at) delete h.hits[id]; continue; } // gone and its interval passed: forgotten
    if (at !== undefined && h.age < at) continue;
    h.hits[id] = h.age + Q.rehit;
    game.quandrixBlow(e, h.power * Q.share, now, Q.stun, h.x, h.y);
  }
}
// Moves (x, y) of `h` toward the Wayfarer at `speed`, stopping `arrive` short; a wall in the way holds it where it is.
function reel(game, h, speed, arrive, dt) {
  const c = centre(game), dx = c.x - h.x, dy = c.y - h.y, d = Math.hypot(dx, dy); if (!(d > arrive)) return;
  const step = Math.min(speed * dt, d - arrive), nx = h.x + dx / d * step, ny = h.y + dy / d * step;
  if (game.quandrixOpen(nx, ny)) { h.x = nx; h.y = ny; }
}
const hasGrab = (H, id) => { for (let i = 0; i < H.n; i++) if (H.grab[i] === id) return true; return false; };
const findFoe = (game, id) => { for (const e of game.enemies) if (e.id === id) return e; return null; };
// Draws the held foes toward (x, y) at `pull` tiles/s, `hug` short; a foe stuck `slip` away (a wall) slips free.
function dragHeld(game, H, x, y, pull, hug, slip, dt, now) {
  for (let i = 0; i < H.n; i++) {
    const e = findFoe(game, H.grab[i]), d = e ? Math.hypot(x - (e.x + .5), y - (e.y + .45)) : Infinity;
    if (!e || !hittable(e) || d > slip) { H.grab[i] = H.grab[H.n - 1]; H.grab[H.n - 1] = ""; H.n--; i--; continue; }
    if (d > hug) { const step = Math.min(pull * dt, d - hug); game.quandrixDrag(e, (x - (e.x + .5)) / d * step, (y - (e.y + .45)) / d * step); }
    if (e.glyphSlow) { e.glyphSlow.until = Math.max(Number(e.glyphSlow.until) || 0, now + 150); e.glyphSlow.factor = Math.min(Number(e.glyphSlow.factor) || 1, .15); }
    else e.glyphSlow = { until: now + 150, factor: .15 }; // held: barely moving of its own accord (once per grab; reused after)
  }
}
// Encumbered (hit-cast-passives.ts ENCUMBERED): the fist's, the suction cup's and the slam's blows are a pull's damage (anchored foes too).
const pulling = (H) => H.mode === "fist" || H.mode === "suction" || H.mode === "slam"; // the slam yanks (QUANDRIX.slam.yank)
function pullBlow(game, H, e, amount, now, stun, x, y) { const n = game.quandrixBlow(e, amount, now, stun, x, y); if (n > 0 && pulling(H)) game.pullBuild?.(e, n, now); }
function burst(game, x, y, radius, share, stun, now, kind) {
  const H = game.quandrix.hold, power = H.power;
  for (const e of game.enemies) if (hittable(e) && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= radius + Math.max(0, enemyBodyRadius(e) - .38)) pullBlow(game, H, e, power * share, now, stun, x, y);
  flash(game.quandrix, x, y, radius, kind);
}
function finish(game, now, held) {
  const K = game.quandrix, H = K.hold, h = H.hand, S = QUANDRIX.slam;
  if (H.mode === "fist") burst(game, h.x, h.y, QUANDRIX.fist.burst.radius, QUANDRIX.fist.burst.share, QUANDRIX.fist.burst.stun, now, "fist");
  else if (H.released) { burst(game, h.x, h.y, S.burst.radius, S.burst.released, S.burst.stun, now, "released"); game.message = QUANDRIX.messages.released; } // let go early: its clock ran out
  else { const w = slamWindow(held), src = (game._staffSrc ||= { melee: false, rr: 0 }); if (typeof game.chargedRelease === "function") src.rr = game.chargedRelease(); /* hit-cast-passives.ts Rapid Reload: the charged slam */ burst(game, h.x, h.y, S.burst.radius, slamBurstShare(held), S.burst.stun, now, w); if (src) src.rr = 0;
    if (w === "perfect") game.message = QUANDRIX.messages.perfect; else if (w === "overcharge") game.message = QUANDRIX.messages.overcharge; }
  h.on = false; clearHits(h); endHold(K);
}
function tickHold(game, dt, now, held) {
  const K = game.quandrix, H = K.hold, h = H.hand, F = QUANDRIX.fist, S = QUANDRIX.slam, U = QUANDRIX.suction;
  if (!h?.on) { endHold(K); return; }
  if (!held && !H.released) { // let go: a slam in the gold window bursts now (the perfect release); anything else lingers on its clock
    if (H.mode !== "fist" && slamWindow(H.held) === "perfect") { finish(game, now, H.held); return; }
    H.released = true;
  }
  H.held += H.mode === "fist" ? dt : dt / (game.chargeQuicken ? game.chargeQuicken(S.perfect[0]) : 1); // the slam's charge (not the fist's grab time) fills sooner with Gathered Breath
  if (H.mode === "fist") {
    reel(game, h, F.speed, F.arrive, dt);
    for (const e of game.enemies) { if (H.n >= F.maxGrab) break; if (hittable(e) && !staffAnchored(e) && !hasGrab(H, e.id) && touching(e, h.x, h.y, F.grab)) H.grab[H.n++] = e.id; }
    dragHeld(game, H, h.x, h.y, F.pull, F.hug, F.slip, dt, now);
    if (H.held >= F.time) finish(game, now, H.held);
    return;
  }
  if (H.mode === "suction") {
    reel(game, h, U.reel, U.arrive, dt);
    for (const e of game.enemies) { if (H.n >= U.maxPull) break; if (hittable(e) && !staffAnchored(e) && !hasGrab(H, e.id) && Math.hypot(e.x + .5 - h.x, e.y + .45 - h.y) <= U.radius) H.grab[H.n++] = e.id; }
    dragHeld(game, H, h.x, h.y, U.pull, U.hug, U.radius + 1, dt, now);
  } else { // the slam: the yank hauls the foes about it in hard, then holds them under it
    const Y = S.yank;
    if (H.held <= Y.window) for (const e of game.enemies) { if (H.n >= Y.maxPull) break; if (hittable(e) && !staffAnchored(e) && !hasGrab(H, e.id) && Math.hypot(e.x + .5 - h.x, e.y + .45 - h.y) <= Y.radius) H.grab[H.n++] = e.id; }
    dragHeld(game, H, h.x, h.y, Y.pull, Y.hug, Y.radius + 1, dt, now);
  }
  H.tick += dt;
  while (H.tick >= S.tick) { H.tick -= S.tick; for (const e of game.enemies) if (hittable(e) && Math.hypot(e.x + .5 - h.x, e.y + .45 - h.y) <= S.radius + Math.max(0, enemyBodyRadius(e) - .38)) pullBlow(game, H, e, H.power * S.tickShare, now, S.stun, h.x, h.y); }
  if (H.held >= S.max) finish(game, now, H.held);
}
// Every frame while game.quandrix exists. `held`: whether the press's (or hold's) button is still down.
export function tickQuandrix(game, dt, now, held) {
  const K = game.quandrix; if (!K) return;
  const p = game.player;
  if (K.where !== game.orreryWhere() || !game.quandrixEquipped() || !(p.hp > 0)) { clearQuandrix(game); K.where = game.orreryWhere(); return; }
  for (const f of K.flashes) if (f.life > 0) f.life = Math.max(0, f.life - dt);
  if (now < (p.stunnedUntil || 0)) { dropPress(K.press); if (K.hold.on && !K.hold.released) { const h = K.hold.hand; if (h) { h.on = false; clearHits(h); } endHold(K); } } // knocked down: a hold still held is lost, nothing bursts (a hand let go keeps on)
  const P = K.press;
  if (P.on) { // the press: its hand is thrown when the staff is ready (`attackReadyAt`), then it is a tap or a hold
    if (P.owed && now >= (p.attackReadyAt || 0)) { P.owed = 0; castHand(game, now, P.dx, P.dy); } // an earlier tap's hand first
    if (!P.thrown && !P.owed && now >= (p.attackReadyAt || 0)) throwOwn(game, now, P);
    const plain = !holdMode(game) || (K.hold.on && QUANDRIX.release.tapWhileLive);
    if (P.holding) { if (P.thrown) dropPress(P); } // its hold began during the cadence: only its own hand was still to throw
    else if (!held) P.tap = true; // let go: a tap
    if (!P.on || P.holding) { /* done, or waiting to throw */ }
    else if (P.tap || plain) { if (P.thrown) dropPress(P); }
    else { P.held += dt; if (P.held >= QUANDRIX.hold.grace && !P.owed) { // the hold begins on the hand before this press's own; that hand, if the cadence still holds it, is thrown when ready
      if (!P.thrown) { const prev = latestHand(game); P.prev = prev; P.prevSeq = prev ? prev.seq : 0; }
      beginHold(game, now); if (P.thrown) dropPress(P); else P.holding = true; } }
  }
  if (K.hold.on) tickHold(game, dt, now, held);
  for (const q of K.queue) { if (!q.on) continue; q.left -= dt; if (q.left <= 0) { q.on = false; const c = centre(game); castExtra(game, c.x, c.y, q.dx, q.dy, q.power, "echo"); } } // as the swing's Echo: from where the Wayfarer is now
  for (const h of K.hands) if (h.on) { if (h.mode === "drift") driftHand(game, h, dt, now); else if (h.mode === "recall") flyRecall(game, h, dt, now); }
  for (const h of K.extras) if (h.on) { if (h.mode === "recall") flyRecall(game, h, dt, now); else driftHand(game, h, dt, now); }
}

// ---------------------------------------------------------------- exact resume (playerRuntime.quandrixHold)
// The live hold (held or let go) as saved: where it is, its heading, its charge clock, the staff's power it was made with and
// the foes it holds. Times are dt clocks (no absolute ms), so the record needs no rebasing. Null when there is none.
const HOLD_MODES = Object.freeze(["fist", "slam", "suction"]);
const foeId = (v) => typeof v === "string" ? v.slice(0, 120) : Number.isFinite(v) ? v : null;
export function savedQuandrixHold(game) {
  const H = game.quandrix?.hold, h = H?.hand;
  if (!H?.on || !h?.on || !HOLD_MODES.includes(H.mode) || ![h.x, h.y, h.dx, h.dy, H.held, H.tick, H.power].every(Number.isFinite)) return null;
  const grab = []; for (let i = 0; i < H.n; i++) { const id = foeId(H.grab[i]); if (id !== null) grab.push(id); }
  return { v: QUANDRIX.release.record, where: game.orreryWhere(), levelId: String(game.map?.levelId || "root"), mode: H.mode,
    x: h.x, y: h.y, dx: h.dx, dy: h.dy, held: H.held, tick: H.tick, power: H.power, grab };
}
export function normalizeQuandrixHold(raw) {
  if (!raw || typeof raw !== "object" || raw.v !== QUANDRIX.release.record || typeof raw.where !== "string" || typeof raw.levelId !== "string" || !HOLD_MODES.includes(raw.mode)) return null;
  const n = (v) => Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : NaN, [x, y, dx, dy, held, tick, power] = [raw.x, raw.y, raw.dx, raw.dy, raw.held, raw.tick, raw.power].map(n);
  if (![x, y, dx, dy, held, tick, power].every(Number.isFinite) || !(Math.hypot(dx, dy) > 0)) return null;
  const cap = GRAB_CAP, grab = [];
  for (const id of Array.isArray(raw.grab) ? raw.grab : []) { const k = foeId(id); if (k !== null && grab.length < cap && !grab.includes(k)) grab.push(k); }
  const m = Math.hypot(dx, dy), end = raw.mode === "fist" ? QUANDRIX.fist.time : QUANDRIX.slam.max;
  return { v: raw.v, where: raw.where, levelId: raw.levelId, mode: raw.mode, x, y, dx: dx / m, dy: dy / m, held: Math.max(0, Math.min(end, held)),
    tick: Math.max(0, Math.min(QUANDRIX.slam.tick, tick)), power: Math.max(0, power), grab };
}
// After the area loads: the saved hold, in the same place, as let go (the button is up after a reload). Only with the staff
// still in hand, the Wayfarer alive and in the same area and level; otherwise nothing (and nothing bursts).
export function restoreQuandrixHold(game, raw) {
  const q = normalizeQuandrixHold(raw), p = game.player;
  if (!q || q.where !== game.orreryWhere() || q.levelId !== String(game.map?.levelId || "root") || !game.quandrixEquipped() || !(p?.hp > 0)) return false;
  const K = quandrixState(game); clearQuandrix(game); K.where = q.where;
  const h = K.hands[0], H = K.hold;
  h.on = true; h.mode = q.mode === "fist" ? "fist" : "slam"; h.kind = "own"; h.seq = ++K.seq; h.x = q.x; h.y = q.y; h.dx = q.dx; h.dy = q.dy; h.age = 0; h.life = 0; h.power = q.power; clearHits(h);
  H.on = true; H.released = true; H.mode = q.mode; H.hand = h; H.held = q.held; H.tick = q.tick; H.power = q.power; H.action = "attack"; H.n = 0;
  for (const id of q.grab) if (H.n < H.grab.length) H.grab[H.n++] = id;
  return true;
}

// ---------------------------------------------------------------- presentation
// Close View (close-view.ts captureActor): each hand as a 3D model. `quandrixHand` drifts upright, palm forward, fingers
// splayed; `quandrixFist` is clenched; `quandrixSlam` lies palm down on the floor. The floor keeps the glyph, swirl and ring.
export function quandrixHandPresentation(h) {
  if (!h?.on || !Number.isFinite(h.x) || !Number.isFinite(h.y)) return null;
  const V = QUANDRIX.view, kind = h.mode === "fist" ? "quandrixFist" : h.mode === "slam" ? "quandrixSlam" : "quandrixHand";
  return { kind, x: h.x, y: h.y, supportX: h.x, supportY: h.y, lift: h.mode === "slam" ? V.slamLift : V.lift, yaw: Math.atan2(h.dy, h.dx), scale: V.scale, pose: "idle", pace: 0, phase: 0, amount: 0, alpha: (h.mode === "drift" ? Math.min(1, (h.life - h.age) / .3, .92) : 1) * (h.kind === "echo" || h.kind === "clone" ? QUANDRIX.extra.alpha : 1) };
}
// An open palm, fingers splayed along its heading `a`, at (x, y) in pixels; `u` is a tile in pixels.
function palm(ctx, x, y, a, u, C, alpha) {
  u *= QUANDRIX.view.drawn; // drawn a little larger than its strike radius, to read at phone size
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.globalAlpha = alpha;
  ctx.fillStyle = C.glow + "55"; ctx.beginPath(); ctx.arc(0, 0, u * .36, 0, 7); ctx.fill();
  ctx.fillStyle = C.glow; ctx.strokeStyle = C.core; ctx.lineWidth = Math.max(1, u * .03);
  ctx.beginPath(); ctx.ellipse(-u * .02, 0, u * .14, u * .13, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.lineCap = "round"; ctx.strokeStyle = C.glow; ctx.lineWidth = Math.max(2, u * .055); ctx.beginPath();
  for (let k = 0; k < 4; k++) { const f = -.42 + k * .28, l = u * (k === 1 || k === 2 ? .27 : .23); ctx.moveTo(u * .1 * Math.cos(f), u * .1 * Math.sin(f)); ctx.lineTo(Math.cos(f) * l, Math.sin(f) * l); }
  ctx.moveTo(-u * .02, u * .1); ctx.lineTo(u * .06, u * .24); ctx.stroke(); // the thumb
  ctx.strokeStyle = C.core; ctx.lineWidth = Math.max(1, u * .02); ctx.stroke();
  ctx.restore();
}
function fist(ctx, x, y, a, u, C) {
  u *= QUANDRIX.view.drawn;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.fillStyle = C.glow + "55"; ctx.beginPath(); ctx.arc(0, 0, u * .34, 0, 7); ctx.fill();
  ctx.fillStyle = C.glow; ctx.strokeStyle = C.deep; ctx.lineWidth = Math.max(1, u * .03);
  ctx.beginPath(); ctx.ellipse(0, 0, u * .17, u * .15, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = C.core; ctx.beginPath(); for (let k = -1; k <= 1; k++) { ctx.moveTo(u * .1, k * u * .06); ctx.lineTo(u * .17, k * u * .06); } ctx.stroke(); // knuckles
  ctx.restore();
}
// The slam's glyph on the floor (a fractal of nested squares) and, for suction, a swirl drawn inward.
function slamGlyph(ctx, x, y, u, C, t, suction, still) {
  const R = QUANDRIX.slam.radius * u, spin = still ? 0 : t * (suction ? -2.4 : .6);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = C.deep + "33"; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
  ctx.strokeStyle = C.rune; ctx.globalAlpha = .8; ctx.lineWidth = Math.max(1.5, u * .04); ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.stroke();
  for (let k = 0; k < 3; k++) { const r = R * (.82 - k * .24), a = spin * (k % 2 ? -1 : 1) + k * Math.PI / 4; ctx.beginPath(); for (let i = 0; i < 4; i++) { const q = a + i * Math.PI / 2; i ? ctx.lineTo(Math.cos(q) * r, Math.sin(q) * r) : ctx.moveTo(Math.cos(q) * r, Math.sin(q) * r); } ctx.closePath(); ctx.stroke(); }
  if (suction) { const S = QUANDRIX.suction.radius * u; ctx.strokeStyle = C.line; ctx.globalAlpha = .55; ctx.lineWidth = Math.max(1.5, u * .035);
    for (let k = 0; k < 4; k++) { ctx.beginPath(); for (let i = 0; i <= 14; i++) { const f = i / 14, r = S * (1 - f * .85), q = spin + k * Math.PI / 2 + f * 2.6; i ? ctx.lineTo(Math.cos(q) * r, Math.sin(q) * r) : ctx.moveTo(Math.cos(q) * r, Math.sin(q) * r); } ctx.stroke(); } }
  ctx.restore(); ctx.globalAlpha = 1;
}
// The perfect-release ring (the Carbine's charge-ring style): a dim track round (x, y), the perfect window lit gold on it, and
// an arc filling from the top as the slam is held; inside the window the whole ring glows.
// `breath`: Gathered Breath copies set (game.chargeGlyphs): one bead each beside the ring's start (2026-11-25).
export function drawSlamRing(ctx, x, y, R, held, C, still, t, breath = 0) {
  const S = QUANDRIX.slam, top = -Math.PI / 2, k = slamFill(held), w = slamWindow(held), a0 = top + Math.PI * 2 * S.perfect[0] / S.max, a1 = top + Math.PI * 2 * S.perfect[1] / S.max;
  ctx.lineCap = "butt"; ctx.globalAlpha = .45; ctx.strokeStyle = C.deep; ctx.lineWidth = Math.max(3, R * .12); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
  ctx.globalAlpha = .95; ctx.strokeStyle = C.perfect; ctx.beginPath(); ctx.arc(x, y, R, a0, a1); ctx.stroke(); // the perfect window
  ctx.strokeStyle = w === "perfect" ? C.perfect : C.core; ctx.lineWidth = Math.max(2, R * .07); ctx.beginPath(); ctx.arc(x, y, R, top, top + Math.PI * 2 * k); ctx.stroke();
  if (w === "perfect") { ctx.globalAlpha = still ? .5 : .35 + .25 * Math.sin(t * 20); ctx.strokeStyle = C.perfect; ctx.lineWidth = Math.max(2, R * .05); ctx.beginPath(); ctx.arc(x, y, R * 1.12, 0, 7); ctx.stroke(); }
  const n = Math.min(6, Math.max(0, Math.floor(Number(breath) || 0)));
  if (n && C.breath) { ctx.globalAlpha = .95; ctx.fillStyle = C.breath; const r = Math.max(2, R * .08), o = R * 1.2; for (let i = 0; i < n; i++) { const a = top - .3 * (i + .5); ctx.beginPath(); ctx.arc(x + Math.cos(a) * o, y + Math.sin(a) * o, r, 0, 7); ctx.fill(); } }
  ctx.globalAlpha = 1;
}
// The standard view (and Close View's floor through `capture`): hands, the fist and its drag lines, the slam and suction, the
// ring and the bursts. One pass over the fixed pools; no allocation. Reduced motion and safe mode stop the turning and pulsing.
export function drawQuandrix(ctx, game, toScreen, s, t, capture = null) {
  const K = game.quandrix; if (!K) return;
  const C = QUANDRIX.colors, V = QUANDRIX.view, still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode), H = K.hold;
  ctx.save(); try {
    for (const f of K.flashes) { if (!(f.life > 0)) continue; const [x, y] = toScreen(f), k = f.life / QUANDRIX.flash.life, R = f.r * s * (still ? 1 : 1.15 - .35 * k);
      ctx.globalAlpha = .35 * k; ctx.fillStyle = f.kind === "perfect" ? C.perfect : C.glow; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      ctx.globalAlpha = k; ctx.strokeStyle = f.kind === "perfect" ? C.perfect : C.core; ctx.lineWidth = Math.max(2, s * .08 * k); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const h of K.extras) { if (!h.on) continue; const [x, y] = toScreen(h), a = Math.atan2(h.dy, h.dx), q = quandrixHandPresentation(h); // echo and clone hands: fainter
      if (capture?.captureActor?.({ source: h, x: h.x, y: h.y, lift: q.lift, height: q.lift + .5, draw: (c, unit) => palm(c, h.x * unit, h.y * unit, a, unit, C, q.alpha), sample: () => quandrixHandPresentation(h) })) continue;
      palm(ctx, x, y, a, s, C, q.alpha); }
    for (const h of K.hands) {
      if (!h.on) continue;
      const [x, y] = toScreen(h), a = Math.atan2(h.dy, h.dx);
      if (h.mode === "slam") slamGlyph(ctx, x, y, s, C, t, H.on && H.hand === h && H.mode === "suction", still);
      if (h.mode === "fist" || (H.on && H.hand === h && H.mode === "suction")) { // the drag lines to every held foe
        ctx.strokeStyle = C.line; ctx.globalAlpha = .8; ctx.lineWidth = Math.max(1.5, s * .045); ctx.setLineDash(still ? [] : [s * .12, s * .08]); ctx.beginPath();
        for (let i = 0; i < H.n; i++) { const e = findFoe(game, H.grab[i]); if (!e) continue; const [ex, ey] = toScreen({ x: e.x + .5, y: e.y + .45 }); ctx.moveTo(x, y); ctx.lineTo(ex, ey); }
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      const q = quandrixHandPresentation(h);
      const captured = q && capture?.captureActor?.({ source: h, x: h.x, y: h.y, lift: q.lift, height: q.lift + .5,
        draw: (c, unit) => h.mode === "fist" ? fist(c, h.x * unit, h.y * unit, a, unit, C) : palm(c, h.x * unit, h.y * unit, a, unit, C, q.alpha),
        sample: () => quandrixHandPresentation(h) });
      if (captured) { if (h.mode !== "slam") { ctx.fillStyle = "#0000002e"; ctx.beginPath(); ctx.ellipse(x, y, s * V.shadow, s * V.shadow * .45, 0, 0, 7); ctx.fill(); } continue; }
      if (h.mode === "fist") fist(ctx, x, y, a, s, C); else palm(ctx, x, y, h.mode === "slam" ? a : a, s, C, q?.alpha ?? 1);
    }
    if (H.on && H.released && H.hand?.on) { const [hx, hy] = toScreen(H.hand), end = H.mode === "fist" ? QUANDRIX.fist.time : QUANDRIX.slam.max, k = Math.max(0, Math.min(1, H.held / end)), R = s * QUANDRIX.slam.radius * .45; // let go: its clock round the hand (no gold window: the release is spent)
      ctx.lineCap = "butt"; ctx.globalAlpha = .45; ctx.strokeStyle = C.deep; ctx.lineWidth = Math.max(3, R * .12); ctx.beginPath(); ctx.arc(hx, hy, R, 0, 7); ctx.stroke();
      ctx.globalAlpha = .95; ctx.strokeStyle = C.core; ctx.lineWidth = Math.max(2, R * .07); ctx.beginPath(); ctx.arc(hx, hy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (H.on && H.hand?.on && H.mode !== "fist") { const P = game.player, [px, py] = toScreen({ x: P.x + .5, y: P.y + .45 }), [hx, hy] = toScreen(H.hand);
      drawSlamRing(ctx, px, py, s * V.ring, H.held, C, still, t, game.chargeGlyphs?.() || 0); drawSlamRing(ctx, hx, hy, s * QUANDRIX.slam.radius * .45, H.held, C, still, t); }
    if (H.on && !H.released && H.hand?.on && H.mode === "fist") { const P = game.player, [px, py] = toScreen({ x: P.x + .5, y: P.y + .45 }), k = Math.min(1, H.held / QUANDRIX.fist.time);
      ctx.strokeStyle = C.core; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, s * V.ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke(); }
  } finally { ctx.restore(); }
}
// The staff in the Wayfarer's hand in the standard view: a dark shaft with a wrapped grip and a lit crystal head, held upright
// at the side the Wayfarer faces, tipped toward the aim while a hand is cast. (cx, cy): the sprite's centre in pixels.
export function drawQuandrixStaff(ctx, cx, cy, s, facing, attacking, aim = null) {
  const C = QUANDRIX.colors, side = facing === "left" ? -1 : 1, hx = cx + side * s * .26, hy = cy + s * .12;
  const tilt = attacking ? Math.atan2(aim?.y ?? 0, aim?.x ?? side) + Math.PI / 2 : side * .18, L = s * QUANDRIX.view.staff;
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(attacking ? Math.max(-1.2, Math.min(1.2, tilt > Math.PI ? tilt - Math.PI * 2 : tilt)) : tilt);
  ctx.lineCap = "round"; ctx.strokeStyle = "#1d1626"; ctx.lineWidth = Math.max(3, s * .1); ctx.beginPath(); ctx.moveTo(0, L * .32); ctx.lineTo(0, -L * .62); ctx.stroke();
  ctx.strokeStyle = C.staff; ctx.lineWidth = Math.max(2, s * .06); ctx.stroke();
  ctx.strokeStyle = C.wrap; ctx.lineWidth = Math.max(2.5, s * .08); ctx.beginPath(); ctx.moveTo(0, L * .05); ctx.lineTo(0, -L * .1); ctx.stroke();
  ctx.fillStyle = C.metal; ctx.beginPath(); ctx.moveTo(-s * .07, -L * .6); ctx.lineTo(s * .07, -L * .6); ctx.lineTo(0, -L * .52); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.glow + "66"; ctx.beginPath(); ctx.arc(0, -L * .72, s * .15, 0, 7); ctx.fill();
  ctx.fillStyle = C.glow; ctx.strokeStyle = C.core; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -L * .86); ctx.lineTo(s * .06, -L * .72); ctx.lineTo(0, -L * .6); ctx.lineTo(-s * .06, -L * .72); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
