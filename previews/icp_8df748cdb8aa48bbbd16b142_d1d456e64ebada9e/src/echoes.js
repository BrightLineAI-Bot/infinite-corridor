// Creature Echoes v1 (release 99): itemization phase 2.
//
// Defeating a pack creature can leave an Echo of its signature attack. Echoes sit in notches (NOTCHES total; each
// costs 1-3, Hollow Knight charm style) and trigger from things the Wayfarer already does (dodging, landing a jump,
// killing, being hurt, casting, firing, facing a foe, standing still), so they add moves without new buttons.
// Guardians always leave their creature's Echo the first time; ordinary pack kills about one in twenty-five.
//
// Data lives in ECHOES; the Game calls echoEvent() at its trigger points and tickEchoes() every frame.
import { hashSeed } from "./random.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e";

export const ECHO_VERSION = 1;
export const NOTCHES = 3;
export const ECHO_DROP_CHANCE = 4; // percent, ordinary pack kills, first copy only

export const ECHOES = {
  thunderhorn: { name: "Thunderhorn's Charge", cost: 2, trigger: "dodge", module: "ramCharge", text: "Your dodge becomes a charge: foes you pass through are trampled and staggered." },
  riftLynx: { name: "Lynx Pounce", cost: 2, trigger: "dodge", module: "blinkStrike", text: "Your first strike within 1.2 s of a dodge deals +60%." },
  pallidCrawler: { name: "Pallid Skitter", cost: 1, trigger: "dodge", module: "leapSlam", text: "Dodging costs a third less stamina." },
  veilSpinner: { name: "Spinner's Web", cost: 1, trigger: "dodge", module: "webSpit", text: "Dodging leaves a web that slows foes by half for 3 s." },
  strataEel: { name: "Eel's Phase", cost: 2, trigger: "dodge", module: "phaseCharge", text: "Your dodge stays untouchable 0.25 s longer." },
  sunderjaw: { name: "Sunderjaw's Rupture", cost: 2, trigger: "land", module: "groundRupture", text: "Landing a jump ruptures the ground around you." },
  gnawingMaw: { name: "Maw's Hunger", cost: 2, trigger: "kill", module: "devourPull", text: "Kills drag nearby foes toward the body." },
  amalgam: { name: "Flesh Bloom", cost: 1, trigger: "kill", module: "fleshBloom", text: "Kills leave living flesh that slows foes for 4 s." },
  cinderSeraph: { name: "Seraph's Firefall", cost: 2, trigger: "kill", module: "firefall", text: "Kills rain embers that set up to three nearby foes burning." },
  hangedChoir: { name: "Choir's Lament", cost: 2, trigger: "hurt", module: "sigilScatter", text: "Being hurt rings out sigils that strike foes around you." },
  mirrorShade: { name: "Mirror Swap", cost: 3, trigger: "hurt", module: "mirrorSwap", text: "Being hurt swaps your place with the nearest foe (once every 4 s)." },
  lumenWraith: { name: "Wraith Lantern", cost: 2, trigger: "spell", module: "sweepBeam", text: "Casting also fires a lantern beam in your facing direction." },
  siegeBeetle: { name: "Beetle Mortar", cost: 2, trigger: "shot", module: "mortarVolley", text: "Every third tool shot also lobs a mortar where it is headed." },
  weepingSaint: { name: "Saint's Regard", cost: 3, trigger: "face", module: "stillnessCurse", text: "Foes you face within 5 tiles move 40% slower." },
  listener: { name: "Listener's Answer", cost: 3, trigger: "hurt", module: "mirrorSwap", text: "Being hurt answers back: the nearest foe within 3 tiles takes the blow too." },
  questingBeast: { name: "Beast's Spines", cost: 3, trigger: "kill", module: "spikeVolley", text: "Kills fling spines into up to two nearby foes." },
  graveLantern: { name: "Lantern Stillness", cost: 1, trigger: "still", module: "stillnessCurse", text: "Standing still for a second mends 2 health each second." },
};
export const ECHO_IDS = Object.keys(ECHOES);

