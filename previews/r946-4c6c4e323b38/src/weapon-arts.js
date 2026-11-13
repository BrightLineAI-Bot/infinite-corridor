// Weapon arts (Tim, 2026-11-13: "each primary weapon gets its own selectable Lattice passive... like the Quandrix Staff's Mage's
// Hand"). Five tool forms (lattice-fields.ts TOOL_FORMS, keys `field:<id>`), each working only with its own primary weapon
// (items.ts weaponKey): Lava Slash (Verge Cleaver), Blade Stream (Fourfold Daggers), Cinder Javelin (Cinder Pike), Ki Blast
// (Iron Fists) and Transpose (Salvage Blade). Every number is in WEAPON_ARTS; game.ts supplies the hooks (artPower, artBlow,
// artOpen, artAim, artDash, artLeap, artVisual, artFistStep, artFistTap, artFistRelease, artBlocked), counts presses (noteArtPress from
// primaryAttack and fistPunch) and calls tickWeaponArts every frame.
//
// The shared rule:
// - ARMING: `arm.presses` accepted primary presses arm the art (Echo copies, the daggers' second cut and the Verge Cleaver's
//   delayed contact are not presses). One charge is stored; swinging on keeps it armed.
// - CHARGE: armed, holding Attack past `hold.grace` s charges it (a tap stays an ordinary attack: the press that began the hold
//   swung as usual). A ring round the Wayfarer fills toward the perfect window; letting go releases the art at `artShare` of a
//   normal hit of the weapon (game.ts plungeBase: meleePower, or the Iron Fists' dash punch). Held to `charge.max` it
//   overcharges and releases itself. Releasing spends the charge; `arm.presses` more presses re-arm.
// - The Iron Fists wait instead: armed, a press holds its punch until Attack is let go (a tap within `hold.grace` throws the
//   next punch as ever); held on, the charge begins, and letting go throws that punch (the combo's next as the press was made,
//   held however long the charge takes) with the blast.
// - A dodge, a knockdown or death cancels a charge in progress (the stored charge is kept); Attack must be let go before a
//   new charge begins. Foes that hold their ground (QUANDRIX.anchored: bosses, world beasts, elites...) are never knocked but
//   take every blow.
// - Bounded: shots, streams, flashes, the wind-up and the seal are fixed pools made once (game.weaponArts), reused, never
//   grown; nothing is allocated per frame. Everything runs on frame time (dt). Runtime only, never saved: a reload drops the
//   armed charge, any charge in progress and anything in flight (nothing bursts); a new area drops what is in flight and the
//   seal, and keeps the stored charge.
//
// Transpose's seal: standing in it, the Wayfarer's spells (the armor glyphs' Spell Damage path: spells, magic tools, Imbue)
// deal `spellDamage` more and she takes `damageTaken` more from every blow (game.ts armorGlyphBonus reads transposeBonus).
import { latticePassives } from "./transit-lattice.js?v=r946-4c6c4e323b38";
import { weaponKey } from "./items.js?v=r946-4c6c4e323b38";
import { QUANDRIX } from "./quandrix-staff.js?v=r946-4c6c4e323b38";

const enemyBodyRadius = (e) => Math.max(.28, Number(e?.bodyRadius) || .38); // combat.ts enemyBodyRadius, restated (a leaf)

