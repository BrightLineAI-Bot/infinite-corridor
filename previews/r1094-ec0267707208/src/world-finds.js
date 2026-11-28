// Milestones, the Reliquary and pity, granted (docs/progression-design.md revision 3, Phase 6; the rules: world-routes.ts). Pure
// rules over the save and the loaded map: game.ts counts the deeds, lays and opens the reliquaries and shows what they give; leads.ts
// (through world-leads.ts) tells the horde rumours and the strong (pity) lead. Nothing here changes a generator: a reliquary is an object laid over a place
// as it loads, from save.feats.reliquary (like the Second Wayfarer's traces and the seed hunts), so every floor generated before
// is byte for byte what it was.
import { exploring, ensureFeats, ensureProgression, progressionKept, PROGRESSION_RECORD, FEAT_RECORD, ensureLeads, LEAD_RECORD } from "./journey-start.js?v=r1094-ec0267707208";
import { MILESTONE_FOR, RELIQUARY, earnedWorld, worldWithheld, addCount, reliquaryOrder, reliquaryDue, WORLD_WITHHELD, MILESTONES } from "./world-routes.js?v=r1094-ec0267707208";
import { ROW_BY_ID, stateV0, ownership, progressionState } from "./progression.js?v=r1094-ec0267707208";
import { QUESTS, QUEST_FOR, threadReward, carrierOf, storyWithheld, STORY_WITHHELD, STORY_ROUTE_OF, VISCERA_SHOP, boughtRumour, paidRumourView } from "./quests.js?v=r1094-ec0267707208"; // Phase 7: quests (b) and thread endings (d) grant here too; Phase 8: Viscera (V)
import { nearestHorde, nearestShaft } from "./world-leads.js?v=r1094-ec0267707208";

const feats = (save) => (save?.feats?.counts && save.feats.reliquary?.sites && save.feats.earned && save.feats.pity ? save.feats : ensureFeats(save));
const exploredCount = (save) => Object.keys(save?.explored && typeof save.explored === "object" ? save.explored : {}).length;

