"""Stufe 1 Modulsystem: Schnittlinien entlang der Anatomie bestimmen (noch nicht schneiden).

Pro Modell:
1. Mesh laden (pymeshlab), für die Analyse auf höchstens ~300k Dreiecke ausdünnen.
2. Voxelisieren, glätten (Fellsträhnen weg), 3D-Skelett (skimage), Graph der Skelett-Voxel.
3. Pro Körperteil (Hinweispunkt nahe der Spitze): Pfad im Skelett von der Spitze zur Rumpfmitte.
4. Entlang des Pfads Querschnitte senkrecht zur Pfadrichtung: Fläche und Umfang der Schleife um den Pfad.
   Übergang Rumpf -> Teil: erste Stelle (von innen nach außen), an der die Fläche unter das 1,35-fache
   des typischen Teil-Querschnitts fällt (Minima-Regel: Grenzen liegen am Ende des starken Abfalls).
5. Verfeinern: in der Nähe dieser Stelle Lage und Neigung der Schnittebene so wählen, dass die Schleife
   am kürzesten ist (die natürliche Taille/Falte), solange sie eine einzelne geschlossene Schleife bleibt.
6. Ausgabe: Schleifen als Punktlisten, Ebene, Umfang -> JSON; Anzeige-Mesh (texturtreu ausgedünnt) gepackt.

Aufruf: python3 schnittlinien.py <meshy-ordner> <assets-ordner> <arbeitsordner>   (MODELLE=giraffe für eines)
"""
import sys, os, json, gzip, base64, io, itertools, time
import numpy as np
import pymeshlab
import trimesh
import networkx as nx
from PIL import Image
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from skimage.morphology import skeletonize

MESHY, ASSETS, WORK = sys.argv[1:4]
os.makedirs(WORK, exist_ok=True)

# Hinweispunkte: grob die Spitze des Teils (Weltkoordinaten der Meshy-Modelle, Blick nach +z, y oben).
# 'rumpf' ist ein Punkt in der Rumpfmitte. Die genaue Lage findet das Verfahren selbst.
MODELLE = {
    'giraffe': dict(datei='giraffe/Meshy_AI_Roaring_Giraffe_Monst_1005074343_texture.glb', rumpf=[0, -0.42, -0.02], teile={
        'hals': [0.0, 0.42, 0.40], 'kopf': [0.0, 0.88, 0.54],
        'bein_vl': [0.15, -0.88, 0.30], 'bein_vr': [-0.15, -0.88, 0.30], 'bein_hl': [0.2, -0.88, -0.27], 'bein_hr': [-0.2, -0.88, -0.27],
        'schwanz': [0.0, -0.24, -0.58]}),
    'spinne': dict(datei='spinne/Meshy_AI_Autumn_Ember_Spider_1005075928_texture.glb', rumpf=[0, 0.15, -0.10], teile={
        f'bein_{i + 1}': (dict(spitze=[-0.5, -0.75, 0.85], ansatz=[-0.28, -0.15, 0.54]) if i == 3 else p)   # Bein 4: Skelett erreicht die Spitze nicht, Ansatz gespiegelt von Bein 5
        for i, p in enumerate([[-0.62, -0.75, -0.75], [-0.85, -0.70, -0.2], [-0.80, -0.70, 0.35], [-0.40, -0.72, 0.78],
                                                  [0.5, -0.75, 0.85], [0.80, -0.70, 0.35], [0.85, -0.70, -0.2], [0.62, -0.75, -0.75]])}),
    'rex': dict(datei='rex/Meshy_AI_Roaring_Emberfang_1005075231_texture.glb', rumpf=[0, -0.25, -0.1], teile={
        'kopf': dict(spitze=[0.0, 0.30, 0.70], ansatz=[0.0, 0.08, 0.26], max_z=0.40, gross=True),   # Maul offen: Schnitt hinter den Mundwinkeln (z < 0.42)
        'arm_l': dict(spitze=[0.33, -0.22, 0.45], ansatz=[0.26, -0.20, 0.35]), 'arm_r': dict(spitze=[-0.33, -0.22, 0.45], ansatz=[-0.26, -0.20, 0.35]),
        'bein_l': dict(spitze=[0.30, -0.66, 0.30], ansatz=[0.29, -0.53, 0.25]), 'bein_r': dict(spitze=[-0.30, -0.66, 0.30], ansatz=[-0.29, -0.53, 0.25]),
        'schwanz': [0.0, 0.05, -0.93]},
        hinweise=['Der Rex hat keinen Hals: Ein Kopfschnitt hinter den Mundwinkeln läuft durch den ganzen Oberkörper (grauer Ring, unsicher). Für tauschbare Köpfe braucht es ein Modell mit erkennbarem Hals.', 'Die Hinterbeine sind fast ganz Oberschenkel und gehören zum Rumpf; trennbar ist der Unterschenkel mit Fuß (Linie am Knöchel).']),
    'goldie': dict(datei='goldie/Meshy_AI_Golden_Yawn_1005074643_texture.glb', rumpf=[0, -0.25, -0.1], teile={
        'kopf': dict(spitze=[0.0, 0.35, 0.75], ansatz=[0.0, 0.12, 0.40], max_z=0.60, gross=True),   # Maul offen: Schnitt hinter den Mundwinkeln
        'ohr_l': dict(spitze=[0.40, 0.08, 0.50], ansatz=[0.26, 0.30, 0.48]), 'ohr_r': dict(spitze=[-0.40, 0.08, 0.50], ansatz=[-0.26, 0.30, 0.48]),
        'schwanz': [0.0, 0.30, -0.62]},
        hinweise=['Kopf: Der Hals liegt unter der Mähne und das Maul ist offen; hinter den Mundwinkeln gibt es keine geschlossene Schleife, die nicht durch die ganze Brust läuft. Deshalb hier keine Kopflinie. Für tauschbare Köpfe braucht es ein Modell mit erkennbarem Hals.', 'Die Vorderbeine liegen ganz unter dem Fell, nur die Pfoten schauen heraus: ein sauberer Beinschnitt ist an diesem Modell nicht möglich. Für tauschbare Beine braucht es ein Modell mit sichtbaren Beinen.']),
}
NUR = [x for x in os.environ.get('MODELLE', '').split(',') if x]


