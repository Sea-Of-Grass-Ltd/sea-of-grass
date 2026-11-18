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

Palette: black #111, white, the gold line #d9b44a used for lines only (never a button) and a jamaica red #b3122e for hover and focus. Type: Anton for the name and the section bands, and Delius for the item names, which is close to the board's hand lettering.

Refero references: Yelp menu list `aa22636c-19f3-4617-90d1-539f037d0659` for how the menu reads, Uber Eats store info `f38700d4-faff-4d0d-8ac2-383f6f5d93f8` for the address and hours rows, DoorDash store menu `87a97d65-2a42-4ec2-8be3-2cd02537d13e` for the tile grid, and Blue Apron `fb0d6839-6e16-4ab5-a7b9-715e784a33a8` for a two-colour landing with one strong button.

## Ordering through Square

They already ring up on Square. We never build a checkout. Orders and payment stay in their register.

- **Preferred:** Square Online ordering (free on Square's basic plan). Their register items show up there. We link the "Open the order page" button to it by setting `data-square="…"` on `<body>` in `clients/abuelitas/index.html`.
- **Fallback:** Square checkout links (Payment Links) per item or per box, made in their Square dashboard.
- Until we have a link, the order step says it is a draft and offers the call, so nothing on the page is broken.
- Tristan does not need his own Square account. If he wants to click through the experience before the meeting, a free account with one test item is fine, with no real charges.

## What we need from the owner

- [ ] **Prices** for every item, or permission to leave prices off and let Square show them.
- [ ] **Hours**, including any day the bakery is closed.
- [ ] **Photos:** the original files behind the menu-board pictures, or 20 minutes at the counter to shoot them. File names are already set in the page (`photos/ground-beef.webp` and so on).
- [ ] **Logo:** the corn mascot and the "Abuelitas Empanadas" lettering on the board, as the original file if they have it.
- [ ] **Square:** their Square Online ordering link, or adding Tristan as a team member so he can turn it on and copy the link.
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
