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

  products: {
    fix: {
      name: 'Fix one broken thing',
      price: 250, from: true, interval: null, maxQty: 5,          // PLACEHOLDER price
      blurb: 'One thing on your site that is broken, wrong or out of date.',
      lines: ['One broken thing, fixed', 'Done in a few days', 'Flat fee, agreed before we start', 'Bigger than one fix? We say so before any work'] // PLACEHOLDER inclusions
    },
    care: {
      name: 'Care plan',
      price: 50, from: false, interval: 'month', maxQty: 1,          // PLACEHOLDER price
      blurb: 'We look after the site so you don’t have to.',
      lines: ['Hosting and security updates', 'Your hours and menu changed when you text us', 'One person to text', 'Cancel any month'] // PLACEHOLDER inclusions
    },
    kickoff: {
      name: 'Kickoff',
      price: 250, from: false, interval: null, maxQty: 1,            // PLACEHOLDER price
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
