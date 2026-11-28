// The soundtrack's director (Tim, 2026-11-14): reads the game, never changes it, and tells soundtrack.ts which song should
// play, how urgent it should be, and which story beat (stinger) just happened.
//
// - Place: musicContext() turns the area, the dungeon id, the landscape, the sea and the far realms into one of
//   MUSIC_CONTEXTS. Chapter: journeyChapter() reads progress the save already keeps (Aperture tier, world beasts slain,
//   the Pentagon and the far realms reached), so a journey moves through the album (soundtrack-songs.ts LINER_NOTES).
// - Song: the heaviest song MUSIC_SELECTION allows for the place and chapter; after DIRECTOR.dwell seconds of calm it rotates
//   to another eligible song, never the same one twice running.
// - Intensity 0-1: rises quickly with hostiles engaged or near and with damage dealt or taken, holds a moment, then decays
//   over about ten seconds. "Calm only" (the Soundtrack setting) holds it at 0.
// - A world beast or boss in the fight switches to its own theme (BOSS_THEMES, by bossKey), or the shared boss track.
// - The dino duel (DUEL): while the Spinosaurus and the Wild Stegosaurus fight near the Wayfarer, the score is hushed (`hush`)
//   and battle-sfx.ts carries the fight; no boss theme starts until it is over.
import { SONGS, MUSIC_SELECTION, MUSIC_CONTEXTS } from "./soundtrack-songs.ts";
import { apertureTier } from "./world.ts";
import { seededRandom } from "./soundtrack.ts";

