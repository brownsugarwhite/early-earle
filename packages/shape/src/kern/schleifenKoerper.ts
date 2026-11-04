// Prüfplan P1 „Ansichten als Illustration“, Tag 2–3 (03.11.2026): der Körper aus den geplanten Umrissschleifen — ein Löser.
//
// „Umriss zuerst“: Die Schleifen (`umrissPlan`) sind die Wahrheit, der Käfig folgt ihnen. Topologie und Ringwahl bleiben die
// der heutigen Röhre (ihr Bau ist der Startwert); dann wird der Käfig neu gelöst — **ein gekoppeltes System** über alle 3n
// Käfigkoordinaten (Zeilen dürfen Achsen mischen: Skalarprodukte mit der Umrissnormale):
// - **Seite (Naht):** feine Punkte der Mittelebene: z = 0 und nur die Komponente längs der Kurvennormale auf die gezeichnete
//   Seitenkurve (längs der Kurve gleitet der Punkt; hart längs gebunden scherte der Löser die Ringe, Ei: 400 umgeklappte Flächen).
// - **Top und Front:** je gezeichnete Probe der Schleife der nächste feine Punkt der aktuellen Fläche (Zuordnung je Runde
//   neu). Gebunden wird nur, was den Umriss ausmacht: (1) die Komponente längs der Umrissnormale w (in der Blattebene, ⊥ zur
//   Schleife) trifft die Probe — die Fläche reicht dort genau bis zum Umriss; (2) quer zur Schleife ist P·w dort stationär
//   (Differenz der Grenzlagen des gegenüberliegenden Nachbarpaars · w = 0): die Silhouette liegt an diesem Punkt, also in der
//   geplanten Tiefe (± feine Teilung). Weder die Lage längs der Schleife noch die Tiefe werden direkt gebunden — beides
//   zöge die Fläche in ihrer eigenen Ebene mit (V4: Robbe 65 px) statt ihre Form zu ändern.
// - **Füllung ohne Zielform:** Ellipsen-Vorrang je Ring (zweite Differenz längs des Rings = λ·(Punkt − Ringmitte), λ =
//   −4 sin²(π/N); exakt erfüllt von jeder Ellipse mit gleichmäßiger Teilung — „so rund wie möglich“), schwache Biegung längs
//   der Reihen, Laplace in den Kappen, Laplace der Stufe 2 (Glättungsmaß), schwacher Anker am Start. Reine Laplace-Glättung
//   kennt keine Rundung: Mit Naht und Schleifen allein sanken die Querschnitte zu Sehnen ein (Ei: Volumen −64 %), die harten
//   Schleifenpunkte standen als Nadeln heraus (Falten 177°).
// Die Sichthülle ist nur Prüfung (Überstand im Bericht). Dünn besetzt (Cuthill–McKee über den 3n-Graphen, Cholesky). DOM-frei.
import type { Dokument } from '../dokument';
import type { Kaefig, V3 } from '../kaefig/halbkanten';
import { grenzDifferenz, grenzZeile } from '../loeser/achsen';
import { type NormalZeile, kaefigNachbarlisten, normalSystem } from '../loeser/normalSystem';
import { anwenden3 } from '../subdivision/matrix';
import { type Ableitung, glaettemassFuer, umrissBei, umrissDicht } from './ableiten';
import type { PlanProbe, UmrissPlan } from './umrissPlan';

