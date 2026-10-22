#!/usr/bin/env python3
"""Zieht Florians Wesen-Bögen nach und legt sie als Editor-Versuch ab (nur Standardbibliothek, macOS: sips).

Aufruf aus dem Repo:
    python3 apps/editor/scripts/nachziehen/nachziehen.py [rex langhals robbe] [--arbeit ORDNER]

Schreibt je Wesen:
- apps/editor/public/versuch/<name>/<name>.json   profile, punkte, linien, augen, bilder, meta
- apps/editor/public/versuch/<name>/linien-<ansicht>.png
- docs/progress/editor/nachziehen-<name>.png       Kontaktbogen (Vorlage mit Kurven, Punkten, Augen)
und gibt den Prüfbericht aus (zusätzlich bericht-<name>.json im Arbeitsordner).
"""

import argparse
import json
import math
import os
import pickle
import sys
import tempfile
import time

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, '..', '..', '..', '..'))
sys.path.insert(0, HIER)
sys.dont_write_bytecode = True   # kein __pycache__ im Repo

import bild as bildmod  # noqa: E402
import blatt  # noqa: E402
import fit  # noqa: E402
import merkmale  # noqa: E402
import segment  # noqa: E402
from wesen import WESEN, ZIEL_GROESSE  # noqa: E402

FEHLER_PX = 1.6
SEITEN = ('seite', 'seite_auf', 'seite_zaehne')
FRONTEN = ('front', 'front_auf', 'front_zaehne')


def r5(v):
    return round(v, 5) + 0.0


def bbox(pts):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


# ---------------------------------------------------------------- Abbildung Bild ↔ Ansicht

class Abbildung:
    """Bildpixel (x nach rechts, y nach unten) ↔ Ansichtspixel (X nach rechts, Y nach oben).

    Seite/Front: X = x − ux, Y = vy − y (vy = Boden). Top: X = x − ux, Y = y − vy (vy = Achse; die
    dunkle untere Bildhälfte wird so zur editierbaren Hälfte Y ≥ 0).
    """

    def __init__(self, art, ux, vy):
        self.art = art
        self.ux = ux
        self.vy = vy

    def ansicht(self, p):
        x, y = p
        return (x - self.ux, (y - self.vy) if self.art == 'top' else (self.vy - y))

    def bild(self, p):
        X, Y = p
        return (X + self.ux, (Y + self.vy) if self.art == 'top' else (self.vy - Y))

    def json(self):
        return {'art': self.art, 'ux': round(self.ux, 3), 'vy': round(self.vy, 3)}


def art_von(an):
    if an in SEITEN:
        return 'seite'
    if an in FRONTEN:
        return 'front'
    return 'top'


# ---------------------------------------------------------------- Achse, Registrierung, Halbweg

