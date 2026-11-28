// The wild Triceratops in the dino duels (Tim, 2026-11-27: "the wild Triceratops currently has no duels"). A hostile herd Triceratops
// (disposition "bad", or one that has turned on the Wayfarer) duels the Spinosaurus, the Wild Stegosaurus and the Pachycephalosaurus
// under the duel's own rules (dino-duel.ts DINO_DUEL.pairs). The Earth Apatosaurus still ignores every Triceratops (Tim, 2026-11-18;
// earth-apato.ts apatoIgnores), so that pair never duels. Friendly herd Triceratops (good, silly) and ridden ones never duel.
//
// Its duel choreography: a horn gore (it lowers its head and lunges horns first), a horn sweep (the head swung sideways across the
// foe) and a frill bash (it rears and comes down, frill first, the ground ringing). Each is drawn with the herd body's own poses
// (triceratops-render.ts triceratopsPoseName reads these moves as its charge, sweep and rear/stomp). Numbers in TRIKE_DUEL and
// TRIKE_ATTACKS; monster-pack.ts hands the shared helpers over once (installTrikeKit) and calls trikeDuelTick each fighting frame.
// Pure and deterministic; nothing is allocated per frame but a move's own small record.
import { hashSeed } from "./random.js?v=r1092-df0c2721a37e";

