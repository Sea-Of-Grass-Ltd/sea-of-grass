# Warren Bakehouse: shot list and prompts (waiting on Tristan's OK)

Why this shop next: its hero is the most visible cartoon left (an orange flat-colour cake scene with a drawn bunny). Burrow & Bough is a close second.

The page has two SVG drawings, and both get replaced:
1. Hero frame (`section.hero .frame`): the cake, loaf and coffee scene.
2. Cake-order preview (`.cake-pre`): a drawn cake whose top shows the message you type, as a live overlay.

Two optional extras to match the four-photo sets on Burritos, Hop Along and Auto:
3. Today's case, beside the menu card.
4. Visit, at the top of the hours card.

## Set style (all shots)
Look, in plain traits: an analog, neighbourhood feel; butter paper and rustic stoneware. The palette is cream, roasted brown, ochre and rust, with one faded-blue accent.
- Light: soft early-morning window light from the left, warm but not orange, with gentle real shadows. Shot on 35 mm film (Portra 400), slight grain, natural colour.
- Surfaces: a worn butcher-block counter, a cream plaster wall, brown kraft and butter paper, a speckled stoneware cup.
- Recurring prop: a small unglazed cream ceramic rabbit figurine, about thumb height, placed off to one side in every shot.
- Never in the frame: people, hands, faces, text, logos, signage, packaging marks or real brands.

## Prompts
**1. Hero (16:10, the text sits on the left, so the subject goes right of centre)**
Editorial food photograph inside a small neighbourhood bakery at dawn. A tall three-layer carrot cake with thick cream-cheese frosting and a rough, hand-spread finish sits on a pale stoneware cake stand on a worn butcher-block counter. One slice is cut and pulled slightly out to show the moist, spiced crumb and walnut flecks. Beside it are a crusty round sourdough loaf on brown butter paper and a speckled cream stoneware cup of black coffee. A small unglazed cream ceramic rabbit figurine stands near the loaf. Cream plaster wall behind, soft window light from the left, gentle shadows. Palette of cream, roasted brown, ochre and rust, with a faded-blue linen napkin folded at the edge. Clear, calm negative space on the left third. 35 mm film look, Portra 400, fine grain. No people, no hands, no text, no logos.

**2. Cake-order preview (square; the message is overlaid on the cake top, so the top must be plain)**
Three-quarter overhead photograph of a single round two-layer cake covered in smooth ivory cream-cheese frosting. The top is completely plain and flat, with no decoration, writing or piping, and has a thin piped border at the edge. The cake sits on a pale stoneware stand on butter paper over a butcher-block counter. A few curls of carrot and a sprinkle of crushed walnuts sit at the base, and the small unglazed cream ceramic rabbit figurine stands to one side. Soft morning window light, cream and ochre palette, warm shadows, 35 mm film grain. No text, no people, no hands.

**3. Today's case (4:5)**
Close photograph through the glass of a small bakery pastry case at opening time. Rows of morning bakes sit on brown kraft paper on wooden trays: croissants, cardamom knots, carrot-cake muffins and sugared scones, each slightly different and handmade. The small unglazed cream ceramic rabbit figurine stands between two trays. Warm, low morning light with soft reflections on the glass. Palette of cream, roasted brown, ochre and rust. Shallow depth of field, 35 mm film grain. No labels, no price tags, no text, no people.

**4. Visit (3:2)**
A quiet corner of a small neighbourhood bakery café in morning light: a narrow butcher-block window bench, two speckled stoneware cups, a half-eaten slice of carrot cake on a small plate, and a faded-blue linen napkin. Cooling sourdough loaves sit on a wire rack against a cream plaster wall, and the small unglazed cream ceramic rabbit figurine sits on the sill. Soft daylight through the window with long shadows. Palette of cream, roasted brown, ochre and rust. 35 mm film look. No people, no text, no signage, no logos.

## Credits (at the earlier rate: 2.75 credits per shot at high quality, the same as the Burritos test)
- Hero only, as a test: 2.75
- Both drawings (hero and cake preview): 5.5
- All four shots: 11
Recommended: the hero alone first (2.75). If he likes it, do the other three (8.25).

## Build notes
Same pipeline as Bunny Auto: WebP at three sizes plus a JPG fallback in preview/assets/work/bunny-world/, named `warren-*`. Delete the source PNGs from the scratchpad after encoding (the disk is tight). The cake preview keeps its live message `<span>`, positioned over the plain cake top.
