# Future Anthropic Close View handoff

Recorded 2026-11-07. This is a continuity document requested by the owner, not an instruction to contact Anthropic, create another chat or replace existing work. The untracked handoffs/ directory remains untouched. Re-read current AGENTS.md, AGENT_CONTEXT.md and RELEASE_LOG.md, fetch normally, and verify live/main before acting. Publication authority must come from the active user session and project rules; this file grants none.

## Preserve delivered work

The character is approved by the owner: adult, slimmer green/gray protective fabric with leather/bronze accents, small hands, silver mask/white hair and amber eyes. Retain the real Quaternius CC0 sources, rig, textures and source provenance. The r821 fabric neck bridge closes the observed rear opening. Preserve native creature/forms/companions, ceiling/environment work, controls, accepted-action clocks and camera improvements.

Verified production is r825-0c066edbc1a0, commit0c066edbc1a0dff1f33bf83b71bbd3221683d06a, treea48a96795e3d2da3c5a0b2f294bfcca7685efb8f (Publish42444668551). Exact CI/Preview, Astra full/delta review, hosted WebGL actions and live identity/System label passed with no recent errors. r821 character, r822 camera, r823 dash/gait, r824 new-dig return and r825 primary presentation are delivered. Reverify live identity and RELEASE_LOG.md rather than treating this snapshot as perpetually current.

## Next scoped passes

1. Normal Wayfarer dodge: replace the comic somersault with a low directional quickstep/dash. Forward/backward, and lateral variants when practical, should follow the actual displacement while preserving dodge cost, distance, movement and invulnerability rules. Keep visual root motion separate from simulation.
2. Smooth walking: phase/blend/stride/feet/grip coherence, preserving independent source foot translations and the approved appearance. No model restart.
3. Reproduce digging softlocks: dungeon-wall excavation can reportedly expose an inescapable pocket/chasm, while block placement refuses the ground. Capture exact map/seed/floor/elevation/material/state and rejection. Support a legitimate escape without globally overriding lethal terrain, tower seals or build rules. Not reproduced or fixed at this handoff snapshot.
4. Weapon identity: canonical Cinder Pike thrust2.45tiles/32degrees versus Verge Cleaver arc1.75/180 currently share generic melee presentation. Add distinct geometry/grip/windup/contact/recovery driven by accepted actions. Preserve hit rules and original weapon through recovery/switch/resume. Source clips do not contain polearm/two-handed motion; label derived poses honestly.
5. Iron Fists: actual dash punch, second jab, uppercut. Existing fistStep/accepted clocks already distinguish stages; improve visible readability and hand-origin effects without inventing hits. Distinct tool/cast/firing/recoil actions must originate from actual sockets and accepted events.
6. Solid ordinary grounded enemy/player contact: follow grounded-contact-design.md. Movement consequences must use reachable motion, or a blocked request can falsely trigger lava/pit death. Preserve phase/flight exceptions, old-save overlap escape and both-view consistency. No body-contact implementation is delivered yet.
7. Combat room and visual solidity: retain deliberate spectral states but make ordinary bodies stable/readable. Assess large/grouped foes and the production-settled arrival, not just raw lab entry. Any changed generator needs a new version; never widen existing pinned rooms in place.

## Research and tone

Use close-view-combat-references.md to evaluate documented Elden Ring combat analysis, compatible reusable ARPG/animation/camera systems, and Tower of Fantasy. The owner's supplied official reference is https://www.toweroffantasy-global.com/en-us/index.html . Tower of Fantasy is specifically a future Anthropic research priority: investigate how combat, strong/grouped monsters, encounters, quests, traversal-linked challenges/rewards and varied worlds work together, then select useful concepts for this game. Do not assume user observations are verified implementation details or import a large engine merely because it shares a genre.

Close View is a compact combat/exploration layer in the wider infinite-world game. Combine ESO responsiveness/readable reach, Bloodborne pacing/dodge, Mortal Shell weight and Remnant tool interactions without adding artificial lag or copying complete systems wholesale. The Corridor is a river of realities with eddies of decay, forgetting and enduring stories: beautiful, terrifying, disgusting, fulfilling and absurd together. Preserve wonder, varied environments and visibility, sparse lore and unresolved metaphysics. See the narrative bible before lore changes.

## Evidence and boundaries

Schema14, unknown fields, exact resume, historical generators and explored/pinned content remain intact. Proving Ground is isolated scratch state. Change-Control stays disabled; preserve its history. New modules need build and both worker lists. Ordinary actor cap 256triangles/8–14–20 actors remains; the sole imported hero has a separate3170-triangle/3328cap, two indexed draws and measured upload budgets. Physical-phone FPS, thermals and multitouch remain unmeasured.

The outer Close View Lab starts at raw(25,11) with a Sunderjaw five tiles away. Neutral combat can kill the scratch player in about2.4s, then normal respawn settles at(25,4). This explained an apparent relocation; it was not a camera/spawn bug. Use explicitly quiet scratch fixtures or inspect the actual settled arrival for timing studies. Legacy tight rooms still require close overhead views; camera improvement is not universal full-body fit.

