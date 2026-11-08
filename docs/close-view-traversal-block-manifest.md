# Close View traversal blocks candidate

Status: isolated, unnumbered source candidate on `claude/close-view-traversal-blocks`, base `a2685814`. Not integrated, published or accepted on hardware. Contact core is a separate frozen candidate. The coordinator owns integration, release identity, independent review, preview and hosted CUA acceptance.

## Owner contract and reproduced defect

Stone is a one-level support block; two can stack. Jump reaches one from ground and two from an adjacent one. The standing limit is five physical records, including each stacked block, and lifetime is ten active seconds. Wood remains an intentional blocking wall. Production material selection continues to default to wood. Builds remain transient and clear on area load/reload.

The earlier actual `Game.buildAt` probe used `CONTACT-AUDIT`, legacy PG `keep`, `building:CONTACT-AUDIT:-4:0:keep:3:f1`, tile `(8,4)`. Stone became `blocked=false`, `buildLevel=1`, `elev=1`, but neither live nor freshly built native static geometry contained its raised surface. A further probe at `(13,4)` confirmed legacy `elevationAt=0`, `liftAt=0`, and both ordinary walking and Jump allowed entry. This was a support/rendering gap, not merely a missing prism. The old guide's historical “dungeon stone needs no jump” behavior is superseded for **active built stone only** by the owner's latest explicit block contract.

At current-v4 `terrain-ramps`, same seed, tile `(19,13)`, stone on base level3 reaches level4, top z1.36 above ground1.02: one authoritative `.34` level. Wood spans 2.4 in native wall geometry. The source evidence does not establish that the owner's whole-wall report was caused by wood selection. Hosted PG lacked Pack/Supplies material selection, so it could not provide a truthful stone/wood comparison before these fixtures. No source probe is claimed as a hosted observation.

## Bounded implementation

| Source | Responsibility |
|---|---|
| `src/landscape.ts` | `legacyInteriorBuildLevel` recognizes active stone on a legacy building map, ignoring historical generated `elev`. Surface sampling, `liftAt`, `elevationAt` and `canStep` agree on levels1/2. Unbuilt legacy surfaces retain their original behavior; current heightfields retain their existing branch. |
| `src/building.ts` | Private WeakMap revision and active-stone flag change only at successful place/stack/remove operations. Records, material costs, hits, lifetime, caps and restoration rules remain unchanged. No durable field or circular map reference is added. |
| `src/close-view.ts` | A legacy stone tile contributes one five-face prism: 30 vertices, z0→.34 or .68, in the existing static pass. Existing legacy vertices, ceilings, wall trim, arches, furniture and lights stay byte-identical. Static/wall caches include the build revision. Actor/sprite bases, camera clearance and bounded screen picking use the same stone support. With no WebGL, active raised blocks use the established world-view fallback. |
| `src/close-view-gl.ts` | GPU floor/hazard masks include the same build revision, including fully visible maps that otherwise keep a mask indefinitely. This prevents stale wall masks after removal. No shader or draw pass changes. |
| `src/renderer.ts` | World-view feet use active legacy support; Close View capture suppresses that ground lift so native support is applied exactly once. |
| `src/proving-ground-labs.ts`, `src/proving-ground.ts` | Two quiet production-generated scratch fixtures, explicit stone/wood and view selectors, resources, instructions and read-only live diagnostics. Material selection uses production `setBuildKind`; Build and taps use normal `pressBuild`/`Game.buildAt`, and traversal uses ordinary movement/Jump. |

No new source module, build/config edit, generator algorithm, history default, save migration, damage rule or production menu change. No edits to the Contact worktree or other specialists' files.

Maximum added legacy geometry is 150 vertices across five separate stone tiles; a two-record stack still uses one prism. Mutation rebakes occur once on demand, not every frame. The revision is a bounded unsigned counter in a WeakMap; the active flag scans only the capped build-record list. Surface reads and revision checks are constant-time. A test performs 100 repeated static reads after each mutation with zero extra rebuilds. Fresh and cached geometry agree after placement, stacking, top removal and expiry. Geometry retirement relies on existing WeakMap/GPU replacement behavior, without a new retained cache. The existing bounded ray picker remains 640 steps plus14 refinement steps.

The current-v4 generic treatment that raises a local ceiling with a stone heightfield remains unchanged. This candidate deliberately fixes the legacy runtime overlay without redesigning current interior architecture. Existing wood geometry remains a full wall in Close View.

