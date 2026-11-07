# Wayfarer imported rogue asset pass

## Owner direction and preserved work

Use a real rigged humanoid asset as the normal Wayfarer base. Keep the existing muted green/gray clothing, leather and bronze style. Reduce exaggerated head/hand/boot proportions so the result is not cutesy. The owner selected the silver-masked, white-haired central Cleric head instead of a hood. The normal Wayfarer wears face protection/covering and a protective suit suited to the Corridor; flexible/flowing fabric is appropriate because magic and technology remain indistinct. No cape is required. Do not add a literal oxygen, pressure or toxicity rule. Preserve the creature, special-form, companion, combat and camera work already completed; do not replace these with a new engine.

The chosen sources are Quaternius's CC0 RPG Character Pack Rogue body/rig and Cleric head, obtained through the creator's official page and public Drive folder. Original source, license and exact SHA-256 are retained under `docs/asset-sources/wayfarer-rogue/`. It is an imported derivative, not original art authored by this project. Exclude the separate source dagger and attach actual equipped game tools.

## Implementation plan

1. Verify source mesh/texture/rig/clip extraction and reproducible conversion. Retain the actual exported hierarchy, including independently animated foot joints and rigid body attachments.
2. Fit the imported masked head and derive less exaggerated proportions through the skeleton with coherent neck/face/hand/socket placement. Remove the original rogue hood while preserving the collar and protective silhouette. Keep the original painted fabric detail; apply the Wayfarer palette without flattening it into a few vertex colors.
3. Sample and blend the source rig for actual normal-player presentation. Existing accepted gameplay states and clocks remain authoritative; animation never triggers movement, damage or projectiles. Explicitly distinguish missing-clip pose layers from imported animations.
4. Use one bounded textured hero path within the existing two model/depth passes. Keep ordinary model format, monsters, clones and 8/14/20 actor caps unchanged. Record the real hero geometry, upload and CPU cost instead of claiming zero overhead.
5. Calibrate held-gear sockets, lift, statuses, hit flashes, silhouettes, pause/reload and safe fallback. No schema or generator changes.
6. Validate source fidelity, proportions, locomotion, melee, tool/cast/dodge/jump fallbacks, camera framing, source sockets and all preserved special forms in hosted Preview. Measure bounded desktop skin/pack cost; do not claim physical-phone FPS without a device measurement.
7. Use a focused PR after the existing character/companion PR. Assign its release number only from fresh main at merge preparation; run consistency/build/CI, exact Astra review, Preview and authorized Publish verification, then record the publication.

## Source facts and acceptance gates

- Before the head swap, complete nonweapon Rogue: 1,658 triangles, 1,520 indexed vertices; 1,037 vertices require skinning. Seven required body/attachment meshes remain; only the 668-triangle dagger is excluded.
- Thirty-two source joints, twelve source clips. Feet are children of Root; their translated animation must not be discarded or reconstructed as a conventional leg hierarchy.
- Source clips: idle/armed idle, walk/run, two dagger attacks, punch, roll, two hurt reactions, death and pickup. There are no imported jump, ranged, cast, block, strafe or two-handed clips.
- Original painted unlit textures are required, including the selected head source; preserve them in an offline atlas or bounded hero-only material path. Naive vertex-color conversion loses detail and is not accepted by default.
- The source has no cape mesh, cape bones or cape clips. No cape work is planned.
- Current implementation status: both licensed sources acquired, body architecture reviewed, masked-head extraction/proportion contract pending; conversion/runtime/visual acceptance pending. This manifest is a plan, not a completion or performance claim.
