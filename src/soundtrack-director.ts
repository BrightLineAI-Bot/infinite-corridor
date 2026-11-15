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
  cooldowns: { region: 90, beast: 45, rest: 20, departure: Infinity },
};
// Chapters of the journey, from progress the save already holds. The first matching row, from the top, wins.
export const CHAPTERS = [
  { chapter: 4, name: "Revelation", farRealm: true, tier: 5, slain: 4 },
  { chapter: 3, name: "Rising", pentagon: true, tier: 3, slain: 2 },
  { chapter: 2, name: "Wandering", tier: 1, slain: 1 },
  { chapter: 1, name: "Departure" },
];
// Each world boss's own theme (Phase 2, Tim 2026-11-14): bossKey -> a song id in SONGS with boss: true (soundtrack-songs.ts,
// LINER_NOTES tells each one's story). Keys are world beast ids (WORLD_BEASTS) or, for bosses that are not world beasts,
// creature kinds; "kind:variant" is a form a beast turns into mid-fight. Any other boss plays the shared "boss" track.
export const BOSS_THEMES = {
  ashenMoth: "cinderWings", mothChrysalis: "cinderSleep",
  briarStag: "briarHunt", crimsonTyrant: "crimsonCrown", doomChaser: "longPursuit", lightningGiant: "thunderEngine",
  morphingBlob: "shapeless", mountainTurtle: "mountainWalks", nanobotKnight: "clockworkOath", psychicCrystal: "glassMind",
  tremorWorm: "underTheFloor", voidWalker: "walkerBetween", wildStego: "fernsAndPlates",
  spinoRex: "riverStalker", "spinoRex:fossil": "bonesHunt",
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
    const bossLike = e.boss || e.worldBeast || e.questingBeast || e.gatePredator || e.mothChrysalis;
    const fought = e.aggro || e.pentArenaAwake || (D.seaBosses.includes(e.seaKind) && d < D.seaRange);
    if (bossLike && fought && d < D.bossRange && d < bossD) { boss = e; bossD = d; }
    if (e.aggro && d < D.engagedRange) { engaged++; foeHp += Number(e.hp) || 0; }
    else if (d < D.nearRange) near++;
  }
  // A boss being fought that is now dead (still in the list, or its hp gone) is a fall; one that left the list is not. A broken
  // chrysalis is a hatching, and one Revenant of a hunt is not the hunt: neither is a victory.
  let bossDefeated = false;
  const was = memo.boss;
  if (was && was !== boss && (was.dead || !(was.hp > 0)) && (game?.enemies || []).includes(was) && !was.mothChrysalis && !was.gatePredator) bossDefeated = true;
  memo.boss = boss;
  const cp = save.activeCheckpoint, home = save.hometowns?.home || "0,0";
  return {
    context: musicContext(game), chapter: journeyChapter(save), paused: !!game?.paused,
    engaged, near, foeHp, playerHp: Number(p.hp) || 0, dead: !(Number(p.hp) > 0) || !!game?.fallen,
    boss: boss ? { id: String(boss.id ?? ""), kind: bossKey(boss), ...(boss.mothChrysalis ? { quiet: true } : {}) } : null, bossDefeated,
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
    // Bosses.
    if (snap.boss) {
      // A quiet boss (the chrysalis) wakes no beast beat; what hatches from it does.
      const quiet = !!snap.boss.quiet;
      if (!quiet && this.bossId !== snap.boss.id && (this.bossQuiet || now - this.bossSeen > D.bossLinger) && this.ready("beast", now)) stingers.push("beast");
      this.bossId = snap.boss.id; this.bossQuiet = quiet; this.bossSeen = now;
      this.choose(bossSongFor(snap.boss.kind, this.bossThemes, this.songs), now, "boss");
    }
    if (snap.bossDefeated) { stingers.push("victory"); this.bossSeen = -Infinity; }
    const bossOn = snap.boss || now - this.bossSeen < D.bossLinger;
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
      if (snap.checkpoint && prev.checkpoint !== snap.checkpoint && !snap.dead && this.ready("rest", now)) stingers.push("rest");
      if (prev.atHome && !snap.atHome && snap.chapter === 1 && this.ready("departure", now)) stingers.push("departure");
      else if (snap.region && prev.region && snap.region !== prev.region && !bossOn && this.intensity < .3 && this.ready("region", now)) stingers.push("region");
    }
    this.context = snap.context; this.chapter = snap.chapter; this.last = snap;
    return { songId: this.songId, intensity: this.intensity, change: this.change || "context", stingers };
  }
}
export { MUSIC_CONTEXTS };
