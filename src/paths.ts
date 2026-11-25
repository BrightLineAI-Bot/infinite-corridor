// Paths, the progression view (docs/progression-design.md revision 3; the Paths design, part 1: the model). A pure, read-only
// read of the save and the data tables: for each family of abilities, what is yours, what you can get next and the one concrete
// step for it, what is known but distant, and what is still a silhouette. True secrets (a hidden thread reward, visibility X) are
// never drawn or counted until they are yours. Nothing new is saved, and nothing here writes the save.
//
// What it returns (pathsModel):
//   header    hours, sections, your reach (the strongest threat ring you have stood in), the world abilities count, the mode
//   ladder    your Aperture band, the next gate and what it opens; when the gate is the Listener, the chain to it
//             (relays answered, the Mouth known, the Listener felled) and the Mouth to point the compass at
//   next      "Next for you": up to PATHS.nextCount steps, those for your kit first, then the cheapest; plus `longRoad`, one Bold one
//   families  one card per Constellation branch, then Spells, the Lattice's passives, Weapons and tools: held chips and entries
//   summaries the rest (gear, Echoes, glyphs, marginalia, supplies, mounts and companions, traversal): counts and at most one step
//   extra     Classic only: the quests and milestones that are extra routes there
// Each entry: { id, name (null for a silhouette), state (PATHS.states), route, step, progress, at, away, heading, threat, bold,
// compass, following, kit, hangs? }. `compass` is what the Journal's "Point compass here" would choose for the same lead: a quest's
// follow ({ kind: "quest", id: "progress:<id>", name }, quest-places.ts questLeads), the hatchling's ({ kind: "rescue" }) or a pin
// ({ rx, ry, name }, as the Journal pins a lead with a place). main.ts applies it through chooseGuidance / compassPin.
//
// Hazards kept: quests.ts seededThreads() writes save.quests.threads the first time it is read (and progression.ts storyState
// reaches it through carrierOf), so the two seeded thread rewards are read here through seededPick, never through those;
// quest-places.ts questPlace may resolve and save a new place, so a quest's place is read as it stands (stepPlace); the Far Array
// is read raw (far-array.ts ensureFarArray normalises in place); thread and Bells progress are read per set (threads.ts
// arcanaProgress normalises save.lore.surveyor). A test deep-compares the save before and after.
import { APERTURE_BANDS, apertureBand, skillRank, APERTURE_SKILLS, weaponKey, toolKey } from "./items.ts";
import { regionalThreat } from "./world.ts";
import { tierCap, listenerKills, apertureCeiling, STAGES } from "./stages.ts";
import { exploring, progressionKept, modeInfo, progressionMode } from "./journey-start.ts";
import { PROGRESSION_ROWS, ROW_BY_ID, ROW_ALIASES, GROUPS, progressionState, gateV1 } from "./progression.ts";
import { BRANCHES, BRANCH_IDS, ALT_PASSIVES, ALT_UNLOCK_TIER, altUnlocked, hasNode } from "./constellation.ts";
import { latticeOpen, TRANSIT_LATTICE } from "./transit-lattice.ts";
import { AWAKENED_ARTS } from "./weapon-arts.ts";
import { ARCANA_UNLOCKS } from "./lore.ts";
import { THREADS, ARCANA_SETS, arcanaWhere, threadFound } from "./threads.ts";
import { RELAY_TARGET } from "./relay-network.ts";
import { LISTENER_RETURN } from "./far-array.ts";
import { rescueGuidance } from "./hatchling.ts";
import { compassChoiceIs } from "./types.ts";
import { WORLD_ROUTE_OF, MILESTONES, MILESTONE_FOR, RELIQUARY, worldWithheld, earnedWorld, featCount, milestoneLine } from "./world-routes.ts";
import { QUESTS, QUEST_IDS, QUEST_FOR, THREAD_REWARDS, SEEDED_REWARDS, SEEDED_IDS, STORY_ROUTE_OF, STORY_SEEN, VISCERA_SHOP, seededPick, questOpen, questStep, questState, stepCount, stepDone, stepPlace, questFollowId, storyWithheld, boughtRumour } from "./quests.ts";

