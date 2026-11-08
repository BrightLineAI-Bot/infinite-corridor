# Close View camera and environment audit

Date: 2026-11-08  
Source baseline: `0102c55a` (release-826 source worktree; camera/environment code verified identical to live r825)  
Hosted visual target: `r825-0c066edbc1a0`

This is a bounded stage-7 camera/environment QA record. It introduces no game, test, configuration, release, or generation change.

## Hosted pass status

The requested hosted IAB pass could not begin. The initial browser creation attempt used the assigned browser ID `2`, a new background tab, and the verified r825 preview URL. It returned exactly:

> Browser is not available: 2

This was an invalid browser identifier before navigation, not a network failure. The documented inventory recovery (`cua.getState()`) then returned `browsers: []`: this agent context has no IAB or other browser entrypoint. No tab ID was created, no page loaded, and no hosted request was made. The audit did not select a user-owned tab, launch a local server, or use a transport workaround. Consequently this pass provides **no hosted GPU, screenshot, normal-speed interaction, phone-size, physical-phone FPS/thermal, or hardware multitouch evidence**. It also makes no claim about the pending r826 candidate's hosted visuals.

## Offline focused verification

Command:

`node --test tests/close-view-camera-comfort.test.ts tests/close-view-controls.test.ts tests/close-view-framing.test.ts tests/close-view-offset-clearance.test.ts tests/close-view-terrain-render.test.ts`

Result: **34 passed, 0 failed** in 4.84 seconds.

The covered contracts include:

- stationary concave-corner settling; alcove contraction and smooth recovery without overshoot;
- pause/resume clock freezing, manual-look ownership, movement-follow grace, reduced-motion behavior, and opt-out;
- lock acquisition, semantic activation, target-relative movement, selected-target follow, LOS/range/death release, and one switch per gesture;
- camera-wall exclusion, clear feet-to-eye line, roof/arch height cap, wall-cut hysteresis, and deterministic still frames;
- body/hood framing through entry, compressed orbit, walking, jumping, and impossible low-arch fallback;
- bounded/persistent shoulder selection at real outer, cellar, hive, and arcology entries;
- GPU actor submission on interior heightfields.

These deterministic tests support the existing camera invariants but do not establish how the scene looks or feels under a real GPU/browser interaction.

## Source fixture inventory for the next hosted pass

The current `Close View Lab` exposes representative fixtures needed for a concise follow-up:

1. `keep` — legacy narrow cold-stone theme.
2. `hive` — legacy narrow chitin/resin theme.
3. `terrain-ramps` — current v4 keep height transitions.
4. `grand-hall` and `pit-gallery` — Pentagon hall, shaft/balcony and foreground-occlusion cases.
5. `terrain-pentagon` — current Pentagon mixed rooms, side cells, corridors and ramps.
6. A combat fixture with live foes — lock activation/cycle/facing/follow after ordinary gameplay repositioning.

The lab also has `platform-chain`, `indoor-drone`, `building`, `hazards`, `outer`, `cellar`, `inner`, `heart`, `vault`, `lived-in`, and `arcology`. Traversal fixtures deliberately clear enemies; combat/lock verification therefore belongs in a combat fixture, not a quiet traversal scenario.

## Required observable checks still open

- wall, floor and roof texture continuity; disappearing/unstable walls; foreground occlusion and wall ghosting;
- shoulder contraction, centering and recovery while actually moving around tight corners;
- distinct simultaneous move/look ownership using real UI input;
- stairs, ramps, shafts, balconies and roof-to-world-view transitions (the latter is expected behavior, not by itself a defect);
- lock button activation, target cycling, visual facing and camera follow after a foe moves through ordinary gameplay;
- normal-speed readability in representative narrow, v4 keep and Pentagon spaces.

No concrete source defect was reproduced in the offline pass, so no fix or widened test scope is proposed. Browser access must be made available to this audit context before stage-7 visual/interaction acceptance can be completed.

## Hosted r826 settled-position framing follow-up — coordinator, 2026-11-08

Actual hosted r826-9a7a39cb18a3, Close View Lab → Pentagon outer-ring hall, seed CINDER-VERGE-47, 1280×720: public report locates the extreme overhead head/torso close-up at (25,4), not the raw entrance (25,11). Reset same initially restores the entrance and usable full-body framing. After unpaused idle time, the player returns at (25,4) with HP60. Source reproduction confirms existing settleArrival() moves this fixture from (25,11) to (25,4); this runs on real arrival/respawn. The camera there can compress to .30 with a steep overhead pitch. This supersedes the initial raw-entry/sticky-input hypotheses. The specialist is checking actual no-input death/respawn and bounded entry-heading selection before proposing a fix.

Screenshot: workspace .asset-review/r826-pentagon-entry-camera-gap.png (settled-position witness despite historical filename). Active drag changed yaw, while pause correctly froze the camera. This inherited framing gap remains open for stage7; reproduce exact production arrival, respawn, manual recovery and near-wall traversal on the final candidate. The earlier 34 source checks do not prove good hosted framing. No physical-phone measurements.
