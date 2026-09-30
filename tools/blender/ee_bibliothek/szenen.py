"""
Szenen je Abschnitt (Map, Wesen, Spielfeld, REX, Module, Materialien, Eigenes Wesen): jede mit eigener Kamera,
Sonne (Earle: flach und hart) und Welt, EEVEE mit „Standard“-Farbtransformation — die Palettenfarben kommen
unverfälscht heraus. Die Map bekommt dazu je Welt eine Kamera wie im Spiel (Höhe, Abstand, Blickpunkt, FOV).
"""
import math

import bpy
from mathutils import Vector

from .util import hex_to_rgba

SCENE_ORDER = ["Wesen", "Map", "Spielfeld", "REX", "Module", "Materialien", "Eigenes Wesen"]
BACKGROUND = {"Map": "#081b25", "Wesen": "#1b2a1a", "Spielfeld": "#1b2a1a", "REX": "#18302f", "Module": "#1b2a1a", "Materialien": "#141b1f", "Eigenes Wesen": "#1b2a1a"}


def _world(name, hexcol):
    """Hintergrund sichtbar in der Zonenfarbe, aber (fast) ohne Umgebungslicht: nur die Sonne bestimmt die Bänder."""
    w = bpy.data.worlds.new(f"Welt · {name}")
    if w.node_tree is None:
        w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputWorld")
    lp = nt.nodes.new("ShaderNodeLightPath")
    bg_cam = nt.nodes.new("ShaderNodeBackground")
    bg_cam.inputs["Color"].default_value = hex_to_rgba(hexcol)
    bg_amb = nt.nodes.new("ShaderNodeBackground")
    bg_amb.inputs["Color"].default_value = (0.02, 0.02, 0.02, 1)
    bg_amb.inputs["Strength"].default_value = 0.2
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
    nt.links.new(bg_amb.outputs[0], mix.inputs[1])
    nt.links.new(bg_cam.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    w.color = hex_to_rgba(hexcol)[:3]
    return w


def _sun(scene, direction_to_sun, energy=4.0):
    d = bpy.data.lights.new(f"Sonne · {scene.name}", "SUN")
    d.energy = energy
    d.angle = math.radians(0.4)  # harte, messerscharfe Schattenkanten (Earle)
    if hasattr(d, "use_shadow"):
        d.use_shadow = True
    o = bpy.data.objects.new(f"Sonne · {scene.name}", d)
    scene.collection.objects.link(o)
    o.rotation_euler = (-Vector(direction_to_sun)).to_track_quat("-Z", "Y").to_euler()
    return o


def look_rotation(location, target, up=(0, 0, 1)):
    """Kamera-Drehung: −Z schaut auf das Ziel, +Y möglichst nach `up` (auf dem Planeten: die Normale)."""
    from mathutils import Matrix

    f = (Vector(target) - Vector(location)).normalized()
    u = Vector(up).normalized()
    r = f.cross(u)
    if r.length < 1e-6:
        r = f.cross(Vector((0, 1, 0)))
    r.normalize()
    u2 = r.cross(f)
    m = Matrix((r, u2, -f)).transposed()
    return m.to_euler()


def _camera(scene, name, location, target, lens=35.0, clip_end=600.0, up=(0, 0, 1)):
    c = bpy.data.cameras.new(name)
    c.lens = lens
    c.clip_end = clip_end
    c.clip_start = 0.05
    o = bpy.data.objects.new(name, c)
    scene.collection.objects.link(o)
    o.location = location
    o.rotation_euler = look_rotation(location, target, up)
    return o


def bounds_of(col):
    """Weltgrenzen aller sichtbaren Mesh-/Text-Objekte (rekursiv) einer Collection."""
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    found = False

    def visit(c):
        nonlocal mn, mx, found
        for o in c.objects:
            if o.type not in ("MESH", "FONT", "CURVE"):
                continue
            for v in o.bound_box:
                w = o.matrix_world @ Vector(v)
                mn = Vector((min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)))
                mx = Vector((max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)))
                found = True
        for ch in c.children:
            visit(ch)

    visit(col)
    if not found:
        return Vector((0, 0, 0)), Vector((1, 1, 1))
    return mn, mx


def frame(mn, mx, direction=(-0.55, -1.0, 0.75), lens=35.0, margin=1.1):
    """Kameraposition, die die Box aus Richtung `direction` füllt (Perspektive)."""
    center = (mn + mx) / 2
    radius = (mx - mn).length / 2
    fov = 2 * math.atan(18.0 / lens)
    dist = radius / math.sin(fov / 2) * margin
    d = Vector(direction).normalized()
    return center + d * dist, center


