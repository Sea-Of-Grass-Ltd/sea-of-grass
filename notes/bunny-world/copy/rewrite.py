# Sales copy rewrite, 2026-11-16 (Tristan: "it should be obvious that you would talk to an actual person").
# Each entry: (file, block, before, after). Run from the repo root; it asserts every "before" is found exactly once,
# applies it, and writes before-after.md beside this script.
import html, os, re

E = []
def r(f, block, a, b): E.append((f, block, a, b))

L = 'bunnyworld/index.html'
r(L, 'Hero headline', '<h1>Hop in.<br>Find yours.</h1>', '<h1>Find a shop<br>like yours.</h1>')
r(L, 'Hero line', '<p class="lede">Nine made-up shops, each a real, working website in the look of its trade.</p>',
  '<p class="lede">We built nine made-up shops on one street, and each one is a real, working website in the look of its trade.</p>')
r(L, 'Hero call link', 'Or book a free 20-minute look &rarr;</a></div></div>', 'Or book a free 20-minute call with Tristan or Bryce &rarr;</a></div></div>')
r(L, 'Switching button', '<span>Your domain, email and Google listing stay put. Here&rsquo;s how &rarr;</span>',
  '<span>Your domain, email and Google listing stay where they are. Here&rsquo;s how we move you over &rarr;</span>')
r(L, 'FAQ: domain', '<p>Yes. Your domain stays in your name. We only point the website part of it at the new site, so your email keeps working. Your Google Business Profile stays yours; we can update its website link and hours for you.</p>',
  '<p>Yes, your domain stays in your name. We only point the website part of it at the new site, so your email keeps working. Your Google Business Profile stays yours too, and we can update its website link and hours for you.</p>')
r(L, 'FAQ: changes later', '<p>The care plan, from $50 a month, covers hosting, security and the small changes: new hours, a new menu, a sale. You text one person. Bigger changes get a fixed price first.</p>',
  '<p>The care plan, from $50 a month, covers hosting, security and the small changes like new hours, a new menu or a sale. You text Tristan or Bryce and we make the change. If you want something bigger, we&rsquo;ll give you a fixed price for it first.</p>')
r(L, 'FAQ: cost', '<p>A fixed price, in writing, before we start. <a href="#prices">Fixes from $250, starter sites $1,200 (or $100 a month for 12 months), small business sites from $2,000, care from $50 a month.</a> No hourly surprises.</p>',
  '<p>We give you a fixed price in writing before we start. <a href="#prices">Fixes start at $250, a starter site is $1,200 (or $100 a month for 12 months), small business sites start at $2,000 and care starts at $50 a month.</a> You won&rsquo;t get an hourly bill you weren&rsquo;t expecting.</p>')
r(L, 'FAQ: learning', '<p>No. Day-to-day changes are a text to us. If you would rather change menus or hours yourself, we can set that up and show you how, once.</p>',
  '<p>No, you don&rsquo;t. Day-to-day changes are a text to us. If you would rather change your menu or hours yourself, we can set that up and show you how.</p>')
r(L, 'FAQ: tools', '<p>Usually, yes: orders to your till, bookings to your calendar, forms to your phone. We work with what you already use. If a tool cannot connect, we tell you before you pay, not after.</p>',
  '<p>Usually we can. We send orders to your till, bookings to your calendar and forms to your phone, using the tools you already have. If a tool can&rsquo;t connect, we&rsquo;ll tell you before you pay anything.</p>')
r(L, 'Main Street heading', '<h2>Pick your trade. Its site opens right here.</h2>', '<h2>Pick your trade, and its site opens right here for you to try.</h2>')
r(L, 'How it works: Try', '<span>Open the shop closest to yours on your phone. Note what you would keep and change.</span>',
  '<span>Pick the shop on Main Street that&rsquo;s closest to yours and look around on your phone. Make a note of what you&rsquo;d keep and what you&rsquo;d change. That list is the best way to start our call.</span>')
r(L, 'How it works: Talk', '<span>Twenty minutes on a call. You leave with a fixed price and a date, in writing.</span>',
  '<span>Then we&rsquo;ll talk for twenty minutes, with Tristan or Bryce, not a form or a chatbot. By the end you&rsquo;ll know the price and the date, and we&rsquo;ll send both to you in writing.</span>')
