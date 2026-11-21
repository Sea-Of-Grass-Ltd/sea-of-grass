"""The Websites page's opening stage: a book-nook diorama at night, built around our rotary phone.

Direction: page-strips/websites-stage-nb-2.png (shared notes). Fixed against it: every object rests on the counter
(the register no longer floats), and the camera looks down from three-quarters, not flat on.
Run live in Blender after build_phone.py and build_register.py, in the same globals:
    exec(build_phone.py, g); exec(build_register.py, g); exec(build_stage.py, g)
Units metres, Z up, front -Y. Counter top at Z = TOP.
Pieces (back to front): a painted night-sky backdrop with the crescent moon and 7 stars painted on, wooden counter with the toy
register, our phone and the coral chalkboard sign on posts, a felt meadow strip with Front Range flowers
(Indian paintbrush, sand lily, blue flax, blanketflower). The sign's lettering is HTML on the page, not geometry.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix

TOP = 0.40
CW, CD = 1.50, 0.34          # long and low, spanning the frame (Tristan's reference)          # counter width and depth
STAGE_W, STAGE_D, STAGE_H = 2.8, 1.05, 1.45     # wide, so the frontal camera never sees the side walls   # tall enough to fill a phone's portrait frame   # a tight proscenium: the box fills the frame
BACK_Y = 0.55
rng = random.Random(7)


def stage_coll():
    c = bpy.data.collections.get("stage")
    if c is None:
        c = bpy.data.collections.new("stage"); bpy.context.scene.collection.children.link(c)
    return c


for o in list(stage_coll().objects):
    bpy.data.objects.remove(o, do_unlink=True)
SC = stage_coll()

M = {
    "navy": mat("st_navy", (0.010, 0.016, 0.048), rough=0.9),
    "navy_side": mat("st_navy_side", (0.008, 0.011, 0.04), rough=0.95),
    "paper": mat("st_paper", (0.86, 0.80, 0.62), rough=0.8),
    "wire": mat("st_wire", (0.6, 0.62, 0.66), rough=0.3, metal=1.0),
    "wood": mat("st_wood", (0.30, 0.15, 0.065), rough=0.7, coat=0.0),
    "oak": mat("st_oak", (0.50, 0.30, 0.14), rough=0.6),
    "counter_wood": mat("st_counter_wood", (0.10, 0.045, 0.025), rough=0.85),
    "counter_wood_top": mat("st_counter_wood_top", (0.13, 0.06, 0.032), rough=0.8),
    "black": mat("st_black", (0.012, 0.012, 0.014), rough=0.5),
    "steel_top": mat("st_steel_top", (0.62, 0.64, 0.66), rough=0.32, metal=0.7),
    "steel": mat("st_steel", (0.75, 0.76, 0.78), rough=0.25, metal=1.0),
    "wood_dark": mat("st_wood_dark", (0.11, 0.04, 0.014), rough=0.6),
    "floor": mat("st_floor", (0.08, 0.05, 0.035), rough=0.8),
    "felt": mat("st_felt", (0.06, 0.16, 0.05), rough=1.0)
    , "felt2": mat("st_felt2", (0.10, 0.24, 0.07), rough=1.0)
    , "wood_mid": mat("st_wood_mid", (0.22, 0.10, 0.042), rough=0.75, coat=0.0)
    , "cream": mat("st_cream", (0.80, 0.74, 0.58), rough=0.3, coat=0.5)
    , "leaf": mat("st_leaf", (0.10, 0.30, 0.08), rough=0.7),
    "grass": mat("st_grass", (0.22, 0.46, 0.12), rough=0.75),
    "grass2": mat("st_grass2", (0.12, 0.33, 0.09), rough=0.75),
    "grass3": mat("st_grass3", (0.06, 0.20, 0.05), rough=0.8),
    "grass4": mat("st_grass4", (0.28, 0.50, 0.15), rough=0.75),
    "enamel": mat("st_enamel", (0.78, 0.74, 0.62), rough=0.25, coat=0.6),
    "enamel_grey": mat("st_enamel_grey", (0.32, 0.33, 0.35), rough=0.35, coat=0.4),
    "brass": mat("st_brass", (0.75, 0.55, 0.25), rough=0.3, metal=1.0),
    "key": mat("st_key", (0.86, 0.84, 0.78), rough=0.4),
    "key_coral": mat("st_key_coral", (0.85, 0.36, 0.28), rough=0.4),
    "display": mat("st_display", (0.01, 0.02, 0.015), rough=0.2),
    "coral": mat("st_coral", (0.90, 0.24, 0.12), rough=0.5),
    "chalk": mat("st_chalk", (0.006, 0.016, 0.011), rough=1.0),
    "paintbrush": mat("st_paintbrush", (0.90, 0.10, 0.03), rough=0.6),
    "lily": mat("st_lily", (0.95, 0.94, 0.88), rough=0.5),
    "flax": mat("st_flax", (0.10, 0.26, 0.95), rough=0.5),
    "blanket_red": mat("st_blanket_red", (0.80, 0.12, 0.04), rough=0.55),
    "blanket_yel": mat("st_blanket_yel", (1.0, 0.72, 0.08), rough=0.55),
    "center": mat("st_center", (0.20, 0.08, 0.03), rough=0.8),
    "yellow": mat("st_yellow", (0.95, 0.80, 0.25), rough=0.7),
}
# the display digits glow
dm = M["display"]; b = next(n for n in dm.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
glow = mat("st_digits", (0.25, 0.9, 0.35), rough=0.5)
gb = next(n for n in glow.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
for k in ("Emission Color", "Emission"):
    if k in gb.inputs:
        gb.inputs[k].default_value = (0.3, 1.0, 0.4, 1)
if "Emission Strength" in gb.inputs:
    gb.inputs["Emission Strength"].default_value = 2.0


def add(name, bm, m, smooth=True):
    return obj_from_bm(name, bm, m, smooth=smooth, coll=SC)


def merge(parts):
    bm = bmesh.new()
    for p in parts:
        tmp = bpy.data.meshes.new("tmp"); p.to_mesh(tmp); p.free(); bm.from_mesh(tmp); bpy.data.meshes.remove(tmp)
    return bm


def star_shape(points, r_out, r_in, depth):
    bm = bmesh.new()
    n = points * 2
    front = [bm.verts.new(((r_out if i % 2 == 0 else r_in) * math.cos(math.pi / 2 + i * math.pi / points), -depth / 2,
                           (r_out if i % 2 == 0 else r_in) * math.sin(math.pi / 2 + i * math.pi / points))) for i in range(n)]
    back = [bm.verts.new((v.co.x, depth / 2, v.co.z)) for v in front]
    bm.faces.new(front); bm.faces.new(list(reversed(back)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def wire(x, y, z0, z1):
    return obj_at(lathe([(0.0007, 0), (0.0007, z1 - z0)], seg=6), M["wire"], (x, y, z0), "wire")


def obj_at(bm, m, loc, name, rot=None, smooth=True):
    o = add(name, bm, m, smooth)
    mt = Matrix.Translation(loc) @ (rot.to_4x4() if rot is not None else Matrix())
    o.data.transform(mt); o.data.update()
    return o


def painted_sky(m):
    """the backdrop as a painted night sky (Tristan, 2026-11-20: "remove the stringers ... make it a painted background"):
    navy laid on in long horizontal brush strokes, a little lighter and bluer low down, matte like gouache"""
    nt = m.node_tree; bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.9, 1.0, 6.0)                     # strokes run sideways
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.8; nz.inputs["Detail"].default_value = 6.0
    nz.inputs["Distortion"].default_value = 0.8                        # strokes wander like a loaded brush
    nz.inputs["Roughness"].default_value = 0.62
    nz2 = nt.nodes.new("ShaderNodeTexNoise"); nz2.inputs["Scale"].default_value = 0.9; nz2.inputs["Detail"].default_value = 2.0
    ramp = nt.nodes.new("ShaderNodeValToRGB"); el = ramp.color_ramp.elements
    el[0].position, el[0].color = 0.40, (0.003, 0.006, 0.024, 1); el[1].position, el[1].color = 0.62, (0.040, 0.068, 0.165, 1)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    low = nt.nodes.new("ShaderNodeMapRange"); low.inputs["From Min"].default_value = 0.2; low.inputs["From Max"].default_value = 1.1
    low.inputs["To Min"].default_value = 1.0; low.inputs["To Max"].default_value = 0.0
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = 'RGBA'; mix.blend_type = 'SCREEN'
    mix.inputs["B"].default_value = (0.030, 0.050, 0.110, 1)
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.55
    L = nt.links
    L.new(tc.outputs["Object"], mp.inputs["Vector"]); L.new(mp.outputs["Vector"], nz.inputs["Vector"])
    L.new(tc.outputs["Object"], nz2.inputs["Vector"])
    L.new(nz.outputs["Fac"], ramp.inputs["Fac"])
    L.new(tc.outputs["Object"], sep.inputs["Vector"]); L.new(sep.outputs["Z"], low.inputs["Value"])
    L.new(low.outputs["Result"], mul.inputs[0]); L.new(mul.outputs[0], mix.inputs["Factor"])
    L.new(ramp.outputs["Color"], mix.inputs["A"]); L.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
    L.new(nz.outputs["Fac"], bump.inputs["Height"]); L.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    bsdf.inputs["Roughness"].default_value = 0.95


for _k in ("navy", "navy_side"):
    _m = M[_k]
    for _n in [n for n in _m.node_tree.nodes if n.type not in ("BSDF_PRINCIPLED", "OUTPUT_MATERIAL")]:
        _m.node_tree.nodes.remove(_n)
    painted_sky(_m)
PAINT = mat("st_paint_cream", (0.80, 0.74, 0.58), rough=1.0)                # moon and stars painted on, matte
_pb = next(n for n in PAINT.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
for _key in ("Emission Color", "Emission"):
    if _key in _pb.inputs:
        _pb.inputs[_key].default_value = (0.95, 0.88, 0.70, 1)
if "Emission Strength" in _pb.inputs:
    _pb.inputs["Emission Strength"].default_value = 0.25

# ---------------------------------------------------------------- the box: floor, backdrop, side walls, header
obj_at(rbox(STAGE_W, STAGE_D, 0.04, (0, 0, -0.02), bevel=0.006), M["floor"], (0, BACK_Y - STAGE_D / 2, 0), "stage_floor")
obj_at(rbox(STAGE_W, 0.02, STAGE_H, (0, 0, STAGE_H / 2), bevel=0.0), M["navy"], (0, BACK_Y + 0.01, 0), "backdrop", smooth=False)
for sx in (-1, 1):
    obj_at(rbox(0.04, STAGE_D, STAGE_H, (0, 0, STAGE_H / 2), bevel=0.004), M["navy_side"], (sx * (STAGE_W / 2 + 0.02), BACK_Y - STAGE_D / 2, 0), "side_wall")
obj_at(rbox(STAGE_W + 0.08, STAGE_D, 0.05, (0, 0, 0), bevel=0.004), M["navy_side"], (0, BACK_Y - STAGE_D / 2, STAGE_H + 0.025), "header")

# ---------------------------------------------------------------- moon and stars painted on the backdrop (no wires)
outer = lathe([(0.10, -0.0008), (0.10, 0.0008)], seg=64)
mo = add("moon_cut", outer, PAINT)
cut = add("moon_bite", lathe([(0.088, -0.02), (0.088, 0.02)], seg=64), M["paper"])
cut.data.transform(Matrix.Translation((0.045, 0.035, 0))); cut.data.update()
bo = mo.modifiers.new("bite", "BOOLEAN"); bo.object = cut; bo.operation = 'DIFFERENCE'; bo.solver = 'EXACT'
dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(mo.evaluated_get(dg))
mo.modifiers.clear(); old = mo.data; mo.data = me; bpy.data.meshes.remove(old); bpy.data.objects.remove(cut, do_unlink=True)
mo.name = "moon"
for pl in mo.data.polygons:
    pl.use_smooth = False
mo.data.transform(Matrix.Translation((0.80, BACK_Y - 0.0009, 1.22)) @ Matrix.Rotation(math.radians(90), 4, 'X') @ Matrix.Rotation(math.radians(-25), 4, 'Z')); mo.data.update()
STARS = [(-0.80, 0.42, 0.90, 4, 0.018), (-0.60, 0.30, 1.10, 4, 0.016), (-0.30, 0.44, 0.84, 8, 0.016), (0.10, 0.36, 1.16, 4, 0.014),
         (-0.05, 0.40, 0.98, 4, 0.012), (0.93, 0.46, 0.86, 4, 0.016), (0.48, 0.40, 1.21, 4, 0.014)]
for x, y, z, pts, r0 in STARS:
    r = r0 * 1.45
    s = obj_at(star_shape(pts, r, r * (0.42 if pts == 8 else 0.38), 0.0014), PAINT, (x, BACK_Y - 0.0008, z), "star",
               rot=Matrix.Rotation(rng.uniform(-0.3, 0.3), 3, 'Y'), smooth=False)

# ---------------------------------------------------------------- the counter: all wood, dark and matte, so it recedes and the board and phone stand out
# (Tristan: "the all wood recedes into space, whereas the white table top stands out")
CT_Y = -0.02
obj_at(rbox(CW + 0.05, CD + 0.05, 0.045, (0, 0, -0.0225), bevel=0.006, seg=2), M["counter_wood_top"], (0, CT_Y, TOP), "counter_top")
obj_at(rbox(CW, CD, TOP - 0.045, (0, 0, (TOP - 0.045) / 2), bevel=0.004, seg=2), M["counter_wood"], (0, CT_Y, 0), "counter_body")
obj_at(rbox(CW + 0.01, CD + 0.01, 0.03, (0, 0, 0.015), bevel=0.003, seg=2), M["counter_wood_top"], (0, CT_Y, 0), "counter_base")   # a plain base rail
# ---------------------------------------------------------------- the cash register (built by build_register.py, AnyMachine-style) on the desk beside the phone
rr = bpy.data.objects.get("register_rig")
if rr:
    rr.location = (-0.56, CT_Y + 0.0, TOP)
    rr.rotation_euler = (0, 0, math.radians(6))
    rr.hide_set(True)

# ---------------------------------------------------------------- the coral chalkboard sign on two posts, standing on the desk (Tristan, from his picture)
SX, SY = 0.25, CT_Y + 0.08            # big, over the right half of the counter on short posts (Tristan's reference)
BW, BH = 1.04, 0.58
post_h = 0.06
for px in (-0.31, 0.31):
    obj_at(rbox(0.04, 0.024, post_h + 0.03, (0, 0, (post_h + 0.03) / 2), bevel=0.005, seg=2), M["counter_wood_top"], (SX + px, SY, TOP), "sign_post")
    obj_at(rbox(0.05, 0.045, 0.01, (0, 0, 0.005), bevel=0.003, seg=2), M["wood_mid"], (SX + px, SY, TOP), "sign_foot")   # feet flat on the desk
SIGN_C = Vector((SX, SY - 0.002, TOP + post_h + BH / 2))         # the frame's bottom rests on the post tops
frame = merge([rbox(BW, 0.034, 0.028, (0, 0, BH / 2 - 0.014), bevel=0.01, seg=4), rbox(BW, 0.034, 0.028, (0, 0, -BH / 2 + 0.014), bevel=0.01, seg=4),
               rbox(0.028, 0.034, BH, (BW / 2 - 0.014, 0, 0), bevel=0.01, seg=4), rbox(0.028, 0.034, BH, (-BW / 2 + 0.014, 0, 0), bevel=0.01, seg=4)])
obj_at(frame, M["coral"], SIGN_C, "sign_frame")
obj_at(rbox(BW - 0.044, 0.014, BH - 0.044, (0, 0.002, 0), bevel=0.0), M["chalk"], SIGN_C, "sign_board", smooth=False)

# ---------------------------------------------------------------- our phone, on the counter
arm = bpy.data.objects.get("phone_rig")
if arm:
    arm.location = (-0.27, CT_Y - 0.01, TOP)
    arm.rotation_euler = (0, 0, math.radians(10))
    arm.hide_set(True)

# ---------------------------------------------------------------- the meadow strip: felt hummocks, toy grass, big lit Front Range flowers on stems
MY0, MY1 = -0.62, -0.20
CAM_AT = Vector((-0.42, -2.2, 0.95))
obj_at(rbox(STAGE_W, MY1 - MY0, 0.03, (0, 0, 0.015), bevel=0.012, seg=3), M["felt"], (0, (MY0 + MY1) / 2, 0), "meadow_bed")
for sx in (-1, 1):                                                     # felt runs back past the counter ends to the backdrop
    w_ = (STAGE_W - CW) / 2
    obj_at(rbox(w_, BACK_Y - MY1, 0.03, (0, 0, 0.015), bevel=0.01, seg=3), M["felt2"], (sx * (CW / 2 + w_ / 2), (BACK_Y + MY1) / 2, 0), "side_felt")
obj_at(rbox(STAGE_W + 0.04, 0.03, 0.06, (0, 0, 0.03), bevel=0.008, seg=3), M["wood_mid"], (0, MY0 - 0.012, 0), "stage_apron")
humps = [[], []]
for i in range(40):                                                    # soft felt mounds along the strip
    x = -STAGE_W / 2 + 0.05 + (i % 20) * (STAGE_W - 0.1) / 19 + rng.uniform(-0.03, 0.03); y = rng.uniform(MY0 + 0.07, MY1 - 0.05)
    hb = bmesh.new(); bmesh.ops.create_uvsphere(hb, u_segments=16, v_segments=10, radius=1.0)
    bmesh.ops.scale(hb, vec=(rng.uniform(0.06, 0.1), rng.uniform(0.05, 0.08), rng.uniform(0.03, 0.05)), verts=hb.verts)
    bmesh.ops.translate(hb, vec=(x, y, 0.02), verts=hb.verts); humps[i % 2].append(hb)
add("meadow_humps_a", merge(humps[0]), M["felt"]); add("meadow_humps_b", merge(humps[1]), M["felt2"])
blades = [[], [], [], []]
for i in range(1100):                                                  # a thick hedge of tall thin blades in four greens (Tristan's reference)
    x = rng.uniform(-STAGE_W / 2 + 0.02, STAGE_W / 2 - 0.02); y = rng.uniform(MY0 + 0.03, MY1 + 0.02)
    back = (y - MY0) / (MY1 - MY0)                                     # taller towards the counter, so the row climbs its foot
    h = rng.uniform(0.10, 0.17) + 0.06 * back; lean = rng.uniform(-0.25, 0.25); lean_y = rng.uniform(-0.15, 0.05)
    pts = [Vector((x + lean * h * (t / 4) ** 2, y + lean_y * h * (t / 4) ** 2, 0.025 + h * t / 4)) for t in range(5)]
    w = rng.uniform(0.014, 0.020)                                      # chunky cut-felt blades, not wisps
    blades[rng.randrange(4)].append(sweep(pts, rrect(w, 0.003, 0.0012, 1), scales=[1, 0.96, 0.85, 0.6, 0.12]))
for k, nm in enumerate(("grass", "grass2", "grass3", "grass4")):
    add("grass_" + "abcd"[k], merge(blades[k]), M[nm])
FS = 0.85                                                              # flowers smaller, tucked in the grass like the reference


def petal3d(c, d, length, width, thick, face=None):
    """a soft, rounded petal: a squashed sphere laid out from c along d (designer-toy, not paper); its flat side
    faces `face` (the flower's front) so a head reads as equal petals, never edge-on spikes"""
    length, width, thick = length * FS, width * FS, thick * FS
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.5)
    bmesh.ops.scale(bm, vec=(length, width, thick), verts=bm.verts)
    x = d.normalized()
    if face is None:
        q = Vector((1, 0, 0)).rotation_difference(x); R = q.to_matrix()
    else:
        z = (face - x * face.dot(x)).normalized(); y = z.cross(x)
        R = Matrix((x, y, z)).transposed()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c + x * length * 0.5) @ R.to_4x4(), verts=bm.verts)
    return bm


