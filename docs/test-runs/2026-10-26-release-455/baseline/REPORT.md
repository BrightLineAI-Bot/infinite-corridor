# Infinite Corridor release 455 technical audit

**Audit date:** 26 October 2026. **Scope:** read-only cloud verification of traversal, progression, persistence, economy, world bosses, Far Array, endurance and the isolated rendered Proving Ground preview. This report records reproducible defects separately from design questions and untested player experiences. It is not a release certification or a claim of complete mobile coverage.

**Pinned commit:** `04c11a0d3b73eeb9c767e9548cd3724c92a8dba9`  
**Candidate tree:** `54fdea1a0e8d7395c616e60415c9e263b27ee8f3`  
**Checkout:** `/tmp/ic-audit-cloud/repo`  
**Evidence root:** `/tmp/ic-audit-cloud/`. Artifact paths resolve under this root; bare filenames inherit the named component directory. Source references resolve against the pinned checkout.

## Summary

**Six confirmed findings: 4 MAJOR, 2 MINOR, 0 POLISH.** The strongest normal-input issue is runtime cistern water disconnecting a Mislaid Threshold guardian route. Another major affects only the preview Diagnostics modal. The other two majors concern deliberately malformed save inputs, not naturally observed corruption. The minor findings concern migration's nonthrowing contract and one Wayglass failing the tested walking-access checks.

The full repository suite passed **1,424 tests, zero failures**, in **254.287 seconds**; `npm run build` exited successfully and built release 455. An additional 335 targeted boss tests passed as overlapping reruns, not 335 distinct additions to the full-suite count. Passing tests did not prevent the independently reproduced findings below.

### Top five priorities

1. **F001:** Preserve guardian connectivity after runtime cistern edits; a natural Threshold reproduces the obstruction, and ordinary recovery returns to the same entrance.
2. **F002:** Restore visible Diagnostics and dismissal in the isolated preview; its invisible modal makes the background inert.
3. **F003:** Reject malformed meal ingredient keys before declaring a save healthy or choosing it over a healthy mirror.
4. **F004:** Normalize or reject nonfinite and out-of-domain numerical save fields before runtime/economy use.
5. **F006:** Check generated service approach paths; one natural Lattice Wayglass cannot be reached by the tested walking route.

F005 remains actionable but lower risk because production validation catches the tested migration exceptions. Boss outcomes below are balance-review signals, not additional correctness findings or human win rates. No fixes were applied.

## Confirmed findings

### F001 [MAJOR] Runtime cistern water disconnects a Threshold guardian

**Area:** Dungeon runtime construction and Mislaid Threshold progression.

**Reproduction:** Create `freshSave()`, set seed `CLOUD-WORLD-105`, construct `new Game(save,0)`, set section `(48,-3)` and call `loadArea('overworld',false)`. The naturally generated object `shelter-surprise-48--3`, at `(22,8)`, is a Mislaid Threshold. Place the test player beside it and call `interact('enter',object.id)`. This succeeds and enters `displacement:48:-3:shelter-surprise-48--3`, entry `(20,4)`. This uses a naturally generated device, but relocates the test player; it is not an organically travelled journey from the refuge.

**Expected:** Runtime decoration preserves a route to the guardian required to unlock the exit, or supplies usable recovery. **Actual:** The entrance component contains 109 tiles; guardian `(4,16)` is outside it. Exit refuses while the guardian lives, Stuck returns to `(20,4)`, home travel refuses, and a fresh character has no Crossing Sigil. This is a progression obstruction, **not proof every character is permanently softlocked**: a held Sigil escapes, and traversal magic, swimming equipment or digging resources may offer alternatives.

**Frequency:** 18/400 synthetic starts, seeds `THRESH451-0` through `THRESH451-399`; 1/47 naturally generated devices selected from the 2,400-section surface sweep. These are sample counts, not population incidence. Synthetic failing indexes are `32,38,45,52,65,82,112,125,142,145,162,205,238,252,288,305,382,392`, all section `(5,-3)`, object `seam-<index>`. Restoring only the four runtime water cells to their pre-runtime generated values reconnects every one of the 18 cases.