r(L, 'How it works: Build', '<span>Drafts you open on your phone, changed until they are right. Nothing goes live until you say yes.</span>',
  '<span>We build it and send you drafts to open on your phone. Tell us what&rsquo;s off and we&rsquo;ll fix it until it&rsquo;s right. Nothing goes live until you&rsquo;re happy with it.</span>')
r(L, 'Footer', 'Every shop is made up. No real businesses, people or orders.', 'Every shop here is made up, so there are no real businesses, people or orders behind them.')

W = 'preview/services/websites/index.html'
r(W, 'Hero line', '<p class="lede">Broken, slow, out of date or wrong on phones, and nobody looks after it? Buy the fix here, no sales call, and we ring you within one business day.</p>',
  '<p class="lede">Is your site broken, slow, out of date or hard to use on a phone, with nobody looking after it? You can buy the fix right here without a sales call, and we&rsquo;ll ring you within one business day.</p>')
r(W, 'Hero facts', '<li><b>Days, not months</b>Most fixes in a few days</li><li><b>Flat fee</b>Agreed before we start</li><li><b>Yours</b>Files, domain and logins</li>',
  '<li><b>Quick</b>Most fixes take a few days</li><li><b>Flat fee</b>We agree it before we start</li><li><b>Yours</b>You keep the files, domain and logins</li>')
r(W, 'Starter site', '<p><b>Just need one good page?</b> A starter site: one page in a ready Bunny World look, with your hours, menu, photos, map and a link to the booking tool you already use. Or pay $100 a month, billed monthly, 12-month minimum ($1,200 total).</p>',
  '<p><b>Do you just need one good page?</b> A starter site gives you one page in a ready Bunny World look, with your hours, menu, photos, map and a link to the booking tool you already use. You can also pay $100 a month, billed monthly, with a 12-month minimum ($1,200 total).</p>')
r(W, 'Full site', '<p><b>A whole new site?</b> Three to five fast pages in your own look, forms that come to you. Start with a Kickoff, or talk it through first.</p>',
  '<p><b>Do you need a whole new site?</b> We build three to five fast pages in your own look, with forms that come straight to you. You can start with a Kickoff, or talk it through with us first.</p>')
r(W, 'Who it’s for', '<p>If you&rsquo;ve said one of these, this is for you. Each one is a single fix.</p>',
  '<p>If you&rsquo;ve said one of these, this page is for you, and each one is a single fix.</p>')
r(W, 'Fix: wrong hours', '<span>Fix</span>Changed this week. On a care plan, you text us next time.</div>',
  '<span>Fix</span>We&rsquo;ll change them this week, and on a care plan you just text us next time.</div>')
r(W, 'Fix: phones', '<span>Fix</span>Rebuilt to work on phones first, checked on real ones.</div>',
  '<span>Fix</span>We rebuild it to work on phones first and check it on real ones.</div>')
r(W, 'Care: builder moved away', '<span>Care plan</span>One person to text. We host it, keep it safe and change it for you.</div>',
  '<span>Care plan</span>You&rsquo;ll have one person to text, and we host it, keep it safe and change it for you.</div>')
r(W, 'Live examples', '<p>Working sites from Bunny World, our street of made-up shops. Running live here, on a computer and a phone.</p>',
  '<p>These are working sites from Bunny World, our street of made-up shops, running live here on a computer and a phone.</p>')
r(W, 'Nine shops', '<p class="show-more">Nine shops in all. <a', '<p class="show-more">There are nine shops in all. <a')
r(W, 'Demo caption', '<span>Demo site. No real business, orders or people.</span>', '<span>This is a demo site, with no real business, orders or people behind it.</span>')
r(W, 'Step: Look', '<p>Send your site; we send back three things worth fixing, free.</p>', '<p>Send us your site and we&rsquo;ll send back three things worth fixing, for free.</p>')
r(W, 'Step: Plan', '<b>Plan</b><p>A fixed price and a date, in writing.</p>', '<b>Plan</b><p>We give you a fixed price and a date, in writing.</p>')
r(W, 'Step: Make', '<p>Drafts you open on your phone, changed until they&rsquo;re right.</p>', '<p>We send drafts to open on your phone and change them until they&rsquo;re right.</p>')
r(W, 'Step: Care', '<p>Hosting, security and small changes, looked after.</p>', '<p>We look after the hosting, the security and the small changes.</p>')
r(W, 'Questions intro', '<p>Anything else? <a href="mailto:hello@seaofgrass.studio">Email us</a> or call 303.775.1333.</p>',
  '<p>Is there anything else you want to know? <a href="mailto:hello@seaofgrass.studio">Email us</a> or call 303.775.1333.</p>')
