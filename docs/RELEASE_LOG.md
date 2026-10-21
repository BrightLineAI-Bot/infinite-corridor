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

**261**

## In flight

| Release | Agent | Branch / PR | Scope | State |
|---|---|---|---|---|
| 259 | Claude | `claude/dreamy-rubin-yn6q2p` (PR #108) | World beasts pursue you 3 sections in all (the Blob 1); a grown Blob's retreat leaves a fading mass; fix for the Glyphs screen crash (release 112 typo); Rift Step no longer recalls you (Anchor becomes Long Step); the Pack is tabbed (Wayfarer, Gear, Forge, Arcanum, Supplies); the phone's back button closes menus to the pause menu; carry limits (6 wood, 2 stone); the Psychic Crystal dodges after 3 hits and stays inside dungeons | Building. |
| 255 | Codex | `codex/narrative-253` → rename to 255 | Daily narrative work: Codex's vision, with ten artistic passes per scene | Reserved. Codex was first told 253, but 253 went to Claude below, so Codex uses **255**. |

## Published (live)

| Release | Candidate | Published | Notes |
|---|---|---|---|
| 257 | `r257-204a3837382b` | 2026-10-21 | The Lightning Giant world boss; the Giant at sea on his cloud; Supernova fog at sea (PR #107). The pre-publish review found no blockers. |
| 253 | `r253-447383f7b357` | 2026-10-21 | The Void Walker boards the Astral Worm; Astral pair rules; release log (PRs #105, #106). The re-review after the leave-roll fix found no blockers. |
| 251 | `r251-567504e5a114` | 2026-10-21 | The Void Walker, Astral Worm, Gate Revenant, Blob regeneration, ocean; review fixes; Griffin art; plinth saddle (PRs #103, #104). Pre-publish review found no blockers. |
| 249 | `r249-4a43f3ccc5cd` | 2026-10-20 | Psychic Crystal continuation (orbital lasers, Knight homing orbs) |
| 247 | `r247-5d8a8126e8b6` | 2026-10-20 | |
| 243 | `r243-79e75c3186cb` | 2026-10-20 | |
| 241 | `r241-45286473b10a` | 2026-10-20 | |
| 239 | `r239-0a2af28b4090` | 2026-10-20 | |

The full history is in `CHANGELOG.md`, in `git log origin/gh-pages` ("Promote r…") and in `docs/HERMES_PROJECT_FIELD_GUIDE.md`.