export type SchleifenOptionen = {
  /** Gewicht der Lage auf den Schleifen und der Naht (hart gegen die Füllung) */
  gewicht?: number;
  /** Gewicht der Silhouettenbedingung (P·w stationär quer zur Schleife) */
  tangente?: number;
  /** Glättung der Stufe 2 (Laplace in Käfigpunkten, ohne Zielform) */
  fair?: number;
  fairKappe?: number;
  /** Ellipsen-Vorrang je Ring */
  ring?: number;
  /** Biegung längs der Reihen (Standard 0: zog die Ringe auf gleichmäßige Abstände, Robbe-Kopf und Kegelspitze zusammengeschoben) */
  reihe?: number;
  /**
   * Anker längs der Reihe: jeder Ringpunkt bleibt auf seiner Station (Komponente längs der Reihenrichtung = Start). Die
   * Ringverteilung ist eingefroren (Dokument), nur die Ringform ändert sich; längs der Schleifen ist die Fläche frei, ohne
   * diesen Anker wanderten die Ringe
   */
  laengs?: number;
  /** Laplace der inneren Kappenpunkte */
  kaefig?: number;
  /** schwacher Anker am Startkäfig (gegen Nullräume) */
  anker?: number;
  /**
   * Zielform des heutigen Baus (Querschnitte aus Sichthülle und Fülle): Grenzlage jedes Käfigpunkts auf sein Ziel, und die
   * Glättung der Stufe 2 relativ zur Zielform (wie `GLATTE_HAUT`). Ohne Zielform wurden die Querschnitte Ellipsen —
   * die Front der Robbe (unten breit mit Flossen, oben schmal) widerspricht dem, Δ Front 45 px ohne Schleifen; die
   * Schleifen allein binden nur die Extreme, nicht die Form dazwischen
   */
  ziel?: number;
  /** Runden Zuordnung → Lösen */
  runden?: number;
  /** Schritt je Runde (Welt): weiter als das rückt kein Ziel von seinem feinen Punkt weg — die Fläche wandert in Schritten, ein Sprung über 10 px klappte sie um; die letzte Runde geht ganz */
  schritt?: number;
  /** Silhouettenbedingung erst, wenn der feine Punkt näher als das (Welt) an der Probe liegt (sonst zeigt das Nachbarpaar ins Leere) */
  nah?: number;
  /** größter Abstand (Welt) einer Probe zum nächsten feinen Punkt, darüber bleibt sie ungebunden */
  reichweite?: number;
  /** Widerspruchsproben (ohne erlaubte Tiefe) binden? Standard nein */
  widerspruch?: boolean;
  /** Diagnose: nur diese Bindungen (Standard alle) */
  nur?: readonly ('naht' | 'top' | 'front')[];
  /**
   * Aufgeben: ab dieser Runde wird eine Probe nicht mehr gebunden, deren Abstand zum nächsten feinen Punkt über `schritt`
   * liegt und seit der vorigen Runde nicht um mindestens `fortschritt` (Welt) gesunken ist — die Fläche kann sie nicht
   * glatt erreichen (Flossen der Robbe an der Röhre); erzwungen klappt sie dort um. Solche Proben zählt der Bericht
   */
  aufgebenAb?: number;
  fortschritt?: number;
  /**
   * Weiche Bindung ferner Proben: Gewicht × min(1, (weit / Abstand in Runde 1)⁴). Die Röhre erreicht Flossen (Robbe),
   * Flügel (Ente) und Überhänge (Pilz) nicht glatt — hart erzwungen klappt sie dort um (Robbe 244, Pilz 1 169 umgeklappte
   * Flächen); weich gezogen bleibt das Δ dort stehen und steht im Bericht
   */
  weit?: number;
};

export type SchleifenBericht = {
  runden: number;
  ms: number;
  /** Zeit der Zerlegungen (ms, alle Runden) */
  msLoeser: number;
  /** gezeichnete Proben je Ansicht und davon gebundene */
  proben: Record<'front' | 'top', { gezeichnet: number; gebunden: number }>;
  nahtFein: number;
  /** Abstand Probe → zugeordneter feiner Punkt vor dem Lösen (px), größter und mittlerer, je Runde */
  zuordnung: { max: number; mittel: number }[];
  /** Abstand Probe → Grenzlage nach dem Lösen längs der Umrissnormale (px) */
  rest: Record<'front' | 'top', { max: number; mittel: number }>;
  /** Überstand feiner Punkte über Front- und Top-Silhouette (px) */
  ueberstand: { front: number; top: number };
  /** größte Bewegung eines Käfigpunkts gegen den Start (px) */
  bewegung: number;
  /** Proben, deren feiner Punkt nach der letzten Runde weiter als 4 px entfernt liegt: Zahl und x-Bereich (px) je Ansicht */
  fern: Record<'front' | 'top', { zahl: number; xVon: number; xBis: number }>;
  /** aufgegebene Proben (unerreichbar, nicht mehr gebunden) je Ansicht */
  aufgegeben: Record<'front' | 'top', number>;
  /** weich gebundene Proben (Abstand in Runde 1 über `weit`) je Ansicht */
  weich: Record<'front' | 'top', number>;
  /** Unbekannte und Hülle der Zerlegung */
  unbekannte: number;
  huelle: number;
};

