/**
 * Probe „Linien, Punkte, Zeiger“ (14.11.2026): das Netz aus Linien und Punkten in 2D, wie es die Probe zeigt und bewegt.
 *
 * Eine Linie ist ein Bézier-Pfad durch ihre Punkte (wie im Editor). Punkte sind sichtbar (Florians Punkte, auch die Kreuzungen:
 * zwei Linien teilen sich denselben Punkt) oder Stützen (nur für die Form des Pfads, nicht zu sehen, nicht zu greifen). Jedes Stück
 * zwischen zwei Punkten hat eine Art: Umriss (1 px), innen (0,25 px), Kante (1 px, verjüngt auf 0,25 px) oder verdeckt (wie innen,
 * in Grün b9d1b4). Einheit überall: Punkt des Entwurfs (bei 100 % ein Bildpunkt).
 */

export type Art = 'umriss' | 'innen' | 'kante' | 'verdeckt';

export interface Punkt {
  x: number;
  y: number;
  sichtbar: boolean;
  verdeckt: boolean;
  /** im Raum: Tiefe zum Betrachter (die Anzeige entscheidet je Bildpunkt, ob der Punkt verdeckt ist) */
  z?: number;
}

export interface Stueck {
  /** Griff am Anfang, relativ zum Anfangspunkt */
  g1x: number;
  g1y: number;
  /** Griff am Ende, relativ zum Endpunkt */
  g2x: number;
  g2y: number;
  art: Art;
}

export interface Linie {
  zu: boolean;
  /** Punkte der Linie der Reihe nach; bei einer geschlossenen Linie schließt das letzte Stück zum ersten Punkt */
  punkte: number[];
  stuecke: Stueck[];
}

export interface Netz {
  punkte: Punkt[];
  linien: Linie[];
}

export interface FischDaten {
  breite: number;
  hoehe: number;
  punkte: { x: number; y: number; stuetze?: boolean; verdeckt?: boolean }[];
  linien: { zu: boolean; punkte: number[]; stuecke: { g1: [number, number]; g2: [number, number]; art: Art }[] }[];
}

export function netzAusDaten(d: FischDaten): Netz {
  return {
    punkte: d.punkte.map((p) => ({ x: p.x, y: p.y, sichtbar: !p.stuetze, verdeckt: !!p.verdeckt })),
    linien: d.linien.map((l) => ({
      zu: l.zu,
      punkte: l.punkte.slice(),
      stuecke: l.stuecke.map((s) => ({ g1x: s.g1[0], g1y: s.g1[1], g2x: s.g2[0], g2y: s.g2[1], art: s.art })),
    })),
  };
}

export function netzKopie(n: Netz): Netz {
  return {
    punkte: n.punkte.map((p) => ({ ...p })),
    linien: n.linien.map((l) => ({ zu: l.zu, punkte: l.punkte.slice(), stuecke: l.stuecke.map((s) => ({ ...s })) })),
  };
}

/** Anfangs- und Endpunkt des Stücks si der Linie l */
export function stueckEnden(l: Linie, si: number): [number, number] {
  return [l.punkte[si]!, l.punkte[(si + 1) % l.punkte.length]!];
}

/** die vier Kontrollpunkte (absolut) */
export function kontrollpunkte(n: Netz, l: Linie, si: number): [number, number, number, number, number, number, number, number] {
  const [a, b] = stueckEnden(l, si);
  const A = n.punkte[a]!;
  const E = n.punkte[b]!;
  const s = l.stuecke[si]!;
  return [A.x, A.y, A.x + s.g1x, A.y + s.g1y, E.x + s.g2x, E.y + s.g2y, E.x, E.y];
}

export function bezier(k: readonly number[], t: number): [number, number] {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  return [b0 * k[0]! + b1 * k[2]! + b2 * k[4]! + b3 * k[6]!, b0 * k[1]! + b1 * k[3]! + b2 * k[5]! + b3 * k[7]!];
}

// ---------- Abtasten ----------

/** Breite (voll) je Art; die Kante wird längs ihres Laufs verjüngt */
export interface Breiten {
  umriss: number;
  innen: number;
  kanteMax: number;
  kanteMin: number;
}

/**
 * Proben einer Linie, gleichmäßig nach Bogenlänge. Je Probe: Lage, Bogenlänge, Stück und Parameter, Grundbreite (halb), Schicht
 * (0 Tinte, 1 verdeckt).
 */
export interface LinienProben {
  n: number;
  x: Float32Array;
  y: Float32Array;
  s: Float32Array;
  si: Int32Array;
  t: Float32Array;
  halb: Float32Array;
  schicht: Uint8Array;
  laenge: number;
  /** Bogenlänge, an der jedes Stück beginnt (eins mehr als Stücke: das Ende) */
  stueckS: Float32Array;
  /** im Raum: Tiefe zum Betrachter je Probe */
  z?: Float32Array;
}

