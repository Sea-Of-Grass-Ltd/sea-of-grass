"""Rotary phone for the Websites page ("one less call"), built part by part, rigged, 0-1 parameters.

Method after AnyMachine (https://github.com/apekshik/anymachine, MIT, (c) 2026 Apekshik Panigrahi):
part list first, every real piece its own mesh, moving parts shaped so they cannot clip by construction
(coaxial dial, handset lifting clear of its horns), one linear 1 s action per 0-1 parameter
("seek t = param"), a sweep check for triangle overlaps (check_phone.py) and a re-imported GLB.
No AnyMachine code is copied here; check_phone.py adapts laptop/scripts/check.py (MIT notice kept there).

Run live in Blender (via the MCP):  exec(open(PATH).read())
Units metres, Z up, front -Y, origin = centre of the footprint on the counter.

Parts (bone):
  1 body shell (root)        2 base plate + 4 feet (root)   3 number plate (root)
  4 finger wheel (dial)      5 centre label (root)          6 finger stop (root)
  7 cradle horns x2 (root)   8 plungers x2 (plunger_L/R)    9 handset grip (handset)
 10 earpiece (handset)      11 mouthpiece (handset)         12 coiled cord (skinned root -> handset)
Parameters: handset_lift, dial, ring  (0..1 each).
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion

# ---------------------------------------------------------------- dimensions
BASE_HW = 0.112          # half width of the shell at the counter (lower and wider, after the illustration)
TOP_HW = 0.090           # half width at the deck
Z0 = 0.006               # shell sits on the base plate
PROFILE = [(0.104, 0.0), (0.094, 0.078), (0.004, 0.082), (-0.098, 0.012), (-0.106, 0.0)]  # (y, z) side profile
ZTOP = 0.082
SHELL_BEVEL = 0.040      # soft everywhere; the two edges of the dial slope get less so the dial has a flat seat
SLOPE_EDGE_W = 0.60

F1, F2 = Vector((0, 0.004, 0.082)), Vector((0, -0.098, 0.012))   # front slope
SLOPE = math.atan2(F1.z - F2.z, F1.y - F2.y)                        # ~34 deg
DIAL_C = (F1 + F2) / 2 + Vector((0, 0, Z0))
DIAL_M = Matrix.Translation(DIAL_C) @ Matrix.Rotation(SLOPE, 4, 'X')  # local Z = dial normal, local Y up the slope
R_PLATE, R_WHEEL, R_HUB = 0.050, 0.0465, 0.019
R_BEZEL = 0.0555         # raised cream ring the dial sits down into
STOP_ANG = math.radians(-38)
HOLE_R, HOLE_RING = 0.0066, 0.0335
HOLE_ANGS = [STOP_ANG + math.radians(58 + 30 * k) for k in range(10)]   # digit 1 .. 0, counter-clockwise from the stop
STOP_HALF_W = 0.0028
# wound fully, the 0 hole's edge meets the finger stop
DIAL_MAX = math.radians(58 + 30 * 9) - 0.92 * (HOLE_R + STOP_HALF_W) / HOLE_RING   # the 0 hole's edge just meets the hook

HS_Y = 0.048             # handset line (front/back)
HUMP = (0.058, 0.036, 0.014)   # cradle hump: half width, half depth at its foot, height at the horns
HUMP_TOP = Z0 + ZTOP + HUMP[2]
HORN_X = 0.046           # fork centres
FORK_HX = 0.012          # half width of a fork along X
FORK_FLOOR_T = 0.012     # horn base above the hump
HORN_T = 0.0065          # thickness of each U-horn
FORK_FLOOR = HUMP_TOP + FORK_FLOOR_T
PRONG_T = 0.008
PRONG_RISE = 0.020       # prongs stand this far above the fork floor, cupping the handle
CUP_X = 0.098
CUP_H, CUP_R = 0.032, 0.030
GRIP_ARCH = 0.014
GRIP_W, GRIP_H = 0.032, 0.026
PRONG_GAP = GRIP_W / 2 + 0.002   # inner face of each prong from the handset line
_low_x = HORN_X + FORK_HX
GRIP_END_Z = FORK_FLOOR + 0.0006 + GRIP_H / 2 - GRIP_ARCH * (1 - (_low_x / CUP_X) ** 2)   # handle bottom just clears the floor
CUP_BOTTOM = GRIP_END_Z - CUP_H + 0.004


def grip_z(x):
    return GRIP_END_Z + GRIP_ARCH * (1 - (x / CUP_X) ** 2)


PLUNGER_H = FORK_FLOOR_T - 0.0004
PLUNGER_REST_TOP = FORK_FLOOR + 0.0002          # pressed flush by the handset
PLUNGER_RISE = 0.006
PRONG_TOP = FORK_FLOOR + PRONG_RISE
HS_PIVOT = Vector((0, HS_Y, grip_z(0)))

CORD_COIL, CORD_PITCH, CORD_WIRE, CORD_STEP = 0.0052, 0.0068, 0.0023, 0.0006
CORD_ENTRY_Y, CORD_ENTRY_Z = -0.058, 0.024
CORD_LOW, CORD_LOW_TAN = (-0.176, -0.040, 0.0052 + 0.0023 + 0.0002), (0.12, -1.0, -0.02)   # where the cord lies on the counter
CORD_H = (0.050, 0.060, 0.032, 0.036)                                       # bezier handle lengths

CREAM = (0.66, 0.66, 0.52)          # linear; cream with the illustration's slight green cast
DIAL_COL = (0.24, 0.30, 0.36)       # number plate, seen through the holes
WHEEL_COL = (0.52, 0.58, 0.63)      # finger wheel, paler grey-blue
LABEL_COL = (0.82, 0.84, 0.80)
DARK = (0.03, 0.035, 0.04)
STEEL = (0.62, 0.64, 0.66)


# ---------------------------------------------------------------- helpers
def mat(name, col, rough=0.3, metal=0.0, coat=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    for k in ("Coat Weight", "Clearcoat"):
        if k in b.inputs:
            b.inputs[k].default_value = coat
    return m


def obj_from_bm(name, bm, material=None, smooth=True, coll=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    (coll or phone_coll()).objects.link(o)
    if material:
        me.materials.append(material)
    return o


def lathe(profile, seg=48, cap_top=True, cap_bottom=True):
    """profile: [(r, z)] bottom to top, revolved about local Z."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)])
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap_bottom:
        bm.faces.new(list(reversed(rings[0])))
    if cap_top:
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def annulus(r_in, r_out, z0, z1, seg=64):
    bm = bmesh.new()
    def ring(r, z):
        return [bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
    oi, oo, ti, to = ring(r_in, z0), ring(r_out, z0), ring(r_in, z1), ring(r_out, z1)
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((oo[i], oo[j], to[j], to[i]))
        bm.faces.new((ti[i], ti[j], oi[j], oi[i]))
        bm.faces.new((to[i], to[j], ti[j], ti[i]))
        bm.faces.new((oi[i], oi[j], oo[j], oo[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def rbox(sx, sy, sz, center, bevel=0.002, seg=3):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=bevel, segments=seg, affect='EDGES', profile=0.5)
    return bm


def transform(o, M):
    o.data.transform(M)
    o.data.update()


def sweep(points, section, closed=False, scales=None, fixed_u=None):
    """Sweep a 2D section [(u, v)] along points; frame: tangent T, u along N (horizontal-ish), v along B."""
    bm = bmesh.new()
    rings = []
    n = len(points)
    up = Vector((0, 0, 1))
    for i, p in enumerate(points):
        t = (points[min(i + 1, n - 1)] - points[max(i - 1, 0)]).normalized()
        ref = up if abs(t.dot(up)) < 0.95 else Vector((0, 1, 0))
        nrm = t.cross(ref).normalized() if fixed_u is None else fixed_u
        bnm = nrm.cross(t).normalized()
        k = scales[i] if scales else 1.0
        rings.append([bm.verts.new(p + (nrm * u + bnm * v) * k) for u, v in section])
    m = len(section)
    for a, b in zip(rings, rings[1:]):
        for j in range(m):
            k = (j + 1) % m
            bm.faces.new((a[j], a[k], b[k], b[j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def rrect(w, h, r, seg=4):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for s in range(seg + 1):
            a = math.radians(a0 + 90 * s / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def circle(r, seg=12):
    return [(r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg)) for i in range(seg)]


def catmull(ctrl, steps):
    out = []
    P = [ctrl[0]] + ctrl + [ctrl[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for s in range(steps):
            t = s / steps
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(ctrl[-1])
    return out


def resample(pts, step):
    out, acc = [pts[0]], 0.0
    for a, b in zip(pts, pts[1:]):
        seg = (b - a).length
        d = step - acc
        while d <= seg:
            out.append(a.lerp(b, d / seg))
            d += step
        acc = seg - (d - step)
    out.append(pts[-1])
    return out


def bezier(p0, p1, p2, p3, n):
    return [p0 * (1 - t) ** 3 + p1 * 3 * t * (1 - t) ** 2 + p2 * 3 * t * t * (1 - t) + p3 * t ** 3 for t in (i / n for i in range(n + 1))]


def bend_radius(pts, span):
    """Smallest radius of the circle through points `span` apart along the polyline."""
    k = max(1, int(round(span / max(1e-9, (pts[1] - pts[0]).length))))
    best = 1e9
    for i in range(k, len(pts) - k):
        a, b, c = pts[i - k], pts[i], pts[i + k]
        ab, bc, ca = (b - a).length, (c - b).length, (a - c).length
        area2 = (b - a).cross(c - a).length
        if area2 > 1e-12:
            best = min(best, ab * bc * ca / (2 * area2))
    return best


def smooth_path(pts, r_min, pin=3, iters=4000):
    """Laplacian-smooth a polyline (ends pinned) until no bend is tighter than r_min."""
    pts = [p.copy() for p in pts]
    for it in range(iters):
        for i in range(pin, len(pts) - pin):
            pts[i] = pts[i].lerp((pts[i - 1] + pts[i + 1]) / 2, 0.5)
        if it % 50 == 49 and bend_radius(pts, 0.008) >= r_min:
            break
    return pts


# ---------------------------------------------------------------- scene
def phone_coll():
    c = bpy.data.collections.get("rotary_phone")
    if c is None:
        c = bpy.data.collections.new("rotary_phone")
        bpy.context.scene.collection.children.link(c)
    return c


def reset():
    """Remove only what this script made (the rotary_phone collection); lights and the counter stay."""
    for o in list(phone_coll().objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions, bpy.data.curves):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)


def build_parts():
    M = {
        "cream": mat("cream_gloss", CREAM, rough=0.22, coat=0.6),
        "dial": mat("dial_plate", DIAL_COL, rough=0.4, coat=0.2),
        "wheel": mat("dial_wheel", WHEEL_COL, rough=0.3, coat=0.4),
        "label": mat("label_paper", LABEL_COL, rough=0.6),
        "dark": mat("dark_rubber", DARK, rough=0.7),
        "steel": mat("steel", STEEL, rough=0.25, metal=1.0),
    }
    P = {}

    # 1 body shell: prism on the side profile, sides taper with height, then bevelled
    bm = bmesh.new()
    L, R = [], []
    for y, z in PROFILE:
        hw = BASE_HW - (BASE_HW - TOP_HW) * (z / ZTOP)
        L.append(bm.verts.new((-hw, y, z + Z0)))
        R.append(bm.verts.new((hw, y, z + Z0)))
    bm.faces.new(L)
    bm.faces.new(list(reversed(R)))
    n = len(PROFILE)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((L[i], R[i], R[j], L[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bw = bm.edges.layers.float.get("bevel_weight_edge") or bm.edges.layers.float.new("bevel_weight_edge")
    slope_edges = {frozenset((L[2], R[2])), frozenset((L[3], R[3]))}
    for e in bm.edges:
        e[bw] = SLOPE_EDGE_W if frozenset(e.verts) in slope_edges else 1.0
    o = obj_from_bm("body_shell", bm, M["cream"])
    bv = o.modifiers.new("bevel", "BEVEL"); bv.width = SHELL_BEVEL; bv.segments = 8; bv.limit_method = 'WEIGHT'; bv.harden_normals = False
    o.modifiers.new("wn", "WEIGHTED_NORMAL").keep_sharp = False
    P["body_shell"] = o

    # 2 base plate + feet
    P["base_plate"] = obj_from_bm("base_plate", rbox(2 * BASE_HW - 0.016, 0.196, Z0 - 0.0015, (0, -0.001, (Z0 - 0.0015) / 2 + 0.0015), bevel=0.0015), M["dark"])
    feet = bmesh.new()
    for fx in (-1, 1):
        for fy in (-1, 1):
            f = lathe([(0.0075, 0.0), (0.0085, 0.001), (0.0085, 0.003), (0.0070, 0.0035)], seg=24)
            bmesh.ops.translate(f, vec=(fx * 0.088, fy * 0.084 - 0.001, 0), verts=f.verts)
            tmp = bpy.data.meshes.new("tmp"); f.to_mesh(tmp); f.free(); feet.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    P["feet"] = obj_from_bm("feet", feet, M["dark"])

    # 3 number plate, 4 finger wheel, 5 centre label, 6 finger stop  (built in the dial frame, then placed)
    o = obj_from_bm("number_plate", lathe([(R_PLATE, -0.010), (R_PLATE, 0.0018), (R_PLATE - 0.0008, 0.0025), (0, 0.0025)], seg=72), M["dial"])
    transform(o, DIAL_M); P["number_plate"] = o
    # the cream bezel the dial sits down into; its skirt runs into the shell so no edge floats over the curve
    o = obj_from_bm("dial_bezel", lathe([(R_PLATE + 0.0006, -0.012), (R_PLATE + 0.0006, 0.0034), (R_PLATE + 0.0018, 0.0050),
                                          (R_BEZEL - 0.0018, 0.0050), (R_BEZEL, 0.0030), (R_BEZEL + 0.0012, -0.012)], seg=96, cap_top=False, cap_bottom=False), M["cream"])
    transform(o, DIAL_M); P["dial_bezel"] = o
    marks = bmesh.new()                       # digit marks on the plate, seen through each hole
    for a in HOLE_ANGS:
        d = lathe([(0.0019, 0.0024), (0.0019, 0.0028), (0, 0.0028)], seg=16, cap_bottom=False)
        bmesh.ops.translate(d, vec=(HOLE_RING * math.cos(a), HOLE_RING * math.sin(a), 0), verts=d.verts)
        tmp = bpy.data.meshes.new("tmp"); d.to_mesh(tmp); d.free(); marks.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    o = obj_from_bm("digit_marks", marks, M["label"])
    transform(o, DIAL_M); P["digit_marks"] = o

    o = obj_from_bm("finger_wheel", annulus(R_HUB, R_WHEEL, 0.0032, 0.0068, seg=96), M["wheel"])
    for k, a in enumerate(HOLE_ANGS):
        c = bpy.data.objects.new(f"_hole{k}", bpy.data.meshes.new(f"_hole{k}"))
        hb = lathe([(HOLE_R, -0.01), (HOLE_R, 0.02)], seg=32)
        bmesh.ops.translate(hb, vec=(HOLE_RING * math.cos(a), HOLE_RING * math.sin(a), 0), verts=hb.verts)
        hb.to_mesh(c.data); hb.free()
        phone_coll().objects.link(c)
        bo = o.modifiers.new(f"hole{k}", "BOOLEAN"); bo.object = c; bo.operation = 'DIFFERENCE'; bo.solver = 'EXACT'
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear(); old = o.data; o.data = me; bpy.data.meshes.remove(old)
    for k in range(10):
        bpy.data.objects.remove(bpy.data.objects[f"_hole{k}"], do_unlink=True)
    while len(o.data.materials) > 1:
        o.data.materials.pop()
    for p in o.data.polygons:
        p.use_smooth = False; p.material_index = 0
    transform(o, DIAL_M); P["finger_wheel"] = o

    o = obj_from_bm("centre_label", lathe([(R_HUB - 0.0006, 0.0025), (R_HUB - 0.0006, 0.0060), (R_HUB - 0.0016, 0.0064), (0, 0.0064)], seg=64), M["label"])
    transform(o, DIAL_M); P["centre_label"] = o
    band = rbox(2 * (R_HUB - 0.0035), 0.0062, 0.0003, (0, 0, 0.00655), bevel=0.0001, seg=1)   # the stripe across the label
    o = obj_from_bm("label_band", band, M["dial"], smooth=False)
    transform(o, DIAL_M); P["label_band"] = o

    # finger stop: a steel hook mounted on the plate rim outside the wheel, reaching in over the hole circle
    ca, sa = math.cos(STOP_ANG), math.sin(STOP_ANG)
    r_foot = (R_WHEEL + R_PLATE) / 2
    z_arm = 0.0068 + 0.0008 + 0.0013
    rs = [r_foot + 0.0012 - (r_foot + 0.0012 - (HOLE_RING - 0.0060)) * k / 14 for k in range(15)]   # tip crosses the hole path
    arm_pts = [Vector((r * ca, r * sa, z_arm)) for r in rs]
    tip_sc = [1.0 if k < 11 else max(0.35, math.sqrt(max(0.0, 1 - ((k - 10) / 4.2) ** 2))) for k in range(15)]
    bm = sweep(arm_pts, rrect(2 * STOP_HALF_W, 0.0026, 0.0011, 3), scales=tip_sc)   # u across the arm, v up off the wheel
    foot = rbox(0.0029, 2 * STOP_HALF_W, z_arm - 0.0025 + 0.0006, (0, 0, 0), bevel=0.0007, seg=2)
    bmesh.ops.transform(foot, matrix=Matrix.Translation((r_foot * ca, r_foot * sa, (0.0025 + z_arm + 0.0006) / 2)) @ Matrix.Rotation(STOP_ANG, 4, 'Z'), verts=foot.verts)
    tmp = bpy.data.meshes.new("tmp"); foot.to_mesh(tmp); foot.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    o = obj_from_bm("finger_stop", bm, M["steel"])
    transform(o, DIAL_M)
    P["finger_stop"] = o

    # 7 cradle: one soft hump grown out of the deck, rising close under the handle, and two U-horns that cup it
    DECK = Z0 + ZTOP
    PROF = [(1.00, -0.30), (0.98, 0.0), (0.93, 0.25), (0.86, 0.50), (0.78, 0.72), (0.66, 0.88), (0.48, 0.97), (0.24, 1.0), (0.0, 1.0)]
    half = [(u, f) for u, f in PROF] + [(-u, f) for u, f in reversed(PROF[:-1])]
    xe = HORN_X - 0.008                         # the hump ends inside the horn bases, short of the plungers
    xs = [xe * (2 * k / 32 - 1) for k in range(33)]
    bm = bmesh.new()
    rings = []
    for x in xs:
        z_base = DECK - 0.009
        z_top = grip_z(abs(x)) - GRIP_H / 2 - 0.0035 - 0.0060 * smooth((abs(x) - (xe - 0.014)) / 0.014)   # eases down into the horn bases
        taper = 1.0 - 0.32 * smooth((abs(x) - (xe - 0.020)) / 0.020)     # narrows into the horn bases
        rings.append([bm.verts.new((x, HS_Y + u * HUMP[1] * taper, z_base + f * (z_top - z_base))) for u, f in half])
    m = len(half)
    for a, b in zip(rings, rings[1:]):
        for k in range(m):
            q = (k + 1) % m
            bm.faces.new((a[k], a[q], b[q], b[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm("cradle_hump", bm, M["cream"])
    o.modifiers.new("smooth", "SUBSURF").levels = 1
    P["cradle_hump"] = o

    bm = bmesh.new()
    SX, SY = 0.0068, 0.0068                     # plunger gap half sizes (x, y)
    c = FORK_FLOOR + 0.0006 + GRIP_H / 2        # handle centre height at the forks
    GAP = 0.0012                                # the U follows the handle's own rounded section, this far off it
    hw, hh, Rr = GRIP_W / 2 + GAP + HORN_T / 2, GRIP_H / 2 + GAP + HORN_T / 2, 0.011 + GAP + HORN_T / 2
    u_bottom = c - hh - HORN_T / 2
    top = c + 0.007
    for sx in (-1, 1):
        cx = sx * HORN_X
        for side in (-1, 1):                    # front half and back half of the U, with the plunger between
            pts = [Vector((cx, HS_Y + side * hw, top - (top - (c - (hh - Rr))) * k / 14)) for k in range(14)]
            for k in range(0, 13):              # round the corner
                th = math.pi / 2 * k / 12
                yy = (hw - Rr) + Rr * math.cos(th)
                if yy < SY + 0.0004:            # stop at the plunger gap
                    break
                pts.append(Vector((cx, HS_Y + side * yy, c - (hh - Rr) - Rr * math.sin(th))))
            yb = hw - Rr
            for k in range(1, 6):               # along the bottom toward the plunger gap
                y = yb - (yb - (SY + 0.0002)) * k / 5
                if y > SY:
                    pts.append(Vector((cx, HS_Y + side * y, c - hh)))
            sc_ = [0.55, 0.8, 0.93] + [1.0] * (len(pts) - 3)   # rounded tips
            bm2 = sweep(pts, rrect(2 * FORK_HX, HORN_T, 0.0026, 3), scales=sc_, fixed_u=Vector((1, 0, 0)))
            tmp = bpy.data.meshes.new("tmp"); bm2.to_mesh(tmp); bm2.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
        base = rbox(2 * FORK_HX + 0.002, 2 * (hw + HORN_T / 2), u_bottom + 0.0005 - (DECK - 0.006), (cx, HS_Y, (u_bottom + 0.0005 + DECK - 0.006) / 2), bevel=0.0055, seg=5)
        tmp = bpy.data.meshes.new("tmp"); base.to_mesh(tmp); base.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    P["cradle_forks"] = obj_from_bm("cradle_forks", bm, M["cream"])

    # 8 plungers, pressed down by the handset between the halves of each U
    p_bottom = u_bottom + 0.0005 + 0.0003
    for side, sx in (("L", -1), ("R", 1)):
        P[f"plunger_{side}"] = obj_from_bm(f"plunger_{side}", rbox(2 * SX - 0.0016, 2 * SY - 0.0030, PLUNGER_REST_TOP - p_bottom, (sx * HORN_X, HS_Y, (PLUNGER_REST_TOP + p_bottom) / 2), bevel=0.0012), M["steel"])

    # 9 handset grip: rounded section swept along an arch
    # the grip runs a little past each cup and closes in a rounded end, so no flat cut shows
    END = CUP_X + 0.010
    xs = [END * (i / 30 - 1) for i in range(61)]
    end_round = [x for x in (END - 0.010 + 0.010 * math.sin(math.pi / 2 * k / 6) for k in range(1, 7))]
    xs = sorted(set([x for x in xs if abs(x) < END - 0.010] + end_round + [-x for x in end_round]))
    pts = [Vector((x, HS_Y, grip_z(min(abs(x), CUP_X)) - max(0.0, abs(x) - CUP_X) * 0.15)) for x in xs]
    scales = [max(0.18, math.sqrt(max(0.0, 1 - ((abs(x) - (END - 0.010)) / 0.010) ** 2))) if abs(x) > END - 0.010 else 1.0 for x in xs]
    sec = [(v, u) for u, v in rrect(GRIP_H, GRIP_W, 0.011, 4)]
    P["handset_grip"] = obj_from_bm("handset_grip", sweep(pts, sec, scales=scales), M["cream"])

    # 10/11 earpiece and mouthpiece: bells hanging under the grip ends, open face down with a perforated cap
    for name, sx in (("earpiece", 1), ("mouthpiece", -1)):
        prof = [(CUP_R - 0.002, 0.0), (CUP_R, 0.002), (CUP_R, 0.007), (CUP_R - 0.003, 0.015), (0.021, 0.023), (0.0155, 0.029), (0.0148, CUP_H + 0.004)]
        bm = lathe(prof, seg=48)
        o = obj_from_bm(name, bm, M["cream"])
        transform(o, Matrix.Translation((sx * CUP_X, HS_Y, CUP_BOTTOM)))
        P[name] = o
        cap = lathe([(CUP_R - 0.003, -0.0012), (CUP_R - 0.003, 0.0004), (0, 0.0004)], seg=48)
        oc = obj_from_bm(name + "_cap", cap, M["label"])
        transform(oc, Matrix.Translation((sx * CUP_X, HS_Y, CUP_BOTTOM)))
        P[name + "_cap"] = oc

    # 12 coiled cord. Both ends found by ray-casting the real surfaces, so the strain reliefs sit on them.
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()

    def hit(o, origin, direction):
        oe = o.evaluated_get(dg)
        inv = oe.matrix_world.inverted()
        ok, loc, nrm, _ = oe.ray_cast(inv @ origin, (inv.to_3x3() @ direction).normalized())
        assert ok, f"cord anchor ray missed {o.name}"
        return oe.matrix_world @ loc, (oe.matrix_world.to_3x3() @ nrm).normalized()

    h_pt, h_n = hit(P["mouthpiece"], Vector((-0.2, HS_Y, CUP_BOTTOM + 0.010)), Vector((1, 0, 0)))
    b_pt, b_n = hit(P["body_shell"], Vector((-0.2, CORD_ENTRY_Y, CORD_ENTRY_Z)), Vector((1, 0, 0)))
    RELIEF = 0.011
    reliefs = []
    for name, pt, nrm in (("relief_handset", h_pt, h_n), ("relief_body", b_pt, b_n)):
        o = obj_from_bm(name, lathe([(0.0046, -0.0015), (0.0046, 0.006), (0.0036, 0.0095), (0.0029, RELIEF)], seg=20), M["cream"])
        transform(o, Matrix.Translation(pt) @ nrm.to_track_quat('Z', 'Y').to_matrix().to_4x4())
        P[name] = o
        reliefs.append(pt + nrm * (RELIEF - 0.002))
    tip_h, tip_b = reliefs
    LEAD = 0.010     # straight wire out of each relief before the coil starts
    need = CORD_COIL / (1 - 2 * CORD_WIRE / CORD_PITCH)        # tighter bends make the inner turns cross
    low = Vector(CORD_LOW)
    tan = Vector(CORD_LOW_TAN).normalized()
    a0, a1 = tip_h + h_n * LEAD, tip_b + b_n * LEAD
    dense = [tip_h] + bezier(a0, a0 + h_n * CORD_H[0], low - tan * CORD_H[1], low, 80)
    dense += bezier(low, low + tan * CORD_H[2], a1 + b_n * CORD_H[3], a1, 80)[1:] + [tip_b]
    path = resample(dense, CORD_STEP)
    globals()["CORD_PATH"] = path
    low_i = min(range(len(path)), key=lambda i: (path[i] - low).length)
    n = len(path)
    lens = [0.0]
    for a, b in zip(path, path[1:]):
        lens.append(lens[-1] + (b - a).length)
    Ltot = lens[-1]
    # rotation-minimising frames, so the coil phase never jumps
    T = [(path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized() for i in range(n)]
    N = [T[0].cross(Vector((0, 0, 1))).normalized()]
    for i in range(1, n):
        q = T[i - 1].rotation_difference(T[i])
        N.append((q @ N[-1]).normalized())
    min_r = bend_radius(path[int(LEAD / CORD_STEP):len(path) - int(LEAD / CORD_STEP)], 0.006)
    strand = []
    for i, p in enumerate(path):
        s = lens[i]
        ramp = max(0.0, min(1.0, (s - LEAD) / 0.016, (Ltot - s - LEAD) / 0.016))   # coil opens gently after the straight lead
        ang = 2 * math.pi * s / CORD_PITCH
        B = T[i].cross(N[i])
        strand.append(p + (N[i] * math.cos(ang) + B * math.sin(ang)) * CORD_COIL * ramp)
    bm = sweep(strand, circle(CORD_WIRE, 8))
    o = obj_from_bm("coiled_cord", bm, M["cream"])
    o["path_len"] = Ltot
    o["low_index"] = low_i            # from here to the body the cord lies still on the counter
    o["rings_per_turn"] = CORD_PITCH / CORD_STEP
    o["min_bend_radius_mm"] = round(min_r * 1000, 1)
    print("cord: length mm", round(Ltot * 1000), "min bend radius mm", round(min_r * 1000, 1), "needed", round(need * 1000, 1))
    P["coiled_cord"] = o
    return P


BONES = {  # name: (head, tail, parent)
    "root": (Vector((0, 0, 0)), Vector((0, 0, 0.05)), None),
    "cord_floor": (Vector((-0.15, -0.04, 0)), Vector((-0.15, -0.04, 0.03)), None),   # never moves: the cord lying on the counter
    "dial": (DIAL_M @ Vector((0, 0, 0)), DIAL_M @ Vector((0, 0, 0.03)), "root"),
    "handset": (HS_PIVOT, HS_PIVOT + Vector((0, 0, 0.04)), "root"),
    "plunger_L": (Vector((-HORN_X, HS_Y, PLUNGER_REST_TOP - PLUNGER_H)), Vector((-HORN_X, HS_Y, PLUNGER_REST_TOP + 0.01)), "root"),
    "plunger_R": (Vector((HORN_X, HS_Y, PLUNGER_REST_TOP - PLUNGER_H)), Vector((HORN_X, HS_Y, PLUNGER_REST_TOP + 0.01)), "root"),
}
RIGID = {"body_shell": "root", "base_plate": "root", "feet": "root", "number_plate": "root", "digit_marks": "root", "centre_label": "root", "label_band": "root",
         "finger_stop": "root", "cradle_hump": "root", "cradle_forks": "root", "dial_bezel": "root", "relief_body": "root", "finger_wheel": "dial",
         "plunger_L": "plunger_L", "plunger_R": "plunger_R", "handset_grip": "handset", "earpiece": "handset",
         "mouthpiece": "handset", "earpiece_cap": "handset", "mouthpiece_cap": "handset", "relief_handset": "handset"}


def build_rig(P):
    arm_d = bpy.data.armatures.new("phone_rig")
    arm = bpy.data.objects.new("phone_rig", arm_d)
    phone_coll().objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (h, t, par) in BONES.items():
        b = arm_d.edit_bones.new(name)
        b.head, b.tail = h, t
        b.roll = 0
        if par:
            b.parent = arm_d.edit_bones[par]
    bpy.ops.object.mode_set(mode='OBJECT')
    for name, bone in RIGID.items():
        o = P[name]
        mw = o.matrix_world.copy()
        o.parent = arm; o.parent_type = 'BONE'; o.parent_bone = bone
        o.matrix_world = mw
    # cord: skinned, weight from body end (root) to handset end (handset) along the strand
    cord = P["coiled_cord"]
    cord.parent = arm
    gr, gh, gf = (cord.vertex_groups.new(name=n) for n in ("root", "handset", "cord_floor"))
    start = Vector((-CUP_X - 0.006, HS_Y - 0.004, CUP_BOTTOM + 0.004))
    vs = cord.data.vertices
    # parametrise by order along the strand (vertices are emitted ring by ring)
    n = len(vs)
    low = cord["low_index"]
    rings = n // 8
    for i in range(n):
        ring = i // 8                             # rings run handset end -> body end
        if ring <= low:                           # hanging part: handset -> floor
            w = max(0.0, 1 - ring / low); w = w * w * (3 - 2 * w)
            gh.add([i], w, 'REPLACE'); gf.add([i], 1 - w, 'REPLACE')
        else:                                     # counter part: floor -> body end (rides the body when it rattles)
            w = (ring - low) / max(1, rings - 1 - low); w = max(0.0, min(1.0, (w - 0.55) / 0.45)); w = w * w * (3 - 2 * w)
            gr.add([i], w, 'REPLACE'); gf.add([i], 1 - w, 'REPLACE')
    md = cord.modifiers.new("rig", "ARMATURE"); md.object = arm
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    arm["handset_lift"] = 0.0; arm["dial"] = 0.0; arm["ring"] = 0.0
    return arm


# ---------------------------------------------------------------- pose from the three parameters
LIFT_UP, LIFT_FWD, LIFT_TILT = 0.075, -0.030, math.radians(14)


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def pose(arm, handset_lift=0.0, dial=0.0, ring=0.0, ring_t=0.0):
    pbs = arm.pose.bones
    for pb in pbs:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()            # parent poses must be current before setting a matrix below
    # dial: clockwise seen from the front = negative about the dial axis (bone Y)
    pbs["dial"].rotation_quaternion = Quaternion((0, 1, 0), -DIAL_MAX * max(0.0, min(1.0, dial)))
    # handset: rises off the horns, swings toward the viewer, earpiece end tips up
    s1 = smooth(handset_lift / 0.4)              # straight up, clear of the prongs
    s2 = smooth((handset_lift - 0.3) / 0.7)      # then toward the viewer, earpiece end tipping up
    rest = arm.data.bones["handset"].matrix_local
    R = Matrix.Rotation(-LIFT_TILT * s2, 4, 'Y') @ Matrix.Rotation(math.radians(-10) * s2, 4, 'X')
    up = (PRONG_RISE + 0.008) * s1 + (LIFT_UP - PRONG_RISE - 0.008) * s2
    Mw = Matrix.Translation(HS_PIVOT + Vector((0, LIFT_FWD * s2, up))) @ R @ Matrix.Translation(-HS_PIVOT) @ rest
    pbs["handset"].matrix = Mw
    # plungers follow the handset up during the first quarter of the lift
    rise = PLUNGER_RISE * smooth(handset_lift / 0.35)
    for side in ("plunger_L", "plunger_R"):
        pbs[side].location = (0, rise, 0)          # bone Y = world Z
    # ring: small fast rock of the whole set
    if ring:   # a rattle: tiny hops (never below the counter) and a twist about the vertical
        ph = ring_t * 2 * math.pi * 7
        pbs["root"].location = (0, 0.0011 * ring * abs(math.sin(ph)), 0)       # bone Y = world Z
        pbs["root"].rotation_quaternion = Quaternion((0, 1, 0), math.radians(1.0) * ring * math.sin(ph * 0.5))
        # the handset chatters in its forks, only ever upward, out of step with the body
        jig = 0.0016 * ring * abs(math.sin(ph * 1.5 + 0.9))
        h = pbs["handset"]
        h.location = (h.location[0], h.location[1] + jig, h.location[2])
    bpy.context.view_layer.update()


def build():
    reset()
    P = build_parts()
    arm = build_rig(P)
    pose(arm)
    return P, arm


if True:  # runs on exec()
    PARTS, ARM = build()
    print("built", len(PARTS), "parts; dial max deg", round(math.degrees(DIAL_MAX), 1), "cup bottom", round(CUP_BOTTOM, 4))
