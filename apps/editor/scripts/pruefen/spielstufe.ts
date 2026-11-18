// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/spielstufe.ts
// Umgebung: KOERPER (Röhre-Liste der Extremreihe), TEILE (Liste, Körperart „Teile“), VARIANTEN=0 (ohne die Fülle-Varianten
// des Flachbands), BILD=1 (Netze der Stufen 1 und 3 als JSON für `spielstufe-bild.mjs`), AUSGABE (Ordner, Standard
// `apps/editor/pruefen-ausgabe`).
//
// Spielstufe (02.11.2026): Wie gut überträgt sich der heutige Editor-Käfig auf die Brettstufe des Spiels (gebackenes Netz auf
// Catmull-Clark-Stufe 1, Budget ≤ 8 000 Dreiecke je Wesen samt Maul; der Editor zeigt Stufe 3 als Grenzfläche)? Körper gebaut
// wie der Editor (`editorBauen` + `imAblauf` aus `kern/pruefen/extremMessung.ts`: Startkugel umgeformt, Haut glatt, Umrisse
// berühren „mittel“), Röhre bzw. Teile (`baumAbleiten` mit Paaren wie im Worker). Je Körper und Stufe 1 / 2 / 3:
//   a) Dreiecke (2 × Vierecke der Stufe) gegen das Budget;
//   b) Δ Silhouette ↔ gezeichnete Kurve je Blatt (`blattAbweichungen`, px bei 461 je Kachel) für die Stufe als reine
//      Catmull-Clark-Lage („CC“) und auf die Grenzfläche gedrückt („Grenze“, Halstead-Maske derselben Stufe); Stufe 3 Grenze
//      ist, was der Editor zeigt — Gegenprobe gegen `netz.info.blatt`; dazu Δ Silhouette Stufe L ↔ Stufe 3 (wie eckig ist der
//      Spiel-Umriss);
//   c) Knicke: Winkel zwischen benachbarten Flächen (max, 95 %, 99 %, Anteil > 10°/> 20°) über den ganzen Körper und nur
//      abseits der Falten (keine Abkömmlinge scharfer Käfigkanten, keine radialen Kanten an Spitzen, beide Flächen ohne
//      Falten-Vorfahr); Zahl der scharfen Käfigkanten und der Käfigflächen mit Falte (Teile: gezeichnet / Klinge);
//   d) Flachband: Anteil der Fläche der Stufe 3, deren Normale weniger als 5° (und 10°) von der Blickrichtung eines Blatts
//      abweicht (Seite ±z, Front ±x, Top ±y) — für den Bau des Editors (glatt + berühren mittel) und die Varianten ohne
//      Berühren und „rund“ (Bauplan `fuelle`).
// Kein Code des Kerns verändert; wiederverwendet: `unterteilung`/`grenzMaske`/`anwenden3` (Subdivision), `blattAbweichungen`,
// `umrissStuecke`, `umrissAusNetz`, `faltenAbkoemmlinge`, `flaechenVorfahren`, `baumFalten`.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Dokument } from '../../../../packages/shape/src/dokument';
import { type Kaefig, alleFlaechen } from '../../../../packages/shape/src/kaefig/halbkanten';
import { ABWEICHUNG_PX, blattAbweichungen, umrissStuecke } from '../../../../packages/shape/src/kern/abweichung';
import { baumAbleiten, baumFalten } from '../../../../packages/shape/src/kern/grundkoerper/baumBau';
import { teilbaum } from '../../../../packages/shape/src/kern/grundkoerper/teilbaum';
import { einsatzAblauf, einsatzFall } from '../../../../packages/shape/src/kern/pruefen/einsatzFall';
import { type EditorBau, editorBauen, editorPlan, imAblauf } from '../../../../packages/shape/src/kern/pruefen/extremMessung';
import { EXTREMREIHE } from '../../../../packages/shape/src/kern/pruefen/extremreihe';
import type { KoerperArt } from '../../../../packages/shape/src/kern/pruefen/koerper';
import type { Anfang, Form } from '../../../../packages/shape/src/kern/pruefen/linien';
import { faltenAbkoemmlinge, flaechenVorfahren } from '../../../../packages/shape/src/kern/pruefen/zonen';
import { feinesNetz } from '../../../../packages/shape/src/kern/pruefstand';
import { type Bauplan, type WesenStand, wesenBauen } from '../../../../packages/shape/src/kern/wesen';
import { pfadAbtasten, vollerPfad } from '../../../../packages/shape/src/profil';
import { type Unterteilung, grenzMaske, unterteilung } from '../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../packages/shape/src/subdivision/matrix';
import { umrissAusNetz } from '../../../../packages/shape/src/versuch/umriss3d';

type V3 = [number, number, number];
type V2 = { x: number; y: number };
type Blatt = 'seite' | 'front' | 'top';
const BLAETTER: readonly Blatt[] = ['seite', 'front', 'top'];
const PX = ABWEICHUNG_PX;
const BUDGET = 8000;
const GRAD = 180 / Math.PI;
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

