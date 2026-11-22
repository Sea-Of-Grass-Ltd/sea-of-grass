"""The Smoked-Glass Till: the hero register for the Websites page, replacing the wooden toy (Tristan 2026-11-22, after
people called the toy "clipart"). Same classic till outline (keys, drawer, pop-up price flags), tightened, with small
crisp bevels. A smoked glass shell shows a few honest parts inside: the key stems on one linkage shaft, the drawer on
its two rails, and the push rods that lift the price flags. Brushed aluminium keys, gold numbers on the flags, one rose
light. No orange, no sky-blue, no gradients, no particles.

Run live in Blender:  exec(open(PATH).read(), g)
Local frame like build_register.py: origin at the centre of the base on the desk, Z up, front -Y. The rig object is
`till_rig`; the page swaps its parts into `register_rig`, so the crouch, leap and morph carry over untouched. Part names
follow the old register (housing, drawer, body, key_rc, total_key, display_hood, display_window, price, crank, feet).
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix

# ---- sizes (m): the old register's footprint (0.25 x 0.21) and height (0.27), tightened
PL_W, PL_D, PL_H = 0.236, 0.196, 0.010      # graphite plinth
FOOT_H = 0.004
Z0 = FOOT_H + PL_H                         # top of the plinth
SH_W = 0.224                               # glass shell width
YF, YB = -0.092, 0.088                     # shell front and back
Z_DR = Z0 + 0.058                          # top of the drawer section
Z_TOP = 0.172                              # top of the shell at the back
Y_DECK = 0.030                             # where the key deck meets the flat top
HOOD = (0.190, 0.046, 0.056)               # flag hood: width, depth, height
HOOD_Y = 0.057                             # hood centre y: it stands wholly on the flat top, behind the deck
BEV = 0.0009                               # the crisp machined edge
ROSE = (0.69, 0.30, 0.27)                  # #d8928a in linear


def coll():
    c = bpy.data.collections.get("till")
    if c is None:
        c = bpy.data.collections.new("till"); bpy.context.scene.collection.children.link(c)
    for o in list(c.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    return c


TC = coll()


def mat(name, col, metal=0.0, rough=0.5, emit=None, alpha=None, aniso=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if "Anisotropic" in b.inputs:
        b.inputs["Anisotropic"].default_value = aniso
    if emit:
        b.inputs["Emission Color"].default_value = (*emit[0], 1); b.inputs["Emission Strength"].default_value = emit[1]
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
        b.inputs["Specular IOR Level"].default_value = 0.9
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            m.blend_method = 'BLEND'
        m.use_backface_culling = False
    return m


M = {
    "glass": mat("tl_glass", (0.006, 0.005, 0.009), rough=0.04, alpha=0.70),
    "alu": mat("tl_alu", (0.90, 0.90, 0.92), metal=1.0, rough=0.24, aniso=0.6),
    "keytop": mat("tl_keytop", (0.84, 0.84, 0.86), metal=0.92, rough=0.34, aniso=0.5),
    "satin": mat("tl_satin", (0.42, 0.42, 0.45), metal=1.0, rough=0.42, aniso=0.5),
    "graphite": mat("tl_graphite", (0.022, 0.022, 0.028), metal=0.25, rough=0.48),
    "flag": mat("tl_flag", (0.016, 0.015, 0.020), metal=0.5, rough=0.32),
    "gold": mat("tl_gold", (0.72, 0.48, 0.18), metal=1.0, rough=0.30),
    "rose": mat("tl_rose", ROSE, emit=(ROSE, 40.0)),
    "window": mat("tl_window", (0.012, 0.011, 0.016), rough=0.03, alpha=0.22),
}
P = {}


def mk(name, bm, m, parent=None, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = False
    o = bpy.data.objects.new(name, me); TC.objects.link(o)
    o.location = loc
    if parent:
        o.parent = parent
    P[name] = o
    return o


def bevel(bm, w=BEV, seg=2):
    bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=w, segments=seg, affect='EDGES', profile=0.5)


def box(sx, sy, sz, c=(0, 0, 0), w=BEV):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    if w:
        bevel(bm, w)
    return bm


def prism(profile, x0, x1, w=BEV):
    """a side profile [(y, z), ...] pushed across x from x0 to x1"""
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in profile]
    b = [bm.verts.new((x1, y, z)) for y, z in profile]
    bm.faces.new(a[::-1]); bm.faces.new(b)
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((a[i], a[j], b[j], b[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if w:
        bevel(bm, w)
    return bm


def rod(p0, p1, r, seg=12):
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d.length)
    rot = d.normalized().to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((p0 + p1) / 2) @ rot, verts=bm.verts)
    return bm


def text_bm(s, size, depth):
    cu = bpy.data.curves.new("_t", 'FONT'); cu.body = s; cu.size = size; cu.extrude = depth
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    o = bpy.data.objects.new("_t", cu); bpy.context.scene.collection.objects.link(o)
    dg = bpy.context.evaluated_depsgraph_get(); me = o.evaluated_get(dg).to_mesh()
    bm = bmesh.new(); bm.from_mesh(me)
    o.evaluated_get(dg).to_mesh_clear(); bpy.data.objects.remove(o); bpy.data.curves.remove(cu)
    return bm


rig = bpy.data.objects.new("till_rig", None); TC.objects.link(rig)
old = bpy.data.objects.get("register_rig")
if old:
    rig.matrix_world = old.matrix_world.copy()

# 1 housing: the graphite plinth (the shell stands on it)
mk("housing", box(PL_W, PL_D, PL_H, (0, 0, FOOT_H + PL_H / 2), w=0.0012), M["graphite"], rig)

# 3 feet: four low machined pucks
bm = bmesh.new()
for sx in (-1, 1):
    for sy in (-1, 1):
        t = rod((sx * (PL_W / 2 - 0.022), sy * (PL_D / 2 - 0.020), 0), (sx * (PL_W / 2 - 0.022), sy * (PL_D / 2 - 0.020), FOOT_H + 0.0005), 0.010, 20)
        me = bpy.data.meshes.new("_f"); t.to_mesh(me); t.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
mk("feet", bm, M["graphite"], rig)

# 4 body: the smoked glass shell, one prism: drawer section, sloped key deck, flat top
DECK = [(YF, Z0), (YB, Z0), (YB, Z_TOP), (Y_DECK, Z_TOP), (YF, Z_DR)]
mk("body", prism(DECK, -SH_W / 2, SH_W / 2, w=0.0015), M["glass"], rig)
deck_a = math.atan2(Z_TOP - Z_DR, Y_DECK - YF)          # the key deck's slope

def add(dst, t):
    me = bpy.data.meshes.new("_s"); t.to_mesh(me); t.free(); dst.from_mesh(me); bpy.data.meshes.remove(me)


# the shell's edges in polished aluminium, so its outline reads on the navy page
trim = bmesh.new()
for sx in (-1, 1):
    for i in range(len(DECK)):
        (y0, z0), (y1, z1) = DECK[i], DECK[(i + 1) % len(DECK)]
        add(trim, rod((sx * SH_W / 2, y0, z0), (sx * SH_W / 2, y1, z1), 0.0011, 8))
for y, z in DECK:
    add(trim, rod((-SH_W / 2, y, z), (SH_W / 2, y, z), 0.0011, 8))
mk("shell_trim", trim, M["alu"], rig)

# 7 the flag hood: a low, wide smoked window standing on the flat top behind the deck, a graphite frame and back plate,
# the one rose light along the inside of its top front edge, shining down on the flags
hw, hd, hh = HOOD
mk("display_window", box(hw, hd, hh, (0, HOOD_Y, Z_TOP + hh / 2), w=0.0012), M["window"], rig)
fr = box(hw + 0.006, hd + 0.006, 0.006, (0, HOOD_Y, Z_TOP + hh + 0.003), w=0.0008)
add(fr, box(hw + 0.006, hd + 0.006, 0.004, (0, HOOD_Y, Z_TOP + 0.002), w=0.0008))
add(fr, box(hw - 0.004, 0.003, hh - 0.002, (0, HOOD_Y + hd / 2 - 0.004, Z_TOP + hh / 2), w=0.0005))
mk("display_hood", fr, M["graphite"], rig)
mk("rose_light", box(hw - 0.012, 0.004, 0.0032, (0, HOOD_Y - hd / 2 + 0.0045, Z_TOP + hh - 0.0035), w=0.0006), M["rose"], rig)

# 5 keys: 4 rows x 4 round aluminium keys stepping up the deck, each on a stem through a slot, down to its column lever
deck_n = Vector((0, -math.sin(deck_a), math.cos(deck_a)))     # out of the deck
deck_u = Vector((0, math.cos(deck_a), math.sin(deck_a)))      # up the deck
KP = 0.042                                                     # pitch across: one column per price flag above it
cols = [(c - 1.5) * KP for c in range(4)]
rows = [0.024, 0.058, 0.092, 0.126]                            # distance up the deck from its front edge
front = Vector((0, YF, Z_DR))
STEM = 0.030                                                   # how far under the glass the levers run, clear of the deck
stems = bmesh.new(); slots = bmesh.new()
for r, d in enumerate(rows):
    for c, x in enumerate(cols):
        base = front + deck_u * d + Vector((x, 0, 0))
        top = base + deck_n * 0.013                             # the cap stands 1 cm off the glass on its stem
        cap = bmesh.new()
        bmesh.ops.create_cone(cap, cap_ends=True, segments=32, radius1=0.0112, radius2=0.0104, depth=0.006)
        bevel(cap, 0.0010)
        bmesh.ops.transform(cap, matrix=Matrix.Translation(top) @ Matrix.Rotation(deck_a, 4, 'X'), verts=cap.verts)
        name = "total_key" if (r, c) == (0, 3) else f"key_{r}{c}"
        mk(name, cap, M["keytop"], rig)
        add(stems, rod(top - deck_n * 0.003, base - deck_n * STEM, 0.0016, 10))
for r, d in enumerate(rows):                                   # a small grommet where each stem passes the glass
    for x in cols:
        g_ = bmesh.new()
        bmesh.ops.create_cone(g_, cap_ends=True, segments=16, radius1=0.0024, radius2=0.0024, depth=0.0010)
        bmesh.ops.transform(g_, matrix=Matrix.Translation(front + deck_u * d + deck_n * 0.0007 + Vector((x, 0, 0))) @ Matrix.Rotation(deck_a, 4, 'X'), verts=g_.verts)
        add(slots, g_)
mk("key_stems", stems, M["alu"], rig)
mk("deck_slots", slots, M["graphite"], rig)

# the price flags: four black plates in the hood, one over each key column, gold numbers "$100"
FL_W, FL_H = KP - 0.006, 0.030
FY = HOOD_Y - 0.004
FZ = Z_TOP + hh / 2 + 0.002                      # raised: the sale is rung up
plates = bmesh.new(); digits = bmesh.new()
for x, ch in zip(cols, "$100"):
    add(plates, box(FL_W, 0.0025, FL_H, (x, FY, FZ), w=0.0005))
    t = text_bm(ch, 0.024, 0.0006)
    bmesh.ops.transform(t, matrix=Matrix.Translation((x, FY - 0.0019, FZ)) @ Matrix.Rotation(math.radians(90), 4, 'X'), verts=t.verts)
    add(digits, t)
mk("price_flags", plates, M["flag"], rig)
mk("price", digits, M["gold"], rig)

# the linkage, one chain per column: stem -> lever under the deck -> pivot on the cross shaft -> push rod -> flag
LEV_END = (FY - YF - math.sin(deck_a) * STEM) / math.cos(deck_a)   # the shaft lands right under the flags
LINK = front + deck_u * LEV_END - deck_n * STEM                # the cross shaft runs through the levers' back ends
lev = bmesh.new()
for x in cols:
    a_ = front + deck_u * (rows[0] - 0.010) - deck_n * STEM + Vector((x, 0, 0))
    b_ = LINK + Vector((x, 0, 0))
    t = box(0.0026, (b_ - a_).length, 0.0045, (0, 0, 0), w=0.0004)
    bmesh.ops.transform(t, matrix=Matrix.Translation((a_ + b_) / 2) @ Matrix.Rotation(deck_a, 4, 'X'), verts=t.verts)
    add(lev, t)
    add(lev, rod((x, FY, LINK.z), (x, FY, FZ - FL_H / 2), 0.0013, 8))      # the push rod up to its flag
add(lev, rod((-0.098, LINK.y, LINK.z), (0.098, LINK.y, LINK.z), 0.0030, 16))  # the cross shaft
mk("linkage", lev, M["alu"], rig)
fb = bmesh.new()                                               # the shaft's two side frames, standing on the plinth
for sx in (-1, 1):
    add(fb, box(0.003, 0.030, LINK.z - Z0 + 0.008, (sx * 0.0995, LINK.y, (Z0 + LINK.z + 0.008) / 2), w=0.0005))
mk("frame_plates", fb, M["graphite"], rig)

# 2 drawer: a graphite tray on two aluminium rails, a brushed aluminium front with a slot pull, flush with the shell
DR_W, DR_H, DR_D = SH_W - 0.034, Z_DR - Z0 - 0.012, 0.150
dz = Z0 + 0.004 + DR_H / 2
drawer = bpy.data.objects.new("drawer_pivot", None); TC.objects.link(drawer); drawer.parent = rig
tray = box(DR_W, DR_D, DR_H * 0.7, (0, YF + DR_D / 2 + 0.004, Z0 + 0.004 + DR_H * 0.35), w=0.0008)
for sx in (-1, 1):                                             # runners on the tray's sides, riding the rails
    add(tray, box(0.003, DR_D - 0.02, 0.005, (sx * (DR_W / 2 + 0.0015), YF + DR_D / 2 + 0.004, Z0 + 0.020), w=0.0004))
mk("drawer", tray, M["graphite"], drawer)
mk("drawer_front", box(SH_W - 0.010, 0.006, DR_H + 0.006, (0, YF - 0.0015, dz), w=0.0010), M["satin"], drawer)
mk("drawer_pull", box(0.070, 0.0018, 0.0035, (0, YF - 0.0050, dz + 0.010), w=0.0004), M["alu"], drawer)
rl = bmesh.new()
for sx in (-1, 1):
    add(rl, rod((sx * (DR_W / 2 + 0.0055), YF + 0.006, Z0 + 0.020), (sx * (DR_W / 2 + 0.0055), YB - 0.006, Z0 + 0.020), 0.0026, 12))
mk("drawer_rails", rl, M["alu"], rig)

# 8 crank: an aluminium hub, arm and grip on the right side
cz, cy = Z0 + 0.095, 0.040
ck = rod((SH_W / 2, cy, cz), (SH_W / 2 + 0.010, cy, cz), 0.013, 24)
for t in (box(0.005, 0.009, 0.050, (SH_W / 2 + 0.012, cy, cz - 0.020), w=0.0008),
          rod((SH_W / 2 + 0.014, cy, cz - 0.042), (SH_W / 2 + 0.034, cy, cz - 0.042), 0.0055, 16)):
    me = bpy.data.meshes.new("_c"); t.to_mesh(me); t.free(); ck.from_mesh(me); bpy.data.meshes.remove(me)
mk("crank", ck, M["alu"], rig)

old_c = bpy.data.collections.get("register")
print("till built:", len(P), "parts", [o.name for o in TC.objects][:30])
