"""Cottontail Farm mark: geometry sheet and kit sheet. Usage: python3 build_sheets.py OUTDIR"""
import sys, os
from shapely import affinity
from shapely.geometry import Point
from ct_geom import mark, d_of, LEAN
OUT = sys.argv[1]
INK, CREAM, GREY = '#1f2509', '#f6f1e3', '#7d806a'
SEASONS = [('Summer', '#f2b705', '#22300e'), ('Fall', '#ec6a1e', '#2a180c'), ('Resting', '#c8d68a', '#1f2509')]
FONT = "@import url('https://fonts.googleapis.com/css2?family=Gabarito:wght@800;900&amp;family=IBM+Plex+Mono:wght@500&amp;display=swap');"
mono = "font-family:'IBM Plex Mono',monospace;font-weight:500"; disp = "font-family:Gabarito,sans-serif;font-weight:900"

m = 44.0
g, tail, c = mark(m)
W, H = 2000, 1250; ox, oy = 520, 700
P = lambda p: (p[0] + ox, p[1] + oy)
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><style>{FONT}</style><rect width="{W}" height="{H}" fill="{INK}"/>']; a = o.append
cs = f'fill="none" stroke="{CREAM}" stroke-width="1.6" opacity=".8"'
dash = f'fill="none" stroke="{CREAM}" stroke-width="1" stroke-dasharray="6 6" opacity=".3"'
for k in range(-12, 13):
    x = ox + k*m/2; a(f'<line x1="{x:.1f}" y1="{oy-11*m:.1f}" x2="{x:.1f}" y2="{oy+4.8*m:.1f}" {dash if k%2==0 else dash.replace(".3", ".1")}/>')
for k in range(-22, 10):
    y = oy + k*m/2; a(f'<line x1="{ox-6*m:.1f}" y1="{y:.1f}" x2="{ox+6*m:.1f}" y2="{y:.1f}" {dash if k%2==0 else dash.replace(".3", ".1")}/>')
a(f'<path fill="#3b4220" fill-rule="evenodd" d="{d_of(g, P)}"/><path fill="#ec6a1e" opacity=".9" d="{d_of(tail, P)}"/>')
a(f'<circle cx="{ox}" cy="{oy}" r="{4*m}" {cs}/><circle cx="{ox}" cy="{oy-4.6*m}" r="{2.1*m}" {cs}/>')
for X, Y in ((ox, oy), (ox, oy-4.6*m), (ox, oy+3*m)): a(f'<circle cx="{X}" cy="{Y:.1f}" r="4" fill="{CREAM}"/>')
a(f'<circle cx="{ox}" cy="{oy+3*m}" r="{1.05*m + m/2:.1f}" {cs}/>')
for y in (0.9, 2.1, 3.3): a(f'<line x1="{ox-5.5*m}" y1="{oy+y*m:.1f}" x2="{ox+5.5*m}" y2="{oy+y*m:.1f}" stroke="#ec6a1e" stroke-width="1.3" stroke-dasharray="10 6"/>')
for sd in (-1, 1):
    bx, by = ox + sd*0.95*m, oy - 5.6*m
    e = affinity.rotate(Point(0, -2*c['h']), sd*LEAN, origin=(0, 0))
    a(f'<line x1="{bx:.1f}" y1="{by:.1f}" x2="{bx+e.x:.1f}" y2="{by+e.y:.1f}" stroke="#ec6a1e" stroke-width="1.3" stroke-dasharray="10 6"/><circle cx="{bx:.1f}" cy="{by:.1f}" r="4" fill="{CREAM}"/>')
a(f'<line x1="{ox}" y1="{oy-11*m}" x2="{ox}" y2="{oy+4.8*m}" stroke="{CREAM}" stroke-width="1" opacity=".45"/>')
tx = 1120
def T(y, t, size=20, fill=CREAM, style=mono): a(f'<text x="{tx}" y="{y}" fill="{fill}" style="{style}" font-size="{size}">{t}</text>')
T(150, 'COTTONTAIL FARM · MARK · GEOMETRY', 16, GREY)
T(232, 'A rabbit in', 72, CREAM, disp); T(308, 'the rows.', 72, CREAM, disp)
rows = [('Body', 'circle r 4m'), ('Head', 'circle r 2.1m, 4.6m above; neck fillet 1m'), ('Ears', 'lenses cut from circles r 6m, 1.4m wide,'), ('', f'based ±0.95m, leaning {LEAN:.0f}° out'),
        ('Rows', 'three furrows m/2 thick, every 1.2m,'), ('', 'cut across the lower body'), ('Tail', 'circle r 1.05m, the one accent, ringed by m/2'),
        ('Season', 'the tail takes the season colour, like the site'), ('Grid', 'half-module; m = the row gap')]
