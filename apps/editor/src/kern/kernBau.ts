// Wesen-Editor 2, Phase 0 / Beweis 1 (13.10.2026): Bauweise „kern“ als Tab am 3D-Fenster. Der Seitenumriss wird einmal
// abgeleitet (Leiter, Poisson-Dicke, Röhre, Löser; packages/shape/src/kern), danach bewegt ein Zug am Seitenumriss nur
// die Ziele; Löser und Matrix liefern das feine Netz in wenigen Millisekunden. Zur Anzeige: Abweichung der Naht von
// der Kurve (px bei 461 px je Kachel) und Zeiten.

import type { Dokument, V2 } from '@ee/shape';
import { DESKRIPTOR_FLOATS, KLINGE_BUESCHEL, KLINGE_FLAMME, KLINGE_SCHWADE, type Ableitung, type BeinErgebnis, type GesichtMaske, type Haut, type KlingenLage, type KlingenVorlage, type MaulErgebnis, type MaulLinie, ableiten, ableitenMitBeinen, ableitenMitMaul, alleFlaechen, beinPose, bueschelAufHaut, deskriptoren, flaemmchen, gekaemmt, hautAus, hautPunkt, kastenSpanten, klingenBauen, klingenNetz, klingenVorlage, maulLinieVorlage, maulOptionenVorlage, maulPose, seiteZiehen, umrissBei, umrissDicht, zahnLagen, zungenAmScheitel } from '@ee/shape/kern';
import { useUi } from '../state/uiStore';
import { zuDreiecken, type V3 } from '@ee/shape/versuch';
import { create } from 'zustand';
import { type Auge, type Gesicht, type Look, PALETTEN } from '../three/wesenLook';

export type MaulArt = 'aus' | 'vorn' | 'unten' | 'hals';
export type BeinArt = 'aus' | 'verschmolzen' | 'angesteckt';
export type StilArt = 'fest' | 'feuer' | 'gas' | 'fell';

export type KernInfo = {
  kaefigPunkte: number;
  feinPunkte: number;
  /** Naht → Kurve, max und Mittel (px) */
  nahtMax: number;
  nahtMittel: number;
  /** Zeiten (ms) */
  ableitung: number;
  zug: number;
  ecken: number;
  schnell: boolean;
};

const q = new URLSearchParams(location.search);
const startLook: Look = q.get('look') === 'earle' ? 'earle' : 'matcap';
const startPalette = q.get('palette') && PALETTEN[q.get('palette')!] ? q.get('palette')! : 'tiger';
const startMaul: MaulArt = (['vorn', 'unten', 'hals'] as const).find((a) => a === q.get('maul')) ?? 'aus';
const startBeine: BeinArt = (['verschmolzen', 'angesteckt'] as const).find((a) => a === q.get('beine')) ?? 'aus';
const startStil: StilArt = (['feuer', 'gas', 'fell'] as const).find((a) => a === q.get('stil')) ?? 'fest';
if (q.get('oeffnung')) useUi.getState().setzeOeffnung(Number(q.get('oeffnung')));
if (q.get('zebra') === '1') useUi.getState().setzeZebra(true);
// Kamera für Bilder: `kamera=azimut°,elevation°,distanz[,zielX,zielY,zielZ]`
if (q.get('kamera')) {
  const [az, el, dist, zx, zy, zz] = q.get('kamera')!.split(',').map(Number);
  if (Number.isFinite(az) && Number.isFinite(el) && Number.isFinite(dist)) useUi.setState({ kamera: { azimut: (az! * Math.PI) / 180, elevation: (el! * Math.PI) / 180, distanz: dist!, ziel: [zx ?? 0, zy ?? 0.18, zz ?? 0] } });
}

export const useKernAnzeige = create<{
  info: KernInfo | null;
  look: Look;
  palette: string;
  /** Beweis 2: Maul an einer der drei Stellen (vorgefertigte Linie je Wesen) */
  maul: MaulArt;
  /** Käfig als Linien zeigen (Röntgen) */
  kaefig: boolean;
  /** Beweis 3: zwei Säulenbeine (Ring 15, Winkel 6, gespiegelt), Schwung in Grad */
  beine: BeinArt;
  schwung: number;
  /** Beweis 5: Stil fest · feuer · gas · fell (Klingen als Käfige, Feuer/Gas-Material) */
  stil: StilArt;
  setzeStil: (s: StilArt) => void;
  setzeLook: (l: Look) => void;
  setzePalette: (p: string) => void;
  setzeMaul: (m: MaulArt) => void;
  setzeKaefig: (an: boolean) => void;
  setzeBeine: (b: BeinArt) => void;
  setzeSchwung: (grad: number) => void;
}>((set) => ({
  info: null,
  look: startLook,
  palette: startPalette,
  maul: startMaul,
  kaefig: q.get('kaefig') === '1',
  beine: startBeine,
  schwung: q.get('schwung') ? Number(q.get('schwung')) : 0,
  stil: startStil,
  setzeStil: (stil) => set({ stil }),
  setzeLook: (look) => set({ look }),
  setzePalette: (palette) => set({ palette }),
  setzeMaul: (maul) => set({ maul }),
  setzeKaefig: (kaefig) => set({ kaefig }),
  setzeBeine: (beine) => set({ beine }),
  setzeSchwung: (schwung) => set({ schwung: Math.max(-60, Math.min(60, schwung)) }),
}));

