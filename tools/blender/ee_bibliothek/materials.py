"""
Materialien, die den Spiel-Look in EEVEE annähern: gebänderte, palettenindizierte Schattierung
(Serigrafie-Schichten statt weicher Verläufe, keine Konturen), Fresnel-Randlicht als Wertsprung, ein
harter Glanzbogen, die Muster (Tiger, Giraffe, Zebra, Schlange, Punkte, Rauten …) prozedural im
Ruheraum des Körpers und die Materialarten Jelly, Flüssig, Gas, Feuer, Fell, Federn.

Alle Materialien enden in einer Emission: Die Farbe IST die Palettenfarbe (kein Ambient, kein Spekular,
wie im Spiel). Licht und Schatten kommen aus der Sonne der Szene über „Shader to RGB“ (nur EEVEE).
"""
import bpy

from .nodes import NT, group_socket, new_group, new_material, set_blend
from .util import hex_to_rgba

MATERIAL_KIND = {"jelly": 0, "liquid": 1, "gas": 2, "fire": 3, "fur": 4, "feather": 5}
MATERIAL_KIND_LABEL = {"jelly": "Jelly", "liquid": "Flüssig", "gas": "Gas", "fire": "Feuer", "fur": "Fell", "feather": "Federn"}
PATTERN_KIND = {"none": 0, "tiger": 1, "giraffe": 2, "zebra": 3, "snake": 4, "spots": 5, "diamonds": 6, "elephant": 7, "rex": 8, "retriever": 9, "mouse": 10}

_cache = {}


def light_group():
    """EE · Licht: Sonnenlicht als Zahl (Diffus mit Schatten), Glanz und Randfaktor — Basis aller Bänder."""
    if "light" in _cache:
        return _cache["light"]
    ng = new_group("EE · Licht")
    group_socket(ng, "Licht", "OUTPUT", "NodeSocketFloat", description="Diffuses Sonnenlicht inkl. Schlagschatten, 0..1")
    group_socket(ng, "Glanz", "OUTPUT", "NodeSocketFloat", description="Enger Glanzbogen, 0..1")
    group_socket(ng, "Rand", "OUTPUT", "NodeSocketFloat", description="Fresnel/Randfaktor (1 = Silhouette)")
    t = NT(ng)
    out = t.node("NodeGroupOutput", loc=(900, 0))
    diff = t.node("ShaderNodeBsdfDiffuse", loc=(0, 100))
    diff.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = t.node("ShaderNodeShaderToRGB", loc=(200, 100))
    t.link(diff.outputs[0], s2r.inputs[0])
    bw = t.node("ShaderNodeRGBToBW", loc=(400, 100))
    t.link(s2r.outputs["Color"], bw.inputs[0])
    t.link(bw.outputs[0], out.inputs["Licht"])
    gl = t.node("ShaderNodeBsdfGlossy", loc=(0, -100))
    gl.inputs["Roughness"].default_value = 0.12
    gl.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r2 = t.node("ShaderNodeShaderToRGB", loc=(200, -100))
    t.link(gl.outputs[0], s2r2.inputs[0])
    bw2 = t.node("ShaderNodeRGBToBW", loc=(400, -100))
    t.link(s2r2.outputs["Color"], bw2.inputs[0])
    t.link(bw2.outputs[0], out.inputs["Glanz"])
    lw = t.node("ShaderNodeLayerWeight", loc=(400, -300))
    lw.inputs["Blend"].default_value = 0.35
    t.link(lw.outputs["Facing"], out.inputs["Rand"])
    _cache["light"] = ng
    return ng


