// On-hit, on-cast and charge passives (Tim's batch, 2026-11-18/19). Pure data and rules; game.ts calls in.
//
// Where they live (no new economy, each mirrors how its neighbours are obtained):
// - Constellation nodes, learned with a constellation point once the branch's discipline has a rank (like its modifier), kept in
//   save.constellation.mods (no new save state; respec refunds them): Arcane Edge (Form), Casting Wind (Motion), Pocket Time
//   (Veil), Echoing Cast (Force), Glyph Mine (Rift). constellation.ts BRANCHES[*].extras.
// - Transit Lattice field passives (lattice-fields.ts FIELD_PASSIVES, keys `field:<id>`, nothing to learn): Tempo, Shatterpoint.
// - A Transit Lattice tool form (lattice-fields.ts TOOL_FORMS): Rapid Reload.
//
// Hit rules are the `hit` trigger's (game.ts landHit): the Wayfarer's own blows only, never a burn's tick, a proc (glyphWorld) or an
// Echo's copy; one attack counts once per foe (`gapMs`, as echoes.ts ON_HIT_ECHOES.perFoeGapMs). Extra damage these passives add
// goes straight to health and is never a hit itself, so nothing chains. Per-foe marks are runtime only (a non-enumerable symbol on
// the foe, never saved); the Game's own state is one object (`game._hcp`), so a hit allocates nothing.
import { latticePassives } from "./transit-lattice.js?v=r1027-968515978119";

// Tempo: every `hits`th hit on one foe within `windowMs` opens a window of `vulnMs` in which it takes `vuln` more from every source
// of the Wayfarer's damage (hits, procs and Echoes through glyphWorld, burns, the Echo bursts). One window a foe at a time; hits
// during it do not count, and the count starts again when it opens.
export const TEMPO = { hits: 5, windowMs: 4000, vuln: .25, vulnMs: 2000, gapMs: 60 };
// Shatterpoint: hits on a foe whose poise is broken (enemy-behaviour.ts: `bhv.stagger` left) or that is staggered harder than any
// ordinary blow's flinch (`hitStun` at least `stun` s; a swing's own flinch is .22 s) deal `bonus` more.
export const SHATTERPOINT = { bonus: .4, stun: .3 };
// Pocket Time: each melee hit (fists, Hammerfall and the Great Sweep included) while a timed skill holds lengthens it `step` s, at
// most `cap` s over one activation. The Aperture discipline that is active, and the timed spells named in `spells` (the Game's
// clock field for each). Aegis is left out on purpose: it turns every blow aside.
export const POCKET_TIME = { step: .15, cap: 3, gapMs: 60, spells: { "imbue-weapon": "imbueUntil", "shadow-boxing": "boxingUntil", "essence-walk": "essenceUntil" } };
// Arcane Edge: a spell cast empowers the next `hits` melee attacks (each foe an attack strikes) with `bonus` more, and the spell's
// element (spell-slots.ts CASTABLES attr) adds its touch to each foe struck.
export const ARCANE_EDGE = {
  hits: 3, bonus: .3, gapMs: 60,
  fire: { ms: 2000, dps: 3, perLevel: .4 }, // a short burn
  dusk: { ms: 2000, share: .25 }, // a brief weaken: the foe's blows take `share` less from you
  rift: { pull: .45, keep: .6 }, // pulled `pull` tiles toward you, never closer than `keep` (bosses, world beasts and elites hold)
  ward: { guard: 1.5 }, // s of the guard (35% less from every blow, as a guard draught)
  wind: { seconds: 2, move: .1 }, // move faster
  force: { stun: .35, bossShare: .25 }, // a stagger (bosses and elites a share, as every Wayfarer stagger)
};
// Glyph Mine: each cast leaves a sigil at your feet; it bursts (a proc, never a hit) on the first foe within `trigger` tiles or after
// `lifeMs`, striking every foe within `radius` for `share` of a spell of `power` (it grows with Focus). At most `max` at once: the
// oldest gives way. A sigil left in another place fades unburst.
export const GLYPH_MINE = { lifeMs: 4000, max: 3, trigger: .7, radius: 1.4, power: 8, share: .8 };
// Glyph Mine × Rift Step (Tim, 2026-11-19). With Glyph Mine learned, a Rift Step leaves a rift mine where it began and one where it
// lands (game.ts riftStepMine, called from constellation.ts riftCommit). A second step from (within `join` tiles of) the last
// landing adds only its landing: 1 step = 2 mines, 2 steps = 3. A step begun farther off adds its start too; at most `max` mines,
// the oldest giving way. Rift mines never burst: once the Rift Step charges are spent, or `graceMs` after the last step (charges
// left over), they link: 2 into a line, 3 into a filled triangle of inky void that lasts `voidMs`. Every `tickMs` it strikes every
// foe inside (the line: within `halfWidth` tiles of it; the triangle: inside it or within `halfWidth` of an edge) for `tickShare`
// of a spell of GLYPH_MINE.power (a proc through glyphWorld, never a hit: bosses and world beasts take it as every proc).
// One void at a time: a new one takes the old one's place. Leaving the place drops the mines and the void. Frame time (dt), so
// pause and background stop it; runtime only, like the sigils.
export const RIFT_MINE = { max: 3, join: 1, graceMs: 1500, voidMs: 6000, tickMs: 500, tickShare: .25, halfWidth: .45 };
// Encumbered (Tim, 2026-11-19: a pull build-up status, like bleed or frostbite build-up). Damage a pull deals (the Gravity Well's
// pulses and the perfect Orbit Volley's vortex, the awakened Hammerfall's clap, Mage's Hand's fist and suction cup, a Tether spell
// pulse, Maelstrom's dragging arcs, Arcane Edge's Rift touch; Maw's Hunger, a pull with no damage, adds `dry` of the Echo damage)
// fills a meter on every creature, bosses and the unmovable included, `gain` a point. At the creature's threshold (`threshold`:
// `share` of its maximum health times its class's `factor`, monster-pack.ts staggerClass; never under `min`) it is Encumbered for
// `durationMs`: it takes `takenMul` from every source of the Wayfarer's damage (as Tempo's window) and its blows deal `dealtMul`.
// The meter then empties, and fills nothing while Encumbered. With no pull damage for `decayDelayMs` it drains `decayPerSec` of
// the threshold a second. Frame time (dt); runtime only (the per-foe mark), as Tempo's window.
export const ENCUMBERED = { durationMs: 10000, takenMul: 1.05, dealtMul: .95, gain: 1, dry: .5, decayDelayMs: 3000, decayPerSec: .15,
  threshold: { share: .3, min: 12, factor: { ordinary: 1, elite: .7, revenant: .5, boss: .5 } } };