export const DIRECTOR = {
  engagedRange: 14, nearRange: 8, bossRange: 22,
  weights: { engaged: .2, near: .06, hurt: .35, hit: .18 },
  hurtHold: 4, hitHold: 3,
  rise: 1.4, hold: 2.5, decay: .1,
  dwell: [120, 240], bossLinger: 5,
  // Sea bosses keep no aggro flag (sea-creatures.ts runs their hunt): within seaRange of the Wayfarer they count as fought.
  seaBosses: ["tyrantMosasaur"], seaRange: 14,
  // Big beasts with no roaming world beast that still bring their own theme when fought (Tim, 2026-11-27: the Pachycephalosaurus of a
  // big room or an ambush), by kind; never while it lies disguised.
  themedBeasts: ["pachy"],
  cooldowns: { region: 90, beast: 45, rest: 20, departure: Infinity },
};
// Chapters of the journey, from progress the save already holds. The first matching row, from the top, wins.
export const CHAPTERS = [
  { chapter: 4, name: "Revelation", farRealm: true, tier: 5, slain: 4 },
  { chapter: 3, name: "Rising", pentagon: true, tier: 3, slain: 2 },
  { chapter: 2, name: "Wandering", tier: 1, slain: 1 },
  { chapter: 1, name: "Departure" },
];
// The dino duel (Tim, 2026-11-14: "This is literally the only place in the game where there are sounds of battle"). A living
// Spinosaurus and a living Wild Stegosaurus within `range` tiles of each other and of the Wayfarer, at least one targeting or striking
// the other (or both roused), is a duel: any of them, a world beast, a big room's or an interloper. The music fades out over
// `fadeOut` s (the lead-in, `leadIn` s, before the duel is fully on), the battle-sfx.ts sounds carry it, and no boss theme starts.
// It ends `linger` s after one falls, they part or the Wayfarer leaves (at once when the Wayfarer lands the kill: the victory
// stinger then plays), and the music fades back in over `fadeIn` s. `undercurrent`: true keeps one sub drone and a slow heartbeat
// (battle-sfx.ts BATTLE_SFX.undercurrent, -30 dB or less) under the battle; false is silence.
export const DUEL = { kinds: ["spinoRex", "wildStego"], apato: "earthApato", later: ["pachy", "triceratops"], range: 16, leadIn: 1.5, linger: 4, fadeOut: 1.5, fadeIn: 2.5, undercurrent: true };
const duelAlive = (e) => !!e && !e.dead && e.hp > 0 && !e.retreating && !e.passingBeast && !e.fleeTo && !e.illusion;
// Is `a` going for `b`: its focus (SPINO hunt, STEGO rival) or the blow it is throwing?
const duelTargets = (a, b) => !!a?.pack && (a.pack.spinoFocus === b.id || a.pack.stegoRival === b.id || a.pack.apatoRival === b.id || a.pack.pachyRival === b.id || a.pack.trikeRival === b.id || (!!a.pack.attack && a.pack.data?.prey === b.id));
// The duelling pair near the Wayfarer, or null: the nearest Spinosaurus and Wild Stegosaurus that meet the rule above.
export function sampleDuel(game, range = DUEL.range) {
  const p = game?.player || {}, near = (e) => Math.hypot((e.x || 0) - (p.x || 0), (e.y || 0) - (p.y || 0)) <= range;
  const spinos = [], stegos = [], apatos = [];
  for (const e of game?.enemies || []) { if (!duelAlive(e) || !near(e)) continue; if (e.kind === DUEL.kinds[0]) spinos.push(e); else if (e.kind === DUEL.kinds[1]) stegos.push(e); else if (e.kind === DUEL.apato) apatos.push(e); }
  const meets = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= range && (duelTargets(a, b) || duelTargets(b, a) || (a.aggro && b.aggro));
  for (const spino of spinos) for (const stego of stegos) if (meets(spino, stego)) return { spino, stego };
  // the Earth Apatosaurus's duels (Tim, 2026-11-18): the pair by kind, `apato` and the Spinosaurus or the Wild Stegosaurus
  for (const apato of apatos) { for (const spino of spinos) if (meets(apato, spino)) return { apato, spino, stego: null }; for (const stego of stegos) if (meets(apato, stego)) return { apato, spino: null, stego }; }
  // the later pairs (Tim, 2026-11-27: the Pachycephalosaurus with each, the wild Triceratops with the Spinosaurus and the stego): a pair
  // in a duel (dino-duel.ts, each keeping it on itself) near the Wayfarer; `a` and `b` are the two (and named by kind where the older
  // fields name them, so the stego's answer and the falls read as before)
  for (const a of game?.enemies || []) { const fid = a?.dinoDuel?.foe; if (!fid || !DUEL.later.includes(a.kind) || !duelAlive(a) || !near(a)) continue;
    const b = (game.enemies || []).find((q) => q.id === fid); if (!b || !duelAlive(b) || !meets(a, b)) continue;
    const by = (k) => a.kind === k ? a : b.kind === k ? b : null; return { a, b, spino: by("spinoRex"), stego: by("wildStego"), apato: by("earthApato") }; }
  return null;
}
// Each world boss's own theme (Phase 2, Tim 2026-11-14): bossKey -> a song id in SONGS with boss: true (soundtrack-songs.ts,
// LINER_NOTES tells each one's story). Keys are world beast ids (WORLD_BEASTS) or, for bosses that are not world beasts,
// creature kinds; "kind:variant" is a form a beast turns into mid-fight. Any other boss plays the shared "boss" track.
export const BOSS_THEMES = {
  ashenMoth: "cinderWings", mothChrysalis: "cinderSleep",
  briarStag: "briarHunt", crimsonTyrant: "crimsonCrown", doomChaser: "longPursuit", lightningGiant: "thunderEngine",
  morphingBlob: "shapeless", mountainTurtle: "mountainWalks", nanobotKnight: "clockworkOath", psychicCrystal: "glassMind",
  tremorWorm: "underTheFloor", voidWalker: "walkerBetween", wildStego: "fernsAndPlates",
  spinoRex: "riverStalker", "spinoRex:fossil": "bonesHunt", earthApato: "rootedColossus", /* the Earth Apatosaurus (Tim, 2026-11-18) */
  pachy: "skullDrum", /* the Pachycephalosaurus (Tim, 2026-11-27), of a big room or an ambush (DIRECTOR.themedBeasts) */
  astralWorm: "coilOfStars", questingBeast: "quarryBays", stalker: "eyesBehind", listener: "whatListens",
  gloomvast: "gloomRises", gateRevenant: "revenantsReturn", tyrantMosasaur: "deepTide",
};
// The key a boss's music is chosen by: its world beast id, else its sea or creature kind; with ":fossil" once the Spinosaurus
// has shed its flesh (e.spinoFossil), so its theme turns to bone.
export function bossKey(e) {
  const kind = typeof e?.worldBeast === "string" ? e.worldBeast : e?.seaKind || e?.kind || null;
  return kind && e.spinoFossil ? `${kind}:fossil` : kind;
}
// A variant key with no theme of its own plays the beast's theme; an unknown key, or a theme missing from songs, the shared track.
export function bossSongFor(kind, themes = BOSS_THEMES, songs = SONGS) {
  if (kind == null) return "boss";
  for (const k of [kind, String(kind).split(":")[0]]) { const id = themes[k]; if (id && songs[id]) return id; }
  return "boss";
}

