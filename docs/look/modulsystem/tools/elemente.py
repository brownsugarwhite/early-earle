"""Modulsystem: Meshy-Modelle entlang der Schnittlinien aus Stufe 1 in Elemente zerlegen (Test-Abschluss).

System (siehe ../SYSTEM.md):
- Element = ein Stück eines Modells mit Typ (kopf, hals, bein, arm, schwanz, ohr, rumpf).
- Jedes Element außer dem Rumpf hat einen Andockring (Mitte, Normale vom Rumpf weg, Radius).
- Jedes Element kann selbst Sockel haben (z. B. der Hals trägt den Kopf). Sockel = Schnittringe auf seinem Rand.
- Andocken im Editor: Ring des Elements auf den Sockel legen (Mitte auf Mitte, Normale auf Normale,
  Maßstab = Sockelradius / Ringradius), leicht in den Körper versenkt.

Ablauf pro Modell: Anzeige-Mesh (texturtreu ausgedünnt) laden, Schnitte von außen nach innen ausführen
(exakter Ebenenschnitt mit Texturkoordinaten, dann das zusammenhängende Stück auf der Spitzenseite nehmen),
Öffnungen mit einem Fächer verschließen, Sockel den Stücken zuordnen, packen.

Aufruf: python3 elemente.py <meshy-ordner> <assets-ordner>
"""
import sys, os, json, gzip, base64, io, struct
import numpy as np
import pymeshlab
import trimesh
from PIL import Image
from scipy.spatial import cKDTree
from trimesh.intersections import slice_faces_plane

MESHY, ASSETS = sys.argv[1:3]
SL = json.load(open(f'{ASSETS}/schnittlinien.json'))
DATEIEN = {
    'giraffe': 'giraffe/Meshy_AI_Roaring_Giraffe_Monst_1005074343_texture.glb',
    'spinne': 'spinne/Meshy_AI_Autumn_Ember_Spider_1005075928_texture.glb',
    'rex': 'rex/Meshy_AI_Roaring_Emberfang_1005075231_texture.glb',
    'goldie': 'goldie/Meshy_AI_Golden_Yawn_1005074643_texture.glb',
}
ZIEL = {'giraffe': 70000, 'spinne': 90000, 'rex': 70000, 'goldie': 70000}


def lade(pfad, ziel):
    ms = pymeshlab.MeshSet()
    ms.load_new_mesh(pfad)
    ms.meshing_decimation_quadric_edge_collapse_with_texture(targetfacenum=ziel, preserveboundary=True, qualitythr=0.3, extratcoordw=1.0)
    m = ms.current_mesh()
    V, F, W = m.vertex_matrix(), m.face_matrix(), m.wedge_tex_coord_matrix()
    cv = F.reshape(-1)
    qu = np.round(np.clip(W, -4, 4) * 100000).astype(np.int64)
    key = cv.astype(np.int64) * (1 << 40) + (qu[:, 0] + (1 << 19)) * (1 << 20) + (qu[:, 1] + (1 << 19))
    _, first, inv = np.unique(key, return_index=True, return_inverse=True)
    return V[cv[first]].astype(np.float64), inv.reshape(-1, 3), W[first].astype(np.float64)


def komponenten(v, f):
    w = trimesh.Trimesh(v, f, process=False)
    w.merge_vertices(merge_tex=True, merge_norm=True)
    return trimesh.graph.connected_component_labels(w.face_adjacency, node_count=len(w.faces))


def teilmesh(v, f, uv, faces_idx):
    ff = f[faces_idx]
    used, inv = np.unique(ff, return_inverse=True)
    return v[used], inv.reshape(-1, 3), uv[used]


def verbinde(a, b):
    v = np.vstack([a[0], b[0]]); f = np.vstack([a[1], b[1] + len(a[0])]); uv = np.vstack([a[2], b[2]])
    return v, f, uv


