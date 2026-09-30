"""
Beispiel für den Rückweg Blender → Spiel, headless ausführbar: nimmt die Vorlage „Eigenes Wesen“ der Bibliothek,
baut daraus einen kleinen Drachen (längerer Hals, größerer Kopf, Hörner, Fledermausflügel, Rückenflosse,
Rautenmuster) — genau die Handgriffe, die man in Blender von Hand macht — und exportiert ihn mit dem Operator
„early earle: Wesen exportieren“ nach content/genome/custom/beispiel-drache.json.

  /Applications/Blender.app/Contents/MacOS/Blender --background assets/blender/early-earle-bibliothek.blend \
      --python tools/blender/beispiel_drache.py -- [--out content/genome/custom]

Die Bibliothek wird dabei nicht gespeichert (nur gelesen).
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ee_wesen  # noqa: E402


def arg(name, default):
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    return argv[argv.index(name) + 1] if name in argv else default


def obj(name):
    o = bpy.data.objects.get(name)
    if o is None:
        raise SystemExit(f"Objekt fehlt: {name}")
    return o


def game_to_blender(v):
    return Vector((v[0], -v[2], v[1]))


def main():
    out = os.path.abspath(arg("--out", os.path.join(HERE, "..", "..", "content", "genome", "custom")))
    ee_wesen.register()
    scene = bpy.data.scenes["Eigenes Wesen"]
    root = obj("Wesen-Wurzel")
    col = next(c for c in root.users_collection)
    spheres = next(c for c in col.children if c.name.endswith("Kugeln"))
    sockets = next(c for c in col.children if c.name.endswith("Sockel"))
    base = root.matrix_world.copy()

    def place(o, game_pos, radius=None):
        m = base @ Matrix.Translation(game_to_blender(game_pos))
        if radius is not None:
            m = m @ Matrix.Diagonal((radius, radius, radius, 1.0))
        o.matrix_world = m

    # 1) Wurzel: Name, Basis (Giraffe = Schritt-Gang mit Hals, der beim Drehen führt), Farben, Muster
    root["ee_id"] = "beispiel-drache"
    root["ee_name"] = "Beispiel-Drache"
    root["ee_basis"] = "giraffe"
    root["ee_farbe"] = "#6c4fd8"
    root["ee_akzent"] = "#39bbeb"
    root["ee_fell"] = "bare"
    root["ee_muster"] = "diamonds"
    root["ee_glaettung"] = 0.22

    # 2) Hals länger: zweite Halskugel, Kopf höher und weiter vorn, Schnauze mit
    neck1 = obj("Vorlage · Kugel Hals.01")
    head = obj("Vorlage · Kugel Kopf")
    snout = obj("Vorlage · Kugel Schnauze")
    place(neck1, [0, 0.42, 0.9], 0.27)
    neck2 = bpy.data.objects.new("Vorlage · Kugel Hals.02", None)
    neck2.empty_display_type = "SPHERE"
    neck2.empty_display_size = 1.0
    spheres.objects.link(neck2)
    neck2.parent = root
    place(neck2, [0, 0.78, 1.2], 0.24)
    neck2["ee_rolle"] = "neck"
    neck2["ee_name"] = "Hals.02"
    neck2["ee_kette"] = 1
    neck1["ee_kette"] = 0
    place(head, [0, 1.12, 1.52], 0.52)
    place(snout, [0, 1.02, 1.98], 0.3)
    halsansatz = obj("Vorlage · Halsansatz")
    place(halsansatz, [0, 0.3, 0.62])
    halsansatz["ee_max_biegung"] = 0.9
    maul = obj("Vorlage · Maul")
    place(maul, [0, 0.9, 2.2])
    maul["ee_maul_anker"] = "Schnauze"

    # 3) Module: Hörner auf den Kopf, Fledermausflügel auf den Rücken, Flosse, spitze Ohren
    modules = {c.get("ee_modul", c.name): c for c in bpy.data.collections if c.get("ee_modul")}

    def socket(name, slot, asset, anchor_name, anchor_pos, anchor_r, theta, phi, scale, mirror=1, tilt=0.0, tint=None):
        e = bpy.data.objects.new(f"Vorlage · Sockel {name}", None)
        e.empty_display_type = "ARROWS"
        e.empty_display_size = 0.15
        sockets.objects.link(e)
        e.parent = root
        d = Vector((math.sin(theta) * math.cos(phi), math.sin(phi), math.cos(theta) * math.cos(phi)))
        p = Vector(anchor_pos) + d * anchor_r
        # Rahmen wie im Spiel: Z = Normale (≈ d), Y = oben
        z = game_to_blender(d).normalized()
        y = Vector((0, 0, 1)) - z * z.z
        if y.length < 1e-4:
            y = Vector((0, -1, 0))
        y.normalize()
        x = y.cross(z)
        rot = Matrix((x, y, z)).transposed().to_4x4()
        e.matrix_world = base @ Matrix.Translation(game_to_blender(p)) @ rot @ Matrix.Diagonal((scale * mirror, scale, scale, 1.0))
        e.instance_type = "COLLECTION"
        e.instance_collection = modules[asset]
        e["ee_sockel"] = slot
        e["ee_modul"] = asset
        e["ee_anker"] = anchor_name
        e["ee_neigung"] = tilt
        e["ee_drehung"] = 0.0
        e["ee_versenkt"] = 0.05
        if tint:
            e["ee_farbquelle"] = tint
        return e

    head_c, head_r = [0, 1.12, 1.52], 0.52
    core = obj("Vorlage · Kugel Körper")
    core_c = [round(v, 4) for v in (base.inverted() @ core.matrix_world.translation).to_tuple()]
    core_c = [core_c[0], core_c[2], -core_c[1]]
    core_r = core.scale.x
    for side, sign in (("L", 1), ("R", -1)):
        socket(f"Horn {side}", "horn", "horn_curl", "Kopf", head_c, head_r, 0.5 * sign, 0.95, 0.8, sign, -0.3, "bone")
        socket(f"Flügel {side}", "wing", "wing_bat", "Körper", core_c, core_r, 1.75 * sign, 0.75, 1.15, sign, 0.7, "accent")
    socket("Kamm", "crest", "crest_fin", "Hinterteil", [0, 0.1, -0.44], 0.58, math.pi, 1.0, 1.0, 1, 0.1, "accent")
    for e in list(sockets.objects):
        if e.get("ee_modul") == "ear_dog":
            e.instance_collection = modules["ear_pointy"]
            e["ee_modul"] = "ear_pointy"
            e["ee_anker"] = "Kopf"

    bpy.context.view_layer.update()
    # 4) Export über den Operator (wie der Knopf in der Seitenleiste)
    with bpy.context.temp_override(scene=scene, view_layer=scene.view_layers[0], active_object=root, object=root, collection=col):
        result = bpy.ops.ee.wesen_exportieren(directory=out)
    print("EXPORT", result, os.path.join(out, "beispiel-drache.json"))


if __name__ == "__main__":
    main()
