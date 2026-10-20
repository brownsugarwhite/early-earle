// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: Messung der Extremreihe so, wie der Editor baut — der
// Worker-Bau `wesenBauen` mit den Standards eines neuen Wesens (Haut glatt, Umrisse berühren „mittel“), Körper Röhre oder
// Teile; frisch oder in Florians Ablauf (Stationen der Startkugel eingefroren; nach jedem Bau schreibt der Editor den
// wirksamen Stand zurück und baut, wenn er sich geändert hat, noch einmal — wie `kernBauen`). Gemessen: Δ und Saum je
// Blatt, Widerspruch, Falten nach Zonen, Durchdringungen, Käfiggüte, Rauschen der Netzlinien (Stücke, Knicke über 45°,
// Schleifen), P-Linien (auf der Haut, Kante an der Linie), Bau- und Zugzeit. DOM-frei.
import { type Dokument, type Kante, type Knoten3, neuesDokument } from '../../dokument';
import type { Kaefig } from '../../kaefig/halbkanten';
import { pfadAbtasten, vollerPfad } from '../../profil';
import { selbstDurchdringungen } from '../../versuch/pruefen';
import type { Ableitung } from '../ableiten';
import { type BaumAbleitung, baumAbleiten, baumFalten, baumFeinesNetz } from '../grundkoerper/baumBau';
import { teilbaum } from '../grundkoerper/teilbaum';
import { type NetzSicht, RAND, aufHaut as aufHautLegen, sichtRaster } from '../netzSicht';
import { umrissStuecke } from '../abweichung';
import { feinesNetz } from '../pruefstand';
import { feinKette } from '../reifen';
import { type Bauplan, type WesenNetz, type WesenStand, wesenBauen } from '../wesen';
import { type ExtremKoerper, type ExtremLinie, extremSelbstschnitte } from './extremreihe';
import { type Zone, type ZonenFalten, faltenNachZonen, faltenNachZonenRoehre } from './zonen';

type V3 = [number, number, number];
export type Blatt = 'seite' | 'front' | 'top';
const BLAETTER: readonly Blatt[] = ['seite', 'front', 'top'];
const PX = 461;
/** Uhr ohne DOM-Typen (wie in `wesen.ts`): `performance`, wo es sie gibt, sonst `Date`. */
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

export type Bauart = 'roehre' | 'teile';
export type Ablauf = 'frisch' | 'kugel';

/** Zonen, die die Extremreihe ausweist (das Maul kommt in ihr nicht vor). */
export const MESS_ZONEN = ['frei', 'kappe', 'ansatz', 'kante', 'spitze'] as const satisfies readonly Zone[];
export type MessZone = (typeof MESS_ZONEN)[number];

export type ExtremMessung = {
  name: string;
  gruppe: string;
  art: Bauart;
  ablauf: Ablauf;
  /** Selbstschnitte der drei Umrisse zusammen (0 = sauberer Prüfkörper) */
  selbstschnitte: number;
  /** Fehler des Baus; bei „Teile“: Der Baum scheiterte und das Netz zeigt die Röhre (wie im Editor) */
  fehler?: string;
  /** Δ Körper ↔ Zeichnung je Blatt (px bei 461 je Kachel), größter Widerspruch der Zeichnungen */
  delta: Record<Blatt, { max: number; mittel: number; widerspruch: number }>;
  /** Länge des gelben Saums je Blatt (px): Umriss, an dem der Körper > 2 px von der Zeichnung abweicht */
  saum: Record<Blatt, number>;
  /** Falten nach Zonen: größter Winkel (Grad) und Kanten über 20° */
  falten: Record<MessZone, { max: number; ueber20: number }>;
  /** sich durchdringende Dreieckspaare des gezeigten Netzes */
  durchdringungen: number;
  /** Käfiggüte: kleinster Innenwinkel (Grad), größtes Seitenverhältnis */
  kaefig: { punkte: number; flaechen: number; winkel: number; seiten: number };
  /**
   * Umrisslinien je Ansicht, wie der Editor sie in den fremden Blättern zeigt (`umrissLinien`): Stücke, Knicke über 45° (außer
   * an gezeichneten Ecken; die an Falten des Körpers getrennt) und Schleifen (Kringel bis 30 px, die sich auch in der Tiefe
   * berühren) nach Vereinfachen auf ½ px, Abstand in der eigenen Ansicht zur Silhouette und zur Haut (px)
   */
  rauschen: Record<Blatt, LinienMass>;
  /** Bauzeit (genauer Bau ohne Stand, ms), Zugzeit (schneller Bau nach einem Zug von 2 px, ms), Zahl der Bauten bis zum Stand */
  zeit: { bau: number; zug: number; baue: number };
  /** Teile: Streifen und seitliche Röhren des Baums */
  baum?: { streifen: number; seiten: number };
  /**
   * mit den P-Linien des Körpers: Art je Linie, Abstand der gezeigten Linie (auf die Haut ohne Linien gelegt, wie im
   * Liniennetz) zur Haut mit Linien und der neuen Kante zu ihr (px), Falten frei/Kante, Bauzeit
   */
  linien?: { anzahl: number; arten: string[]; aufHaut: number; kante: number; freiMax: number; kanteMax: number; bau: number };
};

