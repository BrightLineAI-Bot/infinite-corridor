// The dino duel's choreography (Tim, 2026-11-14): when the Spinosaurus and the Wild Stegosaurus meet, they seek each other out and fight,
// and by DINO_DUEL.cap seconds one has come out ahead. Pure and deterministic (hashed seeds, no Math.random); the game (game.ts
// dinoDuelTick) and the creatures' brains (monster-pack.ts) call it. It changes the creatures it is given and nothing else.
//
// - A duel: a living Spinosaurus and a living Wild Stegosaurus, both roused, within `range` tiles of each other. Each keeps the duel on
//   itself (e.dinoDuel: { foe, start, t, hp, byRival, rivalSeen, byYou, apart, verdict }), so a save in the middle of one (the area
//   snapshot keeps its creatures) resumes it at the same second with the same verdict. Additive at schema 14: a creature field.
// - Before the verdict the two trade blows that take a growing share of the victim's health (`escalate`), but neither takes the other
//   below `hold` of its health (the Wayfarer can). The verdict comes at `verdictAt` s, or at once when either is down to `breakAt`.
// - The verdict: who loses is weighted (`weights`) by the health each has left (the Wayfarer's blows included), by the share of her
//   blows each has taken, and by a coin flip hashed on the two ids and the duel's start. How it ends (`endings`, hashed too):
//   "kill": from then on the winner's blows take at least `finish` of the loser's health with no floor, and at `cap` s the winner
//   lands the last one itself. The kill is the other beast's: the Wayfarer gets nothing for it (game.ts dinoEaten), and the winner
//   feeds `feed` s. "escape": the loser breaks off and flees (game.ts dinoEscape: a world beast's own retreat, keeping its wounds;
//   any other off the edge of the area). The winner stays. If the Wayfarer kills one first, it is hers, with every reward.
import { hashSeed } from "./random.js?v=r1040-9a67fad23d7b";

