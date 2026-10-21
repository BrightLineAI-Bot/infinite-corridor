# Void Walker — owner design record and review contract

Recorded 2026-10-21 UTC / 2026-10-20 UTC-04; updated through S7 retreat-completion clarification, following S4 terrain/fog/aftermath and S5 smooth-circle/subtle-crack corrections. This document is a detailed handoff for the next developer or reviewer, including Claude/Anthropic models. It records **what Tim described**, not a claim that the implementation already satisfies it.

## Read this first

1. Read [the original source transcript](void-walker-source-transcript.md), especially S2. It deliberately retains dictation errors and self-corrections.
2. Use the stable requirement IDs below when implementing, reviewing, testing, or discussing omissions. Do not silently reinterpret the design to fit existing code.
3. Inspect the actual diff, tests, and rendered behavior. Every requirement starts **NOT YET VERIFIED** here, including those an implementation may already appear to cover. Tests passing in an earlier routing-only checkpoint do not establish these combat requirements.
4. Record implementation choices and deviations separately from owner requirements. A suggested tuning value is not a user-approved value.
5. Follow `AGENTS.md` for protected files, test changes, migrations, release workflow, and publication. This design record does not authorize publishing. Prior Crystal-release approvals are not standing approval for this release.

## Source hierarchy and terminology

- **S1:** player-size clarification, owner message `Sentinel_6db4dd3f2c388191aa4abfecd469d4d0`.
- **S2:** full dictated design, owner message `Sentinel_d648802108108191a61503af9eca4677`.
- **S3:** preserve detailed repository notes for later Claude review, owner message `Sentinel_3a9a71525a108191bada050d4bbf4dfb`.
- **S4:** walls may be bypassed/consumed, exploration fog stays unchanged, active supernova is visible through fog, and harmless crisp-white/red-cracked aftermath persists forever in overworld and underworld; owner message `Sentinel_85f7443ee8d481919d3e820545a343f8`.
- **S5:** visible aftermath must have an actual smooth circle matching the supernova, not a pixelated/tile-stepped circle, with fewer, subtler cracks; owner message `Sentinel_05d976388b308191a60bb909abc4965f`.
- **S6:** retreat goes to the nearest dungeon door, can jump, and follows regular terrain rules; owner message `Sentinel_bc97dff018dc81918643dcf631ed5d61`. “Chump” is normalized to “jump” in the design, while the source stays verbatim.
- **S7:** reaching a dungeon door ends the encounter, including a lower-floor doorway/stair passage; no simulated journey all the way to the outside entrance. Owner answer `Sentinel_b2434e2affe881919c5f40fe1191eeda` is preserved with its assistant context question `Sentinel_9acb6fa0ffb4819196d170c138b770df`. Ordinary terrain/jumping on the route remains governed by S6.
- **P1:** prior project context in `docs/HERMES_PROJECT_FIELD_GUIDE.md`: overworld and dungeon appearances; dungeon roaming; dungeon entrance as retreat/home. This is repository-recorded owner context, not a newly recovered verbatim quote.

Normalize “boardwalker,” “Ford Walker,” “void night” and similar dictation to **Void Walker**. Normalize the many “rands/rents/reds/rems/runs” forms to **void rends/rifts**. The likely intended transient creatures are **void wraiths**, but S2 transcribes that word inconsistently. Preserve these normalization decisions as interpretations, not literal quotations.

The reference to **JP from Street Fighter 6** establishes inspiration for remote rifts, phantoms, ground spikes, and teleport options. It is not an instruction to copy JP's exact animation, appearance, audiovisual assets, frame data, or entire move set. No outside franchise material is required to understand the owner's specified mechanics.

## Core encounter identity

The Void Walker is a player-sized, main-character-like opponent whose fast offense mostly originates from purple cosmic rends rather than conventional hand-to-hand animation. He applies spatial pressure through remotely placed attacks, brief wraith incursions, pulling singularities, and a tracking constellation of portals. His large supernova changes the arena itself, consumes dungeon walls, launches radial waves, and combines with repeated teleport-to-dash passes and short-lived damaging trails.

This is not a giant boss, a stationary portal turret, a persistent army summoner, or the Psychic Crystal with a new color. Main-character-like scale/model does not specify armor, a hood, facial features, body color, equipment, or exact silhouette details beyond that relationship.

## Owner requirements and acceptance criteria

**Status for every row in this section: NOT YET VERIFIED.** The evidence ledger below is the place to promote a row after inspection. “Review” means both automated behavior checks where practical and actual game-rendered observation; synthetic model mockups alone are insufficient.