export const TRIKE_DUEL = {
  version: 1,
  sight: 14, refocus: 5, refocusYou: 2, close: 5, youChance: 25, gap: .5, speed: 1, wait: true, share: .035,
  moves: ["trikeGore", "trikeHornSweep", "trikeFrillBash"],
  gore: { lunge: 1.4, reach: 1.7, arc: 70 },
  sweep: { reach: 1.9, arc: 160 },
  bash: { radius: 1.9 },
};
export const TRIKE_ATTACKS = {
  trikeGore: { id: "trikeGore", name: "Horn Gore", range: [0, 4.5], cooldown: 4, windup: .6, active: .7, recover: .6, damage: .9, duel: true, tags: ["melee", "duel"], text: "The dino duel only: it lowers its three horns and lunges into its foe." },
  trikeHornSweep: { id: "trikeHornSweep", name: "Horn Sweep", range: [0, 4], cooldown: 5, windup: .5, active: .45, recover: .6, damage: .75, duel: true, tags: ["melee", "duel"], text: "The dino duel only: it swings its horned head sideways across its foe." },
  trikeFrillBash: { id: "trikeFrillBash", name: "Frill Bash", range: [0, 4], cooldown: 8, windup: .8, active: .35, recover: .8, damage: 1, duel: true, tags: ["ground", "duel"], text: "The dino duel only: it rears and comes down frill first; the ground rings." },
};
let K = null;
export function installTrikeKit(kit) { K = kit; }
const hyp = Math.hypot;
export const trikeDuels = (e) => e?.kind === "triceratops" && !e.mountView && !e.mount && (e.triceratopsDisposition === "bad" || e.triceratopsBetrayed === true);
const rivalOk = (q, e) => !!q && q !== e && !q.dead && K.duelPair(e, q) && !q.retreating && !q.passingBeast && !q.fleeTo && !q.untargetable && !q.hidden && !q.illusion && !q.dinoFled && !q.pachyDisguised;
export function trikeRivalNear(e, w) { if (!trikeDuels(e)) return null; let best = null, bd = TRIKE_DUEL.sight; for (const q of w.enemies || []) { if (!rivalOk(q, e)) continue; const d = hyp(q.x - e.x, q.y - e.y); if (d < bd) { bd = d; best = q; } } return best; }
function preyOf(w, s) { const id = s?.data?.prey; if (!id) return null; for (const q of w.enemies || []) if (q.id === id && !q.dead) return q; return null; }
const dmg = (e, id, share = 1) => Math.max(1, Math.ceil(K.damageOf(e, id) * share));
function inArc(e, at, aim, r, arc) { const dx = at.x - e.x, dy = at.y - e.y, d = hyp(dx, dy); if (d > r) return false; if (d < .25) return true; return Math.acos(Math.max(-1, Math.min(1, (dx * aim.x + dy * aim.y) / d))) <= arc * Math.PI / 360; }
// A blow in `test`: on the Wayfarer standing in it, and on the duel foe (measured to the near side of its bulk).
function strike(e, s, w, id, test) {
  const n = dmg(e, id); let landed = false; const p = w.player;
  if (test(p) && (!w.los || w.los(e, p))) landed = !!w.hurt(e, n, { jumpable: false, source: id });
  const q = preyOf(w, s); if (q && K.duelPair(e, q)) { const at = K.duelReachPoint(e, q); if (test(at)) { K.woundRival(w, e, q, Math.max(n, Math.ceil((Number(q.maxHp) || 1) * TRIKE_DUEL.share))); K.cue(w, e, "hit", id, q, { victim: q.kind }); landed = true; } }
  return landed;
}
const aimAt = (e, s, w) => { const q = preyOf(w, s) || w.player, at = preyOf(w, s) ? K.duelReachPoint(e, q) : q, dx = at.x - e.x, dy = at.y - e.y, m = hyp(dx, dy) || 1; s.data.aim = { x: dx / m, y: dy / m }; e.facingX = dx >= 0 ? 1 : -1; return s.data.aim; };
export const TRIKE_START = {
  trikeGore(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: K.bodyRadius(e) + TRIKE_DUEL.gore.reach, arc: TRIKE_DUEL.gore.arc }; },
  trikeHornSweep(e, s) { s.tele = { type: "arc", aim: s.data.aim, radius: K.bodyRadius(e) + TRIKE_DUEL.sweep.reach, arc: TRIKE_DUEL.sweep.arc }; },
  trikeFrillBash(e, s) { s.tele = { type: "ring", radius: K.bodyRadius(e) + TRIKE_DUEL.bash.radius }; },
};
export const TRIKE_RUN = {
  trikeGore(e, s, w) {
    const G = TRIKE_DUEL.gore, A = TRIKE_ATTACKS.trikeGore, d = s.data;
    if (s.phase === "windup") { aimAt(e, s, w); if (s.t <= 0) { d.left = G.lunge; s.tele = null; K.toPhase(s, "active", A.active); K.cue(w, e, "swing", "trikeGore"); } return; }
    if (s.phase === "active") { const step = Math.min(d.left, G.lunge / A.active * w.dt); if (step > 0 && w.move(e, d.aim.x * step, d.aim.y * step)) d.left -= step; else d.left = 0;
      if (!s.hitOnce && strike(e, s, w, "trikeGore", (t) => inArc(e, t, d.aim, K.bodyRadius(e) + G.reach, G.arc))) s.hitOnce = true;
      if (s.t <= 0) K.toPhase(s, "recover", A.recover); }
  },
  trikeHornSweep(e, s, w) {
    const S = TRIKE_DUEL.sweep, A = TRIKE_ATTACKS.trikeHornSweep, d = s.data;
    if (s.phase === "windup") { aimAt(e, s, w); if (s.t <= 0) { s.tele = null; strike(e, s, w, "trikeHornSweep", (t) => inArc(e, t, d.aim, K.bodyRadius(e) + S.reach, S.arc)); K.cue(w, e, "swing", "trikeHornSweep"); K.toPhase(s, "active", A.active); } return; }
    if (s.phase === "active" && s.t <= 0) K.toPhase(s, "recover", A.recover);
  },
  trikeFrillBash(e, s, w) {
    const B = TRIKE_DUEL.bash, A = TRIKE_ATTACKS.trikeFrillBash;
    if (s.phase === "windup") { aimAt(e, s, w); if (s.t <= 0) { s.tele = null; strike(e, s, w, "trikeFrillBash", (t) => hyp(t.x - e.x, t.y - e.y) <= K.bodyRadius(e) + B.radius); K.cue(w, e, "land", "trikeFrillBash"); K.toPhase(s, "active", A.active); } return; }
    if (s.phase === "active" && s.t <= 0) K.toPhase(s, "recover", A.recover);
  },
};
// Every fighting frame of a hostile Triceratops, before the shared brain: a duel foe in sight draws it (now and then, with the Wayfarer
// close, it turns on her instead); it closes to the duel's spacing and throws its duel moves, holding its blow while the foe's comes.
// True when its frame is spent on the duel.
export function trikeDuelTick(e, s, w, p, d) {
  if (!trikeDuels(e) || s.attack || e.hitStun > 0) return false;
  const R = TRIKE_DUEL; s.trikeRefocus = (s.trikeRefocus ?? 0) - w.dt;
  if (s.trikeRefocus <= 0) { const near = trikeRivalNear(e, w); s.trikeFocusN = (s.trikeFocusN || 0) + 1;
    const you = !!near && !K.duelWinner(e) && d <= R.close + K.bodyRadius(e) && hashSeed(`${e.id}:trike-rival:${s.trikeFocusN}`) % 100 < R.youChance;
    s.trikeRival = near && !you ? near.id : null; s.trikeRefocus = s.trikeRival ? R.refocus : R.refocusYou; }
  let foe = null; if (s.trikeRival) for (const q of w.enemies || []) if (q.id === s.trikeRival && rivalOk(q, e)) foe = q;
  if (!foe) { s.trikeRival = null; return false; }
  const fd = hyp(foe.x - e.x, foe.y - e.y);
  if (s.gap <= 0 && !(R.wait && K.blowComing(foe, e))) {
    let pick = null, n = 0;
    for (const id of R.moves) { const A = TRIKE_ATTACKS[id]; if ((s.cd[id] || 0) > 0 || fd < A.range[0] || fd > A.range[1] + K.bodyRadius(e) + K.duelReach) continue; n++; if (hashSeed(`${e.id}:trike-pick:${s.seq}:${id}`) % n === 0) pick = id; }
    if (pick) { s.state = "attack"; s.last = pick; K.beginAttack(e, s, pick, w, foe); return true; }
  }
  const want = K.bodyRadius(e) + K.bodyRadius(foe) + R.gap + K.duelGap, step = .82 * R.speed * (e.speedMultiplier || 1) * w.dt, dx = foe.x - e.x, dy = foe.y - e.y, m = fd || 1;
  if (fd > want) w.move(e, dx / m * step, dy / m * step); else if (fd < want - K.duelSlack) w.move(e, -dx / m * step, -dy / m * step);
  e.facingX = dx >= 0 ? 1 : -1;
  return true;
}
