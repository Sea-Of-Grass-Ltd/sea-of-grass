"""The shop window for the Branding page: a Front Range Main Street shopfront in painted timber. Metres, Z up, front -Y.
blender -b --factory-startup -P build_window.py -- OUT_DIR   ->  window.blend, window-raw.glb, light.png, preview.png
Static parts are joined as `shop` with a second UV set; light.png holds the baked light: R = the pendant inside,
G = the two gooseneck sign lamps, B = the night sky. Each stored as sqrt(v / scale); scales go into scales.json."""
import bpy, bmesh, math, sys, json, random, os
from mathutils import Vector, Matrix
OUT = sys.argv[sys.argv.index("--")+1]; QUICK = "--quick" in sys.argv
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
def srgb(h):
    c=[int(h[i:i+2],16)/255 for i in (1,3,5)]; return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c)
def mat(n,h,rough=.5,metal=0):
    m=bpy.data.materials.new(n); m.use_nodes=True
    b=next(x for x in m.node_tree.nodes if x.type=="BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value=(*srgb(h),1); b.inputs["Roughness"].default_value=rough; b.inputs["Metallic"].default_value=metal
    return m
M=dict(paint=mat("w_paint","#4A5488",.42), trim=mat("w_trim","#626DA6",.4), stone=mat("w_stone","#6E7290",.85), wall=mat("w_wall","#39406B",.8),
 floor=mat("w_floor","#3A3D58",.6), wood=mat("w_wood","#4B4A66",.55), dark=mat("w_dark","#20243C",.5), brass=mat("w_brass","#B79A62",.34,1),
 enamel=mat("w_enamel","#2C3358",.3), white=mat("w_white","#E9E4DA",.5), wine=mat("w_wine","#7A1438",.45), tin=mat("w_tin","#A9ADBA",.3,.9),
 bulb=mat("w_bulb","#F2DFAE",.5), soil=mat("w_soil","#2A2A34",.95), leaf=mat("w_leaf","#5E7F56",.7), straw=mat("w_straw","#C8AE74",.7), red=mat("w_red","#D8412F",.6))
STAT=[]; LIVE=[]
def add(n,me,m,live=False):
    o=bpy.data.objects.new(n,me); S.collection.objects.link(o); me.materials.append(M[m]); (LIVE if live else STAT).append(o); return o
def box(n,x0,x1,y0,y1,z0,z1,m,bev=.004,live=False):
    bm=bmesh.new(); bmesh.ops.create_cube(bm,size=1)
    bmesh.ops.transform(bm,matrix=Matrix.Translation(((x0+x1)/2,(y0+y1)/2,(z0+z1)/2))@Matrix.Diagonal((x1-x0,y1-y0,z1-z0,1)),verts=bm.verts)
    if bev: bmesh.ops.bevel(bm,geom=bm.edges[:],offset=bev,segments=2,profile=.6,affect='EDGES')
    me=bpy.data.meshes.new(n); bm.to_mesh(me); bm.free(); return add(n,me,m,live)
def lathe(n,prof,m,loc=(0,0,0),seg=40,rot=None,live=False,cap=False):
    bm=bmesh.new(); rings=[]
    for r,z in prof: rings.append([bm.verts.new((r*math.cos(2*math.pi*i/seg),r*math.sin(2*math.pi*i/seg),z)) for i in range(seg)] if r>1e-6 else [bm.verts.new((0,0,z))])
    for a,b in zip(rings,rings[1:]):
        for i in range(seg):
            j=(i+1)%seg
            f=[a[i%len(a)]]+([a[j]] if len(a)>1 else [])+([b[j]] if len(b)>1 else [])+[b[i%len(b)]]
            bm.faces.new(f)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces[:])
    bmesh.ops.transform(bm,matrix=Matrix.Translation(loc)@(rot or Matrix()),verts=bm.verts)
    me=bpy.data.meshes.new(n); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth=True
    o=add(n,me,m,live); md=o.modifiers.new("e","EDGE_SPLIT"); md.split_angle=math.radians(38); return o