**Evidence:** `reachability/natural-repro.log`, `natural-map.json`, `threshold-causal.json`, `threshold-causal.log`. Isolated seed `THRESH451-82`, level 30, ID `displacement:5:-3:seam-82`, has entry `(4,4)`, hollowMarshal `(35,36)` and only 29 connected floor cells. Its nearest connected position `(10,4)` is 40.6079 tiles from the guardian, without line of sight. A 3,600-update/120-second simulation leaves the guardian outside; ordinary Jump into water kills and returns the player to the same entrance. See `threshold-82-repro.txt`, `threshold-82-map.json`, `guardian-check.log`.

**Source and suggested fix area:** `src/game.ts:2022–2023,2062–2067` applies four blocked `dungeonWater` cells `(11,4),(12,4),(11,5),(12,5)` after generation, without layout restriction or connectivity recheck. `src/arenas.ts:31–38` does not undo existing water. Review this override and post-runtime reachability. Recovery references: exit lock `game.ts:2971`, Stuck `2517–2535`, home refusal `2445–2453`, Sigil `3402–3417`, terrain death `4650–4656`. Add regressions using both exact IDs; do not assume paired warp daises help before both ends are attuned (`2774–2785`).

### F002 [MAJOR] Preview Diagnostics opens an invisible modal

**Area:** Isolated Proving Ground UI only.

**Reproduction:** Open `https://brightlineai-bot.github.io/infinite-corridor/previews/r455-04c11a0d3b73/` in the tested cloud Chrome viewport, 1180×757, and click **Diagnostics**. Preview receipt, release identity and header identify the pinned candidate.

**Expected:** A visible, readable dialog with an accessible Close control and restored background interaction after dismissal. **Actual:** `#pgDiagnostics` is `open:true`, `hidden:true`, computed `display:none`, rectangle 0×0. The launcher remains visible but subsequent laboratory/Hide clicks do nothing. Reload clears the modal and restores selection. No production data loss or game crash was demonstrated.

**Frequency and evidence:** One clean browser invocation reproduced; source supports deterministic causation, not a measured population rate. `ui/ic-preview-hidden-diagnostics.jpg` shows the unchanged launcher; the DOM measurements in `ui/report.md` and `ui/diagnostics-observation.json` (a transcribed browser receipt), rather than the screenshot alone, establish invisibility. Semantic keyboard automation timed out because it could not focus an inert element; this does **not** establish that a human Escape key fails.

**Source and suggested fix area:** `src/proving-ground.ts:6` marks dialogs hidden; `src/proving-ground-mobile.ts:13` calls `showModal()` without clearing that state. Crucially, `styles.css:668` also forces Proving Ground dialogs to `display:none!important`; Diagnostics styling at `:678` supplies no open-state override. Fix both hidden-state and CSS consistency, then test rendered opening, closing and background restoration. Clearing `hidden` alone is insufficient. Do not generalize to Glimpses: its explicit override at `styles.css:677` yields `display:block` and a 392×551.84 rectangle despite hidden/open both being true.

### F003 [MAJOR] Malformed meals pass validation and crash game construction

**Area:** Corrupted-save/import robustness and fallback selection; malformed-input-only.

**Reproduction:** Replace a fresh save's meal with `{"a":"constructor","b":"ironroot","remaining":10}`. Call `validateJourney(raw)`, then `new Game(result.save,0)`. Ingredient `a:"__proto__"` independently reproduces.

**Expected:** Reject or normalize unknown ingredients, retaining a usable healthy fallback. **Actual:** Validation reports `healthy`; construction throws `TypeError: Cannot convert undefined or null to object`. In asynchronous in-memory IndexedDB/localStorage adapters, real `loadSave` selects a newer malformed meal candidate over an older genuinely healthy mirror, then Game construction fails.

