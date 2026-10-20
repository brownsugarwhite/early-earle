// Plan „Liniennetz, Zielform, Käfig“, S8a (17.10., Wochenend-Zuschnitt): P-Linien auf der Röhre als Kanten genau auf der
// Linie. Jede Linie mit Härte wird über die L0-Maschine („Die Fläche bleibt, das Netz gleitet“) eine Käfigreihe (längs,
// `reiheEinpassen`) bzw. ein Käfigring (quer, `ringEinpassen`) genau auf der Linie; danach werden die Käfigkanten dieser Reihe
// bzw. dieses Rings scharf nach der Härte längs der Linie (100 % = scharf, darunter 3 × Härte wie die Treppe in
// `kern/kanten.ts`), gespiegelt. Linien ohne Härte ändern den Körper nicht. Die Linien werden nacheinander eingepasst, jede auf
// dem Käfig der vorigen. Ersetzt auf der Röhre ohne Maul und Beine die Treppe; dort bleibt sie (Maul, Beine, Baum).
// Offene Enden laufen über zwei Käfigkanten weich aus (halbscharf 1, 2): Endet eine scharfe Kante mitten auf glatter Haut,
// bildet Catmull–Clark dort eine Delle (Zebra: Haken an beiden Enden). DOM-frei.
// Plan 20.10., V0 (Rückschritte aus S8a behoben): Ein Kreuzungspunkt zweier Linien steht in beiden Kantenzügen — das
// Nachführen schob ihn je Schritt zweimal um 1,5 × den Rest und schaukelte ihn auf (−2 je Schritt, gekreuzte Linien bis 24 px
// daneben); jetzt je Punkt einmal mit dem Mittel der Reste. Nahtpunkte bleiben dabei in der Spiegelebene. Kurze Linien
// laufen höchstens über ein Viertel ihrer Kanten aus (eine Querlinie über vier Kanten wurde sonst nie scharf). Linien, die
// weder Reihe noch Ring werden, behalten die Treppe (vorher bekamen sie gar keine Falte). V1: Eine Reihe bzw. ein Ring, die
// keine ganze Käfigkante decken, zählen nicht (gemeldet war „Reihe“, scharf wurde nichts).

