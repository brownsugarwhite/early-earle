// Ozzy-Figur, Etappe C (erster Teil): Schlüsselformen-Raster für Drehungen.
// Körper dreht über ψ mit Florians Schlüsseln 0° (Front), 45° (3/4), 90° (Logo); der Kopf dreht über θ mit 0° (Front-/Logokopf),
// 45° (3/4), 90° (Profil). Jede Form wird über ihre Schlüssel weich und monoton gemischt (PCHIP je Ankerkoordinate, Griffe nach
// Winkel und Länge): an den Schlüsselwinkeln genau Florians Zeichnung. Alles liegt in Körperkoordinaten (x von der Mitte der Bohne,
// y vom Boden). Der Kopf sitzt am Hals (Punkt im Raum, folgt ψ) plus einem Versatz, der mit θ wandert.
// Die Enden der Bohne hängen an den äußeren Beinkanten: Lage und Winkel folgen dem Bein, der Versatz aus den Schlüsseln bleibt.
import { abbilden, abflachen, flaeche as flaecheVon, type Form, kasten, pchip, type Punkt, schwerpunkt, verschieben } from './form';
import type { Fluessig, RenderTeil, Szene, Verdecker } from './renderer';
import { gruppeVon, weissGruppeVon } from './szenen';
import { type AnsichtName, type FigurAnsicht, type FigurDaten, type TeilName, teilVon } from './vorlagen/import';
import { ZWISCHEN } from './vorlagen/zwischen';
import { type Anker, type Gewichte, gewichteAus, HALTUNGEN, Haltungen } from './haltung';

// ---- Interpolation ------------------------------------------------------------------------------------------------------

export { pchip } from './form';

export interface Schluessel {
  w: number;
  form: Form;
}

/** Form zwischen Schlüsseln: Anker per PCHIP, Griffe nach Winkel (stetig abgewickelt) und Länge; glatt bleibt glatt */
export function formAusSchluesseln(keys: readonly Schluessel[], w: number): Form {
  const xs = keys.map((k) => k.w);
  const n = keys[0]!.form.length;
  for (const k of keys) if (k.form.length !== n) throw new Error(`Schlüssel mit ${k.form.length} statt ${n} Ankern`);
  const out: Form = [];
  for (let a = 0; a < n; a++) {
    const px = pchip(xs, keys.map((k) => k.form[a]!.p[0]), w);
    const py = pchip(xs, keys.map((k) => k.form[a]!.p[1]), w);
    const griff = (g: 'i' | 'o'): Punkt => {
      const laengen = keys.map((k) => Math.hypot(k.form[a]![g][0] - k.form[a]!.p[0], k.form[a]![g][1] - k.form[a]!.p[1]));
      if (laengen.every((l) => l < 1e-6)) return [px, py];
      const winkel = keys.map((k, j) => (laengen[j]! < 1e-6 ? NaN : Math.atan2(k.form[a]![g][1] - k.form[a]!.p[1], k.form[a]![g][0] - k.form[a]!.p[0])));
      // fehlende Winkel (Griff der Länge 0) vom nächsten Schlüssel übernehmen
      for (let j = 0; j < winkel.length; j++)
        if (Number.isNaN(winkel[j]!)) {
          let best = NaN;
          for (let d = 1; d < winkel.length && Number.isNaN(best); d++) best = !Number.isNaN(winkel[j - d] ?? NaN) ? winkel[j - d]! : !Number.isNaN(winkel[j + d] ?? NaN) ? winkel[j + d]! : NaN;
          winkel[j] = best;
        }
      let schwenk = 0;
      for (let j = 1; j < winkel.length; j++) {
        while (winkel[j]! - winkel[j - 1]! > Math.PI) winkel[j]! -= 2 * Math.PI;
        while (winkel[j]! - winkel[j - 1]! < -Math.PI) winkel[j]! += 2 * Math.PI;
        schwenk = Math.max(schwenk, Math.abs(winkel[j]! - winkel[j - 1]!));
      }
      // Dreht ein Griff zwischen zwei Schlüsseln weiter als 100° (Fransen, die im Profil auf einer Linie liegen), würde er über den
      // Winkel gemischt einen Kreis schlagen und die Kurve hakt aus: solche Griffe geradlinig mischen (sie werden unterwegs kurz)
      if (schwenk > (100 * Math.PI) / 180) {
        const gx = pchip(xs, keys.map((k) => k.form[a]![g][0] - k.form[a]!.p[0]), w);
        const gy = pchip(xs, keys.map((k) => k.form[a]![g][1] - k.form[a]!.p[1]), w);
        return [px + gx, py + gy];
      }
      const l = Math.max(0, pchip(xs, laengen, w));
      const ang = pchip(xs, winkel, w);
      return [px + Math.cos(ang) * l, py + Math.sin(ang) * l];
    };
    out.push({ p: [px, py], i: griff('i'), o: griff('o') });
  }
  return out;
}

/** Kosinus der kleinsten Umkehr einer Sehne zwischen zwei Schlüsseln, ab der ein Faltschlüssel nötig ist (135°) */
const FALTEN_COS = Math.SQRT1_2;

/**
 * Faltschlüssel: Kehrt ein Stück zwischen zwei Schlüsseln seine Sehne um (zwei Nachbaranker laufen aneinander vorbei, weil sie im
 * späteren Schlüssel in anderer Reihenfolge auf einer Linie liegen), bleibt beim Mischen quer zur Kontur eine Stufe stehen. Dort
 * wird ein verborgener Schlüssel eingesetzt, in dem sich das Stück auf einen Punkt zusammengezogen hat: zum Zeitpunkt der kürzesten
 * gemischten Sehne, alle anderen Anker wie gemischt, die äußeren Griffe der beiden auf eine gemeinsame Tangente gelegt. Davor und
 * danach mischt alles wie sonst; die Anker treffen sich, statt aneinander vorbeizulaufen.
 */
function faltSchluessel(keys: Schluessel[]): void {
  const neu: Schluessel[] = [];
  for (let z = 0; z + 1 < keys.length; z++) {
    const k0 = keys[z]!;
    const k1 = keys[z + 1]!;
    const n = k0.form.length;
    const paare: number[] = [];
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n;
      if (paare.includes((j - 1 + n) % n) || (j1 === 0 && paare.includes(0))) continue;
      const c0: Punkt = [k0.form[j1]!.p[0] - k0.form[j]!.p[0], k0.form[j1]!.p[1] - k0.form[j]!.p[1]];
      const c1: Punkt = [k1.form[j1]!.p[0] - k1.form[j]!.p[0], k1.form[j1]!.p[1] - k1.form[j]!.p[1]];
      const l0 = Math.hypot(c0[0], c0[1]);
      const l1 = Math.hypot(c1[0], c1[1]);
      if (l0 > 1e-6 && l1 > 1e-6 && c0[0] * c1[0] + c0[1] * c1[1] < -FALTEN_COS * l0 * l1) paare.push(j);
    }
    if (!paare.length) continue;
    // kürzeste gemischte Sehne je Paar (fein abgetastet), gemittelt
    const zeiten = paare.map((j) => {
      const j1 = (j + 1) % n;
      let best = (k0.w + k1.w) / 2;
      let bestL = Infinity;
      for (let s = 1; s < 120; s++) {
        const w = k0.w + ((k1.w - k0.w) * s) / 120;
        const f = formAusSchluesseln(keys, w);
        const l = Math.hypot(f[j1]!.p[0] - f[j]!.p[0], f[j1]!.p[1] - f[j]!.p[1]);
        if (l < bestL) {
          bestL = l;
          best = w;
        }
      }
      return best;
    });
    const w = zeiten.reduce((a, b) => a + b, 0) / zeiten.length;
    const f = formAusSchluesseln(keys, w).map((x) => ({ p: [x.p[0], x.p[1]] as Punkt, i: [x.i[0], x.i[1]] as Punkt, o: [x.o[0], x.o[1]] as Punkt }));
    for (const j of paare) {
      const j1 = (j + 1) % n;
      const A = f[j]!;
      const B = f[j1]!;
      const m: Punkt = [(A.p[0] + B.p[0]) / 2, (A.p[1] + B.p[1]) / 2];
      // Richtung hinein und hinaus: Griff, sonst Nachbaranker
      const vor = f[(j - 1 + n) % n]!.p;
      const nach = f[(j1 + 1) % n]!.p;
      const ein: Punkt = Math.hypot(A.i[0] - A.p[0], A.i[1] - A.p[1]) > 1e-6 ? [A.i[0] - A.p[0], A.i[1] - A.p[1]] : [vor[0] - m[0], vor[1] - m[1]];
      const aus: Punkt = Math.hypot(B.o[0] - B.p[0], B.o[1] - B.p[1]) > 1e-6 ? [B.o[0] - B.p[0], B.o[1] - B.p[1]] : [nach[0] - m[0], nach[1] - m[1]];
      const le = Math.hypot(ein[0], ein[1]) || 1;
      const la = Math.hypot(aus[0], aus[1]) || 1;
      let tx = aus[0] / la - ein[0] / le;
      let ty = aus[1] / la - ein[1] / le;
      const lt = Math.hypot(tx, ty) || 1;
      tx /= lt;
      ty /= lt;
      const li = Math.hypot(A.i[0] - A.p[0], A.i[1] - A.p[1]);
      const lo = Math.hypot(B.o[0] - B.p[0], B.o[1] - B.p[1]);
      f[j] = { p: m, i: [m[0] - tx * li, m[1] - ty * li], o: m };
      f[j1] = { p: m, i: m, o: [m[0] + tx * lo, m[1] + ty * lo] };
    }
    neu.push({ w, form: f });
  }
  for (const k of neu) keys.push(k);
  keys.sort((x, y) => x.w - y.w);
}

// ---- Figur ----------------------------------------------------------------------------------------------------------------

export interface Lage {
  /** Körper: 0 vorn, 45 drei Viertel, 90 Seite nach rechts */
  psi: number;
  /** Kopf zur Kamera: 0 vorn, 45, 90 Profil, 180 Rücken, bis 360 (die zweite Hälfte gespiegelt) */
  theta: number;
  /** nur die Teile des Kopfs (Kopfdrehung über 360°) */
  nurKopf?: boolean;
  /** Haltung in der Seite (nur mit ψ = 90) als Kette: 0 Stehen, 1 Sitzen, 2 Liegen */
  haltung?: number;
  /** Haltung in der Seite als Gewichte (geht vor `haltung`) */
  posen?: Gewichte;
  /** Zusatzbewegungen der Abläufe (nur mit Haltung) */
  effekte?: Effekte;
}
/**
 * Zusatzbewegungen der Abläufe (Florian, 19.11.: „witziger und schöner“), über die Haltung gelegt: Sie ändern Florians Formen nicht,
 * sie bewegen sie (bei 0 genau die Haltung).
 */