### A. Body, world presence, and visual language

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-A01 | S1, S2 | Approximately the same size and about the same model as the main character. | Side-by-side actual game rendering at equal depth/terrain height; verify final spawned scale, not only a base-model constant. Check boss-size inflation cannot enlarge him inadvertently. |
| VW-A02 | S2 | Rifts look like purplish voids containing a universe, galaxy, or star-like space. | Visible cosmic interior and purple identity at normal gameplay scale; distinguish portals from generic flat purple disks. |
| VW-A03 | S2 | Rifts open in space and attacks can originate from multiple locations around the screen. | Spatially separated openings with actual remote attack origins, not all effects emanating from the Walker's body. |
| VW-A04 | S2 | Most attacks are fast, rift-originating attacks; he need not use his own hands for them. | Combat selection and animations preserve the remote-attacker identity. “Fast” is qualitative, not zero-warning permission. |
| VW-A05 | P1 | Appears in overworld and dungeons; roams dungeons so the player can find and fight him. | Encounter eligibility and off-screen roaming tested in both world modes, without accidentally inheriting Crystal-only water eligibility. Exact frequency/level/depth gates remain tuning choices. |
| VW-A06 | P1, S6, S7 | Retreats to the nearest dungeon door using ordinary movement/terrain rules, including jumping; reaching a physical dungeon doorway or interlevel doorway/stair passage ends the encounter and he disappears there. | Verify actual path traversal, legal jumps, terrain/elevation/hazard handling, arrival and cleanup, rather than an instant position change before arrival. A failed route must not trigger fallback retreat teleport or wall phasing. On a lower floor, arrival at the selected door completes retreat without simulating travel through other floors to the outside entrance. The parent's “nearest reachable dungeon door” interpretation is documented in I-21; “reachable” was not in Tim's literal wording. Do not imply an isolated path helper alone implements the complete retreat. |
| VW-A07 | S3 and earlier preview request | Preserve detailed design notes and show actual models during construction. | Maintain this record, source transcript, and review evidence. Clearly label preview images as implemented model, provisional art, or scale guide. |

### B. Ordinary rend attacks and void wraiths

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-B01 | S2 | Claws and swords/blades emerge from rends to attack. | Distinct readable protruding attack forms and corresponding hit regions. Do not satisfy all named forms with an indistinguishable particle projectile. |
| VW-B02 | S2, explicit correction | Hands emerge to slam down at the player; **hands rather than fists**. | Open-hand/slamming visual and appropriate landing contact. The earlier tentative “fists” wording is superseded. |
| VW-B03 | S2 | Void spikes can erupt from the ground. | Ground-origin telegraph, eruption, and damage rather than an aerial projectile mislabeled as a spike. |
| VW-B04 | S2 | Void slashes can shoot from rends. | Visible outward slash attacks with actual trajectory/hit behavior. |
| VW-B05 | S2 | Void wraiths/phantoms emerge from rends, threaten the player briefly, make a couple of swings/slashes, then do not persist. | Finite lifetime, finite attack count, and owner cleanup. No durable unrelated creature spawn or accumulating persistent army. |
| VW-B06 | S2, later clarification | Wraiths move in straight lines from their rend toward the character. | Test a moving target: the committed travel segment remains straight, not continuously curving homing. The exact target-sampling instant and whether a later attack can re-aim are interpretation choices. |
| VW-B07 | S2 | Multiple rend attacks can be active, including remote threats from different screen positions. | At least some bounded overlapping threat combinations; not an implementation that serializes the entire kit into one threat at a time. |

### C. Persistent rends and teleport/evasion

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-C01 | S2 | Some rends persist in space for a while. | Portal lifetime spans placement and later use; not every portal is a single-frame effect. Exact duration and reuse limits outside the constellation are open. |
| VW-C02 | S2 | Walker can teleport to different rends and attack through them. | Actual position change and portal-origin combat; no cosmetic teleport that leaves the damage origin elsewhere. |
| VW-C03 | S2 | He can open a rend and use teleportation to evade the player's attacks. | At least one intentional, readable evasion use; explain invulnerability, eligibility, and cooldown choices rather than granting perpetual untouchability. |