/** Bauplan wie im Editor für ein neues Wesen (Ausstattung glatt + mittel), ohne Look und Trefferdaten. */
export function editorPlan(art: Bauart): Partial<Bauplan> {
  return { glatt: true, fuelle: 'mittel', koerper: art, maul: 'aus', beine: 'aus', gewichte: {}, schwung: 0, stil: 'fest', earle: false, kaefigLinien: false, treffer: false };
}

export type EditorBau = { dok: Dokument; netz: WesenNetz; stand: WesenStand; ms: number; baue: number };

/**
 * Bau wie im Editor: genauer Bau, dann schreibt `kernBauen` die wirksamen Stationen zurück (samt erkannter Teile); hat sich
 * der Stand geändert, folgt ein weiterer Bau (höchstens drei). `ms` = Zeit des ersten Baus.
 */
export function editorBauen(dok: Dokument, plan: Partial<Bauplan>, stand: WesenStand | null = null): EditorBau {
  let d = dok;
  let st = stand;
  let ms = 0;
  let r: ReturnType<typeof wesenBauen> | null = null;
  let baue = 0;
  while (baue < 3) {
    const t0 = jetzt();
    r = wesenBauen(d, plan, st, false);
    if (!baue) ms = jetzt() - t0;
    baue++;
    st = r.stand;
    const g = r.netz.info.stationen;
    if (!g || JSON.stringify(g) === JSON.stringify(d.kaefig?.stationen ?? null)) break;
    d = { ...d, kaefig: { deltas: [], ...d.kaefig, stationen: g } };
  }
  return { dok: d, netz: r!.netz, stand: st!, ms, baue };
}

const startKugel = new Map<Bauart, Dokument>();

/** Startkugel nach ihrem ersten Bau im Editor (eingefrorene Stationen), je Körperart einmal gemerkt. */
export function startkugel(art: Bauart): Dokument {
  let d = startKugel.get(art);
  if (!d) {
    d = editorBauen(neuesDokument('kugel'), editorPlan(art)).dok;
    startKugel.set(art, d);
  }
  return d;
}

/** Dokument eines Prüfkörpers im Ablauf: frisch, oder mit den Stationen der Startkugel (Florian formt die Kugel um). */
export function imAblauf(dok: Dokument, art: Bauart, ablauf: Ablauf): Dokument {
  if (ablauf === 'frisch') return dok;
  const g = startkugel(art).kaefig?.stationen;
  return g ? { ...dok, kaefig: { deltas: [], ...dok.kaefig, stationen: g } } : dok;
}

