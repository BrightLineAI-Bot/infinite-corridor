// Leads (docs/progression-design.md revision 3, Phase 4: sections 2.2, 2.5 G2, 2.6, 4.1-4.3 and 6). Pure rules and data, read by
// game.ts (who says what) and main.ts (the Journal's Leads, the compass menu, the idle compass's caption and the Journal dot).
//
// A lead is anything the player knows of and can act on now: a quest in progress first, then a rumour heard. Rumours come only
// from people who already speak (the Refuge's people, the Cairn Keeper's idle words, the hamlets' folk, the Listener towns' cooks, and a
// traveller's wonder, release 674): a rumour takes the place of an idle line, never a line the story needs, and adds no speaker
// (2.6). The lead floor (G2): while fewer than LEADS.floor leads stand, the next such person spoken to tells the nearest
// eligible rumour. Rumours keep in save.leads (journey-start.ts ensureLeads) until what they point at is done.
//
// Exploration's first hour (4.1): Vela, Oren, Sela and Hollis each have one plain first-journey line that sends a new Wayfarer
// to Maud, the Cairn Keeper (said once each, before her errand is taken); Maud states her errand plainly (surveyor.ts
// CAIRN_LINES.plain) and, taken, the compass follows it to the nearest crossing (nearestCrossing). Classic keeps today's lines and
// the errand's waymarks; leads and rumours run in both modes, as extras (section 6), and a Classic rumour never points at an
// ability its own rules already open (awakening, the hatchling).
import { hashSeed } from "./random.js?v=r1061-f99d2b3a8a40";
import { crossingRolled } from "./world.js?v=r1061-f99d2b3a8a40";
import { nearestWonders, WONDERS, compassWords } from "./wonders.js?v=r1061-f99d2b3a8a40";
import { arcanaHint, arcanaToward, arcanaHas, ARCANA_REGIONS, ARCANA_UNLOCKS } from "./lore.js?v=r1061-f99d2b3a8a40";
import { ensureLeads, exploring, saveFrame, EXPLORATION, LEAD_RECORD } from "./journey-start.js?v=r1061-f99d2b3a8a40";
import { APERTURE_BANDS, apertureBand } from "./items.js?v=r1061-f99d2b3a8a40";
import { HORDE_RUMOUR, RELIQUARY, worldWithheld } from "./world-routes.js?v=r1061-f99d2b3a8a40"; // Phase 6: the horde rumour (2.7)
import { nearestHorde, hordeLeadLive, pityLead, pityLive } from "./world-leads.js?v=r1061-f99d2b3a8a40"; // Phase 6: the strong lead (G3)
import { QUEST_IDS, questOpen, boughtRumour, paidRumourView, storyWithheld } from "./quests.js?v=r1061-f99d2b3a8a40"; // Phase 7: quests count as leads; Phase 8: a bought rumour
import { threadFound } from "./threads.js?v=r1061-f99d2b3a8a40"; import { TRAIL_IDS, trailBegun } from "./thread-trails.js?v=r1061-f99d2b3a8a40"; // 2026-11-21: the Washing at Sallowby (a rumour, then a quest the compass can follow)

export const LEADS = Object.freeze({
  floor: 2, // G2: at least this many leads the player can act on now
  maxQuests: 3, // G2: at most this many directed quests open at once (Phase 7's quests read it)
  crossingRadius: 16, // sections searched round the Wayfarer for the errand's nearest crossing (Manhattan rings)
  idleSections: 15, // 4.3: no needle and no lead followed for this many new sections: the Journal button shows a dot
  wonderMax: 5, // fixes from a 20-hour playthrough (I9): at most this many travellers' wonders stand as leads; a new one replaces the oldest (no other rumour is touched)
});

