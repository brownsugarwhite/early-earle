// Plan 20.10., V3: Abbildungen von G/S/R in einem Blatt (rein, ohne Store) — Achsensperre, Zahlen, Gewichte des
// proportionalen Bearbeitens, Griffspitzen als eigene Punkte, glatte Knoten auf einer Geraden. Gerechnet wird in den
// Koordinaten des Blatts (Profil-Einheiten: Seite x/y, Front z/y, Top x/z).

import type { Ansicht, V2 } from '@ee/shape';

export type Art = 'g' | 's' | 'r';
export type WeltAchse = 'x' | 'y' | 'z';
/** Sperre: nur diese Achse (X/Y/Z) oder alles außer ihr (⇧X/⇧Y/⇧Z), wie in Blender */
export type Sperre = { achse: WeltAchse; ohne: boolean };
export type Abfall = 'glatt' | 'kugel' | 'wurzel' | 'spitz' | 'linear' | 'konstant';
export const ABFAELLE: readonly Abfall[] = ['glatt', 'kugel', 'wurzel', 'spitz', 'linear', 'konstant'];

/** Welt-Achse je Blattrichtung [waagerecht, senkrecht] (Profil-Koordinaten wie `ANSICHT_ACHSEN`). */
export const BLATT_ACHSEN: Record<Ansicht, [WeltAchse, WeltAchse]> = { seite: ['x', 'y'], front: ['z', 'y'], top: ['x', 'z'] };

export type Frei = { u: boolean; v: boolean };

/**
 * Welche Blattrichtungen eine Sperre frei lässt. null = die gesperrte Achse steht quer zum Blatt (X in der Front, Y im Top,
 * Z in der Seite) — dort kann man nicht entlang ziehen. ⇧ der Blickachse lässt beide Richtungen frei.
 */
export function freiImBlatt(ansicht: Ansicht, sperre: Sperre | null): Frei | null {
  if (!sperre) return { u: true, v: true };
  const [au, av] = BLATT_ACHSEN[ansicht];
  if (sperre.ohne) return { u: au !== sperre.achse, v: av !== sperre.achse };
  if (sperre.achse === au) return { u: true, v: false };
  if (sperre.achse === av) return { u: false, v: true };
  return null;
}

/** Abfall wie Blender mit s = 1 − d/r: glatt 3s² − 2s³, Kugel √(2s − s²), Wurzel √s, spitz s², linear s, konstant 1. */
export function abfallGewicht(art: Abfall, d: number, r: number): number {
  if (!(r > 0) || !(d < r)) return 0;
  const s = 1 - Math.max(0, d) / r;
  switch (art) {
    case 'glatt':
      return 3 * s * s - 2 * s * s * s;
    case 'kugel':
      return Math.sqrt(2 * s - s * s);
    case 'wurzel':
      return Math.sqrt(s);
    case 'spitz':
      return s * s;
    case 'linear':
      return s;
    case 'konstant':
      return 1;
  }
}

/**
 * Abbildung einer Operation: T(x) = c + M(x − c) + t (Zeilen von M: [m0 m1; m2 m3]). G verschiebt um t (M = I), S und R
 * wirken um die Mitte c.
 */
export type Abb = { art: Art; m: readonly [number, number, number, number]; c: V2; t: V2 };

const EINS = [1, 0, 0, 1] as const;

/** Drehung um θ (Bogenmaß, gegen den Uhrzeigersinn); Vielfache von 90° exakt (cos/sin genau 0 bzw. ±1). */
export function drehMatrix(theta: number): [number, number, number, number] {
  const viertel = theta / (Math.PI / 2);
  const k = Math.round(viertel);
  if (Math.abs(viertel - k) < 1e-12) {
    const i = ((k % 4) + 4) % 4;
    const c = [1, 0, -1, 0][i]!;
    const s = [0, 1, 0, -1][i]!;
    return [c, -s, s, c];
  }
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [c, -s, s, c];
}

