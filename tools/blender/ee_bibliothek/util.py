"""Kleine Helfer für den Bibliotheks-Bau: Collections, Meshes aus Arrays, Empties, Eigenschaften, Farben."""
import bpy
import numpy as np


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_rgba(hexstr, alpha=1.0):
    """sRGB-Hex → lineares RGBA (Blender-Farben)."""
    h = hexstr.lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b), alpha)


def collection(name, parent):
    """Kind-Collection holen oder anlegen (Namen sind global eindeutig in Blender)."""
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
    if parent is not None and col.name not in parent.children:
        parent.children.link(col)
    return col


def link(obj, col):
    if obj.name not in col.objects:
        col.objects.link(obj)
    return obj


def make_mesh(name, verts, faces, smooth=True):
    """Mesh aus (n,3)-Vertices und (m,3)-Dreiecken (numpy), schnell über foreach_set."""
    verts = np.ascontiguousarray(np.asarray(verts, dtype=np.float32).reshape(-1, 3))
    faces = np.ascontiguousarray(np.asarray(faces, dtype=np.int32).reshape(-1, 3))
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.ravel())
    if len(faces):
        me.loops.add(faces.size)
        me.loops.foreach_set("vertex_index", faces.ravel())
        me.polygons.add(len(faces))
        me.polygons.foreach_set("loop_start", np.arange(0, faces.size, 3, dtype=np.int32))
    me.update(calc_edges=True)
    me.validate(clean_customdata=False)
    if smooth and len(faces):
        me.shade_smooth()
    return me


def point_mesh(name, points):
    """Punktwolke als Mesh (nur Vertices) — Träger für Geometry-Nodes-Instanzen."""
    pts = np.ascontiguousarray(np.asarray(points, dtype=np.float32).reshape(-1, 3))
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(pts))
    me.vertices.foreach_set("co", pts.ravel())
    me.update()
    return me


def add_attribute(me, name, data, kind="FLOAT", domain="POINT"):
    """Attribut aus numpy-Daten (FLOAT, FLOAT_VECTOR, FLOAT_COLOR, INT)."""
    attr = me.attributes.get(name) or me.attributes.new(name, kind, domain)
    arr = np.ascontiguousarray(np.asarray(data, dtype=np.int32 if kind == "INT" else np.float32)).ravel()
    key = {"FLOAT": "value", "INT": "value", "FLOAT_VECTOR": "vector", "FLOAT_COLOR": "color"}[kind]
    attr.data.foreach_set(key, arr)
    return attr


def empty(name, col, display="PLAIN_AXES", size=0.2):
    o = bpy.data.objects.new(name, None)
    o.empty_display_type = display
    o.empty_display_size = size
    link(o, col)
    return o


def obj(name, data, col):
    o = bpy.data.objects.new(name, data)
    link(o, col)
    return o


def set_props(idblock, props):
    """Eigene Eigenschaften (IDs des Spiels) setzen; None wird übersprungen, Listen/Dicts als JSON-Text."""
    import json

    for k, v in props.items():
        if v is None:
            continue
        if isinstance(v, (dict, list, tuple)) and not (isinstance(v, (list, tuple)) and len(v) in (3, 4) and all(isinstance(x, (int, float)) for x in v)):
            v = json.dumps(v, ensure_ascii=False)
        idblock[k] = v


def hide_collection(view_layer, col, hide=True):
    """Collection im View-Layer ausblenden (Auge), bleibt aber im Outliner und in der Datei."""

    def find(lc):
        if lc.collection == col:
            return lc
        for c in lc.children:
            r = find(c)
            if r:
                return r
        return None

    lc = find(view_layer.layer_collection)
    if lc:
        lc.hide_viewport = hide