/** Käfiggüte: kleinster Innenwinkel (Grad) und größtes Seitenverhältnis (längste / kürzeste Kante) je Fläche. */
export function kaefigGuete(k: Kaefig, flaechen?: (f: number) => boolean): { winkel: number; seiten: number; winkelOrt: number } {
  let winkel = 180;
  let seiten = 1;
  let winkelOrt = -1;
  const P = k.xyz;
  for (let f = 0; f < k.nF; f++) {
    if (flaechen && !flaechen(f)) continue;
    const a = k.fStart[f]!;
    const b = k.fStart[f + 1]!;
    const m = b - a;
    const l: number[] = [];
    for (let h = 0; h < m; h++) {
      const p = k.fVerts[a + h]!;
      const q = k.fVerts[a + ((h + 1) % m)]!;
      const r = k.fVerts[a + ((h + m - 1) % m)]!;
      const u = [P[3 * q]! - P[3 * p]!, P[3 * q + 1]! - P[3 * p + 1]!, P[3 * q + 2]! - P[3 * p + 2]!];
      const v = [P[3 * r]! - P[3 * p]!, P[3 * r + 1]! - P[3 * p + 1]!, P[3 * r + 2]! - P[3 * p + 2]!];
      const lu = Math.hypot(u[0]!, u[1]!, u[2]!);
      const lv = Math.hypot(v[0]!, v[1]!, v[2]!);
      l.push(lu);
      const c = (u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / (lu * lv || 1);
      const w = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
      if (w < winkel) {
        winkel = w;
        winkelOrt = f;
      }
    }
    seiten = Math.max(seiten, Math.max(...l) / Math.max(1e-12, Math.min(...l)));
  }
  return { winkel, seiten, winkelOrt };
}

/** Länge des gelben Saums in px: Stücke des Körperumrisses (Tripel x, y, d; NaN trennt), die > 2 px neben der Zeichnung liegen. */
function saumLaenge(s: Float32Array | undefined): number {
  if (!s) return 0;
  let L = 0;
  for (let i = 3; i < s.length; i += 3) {
    const x0 = s[i - 3]!;
    const x1 = s[i]!;
    if (Number.isNaN(x0) || Number.isNaN(x1) || !(s[i - 1]! > 2 && s[i + 2]! > 2)) continue;
    L += Math.hypot(x1 - x0, s[i + 1]! - s[i - 2]!);
  }
  return L * PX;
}

/**
 * Ramer–Douglas–Peucker: Zug ohne Ausschläge unter `eps` (gleiche Einheit wie die Punkte, beliebige Dimension; mit `dim`
 * zählen nur die ersten Koordinaten).
 */
function vereinfachen<T extends readonly number[]>(pts: readonly T[], eps: number, dim?: number): T[] {
  if (pts.length < 3) return pts.slice();
  const behalten = new Uint8Array(pts.length);
  behalten[0] = 1;
  behalten[pts.length - 1] = 1;
  const stapel: [number, number][] = [[0, pts.length - 1]];
  while (stapel.length) {
    const [a, b] = stapel.pop()!;
    const A = pts[a]!;
    const B = pts[b]!;
    // Abstände nur in den ersten `dim` Koordinaten (weitere fahren mit, z. B. die Tiefe zu einem Bildpunkt)
    const d = dim ?? A.length;
    let l = 0;
    for (let k = 0; k < d; k++) l += (B[k]! - A[k]!) ** 2;
    let best = -1;
    let bd = eps;
    for (let i = a + 1; i < b; i++) {
      const P = pts[i]!;
      let t = 0;
      for (let k = 0; k < d; k++) t += (P[k]! - A[k]!) * (B[k]! - A[k]!);
      t = l > 0 ? Math.max(0, Math.min(1, t / l)) : 0;
      let q = 0;
      for (let k = 0; k < d; k++) q += (P[k]! - A[k]! - t * (B[k]! - A[k]!)) ** 2;
      if (Math.sqrt(q) > bd) {
        bd = Math.sqrt(q);
        best = i;
      }
    }
    if (best >= 0) {
      behalten[best] = 1;
      stapel.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => behalten[i]);
}

/** Projektion in ein Blatt (Seite x/y, Front z/y, Top x/z). */
const blatt2 = (x: number, y: number, z: number, a: Blatt): [number, number] => (a === 'seite' ? [x, y] : a === 'front' ? [z, y] : [x, z]);

/**
 * Schleifen eines Polygonzugs im Bild (u, v) mit der Tiefe t je Punkt: Kreuzungen nicht benachbarter Strecken, zwischen
 * denen der Zug höchstens `SCHLEIFE` lang ist und an denen sich die Linie auch in der Tiefe fast berührt (unter 1 px) —
 * ein Kringel der Linie selbst. Keine Schleife ist es, wenn zwei Stücke einer glatten 3D-Linie nur im Bild übereinander
 * liegen (sie liegen dort hintereinander): die obere und die untere Hälfte des Front-Umrisses im Top, Hin- und Rückweg an
 * einer Umkehrstelle (an der breitesten Stelle läuft die Linie entlang der Blickrichtung).
 */
function kreuzungen(pts: readonly (readonly [number, number, number])[]): number {
  const m = pts.length;
  const kreuz = (a: readonly number[], b: readonly number[], c: readonly number[]) => (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
  const bogen = [0];
  for (let i = 1; i < m; i++) bogen.push(bogen[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  let n = 0;
  for (let i = 0; i + 1 < m; i++) {
    for (let j = i + 2; j + 1 < m && bogen[j]! - bogen[i + 1]! <= SCHLEIFE; j++) {
      const p = pts[i]!;
      const p2 = pts[i + 1]!;
      const q = pts[j]!;
      const q2 = pts[j + 1]!;
      const a1 = kreuz(p, p2, q);
      const a2 = kreuz(p, p2, q2);
      const b1 = kreuz(q, q2, p);
      const b2 = kreuz(q, q2, p2);
      if (a1 * a2 >= 0 || b1 * b2 >= 0) continue;
      // Tiefe beider Strecken am Kreuzungspunkt
      const s = b1 / (b1 - b2);
      const t = a1 / (a1 - a2);
      if (Math.abs(p[2] + s * (p2[2] - p[2]) - (q[2] + t * (q2[2] - q[2]))) < BERUEHRT) n++;
    }
  }
  return n;
}

/** Längster Kringel, der als Schleife zählt (Bogenlänge zwischen den sich kreuzenden Strecken) */
const SCHLEIFE = 30 / PX;
/** Abstand in der Tiefe, unter dem sich die Linie an einer Kreuzung im Bild selbst berührt */
const BERUEHRT = 1 / PX;

/**
 * Maß der Umrisslinien je Ansicht: `knicke` ohne gezeichnete Ecken und ohne Falten des Körpers; `falte` = Knicke dort, wo
 * der Körper selbst knickt (Flächen über 30° gegeneinander, 3 px um den Knick) — dort muss die Linie mitknicken.
 */
export type LinienMass = { stuecke: number; knicke: number; falte: number; schleifen: number; eigen: number; haut: number };

/** Knickstellen des Netzes (Mitten der Kanten, deren Flächen über 30° gegeneinander stehen) mit Suche im Umkreis von 3 px. */
function faltenStellen(punkte: readonly V3[], flaechen: readonly (readonly number[])[]): (p: V3) => boolean {
  const n = flaechen.map((f) => {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let k = 0; k < f.length; k++) {
      const a = punkte[f[k]!]!;
      const b = punkte[f[(k + 1) % f.length]!]!;
      x += (a[1] - b[1]) * (a[2] + b[2]);
      y += (a[2] - b[2]) * (a[0] + b[0]);
      z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l] as V3;
  });
  const h = 3 / PX;
  const zellen = new Map<string, V3[]>();
  const kanten = new Map<number, number>();
  const N = punkte.length;
  const grenze = Math.cos((30 * Math.PI) / 180);
  flaechen.forEach((f, fi) => {
    for (let k = 0; k < f.length; k++) {
      const a = f[k]!;
      const b = f[(k + 1) % f.length]!;
      const schl = a < b ? a * N + b : b * N + a;
      const o = kanten.get(schl);
      if (o === undefined) {
        kanten.set(schl, fi);
        continue;
      }
      const n0 = n[o]!;
      const n1 = n[fi]!;
      if (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2] > grenze) continue;
      const m: V3 = [(punkte[a]![0] + punkte[b]![0]) / 2, (punkte[a]![1] + punkte[b]![1]) / 2, (punkte[a]![2] + punkte[b]![2]) / 2];
      const z = `${Math.floor(m[0] / h)},${Math.floor(m[1] / h)},${Math.floor(m[2] / h)}`;
      (zellen.get(z) ?? zellen.set(z, []).get(z)!).push(m);
    }
  });
  return (p) => {
    const [i, j, k] = [Math.floor(p[0] / h), Math.floor(p[1] / h), Math.floor(p[2] / h)];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const m of zellen.get(`${i + a},${j + b},${k + c}`) ?? []) if (Math.hypot(m[0] - p[0], m[1] - p[1], m[2] - p[2]) <= h) return true;
    return false;
  };
}

/**
 * Die Umrisslinien, wie der Editor sie in den fremden Blättern zeigt (Plan V2: „je Umrissstück ein Zug, keine Knicke über
 * 45° außer an gezeichneten Ecken, keine Schleifen; in der eigenen Ansicht ≤ 0,5 px auf der Silhouette, ≤ 1 px auf der
 * Haut“) — ab V2 die Züge `umriss-<Ansicht>`, vorher die Randproben der Konturen (die lila Front-Linie in Seite und Top).
 * Stücke je gezeichneter Hälfte (ohne Spiegelbilder, Kennung „…s“); Knicke und Schleifen auf allen Zügen nach Vereinfachen
 * auf ½ px, Knicke näher als 3 px an einer gezeichneten Ecke zählen nicht. `eigen` = größter Abstand der Linie in ihrer
 * eigenen Ansicht zu den Silhouettenkanten des Netzes, `haut` = größter Abstand zur Haut (px); ohne Netz 0.
 */
export function umrissLinien(ns: NetzSicht | null, dok?: Dokument, punkte?: readonly V3[], flaechen?: readonly (readonly number[])[]): Record<Blatt, LinienMass> {
  const out = {} as Record<Blatt, LinienMass>;
  const sk = dok?.skalierung ?? 1;
  const anFalte = punkte && flaechen ? faltenStellen(punkte, flaechen) : () => false;
  for (const a of BLAETTER) {
    let stuecke = 0;
    let knicke = 0;
    let falte = 0;
    let schleifen = 0;
    let eigen = 0;
    let haut = 0;
    // Läufe: die Umrisslinien (V2) bzw. zusammenhängende Randproben der Konturen
    const laeufe: V3[][] = [];
    const spiegel: boolean[] = [];
    const neu = (ns?.zuege ?? []).filter((z) => z.art === `umriss-${a}`);
    for (const z of neu.length ? neu : (ns?.zuege ?? []).filter((q) => q.art === `kontur-${a}`)) {
      let lauf: V3[] = [];
      const fertig = () => {
        if (lauf.length) {
          laeufe.push(lauf);
          spiegel.push(z.id.endsWith('s'));
        }
        lauf = [];
      };
      for (let i = 0; i < z.sicht.length; i++) {
        if (neu.length || z.sicht[i]! & RAND) lauf.push([z.punkte[3 * i]!, z.punkte[3 * i + 1]!, z.punkte[3 * i + 2]!]);
        else fertig();
      }
      fertig();
    }
    // gezeichnete Ecken in der eigenen Ansicht (Halbprofile auch gespiegelt)
    const ecken: [number, number][] = [];
    for (const k of dok?.profile[a].knoten ?? []) {
      if (k.art !== 'ecke') continue;
      ecken.push([k.p.x * sk, k.p.y * sk]);
      if (a === 'front') ecken.push([-k.p.x * sk, k.p.y * sk]);
      if (a === 'top') ecken.push([k.p.x * sk, -k.p.y * sk]);
    }
    const anEcke = (q: V3) => {
      const [u, v] = blatt2(q[0], q[1], q[2], a);
      return ecken.some(([x, y]) => Math.hypot(x - u, y - v) * PX < 3);
    };
    const um = punkte && flaechen ? umrissStuecke(punkte, flaechen, a, 4 / PX) : null;
    for (const [li, roh] of laeufe.entries()) {
      if (roh.length < 2) continue;
      // Stücke je gezeichneter Hälfte (das Spiegelbild ist dasselbe Stück der anderen Seite)
      if (!spiegel[li]) stuecke++;
      // Ausschläge unter ½ px sieht man nicht: erst vereinfachen, dann Knicke und Schleifen zählen
      const l = vereinfachen(roh, 0.5 / PX);
      for (let i = 1; i + 1 < l.length; i++) {
        const p = l[i - 1]!;
        const q = l[i]!;
        const r = l[i + 1]!;
        const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
        const v = [r[0] - q[0], r[1] - q[1], r[2] - q[2]];
        const c = (u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!) / (Math.hypot(u[0]!, u[1]!, u[2]!) * Math.hypot(v[0]!, v[1]!, v[2]!) || 1);
        if ((Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI > 45 && !anEcke(q)) {
          if (anFalte(q)) falte++;
          else knicke++;
        }
      }
      // Schleifen in den Blättern, in denen die Linie erscheint (die beiden anderen)
      for (const b of BLAETTER) {
        if (b === a) continue;
        const t = b === 'seite' ? 2 : b === 'front' ? 0 : 1;
        schleifen += kreuzungen(vereinfachen(roh.map((p) => [...blatt2(p[0], p[1], p[2], b), p[t]] as [number, number, number]), 0.5 / PX, 2));
      }
      if (um && punkte && flaechen) {
        for (let i = 0; i < roh.length; i++) {
          const p = roh[i]!;
          const [u, v] = blatt2(p[0], p[1], p[2], a);
          const q = um.naechster({ x: u, y: v }, 20 / PX);
          eigen = Math.max(eigen, q ? Math.hypot(q.x - u, q.y - v) * PX : 20);
          if (i % 3 === 0) haut = Math.max(haut, Math.min(20, abstandFlaeche(p, punkte, flaechen) * PX));
        }
      }
    }
    out[a] = { stuecke, knicke, falte, schleifen, eigen, haut };
  }
  return out;
}

/** Größtes z der Haut über (x, y) (Strahl von +z, wie der Stift im Seitenblatt die Tiefe nimmt); null außerhalb. */
export function hautZ(punkte: readonly V3[], flaechen: readonly (readonly number[])[], x: number, y: number): number | null {
  let best = -Infinity;
  for (const f of flaechen) {
    for (let k = 1; k + 1 < f.length; k++) {
      const a = punkte[f[0]!]!;
      const b = punkte[f[k]!]!;
      const c = punkte[f[k + 1]!]!;
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(d) < 1e-18) continue;
      const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
      const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      best = Math.max(best, l1 * a[2] + l2 * b[2] + l3 * c[2]);
    }
  }
  return best > -Infinity ? best : null;
}

/** Kasten um den Seitenumriss (für relative Linienzüge). */
function seitenKasten(dok: Dokument): { x0: number; x1: number; y0: number; y1: number } {
  const p = pfadAbtasten(vollerPfad(dok.profile.seite), 16);
  return { x0: Math.min(...p.map((q) => q.x)), x1: Math.max(...p.map((q) => q.x)), y0: Math.min(...p.map((q) => q.y)), y1: Math.max(...p.map((q) => q.y)) };
}

/**
 * P-Linie auf die Haut legen wie der Stift im Seitenblatt: Zug abtasten, je Probe die Tiefe der sichtbaren Haut; Proben neben
 * dem Körper fallen weg. Daraus sieben glatte Knoten (wie eine gezeichnete Linie) mit der Härte der Linie.
 */
export function linieAufHaut(dok: Dokument, linie: ExtremLinie, punkte: readonly V3[], flaechen: readonly (readonly number[])[]): Kante | null {
  const k = seitenKasten(dok);
  const zug = linie.relativ ? linie.zug.map(([u, v]) => [k.x0 + u * (k.x1 - k.x0), k.y0 + v * (k.y1 - k.y0)] as [number, number]) : linie.zug;
  // Zug gleichmäßig abtasten
  const L: number[] = [0];
  for (let i = 1; i < zug.length; i++) L.push(L[i - 1]! + Math.hypot(zug[i]![0] - zug[i - 1]![0], zug[i]![1] - zug[i - 1]![1]));
  const proben: V3[] = [];
  const n = 48;
  let s = 0;
  for (let q = 0; q <= n; q++) {
    const t = (L[L.length - 1]! * q) / n;
    while (s + 1 < zug.length - 1 && L[s + 1]! < t) s++;
    const f = (t - L[s]!) / (L[s + 1]! - L[s]! || 1);
    const x = zug[s]![0] + f * (zug[s + 1]![0] - zug[s]![0]);
    const y = zug[s]![1] + f * (zug[s + 1]![1] - zug[s]![1]);
    const z = hautZ(punkte, flaechen, x, y);
    if (z !== null && z > 1e-4) proben.push([x, y, z]);
  }
  if (proben.length < 4) return null;
  const sk = dok.skalierung;
  const m = 7;
  const pts = Array.from({ length: m }, (_, i) => {
    const p = proben[Math.round((i * (proben.length - 1)) / (m - 1))]!;
    return [p[0] / sk, p[1] / sk, p[2] / sk] as V3;
  });
  const knoten: Knoten3[] = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(m - 1, i + 1)]!;
    const t: V3 = [(b[0] - a[0]) / 6, (b[1] - a[1]) / 6, (b[2] - a[2]) / 6];
    return { p, ein: i === 0 ? [0, 0, 0] : [-t[0], -t[1], -t[2]], aus: i === m - 1 ? [0, 0, 0] : t, art: 'glatt' };
  });
  return { knoten, haerte: knoten.map(() => linie.haerte), blick: 'seite' };
}