def tube(n,pts,r,m,live=False):
    cu=bpy.data.curves.new(n,"CURVE"); cu.dimensions="3D"; cu.bevel_depth=r; cu.bevel_resolution=4; cu.use_fill_caps=True
    sp=cu.splines.new("POLY"); sp.points.add(len(pts)-1)
    for p,q in zip(sp.points,pts): p.co=(*q,1)
    o=bpy.data.objects.new(n,cu); S.collection.objects.link(o); dg=bpy.context.evaluated_depsgraph_get()
    me=bpy.data.meshes.new_from_object(o.evaluated_get(dg)); bpy.data.objects.remove(o)
    for p in me.polygons: p.use_smooth=True
    return add(n,me,m,live)
def frame(n,x0,x1,z0,z1,w,y0,y1,m):                      # four mitre-free members, butted exactly
    box(n+"l",x0,x0+w,y0,y1,z0,z1,m); box(n+"r",x1-w,x1,y0,y1,z0,z1,m)
    box(n+"b",x0+w,x1-w,y0,y1,z0,z0+w,m); box(n+"t",x0+w,x1-w,y0,y1,z1-w,z1,m)
# ---- shopfront
W=1.16                                                  # half width
box("pave",-W-.22,W+.22,-.62,1.5,-.11,-.02,"stone",.012)
for i in range(4):                                     # flagstones
    x0=-W-.20+i*(2*W+.40)/4; box(f"flag{i}",x0+.004,x0+(2*W+.40)/4-.004,-.60,-.05,-.02,.0,"stone",.005)
box("plinth",-W,W,-.03,.10,0,.10,"stone",.008)
box("riser",-W+.16,W-.16,.0,.08,.10,.56,"paint")
for i in range(3):                                     # raised-and-fielded panels
    w=(2*W-.32)/3; x0=-W+.16+i*w
    frame(f"pf{i}",x0+.05,x0+w-.05,.15,.51,.028,-.016,.004,"trim")
    box(f"pp{i}",x0+.105,x0+w-.105,-.012,.004,.205,.455,"paint",.011)
box("sill",-W+.15,W-.15,-.075,.10,.56,.605,"trim",.008)
box("sillnose",-W+.15,W-.15,-.045,.0,.535,.56,"trim",.005)
for s in (-1,1):                                       # pilasters
    xa,xb=sorted((s*W,s*(W-.16)))
    box(f"pil{s}",xa,xb,-.045,.12,.10,2.22,"paint",.005)
    box(f"pilbase{s}",xa-.012,xb+.012,-.065,.13,.10,.24,"trim",.007)
    box(f"pilcap{s}",xa-.014,xb+.014,-.07,.13,2.12,2.22,"trim",.007)
    frame(f"pilp{s}",xa+.03,xb-.03,.30,2.06,.012,-.053,-.043,"trim")
    box(f"corb{s}",xa+.015,xb-.015,-.13,-.02,2.22,2.50,"trim",.014)
    frame(f"corbp{s}",xa+.038,xb-.038,2.26,2.46,.011,-.139,-.128,"paint")
X0,X1=-W+.16,W-.16
frame("sash",X0,X1,.605,1.98,.055,-.02,.07,"paint"); frame("bead",X0+.055,X1-.055,.66,1.925,.014,-.008,.03,"trim")
box("transom",X0,X1,-.035,.075,1.98,2.02,"trim",.006)
tz0,tz1=2.02,2.22; n=5; tw=(X1-X0)/n
frame("tr",X0,X1,tz0,tz1,.03,-.015,.06,"paint")
for i in range(1,n): box(f"trm{i}",X0+i*tw-.011,X0+i*tw+.011,-.012,.055,tz0+.03,tz1-.03,"trim",.003)
box("fascia",X0,X1,.0,.11,2.22,2.50,"paint"); frame("fasf",X0+.04,X1-.04,2.265,2.455,.016,-.014,.004,"trim")
for i,(y,z0,z1) in enumerate([(-.10,2.50,2.535),(-.145,2.535,2.565),(-.185,2.565,2.625),(-.165,2.625,2.645)]):
    box(f"corn{i}",-W-.03-(.02*min(i,2)),W+.03+(.02*min(i,2)),y,.14,z0,z1,"trim" if i!=2 else "paint",.007)
nd=27
for i in range(nd):
    x=X0+.04+(X1-X0-.08)*(i+.5)/nd; box(f"dent{i}",x-.016,x+.016,-.082,-.0,2.462,2.50,"trim",.002)
