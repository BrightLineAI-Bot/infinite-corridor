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
- Implemented source conversion: remove the original 144-triangle hood, seal its six-edge collar, attach the complete Cleric masked head at constant .40 scale; retain all twelve Rogue clips and independently translated feet. Protective glove/undersleeve classification covers 274 triangles using actual source joint weights. Original textures remain byte-identical.
- Final body: 3,170 triangles, 3,602 referenced indexed vertices. Dynamic upload is 86,448 bytes/frame; two original 1024-square texture layers use about 10.67 MiB with mipmaps. Exactly two additional indexed draws share existing silhouette/body phases. Ordinary actor format and caps are unchanged. Desktop Node sampling/skin/pack measured p50 .346 ms / p95 .635 ms (1,000 warm samples); GPU upload and phones were not measured.
- Converter/runtime/GL plus actual renderer integration: 25 focused tests passed, including deterministic offline regeneration, source sockets, shared roll compensation, texture/context fallback, ordinary-form admission, unchanged actual special forms, paused pose and no gameplay mutation. Build passed. A CPU textured front/quarter/side diagnostic verified the forward silver mask, white hair, seated collar, covered arms and muted palette; it is not hosted GPU proof.
- Pending gates: independent source review; fresh-main integration/release packaging and CI; hosted animation, sockets, source texture rendering, camera and status checks; authorized publication and exact live verification. Physical-phone FPS and hardware multitouch remain unmeasured.


## Owner art iteration — 2026-11-07

The owner approved the style/design of the first textured hybrid preview, but found the body too thick and the hands excessively large. Refine the torso/frame and hand proportions coherently through the rig/mesh, preserving the approved mask, white hair, clothing palette, world height and held-gear sockets. The eyes should be yellow or amber; warm amber is selected to match the bronze accents. Do not recolor the whole mask or introduce a new glow pass. The first CPU sheet is an intermediate reference, not final proportion acceptance. Regenerate views and verify animations/sockets after these changes.


Implemented owner refinement: bind-space frame width .80/depth .82, wrist/palm/thumb-root scale .62, unchanged world height and source feet/animation stroke. Amber lenses sit behind real mask apertures; all original silver mask/white hair remains source-colored. Body, normals and both sockets share knockdown transforms; pause-adjusted idle and accepted-action geometry survive actual Game pause/resume. Twenty-five focused converter/runtime/GL/actual-renderer checks passed. CPU full-body and enlarged-head views confirm revised proportions and amber apertures across front/quarter/side; hosted GPU acceptance remains pending.


Packaging rehearsal reproduced a parent-reference rejection in the imported loader. The loader now derives its application root from the terminal src module path, preserves the exact hosted/preview prefix and clears only module query/hash. Metadata, binary and texture requests stay inside that application. Unsupported module layouts refuse loading and retain fallback. The preview validator, workflows and release-script guards are unchanged. Pure URL tests cover hosted, nested preview and file URLs without network; focused URL/runtime/actual-renderer checks pass26/26.


## Neck bridge acceptance repair

Hosted r820 rendered the intended frame, hands, silver mask and amber eyes, but its rear head-to-collar join exposed a true .065–.095-tile gap. Lowest-chin seating hid this in front. A focused converter derivative adds a six-sided muted fabric neck:19 vertices/30 triangles, exact lower collar positions/weights, Head3-owned middle/top into the hair, and a concealed upper cap. Existing outer-coat tri284 supplies the cloth texel; all original PNGs, body/head geometry, source clips, head.40 scale/seating and world height remain unchanged. There is no runtime, shader, material or pass change.

Independent source/CPU acceptance checked189 sampled poses with exact zero lower seam distance; front/rear20-pose sheets remain coherent through inversion and knockdown. The original open mask retains a small chin stand-off. New committed runtime regressions cover189 posed seams; converter tests cover normalized weights, finite closed side geometry and deterministic output. Final body3170 triangles/3602 vertices,86448dynamicbytes/frame, below the3328-body cap. Binary SHA256 b416dfc255827d03d95a4f358734dc83a2f741659fd6404939cf59820ddf1113. Hosted repaired-GPU/torchlight acceptance remains pending. r820 itself remains held from production.