const KOERPER = (process.env.KOERPER ?? 'kugel,ei,rex,langhals,robbe,tigerkopf,kegel').split(',').filter(Boolean);
const TEILE = (process.env.TEILE ?? 'ente,fisch,vierbeiner').split(',').filter(Boolean);
const VARIANTEN = process.env.VARIANTEN !== '0';
const BILD = process.env.BILD === '1';
const AUSGABE = resolve(process.env.AUSGABE ?? '../../apps/editor/pruefen-ausgabe');

// ---------- Grundwerkzeuge ----------

const punkteVon = (xyz: ArrayLike<number>): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i < xyz.length / 3; i++) out.push([xyz[3 * i]!, xyz[3 * i + 1]!, xyz[3 * i + 2]!]);
  return out;
};

/** Newell-Normale je Fläche (Einheitsvektor) und Flächeninhalt (|Newell| / 2). */
function flaechenNormalen(k: Kaefig, P: ArrayLike<number>): { n: Float64Array; A: Float64Array } {
  const n = new Float64Array(3 * k.nF);
  const A = new Float64Array(k.nF);
  for (let f = 0; f < k.nF; f++) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    const a = k.fStart[f]!;
    const b = k.fStart[f + 1]!;
    for (let h = a; h < b; h++) {
      const p = k.fVerts[h]!;
      const q = k.fVerts[h + 1 < b ? h + 1 : a]!;
      nx += (P[3 * p + 1]! - P[3 * q + 1]!) * (P[3 * p + 2]! + P[3 * q + 2]!);
      ny += (P[3 * p + 2]! - P[3 * q + 2]!) * (P[3 * p]! + P[3 * q]!);
      nz += (P[3 * p]! - P[3 * q]!) * (P[3 * p + 1]! + P[3 * q + 1]!);
    }
    const l = Math.hypot(nx, ny, nz);
    A[f] = l / 2;
    n[3 * f] = l ? nx / l : 0;
    n[3 * f + 1] = l ? ny / l : 0;
    n[3 * f + 2] = l ? nz / l : 0;
  }
  return { n, A };
}

/** Glatte Punktnormalen (flächengewichtet, Newell). */
function punktNormalen(k: Kaefig, P: ArrayLike<number>): Float64Array {
  const { n, A } = flaechenNormalen(k, P);
  const out = new Float64Array(3 * k.n);
  for (let f = 0; f < k.nF; f++)
    for (let h = k.fStart[f]!; h < k.fStart[f + 1]!; h++) {
      const v = k.fVerts[h]!;
      out[3 * v] += n[3 * f]! * A[f]!;
      out[3 * v + 1] += n[3 * f + 1]! * A[f]!;
      out[3 * v + 2] += n[3 * f + 2]! * A[f]!;
    }
  for (let v = 0; v < k.n; v++) {
    const l = Math.hypot(out[3 * v]!, out[3 * v + 1]!, out[3 * v + 2]!) || 1;
    out[3 * v] /= l;
    out[3 * v + 1] /= l;
    out[3 * v + 2] /= l;
  }
  return out;
}

type Stat = { kanten: number; max: number; p95: number; p99: number; ueber10: number; ueber20: number };

const statistik = (w: number[]): Stat => {
  const s = w.slice().sort((a, b) => a - b);
  const q = (p: number) => (s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]! : 0);
  return { kanten: s.length, max: s.length ? s[s.length - 1]! : 0, p95: q(0.95), p99: q(0.99), ueber10: s.length ? s.filter((x) => x > 10).length / s.length : 0, ueber20: s.length ? s.filter((x) => x > 20).length / s.length : 0 };
};

/**
 * Knicke (Grad) zwischen den Flächen jeder inneren Kante; `frei(e)` wählt die Kanten abseits der Falten. Anders als
 * `faltenMass` werden scharfe Kanten der Stufe nicht ausgenommen: Was das Spiel zeichnet, ist der Knick.
 */
function knicke(k: Kaefig, P: ArrayLike<number>, frei: (e: number) => boolean, ort: (f1: number, f2: number) => string): { alle: Stat & { ort: string }; frei: Stat & { ort: string } } {
  const { n } = flaechenNormalen(k, P);
  const alle: number[] = [];
  const fr: number[] = [];
  let ortAlle = '';
  let ortFrei = '';
  let maxAlle = -1;
  let maxFrei = -1;
  for (let e = 0; e < k.nE; e++) {
    if (k.eFlaechen[e] !== 2) continue;
    const h = k.eHalb[e]!;
    const t = k.hTwin[h]!;
    if (t < 0) continue;
    const f1 = k.hFace[h]!;
    const f2 = k.hFace[t]!;
    const c = n[3 * f1]! * n[3 * f2]! + n[3 * f1 + 1]! * n[3 * f2 + 1]! + n[3 * f1 + 2]! * n[3 * f2 + 2]!;
    const w = Math.acos(Math.max(-1, Math.min(1, c))) * GRAD;
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    const lage = () => `${ort(f1, f2)} bei (${fmt((P[3 * a]! + P[3 * b]!) / 2, 2)}, ${fmt((P[3 * a + 1]! + P[3 * b + 1]!) / 2, 2)}, ${fmt((P[3 * a + 2]! + P[3 * b + 2]!) / 2, 2)})`;
    alle.push(w);
    if (w > maxAlle) {
      maxAlle = w;
      ortAlle = lage();
    }
    if (frei(e)) {
      fr.push(w);
      if (w > maxFrei) {
        maxFrei = w;
        ortFrei = lage();
      }
    }
  }
  return { alle: { ...statistik(alle), ort: ortAlle }, frei: { ...statistik(fr), ort: ortFrei } };
}