# ---- the room
D=1.32
box("rfloor",X0,X1,.08,D,.50,.56,"floor",0)
box("rback",X0,X1,D,D+.05,.50,2.30,"wall",0)
for s in (-1,1):
    xa,xb=sorted((s*(W-.16),s*(W-.11))); box(f"rside{s}",xa,xb,.12,D+.05,.50,2.30,"wall",0)
    xa,xb=sorted((s*W,s*(W-.16))); box(f"return{s}",xa,xb,.12,D+.05,0,2.50,"paint",.004)
box("rceil",X0,X1,.11,D+.05,2.24,2.30,"wall",0)
box("rbase",X0,X1,D-.018,D,.56,.66,"trim",.004)
for i in range(1,6): box(f"dado{i}",X0+i*(X1-X0)/6-.012,X0+i*(X1-X0)/6+.012,D-.012,D,.66,1.02,"trim",.003)
box("dadorail",X0,X1,D-.03,D,1.02,1.055,"trim",.006)
box("counter",-.78,.36,.80,1.12,.56,.98,"wine",.008); box("ctop",-.82,.40,.75,1.16,.98,1.02,"white",.006)
for i in range(4): frame(f"cp{i}",-.75+i*.275,-.75+i*.275+.255,.62,.92,.014,.790,.802,"dark")
for j,z in enumerate((1.28,1.58)):
    box(f"shelf{j}",-.86,.80,D-.21,D,z,z+.028,"trim",.005)
    for x in (-.78,-.03,.72): box(f"br{j}{x}",x-.014,x+.014,D-.17,D,z-.10,z,"trim",.004)
    x=-.80
    while x<.74:
        k=random.choice("jjbcp"); r=random.uniform(.034,.05); h=random.uniform(.11,.2); x+=r; y=D-.115; zz=z+.028; c=random.choice(["tin","white","wine","enamel","dark"])
        if k=="j": lathe("jar",[(0,0),(r*.92,0),(r,.008),(r,h*.72),(r*.72,h*.82),(r*.72,h*.86),(r*.8,h*.86),(r*.8,h),(0,h)],c,(x,y,zz),24)
        elif k=="b": lathe("bot",[(0,0),(r*.7,0),(r*.74,.008),(r*.74,h*.75),(r*.3,h*1.0),(r*.26,h*1.3),(r*.32,h*1.31),(r*.32,h*1.36),(0,h*1.36)],c,(x,y,zz),24)
        elif k=="c": lathe("cup",[(0,0),(r*.7,0),(r,h*.6),(r*.94,h*.6),(r*.66,.01),(0,.01)],"white",(x,y,zz),24)
        else: lathe("can",[(0,0),(r,0),(r,h*.8),(r*.95,h*.82),(0,h*.82)],c,(x,y,zz),28)
        x+=r+random.uniform(.016,.04)
def stool(x,y):
    lathe("seat",[(0,.36),(.12,.36),(.135,.372),(.135,.39),(.12,.405),(0,.408)],"wine",(x,y,.56))
    lathe("post",[(.018,.02),(.018,.36)],"brass",(x,y,.56),20); lathe("foot",[(0,0),(.12,0),(.12,.008),(.03,.026),(0,.026)],"brass",(x,y,.56))
    lathe("ring",[(.085+.007*math.cos(a),.14+.007*math.sin(a)) for a in [i*math.pi/6 for i in range(13)]],"brass",(x,y,.56))
    for a in (0,2.1,4.2): tube("spk",[(x,y,.70),(x+.085*math.cos(a),y+.085*math.sin(a),.70)],.004,"brass")
for x in (-.58,-.20,.18): stool(x,.58)
# tall agave in a pot, right
lathe("pot",[(0,0),(.09,0),(.12,.2),(.135,.2),(.135,.235),(.118,.235),(.112,.21),(0,.21)],"white",(.66,.74,.56))
def blade(pts,w,m,n="bl",fold=.25):
    bm=bmesh.new(); prev=None; N=len(pts)
    for i,p in enumerate(pts):
        p=Vector(p); d=(Vector(pts[min(i+1,N-1)])-Vector(pts[max(i-1,0)])).normalized(); s=d.cross(Vector((0,0,1)))
        s=s.normalized() if s.length>1e-4 else Vector((1,0,0)); t=i/(N-1); ww=w*(1-t)**.6*(.75+.6*math.sin(min(t*2,1)*1.57)*.4)
        up=s.cross(d)*ww*fold; row=[bm.verts.new(p-s*ww+up),bm.verts.new(p),bm.verts.new(p+s*ww+up)] 
        if prev:
            for k in (0,1): bm.faces.new((prev[k],prev[k+1],row[k+1],row[k]))
        prev=row
    me=bpy.data.meshes.new(n); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth=True
    return add(n,me,m,False)
