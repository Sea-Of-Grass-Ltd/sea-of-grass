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

/* Bunny World: a small business site in the look of one of the nine demo shops.
   ALL PLACEHOLDER (price from the Bunny World price strip, "from $2,000"), demo mode only.
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
      price: 2000, from: true, interval: null, maxQty: 1,            // PLACEHOLDER price
      blurb: 'A working site for your ' + l[2] + ', built in the ' + l[1] + ' look and fitted to your business.',
      lines: ['Built in the ' + l[1] + ' look, in your name, photos and colours', 'Booking, orders or forms wired to the tools you use', 'Fixed price in writing before we start', 'Your domain, email and Google listing stay put'], // PLACEHOLDER inclusions
      look: l[0], lookName: l[1]
    };
  });
})(window.SOG_SHOP.products);
