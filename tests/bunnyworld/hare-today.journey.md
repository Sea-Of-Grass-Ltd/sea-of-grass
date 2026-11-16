# Hare Today: the user journey (written before the build)

Tests in `hare-today.test.mjs` walk these steps at 360, 390 and 1440 wide, on a Saturday morning and on a Sunday night.
The rule (Tristan, 2026-11-15): write the steps and the tests first, then build until they pass.

## Steps

1. **Land.** One idea fills the first screen: the headline in huge type, one line saying whether the shop is open, and one button, "Book a chair". Nothing to operate, no chair board, no second button.
2. **At night it still says something useful.** On a Sunday night the line under the headline names the next morning the shop opens and who has the first chair. The word "Closed" appears at most once on the first screen.
3. **Meet the barbers.** Four barbers, each with a face photo, a name, what they're good at and either their live status (by day) or their first open time (by night). No barber row says "Closed".
4. **Book with Dee.** Tap "Book with Dee". The booking block now reads "Book with Dee".
5. **Pick a service, then a Sunday.** Sundays are open (9 to 3), so a Sunday in the day strip can be chosen and has free times.
6. **Book once.** Pick a time, enter a name and mobile, press "Book it". A "You're booked" confirmation appears.

## Page rules checked at every width

- Exactly one `h1`, at least 48 px tall on a phone, inside the first screen.
- The first screen of the shop (below the Sea of Grass strip) holds one or two actions at most, and no form fields, tabs or toggles.
- The header carries no Book button; booking is offered once at the top, by "Book a chair".
- No visible action label repeats anywhere on the page. No announcement bar, no quick bar, no pop-out booking drawer.
- No overlapping tap targets, no sideways scroll, no console errors.
- Body copy is full sentences: no sentence under six words, no em-dash asides.

The Sea of Grass demo strip at the top and the "Run a salon" band at the bottom are shared chrome across all shops, so they are left out.
