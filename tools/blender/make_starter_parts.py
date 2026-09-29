"""
Starter module library for early-earle creatures (P4, v2 "richer modules" P1b), built headless with bpy.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/make_starter_parts.py -- --out /tmp/starter_parts.blend
  /Applications/Blender.app/Contents/MacOS/Blender -b /tmp/starter_parts.blend -P tools/blender/export_assets.py -- --out content/genome/assets

Conventions (tools/blender/README.md): one collection per module (name = asset id), one root mesh,
SOCKET_root empty at the base with Blender +Z pointing away from the body, optional SOCKET_tip (and
SOCKET_lid / SOCKET_knee / SOCKET_foot), custom properties as glTF extras. Modules are authored in
*blob units* (body radius ≈ 1): an eye is ≈ 0.5 tall, a horn ≈ 0.55 long. ≤ 800 triangles per module,
flat colours, no outlines — detail is geometry (ridge rings, folds, joints) and value contrast between
materials, never a line around something.

v2 structure:
  * Eyes: root = sclera (Bone) or globe; child `<id>_pupil` = one multi-material mesh (Iris ring + Ink
    pupil + Bone glint) that follows the gaze as a unit; child `<id>_lid` (Tint) with SOCKET_lid at the
    hinge (rotate about module X to blink). Variants: slit, double slit, round, spiral (REX), cute
    (big), sleepy (half lid), reptile (slit pupil).
  * Horns: swept tubes with ridge rings, Bone tip. Trunks: chain segments with fold rings, the last one
    ends in a flared tip with two Ink nostrils. Legs: `<id>` (thigh, root) → `<id>_shin` → `<id>_foot`
    with SOCKET_knee (thigh→shin pivot) and SOCKET_foot (ankle pivot), toes with Bone nails.
  * Wings with rib/vein lines (Bone/Ink strips through the membrane, visible from both sides), teeth
    variants, feather crest, fur tufts, inner ears (Accent).

glTF's Y-up export turns Blender +Z into three.js +Y, so at runtime "away from the body" is the
module's +Y and Blender +Y ("toward the top of the head") becomes −Z. `@ee/render` maps that.

Materials: "Tint" takes the body-derived tint, "Ink" the zone ink, "Bone" the zone bone colour,
"Accent" the zone accent, "Iris" keeps its authored colour (the rig may tint it from the genome).
"""
import bpy, bmesh, sys, os, math
from mathutils import Matrix, Vector, Euler

argv = sys.argv
args = argv[argv.index("--") + 1:] if "--" in argv else []
out = args[args.index("--out") + 1] if "--out" in args else "/tmp/starter_parts.blend"

MAX_TRIS = 800

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ----------------------------------------------------------------------------- materials
def srgb(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # glTF stores linear base colour; Blender converts on export, so feed sRGB→linear here.
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c]

def make_material(name, hexstr):
    rgb = srgb(hexstr)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.65
    mat.diffuse_color = (*rgb, 1.0)
    return mat

MAT_TINT = make_material("Tint", "#2f7f7a")
MAT_INK = make_material("Ink", "#0f1c22")
MAT_BONE = make_material("Bone", "#f7f6d8")
MAT_IRIS = make_material("Iris", "#e8a33c")  # amber (Earle bronze needles, ref 05)
MAT_ACCENT = make_material("Accent", "#e07380")  # inner ears (Earle pink-red, Ebene_45)

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

def prim(col, name, op, location=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1), material=None, **kw):
    """Primitive with location/rotation/scale baked into the mesh data (identity object transform)."""
    getattr(bpy.ops.mesh, op)(**kw)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    m = Matrix.Translation(Vector(location)) @ Euler(rotation).to_matrix().to_4x4() @ Matrix.Diagonal((*scale, 1.0))
    obj.data.transform(m)
    obj.data.update()
    move_to(col, obj)
    if material is not None:
        assign_material(obj, material)
    return obj