/** Kante als dichter Zug (Bézier je Abschnitt). */
function kanteAbtasten(k: Kante, je = 12): V3[] {
  const out: V3[] = [];
  for (let i = 0; i + 1 < k.knoten.length; i++) {
    const a = k.knoten[i]!;
    const b = k.knoten[i + 1]!;
    const P0 = a.p;
    const P1: V3 = [a.p[0] + a.aus[0], a.p[1] + a.aus[1], a.p[2] + a.aus[2]];
    const P2: V3 = [b.p[0] + b.ein[0], b.p[1] + b.ein[1], b.p[2] + b.ein[2]];
    const P3 = b.p;
    for (let q = 0; q < je; q++) {
      const t = q / je;
      const u = 1 - t;
      const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const;
      out.push([0, 1, 2].map((d) => w[0] * P0[d]! + w[1] * P1[d]! + w[2] * P2[d]! + w[3] * P3[d]!) as V3);
    }
  }
  out.push(k.knoten[k.knoten.length - 1]!.p);
  return out;
}

/** Abstand eines Punkts zu einem Zug. */
function abstandZug(p: ArrayLike<number>, zug: readonly V3[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap = [p[0]! - a[0], p[1]! - a[1], p[2]! - a[2]];
    const l = ab[0]! * ab[0]! + ab[1]! * ab[1]! + ab[2]! * ab[2]!;
    const t = l > 0 ? Math.max(0, Math.min(1, (ab[0]! * ap[0]! + ab[1]! * ap[1]! + ab[2]! * ap[2]!) / l)) : 0;
    best = Math.min(best, Math.hypot(ap[0]! - t * ab[0]!, ap[1]! - t * ab[1]!, ap[2]! - t * ab[2]!));
  }
  return best;
}