export interface Effekte {
  /** Hüpfer: Ozzy dreht sich um seine vorderste Pfote am Boden, das Hinterteil hebt ab (rad, positiv = hinten hoch) */
  hub?: number;
  /** Stauchen am Boden: um diesen Anteil flacher und halb so viel breiter (negativ: gestreckt) */
  stauchung?: number;
  /** Kopf federt nach (Figur-Einheiten, positiv = nach unten) */
  kopf?: number;
  /** Schwanz wedelt (rad, positiv = hoch) */
  wedeln?: number;
  /** Ozzy als Ganzes verschoben (Figur-Einheiten, nach vorn positiv): So bleiben die Pfoten oder der Hintern stehen, die in einem
   * Abschnitt eines Ablaufs stehen bleiben sollen */
  versatz?: number;
}
export interface RasterRegeln {
  /** Verdecken auf der abgewandten Kopfseite zwischen den Schlüsseln (0 = aus) */
  verdecken: number;
  /** Durchbruch des Barts durch dünne Ränder zwischen den Schlüsseln (Figur-Einheiten, 0 = aus) */
  durchbruch?: number;
}

/** Rand der Fenster in ihrem Bein während eines Haltungswechsels (Figur-Einheiten) */
const FENSTER_RAND_WECHSEL = 0;
const KOERPER: TeilName[] = ['bohne', 'beinRV', 'beinRH', 'beinLV', 'beinLH', 'keilV', 'keilH', 'fensterRV', 'fensterRH', 'fensterLV', 'schwanz', 'schwanzW'];
const KOPF: TeilName[] = ['ohrB', 'ohrSpalt', 'ohrA', 'kopfB', 'kopfA', 'bartA', 'bartB', 'nase'];
const BEINE: TeilName[] = ['beinRV', 'beinRH', 'beinLV', 'beinLH'];
const KLEMME_AUSSEN = 6.5;
/** Klemme eines verdeckten Fensters: so tief im Gips, dass der schmale Streifen ganz darunter liegt */
const VERDECKT_RAND = 14;
/** Größe des Schwanzweiß: wird kleiner, wenn der Schwanz hinter Bohne und Kopf verschwindet (Florian 18.11.: nicht abschneiden) */
const SCHWANZ_WEISS: { w: number; groesse: number }[] = [{ w: 0, groesse: 0 }, { w: 22, groesse: 0 }, { w: 42, groesse: 1 }, { w: 90, groesse: 1 }];

/** Körperkoordinaten einer Ansicht: x von der Mitte der Bohne, y vom Boden (Unterkante der Beine) */
export function koerperUrsprung(a: FigurAnsicht): Punkt {
  const k = kasten(teilVon(a, 'bohne')!.form);
  return [(k[0] + k[2]) / 2, a.boden];
}
const inKoerper = (a: FigurAnsicht, f: Form): Form => {
  const u = koerperUrsprung(a);
  return verschieben(f, -u[0], -u[1]);
};
const kopfMitte = (formen: Form[]): Punkt => schwerpunkt(formen.flat());
const winkelVon = (v: Punkt): number => Math.atan2(v[1], v[0]);
const einheit = (v: Punkt): Punkt => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
const stauchen = (f: Form, fx: number, ax: number): Form => abbilden(f, (q) => [ax + (q[0] - ax) * fx, q[1]]);

/** Kopf über den ganzen Kreis (Florian, 19.11.: „die 360 grad drehung vom kopf in 2d fertig machen“): Spiegelpartner je Kopfteil */
const PARTNER_KOPF: Record<string, TeilName> = { kopfA: 'kopfB', kopfB: 'kopfA', bartA: 'bartB', bartB: 'bartA', ohrA: 'ohrB', ohrB: 'ohrA', nase: 'nase', ohrSpalt: 'ohrSpalt' };
/**
 * Rücken: Florian hat ihn aus der gespiegelten Front gebaut. Wie eingelesen läuft er gleichsinnig mit dem Profil: Der Hinterkopf des Profils
 * wird die Mitte des Rückens, das Gesicht dessen rechter Rand (so dreht sich ein Kopf). Nach der Front umnummeriert (Anker j an der Stelle
 * des gespiegelten Front-Ankers j) liefen die Anker auf dem Weg vom Profil quer durch den Kopf aneinander vorbei: Der Kopf fiel bei 135° zu
 * einem Streifen zusammen. Hier nur Teile, deren Reihenfolge für die Drehung angepasst werden muss (Index des Rückens für Anker j)
 */
const RUECKEN_ANKER: Partial<Record<TeilName, (j: number, n: number) => number>> = {
  // Ohren (Florian, 19.11. abends: „die ohren sollen nicht drehen. sie sind sillhouetten. es reicht wenn sie etwas schmaler und wieder
  // breiter werden“): siehe RUECKEN_OHR
  ohrA: (j, n) => n - 1 - j,
  ohrB: (j, n) => n - 1 - j,
};
/**
 * Ohren als Silhouetten: Das Ohr links im Profil (das nahe) bleibt links und wird das linke Ohr des Rückens, das mittlere (das ferne)
 * wandert nach rechts und wird das rechte; jedes behält seine Lehne und ändert nur Breite und Lage (in Florians Skizze bei 36 % steht links
 * das große Ohr, rechts das aufrechte). Dafür tauschen die Ohren im Rücken die Rollen und laufen andersherum (RUECKEN_ANKER), so passen
 * ihre Anker zu denen im Profil (Spitze zu Spitze, Ansatz zu Ansatz). Das Bild des Rückens bleibt dasselbe
 */
const RUECKEN_OHR: Partial<Record<TeilName, TeilName>> = { ohrA: 'ohrB', ohrB: 'ohrA' };
/**
 * Gesicht beim Wegdrehen (Florian, 19.11. abends, mit Skizzen bei 6 %, 36 % und 42 % der Drehung): Das Weiß läuft über die schwarze
 * Outline und verschwindet am Rand; Bart (nah und fern) mit seinen Haaren wie im Profil, nur schmaler (`wegGedreht`), in voller Höhe
 */
const GESICHT_WEG = [100, 110, 120, 130, 140, 146, 152, 156, 162, 170, 180];
/**
 * bei diesem Winkel ist das Gesicht ganz weggedreht (bis 19.11. 162°; Florians Skizze bei 40 % = 144° zeigt schon den ganzen Rücken, so früh
 * wurde die Drehung unruhig)
 */
const GESICHT_WEG_BIS = 156;
/**
 * Hinterkopf: Die Anker der nahen Maske, die im Profil am Hinterkopf liegen (links der Mitte ihres Kastens, ohne die Schnauze), gehen
 * gleichmäßig beschleunigt zum Rücken (Anteil des Wegs = Anteil der Drehung hoch HINTERKOPF_ZOEGERN). So bleibt der Kopf unter dem linken
 * Ohr, bis die ferne Maske dort steht (sonst schwebt das Ohr über einer Kerbe)
 */
const HINTERKOPF_ZOEGERN = 2;
/**
 * Ohren (Florian, 19.11.: „die ohren sollten auch etwas weiter zusammen sein von der seite, dass der drehungseffekt besser wirkt“): Das
 * mittlere Ohr liegt von der Seite (bis 125°) auf einem gleichmäßig beschleunigten Weg zu seinem Platz im Rücken (Anteil des Wegs = Anteil
 * der Drehung hoch OHR_ZOEGERN) und holt danach weich auf
 */
const OHR_ZOEGERN = 1.6;
/** die nahe Maske übernimmt bis zum ersten Winkel unter dem Weiß Stirnfranse und Kiefer der Schnauze, geht bis zum letzten mit dem Gesicht und rundet danach zum Rücken */
const WICKEL = [96, 100, 110, 120, 130, 140];
/** Nase: in voller Größe im Profil, dann schmaler und kleiner am Rand (Breite, Höhe), verschwindet bei NASE_WEG und liegt danach hinter dem Weiß */
const NASE_FORM: { w: number; breite: number; hoehe: number }[] = [
  { w: 100, breite: 0.85, hoehe: 0.97 },
  { w: 115, breite: 0.6, hoehe: 0.85 },
  { w: 130, breite: 0.4, hoehe: 0.65 },
];
const NASE_WEG = 140;
const SPALT_WEG = 140;
/** ferne Maske: bleibt bis zum ersten Wickelwinkel an der Schnauze, taucht dann im Kopf unter, liegt zusammengeschoben links, ganz da */
const MASKE_UNTER = 104;
const MASKE_LINKS = 112;
const MASKE_DA = 140;

/** so weit außerhalb des rechten Kopfrands (im Rücken) liegt das ganz weggedrehte Gesicht (dort ist es nicht zu sehen) */
const GESICHT_AUSSEN = 6;
/** so weit innerhalb des rechten Kopfrands lagen Bart und Nase im Anschluss der ersten Hälfte (`anschlussBauen`) */
const RUECKEN_GESICHT_RAND = 6;
/** Nase gespiegelt: Anker j liegt dann dort, wo Anker NASE_SPIEGEL[j] lag (oben links ↔ oben rechts, links ↔ rechts, unten) */
const NASE_SPIEGEL = [1, 0, 5, 4, 3, 2];

/** Form umnummeriert: neu[j] = alt[b(j)]; läuft sie dabei andersherum, tauschen die Griffe */
function umnummerieren(f: Form, b: (j: number, n: number) => number, andersherum: boolean): Form {
  const n = f.length;
  return f.map((_, j) => {
    const a = f[b(j, n)]!;
    return andersherum ? { p: [a.p[0], a.p[1]], i: [a.o[0], a.o[1]], o: [a.i[0], a.i[1]] } : { p: [a.p[0], a.p[1]], i: [a.i[0], a.i[1]], o: [a.o[0], a.o[1]] };
  });
}

/** Kopfform gespiegelt (Kopfkoordinaten: Mitte bei x = 0); die Nase so umnummeriert, dass ihre Anker an denselben Stellen liegen */
function kopfGespiegelt(name: TeilName, f: Form): Form {
  const m = abbilden(f, (q) => [-q[0], q[1]]);
  return name === 'nase' ? umnummerieren(m, (j) => NASE_SPIEGEL[j]!, true) : m;
}

