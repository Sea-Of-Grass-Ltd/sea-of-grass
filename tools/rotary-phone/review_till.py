"""A clean review set for the Smoked-Glass Till: its own scene `till_review` on the page's navy, three area lights, the
rose glow inside the hood and a camera. Run after build_till.py in the same globals."""
import bpy, bmesh
from mathutils import Vector

main = bpy.data.scenes.get("Scene") or bpy.context.scene
sc = bpy.data.scenes.get("till_review") or bpy.data.scenes.new("till_review")
tc = bpy.data.collections["till"]
if tc.name not in sc.collection.children:
    sc.collection.children.link(tc)
C = bpy.data.objects["till_rig"].matrix_world.translation.copy()
w = bpy.data.worlds.get("till_world") or bpy.data.worlds.new("till_world"); w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (0.020, 0.024, 0.068, 1)
sc.world = w
for n in ["tr_floor", "tr_key", "tr_rim", "tr_fill", "tr_cam", "tr_rose"]:
    o = bpy.data.objects.get(n)
    if o:
        bpy.data.objects.remove(o)
me = bpy.data.meshes.new("tr_floor"); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=3); bm.to_mesh(me); bm.free()
fm = bpy.data.materials.get("tr_floor_m") or bpy.data.materials.new("tr_floor_m"); fm.use_nodes = True
b = next(n for n in fm.node_tree.nodes if n.type == "BSDF_PRINCIPLED"); b.inputs["Base Color"].default_value = (0.010, 0.012, 0.034, 1)
b.inputs["Roughness"].default_value = 0.9
me.materials.append(fm); fl = bpy.data.objects.new("tr_floor", me); sc.collection.objects.link(fl); fl.location = C


def light(name, typ, energy, col, loc, size=0.3):
    ld = bpy.data.lights.new(name, typ); ld.energy = energy; ld.color = col
    if typ == 'AREA':
        ld.size = size
    else:
        ld.shadow_soft_size = 0.002
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = C + Vector(loc)
    o.rotation_euler = ((C + Vector((0, 0, 0.12))) - o.location).to_track_quat('-Z', 'Y').to_euler(); return o


light("tr_key", 'AREA', 7, (1, 0.95, 0.92), (-0.35, -0.45, 0.55), 0.4)
light("tr_rim", 'AREA', 26, (0.75, 0.8, 1.0), (0.35, 0.45, 0.35), 0.3)
light("tr_fill", 'AREA', 1.5, (1, 0.85, 0.85), (0.45, -0.35, 0.15), 0.4)
r = light("tr_rose", 'POINT', 0.35, (0.85, 0.57, 0.54), (0, HOOD_Y - HOOD[1] / 2 + 0.008, Z_TOP + HOOD[2] - 0.008))
r.visible_camera = False
cd = bpy.data.cameras.new("tr_cam"); cd.lens = 60; cam = bpy.data.objects.new("tr_cam", cd); sc.collection.objects.link(cam)
cam.location = C + Vector((-0.42, -0.62, 0.36)); cam.rotation_euler = ((C + Vector((0, 0, 0.14))) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam; sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
sc.render.resolution_x = 1000; sc.render.resolution_y = 900
sc.view_settings.view_transform = main.view_settings.view_transform
print("review set ready at", C)
