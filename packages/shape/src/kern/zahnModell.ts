// Phase 2 / M4 (15.10. nachts): Zahnmodell, aus dem Versuch vom 12.10. (`versuch/zaehne.ts`) herausgelöst. Es hängt an
// keinem Maul: Den Rahmen am Zahnfleisch liefert der Aufrufer (`RahmenQuelle`), im Kern `zahnfleischKern` (`zaehne.ts`),
// im Versuch das Zahnfleisch des alten Maul-Käfigs. Der Versuch nutzt dieselbe Rechnung (seine Tests prüfen sie mit).
//
// - Zahn = gebogener Kegel: Querschnitt Superellipse (Rundheit), Spitze r(h) = r0·(1 − h)^(0,5 + 1,5·Schärfe),
//   Mittellinie ein Kreisbogen (Biegung), Wurzel 15 % der Länge im Zahnfleisch.
// - Lage im Rahmen (t längs des Zahnfleischs, d Beißrichtung, i nach innen): erst Drehung um die eigene Achse, dann
//   Spreizung (um i), dann Neigung (um t). Die Drehung dreht auch die Biegung: ein nach innen gebogener Zahn wird mit 90°
//   ein nach hinten gebogener Fang (Plan 5.3 „Rotation“).
// - Größe (Plan 5.3) ist ein Faktor auf Länge, Breite und Tiefe; mit `auf` wächst ein Zahn beim Öffnen (Riesenzähne).
// - „außen“: Der Zahn setzt am Lippenrand an, um seine halbe Tiefe plus 1,5 px nach außen versetzt, und hängt über
//   der Gegenlippe (Hauer, Rex-Fänge). Seine Wurzel taucht schräg in die eigene Lippe.

type V3 = [number, number, number];

/** Kachel in Bildpunkten in der Grundansicht */
const PX = 461;
/** Wurzel im Zahnfleisch, Anteil der sichtbaren Länge */
export const WURZEL_ANTEIL = 0.15;
/** Luft zwischen außen-Zahn und Gegenlippe am Ansatz (1,5 px; die Prüfung verlangt 1 px) */
export const AUSSEN_LUFT = 1.5 / PX;

export type Kiefer = 'oben' | 'unten';

export type ZahnForm = {
  /** sichtbare Länge vom Zahnfleisch bis zur Spitze (Kachel) */
  laenge: number;
  /** Breite längs des Zahnfleischs (Kachel) */
  breite: number;
  /** Dicke quer zum Zahnfleisch (Kachel) */
  tiefe: number;
  /** Querschnitt: 0 = Klinge (Schneiden vorn/hinten), 1 = rund; Werte bis 2 = kastig (siehe `rundheitExponent`) */
  rundheit: number;
  /** Spitze: 0 = stumpfe Kuppe, ⅓ = gerader Kegel, 1 = Nadel */
  schaerfe: number;
  /** Grad, Kippung um die Zahnfleischtangente; + = Spitze nach innen (zum Rachen) */
  neigung: number;
  /** −1 … 1: Mittellinie als Kreisbogen, ±90° Drehung bis zur Spitze; + = nach innen */
  biegung: number;
  /** Grad, seitliche Kippung längs des Zahnfleischs (um i); + = Spitze zum Mundwinkel (spiegelbildlich) */
  spreizung: number;
  /** Grad, Drehung um die eigene Achse (vor Spreizung und Neigung; dreht Querschnitt und Biegung); + = Vorderseite zum Mundwinkel. Fehlt: 0 */
  drehung?: number;
  /** Faktor auf Länge, Breite und Tiefe. Fehlt: 1 */
  groesse?: number;
  /** außen über der Gegenlippe (Hauer über der Oberlippe, Rex-Fänge vor dem Unterkiefer) */
  aussen: boolean;
};

/** Werte für den offenen Zustand; fehlende Werte gelten wie geschlossen. */
export type ZahnAuf = Partial<Omit<ZahnForm, 'aussen'> & { u: number }>;

export type Zahn = ZahnForm & {
  kiefer: Kiefer;
  /** 0 Mitte … 1 Mundwinkel (feste Stelle auf der Halblippe) */
  u: number;
  /** −1 links, 0 Mittelzahn (u = 0, keine Spreizung, keine Drehung), 1 rechts */
  seite: -1 | 0 | 1;
  auf?: ZahnAuf;
};

