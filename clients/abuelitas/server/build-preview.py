#!/usr/bin/env python3
"""Copy the Abuelita's draft into server/preview/abuelitas/ for the unlisted preview at
https://shop.seaofgrass.studio/preview/abuelitas/ and mark it clearly as a preview with no real payment.
Run from anywhere: python3 clients/abuelitas/server/build-preview.py"""
import pathlib, shutil
site = pathlib.Path(__file__).resolve().parent.parent
out = site / 'server' / 'preview' / 'abuelitas'
if out.exists(): shutil.rmtree(out)
out.mkdir(parents=True)
for name in ['index.html', 'style.css', 'order.js', 'weave.js', 'frame.js', 'crimp.js', 'favicon.svg']:
    if (site / name).exists(): shutil.copy2(site / name, out / name)
for d in ['photos', 'art']:
    shutil.copytree(site / d, out / d)
html = (out / 'index.html').read_text()
strip = '<p class="draft">'
i = html.index(strip); j = html.index('</p>', i)
html = html[:i] + '<p class="draft preview">Preview for review only &middot; nothing here takes real money: checkout opens Square&rsquo;s test mode with sample prices &middot; photos are stand-ins and hours are still to come' + html[j:]
html = html.replace('<p>You&rsquo;ll see the total and pay on Square, and your order goes straight to the bakery&rsquo;s register.</p>',
                    '<p class="preview-pay"><strong>Preview, no real payment.</strong> This opens Square&rsquo;s test checkout with sample prices; no card is charged and no order reaches the bakery.</p>')
assert 'preview-pay' in html and 'draft preview' in html and 'noindex' in html
html = html.replace('</style>', '</style>') 
html = html.replace('</head>', '<style>.draft.preview{background:#141414;color:#f7efdf;font-weight:600}.preview-pay{background:#fff3cf;border:2px solid #6b2420;border-radius:8px;padding:10px 12px;color:#141414!important}</style>\n</head>', 1)
(out / 'index.html').write_text(html)
print('built', out)