def lade(pfad, max_faces=300000, anzeige=60000):
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(pfad)
    if ms.current_mesh().face_number() > max_faces:
        ms.meshing_decimation_quadric_edge_collapse_with_texture(targetfacenum=max_faces, preserveboundary=True, qualitythr=0.3, extratcoordw=1.0)
    m = ms.current_mesh()
    ana = trimesh.Trimesh(m.vertex_matrix(), m.face_matrix(), process=True)
    # Anzeige-Mesh mit Texturkoordinaten
    ms.meshing_decimation_quadric_edge_collapse_with_texture(targetfacenum=anzeige, preserveboundary=True, qualitythr=0.3, extratcoordw=1.0)
    m = ms.current_mesh()
    V, F, W = m.vertex_matrix(), m.face_matrix(), m.wedge_tex_coord_matrix()
    cv = F.reshape(-1)
    qu = np.round(np.clip(W, -4, 4) * 100000).astype(np.int64)
    key = cv.astype(np.int64) * (1 << 40) + (qu[:, 0] + (1 << 19)) * (1 << 20) + (qu[:, 1] + (1 << 19))
    _, first, inv = np.unique(key, return_index=True, return_inverse=True)
    show = dict(v=V[cv[first]], f=inv.reshape(-1, 3), uv=W[first])
    return ana, show


def skelett(mesh):
    pitch = (mesh.bounds[1] - mesh.bounds[0]).max() / 150
    vox = mesh.voxelized(pitch).fill()
    occ = ndi.binary_fill_holes(ndi.binary_closing(vox.matrix, iterations=2))
    occ = ndi.binary_opening(occ, structure=ndi.generate_binary_structure(3, 1), iterations=1)
    sk = skeletonize(occ)
    pts = np.argwhere(sk)
    world = vox.transform[:3, 3] + pts * pitch
    idx = {tuple(p): i for i, p in enumerate(pts)}
    G = nx.Graph()
    for i, p in enumerate(pts):
        G.add_node(i)
        for d in itertools.product((-1, 0, 1), repeat=3):
            if d == (0, 0, 0):
                continue
            q = tuple(p + np.array(d))
            if q in idx:
                G.add_edge(i, idx[q], weight=float(np.linalg.norm(d)))
    G = G.subgraph(max(nx.connected_components(G), key=len)).copy()
    return G, world, pitch