export const WEAPON_ARTS = Object.freeze({
  arm: Object.freeze({ presses: 3 }),
  hold: Object.freeze({ grace: .2 }), // as QUANDRIX.hold.grace: shorter, a tap
  // The charge (the Quandrix slam's windows): seconds held after the grace, and the share of a normal hit each window gives,
  // times the art's own `share` below. Balance pass 2026-11-13: an early release starts at .3 (was .8), so a tap-and-let-go
  // right after the grace is a small poke rather than a free extra hit every fourth press; the perfect window stays 2.6.
  charge: Object.freeze({ perfect: Object.freeze([1, 1.3]), max: 2, early: Object.freeze([.3, 1.2]), perfectShare: 2.6, late: 1.4, overcharge: 1.6 }),
  anchored: QUANDRIX.anchored, // the same foes the staff never drags
  arts: Object.freeze({
    // `share`: the art's own weight on the charge's share (balance pass 2026-11-13; a missing one is 1).
    // Dash toward the nearest foe (the lock first) within `dash` tiles, stopping `stop` short of it (straight ahead with none;
    // walls stop it), then the blade slams down `reach` ahead and the ground erupts within `radius`.
    "lava-slash": Object.freeze({ weapon: "verge-cleaver", name: "Lava Slash", share: .7, dash: 4, stop: .9, reach: .9, radius: 1.9, stun: .5, knock: .45, poseMs: 460 }),
    // `hits` slashes of light over `span` s, on every foe within `radius` of the Wayfarer (who may move): together the share.
    "blade-stream": Object.freeze({ weapon: "fourfold-daggers", name: "Blade Stream", share: .5, radius: 2, hits: 6, span: .6, stun: .1, poseMs: 620 }),
    // A wind-up of `windup` s, then the pike flies `range` tiles at `speed`, striking up to `pierce` foes, and is back in hand.
    "cinder-javelin": Object.freeze({ weapon: "cinder-pike", name: "Cinder Javelin", share: 1, windup: .26, range: 8, speed: 16, pierce: 3, radius: .42, stun: .35, knock: .35, poseMs: 560 }),
    // A forward blast `range` tiles at `speed`; it bursts on the first foe (or wall) within `burst`. Released on the uppercut,
    // the Wayfarer pops up into the air and fires it from there for `air` times as much. Still in the air at the next press
    // (Tim, 2026-11-13), she drops in a ground slam (game.ts airAttack/plungeLand): `slam.share` of the fists' power (fistPower)
    // on every foe within `slam.radius` where she lands; it takes the kick's place in the chain, which then starts again.
    "ki-blast": Object.freeze({ weapon: "iron-fists", name: "Ki Blast", share: 1, range: 7, speed: 12, radius: .45, burst: .9, air: 1.25, stun: .4, knock: .55, poseMs: 380,
      slam: Object.freeze({ share: 2.8, radius: 1.5, stun: .4 }) }), // Tim 2026-11-13: the slam has parity with the awakened kick it replaces
    // A seal on the ground round the Wayfarer: `base` s (`perfectBase` from a perfect release); each melee hit landed while it
    // lasts adds `perHit` s, the time left never above `cap`. Standing in it: +`spellDamage` spell damage, +`damageTaken` damage
    // taken; both linger `linger` s after stepping out. One at a time. No damage of its own.
    transpose: Object.freeze({ weapon: "salvage-blade", name: "Transpose", radius: 2.2, base: 4, perfectBase: 6, perHit: .6, cap: 10, linger: 3, spellDamage: .25, damageTaken: .05, poseMs: 460 }),
  }),
  pools: Object.freeze({ shots: 4, streams: 2, flashes: 6, hits: 4 }),
  flash: Object.freeze({ life: .45, dash: .3 }),
  view: Object.freeze({ ring: .66, glint: .55, step: .2 }),
  colors: Object.freeze({
    ring: "#e8d4a8", track: "#3a2c20", perfect: "#fff2a8", glint: "#fff6d8",
    lava: "#ff6a1f", lavaCore: "#ffd27a", ember: "#a8321a",
    stream: "#e8f6ff", streamCore: "#9fd8ff",
    pike: "#4a3326", pikeHead: "#ffb35a", pikeTrail: "#ff8a3d",
    ki: "#9ff0ff", kiCore: "#ffffff",
    seal: "#b896cf", sealCore: "#f1e4ff", sealDeep: "#3d2a5c",
  }),
  messages: Object.freeze({ perfect: "A perfect release!", overcharge: "Overcharged: it releases itself." }),
});
export const WEAPON_ART_IDS = Object.freeze(Object.keys(WEAPON_ARTS.arts));