def _base(scene, name):
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1000
    scene.render.film_transparent = False
    if hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 16
    if hasattr(scene.eevee, "shadow_resolution_scale"):
        scene.eevee.shadow_resolution_scale = 1.0
    scene.world = _world(name, BACKGROUND.get(name, "#1b2a1a"))
    scene.unit_settings.system = "METRIC"


def _map_cameras(scene, st, col):
    info = st.map_info or {}
    R = float(info.get("radius", 32))
    cams = []
    for w in info.get("worlds", []):
        c = w.get("center")
        view = w.get("view") or {}
        if not c:
            continue
        n = Vector((c[0], -c[2], c[1])).normalized()  # Spielraum → Blender
        apex = n * (R + 0.8)
        pole = Vector((0, 0, 1))
        back = (pole - n * n.dot(pole))
        if back.length < 1e-3:
            back = Vector((1, 0, 0))
        back.normalize()
        height = float(view.get("height", 9))
        fwd = float(view.get("forward", 4))
        look = float(view.get("look", 5))
        loc = apex + n * height + back * fwd
        target = apex - back * look
        fov = math.radians(float(view.get("fov", 52)))
        lens = 18.0 / math.tan(fov / 2)
        cam = _camera(scene, f"Kamera · Welt {w['id'][1:]} {w['name']}", loc, target, lens, 600.0, n)
        cam["ee_welt"] = w["id"]
        cams.append((cam, n, back))
    mn, mx = Vector((-R - 12, -R - 12, -R - 12)), Vector((R + 12, R + 12, R + 12))
    loc, target = frame(mn, mx, (0.35, -1.0, 0.45), 35.0, 0.95)
    overview = _camera(scene, "Kamera · Planet (Übersicht)", loc, target, 35.0, 1000.0)
    return cams, overview


def setup_scenes(st):
    first = st.scene  # heißt „Wesen“ (Baus-Szene)
    scenes = {}
    for name in SCENE_ORDER:
        col = st.sections.get(name)
        if col is None:
            continue
        if name == "Wesen":
            sc = first
        else:
            sc = bpy.data.scenes.new(name)
            sc.collection.children.link(col)
            first.collection.children.unlink(col)
        scenes[name] = sc
        _base(sc, name)
    # Szenen ohne Inhalt (Teilbau): die Bauszene bleibt „Wesen“
    for name, sc in scenes.items():
        col = st.sections[name]
        if name == "Map":
            cams, overview = _map_cameras(sc, st, col)
            main = cams[0][0] if cams else overview
            sc.camera = main
            if cams:
                cam, n, back = cams[0]
                fwd = -back
                right = fwd.cross(n).normalized()
                el, az = math.radians(12), math.radians(70)
                to_sun = (n * math.sin(el) + (fwd * math.cos(az) + right * math.sin(az)) * math.cos(el)).normalized()
                sun = _sun(sc, to_sun, 4.0)
                sun["ee_hinweis"] = "Earle-Sonne: 12° über dem Horizont, 70° seitlich zur Blickrichtung der Welt-01-Kamera (wie im Spiel)"
            else:
                _sun(sc, (0.3, -0.5, 0.8))
        elif name == "Materialien":
            mn, mx = bounds_of(col)
            center = (mn + mx) / 2
            size = max(mx.x - mn.x, mx.y - mn.y)
            cam = _camera(sc, "Kamera · Materialien", center + Vector((0, 0, size * 0.9)), center, 35.0, 2000.0)
            sc.camera = cam
            _sun(sc, (-0.4, -0.5, 0.75))
        else:
            mn, mx = bounds_of(col)
            direction = {"Spielfeld": (0.0, -0.45, 1.0), "Module": (0.0, -1.0, 0.9), "REX": (-0.6, -1.0, 0.35), "Eigenes Wesen": (-0.7, -1.0, 0.55)}.get(name, (-0.15, -1.0, 1.25))
            lens = 35.0
            loc, target = frame(mn, mx, direction, lens, {"Wesen": 0.62, "Module": 0.7}.get(name, 1.0))
            cam = _camera(sc, f"Kamera · {name}", loc, target, lens, 2000.0)
            sc.camera = cam
            _sun(sc, (-0.45, -0.55, 0.7) if name != "Spielfeld" else (-0.7, 0.3, 0.45))
    st.scenes = scenes