/** Falten des Käfigs: scharfe Kanten (gezeichnet / Klinge), Käfigflächen mit scharfer Kante oder Spitze. */
function faltenZaehlen(basis: Kaefig, gewollt?: (e: number) => boolean): { scharf: number; gezeichnet: number; klinge: number; flaechen: number; flaeche: Uint8Array } {
  let scharf = 0;
  let gezeichnet = 0;
  for (let e = 0; e < basis.nE; e++) {
    if (!(basis.eSchaerfe[e]! > 0)) continue;
    scharf++;
    if (!gewollt || gewollt(e)) gezeichnet++;
  }
  const flaeche = new Uint8Array(basis.nF);
  let flaechen = 0;
  for (let f = 0; f < basis.nF; f++) {
    let falte = false;
    for (let h = basis.fStart[f]!; h < basis.fStart[f + 1]!; h++) if (basis.eSchaerfe[basis.hEdge[h]!]! > 0 || basis.vSchaerfe[basis.fVerts[h]!]! > 0) falte = true;
    if (falte) {
      flaeche[f] = 1;
      flaechen++;
    }
  }
  return { scharf, gezeichnet, klinge: scharf - gezeichnet, flaechen, flaeche };
}

/**
 * Kanten der Stufe L abseits der Falten: kein Abkömmling einer scharfen Käfigkante (`faltenAbkoemmlinge`, jede Schärfe,
 * auch die Klinge), keine radiale Kante an einer Spitze, beide Flächen ohne Vorfahr mit Falte.
 */
function freiKanten(basis: Kaefig, unt: Unterteilung, L: number, faltenFlaeche: Uint8Array): { frei: (e: number) => boolean; vorfahr: Uint32Array } {
  const untL: Unterteilung = { ...unt, stufen: unt.stufen.slice(0, L) };
  const fk = untL.stufen[L - 1]!.kaefig;
  const abk = faltenAbkoemmlinge(basis, untL);
  const vorfahr = flaechenVorfahren(basis, untL);
  const frei = (e: number) => {
    if (abk[e]) return false;
    const a = fk.eA[e]!;
    const b = fk.eB[e]!;
    if ((a < basis.n && basis.vSchaerfe[a]! > 0) || (b < basis.n && basis.vSchaerfe[b]! > 0)) return false;
    const h = fk.eHalb[e]!;
    const t = fk.hTwin[h]!;
    if (t < 0) return false;
    return !faltenFlaeche[vorfahr[fk.hFace[h]!]!] && !faltenFlaeche[vorfahr[fk.hFace[t]!]!];
  };
  return { frei, vorfahr };
}

/** Flachband: Anteil der Fläche, deren Normale weniger als `grad` von der Blickrichtung eines Blatts abweicht. */
function flachband(k: Kaefig, P: ArrayLike<number>, grad: number): Record<Blatt, number> {
  const { n, A } = flaechenNormalen(k, P);
  const s = Math.sin((grad * Math.PI) / 180);
  let ges = 0;
  const band = { seite: 0, front: 0, top: 0 };
  for (let f = 0; f < k.nF; f++) {
    const a = A[f]!;
    ges += a;
    if (Math.abs(n[3 * f + 2]!) < s) band.seite += a;
    if (Math.abs(n[3 * f]!) < s) band.front += a;
    if (Math.abs(n[3 * f + 1]!) < s) band.top += a;
  }
  return { seite: band.seite / ges, front: band.front / ges, top: band.top / ges };
}

/** Umriss eines Netzes in einem Blatt wie `blattAbweichungen` (Raster 240, Punkte auf die Silhouettenkanten gelegt). */
function umriss(punkte: V3[], flaechen: number[][], a: Blatt, zellen = 240): V2[][] {
  const roh = umrissAusNetz({ punkte, flaechen, schaerfe: new Map() }, a, zellen);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of punkte) {
    const u = a === 'seite' ? p[0] : a === 'front' ? p[2] : p[0];
    const v = a === 'top' ? p[2] : p[1];
    x0 = Math.min(x0, u);
    x1 = Math.max(x1, u);
    y0 = Math.min(y0, v);
    y1 = Math.max(y1, v);
  }
  const h = Math.max(x1 - x0, y1 - y0, 1e-6) / zellen;
  const st = umrissStuecke(punkte, flaechen, a, h);
  return roh.map((z) => z.map((p) => st.naechster(p, 2.5 * h) ?? p));
}

function abstandZuZug(p: V2, zug: readonly V2[]): number {
  let best = Infinity;
  const m = zug.length;
  for (let i = 0; i < m; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % m]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
    const d = Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
    if (d < best) best = d;
  }
  return best;
}

