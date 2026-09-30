"""
Earle-Materialien der Map: der Palettenatlas des Spiels als Bild (8 Stufen × Zeilen, nächster Nachbar) und
die gebänderte Schattierung wie im EarleMaterial — Tinte im Schatten, 3–5 Lichtstufen aus der Palettenzeile,
Farbe = Palettenfarbe (Emission). Zeilen kommen je Welt aus den Materialien (Terrain) oder je Instanz aus den
Attributen `ee_row` / `ee_accent` / `ee_row2` (Vegetation, Requisiten), wie die Instanzattribute im Spiel.
Dazu die Geometry-Nodes-Bausteine für Instanzen, Punkte und Glyphen.
"""
import bpy
import numpy as np

from . import materials
from .nodes import NT, group_socket, new_group, new_material, set_blend
from .util import hex_to_rgba

ATLAS_W = 8
# Zeilen des Palettenatlas: die Ebene (ADR 0002) belegt Welt-Slots zu je 32 Zeilen (PLANET_ATLAS_HEIGHT 1024)
ATLAS_H = 1024
_cache = {}


def palette_image(rows):
    """Palettenatlas als eingebettetes Bild (Zeile r = Pixelzeile r von unten, sRGB)."""
    name = "EE · Palettenatlas"
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, ATLAS_W, ATLAS_H, alpha=True)
    px = np.zeros((ATLAS_H, ATLAS_W, 4), dtype=np.float32)
    for r in rows:
        i = r["index"]
        if i >= ATLAS_H:
            continue
        for x, (hx, a) in enumerate(zip(r["colors"], r["alphas"])):
            h = hx.lstrip("#")
            px[i, x] = (int(h[0:2], 16) / 255, int(h[2:4], 16) / 255, int(h[4:6], 16) / 255, a)
    img.pixels.foreach_set(px.ravel())
    img.pack()
    img["ee_zeilen"] = "\n".join(f"{r['index']:3d}  {r['name']}" for r in rows)
    _cache["image"] = img
    return img


def palette_group():
    """EE · Palette: Farbe der Stufe x in Zeile r des Palettenatlas (wie `lookup.pal(x, row)` im Spiel)."""
    if "pal" in _cache:
        return _cache["pal"]
    ng = new_group("EE · Palette")
    group_socket(ng, "Zeile", "INPUT", "NodeSocketFloat", 0.0)
    group_socket(ng, "Stufe", "INPUT", "NodeSocketFloat", 0.0)
    group_socket(ng, "Farbe", "OUTPUT", "NodeSocketColor")
    t = NT(ng)
    gi = t.node("NodeGroupInput", loc=(-600, 0))
    go = t.node("NodeGroupOutput", loc=(400, 0))
    u = t.math("DIVIDE", t.add(t.math("FLOOR", t.add(gi.outputs["Stufe"], 0.01)), 0.5), float(ATLAS_W))
    v = t.math("DIVIDE", t.add(t.math("FLOOR", t.add(gi.outputs["Zeile"], 0.01)), 0.5), float(ATLAS_H))
    tex = t.node("ShaderNodeTexImage", interpolation="Closest", extension="EXTEND", loc=(200, 0))
    tex.image = _cache.get("image")
    t.link(t.xyz(u, v, 0.0), tex.inputs["Vector"])
    t.link(tex.outputs["Color"], go.inputs["Farbe"])
    _cache["pal"] = ng
    return ng


def band_group():
    """EE · Earle-Band: Tinte (Stufe 0) im Schatten, sonst Lichtstufen 1..n der Zeile nach Sonnenlicht + Anhebung."""
    if "band" in _cache:
        return _cache["band"]
    ng = new_group("EE · Earle-Band")
    group_socket(ng, "Zeile", "INPUT", "NodeSocketFloat", 0.0)
    group_socket(ng, "Stufen", "INPUT", "NodeSocketFloat", 4.0, 1.0, 7.0, "Zahl der Lichtstufen nach der Tinte")
    group_socket(ng, "Anhebung", "INPUT", "NodeSocketFloat", 0.0, -1.0, 1.0, "Hellt Hügelkuppen / Kronen auf (Höhe)")
    group_socket(ng, "Terminator", "INPUT", "NodeSocketFloat", 0.03, -1.0, 1.0, "Ab welchem Licht die Tinte endet")
    group_socket(ng, "Farbe", "OUTPUT", "NodeSocketColor")
    group_socket(ng, "Licht", "OUTPUT", "NodeSocketFloat")
    t = NT(ng)
    gi = t.node("NodeGroupInput", loc=(-800, 0))
    go = t.node("NodeGroupOutput", loc=(800, 0))
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = materials.light_group()
    L = lg.outputs["Licht"]
    lit = t.gt(L, gi.outputs["Terminator"])
    k = t.math("MINIMUM", t.math("MAXIMUM", t.add(L, gi.outputs["Anhebung"]), 0.0), 0.999)
    idx = t.add(1.0, t.math("FLOOR", t.mul(k, gi.outputs["Stufen"])))
    idx = t.mul(idx, lit)
    pal = t.node("ShaderNodeGroup")
    pal.node_tree = palette_group()
    t.link(gi.outputs["Zeile"], pal.inputs["Zeile"])
    t.link(idx, pal.inputs["Stufe"])
    t.link(pal.outputs["Farbe"], go.inputs["Farbe"])
    t.link(L, go.inputs["Licht"])
    _cache["band"] = ng
    return ng


