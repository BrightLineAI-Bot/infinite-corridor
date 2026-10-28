// Listener towns and the hometown (release 371; Tim, 2026-10-23: "a new town springs up... you can set that as your
// hometown so that instead of transferring to... the Ember Refuge, you can transfer to that new town... then the regrowth,
// like they should be like a quarry and a farm... when you... go through 20 tiles, it'll start regrowing that town, not
// the ember refuge... new towns all around... spaced... around the world. Based on... where you find the listener").
//
// Each fallen Listener raises a town at the Mouth it fell at (release 373; 371 used a nearby unexplored section): a hamlet
// (settlements.ts applyHamlet, forced) built around the Mouth. save.hometowns (additive) holds the towns and the
// chosen home ("rx,ry"; Ember Refuge, "0,0", when unset). Home is where the Atlas's Return button goes, and where the farm,
// the quarry and the regrowth ring sit (refuge-lands.ts, by `homeCenter`). A town becomes home from the Atlas once its
// Wayglass is lit.
import { hashSeed } from "./random.js?v=r553-6f1c9b293b39";
import { hamletIdentity, hamletSection } from "./settlements.js?v=r553-6f1c9b293b39";
import { openSeaSection } from "./landscape.js?v=r553-6f1c9b293b39";

export const HOMETOWNS = { search: 4 };
const REFUGE = "0,0";
const key = (q) => `${q.rx},${q.ry}`;

export function ensureHometowns(save) {
  const h = save.hometowns && typeof save.hometowns === "object" ? save.hometowns : {};
  const towns = (Array.isArray(h.towns) ? h.towns : []).filter((t) => Number.isInteger(t?.rx) && Number.isInteger(t?.ry)).map((t, i) => ({ rx: t.rx, ry: t.ry, name: String(t.name || hamletIdentity(save.seed, t.rx, t.ry).name).slice(0, 40), listener: Math.max(1, Math.floor(Number(t.listener) || i + 1)), ...(t.mouth === true ? { mouth: true } : {}) }));
  save.hometowns = { towns, home: typeof h.home === "string" && (h.home === REFUGE || towns.some((t) => key(t) === h.home)) ? h.home : null };
  grantTowns(save);
  return save.hometowns;
}
// Release 371's rule, kept for reference and for tests: the nearest unexplored dry section around a Mouth. Since 373 towns
// rise on the Mouth itself.
export function townSite(save, mouth) {
  const taken = new Set((save.hometowns?.towns || []).map(key));
  for (let d = 1; d <= HOMETOWNS.search; d++) {
    const ring = [];
    for (let dx = -d; dx <= d; dx++) for (let dy = -d; dy <= d; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === d) ring.push({ rx: mouth.rx + dx, ry: mouth.ry + dy });
    ring.sort((a, b) => hashSeed(`${save.seed}:town:${key(a)}`) - hashSeed(`${save.seed}:town:${key(b)}`));
    const at = ring.find((q) => !save.explored?.[key(q)] && !save.atlas?.[key(q)] && !taken.has(key(q)) && !(q.rx === 0 && q.ry === 0) && !hamletSection(save.seed, q.rx, q.ry) && !openSeaSection(save.seed, q.rx, q.ry));
    if (at) return at;
  }
  return null;
}
// Release 373 (Tim: "a town should spring up around the [Listener's] dungeon... when you leave... [and] come back...
// it becomes like a town now... [the Mouth] becomes a source of adventure and prosperity"): the town rises on the Mouth's
// own section, around the Mouth (`mouth: true`), with the Listening Stone and a delver's exchange beside it (game.ts).
// It replaces the 371 town on a nearby section; a journey that already has one keeps it as one more town.
// One Mouth town per fallen Listener, at the Mouth it fell at (old Mouths in order, then the current one). Returns those added.
export function grantTowns(save) {
  const h = save.hometowns; if (!h) return [];
  const kills = Math.max(0, Math.floor(Number(save.farArray?.listeners) || 0)), net = save.relayNetwork || {}, mouths = [...(Array.isArray(net.pastMouths) ? net.pastMouths : []), ...(net.coordinate ? [net.coordinate] : [])], added = [];
  for (let n = h.towns.filter((t) => t.mouth).length + 1; n <= kills && mouths.length; n++) {
    const m = mouths[Math.min(n - 1, mouths.length - 1)];
    if (h.towns.some((t) => t.rx === m.rx && t.ry === m.ry)) { const t = h.towns.find((q) => q.rx === m.rx && q.ry === m.ry); t.mouth = true; continue; }
    const t = { rx: m.rx, ry: m.ry, name: hamletIdentity(save.seed, m.rx, m.ry).name, listener: n, mouth: true }; h.towns.push(t); added.push(t);
  }
  return added;
}
export const townAt = (save, rx, ry) => (save?.hometowns?.towns || []).find((t) => t.rx === rx && t.ry === ry) || null;
export const homeKey = (save) => save?.hometowns?.home || REFUGE;
export function homeCenter(save) { const [rx, ry] = homeKey(save).split(",").map(Number); return { rx, ry }; }
export function homeName(save) { const c = homeCenter(save), t = townAt(save, c.rx, c.ry); return t ? t.name : "Ember Refuge"; }
// Ember Refuge or a Listener town, once its Wayglass is lit.
export const homeCandidate = (save, k) => (k === REFUGE || (save?.hometowns?.towns || []).some((t) => key(t) === k));
export function setHome(save, k) {
  ensureHometowns(save);
  if (!homeCandidate(save, k)) return { ok: false, message: "Only Ember Refuge or a town raised where a Listener fell can be home." };
  if (k !== REFUGE && !save.checkpoints?.[k]) return { ok: false, message: "Light that town's Wayglass first." };
  save.hometowns.home = k === REFUGE ? null : k;
  return { ok: true, message: `${homeName(save)} is home now: the Atlas returns you there, and its farm, quarry and lands regrow as you explore.` };
}