// ---------------------------------------------------------------- save state
export function ensureEchoState(save) {
  const e = save.echoes && typeof save.echoes === "object" ? save.echoes : {};
  const owned = Object.fromEntries(Object.entries(e.owned || {}).filter(([id, v]) => ECHOES[id] && v));
  let equipped = (Array.isArray(e.equipped) ? e.equipped : []).filter((id, i, a) => owned[id] && a.indexOf(id) === i);
  while (notchesUsed(equipped) > NOTCHES) equipped = equipped.slice(0, -1);
  save.echoes = { version: ECHO_VERSION, owned, equipped };
  return save;
}
export const notchesUsed = (equipped) => equipped.reduce((n, id) => n + (ECHOES[id]?.cost || 0), 0);
export const hasEcho = (save, id) => !!save.echoes?.equipped?.includes(id);
export function toggleEcho(save, id) {
  const st = save.echoes;
  if (!st.owned[id]) return { ok: false, message: "You have not taken that Echo yet." };
  if (st.equipped.includes(id)) { st.equipped = st.equipped.filter((q) => q !== id); return { ok: true, message: `${ECHOES[id].name} set aside.` }; }
  if (notchesUsed(st.equipped) + ECHOES[id].cost > NOTCHES) return { ok: false, message: `Not enough notches: ${ECHOES[id].name} needs ${ECHOES[id].cost}, ${NOTCHES - notchesUsed(st.equipped)} free.` };
  st.equipped.push(id);
  return { ok: true, message: `${ECHOES[id].name} resonates in you.` };
}
// Returns the Echo id when one is gained.
export function echoDrop(save, enemy, guardian, n) {
  const id = enemy?.packKind;
  if (!id || !ECHOES[id] || save.echoes.owned[id] || enemy.summonedBy || enemy.noRewards) return null;
  if (!guardian && hashSeed(`${save.seed}:echo-drop:v${ECHO_VERSION}:${enemy.id}:${n}`) % 100 >= ECHO_DROP_CHANCE) return null;
  save.echoes.owned[id] = true;
  return id;
}

// ---------------------------------------------------------------- effects
const echoDamage = (save) => 6 + Math.round(1.5 * (save.level || 1));
function nearest(game, x, y, radius, skip = null) {
  return game.enemies.filter((e) => !e.dead && !e.untargetable && e !== skip && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= radius).sort((a, b) => Math.hypot(a.x + .5 - x, a.y + .45 - y) - Math.hypot(b.x + .5 - x, b.y + .45 - y));
}
const centre = (q) => ({ x: q.x + .5, y: q.y + .45 });

export function echoEvent(game, event, now, data = {}) {
  const save = game.save, p = game.player, eq = save.echoes?.equipped || [], world = game.glyphWorld(now), dmg = echoDamage(save), me = centre(p);
  if (!eq.length) return;
  if (event === "dodge") {
    if (eq.includes("thunderhorn")) p.echoCharge = { until: p.dodgeUntil || now + 300, hit: {} };
    if (eq.includes("riftLynx")) p.echoPounceUntil = now + 1200;
    if (eq.includes("pallidCrawler")) p.stamina = Math.min(save.maxStamina, p.stamina + 5);
    if (eq.includes("veilSpinner")) (game.echoPatches ||= []).push({ kind: "web", x: me.x, y: me.y, radius: 1.4, until: now + 3000, slow: .5 });
    if (eq.includes("strataEel")) p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, (p.dodgeUntil || now) + 250);
  } else if (event === "land" && eq.includes("sunderjaw")) world.blast(me.x, me.y, 1.8, dmg);
  else if (event === "kill") {
    const at = centre(data.enemy);
    if (eq.includes("gnawingMaw")) for (const e of nearest(game, at.x, at.y, 4, data.enemy)) { const c = centre(e), m = Math.hypot(at.x - c.x, at.y - c.y) || 1; world.nudge(e, (at.x - c.x) / m * Math.min(1, m - .4), (at.y - c.y) / m * Math.min(1, m - .4)); e.hitStun = Math.max(e.hitStun || 0, .3); }
    if (eq.includes("questingBeast")) for (const e of nearest(game, at.x, at.y, 4.5, data.enemy).slice(0, 2)) { world.arc(data.enemy, e, "#f2ece0"); world.damage(e, Math.round(dmg * 1.2)); }
    if (eq.includes("amalgam")) (game.echoPatches ||= []).push({ kind: "flesh", x: at.x, y: at.y, radius: 1.3, until: now + 4000, slow: .55 });
    if (eq.includes("cinderSeraph")) for (const e of nearest(game, at.x, at.y, 4).slice(0, 3)) { e.glyphBurn = { until: now + 2500, dps: Math.max(2, Math.round(dmg * .3)), tick: 0 }; world.arc(data.enemy, e, "#ff9a4a"); }
  } else if (event === "hurt") {
    if (eq.includes("hangedChoir")) world.blast(me.x, me.y, 2.2, Math.round(dmg * .8));
    if (eq.includes("listener")) { const foe = nearest(game, me.x, me.y, 3)[0]; if (foe) { world.arc(p, foe, "#c9a6ff"); world.damage(foe, Math.round(dmg * .9)); } }
    if (eq.includes("mirrorShade") && now >= (p.echoMirrorReadyAt || 0)) {
      const foe = nearest(game, me.x, me.y, 5).find((e) => !e.flying && world.canStand(e.x, e.y)); // never swap onto a pit, water or a wall
      if (foe) { const fx = foe.x, fy = foe.y; world.arc(p, foe, "#c9d6ff"); foe.x = p.x; foe.y = p.y; p.x = fx; p.y = fy; foe.hitStun = Math.max(foe.hitStun || 0, .5); p.echoMirrorReadyAt = now + 4000; }
    }
  } else if (event === "spell" && eq.includes("lumenWraith")) {
    const d = save.lastAim || { x: 1, y: 0 }, hit = new Set();
    for (let k = 1; k <= 10; k++) { const x = me.x + d.x * k * .5, y = me.y + d.y * k * .5; for (const e of nearest(game, x, y, .7)) if (!hit.has(e.id)) { hit.add(e.id); world.damage(e, Math.round(dmg * 1.1)); } }
    (game.glyphVisuals ||= []).push({ kind: "arc", x: me.x, y: me.y, tx: me.x + d.x * 5, ty: me.y + d.y * 5, color: "#9fe8ff", life: .3, max: .3 });
  } else if (event === "shot" && eq.includes("siegeBeetle")) {
    p.echoShots = (p.echoShots || 0) + 1;
    if (p.echoShots % 3 === 0) { const s = data.shot, reach = Math.min(5, (s.speed || 10) * (s.life || .5) * .6), tx = s.x + s.dx * reach, ty = s.y + s.dy * reach; (game.echoPatches ||= []).push({ kind: "mortar", x: tx, y: ty, radius: 1.5, until: now + 650, detonate: Math.round(dmg * 1.2) }); }
  }
}