def _emit(t, col, alpha=None):
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    if alpha is None:
        t.link(emis.outputs[0], out.inputs["Surface"])
    else:
        tr = t.node("ShaderNodeBsdfTransparent")
        mx = t.node("ShaderNodeMixShader")
        t.link(alpha, mx.inputs[0])
        t.link(tr.outputs[0], mx.inputs[1])
        t.link(emis.outputs[0], mx.inputs[2])
        t.link(mx.outputs[0], out.inputs["Surface"])


def _attr(t, name, kind="INSTANCER"):
    return t.node("ShaderNodeAttribute", attribute_type=kind, attribute_name=name).outputs["Fac"]


def terrain_material(name, row, bands=5, preview_hex="#808080"):
    mat = new_material(name)
    t = NT(mat.node_tree)
    b = t.node("ShaderNodeGroup")
    b.node_tree = band_group()
    b.inputs["Zeile"].default_value = float(row)
    b.inputs["Stufen"].default_value = float(bands)
    h = _attr(t, "ee_height", "GEOMETRY")
    t.link(t.mul(h, 0.18), b.inputs["Anhebung"])
    col = b.outputs["Farbe"]
    # Zonen-Risse: dunkle Spalten an den Grenzen (Abstand < 0.3 Welteinheiten)
    border = _attr(t, "ee_border", "GEOMETRY")
    crack = t.lt(border, 0.28)
    pal = t.node("ShaderNodeGroup")
    pal.node_tree = palette_group()
    pal.inputs["Zeile"].default_value = float(row)
    pal.inputs["Stufe"].default_value = 0.0
    col = t.mix(crack, col, pal.outputs["Farbe"])
    _emit(t, col)
    mat.diffuse_color = hex_to_rgba(preview_hex)
    mat["ee_zeile"] = int(row)
    return mat


