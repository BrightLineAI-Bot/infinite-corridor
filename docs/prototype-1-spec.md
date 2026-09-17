# Prototype 1 Specification — Infinite Corridor

## 1. Objective

Build a playable, offline-first vertical slice for Android that demonstrates the core loop:

> explore a persistent procedural region → encounter danger or discover an opportunity → fight or interact deliberately → acquire or upgrade something → enter a dungeon or return to the hub → keep the altered character and world state.

This is a validation build. It must be enjoyable for a short phone session and technically structured to grow, but it must not attempt to ship an enormous game.

## 2. Platform and delivery

- TypeScript web application, installable as a Progressive Web App (PWA).
- Runs in current Android Chrome and remains functional after installation with airplane mode enabled.
- Designed responsively for phone portrait, phone landscape, and Galaxy Z Fold unfolded view.
- Canvas-based 2D presentation is preferred for a compact offline package.
- Local persistence: IndexedDB. Do not require a backend, account, or network call.
- Provide a development server and a production build with a static deploy output.

## 3. Prototype world

### Hub and overworld

Implement one original realm, **The Cinder Verge**, with a small initial generated region around a persistent refuge/hub.

The overworld must include:

- walkable terrain and blocked terrain;
- 3 terrain/region types with distinct color/visual language;
- several wandering enemies visible in-world;
- one enterable ruin/dungeon entrance;
- one enterable abandoned structure/interior;
- at least 3 contextual-interaction objects: a tree, a rock/obstacle, and a shrine or locked door;
- one hidden cache or secret route;
- one rare world-boss spawn point with a clear danger/readiness cue.

A stable world seed and region-coordinate generation must ensure an explored tile looks the same after saving, reloading, and returning.

### Dungeon

Generate a small, replayable dungeon from a deterministic seed. It needs rooms/corridors, enemies, a chest or reward, an exit, and an elite/boss encounter.

## 4. Character and controls

### Persistent character

- one named-or-default player character;
- character level, experience, health, stamina, stat allocation, equipment, currency/materials, and world flags persist locally;
- first session begins as a deliberately weak scavenger with a basic weapon;
- death returns the character to the refuge with a modest, explicit consequence; do not erase the save.

### Controls

Support touch and desktop controls for testability.

Touch controls:

- virtual movement stick or touch-to-move;
- primary attack;
- dodge roll using stamina;
- jump;
- contextual action button;
- compact inventory/character button.

Desktop fallback: WASD/arrow movement, Space dodge, J attack, K jump, E interact.

Combat should be real-time but readable and deliberately paced. Enemies use telegraphed attacks, limited group size, contact-safe spacing, and windows for dodge/attack. Do not build a click-spam or enemy-swarm game.

## 5. Combat, items, and progression

### Stats

Implement the original stat labels in `design-decisions.md`: Might, Finesse, Focus, Vigor, Resolve. On level-up, permit allocation of one point with visible effects.

### Equipment

Keep inventory light:

- equip one primary weapon, one secondary/focus tool, and armor in two slots;
- a small fixed-capacity materials/currency section;
- 3–5 procedurally varied item drops with original names and a few understandable properties;
- basic weapon upgrade at the refuge using found material;
- a straightforward comparison view. No grid-tetris inventory or large trash-loot stream.

### Encounters

Include:

- at least 3 normal enemy archetypes;
- one ranged or magic enemy;
- one elite/dungeon boss;
- one optional world boss, intentionally dangerous at the opening power level.

## 6. Contextual environment interactions

Prototype behavior must be data driven via `Interactable` records and an explicit action list.

Implement at least:

- Tree: `cut` changes it to a traversable bridge or fallen obstacle; `climb` moves the player to a nearby elevated/alternate tile.
- Rock: `move` or `break` opens an alternate path when the player has enough Might.
- Shrine: `inspect` grants a temporary effect, lore fragment, or encounter.
- Door: `open` enters an interior; a locked variant can require a key or `force` action.
- NPC: `speak`, `trade` (for vendor), and `attack`; attacking stores a permanent hostile/dead consequence in the local save.

Actions must appear only when valid and must be deliberately selected. Do not simulate universal physical manipulation.

## 7. UX and visual direction

- Original, restrained science-fantasy visuals: ash, ruins, strange light, worn technology, and sparse hostile wilderness.
- Calm, readable top-down spatial play. A simple top-down view is acceptable for Prototype 1 if a full isometric renderer would compromise usability or completion.
- Avoid visual imitation of named games, overuse of effects, flashing, excessive screen shake, aggressive timers, ads, or social hooks.
- The player should be able to pause, read the screen, and move at their own pace.

## 8. Engineering constraints

- No live AI or network call is allowed in the game loop.
- Deterministic generation must use a documented PRNG/seed function.
- Save schema must be versioned and migrated safely.
- Keep game state separate from rendering/UI.
- Input, world generation, combat, persistence, and interaction logic must be separate modules.
- Use original assets created from simple shapes, CSS, or generated primitives. No scraped/copyrighted assets.

## 9. Required tests

Automated tests must cover at minimum:

1. the same world seed and region coordinate produces the same generated region;
2. a character save serializes, reloads, and preserves stats/equipment/world flags;
3. a valid contextual interaction changes the expected world state;
4. dodge consumes stamina and respects cooldown;
5. item generation returns only valid properties from its defined item tables.

## 10. Definition of done

Prototype 1 is ready for Android testing only when:

- `npm run build` succeeds;
- the declared test suite passes;
- the PWA is installable on Android Chrome;
- after initial install/load, it launches and a saved character can be played in airplane mode;
- the core loop listed in Section 1 is demonstrable;
- the player can persistently explore, fight, dodge, interact, enter/exit a dungeon, obtain/upgrade equipment, die/recover, save, close, and resume;
- README documents exact local development, production build, Android installation, and offline verification steps.
