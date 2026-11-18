# Abuelita's Empanadas: site plan

First paying client. Owner said "yes, ASAP" to the $50/month plan on 2026-11-17. The owner may bring two more stores; the idea is a free month per store that signs, so the public $50 price stays as it is.

- Bakery in the Old Town Marketplace, 332 Main St, Longmont CO 80501. Phone 720-218-9808.
- Sister shop: Colorado Dumplings, in the same marketplace. Its home page is a 404, so it is the likely second client.
- Draft site: `clients/abuelitas/` in this repo. Tests: `tests/clients/abuelitas.test.mjs`, with the journey in `tests/clients/abuelitas.journey.md`.

## The page (one page, phone first)

1. **Hero.** Their counter board's black label with the gold line, holding the name. One line about the bakery, then two buttons: "Order for pickup" and "Call 720-218-9808".
2. **Menu.** Copied from the counter board in Tristan's photos of 2026-11-17: 8 savory and 4 sweet empanadas as board tiles, plus the combo, desserts and appetizers, coffee, and the fresh waters (chocolate on Saturdays only). **No prices.** The board shows none and nobody remembers them, so none are invented.
3. **Order ahead.** One question at a time. "Today, for pickup" hands off to their Square ordering page. "A party or event" asks how many people, then offers the call.
4. **Come by.** The address, a directions link and the hours (still a marked placeholder).

The bold idea is the board itself. The page wears the same black labels with a gold line that people already see over the counter. There are no effects on the page.

Palette (taken from their shop): black #111 and the gold line #d9b44a from the board (gold is for lines only, never a button), the yellow of their wall #f1d36e behind the first screen, the yellow-to-orange of their dessert board (#f6c443 to #ef8f3a) behind the desserts, and a jamaica red #b3122e for hover and focus. Type: Anton for the name and the section bands, Delius for the item names, and Delius Swash Caps for section titles. Both Delius faces are close to the board's hand lettering.

The label shape is their board's: scooped corners and a soft rise in the middle of the top and bottom edges, with a gold line inset. `frame.js` draws it at each box's real size, so the curves never stretch.

**Photos (2026-11-17):** the twelve empanada pictures are **stand-ins**. They come from one Nano Banana sheet made from Tristan's photos of the board (`notes/clients/abuelitas/src/empanada-sheet-nb.png`), re-rendered on flat chroma blue with no shadows (`empanada-sheet-nb-blue.png`) and keyed out to `clients/abuelitas/photos/*.webp`. The draft strip says so. Replace them with real photos before launch and never present them as the bakery's own.

**Mascot:** the corn chef on the board is too small in our photos to redraw faithfully. We need a clear photo or the original file before making a clean vector, and Tristan sees the vector before it goes on the site.

Refero references: Yelp menu list `aa22636c-19f3-4617-90d1-539f037d0659` for how the menu reads, Uber Eats store info `f38700d4-faff-4d0d-8ac2-383f6f5d93f8` for the address and hours rows, DoorDash store menu `87a97d65-2a42-4ec2-8be3-2cd02537d13e` for the tile grid, and Blue Apron `fb0d6839-6e16-4ab5-a7b9-715e784a33a8` for a two-colour landing with one strong button.

## Ordering: our cart, Square's checkout (Tristan, 2026-11-17)

The Bunny Burritos cart is what sold them, so the site has a real cart. Payment still happens only on Square, and orders land on their register.

1. **On the site** (`order.js`): every menu item has Add and a stepper, and an order bar counts the items. The order then asks one question at a time: the cart, when you'll pick it up, who's picking it up (name and mobile), then a review. No prices are shown. The cart says the total appears on Square's checkout page.
2. **"Pay on Square"** sends the cart, pickup time, name and phone to the shop server (`clients/abuelitas/server/server.mjs`, one server for every client, shops listed in `shops.json`). That is a small Node server (Hostinger Node hosting is fine). It asks Square's Checkout API for a payment link holding those catalog items with a PICKUP fulfilment, and returns the link. The browser goes to Square's page, the customer pays there, and the order shows up in their Square orders like any online sale.
3. **Until it's live**, `<body data-checkout="">` stays empty and the last step says it's a draft and offers the call.

