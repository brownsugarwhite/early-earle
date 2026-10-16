// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1c: Kopplung jedes Punkts. Florian: „Wenn jeder Punkt in jeder Ansicht
// sichtbar ist, … kann es keine Widersprüche geben.“ Die bearbeitete Ansicht führt, die anderen folgen am entsprechenden
// Punkt — nicht nur an den Außenmaßen (`abgleichen`), sondern überall, wo ein Umrisspunkt sonst unerreichbar würde.
//
// Ein Umrisspunkt ist erreichbar, wenn ihn die beiden anderen Ansichten zulassen (Sichthülle, `kern/grundkoerper/huelle`):
// - ein Front-Punkt (Breite z bei Höhe y) braucht eine Stelle x, an der die Seite bei y Körper hat und das Top bei x die
//   Breite z enthält; die erlaubten z sind die Projektion des Tops über die Spanne der Seite;
// - ein Top-Punkt (z bei x) ebenso mit der Front über die Höhen, an denen die Seite bei x Körper hat;
// - ein Seitenpunkt (x, y) braucht ein z, das Front (bei y) und Top (bei x) gemeinsam haben.
// Die Höhe teilen Seite und Front, die Länge Seite und Top — das regeln die Außenmaße (`abgleichen`). Die Breite teilen Front
// und Top, verbunden über die Seite; hier wirkt diese Kopplung. Querschnitte dürfen aus mehreren Stücken bestehen (Flügel,
// Beine, Hälse nebeneinander), deshalb wird mit Intervallen gerechnet, nicht mit einer größten Breite.
//
// Eine folgende Ansicht wird dort, wo die führende Ansicht mehr verlangt, an der entsprechenden Stelle angepasst (die Stelle
// ihres Umrisses, die den verlangten Punkt mit der kleinsten Bewegung einschließt), und dort, wo sie selbst mehr verlangt,
// als die anderen zulassen, nach innen gezogen. Bewegt werden nur vorhandene Knoten samt Griffen quer zur Spiegelachse
// (Florian 11.10.: die Kopplung fügt nie Punkte ein), so wenig wie möglich (kleinste Quadrate unter Ungleichungen).
// Widersprüche, die schon am Gestenbeginn bestanden (alte Zeichnungen), bleiben stehen, bis man angleicht.
// DOM-frei.

import type { V2 } from './bezier';
import type { Ansicht } from './dokument';
import { type Intervalle, schnittIntervalle } from './kern/grundkoerper/huelle';
import { type Profile, abgleichen } from './kopplung';
import { type Profil, achsenRegeln, pfadAbtasten, segment, segmentAnzahl, vollerPfad } from './profil';

/** px je Profil-Einheit (Vertrag aller Messungen) */
const PX = 461;
/** Proben je Segment für die Bedingungen */
const PROBEN = 12;
/** kleinste Breite einer folgenden Ansicht abseits der Spitzen (1 px) */
const MINDEST = 1 / PX;

type Breite = 'front' | 'top';

/**
 * Eine Probe der gezeichneten Hälfte: Lage längs (Front: y, Top: x), quer (z ≥ 0), Gewichte der beiden Knoten des Segments
 * und die Richtung nach innen quer zur Achse (−1: der Körper liegt zur Achse hin = äußerer Rand, +1: von der Achse weg =
 * innerer Rand einer Kerbe; 0: Rand läuft quer, die Probe ist eine Kappe).
 */
type Probe = { s: number; laengs: number; quer: number; wa: number; wb: number; innen: -1 | 0 | 1 };

const laengsVon = (b: Breite, p: V2) => (b === 'front' ? p.y : p.x);
const querVon = (b: Breite, p: V2) => (b === 'front' ? p.x : p.y);
/** Längsachse als Schnittrichtung für `schnittIntervalle`: Front längs y (Linie y = wert), Top längs x (Linie x = wert) */
const schnittAchse = (b: Breite): 'x' | 'y' => (b === 'front' ? 'y' : 'x');

/** Umriss einer Ansicht als Polygon (gespiegelt bei Halbansichten), für Schnitte. */
const polygon = (pr: Profil): V2[] => pfadAbtasten(vollerPfad(pr), 16);

function umlaufsinn(poly: readonly V2[]): 1 | -1 {
  let f = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    f += p.x * q.y - q.x * p.y;
  }
  return f >= 0 ? 1 : -1;
}