**Frequency and evidence:** Both explicit inherited-property keys reproduce; no natural save-production path was established. `saves-economy/extra.json` and `extra.log` record inherited-key reproductions; `isolation.json` and `isolation.log` record fallback checks. This is not demonstrated spontaneous corruption or a security exploit.

**Source and suggested fix area:** `src/meals.ts:31,44` tests truthiness of `INGREDIENTS[key]`, allowing inherited properties; `:46` calls `Object.entries` on the absent bonus. Stack reaches `game.ts:328,1521`. Validation is `src/persistence.ts:16`; `loadSave` is `src/persistence.ts:30`. Use explicit own-key ingredient membership and gameplay-safe validation before fallback ranking, with regression coverage for both keys and a healthy older mirror.

### F004 [MAJOR] Nonfinite save fields survive healthy validation

**Area:** Corrupted-save/import numerical normalization; malformed-input-only.

**Reproduction:** Independently mutate fresh saves with `currency:"1e309"`, `stats.Vigor:"1e309"`, or `playSeconds:"1e309"`, then validate. For currency, call `eatMeal(save,"ironroot","ironroot")`; for Vigor, construct `new Game`.

**Expected:** Finite, domain-valid numerical state before arithmetic or persistence. **Actual:** All three validate as healthy. Meal purchase produces numeric `Infinity` currency; Vigor produces infinite HP/maxHP; migration returns infinite playSeconds. Numeric `1e308` and arbitrary negative currency are also accepted. Subsequent JSON serialization converts Infinity to null, changing the invalid state again.

**Frequency and evidence:** Deterministic individual injected cases, not observed gameplay-generated values. `saves-economy/extra.json` spells out nonfinite outcomes in `nonfinite` arrays because JSON numeric null otherwise represents serialized Infinity; see `extra.log` and `migration.json`.

**Source and suggested fix area:** Raw scalar/stat merges `src/types.ts:16`; playSeconds coercion `:42`; level-only finite validation `src/persistence.ts:16`; stat arithmetic `src/game.ts:311–330`; meal charging `src/meals.ts:62–65`. Centralize finite conversion and justified field bounds. Decide migration defaults versus damaged classification explicitly; test persistence and gameplay consumers after normalization.

### F005 [MINOR] Migration throws on malformed containers

**Area:** Requested nonthrowing save-normalization contract.

**Reproduction:** Set `inventory:{}`, `narrative.journal:{}`, `session.areas:{"dungeon:x":null}`, or a null history entry in fresh JSON and call `migrateSave` directly. **Expected:** Safe normalization or an explicit nonthrowing damaged result. **Actual:** Respectively, array-map, iterable, enemies-property and layoutVersion-property exceptions occur.

**Frequency and evidence:** 27 exceptions in 275 one-field mutations, 25 paths × 11 values; exact inputs/errors are in `saves-economy/migration.json`. All 27 are caught and classified damaged by `validateJourney`. Real-loader adapter checks reject newer `inventory:{}` and select an older healthy mirror; two empty stores yield a valid fresh game. This is therefore not an uncaught normal production loader failure.

**Source and suggested fix area:** `src/types.ts:16,36,44,46`; validation wrapper `src/persistence.ts:16`. Normalize container shapes before iteration or document and enforce the total wrapper boundary; preserve existing damaged-candidate fallback behavior.

### F006 [MINOR] Lattice Wayglass lacks access in walking route checks

**Area:** Surface service accessibility; walking-only finding.

**Reproduction:** Seed `CLOUD-WORLD-24`, section `(48,10)`, naturally generated `landmark-48,10`, Lattice Wayglass `(13,12)`. Generate the section and independently load it through `Game.loadArea`.