/** Abstand zweier Umrisse (beide Richtungen, px): max und Mittel über alle Punkte. */
function umrissAbstand(ist: V2[][], soll: V2[][]): { max: number; mittel: number } {
  let max = 0;
  let summe = 0;
  let n = 0;
  const hin = (von: V2[][], zu: V2[][]) => {
    for (const z of von)
      for (const p of z) {
        let d = Infinity;
        for (const q of zu) d = Math.min(d, abstandZuZug(p, q));
        if (!Number.isFinite(d)) continue;
        d *= PX;
        max = Math.max(max, d);
        summe += d;
        n++;
      }
  };
  hin(ist, soll);
  hin(soll, ist);
  return { max, mittel: n ? summe / n : 0 };
}

// ---------- Körper bauen wie der Editor ----------

type Koerper = {
  name: string;
  art: 'roehre' | 'teile';
  variante: string;
  dok: Dokument;
  kaefig: Kaefig;
  fein: Float64Array;
  unt: Unterteilung;
  gewollt?: (e: number) => boolean;
  /** Zone einer Käfigfläche in Worten (Röhre: Ringband i / Kappe; Teile: Zone des Baums) */
  zoneVon: (f: number) => string;
  /** Δ je Blatt, wie der Worker sie dem Editor meldet (Stufe 3) */
  editorBlatt: Record<Blatt, { max: number; mittel: number }> | null;
  ms: number;
  baue: number;
  info: string;
};

function roehre(name: string, variante: string, plan: Partial<Bauplan>): Koerper | null {
  const k = EXTREMREIHE.find((e) => e.name === name);
  if (!k) return null;
  const bau: EditorBau = editorBauen(imAblauf(k.dok(), 'roehre', 'kugel'), plan);
  const abl = bau.stand.linien?.abl ?? bau.stand.abl;
  const bl = bau.netz.info.blatt;
  // Käfigflächen der Röhre (`kaefig/roehre.ts`): erst (R − 1) Ringbänder zu je N Flächen (i-major; j = 0 Rücken, N/4 rechts,
  // N/2 Bauch), dann die Kappe vorn (c² Flächen), dann die Kappe hinten
  const { R, N } = abl.vorlage;
  const zoneVon = (f: number) => (f < (R - 1) * N ? `Ringband ${Math.floor(f / N)}/${R - 1}, j ${f % N}/${N}` : f < (R - 1) * N + (N / 4) ** 2 ? 'Kappe vorn' : 'Kappe hinten');
  return {
    name,
    art: 'roehre',
    variante,
    dok: bau.dok,
    kaefig: abl.kaefig,
    fein: abl.fein,
    unt: abl.unterteilung,
    zoneVon,
    editorBlatt: bl ? { seite: { max: bl.seite.max, mittel: bl.seite.mittel }, front: { max: bl.front.max, mittel: bl.front.mittel }, top: { max: bl.top.max, mittel: bl.top.mittel } } : null,
    ms: bau.ms,
    baue: bau.baue,
    info: `Ringe ${abl.vorlage.R} × ${abl.vorlage.N}`,
  };
}

function teile(name: string, variante: string, plan: Partial<Bauplan>, fuelle: 'rund' | 'mittel' | undefined, variantenBau: boolean): Koerper | null {
  const k = EXTREMREIHE.find((e) => e.name === name);
  if (!k) return null;
  const bau = editorBauen(imAblauf(k.dok(), 'teile', 'kugel'), plan);
  if (!bau.netz.koerperBaum || bau.netz.koerperBaum.fehler) {
    console.log(`${name}: Baum scheitert (${bau.netz.koerperBaum?.fehler ?? 'kein Baum'}), der Editor zeigt die Röhre — ausgelassen`);
    return null;
  }
  // derselbe Baum wie im Worker (`baumKoerper`: `baumAbleiten(dok, { paare: true }, teilbaum)`), wie `gezeigt` in extremMessung
  const d = bau.dok.skalierung === 1 ? bau.dok : { ...bau.dok, skalierung: 1 };
  const t0 = jetzt();
  const b = baumAbleiten(d, { paare: true, ...(variantenBau ? { fuelle } : {}) }, teilbaum(d, d.kaefig?.stationen?.teile ?? null));
  const ms = jetzt() - t0;
  const bl = bau.netz.info.blatt;
  return {
    name,
    art: 'teile',
    variante,
    dok: d,
    kaefig: b.kaefig,
    fein: b.fein,
    unt: b.unterteilung,
    gewollt: baumFalten(b).gewollt,
    zoneVon: (f: number) => b.zone(f) ?? 'frei',
    editorBlatt: bl ? { seite: { max: bl.seite.max, mittel: bl.seite.mittel }, front: { max: bl.front.max, mittel: bl.front.mittel }, top: { max: bl.top.max, mittel: bl.top.mittel } } : null,
    ms,
    baue: bau.baue,
    info: `${bau.netz.koerperBaum.streifen} Streifen + ${bau.netz.koerperBaum.seiten} seitlich`,
  };
}

// ---------- Messung je Körper ----------