### D. Player-tracking constellation move

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-D01 | S2 | A special move creates multiple rends arranged around the player like a constellation. | Clearly distinguish this coordinated move from unrelated random portals. |
| VW-D02 | S2 | The constellation follows the player as the player moves across the stage. | Portal formation center tracks the player over time; test movement rather than a stationary target only. Tracking bounds and termination must be explicit. |
| VW-D03 | S2 | Sometimes three or four, and up to six rends. | Variable bounded formation sizes including the stated small examples; never exceed six for this move. No requirement that every count be equally probable. |
| VW-D04 | S2 | Walker can emerge/teleport or dash from a constellation rend; a wraith can emerge; a laser/beam can fire. | Demonstrate each named category. A later phrase suggests creatures instead of lasers, but subsequent explicit concurrent “void [wraith] and a laser, and him teleporting” confirms the mixed set. |
| VW-D05 | S2, interpretation I-04 | One spawn/use per constellation rend, while different rends may activate together or in rapid succession. | Track per-rend consumption. Do not confuse a per-rend limit with a global one-wraith/one-attack limit. See ambiguity register: whether a beam pulse counts as a separate activation must be declared. |
| VW-D06 | S2 | Mixed attacks can overlap: wraith, laser, and Walker teleport, producing several simultaneous problems. | Demonstrate a mixed volley/sequence, including overlapped hazards where intended; avoid accidentally serializing all categories. |
| VW-D07 | S2 | Punishing, but not “crazy punishing.” | Document pressure tuning and real escape opportunities. Exact warning durations, safe gaps, damage, and concurrent caps are implementation/balance decisions, not numbers supplied by Tim. |

### E. Event horizon and optional pulsar

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-E01 | S2 | An event horizon forms in space and pulls the character toward it. | Actual bounded force/displacement toward its own center, with visible location and lifetime. Exact radius/strength are tunable. |
| VW-E02 | S2 | Being pulled into the event horizon damages the character. | Test center/contact damage independently of pulsar beam damage. Pulling alone is not complete implementation. |
| VW-E03 | S2 | Some event horizons have a pulsar function; others do not. | Verify both variants occur; do not make all horizons laser sources. |
| VW-E04 | S2 | A pulsar fires an energy beam in one specific direction, pulsing periodically roughly two or three times. | Stable declared direction for a pulse sequence and distinct temporal pulses. No unrequested rotating all-direction sweep. Exact pulse duration/gap and whether the initial firing is counted among the two or three must be declared. |

