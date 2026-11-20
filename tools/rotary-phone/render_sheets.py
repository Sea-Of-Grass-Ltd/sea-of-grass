"""Render the turnaround and parameter frames for the phone sheets (run live after build_phone.py).

exec(open(PATH).read(), g) with g holding build_phone's globals (pose, ARM, DIAL_M) and OUT (a folder).
Writes one PNG per view; make_sheets.py lays them out.
"""
import bpy, os, math
from mathutils import Vector

sc = bpy.context.scene
OUT = g_out = globals().get("OUT")
os.makedirs(OUT, exist_ok=True)
sc.render.resolution_x = sc.render.resolution_y = 900
sc.render.film_transparent = False
try:
    sc.eevee.taa_render_samples = 96
except AttributeError:
    pass

cam = bpy.data.objects.get("sheet_cam")
if cam is None:
    cam = bpy.data.objects.new("sheet_cam", bpy.data.cameras.new("sheet_cam"))
    sc.collection.objects.link(cam)
sc.camera = cam
CENTER = Vector((-0.02, 0.0, 0.075))


def shoot(name, direction, ortho=None, center=CENTER, dist=0.75, lens=85):
    d = Vector(direction).normalized()
    cam.location = center + d * dist
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    else:
        cam.data.type = 'PERSP'; cam.data.lens = lens
    cam.data.clip_start, cam.data.clip_end = 0.01, 5
    bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)


arm, pose = ARM, pose
arm.hide_set(True); arm.hide_render = True
pose(arm)
# turnaround
shoot("turn_3q", (-0.45, -1, 0.5), lens=70)
shoot("turn_front", (0, -1, 0.0), ortho=0.36)
shoot("turn_right", (1, 0, 0.0), ortho=0.36)
shoot("turn_back", (0, 1, 0.0), ortho=0.36)
shoot("turn_left", (-1, 0, 0.0), ortho=0.36)
shoot("turn_top", (0, -0.0001, 1), ortho=0.36)
# handset_lift
for t in (0.0, 0.5, 1.0):
    pose(arm, handset_lift=t)
    shoot(f"lift_{int(t * 100):03d}", (-0.6, -1, 0.35), lens=60, center=Vector((-0.02, 0, 0.10)))
# dial: square-on to the dial face
dc = DIAL_M @ Vector((0, 0, 0))
dn = (DIAL_M.to_3x3() @ Vector((0, 0, 1))).normalized()
for t in (0.0, 0.5, 1.0):
    pose(arm, dial=t)
    shoot(f"dial_{int(t * 100):03d}", dn, ortho=0.13, center=dc, dist=0.4)
pose(arm)
print("rendered to", OUT)

# ---- clips (frames only; make_sheets.py --clips turns them into mp4s)
if globals().get("CLIPS"):
    sc.render.resolution_x = sc.render.resolution_y = 560
    try:
        sc.eevee.taa_render_samples = 48
    except AttributeError:
        pass
    CL = os.path.join(os.path.dirname(OUT), "clips")
    def clip_shot(sub, k, direction, **kw):
        os.makedirs(os.path.join(CL, sub), exist_ok=True)
        global OUT
        keep = OUT; OUT = os.path.join(CL, sub)
        shoot(f"{k:03d}", direction, **kw)
        OUT = keep
    pose(arm)
    for k in range(48):                                   # turntable
        a = 2 * math.pi * k / 48
        clip_shot("turntable", k, (-math.sin(a), -math.cos(a), 0.45), lens=70)
    for k in range(40):                                   # lift up and back down
        t = k / 20 if k <= 20 else (40 - k) / 20
        pose(arm, handset_lift=t)
        clip_shot("lift", k, (-0.6, -1, 0.35), lens=60, center=Vector((-0.02, 0, 0.10)))
    for k in range(40):                                   # wind to the stop, then run back
        t = k / 24 if k <= 24 else (40 - k) / 16
        pose(arm, dial=t)
        clip_shot("dial", k, dn, ortho=0.13, center=dc, dist=0.4)
    for k in range(24):                                   # ring rattle
        pose(arm, ring=1.0, ring_t=k / 24)
        clip_shot("ring", k, (-0.45, -1, 0.3), lens=70)
    pose(arm)
