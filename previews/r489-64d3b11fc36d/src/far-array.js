// The Far Array (release 138): what waits at the relay network's coordinate.
//
// The Array Mouth stands at the coordinate. Each entry is a run: an expedition dungeon whose final guardian is a relay
// guardian (an elite or pack boss) chosen by how the Wayfarer answered the relays: restoring leans to mirror, phase and
// ranged things; severing to heavy brutes. Each guardian felled locks one piece into the Gate. Gate g needs
// FAR.piecesBase + g pieces. When the Gate is whole, the next run ends instead with the Listener, the thing that learned
// the line: a mirror of the Wayfarer (restored), a starved, walled-in thing (severed), or both in turn. From gate 2 it
// calls guardians in; from gate 3 it hides behind them until they fall. Felling it raises the Gate a tier (harder
// guardians that borrow moves) and offers a choice of three boons; the first time, it also asks how the story ends,
// though the climb goes on either way. State: save.farArray (additive). The lore stays open on purpose.
import { hashSeed, rng } from "./random.js?v=r489-64d3b11fc36d";
import { daisDue } from "./listener-arena.js?v=r489-64d3b11fc36d";

export const FAR = {
  piecesBase: 2, // gate 1 needs 3 pieces, gate 2 needs 4, ...
  guardianHp: 0.3, guardianDamage: 0.12, relayHp: 0.05, // per gate tier above 1, and per relay answered
  dungeonHp: 0.25, dungeonDamage: 0.1, // run enemies per gate tier above 1
  borrowFromGate: 2, swiftFromGate: 3, summonFromGate: 2, hideFromGate: 3,
};
export const GUARDIANS = {
  restore: ["vesperwing", "knifeChoir", "lumenWraith", "mirrorShade", "riftLynx", "cinderSeraph"],
  sever: ["gravitantBell", "mireApostle", "thunderhorn", "siegeBeetle", "gnawingMaw", "sunderjaw"],
};
// The Listener's moves by form. "open" mirrors the Wayfarer; "walled" is starved and heavy.
export const LISTENER_FORMS = {
  // Release 369: no more harmless reflections or place-swapping ("copy magic"); its reflections fight (listener-mirror.ts).
  open: { name: "The Listener, Wearing Your Face", attacks: ["blinkStrike", "clawSweep", "longStab"], boss: ["shockwave"] },
  // Release 385: the Morphling (listener-morph.ts) dives at you itself, so its plain kit drops the ram.
  walled: { name: "The Listener, Starved Behind Its Walls", attacks: ["devourPull", "bite", "groundRupture"], boss: ["shockwave", "fleshBloom"] },
};
// Permanent boons, three offered after each Listener falls (Astral Ascent style). Effects read in game.ts characterStats.
export const BOONS = {
  "open-line": { name: "Open Line", text: "+3 melee damage.", melee: 3 },
  "far-signal": { name: "Far Signal", text: "+3 spell and tool damage.", magic: 3 },
  "carrier-wave": { name: "Carrier Wave", text: "+12 maximum health.", hp: 12 },
  "dead-line": { name: "Dead Line", text: "+3% damage resistance.", guard: .03 },
  "relay-step": { name: "Relay Step", text: "+5% movement speed.", speed: .05 },
  "deep-breath": { name: "Deep Breath", text: "+8 maximum stamina.", stamina: 8 },
};