// ---------------------------------------------------------------- the first hour (4.1)
// One plain line each, said the first time the Wayfarer speaks with them on an Exploration journey, while Maud's errand is not
// yet taken. Keyed by the speaker's object id.
export const FIRST_JOURNEY = Object.freeze({
  lines: Object.freeze({
    "vendor-vela": "New? Go and see Maud by the cairn. She sends everyone out sooner or later.",
    "warden-oren": "Before you go past the wall, talk to Maud by the cairn. And come back to me when you can block a blow: your Aegis is in slot B.",
    "keeper-sela": "When the world starts to make sense to you, come to me and I'll read it. Before that, see Maud by the cairn.",
    "refuge-farmer": "Eat before you go. Maud by the cairn won't feed you, but she'll give you work.",
  }),
  // The idle compass's caption on a first session (both modes): no quest taken yet, and under `captionSeconds` of play.
  caption: "Talk to the people of the Refuge to find work.",
  captionSeconds: 1800,
});
const errandTaken = (save) => !!save?.arcana?.starter || (save?.lore?.surveyor?.links || []).length > 0;
// The speaker's first-journey line, once (marks it told), or null.
export function firstJourneyLine(save, speakerId) {
  const line = FIRST_JOURNEY.lines[speakerId]; if (!line || !exploring(save) || errandTaken(save)) return null;
  const L = ensureLeads(save); if (L.told[speakerId]) return null;
  L.told[speakerId] = true; return line;
}
// The caption under the idle compass, or null.
export function compassCaption(save, { idle = false, area = "overworld" } = {}) {
  return idle && area === "overworld" && !errandTaken(save) && (Number(save?.playSeconds) || 0) < FIRST_JOURNEY.captionSeconds ? FIRST_JOURNEY.caption : null;
}

// ---------------------------------------------------------------- the errand's nearest crossing (4.1 step 2)
// The Refuge's own crossing (its gate, `dungeon-gate`) and every landmark crossing a section's entrance roll gives
// (world.ts crossingRolled: a few hashes, no section built). In the Wayfarer's own section the crossing's door itself (from the
// loaded map's objects); elsewhere its section. Kept per section, a few hundred hashes at most.
const isCrossing = (o) => o?.kind === "dungeon" && (o.landmark || o.id === "dungeon-gate") && !o.towerDoor && !o.buildingDoor && !o.roofHatch;
const crossingMemo = new Map();
export function nearestCrossing(save, rx = 0, ry = 0, objects = null) {
  const name = "The nearest crossing", at = (x, y, extra = {}) => ({ area: "overworld", rx: x, ry: y, ...extra, kind: "guidance", name });
  const here = (objects || []).find(isCrossing);
  if (here && Number.isFinite(here.x)) return at(rx, ry, { x: here.x, y: here.y });
  const seed = save?.seed, gen = Number(save?.worldGeneration) || 1, key = `${seed}:${gen}:${rx}:${ry}`;
  if (crossingMemo.has(key)) { const c = crossingMemo.get(key); return c && at(c.rx, c.ry); }
  const holds = (x, y) => (x === 0 && y === 0) || crossingRolled(seed, x, y, gen); // the Refuge's crossing is always there
  let found = holds(rx, ry) ? { rx, ry } : null;
  for (let d = 1; !found && d <= LEADS.crossingRadius; d++)
    for (let i = 0; i < 4 * d && !found; i++) {
      const k = i % d, side = Math.floor(i / d), x = rx + [d - k, -k, -d + k, k][side], y = ry + [k, d - k, -k, -d + k][side];
      if (holds(x, y)) found = { rx: x, ry: y };
    }
  if (crossingMemo.size > 64) crossingMemo.clear(); crossingMemo.set(key, found);
  return found && at(found.rx, found.ry);
}