// Casting Wind (Tim's "Second Wind": that name is taken, Light Feet's secondary form): each cast gives back `share` of maximum
// stamina. A cast paid in stamina under Essence Walk gives back at most `essenceShare` of what it cost, so the walk always costs.
export const CASTING_WIND = { share: .15, essenceShare: .5 };
// Echoing Cast: every `every`th cast repeats `delayMs` later at `share` power: its pulses and shots again, free and with no
// cooldown. The repeat is an Echo copy (no on-hit, never counted). A cast with nothing to strike (a buff) repeats nothing.
export const ECHOING_CAST = { every: 4, share: .5, delayMs: 400 };
// Rapid Reload: every `shots`th charged release that hits gives back `share` of maximum stamina. One counter for every charged
// release (the Carbine's charged beam, the Aether Orrery's great orb, a charged or perfect Iron Fists punch, a weapon art, the
// Quandrix Staff's slam, a charged Orbit Volley launch (`orbitFill` of its charge or a perfect one), the Triceratops' horn). A
// release counts once however many foes it strikes; taps, misses, procs and Echo copies never. At most one refund every
// `cooldownMs` (a full count waits for it); each of the three gives at most a third of the refund, and one paid in stamina never
// more than it cost, so no stamina loop gains. `ring`: releases remembered at once.
export const RAPID_RELOAD = { shots: 3, share: .2, cooldownMs: 1500, ring: 8, orbitFill: .5 };

