// Ozzy-Figur, Etappe D: Haltungen in der Seite (Stehen, Hocke, Sitzen, Liegen) aus Florians sechs Seitenvorlagen (Logo/Profil,
// sit01/st02, laydown01/02) als Raum mit Gewichten: Jede Haltung hat ein Gewicht, die Summe ist 1, jede Mischung hat genau eine
// Gestalt. Florian (18.11.): „er soll beides können. alle posen müssen smooth ineinanderlaufen. das system muss sehr stabil und
// robust sein.“ – „Die beine dürfen auch nicht durch den boden drehen. Es muss immer smooth sein und immer physikalisch korrekt. Aus
// dem stehen kann er einfach alle viere von sich strecken und auf den bauch rutschen. beim hinsetzen erst das hintere bein krümmen und
// dann nach vorne rausstrecken.“ – „vom sitzen ins liegen soll sich das hintere bein zur kamera in einer fake 3d drehung nach hinten
// drehen.“
//
// Körperteile hängen an Knochen (Drehpunkt, Winkel, Lage des Drehpunkts je Haltung aus einer starren Anpassung an seine Zeichnung)
// plus einer Korrekturform im Knochen; gemischt wird linear nach den Gewichten, an jeder Vorlage steht genau seine Zeichnung.
// Beine haben ein Rückgrat: eine Kurve von der Hüfte zum Fuß (Hermite, Richtung an Hüfte und Sohle). Ihre Lage je Haltung: Hüfte,
// Abstand und Winkel des Fußes zur Hüfte, Biegung an Hüfte und Sohle. Gemischt werden Abstand und Biegung linear, die Richtung als
// Einheitsvektor: Beim Spreizen bleibt das Bein so lang und dreht in der Bildebene; heben sich die Richtungen auf (Hinterbein im
// Sitzen nach vorn, im Liegen nach hinten), zeigt das Bein zur Kamera, wird kurz und bekommt am Fußende seine runde Sohle.
// Die Hocke ist gebaut, nicht gezeichnet: 40 % auf dem Weg zum Sitzen, die Hinterpfoten bleiben stehen, die Hinterbeine krümmen
// sich (Sohle flach). Hinsetzen läuft über die Hocke.
// Der Kopf hat in allen Haltungen dieselbe Form; er wandert nur (Versatz je Haltung, vorn und im Profil), dazu kleine Korrekturen
// (Maske im Liegen). Zwei Reihen (Kopf vorn, Kopf im Profil) werden nach dem Kopfwinkel gemischt.
// Lage der Haltungen zueinander: Beim Hinsetzen bleiben die Vorderpfoten stehen (Vorderbein rechts deckt sich), beim Hinlegen
// bleibt das Hinterteil liegen (hinteres Ende der Bohne wie im Sitzen), alle auf dem Boden.
import { type Form, kasten, type Punkt, schwerpunkt } from './form';
import { type AnsichtName, type FigurDaten, type TeilName, teilVon, WEISS } from './vorlagen/import';

export type HaltungName = 'stehen' | 'hocke' | 'sitzen' | 'liegen';
/** Gewichte der Haltungen (fehlende = 0; werden auf die Summe 1 gebracht, ohne Gewicht: Stehen) */
export type Gewichte = Partial<Record<HaltungName, number>>;

/** Haltungen mit ihren Vorlagen (Kopf vorn, Kopf im Profil); die erste ist das Stehen des Rasters, die Hocke ist gebaut */
export const HALTUNGEN: { name: HaltungName; vorn?: AnsichtName; profil?: AnsichtName }[] = [
  { name: 'stehen', vorn: 'logo', profil: 'profil' },
  { name: 'hocke' },
  { name: 'sitzen', vorn: 'sitz1', profil: 'sitz2' },
  { name: 'liegen', vorn: 'lieg1', profil: 'lieg2' },
];
const I_STEHEN = 0;
const I_HOCKE = 1;
const I_SITZEN = 2;
/** wie weit die Hocke auf dem Weg zum Sitzen liegt */
const HOCKE_ANTEIL = 0.4;
/** Biegung der Hinterbeine in der Hocke an der Hüfte (rad, nach vorn) */
const HOCKE_BIEGUNG = 0.55;
/** Länge der gemischten Beinrichtung, unter der das Bein zur Kamera zeigt und kürzer wird (bis gut 98° Unterschied dreht es in der
 * Bildebene, bei etwa 180° durch die Kamera) */
const KAMERA_SCHWELLE = 0.65;
/** Teile, die in einer Haltung fehlen (Keile zwischen den Beinen), sind nach diesem Anteil des Wegs dorthin ganz zurückgezogen */
const RUECKZUG = 0.3;
/** Streuung der Orte eines Gelenks (Fuß, Hüfte, Schulter; Figur-Einheiten), bis zu der es in den gemischten Haltungen stehen bleibt */
const STEHT = 4;
/** Verkürzung eines Beins zur Kamera, unter der sein Weiß ganz fort ist (1 = volle Länge) */
const KURZ_WEG = 0.45;
/** Verkürzung, unter der die Seitenansicht des Beins auch quer in seine Sohle einläuft (bei 0 ist nur die Sohle übrig) */
const KURZ_BREIT = 0.35;

/** Weg zwischen zwei Haltungen: Hinsetzen (und Aufstehen aus dem Sitzen) über die Hocke, sonst direkt */
export function weg(von: HaltungName, nach: HaltungName): HaltungName[] {
  if (von === nach) return [von];
  if (von === 'stehen' && nach === 'sitzen') return ['stehen', 'hocke', 'sitzen'];
  if (von === 'sitzen' && nach === 'stehen') return ['sitzen', 'hocke', 'stehen'];
  return [von, nach];
}
/** Gewichte auf einem Weg bei t = 0 … 1 (gleich lange Abschnitte) */
export function wegGewichte(w: HaltungName[], t: number): Gewichte {
  if (w.length === 1) return { [w[0]!]: 1 };
  const x = Math.max(0, Math.min(1, t)) * (w.length - 1);
  const i = Math.min(w.length - 2, Math.floor(x));
  const s = x - i;
  const g: Gewichte = {};
  g[w[i]!] = (g[w[i]!] ?? 0) + 1 - s;
  g[w[i + 1]!] = (g[w[i + 1]!] ?? 0) + s;
  return g;
}
/** Kette Stehen (0) – Sitzen (1) – Liegen (2) als Gewichte (Hinsetzen über die Hocke) */
export function gewichteAus(h: number): Gewichte {
  const x = Math.max(0, Math.min(2, h));
  return x <= 1 ? wegGewichte(weg('stehen', 'sitzen'), x) : wegGewichte(['sitzen', 'liegen'], x - 1);
}

