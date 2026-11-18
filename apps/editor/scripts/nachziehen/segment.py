"""Punkte finden, Ansicht freistellen, Umriss verfolgen und auf die Strichmitte legen.

Ablauf je Ansicht (Rechteck `box` der Vorlage):
1. Dunkelheit D = 255 − Helligkeit; Tinte = D ≥ TINTE (auch die sehr hellen grauen Spiegelhälften).
2. Außenraum = alle Nicht-Tinte-Pixel, die vom Rand des Rechtecks aus erreichbar sind.
3. Fläche = größte zusammenhängende Nicht-Außen-Fläche (Linien plus eingeschlossenes Weiß).
4. Umriss = Moore-Verfolgung der Fläche (im Bild im Uhrzeigersinn), entlang der Innennormalen auf die
   Strichmitte geschoben (gewichteter Schwerpunkt der Dunkelheit).
5. Florians Punkte auf dem Umriss: Läuft der Strich durch die Punktmitte, führt der Umriss durch die Mitte
   (Ecken an Punkten bleiben scharf); streift ein Punkt den Umriss nur, ersetzt eine Sehne die Beule.
"""

import math
from collections import deque

TINTE = 6          # D ab hier zählt als Strich (auch die sehr hellen grauen Spiegelhälften)
EROSION = 2        # Radius, mit dem Punkte von dünnen Linien getrennt werden


def farbklasse(r, g, b):
    mx = max(r, g, b)
    mn = min(r, g, b)
    if mx - mn >= 60:
        if r >= g and r >= b and r - g > 60:
            return 'rot'
        if b > r + 60 and b > g + 60:
            return 'blau'
        if g > r + 60 and b > r + 60:
            return 'tuerkis'
        return 'bunt'
    if (299 * r + 587 * g + 114 * b) // 1000 < 60:
        return 'schwarz'
    return None


def ist_bunt(r, g, b):
    return max(r, g, b) - min(r, g, b) >= 40


# ---------------------------------------------------------------- Punkte und gefüllte Augen

