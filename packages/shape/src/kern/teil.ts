// Wesen-Editor 2, Beweis 3 „Teil nahtlos“ (14.10.2026): Beine am Käfig.
//
// Verschmolzen (Plan 6, „Inset + Bridge“) wird hier als Ausstülpung gebaut, wie Blenders Extrude: Um einen
// Vorlagen-Ringpunkt (Hüfte) liegt ein Feld aus 2 × 2 Flächen. Diese vier Flächen wandern als Sohle ans Beinende, der
// Feldrand (8 Punkte) bleibt am Körper und wird Ring 0 des Beins, dazwischen entstehen Ringe aus je 8 neuen Punkten,
// der Feldmittelpunkt wird die Sohlenmitte. Kein Punkt wird entfernt, keine Brücke nötig, nur Vierecke, alle
// Vorlagen-Indizes bleiben gültig; Catmull-Clark macht die Schulter nahtlos. Gespiegelte Beine entstehen automatisch.
// Angesteckt ist ein Bein eine eigene kleine Röhre (Plan 6), deren oberer Teil im Körper steckt; sie wird getrennt
// gelöst und mitgezeichnet. Der Schwung (Hüfte) ist eine Pose auf dem Käfig: Drehung um den Hüftpunkt mit Gewicht je
// Ring (Ring 0 bleibt, Ring 1 halb, ab Ring 2 ganz), die Matrix liefert das feine Netz.

import type { Dokument } from '../dokument';
import { type Kaefig, type V3, alleFlaechen, kaefigAusFlaechen, kanteZwischen, pruefeKaefig } from '../kaefig/halbkanten';
import { type Roehre, roehre } from '../kaefig/roehre';
import { grenzLoeser, kaefigDurchZiele } from '../loeser/grenzflaeche';
import { unterteilung } from '../subdivision/catmullClark';
import { anwenden3 } from '../subdivision/matrix';
import { WIRBEL_STANDARD, leiter } from '../versuch/wirbelsaeule';
import { ABLEIT_STANDARD, type AbleitOptionen, type Ableitung, faltenSetzen, fertigstellen, stationenWaehlen, zieleBerechnen } from './ableiten';
import { silhouettenBreite } from './breite';

export type BeinOptionen = {
  /** Ringe des Beins (Ring 0 = Feldrand am Körper, letzter Ring = Sohlenrand) */
  ringe: number;
  /** Halbmesser der Säule als Anteil der Körperhöhe; die Schulter wächst vom Feldrand über `schulter` Ringe auf die Säule; Fuß (letzter Ring) als Faktor */
  radius: number;
  schulter: number;
  fuss: number;
  /** Beinlänge: 0 = bis zum Boden (y = 0), sonst Anteil der Körperhöhe */
  laenge: number;
  /** Ringe, über die der Schwung von 0 (Hüfte) auf 1 wächst */
  schwungRinge: number;
};

export const BEIN_STANDARD: BeinOptionen = { ringe: 6, radius: 0.1, schulter: 2, fuss: 1.15, laenge: 0.3, schwungRinge: 2 };

/** Ansatz eines Beins: Vorlagen-Ringpunkt (Ring i, Winkel j der rechten Hälfte) als Hüfte; gespiegelt entsteht das linke Bein. */
export type BeinAnsatz = { ring: number; j: number };

export type BeinInfo = {
  ansatz: BeinAnsatz;
  /** Feldrand (Ring 0) im Umlauf, Ringe 1 … R−1 (je 8), Sohlenmitte */
  rand: number[];
  ringe: number[][];
  sohle: number;
  huefte: V3;
  achse: V3;
};

export type BeinErgebnis = Ableitung & {
  beine: BeinInfo[];
  /** je Käfigpunkt: Herkunft (Vorlagen-Index), Teil-Wert (0 Körper, 1 Bein), Schwunggewicht, Bein-Nummer (−1 Körper) */
  teilQuelle: Int32Array;
  teilWert: Float32Array;
  schwungGewicht: Float64Array;
  beinNummer: Int16Array;
  /** angesteckte Beine: eigene Käfige mit feinem Netz */
  gesteckt: GestecktesBein[];
};

export type GestecktesBein = { vorlage: Roehre; kaefig: Kaefig; fein: Float64Array; unterteilung: ReturnType<typeof unterteilung>; huefte: V3; achse: V3; gewicht: Float64Array };

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Feldrand um den Ringpunkt (i, j) im Umlauf: (i−1, j−1) … über (i−1, j+1), (i+1, j+1) nach (i+1, j−1), (i, j−1). */
function feldRand(v: Roehre, i: number, j: number): number[] {
  const p = v.ringPunkt;
  return [p(i - 1, j - 1), p(i - 1, j), p(i - 1, j + 1), p(i, j + 1), p(i + 1, j + 1), p(i + 1, j), p(i + 1, j - 1), p(i, j - 1)];
}

