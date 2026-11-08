# Close View Echo and spell-action detail manifest

Recorded 2026-11-08 for the ordered stage-3 Echo candidate and the later stage-5 spell-action pass. This is a detail record, not a competing schedule or delivery claim; `close-view-pass-manifest.md` remains authoritative. No release or publication authority is granted here.

## Stage 3: primary Echo presentation

The melee Echo glyph already schedules one mechanical repeat 250 ms after an accepted primary attack, at its existing damage share. The repeat deliberately re-evaluates the current player position, equipped primary, profile and targets. It must remain mechanically unchanged: no extra hit, no changed reach, no new target, no combo advance, no accepted-body replay, and no altered Echo resonance, glyph, clone or fist behavior.

The presentation candidate should distinguish two truths when the player moved or switched gear during the delay:

- The dominant violet Echo strike follows the actual recomputed `meleeStrike` and `attackProfile` produced by the authoritative delayed hit.
- A subordinate faint memory trail may retain the original accepted weapon identity, combo step, aim, origin and support height. It is an afterimage of the first attack, not a hit telegraph. When original and actual paths agree they collapse into one readable cue.

Pike reads as a narrow forward spike/thrust. Cleaver reads as a broad stage-specific slash ribbon. The cue uses the existing bounded transient glyph-visual stream and its existing renderer pass; it does not instantiate another Wayfarer, advance the source sampler, create an actor/model draw, or add a persistent emitter. Target hit flash, recoil and damage numbers remain the contact evidence. Unknown legacy identities receive only the truthful actual strike cue.

Acceptance must cover the exact existing delay, no pre-due art/damage, one repeat only, movement and gear switching during the delay, immutable original metadata, actual-path dominance, misses and kills, pause behavior as currently implemented, expiry/caps, reduced motion, 30/60 fps sampling, normal/native/imported rendering, and unchanged schema-14/unknown-field behavior. CPU/source evidence is not GPU or phone acceptance.

Implementation detail: the GPU Close View turns the transient stream into bounded, depth-tested kind-11 additive ribbons at waist height (seven curve segments; three/four/six admitted cues on low/balanced/full). The dominant path uses the authoritative delayed strike origin/profile and current terrain support. A differing accepted memory uses its immutable origin, weapon path, pose step and accepted support; reduced motion omits only that subordinate path. During the GPU bare-floor capture the 2D ground mark is suppressed, preventing a floor stamp plus air ribbon. The existing decal mask rejects unseen tiles and wall depth occludes the geometry. This is CPU/source validation of submitted GPU geometry; hosted rendering and physical-phone performance remain separate acceptance limits.

## Stage 5 inventory: all canonical spell casts

Every entry below needs an accepted-event identity latched only after the real producer succeeds. Refused cooldown/cost/curse presses show nothing. Gestures use final sampled hand sockets and accepted aim while movement continues; projectile/effect origins, damage, counts, costs, cooldowns, charge state, automatic releases, Echo recasts and caps remain canonical.