type StufenMessung = {
  L: number;
  punkte: number;
  flaechen: number;
  dreiecke: number;
  /** Δ ↔ Zeichnung je Blatt (px), CC-Lage und Grenzlage */
  deltaCC: Record<Blatt, { max: number; mittel: number }>;
  deltaGrenze: Record<Blatt, { max: number; mittel: number }>;
  /** Δ Silhouette dieser Stufe (CC bzw. Grenze) ↔ Stufe 3 Grenze (px) */
  gegen3CC: Record<Blatt, { max: number; mittel: number }>;
  gegen3Grenze: Record<Blatt, { max: number; mittel: number }>;
  knickeCC: { alle: Stat & { ort: string }; frei: Stat & { ort: string } };
  knickeGrenze: { alle: Stat & { ort: string }; frei: Stat & { ort: string } };
};

type KoerperMessung = {
  name: string;
  art: string;
  variante: string;
  info: string;
  skalierung: number;
  ms: number;
  baue: number;
  kaefig: { punkte: number; flaechen: number; dreiecke0: number; scharf: number; gezeichnet: number; klinge: number; faltenFlaechen: number };
  /** größte Abweichung der frischen Stufe-3-Grenzlage zur `fein` des Baus (px) — 0 heißt: dieselbe Fläche wie der Editor */
  feinProbe: number;
  editorBlatt: Record<Blatt, { max: number; mittel: number }> | null;
  stufen: StufenMessung[];
  flachband5: Record<Blatt, number>;
  flachband10: Record<Blatt, number>;
  flaeche: number;
};

const fmt = (x: number, k = 1) => (Number.isFinite(x) ? x.toFixed(k) : '–');
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const blattStr = (r: Record<Blatt, { max: number; mittel: number }>, k = 1) => BLAETTER.map((a) => `${fmt(r[a].max, k)}/${fmt(r[a].mittel, k)}`).join(' · ');

function messen(k: Koerper, bild: boolean): KoerperMessung {
  const basis = k.kaefig;
  // Unterteilung frisch vom gelösten Käfig: `abl.unterteilung.stufen[i].kaefig.xyz` trägt die Lagen vor dem Lösen (die Matrix
  // wird vor dem Löser gebaut), die Topologie ist dieselbe
  const u = unterteilung(basis, 3);
  const falten = faltenZaehlen(basis, k.gewollt);
  let dreiecke0 = 0;
  for (let f = 0; f < basis.nF; f++) dreiecke0 += basis.fStart[f + 1]! - basis.fStart[f]! - 2;
  const stufen: { k: Kaefig; cc: Float64Array; grenze: Float64Array; flaechen: number[][] }[] = u.stufen.map((st) => ({ k: st.kaefig, cc: st.kaefig.xyz, grenze: anwenden3(grenzMaske(st.kaefig), st.kaefig.xyz), flaechen: alleFlaechen(st.kaefig) }));
  const s3 = stufen[2]!;
  let feinProbe = 0;
  for (let i = 0; i < k.fein.length; i++) feinProbe = Math.max(feinProbe, Math.abs(k.fein[i]! - s3.grenze[i]!));
  const p3 = punkteVon(s3.grenze);
  const umriss3 = Object.fromEntries(BLAETTER.map((a) => [a, umriss(p3, s3.flaechen, a)])) as Record<Blatt, V2[][]>;
  const blatt = (p: V3[], fl: number[][]) => {
    const bl = blattAbweichungen(p, fl, k.dok, 240);
    return Object.fromEntries(BLAETTER.map((a) => [a, { max: bl[a].max, mittel: bl[a].mittel }])) as Record<Blatt, { max: number; mittel: number }>;
  };
  const gegen3 = (p: V3[], fl: number[][]) => Object.fromEntries(BLAETTER.map((a) => [a, umrissAbstand(umriss(p, fl, a), umriss3[a])])) as Record<Blatt, { max: number; mittel: number }>;
  const out: StufenMessung[] = stufen.map((s, i) => {
    const L = i + 1;
    const { frei, vorfahr } = freiKanten(basis, u, L, falten.flaeche);
    const ort = (f1: number, f2: number) => {
      const z1 = k.zoneVon(vorfahr[f1]!);
      const z2 = k.zoneVon(vorfahr[f2]!);
      return z1 === z2 ? z1 : `${z1} – ${z2}`;
    };
    const pCC = punkteVon(s.cc);
    const pG = punkteVon(s.grenze);
    return {
      L,
      punkte: s.k.n,
      flaechen: s.k.nF,
      dreiecke: 2 * s.k.nF,
      deltaCC: blatt(pCC, s.flaechen),
      deltaGrenze: blatt(pG, s.flaechen),
      gegen3CC: gegen3(pCC, s.flaechen),
      gegen3Grenze: gegen3(pG, s.flaechen),
      knickeCC: knicke(s.k, s.cc, frei, ort),
      knickeGrenze: knicke(s.k, s.grenze, frei, ort),
    };
  });
  const { A } = flaechenNormalen(s3.k, s3.grenze);
  let flaeche = 0;
  for (let f = 0; f < A.length; f++) flaeche += A[f]!;
  if (bild) {
    const s1 = stufen[0]!;
    const n1 = punktNormalen(s1.k, s1.cc);
    const n3 = punktNormalen(s3.k, s3.grenze);
    // Punktnummern bleiben über die Stufen: Punkt v der Stufe 1 ist Punkt v der Stufe 3 — die Grenzflächen-Normale dort
    const grenzNormalen = Array.from(n3.subarray(0, 3 * s1.k.n));
    const sk = k.dok.skalierung;
    const umrisse = Object.fromEntries(BLAETTER.map((a) => [a, pfadAbtasten(vollerPfad(k.dok.profile[a]), 24).map((p) => [p.x * sk, p.y * sk])])) as Record<Blatt, number[][]>;
    mkdirSync(AUSGABE, { recursive: true });
    writeFileSync(
      resolve(AUSGABE, `spielstufe-netz-${k.name}.json`),
      JSON.stringify({
        name: k.name,
        stufe1: { positionen: Array.from(s1.cc), grenzlage: Array.from(s1.grenze), flaechen: s1.flaechen, normalen: Array.from(n1), grenzNormalen },
        stufe3: { positionen: Array.from(s3.grenze), flaechen: s3.flaechen, normalen: Array.from(n3) },
        umrisse,
      }),
    );
  }
  return {
    name: k.name,
    art: k.art,
    variante: k.variante,
    info: k.info,
    skalierung: k.dok.skalierung,
    ms: k.ms,
    baue: k.baue,
    kaefig: { punkte: basis.n, flaechen: basis.nF, dreiecke0, scharf: falten.scharf, gezeichnet: falten.gezeichnet, klinge: falten.klinge, faltenFlaechen: falten.flaechen },
    feinProbe: feinProbe * PX,
    editorBlatt: k.editorBlatt,
    stufen: out,
    flachband5: flachband(s3.k, s3.grenze, 5),
    flachband10: flachband(s3.k, s3.grenze, 10),
    flaeche,
  };
}

