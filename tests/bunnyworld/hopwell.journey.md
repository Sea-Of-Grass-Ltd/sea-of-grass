# Hopwell: the user journey (written before the build)

Tests in `hopwell.test.mjs` walk these steps at 360, 390 and 1440 wide.
The rule (Tristan, 2026-11-15): write the steps and the tests first. Build the page only after that, and it is done when the tests pass.

## Steps

1. **Land.** The headline "Point to where it hurts" and the back photo with its tap spots are on screen.
2. **Tap where it hurts.** Tap the mid-back spot. That spot and the "Mid-back" chip both show as chosen.
3. **Answer the other two questions.** Pick "Months", then "Mornings". The answer card's label updates to match.
4. **See the first-visit info.** The dark card shows the new patient exam, its length (60 min) and the price.
5. **See the answers carried into booking.** The single booking block shows "Your answers: mid-back, months, worse in the mornings".
6. **Book once.** Pick the visit, then who to see, then a free time. Enter a name and contact, then press the one booking button. A "Booked" confirmation appears.

## Page rules checked at every width

- There is exactly one scheduling block. No other place on the page shows open times ("next open" or "same-day openings").
- Booking appears once in the header and once in the page. No section repeats the same button text.
- Tap spots sit at least 44 px apart, centre to centre. No label covers a spot. Spots have no halo.
- Any copy that counts the questions ("three quick questions") matches the number asked.
- Every question title is a full sentence (three words or more) ending in "?".
- Buttons, chips and spots only use colours from the page's own palette tokens (`:root` custom properties). They have no box-shadows.
- The page doesn't scroll sideways. The page itself logs no console errors.

The Sea of Grass demo strip at the top and the "Run a clinic" band at the bottom are shared chrome across all shops, so they are left out.
