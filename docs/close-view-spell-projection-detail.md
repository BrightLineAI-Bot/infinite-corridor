# Close View spell projection detail

Implemented against the approved `close-view-spell-projection-plan.md` contract.

The frame plan remains Set-compatible for existing projectile floor drawers, but owns typed ephemeral entries for ordinary projectiles, Fire Burst shells, and at most one exact Orbit flight reference. Admission order is ordinary/T, Fire array order, then Orbit. The unchanged quality caps are 12/20/28; every entry is at most 12 vertices and Orbit is six, so the established 336-vertex maximum remains intact.

Fire and Orbit use canonical XY and support + .66. Fire retains its analytic .058-second/.9-tile trail and Orbit has no trail. The floor mask is reference-exact: Fire suppresses only its cinder body, while Orbit suppresses only the current flight body. Gather, rings, impacts, fields, vortexes and effect owners are unchanged. No renderer adapter escapes to Game or serialization, and no Orbit persistence was added.

Before floor capture the renderer verifies critical GL programs, VAOs, VBOs and textures and reserves the finite CPU decal capacity. Failed readiness or allocation leaves ordinary rendering in charge. Upload errors, thrown GL calls, and context loss fail the whole close-view scene before canvas copy or `CAM.drawn`; transient captures and counts are cleared so main/Proving Ground can render the ordinary unmasked frame.

The imported hero's final left socket can emit one bounded manual Fire/Orbit release flash. It is gated by the final cast action, accepted descriptor, alpha/readiness, pause clock, and clear supercover segments. Only Fire's exact accepted central `sourceId` can receive a connector; Orbit never does. Tool priority retains the shared lane. Native/fallback heroes do not synthesize a socket cue.

Hosted/device review is still required for WebGL depth occlusion, the additive cinder-shell readability, moving front/side/rear sequences, phone performance, and context-loss behavior on real drivers. This work does not claim release, server/browser-suite, network, armor-history, or publication clearance.
