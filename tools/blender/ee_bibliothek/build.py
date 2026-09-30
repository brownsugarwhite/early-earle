"""Ablauf des Bibliotheks-Baus: Datei leeren, Abschnitte bauen, Szenen, Katalog, Vorschauen, LIESMICH, speichern."""
import json
import math
import os
import sys
import time
import traceback

import bpy
from mathutils import Vector

from . import katalog, liesmich, szenen, vorschau
from . import map as map_mod
from . import module as module_mod
from . import paletten as paletten_mod
from . import rex as rex_mod
from . import spielfeld as spielfeld_mod
from . import wesen as wesen_mod
from .util import collection, link

SECTION_ORDER = ["module", "wesen", "rex", "map", "spielfeld", "paletten", "vorlage"]
TOOLS_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def reset_file():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.collections, bpy.data.armatures, bpy.data.node_groups, bpy.data.images, bpy.data.curves, bpy.data.texts, bpy.data.worlds):
        for d in list(coll):
            coll.remove(d)
    scene = bpy.context.scene
    scene.name = "Wesen"
    return scene


def load_manifest(export_dir):
    p = os.path.join(export_dir, "manifest.json")
    if not os.path.exists(p):
        raise FileNotFoundError(f"{p} fehlt — zuerst `node tools/export3d/run.mjs` ausführen")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def load_ee_wesen():
    """Das Add-on (tools/blender/ee_wesen.py) als Modul — Quelle der Vorschau- und Export-Logik."""
    if TOOLS_DIR not in sys.path:
        sys.path.insert(0, TOOLS_DIR)
    import ee_wesen  # noqa: E402

    return ee_wesen


class BuildState:
    def __init__(self, args, manifest):
        self.args = args
        self.manifest = manifest
        self.export = args["export"]
        self.scene = bpy.context.scene
        self.view_layer = bpy.context.view_layer
        self.sections = {}  # Abschnitt → oberste Collection
        self.module_cols = {}
        self.creatures = []  # (collection, armature, meta)
        self.assets = []  # (id-Block, Katalogpfad, Beschreibung, Tags)
        self.report = []
        self.map_info = None
        self.template = None

    def wants(self, section):
        only = self.args.get("only")
        return only is None or section in only

    def top(self, name):
        col = collection(name, self.scene.collection)
        self.sections[name] = col
        return col

    def asset(self, idblock, catalog, description="", tags=()):
        self.assets.append((idblock, catalog, description, tuple(t for t in tags if t)))


def build_modules(st):
    col = st.top("Module")
    st.module_cols = module_mod.build_modules(st.export, col)
    for mid, mc in st.module_cols.items():
        slot = mc.get("ee_slot", "")
        st.asset(mc, f"Module/{module_mod.SLOT_LABEL.get(slot, slot)}", f"Modul {mid} ({slot}){' — prozedural im Spiel' if mc.get('ee_prozedural') else ''}", (slot, "Modul"))
    st.report.append(f"Module: {len(st.module_cols)}")


def _label(text, col, loc, size, mat, align="LEFT"):
    cu = bpy.data.curves.new(text, "FONT")
    cu.body = text
    cu.size = size
    cu.align_x = align
    cu.materials.append(mat)
    o = bpy.data.objects.new(f"Beschriftung · {text}", cu)
    link(o, col)
    o.location = loc
    o.rotation_euler = (math.radians(60), 0, 0)
    return o


GAP_X = 0.9  # Abstand zwischen zwei Wesen einer Reihe
GAP_Y = 1.1  # Abstand zwischen zwei Reihen (zusätzlich zur Beschriftungszeile)
LABEL_LINE = 0.9  # Platz für „Stufe N“ vor der Reihe


def build_wesen(st):
    """Je Gruppe (Art / Blob-Linie / Eigene Wesen) eine Reihe, Stufen nebeneinander. Ausgelegt wird nach den
    echten Grenzen (Körper + Module), damit sich nichts überlappt; alle Wesen einer Reihe stehen auf einer Linie."""
    from . import materials

    folder = os.path.join(st.export, "wesen")
    entries = (st.manifest.get("sections") or {}).get("wesen") or []
    if not entries or not os.path.isdir(folder):
        st.report.append("Wesen: kein Export")
        return
    top = st.top("Wesen")
    labels = collection("Wesen · Beschriftung", top)
    label_mat = materials.flat_material("Beschriftung", "#f7f6d8", banded=False)
    groups = []
    for e in entries:
        if e["group"] not in groups:
            groups.append(e["group"])
    y = 0.0
    for group in groups:
        items = [e for e in entries if e["group"] == group]
        gcol = collection(f"Wesen · {group}", top)
        x = 0.0
        row = []  # (armature, min, max, meta, Mitte x)
        for e in items:
            path = os.path.join(st.export, e["file"])
            try:
                col, ao, meta = wesen_mod.build_creature(path, gcol, Vector((0.0, 0.0, 0.0)), st.module_cols, st.view_layer)
            except Exception as ex:  # ein kaputtes Wesen hält den Bau nicht auf
                st.report.append(f"! Wesen {e['id']}: {ex}")
                traceback.print_exc()
                continue
            ao.location = (0.0, 0.0, float(meta.get("restLift", 0.0)))
            st.view_layer.update()
            mn, mx = szenen.bounds_of(col)
            ao.location.x += x - mn.x
            row.append((ao, mn, mx, meta, x + (mx.x - mn.x) / 2))
            x += (mx.x - mn.x) + GAP_X
            st.creatures.append((col, ao, meta))
            cat = "Wesen/Eigene Wesen" if meta.get("custom") else f"Wesen/{group}"
            desc = f"{meta.get('label')} — {meta.get('bodyTypeLabel', '')}, Material {meta.get('material')}, Fell {(meta.get('skin') or {}).get('coatLabel', '')}, Muster {(meta.get('skin') or {}).get('patternLabel', '')}"
            st.asset(col, cat, desc, (meta.get("species", ""), f"Stufe {meta.get('tier')}", meta.get("zone", "")))
        if not row:
            continue
        back = max(r[2].y for r in row)
        front = min(r[1].y for r in row)
        dy = y - back
        for ao, _mn, _mx, meta, cx in row:
            ao.location.y += dy
            _label(f"Stufe {meta.get('tier')}", labels, (cx, front + dy - 0.6, 0), 0.36, label_mat, "CENTER")
        _label(group, labels, (-1.0, y - (back - front) / 2 - 0.3, 0), 0.9, label_mat, "RIGHT")
        y = front + dy - LABEL_LINE - GAP_Y
    st.view_layer.update()
    st.report.append(f"Wesen: {len(st.creatures)}")