/** Teil verschwindet: alle Anker und Griffe auf einem Punkt (keine Fläche, auch keine Linie) */
function punktForm(f: Form, p: Punkt): Form {
  return f.map(() => ({ p: [p[0], p[1]], i: [p[0], p[1]], o: [p[0], p[1]] }));
}

/**
 * Gesicht beim Wegdrehen (90° → 180°): Es wird schmaler wie bei einer Drehung (die Barthaare werden kürzer, statt zu einem Punkt gezogen
 * zu werden), schneller als mit dem Kosinus (ganz weg bei GESICHT_WEG_BIS), in voller Höhe. Die Vorderkante der Schnauze (x0) bleibt der
 * rechte Rand des Kopfs und rückt bis x1; ganz weggedreht liegt das Gesicht bei xAus, außerhalb des Rückens auf beiden Seiten (er ist links
 * breiter als rechts; die zweite Hälfte ist gespiegelt).
 */
export function wegBreite(w: number): number {
  const phi = (Math.max(0, w - 90) * 90) / (GESICHT_WEG_BIS - 90);
  return phi >= 90 ? 0 : Math.cos((phi * Math.PI) / 180);
}
function wegGedreht(f: Form, w: number, x0: number, x1: number, xAus = x1): Form {
  const s = wegBreite(w);
  // als schmaler Streifen gleitet es über den Rand hinaus (sein sichtbarer Teil wird gleichmäßig weniger, keine Linie bleibt stehen)
  const g = s < 0.3 ? (1 - s / 0.3) ** 2 : 0;
  const x = x0 + (x1 - x0) * Math.sin((Math.min(90, Math.max(0, w - 90)) * Math.PI) / 180) + (xAus - x1) * g;
  return abbilden(f, (q) => [x + (q[0] - x0) * s, q[1]]);
}

/** Punkte einer Form, abgeflacht */
function punkteVon(f: Form, fein = 3): Punkt[] {
  const a = abflachen(f, (q) => q, fein);
  const out: Punkt[] = [];
  for (let k = 0; k + 1 < a.length; k += 2) out.push([a[k]!, a[k + 1]!]);
  return out;
}

/** Schnittpunkte einer abgeflachten Form mit einer Zeile (y fest) oder Spalte (x fest) */
function schnitte(ps: Punkt[], wert: number, achse: 0 | 1): number[] {
  const o: 0 | 1 = achse === 0 ? 1 : 0;
  const out: number[] = [];
  for (let k = 0; k < ps.length; k++) {
    const a = ps[k]!;
    const b = ps[(k + 1) % ps.length]!;
    if ((a[achse] - wert) * (b[achse] - wert) > 0 || a[achse] === b[achse]) continue;
    out.push(a[o] + ((wert - a[achse]) / (b[achse] - a[achse])) * (b[o] - a[o]));
  }
  return out;
}

/** Kubische Kurve durch einen Linienzug (Enden fest, kleinste Quadrate nach Bogenlänge): Anfang, zwei Griffe, Ende */
function kurveDurch(ziel: Punkt[]): [Punkt, Punkt, Punkt, Punkt] {
  const n = ziel.length - 1;
  const p0 = ziel[0]!;
  const p3 = ziel[n]!;
  const ts = [0];
  for (let i = 1; i <= n; i++) ts.push(ts[i - 1]! + Math.hypot(ziel[i]![0] - ziel[i - 1]![0], ziel[i]![1] - ziel[i - 1]![1]));
  let a11 = 0, a12 = 0, a22 = 0;
  const r1: Punkt = [0, 0];
  const r2: Punkt = [0, 0];
  for (let i = 0; i <= n; i++) {
    const t = ts[i]! / (ts[n]! || 1);
    const u = 1 - t;
    const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
    const q: Punkt = [ziel[i]![0] - b0 * p0[0] - b3 * p3[0], ziel[i]![1] - b0 * p0[1] - b3 * p3[1]];
    a11 += b1 * b1;
    a12 += b1 * b2;
    a22 += b2 * b2;
    r1[0] += b1 * q[0];
    r1[1] += b1 * q[1];
    r2[0] += b2 * q[0];
    r2[1] += b2 * q[1];
  }
  const det = a11 * a22 - a12 * a12 || 1;
  return [p0, [(a22 * r1[0] - a12 * r2[0]) / det, (a22 * r1[1] - a12 * r2[1]) / det], [(a11 * r2[0] - a12 * r1[0]) / det, (a11 * r2[1] - a12 * r1[1]) / det], p3];
}

export class FigurRaster {
  private readonly koerper = new Map<TeilName, Schluessel[]>();
  private readonly kopf = new Map<TeilName, Schluessel[]>();
  /** Kopf von 0° bis 90° (und gespiegelt von 270° bis 360°) mit dem Anschluss, mit dem Florian die erste Hälfte gesehen hat (`anschlussBauen`) */
  private readonly kopfVorn = new Map<TeilName, Schluessel[]>();
  /** Rücken je Teil, wie eingelesen (ohne Tausch und Umnummerierung der Ohren; für den Anschluss der ersten Hälfte) */
  private readonly rueckenWieEingelesen = new Map<TeilName, Form>();
  /** Kopfteile, die in Florians Rücken nicht vorkommen (sie liegen dort verborgen) */
  private readonly ohneRuecken = new Set<TeilName>();
  private readonly hals: { X: number; Z: number; y0: number; y90: number };
  private readonly kopfVersatz: { w: number; x: number; y: number }[];
  private readonly klemme = new Map<TeilName, { w: number; rand: number }[]>();
  private readonly bohnenEnde: { links: { w: number; off: Punkt; dw: number }[]; rechts: { w: number; off: Punkt; dw: number }[] };
  private readonly ansichten: Record<AnsichtName, FigurAnsicht>;
  /** Haltungen in der Seite (Etappe D1) */
  private haltungen: Haltungen | null = null;