const PX = 461;
let letzte: { dok: Dokument; abl: Ableitung; maul: MaulArt; beine: BeinArt } | null = null;

function gleicheTopologie(a: Dokument, b: Dokument): boolean {
  return a.profile.seite.knoten.length === b.profile.seite.knoten.length && a.profile.front === b.profile.front && a.profile.top === b.profile.top && a.skalierung === b.skalierung;
}

function nahtAbweichung(abl: Ableitung, dok: Dokument): { max: number; mittel: number } {
  const u = umrissDicht(dok);
  let max = 0;
  let summe = 0;
  const n = abl.naht.fein.length;
  for (let k = 0; k < n; k++) {
    const i = abl.naht.fein[k]!;
    const p: V2 = { x: abl.fein[3 * i]!, y: abl.fein[3 * i + 1]! };
    // Abstand zum Umriss-Polygon (dicht abgetastet): nächstes Segment
    let best = Infinity;
    const m = u.pts.length;
    for (let s = 0; s < m; s++) {
      const a = u.pts[s]!;
      const b = u.pts[(s + 1) % m]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby;
      const f = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
      const d = Math.hypot(a.x + abx * f - p.x, a.y + aby * f - p.y);
      if (d < best) best = d;
    }
    max = Math.max(max, best);
    summe += best;
  }
  void umrissBei;
  return { max: max * PX, mittel: n ? (summe / n) * PX : 0 };
}

export type KernNetz = {
  positionen: Float32Array;
  normalen: Float32Array;
  /** 16 Deskriptor-Floats je Ecke (nur mit Look „earle“) */
  deskriptoren: Float32Array | null;
  hoehe: number;
  augen: Auge[];
  /** Käfigkanten als Liniensegmente (Röntgen), sonst null */
  kaefigLinien: Float32Array | null;
  /** Lippenband-Breite (Welt) bei Maul, sonst 0 */
  lippenBand: number;
  kaefigFarben: Float32Array | null;
  /** Beweis 5: Stil des Netzes und Körpermitte (Feuer/Gas-Material) */
  stil: StilArt;
  mitte: [number, number, number];
  /** Beweis 4: Ruhelage je Ecke (bei Posen), Gesicht (Nase, Scharte), Zähne */
  ruhe: Float32Array | null;
  gesicht: Gesicht | null;
  zaehne: { positionen: Float32Array; normalen: Float32Array; anteil: Float32Array } | null;
};

/** Ausstattung je Prüfwesen (Beweis 4): Kastenschnauze, Maullinie, Augen, Gesicht, Wangen und Ohren beim Tiger. */
type Ausstattung = {
  dok: Dokument;
  maul: (art: MaulArt) => MaulLinie;
  augen: { ring: number; j: number; groesse: number };
  /** Dreiecksnase und Scharte (gemalt) */
  gesicht: boolean;
  /** Wangenzacken und Ohren als Klingen */
  wangen: boolean;
  /** Helle Schnauze ohne Muster (Gesichtsmaske auf dem Käfig) */
  gesichtMaske: GesichtMaske | undefined;
  /** Lippenband als Anteil der Höhe (Tiger: dünne dunkle Lippenlinie) */
  lippenBand: number;
};
function ausstattung(dok: Dokument): Ausstattung {
  if (dok.name === 'tiger') {
    return {
      dok: { ...dok, spanten: kastenSpanten(dok.profile.front, 0.02, 0.15, 0.25, 0.85) },
      maul: () => ({ fv: [{ f: 0.02, v: 0.28 }, { f: 0.1, v: 0.26 }, { f: 0.17, v: 0.33 }], unterSpitze: 1 }),
      augen: { ring: 4, j: 3, groesse: 0.1 },
      gesicht: true,
      wangen: true,
      gesichtMaske: { voll: 2, aus: 6, oben: 0.75 },
      lippenBand: 0.009,
    };
  }
  return { dok, maul: (art) => maulLinieVorlage(dok, art === 'aus' ? 'vorn' : art), augen: { ring: 2, j: Math.max(1, Math.round(16 / 8)), groesse: 0.11 }, gesicht: false, wangen: false, gesichtMaske: undefined, lippenBand: 0.03 };
}

let zahnVorlage: KlingenVorlage | null = null;
let zackenVorlage: KlingenVorlage | null = null;
let ohrVorlage: KlingenVorlage | null = null;