// ---------------------------------------------------------------- data
export const PATHS = Object.freeze({
  bold: 1.5, // a place whose foes are more than this many times as hardy as the hardiest ring you have stood in is Bold
  nextCount: 3, // "Next for you": this many steps, then one long road
  farRing: 1000, // where the far-road quests and the Divine Viscera wait (quests.ts gate.far; items.ts refinement)
  ladderLook: 40, // how many bands ahead the Ladder looks for one that opens something
  states: Object.freeze({
    yours: Object.freeze({ glyph: "●", word: "Yours" }),
    next: Object.freeze({ glyph: "◐", word: "Next step" }),
    known: Object.freeze({ glyph: "○", word: "Known, distant" }),
    rumoured: Object.freeze({ glyph: "◌", word: "Rumoured" }),
    silhouette: Object.freeze({ glyph: "?", word: "Not yet known" }),
  }),
  routes: Object.freeze({ S: "Start", a: "Levelling", b: "Quest", c: "Milestone", d: "Thread", R: "Reliquary", V: "Viscera", F: "Found", U: "Upgrade", W: "Forge" }),
});
// The families (one card each) and the summaries (counts), by progression.ts group. Every row belongs to exactly one.
const BRANCH_GROUPS = Object.freeze(["disciplines", "nodes", "forms"]);
export const PATH_FAMILIES = Object.freeze([
  ...BRANCH_IDS.map((b) => Object.freeze({ id: b, title: BRANCHES[b].name, branch: b })),
  Object.freeze({ id: "spells", title: "Spells", groups: Object.freeze(["spells"]) }),
  Object.freeze({ id: "lattice", title: "Lattice and Arcana passives", groups: Object.freeze(["lattice", "arcana"]) }),
  Object.freeze({ id: "arts", title: "Weapons and tools", groups: Object.freeze(["arts", "awakened"]) }),
]);
export const PATH_SUMMARIES = Object.freeze(["gear", "echoes", "glyphs", "marginalia", "supplies", "mounts", "traversal"]);
// The words (the game's restrained voice).
export const PATHS_WORDS = Object.freeze({
  title: "Paths",
  intro: "What you hold, what you can reach next and how, and what is still only a shape. Nothing here is bought; it reads and points.",
  classic: "Classic: the bands open most of it. Quests and milestones are extra routes.",
  switchNote: "Switch it in Options → Journeys.",
  listener: "once a Listener falls",
  arcanum: "Take it in Pack → Arcanum.",
  notFound: "Not found yet",
  secret: "Not found yet. No one speaks of how.",
  paths: "(Arcanum → Paths)",
  leads: "(Journal → Leads)",
  arcana: "(Journal → Arcana)",
  reliquary: "something at the end of a dungeon: a Deep floor, a horde, a Pentagon's heart, a vault",
  story: "the end of a story you have not begun",
  deed: "a deed you have not begun",
  consolation: (dust) => `If it is already yours by then, it pays ${dust} lumen dust.`,
  extra: "An extra route: it gives this early.",
});

// ---------------------------------------------------------------- small reads (none of them write)
const num = (v) => Math.max(0, Number(v) || 0);
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const tierOf = (save) => APERTURE_BANDS.indexOf(apertureBand(num(save?.perception?.aperture)));
const bandName = (t) => APERTURE_BANDS[t]?.name || `tier ${t}`;
const bandIndexOfAperture = (ap) => APERTURE_BANDS.indexOf(apertureBand(ap));
const heading = (dx, dy) => (!dx && !dy ? "here" : `${dy < 0 ? "north" : dy > 0 ? "south" : ""}${dy && dx ? "-" : ""}${dx < 0 ? "west" : dx > 0 ? "east" : ""}`); // main.ts compassHeading
const answeredRelays = (save) => Object.keys(save?.relayNetwork?.nodes && typeof save.relayNetwork.nodes === "object" ? save.relayNetwork.nodes : {}).length;
// The Listener kills a band needs: none within Stage 1; then the first kill opens Stage 2, and each later stage takes more.
const killsFor = (tier) => { const stage = Math.ceil(tier / STAGES.tiersPerStage); return stage <= 1 ? 0 : STAGES.firstKills + (stage - 2) * STAGES.killsPerStage; };
export const listenerGated = (save, tier) => Number(tier) > tierCap(save); // the Aperture holds below `tier` until a Listener falls (again)
// "Infinite III, once a Listener falls" (or just the band's name when no Listener stands in the way).
export const bandWords = (save, tier, listeners = 0) => `${bandName(tier)}${listenerGated(save, tier) || listenerKills(save) < listeners ? `, ${PATHS_WORDS.listener}` : ""}`;
// The thread carrying a d ability on this journey, without saving the seeded pick (quests.ts carrierOf would, on first read).
function carrierPure(save, id) {
  for (const [set, r] of Object.entries(THREAD_REWARDS)) if (r.ability === id) return set;
  if (!SEEDED_REWARDS[id]) return null;
  const saved = save?.quests?.threads?.[id];
  return SEEDED_REWARDS[id].candidates[saved] ? saved : seededPick(save?.seed)[id];
}
const carrierTitle = (set) => THREAD_REWARDS[set]?.title || THREADS[set]?.title || Object.values(SEEDED_REWARDS).map((S) => S.candidates[set]?.title).find(Boolean) || "a thread";
const begunCount = (save, set) => set === "second" ? (Array.isArray(save?.lore?.second?.trail) && save.lore.second.trail.length ? Math.max(1, (save.lore.second.passed || []).length) : 0) : Array.isArray(save?.lore?.threads?.[set]) ? save.lore.threads[set].length : 0;
const secretRow = (save, row) => STORY_ROUTE_OF[row.id] === "d" && STORY_SEEN[row.id] === "X" && exploring(save);
// A row's state as the journey's own rules read it. progressionState, except where it would save the seeded picks.
function stateOf(save, row) {
  if (SEEDED_REWARDS[row.id] && storyWithheld(save, row.id)) {
    if (boughtRumour(save, row.id)) return "rumoured";
    const set = carrierPure(save, row.id); return STORY_SEEN[row.id] === "H" && set && begunCount(save, set) > 0 ? "rumoured" : "locked";
  }
  return progressionState(save, row);
}
// A thread's or an Arcana set's progress, read only for the sets asked about. Not threads.ts arcanaProgress: the Surveyor's count
// there normalises save.lore.surveyor in place. The Surveyor carries no ability, so it is never asked for here.
function arcanaReader(save) {
  const memo = {};
  return (set) => {
    if (typeof set !== "string") return null; if (set in memo) return memo[set];
    const T = THREADS[set], S = set !== "surveyor" ? ARCANA_SETS[set] : null;
    const r = T ? { id: set, title: T.title, unit: "pieces", found: Math.min(threadFound(save, set).length, T.pieces.length), total: T.pieces.length } : S ? { id: set, title: S.title, unit: S.unit, found: Math.min(S.found(save), S.total()), total: S.total() } : null;
    if (r) r.where = r.found >= r.total ? null : arcanaWhere(save, set);
    return (memo[set] = r);
  };
}
// Sections explored and the farthest stood from the Refuge (quests.ts farthest's measure), in one pass: Object.keys on a big
// explored record is the costliest read here, so it is made once a build.
function exploredOf(save) {
  const ex = save?.explored && typeof save.explored === "object" ? save.explored : {}, keys = Object.keys(ex);
  let far = 0; for (const k of keys) { const i = k.indexOf(","), h = Math.hypot(Number(k.slice(0, i)), Number(k.slice(i + 1))); if (h > far) far = h; }
  return { sections: keys.length, far };
}
// Where the Wayfarer stands (the section) and the place's threat.
function hereOf(save, here) { const s = here || save?.session || {}; return { rx: Number.isInteger(s.rx) ? s.rx : 0, ry: Number.isInteger(s.ry) ? s.ry : 0 }; }
const threatAt = (rx, ry) => regionalThreat(rx, ry).hpMultiplier;
// The family a row belongs to.
const nodeBranch = (id) => BRANCH_IDS.find((b) => { const B = BRANCHES[b]; return B.mod.id === id || B.caps.some((c) => c.id === id) || (B.extras || []).some((x) => x.id === id); }) || null;
function familyOf(row) {
  if (row.group === "disciplines") { const k = row.own[1]; return k === "aerial-step" ? "motion" : BRANCH_IDS.find((b) => BRANCHES[b].active === k) || "motion"; }
  if (row.group === "nodes") return row.own[2] || nodeBranch(row.id);
  if (row.group === "forms") { const n = row.own[1]; return BRANCH_IDS.find((b) => BRANCHES[b].active === n) || nodeBranch(n) || "motion"; }
  return PATH_FAMILIES.find((f) => f.groups?.includes(row.group))?.id || row.group;
}
const nodeName = (id) => { for (const b of BRANCH_IDS) { const B = BRANCHES[b]; if (B.active === id) return APERTURE_SKILLS[id]?.name; for (const n of [B.mod, ...B.caps, ...(B.extras || [])]) if (n.id === id) return n.name; } return APERTURE_SKILLS[id]?.name || id; };