// Power Aegis (Tim, 2026-11-19: "a parry mechanic... a just-guard. The Aegis is a good vehicle for the parry... if you perfect-parry
// an attack with the Aegis, it refunds the Aegis's cooldown so you can use it again... if you time it perfectly, you parry the move...
// your next attack(s) — for the next 2–3 seconds — are empowered... Power Aegis. It's a passive"). A Transit Lattice field passive
// (lattice-fields.ts FIELD_PASSIVES, `field:power-aegis`: nothing to learn, like Tempo). With it held, a blow that would land in
// the first `windowMs` of an Aegis (game.ts castBrawler opens the window, `aegisPerfectUntil`) is a perfect parry (game.ts
// perfectParry): the blow is turned aside as the Aegis turns every blow; a foe that struck from within `reach` tiles is staggered `stun` s (bosses,
// world beasts, revenants and elites `bossShare` of it, monster-pack.ts staggerClass; the stagger governor still holds them);
// the Aegis is ready again at once (its cooldown and any Essence Walk lockout cleared); `staminaShare` of the stamina an Essence
// Walk cast of it cost comes back; and for `buffMs` the Wayfarer is empowered: melee attacks (swings, weapon arts, the Iron
// Fists, Hammerfall and the Great Sweep) deal `bonus` more, tool shots `toolBonus` more (Tim, 2026-11-19: tool shots get some
// of it). One parry an Aegis cast: the window closes on the first. Outside the window, or without the passive, the Aegis is
// exactly as before.
// `windowMs` is forgiving on purpose (Tim, 2026-11-19: "pretty generous"; touch latency on a phone): nearly half the 1 s ward.
// A blow counts by the frame its damage lands, which is when its wind-up ends, so a wind-up that ends inside the window parries.
// The reflect (Tim, 2026-11-19: "projectiles should be reflected back. It can reflect back basically anything — roars, beams,
// basically anything... you send the damage back"; game.ts parryBlow, aegisReflect, reflectBlow). The parried blow goes back:
//   a shot (the game's hostile projectiles, and a creature's moving bolt, orb, dart or debris) turns round, gold and friendly,
//   and flies `shotSpeed` times as fast (a creature's bolt: sent back from the Wayfarer at `boltSpeed` tiles/s) at the creature
//   that loosed it (else the nearest foe within `seek` tiles), homing `shotTurn`, for `shotLife` s, dealing `reflect` times its
//   damage to the foes it meets;
//   anything else (a blow, a roar, a beam, a breath, an aura, a shockwave, a blast on a marked spot) lands on the creature that
//   made it as direct damage, `reflect` times what the blow carried, with a gold flash on it. A boss, world beast or other
//   boss-class foe (monster-pack.ts staggerClass "boss") takes at most `bossCap` of its maximum health from one reflect; the
//   stagger governor still holds its poise. A blow with no creature behind it (a trap) has nothing to go back to.
// The parried blow's riders (burn, poison, bleed, confusion, slow, stun, curses, the frenzy) are not laid on the Wayfarer.
// The reflect is the Wayfarer's own hit (Tim, 2026-11-19: "reflected damage can count as your own hit"): a turned shot or a
// sent-back bolt strikes through the same projectile hit path as her tool shots, and direct reflected damage calls game.ts landHit
// as a hit does, so it gives the frenzy blow, on-hit Echoes, the on-hit passives' counts and marks (Tempo, Sanctuary's leech),
// kill credit and everything a kill sets off. It is not melee, not a tool shot and no charged release, and it carries no glyphs
// (nothing of hers loosed it). Its damage stays `reflect` times the blow (bosses `bossCap`), never scaled again: not by her
// damage scale, glyphs, Tempo's window, Shatterpoint or the Power Aegis empowerment (passiveHit adds no bonus strike to it).
// Command grabs are never parried (`grabs`, and any ATTACK_MODULES move tagged "grab"; `stalkerGrabs`: the Stalker's ape arm;
// `seaGrabs`: the sea creatures that bite and drag): the hold takes you even inside the window, and the Aegis blocks their
// damage exactly as it always did. Reflected shots are never reflected again (a psychic wall lets them by), and reflected damage,
// and anything its on-hit effects set off, never parries anything (game.ts `_reflecting`), so nothing ping-pongs.
export const POWER_AEGIS = { windowMs: 450, reach: 4, stun: .6, bossShare: .3, staminaShare: .5, buffMs: 2500, bonus: .4, toolBonus: .2,
  reflect: 1.5, bossCap: .15, /* Tim 2026-11-19: a perfect parry is a hard manoeuvre, so the reflect is substantial (Thorned Veil gives 30% passively) */ shotSpeed: 1.6, boltSpeed: 9, shotTurn: 10, shotLife: 2.4, seek: 12,
  grabs: ["psyGrab", "spinoGrab", "stegoJaws", "apatoWrap", "apatoCloneCoil", "wormGrab"], stalkerGrabs: ["grab", "grabPull"], seaGrabs: ["bogLurker", "angler"] };
export const CAST_NODE_IDS = ["arcane-edge", "casting-wind", "pocket-time", "echoing-cast", "glyph-mine"];
const pct = (v) => `${Math.round(v * 100)}%`;
export const PASSIVE_TEXT = {
  tempo: `Every ${TEMPO.hits}th hit you land on the same foe within ${TEMPO.windowMs / 1000} s marks it: for ${TEMPO.vulnMs / 1000} s it takes ${pct(TEMPO.vuln)} more from all your damage. One mark a foe at a time.`,
  shatterpoint: `Your hits on a staggered or poise-broken foe deal ${pct(SHATTERPOINT.bonus)} more.`,
  "rapid-reload": `Every ${RAPID_RELOAD.shots}rd charged release that hits (a charged Carbine beam, the Orrery's great orb, a charged punch, a weapon art, the staff's slam, a charged Orbit Volley) gives back ${pct(RAPID_RELOAD.share)} of your stamina, at most once every ${RAPID_RELOAD.cooldownMs / 1000} s. Taps and misses do not count.`,
  "arcane-edge": `Casting a spell empowers your next ${ARCANE_EDGE.hits} melee attacks: ${pct(ARCANE_EDGE.bonus)} more, with the spell's element (Fire burns, Dusk weakens, Rift pulls, Ward guards you, Wind speeds you, Force staggers).`,
  "casting-wind": `Each cast gives back ${pct(CASTING_WIND.share)} of your stamina (under Essence Walk, never more than half what the cast cost).`,
  "pocket-time": `Each melee hit while a timed skill holds (Veil Guard, Ember Form, Quickening, Force Channel, Imbue Weapon, Shadow Boxing, Essence Walk) lengthens it ${POCKET_TIME.step} s, up to ${POCKET_TIME.cap} s a use.`,
  "echoing-cast": `Every ${ECHOING_CAST.every}th cast repeats ${ECHOING_CAST.delayMs / 1000} s later at ${pct(ECHOING_CAST.share)} power, free.`,
  "power-aegis": `Cast the Aegis just as a blow lands (within ${POWER_AEGIS.windowMs / 1000} s) to parry it: Perfect! The attacker staggers (bosses and elites briefly), the Aegis is ready again at once, the blow goes back (a shot turns round and flies at its shooter; a blow, roar, beam or blast lands on its maker; it counts as your own hit), its burn, poison or slow never takes hold, and for ${POWER_AEGIS.buffMs / 1000} s your melee attacks deal ${pct(POWER_AEGIS.bonus)} more (tool shots ${pct(POWER_AEGIS.toolBonus)}). Command grabs cannot be parried. Later in the ward it blocks as always.`,
  "glyph-mine": `Each cast leaves a sigil at your feet; it bursts on the first foe to step in, or after ${GLYPH_MINE.lifeMs / 1000} s. Up to ${GLYPH_MINE.max} at once. A Rift Step leaves a mine where you stood and where you land; once your steps are spent (or ${RIFT_MINE.graceMs / 1000} s after the last) they link into inky void (2 mines a line, 3 a triangle) that wounds every foe inside for ${RIFT_MINE.voidMs / 1000} s.`,
};

