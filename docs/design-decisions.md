# Infinite Corridor — Design Decisions

## Core premise

The game is a persistent solo adventure through an effectively unbounded science-fantasy multiverse. Each realm is generated from a stable seed. The player is not doing disposable runs; the character, explored places, world consequences, equipment, and discoveries persist.

The desired feeling is **endless wandering with meaningful friction**: quiet travel, scattered danger, strange places, occasional difficult fights, discoveries, and long-term character development.

## Confirmed experience priorities

- Android phone first, with Galaxy Z Fold support.
- Offline first. The game must run without cellular service after installation.
- Low visual noise and deliberate pacing, but real-time—not turn-based—combat.
- Top-down/isometric-feeling spatial presentation.
- Roaming enemies, enterable dungeons, houses/interiors, secrets, sparse NPCs, and occasional world bosses.
- Persistent character exploration and consequence.
- Magic, melee, ranged options, and science-fantasy settings. Realms can vary widely in tone and technology.
- Mobile interaction should be simple: movement, attack, dodge roll, jump, and a contextual action button.
- Environmental interactions are a limited, dependable operation set, not universal physics simulation.
- Inventory management should stay light. Favor a small equipped loadout, upgrades, affinities/mastery, and meaningful finds rather than constant item sorting.
- Challenge should be significant, but enemy density and input demand should not be frantic.

## Interaction language

The world exposes dependable affordances. At an interactable object, the contextual action UI offers only valid operations, for example:

- tree: cut, burn, climb, shake;
- rock or obstacle: move, break, climb;
- door: open, unlock, force;
- fire source: ignite;
- NPC: speak, trade, challenge, attack;
- dungeon entrance: enter;
- shrine or mechanism: inspect, activate.

Prototype 1 implements a small subset. New interactions must be data-driven and visibly communicate their available options.

## Progression language

Use original terminology rather than copying another game’s stat names. Prototype 1 uses:

- **Might** — heavy melee impact and carry capacity;
- **Finesse** — agile weapon effectiveness, movement, and dodge recovery;
- **Focus** — technical/arcane ability effectiveness;
- **Vigor** — health and resistance;
- **Resolve** — stamina, interaction resilience, and special-action capacity.

The long-term game can add weapon affinities, ability branches, upgrade materials, and rare unique effects. Prototype 1 must keep this legible: level ups, one melee weapon, one ranged or focus option, a few equipment slots, and a small number of upgrade materials.

## World architecture

- A realm is an infinite coordinate grid generated deterministically from its seed.
- Each coordinate resolves into a biome/region recipe and may contain roaming encounters, entrances, buildings, interactables, secrets, or landmarks.
- Dungeons have their own deterministic seed and generate a small interior layout.
- A world boss is tied to a realm/region seed and uses a predictable-but-not-constant spawn condition. It should feel like an exceptional encounter, not a timer-driven online event.
- NPCs are sparse and can be vendors, quest givers, travelers, hostile figures, or mysteries. The eventual game supports consequences for attacking them; Prototype 1 records a simple permanent hostile/dead state.

## Narrative architecture

No live LLM is required for gameplay. Rule resolution, world state, progression, combat, and consequences must all be deterministic and local.

Later versions can add locally stored “content packs” containing authored or AI-assisted but curated lore fragments, quest hooks, item names, and event variations. The content layer enriches the rule engine; it never replaces it.

## Explicitly deferred from Prototype 1

- Cloud accounts, multi-device sync, and backup conflict resolution.
- Full isometric art pipeline, animation polish, audio production, and a native Android package.
- Unlimited biome variety, factions, branching campaign arcs, or open-ended typed natural-language actions.
- Universal destructibility, fully simulated fire, physics, water, climbing, or crafting.
- Multiplayer, monetization, ads, telemetry, social systems, and online-only content.
- A direct implementation of any named existing game, setting, character, creature, visual asset, or story.