// ---------------------------------------------------------------- one entry
// ctx: { save, v1, here, reach, kit:Set, compass:{pin,follow} }
function placeChips(ctx, at, ring = null) {
  if (at) {
    const dx = at.rx - ctx.here.rx, dy = at.ry - ctx.here.ry, threat = threatAt(at.rx, at.ry);
    return { at: { rx: at.rx, ry: at.ry }, away: Math.max(Math.abs(dx), Math.abs(dy)), heading: heading(dx, dy), threat, bold: threat > ctx.reach * PATHS.bold };
  }
  if (ring != null) { const threat = threatAt(ring, 0); return { at: null, away: null, heading: null, ring, threat, bold: threat > ctx.reach * PATHS.bold }; }
  return { at: null, away: null, heading: null, threat: null, bold: false };
}
const following = (ctx, c) => compassChoiceIs(ctx.compass, c); // 2026-11-25: the one matcher the Journal's Leads and the quick menu use (types.ts)
// `steps` is the ordered list behind `step` (a quest's every step, done or not; one step otherwise), so a family can later carry
// ranked lines of steps without the entries changing shape; `step` and `progress` are always the current one's.
function entry(ctx, row, state, step, extra = {}) {
  const { v1 } = ctx, compass = extra.compass || null, progress = extra.progress || null;
  const steps = extra.steps || (step ? [{ key: "now", text: step, done: false, current: true, progress }] : []);
  return { id: row.id, name: state === "silhouette" ? null : row.name, family: familyOf(row), state, route: extra.route || (v1 ? row.v1.route : row.v0.route),
    step, progress, steps, ...placeChips(ctx, extra.at || null, extra.ring ?? null), compass, following: following(ctx, compass),
    kit: row.archetypes.some((a) => ctx.kit.has(a)), ...(extra.hangs ? { hangs: extra.hangs } : {}), ...(extra.extraRoute ? { extraRoute: true } : {}) };
}
// A quest's step now, read without resolving any place: { text, progress, at, compass }.
function questNow(ctx, id) {
  const { save } = ctx, Q = QUESTS[id], step = questStep(save, id); if (!Q || !step) return null;
  const n = stepCount(save, id, step.key), progress = step.need ? { n: Math.min(n, step.need), need: step.need } : { n: Q.steps.indexOf(step), need: Q.steps.length };
  let at = null;
  if (step.key === "meal") at = Q.from; else if (step.on === "speak") at = questState(save, id)?.giverAt || Q.from;
  else { const p = step.place ? stepPlace(save, id, step.key) : step.placeOf ? stepPlace(save, id, step.placeOf) : null; at = p && !p.relaxed && Number.isInteger(p.rx) ? p : null; }
  const steps = Q.steps.map((s) => ({ key: s.key, text: s.text, done: stepDone(save, id, s.key), current: s === step, progress: s === step ? progress : null }));
  return { text: `${Q.giverName}: ${step.text}`, progress, at, steps, compass: { follow: { kind: "quest", id: questFollowId(id), name: Q.title } } };
}
// A quest not yet offered: what stands in the way.
function questGate(ctx, id) {
  const { save } = ctx, Q = QUESTS[id], who = Q.giver ? `A quest from ${Q.giverName}` : "A quest out on the far road";
  const tierOk = tierOf(save) >= Q.gate.tier, farOk = !Q.gate.far || ctx.far >= Q.gate.far;
  if (tierOk && farOk) return { text: `${who}: it opens soon.`, state: "next" };
  const parts = [...(!tierOk ? [`at ${bandWords(save, Q.gate.tier)}`] : []), ...(!farOk ? [`once you have stood ${fmt(Q.gate.far)} sections out (you: ${fmt(ctx.far)})`] : [])];
  return { text: `${who}: it opens ${parts.join(", and ")}.`, state: "known", ring: Q.gate.far || null };
}
// A world ability Exploration still withholds (route b, c, d, R or V). Null: a secret, never drawn.
function worldEntry(ctx, row, state) {
  const { save } = ctx, id = row.id, route = STORY_ROUTE_OF[id] || WORLD_ROUTE_OF[id], rumour = boughtRumour(save, id);
  if (rumour && route !== "b" && route !== "c") return entry(ctx, row, "rumoured", `A rumour, bought with Divine Viscera: ${rumour.where}.`);
  if (route === "b") {
    const q = QUEST_FOR[id];
    if (questOpen(save, q)) { const s = questNow(ctx, q); if (s) return entry(ctx, row, "next", s.text, { progress: s.progress, at: s.at, steps: s.steps, compass: s.compass }); }
    const g = questGate(ctx, q); return entry(ctx, row, g.state, g.text, { ring: g.ring });
  }
  if (route === "c") {
    const m = MILESTONE_FOR[id], n = featCount(save, m.key);
    if (n > 0) return entry(ctx, row, "next", `A milestone, anywhere: ${milestoneLine(m, n)}.`, { progress: { n: Math.min(n, m.need), need: m.need } });
    return row.visibility === "H" ? entry(ctx, row, "silhouette", `${PATHS_WORDS.deed}.`, { hangs: hangs(row) }) : entry(ctx, row, "known", `A milestone, anywhere: ${milestoneLine(m, 0)}.`, { progress: { n: 0, need: m.need } });
  }
  if (route === "R") return entry(ctx, row, "silhouette", `${PATHS_WORDS.reliquary}.`, { hangs: hangs(row) });
  if (route === "V") {
    const price = VISCERA_SHOP.forms[id];
    if (save?.refinement?.unlocked === true) return entry(ctx, row, "next", `For ${price} Divine Viscera at Sela's forge or any smith (you have ${fmt(num(save?.skylands?.viscera))}).`, { progress: { n: Math.min(price, num(save?.skylands?.viscera)), need: price } });
    return entry(ctx, row, "known", `For Divine Viscera, once you have stood ${fmt(PATHS.farRing)} sections out (you: ${fmt(ctx.far)}).`, { ring: PATHS.farRing });
  }
  // route d: a thread's ending
  if (secretRow(save, row)) return null;
  const set = carrierPure(save, id), n = set ? begunCount(save, set) : 0;
  if (state === "rumoured" && set) {
    const T = THREADS[set], total = T?.pieces?.length || null, where = ctx.arcana(set)?.where;
    return entry(ctx, row, "rumoured", `The end of ${carrierTitle(set)}${total ? `: ${Math.min(n, total)} of ${total}` : ""}. Something waits there.${where ? ` The rest most likely lie ${where}.` : ""}`, { progress: total ? { n: Math.min(n, total), need: total } : null });
  }
  return entry(ctx, row, "silhouette", `${PATHS_WORDS.story}.`, { hangs: hangs(row) });
}
// What a silhouette hangs from: which node it changes, or what kind of thing it is (never its name).
function hangs(row) {
  if (row.group === "forms") return `a second form of ${nodeName(row.own[1])}`;
  if (row.group === "nodes") return `the ${BRANCHES[row.own[2]]?.name || ""} branch`.replace("  ", " ");
  if (row.group === "spells") return "a spell";
  if (row.group === "lattice") return "a Lattice passive";
  if (row.group === "arts") return "a weapon art or tool form";
  return "an ability";
}
// Found (earned or kept) but not yet usable: what it waits for.
function foundEntry(ctx, row) {
  const k = row.own[0];
  if (k === "field") return entry(ctx, row, latticeOpen(ctx.save) ? "next" : "known", `Found. It waits for the Transit Lattice: ${bandWords(ctx.save, TRANSIT_LATTICE.openTier, TRANSIT_LATTICE.openListeners)}.`);
  if (k === "alt") return entry(ctx, row, "next", `Found. Learn ${nodeName(row.own[1])} in Pack → Arcanum to use it.`);
  if (k === "spell") return entry(ctx, row, "next", "Found. Set it in a slot in Pack → Arcanum.");
  return entry(ctx, row, "next", `Found. ${PATHS_WORDS.arcanum}`);
}
// An ability the core rules gate (levelling, bands, the Arcanum, the forge), or any ability in Classic.
function coreEntry(ctx, row, state) {
  const { save, v1 } = ctx, ap = num(save?.perception?.aperture), [kind, a, b, c] = row.own;
  if (state === "open") {
    if (row.id === "awakened:awakening") return entry(ctx, row, "next", "At Sela's forge: a weapon or tool at its cap, holding a Resonance, for 6 lumen dust.");
    if (kind === "hatchling") { const r = rescueGuidance(save?.mounts?.hatchling); return entry(ctx, row, "next", r ? "His mother at the Beast Hotel asked you to save him." : "His mother waits at the Beast Hotel.", r ? { at: r, compass: { follow: { kind: "rescue" } } } : {}); }
    if (row.group === "supplies") return null;
    return entry(ctx, row, "next", PATHS_WORDS.arcanum);
  }
  if (kind === "arcana") {
    const set = ARCANA_UNLOCKS[row.id]?.from, p = ctx.arcana(set);
    if (!p) return entry(ctx, row, "known", row.v0.how);
    return entry(ctx, row, p.found > 0 ? "next" : "known", `Complete ${p.title}: ${p.found} of ${p.total} ${p.unit === "pieces" ? "found" : p.unit}.${p.where ? ` ${p.found ? "The rest most likely lie" : "Most likely"} ${p.where}.` : ""}`, { progress: { n: p.found, need: p.total } });
  }
  if (kind === "alt" && !v1) { // Classic: the switch opens at Infinite III, then on any learned node
    if (!altUnlocked(save)) return entry(ctx, row, "known", `Its switch opens at ${bandWords(save, ALT_UNLOCK_TIER)}.`);
    return entry(ctx, row, "next", `Learn ${nodeName(a)} first.`);
  }
  if (kind === "node" && c === "cap") { const sk = APERTURE_SKILLS[BRANCHES[b].active]; return entry(ctx, row, "known", `Master ${sk.name} and take ${BRANCHES[b].mod.name} first.`); }
  if (kind === "node") { const sk = APERTURE_SKILLS[BRANCHES[b].active]; if (skillRank(save, sk.id) < 1) return entry(ctx, row, "known", `Learn ${sk.name} first.`); }
  if (kind === "awakened" && AWAKENED_ARTS.moves[a]) return entry(ctx, row, "known", `Awaken the ${nameOfWeapon(AWAKENED_ARTS.moves[a].weapon)} at Sela's forge: at its cap, holding a Resonance.`);
  const gt = v1 ? gateV1(row) : row.v0.gate;
  if (gt?.level != null) { const lv = Math.max(1, Math.floor(Number(save?.level)) || 1); return entry(ctx, row, "next", `Opens at level ${gt.level} (you: ${lv}).`, { progress: { n: Math.min(lv, gt.level), need: gt.level } }); }
  if (gt?.aperture != null) return entry(ctx, row, "next", `Opens at Aperture ${fmt(gt.aperture)} (you: ${fmt(ap)}).`, { progress: { n: Math.min(ap, gt.aperture), need: gt.aperture } });
  if (gt?.tier != null) {
    const what = kind === "field" ? (gt.listeners ? `From the Transit Lattice, which opens at ${bandWords(save, gt.tier, gt.listeners)}.` : "") : "";
    if (listenerGated(save, gt.tier) || listenerKills(save) < (gt.listeners || 0)) return entry(ctx, row, "known", what || `Opens at ${bandWords(save, gt.tier, gt.listeners || 0)}.`);
    const need = APERTURE_BANDS[gt.tier]?.threshold || 0;
    return entry(ctx, row, "next", what || `Opens at ${bandName(gt.tier)}: Aperture ${fmt(need)} (you: ${fmt(ap)}).`, { progress: { n: Math.min(ap, need), need } });
  }
  return entry(ctx, row, "known", `${row.v0.how.replace(/\.$/, "")}.`);
}
const WEAPON_NAMES = Object.freeze({ "iron-fists": "Iron Fists", "salvage-blade": "Salvage Blade", "cinder-pike": "Cinder Pike", "verge-cleaver": "Verge Cleaver", "fourfold-daggers": "Fourfold Daggers", "quandrix-staff": "Quandrix Staff" });
const nameOfWeapon = (k) => WEAPON_NAMES[k] || ROW_BY_ID[`gear:${k}`]?.name || k;
// One row's entry, or null when it is not drawn (a secret, or a supply with nothing to say).
function rowEntry(ctx, row) {
  const { save, v1 } = ctx, state = ctx.states?.[row.id] ?? stateOf(save, row);
  if (state === "owned") return entry(ctx, row, "yours", "");
  if (v1 && secretRow(save, row) && !boughtRumour(save, row.id)) return null;
  if (v1 && worldWithheld(save, row.id)) return worldEntry(ctx, row, state);
  if ((WORLD_ROUTE_OF[row.id] || STORY_ROUTE_OF[row.id]) && state === "open" && (earnedWorld(save, row.id) || progressionKept(save, row.id))) return foundEntry(ctx, row);
  if (state === "rumoured") return entry(ctx, row, "rumoured", "Seen, not yet slain.");
  return coreEntry(ctx, row, state);
}