/** Gewichte als Liste in der Reihenfolge von HALTUNGEN, nie negativ, Summe 1 */
export function gewichtsliste(g: Gewichte): number[] {
  const w = HALTUNGEN.map((x) => {
    const v = g[x.name] ?? 0;
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  });
  const s = w.reduce((a, b) => a + b, 0);
  if (s < 1e-9) return HALTUNGEN.map((_, i) => (i === 0 ? 1 : 0));
  return w.map((v) => v / s);
}

const KOPFTEILE: TeilName[] = ['ohrB', 'ohrSpalt', 'ohrA', 'kopfB', 'kopfA', 'bartA', 'bartB', 'nase'];
/** Teile, die am Knochen eines anderen hängen */
const ELTER: Partial<Record<TeilName, TeilName>> = {
  fensterRV: 'beinRV',
  fensterRH: 'beinRH',
  fensterLV: 'beinLV',
  fensterLH: 'beinLH',
  keilV: 'beinRV',
  keilH: 'beinRH',
  schwanzW: 'schwanz',
};

interface Knochen {
  /** Drehpunkt in der stehenden Form */
  dreh: Punkt;
  /** je Haltung: Winkel gegen das Stehen (−π … π) und Lage des Drehpunkts */
  winkel: number[];
  lage: Punkt[];
  /** am Körper (alle außer der Bohne): Lage des Drehpunkts und Winkel je Haltung im Knochen der Bohne. Gemischt wird dort, dann mit
   * der gemischten Bohne gedreht: Hüften und Schwanzansatz bleiben auf ihr, auch wenn sie sich zwischen zwei Vorlagen dreht */
  amKoerper?: { lage: Punkt[]; winkel: number[] };
  /** nur Beine */
  bein?: Bein;
}
interface Bein {
  /** Richtung Hüfte → Fuß im Stehen (Einheit) und ihr Winkel, Länge bis zur Sohle, Breite */
  achse: Punkt;
  achsWinkel: number;
  laenge: number;
  breite: number;
  /** je Haltung: Abstand des Fußes von der Hüfte, Winkel der Sehne gegen die Achse im Stehen, Biegung an Hüfte und Sohle (rad) */
  abstand: number[];
  sehne: number[];
  biegH: number[];
  biegF: number[];
  /** je Haltung: wie weit der Fuß der Vorlage unter der Bodengrenze liegt (≥ 0; so viel darf er dort, die Vorlage bleibt genau) */
  tiefer: number[];
  /** je Haltung: Ort des Fußes (Körperkoordinaten); liegt er in den gemischten Haltungen an derselben Stelle, bleibt er dort stehen */
  fuss: Punkt[];
}
interface Teilhaltung {
  knochen: TeilName;
  /** Korrektur je Haltung: je Punkt (Anker, Griff ein, Griff aus) dx, dy im Knochen (bei Beinen längs und quer zur Achse) */
  rest: number[][];
  /** je Haltung: ist das Teil da (1), fehlt es (0)? In der Hocke dazwischen */
  da: number[];
}
type Reihe = 'vorn' | 'profil';

const punkte = (f: Form): Punkt[] => f.flatMap((a) => [a.p, a.i, a.o]);
const alsForm = (q: Punkt[], vorlage: Form): Form => vorlage.map((_, a) => ({ p: q[3 * a]!, i: q[3 * a + 1]!, o: q[3 * a + 2]! }));
const mitte = (ps: Punkt[]): Punkt => {
  let x = 0;
  let y = 0;
  for (const p of ps) {
    x += p[0];
    y += p[1];
  }
  return [x / ps.length, y / ps.length];
};
const drehen = (v: Punkt, w: number): Punkt => [Math.cos(w) * v[0] - Math.sin(w) * v[1], Math.sin(w) * v[0] + Math.cos(w) * v[1]];
const richtung = (w: number): Punkt => [Math.cos(w), Math.sin(w)];
const umbrechen = (w: number): number => {
  let x = w;
  while (x > Math.PI) x -= 2 * Math.PI;
  while (x <= -Math.PI) x += 2 * Math.PI;
  return x;
};
const summe = (xs: number[], w: number[]): number => xs.reduce((a, v, i) => a + v * w[i]!, 0);
/** gewichtete mittlere quadratische Abweichung der Orte von ihrer Mitte m */
const streuung = (orte: Punkt[], w: number[], m: Punkt): number => orte.reduce((a, q, i) => a + w[i]! * ((q[0] - m[0]) ** 2 + (q[1] - m[1]) ** 2), 0);
const lerp = (a: Punkt, b: Punkt, s: number): Punkt => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
/** Kreis aus vier Bézier-Ankern */
const kreis = (c: Punkt, r: number): Form => {
  const k = 0.5523 * r;
  return [
    { p: [c[0], c[1] - r], i: [c[0] - k, c[1] - r], o: [c[0] + k, c[1] - r] },
    { p: [c[0] + r, c[1]], i: [c[0] + r, c[1] - k], o: [c[0] + r, c[1] + k] },
    { p: [c[0], c[1] + r], i: [c[0] + k, c[1] + r], o: [c[0] - k, c[1] + r] },
    { p: [c[0] - r, c[1]], i: [c[0] - r, c[1] + k], o: [c[0] - r, c[1] - k] },
  ];
};

