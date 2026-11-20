# Asset and theme credits

This is an independent, non-commercial Star Wars fan project, without official licensing or affiliation. Star Wars names, lore and official reference imagery belong to their respective owners. Hasbro board/card artwork and film music are not included.

## Original project assets

`src/components/Art.jsx` retains original SVG fallback compositions, interface emblems and abstract character-inspired tokens. `src/components/DevelopmentArt.jsx` provides original domed outpost and hangar/base illustrations. CSS supplies the UI, orbit lines and dice. These original assets are not official character portraits or faction insignia.

The built-in sound pack is in `public/audio/`. It replaces the earlier synthesized UI tones and does not require user imports. `src/services/starWarsAudio.js` plays excerpts and loops of the creator-made recordings. No RichUp audio or Star Wars film soundtrack was used. The recordings recreate familiar Star Wars effects; they are not asserted to be licensed film extracts.

- **Enhanced blaster**, MikeE63, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), [original source](https://freesound.org/people/MikeE63/sounds/466834/). The creator recorded/mixed a cable tap and gunshot to make a Star Wars-type blaster.
- **R2-D2-style chirp**, Ashe Kirk / OwlStorm / Owlish Media, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/), [original source](https://freesound.org/people/OwlStorm/sounds/404759/).
- **Lightsaber recreation**, Bruna Mattos, João Gilberto Tenório and Taiane Ketily / posdesigndesom, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [original source](https://freesound.org/people/posdesigndesom/sounds/848168/). Excerpts and slowed loops are adaptations. This credit is also available in the game Settings and `/audio/CREDITS.md`.

## Official reference images requested by the owner

The owner subsequently requested actual Star Wars location images. `src/assets/referenceImages.js` records the official Databank reference image and source URL for all 22 planets, the four transports and Death Star. The site starfield is also an official StarWars.com background. The game references these hosted images; it does not present them as original or royalty-free. They are © Lucasfilm Ltd. and remain subject to the owner's rights. Their inclusion is limited to this owner-requested non-commercial fan theme, and no unrestricted redistribution or commercial license is claimed.

Card titles/descriptions are original. Property lore is paraphrased from official references; no existing Star Wars Monopoly card text is copied.

## Lore references

Primary references: [Star Wars Databank](https://www.starwars.com/databank) and [official eras](https://www.starwars.com/eras). Each researched location's source URL and applicable era note are stored in `src/game/rules/data.js` and linked from its deed. The board includes worlds known in the Galactic Civil War era; destruction/occupation and locations associated with other narrative eras are noted where relevant.

## Libraries, icons and fonts

The refreshed interface adds original CSS lighting, orbit guides, particle points, route trails and property-claim effects with GSAP and Motion. The board's live sector scene and larger menu cards reuse the already attributed Databank and India photographs. No additional movie footage, 3D model or generated planet image is bundled.

The animated event scenes use original SVG starfighter, Jedi/Imperial crest interpretations, saber beams and CSS hologram/radar/star-trail effects. They are code compositions made for this fan interface, not movie clips or extracted footage. Galactic scene backgrounds reuse the Databank references listed above.

Lucide supplies interface icons under its ISC license. React, Vite, Zustand, Tailwind and Motion retain their upstream licenses. GSAP and its React integration are used under their upstream distribution terms. Fonts use system-installed families; no downloaded font asset is bundled. See package metadata and installed dependency licenses for the exact third-party terms.

## Replacement and release

Title/theme configuration, locations, characters, faction names, descriptions, imagery and audio references can be replaced without rewriting economic rules. An unrestricted public or commercial Star Wars release requires appropriate rights. A fully original theme can replace these universe references. The creator licenses above apply to those recordings, not to the Star Wars brand or official imagery.

Original opening theme: **Main Title** by **John Williams and the London Symphony Orchestra**, from **Star Wars: A New Hope**, [official recording](https://www.youtube.com/watch?v=e9lapdvLSGw), provided to YouTube by Universal Music Group. The soundtrack is streamed by YouTube; it is not copied into this repository. The owner requested hiding the intro player's panel. Playback is subject to YouTube availability and browser autoplay controls.

Menu galaxy: actual Death Star and world imagery from the official Star Wars Databank, as listed above, with original CSS starfield and lighting effects. No third-party 3D models are included.

## Match background music

Default maps use **City Evening**, an original synthesized plucked instrumental made for this project. It contains no sampled recording or film-theme melody. Source: `scripts/generate-classic-music.js`; output: `public/audio/music/city-evening.wav`. Default sound effects are original Web Audio taps, dice noise, card shuffles and coin tones.

India uses 22 openly licensed real city photographs from Wikimedia Commons, stored locally in `public/images/india/`. Each author, source URL and exact license is retained in [India photo credits](public/images/india/CREDITS.md) and `public/images/india/manifest.json`.

Galactic radio uses three licensed ambient tracks with volume adjustment and crossfades, separate from the original intro recording. **Space Ambience** by Alexander Nakarada (https://creatorchords.com/music/space-ambience/); **Decoherence** (https://www.scottbuckley.com.au/library/decoherence/) and **Ephemera** (https://www.scottbuckley.com.au/library/ephemera/) by Scott Buckley (https://www.scottbuckley.com.au). All three are CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Full attribution and original download URLs are in public/audio/music/CREDITS.md and manifest.json. Personal songs remain in local browser IndexedDB and are not uploaded or distributed by the game.