const PX = 461;
const STANDARD: Required<SchleifenOptionen> = { gewicht: 1e3, tangente: 1e3, fair: 30, fairKappe: 10, ring: 0, reihe: 0, laengs: 0, kaefig: 0, anker: 0, ziel: 1, runden: 6, schritt: 4 / PX, nah: 3 / PX, reichweite: 16 / PX, widerspruch: false, nur: ['naht', 'top', 'front'], aufgebenAb: 3, fortschritt: 1 / PX, weit: 6 / PX };

/** Zellenraster über Punkten (3 Werte je Punkt) für die Suche des nächsten Punkts. */
function raster(punkte: ArrayLike<number>, n: number, zelle: number) {
  const zellen = new Map<string, number[]>();
  const schl = (x: number, y: number, z: number) => `${Math.floor(x / zelle)},${Math.floor(y / zelle)},${Math.floor(z / zelle)}`;
  for (let i = 0; i < n; i++) {
    const s = schl(punkte[3 * i]!, punkte[3 * i + 1]!, punkte[3 * i + 2]!);
    let l = zellen.get(s);
    if (!l) zellen.set(s, (l = []));
    l.push(i);
  }
  return (p: V3, radius: number): number => {
    const r = Math.ceil(radius / zelle);
    const cx = Math.floor(p[0] / zelle);
    const cy = Math.floor(p[1] / zelle);
    const cz = Math.floor(p[2] / zelle);
    let best = -1;
    let bd = radius * radius;
    for (let a = -r; a <= r; a++) {
      for (let b = -r; b <= r; b++) {
        for (let c = -r; c <= r; c++) {
          const l = zellen.get(`${cx + a},${cy + b},${cz + c}`);
          if (!l) continue;
          for (const i of l) {
            const dx = punkte[3 * i]! - p[0];
            const dy = punkte[3 * i + 1]! - p[1];
            const dz = punkte[3 * i + 2]! - p[2];
            const d = dx * dx + dy * dy + dz * dz;
            if (d < bd) {
              bd = d;
              best = i;
            }
          }
        }
      }
    }
    return best;
  };
}

type Bindung = { probe: PlanProbe; fein: number; w: V3; paar: [number, number] | null; ansicht: 'front' | 'top'; faktor: number };

/** Gegenüberliegende Nachbarpaare eines feinen Punkts (regulär: zwei Paare), nach der Lage. */
function nachbarPaare(nb: readonly number[], fein: ArrayLike<number>, q: number): [number, number][] {
  const dir = nb.map((a) => {
    const d: V3 = [fein[3 * a]! - fein[3 * q]!, fein[3 * a + 1]! - fein[3 * q + 1]!, fein[3 * a + 2]! - fein[3 * q + 2]!];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return [d[0] / l, d[1] / l, d[2] / l] as V3;
  });
  const out: [number, number][] = [];
  const benutzt = new Set<number>();
  nb.forEach((a, i) => {
    if (benutzt.has(i)) return;
    let best = -1;
    let bd = Infinity;
    nb.forEach((_, j) => {
      if (j === i || benutzt.has(j)) return;
      const d = dir[i]![0] * dir[j]![0] + dir[i]![1] * dir[j]![1] + dir[i]![2] * dir[j]![2];
      if (d < bd) {
        bd = d;
        best = j;
      }
    });
    if (best >= 0 && bd < -0.3) {
      out.push([a, nb[best]!]);
      benutzt.add(i);
      benutzt.add(best);
    }
  });
  return out;
}

