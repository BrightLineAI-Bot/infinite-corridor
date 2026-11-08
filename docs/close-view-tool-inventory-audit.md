# Close View remaining tool inventory audit

Date: 2026-11-08

Audited source: `8411f956` (`claude/close-view-tool-inventory`)

Status: read-only source/CPU audit; no gameplay, renderer, asset, configuration, test, release, or publication change

## Scope and conclusions

This is the stage 4e inventory following the four named stage-4 tools. It traces every canonical secondary item accepted by `rangedWeapon`, its saved aliases and production descendants through `Game`, action presentation, Close View selection, and specialized drawing. The inventory is complete for the current source: Spark Coil, Lumen Spindle, Needle Caster / upgraded Blunderbuss, Rift Bombard, Hammerfall, Great Sweep, and the gifted Aether Orrery.

The four delayed-startup identities are deliberately limited to Rift Bombard, Blunderbuss, Lumen Spindle, and Great Sweep. Spark Coil, ordinary Needle Caster, Hammerfall, Mirage of Blades, and every Orrery path retain their established immediate or separately authored mechanics. That difference is not itself a defect.

One concrete presentation-selection defect is source-proven: while the normal imported hero can select the four exact named profiles, Robot, powered-suit, and Ember-form model selection collapses each exact key to the bare form body. Their generic `emitter`, `hammer`, `sweep`, `mirage`, and Orrery combinations exist, but exact `rift-bombard`, `blunderbuss`, `lumen-spindle`, and `great-sweep` keys do not. The result is a real missing-tool path for accepted named actions in those forms, not an art-style judgment. The drone does not transform the player and therefore does not trigger that collapse.

No deterministic damage, cooldown, projectile-count, Echo, clone, golem, or Orrery defect was established by this audit. GPU appearance, socket occlusion, normal-speed readability, mobile performance, multitouch, and physical-device feel remain unverified.

Iron Fists are not an omitted secondary: current source defines them as a primary weapon, although the Tool input can invoke their combo when equipped. Their three-step presentation has its own accepted audit. Robot and drone are vehicle modes rather than inventory tools; they appear here because they change, or independently accompany, the player's tool presentation. Orbit Volley is a spell, not a tool, and remains on its established gather / early / perfect / timeout spell path rather than being assigned a secondary-tool identity.

## Canonical identity and alias inventory