// ---------------------------------------------------------------- granting (both routes, both modes)
// Exploration: a withheld ability is given (earned, and kept for good). Classic (section 6): one today's rules do not yet give is
// given the same way (an extra route: a form found opens its switch before Infinite III); one they already give (or open) pays a
// consolation in lumen dust instead, naming what it would have taught. Either way it is noted once (save.feats.earned), so a
// threshold grants once and the next reliquary moves on. Returns a notice { id, name, route, from, given, dust, title, detail,
// text } or null when it was already earned.
export const WORLD_WORDS = Object.freeze({
  milestone: "A MILESTONE", reliquary: "A RELIQUARY", quest: "A QUEST'S END", thread: "A THREAD'S END", viscera: "DIVINE VISCERA",
  consolation: (n, name) => `${n} lumen dust · it would have taught ${name}, already yours`,
  given: (name, how) => `${name} · ${how}`,
  empty: "The reliquary is empty but for a little lumen dust: everything it could hold is already yours.",
  opened: "An opened reliquary. What it held is yours.",
});
const TITLES = Object.freeze({ c: WORLD_WORDS.milestone, R: WORLD_WORDS.reliquary, b: WORLD_WORDS.quest, d: WORLD_WORDS.thread, V: WORLD_WORDS.viscera });
// How it came, in a few words (`from`: the milestone key, the reliquary's kind, the quest id, or the thread's set id), and the line
// it is given with (a quest's or a thread's own hook, unhinged as written; Phase 7).
function source(save, id, route, from) {
  const m = MILESTONE_FOR[id];
  if (route === "c" && m) return { how: `${m.name}: ${m.need.toLocaleString("en-US")}`, hook: "" };
  if (route === "b") { const Q = QUESTS[from]; return { how: Q ? `${Q.title}, for ${Q.giverName}` : "a quest", hook: Q?.done || "" }; }
  if (route === "d") { const t = threadReward(save, from); return { how: t ? `the end of ${t.title}` : "a thread's end", hook: t?.hook || "" }; }
  if (route === "V") return { how: `bought for ${VISCERA_SHOP.forms[id] || 0} Divine Viscera at ${from === "forge" ? "Sela's forge" : "the smith's"}`, hook: "" }; // Phase 8
  return { how: `from ${RELIQUARY.places[from] || "the bottom of something"}`, hook: "" };
}
export function grantWorld(save, id, route, from = "") {
  const row = ROW_BY_ID[id]; if (!row || earnedWorld(save, id)) return null;
  const f = feats(save), had = exploring(save) ? !worldWithheld(save, id) : ["owned", "open"].includes(stateV0(save, row));
  f.earned[id] = { route, at: Math.floor(Math.max(0, Number(save.playSeconds) || 0)), from, ...(had ? { dust: RELIQUARY.consolation.dust } : {}) };
  if (had) { save.materials ||= {}; save.materials.lumenDust = (Number(save.materials.lumenDust) || 0) + RELIQUARY.consolation.dust; }
  else { const p = ensureProgression(save); if (!p.kept.includes(id)) p.kept = [...p.kept, id].slice(0, PROGRESSION_RECORD.keptMax); }
  pityReset(save);
  const { how, hook } = source(save, id, route, from), title = TITLES[route] || WORLD_WORDS.reliquary, detail = had ? WORLD_WORDS.consolation(RELIQUARY.consolation.dust, row.name) : WORLD_WORDS.given(row.name, how);
  const said = route === "c" || route === "V" ? `${how.charAt(0).toUpperCase()}${how.slice(1)}. ` : route === "R" ? "In the reliquary: " : hook ? `${hook} ` : "";
  const text = had ? `${route === "c" ? `${how}.` : route === "R" ? "A reliquary." : `${hook ? `${hook} ` : ""}${how.charAt(0).toUpperCase()}${how.slice(1)}.`} It would have taught ${row.name}, which is already yours: ${RELIQUARY.consolation.dust} lumen dust instead.` : `${said}${row.hint || row.name}`;
  return { id, name: row.name, route, from, given: !had, dust: had ? RELIQUARY.consolation.dust : 0, title, detail, text };
}

// ---------------------------------------------------------------- milestones (route c)
// Counts a deed (`n` more; a derived counter is only read) and grants each threshold it has reached. Returns the notices.
export function countFeat(save, key, n = 1) {
  if (!save) return [];
  return addCount(save, key, n).map((m) => grantWorld(save, m.ability, "c", m.key)).filter(Boolean);
}

