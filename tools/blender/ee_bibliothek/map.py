"""
Map: der Planet (Radius 32) mit seinen zehn Welten — je Welt eine Collection mit Terrain, Bäumen, Requisiten,
Müll und Kronenpunkten (Geometry-Nodes-Instanzen der Vorlagen, Palettenzeilen je Instanz wie im Spiel), dazu
der Riesenbaum auf seinem Wahrzeichen-Platz, der Levelpfad (100 Knoten, Punkte) und die Wahrzeichen-Slots.
Die Vorlagen (Kronenformen, Stamm, kahler Baum, Requisiten-Teile, Becken, Kuh) liegen einzeln neben dem Planeten.
"""
import json
import math
import os

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

from . import earle
from .glb import Glb, g2b, g2b_array, mat_g2b
from .util import collection, empty, hex_to_rgba, link, make_mesh, point_mesh, set_props

KIND_MATERIAL = {"krone": "Map · Krone", "stamm": "Map · Stamm", "kahl": "Map · Kahler Baum", "requisit": "Map · Requisit", "becken": "Map · Becken", "tier": "Map · Kuh", "weitere": "Map · Weitere"}


def _kind_family(kind):
    if kind.startswith("krone-"):
        return "krone"
    if kind == "stamm":
        return "stamm"
    if kind == "kahl":
        return "kahl"
    if kind == "becken":
        return "becken"
    if kind == "tier":
        return "tier"
    if kind.startswith("weitere"):
        return "weitere"
    return "requisit"


def _template_family(template):
    if template.startswith("krone-"):
        return "krone"
    if template.startswith("requisit-"):
        return "requisit"
    return _kind_family(template)


def _mesh_from_prims(name, g, mesh_index, convert=True):
    prims = g.mesh_primitives(mesh_index)
    verts, faces = [], []
    off = 0
    uvs = []
    for p in prims:
        v = g2b_array(p["positions"]) if convert else np.asarray(p["positions"], dtype=np.float32)
        f = p["indices"].reshape(-1, 3) if p["indices"] is not None else np.arange(len(v)).reshape(-1, 3)
        verts.append(v)
        faces.append(f + off)
        uv = p["attributes"].get("TEXCOORD_0")
        uvs.append(np.asarray(uv, dtype=np.float32) if uv is not None else np.zeros((len(v), 2), np.float32))
        off += len(v)
    V = np.concatenate(verts)
    F = np.concatenate(faces)
    me = make_mesh(name, V, F, smooth=True)
    UV = np.concatenate(uvs)
    if np.any(UV):
        uvl = me.uv_layers.new(name="UV")
        uvl.data.foreach_set("uv", np.ascontiguousarray(UV[F.ravel()]).ravel())
    return me, prims


def _instances_object(name, g, node, template_obj, col, family):
    """Instanzsatz (EXT_mesh_gpu_instancing) → Punkte-Mesh + GN „EE · Instanzen“ mit der Vorlage."""
    attrs = node["extensions"]["EXT_mesh_gpu_instancing"]["attributes"]
    T = np.asarray(g.accessor(attrs["TRANSLATION"]), dtype=np.float32)
    R = np.asarray(g.accessor(attrs["ROTATION"]), dtype=np.float32)
    S = np.asarray(g.accessor(attrs["SCALE"]), dtype=np.float32)
    me = point_mesh(name, g2b_array(T))
    # Quaternion Spielraum (x, y, z, w) → Blender (w, x, −z, y); Skala (sx, sy, sz) → (sx, sz, sy)
    q = np.stack([R[:, 3], R[:, 0], -R[:, 2], R[:, 1]], axis=1)
    rot = me.attributes.new("ee_rot", "QUATERNION", "POINT")
    rot.data.foreach_set("value", np.ascontiguousarray(q).ravel())
    sc = me.attributes.new("ee_scale", "FLOAT_VECTOR", "POINT")
    sc.data.foreach_set("vector", np.ascontiguousarray(np.stack([S[:, 0], S[:, 2], S[:, 1]], axis=1)).ravel())
    for key, acc in attrs.items():
        if not key.startswith("_"):
            continue
        a = me.attributes.new("ee_" + key[1:].lower(), "FLOAT", "POINT")
        a.data.foreach_set("value", np.ascontiguousarray(np.asarray(g.accessor(acc), dtype=np.float32)).ravel())
    o = bpy.data.objects.new(name, me)
    link(o, col)
    mod = o.modifiers.new("Instanzen", "NODES")
    mod.node_group = earle.gn_instances()
    earle.set_modifier_inputs(mod, {"Vorlage": template_obj})
    o["ee_instanzen"] = len(T)
    return o


