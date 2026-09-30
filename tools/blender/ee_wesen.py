"""
early earle — Wesen-Werkzeuge für Blender (Add-on oder Textblock-Skript).

Baue ein eigenes Wesen aus Kugeln, hänge Module an Sockel und exportiere es als
`content/genome/custom/<id>.json` — das Spiel zeigt es dann in /lab/creature („Eigene Wesen“).

Installation (einmal): Blender → Einstellungen → Add-ons → „Von Datenträger installieren…“ →
tools/blender/ee_wesen.py. Oder in der Bibliothek: Text-Editor → „ee_wesen.py“ → Skript ausführen (Alt P).
Danach: 3D-Ansicht → Seitenleiste (N) → Reiter „early earle“.

Aufbau eines Wesens (siehe docs/BLENDER.md):
  • Wurzel: das Rig (Bibliothek) oder das Empty „Wesen-Wurzel“ (Vorlage) = Körpermitte; der Boden ist Z = 0.
  • Kugeln: Kugel-Empties (Anzeigegröße 1, Skalierung = Radius) mit Eigenschaft ee_rolle
    (core, rump, body, lobe, head, face, jaw, neck, trunk, tail, spine, knee, foot), ee_kette (Reihenfolge
    in Hals/Rüssel/Schwanz/Wirbelsäule), ee_bein (FL, FR, BL, BR, L, R für Knie/Fuß).
  • Hüften: Empties mit ee_huefte = Bein (FL …) — Hüftgelenk im Rumpf; ee_beuge = +1 (vorn) / −1 (hinten).
  • Halsansatz (ee_hals_basis), Rüsselansatz (ee_ruessel_wurzel), Maul (ee_maul_anker = Kugelname,
    Richtung = Anker → Maul-Empty), Kiefergelenk (ee_kiefer_gelenk) — optional.
  • Sockel: Empties mit ee_sockel (eye, horn, ear, trunk, tooth, wing, leg, tail, crest), die eine
    Modul-Collection instanzieren; ee_anker = Kugelname; Neigung/Drehung/Versenkung als Eigenschaften.
Koordinaten im Spiel: +Y oben, +Z vorn — Blender: +Z oben, das Wesen schaut nach −Y.
"""

bl_info = {
    "name": "early earle: Wesen-Werkzeuge",
    "author": "early earle (illudiy)",
    "version": (1, 0, 0),
    "blender": (4, 2, 0),
    "location": "3D-Ansicht → Seitenleiste → early earle",
    "description": "Eigene Wesen aus Kugeln bauen und als content/genome/custom/<id>.json für das Spiel exportieren",
    "category": "Import-Export",
}

import json
import math
import os
import re
from datetime import datetime, timezone

import bpy
from mathutils import Matrix, Vector

ROLES = ["core", "rump", "body", "lobe", "head", "face", "jaw", "neck", "trunk", "tail", "spine", "knee", "foot"]
ROLE_LABELS = {
    "core": "Körper (Hauptkugel)",
    "rump": "Hinterteil",
    "body": "Rumpf",
    "lobe": "Lappen (Blob)",
    "head": "Kopf",
    "face": "Gesicht (fest am Kopf)",
    "jaw": "Unterkiefer",
    "neck": "Hals (Kette)",
    "trunk": "Rüssel (Kette)",
    "tail": "Schwanz (Kette)",
    "spine": "Wirbelsäule (Schlange)",
    "knee": "Knie",
    "foot": "Fuß",
}
LEGS = ["FL", "FR", "BL", "BR", "L", "R"]
SLOTS = ["eye", "horn", "ear", "trunk", "tooth", "wing", "leg", "tail", "crest"]
SPECIES = ["blob", "snake", "retriever", "mouse", "giraffe", "rex", "duck", "elephant"]
ZONES = ["tjorizo", "syrup", "luzz", "wooding"]
TINTS = ["base", "inner", "rim", "highlight", "ink", "bone", "accent", "module"]


# --- Koordinaten ---------------------------------------------------------------------------------------


def b2g(v):
    """Blender (Z oben, Front −Y) → Spielraum (Y oben, Front +Z)."""
    return [round(v[0], 5), round(v[2], 5), round(-v[1], 5)]