// Continuous Echoes, ground patches, charge contact and trigger detection. `moving` is the player's input vector.
export function tickEchoes(game, dt, now, moving) {
  const save = game.save, p = game.player, eq = save.echoes?.equipped || [], me = centre(p), world = game.glyphWorld(now);
  // hurt / land detection runs even with nothing equipped so state stays fresh
  const hurt = game._echoLastHp !== undefined && p.hp < game._echoLastHp && p.hp > 0, airborne = now < (game.jumpUntil || 0), landed = game._echoAirborne && !airborne;
  game._echoLastHp = p.hp; game._echoAirborne = airborne;
  if (!eq.length && !(game.echoPatches || []).length) return;
  if (hurt) echoEvent(game, "hurt", now);
  if (landed) echoEvent(game, "land", now);
  if (p.echoCharge && now < p.echoCharge.until) for (const e of nearest(game, me.x, me.y, .95)) if (!p.echoCharge.hit[e.id]) { p.echoCharge.hit[e.id] = true; world.damage(e, echoDamage(save)); e.hitStun = Math.max(e.hitStun || 0, .6); }
  if (eq.includes("weepingSaint")) {
    const f = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[p.facing] || [0, 1];
    for (const e of nearest(game, me.x, me.y, 5)) { const c = centre(e), dx = c.x - me.x, dy = c.y - me.y, m = Math.hypot(dx, dy) || 1; if ((dx * f[0] + dy * f[1]) / m > .5) e.glyphSlow = { until: Math.max(e.glyphSlow?.until || 0, now + 150), factor: Math.min(e.glyphSlow?.factor || 1, .6) }; }
  }
  if (eq.includes("graveLantern")) {
    if (game._echoStillSince === undefined || Math.hypot(moving.x, moving.y) > .15 || now < (p.dodgeUntil || 0)) game._echoStillSince = now;
    else if (now - game._echoStillSince >= 1000) { game._echoMend = (game._echoMend || 0) + 2 * dt; const whole = Math.floor(game._echoMend); if (whole) { game._echoMend -= whole; p.hp = Math.min(save.maxHp, p.hp + whole); game._echoLastHp = p.hp; } }
  }
  const keep = [];
  for (const patch of game.echoPatches || []) {
    if (patch.kind === "mortar") { if (now >= patch.until) { world.blast(patch.x, patch.y, patch.radius, patch.detonate); continue; } keep.push(patch); continue; }
    if (now >= patch.until) continue;
    for (const e of nearest(game, patch.x, patch.y, patch.radius)) e.glyphSlow = { until: Math.max(e.glyphSlow?.until || 0, now + 200), factor: Math.min(e.glyphSlow?.factor || 1, patch.slow) };
    keep.push(patch);
  }
  game.echoPatches = keep;
}
// Lynx Pounce: consumed by the next melee strike.
export function pounceBonus(game, now) {
  if (!hasEcho(game.save, "riftLynx") || now >= (game.player.echoPounceUntil || 0)) return 1;
  game.player.echoPounceUntil = 0;
  return 1.6;
}