def flecken_finden(bild):
    """Farbige und schwarze Flecken (Kerne nach Erosion). Gibt Punkte und große schwarze Flächen zurück.

    Punkt = {farbe, x, y, r}: Mitte und Radius (Radius aus der Kernfläche plus Erosion).
    """
    W, H = bild.W, bild.H
    kl = [None] * (W * H)
    for i in range(W * H):
        if bild.lum[i] < 235 or ist_bunt(bild.r[i], bild.g[i], bild.b[i]):
            kl[i] = farbklasse(bild.r[i], bild.g[i], bild.b[i])
    rad = EROSION
    off = [dy * W + dx for dy in range(-rad, rad + 1) for dx in range(-rad, rad + 1) if dx * dx + dy * dy <= rad * rad]
    kern = bytearray(W * H)
    for i in range(W * H):
        k = kl[i]
        if k is None or k == 'bunt':
            continue
        x = i % W
        y = i // W
        if x < rad or y < rad or x >= W - rad or y >= H - rad:
            continue
        if all(kl[i + o] == k for o in off):
            kern[i] = 1
    gesehen = bytearray(W * H)
    punkte = []
    flaechen = []
    for i in range(W * H):
        if not kern[i] or gesehen[i]:
            continue
        k = kl[i]
        st = [i]
        gesehen[i] = 1
        pix = []
        while st:
            j = st.pop()
            pix.append(j)
            for o in (-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1):
                n = j + o
                if kern[n] and not gesehen[n] and kl[n] == k:
                    gesehen[n] = 1
                    st.append(n)
        n = len(pix)
        mx = sum(p % W for p in pix) / n
        my = sum(p // W for p in pix) / n
        if k == 'schwarz' and n > 60:
            flaechen.append({'x': mx, 'y': my, 'n': n, 'pixel': pix})
            continue
        if n < 5:
            continue
        r = math.sqrt(n / math.pi) + rad + 0.5
        punkte.append({'farbe': k, 'x': mx, 'y': my, 'r': r, 'n': n})
    return punkte, flaechen


# ---------------------------------------------------------------- Ansicht freistellen

class Ansicht:
    """Arbeitsdaten einer Ansicht im Rechteck box = (x0, y0, x1, y1) der Vorlage."""

    def __init__(self, bild, box, punkte):
        self.bild = bild
        self.x0, self.y0, x1, y1 = box
        self.w = x1 - self.x0
        self.h = y1 - self.y0
        w, h = self.w, self.h
        self.punkte = [p for p in punkte if self.x0 <= p['x'] < x1 and self.y0 <= p['y'] < y1]
        D = bytearray(w * h)
        for y in range(h):
            yy = self.y0 + y
            if not 0 <= yy < bild.H:
                continue
            for x in range(w):
                xx = self.x0 + x
                if 0 <= xx < bild.W:
                    D[y * w + x] = 255 - bild.lum[yy * bild.W + xx]
        self.D = bytes(D)
        self._freistellen()

    def _freistellen(self):
        w, h, D = self.w, self.h, self.D
        # Tinte um 1 px erweitert: schließt Haarlücken (z. B. wo graue und dunkle Hälfte an der Achse
        # nicht ganz zusammenstoßen); die Strichmitte holt auf_strichmitte zurück.
        tinte = bytearray(1 if D[j] >= TINTE else 0 for j in range(w * h))
        sperre = bytearray(tinte)
        for j in range(w * h):
            if not tinte[j]:
                continue
            x = j % w
            for dy in (-w, 0, w):
                for dx in (-1, 0, 1):
                    if (dx == -1 and x == 0) or (dx == 1 and x == w - 1):
                        continue
                    n = j + dy + dx
                    if 0 <= n < w * h:
                        sperre[n] = 1
        aussen = bytearray(w * h)
        q = deque()
        for x in range(w):
            for y in (0, h - 1):
                j = y * w + x
                if not sperre[j] and not aussen[j]:
                    aussen[j] = 1
                    q.append(j)
        for y in range(h):
            for x in (0, w - 1):
                j = y * w + x
                if not sperre[j] and not aussen[j]:
                    aussen[j] = 1
                    q.append(j)
        while q:
            j = q.popleft()
            x = j % w
            for n, ok in ((j - 1, x > 0), (j + 1, x < w - 1), (j - w, j >= w), (j + w, j < w * (h - 1))):
                if ok and not aussen[n] and not sperre[n]:
                    aussen[n] = 1
                    q.append(n)
        self.aussen = aussen
        # größte Nicht-Außen-Fläche (8er-Nachbarschaft)
        marke = bytearray(w * h)
        beste = None
        for s in range(w * h):
            if aussen[s] or marke[s]:
                continue
            st = [s]
            marke[s] = 1
            pix = []
            while st:
                j = st.pop()
                pix.append(j)
                x = j % w
                for dy in (-w, 0, w):
                    for dx in (-1, 0, 1):
                        if (dx == -1 and x == 0) or (dx == 1 and x == w - 1):
                            continue
                        n = j + dy + dx
                        if 0 <= n < w * h and not aussen[n] and not marke[n]:
                            marke[n] = 1
                            st.append(n)
            if beste is None or len(pix) > len(beste):
                beste = pix
        flaeche = bytearray(w * h)
        for j in beste:
            flaeche[j] = 1
        self.flaeche = flaeche
        self.flaeche_n = len(beste)

    # ------------------------------------------------------------ Umriss

    def umriss_pixel(self):
        """Moore-Verfolgung der Fläche; Pixelmitten in Vorlagenkoordinaten, im Bild im Uhrzeigersinn."""
        w, h, f = self.w, self.h, self.flaeche
        start = next(j for j in range(w * h) if f[j])
        sx, sy = start % w, start // w
        nb = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)]

        def drin(x, y):
            return 0 <= x < w and 0 <= y < h and f[y * w + x]

        kontur = [(sx, sy)]
        cx, cy, zurueck = sx, sy, 0
        erste_richtung = None
        for _ in range(4 * w * h):
            for k in range(8):
                d = (zurueck + 1 + k) % 8
                nx, ny = cx + nb[d][0], cy + nb[d][1]
                if drin(nx, ny):
                    break
            else:
                break
            if erste_richtung is None:
                erste_richtung = d
            elif (cx, cy) == (sx, sy) and d == erste_richtung:
                break
            zurueck = (d + 4) % 8
            cx, cy = nx, ny
            kontur.append((cx, cy))
        if kontur[-1] == kontur[0]:
            kontur.pop()
        return [(x + self.x0, y + self.y0) for x, y in kontur]

    def dunkel(self, x, y):
        """Bilineare Dunkelheit an einer Stelle (Vorlagenkoordinaten)."""
        D = self.D
        x -= self.x0
        y -= self.y0
        ix, iy = int(math.floor(x)), int(math.floor(y))
        fx, fy = x - ix, y - iy
        w, h = self.w, self.h

        def g(xx, yy):
            return D[yy * w + xx] if 0 <= xx < w and 0 <= yy < h else 0

        return ((g(ix, iy) * (1 - fx) + g(ix + 1, iy) * fx) * (1 - fy)
                + (g(ix, iy + 1) * (1 - fx) + g(ix + 1, iy + 1) * fx) * fy)