def instance_material(name, kind, preview_hex="#6a7a50"):
    """Gemeinsames Material einer Instanzsorte (Zeilen aus den Instanzattributen)."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    row = _attr(t, "ee_row")
    b = t.node("ShaderNodeGroup")
    b.node_tree = band_group()
    t.link(row, b.inputs["Zeile"])
    col = b.outputs["Farbe"]
    alpha = None
    if kind == "krone":
        b.inputs["Stufen"].default_value = 2.0
        # Juwelenkuppeln (Welt 10) leuchten fast rundum in ihren Juwelentönen
        jewel = _attr(t, "ee_jewel")
        t.link(t.mul(jewel, -0.5), b.inputs["Terminator"])
    elif kind == "stamm":
        acc = _attr(t, "ee_accent")
        style = _attr(t, "ee_style")
        pal = lambda r, x: _pal(t, r, x)  # noqa: E731
        ink = pal(row, 0.0)
        white = pal(acc, 0.0)
        uv = t.node("ShaderNodeUVMap")
        u, v, _ = t.sep(uv.outputs["UV"])
        stripe = t.gt(t.math("FRACT", t.mul(u, 4.0)), 0.5)
        striped = t.mix(stripe, ink, pal(acc, 1.0))
        band = t.gt(t.math("FRACT", t.mul(v, 6.0)), 0.55)
        lichen = t.mix(band, ink, pal(acc, 1.0))
        col = ink
        col = t.mix(t.eq(style, 1.0), col, white)
        col = t.mix(t.eq(style, 2.0), col, striped)
        col = t.mix(t.eq(style, 3.0), col, lichen)
    elif kind == "kahl":
        col = _pal(t, row, 3.0)
    elif kind == "tier":
        col = _pal(t, row, 0.0)
    elif kind == "becken":
        row2 = _attr(t, "ee_row2")
        ink = t.mix(0.25, _pal(t, row, 0.0), t.rgb((0, 0, 0, 1)))
        tc = t.node("ShaderNodeTexCoord")
        x, y, z = t.sep(tc.outputs["Object"])
        refl = t.gt(t.math("FRACT", t.add(t.mul(y, 1.6), t.mul(x, 0.35))), 0.82)
        col = t.mix(refl, ink, _pal(t, row2, 7.0))
    elif kind == "requisit":
        b.inputs["Stufen"].default_value = 3.0
        typ = _attr(t, "ee_type")
        row2 = _attr(t, "ee_row2")
        # Scheunendach (Normale nach oben) in der zweiten Zeile, immer im Licht
        geo = t.node("ShaderNodeNewGeometry")
        nx, ny, nz = t.sep(geo.outputs["Normal"])
        roof = t.mul(t.eq(typ, 6.0), t.gt(nz, 0.3))
        col = t.mix(roof, col, _pal(t, row2, 4.0))
        # Monolith: helle Zickzack-Glyphenbänder; Rohr: Akzentfarbe
        tc = t.node("ShaderNodeTexCoord")
        ox, oy, oz = t.sep(tc.outputs["Object"])
        glyph = t.mul(t.eq(typ, 2.0), t.gt(t.math("FRACT", t.add(t.mul(oz, 7.0), t.mul(t.math("ABSOLUTE", t.sub(t.math("FRACT", t.mul(t.add(ox, oy), 6.0)), 0.5)), 0.8))), 0.8))
        col = t.mix(glyph, col, _pal(t, row, 3.0))
        col = t.mix(t.eq(typ, 5.0), col, _pal(t, row2, 1.0))
    elif kind == "punkte":
        pk = _attr(t, "ee_kind", "GEOMETRY")
        prow = _attr(t, "ee_row", "GEOMETRY")
        lg = t.node("ShaderNodeGroup")
        lg.node_tree = materials.light_group()
        lit_idx = t.add(4.0, t.gt(lg.outputs["Licht"], 0.4))
        idx = t.mixf(t.eq(pk, 1.0), lit_idx, 6.0)
        idx = t.mixf(t.eq(pk, 2.0), idx, 7.0)
        pal = t.node("ShaderNodeGroup")
        pal.node_tree = palette_group()
        t.link(prow, pal.inputs["Zeile"])
        t.link(idx, pal.inputs["Stufe"])
        col = pal.outputs["Farbe"]
    _emit(t, col, alpha)
    mat.diffuse_color = hex_to_rgba(preview_hex)
    set_blend(mat, False)
    return mat


def _pal(t, row, x):
    p = t.node("ShaderNodeGroup")
    p.node_tree = palette_group()
    t.feed(p.inputs["Zeile"], row)
    t.feed(p.inputs["Stufe"], x)
    return p.outputs["Farbe"]


def row_material(name, row, x, preview_hex="#888888", banded=False):
    """Feste Palettenfarbe (Zeile, Stufe), optional mit Lichtbändern der Zeile."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    if banded:
        b = t.node("ShaderNodeGroup")
        b.node_tree = band_group()
        b.inputs["Zeile"].default_value = float(row)
        b.inputs["Stufen"].default_value = 3.0
        col = b.outputs["Farbe"]
    else:
        col = _pal(t, float(row), float(x))
    _emit(t, col)
    mat.diffuse_color = hex_to_rgba(preview_hex)
    return mat


# --- Geometry Nodes ---------------------------------------------------------------------------------------


def _gn_io(ng, inputs):
    group_socket(ng, "Geometry", "INPUT", "NodeSocketGeometry")
    for name, stype, default in inputs:
        group_socket(ng, name, "INPUT", stype, default)
    group_socket(ng, "Geometry", "OUTPUT", "NodeSocketGeometry")


def gn_instances():
    """EE · Instanzen: Vorlage (Objekt) auf die Punkte, Drehung ee_rot (Quaternion), Größe ee_scale — Instanzattribute bleiben erhalten."""
    if "gn_inst" in _cache:
        return _cache["gn_inst"]
    ng = new_group("EE · Instanzen", "GeometryNodeTree")
    _gn_io(ng, [("Vorlage", "NodeSocketObject", None)])
    t = NT(ng)
    gi = t.node("NodeGroupInput", loc=(-600, 0))
    go = t.node("NodeGroupOutput", loc=(600, 0))
    oi = t.node("GeometryNodeObjectInfo", loc=(-300, -200))
    oi.transform_space = "ORIGINAL"
    t.link(gi.outputs["Vorlage"], oi.inputs["Object"])
    rot = t.node("GeometryNodeInputNamedAttribute", loc=(-300, -400))
    rot.data_type = "QUATERNION"
    rot.inputs["Name"].default_value = "ee_rot"
    scl = t.node("GeometryNodeInputNamedAttribute", loc=(-300, -550))
    scl.data_type = "FLOAT_VECTOR"
    scl.inputs["Name"].default_value = "ee_scale"
    iop = t.node("GeometryNodeInstanceOnPoints", loc=(100, 0))
    t.link(gi.outputs["Geometry"], iop.inputs["Points"])
    t.link(oi.outputs["Geometry"], iop.inputs["Instance"])
    t.link(rot.outputs["Attribute"], iop.inputs["Rotation"])
    t.link(scl.outputs["Attribute"], iop.inputs["Scale"])
    t.link(iop.outputs["Instances"], go.inputs["Geometry"])
    _cache["gn_inst"] = ng
    return ng