/** Abstand eines Punkts zur Fläche (Dreiecke des feinen Netzes; nächster Punkt je Dreieck). */
export function abstandFlaeche(p: V3, punkte: readonly V3[], flaechen: readonly (readonly number[])[]): number {
  let best = Infinity;
  const naechster = (a: V3, b: V3, c: V3): number => {
    // Ericson, „Closest point on triangle“
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const dot = (u: number[], v: number[]) => u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
    const d1 = dot(ab, ap);
    const d2 = dot(ac, ap);
    let q: number[];
    if (d1 <= 0 && d2 <= 0) q = a;
    else {
      const bp = [p[0] - b[0], p[1] - b[1], p[2] - b[2]];
      const d3 = dot(ab, bp);
      const d4 = dot(ac, bp);
      if (d3 >= 0 && d4 <= d3) q = b;
      else {
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
          const v = d1 / (d1 - d3);
          q = [a[0] + v * ab[0]!, a[1] + v * ab[1]!, a[2] + v * ab[2]!];
        } else {
          const cp = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
          const d5 = dot(ab, cp);
          const d6 = dot(ac, cp);
          if (d6 >= 0 && d5 <= d6) q = c;
          else {
            const vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) {
              const w = d2 / (d2 - d6);
              q = [a[0] + w * ac[0]!, a[1] + w * ac[1]!, a[2] + w * ac[2]!];
            } else {
              const va = d3 * d6 - d5 * d4;
              if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
                const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
                q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])];
              } else {
                const den = 1 / (va + vb + vc);
                const v = vb * den;
                const w = vc * den;
                q = [a[0] + ab[0]! * v + ac[0]! * w, a[1] + ab[1]! * v + ac[1]! * w, a[2] + ab[2]! * v + ac[2]! * w];
              }
            }
          }
        }
      }
    }
    return Math.hypot(p[0] - q[0]!, p[1] - q[1]!, p[2] - q[2]!);
  };
  for (const f of flaechen) {
    // grobe Vorauswahl über die erste Ecke
    const a = punkte[f[0]!]!;
    if (Math.abs(a[0] - p[0]) > 0.05 || Math.abs(a[1] - p[1]) > 0.05 || Math.abs(a[2] - p[2]) > 0.05) continue;
    for (let k = 1; k + 1 < f.length; k++) best = Math.min(best, naechster(a, punkte[f[k]!]!, punkte[f[k + 1]!]!));
  }
  return best;
}

