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


## Sequential execution and latest animation notes

Use [close-view-pass-manifest.md](close-view-pass-manifest.md) as the only implementation order; this file keeps tool and armor specifications. Rift Bombard, Great Sweep, Blunderbuss and Lumen Spindle each have an explicit queued entry, followed by every remaining canonical tool/variant. The newer low one-handed Cleaver carry, three slashes/thrusts, white/silver gauntlets, confirmed three-hit alternating-opener Iron Fists and Echo afterimage rules are in primary-weapon-presentation-manifest.md. The master also holds the block jump/stack/cap/lifetime requirements. Adding these notes does not start or complete their implementation.