/** Bogenlänge eines Stücks über eine feine Tabelle; liefert t für gleichmäßige Schritte */
function stueckTabelle(k: readonly number[], fein = 48): { s: Float32Array; laenge: number } {
  const s = new Float32Array(fein + 1);
  let [px, py] = bezier(k, 0);
  for (let i = 1; i <= fein; i++) {
    const [x, y] = bezier(k, i / fein);
    s[i] = s[i - 1]! + Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return { s, laenge: s[fein]! };
}

function tBeiS(tab: Float32Array, ziel: number): number {
  const n = tab.length - 1;
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (tab[m]! < ziel) lo = m;
    else hi = m;
  }
  const a = tab[lo]!;
  const b = tab[hi]!;
  const f = b > a ? (ziel - a) / (b - a) : 0;
  return (lo + f) / n;
}

const glatt = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function linieAbtasten(n: Netz, li: number, schritt: number, br: Breiten): LinienProben {
  const l = n.linien[li]!;
  const m = l.stuecke.length;
  const tabs = [];
  const stueckS = new Float32Array(m + 1);
  for (let si = 0; si < m; si++) {
    const k = kontrollpunkte(n, l, si);
    const tab = stueckTabelle(k);
    tabs.push({ k, tab });
    stueckS[si + 1] = stueckS[si]! + tab.laenge;
  }
  const laenge = stueckS[m]!;
  // Proben je Stück, ohne den doppelten Punkt an der Fuge
  const xs: number[] = [];
  const ys: number[] = [];
  const ss: number[] = [];
  const sis: number[] = [];
  const ts: number[] = [];
  for (let si = 0; si < m; si++) {
    const { k, tab } = tabs[si]!;
    const anzahl = Math.max(1, Math.ceil(tab.laenge / schritt));
    for (let j = si === 0 ? 0 : 1; j <= anzahl; j++) {
      const t = tBeiS(tab.s, (tab.laenge * j) / anzahl);
      const [x, y] = bezier(k, t);
      xs.push(x);
      ys.push(y);
      ss.push(stueckS[si]! + (tab.laenge * j) / anzahl);
      sis.push(si);
      ts.push(t);
    }
  }
  const anzahl = xs.length;
  const halb = new Float32Array(anzahl);
  const schicht = new Uint8Array(anzahl);
  // Läufe von Kanten-Stücken: Breite längs des Laufs
  const kanteLauf = new Float32Array(m * 2).fill(-1);
  for (let si = 0; si < m; si++) {
    if (l.stuecke[si]!.art !== 'kante' || kanteLauf[si * 2]! >= 0) continue;
    let a = si;
    let b = si;
    while (b + 1 < m && l.stuecke[b + 1]!.art === 'kante') b++;
    if (l.zu && a === 0) while (a - 1 + m > b && l.stuecke[(a - 1 + m) % m]!.art === 'kante') a--;
    const s0 = a < 0 ? stueckS[a + m]! - laenge : stueckS[a]!;
    const s1 = stueckS[b + 1]!;
    for (let q = a; q <= b; q++) {
      const qi = (q + m) % m;
      kanteLauf[qi * 2] = s0;
      kanteLauf[qi * 2 + 1] = s1;
    }
  }
  for (let i = 0; i < anzahl; i++) {
    const st = l.stuecke[sis[i]!]!;
    schicht[i] = st.art === 'verdeckt' ? 1 : 0;
    if (st.art === 'umriss') halb[i] = br.umriss / 2;
    else if (st.art === 'kante') {
      let s = ss[i]!;
      const s0 = kanteLauf[sis[i]! * 2]!;
      const s1 = kanteLauf[sis[i]! * 2 + 1]!;
      if (s < s0) s += laenge;
      const L = s1 - s0;
      const T = Math.min(L * 0.5, 48);
      const f = glatt(0, T, s - s0) * glatt(0, T, s1 - s);
      halb[i] = (br.kanteMin + (br.kanteMax - br.kanteMin) * f) / 2;
    } else halb[i] = br.innen / 2;
  }
  // an einer Fuge zweier Arten: die Probe auf der Fuge nimmt die schmalere (der Übergang läuft über das Stück)
  return {
    n: anzahl,
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    s: Float32Array.from(ss),
    si: Int32Array.from(sis),
    t: Float32Array.from(ts),
    halb,
    schicht,
    laenge,
    stueckS,
  };
}

// ---------- Suchen ----------