## Proving Ground recipe and normal controls

Open **Close View Lab**, then choose either:

- **Build practice: legacy keep · stone and wood** (`build-blocks-legacy`, interior v2).
- **Build practice: current keep · stone and wood** (`build-blocks-current`, interior v4).

Use seed `CINDER-VERGE-47` and Start test/Reset same. Both use the production identity `building:CINDER-VERGE-47:4:0:keep:3:f1` with the explicitly selected scratch pin. A deterministic clear level lane is selected from existing tiles; no rooms or surfaces are stamped. If a seed has no lane, the fixture reports failure rather than altering terrain. Initial scenario placement is at that lane; building never teleports the player onto a block.

| Fixture | Start and facing | First/second build tiles | Original support |
|---|---|---|---|
| Legacy | `(14,11)`, up | `(14,10)`, `(14,9)` | Level0 |
| Current | `(22,21)`, down | `(22,22)`, `(22,23)` | Level3 |

The developer menu exposes **Build practice · scratch materials → Build with** and **View**. Both start with stone selected, Continuous build off, 100 stone and100 wood. Press normal **Build** to raise the tile ahead and enter build aim mode. Tap its visible top to stack. Use ordinary movement and **Jump** to climb. Raise one on the first tile and two on the next to compare the one-to-two step; a two-high stack cannot be entered directly from ground. Choose **Wood wall · 4 wood** to compare its blocking wall. Switch Close View/World view in the practice controls. **Pause** freezes active lifetime; **Reset same** reconstructs the scratch fixture and starting stock. No production journey or material default is changed.

Diagnostics include selected/affordable material, remaining stock, support level/native support height, active view, and each physical record's coordinates, level, remaining lifetime and hits. The quiet load wrapper remains instance-local and removes combatants after dungeon reloads. Ordinary production export/reload clears builds, as before; reconstruction through `createLabFixture`/Reset same restores only the fixture recipe. The new selector refuses unrelated fixtures.

## Executed offline evidence

`tests/close-view-traversal-blocks.test.ts` contains ten approved new regressions:

- Legacy .34/.68 geometry, shared footing, unchanged old ceiling/decor bytes and restoration of arbitrary old elevations.
- Immediate cache updates versus fresh builds, with no repeated rebakes.
- Explicit wood/stone distinction and unchanged production default.
- Actual Game walking/Jump in both views and both revisions, with two-high refusal and adjacent ascent.
- Existing v4 elevated mesh/support.
- Five physical records, independent stack lifetime, ten active seconds and pause.
- Production reload clearing, unknown schema-14 field preservation, isolated scratch reconstruction.
- Existing slope/door/structure/blocked/lethal refusal behavior without spending.
- Two additional seeds and legacy keep, hive, arcology and Pentagon themes.
- Mock-GL submission at low/balanced/full with reduced motion on/off, raised picking, immediate GPU-mask invalidation and no-WebGL fallback.

Executed sequentially:

```text
node --test tests/close-view-traversal-blocks.test.ts
# 10/10 passed.

node --test tests/building.test.ts tests/interior-terrain.test.ts tests/interior-v4-arrival.test.ts tests/close-view-terrain-render.test.ts tests/close-view.test.ts
# 33/33 unchanged tests passed, including existing old generator digests.

node --test tests/close-view-traversal-blocks.test.ts tests/close-view-v4.test.ts tests/continuous-build.test.ts tests/enclosure-trap.test.ts
# 29/29 passed after GPU-mask invalidation (10 new +19 unchanged).

npm run build
# Passed: static offline PWA release 825 with Proving Ground PG-1.

git diff --check
# Passed.
```

Existing assertions/digests were not modified. Local servers, browser automation and full npm tests remain stopped under the established EACCES/network boundary. Mock GL proves data submission/control flow, not shader compilation, actual occlusion quality or hardware FPS.

## Integration and remaining acceptance

The coordinator stacked frozen Contact `088458ef` on Block `4e1bb167` for integration preparation. The bounded bridge imports `legacyInteriorBuildLevel` into `actor-contact.ts` and consults it before the no-landscape early return. Contact therefore reads the same active legacy stone level as the block footing sampler; unbuilt historical `elev` values still remain flat, and current-v4 support is unchanged. This stack does not combine the ordered Contact/Block release scope.

