"""Erzeugt die 13 Grundformen als Meshes aus den Silhouetten der Vorlage.

Verfahren pro Stufe:
1. Maske der festen Reihe glätten und hochrechnen (Höhe = N Voxel).
2. Maske an der Standlinie spiegeln und per Poisson aufblasen (Delta u = -1, u = 0 am Rand;
   Dicke t = c * sqrt(u)). Durch die Spiegelung bekommt der Blob eine echte Standfläche.
3. Volumen |z| <= t(x, y), Abstandsfeld, weichzeichnen, weich mit dem Boden schneiden.
4. Marching Cubes, Ausdünnen auf zwei LOD-Stufen.
5. Pro Vertex aus dem Abstandsfeld: Normale, Umgebungsverdeckung (AO), Dicke, Krümmung.
6. Augen: Punkt, Normale und Tangenten auf der Vorderseite.

Aufruf: python3 formen.py <vermessung-ordner> <ausgabe-ordner>
"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi, sparse
from scipy.sparse.linalg import spsolve
from skimage import measure
import trimesh
import fast_simplification

VM, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
V = json.load(open(f"{VM}/vermessung.json"))
N = 176            # Voxel pro Blob-Höhe
TIEFE = 0.80       # maximale Tiefe / maximale Breite
PX_PRO_EINHEIT = 300.0
LOD = {'lod0': 16000, 'lod1': 4500}
# Augen aus der festen Reihe; Stufe 13 hat dort nur ein erkanntes Auge
AUGEN_FIX = {13: [(0.419, 0.183, 0.040, 0.108), (0.672, 0.183, 0.040, 0.108)]}
# Zusatzformen, die in der Vorlage vor dem Körper gezeichnet sind und nicht in der Silhouette liegen:
# (x relativ zur Breite, y relativ zur Höhe von oben, z relativ zur halben Tiefe nach vorn, Radius relativ zur Breite)
ZUSATZ = {13: [(0.115, 0.905, 0.62, 0.085), (0.885, 0.915, 0.55, 0.065)]}


def poisson(mask):
    idx = -np.ones(mask.shape, np.int64)
    ys, xs = np.nonzero(mask)
    idx[ys, xs] = np.arange(len(ys))
    n = len(ys)
    rows, cols, vals = [np.arange(n)], [np.arange(n)], [np.full(n, 4.0)]
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = ys + dy, xs + dx
        ok = (yy >= 0) & (yy < mask.shape[0]) & (xx >= 0) & (xx < mask.shape[1])
        j = np.full(n, -1)
        j[ok] = idx[yy[ok], xx[ok]]
        sel = j >= 0
        rows.append(np.arange(n)[sel]); cols.append(j[sel]); vals.append(np.full(sel.sum(), -1.0))
    A = sparse.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
    u = spsolve(A, np.ones(n))
    out = np.zeros(mask.shape)
    out[ys, xs] = u
    return out


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def sample(grid, pts):
    return ndi.map_coordinates(grid, pts.T, order=1, mode='nearest')


ergebnis = {'einheit': f'{PX_PRO_EINHEIT:.0f} px der Vorlage', 'stufen': []}
CACHE = f"{OUT}/cache"
os.makedirs(CACHE, exist_ok=True)
fest = V['reihen']['fest']
NUR = [int(x) for x in os.environ.get('STUFEN', '').split(',') if x]
for b in fest:
    s = b['stufe']
    if NUR and s not in NUR:
        continue
    m0 = np.asarray(Image.open(f"{VM}/maske-fest-{s:02d}.png")) > 127
    H0, W0 = m0.shape
    f = N / H0
    pad0 = 6
    mf = ndi.gaussian_filter(np.pad(m0.astype(float), pad0), 1.0)
    mc = ndi.zoom(mf, f, order=3)          # kontinuierliche Maske in Voxel-Auflösung (kubisch: keine Knicke)
    mu = mc > 0.5
    rows_any = np.nonzero(mu.any(1))[0]
    top, yb = rows_any[0], rows_any[-1]
    # An der Standlinie spiegeln (kontinuierlich), Poisson in dreifacher Auflösung lösen,
    # blockweise mitteln, dann Wurzel: Dicke ~ sqrt(Randabstand), also senkrechte Tangente am Rand
    upper_c = mc[:yb + 1]
    doubled_c = np.concatenate([upper_c, upper_c[-2::-1]], 0)
    d3 = ndi.zoom(doubled_c, 3, order=3) > 0.5
    u3 = poisson(d3) / 9.0
    hh, ww = doubled_c.shape
    u = u3[:hh * 3, :ww * 3].reshape(hh, 3, ww, 3).mean((1, 3))
    t = np.sqrt(np.maximum(u, 0))
    tu = t[:yb + 1]
    # Normierung: maximale Tiefe = TIEFE * maximale Breite
    width_max = (mu.sum(1)).max()
    c = (TIEFE * width_max / 2) / tu.max()
    # Innenkern (dunklerer Bauch im Jelly): Ellipsoid aus der Kernzone einer ungespiegelten Poisson-Lösung
    us = poisson(mu)
    reg = us > 0.45 * us.max()
    kys, kxs = np.nonzero(reg)
    kcy, kcx = kys.mean(), kxs.mean()
    kern = dict(mitte=[float((kcx - (pad0 + W0 / 2) * f) / f / PX_PRO_EINHEIT), float((yb - kcy) / f / PX_PRO_EINHEIT), 0.0],
                radien=[float(2.1 * kxs.std() / f / PX_PRO_EINHEIT), float(2.1 * kys.std() / f / PX_PRO_EINHEIT),
                        float(0.62 * c * t[int(round(kcy)), int(round(kcx))] / f / PX_PRO_EINHEIT)])
    # mehr Zeilen unter dem Boden für den weichen Schnitt
    below = 8
    tfull = c * t[:yb + 1 + below]
    Hy, Wx = tfull.shape
    zmax = tfull.max() + 10
    nz = int(np.ceil(2 * zmax)) + 1
    zs = np.linspace(-zmax, zmax, nz)
    padw = int(0.35 * N)
    # Volumen (y, x, z) mit Rand für AO-Abfragen
    tpad = np.pad(tfull, ((padw, padw), (padw, padw)))
    # Glattes Abstandsfeld ohne Voxel-Treppen:
    # innen (|z| - t) / sqrt(1 + |grad t|^2), außen Abstand zur Silhouette kombiniert mit |z|
    gty, gtx = np.gradient(tpad)
    norm = np.sqrt(1 + gtx ** 2 + gty ** 2)
    d2 = ndi.distance_transform_edt(tpad <= 0)
    Z = zs[None, None, :]
    inside2 = (tpad > 0)[:, :, None]
    # weicher Betrag statt |z|: keine Kante, wo Vorder- und Rückseite am Rand zusammentreffen
    E = 0.035 * N
    sabs = np.sqrt(Z ** 2 + E ** 2) - E
    f_in = (sabs - tpad[:, :, None]) / norm[:, :, None]
    f_out = np.sqrt(d2[:, :, None] ** 2 + Z ** 2)
    sdf = np.where(inside2, f_in, f_out)
    sdf = np.pad(sdf, ((0, 0), (0, 0), (padw, padw)), mode='linear_ramp', end_values=float(padw + zmax))
    sdf = ndi.gaussian_filter(sdf, 1.4)
    # Zusatzformen weich anfügen
    if s in ZUSATZ:
        gy_, gx_, gz_ = np.meshgrid(np.arange(sdf.shape[0]), np.arange(sdf.shape[1]), np.arange(sdf.shape[2]), indexing='ij')
        for (zx, zy, zz, zr) in ZUSATZ[s]:
            cxg = padw + (pad0 + zx * W0) * f
            cyg = padw + (pad0 + zy * H0) * f
            rg = zr * W0 * f
            row = int(round(cyg - padw)); col = int(round(cxg - padw))
            tloc = tfull[min(row, tfull.shape[0] - 1), min(col, tfull.shape[1] - 1)]
            czg = padw + (nz - 1) / 2.0 + 0.85 * tloc * c + zz * 0.3 * rg
            sph = np.sqrt((gy_ - cyg) ** 2 + (gx_ - cxg) ** 2 + (gz_ - czg) ** 2) - rg
            sdf = smin(sdf, sph, 0.35 * rg)
        del gy_, gx_, gz_
    # Boden: Zeilenindex wächst nach unten; Bodenzeile im gepolsterten Gitter
    yg = padw + yb
    yy = np.arange(sdf.shape[0])[:, None, None].astype(float)
    sdf_cut = smax(sdf, (yy - yg), 2.5)  # außerhalb, wenn unter dem Boden
    verts, faces, _, _ = measure.marching_cubes(sdf_cut, 0.0)
    m_hi = trimesh.Trimesh(verts, faces, process=True)
    # nur den größten zusammenhängenden Körper behalten (Marching Cubes erzeugt winzige Splitter an der Bodenkante)
    m_hi = max(m_hi.split(only_watertight=False), key=lambda m: len(m.faces))
    if os.environ.get('DEBUG'): print('MC', m_hi.bounds.round(1).tolist(), len(m_hi.split(only_watertight=False)))
    trimesh.smoothing.filter_taubin(m_hi, lamb=0.5, nu=-0.53, iterations=25)
    verts, faces = np.asarray(m_hi.vertices), np.asarray(m_hi.faces)
    if os.environ.get('DEBUG'): print('Taubin', m_hi.bounds.round(1).tolist())
    # Ausdünnen
    lods = {}
    for name, target in LOD.items():
        red = max(0.0, 1 - target / len(faces))
        pv, pf = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), red)
        lods[name] = (pv.astype(np.float64), pf)
    # Gradienten und Hilfsfelder für Attribute
    gy, gx, gz = np.gradient(sdf_cut)
    lap = ndi.laplace(sdf)
    sdf_boden = np.minimum(sdf, (yg - yy))  # Boden als Verdecker
    x_center = padw + (pad0 * f) + W0 * f / 2.0
    z_center = padw + (nz - 1) / 2.0
    to_world = lambda p: np.stack([(p[:, 1] - x_center), (yg - p[:, 0]), (p[:, 2] - z_center)], 1) / f / PX_PRO_EINHEIT
    info = dict(stufe=s, wert=2 ** s, breite_px=b['breite'], hoehe_px=b['hoehe'],
                hoehe=b['hoehe'] / PX_PRO_EINHEIT, breite=b['breite'] / PX_PRO_EINHEIT, lods={})
    ref = None
    for name, (pv, pf) in lods.items():
        if ref is None:
            ref = trimesh.Trimesh(pv, pf, process=False)
            n = np.asarray(ref.vertex_normals).copy()
        else:
            # Normalen der groben Stufe von der feinen übernehmen (keine Facetten): 6 Nachbarn, invers gewichtet
            from scipy.spatial import cKDTree
            dd, ii = cKDTree(np.asarray(ref.vertices)).query(pv, k=6)
            ww = 1.0 / (dd + 1e-6)
            n = (np.asarray(ref.vertex_normals)[ii] * ww[:, :, None]).sum(1)
        n = np.nan_to_num(n)
        n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
        # nach außen ausrichten (gegen den Gradienten des Abstandsfelds prüfen)
        gref = np.stack([sample(gy, pv), sample(gx, pv), sample(gz, pv)], 1)
        if (n * gref).sum() < 0:
            n = -n
        # Gitter (y, x, z) -> Welt (x, -y, z)
        nw = np.stack([n[:, 1], -n[:, 0], n[:, 2]], 1)
        # AO aus dem Abstandsfeld (inkl. Boden)
        ao = np.zeros(len(pv))
        wsum = 0
        for i in range(1, 7):
            d = i * 0.045 * N
            v = sample(sdf_boden, pv + n * d)
            w = 0.5 ** (i - 1)
            ao += w * np.clip((d - v) / d, 0, 1)
            wsum += w
        ao = 1 - ao / wsum
        # Dicke entlang -n
        thick = np.zeros(len(pv))
        inside = np.ones(len(pv), bool)
        for step in np.linspace(1, 1.2 * width_max, 90):
            v = sample(sdf, pv - n * step)
            hit = inside & (v > 0)
            thick[hit] = step
            inside &= ~hit
        thick[inside] = 1.2 * width_max
        thick /= width_max
        curv = np.clip(sample(lap, pv) * 0.6 + 0.5, 0, 1)
        col = np.stack([ao, np.clip(thick, 0, 1), curv, np.ones(len(pv))], 1)
        np.savez_compressed(f"{CACHE}/s{s:02d}_{name}.npz", v=to_world(pv).astype(np.float32), f=pf.astype(np.int32), n=nw.astype(np.float32), c=(col * 255).astype(np.uint8))
        info['lods'][name] = dict(dreiecke=int(len(pf)), vertices=int(len(pv)))
    # Augen
    eyes = AUGEN_FIX.get(s) or [(e['cx'], e['cy'], e['w'], e['h']) for e in b['augen']]
    eye_out = []
    for (cx, cy, ew, eh) in eyes:
        # Position in der gepolsterten, hochgerechneten Maske
        px = padw + (pad0 + cx * W0) * f
        py = padw + (pad0 + cy * H0) * f
        zline = np.linspace(nz + padw - 1, padw, 400)
        pts = np.stack([np.full_like(zline, py), np.full_like(zline, px), zline], 1)
        v = sample(sdf_cut, pts)
        k = np.nonzero(v < 0)[0]
        if len(k) == 0:
            continue
        k = k[0]
        a, bb = v[k - 1], v[k]
        zhit = zline[k - 1] + (zline[k] - zline[k - 1]) * a / (a - bb)
        P = np.array([[py, px, zhit]])
        n = np.array([sample(gy, P)[0], sample(gx, P)[0], sample(gz, P)[0]])
        n /= np.linalg.norm(n)
        Nw = np.array([n[1], -n[0], n[2]])
        Tw = np.cross([0, 1, 0], Nw); Tw /= np.linalg.norm(Tw)
        Bw = np.cross(Nw, Tw)
        # Größe auf der Fläche: in der Vorderansicht gemessen, Verkürzung ausgleichen
        cosx = max(abs(Nw[2]) / max(np.hypot(Nw[0], Nw[2]), 1e-6), 0.35)
        eye_out.append(dict(p=to_world(P)[0].round(5).tolist(), n=Nw.round(5).tolist(), t=Tw.round(5).tolist(), b=Bw.round(5).tolist(),
                            breite=round(ew * b['breite'] / PX_PRO_EINHEIT / cosx, 5), hoehe=round(eh * b['hoehe'] / PX_PRO_EINHEIT, 5)))
    info['augen'] = eye_out
    info['kern'] = kern
    # Bläschen: Zufallspunkte deutlich innerhalb des Körpers
    rng = np.random.default_rng(1000 + s)
    lo, hi = np.array([padw, padw, padw]), np.array(sdf_cut.shape) - padw
    cand = lo + rng.random((4000, 3)) * (hi - lo)
    vin = sample(sdf_cut, cand)
    cand = cand[vin < -0.06 * N]
    cand = cand[: 10 + 2 * s]
    rad = (0.006 + 0.012 * rng.random(len(cand)) ** 2) * (N / f) / PX_PRO_EINHEIT * (0.55 + 0.45 * s / 13)
    info['blasen'] = [[*map(lambda v: round(float(v), 5), to_world(c_[None])[0]), round(float(r_), 5)] for c_, r_ in zip(cand, rad)]
    info['farben'] = {mat: {k: V['reihen'][mat][s - 1][k] for k in ('farbe_mitte', 'farbe_oben', 'farbe_unten', 'farbe_schatten', 'farbe_licht')}
                      for mat in ('jelly', 'fest', 'fell')}
    json.dump(info, open(f"{CACHE}/s{s:02d}.json", 'w'))
    print(s, info['lods'], 'Augen', len(eye_out), flush=True)

# Zusammensetzen aus dem Zwischenspeicher
szene = trimesh.Scene()
for st in range(1, 14):
    if not os.path.exists(f"{CACHE}/s{st:02d}.json"):
        continue
    ergebnis['stufen'].append(json.load(open(f"{CACHE}/s{st:02d}.json")))
    for name in LOD:
        z = np.load(f"{CACHE}/s{st:02d}_{name}.npz")
        mesh = trimesh.Trimesh(z['v'], z['f'], vertex_normals=z['n'], process=False)
        mesh.visual = trimesh.visual.ColorVisuals(mesh, vertex_colors=z['c'])
        szene.add_geometry(mesh, node_name=f"s{st:02d}_{name}", geom_name=f"s{st:02d}_{name}")
szene.export(f"{OUT}/grundblobs.glb")
json.dump(ergebnis, open(f"{OUT}/grundblobs.json", 'w'), indent=1)
print('fertig', os.path.getsize(f"{OUT}/grundblobs.glb") / 1e6, 'MB')