/** Abbildung aus Art, Mitte, freien Richtungen und dem Wert (G: Versatz, S: Faktor, R: Winkel im Bogenmaß). */
export function abbildungAus(o: { art: Art; c: V2; frei: Frei; versatz?: V2; faktor?: number; winkel?: number }): Abb {
  if (o.art === 'g') {
    const d = o.versatz ?? { x: 0, y: 0 };
    return { art: 'g', m: EINS, c: o.c, t: { x: o.frei.u ? d.x : 0, y: o.frei.v ? d.y : 0 } };
  }
  if (o.art === 's') {
    const f = o.faktor ?? 1;
    return { art: 's', m: [o.frei.u ? f : 1, 0, 0, o.frei.v ? f : 1], c: o.c, t: { x: 0, y: 0 } };
  }
  return { art: 'r', m: drehMatrix(o.winkel ?? 0), c: o.c, t: { x: 0, y: 0 } };
}

/** Punkt mit Gewicht w: x + w·(T(x) − x); w = 1 genau T(x), w = 0 derselbe Punkt. */
export function punktAbbilden(a: Abb, x: V2, w: number): V2 {
  if (w === 0) return x;
  let tx: number;
  let ty: number;
  if (a.art === 'g') {
    tx = x.x + a.t.x;
    ty = x.y + a.t.y;
  } else {
    const dx = x.x - a.c.x;
    const dy = x.y - a.c.y;
    tx = a.c.x + a.m[0] * dx + a.m[1] * dy;
    ty = a.c.y + a.m[2] * dx + a.m[3] * dy;
  }
  if (w === 1) return { x: tx, y: ty };
  return { x: x.x + w * (tx - x.x), y: x.y + w * (ty - x.y) };
}

/** Richtung (Griff) mit Gewicht w: der lineare Teil I + w(M − I); bei G unverändert. */
export function richtungAbbilden(a: Abb, h: V2, w: number): V2 {
  if (w === 0 || a.art === 'g') return h;
  const hx = a.m[0] * h.x + a.m[1] * h.y;
  const hy = a.m[2] * h.x + a.m[3] * h.y;
  if (w === 1) return { x: hx, y: hy };
  return { x: h.x + w * (hx - h.x), y: h.y + w * (hy - h.y) };
}

/**
 * Glatter Knoten: beide Griffe auf einer Geraden durch den Knoten (Richtung aus beiden, Längen bleiben). Liegen sie schon
 * gegenüber auf einer Geraden, bleibt alles, wie es ist (exakt).
 */
export function aufGerade(ein: V2, aus: V2): [V2, V2] {
  const le = Math.hypot(ein.x, ein.y);
  const la = Math.hypot(aus.x, aus.y);
  if (le < 1e-12 || la < 1e-12) return [ein, aus];
  const kreuz = ein.x * aus.y - ein.y * aus.x;
  const skalar = ein.x * aus.x + ein.y * aus.y;
  if (Math.abs(kreuz) <= 1e-12 * le * la && skalar < 0) return [ein, aus];
  const dx = aus.x / la - ein.x / le;
  const dy = aus.y / la - ein.y / le;
  const l = Math.hypot(dx, dy);
  if (l < 1e-12) return [ein, aus];
  return [
    { x: (-dx / l) * le, y: (-dy / l) * le },
    { x: (dx / l) * la, y: (dy / l) * la },
  ];
}

/** Knoten einer Kurve in Blatt-Koordinaten (Profilknoten und P-Linien-Knoten in der Ansicht). */
export type BKnoten = { p: V2; ein: V2; aus: V2; art: 'glatt' | 'ecke' };
/** Gewichte eines Knotens: Punkt und beide Griffspitzen */
export type KnotenGewicht = { p: number; ein: number; aus: number };
const NULL: KnotenGewicht = { p: 0, ein: 0, aus: 0 };

/**
 * Knoten abbilden: Jede Griffspitze ist ein eigener Punkt mit eigenem Gewicht (wie Blender), h' = T(p+h) − T(p); mit
 * gleichem Gewicht wie der Knoten nur der lineare Teil (exakt). Glatte Knoten danach auf eine Gerade. Gewicht 0 überall:
 * derselbe Knoten.
 */
