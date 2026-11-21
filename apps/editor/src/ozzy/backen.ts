// Ozzy, Backen fürs Spiel (Plan „Maul, Zähne, Zunge“, Etappe 9, Scheibe 1, 21.11.2026;
// `docs/plans/2026-11-21-ozzy-maul-etappe-9-backen.md`).
//
// Aus der Form des Werks wird ein Spielnetz mit höchstens `budget` Dreiecken (`form/spielform.ts`: je Punkt eine Grundlage, je Pose
// ein Versatz und ein Drehwinkel):
//   - Die Haut (mit der Tasche des Mauls) sind die Punkte der Teilung der Anzeige (`werk.anzeigeIndex`: ein Punkt auf einer harten
//     Linie steht je Seite einmal), ausgedünnt mit dem Ausdünner des Rechenkerns (`backen` in `@ee/shape/dicht`: Es bleiben Punkte
//     der Form stehen, nur weniger). Ausgedünnt wird in einer offenen Lage, mit den Normalen und dem Drehwinkel als Merkmalen.
//   - Jeder Punkt trägt in jeder Lage die Normale, mit der die Anzeige ihn zeigt (der Rechner der glatten Anzeige). An der
//     geschlossenen Lippe bekommen die zwei Lippen von außen dieselbe Normale: Zu ist das Maul im Licht nicht zu sehen.
//   - Die Zähne stehen in jeder Lage, wie die Anzeige sie baut (`zaehneNetz`); je Zahnform wird einmal ausgedünnt. In der
//     geschlossenen Grundform haben sie die Länge null: Das ist ihre Grundlage.
// Ohne DOM. Wer backt, liest vorher alles aus Werk und Anzeige (`BackEingabe`); hier wird nur gerechnet.
import { backen as ausduennen } from '@ee/shape/dicht';
import type { HautNetz } from '../anfang/haut';
import { type GezeigteLage, type Spielform, lippenGleichTeilen, normalenAngleichen, spielformAus } from '../form/spielform';
import type { SpielDaten, SpielLageDaten } from '../form/werk';
import type { Ort } from './farbe/ort';
import { type FormNetz, type ZahnPlatz, platzNetz } from './zaehne';

/** so viele Dreiecke bekommt ein Zahn im Spiel höchstens (Recherche vom 02.11.: 40 bis 60) */
export const ZAHN_DREIECKE = 40;

/** die Zähne einer Lage: ihre Plätze und ihr Netz, wie die Anzeige es baut (Einheiten des Werks; Zahn für Zahn gleich viele Punkte) */
export type ZahnLage = { plaetze: readonly ZahnPlatz[]; netz: HautNetz };

export type BackEingabe = {
  /** die Teilung der Anzeige: Dreiecke über gezeigte Punkte, je gezeigtem Punkt sein Rechenpunkt */
  index: Uint32Array;
  quelle: Int32Array;
  /** die Normalen der gezeigten Punkte für ihre Lagen (3 je gezeigtem Punkt), wie die Anzeige sie rechnet */
  normalen: (lagen: Float64Array) => Float32Array;
  /** Grundform und Posen aus dem Werk */
  daten: SpielDaten;
  /** je Rechenpunkt: gehört er zur Tasche oder zur Lippe? (null: kein Maul) */
  innen: ArrayLike<number> | null;
  /** die Zähne in der Grundform (das Maul zu) und in jeder Pose, in derselben Reihenfolge wie `daten.posen`; null: keine */
  zaehne: { grund: ZahnLage; posen: ZahnLage[] } | null;
  budget: number;
};