for i in range(22):
    a=i*2.4; el=.35+1.1*(i/22); L=.30+.05*random.random(); pts=[(.66+math.cos(a)*math.cos(el)*L*t,.74+math.sin(a)*math.cos(el)*L*t*.9,.77+math.sin(el)*L*t-.05*t*t*math.cos(el)) for t in [k/6 for k in range(7)]]
    blade(pts,.024,"leaf","agave",.5)
# ---- pendant inside, right of the lettering's middle
PX,PY,PZ=.56,.62,1.86
lathe("pshade",[(.018,.12),(.022,.105),(.05,.09),(.115,.03),(.15,0),(.155,-.004),(.15,-.004),(.112,.024),(.048,.083),(0,.096)],"enamel",(PX,PY,PZ))
tube("pcord",[(PX,PY,PZ+.11),(PX,PY,2.24)],.005,"dark"); lathe("prose",[(0,0),(.04,0),(.05,-.02),(0,-.02)],"brass",(PX,PY,2.24))
def sph(r): return [(r*math.sin(a),-r*math.cos(a)) for a in [i*math.pi/14 for i in range(15)]]
def bulb(n,p,r): return lathe(n,[(x if x>1e-5 else 0,z) for x,z in sph(r)],"bulb",p,24,live=True)
bulb("bulb_pendant",(PX,PY,PZ+.028),.036)
# ---- goosenecks
G=[]
for k,s in enumerate((-1,1)):
    x=s*.50; pts=[]
    for t in [i/22 for i in range(23)]:
        a=math.pi*1.0*t; pts.append((x,-.03-.31*(1-math.cos(a))/2-.02*t,2.36+.40*math.sin(a)**.9*(1 if t<.5 else 1)*.72+(-.05*t)))
    tube(f"gn{k}",pts,.0095,"brass"); lathe(f"gr{k}",[(0,0),(.05,0),(.05,.008),(.03,.02),(0,.02)],"brass",(x,.0,2.36),32,Matrix.Rotation(math.radians(90),4,'X'))
    ex=pts[-1]; tilt=Matrix.Rotation(math.radians(-20),4,'X')          # faces down and back to the glass
    base=Vector(ex)
    lathe(f"gs{k}",[(.0,.03),(.026,.03),(.028,.0),(.06,-.018),(.115,-.085),(.135,-.10),(.139,-.106),(.133,-.104),(.108,-.084),(.055,-.024),(0,-.012)],"enamel",base,40,tilt)
    b=base+tilt@Vector((0,0,-.066)); bulb(f"bulb_sign_{k}",b,.030); G.append((b,tilt))
# ---- window box: blue grama and Indian paintbrush
bx0,bx1=-.86,.86; bz=.37
box("wbox",bx0,bx1,-.25,-.085,bz,bz+.15,"wood",.006); box("wrim",bx0-.012,bx1+.012,-.262,-.075,bz+.15,bz+.172,"trim",.005)
box("wsoil",bx0+.01,bx1-.01,-.24,-.095,bz+.172,bz+.174,"soil",0)
for x in (-.6,0,.6):
    box(f"wbr{x}",x-.018,x+.018,-.235,-.012,bz-.03,bz,"trim",.004)
def plant(me_list,n):
    for o in me_list: STAT.remove(o)
    LIVE.extend(me_list)
pl=[]
for i in range(330):
    x=random.uniform(bx0+.03,bx1-.03); y=random.uniform(-.225,-.11); L=random.uniform(.07,.17); a=random.uniform(0,6.28); ln=random.uniform(.15,.6)
    pl.append(blade([(x+math.cos(a)*ln*L*t*t,y+math.sin(a)*ln*L*t*t*.6,bz+.172+L*t) for t in (0,.25,.5,.75,1)],.0036,"leaf","grass"))
