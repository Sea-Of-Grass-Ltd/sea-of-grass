"""Sweep each phone parameter 0..1 and check for triangle overlaps between parts on different bones.

Adapted from AnyMachine laptop/scripts/check.py:
  MIT License, Copyright (c) 2026 Apekshik Panigrahi
  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  documentation files (the "Software"), to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright
  notice and this permission notice shall be included in all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

Run live after build_phone.py (needs its globals: pose, ARM):  exec(open(PATH).read(), g)
Writes check.json next to this file. Fails (CHECK_FAIL) on any overlap across bones, at rest or in a sweep.
"""
import bpy, json, os
from mathutils.bvhtree import BVHTree
from mathutils import Vector

STEPS = 50
ATTACHED = {("coiled_cord", "relief_body"), ("coiled_cord", "relief_handset"), ("coiled_cord", "body_shell"),
            ("coiled_cord", "mouthpiece")}   # cord ends plug into these by design; checked away from the ends below
CORD_END_MM = 14


def tris(o):
    dg = bpy.context.evaluated_depsgraph_get()
    oe = o.evaluated_get(dg)
    m = oe.to_mesh()
    mw = oe.matrix_world
    v = [mw @ x.co for x in m.vertices]
    m.calc_loop_triangles()
    p = [tuple(t.vertices) for t in m.loop_triangles]
    oe.to_mesh_clear()
    return v, p


def bone_of(o):
    return o.parent_bone if o.parent_type == 'BONE' else "cord"


def cord_mid_only(v, p, total_len):
    # drop triangles within CORD_END_MM of either end (vertices run handset end -> body end)
    n = len(v)
    cut = int(n * (CORD_END_MM / 1000) / total_len)
    keep = [t for t in p if all(cut <= i < n - cut for i in t)]
    return v, keep


def check_state(objs, label):
    data = {o.name: tris(o) for o in objs}
    cord = bpy.data.objects["coiled_cord"]
    bvh = {}
    for name, (v, p) in data.items():
        if name == "coiled_cord":
            v, p = cord_mid_only(v, p, cord["path_len"])
        bvh[name] = BVHTree.FromPolygons(v, p) if p else None
    hits = []
    names = sorted(data)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            oa, ob = bpy.data.objects[a], bpy.data.objects[b]
            if bone_of(oa) == bone_of(ob):
                continue
            if bvh[a] is None or bvh[b] is None:
                continue
            n = len(bvh[a].overlap(bvh[b]))
            if n:
                hits.append((a, b, n))
    # cord against itself: triangles more than 3 rings apart must not touch
    v, p = data["coiled_cord"]
    t = BVHTree.FromPolygons(v, p)
    ring, gap = 8, max(4, int(cord["rings_per_turn"] * 0.6))   # neighbours within 0.6 turn share a seam
    self_hits = sum(1 for x, y in t.overlap(t) if abs(min(p[x]) // ring - min(p[y]) // ring) > gap)
    return hits, self_hits


def run(g):
    arm, pose = g["ARM"], g["pose"]
    objs = [o for o in bpy.data.collections["rotary_phone"].objects if o.type == 'MESH']
    res = {"rest": None, "sweeps": {}}
    pose(arm)
    h, s = check_state(objs, "rest")
    res["rest"] = {"overlaps": h, "cord_self": s}
    for param in ("handset_lift", "dial", "ring"):
        rows = []
        for k in range(STEPS + 1):
            t = k / STEPS
            kw = {param: t}
            if param == "ring":
                kw = {"ring": 1.0, "ring_t": t}
            pose(arm, **kw)
            h, s = check_state(objs, f"{param}={t}")
            low = min(min(v.z for v in tris(x)[0]) for x in objs)   # real vertices, cord included
            if low < -1e-5:
                h = h + [("below_counter", round(low * 1000, 2), 0)]
            if h or s:
                rows.append({"t": round(t, 3), "overlaps": h, "cord_self": s})
        res["sweeps"][param] = {"steps": STEPS + 1, "bad_steps": rows}
    pose(arm)
    ok = not res["rest"]["overlaps"] and not res["rest"]["cord_self"] and not any(v["bad_steps"] for v in res["sweeps"].values())
    res["ok"] = ok
    out = os.path.join(os.path.dirname(g["PATH"]), "check.json")
    json.dump(res, open(out, "w"), indent=1)
    print("CHECK_OK" if ok else "CHECK_FAIL", json.dumps({"rest": res["rest"], **{k: v["bad_steps"][:3] for k, v in res["sweeps"].items()}})[:2500])
    return res
