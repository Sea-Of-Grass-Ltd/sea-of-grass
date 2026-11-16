"""Bunny Burritos mark: geometry sheet, kit sheet and mark SVGs. Usage: python3 build_sheets.py OUTDIR"""
import sys, os
from shapely.ops import unary_union
from bb_geom import mark, d_of, COL, LEAN, SLANT
OUT = sys.argv[1]
BROWN, COCOA, CREAM, GREY = '#823513', '#402011', '#fff4e2', '#f7d9b0'
FONT = "@import url('https://fonts.googleapis.com/css2?family=Anton&amp;family=IBM+Plex+Mono:wght@500&amp;display=swap');"
mono = "font-family:'IBM Plex Mono',monospace;font-weight:500"; disp = "font-family:Anton,Impact,sans-serif"

def paths(g, P=lambda p: p, cols=COL, op=1):
    return ''.join(f'<path fill="{cols[k]}" fill-rule="evenodd" opacity="{op}" d="{d_of(v, P)}"/>' for k, v in g.items() if not v.is_empty)

# geometry sheet
m = 46.0; g = mark(m)
W, H = 2000, 1250; ox, oy = 520, 780
P = lambda p: (p[0] + ox, p[1] + oy)
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><style>{FONT}</style><rect width="{W}" height="{H}" fill="{COCOA}"/>']; a = o.append
dash = f'fill="none" stroke="{CREAM}" stroke-width="1" stroke-dasharray="6 6" opacity=".22"'
cs = f'fill="none" stroke="{CREAM}" stroke-width="1.6" opacity=".75"'
for k in range(-12, 13): x = ox + k*m/2; a(f'<line x1="{x:.1f}" y1="{oy-12*m:.1f}" x2="{x:.1f}" y2="{oy+4*m:.1f}" {dash}/>')
for k in range(-24, 9): y = oy + k*m/2; a(f'<line x1="{ox-6*m:.1f}" y1="{y:.1f}" x2="{ox+6*m:.1f}" y2="{y:.1f}" {dash}/>')
a(paths(g, P, op=.9))
a(f'<circle cx="{ox}" cy="{oy-1.5*m}" r="{3*m}" {cs}/><circle cx="{ox}" cy="{oy+1.5*m}" r="{3*m}" {cs}/>')
for sd in (-1, 1):
    a(f'<circle cx="{ox+sd*1.3*m}" cy="{oy-1.0*m}" r="{0.55*m}" {cs}/><circle cx="{ox+sd*1.3*m}" cy="{oy-5.2*m}" r="{0.8*m}" {cs}/>')
a(f'<line x1="{ox-5*m}" y1="{oy+1.4*m+5*m*0.2126:.1f}" x2="{ox+5*m}" y2="{oy+1.4*m-5*m*0.2126:.1f}" stroke="#faae33" stroke-width="1.4" stroke-dasharray="10 6"/>')
a(f'<line x1="{ox-5*m}" y1="{oy+3.4*m}" x2="{ox+5*m}" y2="{oy+3.4*m}" stroke="#faae33" stroke-width="1.4" stroke-dasharray="10 6"/>')
a(f'<line x1="{ox}" y1="{oy-12*m}" x2="{ox}" y2="{oy+4*m}" stroke="{CREAM}" stroke-width="1" opacity=".45"/>')
tx = 1130
def T(y, t, size=20, fill=CREAM, style=mono): a(f'<text x="{tx}" y="{y}" fill="{fill}" style="{style}" font-size="{size}">{t}</text>')
T(150, 'BUNNY BURRITOS · MARK · GEOMETRY', 16, GREY)
T(240, 'A BUNNY WRAPPED', 78, '#faae33', disp); T(322, 'TO GO.', 78, '#faae33', disp)
rows = [('Body', 'stadium 6m × 9m, radius 3m; bottom squared at 3.4m'), ('Wrap', f'band m/2 at 1.4m, slanting {SLANT:.0f}°; foil below'),
        ('Ears', 'chiles: lens from circles r 3.8m and r 9m,'), ('', f'1.8m wide, based ±1.3m, leaning {LEAN:.0f}° out'),
        ('Stems', 'circle r 0.8m at each chile base, gap m/5'), ('Eyes', 'circles r 0.55m at ±1.3m'), ('Gaps', 'every part kept apart by m/4 or more'),
        ('Grid', 'half-module; m = twice the wrap gap')]