def head_frame(tip, up_tilt=0.55):
    """a flower head turned toward the viewer and tipped up a little"""
    n = (CAM_AT - tip).normalized(); n = (n + Vector((0, 0, up_tilt))).normalized()
    a = n.cross(Vector((0, 0, 1))).normalized(); b = a.cross(n).normalized()
    return n, a, b


fl = {k: [] for k in ("stems", "leaves", "paintbrush", "lily", "flax", "blanket_red", "blanket_yel", "center", "yellow")}


def stem_to(x, y, h, lean=0.0):
    pts = [Vector((x + lean * (t / 5) ** 2, y, 0.025 + h * t / 5)) for t in range(6)]
    fl["stems"].append(sweep(pts, circle(0.0022, 6)))
    for side in (-1, 1):                                               # two leaves low on the stem
        fl["leaves"].append(petal3d(pts[1] + Vector((0, 0, 0.01)), Vector((side * 0.8, -0.2, 0.6)), 0.05, 0.014, 0.004))
    return pts[-1]


SPOTS = [-1.25 + k * (2.5 / 20) for k in range(21)]               # 21 evenly spread places, dealt out at random
rng.shuffle(SPOTS)


def spot():
    return SPOTS.pop() + rng.uniform(-0.03, 0.03)


for i in range(6):                                                     # Indian paintbrush: the one red accent, a lit cluster on the left
    x = spot(); y = rng.uniform(MY0 + 0.05, MY1 - 0.04)
    tip = stem_to(x, y, rng.uniform(0.15, 0.22), rng.uniform(-0.015, 0.015))
    for j in range(18):
        zt = tip.z - 0.07 * FS + j * 0.0045 * FS; a = j * 2.4; r = 0.012 * (1 - j / 26)
        fl["paintbrush"].append(petal3d(Vector((tip.x, tip.y, zt)), Vector((math.cos(a), math.sin(a), 1.1)), 0.026 * (1 - j / 30), 0.012, 0.005))
