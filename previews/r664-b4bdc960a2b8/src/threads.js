// Threads (release 627; docs/narrative-bible.md section 6, "stories across several dungeons"; Tim: "keep weaving multi-crossing
// quests like the Seven Bells and the Surveyor's Chain through the world; Tim loves them"). Ten more threads, written in one
// sitting (Tim, 2026-10-31: "do your narrative passes... 10 sets... condense them into today"). Each thread is a handful of
// pieces scattered through ordinary crossings of its own band of the map; any crossing of that band that holds the thread offers
// the next piece not yet found, so no piece is ever stranded in one crossing (the rule the Torn Pages keep). A crossing where a
// piece was found keeps it, read. When the last piece of a thread is found, its ending is written in the Journal and the Reciter's
// Tome keeps the thread as a book. A crossing holds at most one thread piece (`chance`, by seed; `minDepth` from the Refuge).
// All writing is original to the game. Pure rules: no DOM. Save: save.lore.threads = { threadId: [dungeonId, ...] } (additive,
// normalised by ensureThreadState).
import { hashSeed } from "./random.js?v=r664-b4bdc960a2b8";
import { READING_BANDS } from "./lore.js?v=r664-b4bdc960a2b8";

export const THREAD_RULES = { chance: .07, minDepth: 3 };
// band: which stretch of the map holds the thread, as a distance from the Refuge (THREAD_BANDS; they overlap, so a crossing may
// hold one of two bands' threads and even the nearest band has crossings enough). relic: how the piece is drawn (renderer.ts
// drawThreadRelic). Pieces are found in order.
export const THREAD_BANDS = { near: [3, READING_BANDS.middle], middle: [READING_BANDS.campaign + 1, READING_BANDS.far], far: [READING_BANDS.middle + 1, 70], deep: [READING_BANDS.far + 1, Infinity] };
export const THREADS = {
  lamplighter: { title: "The Lamplighter's Round", band: "near", relic: "lamp", colour: "#ffcf7a",
    pieces: [
      "An iron lamp on a hook where no wall is. The wick is trimmed. A card tied to the handle says: \"Round begins here. Light them in order. Someone is coming home late.\"",
      "A second lamp. Its glass is clean, though nothing here is clean. The card says: \"Second of the round. Don't hurry. Nobody who hurries has ever been the one who was waited for.\"",
      "A third lamp, the oil fresh. The card: \"He said he would come by the low road. I keep the low road lit. It is a long road and I am not young.\"",
      "A fourth lamp, its hook bent by a hand that leaned on it. The card: \"Twenty years. The lamps do not mind. Lamps are the patientest things that were ever made.\"",
      "A fifth lamp, and the card is blank on one side. On the other, in another hand: \"I came by the high road. Nobody told me there was a low one.\"",
      "The last lamp. When it takes the flame, every lamp behind you on the round answers it, far off, one after another, like a word passed down a line of people standing in the dark.",
    ],
    ending: "The round is lit end to end. Somewhere at the start of it, an old woman who is only a shape now sets down her taper and sits. She is not waiting any more. She is watching someone come down a road that is finally bright enough to see. The Corridor does not say whether it is him. It lets you walk the round once more, in the light, before the lamps go out one at a time behind you." },
  letters: { title: "Letters Not Sent", band: "near", relic: "letter", colour: "#e8dcc0",
    pieces: [
      "A letter, folded small, never sealed. \"Dear one. The well is dry again and the boy has your way of standing with his hands behind him. I will not write about the war because you are in it and I am not.\"",
      "A second letter, the same hand. \"I have started sending these into the Corridor. The postman said there is no road to where you are. I said there is a road to everywhere if you are patient with it.\"",
      "A third. \"The boy asked what you look like. I could not remember your left hand. I remember your right one perfectly. I am frightened of how much of you I am keeping by only one hand.\"",
      "A fourth, the ink thin. \"If you are reading this you are not you. Forgive me. Whoever you are, eat something. Sit down. You walk like someone who has been walking a long time.\"",
      "A fifth, unfinished. \"The boy is grown. He writes to you now too. Neither of us knows where the letters go. We agreed it is better than knowing where they don't.\"",
      "The last letter has no name on it at all, and it is addressed, in a careful hand, to \"the one who keeps finding these.\"",
    ],
    ending: "\"To the one who keeps finding these. We know you are not him. We have known for a while; the Corridor is not a postman. But someone has been carrying our letters from place to place, and that is more than a road ever did for us. So these are yours now. When you are tired, read one. It will say: sit down. Eat something. Someone, somewhere, hoped you would come home.\"" },
  choir: { title: "The Choir of Stones", band: "middle", relic: "stone", colour: "#b8c4d8",
    pieces: [
      "A grey stone, chest-high, with a hole bored through it. When the air moves it hums one low note, and goes on humming after the air is still.",
      "A second singing stone, a third above the first. The two notes find each other across the crossings, faintly, the way two people hum the same song in different rooms.",
      "A third stone, a fifth above. Moss grows only on the side that faces the others, as if it, too, is listening.",
      "A fourth stone. Someone has scratched a name into it and then scratched the name out. The note it sings is a little flat, as if it is the one thing here that remembers what the name was.",
      "A fifth stone, high and thin-voiced. Standing beside it you can hear all five at once, and for a moment the chord almost resolves.",
      "The sixth stone, the root of the chord, was buried. You clear the soil from its mouth and it begins.",
    ],
    ending: "All six stones sing together and the chord resolves. It is a lullaby, very old, in a language that no one alive has spoken; it was sung, once, in a hill village to a child who was afraid of the dark, and the child grew up and grew old and died, and the song outlived them all by being cut into stone. The Corridor keeps it. Some nights, if you are quiet in a crossing, you will hear it again, and something in you that was afraid of the dark will lie down." },
  clockmaker: { title: "The Clockmaker's Hours", band: "middle", relic: "clock", colour: "#d8b87a",
    pieces: [
      "A stopped pocket-watch on a chain, its hands at one o'clock. Engraved inside the lid: \"For the hour you were born.\"",
      "A second watch, stopped at three. Inside the lid: \"For the hour you first walked to the end of the lane alone.\"",
      "A third, stopped at six. \"For the hour you left home. I wound this one for a month after, out of habit, and then I stopped.\"",
      "A fourth, stopped at nine. \"For the hour the letter came. I do not want to say more. A clock should only keep time, not what happened in it.\"",
      "A fifth, stopped at eleven. \"For the hour I understood I had been making these for you all along, and not for the customers.\"",
      "The last watch is still running. Its lid says only: \"For an hour I have not seen yet.\"",
    ],
    ending: "Six watches stopped at six hours of somebody's life, and one still ticking. The clockmaker made them, one by one, for a child who went into the Corridor and was not read again. The last watch, the running one, is set to no hour of the child's life at all. It is set to yours. It is not counting down. It is only keeping you company, the way a clock in an empty house keeps the house company." },
  ferry: { title: "The Ferryman's Fares", band: "middle", relic: "coin", colour: "#c9a24a",
    pieces: [
      "A worn coin set on a flat stone, as if left for someone. Stamped on it, very small: a boat, and a hand holding an oar.",
      "A second coin, the same stamp. Under it, a scrap: \"He would not take my fare. He said I had crossed before. I have never crossed anything.\"",
      "A third coin. \"He keeps a list, he says. He showed me the river. I asked again. He showed me again. I have been sitting here a long while, thinking about it.\"",
      "A fourth coin, scratched smooth from being turned in a pocket. \"I think the river is the list. I think everyone who ever crossed it is still in it, somewhere, a little.\"",
      "A fifth coin, and beside it a child's drawing of a man in a boat, waving.",
      "The sixth fare is not a coin. It is a button, the kind that comes off a coat in a hurry. Someone paid with what they had.",
    ],
    ending: "Six fares, never taken. The ferryman of the river that remembers does not charge anyone who has crossed before, and it turns out that everyone has; the river is old and every life touches it once. You were never asked to pay. You only carried the fares the others left, so that someone, at last, would notice they had tried." },
  moth: { title: "The Moth Saint", band: "far", relic: "moth", colour: "#d6cfe8",
    pieces: [
      "A dead moth the size of a hand, wings folded, laid on a square of cloth as carefully as a relic. The dust of its wings has made a faint picture on the cloth: a face.",
      "A second moth on a second cloth. The face in the dust is the same face, a little older.",
      "A third. The face is turned away now, toward something bright out of the picture.",
      "A fourth. The face is half gone, worn into light, as if it has been looking at the bright thing for a very long time.",
      "A fifth cloth, and no moth. The dust on it is only a shape of wings, open, and in the middle, nothing.",
      "The last moth is alive. It rises from the cloth, circles you once, and goes up toward a light you cannot see.",
    ],
    ending: "In the far reaches someone made a saint of a moth: not for anything it did, but for wanting the light so much it was willing to be undone by it. The faces on the cloths are the one who kept the shrine, wearing away year by year into the same wanting. The Corridor does not say whether this is holy or terrible. Out here, at the edge of what it remembers of being human, it has begun to forget the difference." },
  library: { title: "The Drowned Library", band: "far", relic: "book", colour: "#7fb3c8",
    pieces: [
      "A book swollen with water, its pages fused. On the one page you can part: a catalogue number, and a single line, \"The thin places came up through the floor in the night.\"",
      "A second drowned book. \"We moved the histories upstairs. Then the poetry. The water does not seem to want the histories. It goes for the poems first.\"",
      "A third. \"The librarian will not leave. She says a book is a place the Corridor is a little thicker, and that we are standing on the last of the thick places.\"",
      "A fourth. \"Today the water read to us. I do not know how else to say it. It rose to the shelf of ballads and the room was full of voices that were not ours.\"",
      "A fifth, nearly dry. \"She has gone into the water to fetch the ballads back. She is a strong swimmer. She has been gone since morning.\"",
      "The last book is perfectly dry, and blank, and someone has written on the flyleaf: \"Shelved.\"",
    ],
    ending: "The library is under the thin places now, where the Corridor runs fluid and holds no shape for long. The librarian did not drown. She is shelved: one more voice among the ballads the water reads aloud on nights when no one is there to hear it. If the dungeon water ever seems to be saying something, it is. It is reading. It has always been reading." },
  orchard: { title: "Seeds for an Orchard", band: "far", relic: "seed", colour: "#9cc46a",
    pieces: [
      "A paper twist of seeds tucked into a crack. Pencilled on it: \"Apple. Bitter. Plant where the trenches were.\"",
      "A second twist. \"Pear. For the field where the guns stood. Pears are slow. That is the point.\"",
      "A third. \"Plum. For the road the soldiers came home by, though fewer came home than went.\"",
      "A fourth, damp, already sprouting a white thread of root. \"Cherry. Plant it anywhere a child will find it.\"",
      "A fifth. \"Walnut. Plant it for someone who isn't born yet. You will not eat from it. Plant it anyway.\"",
      "The last twist is empty except for a note: \"I have planted the last of them. Carry the papers instead. Someone should remember there was a war before there was an orchard.\"",
    ],
    ending: "An orchard stands somewhere in the second campaign's country, on ground that was a battlefield, and the children who eat its bitter apples do not know why they are bitter. That is what peace is: forgetting on purpose, so that there can be apples. You carry the seed papers. Someone should remember. It might as well be the one the Corridor cannot hold on any page." },
  cartographer: { title: "The Second Surveyor", band: "deep", relic: "compass", colour: "#9fd4c0",
    pieces: [
      "A brass compass whose needle points not north but down, into the ground. Scratched on the case: \"M. C., after A. C.\"",
      "A second compass, pointing sideways, out of the world. A note folded under it: \"Father's chain measured the Corridor across. I mean to measure it down.\"",
      "A third. The needle spins slowly and does not stop. \"There is no bottom. There is only further. I have stopped writing depths and started writing what it feels like.\"",
      "A fourth. \"It feels like being read by something that does not know how to read yet. It goes over the same line again and again.\"",
      "A fifth compass, its glass cracked from the inside. \"I think it is learning. I think we are the alphabet.\"",
      "The last compass points at you.",
    ],
    ending: "Abel Corwin's daughter took her father's work further than he dared: not across the Corridor but down, into where it stops being made of anything human. Her compasses are the record. Each one points at what was most real where she stood: the ground, then out of the world, then nowhere, then at the Wayfarer. She is not lost. She is where her last needle points, which is the same place yours does." },
  sleeper: { title: "What the Sleeper Dreams", band: "deep", relic: "shell", colour: "#e0b8d8",
    pieces: [
      "A spiral shell, pale pink, too large for any sea you know. Held to the ear, it does not sound like the sea. It sounds like breathing, very slow.",
      "A second shell. In this one the breathing catches, the way a sleeper's does at the edge of a dream.",
      "A third. Words now, too slow to follow: one syllable every few heartbeats, in no language.",
      "A fourth shell. The syllables have become a name. It is not your name. You recognise it anyway, the way you recognise your own face in a stranger's child.",
      "A fifth. The breathing has quickened. Whatever sleeps is close to waking, and it is dreaming about a road.",
      "The last shell is silent, and warm, as if a moment ago someone was holding it to their ear from the other side.",
    ],
    ending: "Something very large sleeps under the Far Sleep, and it dreams, and the Corridor is one of the things it dreams. The shells are where its breathing comes up. Lately it has been dreaming about a road, and someone walking it who no one ever read. It has not woken. If it does, the Corridor may end, or it may only be remembered properly, at last, by the one who dreamed it." },
};
export const THREAD_ORDER = Object.keys(THREADS);
const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
export const inBand = (band, rx, ry) => { const d = Math.abs(rx) + Math.abs(ry), [lo, hi] = THREAD_BANDS[band]; return d >= lo && d <= hi; };
// Which thread this crossing holds, or null: one roll for whether it holds any, one for which of its band's threads.
export function threadIn(seed, dungeonId) {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m) return null;
  const rx = Number(m[1]), ry = Number(m[2]); if (Math.abs(rx) + Math.abs(ry) < THREAD_RULES.minDepth) return null;
  if ((hashSeed(`${seed}:threads:v1:${dungeonId}`) % 10000) / 10000 >= THREAD_RULES.chance) return null;
  const here = THREAD_ORDER.filter((id) => inBand(THREADS[id].band, rx, ry)); if (!here.length) return null;
  return here[hashSeed(`${seed}:threads:which:v1:${dungeonId}`) % here.length];
}
export function ensureThreadState(save) {
  const lore = (save.lore ||= {});
  if (lore.threads !== undefined) { const out = {}; const raw = lore.threads && typeof lore.threads === "object" ? lore.threads : {};
    for (const id of THREAD_ORDER) if (Array.isArray(raw[id])) out[id] = raw[id].filter((d) => typeof d === "string").slice(0, THREADS[id].pieces.length);
    lore.threads = out; }
  return save;
}
export const threadFound = (save, id) => { const t = save?.lore?.threads?.[id]; return Array.isArray(t) ? t : []; };
export const threadsDone = (save) => THREAD_ORDER.filter((id) => threadFound(save, id).length >= THREADS[id].pieces.length);
export const threadsStarted = (save) => THREAD_ORDER.filter((id) => threadFound(save, id).length > 0);
// Lays the crossing's piece on open floor away from the entry: the piece found here (read), or the next one not yet found
// (waiting); nothing when the thread is complete and none was found here.
export function addThreadRelic(map, save, dungeonId) {
  if (!map?.tiles?.length || map.multiLevel || map.arena || map.underwater || map.objects?.some((o) => o.kind === "threadRelic")) return null;
  const id = threadIn(save?.seed, dungeonId); if (!id) return null;
  const T = THREADS[id], found = threadFound(save, id), here = found.indexOf(dungeonId), index = here >= 0 ? here : found.length; if (index >= T.pieces.length) return null;
  const w = map.width || 24, entry = map.entry || { x: 4, y: 5 }, taken = new Set((map.objects || []).map((o) => `${Math.round(o.x)},${Math.round(o.y)}`));
  const open = map.tiles.filter((t) => !t.blocked && !t.environment && !t.structure && !t.chasm && t.x > 1 && t.y > 1 && t.x < w - 2 && Math.hypot(t.x - entry.x, t.y - entry.y) >= 6 && !taken.has(`${t.x},${t.y}`) && !/water|lava|pit|chasm|canyon|void|Gate/i.test(String(t.kind)));
  if (!open.length) return null;
  const at = open[hashSeed(`${save.seed}:threads-at:v1:${dungeonId}`) % open.length], read = here >= 0;
  const o = { id: `thread-${id}`, kind: "threadRelic", thread: id, index, relic: T.relic, colour: T.colour, name: `${T.title}${read ? ", read" : ""}`, x: at.x, y: at.y, dungeonId, state: read ? "read" : "waiting", actions: ["read"] };
  (map.objects ||= []).push(o); return o;
}
// Reading it. Returns { ok, first, done, title, text, ending, message }.
export function readThreadRelic(save, o) {
  const T = THREADS[o?.thread]; if (!T) return { ok: false, message: "There is nothing here to read." };
  save.lore ||= {}; if (save.lore.threads === undefined) save.lore.threads = {}; ensureThreadState(save);
  const list = (save.lore.threads[o.thread] ||= []); let at = list.indexOf(o.dungeonId), first = false;
  if (at < 0) { at = list.length; if (at >= T.pieces.length) return { ok: false, message: "The thread is complete." }; list.push(o.dungeonId || ""); first = true; }
  o.state = "read"; o.index = at; o.name = `${T.title}, read`;
  const text = T.pieces[at], done = first && list.length >= T.pieces.length, n = list.length;
  return { ok: true, first, done, title: T.title, text, ending: T.ending, message: `${T.title}. ${text}${first ? (done ? ` ${T.ending}` : ` (${n} of ${T.pieces.length}.)`) : ""}` };
}