/** Die vier Feldflächen um (i, j) als Index-Mengen (zum Erkennen in der Flächenliste). */
function feldFlaechen(v: Roehre, i: number, j: number): Set<string> {
  const p = v.ringPunkt;
  const f = (a: number, b: number) => [p(a, b), p(a, b + 1), p(a + 1, b + 1), p(a + 1, b)].sort((x, y) => x - y).join(',');
  return new Set([f(i - 1, j - 1), f(i - 1, j), f(i, j - 1), f(i, j)]);
}

/**
 * Beine an den Körper-Käfig setzen (verschmolzen): Flächen, Ziele und Zuordnungen. Die Vorlagen-Indizes bleiben, neue
 * Punkte hängen an; die Sohle besteht aus den vier Feldflächen mit dem Feldmittelpunkt.
 */
export function beineAnsetzen(v: Roehre, kaefigV: Kaefig, zieleV: Float64Array, hoeheV: Float64Array, ansaetze: readonly BeinAnsatz[], opt: BeinOptionen) {
  const { N } = v;
  const n0 = kaefigV.n;
  const R = Math.max(2, opt.ringe);
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n0; i++) {
    yMin = Math.min(yMin, zieleV[3 * i + 1]!);
    yMax = Math.max(yMax, zieleV[3 * i + 1]!);
  }
  const H = Math.max(1e-6, yMax - yMin);
  const flaechen = alleFlaechen(kaefigV).map((f) => [...f]);
  const schluessel = (f: readonly number[]) => [...f].sort((x, y) => x - y).join(',');
  // alle Ansätze: rechts wie angegeben, links gespiegelt
  const alle: BeinAnsatz[] = [];
  for (const a of ansaetze) {
    // Das Feld darf weder die Naht (j = 0, N/2) noch die Kappen berühren: sonst teilen sich die gespiegelten Beine Punkte
    if (a.ring < 1 || a.ring > v.R - 2 || a.j < 1 || a.j > N / 2 - 2) throw new Error(`Bein: Ansatz (${a.ring}, ${a.j}) muss in Ring 1 … ${v.R - 2} und Winkel 1 … ${N / 2 - 2} liegen (Feld 2 × 2 ohne Naht und Kappe)`);
    alle.push({ ring: a.ring, j: ((a.j % N) + N) % N });
    const links = ((N - a.j) % N + N) % N;
    if (links !== a.j) alle.push({ ring: a.ring, j: links });
  }
  const entfernen = new Set<string>();
  for (const a of alle) for (const k of feldFlaechen(v, a.ring, a.j)) entfernen.add(k);
  const koerperFlaechen = flaechen.filter((f) => !entfernen.has(schluessel(f)));
  const feldOriginal = new Map<string, number[]>();
  for (const f of flaechen) if (entfernen.has(schluessel(f))) feldOriginal.set(schluessel(f), f);
  let naechster = n0;
  const neu = () => naechster++;
  const beine: BeinInfo[] = [];
  const neueFlaechen: number[][] = [];
  const zielListe: { idx: number; p: V3 }[] = [];
  const quelle: number[] = [];
  const gewicht: number[] = [];
  const nummer: number[] = [];
  const P = (idx: number): V3 => [zieleV[3 * idx]!, zieleV[3 * idx + 1]!, zieleV[3 * idx + 2]!];
  // Umlaufsinn: die verbleibende Körperfläche an der Randkante (rand[0] → rand[1]) entscheidet
  const laufrichtung = (rand: number[]): number => {
    for (const f of koerperFlaechen) {
      const i0 = f.indexOf(rand[0]!);
      const i1 = f.indexOf(rand[1]!);
      if (i0 < 0 || i1 < 0) continue;
      return (i0 + 1) % f.length === i1 ? -1 : 1; // Fläche läuft 0 → 1: Röhre muss 1 → 0 laufen (= −1)
    }
    throw new Error('Bein: Körperfläche am Feldrand nicht gefunden');
  };
  alle.forEach((a, nr) => {
    const rand = feldRand(v, a.ring, a.j);
    const mitte = v.ringPunkt(a.ring, a.j);
    const huefte = P(mitte);
    // Achse: halb Lot, halb Hautnormale an der Hüfte (vom Ringmittelpunkt nach außen); an einem runden Bauch stellt sich
    // das Bein etwas schräg, sonst läge der erste Ring innen über dem Feldrand (Schulter faltet)
    const mitteRing: V3 = [0, 0, 0];
    for (let jj = 0; jj < N; jj++) for (let d3 = 0; d3 < 3; d3++) mitteRing[d3] = mitteRing[d3]! + zieleV[3 * v.ringPunkt(a.ring, jj) + d3]! / N;
    const nrm: V3 = [huefte[0] - mitteRing[0], huefte[1] - mitteRing[1], huefte[2] - mitteRing[2]];
    const nl = Math.hypot(...nrm) || 1;
    const ax: V3 = [0.5 * (nrm[0] / nl), 0.5 * (nrm[1] / nl) - 0.5, 0.5 * (nrm[2] / nl)];
    const al = Math.hypot(...ax) || 1;
    const achse: V3 = [ax[0] / al, ax[1] / al, ax[2] / al];
    const L = opt.laenge > 0 ? opt.laenge * H : Math.max(0.05 * H, huefte[1]);
    // Rahmen quer zur Achse: u1 = Wirbelsäule x (ohne Achsenanteil), u2 = Achse × u1; Winkel der Randpunkte darin
    const u1r: V3 = [1 - achse[0] * achse[0], -achse[1] * achse[0], -achse[2] * achse[0]];
    const u1l = Math.hypot(...u1r) || 1;
    const u1: V3 = [u1r[0] / u1l, u1r[1] / u1l, u1r[2] / u1l];
    const u2: V3 = [achse[1] * u1[2] - achse[2] * u1[1], achse[2] * u1[0] - achse[0] * u1[2], achse[0] * u1[1] - achse[1] * u1[0]];
    const winkel = rand.map((idx) => {
      const q = P(idx);
      const d3: V3 = [q[0] - huefte[0], q[1] - huefte[1], q[2] - huefte[2]];
      return Math.atan2(d3[0] * u2[0] + d3[1] * u2[1] + d3[2] * u2[2], d3[0] * u1[0] + d3[1] * u1[1] + d3[2] * u1[2]);
    });
    const rho0 = opt.radius * H;
    // Halbmesser des Feldrands (Mittel der Abstände zur Achse), Schulter wächst darauf zur Säule
    let rhoRand = 0;
    for (const idx of rand) {
      const q = P(idx);
      rhoRand += Math.hypot(q[0] - huefte[0], q[2] - huefte[2]) / rand.length;
    }
    const ringe: number[][] = [];
    for (let r = 1; r < R; r++) {
      const ring: number[] = [];
      const t = r / (R - 1);
      const sch = Math.min(1, r / Math.max(1, opt.schulter));
      const rho = (rhoRand + (rho0 - rhoRand) * sch) * (r === R - 1 ? opt.fuss : 1);
      for (let q = 0; q < 8; q++) {
        const idx = neu();
        ring.push(idx);
        const th = winkel[q]!;
        const cx = Math.cos(th);
        const sx = Math.sin(th);
        zielListe.push({ idx, p: [huefte[0] + achse[0] * L * t + rho * (cx * u1[0] + sx * u2[0]), huefte[1] + achse[1] * L * t + rho * (cx * u1[1] + sx * u2[1]), huefte[2] + achse[2] * L * t + rho * (cx * u1[2] + sx * u2[2])] });
        quelle[idx] = mitte;
        gewicht[idx] = Math.min(1, r / Math.max(1, opt.schwungRinge));
        nummer[idx] = nr;
      }
      ringe.push(ring);
    }
    // Sohlenmitte = Feldmittelpunkt, unten
    zielListe.push({ idx: mitte, p: [huefte[0] + achse[0] * L, huefte[1] + achse[1] * L, huefte[2] + achse[2] * L] });
    gewicht[mitte] = 1;
    nummer[mitte] = nr;
    // Röhrenflächen Ring r → r+1
    const d = laufrichtung(rand);
    const Rg = (r: number, q: number) => (r === 0 ? rand[q % 8]! : ringe[r - 1]![q % 8]!);
    for (let r = 0; r + 1 < R; r++) {
      for (let q = 0; q < 8; q++) {
        const f = [Rg(r, q), Rg(r, q + 1), Rg(r + 1, q + 1), Rg(r + 1, q)];
        neueFlaechen.push(d > 0 ? f : f.reverse());
      }
    }
    // Sohle: die vier Feldflächen, Randpunkte durch den letzten Ring ersetzt (gleiche Umlaufposition)
    const ersatz = new Map<number, number>();
    rand.forEach((idx, q) => ersatz.set(idx, ringe[R - 2]![q]!));
    for (const k of feldFlaechen(v, a.ring, a.j)) {
      const f = feldOriginal.get(k)!;
      neueFlaechen.push(f.map((idx) => ersatz.get(idx) ?? idx));
    }
    beine.push({ ansatz: a, rand, ringe, sohle: mitte, huefte, achse });
  });
  const n = naechster;
  const ziele = new Float64Array(3 * n);
  ziele.set(zieleV);
  const hoehe = new Float64Array(n);
  hoehe.set(hoeheV);
  for (const z of zielListe) {
    ziele[3 * z.idx] = z.p[0];
    ziele[3 * z.idx + 1] = z.p[1];
    ziele[3 * z.idx + 2] = z.p[2];
  }
  const teilQuelle = new Int32Array(n);
  const teilWert = new Float32Array(n);
  const schwungGewicht = new Float64Array(n);
  const beinNummer = new Int16Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    teilQuelle[i] = i < n0 ? i : quelle[i]!;
    hoehe[i] = i < n0 ? hoeheV[i]! : hoeheV[quelle[i]!]!;
    if (gewicht[i] !== undefined) {
      schwungGewicht[i] = gewicht[i]!;
      beinNummer[i] = nummer[i]!;
      teilWert[i] = 1;
    }
  }
  const kaefig = kaefigAusFlaechen(ziele, [...koerperFlaechen, ...neueFlaechen]);
  const pr = pruefeKaefig(kaefig);
  if (!pr.ok) throw new Error(`Bein: Käfig nicht konsistent: ${pr.fehler.slice(0, 3).join('; ')}`);
  // Falten der Vorlage übernehmen (gleiche Indizes)
  for (let e = 0; e < kaefigV.nE; e++) {
    const sch = kaefigV.eSchaerfe[e]!;
    if (sch <= 0) continue;
    const ke = kanteZwischen(kaefig, kaefigV.eA[e]!, kaefigV.eB[e]!);
    if (ke >= 0) kaefig.eSchaerfe[ke] = sch;
  }
  for (let i = 0; i < n0; i++) if (kaefigV.vSchaerfe[i]! > 0) kaefig.vSchaerfe[i] = kaefigV.vSchaerfe[i]!;
  return { kaefig, ziele, hoehe, beine, teilQuelle, teilWert, schwungGewicht, beinNummer };
}