Three new `contact-block-integration.test.ts` regressions compare legacy stone/current heightfield contact queries, preserve unbuilt/wood legacy flat support, and exercise actual Game build/stack/top-break/expiry support. `node --test tests/contact-block-integration.test.ts tests/grounded-contact.test.ts tests/close-view-traversal-blocks.test.ts` passes 33/33. The unchanged building, interior-terrain, interior-v4-arrival, close-view-terrain-render, close-view, close-view-v4, continuous-build, enclosure-trap, close-view-combat-contract and release-consistency files pass 56/56, including old generation digests.

**Unresolved Contact vertical-clearance defect (reported before changing its rule):** on the unchanged generated v4 `platform-chain` fixture with seed `CONTACT-AUDIT`, platform `(21,4)` is level 1 and adjacent `(21,5)` is ordinary level 0. An offline real `Game.update(.05)` probe starts the player on that platform and places a stationary Root Brute at `(21,5.15)`. Normal Jump south starts at 1000 ms; at 1150 ms the player reaches y=4.48 (center gap .67, below canonical combined radius .736), and at 1450 ms reaches y=5.20 across the body. The retained platform launch level causes Contact's current `supportGap: 1` exemption. One logical level is only .34 world units; even the maximum .42 jump arc gives feet at .76. The actual Root Brute native mesh at its existing renderer scale 1.0472 spans z=.081689–1.858076, while the adult hero model height is 1.3776. These bodies visibly overlap vertically. Separate floor maps do not explain this single-map witness. The existing Contact test accepting `airElev: 2` crossing encodes the same unsupported assumption. It was preserved pending explicit correction approval, so passing tests are not ordinary-jump body-solid acceptance. No collision-height policy, actor dimensions, damage, timing or exemptions were changed by this bridge. A world-unit vertical body-clearance policy remains a Contact release blocker; hosted imagery is still required for visual acceptance.

Hosted CUA acceptance is still required on the exact future preview: both materials, both fixture revisions, visible feet/top alignment, normal Jump/stack controls, expiry/top break, both views, quality tiers and reduced motion. The ordinary current-v4 ceiling behavior and fallback-view switch are explicit limits, not new product acceptance claims. Physical phone FPS, thermals and multitouch have not been measured.

Suggested changelog: “Legacy Close View interiors now show built stone as short jumpable steps with matching footing; quiet build-practice labs make stone, stacks and wood walls directly comparable.”

Suggested field-guide CODE: “Active stone builds overlay one/two support levels on legacy flat building interiors, rendered in the existing static pass and sampled consistently by feet, movement, camera clearance and picking. Runtime build revisions invalidate geometry and GPU masks; isolated legacy/current practice fixtures expose production build controls and material selection.”

Suggested field-guide BOUNDARY: “Unbuilt legacy generation and elevation semantics, current-v4 geometry, wood walls, costs/hits, five physical records, ten active seconds and reload clearing are retained. No save migration or production selection-default change. CPU/mock-GL checks do not establish hosted visual or phone performance acceptance.”

## Reviewed Echo/main integration receipt — 2026-11-08

Ordinary merge `477ebee313a38b698327822564294afe603ffa15` (tree `ea85c14bb82018a3b76f7efa4a87b8c600b6dc70`) integrates complete reviewed Echo/main candidate `6f24df3fed294dea703413f62d2214c3e959f954` into traversal/contact preparation `5657517168b62f4d3d27d60b8686fb8d293bd27a`. Release-manifest conflicts retain the incoming complete release-830 lists while preserving B's required `actor-contact` module in the static build and both service-worker precaches. Runtime unions retain world-unit grounded body contact, deterministic overlap escape, active legacy Stone geometry/support, current-v4 support, five physical records, independent stack lifetimes, ten active seconds and build-revision invalidation. The incoming history contributes current main/Echo continuity, raised Salvage/future cone ribbons, whole-frame GL fallback and quiet Echo fixtures. No Hammerfall, spell-gesture or newer tool-startup history is included.

Server-free focused validation ran 19 inspected traversal/contact/build/interior/Echo/hero/GL/fixture files directly with `node --test`: **130/130 passed**. Static `node scripts/build.mjs` passed and `git diff --check` passed. Release 830 is inherited and unassigned for this frozen preparation; it is not a traversal-block delivery or publication claim. CPU/mock/source checks do not establish hosted GPU appearance, phone performance, full CI or publication acceptance; those remain coordinator gates.