// ---------------------------------------------------------------- the Ladder
// What reaching band `t` opens on this journey (none of it withheld in the world): names grouped as short phrases.
// What reaching each band opens, gathered in one pass over the rows (the Ladder then reads only the bands it asks about).
function opensByBand(ctx, states) {
  const { save, v1 } = ctx, by = new Map(), slot = (t) => by.get(t) || (by.set(t, { spells: [], others: [] }), by.get(t));
  for (const row of PROGRESSION_ROWS) {
    if (states[row.id] !== "locked" || row.group === "lattice" || row.group === "arts" || row.group === "forms" || row.group === "gear") continue; // the Lattice and the switch are named whole
    if (v1 && (worldWithheld(save, row.id) || secretRow(save, row))) continue;
    const gt = v1 ? gateV1(row) : row.v0.gate; if (!gt || gt.level != null) continue;
    const at = gt.tier != null ? gt.tier : gt.aperture != null ? bandIndexOfAperture(gt.aperture) : null; if (at == null) continue;
    (row.group === "spells" ? slot(at).spells : slot(at).others).push(row.name);
  }
  return by;
}
function opensAt(ctx, t, states, by) {
  const { save, v1 } = ctx, out = [], b = by.get(t);
  if (b?.spells.length) out.push(`${b.spells.length} spell${b.spells.length === 1 ? "" : "s"}: ${b.spells.join(", ")}`);
  if (b?.others.length) out.push(b.others.join(", "));
  if (!latticeOpen(save) && TRANSIT_LATTICE.openTier === t) { const free = PROGRESSION_ROWS.filter((r) => (r.group === "lattice" || r.group === "arts") && states[r.id] === "locked" && !(v1 && worldWithheld(save, r.id)) && !(v1 && secretRow(save, r))).length; out.push(`the Transit Lattice${free ? ` and ${free} passive${free === 1 ? "" : "s"}` : ""}`); }
  if (!altUnlocked(save) && ALT_UNLOCK_TIER === t) out.push("secondary forms");
  if (v1) for (const id of QUEST_IDS) { const Q = QUESTS[id]; if (Q.gate.tier === t && !Q.gate.far && !questState(save, id) && storyWithheld(save, Q.ability)) out.push(`${Q.name}'s quest`); }
  return out;
}
function ladderOf(ctx, states) {
  const { save } = ctx, ap = num(save?.perception?.aperture), tier = tierOf(save), cap = tierCap(save), held = ap >= apertureCeiling(save);
  let t = tier + 1, opens = [];
  const last = Math.min(APERTURE_BANDS.length - 1, tier + PATHS.ladderLook);
  const by = opensByBand(ctx, states);
  for (; t <= last; t++) { opens = opensAt(ctx, t, states, by); if (opens.length || t > cap) break; }
  if (t > last) { t = tier + 1; opens = []; } // nothing ahead opens anything: the next band, plainly
  if (t >= APERTURE_BANDS.length) return { tier, band: bandName(tier), next: null, held, chain: [], opens: [], compass: null, following: false };
  const need = APERTURE_BANDS[t].threshold, listener = t > cap, chain = [];
  if (listener) {
    const top = apertureCeiling(save), coord = save?.relayNetwork?.coordinate, known = !!coord && Number.isInteger(coord.rx) && Number.isInteger(coord.ry);
    const f = save?.farArray && typeof save.farArray === "object" ? save.farArray : {}, kills = listenerKills(save), want = killsFor(t), n = answeredRelays(save);
    chain.push({ id: "aperture", done: held, text: held ? `The Aperture holds at ${fmt(top)}, the top of ${bandName(cap)}.` : `Aperture ${fmt(top)}, the top of ${bandName(cap)} (you: ${fmt(ap)}).`, progress: { n: Math.min(ap, top), need: top } });
    chain.push({ id: "relays", done: known, text: known ? `Relays answered: the network gave a coordinate.` : `Answer relays: ${Math.min(n, RELAY_TARGET)} of ${RELAY_TARGET}. Restore or sever each, after its crossing's guardian falls.`, progress: { n: known ? RELAY_TARGET : Math.min(n, RELAY_TARGET), need: RELAY_TARGET } });
    const away = f.quiet ? Math.max(0, num(f.relaysAt) + LISTENER_RETURN.returnRelays - n) : 0;
    chain.push({ id: "mouth", done: known && !f.quiet, text: !known ? "The Listener's Mouth: not known yet." : f.quiet ? `The Listener is away from its Mouth at ${coord.rx}, ${coord.ry}: answer ${away} more relay${away === 1 ? "" : "s"} and one returns.` : `The Listener's Mouth: ${coord.rx}, ${coord.ry}.` });
    chain.push({ id: "listener", done: kills >= want, text: `Fell the Listener${want > 1 ? `: ${Math.min(kills, want)} of ${want}` : ""}.`, progress: { n: Math.min(kills, want), need: want } });
    const compass = known ? { pin: { rx: coord.rx, ry: coord.ry, name: "The Far Array" } } : null; // the Journal's Leads pin the same lead by its title
    return { tier, band: bandName(tier), next: { tier: t, band: bandName(t), aperture: need, need: Math.max(0, need - ap), listener: true }, held, chain, opens, ...placeChips(ctx, known ? coord : null), compass, following: following(ctx, compass) };
  }
  return { tier, band: bandName(tier), next: { tier: t, band: bandName(t), aperture: need, need: Math.max(0, need - ap), listener: false }, held, chain, opens, at: null, away: null, heading: null, threat: null, bold: false, compass: null, following: false };
}

