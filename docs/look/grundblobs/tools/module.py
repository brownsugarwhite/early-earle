"""Zerlegt Meshy-Modelle in Module (Beine, Kopf, Hals, Rumpf, Schwanz, Unterkiefer) für die Mischwesen.

Ablauf pro Modell:
1. pymeshlab: GLB laden, texturtreu ausdünnen (Quadric Edge Collapse mit Texturkoordinaten).
2. Teile per Bedingung auf die Flächenmitte auswählen (Ebenen, Ellipsoid), als eigenes Mesh erzeugen und
   auf die Zielgröße ausdünnen.
3. trimesh: Beine in Zusammenhangskomponenten trennen; pro Modul Andockpunkt (Mitte des Schnittrands),
   Richtung und Länge vermessen; glatte Normalen über UV-Nähte hinweg.
4. Packen: Positionen uint16, Normalen int8, UV uint16, Indizes uint16/uint32, gzip + base64
   -> assets/module-mesh.txt; Texturen als JPEG 1024 -> assets/module-<modell>.jpg; Verzeichnis assets/module.json.

Alle Meshy-Modelle schauen nach +z, y ist oben (siehe Rasterbilder).
Aufruf: python3 module.py <meshy-ordner> <assets-ordner> <arbeitsordner>
"""
import sys, os, json, gzip, base64, io
import numpy as np
import pymeshlab
import trimesh
from PIL import Image
from scipy.spatial import cKDTree

MESHY, ASSETS, WORK = sys.argv[1:4]
os.makedirs(WORK, exist_ok=True)

C = '((x0+x1+x2)/3)', '((y0+y1+y2)/3)', '((z0+z1+z2)/3)'
cx, cy, cz = C
BEIN = (f'({cy} < 0.12) && ((({cx})/0.60)^2 + (({cy}-0.15)/0.57)^2 + (({cz}+0.10)/0.84)^2 > 1.04)'
        f' && (((({cx})/0.56)^2 + (({cz}+0.10)/0.80)^2 > 0.92) || ({cy} < -0.46))')
BEIN_G = (f'({cy} < -0.55) && (((({cx}-0.22)^2 + ({cz}-0.31)^2) < 0.02) || ((({cx}+0.22)^2 + ({cz}-0.31)^2) < 0.02)'
          f' || ((({cx}-0.22)^2 + ({cz}+0.29)^2) < 0.02) || ((({cx}+0.22)^2 + ({cz}+0.29)^2) < 0.02))')
MODELLE = {
    'spinne': dict(datei='spinne/Meshy_AI_Autumn_Ember_Spider_1005075928_texture.glb', grob=180000, module={
        # Beine: unterhalb der Rumpfmitte, außerhalb des Rumpf-Ellipsoids und außerhalb der Bauch-Grundfläche
        'beine': dict(bed=BEIN, ziel=36000, split=True, wurzel=lambda p: np.linalg.norm((p - [0, 0.15, -0.10]) / [0.60, 0.57, 0.84], axis=1) < 1.12),
        'rumpf': dict(bed=f'(({BEIN}) == 0)', ziel=14000),
    }),
    'giraffe': dict(datei='giraffe/Meshy_AI_Roaring_Giraffe_Monst_1005074343_texture.glb', grob=160000, module={
        'kopfhals': dict(bed=f'({cy} > -0.08) && ({cz} > -0.36)', ziel=16000, wurzel=lambda p: p[:, 1] < -0.04),
        'schwanz': dict(bed=f'({cz} < -0.36) && ({cy} > -0.62)', ziel=2500, wurzel=lambda p: p[:, 2] > -0.40),
        'beine': dict(bed=BEIN_G, ziel=8000, split=True, wurzel=lambda p: p[:, 1] > -0.60),
        'rumpf': dict(bed=f'({cy} <= -0.08) && ({cz} >= -0.36) && (({BEIN_G}) == 0)', ziel=9000,
                      sockel={'hals': lambda p: p[:, 1] > -0.12, 'schwanz': lambda p: p[:, 2] < -0.32}),
    }),
    'rex': dict(datei='rex/Meshy_AI_Roaring_Emberfang_1005075231_texture.glb', grob=170000, module={
        'unterkiefer': dict(bed=f'({cz} > 0.40) && ({cy} > -0.32) && ({cy} < 0.10)', ziel=7000, wurzel_fest=[0.0, 0.08, 0.42]),
        'oberkopf': dict(bed=f'({cz} > 0.30) && ({cy} > -0.32) && ((({cz} > 0.40) && ({cy} < 0.10)) == 0)', ziel=12000, wurzel=lambda p: p[:, 2] < 0.34),
        'rumpf': dict(bed=f'((({cz} > 0.30) && ({cy} > -0.32)) == 0)', ziel=14000, sockel={'hals': lambda p: p[:, 2] > 0.26}),
    }),
    'goldie': dict(datei='goldie/Meshy_AI_Golden_Yawn_1005074643_texture.glb', grob=170000, module={
        'kopf': dict(bed=f'({cy} > -0.02) && ({cz} > 0.12)', ziel=16000, wurzel=lambda p: (p[:, 1] < 0.03) | (p[:, 2] < 0.17)),
        'rumpf': dict(bed=f'((({cy} > -0.02) && ({cz} > 0.12)) == 0)', ziel=16000, sockel={'hals': lambda p: (p[:, 1] > -0.07) & (p[:, 2] > 0.07)}),
    }),
}
NUR = [x for x in os.environ.get('MODELLE', '').split(',') if x]


