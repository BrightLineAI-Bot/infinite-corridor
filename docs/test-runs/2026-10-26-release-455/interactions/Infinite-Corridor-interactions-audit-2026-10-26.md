# Infinite Corridor release 455 interaction audit supplement

**Date:** 26 October 2026. **Pinned commit:** `04c11a0d3b73eeb9c767e9548cd3724c92a8dba9`. **Source tree:** `54fdea1a0e8d7395c616e60415c9e263b27ee8f3`. **Checkout:** `/tmp/ic-audit-cloud/repo`.

This separate supplement examines the finite equipment, consumable, spell, glyph, Echo and constellation catalogs and selected interactions between them. It does not replace or modify the earlier cloud audit. Tests execute production mechanics in synthetic controlled fixtures, not human play, naturally progressed builds or rendered UI. Artifact paths below resolve under `/tmp/ic-interactions/`; bare filenames inherit the named component directory. Source references resolve against the pinned checkout.

## Summary

**Three confirmed findings: 1 MAJOR, 2 MINOR, 0 POLISH.** Rift Bombard damage loses supported tool on-hit effects; Shadow Clone ignores Heavy/Swift spell cooldown modifiers; stronger overlapping slow state fails to update the effective movement multiplier. These are valid-input mechanics defects, distinct from the earlier malformed-save findings.

Broad matrices also passed their implemented assertions, including all 576 equipment combinations, 156 spell/slot cases and 172 supply/meal cases. This is not contradictory: many crossing checks are smoke tests for successful activation, some damage, finite state or persistence, not a complete oracle for every advertised effect. The Bombard semantic check finds 6 failures among 24 cases despite the broad equipment matrix passing.

The main matrices contain 3,066 heterogeneous custom scenario rows plus 1,000 generated-item samples, with focused targeted reproductions and controls recorded separately, including six independent Clone cooldown controls and two independent slow controls. Some configurations repeat, many share one fixture seed, and outcomes include observations rather than pass/fail assertions. Do not interpret these as independent statistical samples or “all interactions tested.” Existing focused regressions passed 51 core/spell, 36 glyph/Echo/constellation and 25 weapon tests; these overlap the prior 1,424-test baseline and are not 112 new unique tests.

**Priorities:** preserve Bombard on-hit provenance with safe once-per-target behavior; apply or explicitly reconcile Shadow Clone's supported cooldown glyph contract; recompute overlapping slow multipliers without compounding. No fixes were applied. “Astral Cloak” remains unmapped: no literal item/spell/skill name was found in the searched source/tests/docs catalogs. Neither Shadow Clone nor enemy Astral mounting is substituted for it; a distinct requested Cloak test needs name clarification.

## Finite catalogs and supported combinations

### Equipment and affixes

Twelve named identities were mapped. Source: `src/items.ts:3–6,32–44`, starter equipment `src/types.ts:12`, Echo Compass story reward `src/story.ts:11`.

| Slot | IDs and names |
|---|---|
| Primary 3 | `salvage-blade` Salvage Blade; `primary-cinder-pike` Cinder Pike; `primary-verge-cleaver` Verge Cleaver |
| Secondary 4 | `spark-coil` Spark Coil; `secondary-lumen-spindle` Lumen Spindle; `secondary-needle-caster` Needle Caster; `secondary-rift-bombard` Rift Bombard |
| Armor 3 | `ash-wrap` Ash Wrap; `armor-kiln-mantle` Kiln Mantle; `armor-glassweave-coat` Glassweave Coat |
| Charm 2 | `charm-quiet-compass` Quiet Compass; `echo-compass` Echo Compass |

Primary shapes are cone 1.7 tiles/100°/base 7 damage, thrust 2.45/32°/base 8, and arc 1.75/180°/base 9 respectively. Tool profiles are magic straight Spark, magic returning Spindle, physical straight Needle and magic grenade Bombard. Generated random IDs resolve by the valid profile/name rules; catalog IDs above are fixture identities, not every procedural instance.