| Cast | Current accepted variants to preserve | Later visual/action target |
|---|---|---|
| Cinder Dart | Ordinary cast; glyph-shaped and Echo copies | Focused forward hand cast agreeing with the actual dart origin and accepted aim. |
| Ember Ring | Placed/pulsing spell; glyph and Echo variants | Two-hand or outward ring release; the hand cue resolves at the canonical placed center. |
| Grave Sun | Placed long-lived pulsing spell; glyph and Echo variants | Weighted raised/orb gesture, then release toward the canonical center. |
| Shadow Clone | Initial near/far held placement; later swap/recast; copying state | Dusk split/beckon gesture for creation and a distinct compact swap cue; never imply an extra clone or copied hit. |
| Gravity Well | Placed pulling pulses; glyph and Echo variants | Compressive two-hand gesture aimed at the canonical well center. |
| Stillpoint | Placed slow/projectile-stopping field; glyph and Echo variants | Held ward/time gesture whose release agrees with the canonical field center. |
| Aegis | Immediate timed guard; Essence Walk cost/lockout cases | Defensive crossed/raised ward that appears only on accepted activation; no invented projectile. |
| Shadow Boxing | Timed buff; optional Echo-created melee clone | Brief fighting stance/split-shadow cue; no body teleport unless the existing mechanic moves it. |
| Fire Burst | Five canonical cinder shells and their real collision bursts; glyph copies | Fan-release hand gesture with one accepted origin and the existing five trajectories. |
| Imbue Weapon | Timed Focus-derived weapon buff, including zero-Focus case | Hand passes light over the equipped primary; no fake hit or extra buff stack. |
| Essence Walk | Timed recovery-bypass window and stamina-cost cases | Inward-to-forward flowing gesture; readiness/cost refusal remains authoritative. |
| Orbit Volley | Gather, held charge, perfect window, manual launch, automatic launch, resulting vortex | Gather pose while the real orbit exists; distinct launch gesture only on actual manual/automatic release, using the canonical ball origin. |

## Stage 5 inventory: bound Aperture disciplines

These share the two cast slots but are disciplines, not spell projectiles. Preserve rank, cooldown, duration, traversal admission and current action priority.

| Discipline | Later visual/action target |
|---|---|
| Ember Form | Accepted transformation cue only; the actual separate form remains authoritative. |
| Quickening | Compact forward acceleration gesture without inventing displacement. |
| Veil Guard | Ward raised around the body, agreeing with the real timed defense. |
| Force Channel | Power drawn through hands/held gear without adding attacks or shots. |
| Aerial Step | Upward/forward traversal brace; actual terrain and duration rules remain authoritative. |
| Rift Step | Directional fold gesture tied to accepted destination; refused hazardous/ledge destinations show no successful cast. |

## Remaining canonical tools and variants after the named four-tool candidate

The complete tool pass must retain, not collapse, these identities:

- Spark Coil: ordinary straight magic emitter, plus glyph Echo and awakened fan copies.
- Needle Caster: ordinary fast physical shot; at the canonical upgrade threshold its accepted identity is Blunderbuss, not Needle Caster with hidden three-pellet behavior.
- Hammerfall: accepted targeted impact, Shadow Boxing/Spellblade reach interactions, delayed Echo hammer copies, and the separately activated Corridor Golem form.
- Aether Orrery: tap/charge retention, actual release, overload refusal/lockout, orbiting halo and canonical orb sequence.
- Great Sweep: normal sweep remains the normal Wayfarer with the broken sword; Mirage of Blades/Nanoknives remains its separate thrown-blade form; Echo sweep copies retain their real cadence.
- Blunderbuss: ordinary three-pellet cone and its separate Arc Wave form.
- Rift Bombard: ordinary grenade path and separate Cluster Shell bomblets; no invented bounce.
- Lumen Spindle: ordinary returning/boomerang path and separate Sunburst Ricochet wall-hit shards.
- All tools: glyph Echo copies, awakened fans, Shadow Clone copies, targeting/lock behavior and projectile caps remain their actual producers rather than presentation-generated duplicates.

## Proposed next focused spell batch

After the Echo candidate freezes and ordered integration reaches stage 5, use a fresh branch. First establish a normalized accepted-cast presentation record with spell/discipline identity, accepted aim/origin, phase identity for multi-press casts, and interruption/refusal rules. Then implement bounded socket gestures in families: direct/fan projectiles; placed fields/orbs; wards/buffs; clone/orbit multi-phase casts; traversal/form disciplines. Exercise every inventory row with production `Game` acceptance/refusal tests, fixed-camera socket/origin samples at 30/60 fps, pause/reload and equipment/slot changes, reduced motion, caps and existing Echo behavior. Do not combine that work with this stage-3 Echo patch.

## Stage 5 implementation candidate

