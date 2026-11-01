// Creature Echoes v1 (release 99): itemization phase 2.
//
// Defeating a pack creature can leave an Echo of its signature attack. Echoes sit in notches (NOTCHES total; each
// costs 1-3, Hollow Knight charm style) and trigger from things the Wayfarer already does (dodging, landing a jump,
// killing, being hurt, casting, firing, facing a foe, standing still), so they add moves without new buttons.
// Release 263: guardians and world beasts leave their creature's Echo by chance (ECHO_DROPS); ordinary kills do not.
//
// Data lives in ECHOES; the Game calls echoEvent() at its trigger points and tickEchoes() every frame.
import { rng } from "./random.js?v=r666-364d65e9cbbd";
import { latticeEchoes, toggleLatticeSlot } from "./transit-lattice.js?v=r666-364d65e9cbbd";

export const ECHO_VERSION = 1;
export const NOTCHES = 3;
export const ECHO_DROP_CHANCE = 4; // percent, ordinary pack kills, first copy only (until release 263)
// Release 263 (Tim, 2026-10-21: "there should be a pretty low chance to drop them... from different guardians", then "Okay
// three percent"): Echoes come only from guardians and world beasts, as a chance (percent) at the Echo of that creature
// while you lack it. Ordinary pack kills no longer leave one.
// Release 337 (Tim, 2026-10-23: option 3, "guaranteed first kill, plus a higher chance after"): a guardian or world beast whose
// Echo you lack now always leaves it. Each Echo is owned once, so this is the first kill of each kind; there is no "after".
export const ECHO_DROPS = { guardian: 100, ordinary: 0 };
// Release 337 (Tim: "grant the Questing Beast echo"): a beast already slain whose Echo was never taken (kills from before the
// guaranteed first-kill Echo of release 263) grants it once, when the save loads. Returns the ids granted.
export function grantSlainEchoes(save) {
  if (!save?.echoes?.owned) return [];
  const slain = [["questingBeast", save.questingBeast?.slain], ...Object.entries(save.worldBeasts || {}).map(([id, q]) => [id, q?.slain])];
  const granted = slain.filter(([id, n]) => ECHOES[id] && Number(n) > 0 && !save.echoes.owned[id]).map(([id]) => id);
  for (const id of granted) save.echoes.owned[id] = true;
  return granted;
}

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
  morphingBlob: { name: "Blob's Spatter", cost: 2, trigger: "hurt", module: "blobGasCloud", text: "Being hurt spatters ooze around you that slows foes by 40% for 3 s." },
  bloblet: { name: "Bloblet Mend", cost: 1, trigger: "kill", module: "blobBloblets", text: "Kills mend 3 health." },
  tremorWorm: { name: "Worm's Upheaval", cost: 3, trigger: "dodge", module: "wormRise", text: "Dodging heaves the ground under the nearest foe within 5 tiles; it bursts a moment later. Dodge again while it pulses and it stacks: each dodge adds another burst of damage." },
  wormTentacle: { name: "Tentacle Ember", cost: 1, trigger: "kill", module: "wormTentacles", text: "Kills set the nearest foe within 4 tiles burning." },
  mountainTurtle: { name: "Turtle's Ward", cost: 3, trigger: "hurt", module: "turtleShield", text: "Being hurt grows ice over you: no blow lands for a second (once every 8 s)." },
  nanobotKnight: { name: "Nanite Seekers", cost: 3, trigger: "kill", module: "knightOrbs", text: "Kills loose nanite seekers into up to two foes within 5 tiles." },
  lightningGiant: { name: "Giant's Arc", cost: 3, trigger: "kill", module: "giantArcs", text: "Kills arc lightning into up to three foes within 5 tiles." },
  psychicCrystal: { name: "Mind Ward", cost: 2, trigger: "hurt", module: "psyPush", text: "Being hurt throws foes within 3 tiles back from you." },
  voidWalker: { name: "Rift Upheaval", cost: 2, trigger: "dodge", module: "voidSpikes", text: "Dodging marks the nearest foe within 5 tiles with a void spike; it erupts after half a second (once every 4 s)." },
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
// Release 363: Echoes set in the Transit Lattice work too, beyond the notches.
export const activeEchoes = (save) => { const eq = save?.echoes?.equipped || [], more = latticeEchoes(save).filter((id) => save.echoes?.owned?.[id] && !eq.includes(id)); return more.length ? [...eq, ...more] : eq; };
export const hasEcho = (save, id) => activeEchoes(save).includes(id);
export function toggleLatticeEcho(save, id) {
  return toggleLatticeSlot(save, "echo", id, ECHOES[id]?.name || id, () => !ECHOES[id] ? "Unknown Echo." : !save.echoes?.owned?.[id] ? "You have not taken that Echo yet." : save.echoes.equipped.includes(id) ? `${ECHOES[id].name} is already set in your notches.` : "");
}
export function toggleEcho(save, id) {
  const st = save.echoes;
  if (!st.owned[id]) return { ok: false, message: "You have not taken that Echo yet." };
  if (st.equipped.includes(id)) { st.equipped = st.equipped.filter((q) => q !== id); return { ok: true, message: `${ECHOES[id].name} set aside.` }; }
  if (notchesUsed(st.equipped) + ECHOES[id].cost > NOTCHES) return { ok: false, message: `Not enough notches: ${ECHOES[id].name} needs ${ECHOES[id].cost}, ${NOTCHES - notchesUsed(st.equipped)} free.` };
  st.equipped.push(id);
  return { ok: true, message: `${ECHOES[id].name} resonates in you.` };
}
// Returns the Echo id when one is gained.
// Release 263 fix: live pack combatants carry `packKind: true` (a flag), not their id, so every real drop used to miss;
// the creature is now read from `kind` when the flag is a boolean.
export const echoKindOf = (enemy) => typeof enemy?.packKind === "string" ? enemy.packKind : enemy?.packKind ? enemy.kind : null;
export function echoDrop(save, enemy, guardian, n, certain = false) {
  const id = echoKindOf(enemy);
  if (!id || !ECHOES[id] || save.echoes.owned[id] || enemy.summonedBy || enemy.noRewards) return null;
  // A mixed roll: the raw FNV hash modulo 100 runs well under the stated chance when only the counter changes.
  if (!certain && rng(`${save.seed}:echo-drop:v${ECHO_VERSION}:${enemy.id}:${n}`)() * 100 >= (guardian ? ECHO_DROPS.guardian : ECHO_DROPS.ordinary)) return null;
  save.echoes.owned[id] = true;
  return id;
}