export type Gebacken = {
  form: Spielform;
  /** je Punkt der Haut im Spielnetz sein gezeigter Punkt (in der Teilung der Anzeige) */
  vonPunkt: Int32Array;
  /** je Punkt eines Zahns im Spielnetz: der wievielte Zahn und welcher Punkt seines Netzes in der Anzeige */
  vonZahn: Int32Array;
  /**
   * Die Lippen in der Grundlage: wie viele Punkte von außen angeglichene Normalen tragen, um wie viel Grad sich eine dabei höchstens
   * gedreht hat, wie weit zwei davon höchstens auseinander lagen; wie viele Zwillinge eingesetzt wurden, damit beide Lippen gleich
   * geteilt sind, und warum das nicht ging ('': Es ging, oder es gibt kein Maul).
   */
  lippe: { punkte: number; grad: number; weit: number; eingesetzt: number; ungleich: string };
  /** je Punkt der Haut im Spielnetz: gehört er zur Tasche oder zur Lippe? */
  innen: Uint8Array;
  /** alle Punkte der Lippen von außen (im Spielnetz): An ihnen weicht die Normale der Grundlage mit Absicht von der der Anzeige ab */
  lippenAussen: Int32Array;
  dreiecke: number;
  dreieckeZaehne: number;
  /** so viele Dreiecke hatte die Haut vor dem Ausdünnen */
  dreieckeVorher: number;
  /** die Abweichung, wie der Ausdünner sie schätzt (Einheiten des Werks) */
  fehler: number;
  /** warum die Zähne fehlen ('': Sie sind dabei oder es gibt keine) */
  ohneZaehne: string;
};

/** die Lagen der Rechenpunkte einer Lage, wie gezeigt: jeder um das Scharnier gedreht um seinen Winkel (wie `knochenDrehen`) */
export function lageGezeigt(l: SpielLageDaten): Float64Array {
  const P = l.ruhe;
  const aus = new Float64Array(P.length);
  for (let v = 0; v < P.length / 3; v++) {
    const t = l.theta[v] ?? 0;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const dx = P[3 * v]! - l.G.x;
    const dy = P[3 * v + 1]! - l.G.y;
    aus[3 * v] = l.G.x + c * dx - s * dy;
    aus[3 * v + 1] = l.G.y + s * dx + c * dy;
    aus[3 * v + 2] = P[3 * v + 2]!;
  }
  return aus;
}

/** ein Wert der Rechenpunkte an einem Ort der Haut (ein Dreieck mit Gewichten) */
const amOrt = (w: ArrayLike<number>, o: Ort): number => o.w[0] * (w[o.e[0]] ?? 0) + o.w[1] * (w[o.e[1]] ?? 0) + o.w[2] * (w[o.e[2]] ?? 0);

/** eine Zahnform, ausgedünnt: welche ihrer Punkte bleiben und die Dreiecke über diese (in der Zählung der gebliebenen) */
type ZahnDuenn = { bleibt: Uint32Array; idx: Uint32Array };
function zahnDuenn(g: FormNetz, dreiecke: number): ZahnDuenn {
  const r = g.idx.length / 3 > dreiecke ? ausduennen({ positionen: g.pos, normalen: g.nor, indizes: g.idx }, null, dreiecke).indizes : g.idx;
  const nr = new Map<number, number>();
  const idx = new Uint32Array(r.length);
  for (let i = 0; i < r.length; i++) {
    let k = nr.get(r[i]!);
    if (k === undefined) {
      k = nr.size;
      nr.set(r[i]!, k);
    }
    idx[i] = k;
  }
  return { bleibt: Uint32Array.from(nr.keys()), idx };
}