// ---------- Lauf ----------

const t0 = jetzt();
const ergebnisse: KoerperMessung[] = [];
const plan = (art: 'roehre' | 'teile', fuelle: 'rund' | 'mittel' | undefined): Partial<Bauplan> => ({ ...editorPlan(art), fuelle });

const varianten: { name: string; fuelle: 'rund' | 'mittel' | undefined }[] = VARIANTEN ? [{ name: 'editor (glatt + mittel)', fuelle: 'mittel' }, { name: 'ohne Berühren', fuelle: undefined }, { name: 'rund', fuelle: 'rund' }] : [{ name: 'editor (glatt + mittel)', fuelle: 'mittel' }];

for (const name of KOERPER) {
  if (!EXTREMREIHE.some((e) => e.name === name)) {
    console.log(`Körper „${name}“ fehlt in der Extremreihe; vorhanden: ${EXTREMREIHE.map((e) => e.name).join(', ')}`);
    continue;
  }
  for (const v of varianten) {
    const t = jetzt();
    const k = roehre(name, v.name, plan('roehre', v.fuelle));
    if (!k) continue;
    const m = messen(k, BILD && v.fuelle === 'mittel');
    ergebnisse.push(m);
    console.log(`${name} (${v.name}): Käfig ${m.kaefig.punkte} P / ${m.kaefig.flaechen} F, Bau ${fmt(m.ms, 0)} ms, Messung ${fmt(jetzt() - t, 0)} ms, Grenzprobe ${fmt(m.feinProbe, 4)} px`);
  }
}
for (const name of TEILE) {
  if (!EXTREMREIHE.some((e) => e.name === name)) {
    console.log(`Körper „${name}“ fehlt in der Extremreihe`);
    continue;
  }
  for (const v of varianten) {
    const t = jetzt();
    const k = teile(name, v.name, plan('teile', 'mittel'), v.fuelle, v.fuelle !== 'mittel');
    if (!k) break;
    const m = messen(k, BILD && v.fuelle === 'mittel');
    ergebnisse.push(m);
    console.log(`${name} (${v.name}): Käfig ${m.kaefig.punkte} P / ${m.kaefig.flaechen} F, Baum ${fmt(m.ms, 0)} ms, Messung ${fmt(jetzt() - t, 0)} ms, Grenzprobe ${fmt(m.feinProbe, 4)} px`);
  }
}

// ---------- Tabellen ----------

const editor = ergebnisse.filter((m) => m.variante.startsWith('editor'));
console.log(`\n## a) Dreiecke je Stufe (Budget ${BUDGET} je Wesen samt Maul)\n`);
console.log('| Körper | Bau | Käfig P / F | Falten: scharfe Käfigkanten (gezeichnet / Klinge), Käfigflächen mit Falte | Dreiecke Stufe 0 | Stufe 1 | Stufe 2 | Stufe 3 (Editor) | Bau ms |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const m of editor) {
  const s = m.stufen;
  console.log(`| ${m.name} | ${m.art === 'roehre' ? 'Röhre' : `Teile ${m.info}`} | ${m.kaefig.punkte} / ${m.kaefig.flaechen} | ${m.kaefig.scharf} (${m.kaefig.gezeichnet} / ${m.kaefig.klinge}), ${m.kaefig.faltenFlaechen} | ${m.kaefig.dreiecke0} | ${s[0]!.dreiecke}${s[0]!.dreiecke > BUDGET ? ' (über Budget)' : ''} | ${s[1]!.dreiecke}${s[1]!.dreiecke > BUDGET ? ' (über Budget)' : ''} | ${s[2]!.dreiecke} | ${fmt(m.ms, 0)} |`);
}

