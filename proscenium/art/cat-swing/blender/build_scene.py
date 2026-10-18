"""Build the cat-swing scene in Blender, lined up with the finished still.

Run it either way:
  - Blender > Scripting tab > Open this file > Run Script
  - blender --python build_scene.py            (opens Blender with the scene)
  - blender -b --python build_scene.py -- --save cat-swing.blend

It clears the current scene, then builds:
  - a 9:16 camera with the finished still as its background image, so every
    part can be placed over the picture;
  - base meshes to sculpt from: tail and string (curves), haunch, chest, arm,
    leg, hind paw with claws, feather, and the belly-fur rug;
  - the generated GLB models from ../parts, if you have downloaded them into
    ./models (see README.md), sized and placed over their parts;
  - flat toon materials and a Freestyle pen outline.

Everything is placed in image pixels (the still is 1116 x 2000), so a part's
position can be read straight off the picture.
Developed against Blender 5.0; works in 4.2 or newer.
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

# --- settings -----------------------------------------------------------------

# Show the still on every part, projected from the camera, instead of the toon
# colours. From this camera the render then matches the picture exactly; useful
# for checking the layout, but the texture swims once the camera moves.
PROJECT_STILL = False

IMG_W, IMG_H = 1116, 2000        # the still, in pixels
FRAME_H = 10.0                   # world height of the picture plane, in metres
LENS = 50.0                      # mm; the camera sits wherever this frames the plane
SENSOR = 24.0                    # mm, fitted to the frame's height

INK = (0.16, 0.11, 0.09)         # pen outline colour

# --- paths ----------------------------------------------------------------------


def _here():
    # __file__ is set when run from the command line; inside Blender's text
    # editor fall back to the path of the open text block.
    try:
        return Path(__file__).resolve().parent
    except NameError:
        pass
    for text in bpy.data.texts:
        if text.filepath.endswith("build_scene.py"):
            return Path(bpy.path.abspath(text.filepath)).resolve().parent
    return Path.cwd()


HERE = _here()
STILL = HERE.parent / "cat-swing-nielsen-final.png"
MODELS = HERE / "models"

# --- image pixels -> world --------------------------------------------------------

PX = FRAME_H / IMG_H                       # metres per pixel on the picture plane
FRAME_W = IMG_W * PX
CAM_DIST = LENS / SENSOR * FRAME_H         # distance at which the plane fills the frame


def px(x, y, depth=0.0):
    """Image pixel (x right, y down) -> world point on the picture plane.

    The camera looks along +Y. depth > 0 pushes a point away from the camera
    (behind the plane), depth < 0 brings it forward; depth is in pixels too.
    """
    return Vector(((x / IMG_W - 0.5) * FRAME_W, depth * PX, (0.5 - y / IMG_H) * FRAME_H))


# --- scene helpers -----------------------------------------------------------------


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                  bpy.data.cameras, bpy.data.lights, bpy.data.textures):
        for item in list(block):
            block.remove(item)


def collection(name):
    coll = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(coll)
    return coll


def link(obj, coll):
    coll.objects.link(obj)
    return obj


def smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True


def ellipsoid(name, coll, centre, radii_px, rotation=(0, 0, 0)):
    """A UV sphere scaled to (x, depth, y) radii given in pixels."""
    mesh = bpy.data.meshes.new(name)
    obj = link(bpy.data.objects.new(name, mesh), coll)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0)
    bm.to_mesh(mesh)
    bm.free()
    smooth(obj)
    obj.location = centre
    obj.scale = tuple(r * PX for r in radii_px)
    obj.rotation_euler = tuple(math.radians(a) for a in rotation)
    return obj


def cone(name, coll, base, tip, radius_px):
    """A claw: a cone from base to tip (world points), curving is left to sculpting."""
    import bmesh
    mesh = bpy.data.meshes.new(name)
    obj = link(bpy.data.objects.new(name, mesh), coll)
    length = (tip - base).length
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=radius_px * PX,
                          radius2=0.0, depth=length)
    bm.to_mesh(mesh)
    bm.free()
    smooth(obj)
    obj.location = (base + tip) / 2
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((tip - base).normalized())
    return obj


def skin_limb(name, coll, points, radii_px, levels=2):
    """A limb from a chain of (x, y, depth) pixel points with a radius at each,
    using the Skin modifier: easy to re-pose by moving the chain's vertices."""
    mesh = bpy.data.meshes.new(name)
    verts = [px(*p) for p in points]
    mesh.from_pydata(verts, [(i, i + 1) for i in range(len(verts) - 1)], [])
    obj = link(bpy.data.objects.new(name, mesh), coll)
    skin = obj.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True
    for v, r in zip(obj.data.skin_vertices[0].data, radii_px):
        v.radius = (r * PX, r * PX)
    obj.data.skin_vertices[0].data[0].use_root = True
    sub = obj.modifiers.new("Subdivision", "SUBSURF")
    sub.levels = levels
    sub.render_levels = levels
    return obj