// Proposed Void Walker Echo tuning: a small signature spike, not the terrain-erasing Supernova.
export const VOID_ECHO = { cooldown: 4000, delay: 500, radius: 1, range: 5, damage: 1.1 };

// ---------------------------------------------------------------- effects
const echoDamage = (save) => 6 + Math.round(1.5 * (save.level || 1));
function nearest(game, x, y, radius, skip = null) {
  return game.enemies.filter((e) => !e.dead && !e.untargetable && e !== skip && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= radius).sort((a, b) => Math.hypot(a.x + .5 - x, a.y + .45 - y) - Math.hypot(b.x + .5 - x, b.y + .45 - y));
}
const centre = (q) => ({ x: q.x + .5, y: q.y + .45 });
// Release 655 (Tim, 2026-11-01: "if you dodge multiple times before the ring bursts... it should just stack... the ring gets more
// powerful depending on the number of times you dodge"): Worm's Upheaval's ring pulses `window` s; each dodge while it pulses adds
// another `damage` × echo damage to its burst, stretches it `extend` s (never past `longest` s from the first) and widens it.
export const UPHEAVAL = { damage: 1.3, window: 1600, extend: 450, longest: 4000, radius: 1.4, grow: .12, maxRadius: 2.4 };

export function echoEvent(game, event, now, data = {}) {
  const save = game.save, p = game.player, eq = activeEchoes(save), world = game.glyphWorld(now), dmg = echoDamage(save), me = centre(p);
  if (!eq.length) return;
  if (event === "dodge") {
    if (eq.includes("thunderhorn")) p.echoCharge = { until: p.dodgeUntil || now + 300, hit: {} };
    if (eq.includes("riftLynx")) p.echoPounceUntil = now + 1200;
    if (eq.includes("pallidCrawler")) p.stamina = Math.min(save.maxStamina, p.stamina + 5);
    if (eq.includes("veilSpinner")) (game.echoPatches ||= []).push({ kind: "web", x: me.x, y: me.y, radius: 1.4, until: now + 3000, slow: .5 });
    if (eq.includes("tremorWorm")) { // release 237; 655: a dodge while the ring still pulses stacks onto it (UPHEAVAL)
      const U = UPHEAVAL, base = Math.round(dmg * U.damage), ring = (game.echoPatches || []).find((q) => q.upheaval && now < q.until);
      if (ring) { ring.stacks++; ring.detonate += base; ring.until = Math.min(ring.born + U.longest, ring.until + U.extend); ring.radius = Math.min(U.radius + U.grow * (ring.stacks - 1), U.maxRadius); }
      else { const foe = nearest(game, me.x, me.y, 5)[0]; if (foe) { const c = centre(foe); (game.echoPatches ||= []).push({ kind: "mortar", upheaval: true, stacks: 1, born: now, x: c.x, y: c.y, radius: U.radius, until: now + U.window, detonate: base }); } }
    }
    if (eq.includes("voidWalker") && now >= (p.echoVoidReadyAt || 0)) {
      const foe = nearest(game, me.x, me.y, VOID_ECHO.range)[0];
      if (foe) {
        const c = centre(foe); game.echoPatches ||= [];
        // One pending Walker patch even if another caller repeats a dodge event in the same frame.
        game.echoPatches = game.echoPatches.filter((q) => !q.voidEcho);
        game.echoPatches.push({ kind: "mortar", voidEcho: true, x: c.x, y: c.y, radius: VOID_ECHO.radius, until: now + VOID_ECHO.delay, detonate: Math.round(dmg * VOID_ECHO.damage) });
        p.echoVoidReadyAt = now + VOID_ECHO.cooldown;
      }
    }
    if (eq.includes("strataEel")) p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, (p.dodgeUntil || now) + 250);
  } else if (event === "land" && eq.includes("sunderjaw")) world.blast(me.x, me.y, 1.8, dmg);
  else if (event === "kill") {
    const at = centre(data.enemy);
    if (eq.includes("gnawingMaw")) for (const e of nearest(game, at.x, at.y, 4, data.enemy)) { const c = centre(e), m = Math.hypot(at.x - c.x, at.y - c.y) || 1; world.nudge(e, (at.x - c.x) / m * Math.min(1, m - .4), (at.y - c.y) / m * Math.min(1, m - .4)); e.hitStun = Math.max(e.hitStun || 0, .3); }
    if (eq.includes("questingBeast")) for (const e of nearest(game, at.x, at.y, 4.5, data.enemy).slice(0, 2)) { world.arc(data.enemy, e, "#f2ece0"); world.damage(e, Math.round(dmg * 1.2)); }
    if (eq.includes("nanobotKnight")) for (const e of nearest(game, at.x, at.y, 5, data.enemy).slice(0, 2)) { world.arc(data.enemy, e, "#ff2a2a"); world.damage(e, Math.round(dmg * .8)); } // release 245
    if (eq.includes("lightningGiant")) for (const e of nearest(game, at.x, at.y, 5, data.enemy).slice(0, 3)) { world.arc(data.enemy, e, "#7fd6ff"); world.damage(e, Math.round(dmg * .7)); } // release 257
    if (eq.includes("bloblet")) p.hp = Math.min(p.maxHp || save.maxHp || p.hp, p.hp + 3); // release 235
    if (eq.includes("wormTentacle")) { const foe = nearest(game, at.x, at.y, 4, data.enemy)[0]; if (foe) { foe.glyphBurn = { until: now + 2500, dps: Math.max(2, Math.round(dmg * .3)), tick: 0 }; world.arc(data.enemy, foe, "#ff7a2a"); } } // release 237
    if (eq.includes("amalgam")) (game.echoPatches ||= []).push({ kind: "flesh", x: at.x, y: at.y, radius: 1.3, until: now + 4000, slow: .55 });
    if (eq.includes("cinderSeraph")) for (const e of nearest(game, at.x, at.y, 4).slice(0, 3)) { e.glyphBurn = { until: now + 2500, dps: Math.max(2, Math.round(dmg * .3)), tick: 0 }; world.arc(data.enemy, e, "#ff9a4a"); }
  } else if (event === "hurt") {
    if (eq.includes("hangedChoir")) world.blast(me.x, me.y, 2.2, Math.round(dmg * .8));
    if (eq.includes("morphingBlob")) (game.echoPatches ||= []).push({ kind: "web", x: me.x, y: me.y, radius: 2, until: now + 3000, slow: .6 }); // release 235
    if (eq.includes("mountainTurtle") && now >= (p.echoWardReadyAt || 0)) { p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, now + 1000); p.echoWardReadyAt = now + 8000; } // release 241
    if (eq.includes("psychicCrystal")) for (const e of nearest(game, me.x, me.y, 3)) { const c = centre(e), m = Math.hypot(c.x - me.x, c.y - me.y) || 1; world.nudge(e, (c.x - me.x) / m * 1.5, (c.y - me.y) / m * 1.5); e.hitStun = Math.max(e.hitStun || 0, .25); } // release 249
    if (eq.includes("listener")) { const foe = nearest(game, me.x, me.y, 3)[0]; if (foe) { world.arc(p, foe, "#c9a6ff"); world.damage(foe, Math.round(dmg * .9)); } }
    if (eq.includes("mirrorShade") && now >= (p.echoMirrorReadyAt || 0)) {
      const foe = nearest(game, me.x, me.y, 5).find((e) => !e.flying && !game.astralRiderHeld?.(e) && world.canStand(e.x, e.y)); // never swap onto a pit, water or a wall
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
  if (!(dt > 0)) return;
  const save = game.save, p = game.player, eq = activeEchoes(save), me = centre(p), world = game.glyphWorld(now);
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
