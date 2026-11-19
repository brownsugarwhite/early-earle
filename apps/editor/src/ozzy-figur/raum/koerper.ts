// Ozzy im Raum (Beweis 3D): jedes Teil ein Körper aus Florians Front- und Seitenzeichnung. Achsen (Körperkoordinaten der
// Vorlagen): X quer (Frontbild nach rechts = Ozzys linke Seite), Y nach unten (Boden 0), Z längs (Seitenbild nach rechts = zur Nase).
//
// Ein Teil ist innen, wo es in der Front (X, Y) und in der Seite (Z, Y) innen liegt, abgerundet durch einen elliptischen Querschnitt:
// In jeder Höhe gibt die Front das Intervall in X (Mitte, halbe Breite), die Seite das Intervall in Z; der Querschnitt ist die Ellipse
// in diesem Rechteck. Von vorn und von der Seite ergibt das genau Florians Umriss, dazwischen dreht es sich wie ein runder Körper.
// Paarteile (Beine, Ohren) sind in Z gleich (das nahe Teil der Seite gilt für beide); das ferne Teil der Seitenzeichnung schaut bei
// Florian ein Stück vor: Dieser Versatz wird beim Blick von der Seite angelegt (zeichner.ts), nicht in die Form gebaut.
import { type Form, spiegeln, verschieben } from '../form';
import { koerperUrsprung } from '../raster';
import type { AnsichtName, FigurDaten, TeilName } from '../vorlagen/import';
import { abstandsfeld, fuellen, type Gitter, gitterUm, lesen, linienzug } from './gitter';

/** Schnitt eines Teils in einer Ebene: Abstandsfeld (innen negativ) und je Zelle Mitte und halbe Breite des Intervalls ihrer Zeile */
interface Schnitt {
  g: Gitter;
  abstand: Float32Array;
  mitte: Float32Array;
  halb: Float32Array;
}

export interface Teil3D {
  name: string;
  front: Schnitt;
  seite: Schnitt;
  /** umgebender Quader [x0, y0, z0, x1, y1, z1] */
  quader: [number, number, number, number, number, number];
  /** Seite des Körpers: −1 Ozzys rechte (X < 0), +1 linke, 0 Mitte */
  seiteVon: -1 | 0 | 1;
  /** Paarteile (Beine, Ohren): Nummer des Paars (1 Vorderbeine, 2 Hinterbeine, 3 Ohren), sonst 0 */
  paar: number;
}

/** Wie Florian das ferne Teil eines Paars von der Seite zeichnet: Rechteck (Mitte Z, Mitte Y, Breite, Höhe) des nahen Teils und des
 * fernen, wie gezeichnet. Beim Blick von der Seite wird das ferne Teil vom einen aufs andere abgebildet (Florians Ohr ist fern schmaler
 * und höher, die fernen Beine schauen vor) */
export interface PaarKarte {
  nah: [number, number, number, number];
  fern: [number, number, number, number];
}

const RASTER = 0.5;
/** Glättung der Querschnitte in der Höhe (Einheiten) */
const GLATT = 4;

/** Formen einer Ansicht in Körperkoordinaten (Ursprung: Mitte der Bohne, Boden) */
function formenVon(d: FigurDaten, n: AnsichtName): Map<TeilName, Form[]> {
  const a = d.ansichten[n];
  const u = koerperUrsprung(a);
  const m = new Map<TeilName, Form[]>();
  for (const t of a.teile) m.set(t.name, [...(m.get(t.name) ?? []), verschieben(t.form, -u[0], -u[1])]);
  return m;
}