y = 420
for k, v in rows:
    if k: a(f'<text x="{tx}" y="{y}" fill="#faae33" style="{mono}" font-size="18">{k.upper()}</text>')
    a(f'<text x="{tx+120}" y="{y}" fill="{CREAM}" style="{mono}" font-size="18">{v}</text>'); y += 40
T(y + 40, 'Tortilla #faae33 · foil #fff4e2 · chile #d1255c · stem #5b8c32. Nothing freehand.', 15, GREY)
a('</svg>'); open(os.path.join(OUT, 'burritos-geometry.svg'), 'w').write(''.join(o))

# kit sheet
g2 = mark(20.0); b = unary_union(list(g2.values())).bounds; bw, bh = b[2]-b[0], b[3]-b[1]
def place(x, y, hgt, cols=COL): s = hgt/bh; return f'<g transform="translate({x:.1f} {y:.1f}) scale({s:.4f}) translate({-b[0]:.1f} {-b[1]:.1f})">{paths(g2, cols=cols)}</g>'
mono1 = dict(tort=CREAM, foil=CREAM, ears=CREAM, stems=CREAM); ink1 = dict(tort=COCOA, foil=COCOA, ears=COCOA, stems=COCOA)
k = [f'<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1250" viewBox="0 0 2000 1250"><style>{FONT}</style><rect width="2000" height="1250" fill="{BROWN}"/>']
k.append(f'<text x="80" y="90" fill="{GREY}" style="{mono}" font-size="16">BUNNY BURRITOS · MARK · KIT</text>')
k.append(place(110, 140, 600))
k.append(f'<rect x="560" y="140" width="320" height="400" fill="{CREAM}"/>' + place(560 + (320 - 330*bw/bh)/2, 175, 330, ink1))
k.append(f'<rect x="900" y="140" width="320" height="400" fill="{COCOA}"/>' + place(900 + (320 - 330*bw/bh)/2, 175, 330, mono1))
k.append(f'<text x="560" y="570" fill="{CREAM}" style="{mono}" font-size="15">ONE-COLOUR · COCOA ON CREAM · CREAM ON COCOA</text>')
k.append(place(1300, 160, 150)); k.append(f'<text x="1440" y="250" fill="#faae33" style="{disp}" font-size="92">BUNNY</text><text x="1440" y="340" fill="#faae33" style="{disp}" font-size="92">BURRITOS</text>')
k.append(f'<text x="1300" y="400" fill="{CREAM}" style="{mono}" font-size="16" letter-spacing="3">CARROT-CHILE BURRITOS · BERTHOUD</text>')
x = 110
for hgt in (120, 64, 44, 28):
    k.append(place(x, 760 + (120 - hgt), hgt)); k.append(f'<text x="{x}" y="910" fill="{GREY}" style="{mono}" font-size="14">{hgt}px</text>'); x += hgt*bw/bh + 70
k.append(f'<rect x="560" y="700" width="1360" height="110" fill="{BROWN}" stroke="#faae33" stroke-width="2"/>' + place(600, 716, 78) + f'<text x="660" y="770" fill="#faae33" style="{disp}" font-size="44">BUNNY BURRITOS</text><text x="1640" y="768" fill="{CREAM}" style="{mono}" font-size="16">ORDER PICKUP</text>')
k.append(f'<text x="560" y="845" fill="{GREY}" style="{mono}" font-size="15">AT NAV SIZE ON THE BROWN (78px tall)</text>')
k.append(f'<text x="80" y="1200" fill="{GREY}" style="{mono}" font-size="15">Brown #823513 · tortilla #faae33 · foil #fff4e2 · chile #d1255c · stem #5b8c32 · cocoa #402011. Anton, IBM Plex Mono. Made up for a demo.</text>')
k.append('</svg>'); open(os.path.join(OUT, 'burritos-kit.svg'), 'w').write(''.join(k))

def solo(cols, name):
    P2 = lambda p: (p[0] - b[0], p[1] - b[1])
    open(os.path.join(OUT, name), 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {bw:.1f} {bh:.1f}"><title>Bunny Burritos</title>{paths(g2, P2, cols)}</svg>')
solo(COL, 'burritos-mark.svg'); solo(ink1, 'burritos-mark-ink.svg'); solo(mono1, 'burritos-mark-cream.svg')
print('ok')