def assign_material(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(mat)

def mesh_obj(col, name, verts, faces, material=MAT_TINT, face_mats=None, materials=None):
    """Mesh from raw data; `materials` + `face_mats` for multi-material meshes."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    mats = materials or [material]
    for m in mats:
        me.materials.append(m)
    if face_mats:
        for poly, mi in zip(me.polygons, face_mats):
            poly.material_index = mi
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    col.objects.link(obj)
    return obj

def smooth(obj, angle_deg=40):
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

def parent_to(child, parent, location=(0, 0, 0), rotation=(0, 0, 0)):
    child.parent = parent
    child.matrix_parent_inverse.identity()
    child.location = location
    child.rotation_euler = rotation
    return child

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

def tri_count(col):
    n = 0
    for o in col.objects:
        if o.type == "MESH":
            for p in o.data.polygons:
                n += len(p.vertices) - 2
    return n

def finish(col, root, slot, scale, tintable, family, chain=False, tip=None, tip_parent=None, extra_sockets=()):
    """Custom properties (→ glTF extras) and sockets. `extra_sockets`: (name, parent, location[, rotation])."""
    faces = 0
    for o in col.objects:
        if o.type == "MESH":
            faces += len(o.data.polygons)
    tris = tri_count(col)
    root["slot"] = slot
    root["scale_min"] = float(scale[0])
    root["scale_max"] = float(scale[1])
    root["tintable"] = bool(tintable)
    root["material_family"] = family
    root["chain"] = bool(chain)
    root["faces"] = int(faces)
    root["tris"] = int(tris)
    add_socket(col, "SOCKET_root", root, (0, 0, 0))
    if tip is not None:
        add_socket(col, "SOCKET_tip", tip_parent or root, tip)
    for s in extra_sockets:
        add_socket(col, s[0], s[1], s[2], s[3] if len(s) > 3 else (0, 0, 0))
    assert tris <= MAX_TRIS, f"{col.name}: {tris} triangles > {MAX_TRIS}"
    print(f"MODULE {col.name}: {faces} faces, {tris} tris")

# ----------------------------------------------------------------------------- generators
def frames_along(pts):
    """Parallel-transport frames (T, N, B) along a polyline."""
    P = [Vector(p) for p in pts]
    T = []
    for i in range(len(P)):
        if i == 0:
            t = P[1] - P[0]
        elif i == len(P) - 1:
            t = P[-1] - P[-2]
        else:
            t = P[i + 1] - P[i - 1]
        T.append(t.normalized())
    ref = Vector((0, 1, 0)) if abs(T[0].y) < 0.9 else Vector((1, 0, 0))
    N = [(ref - T[0] * ref.dot(T[0])).normalized()]
    for i in range(1, len(P)):
        q = T[i - 1].rotation_difference(T[i])
        n = q @ N[-1]
        N.append((n - T[i] * n.dot(T[i])).normalized())
    B = [T[i].cross(N[i]) for i in range(len(P))]
    return P, T, N, B

def sweep_data(pts, radii, sides=8, cap_start=False, tip=True, squash=1.0, offset=0):
    """Tube along `pts` with per-point radius; `tip` closes the end with a point (fan), else a flat cap.
    `squash` scales the N axis (elliptic cross-section). Returns (verts, faces)."""
    P, T, N, B = frames_along(pts)
    verts, faces = [], []
    for i, (p, r) in enumerate(zip(P, radii)):
        for k in range(sides):
            a = 2 * math.pi * k / sides
            verts.append(p + (N[i] * math.cos(a) * squash + B[i] * math.sin(a)) * r)
    for i in range(len(P) - 1):
        for k in range(sides):
            a = i * sides + k
            b = i * sides + (k + 1) % sides
            c = (i + 1) * sides + (k + 1) % sides
            d = (i + 1) * sides + k
            faces.append((a + offset, b + offset, c + offset, d + offset))
    last = (len(P) - 1) * sides
    if tip:
        tv = len(verts)
        verts.append(P[-1] + T[-1] * radii[-1] * 1.2)
        for k in range(sides):
            faces.append((last + k + offset, last + (k + 1) % sides + offset, tv + offset))
    else:
        tv = len(verts)
        verts.append(P[-1])
        for k in range(sides):
            faces.append((last + k + offset, last + (k + 1) % sides + offset, tv + offset))
    if cap_start:
        cv = len(verts)
        verts.append(P[0])
        for k in range(sides):
            faces.append(((k + 1) % sides + offset, k + offset, cv + offset))
    return verts, faces

def sweep(col, name, pts, radii, sides=8, material=MAT_TINT, **kw):
    v, f = sweep_data(pts, radii, sides, **kw)
    obj = mesh_obj(col, name, v, f, material)
    smooth(obj, 50)
    return obj

def ridge(f, sharp=0.35):
    """Ring profile 0..1 per ring: sharp rise at the ring start, smooth decay (stacked shells)."""
    f = f - math.floor(f)
    return max(0.0, 1.0 - f / sharp) ** 2 if f < sharp else 0.0

def ringed_radii(n, r0, r1, rings, amp=0.14, power=1.0, dip=False):
    """Tapered radius profile with `rings` ridge rings (dip=True: folds pinch inward instead)."""
    out = []
    for i in range(n):
        t = i / (n - 1)
        base = r0 + (r1 - r0) * (t ** power)
        bump = ridge(t * rings)
        out.append(base * (1 - amp * bump) if dip else base * (1 + amp * bump))
    return out

def arc_pts(n, R, angle, start=(0, 0, 0), plane="YZ", sign=-1):
    """Arc from `start` along +Z curling toward sign·Y (plane YZ)."""
    pts = []
    for i in range(n):
        a = angle * i / (n - 1)
        pts.append((start[0], start[1] + sign * (R - R * math.cos(a)), start[2] + R * math.sin(a)))
    return pts

def cap_data(r, angle, rings, seg, sx=1.0, sy=1.0, center=(0.0, 0.0), lift=0.0):
    """Spherical cap on the +Z pole of a sphere of radius r+lift, polar angle ≤ angle, elliptic by
    sx/sy and shifted by `center` (radians, x/y). Returns (verts, faces)."""
    R = r + lift
    verts = [Vector((0, 0, 0))]
    faces = []
    for i in range(1, rings + 1):
        th = angle * i / rings
        for k in range(seg):
            a = 2 * math.pi * k / seg
            ux = math.sin(th) * math.cos(a) * sx + center[0]
            uy = math.sin(th) * math.sin(a) * sy + center[1]
            uz = math.sqrt(max(0.0, 1 - ux * ux - uy * uy))
            verts.append(Vector((ux, uy, uz)) * R)
    cx, cy = center
    verts[0] = Vector((cx, cy, math.sqrt(max(0.0, 1 - cx * cx - cy * cy)))) * R
    for k in range(seg):
        faces.append((0, 1 + k, 1 + (k + 1) % seg))
    for i in range(1, rings):
        for k in range(seg):
            a = 1 + (i - 1) * seg + k
            b = 1 + (i - 1) * seg + (k + 1) % seg
            c = 1 + i * seg + (k + 1) % seg
            d = 1 + i * seg + k
            faces.append((a, d, c, b))
    return verts, faces

def merge_parts(parts):
    """[(verts, faces, mat_index)] → verts, faces, face_mats."""
    V, F, M = [], [], []
    for verts, faces, mi in parts:
        o = len(V)
        V.extend(verts)
        for f in faces:
            F.append(tuple(i + o for i in f))
            M.append(mi)
    return V, F, M

def plate_data(outline_yz, thickness=0.03, x0=0.0):
    """Flat n-gon in the local YZ plane, extruded along X; returns (verts, faces) (triangulated caps)."""
    n = len(outline_yz)
    verts = [Vector((x0 - thickness / 2, y, z)) for (y, z) in outline_yz] + [Vector((x0 + thickness / 2, y, z)) for (y, z) in outline_yz]
    faces = []
    cy = sum(p[0] for p in outline_yz) / n
    cz = sum(p[1] for p in outline_yz) / n
    c0 = len(verts)
    verts.append(Vector((x0 - thickness / 2, cy, cz)))
    c1 = len(verts)
    verts.append(Vector((x0 + thickness / 2, cy, cz)))
    for i in range(n):
        j = (i + 1) % n
        faces.append((c0, j, i))
        faces.append((c1, n + i, n + j))
        faces.append((i, j, n + j, n + i))
    return verts, faces

# ----------------------------------------------------------------------------- eyes
EYE_R = 0.2

def eye_lid(col, name, root, r, cover, material=MAT_TINT, seg=14, rings=4, flatten=0.82, tilt=0.15):
    """Upper lid: a shell (1.06 × the globe, same flattening) over the top of the globe down to `cover`
    of the visible disc (0 = a thin brow at the top, 1 = closed to the middle), hinge at the eye centre
    (SOCKET_lid: rotate about X to blink)."""
    R = r * 1.06
    ang_top = math.radians(0)
    ang_bot = math.radians(38 + 58 * cover)  # angle below the +Y pole
    verts, faces = [], []
    # Shell around the +Y pole: rings from the pole (0) down to ang_bot, only the front 240°.
    arc = math.radians(250)
    for i in range(rings + 1):
        th = ang_top + (ang_bot - ang_top) * i / rings
        for k in range(seg + 1):
            a = -arc / 2 + arc * k / seg  # around +Y, 0 = toward +Z (front)
            x = math.sin(th) * math.sin(a)
            z = math.sin(th) * math.cos(a)
            y = math.cos(th)
            verts.append(Vector((x * R, y * R, z * R * flatten)))
    for i in range(rings):
        for k in range(seg):
            a = i * (seg + 1) + k
            b = a + 1
            c = (i + 1) * (seg + 1) + k + 1
            d = (i + 1) * (seg + 1) + k
            faces.append((a, b, c, d))
    # Lid edge lip: a rolled rim (one extra ring slightly inward) for a crisp value step, no line.
    base = len(verts)
    th = ang_bot
    for k in range(seg + 1):
        a = -arc / 2 + arc * k / seg
        x = math.sin(th) * math.sin(a)
        z = math.sin(th) * math.cos(a)
        y = math.cos(th)
        verts.append(Vector((x * r * 1.005, y * r * 1.005, z * r * 1.005 * flatten)))
    lastRing = rings * (seg + 1)
    for k in range(seg):
        faces.append((lastRing + k, lastRing + k + 1, base + k + 1, base + k))
    lid = mesh_obj(col, f"{name}_lid", verts, faces, material)
    smooth(lid, 60)
    # Rest pose tilted forward about the hinge (X): the lid covers the upper front of the visible disc.
    parent_to(lid, root, (0, 0, 0), (tilt, 0, 0))
    return lid

def pupil_assembly(col, name, root, r, iris_angle, pupil_angle, iris_mat=MAT_IRIS, slit=1.0, glints=((0.33, 0.35, 0.12),), look=(0.0, 0.0)):
    """One gaze-following mesh `<name>_pupil`: iris cap + pupil cap (+ Bone glint caps)."""
    parts = []
    if iris_angle > 0:
        v, f = cap_data(r, iris_angle, 4, 20, center=look, lift=0.004)
        parts.append((v, f, 0))
    v, f = cap_data(r, pupil_angle, 3, 20, sx=slit, center=look, lift=0.008)
    parts.append((v, f, 1))
    for gx, gy, gs in glints:
        v, f = cap_data(r, gs, 2, 12, center=(look[0] - gx * iris_angle, look[1] + gy * iris_angle), lift=0.011)
        parts.append((v, f, 2))
    V, F, M = merge_parts(parts)
    obj = mesh_obj(col, f"{name}_pupil", V, F, face_mats=M, materials=[iris_mat, MAT_INK, MAT_BONE])
    smooth(obj, 80)
    parent_to(obj, root)
    return obj

def globe(col, name, r, material=MAT_BONE, flatten=0.82, seg=16, rings=10):
    g = prim(col, name, "primitive_uv_sphere_add", location=(0, 0, 0.0), scale=(1, 1, flatten), radius=r, segments=seg, ring_count=rings, material=material)
    smooth(g, 80)
    return g

def eye_slit():
    col = new_collection("eye_slit")
    e = prim(col, "eye_slit", "primitive_uv_sphere_add", scale=(0.065, 0.26, 0.045), radius=1.0, segments=14, ring_count=8, material=MAT_INK)
    smooth(e, 80)
    glint = prim(col, "eye_slit_glint", "primitive_uv_sphere_add", location=(-0.018, 0.13, 0.04), scale=(0.022, 0.035, 0.012), radius=1.0, segments=8, ring_count=5, material=MAT_BONE)
    smooth(glint, 80)
    parent_to(glint, e)
    finish(col, e, "eye", (0.8, 1.5), False, "ink")

def eye_double_slit():
    col = new_collection("eye_double_slit")
    a = prim(col, "eye_double_slit_a", "primitive_uv_sphere_add", location=(-0.11, 0, 0), scale=(0.05, 0.22, 0.04), radius=1.0, segments=12, ring_count=8)
    b = prim(col, "eye_double_slit_b", "primitive_uv_sphere_add", location=(0.11, 0.02, 0), scale=(0.05, 0.2, 0.04), radius=1.0, segments=12, ring_count=8)
    e = join([a, b], "eye_double_slit")
    assign_material(e, MAT_INK)
    smooth(e, 80)
    g1 = prim(col, "eye_double_slit_glint_a", "primitive_uv_sphere_add", location=(-0.124, 0.11, 0.035), scale=(0.016, 0.028, 0.01), radius=1.0, segments=8, ring_count=5)
    g2 = prim(col, "eye_double_slit_glint_b", "primitive_uv_sphere_add", location=(0.096, 0.12, 0.035), scale=(0.016, 0.028, 0.01), radius=1.0, segments=8, ring_count=5)
    g = join([g1, g2], "eye_double_slit_glint")
    assign_material(g, MAT_BONE)
    parent_to(g, e)
    finish(col, e, "eye", (0.8, 1.4), False, "ink")

def eye_round():
    col = new_collection("eye_round")
    r = EYE_R
    g = globe(col, "eye_round", r)
    pupil_assembly(col, "eye_round", g, r, math.radians(34), math.radians(17))
    eye_lid(col, "eye_round", g, r, 0.05, tilt=0.25)
    finish(col, g, "eye", (0.8, 1.6), False, "ink", extra_sockets=(("SOCKET_lid", g, (0, 0, 0)),))

def eye_cute():
    """Big cute eye of the blob sheet: large black iris, two white glints, thin lid."""
    col = new_collection("eye_cute")
    r = 0.27
    g = globe(col, "eye_cute", r, flatten=0.8)
    pupil_assembly(col, "eye_cute", g, r, math.radians(44), math.radians(30), iris_mat=MAT_INK, glints=((0.38, 0.4, 0.2), (-0.35, -0.3, 0.09)))
    eye_lid(col, "eye_cute", g, r, 0.0, flatten=0.8, tilt=0.12)
    finish(col, g, "eye", (0.8, 1.5), False, "ink", extra_sockets=(("SOCKET_lid", g, (0, 0, 0)),))

def eye_sleepy():
    """Half-lid sleepy eye: the lid covers the upper half at rest (open it by rotating SOCKET_lid)."""
    col = new_collection("eye_sleepy")
    r = EYE_R
    g = globe(col, "eye_sleepy", r)
    pupil_assembly(col, "eye_sleepy", g, r, math.radians(32), math.radians(16), look=(0.0, -0.06))
    eye_lid(col, "eye_sleepy", g, r, 0.42, tilt=0.55)
    finish(col, g, "eye", (0.8, 1.5), False, "ink", extra_sockets=(("SOCKET_lid", g, (0, 0, 0)),))

def eye_reptile():
    """Reptile eye: amber globe, vertical slit pupil, heavy lid."""
    col = new_collection("eye_reptile")
    r = 0.19
    g = globe(col, "eye_reptile", r, material=MAT_IRIS)
    pupil_assembly(col, "eye_reptile", g, r, 0.0, math.radians(38), slit=0.2, glints=((0.5, 0.45, 0.1),))
    eye_lid(col, "eye_reptile", g, r, 0.2, tilt=0.35)
    finish(col, g, "eye", (0.8, 1.5), False, "ink", extra_sockets=(("SOCKET_lid", g, (0, 0, 0)),))

def eye_spiral():
    """REX spiral eye: bone globe with an ink spiral lying on its surface (follows the gaze), lid."""
    col = new_collection("eye_spiral")
    r = 0.22
    g = globe(col, "eye_spiral", r)
    pts, rad = [], []
    turns = 2.3
    n = 36
    for i in range(n):
        t = turns * 2 * math.pi * i / (n - 1)
        rr = 0.06 + 0.62 * (t / (turns * 2 * math.pi))  # radians on the globe
        ux = math.sin(rr) * math.cos(t)
        uy = math.sin(rr) * math.sin(t)
        uz = math.sqrt(max(0.0, 1 - ux * ux - uy * uy))
        pts.append((ux * r * 1.01, uy * r * 1.01, uz * r * 1.01 * 0.82))
        rad.append(0.018)
    v, f = sweep_data(pts, rad, sides=4, tip=False)
    sp = mesh_obj(col, "eye_spiral_pupil", v, f, MAT_INK)
    smooth(sp, 60)
    parent_to(sp, g)
    eye_lid(col, "eye_spiral", g, r, 0.0, tilt=0.2)
    finish(col, g, "eye", (0.9, 1.5), False, "ink", extra_sockets=(("SOCKET_lid", g, (0, 0, 0)),))

# ----------------------------------------------------------------------------- horns
def horn_body(col, name, pts, r0, r1, rings, amp=0.16, sides=10, tip_frac=0.18):
    """Ringed horn: Tint body + Bone tip (last `tip_frac` of the length)."""
    n = len(pts)
    radii = ringed_radii(n, r0, r1, rings, amp=amp, power=1.1)
    cut = max(2, int(n * (1 - tip_frac)))
    vb, fb = sweep_data(pts[: cut + 1], radii[: cut + 1], sides, tip=False, cap_start=True)
    vt, ft = sweep_data(pts[cut:], [radii[cut] * 0.985] + radii[cut + 1:], sides, tip=True)
    V, F, M = merge_parts([(vb, fb, 0), (vt, ft, 1)])
    obj = mesh_obj(col, name, V, F, face_mats=M, materials=[MAT_TINT, MAT_BONE])
    smooth(obj, 38)
    return obj

def horn_curl():
    col = new_collection("horn_curl")
    pts = arc_pts(34, 0.36, 1.7)
    h = horn_body(col, "horn_curl", pts, 0.11, 0.012, 7, amp=0.22)
    finish(col, h, "horn", (0.7, 1.8), True, "shell", tip=pts[-1])

def horn_spike():
    col = new_collection("horn_spike")
    pts = [(0, 0, 0.56 * i / 27) for i in range(28)]
    h = horn_body(col, "horn_spike", pts, 0.11, 0.01, 6, amp=0.2)
    finish(col, h, "horn", (0.7, 2.0), True, "shell", tip=(0, 0, 0.56))

def horn_nub():
    col = new_collection("horn_nub")
    pts = [(0, 0, 0.28 * i / 13) for i in range(14)]
    radii = [0.11 * math.sqrt(max(0.02, 1 - (i / 13) ** 2.2)) * (1 + 0.1 * ridge(i / 13 * 3)) for i in range(14)]
    v, f = sweep_data(pts, radii, 10, tip=True, cap_start=True)
    h = mesh_obj(col, "horn_nub", v, f, MAT_TINT)
    smooth(h, 40)
    finish(col, h, "horn", (0.8, 1.6), True, "shell", tip=(0, 0, 0.29))

def horn_ram():
    """Ram horn: a ringed spiral curling back and out to the side."""
    col = new_collection("horn_ram")
    pts = []
    n = 42
    total = 1.55 * math.pi
    for i in range(n):
        t = i / (n - 1)
        a = total * t
        R = 0.26 * (1 - 0.38 * t)
        pts.append((0.16 * t, -R * (1 - math.cos(a)) * 0.95, R * math.sin(a) + 0.05 * t))
    h = horn_body(col, "horn_ram", pts, 0.1, 0.02, 11, amp=0.18, sides=9, tip_frac=0.1)
    finish(col, h, "horn", (0.7, 1.6), True, "shell", tip=pts[-1])

# ----------------------------------------------------------------------------- ears
def ear_round():
    col = new_collection("ear_round")
    e = prim(col, "ear_round", "primitive_uv_sphere_add", location=(0, 0.04, 0.17), scale=(0.05, 0.2, 0.2), radius=1.0, segments=14, ring_count=8, material=MAT_TINT)
    smooth(e, 60)
    inner = prim(col, "ear_round_inner", "primitive_uv_sphere_add", location=(0.03, 0.045, 0.175), scale=(0.028, 0.13, 0.13), radius=1.0, segments=12, ring_count=6, material=MAT_ACCENT)
    smooth(inner, 60)
    parent_to(inner, e)
    finish(col, e, "ear", (0.8, 1.6), True, "jelly", tip=(0, 0.04, 0.37))

def ear_pointy():
    col = new_collection("ear_pointy")
    e = prim(col, "ear_pointy", "primitive_cone_add", location=(0, 0, 0.23), scale=(0.35, 1.0, 1.0), radius1=0.15, radius2=0.01, depth=0.46, vertices=12, material=MAT_TINT)
    smooth(e, 40)
    inner = prim(col, "ear_pointy_inner", "primitive_cone_add", location=(0.03, 0, 0.2), scale=(0.2, 1.0, 1.0), radius1=0.09, radius2=0.006, depth=0.32, vertices=10, material=MAT_ACCENT)
    smooth(inner, 40)
    parent_to(inner, e)
    finish(col, e, "ear", (0.8, 1.7), True, "jelly", tip=(0, 0, 0.46))

def chain_segments(col, name, lengths, radii, flatten_x=1.0, material=MAT_TINT, verts=10, folds=0, fold_amp=0.1, inner_mat=None):
    """Tapered segments parented root→child along +Z; folds pinch fold rings into each segment."""
    segs = []
    for i, L in enumerate(lengths):
        r0, r1 = radii[i]
        n = 3 + folds * 3
        pts = [(0, 0, L * j / (n - 1)) for j in range(n)]
        rr = ringed_radii(n, r0, r1, folds, amp=fold_amp, dip=True) if folds else [r0 + (r1 - r0) * j / (n - 1) for j in range(n)]
        v, f = sweep_data(pts, rr, verts, tip=False, cap_start=(i == 0), squash=flatten_x)
        seg = mesh_obj(col, f"{name}_seg{i}", v, f, material)
        smooth(seg, 35)
        if i > 0:
            parent_to(seg, segs[-1], (0, 0, lengths[i - 1]))
        segs.append(seg)
    return segs

def ear_floppy():
    col = new_collection("ear_floppy")
    segs = chain_segments(col, "ear_floppy", [0.16, 0.16, 0.16], [(0.15, 0.13), (0.13, 0.11), (0.11, 0.04)], flatten_x=0.32)
    finish(col, segs[0], "ear", (0.8, 1.6), True, "jelly", chain=True, tip=(0, 0, 0.16), tip_parent=segs[-1])

# ----------------------------------------------------------------------------- trunks
def trunk(name, lengths, radii, folds=3, sides=10):
    col = new_collection(name)
    segs = chain_segments(col, name, lengths[:-1], radii[:-1], folds=folds, fold_amp=0.13, verts=sides)
    # Last segment: fold rings, a flared tip ring and two ink nostrils on the end face.
    L = lengths[-1]
    r0, r1 = radii[-1]
    n = 10
    pts = [(0, 0, L * j / (n - 1)) for j in range(n)]
    rr = ringed_radii(n, r0, r1, 2, amp=0.12, dip=True)
    rr[-2] = r1 * 1.18
    rr[-1] = r1 * 1.12
    v, f = sweep_data(pts, rr, sides + 2, tip=False)
    parts = [(v, f, 0)]
    for side in (-1, 1):
        cx = side * r1 * 0.42
        nv, nf = [], []
        seg = 10
        nv.append(Vector((cx, 0.0, L + 0.004)))
        for k in range(seg):
            a = 2 * math.pi * k / seg
            nv.append(Vector((cx + math.cos(a) * r1 * 0.22, math.sin(a) * r1 * 0.34, L + 0.004)))
        for k in range(seg):
            nf.append((0, 1 + k, 1 + (k + 1) % seg))
        parts.append((nv, nf, 1))
    V, F, M = merge_parts(parts)
    last = mesh_obj(col, f"{name}_seg{len(lengths) - 1}", V, F, face_mats=M, materials=[MAT_TINT, MAT_INK])
    smooth(last, 35)
    parent_to(last, segs[-1], (0, 0, lengths[-2]))
    segs.append(last)
    finish(col, segs[0], "trunk", (0.8, 1.4), True, "jelly", chain=True, tip=(0, 0, L), tip_parent=last)

def trunk_short():
    trunk("trunk_short", [0.2, 0.2, 0.2], [(0.14, 0.11), (0.11, 0.08), (0.08, 0.06)])

def trunk_long():
    trunk("trunk_long", [0.18] * 5, [(0.14, 0.12), (0.12, 0.1), (0.1, 0.08), (0.08, 0.065), (0.065, 0.055)], folds=2, sides=8)

# ----------------------------------------------------------------------------- teeth
def tooth_tusk():
    col = new_collection("tooth_tusk")
    tusks = []
    for side in (-1, 1):
        pts = []
        n = 16
        R = 0.3
        for i in range(n):
            a = 1.1 * i / (n - 1)
            pts.append((side * 0.13, R - R * math.cos(a) - 0.02, R * math.sin(a)))
        radii = ringed_radii(n, 0.055, 0.008, 4, amp=0.1)
        v, f = sweep_data(pts, radii, 8, tip=True, cap_start=True)
        tusks.append(mesh_obj(col, f"tooth_tusk_{'l' if side < 0 else 'r'}", v, f, MAT_BONE))
    t = join(tusks, "tooth_tusk")
    smooth(t, 40)
    finish(col, t, "tooth", (0.8, 1.6), False, "shell")

def rounded_tooth(col, name, loc, w, h, d, verts=8):
    t = prim(col, name, "primitive_uv_sphere_add", location=loc, scale=(w, d, h), radius=1.0, segments=verts, ring_count=6)
    return t

def tooth_row():
    col = new_collection("tooth_row")
    teeth = [rounded_tooth(col, f"tooth_row_{i}", (x, -0.01, 0.035), 0.036, 0.042, 0.03) for i, x in enumerate((-0.135, -0.045, 0.045, 0.135))]
    t = join(teeth, "tooth_row")
    assign_material(t, MAT_BONE)
    smooth(t, 50)
    finish(col, t, "tooth", (0.8, 1.4), False, "shell")

def tooth_buck():
    """Two big flat front teeth (blob sheet)."""
    col = new_collection("tooth_buck")
    teeth = []
    for i, x in enumerate((-0.045, 0.045)):
        c = prim(col, f"tooth_buck_{i}", "primitive_cube_add", location=(x, -0.06, 0.02), scale=(0.04, 0.06, 0.022), size=1.0)
        bpy.context.view_layer.objects.active = c
        mod = c.modifiers.new("bevel", "BEVEL")
        mod.width = 0.012
        mod.segments = 2
        select_only([c])
        bpy.ops.object.modifier_apply(modifier=mod.name)
        teeth.append(c)
    t = join(teeth, "tooth_buck")
    assign_material(t, MAT_BONE)
    smooth(t, 40)
    finish(col, t, "tooth", (0.8, 1.5), False, "shell")

def tooth_fang():
    """Two curved fangs pointing down (module −Y is 'down' toward the chin)."""
    col = new_collection("tooth_fang")
    fangs = []
    for side in (-1, 1):
        pts = []
        n = 12
        for i in range(n):
            t = i / (n - 1)
            pts.append((side * 0.09, -0.02 - 0.2 * t, 0.03 + 0.05 * math.sin(t * math.pi * 0.8)))
        radii = [0.034 * (1 - t / 1.1) ** 1.2 + 0.002 for t in (i / (n - 1) for i in range(n))]
        v, f = sweep_data(pts, radii, 7, tip=True, cap_start=True)
        fangs.append(mesh_obj(col, f"tooth_fang_{'l' if side < 0 else 'r'}", v, f, MAT_BONE))
    t = join(fangs, "tooth_fang")
    smooth(t, 40)
    finish(col, t, "tooth", (0.8, 1.6), False, "shell")

# ----------------------------------------------------------------------------- wings
LEAF = [(0.0, 0.0), (0.12, 0.15), (0.22, 0.4), (0.18, 0.62), (0.05, 0.75), (-0.06, 0.7), (-0.12, 0.5), (-0.1, 0.25), (-0.04, 0.08)]
BAT = [(0.0, 0.0), (0.2, 0.2), (0.32, 0.45), (0.3, 0.72), (0.12, 0.62), (0.02, 0.78), (-0.08, 0.6), (-0.2, 0.66), (-0.2, 0.45), (-0.3, 0.42), (-0.18, 0.22), (-0.16, 0.12), (-0.06, 0.06)]

def rib(p0, p1, r0, r1, sides=5, n=4, bow=0.0):
    """Thin tube between two YZ points (x = 0) — passes through the membrane so it shows on both sides."""
    pts = []
    for i in range(n):
        t = i / (n - 1)
        y = p0[0] + (p1[0] - p0[0]) * t
        z = p0[1] + (p1[1] - p0[1]) * t
        # slight bow perpendicular to the rib in the plane
        dy, dz = p1[0] - p0[0], p1[1] - p0[1]
        L = math.hypot(dy, dz) or 1
        y += -dz / L * bow * math.sin(math.pi * t)
        z += dy / L * bow * math.sin(math.pi * t)
        pts.append((0.0, y, z))
    radii = [r0 + (r1 - r0) * i / (n - 1) for i in range(n)]
    return sweep_data(pts, radii, sides, tip=True, cap_start=True)

def wing_leaf():
    col = new_collection("wing_leaf")
    v, f = plate_data(LEAF, 0.028)
    parts = [(v, f, 0)]
    parts.append((*rib((0.0, 0.0), (0.03, 0.72), 0.024, 0.017, n=5, bow=0.02), 1))
    for (y0, z0), (y1, z1) in (((0.02, 0.2), (0.16, 0.34)), ((0.025, 0.36), (0.17, 0.52)), ((0.03, 0.52), (0.12, 0.64)), ((0.015, 0.25), (-0.1, 0.36)), ((0.02, 0.42), (-0.1, 0.55))):
        parts.append((*rib((y0, z0), (y1, z1), 0.018, 0.016, n=3), 1))
    V, F, M = merge_parts(parts)
    w = mesh_obj(col, "wing_leaf", V, F, face_mats=M, materials=[MAT_TINT, MAT_INK])
    smooth(w, 35)
    finish(col, w, "wing", (0.8, 1.8), True, "membrane", tip=(0, 0.05, 0.75))

def wing_bat():
    col = new_collection("wing_bat")
    v, f = plate_data(BAT, 0.024)
    parts = [(v, f, 0)]
    # Finger bones from the wrist to the outer points (Bone, the lighter value).
    wrist = (0.02, 0.1)
    for tip in ((0.3, 0.72), (0.02, 0.78), (-0.2, 0.66), (-0.3, 0.42)):
        parts.append((*rib(wrist, tip, 0.022, 0.007, n=4, bow=0.025), 1))
    parts.append((*rib((0.0, 0.0), wrist, 0.03, 0.022, n=2), 1))
    V, F, M = merge_parts(parts)
    w = mesh_obj(col, "wing_bat", V, F, face_mats=M, materials=[MAT_TINT, MAT_BONE])
    smooth(w, 35)
    finish(col, w, "wing", (0.8, 1.8), True, "membrane", tip=(0, 0.02, 0.78))

FEATHER = [(0.0, 0.0), (0.05, 0.08), (0.075, 0.2), (0.07, 0.32), (0.04, 0.42), (0.0, 0.47), (-0.035, 0.42), (-0.06, 0.3), (-0.06, 0.18), (-0.04, 0.07)]

def feather_plate(angle, length, x0, rachis_mat_index=1, notch=True):
    """One feather in the YZ plane rotated by `angle` about X, scaled to `length`; returns parts."""
    s = length / 0.47
    outline = [(y * s, z * s) for (y, z) in FEATHER]
    if notch:  # a barb notch on the right edge: Earle-like cut, value step not a line
        outline.insert(3, (0.045 * s, 0.25 * s))
    v, f = plate_data(outline, 0.018, x0)
    rv, rf = rib((0.0, 0.0), (0.0, 0.44 * s), 0.014, 0.01, n=4)
    rv = [Vector((p.x + x0, p.y, p.z)) for p in rv]
    rot = Matrix.Rotation(angle, 4, "X")
    v = [rot @ p for p in v]
    rv = [rot @ p for p in rv]
    return [(v, f, 0), (rv, rf, rachis_mat_index)]

def wing_feather():
    col = new_collection("wing_feather")
    parts = []
    for i, (ang, L) in enumerate(((-0.55, 0.5), (-0.25, 0.62), (0.05, 0.72), (0.35, 0.66), (0.62, 0.52))):
        parts += feather_plate(ang, L, 0.012 * i)
    V, F, M = merge_parts(parts)
    w = mesh_obj(col, "wing_feather", V, F, face_mats=M, materials=[MAT_TINT, MAT_BONE])
    smooth(w, 35)
    finish(col, w, "wing", (0.8, 1.7), True, "membrane", tip=(0, 0.0, 0.72))

# ----------------------------------------------------------------------------- legs
def leg(name, thigh, shin, r_hip, r_knee, r_ankle, toes=3, claw=False, scale=(0.8, 1.5), foot_len=0.14, bend=0.25):
    """Two joints + foot. Thigh (root) → shin (origin at the knee, SOCKET_knee) → foot (origin at the
    ankle, SOCKET_foot). Rest pose: slight knee bend; toes point along Blender +Y (body forward)."""
    col = new_collection(name)
    # Thigh along +Z with a forward lean.
    kx = Vector((0, math.sin(bend) * thigh, math.cos(bend) * thigh))
    n = 7
    pts = [(0, kx.y * i / (n - 1), kx.z * i / (n - 1)) for i in range(n)]
    radii = [r_hip + (r_knee - r_hip) * (i / (n - 1)) for i in range(n)]
    radii[0] *= 1.08
    v, f = sweep_data(pts, radii, 10, tip=False, cap_start=True)
    th = mesh_obj(col, name, v, f, MAT_TINT)
    smooth(th, 40)
    # Knee ball (joint read as a bulge, not a line).
    knee = prim(col, f"{name}_knee", "primitive_uv_sphere_add", location=tuple(kx), radius=r_knee * 1.12, segments=8, ring_count=5, material=MAT_TINT)
    th = join([th, knee], name)
    smooth(th, 40)
    # Shin: origin at the knee, leaning back.
    sv = Vector((0, -math.sin(bend * 1.3) * shin, math.cos(bend * 1.3) * shin))
    pts = [(0, sv.y * i / (n - 1), sv.z * i / (n - 1)) for i in range(n)]
    radii = [r_knee + (r_ankle - r_knee) * (i / (n - 1)) for i in range(n)]
    v, f = sweep_data(pts, radii, 10, tip=False, cap_start=True)
    sh = mesh_obj(col, f"{name}_shin", v, f, MAT_TINT)
    smooth(sh, 40)
    parent_to(sh, th, tuple(kx))
    # Foot: origin at the ankle; pad + toes + nails.
    parts = []
    pv = bmesh.new()
    bmesh.ops.create_uvsphere(pv, u_segments=10, v_segments=6, radius=1.0)
    bmesh.ops.transform(pv, matrix=Matrix.Translation((0, foot_len * 0.35, r_ankle * 0.55)) @ Matrix.Diagonal((r_ankle * 1.5, foot_len * 0.75, r_ankle * 0.9, 1)), verts=pv.verts)
    parts.append(([v.co.copy() for v in pv.verts], [tuple(v.index for v in fc.verts) for fc in pv.faces], 0))
    pv.free()
    spread = 0.55
    for t in range(toes):
        a = (t - (toes - 1) / 2) * spread
        tb = bmesh.new()
        bmesh.ops.create_uvsphere(tb, u_segments=7, v_segments=4, radius=1.0)
        tl = Vector((math.sin(a) * foot_len * 0.55, foot_len * 0.75 + math.cos(a) * foot_len * 0.25, r_ankle * 0.5))
        bmesh.ops.transform(tb, matrix=Matrix.Translation(tl) @ Matrix.Rotation(-a, 4, "Z") @ Matrix.Diagonal((r_ankle * 0.55, r_ankle * 0.8, r_ankle * 0.55, 1)), verts=tb.verts)
        parts.append(([v.co.copy() for v in tb.verts], [tuple(v.index for v in fc.verts) for fc in tb.faces], 0))
        tb.free()
        nb = bmesh.new()
        if claw:
            bmesh.ops.create_cone(nb, cap_ends=True, cap_tris=True, segments=6, radius1=r_ankle * 0.28, radius2=0.0, depth=r_ankle * 0.9)
            bmesh.ops.transform(nb, matrix=Matrix.Translation(tl + Vector((math.sin(a), math.cos(a), -0.1)) * r_ankle * 0.9) @ Matrix.Rotation(-a, 4, "Z") @ Matrix.Rotation(-math.pi / 2 + 0.35, 4, "X"), verts=nb.verts)
        else:
            bmesh.ops.create_uvsphere(nb, u_segments=6, v_segments=4, radius=1.0)
            bmesh.ops.transform(nb, matrix=Matrix.Translation(tl + Vector((math.sin(a), math.cos(a), 0.15)) * r_ankle * 0.62) @ Matrix.Rotation(-a, 4, "Z") @ Matrix.Diagonal((r_ankle * 0.3, r_ankle * 0.25, r_ankle * 0.22, 1)), verts=nb.verts)
        parts.append(([v.co.copy() for v in nb.verts], [tuple(v.index for v in fc.verts) for fc in nb.faces], 1))
        nb.free()
    V, F, M = merge_parts(parts)
    ft = mesh_obj(col, f"{name}_foot", V, F, face_mats=M, materials=[MAT_TINT, MAT_BONE])
    smooth(ft, 45)
    parent_to(ft, sh, tuple(sv))
    finish(
        col,
        th,
        "leg",
        scale,
        True,
        "jelly",
        tip=(0, foot_len * 0.35, r_ankle * 0.55 + r_ankle * 0.9),
        tip_parent=ft,
        extra_sockets=(("SOCKET_knee", th, tuple(kx)), ("SOCKET_foot", sh, tuple(sv))),
    )

def leg_stub():
    leg("leg_stub", 0.13, 0.13, 0.11, 0.095, 0.08, toes=3, scale=(0.8, 1.5), foot_len=0.13, bend=0.3)

def leg_tall():
    leg("leg_tall", 0.3, 0.3, 0.065, 0.05, 0.042, toes=3, scale=(0.8, 1.6), foot_len=0.1, bend=0.22)

def leg_rex():
    """REX leg: thick thigh, long shin, three clawed toes."""
    leg("leg_rex", 0.24, 0.3, 0.13, 0.085, 0.06, toes=3, claw=True, scale=(0.8, 1.7), foot_len=0.16, bend=0.35)

# ----------------------------------------------------------------------------- tails
def tail_curl():
    col = new_collection("tail_curl")
    segs = chain_segments(col, "tail_curl", [0.22, 0.22, 0.22], [(0.09, 0.07), (0.07, 0.05), (0.05, 0.015)], folds=2, fold_amp=0.08)
    finish(col, segs[0], "tail", (0.8, 1.6), True, "jelly", chain=True, tip=(0, 0, 0.22), tip_parent=segs[-1])

def fur_tuft_data(n_strands, length, spread, base_r, seed=1, sides=5, rings=4, curl=0.25):
    """A clump of thin curved cones (fur strands) around +Z; returns (verts, faces)."""
    import random
    rng = random.Random(seed)
    V, F = [], []
    golden = 2.399963
    for i in range(n_strands):
        a = i * golden
        rr = base_r * math.sqrt((i + 0.5) / n_strands)
        root = Vector((math.cos(a) * rr, math.sin(a) * rr, 0))
        L = length * rng.uniform(0.6, 1.0)
        out = Vector((math.cos(a), math.sin(a), 0)) * spread * (rr / max(base_r, 1e-6) + 0.2)
        pts = []
        for k in range(rings):
            t = k / (rings - 1)
            bend = out * t * L + Vector((0, curl * t * t * L, 0))
            pts.append(tuple(root + Vector((0, 0, L * t)) + bend))
        radii = [base_r * 0.3 * (1 - k / rings) + 0.004 for k in range(rings)]
        v, f = sweep_data(pts, radii, sides, tip=True, cap_start=False, offset=len(V))
        V.extend(v)
        F.extend(f)
    return V, F

def tail_tuft():
    col = new_collection("tail_tuft")
    pts = [(0, 0, 0.32 * i / 5) for i in range(6)]
    v, f = sweep_data(pts, [0.035] * 6, 8, tip=False, cap_start=True)
    rod = mesh_obj(col, "tail_tuft_seg0", v, f, MAT_TINT)
    smooth(rod, 40)
    v, f = fur_tuft_data(13, 0.2, 0.55, 0.06, seed=3)
    tuft = mesh_obj(col, "tail_tuft_seg1", v, f, MAT_TINT)
    smooth(tuft, 50)
    parent_to(tuft, rod, (0, 0, 0.3))
    finish(col, rod, "tail", (0.8, 1.6), True, "fur", chain=True, tip=(0, 0, 0.2), tip_parent=tuft)

# ----------------------------------------------------------------------------- crests
def crest_tuft():
    col = new_collection("crest_tuft")
    spikes = []
    for i, ang in enumerate((-0.75, -0.38, 0.0, 0.38, 0.75)):
        L = 0.42 if i == 2 else 0.34 if i in (1, 3) else 0.26
        n = 10
        pts = [(0, -math.sin(ang) * L * j / (n - 1), math.cos(ang) * L * j / (n - 1)) for j in range(n)]
        radii = ringed_radii(n, 0.065, 0.008, 3, amp=0.1)
        v, f = sweep_data(pts, radii, 7, tip=True, cap_start=True)
        spikes.append(mesh_obj(col, f"crest_tuft_{i}", v, f, MAT_TINT))
    c = join(spikes, "crest_tuft")
    smooth(c, 40)
    finish(col, c, "crest", (0.8, 1.8), True, "jelly", tip=(0, 0, 0.42))

def crest_fin():
    col = new_collection("crest_fin")
    pts = []
    n = 13
    for i in range(n):
        a = math.pi * i / (n - 1)
        pts.append((0.3 * math.cos(a), 0.42 * math.sin(a)))
    v, f = plate_data(pts, 0.04)
    parts = [(v, f, 0)]
    for k in range(5):
        a = math.pi * (k + 1) / 6
        parts.append((*rib((0.0, 0.0), (0.27 * math.cos(a), 0.38 * math.sin(a)), 0.03, 0.024, n=3), 1))
    V, F, M = merge_parts(parts)
    fin = mesh_obj(col, "crest_fin", V, F, face_mats=M, materials=[MAT_TINT, MAT_INK])
    smooth(fin, 35)
    finish(col, fin, "crest", (0.8, 1.6), True, "membrane", tip=(0, 0, 0.42))

def crest_feather():
    """Feather crest: five feathers fanned in the YZ plane (the REX comb / bird crest)."""
    col = new_collection("crest_feather")
    parts = []
    for i, (ang, L) in enumerate(((-0.7, 0.3), (-0.35, 0.4), (0.0, 0.48), (0.35, 0.4), (0.7, 0.3))):
        parts += feather_plate(ang, L, 0.01 * (i % 2))
    V, F, M = merge_parts(parts)
    c = mesh_obj(col, "crest_feather", V, F, face_mats=M, materials=[MAT_TINT, MAT_BONE])
    smooth(c, 35)
    finish(col, c, "crest", (0.8, 1.7), True, "membrane", tip=(0, 0, 0.48))

def crest_fur():
    """Fur tuft: a clump of curved strands (the blob sheet's head tuft)."""
    col = new_collection("crest_fur")
    v, f = fur_tuft_data(14, 0.36, 0.45, 0.09, seed=7, curl=0.35)
    c = mesh_obj(col, "crest_fur", v, f, MAT_TINT)
    smooth(c, 50)
    finish(col, c, "crest", (0.8, 1.8), True, "fur", tip=(0, 0.1, 0.36))

# ----------------------------------------------------------------------------- build all
BUILDERS = (
    eye_slit, eye_double_slit, eye_round, eye_spiral, eye_cute, eye_sleepy, eye_reptile,
    horn_curl, horn_spike, horn_nub, horn_ram,
    ear_round, ear_pointy, ear_floppy,
    trunk_short, trunk_long,
    tooth_tusk, tooth_row, tooth_buck, tooth_fang,
    wing_leaf, wing_bat, wing_feather,
    leg_stub, leg_tall, leg_rex,
    tail_curl, tail_tuft,
    crest_tuft, crest_fin, crest_feather, crest_fur,
)
for build in BUILDERS:
    build()

os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out))
print("SAVED", out, len(BUILDERS), "modules")