// ---------------------------------------------------------------- who has what
export const castNodeOn = (save, id) => !!save?.constellation?.mods?.[id];
const fieldHeld = (save, id) => latticePassives(save).includes(`field:${id}`);
const B_TEMPO = 1, B_SHATTER = 2, B_POCKET = 4, B_EDGE = 8, B_RELOAD = 16, B_AEGIS = 32;
function state(game) {
  let S = game._hcp;
  if (!S) {
    const n = RAPID_RELOAD.ring;
    const k = RIFT_MINE.max;
    S = game._hcp = { maskAt: NaN, maskSave: null, mask: 0, pocketAt: -Infinity, pocketSpells: {}, edge: { n: 0, el: null, at: -Infinity, riding: false },
      casts: 0, echoDue: false, windDue: 0, mines: [], encLive: false, encSeen: false,
      rift: { n: 0, xs: new Array(k).fill(0), ys: new Array(k).fill(0), left: 0, where: "" },
      void: { on: false, n: 0, xs: new Array(k).fill(0), ys: new Array(k).fill(0), left: 0, tick: 0, dmg: 0, where: "" }, rr: { next: 1, ids: new Array(n).fill(0), cost: new Array(n).fill(0), counted: new Array(n).fill(0), n: 0, paid: [0, 0, 0], readyAt: -Infinity, last: 0 } };
  }
  return S;
}
function mask(game, now) {
  const S = state(game);
  if (S.maskAt === now && S.maskSave === game.save) return S.mask;
  const s = game.save; let m = 0;
  if (fieldHeld(s, "tempo")) m |= B_TEMPO; if (fieldHeld(s, "shatterpoint")) m |= B_SHATTER; if (fieldHeld(s, "rapid-reload")) m |= B_RELOAD; if (fieldHeld(s, "power-aegis")) m |= B_AEGIS;
  if (castNodeOn(s, "pocket-time")) m |= B_POCKET; if (castNodeOn(s, "arcane-edge")) m |= B_EDGE;
  S.maskAt = now; S.maskSave = s; S.mask = m; return m;
}
export const rapidReloadOn = (save) => fieldHeld(save, "rapid-reload");
export const powerAegisOn = (save) => fieldHeld(save, "power-aegis");
// Power Aegis's empowerment: ms left (0 when none, or without the passive).
export const powerAegisLeft = (game, now) => { const u = Number(game?.powerAegisUntil) || 0; return u > now && powerAegisOn(game.save) ? u - now : 0; };

// ---------------------------------------------------------------- per-foe marks (runtime only)
const MARK = Symbol("hitCastMark");
function mark(e) {
  let r = e[MARK];
  if (!r) { r = { n: 0, start: -Infinity, last: -Infinity, vuln: -Infinity, weak: -Infinity, pull: 0, idle: 0, enc: 0, th: 0, told: false }; Object.defineProperty(e, MARK, { value: r, writable: true, configurable: true, enumerable: false }); }
  return r;
}
export const passiveMarkOf = (e) => e?.[MARK] || null;
export const vulnerableUntil = (e) => Math.max(0, Number(e?.[MARK]?.vuln) || 0);
// The damage multiple a foe takes now (Tempo's window), and the multiple a foe's blows deal (Arcane Edge's Dusk weaken).
export const vulnScale = (e, now) => { const r = e?.[MARK]; return !r ? 1 : (r.vuln > now ? 1 + TEMPO.vuln : 1) * (r.enc > 0 ? ENCUMBERED.takenMul : 1); }; // Tempo's window; Encumbered
export const weakenScale = (e, now) => { const r = e?.[MARK]; return r && r.weak > now ? 1 - ARCANE_EDGE.dusk.share : 1; };
// Encumbered: s left (0 when not), the meter's fill 0..1, and the multiple a foe's blows deal now.
export const encumberedLeft = (e) => { const r = e?.[MARK]; return r && r.enc > 0 ? r.enc : 0; };
export const pullMeterOf = (e) => { const r = e?.[MARK]; return r && r.pull > 0 && r.th > 0 ? Math.min(1, r.pull / r.th) : 0; };
export const foeDealtScale = (e) => { const r = e?.[MARK]; return r && r.enc > 0 ? ENCUMBERED.dealtMul : 1; };
export const encumberedAny = (game) => !!game?._hcp?.encLive;
export const staggered = (e) => (Number(e?.bhv?.stagger) || 0) > 0 || (Number(e?.hitStun) || 0) >= SHATTERPOINT.stun;