r(W, 'FAQ: cancel', '<p>Yes, any month.</p>', '<p>Yes, you can cancel it in any month.</p>')
r(W, 'FAQ: move site', '<p>No. We can fix it where it is; hosting with us is only part of the care plan.</p>', '<p>No, we can fix it where it is. Hosting with us is only part of the care plan.</p>')
r(W, 'FAQ: owner', '<p>You do: the files, the domain and the logins.</p>', '<p>You own the files, the domain and the logins.</p>')
r(W, 'Closing band', '<p>Fifteen or thirty minutes. Tell us what you have; you leave with a next step and a price.</p>',
  '<p>Book fifteen or thirty minutes with Tristan or Bryce. Tell us what you have, and you&rsquo;ll leave with a next step and a price.</p>')

H = 'index.html'
r(H, 'Websites card', '<p>Fixes, new sites and hosting.</p>', '<p>We fix sites, build new ones and host them.</p>')
r(H, 'Websites card: care tier', '<span>Hosting, security and small changes, looked after.</span></span></p><p class="cb-note">',
  '<span>We look after the hosting, the security and the small changes.</span></span></p><p class="cb-note">')
r(H, 'Websites card: note', '<p class="cb-note">Starter sites $1,200, or $100 a month billed monthly for 12 months. New sites from $2,000.</p>',
  '<p class="cb-note">Starter sites are $1,200, or $100 a month for 12 months, and new sites start at $2,000.</p>')
r(H, 'Creative tech card', '<p>What a template can&rsquo;t do.</p>', '<p>We make the things a template can&rsquo;t do.</p>')
r(H, 'Mau case card', '<span class="cb-line">Coming soon.</span>', '<span class="cb-line">The case study is coming soon.</span>')
r(H, 'Step: Look', '<span>Send what you have. We send back three things worth fixing, free.</span>', '<span>Send us what you have, and we&rsquo;ll send back three things worth fixing, for free.</span>')
r(H, 'Step: Plan', '<b>Plan</b><span>A fixed price and a date, in writing.</span>', '<b>Plan</b><span>We give you a fixed price and a date, in writing.</span>')
r(H, 'Step: Make', '<span>Drafts you open on your phone, changed until they&rsquo;re right.</span>', '<span>We send drafts to open on your phone and change them until they&rsquo;re right.</span>')
r(H, 'Step: Care', '<span>Hosting, security and small changes after launch.</span>', '<span>After launch, we look after the hosting, the security and the small changes.</span>')
r(H, 'Closing band', '<p>Fifteen or thirty minutes. Tell us what you have; you leave with a next step and a price range.</p>',
  '<p>Book fifteen or thirty minutes with Tristan or Bryce. Tell us what you have, and you&rsquo;ll leave with a next step and a price range.</p>')
r(H, 'Thesis pull quote (kept, marked as a quote)', '<blockquote><span>Plain used to be the cheap option.</span>', '<blockquote data-voice="quote"><span>Plain used to be the cheap option.</span>')

txt = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<br\s*/?>', ' / ', re.sub(r'<(?!br)[^>]+>', '', s)))).strip()
files = {}
for f, block, a, b in E:
    s = files.setdefault(f, open(f).read())
    assert s.count(a) == 1, (f, block, s.count(a))
    files[f] = s.replace(a, b)
for f, s in files.items(): open(f, 'w').write(s)
names = {L: 'Bunny World landing', W: 'Websites page', H: 'Sea of Grass home page'}
out = ['# Sales copy: before and after (2026-11-16)', '']
for f in (L, W, H):
    out.append(f'## {names[f]}'); out.append('')
    for g, block, a, b in E:
        if g != f: continue
        out += [f'**{block}**', f'- Before: {txt(a)}', f'- After: {txt(b)}', '']
open(os.path.join(os.path.dirname(__file__), 'before-after.md'), 'w').write('\n'.join(out))
print(len(E), 'blocks rewritten')