function schnitt(formen: Form[]): Schnitt {
  const zuege = formen.map((f) => linienzug(f));
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const z of zuege)
    for (let k = 0; k < z.length; k += 2) {
      x0 = Math.min(x0, z[k]!);
      x1 = Math.max(x1, z[k]!);
      y0 = Math.min(y0, z[k + 1]!);
      y1 = Math.max(y1, z[k + 1]!);
    }
  const g = gitterUm([x0, y0, x1, y1], RASTER, 12);
  const m = fuellen(zuege, g);
  const abstand = abstandsfeld(m, g);
  const mitte = new Float32Array(g.b * g.h);
  const halb = new Float32Array(g.b * g.h);
  // je Zeile ein Intervall: vom ersten bis zum letzten Punkt innen (die Hülle). Kerben in einer Ansicht schneidet nur ihr Umriss ein (als
  // Rille durch die Tiefe); getrennte Intervalle ergaben je eines einen Strang über die ganze Tiefe, die schräg als Grate abstanden
  const zm = new Float64Array(g.h);
  const zh = new Float64Array(g.h);
  for (let j = 0; j < g.h; j++) {
    let a = -1;
    let e = -1;
    for (let i = 0; i < g.b; i++)
      if (m[j * g.b + i]) {
        if (a < 0) a = i;
        e = i;
      }
    zm[j] = a < 0 ? NaN : g.x0 + ((a + e + 1) / 2) * g.s;
    zh[j] = a < 0 ? 0 : ((e + 1 - a) / 2) * g.s;
  }
  // in der Höhe geglättet (Gauß, σ = GLATT): Springt das Intervall von einer Zeile zur nächsten (Oberkante der Schnauze), entstünde
  // im Raum eine Stufe; den genauen Umriss hält ohnehin das Abstandsfeld
  const r = Math.ceil((3 * GLATT) / g.s);
  for (let j = 0; j < g.h; j++) {
    let sw = 0;
    let sm = 0;
    let sh = 0;
    if (zh[j]! > 0)
      for (let d = -r; d <= r; d++) {
        const q = j + d;
        if (q < 0 || q >= g.h || !(zh[q]! > 0)) continue;
        const w = Math.exp(-0.5 * ((d * g.s) / GLATT) ** 2);
        sw += w;
        sm += w * zm[q]!;
        sh += w * zh[q]!;
      }
    const c = sw > 0 ? sm / sw : 0;
    const w = sw > 0 ? Math.min(sh / sw, zh[j]! + GLATT) : 0;
    for (let k = 0; k < g.b; k++) {
      mitte[j * g.b + k] = c;
      halb[j * g.b + k] = w;
    }
  }
  return { g, abstand, mitte, halb };
}

const kastenVon = (s: Schnitt): [number, number, number, number] => [s.g.x0, s.g.y0, s.g.x0 + s.g.b * s.g.s, s.g.y0 + s.g.h * s.g.s];

/** genaues Rechteck einer Gruppe von Formen [x0, y0, x1, y1] */
function bereich(formen: Form[]): [number, number, number, number] {
  const r: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const f of formen) {
    const z = linienzug(f);
    for (let k = 0; k < z.length; k += 2) {
      r[0] = Math.min(r[0], z[k]!);
      r[1] = Math.min(r[1], z[k + 1]!);
      r[2] = Math.max(r[2], z[k]!);
      r[3] = Math.max(r[3], z[k + 1]!);
    }
  }
  return r;
}

/** Formen senkrecht auf einen Höhenbereich abbilden (Teile, deren Breite aus einer anderen Ansicht kommt) */
function aufHoehe(formen: Form[], ziel: [number, number]): Form[] {
  const b = bereich(formen);
  const k = (ziel[1] - ziel[0]) / Math.max(1e-6, b[3] - b[1]);
  const y = (v: number): number => ziel[0] + (v - b[1]) * k;
  return formen.map((f) => f.map((a) => ({ p: [a.p[0], y(a.p[1])], i: [a.i[0], y(a.i[1])], o: [a.o[0], y(a.o[1])] })));
}

/** Wert des Zellfelds (Mitte, halbe Breite) an (x, y), bilinear (innerhalb eines Intervalls stetig; wo Intervalle wechseln, liegt
 * der Punkt außen, und die Abstandsfelder bestimmen den Wert) */
