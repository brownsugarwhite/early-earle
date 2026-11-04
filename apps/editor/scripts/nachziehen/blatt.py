"""Kontaktbogen je Wesen: Vorlage (blass) mit den nachgezogenen Kurven, Knoten, Achsen, Maulpunkten und
Augen; darunter Ausschnitte der Mäuler (3×) und der Vergleich der Ansichten in Kacheln (gleicher Maßstab).
"""

import math

import bild as bildmod
import fit

MAGENTA = (230, 0, 120)
MAGENTA_DUNKEL = (120, 0, 60)
BLAUGRUEN = (0, 140, 255)
GRUEN = (0, 160, 0)
ORANGE = (255, 130, 0)
GELB = (230, 190, 0)
GRAU = (90, 90, 90)
LINIENFARBE = {'rot': (235, 40, 95), 'blau': (25, 45, 255), 'tuerkis': (0, 185, 165), 'schwarz': (0, 0, 0)}

# 5×7-Schrift (nur Großbuchstaben, Ziffern und wenige Zeichen)
_SCHRIFT = {
    'A': '.###.#...##...#######...##...##...#', 'B': '####.#...##...#####.#...##...#####.',
    'C': '.###.#...##....#....#....#...#.###.', 'D': '####.#...##...##...##...##...#####.',
    'E': '######....#....####.#....#....#####', 'F': '######....#....####.#....#....#....',
    'G': '.###.#...##....#.####...##...#.####', 'H': '#...##...##...#######...##...##...#',
    'I': '.###...#....#....#....#....#...###.', 'J': '..###...#....#....#....##..#..##..',
    'K': '#...##..#.#.#..##...#.#..#..#.#...#', 'L': '#....#....#....#....#....#....#####',
    'M': '#...###.###.#.##.#.##...##...##...#', 'N': '#...##...###..##.#.##..###...##...#',
    'O': '.###.#...##...##...##...##...#.###.', 'P': '####.#...##...#####.#....#....#....',
    'Q': '.###.#...##...##...##.#.##..#..##.#', 'R': '####.#...##...#####.#.#..#..#.#...#',
    'S': '.#####....#.....###.....#....#####.', 'T': '#####..#....#....#....#....#....#..',
    'U': '#...##...##...##...##...##...#.###.', 'V': '#...##...##...##...##...#.#.#...#..',
    'W': '#...##...##...##.#.##.#.##.#..#.#.', 'X': '#...##...#.#.#...#...#.#.#...##...#',
    'Y': '#...##...#.#.#...#....#....#....#..', 'Z': '#####....#...#...#...#...#....#####',
    '0': '.###.#...##..###.#.###..##...#.###.', '1': '..#...##....#....#....#....#...###.',
    '2': '.###.#...#....#...#...#...#...#####', '3': '####.....#....#.###.....#....#####.',
    '4': '...#...##..#.#.#..#.#####...#....#.', '5': '######....####.....#....##...#.###.',
    '6': '..##..#...#....####.#...##...#.###.', '7': '#####....#...#...#...#....#....#...',
    '8': '.###.#...##...#.###.#...##...#.###.', '9': '.###.#...##...#.####....#...#..##..',
    '.': '.........................##...##..', ',': '....................##....#...#...',
    ':': '......##...##.........##...##......', '%': '##..###..#...#...#...#...#..###..##',
    '-': '...............#####...............', '+': '.......#....#..#####..#....#.......',
    '/': '....#....#...#...#...#...#....#....', '(': '...#...#...#....#....#.....#.....#.',
    ')': '.#.....#.....#....#....#....#...#..', '=': '..........#####.....#####..........',
    '>': '.#.....#.....#.....#...#...#...#...', ' ': '.' * 35, '?': '.###.#...#....#...#...#.......#..',
}