def slug(text):
    s = text.strip().lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "mein-wesen"


# --- Wesen finden --------------------------------------------------------------------------------------


def _all_objects(col):
    out = list(col.objects)
    for c in col.children:
        out += _all_objects(c)
    return out


def is_root(o):
    return o is not None and ("ee_wesen_json" in o or o.get("ee_wesen_wurzel"))


def find_creature(context):
    """(Collection, Wurzel) des Wesens, zu dem das aktive Objekt bzw. die aktive Collection gehört."""
    candidates = []
    if context.collection is not None and context.collection != context.scene.collection:
        candidates.append(context.collection)
    ob = context.active_object
    if ob is not None:
        root = ob
        while root is not None and not is_root(root):
            root = root.parent
        if root is not None:
            for col in root.users_collection:
                return col, root
        candidates += list(ob.users_collection)
    seen = set()
    while candidates:
        col = candidates.pop(0)
        if col.name in seen:
            continue
        seen.add(col.name)
        roots = [o for o in col.objects if is_root(o)]
        if roots:
            return col, roots[0]
        for parent in bpy.data.collections:
            if col.name in parent.children:
                candidates.append(parent)
    return None, None


# --- Export --------------------------------------------------------------------------------------------


class Issue(Exception):
    pass


def collect(context, col, root):
    """Liest das Wesen (Ruhepose) und liefert das JSON-Objekt (Format content/genome/custom, schemaVersion 1)."""
    arm_pose = None
    if root.type == "ARMATURE":
        arm_pose = root.data.pose_position
        root.data.pose_position = "REST"
        context.view_layer.update()
    try:
        return _collect(col, root)
    finally:
        if arm_pose is not None:
            root.data.pose_position = arm_pose
            context.view_layer.update()