// Awakened arts (Tim, 2026-11-13: "one unique awakened move per weapon"): the awakening (constellation.ts awaken) gives each
// primary weapon its own move in place of the shared crescent; awakened-arts.ts runs them. `share` is of a normal hit of the
// weapon (game.ts primaryAttack: the crescent's base; the Iron Fists' fistPower). Balance pass 2026-11-13 (headless harness:
// the art and the awakening together add about a quarter to the plain weapon's sustained damage, the daggers on top): below
// the crescent's .7 for the Verge Cleaver (.3), the Cinder Pike (.5) and the Fourfold Daggers (.25 a way); the Salvage Blade's
// runes keep .7 (they need a spell). The Iron Fists' kick is a full step of their combo (2026-11-13), a little above the uppercut (2.8; the headless bot keeps the awakened loop about a fifth below r941). Each move's `up` is the small extra it gains when the
// weapon's own art (WEAPON_ARTS.arts[passive]) is also selected. The Quandrix
// Staff keeps its own awakening (quandrix-staff.ts); tools keep their fan.
export const AWAKENED_ARTS = Object.freeze({
  every: 3, // every third accepted swing (no Echo copy, not the daggers' second cut), as the crescent was
  moves: Object.freeze({
    // A crack runs `length` tiles along the aim from `start` ahead (walls stop it) and erupts `delay` s later on every foe within
    // `width` of it. Up: the eruption leaves a lava crack `life` s that strikes foes on it every `tick` s for `share`.
    fissure: Object.freeze({ weapon: "verge-cleaver", passive: "lava-slash", name: "Fissure", text: "every third swing cracks the ground ahead, and it erupts a beat later", share: .3, start: .5, length: 4, width: .55, delay: .3, stun: .3, knock: .25, poseMs: 420,
      up: Object.freeze({ life: 3, tick: .5, share: .04 }) }),
    // The pair flies `range` tiles at `speed` and back to the Wayfarer's hand; each foe is cut once going out and once coming
    // back, `share` each (walls turn it back; on the way home a wall ends it). Up: Blade Stream's release also throws `count`
    // single blades out in a ring `range` tiles and home again, `share` a cut.
    "returning-blades": Object.freeze({ weapon: "fourfold-daggers", passive: "blade-stream", name: "Returning blades", text: "every third press throws the pair out and back, cutting both ways", share: .25, range: 4, speed: 11, radius: .45, stun: .1, poseMs: 380,
      up: Object.freeze({ count: 6, range: 3, speed: 10, share: .03 }) }),
    // A line of cinder light `length` tiles along the aim (walls stop it) strikes every foe within `width` of it at once.
    // Up: the Cinder Javelin flies back to the hand, striking every foe on the way home (up to the shot's hit list) for
    // `returnShare` of its throw.
    lance: Object.freeze({ weapon: "cinder-pike", passive: "cinder-javelin", name: "Lance", text: "every third thrust extends a long line of cinder light", share: .5, start: .4, length: 6, width: .45, stun: .25, knock: .2, life: .4, poseMs: 360,
      up: Object.freeze({ returnShare: .35 }) }),
    // The fourth step of the awakened fists' training combo (Tim, 2026-11-13: cross, jab, uppercut, kick, on one rhythm; "I
    // don't want it to be lower"): a spinning kick on every foe within `radius`, `share` of the fists' power (fistPower) like a
    // punch, `chargeShare` more at full charge (with `echoes` Echo glyphs it can be held); it staggers (`stun`) but never
    // knocks, so the loop keeps the foe in reach. It is thrown as a punch step (game.ts fistPunch, step 4).
    // Up: Ki Blast's ground slam (WEAPON_ARTS.arts["ki-blast"].slam) strikes `share` more of the fists' power.
    roundhouse: Object.freeze({ weapon: "iron-fists", passive: "ki-blast", name: "Roundhouse kick", text: "a spinning roundhouse kick becomes the fourth step of the combo", share: 2.8, chargeShare: 1.6, echoes: 2, dash: 0, radius: 1.6, stun: .3,
      up: Object.freeze({ share: 0 }) }), // Tim 2026-11-13: the slam (2.8) already has parity with the kick; awakening adds nothing more
    // The swing's struck foes take a rune (one a foe; `life` s); the next spell to strike a runed foe detonates it for `share`
    // on every foe within `burst`. Up: each spell cast standing in Transpose's seal sends a pulse from it, `share` of the art's
    // power on every foe in the seal, at most one each `gap` s.
    "spell-runes": Object.freeze({ weapon: "salvage-blade", passive: "transpose", name: "Spell runes", text: "every third swing runes the nearest foe it strikes (one not yet runed first); your next spell to hit one detonates it", share: .7, burst: .9, life: 8, stun: .2,
      up: Object.freeze({ share: .3, gap: .25 }) }),
  }),
  pools: Object.freeze({ fissures: 3, blades: 8, lances: 2, runes: 6, flashes: 6, hits: 8 }),
  flash: Object.freeze({ life: .4 }),
  colors: Object.freeze({ crack: "#2a1a12", fissure: "#ff8a3d", fissureCore: "#ffe0a0", blade: "#e8f6ff", bladeEdge: "#9fd8ff", lance: "#ff8a3d", lanceCore: "#fff0c8",
    rune: "#c9a6ff", runeCore: "#f6eeff", kick: "#9ff0ff", kickCore: "#ffffff", pulse: "#b896cf" }),
  messages: Object.freeze({ kick: "Roundhouse kick!", slam: "Ground slam!" }),
});
export const AWAKENED_IDS = Object.freeze(Object.keys(AWAKENED_ARTS.moves));
// The awakened move of the equipped primary (an id of AWAKENED_ARTS.moves), or null: not awakened, or the Quandrix Staff.
export function awakenedFor(save) {
  const item = save?.equipment?.primary; if (!item?.awakened) return null;
  const key = weaponKey(item); for (const id of AWAKENED_IDS) if (AWAKENED_ARTS.moves[id].weapon === key) return id;
  return null;
}
// Whether the awakened move `id` is upgraded: the weapon awakened and its own art selected.
export const awakenedUp = (save, id) => !!id && awakenedFor(save) === id && artFor(save) === AWAKENED_ARTS.moves[id].passive;

// ---------------------------------------------------------------- pure rules
export function artWindow(held) {
  const C = WEAPON_ARTS.charge, h = Number(held) || 0;
  return h >= C.max ? "overcharge" : h < C.perfect[0] ? "early" : h <= C.perfect[1] ? "perfect" : "late";
}
// The release's share of a normal hit for a charge held `held` s (after the grace).
export function artShare(held) {
  const C = WEAPON_ARTS.charge, h = Math.max(0, Number(held) || 0), w = artWindow(h);
  if (w === "early") return C.early[0] + (C.early[1] - C.early[0]) * Math.min(1, h / C.perfect[0]);
  return w === "perfect" ? C.perfectShare : w === "late" ? C.late : C.overcharge;
}
export const artFill = (held) => Math.max(0, Math.min(1, (Number(held) || 0) / WEAPON_ARTS.charge.max));
export const artAnchored = (e) => { if (!e) return true; for (const k of WEAPON_ARTS.anchored) if (e[k]) return true; return false; };
// Transpose's seal lasts this long when placed by a release in window `w`.
export const sealBase = (w) => w === "perfect" ? WEAPON_ARTS.arts.transpose.perfectBase : WEAPON_ARTS.arts.transpose.base;
// The art the equipped primary carries, if its Lattice passive is selected: an id of WEAPON_ARTS.arts, or null.
export function artFor(save) {
  const item = save?.equipment?.primary; if (!item) return null;
  const key = weaponKey(item); let chosen = null;
  for (const id of WEAPON_ART_IDS) if (WEAPON_ARTS.arts[id].weapon === key) { chosen = id; break; }
  return chosen && latticePassives(save).includes(`field:${chosen}`) ? chosen : null;
}
const hittable = (e) => !!e && !e.dead && !e.untargetable && !e.hidden && e.kind !== "npc" && Number(e.hp) > 0;
const inside = (e, x, y, r) => Math.hypot(e.x + .5 - x, e.y + .45 - y) <= r + Math.max(0, enemyBodyRadius(e) - .38);

