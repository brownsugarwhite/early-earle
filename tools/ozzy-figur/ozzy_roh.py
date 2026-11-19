# Ozzy, Rohmodell aus Metaballs (Florian, 19.11.: "Ja blender klingt besser ... das weiß kann auch gerne aus einem shader kommen.
# Im gesicht vllt nicht aber am körper bzw den beinen schon ... Mach mal und wir schauen wie gut es rankommt").
#
# Maße aus seinen Zeichnungen (Front, Seite, Rücken), in Figur-Einheiten: X quer (Ozzys linke Seite +), Y nach unten (Boden 0),
# Z nach vorn (zur Nase). In Blender ist 1 Einheit 1 mm: x = X, y = -Z (Ozzy schaut nach -y, wie in der Frontansicht), z = -Y.
# Jede Form ist eine Metaball-Kugel oder -Kapsel: Sie fließen weich ineinander, und in Blender lässt sich jede einzeln verschieben
# und skalieren (das Netz folgt). Für den Browser wird ein Netz daraus gerechnet und als GLB geschrieben.
#
#   Blender -b --factory-startup --python tools/ozzy-figur/ozzy_roh.py -- <ausordner>
import math
import sys

import bpy
import mathutils

AUS = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '.'
S = 0.001
# sichtbarer Radius einer Metaball-Kugel je Radius (Schwelle 0,6, Steifheit 2; gemessen)
K = 0.5748

bpy.ops.wm.read_factory_settings(use_empty=True)
szene = bpy.context.scene
coll = szene.collection


def P(X, Y, Z):
    return mathutils.Vector((X * S, -Z * S, -Y * S))


def metaball(name, aufloesung=3.0):
    mb = bpy.data.metaballs.new(name)
    mb.threshold = 0.6
    mb.resolution = aufloesung * S
    mb.render_resolution = 1.5 * S
    ob = bpy.data.objects.new(name, mb)
    coll.objects.link(ob)
    return ob, mb


def ellipsoid(mb, c, quer, hoch, laengs, steif=2.0):
    """Ellipsoid um c mit den halben Achsen quer (X), hoch (Y), längs (Z)"""
    el = mb.elements.new(type='ELLIPSOID')
    el.co = P(*c)
    # Blender begrenzt size auf 20: die größte Achse über den Radius, die anderen als Anteil
    m = max(quer, hoch, laengs)
    el.radius = m * S / K
    el.size_x, el.size_y, el.size_z = quer / m, laengs / m, hoch / m
    el.stiffness = steif
    return el


def kapsel(mb, p0, p1, r, steif=2.0):
    """Kapsel von p0 nach p1 (Figur-Einheiten) mit dem Radius r"""
    a = P(*p0)
    b = P(*p1)
    d = b - a
    el = mb.elements.new(type='CAPSULE')
    el.co = (a + b) / 2
    el.radius = r * S / K
    el.size_x = d.length / 2
    el.stiffness = steif
    el.rotation = mathutils.Vector((1, 0, 0)).rotation_difference(d.normalized())
    return el


# ---- Körper: Bohne, Beine, Schwanz (eine Familie: fließen ineinander) ----
# Maße Zeile für Zeile aus Front und Seite gelesen (19.11.): Bohne 216 breit, 259 lang, oben -250, unten um -45
BOHNE = ((2, -145, 0), 106, 102, 128)
koerper, mbK = metaball('Koerper')
ellipsoid(mbK, *BOHNE)
BEINE = {
    # Name: (X, Z) der Beinachse (Front: Vorderbeine eng, Hinterbeine breiter; Seite: vorn 61, hinten -85)
    'beinRV': (-52, 61),
    'beinLV': (52, 61),
    'beinRH': (-62, -85),
    'beinLH': (62, -85),
}
R_BEIN = 43
for n, (x, z) in BEINE.items():
    kapsel(mbK, (x, -R_BEIN, z), (x, -122, z), R_BEIN)
SCHWANZ = ((0, -130, -145), 37)
ellipsoid(mbK, SCHWANZ[0], SCHWANZ[1], SCHWANZ[1], SCHWANZ[1])

# ---- Kopf: Schädel, Schnauze, Bart (eigene Familie) ----
# fast eine Kugel: 270 breit (Front), 255 hoch, von -48 bis 204 tief (Seite); unten vorn der Bart bis -100
kopf, mbH = metaball('Kopf')
ellipsoid(mbH, (0, -236, 80), 132, 112, 118)
ellipsoid(mbH, (0, -158, 108), 100, 52, 78)

# ---- Nase ----
nase, mbN = metaball('Nase', 1.5)
ellipsoid(mbN, (4, -250, 188), 24, 15, 17)


# ---- Ohren: runde Kegel, an der Spitze rund, nach außen geneigt ----
def ohr(name, seite):
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=32, radius=1.0)
    for v in bm.verts:
        t = (v.co.z + 1) / 2  # 0 unten, 1 Spitze
        # unten rund wie ein Ei, oben spitz zulaufend (Florians Ohren: breit und tief, Spitze nach oben außen)
        f = 1 - 0.62 * max(0.0, t - 0.35) ** 1.4 / 0.65 ** 1.4
        v.co.x *= f
        v.co.y *= f
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob.scale = (70 * S, 64 * S, 86 * S)
    ob.rotation_euler = (math.radians(-8), seite * math.radians(14), 0)
    ob.location = P(seite * 90, -330, 0)
    return ob