for i in range(5):                                                     # sand lily: white six-point stars
    x = spot(); y = rng.uniform(MY0 + 0.05, MY1 - 0.04)
    tip = stem_to(x, y, rng.uniform(0.14, 0.20))
    n, a, b = head_frame(tip)
    for k in range(6):
        ang = 2 * math.pi * k / 6; d = a * math.cos(ang) + b * math.sin(ang) + n * 0.15
        fl["lily"].append(petal3d(tip, d, 0.046, 0.017, 0.006, face=n))
    c = bmesh.new(); bmesh.ops.create_uvsphere(c, u_segments=10, v_segments=6, radius=0.0065 * FS); bmesh.ops.translate(c, vec=tip + n * 0.003, verts=c.verts); fl["yellow"].append(c)
for i in range(6):                                                     # blue flax: five round blue petals on thin stems
    x = spot(); y = rng.uniform(MY0 + 0.05, MY1 - 0.04)
    tip = stem_to(x, y, rng.uniform(0.15, 0.21), rng.uniform(-0.02, 0.02))
    n, a, b = head_frame(tip)
    for k in range(5):
        ang = 2 * math.pi * k / 5; d = a * math.cos(ang) + b * math.sin(ang) + n * 0.25
        fl["flax"].append(petal3d(tip, d, 0.034, 0.026, 0.005, face=n))
    c = bmesh.new(); bmesh.ops.create_uvsphere(c, u_segments=10, v_segments=6, radius=0.005 * FS); bmesh.ops.translate(c, vec=tip + n * 0.003, verts=c.verts); fl["yellow"].append(c)
