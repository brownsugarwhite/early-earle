"""
Renders a labelled contact sheet of every module collection in a parts .blend (Workbench, flat studio
light, no outlines, no cavity) — for review and docs/progress screenshots.

Usage:
  /Applications/Blender.app/Contents/MacOS/Blender -b /tmp/starter_parts.blend -P tools/blender/render_module_sheet.py -- --out docs/progress/p1b-modules.png [--cols 8] [--width 2800]

Extensions (horn, ear, trunk, wing, leg, tail, crest) are shown from the side (their YZ plane faces
the camera, +Z up); eyes and teeth from the front (their +Z toward the camera, +Y up). Material colours
are replaced by sheet colours (Tint = pezenpez teal) — the game tints at runtime anyway.
"""
import bpy, sys, os, math
from mathutils import Matrix, Vector

argv = sys.argv
args = argv[argv.index("--") + 1:] if "--" in argv else []
def arg(name, default):
    return args[args.index(name) + 1] if name in args else default
out = os.path.abspath(arg("--out", "/tmp/module_sheet.png"))
cols = int(arg("--cols", "8"))
width = int(arg("--width", "2800"))

SHEET_COLOURS = {"Tint": "#5fc9b8", "Ink": "#0f1c22", "Bone": "#f7f6d8", "Iris": "#e8a33c", "Accent": "#e07380"}
BG = "#2a3d44"
FRONT = {"eye", "tooth"}

def lin(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c]

for m in bpy.data.materials:
    base = m.name.split(".")[0]
    if base in SHEET_COLOURS:
        m.diffuse_color = (*lin(SHEET_COLOURS[base]), 1.0)

scene = bpy.context.scene
modules = [c for c in scene.collection.children if not c.name.startswith("_")]
cell = 1.0
rows = (len(modules) + cols - 1) // cols

for i, col in enumerate(modules):
    r, c = divmod(i, cols)
    roots = [o for o in col.objects if o.parent is None]
    root = next((o for o in roots if o.type == "MESH"), roots[0])
    slot = str(root.get("slot", col.name.split("_")[0]))
    if slot in FRONT:
        rot = Matrix.Rotation(math.radians(90), 4, "X") @ Matrix.Rotation(math.radians(-18), 4, "Y")
    elif slot == "leg":  # legs hang down from the body: +Z (away from the body) points down
        rot = Matrix.Rotation(math.radians(90), 4, "Z") @ Matrix.Rotation(math.radians(180), 4, "X")
    else:
        rot = Matrix.Rotation(math.radians(90), 4, "Z") @ Matrix.Rotation(math.radians(12), 4, "X")
    # Fit: centre the module's bounding box in its cell.
    bpy.context.view_layer.update()
    pts = []
    for o in col.all_objects:
        if o.type == "MESH":
            for v in o.bound_box:
                pts.append(rot @ (o.matrix_world @ Vector(v)))
    if not pts:
        continue
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    size = max(hi.x - lo.x, hi.z - lo.z, 1e-3)
    s = min(1.6, 0.72 / size)
    centre = (lo + hi) / 2
    target = Vector((c * cell, 0, -r * cell * 1.15))
    root.matrix_world = Matrix.Translation(target) @ Matrix.Scale(s, 4) @ Matrix.Translation(-centre) @ rot @ root.matrix_world
    # Label.
    bpy.ops.object.text_add(location=(c * cell, 0, -r * cell * 1.15 - 0.47), rotation=(math.radians(90), 0, 0))
    t = bpy.context.active_object
    t.data.body = col.name
    t.data.size = 0.075
    t.data.align_x = "CENTER"
    mat = bpy.data.materials.new("_label")
    mat.diffuse_color = (*lin("#f7f6d8"), 1.0)
    t.data.materials.append(mat)
    for o in col.all_objects:
        if o.type == "EMPTY":
            o.hide_render = True

# Camera: orthographic, looking along +Y.
cam_data = bpy.data.cameras.new("sheet_cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = cols * cell
cam = bpy.data.objects.new("sheet_cam", cam_data)
scene.collection.objects.link(cam)
cam.location = ((cols - 1) * cell / 2, -10, -(rows - 1) * cell * 1.15 / 2)
cam.rotation_euler = (math.radians(90), 0, 0)
scene.camera = cam

scene.render.engine = "BLENDER_WORKBENCH"
sh = scene.display.shading
sh.light = "STUDIO"
sh.color_type = "MATERIAL"
sh.show_object_outline = False
sh.show_cavity = False
sh.show_specular_highlight = False
sh.show_shadows = False
scene.display.render_aa = "16"
world = bpy.data.worlds.new("sheet_world") if scene.world is None else scene.world
scene.world = world
world.color = lin(BG)
sh.background_type = "WORLD" if hasattr(sh, "background_type") else sh.background_type
scene.render.resolution_x = width
scene.render.resolution_y = int(width * (rows * 1.15) / cols)
scene.render.film_transparent = False
scene.view_settings.view_transform = "Standard"
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = out
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.render.render(write_still=True)
print("SHEET", out)
