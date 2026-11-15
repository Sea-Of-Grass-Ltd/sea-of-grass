# Bunny World: Refero references

**Logo:** not settled. A plain "Bunny World" wordmark in Gabarito stands in until Tristan settles the mark another way. Tagline: "Hop in. Find yours."

Each shop has its own look, led by one Refero style and borrowing a trait from a second. Nothing is copied wholesale: the palettes, fonts and layouts are rebuilt for a made-up bunny business. Every stylesheet also names its references in its first comment.

| Page | Lead reference (Refero style) | Borrowed from | What carried over |
|---|---|---|---|
| Landing (`index.html`) | Craftwork, "curated abundance, human touch" | Portal, "painted horizons, tactile tools" | A centred hero, rounded geometric sans, pale framing and vivid captioned gallery cards (Craftwork); the opening as a small illustrated world, here a street of the nine storefronts under a dusk sky (Portal). It wears Bunny World's own brand, not Sea of Grass's. |
| Bunny Burritos | Hungry Tiger, "spice-soaked poster theatre" | Roberta's Pizza, "halftone and revelry" | Burnt orange, poster-gold capitals (Anton), hot-pink flashes, dotted gold rules, pill nav, halftone texture |
| Bunny Auto | Lamborghini, "cinematic mechanical theatre" | SpaceX, "engineering at cinematic scale" | Black stages, towering condensed caps (Barlow Condensed), yellow only on actions, mono spec labels, a numbered spec-sheet price list |
| The Warren Bakehouse | Little Amps Coffee, "analog neighborhood energy" | Alison Roman, "butter paper, big opinions" | Cream, roasted brown, ochre and rust, a faded-blue announcement bar, soft serif (Young Serif) on a framed scene, mono labels, a printed menu with dotted leaders |
| Hare Today Barbers | GlossGenius barber software, "big type over black-and-white barbering, booking first" | Fresha venue pages and Aesop store pages, "team, durations, prices, hours as a calm ruled block" | Black and white with one signal red, condensed display caps (Big Shoulders), a mono departure-board chair board, a booking-app drawer |
| Hop Along Taproom | Yellowbird, "sunshine with a bite" | MANA, "fizzy illustrated exuberance" | Yellow and black, rubbery retro serif (Fraunces Soft), a cartoon mascot, typewriter labels, sticker cards, a whole pink band for events |
| Cottontail Farm | Volkshotel agenda, "a poster hero over programme tabs" (the season tabs) | Airbnb Experiences time picker and Tripadvisor map and checkout, "spots left, sold out, pins that open a card" | Re-colours itself by season (sun yellow, pumpkin orange, resting olive) on cream; Gabarito display, Hanken Grotesk text, mono labels |
| Burrow & Bough | Houseplant, "high design, low pretension" | Givingli, "paper with heart" | Cream and chocolate, an interior scene, extended caps (Unbounded), a dense product grid, red and dusty-blue grounds |
| Long Ears Landscaping | arte*, "fieldwork meets pop" (full-bleed working photography, an oversized lowercase wordmark in one sunny accent, typewriter labels) | Raus (cream canvas, chunky friendly wordmark, rounded cards, sky-blue offer bar); Tesla and Mercury calculators for the August Test | Cream, deep pine and prairie gold; Bricolage Grotesque, Hanken Grotesk, IBM Plex Mono; the August Test and a blowout route booker |
| Hopwell Family Chiropractic | Ease Health, "botanical systems in flow" | Radial, "sunlit ripples of reassurance" | Forest-green serif heads, a pale-leaf hero panel, a dusty-blue stage with floating interface cards, rounded shells |

Art: every picture is drawn in code (SVG) in each shop's own style, so there are no stock photos and no licence questions. Real client sites would use their own photos in the same frames.

## Landing redesign (2026-11-14)
Tristan: "a bunch of cards stacked on top of each other" and "made by totally different people than the SOG main page".
- **Layout system:** the seaofgrass.studio home (`/index.html`, Dew). Copied: the 1240 px container on a side gutter, mono uppercase kickers, big tight headings, hairline rules between items, prices as big numbers with small labels, big step words, and a full-colour close band.
- **Live showcase**, from Refero screens:
  - [Sana AI](https://refero.design/pages/46f88085-22a3-43f1-9838-e7e34ce7eaae): tabbed feature showcase, where one big preview swaps with the selected tab.
  - [Contra theme picker](https://refero.design/pages/345b0cc5-4176-483d-bb8d-1937d8012fb0): a big live preview beside a stacked list of choices.
  - [Pedestal](https://refero.design/pages/2161b3ff-d665-4a7c-96b7-c64745e3cfbc): small labelled callouts pinned to the product view.
- **Switching FAQ**, from [Mercury FAQ](https://refero.design/pages/d2c507ad-2415-4f12-95ed-37cc8369dae6): a narrow column of hairline accordion rows with a plus/minus icon.

## Landing redesign 2 (2026-11-15): the mark leads, tap it to change the look
Tristan: "you tap the Bunny Ears logo and it changes the style of the page". The big mark is the hero and a button; each tap pops the ears, sweeps one glint and crossfades the page to the next look. Looks only re-set CSS variables, so prices, chips and buttons never move. Under the headline, one question ("What kind of shop do you run?") with chips; a pick shows "Try <shop>" and puts that shop on Main Street (the live showcase).
- Hero composition: Refero styles Mammoth Brands (the identity at monumental scale) and Dirt (one shiny object on a quiet stage); type and pills after IFTTT; calm prices after Square.
- The five looks, each from Refero palettes:
  - **Disco** (default): Pitch plum stage + Atlas mirror silver + Vivid+Co warm white + one Leonardo hot-pink spark (light only)
  - **Clean**: Peloton cool off-white + Postevand black + a16z violet focus
  - **Bold**: SAP Good Energy black and energy orange, condensed caps (Big Shoulders)
  - **Warm**: OLIPOP vanilla cream, bottle green, candy pink, Young Serif
  - **Sunny**: Yellowbird sunshine yellow and black, Fraunces
Sheets: notes/bunny-world/landing-logo/ (Refero sheet, palette sheet); screens: notes/bunny-world/landing-redesign/.