### F. Supernova area, charge, and terrain consumption

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-F01 | S2, S4, S5 | A charged supernova spreads a large void region around the Walker, with galaxy/universe/star-like presentation; its consumed footprint is circular. | Visible staged charge and a spatially bounded circle; it is not merely a whole-screen white flash. S4 briefly mentions a semicircle then restates a circle; S5 explicitly requires a true smooth circle matching the supernova. Exact radius, growth time, and whether the origin remains fixed after casting are open. See VW-F13 for visible boundary acceptance. |
| VW-F02 | S2, S4 | The move and permanent aftermath operate in a dungeon/underworld or the overworld. | Exercise both scene types, not just an isolated showcase. The former assumption that permanent aftermath was specified only for dungeons is superseded by S4; see I-07. |
| VW-F03 | S2 | During charging there is pulling of the player and scattered explosions. | Separate charge-stage pull and local eruption/explosion activity, followed by the main blast. Anchor, strength, counts, and warning durations are open. |
| VW-F04 | S2, S4 | The spreading supernova consumes/erases walls within its circular radius and may bypass their physical obstruction. | Both rendered walls and their collision/occlusion state must change; invisible remaining colliders fail. Do not preserve interior walls solely to enforce the former physical route/progression barrier. Do not apply wall destruction to every ordinary rend attack. |
| VW-F05 | S2, S4 | After supernova, consumed walls remain absent and the area becomes permanent crisp-white ground with red cracks, a visible record of damage to the corridor. | Supersedes merely temporary geometry suspension and the earlier unspecified floor-art choice. S4 now explicitly requires permanence, not just a cross-reload policy chosen by the developer. See VW-F09–F12 for fog, harmlessness, persistence, and presentation. |
| VW-F06 | S2 | Do not leave the player trapped in restored walls, floor problems, or pits after the move. | Check player/actor placement during and after transformation, lethal terrain and vertical transitions, map boundaries, and movement out of the area. Avoid a cosmetic floor overlay over lethal collision. |
| VW-F07 | S2 | Walls beyond the void region can remain and block outgoing blast particles. | Differentiate terrain consumption radius from projectile travel; do not destroy the whole dungeon merely because a wave crosses it. |
| VW-F08 | S4 | Supernova consumption bypasses walls, including their role as physical route barriers within the affected circle. | A policy that refuses the cast or retains otherwise consumable interior walls merely because the region protects progression is superseded. Physical passage does **not** itself mean a quest, guardian, or reward condition is completed; verify those state machines separately. |
| VW-F09 | S4 | The attack does not remove black exploration fog or mark previously unexplored areas explored. The active supernova can be seen through the fog as an overlay. | Compare exploration/fog state before and after the full attack. Render the active effect through darkness without revealing underlying terrain or setting discovery flags. Unexplored scarred terrain remains subject to normal exploration after the transient effect ends. |
| VW-F10 | S4, S5 | The finished scar is crisp white, rent by fewer, subtle red cracks, and causes no damage after the supernova is over. | Verify the final surface in both world modes and after reload. S5 replaces the dense crack treatment with a visually quieter one; see VW-F14. Remove attack hitboxes/forces on completion; do not turn permanent cracks into lava, damaging trails, or lingering harmful eruptions. Active finite aftermath eruptions from VW-G04 must finish before the scar-only state. |
| VW-F11 | S4 | The scar persists forever in the affected overworld tile/section or underworld/dungeon, recording the world's history of passage and damage. | Save, unload, leave/re-enter, reload, and revisit without fading, resetting, regenerating away, or losing the consumed-wall state. Storage compaction may change representation but must not erase visible history. |
| VW-F12 | S4 | The permanent mark is a static feature, not a new map marker or interactable. | No scar-specific map pin, pickup, interaction prompt, or required repeated simulation. Existing map/world behavior should not expose an unexplored scar as newly discovered information. |
| VW-F13 | S5 | The visible permanent aftermath boundary is an actual smooth circle matching the supernova's shape, not the pixelated/tile-stepped circle previously shown. | Inspect actual game-rendered before/after screenshots at normal scale and enlarged detail. No block staircase silhouette from the tile grid. The underlying discrete terrain mutation representation may remain tile-based, but it must not dictate the visible circular perimeter. Normal display rasterization is not a reason to retain tile-sized steps. |
| VW-F14 | S5 | Reduce the amount of red cracks so the scar is more visually appealing and subtle. | Compare against the prior dense treatment. Use a sparse, quieter crack composition that leaves clear white space; avoid one conspicuous crack pattern per tile. Finer strokes are a proposed rendering means, not a specified numeric width. Exact crack count, spacing, thickness, and intensity remain artistic tuning choices. |

### G. Supernova blast and aftermath

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-G01 | S2 | Main supernova is a massive outward energy explosion/wave in all directions. | Readable central blast plus radially outward damaging propagation, not only static area damage. |
| VW-G02 | S2 | It may be represented by small particles in roughly two or three outward waves. | Multiple bounded radial waves consistent with the owner's suggested realization. Exact particle count, spacing, speed, origin tracking, and wave interval remain choices. |
| VW-G03 | S2 | Individual portions/particles stop when encountering surviving walls outside the void area; they need not pass through or above walls. | Per-projectile or per-segment collision: blocked sectors stop, unblocked sectors continue. Test high delta time/swept collision rather than endpoint-only tunneling. |
| VW-G04 | S2 | Multiple small eruptions continue inside the created void area after the big supernova explosion. | Explicit aftermath phase after the main blast, finite lifetime and localized area, not only pre-blast decoration. |

### H. Teleport-dash barrage during supernova

| ID | Source | Requirement | Acceptance/review target |
| --- | --- | --- | --- |
| VW-H01 | S2 | During supernova, Walker repeatedly teleports to points around the player and dashes through/toward the player's location. | Multiple teleport-then-dash cycles; starting points are localized in an area/radius around the player rather than unrestricted random points across the entire world. |
| VW-H02 | S2 | Each dash is a straight line toward the player's position at the beginning of that dash; it does not curve. | Snapshot target for each dash independently. Moving after commitment can evade; no mid-dash homing/trajectory bending. |
| VW-H03 | S2 | Walker's body contact during a dash hurts the player. | Swept contact damage across the dash path, with deliberate per-pass hit rules rather than frame-rate-scaled repeated damage. |
| VW-H04 | S2 | The barrage continues to target the player even outside the supernova area. | Leaving the void region does not by itself end the dash series. Define normal scene-change/death/retreat cleanup separately; this is not permission to chase across unloaded scenes forever. |
| VW-H05 | S2, final correction | Dash streaks/afterimages persist about one second and damage the player who enters them, like a dash hit. | Visible short-lived path residue with matching hit geometry and lifetime. Earlier cosmetic-only language is superseded by later explicit damage. Exact damage equality and repeated-hit immunity remain tuning choices. |

