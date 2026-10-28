# Release log: Claude ↔ Codex handoff

The shared record of which release numbers are live, in flight or reserved, kept so Claude and Codex never collide.
**Read this before you start a release. Update it in the same PR that bumps the number, and again when the release
merges, publishes or is dropped.** Newest first. Release numbers are odd, and each one is used exactly once.

## How to claim a number

1. Take the lowest number under **Next free number** below. Add a row to **In flight** with your name (Claude or Codex), the branch and one line on the scope, then move **Next free number** up by 2.
2. Do not reuse a number that appears anywhere in this file, even one that was dropped.
3. If you find your number already taken on `main` when you merge, renumber yours to the next free number. Tell Tim in your handoff.
4. When a release merges, add its preview id. When Tim publishes it, move it to **Published**.

## Next free number

**533**

## In flight

| Release | Agent | Branch / PR | Scope | State |
|---|---|---|---|---|
| 531 | Claude | `claude/dreamy-rubin-yn6q2p` | Spells and skills back to two glyph sockets (Tim): triads come from three-socket items | Building. |
| 529 | Claude | PR #248 | Triads: six three-glyph resonances; armor resonates only through triads; spells and skills get a third socket; the Needle Caster scales with Might | Merged (`r529-754c79acb8d9`). Not published. |
| 527 | Claude | PR #247 | Resonance gift for journeys under way; presets keep gear equipped; only world beasts announced in crossings; red crumbling floor; the vortex trap | Merged (`r527-47bdbf2d56cd`). Not published. |
| 255 | Codex | `codex/narrative-253` → rename to 255 | Daily narrative work: Codex's vision, with ten artistic passes per scene | Reserved. Codex was first told 253, but 253 went to Claude below, so Codex uses **255**. |

## Published (live)

