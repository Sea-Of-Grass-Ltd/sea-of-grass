# Old Town Marketplace: site pitch and plan

Old Town Marketplace (OTM) is the indoor mini mall at 332 Main St, Longmont CO 80501, in the Creative District. It holds about 18 businesses on three levels. The building is open 11 to 7 every day, and each shop sets its own hours. Management: Downtown Management, Ltd., (720) 680-0557, downtownmanagementltd@gmail.com (all from their public site).

- Demo: `clients/otm/` in this repo (draft PR). Shop data: `clients/otm/shops.json`.
- Tests: `tests/clients/otm.test.mjs`, with the journey in `tests/clients/otm.journey.md`.
- The intro comes from Mirella and David, owners of Abuelita's Empanadas. They have been tenants for ten years and are our first client. **We never contact the businesses or management ourselves before that intro.**

## The pitch

Their site today is one long WordPress page of announcements, some years old. A visitor on Main Street can't tell what's inside, what's open, or where a shop is. Shops that move or close stay on the page.

**One idea: the building as a map you can walk.** You tap a level, tap a unit, and that shop's card opens with what they sell, their hours and their links. The directory, events and food all hang off the same shop records, so updating one record updates the map, the list and the card together.

What it does for management:
1. **Every shop gets found**, including the ones upstairs and on the mezzanine that foot traffic misses.
2. **Empty units sell themselves.** "Thinking of opening a shop here?" asks one question at a time and hands management a lead with what the person sells, how much room they need and how to reach them. Leasing is their actual business.
3. **One place to keep current.** We update the shop list when tenants change, as part of monthly care.
4. **Food ordering already works.** Empanada orders go to Abuelita's own Square ordering (PR #223). We link to it rather than building a second cart.

How to say it (warm, short): "Mirella and David asked us to show you what we built for them. We'd like to do the same for the whole building, so every shop here gets found, upstairs included."

## Pages (one page, phone first)

1. **Headline + open-now strip.** "Small shops under one old roof." The strip reads the clock in Longmont's time zone and says open until 7, or closed and opening at 11. It also says each shop sets its own hours.
2. **Floor map.** Three tabs: Main floor (B back hall, the atrium and dining, A units on the Main Street front), Upstairs (C), Mezzanine (D). Colour is the shop type. Grey hatched units are "not listed". Dashed tiles are shops we know are inside but whose unit we don't know. Every unit opens the shop card. On phones the card is a bottom sheet with ×, tap-outside and Escape to close.
3. **Directory.** All, Food, Boutiques, Art, Collectibles, Wellness. Each row opens the same card.
4. **Food.** Abuelita's: "Order empanadas for pickup" goes to `/clients/abuelitas/#order`. Colorado Dumplings: order at the counter for now, with online ordering offered on the same $50 plan. B5 dining and karaoke is "coming".
5. **What's on.** The Pine Car Derby, the Mariposas de la Memoria memorial in the foyer, Joyanna Rose Gittings' Diego Rivera tribute mural, and the spring Shock Art vote. Links to their CalendarWiz calendar.
6. **Come on in.** Address, hours, parking, phone, and a directions button.
7. **Thinking of opening a shop here?** One question at a time: what you'd sell, how much room, then name and phone or email, then a review. In the demo it says plainly that nothing is sent and gives the marketplace's phone number. Live, it emails management.

## Identity

The identity is a wayfinding sign you can walk through. Navy ink (#13213a) on a cool paper (#f2f3ee), with five shop-type colours that do the work: tomato for food (#e5482e), pink for boutiques (#e86aa0), cobalt for art (#2c57e8), green for collectibles (#17946a), and lilac for wellness (#8a75e0). The badge is three stacked bars for the three levels, in the same colours as the map, so the logo and the map are one idea. Type is Archivo, set wide and heavy for headings, with JetBrains Mono for unit numbers and labels. Buttons are navy pills. No shop's branding is used anywhere, and there is no brown, no cream serif and no amber button.

Refero references:
- Dopper store locator `018b67f4-0181-46a7-ac42-0e87095776d3`: one bold panel and a detail card opened from the map.
- Instacart store directory `d343980a-b4d2-4c87-8d05-f5431169a563`: filter chips above a card list.
- Starbucks store detail `bcd1e8b4-c218-4a14-b911-07d1d1cfe349`: address, phone and hours as plain rows.
- Peak Performance stores `e296ab47-5d7a-40f0-a78b-f3c4cd3d2324`: pill filters and a quiet list.

There are no photos yet. With Tristan's typed go, one generated image at a time could fill the hero. Real photos of the atrium and the stairs, taken on site, would be better.

## Pricing idea

- **The marketplace pays the $2,000 site tier plus monthly care.** Care covers keeping the shop list, map and events current.
- **Any shop can add its own ordering or booking at the $50/month plan.** Their button appears on their card and in the food or directory section. Abuelita's is the working example.
- **Abuelita's owners get a free month for each shop that signs**, as thanks for the intro. The public $50 price stays as it is.
- Payment terms as always: nothing to start, a 30% deposit once management sees the first draft, and the rest at launch.

## What we need from management

- [ ] **The floor plan**: a photo of the directory board or a sketch, so the map shows real unit positions. The demo's bands are a guide.
- [ ] **The tenant list with unit numbers.** These are unknown or unclear today:
  - Abuelita's Empanadas and Colorado Dumplings (we placed them in the atrium and dining area as a guess).
  - Belle Isa Boutique, The Golden Bee, Great Nile Jewelry, Proudly Addicted, and Community Cares.
  - D4: both The Dinostaur and R&R Unique are listed there.
  - D3: whether Proudly Addicted shares it with Joyeria Maria Bonita.
  - Whether Maldos Coffee & Boba (logo from 2020 still on the page) is still open. It is left out for now.
- [ ] **What Disorderly Designs (A3), Hail Mary Clothing (A6) and Proudly Addicted sell**, and whether Hail Mary opened as planned in June 2026.
- [ ] **Hours.** The home page says 11 to 7, but the leasing page says 10 to 7. We also need each shop's own hours, or permission to show "mall hours" for all of them.
- [ ] **Parking.** Is the garage east of the building, off Kimbark Street, open now?
- [ ] **Events.** The 2026 Pine Car Derby date, whether the Rivera mural is finished, and who updates the CalendarWiz calendar.
- [ ] **B5.** The dining and karaoke plan, the name, and the opening date.
- [ ] **Leasing.** Which email should get the "open a shop here" leads, and whether any units are free right now.
- [ ] **Domain.** The login for oldtownmarketplace.com, so we can point it at the new site once it's approved.
- [ ] Permission to use each shop's name and links. A written OK from management, plus a "tell us if anything is wrong" note to tenants, sent by management.

## Status

- 2026-11-17: journey and tests written first and shown failing (0 of 10; the page did not exist). Then the demo was built until all 10 pass at 360, 390 and 1440. Draft PR open.
- The food link points at `/clients/abuelitas/#order`, which goes live when PR #223 merges.
