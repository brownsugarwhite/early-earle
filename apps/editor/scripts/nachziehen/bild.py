"""Bilder lesen und schreiben, nur mit der Standardbibliothek.

Lesen: Die Vorlage (PNG) wird einmal mit `sips` (macOS) in eine BMP-Datei im Arbeitsordner gewandelt
und dann direkt gelesen (24 oder 32 bit, oben-unten oder unten-oben, Alpha auf Weiß verrechnet).
Schreiben: RGBA- oder RGB-PNG mit zlib.
"""

import os
import struct
import subprocess
import zlib


class Bild:
    """Pixel als flache Byte-Folgen r, g, b und Helligkeit lum (0…255), Index y * W + x."""

    def __init__(self, w, h, r, g, b):
        self.W = w
        self.H = h
        self.r = r
        self.g = g
        self.b = b
        self.lum = bytes((299 * rr + 587 * gg + 114 * bb) // 1000 for rr, gg, bb in zip(r, g, b))

    def rgb(self, x, y):
        i = y * self.W + x
        return self.r[i], self.g[i], self.b[i]


def laden(png_pfad, arbeitsordner):
    """Liest die Vorlage; die BMP-Zwischendatei landet im Arbeitsordner."""
    os.makedirs(arbeitsordner, exist_ok=True)
    name = os.path.splitext(os.path.basename(png_pfad))[0]
    bmp = os.path.join(arbeitsordner, name + '.bmp')
    if not os.path.exists(bmp) or os.path.getmtime(bmp) < os.path.getmtime(png_pfad):
        subprocess.run(['sips', '-s', 'format', 'bmp', png_pfad, '--out', bmp], check=True, capture_output=True)
    return bmp_lesen(bmp)


def bmp_lesen(pfad):
    d = open(pfad, 'rb').read()
    off = struct.unpack_from('<I', d, 10)[0]
    kopf = struct.unpack_from('<I', d, 14)[0]
    w, h = struct.unpack_from('<ii', d, 18)
    bpp = struct.unpack_from('<H', d, 28)[0]
    komp = struct.unpack_from('<I', d, 30)[0]
    oben_unten = h < 0
    h = abs(h)
    if bpp == 32:
        masken = struct.unpack_from('<IIII', d, 54) if (komp == 3 and kopf >= 56) else (0xFF0000, 0xFF00, 0xFF, 0xFF000000)
        lage = {m: i for i, m in enumerate([0xFF, 0xFF00, 0xFF0000, 0xFF000000])}
        ir, ig, ib = lage[masken[0]], lage[masken[1]], lage[masken[2]]
        ia = lage.get(masken[3]) if masken[3] else None
        zeile = w * 4
        roh = bytearray()
        for y in range(h):
            yy = y if oben_unten else h - 1 - y
            roh += d[off + yy * zeile: off + (yy + 1) * zeile]
        r, g, b = roh[ir::4], roh[ig::4], roh[ib::4]
        if ia is not None:
            a = roh[ia::4]
            if min(a) < 255:
                def weiss(c):
                    return bytes((cc * aa + 255 * (255 - aa)) // 255 for cc, aa in zip(c, a))
                r, g, b = weiss(r), weiss(g), weiss(b)
        return Bild(w, h, bytes(r), bytes(g), bytes(b))
    if bpp == 24:
        zeile = ((w * 3 + 3) // 4) * 4
        roh = bytearray()
        for y in range(h):
            yy = y if oben_unten else h - 1 - y
            roh += d[off + yy * zeile: off + yy * zeile + w * 3]
        return Bild(w, h, bytes(roh[2::3]), bytes(roh[1::3]), bytes(roh[0::3]))
    raise ValueError(f'BMP mit {bpp} bit wird nicht unterstützt')


def png_bytes(w, h, pixel, kanaele=4):
    """PNG aus flachen Pixelbytes (RGBA bei kanaele=4, RGB bei 3)."""
    zeile = w * kanaele
    roh = b''.join(b'\x00' + bytes(pixel[y * zeile:(y + 1) * zeile]) for y in range(h))

    def chunk(t, data):
        return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data) & 0xFFFFFFFF)

    farbtyp = 6 if kanaele == 4 else 2
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, farbtyp, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(roh, 9)) + chunk(b'IEND', b''))


