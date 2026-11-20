# Infinite Corridor

> *There is a passage that touches everything that is, was, or could be.
> Near the place you woke, it still remembers being human: ruined streets, a guttering refuge,
> strangers reciting books they no longer know they once read.
> Walk far enough and it forgets. The walls become something else. So, eventually, do the things that walk them.
> No one ever told your story, so the Corridor cannot hold you on any page.
> When you die, it sends you back to the last place that remembered you.*

**[Play it in your browser →](https://brightlineai-bot.github.io/infinite-corridor/)**

Infinite Corridor is a single-player action adventure for phones, built as an installable web app that plays fully offline. You carry one persistent character, the Wayfarer, outward from Ember Refuge through an unbounded, procedurally generated world. It isn't a roguelike: the world and your character persist, and dying returns you to your last checkpoint with everything you carried.

This is a personal project by BrightLineAI, shared as a showcase. It isn't for sale and isn't accepting contributions.

*Snapshot: 20 November 2026, release 1048. The game is still in active development.*

---

## What's in it

- **An endless, persistent world.** The overworld is a grid of 32×32 sections with no edge. Each journey has its own world seed, so a place stays the same once you've seen it, and what you change there is saved: the foes you've killed, the chests you've opened, the ground you've walked. The Atlas maps what you've explored, and Wayglasses let you travel back across it.
- **Regions that change as you go out.** Ruined streets and hamlets near the Refuge give way to stranger country farther out: Salt Marshes, Savannas, canyons, Skylands reached by Sky Stairs, the Magma Rivers, and, 44 sections or more from the Refuge, the Oasis Ergs, a sand sea of seif dunes, wadis and turquoise oasis pools.
- **Crossings and the Deep.** Dungeons lie beneath the land: single crossings, many-levelled descents, Pentagons, keeps and the floors of the Deep, some of them lairs of things that should not be woken.
- **World beasts.** Huge roaming creatures with their own move sets and long fights, among them the Astral Worm, the Void Walker, the Gate Revenant, the Lightning Giant and the Earth Apatosaurus. Each has its own synthesised theme.
- **Two ways to progress.** A new journey chooses a mode and a starting weapon and tool. In *Classic*, nothing is held back. In *Exploration* (recommended), most abilities are earned out in the world: through quests given by the people of the Refuge and beyond, through milestones that count what you already do, and from Reliquaries left at the bottom of places you finish. The Reciter's Tome keeps a compendium of everything you have learned (what you haven't found is counted, never named), and each ability's how-to page can send you to a Training Yard to try it on practice dummies, with nothing kept.
- **A story you have to piece together.** The narrative is never explained outright. *Reciters*, wanderers half-dissolved into the Corridor, each speak one line of a public-domain book every time you meet them (Tolstoy, Dostoevsky, Hesse, Emerson, Rilke, Lovecraft's Randolph Carter stories, Musashi). *Glimpses* show you a few seconds through someone else's eyes, or something else's. Threads, rumours and quests such as the Missing Crossing, the Beekeeper's Jars and the Second Wayfarer lead farther out.
- **Builds.** Weapons, tools, spells and disciplines, plus a Lattice of passives, glyphs and Echoes to combine them with. Gear can be salvaged, forged and refined.
- **Mounts.** Free a Triceratops hatchling from the pen where a pack guards him, raise him as he grows from your fights, and ride him once he's grown.
- **Townsfolk cannot be harmed.** The people of the Refuge, its waystations and the hamlets are never hurt by anything you do.
- **Two ways to see it.** *Standard View* is a top-down action view. *Close View* is a low third-person camera with torchlight and fog, for the buildings, keeps and dungeons.
- **A soundtrack made of code.** Thirty-odd original pieces of slow dungeon-synth, synthesised live in the browser (no audio files). The music shifts between calm, combat and boss tiers.
- **Built for a phone.** Touch controls, three journey slots, quality tiers, and reduced-motion, high-contrast, text-size and family-safe settings.

The full history of what has changed, release by release, is in [CHANGELOG.md](CHANGELOG.md).

## Playing

Open the [live game](https://brightlineai-bot.github.io/infinite-corridor/) in a recent mobile or desktop browser (Chrome is the main target).

**Install it (Android):** open the link once while online, let it finish loading, then choose **Install app** or **Add to Home screen** from Chrome's menu. From then on it launches like an app and runs with no connection at all.

**Updates:** installed copies pick up a new release the next time you open the game while online.

**Touch:** a thumb stick to move and a cluster of on-screen buttons for attack, dodge, jump, act, tool, potion and the ability slots.

**Keyboard (desktop):**

| Key | Action |
| --- | --- |
| WASD or arrow keys | Move |
| `J` | Attack |
| Space | Dodge |
| `K` | Jump |
| `E` | Act / interact |
| `H` | Potion |
| `Q` or `R` | Tool |
| `F`, `G`, `C`, `B` | Ability slots A to D |
| `T` | Switch build preset |
| `O` | Oculus (switch between Standard View and Close View) |
| `M` | Atlas |
| `L` | Journal |
| `I` | Menu |
| `P` or Escape | Pause |

### Your saves

- Saves live **only on your device**, in the browser's own storage (IndexedDB, with a small local mirror for safety). Nothing is uploaded and there are no accounts.
- The game autosaves every few seconds and whenever you pause or switch away from the app. Coming back resumes you exactly where you were, paused.
- There are three journey slots. A journey can be exported to a file and imported again from Options → Journeys.
- Clearing your browser's site data for the game, or uninstalling the installed app, deletes your journeys. Export them first if you want to keep them.

## Running it locally

You need Node.js 22 or newer. There are no dependencies to install.

```sh
git clone https://github.com/BrightLineAI-Bot/infinite-corridor.git
cd infinite-corridor
npm run dev        # serves the game at http://localhost:5173
npm test           # runs the test suite
npm run build      # writes the static, installable build to dist/
```

To test offline play or installation, serve `dist/` over HTTPS (or `localhost`). Opening `dist/index.html` straight from disk won't work, because service workers need an HTTP(S) origin.

If you change code while the dev server is running, the service worker may serve cached files. Unregister it and clear the site's caches in your browser's dev tools before testing again.

## How it's built

- Plain TypeScript and JavaScript modules, a canvas renderer for Standard View and WebGL2 for Close View. No frameworks and no runtime dependencies.
- **Deterministic generation:** the same seed, coordinates and generator version always produce the same place. Generators are versioned, so an existing journey keeps the world it started with.
- **Durable saves:** the save format is versioned, and older saves are migrated forward rather than reset.
- **The Proving Ground** (`/proving-ground/`) is a separate sandbox build, with its own storage and service worker, used to try content against a scratch copy of a journey (the Training Yard runs there). It never touches real saves.
- Releases go out through GitHub Actions: each merged change is tested, built and frozen as a preview, and production is published only from a reviewed preview.

The game was developed with AI coding assistants. Some of the 2D bestiary and story-scene art was made with an image-generation tool.

## Credits

- Made by **BrightLineAI**.
- 3D character bodies (the Wayfarer and several creature and townsfolk forms) are converted from the **[Quaternius](https://quaternius.com/) RPG Character Pack**, released under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Provenance and the conversion scripts are in [`docs/asset-sources/`](docs/asset-sources/).
- The reciters' texts are US public-domain works: Leo Tolstoy (trans. Louise and Aylmer Maude), Fyodor Dostoevsky (trans. Constance Garnett and Eva Martin), Ralph Waldo Emerson, H. P. Lovecraft's Randolph Carter stories, and Hermann Hesse's *Siddhartha* (Project Gutenberg volunteer translation). The Rilke poems and Musashi's *Dokkōdō* were put into English for this game. Sources are listed in [`src/recitations.ts`](src/recitations.ts).
- All music and sound are synthesised at runtime and original to this game.

Details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## For contributors

The project isn't accepting contributions, but if you're reading the code: [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md) and [`.claude/`](.claude/) hold the development workflow and instructions for the AI coding assistants that work on the game, and [`docs/`](docs/) holds the design records, verification notes and per-release implementation notes. Much of `docs/` is a historical working record rather than current documentation.

## License

Copyright © 2026 BrightLineAI. All rights reserved. The source is published for viewing and the game is free to play at the link above; no permission is granted to copy, modify, distribute or use the code or assets except as allowed by law. See [LICENSE](LICENSE). Third-party material keeps its own license; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