export interface LinienTreffer {
  li: number;
  /** Probe links der Stelle und Anteil zur nächsten */
  k: number;
  f: number;
  x: number;
  y: number;
  s: number;
  d: number;
  si: number;
  t: number;
  verdeckt: boolean;
}

/** nächste Stelle auf einer Linie (über die Proben) */
export function naechsteStelle(proben: readonly LinienProben[], x: number, y: number, nurSchicht = -1): LinienTreffer | null {
  let best: LinienTreffer | null = null;
  for (let li = 0; li < proben.length; li++) {
    const P = proben[li]!;
    for (let k = 0; k + 1 < P.n; k++) {
      if (nurSchicht >= 0 && P.schicht[k] !== nurSchicht) continue;
      const ax = P.x[k]!;
      const ay = P.y[k]!;
      const bx = P.x[k + 1]!;
      const by = P.y[k + 1]!;
      const vx = bx - ax;
      const vy = by - ay;
      const l2 = vx * vx + vy * vy;
      const f = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / l2)) : 0;
      const qx = ax + vx * f;
      const qy = ay + vy * f;
      const d = Math.hypot(x - qx, y - qy);
      if (!best || d < best.d) {
        const gleich = P.si[k] === P.si[k + 1];
        const si = gleich || f < 0.5 ? P.si[k]! : P.si[k + 1]!;
        const t = gleich ? P.t[k]! + (P.t[k + 1]! - P.t[k]!) * f : f < 0.5 ? P.t[k]! : P.t[k + 1]!;
        best = { li, k, f, x: qx, y: qy, s: P.s[k]! + (P.s[k + 1]! - P.s[k]!) * f, d, si, t, verdeckt: P.schicht[k] === 1 };
      }
    }
  }
  return best;
}

// ---------- Verformen ----------

/**
 * Lauf zwischen zwei sichtbaren Punkten einer Linie, der das Stück si enthält: Stücke von a bis b (b ≥ a, bei geschlossenen Linien
 * über das Ende hinaus gezählt). Ohne sichtbaren Punkt ist es die ganze Linie.
 */
function laufUm(n: Netz, l: Linie, si: number): { a: number; b: number; ganz: boolean } {
  const m = l.stuecke.length;
  const sichtbar = (i: number): boolean => n.punkte[l.punkte[((i % l.punkte.length) + l.punkte.length) % l.punkte.length]!]!.sichtbar;
  if (!l.punkte.some((p) => n.punkte[p]!.sichtbar)) return { a: 0, b: m - 1, ganz: true };
  let a = si;
  while (!sichtbar(a) && (l.zu ? a > si - m : a > 0)) a--;
  let b = si + 1;
  while (!sichtbar(b) && (l.zu ? b < si + 1 + m : b < m)) b++;
  return { a, b: b - 1, ganz: false };
}

const glocke = (x: number): number => {
  const u = 1 - Math.min(1, x * x);
  return u * u;
};

/**
 * Eine Stelle der Linie ziehen (zwischen ihren sichtbaren Punkten): Alle Kontrollpunkte des Laufs gehen mit einem Gewicht, das an der
 * Stelle 1 ist und zu den sichtbaren Punkten hin auf 0 fällt; skaliert so, dass die Stelle genau um (dx, dy) wandert. Die sichtbaren
 * Punkte und ihre Griffe bleiben, wo sie sind.
 */