// The Listener moves on (release 357; Tim, 2026-10-23: "after you defeat them the first time... His dungeon can stay there...
// but he won't be there... you have to... activate or deactivate... at least 5 more relays first [for his] quest to become
// available, and then you have to complete his quest... how many relays you do in total will increase... his strength").
// After each Listener falls the Mouth goes quiet (`quiet`, with `relaysAt` the relays answered then). Once `returnRelays`
// more relays have answered, the line gives a new coordinate (`listenerCoordinate`, by `mouth`) and the Array opens there:
// the same Gate climb (pieces, then the Listener) at the new Mouth. The old Mouth stays, silent (relayNetwork.pastMouths).
export const LISTENER_RETURN = { returnRelays: 5, near: 40, spread: 23 };
const answeredRelays = (save) => Object.keys(save?.relayNetwork?.nodes || {}).length;
export function ensureFarArray(save) {
  const f = save.farArray && typeof save.farArray === "object" ? save.farArray : {};
  // Journeys that felled a Listener before 357 go quiet now, counting from the relays they had then.
  const quiet = f.quiet === undefined ? (Number(f.listeners) || 0) > 0 : !!f.quiet, relaysAt = f.relaysAt != null && Number.isFinite(Number(f.relaysAt)) ? Math.max(0, Number(f.relaysAt)) : answeredRelays(save);
  save.farArray = {
    v: 1, gate: Math.max(1, Number(f.gate) || 1), pieces: Math.max(0, Number(f.pieces) || 0), runs: Math.max(0, Number(f.runs) || 0),
    listeners: Math.max(0, Number(f.listeners) || 0), boons: (Array.isArray(f.boons) ? f.boons : []).filter((id) => BOONS[id]),
    offer: (Array.isArray(f.offer) ? f.offer : []).filter((id) => BOONS[id]), ending: ["close", "open"].includes(f.ending) ? f.ending : null,
    endingPending: !!f.endingPending, history: (Array.isArray(f.history) ? f.history : []).slice(-12), activeRun: f.activeRun && typeof f.activeRun === "object" ? f.activeRun : null,
    quiet, relaysAt, mouth: Math.max(0, Math.floor(Number(f.mouth) || 0)), // release 357
  };
  return save.farArray;
}
export const piecesNeeded = (gate) => FAR.piecesBase + gate;
export const gateOpen = (f) => f.pieces >= piecesNeeded(f.gate);
// How the relays were answered: restore share 0..1 (0.5 when none were answered).
export function relayLean(save) {
  const nodes = Object.values(save.relayNetwork?.nodes || {}), restored = nodes.filter((n) => n.choice === "restore").length;
  return { answered: nodes.length, restored, severed: nodes.length - restored, share: nodes.length ? restored / nodes.length : .5 };
}
export function listenerForm(save) { const s = relayLean(save).share; return s >= .65 ? "open" : s <= .35 ? "walled" : "both"; }

// The Mouth appears at the relay coordinate once the network has answered.
export function arrayMouthAt(save, rx, ry) { const c = save.relayNetwork?.coordinate; return !!c && c.rx === rx && c.ry === ry; }

// Start a run: a fresh dungeon id; the previous run's area state and history are cleared so saves stay small.
export function beginArrayRun(save, returnPoint, { noListener = false } = {}) {
  const f = ensureFarArray(save);
  for (const key of Object.keys(save.session?.areas || {})) if (key.startsWith("far-array:")) delete save.session.areas[key];
  for (const key of Object.keys(save.consequences?.dungeons || {})) if (key.startsWith("far-array:")) delete save.consequences.dungeons[key];
  f.runs++;
  // Each run is a different dungeon (release 140): an Underlands expedition or one of the five deep archetypes.
  const listener = gateOpen(f) && !f.quiet && !noListener && !daisDue(f), kind = // release 357/361: never while quiet, nor at an old Mouth; 375: nor when the dais calls
    RUN_KINDS[hashSeed(`${save.seed}:far-array:kind:${f.runs}`) % RUN_KINDS.length];
  const id = `far-array:${save.seed}:run${f.runs}${kind === "expedition" ? "" : `:deep-v2:${kind}`}`;
  f.activeRun = { id, gate: f.gate, listener, kind, returnPoint: { ...returnPoint } };
  return f.activeRun;
}
// Release 375 (listener-arena.ts): from the second Listener on, it waits in its own hall, reached by the dais at the Mouth.
export function beginListenerArena(save, returnPoint) {
  const f = ensureFarArray(save);
  if (!daisDue(f)) return null;
  for (const key of Object.keys(save.session?.areas || {})) if (key.startsWith("far-array:")) delete save.session.areas[key];
  for (const key of Object.keys(save.consequences?.dungeons || {})) if (key.startsWith("far-array:")) delete save.consequences.dungeons[key];
  f.runs++;
  f.activeRun = { id: `far-array:${save.seed}:arena${f.runs}`, gate: f.gate, listener: true, kind: "arena", returnPoint: { ...returnPoint } };
  return f.activeRun;
}
export const RUN_KINDS = ["expedition", "threefold", "descent", "loop", "flooded", "fortress"];
// What the run is called, by dungeon kind, so every run reads as part of the Array.
export const RUN_NOUNS = { arena: "Hall", expedition: "Chamber", threefold: "Threefold Lair", descent: "Descent", loop: "Circuit", flooded: "Grotto", fortress: "Keep" };
export function runName(run, gate) { const noun = RUN_NOUNS[run?.kind] || "Chamber"; return run?.listener ? `The Listener's ${noun}` : `The Far Array · ${noun} · Gate ${gate}`; }
// Relay pylons that mark a run as the Array; inspecting one replays a line of the far transmission.
export const PYLON_LINES = ["…carrier found. The line runs under every section you have walked…", "…it learns a road for every line opened, a wall for every line closed…", "…signal steady. Something on the line is listening back…", "…the Gate remembers each piece you give it…", "…come alone, Wayfarer. It already knows your step…"];
export function arrayPylons(map, runId, width) {
  const open = (map.tiles || []).filter((t) => !t.blocked && !t.environment && !["abyss", "lava", "dungeonWater", "bridge"].includes(t.kind)), taken = new Set((map.objects || []).map((o) => `${o.x},${o.y}`)), out = [];
  for (let i = 0; i < 3 && open.length; i++) { const t = open[hashSeed(`${runId}:pylon:${i}`) % open.length]; if (taken.has(`${t.x},${t.y}`)) continue; taken.add(`${t.x},${t.y}`); out.push({ id: `array-pylon-${i}`, kind: "arrayPylon", name: "Array Pylon", x: t.x, y: t.y, state: "restore", actions: ["inspect"], line: PYLON_LINES[hashSeed(`${runId}:line:${i}`) % PYLON_LINES.length] }); }
  return out;
}
export const isArrayRun = (id) => String(id || "").startsWith("far-array:");

