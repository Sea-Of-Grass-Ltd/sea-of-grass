#!/usr/bin/env python3
"""Build the live Abuelita's site into clients/abuelitas/live/ for orderabuelitasempanadas.com.
  python3 clients/abuelitas/build-live.py --hours "Tue–Sat 9am–6pm · Sun 9am–3pm"
Removes the draft strip and noindex, puts in the real hours, and keeps checkout pointed at the shop server.
Refuses to build without hours, so a placeholder can never go live."""
import argparse, html, pathlib, shutil, sys
ap = argparse.ArgumentParser(); ap.add_argument('--hours', required=True); a = ap.parse_args()
if len(a.hours.strip()) < 5: sys.exit('hours look empty')
site = pathlib.Path(__file__).resolve().parent
out = site / 'live'
if out.exists(): shutil.rmtree(out)
out.mkdir()
for name in ['index.html', 'style.css', 'order.js', 'weave.js', 'frame.js', 'crimp.js', 'favicon.svg']:
    if (site / name).exists(): shutil.copy2(site / name, out / name)
for d in ['photos', 'art']: shutil.copytree(site / d, out / d)
h = (out / 'index.html').read_text()
i = h.index('<p class="draft">'); j = h.index('</p>', i) + 4
h = h[:i] + h[j:]
h = h.replace('<meta name="robots" content="noindex">\n', '').replace('<meta name="robots" content="noindex">', '')
old = '<p class="hours" data-hours data-sample="true">Opening hours go here as soon as the bakery confirms them.</p>'
assert old in h, 'hours placeholder not found'
h = h.replace(old, '<p class="hours" data-hours>' + html.escape(a.hours.strip()) + '</p>')
assert 'noindex' not in h and 'class="draft"' not in h and 'data-sample' not in h
assert 'data-checkout="https://shop.seaofgrass.studio/checkout?shop=abuelitas"' in h
(out / 'index.html').write_text(h)
print('built', out)
