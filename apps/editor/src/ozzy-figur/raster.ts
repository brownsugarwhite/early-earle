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
const RUECKEN_ANKER: Partial<Record<TeilName, (j: number, n: number) => number>> = {};
/**
 * Gesicht beim Wegdrehen (Florian, 19.11. abends: „das weiß muss vor der linie bleiben und nur leicht verjüngen“): Schlüssel des Barts
 * (nah und fern) und der Nase, gestaucht wie bei einer Drehung (`wegGedreht`)
 */
const GESICHT_WEG = [100, 110, 120, 135, 150, 165, 180];
/** die nahe Maske legt sich unter dem Weiß um die Schnauze (bis zum ersten Winkel) und wird bis zum letzten mit dem Gesicht gestaucht */
const WICKEL = [96, 100, 110, 120, 135];
/**
 * Klemme des Barts in der nahen Maske beim Wegdrehen (Rand in Figur-Einheiten; −KLEMME_AUSSEN: ohne Wirkung). Sie wirkt erst, wenn die
 * Maske ganz um die Schnauze liegt (vorher schnitte sie das Weiß mit einem Ruck), und wächst langsam: Das Weiß bleibt vor seinem Rand und
 * läuft am Ende im Rand aus
 */
const BART_KLEMME: { w: number; rand: number }[] = [{ w: 0, rand: -KLEMME_AUSSEN }, { w: WICKEL[0]!, rand: -KLEMME_AUSSEN }, { w: 100, rand: 0 }, { w: 150, rand: 8 }, { w: 180, rand: 8 }];
/** schwarzer Rand der Schnauze außen um das Weiß (Figur-Einheiten) */
const SCHNAUZE_RAND = 8;
/** Nase: liegt bei NASE_HINTER schmal im Rand der Schnauze und tritt dort hinter das Weiß, verborgen ein Punkt bei NASE_WEG */
const NASE_HINTER = 100;
const NASE_WEG = 125;
const SPALT_WEG = 140;
/** ferne Maske: bleibt bis zum ersten Wickelwinkel an der Schnauze, taucht dann im Kopf unter, liegt zusammengeschoben links, ganz da */
const MASKE_UNTER = 104;
const MASKE_LINKS = 112;
const MASKE_DA = 140;
const OHR_HINTER = 105;
/** so weit innerhalb des rechten Kopfrands (im Rücken) liegt das ganz weggedrehte Gesicht */
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
 * Gesicht beim Wegdrehen (90° → 180°): Es wird mit dem Kosinus des Wegs (φ = θ − 90°) schmaler, so werden auch seine Barthaare kürzer
 * wie bei einer Drehung (statt zu einem Punkt gezogen zu werden), und rückt dabei an den rechten Rand, an dem es im Rücken flach liegt.
 * Die Vorderkante der Schnauze (x0) bleibt fast stehen; bei 180° liegt alles auf x1.
 */
function wegGedreht(f: Form, w: number, x0: number, x1: number, hoehe?: { von: [number, number]; nach: [number, number] }): Form {
  const phi = ((w - 90) * Math.PI) / 180;
  const c = Math.cos(phi);
  const x = x0 + (x1 - x0) * Math.sin(phi);
  // im letzten Viertel klappt es in der Höhe dorthin, wo die nahe Maske im Rücken ihren rechten Rand hat
  const g = hoehe ? Math.max(0, Math.min(1, (w - 135) / 45)) : 0;
  const y = (v: number): number => {
    if (!hoehe || g <= 0) return v;
    const [a, b] = hoehe.von;
    const [m, n] = hoehe.nach;
    return v + g * (m + ((v - a) * (n - m)) / (b - a) - v);
  };
  return abbilden(f, (q) => [x + (q[0] - x0) * c, y(q[1])]);
}

/** Punkte einer Form, abgeflacht */
function punkteVon(f: Form, fein = 3): Punkt[] {
  const a = abflachen(f, (q) => q, fein);
  const out: Punkt[] = [];
  for (let k = 0; k + 1 < a.length; k += 2) out.push([a[k]!, a[k + 1]!]);
  return out;
}