// ---------------------------------------------------------------- the model
// The archetypes of what you carry and cast: the equipped weapon and tool, and what sits in the slots.
function kitOf(save) {
  const out = new Set(), add = (id) => { for (const a of ROW_BY_ID[ROW_ALIASES[id] || id]?.archetypes || []) out.add(a); };
  const p = save?.equipment?.primary, s = save?.equipment?.secondary;
  if (p && typeof p === "object") add(`gear:${weaponKey(p)}`);
  if (s && typeof s === "object") { const k = toolKey(s); if (k) add(`gear:${k}`); }
  for (const v of Object.values(save?.magicSkills?.slots || {})) if (typeof v === "string") add(v);
  return out;
}
// Each family's rows and each summary's, once (the table never changes).
export const FAMILY_ROWS = Object.freeze(Object.fromEntries([...PATH_FAMILIES.map((F) => [F.id, Object.freeze(PROGRESSION_ROWS.filter((r) => (F.branch ? BRANCH_GROUPS.includes(r.group) && familyOf(r) === F.id : F.groups.includes(r.group))))]),
  ...PATH_SUMMARIES.map((g) => [g, Object.freeze(PROGRESSION_ROWS.filter((r) => r.group === g))])]));
const ORDER = Object.freeze({ next: 0, rumoured: 1, known: 2, silhouette: 3 });
const frac = (e) => (e.progress && e.progress.need ? e.progress.n / e.progress.need : 0);
// For your kit first, then the most done, then the nearest (anywhere counts as here), then the least threat.
const cheaper = (a, b) => (b.kit - a.kit) || (frac(b) - frac(a)) || ((a.away ?? 0) - (b.away ?? 0)) || ((a.threat ?? 1) - (b.threat ?? 1));
export function pathsModel(save, { here = null } = {}) {
  const v1 = exploring(save), g = save?.guidance && typeof save.guidance === "object" ? save.guidance : {};
  const { sections, far } = exploredOf(save), reach = threatAt(far, 0);
  const ctx = { save, v1, here: hereOf(save, here), far, reach, kit: kitOf(save), compass: { pin: g.pin || null, follow: g.pin ? null : g.follow || null }, arcana: arcanaReader(save) };
  const states = ctx.states = {}, entries = {};
  for (const row of PROGRESSION_ROWS) states[row.id] = stateOf(save, row);
  const families = PATH_FAMILIES.map((F) => {
    const rows = FAMILY_ROWS[F.id], held = [], list = [];
    for (const row of rows) { const e = rowEntry(ctx, row); if (!e) continue; entries[row.id] = e; if (e.state === "yours") held.push({ id: e.id, name: e.name }); else list.push(e); }
    list.sort((a, b) => ORDER[a.state] - ORDER[b.state]);
    const counts = Object.fromEntries(Object.keys(PATHS.states).map((k) => [k, k === "yours" ? held.length : list.filter((e) => e.state === k).length]));
    return { id: F.id, title: F.title, held, entries: list, counts }; // entries: ordered; a later "line" can rank them without a new shape
  });
  const summaries = PATH_SUMMARIES.map((gid) => {
    const rows = FAMILY_ROWS[gid], owned = rows.filter((r) => states[r.id] === "owned").length;
    const steps = rows.filter((r) => states[r.id] === "open" && r.own[0] === "hatchling").map((r) => rowEntry(ctx, r)).filter(Boolean);
    for (const e of steps) entries[e.id] = e;
    return { id: gid, title: GROUPS.find((q) => q.id === gid)?.title || gid, owned, total: rows.length, ...(gid === "echoes" ? { seen: rows.filter((r) => states[r.id] === "rumoured").length } : {}), steps };
  });
  // Classic's extra routes: the quests open there, and the milestones under way, for what Classic has not yet given.
  const extra = [];
  if (!v1) {
    for (const id of QUEST_IDS) { if (!questOpen(save, id)) continue; const row = ROW_BY_ID[QUESTS[id].ability], s = questNow(ctx, id); if (row && s) extra.push({ ...entry(ctx, row, "next", s.text, { route: "b", progress: s.progress, at: s.at, steps: s.steps, compass: s.compass, extraRoute: true }), note: `${PATHS_WORDS.extra} ${PATHS_WORDS.consolation(RELIQUARY.consolation.dust)}` }); }
    for (const m of MILESTONES) { const n = featCount(save, m.key), row = ROW_BY_ID[m.ability]; if (!row || n <= 0 || earnedWorld(save, m.ability) || states[row.id] === "owned") continue; extra.push({ ...entry(ctx, row, "next", `A milestone, anywhere: ${milestoneLine(m, n)}.`, { route: "c", progress: { n: Math.min(n, m.need), need: m.need }, extraRoute: true }), note: `${PATHS_WORDS.extra} ${PATHS_WORDS.consolation(RELIQUARY.consolation.dust)}` }); }
  }
  // Next for you, and the long road.
  const all = [...families.flatMap((f) => f.entries), ...summaries.flatMap((s) => s.steps), ...extra];
  const nextUp = all.filter((e) => e.state === "next").sort(cheaper).slice(0, PATHS.nextCount);
  const longRoad = all.filter((e) => e.bold && (e.state === "next" || e.state === "known") && !nextUp.includes(e)).sort((a, b) => (b.kit - a.kit) || (b.state === "next") - (a.state === "next") || ((a.away ?? Infinity) - (b.away ?? Infinity)) || (a.threat - b.threat))[0] || null;
  // The header: the world half (Exploration's b, c, d, R and V abilities), secrets not counted until yours.
  const world = PROGRESSION_ROWS.filter((r) => STORY_ROUTE_OF[r.id] || WORLD_ROUTE_OF[r.id]).filter((r) => !(v1 && secretRow(save, r) && states[r.id] !== "owned"));
  const beyond = (r) => STORY_ROUTE_OF[r.id] === "V" || (QUEST_FOR[r.id] && (QUESTS[QUEST_FOR[r.id]].gate.far || 0) >= PATHS.farRing) || THREADS[carrierPure(save, r.id)]?.band === "beyond";
  const header = { mode: modeInfo(progressionMode(save)).name, exploration: v1, hours: num(save?.playSeconds) / 3600, sections,
    farthest: far, reach, world: { owned: world.filter((r) => states[r.id] === "owned").length, near: world.filter((r) => !beyond(r)).length, beyond: world.filter((r) => beyond(r) && states[r.id] !== "owned").length } };
  return { header, ladder: ladderOf(ctx, states), next: nextUp, longRoad, families, summaries, extra, entries };
}
// One line for the header.
export function pathsHeaderText(m) {
  const h = m.header, w = h.world;
  return [`${h.hours.toFixed(1)} h`, `${fmt(h.sections)} sections`, `reach: foes ×${h.reach.toFixed(1)}`, ...(h.exploration ? [`world abilities ${w.owned} of ${w.near}${w.beyond ? ` (${w.beyond} more past ${fmt(PATHS.farRing)} sections)` : ""}`] : [])].join(" · ");
}