| Release | Candidate | Published | Notes |
|---|---|---|---|
| 525 | `r525-5ba50cb08225` | 2026-10-28 | With 517–523: spell buttons drain gold (PR #242, #243), the save mirror once a minute (#244), sigil, lava and dart traps (#245), harder traps and the pitfall (#246). The pre-publish Fable review (515→525) found no blockers. |
| 515 | `r515-bf3734f5bbc0` | 2026-10-28 | Five Lattice field passives: Sanctum, Wellspring Ground, Charged Air, Spellblade, Drift Field (PR #241). The pre-publish Fable review (513→515) found no blockers. |
| 513 | `r513-e721fa71fa99` | 2026-10-27 | More brawler gear in drops; a full Pack keeps brawler gear you do not have (PR #240). The pre-publish Fable review (511→513) found no blockers. |
| 511 | `r511-87890decf80f` | 2026-10-27 | With 507–509: the submersible button, the robot in water, Echo hammers and a third tool shot (PR #237); the robot in the Far Sleep's star-voids (#238); Sleeper's Hall walls stay walls (#239). The pre-publish Fable review (505→509) found that hall-wall blocker, fixed in 511; the re-review (509→511) found no blockers. |
| 505 | `r505-ca3263066d7d` | 2026-10-27 | With 503: the new gear with Echo and the Shadow Clone, brawler gear in loot (PR #235); the Surveyor's Chain, part one (#236). The pre-publish Fable review (501→505) found no blockers. |
| 501 | `r501-a4148de6a998` | 2026-10-27 | With 495–499: Shadow Boxing with the hammer and sweep (PR #231), the scrolling spell row (#232), crossings indoors (#233), the smaller Jump button (#234). The pre-publish Fable review (493→501) found no blockers. |
| 493 | `r493-03686001c9f6` | 2026-10-27 | With 489–491: Iron Fists as a tool (PR #228), the rush to your target (#229), then fists as a weapon, Hammerfall and Great Sweep as tools and gear in presets (#230). The pre-publish Fable review (487→493) found no blockers. |
| 487 | `r487-99f7bac84927` | 2026-10-27 | With 481–485: lock → foe → tap aim, double Echo, Glimpses once, bigger buttons, scaling dodge bursts (PR #224); Hammerfall, Great Sweep, Iron Fist (#225); Aegis and Shadow Boxing (#226); Orbit Volley (#227). The pre-publish Fable review (479→487) found no blockers. |
| 479 | `r479-311e59963952` | 2026-10-27 | With 469–477: select-and-salvage and the aim mark (PR #218), the tapped lock as before (#219), real Margin Wardens (#220), reachable aperture objects and lava wading in the robot (#221), the plain eye-coloured sigil (#222), spells at your target and the starburst rift (#223). The pre-publish Fable reviews (467→477 and 477→479) found no blockers. |
| 467 | `r467-8f36ab8aa5d6` | 2026-10-26 | With 457–465: +10 upgrades (PR #211), Marginalia (#212), damage numbers and twenty marginalia (#213), tougher dungeons (#215), Watcher's shrines on the Atlas (#216), the Codex audit fixes (#217). The pre-publish Fable review found no blockers. |
| 455 | `r455-04c11a0d3b73` | 2026-10-26 | With 441–453: Listener-town Viewports and Keepers (PR #203), Atlas Wayglass order and Far Gate compass (#204), the instant jump (#205), Refuge meals (#206), the usable Crossing Sigil (#207), the Mislaid Threshold door (#208), labelled ways out (#209), margins (#210). The pre-publish Fable review found no blockers. |
| 439 | `r439-a6fb9615c252` | 2026-10-26 | No more landing in the dark: the last fixed dungeon landings settle onto the floor (PR #202). The pre-publish Fable review found no blockers. |
| 437 | `r437-415a6323864d` | 2026-10-26 | With 427–435: every boss hit in pink (PR #196), wounds that really stay and no Void Walker in dungeons (#197), the Seven Bells (#198), shovels everywhere underground (#199), mixed Far Sleep dungeons (#200), the Crystal out of the walls (#201). The pre-publish Fable review found no blockers. |
| 425 | `r425-187b382f915e` | 2026-10-24 | With 423: kept wounds, open dreams, open-world digging (PR #194), from Infinite II (#195). The pre-publish Fable reviews found no blockers. |
| 421 | `r421-45929eb37a4e` | 2026-10-24 | With 419: sharper auto targeting, the Build button holds a Shadow Clone, safe dungeon arrivals (PR #192); calmer bosses and the Knight's seekers (#193). The pre-publish Fable review found no blockers. |
| 417 | `r417-e82ec8d2169a` | 2026-10-24 | With 415: Ilse the Lamplighter (PR #190) and the Shadow Clone placed by holding (#191). The pre-publish Fable review found no blockers. |
| 413 | `r413-580567b8bd76` | 2026-10-24 | With 397–411: one pink for every hit warning (PR #181), regional kill experience (#182), the Psychic Crystal and daises on the map (#183), bosses on the dungeon map (#184), Crystal reach waves (#185), Void Walker pacing (#186), creatures on the Supernova scar (#187), the iron shovel's points (#188), stone as a resource (#189). The pre-publish Fable review found no blockers. |
| 395 | `r395-fc69302ceeff` | 2026-10-24 | With 383–393: smelting and the empowered robot (PR #174), the Morphling (#175, #177, #178), your journey, dig scaling and Shadow Clone (#176), whole-build presets (#179), the town smith (#180). The pre-publish Fable review found no blockers. |
| 381 | `r381-2e0c0ac5ef7c` | 2026-10-24 | With 377 and 379: the stagger governor and daises in every large dungeon (PR #171), the iron shovel and playtime (PR #172), and the iron shovel's 3-block reach (PR #173). The pre-publish Fable review found no blockers. |
| 375 | `r375-5713421fb42c` | 2026-10-24 | The Listener's Hall: a dais at the whole Gate (from the second Listener) to a fog-free arena (PR #170). The pre-publish Fable review found no blockers. |
| 373 | `r373-6fe1259fae38` | 2026-10-23 | The Mouth becomes a town: Listening Stone, Delvers' Exchange (PR #169). The pre-publish Fable review found no blockers. |
| 371 | `r371-1dc5d8e75332` | 2026-10-23 | Published with 369 (which never went live alone): the Listener's mirror form fights with reflections (369, PR #167); Listener towns and choosing a hometown (371, PR #168). The pre-publish Fable review found no blockers. |
| 367 | `r367-cff5c3a5b912` | 2026-10-23 | Published with 355–365 (none went live alone): map marks (355, PR #160); the Listener moves on (357, PR #161); secondary passives (359, PR #162); the Mouth stays open (361, PR #163); the Transit Lattice (363, PR #164); three Infinite III spells (365, PR #165); the Gravity Well swallows shots (367, PR #166). The pre-publish Fable review found no blockers. |
| 353 | `r353-77c263e939a9` | 2026-10-23 | Published with 349 and 351 (neither went live alone): world bosses a little more often (349, PR #157); Sleeper's Hall dream crossings in the Far Sleep (351, PR #158); a world boss stays hurt until it kills you (353, PR #159). The pre-publish Fable review found no blockers. |
| 347 | `r347-6aae356afb82` | 2026-10-23 | Published with 343 and 345 (neither went live alone): farther auto aim (343, PR #154); dying costs nothing, the world-boss tries switch (345, PR #155); steadier tap targeting, Oren retrains stats (347, PR #156). The pre-publish Fable review found no blockers. |
| 341 | `r341-6762df1cdaab` | 2026-10-23 | The potion tier toggle brews High and Max Potions from draughts as you drink; the crescent takes armor Volatile again (PR #153). The pre-publish Fable review found no blockers. |
| 339 | `r339-9f49bdbe23f2` | 2026-10-23 | Published with 335 and 337 (neither went live alone): glyph and buff wiring, the Arcanum follows the preset (335, PR #150); Echoes from every first kill, slain beasts grant missing Echoes (337, PR #151); potion tiers (339, PR #152). The pre-publish Fable review found no blockers. |
| 333 | `r333-3ab1b81cc983` | 2026-10-23 | The larger Threefold Deep's final gate opens onto the Choir again (PR #149). The pre-publish Fable review found no blockers. |
| 331 | `r331-46dddc4b8b03` | 2026-10-23 | Published with 329 (which never went live alone): a 4-second fallen pause after a world beast kills you (329, PR #146); world beasts catch up once per Listener kill from the third (331, PR #147). The pre-publish Fable review found no blockers. |
| 327 | `r327-ae92ea7193c7` | 2026-10-22 | Louder, brighter sound: the whole mix about 30 dB louder (PR #144). The pre-publish Fable review found no blockers. |
| 325 | `r325-7b4e702923fb` | 2026-10-22 | Published with 319, 321 and 323 (none went live alone): the dungeon ladder (319, PR #139); the drone (321, PR #140); no dungeon is sealed (323, PR #141); taste deeps open all the way with scaled creatures (325, PR #142). The pre-publish Fable review found no blockers. |
| 317 | `r317-0212d6f3ae04` | 2026-10-22 | Published with 313 and 315 (neither went live alone): the skill buff bar (313, PR #135); vehicle progression gates and the submersible robot (315, PR #136); the robot ashore (317, PR #137). The pre-publish Fable review found no blockers. |
| 311 | `r311-f82b84f1e1d4` | 2026-10-22 | Published with 301–309 (none went live alone): plain short dungeons, rarer themes, Watcher's daises (301, PR #129); the Poison Crypt (303, PR #130); the Far Sleep (305, PR #131); boss balance and tiered poise (307, PR #132); target lock and any-slot presets (309, PR #133); the submersible (311, PR #134). The pre-publish Fable review found no blockers. |
| 299 | `r299-f25a24dc4fb2` | 2026-10-22 | Published with 293, 295 and 297 (none went live alone): child-safe Glimpses and item icons (293, PR #125); armour glyphs and glyph layouts (295, PR #126); glyphs for Aperture skills (297, PR #127); five new dungeon environments (299, PR #128). The pre-publish Fable review found no blockers. |
| 291 | `r291-4bc624609d78` | 2026-10-22 | Published with 287 and 289 (neither went live alone): blocks as stairs and barriers, calm Crystal, dungeon caches, gold selection, Supplies line, four coffins (287, PR #122); the Watcher's sigil in the world (289, PR #123); preset item buttons, back button, Crossing Sigils (291, PR #124). The pre-publish Fable review found no blockers. |
| 285 | `r285-d5a533b38404` | 2026-10-22 | Published with 281 and 283 (neither went live alone): buttons light on touch, probe logs dodges, Leech floor, stray ">" removed (281, PR #119); deadly dungeon water, grey rot band, crypt sigil, Supplies and Continuous build (283, PR #120); the Psychic Crystal comes out to fight (285, PR #121). The pre-publish Fable review found no blockers. |
| 279 | `r279-880fe40d0946` | 2026-10-22 | The compass keeps its choice; Proving Ground test tile, environment list, Start test (PR #118). The pre-publish review found no blockers. |
| 277 | `r277-ce71a38b8a17` | 2026-10-22 | Published with 273 and 275 (neither went live alone): world beasts by Aperture tier, four sigils per horde, Stage 1 canon (273, PR #115); creature stages, the Stage 1 strength freeze, a rock gives one stone (275, PR #116); supply caches give a stone, a wood and a draught, Broken Observatories hold a cache (277, PR #117). The pre-publish review found no blockers. |
| 271 | `r271-ad06c7fbd51e` | 2026-10-21 | Published with 269 (which never went live alone): the Gate Revenant horde, skiff repairs, the hull guard's longboat, cheaper building (269, PR #113); Gate Revenants stalk then hunt through walls, dodge, poise break, the new Revenant with its barrage maw (271, PR #114). The pre-publish review found no blockers; its two notes were fixed before merge. |
| 267 | `r267-345b89326368` | 2026-10-21 | Published with 263 and 265 (neither went live alone): Echo drops fixed, Crossing Sigils, safe dungeon arrivals, hull shields, 2-dig shovels (263, PR #110); building, the Refuge's farm, quarry, Hollis and Shale, regrowth, icon buttons (265, PR #111); build mode and the wall-trap fix (267, PR #112). The 265 review found the wall trap; the 267 re-review found no blockers. |
| 261 | `r261-2215f2781a82` | 2026-10-21 | World-boss pacing and placement; the Questing Beast's sea rules; the Mountain Turtle at sea on ice; 99 wood and stone, two skiffs; HUD rearranged with spell presets (PR #109). The pre-publish review found no blockers. |
| 259 | `r259-a490b918fa7e` | 2026-10-21 | World beasts pursue (3 crossings, Blob 1); Blob split; Glyphs fix; Rift Step without recall; Pack tabs; back button; carry limits and the 1+1 shovel; Psychic Crystal poise, dungeon bounds and hunting (PR #108). The pre-publish review found no blockers. |
| 257 | `r257-204a3837382b` | 2026-10-21 | The Lightning Giant world boss; the Giant at sea on his cloud; Supernova fog at sea (PR #107). The pre-publish review found no blockers. |
| 253 | `r253-447383f7b357` | 2026-10-21 | The Void Walker boards the Astral Worm; Astral pair rules; release log (PRs #105, #106). The re-review after the leave-roll fix found no blockers. |
| 251 | `r251-567504e5a114` | 2026-10-21 | The Void Walker, Astral Worm, Gate Revenant, Blob regeneration, ocean; review fixes; Griffin art; plinth saddle (PRs #103, #104). Pre-publish review found no blockers. |
| 249 | `r249-4a43f3ccc5cd` | 2026-10-20 | Psychic Crystal continuation (orbital lasers, Knight homing orbs) |
| 247 | `r247-5d8a8126e8b6` | 2026-10-20 | |
| 243 | `r243-79e75c3186cb` | 2026-10-20 | |
| 241 | `r241-45286473b10a` | 2026-10-20 | |
| 239 | `r239-0a2af28b4090` | 2026-10-20 | |

The full history is in `CHANGELOG.md`, in `git log origin/gh-pages` ("Promote r…") and in `docs/HERMES_PROJECT_FIELD_GUIDE.md`.
