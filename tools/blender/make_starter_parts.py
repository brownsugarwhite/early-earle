"""
Starter module library for early-earle creatures (P4), built headless with bpy.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/make_starter_parts.py -- --out /tmp/starter_parts.blend
  /Applications/Blender.app/Contents/MacOS/Blender -b /tmp/starter_parts.blend -P tools/blender/export_assets.py -- --out content/genome/assets

Conventions (tools/blender/README.md): one collection per module (name = asset id), one root mesh,
SOCKET_root empty at the base with Blender +Z pointing away from the body, optional SOCKET_tip, custom
properties as glTF extras. Modules are authored in *blob units* (body radius ≈ 1): an eye is ≈ 0.5
tall, a horn ≈ 0.55 long. Low-poly, flat colours, no outlines. Chain modules (trunk, tail, floppy ear)
are parent→child segment meshes so the runtime can bend them with a spring chain.

glTF's Y-up export turns Blender +Z into three.js +Y, so at runtime "away from the body" is the
module's +Y and Blender +Y ("toward the top of the head") becomes −Z. `@ee/render` maps that.

Materials: "Tint" takes the body-derived tint, "Ink" the zone ink, "Bone" the zone bone colour;
any other material keeps its authored colour.
"""
import bpy, bmesh, sys, os, math
from mathutils import Matrix, Vector, Euler

argv = sys.argv
args = argv[argv.index("--") + 1:] if "--" in argv else []
out = args[args.index("--out") + 1] if "--out" in args else "/tmp/starter_parts.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ----------------------------------------------------------------------------- materials
def make_material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.65
    mat.diffuse_color = (*rgb, 1.0)
    return mat

def srgb(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # glTF stores linear base colour; Blender converts on export, so feed sRGB→linear here.
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c]

MAT_TINT = make_material("Tint", srgb("#2f7f7a"))
MAT_INK = make_material("Ink", srgb("#0f1c22"))
MAT_BONE = make_material("Bone", srgb("#f7f6d8"))

# ----------------------------------------------------------------------------- helpers
def new_collection(name):
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    return col

def move_to(col, obj):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)
    return obj

def select_only(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]

def prim(col, name, op, location=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1), **kw):
    """Primitive with location/rotation/scale baked into the mesh data: every object keeps an identity
    transform and its origin at the module base, so sockets and chain children have clean transforms."""
    getattr(bpy.ops.mesh, op)(**kw)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    m = Matrix.Translation(Vector(location)) @ Euler(rotation).to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1.0))
    obj.data.transform(m)
    obj.data.update()
    return move_to(col, obj)

def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)

def smooth(obj, angle_deg=50):
    select_only([obj])
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle_deg))
    except Exception:
        try:
            bpy.ops.object.shade_auto_smooth(angle=math.radians(angle_deg))
        except Exception:
            bpy.ops.object.shade_smooth()

def join(objs, name):
    select_only(objs)
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    return obj

def add_socket(col, name, parent, location, rotation=(0, 0, 0)):
    bpy.ops.object.empty_add(type="ARROWS", location=location, rotation=rotation)
    e = bpy.context.active_object
    e.name = name
    e.empty_display_size = 0.08
    move_to(col, e)
    e.parent = parent
    e.matrix_parent_inverse.identity()
    e.location = location
    e.rotation_euler = rotation
    return e