export function knotenAbbilden<K extends BKnoten>(a: Abb, k: K, g: KnotenGewicht): K {
  if (g.p === 0 && g.ein === 0 && g.aus === 0) return k;
  const p = punktAbbilden(a, k.p, g.p);
  const griff = (h: V2, wt: number): V2 => {
    if (wt === g.p) return richtungAbbilden(a, h, wt);
    const spitze = punktAbbilden(a, { x: k.p.x + h.x, y: k.p.y + h.y }, wt);
    return { x: spitze.x - p.x, y: spitze.y - p.y };
  };
  let ein = griff(k.ein, g.ein);
  let aus = griff(k.aus, g.aus);
  if (k.art === 'glatt') [ein, aus] = aufGerade(ein, aus);
  return { ...k, p, ein, aus };
}

/** Eine Kurve für die Gewichte: ihre Knoten, offen oder geschlossen, und welche Knoten gewählt sind. */
export type GKurve = { knoten: readonly BKnoten[]; geschlossen: boolean; gewaehlt: ReadonlySet<number> };
export type Proportional = { an: boolean; abfall: Abfall; radius: number; verbunden: boolean };

const abstand = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);
const spitze = (k: BKnoten, h: 'ein' | 'aus'): V2 => ({ x: k.p.x + k[h].x, y: k.p.y + k[h].y });

/**
 * Gewichte aller Knoten: Gewählte Knoten und ihre Griffspitzen 1. Mit proportional nach dem Abstand zum nächsten gewählten
 * Punkt (Knoten oder Spitze) — Luftlinie über alle Kurven, „nur verbunden“ längs des Kontrollpolygons derselben Kurve
 * (Knoten → Griffspitze → Griffspitze → Knoten; bei offenen Kurven fehlen die äußeren Spitzen, sie nehmen das Gewicht
 * ihres Knotens). Ohne proportional: alle anderen 0.
 */
export function gewichte(kurven: readonly GKurve[], o: Proportional): KnotenGewicht[][] {
  const aus = kurven.map((k) => k.knoten.map((_, i) => (k.gewaehlt.has(i) ? { p: 1, ein: 1, aus: 1 } : NULL)));
  if (!o.an || !(o.radius > 0)) return aus;
  const w = (d: number) => abfallGewicht(o.abfall, d, o.radius);
  if (!o.verbunden) {
    const gewaehlt: V2[] = [];
    for (const k of kurven) for (const i of k.gewaehlt) {
      const kn = k.knoten[i];
      if (kn) gewaehlt.push(kn.p, spitze(kn, 'ein'), spitze(kn, 'aus'));
    }
    if (!gewaehlt.length) return aus;
    const naechster = (q: V2) => gewaehlt.reduce((m, s) => Math.min(m, abstand(q, s)), Infinity);
    return kurven.map((k, ki) =>
      k.knoten.map((kn, i) => (k.gewaehlt.has(i) ? aus[ki]![i]! : { p: w(naechster(kn.p)), ein: w(naechster(spitze(kn, 'ein'))), aus: w(naechster(spitze(kn, 'aus'))) })),
    );
  }
  return kurven.map((k, ki) => {
    if (!k.gewaehlt.size) return aus[ki]!;
    // Kontrollpolygon: je Knoten [ein-Spitze, Knoten, aus-Spitze] mit Bogenlänge; offene Kurven ohne die äußeren Spitzen
    const n = k.knoten.length;
    const pts: { q: V2; knoten: number; teil: 'ein' | 'p' | 'aus' }[] = [];
    for (let i = 0; i < n; i++) {
      const kn = k.knoten[i]!;
      if (k.geschlossen || i > 0) pts.push({ q: spitze(kn, 'ein'), knoten: i, teil: 'ein' });
      pts.push({ q: kn.p, knoten: i, teil: 'p' });
      if (k.geschlossen || i < n - 1) pts.push({ q: spitze(kn, 'aus'), knoten: i, teil: 'aus' });
    }
    // geschlossen: das Polygon beginnt mit der ein-Spitze von Knoten 0 und läuft bis zur aus-Spitze des letzten zurück
    const s: number[] = [0];
    for (let j = 1; j < pts.length; j++) s.push(s[j - 1]! + abstand(pts[j - 1]!.q, pts[j]!.q));
    const L = k.geschlossen ? s[s.length - 1]! + abstand(pts[pts.length - 1]!.q, pts[0]!.q) : Infinity;
    const sel = pts.flatMap((p, j) => (k.gewaehlt.has(p.knoten) ? [s[j]!] : []));
    const dist = (sj: number) =>
      sel.reduce((m, x) => {
        const d = Math.abs(sj - x);
        return Math.min(m, k.geschlossen ? Math.min(d, L - d) : d);
      }, Infinity);
    const g = k.knoten.map((_, i) => (k.gewaehlt.has(i) ? aus[ki]![i]! : { p: 0, ein: 0, aus: 0 }));
    pts.forEach((p, j) => {
      if (k.gewaehlt.has(p.knoten)) return;
      g[p.knoten]![p.teil] = w(dist(s[j]!));
    });
    if (!k.geschlossen && n) {
      if (!k.gewaehlt.has(0)) g[0]!.ein = g[0]!.p;
      if (!k.gewaehlt.has(n - 1)) g[n - 1]!.aus = g[n - 1]!.p;
    }
    return g.map((x) => (x.p === 0 && x.ein === 0 && x.aus === 0 ? NULL : x));
  });
}

