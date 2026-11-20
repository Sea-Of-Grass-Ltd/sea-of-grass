/* Sea of Grass shop: the ONE place prices, inclusions and checkout links live.
   EVERYTHING HERE IS A PLACEHOLDER until Tristan and Bryce confirm it. Nothing here takes money.

   mode: 'demo' sends Checkout to the demo page (/preview/shop/checkout/), which takes no payment.
         'live' sends Checkout to the Stripe Payment Link below that matches the cart.
   links: one Stripe Payment Link per product, plus one per combination people can put in the cart
          (a Payment Link carries fixed line items, so "fix + care" needs its own link).
          The key is the product ids in the cart, sorted and joined with "+".
          Set each link's "after payment" page in Stripe to https://seaofgrass.studio/preview/shop/thanks/
   The URLs below are FAKE on purpose (they contain PLACEHOLDER) and go nowhere. */
window.SOG_SHOP = {
  mode: 'demo',
  currency: 'USD',
  thanks: '/preview/shop/thanks/',
  demoCheckout: '/preview/shop/checkout/',
  book: 'https://cal.com/sea-of-grass',
  // Founding five (2026-11-20): the first five shops get the Site Plan at $50 a month (half the usual $100), locked for
  // 24 months, with a free photo shoot and nothing owed if they back out at the hookup. In return: a short case study and
  // permission to show their site and photos on our site. NEVER a review in return: Google bans rewarded reviews.
  // Lower `left` by hand when a shop signs. Never fake it.
  founding: { total: 5, left: 5 },

  products: {
    fix: {
      name: 'Fix one broken thing',
      price: 250, from: true, interval: null, maxQty: 5, pay: 'after', // PLACEHOLDER price
      blurb: 'One thing on your site that is broken, wrong or out of date.',
      lines: ['One broken thing, fixed', 'Done in a few days', 'Flat fee, agreed before we start', 'If it’s bigger than one fix, we say so before any work', 'The $250 comes off a site you start with us within 60 days'] // PLACEHOLDER inclusions
    },
    care: {
      name: 'Care plan',
      price: 50, from: false, interval: 'month', maxQty: 1, pay: 'monthly', // PLACEHOLDER price
      blurb: 'We look after the site so you don’t have to.',
      lines: ['Hosting and security updates', 'Your hours and menu changed when you text us', 'One person to text', 'Cancel any month'] // PLACEHOLDER inclusions
    },
    'site-plan': {
      name: 'Site Plan',
      price: 100, from: false, interval: 'month', term: 12, maxQty: 1, pay: 'plan', // Tristan's main plan, 2026-11-20
      blurb: 'A starter site with Care included: $100 a month, nothing up front, and the site is yours after 12 months.',
      lines: ['A starter site in a Bunny World look, built for you', 'Care included: hosting, security and up to an hour of small changes a month', 'Nothing up front; the first month is due when you approve the first draft', '12-month minimum, then month to month, and the site is yours']
    },
    starter: {
      name: 'Starter site',
      price: 1000, from: false, interval: null, maxQty: 1, pay: 'deposit', // $1,000 once with the first year of care (Tristan, 2026-11-20)
      blurb: 'One page in a ready Bunny World look, with your name, photos and colours.',
      lines: ['One page: hours, menu or services, photos, map, a call button', 'A link button to the booking or ordering tool you already use', 'One round of changes', 'The first year of care included, then $50 a month', 'The $1,000 counts toward a full site if you upgrade within 90 days'] // PLACEHOLDER inclusions
    },
    'starter-monthly': {
      name: 'Starter site, paid monthly',
      price: 100, from: false, interval: 'month', term: 12, maxQty: 1, pay: 'draft-monthly', // PLACEHOLDER price; term = minimum months, then it ends
      blurb: '$100 a month, billed monthly, 12-month minimum ($1,200 total). The same starter site; no interest.',
      lines: ['Billed monthly, never annually up front', '12 payments of $100, then it ends: no auto-renewal', 'The site files are yours after payment 12, or whenever you pay the balance', 'Care ($50 a month) is separate and optional'] // PLACEHOLDER inclusions + terms
    },
    kickoff: {
      name: 'Kickoff',
      price: 250, from: false, interval: null, maxQty: 1, pay: 'now', // PLACEHOLDER price
      blurb: 'The first step of a brand or a full site, credited toward the project.',
      lines: ['A call within one business day', 'The $250 is credited toward your brand or full-site project', 'Full refund if it’s not a fit after the call'] // PLACEHOLDER inclusions + refund terms
    }
  },

  links: {
    'fix':              'https://buy.stripe.com/PLACEHOLDER-fix',
    'care':             'https://buy.stripe.com/PLACEHOLDER-care',
    'kickoff':          'https://buy.stripe.com/PLACEHOLDER-kickoff',
    'care+fix':         'https://buy.stripe.com/PLACEHOLDER-care-fix',
    'care+kickoff':     'https://buy.stripe.com/PLACEHOLDER-care-kickoff',
    'fix+kickoff':      'https://buy.stripe.com/PLACEHOLDER-fix-kickoff',
    'care+fix+kickoff': 'https://buy.stripe.com/PLACEHOLDER-care-fix-kickoff'
  }
};