/** tiefste erlaubte Lage der Fußmitte (Boden y = 0, nach unten positiv): bei senkrechter Sohle auf dem Boden, bei waagrechtem Bein
 * eine halbe Beinbreite darüber */
function bodenGrenze(b: { breite: number }, sohlenWinkel: number): number {
  return -(b.breite / 2) * Math.abs(Math.cos(sohlenWinkel));
}

/** starre Anpassung a → b (Drehung um die Mitte, dann Verschiebung): Winkel und beide Mitten */
function starr(a: Punkt[], b: Punkt[]): { w: number; ca: Punkt; cb: Punkt } {
  const ca = mitte(a);
  const cb = mitte(b);
  let sxx = 0;
  let sxy = 0;
  a.forEach((p, i) => {
    const u: Punkt = [p[0] - ca[0], p[1] - ca[1]];
    const v: Punkt = [b[i]![0] - cb[0], b[i]![1] - cb[1]];
    sxx += u[0] * v[0] + u[1] * v[1];
    sxy += u[0] * v[1] - u[1] * v[0];
  });
  return { w: Math.atan2(sxy, sxx), ca, cb };
}

/** gewichtete Summe von Zahlenreihen gleicher Länge */
function mischen(reihen: number[][], w: number[]): number[] {
  const n = reihen[0]?.length ?? 0;
  const out = new Array<number>(n).fill(0);
  reihen.forEach((r, k) => {
    const g = w[k]!;
    if (g === 0) return;
    for (let j = 0; j < n; j++) out[j]! += g * (r[j] ?? 0);
  });
  return out;
}

/** Rückgrat eines Beins: Hermite-Kurve von der Hüfte zum Fuß, außerhalb gerade fortgesetzt; Ort und Richtung bei u */
function rueckgrat(h: Punkt, f: Punkt, th: Punkt, tf: Punkt, u: number): { s: Punkt; t: Punkt } {
  const m = Math.hypot(f[0] - h[0], f[1] - h[1]);
  if (u <= 0) return { s: [h[0] + th[0] * m * u, h[1] + th[1] * m * u], t: th };
  if (u >= 1) return { s: [f[0] + tf[0] * m * (u - 1), f[1] + tf[1] * m * (u - 1)], t: tf };
  const u2 = u * u;
  const u3 = u2 * u;
  const a = 2 * u3 - 3 * u2 + 1;
  const b = u3 - 2 * u2 + u;
  const c = -2 * u3 + 3 * u2;
  const d = u3 - u2;
  const s: Punkt = [a * h[0] + b * m * th[0] + c * f[0] + d * m * tf[0], a * h[1] + b * m * th[1] + c * f[1] + d * m * tf[1]];
  const da = 6 * u2 - 6 * u;
  const db = 3 * u2 - 4 * u + 1;
  const dc = -6 * u2 + 6 * u;
  const dd = 3 * u2 - 2 * u;
  const tx = da * h[0] + db * m * th[0] + dc * f[0] + dd * m * tf[0];
  const ty = da * h[1] + db * m * th[1] + dc * f[1] + dd * m * tf[1];
  const l = Math.hypot(tx, ty);
  return { s, t: l > 1e-9 ? [tx / l, ty / l] : th };
}

export class Haltungen {
  /** Knochen und Korrekturen je Reihe: Kopf vorn (Logo, sit01, laydown01) und im Profil (stand02, st02, laydown02) */
  private readonly knochen: Record<Reihe, Map<TeilName, Knochen>> = { vorn: new Map(), profil: new Map() };
  private readonly teile: Record<Reihe, Map<TeilName, Teilhaltung>> = { vorn: new Map(), profil: new Map() };
  private readonly stand = new Map<TeilName, Form>();
  /** Versatz des Kopfs je Haltung (vorn und im Profil) gegen das Stehen */
  private readonly kopfVorn: Punkt[] = [];
  private readonly kopfProfil: Punkt[] = [];
  /** Mitte des Kopfs im Stehen (vorn, Profil) und je Haltung im Knochen der Bohne */
  private readonly kopfMitte: Record<Reihe, Punkt> = { vorn: [0, 0], profil: [0, 0] };
  private readonly kopfAmKoerper: Record<Reihe, Punkt[]> = { vorn: [], profil: [] };
  /** Korrekturen der Kopfteile je Haltung (vorn, Profil): dx, dy je Punkt */
  private readonly kopfRest = new Map<TeilName, Record<Reihe, number[][]>>();
  /** Malreihenfolge je Haltung (vorn, Profil), null = die des Stehens */
  private readonly reihen: (Record<Reihe, TeilName[]> | null)[] = [];
  /** Verschiebung jeder Haltungsvorlage in Körperkoordinaten */
  readonly versatz = new Map<AnsichtName, Punkt>();
  /** tiefster Punkt jeder Haltung (vorn, Profil) für die Bodenregel; setzt das Raster */
  boden: Record<Reihe, number[]> = { vorn: HALTUNGEN.map(() => 0), profil: HALTUNGEN.map(() => 0) };