function proben(pr: Profil, b: Breite, m = PROBEN): Probe[] {
  const out: Probe[] = [];
  const n = segmentAnzahl(pr);
  const sg = umlaufsinn(polygon(pr));
  for (let s = 0; s < n; s++) {
    const [p0, p1, p2, p3] = segment(pr, s);
    for (let i = s === 0 ? 0 : 1; i <= m; i++) {
      const u = i / m;
      const v = 1 - u;
      const c0 = v * v * v;
      const c1 = 3 * v * v * u;
      const c2 = 3 * v * u * u;
      const c3 = u * u * u;
      const p = { x: c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x, y: c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y };
      // Tangente (Ableitung), Innen-Normale wie in `erreichbarkeit`: links vom Umlauf bei positivem Umlaufsinn
      const tx = 3 * (v * v * (p1.x - p0.x) + 2 * v * u * (p2.x - p1.x) + u * u * (p3.x - p2.x));
      const ty = 3 * (v * v * (p1.y - p0.y) + 2 * v * u * (p2.y - p1.y) + u * u * (p3.y - p2.y));
      const l = Math.hypot(tx, ty) || 1;
      const nx = (-ty / l) * sg;
      const ny = (tx / l) * sg;
      const nq = b === 'front' ? nx : ny;
      const q = querVon(b, p);
      // auf der gezeichneten Hälfte (quer ≥ 0); läge die Probe auf der negativen Seite, dreht sich die Richtung
      const r = (q >= 0 ? 1 : -1) * nq;
      out.push({ s, laengs: laengsVon(b, p), quer: Math.abs(q), wa: c0 + c1, wb: c2 + c3, innen: Math.abs(r) < 0.2 ? 0 : r > 0 ? 1 : -1 });
    }
  }
  return out;
}

/** Vereinigung von Intervallmengen (zusammengefasst, sortiert). */
function vereinigen(listen: readonly Intervalle[]): Intervalle {
  const alle = listen.flat().sort((a, b) => a[0] - b[0]);
  const out: Intervalle = [];
  for (const [lo, hi] of alle) {
    const letzt = out[out.length - 1];
    if (letzt && lo <= letzt[1] + 1e-12) letzt[1] = Math.max(letzt[1], hi);
    else out.push([lo, hi]);
  }
  return out;
}

/** Querschnitte einer Ansicht entlang ihrer Längsachse, an allen Polygonecken vorgerechnet (für Projektionen). */
class Querschnitte {
  private readonly l: Float64Array;
  private readonly iv: Intervalle[];
  /** größte Breite je Ecke, wenn der Querschnitt ein Stück durch die Achse ist; sonst NaN (allgemeiner Weg) */
  private readonly einfach: Float64Array;
  constructor(
    readonly poly: V2[],
    private readonly achse: 'x' | 'y',
  ) {
    const ls = [...new Set(poly.map((p) => p[achse]))].sort((a, b) => a - b);
    this.l = Float64Array.from(ls);
    this.iv = ls.map((w) => schnittIntervalle(poly, achse, w));
    this.einfach = Float64Array.from(this.iv, (iv) => (iv.length === 1 && iv[0]![0] <= 1e-12 && iv[0]![1] >= -1e-12 ? Math.max(-iv[0]![0], iv[0]![1]) : Number.NaN));
  }
  /** Querschnitt an einer Längsstelle */
  bei(w: number): Intervalle {
    return schnittIntervalle(this.poly, this.achse, w);
  }
  /** Projektion quer über Längsbereiche: alle Querschnitte darin (Ecken und Ränder) vereinigt */
  projektion(bereiche: Intervalle): Intervalle {
    const listen: Intervalle[] = [];
    let max = -Infinity;
    let allgemein = false;
    for (const [lo, hi] of bereiche) {
      const e = Math.min(1e-9, (hi - lo) / 4);
      listen.push(this.bei(lo + e), this.bei(hi - e));
      let a = 0;
      let z = this.l.length;
      while (a < z) {
        const h = (a + z) >> 1;
        if (this.l[h]! < lo) a = h + 1;
        else z = h;
      }
      for (let i = a; i < this.l.length && this.l[i]! <= hi; i++) {
        const m = this.einfach[i]!;
        if (Number.isNaN(m)) {
          allgemein = true;
          listen.push(this.iv[i]!);
        } else if (m > max) max = m;
      }
    }
    // einfache Querschnitte: ein Stück [−max, max]
    if (max > -Infinity) listen.push([[-max, max]]);
    return allgemein || listen.length > 1 ? vereinigen(listen) : (listen[0] ?? []);
  }
}