// ---------------------------------------------------------------- rumours (2.2, 2.6, G2)
// Each kind: `modes` it runs in, an optional Aperture band `tier` it waits for, whether it is still worth telling (`open`), and
// its line. Arcana rumours name a set's home (lore.ts arcanaHint, turned with the journey's frame) and are hinted ("something
// waits at the end"); their compass point is the home's nearest edge. A wonder is a traveller's Sky Stair, great tree or
// Starfield crossing (wonders.ts), pointed at its section. Order is preference.
const tierOf = (save) => APERTURE_BANDS.indexOf(apertureBand(save?.perception?.aperture || 0));
const held = (save) => [...Object.values(save?.equipment || {}), ...(Array.isArray(save?.inventory) ? save.inventory : [])].filter((q) => q && typeof q === "object");
const hatchQuest = (save) => save?.mounts?.hatchling?.quest?.state || "none";
export const RUMOURS = Object.freeze({
  hatchling: Object.freeze({ modes: [1], tier: EXPLORATION.gates["companion:hatchling"].tier, title: "The Beast Hotel",
    open: (save) => !save?.mounts?.hatchling?.owned && hatchQuest(save) === "none",
    line: () => "A mother Triceratops limped into the Beast Hotel. She's asking for someone to help her." }),
  awakening: Object.freeze({ modes: [1], tier: EXPLORATION.gates["awakened:awakening"].tier, title: "Sela's forge",
    open: (save) => !held(save).some((q) => q.awakened),
    line: () => "Sela's been asking for you. Something in your steel is asleep, she says, not dead." }),
  lamplighter: Object.freeze({ modes: [0, 1], set: "lamplighter", passive: "passive:lamplight", title: "The Lamplighter's Round",
    line: (where) => `There's a lamplighter's round ${where}. Walk it to its end and the dark gives a little, they say.` }),
  bells: Object.freeze({ modes: [0, 1], set: "bells", passive: "passive:bell-toll", title: "The cracked bells",
    line: (where) => `Cracked bells hang in the crossings ${where}. Ring them all and something waits at the end.` }),
  // 2026-11-21 (story version 6): the Washing at Sallowby, told by name and home until its first bundle is found (then it is a quest).
  washing: Object.freeze({ modes: [0, 1], set: "washing", title: "Washing in the crossings",
    open: (save) => !threadFound(save, "washing").length,
    line: (where) => `Washing turns up in the crossings ${where}, they say: bundles tied in clean sheets, still damp, with a slip pinned on. Somebody's whole village, by the sound of it.` }),
  // Phase 6 (2.7): from Infinite II, the nearest Revenant horde crossing not yet entered, while the first horde's certain reliquary
  // waits and the pool still holds something to find. Found by the horde's own hash (world-finds.ts nearestHorde).
  // Every offered goal can be completed (2026-11-25): told floor or not (`always`), like the strong lead: the first horde's reliquary
  // is certain and this is its only lead, yet a player with goals in hand never fell below the floor (a 60-hour run held 9 to 15
  // leads throughout, while an unentered horde crossing lay 8 sections from the Refuge, and so never heard it).
  horde: Object.freeze({ modes: [1], tier: HORDE_RUMOUR.tier, title: "A Revenant horde", always: true,
    open: (save) => !save?.feats?.reliquary?.firsts?.horde && RELIQUARY.pool.some((id) => worldWithheld(save, id)),
    line: (h) => `A crossing ${h.d} section${h.d === 1 ? "" : "s"} off is thick with Gate Revenants, they say. Whoever breaks a horde finds something at the bottom.` }),
  // Phase 8: a rumour bought with Divine Viscera (world-finds.ts buyVisceraRumour); never chosen by nextRumour.
  viscera: Object.freeze({ modes: [0, 1], title: "A bought rumour", open: () => false, line: () => "" }),
  // Phase 6 (G3): the strong lead after a long dry spell (world-finds.ts pityLead); told by rumourTurn, never chosen by nextRumour.
  pity: Object.freeze({ modes: [1], title: "A strong lead", open: () => false, line: () => "" }),
  wonder: Object.freeze({ modes: [0, 1], title: "A wonder",
    line: (w, rx, ry) => `People speak of ${WONDERS.kinds[w.kind].name} ${compassWords(w.rx - rx, w.ry - ry)}, about ${w.d} section${w.d === 1 ? "" : "s"} off.` }),
});
export const RUMOUR_ORDER = Object.freeze(["hatchling", "awakening", "horde", "lamplighter", "bells", "washing", "wonder"]);
// The people whose idle words may become a rumour (by object id; the hamlets' folk and the Listener towns' cooks by kind, in
// game.ts). Hollis is not one: his talk points the way to the Refuge's farm and quarry (refuge-lands.ts), which a rumour must not hide.
export const RUMOUR_SPEAKERS = Object.freeze(["vendor-vela", "warden-oren", "keeper-sela", "cairn-keeper", "vendor-iona", "resident-tarn", "vendor-mora", "resident-esh"]);