def pattern_group():
    """EE · Muster: Tinte/Licht/Licht2-Masken der Spielmuster im Ruheraum (y oben, z vorn)."""
    if "pattern" in _cache:
        return _cache["pattern"]
    ng = new_group("EE · Muster")
    group_socket(ng, "Position", "INPUT", "NodeSocketVector", description="Ruheposition relativ zur Hauptkugel (Spielraum: y oben, z vorn)")
    group_socket(ng, "Muster", "INPUT", "NodeSocketInt", 0, 0, 10, "0 ohne, 1 Tiger, 2 Giraffe, 3 Zebra, 4 Schlange, 5 Punkte, 6 Rauten, 7 Elefant, 8 REX, 9 Retriever, 10 Maus")
    group_socket(ng, "Skala", "INPUT", "NodeSocketFloat", 1.0, 0.1, 5.0)
    group_socket(ng, "Drehung", "INPUT", "NodeSocketFloat", 0.0)
    group_socket(ng, "Tinte", "OUTPUT", "NodeSocketFloat")
    group_socket(ng, "Licht", "OUTPUT", "NodeSocketFloat")
    group_socket(ng, "Licht 2", "OUTPUT", "NodeSocketFloat")
    t = NT(ng)
    gi = t.node("NodeGroupInput", loc=(-1200, 0))
    go = t.node("NodeGroupOutput", loc=(1800, 0))
    kind = gi.outputs["Muster"]
    # Drehung um die Hochachse (y), dann skalieren.
    rot = t.node("ShaderNodeVectorRotate", rotation_type="Y_AXIS", loc=(-1000, 0))
    t.link(gi.outputs["Position"], rot.inputs["Vector"])
    t.link(gi.outputs["Drehung"], rot.inputs["Angle"])
    p = t.vmath("SCALE", rot.outputs["Vector"], scale=gi.outputs["Skala"])
    px, py, pz = t.sep(p)
    t.col = 1
    noise = t.node("ShaderNodeTexNoise", noise_dimensions="3D")
    t.link(p, noise.inputs["Vector"])
    noise.inputs["Scale"].default_value = 1.6
    noise.inputs["Detail"].default_value = 1.0
    nval = noise.outputs["Fac"]

    def stripes(coord, freq, width):
        # Streifen quer zur Wirbelsäule: |frac(u) − 0.5| < width
        u = t.add(t.mul(coord, freq), t.mul(t.sub(nval, 0.5), 1.6))
        f = t.math("FRACT", u)
        d = t.math("ABSOLUTE", t.sub(f, 0.5))
        return t.lt(d, width)

    t.col = 2
    back = t.gt(py, -0.35)  # Muster oben und an den Seiten, der Bauch bleibt frei
    tiger = t.mul(stripes(pz, 2.6, 0.16), back)
    zebra = t.mul(stripes(pz, 3.4, 0.22), t.gt(py, -0.6))
    # Giraffe: Voronoi-Flecken mit hellen Nähten (Abstand zur Kante)
    vor = t.node("ShaderNodeTexVoronoi", voronoi_dimensions="3D", feature="DISTANCE_TO_EDGE")
    t.link(p, vor.inputs["Vector"])
    vor.inputs["Scale"].default_value = 2.4
    seam = t.lt(vor.outputs["Distance"], 0.07)
    vorf = t.node("ShaderNodeTexVoronoi", voronoi_dimensions="3D", feature="F1")
    t.link(p, vorf.inputs["Vector"])
    vorf.inputs["Scale"].default_value = 2.4
    cellc = t.node("ShaderNodeRGBToBW")
    t.link(vorf.outputs["Color"], cellc.inputs[0])
    giraffe_ink = t.mul(t.math("SUBTRACT", 1.0, seam), t.lt(cellc.outputs[0], 0.5))
    giraffe_l2 = t.mul(t.math("SUBTRACT", 1.0, seam), t.gt(cellc.outputs[0], 0.5))
    giraffe_light = seam
    # Schlange: Schuppen (Kanten dunkel) + helles Rückenband
    sc = t.node("ShaderNodeTexVoronoi", voronoi_dimensions="3D", feature="DISTANCE_TO_EDGE")
    t.link(p, sc.inputs["Vector"])
    sc.inputs["Scale"].default_value = 7.0
    snake_ink = t.lt(sc.outputs["Distance"], 0.06)
    snake_l2 = t.mul(t.lt(t.math("ABSOLUTE", px), 0.16), t.gt(py, 0.0))
    # Punkte
    sp = t.node("ShaderNodeTexVoronoi", voronoi_dimensions="3D", feature="F1")
    t.link(p, sp.inputs["Vector"])
    sp.inputs["Scale"].default_value = 3.2
    spots = t.mul(t.lt(sp.outputs["Distance"], 0.24), back)
    # Rauten: Diagonalgitter aus zwei Streifenfamilien, zwei Lichtfarben im Wechsel
    a = t.math("FRACT", t.mul(t.add(pz, px), 2.2))
    b = t.math("FRACT", t.mul(t.sub(pz, px), 2.2))
    da = t.math("ABSOLUTE", t.sub(a, 0.5))
    db = t.math("ABSOLUTE", t.sub(b, 0.5))
    diamond = t.lt(t.add(da, db), 0.34)
    par = t.math("FRACT", t.mul(t.add(t.math("FLOOR", t.mul(t.add(pz, px), 2.2)), t.math("FLOOR", t.mul(t.sub(pz, px), 2.2))), 0.5))
    dia_l = t.mul(diamond, t.lt(par, 0.25))
    dia_l2 = t.mul(diamond, t.gt(par, 0.25))
    dia_ink = t.math("SUBTRACT", 1.0, diamond)
    # Elefant: feine Faltenstriche
    wav = t.node("ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
    t.link(p, wav.inputs["Vector"])
    wav.inputs["Scale"].default_value = 3.0
    wav.inputs["Distortion"].default_value = 6.0
    wav.inputs["Detail"].default_value = 1.5
    eleph = t.mul(t.gt(wav.outputs["Fac"], 0.93), 0.6)
    # REX: dunkle Zackenstreifen über den Rücken
    rex = t.mul(stripes(pz, 3.0, 0.12), t.gt(py, 0.25))
    # Retriever / Maus: hellerer Bauch
    belly = t.math("SUBTRACT", 1.0, t.smooth(py, -0.45, 0.05))

    t.col = 4
    ink = t.value(0.0)
    light = t.value(0.0)
    light2 = t.value(0.0)
    for idx, i_, l_, l2_ in (
        (1, tiger, None, None),
        (2, giraffe_ink, giraffe_light, giraffe_l2),
        (3, zebra, None, None),
        (4, snake_ink, None, snake_l2),
        (5, spots, None, None),
        (6, dia_ink, dia_l, dia_l2),
        (7, eleph, None, None),
        (8, rex, None, None),
        (9, None, belly, None),
        (10, None, belly, None),
    ):
        sel = t.eq(kind, float(idx))
        if i_ is not None:
            ink = t.add(ink, t.mul(sel, i_))
        if l_ is not None:
            light = t.add(light, t.mul(sel, l_))
        if l2_ is not None:
            light2 = t.add(light2, t.mul(sel, l2_))
    t.link(ink, go.inputs["Tinte"])
    t.link(light, go.inputs["Licht"])
    t.link(light2, go.inputs["Licht 2"])
    _cache["pattern"] = ng
    return ng


def creature_body_group():
    """EE · Wesen-Körper: der Blob-/Wesen-Look (gebänderte Wrap-Beleuchtung, Organe, Randlicht, Glanzbogen, Muster, Materialart)."""
    if "body" in _cache:
        return _cache["body"]
    ng = new_group("EE · Wesen-Körper")
    S = lambda *a, **k: group_socket(ng, *a, **k)  # noqa: E731
    S("Grundfarbe", "INPUT", "NodeSocketColor", (0.2, 0.7, 0.6, 1))
    S("Innenfarbe", "INPUT", "NodeSocketColor", (0.03, 0.2, 0.2, 1))
    S("Randfarbe", "INPUT", "NodeSocketColor", (0.5, 0.9, 0.8, 1))
    S("Glanzfarbe", "INPUT", "NodeSocketColor", (1, 1, 1, 1))
    S("Tinte", "INPUT", "NodeSocketColor", (0.003, 0.012, 0.016, 1))
    S("Glanz", "INPUT", "NodeSocketFloat", 0.6, 0.0, 1.0)
    S("Transluzenz", "INPUT", "NodeSocketFloat", 0.5, 0.0, 1.0)
    S("Materialart", "INPUT", "NodeSocketInt", 0, 0, 5, "0 Jelly, 1 Flüssig, 2 Gas, 3 Feuer, 4 Fell, 5 Federn")
    S("Muster", "INPUT", "NodeSocketInt", 0, 0, 10, "0 ohne … 10 Maus (wie im Spiel)")
    S("Muster-Tinte", "INPUT", "NodeSocketColor", (0.02, 0.02, 0.02, 1))
    S("Muster-Licht", "INPUT", "NodeSocketColor", (0.85, 0.83, 0.7, 1))
    S("Muster-Licht 2", "INPUT", "NodeSocketColor", (0.85, 0.83, 0.7, 1))
    S("Musterkontrast", "INPUT", "NodeSocketFloat", 0.8, 0.0, 1.0)
    S("Musterskala", "INPUT", "NodeSocketFloat", 1.0, 0.1, 5.0)
    S("Musterdrehung", "INPUT", "NodeSocketFloat", 0.0)
    S("Shader", "OUTPUT", "NodeSocketShader")
    t = NT(ng)
    gi = t.node("NodeGroupInput", loc=(-1400, 0))
    go = t.node("NodeGroupOutput", loc=(2600, 0))
    lg = t.node("ShaderNodeGroup", loc=(-1100, 300))
    lg.node_tree = light_group()
    L = lg.outputs["Licht"]
    G = lg.outputs["Glanz"]
    R = lg.outputs["Rand"]
    kind = gi.outputs["Materialart"]
    base = gi.outputs["Grundfarbe"]
    inner = gi.outputs["Innenfarbe"]
    rim = gi.outputs["Randfarbe"]
    hl = gi.outputs["Glanzfarbe"]
    ink = gi.outputs["Tinte"]

    t.col = 0
    # Wrap-Bänder: Schatten (Innenfarbe mit Grund), Mittelband, Licht — harte Stufen wie im Spiel.
    shade = t.mix(0.55, base, inner)
    mid = t.mix(0.28, base, inner)
    lit1 = t.gt(L, 0.04)
    lit2 = t.gt(L, 0.42)
    col = t.mix(lit1, shade, mid)
    col = t.mix(lit2, col, base)
    # Fell/Federn: zwei harte Bänder, dunkler im Schatten
    matte = t.add(t.eq(kind, 4.0), t.eq(kind, 5.0))
    col = t.mix(t.mul(matte, t.math("SUBTRACT", 1.0, lit1)), col, t.mix(0.35, shade, ink))

    # Organe (Jelly/Flüssig): dunklere Innenformen durchscheinend in der Mitte der Silhouette
    t.col = 1
    glass = t.add(t.eq(kind, 0.0), t.eq(kind, 1.0))
    organ_noise = t.node("ShaderNodeTexNoise", noise_dimensions="3D")
    organ_noise.inputs["Scale"].default_value = 2.2
    organ = t.mul(t.gt(organ_noise.outputs["Fac"], 0.56), t.lt(R, 0.45))
    col = t.mix(t.mul(t.mul(organ, gi.outputs["Transluzenz"]), t.mul(glass, 0.55)), col, inner)

    # Muster
    t.col = 2
    attr = t.node("ShaderNodeAttribute", attribute_type="GEOMETRY", attribute_name="ee_rest")
    pg = t.node("ShaderNodeGroup")
    pg.node_tree = pattern_group()
    t.link(attr.outputs["Vector"], pg.inputs["Position"])
    t.link(gi.outputs["Muster"], pg.inputs["Muster"])
    t.link(gi.outputs["Musterskala"], pg.inputs["Skala"])
    t.link(gi.outputs["Musterdrehung"], pg.inputs["Drehung"])
    k = gi.outputs["Musterkontrast"]
    solid = t.math("SUBTRACT", 1.0, t.add(t.eq(kind, 2.0), t.eq(kind, 3.0)))
    pat_ink_col = t.mix(lit1, t.mix(0.5, gi.outputs["Muster-Tinte"], ink), gi.outputs["Muster-Tinte"])
    col = t.mix(t.mul(t.mul(pg.outputs["Tinte"], k), solid), col, pat_ink_col)
    pl = t.mix(lit2, t.mix(0.3, gi.outputs["Muster-Licht"], shade), gi.outputs["Muster-Licht"])
    col = t.mix(t.mul(t.mul(pg.outputs["Licht"], t.add(0.7, t.mul(k, 0.3))), solid), col, pl)
    pl2 = t.mix(lit2, t.mix(0.3, gi.outputs["Muster-Licht 2"], shade), gi.outputs["Muster-Licht 2"])
    col = t.mix(t.mul(t.mul(pg.outputs["Licht 2"], t.add(0.7, t.mul(k, 0.3))), solid), col, pl2)

    # Fell: gekämmte Strähnen; Federn: Schuppenbögen
    t.col = 3
    fur_n = t.node("ShaderNodeTexWave", wave_type="BANDS", bands_direction="Y")
    fur_n.inputs["Scale"].default_value = 14.0
    fur_n.inputs["Distortion"].default_value = 9.0
    fur_n.inputs["Detail"].default_value = 2.0
    t.link(attr.outputs["Vector"], fur_n.inputs["Vector"])
    fur = t.mul(t.eq(kind, 4.0), t.mul(t.gt(fur_n.outputs["Fac"], 0.72), 0.45))
    col = t.mix(fur, col, t.mix(0.5, col, shade))
    fea = t.node("ShaderNodeTexVoronoi", voronoi_dimensions="3D", feature="DISTANCE_TO_EDGE")
    fea.inputs["Scale"].default_value = 6.0
    t.link(attr.outputs["Vector"], fea.inputs["Vector"])
    feather = t.mul(t.eq(kind, 5.0), t.lt(fea.outputs["Distance"], 0.07))
    col = t.mix(feather, col, t.mix(0.55, col, ink))

    # Earle-Randlicht (Wertsprung am sonnigen Rand, keine Linie) und Glasrand für Jelly/Flüssig/Gas
    t.col = 4
    rim_band = t.mul(t.gt(R, 0.62), lit2)
    col = t.mix(t.mul(rim_band, 0.7), col, t.mix(0.45, rim, hl))
    glassrim = t.mul(t.gt(R, 0.55), t.add(t.mul(glass, 0.35), t.mul(t.eq(kind, 2.0), 0.5)))
    col = t.mix(glassrim, col, rim)
    # Glanzbogen: harter Fleck (Jelly/Flüssig voll, Federn schwach, Feuer nie)
    shine = t.mul(t.gt(G, 0.55), gi.outputs["Glanz"])
    shine = t.mul(shine, t.math("SUBTRACT", 1.0, t.eq(kind, 3.0)))
    col = t.mix(t.mul(shine, 0.9), col, hl)

    # Feuer: vier harte Bänder vom Kern (Innenfarbe) bis zu karminroten Spitzen
    t.col = 5
    fn = t.node("ShaderNodeTexNoise", noise_dimensions="3D")
    fn.inputs["Scale"].default_value = 2.8
    fn.inputs["Detail"].default_value = 2.0
    t.link(attr.outputs["Vector"], fn.inputs["Vector"])
    _, fy, _ = t.sep(attr.outputs["Vector"])
    heat = t.add(t.mul(t.sub(fn.outputs["Fac"], 0.5), 0.9), t.sub(0.75, t.mul(fy, 0.45)))
    heat = t.sub(heat, t.mul(R, 0.5))
    dark_red = t.rgb(hex_to_rgba("#9b4745"))
    fire = t.mix(t.gt(heat, 0.35), dark_red, base)
    fire = t.mix(t.gt(heat, 0.62), fire, rim)
    fire = t.mix(t.gt(heat, 0.85), fire, inner)
    col = t.mix(t.eq(kind, 3.0), col, fire)

    # Gas: Nebelwesen mit weicher Kante (einzige weiche Kante im Spiel) und Wirbelbändern
    t.col = 6
    gn = t.node("ShaderNodeTexNoise", noise_dimensions="3D")
    gn.inputs["Scale"].default_value = 1.8
    t.link(attr.outputs["Vector"], gn.inputs["Vector"])
    band = t.mul(t.gt(gn.outputs["Fac"], 0.58), t.lt(gn.outputs["Fac"], 0.66))
    col = t.mix(t.mul(t.eq(kind, 2.0), band), col, t.mix(0.55, hl, base))
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    emis.inputs["Strength"].default_value = 1.0
    transp = t.node("ShaderNodeBsdfTransparent")
    alpha = t.math("SUBTRACT", 0.85, t.mul(R, 0.8), clamp=True)
    gas_alpha = t.mixf(t.eq(kind, 2.0), 1.0, alpha)
    mixs = t.node("ShaderNodeMixShader")
    t.link(gas_alpha, mixs.inputs[0])
    t.link(transp.outputs[0], mixs.inputs[1])
    t.link(emis.outputs[0], mixs.inputs[2])
    t.link(mixs.outputs[0], go.inputs["Shader"])
    _cache["body"] = ng
    return ng


def creature_material(name, meta):
    """Material eines Wesens: die Gruppe EE · Wesen-Körper mit den Farben und Parametern aus dem Spiel."""
    mat = new_material(name)
    t = NT(mat.node_tree)
    g = t.node("ShaderNodeGroup", loc=(0, 0))
    g.node_tree = creature_body_group()
    pal = meta.get("palette", {})
    pattern = meta.get("pattern") or {}
    kind = meta.get("material", "jelly")
    coat = (meta.get("skin") or {}).get("coat", "bare")
    look = coat if coat in ("fur", "feather") and kind not in ("fire", "gas") else kind
    base_hex = pal.get("base", "#7ce6d5")
    ground = pattern.get("ground")
    if ground:
        # Artmuster: das Fell/der Grund der Art, zu 25 % in die Körperpalette gezogen (wie `recolor` im Spiel)
        rec = pattern.get("recolor", 0.25) or 0.0
        g1, g2 = hex_to_rgba(ground), hex_to_rgba(base_hex)
        g.inputs["Grundfarbe"].default_value = tuple(g1[i] * (1 - rec) + g2[i] * rec for i in range(4))
    else:
        g.inputs["Grundfarbe"].default_value = hex_to_rgba(base_hex)
    g.inputs["Innenfarbe"].default_value = hex_to_rgba(pal.get("inner", "#2f7f7a"))
    g.inputs["Randfarbe"].default_value = hex_to_rgba(pal.get("rim", "#aef8e8"))
    g.inputs["Glanzfarbe"].default_value = hex_to_rgba(pal.get("highlight", "#ffffff"))
    g.inputs["Tinte"].default_value = hex_to_rgba((meta.get("constants") or {}).get("ink", "#0f1c22"))
    g.inputs["Glanz"].default_value = float(meta.get("gloss", 0.6))
    g.inputs["Transluzenz"].default_value = float(meta.get("translucency", 0.5))
    g.inputs["Materialart"].default_value = MATERIAL_KIND.get(look, 0)
    g.inputs["Muster"].default_value = PATTERN_KIND.get(pattern.get("kind", "none"), 0)
    if pattern:
        g.inputs["Muster-Tinte"].default_value = hex_to_rgba(pattern.get("ink", "#0f1c22"))
        g.inputs["Muster-Licht"].default_value = hex_to_rgba(pattern.get("light", "#eeecd6"))
        g.inputs["Muster-Licht 2"].default_value = hex_to_rgba(pattern.get("light2") or pattern.get("light", "#eeecd6"))
        g.inputs["Musterkontrast"].default_value = float(pattern.get("contrast", 0.8))
        g.inputs["Musterskala"].default_value = float(pattern.get("scale", 1.0))
        g.inputs["Musterdrehung"].default_value = float(pattern.get("rotation", 0.0))
    out = t.node("ShaderNodeOutputMaterial", loc=(300, 0))
    t.link(g.outputs["Shader"], out.inputs["Surface"])
    set_blend(mat, kind == "gas")
    mat.diffuse_color = hex_to_rgba(base_hex)  # Farbe im Solid-/Workbench-Modus
    mat["ee_materialart"] = look
    return mat


# --- Module --------------------------------------------------------------------------------------------

MODULE_MATERIALS = {
    # Materialname im Modul → (Eigenschaft am Sockel/Objekt, Standardfarbe, Beschreibung)
    "Tint": ("ee_tint", "#8ad6c8", "Körper-/Slotfarbe laut Regeln (Sockel-Eigenschaft ee_tint)"),
    "Ink": ("ee_ink", "#0f1c22", "Zonen-Tinte"),
    "Bone": ("ee_bone", "#f7f6d8", "Zonen-Knochenfarbe"),
    "Accent": ("ee_accent", "#22baa9", "Zonen-/Art-Akzent"),
    "Iris": ("ee_iris", "#e8a33c", "Iris (Bernstein; bei Tieren Tinte)"),
}


def _flat_band(t, color, lit_socket):
    """Zwei harte Bänder auf einer Farbe (Schatten = 60 %)."""
    dark = t.mix(0.4, color, t.rgb((0.0, 0.0, 0.0, 1.0)))
    return t.mix(t.gt(lit_socket, 0.04), dark, color)


def module_material(material_name):
    """Gemeinsames Material einer Modul-Materialsorte: Farbe aus der Eigenschaft des Sockels (Instanzierer) oder des Objekts."""
    prop, default_hex, desc = MODULE_MATERIALS.get(material_name, ("ee_tint", "#8ad6c8", ""))
    name = f"Modul · {material_name}"
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    a_inst = t.node("ShaderNodeAttribute", attribute_type="INSTANCER", attribute_name=prop)
    a_obj = t.node("ShaderNodeAttribute", attribute_type="OBJECT", attribute_name=prop)
    fallback = t.rgb(hex_to_rgba(default_hex))
    # Instanzierer hat Vorrang (Sockel auf einem Wesen), dann das Objekt selbst (Bibliothek), dann die Standardfarbe.
    obj_len = t.vmath("LENGTH", a_obj.outputs["Vector"])
    inst_len = t.vmath("LENGTH", a_inst.outputs["Vector"])
    c = t.mix(t.gt(obj_len, 1e-5), fallback, a_obj.outputs["Color"])
    c = t.mix(t.gt(inst_len, 1e-5), c, a_inst.outputs["Color"])
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = light_group()
    col = _flat_band(t, c, lg.outputs["Licht"])
    if material_name in ("Ink", "Iris"):
        col = t.mix(t.mul(t.gt(lg.outputs["Glanz"], 0.6), 0.8), col, t.rgb((1.0, 1.0, 1.0, 1.0)))
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba(default_hex)
    mat["ee_farbquelle"] = f"{prop}: {desc}"
    return mat


def band_color(t, colors, thresholds, light):
    """Farbe aus Lichtstufen: colors[0] im Schatten … colors[-1] im vollen Licht (harte Kanten)."""
    col = t.rgb(hex_to_rgba(colors[0]) if isinstance(colors[0], str) else colors[0])
    for c, th in zip(colors[1:], thresholds):
        cc = t.rgb(hex_to_rgba(c)) if isinstance(c, str) else c
        col = t.mix(t.gt(light, th), col, cc)
    return col


def ramp_material(name, colors, thresholds=(0.04, 0.35, 0.7), blended=False):
    """Serigrafie-Material: Palettenstufen nach Sonnenlicht (Schatten = erste Farbe)."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    lg = t.node("ShaderNodeGroup")
    lg.node_tree = light_group()
    col = band_color(t, colors, thresholds, lg.outputs["Licht"])
    emis = t.node("ShaderNodeEmission")
    t.link(col, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba(colors[min(len(colors) - 1, 2)])
    set_blend(mat, blended)
    return mat


def flat_material(name, hexstr, banded=True):
    """Flache Palettenfarbe (Emission), optional mit zwei Lichtbändern."""
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    mat = new_material(name)
    t = NT(mat.node_tree)
    c = t.rgb(hex_to_rgba(hexstr))
    if banded:
        lg = t.node("ShaderNodeGroup")
        lg.node_tree = light_group()
        c = _flat_band(t, c, lg.outputs["Licht"])
    emis = t.node("ShaderNodeEmission")
    t.link(c, emis.inputs["Color"])
    out = t.node("ShaderNodeOutputMaterial")
    t.link(emis.outputs[0], out.inputs["Surface"])
    mat.diffuse_color = hex_to_rgba(hexstr)
    return mat