/** Das Spielnetz backen. Erst nach `backenBereit` (der Ausdünner lädt sein WebAssembly einmal). */
export function spielformBacken(e: BackEingabe): Gebacken {
  const D = e.quelle.length;
  const { daten } = e;
  const verteilt = (P: ArrayLike<number>): Float64Array => {
    const aus = new Float64Array(3 * D);
    for (let d = 0; d < D; d++) {
      const q = 3 * e.quelle[d]!;
      aus[3 * d] = P[q]!;
      aus[3 * d + 1] = P[q + 1]!;
      aus[3 * d + 2] = P[q + 2]!;
    }
    return aus;
  };

  // ---- die Zähne: passen sie in allen Lagen Zahn für Zahn zusammen? ----
  let ohneZaehne = '';
  let zaehne = e.zaehne;
  if (zaehne) {
    const Z = zaehne.grund.plaetze;
    const passt = (l: ZahnLage): boolean => l.plaetze.length === Z.length && l.netz.pos.length === zaehne!.grund.netz.pos.length && l.plaetze.every((q, i) => q.i === Z[i]!.i && q.unten === Z[i]!.unten);
    if (!Z.length) zaehne = null;
    else if (zaehne.posen.length !== daten.posen.length || !zaehne.posen.every(passt)) {
      ohneZaehne = 'Die Zähne stehen nicht in jeder Pose Zahn für Zahn gleich';
      zaehne = null;
    }
  }
  const formen = new Map<FormNetz, ZahnDuenn>();
  const duenn = zaehne
    ? zaehne.grund.plaetze.map((q) => {
        const g = platzNetz(q);
        let z = formen.get(g);
        if (!z) {
          z = zahnDuenn(g, ZAHN_DREIECKE);
          formen.set(g, z);
        }
        return z;
      })
    : [];
  const dreieckeZaehne = duenn.reduce((s, z) => s + z.idx.length / 3, 0);

  // ---- die Haut: in einer offenen Lage ausdünnen; dann die zwei Lippen gleich teilen ----
  const dreieckeVorher = e.index.length / 3;
  const budgetHaut = Math.max(4, e.budget - dreieckeZaehne);
  // je gezeigtem Punkt: Liegt er ganz in der Tasche (jedes Dreieck an ihm ist eine Wand), oder gehört er zur Haut von außen?
  const inTasche = new Uint8Array(D).fill(1);
  const wand = (a: number, b: number, c: number): boolean => !!e.innen && e.innen[e.quelle[a]!]! > 0 && e.innen[e.quelle[b]!]! > 0 && e.innen[e.quelle[c]!]! > 0;
  for (let t = 0; t < e.index.length; t += 3) {
    if (wand(e.index[t]!, e.index[t + 1]!, e.index[t + 2]!)) continue;
    inTasche[e.index[t]!] = 0;
    inTasche[e.index[t + 1]!] = 0;
    inTasche[e.index[t + 2]!] = 0;
  }
  // die Lippen als Ketten von Zwillingen (zu liegen sie am selben Ort): die Hälfte z ≥ 0 und ihr Spiegelbild
  let ketten: number[][] = [];
  let ungleich = '';
  if (daten.lippe && daten.zu) {
    const K = daten.lippe;
    const m = K.length;
    const P0 = lageGezeigt(daten.zu);
    let weit = 0;
    for (let k = 0; 2 * k < m - 1; k++) {
      const a = 3 * K[k]!;
      const b = 3 * K[m - 1 - k]!;
      weit = Math.max(weit, Math.hypot(P0[a]! - P0[b]!, P0[a + 1]! - P0[b + 1]!, P0[a + 2]! - P0[b + 2]!));
    }
    if (m % 2 !== 1 || K[(m - 1) / 2] !== daten.scharnier) ungleich = `der Mundwinkel steht nicht in der Mitte der Lippe (Kette ${m}, Mundwinkel an Stelle ${K.indexOf(daten.scharnier)}, Enden ${K[0]} und ${K[m - 1]}, zu ${weit.toFixed(3)} auseinander)`;
    else if (weit > 1e-3) ungleich = `die Lippen liegen zu bis ${weit.toFixed(3)} auseinander`;
    else {
      const gespiegelt = K.map((v) => daten.spiegel[v] ?? -1);
      ketten = gespiegelt.every((v) => v >= 0) && gespiegelt.some((v, k) => v !== K[k]) ? [K, gespiegelt] : [K];
    }
  }
  const kopien = new Map<number, number[]>();
  for (const K of ketten) for (const q of K) if (!kopien.has(q)) kopien.set(q, []);
  if (kopien.size) for (let d = 0; d < D; d++) kopien.get(e.quelle[d]!)?.push(d);
  const kopie = (q: number, wie: number): number => {
    const k = kopien.get(q);
    return k?.find((d) => inTasche[d] === inTasche[wie]) ?? k?.[0] ?? -1;
  };
  let index = e.index;
  let fehler = 0;
  let eingesetzt = 0;
  if (dreieckeVorher > budgetHaut) {
    const offen = daten.offen;
    const lagen = verteilt(offen ? lageGezeigt(offen) : daten.grund);
    const positionen = Float32Array.from(lagen);
    const normalen = e.normalen(lagen);
    // Merkmale für den Ausdünner: der Drehwinkel je Punkt in der offenen Lage, und der in der Pose, deren Maul am wenigsten weit
    // offen steht. Das Feld der Kiefer läuft je nach Winkel verschieden breit aus: Ein Dreieck, das in der einen Pose glatt über den
    // Auslauf geht, knickt in der anderen (gemessen: 7,8 Einheiten am Hals in „Fressen“, wenn nur die weiteste Pose zählt).
    const knochen = new Float32Array(2 * D);
    const feldAls = (theta: ArrayLike<number>, platz: 0 | 1): void => {
      let weit = 0;
      for (let v = 0; v < theta.length; v++) weit = Math.max(weit, Math.abs(theta[v]!));
      if (weit > 0) for (let d = 0; d < D; d++) knochen[2 * d + platz] = theta[e.quelle[d]!]! / weit;
    };
    if (offen) feldAls(offen.theta, 0);
    const eng = daten.posen.filter((p) => p.theta !== offen?.theta && p.wer.kiefer + p.wer.schaedel > 0).sort((a, b) => a.wer.kiefer + a.wer.schaedel - (b.wer.kiefer + b.wer.schaedel))[0];
    if (eng) feldAls(eng.theta, 1);
    // (das Einsetzen der Zwillinge kostet Dreiecke: Reicht das Budget danach nicht, wird mit weniger noch einmal ausgedünnt)
    let ziel = budgetHaut - (ketten.length ? 48 : 0);
    for (let versuch = 0; versuch < 4; versuch++) {
      const r = ausduennen({ positionen, normalen, indizes: e.index, knochen }, null, Math.max(4, ziel));
      index = r.indizes;
      fehler = r.fehler;
      eingesetzt = 0;
      for (const K of ketten) {
        const g = lippenGleichTeilen(index, e.quelle, K, kopie);
        index = g.index;
        eingesetzt += g.eingesetzt;
      }
      if (index.length / 3 <= budgetHaut) break;
      ziel -= index.length / 3 - budgetHaut + 8;
    }
  }
  // die Punkte, die bleiben, neu gezählt
  const neu = new Int32Array(D).fill(-1);
  const von: number[] = [];
  const hautIndex = new Uint32Array(index.length);
  for (let i = 0; i < index.length; i++) {
    const d = index[i]!;
    if (neu[d]! < 0) {
      neu[d] = von.length;
      von.push(d);
    }
    hautIndex[i] = neu[d]!;
  }
  // Der Mundwinkel muss ein Punkt des Spielnetzes sein: Um ihn wird gedreht. Hat der Ausdünner ihn nicht behalten, steht er als
  // Punkt ohne Dreieck dabei.
  let scharnier = -1;
  if (daten.scharnier >= 0) {
    scharnier = von.findIndex((d) => e.quelle[d] === daten.scharnier);
    if (scharnier < 0) {
      const d = e.quelle.indexOf(daten.scharnier);
      if (d >= 0) {
        scharnier = von.length;
        von.push(d);
      }
    }
  }
  const nH = von.length;
  const zahnPunkte = duenn.reduce((s, z) => s + z.bleibt.length, 0);
  const n = nH + zahnPunkte;
  const vonPunkt = Int32Array.from(von);
  const vonZahn = new Int32Array(2 * zahnPunkte);
  const jeZahn = zaehne ? zaehne.grund.netz.pos.length / 3 / zaehne.grund.plaetze.length : 0;

  // ---- die Dreiecke: erst die Haut, dann die Zähne (am Spiegelbild läuft jedes andersherum, wie in `zaehneNetz`) ----
  const alle = new Uint32Array(hautIndex.length + 3 * dreieckeZaehne);
  alle.set(hautIndex);
  {
    let v0 = nH;
    let i0 = hautIndex.length;
    duenn.forEach((z, nr) => {
      const gespiegelt = zaehne!.grund.plaetze[nr]!.gespiegelt;
      for (let i = 0; i < z.idx.length; i += 3) {
        alle[i0 + i] = v0 + z.idx[i]!;
        alle[i0 + i + 1] = v0 + z.idx[i + (gespiegelt ? 2 : 1)]!;
        alle[i0 + i + 2] = v0 + z.idx[i + (gespiegelt ? 1 : 2)]!;
      }
      z.bleibt.forEach((lokal, k) => {
        vonZahn[2 * (v0 - nH + k)] = nr;
        vonZahn[2 * (v0 - nH + k) + 1] = lokal;
      });
      v0 += z.bleibt.length;
      i0 += z.idx.length;
    });
  }

  // ---- eine Lage aller Punkte des Spielnetzes, wie gezeigt ----
  const lageBauen = (name: string, l: SpielLageDaten | null, zl: ZahnLage | null): GezeigteLage => {
    const P = verteilt(l ? lageGezeigt(l) : daten.grund);
    const N = e.normalen(P);
    const pos = new Float32Array(3 * n);
    const nor = new Float32Array(3 * n);
    const winkel = new Float32Array(n);
    for (let i = 0; i < nH; i++) {
      const d = von[i]!;
      for (let c = 0; c < 3; c++) {
        pos[3 * i + c] = P[3 * d + c]!;
        nor[3 * i + c] = N[3 * d + c]!;
      }
      winkel[i] = l ? (l.theta[e.quelle[d]!] ?? 0) : 0;
    }
    if (zl) {
      let v = nH;
      duenn.forEach((z, nr) => {
        const q = zl.plaetze[nr]!;
        // (ein Zahn dreht starr mit dem Kiefer, an dem sein Fuß steht)
        const w = l ? (1 - q.u) * amOrt(l.theta, q.a) + q.u * amOrt(l.theta, q.b) : 0;
        for (const lokal of z.bleibt) {
          const a = 3 * (nr * jeZahn + lokal);
          for (let c = 0; c < 3; c++) {
            pos[3 * v + c] = zl.netz.pos[a + c]!;
            nor[3 * v + c] = zl.netz.normal[a + c]!;
          }
          winkel[v] = w;
          v++;
        }
      });
    }
    return { name, pos, nor, winkel, scharnier: l ? l.G : { x: 0, y: 0 } };
  };
  // die Grundlage: die Grundform mit den Kiefern bei null (der Haarspalt der Rechnung ist zu: Die Lippen liegen aufeinander)
  const grund = lageBauen('Grundform', daten.zu, zaehne ? zaehne.grund : null);
  // (ihre Punkte drehen nicht: Sie ist die Lage, von der alles ausgeht)
  (grund.winkel as Float32Array).fill(0);

  // ---- zu ist unsichtbar: die Lippen von außen tragen an der geschlossenen Lippe dieselbe Normale ----
  let lippe = { punkte: 0, grad: 0, weit: 0, eingesetzt, ungleich };
  const aussen = new Set<number>();
  if (e.innen) {
    const innen = e.innen;
    for (let t = 0; t < hautIndex.length; t += 3) {
      const ecken = [hautIndex[t]!, hautIndex[t + 1]!, hautIndex[t + 2]!];
      const tasche = ecken.map((i) => innen[e.quelle[von[i]!]!]! > 0);
      // (ein Dreieck ganz in der Tasche ist eine Wand; die anderen sind Haut von außen: Ihre Ecken an der Lippe zählen)
      if (tasche.every(Boolean)) continue;
      ecken.forEach((i, k) => {
        if (tasche[k]) aussen.add(i);
      });
    }
    lippe = { ...normalenAngleichen(grund.pos, grund.nor as Float32Array, aussen), eingesetzt, ungleich };
  }

  const lagen = daten.posen.map((p, k) => lageBauen(p.name, p, zaehne ? zaehne.posen[k]! : null));
  const form = spielformAus(grund, alle, nH, hautIndex.length / 3, scharnier, lagen);
  const innen = Uint8Array.from(von, (d) => (e.innen && e.innen[e.quelle[d]!]! > 0 ? 1 : 0));
  return { form, vonPunkt, vonZahn, lippe, lippenAussen: Int32Array.from(aussen), innen, dreiecke: alle.length / 3, dreieckeZaehne, dreieckeVorher, fehler, ohneZaehne };
}
