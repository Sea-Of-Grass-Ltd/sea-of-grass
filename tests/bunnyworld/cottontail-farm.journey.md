# Cottontail Farm: the user journey (written before the build)

Tests in `cottontail-farm.test.mjs` walk these steps at 360, 390 and 1440 wide, on a November day (the off-season) and on an August Saturday (sunflower season).
The rule (Tristan, 2026-11-15): write the steps and the tests first, then build until they pass.

## Steps

1. **Land on the festival.** In November the page opens on the Harvest Festival, not the resting field: the pumpkin photo, "Lost in the maze yet?" in huge type, one line saying when it runs, and one button, "Get festival tickets". Nothing to operate: no season tabs, no weather bar, no closure button, no year timeline.
2. **In season, the season that's on leads.** On an August Saturday the page opens on the sunflowers instead.
3. **Buy tickets.** "Get festival tickets" goes to the ticket block. Pick a day, pick an entry time, add a kid, and the total goes up. "Continue to checkout" holds the tickets.
4. **See the farm off-season, if you want to.** Lower down, one quiet line offers the other seasons. Choosing the off-season swaps the headline to "See you in August." and swaps tickets for a single mailing-list sign-up.
5. **Jobs are one line.** In festival season the crew wanted block is one sentence that opens the application form.

## Page rules checked at every width

- Exactly one `h1`, at least 48 px tall on a phone, on the first screen. One or two actions on the first screen, and no tabs, toggles or fields.
- Nothing on the default page says "Closed for the season".
- One email sign-up on the whole page at most (the field-trip form's contact email is not a sign-up).
- No "What's open now" list (the map list carries it). No header ticket button repeating the hero's.
- No visible action label repeats. No overlapping tap targets, no sideways scroll, no console errors.
- Body copy is full sentences: no sentence under six words, no em-dash asides.

The Sea of Grass demo strip at the top and the "Run a farm" band at the bottom are shared chrome across all shops, so they are left out.