def schneide_ebene(stueck, o, n, r):
    v, f, uv = stueck
    pv, pf, puv = slice_faces_plane(v, f, n, o, uv=uv)
    nv, nf, nuv = slice_faces_plane(v, f, -n, o, uv=uv)
    lab = komponenten(pv, pf)
    info = []
    for l in np.unique(lab):
        idx = np.nonzero(lab == l)[0]
        pts = pv[np.unique(pf[idx])]
        info.append((l, idx, np.linalg.norm(pts - o, axis=1).min(), pts))
    ring = [x for x in info if x[2] < 1.3 * r + 0.01] or info
    haupt = max(ring, key=lambda x: len(x[1]))
    lo, hi = haupt[3].min(0), haupt[3].max(0)
    pad = 0.08 * (hi - lo).max()
    gewaehlt = [haupt[0]] + [l for l, idx, d, pts in info if l != haupt[0] and len(idx) <= 0.15 * len(haupt[1])
                             and np.all(pts.mean(0) > lo - pad) and np.all(pts.mean(0) < hi + pad)]
    sel = np.isin(lab, gewaehlt)
    teil = teilmesh(pv, pf, puv, np.nonzero(sel)[0])
    rest = teilmesh(pv, pf, puv, np.nonzero(~sel)[0])
    eltern = (nv, nf, nuv)
    if len(rest[1]):
        eltern = verbinde(eltern, rest)
    return teil, eltern


def schneide(stueck, o, n, spitze, r):
    """Nur im Bereich des Rings schneiden: Flächen nahe dem Ring nach Seite trennen, Rest über die Oberfläche zuordnen,
    die Ringflächen exakt teilen. So nimmt eine kleine Schnittebene keine Kappe vom großen Körper mit."""
    v, f, uv = stueck
    w = trimesh.Trimesh(v, f, process=False)
    w.merge_vertices(merge_tex=True, merge_norm=True)
    wv = np.asarray(w.vertices); wf = np.asarray(w.faces)
    R = 1.7 * r + 0.015
    dv = np.linalg.norm(wv - o, axis=1)
    near = (dv[wf] < R).any(1)
    sd = (wv - o) @ n
    seite_v = sd[wf]
    cen_pos = seite_v.mean(1) > 0
    straddle = near & (seite_v.max(1) > 0) & (seite_v.min(1) < 0)
    adj = w.face_adjacency
    a, b = adj[:, 0], adj[:, 1]
    sperre = near[a] & near[b] & (cen_pos[a] != cen_pos[b])
    keep = adj[~sperre]
    import scipy.sparse as sp
    from scipy.sparse.csgraph import connected_components
    nF = len(wf)
    g = sp.coo_matrix((np.ones(len(keep)), (keep[:, 0], keep[:, 1])), shape=(nF, nF))
    _, lab = connected_components(g, directed=False)
    cf = w.triangles_center
    ringf = near & cen_pos & (np.linalg.norm(cf - o, axis=1) < 1.4 * r + 0.01)
    if not ringf.any():
        ringf = near & cen_pos
    L = np.bincount(lab[ringf]).argmax()
    teilf = lab == L
    # exakt teilen: Ringband-Flächen, die die Ebene kreuzen
    band = straddle & (np.linalg.norm(cf - o, axis=1) < 1.5 * r + 0.01)
    t_rein = teilf & ~band
    e_rein = ~teilf & ~band
    bi = np.nonzero(band)[0]
    tp = slice_faces_plane(v, f[bi], n, o, uv=uv) if len(bi) else (np.zeros((0, 3)), np.zeros((0, 3), int), np.zeros((0, 2)))
    ep = slice_faces_plane(v, f[bi], -n, o, uv=uv) if len(bi) else (np.zeros((0, 3)), np.zeros((0, 3), int), np.zeros((0, 2)))
    teil = teilmesh(v, f, uv, np.nonzero(t_rein)[0])
    eltern = teilmesh(v, f, uv, np.nonzero(e_rein)[0])
    if len(tp[1]):
        teil = verbinde(teil, teilmesh(tp[0], tp[1], tp[2], np.arange(len(tp[1]))))
    if len(ep[1]):
        eltern = verbinde(eltern, teilmesh(ep[0], ep[1], ep[2], np.arange(len(ep[1]))))
    # Plausibel? Ein Teil reicht höchstens etwas weiter als vom Ring bis zur Spitze (sonst hängt Rumpf daran)
    erwartet = 1.8 * np.linalg.norm(spitze - o) + 2.5 * r + 0.02
    zu_gross = lambda t: len(t[0]) == 0 or np.linalg.norm(t[0] - o, axis=1).max() > erwartet
    if zu_gross(teil) or len(eltern[1]) < 0.1 * len(f):
        print('   Rückfall Ebenenschnitt', flush=True)
        t2, e2 = schneide_ebene(stueck, o, n, r)
        if zu_gross(t2):
            return None
        return t2, e2
    return teil, eltern