const DARK = new Set(["swamp", "blight", "fog", "volcanic", "obsidian", "fungal", "marrow", "biomech", "petrified", "reckoning"]);
const STRANGE = new Set(["alien", "crystal", "lunar", "regolith", "dream", "glacier"]);
// The place, as one of MUSIC_CONTEXTS.
export function musicContext(game) {
  const map = game?.map || {}, save = game?.save || {}, id = String(save.session?.activeDungeonId || "");
  if (game?.area === "dungeon") {
    if (map.underwater || id.startsWith("dive:")) return "sea";
    if (id.startsWith("skyland:") || map.seedRealm) return "sky";
    if (id.startsWith("the-deep:") || id.includes(":deep-v") || map.deepDungeon) return "deep";
    if (/^(pentagon|castle|labyrinth):/.test(id) || /^building:.*:keep:/.test(id) || map.building?.pentagon || map.building?.style === "keep") return "halls";
    return "dungeon";
  }
  const biome = map.landscape?.biome || null;
  if (game?.swimming || (save.boat?.owned === true && save.boat.aboard === true) || biome === "sea") return "sea";
  if (game?.farRealm || STRANGE.has(biome)) return "sky";
  if (biome === "castle") return "halls";
  if (DARK.has(biome)) return "dusk";
  return "day";
}
export function journeyChapter(save) {
  const tier = apertureTier(save?.perception?.aperture);
  const slain = Object.values(save?.worldBeasts || {}).reduce((n, b) => n + (Number(b?.slain) || 0), 0);
  const dungeons = Object.keys(save?.consequences?.dungeons || {});
  const pentagon = dungeons.some((k) => k.startsWith("pentagon:"));
  const farRealm = dungeons.some((k) => k.startsWith("skyland:")) || (save?.narrative?.journal || []).some((j) => String(j?.recordId || "").startsWith("far-realm:"));
  for (const c of CHAPTERS) if ((c.farRealm && farRealm) || (c.pentagon && pentagon) || (c.tier != null && tier >= c.tier) || (c.slain != null && slain >= c.slain) || c.tier == null) return c.chapter;
  return 1;
}
// Songs a place allows in a chapter, heaviest first.
export function songsFor(context, chapter, selection = MUSIC_SELECTION) {
  const rows = selection.filter(([c, , from, to]) => c === context && chapter >= from && chapter <= to);
  const use = rows.length ? rows : selection.filter(([c]) => c === context);
  return use.slice().sort((a, b) => b[4] - a[4]).map(([, id, , , w]) => ({ id, weight: w }));
}