// Arcane Edge's Wind: move faster for a while (read by game.ts characterStats, which knows only the save).
const WIND = new WeakMap();
export const edgeMoveBonus = (save) => (WIND.get(save) || 0) > 0 ? ARCANE_EDGE.wind.move : 0;

// Extra damage straight to health: the Wayfarer's, never a hit.
function strike(game, e, amount) {
  const n = Math.round(amount); if (!(n >= 1) || e.dead || !(e.hp > 0)) return 0;
  const before = e.hp; e.hp -= n; e.hitFlash = .18;
  game.astralPlayerHit?.(e, Math.max(0, before - Math.max(0, e.hp)));
  if (e.hp <= 0 && !e.dead) { e.dead = true; game.defeatEnemy?.(e); }
  return n;
}

// ---------------------------------------------------------------- the hit (game.ts landHit)
// `src`: "melee" (a swing or a weapon art), or the shot or effect that struck (`brawler` effects are melee: punches, Hammerfall,
// the Great Sweep; `rr`: the charged release it belongs to), or null.
export function passiveHit(game, e, actual, now, src = null) {
  if (!e || !(actual > 0) || !Number.isFinite(now)) return;
  const m = mask(game, now), r0 = e[MARK], vuln = !!r0 && r0.vuln > now, enc = !!r0 && r0.enc > 0;
  if (!m && !vuln && !enc) return;
  const reflected = !!src && typeof src === "object" && src.aegisReflected === true; // Power Aegis: a blow sent back (game.ts reflectBlow, turnShot)
  const S = state(game), melee = src === "melee" || (!!src && typeof src === "object" && (src.melee === true || src.brawler === true));
  let bonus = (vuln ? TEMPO.vuln : 0) + (enc ? ENCUMBERED.takenMul - 1 : 0); // Tempo's window; Encumbered
  if (m & B_SHATTER && staggered(e)) bonus += SHATTERPOINT.bonus;
  if (m & B_EDGE && melee) bonus += edgeHit(game, S, e, now, actual);
  if (m & B_AEGIS && (Number(game.powerAegisUntil) || 0) > now) bonus += melee ? POWER_AEGIS.bonus : src && typeof src === "object" && src.glyphHost === "tool" ? POWER_AEGIS.toolBonus : 0; // Power Aegis
  if (bonus > 0 && !reflected) strike(game, e, actual * bonus); // a Power Aegis reflect deals its own amount only (no double dip)
  if (m & B_TEMPO && !e.dead) tempoCount(e, now);
  if (m & B_POCKET && melee) pocket(game, S, now);
  if (m & B_RELOAD && src && typeof src === "object" && src.rr > 0) reloadCount(S, src.rr);
}
function tempoCount(e, now) {
  const T = TEMPO, r = mark(e);
  if (r.vuln > now || now - r.last < T.gapMs) return;
  r.last = now;
  if (r.n === 0 || now - r.start > T.windowMs) { r.start = now; r.n = 0; }
  if (++r.n >= T.hits) { r.n = 0; r.start = -Infinity; r.vuln = now + T.vulnMs; }
}
const POCKET_SPELLS = Object.entries(POCKET_TIME.spells);
function pocket(game, S, now) {
  const P = POCKET_TIME; if (now - S.pocketAt < P.gapMs) return; S.pocketAt = now;
  const a = game.save.magicSkills?.active;
  if (a && a.remaining > 0) { const had = Number(a.pocket) || 0, add = Math.min(P.step, Math.max(0, P.cap - had)); if (add > 0) { a.remaining += add; a.pocket = had + add; } }
  for (let i = 0; i < POCKET_SPELLS.length; i++) {
    const field = POCKET_SPELLS[i][1], until = Number(game[field]) || 0; if (!(until > now)) continue;
    const q = S.pocketSpells[field] ||= { until: -1, added: 0 };
    if (q.until !== until) q.added = 0; // a new casting
    const add = Math.min(P.step, Math.max(0, P.cap - q.added));
    if (add > 0) { game[field] = until + add * 1000; q.added += add; }
    q.until = game[field];
  }
}
function edgeHit(game, S, e, now, actual) {
  const A = ARCANE_EDGE, E = S.edge;
  if (!(E.riding && now - E.at < A.gapMs)) { // a new attack takes a charge; the rest of that attack's foes ride on it
    if (!(E.n > 0)) { E.riding = false; return 0; }
    E.n--; E.at = now; E.riding = true;
  }
  edgeTouch(game, e, E.el, now, actual);
  return A.bonus;
}
function edgeTouch(game, e, el, now, actual = 0) {
  const A = ARCANE_EDGE, p = game.player, big = !!(e.boss || e.eliteId || e.worldBeast);
  if (el === "fire") { const b = e.glyphBurn, dps = A.fire.dps + Math.round((game.save.level || 1) * A.fire.perLevel); e.glyphBurn = { until: Math.max(b?.until || 0, now + A.fire.ms), dps: Math.max(b?.dps || 0, dps), tick: b?.tick || 0 }; }
  else if (el === "dusk") mark(e).weak = now + A.dusk.ms;
  else if (el === "rift" && !e.dead) {
    if (actual > 0) game.pullBuild?.(e, actual, now); // Encumbered: the pull's hit counts, the foe held or not
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy), step = Math.min(A.rift.pull, d - A.rift.keep);
    if (!big && step > 0) game.glyphWorld?.(now)?.nudge(e, dx / d * step, dy / d * step);
  }
  else if (el === "ward") game.guardRemaining = Math.max(Number(game.guardRemaining) || 0, A.ward.guard);
  else if (el === "wind") WIND.set(game.save, A.wind.seconds);
  else if (el === "force") e.hitStun = Math.max(e.hitStun || 0, big ? A.force.stun * A.force.bossShare : A.force.stun);
}

