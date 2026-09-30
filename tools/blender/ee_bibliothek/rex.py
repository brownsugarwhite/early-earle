"""
REX, der Guide-Dino (illudiy-Logo): ein gehäutetes Mesh mit 22 Knochen wie im Spiel (Wurzel, Hüfte, Brust,
Hals, Kopf, Unterkiefer, Arme, Beine, vier Schwanzglieder, Kopfkamm und die Zubehör-Knochen Schwindelkranz,
Schweißtropfen, Funkeln). Die Zubehörteile sind im Spiel über die Knochenskala versteckt — hier ebenso beim
„REX“, und sichtbar beim zweiten Rig „REX · mit Zubehör“ (teilt sich das Mesh).
"""
import bpy
import numpy as np
from mathutils import Vector

from . import materials
from .glb import Glb, g2b, g2b_array
from .nodes import NT, new_material
from .util import collection, hex_to_rgba, link, make_mesh, set_props

# Teilcode → (Materialname, Farben dunkel → hell, Stufen)
PART_MATERIALS = {
    "skin": ("REX · Haut", ["#2b6669", "#459996", "#54ada5", "#7df9e3"]),
    "mouth": ("REX · Maul", ["#8e4fa6", "#c161b5", "#e070a0"]),
    "throat": ("REX · Rachen", ["#5a2a6b", "#5a2a6b"]),
    "tooth": ("REX · Zähne", ["#bdb6d6", "#f6f3fb"]),
    "ink": ("REX · Tinte", ["#1e3f4d", "#1e3f4d"]),
    "eyeL": ("REX · Auge", ["#bfeee3", "#effff9"]),
    "eyeR": ("REX · Auge", ["#bfeee3", "#effff9"]),
    "crest": ("REX · Kamm", ["#8a6ff7", "#c0b0f0", "#e070a0"]),
    "star": ("REX · Sterne", ["#fff6fb", "#fff6fb"]),
    "gas": ("REX · Gas", ["#a88fd8", "#d3b1e9"]),
    "sweat": ("REX · Schweiß", ["#7fd3ee", "#c8f4ff"]),
}
PREFERRED_CHILD = {"Hüfte": "Brust", "Brust": "Hals", "Hals": "Kopf", "Oberarm.L": "Unterarm.L", "Oberarm.R": "Unterarm.R", "Bein.L": "Fuß.L", "Bein.R": "Fuß.R", "Schwanz.01": "Schwanz.02", "Schwanz.02": "Schwanz.03", "Schwanz.03": "Schwanz.04", "Wurzel": "Hüfte"}


def _skin_material():
    """Haut: vier Türkisstufen, heller Bauch (Ellipse vorn) mit Schuppenlinien."""
    name = "REX · Haut"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = materials.light_group()
    L = lg.outputs["Licht"]
    skin = materials.band_color(t, ["#2b6669", "#459996", "#54ada5", "#7df9e3"], (0.04, 0.35, 0.7), L)
    belly = materials.band_color(t, ["#4fb3a6", "#6fdfcc", "#a6fbe9"], (0.04, 0.45), L)
    attr = t.node("ShaderNodeAttribute", attribute_type="GEOMETRY", attribute_name="ee_rest")
    x, y, z = t.sep(attr.outputs["Vector"])
    # Bauch-Ellipse um (0, 0.3, z > 0.05) mit Radien 0.14 × 0.2 (Spielraum)
    ex = t.math("DIVIDE", x, 0.14)
    ey = t.math("DIVIDE", t.sub(y, 0.3), 0.2)
    inside = t.lt(t.add(t.mul(ex, ex), t.mul(ey, ey)), 1.0)
    front = t.gt(z, 0.05)
    bmask = t.mul(inside, front)
    lines = t.gt(t.math("FRACT", t.mul(y, 22.0)), 0.9)
    belly = t.mix(t.mul(lines, 0.6), belly, t.rgb(hex_to_rgba("#3f9a92")))
    col = t.mix(bmask, skin, belly)
    rim = t.mul(t.gt(lg.outputs["Rand"], 0.7), t.gt(L, 0.35))
    col = t.mix(t.mul(rim, 0.6), col, t.rgb(hex_to_rgba("#aef8e8")))
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba("#54ada5")
    return mat


def _eye_material():
    """Auge: helle Lederhaut mit Tinten-Spirale (Polarkoordinaten der Augen-UV, wie im Shader des Spiels)."""
    name = "REX · Auge"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = materials.light_group()
    sclera = materials.band_color(t, ["#bfeee3", "#effff9"], (0.04,), lg.outputs["Licht"])
    uv = t.node("ShaderNodeUVMap")
    u, v, _ = t.sep(uv.outputs["UV"])
    du = t.sub(u, 0.5)
    dv = t.sub(v, 0.5)
    r = t.math("SQRT", t.add(t.mul(du, du), t.mul(dv, dv)))
    ang = t.math("DIVIDE", t.math("ARCTAN2", dv, du), 6.28318)
    spiral = t.lt(t.math("ABSOLUTE", t.sub(t.math("FRACT", t.add(t.mul(r, 7.0), ang)), 0.5)), 0.22)
    col = t.mix(spiral, sclera, t.rgb(hex_to_rgba("#1e3f4d")))
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba("#effff9")
    return mat