## Explicit interpretation and ambiguity register

| ID | Ambiguity or evolving wording | Current interpretation / required decision |
| --- | --- | --- |
| I-01 | Opening phrase “Enables the user to paranize like before you branding attacks” is not intelligible. | Do not invent paralysis, parries, branding, or another mechanic from it. Clarify only if needed; the subsequent detailed rend description is usable. |
| I-02 | Fists are initially listed, then explicitly replaced with hands. | Open hands/slams are the final instruction. Claws and swords remain distinct listed forms. |
| I-03 | Wraiths first “chase” briefly, then “move in straight lines.” | Implement transient straight-line approaches, not continuous curved homing. Whether each subsequent swing permits a new straight segment is unresolved. Clearly label a default if chosen. |
| I-04 | Constellation says “one spawn per” rend, later emphasizes multiple types concurrently. | Parent interpretation: one activation/use per constellation rend, mixed activations across different rends may coincide. This is stricter than only one simultaneous creature per rend; keep the distinction visible for owner review. A pulsed beam could be one activation with a finite pulse sequence, not repeated fresh portal spawns. |
| I-05 | Dash trails first described as cosmetic, then as damaging when walked into. | Final damaging, approximately one-second trail wins. Do not reduce it back to cosmetic-only without an explicit change. |
| I-06 | Geometry first “suspended for a while,” then walls erased/destroyed and absent after the move. | **Resolved by S4.** The earlier parent interpretation of persistent dungeon floor is superseded by an explicit owner requirement for permanent consumed terrain/scars in both world modes. No restoration into the player and no automatic scar expiry. Save representation remains an engineering choice. |
| I-07 | S2 mentions overworld then corrects the terrain example to dungeon. | **Earlier conservative dungeon-only permanence assumption superseded by S4.** Consumed walls and permanent aftermath apply in overworld and underworld; physical route bypass is intended. Do not use a generic protected-progression-region refusal to nullify that choice. Exact treatment of non-wall quest entities, entrance objects, towns/NPCs, and coordinate integrity still requires explicit implementation policy; consuming a wall must not silently mark an unrelated quest/reward complete. |
| I-08 | “Not the whole screen” and “a large area” have unclear dictated intermediate words. | A large bounded radius, not automatic full-map/full-screen conversion. Size is a tunable value, to be shown at normal gameplay scale. |
| I-09 | Main blast is “one large explosion,” later two or three particle waves. | One supernova event may contain a short two/three-wave burst. Not multiple unrelated full supernovas unless explicitly chosen. |
| I-10 | Pull center, charge anchor, explosion origin while Walker teleports are unspecified. | Choose and document whether cast origin is fixed and which forces follow it. A moving boss must not silently drag already-committed projectile origins in a surprising way. |
| I-11 | Timing relationship between charge, barrage, main blast, and aftermath is broad. | All described phases must exist; exact overlap/order durations are tuning choices. Show timeline and verify phase transitions/cleanup. |
| I-12 | Pulsar is “one energy beam” then two/three periodic pulses. | Fixed direction during the sequence; count/initial-pulse convention documented. No evidence for rotating or player-tracking beam direction after commitment. |
| I-13 | Model “about the same” as main character; purple explicitly describes voids. | Reuse comparable humanoid proportions/rig as appropriate. Body costume, skin/armor color, face, weapon, and silhouette remain provisional art choices, not sourced requirements. |
| I-14 | Ordinary wall movement/phasing was unspecified in S2; S6 specifies normal terrain rules for retreat. | Crystal-only free wall phasing is not inherited. **Route resolved by S6:** ordinary terrain traversal, with jumping, not phasing or fallback teleport. **Completion resolved by S7:** disappear on reaching a dungeon door, including an interlevel passage; do not simulate subsequent cross-floor travel. Walker's explicit combat teleports/dashes and supernova geometry changes remain separate and require their own legal-placement/collision rules. |
| I-15 | Teleport contact, dash distance, landing safety, and out-of-area wall collisions are unspecified. | Establish deliberate safe endpoints and collision handling. Never label arbitrary solid-wall or out-of-bounds placement as required merely because teleport is allowed. |
| I-16 | S4 says “destroy everything” while repeatedly specifying consumed walls and the changed ground. | Wall/terrain consumption and physical route bypass are explicit. Automatic deletion of every actor, quest object, reward, entrance, or saved entity is not enumerated. Declare any non-terrain preservation/relocation policy without reintroducing interior physical wall barriers. Foundational map-coordinate validity is an engineering safeguard, not a user-specified immunity radius. |
| I-17 | S2 has damaging post-blast eruptions; S4 says red cracks cause no damage after supernova. | Treat finite eruptions as part of the still-active supernova aftermath, then transition to a static, harmless scar-only state. Do not retain damaging crack geometry permanently. Exact active-aftermath duration remains tuning. |
| I-18 | Active supernova is visible through fog, but unexplored areas stay unexplored. | Render the transient attack overlay independently of exploration state; do not reveal the underlying map or set discovery flags. Permanent scars have normal visibility/exploration rules once active effects end. This rendering split should be reviewed explicitly. |
| I-19 | S4 required a circle; a tile-based approximation was subsequently rejected by S5. | **Resolved by S5:** the visible scar perimeter must be a smooth circle matching the supernova. A discrete collision/mutation mask is an implementation detail, not permission to show a tile-stepped outline. Preserve prior source wording and recognize this as a visual correction, not a change to exploration, persistence, or damage rules. |
| I-20 | S5 asks for fewer/subtler cracks but supplies no numerical art parameters. | Reduce density and visual weight relative to the rejected image. “Fewer finer subtle red cracks” is the parent's implementation-oriented reading; fine stroke thickness is not an owner-specified number. Validate the actual rendered result visually rather than declaring success from changing a count constant alone. |
| I-21 | S6 says “nearest” dungeon door and normal terrain rules; a physically nearest door may have no legal route. | Parent interpretation is **nearest reachable dungeon door**, not a verbatim owner phrase. Declare whether distance means legal route cost or geometric distance among reachable candidates, and define tie-breaking. If no door is reachable, use a safe bounded wait/replan outcome rather than teleporting, phasing, crossing forbidden terrain, or claiming arrival. This fallback policy is an engineering choice. |
| I-22 | A retreat teleport fallback had been proposed before S6. | **Superseded by S6:** do not use that proposal as authority for teleporting to the exit after path failure or a timeout. Combat-rend teleport/evasion and supernova dash teleports remain explicitly requested moves; this correction governs movement before retreat arrival only. S7 authorizes disappearance at the reached dungeon door, not fallback teleport to it. |