export const ZAHN_STANDARD: ZahnForm = {
  laenge: 0.03,
  breite: 0.012,
  tiefe: 0.009,
  rundheit: 1,
  schaerfe: 0.6,
  neigung: 0,
  biegung: 0.15,
  spreizung: 0,
  aussen: false,
};

const zahl = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const plus3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const minus3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mal3 = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const punkt3 = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz3 = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function normiert3(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}

/**
 * Rundheit → Exponent p der Superellipse |x/a|^p + |z/c|^p = 1 (a = halbe Breite, c = halbe Tiefe):
 * 0 → 1,2 (fast Raute: Schneiden vorn/hinten und innen/außen, mit kleiner Tiefe eine Klinge), 1 → 2 (Ellipse, rund),
 * über 1 bis 2 → 4 (abgerundetes Rechteck, kastig wie Schneidezähne). Linear je Abschnitt.
 */
export function rundheitExponent(rundheit: number): number {
  const r = zahl(rundheit, 0, 2);
  return r <= 1 ? 1.2 + 0.8 * r : 2 + 2 * (r - 1);
}

/** Wirksame Werte bei Öffnung α (zu + (auf − zu)·α). Der Mittelzahn bleibt auf u = 0 ohne Spreizung und Drehung. */
export function zahnBei(z: Zahn, alpha: number): Required<ZahnForm> & { u: number } {
  const a = zahl(alpha, 0, 1);
  const mix = (k: keyof ZahnAuf, zu: number): number => {
    const auf = z.auf?.[k];
    return auf === undefined ? zu : zu + (auf - zu) * a;
  };
  return {
    laenge: mix('laenge', z.laenge),
    breite: mix('breite', z.breite),
    tiefe: mix('tiefe', z.tiefe),
    rundheit: mix('rundheit', z.rundheit),
    schaerfe: mix('schaerfe', z.schaerfe),
    neigung: mix('neigung', z.neigung),
    biegung: mix('biegung', z.biegung),
    spreizung: z.seite === 0 ? 0 : mix('spreizung', z.spreizung),
    drehung: z.seite === 0 ? 0 : mix('drehung', z.drehung ?? 0),
    groesse: Math.max(0, mix('groesse', z.groesse ?? 1)),
    aussen: z.aussen,
    u: z.seite === 0 ? 0 : zahl(mix('u', z.u), 0, 1),
  };
}

/**
 * Symmetrische Zahnreihe, von links nach rechts.
 * - ungerade 2k+1: Mittelzahn bei u = 0 (Seite 0), Paare bei u = (i + Phase)·Δ, Δ = uMax/(k + ½)
 * - gerade 2k: Paare bei u = (i − ½ + Phase)·Δ, Δ = uMax/k
 * Ohne Phase ist der Abstand überall Δ, am Ende bleibt Δ/2 bis uMax. Phase (Anteil von Δ, −½ … ½) schiebt die Paare
 * spiegelbildlich nach außen; Standard: oben 0, unten ½, dann stehen bei gleicher Anzahl die unteren Paare in den
 * Lücken der oberen.
 */
export function zahnreihe(anzahl: number, kiefer: Kiefer, form: ZahnForm, uMax = 0.9, phase?: number): Zahn[] {
  const n = Math.max(0, Math.round(anzahl));
  const k = Math.floor(n / 2);
  const ungerade = n % 2 === 1;
  const ph = zahl(phase ?? (kiefer === 'unten' ? 0.5 : 0), -0.5, 0.5);
  const delta = ungerade ? uMax / (k + 0.5) : uMax / Math.max(1, k);
  const rechts: number[] = [];
  for (let i = 1; i <= k; i++) rechts.push(zahl(((ungerade ? i : i - 0.5) + ph) * delta, 0, 1));
  const out: Zahn[] = [];
  for (let i = k - 1; i >= 0; i--) out.push({ ...form, kiefer, u: rechts[i]!, seite: -1 });
  if (ungerade) out.push({ ...form, kiefer, u: 0, seite: 0 });
  for (let i = 0; i < k; i++) out.push({ ...form, kiefer, u: rechts[i]!, seite: 1 });
  return out;
}

