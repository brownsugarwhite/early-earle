"""
Wesen: je Art und Stufe eine Collection mit
  • Rig (Armature): ein Deform-Knochen je Körperkugel (Knochenkopf = Kugelmitte — so skinnt das Spiel),
    Ketten wie im Spiel (Hals, Rüssel, Schwanz, Wirbelsäule), Unterkiefer am Scharnier, Beine als
    Hüfte → Knie → Fuß mit IK-Ziel je Fuß; Knochensammlungen Körper/Kopf/Hals/Rüssel/Schwanz/Beine/IK/Wurzel.
  • Körper-Mesh: das Mesh des Spiels mit den Skin-Gewichten des Spiels als Vertex-Gruppen (Armature-Modifier).
  • Kugeln: die SDF-Kugeln als Kugel-Empties (Anzeigegröße 1, Skalierung = Radius) mit Rolle/Kette/Bein;
    Gelenke: Hüften, Halsansatz, Rüsselansatz, Maul, Kiefergelenk — das Gerüst, aus dem ein eigenes Wesen
    exportiert wird (beides ausgeblendet).
  • Sockel: Empties an den Sockel-Frames des Spiels, die das Modul als Collection-Instanz tragen (Tönung als
    Eigenschaft ee_tint/ee_ink/ee_bone/ee_accent), an den Knochen ihrer Ankerkugel gehängt.
Die Vorlage „Eigenes Wesen“ nutzt dieselben Bausteine ohne Rig (Wurzel = Empty, Live-Vorschau per GN).
"""
import json

import bpy
import numpy as np
from mathutils import Matrix, Vector

from . import materials
from .glb import Glb, g2b, g2b_array, mat_g2b
from .util import collection, empty, hex_to_rgba, hide_collection, link, make_mesh, set_props

SLOT_LABEL = {"eye": "Auge", "horn": "Horn", "ear": "Ohr", "trunk": "Nase", "tooth": "Zähne", "wing": "Flügel", "leg": "Bein", "tail": "Schweif", "crest": "Kamm"}
BONE_COLLECTIONS = ["Wurzel", "Körper", "Kopf", "Hals", "Rüssel", "Schwanz", "Wirbelsäule", "Beine", "IK"]
LEG_LABEL = {"FL": "vorn.L", "FR": "vorn.R", "BL": "hinten.L", "BR": "hinten.R", "L": "L", "R": "R"}


def short_label(meta):
    if meta.get("custom"):
        return meta.get("label", meta.get("id"))
    if meta.get("species") == "blob":
        zone = meta.get("zone", "")
        return f"Blob {zone[:1].upper()}{zone[1:]} S{meta.get('tier')}"
    return f"{meta.get('speciesLabel', meta.get('species'))} S{meta.get('tier')}"


def _armature(name, meta, col, view_layer):
    arm = bpy.data.armatures.new(f"{name} · Rig")
    arm.display_type = "OCTAHEDRAL"
    ao = bpy.data.objects.new(f"{name} · Rig", arm)
    link(ao, col)
    ao.show_in_front = True
    view_layer.objects.active = ao
    bpy.ops.object.mode_set(mode="EDIT")
    ebs = {}
    for b in meta["bones"]:
        eb = arm.edit_bones.new(b["name"])
        eb.head = g2b(b["head"])
        eb.tail = g2b(b["tail"])
        eb.roll = 0.0
        eb.use_deform = bool(b["deform"])
        ebs[b["name"]] = eb
    for b in meta["bones"]:
        if b.get("parent"):
            ebs[b["name"]].parent = ebs[b["parent"]]
            ebs[b["name"]].use_connect = bool(b.get("connect")) and (ebs[b["parent"]].tail - ebs[b["name"]].head).length < 1e-4
    bpy.ops.object.mode_set(mode="OBJECT")
    bcols = {n: arm.collections.new(n) for n in BONE_COLLECTIONS}
    sphere_by_index = {s["index"]: s for s in meta["spheres"]}
    for b in meta["bones"]:
        bone = arm.bones[b["name"]]
        bcols.get(b.get("collection", "Körper"), bcols["Körper"]).assign(bone)
        s = sphere_by_index.get(b["sphere"])
        bone["ee_rolle"] = b.get("role", "")
        if s is not None:
            bone["ee_kugel"] = s["index"]
            bone["ee_radius"] = float(s["r"])
    # IK je Bein: Kette bis zur Hüfte, Ziel = IK-Fuß (in Ruhe exakt am Fuß → Ruhepose unverändert)
    for b in meta["bones"]:
        ik = b.get("ik")
        if not ik:
            continue
        c = ao.pose.bones[b["name"]].constraints.new("IK")
        c.target = ao
        c.subtarget = ik["target"]
        c.chain_count = int(ik["chain"])
        c.use_stretch = False
    for pb in ao.pose.bones:
        if pb.name.startswith("IK-"):
            pb.bone.color.palette = "THEME09"
    return ao


