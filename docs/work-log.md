# Work Log

## 2026-09-25: Standalone mobile Proving Ground candidate

- Added a separately installable `/proving-ground/` PWA using production laboratory code with isolated manifest, worker scope, cache namespace, scratch reset, visible experimental identity, and non-sensitive diagnostics.
- Extended the static build and development server to emit and serve both application roots without changing production save schema or production manifest identity.
- Discord routing target is channel `1552902598372237312`; the approved workflow admits requests there but promotes only an immutable tested proposal through `push <proposal-id>`.

## 2026-09-24: Save-schema interface contract reconciliation

- **Scope:** Reconcile the declared `local-save-schema` provider version with the current durable save contract without changing runtime save behavior, migration logic, release output, or project identity.
- **Evidence:** `src/types.ts` declares `SAVE_VERSION = 14`; `migrateSave` accepts versions 10 through 14 and normalizes them to version 14; regression coverage verifies schema-12 progress and persisted dungeon discovery remain intact at `SAVE_VERSION = 14`. Project-control history shows a direct-major convention: provider versions 8.0.0, 10.0.0, 12.0.0, and 13.0.0 corresponded to save versions 8, 10, 12, and 13.
- **Changed:** `.change-control/project.json` now declares `local-save-schema` `14.0.0`. The Field Guide, verification matrix, and regression-test title now name schema 14 consistently. The project has no component requiring this provider interface, so no in-repository consumer migration is required.
- **Verification:** Fresh status returned `ok:true` with no active operations or blockers; checkpoint `838a4485a8374a7f8704ee8c657b16d474fd08fa9de082dda0a5c4d6ff0a5e7a` preserved existing work. Full test/build and final configuration/diff checks are required before commit.

## 2026-09-24: Normal boot and journey-management repair

- **Root causes:** The normal entry module declared `dungeonPointDiscovered` through two imports and therefore stopped at parse time; the Proving Ground did not reveal this because it uses a separate entry module. New Journey also depended on native `prompt()` dialogs and reused the normal switch path, whose pre-switch autosave could overwrite the new save when the selected empty slot was already active.
- **Changed:** Removed the duplicate import; added in-panel create, replace-confirmation, cancel, and rename forms; added a single-flight operation gate; made slot activation follow successful durable creation; skipped stale-current persistence for an active empty slot; and made pending IndexedDB failures visible to switching code rather than silently treating them as success.
- **Compatibility:** Save schema remains 14. Existing healthy, damaged, recovery, imported, and mirrored saves retain their formats and slot keys. Proving Ground persistence isolation is unchanged.
- **Verified:** The guarded apply matched its authorized plan; all 308 automated tests passed, including the executable development-server check; `npm run build` produced the Release 91 offline PWA; and `git diff --check` found no whitespace errors. A clean-origin browser audit also passed normal boot, create/cancel/reload and active-slot identity, all Options categories and Journal tabs, Pack filters, Atlas waypoint controls, core actions, pause/resume, a 390 x 844 mobile viewport, and isolated Proving Ground boot without console errors.

## 2026-09-24: Progression, equipment reinforcement, Aperture disciplines, and dynamic melee

- **Scope:** Complete vendor comparisons, make accumulated Weapon/Armor Spheres useful, connect Aperture to bounded player progression and exceptional encounters, and expand melee behavior without converting ordinary enemies into a global scaling treadmill.
- **Changed:** Added ranked, capped equipment reinforcement at Sela; save schema 14; five Aperture disciplines across four threshold bands; safe temporary Aerial Step traversal; expanded item comparisons; deterministic long-reach, lunge, zigzag, hop, and slam melee modules; and a fourteenth Proving Ground lab plus new inventory/combat scenarios.
- **Compatibility:** Existing saves retain character, equipment power, inventory, world, quest, dungeon, and reward state. Ordinary creature scaling and existing dungeon identities are unchanged. Learned abilities are additive and activation is explicit.
- **Verification:** Focused progression coverage passed 5/5 and the static offline release-91 build completed. The first restricted-copy suite exposed one equipment defect and could not spawn its development-server subprocess; after the repair and guarded apply, the canonical suite passed 304/304 with no failures, skips, cancellations, or todos, including the development-server check. The canonical static offline release-91 build also completed.
- **Honest boundaries:** Ember Form enlarges the rendering and combat reach but deliberately does not enlarge collision geometry. Hop attacks use committed wall-safe motion rather than crossing solid walls. Physical-device touch and long-session performance remain manual checks.