// ---------------------------------------------------------------- the Reliquary (route R)
// An end came (`kind`, a RELIQUARY.certain or RELIQUARY.chance kind) at `site` (the end's own key), in `area` (game.ts
// reliquaryArea). When one is due, it is recorded where it lies (open floor near `at`, on the loaded map) and laid there. Returns
// the laid object, or null.
const HAZARD = /water|lava|pit|chasm|canyon|void|Gate|wall|Wall/;
export function reliquarySpot(map, at) {
  const W = map?.width || Math.round(Math.sqrt(map?.tiles?.length || 0)) || 32, x0 = Math.round(Number(at?.x) || 0), y0 = Math.round(Number(at?.y) || 0), elev = Number(at?.elev) || 0, N = RELIQUARY.near;
  const taken = new Set((map?.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`)); let best = null, bd = Infinity;
  for (let y = y0 - N; y <= y0 + N; y++) for (let x = x0 - N; x <= x0 + N; x++) {
    const t = map?.tiles?.[y * W + x]; if (!t || t.x !== x || t.y !== y || t.blocked || t.structure || HAZARD.test(String(t.kind)) || taken.has(`${x},${y}`)) continue;
    if (Math.abs((Number(t.elev) || 0) - elev) > .5) continue;
    const d = Math.hypot(x - x0, y - y0) + (x === x0 && y === y0 ? .5 : 0); if (d < bd) { bd = d; best = { x, y }; }
  }
  return best || { x: x0, y: y0 };
}
export function reliquaryEnd(save, map, kind, site, area, at) {
  const as = reliquaryDue(save, kind, site); if (!as) return null;
  const f = feats(save), R = f.reliquary;
  if (RELIQUARY.certain.includes(kind) && !R.firsts[kind]) R.firsts[kind] = site;
  const spot = reliquarySpot(map, at), elev = Number(at?.elev) || 0;
  R.sites[site] = { kind: as, area, x: spot.x, y: spot.y, ...(elev ? { elev } : {}), state: "waiting" };
  const keys = Object.keys(R.sites); if (keys.length > FEAT_RECORD.sitesMax) for (const k of keys.filter((q) => R.sites[q].state === "opened").slice(0, keys.length - FEAT_RECORD.sitesMax)) delete R.sites[k];
  return layReliquaries(map, save, area).find((o) => o.site === site) || null;
}
// Lays the reliquaries recorded for `area` that are still waiting (once each per load). Returns those laid.
export function layReliquaries(map, save, area) {
  const sites = save?.feats?.reliquary?.sites; if (!map || !sites) return [];
  const out = [];
  for (const [site, r] of Object.entries(sites)) {
    if (r.area !== area || r.state !== "waiting" || (map.objects || []).some((o) => o.kind === "reliquary" && o.site === site)) continue;
    const o = { id: `reliquary:${site}`, kind: "reliquary", site, name: RELIQUARY.name, x: r.x, y: r.y, ...(r.elev ? { elev: r.elev } : {}), state: "closed", actions: ["open"] };
    (map.objects ||= []).push(o); out.push(o);
  }
  return out;
}
// The next ability of the pool this reliquary gives: in Exploration the first in the seeded order neither earned nor kept; in
// Classic the first not yet earned. Null when none is left.
export function nextFromPool(save) {
  const order = reliquaryOrder(save?.seed), v1 = exploring(save);
  return order.find((id) => !earnedWorld(save, id) && !(v1 && progressionKept(save, id))) || null;
}
// Opening one. Returns { ok, first, notice?, message }.
export function openReliquary(save, o) {
  const r = save?.feats?.reliquary?.sites?.[o?.site];
  if (o?.kind !== "reliquary" || !r) return { ok: false, message: "Nothing here to open." };
  if (r.state === "opened") { Object.assign(o, { state: "used", actions: [] }); return { ok: true, first: false, message: WORLD_WORDS.opened }; }
  const id = nextFromPool(save); r.state = "opened"; r.gave = id; Object.assign(o, { state: "used", actions: [], name: `${RELIQUARY.name}, opened` });
  if (!id) { save.materials ||= {}; save.materials.lumenDust = (Number(save.materials.lumenDust) || 0) + RELIQUARY.consolation.dust; return { ok: true, first: true, message: WORLD_WORDS.empty }; }
  const notice = grantWorld(save, id, "R", r.kind);
  return { ok: true, first: true, notice, message: notice ? notice.text : WORLD_WORDS.opened };
}

// ---------------------------------------------------------------- pity (G3): the count (world-leads.ts gives the strong lead)
// pityTick (game.ts, as each overworld section loads): when the abilities held have grown since the last look, the count of
// sections explored with nothing gained starts again from here. A milestone or a reliquary starts it again at once (grantWorld).
const ownedCount = (save) => { let n = 0; const st = ownership(save); for (const id in st) if (st[id] === "owned" && ROW_BY_ID[id]?.group !== "supplies") n++; return n; };
// `owned` is a high-water mark: an item sold and found again is nothing new. Exploration only (pity is Exploration's).
export function pityTick(save) {
  if (!exploring(save)) return false;
  const P = feats(save).pity, n = ownedCount(save);
  if (n > P.owned) { P.owned = n; P.mark = exploredCount(save); return true; }
  return false;
}
function pityReset(save) { const P = feats(save).pity; P.mark = exploredCount(save); }

// ================================================================ Phase 8: Divine Viscera (design 2.2 route V, 3.4)
// The four Viscera forms and the rumour, at Sela's forge (`where` "forge") or any smith ("smith"), once refinement is open (past
// 1,000 sections, items.ts unlockRefinement). Prices are data (quests.ts VISCERA_SHOP); Divine Viscera is save.skylands.viscera.
// Exploration: a form is sold while it is withheld, and bought it is earned (route V) and kept for good. Classic: a form its rules
// already give is not sold (nothing to buy); one they do not yet give is sold as an extra route (given early). The rumour: pay to
// turn the nearest ability still unknown into a hinted lead (save.leads.rumours, kind "viscera"); the compendium then shows it as
// rumoured, with where.
export const VISCERA_WORDS = Object.freeze({
  closed: "Divine Viscera buys nothing here yet: refinement opens it, a thousand sections out.",
  short: (n, have) => `That takes ${n} Divine Viscera; you hold ${have}.`,
  owned: (name) => `${name} is already yours.`,
  none: "There is no new lead to buy just now.",
  rumour: (row, where) => `For the Viscera, a rumour: ${row.name}, ${where}.`,
});
const visceraHeld = (save) => Math.max(0, Math.floor(Number(save?.skylands?.viscera) || 0));
const pay = (save, n) => { save.skylands ||= {}; save.skylands.viscera = visceraHeld(save) - n; };
export const visceraOpen = (save) => save?.refinement?.unlocked === true;
// Whether form `id` is for sale on this journey now (withheld in Exploration; not yet given by Classic's rules).
export function visceraSells(save, id) {
  if (!VISCERA_SHOP.forms[id] || earnedWorld(save, id) || progressionKept(save, id)) return false;
  return exploring(save) ? storyWithheld(save, id) : !["owned", "open"].includes(stateV0(save, ROW_BY_ID[id]));
}
// What the shop shows: [{ id, name, price, sells, afford }] (the four forms), and the rumour's price.
export function visceraShop(save) {
  const have = visceraHeld(save);
  return { open: visceraOpen(save), held: have, rumour: VISCERA_SHOP.rumour, forms: Object.entries(VISCERA_SHOP.forms).map(([id, price]) => ({ id, name: ROW_BY_ID[id]?.name || id, price, sells: visceraSells(save, id), afford: have >= price })) };
}
// Buys form `id`. Returns { ok, message, notice? } (the notice as grantWorld gives it).
export function buyVisceraForm(save, id, where = "smith") {
  const price = VISCERA_SHOP.forms[id], row = ROW_BY_ID[id]; if (!price || !row) return { ok: false, message: "That is not for sale." };
  if (!visceraOpen(save)) return { ok: false, message: VISCERA_WORDS.closed };
  if (!visceraSells(save, id)) return { ok: false, message: VISCERA_WORDS.owned(row.name) };
  if (visceraHeld(save) < price) return { ok: false, message: VISCERA_WORDS.short(price, visceraHeld(save)) };
  pay(save, price); const n = grantWorld(save, id, "V", where === "forge" ? "forge" : "smith");
  if (n && save.feats?.earned?.[id]) save.feats.earned[id].paid = price;
  return { ok: !!n, message: n ? n.text : VISCERA_WORDS.owned(row.name), notice: n };
}
// The abilities still unknown that a rumour may name: withheld (Exploration) or not given by Classic's rules, neither earned nor
// kept, unknown in the compendium (locked), no rumour already bought; the Viscera forms themselves are on the shelf, not rumours.
// Only the next reliquary reward may be named: a generic source cannot promise a later member of its seeded pool.
function unknownAbilities(save) {
  const out = [], v1 = exploring(save);
  for (const id of [...WORLD_WITHHELD, ...STORY_WITHHELD]) {
    if ((RELIQUARY.pool.includes(id) && id !== nextFromPool(save)) || VISCERA_SHOP.forms[id] || earnedWorld(save, id) || progressionKept(save, id) || boughtRumour(save, id)) continue;
    const row = ROW_BY_ID[id]; if (!row) continue;
    if (v1 ? progressionState(save, row) !== "locked" : stateV0(save, row) !== "locked") continue;
    out.push(row);
  }
  return out;
}
// Where an unknown ability waits, as a hinted lead: { where, rx?, ry? } (a section for the compass when there is one).
function rumourWhere(save, row, rx, ry) {
  const id = row.id, Q = QUESTS[QUEST_FOR[id]];
  if (Q) return { where: `${Q.giver ? `${Q.giverName} at the Refuge` : "the far road"} will have work for you once you reach ${Q.gate.far ? `${Q.gate.far.toLocaleString("en-US")} sections out` : "a deeper band of the Aperture"}`, ...(Q.giver ? { rx: Q.from.rx, ry: Q.from.ry } : {}) };
  const m = MILESTONES.find((q) => q.ability === id); if (m) return { where: `a milestone: ${m.name.charAt(0).toLowerCase()}${m.name.slice(1)}, ${m.need.toLocaleString("en-US")}` };
  if (STORY_ROUTE_OF[id] === "d") { const set = carrierOf(save, id), t = set && threadReward(save, set); return { where: t ? `at the end of ${t.title}` : "at a thread's end" }; }
  const h = !save?.feats?.reliquary?.firsts?.horde ? nearestHorde(save, rx, ry) : null, sh = h ? null : nearestShaft(save, rx, ry);
  return h ? { where: `at the bottom of something: a horde crossing ${Math.round(Math.hypot(h.rx - rx, h.ry - ry))} sections off`, rx: h.rx, ry: h.ry } : sh ? { where: `at the bottom of something: floor ${sh.floor} of a Deep Shaft`, rx: sh.rx, ry: sh.ry } : { where: "at the bottom of something" };
}
// Buys a rumour: the nearest ability still unknown (by its section, else in table order) becomes a hinted lead. Returns { ok,
// message, rumour? }.
export function buyVisceraRumour(save, rx = 0, ry = 0) {
  if (!visceraOpen(save)) return { ok: false, message: VISCERA_WORDS.closed };
  const price = VISCERA_SHOP.rumour; if (visceraHeld(save) < price) return { ok: false, message: VISCERA_WORDS.short(price, visceraHeld(save)) };
  const list = unknownAbilities(save).map((row, i) => { const w = rumourWhere(save, row, rx, ry); return { row, w, i, d: Number.isInteger(w.rx) ? Math.hypot(w.rx - rx, w.ry - ry) : Infinity }; }).sort((a, b) => a.d - b.d || a.i - b.i);
  const pick = list[0]; if (!pick) return { ok: false, message: VISCERA_WORDS.none };
  pay(save, price); const L = ensureLeads(save), text = VISCERA_WORDS.rumour(pick.row, pick.w.where);
  const r = { id: `viscera:${pick.row.id}`, kind: "viscera", ability: pick.row.id, title: pick.row.name, text, where: pick.w.where, by: "viscera", at: Math.floor(Math.max(0, Number(save.playSeconds) || 0)), ...(RELIQUARY.pool.includes(pick.row.id) ? { source: "reliquary" } : {}), ...(Number.isInteger(pick.w.rx) ? { rx: pick.w.rx, ry: pick.w.ry, name: pick.row.name } : {}) };
  L.rumours = [...L.rumours.filter((q) => q.id !== r.id), r].slice(-LEAD_RECORD.rumourMax);
  const view = paidRumourView(r);
  return { ok: true, message: view.text, rumour: view };
}
