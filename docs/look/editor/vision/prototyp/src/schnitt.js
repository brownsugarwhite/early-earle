// Striche zu Linien: quer über den Körper = Loop (Schnitt), geschlossen auf der Haut = Form.

import { dist, sub, norm, add, mul, spiegel } from './mathe.js';
import { linieAusPfad, abtasten, naechsteStelle, punktEinsetzen, ringEndenRichten, mitteRichten, neueId } from './linien.js';

// Strich vereinfachen und an beiden Enden weit verlängern (damit der Schnitt den Körper ganz durchtrennt)
function strichVorbereiten(strich) {
  const s = [strich[0]];
  for (const p of strich) if (Math.hypot(p[0] - s[s.length - 1][0], p[1] - s[s.length - 1][1]) > 6) s.push(p);
  if (s.length < 2) s.push(strich[strich.length - 1]);
  const a = s[0], b = s[1], y = s[s.length - 1], z = s[s.length - 2];
  const da = norm([a[0] - b[0], a[1] - b[1], 0]), dz = norm([y[0] - z[0], y[1] - z[1], 0]);
  return [[a[0] + da[0] * 5000, a[1] + da[1] * 5000], ...s, [y[0] + dz[0] * 5000, y[1] + dz[1] * 5000]];
}

// vorzeichenbehafteter Abstand eines Bildpunkts zur Strichlinie
function seiteVon(S, x, y) {
  let best = Infinity, sg = 1;
  for (let i = 0; i < S.length - 1; i++) {
    const ax = S[i][0], ay = S[i][1], bx = S[i + 1][0], by = S[i + 1][1];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
    let t = ((x - ax) * dx + (y - ay) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + dx * t, qy = ay + dy * t;
    const d = Math.hypot(x - qx, y - qy);
    if (d < best) {
      best = d;
      sg = dx * (y - ay) - dy * (x - ax) >= 0 ? 1 : -1;
    }
  }
  return best * sg;
}

// Trifft ein Bildpunkt den Körper?
export function trifftKoerper(netz, sicht, x, y) {
  const { o, d } = sicht.strahl(x, y);
  return netz.strahl(o, d);
}

// Schnittkurven der Haut mit der Strichfläche (Nulldurchgänge auf den Dreiecken)
function schnittKurven(netz, sicht, strich) {
  const S = strichVorbereiten(strich);
  const V = netz.nV, P = netz.pos, T = netz.tri;
  const f = new Float32Array(V);
  for (let v = 0; v < V; v++) {
    const q = sicht.projizieren([P[3 * v], P[3 * v + 1], P[3 * v + 2]]);
    f[v] = seiteVon(S, q[0], q[1]);
    if (Math.abs(f[v]) < 1e-4) f[v] = 1e-4;
  }
  const kanteKey = (a, b) => (a < b ? a * 4194304 + b : b * 4194304 + a);
  const punktAufKante = new Map();
  const nachbar = new Map(); // Kante → [Kante, Kante]
  const kantePunkt = (a, b) => {
    const k = kanteKey(a, b);
    if (!punktAufKante.has(k)) {
      const t = f[a] / (f[a] - f[b]);
      punktAufKante.set(k, [P[3 * a] + (P[3 * b] - P[3 * a]) * t, P[3 * a + 1] + (P[3 * b + 1] - P[3 * a + 1]) * t, P[3 * a + 2] + (P[3 * b + 2] - P[3 * a + 2]) * t]);
    }
    return k;
  };
  const verbinden = (k1, k2) => {
    if (!nachbar.has(k1)) nachbar.set(k1, []);
    if (!nachbar.has(k2)) nachbar.set(k2, []);
    nachbar.get(k1).push(k2);
    nachbar.get(k2).push(k1);
  };
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t], b = T[t + 1], c = T[t + 2];
    const sa = f[a] > 0, sb = f[b] > 0, sc = f[c] > 0;
    if (sa === sb && sb === sc) continue;
    const ks = [];
    if (sa !== sb) ks.push(kantePunkt(a, b));
    if (sb !== sc) ks.push(kantePunkt(b, c));
    if (sc !== sa) ks.push(kantePunkt(c, a));
    if (ks.length === 2) verbinden(ks[0], ks[1]);
  }
  // Ketten bilden
  const besucht = new Set();
  const kurven = [];
  for (const start of nachbar.keys()) {
    if (besucht.has(start)) continue;
    const kette = [start];
    besucht.add(start);
    let vor = null, jetzt = start;
    for (;;) {
      const nb = nachbar.get(jetzt).filter((k) => k !== vor && !besucht.has(k));
      if (!nb.length) break;
      vor = jetzt;
      jetzt = nb[0];
      besucht.add(jetzt);
      kette.push(jetzt);
    }
    const pts = kette.map((k) => punktAufKante.get(k));
    if (pts.length > 8) kurven.push(pts);
  }
  return kurven;
}