  constructor(d: FigurDaten) {
    const { front, viertel, logo, profil } = d.ansichten;
    this.ansichten = d.ansichten;
    const k = (a: FigurAnsicht, n: TeilName): Form => inKoerper(a, teilVon(a, n)!.form);
    const hat = (a: FigurAnsicht, n: TeilName): boolean => !!teilVon(a, n);
    // Körper: Schlüssel 0/45/90, fehlende (verdeckte) Schlüssel gebaut
    const mitteVon = (f: Form): Punkt => schwerpunkt(f);
    for (const n of KOERPER) {
      const keys: Schluessel[] = [];
      for (const [w, a] of [[0, front], [45, viertel], [90, logo]] as [number, FigurAnsicht][]) if (hat(a, n)) keys.push({ w, form: k(a, n) });
      this.koerper.set(n, keys);
    }
    const keyBei = (n: TeilName, w: number): Form | undefined => this.koerper.get(n)!.find((s) => s.w === w)?.form;
    // Fenster rechts hinten: vorn verdeckt, als schmaler Streifen an der linken Gipskante (die 3/4-Ansicht zeigt es schon schmaler);
    // die Klemme legt dort den Gipsrand darüber
    {
      const f45 = keyBei('fensterRH', 45)!;
      const b45 = mitteVon(keyBei('beinRH', 45)!);
      const bein0 = keyBei('beinRH', 0)!;
      const b0 = mitteVon(bein0);
      const g = verschieben(f45, b0[0] - b45[0], b0[1] - b45[1]);
      const ax = kasten(bein0)[0] + 3;
      this.koerper.get('fensterRH')!.unshift({ w: 0, form: verschieben(stauchen(g, 0.15, kasten(g)[0]), ax - kasten(g)[0], 0) });
    }
    // Fenster links vorn: in der Seite verdeckt, als schmaler Streifen an der rechten Gipskante
    {
      const f45 = keyBei('fensterLV', 45)!;
      const b45 = mitteVon(keyBei('beinLV', 45)!);
      const bein90 = keyBei('beinLV', 90)!;
      const b90 = mitteVon(bein90);
      const g = verschieben(f45, b90[0] - b45[0], b90[1] - b45[1]);
      const ax = kasten(bein90)[2] - 3;
      this.koerper.get('fensterLV')!.push({ w: 90, form: verschieben(stauchen(g, 0.15, kasten(g)[2]), ax - kasten(g)[2], 0) });
    }
    // Schwanz: vorn hinter der Bohne in der Mitte
    for (const n of ['schwanz', 'schwanzW'] as TeilName[]) {
      const f45 = keyBei(n, 45)!;
      const s45 = mitteVon(keyBei('schwanz', 45)!);
      this.koerper.get(n)!.unshift({ w: 0, form: verschieben(f45, -s45[0], 0) });
    }
    // hinterer Keil: vorn und in 3/4 klein im rechten Hinterbein verborgen (schwarz in Schwarz), in der Seite unter den Hinterbeinen
    {
      const f90 = keyBei('keilH', 90)!;
      const c90 = mitteVon(f90);
      const klein = abbilden(f90, (q) => [c90[0] + (q[0] - c90[0]) * 0.3, c90[1] + (q[1] - c90[1]) * 0.3]);
      const keys = [0, 45].map((w) => {
        const m = mitteVon(keyBei('beinRH', w)!);
        return { w, form: verschieben(klein, m[0] - c90[0], m[1] - c90[1]) };
      });
      this.koerper.get('keilH')!.unshift(...keys);
    }
    // Klemme der Fenster: wie gezeichnet ungeklemmt, verdeckt auf dem Gipsrand
    this.klemme.set('fensterRH', [{ w: 0, rand: VERDECKT_RAND }, { w: 45, rand: -KLEMME_AUSSEN }, { w: 90, rand: -KLEMME_AUSSEN }]);
    this.klemme.set('fensterLV', [{ w: 0, rand: -KLEMME_AUSSEN }, { w: 45, rand: -KLEMME_AUSSEN }, { w: 90, rand: VERDECKT_RAND }]);
    // Kopf: Formen um die Mitte der Kopfmasken; Hals als Punkt im Raum, Versatz je θ. Schlüssel 0° (Logo), 45° (3/4), 90° (Profil) und
    // 180° (Rücken, umnummeriert); die zweite Hälfte (180°–360°) ist die erste gespiegelt, A und B getauscht, mit Florians Front bei 360°
    const back = d.ansichten.back;
    for (const n of KOPF) if (!hat(back, n)) this.ohneRuecken.add(n);
    const kopfKeys: [number, FigurAnsicht][] = [[0, logo], [45, viertel], [90, profil], [180, back]];
    const mitten = new Map<number, Punkt>();
    for (const [w, a] of kopfKeys) mitten.set(w, kopfMitte([k(a, 'kopfA'), k(a, 'kopfB')]));
    for (const n of KOPF) {
      const keys: Schluessel[] = [];
      for (const [w, a] of kopfKeys) {
        if (!hat(a, n)) continue;
        const quelle = w === 180 ? (RUECKEN_OHR[n] ?? n) : n;
        let f = verschieben(k(a, quelle), -mitten.get(w)![0], -mitten.get(w)![1]);
        if (w === 180) this.rueckenWieEingelesen.set(n, verschieben(k(a, n), -mitten.get(w)![0], -mitten.get(w)![1]));
        const b = RUECKEN_ANKER[n];
        if (w === 180 && b) f = umnummerieren(f, b, true);
        keys.push({ w, form: f });
      }
      this.kopf.set(n, keys);
    }
    // Zwischenschlüssel aus Florians Übermalungen (Kopfkoordinaten), nach Winkel einsortiert
    for (const z of ZWISCHEN) {
      const keys = this.kopf.get(z.teil);
      if (!keys || keys.some((k) => k.w === z.w)) continue;
      keys.push({ w: z.w, form: z.form });
      keys.sort((x, y) => x.w - y.w);
    }
    // Ohrspalt vorn: unter dem nahen Ohr verborgen (es wird danach gezeichnet)
    {
      const keil45 = this.kopf.get('ohrSpalt')!.find((s) => s.w === 45)!.form;
      const o45 = schwerpunkt(this.kopf.get('ohrA')!.find((s) => s.w === 45)!.form);
      const o0 = schwerpunkt(this.kopf.get('ohrA')!.find((s) => s.w === 0)!.form);
      this.kopf.get('ohrSpalt')!.unshift({ w: 0, form: verschieben(keil45, o0[0] - o45[0], o0[1] - o45[1]) });
    }
    const anschluss = this.anschlussBauen();
    this.rueckseiteBauen();
    // erste Hälfte (0°–90°) mit ihrem eigenen Anschluss im Profil, gespiegelt für die zweite (270°–360°)
    {
      const vorn = new Map<TeilName, Schluessel[]>();
      for (const [n, keys] of this.kopf) vorn.set(n, [...keys.filter((x) => x.w <= 90), anschluss.get(n) ?? keys.find((x) => x.w > 90)!]);
      for (const [n, keys] of vorn) {
        const liste = keys.slice();
        for (const x of vorn.get(PARTNER_KOPF[n]!)!) if (x.w > 0) liste.push({ w: 360 - x.w, form: kopfGespiegelt(n, x.form) });
        liste.push({ w: 360, form: n === 'ohrSpalt' ? kopfGespiegelt(n, keys[0]!.form) : keys[0]!.form });
        liste.sort((x, y) => x.w - y.w);
        faltSchluessel(liste);
        this.kopfVorn.set(n, liste);
      }
    }
    for (const keys of this.kopf.values()) faltSchluessel(keys);
    const cFront = kopfMitte([k(front, 'kopfA'), k(front, 'kopfB')]);
    const cLogo = mitten.get(0)!;
    this.hals = { X: cFront[0], Z: cLogo[0], y0: cFront[1], y90: cLogo[1] };
    const hals45 = this.halsBei(45);
    // Rücken: der Kopf sitzt wie vorn auf dem Hals (in der Höhe, wie Florian ihn im Rücken gegen die Front zeichnet)
    const yRueckenFront = mitten.get(180)![1] - cFront[1];
    this.kopfVersatz = [
      { w: 0, x: 0, y: 0 },
      { w: 45, x: mitten.get(45)![0] - hals45[0], y: mitten.get(45)![1] - hals45[1] },
      { w: 90, x: mitten.get(90)![0] - cLogo[0], y: mitten.get(90)![1] - cLogo[1] },
      { w: 180, x: 0, y: yRueckenFront },
    ];
    this.spitzenFinden();
    // Bohnenenden: Versatz von Anker 1 und 5 zur äußeren Beinkante je Schlüssel, dazu der Winkelunterschied
    const links: { w: number; off: Punkt; dw: number }[] = [];
    const rechts: { w: number; off: Punkt; dw: number }[] = [];
    for (const w of [0, 45, 90]) {
      const bohne = keyBei('bohne', w)!;
      const beine = BEINE.map((n) => keyBei(n, w)!);
      const l = FigurRaster.kanteLinks(beine);
      const r = FigurRaster.kanteRechts(beine);
      const a1 = bohne[1]!;
      const a5 = bohne[5]!;
      links.push({ w, off: [a1.p[0] - l.p[0], a1.p[1] - l.p[1]], dw: FigurRaster.ankunft(a1) - winkelVon(l.richtung) });
      rechts.push({ w, off: [a5.p[0] - r.p[0], a5.p[1] - r.p[1]], dw: FigurRaster.abfahrt(a5) - winkelVon(r.richtung) });
    }
    for (const liste of [links, rechts])
      for (let j = 1; j < liste.length; j++) {
        while (liste[j]!.dw - liste[j - 1]!.dw > Math.PI) liste[j]!.dw -= 2 * Math.PI;
        while (liste[j]!.dw - liste[j - 1]!.dw < -Math.PI) liste[j]!.dw += 2 * Math.PI;
      }
    this.bohnenEnde = { links, rechts };
    // Haltungen aus den Seitenvorlagen: Stehen ist das Raster bei ψ = 90 (Kopf vorn und im Profil)
    const stehen = (theta: number): Map<TeilName, Form> => new Map(this.teile({ psi: 90, theta }).map((x) => [x.name, x.form]));
    const stehVorn = stehen(0);
    const stehProfil = stehen(90);
    const nurKoerper = new Map([...stehVorn].filter(([n]) => KOERPER.includes(n)));
    const nurKopf = (m: Map<TeilName, Form>): Map<TeilName, Form> => new Map([...m].filter(([n]) => KOPF.includes(n)));
    this.haltungen = new Haltungen(d, nurKoerper, { vorn: nurKopf(stehVorn), profil: nurKopf(stehProfil) });
    // tiefster Punkt jeder Haltung (vorn, Profil) ohne Bodenregel: Bezug der Regel, damit sie an den Vorlagen nichts ändert
    for (const [reihe, theta] of [['vorn', 0], ['profil', 90]] as const)
      // gezeichnete Haltungen: der tiefste Punkt seiner Vorlage; gebaute (Hocke, Diener) stehen auf dem Boden
      this.haltungen.boden[reihe] = HALTUNGEN.map((x, i) => (i === 0 || !x.vorn ? 0 : FigurRaster.tiefster(this.teile({ psi: 90, theta, posen: { [x.name]: 1 } }, true, true))));
  }

  /** tiefster Punkt (größtes y) der schwarzen Teile */
  static tiefster(liste: { weiss: boolean; form: Form }[]): number {
    let tief = -Infinity;
    for (const t of liste) {
      if (t.weiss) continue;
      const pts = abflachen(t.form, (q) => q, 1);
      for (let k = 1; k < pts.length; k += 2) tief = Math.max(tief, pts[k]!);
    }
    return tief;
  }

  /**
   * Anschluss der ersten Hälfte im Profil. Die Mischung zwischen 45° und 90° hängt am nächsten Schlüssel hinter 90°: Er bestimmt, wohin und
   * wie schnell jeder Anker im Profil ankommt. Florian hat die erste Hälfte so gutgeheißen (19.11.: „die ersten 90grad waren schon ganz
   * gut“), wie sie mit den ersten verborgenen Schlüsseln des Wegdrehens vom 19.11. nachmittags lief; diese bleiben deshalb als Anschluss der
   * ersten Hälfte stehen (gezeigt wird ab 90° das Wegdrehen aus `rueckseiteBauen`): Bart A und B als Punkt am rechten Rand des Rückens
   * (150°, 112°), die Nase kleiner an der Vorderkante der nahen Maske (104°), die nahe Maske mit nach außen gewölbtem Scheitel (112°), die
   * ferne in der nahen untergetaucht (102°). Gerechnet aus den gezeichneten Schlüsseln (vor allen verborgenen ab 90°).
   */
  private anschlussBauen(): Map<TeilName, Schluessel> {
    const keyBei = (n: TeilName, w: number): Form => this.kopf.get(n)!.find((x) => x.w === w)!.form;
    const zwischen = (n: TeilName, w: number): Form => formAusSchluesseln(this.kopf.get(n)!, w);
    const out = new Map<TeilName, Schluessel>();
    let xr = -Infinity;
    for (const n of ['kopfA', 'kopfB'] as TeilName[]) for (const a of keyBei(n, 180)) xr = Math.max(xr, a.p[0]);
    for (const [n, w] of [['bartA', 150], ['bartB', 112]] as [TeilName, number][]) {
      const k = kasten(keyBei(n, 90));
      out.set(n, { w, form: punktForm(keyBei(n, 90), [xr - RUECKEN_GESICHT_RAND, (k[1] + k[3]) / 2]) });
    }
    {
      const n90 = keyBei('nase', 90);
      const k = kasten(n90);
      const cy = (k[1] + k[3]) / 2;
      let vorder = -Infinity;
      for (const q of punkteVon(zwischen('kopfA', 104), 2)) if (Math.abs(q[1] - cy) < (k[3] - k[1]) / 2) vorder = Math.max(vorder, q[0]);
      const kx = (k[0] + k[2]) / 2;
      const x = vorder + (k[2] - k[0]) * 0.35 - 4;
      out.set('nase', { w: 104, form: abbilden(n90, (q) => [x + (q[0] - kx) * 0.7, cy + (q[1] - cy) * 0.7]) });
    }
    {
      const f = zwischen('kopfA', 112).map((x) => ({ p: [x.p[0], x.p[1]] as Punkt, i: [x.i[0], x.i[1]] as Punkt, o: [x.o[0], x.o[1]] as Punkt }));
      const a8 = f[f.length - 1]!;
      const a0 = f[0]!;
      const sx = a0.p[0] - a8.p[0];
      const sy = a0.p[1] - a8.p[1];
      const l = Math.hypot(sx, sy) || 1;
      const b = 0.28 * l;
      a8.o = [a8.p[0] + sx / 3 + (sy / l) * b, a8.p[1] + sy / 3 - (sx / l) * b];
      a0.i = [a0.p[0] - sx / 3 + (sy / l) * b, a0.p[1] - sy / 3 - (sx / l) * b];
      out.set('kopfA', { w: 112, form: f });
      const c = schwerpunkt(zwischen('kopfA', 102));
      out.set('kopfB', { w: 102, form: abbilden(zwischen('kopfB', 102), (q) => [c[0] + (q[0] - c[0]) * 0.001, c[1] + (q[1] - c[1]) * 0.001]) });
    }
    // Ohren: der Rücken wie eingelesen (ohne Tausch und Umnummerierung), das ferne Ohr bei 105° klein hinter dem nahen
    {
      const wieEingelesen = (n: TeilName): Schluessel[] => this.kopf.get(n)!.map((x) => (x.w === 180 ? { w: 180, form: this.rueckenWieEingelesen.get(n)! } : x));
      const la = wieEingelesen('ohrA');
      const lb = wieEingelesen('ohrB');
      out.set('ohrA', la.find((x) => x.w === 180)!);
      const oa = formAusSchluesseln(la, 105);
      const ob = formAusSchluesseln(lb, 105);
      const ca = schwerpunkt(oa);
      const cb = schwerpunkt(ob);
      out.set('ohrB', { w: 105, form: abbilden(ob, (q) => [ca[0] + (q[0] - cb[0]) * 0.8, ca[1] + (q[1] - cb[1]) * 0.8]) });
    }
    return out;
  }