def build_rex(st):
    path = os.path.join(st.export, "rex", "rex.glb")
    if not os.path.exists(path):
        st.report.append("REX: kein Export")
        return
    top = st.top("REX")
    col, ao = rex_mod.build_rex(path, top, st.view_layer)
    st.asset(col, "REX", "REX, der Guide-Dino (illudiy-Logo): gehäutetes Mesh, 22 Knochen, Logo-Palette; Zubehör über Knochenskala versteckt", ("REX", "Figur"))
    st.report.append("REX: 1 Rig (+ Zubehör-Variante)")


def build_map(st):
    map_mod.build_map(st)


def build_spielfeld(st):
    spielfeld_mod.build_spielfeld(st)


def build_paletten(st):
    paletten_mod.build_paletten(st)


def build_vorlage(st):
    """Eigenes Wesen: Vorlage (aus dem Retriever der Stufe 6) + Boden + das Add-on als Textblock."""
    ee_wesen = load_ee_wesen()
    top = st.top("Eigenes Wesen")
    meta = next((m for _, _, m in st.creatures if m.get("id") == "retriever-t06"), None)
    if meta is None:
        meta = next((m for _, _, m in st.creatures if m.get("bodyType") == "quadruped"), None)
    if meta is None:
        st.report.append("Vorlage: kein Vierbeiner im Export — übersprungen")
        return
    col, root = wesen_mod.build_template(meta, top, st.module_cols, st.view_layer, ee_wesen)
    import bmesh

    from . import materials

    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, radius=4.0, segments=64)
    me = bpy.data.meshes.new("Boden")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(materials.ramp_material("Boden · Wiese", ["#606e4f", "#9daa63", "#b3bb6d"], (0.03, 0.5)))
    ground = bpy.data.objects.new("Boden (Z = 0)", me)
    link(ground, top)
    st.template = (col, root)
    st.asset(col, "Eigenes Wesen", "Vorlage für ein eigenes Wesen: Kugeln (Rollen), Hüften, Sockel mit Modulen, Live-Vorschau — Export mit „early earle: Wesen exportieren“", ("Vorlage", "Eigenes Wesen"))
    st.report.append("Vorlage „Eigenes Wesen“: aus retriever-t06")


BUILDERS = {
    "module": build_modules,
    "wesen": build_wesen,
    "rex": build_rex,
    "map": build_map,
    "spielfeld": build_spielfeld,
    "paletten": build_paletten,
    "vorlage": build_vorlage,
}


def embed_addon(st):
    """ee_wesen.py als Textblock (Skript ausführen = Operatoren und Seitenleiste registrieren)."""
    path = os.path.join(TOOLS_DIR, "ee_wesen.py")
    if not os.path.exists(path):
        return
    txt = bpy.data.texts.new("ee_wesen.py")
    with open(path, encoding="utf-8") as f:
        txt.write(f.read())
    txt.use_module = True


def build_all(args):
    t0 = time.time()
    reset_file()
    manifest = load_manifest(args["export"])
    st = BuildState(args, manifest)
    for sec in SECTION_ORDER:
        fn = BUILDERS.get(sec)
        if fn is None or not st.wants(sec):
            continue
        ts = time.time()
        try:
            fn(st)
        except Exception as ex:
            st.report.append(f"! Abschnitt {sec} fehlgeschlagen: {ex}")
            traceback.print_exc()
        print(f"  {sec}: {time.time() - ts:.1f} s", flush=True)
    embed_addon(st)
    ts = time.time()
    try:
        szenen.setup_scenes(st)
    except Exception as ex:
        st.report.append(f"! Szenen: {ex}")
        traceback.print_exc()
    print(f"  szenen: {time.time() - ts:.1f} s", flush=True)
    out_dir = os.path.dirname(args["out"])
    os.makedirs(out_dir, exist_ok=True)
    katalog.apply(st, out_dir)
    if args.get("previews"):
        ts = time.time()
        try:
            n = vorschau.asset_previews(st)
            st.report.append(f"Vorschaubilder: {n}")
        except Exception as ex:
            st.report.append(f"! Vorschaubilder: {ex}")
            traceback.print_exc()
        print(f"  vorschau: {time.time() - ts:.1f} s", flush=True)
    liesmich.write(st)
    bpy.ops.wm.save_as_mainfile(filepath=args["out"], compress=True)
    st.report.append(f"gespeichert: {args['out']} ({os.path.getsize(args['out']) / 1e6:.1f} MB) in {time.time() - t0:.0f} s")
    if args.get("renders"):
        try:
            files = vorschau.progress_renders(st, args["renders"])
            st.report.append("Bilder: " + ", ".join(os.path.basename(f) for f in files))
        except Exception as ex:
            st.report.append(f"! Bilder: {ex}")
            traceback.print_exc()
    return st.report
