"""Maullinien (Florians Punkte), Augen und Linienbilder einer Ansicht.

Alle Koordinaten hier sind Pixel der Vorlage; die Umrechnung in Kacheln macht nachziehen.py.
"""

import math
from collections import deque

import segment

FARBEN = ('tuerkis', 'rot', 'blau')


# ---------------------------------------------------------------- Maullinien

def maullinien(punkte):
    """Ordnet die Punkte einer Ansicht zu Linien vom Anfang zum Mundwinkel (Mundwinkel als letzter Punkt).

    Reihenfolge: Kette der nächsten Nachbarn ab dem Mundwinkel, je Farbe; danach umgedreht.
    Gibt (linien, mundwinkel) zurück; linien = [{'farbe', 'punkte': [(x, y), …]}].
    """
    schwarz = [p for p in punkte if p['farbe'] == 'schwarz']
    if len(schwarz) != 1:
        raise ValueError(f'{len(schwarz)} schwarze Punkte statt genau einem Mundwinkel')
    mw = (schwarz[0]['x'], schwarz[0]['y'])
    linien = []
    for farbe in FARBEN:
        rest = [(p['x'], p['y']) for p in punkte if p['farbe'] == farbe]
        if not rest:
            continue
        kette = []
        aktuell = mw
        while rest:
            j = min(range(len(rest)), key=lambda i: math.hypot(rest[i][0] - aktuell[0], rest[i][1] - aktuell[1]))
            aktuell = rest.pop(j)
            kette.append(aktuell)
        kette.reverse()
        linien.append({'farbe': farbe, 'punkte': kette + [mw]})
    return linien, mw


# ---------------------------------------------------------------- Hilfen für Masken

def _moore(maske, w, h):
    """Außenkontur der Maske (Pixelmitten, im Bild im Uhrzeigersinn) ab dem obersten linken Pixel."""
    start = next(j for j in range(w * h) if maske[j])
    sx, sy = start % w, start // w
    nb = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)]
    kontur = [(sx, sy)]
    cx, cy, zurueck = sx, sy, 0
    erste = None
    for _ in range(8 * w * h):
        for k in range(8):
            d = (zurueck + 1 + k) % 8
            nx, ny = cx + nb[d][0], cy + nb[d][1]
            if 0 <= nx < w and 0 <= ny < h and maske[ny * w + nx]:
                break
        else:
            break
        if erste is None:
            erste = d
        elif (cx, cy) == (sx, sy) and d == erste:
            break
        zurueck = (d + 4) % 8
        cx, cy = nx, ny
        kontur.append((cx, cy))
    if len(kontur) > 1 and kontur[-1] == kontur[0]:
        kontur.pop()
    return kontur


def _komponenten(maske, w, h, acht=True):
    marke = [0] * (w * h)
    komps = []
    for s in range(w * h):
        if not maske[s] or marke[s]:
            continue
        nr = len(komps) + 1
        st = [s]
        marke[s] = nr
        pix = []
        while st:
            j = st.pop()
            pix.append(j)
            x = j % w
            for dy in (-w, 0, w):
                for dx in (-1, 0, 1):
                    if not acht and dx and dy:
                        continue
                    if (dx == -1 and x == 0) or (dx == 1 and x == w - 1):
                        continue
                    n = j + dy + dx
                    if 0 <= n < w * h and maske[n] and not marke[n]:
                        marke[n] = nr
                        st.append(n)
        komps.append(pix)
    return komps


def polygon_gleichmaessig(kontur, n_ziel):
    """Glätten und gleichmäßig auf n_ziel Punkte abtasten (geschlossen)."""
    pts = segment.glaetten(kontur, True, 1)
    L = sum(math.hypot(pts[(i + 1) % len(pts)][0] - pts[i][0], pts[(i + 1) % len(pts)][1] - pts[i][1]) for i in range(len(pts)))
    out = segment.neu_abtasten(pts, L / n_ziel, True)
    return out[:n_ziel]


def _bildumriss(maske, w, h, x0, y0):
    k = _moore(maske, w, h)
    pts = [(x + x0, y + y0) for x, y in k]
    pts = segment.neu_abtasten(segment.glaetten(pts, True, 1), 1.0, True)
    if segment.flaeche_vorzeichen(pts) < 0:
        pts.reverse()
    return pts


# ---------------------------------------------------------------- gefüllte Augen (Schlitz, Knopf)