/** Bedingung an eine Probe; `gewicht` = Vorrang gegenüber anderen Bedingungen (Standard 1, Mindestbreite höher). */
type Bedingung = { j: number; richtung: 1 | -1; ziel: number; gewicht?: number };

/** Gewicht der Verletzungen gegen die Knotenbewegung: 1 px Verletzung wiegt so viel wie ≈ 30 px Bewegung */
const STRAFE = 1e3 * PX * PX;
/**
 * Vorrang der eigenen Erreichbarkeit einer folgenden Ansicht vor Forderungen der führenden: Lässt sich beides nicht erfüllen
 * (zu wenige Knoten), bleibt die folgende Ansicht stimmig und der Rest als Widerspruch in der führenden sichtbar.
 */
const EIGEN = 100;

/**
 * Kleinste Knotenverschiebungen (quer) unter weichen Ungleichungen: minimiere Σ δ² + STRAFE · Σ g · max(0, Verletzung)²,
 * Verletzung = richtung · (ziel − quer_j − Σ w δ). Erfüllbare Bedingungen werden praktisch genau eingehalten; widersprechen
 * sie sich (eine Ansicht mit zu wenigen Knoten soll an einer Stelle breiter und daneben schmaler werden), bleibt der kleinste
 * Rest — ohne Aufschaukeln. Aktive Menge mit Newton-Schritten (kleines dichtes System je Ansicht).
 */
function loesen(ps: Probe[], beweglich: boolean[], bed: Bedingung[]): Float64Array {
  const n = beweglich.length;
  const delta = new Float64Array(n);
  if (!bed.length) return delta;
  // Zeile je Bedingung: a · δ ≥ c  mit a = richtung · w, c = richtung · (ziel − quer)
  const zeilen = bed.map((b) => {
    const p = ps[b.j]!;
    const a: [number, number][] = [];
    const kb = p.s + 1 < n ? p.s + 1 : 0;
    if (beweglich[p.s] && p.wa > 1e-9) a.push([p.s, b.richtung * p.wa]);
    if (beweglich[kb] && p.wb > 1e-9) a.push([kb, b.richtung * p.wb]);
    return { a, c: b.richtung * (b.ziel - p.quer), g: (b.gewicht ?? 1) * STRAFE };
  });
  let aktiv = '';
  for (let it = 0; it < 30; it++) {
    // verletzte Bedingungen bei δ
    const verletzt = zeilen.filter((z) => z.a.length && z.a.reduce((s, [k, v]) => s + v * delta[k]!, 0) < z.c - 1e-15);
    const schluessel = verletzt.map((z) => zeilen.indexOf(z)).join(',');
    if (it > 0 && schluessel === aktiv) break;
    aktiv = schluessel;
    // (I + Σ g a aᵀ) δ = Σ g c a über die aktive Menge
    const M = new Float64Array(n * n);
    const r = new Float64Array(n);
    for (let k = 0; k < n; k++) M[k * n + k] = 1;
    for (const z of verletzt) {
      for (const [k, v] of z.a) {
        r[k]! += z.g * z.c * v;
        for (const [l, u] of z.a) M[k * n + l]! += z.g * v * u;
      }
    }
    // Cholesky (symmetrisch positiv definit)
    const L = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = M[i * n + j]!;
        for (let k = 0; k < j; k++) sum -= L[i * n + k]! * L[j * n + k]!;
        L[i * n + j] = i === j ? Math.sqrt(Math.max(sum, 1e-30)) : sum / L[j * n + j]!;
      }
    }
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let sum = r[i]!;
      for (let k = 0; k < i; k++) sum -= L[i * n + k]! * y[k]!;
      y[i] = sum / L[i * n + i]!;
    }
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i]!;
      for (let k = i + 1; k < n; k++) sum -= L[k * n + i]! * delta[k]!;
      delta[i] = sum / L[i * n + i]!;
    }
  }
  for (let k = 0; k < n; k++) if (!beweglich[k]) delta[k] = 0;
  return delta;
}