| Canonical tool | Accepted saved identities and aliases | Actual production route | Mechanical family and recovery | Accepted body/profile and grip | Descendants / variants |
|---|---|---|---|---|---|
| Spark Coil | `id: spark-coil`, name `Spark Coil`; default journey tool and PG scenario | `Game.fireSecondary` → `rangedWeapon` | Straight magic projectile, speed 12, life 1.6; shared `player.attackReadyAt`, base 360 ms with existing modifiers; immediate emission | `emitter`; generic `playerTool` / imported generic emitter, right-hand tool recipe | Awakened two-shot fan, Tool Echo copies, ordinary Shadow Clone copy, Charged Air, tool glyphs |
| Needle Caster | `secondary-needle-caster`, name `Needle Caster`, rank below 6 | `Game.fireSecondary` → `rangedWeapon` | Straight physical projectile, speed 15, life 1.25; shared base 360 ms; immediate emission | `emitter`; same generic right-hand tool as Spark Coil | Awakened fan, Tool Echo, Shadow Clone copy, Charged Air, tool glyphs |
| Blunderbuss | Explicit name `Blunderbuss`, or Needle Caster name/id with `upgradeRank >= 6`; `normalizeItemUpgrade` renames the saved display name at rank 6 | `Game.fireSecondary`; resolver, not a separate loot family | Three physical pellets, speed 14, life .85, spread .26; shared base 360 ms. In eligible Close View only, accepted startup is 100 ms scaled down with effective cooldown, then physical release; body duration 640 ms | exact `toolKind: blunderbuss`; compact authored right-hand Blunderbuss and braced/recoil pose | Arc Wave transforms all three pellets; awakened fan; Echo; Shadow Clone; Charged Air |
| Lumen Spindle | `secondary-lumen-spindle`, name `Lumen Spindle`; also supplied by the secondary cache | `Game.fireSecondary` | Magic boomerang, speed 10, life 1.8, turn after .8; shared base 360 ms. Eligible Close View startup 100 ms, body duration 760 ms | exact `lumen-spindle`; raised forward wand in right hand | Sunburst Ricochet (up to 2 wall ricochets, 6 shards each, bounded 24 live); fan, Echo, clone, Charged Air |
| Rift Bombard | `secondary-rift-bombard`, name `Rift Bombard` | `Game.fireSecondary` | Physical grenade, speed 8, life 1.4 / aimed-distance clamp, blast radius 2.15; shared base 360 ms. Eligible Close View startup 120 ms, body duration 720 ms | exact `rift-bombard`; substantial authored launcher on final right-hand socket with braced pose | Cluster Shell creates two opposite bomblets on burst; fan, Echo, clone, Charged Air |
| Hammerfall | `secondary-hammerfall` or name `Hammerfall`; `rangedWeapon(...).brawlerTool = hammerfall` | `fireSecondary` → `brawlerTool('hammerfall')` | Target/ahead physical effect after .32 s, radius 1.5, reach 2.6, stun .6; `toolReadyAt`, base 1.2 s with modifiers; its delayed effect is the established Hammerfall mechanic, not T startup | `hammer`; native/imported hammer grip, accepted aim | Tool Echo repeats at .22 s gaps; Shadow Clone performs its own arc swing; Corridor Golem may rise at the impact point |
| Great Sweep | `secondary-great-sweep` or name `Great Sweep`; brawler route | `fireSecondary` → `brawlerTool('great-sweep')` | Centered physical radius 2.4 effect; `toolReadyAt`, base 1 s. Eligible Close View startup 160 ms, body duration 840 ms | exact `great-sweep` with large broken blade and authored sweep; legacy `sweep` remains the base visual family | Tool Echo repeats; Shadow Clone arc; with saved passive key `field:nanoknives`, the action is replaced by Mirage of Blades |
| Aether Orrery | `secondary-aether-orrery`, name `Aether Orrery`, property `orrery`; a gated gift, never ordinary loot | `fireSecondary` → `orreryPress`; `tickOrrery`; `orreryOnHit` | Magic/Focus system with independent tap cooldown .4 s, charge grace .2 s, full 1.6 s, overload after 2.6 s and 6 s charge lockout | `orrery-tap` and `orrery-release`; Orrery geometry on the hero with cast posture. Charge alone does not fake a release gesture | Tap orb/pellets; held cone; released great orb; 1–3 Echo-tier halo orbs; automatic halo contact; press lasers; charged beam/triangle; right-angle cube lasers; Shadow Clone orb/tether/two-hit laser |

`ITEM_TABLE.secondary` is the ordinary generated base set (Spindle, Needle, Bombard). Hammerfall and Great Sweep enter through `BRAWLER_LOOT`; Orrery through `GIFT_TOOLS`; Spark Coil is the starter/default identity. Blunderbuss is the rank-6 Needle resolver. No canonical eighth magical tool exists in source, and the owner's unidentified-magical-tool remark must not create one.

## Variant and descendant matrix