def build_rex(path, section_col, view_layer, position=Vector((0, 0, 0))):
    g = Glb(path)
    root = g.root_nodes()[0]
    meta = root["extras"]
    bones = meta["bones"]
    col = collection("REX · Guide-Dino", section_col)
    children = {}
    for b in bones:
        if b["parent"]:
            children.setdefault(b["parent"], []).append(b["name"])
    rest = {b["name"]: g2b(b["rest"]) for b in bones}

    def make_rig(name):
        arm = bpy.data.armatures.new(name)
        ao = bpy.data.objects.new(name, arm)
        link(ao, col)
        ao.show_in_front = True
        view_layer.objects.active = ao
        bpy.ops.object.mode_set(mode="EDIT")
        ebs = {}
        for b in bones:
            eb = arm.edit_bones.new(b["name"])
            head = rest[b["name"]]
            kids = children.get(b["name"], [])
            pref = PREFERRED_CHILD.get(b["name"])
            if pref in kids:
                tail = rest[pref]
            elif b["name"] in ("Kopf", "Unterkiefer"):
                tail = head + Vector((0, -0.12, 0.0))
            elif b["name"].startswith("Fuß"):
                tail = head + Vector((0, -0.08, 0.0))
            else:
                tail = head + Vector((0, 0, 0.06))
            if (tail - head).length < 0.02:
                tail = head + Vector((0, 0, 0.05))
            eb.head, eb.tail = head, tail
            ebs[b["name"]] = eb
        for b in bones:
            if b["parent"]:
                ebs[b["name"]].parent = ebs[b["parent"]]
        bpy.ops.object.mode_set(mode="OBJECT")
        for b in bones:
            arm.bones[b["name"]]["ee_knochen"] = b["id"]
        return ao

    ao = make_rig("REX · Rig")
    ao.location = position
    body_node = next(g.nodes[i] for i in root["children"] if "mesh" in g.nodes[i])
    prim = g.mesh_primitives(body_node["mesh"])[0]
    pos_g = np.asarray(prim["positions"], dtype=np.float32)
    faces = prim["indices"].reshape(-1, 3)
    me = make_mesh("REX · Körper", g2b_array(pos_g), faces, smooth=True)
    attr = me.attributes.new("ee_rest", "FLOAT_VECTOR", "POINT")
    attr.data.foreach_set("vector", np.ascontiguousarray(pos_g).ravel())
    uv = prim["attributes"].get("TEXCOORD_0")
    if uv is not None:
        uvl = me.uv_layers.new(name="REX-UV")
        loop_uv = np.asarray(uv, dtype=np.float32)[faces.ravel()]
        uvl.data.foreach_set("uv", np.ascontiguousarray(loop_uv).ravel())
    # Materialslots je Teil
    part = np.asarray(prim["attributes"]["_PART"]).astype(np.int32)
    part_keys = {int(k): v["key"] for k, v in meta["parts"].items()}
    slot_names = []
    face_mat = np.zeros(len(faces), dtype=np.int32)
    for fi, f in enumerate(faces):
        key = part_keys.get(int(part[f[0]]), "skin")
        mname = PART_MATERIALS.get(key, PART_MATERIALS["skin"])[0]
        if mname not in slot_names:
            slot_names.append(mname)
        face_mat[fi] = slot_names.index(mname)
    for mname in slot_names:
        key = next(k for k, v in PART_MATERIALS.items() if v[0] == mname)
        if key == "skin":
            me.materials.append(_skin_material())
        elif key in ("eyeL", "eyeR"):
            me.materials.append(_eye_material())
        else:
            colors = PART_MATERIALS[key][1]
            me.materials.append(materials.ramp_material(mname, colors, (0.04, 0.4)[: len(colors) - 1], blended=False))
    me.polygons.foreach_set("material_index", face_mat)
    mo = bpy.data.objects.new("REX · Körper", me)
    link(mo, col)
    mo.parent = ao
    mod = mo.modifiers.new("Rig", "ARMATURE")
    mod.object = ao
    joints = np.asarray(prim["attributes"]["JOINTS_0"]).astype(np.int32)
    weights = np.asarray(prim["attributes"]["WEIGHTS_0"], dtype=np.float32)
    names = [b["name"] for b in bones]
    groups = {n: mo.vertex_groups.new(name=n) for n in names}
    for v in range(len(pos_g)):
        for q in range(4):
            w = float(weights[v, q])
            if w > 1e-4:
                groups[names[joints[v, q]]].add([v], w, "ADD")
    # Zubehör wie im Spiel versteckt (Knochenskala 0)
    for hidden in meta.get("hidden", []):
        pb = ao.pose.bones.get(hidden)
        if pb:
            pb.scale = (0.0, 0.0, 0.0)
    set_props(ao, {"ee_id": "rex", "ee_hinweis": "Zubehör (Schwindelkranz, Schweißtropfen, Funkeln) ist über die Knochenskala versteckt — wie im Spiel"})
    # Zweites Rig: alle Teile sichtbar (teilt sich das Mesh)
    ao2 = make_rig("REX · mit Zubehör · Rig")
    ao2.location = position + Vector((1.4, 0, 0))
    mo2 = bpy.data.objects.new("REX · mit Zubehör", me)
    link(mo2, col)
    mo2.parent = ao2
    mod2 = mo2.modifiers.new("Rig", "ARMATURE")
    mod2.object = ao2
    # Vertex-Gruppen gehören zum Mesh (seit Blender 3) — das zweite Objekt hat sie schon.
    set_props(ao2, {"ee_id": "rex-zubehoer"})
    info = meta.get("info", {})
    set_props(col, {"ee_id": "rex", "ee_knochen": len(bones), "ee_hoehe": info.get("headTop")})
    return col, ao
