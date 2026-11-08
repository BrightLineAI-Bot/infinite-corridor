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

## Hosted r826 raw Pentagon entry follow-up — coordinator, 2026-11-08

Actual hosted r826-9a7a39cb18a3, Close View Lab → Pentagon outer-ring hall, 1280×720: an observed view compressed into a steep overhead close-up dominated by the Wayfarer's head/torso. Active right-side drag changed yaw but did not restore useful full-body framing in that witness; paused drag correctly left the camera frozen. Screenshot: workspace `.asset-review/r826-pentagon-entry-camera-gap.png`. The initial description called this raw entry; the subsequent public report placed the player at **(25,4)**, whereas Reset same initially placed them at **(25,11)** with useful full-body framing. The source reproduction below explains the transition through death/respawn. This is an inherited settled-arrival framing gap, not a new primary-motion regression. Earlier source checks do not establish hosted quality or physical-phone performance.

## Reproduced settled-arrival corner — 2026-11-08

Source reviewed: `33b9f7422433ce197c2198a23fc69a3660cb2727`, based on `0102c55a`. No camera/gameplay source was changed for this diagnosis. The exact fixture is `createLabFixture({lab:'close-view',scenario:'outer',seed:'CINDER-VERGE-47',variant:0,now:100000})`, producing `pentagon:CINDER-VERGE-47:0:24:v8:f1`. The laboratory deliberately uses the legacy version-8 floor here; this is not evidence that a new production journey generates version 8. Standard preset remains height 1.6, boom 2.7, horizontal FOV 72°, shoulder .42; body-framing height remains 1.45.

With no input (`state:{x:0,y:0}`, `consume:()=>false`, `held:()=>false`) and ordinary `.05`-second `Game.update` steps:

- At 0 seconds, the raw player is (25,11), HP 60. The nearby Sunderjaw is (20,11), with Ashling and Weeping Saint also alive.
- At 1.20 seconds HP becomes 15 without player displacement.
- At 2.45 seconds the player is killed, HP returns to 60, and the player is placed at (25,4). The message explicitly reports being felled and returned to the entrance.

`Game` death recovery reloads the floor, restores its entrance, then calls `settleArrival()`. Calling that same method on the untouched raw fixture immediately produces (25,4), because ordinary guardian-clearance rules reject the original entrance. Normal production dungeon entry also calls `settleArrival()` after loading and placing the player; its call path was inspected, rather than claimed as a hosted Act test. PG `generate()` and Pause both reset input. No autopilot or stale key is needed to reproduce this witness.

Camera-only settling with quiet scratch state gives:

| State | Position | Yaw | Boom | Eye height | Pitch | Projected head / feet at 1280×720 |
|---|---|---|---|---|---|---|
| Untouched raw entry | (25,11) | 180° | 1.10 | 2.15 | 42.71° | (448,201) / (531,684) |
| Guardian-safe arrival | (25,4) | 180° | .30 | 2.15 | 71.565° | (559,287) / (611,523) |
| Same corner, manual recovery | (25,4) | 90° | 2.70 | 1.60 | 12.707° | (505,211) / (519,634) |

Loading the static arch geometry does not change the raw-entry result. The settled player occupies the southeast corner of a small chamber: east and south are walls; west has 7.5 tiles of open centerline, northwest 5, and north 3.5. Looking west therefore leaves only .30 tiles behind the player. The opposite camera placement has ample safe rear space but looks toward the neighboring wall. Current entry scoring is `forward * (.15 + reach / preset.distance)`: every candidate with zero forward centerline scores zero, regardless of useful body clearance. The framing solver contains the foot/head endpoints in the compressed projection, but that does not prevent a large foreground head/torso. This is horizontal corner geometry and entry scoring, not a roof-height failure.

The private receipt is `.asset-review/settled-entry-camera-witness.json` in this audit worktree. Source/mock-canvas evidence is not GPU or phone acceptance. The screenshot cannot alone determine the camera's exact yaw or pitch.

## Approved bounded implementation contract — entry fallback

The coordinator approved this architecture for subsequent implementation; it is **not implemented by this audit**.

1. Keep the existing entry heading evaluations and safe rig probes in `ensureCam`. Track an alternate using those same results; perform no additional ray/probe work.
2. Preserve the existing winning heading whenever its safe reach is at least the existing `CLOSE_VIEW.camera.minDistance` (1 tile). In particular the raw outer entry's 1.10-tile west-facing rig must remain unchanged.
3. Only when the existing winner is shorter than that limit, consider already-evaluated headings whose safe reach meets it. Prefer useful rear clearance, with the original arrival facing resolving equivalent candidates. For the reproduced (25,4) corner, initial facing down selects the safe south-facing view, recovering the 2.70-tile boom. If no candidate qualifies, retain the existing honest compressed fallback.
4. Apply selection only at the existing map-entry initialization. Do not steer manual orbit, an established lock, movement-follow ownership, held movement basis, or recovery springs during ordinary play. Do not alter camera/user pitch controls, wall opacity, FOV, character dimensions, arrival positions, enemies/damage, generation versions, saves or pinned geometry.

The unavoidable tradeoff is explicit: at this corner no tested direction simultaneously offers a long open forward path and comfortable rear camera clearance. The fallback shows the complete body and adjacent side floor while facing a nearby wall; it does not invent room behind the player. Hosted acceptance must judge whether that starting view is more usable. The player must retain immediate manual recovery in either direction.

Required focused regressions: exact raw-entry identity/position/yaw/1.10-tile clearance preserved; actual zero-input death/guardian-safe arrival produces a safe useful initial camera; full-body bounds at landscape and portrait viewports; no mutation of map/save/generation; unchanged wall/arch/ceiling exclusion and finite projections; unchanged probe caps (entry≤41, ordinary frame≤5; samples bounded as before); original-facing tie stability; no-qualifying-candidate fallback; manual yaw, held movement, lock intent, pause/resume and stationary non-oscillation retained. Keep all existing camera assertions and version pins. Final combined-source integration and hosted raw entry, death/respawn, real production Act, manual orbit and near-wall movement remain separate acceptance gates.