Four tiers—common, rare, epic, relic—have upgrade caps 3/4/5/6; masterwork adds one. Sphere cost is the new rank, using weapon spheres for primary/tool and armor spheres for armor/charm. Four affix mechanics cover seven legal placements: primary attack/reach, secondary attack/reach, armor ward, charm movement/reach (`items.ts:58`). Equipment `property` labels were not assumed to be independent bonus systems beyond implemented profiles/stats.

### Supplies meals spells and skills

Nine supply identities are Restorative Draught (`restorativeDraught`), High Potion (`highPotion`), Max Potion (`maxPotion`), Ironbark Tonic (`ironbarkTonic`), Lumen Phial (`lumenPhial`), Clearroot Ampoule (`clearrootAmpoule`), Crossing Sigil (`crossingSigil`), Hull Shield and Submersible. The custom 36 ordered supply pairs cover the first six; navigation/vehicle supplies have narrower existing-test coverage, not the full pairwise matrix.

Potions heal 30/60/full; High and Max can auto-brew for 3/5 draughts. Seven pantry IDs are `emberPepper` Ember pepper, `ironroot` Ironroot, `honeycomb` Honeycomb, `windleaf` Windleaf, `quickgrain` Quickgrain, `lumenCap` Lumen cap, `bloodmoss` Bloodmoss. They produce 28 unordered pairs including doubles. Meals last 900 unpaused seconds, one replaces the prior meal, and a doubled ingredient gives 1.5 × its single effect, not 2 × (`potions.ts:6–36`, `meals.ts:11–26,43–71`).

The castable catalog is exactly 12 entries (`items.ts:7–11,17–24`; `spell-slots.ts`):

| Type | IDs and names |
|---|---|
| Six spells | `cinder-dart` Cinder Dart; `ember-ring` Ember Ring; `grave-sun` Grave Sun; `shadow-clone` Shadow Clone; `gravity-well` Gravity Well; `stillpoint` Stillpoint |
| Six skills | `ember-form` Ember Form; `quickening` Quickening; `aerial-step` Aerial Step; `veil-guard` Veil Guard; `force-channel` Force Channel; `rift-step` Rift Step |

Slot keys prefix the ID with `spell:` or `skill:`. Duplicate A/B assignments are prohibited. All 132 ordered distinct pairs were exercised; all 20 reachable attribute pairings were represented. The 21 st defined pairing, force+force, is unreachable with the current single Force castable and duplicate prohibition. A later timed skill replaces the earlier active timed skill; pair tests do not claim simultaneous stacking of both.

### Glyphs resonances and limits

Ten IDs/names are `ignite` Ignite, `chain` Chain, `pierce` Pierce, `echo` Echo, `leech` Leech, `heavy` Heavy, `swift` Swift, `volatile` Volatile, `tether` Tether and `still` Still. All have melee, tool, spell, armor and Aperture-skill host definitions; host effects differ. “Fracture” is not in this registry and was not invented as a tested glyph.

Gear sockets by tier are 1/2/2/3, with at most one smith extra socket, maximum 4. Spells and `skill:<id>` hosts have 2. Charms do not take glyphs. Armor bonuses add then cap: move 24%, defense 15%, maxHP 30%, skill duration 60%, cooldown reduction 36%, attack readiness 36%, stamina regeneration 75%, dodge-cost reduction 60%, magic damage 36%, melee damage 30%. Skill infusion runs while a timed skill is active or for 4 seconds after Rift Step (`glyphs.ts:13–15,36–81,96–105`).

Eight resonances: `ember-choir` Ember Choir (Ignite+Echo); `wildfire` Wildfire (Ignite+Chain); `storm-lattice` Storm Lattice (Chain+Volatile); `afterimage` Afterimage (Pierce+Echo); `grave-tether` Grave Tether (Tether+Still); `comet` Comet (Heavy+Volatile); `blood-tide` Blood Tide (Leech+Heavy); `quickstep` Quickstep (Swift+Leech). Presence uses a set; duplicate glyphs do not duplicate named resonances, and not every on-hit rule scales with copy count (`glyphs.ts:84–93,133–144,164–195`).

### Echoes and constellation forms

The 26 Echo IDs and names are finite (`echoes.ts:31–58`):