function zelle(f: Float32Array, g: Gitter, x: number, y: number): number {
  const fx = Math.max(0, Math.min(g.b - 1.001, (x - g.x0) / g.s - 0.5));
  const fy = Math.max(0, Math.min(g.h - 1.001, (y - g.y0) / g.s - 0.5));
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const tx = fx - i;
  const ty = fy - j;
  const a = f[j * g.b + i]!;
  const b = f[j * g.b + i + 1]!;
  const c = f[(j + 1) * g.b + i]!;
  const d = f[(j + 1) * g.b + i + 1]!;
  return a + (b - a) * tx + (c + (d - c) * tx - (a + (b - a) * tx)) * ty;
}

/** Abstand (Näherung, innen negativ) eines Teils an (x, y, z) */
export function teilAbstand(t: Teil3D, x: number, y: number, z: number): number {
  const dF = lesen(t.front.abstand, t.front.g, x, y);
  const dS = lesen(t.seite.abstand, t.seite.g, z, y);
  let d = Math.max(dF, dS);
  if (d > 4) return d;
  const a = zelle(t.front.halb, t.front.g, x, y);
  const c = zelle(t.seite.halb, t.seite.g, z, y);
  if (a <= 0 || c <= 0) return Math.max(d, 1);
  const u = (x - zelle(t.front.mitte, t.front.g, x, y)) / a;
  const v = (z - zelle(t.seite.mitte, t.seite.g, z, y)) / c;
  d = Math.max(d, (Math.sqrt(u * u + v * v) - 1) * Math.min(a, c));
  return d;
}

/** weiches Minimum (polynomial, Quilez) */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Florians Front- und Seitenzeichnung als Teile im Raum. Hinten sichtbare Teile (Schwanz, hinterer Keil) nehmen ihre Breite aus der
 * Rückansicht (gespiegelt) */
export function teileBauen(d: FigurDaten): Teil3D[] {
  const front = formenVon(d, 'front');
  const seite = formenVon(d, 'profil');
  const ruecken = formenVon(d, 'back');
  // aus der Rückansicht gespiegelt, auf die Höhe des Teils in der Seitenzeichnung gebracht (der Schwanz ist von hinten höher gezeichnet)
  const gespiegelt = (n: TeilName): Form[] | undefined => {
    const r = ruecken.get(n)?.map((f) => spiegeln(f, 0));
    const s = seite.get(n);
    if (!r || !s) return r;
    const b = bereich(s);
    return aufHoehe(r, [b[1], b[3]]);
  };
  const plan: { name: string; front: Form[] | undefined; seite: Form[] | undefined; seiteVon: -1 | 0 | 1; paar?: number }[] = [
    { name: 'bohne', front: front.get('bohne'), seite: seite.get('bohne'), seiteVon: 0 },
    // der Kopf mit seinem Bart (sonst wird der Scheitel zwischen den zwei Hälften im Raum ein Schlitz durch den Kopf)
    { name: 'kopf', front: (['kopfA', 'kopfB', 'bartA', 'bartB'] as TeilName[]).flatMap((n) => front.get(n) ?? []), seite: (['kopfA', 'kopfB', 'bartA', 'bartB'] as TeilName[]).flatMap((n) => seite.get(n) ?? []), seiteVon: 0 },
    { name: 'nase', front: front.get('nase'), seite: seite.get('nase'), seiteVon: 0 },
    { name: 'ohrA', front: front.get('ohrA'), seite: seite.get('ohrA'), seiteVon: -1, paar: 3 },
    { name: 'ohrB', front: front.get('ohrB'), seite: seite.get('ohrA'), seiteVon: 1, paar: 3 },
    { name: 'beinRV', front: front.get('beinRV'), seite: seite.get('beinRV'), seiteVon: -1, paar: 1 },
    { name: 'beinRH', front: front.get('beinRH'), seite: seite.get('beinRH'), seiteVon: -1, paar: 2 },
    { name: 'beinLV', front: front.get('beinLV'), seite: seite.get('beinRV'), seiteVon: 1, paar: 1 },
    { name: 'beinLH', front: front.get('beinLH'), seite: seite.get('beinRH'), seiteVon: 1, paar: 2 },
    { name: 'schwanz', front: gespiegelt('schwanz'), seite: seite.get('schwanz'), seiteVon: 0 },
    { name: 'keilV', front: front.get('keilV'), seite: seite.get('keilV'), seiteVon: 0 },
    { name: 'keilH', front: gespiegelt('keilH'), seite: seite.get('keilH'), seiteVon: 0 },
  ];
  const out: Teil3D[] = [];
  for (const p of plan) {
    if (!p.front?.length || !p.seite?.length) continue;
    const f = schnitt(p.front);
    const s = schnitt(p.seite);
    const kf = kastenVon(f);
    const ks = kastenVon(s);
    out.push({ name: p.name, front: f, seite: s, quader: [kf[0], Math.max(kf[1], ks[1]), ks[0], kf[2], Math.min(kf[3], ks[3]), ks[2]], seiteVon: p.seiteVon, paar: p.paar ?? 0 });
  }
  return out;
}