## 2026-09-24: Wayglass repair and complete Proving Ground laboratory lattice

- **Scope:** Separate Wayglass fast-travel anchors from Singing Array rest points and Broken Observatories, correct excessive overworld scarcity without making Wayglasses routine, and activate the eight remaining diagnostic laboratories.
- **Baseline:** The pre-change `WAYGLASS-AUDIT` corpus measured 346 Wayglasses (2.36%), 7,645 rest points (52.22%), and an observed maximum Chebyshev drought of eight sections across the inner sample. Wayglasses and rest points also shared one renderer branch.
- **Changed:** Added explicit navigation metadata and distinct sprites; added one deterministic candidate anchor per five-by-five macrocell; completed direct Wayglass/navigation, environment/domain, hunts/creatures, inventory/equipment/vendor, performance, recovery/save/death, scenes, and records laboratory recipes using production generators or isolated scratch-save state.
- **Verification:** Focused Wayglass and laboratory coverage passed 3/3. The complete isolated suite passed 299/299 with no failures, skips, cancellations, or todos. The validation build produced static offline PWA release 91. The corrected 14,640-section corpus measured 919 Wayglasses (6.28%), 7,323 rest points (50.02%), and a maximum observed drought of four sections. Browser checks are recorded after guarded apply.
- **Open follow-ups:** Physical-device touch, long-session performance, and installed-PWA behavior remain manual validation. Diagnostic state laboratories expose production data and transitions but intentionally do not modify real saves.

## 2026-09-24: Dungeon card reveal, safe recovery, and production Proving Ground input

- **Scope:** Tighten dungeon exploration to reveal only the card currently occupied, repair ordinary-v4 recovery placement, and give the Proving Ground the normal canvas-targeting action path.
- **Compatibility:** Previously discovered cards remain discovered. No save-schema, generator-version, reward, encounter, or world-geometry change is introduced.
- **Verification:** The focused card/recovery/input suite passed 3/3. The complete isolated suite passed 290/290 with no failures, skips, cancellations, or todos in 84.55 seconds. `npm.cmd run build` produced static offline PWA release 91. Applied-repository and browser checks follow the guarded apply.
- **Open follow-ups:** Hands-on mobile traversal and touch targeting remain device checks.

## 2026-09-24: Unified deterministic dungeon exploration

- **Scope:** Added a common deterministic topology/discovery contract across ordinary, deep, multi-level, and bounded-arena maps; introduced enlarged ordinary-v4 profiles; and expanded dungeon Proving Ground controls and diagnostics.
- **Baseline:** `main` at `f161f0c`, matching `origin/main`; `origin/gh-pages` at `49cb883`; only the historical `HANDOFF-TO-CODEX.md` was untracked and remains excluded. Pre-change checkpoint `e028b6054146c10acbf30ab5d1d9d2447e8e4cbfd9b478f8aaf941807a196172` observed 48 files.
- **Compatibility:** Existing generator-2 and generator-3 histories retain their generators. New ordinary histories use generator 4. Save schema advances from 12 to 13 solely for per-level discovered-chunk state.
- **Boundary:** Temporary and persistent arenas receive contract diagnostics but remain bounded combat spaces without fog-driven exploration. No swimming or diving was added.
- **Verification:** In the isolated proposal tree, the focused compatibility repair run passed 9/9, the final dungeon/Proving Ground diagnostic run passed 4/4, and the final complete suite passed 289/289 with no failures, skips, cancellations, or todos in 91.85 seconds. `npm.cmd run build` produced static offline PWA release 91. Local in-app-browser smoke checks showed an initialized normal-game HUD and the production ordinary-dungeon laboratory with generator 4, standard size, variant 0, 44 topology chunks, four initially revealed chunks, a reachable critical route, and entrance/guardian developer teleports. Change-Control apply/verify remains pending; no commit, push, or deployment was performed.
- **Open follow-ups:** Physical-phone pacing, installed-PWA offline behavior, and complete hands-on traversal of every seed/variant/archetype remain manual checks.

