# Abuelita's Empanadas: the user journey (written before the build)

Tests in `abuelitas.test.mjs` walk these steps at 360, 390 and 1440 wide.
The rule (Tristan, 2026-11-15): write the steps and the tests first, then build until they pass.

## Steps

1. **Land.** One idea fills the first screen: a huge headline, one line about the bakery, and two actions only: "Order for pickup" and the call button with the phone number. Nothing to fill in.
2. **See the favorites.** Below the first screen, the owner's three favorites (Chile Relleno, agua de horchata, agua de jamaica, per the owner on 2026-11-17) sit in their own row with Add, then the full menu.
3. **Look at the menu.** The counter board as it stands (Tristan's photos, 2026-11-17): eight savory and four sweet empanadas, each named with a photo slot, then the combo, desserts and appetizers, drinks and fresh waters. The board shows no prices, so the site shows none. No invented dollar figures.
3. **Find the shop.** The visit block names Old Town Marketplace, 332 Main St, Longmont, and has a directions link. Hours are marked as coming from the bakery until we have them.
4. **Call.** The call button dials 720-218-9808.
5. **Build an order (Tristan, 2026-11-17: the Bunny Burritos cart is what sold them).** "Order for pickup" leads to the menu. Every empanada tile, and every dessert, coffee and water, has an Add button. Add two Steak, one Pineapple and one horchata. The tile shows its count, and an order bar appears with 4 items. The bar steps aside while the order section itself is on screen.
6. **Review, one question at a time.** The bar opens the order on the cart alone. Taking the pineapple out removes it. The cart says the total is shown at checkout, because we have no prices and invent none. Next asks when you'll pick it up, then who's picking it up (name and mobile, required), then shows a review.
7. **Pay on Square.** "Pay on Square" sends the cart, time, name and phone to a small server piece. That piece asks Square for a checkout page with those items and returns its link, and the browser goes there. Payment happens on Square's page and the order lands on their register. We never ask for card details.
8. **Empty, or a party.** An empty cart says so and won't go on. "Feeding a crowd?" asks how many people, then names that number and offers the call.
9. **Before Square is connected,** the last step says plainly that it is a draft and offers the call. No dead pay button.

## Page rules checked at every width

- Exactly one `h1`, at least 48 px tall on a phone, inside the first screen.
- No visible action label repeats. No announcement bar or pop-out drawer. The order bar is fixed to the bottom of the screen on purpose, so it is left out of the overlap check.
- Its own palette: no amber button, no cream page with brown ink, and no serif headline.
- No overlapping tap targets, no sideways scroll, no console errors, no broken images.
- Body copy is full sentences: no sentence under six words, no em-dash asides.

The small "draft" strip at the top is for Tristan's showing and is left out of the checks.
