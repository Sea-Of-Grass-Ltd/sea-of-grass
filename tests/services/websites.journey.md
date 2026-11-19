# Websites page as a Short: the owner's journey (written before the build)

Tristan approved the storyboard on 2026-11-19: "I like the idea, it should give the same informative dopamine experience as scrolling."
Tests in `websites.test.mjs` walk these steps at 360, 390 and 1440 wide.

## Beats (one line each, readable in about two seconds)

1. Your website, fixed and looked after.
2. "The hours are wrong." "It falls apart on a phone." "The builder moved away."
3. Your website, run from the register you already use.
4. Tap sold out. Watch the site change. (live register on Bunny Burritos)
5. Fewer calls asking what's in stock or whether you're open.
6. Nine working shops on one street. (live Bunny World shops, swipe sideways)
7. Hooking up takes two minutes. One click undoes it.
8. Change your mind at the hookup, and you owe nothing.
9. $250 to fix it. $50 a month to look after it. Sites from $1,200. (whole sites from $2,000)
10. Five founding shops: $50 a month, locked for two years. (honest spots count)
11. Talk to Tristan or Bryce. (book, buy by card, read the details)

## Steps

1. **Land.** Beat 1 is on screen, and the top bar has 11 segments with the first one filled.
2. **Move through it every way.** Swipe up and down, tap the right or left side, scroll the wheel, and use the arrow keys, Space and Page Down/Up. Each one moves exactly one beat, and the bar fills to match.
3. **Play with the register.** On beat 4, tapping "Sold out" on the horchata flips the live shop's button, and raising the Big Carrot shows $13.00. Tapping the register never moves the beat.
4. **Play with Bunny World.** Beat 6 holds at least four live shops in a sideways rail. Touching the rail never moves the beat.
5. **See prices and the founding offer.** Beat 9 shows $250, $50 a month, $1,200 and $2,000. Beat 10 shows the honest spots count from `SOG_SHOP.founding` and the two-year lock.
6. **Read the details.** On the end card, "Read the details" opens the full prices (biggest first, with the buy-by-card cards and the founding offer), the hookup explanation and every question. "Buy by card" opens them at the prices.

## Page rules at every width

- Exactly 11 beats, each with exactly one line of 15 words or fewer, and each line fits on the screen.
- Beats that aren't on screen can't be tabbed into.
- No sideways page scroll, no console errors, no CSS gradients, and no oversell words. No free month anywhere.
