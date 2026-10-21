// Glyphs v1 (release 98): minimal, rule-changing itemization.
//
// A glyph is a small rule socketed into a host: the primary weapon ("melee"), the secondary tool ("tool") or a spell
// ("spell"). The same glyph behaves differently in each host (Noita / support-gem idea), so ten glyphs give about
// thirty behaviours. Two glyphs in the same host can light up a named Resonance (runeword / duo-boon idea); the first
// time one lights it is recorded in the codex. Weapons carry 1-3 sockets by tier; every spell carries two.
//
// Everything balance-related is data in GLYPHS and RESONANCES. The Game calls hostLoadout() when it attacks and
// glyphHit() after each hit lands; world-side effects go through a small adapter so this file stays testable.
import { hashSeed } from "./random.js?v=r253-447383f7b357";

export const GLYPH_VERSION = 1;
export const HOSTS = ["melee", "tool", "spell"];
export const SOCKETS_BY_TIER = { common: 1, rare: 2, epic: 2, relic: 3 };
export const SPELL_SOCKETS = 2;
export const DUST_PER_GLYPH = 6;

// mods: multipliers applied when the host fires. hit: per-host numbers used by glyphHit.
export const GLYPHS = {
  ignite: { name: "Ignite", sigil: "🜂", color: "#ff8a3d", text: { melee: "Hits set foes burning for 3 s.", tool: "Shots set foes burning for 2 s.", spell: "Each pulse sets foes burning for 1.5 s." }, hit: { melee: 3, tool: 2, spell: 1.5 } },
  chain: { name: "Chain", sigil: "ϟ", color: "#8fd8ff", text: { melee: "A swing arcs to one more foe for 50%.", tool: "Hits arc on through two more foes for 45%.", spell: "Each pulse zaps one foe outside it for 40%." }, hit: { melee: [1, .5], tool: [2, .45], spell: [1, .4] } },
  pierce: { name: "Pierce", sigil: "➶", color: "#e8e2c8", text: { melee: "+30% reach.", tool: "Shots pass through up to three foes.", spell: "+30% radius." }, mods: { melee: { range: 1.3 }, tool: { pierce: 3 }, spell: { radius: 1.3 } } },
  echo: { name: "Echo", sigil: "◎", color: "#c9a7ff", text: { melee: "Every swing repeats a moment later for 50%.", tool: "A second shot follows for 60%.", spell: "The spell recasts where it ended for 50%." }, echo: { melee: [250, .5], tool: [150, .6], spell: [0, .5] } },
  leech: { name: "Leech", sigil: "♁", color: "#d4495a", text: { melee: "Heal 12% of damage dealt.", tool: "Heal 8% of damage dealt.", spell: "Heal 5% of damage dealt." }, hit: { melee: .12, tool: .08, spell: .05 } },
  heavy: { name: "Heavy", sigil: "▼", color: "#b9a37a", text: { melee: "+35% damage, 25% slower, staggers.", tool: "+35% damage, 25% slower, staggers.", spell: "+35% damage, 25% longer recovery." }, mods: { melee: { damage: 1.35, cooldown: 1.25 }, tool: { damage: 1.35, cooldown: 1.25 }, spell: { damage: 1.35, cooldown: 1.25 } } },
  swift: { name: "Swift", sigil: "»", color: "#7fe0a8", text: { melee: "25% faster, -15% damage.", tool: "25% faster, -15% damage.", spell: "30% faster recovery, -15% damage." }, mods: { melee: { damage: .85, cooldown: .75 }, tool: { damage: .85, cooldown: .75 }, spell: { damage: .85, cooldown: .7 } } },
  volatile: { name: "Volatile", sigil: "✶", color: "#ffd25c", text: { melee: "Kills burst for 6 + 40% of the blow.", tool: "Shots burst on impact for 50%.", spell: "Kills inside the spell burst for 6 + 40%." }, hit: { melee: [1.6, .4], tool: [1.2, .5], spell: [1.6, .4] } },
  tether: { name: "Tether", sigil: "⊸", color: "#6fd0c4", text: { melee: "Hits slow foes by 40% for 2 s.", tool: "Hits slow foes by 40% for 1.5 s.", spell: "Pulses drag foes toward the centre." }, hit: { melee: 2, tool: 1.5, spell: .35 } },
  still: { name: "Still", sigil: "▢", color: "#cfd6e0", text: { melee: "Hits freeze foes for 0.5 s.", tool: "Hits freeze foes for 0.6 s.", spell: "Pulses freeze foes for 0.4 s." }, hit: { melee: .5, tool: .6, spell: .4 } },
};
export const GLYPH_IDS = Object.keys(GLYPHS);