  /**
   * @param standKoerper Körperteile im Stehen (Körperkoordinaten, wie das Raster bei ψ = 90)
   * @param standKopf Kopfteile im Stehen, vorn (Logo) und im Profil, in Körperkoordinaten
   */
  constructor(d: FigurDaten, standKoerper: Map<TeilName, Form>, standKopf: Record<Reihe, Map<TeilName, Form>>) {
    for (const [n, f] of standKoerper) this.stand.set(n, f);
    const versatz = this.versatz;
    const roh = (a: AnsichtName, n: TeilName): Form | undefined => teilVon(d.ansichten[a], n)?.form;
    const um = (f: Form, o: Punkt): Form =>
      f.map((x) => ({ p: [x.p[0] + o[0], x.p[1] + o[1]], i: [x.i[0] + o[0], x.i[1] + o[1]], o: [x.o[0] + o[0], x.o[1] + o[1]] }));
    const mitteVon = (f: Form): Punkt => mitte(punkte(f));
    const imKoerper = (a: AnsichtName | undefined, n: TeilName): Form | undefined => {
      if (!a) return undefined;
      const f = roh(a, n);
      const o = versatz.get(a);
      return f && o ? um(f, o) : undefined;
    };
    const deckung = (ziel: Form, quelle: Form): Punkt => [mitteVon(ziel)[0] - mitteVon(quelle)[0], mitteVon(ziel)[1] - mitteVon(quelle)[1]];
    // Lage jeder Haltungsvorlage in Körperkoordinaten
    versatz.set('logo', deckung(standKoerper.get('beinRV')!, roh('logo', 'beinRV')!));
    versatz.set('profil', deckung(standKoerper.get('bohne')!, roh('profil', 'bohne')!));
    for (const [sitz, lieg] of [
      ['sitz1', 'lieg1'],
      ['sitz2', 'lieg2'],
    ] as [AnsichtName, AnsichtName][]) {
      versatz.set(sitz, deckung(standKoerper.get('beinRV')!, roh(sitz, 'beinRV')!));
      const hintenSitz = kasten(imKoerper(sitz, 'bohne')!)[0];
      versatz.set(lieg, [hintenSitz - kasten(roh(lieg, 'bohne')!)[0], -d.ansichten[lieg].boden]);
    }
    // Knochen: Drehpunkte in der stehenden Form
    const drehpunkt = (n: TeilName, f: Form): Punkt => {
      if (n.startsWith('bein')) {
        const [x0, y0, x1, y1] = kasten(f);
        return [(x0 + x1) / 2, y0 + 0.15 * (y1 - y0)];
      }
      if (n === 'schwanz') {
        const c = mitteVon(standKoerper.get('bohne')!);
        let best = f[0]!.p;
        let bd = Infinity;
        for (const a of f) {
          const e = Math.hypot(a.p[0] - c[0], a.p[1] - c[1]);
          if (e < bd) {
            bd = e;
            best = a.p;
          }
        }
        return [best[0], best[1]];
      }
      return mitteVon(f);
    };
    const gezeichnet = (reihe: Reihe, i: number, n: TeilName, f0: Form): Form | undefined => (i === I_STEHEN ? f0 : imKoerper(HALTUNGEN[i]![reihe], n));
    for (const reihe of ['vorn', 'profil'] as const)
      for (const [n, f0] of standKoerper) {
        if (ELTER[n]) continue;
        const dreh = drehpunkt(n, f0);
        const winkel: number[] = [];
        const lage: Punkt[] = [];
        HALTUNGEN.forEach((_, i) => {
          if (i === I_HOCKE) {
            winkel.push(NaN);
            lage.push([NaN, NaN]);
            return;
          }
          const fk = gezeichnet(reihe, i, n, f0);
          if (!fk || fk.length !== f0.length) {
            winkel.push(0);
            lage.push(dreh);
            return;
          }
          const { w, ca, cb } = starr(punkte(f0), punkte(fk));
          const r = drehen([dreh[0] - ca[0], dreh[1] - ca[1]], w);
          winkel.push(i === I_STEHEN ? 0 : umbrechen(w));
          lage.push(i === I_STEHEN ? dreh : [cb[0] + r[0], cb[1] + r[1]]);
        });
        // Hocke: auf dem Weg zum Sitzen
        winkel[I_HOCKE] = winkel[I_SITZEN]! * HOCKE_ANTEIL;
        lage[I_HOCKE] = lerp(lage[I_STEHEN]!, lage[I_SITZEN]!, HOCKE_ANTEIL);
        const kn: Knochen = { dreh, winkel, lage };
        if (n.startsWith('bein')) {
          const [x0, , x1, y1] = kasten(f0);
          const fuss: Punkt = [(x0 + x1) / 2, y1];
          const l = Math.hypot(fuss[0] - dreh[0], fuss[1] - dreh[1]) || 1;
          const achse: Punkt = [(fuss[0] - dreh[0]) / l, (fuss[1] - dreh[1]) / l];
          const bein: Bein = { achse, achsWinkel: Math.atan2(achse[1], achse[0]), laenge: l, breite: x1 - x0, abstand: [], sehne: [], biegH: [], biegF: [], tiefer: [], fuss: [] };
          HALTUNGEN.forEach((_, i) => {
            bein.abstand.push(l);
            bein.sehne.push(winkel[i]!);
            bein.biegH.push(0);
            bein.biegF.push(0);
          });
          // In der Hocke bleiben die Pfoten der Beine stehen, die sich zum Sitzen weit drehen (Hinterbeine): Das Bein krümmt sich
          if (Math.abs(winkel[I_SITZEN]!) > Math.PI / 4) {
            const h = lage[I_HOCKE]!;
            const pf: Punkt = [dreh[0] + achse[0] * l, dreh[1] + achse[1] * l];
            const v: Punkt = [pf[0] - h[0], pf[1] - h[1]];
            const sehne = umbrechen(Math.atan2(v[1], v[0]) - bein.achsWinkel);
            bein.abstand[I_HOCKE] = Math.hypot(v[0], v[1]);
            bein.sehne[I_HOCKE] = sehne;
            bein.biegH[I_HOCKE] = -HOCKE_BIEGUNG;
            bein.biegF[I_HOCKE] = -sehne;
          }
          // Bodengrenze je Haltung: Der Fuß der Vorlage darf so tief liegen, wie Florian ihn gezeichnet hat
          bein.tiefer = HALTUNGEN.map((_, i) => {
            const ws = bein.achsWinkel + bein.sehne[i]!;
            const fy = lage[i]![1] + Math.sin(ws) * bein.abstand[i]!;
            return Math.max(0, fy - bodenGrenze(bein, ws + bein.biegF[i]!));
          });
          bein.fuss = HALTUNGEN.map((_, i) => {
            const ws = bein.achsWinkel + bein.sehne[i]!;
            return [lage[i]![0] + Math.cos(ws) * bein.abstand[i]!, lage[i]![1] + Math.sin(ws) * bein.abstand[i]!];
          });
          kn.bein = bein;
        }
        this.knochen[reihe].set(n, kn);
      }
    // Knochenkette: Beine und Schwanz hängen an der Bohne (Lage und Winkel im Knochen der Bohne, je Haltung)
    for (const reihe of ['vorn', 'profil'] as const) {
      const kb = this.knochen[reihe].get('bohne');
      if (!kb) continue;
      for (const [n, k] of this.knochen[reihe]) {
        if (n === 'bohne') continue;
        k.amKoerper = {
          lage: HALTUNGEN.map((_, i) => drehen([k.lage[i]![0] - kb.lage[i]![0], k.lage[i]![1] - kb.lage[i]![1]], -kb.winkel[i]!)),
          winkel: HALTUNGEN.map((_, i) => umbrechen(k.winkel[i]! - kb.winkel[i]!)),
        };
      }
    }
    // Korrekturen je Teil im Knochen (Kinder hängen am Knochen ihres Elters)
    for (const reihe of ['vorn', 'profil'] as const)
      for (const [n, f0] of standKoerper) {
        const kn = ELTER[n] && this.knochen[reihe].has(ELTER[n]!) ? ELTER[n]! : n;
        const k = this.knochen[reihe].get(kn);
        if (!k) continue;
        const p0 = punkte(f0);
        const leer = (): number[] => new Array<number>(p0.length * 2).fill(0);
        const da: number[] = HALTUNGEN.map((_, i) => {
          if (i === I_HOCKE) return 1;
          const fk = gezeichnet(reihe, i, n, f0);
          return fk && fk.length === f0.length ? 1 : 0;
        });
        const rest = HALTUNGEN.map((_, i) => {
          // fehlt das Teil in dieser Haltung, steht hier seine Form aus dem Stehen; klein wird es beim Mischen (koerperReihe)
          if (i === I_HOCKE || !da[i]) return leer();
          const pk = punkte(gezeichnet(reihe, i, n, f0)!);
          const out: number[] = [];
          p0.forEach((p, j) => {
            const v = drehen([pk[j]![0] - k.lage[i]![0], pk[j]![1] - k.lage[i]![1]], -k.winkel[i]!);
            const r: Punkt = [v[0] - (p[0] - k.dreh[0]), v[1] - (p[1] - k.dreh[1])];
            // bei Beinen längs (t) und quer (n) zur Achse im Stehen
            out.push(...(k.bein ? [r[0] * k.bein.achse[0] + r[1] * k.bein.achse[1], -r[0] * k.bein.achse[1] + r[1] * k.bein.achse[0]] : r));
          });
          return out;
        });
        // Hocke: gekrümmte Beine ohne Korrektur (die gezeichnete Form gekrümmt), sonst auf dem Weg zum Sitzen
        const gekruemmt = k.bein && k.bein.biegH[I_HOCKE] !== 0;
        rest[I_HOCKE] = gekruemmt ? leer() : rest[I_SITZEN]!.map((v) => v * HOCKE_ANTEIL);
        da[I_HOCKE] = gekruemmt ? 1 : 1 - HOCKE_ANTEIL * (1 - da[I_SITZEN]!);
        this.teile[reihe].set(n, { knochen: kn, rest, da });
      }
    // Kopf: Versatz und Korrekturen je Haltung
    const kopfMitte = (formen: (Form | undefined)[]): Punkt => schwerpunkt(formen.filter((f): f is Form => !!f).flat());
    const sv = kopfMitte([standKopf.vorn.get('kopfA'), standKopf.vorn.get('kopfB')]);
    const sp = kopfMitte([standKopf.profil.get('kopfA'), standKopf.profil.get('kopfB')]);
    HALTUNGEN.forEach(({ vorn, profil }, i) => {
      if (i === I_STEHEN || i === I_HOCKE) {
        this.kopfVorn.push([0, 0]);
        this.kopfProfil.push([0, 0]);
        return;
      }
      const mv = kopfMitte([imKoerper(vorn, 'kopfA'), imKoerper(vorn, 'kopfB')]);
      const mp = kopfMitte([imKoerper(profil, 'kopfA'), imKoerper(profil, 'kopfB')]);
      this.kopfVorn.push([mv[0] - sv[0], mv[1] - sv[1]]);
      this.kopfProfil.push([mp[0] - sp[0], mp[1] - sp[1]]);
    });
    this.kopfVorn[I_HOCKE] = lerp(this.kopfVorn[I_STEHEN]!, this.kopfVorn[I_SITZEN]!, HOCKE_ANTEIL);
    this.kopfProfil[I_HOCKE] = lerp(this.kopfProfil[I_STEHEN]!, this.kopfProfil[I_SITZEN]!, HOCKE_ANTEIL);
    // Der Kopf hängt an der Bohne wie die Beine: seine Mitte je Haltung im Knochen der Bohne
    this.kopfMitte.vorn = sv;
    this.kopfMitte.profil = sp;
    for (const reihe of ['vorn', 'profil'] as const) {
      const kb = this.knochen[reihe].get('bohne');
      const versatz = reihe === 'vorn' ? this.kopfVorn : this.kopfProfil;
      const c = this.kopfMitte[reihe];
      this.kopfAmKoerper[reihe] = kb
        ? HALTUNGEN.map((_, i) => drehen([c[0] + versatz[i]![0] - kb.lage[i]![0], c[1] + versatz[i]![1] - kb.lage[i]![1]], -kb.winkel[i]!))
        : [];
    }
    for (const n of KOPFTEILE) {
      const korrektur = (stand: Form | undefined, a: AnsichtName | undefined, v: Punkt, i: number): number[] => {
        if (!stand) return [];
        const f = imKoerper(a, n);
        if (i === I_STEHEN || !f || f.length !== stand.length) return new Array<number>(stand.length * 6).fill(0);
        const ps = punkte(stand);
        const pf = punkte(f);
        const out: number[] = [];
        ps.forEach((p, j) => out.push(pf[j]![0] - v[0] - p[0], pf[j]![1] - v[1] - p[1]));
        return out;
      };
      const vorn = HALTUNGEN.map((x, i) => korrektur(standKopf.vorn.get(n), x.vorn, this.kopfVorn[i]!, i));
      const profil = HALTUNGEN.map((x, i) => korrektur(standKopf.profil.get(n), x.profil, this.kopfProfil[i]!, i));
      vorn[I_HOCKE] = vorn[I_SITZEN]!.map((v) => v * HOCKE_ANTEIL);
      profil[I_HOCKE] = profil[I_SITZEN]!.map((v) => v * HOCKE_ANTEIL);
      if ([...vorn, ...profil].some((r) => r.some((v) => Math.abs(v) > 1e-6))) this.kopfRest.set(n, { vorn, profil });
    }
    for (const { vorn, profil } of HALTUNGEN) this.reihen.push(vorn && profil ? { vorn: d.ansichten[vorn].def.teile.slice(), profil: d.ansichten[profil].def.teile.slice() } : null);
  }