// One reading of the game for the director. `memo` keeps what it needs between readings (the boss being fought).
export function sampleMusic(game, memo = {}) {
  const p = game?.player || {}, save = game?.save || {}, D = DIRECTOR;
  let engaged = 0, near = 0, foeHp = 0, boss = null, bossD = Infinity;
  for (const e of game?.enemies || []) {
    if (!e || e.dead || !(e.hp > 0) || e.ambient) continue;
    const d = Math.hypot((e.x || 0) - (p.x || 0), (e.y || 0) - (p.y || 0));
    // Also the Gate Revenants' hunt (gatePredator) and the Ashen Moth's chrysalis, whose quiet theme waits for the hatching.
    const bossLike = e.boss || e.worldBeast || e.questingBeast || e.gatePredator || e.mothChrysalis || (D.themedBeasts.includes(e.kind) && (e.pachyRoom || e.pachyAmbush) && !e.pachyDisguised);
    const fought = e.aggro || e.pentArenaAwake || (D.seaBosses.includes(e.seaKind) && d < D.seaRange);
    if (bossLike && fought && d < D.bossRange && d < bossD) { boss = e; bossD = d; }
    if (e.aggro && d < D.engagedRange) { engaged++; foeHp += Number(e.hp) || 0; }
    else if (d < D.nearRange) near++;
  }
  // A boss being fought that is now dead (still in the list, or its hp gone) is a fall; one that left the list is not. A broken
  // chrysalis is a hatching, and one Revenant of a hunt is not the hunt: neither is a victory.
  let bossDefeated = false;
  const was = memo.boss;
  // A duellist felled by the other beast (its kill pays nothing: noRewards) is no victory of the Wayfarer's either.
  if (was && was !== boss && (was.dead || !(was.hp > 0)) && (game?.enemies || []).includes(was) && !was.mothChrysalis && !was.gatePredator && !((DUEL.kinds.includes(was.kind) || DUEL.later.includes(was.kind)) && was.noRewards)) bossDefeated = true;
  memo.boss = boss;
  // The dino duel: the pair (kept in memo for battle-sfx.ts), and a fall of one of the last pair: by the Wayfarer, or by a beast.
  const pair = sampleDuel(game), last = memo.duelPair;
  let duelFall = null;
  if (last && !pair) for (const e of [last.spino, last.stego, last.apato, last.a, last.b]) if (e && (e.dead || !(e.hp > 0))) duelFall = e.noRewards ? "beast" : "wayfarer";
  memo.duelPair = pair;
  const cp = save.activeCheckpoint, home = save.hometowns?.home || "0,0";
  return {
    context: musicContext(game), chapter: journeyChapter(save), paused: !!game?.paused,
    engaged, near, foeHp, playerHp: Number(p.hp) || 0, dead: !(Number(p.hp) > 0) || !!game?.fallen,
    boss: boss ? { id: String(boss.id ?? ""), kind: bossKey(boss), ...(boss.mothChrysalis ? { quiet: true } : {}) } : null, bossDefeated,
    duel: !!pair, duelFall,
    checkpoint: cp ? `${cp.rx},${cp.ry},${cp.x},${cp.y}` : null,
    region: game?.area === "overworld" ? (game.farRealm?.type ? `far:${game.farRealm.type}` : game.map?.landscape?.biome || null) : null,
    atHome: game?.area === "overworld" && `${game.rx},${game.ry}` === home,
  };
}

