// Abuelita's checkout: the one server piece behind "Pay on Square".
// It takes the cart from the page, asks Square for a hosted checkout page holding those items (with
// Square's own prices, from the bakery's catalog), and answers with that page's link. Customers pay on
// Square; card details never reach us. Node 18+, no dependencies: `node server/checkout.mjs`.
//
// Tested in Square's sandbox 2026-11-17: a cart of 2 steak + 1 horchata became a $13 pickup order for "Test Order".
// Production still needs the bakery's own token (via Connect Square) and their item ids.
//
// Settings (server secrets, never in the website code or the repo):
//   SQUARE_TOKEN        the bakery's access token from "Connect Square" (OAuth), revocable by them any time
//   SQUARE_LOCATION_ID  their Old Town Marketplace location
//   SQUARE_CATALOG      JSON map of our item keys to their Square item-variation ids, e.g. {"steak":"ABC123", ...}
//   SITE_ORIGIN         https://orderabuelitasempanadas.com (the only page allowed to call this)
//   SQUARE_ENV          "production" (default) or "sandbox"
//   PORT                defaults to 8787
import http from 'node:http';
import crypto from 'node:crypto';

const env = process.env;
const API = env.SQUARE_ENV === 'sandbox' ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
const CATALOG = JSON.parse(env.SQUARE_CATALOG || '{}');
const ORIGIN = env.SITE_ORIGIN || '';
const PICKUP_MIN = { asap: 20, 30: 30, 60: 60, 120: 120 };

const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': 'content-type', vary: 'origin' });
  res.end(JSON.stringify(body));
};

async function makeLink({ items, pickup, name, phone }) {
  // only items on their menu, sensible amounts, a name and a phone; anything else is refused
  if (!Array.isArray(items) || !items.length || items.length > 40) throw new Error('empty or oversized order');
  const line_items = items.map(({ key, qty }) => {
    const id = CATALOG[key], n = Math.round(+qty);
    if (!id || !(n >= 1 && n <= 99)) throw new Error('unknown item ' + key);
    return { catalog_object_id: id, quantity: String(n) };
  });
  name = String(name || '').trim().slice(0, 80);
  const digits = String(phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (!name || digits.length !== 10) throw new Error('name and a 10-digit phone are needed');
  const mins = PICKUP_MIN[pickup] ?? 20;

  const r = await fetch(API + '/v2/online-checkout/payment-links', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.SQUARE_TOKEN, 'content-type': 'application/json', 'square-version': '2024-10-17' },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      order: {
        location_id: env.SQUARE_LOCATION_ID,
        line_items,
        fulfillments: [{
          type: 'PICKUP', state: 'PROPOSED',
          pickup_details: {
            recipient: { display_name: name, phone_number: '+1' + digits },
            schedule_type: pickup === 'asap' ? 'ASAP' : 'SCHEDULED',
            pickup_at: new Date(Date.now() + mins * 60000).toISOString(),
            note: 'Ordered on the website',
          },
        }],
      },
      checkout_options: { redirect_url: ORIGIN + '/?ordered=1', ask_for_shipping_address: false },
      pre_populated_data: { buyer_phone_number: '+1' + digits },
    }),
  });
  const data = await r.json();
  if (!r.ok || !data.payment_link?.url) throw new Error('square: ' + JSON.stringify(data.errors || data).slice(0, 300));
  return data.payment_link.url;
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (ORIGIN && req.headers.origin && req.headers.origin !== ORIGIN) return send(res, 403, { error: 'wrong site' });
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 10000) return send(res, 413, { error: 'too big' }); }
  try { send(res, 200, { url: await makeLink(JSON.parse(body)) }); }
  catch (e) { console.error(e.message); send(res, 400, { error: 'could not start checkout' }); }
}).listen(+env.PORT || 8787);
