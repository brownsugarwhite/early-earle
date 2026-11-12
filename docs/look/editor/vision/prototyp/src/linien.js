// Linien (Loops) als Bézier-Kurven, wie im Editor: `mitte` (auf der Spiegelebene, geschlossen), `ring` (halb: von der
// Mittelebene zur Mittelebene, die andere Hälfte ist das Spiegelbild), `paar` (geschlossen auf einer Seite, dazu das
// Spiegelbild). Punkte tragen Lage, Griffe (`ein` zum vorigen, `aus` zum nächsten Stück), Ecke und Kante.
// Proben sind feste Stellen (Stück, t) der Kurve mit ihrem Ort auf dem Netz (Dreieck, baryzentrisch); sie sind die
// Stützstellen der Haut.

import { add, sub, mul, dot, len, norm, dist, bez, bezAbl, spiegel, kopie, lerp } from './mathe.js';

let naechsteId = 1;
export const neueId = () => naechsteId++;
export const idSetzen = (n) => { naechsteId = Math.max(naechsteId, n); };

export function neuerPunkt(p, ein = [0, 0, 0], aus = [0, 0, 0], ecke = false, kante = false) {
  return { id: neueId(), p: kopie(p), ein: kopie(ein), aus: kopie(aus), ecke, kante, kreuz: 0 };
}

export const geschlossen = (L) => L.art !== 'ring';
export const anzahlStuecke = (L) => (geschlossen(L) ? L.punkte.length : L.punkte.length - 1);

export function kontrolle(L, s) {
  const n = L.punkte.length;
  const a = L.punkte[s], b = L.punkte[(s + 1) % n];
  return [a.p, add(a.p, a.aus), add(b.p, b.ein), b.p];
}
export const punktAuf = (L, s, t) => {
  const [a, b, c, d] = kontrolle(L, s);
  return bez(a, b, c, d, t);
};
export const tangenteAuf = (L, s, t) => {
  const [a, b, c, d] = kontrolle(L, s);
  return bezAbl(a, b, c, d, t);
};

// Proben je Stück: t = 0, 1/3, 2/3 (große Netze: 0, 1/2), beim Ring zusätzlich das Ende
export const PROBEN = { je: [0, 1 / 3, 2 / 3] };
export function probenStellen(L) {
  const st = [];
  const m = anzahlStuecke(L);
  for (let s = 0; s < m; s++) for (const t of PROBEN.je) st.push([s, t]);
  if (!geschlossen(L)) st.push([m - 1, 1]);
  return st;
}

// Dichte Polylinie für die Anzeige. Liefert Züge: { pts:[[x,y,z]], kante:[w], s:[stück+t], spiegel:bool, zu:bool }
export function abtasten(L, jeStueck = 20) {
  const m = anzahlStuecke(L);
  const n = L.punkte.length;
  const pts = [], kw = [], par = [];
  for (let s = 0; s < m; s++) {
    const ka = L.punkte[s].kante ? 1 : 0, kb = L.punkte[(s + 1) % n].kante ? 1 : 0;
    for (let i = 0; i < jeStueck; i++) {
      const t = i / jeStueck;
      pts.push(punktAuf(L, s, t));
      kw.push(ka + (kb - ka) * glatt01(t));
      par.push(s + t);
    }
  }
  if (!geschlossen(L)) {
    pts.push(L.punkte[n - 1].p.slice());
    kw.push(L.punkte[n - 1].kante ? 1 : 0);
    par.push(m);
  }
  if (L.art === 'mitte') return [{ pts, kante: kw, s: par, spiegel: false, zu: true }];
  if (L.art === 'paar') {
    return [
      { pts, kante: kw, s: par, spiegel: false, zu: true },
      { pts: pts.map(spiegel), kante: kw.slice(), s: par.slice(), spiegel: true, zu: true },
    ];
  }
  // Ring: Hälfte + gespiegelte Hälfte rückwärts = ein geschlossener Zug
  const ganz = pts.slice(), kg = kw.slice(), sg = par.map((x) => x);
  for (let i = pts.length - 2; i >= 1; i--) {
    ganz.push(spiegel(pts[i]));
    kg.push(kw[i]);
    sg.push(-par[i] - 1); // negative Parameter = Spiegelhälfte
  }
  return [{ pts: ganz, kante: kg, s: sg, spiegel: false, zu: true }];
}
const glatt01 = (t) => t * t * (3 - 2 * t);

// ---------- Punkte einsetzen und löschen ----------