// ---------------------------------------------------------------- the cast (echoes.ts echoEvent "spell")
// `attr`: the spell's element. `essence`: the stamina the cast costs under Essence Walk (0: it is free).
export function passiveCast(game, now, attr = null, essence = 0) {
  const s = game.save, S = state(game), p = game.player;
  if (castNodeOn(s, "arcane-edge") && attr) { const E = S.edge; E.n = ARCANE_EDGE.hits; E.el = attr; E.riding = false; E.at = -Infinity; }
  if (castNodeOn(s, "glyph-mine")) {
    const G = GLYPH_MINE, list = S.mines; if (list.length >= G.max) list.shift();
    list.push({ x: p.x + .5, y: p.y + .45, born: now, until: now + G.lifeMs, where: game.areaId?.() ?? "" });
  }
  if (castNodeOn(s, "casting-wind") && p.hp > 0) {
    const C = CASTING_WIND, max = Number(s.maxStamina) || 0, want = max * C.share;
    if (essence > 0) S.windDue = Math.min(want, essence * C.essenceShare); // given back once the cost is paid (settleCastWind)
    else p.stamina = Math.min(max, (Number(p.stamina) || 0) + want);
  }
  if (castNodeOn(s, "echoing-cast") && ++S.casts >= ECHOING_CAST.every) { S.casts = 0; S.echoDue = true; }
}
// Essence Walk's cast, after its stamina is spent (true) or refused (false).
export function settleCastWind(game, paid) {
  const S = state(game), due = S.windDue; S.windDue = 0;
  if (paid && due > 0 && game.player.hp > 0) game.player.stamina = Math.min(Number(game.save.maxStamina) || 0, (Number(game.player.stamina) || 0) + due);
}
// The cast's repeat (game.ts castSpell, after a cast that went off): copies of the pulses and shots it made, `delayMs` later.
export function echoingRecast(game, fromEffects, fromShots, now) {
  const S = state(game); if (!S.echoDue) return 0; S.echoDue = false;
  const E = ECHOING_CAST, share = (v) => Math.max(1, Math.round((Number(v) || 0) * E.share));
  if (game.orbit && !game.orbit.flight) { game.orbit.recast = true; return 1; } // Orbit Volley gathered: its burst repeats
  let n = 0; const fx = game.effects || [], shots = game.projectiles || [], fxEnd = fx.length, shotEnd = shots.length;
  for (let i = Math.max(0, fromEffects); i < fxEnd; i++) { const f = fx[i]; if (!f || f.hostile || f.echo || !(f.damage > 0)) continue;
    fx.push({ ...f, id: `${f.id}-recast`, hits: {}, delay: (Number(f.delay) || 0) + E.delayMs / 1000, damage: share(f.damage), echo: true, recast: true }); n++; }
  for (let i = Math.max(0, fromShots); i < shotEnd; i++) { const q = shots[i]; if (!q || q.hostile || q.echo || !(q.damage > 0)) continue;
    (game.glyphTimers ||= []).push({ at: now + E.delayMs, kind: "shot", shot: { ...q, id: `${q.id}-recast`, hits: {}, damage: share(q.damage), echo: true, recast: true, rr: 0 } }); n++; }
  return n;
}
// Orbit Volley's burst repeated (game.ts tickOrbit).
export function recastBurst(burst) { const E = ECHOING_CAST; return { ...burst, id: `${burst.id}-recast`, hits: {}, delay: E.delayMs / 1000, damage: Math.max(1, Math.round(burst.damage * E.share)), echo: true, recast: true, rr: 0 }; }
export const glyphMinesOf = (game) => game?._hcp?.mines || [];

