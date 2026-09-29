"""
Creates a minimal test parts library (eye, horn, wing) with SOCKET_* empties and extras, headless.
Usage: Blender -b -P tools/blender/make_test_parts.py -- --out /tmp/parts_test.blend
"""
import bpy, sys, os, math

argv = sys.argv
args = argv[argv.index("--") + 1:] if "--" in argv else []
out = args[args.index("--out") + 1] if "--out" in args else "/tmp/parts_test.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def new_collection(name):
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    return col

def add_mesh(col, name, primitive, **kw):
    getattr(bpy.ops.mesh, primitive)(**kw)
    obj = bpy.context.active_object
    obj.name = name
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)
    return obj

def add_socket(col, name, parent, location):
    bpy.ops.object.empty_add(type="ARROWS", location=location)
    e = bpy.context.active_object
    e.name = name
    e.empty_display_size = 0.1
    for c in e.users_collection:
        c.objects.unlink(e)
    col.objects.link(e)
    e.parent = parent
    return e

# eye_slit: flattened capsule-ish body
col = new_collection("eye_slit")
eye = add_mesh(col, "eye_slit_mesh", "primitive_uv_sphere_add", radius=0.12, segments=16, ring_count=8)
eye.scale = (0.35, 1.0, 0.6)
eye["slot"] = "eye"; eye["scale_min"] = 0.6; eye["scale_max"] = 1.6; eye["tintable"] = False; eye["material_family"] = "ink"
add_socket(col, "SOCKET_root", eye, (0, 0, -0.05))

# horn_curl: cone
col = new_collection("horn_curl")
horn = add_mesh(col, "horn_curl_mesh", "primitive_cone_add", radius1=0.12, radius2=0.0, depth=0.5, vertices=12)
horn["slot"] = "horn"; horn["scale_min"] = 0.5; horn["scale_max"] = 2.5; horn["tintable"] = True; horn["material_family"] = "shell"
add_socket(col, "SOCKET_root", horn, (0, 0, -0.25))
add_socket(col, "SOCKET_tip", horn, (0, 0, 0.25))

# wing_leaf: flat plane with a bend
col = new_collection("wing_leaf")
wing = add_mesh(col, "wing_leaf_mesh", "primitive_plane_add", size=0.6)
wing.scale = (1.0, 0.4, 1.0)
wing["slot"] = "wing"; wing["scale_min"] = 0.7; wing["scale_max"] = 3.0; wing["tintable"] = True; wing["material_family"] = "membrane"
add_socket(col, "SOCKET_root", wing, (-0.3, 0, 0))
add_socket(col, "SOCKET_tip", wing, (0.3, 0, 0))

# a deliberately broken asset (no socket) to test validation
col = new_collection("broken_no_socket")
add_mesh(col, "broken_mesh", "primitive_cube_add", size=0.2)

os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("SAVED", out)
