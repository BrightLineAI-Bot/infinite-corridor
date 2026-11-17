# Dinosaur Creature Package

The first playable slice starts with a shared yellow Triceratops body, a living capture, a persistent ride, and recovery at the selected hometown's Beast Hotel. Test it in an isolated Proving Ground fixture before admitting it to versioned world generation.

## Implementation queue

1. Register one visual and collision body. Use deterministic groups and behavioral dispositions for Good, Silly Goose, and Bad. Keep appearance identical at rest. Good uses grounded horns, charge, and tail. Silly Goose and Bad can tail-bounce, box, kick and scratch. Give each attack a readable windup and escape window.
2. Use penClosed and catchBeast in game.ts, along with the living-actor checks in beast-mounts.ts. Explicitly admit the real friendly and hostile Triceratops, and pass the actual captured variant. Store permanent normal and Silly Goose unlocks independently from temporary rides. Support reversible dismount and resummon with the existing mount entry point. Leave old mounts on their timers and stable capacity rules.
3. Route mounted inputs through the existing movement and attack acceptance paths. Check ordinary melee and spells, forward dash, short and long charged horn actions, and a real airborne landing shockwave. Silly Goose uses a bounded, enemy-seeking tail drill. Drive all effects from accepted action phases and let the charge-duration choice earn its place through playtesting.
4. Give an active ride its own health and count each depletion once. A landed hostile horn puncture or a third defeat sends it to recovery. Reuse homeKey and homeCenter for the currently selected hometown, plus the normal versioned dungeon and return path for the hotel. Make hotel access a narrow exception to indoor mounting. Count qualifying traversal transitions with a short recent-location window to prevent oscillation. Start at 20 qualifying transitions and make it configurable. Persist admission, progress, opponent identity and encounter completion. Early recovery offers a fight. At full recovery show the healthy mount and require defeating any remaining hostile occupant before retrieval. Add the bed, thermometer and healthy/fighting presentation. Retrieval has no fee in this slice.
5. Extend the existing creature-target damage and Stego Bait paths. The roar affects creatures in front of the mount, with tunable reactions, world-boss immunity and explicit Stego/Spinosaurus exceptions. Preserve existing duel behavior. Make eligible tail severing persistent, carry the Good-to-hostile change through reload, and retain the current bait item/save identifiers. Spinosaurus never yields bait. Apatosaurus can use the same eligibility rule when added.
6. Build the orange Pterodactylus separately after the Triceratops loop works. Reuse existing flight, projectile, beam, ground-warning and grab primitives for its swoops, razor wings, ranged moves and moving-target light strikes. Verify the pin and drop have readable escape and survivable damage. Use versioned encounters for Great Trees and adventure Pentagons.

Before handoff, exercise capture for each disposition, persistent mounts across reload and despawn, all mounted controls, both hotel triggers, early and normal retrieval, hometown changes, anti-oscillation, roar immunity, tail bait and disposition changes. Keep schema 14 additive, preserve explored and pinned maps, and document hosted and device checks separately.

## Scratch build

In Proving Ground, open Creature Assets and choose Triceratops Good, Silly Goose, Bad, or Beast Hotel recovery. The capture cases supply building materials and a living animal in a clear outdoor area. For the hotel case, use Act at the door, visit the bed, defeat the hostile occupant, and visit the bed again. Standard View draws the mount and the sick or healthy bedside scene. Save state stays within the scratch fixture.

This milestone includes persistent capture, standard riding and rider actions, health, admission after horn puncture or three depletions, and early or later hotel retrieval. Progress counts area transitions that are absent from the six most recent locations. Dedicated mounted attacks, ally support in battle, severable tails, production herd placement, and the flying creature remain queued. Spinosaurus keeps its existing name, internal ID, and tail rules.

### Wild herd and mounted contact draft

Newly discovered eligible overworld sections may receive deterministic herds of two to four Triceratops of one disposition. Existing Atlas pins, explored ground and legacy snapshots keep their previous layouts. An accepted mounted Dodge can deal horn contact once per enemy per dash. An accepted mounted Jump can create one shockwave on a safe landing. Both use the existing geometry checks.

Next: tune mounted attacks in gameplay, then add held horn tiers, Silly Goose tail drill, roar and tail interactions, followed by allied combat and the flying creature. Hosted visual and physical-phone playtesting remain open.
