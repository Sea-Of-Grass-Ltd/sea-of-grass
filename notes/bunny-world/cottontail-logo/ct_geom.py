"""Cottontail Farm mark, geometric pass (2026-11-15). A rabbit sitting in a field, seen from behind:
the body is cut by field rows, and the one accent is the cotton tail, which takes the season's colour.
Module m = row gap.  Body: circle r 4m at (0,0).  Head: circle r 2.1m at (0,-4.6m), joined to the body by a fillet of 1m.
Ears: lenses from circles r 6m with centres 10.6m apart (1.4m wide), based at (+-0.95m, -5.6m), leaning 9 deg out.
Rows: three cuts of 1/2 m across the body's lower half at y = 0.9m, 2.1m, 3.3m (a furrow every 1.2m).
Tail: circle r 1.05m at (0, 3.0m) in the accent, ringed by an m/2 gap so the rows stop at it. Slivers under 0.5 m^2 are dropped."""
import math
from shapely.geometry import Point, box
from shapely.ops import unary_union
from shapely import affinity

LEAN = 9.0

def ear(m):
    R, d = 6*m, 2*(6*m - 0.7*m)          # lens 1.4m wide
    h = math.sqrt(R*R - (d/2)**2)         # half length
    lens = Point(-d/2, 0).buffer(R, 256).intersection(Point(d/2, 0).buffer(R, 256))
    return affinity.translate(lens, 0, -h), h   # base at y=0, tip at -2h

def mark(m=20.0):
    body = Point(0, 0).buffer(4*m, 256)
    head = Point(0, -4.6*m).buffer(2.1*m, 192)
    e, h = ear(m)
    ears = []
    for sd in (-1, 1):
        x = affinity.translate(e, sd*0.95*m, -5.6*m)
        ears.append(affinity.rotate(x, sd*LEAN, origin=(sd*0.95*m, -5.6*m)))
    shape = unary_union([body, head]).buffer(1*m, resolution=64).buffer(-1*m, resolution=64)   # neck fillet 1m
    shape = unary_union([shape] + ears)
    tail = Point(0, 3.0*m).buffer(1.05*m, 128)
    rows = unary_union([box(-5*m, y - m/4, 5*m, y + m/4) for y in (0.9*m, 2.1*m, 3.3*m)])
    shape = shape.difference(rows.difference(tail.buffer(m/2)))
    shape = shape.difference(tail.buffer(m/2, resolution=96))
    # drop slivers the rows leave at the rim (anything under 0.5 m^2): no crumbs
    if shape.geom_type == 'MultiPolygon':
        shape = unary_union([g for g in shape.geoms if g.area >= 0.5*m*m])
    return shape, tail, dict(h=h)

def d_of(g, P=lambda p: p):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    out = []
    for p in polys:
        for ring in [p.exterior] + list(p.interiors):
            out.append('M' + ' L'.join(f'{P(c)[0]:.2f} {P(c)[1]:.2f}' for c in ring.coords) + 'Z')
    return ' '.join(out)