export function stelleZiehen(start: Netz, ziel: Netz, li: number, si: number, t: number, dx: number, dy: number): void {
  const l0 = start.linien[li]!;
  const l = ziel.linien[li]!;
  const m = l0.stuecke.length;
  const { a, b, ganz } = laufUm(start, l0, si);
  // Bogenlänge über die Kontrollpolygone (genügt für die Gewichte)
  const stuecke: { qi: number; len: number }[] = [];
  for (let q = a; q <= b; q++) {
    const qi = ((q % m) + m) % m;
    const k = kontrollpunkte(start, l0, qi);
    const len = Math.hypot(k[2] - k[0], k[3] - k[1]) + Math.hypot(k[4] - k[2], k[5] - k[3]) + Math.hypot(k[6] - k[4], k[7] - k[5]);
    stuecke.push({ qi, len: Math.max(len, 1e-3) });
  }
  const anf: number[] = [0];
  for (const st of stuecke) anf.push(anf[anf.length - 1]! + st.len);
  const gesamt = anf[anf.length - 1]!;
  const idx = stuecke.findIndex((st) => st.qi === si);
  const s0 = anf[idx]! + stuecke[idx]!.len * t;
  // Gewicht: 1 an der Stelle, 0 an den Enden des Laufs (ganz: 0 gegenüber)
  const w = (s: number): number => {
    if (ganz) {
      let d = Math.abs(s - s0);
      if (l0.zu) d = Math.min(d, gesamt - d);
      return glocke(d / (gesamt * 0.5));
    }
    if (s <= s0) return s0 <= 0 ? 1 : glocke((s0 - s) / s0);
    return gesamt - s0 <= 0 ? 1 : glocke((s - s0) / (gesamt - s0));
  };
  // Wirkung an der Stelle: Σ B_i(t) w_i
  const st = stuecke[idx]!;
  const sA = anf[idx]!;
  const wk = [w(sA), w(sA + st.len / 3), w(sA + (2 * st.len) / 3), w(sA + st.len)];
  const u = 1 - t;
  const wirkung = u * u * u * wk[0]! + 3 * u * u * t * wk[1]! + 3 * u * t * t * wk[2]! + t * t * t * wk[3]!;
  const fx = dx / Math.max(wirkung, 0.35);
  const fy = dy / Math.max(wirkung, 0.35);
  // Punkte (Stützen) im Inneren des Laufs verschieben, Griffe absolut verschieben
  const gesehen = new Set<number>();
  stuecke.forEach((q, j) => {
    const [pa, pb] = stueckEnden(l0, q.qi);
    const sa = anf[j]!;
    const sb = anf[j + 1]!;
    for (const [p, s] of [
      [pa, sa],
      [pb, sb],
    ] as const) {
      if (gesehen.has(p) || start.punkte[p]!.sichtbar) continue;
      gesehen.add(p);
      ziel.punkte[p]!.x = start.punkte[p]!.x + fx * w(s);
      ziel.punkte[p]!.y = start.punkte[p]!.y + fy * w(s);
    }
  });
  // Griffe: absolut gerechnet, relativ gespeichert
  stuecke.forEach((q, j) => {
    const k = kontrollpunkte(start, l0, q.qi);
    const sa = anf[j]!;
    const w1 = w(sa + q.len / 3);
    const w2 = w(sa + (2 * q.len) / 3);
    const [pa, pb] = stueckEnden(l, q.qi);
    const A = ziel.punkte[pa]!;
    const E = ziel.punkte[pb]!;
    const s = l.stuecke[q.qi]!;
    s.g1x = k[2] + fx * w1 - A.x;
    s.g1y = k[3] + fy * w1 - A.y;
    s.g2x = k[4] + fx * w2 - E.x;
    s.g2y = k[5] + fy * w2 - E.y;
  });
}

/**
 * Einen sichtbaren Punkt ziehen: Er wandert um (dx, dy), seine Griffe gehen mit (wie in Illustrator). Stützen zwischen ihm und den
 * nächsten sichtbaren Punkten jeder seiner Linien gehen mit fallendem Gewicht mit, so biegt sich die Linie dazwischen gleichmäßig.
 */
export function punktZiehen(start: Netz, ziel: Netz, pi: number, dx: number, dy: number): void {
  ziel.punkte[pi]!.x = start.punkte[pi]!.x + dx;
  ziel.punkte[pi]!.y = start.punkte[pi]!.y + dy;
  for (const l0 of start.linien) {
    const m = l0.stuecke.length;
    const np = l0.punkte.length;
    l0.punkte.forEach((p, pos) => {
      if (p !== pi) return;
      for (const richtung of [1, -1]) {
        // Kette bis zum nächsten sichtbaren Punkt, mit Bogenlänge über die Kontrollpolygone
        const glieder: { p: number; s: number }[] = [];
        let q = pos;
        let s = 0;
        for (let schritt = 0; schritt < m; schritt++) {
          const si = richtung > 0 ? q : q - 1;
          if (!l0.zu && (si < 0 || si >= m)) break;
          const k = kontrollpunkte(start, l0, ((si % m) + m) % m);
          s += Math.hypot(k[2] - k[0], k[3] - k[1]) + Math.hypot(k[4] - k[2], k[5] - k[3]) + Math.hypot(k[6] - k[4], k[7] - k[5]);
          q += richtung;
          const naechster = l0.punkte[((q % np) + np) % np]!;
          if (naechster === pi || start.punkte[naechster]!.sichtbar) {
            glieder.push({ p: -1, s });
            break;
          }
          glieder.push({ p: naechster, s });
        }
        const gesamt = glieder.length ? glieder[glieder.length - 1]!.s : 1;
        for (const g of glieder) {
          if (g.p < 0) continue;
          const w = 1 - glatt(0, 1, g.s / gesamt);
          ziel.punkte[g.p]!.x = start.punkte[g.p]!.x + dx * w;
          ziel.punkte[g.p]!.y = start.punkte[g.p]!.y + dy * w;
        }
      }
    });
  }
}
