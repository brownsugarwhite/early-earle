"""
Vorschaubilder: je Asset ein kleines EEVEE-Bild (Asset-Browser-Vorschau, transparent) und für docs/progress
große Übersichtsbilder je Szene plus eine Rig-Erklärung (Kugeln und Knochen der Giraffe).
"""
import os
import tempfile

import bmesh
import bpy
import numpy as np
from mathutils import Vector

from . import materials, szenen

PREVIEW_SIZE = 192
ROLE_COLORS = {"core": "#e8a33c", "rump": "#d9a54e", "body": "#c8b27a", "lobe": "#c8b27a", "head": "#e070a0", "face": "#f0a0c8", "jaw": "#b04a80", "neck": "#7ce6d5", "trunk": "#46c8d8", "tail": "#9a8cf0", "spine": "#7ce6d5", "knee": "#b8ff2a", "foot": "#8fd23a"}


def _preview_scene():
    sc = bpy.data.scenes.get("Vorschau") or bpy.data.scenes.new("Vorschau")
    sc.render.engine = "BLENDER_EEVEE"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.resolution_x = PREVIEW_SIZE
    sc.render.resolution_y = PREVIEW_SIZE
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    if hasattr(sc.eevee, "taa_render_samples"):
        sc.eevee.taa_render_samples = 8
    sc.world = bpy.data.worlds.get("Welt · Vorschau") or szenen._world("Vorschau", "#1b2a1a")
    cam = szenen._camera(sc, "Kamera · Vorschau", (0, -5, 3), (0, 0, 0), 50.0, 2000.0)
    sc.camera = cam
    szenen._sun(sc, (-0.45, -0.6, 0.66))
    return sc, cam


def _frame_camera(cam, mn, mx, direction=(-0.5, -1.0, 0.65)):
    loc, target = szenen.frame(mn, mx, direction, cam.data.lens, 1.02)
    cam.location = loc
    cam.rotation_euler = (target - loc).to_track_quat("-Z", "Y").to_euler()


def _sample_sphere():
    me = bpy.data.meshes.get("Vorschau · Kugel")
    if me is None:
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=1.0)
        me = bpy.data.meshes.new("Vorschau · Kugel")
        bm.to_mesh(me)
        bm.free()
        me.shade_smooth()
        co = np.zeros(len(me.vertices) * 3, np.float32)
        me.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        a = me.attributes.new("ee_rest", "FLOAT_VECTOR", "POINT")
        a.data.foreach_set("vector", np.ascontiguousarray(np.stack([co[:, 0], co[:, 2], -co[:, 1]], axis=1)).ravel())
    return me


def _set_preview(idblock, png):
    img = bpy.data.images.load(png, check_existing=False)
    try:
        w, h = img.size
        px = np.zeros(w * h * 4, np.float32)
        img.pixels.foreach_get(px)
        prev = idblock.preview_ensure()
        prev.image_size = (w, h)
        prev.image_pixels_float.foreach_set(px)
    finally:
        bpy.data.images.remove(img)


