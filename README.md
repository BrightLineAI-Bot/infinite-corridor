# Infinite Corridor

An original, offline-first, single-player mobile adventure game for Android. The player carries one persistent character through procedurally generated realms, ruins, settlements, dungeons, and difficult encounters.

This repository contains the playable **Prototype 1** vertical slice.

Project changes may be prepared through the trusted Hermes proposal workflow, but authorization, planning, application, verification, and reconciliation remain separate exact Brightline Change-Control steps.

## Run locally

Requires Node.js 22 or newer. The prototype has no third-party runtime dependencies.

```powershell
cd C:\AI-PROJECTS\infinite-corridor
npm run dev
```

Open `http://localhost:5173` in a browser. Desktop controls are WASD or arrows to move, `J` to attack, Space to dodge, `K` to jump, `E` to interact, `H` to use a restorative draught, `M` for the atlas, `L` for the journal, `I` for the pack, and `P` or Escape to pause. The HUD shows prominent HEALTH, STAMINA, and XP progress bars. Ordinary enemies award 10 XP and bosses award 35 XP. Reaching the displayed threshold raises the level, preserves excess XP, awards one stat point, and increases the next threshold by 35% plus 10. Timed actions show their own recharge bar and countdown on the corresponding button; Potion shows the carried draught count. Touch controls use a compact, non-overlapping rune cluster: Jump north, Dodge south, Act west, Attack east, with Tool/Spell above and Potion southeast. Map and Pack sit above the movement thumb stick. Mute, Pause, and Journal are grouped under the compact HUD menu. Movement uses normalized diagonals, a shaped analog dead zone, wall sliding, and smoothed stick response. Each dodge costs 15 stamina and stamina regeneration—not a separate dodge cooldown—limits repeated dodges. Dodge follows the full current analog direction; after release it retains the last normalized movement vector, including diagonals, across pause and reload.

The journal contains deterministic, original Cinder Verge discoveries. Narrative records are bundled offline, validated against `infinite-corridor-narrative/1.0.0`, and resolved through a small effect whitelist; gameplay never calls a network model or imports an external story database.

Combat is deliberately paced: walking and directed dodges are capped, jumping evades contact attacks but not Spark Warden shots, enemy attacks use a clear windup and recovery, solid walls block impacts, and brief post-hit and checkpoint-recovery protection prevent unavoidable burst damage. Each enemy windup paints its exact radial gameplay danger footprint on the ground: melee rings are tight, ranged rings are larger, and urgency strengthens toward impact. The ring is a distance boundary, not a promise through cover—solid walls still block the actual strike. Accepted melee attacks quietly lock to the nearest visible target inside the equipped weapon's actual reach while retaining each weapon's full arc. Death never removes equipment, pack items, consumables, marks, materials, or XP; it only returns the Wayfarer to the active checkpoint and tops restorative draughts up to two when below that minimum. Restorative draughts heal 30 health without being wasted at full health; Ironbark tonics provide 45 seconds of damage-reducing guard and both supplies persist across saves. The presentation uses a restrained soot, rust, bone, and oxidized-metal palette with deterministic masonry wear.

The Missing Crossing is a compact, persistent mystery told through Vela or the Array, deterministic signal sites, the Hollow Marshal, and the restored relay. The shortened HUD keeps the current objective directly beneath the place name, with journal recaps for completed beats. New deterministic entrances can lead to the Hollow Relay, Root-Sunk Cistern, or Glass Kiln; individual dungeons retain independent snapshots and exact returns. Sparse, locally telegraphed spikes or fire vents and fixed-point vine swings add traversal without blocking the normal route. After the first user gesture, Web Audio generates an original restrained dungeon-synth pad and slow minor-pentatonic pulse; the HUD mute control persists and ramps cleanly without creating duplicate schedulers.

The overworld is an unbounded grid of deterministic 32×32 sections. Walk through a three-tile boundary passage to enter a neighboring section, including negative coordinates. Each section is stable for the save's world-generation version; explored sections, landmarks, active encounters, object changes, waypoints, and checkpoints persist. The paused atlas shows explored sections and their immediate frontier. Tap an explored atlas cell to mark a waypoint.

## Test and build

```powershell
npm test
npm run build
```

The static production PWA is written to `dist/`. Serve that directory from an HTTPS origin for phone installation; `localhost` is also treated as secure for local desktop testing. Do not open `dist/index.html` directly from the filesystem because service workers require an HTTP(S) origin.

### Private tailnet deployment