def tube(col, name, points, radii, bevel=0.03, resolution=1, material=MAT_TINT):
    """Tapered tube along a polyline (world/local coords), converted to a mesh."""
    cu = bpy.data.curves.new(name + "_curve", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = bevel
    cu.bevel_resolution = resolution
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for i, (p, r) in enumerate(zip(points, radii)):
        sp.points[i].co = (p[0], p[1], p[2], 1.0)
        sp.points[i].radius = r
    obj = bpy.data.objects.new(name, cu)
    scene.collection.objects.link(obj)
    select_only([obj])
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    move_to(col, obj)
    assign_material(obj, material)
    return obj

def plate(col, name, outline_yz, thickness=0.03, material=MAT_TINT):
    """Flat n-gon in the local YZ plane (thin along X), extruded by `thickness`."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((-thickness / 2, y, z)) for (y, z) in outline_yz]
    bm.faces.new(verts)
    ret = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    ext = [g for g in ret["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=ext, vec=(thickness, 0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    col.objects.link(obj)
    assign_material(obj, material)
    return obj

def finish(col, root, slot, scale, tintable, family, chain=False, tip=None, tip_parent=None):
    """Custom properties (→ glTF extras) and sockets."""
    faces = 0
    for o in col.objects:
        if o.type == "MESH":
            faces += len(o.data.polygons)
    root["slot"] = slot
    root["scale_min"] = float(scale[0])
    root["scale_max"] = float(scale[1])
    root["tintable"] = bool(tintable)
    root["material_family"] = family
    root["chain"] = bool(chain)
    root["faces"] = int(faces)
    add_socket(col, "SOCKET_root", root, (0, 0, 0))
    if tip is not None:
        add_socket(col, "SOCKET_tip", tip_parent or root, tip)
    assert faces <= 4000, f"{col.name}: {faces} faces"
    print(f"MODULE {col.name}: {faces} faces")

def chain_segments(col, name, lengths, radii, flatten_x=1.0, material=MAT_TINT, verts=10):
    """Tapered cone segments parented root→child along +Z; returns the list of segment objects."""
    segs = []
    z0 = 0.0
    for i, L in enumerate(lengths):
        r0, r1 = radii[i]
        seg = prim(col, f"{name}_seg{i}", "primitive_cone_add", location=(0, 0, L / 2), scale=(flatten_x, 1.0, 1.0), radius1=r0, radius2=r1, depth=L, vertices=verts)
        assign_material(seg, material)
        smooth(seg, 40)
        if i > 0:
            seg.parent = segs[-1]
            seg.matrix_parent_inverse.identity()
            seg.location = (0, 0, lengths[i - 1])
        segs.append(seg)
        z0 += L
    return segs

# ----------------------------------------------------------------------------- eyes
def eye_slit():
    col = new_collection("eye_slit")
    e = prim(col, "eye_slit", "primitive_uv_sphere_add", scale=(0.065, 0.26, 0.045), radius=1.0, segments=14, ring_count=8)
    assign_material(e, MAT_INK)
    smooth(e)
    finish(col, e, "eye", (0.8, 1.5), False, "ink")

def eye_double_slit():
    col = new_collection("eye_double_slit")
    a = prim(col, "eye_double_slit_a", "primitive_uv_sphere_add", location=(-0.11, 0, 0), scale=(0.05, 0.22, 0.04), radius=1.0, segments=12, ring_count=8)
    b = prim(col, "eye_double_slit_b", "primitive_uv_sphere_add", location=(0.11, 0.02, 0), scale=(0.05, 0.2, 0.04), radius=1.0, segments=12, ring_count=8)
    e = join([a, b], "eye_double_slit")
    assign_material(e, MAT_INK)
    smooth(e)
    finish(col, e, "eye", (0.8, 1.4), False, "ink")

def eye_round():
    col = new_collection("eye_round")
    sclera = prim(col, "eye_round", "primitive_uv_sphere_add", location=(0, 0, 0.06), radius=0.21, segments=16, ring_count=10)
    assign_material(sclera, MAT_BONE)
    smooth(sclera)
    pupil = prim(col, "eye_round_pupil", "primitive_uv_sphere_add", scale=(1.0, 1.0, 0.55), radius=0.1, segments=12, ring_count=8)
    assign_material(pupil, MAT_INK)
    smooth(pupil)
    pupil.parent = sclera
    pupil.matrix_parent_inverse.identity()
    pupil.location = (0.02, 0.01, 0.2)
    finish(col, sclera, "eye", (0.8, 1.6), False, "ink")

def eye_spiral():
    col = new_collection("eye_spiral")
    pts, rad = [], []
    turns = 2.4
    n = 56
    for i in range(n):
        t = turns * 2 * math.pi * i / (n - 1)
        r = 0.025 + 0.19 * (t / (turns * 2 * math.pi))
        pts.append((r * math.cos(t), r * math.sin(t), 0.02))
        rad.append(1.0)
    e = tube(col, "eye_spiral", pts, rad, bevel=0.026, resolution=1, material=MAT_INK)
    smooth(e)
    finish(col, e, "eye", (0.9, 1.5), False, "ink")

# ----------------------------------------------------------------------------- horns
def horn_curl():
    col = new_collection("horn_curl")
    R = 0.36
    pts, rad = [], []
    n = 11
    for i in range(n):
        a = 1.55 * i / (n - 1)
        pts.append((0, -R + R * math.cos(a), R * math.sin(a)))
        rad.append(1.0 - 0.82 * (i / (n - 1)) ** 1.1)
    h = tube(col, "horn_curl", pts, rad, bevel=0.11, resolution=1)
    smooth(h)
    finish(col, h, "horn", (0.7, 1.8), True, "shell", tip=pts[-1])

def horn_spike():
    col = new_collection("horn_spike")
    h = prim(col, "horn_spike", "primitive_cone_add", radius1=0.11, radius2=0.012, depth=0.55, vertices=10, location=(0, 0, 0.275))
    assign_material(h, MAT_TINT)
    smooth(h, 40)
    finish(col, h, "horn", (0.7, 2.0), True, "shell", tip=(0, 0, 0.55))

def horn_nub():
    col = new_collection("horn_nub")
    h = prim(col, "horn_nub", "primitive_uv_sphere_add", location=(0, 0, 0.12), scale=(0.11, 0.11, 0.17), radius=1.0, segments=12, ring_count=8)
    assign_material(h, MAT_TINT)
    smooth(h)
    finish(col, h, "horn", (0.8, 1.6), True, "shell", tip=(0, 0, 0.29))

# ----------------------------------------------------------------------------- ears
def ear_round():
    col = new_collection("ear_round")
    e = prim(col, "ear_round", "primitive_uv_sphere_add", location=(0, 0.04, 0.17), scale=(0.05, 0.2, 0.2), radius=1.0, segments=14, ring_count=8)
    assign_material(e, MAT_TINT)
    smooth(e)
    finish(col, e, "ear", (0.8, 1.6), True, "jelly", tip=(0, 0.04, 0.37))

def ear_pointy():
    col = new_collection("ear_pointy")
    e = prim(col, "ear_pointy", "primitive_cone_add", location=(0, 0, 0.23), scale=(0.35, 1.0, 1.0), radius1=0.15, radius2=0.01, depth=0.46, vertices=10)
    assign_material(e, MAT_TINT)
    smooth(e, 40)
    finish(col, e, "ear", (0.8, 1.7), True, "jelly", tip=(0, 0, 0.46))

def ear_floppy():
    col = new_collection("ear_floppy")
    segs = chain_segments(col, "ear_floppy", [0.16, 0.16, 0.16], [(0.15, 0.13), (0.13, 0.11), (0.11, 0.04)], flatten_x=0.32)
    finish(col, segs[0], "ear", (0.8, 1.6), True, "jelly", chain=True, tip=(0, 0, 0.16), tip_parent=segs[-1])

# ----------------------------------------------------------------------------- trunks
def trunk_short():
    col = new_collection("trunk_short")
    segs = chain_segments(col, "trunk_short", [0.2, 0.2, 0.2], [(0.14, 0.11), (0.11, 0.08), (0.08, 0.045)])
    finish(col, segs[0], "trunk", (0.8, 1.4), True, "jelly", chain=True, tip=(0, 0, 0.2), tip_parent=segs[-1])

def trunk_long():
    col = new_collection("trunk_long")
    segs = chain_segments(col, "trunk_long", [0.18] * 5, [(0.14, 0.12), (0.12, 0.1), (0.1, 0.08), (0.08, 0.06), (0.06, 0.04)])
    finish(col, segs[0], "trunk", (0.8, 1.4), True, "jelly", chain=True, tip=(0, 0, 0.18), tip_parent=segs[-1])

# ----------------------------------------------------------------------------- teeth
def tooth_tusk():
    col = new_collection("tooth_tusk")
    R = 0.3
    tusks = []
    for side in (-1, 1):
        pts, rad = [], []
        n = 8
        for i in range(n):
            a = 1.1 * i / (n - 1)
            pts.append((side * 0.13, R - R * math.cos(a) - 0.02, R * math.sin(a)))
            rad.append(1.0 - 0.75 * (i / (n - 1)))
        tusks.append(tube(col, f"tooth_tusk_{'l' if side < 0 else 'r'}", pts, rad, bevel=0.055, resolution=1, material=MAT_BONE))
    t = join(tusks, "tooth_tusk")
    smooth(t)
    finish(col, t, "tooth", (0.8, 1.6), False, "shell")

def tooth_row():
    col = new_collection("tooth_row")
    teeth = []
    for i, x in enumerate((-0.135, -0.045, 0.045, 0.135)):
        c = prim(col, f"tooth_row_{i}", "primitive_cube_add", location=(x, -0.01, 0.035), scale=(0.036, 0.04, 0.038), size=1.0)
        teeth.append(c)
    t = join(teeth, "tooth_row")
    assign_material(t, MAT_BONE)
    finish(col, t, "tooth", (0.8, 1.4), False, "shell")

# ----------------------------------------------------------------------------- wings
LEAF = [(0.0, 0.0), (0.12, 0.15), (0.22, 0.4), (0.18, 0.62), (0.05, 0.75), (-0.06, 0.7), (-0.12, 0.5), (-0.1, 0.25), (-0.04, 0.08)]
BAT = [(0.0, 0.0), (0.2, 0.2), (0.32, 0.45), (0.3, 0.72), (0.12, 0.62), (0.02, 0.78), (-0.08, 0.6), (-0.2, 0.66), (-0.2, 0.45), (-0.3, 0.42), (-0.18, 0.22), (-0.16, 0.12), (-0.06, 0.06)]

def wing_leaf():
    col = new_collection("wing_leaf")
    w = plate(col, "wing_leaf", LEAF, thickness=0.028)
    finish(col, w, "wing", (0.8, 1.8), True, "membrane", tip=(0, 0.05, 0.75))

def wing_bat():
    col = new_collection("wing_bat")
    w = plate(col, "wing_bat", BAT, thickness=0.028)
    finish(col, w, "wing", (0.8, 1.8), True, "membrane", tip=(0, 0.02, 0.78))

# ----------------------------------------------------------------------------- legs
def leg(name, radius, length, scale):
    col = new_collection(name)
    shin = prim(col, f"{name}_shin", "primitive_cylinder_add", location=(0, 0, length / 2), radius=radius, depth=length, vertices=10)
    foot = prim(col, f"{name}_foot", "primitive_uv_sphere_add", location=(0, 0.02, length + 0.02), scale=(radius * 1.9, radius * 2.2, radius * 1.2), radius=1.0, segments=12, ring_count=7)
    l = join([shin, foot], name)
    assign_material(l, MAT_TINT)
    smooth(l, 40)
    finish(col, l, "leg", scale, True, "jelly", tip=(0, 0, length + 0.05))

def leg_stub():
    leg("leg_stub", 0.1, 0.28, (0.8, 1.5))

def leg_tall():
    leg("leg_tall", 0.06, 0.62, (0.8, 1.6))

# ----------------------------------------------------------------------------- tails
def tail_curl():
    col = new_collection("tail_curl")
    segs = chain_segments(col, "tail_curl", [0.22, 0.22, 0.22], [(0.09, 0.07), (0.07, 0.05), (0.05, 0.015)])
    finish(col, segs[0], "tail", (0.8, 1.6), True, "jelly", chain=True, tip=(0, 0, 0.22), tip_parent=segs[-1])

def tail_tuft():
    col = new_collection("tail_tuft")
    rod = prim(col, "tail_tuft_seg0", "primitive_cylinder_add", location=(0, 0, 0.16), radius=0.035, depth=0.32, vertices=8)
    assign_material(rod, MAT_TINT)
    smooth(rod, 40)
    tuft = prim(col, "tail_tuft_seg1", "primitive_uv_sphere_add", location=(0, 0, 0.1), scale=(0.11, 0.11, 0.15), radius=1.0, segments=12, ring_count=8)
    assign_material(tuft, MAT_TINT)
    smooth(tuft)
    tuft.parent = rod
    tuft.matrix_parent_inverse.identity()
    tuft.location = (0, 0, 0.32)
    finish(col, rod, "tail", (0.8, 1.6), True, "fur", chain=True, tip=(0, 0, 0.25), tip_parent=tuft)

# ----------------------------------------------------------------------------- crests
def crest_tuft():
    col = new_collection("crest_tuft")
    spikes = []
    for i, ang in enumerate((-0.75, -0.38, 0.0, 0.38, 0.75)):
        L = 0.42 if i == 2 else 0.34 if i in (1, 3) else 0.26
        # cone along +Z, base at the origin, fanned about X (in the YZ plane)
        cz = L / 2
        loc = (0, -cz * math.sin(ang), cz * math.cos(ang))
        s = prim(col, f"crest_tuft_{i}", "primitive_cone_add", radius1=0.07, radius2=0.008, depth=L, vertices=8, location=loc, rotation=(ang, 0, 0))
        spikes.append(s)
    c = join(spikes, "crest_tuft")
    assign_material(c, MAT_TINT)
    smooth(c, 40)
    finish(col, c, "crest", (0.8, 1.8), True, "jelly", tip=(0, 0, 0.42))

def crest_fin():
    col = new_collection("crest_fin")
    pts = []
    n = 11
    for i in range(n):
        a = math.pi * i / (n - 1)
        pts.append((0.3 * math.cos(a), 0.42 * math.sin(a)))
    f = plate(col, "crest_fin", pts, thickness=0.04)
    finish(col, f, "crest", (0.8, 1.6), True, "membrane", tip=(0, 0, 0.42))

# ----------------------------------------------------------------------------- build all
for build in (eye_slit, eye_double_slit, eye_round, eye_spiral, horn_curl, horn_spike, horn_nub, ear_round, ear_pointy, ear_floppy,
              trunk_short, trunk_long, tooth_tusk, tooth_row, wing_leaf, wing_bat, leg_stub, leg_tall, tail_curl, tail_tuft, crest_tuft, crest_fin):
    build()

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out))
print("SAVED", out)