def verschliesse(stueck, o, n, r):
    """Offene Ränder nahe der Schnittebene mit einem Fächer schließen (UV vom nächsten Randpunkt)."""
    v, f, uv = stueck
    w = trimesh.Trimesh(v, f, process=False)
    w.merge_vertices(merge_tex=True, merge_norm=True)
    e = w.edges_sorted
    uq, cnt = np.unique(e, axis=0, return_counts=True)
    rand = uq[cnt == 1]
    if not len(rand):
        return stueck
    wv = np.asarray(w.vertices)
    nah = np.abs((wv[rand].mean(1) - o) @ n) < 0.02 * max(r, 0.05) + 0.004
    rand = rand[nah & (np.linalg.norm(wv[rand].mean(1) - o, axis=1) < 2.5 * r + 0.02)]
    if not len(rand):
        return stueck
    mitte = wv[np.unique(rand)].mean(0)
    # Randkanten als Fächer zur Mitte, Orientierung nach außen (gegen n für das Element, mit n für den Rumpf wird beim Aufruf entschieden)
    tree = cKDTree(v)
    newv = [v]; newuv = [uv]; newf = [f]
    base = len(v)
    vm = np.vstack([wv[rand[:, 0]], wv[rand[:, 1]]])
    _, ii = tree.query(vm)
    uvm = uv[ii].mean(0)
    newv.append(mitte[None]); newuv.append(uvm[None])
    a = tree.query(wv[rand[:, 0]])[1]; b = tree.query(wv[rand[:, 1]])[1]
    tri = np.stack([a, b, np.full(len(a), base)], 1)
    # Ausrichtung: Normale des Deckels soll von der Masse weg zeigen
    vv = np.vstack(newv)
    tn = np.cross(vv[tri[:, 1]] - vv[tri[:, 0]], vv[tri[:, 2]] - vv[tri[:, 0]])
    weg = mitte - v.mean(0)
    flip = (tn @ weg) < 0
    tri[flip] = tri[flip][:, [1, 0, 2]]
    newf.append(tri)
    return np.vstack(newv), np.vstack(newf), np.vstack(newuv)


def glatte_normalen(v, f):
    w = trimesh.Trimesh(v, f, process=False)
    w.merge_vertices(merge_tex=True, merge_norm=True)
    n = np.asarray(w.vertex_normals)
    return n[cKDTree(np.asarray(w.vertices)).query(v)[1]]