  /** steht Ozzy (ganz) im Stehen des Rasters? */
  static stehtNur(g: Gewichte): boolean {
    return gewichtsliste(g)[I_STEHEN]! > 1 - 1e-9;
  }

  /** Körperteile bei den Gewichten g und Kopfwinkel θ (Reihe vorn → Profil gemischt), Körperkoordinaten wie bei ψ = 90 */
  koerper(g: Gewichte, theta = 0): Map<TeilName, Form> {
    const w = gewichtsliste(g);
    const s = Math.max(0, Math.min(1, theta / 90));
    if (s <= 1e-6) return this.koerperReihe('vorn', w);
    if (s >= 1 - 1e-6) return this.koerperReihe('profil', w);
    const a = this.koerperReihe('vorn', w);
    const b = this.koerperReihe('profil', w);
    const out = new Map<TeilName, Form>();
    const mix = (p: Punkt, q: Punkt): Punkt => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
    for (const [n, f] of a) {
      const h = b.get(n);
      out.set(n, h && h.length === f.length ? f.map((x, i) => ({ p: mix(x.p, h[i]!.p), i: mix(x.i, h[i]!.i), o: mix(x.o, h[i]!.o) })) : f);
    }
    for (const [n, f] of b) if (!out.has(n)) out.set(n, f);
    return out;
  }