**What we hold, and what we don't.** Sea of Grass registers one Square app. The owner taps "Connect Square" once and approves limited permissions (orders, checkout, read items) on Square's own page. Square gives us an access token. It is stored as an encrypted server secret, one per shop, never in the website code or the repo. The owner can revoke it from their Square dashboard any time. We never see their Square password, their bank details or any customer's card.

**To go live:**
- [ ] Prices for every item entered in their Square item library (Square shows them at checkout).
- [x] Sea of Grass Square app registered (sandbox side set up 2026-11-17).
- [x] "Connect Square" built and tested in sandbox (2026-11-17): `/connect?shop=abuelitas` → Square's Allow page → "You're connected". The server stores the shop's key encrypted (`data/vault.json`, never committed), renews it before it expires, and matched all 30 menu items by name. A full order from the site page in Chrome landed on Square's checkout.
- [ ] Production: set the app's production Redirect URL to the hosted server's `/connected`, with production keys in the server's settings.
- [x] Tested `checkout.mjs` in Square's sandbox (2026-11-17): 2 steak + 1 horchata became a $13 pickup order with the name and phone on it.
- [x] Menu matching is automatic: on connect, the server matches the site's menu names (in `shops.json`) to the shop's Square items. Any it can't find are listed at `/status`.
- [x] Shop server hosted on Hostinger at https://shop.seaofgrass.studio (Node 22, settings entered by Tristan in hPanel as environment variables; encrypted vault at /home/u853137291/sog-shop-vault/, outside the app folder). Sandbox connected 2026-11-17, 30/30 items matched; the draft site's `data-checkout` points at it, so the demo reaches Square's test checkout.
- [ ] Go live: in Square switch to Production, set the production Redirect URL to https://shop.seaofgrass.studio/connected, and replace the sandbox settings in hPanel with production ones (SQUARE_ENV=production plus the production app id and secret). Then the owner taps https://shop.seaofgrass.studio/connect?shop=abuelitas.
- [ ] Combo: needs a Square modifier (side: corn cup or nachos) before it can go in the cart. For now it is shown but can't be added.

## What we need from the owner

- [ ] **Prices** for every item, entered in Square, which shows them at checkout.
- [ ] **Hours**, including any day the bakery is closed.
- [ ] **Photos:** the original files behind the menu-board pictures, or 20 minutes at the counter to shoot them. File names are already set in the page (`photos/ground-beef.webp` and so on).
- [ ] **Logo:** the corn mascot and the "Abuelitas Empanadas" lettering on the board, as the original file if they have it.
- [ ] **Square:** tap "Connect Square" once we send the link, and enter prices in their Square item library.
- [ ] **Domain login:** orderabuelitasempanadas.com at NameBright (it is parked on "Coming Soon" now). Ask whether they also own a shorter name.
- [ ] Check the copy: name spellings, "Dulce con leche", "Tinga, chicken y chipotle", and the Saturday chocolate.
- [ ] Whether Colorado Dumplings joins (the free month per store that signs).

## Domain and hosting

1. Host on the studio's static hosting (Hostinger) or GitHub Pages, at no extra cost to them. The page is static, with no build step.
2. With the NameBright login, point DNS at the host: an A or ALIAS record for the bare domain and a CNAME for `www`. Keep the domain in their name.
3. Turn on HTTPS and check that both `http://` and `www.` redirect to `https://orderabuelitasempanadas.com`.
4. Remove `<meta name="robots" content="noindex">` and the draft strip, then set up a Google Business Profile with the website and order links.
5. Billing per `notes/sog-broken-sites/counter-script.md` and the money notes: $50/month, billed monthly.

## Status

- 2026-11-17: tests written first and shown failing (the page did not exist), then the draft was built until all 9 pass at 360, 390 and 1440. Draft PR open, waiting on the owner's list above.
