# Close View combat direction — delivery and next passes

Owner notes recorded 2026-11-07. This supplements the build manifest; it preserves delivered character/camera work or grant deployment authority.

## Delivery order

1. Delivered through r821/r822: imported adult protective Wayfarer, coherent neck, approved proportions/hands/amber eyes and camera/lock follow-up, with hosted acceptance.
2. Delivered r823/r824: low directional quickstep, smoother gait, and returnable new interior excavation; old saved tunnel geometry remains unchanged.
3. Delivered r825: distinct Pike thrust and gladius-like Cleaver cut, stable grips and accepted identity, preserved casting/jumping priority and exact recovery. Canonical hit resolution remains immediate.
4. Next: retain the imported normal hero for the three accepted Iron Fists stages, preserving native readiness fallback and actual combo/dash/effect mechanics.
5. Refine tool silhouettes, accepted swaps, firing/casting gestures and hand/muzzle origins according to close-view-tool-armor-manifest.md.
6. Add grounded player/enemy body contact and refine interaction space as a separate reviewed gameplay pass; these are still queued.
7. Assess large/multiple-enemy dungeon and Pentagon combat spacing; version any new generator changes and preserve every pinned layout.
8. Refine robot and powered-suit art using the latest owner references after the action/contact work, with bounded geometry and actual form precedence preserved.

## Experience target

A compact, cohesive combat and exploration engine inside the infinite-world game: readable weapon reach, responsive dodge and movement, concrete bodies, visible anticipation/contact/recovery, and a high skill ceiling. Elder Scrolls Online is the owner's closest combat reference; Bloodborne, Mortal Shell and Remnant are references for pacing, weight and tool interactions. Preserve phone budgets and avoid artificial input latency or excessive shake. These are design targets, not claims of equivalent production scope.

## Weapons and actions

- Verge Cleaver retains the current gladius-like blade, explicitly approved after the owner withdrew the greataxe suggestion. Its distinct broad cut needs credible grip and recovery; canonical gameplay remains a 1.75-tile, 180-degree arc. Current hits resolve immediately, so r825 does not invent a preparatory gameplay windup. Great Sweep owns the separate broken-greatsword reference in close-view-tool-armor-manifest.md.
- The owner's dictated “Cinder Pipe” refers to the canonical Cinder Pike: a shaft/polearm with a distinct forward thrust and retraction, not the same generic dagger cut. Existing gameplay uses 2.45 tiles and 32 degrees.
- Iron Fists must visibly perform its actual three-stage sequence: dash punch, secondary jab, uppercut. Show the correct windup, striking hand and follow-through for each accepted stage. Validate existing combo timing and effects before changing presentation; do not invent extra hits.
- Tools and spells should visibly originate from the character: distinct casting/firing actions, correct hands or muzzles, recoil/recovery, and projectiles/effects tied to accepted gameplay events. Refused actions must not look successful.
- Preserve original accepted weapon/stage through recovery and exact resume, including equipment switches. Distinguish imported source clips from newly derived poses honestly.

## Concrete world and room to fight

Ordinary grounded enemies should body-block rather than permit walking inside their models. The current shared movement code has no actor barrier; this needs a deliberate bounded swept-contact design, safe sliding and overlap recovery in both views. Audit intentional ghost/phase/flight, dodge, knockback, pull, charge and spawn exceptions. Untargetable alone is not a physical-ghost flag. Prevent a blocked motion request from triggering terrain hazards beyond the actual reachable position.

Ordinary enemies should look solid and stable, while intentional spectral creatures and occlusion retain their mechanics. Verify release identity before attributing a stale phone image to current assets. Audit grouped/large foes and camera room before widening layouts. Building v4 and Pentagon v9 already exist; any later generation change needs a new explicit version and unchanged historical digests.

## Evidence gates

Use actual Game-produced actions, cover/elevation and hit geometry, exact pause/resume and unknown-field compatibility, isolated laboratories, bounded geometry/actor/effect work, focused regressions and full CI. Capture hosted GPU action/grip/range/camera evidence. Automated viewport tests and browser screenshots do not establish physical-phone FPS, thermal behavior or hardware multitouch.

Current publication state and exact candidate identities remain in RELEASE_LOG.md. Do not mark this queued work completed merely because an earlier narrower pass was completed.

Detailed queued plans: [weapon presentation](primary-weapon-presentation-manifest.md) and [ordinary grounded body contact](grounded-contact-design.md). Both are preparation records, not completed implementation.