| ID | Name | ID | Name |
|---|---|---|---|
| `thunderhorn` | Thunderhorn's Charge | `riftLynx` | Lynx Pounce |
| `pallidCrawler` | Pallid Skitter | `veilSpinner` | Spinner's Web |
| `strataEel` | Eel's Phase | `sunderjaw` | Sunderjaw's Rupture |
| `gnawingMaw` | Maw's Hunger | `amalgam` | Flesh Bloom |
| `cinderSeraph` | Seraph's Firefall | `hangedChoir` | Choir's Lament |
| `mirrorShade` | Mirror Swap | `lumenWraith` | Wraith Lantern |
| `siegeBeetle` | Beetle Mortar | `weepingSaint` | Saint's Regard |
| `listener` | Listener's Answer | `questingBeast` | Beast's Spines |
| `morphingBlob` | Blob's Spatter | `bloblet` | Bloblet Mend |
| `tremorWorm` | Worm's Upheaval | `wormTentacle` | Tentacle Ember |
| `mountainTurtle` | Turtle's Ward | `nanobotKnight` | Nanite Seekers |
| `lightningGiant` | Giant's Arc | `psychicCrystal` | Mind Ward |
| `voidWalker` | Rift Upheaval | `graveLantern` | Lantern Stillness |

Ordinary Echo equipment has 3 total notches; individual costs 1–3. The Lattice opens at Infinite III/band index 13 plus one Listener, with base 1 Echo and 2 passive slots, expandable by 3 each. Echo pairs here use one ordinary notch-equipped Echo plus one Lattice Echo, not an illegal ordinary-notch combination. Current eligible unowned guardian/world-beast Echo grants are guaranteed; ordinary/summoned/no-reward kills do not grant them. Ownership was synthetic in interaction sweeps, not naturally acquired.

Five branches have 15 node IDs and 30 primary/secondary forms (`constellation.ts:23–40,60–75`):

| Branch | Node ID and primary → secondary name |
|---|---|
| Form | `ember-skin` Ember Skin → Ember Ward; `colossus` Colossus → Ember Mend; `cinder-heart` Cinder Heart → Kindling |
| Motion | `light-feet` Light Feet → Second Wind; `aerial-step` Aerial Step → Long Quickening; `slipstream` Slipstream → Afterimage |
| Veil | `thorned-veil` Thorned Veil → Veil Pulse; `sanctuary` Sanctuary → Long Veil; `mirror-veil` Mirror Veil → Stillwater |
| Force | `overflow` Overflow → Wellspring; `amplifier` Amplifier → Bulwark Channel; `resonant-force` Resonant Force → Harvest |
| Rift | `rift-wake` Rift Wake → Rift Ward; `fold` Fold → Quick Fold; `anchor` Long Step → Rift Echo |

The persisted `anchor` ID means Long Step, not recall. Mastered branches may take both capstones. Secondary forms unlock at Infinite III; extra learned forms can coexist through the Lattice. This audit's node sweep selects one primary/secondary choice and does not exercise simultaneous Lattice passive forms.

## Confirmed findings

### I001 [MAJOR] Rift Bombard loses tool on hit glyph effects

**Reproduction:** `weapons/bombard-glyphs.mjs`, seed `WEAPONS-455`. Equip common power 6 Rift Bombard; grant and production-socket Ignite, Leech or Tether into tool slot 0. Synthetic flat 32 × 32 arena, section `(3,3)`, player `(10,10)` at 30/60 HP, ashling target `(13,10)` at 100000 HP, high cooldowns and controlled movement. Submit tool input through `Game.update(.05,...)` at 1000 ms, then 30 updates of 50 ms. Repeat with ordinary and boss-flag targets.

**Expected:** Supported tool hit contracts produce Ignite burn, Tether slow or Leech healing accumulation. **Actual:** All 6 Bombard rows deal 20 damage but produce no burn timer, no slow timer and no HP/fractional-heal-pool gain. The 18 controls—Spark Coil, Lumen Spindle, Needle Caster × 3 glyphs × 2 flags—exercise the expected effects. These boss flags are static target variations, not full boss fights.