Manual accepted casts now latch an optional schema-14 `castVisual` descriptor under the existing player runtime. It preserves `spellKind`, symbolic `variant`, gesture `profile`, normalized accepted aim, and bounded canonical origin/target coordinates for the life of the existing 360 ms `castUntil` clock. Refusals do not stamp. Unknown bounded future identities and nested fields survive normalization and render through the neutral cast fallback; malformed records fall back to the legacy cast pose. A newer accepted attack/tool or jump marks the older descriptor cancelled so it cannot reappear, without changing the canonical cast clock.

The twelve spells map respectively to focused-forward, outward-ring, raised-orb, dusk create/swap, compression, time ward, crossed ward, fighting stance, fan release, weapon imbue, flowing recovery, and orbit gather/manual-launch gestures. The six disciplines map to form rise, acceleration, body ward, power draw, traversal brace, and rift fold. These are arm layers over the normal moving source body. They do not create hits, shots, displacement, actors, extra draw passes, or passive auto-launch body animation. Projectile and effect coordinates remain authoritative; descriptor origin/target data is presentation evidence only.

Focused acceptance covers every spell and discipline, curse refusal, the two manual multi-press variants, cancellation, future metadata, malformed coordinates, finite source geometry, unit normals, and fixed 30/60 Hz pose samples. CPU/source checks are not GPU-device or phone acceptance.

## Read-only spell emission and hand-cohesion audit — 2026-11-08

Audited implementation: `6dd48b8dbf2667030f6cca4fdb6d5e32b49db448`. This section corrects assumptions in the earlier inventory; it does not implement emission changes or grant integration/publication clearance. The existing 360 ms spell presentation and every canonical simulation clock remain appropriate inputs to this audit. The owner's request for slower tools is not authorization to slow these spells. No runtime, release, build, dependency, asset or generator file was changed.

### Corrected production ownership

| Family | Actual producer and visible ownership at this head | Consequence for hand cues |
|---|---|---|
| **Cinder Dart**, Ember Ring, Grave Sun, Gravity Well, Stillpoint | `Game.castSpellEffect` immediately creates a placed pulsing `effects` record at its resolved canonical target. Cinder Dart creates **zero projectiles**. `drawRangedEffects` draws floor rings; Gravity Well/Stillpoint add their floor motifs. These are not elevated projectile heads. | Treat the hand as the act of placing a field. A new flying Cinder Dart with delayed contact would change gameplay and is outside this presentation-only proposal. Grave Sun's raised hand is not proof that a world-space orb currently travels from it. |
| Fire Burst | `castFireBurst` creates five `fireBomb` grenades at one canonical body-relative XY, with five fan directions. `standardProjectile` excludes them, and `selectProjectedShots` also excludes grenades. `drawToolForms` paints cracked cinder-shell bodies into the ground texture; detonation creates canonical `fireBurst` flame effects there. | This is a real flying-shot family, but adding launch metadata alone cannot lift it. It needs explicit bounded projection admission and exact body ownership if elevated shots are desired. |
| Orbit Volley | Gather/charge lives in `game.orbit`; launch uses `orbit.flight`, not `game.projectiles`. `drawOrbit` paints the 3–7 gathered orbs and the one flying ball onto the floor. Perfect launch may later create a canonical vortex. | Give the existing ball its own bounded projection adapter. The original gather descriptor cannot own a later automatic launch or its hand cue. |
| Shadow Clone | Creation makes a canonical offset/held-placement state. Holding changes that offset; release settles it. Swap immediately moves the player to the admitted clone location. The settled clone has its existing native auxiliary capture/fallback; charging remains a floor shadow. | A split/placement/swap cue must name the actual clone state or destination. It is not a projectile and must not borrow another actor's sampled hand. |
| Aegis, Shadow Boxing, Imbue Weapon, Essence Walk | Immediate timed states; no emitted projectile. Existing brawler aura/Imbue motes use body-relative floor drawing. Shadow Boxing with Echo may create its own melee clone. Zero-Focus Imbue still accepts its actual timed state. | Local ward/gear accents are appropriate; do not manufacture a projectile, extra buff, hit or clone. An Imbue accent should use the actual equipped gear/right socket if later lifted. |
| Ember Form, Quickening, Veil Guard, Force Channel, Aerial Step, Rift Step | Five timed disciplines and the existing admitted Rift Step displacement. None creates a spell projectile. Ember Form's separate actual form takes precedence over the imported hero. Rift Step already records old-body origin and admitted destination. | Preserve form/traversal precedence and current refusal rules. Do not add flight or make a gesture imply extra movement. |

