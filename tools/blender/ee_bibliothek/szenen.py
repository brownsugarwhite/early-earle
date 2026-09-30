"""
Szenen je Abschnitt (Map, Wesen, Spielfeld, REX, Module, Materialien, Eigenes Wesen): jede mit eigener Kamera,
Sonne (Earle: flach und hart) und Welt, EEVEE mit „Standard“-Farbtransformation — die Palettenfarben kommen
unverfälscht heraus. Die Map bekommt dazu je Welt eine Kamera wie im Spiel (Höhe, Abstand, Blickpunkt, FOV).
"""
import math

import bpy
from mathutils import Matrix, Vector

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


def corners(mn, mx):
    return [Vector((x, y, z)) for x in (mn.x, mx.x) for y in (mn.y, mx.y) for z in (mn.z, mx.z)]


def _basis(direction, up):
    f = -Vector(direction).normalized()  # Blickrichtung (Kamera → Ziel)
    r = f.cross(Vector(up).normalized())
    if r.length < 1e-6:
        r = f.cross(Vector((0, 1, 0)))
    r.normalize()
    return f, r, r.cross(f)


def fit(points, direction, lens=35.0, aspect=1.6, margin=1.06, up=(0, 0, 1), sensor=36.0):
    """Perspektive: Kamera aus Richtung `direction` genau so weit zurück, dass alle Punkte ins Bild passen
    (Sensor-Anpassung „Auto“ wie in Blender: die längere Bildseite bekommt 36 mm), Bildmitte = Mitte der Projektion.
    Gibt (Kameraposition, Zielpunkt) zurück."""
    pts = [Vector(p) for p in points]
    target = sum(pts, Vector()) / max(1, len(pts))
    f, r, u = _basis(direction, up)
    half = sensor / 2 / lens
    th, tv = (half, half / aspect) if aspect >= 1 else (half * aspect, half)
    th, tv = th / margin, tv / margin
    ext = max(((p - target).length for p in pts), default=1.0) or 1.0

    def distance(t):
        d = 0.0
        for p in pts:
            q = p - t
            x, y, z = q.dot(r), q.dot(u), q.dot(f)
            d = max(d, abs(x) / th - z, abs(y) / tv - z, -z + 0.05 * ext)
        return d

    for _ in range(4):
        dist = distance(target)
        loc = target - f * dist
        xs, ys = [], []
        for p in pts:
            q = p - loc
            z = max(q.dot(f), 1e-6)
            xs.append(q.dot(r) / z)
            ys.append(q.dot(u) / z)
        target = target + (r * ((min(xs) + max(xs)) / 2) + u * ((min(ys) + max(ys)) / 2)) * dist
    dist = distance(target)
    return target - f * dist, target


def fit_ortho(points, direction, aspect=1.6, margin=1.06, up=(0, 0, 1)):
    """Orthografisch: (Kameraposition, Ziel, ortho_scale) für alle Punkte aus Richtung `direction`."""
    pts = [Vector(p) for p in points]
    f, r, u = _basis(direction, up)
    xs = [p.dot(r) for p in pts]
    ys = [p.dot(u) for p in pts]
    zs = [p.dot(f) for p in pts]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    scale = max(w, h * aspect) if aspect >= 1 else max(w / aspect, h)
    target = r * cx + u * cy + f * ((min(zs) + max(zs)) / 2)
    depth = max(zs) - min(zs)
    return target - f * (depth + 10.0), target, scale * margin


def frame(mn, mx, direction=(-0.55, -1.0, 0.75), lens=35.0, margin=1.06, aspect=1.6, up=(0, 0, 1)):
    """Kameraposition, die die Box aus Richtung `direction` genau füllt (Perspektive)."""
    return fit(corners(mn, mx), direction, lens, aspect, margin, up)