// ---------------------------------------------------------------- runtime state (game.weaponArts, never saved)
const newShot = () => ({ on: false, kind: "", x: 0, y: 0, dx: 1, dy: 0, left: 0, speed: 0, power: 0, n: 0, hit: Array.from({ length: WEAPON_ARTS.pools.hits }, () => ""), air: false, back: false, age: 0 });
const newFlash = () => ({ life: 0, max: 1, x: 0, y: 0, x0: 0, y0: 0, r: 0, kind: "" });
export function weaponArtsState(game) {
  return (game.weaponArts ||= {
    where: "", art: null, presses: 0, armed: false, heldFor: 0, latch: false, linger: 0, buff: false, pikeOut: false, artRecord: null,
    hold: { on: false, held: 0, dx: 1, dy: 0, step: 1 },
    fist: { on: false, held: 0, action: "attack", dx: 1, dy: 0, step: 1 }, // the punch the press will throw (fixed at the press)
    windup: { on: false, left: 0, dx: 1, dy: 0, power: 0 },
    seal: { on: false, x: 0, y: 0, left: 0, age: 0 },
    shots: Array.from({ length: WEAPON_ARTS.pools.shots }, newShot),
    streams: Array.from({ length: WEAPON_ARTS.pools.streams }, () => ({ on: false, n: 0, tick: 0, every: 0, power: 0, age: 0 })),
    flashes: Array.from({ length: WEAPON_ARTS.pools.flashes }, newFlash),
  });
}
// Transpose's buff is read by the save-only damage path (game.ts armorGlyphBonus): keyed by the live save, never stored in it.
const SEAL_BUFF = new WeakMap();
export function transposeBonus(save) { return save && typeof save === "object" ? SEAL_BUFF.get(save) || null : null; }
const BONUS = Object.freeze({ spellDamage: WEAPON_ARTS.arts.transpose.spellDamage, damageTaken: WEAPON_ARTS.arts.transpose.damageTaken });
function setBuff(game, on) { const K = game.weaponArts; K.buff = on; if (on) SEAL_BUFF.set(game.save, BONUS); else SEAL_BUFF.delete(game.save); }

function endHold(K) { K.hold.on = false; K.hold.held = 0; }
// A charge in progress is lost (a dodge, a knockdown, death): the stored charge stays; Attack must be let go first.
function cancelCharge(K) { endHold(K); K.fist.on = false; K.fist.held = 0; K.heldFor = 0; K.latch = true; }
// Drops everything in flight and the seal (a new area); keeps the stored charge.
function clearField(game) {
  const K = game.weaponArts; cancelCharge(K);
  K.windup.on = false; K.seal.on = false; K.linger = 0; K.pikeOut = false; K.artRecord = null; setBuff(game, false);
  for (const s of K.shots) s.on = false;
  for (const s of K.streams) s.on = false;
  for (const f of K.flashes) f.life = 0;
}
export function clearWeaponArts(game) { if (game.weaponArts) { clearField(game); game.weaponArts.armed = false; game.weaponArts.presses = 0; } }
export const weaponArtArmed = (game) => !!game?.weaponArts?.armed && !!game.weaponArts.art && game.weaponArts.art === artFor(game.save);
// 0..1 while a charge is held (the Close View lean and the ring), else 0.
export const weaponArtCharge = (game) => game?.weaponArts?.hold?.on ? Math.max(.05, artFill(game.weaponArts.hold.held)) : 0;
export const liveArtShots = (game) => { let n = 0; for (const s of game.weaponArts?.shots || []) if (s.on) n++; return n; };
// Tim, 2026-11-13: while the Cinder Javelin flies (its awakened way home too) the pike is out of her hands (close-view.ts hides it).
// Tim: the throw can be cancelled (a dodge, another attack) at any time after the release: the pike is back in her hands at
// once and the javelin flies on, its awakened way home included, as a projectile.
const javelinOn = (K) => { for (const s of K?.shots || []) if (s.on && s.kind === "javelin") return true; return false; };
export const javelinInFlight = (game) => !!game?.weaponArts?.pikeOut && javelinOn(game.weaponArts);

function flash(K, kind, x, y, r, life = WEAPON_ARTS.flash.life, x0 = x, y0 = y) {
  let slot = K.flashes[0]; for (const f of K.flashes) { if (f.life <= 0) { slot = f; break; } if (f.life < slot.life) slot = f; }
  slot.life = life; slot.max = life; slot.kind = kind; slot.x = x; slot.y = y; slot.x0 = x0; slot.y0 = y0; slot.r = r;
}
function shotSlot(K) { let slot = K.shots[0]; for (const s of K.shots) { if (!s.on) return s; if (s.age > slot.age) slot = s; } return slot; } // full: the oldest gives way
const centre = (game) => ({ x: game.player.x + .5, y: game.player.y + .45 });

// ---------------------------------------------------------------- arming
// One accepted primary press (game.ts primaryAttack for a non-echo swing, fistPunch for a punch).
export function noteArtPress(game) {
  const id = artFor(game.save); if (!id) return false;
  const K = weaponArtsState(game);
  if (K.art !== id) { K.art = id; K.presses = 0; K.armed = false; cancelCharge(K); K.latch = false; }
  if (K.armed) return true;
  K.presses = Math.min(WEAPON_ARTS.arm.presses, K.presses + 1);
  if (K.presses >= WEAPON_ARTS.arm.presses) K.armed = true;
  return K.armed;
}
// The Iron Fists' press while Ki Blast is armed: the punch waits for Attack to be let go (game.ts fistPress). True: taken.
export function artFistIntercept(game, now, dir, action) {
  const K = game.weaponArts; if (!K || !action || K.art !== "ki-blast" || !K.armed || artFor(game.save) !== "ki-blast") return false;
  if (K.fist.on || K.hold.on) return true; // already waiting or charging: the press is the same one
  const d = game.artAim(dir); K.fist.on = true; K.fist.held = 0; K.fist.action = action; K.fist.dx = d.x; K.fist.dy = d.y; K.fist.step = game.artFistStep(now); K.latch = false;
  return true;
}
// Each melee hit landed (game.ts primaryAttack): Transpose's seal grows, the time left never above `cap`.
export function artMeleeHit(game) {
  const S = game.weaponArts?.seal; if (!S?.on) return false;
  const T = WEAPON_ARTS.arts.transpose; S.left = Math.min(T.cap, S.left + T.perHit); return true;
}