console.log(`\n## b) Δ Silhouette ↔ Zeichnung je Blatt (px bei 461 je Kachel; max/mittel; S · F · T)\n`);
console.log('| Körper | Stufe 1 CC | Stufe 1 Grenze | Stufe 2 CC | Stufe 2 Grenze | Stufe 3 Grenze (= Editor) | Editor meldet | Grenzprobe px |');
console.log('|---|---|---|---|---|---|---|---|');
for (const m of editor) {
  const s = m.stufen;
  console.log(`| ${m.name} | ${blattStr(s[0]!.deltaCC)} | ${blattStr(s[0]!.deltaGrenze)} | ${blattStr(s[1]!.deltaCC)} | ${blattStr(s[1]!.deltaGrenze)} | ${blattStr(s[2]!.deltaGrenze)} | ${m.editorBlatt ? blattStr(m.editorBlatt) : '–'} | ${fmt(m.feinProbe, 3)} |`);
}

console.log(`\n## b2) Δ Silhouette Stufe L ↔ Stufe 3 (px; max/mittel; S · F · T) — wie eckig ist der Spiel-Umriss\n`);
console.log('| Körper | Stufe 1 CC | Stufe 1 Grenze | Stufe 2 CC | Stufe 2 Grenze |');
console.log('|---|---|---|---|---|');
for (const m of editor) {
  const s = m.stufen;
  console.log(`| ${m.name} | ${blattStr(s[0]!.gegen3CC)} | ${blattStr(s[0]!.gegen3Grenze)} | ${blattStr(s[1]!.gegen3CC)} | ${blattStr(s[1]!.gegen3Grenze)} |`);
}

const knickStr = (s: Stat) => `${fmt(s.max)} / ${fmt(s.p95)} / ${fmt(s.p99)} (${pct(s.ueber10)} / ${pct(s.ueber20)}; ${s.kanten})`;
console.log(`\n## c) Knicke zwischen Nachbarflächen (Grad: max / 95 % / 99 %, in Klammern Anteil der Kanten > 10° / > 20°; Kanten)\n`);
console.log('| Körper | Stufe 1 CC, ganzer Körper | Stufe 1 CC, abseits der Falten | Stufe 1 Grenze, ganz | Stufe 1 Grenze, abseits | Stufe 2 CC, ganz | Stufe 2 CC, abseits | Stufe 3 Grenze, ganz | Stufe 3 Grenze, abseits |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const m of editor) {
  const s = m.stufen;
  console.log(`| ${m.name} | ${knickStr(s[0]!.knickeCC.alle)} | ${knickStr(s[0]!.knickeCC.frei)} | ${knickStr(s[0]!.knickeGrenze.alle)} | ${knickStr(s[0]!.knickeGrenze.frei)} | ${knickStr(s[1]!.knickeCC.alle)} | ${knickStr(s[1]!.knickeCC.frei)} | ${knickStr(s[2]!.knickeGrenze.alle)} | ${knickStr(s[2]!.knickeGrenze.frei)} |`);
}
console.log(`\n## c2) Ort des größten Knicks (Käfigzone der beiden Flächen, Kantenmitte in Welt)\n`);
console.log('| Körper | Stufe 1 CC, ganz | Stufe 1 CC, abseits der Falten | Stufe 3 Grenze, ganz | Stufe 3 Grenze, abseits |');
console.log('|---|---|---|---|---|');
for (const m of editor) {
  const s = m.stufen;
  console.log(`| ${m.name} | ${fmt(s[0]!.knickeCC.alle.max)}° ${s[0]!.knickeCC.alle.ort} | ${fmt(s[0]!.knickeCC.frei.max)}° ${s[0]!.knickeCC.frei.ort} | ${fmt(s[2]!.knickeGrenze.alle.max)}° ${s[2]!.knickeGrenze.alle.ort} | ${fmt(s[2]!.knickeGrenze.frei.max)}° ${s[2]!.knickeGrenze.frei.ort} |`);
}

const bandStr = (r: Record<Blatt, number>) => BLAETTER.map((a) => pct(r[a])).join(' · ');
console.log(`\n## d) Flachband der Stufe 3: Anteil der Fläche innerhalb 5° (10°) der Blickrichtung (Seite ±z · Front ±x · Top ±y)\n`);
console.log('| Körper | Variante | Fläche | < 5° S · F · T | < 10° S · F · T | Δ Stufe 3 S · F · T |');
console.log('|---|---|---|---|---|---|');
for (const m of ergebnisse) console.log(`| ${m.name} | ${m.variante} | ${fmt(m.flaeche, 4)} | ${bandStr(m.flachband5)} | ${bandStr(m.flachband10)} | ${blattStr(m.stufen[2]!.deltaGrenze)} |`);

// ---------- e) Maul-Einsatz: der Käfig mit Maul selbst als Spielnetz (MAUL=1; je Fall 5–15 s) ----------

