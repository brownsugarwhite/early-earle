// Das Netz der Haut: Ruhelage (die Form, aus der verformt wird), aktuelle Lage, Dreiecke, Nachbarn, Spiegelpartner.
// Die Kugel ist ein unterteiltes Ikosaeder; es ist von Haus aus spiegelgleich zur Ebene z = 0.

export class Netz {
  constructor(ruhe, tri) {
    this.nV = ruhe.length / 3;
    this.nT = tri.length / 3;
    this.ruhe = ruhe; // Float32Array 3nV
    this.pos = new Float32Array(ruhe); // aktuelle Lage
    this.nrm = new Float32Array(ruhe.length);
    this.tri = tri; // Uint32Array 3nT
    this.spiegel = spiegelPartner(ruhe);
    this.normalen();
  }

  normalen() {
    const { pos, tri, nrm } = this;
    nrm.fill(0);
    for (let t = 0; t < tri.length; t += 3) {
      const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
      const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      nrm[a] += nx; nrm[a + 1] += ny; nrm[a + 2] += nz;
      nrm[b] += nx; nrm[b + 1] += ny; nrm[b + 2] += nz;
      nrm[c] += nx; nrm[c + 1] += ny; nrm[c + 2] += nz;
    }
    for (let i = 0; i < nrm.length; i += 3) {
      const l = Math.hypot(nrm[i], nrm[i + 1], nrm[i + 2]) || 1;
      nrm[i] /= l; nrm[i + 1] /= l; nrm[i + 2] /= l;
    }
  }

  // Lage eines Punkts auf einem Dreieck (baryzentrisch), aus Ruhe oder aktueller Lage
  punkt(t, b, ausRuhe = false) {
    const P = ausRuhe ? this.ruhe : this.pos;
    const a = this.tri[3 * t] * 3, c = this.tri[3 * t + 1] * 3, d = this.tri[3 * t + 2] * 3;
    return [
      b[0] * P[a] + b[1] * P[c] + b[2] * P[d],
      b[0] * P[a + 1] + b[1] * P[c + 1] + b[2] * P[d + 1],
      b[0] * P[a + 2] + b[1] * P[c + 2] + b[2] * P[d + 2],
    ];
  }

  // Strahl gegen das Netz (aktuelle Lage), nächster Treffer. Liefert { t, b, abst, p } oder null.
  strahl(o, d) {
    const { pos, tri } = this;
    let best = null;
    for (let t = 0; t < tri.length; t += 3) {
      const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
      const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
      const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
      const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz;
      if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det;
      const sx = o[0] - pos[a], sy = o[1] - pos[a + 1], sz = o[2] - pos[a + 2];
      const u = (sx * px + sy * py + sz * pz) * inv;
      if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
      if (v < 0 || u + v > 1) continue;
      const s = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (s <= 1e-6) continue;
      if (!best || s < best.abst) best = { t: t / 3, b: [1 - u - v, u, v], abst: s };
    }
    if (best) best.p = [o[0] + d[0] * best.abst, o[1] + d[1] * best.abst, o[2] + d[2] * best.abst];
    return best;
  }

  // nächster Punkt der Fläche (aktuelle Lage) zu q; grob über ein Raster beschleunigt
  naechster(q) {
    if (!this._raster || this._rasterStand !== this._stand) this._rasterBauen();
    const R = this._raster;
    const zelle = (x, y, z) => ((x * R.n + y) * R.n + z);
    const ix = Math.floor((q[0] - R.min[0]) / R.h), iy = Math.floor((q[1] - R.min[1]) / R.h), iz = Math.floor((q[2] - R.min[2]) / R.h);
    let best = null;
    for (let r = 0; r < R.n && !best; r++) {
      for (let x = ix - r; x <= ix + r; x++) for (let y = iy - r; y <= iy + r; y++) for (let z = iz - r; z <= iz + r; z++) {
        if (x < 0 || y < 0 || z < 0 || x >= R.n || y >= R.n || z >= R.n) continue;
        if (Math.max(Math.abs(x - ix), Math.abs(y - iy), Math.abs(z - iz)) !== r) continue;
        const liste = R.zellen.get(zelle(x, y, z));
        if (!liste) continue;
        for (const t of liste) {
          const e = naechsterAufDreieck(this, t, q);
          if (!best || e.d2 < best.d2) best = { t, b: e.b, d2: e.d2 };
        }
      }
      if (best) {
        // eine Schale weiter prüfen (der nächste kann knapp daneben liegen)
        const r2 = r + 1;
        for (let x = ix - r2; x <= ix + r2; x++) for (let y = iy - r2; y <= iy + r2; y++) for (let z = iz - r2; z <= iz + r2; z++) {
          if (x < 0 || y < 0 || z < 0 || x >= R.n || y >= R.n || z >= R.n) continue;
          if (Math.max(Math.abs(x - ix), Math.abs(y - iy), Math.abs(z - iz)) !== r2) continue;
          const liste = R.zellen.get(zelle(x, y, z));
          if (!liste) continue;
          for (const t of liste) {
            const e = naechsterAufDreieck(this, t, q);
            if (e.d2 < best.d2) best = { t, b: e.b, d2: e.d2 };
          }
        }
      }
    }
    return best;
  }