for i in range(4):                                                     # blanketflower: red centre, yellow tips, dark dome
    x = spot(); y = rng.uniform(MY0 + 0.05, MY1 - 0.04)
    tip = stem_to(x, y, rng.uniform(0.16, 0.22))
    n, a, b = head_frame(tip, 0.4)
    for k in range(13):
        ang = 2 * math.pi * k / 13; d = a * math.cos(ang) + b * math.sin(ang) + n * 0.1
        fl["blanket_red"].append(petal3d(tip, d, 0.034, 0.02, 0.006, face=n))
        fl["blanket_yel"].append(petal3d(tip + d.normalized() * 0.026 * FS, d, 0.026, 0.024, 0.0065, face=n))
    c = bmesh.new(); bmesh.ops.create_uvsphere(c, u_segments=14, v_segments=8, radius=0.016 * FS)
    bmesh.ops.scale(c, vec=(1, 1, 0.7), verts=c.verts)
    q = Vector((0, 0, 1)).rotation_difference(n); bmesh.ops.transform(c, matrix=Matrix.Translation(tip + n * 0.006) @ q.to_matrix().to_4x4(), verts=c.verts); fl["center"].append(c)
for key, m in (("stems", "leaf"), ("leaves", "leaf"), ("paintbrush", "paintbrush"), ("lily", "lily"), ("flax", "flax"),
               ("blanket_red", "blanket_red"), ("blanket_yel", "blanket_yel"), ("center", "center"), ("yellow", "yellow")):
    if fl[key]:
        add("flowers_" + key, merge(fl[key]), M[m])

