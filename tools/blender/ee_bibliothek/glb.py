"""
GLB-Leser für den Export aus tools/export3d (glTF 2.0 binär, ohne Sparse/Interleaving) — schnell über numpy,
unabhängig vom glTF-Importer von Blender, damit Namen, Knochen und Instanzen exakt so ankommen wie exportiert.

Koordinaten: Die GLBs liegen im Spielraum (+Y oben, +Z vorn, glTF-Konvention). `g2b` / `mat_g2b` wandeln
nach Blender (+Z oben, Front schaut nach −Y): (x, y, z)_Spiel → (x, −z, y)_Blender.
"""
import json
import struct

import numpy as np
from mathutils import Matrix, Vector

_DTYPES = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8, 5122: np.int16, 5120: np.int8}
_COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

# Spiel (Y oben) → Blender (Z oben)
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
C_INV = C.inverted()


def g2b(v):
    """Punkt/Richtung Spielraum → Blender."""
    return Vector((v[0], -v[2], v[1]))


def g2b_array(a):
    """(n, 3)-Array Spielraum → Blender."""
    a = np.asarray(a, dtype=np.float32).reshape(-1, 3)
    return np.stack([a[:, 0], -a[:, 2], a[:, 1]], axis=1)


def mat_from_colmajor(m):
    """16 Zahlen spaltenweise (three.js/glTF) → mathutils.Matrix."""
    return Matrix([[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]], [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]])


def mat_g2b(m):
    """Transformationsmatrix im Spielraum (spaltenweise Liste oder Matrix) → Blender-Raum."""
    if not isinstance(m, Matrix):
        m = mat_from_colmajor(m)
    return C @ m @ C_INV


class Glb:
    def __init__(self, path):
        with open(path, "rb") as f:
            data = f.read()
        magic, version, length = struct.unpack_from("<III", data, 0)
        if magic != 0x46546C67:
            raise ValueError(f"{path}: kein GLB")
        off = 12
        self.json = {}
        self.bin = b""
        while off < length:
            clen, ctype = struct.unpack_from("<II", data, off)
            chunk = data[off + 8 : off + 8 + clen]
            if ctype == 0x4E4F534A:
                self.json = json.loads(chunk.decode("utf-8"))
            elif ctype == 0x004E4942:
                self.bin = chunk
            off += 8 + clen
        self.path = path
        self._cache = {}

    @property
    def nodes(self):
        return self.json.get("nodes", [])

    @property
    def meshes(self):
        return self.json.get("meshes", [])

    @property
    def materials(self):
        return self.json.get("materials", [])

    def root_nodes(self):
        scene = self.json.get("scenes", [{}])[self.json.get("scene", 0)]
        return [self.nodes[i] for i in scene.get("nodes", [])]

    def accessor(self, index):
        """Accessor → numpy-Array der Form (count, Komponenten) bzw. (count,) für SCALAR."""
        if index in self._cache:
            return self._cache[index]
        acc = self.json["accessors"][index]
        view = self.json["bufferViews"][acc["bufferView"]]
        dtype = _DTYPES[acc["componentType"]]
        comps = _COMPONENTS[acc["type"]]
        count = acc["count"]
        start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
        arr = np.frombuffer(self.bin, dtype=dtype, count=count * comps, offset=start)
        arr = arr.reshape(count, comps) if comps > 1 else arr
        if acc.get("normalized") and dtype != np.float32:
            arr = arr.astype(np.float32) / float(np.iinfo(dtype).max)
        self._cache[index] = arr
        return arr

    def node_matrix(self, node):
        m = node.get("matrix")
        if m:
            return mat_from_colmajor(m)
        return Matrix.Identity(4)

    def walk(self, node_index, parent=None, depth=0):
        """Alle Knoten unterhalb eines Knotens (Tiefensuche) als (index, knoten, eltern-index)."""
        node = self.nodes[node_index]
        yield node_index, node, parent
        for c in node.get("children", []):
            yield from self.walk(c, node_index, depth + 1)

    def world_matrices(self):
        """Weltmatrix (Spielraum) je Knotenindex."""
        out = {}
        scene = self.json.get("scenes", [{}])[self.json.get("scene", 0)]

        def rec(i, parent_m):
            m = parent_m @ self.node_matrix(self.nodes[i])
            out[i] = m
            for c in self.nodes[i].get("children", []):
                rec(c, m)

        for r in scene.get("nodes", []):
            rec(r, Matrix.Identity(4))
        return out

    def mesh_primitives(self, mesh_index):
        """Primitive eines Meshes: dict mit positions (n,3), normals, indices, material, attributes (Name → Array)."""
        mesh = self.meshes[mesh_index]
        out = []
        for p in mesh["primitives"]:
            attrs = {k: self.accessor(v) for k, v in p["attributes"].items()}
            prim = {
                "positions": attrs.get("POSITION"),
                "normals": attrs.get("NORMAL"),
                "indices": self.accessor(p["indices"]) if "indices" in p else None,
                "material": self.materials[p["material"]] if "material" in p else None,
                "mode": p.get("mode", 4),
                "attributes": attrs,
                "extras": p.get("extras", {}),
            }
            out.append(prim)
        return out
