"""Hare Today mark: geometry sheet (construction overlay) and kit sheet. Usage: python3 build_sheets.py OUTDIR"""
import sys, os, math
from shapely import affinity
from shapely.geometry import Point
from ht_geom import mark, d_of, LEAN
OUT = sys.argv[1]
INK, PAPER, RED, GREY = '#0d0d0d', '#f4f3f0', '#e2321b', '#8a8a8a'
FONT = "@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&amp;family=IBM+Plex+Mono:wght@500&amp;display=swap');"
mono = "font-family:'IBM Plex Mono',monospace;font-weight:500"
disp = "font-family:'Big Shoulders Display',Impact,sans-serif;font-weight:900"

# ---------------- geometry sheet ----------------
m = 40.0
g, piv, c = mark(m)
W, H = 2000, 1250
ox, oy = 520, 655
P = lambda p: (p[0] + ox, p[1] + oy)
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><style>{FONT}</style><rect width="{W}" height="{H}" fill="{INK}"/>']
a = o.append
cs = f'fill="none" stroke="{PAPER}" stroke-width="1.6" opacity=".8"'
dash = f'fill="none" stroke="{PAPER}" stroke-width="1" stroke-dasharray="6 6" opacity=".35"'
# half-module grid
for k in range(-14, 15):
    x = ox + k*m/2; a(f'<line x1="{x:.1f}" y1="{oy-8*m:.1f}" x2="{x:.1f}" y2="{oy+7*m:.1f}" {dash if k%2==0 else dash.replace(".35", ".12")}/>')
for k in range(-16, 15):
    y = oy + k*m/2; a(f'<line x1="{ox-7*m:.1f}" y1="{y:.1f}" x2="{ox+7*m:.1f}" y2="{y:.1f}" {dash if k%2==0 else dash.replace(".35", ".12")}/>')