export const DINO_DUEL = {
  version: 1,
  kinds: ["spinoRex", "wildStego"],
  // The pairs that duel, leader first (the leader's record runs the duel's clock; its id comes first in the hashed coin and ending).
  // The first is the original duel, unchanged; the Earth Apatosaurus (Tim, 2026-11-18) duels each of the two, and they are listed
  // after it so a Spinosaurus that meets both still finds the Wild Stegosaurus first. It never duels a Triceratops.
  pairs: [["spinoRex", "wildStego"], ["earthApato", "spinoRex"], ["earthApato", "wildStego"]],
  range: 16, part: 24, partFor: 5, /* begun within `range`; ended when they stay more than `part` apart for `partFor` s */
  cap: 90, verdictAt: 50, breakAt: .35, hold: .3,
  escalate: { from: .025, to: .06, over: 60 }, /* a blow's share of the victim's health, from `from` to `to` over `over` s */
  finish: .12,
  // A blow of a many-blow grab counts this share of a blow (the stego's shakes, the Spinosaurus's chews).
  weight: { stegoJaws: .3, chew: .5 },
  // The loser is the one with the higher score: weights.health × (1 - health share left) + weights.fought × (its share of the
  // Wayfarer's damage to the two) + weights.coin × its side of the hashed coin.
  weights: { health: .8, fought: .6, coin: 1 },
  endings: { kill: 50, escape: 50 }, /* % of verdicts */
  feed: 3.5,
  escape: { speed: 3.4 },
  // Spacing (Tim, 2026-11-14: "not clipping in and out of each other"): their Close View bodies are several tiles long, so in the duel
  // they stand `gap` tiles farther apart than their bodies' radii ask, and a blow between them reaches `reach` tiles farther (it is
  // measured to the near side of the other's bulk: monster-pack.ts duelReachPoint).
  spacing: { gap: 2.5, reach: 2.5, slack: .8 }, /* closer than `slack` inside its spacing, each backs off */
  // Screen shake (game.ts spinoShake through w.shake; spino-rex.ts shakeOffset gives none under Reduced Motion): its power by kind of
  // big move, never above `max`, at most once each `gap` s from either duellist, lasting `seconds`.
  shake: { land: .45, big: .6, roar: .5, slam: .55, wheel: .4, rock: .22, max: .7, gap: .35, seconds: .55 },
  // Rockfall under a ceiling (any interior): `rocks` telegraphed for `warn` s in a ring around a slam, at most `live` at once, the
  // next slam's at least `gap` s later; each takes `share` of the slammer's damage from whatever stands under it (never the duellists).
  rockfall: { rocks: 3, live: 6, ring: [1.2, 4.2], warn: 1.1, radius: .75, share: .5, gap: .8 },
  names: { spinoRex: "the Spinosaurus", wildStego: "the Wild Stegosaurus", earthApato: "the Earth Apatosaurus" },
  // The blow a winner lands at the cap (its sound cue).
  finisher: { spinoRex: "spinoBite", wildStego: "stegoTailWhack", earthApato: "apatoNeckSlam" },
  text: { eaten: "{winner} devours {loser}. Its spoils are lost.", escape: "{loser} breaks off, badly wounded, and flees." },
};
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export function duelText(kind, winner, loser) {
  const N = DINO_DUEL.names, t = DINO_DUEL.text[kind] || "";
  return cap1(t.replace("{winner}", N[winner?.kind] || "the beast").replace("{loser}", N[loser?.kind] || "the beast"));
}
export const DUEL_KINDS = Object.freeze([...new Set(DINO_DUEL.pairs.flat())]);
export const isDuellist = (e) => !!e && DUEL_KINDS.includes(e.kind);
// Do a and b duel each other (either way round)? And does `a` lead their duel?
export const duelPair = (a, b) => !!a && !!b && a !== b && DINO_DUEL.pairs.some(([x, y]) => (a.kind === x && b.kind === y) || (a.kind === y && b.kind === x));
export const duelLeads = (a, b) => !!a && !!b && DINO_DUEL.pairs.some(([x, y]) => a.kind === x && b.kind === y);
const free = (e) => !!e && !e.dead && e.hp > 0 && !e.retreating && !e.fleeTo && !e.passingBeast && !e.illusion && !e.dinoFled;
export const duelShare = (t, E = DINO_DUEL.escalate) => E.from + (E.to - E.from) * Math.max(0, Math.min(1, (Number(t) || 0) / E.over));
// The duel `e` is in, with `foe` (or any foe), or null.
export function duelOf(e, foe = null) { const d = e?.dinoDuel; return d && typeof d === "object" && typeof d.foe === "string" && (!foe || d.foe === foe.id) ? d : null; }
export const duelWinner = (e) => duelOf(e)?.verdict?.winner === e?.id;
// A blow (or a wound with no source: the Spinosaurus's bleed) on `v` from `a` in their duel: { amount, floor }, or null outside one.
export function duelBlow(a, v, amount, weight = 1) {
  const d = duelOf(v); if (!d || !v || v.dead) return null;
  if (a && (a.id !== d.foe || duelOf(a)?.foe !== v.id)) return null;
  const max = Number(v.maxHp) || 1, kill = d.verdict?.end === "kill" && d.verdict.loser === v.id;
  const n = a ? Math.ceil(max * Math.max(duelShare(d.t), kill ? DINO_DUEL.finish : 0) * weight) : Math.max(0, Number(amount) || 0);
  const floor = kill ? 0 : Math.ceil(max * DINO_DUEL.hold);
  return { amount: Math.max(0, Math.min(n, (Number(v.hp) || 0) - floor)), floor };
}
// What the other beast (or its bleed) took off `v`: kept apart from the Wayfarer's blows.
export function noteRivalHurt(v, n) { const d = duelOf(v); if (d && n > 0) d.byRival = (Number(d.byRival) || 0) + n; }
export const duelCoin = (spinoId, stegoId, start) => (hashSeed(`dino-duel:v${DINO_DUEL.version}:${spinoId}|${stegoId}|${start}`) % 1000) / 1000;
export const duelEnding = (spinoId, stegoId, start) => hashSeed(`dino-duel:end:v${DINO_DUEL.version}:${spinoId}|${stegoId}|${start}`) % 100 < DINO_DUEL.endings.kill ? "kill" : "escape";
// The verdict: { loser, winner, end, at }.
export function duelVerdict(spino, stego, W = DINO_DUEL.weights) {
  const ds = duelOf(spino), dt = duelOf(stego), start = ds?.start ?? dt?.start ?? 0;
  const hurt = (e) => 1 - Math.max(0, Math.min(1, (Number(e.hp) || 0) / (Number(e.maxHp) || 1)));
  const ys = Number(ds?.byYou) || 0, yt = Number(dt?.byYou) || 0, all = ys + yt, share = (y) => all > 0 ? y / all : .5, coin = duelCoin(spino.id, stego.id, start);
  const sSpino = W.health * hurt(spino) + W.fought * share(ys) + W.coin * coin, sStego = W.health * hurt(stego) + W.fought * share(yt) + W.coin * (1 - coin);
  const lose = sSpino > sStego ? spino : stego, win = lose === spino ? stego : spino;
  return { loser: lose.id, winner: win.id, end: duelEnding(spino.id, stego.id, start), at: Math.round((Number(ds?.t) || 0) * 100) / 100 };
}
// Where a loser with no retreat of its own runs: straight off the nearest edge of the area.
export function dinoFleeEdge(e, width = 32, height = 32) {
  const x = Number(e.x) || 0, y = Number(e.y) || 0, sides = [[x, -1.5, y], [y, x, -1.5], [width - 1 - x, width + .5, y], [height - 1 - y, x, height + .5]];
  sides.sort((a, b) => a[0] - b[0]); const [, tx, ty] = sides[0];
  return { retreating: true, dinoFled: true, aggro: true, fleeTo: { x: tx, y: ty, side: null }, fleePath: [], fleeSpeed: DINO_DUEL.escape.speed };
}
function begin(spino, stego, clock) {
  const start = Math.round(Number(clock) || 0);
  for (const [e, foe] of [[spino, stego], [stego, spino]]) e.dinoDuel = { foe: foe.id, start, t: 0, hp: Number(e.hp) || 0, byRival: 0, rivalSeen: 0, byYou: 0, apart: 0, verdict: null };
}
const clear = (...list) => { for (const e of list) if (e) delete e.dinoDuel; };
// One step of every duel among `enemies`. ctx: { clock (s, for a new duel's start), width, height, escape(loser, winner),
// eaten(loser, winner), kill(winner, loser), say(text), cue(cue) }. Returns what happened: [{ type, ... }].
export function tickDinoDuels(enemies, dt, ctx = {}) {
  const out = [], D = DINO_DUEL; if (!(dt > 0)) return out;
  const list = enemies || [], byId = (id) => list.find((q) => q.id === id) || null;
  for (const e of list) {
    const d = duelOf(e); if (!d) continue;
    const foe = byId(d.foe);
    if (foe && !duelLeads(e, foe)) continue; // the other side leads this duel
    const spino = e, stego = foe; // the leader and the led (the names of the first pair)
    if (!foe || !duelOf(foe, spino)) { clear(spino); continue; }
    // Wayfarer's share: what each lost since the last step that the other beast did not take
    for (const q of [spino, stego]) { const r = q.dinoDuel, hp = Number(q.hp) || 0, rival = (Number(r.byRival) || 0) - (Number(r.rivalSeen) || 0); r.byYou = (Number(r.byYou) || 0) + Math.max(0, (Number(r.hp) || 0) - hp - rival); r.hp = hp; r.rivalSeen = Number(r.byRival) || 0; }
    // a fall: to the other beast (eaten: nothing is hers), or to the Wayfarer (hers in full); the duel is over either way
    const fallen = [spino, stego].find((q) => q.dead || !(q.hp > 0));
    if (fallen) { const other = fallen === spino ? stego : spino;
      if (fallen.noRewards && !fallen.dinoEaten) { fallen.dinoEaten = true; ctx.eaten?.(fallen, other); out.push({ type: "eaten", loser: fallen.id, winner: other.id, t: d.t }); }
      else if (!fallen.noRewards) out.push({ type: "slain", loser: fallen.id, t: d.t });
      clear(spino, stego); continue; }
    if (!free(spino) || !free(stego)) { clear(spino, stego); out.push({ type: "end", t: d.t }); continue; }
    const apart = Math.hypot(spino.x - stego.x, spino.y - stego.y) > D.part; d.apart = apart ? (Number(d.apart) || 0) + dt : 0;
    if (d.apart >= D.partFor) { clear(spino, stego); out.push({ type: "parted", t: d.t }); continue; }
    d.t = (Number(d.t) || 0) + dt; stego.dinoDuel.t = d.t;
    const low = (q) => (Number(q.hp) || 0) <= (Number(q.maxHp) || 1) * D.breakAt;
    if (!d.verdict && (d.t >= D.verdictAt || low(spino) || low(stego))) {
      const v = duelVerdict(spino, stego); d.verdict = { ...v }; stego.dinoDuel.verdict = { ...v }; out.push({ type: "verdict", ...v });
      if (v.end === "escape") { const loser = byId(v.loser), winner = byId(v.winner); ctx.say?.(duelText("escape", winner, loser)); ctx.cue?.({ who: loser.kind, id: loser.id, phase: "flee", move: loser.kind, x: loser.x, y: loser.y });
        clear(spino, stego); if (ctx.escape) ctx.escape(loser, winner); else Object.assign(loser, dinoFleeEdge(loser, ctx.width, ctx.height)); out.push({ type: "escape", loser: v.loser, winner: v.winner, t: d.t }); continue; }
    }
    // the cap: the winner lands the last blow itself
    if (d.verdict?.end === "kill" && d.t >= D.cap) {
      const loser = byId(d.verdict.loser), winner = byId(d.verdict.winner);
      if (ctx.kill) ctx.kill(winner, loser); else { loser.hp = 0; loser.dead = true; loser.noRewards = true; }
      ctx.cue?.({ who: winner.kind, id: winner.id, phase: "hit", move: D.finisher[winner.kind] || "stegoTailWhack", x: loser.x, y: loser.y, victim: loser.kind, duel: true });
      if (!loser.dinoEaten) { loser.dinoEaten = true; ctx.eaten?.(loser, winner); out.push({ type: "eaten", loser: loser.id, winner: winner.id, t: d.t, capped: true }); }
      clear(spino, stego);
    }
  }
  // new duels, pair by pair (the original first): each free leader with the nearest free, roused partner in range
  for (const [ka, kb] of D.pairs) for (const spino of list) {
    if (spino.kind !== ka || duelOf(spino) || !free(spino) || !spino.aggro) continue;
    let best = null, bd = D.range;
    for (const q of list) { if (q.kind !== kb || duelOf(q) || !free(q) || !q.aggro) continue; const dd = Math.hypot(q.x - spino.x, q.y - spino.y); if (dd <= bd) { bd = dd; best = q; } }
    if (best) { begin(spino, best, ctx.clock); out.push(ka === "spinoRex" ? { type: "start", spino: spino.id, stego: best.id } : { type: "start", a: spino.id, b: best.id, spino: ka === "spinoRex" ? spino.id : kb === "spinoRex" ? best.id : null, stego: kb === "wildStego" ? best.id : null }); }
  }
  return out;
}