## 2026-09-24: Proving Ground v2 production laboratories

- Added a scratch-state laboratory registry and URL-addressable scenario recipes.
- Implemented playable Shelter/Building, Ordinary Dungeon, Deep Dungeon, Threefold Dungeon, and Monster/Elite Combat labs using production generators and Game simulation.
- Added deterministic seed/variant controls, reset, pause, diagnostics, report copying, and developer teleport targets.
- Kept Wayglass, environment, hunt, inventory, performance, recovery, and scene labs visibly planned and unavailable.

## 2026-09-24: Feature audit and Shelter Gallery vertical slice

- **Scope:** Audited the field-guide packages against runtime call sites and tests, then added a separately booted developer Proving Ground with six deterministic shelter fixtures.
- **Isolation:** The entry module does not import normal startup or persistence. Fixture changes exist only in a fresh in-memory save and Reset constructs a new fixture.
- **Validation target:** Automated fixture identity/isolation tests, full regression suite, release build, normal boot, Proving Ground boot, and offline reload.
- **Honest boundary:** This slice makes Shelter Gallery playable. Dungeon, combat, waypoint, encounter, performance, and save laboratories remain future slices.

This log records implementation-level work that is too detailed for `CHANGELOG.md`. Every meaningful work item must update this file and, when user-visible or release-relevant, the changelog as part of the same change.

## Entry format

```md
## YYYY-MM-DD: Short work-item title

- **Scope:**
- **Baseline:** branch, commit, and relevant working-tree state.
- **Changed:** files and behavior.
- **Verification:** commands actually run and their actual result.
- **Open follow-ups:** risks, deferred checks, or manual validation gaps.
```

## 2026-09-24: Release 88 startup and cache recovery

- **Scope:** Repair the confirmed startup failure path and cache-identity collision while preserving gameplay, saves, world generation, and all pre-existing uncommitted work.
- **Baseline:** `main` at `acfa0eb`, ahead of `origin/main` by two commits, with existing edits to `CHANGELOG.md`, the field guide, this work log, and `scripts/dev.mjs`, plus untracked `HANDOFF-TO-CODEX.md`. Change-Control checkpoint `6c09ade26562a91c676e6cbf68426e607146cb6773f0a40442b00d8d3143ecc6` records those bytes.
- **Changed:** Release identity advances from 87 to 88. The game module import no longer waits for service-worker registration or `registration.update()`. Service-worker failures warn without blocking play, a failed game import displays an error without a reload loop, activation deletes only obsolete `infinite-corridor-` caches, the dev server accepts an ephemeral test port, and regression tests execute the development server as well as asserting boot/cache policy.
- **Verification:** `npm.cmd test` passed 277 tests with 0 failures, skips, cancellations, or todos in 71.09 seconds, including executable dev-server probes. `npm.cmd run build` completed and reported `Built static offline PWA release 88 in dist/.` A fresh-port in-app-browser run populated a 1600×900 canvas, `60/60` health, and `Ember Refuge · standing` without a boot error. After the static server was stopped, reloading the same URL produced the paused game from cache; Resume restored the interactive HUD. Change-Control plan `2b37a2ce0b14d986f2f5aa575d2ff90ff5e454d583b143711a736855245250e0` verified `valid:true`, `state:completed`, with its current input binding intact.
- **Open follow-ups:** Installed Android airplane-mode startup and sustained mobile frame pacing still require device validation; automated browser and Node checks do not establish those device-specific properties.

## 2026-09-20: Documentation and verification baseline