  private koerperReihe(reihe: Reihe, w: number[]): Map<TeilName, Form> {
    const out = new Map<TeilName, Form>();
    // Zustand je Knochen; bei Beinen das Rückgrat (Hüfte, Fuß, Richtungen an beiden Enden) und die Verkürzung zur Kamera
    // halb: halbe Breite des Beins quer zur Achse, wie es gerade gemischt ist (für die Sohle)
    type Zustand = { k: Knochen; w: number; p: Punkt; h?: Punkt; f?: Punkt; th?: Punkt; tf?: Punkt; kurz: number; halb?: number };
    const zustand = new Map<TeilName, Zustand>();
    const bohne = this.bohneBei(reihe, w);
    for (const [n, k] of this.knochen[reihe]) {
      let p: Punkt = [summe(k.lage.map((q) => q[0]), w), summe(k.lage.map((q) => q[1]), w)];
      let wk = summe(k.winkel, w);
      if (k.amKoerper && bohne) {
        // an der Bohne: im Knochen der Bohne gemischt, mit ihr gedreht. Liegt das Gelenk in den gemischten Haltungen an derselben
        // Stelle (Schulter beim Hinsetzen), bleibt es dort, wie der Fuß
        const q = drehen([summe(k.amKoerper.lage.map((v) => v[0]), w), summe(k.amKoerper.lage.map((v) => v[1]), w)], bohne.w);
        const steht = Math.exp(-streuung(k.lage, w, p) / (STEHT * STEHT));
        p = lerp([bohne.p[0] + q[0], bohne.p[1] + q[1]], p, steht);
        wk += (bohne.w + summe(k.amKoerper.winkel, w) - wk) * (1 - steht);
      }
      const b = k.bein;
      if (!b) {
        zustand.set(n, { k, w: wk, p, kurz: 1 });
        continue;
      }
      // Richtung der Sehne als Einheitsvektor gemischt: Heben sich die Richtungen auf, zeigt das Bein zur Kamera
      let vx = 0;
      let vy = 0;
      b.sehne.forEach((a, i) => {
        vx += w[i]! * Math.cos(a);
        vy += w[i]! * Math.sin(a);
      });
      const lv = Math.hypot(vx, vy);
      const sehne = lv > 1e-9 ? Math.atan2(vy, vx) : summe(b.sehne, w);
      const kurz = Math.min(1, lv / KAMERA_SCHWELLE);
      const abstand = summe(b.abstand, w) * kurz;
      const ws = b.achsWinkel + sehne;
      const wf = ws + summe(b.biegF, w);
      let f: Punkt = [p[0] + Math.cos(ws) * abstand, p[1] + Math.sin(ws) * abstand];
      // Ein Fuß, der in den gemischten Haltungen an derselben Stelle steht, bleibt dort (er rutscht nicht, wenn die Hüfte mit der
      // Bohne einen Bogen geht); je weiter seine Orte auseinanderliegen, desto mehr folgt er dem Bein
      const fl: Punkt = [summe(b.fuss.map((q) => q[0]), w), summe(b.fuss.map((q) => q[1]), w)];
      f = lerp(f, fl, Math.exp(-streuung(b.fuss, w, fl) / (STEHT * STEHT)));
      // Der Fuß kommt nie unter den Boden: Er gleitet auf ihm, das Bein krümmt sich (Grenze nach der Dicke des Beins quer zur Sohle)
      f[1] = Math.min(f[1], bodenGrenze(b, wf) + summe(b.tiefer, w));
      zustand.set(n, { k, w: sehne, p, h: p, f, th: richtung(ws + summe(b.biegH, w)), tf: richtung(wf), kurz });
    }
    for (const [n, t] of this.teile[reihe]) {
      const f0 = this.stand.get(n)!;
      const z = zustand.get(t.knochen)!;
      const rest = mischen(t.rest, w);
      const b = z.k.bein;
      let q: Punkt[];
      let uMitte = 0;
      if (b && z.h && z.f && z.th && z.tf) {
        const a = b.achse;
        // Zeigt das Bein fast genau zur Kamera, ist es nur noch seine runde Sohle: Die Seitenansicht wird auch quer schmal (sie dreht
        // sich dort, wo die Richtung durch die Kamera geht, in einem Schritt um; so dreht sich nichts Sichtbares)
        const x = Math.min(1, z.kurz / KURZ_BREIT);
        const breit = x * x * (3 - 2 * x);
        q = punkte(f0).map((p, j) => {
          // Lage im Bein: u längs (0 Hüfte, 1 Sohle), v quer; die Korrektur verschiebt beide und geht so mit dem Rückgrat mit
          const r: Punkt = [p[0] - z.k.dreh[0], p[1] - z.k.dreh[1]];
          const u = (r[0] * a[0] + r[1] * a[1] + rest[2 * j]!) / b.laenge;
          const v = -r[0] * a[1] + r[1] * a[0] + rest[2 * j + 1]!;
          uMitte += u;
          if (n === t.knochen) z.halb = Math.max(z.halb ?? 0, Math.abs(v));
          const { s, t: tg } = rueckgrat(z.h!, z.f!, z.th!, z.tf!, u);
          return [s[0] - v * breit * tg[1], s[1] + v * breit * tg[0]];
        });
        uMitte /= q.length;
      } else {
        q = punkte(f0).map((p, j) => {
          const v = drehen([p[0] - z.k.dreh[0] + rest[2 * j]!, p[1] - z.k.dreh[1] + rest[2 * j + 1]!], z.w);
          return [z.p[0] + v[0], z.p[1] + v[1]];
        });
      }
      let form = alsForm(q, f0);
      // Fehlt das Teil in einer der gemischten Haltungen, zieht es sich auf dem ersten Stück des Wegs zurück: an einem Bein auf dessen
      // Achse (Schwarz geht ins Schwarz des Beins, statt seitlich herauszustehen), sonst zur eigenen Mitte
      const da = summe(t.da, w);
      if (da < 1 - 1e-6) {
        const x = Math.max(0, Math.min(1, (da - (1 - RUECKZUG)) / RUECKZUG));
        const k = Math.max(0.01, x * x * (3 - 2 * x));
        const c = b && z.h && n !== t.knochen ? rueckgrat(z.h, z.f!, z.th!, z.tf!, uMitte).s : schwerpunkt(form);
        form = form.map((y) => ({ p: lerp(c, y.p, k), i: lerp(c, y.i, k), o: lerp(c, y.o, k) }));
      }
      // Weiß an einem Bein, das zur Kamera zeigt, wird klein (die Seite des Beins ist dann nicht zu sehen); unter KURZ_WEG ist es
      // ganz fort, damit kein weißer Punkt in der Sohle stehen bleibt
      if (b && z.kurz < 1 && n !== t.knochen && WEISS.has(n)) {
        const c = schwerpunkt(form);
        const x = Math.max(0, Math.min(1, (z.kurz - KURZ_WEG) / (1 - KURZ_WEG)));
        const k = Math.max(0.01, x * x * (3 - 2 * x));
        form = form.map((y) => ({ p: lerp(c, y.p, k), i: lerp(c, y.i, k), o: lerp(c, y.o, k) }));
      }
      out.set(n, form);
    }
    // Sohle: das runde Ende eines Beins, das zur Kamera zeigt (in der Mitte der runden Fußkappe, so groß, wie das Bein von vorn ist)
    for (const [n, z] of zustand) {
      const b = z.k.bein;
      if (!b || !z.h || !z.f || !z.th || !z.tf || z.kurz >= 0.999) continue;
      // so groß, wie das Bein quer zur Achse reicht: Von vorn gesehen ist es rund, kein Streifen ragt aus der Sohle. Sie wächst mit
      // 1 − kurz² (eine Wurzel davon schösse am Anfang aus dem Fuß). Ihre Mitte liegt eine halbe Beinbreite vor dem Fußende: Auf
      // dem Fußende selbst ragte sie, solange sie klein ist, als Punkt aus dem Bein
      const r = Math.max(b.breite / 2, z.halb ?? 0) * (1 - z.kurz * z.kurz);
      const c = rueckgrat(z.h, z.f, z.th, z.tf, 1 - b.breite / 2 / b.laenge).s;
      out.set(('sohle' + n.slice(4)) as TeilName, kreis(c, r));
    }
    return out;
  }