/* Bunny World: a small business site in the look of one of the nine demo shops.
   ALL PLACEHOLDER (price from the Bunny World price strip, "from $2,500", raised from $2,000 on 2026-11-20), demo mode only.
   No Payment Links yet: in live mode these fall back to the demo checkout until links exist.
   Fix and Care on Bunny World reuse the 'fix' and 'care' products above. */
(function(P){
  var LOOKS = [
    ['bunny-burritos', 'Bunny Burritos', 'restaurant and food truck'],
    ['bunny-auto', 'Bunny Auto', 'auto repair and detailing'],
    ['warren-bakehouse', 'The Warren Bakehouse', 'bakery and café'],
    ['hare-today', 'Hare Today', 'barbershop'],
    ['hop-along', 'Hop Along', 'brewery and taproom'],
    ['cottontail-farm', 'Cottontail Farm', 'farm and seasonal festival'],
    ['burrow-and-bough', 'Burrow & Bough', 'gift shop'],
    ['long-ears', 'Long Ears', 'landscaping and trades'],
    ['hopwell-chiro', 'Hopwell', 'chiropractor and clinic']
  ];
  LOOKS.forEach(function(l){
    P['bw-site-' + l[0]] = {
      name: 'Small business site · ' + l[1] + ' look',
      price: 2500, from: true, interval: null, maxQty: 1, pay: 'deposit', // custom site, from $2,500 (Tristan, 2026-11-20)
      blurb: 'A working site for your ' + l[2] + ', built in the ' + l[1] + ' look and fitted to your business.',
      lines: ['Built in the ' + l[1] + ' look, in your name, photos and colours', 'Booking, orders or forms wired to the tools you use', 'Fixed price in writing before we start', 'Your domain, email and Google listing stay put'], // PLACEHOLDER inclusions
      look: l[0], lookName: l[1]
    };
  });
})(window.SOG_SHOP.products);

/* When each thing is paid for (Tristan's terms, 2026-11-15). Only 'now' is taken at checkout.
   after:         a fix is paid once it's done and the owner has checked it; nothing up front.
   deposit:       sites: nothing to start, 30% once the owner has seen the first draft and wants to go ahead, the rest at launch.
   draft-monthly: the monthly starter: 12 payments billed monthly, the first at the first draft.
   plan:          the Site Plan: billed monthly from the first draft, 12-month minimum, then month to month.
   monthly:       care: billed monthly, cancel any month.
   now:           paid at checkout (the kickoff). */
(function(S){
  var money = function(n){ return '$' + Math.round(n).toLocaleString('en-US'); };
  S.how = function(id){ var p = S.products[id]; return ({after: 'paid when it’s done', deposit: 'paid in two parts', 'draft-monthly': 'billed monthly', plan: 'billed monthly', monthly: 'billed monthly', now: 'paid today'})[p && p.pay] || 'paid once'; };
  S.payNow = function(id, q){ var p = S.products[id]; return p && p.pay === 'now' ? p.price * (q || 1) : 0; };
  S.when = function(id, q){ var p = S.products[id]; if (!p) return ''; q = q || 1;
    var t = p.price * q, from = p.from ? 'from ' : '';
    switch (p.pay) {
      case 'after': return 'Paid after it’s done and you’ve checked it: ' + from + money(t) + '. Nothing up front.';
      case 'deposit': return 'Nothing to start. 30% (' + from + money(t * 0.3) + ') once you’ve seen the first draft and want to go ahead, ' + (p.from ? 'the rest' : money(t * 0.7)) + ' at launch.';
      case 'draft-monthly': return p.term + ' payments of ' + money(p.price) + ', billed monthly. The first is due at the first draft.';
      case 'plan': return money(p.price) + ' a month, billed monthly. Nothing up front: the first month is due when you approve the first draft. ' + p.term + '-month minimum, then month to month.';
      case 'monthly': return money(p.price) + ' a month, billed monthly. Cancel any month.';
      default: return 'Paid today: ' + money(t) + '.';
    }
  };
})(window.SOG_SHOP);