for i in range(38):                                    # grama stems with the eyelash head held sideways
    x=bx0+.06+(bx1-bx0-.12)*(i+random.random()*.8)/38; y=random.uniform(-.22,-.12); L=random.uniform(.17,.27); a=random.uniform(-.5,.5); s=random.choice((-1,1))
    tip=Vector((x+a*.1,y-.01,bz+.172+L)); pl.append(blade([(x,y,bz+.172),(x+a*.03,y,bz+.172+L*.5),tuple(tip)],.0019,"straw","stem"))
    hd=[tip+Vector((s*.034*t,-.004*t,.007*math.sin(t*2.6))) for t in (0,.3,.6,1)]; pl.append(blade([tuple(q) for q in hd],.0022,"straw","head"))
    for k in range(13):
        t=k/12; q=tip+Vector((s*.034*t,-.004*t,.007*math.sin(t*2.6))); pl.append(blade([tuple(q),tuple(q+Vector((s*.002,random.uniform(-.004,.004),-.011)))],.0013,"straw","lash"))
for cx in (-.70,-.36,.06,.40,.74):                      # paintbrush clumps
    for j in range(random.choice((3,4,5))):
        x=cx+random.uniform(-.06,.06); y=random.uniform(-.22,-.12); L=random.uniform(.15,.23); lean=random.uniform(-.05,.05)
        f=lambda t:Vector((x+lean*t*t,y,bz+.172+L*t))
        pl.append(tube("pbs",[tuple(f(t)) for t in (0,.4,.8,1)],.0022,"leaf"))
        for k in range(8):
            t=.1+.55*k/8; a=k*2.4; q=f(t); pl.append(blade([tuple(q),tuple(q+Vector((math.cos(a)*.016,math.sin(a)*.016,.014))),tuple(q+Vector((math.cos(a)*.03,math.sin(a)*.03,.034)))],.0035,"leaf","pl"))
        for k in range(30):                             # the bracts: a brush, widest in the middle
            t=.66+.36*k/30; a=k*2.4; q=f(t); r=.017*(1-.55*abs(k/30-.35)); pl.append(blade([tuple(q),tuple(q+Vector((math.cos(a)*r*.8,math.sin(a)*r*.8,.010))),tuple(q+Vector((math.cos(a)*r,math.sin(a)*r,.024)))],.0042,"red","br",.35))
plant(pl,"plants")
# ---- the quill in its tin, out on the sill
lathe("tincan",[(0,0),(.038,0),(.038,.088),(.041,.092),(.038,.095),(.034,.092),(.034,.01),(0,.01)],"tin",(.80,-.032,.605),36)
for n_,pr,m in [("q_hair",[(0,0),(.0026,.006),(.0056,.020),(.0062,.034),(.005,.046)],"white"),("q_ferrule",[(.005,.046),(.0062,.05),(.0066,.072),(.0058,.086),(.005,.088)],"brass"),("q_handle",[(.0048,.086),(.0066,.11),(.0072,.14),(.0052,.2),(.0036,.27),(.0026,.296),(0,.298)],"wine")]:
    lathe(n_,pr,m,(0,0,0),20,live=True)
# ---- join, unwrap, bake
def join(objs,name):
    dg=bpy.context.evaluated_depsgraph_get(); bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        if o.modifiers:
            me=bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data=me
        o.select_set(True)
    bpy.context.view_layer.objects.active=objs[0]; bpy.ops.object.join(); o=bpy.context.view_layer.objects.active; o.name=name; o.data.name=name; return o
shop=join(STAT,"shop"); plants=join(pl,"plants"); quill=join([o for o in LIVE if o.name.startswith("q_")],"quill")
for u in list(shop.data.uv_layers): shop.data.uv_layers.remove(u)
shop.data.uv_layers.new(name="light")
bpy.ops.object.select_all(action='DESELECT'); shop.select_set(True); bpy.context.view_layer.objects.active=shop
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.0012,area_weight=0); bpy.ops.object.mode_set(mode='OBJECT')
S.render.engine="CYCLES"; S.cycles.use_denoising=True
try:
    p=bpy.context.preferences.addons["cycles"].preferences; p.compute_device_type="METAL"; p.get_devices(); [setattr(d,"use",True) for d in p.devices]; S.cycles.device="GPU"