**Expected:** A service intended to be approached has an accessible interaction position, or a deliberate, readable traversal requirement. **Actual:** The Wayglass lies outside the plaza's cardinal-integer footprint/`canStep` connected component. Nearest reachable integer position `(15,14)` is 2.8284 tiles away; interaction requires less than 1.5. Nearby blocking is ordinary terrain, not an unopened door or missing door-object transition. Digging may provide access: this is **not a progression-blocker or universal-inaccessibility claim**.

**Frequency and evidence:** One walking-access caveat among 478 checked service objects across 2,400 generated sections. `reachability/wayglass.mjs`, `wayglass.log`, `wayglass-map.json` reproduce it. An additional eight-direction search on the actual Game map at 0.5, 0.25 and 0.1 tile spacing also failed to approach within 1.5; its finest search visited 42,011 positions, nearest `(14.8,13.5)`, distance 2.3430749 (`wayglass-subtile.mjs`, `wayglass-subtile.log`). **Source and suggested fix area:** Service roles/activation are `src/world.ts:92,95`; interaction proximity is `src/game.ts:2749–2759`. Review placement/connectivity; root cause was not isolated. Discrete fine-grid searches do not exhaust all continuous routes, magic or digging.

## Suspected issues not reproduced as defects

- Four ordinary current-generation runtime maps have guardian-route candidates: `CLOUD-RUNTIME-32`, `-72`, `-122`, `-171`. IDs are respectively `dungeon:CLOUD-RUNTIME-32:g1:15:-6:audit-current`, `dungeon:CLOUD-RUNTIME-72:g1:4:-7:audit-current`, `dungeon:CLOUD-RUNTIME-122:g1:3:-5:audit-current`, `dungeon:CLOUD-RUNTIME-171:g1:1:-2:audit-current`. They retain ordinary exits and have not each received combat/escape simulation; do not count them as four additional softlocks. Details: `reachability/runtime-summary.json`.
- Short boss survival windows, effect density and adaptive-policy losses warrant review but do not prove unfair combat. No reproduced boss correctness blocker was established.
- Glimpses is visibly open under its CSS override, not a second invisible-modal finding. Observed console errors originated in browser extensions, not game source; the in-page record said Recent errors:none, but exception capture was not exhaustive.
- Increasing serialized save size does not establish a leak. Ghost-resource retention, heap growth and device performance were not instrumented.

## Player experience and world boss results

### What the encounter measurements mean

The final matrix contains **288 scripted headless encounters**: 216 world-beast/Questing and 72 Far Array, running production `Game.update`. Seeds are `BOSS-AUDIT-101`, `BOSS-AUDIT-202`, `BOSS-AUDIT-303`; each boss/policy row contains three seeds × levels 8/20 × two builds. The step is 50 ms; stopping conditions are first death, boss kill, retreat, nonfinite state or 180 seconds. No health, damage or invulnerability cheats were used. All 288 final encounters were rerun sequentially under Node v24.22.1; both JSON outputs were byte-identical to repeat references.

Setup is synthetic, not naturally earned. XP is awarded through `awardExperience`, then earned stat points allocated round-robin Might/Vigor/Finesse/Resolve/Focus through `Game.allocate`. Starter equipment power is 6/3/1 for primary/tool/armor; rank3 upgrades yield 9/6/4 using fixture-granted spheres removed afterward. Builds omit glyphs, echoes, constellation choices, advanced spell unlocks and rare loot. Three default draughts are available. These are valid conservative builds, not optimized endgame profiles.

World beasts receive their minimum Aperture tiers 3–8 and are directly enrolled in a synthetic unobstructed 32×32 walled arena, section `(7,2)`, player `(14,16)`, boss `(18,16)`, IDs `audit:<seed>:<kind>`. Array uses native `generateListenerArena`, ID `far-array:<seed>:arena1`, with native geometry/pylons retained but controlled starting coordinates. Aperture90, Gate2, ten answered relays and prior Listener clear are synthetic; production `tuneArrayBoss` is applied as at `src/game.ts:2137`.

