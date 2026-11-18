"""Ecken erkennen und Bézier-Kurven anpassen (Schneider-Verfahren), Profile im Editor-Format bauen.

Gerechnet wird in Ansichtskoordinaten in Pixeln (x nach rechts, y nach oben, Halbprofile mit Achse 0 und
editierbarer Hälfte ≥ 0). Knoten: {'p': (x, y), 'ein': (dx, dy), 'aus': (dx, dy), 'art': 'glatt'|'ecke'},
Griffe relativ zu p wie in packages/shape/src/profil.ts.
"""

import math


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def mul(a, s):
    return (a[0] * s, a[1] * s)


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1]


def norm(a):
    L = math.hypot(*a)
    return (a[0] / L, a[1] / L) if L > 1e-12 else (0.0, 0.0)


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def winkel_grad(u, v):
    return math.degrees(math.acos(max(-1.0, min(1.0, dot(norm(u), norm(v))))))


def ecken(pts, geschlossen, m=5, grad=42):
    """Indizes der Ecken: Richtungsänderung über ±m Proben ≥ grad, lokales Maximum über ±8 Proben."""
    n = len(pts)
    wink = [0.0] * n
    for i in range(n):
        if not geschlossen and (i < m or i >= n - m):
            continue
        a = pts[(i - m) % n]
        p = pts[i]
        b = pts[(i + m) % n]
        wink[i] = winkel_grad(sub(p, a), sub(b, p))
    idx = []
    for i in range(n):
        if wink[i] < grad:
            continue
        if all(wink[i] >= wink[(i + k) % n] for k in range(-8, 9) if k and (geschlossen or 0 <= i + k < n)):
            if idx and (i - idx[-1]) < 3:
                continue
            idx.append(i)
    return idx


# ---------------------------------------------------------------- Schneider

def bez(b, t):
    s = 1 - t
    return (s * s * s * b[0][0] + 3 * s * s * t * b[1][0] + 3 * s * t * t * b[2][0] + t * t * t * b[3][0],
            s * s * s * b[0][1] + 3 * s * s * t * b[1][1] + 3 * s * t * t * b[2][1] + t * t * t * b[3][1])


def bezd(b, t):
    s = 1 - t
    return (3 * s * s * (b[1][0] - b[0][0]) + 6 * s * t * (b[2][0] - b[1][0]) + 3 * t * t * (b[3][0] - b[2][0]),
            3 * s * s * (b[1][1] - b[0][1]) + 6 * s * t * (b[2][1] - b[1][1]) + 3 * t * t * (b[3][1] - b[2][1]))


def bezdd(b, t):
    return (6 * (1 - t) * (b[2][0] - 2 * b[1][0] + b[0][0]) + 6 * t * (b[3][0] - 2 * b[2][0] + b[1][0]),
            6 * (1 - t) * (b[2][1] - 2 * b[1][1] + b[0][1]) + 6 * t * (b[3][1] - 2 * b[2][1] + b[1][1]))


def chord(pts):
    u = [0.0]
    for i in range(1, len(pts)):
        u.append(u[-1] + dist(pts[i], pts[i - 1]))
    return [x / u[-1] for x in u]