| Variant / descendant | Parent and activation | Authoritative source and impact | Presentation ownership | Cooldown / cap facts | Audit result |
|---|---|---|---|---|---|
| Arc Wave | Blunderbuss + Lattice `field:arc-wave` | Each of the three accepted pellets becomes a physical crescent (`arcWave`), share 1, grow .5, pierce 12, speed 11 | Parent accepted `blunderbuss` body/cue; specialized wave drawing owns the projectile silhouette | Parent cooldown and projectile admission; three waves, not one | Source-proven and intentionally not a new body identity |
| Cluster Shell | Bombard + `field:cluster-shell` | On authoritative Bombard burst, two nonrecursive bomblets fly to opposite poles and burst for .45 share / .55 radius scale | Parent Bombard body only; children originate at the canonical explosion and must not inherit a hand muzzle | Existing projectile cap; bomblets cannot split | Source-proven |
| Sunburst Ricochet | Spindle + `field:lumen-sunburst` | Wall reflection produces six .3-share shards, pierce 3, up to 2 hits per enemy and 2 ricochets | Parent Spindle body; shards own their wall origin, not the wand | At most 24 live shards | Source-proven |
| Mirage of Blades | Great Sweep + saved key `field:nanoknives` (historic Nanoknives alias; current name is Mirage) | Replaces Sweep with one spinning physical blade; sword/axe/shuriken sequence; outbound pierce and homing return | Accepted profile `mirage`, player-center launch, specialized blade drawing; no Great Sweep body/effect | .55 s tool cooldown, maximum 3 live; Echo adds blades up to the same cap | Source-proven; do not rename the persisted key |
| Corridor Golem | Hammerfall + `field:corridor-golem` | Starts at Hammerfall impact after its .32 s delay; rises .35 s, dashes, delivers at most 3 .9-share punches .38 s apart, then sinks .4 s | Separate bounded companion model/effects; it does not replay the hero hammer body | One golem; base 6 s `golemReadyAt`, shortened by tool recovery and Wellspring | Source-proven |
| Tool Echo | Tool-host Echo glyphs | Shooter copies retain the accepted shot family; brawler effects repeat at .22 s gaps; Mirage throws additional blades | Delayed Echo does not own/replay the original hero body or muzzle cue | Existing Echo plan, projectile/effect caps | Source-proven |
| Ordinary Shadow Clone copy | Live noncharging, non-Boxing Shadow Clone | Copies ordinary tool shots at half damage from its own place/aim with no tool glyph host; Hammerfall/Sweep produce clone arc swings | Clone owns its own origin; never reuse the player's socket. No copied Fist shot | Existing clone lifetime/caps | Source-proven |
| Shadow Boxing Echo clone | Echo of Shadow Boxing | Short melee-only clone; explicitly does not copy tool shots | Separate clone/swing presentation | Existing 3 s echo-clone duration | Source-proven and intentionally different from ordinary Shadow Clone |
| Orrery automatic descendants | Orrery halo/tap/charge and Echo tier | Tap orb sheds pellets; 1/2/3 halo orbs for 0/1/2+ Echoes; halo contact, press lasers, charge beams/triangle, release cube lasers | Specialized Orrery drawing and child origins; only tap/release stamps hero actions | Caps: 6 orbs, 30 pellets, 2 bigs, 12 lasers; halo idle 8 s | Source-proven; automatic children are not extra accepted presses |
| Orrery + Shadow Clone | Orrery with ordinary live clone | Clone orb follows clone, tether burns during charge, press/release launches a two-hit clone laser | Clone orb/tether/laser owns clone origin; hero retains Orrery pose | Existing Orrery laser cap | Source-proven |
| Drone rocket | Mech mode `drone`, independent of equipped tool | `tickDrone` creates its own seeking physical rocket and attaches the existing serializable visual-launch metadata | Drone anchor/muzzle, never the hero hand or accepted tool action | Drone timers and global projectile cap | Source-proven; not a secondary-tool alias |
| Robot / powered suit | Mech modes with any equipped tool | Gameplay producers and damage/cooldowns remain the same; empowered multipliers flow through established stat paths | Native form model must select a held-profile combination | Form geometry is bounded; device rendering unverified | Exact named-profile collapse is the concrete defect below |

## Presentation coverage and gaps

The normal imported hero has exact bounded gear recipes for the four T identities and generic recipes for the remaining inventory. Close View latches exact accepted identity only for `rift-bombard`, `blunderbuss`, `lumen-spindle`, and `great-sweep`. It intentionally uses these established baseline profiles elsewhere:

- Spark Coil and Needle Caster: generic `emitter` / `playerTool`; visually indistinguishable at the body/tool level even though their canonical projectiles differ.
- Hammerfall: `hammer`; its impact and optional Golem carry the family distinction.
- Mirage: `mirage`; the three rotating blade silhouettes are selected by the projectile's `blade` index.
- Orrery: `orrery-tap` and `orrery-release`; charge-only input has no false release stamp.
- Arc Wave, Cluster Shell, and Sunburst: parent body profile plus specialized projectile/impact children. They correctly do not invent new hand poses.
- Echo, clone, golem, Orrery children, and drone rockets: descendants with their own origins; they must not steal or replay the initiating hero action.