# ---------------------------------------------------------------- Polylinien

def glaetten(pts, geschlossen, r=2):
    n = len(pts)
    out = []
    for i in range(n):
        if not geschlossen and (i < r or i >= n - r):
            out.append(pts[i])
            continue
        sx = sy = 0.0
        for k in range(-r, r + 1):
            p = pts[(i + k) % n]
            sx += p[0]
            sy += p[1]
        out.append((sx / (2 * r + 1), sy / (2 * r + 1)))
    return out


def neu_abtasten(pts, schritt, geschlossen):
    seq = pts + [pts[0]] if geschlossen else list(pts)
    out = [seq[0]]
    rest = 0.0
    for i in range(1, len(seq)):
        a, b = seq[i - 1], seq[i]
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 1e-9:
            continue
        t = schritt - rest
        while t <= L:
            out.append((a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L))
            t += schritt
        rest = L - (t - schritt)
    if geschlossen and math.hypot(out[-1][0] - out[0][0], out[-1][1] - out[0][1]) < schritt * 0.5:
        out.pop()
    if not geschlossen and math.hypot(out[-1][0] - seq[-1][0], out[-1][1] - seq[-1][1]) > 0.3:
        out.append(seq[-1])
    return out


def flaeche_vorzeichen(pts):
    """Doppelte Fläche (Schnürsenkel); im Bild (y nach unten) positiv = im Uhrzeigersinn."""
    s = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return s