  /** tiefster Punkt der Vorlagen bei den Gewichten (für die Bodenregel: an den Vorlagen ändert sie nichts) */
  bodenBei(g: Gewichte, theta: number): number {
    const w = gewichtsliste(g);
    const s = Math.max(0, Math.min(1, theta / 90));
    return summe(this.boden.vorn, w) * (1 - s) + summe(this.boden.profil, w) * s;
  }

  /** gemischte Lage und Winkel des Knochens der Bohne in einer Reihe */
  private bohneBei(reihe: Reihe, w: number[]): { p: Punkt; w: number } | null {
    const kb = this.knochen[reihe].get('bohne');
    if (!kb) return null;
    return { p: [summe(kb.lage.map((q) => q[0]), w), summe(kb.lage.map((q) => q[1]), w)], w: summe(kb.winkel, w) };
  }

  /** Versatz des Kopfs bei den Gewichten g und Kopfwinkel θ (0 vorn … 90 Profil) gegen das Stehen: Er hängt an der Bohne */
  kopfVersatz(g: Gewichte, theta: number): Punkt {
    const w = gewichtsliste(g);
    const s = Math.max(0, Math.min(1, theta / 90));
    const versatz = (reihe: Reihe): Punkt => {
      const bohne = this.bohneBei(reihe, w);
      const q = this.kopfAmKoerper[reihe];
      if (!bohne || q.length !== w.length) {
        const v = reihe === 'vorn' ? this.kopfVorn : this.kopfProfil;
        return [summe(v.map((x) => x[0]), w), summe(v.map((x) => x[1]), w)];
      }
      const r = drehen([summe(q.map((x) => x[0]), w), summe(q.map((x) => x[1]), w)], bohne.w);
      const c = this.kopfMitte[reihe];
      return [bohne.p[0] + r[0] - c[0], bohne.p[1] + r[1] - c[1]];
    };
    const a = versatz('vorn');
    const b = versatz('profil');
    return [a[0] * (1 - s) + b[0] * s, a[1] * (1 - s) + b[1] * s];
  }