def glb_textur(pfad):
    d = open(pfad, 'rb').read()
    jl, _ = struct.unpack('<II', d[12:20]); j = json.loads(d[20:20 + jl])
    im = j['images'][j['textures'][j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']]['source']]
    bv = j['bufferViews'][im['bufferView']]; off = 20 + jl + 8 + bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(d[off:off + bv['byteLength']]))


TYP = lambda teil: teil.split('_')[0]
katalog = {'elemente': {}, 'modelle': {}}
blob = bytearray()
for name, datei in DATEIEN.items():
    M = SL['modelle'][name]
    v, f, uv = lade(os.path.join(MESHY, datei), ZIEL[name])
    rumpf = (v, f, uv)
    # Schnitte von außen nach innen (weit entfernte Teile zuerst, damit z. B. der Kopf vor dem Hals fällt)
    cuts = []
    for teil, s in M['schnitte'].items():
        if s.get('unsicher'):
            continue
        o = np.array(s['mitte']); n = np.array(s['normale']); n /= np.linalg.norm(n)
        spitze = np.array(s['pfad'][-1]) if len(s['pfad']) else o + n * 0.2
        r = s['umfang'] / (2 * np.pi)
        cuts.append((teil, o, n, spitze, r))
    zentrum = np.array(SL['modelle'][name].get('rumpf', [0, 0, 0])) if 'rumpf' in SL['modelle'][name] else v.mean(0)
    cuts.sort(key=lambda c: -np.linalg.norm(c[1] - v.mean(0)))
    stuecke = {}
    for teil, o, n, spitze, r in cuts:
        # aus dem Stück schneiden, das die Schnittmitte enthält (Rumpf oder ein schon abgetrenntes Element)
        kandidaten = [('rumpf', rumpf)] + [(k, st) for k, st in stuecke.items()]
        def abstand(st):
            return np.linalg.norm(st[0] - o, axis=1).min()
        quelle, st = min(kandidaten, key=lambda kv: abstand(kv[1]))
        erg = schneide(st, o, n, spitze, r)
        if erg is None:
            print(f'   {name}:{teil} übersprungen (kein sauberer Schnitt)', flush=True)
            katalog.setdefault('uebersprungen', []).append(f'{name}:{teil}')
            continue
        teilst, eltern = erg
        if quelle == 'rumpf':
            rumpf = eltern
        else:
            stuecke[quelle] = eltern
        stuecke[teil] = teilst
    # Verschließen und Sockel zuordnen: jeder Schnittring ist Andockring seines Elements und Sockel des Stücks auf der anderen Seite
    alle = dict(stuecke); alle['rumpf'] = rumpf
    sockel = {k: [] for k in alle}
    cuts = [c for c in cuts if c[0] in stuecke]
    for teil, o, n, spitze, r in cuts:
        alle[teil] = verschliesse(alle[teil], o, n, r)
        # Eltern = Stück (ohne das Element selbst), das dem Ring am nächsten liegt
        eltern = min((k for k in alle if k != teil), key=lambda k: np.linalg.norm(alle[k][0] - o, axis=1).min())
        alle[eltern] = verschliesse(alle[eltern], o, n, r)
        sockel[eltern].append(dict(name=teil, typ=TYP(teil), mitte=o.round(5).tolist(), normale=n.round(4).tolist(), radius=round(float(r), 5)))
    tex = glb_textur(os.path.join(MESHY, datei)).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    tex.save(f'{ASSETS}/element-{name}.jpg', quality=88)
    katalog['modelle'][name] = dict(textur=f'assets/element-{name}.jpg')
    ringe = {c[0]: c for c in cuts}
    for key, (pv, pf, puv) in alle.items():
        nrm = glatte_normalen(pv, pf)
        lo, hi = pv.min(0), pv.max(0)
        e = dict(modell=name, teil=key, typ=TYP(key), vertices=int(len(pv)), dreiecke=int(len(pf)), min=lo.round(6).tolist(), max=hi.round(6).tolist(),
                 idx32=bool(len(pv) >= 65536), sockel=sockel.get(key, []))
        if key in ringe:
            _, o, n, spitze, r = ringe[key]
            e['ring'] = dict(mitte=o.round(5).tolist(), normale=n.round(4).tolist(), radius=round(float(r), 5))
        nn = np.zeros((len(pv), 4), np.int8); nn[:, :3] = np.clip(np.round(nrm * 127), -127, 127)
        for nm, arr in (('pos', np.round((pv - lo) / np.maximum(hi - lo, 1e-9) * 65535).astype(np.uint16)), ('nor', nn),
                        ('uv', np.round(np.clip(puv, 0, 1) * 65535).astype(np.uint16)), ('idx', pf.astype(np.uint32 if e['idx32'] else np.uint16))):
            while len(blob) % 4:
                blob.append(0)
            e[nm] = len(blob); blob += arr.tobytes()
        katalog['elemente'][f'{name}:{key}'] = e
        print(f'{name}:{key}', e['typ'], len(pf), 'Dreiecke,', len(e['sockel']), 'Sockel', flush=True)
open(f'{ASSETS}/elemente-mesh.txt', 'w').write(base64.b64encode(gzip.compress(bytes(blob), 9)).decode())
json.dump(katalog, open(f'{ASSETS}/elemente.json', 'w'), indent=1)
print('fertig', len(katalog['elemente']), 'Elemente,', round(len(blob) / 1e6, 2), 'MB roh')
