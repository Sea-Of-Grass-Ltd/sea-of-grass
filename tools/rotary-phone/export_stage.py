"""Export the Websites opening stage for the page: stage + register + phone, all at rest (the page plays the jump-morph).
Run live after build_phone.py, build_register.py, build_stage.py and build_transform.py, in the same globals, with
STAGE_OUT (the .glb path) and SKY_OUT (the sky .webp/.png path) set. Compress afterwards:
    npx @gltf-transform/cli meshopt stage-raw.glb stage.glb

The painted sky is a shader (noise strokes) that glTF can't carry, so it is rendered flat to an image first and the
backdrop and side walls are exported as plain planes that show it. Lights and camera stay out: the page lights the
scene and drives its own camera. Each object's name survives, so the page can find the register, the phone, the board.
"""
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

sc = bpy.context.scene
SKY_OUT = globals().get("SKY_OUT"); STAGE_OUT = globals()["STAGE_OUT"]
stage = bpy.data.collections["stage"]
navy = bpy.data.materials["st_navy"]


def sky_image(path, w=2048):
    """render the backdrop's painted sky flat, front on, colour only (no light), to `path`"""
    bd = bpy.data.objects["backdrop"]
    nt = navy.node_tree; bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    col_src = bsdf.inputs["Base Color"].links[0].from_socket
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    old = out.inputs["Surface"].links[0].from_socket
    em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(col_src, em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs["Surface"])
    hid = [o for o in sc.objects if o is not bd and not o.hide_render]
    for o in hid:
        o.hide_render = True
    cd = bpy.data.cameras.new("_skycam"); cd.type = 'ORTHO'; cd.ortho_scale = STAGE_W
    cam = bpy.data.objects.new("_skycam", cd); sc.collection.objects.link(cam)
    cam.location = (0, BACK_Y - 1.0, STAGE_H / 2); cam.rotation_euler = (math.radians(90), 0, 0)
    keep = (sc.camera, sc.render.resolution_x, sc.render.resolution_y, sc.view_settings.view_transform, sc.render.film_transparent,
            sc.render.image_settings.file_format)
    sc.camera = cam; sc.render.resolution_x = w; sc.render.resolution_y = int(w * STAGE_H / STAGE_W)
    sc.view_settings.view_transform = 'Standard'; sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    (sc.camera, sc.render.resolution_x, sc.render.resolution_y, sc.view_settings.view_transform, sc.render.film_transparent,
     sc.render.image_settings.file_format) = keep
    bpy.data.objects.remove(cam); bpy.data.cameras.remove(cd)
    for o in hid:
        o.hide_render = False
    nt.links.new(old, out.inputs["Surface"]); nt.nodes.remove(em)


def plane(name, corners, img, uvs):
    """a quad through four world corners showing `img` (the painted sky), matte"""
    m = bpy.data.materials.get("sky_paint") or bpy.data.materials.new("sky_paint")
    m.use_nodes = True; nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None) or nt.nodes.new("ShaderNodeTexImage")
    tex.image = img; nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    bm = bmesh.new(); vs = [bm.verts.new(c) for c in corners]; f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.new()
    for l, t in zip(f.loops, uvs):
        l[uv].uv = t
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    o = bpy.data.objects.new(name, me); stage.objects.link(o); return o


sky_png = os.path.splitext(SKY_OUT)[0] + ".png"
sky_image(sky_png)
img = bpy.data.images.load(sky_png, check_existing=False)
x0, x1, z0, z1, yb = -STAGE_W / 2, STAGE_W / 2, 0.0, STAGE_H, BACK_Y - 0.0004
yf = BACK_Y - STAGE_D
made = [plane("sky_back", [(x0, yb, z0), (x1, yb, z0), (x1, yb, z1), (x0, yb, z1)], img, [(0, 0), (1, 0), (1, 1), (0, 1)])]
dU = STAGE_D / STAGE_W
made.append(plane("sky_left", [(x0 + 0.0004, yf, z0), (x0 + 0.0004, yb, z0), (x0 + 0.0004, yb, z1), (x0 + 0.0004, yf, z1)], img,
                  [(0, 0), (dU, 0), (dU, 1), (0, 1)]))
made.append(plane("sky_right", [(x1 - 0.0004, yb, z0), (x1 - 0.0004, yf, z0), (x1 - 0.0004, yf, z1), (x1 - 0.0004, yb, z1)], img,
                  [(1 - dU, 0), (1, 0), (1, 1), (1 - dU, 1)]))

# the jump-morph is played by the page on the two rigs (stage.js mirrors build_transform's JUMP table), so the parts go
# out whole and at rest: no keys (glTF loses keyed objects that hang off bones anyway)
for o in list(bpy.data.collections["register"].objects) + list(bpy.data.collections["rotary_phone"].objects):
    if o.animation_data:
        o.animation_data_clear()
    if o.name in REST:
        o.matrix_world = REST[o.name]
bpy.context.view_layer.update()
skip = {"backdrop", "side_wall", "header", "stage_cam"}
sel = [o for o in list(stage.objects) + list(bpy.data.collections["register"].objects) + list(bpy.data.collections["rotary_phone"].objects)
       if o.type in ('MESH', 'ARMATURE') and o.name.split('.')[0] not in skip]
bpy.ops.object.select_all(action='DESELECT')
for o in sel:
    o.hide_set(False); o.hide_viewport = False; o.select_set(True)
bpy.context.view_layer.objects.active = sel[0]
sc.frame_start, sc.frame_end = 1, 49
bpy.ops.export_scene.gltf(filepath=STAGE_OUT, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_animations=False, export_extras=True, export_materials="EXPORT", export_image_format="WEBP",
                          export_lights=False, export_cameras=False)
for o in made:
    bpy.data.objects.remove(o)
print("stage exported:", len(sel), "objects ->", STAGE_OUT)