def _body(name, g, node, meta, col, ao, bone_names):
    prim = g.mesh_primitives(node["mesh"])[0]
    pos_g = np.asarray(prim["positions"], dtype=np.float32)
    me = make_mesh(f"{name} · Körper", g2b_array(pos_g), prim["indices"].reshape(-1, 3), smooth=True)
    # Ruheposition relativ zur Hauptkugel im Spielraum: die Muster kleben am Körper wie im Spiel (auch gebogen).
    s0 = meta["spheres"][0]["center"] if meta.get("spheres") else [0, 0, 0]
    attr = me.attributes.new("ee_rest", "FLOAT_VECTOR", "POINT")
    attr.data.foreach_set("vector", np.ascontiguousarray(pos_g - np.asarray(s0, dtype=np.float32)).ravel())
    mo = bpy.data.objects.new(f"{name} · Körper", me)
    link(mo, col)
    mo.parent = ao
    mod = mo.modifiers.new("Rig", "ARMATURE")
    mod.object = ao
    joints = np.asarray(prim["attributes"]["JOINTS_0"]).astype(np.int32)
    weights = np.asarray(prim["attributes"]["WEIGHTS_0"], dtype=np.float32)
    groups = {}
    for v in range(len(pos_g)):
        for q in range(4):
            w = float(weights[v, q])
            if w <= 1e-4:
                continue
            bname = bone_names[joints[v, q]]
            vg = groups.get(bname)
            if vg is None:
                vg = groups[bname] = mo.vertex_groups.new(name=bname)
            vg.add([v], w, "ADD")
    me.materials.append(materials.creature_material(f"Wesen · {name}", meta))
    return mo


def _attach(obj, root, bone, world):
    obj.parent = root
    if bone:
        obj.parent_type = "BONE"
        obj.parent_bone = bone
    obj.matrix_world = world


