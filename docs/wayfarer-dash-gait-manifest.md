# Wayfarer directional dash and gait manifest

Updated: 2026-11-07. This focused pass changes normal imported-Wayfarer presentation only. It grants no release or publication authority.

## Contract

- Gameplay retains the canonical 260 ms dodge movement, 420 ms invulnerability, stamina cost, 4.8-tile/s movement, collision, and gameplay facing. Presentation emits no movement, hit, or invulnerability event.
- The normal imported renderer records its last successfully sampled phase, numeric speed and yaw in a bounded `WeakMap` keyed by the player. A successful dodge uses that record only when it is spatially relevant and fresh on the logical pause clock; otherwise a valid lock supplies facing and the Game phase/cardinal state supplies a no-visible-predecessor fallback. Rendering never writes Game/save state. Refused dodges do not replace metadata. The accepted seed is additive at schema 14, future keys survive, and malformed or legacy metadata normalizes to `null`.
- The normal imported hero alone receives the quickstep. Iron Fists, robot, power suit, Ember form, camera behavior, geometry, head, neck bridge, small hands, textures, shaders, and source archives remain unchanged.

## Motion

- The quickstep samples only the coherent crouch interval from 0.08–0.18 seconds of the licensed source Roll. Backward travel reverses that interval. Continuous forward/side components add modest Abdomen/Torso lean and Neck counter-lean; dominant labels are diagnostic only and do not choose the pose.
- Entry smoothsteps through 18%, the drive holds through 68%, then recovers. Horizontal Body drift correction applies identically to all vertices and both equipment sockets. There is no vertical compensation, invented lift, world motion, root/foot IK, or disconnected foot animation.
- Dodge displacement cannot trigger Run or advance a hidden gait phase. Its captured numeric base speed and phase remain frozen through recovery; the first post-dodge frame discards the last dash displacement before ordinary distance integration resumes. Ordinary 2.4-tile/s locomotion now remains pure Walk; only 2.8–4.0 blends smoothly toward Run. The derived Run sampler closes the final 10% toward its first pose with shortest-path quaternion blending, without modifying source bytes.

## Evidence and limits

Focused CPU tests sample four directions across 25 phases and several incoming gait phases, checking finite unit normals, grounding, crouch/upright bounds, phase continuity, exact endpoints/sockets, loop closure, accepted/refused Game behavior, pause/reload, malformed/future metadata, and unchanged special-form admission. The production renderer test covers steady walking into accepted phase zero and callback-free pause/unpause into an immediate partial-speed diagonal dodge; both retain the exact preceding uploaded hero buffer. Offline test and build results are recorded in the handoff.

No GPU frame, physical-phone performance, or hardware multi-touch claim is made. The saved gait phase uses the existing historic `walkPhase` mapping; this pass does not claim pixel-identical reload of every pre-existing walking frame. No dedicated source-CPU contact-sheet renderer exists in the repository, so no image contact sheet is claimed.