y = 400
for k, v in rows:
    if k: a(f'<text x="{tx}" y="{y}" fill="#ec6a1e" style="{mono}" font-size="18">{k.upper()}</text>')
    a(f'<text x="{tx+120}" y="{y}" fill="{CREAM}" style="{mono}" font-size="18">{v}</text>'); y += 40
T(y + 40, 'Field green + one season accent. Nothing freehand: every curve is from the radius set.', 15, GREY)
a('</svg>'); open(os.path.join(OUT, 'cottontail-geometry.svg'), 'w').write(''.join(o))

g2, t2, _ = mark(20.0); b = g2.union(t2).bounds; bw, bh = b[2]-b[0], b[3]-b[1]
def body(fill, acc): return f'<path fill="{fill}" fill-rule="evenodd" d="{d_of(g2)}"/><path fill="{acc}" d="{d_of(t2)}"/>'
def place(x, y, hgt, bd): s = hgt/bh; return f'<g transform="translate({x:.1f} {y:.1f}) scale({s:.4f}) translate({-b[0]:.1f} {-b[1]:.1f})">{bd}</g>'
k = [f'<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1250" viewBox="0 0 2000 1250"><style>{FONT}</style><rect width="2000" height="1250" fill="{CREAM}"/>']
k.append(f'<text x="80" y="90" fill="{GREY}" style="{mono}" font-size="16">COTTONTAIL FARM · MARK · KIT</text>')
k.append(place(110, 140, 580, body(INK, '#ec6a1e')))
x = 520
for name, acc, bg in SEASONS:
    k.append(f'<rect x="{x}" y="140" width="300" height="380" fill="{bg}"/>' + place(x + (300 - 300*0.62*bw/bh*1.0)/2 + 10, 170, 300*0.95*0.9, body(CREAM, acc)))
    k.append(f'<text x="{x}" y="550" fill="{INK}" style="{mono}" font-size="15">{name.upper()} · {acc}</text>'); x += 320
k.append(place(520, 640, 150, body(INK, '#f2b705')))
k.append(f'<text x="640" y="740" fill="{INK}" style="{disp}" font-size="104" letter-spacing="-2">Cottontail Farm</text>')
k.append(f'<text x="644" y="782" fill="{INK}" style="{mono}" font-size="20" letter-spacing="4">PICK · PLAY · STAY FOR SUPPER · BERTHOUD</text>')
x = 110
for hgt in (120, 64, 40, 24):
    k.append(place(x, 960 + (120 - hgt), hgt, body(INK, '#ec6a1e'))); k.append(f'<text x="{x}" y="1110" fill="{GREY}" style="{mono}" font-size="14">{hgt}px</text>'); x += hgt*bw/bh + 60
k.append(f'<rect x="760" y="900" width="1160" height="230" rx="18" fill="#22300e"/>' + place(800, 925, 180, body(CREAM, '#f2b705')))
k.append(f'<text x="930" y="1005" fill="{CREAM}" style="{disp}" font-size="64">Summer at Cottontail</text><text x="932" y="1050" fill="#f2b705" style="{mono}" font-size="18" letter-spacing="3">SUNFLOWERS · U-PICK · 9 TO 6</text>')
k.append(f'<text x="80" y="1200" fill="{GREY}" style="{mono}" font-size="15">Field green #1f2509 · cream #f6f1e3 · the tail follows the season: summer #f2b705, fall #ec6a1e, resting #c8d68a. Gabarito 900, IBM Plex Mono. Made up for a demo.</text>')
k.append('</svg>'); open(os.path.join(OUT, 'cottontail-kit.svg'), 'w').write(''.join(k))
print('ok')