// ---------- Rahmen ----------

/**
 * Rahmen am Zahnfleisch: p = Zahnfleischpunkt, rand = Lippenrand; t, d, i orthonormal. t = Tangente des Zahnfleischs
 * (zum Mundwinkel), d = Beißrichtung (zum Zahnfleisch des Gegenkiefers an derselben Stelle), i = nach innen (zum
 * Rachen). Oben rechts und unten links gilt i = t × d, oben links und unten rechts i = −t × d (Spiegelbild; die Dreiecke
 * des Zahns werden dort umgedreht). Für außen-Zähne (`aussen`): p = Lippenrand, d = längs der Haut des Gegenkiefers.
 */
export type ZahnRahmen = { p: V3; t: V3; d: V3; i: V3; rand: V3 };

/** Rahmen je Stelle; `kiefer` (falls gesetzt) muss zum Zahn passen. */
export type RahmenQuelle = ((u: number, seite: -1 | 0 | 1, aussen?: boolean) => ZahnRahmen) & { kiefer?: Kiefer };

// ---------- Zahnform ----------

/** Querschnitt bei Bogenlänge s (ab Zahnfleisch, Wurzel negativ): Mitte, Achsen in Welt, Halbachsen. */
export type ZahnQuer = { m: V3; x: V3; z: V3; a: number; c: number };

export type ZahnModell = {
  quer: (s: number) => ZahnQuer;
  laenge: number;
  wurzelLaenge: number;
  p: number;
  anker: V3;
  rechtshaendig: boolean;
};

export function zahnModell(z: Zahn, fleisch: RahmenQuelle, alpha: number): ZahnModell {
  const f = zahnBei(z, alpha);
  const r = fleisch(f.u, z.seite, f.aussen);
  const L = Math.max(1e-6, f.laenge * f.groesse);
  const a0 = Math.max(1e-7, (f.breite * f.groesse) / 2);
  const c0 = Math.max(1e-7, (f.tiefe * f.groesse) / 2);
  const p = rundheitExponent(f.rundheit);
  const k = 0.5 + 1.5 * zahl(f.schaerfe, 0, 1);
  const beta = (zahl(f.biegung, -1, 1) * Math.PI) / 2;
  let anker = r.p;
  let wurzelLaenge = WURZEL_ANTEIL * L;
  let scherung = 0;
  if (f.aussen) {
    // am Lippenrand, um halbe Tiefe plus Luft nach außen; die Wurzel taucht schräg in die eigene Lippe
    const luft = c0 + AUSSEN_LUFT;
    anker = plus3(r.p, mal3(r.i, -luft));
    wurzelLaenge = Math.max(wurzelLaenge, 2 * luft);
    scherung = 2 * luft;
  }
  const nu = (f.neigung * Math.PI) / 180;
  const sg = (f.spreizung * Math.PI) / 180;
  const dr = (f.drehung * Math.PI) / 180;
  const cn = Math.cos(nu);
  const sn = Math.sin(nu);
  const cs = Math.cos(sg);
  const ss = Math.sin(sg);
  const cd = Math.cos(dr);
  const sd = Math.sin(dr);
  // lokal: x längs t, y längs d (Zahnachse), z längs i; erst Drehung um y, dann Spreizung um z, dann Neigung um x
  const dreh = (x0: number, y: number, z0: number): V3 => {
    const x = x0 * cd + z0 * sd;
    const zz = -x0 * sd + z0 * cd;
    const x1 = x * cs + y * ss;
    const y1 = -x * ss + y * cs;
    return [x1, y1 * cn - zz * sn, y1 * sn + zz * cn];
  };
  const welt = (l: V3): V3 => [
    l[0] * r.t[0] + l[1] * r.d[0] + l[2] * r.i[0],
    l[0] * r.t[1] + l[1] * r.d[1] + l[2] * r.i[1],
    l[0] * r.t[2] + l[1] * r.d[2] + l[2] * r.i[2],
  ];
  const ex = welt(dreh(1, 0, 0));
  const quer = (s: number): ZahnQuer => {
    let cy: number;
    let cz: number;
    let zy = 0;
    let zz = 1;
    let g = 1;
    if (s < 0) {
      cy = s;
      cz = (scherung * -s) / wurzelLaenge;
    } else {
      const h = Math.min(1, s / L);
      if (Math.abs(beta) > 1e-9) {
        const rho = L / beta;
        const w = beta * h;
        cy = rho * Math.sin(w);
        cz = rho * (1 - Math.cos(w));
        zy = -Math.sin(w);
        zz = Math.cos(w);
      } else {
        cy = h * L;
        cz = 0;
      }
      g = Math.pow(1 - h, k);
    }
    return { m: plus3(anker, welt(dreh(0, cy, cz))), x: ex, z: welt(dreh(0, zy, zz)), a: a0 * g, c: c0 * g };
  };
  return { quer, laenge: L, wurzelLaenge, p, anker, rechtshaendig: punkt3(kreuz3(r.t, r.d), r.i) > 0 };
}