  /**
   * Kopf von 90° nach 180°: Florians Rücken ist der Schlüssel bei 180°. Das Gesicht dreht sich weg (Florian, 19.11. abends, mit Skizzen bei
   * 6 %, 36 % und 42 % der Drehung): Das Weiß läuft über die schwarze Outline, rechts ist das Gesicht offen. Die Schnauze, wie er sie im
   * Profil gezeichnet hat (Stirnfranse oben, offene Stirn, Nase, nach oben auslaufender Kiefer), wird als Ganzes schmaler (`wegGedreht`)
   * und läuft am rechten Rand hinaus. Die nahe Maske übernimmt dafür gleich hinter 90° unter dem Weiß Stirnfranse und Kiefer der fernen;
   * die ferne taucht unter und wächst links zum Hinterkopf. Die Nase wird am Rand schmaler und kleiner, verschwindet und liegt danach hinter
   * dem Weiß; die Nase des Rückens liegt verborgen im Kopf. Dann die zweite Hälfte (180°–360°): die gespiegelten Schlüssel des Partners
   * (A ↔ B), bei 360° wieder Florians Front.
   */
  private rueckseiteBauen(): void {
    const keyBei = (n: TeilName, w: number): Form | undefined => this.kopf.get(n)?.find((x) => x.w === w)?.form;
    const dazu = (n: TeilName, ...neu: Schluessel[]): void => {
      const keys = this.kopf.get(n)!;
      keys.push(...neu);
      keys.sort((x, y) => x.w - y.w);
    };
    const zwischen = (n: TeilName, w: number): Form => formAusSchluesseln(this.kopf.get(n)!, w);
    let xr = -Infinity;
    for (const n of ['kopfA', 'kopfB'] as TeilName[]) for (const a of keyBei(n, 180)!) xr = Math.max(xr, a.p[0]);
    // Vorderkante der Schnauze im Profil (ferne Maske); das ganz weggedrehte Gesicht liegt außerhalb des Rückens
    const a90 = keyBei('kopfA', 90)!;
    const b90 = keyBei('kopfB', 90)!;
    let x0 = -Infinity;
    for (const q of punkteVon(b90)) x0 = Math.max(x0, q[0]);
    let xAus = xr;
    for (const n of ['kopfA', 'kopfB'] as TeilName[]) for (const a of keyBei(n, 180)!) xAus = Math.max(xAus, Math.abs(a.p[0]));
    const weg = (f: Form, w: number): Form => wegGedreht(f, w, x0, xr + GESICHT_AUSSEN, xAus + 2 * GESICHT_AUSSEN);
    // die Maske selbst gleitet nicht über den Rand hinaus (das wäre ein schwarzer Kasten am rechten Rand)
    const wegMaske = (f: Form, w: number): Form => wegGedreht(f, w, x0, xr + GESICHT_AUSSEN);
    // Bart (nah und fern): mit seinen Haaren wie im Profil, nur schmaler, in voller Höhe; ab GESICHT_WEG_BIS ohne Breite außerhalb des Kopfs
    for (const n of ['bartA', 'bartB'] as TeilName[]) {
      const f90 = keyBei(n, 90)!;
      dazu(n, ...GESICHT_WEG.map((w) => ({ w, form: weg(f90, w) })));
    }
    // nahe Maske übernimmt die Schnauze: Ihr Scheitel (Stück 8 → 0) liegt im Profil unter dem Weiß. Bis WICKEL[0] wird Anker 8 die Spitze
    // der Stirnfranse (dort, wo das Weiß von oben her die ferne Maske erreicht), Anker 0 die Kinnspitze (tiefster Punkt der fernen Maske); die
    // Stücke 7 → 8 (oben), 8 → 0 (vorn: das Weiß oder die ferne Maske, was weiter rechts liegt) und 0 → 1 (unten) folgen dem Umriss aus naher
    // Maske, ferner Maske und Weiß. Danach gehen Anker 8, 0 und 1 (Spitze unten: der Kiefer bleibt unter dem Bart) mit dem Gesicht, die
    // übrigen von 90° zum Rücken, die am Hinterkopf verzögert (HINTERKOPF_ZOEGERN)
    {
      const pa = punkteVon(a90, 4);
      const pb = punkteVon(b90, 4);
      const pw = [...punkteVon(keyBei('bartA', 90)!, 4), ...punkteVon(keyBei('bartB', 90)!, 4)];
      const rechtsVon = (ps: Punkt[], y: number): number => Math.max(-Infinity, ...schnitte(ps, y, 1));
      // Spitze der Stirnfranse: erste Zeile von oben, in der das Weiß so weit rechts liegt wie die ferne Maske
      let yw = Infinity;
      for (const q of pw) yw = Math.min(yw, q[1]);
      let franse: Punkt = [0, 0];
      for (let y = yw; y < yw + 200; y += 0.5) {
        const xw = Math.max(-Infinity, ...schnitte(pw, y, 1));
        const xb = rechtsVon(pb, y);
        if (Number.isFinite(xw) && Number.isFinite(xb) && xw >= xb) {
          franse = [xb, y];
          break;
        }
      }
      let kinn: Punkt = [0, -Infinity];
      for (const q of pb) if (q[1] > kinn[1]) kinn = [q[0], q[1]];
      const n = a90.length;
      const a7 = a90[n - 2]!;
      const a1 = a90[1]!;
      const oben: Punkt[] = [a7.p];
      for (let x = a7.p[0] + 3; x < franse[0] - 1; x += 3) {
        const ys = [...schnitte(pa, x, 0), ...schnitte(pb, x, 0)];
        if (ys.length) oben.push([x, Math.min(...ys)]);
      }
      oben.push(franse);
      const vorn: Punkt[] = [];
      // an der offenen Stirn knapp unter dem Weiß (fallen beide Kanten zusammen, bleibt dort eine graue Linie der Kantenglättung)
      for (let y = franse[1]; y < kinn[1] - 1; y += 3) vorn.push([Math.max(rechtsVon(pw, y) - 2, rechtsVon(pb, y)), y]);
      vorn.push(kinn);
      const unten: Punkt[] = [kinn];
      for (let x = kinn[0] - 3; x > a1.p[0] + 1; x -= 3) {
        const ys = [...schnitte(pa, x, 0), ...schnitte(pb, x, 0)];
        if (ys.length) unten.push([x, Math.max(...ys)]);
      }
      unten.push(a1.p);
      const ko = kurveDurch(oben);
      const kv = kurveDurch(vorn);
      const ku = kurveDurch(unten);
      const f = a90.map((x) => ({ p: [x.p[0], x.p[1]] as Punkt, i: [x.i[0], x.i[1]] as Punkt, o: [x.o[0], x.o[1]] as Punkt }));
      f[n - 2]!.o = ko[1];
      f[n - 1] = { p: franse, i: ko[2], o: kv[1] };
      f[0] = { p: kinn, i: kv[2], o: ku[1] };
      f[1]!.i = ku[2];
      const ka90 = kasten(a90);
      const hinten = a90.map((x, j) => j !== n - 1 && j !== 0 && j !== 1 && x.p[0] < (ka90[0] + ka90[2]) / 2);
      const kopie = (fo: Form): Form => fo.map((x) => ({ p: [x.p[0], x.p[1]] as Punkt, i: [x.i[0], x.i[1]] as Punkt, o: [x.o[0], x.o[1]] as Punkt }));
      const neu: Schluessel[] = [];
      for (const w of WICKEL) {
        const basis = kopie(zwischen('kopfA', w));
        const spaet = zwischen('kopfA', 90 + 90 * ((w - 90) / 90) ** HINTERKOPF_ZOEGERN);
        for (let j = 0; j < n; j++) if (hinten[j]) basis[j] = kopie([spaet[j]!])[0]!;
        const g = wegMaske(f, w);
        basis[n - 1] = g[n - 1]!;
        basis[0] = g[0]!;
        basis[1] = g[1]!;
        const b7 = basis[n - 2]!;
        b7.o = [b7.p[0] + g[n - 2]!.o[0] - g[n - 2]!.p[0], b7.p[1] + g[n - 2]!.o[1] - g[n - 2]!.p[1]];
        const b2 = basis[2]!;
        b2.i = [b2.p[0] + g[2]!.i[0] - g[2]!.p[0], b2.p[1] + g[2]!.i[1] - g[2]!.p[1]];
        neu.push({ w, form: basis });
      }
      dazu('kopfA', ...neu);
    }
    // Nase: kommt im Profil zur Ruhe, wird dann am rechten Rand schmaler und kleiner wie ein Knubbel, der sich wegdreht (Florian: „sie muss
    // schmaler werden und die form dann ausskalieren, bevor sie hinter den kopf dreht“, bei 36 % „noch ein wenig der nase“), verschwindet
    // bei NASE_WEG, liegt danach hinter dem Weiß und wächst verborgen im Kopf zur Nase des Rückens
    {
      const n90 = keyBei('nase', 90)!;
      let xs = -Infinity;
      for (const q of punkteVon(n90)) xs = Math.max(xs, q[0]);
      const k = kasten(n90);
      const cy = (k[1] + k[3]) / 2;
      const rand = (w: number): number => weg([{ p: [xs, cy], i: [xs, cy], o: [xs, cy] }], w)[0]!.p[0];
      const knubbel = (w: number, b: number, h: number): Form => abbilden(n90, (q) => [rand(w) + (q[0] - xs) * b, cy + (q[1] - cy) * h]);
      dazu('nase', { w: 94, form: n90 }, ...NASE_FORM.map((x) => ({ w: x.w, form: knubbel(x.w, x.breite, x.hoehe) })), { w: NASE_WEG, form: punktForm(n90, [rand(NASE_WEG) - 2, cy]) });
    }
    // Ohren: Das mittlere (fernes Ohr im Profil) bleibt von der Seite länger nah am linken. Zwischenschlüssel nur bis 125°: Später verdeckte
    // es die Ecke der nahen Maske rechts oben nicht mehr (runde Schulter), und gespiegelt in der zweiten Hälfte holte das linke Ohr gleich
    // hinter 180° den Unterschied des nicht spiegelgleichen Rückens nach (ein Sprung)
    {
      const zwei: Schluessel[] = [{ w: 0, form: keyBei('ohrB', 90)! }, { w: 1, form: keyBei('ohrB', 180)! }];
      dazu('ohrB', ...[110, 125].map((w) => ({ w, form: formAusSchluesseln(zwei, ((w - 90) / 90) ** OHR_ZOEGERN) })));
    }
    // Ohrspalt: zieht sich zwischen den Ohren auf einen Punkt zusammen
    {
      const s90 = keyBei('ohrSpalt', 90)!;
      const p = schwerpunkt(s90);
      dazu('ohrSpalt', { w: SPALT_WEG, form: punktForm(s90, p) }, { w: 180, form: punktForm(s90, p) });
    }
    // Hinterkopf ohne Einbruch: Die ferne Maske (B) ist im Profil nur der Streifen vorn an der Schnauze, im Rücken die linke Hälfte. Sie
    // bleibt an der Schnauze, bis die nahe Maske darum liegt, taucht dann im Kopf unter (MASKE_UNTER), liegt zusammengeschoben am linken
    // Rand der nahen Maske (MASKE_LINKS) und wächst von dort mit ihren eigenen Zacken zur linken Hälfte (MASKE_DA): Der Kopf wird links
    // breiter, die nahe Maske (A) zieht sich dahinter von selbst zur Mitte zurück
    {
      const b180 = keyBei('kopfB', 180)!;
      dazu('kopfB', { w: WICKEL[0]!, form: weg(b90, WICKEL[0]!) });
      const c = schwerpunkt(zwischen('kopfA', MASKE_UNTER));
      const bUnter = abbilden(zwischen('kopfB', MASKE_UNTER), (q) => [c[0] + (q[0] - c[0]) * 0.001, c[1] + (q[1] - c[1]) * 0.001]);
      const kb = kasten(b180);
      const ka = kasten(zwischen('kopfA', MASKE_LINKS));
      const xa = ka[0] + 60;
      const cyb = (ka[1] + ka[3]) / 2;
      const bLinks = abbilden(b180, (q) => [xa + (q[0] - kb[0]) * 0.12, cyb + (q[1] - (kb[1] + kb[3]) / 2) * 0.55]);
      dazu('kopfB', { w: MASKE_UNTER, form: bUnter }, { w: MASKE_LINKS, form: bLinks }, { w: MASKE_DA, form: b180 });
    }
    for (const keys of this.kopf.values()) keys.sort((x, y) => x.w - y.w);
    const erste = new Map([...this.kopf].map(([n, keys]) => [n, keys.map((x) => ({ w: x.w, form: x.form }))]));
    for (const [n, keys] of this.kopf) {
      for (const x of erste.get(PARTNER_KOPF[n]!)!) if (x.w > 0 && x.w < 180) keys.push({ w: 360 - x.w, form: kopfGespiegelt(n, x.form) });
      const vorn = erste.get(n)!.find((x) => x.w === 0)!.form;
      keys.push({ w: 360, form: n === 'ohrSpalt' ? kopfGespiegelt(n, vorn) : vorn });
      keys.sort((x, y) => x.w - y.w);
    }
  }