Source boundaries: `src/game.ts` (`recordCastVisual`, `castSpellEffect`, `castFireBurst`, `launchOrbit`, `tickOrbit`, `castBrawler`, `castShadowClone`, `tickCloneCharge`, `activateApertureSkill`); `src/combat-visuals.ts` (`standardProjectile`, `drawRangedEffects`); `src/tool-forms.ts` (`drawToolForms`); `src/orbit-volley.ts` (`drawOrbit`); `src/brawler-spells.ts` (`drawBrawlerAuras`); `src/close-view.ts` (`selectProjectedShots`, accepted cast selection); `src/close-view-hero.ts` (`castPose`, final left socket).

### Concrete CPU witnesses

Private reproducible probe: `.asset-review/spell-emission-audit.mjs`; results: `.asset-review/spell-emission-audit.json`. It calls actual Game producers, projectile/effect updates, source hero sampler and the existing effect drawer. It uses a flat open map, player `(10,10)`, body center `(10.5,10.45,0)`, east aim, normal imported body, and standing/walking (2.4 tiles/s) samples. Coordinates below are source/CPU evidence, not a rendered GPU/phone acceptance result. Hand samples use the accepted aim yaw directly; the production actor's turn smoothing can add a transient facing difference.

| Witness | Observed result |
|---|---|
| Fire Burst birth | All five shells begin at `(10.8,10.45)` on the floor drawing path. The accepted left socket is `(10.703,10.550,.688)` at age 0 and `(10.858,10.485,1.123)` at 28.8 ms. Walking committed socket is `(10.901,10.457,1.085)`. No current socket-to-shell bridge exists. |
| Fire Burst direction | Fan center is `(1,0)`, but `recordCastVisual` takes the **first edge pellet**: accepted aim `(.764842,-.644218)`, yaw **−0.7 rad / −40.1 degrees**. The current gesture therefore turns toward an edge of its own fan rather than the actual central targeting direction. |
| Fire Burst immediate contact | An Ashling at `(10.4,10)` detonates all five shells on the first **1 ms** update. Central detonation is `(10.809,10.45)`; zero shells remain. The raised committed hand is not yet reached. Moving visible heads to a later committed hand or showing a later second launch would contradict those impacts. |
| Cinder Dart | Locked/auto-targeted field is placed at `(13.5,10.45)`; zero projectiles; first 1 ms effect update deals 14 fixture damage. At that instant the left socket is `(10.584,10.651,.739)`. A hand-to-target gap here is expected for an immediate remote field, not evidence of a missing physical dart. |
| Grave Sun | At 28.8 ms the standing left socket is `(10.633,10.672,1.318)`; its canonical placed field in the no-target witness remains `(10.5,10.45)` on the floor. The current gesture and field are independent. |
| Orbit manual launch | Ball starts at canonical `(10.5,10.45)`; committed left socket is `(10.787,10.660,1.140)`. A nearby foe can produce the canonical burst at the starting point on the first **1 ms** `tickOrbit`, removing the flight. |
| Orbit automatic launch | At 3.2 s `tickOrbit` launches the ball while retaining the expired gather `castVisual` and its old `castUntil`. This correctly avoids replaying the player's body. Future flight projection must still work independently of that descriptor. |
| Moving held clone and swap | Eastward movement places the shadow behind the player. At 500 ms hold its offset is `(-3.28,0)`; swap lands at body center `(7.22,10.45)`. Both create and swap descriptors retain east aim `(1,0)` and have **no target**. Holding/settling does not restamp the body. |