// Whether a rumour heard still points at something to do.
export function rumourLive(save, r) {
  if (!r || typeof r.kind !== "string") return false;
  if (r.kind === "wonder") return Number.isInteger(r.rx) && Number.isInteger(r.ry) && !save?.atlas?.[`${r.rx},${r.ry}`];
  if (r.kind === "pity") return exploring(save) && pityLive(save, r);
  if (r.kind === "horde") return RUMOURS.horde.open(save) && hordeLeadLive(save, r);
  if (r.kind === "viscera") return typeof r.ability === "string" && !!boughtRumour(save, r.ability) && (!exploring(save) || storyWithheld(save, r.ability) || worldWithheld(save, r.ability)); // Phase 8: a rumour bought with Divine Viscera, until it is found
  const K = RUMOURS[r.kind]; if (!K) return false;
  if (K.passive) return !arcanaHas(save, K.passive);
  return K.open(save);
}
// Travellers' wonders beyond LEADS.wonderMax, the oldest first: every traveller names one, so from about ten hours thirty of them
// stood as leads against a floor of two. Only wonder rumours are ever cut; quests, threads and every other rumour stand.
function wonderOverflow(save, list) {
  const wonders = list.filter((r) => r?.kind === "wonder" && rumourLive(save, r));
  return new Set(wonders.slice(0, Math.max(0, wonders.length - LEADS.wonderMax)));
}
export const liveRumours = (save) => { const all = Array.isArray(save?.leads?.rumours) ? save.leads.rumours : [], over = wonderOverflow(save, all); return all.filter((r) => !over.has(r) && rumourLive(save, r)).map(paidRumourView); };
// Quests in progress the player can act on now (the Journal's Leads lists them first, main.ts activeQuests).
export function questLeadCount(save) {
  let n = 0;
  for (const c of Object.values(save?.viewport?.contracts || {})) if (["accepted", "tracking", "target-located"].includes(c?.status)) n++;
  for (const q of Object.values(save?.farQuests || {})) if (q?.status === "open") n++;
  if (hatchQuest(save) === "active") n++;
  if (save?.wanderer?.quest) n++;
  if (save?.arcana?.starter === "set" && !(save?.lore?.surveyor?.links || []).length) n++;
  if (save?.narrative?.facts?.["leads.active"] && !save.narrative.facts["leads.complete"]) n++;
  if (save?.relayNetwork?.coordinate) n++;
  { const s = save?.lore?.second; if (s && Array.isArray(s.trail) && (s.found || 0) < s.trail.length) n++; }
  for (const id of TRAIL_IDS) if (trailBegun(save, id)) n++; // 2026-11-21: a followed thread begun and not finished
  for (const id of QUEST_IDS) if (questOpen(save, id)) n++; // Phase 7
  return n;
}
export const leadCount = (save) => questLeadCount(save) + liveRumours(save).length;
export const needsRumour = (save) => leadCount(save) < LEADS.floor;

