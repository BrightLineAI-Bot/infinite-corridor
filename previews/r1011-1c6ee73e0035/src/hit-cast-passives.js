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
import { latticePassives } from "./transit-lattice.js?v=r1011-1c6ee73e0035";

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
  "glyph-mine": `Each cast leaves a sigil at your feet; it bursts on the first foe to step in, or after ${GLYPH_MINE.lifeMs / 1000} s. Up to ${GLYPH_MINE.max} at once.`,
};

// ---------------------------------------------------------------- who has what
export const castNodeOn = (save, id) => !!save?.constellation?.mods?.[id];
const fieldHeld = (save, id) => latticePassives(save).includes(`field:${id}`);
const B_TEMPO = 1, B_SHATTER = 2, B_POCKET = 4, B_EDGE = 8, B_RELOAD = 16;
function state(game) {
  let S = game._hcp;
  if (!S) {
    const n = RAPID_RELOAD.ring;
    S = game._hcp = { maskAt: NaN, maskSave: null, mask: 0, pocketAt: -Infinity, pocketSpells: {}, edge: { n: 0, el: null, at: -Infinity, riding: false },
      casts: 0, echoDue: false, windDue: 0, mines: [], rr: { next: 1, ids: new Array(n).fill(0), cost: new Array(n).fill(0), counted: new Array(n).fill(0), n: 0, paid: [0, 0, 0], readyAt: -Infinity, last: 0 } };
  }
  return S;
}
function mask(game, now) {
  const S = state(game);
  if (S.maskAt === now && S.maskSave === game.save) return S.mask;
  const s = game.save; let m = 0;
  if (fieldHeld(s, "tempo")) m |= B_TEMPO; if (fieldHeld(s, "shatterpoint")) m |= B_SHATTER; if (fieldHeld(s, "rapid-reload")) m |= B_RELOAD;
  if (castNodeOn(s, "pocket-time")) m |= B_POCKET; if (castNodeOn(s, "arcane-edge")) m |= B_EDGE;
  S.maskAt = now; S.maskSave = s; S.mask = m; return m;
}
export const rapidReloadOn = (save) => fieldHeld(save, "rapid-reload");

// ---------------------------------------------------------------- per-foe marks (runtime only)
const MARK = Symbol("hitCastMark");
function mark(e) {
  let r = e[MARK];
  if (!r) { r = { n: 0, start: -Infinity, last: -Infinity, vuln: -Infinity, weak: -Infinity }; Object.defineProperty(e, MARK, { value: r, writable: true, configurable: true, enumerable: false }); }
  return r;
}
export const passiveMarkOf = (e) => e?.[MARK] || null;
export const vulnerableUntil = (e) => Math.max(0, Number(e?.[MARK]?.vuln) || 0);
// The damage multiple a foe takes now (Tempo's window), and the multiple a foe's blows deal (Arcane Edge's Dusk weaken).
export const vulnScale = (e, now) => { const r = e?.[MARK]; return r && r.vuln > now ? 1 + TEMPO.vuln : 1; };
export const weakenScale = (e, now) => { const r = e?.[MARK]; return r && r.weak > now ? 1 - ARCANE_EDGE.dusk.share : 1; };
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
  const m = mask(game, now), r0 = e[MARK], vuln = !!r0 && r0.vuln > now;
  if (!m && !vuln) return;
  const S = state(game), melee = src === "melee" || (!!src && typeof src === "object" && (src.melee === true || src.brawler === true));
  let bonus = vuln ? TEMPO.vuln : 0;
  if (m & B_SHATTER && staggered(e)) bonus += SHATTERPOINT.bonus;
  if (m & B_EDGE && melee) bonus += edgeHit(game, S, e, now);
  if (bonus > 0) strike(game, e, actual * bonus);
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
function edgeHit(game, S, e, now) {
  const A = ARCANE_EDGE, E = S.edge;
  if (!(E.riding && now - E.at < A.gapMs)) { // a new attack takes a charge; the rest of that attack's foes ride on it
    if (!(E.n > 0)) { E.riding = false; return 0; }
    E.n--; E.at = now; E.riding = true;
  }
  edgeTouch(game, e, E.el, now);
  return A.bonus;
}
function edgeTouch(game, e, el, now) {
  const A = ARCANE_EDGE, p = game.player, big = !!(e.boss || e.eliteId || e.worldBeast);
  if (el === "fire") { const b = e.glyphBurn, dps = A.fire.dps + Math.round((game.save.level || 1) * A.fire.perLevel); e.glyphBurn = { until: Math.max(b?.until || 0, now + A.fire.ms), dps: Math.max(b?.dps || 0, dps), tick: b?.tick || 0 }; }
  else if (el === "dusk") mark(e).weak = now + A.dusk.ms;
  else if (el === "rift" && !big && !e.dead) {
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy), step = Math.min(A.rift.pull, d - A.rift.keep);
    if (step > 0) game.glyphWorld?.(now)?.nudge(e, dx / d * step, dy / d * step);
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
