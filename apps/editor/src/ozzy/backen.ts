// Ozzy, Backen fürs Spiel (Plan „Maul, Zähne, Zunge“, Etappe 9, Scheibe 1, 21.11.2026;
// `docs/plans/2026-11-21-ozzy-maul-etappe-9-backen.md`).
//
// Aus der Form des Werks wird ein Spielnetz mit höchstens `budget` Dreiecken (`form/spielform.ts`: je Punkt eine Grundlage, je Pose
// ein Versatz und ein Drehwinkel):
//   - Die Haut (mit der Tasche des Mauls) sind die Punkte der Teilung der Anzeige (`werk.anzeigeIndex`: ein Punkt auf einer harten
//     Linie steht je Seite einmal), ausgedünnt mit dem Ausdünner des Rechenkerns (`backen` in `@ee/shape/dicht`: Es bleiben Punkte
//     der Form stehen, nur weniger). Ausgedünnt wird in einer offenen Lage, mit den Normalen und den Drehwinkeln als Merkmalen.
//   - Jeder Punkt trägt in jeder Lage die Normale, mit der die Anzeige ihn zeigt (der Rechner der glatten Anzeige).
//   - Zu ist das Maul nicht zu sehen: Der Ausdünner lässt von den zwei Lippen verschiedene Punkte stehen; hier bekommt jede Lippe
//     an jeder Stelle, an der die andere einen Punkt hat, auch einen (`lippenGleichTeilen`; ein solcher Punkt liegt zwischen zwei
//     Punkten der Form auf seiner Lippe). In der Grundlage liegen die Paare am selben Ort und tragen von außen dieselbe Normale.
//   - Die Zähne stehen in jeder Lage, wie die Anzeige sie baut (`zaehneNetz`); je Zahnform wird einmal ausgedünnt. In der
//     geschlossenen Grundform haben sie die Länge null: Das ist ihre Grundlage.
// Ohne DOM. Wer backt, liest vorher alles aus Werk und Anzeige (`BackEingabe`); hier wird nur gerechnet.
import { backen as ausduennen } from '@ee/shape/dicht';
import type { HautNetz } from '../anfang/haut';
import { type GezeigteLage, type LippenStelle, type Spielform, lippenGleichTeilen, normalenAngleichen, spielformAus } from '../form/spielform';
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
  /**
   * Je Punkt der Haut im Spielnetz sein gezeigter Punkt (in der Teilung der Anzeige). Ein Punkt, der beim Angleichen der Lippen
   * eingesetzt wurde, liegt zwischen zweien: `vonPunkt` und `vonPunktB`, beim Anteil `anteil` des zweiten (sonst 0).
   */
  vonPunkt: Int32Array;
  vonPunktB: Int32Array;
  anteil: Float32Array;
  /** je Punkt eines Zahns im Spielnetz: der wievielte Zahn und welcher Punkt seines Netzes in der Anzeige */
  vonZahn: Int32Array;
  /**
   * Die Lippen in der Grundlage: wie viele Punkte von außen angeglichene Normalen tragen, um wie viel Grad sich eine dabei höchstens
   * gedreht hat; an wie vielen Stellen jetzt beide Lippen einen Punkt haben, wie viele davon eingesetzt wurden, wie weit ein Paar
   * vor dem Zusammenlegen höchstens auseinander lag; und warum es nicht ging ('': Es ging, oder es gibt kein Maul).
   */
  lippe: { punkte: number; grad: number; paare: number; eingesetzt: number; weit: number; ungleich: string };
  /** alle Punkte der Lippen von außen (im Spielnetz): An ihnen weicht die Grundlage mit Absicht von der Anzeige ab */
  lippenAussen: Int32Array;
  /** je Punkt der Haut im Spielnetz: gehört er zur Tasche oder zur Lippe? */
  innen: Uint8Array;
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