/** Angestecktes Bein: eigene Röhre (R Ringe × 8), oben eine Gelenklänge im Körper, unten auf dem Boden; eigener Löser. */
export function beinGesteckt(v: Roehre, zieleV: Float64Array, ansatz: BeinAnsatz, opt: BeinOptionen, stufen: number): GestecktesBein {
  const n0 = v.kaefig.n;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n0; i++) {
    yMin = Math.min(yMin, zieleV[3 * i + 1]!);
    yMax = Math.max(yMax, zieleV[3 * i + 1]!);
  }
  const H = Math.max(1e-6, yMax - yMin);
  const mitte = v.ringPunkt(ansatz.ring, ansatz.j);
  const huefte: V3 = [zieleV[3 * mitte]!, zieleV[3 * mitte + 1]!, zieleV[3 * mitte + 2]!];
  const achse: V3 = [0, -1, 0];
  const R = Math.max(3, opt.ringe + 1);
  const vorlage = roehre(R, 8);
  const rho0 = opt.radius * H;
  const L = opt.laenge > 0 ? opt.laenge * H : Math.max(0.05 * H, huefte[1]);
  const tief = 0.35 * L; // Gelenklänge im Körper
  const ziele = new Float64Array(3 * vorlage.kaefig.n);
  const gewicht = new Float64Array(vorlage.kaefig.n).fill(1);
  const setze = (idx: number, p: V3) => {
    ziele[3 * idx] = p[0];
    ziele[3 * idx + 1] = p[1];
    ziele[3 * idx + 2] = p[2];
  };
  for (let r = 0; r < R; r++) {
    const t = r / (R - 1);
    const y = huefte[1] + tief - (L + tief) * t;
    const rho = rho0 * (r === R - 1 ? opt.fuss : r === 0 ? 0.8 : 1);
    for (let j = 0; j < 8; j++) {
      const th = (2 * Math.PI * j) / 8;
      setze(vorlage.ringPunkt(r, j), [huefte[0] + rho * Math.cos(th), y, huefte[2] + rho * Math.sin(th)]);
    }
  }
  setze(vorlage.kappe('vorn', 1, 1), [huefte[0], huefte[1] + tief + 0.3 * rho0, huefte[2]]);
  setze(vorlage.kappe('hinten', 1, 1), [huefte[0], huefte[1] - L, huefte[2]]);
  const u = unterteilung(vorlage.kaefig, stufen);
  const loeser = grenzLoeser(u.grenze, vorlage.kaefig.n);
  const xyz = kaefigDurchZiele(loeser, ziele);
  const kaefig = { ...vorlage.kaefig, xyz };
  return { vorlage, kaefig, fein: anwenden3(u.grenze, xyz), unterteilung: u, huefte, achse, gewicht };
}