// de Casteljau: Stück s bei t teilen, Form bleibt gleich
export function punktEinsetzen(L, s, t) {
  const n = L.punkte.length;
  const A = L.punkte[s], B = L.punkte[(s + 1) % n];
  const [p0, p1, p2, p3] = kontrolle(L, s);
  const p01 = lerp(p0, p1, t), p12 = lerp(p1, p2, t), p23 = lerp(p2, p3, t);
  const p012 = lerp(p01, p12, t), p123 = lerp(p12, p23, t);
  const m = lerp(p012, p123, t);
  A.aus = sub(p01, p0);
  B.ein = sub(p23, p3);
  const P = neuerPunkt(m, sub(p012, m), sub(p123, m), false, A.kante && B.kante);
  L.punkte.splice(s + 1, 0, P);
  return P;
}

// Punkt löschen: das neue Stück wird an die alte Form angepasst (Schneider)
export function punktLoeschen(L, i) {
  const n = L.punkte.length;
  const minimal = L.art === 'ring' ? 3 : 3;
  if (n <= minimal) return false;
  if (L.art === 'ring' && (i === 0 || i === n - 1)) return false; // Enden auf der Mitte bleiben
  const sVor = (i - 1 + n) % n;
  // Proben der beiden alten Stücke
  const q = [];
  for (const s of [sVor, i]) for (let k = 0; k <= 12; k++) q.push(punktAuf(L, s, k / 12));
  const A = L.punkte[sVor], B = L.punkte[(i + 1) % n];
  L.punkte.splice(i, 1);
  const tA = norm(len(A.aus) > 1e-9 ? A.aus : sub(B.p, A.p));
  const tB = norm(len(B.ein) > 1e-9 ? B.ein : sub(A.p, B.p));
  const [a, b] = schneider(A.p, tA, B.p, tB, q);
  A.aus = mul(tA, a);
  B.ein = mul(tB, b);
  return true;
}

// Bézier-Anpassung eines Stücks mit festen Enden und Richtungen (Schneider, Graphics Gems 1990)
export function schneider(p0, t0, p3, t3, Q) {
  // Sehnenparameter
  const u = [0];
  for (let i = 1; i < Q.length; i++) u.push(u[i - 1] + dist(Q[i], Q[i - 1]));
  const tot = u[u.length - 1] || 1;
  for (let i = 0; i < u.length; i++) u[i] /= tot;
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < Q.length; i++) {
    const t = u[i], s = 1 - t;
    const b0 = s * s * s, b1 = 3 * s * s * t, b2 = 3 * s * t * t, b3 = t * t * t;
    const A1 = mul(t0, b1), A2 = mul(t3, b2);
    c00 += dot(A1, A1);
    c01 += dot(A1, A2);
    c11 += dot(A2, A2);
    const tmp = sub(Q[i], add(mul(p0, b0 + b1), mul(p3, b2 + b3)));
    x0 += dot(A1, tmp);
    x1 += dot(A2, tmp);
  }
  const det = c00 * c11 - c01 * c01;
  const seg = dist(p0, p3);
  let a = seg / 3, b = seg / 3;
  if (Math.abs(det) > 1e-12) {
    a = (x0 * c11 - x1 * c01) / det;
    b = (c00 * x1 - c01 * x0) / det;
  }
  const eps = 1e-3 * seg;
  if (a < eps || b < eps || a > seg * 2 || b > seg * 2) {
    a = seg / 3;
    b = seg / 3;
  }
  return [a, b];
}

// ---------- Linie aus einem Pfad auf der Haut ----------