This host serves the validated production build at `https://orvar.tailc5115c.ts.net:10444/`.

The route is tailnet-only (Tailscale Serve, never Funnel) and proxies to loopback `127.0.0.1:18882`. After `npm run build`, install or reconcile the limited-user startup task and route with:

```powershell
pwsh -NoProfile -File scripts\install-private-pwa.ps1
```

Roll back the route and startup task with:

```powershell
pwsh -NoProfile -File scripts\uninstall-private-pwa.ps1
```

Existing browser and Android saves remain client-local and are not deleted by route rollback.

## Install on Android and verify offline play

1. Build the project and host the contents of `dist/` on an HTTPS URL reachable by the phone.
2. In current Android Chrome, open that URL once while online and wait for the game to finish loading.
3. Open Chrome's menu and choose **Install app** or **Add to Home screen**, then launch **Infinite Corridor: Cinder Verge** from its installed icon.
4. Move away from the refuge, interact or fight, and press **Pause**. Confirm the overlay says **Progress saved**.
5. Cross at least one section boundary, open the atlas, and confirm the player marker and section coordinates. Close the installed app completely. Reopen it and press **Resume**. Confirm the character returns to the same section and exact position with the same health, stamina, encounter state, defeated or damaged enemies, and changed nearby objects. This must also work inside the dungeon. Dungeon exits return to their exact entrance location. Only death moves the character, returning them to the active checkpoint.
6. With the app paused, enable airplane mode and disable Wi-Fi. Close and reopen the installed app, resume, and play through movement, combat, interaction, and a save/reopen cycle.
7. Restore connectivity only after confirming the offline cycle. If a new build was deployed, open it online once so the updated service worker can replace the prior offline cache.

Android can freeze or terminate a background app without warning. The game therefore writes an immediate local mirror when paused, hidden, frozen, or closed, while also maintaining its IndexedDB save. Returning to a visible app stays paused until the player explicitly resumes, so no combat time advances while the phone is asleep.

## Product intent

- Quiet, exploratory action RPG rather than a frantic enemy-density game.
- Persistent world and character, not disposable roguelike runs.
- Installable Android PWA that remains playable with no data connection.
- Mobile controls that support deliberate play: movement, primary attack, dodge, jump, and contextual interaction.
- Science-fantasy multiverse with sparse NPCs, magic and technology, original lore, and an “infinite corridor” structure.

## Files

- `docs/prototype-1-spec.md` — product requirements, content boundaries, technical architecture, and acceptance criteria.
- `docs/codex-prototype-1-work-card.md` — bounded Codex implementation instruction.
- `docs/design-decisions.md` — decisions preserved from Tim’s concept discussion and explicitly deferred scope.
- `CHANGELOG.md`: release-relevant and user-visible change history.
- `docs/work-log.md`: implementation-level work records and verification results.
- `docs/verification.md`: current automated and manual verification gates.
- `docs/decisions/README.md`: decision-record policy and template.

## Intended development sequence

1. Codex implements the Prototype 1 vertical slice from the work card.
2. Test it on an Android phone as an installed PWA and validate the play loop.
3. Only if the loop works, add more realms, item/ability depth, offline narrative content packs, and optional encrypted backup/sync.

## IP boundary

The game may take high-level genre lessons from isometric action RPGs and difficult exploratory games, but it must use wholly original names, lore, enemies, visual assets, maps, interfaces, narrative, and mechanics expression. It must not reproduce content from Diablo, Elden Ring, Dark Souls, Bloodborne, Remnant, Magic: The Gathering, or Gene Wolfe’s Solar Cycle.

## Ranged weapons and supplies

## Elite bestiary and contracts (save v10)

Four uncommon elite classes extend the normal creature system: Vesperwing, Gravitant Bell, Mire Apostle, and Choir of Knives. Each keeps a stable silhouette, movement profile, signature modules, lore, and reward, while the world seed selects one or two compatible variable aspects. The resulting variant ID, modules, HP, hazards, summons, contract state, and defeat remain persistent.

Signal Ledgers offer the marked Vesperwing hunt. Rare cisterns may contain a Gravitant Bell guardian; the Mire Apostle is a deterministic world beast; Coilmarket's Cantor Threshold opens after four ash-born kills and leads to the Choir. Elite rewards are one-time: marks, experience, weapon or armor spheres, codex knowledge, and—in the poison hunt—a Clearroot Ampoule. Spheres permanently upgrade the current weapon or armor from the Pack. This is optional progression without random rarity tiers or repeatable farming.

