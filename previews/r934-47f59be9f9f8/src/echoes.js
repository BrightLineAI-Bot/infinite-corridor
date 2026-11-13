// Creature Echoes v1 (release 99): itemization phase 2.
//
// Defeating a pack creature can leave an Echo of its signature attack. Echoes sit in notches (NOTCHES total; each
// costs 1-3, Hollow Knight charm style) and trigger from things the Wayfarer already does (dodging, landing a jump,
// killing, being hurt, casting, firing, facing a foe, standing still), so they add moves without new buttons.
// Release 263: guardians and world beasts leave their creature's Echo by chance (ECHO_DROPS); ordinary kills do not.
//
// Data lives in ECHOES; the Game calls echoEvent() at its trigger points and tickEchoes() every frame.
import { rng } from "./random.js?v=r934-47f59be9f9f8";
import { latticeEchoes, toggleLatticeSlot } from "./transit-lattice.js?v=r934-47f59be9f9f8";

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
  const slain = [["questingBeast", save.questingBeast?.slain], ["stalker", save.stalker?.kills], ...Object.entries(save.worldBeasts || {}).map(([id, q]) => [id, q?.slain])];
  const granted = slain.filter(([id, n]) => ECHOES[id] && Number(n) > 0 && !save.echoes.owned[id]).map(([id]) => id);
  for (const id of granted) save.echoes.owned[id] = true;
  return granted;
}