// Pfad: Liste von 3D-Punkten (dicht, auf der Haut). art bestimmt offen (ring) oder geschlossen.
// zwingend: Indizes im Pfad, die Punkte werden müssen (Kreuzungen). anzahl: Zielzahl der Stücke.
export function linieAusPfad(art, pfad, zwingend = [], anzahl = 4) {
  const zu = art !== 'ring';
  const n = pfad.length;
  // Bogenlänge
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + dist(pfad[i], pfad[i - 1]));
  const ges = s[n - 1] + (zu ? dist(pfad[n - 1], pfad[0]) : 0);
  // Ankerindizes: gleichmäßig + zwingende
  const idx = new Set(zwingend);
  if (!zu) {
    idx.add(0);
    idx.add(n - 1);
  }
  const m = Math.max(zu ? 3 : 2, anzahl);
  for (let k = 0; k < m; k++) {
    const ziel = (k / m) * ges;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(s[i] - ziel);
      if (d < bd) { bd = d; best = i; }
    }
    // nicht zu nah an einem zwingenden
    let nah = false;
    for (const z of idx) if (Math.abs(s[z] - s[best]) < ges / (m * 2.5)) nah = true;
    if (!nah) idx.add(best);
  }
  const anker = [...idx].sort((a, b) => a - b);
  const punkte = anker.map((i) => neuerPunkt(pfad[i]));
  const L = { id: neueId(), art, punkte, proben: [] };
  // Griffe: Richtung aus dem Pfad, Länge per Schneider je Stück
  const tang = (i) => {
    const a = pfad[zu ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = pfad[zu ? (i + 1) % n : Math.min(n - 1, i + 1)];
    return norm(sub(b, a));
  };
  const T = anker.map((i) => tang(i));
  if (art === 'ring') {
    // Enden auf der Mittelebene: Richtung senkrecht zur Ebene (glatt über die Mitte)
    T[0] = [0, 0, Math.sign(pfad[Math.min(2, n - 1)][2] - pfad[0][2]) || 1];
    T[T.length - 1] = [0, 0, -(Math.sign(pfad[Math.max(0, n - 3)][2] - pfad[n - 1][2]) || 1)];
  }
  if (art === 'mitte') for (const t of T) { t[2] = 0; const l = len(t) || 1; t[0] /= l; t[1] /= l; }
  const stuecke = zu ? anker.length : anker.length - 1;
  for (let k = 0; k < stuecke; k++) {
    const i0 = anker[k], i1 = anker[(k + 1) % anker.length];
    const Q = [];
    if (i1 > i0) for (let i = i0; i <= i1; i++) Q.push(pfad[i]);
    else {
      for (let i = i0; i < n; i++) Q.push(pfad[i]);
      for (let i = 0; i <= i1; i++) Q.push(pfad[i]);
    }
    const t0 = T[k], t3 = mul(T[(k + 1) % anker.length], -1);
    const [a, b] = Q.length > 2 ? schneider(pfad[i0], t0, pfad[i1], t3, Q) : [dist(pfad[i0], pfad[i1]) / 3, dist(pfad[i0], pfad[i1]) / 3];
    punkte[k].aus = mul(t0, a);
    punkte[(k + 1) % punkte.length].ein = mul(t3, b);
  }
  return L;
}

// Glatt halten: an einem glatten Punkt liegen die Griffe gegenüber (Längen bleiben)
export function glaetten(P, fuehrend = 'aus') {
  if (P.ecke) return;
  const f = fuehrend === 'aus' ? P.aus : P.ein;
  const l = len(fuehrend === 'aus' ? P.ein : P.aus);
  const d = norm(f);
  if (fuehrend === 'aus') P.ein = mul(d, -l);
  else P.aus = mul(d, -l);
}

// Ringenden: Griff senkrecht zur Ebene halten, Punkt in der Ebene
export function ringEndenRichten(L) {
  if (L.art !== 'ring') return;
  const a = L.punkte[0], b = L.punkte[L.punkte.length - 1];
  a.p[2] = 0;
  b.p[2] = 0;
  if (!a.ecke) a.aus = [0, 0, Math.sign(a.aus[2]) * len(a.aus) || len(a.aus)];
  if (!b.ecke) b.ein = [0, 0, Math.sign(b.ein[2]) * len(b.ein) || len(b.ein)];
}
export function mitteRichten(L) {
  if (L.art !== 'mitte') return;
  for (const P of L.punkte) {
    P.p[2] = 0;
    P.ein[2] = 0;
    P.aus[2] = 0;
  }
}

// nächste Stelle einer Linie zu einem Punkt (3D), grob über Proben
export function naechsteStelle(L, q, jeStueck = 24) {
  const m = anzahlStuecke(L);
  let best = { d: Infinity, s: 0, t: 0 };
  for (let s = 0; s < m; s++) for (let i = 0; i <= jeStueck; i++) {
    const t = i / jeStueck;
    const d = dist(punktAuf(L, s, t), q);
    if (d < best.d) best = { d, s, t };
  }
  return best;
}

export function linieKopieren(L) {
  return {
    id: L.id,
    art: L.art,
    punkte: L.punkte.map((P) => ({ ...P, p: kopie(P.p), ein: kopie(P.ein), aus: kopie(P.aus) })),
    proben: L.proben.map((q) => ({ ...q, b: q.b.slice() })),
    maul: L.maul || false,
  };
}
