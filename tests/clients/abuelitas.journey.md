# Abuelita's Empanadas: the user journey (written before the build)

Tests in `abuelitas.test.mjs` walk these steps at 360, 390 and 1440 wide.
The rule (Tristan, 2026-11-15): write the steps and the tests first, then build until they pass.

## Steps

1. **Land.** One idea fills the first screen: a huge headline, one line about the bakery, and two actions only: "Order for pickup" and the call button with the phone number. Nothing to fill in.
2. **Look at the menu.** The counter board as it stands (Tristan's photos, 2026-11-17): eight savory and four sweet empanadas, each named with a photo slot, then the combo, desserts and appetizers, drinks and fresh waters. The board shows no prices, so the site shows none. No invented dollar figures.
3. **Find the shop.** The visit block names Old Town Marketplace, 332 Main St, Longmont, and has a directions link. Hours are marked as coming from the bakery until we have them.
4. **Call.** The call button dials 720-218-9808.
5. **Order for today.** Tap "Order for pickup". The order block asks one question at a time. Choose "Today, for pickup" and the next step hands off to their Square ordering page (the menu and payment stay in their register). We never take payment ourselves.
6. **Order for a party.** Choose "A party or event" instead. The next question, alone on screen, asks how many people. Enter 30 and the hand-off names 30 people and offers the call.
7. **Before the Square link exists,** the hand-off says plainly that it is a draft and still offers the call, so nothing is broken.

## Page rules checked at every width

- Exactly one `h1`, at least 48 px tall on a phone, inside the first screen.
- No visible action label repeats. No announcement bar, quick bar or pop-out drawer.
- Its own palette: no amber button, no cream page with brown ink, and no serif headline.
- No overlapping tap targets, no sideways scroll, no console errors, no broken images.
- Body copy is full sentences: no sentence under six words, no em-dash asides.

The small "draft" strip at the top is for Tristan's showing and is left out of the checks.