def spiegelachse(pts, senkrecht):
    """Mitte zwischen äußerstem linken und rechten (bzw. oberen und unteren) Schnitt je Zeile (Spalte).
    Gibt Median, mittlere absolute Abweichung und Spannweite (5–95 %) zurück."""
    x0, y0, x1, y1 = bbox(pts)
    a, b = (y0, y1) if senkrecht else (x0, x1)
    lo, hi = a + 0.03 * (b - a), b - 0.03 * (b - a)
    n = len(pts)
    mitten = []
    v = math.ceil(lo)
    while v <= hi:
        s = []
        for i in range(n):
            p, q = pts[i], pts[(i + 1) % n]
            pa, qa = (p[1], q[1]) if senkrecht else (p[0], q[0])
            if (pa - v) * (qa - v) < 0 or (pa == v and qa != v):
                t = (v - pa) / (qa - pa)
                s.append(p[0] + t * (q[0] - p[0]) if senkrecht else p[1] + t * (q[1] - p[1]))
        if len(s) >= 2:
            mitten.append((min(s) + max(s)) / 2)
        v += 1
    mitten.sort()
    med = mitten[len(mitten) // 2]
    mad = sorted(abs(m - med) for m in mitten)[len(mitten) // 2]
    return med, mad, (mitten[len(mitten) // 20], mitten[-1 - len(mitten) // 20])


def registrieren(ref, ziel, start, weite=40):
    """Verschiebung (dx, dy), die die Referenzpunkte bestmöglich auf den Zielumriss legt.
    Kosten: mittleres Abstandsquadrat, bei 6 px gekappt. Gitter 4 px, dann 1, 0,25 und 0,05 px."""
    zelle = 6.0
    gitter = {}
    for q in ziel:
        gitter.setdefault((int(q[0] // zelle), int(q[1] // zelle)), []).append(q)

    def kosten(dx, dy):
        s = 0.0
        for p in ref:
            x, y = p[0] + dx, p[1] + dy
            gx, gy = int(x // zelle), int(y // zelle)
            best = 36.0
            for ix in (gx - 1, gx, gx + 1):
                for iy in (gy - 1, gy, gy + 1):
                    for q in gitter.get((ix, iy), ()):
                        d = (q[0] - x) ** 2 + (q[1] - y) ** 2
                        if d < best:
                            best = d
            s += best
        return s / len(ref)

    bx, by = start
    best = (kosten(bx, by), bx, by)
    for schritt, w in ((4.0, weite), (1.0, 4.0), (0.25, 1.0), (0.05, 0.25)):
        cx, cy = best[1], best[2]
        k = int(round(w / schritt))
        for i in range(-k, k + 1):
            for j in range(-k, k + 1):
                c = kosten(cx + i * schritt, cy + j * schritt)
                if c < best[0]:
                    best = (c, cx + i * schritt, cy + j * schritt)
    return best[1], best[2], math.sqrt(best[0])


def uhrzeiger(pts):
    """Ansichtskoordinaten (Y nach oben): im Uhrzeigersinn ausrichten."""
    s = segment.flaeche_vorzeichen(pts)   # bei Y nach oben: negativ = Uhrzeigersinn
    return list(reversed(pts)) if s > 0 else list(pts)


def halbweg(pts, senkrecht):
    """Weg über die editierbare Hälfte (Ansichtskoordinaten, Achse 0, Uhrzeigersinn):
    Front von oben nach unten, Top von vorn (links) nach hinten. Endpunkte genau auf der Achse."""
    n = len(pts)

    def s(p):
        return p[0] if senkrecht else p[1]

    kreuz = []
    for i in range(n):
        p, q = pts[i], pts[(i + 1) % n]
        if (s(p) <= 0 < s(q)) or (s(q) <= 0 < s(p)):
            t = (0 - s(p)) / (s(q) - s(p))
            c = (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]))
            c = (0.0, c[1]) if senkrecht else (c[0], 0.0)
            kreuz.append((i, c, s(q) > 0))
    rein = [k for k in kreuz if k[2]]
    raus = [k for k in kreuz if not k[2]]
    if senkrecht:
        a = max(rein, key=lambda k: k[1][1])
        b = min(raus, key=lambda k: k[1][1])
    else:
        a = min(rein, key=lambda k: k[1][0])
        b = max(raus, key=lambda k: k[1][0])
    weg = [a[1]]
    i = (a[0] + 1) % n
    while True:
        p = pts[i]
        weg.append((max(0.0, p[0]), p[1]) if senkrecht else (p[0], max(0.0, p[1])))
        if i == b[0]:
            break
        i = (i + 1) % n
    weg.append(b[1])
    return weg, len(kreuz)


def probe(pts, geschlossen):
    """Glätten und auf 2 px abtasten (wie für die Anpassung)."""
    return segment.neu_abtasten(segment.glaetten(pts, geschlossen, 2), 2.0, geschlossen)


# ---------------------------------------------------------------- Welt (Kacheln)

def knoten_welt(kn, K):
    return [{'p': {'x': r5(k['p'][0] * K), 'y': r5(k['p'][1] * K)},
             'ein': {'x': r5(k['ein'][0] * K), 'y': r5(k['ein'][1] * K)},
             'aus': {'x': r5(k['aus'][0] * K), 'y': r5(k['aus'][1] * K)},
             'art': k['art']} for k in kn]


def pw(abb, K, p):
    X, Y = abb.ansicht(p)
    return {'x': r5(X * K), 'y': r5(Y * K)}


# ---------------------------------------------------------------- Hauptablauf je Wesen

def flecken_laden(b, quelle, arbeit):
    pk = os.path.join(arbeit, 'flecken-' + os.path.basename(quelle) + '.pkl')
    if os.path.exists(pk) and os.path.getmtime(pk) > os.path.getmtime(quelle):
        return pickle.load(open(pk, 'rb'))
    erg = segment.flecken_finden(b)
    pickle.dump(erg, open(pk, 'wb'))
    return erg


def verarbeiten(name, arbeit):
    cfg = WESEN[name]
    quelle = os.path.join(REPO, cfg['bild'])
    t0 = time.time()
    b = bildmod.laden(quelle, arbeit)
    punkte_alle, flaechen_alle = flecken_laden(b, quelle, arbeit)
    bericht = {'wesen': name, 'quelle': cfg['bild'], 'ansichten': {}}

    # 1. Umrisse
    ans = {}
    for an, ac in cfg['ansichten'].items():
        A = segment.Ansicht(b, ac['box'], punkte_alle)
        kontur, roh, versatz = segment.umriss(A)
        ans[an] = {'A': A, 'kontur': kontur, 'cfg': ac, 'bbox': bbox(kontur)}

    # 2. Vorläufige Abbildungen (Pixel); Feinausrichtung nach der Anpassung in Schritt 4
    s = ans['seite']
    sx0, sy0, sx1, sy1 = s['bbox']
    laenge = sx1 - sx0
    cx = (sx0 + sx1) / 2
    s['abb'] = Abbildung('seite', cx, sy1)
    mw_seite = [p for p in s['A'].punkte if p['farbe'] == 'schwarz']
    for an, a in ans.items():
        if an == 'seite':
            continue
        x0, y0, x1, y1 = a['bbox']
        art = art_von(an)
        if art == 'seite':
            # hinteren Teil der geschlossenen Seite auf diese Ansicht legen → gemeinsamer x-Nullpunkt
            teilung = (mw_seite[0]['x'] if mw_seite else sx0) + 0.3 * laenge
            ref = [p for p in s['kontur'] if p[0] > teilung][::6]
            dx, dy, rms = registrieren(ref, a['kontur'], (x1 - sx1, y1 - sy1))
            a['abb'] = Abbildung('seite', cx + dx, y1)
            a['registrierung'] = {'dx': round(dx, 2), 'dy': round(dy, 2), 'rms_px': round(rms, 2)}
        elif art == 'front':
            achse, mad, spanne = spiegelachse(a['kontur'], True)
            a['abb'] = Abbildung('front', achse, y1)
            a['achse'] = {'x': round(achse, 2), 'mad_px': round(mad, 2), 'spanne_px': [round(v, 2) for v in spanne]}
        else:
            achse, mad, spanne = spiegelachse(a['kontur'], False)
            a['abb'] = Abbildung('top', (x0 + x1) / 2, achse)
            a['achse'] = {'y': round(achse, 2), 'mad_px': round(mad, 2), 'spanne_px': [round(v, 2) for v in spanne]}

    # 3. Profile anpassen (Ansichtspixel)
    for an, a in ans.items():
        if a['cfg'].get('nur_bild'):
            continue
        abb = a['abb']
        art = abb.art
        pts = uhrzeiger([abb.ansicht(p) for p in a['kontur']])
        # Ecken rasten nur auf Punkte ein, durch deren Mitte der Umriss läuft
        fest = [abb.ansicht((p['x'], p['y'])) for p in a['A'].punkte if p.get('umriss') == 'mitte']
        if art == 'seite':
            pr = probe(pts, True)
            kn = fit.profil_geschlossen(pr, FEHLER_PX ** 2, fest)
            geschlossen = True
        else:
            senkrecht = art == 'front'
            weg, nk = halbweg(pts, senkrecht)
            pr = probe(weg, False)
            pr[0] = weg[0]
            pr[-1] = weg[-1]
            kn = fit.profil_halb(pr, FEHLER_PX ** 2, senkrecht, fest)
            geschlossen = False
            a['halb_kreuzungen'] = nk
        a['knoten'] = kn
        a['geschlossen'] = geschlossen
        a['fehler'] = fit.fehler(pr, kn, geschlossen)

    # 4. Nullpunkte an der angepassten Kurve: Boden = tiefster Kurvenpunkt (Seite, Front), Seite mittig in x
    #    (alle Seitenansichten teilen die Verschiebung der geschlossenen Seite), Top mittig in x.
    cX = sum(fit.ausdehnung(s['knoten'], True)[0::2]) / 2
    for an, a in ans.items():
        abb = a['abb']
        hat = 'knoten' in a
        ex = fit.ausdehnung(a['knoten'], a['geschlossen']) if hat else None
        dX = cX if abb.art == 'seite' else ((ex[0] + ex[2]) / 2 if (abb.art == 'top' and hat) else 0.0)
        dY = ex[1] if (hat and abb.art != 'top') else 0.0
        if hat:
            a['knoten'] = [{**k, 'p': (k['p'][0] - dX, k['p'][1] - dY)} for k in a['knoten']]
            a['ausdehnung'] = fit.ausdehnung(a['knoten'], a['geschlossen'])
        abb.ux += dX
        if abb.art != 'top':
            abb.vy -= dY
    ex = s['ausdehnung']
    laenge, hoehe = ex[2] - ex[0], ex[3] - ex[1]
    K = ZIEL_GROESSE / max(laenge, hoehe)
    bericht['kachel_pro_px'] = K
    bericht['seite_px'] = {'laenge': round(laenge, 2), 'hoehe': round(hoehe, 2)}
    for an, a in ans.items():
        if 'registrierung' in a:
            # wie weit der eigene Boden unter dem der geschlossenen Seite liegt (positiv = tiefer)
            v = a['abb'].vy - (s['abb'].vy + a['registrierung']['dy'])
            a['registrierung']['boden_versatz_px'] = round(v, 2)
            a['registrierung']['boden_versatz_kachel'] = round(v * K, 5)
    profile = {}
    for an, a in ans.items():
        if 'knoten' not in a:
            continue
        if a['geschlossen']:
            profile[an] = {'art': 'geschlossen', 'knoten': knoten_welt(a['knoten'], K)}
        else:
            profile[an] = {'art': 'halb', 'achse': 'senkrecht' if a['abb'].art == 'front' else 'waagerecht',
                           'knoten': knoten_welt(a['knoten'], K)}

    # 5. Maullinien
    linien = {}
    punkte = {}
    for an, a in ans.items():
        if a['cfg'].get('nur_bild'):
            continue
        if an == 'top' or not a['A'].punkte:
            punkte[an] = []
            continue
        ls, _ = merkmale.maullinien(a['A'].punkte)
        abb = a['abb']
        welt = []
        for li in ls:
            pts = [abb.ansicht(p) for p in li['punkte']]
            if abb.art == 'front' and abs(pts[0][0]) < 3.0:
                pts[0] = (0.0, pts[0][1])     # Anfang liegt auf der Achse
            welt.append({'farbe': li['farbe'], 'punkte': [{'x': r5(X * K), 'y': r5(Y * K)} for X, Y in pts]})
        linien[an] = welt
        # flach wie beim Tiger: erste Linie bis vor den Mundwinkel, Mundwinkel, zweite Linie rückwärts
        flach = [{'farbe': welt[0]['farbe'], **q} for q in welt[0]['punkte'][:-1]]
        flach.append({'farbe': 'schwarz', **welt[0]['punkte'][-1]})
        for li in welt[1:]:
            flach.extend({'farbe': li['farbe'], **q} for q in reversed(li['punkte'][:-1]))
        punkte[an] = flach
        a['linien'] = ls

    # 6. Augen
    augen = {}
    for an, a in ans.items():
        if a['cfg'].get('nur_bild'):
            continue
        abb = a['abb']
        liste = []
        roh_augen = []
        if a['cfg'].get('augen'):
            for m in a['cfg']['augen']:
                e = merkmale.auge_gezeichnet(a['A'], m)
                roh_augen.append(e)
        else:
            bx0, by0, bx1, by1 = a['cfg']['box']
            for f in flaechen_alle:
                if bx0 <= f['x'] < bx1 and by0 <= f['y'] < by1:
                    roh_augen.append(merkmale.auge_gefuellt(b, f))
        for e in roh_augen:
            X, Y = abb.ansicht((sum(p[0] for p in e['umriss']) / len(e['umriss']), sum(p[1] for p in e['umriss']) / len(e['umriss'])))
            if abb.art == 'front' and X < 0:
                continue
            if abb.art == 'top' and Y < 0:
                continue
            poly = merkmale.polygon_gleichmaessig(e['umriss'], 24)
            eintrag = {'art': cfg['auge_art'], 'punkte': [pw(abb, K, p) for p in poly]}
            if e.get('lid'):
                lid = segment.neu_abtasten(e['lid'], max(1.0, len(e['lid']) / 12), False)
                eintrag['lid'] = [pw(abb, K, p) for p in lid]
            if e.get('glanz'):
                eintrag['glanz'] = [pw(abb, K, p) for p in merkmale.polygon_gleichmaessig(e['glanz'], 12)]
            liste.append(eintrag)
            e['poly'] = poly
        a['augen'] = [e for e in roh_augen if 'poly' in e]
        if liste:
            augen[an] = liste

    # 7. Linienbilder
    ziel = os.path.join(REPO, 'apps', 'editor', 'public', 'versuch', name)
    os.makedirs(ziel, exist_ok=True)
    bilder = {}
    linienbilder = {}
    for an, a in ans.items():
        abb = a['abb']
        top = abb.art == 'top'
        rand = None if a['cfg'].get('nur_bild') else a['kontur']
        w, h, px, (bx0, by0, bx1, by1) = merkmale.linienbild(b, a['A'], rand, spiegeln=top)
        datei = f'linien-{an}.png'
        bildmod.png_schreiben(os.path.join(ziel, datei), w, h, px)
        linienbilder[an] = (w, h, px)
        # Pixelkanten: Pixel i deckt [i − 0,5, i + 0,5]
        ecke_a = abb.ansicht((bx0 - 0.5, by0 - 0.5))
        ecke_b = abb.ansicht((bx1 - 0.5, by1 - 0.5))
        xa, xb = ecke_a[0] * K, ecke_b[0] * K
        ya, yb = ecke_a[1] * K, ecke_b[1] * K
        bilder[an] = {'datei': datei, 'x0': r5(xa), 'y0': r5(max(ya, yb)), 'x1': r5(xb), 'y1': r5(min(ya, yb))}

    # 8. Prüfungen
    pruef = pruefen(ans, K, linien)
    bericht['pruefung'] = pruef
    for an, a in ans.items():
        e = {'box': list(a['cfg']['box']), 'abbildung': a['abb'].json(), 'punkte': len(a['A'].punkte),
             'umriss_flaeche_px': a['A'].flaeche_n}
        for k in ('registrierung', 'achse', 'halb_kreuzungen'):
            if a.get(k) is not None:
                e[k] = a[k]
        if 'knoten' in a:
            e['knoten'] = len(a['knoten'])
            e['ecken'] = sum(1 for k in a['knoten'] if k['art'] == 'ecke')
            e['fehler_px'] = {'max': round(a['fehler'][0], 2), 'mittel': round(a['fehler'][1], 2)}
        if a.get('augen'):
            e['augen'] = [{'stuecke': x.get('stuecke'), 'lid': bool(x.get('lid')), 'glanz': bool(x.get('glanz'))} for x in a['augen']]
        if a.get('linien'):
            e['maul'] = {li['farbe']: len(li['punkte']) for li in a['linien']}
            e['maul_anfang'] = maul_anfang(a)
            e['punkt_umriss'] = {f"{p['farbe']}@{p['x']:.0f},{p['y']:.0f}": p['umriss'] for p in a['A'].punkte if p.get('umriss')}
        bericht['ansichten'][an] = e

    # 9. JSON
    meta = {'quelle': cfg['bild'], 'kachel_pro_px': K, 'ziel_groesse': ZIEL_GROESSE,
            'erzeugt_mit': 'apps/editor/scripts/nachziehen/nachziehen.py',
            'ansichten': {an: {'box': list(a['cfg']['box']), 'abbildung': a['abb'].json(),
                               **({'registrierung': a['registrierung']} if a.get('registrierung') else {}),
                               **({'fehler_px': round(a['fehler'][0], 2)} if a.get('fehler') else {})}
                          for an, a in ans.items()},
            'pruefung': pruef}
    daten = {'profile': profile, 'punkte': punkte, 'linien': linien, 'augen': augen, 'bilder': bilder, 'meta': meta}
    with open(os.path.join(ziel, f'{name}.json'), 'w') as f:
        json.dump(daten, f, indent=1, ensure_ascii=False)
        f.write('\n')

    # 10. Kontaktbogen
    blatt_pfad = os.path.join(REPO, 'docs', 'progress', 'editor', f'nachziehen-{name}.png')
    blatt.zeichnen(blatt_pfad, b, cfg, ans, K, daten, linienbilder, pruef)
    bericht['dateien'] = [os.path.relpath(p, REPO) for p in
                          [os.path.join(ziel, f'{name}.json')] + [os.path.join(ziel, v['datei']) for v in bilder.values()] + [blatt_pfad]]
    bericht['sekunden'] = round(time.time() - t0, 1)
    with open(os.path.join(arbeit, f'bericht-{name}.json'), 'w') as f:
        json.dump(bericht, f, indent=1, ensure_ascii=False)
    return bericht


def maul_anfang(a):
    """Wie weit der erste Punkt jeder Linie von Achse (Front) bzw. Umriss (Seite) entfernt ist (px)."""
    abb = a['abb']
    out = {}
    for li in a['linien']:
        p = li['punkte'][0]
        if abb.art == 'front':
            out[li['farbe']] = {'achse_px': round(abb.ansicht(p)[0], 2)}
        else:
            d = min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in a['kontur'])
            out[li['farbe']] = {'umriss_px': round(d, 2)}
    return out


def pruefen(ans, K, linien):
    """Gemeinsame Ausdehnungen (2-%-Grenze) und Höhen der Maulpunkte Seite gegen Front."""
    def aus(an):
        return ans[an]['ausdehnung'] if an in ans and 'ausdehnung' in ans[an] else None

    erg = {'ausdehnung': [], 'maulhoehen': []}

    def vergleich(text, a, b):
        if a is None or b is None:
            return
        rel = (a - b) / max(a, b) * 100
        erg['ausdehnung'].append({'vergleich': text, 'a_px': round(a, 2), 'b_px': round(b, 2), 'diff_px': round(a - b, 2),
                                  'diff_kachel': round((a - b) * K, 5), 'prozent': round(rel, 2), 'ok': abs(rel) <= 2.0})

    s, f, t = aus('seite'), aus('front'), aus('top')
    sa, fa = aus('seite_auf'), aus('front_auf')
    if s and f:
        vergleich('Höhe Seite / Front (zu)', s[3], f[3])
    if s and t:
        vergleich('Länge Seite / Top', s[2] - s[0], t[2] - t[0])
    if f and t:
        vergleich('Breite Front / Top (zu)', 2 * f[2], 2 * t[3])
    if sa and fa:
        vergleich('Höhe Seite / Front (auf)', sa[3], fa[3])
    if sa and t:
        vergleich('Länge Seite auf / Top', sa[2] - sa[0], t[2] - t[0])
    if fa and t:
        vergleich('Breite Front auf / Top', 2 * fa[2], 2 * t[3])
    # Abstände der Punkte entlang jeder Linie (gleichmäßig verteilt? Variationskoeffizient)
    erg['abstaende'] = {}
    for an, ls in linien.items():
        for li in ls:
            q = [(p['x'] / K, p['y'] / K) for p in li['punkte']]
            d = [math.hypot(q[i + 1][0] - q[i][0], q[i + 1][1] - q[i][1]) for i in range(len(q) - 1)]
            m = sum(d) / len(d)
            cv = math.sqrt(sum((x - m) ** 2 for x in d) / len(d)) / m if m > 0 else 0.0
            erg['abstaende'].setdefault(an, {})[li['farbe']] = {'px': [round(x, 1) for x in d], 'cv': round(cv, 3)}
    for zs, (sn, fn) in (('zu', ('seite', 'front')), ('auf', ('seite_auf', 'front_auf'))):
        if sn not in linien or fn not in linien:
            continue
        for ls in linien[sn]:
            lf = next((x for x in linien[fn] if x['farbe'] == ls['farbe']), None)
            if not lf:
                continue
            hs = [q['y'] / K for q in ls['punkte']]
            hf = [q['y'] / K for q in lf['punkte']]
            # zusätzlich auf dem Bogen gemessen (Seite und Front stehen dort in einer Reihe): Höhe = −y
            vs, vf = ans[sn]['abb'].vy, ans[fn]['abb'].vy
            zeile = {'zustand': zs, 'farbe': ls['farbe'], 'anzahl_seite': len(hs), 'anzahl_front': len(hf),
                     'boden_bogen_px': round(vs - vf, 1), 'punkte': []}
            for i in range(min(len(hs), len(hf))):
                d = hs[i] - hf[i]
                zeile['punkte'].append({'i': i, 'seite_px': round(hs[i], 1), 'front_px': round(hf[i], 1),
                                        'diff_px': round(d, 1), 'diff_kachel': round(d * K, 4),
                                        'diff_bogen_px': round((vf - hf[i]) - (vs - hs[i]), 1)})
            erg['maulhoehen'].append(zeile)
    return erg


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('wesen', nargs='*', default=list(WESEN))
    ap.add_argument('--arbeit', default=os.path.join(tempfile.gettempdir(), 'ee-nachziehen'))
    args = ap.parse_args()
    os.makedirs(args.arbeit, exist_ok=True)
    for name in args.wesen:
        ber = verarbeiten(name, args.arbeit)
        ausgeben(ber)


def ausgeben(ber):
    print(f"== {ber['wesen']} ({ber['quelle']}), K = {ber['kachel_pro_px']:.6f} Kachel/px, {ber['sekunden']} s")
    for an, e in ber['ansichten'].items():
        teile = [f"{an:13s}"]
        if 'knoten' in e:
            teile.append(f"{e['knoten']:2d} Knoten ({e['ecken']} Ecken), Fehler max {e['fehler_px']['max']:.2f} px, mittel {e['fehler_px']['mittel']:.2f}")
        if 'registrierung' in e:
            r = e['registrierung']
            teile.append(f"Reg. dx {r['dx']} dy {r['dy']} rms {r['rms_px']} Bodenversatz {r['boden_versatz_px']}")
        if 'achse' in e:
            teile.append(f"Achse {e['achse']}")
        if 'maul' in e:
            teile.append(f"Maul {e['maul']} Anfang {e['maul_anfang']}")
        if 'augen' in e:
            teile.append(f"Augen {e['augen']}")
        print('  ' + ' | '.join(teile))
    for v in ber['pruefung']['ausdehnung']:
        print(f"  {v['vergleich']:28s} {v['a_px']:8.2f} / {v['b_px']:8.2f} px  Δ {v['diff_px']:6.2f} px = {v['prozent']:5.2f} %  {'ok' if v['ok'] else 'ÜBER 2 %'}")
    for z in ber['pruefung']['maulhoehen']:
        ds = ', '.join(f"{p['diff_px']:+.1f}" for p in z['punkte'])
        db = ', '.join(f"{p['diff_bogen_px']:+.1f}" for p in z['punkte'])
        print(f"  Maulhöhe {z['zustand']:3s} {z['farbe']:7s} Seite {z['anzahl_seite']} / Front {z['anzahl_front']} Punkte, Seite − Front [px] je eigener Boden: {ds} | auf dem Bogen: {db}")


if __name__ == '__main__':
    main()