// ---------------------------------------------------------------- the releases
function burst(game, x, y, r, amount, stun, knock, now) {
  let n = 0; for (const e of game.enemies) if (hittable(e) && inside(e, x, y, r)) { game.artBlow(e, amount, now, stun, x, y, knock); n++; }
  return n;
}
function release(game, now, held) {
  const K = game.weaponArts, id = K.art, A = WEAPON_ARTS.arts[id], H = K.hold, w = artWindow(held), share = artShare(held);
  const dx = H.dx, dy = H.dy, fistStep = H.step; endHold(K); K.latch = true;
  if (!A || game.artBlocked(now)) { if (A && id === "ki-blast") game.artFistTap(now, { x: dx, y: dy }, fistStep); return false; } // fizzles; the charge stays stored (the fists' held punch is thrown as a tap)
  K.armed = false; K.presses = 0;
  const power = Math.max(0, Number(game.artPower(now)) || 0) * share * (A.share ?? 1); // A.share: the art's own weight (balance)
  if (id === "lava-slash") {
    const c0 = centre(game), d = game.artDash(now, A.dash, A.stop), c = centre(game), x = c.x + d.x * A.reach, y = c.y + d.y * A.reach;
    if (Math.hypot(c.x - c0.x, c.y - c0.y) > .2) flash(K, "dash", c.x, c.y, .35, WEAPON_ARTS.flash.dash, c0.x, c0.y);
    burst(game, x, y, A.radius, power, A.stun, A.knock, now); flash(K, "eruption", x, y, A.radius);
    game.artVisual(now, d, id, A.poseMs);
  } else if (id === "blade-stream") {
    let slot = K.streams[0]; for (const s of K.streams) { if (!s.on) { slot = s; break; } if (s.age > slot.age) slot = s; }
    slot.on = true; slot.n = A.hits; slot.every = A.span / A.hits; slot.tick = 0; slot.power = power / A.hits; slot.age = 0;
    const d = game.artAim(null); game.artVisual(now, d, id, A.poseMs);
    game.awakenedRelease?.(id, now, false); // awakened-arts.ts: awakened Fourfold Daggers also throw a ring of blades
  } else if (id === "cinder-javelin") {
    const d = game.artAim(null), W = K.windup; W.on = true; W.left = A.windup; W.dx = d.x; W.dy = d.y; W.power = power;
    game.artVisual(now, d, id, A.poseMs); K.pikeOut = true; K.artRecord = game.player.attackVisual || null; // thrown: out of her hands until it is home or she cancels the throw
  } else if (id === "ki-blast") {
    const step = game.artFistRelease(now, { x: dx, y: dy }, fistStep), air = step === 3; if (air) game.artLeap(now); // the uppercut pops her up: fired from the air (game.ts: a press still up there is the ground slam)
    const c = centre(game), s = shotSlot(K);
    s.on = true; s.kind = "ki"; s.x = c.x + dx * .45; s.y = c.y + dy * .45; s.dx = dx; s.dy = dy; s.left = A.range; s.speed = A.speed;
    s.power = power * (air ? A.air : 1); s.n = 0; s.air = !!air; s.back = false; s.age = 0; for (let i = 0; i < s.hit.length; i++) s.hit[i] = "";
    game.artVisual(now, { x: dx, y: dy }, id, A.poseMs);
  } else if (id === "transpose") {
    const c = centre(game), S = K.seal; S.on = true; S.x = c.x; S.y = c.y; S.left = sealBase(w); S.age = 0; // a new seal replaces the old
    flash(K, "seal", c.x, c.y, A.radius); game.artVisual(now, game.artAim(null), id, A.poseMs);
  }
  if (w === "perfect") game.message = `${A.name}: ${WEAPON_ARTS.messages.perfect}`;
  else if (w === "overcharge") game.message = `${A.name}: ${WEAPON_ARTS.messages.overcharge}`;
  return true;
}
function launchJavelin(game) {
  const K = game.weaponArts, W = K.windup, A = WEAPON_ARTS.arts["cinder-javelin"], c = centre(game), s = shotSlot(K);
  W.on = false;
  s.on = true; s.kind = "javelin"; s.x = c.x + W.dx * .5; s.y = c.y + W.dy * .5; s.dx = W.dx; s.dy = W.dy; s.left = A.range; s.speed = A.speed;
  s.power = W.power; s.n = 0; s.air = false; s.back = false; s.age = 0; for (let i = 0; i < s.hit.length; i++) s.hit[i] = "";
}
// Awakened Cinder Pike with Cinder Javelin (AWAKENED_ARTS.moves.lance.up): where the throw would end, the pike turns for home
// at `returnShare` of its power, its hit list cleared (every foe may be struck again). False: it ends as ever.
function turnBack(game, s) {
  if (s.kind !== "javelin" || s.back || !awakenedUp(game.save, "lance")) return false;
  s.on = true; s.back = true; s.n = 0; for (let i = 0; i < s.hit.length; i++) s.hit[i] = "";
  s.power *= AWAKENED_ARTS.moves.lance.up.returnShare; s.left = WEAPON_ARTS.arts["cinder-javelin"].range + 2; return true; // never further than the throw and a little
}
// The way home: toward the Wayfarer each step; caught within `catch` of her; a wall ends it; at most the hit list's foes.
function tickReturn(game, s, dt, now) {
  const K = game.weaponArts, A = WEAPON_ARTS.arts["cinder-javelin"], step = WEAPON_ARTS.view.step, dist = Math.min(s.left, s.speed * dt), n = Math.max(1, Math.ceil(dist / step)), d = dist / n;
  for (let i = 0; i < n; i++) {
    const c = centre(game), hx = c.x - s.x, hy = c.y - s.y, hd = Math.hypot(hx, hy);
    if (hd <= .5) { s.on = false; return; } // back in hand
    s.dx = hx / hd; s.dy = hy / hd; const nx = s.x + s.dx * d, ny = s.y + s.dy * d;
    if (!game.artOpen(nx, ny)) { s.on = false; flash(K, "javelin", s.x, s.y, .5); return; }
    s.x = nx; s.y = ny; s.left -= d;
    for (const e of game.enemies) {
      if (s.n >= s.hit.length || !hittable(e) || wasHit(s, e.id) || Math.hypot(e.x + .5 - s.x, e.y + .45 - s.y) >= A.radius + enemyBodyRadius(e)) continue;
      s.hit[s.n++] = e.id; game.artBlow(e, s.power, now, A.stun, s.x - s.dx, s.y - s.dy, 0);
    }
  }
  if (s.left <= 1e-6) s.on = false;
}
const wasHit = (s, id) => { for (let i = 0; i < s.n; i++) if (s.hit[i] === id) return true; return false; };
function tickShot(game, s, dt, now) {
  const K = game.weaponArts, step = WEAPON_ARTS.view.step; s.age += dt;
  if (s.back) { tickReturn(game, s, dt, now); return; }
  const dist = Math.min(s.left, s.speed * dt), n = Math.max(1, Math.ceil(dist / step)), d = dist / n;
  for (let i = 0; i < n; i++) {
    const nx = s.x + s.dx * d, ny = s.y + s.dy * d;
    if (!game.artOpen(nx, ny)) { end(game, s, now); return; }
    s.x = nx; s.y = ny; s.left -= d;
    if (s.kind === "ki") {
      const A = WEAPON_ARTS.arts["ki-blast"];
      for (const e of game.enemies) if (hittable(e) && Math.hypot(e.x + .5 - s.x, e.y + .45 - s.y) < A.radius + enemyBodyRadius(e)) { end(game, s, now); return; }
    } else {
      const A = WEAPON_ARTS.arts["cinder-javelin"];
      for (const e of game.enemies) {
        if (!hittable(e) || wasHit(s, e.id) || Math.hypot(e.x + .5 - s.x, e.y + .45 - s.y) >= A.radius + enemyBodyRadius(e)) continue;
        s.hit[s.n++] = e.id; game.artBlow(e, s.power, now, A.stun, s.x - s.dx, s.y - s.dy, A.knock);
        if (s.n >= A.pierce) { if (!turnBack(game, s)) { flash(K, "javelin", s.x, s.y, .6); s.on = false; } return; }
      }
    }
  }
  if (s.left <= 1e-6) end(game, s, now);
}
function end(game, s, now) {
  const K = game.weaponArts; s.on = false;
  if (s.kind === "ki") { const A = WEAPON_ARTS.arts["ki-blast"]; burst(game, s.x, s.y, A.burst, s.power, A.stun, A.knock, now); flash(K, "ki", s.x, s.y, A.burst); }
  else if (!turnBack(game, s)) flash(K, "javelin", s.x, s.y, .5);
}
function tickStream(game, st, dt, now) {
  const A = WEAPON_ARTS.arts["blade-stream"]; st.age += dt; st.tick -= dt;
  while (st.on && st.tick <= 0) {
    const c = centre(game); burst(game, c.x, c.y, A.radius, st.power, A.stun, 0, now);
    st.tick += st.every; if (--st.n <= 0) st.on = false;
  }
}