def curve_object(name, coll, points, radii, bevel_px, kind="BEZIER", closed=False):
    """A bevelled curve through world points, with a radius multiplier per point."""
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = bevel_px * PX
    data.bevel_resolution = 6
    data.use_fill_caps = True
    data.resolution_u = 24
    if kind == "BEZIER":
        spline = data.splines.new("BEZIER")
        spline.bezier_points.add(len(points) - 1)
        for bp, co, r in zip(spline.bezier_points, points, radii):
            bp.co = co
            bp.handle_left_type = bp.handle_right_type = "AUTO"
            bp.radius = r
    else:
        spline = data.splines.new("NURBS")
        spline.points.add(len(points) - 1)
        for p, co, r in zip(spline.points, points, radii):
            p.co = (co.x, co.y, co.z, 1.0)
            p.radius = r
        spline.order_u = 4
        spline.use_endpoint_u = True
    spline.use_cyclic_u = closed
    return link(bpy.data.objects.new(name, data), coll)


# --- materials --------------------------------------------------------------------


def toon_material(name, colour, shadow=0.62):
    """Flat two-tone shading: the colour in light, a darker step in shadow.
    Uses Shader to RGB, which works in EEVEE (Cycles renders it black)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    diffuse = nt.nodes.new("ShaderNodeBsdfDiffuse")
    to_rgb = nt.nodes.new("ShaderNodeShaderToRGB")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (shadow, shadow, shadow, 1)
    ramp.color_ramp.elements[1].position = 0.35
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type = "RGBA"
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1.0
    tint.inputs[7].default_value = (*colour, 1)
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(diffuse.outputs[0], to_rgb.inputs[0])
    nt.links.new(to_rgb.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], tint.inputs[6])
    nt.links.new(tint.outputs[2], emit.inputs[0])
    nt.links.new(emit.outputs[0], out.inputs[0])
    mat.diffuse_color = (*colour, 1)      # what Solid view shows
    return mat


def projection_material(image):
    """The still projected from the camera onto whatever wears this material."""
    mat = bpy.data.materials.new("Still projection")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    coords = nt.nodes.new("ShaderNodeTexCoord")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.extension = "CLIP"
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(coords.outputs["Window"], tex.inputs[0])
    nt.links.new(tex.outputs[0], emit.inputs[0])
    nt.links.new(emit.outputs[0], out.inputs[0])
    return mat


def wear(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)


# --- generated models ----------------------------------------------------------------


def import_glb(path, coll, centre, height_px, solid):
    """Import a generated GLB, scale it to height_px and centre it at centre.
    solid=False shows it as wireframe, hidden from renders: a guide to model over."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    new = [o for o in bpy.data.objects if o not in before]
    if not new:
        return None
    root = bpy.data.objects.new(path.stem + " (generated)", None)
    link(root, coll)
    for obj in new:
        for c in obj.users_collection:
            c.objects.unlink(obj)
        coll.objects.link(obj)
        if obj.parent is None:
            obj.parent = root
    bpy.context.view_layer.update()
    corners = [o.matrix_world @ Vector(c) for o in new if o.type == "MESH" for c in o.bound_box]
    lo = Vector(map(min, zip(*corners)))
    hi = Vector(map(max, zip(*corners)))
    scale = height_px * PX / max(hi.z - lo.z, 1e-6)
    root.scale = (scale,) * 3
    root.location = centre - (lo + hi) / 2 * scale
    if not solid:
        for obj in new:
            obj.display_type = "WIRE"
            obj.hide_render = True
    return root