def schleife(mesh, origin, normal, nahe):
    """Querschnitt: geschlossene Schleife um den Punkt 'nahe'. Liefert (Punkte, Umfang, Fläche) oder None."""
    sec = mesh.section(plane_origin=origin, plane_normal=normal)
    if sec is None:
        return None
    best = None
    for ent in sec.discrete:
        if len(ent) < 6 or np.linalg.norm(ent[0] - ent[-1]) > 1e-4 * 50:
            continue
        # Abstand der Schleife zum Pfadpunkt; Schleife muss den Punkt umschließen (2D-Test in der Ebene)
        n = normal / np.linalg.norm(normal)
        a = np.cross(n, [0, 1, 0] if abs(n[1]) < 0.9 else [1, 0, 0]); a /= np.linalg.norm(a)
        b = np.cross(n, a)
        p2 = np.stack([(ent - nahe) @ a, (ent - nahe) @ b], 1)
        # Punkt-in-Polygon (Strahl nach +x)
        x, y = p2[:, 0], p2[:, 1]
        x2, y2 = np.roll(x, -1), np.roll(y, -1)
        cross = ((y > 0) != (y2 > 0)) & (0 < x + (0 - y) * (x2 - x) / (y2 - y + 1e-12))
        if cross.sum() % 2 == 0:
            continue
        per = float(np.linalg.norm(np.diff(ent, axis=0), axis=1).sum())
        area = float(0.5 * abs(np.dot(x, y2) - np.dot(x2, y)))
        if best is None or area < best[2]:
            best = (ent, per, area)
    return best


def sonde(mesh, spitze, rumpf, n=70):
    # Gerade von der Spitze zur Rumpfmitte (für kleine oder angewachsene Teile ohne eigenen Skelettast)
    t = np.linspace(0, 1, n)[:, None]
    return (np.asarray(rumpf) * t + np.asarray(spitze) * (1 - t))[::-1]


def schnitt_landmarke(mesh, spitze, ansatz, max_z=None, gross=False):
    # Gesetzter Ansatzpunkt: Achse Ansatz -> Spitze; in der Nähe des Ansatzes die kürzeste geschlossene Schleife suchen
    spitze, ansatz = np.asarray(spitze, float), np.asarray(ansatz, float)
    d = spitze - ansatz; L = np.linalg.norm(d); d /= L
    a = np.cross(d, [0, 1, 0] if abs(d[1]) < 0.9 else [1, 0, 0]); a /= np.linalg.norm(a)
    b = np.cross(d, a)
    ref = schleife(mesh, ansatz + d * 0.5 * L, d, ansatz + d * 0.5 * L)   # Querschnitt in der Mitte des Teils
    typisch = ref[2] if ref else None
    best = None
    for off in np.linspace(-0.25, 0.35, 13) * L:
        o = ansatz + d * off
        for wa in np.radians([-30, -15, 0, 15, 30]):
            for wb in np.radians([-30, -15, 0, 15, 30]):
                nn = d * np.cos(wa) * np.cos(wb) + a * np.sin(wa) + b * np.sin(wb)
                sl = schleife(mesh, o, nn, o)
                if sl is None or (typisch and not gross and (sl[2] > 3.0 * typisch or sl[2] < 0.6 * typisch)):
                    continue
                if max_z is not None and sl[0][:, 2].max() > max_z:
                    continue
                if np.linalg.norm(sl[0].mean(0) - ansatz) > (0.35 if gross else 0.6) * L:   # nicht vom Ansatz wegwandern (z. B. an die Backe)
                    continue
                if best is None or sl[1] < best[0]:
                    best = (sl[1], sl, o, nn)
    P = np.stack([ansatz, spitze])
    return best, P, typisch