## Atmosphere direction — river and eddies

The owner likes the existing dungeon themes and wants Close View to express the wider Corridor's gritty depth: things persist beyond their use, decay and slip into forgetting; people and stories may endure as echoes. The river image combines fresh current with eddies that collect foam, scum, shelter and forgotten things. Beauty, terror, disgust, fulfillment and absurdity coexist. Preserve this ambiguity rather than explaining the world or treating every NPC as definitively a memory.

Carry this through worn materials, restrained lighting, grounded bodies, concrete tool interactions and responsive, readable danger. Preserve wonder, varied themes and combat visibility; do not make everything equally filthy or obscure. Combine the references' strengths so existing game systems can shine. This adds direction and acceptance criteria, not immediate scope beyond the character/camera work. The compatible narrative record is in [the narrative bible](narrative-bible.md#the-river-and-its-eddies--owner-direction-2026-11-07).

## Reuse before invention — owner direction

Do not assume the complete combat framework must be built from scratch. Before implementing each queued subsystem, research existing compatible engines, Souls-like combat frameworks, animation and camera systems, reusable code and assets. Prefer adopting or adapting proven parts when they deliver the intended weight, responsiveness and coherent action vocabulary with less work.

Compare actual browser/WebGL2 support, offline operation, license/redistribution terms, download and runtime cost, input/pause/save integration and migration impact against the existing code. A desktop engine or framework with the right look is not automatically a suitable mobile-web dependency. Record the candidates, evidence and adoption decision; avoid an unrequested engine migration or added runtime dependencies during the current character/camera release. Current focused fixes continue first. No purchase, installation or license acceptance is granted by this direction record.

Inspection follow-up from r822 acceptance: distinguish raw lab entry from production-settled arrival; the outer guardian can kill an idle scratch player in about2.4s, causing a legitimate respawn. Use explicitly quiet scratch fixtures for camera settling studies. Legacy passages still need close overhead framing; assess real combat breathing room in the queued spacing pass.

## Owner playtest feedback after r822 publication

The owner approves the current character appearance. Preserve it while refining motion; do not restart the model or discard the completed work.

- Replace the normal Wayfarer's forward somersault with a low, crouched directional dash/quickstep, inspired by Bloodborne. Prefer readable forward/backward variants and left/right when practical, aligned with the actual dodge vector. Preserve authoritative dodge displacement, cost, movement and invulnerability windows; animation must not add root motion or new hits. Do not call the imported roll clip a dash without changing the visible articulation.
- Make walking smoother, more fluid and graceful. Audit clip phase/blending, stride versus real speed and foot/hand/socket continuity; retain the source's independently animated root-parented feet and the approved height/proportions. This is queued animation work, not a completed change.
- Investigate reported digging traps: digging a dungeon wall may expose a chasm/pocket that can be entered but not escaped, and attempting to build a jumping block returns a ground-refusal message. Capture seed, map/floor, position, dig result, elevations/materials and exact placement rejection; distinguish intentional lethal terrain from a survivable softlock. The desired outcome is a viable escape route or an allowed, rule-consistent block placement. Preserve intentional lethal falls, sealed-tower/key restrictions, pinned layouts and existing journeys; do not enable blocks on every hazardous surface merely to conceal the bug. No reproduction/fix is claimed yet.
- Research the fine detail of Elden Ring through documented primary community analysis and official material: anticipation/startup, contact and recovery, readable hit geometry/reach, stagger and movement. Adapt useful principles to current game data rather than copying another game's numeric tables or assuming its timings suit this simulation.
- Add Tower of Fantasy as a major comparative reference for responsive combat against strong and grouped monsters, encounter/spawn behavior, traversal-linked challenges/rewards, quests and interconnected open-world systems. These descriptions are the owner's observations and research questions until supported by sources; do not automatically add all those mechanics.

Preserved order: close current character/camera publication records; then directional dash/gait and the reported digging-escape diagnosis, followed by weapon/Iron Fists/tool/cast and ordinary grounded-contact passes, with spacing and reuse evaluation informing them. Keep PRs focused. Existing animation improvements remain intact until a validated replacement is ready.

The supplied Tower of Fantasy reference is https://www.toweroffantasy-global.com/en-us/index.html . See [combat reference research](close-view-combat-references.md) and [the future Anthropic handoff](anthropic-close-view-handoff.md). A framework research result is not adoption, installation, migration or a production claim.
