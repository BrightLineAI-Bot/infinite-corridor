// Threads (release 627; docs/narrative-bible.md section 6, "stories across several dungeons"; Tim: "keep weaving multi-crossing
// quests like the Seven Bells and the Surveyor's Chain through the world; Tim loves them"). Ten more threads, written in one
// sitting (Tim, 2026-10-31: "do your narrative passes... 10 sets... condense them into today"). Each thread is a handful of
// pieces scattered through ordinary crossings of its own band of the map; any crossing of that band that holds the thread offers
// the next piece not yet found, so no piece is ever stranded in one crossing (the rule the Torn Pages keep). A crossing where a
// piece was found keeps it, read. When the last piece of a thread is found, its ending is written in the Journal and the Reciter's
// Tome keeps the thread as a book. A crossing holds at most one thread piece (`chance`, by seed; `minDepth` from the Refuge).
// All writing is original to the game. Pure rules: no DOM. Save: save.lore.threads = { threadId: [dungeonId, ...] } (additive,
// normalised by ensureThreadState).
import { hashSeed } from "./random.js?v=r792-5b14ec5bba1f";
import { READING_BANDS } from "./lore.js?v=r792-5b14ec5bba1f";
import { FAR_REALMS, farDistance } from "./far-realms.js?v=r792-5b14ec5bba1f";