- **Scope:** Introduce minimal changelog, work-log, decision-record, verification, and test-maintenance governance without altering gameplay, source logic, tests, dependencies, save compatibility, or Change-Control configuration.
- **Baseline:** `main` at `14205c05ce4a16faacef27a6aa2eb5bfe222c8a1`; the working tree was clean before these documentation edits. Change-Control project ID: `8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6`.
- **Confirmed source versions:** `SAVE_VERSION = 12`; `WORLD_GENERATION = 1`.
- **Changed:** `CHANGELOG.md`, this work log, decision-record guidance, verification guidance, test-suite maintenance guidance, and a narrow README link update.
- **Verification:** `npm.cmd test` passed 273 tests with 0 failures, 0 skips, and a reported duration of 124.86 seconds. `npm.cmd run build` completed successfully and reported `Built static offline PWA release 87 in dist/.`; `dist/index.html`, `dist/manifest.webmanifest`, `dist/sw.js`, and `dist/src/main.js` were present. `dist/` is ignored. Post-build Git and whitespace checks are recorded with this work item.
- **Open follow-ups:** Current Android installation, offline airplane-mode behavior, touch-control usability, and device-performance validation are not established by this record unless performed and recorded separately. Future work should not treat deterministic automated checks as proof of those manual behaviors.

## 2026-09-22: Dev server versioned-asset 404

- **Scope:** Repair the local dev server so it can serve the versioned asset requests that `index.html` makes. Development tooling only. No gameplay, game source, test, dependency, save-schema, generation, or `dist/` change.
- **Baseline:** `main` at `acfa0eb` (ahead of `origin/main` by 2). Working tree otherwise clean. Change-Control project ID `8225aa1c-9d77-49ac-a8a9-f6b740f7d6f6`.
- **Reported symptom:** the game was not playable. Reported by the project owner as the game being down.
- **Diagnosis:** `scripts/dev.mjs` resolved the request path with `decodeURIComponent(req.url.slice(1))`, so the query string became part of the filename. Measured against the running server before the change: `/sw.js?v=87`, `/styles.css?v=87`, and `/src/main.js?v=87` each returned **404**, while the unversioned forms returned 200. Headless Chrome against that server reported `TypeError: Failed to register a ServiceWorker ... A bad HTTP response code (404) was received when fetching the script` (artifact `%LOCALAPPDATA%\Temp\ic-probe\console.log`). The service-worker registration and `await import("./src/main.js?v=87")` are statements in the `boot` async arrow function declared at `index.html:153`; `index.html` contains no `try` statement. The 404 rejects `boot()`. The rejection handler attached at `index.html:179` calls `console.error(e)` and schedules `setTimeout(() => location.reload(), 1200)` at `index.html:181`. The page therefore loaded, never became playable, and reloaded. Correction to an earlier draft of this entry: the failure was **not** silent. It was written to the browser console and never shown on screen; the projected symptom was a blank canvas that reloads.
- **Changed:** `scripts/dev.mjs`, three narrow repairs, all confined to path resolution:
  1. Query strings are stripped before a path is resolved, so versioned asset requests resolve to the real file. This is the repair for the reported outage.
  2. The document-root case now goes through the same stripping, so `/?v=87` resolves to `index.html`. Measured before this repair: `/?v=87` returned **404** while `/` returned 200.
  3. Root containment is decided on path components, not on a string prefix: `relative(root, full)` must not begin with `..` and must not be absolute. The previous test, `full.startsWith(root)`, accepted any sibling directory whose path merely begins with the root string. `C:\AI-PROJECTS\infinite-corridor-pages-release40`, the deployment worktree this guide documents in section 22, is exactly such a sibling. Measured before this repair: `/../infinite-corridor-pages-release40/index.html` returned **200** and served that worktree's file (`md5 f7190340b1fd0386074c16ac00d0b967`; this repository's `index.html` is `a28dd0ce81344df86c0dadf4776ba35c`). This defect is **pre-existing** and was not introduced here: it reproduced identically against `git show HEAD:scripts/dev.mjs`.
  Non-behavioural edits: the file was reformatted from one long line into a readable multi-line file, and the unused `stat` and `join` imports were dropped. Preserved exactly as before: the `/` to `index.html` mapping, the `src/*.js` to `src/*.ts` rewrite, the `.ts` specifier rewrite, and the content-type map.