/** Klingen (ohne Wehen) als Dreiecke mit Deskriptoren je Ecke aus dem Fußpunkt und einem Höhenanteil je Ecke. */
function klingenStatisch(kv: KlingenVorlage, lagen: readonly KlingenLage[], feinDesk: Float32Array | null): { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null; anteil: Float32Array } {
  const klingen = klingenBauen(kv, lagen);
  const fl = alleFlaechen(klingenNetz(kv));
  const teile: { positionen: Float32Array; normalen: Float32Array; lage: KlingenLage }[] = [];
  for (const k of klingen) {
    const pts: V3[] = [];
    for (let i = 0; i < k.fein.length / 3; i++) pts.push([k.fein[3 * i]!, k.fein[3 * i + 1]!, k.fein[3 * i + 2]!]);
    teile.push({ ...zuDreiecken({ punkte: pts, flaechen: fl, schaerfe: new Map() }, 60), lage: k.lage });
  }
  const n = teile.reduce((a, b) => a + b.positionen.length, 0);
  const positionen = new Float32Array(n);
  const normalen = new Float32Array(n);
  const anteil = new Float32Array(n / 3);
  const desk = feinDesk ? new Float32Array((n / 3) * DESKRIPTOR_FLOATS) : null;
  let o = 0;
  for (const t of teile) {
    positionen.set(t.positionen, o);
    normalen.set(t.normalen, o);
    const l = t.lage;
    for (let e = 0; e < t.positionen.length / 3; e++) {
      const dx = t.positionen[3 * e]! - l.fuss[0];
      const dy = t.positionen[3 * e + 1]! - l.fuss[1];
      const dz = t.positionen[3 * e + 2]! - l.fuss[2];
      const th = Math.min(1, Math.max(0, (dx * l.achse[0] + dy * l.achse[1] + dz * l.achse[2]) / Math.max(1e-6, l.laenge)));
      anteil[o / 3 + e] = th;
      if (desk && feinDesk) {
        const b = Math.min(feinDesk.length / DESKRIPTOR_FLOATS - 1, l.basis ?? 0);
        const o2 = (o / 3 + e) * DESKRIPTOR_FLOATS;
        desk.set(feinDesk.subarray(b * DESKRIPTOR_FLOATS, (b + 1) * DESKRIPTOR_FLOATS), o2);
        desk[o2 + 8] = 0.6 * (1 - th) * (1 - th);
      }
    }
    o += t.positionen.length;
  }
  return { positionen, normalen, desk, anteil };
}

/** Wangenbüschel (Kranz um die untere Gesichtshälfte) als Zacken; Schnauze zeigt nach −x. */
function wangen(haut: Haut, hoehe: number): KlingenLage[] {
  const lagen: KlingenLage[] = [];
  const pol = (56 * Math.PI) / 180;
  for (let i = 0; i < 14; i++) {
    const phi = ((95 + (170 * i) / 13) * Math.PI) / 180; // 0 = oben; 95 … 265 = untere Hälfte, rechts herum
    const r: V3 = [-Math.cos(pol), Math.sin(pol) * Math.cos(phi), Math.sin(pol) * Math.sin(phi)];
    const hp = hautPunkt(haut, r);
    const achse = gekaemmt([hp.n[0] * 0.5 + 0.5, hp.n[1] * 0.5 - 0.15, hp.n[2] * 0.5], 0);
    const quer: V3 = [0, 1, 0];
    const g = 0.11 * hoehe;
    lagen.push({ fuss: hp.p, achse, quer, laenge: g, breite: 0.5 * g, phase: 0, basis: hp.i });
  }
  return lagen;
}

/** Ohren: zwei runde Tropfen oben seitlich am Kopf, leicht nach außen gekämmt. */
function ohren(haut: Haut, hoehe: number): KlingenLage[] {
  const lagen: KlingenLage[] = [];
  for (const seite of [1, -1]) {
    const r: V3 = [-0.2, 0.8, 0.6 * seite];
    const hp = hautPunkt(haut, r);
    const g = 0.12 * hoehe;
    lagen.push({ fuss: hp.p, achse: gekaemmt(hp.n, 0.5), quer: [1, 0, 0], laenge: g, breite: 1.1 * g, phase: 0, basis: hp.i });
  }
  return lagen;
}

const verketten = (a: Float32Array, b: Float32Array): Float32Array => {
  const c = new Float32Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
};

/** Klingenstand für die Animation (Wehen als Käfig-Pose je Bild) */
type KlingenStand = {
  stil: StilArt;
  vorlage: KlingenVorlage;
  lagen: KlingenLage[];
  zusatzVorlage: KlingenVorlage | null;
  haut: Haut;
  hoehe: number;
  saat: number;
  /** Körper-Dreiecke (statisch) und Deskriptoren je Ecke */
  koerper: { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null; feinDesk: Float32Array | null };
  hebung: number;
};
let klingenStand: KlingenStand | null = null;