// gleichmäßig nachtasten
function nachtasten(pts, zu, abstand) {
  const out = [pts[0]];
  let rest = 0;
  const n = pts.length;
  const m = zu ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const l = dist(a, b);
    let s = abstand - rest;
    while (s <= l) {
      const t = s / l;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      s += abstand;
    }
    rest = l - (s - abstand);
  }
  if (!zu) out.push(pts[n - 1]);
  if (zu && dist(out[out.length - 1], out[0]) < abstand * 0.5) out.pop();
  return out;
}

// Geschlossene Kurve → Linienart und Pfad (Halbringe von Mitte zu Mitte auf z ≥ 0)
function einordnen(pts, eps) {
  let pos = 0, neg = 0;
  for (const p of pts) {
    if (p[2] > eps) pos++;
    else if (p[2] < -eps) neg++;
  }
  if (pos && !neg) return { art: 'paar', pfad: pts };
  if (neg && !pos) return { art: 'paar', pfad: pts.map(spiegel).reverse() };
  if (!pos && !neg) return { art: 'mitte', pfad: pts };
  // Nulldurchgänge von z suchen, das Stück mit z > 0 nehmen
  const n = pts.length;
  const wechsel = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    if ((a[2] >= 0) !== (b[2] >= 0)) wechsel.push(i);
  }
  if (wechsel.length < 2) return { art: 'paar', pfad: pts };
  // längstes positives Stück zwischen zwei Wechseln
  let best = null;
  for (let w = 0; w < wechsel.length; w++) {
    const i0 = wechsel[w], i1 = wechsel[(w + 1) % wechsel.length];
    const mid = pts[(i0 + 1) % n];
    if (mid[2] <= 0) continue;
    const stueck = [];
    const kreuz = (a, b) => {
      const t = a[2] / (a[2] - b[2]);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0];
    };
    stueck.push(kreuz(pts[i0], pts[(i0 + 1) % n]));
    for (let k = (i0 + 1) % n; k !== (i1 + 1) % n; k = (k + 1) % n) stueck.push(pts[k]);
    stueck[stueck.length - 1] = kreuz(pts[i1], pts[(i1 + 1) % n]);
    if (!best || stueck.length > best.length) best = stueck;
  }
  return { art: 'ring', pfad: best };
}

// Vorschau und Ergebnis des Schnitts: Liste von { art, pfad }
export function schnittPfade(netz, sicht, strich, groesse) {
  const kurven = schnittKurven(netz, sicht, strich);
  const eps = groesse * 0.004;
  const out = [];
  // nur Kurven, die der gezeichnete Strich wirklich überquert (nicht nur seine Verlängerung)
  for (const k of kurven) {
    let nah = false;
    for (let i = 0; i < k.length && !nah; i += 3) {
      const q = sicht.projizieren(k[i]);
      for (let j = 0; j < strich.length - 1 && !nah; j++) {
        const a = strich[j], b = strich[j + 1];
        const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1e-9;
        let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        if (Math.hypot(q[0] - a[0] - dx * t, q[1] - a[1] - dy * t) < 14) nah = true;
      }
    }
    if (!nah) continue;
    const e = einordnen(nachtasten(k, true, groesse * 0.02), eps);
    if (!e.pfad || e.pfad.length < 6) continue;
    // Spiegelzwillinge (Beinpaar) nur einmal
    if (e.art === 'paar' && out.some((o) => o.art === 'paar' && dist(schwer(o.pfad), schwer(e.pfad)) < groesse * 0.05)) continue;
    out.push(e);
  }
  return out;
}
const schwer = (P) => {
  const s = [0, 0, 0];
  for (const p of P) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
  return s.map((x) => x / P.length);
};