// The final foe of a run, as a spawn to merge over the dungeon's guardian spawn.
export function runBossSpawn(save, at) {
  const f = ensureFarArray(save), run = f.activeRun; if (!run) return null;
  const lean = relayLean(save), h = hashSeed(`${save.seed}:far-array:${run.id}`);
  if (run.listener) {
    const form = listenerForm(save), chosen = form === "both" ? "open" : form;
    return { id: `${run.id}:listener`, kind: "listener", x: at.x, y: at.y, boss: true, traits: [], farArrayBoss: "listener", listenerForm: form, listenerPhase: chosen, worldBoss: true, dungeonRole: "finalBoss" };
  }
  const restoreSide = (h % 100) / 100 < lean.share, pool = restoreSide ? GUARDIANS.restore : GUARDIANS.sever;
  return { id: `${run.id}:guardian`, kind: pool[(h >>> 7) % pool.length], x: at.x, y: at.y, boss: true, elite: true, traits: run.gate >= FAR.swiftFromGate ? ["swift"] : [], farArrayBoss: "guardian", worldBoss: true, dungeonRole: "finalBoss" };
}
// A guardian for the Listener to call in.
export function summonSpawn(save, at, n) {
  const f = ensureFarArray(save), run = f.activeRun, lean = relayLean(save), h = hashSeed(`${run?.id}:summon:${n}`), pool = (h % 100) / 100 < lean.share ? GUARDIANS.restore : GUARDIANS.sever;
  return { id: `${run?.id}:summon:${n}`, kind: pool[(h >>> 5) % pool.length], x: at.x, y: at.y, boss: true, elite: true, traits: [], farArraySummon: true, noRewards: true };
}
// Gate scaling for a created combatant (the boss, its summons, and the run's ordinary foes).
export function scaleForGate(c, save, role) {
  const f = ensureFarArray(save), g = f.activeRun?.gate || f.gate, up = g - 1, relays = Math.min(ARRAY_TUNING.relayCap, relayLean(save).answered);
  if (role === "boss" || role === "summon") {
    // Health and damage are set to the Wayfarer by tuneArrayBoss after all other scaling; here only the borrowed move.
    if (g >= FAR.borrowFromGate && Array.isArray(c.packAttacks)) { const extra = (c.kind === "listener" ? LISTENER_FORMS.walled.attacks : ["shockwave", "groundRupture", "leapSlam"]).find((a) => !c.packAttacks.includes(a)); if (extra) c.packAttacks = [...c.packAttacks, extra]; }
  } else { c.maxHp = c.hp = Math.round((c.maxHp || 20) * (1 + FAR.dungeonHp * up)); c.damage = Math.max(1, Math.round((c.damage || 4) * (1 + FAR.dungeonDamage * up))); }
  return c;
}
// Bosses and summons are tuned to the Wayfarer, like the Questing Beast: health is a number of the Wayfarer's current
// melee blows (more per gate tier and per relay answered), damage a share of the Wayfarer's maximum health.
export const ARRAY_TUNING = { guardianHits: 32, listenerHits: 60, summonHits: 18, hitsPerGate: 8, hitsPerRelay: 1, relayCap: 40, damageShare: .085, damagePerGate: .012, maxShare: .2 }; // release 357: relays count up to relayCap (was 7)
export function tuneArrayBoss(c, save, stats, role) {
  const f = ensureFarArray(save), g = f.activeRun?.gate || f.gate, up = g - 1, relays = Math.min(ARRAY_TUNING.relayCap, relayLean(save).answered), T = ARRAY_TUNING;
  const weapon = save.equipment?.[save.activeWeaponSlot], perHit = Math.max(6, (Number(weapon?.power) || 6) + (Number(stats?.meleeBonus) || 0)), guard = Math.max(0, Math.min(.75, Number(stats?.damageReduction) || 0));
  const hits = (role === "listener" ? T.listenerHits : role === "summon" ? T.summonHits : T.guardianHits) + T.hitsPerGate * up + T.hitsPerRelay * relays;
  c.maxHp = c.hp = Math.round(perHit * hits + 15 * Math.max(1, Number(save.level) || 1));
  c.damage = Math.max(4, Math.round((Number(save.maxHp) || 60) * Math.min(T.maxShare, T.damageShare + T.damagePerGate * up) / (1 - guard)));
  return c;
}
// The Listener's summons: thresholds of its health at which it calls a guardian in, by gate.
export function summonThresholds(gate) { return gate < FAR.summonFromGate ? [] : gate === 2 ? [.5] : gate === 3 ? [.66, .33] : [.75, .5, .25]; }
export const listenerHides = (gate) => gate >= FAR.hideFromGate;