Novice approaches within 1.2 tiles, requests melee every 0.5 seconds and dodge every 4 seconds, without tools/potions. Adaptive reads attack state through a **nonvisual oracle**, reacts after 350 ms, circles/backs away, requests dodge at least 1.3 seconds apart, melee every 0.3, tool every 0.8, spell every 4 seconds, and potion below 50% HP. Real stamina/cooldowns apply. It does not learn counters, jump shockwaves or prioritize summons. “Adaptive” is a policy name, not proof of skilled human play.

### Complete encounter matrix

Time is time to **terminal outcome**, not time to kill unless the boss died. Each row is 12 cases; repeated seeds are not independent population samples. Values below are unchanged from the boss audit.

| Boss | Policy | Boss kills/12 | Time min/median/max (s) | Median boss HP remaining | Peak live actors / pack effects / shots |
|---|---|---:|---|---:|---|
| morphingBlob | novice | 0 | 5.85/7.90/11.80 | 89.4% | 5 / 22 / 0 |
| morphingBlob | adaptive | 0 | 22.65/31.85/55.15 | 57.2% | 5 / 25 / 1 |
| tremorWorm | novice | 0 | 6.20/8.57/17.55 | 74.4% | 3 / 26 / 0 |
| tremorWorm | adaptive | 0 | 25.00/35.65/46.50 | 54.2% | 5 / 30 / 1 |
| mountainTurtle | novice | 0 | 9.95/12.45/26.60 | 83.9% | 1 / 15 / 0 |
| mountainTurtle | adaptive | 0 | 27.90/32.65/37.70 | 71.4% | 1 / 17 / 1 |
| nanobotKnight | novice | 0 | 4.80/6.85/11.90 | 100.0% | 1 / 9 / 0 |
| nanobotKnight | adaptive | 0 | 11.25/20.95/40.45 | 83.8% | 1 / 8 / 1 |
| lightningGiant | novice | 0 | 6.95/14.82/18.45 | 44.9% | 1 / 6 / 0 |
| lightningGiant | adaptive | 0 | 23.90/37.08/55.20 | 74.3% | 1 / 5 / 1 |
| psychicCrystal | novice | 6 | 4.80/16.23/24.50 | 17.8% | 1 / 16 / 0 |
| psychicCrystal | adaptive | 0 | 30.55/40.83/49.55 | 52.9% | 1 / 28 / 1 |
| voidWalker | novice | 0 | 4.60/5.62/10.25 | 81.2% | 1 / 33 / 0 |
| voidWalker | adaptive | 0 | 6.15/16.50/27.50 | 79.0% | 1 / 36 / 1 |
| astralWorm | novice | 0 | 3.80/6.65/10.45 | 81.5% | 1 / 0 / 0 |
| astralWorm | adaptive | 0 | 10.90/28.80/39.60 | 64.5% | 5 / 0 / 1 |
| questingBeast | novice | 0 | 3.50/4.12/6.65 | 97.3% | 1 / 18 / 0 |
| questingBeast | adaptive | 0 | 9.40/14.60/20.30 | 92.1% | 1 / 30 / 1 |
| listener-open | novice | 0 | 20.65/22.75/24.80 | 52.5% | 11 / 11 / 3 |
| listener-open | adaptive | 0 | 43.80/54.08/68.10 | 28.3% | 14 / 10 / 5 |
| listener-walled | novice | 0 | 23.75/33.45/34.55 | 58.0% | 7 / 2 / 41 |
| listener-walled | adaptive | 1 | 81.85/105.22/134.50 | 13.9% | 9 / 4 / 46 |
| guardian | novice | 12 | 27.50/29.75/31.50 | 0.0% | 2 / 1 / 0 |
| guardian | adaptive | 12 | 28.80/47.15/51.00 | 0.0% | 2 / 1 / 1 |