const modeOf = (save) => (exploring(save) ? 1 : 0);
const sameRumour = (a, b) => a.id === b.id;
// The home's nearest edge, as a section: its bearing on this journey at its near distance.
function homeEdge(save, set) {
  const h = ARCANA_REGIONS.sets[set], deg = ARCANA_REGIONS.headings[arcanaToward(set, saveFrame(save))], a = (deg * Math.PI) / 180;
  return { rx: Math.round(Math.cos(a) * h.from) + 0, ry: Math.round(-Math.sin(a) * h.from) + 0 };
}
// The next rumour worth telling at (rx, ry), or null: the first eligible kind not already a live rumour (`always`: only the
// kinds told floor or not).
export function nextRumour(save, rx = 0, ry = 0, always = false) {
  const live = liveRumours(save), mode = modeOf(save), tier = tierOf(save);
  for (const kind of RUMOUR_ORDER) {
    const K = RUMOURS[kind]; if (!K.modes.includes(mode) || (K.tier != null && tier < K.tier) || (always && !K.always)) continue;
    if (kind === "wonder") {
      const list = nearestWonders(save, rx, ry).filter((w) => !live.some((r) => r.kind === "wonder" && r.rx === w.rx && r.ry === w.ry));
      const w = list[0]; if (!w) continue;
      return { id: `wonder:${w.rx},${w.ry}`, kind, text: K.line(w, rx, ry), rx: w.rx, ry: w.ry, name: WONDERS.kinds[w.kind].atlas };
    }
    if (live.some((r) => r.kind === kind)) continue;
    if (kind === "horde") { if (!K.open(save)) continue; const h = nearestHorde(save, rx, ry); if (!h) continue; return { id: `horde:${h.rx},${h.ry}`, kind, text: K.line(h), rx: h.rx, ry: h.ry, dungeon: h.dungeon, name: K.title }; }
    if (K.set) { if (K.passive ? arcanaHas(save, K.passive) : !K.open(save)) continue; const e = homeEdge(save, K.set); return { id: `arcana:${K.set}`, kind, text: K.line(arcanaHint(K.set, saveFrame(save))), rx: e.rx, ry: e.ry, name: K.title }; }
    if (K.open(save)) return { id: kind, kind, text: K.line(), name: K.title };
  }
  return null;
}
// Records a rumour heard (once by id; a rumour heard again replaces the old record). Returns { rumour, first }.
export function recordRumour(save, rumour, by = "", at = Number(save?.playSeconds) || 0) {
  const L = ensureLeads(save), first = !L.rumours.length, r = { ...rumour, by, at: Math.floor(at) };
  let list = [...L.rumours.filter((q) => !sameRumour(q, r)), r];
  if (r.kind === "wonder") { const over = wonderOverflow(save, list); list = list.filter((q) => !over.has(q) && !(q.kind === "wonder" && !rumourLive(save, q))); } // LEADS.wonderMax: the oldest wonder goes (and wonders already reached)
  L.rumours = list.slice(-LEAD_RECORD.rumourMax);
  return { rumour: r, first };
}
// The lead floor (G2): a person's idle line becomes a rumour while fewer than LEADS.floor leads stand (or, floor or not, one whose
// kind is told `always`: the horde rumour). Returns
// { text, rumour, first } or null (the idle line stands).
// Phase 6 (G3): once the dry spell has run its course, the next person who tells rumours gives the strong lead, floor or not.
export function rumourTurn(save, by, rx = 0, ry = 0) {
  const strong = pityLead(save, rx, ry);
  if (strong) { const out = recordRumour(save, strong, by); return { text: strong.text, strong: true, ...out }; }
  const r = nextRumour(save, rx, ry, !needsRumour(save)); if (!r) return null; // above the floor, only a rumour told floor or not (`always`)
  const out = recordRumour(save, r, by); return { text: r.text, ...out };
}
// A traveller's wonder (release 674, wonders.ts wonderRumour) is kept as a lead too: the same wonder the traveller named.
export function noteWonderLead(save, rx, ry, who = "") {
  const list = nearestWonders(save, rx, ry); if (!list.length) return null;
  const w = list[hashSeed(`${save?.seed}:rumour:${who}`) % list.length];
  return recordRumour(save, { id: `wonder:${w.rx},${w.ry}`, kind: "wonder", text: RUMOURS.wonder.line(w, rx, ry), rx: w.rx, ry: w.ry, name: WONDERS.kinds[w.kind].atlas }, who);
}
// The Journal's rumour rows: live rumours, newest first, each with its compass point when it has one.
export function rumourLeads(save) {
  return liveRumours(save).slice().reverse().map((r) => ({ id: r.id, title: r.name || RUMOURS[r.kind]?.title || "A rumour", detail: r.text, ...(Number.isInteger(r.rx) ? { at: { rx: r.rx, ry: r.ry } } : {}) }));
}

// ---------------------------------------------------------------- the Journal dot (4.3)
const exploredCount = (save) => Object.keys(save?.explored && typeof save.explored === "object" ? save.explored : {}).length;
export function noteFollow(save) { const L = ensureLeads(save); L.followedAt = exploredCount(save); return L; }
export const leadDot = (save, guided = false) => !guided && leadCount(save) > 0 && exploredCount(save) - (Number(save?.leads?.followedAt) || 0) >= LEADS.idleSections;
// Arcana passives a rumour can point at (for the compendium's coverage: every rumour names a real reward).
export const RUMOUR_PASSIVES = Object.freeze(RUMOUR_ORDER.map((k) => RUMOURS[k].passive).filter((p) => p && ARCANA_UNLOCKS[p]));
