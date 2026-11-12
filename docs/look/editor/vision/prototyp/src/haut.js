// Die Haut: Netz in Ruhelage + Linien → verformtes Netz. Die Haut geht durch alle Proben der Linien (Ersatzlöser, rbf.js).

import { RBF } from './rbf.js';
import { probenStellen, punktAuf, geschlossen } from './linien.js';
import { spiegel } from './mathe.js';

export class Haut {
  constructor(netz) {
    this.netz = netz;
    this.linien = [];
    this.rbf = null;
    this.phi = null;
    this.zentren = null; // Float64Array
    this.quellen = []; // je Zentrum: { L, s, t, sp } (sp = gespiegelt)
    this.stand = 0;
    this.baustand = -1;
    this.massstab = 1;
  }

  // Probe einer Linie an ihrem Ort auf dem Netz verankern (aktuelle Lage → Dreieck/baryzentrisch)
  einbetten(L) {
    L.proben = probenStellen(L).map(([s, t]) => {
      const q = punktAuf(L, s, t);
      const n = this.netz.naechster(q);
      return { s, t, tri: n.t, b: n.b };
    });
  }

  aufbauen() {
    const netz = this.netz;
    const zentren = [];
    const quellen = [];
    const h = 1e-4 * this.massstab;
    const raster = new Map();
    const schl = (p) => `${Math.round(p[0] / h)},${Math.round(p[1] / h)},${Math.round(p[2] / h)}`;
    const dazu = (p, q) => {
      const k = schl(p);
      if (raster.has(k)) return;
      raster.set(k, true);
      zentren.push(p[0], p[1], p[2]);
      quellen.push(q);
    };
    for (const L of this.linien) {
      for (const pr of L.proben) {
        const r = netz.punkt(pr.tri, pr.b, true);
        dazu(r, { L, s: pr.s, t: pr.t, sp: false });
        const aufEbene = L.art === 'mitte' || (L.art === 'ring' && ((pr.s === 0 && pr.t === 0) || pr.t === 1));
        if (!aufEbene) dazu(spiegel(r), { L, s: pr.s, t: pr.t, sp: true });
      }
    }
    this.zentren = new Float64Array(zentren);
    this.quellen = quellen;
    const N = quellen.length;
    if (N < 4) {
      this.rbf = null;
      this.phi = null;
      this.baustand = this.stand;
      return;
    }
    const t0 = performance.now();
    this.rbf = new RBF(this.zentren);
    // Φ je Netzpunkt und Zentrum (Ruhelage, fest bis zum nächsten Aufbau)
    const V = netz.nV, R = netz.ruhe, C = this.zentren;
    const phi = new Float32Array(V * N);
    for (let v = 0; v < V; v++) {
      const x = R[3 * v], y = R[3 * v + 1], z = R[3 * v + 2];
      const o = v * N;
      for (let i = 0; i < N; i++) {
        const dx = x - C[3 * i], dy = y - C[3 * i + 1], dz = z - C[3 * i + 2];
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        phi[o + i] = r * r * r;
      }
    }
    this.phi = phi;
    this.bauzeit = performance.now() - t0;
    this.baustand = this.stand;
    this.wx = new Float32Array(N);
    this.wy = new Float32Array(N);
    this.wz = new Float32Array(N);
  }

  ziel(q) {
    const p = punktAuf(q.L, q.s, q.t);
    return q.sp ? spiegel(p) : p;
  }

  verformen() {
    if (this.baustand !== this.stand) this.aufbauen();
    const netz = this.netz;
    if (!this.rbf) {
      netz.pos.set(netz.ruhe);
      netz.normalen();
      netz.geaendert();
      return;
    }
    const t0 = performance.now();
    const N = this.quellen.length;
    const d = new Float64Array(3 * N);
    const C = this.zentren;
    for (let i = 0; i < N; i++) {
      const p = this.ziel(this.quellen[i]);
      d[3 * i] = p[0] - C[3 * i];
      d[3 * i + 1] = p[1] - C[3 * i + 1];
      d[3 * i + 2] = p[2] - C[3 * i + 2];
    }
    const w = this.rbf.loesen(d);
    this.w = w;
    const { wx, wy, wz } = this;
    for (let i = 0; i < N; i++) {
      wx[i] = w[0][i];
      wy[i] = w[1][i];
      wz[i] = w[2][i];
    }
    const np = this.rbf.np;
    const px = w[0].subarray(N), py = w[1].subarray(N), pz = w[2].subarray(N);
    const V = netz.nV, R = netz.ruhe, P = netz.pos, phi = this.phi;
    for (let v = 0; v < V; v++) {
      const o = v * N;
      let ax = 0, ay = 0, az = 0;
      for (let i = 0; i < N; i++) {
        const f = phi[o + i];
        ax += f * wx[i];
        ay += f * wy[i];
        az += f * wz[i];
      }
      const x = R[3 * v], y = R[3 * v + 1], z = R[3 * v + 2];
      ax += px[0] + px[1] * x + px[2] * y + (np > 3 ? px[3] * z : 0);
      ay += py[0] + py[1] * x + py[2] * y + (np > 3 ? py[3] * z : 0);
      az += pz[0] + pz[1] * x + pz[2] * y + (np > 3 ? pz[3] * z : 0);
      P[3 * v] = x + ax;
      P[3 * v + 1] = y + ay;
      P[3 * v + 2] = z + az;
    }
    netz.normalen();
    netz.geaendert();
    this.zeit = performance.now() - t0;
  }

  // Abbildung eines beliebigen Ruhepunkts (z. B. Gelenk des Kiefers)
  abbilden(x, y, z) {
    if (!this.rbf || !this.w) return [x, y, z];
    const N = this.quellen.length, C = this.zentren, w = this.w, np = this.rbf.np;
    let a = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      const dx = x - C[3 * i], dy = y - C[3 * i + 1], dz = z - C[3 * i + 2];
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz), f = r * r * r;
      a[0] += f * w[0][i];
      a[1] += f * w[1][i];
      a[2] += f * w[2][i];
    }
    for (let k = 0; k < 3; k++) {
      const p = w[k].subarray(N);
      a[k] += p[0] + p[1] * x + p[2] * y + (np > 3 ? p[3] * z : 0);
    }
    return [x + a[0], y + a[1], z + a[2]];
  }

  struktur() {
    this.stand++;
  }
}

export { geschlossen };