| I-23 | Earlier lower-floor retreat question: nearest doorway/stair passage or outside entrance? | **Resolved by S7, read with its exact context question:** reaching the selected physical dungeon door/interlevel passage ends the encounter. The outside-entrance-only requirement and simulated cross-floor return journey are superseded. His greater control of the corridor explains the departure, but does not revoke S6 terrain/jump rules on the route or authorize disappearing before arrival. Door classification and a small collision-safe arrival tolerance remain engineering choices. |

## Implementation safeguards and tuning choices (not additional owner quotations)

The following are engineering/balance obligations or proposed policies. They should not be presented to a later reviewer as Tim's verbatim mechanics:

- **Fairness:** readable warnings, attack commitment windows, dodge opportunities, and bounded overlaps. Tim requested fast and potentially punishing attacks, not unavoidable hits. Exact telegraph lengths and recovery durations must live in tuning data.
- **Collision:** use swept/continuous checks for fast dashes, beams, trails, and projectiles; define per-attack/per-target hit cooldowns. Do not multiply damage with frame rate, overlapping segments, or several contact samples of one attack.
- **Geometry integrity:** preserve valid map coordinates and viable exits as foundational implementation safeguards. Define treatment of non-wall guardians, stairs/entrance objects, interactables, loot, corpses, actors, elevation, water/lava/pits, and decorations. **Superseded assumption:** a general preference for preserving progression barriers or rejecting a cast in a protected progression region is not permitted to override S4's physical wall bypass. Doors/gates that act as consumable physical walls must be evaluated accordingly; consuming them need not complete quest/guardian/reward state. Any unavoidable map-boundary exception must be explicit and narrowly justified, not silently expanded into interior immunity zones.
- **Persistence:** permanent scar history in both modes is now an owner requirement. Terrain consumption must not regenerate an existing journey. Use additive storage compatible with current schema/generator pinning; preserve old saves and unknown fields. Bound the work per update and use compact storage, but do not silently cap history by expiring old scars. Decide exact-resume behavior for every attack phase and changed tile. Persist changed gameplay terrain and static visual history, not large cosmetic particle histories.
- **Lifecycle:** death, retreat, scene transition, unload, pause/background, and reload must handle every portal, hazard, wraith, pull force, projectile, and trail consistently. Do not leave invisible damage or a pull from an absent owner. Define whether already committed attacks survive owner death; default cleanup is an implementation choice.
- **Budgets:** cap portals, wraiths, damaging trails, eruptions, projectile waves, and pathfinding work. Never allow cosmetic effects to evict warning/damage state. Multiple visually convincing threats are required, but no unbounded summon or effect growth.
- **Determinism:** choose random attack locations through established seeded mechanisms where needed; test repeated snapshots. Do not pollute deterministic base generation or change unrelated encounters.
- **Retreat navigation:** ordinary walking/jumping rules must govern the entire route and actual motion, not merely endpoint selection. Distinguish an exhausted search budget from a demonstrated unreachable door. Replan after terrain mutations and avoid unsafe jump landings. Selection, search budgets, no-route waiting, and tie-breaking are implementation choices; none authorize fallback teleport contrary to S6. S7 completes retreat at the reached physical dungeon door/interlevel passage, with disappearance and encounter cleanup rather than a simulated cross-floor trip.
- **Accessibility/mobile:** preserve reduced-motion/quality-tier behavior while retaining essential telegraphs. Tests are not proof of on-device performance; disclose untested device behavior.
- **Tuning table:** record damage, attack cadence/weights, lifetimes, radii, force caps, particle counts, wave spacing, dash count/speed/distance, and collision widths in data rather than scattered literals. Apart from approximately one-second trails, constellation counts, and suggested two/three pulses/waves, Tim supplied no exact balance numbers.