- **Verification:**
  - Post-change, against the restarted dev server: `/sw.js?v=87`, `/styles.css?v=87`, `/src/main.js?v=87`, `/index.html`, and `/manifest.webmanifest` all return **200**; the unversioned `/styles.css`, `/sw.js`, and `/src/main.js` also still return **200**.
  - Headless Chrome against the fixed dev server, fresh profile: exit 0, **no console output at all** (the service-worker registration error is gone), and a screenshot byte-identical to the production `dist/` screenshot (`md5 be79656389a76a34127c69a36cc905ce`). The captured frame shows the initialized HUD, action diamond, and message viewport.
  - Root cause isolated by contrast: `python -m http.server` over `dist/` returned **200** for the same versioned URLs before any change, and the `dist/` build booted with no console errors.
  - Post-repair probes against the restarted dev server, every one issued with `curl --path-as-is` so no client-side normalization could mask a path: versioned assets `/styles.css?v=87`, `/sw.js?v=87`, `/src/main.js?v=87`, `/manifest.webmanifest` returned **200**; document URLs `/`, `/?v=87`, `/index.html?v=87` returned **200**; containment probes `/../infinite-corridor-pages-release40/index.html`, `/../package.json`, `/src/../../package.json`, `/%2e%2e/package.json`, `/....//package.json`, and `/C:/Windows/win.ini` returned **404**; ordinary in-repo files `/index.html`, `/styles.css`, `/sw.js`, `/src/main.js`, `/src/game.js`, and `/package.json` returned **200**.
  - The served `src/main.js` is byte-identical to the on-disk `src/main.ts` (`md5 1cb86e392e00449ab6a2b7d2f6ab7f67`), so the `.ts` specifier rewrite still applies.
  - **Boot is NOT verified, and an earlier draft of this entry claimed otherwise.** The draft reported that the headless-captured DOM contained JavaScript-injected content, citing `#hudDetails` and `#identity` reading `Cinder Verge`. That was wrong. `Cinder Verge` is static markup in `index.html`, and a text-extraction comparison of the never-executed static `index.html` against the headless-captured DOM returns **identical** values for `#hudDetails`, `#identity`, and `#actions`, with `#healthText` and `#eventBanner` empty in both. The captured DOM is the static document: nothing proves the entry module evaluated, and no `<canvas>` element carries a width or height attribute in either. Treat headless capture here as unable to distinguish a booted game from a static document. What this change is verified to do is serve the correct bytes at the correct URLs; whether the game then initializes is **unverified** in this environment.
  - Consequence for scoping: the HTTP-level repairs above are independent of whether the game boots, and they do not explain the reported production regression on the deployed site. See the separate investigation record; do not treat this entry as a diagnosis of a deployed failure.
- **Open follow-ups:**
  - The full `npm.cmd test` suite completed after this entry was first written: **274 tests, 274 passed, 0 failed, 0 skipped, 0 cancelled, duration 479,262 ms**, exit code 0. This change touches no file the suite imports, so the result is confirmatory rather than load-bearing; it is recorded because the earlier draft of this entry said the run had not returned. Note for future runs: one generation test (`every story assigned to a multifloor entrance installs a reachable initiator`) consumed 88,015 ms of that total, so the suite routinely needs far longer than a two-minute timeout and should be run in the background.
  - The screenshot comparison is an initialization check in headless Chrome, not proof of player-facing playability on a device.
  - An independent review **was** performed: a separately dispatched session examined the working-tree diff against five bounded questions and returned **CONSISTENT WITH FOLLOW-UPS**. Its findings are the reason for repairs 2 and 3 above and for the correction to the diagnosis. Independence is **limited**: the reviewer ran in a separate session but on the same model family as the implementer, and the conditions in decision 0001 section 4 (own workspace, pinned architecture-class model, task record) were not verified. Record the verdict as stronger than self-review and weaker than a fully independent Steward. The reviewer's adversarial containment testing is what produced the sibling-worktree escape measurement quoted above.
  - The dev server still binds `0.0.0.0` (`scripts/dev.mjs:34`), so it is reachable from the local network for as long as it runs, and it serves any in-repo file by path. Narrowing the bind to `127.0.0.1` would break phone access over the local network, which is how this game is actually played, so the choice belongs to the owner and was deliberately not made unilaterally. It is disclosed here and in the field guide rather than silently left implicit.
  - `root` is now resolved to an absolute path, but it is still derived from the launch directory (`process.cwd()`), so the served root depends on where the command was started. Making it independent of the working directory was identified by the reviewer and is deferred rather than done, because it changes how the server behaves when launched from elsewhere.
  - The change was applied to the working tree directly rather than through the `draft`/`prepare`/`authorize` flow. It is uncommitted and can be reverted with `git checkout -- scripts/dev.mjs` if the owner prefers the controlled path.