def auf_strichmitte(ansicht, pts, fenster=(-1.5, 3.5), schritt=0.25, aussen_zuerst=True):
    """Schiebt einen geschlossenen Bildumriss (im Uhrzeigersinn) entlang der Innennormalen auf die
    Strichmitte (gewichteter Schwerpunkt um die Spitze der Dunkelheit). Mit `aussen_zuerst` zählt die
    äußerste Spitze im Fenster, nicht die dunkelste (ein dicht innen liegender Strich, z. B. eine farbige
    Lippenlinie neben dem Umriss, zieht dann nicht). Gibt die verschobenen Punkte und Verschiebungen zurück."""
    n = len(pts)
    ts = []
    t = fenster[0]
    while t <= fenster[1] + 1e-9:
        ts.append(t)
        t += schritt
    versatz = []
    for i in range(n):
        a = pts[(i - 2) % n]
        b = pts[(i + 2) % n]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1.0
        nx, ny = -ty / L, tx / L          # innen bei Uhrzeigersinn im Bild
        x, y = pts[i]
        werte = [ansicht.dunkel(x + t * nx, y + t * ny) for t in ts]
        m = max(werte)
        if m < 8:
            versatz.append(None)
            continue
        k = werte.index(m)
        if aussen_zuerst:
            schwelle = max(8.0, 0.35 * m)
            k = next(j for j in range(len(werte)) if werte[j] >= schwelle)
            while k < len(werte) - 1 and werte[k + 1] >= werte[k]:
                k += 1
        spitze = werte[k]
        lo = k
        while lo > 0 and werte[lo - 1] >= spitze * 0.5 and werte[lo - 1] <= werte[lo]:
            lo -= 1
        hi = k
        while hi < len(werte) - 1 and werte[hi + 1] >= spitze * 0.5 and werte[hi + 1] <= werte[hi]:
            hi += 1
        s = sum(werte[lo:hi + 1])
        versatz.append(sum(ts[j] * werte[j] for j in range(lo, hi + 1)) / s)
    # Lücken füllen, Ausreißer per Median über 7 Nachbarn
    bekannt = [v for v in versatz if v is not None]
    mittel = sorted(bekannt)[len(bekannt) // 2] if bekannt else 0.0
    versatz = [mittel if v is None else v for v in versatz]
    med = []
    for i in range(n):
        fenster_w = sorted(versatz[(i + k) % n] for k in range(-3, 4))
        med.append(fenster_w[3])
    out = []
    for i in range(n):
        a = pts[(i - 2) % n]
        b = pts[(i + 2) % n]
        tx, ty = b[0] - a[0], b[1] - a[1]
        L = math.hypot(tx, ty) or 1.0
        nx, ny = -ty / L, tx / L
        out.append((pts[i][0] + med[i] * nx, pts[i][1] + med[i] * ny))
    return out, med


def _winkel(t, v):
    lt = math.hypot(*t)
    lv = math.hypot(*v)
    if lt < 1e-9 or lv < 1e-9:
        return 180.0
    return math.degrees(math.acos(max(-1.0, min(1.0, (t[0] * v[0] + t[1] * v[1]) / (lt * lv)))))


def _schnitt(p, u, q, v):
    """Schnitt der Geraden p + s·u und q + t·v; gibt (s, t) oder None."""
    det = u[0] * (-v[1]) - u[1] * (-v[0])
    if abs(det) < 1e-9:
        return None
    rx, ry = q[0] - p[0], q[1] - p[1]
    s = (rx * (-v[1]) - ry * (-v[0])) / det
    t = (u[0] * ry - u[1] * rx) / det
    return s, t


def punkte_einrechnen(pts, punkte, zugabe=2.5, grenz_grad=15.0, knick_grad=20.0):
    """Ersetzt Umrissproben (geschlossen, Abstand ≈ 1 px) im Bereich von Florians Punkten.

    - 'mitte': Laufrichtung vor dem Punkt und Rückrichtung danach zeigen beide auf die Punktmitte (unter
      `grenz_grad`): Der Strich läuft durch den Punkt, der Umriss führt durch die Mitte.
    - 'ecke': Sonst, wenn Ein- und Austrittsrichtung um mehr als `knick_grad` abknicken und sich im Punkt
      schneiden: Der Umriss führt durch den Schnittpunkt (Ecke, deren Striche nicht genau mittig enden).
    - 'sehne': Sonst streift der Punkt den Umriss nur; die Sehne zwischen Ein- und Austritt ersetzt die Beule.
    Gibt die neuen Punkte und je Punkt (Index) die Entscheidung zurück.
    """
    entscheid = {}
    for k, p in enumerate(punkte):
        c = (p['x'], p['y'])
        rad = p['r'] + zugabe
        n = len(pts)
        drin = [math.hypot(q[0] - c[0], q[1] - c[1]) <= rad for q in pts]
        if not any(drin) or all(drin):
            continue
        s0 = drin.index(False)
        pts = pts[s0:] + pts[:s0]
        drin = drin[s0:] + drin[:s0]
        neu = []
        i = 0
        while i < n:
            if not drin[i]:
                neu.append(pts[i])
                i += 1
                continue
            j = i
            while j < n and drin[j]:
                j += 1
            e = pts[i - 1]
            x = pts[j % n]
            te = (e[0] - pts[i - 6][0], e[1] - pts[i - 6][1])
            tx = (x[0] - pts[(j + 5) % n][0], x[1] - pts[(j + 5) % n][1])
            we = _winkel(te, (c[0] - e[0], c[1] - e[1]))
            wx = _winkel(tx, (c[0] - x[0], c[1] - x[1]))
            if we < grenz_grad and wx < grenz_grad:
                neu.append(c)
                entscheid[k] = 'mitte'
            else:
                st = _schnitt(e, te, x, tx)
                knick = _winkel(te, (-tx[0], -tx[1]))
                if st and st[0] > 0 and st[1] > 0 and knick > knick_grad:
                    sp = (e[0] + st[0] * te[0], e[1] + st[0] * te[1])
                    if math.hypot(sp[0] - c[0], sp[1] - c[1]) <= rad:
                        neu.append(sp)
                        entscheid[k] = 'ecke'
                    else:
                        entscheid[k] = 'sehne'
                else:
                    entscheid[k] = 'sehne'
            i = j
        pts = neu_abtasten(neu, 1.0, True)
    return pts, entscheid


def umriss(ansicht):
    """Geschlossener Umriss auf der Strichmitte (Vorlagenkoordinaten, Abstand ≈ 1 px, Uhrzeigersinn im Bild)."""
    roh = ansicht.umriss_pixel()
    pts = neu_abtasten(glaetten(roh, True, 1), 1.0, True)
    if flaeche_vorzeichen(pts) < 0:
        pts.reverse()
    mitte, versatz = auf_strichmitte(ansicht, pts, fenster=(-1.0, 4.5))
    mitte, entscheid = punkte_einrechnen(mitte, ansicht.punkte)
    for k, e in entscheid.items():
        ansicht.punkte[k]['umriss'] = e
    return mitte, roh, versatz