def generate(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    C = [[0.0, 0.0], [0.0, 0.0]]
    X = [0.0, 0.0]
    for i, t in enumerate(u):
        s = 1 - t
        b1 = 3 * s * s * t
        b2 = 3 * s * t * t
        A1 = mul(t1, b1)
        A2 = mul(t2, b2)
        C[0][0] += dot(A1, A1)
        C[0][1] += dot(A1, A2)
        C[1][1] += dot(A2, A2)
        tmp = sub(pts[i], add(mul(p0, s * s * s + b1), mul(p3, b2 + t * t * t)))
        X[0] += dot(A1, tmp)
        X[1] += dot(A2, tmp)
    C[1][0] = C[0][1]
    det = C[0][0] * C[1][1] - C[0][1] * C[1][0]
    seg = dist(p0, p3)
    if abs(det) < 1e-12:
        al = be = seg / 3
    else:
        al = (X[0] * C[1][1] - X[1] * C[0][1]) / det
        be = (C[0][0] * X[1] - C[1][0] * X[0]) / det
    if al < 1e-6 * seg or be < 1e-6 * seg:
        al = be = seg / 3
    return [p0, add(p0, mul(t1, al)), add(p3, mul(t2, be)), p3]


def maxerr(pts, b, u):
    m = 0.0
    sp = len(pts) // 2
    for i in range(1, len(pts) - 1):
        d = dist(bez(b, u[i]), pts[i]) ** 2
        if d >= m:
            m = d
            sp = i
    return m, sp


def reparam(pts, b, u):
    out = []
    for p, t in zip(pts, u):
        q = sub(bez(b, t), p)
        d1 = bezd(b, t)
        d2 = bezdd(b, t)
        num = dot(q, d1)
        den = dot(d1, d1) + dot(q, d2)
        out.append(t if abs(den) < 1e-12 else min(1.0, max(0.0, t - num / den)))
    return out


def fitkubik(pts, t1, t2, err):
    """Kubische Stücke durch pts mit Starttangente t1 (Laufrichtung) und Endtangente t2 (vom Ende zurück)."""
    if len(pts) == 2:
        dd = dist(pts[0], pts[1]) / 3
        return [[pts[0], add(pts[0], mul(t1, dd)), add(pts[1], mul(t2, dd)), pts[1]]]
    u = chord(pts)
    b = generate(pts, u, t1, t2)
    m, sp = maxerr(pts, b, u)
    if m < err:
        return [b]
    if m < err * 4:
        for _ in range(8):
            u = reparam(pts, b, u)
            b = generate(pts, u, t1, t2)
            m, sp = maxerr(pts, b, u)
            if m < err:
                return [b]
    sp = max(1, min(len(pts) - 2, sp))
    tc = norm(sub(pts[sp - 1], pts[sp + 1]))
    return fitkubik(pts[:sp + 1], t1, tc, err) + fitkubik(pts[sp:], mul(tc, -1), t2, err)


def tangente_start(pts, k=3):
    return norm(sub(pts[min(k, len(pts) - 1)], pts[0]))


def tangente_ende(pts, k=3):
    return norm(sub(pts[max(0, len(pts) - 1 - k)], pts[-1]))


def zu_knoten(kurven, ecke_start, ecke_ende):
    kn = []
    for i, b in enumerate(kurven):
        if i == 0:
            kn.append({'p': b[0], 'ein': (0.0, 0.0), 'aus': sub(b[1], b[0]), 'art': 'ecke' if ecke_start else 'glatt'})
        else:
            kn[-1]['aus'] = sub(b[1], b[0])
        kn.append({'p': b[3], 'ein': sub(b[2], b[3]), 'aus': (0.0, 0.0), 'art': 'glatt'})
    kn[-1]['art'] = 'ecke' if ecke_ende else 'glatt'
    return kn


def _einrasten(pts, ek, fest, radius):
    """Ecken, die nahe an einem festen Punkt (z. B. Maulpunkt) liegen, genau auf diesen setzen."""
    pts = list(pts)
    for i in ek:
        best = None
        for q in fest:
            d = dist(pts[i], q)
            if d <= radius and (best is None or d < best[0]):
                best = (d, q)
        if best:
            pts[i] = best[1]
    return pts


def profil_geschlossen(pts, err, fest=(), einrast=5.0):
    """pts: geschlossene Probe (Abstand ≈ 2 px) im Uhrzeigersinn (y nach oben)."""
    ek = ecken(pts, True)
    pts = _einrasten(pts, ek, fest, einrast)
    n = len(pts)
    glatt_start = not ek
    if glatt_start:
        ek = [max(range(n), key=lambda i: pts[i][1])]   # höchste Stelle
    kn_all = []
    for j, a in enumerate(ek):
        b = ek[(j + 1) % len(ek)]
        seg = [pts[(a + k) % n] for k in range(((b - a) % n or n) + 1)]
        if glatt_start:
            t1 = norm(sub(pts[(a + 2) % n], pts[(a - 2) % n]))
            t2 = mul(t1, -1)
        else:
            t1 = tangente_start(seg)
            t2 = tangente_ende(seg)
        kurven = fitkubik(seg, t1, t2, err)
        kn = zu_knoten(kurven, not glatt_start, not glatt_start)
        if kn_all:
            kn_all[-1]['aus'] = kn[0]['aus']
            kn_all.extend(kn[1:])
        else:
            kn_all.extend(kn)
    last = kn_all.pop()
    kn_all[0]['ein'] = last['ein']
    return kn_all


def profil_halb(pts, err, senkrecht, fest=(), einrast=5.0, grenz_grad=30.0):
    """pts: offene Probe von Achse zu Achse, editierbare Hälfte ≥ 0 auf der Achsnormalen.

    senkrecht → Achse x = 0 (Front), sonst y = 0 (Top). Glatte Achsknoten bekommen den Griff quer zur
    Achse in die editierbare Hälfte; weicht die Kurve dort um mehr als `grenz_grad` ab, wird der
    Achsknoten eine Ecke.
    """
    quer = (1.0, 0.0) if senkrecht else (0.0, 1.0)
    ek = [i for i in ecken(pts, False) if 4 < i < len(pts) - 5]
    pts = _einrasten(pts, ek, fest, einrast)
    grenzen = [0] + ek + [len(pts) - 1]
    # Richtung an den Achsenden prüfen
    t_start = tangente_start(pts, 4)
    t_ende = tangente_ende(pts, 4)
    start_ecke = winkel_grad(t_start, quer) > grenz_grad
    ende_ecke = winkel_grad(t_ende, quer) > grenz_grad
    kn_all = []
    for j in range(len(grenzen) - 1):
        a, b = grenzen[j], grenzen[j + 1]
        seg = pts[a:b + 1]
        if j == 0:
            t1 = t_start if start_ecke else quer
        else:
            t1 = tangente_start(seg)
        if j == len(grenzen) - 2:
            t2 = t_ende if ende_ecke else quer
        else:
            t2 = tangente_ende(seg)
        kurven = fitkubik(seg, t1, t2, err)
        kn = zu_knoten(kurven, j > 0, j < len(grenzen) - 2)
        if kn_all:
            kn_all[-1]['aus'] = kn[0]['aus']
            kn_all[-1]['art'] = 'ecke'
            kn_all.extend(kn[1:])
        else:
            kn_all.extend(kn)
    kn_all[0]['art'] = 'ecke' if start_ecke else 'glatt'
    kn_all[-1]['art'] = 'ecke' if ende_ecke else 'glatt'
    achsen_regeln(kn_all, senkrecht)
    return kn_all


def spiegeln(v, senkrecht):
    return (-v[0], v[1]) if senkrecht else (v[0], -v[1])


def achsen_regeln(kn, senkrecht):
    """Wie achsenRegeln in profil.ts: Achsknoten auf der Achse, Spiegelgriff, glatt = quer zur Achse."""
    for i in (0, len(kn) - 1):
        k = kn[i]
        k['p'] = (0.0, k['p'][1]) if senkrecht else (k['p'][0], 0.0)
        g = k['aus'] if i == 0 else k['ein']
        if k['art'] == 'glatt':
            g = (max(0.0, g[0]), 0.0) if senkrecht else (0.0, max(0.0, g[1]))
        else:
            g = (max(0.0, g[0]), g[1]) if senkrecht else (g[0], max(0.0, g[1]))
        if i == 0:
            k['aus'] = g
            k['ein'] = spiegeln(g, senkrecht)
        else:
            k['ein'] = g
            k['aus'] = spiegeln(g, senkrecht)
    for k in kn[1:-1]:
        k['p'] = (max(0.0, k['p'][0]), k['p'][1]) if senkrecht else (k['p'][0], max(0.0, k['p'][1]))


def segmente(kn, geschlossen):
    n = len(kn)
    m = n if geschlossen else n - 1
    out = []
    for s in range(m):
        a = kn[s]
        b = kn[(s + 1) % n]
        out.append([a['p'], add(a['p'], a['aus']), add(b['p'], b['ein']), b['p']])
    return out


def kurve_abtasten(kn, geschlossen, pro_segment=40):
    out = []
    for si, b in enumerate(segmente(kn, geschlossen)):
        for i in range(0 if si == 0 else 1, pro_segment + 1):
            out.append(bez(b, i / pro_segment))
    return out


def fehler(pts, kn, geschlossen):
    """Größter und mittlerer Abstand der Proben zur angepassten Kurve (Pixel, Abstand zur dichten Polylinie)."""
    dicht = kurve_abtasten(kn, geschlossen, 120)
    stuecke = list(zip(dicht[:-1], dicht[1:]))
    zelle = 8.0
    gitter = {}
    for a, b in stuecke:
        for q in (a, b):
            gitter.setdefault((int(q[0] // zelle), int(q[1] // zelle)), set()).add((a, b))

    def seg_abstand(p, a, b):
        vx, vy = b[0] - a[0], b[1] - a[1]
        L2 = vx * vx + vy * vy
        t = 0.0 if L2 < 1e-12 else max(0.0, min(1.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2))
        return math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy)

    ds = []
    for p in pts:
        gx, gy = int(p[0] // zelle), int(p[1] // zelle)
        best = None
        for r in range(1, 8):
            kandidaten = set()
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    kandidaten |= gitter.get((gx + dx, gy + dy), set())
            for a, b in kandidaten:
                d = seg_abstand(p, a, b)
                if best is None or d < best:
                    best = d
            if best is not None and best < (r - 1) * zelle:
                break
        ds.append(best if best is not None else 99.0)
    return max(ds), sum(ds) / len(ds)


def ausdehnung(kn, geschlossen):
    pts = kurve_abtasten(kn, geschlossen, 60)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)
