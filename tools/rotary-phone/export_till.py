"""Export the Smoked-Glass Till (build_till.py) on its own for the page: the parts at rest under `till_rig`, in the old
register's local frame, so stage.js can move them into `register_rig` and the jump-morph carries over. Set TILL_OUT.
Make `till_review` the window's scene first, in an earlier call (the export reads the window's scene, and switching it
inside the same call, or with temp_override, exported the wrong scene once and crashed Blender once).
Compress afterwards:  npx @gltf-transform/cli meshopt till-raw.glb till.glb
"""
import bpy
TILL_OUT = globals()["TILL_OUT"]
assert bpy.context.scene.name == "till_review", "switch the window to till_review first"
tc = bpy.data.collections["till"]
rig = bpy.data.objects["till_rig"]
keep = rig.matrix_world.copy()
rig.matrix_world = rig.matrix_world.Identity(4)             # parts go out in the register's local frame
bpy.context.view_layer.update()
sel = list(tc.objects)
for o in bpy.context.view_layer.objects:
    o.select_set(o in sel)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=TILL_OUT, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_animations=False, export_extras=True, export_materials="EXPORT", export_lights=False,
                          export_cameras=False)
rig.matrix_world = keep
print("till exported:", len(sel), "objects ->", TILL_OUT)