The actual effect drawer produced 10 Fire Burst shell arc calls, 2 Orbit flight arc calls and 2 Cinder Dart field arc calls, with **zero standard projectile heads** in all three cases. This distinguishes real floor silhouettes from hypothetical `.66`-high GL heads.

### Findings and minimum staged remedy

1. **Correct accepted association before attaching effects.** Fire Burst must retain the producer's central aim and an exact accepted source association (at minimum the central shell, optionally a capped five-ID volley descriptor). Never use the first surviving arbitrary shot. Clone create/swap metadata must describe the canonical initial placement/admitted destination; held placement can use its live canonical clone state without restamping an expired body gesture. Preserve bounded unknown fields and absent legacy records. Keep all physical XY, fan directions, counts, costs, cooldowns and displacement unchanged. Existing array-length inference in `recordCastVisual` is insufficient as a general causal association contract.
2. **Make actual flying bodies visible in their own bounded path.** Add explicit Fire Burst and Orbit flight admission to the existing renderer machinery, using their canonical current XY and a documented presentation-only height/age policy. Fire Burst needs a recognized immutable initial-duration/real-age descriptor if a lob is authored; do not derive its arc from decreasing `life` or current hand pose. Orbit remains owned by its single live `orbit.flight`, including automatic launch. Share existing quality caps and draw batches rather than raising budgets. Suppress only the exact admitted floor body after its replacement is drawable; preserve floor-only fallback for absent GL/assets, rejected admission, unknown metadata and allocation failure. Keep floor impacts, field radii, charge window/count, perfect result and vortex at their existing origins.
3. **Then add limited release cohesion.** A brief cue may use the current final left socket while the exact accepted normal-hero gesture is actually drawn. First release is immediate from the current low hand; do not replay it at 28.8 ms. A Fire Burst/manual-Orbit connector is optional, never required to force every frame to join: at most one current-source connector, forward-only, bounded to the approved short-segment budget, rejected after death/removal/impact, and clipped by discovered/traversable endpoint plus body-to-hand and hand-to-head checks. Preserve actual player alpha, support/lift, reduced motion, logical pause age and native/form/readiness fallback. Do not displace canonical heads or borrow clone/Echo hands. Automatic Orbit uses a source-owned ball release cue, not an unsolicited new body cast.
4. **Handle placed fields and buffs separately.** Cinder Dart/Ember Ring/Grave Sun/Gravity Well/Stillpoint need matching local cast and canonical target onset language, not a fabricated traveling head or a long hand-to-target beam. Keep first contact immediate. Field Echo onset belongs to the delayed field, never a fresh player gesture. Wards and disciplines need only local/body accents; Imbue may use current held gear. Defer any additional sculpted orb/field art to a bounded family pass with its own admission/fallback review. Do not redesign all spell animations to close this specific emission gap.

### State semantics and focused acceptance for implementation