// ---------------------------------------------------------------- the frame
// Every frame while game.weaponArts exists. `held`: whether the charge's button (or Attack) is down.
export function tickWeaponArts(game, dt, now, held) {
  const K = game.weaponArts; if (!K) return;
  const p = game.player, where = game.orreryWhere(), C = WEAPON_ARTS.charge, G = WEAPON_ARTS.hold.grace;
  if (!(dt >= 0) || !Number.isFinite(dt)) dt = 0;
  if (K.where !== where) { clearField(game); K.where = where; }
  const id = artFor(game.save);
  if (id !== K.art) { K.art = id; K.presses = 0; K.armed = false; cancelCharge(K); }
  for (const f of K.flashes) if (f.life > 0) f.life = Math.max(0, f.life - dt);
  const H = K.hold, F = K.fist;
  if (!(p.hp > 0) || now < (p.stunnedUntil || 0) || now < (p.dodgeUntil || 0)) { if (H.on || F.on || K.heldFor > 0) cancelCharge(K); }
  else if (!held) {
    K.heldFor = 0; K.latch = false;
    if (F.on) { F.on = false; game.artFistTap(now, { x: F.dx, y: F.dy }, F.step); } // a tap: the punch it would always have been
    else if (H.on) release(game, now, H.held);
  } else if (!K.latch && id) {
    K.heldFor += dt;
    if (F.on) { F.held += dt; if (F.held >= G) { F.on = false; H.on = true; H.held = 0; H.dx = F.dx; H.dy = F.dy; H.step = F.step; } }
    else if (H.on) { H.held += dt; if (H.held >= C.max) release(game, now, H.held); }
    else if (id !== "ki-blast" && K.armed && K.heldFor >= G && !game.artBlocked(now)) { H.on = true; H.held = 0; } // aimed when let go
  }
  if (K.pikeOut && (now < (p.dodgeUntil || 0) || p.attackVisual !== K.artRecord || (!K.windup.on && !javelinOn(K)))) { K.pikeOut = false; K.artRecord = null; } // cancelled, or home
  const W = K.windup; if (W.on) { if (!(p.hp > 0)) W.on = false; else if ((W.left -= dt) <= 0) launchJavelin(game); }
  for (const s of K.shots) if (s.on) tickShot(game, s, dt, now);
  for (const st of K.streams) if (st.on) tickStream(game, st, dt, now);
  const S = K.seal, T = WEAPON_ARTS.arts.transpose;
  if (S.on) { S.age += dt; S.left -= dt; if (S.left <= 0) { S.on = false; S.left = 0; } }
  const within = S.on && Math.hypot(p.x + .5 - S.x, p.y + .45 - S.y) <= T.radius;
  K.linger = within ? T.linger : Math.max(0, K.linger - dt);
  const buff = within || K.linger > 0; if (buff !== K.buff || (buff && !SEAL_BUFF.has(game.save))) setBuff(game, buff);
}