Local loopback transport is stopped after EACCES; do not retry without operator resolution. Approved plain Git/GitHub commands work; never use proxies, relays or credential transfers. The r820 browser module fetch failure was followed by one expressly approved normal reload, which succeeded. Later previews loaded normally. One extra browser-tab attach timed out; reusing an existing tab through the documented API worked, with no alternate transport.

Keep the build manifest current, retain completed work, and report blockers honestly. Tests/source/render probes are not hardware or exhaustive gameplay acceptance. Focused animation regression approval exists in this conversation; re-read the active instructions before edits beyond the authorized test scope. No framework has been adopted by the reference research.

## Active animation candidate (not yet published)

r823 packages the implemented directional low quickstep/gait pass described in wayfarer-dash-gait-manifest.md. Source55-check/build and unlit CPU phase-sheet acceptance passed; final CI, independent review, Preview/hosted and Publish verification are still pending. Keep the existing character design. New-dig surface repair is independently implemented/reviewed in a separate unnumbered branch; legacy dug geometry remains unchanged. Re-read RELEASE_LOG.md for later verified state.

## Active excavation candidate (not yet published)

r824 implements the confirmed new-tunnel support repair and a quiet Close View terrain-dig-return fixture. The source DIG-AUDIT0 witness is real generated v4 terrain; normal Act and actual Game reload/return tests cover the repaired height. Additive metadata does not regrade existing coordinate-only tunnels, which retain their geometry and ordinary unstick recovery. Core/fixture component reviews passed; full release gates are pending. Directional dash r823 is merged with resolved recovery-facing review and awaits its Preview/hosted/publication status in RELEASE_LOG.md.

Verified continuation: r823-a1b23012a5c2 is live (Publish42439751394), with CI/Preview, Astra full/delta review, hosted imported-model quicksteps/walking recovery and actual System label verified. r824 remains held for the legacy low-level dig-plan compatibility defect caught by full CI; preserve its old shovel assertions and re-run exact-head gates after the narrow source correction.

The r824 legacy direct-dig compatibility blocker was corrected narrowly in source and cleared by independent Astra delta review (16/16); legacy assertions remain unchanged. Focused correction checks35/35 and sequential build passed. Fresh exact-head CI and subsequent Preview/hosted/publication gates remain required.

Verified continuation: r824-2329dc4c0b06 is live (Publish42441709905). Corrected source and merged CI, Preview, Astra full/delta review, hosted real Act plus entry/return, support metadata and live identity/System label all passed; no recent errors. This supersedes prior r824-pending checkpoints. New cuts are repaired; historical coordinate-only tunnels keep their geometry. r825 prepares distinct Pike/Cleaver presentation with existing immediate combat resolution and timing preserved. Iron Fists, casting/tool origins, body blocking and breathing room remain queued; publication gates and hardware-phone evidence remain separate.

Latest owner references and sequencing are recorded in close-view-tool-armor-manifest.md. Preserve current character/camera/dash/dig work. Verge Cleaver retains the current gladius-like blade (the owner explicitly withdrew the greataxe suggestion); Rift Bombard has an RG-6-inspired silhouette; Great Sweep uses a broken greatsword on the normal Wayfarer; Blunderbuss has a restrained muzzle/blue charge; Lumen Spindle is a forward-held wand. Later robot is clunky with a big viewport; powered suit is fitted with modest structure and no reference wires/huge hands. Do not confuse the reference-only designs with implemented work.

Latest verified checkpoint supersedes older pending paragraphs: r825 is published and verified. The current gladius-like Cleaver is explicitly approved. [The tool/armor manifest](close-view-tool-armor-manifest.md) contains the newest references, carry policy, exclusions and read-only next Iron Fists audit. Remaining queue: imported normal Iron Fists; tool/socket/spell gestures; grounded body contact and combat space; then robot/suit geometry. No new framework/dependency has been adopted and no phone-performance result is claimed.

Construction research is recorded in [close-view-dungeon-routing-study.md](close-view-dungeon-routing-study.md). Reuse room/maze region and connector structure first, preserving version pins and semantic stairs/roof links. rot.js is a comparison candidate with wall-clock/shared-RNG caveats, Rooms and Mazes is the closest algorithmic reference, and Edgar is template-graph inspiration. A new PG-only Room Maze revision is recommended; no engine/dependency/save/layout change has been made.


Latest owner instruction is sequential execution through [the master build manifest](close-view-pass-manifest.md), not switching between unfinished passes as new notes arrive. Latest primary refinements are in primary-weapon-presentation-manifest.md: low one-handed gladius carry/three slashes, two-handed Pike/three thrusts, white/silver fist gauntlets with exactly three stages and alternating opener (owner confirmed), and Echo afterimages without body re-attacks or extra damage. The master also records the requested traversal-block contract and read-only audit: stone already has five-record/ten-second/two-level stacks; confirm material/rendering before treating it as a static wall. Finish the current stage's complete validation/publication record before advancing; linked detail documents are not alternative schedules.