// ---------------------------------------------------------------- the Arcanum's locked reasons (design 1.5 items 3 and 4)
// The reason a world-withheld ability is not yours yet, in the Arcanum's words, or null when it is not withheld. Never names
// where a secret is, and points to Leads only for what Leads lists (an open quest), to Arcana for a thread begun, else to Paths.
export function pathsReason(save, id) {
  const row = ROW_BY_ID[ROW_ALIASES[id] || id]; if (!row || !worldWithheld(save, row.id)) return null;
  const route = STORY_ROUTE_OF[row.id] || WORLD_ROUTE_OF[row.id], nf = PATHS_WORDS.notFound, rumour = boughtRumour(save, row.id);
  if (rumour && route !== "b" && route !== "c") return `${nf}: a rumour says ${rumour.where}.`;
  if (route === "b") { const q = QUEST_FOR[row.id], Q = QUESTS[q]; if (questOpen(save, q)) return `${nf}: a quest for ${Q.giverName} is under way ${PATHS_WORDS.leads}.`;
    const g = questGate({ save, far: exploredOf(save).far, here: { rx: 0, ry: 0 }, reach: 1, kit: new Set(), compass: {} }, q); return `${nf}: ${g.text.charAt(0).toLowerCase()}${g.text.slice(1).replace(/\.$/, "")} ${PATHS_WORDS.paths}.`; }
  if (route === "c") { const m = MILESTONE_FOR[row.id], n = featCount(save, m.key); return n > 0 || row.visibility !== "H" ? `${nf}: a milestone. ${milestoneLine(m, n)}.` : `${nf}: ${PATHS_WORDS.deed} ${PATHS_WORDS.paths}.`; }
  if (route === "R") return `${nf}: it waits at the end of something out in the world ${PATHS_WORDS.paths}.`;
  if (route === "V") return save?.refinement?.unlocked === true ? `${nf}: Sela's forge or any smith sells it for ${VISCERA_SHOP.forms[row.id]} Divine Viscera.` : `${nf}: for Divine Viscera, ${fmt(PATHS.farRing)} sections out and more ${PATHS_WORDS.paths}.`;
  if (secretRow(save, row)) return PATHS_WORDS.secret;
  const set = carrierPure(save, row.id);
  return set && begunCount(save, set) > 0 ? `${nf}: it waits at the end of ${carrierTitle(set)} ${PATHS_WORDS.arcana}.` : `${nf}: ${PATHS_WORDS.story} ${PATHS_WORDS.paths}.`;
}
// The Listener named where its rewards are (design 1.5 item 4): "Opens at the Infinite III band of the Aperture, once a Listener falls."
export const bandOpensText = (save, tier) => `Opens at the ${bandName(tier)} band of the Aperture${listenerGated(save, tier) ? `, ${PATHS_WORDS.listener}` : ""}.`;