/** Zeile über die 3n Koordinaten: eine Käfigzeile (Index, Wert) in einer Achse. */
function achsZeile(index: ArrayLike<number>, wert: ArrayLike<number>, achse: 0 | 1 | 2, gewicht: number): NormalZeile {
  const idx = new Array<number>(index.length);
  for (let t = 0; t < index.length; t++) idx[t] = 3 * index[t]! + achse;
  return { index: idx, wert, gewicht };
}

/** Zeile über die 3n Koordinaten: Skalarprodukt einer Käfigzeile mit w. */
function dotZeile(index: ArrayLike<number>, wert: ArrayLike<number>, w: V3, gewicht: number): NormalZeile {
  const idx: number[] = [];
  const wt: number[] = [];
  for (let t = 0; t < index.length; t++) {
    for (let a = 0; a < 3; a++) {
      if (Math.abs(w[a]!) < 1e-12) continue;
      idx.push(3 * index[t]! + a);
      wt.push(wert[t]! * w[a]!);
    }
  }
  return { index: idx, wert: wt, gewicht };
}

/**
 * Käfig aus den Schleifen: Naht (Seite) und gezeichnete Proben der Top- und Front-Schleifen hart, Füllung ohne Zielform.
 * Gibt die Ableitung mit neuen Käfiglagen und feinen Grenzlagen zurück (Topologie, Stationen, Matrix bleiben).
 */