Elite attacks retain visible windups and bounded fields. Gravity has a windup, duration, radius, force, and cooldown. Ooze pools expire and are capped. Poison ticks once per second, appears on the HUD, persists in save v10, and ends by expiry, death, or Clearroot. Summons are capped at three, have no rewards, and are cleaned up with their encounter snapshot.

**Attack** (or `J`) uses the selected equipped weapon. Primary melee weapons retain their own cone, thrust, or broad arc and automatically turn toward the nearest visible enemy actually inside reach. Selecting the equipped secondary makes Attack fire it with the normal pending or last-direction aim; Attack always stows Tool mode. **Tool** (`R` or `Q`) toggles a persistent aiming mode for current ranged tools. While it is active, each world tap aims and immediately fires, and the mode remains active for repeated shots. Outside Tool mode, a world tap fires when ranged Attack is selected; melee Attack remains auto-targeted. **Spell** (`F`) casts the equipped Ember Ring at the pending target within range, leaving a persisted three-second 360-degree hazard. Spark Coil and Lumen Spindle bolts deal magic damage; Needle Caster shots deal physical damage. Lumen Phials provide a persisted 45-second magic-projectile surge.

Static deterministic supply caches occur in every section and the Hollow Relay, while defeated enemies can drop restorative draughts with persisted anti-duplication and drought protection. Death tops draughts up to two, never reduces a larger count. Vela’s touch-accessible trade screen sells unlimited restorative draughts plus limited tonics, phials, and deterministic equipment; shop stock and purchases persist. The pack uses DOM-created controls for selecting and equipping weapons.
## Durable choices (save v8)

Ember Refuge has three named residents: Vela Quen, quartermaster; Oren Vale, warden; and Sela Rook, beacon keeper. Friendly markers, names, and roles distinguish them from enemies. Act opens their choices. Attack asks for a deliberate strike; a second strike can kill. Stand down spares a wounded resident while preserving their memory. Normal melee arcs, bolts, and Ember Ring can also cause accidental harm: neutral residents are excluded from auto-aim, but they are not invulnerable. NPC injuries and deaths persist, and never grant enemy XP or loot.

Each death removes an individual. Vela's death closes her shop, including already-open purchase requests. When all three residents die, the refuge permanently falls and two monsters occupy its streets. Their injuries and defeats also persist; the ruined beacon remains a recovery location. Reputation records local deaths. The prototype does not simulate resident AI, witness networks, or off-screen settlement decay.

The canonical Hollow Relay has a separate terminal behind its guardian. Restore reopens the signal and grants two draughts; Sever silences it and yields three lumen dust. Both permanently resolve the Missing Crossing, and only one can be chosen. Neither resurrects residents. Procedural dungeon guardians and chests cannot complete this story. Vela's death never blocks the Array route or the terminal.

At each dungeon entrance, Act offers Enter or Leave unexplored. The journal retains bypasses, visits, unresolved departures, and resolutions. Leaving or dying during an unresolved visit records one abandonment; returning retains encounters and supplies. Guardian defeat resolves ordinary dungeons, while the canonical Relay remains unresolved until its terminal choice. There is no deadline or automatic punishment for taking another route.

Existing v1–v9 saves migrate to v10 without resetting the world, character, or runtime state. Earlier restored-Relay progress remains the Restore ending. Older Vela deaths stay individual losses. Remaining attack timers, NPC wounds, active effects, per-pulse hits, and encounter states retain their exact paused values on reload.

Story endings close finite threads, never the game. Refuge collapse resolves the Ember Refuge thread as Fallen while preserving the solitary Array route. Restore and Sever are distinct endings of the Missing Crossing thread. The journal exposes these durable outcomes for future procedural threads, and the HUD invites further exploration afterward. The infinite overworld and dungeon entrances remain available after every ending.


Spell profiles deliberately trade power for recovery: Cinder Dart recovers in 2.5 seconds, Ember Ring in 6 seconds, and Grave Sun in 12 seconds. Choose the equipped spell in the Pack.

The compact HUD uses larger text and purple level/XP emphasis. Long world and narrative messages automatically travel across the message window at a readable pace instead of being cut off; reduced-motion systems retain manual horizontal access. Tool is a small oval toggle above the larger Spell oval, and Potion matches the Spell control.

The HUD presents the active Attack, Spell, and Tool as three vertically stacked lines and gives the full objective a wrapped row rather than truncating it. In the Atlas, **Return to active checkpoint** provides deliberate fast travel back to Ember Refuge or the latest activated checkpoint without death, healing, or loss of carried progress.