/** eine Lippe als Kette von Rechenpunkten mit ihrer Stelle längs der Lippe (0 am Mundwinkel, 1 an der Spitze, 2 am Mundwinkel der anderen Hälfte) */
type Lippe = { punkte: number[]; s: number[] };
type Geteilt = ReturnType<typeof lippenGleichTeilen>;

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
    const punkte = zaehne.grund.netz.pos.length;
    const passt = (l: ZahnLage): boolean => l.plaetze.length === Z.length && l.netz.pos.length === punkte && l.plaetze.every((q, i) => q.i === Z[i]!.i && q.unten === Z[i]!.unten);
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

  // ---- außen oder in der Tasche: je gezeigtem Punkt (in der Tasche: Jedes Dreieck an ihm ist eine Wand) ----
  const innenQuelle = (q: number): boolean => !!e.innen && e.innen[q]! > 0;
  const inTasche = new Uint8Array(D).fill(1);
  for (let t = 0; t < e.index.length; t += 3) {
    const [a, b, c] = [e.index[t]!, e.index[t + 1]!, e.index[t + 2]!];
    if (innenQuelle(e.quelle[a]!) && innenQuelle(e.quelle[b]!) && innenQuelle(e.quelle[c]!)) continue;
    inTasche[a] = 0;
    inTasche[b] = 0;
    inTasche[c] = 0;
  }

  // ---- die zwei Lippen als Ketten vom Mundwinkel über die Spitze zum Mundwinkel der anderen Hälfte ----
  let lippen: [Lippe, Lippe] | null = null;
  let ungleich = '';
  const stelle = new Map<number, LippenStelle>();
  const P0 = daten.zu ? lageGezeigt(daten.zu) : daten.grund;
  const weg = (a: number, b: number): number => Math.hypot(P0[3 * a]! - P0[3 * b]!, P0[3 * a + 1]! - P0[3 * b + 1]!, P0[3 * a + 2]! - P0[3 * b + 2]!);
  if (daten.lippe && daten.zu) {
    const K = daten.lippe;
    const c = K.indexOf(daten.scharnier);
    const sp = daten.spiegel;
    const kette = (folge: number[]): Lippe => {
      // (vom Mundwinkel zur Spitze: Die Stelle ist der Anteil der Länge, zu gemessen)
      const lang = [0];
      for (let k = 1; k < folge.length; k++) lang.push(lang[k - 1]! + weg(folge[k - 1]!, folge[k]!));
      const L = lang[lang.length - 1] || 1;
      const s = lang.map((x) => x / L);
      const spitze = folge[folge.length - 1]!;
      // die andere Hälfte dazu, wenn die Spitze auf der Spiegelebene liegt
      if (sp[spitze] !== spitze || folge.some((v) => !(sp[v]! >= 0))) return { punkte: folge, s };
      const zurueck = folge.slice(0, -1).reverse();
      return { punkte: [...folge, ...zurueck.map((v) => sp[v]!)], s: [...s, ...s.slice(0, -1).reverse().map((x) => 2 - x)] };
    };
    if (c <= 0 || c >= K.length - 1) ungleich = 'der Mundwinkel steht nicht in der Kette der Lippe';
    else {
      const A = kette(K.slice(0, c + 1).reverse());
      const B = kette(K.slice(c));
      const spitzen = weg(K[0]!, K[K.length - 1]!);
      if (spitzen > 1) ungleich = `die Lippen liegen zu an der Spitze ${spitzen.toFixed(2)} auseinander`;
      else {
        lippen = [A, B];
        lippen.forEach((L, welche) =>
          L.punkte.forEach((q, k) => {
            const ecke = k === 0 || (k === L.punkte.length - 1 && L.s[k]! > 1.5);
            stelle.set(q, { welche: ecke ? 2 : (welche as 0 | 1), s: L.s[k]! });
          }),
        );
      }
    }
  }
  const kopien = new Map<number, number[]>();
  for (const q of stelle.keys()) kopien.set(q, []);
  if (kopien.size) for (let d = 0; d < D; d++) kopien.get(e.quelle[d]!)?.push(d);
  /** der gezeigte Punkt für den Rechenpunkt q auf der Seite `seite` (1: in der Tasche) */
  const kopie = (q: number, seite: number): number => {
    const k = kopien.get(q);
    return k?.find((d) => inTasche[d] === seite) ?? k?.[0] ?? -1;
  };
  // Punkte, die beim Angleichen der Lippen dazukommen: zwischen zwei gezeigten Punkten a und b beim Anteil t (ihre Nummern: D, D + 1, …)
  let extra: { a: number; b: number; t: number; welche: 0 | 1; s: number; seite: number }[] = [];
  let extraNr = new Map<string, number>();
  const seiteVon = (d: number): number => (d < D ? inTasche[d]! : extra[d - D]!.seite);
  const lippeVon = (d: number): LippenStelle | null => {
    if (d < D) return stelle.get(e.quelle[d]!) ?? null;
    const x = extra[d - D]!;
    return { welche: x.welche, s: x.s };
  };
  const lippenPunkt = (welche: 0 | 1, s: number, wie: number): number => {
    const L = lippen![welche];
    let k = 0;
    while (k < L.s.length - 2 && L.s[k + 1]! < s) k++;
    const t = (s - L.s[k]!) / (L.s[k + 1]! - L.s[k]! || 1);
    const seite = seiteVon(wie);
    if (t < 1e-6) return kopie(L.punkte[k]!, seite);
    if (t > 1 - 1e-6) return kopie(L.punkte[k + 1]!, seite);
    const a = kopie(L.punkte[k]!, seite);
    const b = kopie(L.punkte[k + 1]!, seite);
    if (a < 0 || b < 0) return -1;
    const schl = `${welche}|${k}|${t.toFixed(9)}|${seite}`;
    let d = extraNr.get(schl);
    if (d === undefined) {
      d = D + extra.length;
      extra.push({ a, b, t, welche, s, seite });
      extraNr.set(schl, d);
    }
    return d;
  };
  // (Stellen der zwei Lippen, die höchstens einen halben Schritt der Kette auseinander liegen, gelten als dieselbe)
  const nah = daten.lippe ? 0.5 / Math.max(1, daten.lippe.length / 2) : 0;

  // ---- die Haut: in einer offenen Lage ausdünnen; dann die zwei Lippen gleich teilen ----
  const dreieckeVorher = e.index.length / 3;
  const budgetHaut = Math.max(4, e.budget - dreieckeZaehne);
  let index = e.index;
  let fehler = 0;
  let geteilt: Geteilt | null = null;
  const lippenTeilen = (): Geteilt | null => {
    extra = [];
    extraNr = new Map();
    const g = lippen ? lippenGleichTeilen(index, lippeVon, lippenPunkt, nah) : null;
    if (g) index = g.index;
    return g;
  };
  if (dreieckeVorher > budgetHaut) {
    // Die Lage zum Ausdünnen: die Pose mit dem engsten Maul, das noch sicher offen steht (20°). Das Feld der Kiefer läuft bei
    // kleinem Winkel schmaler aus, die Haut knickt dort auf kürzerem Weg: Wer in dieser Lage ausdünnt, behält dort die Punkte.
    const weite = (p: { wer: { kiefer: number; schaedel: number } }): number => p.wer.kiefer + p.wer.schaedel;
    const offen: SpielLageDaten | null = daten.posen.filter((p) => weite(p) >= 20).sort((x, y) => weite(x) - weite(y))[0] ?? daten.offen;
    const lagen = verteilt(offen ? lageGezeigt(offen) : daten.grund);
    const positionen = Float32Array.from(lagen);
    const normalen = e.normalen(lagen);
    // Merkmale für den Ausdünner: der Drehwinkel je Punkt in dieser Lage, und der in der Pose mit dem weitesten Maul. Das Feld der
    // Kiefer läuft je nach Winkel verschieden breit aus: Ein Dreieck, das in der einen Pose glatt über den Auslauf geht, knickt in
    // der anderen (gemessen: 7,8 Einheiten am Hals in „Fressen“, wenn nur die weiteste Pose zählt).
    const knochen = new Float32Array(2 * D);
    const feldAls = (theta: ArrayLike<number>, platz: 0 | 1): void => {
      let weit = 0;
      for (let v = 0; v < theta.length; v++) weit = Math.max(weit, Math.abs(theta[v]!));
      if (weit > 0) for (let d = 0; d < D; d++) knochen[2 * d + platz] = theta[e.quelle[d]!]! / weit;
    };
    if (offen) feldAls(offen.theta, 0);
    const weitest = daten.posen.filter((p) => p.theta !== offen?.theta && weite(p) > 0).sort((x, y) => weite(y) - weite(x))[0];
    if (weitest) feldAls(weitest.theta, 1);
    // (das Angleichen der Lippen kostet Dreiecke: Reicht das Budget danach nicht, wird mit weniger noch einmal ausgedünnt)
    let ziel = budgetHaut - (lippen ? 96 : 0);
    for (let versuch = 0; versuch < 4; versuch++) {
      const r = ausduennen({ positionen, normalen, indizes: e.index, knochen }, null, Math.max(4, ziel));
      index = r.indizes;
      fehler = r.fehler;
      geteilt = lippenTeilen();
      if (index.length / 3 <= budgetHaut) break;
      ziel -= index.length / 3 - budgetHaut + 8;
    }
  } else geteilt = lippenTeilen();
  const paare = geteilt?.paare ?? [];
  const eingesetzt = geteilt?.eingesetzt ?? 0;

  // ---- die Punkte, die bleiben, neu gezählt ----
  const neu = new Map<number, number>();
  const von: number[] = [];
  const hautIndex = new Uint32Array(index.length);
  for (let i = 0; i < index.length; i++) {
    const d = index[i]!;
    let k = neu.get(d);
    if (k === undefined) {
      k = von.length;
      neu.set(d, k);
      von.push(d);
    }
    hautIndex[i] = k;
  }
  // Der Mundwinkel muss ein Punkt des Spielnetzes sein: Um ihn wird gedreht. Hat der Ausdünner ihn nicht behalten, steht er als
  // Punkt ohne Dreieck dabei.
  let scharnier = -1;
  if (daten.scharnier >= 0) {
    scharnier = von.findIndex((d) => d < D && e.quelle[d] === daten.scharnier);
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
  const vonZahn = new Int32Array(2 * zahnPunkte);
  const jeZahn = zaehne ? zaehne.grund.netz.pos.length / 3 / zaehne.grund.plaetze.length : 0;
  // je Punkt der Haut: seine zwei gezeigten Punkte und der Anteil des zweiten (ein Punkt der Form: zweimal derselbe, Anteil 0)
  const vonA = Int32Array.from(von, (d) => (d < D ? d : extra[d - D]!.a));
  const vonB = Int32Array.from(von, (d) => (d < D ? d : extra[d - D]!.b));
  const anteil = Float32Array.from(von, (d) => (d < D ? 0 : extra[d - D]!.t));

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
  type Lage = GezeigteLage & { pos: Float32Array; nor: Float32Array; winkel: Float32Array };
  const lageBauen = (name: string, l: SpielLageDaten | null, zl: ZahnLage | null): Lage => {
    const P = verteilt(l ? lageGezeigt(l) : daten.grund);
    const N = e.normalen(P);
    const pos = new Float32Array(3 * n);
    const nor = new Float32Array(3 * n);
    const winkel = new Float32Array(n);
    for (let i = 0; i < nH; i++) {
      const a = vonA[i]!;
      const b = vonB[i]!;
      const t = anteil[i]!;
      for (let c = 0; c < 3; c++) pos[3 * i + c] = (1 - t) * P[3 * a + c]! + t * P[3 * b + c]!;
      const nx = (1 - t) * N[3 * a]! + t * N[3 * b]!;
      const ny = (1 - t) * N[3 * a + 1]! + t * N[3 * b + 1]!;
      const nz = (1 - t) * N[3 * a + 2]! + t * N[3 * b + 2]!;
      const nl = Math.hypot(nx, ny, nz) || 1;
      nor[3 * i] = nx / nl;
      nor[3 * i + 1] = ny / nl;
      nor[3 * i + 2] = nz / nl;
      winkel[i] = l ? (1 - t) * (l.theta[e.quelle[a]!] ?? 0) + t * (l.theta[e.quelle[b]!] ?? 0) : 0;
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
  const lagen = daten.posen.map((p, k) => lageBauen(p.name, p, zaehne ? zaehne.posen[k]! : null));
  // die Grundlage: die Grundform mit den Kiefern bei null (der Haarspalt der Rechnung ist zu); ihre Punkte drehen nicht
  const grund = lageBauen('Grundform', daten.zu, zaehne ? zaehne.grund : null);
  grund.winkel.fill(0);

  // ---- zu ist unsichtbar: Die Paare der zwei Lippen liegen in der Grundlage am selben Ort (dem der einen Lippe) … ----
  let weit = 0;
  for (const p of paare) {
    const a = neu.get(p.a[0]!);
    if (a === undefined) continue;
    for (const d of p.b) {
      const b = neu.get(d);
      if (b === undefined) continue;
      weit = Math.max(weit, Math.hypot(grund.pos[3 * a]! - grund.pos[3 * b]!, grund.pos[3 * a + 1]! - grund.pos[3 * b + 1]!, grund.pos[3 * a + 2]! - grund.pos[3 * b + 2]!));
      for (let c = 0; c < 3; c++) grund.pos[3 * b + c] = grund.pos[3 * a + c]!;
    }
  }
  // … und die Lippen von außen tragen dort dieselbe Normale
  const innenPunkt = (i: number): boolean => anteil[i]! > 0 || innenQuelle(e.quelle[vonA[i]!]!);
  const aussen = new Set<number>();
  if (e.innen) {
    for (let t = 0; t < hautIndex.length; t += 3) {
      const ecken = [hautIndex[t]!, hautIndex[t + 1]!, hautIndex[t + 2]!];
      const tasche = ecken.map(innenPunkt);
      // (ein Dreieck ganz in der Tasche ist eine Wand; die anderen sind Haut von außen: Ihre Ecken an der Lippe zählen)
      if (tasche.every(Boolean)) continue;
      ecken.forEach((i, k) => {
        if (tasche[k]) aussen.add(i);
      });
    }
  }
  const gleich = e.innen ? normalenAngleichen(grund.pos, grund.nor, aussen) : { punkte: 0, grad: 0, weit: 0 };

  const form = spielformAus(grund, alle, nH, hautIndex.length / 3, scharnier, lagen);
  return {
    form,
    vonPunkt: vonA,
    vonPunktB: vonB,
    anteil,
    vonZahn,
    lippe: { punkte: gleich.punkte, grad: gleich.grad, paare: paare.length, eingesetzt, weit, ungleich },
    lippenAussen: Int32Array.from(aussen),
    innen: Uint8Array.from({ length: nH }, (_, i) => (innenPunkt(i) ? 1 : 0)),
    dreiecke: alle.length / 3,
    dreieckeZaehne,
    dreieckeVorher,
    fehler,
    ohneZaehne,
  };
}
