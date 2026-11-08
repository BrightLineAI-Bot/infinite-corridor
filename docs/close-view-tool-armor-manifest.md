# Close View tool and armor direction — owner continuation

Recorded 2026-11-07 from the owner's current chat and two attached visual references. This is a build manifest, not a completion claim. Continue current focused release work; do not discard completed character, movement, camera or weapon work.

## Carry and action presentation

The owner considered several carry options and finally allowed the equipped primary to remain in the Wayfarer's hands. Use that as the working default. Tools are not permanently carried in view: when an accepted tool action occurs, show its model in the appropriate hand(s), perform its distinct action, then recover to the equipped primary. An immediate model swap is acceptable, with smooth pose accommodation; locomotion must continue while firing. Retain current cooldowns first. A separate mechanical cooldown is optional only if a concrete interaction defect requires it; do not add delay merely to hide a bad pose. Refused presses must not display a successful fire/cast. Pause, accepted aim, active original tool identity, gear changes, reload and action priority remain authoritative.

## Tool-specific manifest

| Item | Requested appearance and motion | Implementation boundary / acceptance |
|---|---|---|
| Rift Bombard | Stylized RG-6-inspired launcher silhouette: substantial revolving cylinder, short forward barrel, hand grip and stock. Appears when the character fires it. Visible lobbed grenade arc, drop, explosion/expansion, with the owner's described lateral/outward bouncing or secondary bursts. | Use the [owner's RG-6 reference](https://en.wikipedia.org/wiki/RG-6_grenade_launcher) for broad appearance only. Audit current projectile/fragment/bounce mechanics before changing them; distinguish existing behavior from requested additions, preserve deterministic random streams, damage and bounded projectile/effect caps. Muzzle visual follows animated tool socket and accepted aim; explosive hit origin/rules remain canonical. |
| Great Sweep | The normal Wayfarer swings a very large, broken greatsword: substantial hilt/guard and a broad truncated blade. The attached dark steel/gray blade with a central gold accent is shape inspiration, not an exact required copy. | Keep the normal character body; using the tool must not itself transform him. Distinct heavy sweeping gesture. The earlier back-carried suggestion was superseded by the clearer tool-use description; permanent back carry is not required. Audit any separately activated Golem/Mirage state without removing intentional mechanics. |
| Blunderbuss | Recognizable compact steampunk blunderbuss with modest muzzle flare, dark/bronze materials and a blue charge accent. Avoid the exaggerated oversized cone. | Held firing stance/recoil must work while moving. Keep existing shot count, charge behavior, targeting, timing and projectile caps. |
| Lumen Spindle | A wand, held forward in a casting/firing posture. Repeated accepted presses produce the corresponding shots; the arm need not waggle left/right with every press. | A stable forward hold with small firing feedback is preferred to exaggerated repetitive motion. Hand/wand origin and accepted shot count agree; no invented extra projectiles or arbitrary delays. |
| Other magical tool | Owner could not recall its name and will refine it after seeing spell gestures. | Preserve the existing Aether Orrery and other canonical tool identities/behaviors; the unidentified remark does not authorize renaming or replacing them. |

### Tool candidate implementation

The four named stage-4 tools have bounded, original low-poly hero-gear recipes under the profile keys `rift-bombard`, `great-sweep`, `blunderbuss` and `lumen-spindle`. Accepted production actions latch the exact canonical tool identity into the existing additive presentation record only after gameplay accepts the press; Close View keeps that identity through its authoritative action clock, gear changes, pause and reload, then returns to the equipped primary. The source hero derives a braced Bombard/Blunderbuss hold, a broad Great Sweep gesture and a distinctly raised forward Spindle hold from the actual final hand socket while retaining locomotion underneath. Mirage remains its separately activated canonical form. No damage, shot count, projectile origin, aim, cooldown, charge, physics or effect rule changes.

The recipes use the existing socket writer and primitives and add no texture, shader, dependency or draw path. Focused source tests cover geometry budgets, finite unit normals, socket transforms, atomic buffer refusal, accepted/refused actions, immutable identity, schema-14 round trips, smooth pose endpoints and neutral unknown-profile fallback. Offline unlit CPU sheets are authoring evidence only; ordered integration, hosted GPU review and physical-phone acceptance remain outstanding, so this candidate is not marked delivered here.

## Primary clarification affecting the current candidate

- **Verge Cleaver keeps the current gladius-like blade.** The owner explicitly withdrew the greataxe suggestion after seeing the current result: leave this silhouette as it is. Preserve the accepted two-hand cut, source character, 1.75-tile/180-degree gameplay profile and geometry caps; no greataxe replacement.
- **Cinder Pike** is a substantial polearm/pike/spear/halberd family silhouette with a distinct thrust. Keep its canonical name and 2.45-tile/32-degree profile.
- Each weapon family needs its own recognizable action. The owner wants to see the current Pike/Cleaver result before further carry refinements; do not throw away the implemented accepted identity, grips, continuity or action-priority fixes.

## Robot and powered suit follow-up

Do after the current action/tool/contact work; neither form is completed by this manifest.

1. **Robot:** recover the original game's deliberately clunky, oversized, rough-technology character. Read as a bulky machine/cockpit the Wayfarer gets into, with a large protective viewport. Retain actual mech state, controls, modes and native admission; improve the model rather than substituting a normal humanoid with inflated parts.
2. **Powered/empowered suit:** Gantz hard-suit-inspired general structure, adapted to Corridor's own visual identity. Mostly fitted, well-defined human anatomy with modest added structural bulk. Some shoulder/head framing, restrained shoulders/head, normal-sized hands. Omit the reference's dangling wires, long projections and elbow appendages; do not copy its extreme forearm/shoulder/head bulk. Preserve the original approved Wayfarer proportions, protective equipment language and actual form precedence.

The owner's attached images were visually inspected. Durable local reference copies are kept outside the repository at `C:/Users/orvar/Documents/ChatGPT/Infinite Cooridoor/.asset-review/owner-tool-armor-references/`; they are art references, not shipped meshes/textures or asset-license grants. The broken sword image belongs to Great Sweep, not to Verge Cleaver. The hard-suit image is direction for the later suit redesign, not a request to reproduce every attachment.

## Order, checks and evidence

r825 primary work is published and its CI/review/Preview/hosted/live verification is complete, retaining the approved gladius-like Cleaver. Continue focused passes for normal imported Iron Fists, tool silhouettes and socket actions, spell gestures, grounded body contact/interaction space, and robot/suit geometry. Reconcile this with the primary, combat, contact and Anthropic manifests rather than losing those queues. Body blocking remains queued; do not claim it is already implemented.

For each pass: actual accepted production producers; distinct startup/committed/recovery language consistent with real hit timing; locomotion plus action, pause/reload/refusal/gear-switch tests; multiple front/side/rear phases; exact form selection and capped geometry/draws/projectiles; schema 14 and Proving Ground isolation. CPU/source checks are not hosted GPU or physical-phone performance evidence. No runtime dependency or imported framework is adopted by this note.

## Next Iron Fists source audit (read-only, not implemented)

Normal Iron Fists currently select the old native `playerIronFists` form, so the imported adult Wayfarer is bypassed. The imported archive has one Punch clip, no separate jab or uppercut. Accepted `attackVisual.fistStep` already persists all three canonical steps, but imported `heroAction` does not yet carry it. Native poses distinguish the three. Gameplay moves the player in safe .25-tile increments before computing the authoritative effect center .7 tile ahead of the post-dash body; that point is not an animated hand socket.

The next bounded implementation can admit the imported normal Iron Fists hero with native readiness fallback, add capped socket gauntlets, carry accepted fistStep, use source Punch for dash punch and truthfully derived jab/uppercut, and add presentation-only hand-to-contact cues. Keep mech/Ember precedence and all actual movement, damage, hit timing and effect centers. Verify actual three-step Game combo, post-dash FX coordinates, distinct socket trajectories over at least 21 phases, ready/recovery/pause/reload/refusal/future fields, approved proportions/head/hands and existing geometry/draw caps. This audit does not mean those improvements are delivered.

## Deterministic construction research

The latest owner request also adds room-maze routing, unique branches/loops and less obvious vertical integration to visual planning/construction, preserving roof access and up/down buildings. [The reuse study](close-view-dungeon-routing-study.md) compares three primary-source systems and records the bounded PG-only adaptation recommendation. Research is complete; no generator/library adoption or existing-world change is claimed.

## Read-only tool-emission cohesion audit — 2026-11-08

The accepted-identity/body pass is internally coherent, but the three newly posed shooting tools do **not** yet launch their visible shots from those tools. `fireSecondary` still creates the authoritative shot at the canonical player point `(player.x + .5, player.y + .45) + aim * .35`, and no player-tool producer attaches `visualLaunch`. Close View therefore draws the shot at that same XY and the default `.66` visual height. The reusable presentation-only bridge (`projectileLaunchMetadata` → `projectileVisualPoint`) is presently used only for drone rockets. This is a visual-origin defect; the existing projectile XY, collision, damage, aim, speed, lifetime and explosion origins must not move.

A private production-recipe probe used a player at `(10.5, 10.45, ground 0)`, yaw east, the actual imported hero sampler, actual final right-hand socket and actual gear writer. At committed phase `.10` of the 180 ms accepted action, while standing, the forward-most tool points were:

| Accepted tool | Rendered forward tool point | Canonical shot at birth | Separation at birth | Concurrent shot head after 18 ms |
|---|---:|---:|---:|---:|
| Rift Bombard | `(11.433, 10.370, 1.016)` | `(10.850, 10.450, .660)` | `.688` tile | `(10.994, 10.450, .660)`, `.571` from tool |
| Blunderbuss | `(11.433, 10.344, 1.046)` | `(10.850, 10.450, .660)` | `.707` tile | `(11.102, 10.450, .660)`, `.519` from tool |
| Lumen Spindle | `(11.490, 10.324, 1.199)` | `(10.850, 10.450, .660)` | `.846` tile | `(11.030, 10.450, .660)`, `.720` from tool |

The same probe with locomotion at 2.4 tiles/s found committed separations of `.699`, `.717` and `.850` tile respectively, so walking does not close the seam. The phase-zero and phase-one endpoints correctly return to the neutral locomotion pose; the disconnect appears as the accepted arm/tool rises while the already-visible projectile starts low and near the old body anchor. These coordinates are CPU/source evidence, not hosted GPU or phone acceptance.

The surrounding state paths do not repair the origin. Accepted `toolKind` and its action clock correctly survive gear switches, pause and schema-14 reload. A queued Echo shot deliberately spawns later from the player's then-current canonical body point and inherits no `visualLaunch`; it neither replays nor owns the original accepted tool pose. Pellet, Arc Wave, awakened fan and Shadow Clone copies likewise clone the base shot without a tool-muzzle bridge. Sunburst shards and Cluster Shell bomblets originate at their canonical wall hit/detonation, so they should not be moved to a hand. Great Sweep itself is a centered melee effect and has no muzzle; Mirage of Blades is a separate accepted `mirage` action whose blades canonically leave player center. Hammerfall/Golem and Orrery retain their separate target/orb systems.

Remaining inventory is therefore still truthful but not newly socketed: Spark Coil and Needle Caster use the generic accepted `emitter` cue and legacy `playerTool` geometry; Hammerfall uses `hammer`; ordinary Great Sweep now latches `great-sweep`, while Mirage keeps `mirage`; Blunderbuss now latches `blunderbuss`, and Arc Wave is its projectile variant; Lumen Spindle now latches `lumen-spindle`, and Sunburst is its wall-hit variant; Aether Orrery keeps `orrery-tap`/`orrery-release`. The unidentified magical-tool remark adds no profile. Do not invent new animations for these queued profiles.

Smallest remedy: extend the existing serializable, age-settled visual-offset contract to the accepted Bombard, Blunderbuss and Spindle base shots and their same-volley copies, using a small presentation-data muzzle table keyed by the already-latched canonical tool identity and aim. Do not import the Close View hero/GPU asset into `Game`, and do not change authoritative projectile coordinates. A delayed Echo needs a fresh visual anchor at its own emission time or no bridge; it must never reuse the original world-space launch offset. Because gameplay emits immediately while the authored pose reaches its committed socket after roughly 18 ms, final implementation must choose and test one honest cue policy (a bounded birth flash/tracer from the accepted muzzle to the canonical shot is the least timing-invasive option) rather than pretending the phase-zero neutral socket is the raised muzzle. This timing/cue choice requires integration review before source changes.

Focused non-server regression evidence: 31/31 actual-Game/render tests passed across accepted tool identity, moving/gear-switch/primary-Echo interaction, paused JSON resume, drone launch metadata, Blunderbuss/Arc Wave/Mirage/Golem/Cluster Shell and Lumen Spindle/Sunburst behavior. No gameplay source, tracked test, asset, balance value or render pass was changed by this audit.


## Sequential execution and latest animation notes

Use [close-view-pass-manifest.md](close-view-pass-manifest.md) as the only integration/release order; isolated specialist preparation may run in parallel under the latest owner instruction. This file keeps tool and armor specifications. Rift Bombard, Great Sweep, Blunderbuss and Lumen Spindle each have an explicit queued entry, followed by every remaining canonical tool/variant. The newer low one-handed Cleaver carry, three slashes/thrusts, white/silver gauntlets, confirmed three-hit alternating-opener Iron Fists and Echo afterimage rules are in primary-weapon-presentation-manifest.md. The master also holds the block jump/stack/cap/lifetime requirements. The geometry-only specialist candidate does not complete tool-use animation, selection, projectile behavior or hosted acceptance.
