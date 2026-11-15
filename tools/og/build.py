#!/usr/bin/env python3
"""Build the 1200x630 share-preview cards in preview/assets/og/.

Each card is tools/og/card.html (Dew) with the page's own capture on the right.
Needs: the site served at http://127.0.0.1:8765 from the repo root, page captures (1440x900 PNG)
in tools/og/cap/<name>.png (that folder is not committed), Google Chrome, and Pillow.
Run:  python3 tools/og/build.py            (all cards)
      python3 tools/og/build.py websites   (some cards)
"""
import subprocess, sys, time, os, urllib.parse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'preview/assets/og'
TMP = ROOT / 'tools/og/cap/_render'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# name: (kicker, title with *accent*, line)
CARDS = {
  'home':        ('Design and technology studio', 'Design and technology for the *Front Range*.', 'Websites, branding and creative tech, made in Berthoud, Colorado.'),
  'websites':    ('Websites and hosting', 'Your website, *fixed* and looked after.', 'Fixes from $250 and care plans from $50 a month. Buy without a call.'),
  'brand':       ('Brand and identity', 'One look for the *whole* business.', 'Sign, menu, site and cards that match. Start with a Kickoff.'),
  'apps':        ('App development', 'Apps for a *real* job.', 'When a spreadsheet or paper process costs you hours each week.'),
  'characters':  ('3D characters and animation', 'A mascot that *moves*.', 'Characters built and animated for you, not a stock clip.'),
  'illustration':('Character and illustration', 'One cast, sticker to *3D*.', 'Characters drawn to work everywhere your business shows up.'),
  'live-visuals':('Live visuals', 'A show that *reacts* to the room.', 'Live visuals for events, venues and music, played by a person.'),
  'mau':         ('Case study · Branding', 'Mau’s *Catnip* Soda', 'A branding case study from Sea of Grass. Coming soon.'),
  'bunny-world': ('Bunny World · web demos', 'Try a website for *your* kind of business.', 'Nine made-up shops on one street, each a working site.'),
  'talaria':     ('Talaria', 'The studio’s *task* app.', 'A desktop task manager for macOS and Linux.'),
  'bw-bunny-burritos':  ('Bunny World · demo site', 'Bunny *Burritos*', 'A restaurant site: menu filters, pickup ordering, live hours.'),
  'bw-bunny-auto':      ('Bunny World · demo site', 'Bunny *Auto*', 'An auto repair site: service prices, an estimate tool, booking.'),
  'bw-warren-bakehouse':('Bunny World · demo site', 'The Warren *Bakehouse*', 'A bakery site: live bread counts, pickup holds, custom cakes.'),
  'bw-hare-today':      ('Bunny World · demo site', 'Hare Today *Barbers*', 'A barbershop site: walk-in wait times and booking by barber.'),
  'bw-hop-along':       ('Bunny World · demo site', 'Hop Along *Taproom*', 'A taproom site: a live tap list, events and party requests.'),
  'bw-cottontail-farm': ('Bunny World · demo site', 'Cottontail *Farm*', 'A farm festival site: seasonal pages, timed tickets, a farm map.'),
  'bw-burrow-and-bough':('Bunny World · demo site', 'Burrow & *Bough*', 'A gift shop site: a three-tap gift finder, pickup or shipping, gift wrap.'),
  'bw-long-ears':       ('Bunny World · demo site', 'Long Ears *Landscaping*', 'A landscaping site: the August Test, turf vs water-wise, blowout booking.'),
  'bw-hopwell-chiro':   ('Bunny World · demo site', 'Hopwell *Chiropractic*', 'A clinic site: point to where it hurts, a live insurance check, booking.'),
}

def render(name):
    k, t, d = CARDS[name]
    q = urllib.parse.urlencode({'k': k, 't': t, 'd': d, 'img': f'/tools/og/cap/{name}.png'})
    png = TMP / f'{name}.png'
    png.unlink(missing_ok=True)
    prof = TMP / 'prof'
    p = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                          '--window-size=1200,630', '--timeout=4000', f'--user-data-dir={prof}', f'--screenshot={png}',
                          f'http://127.0.0.1:8765/tools/og/card.html?{q}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        if png.exists() and png.stat().st_size: break
        time.sleep(.5)
    time.sleep(.5); p.kill()
    Image.open(png).convert('RGB').resize((1200, 630)).save(OUT / f'{name}.jpg', quality=86, optimize=True, progressive=True)
    print('built', name)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True); TMP.mkdir(parents=True, exist_ok=True)
    for n in (sys.argv[1:] or CARDS):
        render(n)
