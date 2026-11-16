"""Bunny Burritos mark, calavera pass (2026-11-15). A bunny skull, sugar-skull style, built from circles on a module grid.
Module m.  Cranium: circle r 4m at (0,0).  Muzzle: rounded box 5m wide from y 0.6m to 4.5m (radius 1.6m), joined to the
cranium with a 1m fillet.  Ears: lenses from circles r 6.4m, 2m wide, based at (+-1.6m, -3.1m), leaning 9 deg out, tips
rounded m/3, each with an inner groove (a lens 0.6m wide from the same radius, lower 60%) cut through.  Sockets: holes r 1.2m at
(+-1.55m, 0.5m), each holding a chile disc r 0.85m.  Nose: a rounded down-pointing triangle 1m wide at y 2.2m.
Teeth: two rounded boxes 0.85m x 1.25m hanging from the muzzle at x +-0.47m, split by m/5.  Sugar-skull details, two:
a marigold on the brow (centre r 0.35m, six petals r 0.42m on a ring of 0.55m) at (0,-1.9m), and a stitched smile:
a line m/5 across the muzzle at y 3.55m with five stitches m/5 x 0.7m."""
import math
from shapely.geometry import Point, box, Polygon
from shapely.ops import unary_union
from shapely import affinity
LEAN = 9.0

def rbox(x0, y0, x1, y1, r):
    return box(x0 + r, y0 + r, x1 - r, y1 - r).buffer(r, resolution=64)

def ear_lens(m, R, half):
    d = 2*(R - half); h = math.sqrt(R*R - (d/2)**2)
    lens = Point(-d/2, 0).buffer(R, 256).intersection(Point(d/2, 0).buffer(R, 256))
    return affinity.translate(lens, 0, -h), h

def mark(m=20.0):
    cran = Point(0, 0).buffer(4*m, 256)
    muz = rbox(-2.5*m, 0.6*m, 2.5*m, 4.5*m, 1.6*m)
    skull = unary_union([cran, muz]).buffer(1*m, 64).buffer(-1*m, 64)
    ears = []
    for sd in (-1, 1):
        e, h = ear_lens(m, 6.4*m, 1.0*m)
        e = e.buffer(-m/3, 64).buffer(m/3, 64)
        inner, hi = ear_lens(m, 6.4*m, 0.3*m)
        inner = affinity.translate(inner, 0, -(h - hi)*0.55).intersection(box(-3*m, -2*h*0.68, 3*m, -1.0*m))
        e = e.difference(inner)
        e = affinity.translate(e, sd*1.6*m, -3.1*m)
        ears.append(affinity.rotate(e, sd*LEAN, origin=(sd*1.6*m, -3.1*m)))
    shape = unary_union([skull] + ears)
    sockets = unary_union([Point(sd*1.55*m, 0.5*m).buffer(1.2*m, 128) for sd in (-1, 1)])
    chile = unary_union([Point(sd*1.55*m, 0.5*m).buffer(0.85*m, 128) for sd in (-1, 1)])
    nose = Polygon([(-0.5*m, 1.85*m), (0.5*m, 1.85*m), (0, 2.75*m)]).buffer(0.12*m, 32)
    teeth = unary_union([rbox(sd*0.47*m - 0.425*m, 4.0*m, sd*0.47*m + 0.425*m, 5.25*m, 0.25*m) for sd in (-1, 1)])
    gap = box(-m/10, 4.3*m, m/10, 5.4*m)
    shape = unary_union([shape, teeth]).difference(gap)
    flower = unary_union([Point(0, -1.9*m).buffer(0.35*m, 64)] + [Point(0.55*m*math.cos(math.radians(a)), -1.9*m + 0.55*m*math.sin(math.radians(a))).buffer(0.42*m, 64) for a in range(0, 360, 60)])
    stitch = unary_union([box(-1.6*m, 3.55*m - m/10, 1.6*m, 3.55*m + m/10)] + [box(x - m/10, 3.2*m, x + m/10, 3.9*m) for x in (-1.2*m, -0.6*m, 0, 0.6*m, 1.2*m)])
    bone = shape.difference(sockets).difference(nose).difference(stitch).difference(flower.buffer(m/5, 64))
    if bone.geom_type == 'MultiPolygon':
        bone = unary_union([g for g in bone.geoms if g.area >= 0.3*m*m])
    return dict(bone=bone, chile=chile, flower=flower)

COL = dict(bone='#fff4e2', chile='#d1255c', flower='#faae33')

def d_of(g, P=lambda p: p):
    polys = [g] if g.geom_type == 'Polygon' else list(g.geoms)
    out = []
    for p in polys:
        for ring in [p.exterior] + list(p.interiors):
            out.append('M' + ' L'.join(f'{P(c)[0]:.2f} {P(c)[1]:.2f}' for c in ring.coords) + 'Z')
    return ' '.join(out)