a(f'<path fill="#3a3a3a" fill-rule="evenodd" d="{d_of(g, P)}"/>')
a(f'<path fill="{RED}" opacity=".9" d="{d_of(piv, P)}"/>')
# the front blade's two lens circles (radius 14m), clipped to the sheet
R, d, h = c['R'], c['d'], c['h']
a(f'<clipPath id="cl"><rect x="{ox-7*m}" y="{oy-8*m}" width="{14*m}" height="{15*m}"/></clipPath><g clip-path="url(#cl)">')
for sd in (-1, 1):
    ctr = affinity.rotate(Point(sd*d/2, -h + 1.2*m), -LEAN, origin=(0, 0))
    X, Y = P((ctr.x, ctr.y)); a(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{R:.1f}" {cs}/>')
a('</g>')
# lean axes: the centre line turned by the same rotation as each blade
for ang in (LEAN, -LEAN):
    e = affinity.rotate(Point(0, -7.8*m), ang, origin=(0, 0)); x2, y2 = P((e.x, e.y))
    a(f'<line x1="{ox}" y1="{oy}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{RED}" stroke-width="1.4" stroke-dasharray="10 6"/>')
a(f'<line x1="{ox}" y1="{oy-8*m}" x2="{ox}" y2="{oy+7*m}" stroke="{PAPER}" stroke-width="1" opacity=".5"/>')
# rings
for sd in (-1, 1):
    X, Y = P((sd*c['cx'], c['cy']))
    a(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{c["ro"]:.1f}" {cs}/><circle cx="{X:.1f}" cy="{Y:.1f}" r="{c["ri"]:.1f}" {cs}/><circle cx="{X:.1f}" cy="{Y:.1f}" r="4" fill="{PAPER}"/>')
    a(f'<line x1="{ox}" y1="{oy}" x2="{X:.1f}" y2="{Y:.1f}" {cs}/>')
a(f'<circle cx="{ox}" cy="{oy}" r="{0.85*m + m/3:.1f}" {cs}/><circle cx="{ox}" cy="{oy}" r="5" fill="{PAPER}"/>')
# module key
a(f'<rect x="{ox-6.5*m}" y="{oy+6.2*m}" width="{m/2}" height="{m/2}" fill="{RED}"/><text x="{ox-5.8*m}" y="{oy+6.6*m}" fill="{PAPER}" style="{mono}" font-size="17">m = ring stroke</text>')
# notes column
tx = 1120
def T(y, t, size=20, fill=PAPER, style=mono): a(f'<text x="{tx}" y="{y}" fill="{fill}" style="{style}" font-size="{size}">{t}</text>')
T(150, 'HARE TODAY · MARK · GEOMETRY', 16, GREY)
T(232, 'SHEARS, STOOD UP,', 76, PAPER, disp); T(312, 'ARE A HARE.', 76, PAPER, disp)
lines = [('Ears', 'two blades: lenses cut from circles of r 14m,'), ('', 'centres 26.7m apart, 1.3m wide, 8.4m long'),
         ('Lean', f'each blade leans {LEAN:.0f}° off the centre line'), ('Cross', 'front blade cut free of the back one by m/3'),
         ('Eyes', 'finger rings: r 2m outside, r 1m inside'), ('', 'centres ±2.35m across, 3.6m below the pivot'),
         ('Nose', 'pivot screw r 0.85m, the one red, ringed by m/3'), ('Joins', 'rings and shanks share one fillet, m/4;'), ('', 'the blades stay sharp, like steel'),
         ('Grid', 'half-module; centre line through the pivot')]
y = 400
for k, v in lines:
    if k: a(f'<text x="{tx}" y="{y}" fill="{RED}" style="{mono}" font-size="18">{k.upper()}</text>')
    a(f'<text x="{tx+110}" y="{y}" fill="{PAPER}" style="{mono}" font-size="18">{v}</text>'); y += 40
T(y + 40, 'Ink + one accent (signal red). Nothing freehand: every curve is from the radius set.', 15, GREY)
a('</svg>')
open(os.path.join(OUT, 'hare-today-geometry.svg'), 'w').write(''.join(o))

# ---------------- kit sheet ----------------
def tile(fill, red, mm=20.0):
    g, piv, _ = mark(mm); b = g.union(piv).bounds
    return b, f'<path fill="{fill}" fill-rule="evenodd" d="{d_of(g)}"/><path fill="{red}" d="{d_of(piv)}"/>'
b, body_ink = tile(INK, RED); _, body_rev = tile(PAPER, RED)
bw, bh = b[2]-b[0], b[3]-b[1]
def place(x, y, hgt, body):
    s = hgt/bh; return f'<g transform="translate({x:.1f} {y:.1f}) scale({s:.4f}) translate({-b[0]:.1f} {-b[1]:.1f})">{body}</g>'
W, H = 2000, 1250
k = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><style>{FONT}</style><rect width="{W}" height="{H}" fill="{PAPER}"/>']
k.append(f'<text x="80" y="90" fill="{GREY}" style="{mono}" font-size="16">HARE TODAY · MARK · KIT</text>')
k.append(place(110, 150, 560, body_ink))
k.append(f'<rect x="620" y="150" width="560" height="560" fill="{INK}"/>' + place(620 + (560 - 560*bw/bh*0.82)/2, 150 + 560*0.09, 560*0.82, body_rev))
# lockup
k.append(place(1270, 150, 210, body_ink))
k.append(f'<text x="1270" y="500" fill="{INK}" style="{disp}" font-size="132" letter-spacing="1">HARE TODAY</text>')
k.append(f'<text x="1274" y="548" fill="{INK}" style="{mono}" font-size="22" letter-spacing="4">BARBERS · BERTHOUD</text>')
k.append(f'<line x1="1270" y1="585" x2="1920" y2="585" stroke="{INK}" stroke-width="2"/><circle cx="1928" cy="585" r="8" fill="{RED}"/>')
# small sizes
x = 110
for hgt in (96, 48, 32, 20):
    k.append(place(x, 860 + (96 - hgt), hgt, body_ink)); k.append(f'<text x="{x}" y="990" fill="{GREY}" style="{mono}" font-size="14">{hgt}px</text>'); x += hgt*bw/bh + 70
# chair-board use: on black, with the red signal
k.append(f'<rect x="620" y="800" width="1300" height="300" fill="{INK}"/>' + place(670, 840, 220, body_rev))
k.append(f'<text x="870" y="935" fill="{PAPER}" style="{disp}" font-size="84">HARE TODAY</text><text x="872" y="985" fill="{PAPER}" style="{mono}" font-size="20" letter-spacing="3">NEXT CHAIR · GUS · 12 MIN</text>')
k.append(f'<circle cx="1860" cy="870" r="10" fill="{RED}"/><text x="1840" y="876" fill="{RED}" style="{mono}" font-size="16" text-anchor="end">OPEN</text>')
k.append(f'<text x="80" y="1180" fill="{GREY}" style="{mono}" font-size="15">Ink #0d0d0d · paper #f4f3f0 · signal red #e2321b, only on the pivot. Type: Big Shoulders Display 900, IBM Plex Mono. Made up for a demo; nothing from any real shop.</text>')
k.append('</svg>')
open(os.path.join(OUT, 'hare-today-kit.svg'), 'w').write(''.join(k))
g2, p2, _ = mark(40.0); bb = g2.union(p2).bounds; pad = 6
vb = f'{bb[0]-pad:.1f} {bb[1]-pad:.1f} {bb[2]-bb[0]+2*pad:.1f} {bb[3]-bb[1]+2*pad:.1f}'
for name, fill in (('mark-ink', INK), ('mark-paper', PAPER)):
    open(os.path.join(OUT, f'hare-today-{name}.svg'), 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><title>Hare Today</title><path fill="{fill}" fill-rule="evenodd" d="{d_of(g2)}"/><path fill="{RED}" d="{d_of(p2)}"/></svg>')
print('ok')