/** Knoten quer verschieben (samt Griffen), Achsregeln danach. */
function verschiebenQuer(pr: Profil, b: Breite, delta: Float64Array): Profil {
  const knoten = pr.knoten.map((kn, k) => {
    const d = delta[k] ?? 0;
    if (!d) return kn;
    const sg = querVon(b, kn.p) < 0 ? -1 : 1;
    return { ...kn, p: b === 'front' ? { x: kn.p.x + sg * d, y: kn.p.y } : { x: kn.p.x, y: kn.p.y + sg * d } };
  });
  return achsenRegeln({ ...pr, knoten });
}

/** Stand der drei Ansichten für Erreichbarkeitsfragen. */
class Huelle3 {
  readonly seite: V2[];
  readonly front: Querschnitte;
  readonly top: Querschnitte;
  constructor(pr: Profile) {
    this.seite = polygon(pr.seite);
    this.front = new Querschnitte(polygon(pr.front), 'y');
    this.top = new Querschnitte(polygon(pr.top), 'x');
  }
  /** Spanne der Seite quer zu einer Längsstelle der Breitenansicht b: Front (Höhe y) → x-Bereiche; Top (x) → y-Bereiche */
  spanne(b: Breite, laengs: number): Intervalle {
    return schnittIntervalle(this.seite, schnittAchse(b), laengs);
  }
  /** erlaubte z für einen Punkt der Breitenansicht b an der Längsstelle: Projektion der anderen über die Spanne der Seite */
  erlaubt(b: Breite, laengs: number): Intervalle {
    const sp = this.spanne(b, laengs);
    if (!sp.length) return [];
    return (b === 'front' ? this.top : this.front).projektion(sp);
  }
}

/** Fehlbetrag eines z gegen eine Intervallmenge (0 = darin). */
function fehlbetrag(erl: Intervalle, z: number): number {
  let best = Infinity;
  for (const [lo, hi] of erl) {
    if (z >= lo && z <= hi) return 0;
    best = Math.min(best, Math.abs(z - lo), Math.abs(z - hi));
  }
  return best;
}

/** Kleinster Abstand zweier Intervallmengen und die beiden nächsten Werte (in F bzw. in T). */
function abstandMengen(f: Intervalle, t: Intervalle): { abstand: number; inF: number; inT: number } {
  let best = { abstand: Infinity, inF: 0, inT: 0 };
  for (const [a, b] of f) {
    for (const [c, d] of t) {
      if (a <= d && c <= b) return { abstand: 0, inF: Math.max(a, c), inT: Math.max(a, c) };
      const r = b < c ? { abstand: c - b, inF: b, inT: c } : { abstand: a - d, inF: a, inT: d };
      if (r.abstand < best.abstand) best = r;
    }
  }
  return best;
}

/** Fehlbeträge je Probe (Front, Top, Seite) am Gestenbeginn: alte Widersprüche bleiben stehen. */
type AlteFehler = Record<'front' | 'top' | 'seite', Float64Array>;

const alteMerker = new WeakMap<Profile, AlteFehler | null>();
/** gemerkt je Basis (eine Geste rechnet bei jedem Zug vom selben Gestenbeginn aus) */
function alteFehler(pr: Profile): AlteFehler | null {
  if (alteMerker.has(pr)) return alteMerker.get(pr)!;
  const f = alteFehlerRechnen(pr);
  alteMerker.set(pr, f);
  return f;
}

function alteFehlerRechnen(pr: Profile): AlteFehler | null {
  if (pr.front.art !== 'halb' || pr.top.art !== 'halb') return null;
  const h = new Huelle3(pr);
  const je = (b: Breite) => Float64Array.from(proben(pr[b], b), (p) => fehlbetrag(h.erlaubt(b, p.laengs), p.quer));
  const seite = Float64Array.from(pfadAbtasten(vollerPfad(pr.seite), PROBEN), (p) => {
    const zf = h.front.bei(p.y);
    const zt = h.top.bei(p.x);
    return zf.length && zt.length ? abstandMengen(zf, zt).abstand : 0;
  });
  return { front: je('front'), top: je('top'), seite };
}

export type PunkteOptionen = {
  /** Toleranz (px): so viel Widerspruch gilt als erfüllt */
  toleranz?: number;
  /** Widersprüche vom Gestenbeginn bestehen lassen (Standard); false = alle auflösen (angleichen) */
  altesBehalten?: boolean;
};