// Spinosaur's Echo (Tim, 2026-11-12). Every jump-attack slam (any weapon's plunge, the Shadow Boxing dive's slam
// included) is followed `delay` s later by one afterimage slam on the same spot, with the same radius, for `share` of the
// slam's damage (and of its Imbue Weapon spark) and `stunShare` of its stagger. The afterimage is an ordinary effect, so it
// keeps every rule the slam keeps (friendly fire, bosses and elites, poise, sanctuaries); it never lays another afterimage.
export const SPINO_ECHO = { delay: .32, share: .5, stunShare: 1 };
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
  tremorWorm: { name: "Worm's Upheaval", cost: 3, trigger: "dodge", module: "wormRise", text: "Each dodge heaves the ground under a foe within 5 tiles (the nearest one not already marked); each puddle bursts a moment later, one after another." },
  wormTentacle: { name: "Tentacle Ember", cost: 1, trigger: "kill", module: "wormTentacles", text: "Kills set the nearest foe within 4 tiles burning." },
  mountainTurtle: { name: "Turtle's Ward", cost: 3, trigger: "hurt", module: "turtleShield", text: "Being hurt grows ice over you: no blow lands for a second (once every 8 s)." },
  nanobotKnight: { name: "Nanite Seekers", cost: 3, trigger: "kill", module: "knightOrbs", text: "Kills loose nanite seekers into up to two foes within 5 tiles." },
  lightningGiant: { name: "Giant's Arc", cost: 3, trigger: "kill", module: "giantArcs", text: "Kills arc lightning into up to three foes within 5 tiles." },
  briarStag: { name: "Bramble Wake", cost: 2, trigger: "dodge", module: "stagCharge", text: "Each dodge leaves brambles where you stood that slow foes by 50% for 3 s, and roots strike the nearest foe within 3 tiles." }, // release 705
  ashenMoth: { name: "Moth's Ember", cost: 2, trigger: "kill", module: "mothSwarm", text: "Kills loose a burning moth that sets the nearest foe within 5 tiles alight." }, // release 706
  crimsonTyrant: { name: "Tyrant's Heart", cost: 3, trigger: "kill", module: "dragonFlameWave", text: "Kills burst into flame, burning foes within 2.5 tiles." }, // release 709
  doomChaser: { name: "Chaser's Dark", cost: 3, trigger: "kill", module: "doomOrbs", text: "Kills loose a hunting dark that bursts on the nearest foe within 6 tiles." }, // release 710
  psychicCrystal: { name: "Mind Ward", cost: 2, trigger: "hurt", module: "psyPush", text: "Being hurt throws foes within 3 tiles back from you." },
  voidWalker: { name: "Rift Upheaval", cost: 2, trigger: "dodge", module: "voidSpikes", text: "Dodging marks the nearest foe within 5 tiles with a void spike; it erupts after half a second (once every 4 s)." },
  earthGolem: { name: "Golem's Landfall", cost: 2, trigger: "land", module: "golemPunch", text: "Landing a jump staggers foes within 2.5 tiles for 0.6 s." }, // Canyon craters
  crystalCrab: { name: "Geode Shell", cost: 1, trigger: "hurt", module: "clawSweep", text: "Being hurt cracks your shell into shards that strike foes within 1.5 tiles." },
  // Release 699 (Tim, 2026-11-02: "an echo for the stalker for killing him... a mist form... when you're dashed, you turn into
  // mist... it hurts enemies or... chunks their health similar to the way his mist form does... reduces their overall health"):
  // not a pack creature, so `creature` names it for the Echoes screen. Taken on the first Stalker kill (game.ts), or on load for
  // a Wayfarer who has killed it already (grantSlainEchoes).
  stalker: { name: "Stalker's Mist", cost: 3, trigger: "dodge", module: "mistForm", creature: "The Stalker", text: "Your dodge turns you to mist: each foe you pass through loses a share of its maximum health for good (never more than a third of it)." },
  graveLantern: { name: "Lantern Stillness", cost: 1, trigger: "still", module: "stillnessCurse", text: "Standing still for a second mends 2 health each second." },
  // The Wild Stegosaurus (Tim, 2026-11-12: "The stego's Echo lets you wall cling... jump onto a wall... and hold on to it. If you
  // don't move, you just stay there. Press jump again... you jump off it, and you can do another jump off the next wall"). Taken on
  // the first kill like every world beast's. Its rules and numbers are WALL_CLING; game.ts carries them out (wallCling*).
  wildStego: { name: "Stegosaur's Grip", cost: 2, trigger: "jump", module: "wallCling", text: "Jump into a wall, cliff or rock and you hold on at the height you reached, as long as you like. Jump again to kick off it and catch a wall again: two holds before your feet touch the ground, up to 3 levels." },
  // The Spinosaurus (Tim, 2026-11-12: "the Spinosaurus's Echo increases your jump attacks. When you do the jump-attack slam,
  // it adds an echo to the hit: a secondary, afterimage-like slam that does less damage"). SPINO_ECHO above; game.ts
  // plungeLand lays the afterimage. Taken as every world beast's is: certain on the first kill (takeFirstSpoils, echoDrop),
  // or on load for a Wayfarer who has slain it already (grantSlainEchoes reads save.worldBeasts).
  spinoRex: { name: "Spinosaur's Echo", cost: 2, trigger: "plunge", module: "spinoLeapSlam",
    text: `Your jump-attack slams echo: an afterimage of you slams the same ground ${SPINO_ECHO.delay} s later for ${Math.round(SPINO_ECHO.share * 100)}% of the damage.` },
};
// Stegosaur's Grip, the wall cling (game.ts wallCling*). A jump pushed into a vertical surface (a solid tile, a house's wall, or
// ground 2 or more levels above the jump) holds there; the stick held into the wall, or let go, keeps the hold (no time limit, as
// Tim asked); pushed off the wall, a dodge, a blow that moves the Wayfarer, or the wall going lets go (a fall from that height).
// Jump while holding kicks off it, away from the wall, as a new jump from the hold's height. Never with the drone out or the
// robot on (their own Jump wins), mounted, swimming, aboard, gliding, inside a house, on a Pentagon's roof or within it, or on a
// Great Castle's or sealed tower's tiles (vehicle-gates.ts DRONE_FIZZLE): the Corridor's rules are different there.
// Two holds in one airtime (Tim, 2026-11-13: "you get at most two wall clings before you touch the ground, and your feet have to
// touch the ground before it resets"): `maxHolds`; a hold, a kick or a glide never resets the count, only standing on ground.
// The kick pops the Wayfarer a little off the wall (`kick.firm` ms) so the stick, held into the wall, brings them back to it.
// The Pentagon's outer walls (Tim, 2026-11-13: cling to its outside walls, up to a balcony; never its roof): `pentagon`.
export const WALL_CLING = {
  // The stick (or a kick) pushed at least this much on its main axis takes hold.
  push: .5,
  // And the main axis at least this share of the push: a run along a wall never grabs it.
  aim: .7,
  // How far past the collision box the wall is felt (tiles): more than a frame's step at a kick's pace (moveAxis stops short of it).
  reach: .25,
  // A hold is this many levels over the height its jump left from: a jump's top (an ordinary jump climbs one level).
  rise: 1,
  // A chain of holds climbs at most this many levels over the ground it began from (the drone lifts 5: DRONE_LIFT.max).
  maxRise: 3,
  // Holding, the stick pointed less than this share into the wall (and pushed at all) lets go.
  letGo: .5,
  // A stick under this is not pushed at all.
  dead: .15,
  // Ms the jump's clock is kept ahead of now each frame of a hold (it never ends while holding).
  hold: 140,
  // Holds in one airtime: a third push into a wall before the feet touch ground does nothing (the jump goes on as any jump).
  maxHolds: 2,
  // A wall jump: ms it goes straight off the wall before the stick steers, and its pace (times a walk: a dodge's). With the stick
  // let go it flies on at that pace (across to a facing wall); held into the wall it comes back to it well before the jump's top
  // (out about .38 tiles at a dodge's pace, back at a walk's: in contact again about 240 ms into a 520 ms jump).
  kick: { firm: 80, push: 2 },
  // The Pentagon (Tim, 2026-11-13). `grip`: the parts (tile.pentagon) a hold takes: its outer faces (the roof's edge, or an old
  // Pentagon's outer wall) and a balcony's side; never the parapet. `stand`: the parts the Wayfarer may stand on to take one (the
  // land, or these); never from the roof. `below`: within `near` tiles of any Pentagon tile, a hold is never higher than the
  // roof's level (pentagon.ts PENTAGON.roof.elev) less this, so the jump off it (one level up at most) lands no higher than
  // roof - 2: never the roof, nor a balcony one level under it (one jump from the roof). `near`: more than a wall jump carries in
  // one jump (kick.push × a walk, 4.8 tiles a second, × JUMP.base .52 s: 2.5 tiles).
  pentagon: { grip: ["outer", "balcony"], stand: ["balcony", "stair"], below: 3, near: 4 },
};
export const ECHO_IDS = Object.keys(ECHOES).filter((id) => !ECHOES[id].pending);
// The afterimage of a plunge slam (game.ts plungeLand), or null for anything that is not a Wayfarer's slam: an afterimage
// never lays another. `id` is the new effect's id; `aim` the facing it slams toward (the Close View afterimage's yaw).
export function plungeAfterimage(slam, id, aim) {
  if (!slam || slam.kind !== "plunge-slam" || slam.afterimage || slam.hostile) return null;
  const S = SPINO_ECHO, a = aim && Number.isFinite(aim.x) && Number.isFinite(aim.y) ? aim : { x: 1, y: 0 };
  return { ...slam, id, kind: "plunge-afterimage", afterimage: true, hits: {}, pulseIndex: 0, untilPulse: 0, delay: S.delay, delayMax: S.delay, lifeMax: slam.life,
    damage: Math.max(1, Math.round(slam.damage * S.share)), imbue: (slam.imbue || 0) * S.share, stun: (slam.stun || 0) * S.stunShare, aimX: a.x, aimY: a.y };
}