**Frequency/evidence:** 6/6 targeted Bombard cases, one shared root cause; `weapons/bombard-glyphs.json`, `.log`, `fixtures.mjs`. Spark's 12-damage Leech hit legitimately accumulates 0.96 without an immediate whole-HP increase; it is not another failure (`game.ts:2482`).

**Source/fix area:** `src/glyphs.ts:19–28` supplies tool contracts without a Bombard exception. `src/game.ts:4739` converts grenade damage into `rift-blast` without `glyphHost`; `:4755–4767` only invokes glyph damage/hit behavior for effects carrying a host. Ordinary projectile callbacks are `:4748–4749`. Preserve appropriate on-hit provenance, define once-per-target semantics and prevent secondary recursion. Direct launch stat modifiers are separate: only Ignite/Leech/Tether missing procs are confirmed, not failure of all 10 glyphs.

### I002 [MINOR] Shadow Clone ignores spell recovery glyph modifiers

**Reproduction:** Eligible fresh synthetic save, Shadow Clone in slotA, B empty, no armor/pairing cooldown reductions. Grant/socket Swift into `shadow-clone` slot 0 through `socketGlyph`, then call `castSlot('a')`. Repeat baseline and Heavy. Exact seeds are `SPELL-GLYPHS-shadow-clone-`, `SPELL-GLYPHS-shadow-clone-swift`, `SPELL-GLYPHS-shadow-clone-heavy` in `spells/glyph-cross.mjs`.

**Expected:** Baseline 16 s, Swift 16 × 0.7=11.2 s, Heavy 16 × 1.25=20 s according to supported spell descriptions. **Actual:** All remain 16 s. Cinder Dart controls are 2.5,1.75 and 3.125 s respectively. Two Swift copies expect 7.84 s, two Heavy 25 s, Heavy+Swift 14 s; Clone still records 16 s.

**Frequency/evidence:** 21/66 Shadow Clone configurations disagree with declared cooldown modifiers; all other 330 spell configurations agree. `spells/glyph-cross.json` and `.log` record actual/declaration values. Six independent positive-control cases in `spells/clone-cooldown-repro.json` and `.log` confirm the baseline/Swift/Heavy contrast for Clone and Cinder Dart. Broad rows only asserted finite nonnegative damage, so zero smoke errors is not a cooldown-semantic pass.

**Source/fix area:** `src/game.ts:4282` dispatches Clone before glyph loadout processing at `:4299`; `:4338` uses pairing/armor reductions but not host glyph cooldown, while ordinary spells multiply it at `:4317`. `src/glyphs.ts:25–26` declares Heavy/Swift spell recovery effects; `src/main.ts:2491–2505` exposes spell glyph descriptions including Clone. Apply compatible cooldown modifiers or explicitly disallow/describe unsupported choices; preserve positive controls. Other Clone glyph effects need separate contracts and are not generalized from this defect.

### I003 [MINOR] Stronger overlapping slow retains the old speed multiplier

**Reproduction:** `glyphs/targeted.mjs`, `arena('SLOW-STACK455')`; socket melee Tether, grant/equip `veilSpinner`, attack at 1000 ms, update 1050, request dodge 1100, then two updates beginning 1150. This uses actual attack/update/dodge paths, not direct writes to target slow state.

**Expected:** Web's stronger stored factor 0.5 updates effective speed to 0.5 ×base. **Actual:** Before `{factor:0.6,speed:0.6,base:1}`; after `{factor:0.5,speed:0.6,base:1}`. Independent controls in `core/slow-independent.json` use `SLOW-INDEPENDENT-false/true`: Web alone applies 0.5; Web after Tether retains 0.6. Both restore 1 and clear the slow after expiry.

**Frequency/evidence:** Two focused deterministic setups establish the overlap case, not population frequency or every order/duration combination; see `glyphs/targeted.json`, `core/verify-slow.mjs` and `.log`. Training targets make this an effective-multiplier measurement, not visual travelled-distance or human balance evidence.