def _huelle(punkte):
    """Konvexe Hülle (Monotone Chain), im Bild im Uhrzeigersinn."""
    p = sorted(set(punkte))
    if len(p) < 3:
        return p

    def kreuz(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    unten = []
    for q in p:
        while len(unten) >= 2 and kreuz(unten[-2], unten[-1], q) <= 0:
            unten.pop()
        unten.append(q)
    oben = []
    for q in reversed(p):
        while len(oben) >= 2 and kreuz(oben[-2], oben[-1], q) <= 0:
            oben.pop()
        oben.append(q)
    h = unten[:-1] + oben[:-1]
    if segment.flaeche_vorzeichen(h) < 0:
        h.reverse()
    return h


def _in_polygon(x, y, poly):
    drin = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            drin = not drin
    return drin


def auge_gefuellt(bild, flaeche, grenze=128, radius=45):
    """Gefülltes dunkles Auge (Schlitz, Knopf): Umriss = konvexe Hülle der dunklen Fläche (Halbdunkel-Grenze),
    so bleibt ein Glanzpunkt, der den Rand berührt, im Auge. Glanz = größte helle Fläche in der Hülle."""
    W = bild.W
    cx, cy = flaeche['x'], flaeche['y']
    x0, y0 = int(cx - radius), int(cy - radius)
    w = h = 2 * radius + 1
    maske = bytearray(w * h)
    q = deque()
    for j in flaeche['pixel']:
        x, y = j % W - x0, j // W - y0
        if 0 <= x < w and 0 <= y < h and not maske[y * w + x]:
            maske[y * w + x] = 1
            q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not maske[ny * w + nx]:
                    if bild.lum[(ny + y0) * W + nx + x0] < grenze:
                        maske[ny * w + nx] = 1
                        q.append((nx, ny))
    rand = [(x + x0, y + y0) for x, y in _moore(maske, w, h)]
    huelle = _huelle(rand)
    # Hülle dicht abtasten (1 px), damit _polygon gleichmäßig verteilen kann
    umriss = segment.neu_abtasten(huelle, 1.0, True)
    # Glanz: helle Pixel innerhalb der Hülle
    hx0 = int(min(p[0] for p in huelle))
    hy0 = int(min(p[1] for p in huelle))
    hx1 = int(max(p[0] for p in huelle)) + 1
    hy1 = int(max(p[1] for p in huelle)) + 1
    gw, gh = hx1 - hx0 + 1, hy1 - hy0 + 1
    hell = bytearray(gw * gh)
    for y in range(gh):
        for x in range(gw):
            X, Y = x + hx0, y + hy0
            if bild.lum[Y * W + X] >= grenze and _in_polygon(X, Y, huelle):
                hell[y * gw + x] = 1
    komps = [k for k in _komponenten(hell, gw, gh) if len(k) >= 6]
    glanz = None
    if komps:
        lm = bytearray(gw * gh)
        for j in max(komps, key=len):
            lm[j] = 1
        glanz = [(x + hx0, y + hy0) for x, y in _moore(lm, gw, gh)]
    return {'umriss': umriss, 'glanz': glanz}


# ---------------------------------------------------------------- gezeichnete Augen (Mandel mit Lid)

def auge_gezeichnet(ansicht, mitte, radius=70, such=38):
    """Gezeichnetes Auge: eingeschlossene weiße Flächen nahe `mitte` bilden das Auge.

    Gibt Umriss (Strichmitte) und, falls das Auge zwei Flächen hat, die Lidlinie zurück.
    """
    D = ansicht.D
    cx, cy = mitte
    x0, y0 = int(cx - radius), int(cy - radius)
    w = h = 2 * radius + 1

    def dk(x, y):
        xx, yy = x + x0 - ansicht.x0, y + y0 - ansicht.y0
        if 0 <= xx < ansicht.w and 0 <= yy < ansicht.h:
            return D[yy * ansicht.w + xx]
        return 0

    tinte = bytearray(1 if dk(j % w, j // w) >= segment.TINTE else 0 for j in range(w * h))
    erreicht = bytearray(w * h)
    q = deque()
    for j in range(w * h):
        x, y = j % w, j // w
        if (x in (0, w - 1) or y in (0, h - 1)) and not tinte[j]:
            erreicht[j] = 1
            q.append(j)
    while q:
        j = q.popleft()
        x = j % w
        for n, ok in ((j - 1, x > 0), (j + 1, x < w - 1), (j - w, j >= w), (j + w, j < w * (h - 1))):
            if ok and not erreicht[n] and not tinte[n]:
                erreicht[n] = 1
                q.append(n)
    innen = bytearray(1 if (not tinte[j] and not erreicht[j]) else 0 for j in range(w * h))
    stuecke = []
    for k in _komponenten(innen, w, h, acht=False):
        if len(k) < 25:
            continue
        mx = sum(j % w for j in k) / len(k)
        my = sum(j // w for j in k) / len(k)
        if math.hypot(mx - radius, my - radius) <= such:
            stuecke.append(k)
    if not stuecke:
        raise ValueError(f'kein Auge bei {mitte}')
    # Augenfläche: Stücke plus angrenzende Striche (bis 3 px)
    flaeche = bytearray(w * h)
    for k in stuecke:
        for j in k:
            flaeche[j] = 1
    for _ in range(3):
        neu = bytearray(flaeche)
        for j in range(w * h):
            if flaeche[j] or not tinte[j]:
                continue
            x, y = j % w, j // w
            if any(0 <= x + dx < w and 0 <= y + dy < h and flaeche[(y + dy) * w + x + dx]
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                neu[j] = 1
        flaeche = neu
    # nur die zusammenhängende Augenfläche
    gross = max(_komponenten(flaeche, w, h), key=len)
    fm = bytearray(w * h)
    for j in gross:
        fm[j] = 1
    umriss = _bildumriss(fm, w, h, x0, y0)
    umriss, _ = segment.auf_strichmitte(ansicht, umriss, fenster=(-1.5, 3.0))
    lid = None
    if len(stuecke) >= 2:
        # Lid = Rand des oberen Stücks, der nicht am Außenumriss liegt
        oben = min(stuecke, key=lambda k: sum(j // w for j in k) / len(k))
        om = bytearray(w * h)
        for j in oben:
            om[j] = 1
        rand = _bildumriss(om, w, h, x0, y0)
        rand, _ = segment.auf_strichmitte(ansicht, rand, fenster=(-3.5, 1.0))

        def nah(p):
            return min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in umriss) < 2.5

        frei = [not nah(p) for p in rand]
        n = len(rand)
        # längster zusammenhängender Lauf (zyklisch)
        best = (0, 0)
        for s in range(n):
            if frei[s] and not frei[(s - 1) % n]:
                L = 0
                while L < n and frei[(s + L) % n]:
                    L += 1
                if L > best[1]:
                    best = (s, L)
        if best[1] > 5:
            lid = [rand[(best[0] + k) % n] for k in range(best[1])]
            if lid[0][0] > lid[-1][0]:
                lid.reverse()
    return {'umriss': umriss, 'lid': lid, 'stuecke': len(stuecke)}


# ---------------------------------------------------------------- Linienbilder

def linienbild(bild, ansicht, umriss=None, farbe=(25, 35, 43), spiegeln=False, rand_abstand=3.0):
    """Innere Linien als RGBA (ohne Außenkontur, ohne Punkte, ohne farbige Linien).

    `umriss`: nachgezogener Umriss (Strichmitte); Pixel bis `rand_abstand` davon gehören zur Außenkontur
    und fallen weg. Ohne Umriss bleibt die ganze Zeichnung (für die Zahnansichten).
    Gibt (w, h, pixel, (bx0, by0, bx1, by1)) zurück; das Rechteck in Vorlagenpixeln (bx1/by1 exklusiv).
    Mit `spiegeln` stehen die Zeilen von unten nach oben (für die Top-Ansicht).
    """
    w = ansicht.w
    rand = bytearray(ansicht.w * ansicht.h)
    if umriss:
        r = rand_abstand
        for (ux, uy) in umriss:
            lx, ly = ux - ansicht.x0, uy - ansicht.y0
            for yy in range(int(ly - r), int(ly + r) + 2):
                for xx in range(int(lx - r), int(lx + r) + 2):
                    if 0 <= xx < ansicht.w and 0 <= yy < ansicht.h and (xx - lx) ** 2 + (yy - ly) ** 2 <= r * r:
                        rand[yy * w + xx] = 1
    js = [j for j in range(ansicht.w * ansicht.h) if ansicht.flaeche[j]]
    xs = [j % w for j in js]
    ys = [j // w for j in js]
    bx0, by0 = min(xs) - 4 + ansicht.x0, min(ys) - 4 + ansicht.y0
    bx1, by1 = max(xs) + 5 + ansicht.x0, max(ys) + 5 + ansicht.y0
    bw, bh = bx1 - bx0, by1 - by0
    px = bytearray(bw * bh * 4)
    for y in range(by0, by1):
        for x in range(bx0, bx1):
            lx, ly = x - ansicht.x0, y - ansicht.y0
            if not (0 <= lx < ansicht.w and 0 <= ly < ansicht.h):
                continue
            j = ly * w + lx
            if not ansicht.flaeche[j] or rand[j]:
                continue
            L = bild.lum[y * bild.W + x]
            if L >= 238:
                continue
            r_, g_, b_ = bild.rgb(x, y)
            sat = max(r_, g_, b_) - min(r_, g_, b_)
            if sat >= 40 and not (L < 80 and sat < 60):    # farbige Maullinien weg, dunkles Schiefer-Auge bleibt
                continue
            if any((x - p['x']) ** 2 + (y - p['y']) ** 2 <= (p['r'] + 2.5) ** 2 for p in ansicht.punkte):
                continue
            a = min(1.0, (238 - L) / 150)
            zy = (by1 - 1 - y) if spiegeln else (y - by0)
            i = (zy * bw + (x - bx0)) * 4
            px[i:i + 4] = bytes((farbe[0], farbe[1], farbe[2], int(a * 255)))
    return bw, bh, px, (bx0, by0, bx1, by1)