  /** Korrektur eines Kopfteils bei den Gewichten g (an der Form im Stehen, schon am Ort) */
  kopfKorrektur(n: TeilName, form: Form, g: Gewichte, theta: number): Form {
    const r = this.kopfRest.get(n);
    if (!r) return form;
    const w = gewichtsliste(g);
    const s = Math.max(0, Math.min(1, theta / 90));
    const rv = mischen(r.vorn, w);
    const rp = mischen(r.profil, w);
    const q = punkte(form).map((p, j): Punkt => [
      p[0] + (rv[2 * j] ?? 0) * (1 - s) + (rp[2 * j] ?? 0) * s,
      p[1] + (rv[2 * j + 1] ?? 0) * (1 - s) + (rp[2 * j + 1] ?? 0) * s,
    ]);
    return alsForm(q, form);
  }

  /** größtes Gewicht (1 genau an einer Haltung) */
  static groesstes(g: Gewichte): number {
    return Math.max(...gewichtsliste(g));
  }

  /** Index der Haltung mit dem größten Gewicht (bei Gleichstand die spätere) */
  static fuehrend(g: Gewichte): number {
    const w = gewichtsliste(g);
    let best = 0;
    w.forEach((v, i) => {
      if (v >= w[best]! - 1e-9) best = i;
    });
    return best;
  }

  /** Malreihenfolge der führenden Haltung; fehlende Teile hinter die Beine (Körper) bzw. unter das nahe Ohr (Ohrspalt) */
  reihe(g: Gewichte, theta: number, alle: TeilName[]): TeilName[] {
    return this.reiheVon(Haltungen.fuehrend(g), theta < 45 ? 'vorn' : 'profil', alle);
  }

  /**
   * Weiche Malreihenfolge: für jedes weiße Teil der Liste (Malreihenfolge, mit Sohlen) je schwarzem Teil der Anteil, zu dem dieses
   * darüber liegt, gemischt nach den Gewichten und dem Kopfwinkel wie die Formen. An einer Vorlage ist jeder Anteil 0 oder 1 (ihre
   * Reihenfolge); dazwischen deckt der Renderer nach dem Anteil zu, statt beim Wechsel der führenden Haltung umzuklappen.
   * null, wenn alle Anteile 0 oder 1 sind. `alle`: Teile ohne Sohlen in der Reihenfolge des Rasters.
   */
  deckung(g: Gewichte, theta: number, liste: { name: TeilName; weiss: boolean }[], alle: TeilName[]): number[][] | null {
    const w = gewichtsliste(g);
    const s = Math.max(0, Math.min(1, theta / 90));
    const raenge: { g: number; rang: (n: TeilName) => number }[] = [];
    w.forEach((wi, i) => {
      for (const [reihe, anteil] of [['vorn', 1 - s], ['profil', s]] as [Reihe, number][]) {
        if (wi * anteil <= 1e-9) continue;
        const m = new Map(this.reiheVon(i, reihe, alle).map((n, k) => [n, k]));
        // eine Sohle liegt direkt über ihrem Bein
        raenge.push({ g: wi * anteil, rang: (n) => m.get(n) ?? (n.startsWith('sohle') ? (m.get(('bein' + n.slice(5)) as TeilName) ?? -1) + 0.5 : -1) });
      }
    });
    let weich = false;
    const out = liste.map((c) =>
      !c.weiss
        ? []
        : liste.map((b) => {
            if (b.weiss) return 0;
            let a = 0;
            for (const r of raenge) if (r.rang(b.name) > r.rang(c.name)) a += r.g;
            if (a > 1e-6 && a < 1 - 1e-6) weich = true;
            return Math.max(0, Math.min(1, a));
          }),
    );
    return weich ? out : null;
  }

  private reiheVon(i: number, reihe: Reihe, alle: TeilName[]): TeilName[] {
    const r0 = this.reihen[i];
    if (!r0) return alle.slice();
    const r = r0[reihe];
    const out = r.filter((n) => alle.includes(n));
    for (const n of alle) {
      if (out.includes(n)) continue;
      if (n === 'ohrSpalt') {
        // vorn liegt der Ohrspalt unter dem nahen Ohr: direkt davor malen
        const j = out.indexOf('ohrA');
        out.splice(j >= 0 ? j : 0, 0, n);
      } else {
        const j = out.indexOf('bohne');
        out.splice(j >= 0 ? j + 1 : 0, 0, n);
      }
    }
    return out;
  }

  /** Vorlage, wenn genau eine gezeichnete Haltung außer dem Stehen gilt (θ 0 oder 90), sonst null */
  vorlageBei(g: Gewichte, theta: number): AnsichtName | null {
    const w = gewichtsliste(g);
    const i = w.findIndex((v) => v > 1 - 1e-3);
    if (i < 1 || !HALTUNGEN[i]!.vorn) return null;
    if (Math.abs(theta) < 0.6) return HALTUNGEN[i]!.vorn!;
    if (Math.abs(theta - 90) < 0.6) return HALTUNGEN[i]!.profil!;
    return null;
  }
}