World outcomes: **210 player deaths, 6 boss kills**. Array outcomes: **47 player deaths, 25 boss kills**. These are scripted outcomes, not human win probabilities or full-hunt completion rates.

Questing and Walker provide short novice learning windows on lean builds. For starter/level8/novice `BOSS-AUDIT-101`, Questing starts at playerHP148/bossHP2737/base damage81, kills the player at 3.50 seconds, and retains 2675 HP; capped player HP losses are 77 at 1.45 seconds, 66 at 2.45 and 5 at 3.50. Walker starts 118/712/base damage57, ends at 4.60 seconds with bossHP670; losses are 57 at 2.80, 38 at 3.45 and 23 at 4.60. Fatal losses are HP-clipped, not raw overkill. Full logs and setups are in `bosses/metrics.json` and `array-metrics.json`.

Questing dominance is intentional in `src/world-beasts.ts:397–413` and `src/questing-beast.ts:47–48`; the four-try/wound-carryover contract means first-life loss is not a failed hunt. Crystal's six novice kills versus zero adaptive kills expose policy sensitivity, not a proven difficulty bug. Do not recommend blanket nerfs from these runs.

Shared pack timing at `src/monster-pack.ts:522` uses damage×0.85, windup×1.2, cooldown×1.25 and gap×1.35. Walker's independent warnings (`:780–795`) include rend 0.48s, beam 0.35s, horizon 0.65s, constellation 1.1s, nova charge 2.3s and dash 0.28s with 1s damaging trails. A 350ms policy can miss a 280ms dash warning; continual movement is separate counterplay. Nova nominal radius7 is a 14-tile diameter, not the whole world. Morphling custom timing/geometry is in `src/listener-morph.ts:24–39,64–86`: lunge0.6s, beams0.7s, cables0.8s, jaw0.65+0.45s, sink1.3s, four 9-tile beams and up to eight 18-tile cables. These are source-grounded timings, not measured visual reaction opportunities.

Observed maxima were 36 pack effects against cap48 (`monster-pack.ts:2727`), 8 live mirror clones against cap8 (`listener-mirror.ts:22,40`), 5 live Morphling worms against cap8 (`listener-morph.ts:37`), and 46 projectiles. Generic Array actor peaks may include recovered-area actors on death frames; mirror/worm maxima are separate. Counts do not establish device performance or universal projectile caps. No matrix run reached timeout, retreat or nonfinite termination; separate regression fixtures, not these short runs, cover retreat/lifecycle behavior.

### Rendered observations and remaining player questions

The exact preview rendered a Void Walker scratch encounter: Monster & Elite Combat Arena → Void Walker → Start test → Pause, recipe `CINDER-VERGE-47`, variant0, standard tile, one live Walker, playerHP60. After developer teleport Near the combatants, Resume and Attack visibly rendered Walker/orb effects, melee arc, water/collision scene and action diamond. Hide/Dev menu toggles worked after reload. Evidence: `ui/ic-preview-void-walker.jpg`, `ic-preview-walker-combat.jpg`.

At desktop size the silhouette and gold melee arc were distinct against muted tiles, purple effects differed from terrain, and controls stayed visible. The preview banner and expanded developer panel obstructed screen space; the northern fixture boundary exposed dark out-of-map space. Neither observation establishes a normal-game camera defect. There was no pixel-timed warning, hitbox alignment, sound-cue, accessibility contrast or touch-reaction measurement. The next useful player evidence would be organically progressed saves and actual mobile Questing/Walker/Crystal encounters, including successful counterplay and four-life hunts, before changing balance.

## Coverage tested and not tested

### Traversal and world generation

**8,447 map/section cases** across 1,200 distinct suite seeds, plus focused reproductions and causal checks. Natural-device cases reuse world seeds; 8,447 is not a unique-seed count.