/** Klingen (und Flämmchen) für Zeit t bauen: Dreiecke aller Klingen hintereinander, dazu Deskriptoren je Ecke (Fell). */
function klingenDreiecke(st: KlingenStand, zeit: number): { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null } {
  const amp = st.stil === 'feuer' ? 0.32 : st.stil === 'gas' ? 0.22 : 0.07;
  const om = st.stil === 'feuer' ? 2.6 : st.stil === 'gas' ? 1.1 : 1.6;
  const klingen = klingenBauen(st.vorlage, st.lagen, (l) => amp * Math.sin(om * zeit + l.phase) + 0.3 * amp * Math.sin(1.9 * om * zeit + 2 * l.phase));
  const netz = klingenNetz(st.vorlage);
  const fl = alleFlaechen(netz);
  const teile: { positionen: Float32Array; normalen: Float32Array; basis: number | undefined; lage: KlingenLage }[] = [];
  for (const k of klingen) {
    const pts: V3[] = [];
    for (let i = 0; i < k.fein.length / 3; i++) pts.push([k.fein[3 * i]!, k.fein[3 * i + 1]!, k.fein[3 * i + 2]!]);
    const t = zuDreiecken({ punkte: pts, flaechen: fl, schaerfe: new Map() }, 60);
    teile.push({ ...t, basis: k.lage.basis, lage: k.lage });
  }
  if (st.zusatzVorlage) {
    // abgelöste Flämmchen/Bläschen: steigen in 3 s auf und schrumpfen
    const umlauf = (zeit / 3) % 1;
    const lagen = flaemmchen(st.haut, st.hoehe, st.stil === 'gas' ? 7 : 6, st.saat + 5, umlauf);
    const fz = klingenBauen(st.zusatzVorlage, lagen, (l) => 0.2 * Math.sin(3 * zeit + l.phase));
    const nz = alleFlaechen(klingenNetz(st.zusatzVorlage));
    for (const k of fz) {
      const pts: V3[] = [];
      for (let i = 0; i < k.fein.length / 3; i++) pts.push([k.fein[3 * i]!, k.fein[3 * i + 1]!, k.fein[3 * i + 2]!]);
      const t = zuDreiecken({ punkte: pts, flaechen: nz, schaerfe: new Map() }, 60);
      teile.push({ ...t, basis: k.lage.basis, lage: k.lage });
    }
  }
  const n = teile.reduce((a, b) => a + b.positionen.length, 0);
  const positionen = new Float32Array(n);
  const normalen = new Float32Array(n);
  const desk = st.koerper.feinDesk ? new Float32Array((n / 3) * DESKRIPTOR_FLOATS) : null;
  let o = 0;
  for (const t of teile) {
    positionen.set(t.positionen, o);
    normalen.set(t.normalen, o);
    if (desk && st.koerper.feinDesk) {
      const b = Math.min(st.koerper.feinDesk.length / DESKRIPTOR_FLOATS - 1, t.basis ?? 0);
      const zeile = st.koerper.feinDesk.subarray(b * DESKRIPTOR_FLOATS, (b + 1) * DESKRIPTOR_FLOATS);
      // Ansatz dunkel, Spitze hell (Plan 7: Verlauf je Büschel) über den AO-Kanal (eeExtra.x), Höhe längs der Klingenachse
      const l = t.lage;
      for (let e = 0; e < t.positionen.length / 3; e++) {
        const o2 = (o / 3 + e) * DESKRIPTOR_FLOATS;
        desk.set(zeile, o2);
        const dx = t.positionen[3 * e]! - l.fuss[0];
        const dy = t.positionen[3 * e + 1]! - l.fuss[1];
        const dz = t.positionen[3 * e + 2]! - l.fuss[2];
        const th = Math.min(1, Math.max(0, (dx * l.achse[0] + dy * l.achse[1] + dz * l.achse[2]) / Math.max(1e-6, l.laenge)));
        desk[o2 + 8] = 0.7 * (1 - th) * (1 - th);
      }
    }
    o += t.positionen.length;
  }
  return { positionen, normalen, desk };
}

/** Körper und Klingen zusammenfügen (Hebung auf die Füße bleibt erhalten). */
function zusammen(st: KlingenStand, k: { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null }): { positionen: Float32Array; normalen: Float32Array; desk: Float32Array | null } {
  const positionen = new Float32Array(st.koerper.positionen.length + k.positionen.length);
  const normalen = new Float32Array(positionen.length);
  positionen.set(st.koerper.positionen);
  positionen.set(k.positionen, st.koerper.positionen.length);
  normalen.set(st.koerper.normalen);
  normalen.set(k.normalen, st.koerper.normalen.length);
  if (st.hebung) for (let i = st.koerper.positionen.length + 1; i < positionen.length; i += 3) positionen[i]! += st.hebung;
  let desk: Float32Array | null = null;
  if (st.koerper.desk && k.desk) {
    desk = new Float32Array(st.koerper.desk.length + k.desk.length);
    desk.set(st.koerper.desk);
    desk.set(k.desk, st.koerper.desk.length);
  }
  return { positionen, normalen, desk };
}