/** Karten der Paare (Index 1 Vorderbeine, 2 Hinterbeine, 3 Ohren) aus Florians Seitenzeichnung */
export function paarKarten(d: FigurDaten): PaarKarte[] {
  const seite = formenVon(d, 'profil');
  const rechteck = (n: TeilName): [number, number, number, number] => {
    const b = bereich(seite.get(n)!);
    return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2, b[2] - b[0], b[3] - b[1]];
  };
  const leer: PaarKarte = { nah: [0, 0, 1, 1], fern: [0, 0, 1, 1] };
  return [leer, { nah: rechteck('beinRV'), fern: rechteck('beinLV') }, { nah: rechteck('beinRH'), fern: rechteck('beinLH') }, { nah: rechteck('ohrA'), fern: rechteck('ohrB') }];
}

/** Punkt (Z, Y) eines fernen Teils beim Blick von der Seite (Gewicht w: 0 Ruhe, 1 ganz wie gezeichnet) */
export function fernAbbilden(k: PaarKarte, z: number, y: number, w: number): [number, number] {
  const zz = k.fern[0] + ((z - k.nah[0]) * k.fern[2]) / k.nah[2];
  const yy = k.fern[1] + ((y - k.nah[1]) * k.fern[3]) / k.nah[3];
  return [z + (zz - z) * w, y + (yy - y) * w];
}

export interface Figur3D {
  teile: Teil3D[];
  /** Rundung zwischen Teilen (Einheiten) */
  k: number;
  quader: [number, number, number, number, number, number];
}

export function figurBauen(d: FigurDaten, k = 3): Figur3D {
  const teile = teileBauen(d);
  const q: [number, number, number, number, number, number] = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const t of teile)
    for (let i = 0; i < 3; i++) {
      q[i] = Math.min(q[i]!, t.quader[i]!);
      q[i + 3] = Math.max(q[i + 3]!, t.quader[i + 3]!);
    }
  return { teile, k, quader: q };
}

/** Abstand der ganzen Figur (weich vereinigt); teilNr: Index des nächsten Teils */
export function figurAbstand(f: Figur3D, x: number, y: number, z: number, aus?: { teil: number; je?: Float32Array }): number {
  let d = Infinity;
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < f.teile.length; i++) {
    const t = f.teile[i]!;
    const q = t.quader;
    // außerhalb des Quaders: mindestens dieser Abstand
    const ax = Math.max(q[0] - x, 0, x - q[3]);
    const ay = Math.max(q[1] - y, 0, y - q[4]);
    const az = Math.max(q[2] - z, 0, z - q[5]);
    const aq = Math.hypot(ax, ay, az);
    if (aq > Math.min(d, bd) + f.k + 2) {
      if (aus?.je) aus.je[i] = aq;
      continue;
    }
    const di = teilAbstand(t, x, y, z);
    if (aus?.je) aus.je[i] = di;
    if (di < bd) {
      bd = di;
      best = i;
    }
    d = d === Infinity ? di : smin(d, di, f.k);
  }
  if (aus) aus.teil = best;
  return d;
}