export type ZahnGitter = {
  /** Ringe von der Wurzel bis unter die Spitze; Ring 0 = Wurzelboden, Ring 1 = Höhe des Zahnfleischs */
  ringe: V3[][];
  /** Bogenlänge je Ring ab dem Zahnfleisch (Wurzel negativ) */
  s: number[];
  spitze: V3;
  /** Mitte des Wurzelbodens */
  boden: V3;
  /** Ansatz: Zahnfleischpunkt (außen-Zahn: Lippenrand, nach außen versetzt) */
  wurzel: V3;
  /** t × d = i? Sonst Dreiecke umdrehen (links oben, rechts unten) */
  rechtshaendig: boolean;
  /** sichtbare Länge (mit Größe) */
  laenge: number;
};

/** Zahn als Ringgitter (für Netz, Prüfung und Auswahl im Editor). */
export function zahnGitter(z: Zahn, fleisch: RahmenQuelle, alpha = 0, seiten = 8, ringe = 6): ZahnGitter {
  if (fleisch.kiefer !== undefined && fleisch.kiefer !== z.kiefer) throw new Error(`Zahn im Kiefer ${z.kiefer} am Zahnfleisch ${fleisch.kiefer}`);
  const m = zahnModell(z, fleisch, alpha);
  const n = Math.max(3, Math.round(seiten));
  const nr = Math.max(1, Math.round(ringe));
  const e = 2 / m.p;
  const kreis: [number, number][] = [];
  for (let j = 0; j < n; j++) {
    const w = (2 * Math.PI * j) / n;
    const c = Math.cos(w);
    const s = Math.sin(w);
    kreis.push([Math.sign(c) * Math.pow(Math.abs(c), e), Math.sign(s) * Math.pow(Math.abs(s), e)]);
  }
  // sichtbare Ringe zur Spitze hin dichter: h_k = 1 − (1 − k/n)²
  const s = [-m.wurzelLaenge];
  for (let kk = 0; kk < nr; kk++) s.push(m.laenge * (1 - (1 - kk / nr) ** 2));
  const ringListe = s.map((sk) => {
    const q = m.quer(sk);
    return kreis.map(([cx, cz]) => plus3(q.m, plus3(mal3(q.x, q.a * cx), mal3(q.z, q.c * cz))));
  });
  return { ringe: ringListe, s, spitze: m.quer(m.laenge).m, boden: m.quer(-m.wurzelLaenge).m, wurzel: m.anker, rechtshaendig: m.rechtshaendig, laenge: m.laenge };
}

export type ZahnNetz = { positionen: Float32Array; normalen: Float32Array; wurzel: V3; spitze: V3 };

/**
 * Dreiecke (ohne Index) mit glatten Normalen; der Wurzelboden ist flach. `anteil` je Ecke: 0 am Zahnfleisch … 1 an der
 * Spitze (Verlauf im Material; die Wurzel unter dem Zahnfleisch 0).
 */