/** Gezeigter Körper eines Baus: Käfig, Unterteilung, feine Lagen, Falten nach Zonen, feines Netz. */
type Gezeigt = { kaefig: Kaefig; unterteilung: Ableitung['unterteilung']; fein: ArrayLike<number>; falten: ZonenFalten; punkte: V3[]; flaechen: number[][]; baum: BaumAbleitung | null };

function gezeigt(bau: EditorBau, art: Bauart): Gezeigt {
  if (art === 'teile' && bau.netz.koerperBaum && !bau.netz.koerperBaum.fehler) {
    // derselbe Baum wie im Worker (gleiches Dokument, gleiche eingefrorene Teile)
    const d = bau.dok.skalierung === 1 ? bau.dok : { ...bau.dok, skalierung: 1 };
    const b = baumAbleiten(d, { paare: true }, teilbaum(d, d.kaefig?.stationen?.teile ?? null));
    const n = baumFeinesNetz(b);
    return { kaefig: b.kaefig, unterteilung: b.unterteilung, fein: b.fein, falten: faltenNachZonen(b.kaefig, b.unterteilung, b.fein, baumFalten(b)), punkte: n.punkte, flaechen: n.flaechen, baum: b };
  }
  const abl = bau.stand.linien?.abl ?? bau.stand.abl;
  const n = feinesNetz(abl);
  return { kaefig: abl.kaefig, unterteilung: abl.unterteilung, fein: abl.fein, falten: faltenNachZonenRoehre(abl), punkte: n.punkte, flaechen: n.flaechen, baum: null };
}

