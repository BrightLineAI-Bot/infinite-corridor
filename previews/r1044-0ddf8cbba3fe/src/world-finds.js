// Milestones, the Reliquary and pity, granted (docs/progression-design.md revision 3, Phase 6; the rules: world-routes.ts). Pure
// rules over the save and the loaded map: game.ts counts the deeds, lays and opens the reliquaries and shows what they give; leads.ts
// (through world-leads.ts) tells the horde rumours and the strong (pity) lead. Nothing here changes a generator: a reliquary is an object laid over a place
// as it loads, from save.feats.reliquary (like the Second Wayfarer's traces and the seed hunts), so every floor generated before
// is byte for byte what it was.
import { exploring, ensureFeats, ensureProgression, progressionKept, PROGRESSION_RECORD, FEAT_RECORD } from "./journey-start.js?v=r1044-0ddf8cbba3fe";
import { MILESTONE_FOR, RELIQUARY, earnedWorld, worldWithheld, addCount, reliquaryOrder, reliquaryDue } from "./world-routes.js?v=r1044-0ddf8cbba3fe";
import { ROW_BY_ID, stateV0, ownership } from "./progression.js?v=r1044-0ddf8cbba3fe";

const feats = (save) => (save?.feats?.counts && save.feats.reliquary?.sites && save.feats.earned && save.feats.pity ? save.feats : ensureFeats(save));
const exploredCount = (save) => Object.keys(save?.explored && typeof save.explored === "object" ? save.explored : {}).length;

// ---------------------------------------------------------------- granting (both routes, both modes)
// Exploration: a withheld ability is given (earned, and kept for good). Classic (section 6): one today's rules do not yet give is
// given the same way (an extra route: a form found opens its switch before Infinite III); one they already give (or open) pays a
// consolation in lumen dust instead, naming what it would have taught. Either way it is noted once (save.feats.earned), so a
// threshold grants once and the next reliquary moves on. Returns a notice { id, name, route, from, given, dust, title, detail,
// text } or null when it was already earned.
export const WORLD_WORDS = Object.freeze({
  milestone: "A MILESTONE", reliquary: "A RELIQUARY",
  consolation: (n, name) => `${n} lumen dust · it would have taught ${name}, already yours`,
  given: (name, how) => `${name} · ${how}`,
  empty: "The reliquary is empty but for a little lumen dust: everything it could hold is already yours.",
  opened: "An opened reliquary. What it held is yours.",
});
export function grantWorld(save, id, route, from = "") {
  const row = ROW_BY_ID[id]; if (!row || earnedWorld(save, id)) return null;
  const f = feats(save), had = exploring(save) ? !worldWithheld(save, id) : ["owned", "open"].includes(stateV0(save, row));
  f.earned[id] = { route, at: Math.floor(Math.max(0, Number(save.playSeconds) || 0)), from, ...(had ? { dust: RELIQUARY.consolation.dust } : {}) };
  if (had) { save.materials ||= {}; save.materials.lumenDust = (Number(save.materials.lumenDust) || 0) + RELIQUARY.consolation.dust; }
  else { const p = ensureProgression(save); if (!p.kept.includes(id)) p.kept = [...p.kept, id].slice(0, PROGRESSION_RECORD.keptMax); }
  pityReset(save);
  const m = MILESTONE_FOR[id], how = route === "c" && m ? `${m.name}: ${m.need.toLocaleString("en-US")}` : `from ${RELIQUARY.places[from] || "the bottom of something"}`;
  const title = route === "c" ? WORLD_WORDS.milestone : WORLD_WORDS.reliquary, detail = had ? WORLD_WORDS.consolation(RELIQUARY.consolation.dust, row.name) : WORLD_WORDS.given(row.name, how);
  const text = had ? `${title === WORLD_WORDS.milestone ? `${how}.` : "A reliquary."} It would have taught ${row.name}, which is already yours: ${RELIQUARY.consolation.dust} lumen dust instead.` : `${route === "c" ? `${how}. ` : `In the reliquary: `}${row.hint || row.name}`;
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
