"""Bake the phone's three controls into glTF actions and export a GLB (run live after build_phone.py).

After AnyMachine's laptop/scripts/export.py (MIT, (c) 2026 Apekshik Panigrahi): glTF has no drivers, so every
control becomes one linear action, 1 s long at 24 fps, where time t = control value ("seek t = param").
  handset_lift : handset, plunger_L, plunger_R
  dial         : dial
  ring         : root, handset (a one-shot rattle, 1 s; the viewer mutes handset_lift while it plays)
The rig node carries the dial numbers as extras for the viewer (Blender Z-up; the viewer converts).
Needs g with build_phone's globals and GLB_OUT. Compression is a separate step (gltfpack -cc).
"""
import bpy, math
from mathutils import Vector

arm = ARM
sc = bpy.context.scene
sc.render.fps = 24
arm.animation_data_create()
for t in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(t)
for a in [a for a in bpy.data.actions if a.name in ("handset_lift", "dial", "ring")]:
    bpy.data.actions.remove(a)


def bake(name, bones, poser, n=24):
    act = bpy.data.actions.new(name)
    arm.animation_data.action = act
    for i in range(n + 1):
        poser(i / n)
        for b in bones:
            pb = arm.pose.bones[b]
            pb.keyframe_insert("location", frame=1 + i)
            pb.keyframe_insert("rotation_quaternion", frame=1 + i)
    act.use_fake_user = True
    trk = arm.animation_data.nla_tracks.new()
    trk.name = name
    trk.strips.new(name, 1, act)
    arm.animation_data.action = None
    return act


bake("handset_lift", ["handset", "plunger_L", "plunger_R"], lambda t: pose(arm, handset_lift=t))
bake("dial", ["dial"], lambda t: pose(arm, dial=t))
bake("ring", ["root", "handset"], lambda t: pose(arm, ring=1.0 * math.sin(math.pi * t) ** 0.5, ring_t=t))
pose(arm)

dn = (DIAL_M.to_3x3() @ Vector((0, 0, 1))).normalized()
dx = (DIAL_M.to_3x3() @ Vector((1, 0, 0))).normalized()
arm["dial_center"] = list(DIAL_M @ Vector((0, 0, 0.0068)))
arm["dial_normal"] = list(dn)
arm["dial_x"] = list(dx)
arm["dial_max_deg"] = math.degrees(DIAL_MAX)
arm["hole_ring"] = HOLE_RING
arm["hole0_deg"] = math.degrees(HOLE_ANGS[-1])
arm["handset_center"] = list(HS_PIVOT)
for k in ("handset_lift", "dial", "ring"):
    if k in arm.keys():
        del arm[k]

coll = bpy.data.collections["rotary_phone"]
for o in bpy.context.view_layer.objects:
    o.select_set(False)
for o in coll.objects:
    o.hide_set(False)
    o.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_animations=True, export_animation_mode="NLA_TRACKS", export_extras=True,
                          export_force_sampling=True, export_materials="EXPORT", export_image_format="NONE")
arm.hide_set(True)
import os
print("EXPORTED", GLB_OUT, os.path.getsize(GLB_OUT) // 1024, "KB")
