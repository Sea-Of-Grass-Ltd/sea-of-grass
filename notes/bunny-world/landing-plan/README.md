# Bunny World landing overhaul: plan + hero render (nothing built)

Tristan, 2026-11-15: "still feels disjointed, incomplete… needs a design overhaul that features the logo more prominently", the same one-question treatment as the shops, and the logo's identity: "professional & clean, but simultaneously fast (like a bunny) and has an undertone of fun (the logo looks like a discoball)". Ears read as "!!". Northern Colorado is full of cottontails, so the bunny is a local in-joke.

## The hero (render: `hero-start-*.jpg`, `hero-answered-*.jpg`)
- **The logo leads.** His mark (`brand/mark-ink.svg`, used as is, not redrawn) beside a big two-line "Bunny World" wordmark in Gabarito Black. It replaces the old "Hop in. Find yours." headline. On phones it stacks: mark, then wordmark.
- **One line of local** under it: "Northern Colorado has bunnies everywhere. Now it has their shops."
- **One question:** "What kind of shop do you run?" with ten chips: Restaurant, Auto shop, Bakery, Barbershop, Taproom, Farm, Gift shop, Landscaper, Clinic, and "Something else".
- **Answering reveals the match underneath** with a quick height-and-fade: the shop's poster, its name, one line on its hook, three features, then **Try it** and **Get one like this**, with the price line "from $2,000, fixed price in writing". "Something else" reveals the two closest shops plus "Book a free 20-minute look". Nothing else is on the first screen.

References (Refero): Contra's onboarding (logo, one centred question, two choice cards) and Faire's "what kind of store?" tile picker.

## The four story layers, as Tristan ranked them
1. **Local:** the one line under the logo, plus "Main Street" further down (below).
2. **Excitement ("!!"):** when a chip is tapped, the two ears do one quick pop (scale 1 → 1.06 → 1, 160 ms) before the match slides in.
3. **Web / World:** the globe in the head. No copy explains it.
4. **Fun (disco ball):** three glints, each placed where light from the top left would catch a faceted ball: a big one on the ring's upper-left, a small pink one at the top of the ring, a small one at the lower right. They twinkle once on load and again when a chip is picked (or on hover, on desktop). There's no scatter of dots and no star field.

**The trust and spark split** (the rule Tristan approved): about 80% steady, 20% spark. Steady: the grid, type, plain copy, real prices, real posters, forms and buttons. Spark: the ear pop, the glints, the one carrot accent. Spark never touches prices, forms or the buy buttons. Reduced motion turns the pop and twinkles off.

## The rest of the page, as one piece instead of a pile
1. **Hero:** logo, the question, the match (above).
2. **Main Street:** all nine shops as one row of storefront posters, as if on one street, each with its trade and "Try it". It replaces the tabbed showcase, so the shops read as one town. On phones it's a swipe row. It hints at the one-town idea Tristan wants long-term without promising an app.
3. **Prices:** the three real prices (fix from $250, site from $2,000, care from $50 a month) as plain big numbers. Moved here out of the hero.
4. **How it works:** the four short steps, kept.
5. **Worried about switching?** The FAQ, kept, as one quiet row.
6. **Close:** "Book a free 20-minute look", in the full-colour band.

Every section uses the same container, kicker and hairline system, with one accent colour (carrot). Section order runs from the question, to the shop, to the price, to how, to doubt, to booking.

## What stays the same
Brand colours, Gabarito, Inter and Plex Mono; the Buy dropdown and shared cart; the FAQ content; the credit bar.

## Build order once approved
1. The hero with the live question and match (data from the existing tab data).
2. Main Street.
3. Move prices and the FAQ, and tighten the rest.
4. The share card and screens at 1440 and 375.

One PR.