/** Animation (Beweis 5): Klingen für die Zeit t neu posieren; null ohne Klingen. */
export function kernAnimieren(zeit: number): { positionen: Float32Array; normalen: Float32Array } | null {
  if (!klingenStand) return null;
  const k = klingenDreiecke(klingenStand, zeit);
  const z = zusammen(klingenStand, k);
  return { positionen: z.positionen, normalen: z.normalen };
}

/** Käfigkanten (Lagen `xyz`) als Segmente; Lippen und Tasche in Farbe. */
function kaefigSegmente(abl: Ableitung, xyz: Float64Array): { punkte: Float32Array; farben: Float32Array } {
  const k = abl.kaefig;
  const punkte = new Float32Array(6 * k.nE);
  const farben = new Float32Array(6 * k.nE);
  const art = (abl as Partial<MaulErgebnis>).maul?.art ?? null;
  for (let e = 0; e < k.nE; e++) {
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    punkte.set([xyz[3 * a]!, xyz[3 * a + 1]!, xyz[3 * a + 2]!, xyz[3 * b]!, xyz[3 * b + 1]!, xyz[3 * b + 2]!], 6 * e);
    const aa = art ? art[a]! : 0;
    const ab = art ? art[b]! : 0;
    const farbe = k.eSchaerfe[e]! > 0 ? [0.1, 0.1, 0.1] : aa >= 3 || ab >= 3 ? [0.75, 0.2, 0.3] : aa > 0 && ab > 0 ? [0.95, 0.4, 0.1] : [0.5, 0.52, 0.55];
    farben.set([...farbe, ...farbe], 6 * e);
  }
  return { punkte, farben };
}

/** Deskriptoren je feinem Punkt → je Dreiecksecke in der Reihenfolge von `zuDreiecken` (Fächer je Fläche). */
function jeEcke(d: Float32Array, flaechen: number[][]): Float32Array {
  let ecken = 0;
  for (const f of flaechen) ecken += 3 * Math.max(0, f.length - 2);
  const out = new Float32Array(ecken * DESKRIPTOR_FLOATS);
  let o = 0;
  for (const f of flaechen) {
    for (let i = 1; i < f.length - 1; i++) {
      for (const v of [f[0]!, f[i]!, f[i + 1]!]) {
        out.set(d.subarray(v * DESKRIPTOR_FLOATS, (v + 1) * DESKRIPTOR_FLOATS), o);
        o += DESKRIPTOR_FLOATS;
      }
    }
  }
  return out;
}

/** Ein gemaltes Schlitzauge rechts am Kopf (Ring 2, 45° oben rechts), gespiegelt links; Größe ≈ 11 % der Höhe. */
function augenAm(abl: Ableitung, hoehe: number, wahl: { ring: number; j: number; groesse: number } = { ring: 2, j: 2, groesse: 0.11 }): Auge[] {
  const v = abl.vorlage;
  const i = Math.min(wahl.ring, v.R - 1);
  const j = Math.max(1, Math.min(v.N / 2 - 1, wahl.j));
  const p = v.ringPunkt(i, j);
  const f = abl.fein;
  // Ringmitte aus den feinen Lagen der Ringpunkte
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (let k = 0; k < v.N; k++) {
    const r = v.ringPunkt(i, k);
    mx += f[3 * r]!;
    my += f[3 * r + 1]!;
    mz += f[3 * r + 2]!;
  }
  mx /= v.N;
  my /= v.N;
  mz /= v.N;
  const pos: [number, number, number] = [f[3 * p]!, f[3 * p + 1]!, f[3 * p + 2]!];
  const n: [number, number, number] = [pos[0] - mx, pos[1] - my, pos[2] - mz];
  const l = Math.hypot(...n) || 1;
  const normale: [number, number, number] = [n[0] / l, n[1] / l, n[2] / l];
  const groesse = wahl.groesse * hoehe;
  return [
    { pos, normale, groesse },
    { pos: [pos[0], pos[1], -pos[2]], normale: [normale[0], normale[1], -normale[2]], groesse },
  ];
}

