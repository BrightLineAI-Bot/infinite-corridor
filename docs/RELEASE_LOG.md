# Release log: Claude ↔ Codex handoff

The shared record of which release numbers are live, in flight or reserved, kept so Claude and Codex never collide.
**Read this before you start a release. Update it in the same PR that bumps the number, and again when the release
merges, publishes or is dropped.** Newest first. Release numbers are odd, and each one is used exactly once.

## How to claim a number

1. Take the lowest number under **Next free number** below. Add a row to **In flight** with your name (Claude or Codex), the branch and one line on the scope, then move **Next free number** up by 2.
2. Do not reuse a number that appears anywhere in this file, even one that was dropped.
3. If you find your number already taken on `main` when you merge, renumber yours to the next free number. Tell Tim in your handoff.
4. When a release merges, add its preview id. When Tim publishes it, move it to **Published**.

## Next free number

**275**

## In flight

| Release | Agent | Branch / PR | Scope | State |
|---|---|---|---|---|
| 273 | Claude | `claude/dreamy-rubin-yn6q2p` | World beasts by Aperture tier (3–8); four Crossing Sigils per horde | Building. |
| 255 | Codex | `codex/narrative-253` → rename to 255 | Daily narrative work: Codex's vision, with ten artistic passes per scene | Reserved. Codex was first told 253, but 253 went to Claude below, so Codex uses **255**. |

## Published (live)

| Release | Candidate | Published | Notes |
|---|---|---|---|
| 271 | `r271-ad06c7fbd51e` | 2026-10-21 | Published with 269 (which never went live alone): the Gate Revenant horde, skiff repairs, the hull guard's longboat, cheaper building (269, PR #113); Gate Revenants stalk then hunt through walls, dodge, poise break, the new Revenant with its barrage maw (271, PR #114). The pre-publish review found no blockers; its two notes were fixed before merge. |
| 267 | `r267-345b89326368` | 2026-10-21 | Published with 263 and 265 (neither went live alone): Echo drops fixed, Crossing Sigils, safe dungeon arrivals, hull shields, 2-dig shovels (263, PR #110); building, the Refuge's farm, quarry, Hollis and Shale, regrowth, icon buttons (265, PR #111); build mode and the wall-trap fix (267, PR #112). The 265 review found the wall trap; the 267 re-review found no blockers. |
| 261 | `r261-2215f2781a82` | 2026-10-21 | World-boss pacing and placement; the Questing Beast's sea rules; the Mountain Turtle at sea on ice; 99 wood and stone, two skiffs; HUD rearranged with spell presets (PR #109). The pre-publish review found no blockers. |
| 259 | `r259-a490b918fa7e` | 2026-10-21 | World beasts pursue (3 crossings, Blob 1); Blob split; Glyphs fix; Rift Step without recall; Pack tabs; back button; carry limits and the 1+1 shovel; Psychic Crystal poise, dungeon bounds and hunting (PR #108). The pre-publish review found no blockers. |
| 257 | `r257-204a3837382b` | 2026-10-21 | The Lightning Giant world boss; the Giant at sea on his cloud; Supernova fog at sea (PR #107). The pre-publish review found no blockers. |
| 253 | `r253-447383f7b357` | 2026-10-21 | The Void Walker boards the Astral Worm; Astral pair rules; release log (PRs #105, #106). The re-review after the leave-roll fix found no blockers. |
| 251 | `r251-567504e5a114` | 2026-10-21 | The Void Walker, Astral Worm, Gate Revenant, Blob regeneration, ocean; review fixes; Griffin art; plinth saddle (PRs #103, #104). Pre-publish review found no blockers. |
| 249 | `r249-4a43f3ccc5cd` | 2026-10-20 | Psychic Crystal continuation (orbital lasers, Knight homing orbs) |
| 247 | `r247-5d8a8126e8b6` | 2026-10-20 | |
| 243 | `r243-79e75c3186cb` | 2026-10-20 | |
| 241 | `r241-45286473b10a` | 2026-10-20 | |
| 239 | `r239-0a2af28b4090` | 2026-10-20 | |

The full history is in `CHANGELOG.md`, in `git log origin/gh-pages` ("Promote r…") and in `docs/HERMES_PROJECT_FIELD_GUIDE.md`.
