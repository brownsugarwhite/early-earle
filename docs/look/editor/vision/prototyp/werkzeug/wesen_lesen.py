# Liest Florians .eewesen-Dateien (Format EEKW1, apps/editor/src/form/ablage.ts) und schreibt eine knappe Fassung für den
# Prototyp: Netz (Lagen, Dreiecke, Spiegel) und Loops (Art, Punkte mit Lage, Griffen, Kante, Ecke, Kreuzung).
# Aufruf: python3 wesen_lesen.py <datei.eewesen> <ausgabe.txt>   (Ausgabe: gzip + base64 eines JSON)
import json, struct, sys, base64, gzip
import numpy as np

ARTEN = {'f64': np.float64, 'f32': np.float32, 'u32': np.uint32, 'i32': np.int32, 'u16': np.uint16, 'i16': np.int16, 'u8': np.uint8}
auf8 = lambda n: (n + 7) & ~7

def lesen(pfad):
    b = open(pfad, 'rb').read()
    assert b[:6] == b'EEKW1\n'
    kl = struct.unpack('<I', b[6:10])[0]
    kopf = json.loads(b[10:10 + kl].decode('utf8'))
    anfang = auf8(10 + kl)
    felder = []
    for e in kopf['felder']:
        t = ARTEN[e['art']]
        von = anfang + e['ab']
        felder.append(np.frombuffer(b[von:von + e['laenge'] * np.dtype(t).itemsize], dtype=t))
    def wandeln(x):
        if isinstance(x, list): return [wandeln(v) for v in x]
        if isinstance(x, dict):
            if '$feld' in x: return felder[x['$feld']]
            if '$zahl' in x: return float(x['$zahl'])
            return {k: wandeln(v) for k, v in x.items()}
        return x
    return wandeln(kopf['stand'])

st = lesen(sys.argv[1])
h = st['haut']
pos = np.asarray(h['pos'], dtype=np.float64).reshape(-1, 3)
tri = np.asarray(h['tri'], dtype=np.uint32)
sp = np.asarray(h['spiegel'], dtype=np.int32)
mitte = (pos.max(0) + pos.min(0)) / 2
mitte[2] = 0
ausd = (pos.max(0) - pos.min(0)).max() / 2
k = 1.25 / ausd
def norm(p): return [round(float((p[0] - mitte[0]) * k), 5), round(float((p[1] - mitte[1]) * k), 5), round(float(p[2] * k), 5)]
def vek(v): return [round(float(v['x'] * k), 5), round(float(v['y'] * k), 5), round(float(v['z'] * k), 5)] if v else [0, 0, 0]
loops = []
for L in st['loops']:
    pts = []
    for P in L['punkte']:
        c = P['cur']
        pts.append({'p': norm([c['x'], c['y'], c['z']]), 'ein': vek(P.get('ein')), 'aus': vek(P.get('aus')), 'kante': bool(P.get('kante', L.get('kante', False))),
                    'ecke': bool(P.get('ecke', P.get('autoEcke', False))), 'kreuz': int(P.get('kreuzung', 0) or 0), 'vonSelbst': bool(P.get('vonSelbst', False))})
    loops.append({'art': L['art'], 'punkte': pts})
p2 = (pos - mitte) * k
aus = {'pos': [round(float(x), 5) for x in p2.reshape(-1)], 'tri': tri.tolist(), 'spiegel': sp.tolist(), 'loops': loops, 'massstab': k}
roh = json.dumps(aus, separators=(',', ':')).encode()
open(sys.argv[2], 'w').write(base64.b64encode(gzip.compress(roh, 9)).decode())
print(sys.argv[1], 'Punkte', len(pos), 'Dreiecke', len(tri) // 3, 'Loops', len(loops), [(l['art'], len(l['punkte'])) for l in loops], 'Größe', len(roh) // 1024, 'KB roh')