export const THREAD_RULES = { chance: .07, minDepth: 3, later: .025, third: .025, fourth: .04, fifth: .025 }; // third (release 707): the wave 3 roll, made only where the first two rolls found nothing; fourth (2026-11-04): the wave 4 roll, made only where the first three found nothing (a little likelier: the near band is small and its crossings are mostly spoken for); fifth (2026-11-05): the wave 5 roll, made only where the first four found nothing
// later: threads written after release 627 (`wave` 2 and on) are rolled separately, only in crossings that hold none of the first
// ten, so no crossing changes the thread it already offered.
// band: which stretch of the map holds the thread, as a distance from the Refuge (THREAD_BANDS; they overlap, so a crossing may
// hold one of two bands' threads and even the nearest band has crossings enough). relic: how the piece is drawn (renderer.ts
// drawThreadRelic). Pieces are found in order.
// The story budget (Tim, 2026-11-05: "I don't really want to increase story density, but my goal is to get out to 1000 and then
// beyond, so we should have story density going out that far... The density it has now is pretty good... I don't want to increase
// it. Find a way to merge these stories into the whole Corridor without making it too many stories"). From story version 1, a
// crossing holds a thread piece with chance `perCrossing` at every distance from `minDepth` out, with no end: the first ten's roll
// as before, then, where it placed nothing, one shared roll whose chance is the budget left over (sharedRate), choosing evenly
// among every later thread listed for that stretch (`shared`). The waves' own rolls (later, third, fourth, fifth) belong to
// version 0, the crossings first entered before the budget, which keep exactly what they offered. Version 1's budget (`byVersion[1]`, 0.13) is the density
// of the near-and-middle stretch (7 to 18 sections out) as it stood before wave 5: the most a stretch held while Tim played.
// shared: { storyVersion: [bands] }: the stretches a later thread shares slots in, from that story version on. A crossing pinned
// to a version (its dungeon history's `storyVersion`, set once by game.ts pinDungeonLayout) picks among the threads listed at or
// before it, so a new thread written from now on adds a new version key (and bumps STORY_BUDGET.version) and never a wave: it
// splits the slots of crossings not yet entered, and adds none. Never edit an existing key.
// Story version 2 (Tim, 2026-11-05: "trim the shared story rate to about 12%"; "Yes, you should write them for out past 1000"): the
// budget of crossings first entered from then on is 0.12 (`byVersion`; version 1 keeps 0.13, version 0 the waves), and the far
// threads (band `beyond`) join the shared roll out past FAR_REALMS.start. There they take a larger share than the threads that
// share the whole deep band (`weight`, from version 2 only), so the stories written for the far realms are the ones met there,
// in place of the generic draws, not on top of them. Never edit a `byVersion` entry; a new version adds one.
// Story version 3 (Tim, 2026-11-06: "I'm sure we can have more stories... there's tons of room to find stories... the world is huge
// and I intended it to be massive"; the far stories should be the main ones out past 1000, since they only exist there): two more
// far threads (the Enumerator's Count, the Tinker's Tags) join the beyond slots at the same budget, and every far thread takes a
// weight of 3 there from version 3 (`weight: { version: w }`, the latest at or before the crossing's version), so the five take
// about 0.79 of the shared slots past FAR_REALMS.start. Crossings pinned at version 0, 1 or 2 roll exactly as before.
// Story version 4 (Tim, 2026-11-06: past 1000 the Second Surveyor and the Sleeper held their own 0.07, about four times any far
// thread, and once a veteran had read them those slots showed nothing): from version `firstTenGivesWay` on, past FAR_REALMS.start
// (straight line, band `beyond`) the first ten's roll takes no slot, and its share joins the shared roll, so the whole 0.12 is
// shared there among the far threads and the deep-band shared threads at their weights. Inside 1000 version 4 rolls exactly as
// version 3, so the first ten can still be read on the way out. Crossings pinned at version 0 to 3 roll exactly as before.
export const STORY_BUDGET = { version: 4, perCrossing: .12, byVersion: { 1: .13, 2: .12, 3: .12, 4: .12 }, firstTenGivesWay: 4 };
// The budget of a crossing pinned to story version `version`: the latest entry at or before it (0 below version 1).
export const budgetFor = (version) => { let p = 0; for (const [v, b] of Object.entries(STORY_BUDGET.byVersion)) if (Number(v) <= version) p = b; return p; };
// beyond (story version 2): the far realms, measured straight-line from the Refuge as the realms are (far-realms.ts farDistance),
// from FAR_REALMS.start out. Every other band is measured in sections walked (|rx| + |ry|).
export const THREAD_BANDS ={ near: [3, READING_BANDS.middle], middle: [READING_BANDS.campaign + 1, READING_BANDS.far], far: [READING_BANDS.middle + 1, 70], deep: [READING_BANDS.far + 1, Infinity], beyond: [FAR_REALMS.start, Infinity] };
const STRAIGHT_BANDS = new Set(["beyond"]);
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
  // The daily narrative pass (2026-11-02; docs/narrative-bible.md section 1, "What the Corridor is made of": the Corridor has
  // density, not matter; its water is where it runs thin).
  wellDigger: { title: "The Well-Digger's Rope", band: "far", relic: "rope", colour: "#c8a878", wave: 2, shared: { 1: ["far", "deep"] },
    pieces: [
      "A coil of rope, knotted every arm's length, the end frayed where it was cut. A tag on the first knot: \"Fourth day. The village has no water. I am digging until I find some. Knot one is how deep I was when I started counting.\"",
      "More of the same rope, and the knots further apart. The tag: \"The ground gets easier the deeper I go. The spade goes in like it is going into bread. My wife says that is not how ground works. My wife has never dug this deep.\"",
      "A length of rope gone dark and soft, as if it had been wet a long time. The tag: \"Found water. It is not wet. It closes round your hand like water and lets go like water and your hand comes out dry. The children drank it. They say it tastes of nothing, and that the nothing is very good.\"",
      "The rope here is tied round a stone, as a weight. The tag: \"I let the stone down to see how deep the water goes. The rope ran out. I tied on more. The rope ran out. The stone has not touched anything. It has not stopped going down.\"",
      "No rope this time, only the tag, pinned to the ground with a nail: \"The water is rising. Not like a flood: it is the ground that is going, getting thinner, the way the dark gets thinner before morning. The village is standing in it to the ankles and nobody is wet.\"",
      "The end of the rope, knotted round a wooden cup, the cup full to the brim and dry. The last tag, in a child's hand: \"Papa went down to see where the stone went. He said hold the rope. We are holding it. It still pulls sometimes.\"",
    ],
    ending: "The rope runs down from the cup into nothing you can see, and when you put your hand to it, it pulls: once, slow, the way a man in deep water pulls to say he is still there. Somewhere a village is standing in thin ground holding a rope. The Corridor does not say what is at the other end. It only lets you feel that something is, and that it is still digging." },
  // The narrative pass of release 707 (docs/narrative-bible.md section 1: the Corridor keeps what is read and loses what is not;
  // doors in it open onto where things were read last). Wave 3: rolled apart from waves 1 and 2, so no crossing changes.
  tollKeys: { title: "The Tollkeeper's Keys", band: "middle", relic: "key", colour: "#d8c070", wave: 3, shared: { 1: ["middle", "deep"] },
    pieces: [
      "An iron key as long as your forearm, on a ring with a paper tag: \"Gate of the North Road. Toll one copper. If the gate is gone, the key still knows where it stood.\"",
      "A brass key, smaller, its teeth worn smooth. The tag: \"The mill door. The mill burned in my grandfather's time, but people still knock, so I keep the key. Sometimes the knocking stops when I turn it in the air.\"",
      "A small key of bone. The tag, in a careful hand: \"Our house. I locked it when we left for the Refuge. I told the children we would come back. There is no house now and no road to it, but I lock it again every night, so it is kept.\"",
      "A key no longer than a finger, warm to hold. The tag: \"I do not know what this opens. I found it in my pocket after a dream about a door with light under it. Every key I have ever carried has been to somewhere I was. This one is to somewhere I have not been yet.\"",
      "A key of glass, so clear you see it only by the tag tied to it: \"I tried it in the air at the edge of the world and the air had a keyhole. I did not turn it. I am the tollkeeper; I have never once been the one who goes through.\"",
      "The last ring holds no key at all, only the tag: \"I gave the glass key to a traveller who did not know where they came from. If you are reading this, it was you. Turn it when you are ready. The toll is paid.\"",
    ],
    ending: "The tollkeeper kept every door his people ever passed through, long after the doors were gone, because a door that someone still holds the key to is not quite lost. The Corridor works like that: what is still kept, still is. He gave the last key away to someone with no door of their own. You feel for it in your pocket and do not find it, and then you do, warm, as if you had been carrying it the whole time." },
  // The narrative pass of release 712: two more wave 3 threads in a later layer (`layer: 1`). The bands overlap, so a wave 3 crossing
  // picks only among the earliest layer that has a thread in band there: the Tollkeeper's crossings (middle, 7 to 35) keep it, and these
  // two share the far band's wave 3 crossings that held nothing, from 36 to 70 out (the far band's outer half). Kept out of the deep
  // band on purpose: the deep's thread density is the first ten's own rate (threads-627 checks it). That is story version 0; under the