  /** Versatz des Kopfs vom Hals bei θ (0°–360°; die zweite Hälfte gespiegelt) */
  private versatzBei(theta: number): Punkt {
    const zweite = theta > 180;
    const w = zweite ? 360 - theta : theta;
    const xs = this.kopfVersatz.map((v) => v.w);
    const x = pchip(xs, this.kopfVersatz.map((v) => v.x), w);
    const y = pchip(xs, this.kopfVersatz.map((v) => v.y), w);
    return [zweite ? -x : x, y];
  }

  /** Spitzen je Kopfteil (Index), die zwischen 45° und 90° im Rahmen ihrer Nachbarn geführt werden */
  private readonly spitzen = new Map<TeilName, number[]>();

  /**
   * Fransenspitzen: in der 3/4-Ansicht nach außen zeigende scharfe Ecken (Bartfransen, Haarspitzen), die im Profil fast gerade auf
   * einer Kante liegen. Auf Bahnen gemischt, wandern sie an ihrem Nachbarn vorbei und falten die Kontur (Haken, Zacken zwischen 45°
   * und 90°). Sie werden dort im Rahmen ihrer beiden Nachbarn geführt: Lage längs der Verbindung und Abstand quer dazu werden
   * gemischt, so zieht sich die Spitze auf die Kante zurück, statt durch den Nachbarn zu klappen.
   */
  private spitzenFinden(): void {
    const richtungen = (f: Form, j: number): [Punkt, Punkt] => {
      const n = f.length;
      const a = f[j]!;
      const vor = f[(j - 1 + n) % n]!;
      const nach = f[(j + 1) % n]!;
      const ein: Punkt = Math.hypot(a.p[0] - a.i[0], a.p[1] - a.i[1]) > 1e-3 ? [a.p[0] - a.i[0], a.p[1] - a.i[1]] : [a.p[0] - vor.o[0], a.p[1] - vor.o[1]];
      const aus: Punkt = Math.hypot(a.o[0] - a.p[0], a.o[1] - a.p[1]) > 1e-3 ? [a.o[0] - a.p[0], a.o[1] - a.p[1]] : [nach.i[0] - a.p[0], nach.i[1] - a.p[1]];
      return [einheit(ein), einheit(aus)];
    };
    const knick = (f: Form, j: number): number => {
      const [e, a] = richtungen(f, j);
      return (Math.acos(Math.max(-1, Math.min(1, e[0] * a[0] + e[1] * a[1]))) * 180) / Math.PI;
    };
    for (const name of ['bartA', 'bartB', 'kopfA', 'kopfB', 'ohrA', 'ohrB'] as TeilName[]) {
      const keys = this.kopf.get(name);
      const k45 = keys?.find((x) => x.w === 45)?.form;
      const k90 = keys?.find((x) => x.w === 90)?.form;
      if (!k45 || !k90) continue;
      // ein gezeichneter Zwischenschlüssel zwischen 45° und 90° legt die Form dort fest
      if (keys!.some((x) => x.w > 45 && x.w < 90)) continue;
      const n = k45.length;
      // nur nach außen zeigende Spitzen (Kerben mitzuführen schob Anker an der Nase heraus)
      const umlauf = Math.sign(flaecheVon(k45));
      const liste: number[] = [];
      for (let j = 0; j < n; j++) {
        if (knick(k45, j) < 110 || knick(k90, j) > 40) continue;
        const [e, a] = richtungen(k45, j);
        if (Math.sign(e[0] * a[1] - e[1] * a[0]) === umlauf) continue;
        liste.push(j);
      }
      if (liste.length) this.spitzen.set(name, liste);
    }
  }

  /** Spitzen zwischen 45° und 90° im Rahmen ihrer Nachbarn führen (Form ist schon gemischt) */
  private spitzenFuehren(name: TeilName, form: Form, thetaVoll: number): Form {
    // zweite Hälfte: dieselben Spitzen des Partners, gespiegelt (315° wie 45°, 270° wie 90°)
    const zweite = thetaVoll > 180;
    const theta = zweite ? 360 - thetaVoll : thetaVoll;
    const liste = this.spitzen.get(zweite ? PARTNER_KOPF[name]! : name);
    if (!liste || theta <= 45 || theta >= 90) return form;
    const keys = this.kopf.get(name)!;
    const k45 = keys.find((x) => x.w === (zweite ? 315 : 45))!.form;
    const k90 = keys.find((x) => x.w === (zweite ? 270 : 90))!.form;
    const n = form.length;
    const rahmen = (f: Form, j: number): { u: number; h: number } => {
      const a = f[(j - 1 + n) % n]!.p;
      const b = f[(j + 1) % n]!.p;
      const d: Punkt = [b[0] - a[0], b[1] - a[1]];
      const l2 = d[0] * d[0] + d[1] * d[1] || 1;
      const q: Punkt = [f[j]!.p[0] - a[0], f[j]!.p[1] - a[1]];
      const l = Math.sqrt(l2);
      return { u: (q[0] * d[0] + q[1] * d[1]) / l2, h: (q[0] * -d[1] + q[1] * d[0]) / l };
    };
    const t = (theta - 45) / 45;
    const glatt = t * t * (3 - 2 * t);
    const out = form.map((a) => ({ p: [a.p[0], a.p[1]] as Punkt, i: [a.i[0], a.i[1]] as Punkt, o: [a.o[0], a.o[1]] as Punkt }));
    for (const j of liste) {
      const r45 = rahmen(k45, j);
      const r90 = rahmen(k90, j);
      const u = r45.u + (r90.u - r45.u) * glatt;
      const h = r45.h + (r90.h - r45.h) * glatt;
      const a = form[(j - 1 + n) % n]!.p;
      const b = form[(j + 1) % n]!.p;
      const d: Punkt = [b[0] - a[0], b[1] - a[1]];
      const l = Math.hypot(d[0], d[1]) || 1;
      const p: Punkt = [a[0] + d[0] * u + (-d[1] / l) * h, a[1] + d[1] * u + (d[0] / l) * h];
      const alt = form[j]!;
      out[j] = { p, i: [p[0] + alt.i[0] - alt.p[0], p[1] + alt.i[1] - alt.p[1]], o: [p[0] + alt.o[0] - alt.p[0], p[1] + alt.o[1] - alt.p[1]] };
    }
    return out;
  }