export const RESONANCES = {
  "ember-choir": { name: "Ember Choir", pair: ["ignite", "echo"], text: "Echoes deal double damage to burning foes." },
  wildfire: { name: "Wildfire", pair: ["ignite", "chain"], text: "Arcs carry the fire: chained foes ignite." },
  "storm-lattice": { name: "Storm Lattice", pair: ["chain", "volatile"], text: "Every arc ends in a small burst." },
  afterimage: { name: "Afterimage", pair: ["pierce", "echo"], text: "Echoes strike at full strength." },
  "grave-tether": { name: "Grave Tether", pair: ["tether", "still"], text: "Hitting a slowed foe freezes it for 1 s." },
  comet: { name: "Comet", pair: ["heavy", "volatile"], text: "Bursts are 60% wider and 50% stronger." },
  "blood-tide": { name: "Blood Tide", pair: ["leech", "heavy"], text: "Leech heals twice as much." },
  quickstep: { name: "Quickstep", pair: ["swift", "leech"], text: "Kills restore 8 stamina." },
};

// ---------------------------------------------------------------- save state
export function socketCount(item) { return item && (item.slot === "primary" || item.slot === "secondary") ? SOCKETS_BY_TIER[item.tier] || 1 : 0; }
export function normalizeSockets(item) {
  if (!item) return item;
  const n = socketCount(item);
  if (!n) { if (item.glyphs) delete item.glyphs; return item; }
  const g = Array.isArray(item.glyphs) ? item.glyphs.map((q) => (GLYPHS[q] ? q : null)) : [];
  item.glyphs = Array.from({ length: n }, (_, i) => g[i] || null);
  return item;
}
// Idempotent; runs in migrateSave and freshSave. One-time starter grant so the system is visible from the start.
export function ensureGlyphState(save) {
  const counts = save.glyphs && typeof save.glyphs === "object" ? save.glyphs : {};
  save.glyphs = Object.fromEntries(GLYPH_IDS.map((id) => [id, Math.max(0, Math.floor(Number(counts[id]) || 0))]));
  save.glyphDust = Math.max(0, Math.floor(Number(save.glyphDust) || 0));
  const spells = save.spellGlyphs && typeof save.spellGlyphs === "object" ? save.spellGlyphs : {};
  save.spellGlyphs = Object.fromEntries(Object.entries(spells).map(([id, list]) => [id, Array.from({ length: SPELL_SOCKETS }, (_, i) => (GLYPHS[list?.[i]] ? list[i] : null))]));
  const gc = save.glyphCodex || {}; save.glyphCodex = { glyphs: { ...gc.glyphs }, resonances: { ...gc.resonances } };
  for (const item of [...Object.values(save.equipment || {}), ...(save.inventory || [])]) normalizeSockets(item);
  if (!save.glyphGrant) { save.glyphGrant = GLYPH_VERSION; for (const id of ["ignite", "chain", "echo"]) { save.glyphs[id] += 1; save.glyphCodex.glyphs[id] = true; } }
  return save;
}

// ---------------------------------------------------------------- loadouts
function socketsFor(save, host) {
  if (host === "melee") return save.equipment?.primary?.glyphs || [];
  if (host === "tool") return save.equipment?.secondary?.glyphs || [];
  return save.spellGlyphs?.[save.equippedSpell || "ember-ring"] || [];
}
export function resonancesOf(glyphs) {
  const set = new Set(glyphs.filter(Boolean));
  return Object.entries(RESONANCES).filter(([, r]) => r.pair.every((g) => set.has(g))).map(([id]) => id);
}
export function hostLoadout(save, host) {
  const glyphs = socketsFor(save, host).filter(Boolean), resonances = resonancesOf(glyphs), mods = { damage: 1, cooldown: 1, range: 1, radius: 1, pierce: 0 };
  for (const id of glyphs) { const m = GLYPHS[id].mods?.[host]; if (!m) continue; for (const [k, v] of Object.entries(m)) mods[k] = k === "pierce" ? mods[k] + v : mods[k] * v; }
  return { host, glyphs, has: (id) => glyphs.includes(id), count: (id) => glyphs.filter((q) => q === id).length, resonances, resonant: (id) => resonances.includes(id), mods };
}
// First time a resonance lights in play, the codex records it (the Game shows a message).
export function discoverResonances(save, loadout) {
  const fresh = loadout.resonances.filter((id) => !save.glyphCodex.resonances[id]);
  for (const id of fresh) save.glyphCodex.resonances[id] = true;
  return fresh;
}
export function echoPlan(loadout) {
  if (!loadout.has("echo")) return null;
  const [delay, share] = GLYPHS.echo.echo[loadout.host];
  return { delay, share: loadout.resonant("afterimage") ? 1 : share };
}