/**
 * Umriss der Schnauze im Profil als eine Kurve von oben nach unten: je Höhe das Weiß mit `rand` darum (Kreis um jeden Punkt) und das
 * Schwarz der Schnauze, nach rechts das Äußerste. Kleinste Quadrate mit festen Enden; wo die Kurve innen bliebe, wird nachgeschoben.
 */
function schnauzenKurve(weiss: Form[], schwarz: Form, rand: number): [Punkt, Punkt, Punkt, Punkt] {
  const pw = weiss.flatMap((f) => punkteVon(f));
  const ps = punkteVon(schwarz);
  let yTop = Infinity;
  for (const q of pw) yTop = Math.min(yTop, q[1] - rand);
  let yBot = -Infinity;
  for (const q of ps) yBot = Math.max(yBot, q[1]);
  const rechts = (y: number): number => {
    let x = -Infinity;
    for (const q of pw) {
      const dy = q[1] - y;
      if (Math.abs(dy) <= rand) x = Math.max(x, q[0] + Math.sqrt(rand * rand - dy * dy));
    }
    for (let k = 0; k < ps.length; k++) {
      const a = ps[k]!;
      const b = ps[(k + 1) % ps.length]!;
      if ((a[1] - y) * (b[1] - y) > 0 || a[1] === b[1]) continue;
      x = Math.max(x, a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    return x;
  };
  const N = 120;
  const ys = Array.from({ length: N + 1 }, (_, i) => yTop + ((yBot - yTop) * i) / N);
  const ziel: Punkt[] = ys.map((y) => [rechts(y), y]);
  const p0 = ziel[0]!;
  const p3 = ziel[N]!;
  // Parameter nach Bogenlänge
  const ts = [0];
  for (let i = 1; i <= N; i++) ts.push(ts[i - 1]! + Math.hypot(ziel[i]![0] - ziel[i - 1]![0], ziel[i]![1] - ziel[i - 1]![1]));
  for (let i = 0; i <= N; i++) ts[i]! /= ts[N]!;
  const kurveX = (p1: Punkt, p2: Punkt, y: number): number => {
    let x = -Infinity;
    let vor: Punkt | null = null;
    for (let s = 0; s <= 200; s++) {
      const t = s / 200;
      const u = 1 - t;
      const q: Punkt = [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
      if (vor && (vor[1] - y) * (q[1] - y) <= 0 && vor[1] !== q[1]) x = Math.max(x, vor[0] + ((y - vor[1]) / (q[1] - vor[1])) * (q[0] - vor[0]));
      vor = q;
    }
    return x;
  };
  let p1: Punkt = p0;
  let p2: Punkt = p3;
  const schub = ziel.map(() => 0);
  for (let runde = 0; runde < 4; runde++) {
    let a11 = 0, a12 = 0, a22 = 0;
    const r1: Punkt = [0, 0];
    const r2: Punkt = [0, 0];
    for (let i = 0; i <= N; i++) {
      const t = ts[i]!;
      const u = 1 - t;
      const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
      const q: Punkt = [ziel[i]![0] + schub[i]! - b0 * p0[0] - b3 * p3[0], ziel[i]![1] - b0 * p0[1] - b3 * p3[1]];
      a11 += b1 * b1;
      a12 += b1 * b2;
      a22 += b2 * b2;
      r1[0] += b1 * q[0];
      r1[1] += b1 * q[1];
      r2[0] += b2 * q[0];
      r2[1] += b2 * q[1];
    }
    const det = a11 * a22 - a12 * a12;
    p1 = [(a22 * r1[0] - a12 * r2[0]) / det, (a22 * r1[1] - a12 * r2[1]) / det];
    p2 = [(a11 * r2[0] - a12 * r1[0]) / det, (a11 * r2[1] - a12 * r1[1]) / det];
    // wo die Kurve innen läge, das Ziel um den Fehlbetrag nach außen schieben
    let fehlt = 0;
    for (let i = 1; i < N; i++) {
      const d = ziel[i]![0] - kurveX(p1, p2, ys[i]!);
      if (d > 0.25) {
        schub[i]! += d;
        fehlt = Math.max(fehlt, d);
      }
    }
    if (fehlt < 0.5) break;
  }
  return [p0, p1, p2, p3];
}

export class FigurRaster {
  private readonly koerper = new Map<TeilName, Schluessel[]>();
  private readonly kopf = new Map<TeilName, Schluessel[]>();
  /** Kopf von 0° bis 90° (und gespiegelt von 270° bis 360°) mit dem Anschluss, mit dem Florian die erste Hälfte gesehen hat (`anschlussBauen`) */
  private readonly kopfVorn = new Map<TeilName, Schluessel[]>();
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
        let f = verschieben(k(a, n), -mitten.get(w)![0], -mitten.get(w)![1]);
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
    return out;
  }

  /**
   * Kopf von 90° nach 180°: Florians Rücken ist der Schlüssel bei 180°. Das Gesicht dreht sich weg (Florian, 19.11. abends: „das weiß muss
   * vor der linie bleiben und nur leicht verjüngen“): Die nahe Maske legt sich gleich hinter 90° unter dem Weiß um die Schnauze, dann werden
   * Bart, Nase und Maske gemeinsam gestaucht wie bei einer Drehung (`wegGedreht`) und rücken an den rechten Rand, an dem das Gesicht im
   * Rücken flach liegt. Das Weiß behält so seinen schwarzen Rand und läuft am Ende darin aus; die Nase tritt hinter das Weiß
   * (Malreihenfolge in `teile`). Die ferne Maske taucht unter und wächst links zum Hinterkopf; die Nase des Rückens liegt verborgen im
   * Kopf. Dann die zweite Hälfte (180°–360°): die gespiegelten Schlüssel des Partners (A ↔ B), bei 360° wieder Florians Front.
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
    // Vorderkante der Schnauze im Profil (ferne Maske) und Ort des ganz weggedrehten Gesichts im Rücken
    const b90 = keyBei('kopfB', 90)!;
    let x0 = -Infinity;
    for (const q of punkteVon(b90)) x0 = Math.max(x0, q[0]);
    const weg = (f: Form, w: number): Form => wegGedreht(f, w, x0, xr - RUECKEN_GESICHT_RAND);
    // Bart (nah und fern): gestaucht bis 180°; dort liegt er ohne Breite am rechten Rand der nahen Maske, so hoch wie ihr rechtes Stück
    // (8 → 0), und die Klemme verbirgt ihn im Rand
    {
      let ya = Infinity;
      let yb = -Infinity;
      for (const n of ['bartA', 'bartB'] as TeilName[]) for (const q of punkteVon(keyBei(n, 90)!)) [ya, yb] = [Math.min(ya, q[1]), Math.max(yb, q[1])];
      const a180 = keyBei('kopfA', 180)!;
      const hoehe = { von: [ya, yb] as [number, number], nach: [a180[a180.length - 1]!.p[1] + SCHNAUZE_RAND, a180[0]!.p[1] - SCHNAUZE_RAND] as [number, number] };
      for (const n of ['bartA', 'bartB'] as TeilName[]) {
        const f90 = keyBei(n, 90)!;
        dazu(n, ...GESICHT_WEG.map((w) => ({ w, form: wegGedreht(f90, w, x0, xr - RUECKEN_GESICHT_RAND, hoehe) })));
      }
    }
    // nahe Maske: Der Scheitel (Stück 8 → 0) liegt im Profil unter dem Weiß. Gleich hinter 90° legt er sich um die Schnauze (Umriss aus
    // dem Weiß mit seinem Rand und der fernen Maske), so behält das Weiß seinen Rand, wenn die ferne Maske untertaucht; dann gestaucht
    // wie das Gesicht, von dort zum Rücken
    {
      const [p0, p1, p2, p3] = schnauzenKurve([keyBei('bartA', 90)!, keyBei('bartB', 90)!], b90, SCHNAUZE_RAND);
      const f = keyBei('kopfA', 90)!.map((x) => ({ p: [x.p[0], x.p[1]] as Punkt, i: [x.i[0], x.i[1]] as Punkt, o: [x.o[0], x.o[1]] as Punkt }));
      const a8 = f[f.length - 1]!;
      const a0 = f[0]!;
      a8.i = [p0[0] + a8.i[0] - a8.p[0], p0[1] + a8.i[1] - a8.p[1]];
      a8.p = p0;
      a8.o = p1;
      a0.o = [p3[0] + a0.o[0] - a0.p[0], p3[1] + a0.o[1] - a0.p[1]];
      a0.p = p3;
      a0.i = p2;
      dazu('kopfA', ...WICKEL.map((w) => ({ w, form: weg(f, w) })));
    }
    // Nase: dreht sich vorn an der Schnauze weg, wird zur Spitze hin schmal, bis sie im schwarzen Rand liegt; dort tritt sie hinter das Weiß
    // (bei NASE_HINTER, Malreihenfolge in `teile`; Florian: „die nase muss hinter den kopf wechseln“), zieht sich verborgen zusammen und
    // wächst im Kopf zur Nase des Rückens
    {
      const n90 = keyBei('nase', 90)!;
      let xs = -Infinity;
      for (const q of punkteVon(n90)) xs = Math.max(xs, q[0]);
      const schmal = (w: number, s: number): Form => weg(stauchen(n90, s, xs - 2), w);
      const c = schwerpunkt(weg(n90, NASE_WEG));
      dazu('nase', { w: 95, form: schmal(95, 0.5) }, { w: NASE_HINTER, form: schmal(NASE_HINTER, 0.08) }, { w: NASE_WEG, form: punktForm(n90, [c[0] - 30, c[1]]) });
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
      // fernes Ohr: früh hinter das nahe Ohr (es wird davor gezeichnet), dann links hervor
      const oa = zwischen('ohrA', OHR_HINTER);
      const ob = zwischen('ohrB', OHR_HINTER);
      const ca = schwerpunkt(oa);
      const cb = schwerpunkt(ob);
      dazu('ohrB', { w: OHR_HINTER, form: abbilden(ob, (q) => [ca[0] + (q[0] - cb[0]) * 0.8, ca[1] + (q[1] - cb[1]) * 0.8]) });
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
    // Nase beim Wegdrehen hinter dem Weiß (Florian, 19.11.: „die nase muss hinter den kopf wechseln“): ab NASE_HINTER, wo sie schon im
    // schwarzen Rand der Schnauze liegt (der Wechsel ist nicht zu sehen); gespiegelt in der zweiten Hälfte
    const wegW = thetaKreis > 180 ? 360 - thetaKreis : thetaKreis;
    if (wegW < NASE_HINTER) reihe.push('bartA', 'bartB', 'nase');
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
    // Bart beim Wegdrehen (ab 96°, gespiegelt bis 264°): bleibt mit einem Rand in der nahen Maske (in der ersten Hälfte A, in der zweiten
    // B), die dann um die Schnauze liegt; so behält das Weiß seinen schwarzen Rand und läuft am Ende darin aus. An den Vorlagen ohne Wirkung
    const bartRand = pchip(BART_KLEMME.map((x) => x.w), BART_KLEMME.map((x) => x.rand), wegW);
    const liste = malen.map((n) => {
      const form = koerper.get(n) ?? kopf.get(n)!;
      const t: { name: TeilName; weiss: boolean; form: Form; rand?: number; traeger?: TeilName } = { name: n, weiss: n.startsWith('fenster') || n === 'schwanzW' || n === 'ohrSpalt' || n.startsWith('bart'), form };
      if ((n === 'bartA' || n === 'bartB') && bartRand > -KLEMME_AUSSEN + 1e-6) {
        t.traeger = thetaKreis > 180 ? 'kopfB' : 'kopfA';
        t.rand = bartRand;
      }
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
    return { teile, fluessig: fl, verdecker, ohrspalt: null, deckung: aus.deckung ?? null };
  }
}
