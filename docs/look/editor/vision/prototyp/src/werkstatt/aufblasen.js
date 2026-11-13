// Aus einem gezeichneten Umriss (Seitenansicht, Ebene z = 0) wird ein Wesen.
// 1. Aufblasen: Poisson Δf = −2 im Umriss, f = 0 außen; Höhe z = ±κ·√f. Lange Teile bekommen so runde Querschnitte
//    (wie bei Monster Mash, Dvorožňák et al. 2020; Teddy, Igarashi et al. 1999).
// 2. Fläche: Surface Nets auf F = κ²·f − z² (glatt, ohne Knick am Rand), größte Zusammenhangskomponente, Taubin-Glättung.
//    Das Gitter ist zur Ebene z = 0 symmetrisch, jede Zelle hat ihre Spiegelzelle: die Spiegelpartner ergeben sich von selbst.
// 3. Spanten: halbe Querschnitte an drei Stellen des Rumpfs (Ringe von Kiel zu Kiel).

import { Netz } from '../netz.js';

// Bézier-Pfad (Punkte mit p, ein, aus; 2D oder 3D) → geschlossenes Polygon [[x, y]]
export function polygonAus(punkte, jeStueck = 28) {
  const n = punkte.length, poly = [];
  for (let i = 0; i < n; i++) {
    const a = punkte[i], b = punkte[(i + 1) % n];
    const p0 = a.p, p1 = [a.p[0] + a.aus[0], a.p[1] + a.aus[1]], p2 = [b.p[0] + b.ein[0], b.p[1] + b.ein[1]], p3 = b.p;
    for (let k = 0; k < jeStueck; k++) {
      const t = k / jeStueck, u = 1 - t;
      const A = u * u * u, B = 3 * u * u * t, C = 3 * u * t * t, D = t * t * t;
      poly.push([A * p0[0] + B * p1[0] + C * p2[0] + D * p3[0], A * p0[1] + B * p1[1] + C * p2[1] + D * p3[1]]);
    }
  }
  return poly;
}

export function flaeche2(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

// Schnittstellen einer Waagrechten (y) oder Senkrechten (x) mit dem Polygon, sortiert
function schnitte(poly, wert, achse) {
  const s = [], b = 1 - achse;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    if ((p[b] <= wert && q[b] > wert) || (q[b] <= wert && p[b] > wert)) s.push(p[achse] + ((wert - p[b]) / (q[b] - p[b])) * (q[achse] - p[achse]));
  }
  return s.sort((u, v) => u - v);
}