**Source/fix area:** Web promises half speed at `src/echoes.ts:35`; patch writes use `:115,182`. Tether writes 0.6 at `src/glyphs.ts:173`; `tickGlyphStatus` at `:198–203` only sets speed when `glyphBaseSpeed` is initially undefined. Recompute active speed from the saved base when the winning factor changes, without repeatedly multiplying slowed values. Test order, refresh and expiry behavior. Movement consumes this multiplier, for example `monster-pack.ts:2238`.

## Standalone and cross mechanic coverage

| Executed scope | Rows | Result and assertion boundary |
|---|---:|---|
| Equipment identity combinations |576|3 × 4 × 3 × 2 identities × 4 uniform tiers ×base/capped rank; live melee/tool hit, repeat readiness refusal, finite stats, gear migration; pass. Not mixed-tier Cartesian coverage.|
| Upgrade/masterwork/socket/equip swaps |48|12 identities× 4 tiers; exact costs/caps, one-time extra socket, charm refusal, persistence/conservation; pass.|
| Affix placements; reforge |28+28|Seven singles+21 pairs; effects/removal/persistence;20 reforges per placement/tier case,560 nested paid requests; pass.|
| Weapon boundary/lifecycle |35+19|Walls, untargetable, stun, cooldown switches, awakenings;12 death/reload and 7 pause/resume. Bombard wall behavior is unresolved, not a passed wall-block invariant.|
| Tools×Phial; weapons×skills; Nanobot |8+42+21|Phial magic boost/expiry; all 7 weapons× 6 rank 1 skills; plain/Ignite/Echo resistance controls; pass.|
| Tool glyph semantics |24|18 controls pass; 6 Bombard failures, I001.|
| Potion tiers; ordered supplies; meals |24+36+112|Healing/refusal/counts; resume HP/guard/magic;28 ingredient pairs×Tonic on/off×Veil on/off with exact cost/damage/pause/expiry; pass.|
| Castables standalone/pairs/duplicate slots |12+132+12|Explicitly aimed damaging casts; dual activation, cooldown-preserving presets/reconstruction;30-second finite-state/expiry; duplicates prevented; pass.|
| Every spell×glyph configuration |396|6 ×(baseline+10 singles+55 unordered pairs including doubles); metrics/no exceptions/finite nonnegative damage; cooldown comparison exposes I002.|
| Every skill×single glyph |66|6 ×(baseline+10 singles); activation, actual weapon hit and metrics; smoke pass, not every proc oracle.|
| Glyph host/tag matrix |444|74 configs× 3 hosts× 2 boss flags; hits/finite final state. Spell triples truncated to 2 slots repeat pair behavior; not 444 unique loadouts.|
| Echo singles/pairs |352|Baseline+26 singles+325 distinct unordered pairs; loadout and finite-state checks; no exhaustive per-proc oracle.|
| Armor glyphs; layout conservation |21+300|Baseline/singles/four-of-kind caps and removal;3 hosts× 10 × 10 ordered glyph pairs,20 layout applications each; pass.|
| Node forms×melee glyph |330|5 branches× 3 nodes× 2 forms× 11 baseline/single glyphs; activation, choice predicates, finite state and alt migration; pass.|

Separately,1,000 generated-item samples `WEAPON-CATALOG-0`…`999` observed all 32 loot-name×tier combinations. They are item samples, not 1,000 combat encounters. Exact component methods, assertions, catalogs and raw results are in `weapons/REPORT.md`, `core/REPORT.md`, `spells/REPORT.md`, `glyphs/REPORT.md`.

### Actual numerical effects and setup limits

Lumen Phial changes base shots Spark 12→17, Spindle 15→21, Bombard 20→28; physical Needle remains 14. Its tested buff lasts 45 s, consumes one charge and survives reconstruction. Awakened fan aggregate damage is not assumed to be 3 ×base because trajectories differ.

Glyph fixture damage after 3 s changes melee baseline `[13,0,0,0]` to Ignite `[21,0,0,0]`, Ignite+Chain `[21,0,0,15]`, Ignite+Echo `[35,0,0,0]`; spell baseline `[20,10,0,20]` becomes Ignite+Echo `[48,36,0,48]`. Armor four-copy caps change maxHP 60→78, dodge cost 15→6,0.5 s stamina recovery 4.5→7.875, attack readiness 420→268.8 ms, Cinder Dart cooldown 2.5→1.6 s. These are measured fixture outcomes, not universal damage formulas.