export class MusicDirector {
  constructor({ seed = 11, calmOnly = false, songs = SONGS, selection = MUSIC_SELECTION, bossThemes = BOSS_THEMES } = {}) {
    this.rand = seededRandom(seed); this.calmOnly = calmOnly; this.songs = songs; this.selection = selection; this.bossThemes = bossThemes;
    this.songId = null; this.previous = null; this.since = 0; this.dwell = this.nextDwell();
    this.intensity = 0; this.lastHot = -Infinity; this.lastHurt = -Infinity; this.lastHit = -Infinity; this.lastTime = null;
    this.last = null; this.bossId = null; this.bossQuiet = false; this.bossSeen = -Infinity; this.cool = {}; this.context = null; this.chapter = null;
    this.duel = "off"; this.duelSince = -Infinity; this.duelSeen = -Infinity;
  }
  nextDwell() { const [a, b] = DIRECTOR.dwell; return a + (b - a) * this.rand(); }
  ready(kind, now) { const c = DIRECTOR.cooldowns[kind] ?? 0; if (this.cool[kind] != null && (c === Infinity || now - this.cool[kind] < c)) return false; this.cool[kind] = now; return true; }
  pick(context, chapter, exclude) {
    const list = songsFor(context, chapter, this.selection).filter((s) => this.songs[s.id]);
    const others = list.filter((s) => s.id !== exclude);
    if (!others.length) return list[0]?.id || exclude;
    const total = others.reduce((n, s) => n + s.weight, 0); let r = this.rand() * total;
    for (const s of others) { r -= s.weight; if (r <= 0) return s.id; }
    return others[0].id;
  }
  choose(id, now, change) { if (id && id !== this.songId) { this.previous = this.songId; this.songId = id; this.since = now; this.dwell = this.nextDwell(); this.change = change; } }
  // snap: from sampleMusic (or a test). now: seconds. Returns { songId, intensity, change, stingers }.
  update(snap, now) {
    const D = DIRECTOR, dt = this.lastTime == null ? 0 : Math.max(0, Math.min(1, now - this.lastTime)), prev = this.last, stingers = [];
    this.lastTime = now;
    // Combat signals: damage taken, damage dealt, foes engaged and near.
    if (prev && !snap.dead && snap.playerHp < prev.playerHp) this.lastHurt = now;
    if (prev && snap.foeHp < prev.foeHp && snap.engaged > 0) this.lastHit = now;
    if (prev && snap.engaged < prev.engaged && prev.engaged > 0) this.lastHit = now;
    const W = D.weights;
    let target = snap.engaged * W.engaged + snap.near * W.near + (now - this.lastHurt < D.hurtHold ? W.hurt : 0) + (now - this.lastHit < D.hitHold ? W.hit : 0);
    if (snap.dead) target = 0;
    target = Math.min(1, target);
    if (target >= this.intensity) { this.intensity = Math.min(target, this.intensity + D.rise * dt); this.lastHot = now; }
    else if (now - this.lastHot > D.hold || snap.dead) this.intensity = Math.max(target, this.intensity - D.decay * dt);
    if (this.calmOnly) this.intensity = 0;
    // The dino duel (DUEL): off -> lead (the music fading) -> on -> tail (`linger` s after the pair parts) -> off; a kill by the
    // Wayfarer ends it at once, with the victory beat.
    const raw = !!snap.duel; let duelEnded = false;
    if (raw) this.duelSeen = now;
    if (this.duel === "off") { if (raw) { this.duel = "lead"; this.duelSince = now; } }
    else if (snap.duelFall === "wayfarer" || (!raw && now - this.duelSeen >= DUEL.linger)) { this.duel = "off"; duelEnded = true; }
    else if (!raw) this.duel = "tail";
    else if (this.duel === "tail" || now - this.duelSince >= DUEL.leadIn) this.duel = "on";
    const dueling = this.duel !== "off";
    if (duelEnded && snap.duelFall === "wayfarer" && !snap.bossDefeated) stingers.push("victory");
    // Bosses (never while the dinosaurs duel: their theme waits until it is over).
    if (snap.boss && !dueling) {
      // A quiet boss (the chrysalis) wakes no beast beat; what hatches from it does.
      const quiet = !!snap.boss.quiet;
      if (!quiet && this.bossId !== snap.boss.id && (this.bossQuiet || now - this.bossSeen > D.bossLinger) && this.ready("beast", now)) stingers.push("beast");
      this.bossId = snap.boss.id; this.bossQuiet = quiet; this.bossSeen = now;
      this.choose(bossSongFor(snap.boss.kind, this.bossThemes, this.songs), now, "boss");
    }
    if (snap.bossDefeated) { stingers.push("victory"); this.bossSeen = -Infinity; }
    const bossOn = !dueling && (snap.boss || now - this.bossSeen < D.bossLinger);
    // Places and chapters.
    if (!bossOn) {
      this.bossId = null; this.bossQuiet = false;
      const wasBoss = this.songs[this.songId]?.boss, moved = snap.context !== this.context, turned = snap.chapter !== this.chapter;
      const list = songsFor(snap.context, snap.chapter, this.selection).map((s) => s.id);
      if (!this.songId || wasBoss || moved) {
        // After a boss, the song from before it picks up again if the place still suits it.
        if (wasBoss || !list.includes(this.songId)) this.choose(wasBoss && list.includes(this.previous) ? this.previous : list.find((id) => id !== this.songId) || list[0], now, "context");
      } else if (turned && this.chapter != null && list[0] !== this.songId) this.choose(list[0], now, "chapter");
      else if (now - this.since > this.dwell && this.intensity < .2) this.choose(this.pick(snap.context, snap.chapter, this.songId), now, "rotate");
    }
    // Story beats.
    if (prev) {
      if (snap.dead && !prev.dead) stingers.push("death");
      if (dueling) { /* no story beat but death over the duel */ }
      else if (snap.checkpoint && prev.checkpoint !== snap.checkpoint && !snap.dead && this.ready("rest", now)) stingers.push("rest");
      if (dueling) { /* nor a departure or a region */ }
      else if (prev.atHome && !snap.atHome && snap.chapter === 1 && this.ready("departure", now)) stingers.push("departure");
      else if (snap.region && prev.region && snap.region !== prev.region && !bossOn && this.intensity < .3 && this.ready("region", now)) stingers.push("region");
    }
    this.context = snap.context; this.chapter = snap.chapter; this.last = snap;
    // `hush`: the score's level (soundtrack.ts setHush), 0 while the dinosaurs duel.
    return { songId: this.songId, intensity: this.intensity, change: this.change || "context", stingers, duel: this.duel, hush: dueling ? 0 : 1 };
  }
}
// The HUD's now-playing label (Tim, 2026-11-27: "scroll the title of the track in the heads-up display when a new song comes
// up"). The engine's own events say when a song is actually heard: "start" (the first song, and again after a mute) and "switch"
// (a new song on a bar line). A song only counts as new when it differs from the last one counted, so a song looping, resuming
// after a mute or picking up again after nothing else played never shows twice. It is passed over (not shown later) while the
// music is muted or at volume 0, while the dinosaurs duel (the score is hushed), or with Options -> Audio -> Show track titles
// off; while the game is paused it waits and shows once play resumes. main.ts draws it: `seconds` on screen, the title sliding
// in from the right at `speed` px/s, holding, then sliding out; `fade` s in and out. With Reduce motion it never moves.
export const NOW_PLAYING = { seconds: 8, minSeconds: 5, fade: .6, speed: 42 };
// memo: { shown, pending } kept by the caller. state: { muted, level (the music's level, 0 is silent), enabled, duel (DIRECTOR
// duel state), paused }. event: a soundtrack.ts event, or null to check a waiting title. Returns { id, title } to show, or null.
export function nowPlayingCue(memo, state = {}, event = null, songs = SONGS) {
  const id = event?.type === "start" ? event.songId : event?.type === "switch" ? event.to : null;
  if (id && songs[id] && id !== memo.shown) { memo.shown = id; memo.pending = id; }
  if (!memo.pending) return null;
  if (state.muted || !(Number(state.level) > 0) || state.enabled === false || (state.duel && state.duel !== "off")) { memo.pending = null; return null; }
  if (state.paused) return null;
  const song = songs[memo.pending]; memo.pending = null;
  return song ? { id: song.id, title: song.name } : null;
}
// How long the label stays up for a title `width` px wide in a window `room` px wide: long enough to slide the whole title past.
export function nowPlayingSeconds(width, room, reduceMotion = false, N = NOW_PLAYING) {
  if (reduceMotion) return N.seconds;
  return Math.max(N.minSeconds, Math.min(14, (Math.max(0, room) + Math.max(0, width)) / N.speed + 2.5));
}
export { MUSIC_CONTEXTS };