def gn_points():
    """EE · Punkte: Vertices → Punktwolke (Kugeln) mit Radius ee_size × Faktor, Material."""
    if "gn_pts" in _cache:
        return _cache["gn_pts"]
    ng = new_group("EE · Punkte", "GeometryNodeTree")
    _gn_io(ng, [("Radius-Faktor", "NodeSocketFloat", 1.0), ("Material", "NodeSocketMaterial", None)])
    t = NT(ng)
    gi = t.node("NodeGroupInput", loc=(-600, 0))
    go = t.node("NodeGroupOutput", loc=(600, 0))
    size = t.node("GeometryNodeInputNamedAttribute", loc=(-400, -200))
    size.data_type = "FLOAT"
    size.inputs["Name"].default_value = "ee_size"
    rad = t.node("ShaderNodeMath", operation="MULTIPLY", loc=(-200, -200))
    t.link(size.outputs["Attribute"], rad.inputs[0])
    t.link(gi.outputs["Radius-Faktor"], rad.inputs[1])
    m2p = t.node("GeometryNodeMeshToPoints", loc=(0, 0))
    t.link(gi.outputs["Geometry"], m2p.inputs["Mesh"])
    t.link(rad.outputs[0], m2p.inputs["Radius"])
    sm = t.node("GeometryNodeSetMaterial", loc=(300, 0))
    t.link(m2p.outputs["Points"], sm.inputs["Geometry"])
    t.link(gi.outputs["Material"], sm.inputs["Material"])
    t.link(sm.outputs["Geometry"], go.inputs["Geometry"])
    _cache["gn_pts"] = ng
    return ng


def gn_glyphs():
    """EE · Glyphen: flache Vorlage (XY-Ebene) je Punkt, zur Normalen ee_normal gedreht, Größe ee_size × Faktor."""
    if "gn_gly" in _cache:
        return _cache["gn_gly"]
    ng = new_group("EE · Glyphen", "GeometryNodeTree")
    _gn_io(ng, [("Vorlage", "NodeSocketObject", None), ("Größe", "NodeSocketFloat", 1.0)])
    t = NT(ng)
    gi = t.node("NodeGroupInput", loc=(-700, 0))
    go = t.node("NodeGroupOutput", loc=(700, 0))
    oi = t.node("GeometryNodeObjectInfo", loc=(-300, -250))
    oi.transform_space = "ORIGINAL"
    t.link(gi.outputs["Vorlage"], oi.inputs["Object"])
    nrm = t.node("GeometryNodeInputNamedAttribute", loc=(-500, -450))
    nrm.data_type = "FLOAT_VECTOR"
    nrm.inputs["Name"].default_value = "ee_normal"
    align = t.node("FunctionNodeAlignRotationToVector", loc=(-250, -450))
    align.axis = "Z"
    t.link(nrm.outputs["Attribute"], align.inputs["Vector"])
    size = t.node("GeometryNodeInputNamedAttribute", loc=(-500, -650))
    size.data_type = "FLOAT"
    size.inputs["Name"].default_value = "ee_size"
    sc = t.node("ShaderNodeMath", operation="MULTIPLY", loc=(-250, -650))
    t.link(size.outputs["Attribute"], sc.inputs[0])
    t.link(gi.outputs["Größe"], sc.inputs[1])
    iop = t.node("GeometryNodeInstanceOnPoints", loc=(100, 0))
    t.link(gi.outputs["Geometry"], iop.inputs["Points"])
    t.link(oi.outputs["Geometry"], iop.inputs["Instance"])
    t.link(align.outputs["Rotation"], iop.inputs["Rotation"])
    t.link(sc.outputs[0], iop.inputs["Scale"])
    t.link(iop.outputs["Instances"], go.inputs["Geometry"])
    _cache["gn_gly"] = ng
    return ng


def set_modifier_inputs(mod, values):
    """GN-Modifier-Eingänge nach Namen setzen."""
    ng = mod.node_group
    for item in ng.interface.items_tree:
        if getattr(item, "item_type", "") == "SOCKET" and item.in_out == "INPUT" and item.name in values:
            mod[item.identifier] = values[item.name]


def reset_cache():
    _cache.clear()