Node records show Second WindHP 20→23, Harvest 20→24, Long Quickening/Long Veil 12 s versus 8 s, Amplifier 1.5, Bulwark reduction 0.15, Rift Ward protection 600 ms versus 150 ms, and Quick Fold cooldown 4.2 s versus 6 s. Source-directed max ranks/Aperture and direct node assignment isolate mechanics; they are not organically earned progression.

Supply fixtures use a training floor and synthetic cook. Meal-defense checks apply an actual controlled 20-damage hit, not only a computed formula; expiry is accelerated by setting remaining time near zero. Pair assertions compare reconstructed HP/guard/magic timers and nonnegative stock, not every cleansing/replacement intention. Spell pair reconstruction checks cooldown equality, not equivalence of all transient clone/field state. Corrected standalone spell aim was a harness issue: the initial Cinder Dart field did not reach an un-aimed target 2 tiles away. Preserved initial logs are not a game defect.

## Contract ambiguities and inconclusive checks

- **In-flight tool glyph binding:** `SHOT-GLYPH455` fires then removes/adds Ignite before impact. Retain/add yield targetHP 986 with burn; remove yields 987 without burn. Impact callbacks read current equipment (`game.ts:4748–4749`). Shot-time snapshot intent was not established; this is behavior to specify, not another confirmed defect.
- **Cinder Heart replacement:** `CINDER-END455` natural expiry damages `[12,0,0,12]`; replacing Ember Form with Quickening before expiry gives zero burst. Replacement writes `state.active` at `game.ts:4439`; expiry calls `onSkillEnded` at`:4548`. Whether cancellation counts as “ends” needs a decision; no extra finding is counted.
- **Bombard blast through wall:** column 12 separates player `(10,10)` from target `(13.2,10)`; blast deals 20 while other profiles deal 0. Grenade travel respects the wall but radial damage has no established line-of-sight contract. Some melee controls also exceed melee reach, so they do not independently prove all wall blocking.
- **Mirror Veil lethal attempt:** targeted damage settings 10/999 both record HP 60→53, no lethal outcome, and stop at first HP change. They do not establish a delivered 999-damage strike or subsequent rollback failure. The node matrix verifies directly subtracted 5 HP restored; lethal behavior remains inconclusive here.

## Gaps reproduction and repository state

No exhaustive weapons×glyphs×spells×skills×armor× 26 Echoes× 30 forms×consumables×bosses product was attempted. Untested or incomplete areas include all mixed-tier/random-stat rolls, every three/four-socket build, three-plus Echo sets, simultaneous Lattice forms, full proc ordering/expiry/immunity matrices, all terrain/height/vehicle combinations, every death/resume transient, sustained density/performance, player-facing descriptions and touch/audio/rendered feedback. No new visual audit was performed. Astral Cloak remains unresolved rather than replaced by a superficially related mechanic.

Rerun entry points, against the pinned checkout, are preserved scripts: `core/consumables.mjs`, `core/verify-slow.mjs`; `spells/matrix.mjs`, `spells/glyph-cross.mjs`; `glyphs/audit.mjs`, `glyphs/constellations.mjs`, `glyphs/targeted.mjs`; and `weapons/audit.mjs`, `interactions.mjs`, `phial.mjs`, `skill-cross.mjs`, `bombard-glyphs.mjs`, `lifecycle.mjs`, `nanobot.mjs`. Invoke with `node /tmp/ic-interactions/<component>/<script>`. These overwrite component result files; none were rerun merely to write this supplement. Focused command details are in `core/focused-command.txt`, weapon report, and regression logs; the glyph component did not preserve its exact historical shell command.

Tracked source/configuration/tests remain unchanged; final component Git statuses are clean. All custom harnesses, fixtures and reports are outside the checkout. No source fixes, commits, pushes, workflow dispatches, production-save edits, publication or uploads were performed. The original cloud audit and archive remain untouched.