/** Ableitung wie `ableiten`, dazu Beine (verschmolzen oder angesteckt) an den Ansätzen. */
export function ableitenMitBeinen(dok: Dokument, ansaetze: readonly BeinAnsatz[], art: 'verschmolzen' | 'angesteckt', optionen: Partial<AbleitOptionen> = {}, beinOptionen: Partial<BeinOptionen> = {}): BeinErgebnis {
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const bopt = { ...BEIN_STANDARD, ...beinOptionen };
  const t0 = jetzt();
  const l = leiter(dok, WIRBEL_STANDARD);
  const t1 = jetzt();
  const breiten = silhouettenBreite(dok);
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, dok);
  faltenSetzen(vorlage, st, l, dok, breiten, opt);
  const { ziele, hoehe } = zieleBerechnen(vorlage, l, st, breiten, dok, opt);
  if (art === 'angesteckt') {
    const abl = fertigstellen({ opt, vorlage, kaefig: vorlage.kaefig, ziele, hoehe, l, st, breiten, dok, zeiten: { t0, t1, t2 } });
    const gesteckt: GestecktesBein[] = [];
    for (const a of ansaetze) {
      gesteckt.push(beinGesteckt(vorlage, ziele, a, bopt, opt.stufen));
      const links = ((vorlage.N - a.j) % vorlage.N + vorlage.N) % vorlage.N;
      if (links !== a.j) gesteckt.push(beinGesteckt(vorlage, ziele, { ring: a.ring, j: links }, bopt, opt.stufen));
    }
    const n = abl.kaefig.n;
    return { ...abl, beine: [], teilQuelle: Int32Array.from({ length: n }, (_, i) => i), teilWert: new Float32Array(n), schwungGewicht: new Float64Array(n), beinNummer: new Int16Array(n).fill(-1), gesteckt };
  }
  const b = beineAnsetzen(vorlage, vorlage.kaefig, ziele, hoehe, ansaetze, bopt);
  const haut = new Uint8Array(b.kaefig.n);
  for (let i = 0; i < b.kaefig.n; i++) haut[i] = b.teilWert[i]! > 0 ? 0 : 1;
  const abl = fertigstellen({ opt, vorlage, kaefig: b.kaefig, ziele: b.ziele, hoehe: b.hoehe, l, st, breiten, dok, haut, zeiten: { t0, t1, t2 } });
  return { ...abl, beine: b.beine, teilQuelle: b.teilQuelle, teilWert: b.teilWert, schwungGewicht: b.schwungGewicht, beinNummer: b.beinNummer, gesteckt: [] };
}

