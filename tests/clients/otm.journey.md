# Old Town Marketplace: the user journey (written before the build)

Tests in `otm.test.mjs` walk these steps at 360, 390 and 1440 wide.
The rule (Tristan, 2026-11-15): write the steps and the tests first, then build until they pass.

The visitor is someone on Main Street in Longmont, phone in hand, wondering what's inside the old building at 332.

## Steps

1. **Land.** The first screen holds one headline, an "open now" strip and the top of the floor map. Nothing to fill in.
2. **Is it open?** At 2 pm Mountain time the strip says the marketplace is open now until 7. At 9:30 pm it says it is closed and opens at 11. It also says that each shop sets its own hours.
3. **Walk the map (the bold idea).** The map has three levels: Main floor (A and B), Upstairs (C) and Mezzanine (D). Tapping unit B3 opens The Happy Turtle Soap Shop's card. The card says what they sell, gives the hours line, and links to their website. The card closes with its × and with Escape. Switching to the Mezzanine and tapping D2 opens Broebuck Photography. Any shop whose unit number we don't know is drawn dashed and its card says the spot is still to be confirmed.
4. **Browse the directory.** Filters for Food, Boutiques, Art, Collectibles and Wellness. Food shows Abuelita's Empanadas and Colorado Dumplings and hides the soap shop. Wellness shows The Happy Turtle and Nirvana's Garden. Tapping a shop in the list opens the same card the map does.
5. **See what's on.** An events section lists at least two things happening at the marketplace and links to the marketplace calendar. Any date we aren't sure of is marked as to be confirmed.
6. **Get food.** The food section sends empanada orders to Abuelita's own ordering page (`/clients/abuelitas/#order`). This page has no cart of its own.
7. **Plan the visit.** The visit section gives 332 Main St, Longmont, the 11 to 7 hours, parking, and a directions link.
8. **Ask about a space, one question at a time.** "Thinking of opening a shop here?" asks what you'd sell first. Next stays put until you answer. Then it asks what size of space you need, then your name and a phone or email, then shows a review. Only one question is on screen at a time. In the demo the last step says plainly that nothing is sent yet and gives the marketplace's phone number.

## Page rules checked at every width

- Exactly one `h1`, at least 40 px tall on a phone, inside the first screen.
- Its own palette: no amber button, no cream page with brown ink, and no serif headline.
- No overlapping tap targets, no sideways scroll, no console errors, no broken images.
- Body copy is full sentences: no sentence under six words, no em-dash asides.
- Shop data lives in one JSON file (`clients/otm/shops.json`) the page reads, so the same records can feed the local-business app later.

The small "demo" strip at the top is for Tristan's showing and is left out of the checks.