def ausduennen(ms, ziel):
    for rand in (True, False):
        if ms.current_mesh().face_number() > ziel * 1.15:
            ms.meshing_decimation_quadric_edge_collapse_with_texture(targetfacenum=int(ziel), preserveboundary=rand, qualitythr=0.3, extratcoordw=1.0, preservenormal=True)


def glb_textur(pfad):
    import struct
    d = open(pfad, 'rb').read()
    jl, _ = struct.unpack('<II', d[12:20])
    j = json.loads(d[20:20 + jl])
    mat = j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']
    im = j['images'][j['textures'][mat]['source']]
    bv = j['bufferViews'][im['bufferView']]
    off = 20 + jl + 8 + bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(d[off:off + bv['byteLength']]))


def aus_meshset(ms):
    # Wedge-UVs in Vertex-UVs umwandeln (Vertices an UV-Nähten doppeln)
    m = ms.current_mesh()
    V, F, W = m.vertex_matrix(), m.face_matrix(), m.wedge_tex_coord_matrix()
    cv = F.reshape(-1)
    qu = np.round(np.clip(W, -4, 4) * 100000).astype(np.int64)
    key = cv.astype(np.int64) * (1 << 40) + (qu[:, 0] + (1 << 19)) * (1 << 20) + (qu[:, 1] + (1 << 19))
    uk, first, inv = np.unique(key, return_index=True, return_inverse=True)
    t = trimesh.Trimesh(V[cv[first]], inv.reshape(-1, 3), process=False)
    t.visual = trimesh.visual.TextureVisuals(uv=W[first])
    return t


def glatte_normalen(m):
    # Normalen über UV-Nähte hinweg: über die Position verschweißen, dann zurück abbilden
    w = trimesh.Trimesh(m.vertices.copy(), m.faces.copy(), process=False)
    w.merge_vertices(merge_tex=True, merge_norm=True)
    n = np.asarray(w.vertex_normals)
    _, idx = cKDTree(np.asarray(w.vertices)).query(np.asarray(m.vertices))
    return n[idx]


