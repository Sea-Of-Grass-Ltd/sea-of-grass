"""Hare Today mark, geometric pass (2026-11-15). A pair of shears stood on end reads as a hare:
blades = ears, finger rings = eyes, pivot screw = nose (the one red).
Module m = ring stroke. Every curve comes from the radius set below; nothing is drawn freehand.
  Blade: a lens (vesica) = intersection of two circles of radius 14m whose centres sit 26.7m apart, so the lens is 1.3m wide and 8.4m long.
  Blades lean out 13 deg about the pivot.  Rings: annulus, outer 2m, inner 1m (stroke 1m), centres at (+-2.35m, 3.6m), so a 0.7m gap between them.
  Shanks: 1m bars from the pivot straight to each ring centre.  Pivot: circle 0.85m (red), with a 1/3m ink rim gap."""
import math
from shapely.geometry import Point, LineString, Polygon, box
from shapely.ops import unary_union
from shapely import affinity

LEAN = 13.0

def blade(m):
    R, d = 14*m, 26.7*m
    lens = Point(-d/2, 0).buffer(R, 256).intersection(Point(d/2, 0).buffer(R, 256))  # tall lens, centred at 0,0
    # stand it up: the lens runs vertically from -sqrt(R^2-(d/2)^2) to +; keep only the part above the pivot plus a short tail
    h = math.sqrt(R*R - (d/2)**2)
    lens = affinity.translate(lens, 0, -h + 1.2*m)     # tip at -2h+1.2m (up), tail end 1.2m below the pivot
    return lens, h

def mark(m=20.0):
    lens, h = blade(m)
    L = affinity.rotate(lens, LEAN, origin=(0, 0))     # positive = leans left on screen (y down)
    Rr = affinity.rotate(lens, -LEAN, origin=(0, 0))
    ro, ri = 2.0*m, 1.0*m
    cx, cy = 2.35*m, 3.6*m
    rings, holes, shanks = [], [], []
    for sd in (-1, 1):
        c = (sd*cx, cy)
        rings.append(Point(c).buffer(ro, 128)); holes.append(Point(c).buffer(ri, 128))
        # shank from the pivot to the ring's top, crossing over: left blade feeds the right ring (real shears cross)
        shanks.append(LineString([(0, 0), (sd*cx, cy)]).buffer(m/2, cap_style=1))
    # rings and shanks share one small fillet (1/4 m); the blades stay sharp-edged like real shears.
    # The right blade sits in front with an m/3 gap cut into the left one, so both ears read and the shears cross.
    base = unary_union(rings + shanks).buffer(m/4, resolution=48).buffer(-m/4, resolution=48)
    body = unary_union([base, L.difference(Rr.buffer(m/3, resolution=48)), Rr])
    for hole in holes:
        body = body.difference(hole)
    pivot_gap = Point(0, 0).buffer(0.85*m + m/3, 96)
    body = body.difference(pivot_gap)
    pivot = Point(0, 0).buffer(0.85*m, 96)
    return body, pivot, dict(h=h, ro=ro, ri=ri, cx=cx, cy=cy, R=14*m, d=26.7*m, L=L, Rr=Rr)

def d_of(g, P=lambda p: p):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    out = []
    for p in polys:
        for ring in [p.exterior] + list(p.interiors):
            cs = [P(c) for c in ring.coords]
            out.append('M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in cs) + 'Z')
    return ' '.join(out)