/**
 * Eine folgende Halbansicht `b` anpassen (die andere Breitenansicht und die Seite stehen fest): ihre Proben bleiben bzw.
 * werden erreichbar; führt die andere (`fuehrt`), werden deren unerreichbare Punkte an der nächsten Stelle von b möglich;
 * Seitenpunkte, für die Front und Top kein gemeinsames z haben, ebenso. `alt` = Fehlbeträge vom Gestenbeginn.
 */
function folgen(profile: Profile, b: Breite, fuehrt: boolean, alt: AlteFehler | null, tol: number): Profil {
  const pr = profile[b];
  const ab: Breite = b === 'front' ? 'top' : 'front';
  if (pr.art !== 'halb' || profile[ab].art !== 'halb') return pr;
  const n = pr.knoten.length;
  const beweglich = pr.knoten.map((_, k) => k !== 0 && k !== n - 1);
  // fest während des Folgens: Seite, die andere Breitenansicht, die Längslagen der eigenen Proben (Züge wirken nur quer)
  const seite = polygon(profile.seite);
  const andere = new Querschnitte(polygon(profile[ab]), schnittAchse(ab));
  const ps0 = proben(pr, b);
  const altB = alt && alt[b].length === ps0.length ? alt[b] : null;
  const erlaubtJe = ps0.map((p) => {
    const sp = schnittIntervalle(seite, schnittAchse(b), p.laengs);
    return sp.length ? andere.projektion(sp) : [];
  });
  // fest: Proben der führenden Ansicht und der Seite mit ihren Spannen
  const ap = fuehrt ? proben(profile[ab], ab) : [];
  const apSpanne = ap.map((q) => schnittIntervalle(seite, schnittAchse(ab), q.laengs));
  const altA = alt && alt[ab].length === ap.length ? alt[ab] : null;
  const sp = pfadAbtasten(vollerPfad(profile.seite), PROBEN);
  const altS = alt && alt.seite.length === sp.length ? alt.seite : null;
  const spAndere = sp.map((p) => (b === 'front' ? andere.bei(p.x) : andere.bei(p.y)));
  let aktuell: Profil = pr;
  for (let runde = 0; runde < 4; runde++) {
    const ps = runde === 0 ? ps0 : proben(aktuell, b);
    const bed: Bedingung[] = [];
    let verletzt = false;
    // Ziel für einen verlangten Punkt z: die Probe von b in den Längsbereichen, die z mit der kleinsten Bewegung einschließt
    const einschliessen = (bereiche: Intervalle, z: number) => {
      let best: Bedingung | null = null;
      let kosten = Infinity;
      ps.forEach((p, j) => {
        if (!bereiche.some(([lo, hi]) => p.laengs >= lo && p.laengs <= hi)) return;
        if (p.innen < 0 && p.quer < z && z - p.quer < kosten) {
          kosten = z - p.quer;
          best = { j, richtung: 1, ziel: z };
        } else if (p.innen > 0 && p.quer > z && p.quer - z < kosten) {
          kosten = p.quer - z;
          best = { j, richtung: -1, ziel: Math.max(z, MINDEST) };
        }
      });
      if (best) {
        bed.push(best);
        verletzt = true;
      }
    };
    // Punkte der führenden Ansicht erreichbar machen; Seitenpunkte: Front bei y und Top bei x brauchen ein gemeinsames z
    const eigeneQ = new Querschnitte(polygon(aktuell), schnittAchse(b));
    ap.forEach((q, i) => {
      const spn = apSpanne[i]!;
      if (!spn.length) return;
      const f = fehlbetrag(eigeneQ.projektion(spn), q.quer);
      if (f > tol && !(altA && altA[i]! >= f - tol)) einschliessen(spn, q.quer);
    });
    sp.forEach((p, i) => {
      const zf = b === 'front' ? eigeneQ.bei(p.y) : spAndere[i]!;
      const zt = b === 'top' ? eigeneQ.bei(p.x) : spAndere[i]!;
      if (!zf.length || !zt.length) return;
      const f = abstandMengen(zf, zt);
      if (f.abstand <= tol || (altS && altS[i]! >= f.abstand - tol)) return;
      const l = b === 'front' ? p.y : p.x;
      einschliessen([[l - 2 / PX, l + 2 / PX]], Math.abs(b === 'front' ? f.inT : f.inF));
    });
    // eigene Proben: erreichbar bleiben (im Intervall, in dem sie liegen) bzw. nach innen werden; nie auf die Achse
    ps.forEach((p, j) => {
      bed.push({ j, richtung: 1, ziel: Math.min(p.quer, MINDEST), gewicht: EIGEN });
      const erl = erlaubtJe[j]!;
      if (!erl.length) return;
      const iv = erl.find(([lo, hi]) => p.quer >= lo - tol && p.quer <= hi + tol);
      if (iv) {
        if (p.innen <= 0) bed.push({ j, richtung: -1, ziel: Math.max(iv[1] + tol, Math.min(p.quer, MINDEST)), gewicht: EIGEN });
        if (p.innen >= 0 && iv[0] > MINDEST) bed.push({ j, richtung: 1, ziel: iv[0] - tol, gewicht: EIGEN });
        return;
      }
      const f = fehlbetrag(erl, p.quer);
      if (altB && altB[j]! >= f - tol) {
        // alter Widerspruch: nicht schlimmer werden (nicht weiter nach außen)
        if (p.innen !== 0) bed.push({ j, richtung: p.innen, ziel: p.quer, gewicht: EIGEN });
        return;
      }
      if (p.innen < 0) {
        const unter = erl.filter(([, hi]) => hi <= p.quer).map(([, hi]) => hi);
        if (unter.length) {
          bed.push({ j, richtung: -1, ziel: Math.max(Math.max(...unter), Math.min(p.quer, MINDEST)), gewicht: EIGEN });
          verletzt = true;
        }
      } else if (p.innen > 0) {
        const ueber = erl.filter(([lo]) => lo >= p.quer).map(([lo]) => lo);
        if (ueber.length) {
          bed.push({ j, richtung: 1, ziel: Math.min(...ueber), gewicht: EIGEN });
          verletzt = true;
        }
      }
    });
    // nichts verletzt: die Ansicht bleibt bitgenau
    if (!verletzt) break;
    const delta = loesen(ps, beweglich, bed);
    if (!delta.some((d) => Math.abs(d) > 1e-12)) break;
    aktuell = verschiebenQuer(aktuell, b, delta);
  }
  return aktuell;
}