# --- the scene ------------------------------------------------------------------------


def build():
    clear_scene()
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = IMG_W, IMG_H
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):   # 4.2-4.5 / 5.0+
        try:
            scene.render.engine = engine
            break
        except TypeError:
            pass
    scene.render.use_freestyle = True
    scene.render.line_thickness_mode = "ABSOLUTE"
    scene.render.line_thickness = 1.4
    lineset = scene.view_layers[0].freestyle_settings.linesets[0]
    lineset.linestyle.color = INK
    scene.view_settings.view_transform = "Standard"     # keep the painted colours true
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0, 0, 0, 1)

    still = bpy.data.images.load(str(STILL), check_existing=True) if STILL.exists() else None

    # Camera, looking along +Y at the picture plane, with the still behind the view.
    cams = collection("Camera")
    cam = link(bpy.data.objects.new("Camera", bpy.data.cameras.new("Camera")), cams)
    cam.data.lens = LENS
    cam.data.sensor_fit = "VERTICAL"
    cam.data.sensor_height = SENSOR
    cam.data.clip_end = 200
    cam.location = (0, -CAM_DIST, 0)
    cam.rotation_euler = (math.radians(90), 0, 0)
    scene.camera = cam
    if still:
        cam.data.show_background_images = True
        bg = cam.data.background_images.new()
        bg.image = still
        bg.alpha = 0.6
    sun = link(bpy.data.objects.new("Key light", bpy.data.lights.new("Key light", "SUN")), cams)
    sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(60), math.radians(-25), math.radians(-35))

    fawn = toon_material("Fawn fur", (0.78, 0.66, 0.52))
    white = toon_material("White fur", (0.95, 0.92, 0.88))
    claw = toon_material("Claw", (0.92, 0.88, 0.80))
    cream = toon_material("Belly rug", (0.93, 0.80, 0.64))
    twine = toon_material("Twine", (0.72, 0.60, 0.46))
    grey = toon_material("Shrike grey", (0.70, 0.72, 0.74))
    feather_mat = toon_material("Feather", (0.86, 0.86, 0.85))
    proj = projection_material(still) if still else None

    cat = collection("Cat")
    bird = collection("Shrike")
    strings = collection("String")
    floor = collection("Rug")
    generated = collection("Reference (generated)")

    # Tail: up the left edge, off the top of the frame, back in and into the spiral.
    tail_px = [(70, 880, 150), (60, 600, 150), (110, 300, 150), (260, -90, 120),
               (560, -110, 80), (790, -10, 60), (820, 160, 50), (760, 285, 40),
               (650, 300, 30), (585, 235, 25), (615, 175, 20), (675, 190, 15),
               (680, 230, 10), (650, 240, 5)]
    tail = curve_object("Tail", cat, [px(*p) for p in tail_px],
                        [1.0, 1.0, 0.98, 0.95, 0.92, 0.9, 0.85, 0.8, 0.72, 0.62, 0.52, 0.42, 0.32, 0.2],
                        bevel_px=82)
    wear(tail, fawn)

    # Haunch: the huge striped hindquarters, running off the left edge.
    haunch = ellipsoid("Haunch", cat, px(100, 1390, 260), (350, 380, 545))
    wear(haunch, fawn)

    # Chest and body behind the head.
    chest = ellipsoid("Chest", cat, px(905, 1390, 120), (250, 230, 360))
    wear(chest, white)

    # Head stand-in with ears (hidden when the generated head is present).
    head = ellipsoid("Head", cat, px(875, 900, 0), (215, 200, 250))
    wear(head, fawn)
    ears = []
    for i, (bx, by, tx, ty) in enumerate([(730, 700, 650, 540), (1020, 700, 1100, 560)]):
        ear = cone(f"Ear {i + 1}", cat, px(bx, by, 10), px(tx, ty, 10), 85)
        wear(ear, fawn)
        ears.append(ear)

    # Raised arm: in from the top right, the paw hooked down to hold the string.
    arm = skin_limb("Raised arm", cat,
                    [(1190, 20, 60), (1090, 170, 40), (970, 330, 10), (895, 450, -10), (865, 520, -20)],
                    [110, 102, 92, 84, 76])
    wear(arm, fawn)

    # Front leg, tucked under the body, paw on the rug.
    leg = skin_limb("Front leg", cat,
                    [(760, 1560, 40), (880, 1680, 0), (985, 1815, -30), (1045, 1910, -40)],
                    [92, 84, 76, 72])
    wear(leg, fawn)

    # Hind paw with four raised claws.
    paw = ellipsoid("Hind paw", cat, px(240, 1815, -40), (170, 120, 110))
    wear(paw, white)
    for i, (bx, by, tx, ty) in enumerate([(120, 1740, 110, 1660), (200, 1715, 205, 1630),
                                          (285, 1725, 300, 1645), (365, 1755, 385, 1685)]):
        c = cone(f"Hind claw {i + 1}", cat, px(bx, by, -60), px(tx, ty, -60), 14)
        wear(c, claw)

    # Shrike stand-in (replaced by the generated model when it is present).
    shrike = ellipsoid("Shrike body", bird, px(600, 1275, -80), (55, 45, 75), rotation=(0, 25, 0))
    wear(shrike, grey)

    # String: from the claw down to the bird, three criss-crossing loops round its
    # body, then a loose end hanging below.
    centre = px(600, 1275, -80)
    pts = [px(845, 560, -30), px(780, 760, -50), px(690, 1000, -70), px(625, 1180, -80)]
    for i in range(37):
        t = i / 36 * 3 * 2 * math.pi
        rise = (i / 36 - 0.5) * 110 * PX                  # loops run down the body
        tilt = math.sin(t * 0.5) * 30 * PX                # and cross over each other
        pts.append(centre + Vector((math.cos(t) * 62 * PX, math.sin(t) * 52 * PX, rise + tilt)))
    pts += [px(615, 1340, -80), px(630, 1390, -75), px(620, 1420, -75)]
    string = curve_object("String", strings, pts, [1.0] * len(pts), bevel_px=4, kind="NURBS")
    wear(string, twine)

    # Feather, falling below the bird.
    feather = ellipsoid("Feather", bird, px(555, 1478, -90), (34, 3, 12), rotation=(0, 35, 0))
    wear(feather, feather_mat)

    # Rug of belly fur across the bottom, tilted towards the camera, gently rolling.
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=96, y_subdivisions=48, size=1)
    rug = bpy.context.active_object
    for c in rug.users_collection:
        c.objects.unlink(rug)
    floor.objects.link(rug)
    rug.name = "Belly rug"
    rug.scale = (FRAME_W * 1.3, 520 * PX, 1)
    rug.location = px(558, 1860, 80)
    rug.rotation_euler = (math.radians(68), 0, 0)
    clouds = bpy.data.textures.new("Rug mounds", "CLOUDS")
    clouds.noise_scale = 0.9
    disp = rug.modifiers.new("Mounds", "DISPLACE")
    disp.texture = clouds
    disp.strength = 0.35
    rug.modifiers.new("Subdivision", "SUBSURF").levels = 1
    smooth(rug)
    wear(rug, cream)

    # Generated models, if downloaded: (file, centre, height in px, keep as solid?)
    for name, where, height, solid in [
            ("shrike", px(595, 1290, -80), 290, True),
            ("head", px(870, 870, 0), 780, True),
            ("arm", px(990, 300, 20), 560, False),
            ("leg", px(920, 1730, -10), 420, False),
            ("hind_paw", px(240, 1790, -40), 260, False),
            ("tail", px(420, 300, 120), 900, False),
            ("haunch", px(150, 1380, 260), 1150, False)]:
        path = MODELS / f"{name}.glb"
        if path.exists():
            import_glb(path, generated, where, height, solid)
            stand_ins = {"shrike": [shrike], "head": [head, *ears]}.get(name, [])
            for obj in stand_ins:
                obj.hide_viewport = obj.hide_render = True

    if PROJECT_STILL and proj:
        for obj in list(cat.objects) + list(bird.objects) + list(strings.objects) + [rug]:
            if obj.data is not None and hasattr(obj.data, "materials"):
                wear(obj, proj)


build()

# blender -b --python build_scene.py -- --save out.blend
if "--" in sys.argv:
    args = sys.argv[sys.argv.index("--") + 1:]
    if "--save" in args:
        bpy.ops.wm.save_as_mainfile(filepath=str(Path(args[args.index("--save") + 1]).resolve()))