- All twelve real manual spell producers and all six discipline producers accepted in the private probe with their mapped identity. A curse-refused press retained the same descriptor for every spell; an actual zero-stamina Essence Walk Aegis recast also refused without restamping. Preserve the nested Essence Walk accepted call's single descriptor, cooldown restoration and stamina charge.
- Glyph Echo is family-specific. Cinder Dart/ordinary placed fields create a delayed field copy at the same target (Dart delay `.8` s in the probe); Orbit creates its delayed burst copy at impact (`.2` s). Fire Burst with Echo still emits **five shells, no extra volley** at this head; do not invent copies from the earlier inventory wording. Shadow Clone copies primary swings and tool shots, not arbitrary spell casts. Creature Echo spell procs (for example Wraith Lantern) retain their own canonical geometry and must not be mistaken for the base cast's source. Existing generic floor field drawing does not gate every `delay>0` record; any new elevated/onset cue must explicitly honor delay without changing simulation.
- Actual Fire Burst pause at age 10 ms, JSON export/migration and reconstruction retained 350 ms of cast presentation, all five canonical shell positions/ages, and nested future metadata. Apply the same logical-clock treatment to new cues and descriptors. Old saves lacking metadata keep existing body/floor rendering. Future versions remain uninterpreted and preserved; malformed known fields must not erase unrelated valid runtime state.
- Add targeted producer-to-render checks at 0, 1, 28.8, 58, 120 and 360 ms for Fire Burst/manual Orbit; moving, opposite/changed aim, raised support, exact-source loss, point-blank foe/wall, behind-wall hand, discovery boundary, reduced motion and low/full cap overflow. Assert no duplicate floor/elevated body and no new actor/draw budget. Include automatic Orbit after the gather descriptor expires and after a newer attack, perfect/manual results, flight expiry/impact, and a pause/reload during flight.
- For the five placed fields, verify first-update damage and delayed Echo behavior against existing values; assert no invented projectile. For clone, verify create/held/release/swap/blocked swap, moving placement and opposite target, without body restamping on held updates. For buffs/disciplines, retain zero-Focus Imbue, Essence Walk costs/lockout, form precedence, Rift Step refusal/admission and primary/socket ownership. Keep all prior tool, primary, Fists and Orrery assertions intact.
- Hosted front/side/rear sequences remain necessary to judge actual hand/shot/impact readability. Neither this audit nor its private probe establishes GPU output, integration with other candidates, phone performance or publication readiness. Architecture and association fixes should be reviewed before implementation of the new projection/cue stage.

### Accepted-source metadata correction — 2026-11-08

The bounded source correction records Fire Burst from the accepted producer facts: the canonical shared shell origin, central targeting direction, and the already-created middle shell ID. It no longer infers the gesture from the first new array member, so unrelated existing projectiles and later aim changes cannot turn the body toward a fan edge. No shell, random sample, counter increment, trajectory, collision, Echo, cost, or cooldown changed.

Shadow Clone creation now records its accepted body origin and canonical initial placement. While that same held placement remains canonical, its target follows the existing charging clone state without restarting the body clock; release freezes the endpoint. A successful swap records the pre-swap origin and admitted destination before the clone is cleared. Blocked swaps retain the prior descriptor. These additions remain schema-14 metadata, normalize through the existing bounded cast record, and preserve unknown nested fields through pause/JSON round trips.

Focused production-`Game` coverage includes the Fire Burst centre with unrelated shots and changed aim; westward moving clone creation, held placement, release and swap; blocked-swap refusal; pause/JSON preservation; and the existing twelve spell plus six discipline identity matrix. Projection, release connectors, hosted GPU sequences, phone performance and cue/readability approval remain later gates.

### Tool-motion integration boundary — 2026-11-08

The accepted v1 tool-motion descriptor and derived right-arm tool poses now coexist with the spell layer: recognized Bombard, Blunderbuss and Lumen Spindle ranged actions use their bounded tool recipe, while cast families retain the free-left-hand solver and Orrery/legacy casts retain their established fallback. Shared action clocks, primary carry, readiness continuation, cancellation, pause/JSON normalization and canonical simulation XY remain unchanged. This merge adds no spell projection runtime; the projection and release-cue stages above remain separately gated.

## Quiet hosted inspection fixtures

Combat Asset Lab now includes “Quiet Echo inspection · Cinder Pike”, “Quiet Echo inspection · Verge Cleaver”, and “Quiet Echo inspection · Salvage Blade”. Start test equips the real Echo glyph, keeps the generated grand-hall geometry and canonical primary/Echo producers, and supplies one durable stunned practice foe. Attack, walking, Tool, spells and Pause remain normal production controls on isolated scratch state. These explicit fixtures alone receive the stun/durability; the eleven ordinary combat scenarios and the first two quiet scenarios retain their behavior. Use them to inspect waist-height thrust, slash, and cone afterimages at normal speed, movement between the original strike and repeat, pause, quality tiers and reduced motion. They are inspection aids, not proof of hosted acceptance. Focused fixture/Echo checks cover all 14 combat scenarios and the unchanged 250ms repeat/no-body-restamp contract.