def _collect(col, root):
    inv = root.matrix_world.inverted()
    base = {}
    if "ee_wesen_json" in root:
        try:
            base = json.loads(root["ee_wesen_json"]) or {}
        except (TypeError, ValueError):
            base = {}
    objs = _all_objects(col)
    local = lambda o: inv @ o.matrix_world.translation  # noqa: E731
    # Kugeln
    spheres = []
    names = set()
    for o in objs:
        if "ee_rolle" not in o or o.type != "EMPTY":
            continue
        role = str(o["ee_rolle"])
        if role not in ROLES:
            raise Issue(f"{o.name}: ee_rolle „{role}“ unbekannt (erlaubt: {', '.join(ROLES)})")
        name = str(o.get("ee_name") or o.name.split(" · ")[-1].replace("Kugel ", ""))
        if name in names:
            raise Issue(f"Kugelname „{name}“ doppelt (Eigenschaft ee_name an {o.name})")
        names.add(name)
        scale = (inv @ o.matrix_world).to_scale()
        r = o.empty_display_size * max(abs(scale.x), abs(scale.y), abs(scale.z))
        s = {"name": name, "role": role, "center": b2g(local(o)), "r": round(r, 5)}
        if "ee_kette" in o:
            s["chain"] = int(o["ee_kette"])
        if role in ("knee", "foot"):
            leg = str(o.get("ee_bein", ""))
            if leg not in LEGS:
                raise Issue(f"{o.name}: {role} braucht ee_bein (FL, FR, BL, BR, L oder R)")
            s["leg"] = leg
        spheres.append(s)
    if not spheres:
        raise Issue("Keine Kugeln gefunden (Kugel-Empties mit Eigenschaft ee_rolle)")
    if len(spheres) > 14:
        raise Issue(f"{len(spheres)} Kugeln — höchstens 14 (Grenze der GPU)")
    if not any(s["role"] in ("core", "head") for s in spheres):
        raise Issue("Es braucht eine Kugel mit Rolle core (oder mindestens head)")
    # Ketten ohne ee_kette: nach Reihenfolge im Outliner nummerieren
    for role in ("neck", "trunk", "tail", "spine"):
        chain = [s for s in spheres if s["role"] == role]
        if any("chain" not in s for s in chain):
            for k, s in enumerate(sorted(chain, key=lambda x: x["name"])):
                s["chain"] = k
    # Hüften
    legs = []
    for o in objs:
        if "ee_huefte" not in o:
            continue
        leg = str(o["ee_huefte"])
        if leg not in LEGS:
            raise Issue(f"{o.name}: ee_huefte „{leg}“ unbekannt")
        entry = {"leg": leg, "hip": b2g(local(o))}
        if "ee_beuge" in o:
            entry["bend"] = 1 if float(o["ee_beuge"]) >= 0 else -1
        legs.append(entry)
    if not legs:
        legs = [l for l in base.get("legs", []) if any(s.get("leg") == l["leg"] and s["role"] == "foot" for s in spheres)]
    for s in spheres:
        if s["role"] in ("knee", "foot") and not any(l["leg"] == s["leg"] for l in legs):
            raise Issue(f"Bein {s['leg']} hat Kugeln ({s['name']}), aber keine Hüfte (Empty mit ee_huefte = {s['leg']})")
    # Sockel
    parts = []
    by_name = {s["name"]: s for s in spheres}
    core = next((s for s in spheres if s["role"] == "core"), next((s for s in spheres if s["role"] == "head"), spheres[0]))
    for o in objs:
        if "ee_sockel" not in o or o.type != "EMPTY":
            continue
        slot = str(o["ee_sockel"])
        if slot not in SLOTS:
            raise Issue(f"{o.name}: ee_sockel „{slot}“ unbekannt (erlaubt: {', '.join(SLOTS)})")
        mc = o.instance_collection if o.instance_type == "COLLECTION" else None
        asset = str((mc.get("ee_modul") if mc is not None else None) or (mc.name if mc is not None else o.get("ee_modul", "")))
        if not asset:
            raise Issue(f"{o.name}: kein Modul (Instanzieren → Collection wählen)")
        anchor_name = str(o.get("ee_anker") or core["name"])
        anchor = by_name.get(anchor_name)
        if anchor is None:
            raise Issue(f"{o.name}: Ankerkugel „{anchor_name}“ gibt es nicht")
        m = inv @ o.matrix_world
        p = b2g(m.translation)
        d = Vector((p[0] - anchor["center"][0], p[1] - anchor["center"][1], p[2] - anchor["center"][2]))
        if d.length < 1e-5:
            d = Vector((0, 0, 1))
        d.normalize()
        sc = m.to_scale()
        theta = math.atan2(d.x, d.z)
        phi = math.asin(max(-1.0, min(1.0, d.y)))
        # Unverschobener Sockel (Position wie beim Bau der Bibliothek, ee_ruhe): exakte Richtung des Spiels behalten
        rest = o.get("ee_ruhe")
        if rest is not None and "ee_theta" in o and len(rest) == 3 and all(abs(p[i] - float(rest[i])) < 1e-3 for i in range(3)) and o.get("ee_anker") == anchor_name:
            theta = float(o["ee_theta"])
            phi = float(o["ee_phi"])
        part = {
            "slot": slot,
            "asset": asset,
            "anchor": anchor_name,
            "theta": round(theta, 5),
            "phi": round(phi, 5),
            "mirror": -1 if m.to_3x3().determinant() < 0 else 1,
            "tilt": round(float(o.get("ee_neigung", 0.0)), 5),
            "roll": round(float(o.get("ee_drehung", 0.0)), 5),
            "sink": round(float(o.get("ee_versenkt", 0.05)), 5),
            "scale": round(max(abs(sc.x), abs(sc.y), abs(sc.z)), 5),
        }
        if o.get("ee_ref") in ("up", "forward"):
            part["ref"] = str(o["ee_ref"])
        tint = o.get("ee_farbquelle")
        if isinstance(tint, str) and (tint in TINTS or re.match(r"^#[0-9a-fA-F]{6}$", tint)):
            part["tint"] = tint
        parts.append(part)
    # Wurzel-Eigenschaften (Vorlage) oder Basis-JSON (Bibliothek)
    get = lambda key, default=None: root.get(key, default)  # noqa: E731
    out = {
        "schemaVersion": 1,
        "id": slug(str(get("ee_id") or base.get("id") or col.name)),
        "name": str(get("ee_name") or base.get("name") or col.name),
        "base": str(get("ee_basis") or base.get("base") or "retriever"),
        "zone": str(get("ee_zone") or base.get("zone") or "tjorizo"),
        "tier": int(get("ee_stufe") or base.get("tier") or 6),
        "seed": int(base.get("seed", 7)),
    }
    if out["base"] not in SPECIES:
        raise Issue(f"ee_basis „{out['base']}“ unbekannt (erlaubt: {', '.join(SPECIES)})")
    if out["zone"] not in ZONES:
        raise Issue(f"ee_zone „{out['zone']}“ unbekannt")
    mat = get("ee_material") or base.get("material")
    if mat:
        out["material"] = str(mat)
    colors = dict(base.get("colors") or {})
    new_base = get("ee_farbe")
    if isinstance(new_base, str) and re.match(r"^#[0-9a-fA-F]{6}$", new_base) and new_base.lower() != str(colors.get("base", "")).lower():
        # Neue Grundfarbe: Innen- und Randfarbe leitet das Spiel daraus ab (außer sie sind eigens gesetzt)
        colors.pop("inner", None)
        colors.pop("rim", None)
    for key, prop in (("base", "ee_farbe"), ("inner", "ee_innenfarbe"), ("rim", "ee_randfarbe"), ("accent", "ee_akzent")):
        v = get(prop)
        if isinstance(v, str) and re.match(r"^#[0-9a-fA-F]{6}$", v):
            colors[key] = v
    if colors:
        out["colors"] = colors
    skin = dict(base.get("skin") or {})
    if get("ee_fell"):
        skin["coat"] = str(get("ee_fell"))
    if get("ee_muster"):
        skin["pattern"] = str(get("ee_muster"))
    if skin:
        out["skin"] = skin
    out["sminK"] = round(float(get("ee_glaettung", base.get("sminK", 0.2))), 5)
    out["size"] = round(float(get("ee_groesse", base.get("size", 1.0))), 5)
    lift = root.matrix_world.translation.z
    out["restLift"] = round(lift, 5) if lift > 0.05 else base.get("restLift")
    if out["restLift"] is None:
        del out["restLift"]
    if base.get("floorY") is not None and out["base"] == "blob":
        out["floorY"] = base["floorY"]
    out["spheres"] = spheres
    out["legs"] = legs
    # Hals, Rüssel, Maul
    for o in objs:
        if o.get("ee_hals_basis"):
            out["neck"] = {"base": b2g(local(o)), "maxBend": round(float(o.get("ee_max_biegung", 0.6)), 4)}
        if o.get("ee_ruessel_wurzel"):
            out["trunk"] = {"root": b2g(local(o))}
    if "neck" not in out and base.get("neck"):
        out["neck"] = base["neck"]
    if "trunk" not in out and base.get("trunk") and any(s["role"] == "trunk" for s in spheres):
        out["trunk"] = base["trunk"]
    mouth = None
    hinge = None
    for o in objs:
        if o.get("ee_maul_anker"):
            anchor = by_name.get(str(o["ee_maul_anker"]))
            if anchor is None:
                raise Issue(f"{o.name}: Maul-Anker „{o['ee_maul_anker']}“ gibt es nicht")
            p = b2g(local(o))
            d = Vector((p[0] - anchor["center"][0], p[1] - anchor["center"][1], p[2] - anchor["center"][2])).normalized()
            mouth = {"anchor": anchor["name"], "dir": [round(d.x, 5), round(d.y, 5), round(d.z, 5)], "width": round(float(o.get("ee_breite", 0.85)), 4), "open": round(float(o.get("ee_oeffnung", 0.8)), 4)}
        if o.get("ee_kiefer_gelenk"):
            hinge = b2g(local(o))
    if mouth is None and base.get("mouth") and base["mouth"].get("anchor") in by_name:
        mouth = dict(base["mouth"])
    if mouth is not None:
        if hinge is not None:
            mouth["hinge"] = hinge
        out["mouth"] = mouth
    out["parts"] = parts
    out["source"] = {"tool": "Blender ee_wesen.py", "file": bpy.path.basename(bpy.data.filepath) or None, "exported": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    if out["source"]["file"] is None:
        del out["source"]["file"]
    return out


def default_export_dir():
    """content/genome/custom relativ zur Bibliothek (assets/blender/…blend → ../../content/genome/custom)."""
    if not bpy.data.filepath:
        return ""
    d = os.path.normpath(os.path.join(os.path.dirname(bpy.data.filepath), "..", "..", "content", "genome", "custom"))
    return d if os.path.isdir(os.path.dirname(d)) else ""


def to_json(data):
    """JSON mit zwei Leerzeichen, Zahlenlisten (Punkte, Richtungen) in einer Zeile."""
    text = json.dumps(data, ensure_ascii=False, indent=2)
    return re.sub(r"\[\s+([-0-9.eE,\s]+?)\s+\]", lambda m: "[" + ", ".join(x.strip() for x in m.group(1).split(",")) + "]", text)


def write_json(data, directory):
    os.makedirs(directory, exist_ok=True)
    path = os.path.join(directory, f"{data['id']}.json")
    with open(path, "w", encoding="utf-8") as f:
        f.write(to_json(data) + "\n")
    return path


# --- Vorschau (Geometry Nodes: glatte Vereinigung der Kugeln) --------------------------------------------


def preview_group():
    """EE · Wesen-Vorschau: Kugel-Empties einer Collection → SDF-Kugeln → Verrundung → Mesh (live)."""
    name = "EE · Wesen-Vorschau"
    ng = bpy.data.node_groups.get(name)
    if ng is not None:
        return ng
    ng = bpy.data.node_groups.new(name, "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    s = ng.interface.new_socket(name="Kugeln", in_out="INPUT", socket_type="NodeSocketCollection")
    s.description = "Collection mit den Kugel-Empties (Anzeigegröße 1, Skalierung = Radius)"
    v = ng.interface.new_socket(name="Voxelgröße", in_out="INPUT", socket_type="NodeSocketFloat")
    v.default_value = 0.03
    v.min_value = 0.01
    f = ng.interface.new_socket(name="Verrundung", in_out="INPUT", socket_type="NodeSocketInt")
    f.default_value = 12
    f.min_value = 0
    f.max_value = 30
    m = ng.interface.new_socket(name="Material", in_out="INPUT", socket_type="NodeSocketMaterial")
    del m
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    N = ng.nodes
    L = ng.links
    gi = N.new("NodeGroupInput")
    gi.location = (-900, 0)
    go = N.new("NodeGroupOutput")
    go.location = (900, 0)
    ci = N.new("GeometryNodeCollectionInfo")
    ci.location = (-650, 0)
    ci.transform_space = "RELATIVE"
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = False
    L.new(gi.outputs["Kugeln"], ci.inputs["Collection"])
    isc = N.new("GeometryNodeInputInstanceScale")
    isc.location = (-650, -250)
    sep = N.new("ShaderNodeSeparateXYZ")
    sep.location = (-450, -250)
    L.new(isc.outputs[0], sep.inputs[0])
    i2p = N.new("GeometryNodeInstancesToPoints")
    i2p.location = (-400, 0)
    L.new(ci.outputs[0], i2p.inputs["Instances"])
    L.new(sep.outputs[0], i2p.inputs["Radius"])
    p2s = N.new("GeometryNodePointsToSDFGrid")
    p2s.location = (-150, 0)
    L.new(i2p.outputs["Points"], p2s.inputs["Points"])
    L.new(gi.outputs["Voxelgröße"], p2s.inputs["Voxel Size"])
    fil = N.new("GeometryNodeSDFGridFillet")
    fil.location = (100, 0)
    L.new(p2s.outputs[0], fil.inputs["Grid"])
    L.new(gi.outputs["Verrundung"], fil.inputs["Iterations"])
    g2m = N.new("GeometryNodeGridToMesh")
    g2m.location = (350, 0)
    L.new(fil.outputs[0], g2m.inputs["Grid"])
    smooth = N.new("GeometryNodeSetShadeSmooth")
    smooth.location = (550, 0)
    L.new(g2m.outputs[0], smooth.inputs["Geometry"])
    sm = N.new("GeometryNodeSetMaterial")
    sm.location = (720, 0)
    L.new(smooth.outputs[0], sm.inputs["Geometry"])
    L.new(gi.outputs["Material"], sm.inputs["Material"])
    L.new(sm.outputs[0], go.inputs["Geometry"])
    return ng


def add_preview(col, sphere_col, root, material=None):
    """Vorschau-Objekt (GN) in `col`, das die Kugeln aus `sphere_col` glatt vereinigt anzeigt."""
    me = bpy.data.meshes.new(f"{col.name} · Vorschau")
    o = bpy.data.objects.new(f"{col.name} · Vorschau", me)
    col.objects.link(o)
    o.parent = root
    o.matrix_parent_inverse = root.matrix_world.inverted()
    mod = o.modifiers.new("Wesen-Vorschau", "NODES")
    mod.node_group = preview_group()
    for item in mod.node_group.interface.items_tree:
        if getattr(item, "item_type", "") != "SOCKET" or item.in_out != "INPUT":
            continue
        if item.name == "Kugeln":
            mod[item.identifier] = sphere_col
        elif item.name == "Material" and material is not None:
            mod[item.identifier] = material
    o["ee_vorschau"] = True
    return o


# --- Operatoren ------------------------------------------------------------------------------------------


class EE_OT_wesen_exportieren(bpy.types.Operator):
    """Liest Kugeln, Hüften, Sockel und Module des Wesens (Ruhepose) und schreibt content/genome/custom/<id>.json"""

    bl_idname = "ee.wesen_exportieren"
    bl_label = "early earle: Wesen exportieren"
    bl_options = {"REGISTER"}

    directory: bpy.props.StringProperty(name="Ordner", subtype="DIR_PATH", default="")
    use_dialog: bpy.props.BoolProperty(name="Ordner wählen", default=False, options={"SKIP_SAVE"})

    def invoke(self, context, event):
        if not self.directory:
            self.directory = default_export_dir()
        if not self.directory or self.use_dialog:
            context.window_manager.fileselect_add(self)
            return {"RUNNING_MODAL"}
        return self.execute(context)

    def execute(self, context):
        col, root = find_creature(context)
        if col is None:
            self.report({"ERROR"}, "Kein Wesen gewählt — ein Objekt des Wesens (oder seine Collection) aktivieren")
            return {"CANCELLED"}
        try:
            data = collect(context, col, root)
        except Issue as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}
        directory = bpy.path.abspath(self.directory) if self.directory else default_export_dir()
        if not directory:
            self.report({"ERROR"}, "Kein Zielordner — Datei speichern oder Ordner wählen (content/genome/custom)")
            return {"CANCELLED"}
        path = write_json(data, directory)
        self.report({"INFO"}, f"Gespeichert: {path} ({len(data['spheres'])} Kugeln, {len(data['parts'])} Module). Im Spiel: /lab/creature → Eigene Wesen")
        return {"FINISHED"}


class EE_OT_kugel_hinzufuegen(bpy.types.Operator):
    """Neue Kugel (Empty) am 3D-Cursor ins aktive Wesen"""

    bl_idname = "ee.kugel_hinzufuegen"
    bl_label = "early earle: Kugel hinzufügen"
    bl_options = {"REGISTER", "UNDO"}

    rolle: bpy.props.EnumProperty(name="Rolle", items=[(r, ROLE_LABELS[r], "") for r in ROLES], default="body")
    radius: bpy.props.FloatProperty(name="Radius", default=0.35, min=0.02, max=5)

    def execute(self, context):
        col, root = find_creature(context)
        if col is None:
            self.report({"ERROR"}, "Kein Wesen gewählt")
            return {"CANCELLED"}
        target = next((c for c in col.children if c.name.endswith("Kugeln")), col)
        n = sum(1 for o in _all_objects(col) if "ee_rolle" in o) + 1
        e = bpy.data.objects.new(f"Kugel {self.rolle} {n}", None)
        e.empty_display_type = "SPHERE"
        e.empty_display_size = 1.0
        target.objects.link(e)
        e.parent = root
        e.matrix_world = Matrix.Translation(context.scene.cursor.location) @ Matrix.Diagonal((self.radius, self.radius, self.radius, 1.0))
        e["ee_rolle"] = self.rolle
        e["ee_name"] = f"{self.rolle}.{n:02d}"
        for o in context.selected_objects:
            o.select_set(False)
        e.select_set(True)
        context.view_layer.objects.active = e
        return {"FINISHED"}


class EE_OT_vorschau(bpy.types.Operator):
    """Live-Vorschau (glatte Vereinigung der Kugeln wie im Spiel) für das aktive Wesen anlegen"""

    bl_idname = "ee.vorschau_anlegen"
    bl_label = "early earle: Vorschau anlegen"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        col, root = find_creature(context)
        if col is None:
            self.report({"ERROR"}, "Kein Wesen gewählt")
            return {"CANCELLED"}
        spheres = next((c for c in col.children if c.name.endswith("Kugeln")), None)
        if spheres is None:
            self.report({"ERROR"}, "Keine Kugel-Collection (Name endet auf „Kugeln“)")
            return {"CANCELLED"}
        mat = next((m for o in _all_objects(col) if o.type == "MESH" for m in o.data.materials if m is not None), None)
        add_preview(col, spheres, root, mat)
        return {"FINISHED"}


class EE_PT_wesen(bpy.types.Panel):
    bl_label = "early earle · Wesen"
    bl_idname = "EE_PT_wesen"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "early earle"

    def draw(self, context):
        layout = self.layout
        col, root = find_creature(context)
        if col is None:
            layout.label(text="Objekt eines Wesens wählen", icon="INFO")
        else:
            layout.label(text=col.name, icon="OUTLINER_COLLECTION")
            box = layout.box()
            for key, label in (("ee_id", "Datei-ID"), ("ee_name", "Name"), ("ee_basis", "Basis-Art"), ("ee_stufe", "Stufe"), ("ee_material", "Material"), ("ee_farbe", "Farbe"), ("ee_fell", "Fell"), ("ee_muster", "Muster"), ("ee_glaettung", "Glättung")):
                if key in root:
                    box.prop(root, f'["{key}"]', text=label)
        ob = context.active_object
        if ob is not None and any(k in ob for k in ("ee_rolle", "ee_sockel", "ee_huefte")):
            box = layout.box()
            box.label(text=ob.name, icon="EMPTY_DATA")
            for key, label in (("ee_rolle", "Rolle"), ("ee_name", "Kugelname"), ("ee_kette", "Kette"), ("ee_bein", "Bein"), ("ee_huefte", "Hüfte"), ("ee_beuge", "Knie-Richtung"), ("ee_sockel", "Sockel"), ("ee_anker", "Anker"), ("ee_neigung", "Neigung"), ("ee_drehung", "Drehung"), ("ee_versenkt", "Versenkt"), ("ee_farbquelle", "Farbquelle")):
                if key in ob:
                    box.prop(ob, f'["{key}"]', text=label)
            if ob.type == "EMPTY" and "ee_sockel" in ob:
                box.prop(ob, "instance_collection", text="Modul")
        layout.separator()
        layout.operator("ee.kugel_hinzufuegen", icon="MESH_UVSPHERE")
        layout.operator("ee.vorschau_anlegen", icon="MOD_REMESH")
        row = layout.row()
        row.scale_y = 1.4
        row.operator("ee.wesen_exportieren", icon="EXPORT")
        layout.label(text="→ content/genome/custom/<id>.json")


CLASSES = (EE_OT_wesen_exportieren, EE_OT_kugel_hinzufuegen, EE_OT_vorschau, EE_PT_wesen)


def register():
    for c in CLASSES:
        try:
            bpy.utils.register_class(c)
        except ValueError:
            bpy.utils.unregister_class(c)
            bpy.utils.register_class(c)


def unregister():
    for c in reversed(CLASSES):
        try:
            bpy.utils.unregister_class(c)
        except RuntimeError:
            pass


if __name__ == "__main__":
    register()