/** Schneller Bau nach einem Zug: der oberste Knoten der Seite 2 px nach oben (wie eine Mausbewegung im Seitenblatt). */
function zugZeit(bau: EditorBau, plan: Partial<Bauplan>): number {
  const s = bau.dok.profile.seite;
  let oben = 0;
  s.knoten.forEach((k, i) => {
    if (k.p.y > s.knoten[oben]!.p.y) oben = i;
  });
  const knoten = s.knoten.map((k, i) => (i === oben ? { ...k, p: { x: k.p.x, y: k.p.y + 2 / PX } } : k));
  const dok: Dokument = { ...bau.dok, profile: { ...bau.dok.profile, seite: { ...s, knoten } } };
  const t0 = jetzt();
  wesenBauen(dok, plan, bau.stand, true);
  return jetzt() - t0;
}

const zonenWerte = (z: ZonenFalten): ExtremMessung['falten'] => Object.fromEntries(MESS_ZONEN.map((k) => [k, { max: z.zonen[k].kanten ? z.zonen[k].max : 0, ueber20: z.zonen[k].ueber20 }])) as ExtremMessung['falten'];

/** Kanten, die im Bau mit Linien scharf sind und ohne Linien nicht (gleiche Punkte); null bei anderer Topologie. */
function neueScharfe(ohne: Kaefig, mit: Kaefig): number[] | null {
  if (ohne.n !== mit.n) return null;
  const alt = new Set<string>();
  for (let e = 0; e < ohne.nE; e++) if (ohne.eSchaerfe[e]! > 0) alt.add(`${Math.min(ohne.eA[e]!, ohne.eB[e]!)},${Math.max(ohne.eA[e]!, ohne.eB[e]!)}`);
  const neu: number[] = [];
  for (let e = 0; e < mit.nE; e++) if (mit.eSchaerfe[e]! > 0 && !alt.has(`${Math.min(mit.eA[e]!, mit.eB[e]!)},${Math.max(mit.eA[e]!, mit.eB[e]!)}`)) neu.push(e);
  return neu;
}

export type MessOptionen = { durchdringung?: boolean; linien?: boolean; zug?: boolean };