def text(L, x, y, s, farbe=(0, 0, 0), g=2):
    """Schreibt s (Großbuchstaben) ab (x, y) mit Pixelgröße g."""
    cx = x
    for ch in s.upper():
        ch = {'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'Δ': 'D'}.get(ch, ch)
        muster = _SCHRIFT.get(ch, _SCHRIFT['?'])
        muster = (muster + '.' * 35)[:35]
        for r in range(7):
            for c in range(5):
                if muster[r * 5 + c] == '#':
                    for dy in range(g):
                        for dx in range(g):
                            L.setze(cx + c * g + dx, y + r * g + dy, farbe)
        cx += 6 * g
    return cx


def _gestrichelt(L, pts, farbe, an=6, aus=4):
    lauf = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        d = math.hypot(b[0] - a[0], b[1] - a[1])
        if (lauf % (an + aus)) < an:
            L.linie(a, b, farbe)
        lauf += d


def _kurven(a):
    """Dichte Kurve (Bildpixel) der editierbaren Hälfte und ihr Spiegelbild (oder None)."""
    abb = a['abb']
    dicht = fit.kurve_abtasten(a['knoten'], a['geschlossen'], 40)
    haupt = [abb.bild(p) for p in dicht]
    spiegel = None
    if not a['geschlossen']:
        if abb.art == 'front':
            spiegel = [abb.bild((-p[0], p[1])) for p in dicht]
        else:
            spiegel = [abb.bild((p[0], -p[1])) for p in dicht]
    return haupt, spiegel


def _overlay(L, a, ox, oy, s, ref=None):
    """Zeichnet Kurven, Knoten, Achse, Boden, Maul und Augen einer Ansicht.
    (ox, oy) = Bildpunkt, der auf der Leinwand bei (0, 0) liegt; s = Vergrößerung."""
    def t(p):
        return ((p[0] - ox) * s, (p[1] - oy) * s)

    abb = a['abb']
    x0, y0, x1, y1 = a['bbox']
    # Boden und Achse
    if abb.art != 'top':
        _gestrichelt(L, [t((x0 - 15, abb.vy)), t((x1 + 15, abb.vy))], GRUEN)
    if abb.art == 'front':
        _gestrichelt(L, [t((abb.ux, y0 - 15)), t((abb.ux, y1 + 15))], GRUEN)
    if abb.art == 'top':
        _gestrichelt(L, [t((x0 - 15, abb.vy)), t((x1 + 15, abb.vy))], GRUEN)
    if ref is not None:
        # Referenzprofil (für Zahnansichten) über diese Ansicht gelegt
        dicht = fit.kurve_abtasten(ref['knoten'], ref['geschlossen'], 40)
        pts = [t(abb.bild(p)) for p in dicht]
        L.polylinie(pts, MAGENTA, 2)
        if not ref['geschlossen']:
            _gestrichelt(L, [t(abb.bild((-p[0], p[1]))) for p in dicht], MAGENTA)
        return
    if 'knoten' in a:
        haupt, spiegel = _kurven(a)
        L.polylinie([t(p) for p in haupt], MAGENTA, 2)
        if spiegel:
            _gestrichelt(L, [t(p) for p in spiegel], MAGENTA)
        for k in a['knoten']:
            L.quadrat(t(abb.bild(k['p'])), 2 if s < 2 else 3, MAGENTA_DUNKEL if k['art'] == 'ecke' else BLAUGRUEN)
    for e in a.get('augen', []):
        L.polylinie([t(p) for p in e['poly']], ORANGE, 1, True)
        if e.get('lid'):
            _gestrichelt(L, [t(p) for p in e['lid']], ORANGE, 3, 2)
        if e.get('glanz'):
            L.polylinie([t(p) for p in e['glanz']], GELB, 1, True)
    for li in a.get('linien', []):
        f = LINIENFARBE[li['farbe']]
        pts = [t(p) for p in li['punkte']]
        L.polylinie(pts, f, 1)
        for i, p in enumerate(pts[:-1]):
            L.punkt(p, 2.5 if s < 2 else 4, f, rand=(255, 255, 255))
            if i == 0:
                L.punkt(p, 1.2 if s < 2 else 2, (255, 255, 255))
        L.punkt(pts[-1], 2.5 if s < 2 else 4, (0, 0, 0), rand=(255, 255, 255))


def zeichnen(pfad, b, cfg, ans, K, daten, linienbilder, pruefung=None):
    boxen = [a['cfg']['box'] for a in ans.values()]
    rx0 = max(0, min(bx[0] for bx in boxen) - 10)
    ry0 = max(0, min(bx[1] for bx in boxen) - 10)
    rx1 = min(b.W, max(bx[2] for bx in boxen) + 10)
    ry1 = min(b.H, max(bx[3] for bx in boxen) + 10)
    breite = rx1 - rx0
    # Maulausschnitte
    ausschnitte = []
    for an, a in ans.items():
        pts = [p for li in a.get('linien', []) for p in li['punkte']] + [p for e in a.get('augen', []) for p in e['poly']]
        if not pts:
            continue
        x0 = min(p[0] for p in pts) - 22
        y0 = min(p[1] for p in pts) - 22
        x1 = max(p[0] for p in pts) + 22
        y1 = max(p[1] for p in pts) + 22
        ausschnitte.append((an, a, int(x0), int(y0), int(x1), int(y1)))
    zeile_h = 0
    plaetze = []
    cx, cy = 10, 0
    for an, a, x0, y0, x1, y1 in ausschnitte:
        s_aus = 3 if max(x1 - x0, y1 - y0) * 3 <= 1000 else (2 if max(x1 - x0, y1 - y0) * 2 <= 1000 else 1)
        w, h = (x1 - x0) * s_aus, (y1 - y0) * s_aus
        if cx + w > breite - 10 and cx > 10:
            cx = 10
            cy += zeile_h + 40
            zeile_h = 0
        plaetze.append((an, a, x0, y0, x1, y1, cx, cy, s_aus))
        cx += w + 20
        zeile_h = max(zeile_h, h)
    hoehe_aus = cy + zeile_h + 40 if plaetze else 0
    # Weltvergleich
    S = 500.0    # Leinwandpixel je Kachel
    breiten_w, hs_w, ht_w = _welt_masse(daten, S)
    breite = max(breite, sum(breiten_w) + 40)
    zeilen = _pruef_zeilen(pruefung) if pruefung else []
    hoehe_welt = 40 + hs_w + 10 + 40 + ht_w + 30 + 20 * len(zeilen) + 20
    kopf = 40
    H = kopf + (ry1 - ry0) + 30 + hoehe_aus + hoehe_welt
    L = bildmod.Leinwand(breite, H)
    text(L, 10, 10, f"{cfg['titel']}  -  NACHGEZOGEN, K = {K:.6f} KACHEL/PX  (MAGENTA = PROFIL, QUADRATE = KNOTEN, ORANGE = AUGE, GRUEN = BODEN/ACHSE)", (0, 0, 0), 2)
    # 1. Vorlage mit Overlays
    L.bild_einfuegen(b, rx0, ry0, rx1, ry1, 0, kopf, 1, blass=0.55)

    for an, a in ans.items():
        ref = None
        if a['cfg'].get('nur_bild'):
            ref = ans[a['cfg']['nur_bild']]
        _overlay(L, a, rx0, ry0 - kopf, 1, ref)
        bx0, by0 = a['cfg']['box'][0], a['cfg']['box'][1]
        text(L, bx0 - rx0 + 4, by0 - ry0 + kopf + 2, an.replace('_', ' '), GRAU, 2)
    # 2. Maulausschnitte
    oy = kopf + (ry1 - ry0) + 30
    text(L, 10, oy - 4, 'MAUL UND AUGEN VERGROESSERT (WEISSER KERN = ANFANG, SCHWARZ = MUNDWINKEL, GESTRICHELT = LID)', (0, 0, 0), 2)
    for an, a, x0, y0, x1, y1, px, py, s_aus in plaetze:
        tmp = bildmod.Leinwand((x1 - x0) * s_aus, (y1 - y0) * s_aus)
        tmp.bild_einfuegen(b, x0, y0, x1, y1, 0, 0, s_aus, blass=0.45)
        _overlay(tmp, a, x0, y0, s_aus)
        for yy in range(tmp.h):
            zi = ((oy + 20 + py + yy) * L.w + px) * 3
            L.px[zi:zi + tmp.w * 3] = tmp.px[yy * tmp.w * 3:(yy + 1) * tmp.w * 3]
        text(L, px, oy + 20 + py + tmp.h + 4, f"{an.replace('_', ' ')} {s_aus}X", GRAU, 2)
    # 3. Weltvergleich
    welt_y = oy + hoehe_aus
    _weltvergleich(L, welt_y, daten, linienbilder, S)
    ty = welt_y + 40 + hs_w + 10 + 40 + ht_w + 30
    for z, ok in zeilen:
        text(L, 10, ty, z, (0, 0, 0) if ok else (200, 0, 0), 2)
        ty += 20
    L.speichern(pfad)


def _pruef_zeilen(pr):
    out = [('PRUEFUNG GEMEINSAME AUSDEHNUNGEN (GRENZE 2 %), PX DER VORLAGE:', True)]
    for v in pr['ausdehnung']:
        t = v['vergleich'].upper().replace('Ö', 'OE').replace('Ä', 'AE').replace('Ü', 'UE')
        out.append((f"  {t}: {v['a_px']:.1f} / {v['b_px']:.1f}  D {v['diff_px']:+.1f} PX = {v['prozent']:+.2f} %", v['ok']))
    out.append(('MAULPUNKTE, HOEHE SEITE - FRONT JE INDEX (PX), JE EIGENER BODEN / AUF DEM BOGEN:', True))
    for z in pr['maulhoehen']:
        ds = '  '.join(f"{p['diff_px']:+.1f}" for p in z['punkte'])
        db = '  '.join(f"{p['diff_bogen_px']:+.1f}" for p in z['punkte'])
        out.append((f"  {z['zustand'].upper()} {z['farbe'].upper()} ({z['anzahl_seite']}/{z['anzahl_front']}): {ds}   /   {db}", True))
    return out


def _welt_kurve(pr, n=40):
    kn = [{'p': (k['p']['x'], k['p']['y']), 'ein': (k['ein']['x'], k['ein']['y']), 'aus': (k['aus']['x'], k['aus']['y']), 'art': k['art']}
          for k in pr['knoten']]
    geschlossen = pr['art'] == 'geschlossen'
    d = fit.kurve_abtasten(kn, geschlossen, n)
    if geschlossen:
        return d, None
    if pr['achse'] == 'senkrecht':
        return d, [(-p[0], p[1]) for p in d]
    return d, [(p[0], -p[1]) for p in d]


def _bild_in_welt(L, bild, rahmen, t, farbe=(25, 35, 43)):
    """Linienbild (w, h, RGBA) mit Weltrechteck {x0, y0 (oben), x1, y1 (unten)} über die Abbildung t zeichnen;
    je Leinwandpixel zählt das deckendste Quellpixel (dünne Linien bleiben sichtbar)."""
    w, h, px = bild
    ax, ay = t((rahmen['x0'], rahmen['y0']))
    bx, by = t((rahmen['x1'], rahmen['y1']))
    for cy in range(int(ay), int(by) + 1):
        for cx in range(int(ax), int(bx) + 1):
            u0 = (cx - ax) / (bx - ax) * w
            u1 = (cx + 1 - ax) / (bx - ax) * w
            v0 = (cy - ay) / (by - ay) * h
            v1 = (cy + 1 - ay) / (by - ay) * h
            m = 0
            for v in range(max(0, int(v0)), min(h, int(math.ceil(v1)))):
                for u in range(max(0, int(u0)), min(w, int(math.ceil(u1)))):
                    al = px[(v * w + u) * 4 + 3]
                    if al > m:
                        m = al
            if m:
                L.setze(cx, cy, farbe, m / 255)


def _ansicht_welt(L, daten, linienbilder, prof, bild_an, maul_an, t, mit_maul=True):
    if bild_an in daten['bilder'] and bild_an in linienbilder:
        _bild_in_welt(L, linienbilder[bild_an], daten['bilder'][bild_an], t)
    d, ds = _welt_kurve(daten['profile'][prof])
    L.polylinie([t(p) for p in d], MAGENTA, 2, ds is None)
    if ds:
        _gestrichelt(L, [t(p) for p in ds], MAGENTA)
    if not mit_maul:
        return
    for li in daten['linien'].get(maul_an, []):
        pts = [t((q['x'], q['y'])) for q in li['punkte']]
        L.polylinie(pts, LINIENFARBE[li['farbe']], 1)
        for p in pts[:-1]:
            L.punkt(p, 2.5, LINIENFARBE[li['farbe']], rand=(255, 255, 255))
        L.punkt(pts[-1], 2.5, (0, 0, 0), rand=(255, 255, 255))
    for e in daten['augen'].get(maul_an, []):
        L.polylinie([t((q['x'], q['y'])) for q in e['punkte']], ORANGE, 1, True)
        if e.get('lid'):
            _gestrichelt(L, [t((q['x'], q['y'])) for q in e['lid']], ORANGE, 3, 2)
        if e.get('glanz'):
            L.polylinie([t((q['x'], q['y'])) for q in e['glanz']], GELB, 1, True)


def _gruppen(daten):
    pr = daten['profile']
    g = [('ZU', 'seite', 'front', 'seite', 'front')]
    if 'seite_auf' in pr:
        g.append(('AUF', 'seite_auf', 'front_auf', 'seite_auf', 'front_auf'))
    if 'seite_zaehne' in daten['bilder']:
        g.append(('ZAEHNE (BILD) AUF PROFIL ZU', 'seite', 'front', 'seite_zaehne', 'front_zaehne'))
    return g


def _welt_masse(daten, S):
    pr = daten['profile']
    breiten = []
    for _, sn, fn, _, _ in _gruppen(daten):
        ds, _ = _welt_kurve(pr[sn])
        df, _ = _welt_kurve(pr[fn])
        bs = (max(p[0] for p in ds) - min(p[0] for p in ds)) * S
        bf = 2 * max(p[0] for p in df) * S
        breiten.append(int(bs + bf + 140))
    hs = max(max(p[1] for p in _welt_kurve(pr[sn])[0]) for _, sn, _, _, _ in _gruppen(daten)) * S
    ht = 2 * max(p[1] for p in _welt_kurve(pr['top'])[0]) * S
    return breiten, int(hs), int(ht)


def _weltvergleich(L, y0, daten, linienbilder, S):
    """Aus der JSON-Datei gezeichnet (wie der Editor sie sieht): Seite und Front auf gemeinsamem Boden, Top
    unter der Seite mit gemeinsamer x-Mitte, dazu Linienbilder, Maullinien und Augen."""
    text(L, 10, y0, 'AUS DER JSON (KACHELN, GLEICHER MASSSTAB): SEITE + FRONT AUF EINEM BODEN, TOP UNTER DER SEITE, GRUENE HILFSLINIEN = AUSDEHNUNG DER SEITE', (0, 0, 0), 2)
    breiten, hs, ht = _welt_masse(daten, S)
    pr = daten['profile']
    boden = y0 + 40 + hs + 10
    links = 20
    for (titel, sn, fn, bs_an, bf_an), breite in zip(_gruppen(daten), breiten):
        ds, _ = _welt_kurve(pr[sn])
        smin = min(p[0] for p in ds)
        smax = max(p[0] for p in ds)
        stop = max(p[1] for p in ds)
        df, _ = _welt_kurve(pr[fn])
        fbreite = max(p[0] for p in df)
        mitte_s = links + 20 - smin * S
        mitte_f = mitte_s + smax * S + 60 + fbreite * S
        tmitte = boden + 40 + ht / 2

        def ps(p, m=mitte_s):
            return (m + p[0] * S, boden - p[1] * S)

        def pf(p):
            return (mitte_f + p[0] * S, boden - p[1] * S)

        def pt(p):
            return (mitte_s + p[0] * S, tmitte - p[1] * S)

        _gestrichelt(L, [ps((smin - 0.03, stop)), pf((fbreite + 0.03, stop))], GRUEN)
        _gestrichelt(L, [ps((smin - 0.03, 0)), pf((fbreite + 0.03, 0))], GRUEN)
        for xv in (smin, smax):
            _gestrichelt(L, [ps((xv, stop + 0.02)), (mitte_s + xv * S, tmitte + ht / 2 + 10)], GRUEN)
        zaehne = bs_an != sn
        _ansicht_welt(L, daten, linienbilder, sn, bs_an, sn, ps, not zaehne)
        _ansicht_welt(L, daten, linienbilder, fn, bf_an, fn, pf, not zaehne)
        if not zaehne:
            _ansicht_welt(L, daten, linienbilder, 'top', 'top', 'top', pt)
        text(L, int(links + 20), y0 + 22, titel, GRAU, 2)
        links += breite