export function aufblasen(poly, opt = {}) {
  const kappa = opt.kappa ?? 0.92;
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const p of poly) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }
  // Zellgröße aus der Fläche: etwa opt.ziel Netzpunkte (Oberfläche ≈ 2,6 × Umrissfläche)
  const A = Math.abs(flaeche2(poly));
  const ausd = Math.max(maxx - minx, maxy - miny);
  let h = Math.sqrt((2.6 * A) / (opt.ziel || 9000));
  h = Math.min(Math.max(h, ausd / 150), ausd / 56);
  const pad = 2;
  const nx = Math.ceil((maxx - minx) / h) + 2 * pad + 1, ny = Math.ceil((maxy - miny) / h) + 2 * pad + 1;
  const x0 = minx - pad * h, y0 = miny - pad * h;
  // innen je Knoten (Zeilen-Schnitte)
  const innen = new Uint8Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * h;
    const s = schnitte(poly, y, 0);
    for (let k = 0; k + 1 < s.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((s[k] - x0) / h)), i1 = Math.min(nx - 1, Math.floor((s[k + 1] - x0) / h));
      for (let i = i0; i <= i1; i++) innen[j * nx + i] = 1;
    }
  }
  // Poisson mit Überrelaxation
  const f = new Float32Array(nx * ny);
  const w = 2 / (1 + Math.sin(Math.PI / Math.max(nx, ny)));
  const h2 = 2 * h * h;
  for (let it = 0; it < 3 * Math.max(nx, ny) + 60; it++) {
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const o = j * nx + i;
      if (!innen[o]) continue;
      const neu = (f[o - 1] + f[o + 1] + f[o - nx] + f[o + nx] + h2) * 0.25;
      f[o] += w * (neu - f[o]);
    }
  }
  let fmax = 0;
  for (let o = 0; o < f.length; o++) if (f[o] > fmax) fmax = f[o];
  const k2 = kappa * kappa;
  const kc = Math.ceil((kappa * Math.sqrt(fmax)) / h) + 2;
  const nz = 2 * kc + 1;
  const zk = (k) => (k - kc) * h;
  const F = (i, j, k) => { const z = zk(k); return k2 * f[j * nx + i] - z * z; };
  // Surface Nets: ein Punkt je Zelle mit Vorzeichenwechsel (Mittel der Kantenschnitte)
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const zelle = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const KANTEN = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let maske = 0;
    for (let c = 0; c < 8; c++) {
      const v = F(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1));
      val[c] = v;
      if (v > 0) maske |= 1 << c;
    }
    if (maske === 0 || maske === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of KANTEN) {
      const ia = (maske >> a) & 1, ib = (maske >> b) & 1;
      if (ia === ib) continue;
      const t = val[a] / (val[a] - val[b]);
      sx += (a & 1) + (((b & 1) - (a & 1)) * t);
      sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t);
      sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t);
      n++;
    }
    zelle[(k * cy + j) * cx + i] = pos.length / 3;
    pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, zk(k) + (sz / n) * h);
  }
  // Vierecke um jede Gitterkante mit Vorzeichenwechsel
  const tri = [];
  const Z = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= cx || j >= cy || k >= cz ? -1 : zelle[(k * cy + j) * cx + i]);
  const quad = (a, b, c, d, umkehr) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (umkehr) tri.push(a, c, b, a, d, c);
    else tri.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = F(i, j, k) > 0;
    if (i + 1 < nx && v0 !== F(i + 1, j, k) > 0) quad(Z(i, j - 1, k - 1), Z(i, j, k - 1), Z(i, j, k), Z(i, j - 1, k), !v0);
    if (j + 1 < ny && v0 !== F(i, j + 1, k) > 0) quad(Z(i - 1, j, k - 1), Z(i - 1, j, k), Z(i, j, k), Z(i, j, k - 1), !v0);
    if (k + 1 < nz && v0 !== F(i, j, k + 1) > 0) quad(Z(i - 1, j - 1, k), Z(i, j - 1, k), Z(i, j, k), Z(i - 1, j, k), !v0);
  }
  // Spiegelzelle: (i, j, cz − 1 − k)
  const nV0 = pos.length / 3;
  const spiegel0 = new Int32Array(nV0).fill(-1);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    const a = zelle[(k * cy + j) * cx + i];
    if (a >= 0) spiegel0[a] = zelle[((cz - 1 - k) * cy + j) * cx + i];
  }
  // größte Zusammenhangskomponente
  const nb = Array.from({ length: nV0 }, () => []);
  for (let t = 0; t < tri.length; t += 3) for (let e = 0; e < 3; e++) { const a = tri[t + e], b = tri[t + ((e + 1) % 3)]; nb[a].push(b); nb[b].push(a); }
  const komp = new Int32Array(nV0).fill(-1);
  let bestK = -1, bestN = 0;
  for (let s = 0, kk = 0; s < nV0; s++) {
    if (komp[s] >= 0) continue;
    const stapel = [s];
    komp[s] = kk;
    let n = 0;
    while (stapel.length) { const v = stapel.pop(); n++; for (const u of nb[v]) if (komp[u] < 0) { komp[u] = kk; stapel.push(u); } }
    if (n > bestN) { bestN = n; bestK = kk; }
    kk++;
  }
  const neu = new Int32Array(nV0).fill(-1);
  const P = [];
  for (let v = 0; v < nV0; v++) if (komp[v] === bestK) { neu[v] = P.length / 3; P.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]); }
  const T = [];
  for (let t = 0; t < tri.length; t += 3) if (komp[tri[t]] === bestK) T.push(neu[tri[t]], neu[tri[t + 1]], neu[tri[t + 2]]);
  const nV = P.length / 3;
  const sp = new Int32Array(nV).fill(-1);
  for (let v = 0; v < nV0; v++) if (neu[v] >= 0 && spiegel0[v] >= 0 && neu[spiegel0[v]] >= 0) sp[neu[v]] = neu[spiegel0[v]];
  // Taubin-Glättung (Volumen bleibt), danach exakt spiegelgleich
  const nachbarn = Array.from({ length: nV }, () => new Set());
  for (let t = 0; t < T.length; t += 3) for (let e = 0; e < 3; e++) { const a = T[t + e], b = T[t + ((e + 1) % 3)]; nachbarn[a].add(b); nachbarn[b].add(a); }
  const NB = nachbarn.map((s) => [...s]);
  const Q = new Float64Array(P);
  const tmp = new Float64Array(Q.length);
  const schritt = (lam) => {
    for (let v = 0; v < nV; v++) {
      const L = NB[v];
      if (!L.length) { tmp[3 * v] = Q[3 * v]; tmp[3 * v + 1] = Q[3 * v + 1]; tmp[3 * v + 2] = Q[3 * v + 2]; continue; }
      let mx = 0, my = 0, mz = 0;
      for (const u of L) { mx += Q[3 * u]; my += Q[3 * u + 1]; mz += Q[3 * u + 2]; }
      mx /= L.length; my /= L.length; mz /= L.length;
      tmp[3 * v] = Q[3 * v] + lam * (mx - Q[3 * v]);
      tmp[3 * v + 1] = Q[3 * v + 1] + lam * (my - Q[3 * v + 1]);
      tmp[3 * v + 2] = Q[3 * v + 2] + lam * (mz - Q[3 * v + 2]);
    }
    Q.set(tmp);
  };
  for (let it = 0; it < (opt.glaetten ?? 12); it++) { schritt(0.5); schritt(-0.53); }
  // Rand: nahe z = 0 auf den gezeichneten Umriss legen (das Gitter trifft ihn nur auf eine Zelle genau), weich überblendet
  const naechster = (x, y) => {
    let best = null, bd = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1e-12)));
      const px = a[0] + dx * t, py = a[1] + dy * t, d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) { bd = d; best = [px, py]; }
    }
    return best;
  };
  for (let v = 0; v < nV; v++) {
    const z = Math.abs(Q[3 * v + 2]);
    if (z > 2.2 * h) continue;
    const wr = 1 - Math.min(1, Math.max(0, (z - 0.6 * h) / (1.6 * h)));
    const q = naechster(Q[3 * v], Q[3 * v + 1]);
    Q[3 * v] += (q[0] - Q[3 * v]) * wr;
    Q[3 * v + 1] += (q[1] - Q[3 * v + 1]) * wr;
  }
  for (let it = 0; it < 2; it++) { schritt(0.33); schritt(-0.34); }
  for (let v = 0; v < nV; v++) {
    const u = sp[v];
    if (u < 0 || u < v) continue;
    const x = (Q[3 * v] + Q[3 * u]) / 2, y = (Q[3 * v + 1] + Q[3 * u + 1]) / 2, z = (Q[3 * v + 2] - Q[3 * u + 2]) / 2;
    Q[3 * v] = x; Q[3 * v + 1] = y; Q[3 * v + 2] = z;
    Q[3 * u] = x; Q[3 * u + 1] = y; Q[3 * u + 2] = -z;
  }
  const netz = new Netz(new Float32Array(Q), new Uint32Array(T), sp);
  // Höhe an einer Stelle (für Spanten), bilinear
  const hoehe = (x, y) => {
    const gx = (x - x0) / h, gy = (y - y0) / h;
    const i = Math.max(0, Math.min(nx - 2, Math.floor(gx))), j = Math.max(0, Math.min(ny - 2, Math.floor(gy)));
    const u = Math.min(1, Math.max(0, gx - i)), v = Math.min(1, Math.max(0, gy - j));
    const a = f[j * nx + i], b = f[j * nx + i + 1], c = f[(j + 1) * nx + i], d = f[(j + 1) * nx + i + 1];
    const fv = a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
    return kappa * Math.sqrt(Math.max(0, fv));
  };
  return { netz, hoehe, h, nV, grenzen: { minx, maxx, miny, maxy } };
}

