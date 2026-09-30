"""
Materialien: alle Paletten des Spiels als beschriftete Farbstreifen (je Farbe ein Feld, Hex in den
Eigenschaften), dazu Musterkugeln mit den Wesen-Materialien (sechs Materialarten × Muster) — die Materialien
selbst sind als Assets im Katalog „Materialien“.
"""
import json
import os

import bpy
import numpy as np

from . import materials
from .nodes import NT, new_material
from .util import collection, hex_to_rgba, link, make_mesh, set_props


def _swatch_material():
    name = "Palette · Farbfeld"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    a = t.node("ShaderNodeAttribute", attribute_type="GEOMETRY", attribute_name="ee_farbe")
    emis = t.node("ShaderNodeEmission")
    t.link(a.outputs["Color"], emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    return mat


def _text(name, body, col, loc, size=0.35, mat=None):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.size = size
    cu.align_y = "CENTER"
    o = bpy.data.objects.new(name, cu)
    link(o, col)
    o.location = loc
    if mat is not None:
        cu.materials.append(mat)
    return o


def _strip(name, colors, col, loc):
    n = len(colors)
    verts, faces, face_colors = [], [], []
    for i, hx in enumerate(colors):
        x0 = i * 1.1
        b = len(verts)
        verts += [(x0, 0, 0), (x0 + 1, 0, 0), (x0 + 1, 1, 0), (x0, 1, 0)]
        faces += [(b, b + 1, b + 2), (b, b + 2, b + 3)]
        face_colors += [hex_to_rgba(hx)] * 2
    me = make_mesh(name, np.array(verts, np.float32), np.array(faces, np.int32), smooth=False)
    ca = me.color_attributes.new("ee_farbe", "FLOAT_COLOR", "CORNER")
    corner = np.repeat(np.array(face_colors, np.float32), 3, axis=0)
    ca.data.foreach_set("color", np.ascontiguousarray(corner).ravel())
    me.materials.append(_swatch_material())
    o = bpy.data.objects.new(name, me)
    link(o, col)
    o.location = loc
    return o


def _sample_sphere(name, mat, col, loc):
    import bmesh

    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=0.8)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.shade_smooth()
    co = np.zeros(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    rest = np.stack([co[:, 0], co[:, 2], -co[:, 1]], axis=1)  # Blender → Spielraum
    a = me.attributes.new("ee_rest", "FLOAT_VECTOR", "POINT")
    a.data.foreach_set("vector", np.ascontiguousarray(rest).ravel())
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    link(o, col)
    o.location = loc
    return o


PATTERN_SAMPLES = [
    ("tiger", "Tiger", "#e0892e", {"ground": "#e0892e", "ink": "#1c130e", "light": "#f4e4c1", "light2": "#b8561e"}),
    ("giraffe", "Giraffe", "#f3d377", {"ground": "#f3d377", "ink": "#b3802c", "light": "#f6e7b8", "light2": "#c2903a"}),
    ("zebra", "Zebra", "#eeeadb", {"ground": "#eeeadb", "ink": "#15151b", "light": "#eeeadb", "light2": "#2b2a33"}),
    ("snake", "Schlange", "#2f9a58", {"ground": "#2f9a58", "ink": "#10301f", "light": "#e6dc6a", "light2": "#d6b93a"}),
    ("spots", "Punkte", "#d9a54e", {"ground": "#d9a54e", "ink": "#2a190e", "light": "#f3e5c3", "light2": "#a8662a"}),
    ("diamonds", "Rauten", "#2f7f7a", {"ink": "#0d414c", "light": "#e07380", "light2": "#39bbeb"}),
    ("elephant", "Elefant", "#96a1ad", {"ground": "#96a1ad", "ink": "#6e7a88", "light": "#b3bcc6", "light2": "#7f8a97"}),
    ("rex", "REX", "#cf5fd8", {"ground": "#cf5fd8", "ink": "#8a2c9e", "light": "#e39ae8", "light2": "#a33fb4"}),
    ("retriever", "Retriever", "#efc25a", {"ground": "#efc25a", "ink": "#b07a2a", "light": "#f8dfa0", "light2": "#d9a54e"}),
    ("mouse", "Maus", "#c9cbd4", {"ground": "#c9cbd4", "ink": "#8a8c96", "light": "#e9e9ef", "light2": "#e6a0c8"}),
]
KIND_SAMPLES = [("jelly", "#7ce6d5", "#2f7f7a"), ("liquid", "#46c8d8", "#1f6f82"), ("gas", "#b9a6e8", "#6a58a8"), ("fire", "#e8552a", "#ffcf4a"), ("fur", "#efc25a", "#8a5a1e"), ("feather", "#f3c94f", "#b07a2a")]


def build_paletten(st):
    path = os.path.join(st.export, "paletten.json")
    if not os.path.exists(path):
        st.report.append("Paletten: kein Export")
        return
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    top = st.top("Materialien")
    label_mat = materials.flat_material("Beschriftung", "#f7f6d8", banded=False)
    # Blöcke: jede Gruppe (die Welten je Welt) als Block, gepackt in Spalten (Mauerwerk)
    blocks = []
    for group in data["groups"]:
        if group["group"] == "Welten":
            worlds = {}
            for row in group["rows"]:
                key = " ".join(row["name"].split(" · ")[0].split(" ")[:2])
                worlds.setdefault(key, []).append(row)
            for key, rows_ in worlds.items():
                blocks.append((group["group"], rows_[0]["name"].split(" · ")[0], rows_))
        else:
            blocks.append((group["group"], group["group"], group["rows"]))
    cols_h = [0.0, 0.0, 0.0, 0.0, 0.0]
    cols_w = [0.0] * len(cols_h)
    placed = []
    for gname, title, rows_ in blocks:
        h = 2.2 + 1.4 * len(rows_)
        w = 7.5 + 1.1 * max(len(r["colors"]) for r in rows_)
        c = min(range(len(cols_h)), key=lambda i: cols_h[i])
        placed.append((c, cols_h[c], gname, title, rows_))
        cols_h[c] += h + 1.5
        cols_w[c] = max(cols_w[c], w)
    xs = [sum(cols_w[:i]) + 3.0 * i for i in range(len(cols_w))]
    rows = 0
    for c, y0, gname, title, rows_ in placed:
        gcol = collection(f"Paletten · {gname}", top)
        x0 = xs[c]
        _text(f"Titel · {title}", title, gcol, (x0, -y0, 0), 0.7, label_mat)
        y = -y0 - 1.6
        for row in rows_:
            o = _strip(f"Palette · {row['name']}", row["colors"], gcol, (x0 + 7.5, y - 0.5, 0))
            set_props(o, {"ee_farben": ", ".join(row["colors"]), "ee_bezeichnungen": ", ".join(row.get("labels") or []) or None, "ee_gruppe": gname})
            short = row["name"].split(" · ", 1)[-1] if gname == "Welten" else row["name"]
            _text(f"Name · {row['name']}", short, gcol, (x0, y, 0), 0.32, label_mat)
            y -= 1.4
            rows += 1
    # Musterkugeln: Materialarten und Muster (die Wesen-Materialien des Spiels)
    scol = collection("Materialien · Musterkugeln", top)
    _text("Titel · Materialarten", "Materialarten", scol, (0, 6.5, 0), 0.8, label_mat)
    for i, (kind, base, inner) in enumerate(KIND_SAMPLES):
        meta = {"palette": {"base": base, "inner": inner, "rim": "#e8fbf6", "highlight": "#ffffff", "bubble": base}, "material": kind if kind not in ("fur", "feather") else "jelly", "skin": {"coat": kind if kind in ("fur", "feather") else "bare"}, "gloss": 0.7, "translucency": 0.6}
        mat = materials.creature_material(f"Wesen-Material · {materials.MATERIAL_KIND_LABEL[kind]}", meta)
        _sample_sphere(f"Musterkugel · {materials.MATERIAL_KIND_LABEL[kind]}", mat, scol, (i * 2.2, 4.5, 0.8))
        _text(f"Name · {kind}", materials.MATERIAL_KIND_LABEL[kind], scol, (i * 2.2 - 0.6, 3.2, 0), 0.3, label_mat)
        st.asset(mat, "Materialien/Wesen", f"Wesen-Material {materials.MATERIAL_KIND_LABEL[kind]} (Gruppe EE · Wesen-Körper)", ("Material", kind))
    _text("Titel · Muster", "Muster", scol, (0, 1.8, 0), 0.8, label_mat)
    for i, (kind, label, base, pal) in enumerate(PATTERN_SAMPLES):
        meta = {"palette": {"base": base, "inner": pal["ink"], "rim": pal["light"], "highlight": "#ffffff", "bubble": base}, "material": "jelly", "skin": {"coat": "bare"}, "gloss": 0.3, "translucency": 0.2, "pattern": {"kind": kind, "scale": 1.0, "contrast": 0.8, "rotation": 0.0, **pal}}
        mat = materials.creature_material(f"Wesen-Muster · {label}", meta)
        _sample_sphere(f"Musterkugel · {label}", mat, scol, (i * 2.2, 0.0, 0.8))
        _text(f"Name · Muster {label}", label, scol, (i * 2.2 - 0.6, -1.3, 0), 0.3, label_mat)
        st.asset(mat, "Materialien/Muster", f"Muster {label} (prozedural im Ruheraum des Körpers, Attribut ee_rest)", ("Muster", kind))
    for o in scol.objects:
        o.location.y += 12
    for m in ("Tint", "Ink", "Bone", "Accent", "Iris"):
        st.asset(materials.module_material(m), "Materialien/Module", materials.MODULE_MATERIALS[m][2], ("Modul", m))
    st.report.append(f"Materialien: {rows} Palettenreihen, {len(KIND_SAMPLES) + len(PATTERN_SAMPLES)} Musterkugeln")