  private halsBei(psi: number): Punkt {
    const r = (psi * Math.PI) / 180;
    return [this.hals.X * Math.cos(r) + this.hals.Z * Math.sin(r), this.hals.y0 + (this.hals.y90 - this.hals.y0) * (psi / 90)];
  }
  private static ankunft(a: { p: Punkt; i: Punkt; o: Punkt }): number {
    const v: Punkt = [a.p[0] - a.i[0], a.p[1] - a.i[1]];
    return Math.hypot(v[0], v[1]) > 1e-6 ? winkelVon(v) : winkelVon([a.o[0] - a.p[0], a.o[1] - a.p[1]]);
  }
  private static abfahrt(a: { p: Punkt; i: Punkt; o: Punkt }): number {
    const v: Punkt = [a.o[0] - a.p[0], a.o[1] - a.p[1]];
    return Math.hypot(v[0], v[1]) > 1e-6 ? winkelVon(v) : winkelVon([a.p[0] - a.i[0], a.p[1] - a.i[1]]);
  }
  /** linke Außenkante des am weitesten links stehenden Beins (weich gewichtet): oberer Punkt (Anker 7) und Richtung nach unten */
  private static kanteLinks(beine: Form[]): { p: Punkt; richtung: Punkt } {
    const xs = beine.map((f) => f[7]!.p[0]);
    const m = Math.min(...xs);
    const g = xs.map((x) => Math.exp(-(x - m) / 2));
    const s = g.reduce((a, b) => a + b, 0);
    let p: Punkt = [0, 0];
    let d: Punkt = [0, 0];
    beine.forEach((f, j) => {
      const w = g[j]! / s;
      p = [p[0] + w * f[7]!.p[0], p[1] + w * f[7]!.p[1]];
      const r = einheit([f[8]!.p[0] - f[7]!.p[0], f[8]!.p[1] - f[7]!.p[1]]);
      d = [d[0] + w * r[0], d[1] + w * r[1]];
    });
    return { p, richtung: einheit(d) };
  }
  /** rechte Außenkante des am weitesten rechts stehenden Beins: oberer Punkt (Anker 2) und Richtung nach oben */
  private static kanteRechts(beine: Form[]): { p: Punkt; richtung: Punkt } {
    const xs = beine.map((f) => f[2]!.p[0]);
    const m = Math.max(...xs);
    const g = xs.map((x) => Math.exp((x - m) / 2));
    const s = g.reduce((a, b) => a + b, 0);
    let p: Punkt = [0, 0];
    let d: Punkt = [0, 0];
    beine.forEach((f, j) => {
      const w = g[j]! / s;
      p = [p[0] + w * f[2]!.p[0], p[1] + w * f[2]!.p[1]];
      const r = einheit([f[2]!.p[0] - f[1]!.p[0], f[2]!.p[1] - f[1]!.p[1]]);
      d = [d[0] + w * r[0], d[1] + w * r[1]];
    });
    return { p, richtung: einheit(d) };
  }

  /** alle Teile in Körperkoordinaten an einer Lage, in Malreihenfolge */
  teile(
    lage: Lage,
    mitBohnenenden = true,
    ohneBoden = false,
    aus?: { deckung?: number[][] | null },
  ): { name: TeilName; weiss: boolean; form: Form; rand?: number; traeger?: TeilName }[] {
    const psi = Math.max(0, Math.min(90, lage.psi));
    // Kopf über den ganzen Kreis; die Haltungen kennen den Kopf von vorn bis zum Profil
    const thetaKreis = ((lage.theta % 360) + 360) % 360;
    const theta = Math.max(0, Math.min(90, lage.theta));
    const koerper = new Map<TeilName, Form>();
    for (const [n, keys] of this.koerper) koerper.set(n, formAusSchluesseln(keys, psi));
    {
      const g = Math.max(0, Math.min(1, pchip(SCHWANZ_WEISS.map((x) => x.w), SCHWANZ_WEISS.map((x) => x.groesse), psi)));
      if (g < 0.999) {
        const w = koerper.get('schwanzW')!;
        const c = schwerpunkt(w);
        const k = Math.max(g, 0.001);
        koerper.set('schwanzW', abbilden(w, (q) => [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k]));
      }
    }
    // Haltung (Sitzen, Liegen): Körper aus den Knochen der Haltungen (nur in der Seite)
    const g: Gewichte | null = !this.haltungen ? null : (lage.posen ?? (lage.haltung ? gewichteAus(lage.haltung) : null));
    const pose = !!g && !Haltungen.stehtNur(g);
    if (pose) {
      for (const [n, f] of this.haltungen!.koerper(g!, theta, lage.effekte?.wedeln ?? 0)) koerper.set(n, f);
      FigurRaster.weissHinterSchwarz(koerper, 'schwanzW', 'bohne');
    } else if (mitBohnenenden) this.bohnenendenSetzen(koerper, psi);
    const hals = this.halsBei(psi);
    const [vx, vy] = this.versatzBei(thetaKreis);
    const kopf = new Map<TeilName, Form>();
    const dk: Punkt = pose ? this.haltungen!.kopfVersatz(g!, theta) : [0, 0];
    if (lage.effekte?.kopf) dk[1] += lage.effekte.kopf;
    const vornHaelfte = thetaKreis <= 90 || thetaKreis >= 270;
    for (const [n, keys] of this.kopf) {
      // Teile, die im Rücken fehlen (Bart, Ohrspalt), liegen bei 180° verborgen am nahen Rand der Hälfte (rechts, gespiegelt links): In
      // der zweiten Hälfte das gespiegelte Gegenstück der ersten, so wechseln sie bei 180° verborgen die Seite, statt durch den Kopf zu wandern
      const gemischt =
        thetaKreis > 180 && thetaKreis < 270 && this.ohneRuecken.has(n)
          ? kopfGespiegelt(n, formAusSchluesseln(this.kopf.get(PARTNER_KOPF[n]!)!, 360 - thetaKreis))
          : formAusSchluesseln(vornHaelfte ? this.kopfVorn.get(n)! : keys, thetaKreis);
      const f = verschieben(this.spitzenFuehren(n, gemischt, thetaKreis), hals[0] + vx + dk[0], hals[1] + vy + dk[1]);
      kopf.set(n, pose ? this.haltungen!.kopfKorrektur(n, f, g!, theta) : f);
    }
    // Malreihenfolge (an den Schlüsseln wie in Florians Dateien): Ohren, Bohne, Beine von fern nach nah, Keile, Schwanz (sein Weiß
    // liegt vorn hinter der Bohne und tritt bis 45° weich davor), Fenster, Kopfmasken, Bart, Nase. Das Fenster links vorn liegt vorn über der Haarspitze von Maske B, das rechts vorn in der
    // Seite über der Haarspitze von Maske A (so in Front und Logo gezeichnet).
    const r = (psi * Math.PI) / 180;
    const nah = (n: TeilName): number => 70 * (n.endsWith('V') ? 1 : -1) * Math.cos(r) + 50 * (n.startsWith('beinR') ? 1 : -1) * Math.sin(r);
    const beine = [...BEINE].sort((a, b) => nah(a) - nah(b));
    const reihe: TeilName[] = ['ohrB', 'ohrSpalt', 'ohrA', 'bohne', ...beine, 'keilH', 'keilV', 'schwanz', 'schwanzW', 'fensterRH'];
    if (psi >= 22.5) reihe.push('fensterLV');
    if (psi <= 67.5) reihe.push('fensterRV');
    reihe.push('kopfB');
    if (psi < 22.5) reihe.push('fensterLV');
    reihe.push('kopfA');
    if (psi > 67.5) reihe.push('fensterRV');
    // Nase beim Wegdrehen: vorn, bis sie am Rand verschwunden ist (NASE_WEG), danach hinter dem Weiß (dort wächst sie verborgen zur Nase des
    // Rückens); gespiegelt in der zweiten Hälfte
    const wegW = thetaKreis > 180 ? 360 - thetaKreis : thetaKreis;
    if (wegW < NASE_WEG) reihe.push('bartA', 'bartB', 'nase');
    else reihe.push('nase', 'bartA', 'bartB');
    // zweite Hälfte der Kopfdrehung: die nahe Seite ist B (Ohr B vor dem Spalt und Ohr A, Maske B über A, Bart A unter B)
    if (thetaKreis > 180) for (let i = 0; i < reihe.length; i++) if (PARTNER_KOPF[reihe[i]!] && reihe[i] !== 'nase' && reihe[i] !== 'ohrSpalt') reihe[i] = PARTNER_KOPF[reihe[i]!]!;
    const malen0 = pose ? this.haltungen!.reihe(g!, theta, reihe) : reihe.slice();
    const malen = lage.nurKopf ? malen0.filter((n) => KOPF.includes(n)) : malen0;
    // Sohlen (Beine, die zur Kamera zeigen) direkt nach ihrem Bein
    for (const n of BEINE) {
      const sohle = ('sohle' + n.slice(4)) as TeilName;
      if (koerper.has(sohle)) malen.splice(malen.indexOf(n) + 1, 0, sohle);
    }
    const liste = malen.map((n) => {
      const form = koerper.get(n) ?? kopf.get(n)!;
      const t: { name: TeilName; weiss: boolean; form: Form; rand?: number; traeger?: TeilName } = { name: n, weiss: n.startsWith('fenster') || n === 'schwanzW' || n === 'ohrSpalt' || n.startsWith('bart'), form };
      const kl = this.klemme.get(n);
      if (kl) t.rand = pchip(kl.map((x) => x.w), kl.map((x) => x.rand), psi);
      // während eines Haltungswechsels bleiben die Fenster mit einem kleinen Rand in ihrem Bein (gekrümmte Beine), an den Vorlagen wie gezeichnet
      if (pose && n.startsWith('fenster') && t.rand !== undefined) t.rand += (FENSTER_RAND_WECHSEL - t.rand) * (1 - Haltungen.groesstes(g!));
      return t;
    });
    // weiche Malreihenfolge zwischen den Haltungen (der Renderer deckt nach Anteilen, statt beim Wechsel der führenden umzuklappen)
    if (aus) aus.deckung = pose ? this.haltungen!.deckung(g!, theta, liste, reihe) : null;
    // Bodenregel in den Haltungen: Ozzy ruht mit seinem tiefsten Punkt auf dem Boden (nichts sinkt ein, nichts schwebt); an Florians
    // Vorlagen liegt der tiefste Punkt schon auf dem Boden
    if (pose && !ohneBoden) {
      const tief = FigurRaster.tiefster(liste) - this.haltungen!.bodenBei(g!, theta);
      if (Number.isFinite(tief) && Math.abs(tief) > 1e-9) for (const t of liste) t.form = verschieben(t.form, 0, -tief);
    }
    // Zusatzbewegungen auch im reinen Stehen: Am Ende eines Ablaufs (und in der Steuerung) steht Ozzy dort, wohin er sich verschoben hat
    if (lage.effekte) FigurRaster.effekteAnwenden(liste, lage.effekte);
    return liste;
  }

