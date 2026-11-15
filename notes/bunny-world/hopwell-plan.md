# Hopwell (chiropractor): rework plan. Plan only, nothing built, no credits spent

Tristan via HQ, 2026-11-15: "Hopwell next, the way Long Ears went." Today the page has a drawn hero (an SVG of booking, insurance and intake cards) and no hook. It is generic: visit types, booking, an insurance check, an intake form and hours.

## The hook: "Point to where it hurts"
Every new chiropractic patient's real first question is "can you help with *this*, and what happens if I come in?" So the page leads with a photo of a person's back (seen from behind, no face) with tappable spots on it:

1. **Tap the spot:** neck, base of the skull (headaches), shoulder, between the shoulder blades, low back, hip or sciatica, or "somewhere else".
2. **Two quick chips:** how long (a few days / 2–6 weeks / months) and what makes it worse (sitting, mornings, lifting, sleeping).
3. **The answer card, live:** what we'd look at, in plain words; the visit it fits (new patient exam, 60 min); the **next open time** for that visit (from the demo schedule); your copay if the insurance check was used; and something sensible to try tonight (heat, walk breaks, how to sit). Clearly labelled "not a diagnosis".
4. **A red-flag check:** numbness, weakness, loss of bladder control, after a fall or a car accident, or a fever → the card changes to "Please call your doctor or go to urgent care first", with no booking button. A real clinic needs this, and it makes the demo feel responsible.
5. **"Book Thursday 8:40":** goes to the booking with the visit picked and the spot, duration and triggers already in the intake form, so the patient's first form is half done.

Why it works: it answers the scary question in five seconds, it is specific to the trade, and it hands a warm patient to the booking, as the August Test does for Long Ears' quote.

**Small second hook:** a "same-day openings" line in the announcement bar ("2 openings left today: 3:20 and 4:40"), counting down through the Colorado day, as the other shops' live bits do.

## Sections, in order
1. Announcement bar: same-day openings.
2. Header: wordmark, Where it hurts, Visits, Insurance, Intake; "Book a first visit". On phones: Call, Book.
3. **Point to where it hurts** (the hook leads the page).
4. Visit types with prices and lengths (kept), as a short strip.
5. Your first visit, in four steps, with photos (talk, movement check, adjust only if it helps, a plan).
6. Insurance check (kept) feeding the answer card's copay.
7. Booking (kept), pre-filled from the hook.
8. Intake (kept), pre-filled from the hook.
9. Reviews, hours, map line.

## Look: "Stone & Sage"
References from Refero (no chiropractors on Refero; these are the closest calm, human health brands):
- **Luffu** (luffu.com): stone and sage surfaces, blue-black ink, an editorial serif over warm lifestyle photography. The palette lead.
- **Function Health** (functionhealth.com): fine serif headlines with expressive italics and small mono annotations on cream. The type lead.
- **Biograph** (biograph.com): health as hospitality; warm, cinematic photos and lots of air.
- **Fresha first-visit check** (refero screen 770b0ede): "Is this your first visit?" on the left with a summary card on the right. The answer-card layout.
- **Hers intake questions** (refero screen d1f3c27d): one question, big tappable answers. The chips.

- **Type:** **Albert Sans** (regular, with its italic for the soft word) for headlines, **Figtree** for text and UI, **Geist Mono** for times, prices and labels. No other shop uses these. Replaces Source Serif 4 and Inter.
  - Why not a serif (Tristan, 2026-11-15: unsure about the condensed Instrument Serif): on Refero the field splits. Function, Doctronic and Luffu use serifs or flared type; Biograph, Radial, Hims, Baba and A Better Lou use plain sans at a regular weight. The calm, human ones (Radial, Biograph) use a large, regular-weight sans in sentence case, not a bold one. Albert Sans is that: open, friendly and quiet, suited to a local family clinic rather than a premium lab. Contact sheet: `hopwell-type/heading-fonts-refero.jpg`. Belleza (an Optima-like flared face, the nearest free match to Luffu) was tried and dropped: one weight only, and its italic is faked.
- **Palette:** paper `#F4F2EB`, stone `#E6E3D8`, sage `#CDD3BB`, blue-black `#192830` ink and buttons, apricot `#E8875B` only for the chosen spot and the answer card's label.
- **Shapes:** big soft radii (28px stage, pill chips and buttons), no drawn art, no icons beyond the cart.

Type and look sheet: `hopwell-type/look-desktop.jpg` (from `sheet.html`; the photo slot is a placeholder).

## Photos (replace the drawn hero; no drawn or clipart art anywhere)
Look: a bright, calm Berthoud treatment room, morning window light, linen, wood and plants; honest and warm, 35 mm film grain. **No faces, no text, no brands, no medical gore.** The recurring bunny prop is a small pale ceramic rabbit somewhere in every shot.

1. **The hook photo (4:5, 2k):** an adult seen from behind, sitting on the end of a padded treatment table, wearing a sage tank top, shoulders and neck visible, head turned away and hair covering the face line; plain stone wall; the ceramic rabbit on a shelf. Composed so the spots land on the neck, shoulders, mid-back, low back and hip.
2. **Hero / room (16:9, 2k):** the empty treatment room: a wooden-legged adjusting table with a linen roll, a window with soft morning light, a fiddle-leaf plant, a shelf with a spine model and the ceramic rabbit.
3. **First-visit steps (three square, 1k):** two chairs and a clipboard by the window (the talk); hands only, resting on a shoulder (the check); a foam roller, a band and the rabbit on a mat (the plan).

Credits (GPT Image 2.6 high, as for the other shops):
- 2 at 2k: 2 × 2.75 = **5.5**
- 3 at 1k: 3 × 1.5 = **4.5**
- **Total: 10 credits.** Order: hook photo first (it carries the page), then the room, then the three. Each is checked before the next, with no re-rolls without asking.

## A real business it could pitch to
A Northern Colorado family chiropractic or physical-therapy clinic (Berthoud, Loveland, Longmont) that takes new patients online. As with the barbershop and farm demos, it stays a bunny clinic and copies no one's name, logo, photos or copy. Dr. Wren and Dr. Ash Hopwell stay as the made-up doctors.
