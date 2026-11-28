// Creature Echoes v1 (release 99): itemization phase 2.
//
// Defeating a pack creature can leave an Echo of its signature attack. Echoes sit in notches (NOTCHES total; each
// costs 1-3, Hollow Knight charm style) and trigger from things the Wayfarer already does (dodging, landing a jump,
// killing, landing a hit (ON_HIT_ECHOES, 2026-11-18), being hurt, casting, firing, facing a foe, standing still), so they add
// moves without new buttons.
// Release 263: guardians and world beasts leave their creature's Echo by chance (ECHO_DROPS); ordinary kills do not.
//
// Data lives in ECHOES; the Game calls echoEvent() at its trigger points and tickEchoes() every frame.
import { unharmablePerson } from "./townsfolk.js?v=r1091-554e81714fae"; // Tim (2026-11-20): no non-hostile person can be harmed
import { rng } from "./random.js?v=r1091-554e81714fae";
import { latticeEchoes, toggleLatticeSlot } from "./transit-lattice.js?v=r1091-554e81714fae";
import { ENCUMBERED } from "./hit-cast-passives.js?v=r1091-554e81714fae"; // Maw's Hunger: a pull with no damage of its own (Tim, 2026-11-19)

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
  const rooms = ensureRoomBeastSlain(save);
  const slain = [["questingBeast", save.questingBeast?.slain], ["stalker", save.stalker?.kills], ...Object.entries(save.worldBeasts || {}).map(([id, q]) => [id, q?.slain]), ...ROOM_BEAST_IDS.map((id) => [id, rooms[id]])];
  for (const [minion, parent] of Object.entries(MINION_ECHOES)) slain.push([minion, save.worldBeasts?.[parent]?.slain]); // a minion's Echo, once its beast is slain
  const granted = slain.filter(([id, n]) => ECHOES[id] && Number(n) > 0 && !save.echoes.owned[id]).map(([id]) => id);
  for (const id of granted) save.echoes.owned[id] = true;
  return granted;
}

// Unreleased (Tim's log: "killed a Spinosaurus, no Echo"): the Spinosaurus of a big room or come in as an interloper, and the Wild
// Stegosaurus of a big room, are tuned as the roaming beast (game.ts tuneSpinoBeast / tuneStegoRoom) but are not it: no `worldBeast`,
// not a boss, so echoDrop's ordinary 0% applied and grantSlainEchoes (save.worldBeasts) never saw them. Their kills now count as the
// beast's: echoDrop is certain (game.ts), and save.roomBeastSlain (additive at schema 14) counts them so grantSlainEchoes can give the
// Echo on load. ROOM_BEAST_KILL maps the kill ids those spawns carry (spino-rex.ts spinoRoomSpawn and the interloper, wild-stego.ts
// stegoRoomSpawn) to the beast; a journey that killed one before this release is caught up once from the lasting per-kill flag the
// Game wrote for every rewarded kill (worldFlags `drop:v1:<area>:<enemy id>`, kept in the kill ledger now). A dino duel's eaten loser is never the Wayfarer's
// (game.ts dinoEaten: noRewards), so it is never counted.
export const ROOM_BEAST_KILL = { spinoRex: /:(spino-rex|spino)$/, wildStego: /:wild-stego$/, earthApato: /:earth-apato$/, pachy: /:pachy$/ };
export const ROOM_BEAST_IDS = Object.keys(ROOM_BEAST_KILL);
const ROOM_BEAST_FIRST = ["spinoRex", "wildStego"]; // the record's first two ids, always written
const roomBeastOf = (e) => e?.spinoRoom || e?.spinoInterloper ? "spinoRex" : e?.stegoRoom ? "wildStego" : e?.apatoRoom ? "earthApato" : e?.pachyRoom || e?.pachyAmbush ? "pachy" : null;
// `catchUp` false (freshSave) leaves the scan to the first load: a fresh save's defaults are merged under every loaded one, so a mark
// set there would stand in for an old journey that never scanned.
export function ensureRoomBeastSlain(save, catchUp = true) {
  if (!save || typeof save !== "object") return {};
  const r = save.roomBeastSlain && typeof save.roomBeastSlain === "object" ? save.roomBeastSlain : {};
  const out = { ...r }; for (const id of ROOM_BEAST_IDS) { const n = Math.max(0, Math.floor(Number(r[id]) || 0)); if (n > 0 || ROOM_BEAST_FIRST.includes(id)) out[id] = n; else delete out[id]; } // a later beast's count is written once it has one
  if (catchUp && !out.caughtUp) { // once: kills from before this record existed
    out.caughtUp = 1;
    const keys = Object.keys(save.worldFlags || {}).filter((key) => key.startsWith("drop:v1:") && save.worldFlags[key]);
    for (const [area, r] of Object.entries(save.killLedger?.areas || {})) for (const kill of Array.isArray(r?.d) ? r.d : []) keys.push(`drop:v1:${area}:${kill}`); // the kill ledger (types.ts KILL_LEDGER) holds them now
    for (const key of keys) for (const id of ROOM_BEAST_IDS) if (ROOM_BEAST_KILL[id].test(key)) out[id] = Math.max(Number(out[id]) || 0, 1);
  }
  save.roomBeastSlain = out; return out;
}
// The Game's kill: true when `e` is one of those beasts and the Wayfarer's (the count goes up).
export function noteRoomBeastKill(save, e) {
  const id = roomBeastOf(e); if (!id || e.summonedBy || e.noRewards || e.kind !== id) return false;
  const r = ensureRoomBeastSlain(save); r[id] = (Number(r[id]) || 0) + 1; return true;
}