## Reviewer procedure and evidence ledger

For each requirement ID, record **implemented path/symbol → automated test → visual/manual evidence → result/deviation**. Valid results: NOT YET VERIFIED, PASS, PARTIAL, FAIL, or DEFERRED WITH OWNER AGREEMENT. A code path existing is not by itself PASS. Do not change a requirement to make a failing implementation pass.

| Requirement set | Initial result | Evidence needed |
| --- | --- | --- |
| VW-A01–A07 | NOT YET VERIFIED | Player/Walker size screenshot, actual final scale, overworld+dungeon scene behavior, roaming, nearest-door retreat through ordinary terrain/jumps without fallback teleport, arrival disappearance at a lower-floor passage without cross-floor simulation, source records. |
| VW-B01–B07 | NOT YET VERIFIED | Each named attack visually recognizable; straight finite wraith motion and finite swings; overlapping attack test. |
| VW-C01–C03 | NOT YET VERIFIED | Portal placement/lifetime, real teleport, evasion cooldown and collision/lifecycle tests. |
| VW-D01–D07 | NOT YET VERIFIED | Moving-player constellation, counts 3–6, per-rend consumption, concurrent mixed volley, practical dodge opportunities. |
| VW-E01–E04 | NOT YET VERIFIED | Pull-only and pulsar variants, center damage, fixed-direction two/three-pulse sequence, cleanup. |
| VW-F01–F14 | NOT YET VERIFIED | Circular void growth and smooth non-tile-stepped matching scar perimeter, wall/collider consumption with physical route bypass in both modes, unchanged fog/discovery with active overlay visible through fog, permanent harmless white floor with sparse subtle red cracks, old-save/reload/revisit and coordinate/exit integrity, no new map marker/interactable. |
| VW-G01–G04 | NOT YET VERIFIED | Two/three outward waves, partial wall occlusion, high-delta collision, separate aftermath eruptions. |
| VW-H01–H05 | NOT YET VERIFIED | Teleport/dash sequence on moving player, fixed straight snapshot targets, body/trail contact, one-second expiry, player outside area. |

### Required adversarial scenarios