// A guardian fell: one Gate piece. Returns a message.
export function guardianFelled(save) {
  const f = ensureFarArray(save); f.pieces = Math.min(piecesNeeded(f.gate), f.pieces + 1); f.history.push({ run: f.runs, gate: f.gate, won: "guardian" }); f.activeRun = null;
  return gateOpen(f) ? `The last piece locks into the Gate. It stands whole: something behind it is listening. Gate ${f.gate} is open.` : `A piece of the Gate locks into place (${f.pieces}/${piecesNeeded(f.gate)}).`;
}
// The Listener fell: the Gate ascends and three boons are offered; the first time, the ending choice too.
export function listenerFelled(save) {
  const f = ensureFarArray(save), r = rng(`${save.seed}:far-array:boons:${f.gate}:${f.listeners}`), ids = Object.keys(BOONS).sort(() => r() - .5);
  f.listeners++; f.history.push({ run: f.runs, gate: f.gate, won: "listener" }); f.gate++; f.pieces = 0; f.activeRun = null;
  f.offer = ids.slice(0, 3); if (f.listeners === 1 && !f.ending) f.endingPending = true;
  f.quiet = true; f.relaysAt = answeredRelays(save); // release 357: it moves on
  return `The Listener falls silent. The Gate climbs to tier ${f.gate}. Choose a boon in the Journal's Far Gate. The Mouth goes quiet: answer ${LISTENER_RETURN.returnRelays} more relays and the line will say where it went.`;
}
// How many more relays must answer before the Listener's line speaks again (0 when it is not quiet).
export function relaysUntilReturn(save) { const f = ensureFarArray(save); return f.quiet ? Math.max(0, f.relaysAt + LISTENER_RETURN.returnRelays - answeredRelays(save)) : 0; }
// Where the Array Mouth stands after the Listener has moved `mouth` times: 40 to 62 sections out, never where it was.
export function listenerCoordinate(seed, mouth, previous = null) {
  for (let k = 0; ; k++) {
    const c = hashSeed(`${seed}:relay-coordinate:mouth${mouth}:${k}`), L = LISTENER_RETURN;
    const at = { rx: (c % 2 ? 1 : -1) * (L.near + c % L.spread), ry: ((c >>> 3) % 2 ? 1 : -1) * (L.near + (c >>> 5) % L.spread) };
    if (!previous || Math.abs(at.rx - previous.rx) + Math.abs(at.ry - previous.ry) >= 20 || k > 20) return at;
  }
}
// Called after a relay answers: once enough have, the Listener's line gives its new coordinate. Returns it, or null.
export function listenerReturns(save) {
  if (relaysUntilReturn(save) > 0) return null; // (it renormalises save.farArray, so read `f` after)
  const f = ensureFarArray(save), net = save.relayNetwork;
  if (!f.quiet || !net?.coordinate) return null;
  const old = { rx: net.coordinate.rx, ry: net.coordinate.ry };
  f.mouth++; f.quiet = false; net.pastMouths = [...(Array.isArray(net.pastMouths) ? net.pastMouths : []), old].slice(-8);
  net.coordinate = listenerCoordinate(save.seed, f.mouth, old);
  return net.coordinate;
}
export const silentMouthAt = (save, rx, ry) => (save?.relayNetwork?.pastMouths || []).some((c) => c.rx === rx && c.ry === ry) && !arrayMouthAt(save, rx, ry);
export function chooseBoon(save, id) { const f = ensureFarArray(save); if (!f.offer.includes(id)) return false; f.boons.push(id); f.offer = []; return true; }
export function chooseEnding(save, ending) { const f = ensureFarArray(save); if (!f.endingPending || !["close", "open"].includes(ending)) return false; f.ending = ending; f.endingPending = false; return true; }
// Summed boon effects for characterStats.
export function boonTotals(save) {
  const t = { melee: 0, magic: 0, hp: 0, guard: 0, speed: 0, stamina: 0 };
  for (const id of save?.farArray?.boons || []) for (const k of Object.keys(t)) t[k] += BOONS[id]?.[k] || 0;
  return t;
}