/** Ein Prüfkörper der Extremreihe in einer Körperart und einem Ablauf, so gemessen, wie der Editor ihn zeigt. */
export function extremMessen(k: ExtremKoerper, art: Bauart, ablauf: Ablauf, opt: MessOptionen = {}): { messung: ExtremMessung; bau: EditorBau; gezeigt: Gezeigt; mitLinien: { bau: EditorBau; gezeigt: Gezeigt; kanten: Kante[] } | null } {
  const roh = k.dok();
  const s = extremSelbstschnitte(roh);
  const plan = editorPlan(art);
  const bau = editorBauen(imAblauf(roh, art, ablauf), plan);
  const g = gezeigt(bau, art);
  const blatt = bau.netz.info.blatt;
  const delta = Object.fromEntries(BLAETTER.map((a) => [a, { max: blatt?.[a].max ?? NaN, mittel: blatt?.[a].mittel ?? NaN, widerspruch: blatt?.[a].widerspruch ?? 0 }])) as ExtremMessung['delta'];
  const saum = Object.fromEntries(BLAETTER.map((a) => [a, saumLaenge(bau.netz.saum?.[a])])) as ExtremMessung['saum'];
  const kg = kaefigGuete(g.kaefig);
  const messung: ExtremMessung = {
    name: k.name,
    gruppe: k.gruppe,
    art,
    ablauf,
    selbstschnitte: s.seite + s.front + s.top,
    ...(bau.netz.koerperBaum?.fehler ? { fehler: bau.netz.koerperBaum.fehler } : art === 'teile' && !bau.netz.koerperBaum ? { fehler: 'kein Baum (Maul oder Beine)' } : {}),
    delta,
    saum,
    falten: zonenWerte(g.falten),
    durchdringungen: opt.durchdringung === false ? NaN : selbstDurchdringungen({ punkte: g.punkte, flaechen: g.flaechen, schaerfe: new Map() }, 1e-4).paare,
    kaefig: { punkte: g.kaefig.n, flaechen: g.kaefig.nF, winkel: kg.winkel, seiten: kg.seiten },
    rauschen: umrissLinien(bau.netz.netzSicht, bau.dok, g.punkte, g.flaechen),
    zeit: { bau: bau.ms, zug: opt.zug === false ? NaN : zugZeit(bau, plan), baue: bau.baue },
    ...(bau.netz.koerperBaum && !bau.netz.koerperBaum.fehler ? { baum: { streifen: bau.netz.koerperBaum.streifen, seiten: bau.netz.koerperBaum.seiten } } : {}),
  };
  let mitLinien: { bau: EditorBau; gezeigt: Gezeigt; kanten: Kante[] } | null = null;
  if (opt.linien !== false && k.linien?.length) {
    // wie im Editor: Linien auf den gezeigten Körper zeichnen, dann baut der Worker mit dem Stand des Baus davor
    const kanten = k.linien.map((l) => linieAufHaut(bau.dok, l, g.punkte, g.flaechen)).filter((x): x is Kante => x !== null);
    if (kanten.length) {
      const bauL = editorBauen({ ...bau.dok, kanten }, plan, bau.stand);
      const gL = gezeigt(bauL, art);
      // die Linie, wie der Editor sie zeigt: aus der Zeichenansicht auf die Haut des Körpers ohne Linien gelegt (Liniennetz);
      // zwischen ihren Knoten läuft die gezeichnete Kurve sonst als Sehne neben der Haut
      const raster = sichtRaster(g.punkte, g.flaechen);
      const zuege = kanten.map((kk) => kanteAbtasten(kk).map((p) => aufHautLegen(raster, p, kk.blick) as V3));
      let aufHaut = 0;
      for (const z of zuege) for (const p of z) aufHaut = Math.max(aufHaut, abstandFlaeche(p, gL.punkte, gL.flaechen) * PX);
      // Kante an der Linie: feine Punkte längs der neuen scharfen Käfigkanten (rechte Hälfte) gegen die nächste Linie
      const neu = neueScharfe(g.kaefig, gL.kaefig);
      let kante = NaN;
      if (neu?.length) {
        kante = 0;
        for (const e of neu) {
          if (gL.kaefig.xyz[3 * gL.kaefig.eA[e]! + 2]! < -1e-9) continue;
          for (const p of feinKette(gL.unterteilung, gL.kaefig, gL.kaefig.eA[e]!, gL.kaefig.eB[e]!)) {
            const q = [gL.fein[3 * p]!, gL.fein[3 * p + 1]!, gL.fein[3 * p + 2]!];
            kante = Math.max(kante, Math.min(...zuege.map((z) => abstandZug(q, z))) * PX);
          }
        }
      }
      const zl = zonenWerte(gL.falten);
      messung.linien = { anzahl: kanten.length, arten: (bauL.netz.info.linien ?? kanten.map(() => ({ art: 'treppe' }))).map((b) => b.art), aufHaut, kante, freiMax: zl.frei.max, kanteMax: zl.kante.max, bau: bauL.ms };
      mitLinien = { bau: bauL, gezeigt: gL, kanten };
    }
  }
  return { messung, bau, gezeigt: g, mitLinien };
}