### Prepared Echo/tool dependency integration — 2026-11-08

The spell branch incorporates complete Echo source `ae01343458e7668993aad99d8d67d20f1fe87369` and tool source `2e2852e57b26b5fe451fa178b61c175eee2ddd7c`. Semantic resolution retains the spell adapters, final left-socket translation, twelve gesture families and legacy Orrery poses, while adopting whole-frame GL failure/recovery, generic-primary pose continuity, final tool action ownership and the eight-cell endpoint-inclusive supercover. Fire's five fixed-height sources and Orbit's one live flight retain exact reference masks, shared quality caps, and ordinary/tool → Fire → Orbit admission priority. Tool and spell release cues retain one shared twelve-vertex lane; manual Orbit has no connector and automatic Orbit has no hand flash.

The combined preparation passed 78 server-free focused checks across spell, tool, GL transaction, imported/native actor, primary and Echo/Orrery suites. An additional actual-renderer tool → Fire → tool regression passes with all thirteen spell-projection checks, verifying positive final-owner cues without removing older live bodies. The sequential static build and diff checks pass. No existing assertion or threshold was weakened. This is unnumbered local source preparation, not main adoption, hosted/GPU appearance, phone performance or publication acceptance; ordered integration and current release gates remain.

### Prepared Hammerfall dependency integration — 2026-11-08

After the Echo/tool union froze at `cda421a82415f2a3c7b0c512e9b131251cf46fbe` (tree `90e29e9f3ee364522625d4483b65d2c3c2609e76`), complete Hammerfall source `b55568365a99906e1c60d007302eaa40400a908d` was merged. Save export retains both the original-effect-relative Hammerfall deadline and the independent normalized spell descriptor. Hammerfall keeps its 320 ms canonical delay, 570 ms connected stomp presentation, empty held gear, native 254-triangle fallback and additive logical hero time; the spell layer retains its free left-hand families, exact Fire source association, runtime-only Orbit flight, shared caps/release lane and legacy Orrery interpretation. No mechanics, world pins, assets or existing assertion thresholds were changed by the conflict resolution.

Validation: 107 combined focused checks passed, followed by one added production-renderer integration check and 20 existing primary/Fists/shared-clock checks, for 128 distinct passing checks. The new matrix covers Hammerfall → Cinder Dart/Fire Burst/Bombard and Fire Burst → Hammerfall, including effect-relative cancellation beyond the nominal attack deadline, positive admitted bodies, exact paused JSON body/descriptor restoration, schema-14 future metadata, unchanged remote effect coordinates/damage and the first canonical pulse. Cinder Dart still creates no projectile; interrupted Fire retains its five actual sources. Static build at inherited release 828 and diff checks passed. This remains local source preparation; no hosted/device or publication acceptance is claimed, and the later Echo cone correction is intentionally not ported here.

### Stage-3 cone admission checkpoint

The canonical primary inventory also includes Salvage Blade, and unknown/future primary identities deliberately use its cone profile. Their mechanical delayed Echo already recomputed the correct current origin, 1.7-tile reach and 100-degree arc, with no Pike/Cleaver memory record. Ordinary 2D rendered that cone through its sweep branch, but Close View's raised GL admission accepted only `arc` and `thrust`; because GL owns the bare floor, the ordinary fallback was correctly suppressed and the cone cue disappeared entirely. The bounded correction admits canonical `cone` records into the existing non-thrust raised sweep ribbon. It does not change mechanics, memory, damage, reach, caps, lifetime, reduced motion, terrain height, body presentation, or Iron Fists behavior. Actual Game-to-GL regressions cover Salvage and a future unknown primary: one canonical delayed hit, one 42-vertex depth-tested violet path, no memory/body replay, and no render-generated hit. Iron Fists still use their established punch/Echo-glyph charge behavior and do not gain an invented delayed primary cue.
