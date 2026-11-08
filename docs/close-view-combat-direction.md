# Close View combat direction — queued after character and camera

Owner notes recorded 2026-11-07. This supplements the build manifest; it does not replace unfinished character/camera work or grant deployment authority.

## Delivery order

1. Finish the imported protective Wayfarer: adult proportions, reduced hands, existing green/gray/leather/bronze style, silver mask and hair, amber eyes, coherent neck and animation. Verify actual hosted rendering before publishing.
2. Finish the preserved camera/lock follow-up and hosted acceptance.
3. Resume distinct primary-weapon animation and geometry.
4. Add solid player/enemy body contact as a separate, independently reviewed gameplay pass.
5. Refine accepted tool/spell actions and ordinary enemy visual solidity.
6. Assess combat spacing in representative large/multiple-enemy dungeon and Pentagon encounters; version any new generator changes and preserve every pinned layout.

## Experience target

A compact, cohesive combat and exploration engine inside the infinite-world game: readable weapon reach, responsive dodge and movement, concrete bodies, visible anticipation/contact/recovery, and a high skill ceiling. Elder Scrolls Online is the owner's closest combat reference; Bloodborne, Mortal Shell and Remnant are references for pacing, weight and tool interactions. Preserve phone budgets and avoid artificial input latency or excessive shake. These are design targets, not claims of equivalent production scope.

## Weapons and actions

- Verge Cleaver should read as a broad great-blade swing with credible grip, windup and recovery. Canonical gameplay already uses a 1.75-tile, 180-degree arc.
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
