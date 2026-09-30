"""
Spielfeld: die „Elemente-Schau“ des Grid-Labs — Plateau (Wiese, gestufter Rand, Tintenschatten), Steinplatten
(Stein, verdorrt, tief verdorrt, Öl) und jedes Element als Instanzen der neun Grundformen mit seiner Farbe.
"""
import os

import bpy
import numpy as np

from . import materials
from .glb import Glb, g2b_array, mat_g2b
from .map import _instances_object, _mesh_from_prims
from .nodes import NT, new_material
from .util import collection, hex_to_rgba, link, make_mesh, set_props


def _plateau_material(pal):
    mat = new_material("Spielfeld · Plateau")
    t = NT(mat.node_tree)
    band = t.node("ShaderNodeAttribute", attribute_type="GEOMETRY", attribute_name="ee_band").outputs["Fac"]
    slab = t.node("ShaderNodeAttribute", attribute_type="GEOMETRY", attribute_name="ee_slab").outputs["Fac"]
    skirt = pal.get("skirt", [pal["top"]] * 4)
    col = t.rgb(hex_to_rgba(pal["top"]))
    for i, c in enumerate(skirt[:4]):
        col = t.mix(t.gt(band, i + 0.5), col, t.rgb(hex_to_rgba(c)))
    col = t.mix(t.gt(band, 4.5), col, t.rgb(hex_to_rgba(pal["ink"])))
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = materials.light_group()
    col = t.mix(t.lt(lg.outputs["Licht"], 0.03), col, t.rgb(hex_to_rgba(pal.get("plateauShade", pal["ink"]))))
    col = t.mix(t.gt(slab, 0.5), col, t.rgb(hex_to_rgba(pal["ink"])))
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba(pal["top"])
    return mat


def _plate_material(pal):
    mat = new_material("Spielfeld · Platte")
    t = NT(mat.node_tree)
    kind = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_kind").outputs["Fac"]
    heal = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_heal").outputs["Fac"]
    stone = t.rgb(hex_to_rgba(pal["plate"]))
    soil = t.mix(heal, t.rgb(hex_to_rgba(pal["soil"])), t.rgb(hex_to_rgba(pal["healed"])))
    deep = t.mix(heal, t.rgb(hex_to_rgba(pal["soilDeep"])), t.rgb(hex_to_rgba(pal["healed"])))
    oil = t.rgb(hex_to_rgba(pal["oil"]))
    vor = t.node("ShaderNodeTexVoronoi", voronoi_dimensions="3D", feature="DISTANCE_TO_EDGE")
    vor.inputs["Scale"].default_value = 5.0
    crack = t.lt(vor.outputs["Distance"], 0.05)
    soil = t.mix(crack, soil, t.rgb(hex_to_rgba(pal["crack"])))
    col = stone
    col = t.mix(t.eq(kind, 1.0), col, soil)
    col = t.mix(t.eq(kind, 2.0), col, deep)
    col = t.mix(t.eq(kind, 3.0), col, oil)
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = materials.light_group()
    col = t.mix(t.lt(lg.outputs["Licht"], 0.03), col, t.mix(0.64, col, t.rgb(hex_to_rgba(pal["ink"]))))
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba(pal["plate"])
    return mat


def _element_material(pal):
    """Element-Requisiten: Farbe je Instanz (ee_r/g/b aus dem Spiel), zwei Lichtstufen, Schatten mit Tinte."""
    mat = new_material("Spielfeld · Element")
    t = NT(mat.node_tree)
    r = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_r").outputs["Fac"]
    g = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_g").outputs["Fac"]
    b = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_b").outputs["Fac"]
    c = t.node("ShaderNodeCombineColor")
    t.link(r, c.inputs[0])
    t.link(g, c.inputs[1])
    t.link(b, c.inputs[2])
    # Ohne Instanz (die Grundform selbst): neutrales Grau statt Schwarz
    has = t.gt(t.add(t.add(r, g), b), 1e-4)
    base = t.mix(has, t.rgb(hex_to_rgba("#b3bb6d")), c.outputs[0])
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = materials.light_group()
    col = t.mix(t.lt(lg.outputs["Licht"], 0.03), base, t.mix(0.6, base, t.rgb(hex_to_rgba(pal["ink"]))))
    glow = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name="ee_glow").outputs["Fac"]
    col = t.mix(t.mul(glow, 0.5), col, base)
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba(pal.get("rust", "#c8542a"))
    return mat