/**
 * Kopplung jedes Punkts nach einem Zug in `quelle` (S1c): Führt die Front, folgt das Top; führt das Top, folgt die Front;
 * führt die Seite, folgen beide. `basis` = Stand am Gestenbeginn (seine Widersprüche bleiben, außer `altesBehalten: false`).
 */
export function punkteAbgleichen(profile: Profile, quelle: Ansicht, basis: Profile = profile, opt: PunkteOptionen = {}): Profile {
  const tol = (opt.toleranz ?? 0.25) / PX;
  const alt = opt.altesBehalten === false ? null : alteFehler(basis);
  const out: Profile = { ...profile };
  if (quelle === 'front') out.top = folgen(out, 'top', true, alt, tol);
  else if (quelle === 'top') out.front = folgen(out, 'front', true, alt, tol);
  else {
    for (let r = 0; r < 2; r++) {
      const f0 = out.front;
      const t0 = out.top;
      out.front = folgen(out, 'front', false, alt, tol);
      out.top = folgen(out, 'top', false, alt, tol);
      // zweite Runde nur, wenn die Top-Änderung die Front wieder betreffen kann
      if (out.top === t0 || (r === 0 && out.front === f0 && out.top === t0)) break;
    }
  }
  return out;
}

/** Zug in `quelle` gekoppelt: Außenmaße, dann jeder Punkt (Editor: jede Formgeste). */
export function gekoppelt(profile: Profile, quelle: Ansicht, basis: Profile = profile): Profile {
  return punkteAbgleichen(abgleichen(profile, quelle, basis), quelle, basis);
}

/**
 * Angleichen (S1c): Widersprüche einer alten oder fremden Zeichnung auflösen, `fuehrend` bleibt stehen, die anderen folgen
 * (Außenmaße und jeder Punkt).
 */
export function punkteAngleichen(profile: Profile, fuehrend: Ansicht): Profile {
  // Außenmaße aller drei Paare: die führende gibt ihre beiden vor, das dritte Paar die Seite (bzw. bei führender Seite die
  // Front); danach jeder Punkt
  const aussen = abgleichen(abgleichen(profile, fuehrend, profile), fuehrend === 'seite' ? 'front' : 'seite');
  return punkteAbgleichen(aussen, fuehrend, profile, { altesBehalten: false });
}