def design_handles(prefix, meta, sph_col, joint_col, sock_col, root, sphere_bone, module_cols, view_layer):
    """Kugeln (`sph_col`), Hüften, Halsansatz, Rüsselansatz, Maul, Kiefergelenk (`joint_col`) und Sockel mit
    Modul-Instanzen (`sock_col`) eines Wesens. In `sph_col` liegen nur Kugeln: die Live-Vorschau vereint alles dort.

    `sphere_bone`: Kugelindex → Knochenname (Bibliothek) oder None (Vorlage: alles hängt an der Wurzel).
    """
    view_layer.update()
    base = root.matrix_world.copy()
    cj = meta.get("customJson") or {}
    spheres = meta["spheres"]
    by_name = {s["name"]: s for s in spheres}
    bone_of = (lambda i: sphere_bone.get(i)) if sphere_bone else (lambda i: None)  # noqa: E731
    sphere_obj = {}
    for s in spheres:
        e = empty(f"{prefix} · Kugel {s['name']}", sph_col, "SPHERE", 1.0)
        r = float(s["r"])
        _attach(e, root, bone_of(s["index"]), base @ Matrix.Translation(g2b(s["center"])) @ Matrix.Diagonal((r, r, r, 1.0)))
        set_props(e, {"ee_rolle": s["role"], "ee_name": s["name"], "ee_kette": s["chain"] if s.get("chain", -1) >= 0 else None, "ee_bein": s.get("leg")})
        sphere_obj[s["index"]] = e
    hip_parent = {}
    for b in meta.get("bones", []):
        if b.get("role") == "hip":
            hip_parent[b["name"]] = b.get("parent")
    for l in cj.get("legs", []):
        e = empty(f"{prefix} · Hüfte {LEG_LABEL.get(l['leg'], l['leg'])}", joint_col, "CUBE", 0.06)
        _attach(e, root, hip_parent.get(f"Hüfte.{LEG_LABEL.get(l['leg'], l['leg'])}") if sphere_bone else None, base @ Matrix.Translation(g2b(l["hip"])))
        set_props(e, {"ee_huefte": l["leg"], "ee_beuge": int(l.get("bend", 1))})
    head = next((s for s in spheres if s["role"] == "head"), None)
    core = next((s for s in spheres if s["role"] == "core"), spheres[0])

    def on_sphere(e, index, world):
        """Bibliothek: an den Knochen der Kugel; Vorlage: an das Kugel-Empty (wandert mit der Kugel)."""
        if sphere_bone:
            _attach(e, root, bone_of(index), world)
        else:
            _attach(e, sphere_obj.get(index, root), None, world)

    if cj.get("neck"):
        e = empty(f"{prefix} · Halsansatz", joint_col, "CONE", 0.08)
        on_sphere(e, core["index"], base @ Matrix.Translation(g2b(cj["neck"]["base"])))
        set_props(e, {"ee_hals_basis": True, "ee_max_biegung": float(cj["neck"].get("maxBend", 0.6))})
    if cj.get("trunk"):
        e = empty(f"{prefix} · Rüsselansatz", joint_col, "CONE", 0.06)
        on_sphere(e, head["index"] if head else core["index"], base @ Matrix.Translation(g2b(cj["trunk"]["root"])))
        set_props(e, {"ee_ruessel_wurzel": True})
    mouth = cj.get("mouth")
    if mouth and mouth.get("anchor") in by_name:
        a = by_name[mouth["anchor"]]
        d = Vector(mouth["dir"]).normalized()
        p = Vector(a["center"]) + d * float(a["r"])
        e = empty(f"{prefix} · Maul", joint_col, "SINGLE_ARROW", 0.12)
        on_sphere(e, a["index"], base @ Matrix.Translation(g2b(p)))
        set_props(e, {"ee_maul_anker": a["name"], "ee_breite": float(mouth["width"]), "ee_oeffnung": float(mouth["open"])})
        if mouth.get("hinge"):
            h = empty(f"{prefix} · Kiefergelenk", joint_col, "PLAIN_AXES", 0.06)
            on_sphere(h, head["index"] if head else a["index"], base @ Matrix.Translation(g2b(mouth["hinge"])))
            set_props(h, {"ee_kiefer_gelenk": True})
    consts = meta.get("constants", {})
    counts = {}
    for part in meta["parts"]:
        if part.get("sdf") or not part.get("socket"):
            continue
        slot = part["slot"]
        k = counts.get(slot, 0)
        counts[slot] = k + 1
        side = "L" if part["mirror"] > 0 and part["count"] > 1 else "R" if part["mirror"] < 0 else str(k + 1)
        e = empty(f"{prefix} · Sockel {SLOT_LABEL.get(slot, slot)} {side}", sock_col, "ARROWS", 0.15)
        s = float(part["scale"])
        sc = Matrix.Diagonal((s * (1 if part["mirror"] > 0 else -1), s, s, 1.0))
        world = base @ mat_g2b(part["socket"]) @ sc
        if sphere_bone:
            _attach(e, root, bone_of(part["anchor"]), world)
        else:
            # Vorlage: Sockel hängen an ihrer Ankerkugel — Kugel verschieben/skalieren nimmt die Module mit
            _attach(e, sphere_obj.get(part["anchor"], root), None, world)
        mc = module_cols.get(part["asset"])
        if mc is not None:
            e.instance_type = "COLLECTION"
            e.instance_collection = mc
        rest = part["socket"][12:15]
        set_props(
            e,
            {
                "ee_sockel": slot,
                "ee_modul": part["asset"],
                "ee_anker": part.get("anchorName") or core["name"],
                "ee_theta": float(part["theta"]),
                "ee_phi": float(part["phi"]),
                "ee_ruhe": [float(x) for x in rest],
                "ee_neigung": float(part["tilt"]),
                "ee_drehung": float(part["roll"]),
                "ee_versenkt": float(part["sink"]),
                "ee_ref": part.get("ref", "up"),
                "ee_familie": part.get("family"),
            },
        )
        tint = part.get("tint")
        e["ee_tint"] = hex_to_rgba(tint) if tint else hex_to_rgba(meta["palette"]["base"])
        e["ee_ink"] = hex_to_rgba(consts.get("ink", "#0f1c22"))
        e["ee_bone"] = hex_to_rgba(consts.get("bone", "#f7f6d8"))
        e["ee_accent"] = hex_to_rgba(consts.get("accent", "#22baa9"))
        e["ee_iris"] = hex_to_rgba(consts.get("ink", "#0f1c22")) if meta.get("species") != "blob" else hex_to_rgba("#e8a33c")


