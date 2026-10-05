"""Vermisst die 39 Grundblobs der Vorlage: Masken, Größen, Augen, Farben.
Aufruf: python3 vermessen.py <vorlage.png> <ausgabe-ordner>
"""
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
img = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255.0
H, W, _ = img.shape
mx, mn = img.max(2), img.min(2)
sat = (mx - mn) / np.maximum(mx, 1e-4)
# Vordergrund: nicht fast-weiß
fg = (mn < 0.93) | (sat > 0.10)
fg = ndi.binary_opening(fg, iterations=1)
lab, n = ndi.label(fg)
sizes = ndi.sum(fg, lab, range(1, n + 1))
objs = ndi.find_objects(lab)
blobs = []
for i, sl in enumerate(objs):
    if sizes[i] < 1500:
        continue
    ys, xs = sl
    blobs.append(dict(id=i + 1, y0=ys.start, y1=ys.stop, x0=xs.start, x1=xs.stop, area=int(sizes[i])))
print('Komponenten', len(blobs))
# Reihen nach Unterkante clustern
blobs.sort(key=lambda b: b['y1'])
rows = []
for b in blobs:
    if rows and abs(rows[-1][-1]['y1'] - b['y1']) < 120:
        rows[-1].append(b)
    else:
        rows.append([b])
names = ['jelly', 'fest', 'fell']
res = {'bild': [W, H], 'reihen': {}}
for r, row in enumerate(rows):
    row.sort(key=lambda b: b['x0'])
    print(names[r], len(row), 'Blobs, Unterkante', [b['y1'] for b in row][:3])
    lst = []
    for k, b in enumerate(row):
        m = (lab[b['y0']:b['y1'], b['x0']:b['x1']] == b['id'])
        m = ndi.binary_fill_holes(m)
        crop = img[b['y0']:b['y1'], b['x0']:b['x1']]
        Image.fromarray((m * 255).astype(np.uint8)).save(f"{out}/maske-{names[r]}-{k+1:02d}.png")
        # Augen: sehr dunkle Komponenten innerhalb der Maske, weg vom Rand
        er = ndi.binary_erosion(m, iterations=3)
        dark = (crop.max(2) < 0.22) & er
        el, en = ndi.label(dark)
        eyes = []
        for j, esl in enumerate(ndi.find_objects(el)):
            a = int((el[esl] == j + 1).sum())
            if a < 15:
                continue
            ey, ex = esl
            eyes.append(dict(cx=(ex.start + ex.stop) / 2 / m.shape[1], cy=(ey.start + ey.stop) / 2 / m.shape[0],
                             w=(ex.stop - ex.start) / m.shape[1], h=(ey.stop - ey.start) / m.shape[0], area=a))
        # Farben: Körperpixel ohne Augen und ohne helle Glanzpunkte
        body = m & ~ndi.binary_dilation(dark, iterations=3)
        px = crop[body]
        lum = px @ np.array([0.299, 0.587, 0.114])
        q = np.quantile(lum, [0.1, 0.5, 0.9])
        def avg(lo, hi):
            s = (lum >= lo) & (lum <= hi)
            return [round(float(v), 4) for v in px[s].mean(0)]
        # vertikaler Verlauf: oberes und unteres Drittel
        yy = np.nonzero(body)[0]
        top = crop[body & (np.arange(m.shape[0])[:, None] < m.shape[0] * 0.33)]
        bot = crop[body & (np.arange(m.shape[0])[:, None] > m.shape[0] * 0.67)]
        lst.append(dict(stufe=k + 1, wert=2 ** (k + 1), x0=b['x0'], y0=b['y0'], x1=b['x1'], y1=b['y1'],
                        breite=b['x1'] - b['x0'], hoehe=b['y1'] - b['y0'], augen=sorted(eyes, key=lambda e: e['cx']),
                        farbe_mitte=[round(float(v), 4) for v in np.median(px, 0)],
                        farbe_schatten=avg(q[0] - 1, q[0]), farbe_licht=avg(q[2], 2),
                        farbe_oben=[round(float(v), 4) for v in np.median(top, 0)] if len(top) else None,
                        farbe_unten=[round(float(v), 4) for v in np.median(bot, 0)] if len(bot) else None))
    res['reihen'][names[r]] = lst
json.dump(res, open(f"{out}/vermessung.json", 'w'), indent=1)
for nm in names:
    print(nm, [(b['breite'], b['hoehe'], len(b['augen'])) for b in res['reihen'][nm]])