// ---------------------------------------------------------------- hits
// world: { enemies, now, damage(e, amount, ctx), heal(amount), stamina(amount), blast(x, y, radius, amount, ctx), arc(from, to, color) }
// ctx: { echo?: true, chained?: true, origin?: {x,y} (spell centre) }. Call after `dealt` damage has been applied.
export function glyphDamage(loadout, e, base, ctx = {}, now = 0) {
  let amount = base;
  if (ctx.echo && loadout.resonant("ember-choir") && (e.glyphBurn?.until || 0) > now) amount *= 2;
  return Math.max(1, Math.round(amount));
}
export function glyphHit(world, loadout, e, dealt, ctx = {}) {
  const host = loadout.host, now = world.now, boss = e.boss || e.eliteId ? .5 : 1;
  const burn = (target, seconds) => { const dps = Math.max(1, Math.round(dealt * .25)); target.glyphBurn = { until: Math.max(target.glyphBurn?.until || 0, now + seconds * 1000), dps: Math.max(target.glyphBurn?.dps || 0, dps), tick: target.glyphBurn?.tick || 0 }; };
  if (loadout.has("ignite")) burn(e, GLYPHS.ignite.hit[host]);
  if (loadout.has("leech")) world.heal(dealt * GLYPHS.leech.hit[host] * loadout.count("leech") * (loadout.resonant("blood-tide") ? 2 : 1));
  if (loadout.has("heavy") && host !== "spell") e.hitStun = Math.max(e.hitStun || 0, .12 * boss + .1);
  if (loadout.has("tether")) {
    if (host === "spell" && ctx.origin) { const dx = ctx.origin.x - (e.x + .5), dy = ctx.origin.y - (e.y + .45), m = Math.hypot(dx, dy) || 1, pull = Math.min(m, GLYPHS.tether.hit.spell); world.nudge?.(e, dx / m * pull, dy / m * pull); }
    else { if (loadout.resonant("grave-tether") && (e.glyphSlow?.until || 0) > now) e.hitStun = Math.max(e.hitStun || 0, 1 * boss); e.glyphSlow = { until: now + GLYPHS.tether.hit[host] * 1000, factor: .6 }; }
  }
  if (loadout.has("still")) e.hitStun = Math.max(e.hitStun || 0, GLYPHS.still.hit[host] * boss);
  if (loadout.has("chain") && !ctx.chained) {
    const [jumps, share] = GLYPHS.chain.hit[host], hit = new Set([e.id]);
    let from = e;
    for (let j = 0; j < jumps; j++) {
      const next = world.enemies.filter((q) => !q.dead && !q.untargetable && !hit.has(q.id) && Math.hypot(q.x - from.x, q.y - from.y) < 2.6).sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0];
      if (!next) break;
      hit.add(next.id); world.arc?.(from, next, GLYPHS.chain.color);
      const amount = Math.max(1, Math.round(dealt * share));
      world.damage(next, amount, { chained: true });
      if (loadout.resonant("wildfire")) burn(next, GLYPHS.ignite.hit[host] || 2);
      if (loadout.resonant("storm-lattice")) world.blast(next.x + .5, next.y + .45, 1, Math.max(1, Math.round(dealt * .4)), { chained: true });
      from = next;
    }
  }
  const volatile = loadout.has("volatile"), comet = loadout.resonant("comet");
  if (volatile && (host === "tool" || e.dead) && !ctx.burst) {
    const [radius, share] = GLYPHS.volatile.hit[host], amount = Math.round((host === "tool" ? dealt * share : 6 + dealt * share) * (comet ? 1.5 : 1));
    world.blast(e.x + .5, e.y + .45, radius * (comet ? 1.6 : 1), Math.max(1, amount), { burst: true, chained: true });
  }
  if (e.dead && loadout.resonant("quickstep")) world.stamina(8);
}
// Burn and slow, ticked by the Game every frame. Returns enemies killed by burning.
export function tickGlyphStatus(enemies, dt, now, onBurnDeath = () => {}) {
  for (const e of enemies) {
    if (e.dead) continue;
    const slowed = (e.glyphSlow?.until || 0) > now;
    if (slowed && e.glyphBaseSpeed === undefined) { e.glyphBaseSpeed = e.speedMultiplier || 1; e.speedMultiplier = e.glyphBaseSpeed * e.glyphSlow.factor; }
    else if (!slowed && e.glyphBaseSpeed !== undefined) { e.speedMultiplier = e.glyphBaseSpeed; delete e.glyphBaseSpeed; delete e.glyphSlow; }
    const b = e.glyphBurn;
    if (!b) continue;
    if (b.until <= now) { delete e.glyphBurn; continue; }
    b.tick = (b.tick || 0) + b.dps * dt;
    const whole = Math.floor(b.tick);
    if (whole > 0) { b.tick -= whole; e.hp -= whole; e.hitFlash = Math.max(e.hitFlash || 0, .06); if (e.hp <= 0) { e.dead = true; onBurnDeath(e); } }
  }
}