// Spinosaur's Echo (Tim, 2026-11-12). Every jump-attack slam (any weapon's plunge, the Shadow Boxing dive's slam
// included) is followed `delay` s later by one afterimage slam on the same spot, with the same radius, for `share` of the
// slam's damage (and of its Imbue Weapon spark) and `stunShare` of its stagger. The afterimage is an ordinary effect, so it
// keeps every rule the slam keeps (friendly fire, bosses and elites, poise, sanctuaries); it never lays another afterimage.
export const SPINO_ECHO = { delay: .32, share: .5, stunShare: 1 };
// Earth Resolve (the Earth Apatosaurus's Echo; Tim, 2026-11-18). Attacking while standing still (no movement input for `still` s when
// the attack starts) plants a root sigil on the ground beneath you, `radius` tiles across at first. While you stand inside it you take
// `guard` less damage and heal `lifesteal` of the damage you deal; outside it, nothing. It never hurts a foe. Each hit you land from
// inside grows it by `grow` tiles (to `maxRadius`) and adds `extend` s to its time (from `seconds`, at most `cap` s after it was planted).
// It stays where it was planted. When it ends, a new one can be planted `cooldown` ms later. Runtime only (game.earthResolve): a reload
// drops the sigil; only its cooldown clock (player.echoResolveReadyAt) resumes, as the other Echo clocks do.
export const APATO_ECHO = { still: .25, radius: 1.6, maxRadius: 4, grow: .2, seconds: 4, extend: .6, cap: 10, guard: .15, lifesteal: .08, cooldown: 4000 }; // Tim (2026-11-25): guard .25 → .15, lifesteal .1 → .08; the heal stays its own, outside the shared heal-on-hit cap
// Dome Rush (the Pachycephalosaurus's Echo; Tim, 2026-11-27, redesigned the same day: "after a dodge, if you then connect three hits,
// you transform into an earth golem"). A dodge arms it for `window` ms; landing `hits` blows inside that window (each attack counts
// once: blows landing within `perAttackMs` of the last counted one, as a swing's several foes or a tool's sub-hits do, are the same
// attack; proc damage is no blow, as it never calls landHit) turns the Wayfarer into an EARTH GOLEM for `seconds` s: drawn `scale`
// larger in rocky plates, every blow she lands deals `damage` more (straight to health, so it is no hit and starts no proc), and she
// takes `guard` less damage. A new dodge re-arms it (the count starts again). It cannot arm while the golem lasts, nor until
// `cooldown` ms after the golem ends. Its clocks (echoGolemArmUntil, echoGolemUntil, echoGolemReadyAt) are player clocks (paused
// with the game, saved as time remaining for exact resume); the count and its last blow are saved beside them (game.ts).
export const PACHY_ECHO = { window: 3000, hits: 3, perAttackMs: 200, seconds: 3, damage: .25, guard: .3, scale: 1.25, cooldown: 10000 };
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
  // On-hit rework (Tim, 2026-11-18): ON_HIT_ECHOES.mend.
  bloblet: { name: "Bloblet Mend", cost: 1, trigger: "hit", module: "blobBloblets", text: "Each hit you land mends 1% of your maximum health, at most 3 times a second." },
  tremorWorm: { name: "Worm's Upheaval", cost: 3, trigger: "dodge", module: "wormRise", text: "Each dodge heaves the ground under a foe within 5 tiles (the nearest one not already marked); each puddle bursts a moment later, one after another." },
  // On-hit rework (Tim, 2026-11-18): ON_HIT_ECHOES.ember.
  wormTentacle: { name: "Tentacle Ember", cost: 1, trigger: "hit", module: "wormTentacles", text: "Each hit you land lays an ember on that foe; the third bursts, striking it and foes within 1.5 tiles for 40% of that hit (×1.75 against burning foes). Embers fade after 3 s without a hit." },
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
  // The Earth Apatosaurus (APATO_ECHO above; game.ts earthResolve*). Taken as every world beast's is: certain on the first kill, or on load.
  earthApato: { name: "Earth Resolve", cost: 2, trigger: "still", module: "apatoSeeds",
    text: `Attack while standing still and a root sigil grows under you. Standing inside it you take ${Math.round(APATO_ECHO.guard * 100)}% less damage and heal ${Math.round(APATO_ECHO.lifesteal * 100)}% of the damage you deal; each hit you land from inside grows it and makes it last longer (at most ${APATO_ECHO.cap} s). It stays where it grew, and returns ${APATO_ECHO.cooldown / 1000} s after it fades.` },
  pachy: { name: "Dome Rush", cost: 2, trigger: "dodge", module: "pachyDomeRam",
    text: `After a dodge, land ${PACHY_ECHO.hits} blows within ${PACHY_ECHO.window / 1000} s and you become an Earth Golem for ${PACHY_ECHO.seconds} s: +${Math.round(PACHY_ECHO.damage * 100)}% damage dealt and ${Math.round(PACHY_ECHO.guard * 100)}% less damage taken (then a ${PACHY_ECHO.cooldown / 1000} s rest).` },
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
// Triceratops Chop (Tim, 2026-11-27; it replaces Triceratops Cunning of 2026-11-18, under the same id so owned and set copies carry
// over). The Triceratops stays `noEcho` in MONSTER_PACK: only a Bad (hostile) one leaves this, certain on the first such kill (`from`
// and `certain`, read by echoDrop). Good and Silly Goose ones, ridden mounts and catches never do. Its rules: TRICERATOPS_CHOP.
ECHOES.triceratops = { name: "Triceratops Chop", cost: 2, trigger: "swing", module: "ramCharge", creature: "Triceratops", from: { triceratopsDisposition: "bad" }, certain: true,
  taken: "Defeat a hostile Triceratops to take it.", text: "Every third melee attack (a swing or a punch), two pale horn spikes form in the air beside your target and chop down onto it, one from each side, each for half of that blow's damage." };
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
// Tim (2026-11-18: "the echoes for the bloblets and the tentacles for the tremor worm are broken, they're not showing up after
// I've killed them"): a bloblet or a worm tentacle is a minion (summonedBy its beast, and never a guardian), so the summoned-kill
// rule and the ordinary 0% (release 263) left their Echoes unreachable. A minion Echo is now certain on its first kill, like a
// guardian's (release 337), and a Wayfarer who has slain the parent beast is granted it once on load (grantSlainEchoes).
export const MINION_ECHOES = { bloblet: "morphingBlob", wormTentacle: "tremorWorm" };
export function echoDrop(save, enemy, guardian, n, certain = false) {
  const id = echoKindOf(enemy), minion = !!id && Object.hasOwn(MINION_ECHOES, id);
  if (!id || !ECHOES[id] || save.echoes.owned[id] || (enemy.summonedBy && !minion) || enemy.noRewards || enemy.caught) return null;
  const from = ECHOES[id].from; // only a creature of this nature leaves it (the Triceratops: a Bad one)
  if (from && Object.keys(from).some((k) => enemy[k] !== from[k])) return null;
  if (minion || ECHOES[id].certain) certain = true;
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
  return game.enemies.filter((e) => !e.dead && !e.untargetable && !unharmablePerson(e) && e !== skip && Math.hypot(e.x + .5 - x, e.y + .45 - y) <= radius).sort((a, b) => Math.hypot(a.x + .5 - x, a.y + .45 - y) - Math.hypot(b.x + .5 - x, b.y + .45 - y));
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

// ---------------------------------------------------------------- on-hit Echoes (Tim, 2026-11-18)
// The Game calls echoEvent(game, "hit", now, { enemy, damage }) when the Wayfarer's own blow lands on a foe (game.ts landHit): a
// swing or cut, a punch or slam, a tool shot or sling stone, a spell's projectile or pulse, a weapon art, the staff's hands, a mount's
// horn, the Shadow Clone's swing. `damage` is the health it took (after the Wayfarer's damage scale). Never from burns, bleeds or
// poison ticks, nor from anything an Echo or a glyph or passive proc does (glyphWorld's damage and blast are never hits), nor from
// a glyph's Echo copy of a blow: no Echo can feed another. The hit path allocates nothing; the marks live on the foe, non-enumerable
// (never saved: a resume drops them), one small record per foe struck while an on-hit Echo is set.
export const ON_HIT_ECHOES = {
  // At most this many hits a second (a fixed one-second window) reach the on-hit Echoes; more are ignored.
  perSecond: 12,
  // A foe's hits closer together than this count once (a volley's shards, a field's simultaneous pulses); the Fourfold
  // Daggers' second cut (80 ms) still counts.
  perFoeGapMs: 60,
  // Bloblet Mend (Tim, revised 2026-11-18): each hit mends `share` of maximum health, at most `perSecond` times in any second.
  mend: { share: .01, perSecond: 3 },
  // Tentacle Ember (Tim, revised 2026-11-18): each hit lays a stack on that foe; the `stacks`th bursts it in embers, `share` of
  // that hit's damage to it and to every foe within `radius` tiles of it, times `burning` against a foe already burning (any
  // burn: glyphs, fire spells and Echoes all burn through `glyphBurn`). It ignites nothing. Stacks clear on the burst, and lapse
  // when the foe goes `lapseMs` without a hit. The burst is never a hit itself.
  ember: { stacks: 3, share: .4, radius: 1.5, burning: 1.75, lapseMs: 3000 },
};
// The Triceratops's Echo was on-hit (Triceratops Cunning) until 2026-11-27; Triceratops Chop counts swings (TRICERATOPS_CHOP).
export const ON_HIT_IDS = ["bloblet", "wormTentacle"];
const HIT_MARK = Symbol("onHitMark");
// Which on-hit Echoes are set (a bit per ON_HIT_IDS entry), worked out once a frame.
function onHitMask(game, now) {
  if (game._hitMaskAt === now && game._hitMaskSave === game.save) return game._hitMask;
  const eq = activeEchoes(game.save); let m = 0;
  for (let i = 0; i < ON_HIT_IDS.length; i++) if (eq.includes(ON_HIT_IDS[i])) m |= 1 << i;
  game._hitMaskAt = now; game._hitMaskSave = game.save; game._hitMask = m; return m;
}
function hitMark(e) {
  let m = e[HIT_MARK];
  if (!m) { m = { last: -Infinity, embers: 0, emberAt: -Infinity }; Object.defineProperty(e, HIT_MARK, { value: m, writable: true, configurable: true, enumerable: false }); }
  return m;
}
// The foe's runtime marks (tests and diagnostics); null when it has none.
export const onHitMarkOf = (e) => e?.[HIT_MARK] || null;
export function echoHit(game, now, enemy, damage) {
  const mask = onHitMask(game, now); if (!mask || !enemy || !(damage > 0) || !Number.isFinite(now)) return false;
  const H = ON_HIT_ECHOES, mark = hitMark(enemy);
  if (now - mark.last < H.perFoeGapMs) return false;
  if (!(now - (game._hitWindowAt ?? -Infinity) < 1000)) { game._hitWindowAt = now; game._hitWindowN = 0; }
  if (game._hitWindowN >= H.perSecond) return false;
  game._hitWindowN++; mark.last = now;
  const save = game.save, p = game.player;
  if (mask & 1 && p.hp > 0) { // Bloblet Mend: the last `perSecond` (3) mends' times, oldest first
    const M = H.mend, max = save.maxHp || p.maxHp || p.hp;
    if (!(now - (game._hitMend0 ?? -Infinity) < 1000)) {
      const before = p.hp; game.grantHitHeal?.(max * M.share, now, enemy); // the shared heal-on-hit budget (TESSERACTS.hitHealCap)
      if (p.hp > before) { game._hitMend0 = game._hitMend1 ?? -Infinity; game._hitMend1 = game._hitMend2 ?? -Infinity; game._hitMend2 = now; if (game._echoLastHp !== undefined) game._echoLastHp += p.hp - before; } // a mend is never read as a wound's absence
    }
  }
  if (mask & 2) { // Tentacle Ember
    const E = H.ember;
    if (now - mark.emberAt > E.lapseMs) mark.embers = 0;
    mark.embers++; mark.emberAt = now;
    if (mark.embers >= E.stacks) { mark.embers = 0; mark.emberAt = -Infinity; emberBurst(game, now, enemy, damage); }
  }
  return true;
}
export const isBurning = (e, now) => (e?.glyphBurn?.until || 0) > now;
// The ember burst: straight to health (never game.landHit or glyphWorld, so it is no hit and no proc), each blow the Wayfarer's.
function emberBurst(game, now, at, damage) {
  const E = ON_HIT_ECHOES.ember, x = at.x + .5, y = at.y + .45, base = Math.max(1, Math.round(damage * E.share)), list = game.enemies || [], n = list.length; // foes a kill brings in are not struck
  (game.glyphVisuals ||= []).push({ kind: "burst", x, y, radius: E.radius, life: .35, max: .35 });
  for (let i = 0; i < n; i++) {
    const e = list[i];
    if (e.dead || e.untargetable || unharmablePerson(e) || !(e.hp > 0) || Math.hypot(e.x + .5 - x, e.y + .45 - y) > E.radius + .2) continue;
    const before = e.hp; e.hp -= Math.round((isBurning(e, now) ? base * E.burning : base) * (game.vulnScale?.(e, now) ?? 1)); e.hitFlash = .18; // Tempo's window: every source
    game.astralPlayerHit?.(e, Math.max(0, before - Math.max(0, e.hp)));
    if (e.hp <= 0 && !e.dead) { e.dead = true; game.defeatEnemy?.(e); }
  }
}

// ---------------------------------------------------------------- Triceratops Chop (Tim, 2026-11-27)
// Every `every`th melee attack of the Wayfarer's (a weapon swing, counted once a swing at its contact whatever it strikes, and each
// Iron Fists step; never a spell, a tool shot, a weapon art, the Shadow Clone or a glyph's Echo copy) sends two horn spikes: they
// form in the air beside the target, one on the viewer's left and one on the right, hang a moment, then chop down at an angle onto
// it, the right one `lagMs` after the left. The target: the foe the swing struck, else the locked foe or the nearest one in front
// within `seek` tiles (`cone`: the cosine the aim must make with it), else the point `ahead` tiles in front (the spikes strike the
// ground there). While they form and hang they follow the target; once they fall they are committed to where it stood, and a foe
// more than `reach` tiles (plus its extra body) from that point when they land is missed.
// Damage: each spike is `share` of the triggering blow's physical damage as the weapon pipeline made it (the weapon's damage,
// Might, refinement and the swing's own share; an Iron Fist's punch power), before the Wayfarer's damage scale, which it then goes
// through like any blow (game.ts chopBlow): Tempo's window, the Nanobot Knight's scatter, kill credit. It is never a hit: no
// on-hit Echo, passive, glyph, Tesseract heal or frenzy blow comes of it, and it never counts as a swing, so nothing chains.
// A stagger of `stun` s (`bossStun` on bosses and elites). The count is runtime state saved for exact resume (playerRuntime
// .chopSwings); spikes still in the air when the game is saved are dropped, as every effect is. At most `cap` spikes at once
// (a fixed pool: the oldest gives way); none survive leaving the area. Drawing: `draw` (renderer.ts drawChopSpikes, close-view.ts).
export const TRICERATOPS_CHOP = Object.freeze({
  every: 3, share: .5, sides: Object.freeze([-1, 1]),
  seek: 3.5, cone: .25, ahead: 1.1, reach: .8,
  formMs: 160, hangMs: 70, fallMs: 110, lagMs: 70, impactMs: 260,
  stun: .15, bossStun: .06,
  cap: 6,
  // Appearance only: `height` and `side` (tiles) place the hanging spike's centre above and beside the target; `length` and
  // `radius` its horn; `strike` the height on the target it lands at; `dust` the impact ring's reach.
  draw: Object.freeze({ height: 1.35, side: .8, length: .7, radius: .1, strike: .3, sink: .12, dust: .55, horn: "#efe6cf", edge: "#8a7a5c", flash: "#fff4d6", dustColor: "#c8b48a" }),
});
// The spike pool (game.chopSpikes): `cap` records made once, then reused.
function chopPool(game) {
  let pool = game.chopSpikes;
  if (!Array.isArray(pool) || pool.length !== TRICERATOPS_CHOP.cap) {
    pool = game.chopSpikes = [];
    for (let i = 0; i < TRICERATOPS_CHOP.cap; i++) pool.push({ on: false, side: 1, at: 0, fallAt: 0, hitAt: 0, endAt: 0, tx: 0, ty: 0, foe: null, damage: 0, struck: false, landed: false, map: null });
  }
  return pool;
}
const chopFoeOk = (e) => !!e && !e.dead && !e.untargetable && !e.hidden && e.hp > 0 && !unharmablePerson(e);
// The spikes' target for a blow along (dx, dy) that struck `hit` (or nothing): see TRICERATOPS_CHOP.
export function chopTarget(game, hit, dx, dy) {
  if (chopFoeOk(hit)) return hit;
  const C = TRICERATOPS_CHOP, p = game.player, cx = p.x + .5, cy = p.y + .45, front = (e) => { const ex = e.x + .5 - cx, ey = e.y + .45 - cy, d = Math.hypot(ex, ey); return d <= C.seek && (d < .05 || (ex * dx + ey * dy) / d >= C.cone); };
  const lock = game.reachLock?.(); if (chopFoeOk(lock) && front(lock)) return lock;
  let best = null, bd = Infinity;
  for (const e of game.enemies || []) { if (!chopFoeOk(e) || e.farBelow || !front(e)) continue; const d = Math.hypot(e.x + .5 - cx, e.y + .45 - cy); if (d < bd) { bd = d; best = e; } }
  return best;
}
// A melee attack landed its contact (game.ts primaryAttack, fistPunch, releasePendingMeleeContact): count it, and every `every`th
// send the spikes. `base` is the blow's physical damage before the Wayfarer's damage scale; (dx, dy) its aim. Returns true when sent.
export function chopSwing(game, now, hit, base, dx, dy) {
  const C = TRICERATOPS_CHOP, p = game.player;
  if (!p || !(p.hp > 0) || !Number.isFinite(now) || !hasEcho(game.save, "triceratops")) return false;
  const n = (Math.max(0, Math.floor(Number(p.chopSwings) || 0)) + 1) % C.every; p.chopSwings = n;
  if (n !== 0) return false;
  const m = Math.hypot(Number(dx) || 0, Number(dy) || 0), ax = m > 1e-6 ? dx / m : 1, ay = m > 1e-6 ? dy / m : 0, foe = chopTarget(game, hit, ax, ay);
  const tx = foe ? foe.x + .5 : p.x + .5 + ax * C.ahead, ty = foe ? foe.y + .45 : p.y + .45 + ay * C.ahead, damage = Math.max(1, (Number(base) || 0) * C.share), pool = chopPool(game);
  for (let i = 0; i < C.sides.length; i++) {
    let slot = null; for (const q of pool) { if (!q.on) { slot = q; break; } if (!slot || q.at < slot.at) slot = q; } // full: the oldest gives way
    const lag = i * C.lagMs;
    slot.on = true; slot.side = C.sides[i]; slot.at = now; slot.fallAt = now + C.formMs + C.hangMs + lag; slot.hitAt = slot.fallAt + C.fallMs; slot.endAt = slot.hitAt + C.impactMs;
    slot.tx = tx; slot.ty = ty; slot.foe = foe; slot.damage = damage; slot.struck = false; slot.landed = false; slot.map = game.map || null;
  }
  return true;
}
// Every frame (tickEchoes): the spikes follow their target until they fall, then strike once each.
export function tickChop(game, now) {
  const pool = game.chopSpikes; if (!Array.isArray(pool)) return;
  for (const q of pool) {
    if (!q.on) continue;
    if (q.map !== (game.map || null)) { q.on = false; q.foe = null; continue; } // left the area: they are gone
    if (now < q.fallAt && chopFoeOk(q.foe)) { q.tx = q.foe.x + .5; q.ty = q.foe.y + .45; }
    if (!q.struck && now >= q.hitAt) {
      q.struck = true; const e = q.foe, C = TRICERATOPS_CHOP;
      if (chopFoeOk(e) && Math.hypot(e.x + .5 - q.tx, e.y + .45 - q.ty) <= C.reach + Math.max(0, (Number(e.bodyRadius) || .38) - .38)) { q.landed = true; game.chopBlow?.(e, q.damage, now); }
      q.foe = null;
    }
    if (now >= q.endAt) q.on = false;
  }
}
// Where a spike is drawn at `now` (both views): its horn from base (bx, by, bz) to tip (tx, ty, tz), in tiles, z up from the ground
// under the target; `alpha`; `impact` 0..1 through its impact flash (0 before it lands). (rx, ry): the viewer's right on the ground
// (Standard View: 1, 0; Close View: the camera's). Under reduced motion the spike forms without growing and lands without falling
// through the air. Writes `out` (no allocation); returns null for a spike that is not up.
export function chopSpikePose(q, now, rx, ry, reduce = false, out = {}) {
  if (!q?.on || !(now >= q.at)) return null;
  const C = TRICERATOPS_CHOP, D = C.draw, hx = q.tx + rx * q.side * D.side, hy = q.ty + ry * q.side * D.side, hz = D.height;
  let ux = q.tx - hx, uy = q.ty - hy, uz = D.strike - hz; const um = Math.hypot(ux, uy, uz) || 1; ux /= um; uy /= um; uz /= um;
  const grow = reduce ? 1 : Math.min(1, (now - q.at) / C.formMs), fall = now < q.fallAt ? 0 : now >= q.hitAt ? 1 : reduce ? 0 : ((now - q.fallAt) / (q.hitAt - q.fallAt)) ** 2;
  const L = D.length * (.35 + .65 * grow), travel = (um - D.length * .5 + D.sink) * fall, cx = hx + ux * travel, cy = hy + uy * travel, cz = hz + uz * travel;
  out.bx = cx - ux * L * .5; out.by = cy - uy * L * .5; out.bz = cz - uz * L * .5; out.tx = cx + ux * L * .5; out.ty = cy + uy * L * .5; out.tz = cz + uz * L * .5;
  out.ux = ux; out.uy = uy; out.uz = uz; out.radius = D.radius * (.5 + .5 * grow);
  const impact = now >= q.hitAt ? Math.min(1, (now - q.hitAt) / C.impactMs) : 0;
  out.impact = impact; out.landed = q.landed; out.gx = q.tx; out.gy = q.ty; out.side = q.side;
  out.alpha = (reduce ? 1 : Math.min(1, .25 + grow)) * (impact > 0 ? 1 - impact : 1);
  return out;
}
// The horn as Close View draws it, from a pose: 4 triangles (two crossed tapering blades, one across the viewer's right (rx, ry), one
// across that in the plane of its fall), 12 vertices of x, y, z and a shade (1 the tip, .75 a base corner, .55 the base's centre),
// written to `out` (a Float32Array of 48). `yo` moves it from the target's centre line to its feet. Returns `out`.
export function chopHornVerts(P, rx, ry, yo = 0, out = new Float32Array(48)) {
  const bx = P.bx, by = P.by + yo, bz = P.bz, tx = P.tx, ty = P.ty + yo, tz = P.tz, r = P.radius;
  const wx = rx * r, wy = ry * r, hx = -P.ux * P.uz * r, hy = -P.uy * P.uz * r, hz = (1 - P.uz * P.uz) * r;
  for (let i = 0, o = 0; i < 4; i++) { const k = i & 1 ? -1 : 1, ox = i < 2 ? wx : hx, oy = i < 2 ? wy : hy, oz = i < 2 ? 0 : hz;
    out[o++] = tx; out[o++] = ty; out[o++] = tz; out[o++] = 1;
    out[o++] = bx + ox * k; out[o++] = by + oy * k; out[o++] = bz + oz * k; out[o++] = .75;
    out[o++] = bx; out[o++] = by; out[o++] = bz; out[o++] = .55; }
  return out;
}

export function echoEvent(game, event, now, data = {}) {
  if (event === "hit") { domeRushHit(game, now, data.enemy, data.damage); return void echoHit(game, now, data.enemy, data.damage); }
  if (event === "spell") game.passiveCast?.(now); // hit-cast-passives.ts: Arcane Edge, Glyph Mine, Casting Wind, Echoing Cast (with or without Echoes set)
  const save = game.save, p = game.player, eq = activeEchoes(save), world = game.glyphWorld(now), dmg = echoDamage(save), me = centre(p);
  if (!eq.length) return;
  if (event === "dodge") {
    if (eq.includes("thunderhorn")) p.echoCharge = { until: p.dodgeUntil || now + 300, hit: {} };
    if (eq.includes("riftLynx")) p.echoPounceUntil = now + 1200;
    if (eq.includes("pachy")) golemArm(p, now); // Dome Rush: arms the Earth Golem
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
    if (eq.includes("gnawingMaw")) for (const e of nearest(game, at.x, at.y, 4, data.enemy)) { const c = centre(e), m = Math.hypot(at.x - c.x, at.y - c.y) || 1; world.nudge(e, (at.x - c.x) / m * Math.min(1, m - .4), (at.y - c.y) / m * Math.min(1, m - .4)); e.hitStun = Math.max(e.hitStun || 0, .3); world.pull?.(e, dmg * ENCUMBERED.dry); } // Encumbered: a pull with no damage of its own counts `dry` of the Echo damage
    if (eq.includes("questingBeast")) for (const e of nearest(game, at.x, at.y, 4.5, data.enemy).slice(0, 2)) { world.arc(data.enemy, e, "#f2ece0"); world.damage(e, Math.round(dmg * 1.2)); }
    if (eq.includes("nanobotKnight")) for (const e of nearest(game, at.x, at.y, 5, data.enemy).slice(0, 2)) { world.arc(data.enemy, e, "#ff2a2a"); world.damage(e, Math.round(dmg * .8)); } // release 245
    if (eq.includes("crimsonTyrant")) world.blast(at.x, at.y, 2.5, Math.round(dmg * .9)); // release 709
    if (eq.includes("doomChaser")) { const foe = nearest(game, at.x, at.y, 6, data.enemy)[0]; if (foe) { const c = centre(foe); world.blast(c.x, c.y, 1.4, Math.round(dmg * .8)); world.arc(data.enemy, foe, "#a060ff"); } } // release 710
    if (eq.includes("ashenMoth")) { const foe = nearest(game, at.x, at.y, 5, data.enemy)[0]; if (foe) { foe.glyphBurn = { until: now + 3000, dps: Math.max(2, Math.round(dmg * .35)), tick: 0 }; world.arc(data.enemy, foe, "#ff8a2a"); } } // release 706
    if (eq.includes("lightningGiant")) for (const e of nearest(game, at.x, at.y, 5, data.enemy).slice(0, 3)) { world.arc(data.enemy, e, "#7fd6ff"); world.damage(e, Math.round(dmg * .7)); } // release 257
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
  if (game.chopSpikes) tickChop(game, now); // Triceratops Chop: spikes already sent strike even if the Echo is set aside
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
// ---------------------------------------------------------------- Dome Rush (PACHY_ECHO): the Earth Golem
export const golemOn = (p, now) => !!p && now < (Number(p.echoGolemUntil) || 0);
// The golem's share of the Wayfarer's size (draw-time only: both views scale the figure by it), 1 when it is not on; it swells in and
// out over `ease` ms (none with reduced motion).
export function golemScale(p, now, reduce = false) { if (!golemOn(p, now)) return 1; const D = PACHY_ECHO, start = p.echoGolemUntil - D.seconds * 1000, k = reduce ? 1 : Math.min(1, (now - start) / 180, (p.echoGolemUntil - now) / 180); return 1 + (D.scale - 1) * Math.max(0, k); }
// The damage-taken scale while the golem lasts (game.ts hurtScale multiplies it in).
export const golemGuard = (p, now) => golemOn(p, now) ? 1 - PACHY_ECHO.guard : 1;
// A dodge: arms it (the count from nought), unless the golem is on or resting.
export function golemArm(p, now) {
  if (!p || golemOn(p, now) || now < (Number(p.echoGolemReadyAt) || 0)) return false;
  p.echoGolemArmUntil = now + PACHY_ECHO.window; p.echoGolemHits = 0; p.echoGolemHitAt = 0; return true;
}
// A blow the Wayfarer landed (game.ts landHit, through echoEvent "hit"). While the golem lasts: its extra damage, straight to health.
// While armed: counts the attack (once per attack) and, at the last of `hits`, wakes the golem. Returns "bonus", "count", "golem" or null.
export function domeRushHit(game, now, enemy, damage) {
  const p = game?.player, D = PACHY_ECHO;
  if (!p || !enemy || !(damage > 0) || !hasEcho(game.save, "pachy")) return null;
  if (golemOn(p, now)) {
    if (enemy.dead || !(enemy.hp > 0)) return null;
    const extra = Math.max(1, Math.round(damage * D.damage * (game.vulnScale?.(enemy, now) ?? 1))), before = Math.max(0, enemy.hp);
    enemy.hp -= extra; enemy.hitFlash = .18; game.astralPlayerHit?.(enemy, Math.max(0, before - Math.max(0, enemy.hp)));
    if (enemy.hp <= 0 && !enemy.dead) { enemy.dead = true; game.defeatEnemy?.(enemy); }
    return "bonus";
  }
  if (!(now < (Number(p.echoGolemArmUntil) || 0))) return null;
  const last = Number(p.echoGolemHitAt) || 0;
  if ((p.echoGolemHits || 0) > 0 && now - last < D.perAttackMs) return null; // the same attack
  p.echoGolemHits = (p.echoGolemHits || 0) + 1; p.echoGolemHitAt = now;
  if (p.echoGolemHits < D.hits) return "count";
  p.echoGolemArmUntil = 0; p.echoGolemHits = 0; p.echoGolemHitAt = 0; p.echoGolemUntil = now + D.seconds * 1000; p.echoGolemReadyAt = p.echoGolemUntil + D.cooldown;
  const c = centre(p); (game.glyphVisuals ||= []).push({ kind: "burst", x: c.x, y: c.y, radius: 1.2, life: .4, max: .4 });
  game.message = `Dome Rush: Earth Golem (${D.seconds} s).`;
  return "golem";
}
export function pounceBonus(game, now) {
  if (!hasEcho(game.save, "riftLynx") || now >= (game.player.echoPounceUntil || 0)) return 1;
  game.player.echoPounceUntil = 0;
  return 1.6;
}

// ---------------------------------------------------------------- Earth Resolve (APATO_ECHO): the Game calls these
// An attack starts: plant the sigil under a Wayfarer who has stood still `still` s, if none is up and the cooldown has passed.
export function earthResolvePlant(game, now) {
  const A = APATO_ECHO, p = game.player;
  if (!hasEcho(game.save, "earthApato") || game.earthResolve || !(p.hp > 0) || now < (p.echoResolveReadyAt || 0)) return null;
  if (now - (Number(game.resolveMovedAt) || 0) < A.still * 1000) return null;
  const c = centre(p); game.earthResolve = { x: c.x, y: c.y, r: A.radius, at: now, until: now + A.seconds * 1000, heal: 0, map: game.map || null }; return game.earthResolve;
}
export const insideResolve = (game) => { const q = game?.earthResolve, p = game?.player; if (!q || !p) return false; const c = centre(p); return Math.hypot(c.x - q.x, c.y - q.y) <= q.r; };
// A hit the Wayfarer landed (`actual` health taken off the foe): from inside, it grows and extends the sigil and heals her.
export function earthResolveHit(game, actual, now) {
  const A = APATO_ECHO, q = game.earthResolve; if (!q || !(actual > 0) || !insideResolve(game)) return 0;
  q.r = Math.min(A.maxRadius, q.r + A.grow); q.until = Math.min(q.at + A.cap * 1000, q.until + A.extend * 1000);
  const p = game.player, max = Number(game.save.maxHp) || p.maxHp || 100; q.heal += actual * A.lifesteal; const n = Math.floor(q.heal + 1e-9);
  if (n > 0 && p.hp > 0) { q.heal -= n; p.hp = Math.min(max, p.hp + n); game._echoLastHp = p.hp; } return n;
}
// Every frame: it ends when its time runs out; the cooldown starts then. Returns the damage-taken scale (1 - guard inside, else 1).
export function tickEarthResolve(game, now) {
  const q = game.earthResolve; if (!q) return 1;
  if (q.map !== (game.map || null)) { game.earthResolve = null; return 1; } // left the area: it stays behind, and is gone
  if (now >= q.until) { game.earthResolve = null; game.player.echoResolveReadyAt = now + APATO_ECHO.cooldown; return 1; }
  return insideResolve(game) ? 1 - APATO_ECHO.guard : 1;
}