  geaendert() {
    this._stand = (this._stand || 0) + 1;
  }

  _rasterBauen() {
    const { pos, tri } = this;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], pos[i + k]);
      max[k] = Math.max(max[k], pos[i + k]);
    }
    const n = 24;
    const h = Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]) / n + 1e-6;
    const zellen = new Map();
    for (let t = 0; t < this.nT; t++) {
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (let j = 0; j < 3; j++) {
        const v = tri[3 * t + j] * 3;
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], pos[v + k]);
          hi[k] = Math.max(hi[k], pos[v + k]);
        }
      }
      const a = lo.map((x, k) => Math.max(0, Math.floor((x - min[k]) / h)));
      const b = hi.map((x, k) => Math.min(n - 1, Math.floor((x - min[k]) / h)));
      for (let x = a[0]; x <= b[0]; x++) for (let y = a[1]; y <= b[1]; y++) for (let z = a[2]; z <= b[2]; z++) {
        const key = (x * n + y) * n + z;
        let l = zellen.get(key);
        if (!l) zellen.set(key, (l = []));
        l.push(t);
      }
    }
    this._raster = { min, h, n, zellen };
    this._rasterStand = this._stand;
  }
}

function naechsterAufDreieck(netz, t, q) {
  const P = netz.pos, T = netz.tri;
  const ia = T[3 * t] * 3, ib = T[3 * t + 1] * 3, ic = T[3 * t + 2] * 3;
  const a = [P[ia], P[ia + 1], P[ia + 2]], b = [P[ib], P[ib + 1], P[ib + 2]], c = [P[ic], P[ic + 1], P[ic + 2]];
  // nach Ericson, Real-Time Collision Detection
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ap = [q[0] - a[0], q[1] - a[1], q[2] - a[2]];
  const d = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = d(ab, ap), d2 = d(ac, ap);
  let bary;
  if (d1 <= 0 && d2 <= 0) bary = [1, 0, 0];
  else {
    const bp = [q[0] - b[0], q[1] - b[1], q[2] - b[2]];
    const d3 = d(ab, bp), d4 = d(ac, bp);
    if (d3 >= 0 && d4 <= d3) bary = [0, 1, 0];
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) {
        const v = d1 / (d1 - d3);
        bary = [1 - v, v, 0];
      } else {
        const cp = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
        const d5 = d(ab, cp), d6 = d(ac, cp);
        if (d6 >= 0 && d5 <= d6) bary = [0, 0, 1];
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) {
            const w = d2 / (d2 - d6);
            bary = [1 - w, 0, w];
          } else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
              bary = [0, 1 - w, w];
            } else {
              const den = 1 / (va + vb + vc);
              const v = vb * den, w = vc * den;
              bary = [1 - v - w, v, w];
            }
          }
        }
      }
    }
  }
  const p = [
    bary[0] * a[0] + bary[1] * b[0] + bary[2] * c[0],
    bary[0] * a[1] + bary[1] * b[1] + bary[2] * c[1],
    bary[0] * a[2] + bary[1] * b[2] + bary[2] * c[2],
  ];
  const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
  return { b: bary, d2: dx * dx + dy * dy + dz * dz };
}

function spiegelPartner(P) {
  const n = P.length / 3;
  const schl = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  const map = new Map();
  for (let i = 0; i < n; i++) map.set(schl(P[3 * i], P[3 * i + 1], P[3 * i + 2]), i);
  const s = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const j = map.get(schl(P[3 * i], P[3 * i + 1], -P[3 * i + 2]));
    if (j !== undefined) s[i] = j;
  }
  return s;
}

// Ikosaeder, n-mal unterteilt, Halbmesser r
export function kugel(stufe = 5, r = 1) {
  const f = (1 + Math.sqrt(5)) / 2;
  let V = [
    [-1, f, 0], [1, f, 0], [-1, -f, 0], [1, -f, 0],
    [0, -1, f], [0, 1, f], [0, -1, -f], [0, 1, -f],
    [f, 0, -1], [f, 0, 1], [-f, 0, -1], [-f, 0, 1],
  ].map((p) => {
    const l = Math.hypot(...p);
    return [p[0] / l, p[1] / l, p[2] / l];
  });
  let F = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let s = 0; s < stufe; s++) {
    const mitte = new Map();
    const m = (a, b) => {
      const k = a < b ? a * 1e6 + b : b * 1e6 + a;
      let i = mitte.get(k);
      if (i === undefined) {
        const p = [(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2];
        const l = Math.hypot(...p);
        V.push([p[0] / l, p[1] / l, p[2] / l]);
        i = V.length - 1;
        mitte.set(k, i);
      }
      return i;
    };
    const F2 = [];
    for (const [a, b, c] of F) {
      const ab = m(a, b), bc = m(b, c), ca = m(c, a);
      F2.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    F = F2;
  }
  const ruhe = new Float32Array(V.length * 3);
  V.forEach((p, i) => {
    ruhe[3 * i] = p[0] * r;
    ruhe[3 * i + 1] = p[1] * r;
    ruhe[3 * i + 2] = p[2] * r;
  });
  const tri = new Uint32Array(F.length * 3);
  F.forEach((f, i) => tri.set(f, 3 * i));
  return new Netz(ruhe, tri);
}