# ---------------------------------------------------------------- light and camera
for o in [o for o in SC.objects if o.type == 'LIGHT']:
    bpy.data.objects.remove(o)


def light(name, kind, loc, aim, energy, col, size=0.5):
    L = bpy.data.lights.new(name, kind); L.energy = energy; L.color = col
    if kind == 'AREA':
        L.size = size
    if kind == 'SPOT':
        L.spot_size = math.radians(55); L.spot_blend = 0.6
    o = bpy.data.objects.new(name, L); SC.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o


light("counter_warm", 'AREA', (0.0, -1.3, 1.05), (0.0, 0.0, TOP + 0.15), 34, (1.0, 0.82, 0.62), size=1.6)   # soft, dim, even (Tristan's reference)
sk = light("sky_cool", 'AREA', (0.0, -0.2, 1.3), (0, 0.4, 0.8), 6, (0.45, 0.55, 1.0), size=2.0)
sk.data.use_shadow = False
light("meadow_warm", 'AREA', (0.0, -1.2, 0.55), (0, -0.4, 0.12), 6, (1.0, 0.82, 0.62), size=1.2)
light("rim", 'AREA', (0.6, 0.35, 0.9), (0.1, 0, TOP), 3, (0.7, 0.75, 1.0), size=0.4)
sc = bpy.context.scene
w = sc.world or bpy.data.worlds.new("World"); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND"); bg.inputs[0].default_value = (0.01, 0.012, 0.03, 1); bg.inputs[1].default_value = 0.15
cam = bpy.data.objects.get("stage_cam") or bpy.data.objects.new("stage_cam", bpy.data.cameras.new("stage_cam"))
if cam.name not in SC.objects:
    SC.objects.link(cam)
cam.data.lens = 34
cam.location = (-0.36, -2.2, 1.0)
cam.rotation_euler = (Vector((0.0, 0.0, 0.62)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
sc.render.resolution_x, sc.render.resolution_y = 1600, 900
# the two framings the web build uses: wide (desktop) and tall (phones)
cam["wide"] = {"lens": 44, "loc": [0.06, -2.6, 0.86], "look": [0.06, 0.0, 0.56]}   # square on, just above the counter top (Tristan's reference)   # the first look's three-quarter camera
cam["tall"] = {"lens": 48, "loc": [-0.28, -2.4, 0.98], "look": [0.0, 0.0, 0.66]}
try:
    sc.view_settings.view_transform = 'AgX'                    # the first look's colour
except TypeError:
    pass
print("stage built:", len(SC.objects), "objects")