except Exception as e: print("cpu",e)
w=bpy.data.worlds.new("w"); S.world=w; w.use_nodes=True; bg=next(x for x in w.node_tree.nodes if x.type=="BACKGROUND"); bg.inputs[0].default_value=(1,1,1,1); bg.inputs[1].default_value=0
def lamp(n,t,loc,e,size=.05,rot=None,cone=None):
    l=bpy.data.lights.new(n,t); l.energy=e; l.color=(1,1,1)
    if t!="SUN": l.shadow_soft_size=size
    if cone: l.spot_size=math.radians(cone); l.spot_blend=.6
    o=bpy.data.objects.new(n,l); o.location=loc
    if rot is not None: o.matrix_world=Matrix.Translation(loc)@rot
    S.collection.objects.link(o); return o
Lp=[lamp("L_p","POINT",(PX,PY,PZ-.03),9,.04)]
Lg=[lamp(f"L_g{k}","SPOT",b+t@Vector((0,0,-.045)),16,.04,t,118) for k,(b,t) in enumerate(G)]
for o in LIVE:
    if o.name.startswith("bulb"): o.hide_render=True
quill.hide_render=True
SZ=1024 if QUICK else 2048
img=bpy.data.images.new("bake",SZ,SZ,float_buffer=True,is_data=True)
for m in shop.data.materials:
    nd=m.node_tree.nodes.new("ShaderNodeTexImage"); nd.image=img; m.node_tree.nodes.active=nd
import numpy as np
ch=[]; scales=[]
S.render.bake.use_pass_direct=True; S.render.bake.use_pass_indirect=True; S.render.bake.use_pass_color=False; S.render.bake.margin=6
S.cycles.samples=32 if QUICK else 256
for grp in ("p","g","sky"):
    for o in Lp: o.hide_render=grp!="p"
    for o in Lg: o.hide_render=grp!="g"
    bg.inputs[1].default_value=1.0 if grp=="sky" else 0
    bpy.ops.object.bake(type='DIFFUSE')
    a=np.empty(SZ*SZ*4,dtype=np.float32); img.pixels.foreach_get(a); g=a.reshape(SZ,SZ,4)[...,:3].mean(-1)
    sc=float(np.percentile(g,99.7)); scales.append(sc); ch.append(np.sqrt(np.clip(g/sc,0,1))); print("baked",grp,sc)
out=bpy.data.images.new("light",SZ,SZ,is_data=True); a=np.ones((SZ,SZ,4),dtype=np.float32)
for i in range(3): a[...,i]=ch[i]
out.pixels.foreach_set(a.ravel()); out.filepath_raw=OUT+"/light.png"; out.file_format="PNG"; out.save()
json.dump(dict(scales=scales,pendant=[PX,PY,PZ],lamps=[list(b) for b,_ in G]),open(OUT+"/scales.json","w"))
for m in shop.data.materials:
    for nd in [x for x in m.node_tree.nodes if x.type=="TEX_IMAGE"]: m.node_tree.nodes.remove(nd)
bpy.ops.object.select_all(action='DESELECT')
for o in S.objects: o.select_set(o.type=="MESH")
bpy.ops.export_scene.gltf(filepath=OUT+"/window-raw.glb",export_format="GLB",use_selection=True,export_apply=True,export_yup=True,export_animations=False)
# look
for o in Lp+Lg: o.hide_render=False
for o in Lp+Lg: o.data.color=(1,.83,.55)
bg.inputs[0].default_value=(.25,.32,.7,1); bg.inputs[1].default_value=.16
c=bpy.data.cameras.new("c"); c.lens=58; co=bpy.data.objects.new("c",c); S.collection.objects.link(co); S.camera=co
co.location=(-1.9,-5.6,1.75); co.rotation_euler=(Vector((0,0,1.25))-co.location).to_track_quat('-Z','Y').to_euler()
S.render.resolution_x=1000; S.render.resolution_y=1000; S.cycles.samples=64; S.render.filepath=OUT+"/preview.png"; bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT+"/window.blend")
print("faces",len(shop.data.polygons),len(plants.data.polygons))