def _points_object(name, g, node, col, material, radius_factor=1.0, size_attr="_SIZE"):
    prim = g.mesh_primitives(node["mesh"])[0]
    me = point_mesh(name, g2b_array(prim["positions"]))
    if prim.get("normals") is not None:
        a = me.attributes.new("ee_normal", "FLOAT_VECTOR", "POINT")
        a.data.foreach_set("vector", np.ascontiguousarray(g2b_array(prim["normals"])).ravel())
    for key, arr in prim["attributes"].items():
        if not key.startswith("_"):
            continue
        arr = np.asarray(arr, dtype=np.float32)
        if arr.ndim == 1:
            a = me.attributes.new("ee_" + key[1:].lower(), "FLOAT", "POINT")
            a.data.foreach_set("value", np.ascontiguousarray(arr))
        else:
            for c in range(arr.shape[1]):
                a = me.attributes.new(f"ee_{key[1:].lower()}_{'xyzw'[c]}", "FLOAT", "POINT")
                a.data.foreach_set("value", np.ascontiguousarray(arr[:, c]))
    if size_attr != "_SIZE" and f"ee_{size_attr[1:].lower()}_x" in me.attributes:
        src = me.attributes[f"ee_{size_attr[1:].lower()}_x"]
        vals = np.zeros(len(me.vertices), np.float32)
        src.data.foreach_get("value", vals)
        a = me.attributes.new("ee_size", "FLOAT", "POINT")
        a.data.foreach_set("value", vals)
    o = bpy.data.objects.new(name, me)
    link(o, col)
    if material is not None:
        mod = o.modifiers.new("Punkte", "NODES")
        mod.node_group = earle.gn_points()
        earle.set_modifier_inputs(mod, {"Radius-Faktor": radius_factor, "Material": material})
    return o