ohrR = ohr('OhrR', -1)
ohrL = ohr('OhrL', 1)

# ---- Netze rechnen (feine Auflösung), Fenster-Gewicht am Körper (Beine und Schwanz 1, Bohne 0) ----
for ob, mb in ((koerper, mbK), (kopf, mbH), (nase, mbN)):
    mb.resolution = mb.render_resolution
dg = bpy.context.evaluated_depsgraph_get()


def netz_von(ob, name):
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    me.name = name
    for p in me.polygons:
        p.use_smooth = True
    neu = bpy.data.objects.new(name, me)
    coll.objects.link(neu)
    return neu


netze = {
    'koerper': netz_von(koerper, 'koerper'),
    'kopf': netz_von(kopf, 'kopf'),
    'nase': netz_von(nase, 'nase'),
}


def kapsel_abstand(p, a, b, r):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.dot(ab)))
    return (p - (a + ab * t)).length - r


def bohne_abstand(p):
    c = P(*BOHNE[0])
    q = p - c
    ax = (BOHNE[1] * S, BOHNE[3] * S, BOHNE[2] * S)
    k = math.sqrt((q.x / ax[0]) ** 2 + (q.y / ax[1]) ** 2 + (q.z / ax[2]) ** 2)
    return (k - 1) * min(ax)


me = netze['koerper'].data
farbe = me.color_attributes.new('fenster', 'FLOAT_COLOR', 'POINT')
for v in me.vertices:
    p = v.co
    d_bein = min(kapsel_abstand(p, P(x, -R_BEIN, z), P(x, -122, z), R_BEIN * S) for x, z in BEINE.values())
    d_schwanz = (p - P(*SCHWANZ[0])).length - SCHWANZ[1] * S
    d = min(d_bein, d_schwanz)
    # 1, wo das Bein (der Schwanz) näher an der Fläche liegt als die Bohne; weich über 6 mm
    u = (bohne_abstand(p) - d) / (6 * S)
    w = max(0.0, min(1.0, 0.5 + 0.5 * u))
    farbe.data[v.index].color = (w, w, w, 1.0)
me.color_attributes.active_color = farbe

# Ohren als eigene Netze (Skalierung und Drehung angewandt)
for name, ob in (('ohrR', ohrR), ('ohrL', ohrL)):
    me = ob.data.copy()
    me.transform(ob.matrix_world)
    me.name = name
    neu = bpy.data.objects.new(name, me)
    coll.objects.link(neu)
    netze[name] = neu

# ---- Materialien (in Blender wie im Browser: schwarz; Fenster: Weiß, wo die Fläche zur Kamera schaut) ----
def material_schwarz():
    m = bpy.data.materials.new('Ozzy_Schwarz')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (0, 0, 0, 1)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    return m


def material_fenster():
    m = bpy.data.materials.new('Ozzy_Fenster')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
    ramp.color_ramp.elements[1].position = 0.45
    ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_name = 'fenster'
    mul = nt.nodes.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
    em = nt.nodes.new('ShaderNodeEmission')
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(lw.outputs['Facing'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mul.inputs[6])
    nt.links.new(attr.outputs['Color'], mul.inputs[7])
    nt.links.new(mul.outputs[2], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    return m


schwarz = material_schwarz()
fenster = material_fenster()
for name, ob in netze.items():
    ob.data.materials.clear()
    ob.data.materials.append(fenster if name == 'koerper' else schwarz)

# Messung: Rechtecke der Netze in Figur-Einheiten (X, Y, Z), zum Abgleich mit den Zeichnungen
for name, ob in netze.items():
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    X = [v.x / S for v in vs]
    Y = [-v.z / S for v in vs]
    Z = [-v.y / S for v in vs]
    print(f'MASS {name}: X {min(X):.0f}..{max(X):.0f}  Y {min(Y):.0f}..{max(Y):.0f}  Z {min(Z):.0f}..{max(Z):.0f}  Ecken {len(vs)}')

# Metaball-Vorlagen (zum Formen in Blender) ausblenden, Netze bleiben; sichern und als GLB schreiben
for ob in (koerper, kopf, nase, ohrR, ohrL):
    ob.hide_render = True
    ob.hide_set(True)
bpy.context.preferences.filepaths.save_version = 0  # keine .blend1-Kopie
bpy.ops.wm.save_as_mainfile(filepath=f'{AUS}/ozzy-roh.blend')
for ob in bpy.data.objects:
    ob.select_set(ob.name in netze)
bpy.ops.export_scene.gltf(
    filepath=f'{AUS}/ozzy-roh.glb',
    export_format='GLB',
    use_selection=True,
    export_vertex_color='NAME',
    export_vertex_color_name='fenster',
    export_all_vertex_colors=True,
    export_materials='EXPORT',
    export_yup=True,
)
print('FERTIG')