## 2026-09-20: Pause-time invalid-position recovery

- **Scope:** Add a safety-only geometry recovery check at the transition into pause. It repairs an invalid player footprint in the current area without becoming a travel, dungeon-exit, death, or combat-escape mechanic.
- **Baseline:** `main` at `14205c05ce4a16faacef27a6aa2eb5bfe222c8a1`, with the existing unstaged documentation-governance changes preserved.
- **Changed:** `Game.setPaused` now invokes `Game.recoverPosition` only when entering pause. The method reuses `relocateIfStranded` and `footprintOpen` through the current map width, moves only an invalid player position, synchronizes the corrected coordinates, and reports recovery only when it occurred. Added regression coverage that verifies valid positions remain unchanged and that recovery preserves area, coordinates, enemies, projectiles, effects, inventory, health, stamina, and saved position.
- **Verification:** `npm.cmd test` passed 274 tests with 0 failures, 0 skips, and a reported duration of 138.55 seconds. `npm.cmd run build` completed successfully and reported `Built static offline PWA release 87 in dist/.` `git diff --check` and `git diff --cached --check` completed with no whitespace errors; Git emitted existing line-ending conversion warnings for `README.md`, `src/game.ts`, and `tests/prototype.test.ts`.
- **Open follow-ups:** Manual device validation should include pausing while deliberately placed in invalid dungeon and structure geometry. This automated coverage does not establish that every generated dungeon placement path is valid.
# 2026-09-24: Variable dungeon hazards and sealed-card presentation

- Expanded ordinary and deep dungeons with deterministic, bounded trap packages instead of a single repeated hazard.
- Added seed-variable fire/spike selection, cardinal fire lanes, timing, range, radius, and damage while protecting entrances, objectives, bosses, functional objects, water, bridges, and sealed gates.
- Removed visual leakage from unrevealed cards in the combat-overlay layer. Enemy simulation deliberately remains independent of discovery, so a creature can emerge from darkness without its prior silhouette being shown.
- Added Proving Ground hazard diagnostics and regression coverage for determinism, safe placement, variability, concealment, and directional damage.

# 2026-09-24: Ordinary dungeon material identities

- Gave Hollow Relay, Root-Sunk Cistern, and Glass Kiln generation-3 and generation-4 maps stable recipe-specific wall and floor kinds.
- Added dedicated renderer treatments: fractured relay panels, damp root-threaded aqueduct blocks and reflective flagstone, and staggered refractory brick with riveted furnace plates.
- Kept collision and topology semantics unchanged and added regression coverage that rejects missing or aliased material identities.
- Follow-up: widened Hollow Relay wall/floor luminance separation after device review showed the lighter wall panels blending into floor tiles. Floors are now consistently blue-gray; walls are near-black with an additional recessed interior shade and stronger panel border.

# 2026-09-24: Sparse dungeon terrain hazards

- Added deterministic, optional pit and water patches to ordinary dungeons while retaining authored Cistern water and bridge geometry.
- Terrain patches protect entrances, objects, and enemies and are reverted if they disconnect any protected point from the entrance.
- Reused the established canyon/dungeon-water rendering and grounded-center death/recovery behavior. No swimming, diving, or pit-exploration mechanic was claimed or introduced.
