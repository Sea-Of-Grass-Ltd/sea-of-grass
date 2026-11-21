"""A toy cash register for the Websites stage, built the AnyMachine way (like the phone): a parts list first, real
mechanisms, one 0-1 control per move, and an overlap sweep (check_register below). Shape after Tristan's reference
(2026-11-20): a wooden toy till with a plinth on bun feet, a drawer box, a rounded hump with side cheeks, 3 x 3 mushroom
keys (the right column dark), a sign on two posts and a crank on the right.
Run live in Blender after build_phone.py, in the same globals (uses its helpers):  exec(open(PATH).read(), g)
Local frame: origin at the centre of the base on the desk, Z up, front -Y. The rig object `register_rig` is what the
stage moves into place.

Parts (bone):
  1 housing: plinth, the drawer box (floor, back, sides, top) and the ledge the hump sits on (root)
  2 drawer: tray, framed front panel and a round wooden knob, sliding out of the box (drawer)
  3 feet x4, round buns under the plinth (root)
  4 body: the rounded hump with raised side cheeks, a socket for every key (root)
  5 keys: 3 x 3 mushroom keys on stems in their sockets, the right column dark (root)
  6 total key: the bottom-right dark key, pressing down its socket (total_key)
  7 sign: frame on two posts (display_hood), cream panel (display_window), painted price (price) (root)
  8 crank: hub, arm and wooden handle on the right cheek (root)
Controls: drawer_open (the drawer slides 9 cm out), total_key (the key goes down 4 mm).
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion

FOOT_H = 0.008
PL_W, PL_D, PL_H = 0.25, 0.21, 0.014           # plinth
RW, RD = 0.226, 0.186                           # drawer box
Z0 = FOOT_H + PL_H                              # box bottom
HH = 0.058                                      # box height
Z1 = Z0 + HH
WALL = 0.008
LEDGE = (0.24, 0.20, 0.010)
B = Z1 + LEDGE[2]                               # the hump sits here
DR_W, DR_H = RW - 2 * WALL - 0.004, HH - 2 * WALL - 0.004   # drawer tray, 2 mm clear of the walls
DR_D = RD - WALL - 0.004
DRAW_OUT = 0.09
KEY_PRESS = 0.004


def hump(front, r, back):
    """side profile (y, z): a straight front slope, then an arc over the top and down to a short back"""
    c = Vector((0.025, B + 0.04))
    pts = [(front, B)]
    for i in range(15):
        a = math.radians(145 - 145 * i / 14)
        pts.append((c.x + r * math.cos(a), c.y + r * math.sin(a)))
    pts.append((back, B))
    return pts


BODY = hump(-0.085, 0.060, 0.085)
CHEEK = hump(-0.089, 0.064, 0.089)
P0, P1 = Vector(BODY[0]), Vector(BODY[1])
SLOPE_A = math.atan2(P1.y - P0.y, P1.x - P0.x)          # the key face


def reg_coll():
    c = bpy.data.collections.get("register")
    if c is None:
        c = bpy.data.collections.new("register"); bpy.context.scene.collection.children.link(c)
    return c


for o in list(reg_coll().objects):
    bpy.data.objects.remove(o, do_unlink=True)
RC = reg_coll()
RM = {
    "wood": mat("rg_wood", (0.20, 0.085, 0.032), rough=0.72),
    "wood_dark": mat("rg_wood_dark", (0.11, 0.045, 0.02), rough=0.7),
    "panel": mat("rg_panel", (0.62, 0.45, 0.27), rough=0.8),
    "key": mat("rg_key", (0.70, 0.52, 0.32), rough=0.6),
    "key_dark": mat("rg_key_dark", (0.12, 0.04, 0.02), rough=0.55),
    "tray": mat("rg_tray", (0.20, 0.09, 0.04), rough=0.8),
    "ink": mat("rg_ink", (0.10, 0.04, 0.02), rough=0.7),
}
R = {}


def part(name, bm, m, smooth=True):
    o = obj_from_bm(name, bm, m, smooth=smooth, coll=RC); R[name] = o; return o


def merged(parts):
    bm = bmesh.new()
    for p in parts:
        tmp = bpy.data.meshes.new("tmp"); p.to_mesh(tmp); p.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    return bm


def prism(profile, x0, x1, bevel=0.004):
    """a side profile pushed out from x0 to x1, its outline and bottom corners rounded"""
    bm = bmesh.new()
    L = [bm.verts.new((x0, y, z)) for y, z in profile]; Rr = [bm.verts.new((x1, y, z)) for y, z in profile]
    bm.faces.new(L); bm.faces.new(list(reversed(Rr)))
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((L[i], Rr[i], Rr[j], L[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ends = {L[0], L[-1], L[1]}
    edges = [e for e in bm.edges if abs(e.verts[0].co.x - e.verts[1].co.x) < 1e-6 or
             (abs(e.verts[0].co.x - e.verts[1].co.x) > 1e-6 and any(v.co.yz == u.co.yz for v in e.verts for u in ends))]
    bmesh.ops.bevel(bm, geom=edges, offset=bevel, segments=3, affect='EDGES', profile=0.5, clamp_overlap=True)
    return bm


# 1 housing: plinth, drawer box around the opening, the ledge
part("housing", merged([
    rbox(PL_W, PL_D, PL_H, (0, 0, FOOT_H + PL_H / 2), bevel=0.004),
    rbox(RW, RD, WALL, (0, 0, Z0 + WALL / 2), bevel=0.002),                               # floor
    rbox(RW, WALL, HH, (0, RD / 2 - WALL / 2, Z0 + HH / 2), bevel=0.002),                 # back
    rbox(WALL, RD, HH, (-RW / 2 + WALL / 2, 0, Z0 + HH / 2), bevel=0.002),                # sides
    rbox(WALL, RD, HH, (RW / 2 - WALL / 2, 0, Z0 + HH / 2), bevel=0.002),
    rbox(RW, RD, WALL, (0, 0, Z1 - WALL / 2), bevel=0.002),                               # top
    rbox(*LEDGE, (0, 0, Z1 + LEDGE[2] / 2), bevel=0.003),                                 # the ledge under the hump
]), RM["wood"])
# 2 drawer: tray, framed front panel that fits the opening, round knob
dy = -RD / 2 + DR_D / 2 + 0.002
fl = Z0 + WALL + 0.002
part("drawer", merged([
    rbox(DR_W, DR_D, 0.004, (0, dy, fl + 0.002), bevel=0.001),
    rbox(DR_W, 0.004, DR_H, (0, dy + DR_D / 2 - 0.002, fl + DR_H / 2), bevel=0.001),
    rbox(0.004, DR_D, DR_H * 0.6, (-DR_W / 2 + 0.002, dy, fl + DR_H * 0.3), bevel=0.001),
    rbox(0.004, DR_D, DR_H * 0.6, (DR_W / 2 - 0.002, dy, fl + DR_H * 0.3), bevel=0.001),
]), RM["tray"])
FW, FH = RW - 2 * WALL - 0.003, HH - 2 * WALL - 0.003
fy = -RD / 2 + 0.005
zc = Z0 + HH / 2
part("drawer_front", merged([
    rbox(FW, 0.010, FH, (0, fy, zc), bevel=0.002),
    rbox(FW, 0.004, 0.006, (0, fy - 0.006, zc + FH / 2 - 0.003), bevel=0.0015),              # raised frame round the panel
    rbox(FW, 0.004, 0.006, (0, fy - 0.006, zc - FH / 2 + 0.003), bevel=0.0015),
    rbox(0.006, 0.004, FH - 0.012, (-FW / 2 + 0.003, fy - 0.006, zc), bevel=0.0015),
    rbox(0.006, 0.004, FH - 0.012, (FW / 2 - 0.003, fy - 0.006, zc), bevel=0.0015),
]), RM["wood"])
knob = lathe([(0.005, -0.001), (0.005, 0.005), (0.012, 0.008), (0.013, 0.014), (0.0095, 0.020), (0, 0.0215)], seg=24)
bmesh.ops.transform(knob, matrix=Matrix.Translation((0, fy - 0.005, zc)) @ Matrix.Rotation(math.radians(90), 4, 'X'), verts=knob.verts)
part("drawer_pull", knob, RM["wood_dark"])
# 3 bun feet
feet = []
for fx in (-1, 1):
    for fy_ in (-1, 1):
        f = lathe([(0.011, 0), (0.013, 0.003), (0.012, FOOT_H + 0.001)], seg=18)
        bmesh.ops.translate(f, vec=(fx * (PL_W / 2 - 0.024), fy_ * (PL_D / 2 - 0.024), 0), verts=f.verts); feet.append(f)
part("feet", merged(feet), RM["wood_dark"])
# 4 body: the hump with raised cheeks
part("body", merged([prism(BODY, -0.095, 0.095), prism(CHEEK, -0.108, -0.093), prism(CHEEK, 0.093, 0.108)]), RM["wood"])
# 5/6 keys: mushroom caps on stems sunk into sockets in the slope
NRM = Vector((0, -math.sin(SLOPE_A), math.cos(SLOPE_A)))
ROT = Matrix.Rotation(SLOPE_A, 4, 'X')
SLEN = (P1 - P0).length


def key_at(r_, c_):
    s = 0.19 + r_ * 0.31
    yz = P0.lerp(P1, s)
    return Matrix.Translation((-0.050 + c_ * 0.048, yz.x, yz.y)) @ ROT


KEY_NAMES = []
cut = bmesh.new()
for r_ in range(3):
    for c_ in range(3):
        M = key_at(r_, c_)
        hole = lathe([(0.0064, -0.012), (0.0064, 0.004)], seg=18); bmesh.ops.transform(hole, matrix=M, verts=hole.verts)
        tmp = bpy.data.meshes.new("tmp"); hole.to_mesh(tmp); hole.free(); cut.from_mesh(tmp); bpy.data.meshes.remove(tmp)
        if (r_, c_) == (0, 2):
            continue                                    # the total key, below
        kb = lathe([(0.0045, -0.004), (0.0045, 0.017), (0.0118, 0.0175), (0.0125, 0.0230), (0.0100, 0.0270), (0, 0.0283)], seg=22)
        bmesh.ops.transform(kb, matrix=M, verts=kb.verts)
        nm = f"key_{r_}{c_}"; part(nm, kb, RM["key_dark"] if c_ == 2 else RM["key"]); KEY_NAMES.append(nm)
cutter = obj_from_bm("_sockets", cut, None, coll=RC)
bo = R["body"].modifiers.new("sockets", "BOOLEAN"); bo.object = cutter; bo.operation = 'DIFFERENCE'; bo.solver = 'EXACT'
dgw = bpy.context.evaluated_depsgraph_get(); mw_ = bpy.data.meshes.new_from_object(R["body"].evaluated_get(dgw))
R["body"].modifiers.clear(); oldm = R["body"].data; R["body"].data = mw_; bpy.data.meshes.remove(oldm); bpy.data.objects.remove(cutter, do_unlink=True)
for o_ in [R["body"]] + [R[n] for n in R if n in ("housing",)]:
    o_.data.set_sharp_from_angle(angle=math.radians(35))       # Blender 4.1+: sharp edges between flat faces
TOTAL_AT = key_at(0, 2)
tk = lathe([(0.0045, -0.004), (0.0045, 0.017), (0.0118, 0.0175), (0.0125, 0.0230), (0.0100, 0.0270), (0, 0.0283)], seg=22)
bmesh.ops.transform(tk, matrix=TOTAL_AT, verts=tk.verts)
part("total_key", tk, RM["key_dark"])
# 7 the sign on two posts
TOPZ = B + 0.04 + 0.060
SY = 0.025
SZ = TOPZ + 0.022 + 0.030
SWW, SHH = 0.17, 0.060
def post(x):
    bm_ = lathe([(0.0045, TOPZ - 0.006), (0.0045, SZ - SHH / 2 + 0.002)], seg=14)
    bmesh.ops.translate(bm_, vec=(x, SY, 0), verts=bm_.verts); return bm_


part("display_hood", merged([
    post(-0.06), post(0.06),
    rbox(SWW, 0.016, 0.010, (0, SY, SZ + SHH / 2 - 0.005), bevel=0.002),
    rbox(SWW, 0.016, 0.010, (0, SY, SZ - SHH / 2 + 0.005), bevel=0.002),
    rbox(0.010, 0.016, SHH - 0.018, (-SWW / 2 + 0.005, SY, SZ), bevel=0.002),
    rbox(0.010, 0.016, SHH - 0.018, (SWW / 2 - 0.005, SY, SZ), bevel=0.002),
    rbox(SWW - 0.018, 0.006, SHH - 0.018, (0, SY + 0.005, SZ), bevel=0.001),          # back board
]), RM["wood"])
part("display_window", rbox(SWW - 0.019, 0.004, SHH - 0.019, (0, SY + 0.0002, SZ), bevel=0.001), RM["panel"])
cu = bpy.data.curves.new("price", 'FONT'); cu.body = "14.99"; cu.size = 0.030; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = 0.0004
po = bpy.data.objects.new("price_tmp", cu); RC.objects.link(po)
dgx = bpy.context.evaluated_depsgraph_get(); pmesh = bpy.data.meshes.new_from_object(po.evaluated_get(dgx)); bpy.data.objects.remove(po, do_unlink=True)
pmesh.transform(Matrix.Translation((0, SY - 0.0022, SZ)) @ Matrix.Rotation(math.radians(90), 4, 'X')); pmesh.materials.append(RM["ink"])
o = bpy.data.objects.new("price", pmesh); RC.objects.link(o); R["price"] = o
# 8 crank on the right cheek: hub, a bent arm, a wooden handle sticking out
HUB = Vector((0.108, 0.018, B + 0.045))
TIP = Vector((0.121, 0.058, B + 0.088))
cr = []
hub = lathe([(0.016, 0), (0.016, 0.006), (0.010, 0.010)], seg=22)
bmesh.ops.transform(hub, matrix=Matrix.Translation(HUB) @ Matrix.Rotation(math.radians(90), 4, 'Y'), verts=hub.verts); cr.append(hub)
arm_v = Vector((0, TIP.y - HUB.y, TIP.z - HUB.z)); L_ = arm_v.length; ang = math.atan2(arm_v.y, arm_v.z)
arm_ = rbox(0.007, 0.009, L_ + 0.012, (0, 0, L_ / 2), bevel=0.003)
bmesh.ops.transform(arm_, matrix=Matrix.Translation((0.121, HUB.y, HUB.z)) @ Matrix.Rotation(-ang, 4, 'X'), verts=arm_.verts); cr.append(arm_)
hnd = lathe([(0.0045, 0), (0.0045, 0.004), (0.0110, 0.009), (0.0120, 0.040), (0.0095, 0.052), (0, 0.055)], seg=20)
bmesh.ops.transform(hnd, matrix=Matrix.Translation(TIP) @ Matrix.Rotation(math.radians(90), 4, 'Y'), verts=hnd.verts); cr.append(hnd)
part("crank", merged(cr), RM["wood_dark"])

# ---------------------------------------------------------------- rig: drawer slides out, total key presses in
old = bpy.data.objects.get("register_rig")
if old:
    bpy.data.objects.remove(old, do_unlink=True)
ad = bpy.data.armatures.new("register_rig"); RARM = bpy.data.objects.new("register_rig", ad); RC.objects.link(RARM)
bpy.context.view_layer.objects.active = RARM
bpy.ops.object.mode_set(mode='EDIT')
b = ad.edit_bones.new("root"); b.head, b.tail = (0, 0, 0), (0, 0, 0.05)
d = ad.edit_bones.new("drawer"); d.head, d.tail = (0, -RD / 2, Z0 + HH / 2), (0, -RD / 2 - 0.05, Z0 + HH / 2); d.parent = b      # bone Y = out of the drawer
tkn = NRM.normalized()
tpos = TOTAL_AT @ Vector((0, 0, 0))
t = ad.edit_bones.new("total_key"); t.head, t.tail = tpos, tpos - tkn * 0.03; t.parent = b                         # bone Y = into the key bed
bpy.ops.object.mode_set(mode='OBJECT')
for name, bone in [(k, "root") for k in KEY_NAMES] + [("housing", "root"), ("feet", "root"), ("body", "root"), ("display_hood", "root"), ("display_window", "root"),
                   ("price", "root"), ("crank", "root"), ("drawer", "drawer"), ("drawer_front", "drawer"), ("drawer_pull", "drawer"), ("total_key", "total_key")]:
    o = R[name]; mw = o.matrix_world.copy(); o.parent = RARM; o.parent_type = 'BONE'; o.parent_bone = bone; o.matrix_world = mw
for pb in RARM.pose.bones:
    pb.rotation_mode = 'QUATERNION'


def rpose(drawer_open=0.0, total_key=0.0):
    pbs = RARM.pose.bones
    for pb in pbs:
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
    s = max(0.0, min(1.0, drawer_open)); s = s * s * (3 - 2 * s)
    pbs["drawer"].location = (0, DRAW_OUT * s, 0)
    pbs["total_key"].location = (0, KEY_PRESS * max(0.0, min(1.0, total_key)), 0)
    bpy.context.view_layer.update()


def check_register(steps=40):
    """AnyMachine-style sweep: no triangle of a moving part may cross a part on another bone, at rest or in any step"""
    from mathutils.bvhtree import BVHTree
    objs = [o for o in RC.objects if o.type == 'MESH']
    def tris(o):
        dg = bpy.context.evaluated_depsgraph_get(); oe = o.evaluated_get(dg); m = oe.to_mesh()
        v = [oe.matrix_world @ x.co for x in m.vertices]; m.calc_loop_triangles(); p = [tuple(t.vertices) for t in m.loop_triangles]; oe.to_mesh_clear(); return v, p
    bad = []
    for ctrl in ("drawer_open", "total_key"):
        for k in range(steps + 1):
            rpose(**{ctrl: k / steps})
            data = {o.name: BVHTree.FromPolygons(*tris(o)) for o in objs}
            for i, a in enumerate(objs):
                for bb in objs[i + 1:]:
                    if a.parent_bone != bb.parent_bone and data[a.name].overlap(data[bb.name]):
                        bad.append((ctrl, round(k / steps, 2), a.name, bb.name))
    rpose()
    print("REGISTER_CHECK", "OK" if not bad else bad[:8])
    return bad


rpose()
print("register built:", len(R), "parts")