def build_creature(path, parent_col, position, module_cols, view_layer, show_spheres=False):
    g = Glb(path)
    root = g.root_nodes()[0]
    meta = root["extras"]
    name = short_label(meta)
    col = collection(meta.get("label", name), parent_col)
    ao = _armature(name, meta, col, view_layer)
    ao.location = position
    bone_names = [b["name"] for b in meta["bones"]]
    body_node = next(g.nodes[i] for i in root["children"] if "mesh" in g.nodes[i])
    _body(name, g, body_node, meta, col, ao, bone_names)
    sph_col = collection(f"{name} · Kugeln", col)
    joint_col = collection(f"{name} · Gelenke", col)
    sock_col = collection(f"{name} · Sockel", col)
    sphere_bone = {b["sphere"]: b["name"] for b in meta["bones"] if b["sphere"] >= 0}
    design_handles(name, meta, sph_col, joint_col, sock_col, ao, sphere_bone, module_cols, view_layer)
    if not show_spheres:
        hide_collection(view_layer, sph_col, True)
        hide_collection(view_layer, joint_col, True)
    props = {
        "ee_id": meta["id"],
        "ee_art": meta["species"],
        "ee_art_name": meta.get("speciesLabel"),
        "ee_koerpertyp": meta.get("bodyType"),
        "ee_stufe": int(meta["tier"]),
        "ee_zone": meta.get("zone"),
        "ee_seed": meta.get("seed"),
        "ee_material": meta.get("material"),
        "ee_fell": (meta.get("skin") or {}).get("coat"),
        "ee_muster": (meta.get("skin") or {}).get("pattern"),
        "ee_beine": meta.get("legStyle"),
        "ee_weltmassstab": float(meta.get("worldScale", 1.0)),
        "ee_bodenhoehe": float(meta.get("restLift", 0.0)),
        "ee_eigenes": bool(meta.get("custom")),
    }
    set_props(ao, props)
    set_props(col, props)
    ao["ee_wesen_json"] = json.dumps(meta.get("customJson"), ensure_ascii=False)
    ao["ee_gang"] = (meta.get("motion") or {}).get("gait", "")
    return col, ao, meta


def build_template(meta, parent_col, module_cols, view_layer, ee_wesen):
    """Vorlage „Eigenes Wesen“: dieselben Bausteine wie ein Bibliothekswesen, aber ohne Rig — Wurzel-Empty,
    Kugeln sichtbar, Live-Vorschau (GN) statt Spiel-Mesh. Startform = das übergebene Wesen (Retriever)."""
    col = collection("Eigenes Wesen · Vorlage", parent_col)
    lift = float(meta.get("restLift", 0.8))
    root = empty("Wesen-Wurzel", col, "PLAIN_AXES", 0.6)
    root.location = (0, 0, lift)
    view_layer.update()
    cj = dict(meta.get("customJson") or {})
    cj["id"] = "mein-wesen"
    cj["name"] = "Mein Wesen"
    set_props(
        root,
        {
            "ee_wesen_wurzel": True,
            "ee_id": "mein-wesen",
            "ee_name": "Mein Wesen",
            "ee_basis": meta.get("species", "retriever"),
            "ee_zone": meta.get("zone", "tjorizo"),
            "ee_stufe": int(meta.get("tier", 6)),
            "ee_material": meta.get("material", "jelly"),
            "ee_farbe": (meta.get("palette") or {}).get("base", "#efc25a"),
            "ee_fell": (meta.get("skin") or {}).get("coat", "bare"),
            "ee_muster": (meta.get("skin") or {}).get("pattern", "none"),
            "ee_glaettung": float(meta.get("sminK", 0.2)),
            "ee_groesse": 1.0,
        },
    )
    root["ee_wesen_json"] = json.dumps(cj, ensure_ascii=False)
    sph_col = collection("Eigenes Wesen · Kugeln", col)
    joint_col = collection("Eigenes Wesen · Gelenke", col)
    sock_col = collection("Eigenes Wesen · Sockel", col)
    design_handles("Vorlage", meta, sph_col, joint_col, sock_col, root, None, module_cols, view_layer)
    mat = materials.creature_material("Wesen · Mein Wesen", meta)
    prev = ee_wesen.add_preview(col, sph_col, root, mat)
    prev.name = "Eigenes Wesen · Vorschau"
    return col, root