def bounds_of(col, _seen=None):
    """Weltgrenzen aller sichtbaren Mesh-/Text-Objekte (rekursiv) einer Collection — samt Collection-Instanzen
    (Module an den Sockeln) und GN-Instanzwolken."""
    seen = _seen if _seen is not None else set()
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    found = False

    def grow(o):
        """Instanz-Punktwolken (GN „EE · Instanzen“/„EE · Glyphen“): um die Größe der Vorlage erweitern."""
        for mod in o.modifiers:
            if mod.type != "NODES" or mod.node_group is None:
                continue
            for item in mod.node_group.interface.items_tree:
                if getattr(item, "item_type", "") == "SOCKET" and item.in_out == "INPUT" and item.name == "Vorlage":
                    tmpl = mod.get(item.identifier)
                    if tmpl is not None:
                        s = 1.0
                        a = o.data.attributes.get("ee_scale") if o.type == "MESH" else None
                        if a is not None and len(a.data):
                            import numpy as np

                            arr = np.zeros(len(a.data) * 3, np.float32)
                            a.data.foreach_get("vector", arr)
                            s = float(np.abs(arr).max())
                        return max(tmpl.dimensions) * 0.5 * s
            if mod.node_group.name == "EE · Punkte":
                return 0.1
        return 0.0

    def add(w, pad=0.0):
        nonlocal mn, mx, found
        mn = Vector((min(mn.x, w.x - pad), min(mn.y, w.y - pad), min(mn.z, w.z - pad)))
        mx = Vector((max(mx.x, w.x + pad), max(mx.y, w.y + pad), max(mx.z, w.z + pad)))
        found = True

    def visit(c):
        if c.name in seen:
            return
        seen.add(c.name)
        for o in c.objects:
            if o.hide_render:
                continue
            if o.type == "EMPTY" and o.instance_type == "COLLECTION" and o.instance_collection is not None:
                ic = o.instance_collection
                if ic.name in seen:
                    continue
                imn, imx = bounds_of(ic, set(seen))
                if (imx - imn).length > 1e-6 and imn.x < 1e8:
                    m = o.matrix_world @ Matrix.Translation(-ic.instance_offset)
                    for p in corners(imn, imx):
                        add(m @ p)
                continue
            if o.type not in ("MESH", "FONT", "CURVE"):
                continue
            pad = grow(o)
            for v in o.bound_box:
                add(o.matrix_world @ Vector(v), pad)
        for ch in c.children:
            visit(ch)

    visit(col)
    if not found:
        return Vector((0, 0, 0)), Vector((1, 1, 1))
    return mn, mx


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
    # Übersicht: der Planet samt Bewuchs und Riesenbaum (Kugel R + 9) füllt das Bild; die Vorlagen-Reihe daneben darf angeschnitten sein
    shell = [Vector((i, j, k)).normalized() * (R + 9.0) for i in (-1, 0, 1) for j in (-1, 0, 1) for k in (-1, 0, 1) if (i, j, k) != (0, 0, 0)]
    loc, target = fit(shell, (0.35, -1.0, 0.45), 35.0, 1.6, 1.08)
    overview = _camera(scene, "Kamera · Planet (Übersicht)", loc, target, 35.0, 1000.0)
    return cams, overview


def setup_scenes(st):
    first = st.scene  # heißt „Wesen“ (Baus-Szene)
    st.view_layer.update()  # Weltmatrizen nach dem Auslegen aktuell (Grenzen für die Kameras)
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
        sc.view_layers[0].update()
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
        elif name in ("Materialien", "Wesen", "Module"):
            # Raster (Paletten, Wesen je Stufe, Module je Slot): orthografisch, damit alles gleich groß erscheint
            mn, mx = bounds_of(col)
            direction, up = {"Materialien": ((0, 0, 1), (0, 1, 0)), "Wesen": ((0.0, -0.8, 1.0), (0, 0, 1)), "Module": ((0.0, -0.8, 1.0), (0, 0, 1))}[name]
            loc, target, scale = fit_ortho(corners(mn, mx), direction, 1.6, 1.03, up=up)
            cam = _camera(sc, f"Kamera · {name}", loc, target, 35.0, 4000.0, up=up)
            cam.data.type = "ORTHO"
            cam.data.ortho_scale = scale
            sc.camera = cam
            _sun(sc, (-0.4, -0.5, 0.75) if name == "Materialien" else (-0.45, -0.55, 0.7))
        else:
            mn, mx = bounds_of(col)
            margin = {"Spielfeld": 1.05, "REX": 1.12}.get(name, 1.06)
            if name == "Eigenes Wesen" and getattr(st, "template", None):
                mn, mx = bounds_of(st.template[0])  # das Wesen, nicht die ganze Wiese
                margin = 1.3
            direction = {"Spielfeld": (0.0, -0.45, 1.0), "REX": (-0.6, -1.0, 0.35), "Eigenes Wesen": (-0.7, -1.0, 0.55)}.get(name, (-0.55, -1.0, 0.75))
            lens = 35.0
            loc, target = frame(mn, mx, direction, lens, margin)
            cam = _camera(sc, f"Kamera · {name}", loc, target, lens, 4000.0)
            sc.camera = cam
            _sun(sc, (-0.45, -0.55, 0.7) if name != "Spielfeld" else (-0.7, 0.3, 0.45))
    st.scenes = scenes