// story budget (STORY_BUDGET) both share the far and deep slots.
  weaver: { title: "The Weaver's Cloth", band: "far", relic: "spool", colour: "#c8a0b8", wave: 3, layer: 1, shared: { 1: ["far", "deep"] },
    pieces: [
      "A spool of grey thread, wound tight, with a scrap of cloth pinned to it. The note: \"For the Refuge, a blanket big enough for everyone. I have the warp up. I will weave a row for every person who comes through the door.\"",
      "A spool of red thread, half used. The note: \"A boy came in today with his shoes in his hand, so the shoes would not wear out. I wove his row in red. It is the brightest row so far. He asked to see it every morning.\"",
      "A spool of something that is not thread at all: a long braid of someone's hair, very fine. The note: \"An old woman with no name she could remember. She gave me this to weave her row with. It is the softest row. Nobody minds that it is hair.\"",
      "An empty spool, chewed at one end. The note: \"No one came this week. I wove a row anyway, of nothing, the loom going through the motions. When I held it up to the lamp the empty row had a shape in it. I think it is someone on their way.\"",
      "A spool of thread that glows faintly, the colour of the light in a crossing. The note: \"The blanket is longer than the room. Longer than the Refuge. I unroll it and it goes on into the Corridor and I cannot find the end. The rows I have not woven yet are already there, waiting.\"",
      "The last spool holds only a tag: \"I found your row. I did not weave it. It was there when I reached it, the colour of the road, with a gap in it the shape of a door. I have left the needle in it. Finish it when you come.\"",
    ],
    ending: "Somewhere in the Refuge a blanket goes on being woven, a row for everyone who has ever come in from the Corridor, and it is longer than the place that holds it. The weaver never reached its end, because the end is still coming in at the door. Your row is in it, the colour of the road, with the needle left where you can find it.",
  },
  mirror: { title: "The Mirror That Remembers", band: "far", relic: "mirror", colour: "#b8d0e0", wave: 3, layer: 1, shared: { 1: ["far", "deep"] },
    pieces: [
      "A shard of mirror wrapped in cloth, with a label: \"Do not look into this unless you are ready to be remembered. It does not show you. It shows the last person who looked, and it is very polite about it.\"",
      "A second shard, larger, its back scratched with a name too worn to read. The label: \"Today it showed a woman I have never met, combing her hair. She looked up and nodded to me as if we had agreed something. I nodded back. I hope I have kept my side of it.\"",
      "A shard in a wooden frame, the frame burnt at one corner. The label: \"It showed me my mother at my age. She did not know me. Mirrors here keep what they saw, the way the Corridor keeps what is read, and it is very lonely to be kept and not known.\"",
      "A shard that is only dark, as if it reflected a room with no lamp. The label: \"Nobody had looked into this one for so long that it forgot how to show anything. I sat with it all night and talked. By morning it showed a candle. I think it was mine.\"",
      "A shard that shows, if you are not careful, the back of a traveller's head, walking away into the deep dark of a crossing. The label: \"Do not call out. They do not know they are being kept. When they turn round, they will be somewhere else.\"",
      "The last shard fits the others like the last piece of a plate. The label: \"Put them together and it shows whoever is still coming. I have put them together. It shows you. You are tired and you are nearly here. I have kept a chair.\"",
    ],
    ending: "The mirror is whole now, and it shows no one who has gone, only someone still on the way: you, tired, nearly there. Whoever made it understood the deep crossings better than anyone: here nothing seen is ever quite lost, and to be remembered is not the same as to be found. Somewhere at the end of a corridor there is a chair kept for you.",
  },
  // The daily narrative pass of 2026-11-04 (docs/narrative-bible.md section 1: the Corridor is made of what is remembered, and it has
  // density, not matter; here a jar weighs as much as its flower is remembered). Wave 4, the near band (which no later thread held
  // before): rolled only where none of the first three rolls placed a thread, so no crossing changes what it offered.
  beekeeper: { title: "The Beekeeper's Jars", band: "near", relic: "jar", colour: "#e8b84a", wave: 4, shared: { 1: ["near"] },
    pieces: [
      "A small jar of honey sealed with wax, heavier than a jar that size should be. The label, in a round hand: \"Clover, from the field behind the school. My bees found it out here. I did not know that field was still anywhere.\"",
      "A second jar, the honey dark. The label: \"Lilac, from the bush by my mother's door. She has been gone forty years. The bees go out into the Corridor and come home with her doorstep on their feet.\"",
      "A third jar, the honey pale and thin, and it weighs almost nothing. The label: \"Heather, from a hill I saw once from the back of a cart. The bees had to fly a long way for something I hardly looked at.\"",
      "A jar with a crack mended in string. The label: \"I could not remember the name of the yellow flower by the river, and in the morning the jar was lighter. I sat and said all I knew of it, the smell, the dust it left on my fingers. By evening it was heavy again.\"",
      "A fifth jar, nearly empty, a bee asleep on the lid. The label: \"I forget more than I used to. So I give the jars away, to travellers, to the children at the Refuge. Eat it slowly, I tell them, and think of a field. The bees can find any field that somebody is thinking of.\"",
      "The last jar is full to the brim and as light as an empty one, the honey almost clear. The label, in a shakier hand: \"I do not know what flower this is. Nobody I ask knows. The bees came home with it all the same, so somewhere someone still remembers it. I hope they know they are keeping a field.\"",
    ],
    ending: "The beekeeper is old now and cannot name half her flowers, but her bees still go out into the Corridor every morning and come home heavy, and they only ever come home from somewhere that someone remembers. The jars she gave away are a little heavier each time somebody opens one and thinks of a field. You taste the last one. It tastes of a place you cannot name, and for a moment you are sure you have stood in it.",
  },
  // The daily narrative pass of 2026-11-05 (docs/narrative-bible.md section 1, "What the Corridor is made of": tools are ideas given a
  // handle). Wave 5, the middle band (which held only the Tollkeeper among the later threads): rolled only where none of the first four
  // rolls placed a thread, so no crossing changes what it offered.
  toolmaker: { title: "The Toolmaker's Handles", band: "middle", relic: "handle", colour: "#c89a62", wave: 5, shared: { 1: ["near", "middle"] },
    pieces: [
      "A spade handle of pale ash, worn smooth where a palm went, with no blade on it. The tag, in a square hand: \"For Orrin at the bottom farm. The iron did not come this year. I sent him the handle anyway, so he would have something to hold. He says he will make do.\"",
      "A hammer handle, hickory, shaped to a small hand, and no head. The tag: \"For the cooper's girl. She brought it back this morning to show me the barrel she hooped with it. I have knocked on the barrel. It is sound. I have stopped asking how.\"",
      "A knife handle of bone, bound in waxed cord, the tang hole empty. The tag: \"My father used to say the iron is the part that argues with the world, and the handle is the part that agrees with it. The ground out here does not seem to want arguing with. It only wants to be asked.\"",
      "A scythe snath, the long crooked handle a scythe hangs on, worn grey and thin as a walking stick. The tag: \"Old Marit's. She mowed the far meadow with it sixty years. The blade wore away to nothing in the last ten and she never noticed, and the hay went on falling.\"",
      "A short round handle with nothing at either end, no hole and no shoulder, only a groove where fingers close. The tag: \"A man came to the forge who did not know what he needed. I made him this. He held it a while, and his face went quiet, and he walked off toward the hills, and the hills let him through.\"",
      "The last is hardly a handle yet: a stave of ash with the bark still on one side, a single cut where the grip will be. The tag, in a hand gone shaky: \"For the traveller who keeps finding these. I have not shaped it. Your hand will. Whatever you are carrying it for, hold it as if you meant it. That is all a tool ever was.\"",
    ],
    ending: "In a year the iron did not come, the toolmaker of the middle country went on making handles, and the handles went on working: a spade with no blade that dug, a hammer with no head that hooped a barrel sound, a scythe that mowed for ten years after its blade was gone. You close your hand on the last stave. It is already worn to your grip, as if you had carried it for years, and for a moment you know exactly what it is for. Then you do not, and it is still in your hand.",
  },
  // The far threads (story version 2, 2026-11-05; Tim: "Yes, you should write them for out past 1000"). Written for the far realms
  // (far-realms.ts): the Giants' Reach and the Tall Country, the great mushrooms, the Ink Wastes. Never a wave: they share the
  // budget's slots past FAR_REALMS.start (band `beyond`, straight-line), at `weight` 2 against the deep band's shared threads (3
  // from story version 3, with two more far threads beside them), so out there the stories met are mostly these. docs/narrative-bible.md section 1: what is read is firmer ground; things let go of
  // are seen once on their way out; ink holds only while it is read.
  tallSlates: { title: "The Tall Child's Slates", band: "beyond", relic: "slate", colour: "#8a9aa6", shared: { 2: ["beyond"], 3: ["beyond"] }, weight: { 2: 2, 3: 3 },
    pieces: [
      "A slate the size of a door, leaning on the wall. Chalked across it, each as tall as you, the first three letters of an alphabet you know, copied over and over, the strokes going wrong and starting again.",
      "A second great slate. In one corner a small book has been drawn with enormous care, far larger than itself: a primer, open at a picture of a cup. Under it, copied huge: CUP. Under that, pressed too hard, a cup the size of a cart.",
      "A third slate, cracked across from being leaned on. The letters are steadier now. A mistake has been rubbed out with the side of a hand as broad as a table, and the smudge has dried in the shape of the palm, with a pale line where it was cut once and healed.",
      "A fourth slate, and on the floor before it the chalk: a stick as long as your arm, worn to a stub at one end. The slate says HOUSE, and DOOR, and BREAD. The ground under it is harder than the ground around. Your boots ring on it, as on a step.",
      "A fifth slate. The primer is drawn again, shut, and beside it, small and careful, the name from inside its cover: Hanna Brisk, her book. The tall child has copied the name out huge, then crossed it out, then written it once more, small, as if she understood it was not hers to make large.",
      "The last slate is clean but for one word, low down, at the height where a tall child kneels to write. It is not a word from the primer. It is a name, in letters taller than you, and the floor beneath it is as hard as the floor of a house.",
    ],
    ending: "Out where the doors are twice the height of a man, a girl of the Tall Country found a primer no bigger than her thumbnail, blown a thousand sections from wherever Hanna Brisk lost it, and taught herself to read from it, a letter a slate. Nobody out there had ever written anything down. Now one thing is: her own name, at the height a child kneels, on ground that has gone hard under it. And somewhere far behind you a small book is a little less lost, because someone a long way off has read every page of it, slowly, more times than its owner ever did." },
  sporePrints: { title: "The Spore Prints", band: "beyond", relic: "print", colour: "#b0906e", shared: { 2: ["beyond"], 3: ["beyond"] }, weight: { 2: 2, 3: 3 },
    pieces: [
      "A square of stiff paper with a spore print on it in brown dust: not the fan of gills a mushroom leaves, but the plain shape of a staircase, seven steps and a landing. Pencilled in the corner: \"North stand, the tallest cap. Print 1. A staircase. Whose?\"",
      "A second print, rust-coloured: a cart wheel with one spoke missing. The pencil: \"Print 2. They grow on what has fallen, like mushrooms anywhere. Out here nothing falls, exactly. Things are only let go of.\"",
      "A third print, pale violet, very fine: a dog lying with its head on its paws. \"Print 3. I took it down to the hamlet by the stream. Nobody knew the dog. An old man said he had one like it once, and then said no, he had not.\"",
      "A fourth print, the dust smudged where it was carried: a table laid for four, one chair pushed back. \"Print 4. The cap it came from went soft in the night and sank into the ground, as they all do once a print is taken. I think I am the last to see a thing, and then it can rest.\"",
      "A fifth print: a pair of shoes by a door. The pencil has pressed hard. \"Print 5. Nearly two hundred now, and I know none of them. That is right. I am not here to know them. I am here so that each one is seen once, on its way out.\"",
      "The last print is a long, low building with a bell on the roof and a yard in front, and the pencil shakes. \"I know this one. The school at Pell's Ford. I taught in it forty years. I had not thought it was let go of already. I will keep this print.\"",
    ],
    ending: "Among the great mushrooms an old schoolmistress went from cap to cap with a ledger, taking spore prints, because out there the caps grow on what has been let go of and a print is the last shape a thing takes. She knew none of them and did not need to; she only saw each one once, so that nothing went out unseen. The last was her own school. She kept that print, and now you have it: the school at Pell's Ford, bell and yard and the step worn hollow at the door, seen one more time." },
  inkBlotters: { title: "The Ink-Clerk's Blotters", band: "beyond", relic: "blotter", colour: "#5a6478", shared: { 2: ["beyond"], 3: ["beyond"] }, weight: { 2: 2, 3: 3 },
    pieces: [
      "A sheet of blotting paper pressed flat under a stone. It keeps one line, backwards, as blotters do; held to the light it reads: \"Received of the black ground, one well of ink, for copying. It is warm. It is the first ink in years that my hand does not shake out of.\"",
      "A second blotter. \"Copied today: the deed to a farm, two fields and a pond. The ink would not dry until I read the page back aloud. Then it dried all at once, the whole page, like a held breath let go.\"",
      "A third. \"I left a page unread overnight. By morning the ink had run off it, down the desk leg and under the door and across the yard toward the black ground, and the paper was white. The farm is not in the deed now. I do not know if it is anywhere.\"",
      "A fourth, the backwards hand unsteady again. \"I read every page twice now. My voice is going. The black things that walk out there come to the door at night and stand there, listening, dark as the ground. They have not once come in.\"",
      "A fifth. Hardly any words, only a long blot where the pen rested. Then: \"I cannot read aloud any more. I read to them with my finger, along the lines, and they lean close. It holds. It holds if anyone reads it, I think. It need not be me.\"",
      "The last blotter keeps no words at all: only the print of an old hand laid flat, fingers spread, as if to keep something from running off a page.",
    ],
    ending: "At the edge of the Ink Wastes a clerk copied deeds and letters in the warm black ink of that country, because it was the only ink his hand did not shake out of; and it held only while someone read what it said. When his voice went, the black things of the Wastes learned to listen in his place. They are still at his door. They are not only what they seem to be when they come at you across the soft ground. They are the last readers of a few hundred pages that would otherwise run home into the dark, and they lean in close to every line." },
  // Story version 3 (2026-11-06; Tim: "there's tons of room to find stories... the world is huge and I intended it to be massive").
  // Two more far threads, for the two far civilisations (far-realms.ts FAR_CIVS): the Crystal Civilisation and the Storm Halls.
  // They share only the beyond slots, from version 3, at weight 3 like the three before them. docs/narrative-bible.md section 1:
  // what is thought clearly enough sets hard; things are made by being needed long enough.
  enumerator: { title: "The Enumerator's Count", band: "beyond", relic: "census", colour: "#b6a4e6", shared: { 3: ["beyond"] }, weight: { 3: 3 },
    pieces: [
      "A census sheet held down by a violet chip of crystal. Ruled columns, a careful hand: Name, Household, Occupation. One row filled in. \"Household 1. One crystal, the height of a man, floating. Name: would not give one. When I asked, the air went quiet and I thought, very clearly, of a river I have never seen.\"",
      "A second sheet, the rows full. \"Households 2 to 30. Crystals, floating, keeping the street. Occupation, as near as I can tell: keeping still. They push me back when I come close with the pencil. When I put the pencil behind my ear, they let me near.\"",
      "A third sheet, the margin written over. \"I should set down why I am here. I am the enumerator for Wendmere. I took its count every ten years for fifty years: four hundred and twelve, then three hundred, then nine. The parish wrote that the count must still be taken. There was no one left to count, so I walked out until there was.\"",
      "A fourth sheet, creased small as if carried in a fist. \"The crab that wears the stone on its back followed me all day. At dusk it set the stone down and opened it. Inside, small and clear as a drop of water, was my own kitchen at Wendmere, the kettle on. I had not thought of it in years. Someone had, once, clearly enough for it to set.\"",
      "A fifth sheet. \"Household 211. A young one that has begun to think in my hand. I watched the columns come up inside it like frost on a pane: Name, Household, Occupation. It does not know what to put in them. Nor did I, the first time.\"",
      "The last sheet is not in his hand. The columns are cut into it, very fine, as if by something patient that had watched a pencil a long time. \"Household 212. One man. Name: Tobias Rell, of Wendmere. Occupation: counting.\" Where he would have signed there is a small clear stone, still warm.",
    ],
    ending: "Out among the crystal streets an old enumerator took a census of a people with no names, no households and no work but keeping still, because the count must be taken and there was no one left at home to take. They answered him the only way they could, with things somebody once thought clearly enough to set: a river, a kitchen with the kettle on. In the end they counted him. He is household two hundred and twelve, written in a hand finer than his own, and a thing written that clearly out there does not wear away." },
  tinkerTags: { title: "The Tinker's Tags", band: "beyond", relic: "tag", colour: "#d08a4e", shared: { 3: ["beyond"] }, weight: { 3: 3 },
    pieces: [
      "A copper tag on a loop of wire, stamped with a number, a card tied to it. \"No. 1. In for mending: one coil, off the shoulder of a young one of the stone country. Fault: burnt through. Owner: none given. I asked whose it was. It looked at me a long while and held out its arm.\"",
      "A second tag, the card spotted with grease. \"No. 2. A hauler's knee. Fault: worn. I asked the tall one who keeps the street who made them. It did not understand the question. As near as I can tell, nobody did. They were needed for long enough, and here they are.\"",
      "A third tag. \"No. 3. The thunder goes on all day with no cloud in the sky. It comes off the coils. When one of them falls quiet, every head in the street turns toward it at once, the way a kitchen does when the clock on the wall stops.\"",
      "A fourth tag, its card written small to fit. \"No. 4. How I came. Thirty-one years at the shop in Saltry, ANYTHING MENDED on the board. Then nothing came in. People stopped bringing things, or stopped being anywhere to bring them from. I shut up the shop and walked out until I heard something broken.\"",
      "A fifth tag. \"No. 5. A warden came to the bench tonight with nothing wrong with it. It sat where they sit to be mended, and waited. I went over it with the lamp all the same, every joint, and told it it was sound. It hummed, very low, and went home.\"",
      "The last tag is not in his hand: the number is burnt into the copper, neat as a hot point makes it. \"No. 7. In for mending: one hauler's knee. Mended by: Anything Mended.\" Under it, his bench, his lamp set on it, and the stool still warm. There is no tag numbered 6.",
    ],
    ending: "A tinker who had mended anything for thirty-one years, until nobody brought him anything, walked out until he heard something broken and found the Storm Halls, where the machines are people and nobody ever made them. He mended their coils and their knees, and sat with the ones who came to the bench with nothing wrong, because being gone over with a lamp is a kind of mending too. Nobody out there says where he went. They kept the bench. They mend each other at it now, under the name of his shop, and when the thunder stops all at once, it is because every head has turned toward the stool." },
};
export const THREAD_ORDER = Object.keys(THREADS);
const FIRST_THREADS = THREAD_ORDER.filter((id) => !THREADS[id].wave && !THREADS[id].shared); // the first ten (release 627): what a crossing offered then, it still offers
const ORDINARY = /^dungeon:.*:g\d+:(-?\d+):(-?\d+):[^:]+$/;
export const inBand = (band, rx, ry) => { const d = STRAIGHT_BANDS.has(band) ? farDistance(rx, ry) : Math.abs(rx) + Math.abs(ry), [lo, hi] = THREAD_BANDS[band]; return d >= lo && d <= hi; };
const roll = (key) => (hashSeed(key) % 10000) / 10000;
// Story version 4: whether the first ten's roll gives its slot to the shared roll here (past FAR_REALMS.start, straight line).
const firstTenGivesWay = (rx, ry, version) => version >= STORY_BUDGET.firstTenGivesWay && inBand("beyond", rx, ry);
// Which thread this crossing holds, or null: one roll for whether it holds any, one for which of its band's threads. `version` is
// the crossing's story version (storyVersionOf); 0, the default, is the rule every crossing entered before the budget keeps.
export function threadIn(seed, dungeonId, version = 0) {
  const m = ORDINARY.exec(String(dungeonId || "")); if (!m) return null;
  const rx = Number(m[1]), ry = Number(m[2]); if (Math.abs(rx) + Math.abs(ry) < THREAD_RULES.minDepth) return null;
  if (firstTenGivesWay(rx, ry, version)) return sharedThreadIn(seed, dungeonId, rx, ry, version);
  if (roll(`${seed}:threads:v1:${dungeonId}`) >= THREAD_RULES.chance) return version >= 1 ? sharedThreadIn(seed, dungeonId, rx, ry, version) : laterThreadIn(seed, dungeonId, rx, ry);
  const here = FIRST_THREADS.filter((id) => inBand(THREADS[id].band, rx, ry)); if (!here.length) return version >= 1 ? sharedThreadIn(seed, dungeonId, rx, ry, version) : null;
  return here[hashSeed(`${seed}:threads:which:v1:${dungeonId}`) % here.length];
}
// The story budget (STORY_BUDGET): the later threads sharing slots in a section at story version `version`, in THREAD_ORDER.
export const sharedThreads = (version, rx, ry) => THREAD_ORDER.filter((id) => Object.entries(THREADS[id].shared || {}).some(([v, bands]) => Number(v) <= version && bands.some((b) => inBand(b, rx, ry))));
// The chance of the shared roll, made only where the first ten's roll placed nothing: what the budget of `version` leaves there
// (the whole budget where the first ten give way: story version 4, past FAR_REALMS.start).
export function sharedRate(rx, ry, version = STORY_BUDGET.version) {
  const base = !firstTenGivesWay(rx, ry, version) && FIRST_THREADS.some((id) => inBand(THREADS[id].band, rx, ry)) ? THREAD_RULES.chance : 0;
  return Math.max(0, (budgetFor(version) - base) / (1 - base));
}
// The share a thread takes of the shared slots where it is listed at story version `version` (from version 2; `weight`, default 1).
// `weight` is { storyVersion: w }: the latest entry at or before `version` (a plain number holds from version 2). Never edit an
// existing entry; a new version adds one.
export function threadWeight(id, version = STORY_BUDGET.version) {
  const w = THREADS[id]?.weight; let n = 1;
  if (w && typeof w === "object") { for (const [v, x] of Object.entries(w)) if (Number(v) <= version) n = Number(x); } else if (version >= 2) n = Number(w);
  return Math.max(1, Math.floor(n) || 1);
}
function sharedThreadIn(seed, dungeonId, rx, ry, version) {
  if (roll(`${seed}:threads:shared:v1:${dungeonId}`) >= sharedRate(rx, ry, version)) return null;
  const here = sharedThreads(version, rx, ry); if (!here.length) return null;
  const h = hashSeed(`${seed}:threads:shared:which:v1:${dungeonId}`);
  if (version < 2) return here[h % here.length]; // version 1: an even share, exactly as release 773 chose
  let k = h % here.reduce((n, id) => n + threadWeight(id, version), 0);
  for (const id of here) { k -= threadWeight(id, version); if (k < 0) return id; }
  return null;
}
// A crossing's story version: what its dungeon history was pinned to when it was first generated (0, the waves, when missing).
export const storyVersionOf = (save, dungeonId) => { const v = Number(save?.consequences?.dungeons?.[dungeonId]?.storyVersion); return Number.isInteger(v) && v > 0 ? v : 0; };
// What pinDungeonLayout records the first time a crossing's history is pinned: 0 for one generated, visited or pinned before the
// budget (its thread was already offered), else the current budget version. Never changes once set.
export const storyVersionFor = (seenBefore) => seenBefore ? 0 : STORY_BUDGET.version;
// A thread written after the first ten, in a crossing that holds none of them (THREAD_RULES.later, by seed).
function laterThreadIn(seed, dungeonId, rx, ry) {
  if ((hashSeed(`${seed}:threads:later:v1:${dungeonId}`) % 10000) / 10000 >= THREAD_RULES.later) return thirdThreadIn(seed, dungeonId, rx, ry);
  const here = THREAD_ORDER.filter((id) => THREADS[id].wave === 2 && inBand(THREADS[id].band, rx, ry)); if (!here.length) return thirdThreadIn(seed, dungeonId, rx, ry);
  return here[hashSeed(`${seed}:threads:later:which:v1:${dungeonId}`) % here.length];
}
// Release 707: wave 3 threads, rolled only where neither earlier roll placed a thread (THREAD_RULES.third), so none moves.
// Never add another wave 2 thread to a band: crossings that hold a wave 3 thread because no wave 2 thread was in band would move.
// A later thread is always a new wave with its own roll.
function thirdThreadIn(seed, dungeonId, rx, ry) {
  if ((hashSeed(`${seed}:threads:third:v1:${dungeonId}`) % 10000) / 10000 >= THREAD_RULES.third) return fourthThreadIn(seed, dungeonId, rx, ry);
  const all = THREAD_ORDER.filter((id) => THREADS[id].wave === 3 && inBand(THREADS[id].band, rx, ry)); if (!all.length) return fourthThreadIn(seed, dungeonId, rx, ry);
  const first = Math.min(...all.map((id) => THREADS[id].layer || 0)), here = all.filter((id) => (THREADS[id].layer || 0) === first); // release 712: an earlier layer keeps its crossings
  return here[hashSeed(`${seed}:threads:third:which:v1:${dungeonId}`) % here.length];
}
// 2026-11-04: wave 4 threads, rolled only where none of the first three rolls placed a thread (THREAD_RULES.fourth), so none moves.
// As with wave 3: never add another wave 4 thread to a band its crossings already cover; the next thread is a new wave (or a layer).
function fourthThreadIn(seed, dungeonId, rx, ry) {
  if ((hashSeed(`${seed}:threads:fourth:v1:${dungeonId}`) % 10000) / 10000 >= THREAD_RULES.fourth) return fifthThreadIn(seed, dungeonId, rx, ry);
  const here = THREAD_ORDER.filter((id) => THREADS[id].wave === 4 && inBand(THREADS[id].band, rx, ry)); if (!here.length) return fifthThreadIn(seed, dungeonId, rx, ry);
  return here[hashSeed(`${seed}:threads:fourth:which:v1:${dungeonId}`) % here.length];
}
// 2026-11-05: wave 5 threads, rolled only where none of the first four rolls placed a thread (THREAD_RULES.fifth), so none moves.
// The same rule again: the next thread is a new wave (or a layer), never a second wave 5 thread in a band its crossings already cover.
// Superseded for new threads by the story budget (STORY_BUDGET): wave 5 is the last wave; the waves' rolls are story version 0 only.
function fifthThreadIn(seed, dungeonId, rx, ry) {
  if ((hashSeed(`${seed}:threads:fifth:v1:${dungeonId}`) % 10000) / 10000 >= THREAD_RULES.fifth) return null;
  const here = THREAD_ORDER.filter((id) => THREADS[id].wave === 5 && inBand(THREADS[id].band, rx, ry)); if (!here.length) return null;
  return here[hashSeed(`${seed}:threads:fifth:which:v1:${dungeonId}`) % here.length];
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
  const id = threadIn(save?.seed, dungeonId, storyVersionOf(save, dungeonId)); if (!id) return null;
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