export function schleifenKoerper(abl: Ableitung, plan: UmrissPlan, dok: Dokument, optionen: SchleifenOptionen = {}): { abl: Ableitung; bericht: SchleifenBericht } {
  const uhr = (globalThis as { performance?: { now(): number } }).performance;
  const jetzt = () => (uhr ? uhr.now() : Date.now());
  const t0 = jetzt();
  const opt = { ...STANDARD, ...optionen };
  const u = abl.unterteilung;
  const k = abl.kaefig;
  const n = k.n;
  const fk = u.stufen[u.stufen.length - 1]!.kaefig;
  const nF = fk.n;
  const nachF = kaefigNachbarlisten(fk);
  const nachK = kaefigNachbarlisten(k);
  // Kopplungsgraph der 3n Koordinaten: Nachbarn des Punkts in allen Achsen, dazu die beiden anderen Achsen des Punkts
  const nach3: number[][] = Array.from({ length: 3 * n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < 3; a++) {
      const l = nach3[3 * i + a]!;
      for (let b = 0; b < 3; b++) if (b !== a) l.push(3 * i + b);
      for (const j of nachK[i] ?? []) for (let b = 0; b < 3; b++) l.push(3 * j + b);
    }
  }
  const { R, N } = abl.vorlage;
  const ringPunkt = abl.vorlage.ringPunkt;
  const gm = glaettemassFuer(u, k, { fair: opt.fair, fairBezug: 0, fairKappe: opt.fairKappe }, R * N);
  // feste Zeilen (alle Runden gleich): Zielform (Grenzlage je Käfigpunkt), Glättung der Stufe 2 relativ zur Zielform
  // (Ziel der Zeile = Laplace des Zielkäfigs statt 0), Biegung längs der Reihen, Kappen-Laplace, Anker
  const feste: NormalZeile[] = [];
  const festeZiele: number[] = [];
  // Zielform = Grenzlagen der Käfigpunkte des Startkörpers (Käfigpunkte behalten ihren Index auf jeder Stufe; mit Pinsel-Deltas)
  const T = abl.fein;
  if (opt.ziel > 0) {
    for (let i = 0; i < n; i++) {
      const z = grenzZeile(u.grenze, i, n);
      for (let a = 0; a < 3; a++) {
        feste.push(achsZeile(z.index, z.wert, a as 0 | 1 | 2, opt.ziel));
        festeZiele.push(T[3 * i + a]!);
      }
    }
  }
  if (gm) {
    for (const z of gm.zeilen) {
      for (let a = 0; a < 3; a++) {
        feste.push(achsZeile(z.index, z.wert, a as 0 | 1 | 2, z.gewicht));
        let lt = 0;
        if (opt.ziel > 0) for (let q = 0; q < z.index.length; q++) lt += z.wert[q]! * T[3 * z.index[q]! + a]!;
        festeZiele.push(lt);
      }
    }
  }
  if (opt.reihe > 0) {
    for (let i = 1; i + 1 < R; i++) {
      for (let j = 0; j < N; j++) {
        const b = ringPunkt(i, j);
        if (k.vSchaerfe[b]! > 0) continue;
        const idx = [ringPunkt(i - 1, j), b, ringPunkt(i + 1, j)];
        for (let a = 0; a < 3; a++) {
          feste.push(achsZeile(idx, [1, -2, 1], a as 0 | 1 | 2, opt.reihe));
          festeZiele.push(0);
        }
      }
    }
  }
  if (opt.laengs > 0) {
    for (let i = 0; i < R; i++) {
      for (let j = 0; j < N; j++) {
        const b = ringPunkt(i, j);
        const a = ringPunkt(Math.max(0, i - 1), j);
        const c = ringPunkt(Math.min(R - 1, i + 1), j);
        const d: V3 = [k.xyz[3 * c]! - k.xyz[3 * a]!, k.xyz[3 * c + 1]! - k.xyz[3 * a + 1]!, k.xyz[3 * c + 2]! - k.xyz[3 * a + 2]!];
        const l = Math.hypot(d[0], d[1], d[2]);
        if (!(l > 1e-12)) continue;
        d[0] /= l;
        d[1] /= l;
        d[2] /= l;
        feste.push(dotZeile([b], [1], d, opt.laengs));
        festeZiele.push(d[0] * k.xyz[3 * b]! + d[1] * k.xyz[3 * b + 1]! + d[2] * k.xyz[3 * b + 2]!);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    if (opt.anker > 0) {
      for (let a = 0; a < 3; a++) {
        feste.push({ index: [3 * i + a], wert: [1], gewicht: opt.anker });
        festeZiele.push(k.xyz[3 * i + a]!);
      }
    }
    if (!(opt.kaefig > 0) || i < R * N || k.vSchaerfe[i]! > 0) continue;
    const alle: number[] = [];
    const scharf: number[] = [];
    for (let q = k.vKStart[i]!; q < k.vKStart[i + 1]!; q++) {
      const e = k.vKanten[q]!;
      const o = k.eA[e] === i ? k.eB[e]! : k.eA[e]!;
      if (o >= n) continue;
      alle.push(o);
      if (k.eSchaerfe[e]! > 0) scharf.push(o);
    }
    const nb = scharf.length >= 2 ? scharf : alle;
    if (nb.length < 2) continue;
    const idx = [i, ...nb];
    const wt = [1, ...nb.map(() => -1 / nb.length)];
    for (let a = 0; a < 3; a++) {
      feste.push(achsZeile(idx, wt, a as 0 | 1 | 2, opt.kaefig));
      festeZiele.push(0);
    }
  }
  // Naht: z = 0 hart, längs der Kurvennormale auf die Seitenkurve, längs der Kurve frei
  const nahtZeilen: NormalZeile[] = [];
  const nahtZiele: number[] = [];
  if (opt.nur.includes('naht')) {
    const umriss = umrissDicht(dok);
    const nahtFein = abl.naht.fein;
    const nahtAnteil = abl.naht.anteil;
    for (let q = 0; q < nahtFein.length; q++) {
      const a = nahtAnteil[q]!;
      const p = umrissBei(umriss, a);
      const p0 = umrissBei(umriss, a - 1e-3);
      const p1 = umrissBei(umriss, a + 1e-3);
      const lt = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
      const m: V3 = [-(p1.y - p0.y) / lt, (p1.x - p0.x) / lt, 0];
      const z = grenzZeile(u.grenze, nahtFein[q]!, n);
      nahtZeilen.push(achsZeile(z.index, z.wert, 2, opt.gewicht));
      nahtZiele.push(0);
      nahtZeilen.push(dotZeile(z.index, z.wert, m, opt.gewicht));
      nahtZiele.push(p.x * m[0] + p.y * m[1]);
    }
  }
  const schleifen = plan.schleifen.filter((s) => s.ansicht !== 'seite' && opt.nur.includes(s.ansicht as 'top' | 'front'));
  const gezeichnet = { front: 0, top: 0 };
  for (const s of schleifen) for (const p of s.proben) if (p.art === 0 && (opt.widerspruch || Number.isFinite(p.lo))) gezeichnet[s.ansicht as 'front' | 'top']++;
  let xyz: Float64Array = Float64Array.from(k.xyz);
  let fein: Float64Array = Float64Array.from(abl.fein);
  const start = Float64Array.from(k.xyz);
  const zuordnung: { max: number; mittel: number }[] = [];
  let bindungen: Bindung[] = [];
  // Abstand je Probe (Schlüssel Schleife:Index) aus der vorigen Runde, aus Runde 1 (weiche Bindung ferner Proben) und aufgegebene Proben
  let abstandVorher = new Map<string, number>();
  const abstandStart = new Map<string, number>();
  const aufgegeben = new Set<string>();
  let msLoeser = 0;
  let huelle = 0;
  const zelle = 6 / PX;
  const lambda = -4 * Math.sin(Math.PI / N) ** 2;
  for (let runde = 0; runde < opt.runden; runde++) {
    // Zuordnung: je gezeichnete Probe der nächste feine Punkt der aktuellen Grenzfläche; Umrissnormale w in der Blattebene
    const suche = raster(fein, nF, zelle);
    bindungen = [];
    let dMax = 0;
    let dSum = 0;
    const abstandJetzt = new Map<string, number>();
    for (const s of schleifen) {
      const pr = s.proben;
      const m = pr.length;
      for (let i = 0; i < m; i++) {
        const p = pr[i]!;
        if (p.art !== 0 || (!opt.widerspruch && !Number.isFinite(p.lo))) continue;
        const schl = `${s.id}:${i}`;
        if (aufgegeben.has(schl)) continue;
        const q = suche(p.p, opt.reichweite);
        if (q < 0) continue;
        const dq0 = Math.hypot(fein[3 * q]! - p.p[0], fein[3 * q + 1]! - p.p[1], fein[3 * q + 2]! - p.p[2]);
        abstandJetzt.set(schl, dq0);
        if (runde === 0) abstandStart.set(schl, dq0);
        const g0 = abstandStart.get(schl) ?? dq0;
        const faktor = g0 > opt.weit ? Math.min(1, (opt.weit / g0) ** 4) : 1;
        if (runde >= opt.aufgebenAb && dq0 > opt.schritt) {
          const vorher = abstandVorher.get(schl);
          if (vorher !== undefined && vorher - dq0 < opt.fortschritt) {
            aufgegeben.add(schl);
            continue;
          }
        }
        const a = pr[(i - 1 + m) % m]!.p;
        const b = pr[(i + 1) % m]!.p;
        const t: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        // Umrissnormale: Tangente × Blickachse, in der Blattebene (Top: xz, Front: yz), nach außen (Seite der Probe)
        let w: V3 = s.ansicht === 'top' ? [t[2], 0, -t[0]] : [0, t[2], -t[1]];
        const lw = Math.hypot(w[0], w[1], w[2]) || 1;
        w = [w[0] / lw, w[1] / lw, w[2] / lw];
        const paare = nachbarPaare(nachF[q] ?? [], fein, q);
        let paar: [number, number] | null = null;
        let best = Infinity;
        const lt = Math.hypot(t[0], t[1], t[2]) || 1;
        for (const pa of paare) {
          const d: V3 = [fein[3 * pa[1]]! - fein[3 * pa[0]]!, fein[3 * pa[1] + 1]! - fein[3 * pa[0] + 1]!, fein[3 * pa[1] + 2]! - fein[3 * pa[0] + 2]!];
          const l = Math.hypot(d[0], d[1], d[2]) || 1;
          const c = Math.abs((d[0] * t[0] + d[1] * t[1] + d[2] * t[2]) / (l * lt));
          if (c < best) {
            best = c;
            paar = pa;
          }
        }
        const dq = Math.hypot(fein[3 * q]! - p.p[0], fein[3 * q + 1]! - p.p[1], fein[3 * q + 2]! - p.p[2]);
        dMax = Math.max(dMax, dq);
        dSum += dq;
        bindungen.push({ probe: p, fein: q, w, paar, ansicht: s.ansicht as 'front' | 'top', faktor });
      }
    }
    zuordnung.push({ max: dMax * PX, mittel: bindungen.length ? (dSum / bindungen.length) * PX : 0 });
    abstandVorher = abstandJetzt;
    const zeilen: NormalZeile[] = [...feste, ...nahtZeilen];
    const ziele: number[] = [...festeZiele, ...nahtZiele];
    // Ellipsen-Vorrang je Ring mit der aktuellen Ringmitte (Ziel −λ·Mitte); Faltenpunkte (gezeichnete Ecken) bleiben frei
    if (opt.ring > 0) {
      for (let i = 0; i < R; i++) {
        const c: V3 = [0, 0, 0];
        for (let j = 0; j < N; j++) {
          const p = ringPunkt(i, j);
          c[0] += xyz[3 * p]! / N;
          c[1] += xyz[3 * p + 1]! / N;
          c[2] += xyz[3 * p + 2]! / N;
        }
        for (let j = 0; j < N; j++) {
          const b = ringPunkt(i, j);
          if (k.vSchaerfe[b]! > 0) continue;
          const idx = [ringPunkt(i, j - 1), b, ringPunkt(i, j + 1)];
          for (let a = 0; a < 3; a++) {
            zeilen.push(achsZeile(idx, [1, -2 - lambda, 1], a as 0 | 1 | 2, opt.ring));
            ziele.push(-lambda * c[a]!);
          }
        }
      }
    }
    const letzte = runde === opt.runden - 1;
    for (const b of bindungen) {
      const z = grenzZeile(u.grenze, b.fein, n);
      const ist = fein[3 * b.fein]! * b.w[0] + fein[3 * b.fein + 1]! * b.w[1] + fein[3 * b.fein + 2]! * b.w[2];
      const soll = b.probe.p[0] * b.w[0] + b.probe.p[1] * b.w[1] + b.probe.p[2] * b.w[2];
      const luecke = soll - ist;
      const ziel = letzte || Math.abs(luecke) <= opt.schritt ? soll : ist + Math.sign(luecke) * opt.schritt;
      zeilen.push(dotZeile(z.index, z.wert, b.w, opt.gewicht * b.faktor));
      ziele.push(ziel);
      const dq = Math.hypot(fein[3 * b.fein]! - b.probe.p[0], fein[3 * b.fein + 1]! - b.probe.p[1], fein[3 * b.fein + 2]! - b.probe.p[2]);
      if (b.paar && opt.tangente > 0 && dq <= opt.nah) {
        const d = grenzDifferenz(u.grenze, b.paar[0], b.paar[1], n);
        zeilen.push(dotZeile(d.index, d.wert, b.w, opt.tangente * b.faktor));
        ziele.push(0);
      }
    }
    const tl = jetzt();
    let sys;
    try {
      sys = normalSystem(3 * n, zeilen, nach3);
    } catch {
      let spur = 0;
      for (const z of zeilen) for (let t = 0; t < z.index.length; t++) spur += z.gewicht * z.wert[t]! * z.wert[t]!;
      sys = normalSystem(3 * n, zeilen, nach3, Math.max(1e-12, (1e-9 * spur) / Math.max(1, 3 * n)));
    }
    huelle = sys.huelle;
    const rhs = new Float64Array(3 * n);
    zeilen.forEach((z, q) => {
      const g = z.gewicht * ziele[q]!;
      if (!g) return;
      for (let t = 0; t < z.index.length; t++) rhs[z.index[t]!]! += z.wert[t]! * g;
    });
    xyz = sys.loesenSpalte(rhs);
    msLoeser += jetzt() - tl;
    fein = anwenden3(u.grenze, xyz);
  }
  // Rest längs der Umrissnormale und Überstand
  const rest = { front: { max: 0, mittel: 0 }, top: { max: 0, mittel: 0 } };
  const zahl = { front: 0, top: 0 };
  const fern = { front: { zahl: 0, xVon: Infinity, xBis: -Infinity }, top: { zahl: 0, xVon: Infinity, xBis: -Infinity } };
  for (const b of bindungen) {
    const d = Math.abs((fein[3 * b.fein]! - b.probe.p[0]) * b.w[0] + (fein[3 * b.fein + 1]! - b.probe.p[1]) * b.w[1] + (fein[3 * b.fein + 2]! - b.probe.p[2]) * b.w[2]) * PX;
    const r = rest[b.ansicht];
    r.max = Math.max(r.max, d);
    r.mittel += d;
    zahl[b.ansicht]++;
    const dq = Math.hypot(fein[3 * b.fein]! - b.probe.p[0], fein[3 * b.fein + 1]! - b.probe.p[1], fein[3 * b.fein + 2]! - b.probe.p[2]) * PX;
    if (dq > 4) {
      const f = fern[b.ansicht];
      f.zahl++;
      f.xVon = Math.min(f.xVon, b.probe.p[0] * PX);
      f.xBis = Math.max(f.xBis, b.probe.p[0] * PX);
    }
  }
  rest.front.mittel = zahl.front ? rest.front.mittel / zahl.front : 0;
  rest.top.mittel = zahl.top ? rest.top.mittel / zahl.top : 0;
  // Überstand über die Silhouetten — ohne die Enden der Umrisse (3 px): an Spitzen laufen Front und Top in verschiedenen x
  // bzw. y aus, dort steht schon der heutige Körper 1–3 px „über“ (Kugel Top 2,6 px bei Δ 0,3)
  const breiten = abl.breiten;
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let p = 0; p < nF; p++) {
    xMin = Math.min(xMin, fein[3 * p]!);
    xMax = Math.max(xMax, fein[3 * p]!);
    yMin = Math.min(yMin, fein[3 * p + 1]!);
    yMax = Math.max(yMax, fein[3 * p + 1]!);
  }
  const rand = 3 / PX;
  let ueF = 0;
  let ueT = 0;
  for (let p = 0; p < nF; p++) {
    const x = fein[3 * p]!;
    const y = fein[3 * p + 1]!;
    const z = Math.abs(fein[3 * p + 2]!);
    if (y > yMin + rand && y < yMax - rand) {
      const f = breiten.front(y);
      if (f > 0 && z > f) ueF = Math.max(ueF, z - f);
    }
    if (x > xMin + rand && x < xMax - rand) {
      const t = breiten.top(x);
      if (t > 0 && z > t) ueT = Math.max(ueT, z - t);
    }
  }
  let bewegung = 0;
  for (let i = 0; i < n; i++) bewegung = Math.max(bewegung, Math.hypot(xyz[3 * i]! - start[3 * i]!, xyz[3 * i + 1]! - start[3 * i + 1]!, xyz[3 * i + 2]! - start[3 * i + 2]!));
  const kaefig: Kaefig = { ...k, xyz };
  const bericht: SchleifenBericht = {
    runden: opt.runden,
    ms: jetzt() - t0,
    msLoeser,
    proben: { front: { gezeichnet: gezeichnet.front, gebunden: zahl.front }, top: { gezeichnet: gezeichnet.top, gebunden: zahl.top } },
    nahtFein: abl.naht.fein.length,
    zuordnung,
    rest,
    ueberstand: { front: ueF * PX, top: ueT * PX },
    bewegung: bewegung * PX,
    fern,
    aufgegeben: { front: [...aufgegeben].filter((s) => s.startsWith('front')).length, top: [...aufgegeben].filter((s) => s.startsWith('top')).length },
    weich: { front: bindungen.filter((b) => b.ansicht === 'front' && b.faktor < 1).length, top: bindungen.filter((b) => b.ansicht === 'top' && b.faktor < 1).length },
    unbekannte: 3 * n,
    huelle,
  };
  return { abl: { ...abl, kaefig, fein }, bericht };
}