def schnitt_fuer(mesh, G, world, pitch, spitze, rumpf_node, von_spitze=False, rumpf=None):
    dist, tip = cKDTree(world[list(G.nodes)]).query(spitze)
    tip = list(G.nodes)[tip]
    path = nx.shortest_path(G, rumpf_node, tip, weight='weight')
    P = world[path]
    methode = 'skelett'
    if dist > 0.22 or len(P) < 8:
        P = sonde(mesh, spitze, rumpf)
        methode = 'sonde'
    # glätten
    if len(P) > 5:
        k = 3
        Ps = np.array([P[max(0, i - k):i + k + 1].mean(0) for i in range(len(P))])
    else:
        Ps = P
    T = np.gradient(Ps, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-9
    werte = []
    for i in range(len(Ps)):
        s = schleife(mesh, Ps[i], T[i], Ps[i])
        werte.append(s[2] if s else np.nan)
    werte = np.array(werte)
    n = len(werte)
    if von_spitze:
        # Kopf auf Hals: typischer Querschnitt ist der des Halses (Mitte des Pfads); Schnitt dort, wo es von der Spitze her schmal wird
        mitte = werte[int(n * 0.35):int(n * 0.75)]
        typisch = np.nanmedian(mitte) if np.isfinite(mitte).any() else np.nanmedian(werte)
        kand = [i for i in range(n - 1, -1, -1) if np.isfinite(werte[i]) and werte[i] < 1.35 * typisch]
        i0 = kand[0] if kand else n // 2
    else:
        aussen = werte[int(n * 0.45):]
        typisch = np.nanmedian(aussen) if np.isfinite(aussen).any() else np.nanmedian(werte)
        kand = [i for i in range(n) if np.isfinite(werte[i]) and werte[i] < 1.35 * typisch]
        i0 = kand[0] if kand else n // 2
    # Verfeinern: Lage und Neigung mit kürzester Schleife
    best = None
    a = np.cross(T[i0], [0, 1, 0] if abs(T[i0][1]) < 0.9 else [1, 0, 0]); a /= np.linalg.norm(a)
    b = np.cross(T[i0], a)
    for di in range(-4, 5):
        j = min(max(i0 + di, 0), n - 1)
        for wa in np.radians([-24, -12, 0, 12, 24]):
            for wb in np.radians([-24, -12, 0, 12, 24]):
                nn = T[i0] * np.cos(wa) * np.cos(wb) + a * np.sin(wa) + b * np.sin(wb)
                s = schleife(mesh, Ps[j], nn, Ps[j])
                if s is None:
                    continue
                # Kürzeste Schleife, aber nicht kleiner als 60 % des typischen Teil-Querschnitts (nicht in das Teil hineinrutschen)
                if s[2] < 0.6 * typisch:
                    continue
                score = s[1]
                if best is None or score < best[0]:
                    best = (score, s, Ps[j], nn)
    if best is None:
        s = schleife(mesh, Ps[i0], T[i0], Ps[i0])
        best = (s[1], s, Ps[i0], T[i0]) if s else None
    return best, Ps, werte, i0, methode, typisch


ausgabe = json.load(open(f'{ASSETS}/schnittlinien.json')) if (NUR and os.path.exists(f'{ASSETS}/schnittlinien.json')) else {'modelle': {}}
for name, cfg in MODELLE.items():
    if NUR and name not in NUR:
        continue
    t0 = time.time()
    mesh, show = lade(os.path.join(MESHY, cfg['datei']))
    G, world, pitch = skelett(mesh)
    nodes = list(G.nodes)
    rumpf_node = nodes[int(cKDTree(world[nodes]).query(cfg['rumpf'])[1])]
    res = {'schnitte': {}, 'skelett': [], 'hinweise': cfg.get('hinweise', [])}
    for (u, v) in G.edges():
        res['skelett'].append([world[u].round(4).tolist(), world[v].round(4).tolist()])
    for teil, hint in cfg['teile'].items():
        if isinstance(hint, dict):
            best, Ps, typisch = schnitt_landmarke(mesh, hint['spitze'], hint['ansatz'], hint.get('max_z'), hint.get('gross', False))
            methode = 'gesetzt'
        else:
            best, Ps, werte, i0, methode, typisch = schnitt_fuer(mesh, G, world, pitch, np.array(hint), rumpf_node, von_spitze=(teil == 'kopf' and name == 'giraffe'), rumpf=cfg['rumpf'])
        if best is None:
            print(name, teil, 'kein Schnitt gefunden', flush=True)
            continue
        _, (loop, per, area), o, nrm = best
        # Plausibel? Die Schleife darf nicht quer durch den Rumpf laufen (größer als die Hälfte des größten Rumpfquerschnitts)
        rumpf_max = max((schleife(mesh, np.array(cfg['rumpf']), np.array(ax), np.array(cfg['rumpf'])) or (0, 0, 0))[2] for ax in ([1, 0, 0], [0, 1, 0], [0, 0, 1]))
        unsicher = bool(area > 0.5 * rumpf_max or (methode == 'sonde') or (isinstance(hint, dict) and hint.get('gross')))
        # Schleife ausdünnen auf ~120 Punkte
        step = max(1, len(loop) // 120)
        res['schnitte'][teil] = dict(punkte=np.asarray(loop[::step]).round(5).tolist(), mitte=np.asarray(loop).mean(0).round(5).tolist(),
                                     normale=(nrm / np.linalg.norm(nrm)).round(4).tolist(), umfang=round(per, 4), flaeche=round(area, 5),
                                     pfad=Ps.round(4).tolist(), methode=methode, unsicher=unsicher)
        print(f'{name} {teil}: Umfang {per:.3f}, Mitte {np.asarray(loop).mean(0).round(3)}, {methode}{", UNSICHER" if unsicher else ""}', flush=True)
    # Textur und Anzeige-Mesh
    import struct
    d = open(os.path.join(MESHY, cfg['datei']), 'rb').read()
    jl, _ = struct.unpack('<II', d[12:20]); j = json.loads(d[20:20 + jl])
    im = j['images'][j['textures'][j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
    bv = j['bufferViews'][im['bufferView']]; off = 20 + jl + 8 + bv.get('byteOffset', 0)
    Image.open(io.BytesIO(d[off:off + bv['byteLength']])).convert('RGB').resize((1024, 1024), Image.LANCZOS).save(f'{ASSETS}/ganz-{name}.jpg', quality=88)
    v, f, uv = show['v'], show['f'], show['uv']
    sm = trimesh.Trimesh(v, f, process=False)
    w = sm.copy(); w.merge_vertices(merge_tex=True, merge_norm=True)
    nrm = np.asarray(w.vertex_normals)[cKDTree(np.asarray(w.vertices)).query(v)[1]]
    lo, hi = v.min(0), v.max(0)
    blob = bytearray()
    entry = dict(vertices=int(len(v)), dreiecke=int(len(f)), min=lo.round(6).tolist(), max=hi.round(6).tolist(), idx32=bool(len(v) >= 65536))
    nn = np.zeros((len(v), 4), np.int8); nn[:, :3] = np.clip(np.round(nrm * 127), -127, 127)
    for nm, arr in (('pos', np.round((v - lo) / (hi - lo) * 65535).astype(np.uint16)), ('nor', nn),
                    ('uv', np.round(np.clip(uv, 0, 1) * 65535).astype(np.uint16)), ('idx', f.astype(np.uint32 if entry['idx32'] else np.uint16))):
        while len(blob) % 4:
            blob.append(0)
        entry[nm] = len(blob); blob += arr.tobytes()
    open(f'{ASSETS}/ganz-{name}.txt', 'w').write(base64.b64encode(gzip.compress(bytes(blob), 9)).decode())
    res['anzeige'] = entry
    res['textur'] = f'assets/ganz-{name}.jpg'
    res['mesh'] = f'assets/ganz-{name}.txt'
    ausgabe['modelle'][name] = res
    json.dump(ausgabe, open(f'{ASSETS}/schnittlinien.json', 'w'))
    print(name, 'fertig', round(time.time() - t0, 1), 's', flush=True)