def build_spielfeld(st):
    path = os.path.join(st.export, "spielfeld", "elemente-schau.glb")
    if not os.path.exists(path):
        st.report.append("Spielfeld: kein Export")
        return
    g = Glb(path)
    root = g.root_nodes()[0]
    meta = root.get("extras", {})
    pal = meta.get("palette", {})
    top = st.top("Spielfeld")
    base_col = collection("Spielfeld · Plateau und Platten", top)
    fam_col = collection("Spielfeld · Grundformen", top)
    el_col = collection("Spielfeld · Elemente", top)
    set_props(top, {"ee_level": meta.get("level"), "ee_level_name": meta.get("levelName"), "ee_zone": meta.get("zone")})
    templates = {}
    plate_mat = _plate_material(pal)
    elem_mat = _element_material(pal)
    for ni in root.get("children", []):
        node = g.nodes[ni]
        name = node["name"]
        if name == "Plateau":
            prim = g.mesh_primitives(node["mesh"])[0]
            me = make_mesh("Plateau", g2b_array(prim["positions"]), prim["indices"].reshape(-1, 3), smooth=False)
            for key, an in (("_BAND", "ee_band"), ("_SLAB", "ee_slab"), ("_STRIATE", "ee_striate")):
                if key in prim["attributes"]:
                    a = me.attributes.new(an, "FLOAT", "POINT")
                    a.data.foreach_set("value", np.ascontiguousarray(np.asarray(prim["attributes"][key], dtype=np.float32)))
            me.materials.append(_plateau_material(pal))
            o = bpy.data.objects.new("Plateau", me)
            link(o, base_col)
            o.matrix_world = mat_g2b(g.node_matrix(node))
            st.asset(o, "Spielfeld", "Plateau: flacher Hügel mit gestuftem Rand und Tintenschatten (Größe der Elemente-Schau)", ("Spielfeld",))
        elif name == "Platten":
            me, _ = _mesh_from_prims("Platte", g, node["mesh"])
            me.materials.append(plate_mat)
            tmpl = bpy.data.objects.new("Vorlage · Platte", me)
            link(tmpl, fam_col)
            tmpl.location = (8, 0, 0)
            o = _instances_object("Platten", g, node, tmpl, base_col, "platte")
            st.asset(tmpl, "Spielfeld", "Steinplatte (Einheitswürfel; Art je Instanz: Stein, verdorrt, tief verdorrt, Öl)", ("Spielfeld",))
        elif name == "Grundformen":
            for k, fi in enumerate(node.get("children", [])):
                fnode = g.nodes[fi]
                fam = fnode.get("extras", {}).get("family", fnode["name"])
                me, _ = _mesh_from_prims(f"Grundform · {fam}", g, fnode["mesh"])
                me.materials.append(elem_mat)
                o = bpy.data.objects.new(f"Grundform · {fam}", me)
                link(o, fam_col)
                o.location = (8 + (k % 3) * 1.4, 1.6 + (k // 3) * 1.4, 0)
                templates[fam] = o
                set_props(o, {"ee_grundform": fam})
                st.asset(o, "Spielfeld/Grundformen", f"Grundform {fam} (Einheitsgröße; Element-Requisiten sind Instanzen davon)", ("Spielfeld", fam))
        elif name == "Elemente":
            for ei in node.get("children", []):
                enode = g.nodes[ei]
                e = enode.get("extras", {})
                ecol = collection(f"Element · {e.get('label', enode['name'])}", el_col)
                set_props(ecol, {"ee_element": e.get("element"), "ee_farbe": e.get("color")})
                for si in enode.get("children", []):
                    snode = g.nodes[si]
                    fam = snode.get("extras", {}).get("family")
                    tmpl = templates.get(fam)
                    if tmpl is None:
                        continue
                    _instances_object(snode["name"], g, snode, tmpl, ecol, "element")
                st.asset(ecol, "Spielfeld/Elemente", f"Element {e.get('label')} (wie in der Elemente-Schau aufgestellt)", ("Spielfeld", e.get("element", "")))
    st.report.append(f"Spielfeld: {len(templates)} Grundformen")
