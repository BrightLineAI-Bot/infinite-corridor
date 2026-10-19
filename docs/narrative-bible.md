# The Unread: narrative design for Infinite Corridor

Draft 1, 2026-10-19. Requested by Tim: a narrative woven through the reciters, the regions, the dungeons and short high-detail scenes. It should be subtle and never explained (in the manner of Dark Souls), with collectable story books that let a player know a region is mastered.

This document is a design proposal. Nothing here is built until Tim approves it. It keeps his standing decisions:
- The lore stays ambiguous. The dungeons are real places beneath the corridor, and also possibly elsewhere: an infinity of infinities.
- The relay fragments and the Listener's lines are drafts Tim may rewrite.

---

## 1. What the Corridor is (never stated in the game)

This section is for us. The game only ever implies it, through fragments, glimpses and things people half-say.

**The Corridor is where stories go when no one is reading them.** Every life that was ever told leaves a residue: in a book, a song, a letter, a story told about the dead. The Corridor is built from that residue, endlessly. A region is a stretch where one telling has settled like sediment. The people in it are not the characters themselves but echoes of them, caught at different pages of their lives. That is why you can meet a young Pierre in one section and an old one ten sections on, and why he never quite remembers you.

**The Wayfarer is unread.** No one ever told their story, so the Corridor cannot hold them on any page. They wander, and death sends them back to the last place that remembered them: the Wayglass. The Aperture, the perception stat, is the Wayfarer slowly learning to *read* the Corridor. At low Aperture the world is just ground. At high Aperture the walls are made of letters, the rings in a felled tree are lines of a diary, and something reads back.

**The dungeons are the margins.** They are beneath the text and outside it: the notes, the crossings-out, the pages torn away. That is why they are real and also elsewhere.

**The Listener and the Far Array** are what answered when the Corridor called out for a reader. Whether it is a reader, the absence of one, or the Wayfarer's own future is never settled.

**The Missing Crossing** is a page that was torn out. Throughout the game the Wayfarer is gathering the pages of a book whose last chapter is their own, still blank.

Tone: quiet, grave, sometimes beautiful, sometimes horrifying. Never jokey. Humour, when it appears, is human and dry, never a gag line.

---

## 2. Regions ("Readings") and their books

The overworld is divided into Readings: large areas, each dominated by one book that is already in the game's library. The people of a Reading speak in its voice, its reciters recite it, its dungeons hold its margins, and its Glimpses show its images.

The layout is distance bands around Ember Refuge, crossed with compass quarters:

| Band (sections from the start) | North | East | South | West |
|---|---|---|---|---|
| **The Long Campaign** (0 to 6) | *War and Peace*, all around the Refuge | | | |
| **The Middle Reaches** (7 to 18) | **The River That Remembers**: *Siddhartha* | **The Transparent Eye**: Emerson, *Nature* and *Self-Reliance* | **The Yellow City**: *Crime and Punishment* | **The Path Walked Alone**: Musashi, *Dokkōdō* |
| **The Far Reaches** (19 to 35) | **The Monastery of Three Brothers**: *The Brothers Karamazov* | **The Book of Images**: Rilke | **Under the Floor**: *Notes from Underground* and *The Idiot* | **The Second Campaign**: *War and Peace*, years later (Pierre older, the war over and not over) |
| **The Dreamlands** (36 and beyond) | Lovecraft, the Randolph Carter stories, all around. It deepens toward the Far Array (40 to 62 sections out), which is already where the relay coordinate leads. | | | |

The further out you go, the more the Corridor forgets it is made of human lives: from war and peace, through searching and doubt, to cosmic dream-horror at the edge. The journey outward is the story.

Each Reading gets a name on the Atlas once entered ("You enter the River That Remembers"), and a faint border tint on the Atlas layer.

---

## 3. The books: 20 pieces per Reading

The Reciter's Tome gets a **Books** page: one book per Reading, each with 20 pieces, shown as "The River That Remembers · 15 of 20". When all 20 are found, the book closes with a short final Glimpse, and the Reading is marked **Mastered** on the Atlas (a gold rule under its name). This is purely for the player's own satisfaction; it is not a gate.

Where the 20 pieces come from (about the same mix in every Reading):

| Source | Pieces | How |
|---|---|---|
| **Voices** | 8 | People met in the Reading (travellers, hamlet folk, wanderers) each speak a curated key passage of the book. Hearing a new one counts. |
| **Recitation** | 3 | Meeting the Reading's reciter and hearing three specific passages: a beginning, a turning point and an ending. |
| **Glimpses** | 4 | Touching certain stones, trees, water or ruins in the Reading shows a Glimpse (see section 5). |
| **Margins** | 4 | Each crossing (dungeon) in the Reading can hold one margin-note: an inscription, an object or a Glimpse. Four distinct ones count. |
| **The Last Page** | 1 | When the other 19 are found, a marker appears somewhere in the Reading. Touching it plays the book's closing Glimpse. |

