# Abuelita's go-live checklist

**Target:** live Friday 11/20 or Saturday 11/21, with one real order placed and seen on David's register before Tristan leaves (he's away 11/23 to 11/29).
**Preview for David:** https://shop.seaofgrass.studio/preview/abuelitas/ (sandbox, "Preview, no real payment").

## 1. Left to build (Claude, by Thursday 11/19)
- [ ] Finish the phone pass (Fable review running), then refresh the preview.
- [ ] Checkout fallback: if Square doesn't answer, show a big "Call 720-218-9808 to order" button next to the error, not just text. The call button is already in the hero and the visit section.
- [ ] Downtime alert for shop.seaofgrass.studio: an external uptime check every 5 minutes on `/` and `/checkout` (a free UptimeRobot-style monitor) emailing Tristan. **Tristan creates the account**, since it's his sign-up; Claude gives him the exact settings.
- [ ] Backup of the encrypted key file (`/home/u853137291/sog-shop-vault/vault.json`) once David connects: a copy outside the server, plus a written note of where the VAULT_KEY lives (hPanel only). If either is lost, David just taps Connect Square again, so a lost backup costs a minute, not orders.
- [ ] Production switch on the shop server: SQUARE_ENV=production, plus the production app ID and secret.
  - **Tristan enters these in hPanel himself.** Claude never handles the production secret.
- [ ] Turn the site live: remove the "draft" strip and `noindex`, point `data-checkout` at the server, add the real hours, and replace the sample prices note.
- [ ] Host the site at orderabuelitasempanadas.com: a static site on Tristan's Hostinger Business plan, with SSL, and the domain added to the server's allowed origins (already listed).
- [ ] Final test run on 360/390/1440, then **"Merge #223" from Tristan** (Claude merges only on that).

## 2. Needed from David (ask at the meeting)
- [ ] **Menu confirmed:** names, anything missing or retired, and which items are Saturday-only or morning-only.
- [ ] **Prices in his Square item library.** The site never shows or stores prices; Square does. Each item's name must match the site's menu, which Claude can check after he connects. Sitting with him to enter them is the fastest way.
- [ ] **Hours,** and pickup lead time if "as soon as it's ready" isn't right.
- [ ] **Tap "Connect Square" on the live link** (Tristan sends it after the production switch) and sign in with his own Square account.
  - This sends no password to us; he approves on Square's own page.
  - His account must be able to take card payments online (online checkout turned on, bank verified).
- [ ] **Domain:** either NameBright login access for Tristan, or David changes the DNS himself to the records Claude provides (an A record plus www).
  - **Risk flag:** DNS can take up to 24–48h to settle. **Do this by Thursday 11/19 to be safe for Saturday.**
- [ ] **Photos:** not blocking. Stand-ins stay marked until we shoot his real food, which can happen after the holiday.

## 3. Tristan must do (logins and verification)
- [ ] **Square Developer, production side:**
  - Add the production redirect URL `https://shop.seaofgrass.studio/connected` on the app's OAuth page (Production tab).
  - Copy the production Application ID and secret into hPanel's environment variables, and redeploy.
- [ ] **hPanel:**
  - Add orderabuelitasempanadas.com as a website.
  - Approve the deploy.
  - Change SQUARE_ENV to `production`.
- [ ] **NameBright:** DNS change, or pass the access to David.
- [ ] **Uptime monitor:** create the free account, with alerts to his email or phone.
- [ ] **Saturday test:** place one real small order himself on the live site, pay with his own card, confirm it shows on David's register, then refund it from David's Square (or let David keep it).
- [ ] **Send the owner text,** draft in `owner-text.md` (Claude never contacts David).

## 4. Does Square production OAuth need more than switching credentials?
Mostly no. What's different from sandbox:
- **Redirect URL:** the production redirect URL has to be registered separately (production and sandbox have their own OAuth settings).
- **No app review:** our scopes (items read, orders, payments write, merchant profile) don't need Square's approval for an app that a seller connects through OAuth. App Marketplace review is only for public listing, which we don't need.
- **David's account:** it must be activated for card processing. A brand-new or unverified account can't create payment links until Square finishes verifying it. **Check this at the meeting.** If it's not verified, it's the one thing that could slip past Saturday.
- **Tokens:** production access tokens last 30 days. The server refreshes them automatically when fewer than 7 days remain, so nothing to do while Tristan is away.

## 5. Could slip past Saturday
1. **David's Square account isn't verified for online payments.** Square's process, not ours. Fallback: the site goes live with the menu and "Call to order" while Square finishes.
2. **DNS isn't changed by Thursday.** Fallback: launch at the server-hosted address and switch the domain once DNS settles.
3. **Prices aren't entered in Square.** Fallback: checkout stays off and the site takes phone orders only.