// ---------------------------------------------------------------- presentation (standard view; Close View draws it on the floor)
function ring(ctx, x, y, R, held, C, still, t) {
  const W = WEAPON_ARTS.charge, top = -Math.PI / 2, k = artFill(held), w = artWindow(held), a0 = top + Math.PI * 2 * W.perfect[0] / W.max, a1 = top + Math.PI * 2 * W.perfect[1] / W.max;
  ctx.lineCap = "butt"; ctx.globalAlpha = .45; ctx.strokeStyle = C.track; ctx.lineWidth = Math.max(3, R * .12); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
  ctx.globalAlpha = .95; ctx.strokeStyle = C.perfect; ctx.beginPath(); ctx.arc(x, y, R, a0, a1); ctx.stroke();
  ctx.strokeStyle = w === "perfect" ? C.perfect : C.ring; ctx.lineWidth = Math.max(2, R * .07); ctx.beginPath(); ctx.arc(x, y, R, top, top + Math.PI * 2 * k); ctx.stroke();
  if (w === "perfect") { ctx.globalAlpha = still ? .5 : .35 + .25 * Math.sin(t * 20); ctx.strokeStyle = C.perfect; ctx.lineWidth = Math.max(2, R * .05); ctx.beginPath(); ctx.arc(x, y, R * 1.12, 0, 7); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function star(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * .28 : r; i ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + q, y); } ctx.closePath(); ctx.fill(); }
