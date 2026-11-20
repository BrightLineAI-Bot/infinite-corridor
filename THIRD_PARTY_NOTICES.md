# Third-party notices

Infinite Corridor is proprietary (see [LICENSE](LICENSE)), except for the third-party material below, which keeps its own license or public-domain status.

## 3D character models: Quaternius RPG Character Pack (CC0 1.0)

- **Creator:** Quaternius (https://quaternius.com/)
- **Pack:** RPG Character Pack (November 2020), https://quaternius.com/packs/rpgcharacters.html
- **License:** CC0 1.0 Universal, Public Domain Dedication (https://creativecommons.org/publicdomain/zero/1.0/). The pack's own license text is kept at [`docs/asset-sources/wayfarer-rogue/License.txt`](docs/asset-sources/wayfarer-rogue/License.txt).
- **Files used:** `Rogue.gltf` (body and rig) and `Cleric.gltf` (the Wayfarer's head and the townsfolk's robed body). The original source files, their SHA-256 hashes, download links and retrieval date (2026-11-07) are recorded in [`docs/asset-sources/wayfarer-rogue/provenance.json`](docs/asset-sources/wayfarer-rogue/provenance.json).
- **Where they appear:** converted, re-proportioned and re-coloured derivatives form the Wayfarer's body (`assets/wayfarer/`) and the Close View bodies of the hooded duelist, the Nanobot Knight, the Void Walker and the townsfolk. The conversion scripts are in [`docs/asset-sources/`](docs/asset-sources/) (`wayfarer-rogue/convert.mjs`, `hooded-duelist/convert-duelist.mjs`, `nanobot-knight/convert-knight.mjs`, `void-walker/convert-walker.mjs`, `townsfolk/convert-folk.mjs`).

## Reciters' texts (US public domain)

The lines the Reciters speak are taken in book order from the Project Gutenberg texts of these works, all in the public domain in the United States. The per-reciter sources are listed in [`src/recitations.ts`](src/recitations.ts).

- Leo Tolstoy, *War and Peace*, translated by Louise and Aylmer Maude (1922–23).
- Fyodor Dostoevsky, translated by Constance Garnett: *The Brothers Karamazov* (1912), *Crime and Punishment* (1914), *Notes from Underground* (1918).
- Fyodor Dostoevsky, *The Idiot*, translated by Eva Martin (1915).
- Ralph Waldo Emerson, *Nature* (1836) and *Self-Reliance* (*Essays: First Series*, 1841).
- H. P. Lovecraft, the Randolph Carter stories: *The Statement of Randolph Carter* (1920), *The Unnamable* (1925), *The Silver Key* (1929), *Through the Gates of the Silver Key* (1934, with E. Hoffmann Price) and *The Dream-Quest of Unknown Kadath* (1943).
- Hermann Hesse, *Siddhartha* (1922), in the Project Gutenberg volunteer translation (2008).

Two further texts are public-domain works whose English renderings were written for this game:

- Rainer Maria Rilke, eleven poems from *Das Buch der Bilder* (*The Book of Images*, 1902/1906).
- Miyamoto Musashi, *Dokkōdō* (*The Path of Walking Alone*, 1645).

## Music and sound

All music and sound effects are synthesised at runtime by the game's own code. No third-party audio is included.