/** Beinschwung (Grad, + = nach hinten) als Pose: Drehung um den Hüftpunkt in der Seitenebene mit Gewicht je Ring. */
export function beinPose(abl: BeinErgebnis, schwungGrad: number): { xyz: Float64Array; fein: Float64Array; gesteckt: Float64Array[] } {
  const xyz = new Float64Array(abl.kaefig.xyz);
  const w = (schwungGrad * Math.PI) / 180;
  const drehe = (arr: Float64Array, i: number, h: V3, winkel: number) => {
    const c = Math.cos(winkel);
    const s = Math.sin(winkel);
    const x = arr[3 * i]! - h[0];
    const y = arr[3 * i + 1]! - h[1];
    arr[3 * i] = h[0] + x * c - y * s;
    arr[3 * i + 1] = h[1] + x * s + y * c;
  };
  for (let i = 0; i < abl.kaefig.n; i++) {
    const g = abl.schwungGewicht[i]!;
    if (g <= 0) continue;
    const bein = abl.beine[abl.beinNummer[i]!]!;
    drehe(xyz, i, bein.huefte, w * g);
  }
  const gesteckt: Float64Array[] = [];
  for (const gb of abl.gesteckt) {
    const x2 = new Float64Array(gb.kaefig.xyz);
    for (let i = 0; i < gb.kaefig.n; i++) drehe(x2, i, gb.huefte, w);
    gesteckt.push(anwenden3(gb.unterteilung.grenze, x2));
  }
  return { xyz, fein: anwenden3(abl.unterteilung.grenze, xyz), gesteckt };
}