  /**
   * Zusatzbewegungen nach der Bodenregel: Hüpfer (Drehung um die vorderste Pfote, die am Boden steht: das Hinterteil hebt ab, die
   * Vorderpfoten bleiben stehen) und Stauchen am Boden (alles wird flacher und breiter, der Boden bleibt Boden).
   */
  private static effekteAnwenden(liste: { name: TeilName; weiss: boolean; form: Form }[], e: Effekte): void {
    const dx = e.versatz ?? 0;
    if (Math.abs(dx) > 1e-9) for (const t of liste) t.form = verschieben(t.form, dx, 0);
    const hub = e.hub ?? 0;
    if (Math.abs(hub) > 1e-9) {
      let px = -Infinity;
      for (const t of liste) if (!t.weiss && t.name.startsWith('bein')) for (const a of t.form) if (a.p[1] > -3) px = Math.max(px, a.p[0]);
      if (Number.isFinite(px)) {
        const c = Math.cos(hub);
        const s = Math.sin(hub);
        const dreh = (q: Punkt): Punkt => [px + c * (q[0] - px) - s * q[1], s * (q[0] - px) + c * q[1]];
        for (const t of liste) t.form = abbilden(t.form, dreh);
      }
    }
    const st = e.stauchung ?? 0;
    if (Math.abs(st) > 1e-9) {
      let x0 = Infinity;
      let x1 = -Infinity;
      for (const t of liste) for (const a of t.form) {
        x0 = Math.min(x0, a.p[0]);
        x1 = Math.max(x1, a.p[0]);
      }
      const cx = (x0 + x1) / 2;
      const quer = 1 + 0.5 * st;
      const hoch = 1 - st;
      for (const t of liste) t.form = abbilden(t.form, (q) => [cx + (q[0] - cx) * quer, q[1] * hoch]);
    }
  }

  /**
   * Weiß eines Teils, dessen Träger hinter einem schwarzen Teil liegt (Schwanz hinter der Bohne), wird kleiner, je tiefer seine Mitte
   * hinter dem Umriss steckt, statt durch das Schwarz zu scheinen (wie Florian es beim Kopf wollte): ganz außerhalb unverändert, eine
   * halbe Breite des Weiß drinnen verschwunden.
   */
  private static weissHinterSchwarz(teile: Map<TeilName, Form>, weiss: TeilName, schwarz: TeilName): void {
    const w = teile.get(weiss);
    const s = teile.get(schwarz);
    if (!w || !s) return;
    const c = schwerpunkt(w);
    const [x0, y0, x1, y1] = kasten(w);
    const r = Math.max(1e-6, Math.max(x1 - x0, y1 - y0) / 2);
    // Abstand der Mitte zum Umriss, außen positiv
    const pts = abflachen(s, (q) => q, 1);
    let d2 = Infinity;
    let innen = false;
    const n = pts.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const ax = pts[2 * i]!, ay = pts[2 * i + 1]!, bx = pts[2 * j]!, by = pts[2 * j + 1]!;
      if (ay > c[1] !== by > c[1] && c[0] < ((bx - ax) * (c[1] - ay)) / (by - ay) + ax) innen = !innen;
      const ex = bx - ax, ey = by - ay;
      const t = Math.max(0, Math.min(1, ((c[0] - ax) * ex + (c[1] - ay) * ey) / (ex * ex + ey * ey || 1)));
      d2 = Math.min(d2, (ax + ex * t - c[0]) ** 2 + (ay + ey * t - c[1]) ** 2);
    }
    const d = innen ? -Math.sqrt(d2) : Math.sqrt(d2);
    const u = Math.max(0, Math.min(1, (d + r) / r));
    const k = Math.max(0.001, u * u * (3 - 2 * u));
    if (k >= 0.999) return;
    teile.set(weiss, abbilden(w, (q) => [c[0] + (q[0] - c[0]) * k, c[1] + (q[1] - c[1]) * k]));
  }

  private bohnenendenSetzen(koerper: Map<TeilName, Form>, psi: number): void {
    const bohne = koerper.get('bohne')!;
    const beine = BEINE.map((n) => koerper.get(n)!);
    const setze = (index: number, kante: { p: Punkt; richtung: Punkt }, liste: { w: number; off: Punkt; dw: number }[], ankunft: boolean): void => {
      const xs = liste.map((x) => x.w);
      const off: Punkt = [pchip(xs, liste.map((x) => x.off[0]), psi), pchip(xs, liste.map((x) => x.off[1]), psi)];
      const ziel = winkelVon(kante.richtung) + pchip(xs, liste.map((x) => x.dw), psi);
      const a = bohne[index]!;
      const p: Punkt = [kante.p[0] + off[0], kante.p[1] + off[1]];
      const jetzt = ankunft ? FigurRaster.ankunft(a) : FigurRaster.abfahrt(a);
      const dr = ziel - jetzt;
      const c = Math.cos(dr);
      const s = Math.sin(dr);
      const dreh = (g: Punkt): Punkt => {
        const x = g[0] - a.p[0];
        const y = g[1] - a.p[1];
        return [p[0] + c * x - s * y, p[1] + s * x + c * y];
      };
      bohne[index] = { p, i: dreh(a.i), o: dreh(a.o) };
    };
    setze(1, FigurRaster.kanteLinks(beine), this.bohnenEnde.links, true);
    setze(5, FigurRaster.kanteRechts(beine), this.bohnenEnde.rechts, false);
  }

  /** die Vorlage, die an dieser Lage genau getroffen werden soll (Körperkoordinaten), sonst null */
  vorlage(lage: Lage): { ansicht: AnsichtName; formen: Form[] } | null {
    const nahe = (a: number, b: number): boolean => Math.abs(a - b) < 0.6;
    const g = lage.posen ?? (lage.haltung ? gewichteAus(lage.haltung) : null);
    if (this.haltungen && g && !Haltungen.stehtNur(g) && nahe(lage.psi, 90)) {
      const n = this.haltungen.vorlageBei(g, lage.theta);
      if (!n) return null;
      const u = this.ursprung(n);
      // mit Florians Änderung seiner Vorlage (Kopf im Sitzen zurück)
      const dk = Haltungen.kopfVersatzVorlage(n);
      const kopfteil = (t: TeilName): boolean => this.kopf.has(t);
      return { ansicht: n, formen: this.ansichten[n].teile.map((x) => verschieben(x.form, -u[0] + (kopfteil(x.name) ? dk[0] : 0), -u[1] + (kopfteil(x.name) ? dk[1] : 0))) };
    }
    const wahl: [number, number, AnsichtName][] = [[0, 0, 'front'], [45, 45, 'viertel'], [90, 0, 'logo'], [90, 90, 'profil']];
    for (const [p, t, n] of wahl)
      if (nahe(lage.psi, p) && nahe(lage.theta, t)) {
        const a = this.ansichten[n];
        return { ansicht: n, formen: a.teile.map((x) => inKoerper(a, x.form)) };
      }
    return null;
  }

  /** Ursprung einer Vorlage in Körperkoordinaten (Haltungen: wie sie zueinander liegen; sonst Bohnenmitte und Boden) */
  ursprung(n: AnsichtName): Punkt {
    const v = this.haltungen?.versatz.get(n);
    if (v && n !== 'logo' && n !== 'profil') return [-v[0], -v[1]];
    return koerperUrsprung(this.ansichten[n]);
  }

  /** Ort dessen, was in einem Abschnitt eines Ablaufs stehen bleibt (siehe Haltungen.ankerX) */
  ankerX(g: Gewichte, theta: number, anker: Anker): number {
    return this.haltungen ? this.haltungen.ankerX(g, theta, anker) : 0;
  }

  /** Szene für den Renderer */
  szene(lage: Lage, fl: Fluessig, regeln: RasterRegeln = { verdecken: 0 }, mitBohnenenden = true): Szene {
    const aus: { deckung?: number[][] | null } = {};
    const liste = this.teile(lage, mitBohnenenden, false, aus);
    const index = new Map(liste.map((t, i) => [t.name, i]));
    const teile: RenderTeil[] = liste.map((t) => {
      const r: RenderTeil = { name: t.name, weiss: t.weiss, gruppe: gruppeVon(t.name), form: t.form };
      const wg = weissGruppeVon(t.name);
      if (wg) r.weissGruppe = wg;
      if (t.traeger !== undefined && t.rand !== undefined) {
        const tr = index.get(t.traeger);
        if (tr !== undefined) {
          r.traeger = tr;
          r.rand = t.rand;
        }
      } else if (t.rand !== undefined) {
        const bein = index.get(t.name.replace('fenster', 'bein') as TeilName);
        if (bein !== undefined) {
          r.traeger = bein;
          r.rand = t.rand;
        }
      }
      if (t.name === 'schwanzW') {
        r.traeger = index.get('schwanz')!;
        r.rand = 6;
      }
      return r;
    });
    const verdecker: Verdecker[] = [];
    // nur zwischen Front und Profil (dort ist die abgewandte Wange gezeichnet); beim Wegdrehen liegt das Weiß in der nahen Maske, und
    // das Verdecken zöge an den Kanten, die die Maske dort unter dem Weiß überstreicht, feine Linien
    const wk = ((lage.theta % 360) + 360) % 360;
    const st = wk > 90 && wk < 270 ? 0 : regeln.verdecken * Math.abs(Math.sin((lage.theta * 4 * Math.PI) / 180));
    if (st > 0.01) {
      const masken = liste.filter((t) => t.name === 'kopfA' || t.name === 'kopfB').flatMap((t) => t.form);
      // die abgewandte Seite: in der ersten Hälfte rechts, in der gespiegelten zweiten links
      const zweite = ((lage.theta % 360) + 360) % 360 > 180;
      verdecker.push({ mitte: schwerpunkt(masken), richtung: [zweite ? -1 : 1, 0], radius: 130, staerke: st });
    }
    // Durchbruch zwischen den Schlüsseln (an Florians Zeichnungen 0°, 45°, 90°, 180° ohne Wirkung): zwischen Front und Profil wie das
    // Verdecken (|sin 4θ|), beim Wegdrehen |sin 2θ|
    const dmax = regeln.durchbruch ?? 0;
    const gw = wk <= 90 || wk >= 270 ? Math.abs(Math.sin((wk * 4 * Math.PI) / 180)) : Math.abs(Math.sin((wk * 2 * Math.PI) / 180));
    const durchbruch = dmax > 0 && gw > 0.01 ? { duenn: 0.4 * dmax * gw, voll: dmax * gw } : null;
    return { teile, fluessig: fl, verdecker, ohrspalt: null, deckung: aus.deckung ?? null, durchbruch };
  }
}