Every piece has a stable id, so it is recorded once. Pieces are seeded per world, so two worlds differ in where things are, but every book is always completable.

---

## 4. People: no repeats, and lives met at different pages

**What changes about how people talk:**
- The jokey pools are retired from normal rotation: the witty, odd and song pools, and the quote-riffs ("Call me Ishmael… Call me tired"). A few dry, human lines may stay, used rarely.
- Each Reading has its own voice pool, drawn from its book: the people in the River That Remembers speak *Siddhartha*.
- **No line repeats.** The game remembers every line you have heard, using a compact record in the save. People always offer an unheard line first. A line comes round again only after its whole pool is exhausted, and the Tome shows how far through a voice you are.
- Travellers get a name and a sense of when in their life you met them ("a young officer, not yet wounded").

**Recurring characters** are original to the game and thread through every Reading. You meet each of them several times, at different points in their life, out of order:

1. **Ilse, the Lamplighter.** As a child she lights lamps along a road; each one goes out as she passes, and she doesn't mind. As a woman she carries the last lamp that stays lit, and asks you to hold it while she sleeps (it is gone when she wakes). As an old woman she does not know you, and asks how the story ends. Five meetings; the last one is in the Dreamlands.
2. **Abel Corwin, the Surveyor.** He measures the Corridor with a chain and keeps finding it longer than yesterday. His field notes turn up in dungeons, and the measurements grow wrong in an orderly way. At the end he is found as a statue at the edge of the Dreamlands, measuring himself.
3. **The Bell-founder's Daughter.** She casts bells to call the lost home. She is the centre of the first multi-dungeon story (section 6).
4. **The Second Wayfarer.** Someone dressed as you, always a section ahead. Seen at a distance; their footprints sometimes appear in dungeons. Never met until very late, if ever.

These meetings are rare and placed by seed, so the Corridor feels like wandering through lives rather than reading a script.

---

## 5. Glimpses: the high-detail moments

A Glimpse is a short animated scene, 6 to 15 seconds, drawn in a completely different style from the pixel world. It has painterly light, layered depth, fine particles, detailed figures and slow camera moves, and is gone again before you have taken it in. The contrast is the point: *what did I just see?*

**When they happen:**
- **Touching:** stones, statues, trees (sometimes while chopping), water's edges, old ruins, a crossing's threshold.
- **Entering:** the first time you enter a Reading, a crossing, or a deep level.
- **Chance:** rare and unannounced, for example about one tree in forty.
- **Story:** completing a margin, a thread or a book.

Most belong to a Reading's book; some are free-floating vignettes that belong to nothing and add depth.

**Presentation:**
- Full-screen over the game, which pauses.
- One caption at most, often none.
- Skippable with a tap, and replayable from the Tome.
- With reduced motion turned on, a Glimpse plays as two or three still frames with slow fades.

**First designs:**