import type { Kante } from '../../dokument';
import { type Kaefig, kanteZwischen } from '../../kaefig/halbkanten';
import { unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import type { BaumKaefig } from '../../kaefig/baumKaefig';
import type { Ableitung } from '../ableiten';
import { baumKantenFalten } from '../grundkoerper/baumKanten';
import { type KantenLinie, kanteAbtasten } from '../kanten';
import { alleFlaechen } from '../../kaefig/halbkanten';
import { aufHaut, sichtRaster } from '../netzSicht';
import { type NetzLinie, reiheEinpassen } from './einpassen';
import { ringEinpassen } from './ringEinpassen';

export type LinienBericht = { art: 'reihe' | 'ring' | 'ohne' | 'fehlt'; index: number; ms: number };

/** Härte längs der Linie bei Anteil f ∈ [0, 1] (die Proben liegen gleichmäßig über die Abschnitte). */
function haerteBei(h: readonly number[], f: number): number {
  if (!h.length) return 0;
  const x = Math.min(h.length - 1, Math.max(0, f * (h.length - 1)));
  const a = Math.floor(x);
  const b = Math.min(h.length - 1, a + 1);
  return h[a]! + (h[b]! - h[a]!) * (x - a);
}

/**
 * Linien des Dokuments genau auf die Haut der Röhre legen und als Kanten schärfen. Liefert die Ableitung mit neuen
 * Käfiglagen, Schärfen, Unterteilung und feinem Netz (sonst unverändert) und je Linie, wie sie eingepasst wurde.
 */
export type LinienOptionen = {
  /** Schritte des Nachführens nach dem Schärfen (Standard 4) */
  korrektur?: number;
  /** Auslauf an offenen Enden: so viele Käfigkanten je Ende mit ansteigender Schärfe (Standard 2) */
  auslauf?: number;
};

export function linienExakt<T extends Ableitung>(abl: T, kanten: readonly Kante[], sk: number, schaerfeMax: number, opt: LinienOptionen = {}): { abl: T; berichte: LinienBericht[] } {
  const korrektur = opt.korrektur ?? 4;
  const auslauf = opt.auslauf ?? 2;
  const { R, N } = abl.vorlage;
  const H = N / 2;
  // ein Käfig-Objekt für alle Linien (die Zielfläche der Einpassung merkt sich ihre Unterteilung je Käfig-Objekt)
  const k: Kaefig = { ...abl.kaefig, xyz: new Float64Array(abl.kaefig.xyz) };
  let fein = abl.fein;
  const schaerfe = new Map<number, number>();
  const setze = (a: number, b: number, s: number) => {
    const e = kanteZwischen(k, a, b);
    if (e >= 0 && s > (schaerfe.get(e) ?? 0)) schaerfe.set(e, s);
  };
  const berichte: LinienBericht[] = [];
  // je eingepasster Linie die Käfigpunkte der Kante (rechte Hälfte) und die Linie, zum Nachführen nach dem Schärfen
  const kantenZuege: { punkte: number[]; linie: [number, number, number][] }[] = [];
  // Linien, die weder Reihe noch Ring werden: Treppe auf dem Käfig (wie auf dem Baum)
  const treppe: KantenLinie[] = [];
  // Plan 20.10., V1 (Befund im Editor): Eine mit dem Stift gesetzte Linie hat wenige Knoten, dazwischen läuft ihre Kurve als
  // Sehne durch den Körper oder über ihm (Kugel, zwei Knoten: 20 px neben der Haut). Das Liniennetz zeigt sie auf der Haut
  // (Proben aus der Zeichenansicht auf die Haut gelegt); das Einpassen zog den Körper auf die Sehne (Kugel mit zwei Linien:
  // Top Δ 10,7 px). Jetzt liegen die Proben auch hier zuerst auf der Haut des Körpers ohne Linien.
  let raster: ReturnType<typeof sichtRaster> | null = null;
  const hautRaster = () => {
    if (!raster) {
      const kb = abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig;
      const P: [number, number, number][] = [];
      for (let i = 0; i < abl.fein.length / 3; i++) P.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
      raster = sichtRaster(P, alleFlaechen(kb));
    }
    return raster;
  };
  kanten.forEach((ka, index) => {
    const t0 = jetzt();
    const gezeichnet = kanteAbtasten(ka, sk, 16);
    const roh: KantenLinie = gezeichnet.haerte.some((h) => h > 0) ? { ...gezeichnet, punkte: gezeichnet.punkte.map((p) => aufHaut(hautRaster(), p, ka.blick)) } : gezeichnet;
    if (!roh.haerte.some((h) => h > 0)) {
      berichte.push({ art: 'ohne', index, ms: 0 });
      return;
    }
    // rechte Hälfte (die linke ist das Spiegelbild)
    const linie: NetzLinie = { punkte: roh.punkte.map((p) => [p[0], p[1], Math.abs(p[2])]), haerte: roh.haerte };
    const basis = { kaefig: k, fein, unterteilung: abl.unterteilung, vorlage: abl.vorlage };
    // Bereich der Kante: Ringe (Reihe) bzw. Spalten (Ring) innerhalb der Linie (über ihre Enden hinaus lag die Kante neben
    // der gezeichneten Linie)
    const bereichReihe = (r: { uVon: number; uBis: number }): [number, number] => [Math.max(0, Math.ceil(r.uVon - 0.25)), Math.min(R - 1, Math.floor(r.uBis + 0.25))];
    const bereichRing = (r: { vVon: number; vBis: number }): [number, number] => [Math.max(0, Math.ceil(Math.min(r.vVon, r.vBis) - 0.25)), Math.min(H, Math.floor(Math.max(r.vVon, r.vBis) + 0.25))];
    // Plan 20.10., V1: Eine Querlinie passt oft auch auf eine Reihe, die sie nur auf einem Bruchteil eines Ringabstands
    // berührt — dann wurde keine Käfigkante scharf, gemeldet war trotzdem „Reihe“ (Kegel, Vierbeiner, Krake der
    // Extremreihe). Deckt die Reihe keine ganze Kante, gilt der Ring; deckt auch er keine, die Treppe.
    let reihe = reiheEinpassen(basis, linie);
    if (reihe) {
      const [a, b] = bereichReihe(reihe);
      if (b - a < 1) reihe = null;
    }
    let ring = reihe ? null : ringEinpassen(basis, linie);
    if (ring) {
      const [a, b] = bereichRing(ring);
      if (b - a < 1) ring = null;
    }
    if (!reihe && !ring) {
      treppe.push(roh);
      berichte.push({ art: 'fehlt', index, ms: jetzt() - t0 });
      return;
    }
    const e = (reihe ?? ring)!;
    k.xyz.set(e.xyz);
    fein = e.fein;
    const sch = (f: number) => {
      const h = haerteBei(linie.haerte, f);
      return h >= 1 ? schaerfeMax : 3 * h;
    };
    // läuft die Linie vom Anfang des Bereichs (kleines u bzw. v) zum Ende? Der erste Linienpunkt liegt näher am Anfang
    // Auslauf: die k-te Kante vom Ende (k = 0, 1, …) ist höchstens 3 · (k + 1) / (auslauf + 1) scharf (halbscharf: scharf
    // für so viele Stufen, dann glatt), die Kante läuft an offenen Enden weich aus
    const [von, bis] = reihe ? bereichReihe(reihe) : bereichRing(ring!);
    // höchstens ein Viertel der Kanten der Linie läuft aus (je Ende), sonst bliebe eine kurze Linie ganz weich
    const aus = Math.min(auslauf, Math.floor((bis - von) / 4));
    const auslaufGrenze = (vomAnfang: number, vomEnde: number): number => {
      if (!aus) return Infinity;
      const k = Math.min(vomAnfang, vomEnde);
      return k >= aus ? Infinity : (3 * (k + 1)) / (aus + 1);
    };
    const naeher = (p0: number, p1: number) => {
      const q = linie.punkte[0]!;
      const d = (p: number) => Math.hypot(k.xyz[3 * p]! - q[0], k.xyz[3 * p + 1]! - q[1], Math.abs(k.xyz[3 * p + 2]!) - q[2]);
      return d(p0) <= d(p1);
    };
    if (reihe) {
      // Kanten der Reihe j (und N − j) zwischen den Ringen der Linie; die Härte nach dem Anteil längs der Linie
      const i0 = von;
      const i1 = bis;
      const L = Math.max(1e-9, reihe.uBis - reihe.uVon);
      const vorwaerts = naeher(abl.vorlage.ringPunkt(i0, reihe.j), abl.vorlage.ringPunkt(i1, reihe.j));
      for (let i = i0; i < i1; i++) {
        const fRoh = (i + 0.5 - reihe.uVon) / L;
        const s = Math.min(sch(Math.min(1, Math.max(0, vorwaerts ? fRoh : 1 - fRoh))), auslaufGrenze(i - i0, i1 - 1 - i));
        if (!(s > 0)) continue;
        for (const j of [reihe.j, N - reihe.j]) setze(abl.vorlage.ringPunkt(i, j), abl.vorlage.ringPunkt(i + 1, j), s);
      }
      kantenZuege.push({ punkte: Array.from({ length: Math.max(0, i1 - i0 + 1) }, (_, q) => abl.vorlage.ringPunkt(i0 + q, reihe.j)), linie: linie.punkte });
    } else if (ring) {
      const j0 = von;
      const j1 = bis;
      const L = Math.max(1e-9, Math.abs(ring.vBis - ring.vVon));
      const vorwaerts = naeher(abl.vorlage.ringPunkt(ring.i, j0), abl.vorlage.ringPunkt(ring.i, j1));
      for (let j = j0; j < j1; j++) {
        const fRoh = (j + 0.5 - Math.min(ring.vVon, ring.vBis)) / L;
        // Enden auf der Naht (j = 0 bzw. H) laufen nicht aus: dort geht die Linie in ihr Spiegelbild über
        const s = Math.min(sch(Math.min(1, Math.max(0, vorwaerts ? fRoh : 1 - fRoh))), auslaufGrenze(j0 === 0 ? Infinity : j - j0, j1 === H ? Infinity : j1 - 1 - j));
        if (!(s > 0)) continue;
        setze(abl.vorlage.ringPunkt(ring.i, j), abl.vorlage.ringPunkt(ring.i, j + 1), s);
        setze(abl.vorlage.ringPunkt(ring.i, N - j), abl.vorlage.ringPunkt(ring.i, N - j - 1), s);
      }
      kantenZuege.push({ punkte: Array.from({ length: Math.max(0, j1 - j0 + 1) }, (_, q) => abl.vorlage.ringPunkt(ring.i, j0 + q)), linie: linie.punkte });
    }
    berichte.push({ art: reihe ? 'reihe' : 'ring', index, ms: jetzt() - t0 });
  });
  if (!schaerfe.size && !treppe.length && !berichte.some((b) => b.art === 'reihe' || b.art === 'ring')) return { abl, berichte };
  // neuer Käfig mit den Kanten, neue Unterteilung (die Schärfe verändert die Unterteilungsmatrix), feines Netz
  const eS = Float64Array.from(abl.kaefig.eSchaerfe);
  for (const [e, s] of schaerfe) if (s > eS[e]!) eS[e] = s;
  // Treppe für die übrigen Linien: nächster Käfigpunkt je Linienpunkt, verbunden über den kürzesten Weg, gespiegelt
  if (treppe.length) baumKantenFalten({ kaefig: { ...k, eSchaerfe: eS }, spiegel: spiegelPunkte(k) } as unknown as BaumKaefig, k.xyz, treppe, schaerfeMax);
  const k2: Kaefig = { ...abl.kaefig, xyz: new Float64Array(k.xyz), eSchaerfe: eS };
  const u2 = unterteilung(k2, abl.unterteilung.stufen.length);
  // Nachführen: Das Schärfen ändert die Grenzlage der Kantenpunkte (eine scharfe Kante folgt dem B-Spline ihrer Käfigpunkte,
  // nicht mehr der glatten Maske) — ohne Nachführen lag die Kante 2–3 px neben der Linie. Je Schritt: Grenzlage der
  // Kantenpunkte → nächster Punkt auf der Linie → Käfigpunkt um 1,5 × den Rest verschieben (gespiegelt), vier Schritte
  const xyz = k2.xyz;
  const spiegelVon = new Map<number, number>();
  for (let i = 0; i < R; i++) for (let j = 1; j < H; j++) spiegelVon.set(abl.vorlage.ringPunkt(i, j), abl.vorlage.ringPunkt(i, N - j));
  const naht = new Set<number>();
  for (let i = 0; i < R; i++) for (const j of [0, H]) naht.add(abl.vorlage.ringPunkt(i, j));
  for (let schritt = 0; schritt < korrektur; schritt++) {
    const f = anwenden3(u2.grenze, xyz);
    // je Punkt die Reste aller Kantenzüge, in denen er steht (Kreuzung: zwei), gemittelt und einmal angewandt
    const rest = new Map<number, [number, number, number, number]>();
    for (const z of kantenZuege) {
      for (const p of z.punkte) {
        const L: [number, number, number] = [f[3 * p]!, f[3 * p + 1]!, f[3 * p + 2]!];
        const T = naechsterPunkt(z.linie, L);
        const r = rest.get(p) ?? [0, 0, 0, 0];
        rest.set(p, [r[0] + T[0] - L[0], r[1] + T[1] - L[1], r[2] + T[2] - L[2], r[3] + 1]);
      }
    }
    for (const [p, [dx, dy, dz, n]] of rest) {
      xyz[3 * p] = xyz[3 * p]! + (1.5 * dx) / n;
      xyz[3 * p + 1] = xyz[3 * p + 1]! + (1.5 * dy) / n;
      // die Naht liegt in der Spiegelebene
      xyz[3 * p + 2] = naht.has(p) ? 0 : xyz[3 * p + 2]! + (1.5 * dz) / n;
      const q = spiegelVon.get(p);
      if (q !== undefined) {
        xyz[3 * q] = xyz[3 * p]!;
        xyz[3 * q + 1] = xyz[3 * p + 1]!;
        xyz[3 * q + 2] = -xyz[3 * p + 2]!;
      }
    }
  }
  return { abl: { ...abl, kaefig: k2, unterteilung: u2, fein: anwenden3(u2.grenze, xyz) }, berichte };
}

/** Spiegelpunkt je Käfigpunkt (x, y, −z); der Käfig der Röhre ist spiegelgleich, Punkte der Naht sind ihr eigener Spiegel. */
function spiegelPunkte(k: Kaefig): Int32Array {
  const P = k.xyz;
  const out = new Int32Array(k.n).fill(-1);
  for (let p = 0; p < k.n; p++) {
    let best = p;
    let bd = Infinity;
    for (let q = 0; q < k.n; q++) {
      const d = (P[3 * q]! - P[3 * p]!) ** 2 + (P[3 * q + 1]! - P[3 * p + 1]!) ** 2 + (P[3 * q + 2]! + P[3 * p + 2]!) ** 2;
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    out[p] = best;
  }
  return out;
}

/** Nächster Punkt auf einem Polygonzug. */
function naechsterPunkt(zug: readonly [number, number, number][], p: readonly number[]): [number, number, number] {
  let best: [number, number, number] = zug[0]!;
  let bd = Infinity;
  for (let i = 0; i + 1 < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = ab[0]! * ab[0]! + ab[1]! * ab[1]! + ab[2]! * ab[2]! || 1e-30;
    const t = Math.max(0, Math.min(1, ((p[0]! - a[0]) * ab[0]! + (p[1]! - a[1]) * ab[1]! + (p[2]! - a[2]) * ab[2]!) / l2));
    const q: [number, number, number] = [a[0] + t * ab[0]!, a[1] + t * ab[1]!, a[2] + t * ab[2]!];
    const d = (q[0] - p[0]!) ** 2 + (q[1] - p[1]!) ** 2 + (q[2] - p[2]!) ** 2;
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());