Generic Spark/Needle presentation is incomplete relative to an eventual every-tool cohesive-asset pass, but it is the preserved baseline and not evidence of incorrect mechanics. The smallest later art task is to give each an explicit accepted identity and bounded recipe while preserving immediate emission, the 360 ms readiness rule, existing projectile origin, and all descendants. Do not fold either into the four-tool delayed-startup allowlist without a separate product decision.

### Concrete defect: exact named tools disappear on transformed player forms

`playerFormModelKey` only accepts `PLAYER_HELD_PROFILES = [melee, fist, emitter, hammer, sweep, mirage, orrery-tap, orrery-release]`. Close View passes the exact accepted `toolKind` as `held`. Therefore:

```text
playerFormModelKey({kind:'playerRobot'}, 'emitter')       -> playerRobot:emitter
playerFormModelKey({kind:'playerRobot'}, 'rift-bombard') -> playerRobot
playerFormModelKey({kind:'playerPowerSuit'}, 'blunderbuss') -> playerPowerSuit
playerFormModelKey({kind:'playerEmberForm'}, 'great-sweep') -> playerEmberForm
```

The second through fourth results select the bare body and omit even the existing compatible held part. The same collapse affects Spindle and every exact named profile across Robot, powered suit, and Ember form. It does not affect drone mode because `playerFormPresentation` deliberately excludes the drone and leaves the normal hero path active.

Smallest follow-up: map the three exact emitter identities to each form's existing `emitter` held combination and exact Great Sweep to `sweep`, then add actual accepted-action selection witnesses for Robot, powered suit, and Ember. This is a presentation-only mapping fix; do not duplicate tool meshes into gameplay, change form precedence, add a new draw pass, or change startup/cooldown/damage. If the owner later requires form-specific exact silhouettes, that is a separate bounded geometry pass after the mapping restores truthful held ownership.

## Sequential follow-up queue

1. **Fix transformed-form held selection.** Pure mapping plus focused real-renderer source witnesses for the four exact identities across Robot/powered/Ember; preserve the existing normal hero and drone routes.
2. **Give Spark Coil and Needle Caster distinct accepted presentation identities.** Keep immediate mechanics and generic fallback; verify refusal, movement, gear switch, pause/reload, Echo and clone ownership.
3. **Review Hammerfall and Orrery grips at normal speed.** Their source identities and descendants are correct; only promote a visual issue after an exact accepted-action reproduction. Do not merge Hammerfall's separately active startup work into this stage.
4. **Review child effects in order:** Arc Wave, Cluster, Sunburst, Mirage, Golem, Tool Echo, ordinary clone, Orrery automatic/clone branches, then drone rocket. Verify canonical origins and caps before any visual bridge.
5. **Hosted exact-tree acceptance.** Normal/reduced motion, moving/stationary, front/side/rear, point-blank walls, clustered foes, pause/reload, low/full quality, Robot/powered/Ember/drone, and physical phone. CPU/source evidence cannot close these gates.

## Evidence boundary

Inspected sources include `items.ts`, actual `Game.fireSecondary` / `brawlerTool` / Mirage / Golem / clone / drone producers, `tool-forms.ts`, action-motion normalization, Close View action selection, form selection, hero gear recipes, and the existing combat/tool manifests. Existing focused tests establish production behavior on this exact source lineage but were not broadly rerun merely to duplicate the reviewed 154-test baseline.

This document proves source identities, branches, numeric caps, accepted profile routing, and the pure transformed-form selection defect. It does not prove GPU output, shader ownership, socket visibility, screen-space cohesion, hardware input, frame rate, or physical-device acceptance. No server, full suite, prototype/proposal/pages/proving fixture, network, push, release bump, asset, dependency, workflow, or runtime change was performed.
