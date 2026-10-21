# The Unread: narrative design for Infinite Corridor

Draft 2, 2026-10-19. Draft 1 was requested by Tim: a narrative woven through the reciters, the regions, the dungeons and short scenes. It should be subtle and never explained (in the manner of Dark Souls), with collectable fragments that let a player know a region is mastered. Draft 2 adds Tim's direction from the same day:

- The Corridor is coextensive with all reality.
- The human stories are only the residue of our local corner of it.
- Farther out, what you meet is less and less human: not as a hard rule, but as a drift.
- The Glimpses are first-person: the world seen through someone's, or something's, eyes.
- Region names never name their book.
- Regions hold different numbers of fragments.

Tim's aim for all of it: **the game should help him reach an unconventional thought.**

Step 1 (the regions, voices without repeats, and the Tome's fragment counts) is built as release 191. Everything after it is a proposal until Tim approves it. It keeps his standing decisions:

- The lore stays ambiguous. The dungeons are real places beneath the corridor, and also possibly elsewhere: an infinity of infinities.
- The relay fragments and the Listener's lines are drafts Tim may rewrite.

---

## 1. What the Corridor is (never stated in the game)

This section is for us. The game only ever implies it, through fragments, Glimpses and things people half-say.

**The Corridor is coextensive with all reality.** It is the interstice that touches everything that is, was, or could be. What the Wayfarer walks through is only what a human mind is able to perceive of it: ground, walls, weather, people. The real Corridor is much larger, and much stranger.

**Near Ember Refuge, the Corridor is human.** This is our local point in it, so it is thick with the residue of human lives: the stories that persisted after the people were gone, such as War and Peace, Siddhartha and the old legends. The reciters are individuals, people caught in the Corridor, whose own lives are slowly washing out into whatever is truly remembered. A reciter speaking Tolstoy may once have been someone else entirely. They do not remember, and they never quite remember you.

**Farther out, the Corridor forgets that it was ever human.** The residue thins. Cosmic dream-stories (Lovecraft's Dreamlands) come first, and then things that were never human at all:
- patterns that compute themselves;
- gas and light;
- crystal minds, floating spheres and amorphous lives;
- burning plains out of the oldest hells;
- darkness with only a hairline of light on its edge.

This is a drift, not a border. A human Glimpse can surface at the edge of the map, and something incomprehensible can open beside the Refuge.

**The Silver Key** (the gate at the Corridor's core) is how the Corridor reaches other realities, other histories and other beings. The Glimpses are its doors: for a few seconds you are inside someone, or something, else. The game never says whether those others are strangers or other versions of the Wayfarer.

**The Wayfarer is unread.** No one ever told their story, so the Corridor cannot hold them on any page. They wander, and death sends them back to the last place that remembered them: the Wayglass.
- **The Aperture**, the perception stat, is the Wayfarer slowly learning to see more of the Corridor than a human mind can.
- **The dungeons** are the margins: beneath the text and outside it.
- **The Listener and the Far Array** are what answered when the Corridor called out for a reader.
- **The Missing Crossing** is a page that was torn out.

Tone: quiet, grave, sometimes beautiful, sometimes horrifying, sometimes simply incomprehensible. Never jokey.

---

## 2. Regions ("Readings") and their books

The overworld is divided into regions, called Readings in the code. Each is dominated by one remembered book:
- its people speak in that book's voice;
- its reciters recite it;
- its dungeons hold its margins;
- its Glimpses lean toward its images.

**Names.** Region names are places, never the book's title.

**Discovery.** Nothing reveals a region or a book before you hear it. No region list and no count of what remains appear anywhere. You learn you have crossed into a new region when a traveller there speaks a different book ("You are in the Ferry Reaches"). Only then does the Atlas and the Tome name it.

**Layout.** Distance bands around Ember Refuge are crossed with compass quarters (north is up the Atlas):

| Band (sections from the start) | North | East | South | West |
|---|---|---|---|---|
| 0 to 6 | **The Smoke Meadows** (*War and Peace*, all around the Refuge) | | | |
| 7 to 18 | **The Ferry Reaches** (*Siddhartha*) | **The Clear Country** (Emerson, *Nature* and *Self-Reliance*) | **The Fevered Stairs** (*Crime and Punishment*) | **The Whetstone Hills** (Musashi, *Dokkōdō*) |
| 19 to 35 | **The Long Table** (*The Brothers Karamazov*) | **The Autumn Galleries** (Rilke) | **The Low Rooms** (*Notes from Underground*, *The Idiot*) | **The Ash Orchards** (*War and Peace*, years later) |
| 36 and beyond | **The Far Sleep** (Lovecraft's Randolph Carter stories), deepening toward the Far Array (40 to 62 sections out). Its landscapes and dungeons should become Dreamlands: see section 7. | | | |

**Gilgamesh** (Tim, 2026-10-19: this is the legend he meant). Its subject is the oldest surviving story of grief, a journey to the edge of the world, and the plant of life lost to a snake. It is a natural voice for the Corridor's human residue, from public-domain translations (R. Campbell Thompson, 1928, or Jastrow and Clay, 1920).

**The Elder Wanderers** (release 197) are rare road creatures that speak no language, only cellular automaton rules. Hearing all 88 essentially different rules completes their recitation. They are the first voice from far outside human residue, and they walk everywhere.

---

## 3. Fragments: what the Corridor remembers

The Reciter's Tome opens with **What the Corridor Remembers**. Each region walked is listed with its fragments found, for example "The Ferry Reaches · 11 of 18 fragments". When every fragment is found, the region is marked **Mastered** (gold in the Tome, and later on the Atlas), and a closing Glimpse plays. This is purely for the player's own satisfaction; it is not a gate.

**Sizes differ by region**, about 20 on average: from 13 in the Whetstone Hills (Musashi wrote little) to 33 in the Far Sleep. A thin region is quickly gathered; a deep one is not.

| Source | Share | How |
|---|---|---|
| **Voices** | about 40% | Key passages spoken by people met in the region. Hearing a new one counts. |
| **Recitations** | 2 to 4 | Passages from the region's first reciter, from its opening line to its last. |
| **Glimpses** | about 20% | First-person scenes found in the region (section 5). |
| **Margins** | about 20% | Inscriptions, objects or Glimpses inside the region's crossings. |
| **The last fragment** | 1 | Appears when the rest are found. It plays the region's closing Glimpse. |

Every fragment has a stable id, so it is recorded once.

---

## 4. People: no repeats, and lives met at different pages

**What changes about how people talk:**
- The jokey pools are retired from normal rotation: the witty, odd and song pools, and the quote-riffs ("Call me Ishmael… Call me tired"). A few dry, human lines may stay, used rarely.
- Each Reading has its own voice pool, drawn from its book: the people in the Ferry Reaches speak *Siddhartha*.
- **No line repeats.** The game remembers every line you have heard, using a compact record in the save. People always offer an unheard line first. A line comes round again only after its whole pool is exhausted, and the Tome shows how far through a voice you are.
- Travellers get a name and a sense of when in their life you met them ("a young officer, not yet wounded").

**Recurring characters** are original to the game and thread through every Reading. You meet each of them several times, at different points in their life, out of order:

1. **Ilse, the Lamplighter.** As a child she lights lamps along a road; each one goes out as she passes, and she doesn't mind. As a woman she carries the last lamp that stays lit, and asks you to hold it while she sleeps (it is gone when she wakes). As an old woman she does not know you, and asks how the story ends. Five meetings; the last one is in the Far Sleep.
2. **Abel Corwin, the Surveyor.** He measures the Corridor with a chain and keeps finding it longer than yesterday. His field notes turn up in dungeons, and the measurements grow wrong in an orderly way. At the end he is found as a statue at the edge of the Far Sleep, measuring himself.
3. **The Bell-founder's Daughter.** She casts bells to call the lost home. She is the centre of the first multi-dungeon story (section 6).
4. **The Second Wayfarer.** Someone dressed as you, always a section ahead. Seen at a distance; their footprints sometimes appear in dungeons. Never met until very late, if ever.

These meetings are rare and placed by seed, so the Corridor feels like wandering through lives rather than reading a script.

---

## 5. Glimpses: through other eyes

A Glimpse is a short scene, 8 to 20 seconds, seen **in first person**: through the eyes of someone or something the Corridor touches. It is drawn in a completely different style from the pixel world. Each one is a slow, moving image:
- painterly light and layered depth;
- fine particles;
- a slowly drifting viewpoint.

You see what they see: sometimes their hands, sometimes their body at the edge of vision, sometimes nothing you could call a body. All Glimpses aim at the same level of quality.

**Hand authoring and review:** before drawing or revising a hand, use the [hand reference guide](hand-reference-guide.md), inspect the relevant licensed pose images, and check construction, grip/contact and readability at the scene's actual display size. Technical tests and visual acceptance are separate gates; these documentation references are not shipped game assets.

### Kinds of eyes

The way an entity sees is part of the scene:

- **One eye or two.** The ordinary view, with a soft vignette, blinks and focus pulls.
- **Compound eyes.** The image is a hex mosaic. Each facet is slightly off in position, colour and time.
- **Many eyes.** Several lenses at different angles are stitched into one panorama, with seams that do not quite line up.
- **No eyes.** Heat, sound or pressure, drawn as fields and ripples.
- **Something else.** The picture is not an image at all: computation, colour, glyphs.

### Kinds of body

What we see of ourselves:
- human hands, young or old, gloved, scarred or tender;
- claws, chitin legs, fins or tendrils;
- crystal facets;
- a glow with no edge;
- nothing at all.

### Kinds of moment

- At rest: sitting, lying, waiting.
- Intimate: a hand held, a head on a shoulder, a face we never quite see.
- In motion: walking, riding a wagon, poling a ferry, swimming, falling, flying, piloting something.

### Triggers

- **Touching** stones, trees, water's edges, ruins and thresholds.
- **Entering** a crossing or a deep level for the first time.
- **Chance:** rare and unannounced.
- **Completing** a margin, a thread or a region.

### Rarity

You almost never see the same Glimpse twice. A Glimpse is offered only while unseen, and once every Glimpse a region holds has been seen, one may return at most twice more. Glimpses are drawn from a pool weighted by distance from the Refuge: human near home, less human farther out. Every region keeps a small share from the other end.

### Catalogue (first draft; more come in every pass)

*Human residue (most common near the Refuge)*

1. **The Wagon at Dusk.** You sit on a wagon bench, and your worn hands hold the reins. The road unrolls through birches; a lantern swings at the edge of sight. Someone beside you breathes in their sleep.
2. **The Letter.** By candlelight your hand writes; the ink is still wet. Another hand rests on yours for a moment and is gone. Wind takes the page out of the window.
3. **The Sky.** You lie on your back in a field. An immense slow sky, and silence; the clouds drift into the grid of the Atlas.
4. **The Ferry Pole.** You push a pole into the river. Your reflection in the water is someone else, older, and is smiling.
5. **Rain at the Window.** Someone's head rests on your shoulder. Rain runs down the glass. You never turn to see their face.
6. **The Stairwell.** You climb yellow stairs with your hand on the rail and hear your own breath. A door at the top is ajar.
7. **Old Hands.** You are knitting by a stove, with spotted hands. The yarn runs out of the frame and becomes a road.

*Creatures*

8. **The Lantern, Faceted.** Compound eyes: a lantern swells in a hundred hex facets, each a moment late. Wings beat at the edges.
9. **The Climber.** Six eyes, stitched: a canyon wall in a curved panorama. Chitin legs reach into view and find holds.
10. **Under the Ice.** You are a fish looking up through ice. Shapes walk above, and one kneels and puts a hand flat on the ice.
11. **The Night Field.** An owl's view: a wide, slow turn of the head, the world silver, and a small warm shape in the grass.
12. **The Scent Road.** A hound's view, low to the ground. Scents hang in the air as coloured threads, and one thread is yours.

*Elsewhere*

13. **The Cockpit.** Gloved hands with four fingers rest on unfamiliar controls. Stars streak by, and ahead is a planet that is a Wayglass.
14. **The Train.** You sit by a window. Outside, every region passes in order, then regions that do not exist.
15. **The Room in the Atom** (if the Yoga Vasistha is added). You sit in a small room. A mote of dust drifts close and opens: inside it is this room, and you, sitting.

*Not human (more common far out)*

16. **The Rule.** Your vision is a cellular automaton (Rule 30, then Rule 110) unfolding line by line. One cell blinks out of step: that cell is you.
17. **Glyph Rain.** Columns of characters (ones and zeros, then alphabets that never existed) briefly resolve into a face, then fall apart.
18. **The Gas Giant.** You are the size of a storm, drifting through bands of colour. Lightning far below is someone's whole history.
19. **The Crystal Choir.** The world reaches you refracted through your own facets. Other crystals tilt toward you and ring.
20. **The Spheres.** You are one of many spheres in an amber void. The others drift, touch and chime. You cannot tell which of them is you.
21. **Edge-Light.** Almost total darkness, with a hairline of light on the edge of something moving very slowly. Breathing that is not yours.
22. **The Burning Plain.** You walk barefoot over embers, and your hands are ash. Figures stand in the fire, calm. Nobody screams.
23. **The Glob.** Your vision is diffuse, with no edges, only pressure and colour. You divide, and you see from both halves.
24. **The Swirl.** A vortex of colour fields with no subject, no up and no down. It goes on a moment too long.
25. **The Eye Within.** Something with eyes at every scale: the view falls endlessly into its own eye.

### How they are drawn: free, in the browser

Glimpses are generated by code in the game itself. There are no paid tools, no downloaded art, no servers and no per-play cost, so they work offline like everything else.

- **2D painterly layers** (Canvas 2D), for the human and creature scenes:
  - gradient skies and light shafts;
  - fog volumes and bloom;
  - detailed curve-drawn hands, figures and landscapes in parallax depth;
  - particles: rain, embers, snow and motes.
- **3D** (WebGL shaders, ray-marched), for the scenes no flat drawing can do:
  - the crystal choir and the spheres;
  - the gas giant, the swirl and the eye within;
  - true depth and lighting for the cockpit and the train.

  Shaders are a strength here: abstract, cosmic scenes are exactly what they render best.
- **Lens passes** turn any scene into a compound-eye mosaic, a stitched multi-eye panorama, heat vision or glyph vision. One scene can therefore be seen through many kinds of eyes.

The aim is the quality and mood of a hand-painted 2D game such as Astral Ascent. Procedural art will not look identical to hand-painted art, so the first Glimpse release builds three scenes at full quality, one from each end of the range:
- The Wagon at Dusk (human);
- The Lantern, Faceted (creature, compound eye);
- The Rule or Edge-Light (not human).

Tim judges those in a preview before more are made.

**Fallback.** With reduced motion turned on, or on low quality, Glimpses play as two or three slow-fading stills. Screen-space work is capped so mid-range phones keep their frame rate.


### Reusable capability marker: native scene renders and video (2026-10-21)

**Owner direction for future Codex and Anthropic/Claude work:** remember that we can stage and render scenes using the game's actual character models, effects and renderer. Use this capability when making visions, views, Glimpses or videos: characters can participate in a staged game-world encounter or be composed into a scene that fills the screen. This is an authoring tool available to us, not a request to build a new scene runtime now. Preserve the first-person, mood and art direction above when choosing how it serves a particular Glimpse; a combat preview is not automatically finished Glimpse art.

**Verified now: external development rendering/capture.** Native Canvas 2D drawing has produced character tableaux, scripted production-combat scenes, full-canvas compositions, PNG stills/contact sheets and H.264 MP4 video. These are source-rendered images, not AI-generated approximations of the models. A staged tableau may directly place characters and effects at chosen positions/times. A scripted combat preview instead advances selected production callbacks against a scratch arena, then draws their resulting state. Neither is a human playtest.

**Playback boundary.** The game already has a full-screen Canvas Glimpse overlay: `src/glimpse-render.ts` exports `drawGlimpse(ctx, id, t, w, h, state)` (normalized time 0–1) and `startGlimpse(canvas, id, options)`; `src/main.ts`'s `playGlimpse` pauses/resumes play, handles dismissal and records eligible sightings. The catalogue is `src/glimpses.ts`, with scene drawing in `src/glimpse-scenes.ts`, `src/glimpse-horror.ts` and `src/glimpse-legend.ts`. What is **not implemented by this marker** is a bridge that plays these native character/combat tableaux through that overlay, a reusable cinematic camera or actor choreography system, player-input handoff for such scenes, or an MP4 playback/export feature in the game. `src/renderer.ts`'s existing player-centred `cameraTransform` is not a cutscene director. Full-screen composition in an external capture does not prove any of those integrations exist. Future integration needs its own scoped implementation and review; keep offline operation and production journey isolation intact.

#### Durable entry points and a future-use recipe

The production functions below are repository sources. The local preview harnesses described afterward are **not checked-in reusable tools** and may be absent in another clone. Do not promise a runnable repository capture command without checking. This recipe remains useful without those harnesses; a future author must construct a local harness or explicitly approve a maintained development example, not add capture dependencies to the shipped game.

1. **Choose the kind of scene.** For a tableau, use `drawPackMonster` and `drawPackEffects` from `src/monster-render.ts` with explicit actor/effect state, scale and time. For a world scene, use `render(ctx, game, width, height, now)` from `src/renderer.ts`. For an existing authored Glimpse, use `drawGlimpse` with a valid catalogue id and a retained, scene-local `state` object (for example, `{ quality: "balanced" }`). Keep the same frame order when reproducing grain/stateful drawing; a seed alone does not guarantee identical pixels across different frame sequences or Canvas/font implementations.
2. **Prepare a development-only capture environment.** The inspected local harnesses run as ES modules with direct `.ts` imports on Node **24.19.0**, `@napi-rs/canvas` **0.1.100**, and FFmpeg **7.1.5** with `libx264`. They resolve Canvas using `createRequire(import.meta.url)('@napi-rs/canvas')`; the dependency is provided by the current development environment, not `package.json`. Check resolution and tool versions first. A Node version supporting this project's direct TypeScript imports and a compatible Canvas implementation are required; the exact recorded versions are evidence, not new production requirements. World rendering uses `globalThis.OffscreenCanvas = class { constructor(w, h) { return createCanvas(w, h); } }` for its scratch canvases. Browser lifecycle APIs are still needed if using `startGlimpse` rather than offline frame drawing. Do not change package/config/build files or install tools without the applicable authorization.
3. **Isolate state.** Create `save = freshSave()` from `src/types.ts`, then set `save.seed` explicitly before `new Game(save, 0)` from `src/game.ts`: `freshSave` ignores a seed argument. Use a synthetic map with `width`, `height`, `entry`, `tiles`, `objects` and `enemySpawns`, explicit player position/facing, and scratch arrays for enemies/projectiles/effects/packEffects. Clear unrelated storm/sea hazards. Use `createCombatant` from `src/combat.ts` and `freshPackState` from `src/monster-pack.ts` for combat actors. Fix ids, map, actor stats, attack schedule, seed and simulated clock. Existing ocean footage used `NATIVE-OCEAN-PREVIEW`; dungeon footage used `VOID-NATIVE-DEMO`. These fixed inputs support repeatable simulations, not proof that every path through the whole game is deterministic. Never load, import, persist, overwrite or clear a production save. Scripted damage and terrain changes belong only to the disposable in-memory scene.
4. **Advance only what the scene claims to show.** The demonstrated adapter loop runs four steps of `dt = 1/60` per captured frame at 15 fps: scripted `moveAxis`, `game.packWorld(dt, now)`, `updatePackMonster(actor, world)` and `tickPackEffects(effects, world)`. Assign chosen attacks at recorded times, keep actor/effect counts bounded, and then call the renderer. This is explicitly **not `Game.update`**, actual player input, natural encounter generation or a complete game simulation. Labels must name attacks that actually started; assert the expected effects/phases and final state rather than inferring them from a caption. Pure tableaux do not need this simulation loop.
5. **Capture and inspect.** Write selected Canvas buffers as PNGs; combine key frames into a contact sheet. The verified video path pipes sequential PNG buffers into FFmpeg using `-f image2pipe -framerate 15 -i pipe:0 -an -c:v libx264 -pix_fmt yuv420p -crf 22 -movflags +faststart`. Respect stream backpressure and require a successful encoder exit. Use explicit output paths under a local evidence directory; FFmpeg's `-y` overwrites an existing output, so use a fresh filename/directory when preserving prior evidence. The ocean demonstration is 960×600, 420 frames/28 seconds; resolution/duration are authoring choices, not a mobile performance budget. Inspect composition, readability and timing in both the stills and video. No sound was captured.
6. **Record provenance and accessibility limits.** Save a JSON receipt with source commit, dirty-tree status, script/source hashes before and after, seed/ids, exact timing, dimensions, capture frames, assertions and limitations. Hash the actual transitive source inputs for a new reusable capture: the existing ocean receipt hashes only `game.ts`, `world-beasts.ts`, `monster-pack.ts`, `monster-render.ts` and `renderer.ts`, not every imported dependency. A commit alone does not identify dirty working-source footage. Reject source changes during a run and rerun after relevant edits. For reduced-motion previews, set the scratch game's `presentation.reduceMotion`; direct model drawing also needs actor `reduceMotion`, and direct `drawPackEffects` needs its reduced-motion options. The existing tableau checks pixel stability for boat/water decoration and that drawing does not mutate effect state. This does not certify accessibility of a whole new scene. Existing Glimpse playback holds sampled frames when `reduceMotion` is true; low quality lowers pixel scale/skips grain but does not itself select that still-frame branch. Any new integration must preserve suitable reduced-motion alternatives and separately check on-device performance, pause/resume, dismissal and save isolation.

#### Local evidence index (inspect availability before reuse)

All paths here are relative to the repository root and were inspected on 2026-10-21. `.local-validation/` is untracked; these artifacts and their dependencies are **not guaranteed in a fresh clone**. No `.mjs` example is added by this documentation marker.

- **Tableau:** `.local-validation/beast-ocean-native-preview.mjs`. When present and dependencies resolve, run from the repository root with `node .local-validation/beast-ocean-native-preview.mjs`. It writes `beast-ocean-native-preview.png` (1440×940) and `beast-ocean-native-preview.json` in that directory. Shows dry Walker, Walker/skiff, floating Crystal and water attack stages using native draw functions, with reduced-motion/non-mutation assertions. Its receipt does not include source hashes; add provenance for future reuse.
- **Scripted ocean scene:** `.local-validation/beast-ocean-gameplay-preview.mjs`; run, when available, with `node .local-validation/beast-ocean-gameplay-preview.mjs`. Outputs the same-stem `.mp4` and `.json`, `beast-ocean-gameplay-contact-sheet.png`, and four PNGs: `beast-ocean-water-volley`, `beast-ocean-sea-rifts`, `beast-ocean-active-nova`, `beast-ocean-after-nova`. The receipt records `fullGameUpdate: false`, `scriptedPlayer: true`, `humanPlaytest: false`, working-source hashes and `sourceChangedDuringRun: false`. Assertions include four water projectiles, unchanged ocean tiles, no scratch scar records and no remaining effects. These verify the scripted scenario only.
- **Frozen historical dungeon scene:** `.local-validation/release251-gameplay-preview.mjs` and same-stem `.mp4`/`.json`, plus `release251-gameplay-contact-sheet.png`. It asserts exact commit `a91cc8c54c088fc7430798c23b7e908722b6d1a1`, tree `dfdac0533c3e379bc049d2c257070f91e8c33d4d`, and no tracked diff. It will intentionally fail on later/dirty trees, including documentation changes. Do not weaken that guard or relabel old footage as current. Use an isolated matching historical checkout for historical reproduction, or author a new capture with new provenance for current work.

**Scope of this marker:** documentation only. It neither ships local debug tools nor certifies pending combat balance, final artwork, mobile performance or a new in-game cinematic feature.

---

## 6. Threads: stories across several dungeons

A thread runs like a hunt, but carries narrative. Each one is tracked in the Journal under **Active quests**.

1. **The Seven Bells** (the Smoke Meadows and the middle band). The Bell-founder's Daughter cast seven bells to call home the people the war took. They were scattered into seven crossings; each holds a cracked bell. Ringing a bell plays a short Glimpse of one lost person on a road, walking home. When the seventh rings, the final Glimpse plays: seven figures arrive at a door at dusk. The Daughter opens it, and none of them have faces. She lets them in anyway.
2. **The Surveyor's Chain** (across the middle and far bands). Abel Corwin's lost chain-links lie in dungeons; each comes with a page of his notes. With all twelve links, the last dungeon's map turns out to be the overworld. The thread ends at his statue.
3. **The Torn Pages** (one per region). Each region's deepest crossing holds a page torn from the Reciter's Tome. The pages belong to a book with no title. When all are found, the Tome gains a last book: blank, except that it slowly fills with the Wayfarer's own Journal. The Corridor has begun to read you. This is the closest the game ever comes to explaining itself.

The existing deep-dungeon story packages (the scorched echoes and memorials) get Glimpses instead of ticker lines. The summit stones' and grotto ruins' lore text, which is written but never shown, becomes touch-to-read.

---

## 7. What gets built, in order

Each step is one release, built and previewed for Tim before publishing.

1. **Regions and voices** (release 191):
   - regions with place names;
   - regional voice pools;
   - no repeated lines;
   - the joke lines retired;
   - "What the Corridor Remembers" with per-region fragment counts;
   - readable lore on stones and ruins.
2. **The Glimpse engine** and three first-person Glimpses for Tim to judge (release 193): the Wagon at Dusk, the Lantern, Faceted (compound eyes) and the Rule. They are drawn in Canvas 2D; WebGL is added when the sphere, crystal and gas Glimpses need it.
3. **More Glimpses**, with touch, entry and chance triggers. Glimpse fragments start counting, and no Glimpse is seen more than a few times.
4. **The Far Sleep made strange.** Dreamlands landscapes and dungeons for the far regions:
   - a new landscape generation version, used only for sections not yet explored;
   - existing journeys never regenerate.
5. **Gilgamesh** (Tim confirmed this is the legend he meant, so the Yoga Vasistha is set aside). The Glimpse "The Plant at the Bottom" is built (release 219). Still to do: the recited voice, taken from R. Campbell Thompson (1928) or Jastrow and Clay (1920) once a public-domain source text is reachable.
6. **Ilse, the Seven Bells, margins in crossings**, then ongoing: new Glimpses every pass, the Surveyor and the Torn Pages.

**Save:** one additive block, `save.lore`, holding:
- the heard lines (compact ids);
- fragments per region;
- witnessed Glimpses with their counts;
- thread progress.

It is normalised in `freshSave` and `migrateSave` at schema 14.

**Sources:** every quoted passage comes from public-domain editions (Maude, Garnett, Martin, Project Gutenberg and, if added, Mitra). Everything else, including Ilse, the Surveyor, the Bells and the Glimpses, is original writing for the game.