/** Kurven mit ihren Gewichten abbilden (Knoten mit Gewicht 0 bleiben dieselben Objekte). */
export function kurvenAbbilden<K extends BKnoten>(a: Abb, kurven: readonly (readonly K[])[], g: readonly (readonly KnotenGewicht[])[]): K[][] {
  return kurven.map((ks, ki) => ks.map((k, i) => knotenAbbilden(a, k, g[ki]?.[i] ?? NULL)));
}

/**
 * Mitte der Auswahl: Mitte des Rahmens um die gewählten Knoten. `achse` = Koordinate der Spiegelachse eines halben
 * Umrisses ('x' für die Front: x = 0; 'y' für das Top: y = 0), wenn ein gewählter Knoten auf ihr liegt — die Auswahl reicht
 * dann über die Spiegelung, ihre Mitte liegt auf der Achse.
 */
export function auswahlMitte(punkte: readonly V2[], achse: 'x' | 'y' | null): V2 {
  if (!punkte.length) return { x: 0, y: 0 };
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of punkte) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const c = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  if (achse === 'x') c.x = 0;
  if (achse === 'y') c.y = 0;
  return c;
}

/** Faktor von S aus dem Zeiger: Abstand zur Mitte jetzt durch Abstand am Anfang. */
export function skalierFaktor(c: V2, start: V2, jetzt: V2): number {
  const d0 = abstand(start, c);
  return d0 < 1e-12 ? 1 : abstand(jetzt, c) / d0;
}

/** Winkelschritt von R zwischen zwei Zeigerlagen um die Mitte, in (−π, π] (fortlaufend aufsummiert über 180° hinaus). */
export function winkelSchritt(c: V2, vorher: V2, jetzt: V2): number {
  const a0 = Math.atan2(vorher.y - c.y, vorher.x - c.x);
  const a1 = Math.atan2(jetzt.y - c.y, jetzt.x - c.x);
  let d = a1 - a0;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Zahleneingabe lesen: Ziffern, Komma oder Punkt, führendes Minus; NaN, solange nichts Lesbares dasteht. */
export function zahlLesen(text: string): number {
  const t = text.replace(',', '.');
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

/**
 * Taste in die Zahleneingabe: Ziffer, Komma/Punkt (einmal), Minus wechselt das Vorzeichen, Rücktaste löscht. Gibt den
 * neuen Text zurück, null = keine Zahlentaste.
 */
export function zahlTaste(text: string, key: string): string | null {
  if (key >= '0' && key <= '9' && key.length === 1) return text + key;
  if (key === ',' || key === '.') return text.includes('.') ? text : `${text}${/\d$/.test(text) ? '' : '0'}.`;
  if (key === '-') return text.startsWith('-') ? text.slice(1) : `-${text}`;
  if (key === 'Backspace') return text.slice(0, -1) === '-' ? '' : text.slice(0, -1);
  return null;
}