// Spanten: an n Stellen des Rumpfs je ein halber Querschnitt (oben → über +z → unten)
export function spantenPfade(poly, hoehe, n = 3) {
  let minx = Infinity, maxx = -Infinity;
  for (const p of poly) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); }
  // Sehnen je Stelle: das Stück mit der größten Höhe
  const probe = [];
  for (let k = 1; k < 60; k++) {
    const x = minx + ((maxx - minx) * k) / 60;
    const s = schnitte(poly, x, 1);
    let best = null;
    for (let i = 0; i + 1 < s.length; i += 2) {
      const ym = (s[i] + s[i + 1]) / 2, hm = hoehe(x, ym);
      if (!best || hm > best.hm) best = { x, y0: s[i], y1: s[i + 1], hm };
    }
    if (best) probe.push(best);
  }
  if (!probe.length) return [];
  const hMax = Math.max(...probe.map((q) => q.hm));
  const rumpf = probe.filter((q) => q.hm > 0.45 * hMax);
  const xa = rumpf[0].x, xb = rumpf[rumpf.length - 1].x;
  const pfade = [];
  for (let k = 0; k < n; k++) {
    const x = xa + ((xb - xa) * (k + 0.5)) / n;
    const q = probe.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
    const pfad = [];
    for (let i = 0; i <= 32; i++) {
      const y = q.y1 + ((q.y0 - q.y1) * i) / 32;
      pfad.push([q.x, y, i === 0 || i === 32 ? 0 : hoehe(q.x, y)]);
    }
    pfade.push(pfad);
  }
  return pfade;
}