if (process.env.MAUL === '1') {
  console.log(`\n## e) Maul-Einsatz (Standard, Feld auf K2): der Käfig mit Maul ohne weitere Stufe (Knicke in Grad, wie c)\n`);
  console.log('| Fall | A0 P / F | K2 P / F | mit Maul P / F | Dreiecke (Käfigflächen) | scharfe Kanten | Knicke ganz: max / 95 % / 99 % (> 10° / > 20°; Kanten) | Knicke ohne scharfe Kanten |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const fall of (process.env.FAELLE ?? 'kugel/mittel/gerade,rex/mittel/j').split(',')) {
    const [a, b, c] = fall.split('/') as [KoerperArt, Anfang, Form];
    const f = einsatzFall(a, b, c);
    if (!f || 'fehler' in f) {
      console.log(`| ${fall} | ${f ? f.fehler : 'keine Linie'} | | | | | | |`);
      continue;
    }
    const r = einsatzAblauf(f);
    const km = r.g.kaefig;
    const P = r.g.xyz;
    let dreiecke = 0;
    for (let q = 0; q < km.nF; q++) dreiecke += km.fStart[q + 1]! - km.fStart[q]! - 2;
    let scharf = 0;
    for (let e = 0; e < km.nE; e++) if (km.eSchaerfe[e]! > 0) scharf++;
    const kn = knicke(km, P, (e) => !(km.eSchaerfe[e]! > 0), () => 'Maulkäfig');
    console.log(`| ${fall} | ${f.abl.kaefig.n} / ${f.abl.kaefig.nF} | ${f.v.kaefig.n} / ${f.v.kaefig.nF} | ${km.n} / ${km.nF} | ${dreiecke}${dreiecke > BUDGET ? ' (über Budget)' : ''} | ${scharf} | ${knickStr(kn.alle)} | ${knickStr(kn.frei)} |`);
  }
}

// ---------- Probe (PROBE=<Körper>): Δ-Meldung des Workers gegen Δ am Netz desselben Baus, je Bau der Editor-Schleife ----------

if (process.env.PROBE) {
  const k = EXTREMREIHE.find((e) => e.name === process.env.PROBE);
  if (k) {
    let d = imAblauf(k.dok(), 'roehre', 'kugel');
    let st: WesenStand | null = null;
    for (let i = 0; i < 3; i++) {
      const r = wesenBauen(d, editorPlan('roehre'), st, false);
      const abl = r.stand.linien?.abl ?? r.stand.abl;
      const n = feinesNetz(abl);
      const bl = blattAbweichungen(n.punkte, n.flaechen, d, 240);
      const gleich = JSON.stringify(r.netz.info.stationen) === JSON.stringify(d.kaefig?.stationen ?? null);
      console.log(`${k.name}, Bau ${i + 1}: Worker meldet S/F/T ${BLAETTER.map((a) => r.netz.info.blatt?.[a].max.toFixed(2)).join('/')}, am stand.abl.fein gemessen ${BLAETTER.map((a) => bl[a].max.toFixed(2)).join('/')}; Stationen unverändert: ${gleich}`);
      st = r.stand;
      const g = r.netz.info.stationen;
      if (!g || gleich) break;
      d = { ...d, kaefig: { deltas: [], ...d.kaefig, stationen: g } };
    }
    // Gegenprobe: frische Unterteilung des gelösten Käfigs gegen `feinesNetz(abl)` (Lagen, Flächen, Δ je Weg)
    const abl = st!.linien?.abl ?? st!.abl;
    const n = feinesNetz(abl);
    const u = unterteilung(abl.kaefig, 3);
    const s3 = u.stufen[2]!;
    const grenze = anwenden3(grenzMaske(s3.kaefig), s3.kaefig.xyz);
    const fl = alleFlaechen(s3.kaefig);
    let dMax = 0;
    for (let i = 0; i < Math.max(abl.fein.length, grenze.length); i++) dMax = Math.max(dMax, Math.abs((abl.fein[i] ?? NaN) - (grenze[i] ?? NaN)));
    const flGleich = fl.length === n.flaechen.length && fl.every((f, i) => f.length === n.flaechen[i]!.length && f.every((v, q) => v === n.flaechen[i]![q]));
    const F = (p: V3[], f: number[][]) => blattAbweichungen(p, f, d, 240).front.max.toFixed(3);
    console.log(`${k.name}: Lagen ${abl.fein.length / 3} / ${grenze.length / 3}, max |Δ| ${(dMax * PX).toFixed(4)} px; Flächen ${n.flaechen.length} / ${fl.length}, gleich: ${flGleich}; Käfig ${abl.kaefig.n} P / ${abl.kaefig.nF} F, Stufen der Ableitung ${abl.unterteilung.stufen.length}`);
    console.log(`${k.name}: Front-Δ feinesNetz(abl) ${F(n.punkte, n.flaechen)} | abl.fein + frische Flächen ${F(punkteVon(abl.fein), fl)} | frische Grenze + Flächen der Ableitung ${F(punkteVon(grenze), n.flaechen)} | frische Grenze + frische Flächen ${F(punkteVon(grenze), fl)}`);
  }
}

mkdirSync(AUSGABE, { recursive: true });
writeFileSync(resolve(AUSGABE, 'spielstufe-2026-11-02.json'), JSON.stringify(ergebnisse, null, 1));
console.log(`\nJSON: ${resolve(AUSGABE, 'spielstufe-2026-11-02.json')} · gesamt ${fmt((jetzt() - t0) / 1000, 1)} s`);
