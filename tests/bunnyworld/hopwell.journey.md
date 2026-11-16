# Hopwell: the user journey (written before the build)

Tests in `hopwell.test.mjs` walk these steps at 360, 390 and 1440 wide.
The rule (Tristan, 2026-11-15): write the steps and the tests first. Build the page only after that, and it is done when the tests pass.

## Steps

1. **Land.** The headline "Point to where it hurts" and the back photo with its tap spots are on screen, and nothing else: no chips, no answer card, nothing chosen.
2. **Tap where it hurts.** Tap the mid-back spot. It shows as chosen and the place is named under the photo.
3. **Answer the other two questions, one at a time.** Question 2 appears only after the tap; question 3 only after question 2. Pick "Months", then "Mornings". The answer card appears after the third answer.
4. **See the first-visit info.** The dark card shows the new patient exam, its length (60 min) and the price.
5. **See the answers carried into booking.** The single booking block shows "Your answers: mid-back, months, worse in the mornings".
6. **Book once.** Pick the visit, then a free time. Enter a name and contact, then press the one booking button. A "Booked" confirmation appears.

## Page rules checked at every width

- There is exactly one scheduling block. No other place on the page shows open times ("next open" or "same-day openings").
- Booking appears once in the header and once in the page. No section repeats the same button text.
- Tap spots sit at least 44 px apart, centre to centre. No label covers a spot. Spots have no halo.
- Any copy that counts the questions ("three quick questions") matches the number asked.
- Every question title is a full sentence (three words or more) ending in "?".
- Buttons, chips and spots only use colours from the page's own palette tokens (`:root` custom properties). Their only shadows are the neumorphic tokens.
- Nothing is pre-chosen on arrival, and nothing is carried into booking until all three answers are in (2026-11-15 simplify).
- Booking takes three steps or fewer; intake takes two and never asks the hook questions again.
- No "Live insurance check" and no member-ID checker; one of "Visits and prices" or the first-visit steps, not both.
- Buttons, chips, the answer card and the booking card carry the neumorphic shadows from two tokens only, and each shadow follows its element's radius.
- The page doesn't scroll sideways. The page itself logs no console errors.

The Sea of Grass demo strip at the top and the "Run a clinic" band at the bottom are shared chrome across all shops, so they are left out.
