# Abuelita's go-live checklist

**Target:** live Friday 11/20 or Saturday 11/21, with one real order placed and seen on David's register before Tristan leaves (he's away 11/23 to 11/29).
**Preview for David:** https://shop.seaofgrass.studio/preview/abuelitas/ (sandbox, "Preview, no real payment").

## 1. Left to build (Claude, by Thursday 11/19)
- [x] Phone pass done (Fable reviewed) and the preview refreshed. Hero is the flat single render (Tristan picked D).
- [x] Checkout fallback: if Square doesn't answer, the pay step shows the error plus a big "Call 720-218-9808" button. Tested at 360/390/1440.
- [ ] **Uptime alert** (Tristan creates the free account, about 5 minutes, at uptimerobot.com):
  - Monitor 1: HTTP(s), `https://shop.seaofgrass.studio/`, every 5 minutes, keyword "Sea of Grass shop server", alert by email + phone app.
  - Monitor 2: HTTP(s), `https://orderabuelitasempanadas.com/`, every 5 minutes, keyword "Abuelita", once the domain is live.
  - Alert when down for 2 checks in a row (avoids one-off blips). If it fires while he's away: the site still shows the call button, so orders can be phoned in.
- [ ] **Vault backup**, after David connects: in hPanel File Manager, download the vault file (the VAULT_PATH setting) to Tristan's computer. It's encrypted; the key stays only in hPanel. Re-download after any reconnect. If it's ever lost, Tristan issues a new connect link and David taps it again: a minute, not lost orders.
- [ ] Production switch on the shop server: SQUARE_ENV=production, plus the production app ID and secret.
  - **Tristan enters these in hPanel himself.** Claude never handles the production secret.
- [x] Live build ready: `python3 clients/abuelitas/build-live.py --hours "..."` makes `clients/abuelitas/live/` with no draft strip and no noindex, the real hours, and checkout on the shop server. It refuses to build without hours. Waiting on David's hours.
- [ ] Host the site at orderabuelitasempanadas.com: a static site on Tristan's Hostinger Business plan, with SSL, and the domain added to the server's allowed origins (already listed).
- [ ] Final test run on 360/390/1440, then **"Merge #223" from Tristan** (Claude merges only on that).

## 1b. Security review (must be fixed before SQUARE_ENV=production)
All are fixed in `clients/abuelitas/server/server.mjs` and tested in `tests/clients/abuelitas-server.test.mjs`.
- [x] **Connect links:**
  - Each link is signed, single-use, expires in 48h, and is issued only by `POST /admin/connect-link` with the admin key.
  - The shop is pinned to the first Square merchant.
  - A different merchant is refused, its key revoked, and the attempt logged, unless the link was issued with `rebind=1`.
  - Every connection change goes to `audit.log` next to the vault, and to the host's error log as `ALERT`.
- [x] **Production checkouts:** preview and localhost origins can't open real checkouts.
- [x] **Checkout rate limit:** 8 per visitor per 10 minutes, 120 per shop per hour.
- [x] **Exact name match only:** unmatched items are listed as missing on `/status` for a person to fix.
- [x] **Vault writes:** written to a temp file then renamed; a vault that can't be read is an error, never treated as empty.
- [x] **Smaller hardening:**
  - `/status` takes the admin key only as a Bearer header, compared in constant time.
  - Logs are cleaned, and `Object.hasOwn` is used everywhere.
  - HSTS, nosniff and `frame-ancestors 'none'` headers are on every response.
  - The vault is sealed with the shop id as associated data.
  - The host's home path is removed from these notes. It is still in old commits of the public repo, which is low risk; history would need rewriting to remove it.
- [ ] **Before go-live:** replace ADMIN_KEY in hPanel with a new 48+ character random value. The current one is 32 characters and has been used in URLs; the new rule asks for at least 24.
- [ ] **Not built: an emailed alert on connection change.** The audit log and the host's error log record it, but nothing emails yet. The uptime monitor can't see it, so for now check `/status` after any connect.

**How Tristan issues David's connect link (production):**
```
curl -X POST -H "Authorization: Bearer <ADMIN_KEY>" "https://shop.seaofgrass.studio/admin/connect-link?shop=abuelitas"
```
It returns a link that works once, within 48 hours. Send that to David.

## 2. Needed from David (ask at the meeting)
- [ ] **Menu confirmed:** names, anything missing or retired, and which items are Saturday-only or morning-only.
- [ ] **Prices in his Square item library.** The site never shows or stores prices; Square does. Each item's name must match the site's menu, which Claude can check after he connects. Sitting with him to enter them is the fastest way.
- [ ] **Hours,** and pickup lead time if "as soon as it's ready" isn't right.
- [ ] **Tap the signed "Connect Square" link** (Tristan issues it after the production switch; it works once, within 48h) and sign in with his own Square account.
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