*The Long Campaign (War and Peace)*
1. **The Field Without End.** Dawn over a field of standing soldiers in grey coats, mist at their knees. The camera drifts along the line: they are trees, bark where faces should be. One at the end turns its head. It has the Wayfarer's face. Caption: none.
2. **The Letter Home.** Snow falls on a desk. A hand writes a letter by one candle; the wind takes the page out of the window, and thousands of other letters join it, rising. They settle into a wall, and the wall is a Corridor wall.
3. **The Sky over Austerlitz.** Lying on your back on a battlefield, you see an immense, slow sky. The clouds drift into the grid of the Atlas. Silence. Then a single cannon, far away. (Prince Andrew's sky. The caption is a Maude passage on the lofty sky.)

*The River That Remembers (Siddhartha)*

4. **The River Speaks.** Touching river water: the surface fills with faces flowing downstream — a child, a lover, a dying man — their voices thinning into one long tone. A faceless ferryman pushes off from the far bank.
5. **Every Stone.** A stone on a riverbank becomes, in slow dissolves, moss, a fern, a fish, a bird, a sleeping man, and a stone again.

*The Yellow City (Crime and Punishment)*

6. **The Fourth Floor.** A yellow stairwell. A ring of brass keys hangs on a hook and swings by itself. The door handle at the top turns from the inside. Cut to black before it opens.

*Under the Floor (Notes from Underground)*

7. **The Room That Narrows.** A clerk's room by lamplight. On each slow breath the walls come a little closer. In the last frame the room is the size of a coffin, and the lamp is still burning.

*The Monastery of Three Brothers (Karamazov)*

8. **The Silent Kiss.** A candlelit vaulted cell. An old inquisitor speaks without sound; the silent prisoner rises and kisses him. The door opens onto the Corridor at night.

*The Transparent Eye (Emerson)*

9. **Bare Ground.** A figure stands on bare ground under a wide sky. Light passes into them; they become glass, then air. Wind moves the grass where they were.

*The Path Walked Alone (Musashi)*

10. **Dawn Duel.** Two swordsmen on a beach at dawn. One draws; the other is his reflection in the wet sand. Only one shadow.

*The Dreamlands (Lovecraft)*

11. **The Silver Key.** A tarnished key in a ruin. The stone opens onto stairs descending through cloud to a city of impossible spires and galleys sailing the sky. Something vast, the size of the horizon, slowly turns an eye.
12. **The Seven Hundred Steps.** Down, and down, through a cavern lit by a temple of flame. The steps do not end. The Glimpse ends on the 700th step, with more below.

*Free vignettes (anywhere, rare, belong to no book)*

13. **The Hall of Doors.** Every door opens on the same room, where someone is waiting for you, a little older each time you look.
14. **What the Tree Remembers.** While chopping: the tree's rings spin back through seasons to a hand carving two initials, then to a seed.
15. **The Drowned Bell.** At sea: below the waves a bell tolls, and a congregation of the drowned looks up at your hull.
16. **The Mouth in the Map.** Rarely, on opening the Atlas: the ink pools and a mouth forms, says nothing, and closes.

**How Glimpses are drawn:**
- **Engine:** a new "Glimpse engine", a canvas inside the existing story-scene layer at full device resolution. It is independent of the pixel world, like the new Questing Beast model.
- **Script:** each Glimpse is a script of layers on a timeline:
  - skies and light, with gradients, rays and bloom;
  - fog volumes;
  - silhouettes and figures, drawn with curves in detail;
  - particles (snow, embers, motes, water), capped at a few hundred;
  - camera drift, zoom and shake;
  - a single caption.
- **Fallback:** on "low" quality or "safe mode" they play as still frames.

---

## 6. Threads: stories across several dungeons

A thread runs like a hunt, but carries narrative. Each one is tracked in the Journal under **Active quests**.

1. **The Seven Bells** (the Long Campaign and the Middle Reaches). The Bell-founder's Daughter cast seven bells to call home the people the war took. They were scattered into seven crossings; each holds a cracked bell. Ringing a bell plays a short Glimpse of one lost person on a road, walking home. When the seventh rings, the final Glimpse plays: seven figures arrive at a door at dusk. The Daughter opens it, and none of them have faces. She lets them in anyway.
2. **The Surveyor's Chain** (across the Middle and Far Reaches). Abel Corwin's lost chain-links lie in dungeons; each comes with a page of his notes. With all twelve links, the last dungeon's map turns out to be the overworld. The thread ends at his statue.
3. **The Torn Pages** (one per Reading). Each Reading's deepest crossing holds a page torn from the Reciter's Tome. The pages belong to a book with no title. When all are found, the Tome gains a last book: blank, except that it slowly fills with the Wayfarer's own Journal. The Corridor has begun to read you. This is the closest the game ever comes to explaining itself.

The existing deep-dungeon story packages (the scorched echoes and memorials) get Glimpses instead of ticker lines. The summit stones' and grotto ruins' lore text, which is written but never shown, becomes touch-to-read.

---

## 7. What gets built, in order

Each step is one release, built and previewed for Tim before publishing.

1. **Readings and voices.**
   - Reading regions and their Atlas names.
   - Regional voice pools drawn from the books already in the game.
   - No repeated lines, with heard lines saved.
   - The jokey pools retired.
   - The Tome's **Books** page with piece counts. Voice and recitation pieces count from day one.
   - The unused lore text on stones and ruins becomes readable.
2. **The Glimpse engine** and its first four Glimpses: The Field Without End, The River Speaks, The Silver Key and What the Tree Remembers. Touch triggers and Glimpse pieces start counting.
3. **Ilse the Lamplighter**, the first recurring character, plus four more Glimpses.
4. **The Seven Bells**, the first multi-dungeon thread, and margins in crossings.
5. **Ongoing**: two or three new Glimpses per pass, the Surveyor, the remaining books' closing Glimpses, and the Torn Pages.

**Save:** one new additive block, `save.lore`, holding:
- the heard lines (compact ids);
- pieces per Reading;
- witnessed Glimpses;
- thread progress.

It is normalised in `freshSave` and `migrateSave`, the way every other system is, at schema 14.

**Sources:** every quoted passage comes from the public-domain editions already in the game (Maude, Garnett, Martin, Project Gutenberg). Everything else — Ilse, the Surveyor, the Bells, the Glimpses — is original writing for the game.
