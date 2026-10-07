"""Packt die Meshes aus dem Zwischenspeicher von formen.py in ein kompaktes Textformat für das Artefakt.

Pro Mesh: Positionen uint16 (über die Box dequantisiert), Normalen int8 x4, Farben uint8 x4 (AO, Dicke, Krümmung),
Indizes uint16. Alles hintereinander, gzip, base64 -> assets/grundblobs-mesh.txt; das Inhaltsverzeichnis kommt
als 'meshes' in assets/grundblobs.json.
Aufruf: python3 packen.py <cache-ordner> <assets-ordner>
"""
import sys, json, gzip, base64, os
import numpy as np

CACHE, ASSETS = sys.argv[1], sys.argv[2]
info = json.load(open(f"{ASSETS}/grundblobs.json"))
blob = bytearray()
toc = {}
for st in range(1, 14):
    for lod in ('lod0', 'lod1'):
        z = np.load(f"{CACHE}/s{st:02d}_{lod}.npz")
        v, f, n, c = z['v'], z['f'], z['n'], z['c']
        lo, hi = v.min(0), v.max(0)
        q = np.round((v - lo) / np.maximum(hi - lo, 1e-9) * 65535).astype(np.uint16)
        nn = np.zeros((len(n), 4), np.int8); nn[:, :3] = np.clip(np.round(n * 127), -127, 127)
        entry = dict(vertices=int(len(v)), dreiecke=int(len(f)), min=lo.round(6).tolist(), max=hi.round(6).tolist())
        for name, arr in (('pos', q), ('nor', nn), ('col', c.astype(np.uint8)), ('idx', f.astype(np.uint16))):
            while len(blob) % 4:
                blob.append(0)
            entry[name] = len(blob)
            blob += arr.tobytes()
        toc[f"{st}_{lod}"] = entry
gz = gzip.compress(bytes(blob), 9)
open(f"{ASSETS}/grundblobs-mesh.txt", 'w').write(base64.b64encode(gz).decode())
info['meshes'] = toc
json.dump(info, open(f"{ASSETS}/grundblobs.json", 'w'), indent=1)
print('roh', len(blob) / 1e6, 'MB, gzip', len(gz) / 1e6, 'MB, Text', os.path.getsize(f"{ASSETS}/grundblobs-mesh.txt") / 1e6, 'MB')