// Kreuzungen eines neuen Pfads mit bestehenden Linien (3D-Nähe zweier Polylinien auf der Haut)
function kreuzungen(pfad, zu, linien, eps) {
  const treffer = [];
  for (const L of linien) {
    for (const zug of abtasten(L, 24)) {
      if (zug.spiegel) continue;
      const Q = zug.pts;
      for (let i = 0; i < pfad.length - (zu ? 0 : 1); i++) {
        const a = pfad[i], b = pfad[(i + 1) % pfad.length];
        for (let j = 0; j < Q.length - 1; j++) {
          const c = Q[j], d = Q[j + 1];
          const r = streckenNaehe(a, b, c, d);
          if (r.d < eps) treffer.push({ L, i, s: r.s, p: r.p, q: Q[j], par: zug.s[j], j });
        }
      }
    }
  }
  // je Linie benachbarte Treffer zusammenfassen
  const out = [];
  for (const t of treffer) {
    const nah = out.find((o) => o.L === t.L && dist(o.p, t.p) < eps * 4);
    if (!nah) out.push(t);
  }
  return out;
}
function streckenNaehe(a, b, c, d) {
  // nächste Punkte zweier Strecken (vereinfachte Abtastung)
  let best = { d: Infinity };
  for (let k = 0; k <= 4; k++) {
    const s = k / 4;
    const p = [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
    const cd = sub(d, c), l2 = cd[0] * cd[0] + cd[1] * cd[1] + cd[2] * cd[2] || 1e-12;
    let t = ((p[0] - c[0]) * cd[0] + (p[1] - c[1]) * cd[1] + (p[2] - c[2]) * cd[2]) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const q = [c[0] + cd[0] * t, c[1] + cd[1] * t, c[2] + cd[2] * t];
    const e = dist(p, q);
    if (e < best.d) best = { d: e, s, p: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2] };
  }
  return best;
}

let naechsteKreuzung = 1;
export const kreuzId = () => naechsteKreuzung++;

// Aus einem Pfad eine Linie machen, Kreuzungen in beide Linien setzen und verbinden
export function linieAnlegen(art, pfad, linien, groesse) {
  const zu = art !== 'ring';
  const eps = groesse * 0.025;
  const kr = art === 'mitte' ? [] : kreuzungen(pfad, zu, linien, eps).filter((k) => art !== 'ring' || k.p[2] >= -eps);
  // Kreuzungspunkte in den Pfad einfügen
  const zwingend = [];
  const P = pfad.map((p) => p.slice());
  const einf = kr.map((k) => ({ ...k })).sort((a, b) => b.i - a.i || b.s - a.s);
  for (const k of einf) {
    const pos = k.i + 1;
    P.splice(pos, 0, k.p.slice());
    k.pfadIdx = pos;
  }
  // Indizes nach dem Einfügen neu bestimmen
  for (const k of kr) {
    let best = 0, bd = Infinity;
    P.forEach((p, i) => { const d = dist(p, k.p); if (d < bd) { bd = d; best = i; } });
    k.pfadIdx = best;
    zwingend.push(best);
  }
  const laenge = P.reduce((s, p, i) => (i ? s + dist(p, P[i - 1]) : 0), 0);
  const anzahl = Math.max(art === 'ring' ? 2 : 4, Math.round(laenge / (groesse * 0.42)));
  const L = linieAusPfad(art, P, zwingend, anzahl);
  ringEndenRichten(L);
  mitteRichten(L);
  const geaendert = new Set();
  for (const k of kr) {
    // Punkt der neuen Linie an der Kreuzung
    let A = null, ad = Infinity;
    for (const Pk of L.punkte) { const d = dist(Pk.p, k.p); if (d < ad) { ad = d; A = Pk; } }
    // Punkt der alten Linie: bestehenden nehmen oder einsetzen
    let B = null, bd = Infinity;
    for (const Pk of k.L.punkte) { const d = dist(Pk.p, k.p); if (d < bd) { bd = d; B = Pk; } }
    if (bd > eps * 1.2) {
      const st = naechsteStelle(k.L, k.p);
      B = punktEinsetzen(k.L, st.s, st.t);
      geaendert.add(k.L);
    }
    if (!A) continue;
    // auf denselben Ort legen, verbinden
    A.p = B.p.slice();
    const id = B.kreuz || A.kreuz || kreuzId();
    A.kreuz = id;
    B.kreuz = id;
    if (L.art === 'ring' && (A === L.punkte[0] || A === L.punkte[L.punkte.length - 1])) A.p[2] = 0;
  }
  L.id = L.id || neueId();
  return { L, geaendert: [...geaendert] };
}

// Geschlossener Strich auf der Haut → Form (Pfad aus Strahltreffern)
export function formPfad(netz, sicht, strich, groesse) {
  const pts = [];
  for (let i = 0; i < strich.length; i += 1) {
    const h = trifftKoerper(netz, sicht, strich[i][0], strich[i][1]);
    if (h) pts.push(h.p);
  }
  if (pts.length < 8) return null;
  const dicht = nachtasten(pts, true, groesse * 0.015);
  const e = einordnen(dicht, groesse * 0.004);
  if (!e.pfad || e.pfad.length < 6) return null;
  return e;
}

export { add, mul };