| Executed suite | Cases | Result and boundary |
|---|---:|---|
| Direct ordinary v2/v3/v4/v5/current | 1,000 | No arrival/exit/guardian/dais route candidates |
| Direct deep-v1 | 200 | No candidates after final gates opened in test state |
| Direct deep-v2 all five archetypes and levels | 1,600 | No exit/transition/guardian candidates after gates opened; not full objective playthroughs |
| Actual Game ordinary loads | 1,000 | Four current-generation guardian-route candidates |
| Actual Game synthetic Threshold starts | 400 | 18 causally verified disconnects |
| Actual Game natural Threshold starts | 47 | One disconnect, verified through actual enter interaction |
| Special generation nine families | 1,800 | 200 each: grotto, original dive, arena, hunt-instance, elite portal, annex, Far Array run, Listener hall, dream dungeon; no tested target candidates |
| Surface and Far Sleep sections | 2,400 | 200 seeds × 12 coordinates; 478 services; F006 caveat |

Floods use production `footprintOpen` and player `canStep`, jump-enabled +1 elevation, cardinal integer positions and <1.5 interaction proximity. Main sweeps do not invent warp edges; both daises must be approachable before attunement. The original Threshold sweep permissively included paired-dais edges; its 18 failures remain failures and were individually causally checked. Direct generators do not substitute for runtime construction—this distinction exposed F001.

Not exhaustive: continuous sub-tile routes, linked-mouth round trips, cross-level objectives/shortcuts, all overworld exit edges, remembered/custom-town Wayglass injection, boat/swimming/breath budgets, arbitrary magic/ranged equipment, hazards and hostile combat, old save snapshots or naturally travelled routes to remote devices. The historical 4/120 seed scheme was unavailable; this is independent reproduction, not an exact historical replay.

### Persistence economy progression and isolation

- `AUDIT-PLAY-0`…`99`: 18,000 updates, random actions, pause/resume frame65 and forced zero-HP death frame120; 800 JSON/migration/Game reconstructions matched position/resources and combat motion/cooldowns within 1e-7. Zero failures. Each run contains only six simulated seconds from the refuge.
- `AUDIT-ECON-0`…`99`: 6,000 meal attempts checked charges, insufficient funds, persistence and 901-second expiry; socket/masterwork one-time purchase plus 20 post-reload refusals; salvage plus 20 replay refusals; lore persistence. Zero failures.
- `AUDIT-THRESH-0`…`59`: 54 guarded crossings passed defeat-handler → JSON/migration/reconstruction → threshold-door exit; six lacked guardians. Enemies were marked dead synthetically, not defeated in simulated full combat.
- 80 shop seeds covered unique-purchase replay and quantities -1/0/1/10/999/1e308 with 99 supply cap; 400 hunt reward replay checks, 80 shelter gifts and 80 cook purchase/distance checks passed. All 480 Aperture-band × Listener-count0…5 × Walker-slain0/1 traversal-gate combinations passed.
- Five partial/empty/large inputs included preservation of a 1,000,000-byte unknown field, not resource-exhaustion testing. Reforge was not independently swept.
- `ISOLATION-455`: 82 scenarios across hunts, inventory, magic, recovery, scenes and records kept a production sentinel byte-identical with no instrumented storage calls. Fixture references: `proving-ground-labs.ts:21,91,300–317`. This does not establish every UI reset path.
- Actual production/PG service-worker source executed in separate Node VM contexts deleted only its own prior cache from five fake names; current, other-app and unrelated caches survived (`sw.js:114–118`, `proving-ground/sw.js:3`). Real registration, request handling, offline navigation, eviction and mobile shell reset were not exercised.

No real user save, browser quota/crash timing or storage suspension was tested. Adapter tests are not actual browser IndexedDB/localStorage operations. Inventory/reward coverage is limited to the listed paths; resource accounting is not heap-leak testing.

### Endurance boss regressions and UI gaps

