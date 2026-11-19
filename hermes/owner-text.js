/* Owner text: the follow-up message sent to a shop owner after they say yes.
   Hermes only builds and copies it; the person pastes it into Messages and sends it themselves.
   No real shop's details live here: every name, domain and registrar comes from the log or the form. */
(function () {
  'use strict';
  // Honest owner steps per register (see the POS integration notes): what the owner has to set up on their side.
  const REGISTERS = {
    square: {
      label: 'Square',
      intro: 'Customers can build an order and pay through your Square, so it lands right on your register.',
      need: 'Your prices, put into your Square items, with online payments turned on in Square (I’m happy to sit with you and do it together).',
    },
    shopify: {
      label: 'Shopify',
      intro: 'Customers can shop your products and check out through your Shopify, so orders land with the rest of your sales.',
      need: 'Your products set up in Shopify, with prices, and a few minutes together to add Shopify’s free Headless channel so the site can read them.',
    },
    clover: {
      label: 'Clover',
      intro: 'Online orders can go straight to your Clover, so they print with the rest.',
      need: 'Your items set up in Clover, with prices and any options, and a quick check together that your Clover plan can use apps.',
    },
  };
  const OTHER = { label: '', intro: '', need: 'Your menu or product list, with prices.' };

  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

  function build(f) {
    f = f || {};
    const owner = clean(f.owner), me = clean(f.me) || 'Tristan', shop = clean(f.shop);
    const domain = clean(f.domain), registrar = clean(f.registrar);
    const reg = REGISTERS[clean(f.register).toLowerCase()] || OTHER;
    const hi = owner ? 'Hi ' + owner + ', it’s ' + me + ' from Sea of Grass.' : 'Hi, it’s ' + me + ' from Sea of Grass.';
    const site = shop ? shop + '’s website' : 'your website';
    const opener = [hi, 'Thank you again for saying yes, it means a lot to us.',
      'The first draft of ' + site + ' is ready, and I’d love to show it to you on my phone when you have ten minutes this week.',
      reg.intro].filter(Boolean).join(' ');
    const login = domain
      ? 'The login for ' + domain + (registrar ? ' (it’s with ' + registrar + ')' : '') + ', so I can point it at the new site.'
      : 'The login for your web address, if you have one, so I can point it at the new site.';
    const needs = [reg.need, 'Your opening hours.', 'Twenty minutes one morning so I can take fresh photos.', 'The original file for your logo, if you have one.', login];
    return [
      opener,
      'You’re one of our five founding shops, so your $50 a month is locked for two years, and I’ll photograph your food or shop for free.',
      'To finish it, I just need a few things from you:\n' + needs.map((n, i) => (i + 1) + '. ' + n).join('\n'),
      'For every shop you send our way that signs up, your next month is on us.',
      'When’s a good time for me to stop by?',
    ].join('\n\n');
  }

  window.HermesOwnerText = { build, REGISTERS };
})();