verzeichnis = json.load(open(f'{ASSETS}/module.json')) if os.path.exists(f'{ASSETS}/module.json') and NUR else {'modelle': {}, 'teile': {}}
teile_bin = {}
for name, cfg in MODELLE.items():
    if NUR and name not in NUR:
        continue
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(os.path.join(MESHY, cfg['datei']))
    ausduennen(ms, cfg['grob'])
    grob_id = ms.current_mesh_id()
    # Textur einmal pro Modell (1024er JPEG), direkt aus dem GLB gelesen
    img = glb_textur(os.path.join(MESHY, cfg['datei']))
    img = img.convert('RGB').resize((1024, 1024), Image.LANCZOS)
    img.save(f'{ASSETS}/module-{name}.jpg', quality=88)
    verzeichnis['modelle'][name] = dict(textur=f'assets/module-{name}.jpg', datei=cfg['datei'])
    for teil, tc in cfg['module'].items():
        ms.set_current_mesh(grob_id)
        ms.compute_selection_by_condition_per_face(condselect=tc['bed'])
        ms.generate_from_selected_faces()
        ausduennen(ms, tc['ziel'])
        m = aus_meshset(ms)
        # Topologie ohne UV-Nähte (über die Position verschweißt) für Komponenten und Schnittrand
        wm = trimesh.Trimesh(m.vertices.copy(), m.faces.copy(), process=False)
        wm.merge_vertices(merge_tex=True, merge_norm=True)
        gruppen = [np.arange(len(m.faces))]
        if tc.get('split'):
            lab = trimesh.graph.connected_component_labels(wm.face_adjacency, node_count=len(wm.faces))
            gruppen = [np.nonzero(lab == l)[0] for l in np.unique(lab)]
            gruppen = [g for g in gruppen if len(g) > 0.04 * len(m.faces)]
            gruppen = sorted(gruppen, key=lambda g: np.arctan2(m.triangles_center[g, 0].mean(), m.triangles_center[g, 2].mean()))
        for k, g in enumerate(gruppen):
            s = m.submesh([g], append=True)
            sw = wm.submesh([g], append=True)
            key = f'{name}_{teil}' + (f'_{k + 1}' if tc.get('split') else '')
            v = np.asarray(s.vertices, np.float64)
            uv = np.asarray(s.visual.uv, np.float64)
            n = glatte_normalen(s)
            # Schnittrand: Kanten des verschweißten Meshes, die nur zu einer Fläche gehören
            e = sw.edges_sorted
            uniq, cnt = np.unique(e, axis=0, return_counts=True)
            rand = np.unique(uniq[cnt == 1])
            wv = np.asarray(sw.vertices)
            rp = wv[rand] if len(rand) else wv
            if 'wurzel' in tc and len(rp):
                rf = rp[tc['wurzel'](rp)]
                rp = rf if len(rf) else rp
            wurzel = np.array(tc['wurzel_fest']) if 'wurzel_fest' in tc else rp.mean(0)
            sockel = {}
            for sn, sf in tc.get('sockel', {}).items():
                alle = wv[rand]
                sp = alle[sf(alle)] if len(alle) else alle
                if len(sp):
                    sockel[sn] = dict(mitte=sp.mean(0).round(5).tolist(), radius=round(float(np.linalg.norm(sp - sp.mean(0), axis=1).mean()), 5))
            spitze = v[np.argmax(np.linalg.norm(v - wurzel, axis=1))]
            richtung = (spitze - wurzel) / (np.linalg.norm(spitze - wurzel) + 1e-9)
            teile_bin[key] = (v, n, uv, np.asarray(s.faces))
            verzeichnis['teile'][key] = dict(modell=name, teil=teil, dreiecke=int(len(s.faces)), wurzel=wurzel.round(5).tolist(),
                                             richtung=richtung.round(5).tolist(), laenge=round(float(np.linalg.norm(spitze - wurzel)), 5),
                                             min=v.min(0).round(5).tolist(), max=v.max(0).round(5).tolist(),
                                             randradius=round(float(np.linalg.norm(rp - wurzel, axis=1).mean()), 5) if len(rand) else 0.0, sockel=sockel)
            print(key, len(s.faces), 'Wurzel', wurzel.round(3), 'Richtung', richtung.round(2), flush=True)

# Packen (bestehende Teile anderer Modelle aus dem Arbeitsordner behalten)
alt = {}
if NUR and os.path.exists(f'{WORK}/teile.npz'):
    z = np.load(f'{WORK}/teile.npz', allow_pickle=True)
    alt = z['teile'].item()
alt.update({k: v for k, v in teile_bin.items()})
np.savez_compressed(f'{WORK}/teile.npz', teile=np.array(alt, dtype=object))
blob = bytearray()
for key, (v, n, uv, f) in alt.items():
    e = verzeichnis['teile'][key]
    lo, hi = v.min(0), v.max(0)
    q = np.round((v - lo) / np.maximum(hi - lo, 1e-9) * 65535).astype(np.uint16)
    nn = np.zeros((len(n), 4), np.int8); nn[:, :3] = np.clip(np.round(n * 127), -127, 127)
    uq = np.round(np.clip(uv, 0, 1) * 65535).astype(np.uint16)
    idx = f.astype(np.uint16 if len(v) < 65536 else np.uint32)
    e.update(vertices=int(len(v)), idx32=bool(len(v) >= 65536))
    for nm, arr in (('pos', q), ('nor', nn), ('uv', uq), ('idx', idx)):
        while len(blob) % 4:
            blob.append(0)
        e[nm] = len(blob)
        blob += arr.tobytes()
gz = gzip.compress(bytes(blob), 9)
open(f'{ASSETS}/module-mesh.txt', 'w').write(base64.b64encode(gz).decode())
json.dump(verzeichnis, open(f'{ASSETS}/module.json', 'w'), indent=1)
print('gepackt', round(len(gz) / 1e6, 2), 'MB gzip,', len(alt), 'Teile')