// ---------------------------------------------------------------- Glyph Mine × Rift Step (RIFT_MINE)
// A Rift Step taken (constellation.ts riftCommit): `from` and `to` are the Wayfarer's positions (top-left, as p.x/p.y) before and
// after; `charges`: Rift Step charges left. Nothing without Glyph Mine.
function riftPush(R, x, y) {
  const k = RIFT_MINE.max;
  if (R.n >= k) { for (let i = 1; i < k; i++) { R.xs[i - 1] = R.xs[i]; R.ys[i - 1] = R.ys[i]; } R.n = k - 1; } // the oldest gives way
  R.xs[R.n] = x; R.ys[R.n] = y; R.n++;
}
export function riftStepMine(game, from, to, charges, now) {
  if (!castNodeOn(game.save, "glyph-mine") || !from || !to) return false;
  const fx = Number(from.x) + .5, fy = Number(from.y) + .45, tx = Number(to.x) + .5, ty = Number(to.y) + .45;
  if (![fx, fy, tx, ty].every(Number.isFinite)) return false;
  const S = state(game), R = S.rift, where = game.areaId?.() ?? "";
  if (R.n > 0 && R.where !== where) R.n = 0; // mines left in another place are gone
  if (!(R.n > 0 && Math.hypot(R.xs[R.n - 1] - fx, R.ys[R.n - 1] - fy) <= RIFT_MINE.join)) riftPush(R, fx, fy); // a step from the last landing adds only where it lands
  riftPush(R, tx, ty);
  R.where = where; R.left = RIFT_MINE.graceMs / 1000;
  if (!(Number(charges) >= 1)) riftLink(game, now); // every charge spent: they link now
  return true;
}
// The pending mines link into the void (two or three of them); a lone mine fades.
function riftLink(game, now) {
  const S = state(game), R = S.rift, V = S.void, n = R.n; R.n = 0; R.left = 0;
  if (n < 2) return false;
  const power = typeof game.spellPower === "function" ? Number(game.spellPower({ damage: GLYPH_MINE.power })) || GLYPH_MINE.power : GLYPH_MINE.power;
  for (let i = 0; i < n; i++) { V.xs[i] = R.xs[i]; V.ys[i] = R.ys[i]; }
  V.n = n; V.on = true; V.left = RIFT_MINE.voidMs / 1000; V.tick = 0; V.where = R.where; V.dmg = Math.max(1, Math.round(power * RIFT_MINE.tickShare)); // one at a time: the old one gives way
  return true;
}
// Distance from (px, py) to the segment a–b.
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy, t = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L)) : 0;
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}
// Whether a point (a foe's middle, with `pad` for a big body) lies in the void `V`.
export function inRiftVoid(V, px, py, pad = 0) {
  if (!V?.on || !(V.n >= 2)) return false;
  const w = RIFT_MINE.halfWidth + Math.max(0, pad), x = V.xs, y = V.ys;
  if (V.n === 2) return segDist(px, py, x[0], y[0], x[1], y[1]) <= w;
  const d1 = (px - x[1]) * (y[0] - y[1]) - (x[0] - x[1]) * (py - y[1]), d2 = (px - x[2]) * (y[1] - y[2]) - (x[1] - x[2]) * (py - y[2]), d3 = (px - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (py - y[0]);
  if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) return true; // inside (or on) the triangle
  return segDist(px, py, x[0], y[0], x[1], y[1]) <= w || segDist(px, py, x[1], y[1], x[2], y[2]) <= w || segDist(px, py, x[2], y[2], x[0], y[0]) <= w;
}
// For the views: the pending rift mines ({ n, xs, ys }) and the void (or null).
export const riftMinesOf = (game) => game?._hcp?.rift || null;
export const riftVoidOf = (game) => game?._hcp?.void?.on ? game._hcp.void : null;
function tickRift(game, S, dt, now) {
  const R = S.rift, V = S.void, where = game.areaId?.() ?? "";
  if (R.n > 0) { if (R.where !== where) { R.n = 0; R.left = 0; } else if ((R.left -= dt) <= 0) riftLink(game, now); }
  if (!V.on) return;
  if (V.where !== where) { V.on = false; return; }
  V.left -= dt; V.tick += dt;
  const T = RIFT_MINE.tickMs / 1000;
  if (V.tick >= T) {
    V.tick -= T * Math.floor(V.tick / T); // one strike a tick however long the frame (never a burst of catch-up strikes)
    const list = game.enemies || []; let world = null;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (e.dead || e.untargetable || e.kind === "npc" || !(e.hp > 0)) continue;
      if (!inRiftVoid(V, e.x + .5, e.y + .45, (Number(e.bodyRadius) || .38) - .38)) continue;
      (world ||= game.glyphWorld?.(now))?.damage(e, V.dmg);
    }
  }
  if (V.left <= 0) V.on = false;
}