`AUDIT-ENDURANCE-0`…`9` completed **180,000 updates**, ten runs × 600 simulated seconds, ordinary refuge random actions without invulnerability. No monitored nonfinite state occurred; peaks were enemies6/effects2/packEffects3/projectiles4, sampled save sizes 12,498–38,118 bytes. Evidence: `endurance/results.json`, `run.log`. This is **not high-density combat, a device benchmark or proof of bounded long-term save growth**.

Targeted boss regressions passed 186/186 plus 149/149, covering hunt spawning/pursuit, four tries, wounds/death/rematch, Walker attack completion/cleanup/pause/routing/ocean fixtures, Astral companions/retreat, Listener clones/Morphling targetability and Crystal waves/grabs. Relevant tests and exact sequential commands are recorded in `bosses/REPORT.md` and `regression-commands.txt`. Some use forced attacks, boosted spawning, inflated HP or stub worlds: they validate invariants, not balance. New Walker dungeon chance is currently zero (`world-beasts.ts:90` vicinity); pre-existing hunts continue.

**Untested UI:** 390×844 and 844×390 viewports, actual touch devices/latency, normal-journey Pack/Journal/Tome/kitchen/smith/Atlas dialogs, the full boss rendering matrix, offline behavior and accessibility contrast. Cloud browser offered no viewport resize. The local dist server was unreachable across command network namespaces; a shared-loopback escalation failed before execution because `bwrap` encountered a protected sessions path. It was not retried and no protected path was accessed. The independently verified remote preview was used instead; local browser testing did not succeed.

## Reproduction commands and evidence

Run against the existing pinned checkout; all custom harnesses live outside it. Commands overwrite audit output files, not production saves. The full method and exact mutation records remain in the four component reports.

```sh
cd /tmp/ic-audit-cloud/repo
npm test > /tmp/ic-audit-cloud/npm-test.log 2>&1
npm run build > /tmp/ic-audit-cloud/build.log 2>&1
node /tmp/ic-audit-cloud/reachability/natural-repro.mjs
node /tmp/ic-audit-cloud/reachability/repro.mjs 82
node /tmp/ic-audit-cloud/reachability/guardian-check.mjs
node /tmp/ic-audit-cloud/reachability/wayglass.mjs
node /tmp/ic-audit-cloud/reachability/classify.mjs
node /tmp/ic-audit-cloud/saves-economy/audit.mjs
node /tmp/ic-audit-cloud/saves-economy/extra.mjs
node /tmp/ic-audit-cloud/saves-economy/isolation.mjs
node /tmp/ic-audit-cloud/endurance/run.mjs
node /tmp/ic-audit-cloud/bosses/measure.mjs
node /tmp/ic-audit-cloud/bosses/array.mjs
python3 /tmp/ic-audit-cloud/bosses/report.py
```

For broad reachability, run `reachability/world.mjs` and `reachability/sweep.mjs` with modes `threshold`, `maps`, `runtime`, `natural`, `special`; world output must precede `natural`. Summaries/logs are `<mode>-summary.json`/`<mode>.log`; world evidence is `world-summary.json`/`world.log`. Boss repeat evidence is `metrics-repeat-reference.json`, `array-repeat-reference.json`, `repeat-world.log`, `repeat-array.log`, with byte comparisons returning exit0. Component reports are `reachability/REPORT.md`, `saves-economy/report.md`, `bosses/REPORT.md`, `ui/report.md`.

## Repository state

Final `git status --porcelain=v1` was empty and both tracked/staged diffs exited0 (`repo-state.txt`); HEAD and tree match the pinned identities above. Tracked source, configuration and tests, branches and production saves were not changed. Harnesses, in-memory fixtures and evidence were created under `/tmp/ic-audit-cloud/`; the build produced local ignored distribution output. Rendered scratch fixtures and menu state changed only as required by UI testing. Audit servers and browser tab were closed. No source fixes, commits, pushes, workflow dispatches, publication, external uploads or production storage resets were performed. Recommendations here require a separate authorized implementation pass.