// One pass over the fixed pools; no allocation. Reduced motion and safe mode stop the turning and pulsing.
export function drawWeaponArts(ctx, game, toScreen, s, t) {
  const K = game.weaponArts; if (!K) return;
  const C = WEAPON_ARTS.colors, V = WEAPON_ARTS.view, still = !!(game.presentation?.reduceMotion || game.presentation?.safeMode), p = game.player;
  ctx.save(); try {
    const S = K.seal;
    if (S.on) { const T = WEAPON_ARTS.arts.transpose, [x, y] = toScreen(S), R = T.radius * s, fade = Math.min(1, S.left / .6, S.age / .2), spin = still ? 0 : S.age * .5;
      ctx.globalAlpha = .22 * fade; ctx.fillStyle = C.sealDeep; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      ctx.globalAlpha = .85 * fade; ctx.strokeStyle = K.buff ? C.sealCore : C.seal; ctx.lineWidth = Math.max(2, s * .06); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
      ctx.lineWidth = Math.max(1, s * .03); ctx.beginPath(); ctx.arc(x, y, R * .82, 0, 7); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = spin + i * Math.PI / 3, b = a + Math.PI * 2 / 3; ctx.moveTo(x + Math.cos(a) * R * .82, y + Math.sin(a) * R * .82); ctx.lineTo(x + Math.cos(b) * R * .82, y + Math.sin(b) * R * .82); } ctx.stroke(); // the hexagram
      ctx.fillStyle = C.seal; for (let i = 0; i < 12; i++) { const a = -spin + i * Math.PI / 6; ctx.fillRect(x + Math.cos(a) * R * .91 - s * .025, y + Math.sin(a) * R * .91 - s * .025, s * .05, s * .05); } // runes on the band
    }
    for (const f of K.flashes) { if (!(f.life > 0)) continue; const k = f.life / f.max, [x, y] = toScreen(f), R = f.r * s * (still ? 1 : 1.15 - .3 * k);
      if (f.kind === "dash") { const [x0, y0] = toScreen({ x: f.x0, y: f.y0 }); ctx.globalAlpha = .7 * k; ctx.strokeStyle = C.lava; ctx.lineCap = "round"; ctx.lineWidth = Math.max(3, s * .28 * k); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); continue; }
      const fill = f.kind === "eruption" ? C.lava : f.kind === "ki" ? C.ki : f.kind === "seal" ? C.seal : C.pikeTrail, line = f.kind === "eruption" ? C.lavaCore : f.kind === "ki" ? C.kiCore : f.kind === "seal" ? C.sealCore : C.pikeHead;
      ctx.globalAlpha = .4 * k; ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill();
      ctx.globalAlpha = k; ctx.strokeStyle = line; ctx.lineWidth = Math.max(2, s * .09 * k); ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.stroke();
      if (f.kind === "eruption") { ctx.strokeStyle = C.ember; ctx.lineWidth = Math.max(2, s * .06); ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i * 2 * Math.PI / 7 + .4; ctx.moveTo(x + Math.cos(a) * R * .15, y + Math.sin(a) * R * .15); ctx.lineTo(x + Math.cos(a) * R * .9, y + Math.sin(a) * R * .9); } ctx.stroke(); // the cracks
        ctx.fillStyle = C.lavaCore; for (let i = 0; i < 6; i++) { const a = i * 1.05, h = (1 - k) * s * (.6 + .3 * (i % 3)); ctx.fillRect(x + Math.cos(a) * R * .5 - s * .04, y + Math.sin(a) * R * .5 - h - s * .04, s * .08, s * .08); } } // flung embers
    }
    for (const st of K.streams) { if (!st.on) continue; const [x, y] = toScreen(centre(game)), R = WEAPON_ARTS.arts["blade-stream"].radius * s, a0 = still ? st.n : st.age * 22;
      ctx.lineCap = "round"; for (let i = 0; i < 5; i++) { const a = a0 + i * 2 * Math.PI / 5, r = R * (.45 + .45 * ((i * 37 + st.n * 11) % 10) / 10); ctx.globalAlpha = .85; ctx.strokeStyle = i % 2 ? C.stream : C.streamCore; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.arc(x, y, r, a, a + .9); ctx.stroke(); }
      ctx.globalAlpha = .18; ctx.fillStyle = C.streamCore; ctx.beginPath(); ctx.arc(x, y, R, 0, 7); ctx.fill(); }
    const W = K.windup;
    if (W.on) { const [x, y] = toScreen(centre(game)), L = s * 1.4, bx = x - W.dx * s * .55, by = y - W.dy * s * .55 - s * .25; // the pike drawn back over the shoulder
      ctx.globalAlpha = 1; ctx.strokeStyle = C.pike; ctx.lineWidth = Math.max(3, s * .08); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bx - W.dx * L * .3, by - W.dy * L * .3); ctx.lineTo(bx + W.dx * L * .7, by + W.dy * L * .7); ctx.stroke();
      ctx.fillStyle = C.pikeHead; ctx.beginPath(); ctx.arc(bx + W.dx * L * .7, by + W.dy * L * .7, s * .09, 0, 7); ctx.fill(); }
    for (const sh of K.shots) { if (!sh.on) continue; const [x, y] = toScreen(sh), lift = sh.air ? s * .5 : 0;
      if (sh.kind === "javelin") { const L = s * 1.3; ctx.globalAlpha = .5; ctx.strokeStyle = C.pikeTrail; ctx.lineWidth = Math.max(3, s * .14); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - sh.dx * L * 1.6, y - sh.dy * L * 1.6); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = 1; ctx.strokeStyle = C.pike; ctx.lineWidth = Math.max(2, s * .07); ctx.beginPath(); ctx.moveTo(x - sh.dx * L, y - sh.dy * L); ctx.lineTo(x, y); ctx.stroke();
        ctx.fillStyle = C.pikeHead; ctx.beginPath(); ctx.moveTo(x + sh.dx * s * .3, y + sh.dy * s * .3); ctx.lineTo(x - sh.dy * s * .1, y + sh.dx * s * .1); ctx.lineTo(x + sh.dy * s * .1, y - sh.dx * s * .1); ctx.closePath(); ctx.fill(); }
      else { const r = s * WEAPON_ARTS.arts["ki-blast"].radius * (sh.air ? 1.2 : 1); ctx.globalAlpha = .35; ctx.fillStyle = C.ki; ctx.beginPath(); ctx.arc(x, y - lift, r * 1.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = C.kiCore; ctx.beginPath(); ctx.arc(x, y - lift, r * .6, 0, 7); ctx.fill(); ctx.strokeStyle = C.ki; ctx.lineWidth = Math.max(2, s * .05); ctx.beginPath(); ctx.arc(x, y - lift, r, 0, 7); ctx.stroke(); }
    }
    const [px, py] = toScreen(centre(game));
    if (K.hold.on) ring(ctx, px, py, s * V.ring, K.hold.held, C, still, t);
    else if (K.armed && K.art && p.hp > 0) { const side = p.facing === "left" ? -1 : 1, gx = px + side * s * .3, gy = py - s * V.glint, k = still ? 1 : .75 + .25 * Math.sin(t * 5); // the armed glint at the weapon hand
      ctx.globalAlpha = .9 * k; ctx.fillStyle = C.glint; star(ctx, gx, gy, s * .13 * k); ctx.globalAlpha = .3 * k; ctx.beginPath(); ctx.arc(gx, gy, s * .12, 0, 7); ctx.fill(); }
  } finally { ctx.restore(); }
}
