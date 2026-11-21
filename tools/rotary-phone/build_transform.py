"""The register turns into the ringing phone with a jump-morph (Tristan, 2026-11-20, after the "morph anything with only
keyframes" trick): one shared jump with anticipation and squash-and-stretch, and the swap happens in a single frame at
the fastest, most stretched moment, where the eye expects the shape to change. The keys ride with the register (a
keys-into-finger-holes flight is kept behind KEYS_FLY, off: he preferred the plain morph).

One 0-1 timeline (frame = 1 + 48 t) keyed on every part's own transform each frame, so the page can scrub it with scroll:
  0.00-0.10  the register sits
  0.10-0.22  it crouches (squash)
  0.22-0.31  it springs up, stretching
  0.3125     swap: register out, phone in, same stretch and height
  0.31-0.57  the phone flies up, turns once, falls
  0.57-0.78  lands, squashes, wobbles, settles
Run live after build_phone.py, build_register.py and build_stage.py, in the same globals.
"""
import bpy, math
from mathutils import Vector, Matrix, Quaternion, Euler

F0, FN = 1, 49
HIDE = 0.001
reg_rig, ph_rig = bpy.data.objects["register_rig"], bpy.data.objects["phone_rig"]
ph_rig.location = reg_rig.location.copy(); ph_rig.rotation_euler = reg_rig.rotation_euler.copy()
bpy.context.view_layer.update()
RIG_R = reg_rig.matrix_world.to_3x3().normalized()

reg = {o.name: o for o in bpy.data.collections["register"].objects if o.type == 'MESH'}
ph = {o.name: o for o in bpy.data.collections["rotary_phone"].objects if o.type == 'MESH'}
# on a re-run the phone still carries the last run's keys; at the last frame every phone part is whole and in place
bpy.context.scene.frame_set(FN); bpy.context.view_layer.update()
REST = {o.name: o.matrix_world.copy() for o in list(reg.values()) + list(ph.values())}
for o in list(reg.values()) + list(ph.values()):
    if o.animation_data:
        o.animation_data_clear()
    o.rotation_mode = 'QUATERNION'

PIV = reg_rig.matrix_world.translation.copy()           # the base centre on the counter: squash and stretch about here
FS = 16                                                  # the swap frame (t = 0.3125)

# the jump: (t, height, z-stretch, turn in degrees); xy scale keeps the volume
JUMP = [(0.00, 0.00, 1.00, 0), (0.10, 0.00, 1.00, 0), (0.22, 0.00, 0.72, 0), (0.27, 0.05, 1.28, 10),
        (0.3125, 0.15, 1.34, 60), (0.38, 0.27, 1.06, 170), (0.44, 0.30, 0.95, 250), (0.51, 0.21, 1.12, 330),
        (0.57, 0.00, 1.18, 360), (0.61, 0.00, 0.74, 360), (0.67, 0.00, 1.08, 360), (0.72, 0.00, 0.97, 360),
        (0.78, 0.00, 1.00, 360), (1.00, 0.00, 1.00, 360)]


def jump(t):
    for (t0, h0, s0, r0), (t1, h1, s1, r1) in zip(JUMP, JUMP[1:]):
        if t <= t1:
            u = (t - t0) / (t1 - t0) if t1 > t0 else 1.0
            u = u * u * (3 - 2 * u)
            return h0 + (h1 - h0) * u, s0 + (s1 - s0) * u, r0 + (r1 - r0) * u
    return JUMP[-1][1:]


def G(t, hide=False):
    h, sz, r = jump(t)
    sxy = 1 / math.sqrt(sz)
    S = Matrix.Diagonal((sxy, sxy, sz, 1)) if not hide else Matrix.Diagonal((HIDE, HIDE, HIDE, 1))
    return Matrix.Translation(PIV + Vector((0, 0, h))) @ Matrix.Rotation(math.radians(r), 4, 'Z') @ S @ Matrix.Translation(-PIV)


def put(o, f, M):
    o.matrix_world = M
    for path in ("location", "rotation_quaternion", "scale"):
        o.keyframe_insert(path, frame=f)


def centre(o):
    pts = [REST[o.name] @ Vector(c) for c in o.bound_box]
    return sum(pts, Vector()) / len(pts)


# ---------------------------------------------------------------- the keys' flights
KEYS = [reg[n] for n in sorted(n for n in reg if n.startswith("key_"))] + [reg["total_key"]]
pm = ph_rig.matrix_world
DN = (pm.to_3x3() @ DIAL_M.to_3x3() @ Vector((0, 0, 1))).normalized()          # the dial face's normal
HOLES = [pm @ (DIAL_M @ Vector((HOLE_RING * math.cos(a), HOLE_RING * math.sin(a), 0.006))) for a in HOLE_ANGS]
KEY_UP = (RIG_R @ NRM).normalized()                                               # a key's stem axis at rest
T_OFF = 0.27


def key_path(k, o):
    """position, rotation, scale of key k at time t, after it leaves the register"""
    c0 = centre(o)
    start = G(T_OFF) @ c0
    hole = HOLES[k % len(HOLES)]
    land = 0.62 + 0.024 * k
    fan = Matrix.Rotation(math.radians(-70 + 140 * k / max(1, len(KEYS) - 1)), 3, 'Y')    # they fan out like a fountain
    apex = (start + hole) / 2 + RIG_R @ (fan @ Vector((0, 0, 0.36 + 0.05 * (k % 3))))
    q_land = KEY_UP.rotation_difference(DN)

    def at(t):
        if t <= land:
            u = (t - T_OFF) / (land - T_OFF); u = max(0.0, min(1.0, u))
            p = start * (1 - u) ** 2 + apex * 2 * u * (1 - u) + hole * u * u                  # a thrown arc
            axis = Vector((1, 0, 0)) if k % 2 else Vector((0, 1, 0))
            tumble = Quaternion(axis, math.radians(360 * u))
            q = Quaternion().slerp(q_land, u) @ tumble if u < 1 else q_land
            s = 1 + 0.6 * math.sin(math.pi * u)                                                 # big in flight
            return p, q, s
        u = min(1.0, (t - land) / 0.07)                                                        # presses into its hole
        return hole - DN * 0.012 * u, q_land, max(HIDE, 1 - u)
    return at, c0


# ---------------------------------------------------------------- key every frame
KEYS_FLY = False                                       # Tristan 2026-11-20: works fine without the keys, just the morph
paths = {o.name: key_path(k, o) for k, o in enumerate(KEYS)} if KEYS_FLY else {}
for f in range(F0, FN + 1):
    t = (f - F0) / (FN - F0)
    for o in reg.values():
        if o.name in paths and t > T_OFF:
            at, c0 = paths[o.name]; p, q, s = at(t)
            M = Matrix.Translation(p) @ q.to_matrix().to_4x4() @ Matrix.Diagonal((s, s, s, 1)) @ Matrix.Translation(-c0) @ REST[o.name]
            put(o, f, M)
        else:
            put(o, f, G(t, hide=(f > FS and o.name not in paths)) @ REST[o.name])
    for o in ph.values():
        put(o, f, G(t, hide=(f <= FS)) @ REST[o.name])

sc = bpy.context.scene
sc.frame_start, sc.frame_end = F0, FN
for o in list(reg.values()) + list(ph.values()):
    ad = o.animation_data
    if ad and ad.action:
        for fc in getattr(ad.action, "fcurves", []):
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'
sc.frame_set(F0)
print("jump-morph keyed:", len(reg) + len(ph), "parts,", FN - F0 + 1, "frames; swap at frame", FS)
