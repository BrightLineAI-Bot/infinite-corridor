# Gameplay challenge candidate

This candidate is separate from the published release-flow preview. It is prepared for Proving Ground review; no publication or production promotion is authorized by its preparation.

## Finite feature cut

- Dungeon enemies: multiply actual damage by 1.25 once, with rounded integer hits; recovery by 0.85; leave HP unchanged. Preserve 0.62-second minimum primary windup, longer ranged pattern tells, committed aim, cover and wall collision, dodge protection and recovery windows. Persist the tuning version so loading a wound does not multiply damage again.
- Reuse existing creatures: Gravitant Bell/Colossus eight-way rings on every third shot, Choir one-time three-way splitting shots, Vesperwing/Apostle limited homing. Homing stops after 1.35 seconds and turns at no more than 1.25 radians/sec. Lifetimes are bounded. Shared projectile ceiling: 32 dungeon/64 world; existing summons remain capped at three per elite and six globally.
- Existing melee now uses directional stab/sweep/slam geometry shared by telegraph and damage. Tentacles add at most 0.85 tiles of reach. The strike leaves a brief visible extension; movement still follows existing collision rules.
- New dungeon layout modifier version 1: seeded connected side-room templates and branches, ordinary guardians across near/middle/remote reachable bands with their cache nearby, deep finales within their sealed component. Add at most one compact/two larger branch residents. Existing active enemy caps remain 7 normal/9 infested. Base generators and dimensions remain unchanged.
- Existing histories, saved areas and active dungeon migration pin historical layout version 0. New entries pin modifier version 1 before entry generation. Visited maps never resample on reload. The optional cistern guardian choice is pinned independently of global elite progress.
- Register every required boss across dungeon levels. Completion requires all of them; final-first cannot claim completion, spheres or an entrance exit. Ordinary completion grants one existing sphere, ten marks and one draught; deep completion grants its existing paired spheres once plus eighteen marks and one draught. Repeated loads cannot reclaim payoff or respawn cleared required bosses. The explicit Cleared Expedition Return uses the recorded dungeon entrance and relocates safely if obstructed. Canonical Relay Restore/Sever remains a separate story decision.
- Proving Ground shares gameplay enemy hydration and combat effect drawing, including boss scaling, rather than reviewing simplified stats or invisible bullets.

## Validation and limits

Focused tests cover seed-stable geometry across compact/extended/legacy/deep/threefold/multilevel families; gate/component preservation and reachability; boss distance bands; stable IDs; save migration and partial wounds; all-boss/exit/reward gates and no duplication; guardian replacement persistence; directional attack geometry, cover, shared caps, split expiry and bounded homing; lab/render parity.

Example tuning with the actual character HP formula, baseline armor and no guard: level 1 has 60 HP; an ordinary Ashling's baseline 5 damage becomes 7 after tuning (approximately twelve hits versus nine). Level 10 with Vigor 1 has 114 HP, approximately twenty-three versus seventeen hits. Dungeon role multipliers and equipment alter the actual totals. No player-level auto-scaling or wholesale HP inflation was added.

These are finite authored systems, not high-fidelity creature assets, a skeletal engine, a new dungeon generator framework, or endless narrative implementation. Local simulation and desktop browser checks do not establish Fold frame rate, battery/thermal behavior, touch readability or fair balance. Phone review should compare compact/extended full topology, new seeds, bosses and their cache locations; play melee and ranged fixtures; clear every guardian and use the return; reload mid-combat and after completion; test offline reopening. Preview publication needs explicit approval of the sealed new candidate; production remains separately gated.