- Player moves rapidly during constellation tracking and changes direction immediately after a dash commits.
- Player leaves the supernova radius while the barrage remains active, but also changes scenes or dies during it.
- Walker or player begins near a map edge, an enclosed room, a locked door, a staircase, an elevation corner, or lethal terrain.
- A supernova consumes the wall supporting an adjacent visual boundary; verify no invisible collider, lethal floor, detached interaction, or unreachable exit remains.
- Some wave particles hit surviving walls while others have clear paths; verify only the blocked sectors stop.
- Horizon pull, a beam, a wraith slash, and a dash trail overlap. Verify damage is intentional, bounded, and not repeated per frame.
- Pause/background and reload during charge, terrain conversion, teleport, dash, radial burst, and aftermath. Verify frozen timers/exact-resume decisions, no doubled mutation/reward, and no stale owner hazards.
- Save and revisit the affected dungeon. Verify terrain aftermath and required navigation without re-running generation or re-destroying unrelated data.
- Repeat permanent-history tests in an overworld section, including overlapping scars and long sequences of revisits; ensure compacting mutation records does not expire earlier damage marks.
- Cast into an unexplored area across a physical wall/gate. Verify the active overlay is visible through the fog while exploration flags stay unchanged, the wall is consumed rather than protected solely for progression, and no quest/guardian/reward is silently marked complete.
- After every active eruption and trail expires, stand on white ground and red cracks: no damage or pull, no scar interaction prompt, and no scar-specific map marker. Then save/reload and repeat.
- Compare the active supernova circle and finished scar at the same scale/position in both world modes. Inspect the perimeter for tile-sized steps and the crack pattern for excessive density; confirm fog masking does not alter exploration state merely to show the circle.
- Retreat with multiple dungeon doors, a nearer blocked door, a farther reachable door, a legal jump route, and no legal route. Check actual traversal and landing against ordinary terrain rules; verify search exhaustion or timeout never teleports/phases the Walker or falsely marks him arrived. Repeat after supernova has changed the route.
- Retreat on a lower dungeon floor where the selected reachable door is an interlevel passage rather than the outside entrance. Confirm he disappears only upon arrival, the encounter and owned effects clean up according to the lifecycle policy, and no unseen simulated cross-floor journey is required. Confirm a nearby ordinary wall or arbitrary point cannot count as a door.
- Stress the maximum six-rift constellation plus supernova effects under low quality/reduced motion and the real actor/projectile budgets. Note mobile validation separately.

## Implementation handoff status at record creation

The earlier local branch `claude/void-walker-251`, based on live r249, contains a **disabled routing scaffold** and new geometry tests. Its previously reported 662-test run is a routing-checkpoint result, not verification of this newly supplied combat specification. An actual game-rendered player-scale guide exists, but an empty guide is not a Void Walker model. No model/attack completion or publication is claimed by this document.

The implementation worker should append a dated evidence section or companion review report naming the exact commit/tree/diff reviewed. Record any deviations and unresolved interpretations before presenting the feature as complete. A future reviewer should especially challenge silent omissions of terrain consumption, damaging trails, mixed constellation overlap, or continued out-of-area dashes: these are explicit parts of Tim's description, not optional visual polish.

### Later clarification boundary — S4

This documentation update adds five requirement IDs (VW-F08–F12) and three interpretation entries (I-16–I-18), retaining all earlier IDs. It updates VW-F01/F02/F04/F05 and explicitly marks the earlier assumptions in I-06/I-07 and geometry safeguards as superseded. It does not assess or certify the current implementation. The implementation worker owns the separate evidence record and must re-evaluate affected prior claims against S4, including any protected-region refusal, discovery/FOV gating, temporary scar lifetime, scar color, and overworld exclusions.

### Later visual correction boundary — S5

S5 adds VW-F13/F14 and I-19/I-20 while retaining all prior IDs and source history. It rejects a tile-stepped visible circle and dense crack rendering. Fog/exploration, permanence in both modes, harmless final terrain, and static/noninteractive presentation remain unchanged. This record does not certify that the renderer has been corrected; actual game-rendered visual evidence belongs in the implementation review record.

### Later retreat clarification boundary — S6

S6 updates existing VW-A06 and I-14, and adds I-21/I-22 without renumbering requirements. It explicitly supersedes a proposed fallback retreat teleport. The literal owner instruction is nearest dungeon door, ordinary terrain rules, and the ability to jump; nearest **reachable** door is the parent's declared implementation interpretation. Combat teleport mechanics are unchanged. Review prior retreat implementation and evidence against this distinction rather than treating a successful combat teleport test as retreat acceptance.

### Later retreat-completion boundary — S7

S7 updates VW-A06 and I-14/I-22 and adds I-23, retaining all 51 requirement IDs. Preserve its exact assistant question and owner answer together. The lower-floor ambiguity is resolved: the nearest reachable physical dungeon door, including an interlevel doorway/stair passage, ends retreat on arrival; he disappears there without simulating the player's route through floors to an exterior entrance. “Reachable” remains the parent's declared interpretation. S6 ordinary terrain/jumping still governs getting to the door. This is not permission for fallback teleport before arrival and does not change combat teleport mechanics. Implementation status remains NOT YET VERIFIED in this design record.