export function netzAusGitter(g: ZahnGitter): { positionen: Float32Array; normalen: Float32Array; anteil: Float32Array } {
  const R = g.ringe.length;
  const n = g.ringe[0]!.length;
  const pts: V3[] = [...g.ringe.flat(), g.spitze];
  const L = Math.max(1e-12, g.laenge);
  // Anteil je Gitterpunkt: Ringe nach ihrer Bogenlänge (die Spitze 1)
  const anteilPunkt = (v: number) => (v >= R * n ? 1 : Math.max(0, g.s[Math.floor(v / n)]!) / L);
  const ix = (m: number, j: number) => m * n + (j % n);
  const spitze = R * n;
  const tri: [number, number, number][] = [];
  for (let m = 0; m < R - 1; m++) {
    for (let j = 0; j < n; j++) tri.push([ix(m, j), ix(m + 1, j), ix(m + 1, j + 1)], [ix(m, j), ix(m + 1, j + 1), ix(m, j + 1)]);
  }
  for (let j = 0; j < n; j++) tri.push([ix(R - 1, j), spitze, ix(R - 1, j + 1)]);
  if (!g.rechtshaendig) for (const t of tri) [t[1], t[2]] = [t[2], t[1]];
  const nrm: V3[] = pts.map(() => [0, 0, 0]);
  for (const [a, b, c] of tri) {
    const fn = kreuz3(minus3(pts[b]!, pts[a]!), minus3(pts[c]!, pts[a]!));
    for (const v of [a, b, c]) nrm[v] = plus3(nrm[v]!, fn);
  }
  const boden: [V3, V3, V3][] = [];
  for (let j = 0; j < n; j++) {
    const b = g.ringe[0]![j]!;
    const c = g.ringe[0]![(j + 1) % n]!;
    boden.push(g.rechtshaendig ? [g.boden, b, c] : [g.boden, c, b]);
  }
  const bodenN = normiert3(boden.reduce<V3>((acc, [a, b, c]) => plus3(acc, kreuz3(minus3(b, a), minus3(c, a))), [0, 0, 0]));
  const anzahl = (tri.length + boden.length) * 9;
  const positionen = new Float32Array(anzahl);
  const normalen = new Float32Array(anzahl);
  const anteil = new Float32Array(anzahl / 3);
  let o = 0;
  for (const t of tri) {
    for (const v of t) {
      positionen.set(pts[v]!, o);
      normalen.set(normiert3(nrm[v]!), o);
      anteil[o / 3] = Math.min(1, anteilPunkt(v));
      o += 3;
    }
  }
  for (const t of boden) {
    for (const p of t) {
      positionen.set(p, o);
      normalen.set(bodenN, o);
      anteil[o / 3] = 0;
      o += 3;
    }
  }
  return { positionen, normalen, anteil };
}

/** Zahnnetz bei Öffnung α am Zahnfleisch seines Kiefers. */
export function zahnNetz(z: Zahn, fleisch: RahmenQuelle, alpha = 0, seiten = 8, ringe = 6): ZahnNetz {
  const g = zahnGitter(z, fleisch, alpha, seiten, ringe);
  const { positionen, normalen } = netzAusGitter(g);
  return { positionen, normalen, wurzel: g.wurzel, spitze: g.spitze };
}

/** Alle Zähne in einem Netz (ein Zeichenaufruf); `bereiche` = Eckenbereich je Zahn (zum Einfärben und Wählen). */
export function zahnNetze(
  zaehne: readonly Zahn[],
  fleisch: Record<Kiefer, RahmenQuelle>,
  alpha = 0,
  seiten = 8,
  ringe = 6,
): { positionen: Float32Array; normalen: Float32Array; anteil: Float32Array; bereiche: { start: number; anzahl: number }[]; gitter: ZahnGitter[] } {
  const gitter = zaehne.map((z) => zahnGitter(z, fleisch[z.kiefer], alpha, seiten, ringe));
  const teile = gitter.map(netzAusGitter);
  const gesamt = teile.reduce((s, t) => s + t.positionen.length, 0);
  const positionen = new Float32Array(gesamt);
  const normalen = new Float32Array(gesamt);
  const anteil = new Float32Array(gesamt / 3);
  const bereiche: { start: number; anzahl: number }[] = [];
  let o = 0;
  for (const t of teile) {
    positionen.set(t.positionen, o);
    normalen.set(t.normalen, o);
    anteil.set(t.anteil, o / 3);
    bereiche.push({ start: o / 3, anzahl: t.positionen.length / 3 });
    o += t.positionen.length;
  }
  return { positionen, normalen, anteil, bereiche, gitter };
}
