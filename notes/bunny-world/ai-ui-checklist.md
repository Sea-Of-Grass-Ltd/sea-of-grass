# AI-made UI: common errors to check for

Run this on every page before it's shown. Each item is a yes/no check, at 360, 390 and 1440 wide, in light and dark where the page has both.

## Duplication
- [ ] The same action appears more than once (two Book buttons in one view, a Call button repeated under a phone link).
- [ ] Two blocks do the same job (two schedulers, two price tables, two "about" sections).
- [ ] The same link appears in both the header and the footer when one would do.

## Copy that doesn't match the page
- [ ] Copy counts things wrongly ("two quick questions" over three questions; "nine shops" with eight showing).
- [ ] Titles in one set use mixed forms (one word, then full sentences; some end in "?" and some don't).
- [ ] Placeholder or invented-sounding text left in (fake "updated 2 min ago" tickers, lorem ipsum, "John Doe").
- [ ] Buttons whose label doesn't say what happens ("Submit", "Click here").

## Effects done slightly wrong
- [ ] Shadows or glows that don't follow the shape (square halos on rounded pills, light from two directions).
- [ ] Gradients or blurs where the design is meant to be flat.
- [ ] An accent colour used once and nowhere else in the palette.
- [ ] Animations that start hidden (opacity 0) and leave blank space in screenshots.
- [ ] Decorative dots, sparkles or "status lights" that mean nothing.

## Layout breakage
- [ ] Overlapping elements (tap targets touching, labels covering markers, text running under images).
- [ ] Sideways scroll on a phone.
- [ ] Headings whose descenders hit the line below.
- [ ] Lone items stranded in a row, or a big empty block pushing content to one corner.
- [ ] Tap targets smaller than 40px, or closer than 8px to each other.
- [ ] Inputs under 16px font on phones (iOS zooms in).

## Things that look built but don't work
- [ ] Links that go nowhere (#) or to the wrong page.
- [ ] Forms that lose their answers or skip a step.
- [ ] Filters, tabs or toggles that don't change anything.
- [ ] Stale data shown as live (hours, "open now", stock).
- [ ] Console errors or failed loads (404 images, fonts).

## Consistency across the site
- [ ] Prices match everywhere they appear.
- [ ] Logo, name and spelling are the same on every page and preview card.
- [ ] Link previews (og:image) show the current page.

## Found in the 2026-11-15 audit (added)
- [ ] Footer nav repeating the header nav link for link (Hop Along), or the demo strip's "Bunny World" link repeated as "Back to Bunny World" in the footer band (all nine shops).
- [ ] Step-form titles that mix commands with questions ("Pick a time", "Your name" among "Which day?"). Every step title should be a question.
- [ ] Frosted-glass sticky navs (backdrop blur) and dark gradient scrims over hero photos. Use a flat bar and a flat tint.
- [ ] A link pulled up into the row above it with a negative margin, so its tap area overlaps a tab (landing "Open the full site").
- [ ] Wordmark logos and "Bag (0)"/"Hold (0)" pills drawn at 22 to 32px tall. They look fine but are hard to tap.
- [ ] Map pins whose tap areas run into each other at 360 wide.
- [ ] Floating buttons (fixed "Book now" bubbles) covering the content on phones.
- [ ] Focus rings drawn as an outline a few px outside the field's border: reads as a doubled, lopsided ring. Use one ring that follows the corners.
- [ ] Browser-default checkboxes on a styled page, or boxes under 24px.
- [ ] A date of birth turned into a "next 14 days" picker. Birthdays need a plain date field.
- [ ] Fields that fit at 1x but not on a real 3x phone. Date inputs size wider at 3x and get clipped. Test phones at 3x.

## What the test suite checks automatically
`cd tests && npm install && npm test` runs `tests/bunnyworld/audit.test.mjs` (every page × 360/390/1440) and the per-shop journey tests.
- **Automated:**
  - Duplicate actions in one view; two schedulers; the same link in the header and footer.
  - Counts in copy (questions, shops, steps); mixed title forms; placeholder text and fake tickers; vague button labels.
  - Blurred shadows (box and text, pseudo-elements included); soft gradients (hard-stop bands are allowed); blur filters; elements left at opacity 0.
  - Overlapping tap targets; sideways scroll; targets under 40px or closer than 8px on phones (WCAG-style: spacing only matters for small targets); floating fixed elements over content on phones; inputs under 16px on phones; form fields and labels running past their box (phones at 3x, every step opened); stacked focus rings; default or under-24px checkboxes.
  - Links to # or to missing anchors and pages; toggles, tabs and chips that change nothing; console errors and failed local loads; a missing og:image file.
- **Still by eye:** descenders hitting the next line, stranded items or empty blocks, accent colours used once, meaningless status lights, stale "live" data, prices matching across pages, and whether a preview card shows the current page.
