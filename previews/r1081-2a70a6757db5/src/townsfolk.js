// Townsfolk cannot be harmed (Tim, 2026-11-20). Early in development the game let the Wayfarer attack and kill the people of
// the Ember Refuge and the waystations, with consequences (wounds, hostility, reputation, a fallen Refuge, closed shops). Tim:
// that was wrong; the whole system is removed. No non-hostile person (townsfolk, traders, quest-givers, travellers, elders,
// Ilse, the Cairn Keeper, Sela, the hamlet wardens of a skirmish...) can be killed or harmed by the Wayfarer, by any source:
// melee, spells, tools, procs, Echoes, hazards she causes, mounts, companions, reflects, Rift voids or AoE. They take no
// damage, do not flinch and are never turned hostile.
//
// Most people are map objects (villagers, travellers, elders, Ilse, the Cairn Keeper) that no damage path reaches. The ones
// that sit where blows land are the Refuge and waystation residents (kind "npc", once added to the Wayfarer's target lists)
// and the hamlet wardens (kind "militia", skirmishFriendly, fighting beside creatures in this.enemies). `unharmablePerson` is
// the one predicate every damage path asks; `keepPersonWhole` is the backstop that undoes any blow that got through anyway.
// Hostile humans (bandits, duelists, revenants, the Knife Choir...) are foes by design and stay killable.
export const NON_HOSTILE_PEOPLE = Object.freeze(["npc", "militia"]);
export const TOWNSFOLK_PEACE = "2026-11-20";

export function unharmablePerson(e) {
  return !!e && (NON_HOSTILE_PEOPLE.includes(e.kind) || e.skirmishFriendly === true || e.nonHostilePerson === true);
}

// A person a blow reached anyway is made whole at once: no lost health, no flinch, no aggro, no death. `skirmishHp` is the
// health their own skirmish left them (a creature's blow in that battle is real, and a warden it killed stays fallen);
// otherwise their full health. Returns true when something was undone.
export function keepPersonWhole(e) {
  if (!unharmablePerson(e)) return false;
  const whole = Number.isFinite(e.skirmishHp) ? e.skirmishHp : Number(e.maxHp) > 0 ? Number(e.maxHp) : e.hp;
  let mended = false;
  if (e.hp < whole) { e.hp = whole; mended = true; }
  if (e.dead && e.hp > 0) { e.dead = false; e.rewarded = false; mended = true; }
  if (mended) { e.hitFlash = 0; e.hitStun = 0; e.stunnedUntil = 0; }
  if (e.skirmishFriendly) { e.skirmishProvoked = false; e.aggro = false; }
  return mended;
}

// Journal entries the old system wrote ("<name> died by your hand", "Ember Refuge fell", "You stood down and spared ...").
const RETIRED_JOURNAL = /^(death:|spared:|refuge-fallen$)/;
export const retiredJournalEntry = (j) => !!j && (j.retired === TOWNSFOLK_PEACE || RETIRED_JOURNAL.test(String(j.recordId || "")));
const plain = (v) => !!v && typeof v === "object" && !Array.isArray(v);

// Save normaliser (additive, schema 14; called from migrateSave). A journey that wounded or killed townsfolk, turned them
// hostile, lost reputation or saw the Refuge fall has them restored. Nothing is deleted: each record's old values are kept
// under `retired` (the npc's or settlement's own), the old `<id>:dead` world flags, death causes and journal entries stay
// where they are, and the game no longer honours any of them. Rewards, quests and everything else are untouched.
export function ensureTownsfolkPeace(s) {
  const c = s?.consequences;
  if (!plain(c)) return s;
  for (const [id, n] of Object.entries(plain(c.npcs) ? c.npcs : {})) {
    if (!plain(n)) continue;
    const flagged = !!s.worldFlags?.[id + ":dead"], harmed = flagged || n.status !== "alive" || n.disposition !== "neutral" || !(Number(n.hp) >= 36);
    if (!harmed) continue;
    if (!plain(n.retired)) n.retired = { since: TOWNSFOLK_PEACE, hp: n.hp, status: n.status, disposition: n.disposition, ...(flagged ? { deadFlag: true } : {}) };
    Object.assign(n, { hp: 36, status: "alive", disposition: "neutral" });
  }
  for (const st of Object.values(plain(c.settlements) ? c.settlements : {})) {
    if (!plain(st) || (st.status !== "fallen" && !(Number(st.reputation) < 0))) continue;
    if (!plain(st.retired)) st.retired = { since: TOWNSFOLK_PEACE, status: st.status, reputation: st.reputation };
    if (st.status === "fallen") st.status = "standing";
    st.reputation = 0;
  }
  const t = plain(c.threads) ? c.threads["ember-refuge"] : null;
  if (plain(t) && t.ending === "fallen") c.threads["ember-refuge"] = { ...t, status: "open", ending: null, retired: { since: TOWNSFOLK_PEACE, status: t.status, ending: t.ending } };
  for (const j of Array.isArray(s.narrative?.journal) ? s.narrative.journal : []) if (plain(j) && RETIRED_JOURNAL.test(String(j.recordId || ""))) j.retired = TOWNSFOLK_PEACE;
  // The codex's people pages: "Recorded dead." and a dead or fallen outcome become what is true now.
  const people = s.codex?.peoplePlaces;
  if (plain(people)) for (const p of Object.values(people)) {
    if (!plain(p)) continue;
    if (Array.isArray(p.facts) && p.facts.includes("Recorded dead.")) { p.retiredFacts = [...new Set([...(Array.isArray(p.retiredFacts) ? p.retiredFacts : []), "Recorded dead."])]; p.facts = [...new Set(p.facts.map((f) => f === "Recorded dead." ? "Encountered alive." : f))]; }
    if (p.type === "person" && p.outcome === "dead") p.outcome = "alive";
    if (p.type === "settlement" && p.outcome === "fallen") p.outcome = "standing";
  }
  // Hamlet wardens a Wayfarer once struck: no longer turned on her; one she felled stands again (one a creature killed in
  // the battle, never provoked, stays fallen).
  for (const area of Object.values(plain(s.session?.areas) ? s.session.areas : {})) for (const e of Array.isArray(area?.enemies) ? area.enemies : []) {
    if (!plain(e) || !(e.kind === "militia" || e.skirmishFriendly === true) || e.skirmishProvoked !== true) continue;
    if (e.dead === true) { const hp = Number(e.maxHp) > 0 ? Number(e.maxHp) : 40; Object.assign(e, { dead: false, rewarded: false, hp, skirmishHp: hp, revived: TOWNSFOLK_PEACE }); }
    Object.assign(e, { skirmishProvoked: false, aggro: false });
  }
  return s;
}