/** Feines Netz (Dreiecke mit Normalen) der Bauweise „kern“; während Gesten nur Zug, sonst Ableitung. */
export function kernBauen(dokRoh: Dokument, schnell: boolean): KernNetz {
  let abl: Ableitung;
  let zug = 0;
  let ableitung = 0;
  const aus = ausstattung(dokRoh);
  const dok = aus.dok;
  const maul = useKernAnzeige.getState().maul;
  const beine = useKernAnzeige.getState().beine;
  let fein: Float64Array;
  let xyz: Float64Array;
  /** angesteckte Beine: feine Netze (Dreiecke werden angehängt) */
  let gesteckt: { fein: Float64Array; abl: BeinErgebnis } | null = null;
  if (beine !== 'aus') {
    // Beweis 3: zwei Säulenbeine am Bauch; Umbau nur bei neuem Dokument oder anderer Art, der Schwung ist eine Pose
    if (letzte && letzte.beine === beine && letzte.maul === 'aus' && letzte.dok === dok) abl = letzte.abl;
    else {
      abl = ableitenMitBeinen(dok, [{ ring: 15, j: 6 }], beine);
      ableitung = abl.zeiten.gesamt;
    }
    const t0 = performance.now();
    const pose = beinPose(abl as BeinErgebnis, useKernAnzeige.getState().schwung);
    zug = performance.now() - t0;
    fein = pose.fein;
    xyz = pose.xyz;
    if ((abl as BeinErgebnis).gesteckt.length) gesteckt = { fein: pose.gesteckt.length ? Float64Array.from(pose.gesteckt.flatMap((f) => Array.from(f))) : new Float64Array(0), abl: abl as BeinErgebnis };
  } else if (maul !== 'aus') {
    // Beweis 2: Maul im Käfig; Umbau nur bei neuem Dokument oder anderer Lage, die Pose (Öffnung) läuft auf dem Käfig
    if (letzte && letzte.maul === maul && letzte.dok === dok) abl = letzte.abl;
    else {
      abl = ableitenMitMaul(dok, aus.maul(maul), {}, maulOptionenVorlage(maul));
      ableitung = abl.zeiten.gesamt;
    }
    const t0 = performance.now();
    const pose = maulPose(abl as MaulErgebnis, useUi.getState().oeffnung);
    zug = performance.now() - t0;
    fein = pose.fein;
    xyz = pose.xyz;
  } else if (schnell && letzte && letzte.maul === 'aus' && gleicheTopologie(letzte.dok, dok)) {
    const r = seiteZiehen(letzte.abl, dok);
    abl = r;
    zug = r.zugZeit.leiter + r.zugZeit.ziele + r.zugZeit.loeser + r.zugZeit.matrix;
    fein = abl.fein;
    xyz = abl.kaefig.xyz;
  } else {
    abl = ableiten(dok);
    ableitung = abl.zeiten.gesamt;
    fein = abl.fein;
    xyz = abl.kaefig.xyz;
  }
  letzte = { dok, abl, maul: beine !== 'aus' ? 'aus' : maul, beine };
  const letzteStufe = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
  const punkte: V3[] = [];
  const f = fein;
  for (let i = 0; i < f.length / 3; i++) punkte.push([f[3 * i]!, f[3 * i + 1]!, f[3 * i + 2]!]);
  const flaechen = alleFlaechen(letzteStufe);
  const t0 = zuDreiecken({ punkte, flaechen, schaerfe: new Map() }, 40);
  // angesteckte Beine: eigene feine Netze anhängen (Deskriptoren der Hüfte)
  let t = t0;
  let gesteckteEcken = 0;
  if (gesteckt) {
    const teile: { positionen: Float32Array; normalen: Float32Array }[] = [t0];
    let off = 0;
    for (const g of gesteckt.abl.gesteckt) {
      const nF = g.fein.length / 3;
      const pts: V3[] = [];
      for (let i = 0; i < nF; i++) pts.push([gesteckt.fein[off + 3 * i]!, gesteckt.fein[off + 3 * i + 1]!, gesteckt.fein[off + 3 * i + 2]!]);
      off += 3 * nF;
      const fl = alleFlaechen(g.unterteilung.stufen[g.unterteilung.stufen.length - 1]!.kaefig);
      const tg = zuDreiecken({ punkte: pts, flaechen: fl, schaerfe: new Map() }, 40);
      gesteckteEcken += tg.positionen.length / 3;
      teile.push(tg);
    }
    const nPos = teile.reduce((a, b) => a + b.positionen.length, 0);
    const positionen = new Float32Array(nPos);
    const normalen = new Float32Array(nPos);
    let o = 0;
    for (const x of teile) {
      positionen.set(x.positionen, o);
      normalen.set(x.normalen, o);
      o += x.positionen.length;
    }
    t = { positionen, normalen };
  }
  let hoehe = 0;
  for (const p of punkte) hoehe = Math.max(hoehe, p[1]);
  // mit Beinen steht der Körper auf den Füßen: alles so heben, dass der tiefste Punkt auf dem Boden liegt
  let hebung = 0;
  if (beine !== 'aus') {
    let yMin = Infinity;
    for (let i = 1; i < t.positionen.length; i += 3) yMin = Math.min(yMin, t.positionen[i]!);
    if (yMin < 0) {
      for (let i = 1; i < t.positionen.length; i += 3) t.positionen[i]! -= yMin;
      hoehe -= yMin;
      hebung = -yMin;
    }
  }
  const earle = useKernAnzeige.getState().look === 'earle';
  let desk = earle ? jeEcke(deskriptoren(abl, aus.gesichtMaske), flaechen) : null;
  if (desk && gesteckteEcken > 0) {
    // angesteckte Beine bekommen die Deskriptoren des Hüftpunkts (Farbe des Körpers an der Hüfte)
    const alle = new Float32Array(desk.length + gesteckteEcken * DESKRIPTOR_FLOATS);
    alle.set(desk);
    const huefte = deskriptoren(abl, aus.gesichtMaske).subarray(abl.vorlage.ringPunkt(15, 6) * DESKRIPTOR_FLOATS, (abl.vorlage.ringPunkt(15, 6) + 1) * DESKRIPTOR_FLOATS);
    for (let e = 0; e < gesteckteEcken; e++) alle.set(huefte, desk.length + e * DESKRIPTOR_FLOATS);
    desk = alle;
  }
  const augen = earle || useKernAnzeige.getState().stil === 'feuer' || useKernAnzeige.getState().stil === 'gas' ? augenAm(abl, hoehe, aus.augen) : [];
  const ab = nahtAbweichung(abl, dok);
  useKernAnzeige.setState({
    info: { kaefigPunkte: abl.kaefig.n, feinPunkte: punkte.length, nahtMax: ab.max, nahtMittel: ab.mittel, ableitung, zug, ecken: abl.ecken.length + (abl.spitzen.vorn ? 1 : 0) + (abl.spitzen.hinten ? 1 : 0), schnell: ableitung === 0 },
  });
  const linien = useKernAnzeige.getState().kaefig ? kaefigSegmente(abl, xyz) : null;
  const lippenBand = maul !== 'aus' && beine === 'aus' ? aus.lippenBand * hoehe : 0;
  // Körpermitte (Schwerpunkt der feinen Lagen) fürs Feuer/Gas-Material
  const mitte: [number, number, number] = [0, 0, 0];
  for (const p of punkte) for (let d = 0; d < 3; d++) mitte[d] = mitte[d]! + p[d]! / punkte.length;
  // Beweis 4: Ruhelage je Ecke (unposiert) bei Posen, damit Muster und Zonen nicht schwimmen
  let ruhe: Float32Array | null = null;
  if (maul !== 'aus' || beine !== 'aus') {
    const ruhePunkte: V3[] = [];
    for (let i = 0; i < abl.fein.length / 3; i++) ruhePunkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
    ruhe = zuDreiecken({ punkte: ruhePunkte, flaechen, schaerfe: new Map() }, 40).positionen;
    if (hebung) for (let i = 1; i < ruhe.length; i += 3) ruhe[i]! += hebung;
    if (ruhe.length !== t.positionen.length) ruhe = null; // angesteckte Beine: Dreiecke angehängt, Ruhelage = Lage
  }
  // Zähne (Beweis 4: Zahnverlauf) am Zahnfleisch des posierten Käfigs
  let zaehne: KernNetz['zaehne'] = null;
  if (maul !== 'aus' && (abl as Partial<MaulErgebnis>).maul) {
    zahnVorlage ??= klingenVorlage({ ringe: 4, profil: 'zacke', dicke: 0.6, einsenken: 0.3, biegung: 0.12, stufen: 1 });
    const zl = zahnLagen(abl as MaulErgebnis, xyz, hoehe);
    const z = klingenStatisch(zahnVorlage, zl, null);
    zaehne = { positionen: z.positionen, normalen: z.normalen, anteil: z.anteil };
  }
  // Gesicht (Tiger): Dreiecksnase oben an der Schnauzenfront, Scharte hinab zur Lippe. Alles in der Ruhelage (das Material
  // malt im Ruheraum, so bleibt die Nase beim Haps auf der Haut). Die Front-Oberkante ist der höchste Mittellinienpunkt
  // dicht hinter der Spitze (die Kastenfront steht senkrecht); die Kappe selbst ist beim Kasten nur ein kleines Feld an der Lippe.
  let gesicht: Gesicht | null = null;
  if (aus.gesicht) {
    const rf = abl.fein;
    const sp = abl.vorlage.naht.spitzeVorn;
    const sx = rf[3 * sp]!;
    let oben: V3 = [sx, rf[3 * sp + 1]!, 0];
    for (let i = 0; i < rf.length / 3; i++) {
      if (Math.abs(rf[3 * i + 2]!) < 0.02 * hoehe && rf[3 * i]! < sx + 0.03 * hoehe && rf[3 * i + 1]! > oben[1]) oben = [rf[3 * i]!, rf[3 * i + 1]!, 0];
    }
    const lippe = (abl as Partial<MaulErgebnis>).maul ? (abl as MaulErgebnis).maul.pfad[0]! : -1;
    const unten: V3 = lippe >= 0 ? [rf[3 * lippe]!, rf[3 * lippe + 1]!, rf[3 * lippe + 2]!] : [oben[0], oben[1] - 0.2 * hoehe, 0];
    const nH = 0.045 * hoehe;
    const mitte: V3 = [oben[0] - 0.004, oben[1] - 0.055 * hoehe + hebung, 0];
    gesicht = { nase: mitte, oben: [0, 1, 0], rechts: [0, 0, 1], radius: 0.046 * hoehe, hoehe: nH, philtrumA: [mitte[0], mitte[1] - nH, 0], philtrumB: [unten[0] - 0.004, unten[1] + hebung, unten[2]], breite: 0.004 * hoehe };
  }
  // Wangenbüschel und Ohren (Tiger) als statische Zacken, Deskriptoren vom Fußpunkt
  if (aus.wangen && earle) {
    zackenVorlage ??= klingenVorlage({ ringe: 4, profil: 'zacke', dicke: 0.4, einsenken: 0.3, biegung: 0.1, stufen: 1 });
    ohrVorlage ??= klingenVorlage({ ringe: 4, profil: 'tropfen', dicke: 0.55, einsenken: 0.4, biegung: 0.05, stufen: 1 });
    const haut = hautAus(fein);
    const fd = deskriptoren(abl, aus.gesichtMaske);
    const w1 = klingenStatisch(zackenVorlage, wangen(haut, hoehe), fd);
    const w2 = klingenStatisch(ohrVorlage, ohren(haut, hoehe), fd);
    const w = { positionen: verketten(w1.positionen, w2.positionen), normalen: verketten(w1.normalen, w2.normalen), desk: w1.desk && w2.desk ? verketten(w1.desk, w2.desk) : null };
    const p2 = new Float32Array(t.positionen.length + w.positionen.length);
    const n2 = new Float32Array(p2.length);
    p2.set(t.positionen);
    p2.set(w.positionen, t.positionen.length);
    n2.set(t.normalen);
    n2.set(w.normalen, t.normalen.length);
    t = { positionen: p2, normalen: n2 };
    if (desk && w.desk) {
      const d2 = new Float32Array(desk.length + w.desk.length);
      d2.set(desk);
      d2.set(w.desk, desk.length);
      desk = d2;
    }
    if (ruhe) {
      const r2 = new Float32Array(p2.length);
      r2.set(ruhe);
      r2.set(w.positionen, ruhe.length);
      ruhe = r2;
    }
  }
  // Beweis 5: Klingen (Zungen, Schwaden, Büschel) als Käfige am Körper; Animation über `kernAnimieren`
  const stil = useKernAnzeige.getState().stil;
  klingenStand = null;
  let positionen = t.positionen;
  let normalen = t.normalen;
  if (stil !== 'fest') {
    const haut = hautAus(fein);
    const saat = 7;
    const form = stil === 'feuer' ? KLINGE_FLAMME : stil === 'gas' ? KLINGE_SCHWADE : { ...KLINGE_BUESCHEL, profil: 'tropfen' as const, dicke: 0.5 };
    const vorlage = klingenVorlage(form);
    const lagen = stil === 'feuer' ? zungenAmScheitel(haut, hoehe, 6, 28, saat) : stil === 'gas' ? zungenAmScheitel(haut, hoehe, 2, 30, saat) : bueschelAufHaut(haut, hoehe, 420, 0.1, -0.35, saat);
    const zusatzVorlage = stil === 'fell' ? null : klingenVorlage(stil === 'gas' ? { ...KLINGE_SCHWADE, profil: 'tropfen', ringe: 4, stufen: 1 } : { ...KLINGE_FLAMME, ringe: 4, stufen: 1 });
    const feinDesk = desk && stil === 'fell' ? deskriptoren(abl, aus.gesichtMaske) : null;
    klingenStand = { stil, vorlage, lagen, zusatzVorlage, haut, hoehe, saat, koerper: { positionen: t.positionen, normalen: t.normalen, desk, feinDesk }, hebung: 0 };
    const k = klingenDreiecke(klingenStand, 0);
    const z = zusammen(klingenStand, k);
    positionen = z.positionen;
    normalen = z.normalen;
    desk = z.desk;
  }
  return { positionen, normalen, deskriptoren: stil === 'feuer' || stil === 'gas' ? null : desk, hoehe, augen, kaefigLinien: linien ? new Float32Array([...linien.punkte]) : null, lippenBand, kaefigFarben: linien?.farben ?? null, stil, mitte, ruhe: ruhe && ruhe.length === positionen.length ? ruhe : null, gesicht, zaehne };
}