// ---------------------------------------------------------------- Encumbered (ENCUMBERED)
// The threshold of foe `e` of stagger class `cls` (monster-pack.ts staggerClass: "boss", "revenant", "elite" or null).
export function encumberThreshold(e, cls = null) {
  const T = ENCUMBERED.threshold, max = Number(e?.maxHp) || Number(e?.hp) || 0, f = T.factor[cls || "ordinary"] ?? 1;
  return Math.max(T.min, max * T.share * f);
}
// Damage a pull dealt to `e` (or a pull's worth, for one with no damage): fills its meter; true when it becomes Encumbered.
export function pullBuild(game, e, amount, now, cls = null) {
  if (!e || e.dead || e.kind === "npc" || !(amount > 0) || !Number.isFinite(amount)) return false;
  const r = mark(e); if (r.enc > 0) return false; // no build-up while Encumbered
  const E = ENCUMBERED, th = encumberThreshold(e, cls);
  const S = state(game); r.th = th; r.pull += amount * E.gain; r.idle = 0; S.encLive = S.encSeen = true;
  if (r.pull < th) return false;
  r.pull = 0; r.enc = E.durationMs / 1000;
  if (!r.told && (cls === "boss" || cls === "revenant")) { r.told = true; game.message = `${e.name || "Your foe"} is Encumbered: for ${E.durationMs / 1000} s it takes ${pct(E.takenMul - 1)} more and deals ${pct(1 - E.dealtMul)} less.`; }
  return true;
}
function tickEncumbered(game, S, dt) {
  const E = ENCUMBERED, list = game.enemies || [], wait = E.decayDelayMs / 1000; let live = false;
  for (let i = 0; i < list.length; i++) {
    const r = list[i]?.[MARK]; if (!r) continue;
    if (r.enc > 0) { r.enc = Math.max(0, r.enc - dt); live = true; }
    if (r.pull > 0) { r.idle += dt; if (r.idle >= wait) r.pull = Math.max(0, r.pull - r.th * E.decayPerSec * dt); live = true; }
  }
  S.encLive = live; // read by encumberedAny (a foe's shots); the pass itself goes on every frame once any meter has filled (`encSeen`),
  // so a marked foe met again after leaving the place picks up where its clock stopped
}

// ---------------------------------------------------------------- charged releases (Rapid Reload)
// A new charged release: its id, to set as `rr` on what it fires. `cost`: stamina it took (0 for most).
export function chargedRelease(game, cost = 0) {
  const R = state(game).rr, id = R.next++, k = id % RAPID_RELOAD.ring;
  R.ids[k] = id; R.cost[k] = Math.max(0, Number(cost) || 0); R.counted[k] = 0;
  return id;
}
function reloadCount(S, id) {
  const R = S.rr, k = id % RAPID_RELOAD.ring;
  if (R.ids[k] !== id || R.counted[k] || R.n >= RAPID_RELOAD.shots) return;
  R.counted[k] = 1; R.paid[R.n++] = R.cost[k];
}
// The pips (0..shots), or -1 when Rapid Reload is not held.
export const reloadPips = (game) => rapidReloadOn(game?.save) ? (game._hcp?.rr.n || 0) : -1;

// ---------------------------------------------------------------- a frame
export function tickHitCastPassives(game, dt, now) {
  const S = game._hcp; if (!S) return;
  const step = dt > 0 && Number.isFinite(dt) ? dt : 0;
  if (S.rift.n > 0 || S.void.on) tickRift(game, S, step, now); // Glyph Mine × Rift Step
  if (S.encSeen) tickEncumbered(game, S, step); // Encumbered: its clock and the meters' decay
  const w = WIND.get(game.save); if (w > 0) WIND.set(game.save, Math.max(0, w - (dt > 0 ? dt : 0)));
  if (S.mines.length) {
    const G = GLYPH_MINE, where = game.areaId?.() ?? "", list = game.enemies || [];
    for (let i = 0; i < S.mines.length; i++) {
      const m = S.mines[i]; let go = now >= m.until;
      if (m.where !== where) { S.mines.splice(i--, 1); continue; }
      if (!go) for (let k = 0; k < list.length; k++) { const e = list[k]; if (!e.dead && !e.untargetable && e.kind !== "npc" && Math.hypot(e.x + .5 - m.x, e.y + .45 - m.y) <= G.trigger) { go = true; break; } }
      if (!go) continue;
      S.mines.splice(i--, 1);
      const dmg = Math.max(1, Math.round((typeof game.spellPower === "function" ? Number(game.spellPower({ damage: G.power })) || G.power : G.power) * G.share));
      game.glyphWorld?.(now)?.blast(m.x, m.y, G.radius, dmg);
    }
  }
  const R = S.rr, RR = RAPID_RELOAD;
  if (R.n >= RR.shots && now >= R.readyAt && rapidReloadOn(game.save)) {
    const p = game.player, max = Number(game.save.maxStamina) || 0, third = max * RR.share / RR.shots;
    let amount = 0; for (let i = 0; i < RR.shots; i++) amount += R.paid[i] > 0 ? Math.min(third, R.paid[i]) : third;
    if (p.hp > 0) p.stamina = Math.min(max, (Number(p.stamina) || 0) + amount);
    R.n = 0; R.readyAt = now + RR.cooldownMs; R.last = amount;
  }
}