def build_map(st):
    ex = st.export
    info_path = os.path.join(ex, "map", "welten.json")
    if not os.path.exists(info_path):
        st.report.append("Map: kein Export")
        return
    with open(info_path, encoding="utf-8") as f:
        info = json.load(f)
    earle.palette_image(info["atlas"])
    top = st.top("Map")
    worlds = info["worlds"]
    wcols = {}
    for w in worlds:
        c = collection(f"Welt {w['id'][1:]} · {w['name']}", top)
        set_props(c, {"ee_welt": w["id"], "ee_welt_index": w["index"], "ee_zone": w["zone"], "ee_boden": w.get("ground"), "ee_seite": w.get("side")})
        wcols[w["index"]] = c
    other = collection("Map · Welt unbekannt", top)

    # --- Terrain ----------------------------------------------------------------------------------
    tg = Glb(os.path.join(ex, "map", "terrain.glb"))
    planet = tg.root_nodes()[0]
    for ni in planet.get("children", []):
        node = tg.nodes[ni]
        e = node.get("extras", {})
        w = e.get("world", -1)
        wi = next((x for x in worlds if x["index"] == w), None)
        prim = tg.mesh_primitives(node["mesh"])[0]
        me = make_mesh(node["name"], g2b_array(prim["positions"]), prim["indices"].reshape(-1, 3), smooth=True)
        for key, name in (("_HEIGHT", "ee_height"), ("_BORDER", "ee_border"), ("_ZONE", "ee_zone")):
            if key in prim["attributes"]:
                a = me.attributes.new(name, "FLOAT", "POINT")
                a.data.foreach_set("value", np.ascontiguousarray(np.asarray(prim["attributes"][key], dtype=np.float32)))
        preview = (wi or {}).get("palette", {}).get("terrain", ["#808080"] * 3)[2]
        me.materials.append(earle.terrain_material(f"Terrain · {(wi or {}).get('name', w)}", e.get("row", 0), 5, preview))
        o = bpy.data.objects.new(node["name"], me)
        link(o, wcols.get(w, other))
        set_props(o, {"ee_welt": e.get("worldId"), "ee_art": "terrain", "ee_palettenzeile": e.get("row")})
    st.report.append(f"Map-Terrain: {len(planet.get('children', []))} Welten")

    # --- Vorlagen + Streuung ----------------------------------------------------------------------
    vg = Glb(os.path.join(ex, "map", "vegetation.glb"))
    roots = {n["name"]: n for n in vg.root_nodes()}
    tcol = collection("Map · Vorlagen", top)
    templates = {}
    R = float(info.get("radius", 32))
    for k, ni in enumerate(roots.get("Vorlagen", {}).get("children", [])):
        node = vg.nodes[ni]
        e = node.get("extras", {})
        me, _ = _mesh_from_prims(node["name"], vg, node["mesh"])
        fam = _template_family(e.get("template", ""))
        me.materials.append(earle.instance_material(KIND_MATERIAL.get(fam, "Map · Weitere"), fam))
        o = bpy.data.objects.new(f"Vorlage · {e.get('label')}", me)
        link(o, tcol)
        o.location = Vector((R + 8 + (k % 6) * 3.0, -((k // 6) * 3.0), 0))
        set_props(o, {"ee_vorlage": e.get("template"), "ee_gruppe": e.get("group")})
        templates[e.get("template")] = o
        st.asset(o, f"Map/{e.get('group', 'Vorlagen')}", f"Vorlage {e.get('label')} (Spiel-Geometrie; Farbe je Instanz aus der Palettenzeile)", ("Map", e.get("group", "")))
    kinds = roots.get("Streuung", {}).get("extras", {}).get("kinds", {})
    n_sets = 0
    for ni in roots.get("Streuung", {}).get("children", []):
        node = vg.nodes[ni]
        e = node.get("extras", {})
        w = e.get("world", -1)
        col = wcols.get(w, other)
        if e.get("kind") == "punkte":
            mat = earle.instance_material("Map · Kronenpunkte", "punkte", "#dfdc86")
            o = _points_object(node["name"], vg, node, col, mat, 1.0)
        else:
            tmpl = templates.get(e.get("template"))
            if tmpl is None:
                continue
            o = _instances_object(node["name"], vg, node, tmpl, col, _kind_family(e.get("kind", "")))
        set_props(o, {"ee_art": e.get("kind"), "ee_welt_index": w, "ee_gruppe": e.get("group")})
        n_sets += 1
    st.report.append(f"Map-Streuung: {n_sets} Instanzsätze, {len(templates)} Vorlagen")

    # --- Riesenbaum ---------------------------------------------------------------------------------
    try:
        build_hero_tree(st, top, info)
    except Exception as exc:  # noqa: BLE001
        import traceback

        traceback.print_exc()
        st.report.append(f"! Riesenbaum: {exc}")

    # --- Levelpfad, Wahrzeichen --------------------------------------------------------------------
    pg = Glb(os.path.join(ex, "map", "pfad.glb"))
    proot = pg.root_nodes()[0]
    pcol = collection("Map · Levelpfad", top)
    pex = proot.get("extras", {})
    puck_me = bpy.data.meshes.get("Levelknoten · Stein")
    if puck_me is None:
        import bmesh

        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.32, radius2=0.28, depth=0.12)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.06))
        puck_me = bpy.data.meshes.new("Levelknoten · Stein")
        bm.to_mesh(puck_me)
        bm.free()
        from . import materials

        puck_me.materials.append(materials.ramp_material("Map · Levelknoten", ["#7a2c52", "#e070a0", "#f7c4dc"], (0.04, 0.5)))
    for ni in proot.get("children", []):
        node = pg.nodes[ni]
        prim = pg.mesh_primitives(node["mesh"])[0]
        P = g2b_array(prim["positions"])
        N = g2b_array(prim["normals"]) if prim.get("normals") is not None else np.tile([0, 0, 1], (len(P), 1))
        if node["name"] == "Levelknoten":
            levels = np.asarray(prim["attributes"]["_LEVEL"]).astype(int)
            zones = np.asarray(prim["attributes"]["_ZONE"]).astype(int)
            wl = np.asarray(prim["attributes"]["_WORLD"]).astype(int)
            tree_levels = pex.get("treeLevels", [0, 0])
            for i in range(len(P)):
                o = bpy.data.objects.new(f"Level {levels[i]:03d}", puck_me)
                link(o, pcol)
                n = Vector(N[i]).normalized()
                o.matrix_world = Matrix.Translation(Vector(P[i])) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4()
                set_props(o, {"ee_level": int(levels[i]), "ee_zone": int(zones[i]), "ee_welt_index": int(wl[i]), "ee_am_riesenbaum": bool(tree_levels[0] <= levels[i] <= tree_levels[1])})
        else:
            me = point_mesh("Pfadpunkte", P)
            a = me.attributes.new("ee_size", "FLOAT", "POINT")
            a.data.foreach_set("value", np.full(len(P), 0.07, np.float32))
            o = bpy.data.objects.new("Pfadpunkte", me)
            link(o, pcol)
            mod = o.modifiers.new("Punkte", "NODES")
            mod.node_group = earle.gn_points()
            from . import materials

            earle.set_modifier_inputs(mod, {"Radius-Faktor": 1.0, "Material": materials.flat_material("Map · Pfadpunkte", "#f4e7c9")})
    set_props(pcol, {"ee_laenge": pex.get("length"), "ee_riesenbaum_level": json.dumps(pex.get("treeLevels"))})
    lcol = collection("Map · Wahrzeichen", top)
    for l in pex.get("landmarks", []):
        e = empty(f"Wahrzeichen · {l['id']}", lcol, "SINGLE_ARROW", 1.5)
        n = g2b(l["normal"]).normalized()
        e.matrix_world = Matrix.Translation(g2b(l["position"])) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4()
        inst = l.get("instance") or {}
        set_props(e, {"ee_slot": l["id"], "ee_welt_index": l["world"], "ee_freiraum": float(l["clearRadius"]), "ee_fokus": inst.get("kind"), "ee_drehung_grad": float(l.get("yawDeg", 0))})
    set_props(top, {"ee_radius": R, "ee_chunks_je_seite": info.get("chunksPerFace"), "ee_kruemmung": info.get("curvature")})
    st.map_info = info


def build_hero_tree(st, top, info):
    ex = st.export
    path = os.path.join(ex, "map", "riesenbaum.glb")
    if not os.path.exists(path):
        return
    g = Glb(path)
    root = g.root_nodes()[0]
    rex = root.get("extras", {})
    col = collection("Map · Riesenbaum", top)
    holder = empty("Riesenbaum", col, "SINGLE_ARROW", 2.0)
    holder.matrix_world = mat_g2b(g.node_matrix(root))
    rows = rex.get("rows") or {}
    from . import materials

    bark_row = rows.get("bark", 0)
    for ni in root.get("children", []):
        node = g.nodes[ni]
        e = node.get("extras", {})
        part = e.get("part", "")
        name = node["name"]
        if "extensions" in node:
            # Kuppeln: Kugel-Vorlage + Instanzen (Familienzeilen je Kuppel)
            me, _ = _mesh_from_prims(f"{name} · Vorlage", g, node["mesh"])
            me.materials.append(_dome_material())
            tmpl = bpy.data.objects.new(f"{name} · Vorlage", me)
            link(tmpl, col)
            tmpl.hide_viewport = True
            tmpl.hide_render = True
            o = _instances_object(name, g, node, tmpl, col, "krone")
        elif g.meshes[node["mesh"]]["primitives"][0].get("mode", 4) == 0:
            # Billboards: Punkte + Glyphen-Vorlage, zur Normalen ausgerichtet
            tchild = g.nodes[node["children"][0]] if node.get("children") else None
            data_attr = {"dots": "_DOTDATA", "glyphs": "_GLYPHDATA", "stars": "_STARDATA", "blossoms": "_BDATA"}.get(part, "_SIZE")
            o = _points_object(name, g, node, col, None, 1.0, data_attr)
            if tchild is not None:
                # Glyphen liegen im Spiel in der XY-Ebene (Normale +Z) — so bleiben sie für „An Vektor ausrichten“
                tme, _ = _mesh_from_prims(tchild["name"], g, tchild["mesh"], convert=False)
                tme.materials.append(_hero_billboard_material(part, rows))
                tobj = bpy.data.objects.new(tchild["name"], tme)
                link(tobj, col)
                tobj.hide_viewport = True
                tobj.hide_render = True
                mod = o.modifiers.new("Glyphen", "NODES")
                mod.node_group = earle.gn_glyphs()
                earle.set_modifier_inputs(mod, {"Vorlage": tobj, "Größe": 1.0})
        else:
            me, prims = _mesh_from_prims(name, g, node["mesh"])
            for key, attr_name in (("_BARK", "ee_bark"), ("_BARKCIRC", "ee_barkcirc"), ("_LEVEL", "ee_level")):
                arr = prims[0]["attributes"].get(key)
                if arr is None:
                    continue
                arr = np.asarray(arr, dtype=np.float32)
                if arr.ndim == 1:
                    a = me.attributes.new(attr_name, "FLOAT", "POINT")
                    a.data.foreach_set("value", arr)
                else:
                    a = me.attributes.new(attr_name, "FLOAT_VECTOR", "POINT")
                    a.data.foreach_set("vector", np.ascontiguousarray(np.concatenate([arr, np.zeros((len(arr), 3 - arr.shape[1]), np.float32)], axis=1)).ravel())
            me.materials.append(_bark_material(bark_row) if part == "trunk" else materials.ramp_material("Riesenbaum · Äste", ["#06091a", "#114a86"], (0.3,)))
            o = bpy.data.objects.new(name, me)
            link(o, col)
            if node.get("matrix"):
                o.matrix_basis = mat_g2b(g.node_matrix(node))
        o.parent = holder
        o.matrix_parent_inverse = Matrix.Identity(4)
        set_props(o, {"ee_teil": part})
    set_props(holder, {"ee_hoehe": rex.get("height"), "ee_level": json.dumps(rex.get("levels")), "ee_statistik": json.dumps(rex.get("stats"))})
    st.asset(col, "Map/Riesenbaum", "Der Riesenbaum (Flechtenbaum, Welt 01) mit Stamm, Ästen, Kuppelkrone, Punkten, Motiven, Sternnadeln und Blüten", ("Map", "Riesenbaum"))


def _dome_material():
    name = "Riesenbaum · Kuppeln"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    from .nodes import NT, new_material

    mat = new_material(name)
    t = NT(mat.node_tree)
    fam_a = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_domefam_x").outputs["Fac"]
    fam_b = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_domefam_y").outputs["Fac"]
    fam_m = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_domefam_z").outputs["Fac"]
    ba = t.node("ShaderNodeGroup")
    ba.node_tree = earle.band_group()
    ba.inputs["Stufen"].default_value = 3.0
    ba.inputs["Terminator"].default_value = 0.1
    t.link(fam_a, ba.inputs["Zeile"])
    bb = t.node("ShaderNodeGroup")
    bb.node_tree = earle.band_group()
    bb.inputs["Stufen"].default_value = 3.0
    bb.inputs["Terminator"].default_value = 0.1
    t.link(fam_b, bb.inputs["Zeile"])
    col = t.mix(fam_m, ba.outputs["Farbe"], bb.outputs["Farbe"])
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba("#3a3f8a")
    return mat


def _bark_material(bark_row):
    """Flechtenstamm: Bänder der Rindenpalette entlang der Stammhöhe, feine helle Haarlinien."""
    name = "Riesenbaum · Rinde"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    from .nodes import NT, new_material

    mat = new_material(name)
    t = NT(mat.node_tree)
    bark = t.node("ShaderNodeAttribute", attribute_type="GEOMETRY", attribute_name="ee_bark")
    u, v, _ = t.sep(bark.outputs["Vector"])
    lg = t.node("ShaderNodeGroup")
    from . import materials

    lg.node_tree = materials.light_group()
    band = t.math("FLOOR", t.mul(t.math("FRACT", t.add(t.mul(v, 1.4), t.mul(u, 0.15))), 4.0))
    idx = t.add(1.0, t.mul(band, t.gt(lg.outputs["Licht"], 0.03)))
    pal = t.node("ShaderNodeGroup")
    pal.node_tree = earle.palette_group()
    pal.inputs["Zeile"].default_value = float(bark_row)
    t.link(idx, pal.inputs["Stufe"])
    hair = t.gt(t.math("FRACT", t.mul(u, 12.0)), 0.96)
    edge = t.node("ShaderNodeGroup")
    edge.node_tree = earle.palette_group()
    edge.inputs["Zeile"].default_value = float(bark_row)
    edge.inputs["Stufe"].default_value = 5.0
    col = t.mix(t.mul(hair, 0.8), pal.outputs["Farbe"], edge.outputs["Farbe"])
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba("#114a86")
    return mat


def _hero_billboard_material(part, rows):
    from . import materials

    if part == "blossoms":
        return materials.ramp_material("Riesenbaum · Blüten", ["#bb2023", "#da603e", "#e5f3e3"], (0.1, 0.5))
    if part == "stars":
        return materials.ramp_material("Riesenbaum · Sternnadeln", ["#2a1e0c", "#77592a", "#9c7a3e"], (0.1, 0.5))
    if part == "glyphs":
        return materials.ramp_material("Riesenbaum · Motive", ["#c8322e", "#e2d84a", "#f4f4ef"], (0.1, 0.6))
    return materials.ramp_material("Riesenbaum · Punkte", ["#4f7de0", "#a9c8ff", "#f4f4ef"], (0.1, 0.6))