// ---------------------------------------------------------------- socketing, drops, dust
export function socketGlyph(save, host, index, glyphId) {
  const list = host === "melee" ? save.equipment?.primary?.glyphs : host === "tool" ? save.equipment?.secondary?.glyphs : (save.spellGlyphs[host] ||= Array(SPELL_SOCKETS).fill(null));
  if (!list || index < 0 || index >= list.length) return { ok: false, message: "That socket does not exist." };
  if (glyphId && !GLYPHS[glyphId]) return { ok: false, message: "Unknown glyph." };
  if (glyphId && !(save.glyphs[glyphId] > 0)) return { ok: false, message: `No ${GLYPHS[glyphId].name} glyph to set.` };
  const prior = list[index];
  if (prior) save.glyphs[prior] += 1; // glyphs always come back out intact
  if (glyphId) save.glyphs[glyphId] -= 1;
  list[index] = glyphId || null;
  return { ok: true, message: glyphId ? `${GLYPHS[glyphId].name} set.` : prior ? `${GLYPHS[prior].name} returned to your pack.` : "Socket already empty." };
}
// Weapons swapped out of a slot keep their glyphs; the glyphs travel with the item.
export function glyphDrop(save, source, n, guaranteed = false) {
  const h = hashSeed(`${save.seed}:glyph-drop:v${GLYPH_VERSION}:${source}:${n}`);
  if (!guaranteed && h % 100 >= 12) return null;
  const id = GLYPH_IDS[Math.floor(h / 100) % GLYPH_IDS.length];
  save.glyphs[id] += 1; save.glyphCodex.glyphs[id] = true;
  return id;
}
export function salvageDust(item) { return 1 + Math.max(0, ["common", "rare", "epic", "relic"].indexOf(item?.tier)); }
export function craftGlyph(save, id) {
  if (!GLYPHS[id]) return { ok: false, message: "Unknown glyph." };
  if (!save.glyphCodex.glyphs[id]) return { ok: false, message: "You have never found that glyph; its pattern is unknown." };
  if (save.glyphDust < DUST_PER_GLYPH) return { ok: false, message: `Inscribing needs ${DUST_PER_GLYPH} glyph dust (you have ${save.glyphDust}).` };
  save.glyphDust -= DUST_PER_GLYPH; save.glyphs[id] += 1;
  return { ok: true, message: `You inscribe a ${GLYPHS[id].name} glyph.` };
}
export function describeHost(save, host) {
  const l = hostLoadout(save, host);
  return { glyphs: l.glyphs.map((id) => ({ id, name: GLYPHS[id].name, text: GLYPHS[id].text[host] })), resonances: l.resonances.map((id) => ({ id, ...RESONANCES[id] })) };
}