// ---------------------------------------------------------------- save state
export function ensureEchoState(save) {
  const e = save.echoes && typeof save.echoes === "object" ? save.echoes : {};
  const owned = Object.fromEntries(Object.entries(e.owned || {}).filter(([id, v]) => ECHOES[id] && v));
  let equipped = (Array.isArray(e.equipped) ? e.equipped : []).filter((id, i, a) => owned[id] && a.indexOf(id) === i);
  while (notchesUsed(equipped) > NOTCHES) equipped = equipped.slice(0, -1);
  save.echoes = { ...e, version: ECHO_VERSION, owned, equipped }; // release 736 (review S7): fields a newer release added are kept
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
// Release 699: Stalker's Mist. While the dodge lasts the Wayfarer is mist; each foe within `reach` it passes through (once a
// dodge) loses `share` of the maximum health it had before any mist, as maximum health and as health, until `cap` of it is gone.
// The health part is a blow (it can kill, and counts as yours); the maximum part stays, so a boss cannot heal it back.
export const STALKER_MIST = { reach: 1, share: .06, cap: 1 / 3, linger: 120 };
export function mistRot(e, world) {
  const M = STALKER_MIST, base = (e.mistBase ||= e.maxHp || e.hp || 1), left = Math.max(0, (e.maxHp || base) - Math.ceil(base * (1 - M.cap))), cut = Math.min(left, Math.max(1, Math.round(base * M.share)));
  if (!(cut > 0)) return 0;
  e.maxHp = Math.max(1, (e.maxHp || base) - cut); world.damage(e, cut); if (!e.dead && e.hp > e.maxHp) e.hp = e.maxHp;
  return cut;
}
// Worm's Upheaval: each dodge lays its own puddle under the nearest foe within `range` tiles (one not already marked first, so
// quick dodges spread over different foes), and each bursts `delay` ms later, one after another. Release 655 had stacked them
// into one growing ring; Tim (2026-11-02): "It was working better before... each Dodge made a discrete like puddle underneath
// the creature, and then it would just like pop... the puddles would pop like sequentially... better than having one just
// large burst. So let's go back to that."
export const UPHEAVAL = { damage: 1.3, delay: 600, radius: 1.4, range: 5 };

export function echoEvent(game, event, now, data = {}) {
  const save = game.save, p = game.player, eq = activeEchoes(save), world = game.glyphWorld(now), dmg = echoDamage(save), me = centre(p);
  if (!eq.length) return;
  if (event === "dodge") {
    if (eq.includes("thunderhorn")) p.echoCharge = { until: p.dodgeUntil || now + 300, hit: {} };
    if (eq.includes("riftLynx")) p.echoPounceUntil = now + 1200;
    if (eq.includes("briarStag")) { (game.echoPatches ||= []).push({ kind: "web", x: me.x, y: me.y, radius: 1.6, until: now + 3000, slow: .5 }); const foe = nearest(game, me.x, me.y, 3)[0]; if (foe) { world.arc(p, foe, "#9cff6a"); world.damage(foe, Math.round(dmg * .6)); } } // release 705
    if (eq.includes("pallidCrawler")) p.stamina = Math.min(save.maxStamina, p.stamina + 5);
    if (eq.includes("veilSpinner")) (game.echoPatches ||= []).push({ kind: "web", x: me.x, y: me.y, radius: 1.4, until: now + 3000, slow: .5 });
    if (eq.includes("tremorWorm")) { // release 237 (restored: one puddle a dodge, each bursting on its own)
      const U = UPHEAVAL, marked = (e) => (game.echoPatches || []).some((q) => q.upheaval && now < q.until && q.foe === e.id), foes = nearest(game, me.x, me.y, U.range), foe = foes.find((e) => !marked(e)) || foes[0];
      if (foe) { const c = centre(foe); (game.echoPatches ||= []).push({ kind: "mortar", upheaval: true, foe: foe.id, x: c.x, y: c.y, radius: U.radius, until: now + U.delay, detonate: Math.round(dmg * U.damage) }); }
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
    if (eq.includes("stalker")) p.echoMist = { until: (p.dodgeUntil || now + 300) + STALKER_MIST.linger, hit: {} }; // release 699
    if (eq.includes("strataEel")) p.invulnerableUntil = Math.max(p.invulnerableUntil || 0, (p.dodgeUntil || now) + 250);
  } else if (event === "land") {
    if (eq.includes("sunderjaw")) world.blast(me.x, me.y, 1.8, dmg);
    if (eq.includes("earthGolem")) for (const e of nearest(game, me.x, me.y, 2.5)) e.hitStun = Math.max(e.hitStun || 0, .6);
  }
  else if (event === "kill") {
    const at = centre(data.enemy);
    if (eq.includes("gnawingMaw")) for (const e of nearest(game, at.x, at.y, 4, data.enemy)) { const c = centre(e), m = Math.hypot(at.x - c.x, at.y - c.y) || 1; world.nudge(e, (at.x - c.x) / m * Math.min(1, m - .4), (at.y - c.y) / m * Math.min(1, m - .4)); e.hitStun = Math.max(e.hitStun || 0, .3); }
    if (eq.includes("questingBeast")) for (const e of nearest(game, at.x, at.y, 4.5, data.enemy).slice(0, 2)) { world.arc(data.enemy, e, "#f2ece0"); world.damage(e, Math.round(dmg * 1.2)); }
    if (eq.includes("nanobotKnight")) for (const e of nearest(game, at.x, at.y, 5, data.enemy).slice(0, 2)) { world.arc(data.enemy, e, "#ff2a2a"); world.damage(e, Math.round(dmg * .8)); } // release 245
    if (eq.includes("crimsonTyrant")) world.blast(at.x, at.y, 2.5, Math.round(dmg * .9)); // release 709
    if (eq.includes("doomChaser")) { const foe = nearest(game, at.x, at.y, 6, data.enemy)[0]; if (foe) { const c = centre(foe); world.blast(c.x, c.y, 1.4, Math.round(dmg * .8)); world.arc(data.enemy, foe, "#a060ff"); } } // release 710
    if (eq.includes("ashenMoth")) { const foe = nearest(game, at.x, at.y, 5, data.enemy)[0]; if (foe) { foe.glyphBurn = { until: now + 3000, dps: Math.max(2, Math.round(dmg * .35)), tick: 0 }; world.arc(data.enemy, foe, "#ff8a2a"); } } // release 706
    if (eq.includes("lightningGiant")) for (const e of nearest(game, at.x, at.y, 5, data.enemy).slice(0, 3)) { world.arc(data.enemy, e, "#7fd6ff"); world.damage(e, Math.round(dmg * .7)); } // release 257
    if (eq.includes("bloblet")) p.hp = Math.min(p.maxHp || save.maxHp || p.hp, p.hp + 3); // release 235
    if (eq.includes("wormTentacle")) { const foe = nearest(game, at.x, at.y, 4, data.enemy)[0]; if (foe) { foe.glyphBurn = { until: now + 2500, dps: Math.max(2, Math.round(dmg * .3)), tick: 0 }; world.arc(data.enemy, foe, "#ff7a2a"); } } // release 237
    if (eq.includes("amalgam")) (game.echoPatches ||= []).push({ kind: "flesh", x: at.x, y: at.y, radius: 1.3, until: now + 4000, slow: .55 });
    if (eq.includes("cinderSeraph")) for (const e of nearest(game, at.x, at.y, 4).slice(0, 3)) { e.glyphBurn = { until: now + 2500, dps: Math.max(2, Math.round(dmg * .3)), tick: 0 }; world.arc(data.enemy, e, "#ff9a4a"); }
  } else if (event === "hurt") {
    if (eq.includes("hangedChoir")) world.blast(me.x, me.y, 2.2, Math.round(dmg * .8));
    if (eq.includes("crystalCrab")) world.blast(me.x, me.y, 1.5, Math.round(dmg * .5));
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
  if (p.echoMist && now < p.echoMist.until) for (const e of nearest(game, me.x, me.y, STALKER_MIST.reach)) if (!p.echoMist.hit[e.id]) { p.echoMist.hit[e.id] = true; if (mistRot(e, world)) (game.glyphVisuals ||= []).push({ kind: "mist", x: e.x + .5, y: e.y + .45, life: .45, max: .45 }); } // release 699
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