def png_schreiben(pfad, w, h, pixel, kanaele=4):
    with open(pfad, 'wb') as f:
        f.write(png_bytes(w, h, pixel, kanaele))


class Leinwand:
    """RGB-Zeichenfläche für Kontaktbögen: Bildausschnitte, Linien, Punkte, Rahmen (ohne Kantenglättung)."""

    def __init__(self, w, h, farbe=(255, 255, 255)):
        self.w = w
        self.h = h
        self.px = bytearray(bytes(farbe) * (w * h))

    def setze(self, x, y, farbe, deckung=1.0):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 3
            if deckung >= 1.0:
                self.px[i:i + 3] = bytes(farbe)
            else:
                for k in range(3):
                    self.px[i + k] = int(self.px[i + k] * (1 - deckung) + farbe[k] * deckung)

    def bild_einfuegen(self, bild, x0, y0, x1, y1, ziel_x, ziel_y, skala=1, blass=0.0):
        """Ausschnitt der Vorlage einsetzen; `skala` ganzzahlig, `blass` mischt mit Weiß (0…1)."""
        for y in range(y0, y1):
            for x in range(x0, x1):
                if 0 <= x < bild.W and 0 <= y < bild.H:
                    i = y * bild.W + x
                    c = (bild.r[i], bild.g[i], bild.b[i])
                else:
                    c = (255, 255, 255)
                if blass:
                    c = tuple(int(cc + (255 - cc) * blass) for cc in c)
                for dy in range(skala):
                    for dx in range(skala):
                        self.setze(ziel_x + (x - x0) * skala + dx, ziel_y + (y - y0) * skala + dy, c)

    def linie(self, a, b, farbe, breite=1, deckung=1.0):
        (xa, ya), (xb, yb) = a, b
        n = int(max(abs(xb - xa), abs(yb - ya)) * 2) + 1
        r = breite / 2
        for i in range(n + 1):
            t = i / n
            x = xa + (xb - xa) * t
            y = ya + (yb - ya) * t
            if breite <= 1:
                self.setze(int(round(x)), int(round(y)), farbe, deckung)
            else:
                for yy in range(int(y - r), int(y + r) + 1):
                    for xx in range(int(x - r), int(x + r) + 1):
                        if (xx - x) ** 2 + (yy - y) ** 2 <= r * r:
                            self.setze(xx, yy, farbe, deckung)

    def polylinie(self, punkte, farbe, breite=1, zu=False, deckung=1.0):
        for i in range(len(punkte) - 1):
            self.linie(punkte[i], punkte[i + 1], farbe, breite, deckung)
        if zu and len(punkte) > 2:
            self.linie(punkte[-1], punkte[0], farbe, breite, deckung)

    def punkt(self, p, radius, farbe, rand=None):
        x, y = p
        for yy in range(int(y - radius - 1), int(y + radius + 2)):
            for xx in range(int(x - radius - 1), int(x + radius + 2)):
                d2 = (xx - x) ** 2 + (yy - y) ** 2
                if d2 <= radius * radius:
                    self.setze(xx, yy, farbe)
                elif rand and d2 <= (radius + 1.5) ** 2:
                    self.setze(xx, yy, rand)

    def quadrat(self, p, halb, farbe):
        x, y = int(round(p[0])), int(round(p[1]))
        for yy in range(y - halb, y + halb + 1):
            for xx in range(x - halb, x + halb + 1):
                self.setze(xx, yy, farbe)

    def rahmen(self, x0, y0, x1, y1, farbe):
        self.linie((x0, y0), (x1, y0), farbe)
        self.linie((x1, y0), (x1, y1), farbe)
        self.linie((x1, y1), (x0, y1), farbe)
        self.linie((x0, y1), (x0, y0), farbe)

    def speichern(self, pfad):
        png_schreiben(pfad, self.w, self.h, self.px, 3)