def asset_previews(st):
    sc, cam = _preview_scene()
    tmp = tempfile.mkdtemp(prefix="ee-vorschau-")
    sphere = bpy.data.objects.new("Vorschau · Materialkugel", _sample_sphere())
    count = 0
    for i, (idblock, cat, _desc, _tags) in enumerate(st.assets):
        png = os.path.join(tmp, f"{i:04d}.png")
        temp_objects = []
        try:
            if isinstance(idblock, bpy.types.Collection):
                inst = bpy.data.objects.new("Vorschau · Instanz", None)
                inst.instance_type = "COLLECTION"
                inst.instance_collection = idblock
                sc.collection.objects.link(inst)
                temp_objects.append(inst)
                mn, mx = szenen.bounds_of(idblock)
                # Module: Instanz-Ursprung = SOCKET_root → die Instanz steht versetzt; Grenzen entsprechend verschieben
                off = idblock.instance_offset
                mn, mx = mn - off, mx - off
            elif isinstance(idblock, bpy.types.Object):
                sc.collection.objects.link(idblock)
                temp_objects.append(None)
                mn = Vector((1e9, 1e9, 1e9))
                mx = Vector((-1e9, -1e9, -1e9))
                for v in idblock.bound_box:
                    w = idblock.matrix_world @ Vector(v)
                    mn = Vector((min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)))
                    mx = Vector((max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)))
            elif isinstance(idblock, bpy.types.Material):
                sphere.data.materials.clear()
                sphere.data.materials.append(idblock)
                sc.collection.objects.link(sphere)
                temp_objects.append(sphere)
                mn, mx = Vector((-1, -1, -1)), Vector((1, 1, 1))
            else:
                continue
            if (mx - mn).length > 400:  # ganze Welten: näher heran an die Mitte
                c = (mn + mx) / 2
                mn, mx = c - Vector((20, 20, 20)), c + Vector((20, 20, 20))
            _frame_camera(cam, mn, mx)
            sc.render.filepath = png
            bpy.ops.render.render(write_still=True, scene=sc.name)
            if os.path.exists(png):
                _set_preview(idblock, png)
                count += 1
        except Exception as ex:  # noqa: BLE001
            st.report.append(f"! Vorschau {getattr(idblock, 'name', '?')}: {ex}")
        finally:
            for o in temp_objects:
                if o is None:
                    sc.collection.objects.unlink(idblock)
                elif o.name in sc.collection.objects:
                    sc.collection.objects.unlink(o)
                    if o is not sphere:
                        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.objects.remove(sphere, do_unlink=True)
    for o in list(sc.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.scenes.remove(sc)
    return count


# --- Übersichtsbilder für docs/progress ---------------------------------------------------------------


def _render_scene(sc, path, cam=None, res=(1600, 1000)):
    old_cam = sc.camera
    if cam is not None:
        sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = path
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    bpy.ops.render.render(write_still=True, scene=sc.name)
    sc.camera = old_cam
    return path


def _rig_illustration(st, sc, name_prefix="Giraffe S8"):
    """Temporäre Geometrie: Kugeln halbtransparent nach Rolle, Knochen als Stäbe mit Gelenkperlen."""
    entry = next(((col, ao, meta) for col, ao, meta in st.creatures if ao.name.startswith(name_prefix + " ·")), None)
    if entry is None:
        return None, []
    col, ao, meta = entry
    temps = []
    tcol = bpy.data.collections.new("Rig-Erklärung (temporär)")
    sc.collection.children.link(tcol)
    body = next((o for o in col.objects if o.type == "MESH"), None)
    ghost = materials.ramp_material("Rig · Körper (durchscheinend)", ["#3a3020", "#a88a50"], (0.2,), blended=True)
    if body is not None:
        b2 = body.copy()
        b2.data = body.data.copy()
        b2.data.materials.clear()
        mat = ghost.copy()
        from .nodes import NT

        t = NT(mat.node_tree)
        out = next(n for n in mat.node_tree.nodes if n.bl_idname == "ShaderNodeOutputMaterial")
        emis = next(n for n in mat.node_tree.nodes if n.bl_idname == "ShaderNodeEmission")
        tr = t.node("ShaderNodeBsdfTransparent")
        mx = t.node("ShaderNodeMixShader")
        mx.inputs[0].default_value = 0.35
        t.link(tr.outputs[0], mx.inputs[1])
        t.link(emis.outputs[0], mx.inputs[2])
        t.link(mx.outputs[0], out.inputs["Surface"])
        from .nodes import set_blend

        set_blend(mat, True)
        b2.data.materials.append(mat)
        tcol.objects.link(b2)
        temps.append(b2)
    arm = ao.data
    for s in meta["spheres"]:
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=float(s["r"]))
        me = bpy.data.meshes.new(f"Rig · Kugel {s['name']}")
        bm.to_mesh(me)
        bm.free()
        me.shade_smooth()
        m = materials.ramp_material(f"Rig · Rolle {s['role']}", [ROLE_COLORS.get(s["role"], "#cccccc"), ROLE_COLORS.get(s["role"], "#cccccc")], (0.5,), blended=False)
        me.materials.append(m)
        o = bpy.data.objects.new(f"Rig · Kugel {s['name']}", me)
        tcol.objects.link(o)
        c = Vector((s["center"][0], -s["center"][2], s["center"][1]))
        o.location = ao.matrix_world @ c
        o.scale = (0.35, 0.35, 0.35)
        temps.append(o)
    stick = materials.flat_material("Rig · Knochen", "#f7f6d8", banded=False)
    ik = materials.flat_material("Rig · IK-Ziel", "#ff5a36", banded=False)
    for bone in arm.bones:
        h = ao.matrix_world @ bone.head_local
        tl = ao.matrix_world @ bone.tail_local
        d = tl - h
        if d.length < 1e-4:
            continue
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.035, radius2=0.012, depth=d.length)
        me = bpy.data.meshes.new(f"Rig · Knochen {bone.name}")
        bm.to_mesh(me)
        bm.free()
        me.materials.append(ik if bone.name.startswith("IK-") else stick)
        o = bpy.data.objects.new(f"Rig · Knochen {bone.name}", me)
        tcol.objects.link(o)
        o.location = h + d / 2
        o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        temps.append(o)
    mn, mx = szenen.bounds_of(col)
    cam = szenen._camera(sc, "Kamera · Rig", (0, 0, 0), (0, 0, 1), 50.0, 500.0)
    loc, target = szenen.frame(mn, mx, (-0.9, -1.0, 0.8), 50.0, 0.8)
    cam.location = loc
    cam.rotation_euler = (target - loc).to_track_quat("-Z", "Y").to_euler()
    temps.append(cam)
    # alles andere der Szene ausblenden
    hidden = []
    for o in sc.objects:
        if o in temps or o.type in ("LIGHT",):
            continue
        if not o.hide_render:
            o.hide_render = True
            hidden.append(o)
    return cam, (temps, hidden, tcol)


def progress_renders(st, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    files = []
    scenes = getattr(st, "scenes", {})
    names = {"Wesen": "blender-bibliothek-wesen", "Map": "blender-bibliothek-map", "Spielfeld": "blender-bibliothek-spielfeld", "REX": "blender-bibliothek-rex", "Module": "blender-bibliothek-module", "Materialien": "blender-bibliothek-materialien", "Eigenes Wesen": "blender-bibliothek-eigenes-wesen"}
    for key, fname in names.items():
        sc = scenes.get(key)
        if sc is None or sc.camera is None:
            continue
        files.append(_render_scene(sc, os.path.join(out_dir, f"{fname}.png")))
        if key == "Map":
            over = sc.objects.get("Kamera · Planet (Übersicht)")
            if over is not None:
                files.append(_render_scene(sc, os.path.join(out_dir, "blender-bibliothek-map-planet.png"), over))
    sc = scenes.get("Wesen")
    if sc is not None:
        cam, state = _rig_illustration(st, sc)
        if cam is not None:
            files.append(_render_scene(sc, os.path.join(out_dir, "blender-bibliothek-rig-giraffe.png"), cam, (1400, 900)))
            temps, hidden, tcol = state
            for o in hidden:
                o.hide_render = False
            for o in temps:
                bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.collections.remove(tcol)
    return files
