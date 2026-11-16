"""Bunny Burritos mark, pass 3 (2026-11-15). A carrot-coloured bunny wrapped like a burrito, with two chile peppers for ears.
Module m.  Head and body: stadium 6m wide, 9m tall (radius 3m), centre (0,0); the foil is cut away below a band m/2 thick
at y = 1.4m, slanting 12 deg, and its bottom is squared off at y = 3.4m (a burrito end, not an egg).
Ears = chiles: a lens from circles r 3.8m and r 9m (bowed like a pepper), 1.8m wide, based at (+-1.3m, -5.3m), leaning 6 deg out,
the tip rounded r m/4; a green stem cap (circle r 0.8m at the ear base, the chile cut out of it with an m/5 gap) sits between each ear and the head, set off by an m/4 gap.
Eyes: circles r 0.55m at (+-1.3m, -1.0m). Colours: tortilla #faae33, foil #fff4e2, chile ears #d1255c, stems #5b8c32."""
import math
from shapely.geometry import Point, box, Polygon
from shapely.ops import unary_union
from shapely import affinity
LEAN, SLANT = 6.0, 12.0

def stadium(w, h):
    r = w/2
    return unary_union([box(-r, -h/2 + r, r, h/2 - r), Point(0, -h/2 + r).buffer(r, 256), Point(0, h/2 - r).buffer(r, 256)])

def chile(m):
    R1, R2, w = 3.8*m, 9.0*m, 1.8*m
    # circles placed so the lens is w wide at its fattest; offset found by solving the two rims at y=0
    c1, c2 = -(R1 - w/2), (R2 - w/2)                  # left circle centre, right circle centre on the x axis
    lens = Point(c1, 0).buffer(R1, 256).intersection(Point(c2, 0).buffer(R2, 256))
    # the lens already stands upright (tall in y)
    b = lens.bounds
    lens = affinity.translate(lens, -(b[0]+b[2])/2, -b[3])  # base at y=0, tip up
    lens = lens.buffer(-m/4, 64).buffer(m/4, 64)
    return lens

def mark(m=20.0):
    body = stadium(6*m, 9*m).intersection(box(-4*m, -6*m, 4*m, 3.4*m))
    ears, stems = [], []
    for sd in (-1, 1):
        e = chile(m)
        if sd < 0: e = affinity.scale(e, -1, 1, origin=(0, 0))
        e = affinity.translate(e, sd*1.3*m, -5.3*m)
        e = affinity.rotate(e, sd*LEAN, origin=(sd*1.3*m, -5.3*m))
        st = Point(sd*1.3*m, -5.2*m).buffer(0.8*m, 96)
        st = st.difference(e.buffer(m/5, 64))
        ears.append(e.difference(body.buffer(m/4))); stems.append(st.difference(body.buffer(m/4)))
    band = affinity.rotate(box(-6*m, 1.4*m - m/4, 6*m, 1.4*m + m/4), -SLANT, origin=(0, 1.4*m))
    below = affinity.rotate(box(-6*m, 1.4*m, 6*m, 8*m), -SLANT, origin=(0, 1.4*m))
    eyes = unary_union([Point(sd*1.3*m, -1.0*m).buffer(0.55*m, 96) for sd in (-1, 1)])
    b2 = body.difference(band).difference(eyes)
    tort = b2.difference(below); foil = b2.intersection(below)
    return dict(tort=tort, foil=foil, ears=unary_union(ears), stems=unary_union(stems))

COL = dict(tort='#faae33', foil='#fff4e2', ears='#d1255c', stems='#5b8c32')

def d_of(g, P=lambda p: p):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    out = []
    for p in polys:
        for ring in [p.exterior] + list(p.interiors):
            out.append('M' + ' L'.join(f'{P(c)[0]:.2f} {P(c)[1]:.2f}' for c in ring.coords) + 'Z')
    return ' '.join(out)
