"""
Module (Augen, Hörner, Ohren, Rüssel, Zähne, Flügel, Beine, Schweife, Kämme — Blender- und prozedurale
Module) als Collections in den Konventionen von tools/blender/README.md: eine Collection je Modul (Name =
Asset-ID), Wurzel-Mesh mit Eigenschaften (slot, scale_min, scale_max, tintable, material_family, chain),
Kind-Segmente, `SOCKET_*`-Empties. Der Instanz-Ursprung der Collection liegt genau auf SOCKET_root (so setzt
das Spiel das Modul an den Sockel) — die Wesen instanzieren diese Collections an ihren Sockeln.
"""
import os

import bpy
import numpy as np
from mathutils import Matrix, Vector

from . import materials
from .glb import Glb, g2b_array, mat_g2b
from .util import collection, link, make_mesh, set_props

SLOT_ORDER = ["eye", "horn", "ear", "trunk", "tooth", "wing", "leg", "tail", "crest"]
SLOT_LABEL = {"eye": "Augen", "horn": "Hörner", "ear": "Ohren", "trunk": "Rüssel & Nasen", "tooth": "Zähne & Schnäbel", "wing": "Flügel", "leg": "Beine", "tail": "Schweife", "crest": "Kämme"}


def _mesh_from_node(g, node, name):
    prims = g.mesh_primitives(node["mesh"])
    verts, faces, mat_idx, mats = [], [], [], []
    off = 0
    for p in prims:
        pos = g2b_array(p["positions"])
        idx = p["indices"].reshape(-1, 3) if p["indices"] is not None else np.arange(len(pos)).reshape(-1, 3)
        verts.append(pos)
        faces.append(idx + off)
        mname = (p["material"] or {}).get("name", "Tint")
        if mname not in mats:
            mats.append(mname)
        mat_idx.append(np.full(len(idx), mats.index(mname), dtype=np.int32))
        off += len(pos)
    me = make_mesh(name, np.concatenate(verts), np.concatenate(faces), smooth=False)
    for m in mats:
        me.materials.append(materials.module_material(m))
    me.polygons.foreach_set("material_index", np.concatenate(mat_idx))
    # Weiche Schattierung nach Winkel wie im Spiel (Module sind facettiert oder rund modelliert).
    if hasattr(me, "set_sharp_from_angle"):
        me.set_sharp_from_angle(angle=0.6)
    return me


def build_module(path, parent_col, position):
    """Ein Modul-GLB → Collection mit Wurzel, Segmenten und Sockeln; Instanz-Ursprung auf SOCKET_root."""
    g = Glb(path)
    wrapper = g.root_nodes()[0]
    meta = wrapper.get("extras", {})
    mid = meta.get("id") or os.path.splitext(os.path.basename(path))[0]
    col = collection(mid, parent_col)
    objs = {}
    root_seg_index = wrapper["children"][0]
    root_socket_local = None

    def build(i, parent_obj):
        nonlocal root_socket_local
        node = g.nodes[i]
        name = node.get("name", f"node{i}")
        local = mat_g2b(g.node_matrix(node))
        if "mesh" in node:
            o = bpy.data.objects.new(name, _mesh_from_node(g, node, name))
            ex = node.get("extras", {})
            set_props(o, {"ee_segment": ex.get("segment"), "ee_pupille": ex.get("pupil") or None, "ee_lid": ex.get("lid") or None, "ee_kiefer": ex.get("jaw") or None})
        else:
            o = bpy.data.objects.new(name, None)
            o.empty_display_type = "ARROWS" if name.startswith("SOCKET_") else "PLAIN_AXES"
            o.empty_display_size = 0.12
            if name == "SOCKET_root":
                root_socket_local = local
        link(o, col)
        if parent_obj is not None:
            o.parent = parent_obj
            o.matrix_parent_inverse = Matrix.Identity(4)
            o.matrix_basis = local
        objs[i] = o
        for c in node.get("children", []):
            build(c, o)
        return o

    root = build(root_seg_index, None)
    rsi = root_socket_local.inverted() if root_socket_local is not None else Matrix.Identity(4)
    root.matrix_world = Matrix.Translation(position) @ rsi
    col.instance_offset = position
    rule = meta.get("rule") or {}
    scale = rule.get("scale") or [0.7, 1.4]
    # Konventionen von export_assets.py (werden zu glTF-Extras) + Bibliotheks-Infos.
    set_props(
        root,
        {
            "slot": meta.get("slot"),
            "scale_min": float(scale[0]),
            "scale_max": float(scale[1]),
            "tintable": bool(rule.get("tintable", True)),
            "material_family": rule.get("family", "shell"),
            "chain": bool(rule.get("chain", False)),
        },
    )
    set_props(col, {"ee_modul": mid, "ee_slot": meta.get("slot"), "ee_prozedural": bool(meta.get("procedural")), "ee_dreiecke": meta.get("faces")})
    if meta.get("procedural"):
        root["ee_hinweis"] = "Prozedurales Modul (im Spiel aus Code: packages/render/src/creature/ProceduralModules.ts) — Änderungen hier als eigenes GLB-Modul exportieren"
    return mid, col, meta


def build_modules(export_dir, section_col):
    """Alle Modul-GLBs → Collections, nach Slot sortiert in Reihen. Liefert {asset_id: collection}."""
    folder = os.path.join(export_dir, "module")
    if not os.path.isdir(folder):
        return {}
    files = sorted(f for f in os.listdir(folder) if f.endswith(".glb"))
    by_slot = {}
    metas = {}
    for f in files:
        g = Glb(os.path.join(folder, f))
        meta = g.root_nodes()[0].get("extras", {})
        by_slot.setdefault(meta.get("slot", "misc"), []).append(f)
        metas[f] = meta
    from . import materials

    labels = collection("Module · Beschriftung", section_col)
    label_mat = materials.flat_material("Beschriftung", "#f7f6d8", banded=False)

    def label(text, loc, size):
        cu = bpy.data.curves.new(text, "FONT")
        cu.body = text
        cu.size = size
        cu.align_x = "CENTER"
        cu.materials.append(label_mat)
        o = bpy.data.objects.new(f"Beschriftung · {text}", cu)
        labels.objects.link(o)
        o.location = loc

    out = {}
    row = 0
    for slot in SLOT_ORDER + sorted(set(by_slot) - set(SLOT_ORDER)):
        if slot not in by_slot:
            continue
        slot_col = collection(f"Module · {SLOT_LABEL.get(slot, slot)}", section_col)
        label(SLOT_LABEL.get(slot, slot), Vector((-2.2, -row * 2.0, 0.0)), 0.3)
        for k, f in enumerate(by_slot[slot]):
            pos = Vector((k * 1.6, -row * 2.0, 0.0))
            mid, col, meta = build_module(os.path.join(folder, f), slot_col, pos)
            out[mid] = col
            label(mid, pos + Vector((0, -0.55, 0)), 0.12)
        row += 1
    return out
