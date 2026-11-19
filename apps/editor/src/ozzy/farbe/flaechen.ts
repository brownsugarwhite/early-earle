/**
 * Ozzy, Paint-Modus, Etappe 1 (19.11.2026): die Farbflächen. Die Farblinien teilen die Haut; eine Füllung ist eine Saat (ein Ort)
 * und eine Farbe und reicht von der Saat bis an die Farblinien (wie ein Feld der Form in `werkFelder.ts`, nur mit Farblinien als
 * Grenzen).
 *
 * Gerechnet wird im Groben. Ein Dreieck, durch das keine Farblinie läuft, gehört ganz zu einer Fläche. Ein Dreieck mit Ketten
 * zerfällt in Zellen; jede Seite jeder Kette gehört zu einer Zelle. Für einen Punkt in so einem Dreieck gilt: Er liegt in der Zelle
 * auf seiner Seite der Kette, die ihm am nächsten ist (die Strecke zum nächsten Punkt aller Ketten kreuzt keine Kette). Genau so
 * entscheidet die Anzeige je Bildpunkt (`anzeige.ts`); darum braucht hier nichts geschnitten zu werden, und die Kante zwischen zwei
 * Farben ist bei jedem Zoom scharf.
 *
 * Voraussetzung (Etappe 1): Ketten kreuzen einander nicht und laufen nie längs einer Kante (`RAND` in `ort.ts` hält sie davon weg).
 */
import type { Karte, Ort } from './ort';
import { type Kette, jeDreieck } from './ketten';

export type Saat = { ort: Ort; farbe: number };

/** eine Kette, wie die Anzeige sie braucht: ihre Punkte und je Seite die Füllung (Nummer der Farbe, −1: keine) */
export type RandKette = { p: number[]; links: number; rechts: number; linie: number; gespiegelt: boolean };
export type Flaechen = {
  /** je Dreieck ohne Kette die Farbe (−1: keine) */
  ganz: Int32Array;
  /** die Dreiecke mit Ketten */
  rand: { t: number; ketten: RandKette[] }[];
};

/** Lage einer Stelle auf dem Rand des Dreiecks: Kante e (Ecke e → e + 1) und Anteil λ; aus den Gewichten (b, c) eines Punkts auf ihr */
function lambdaAuf(e: number, b: number, c: number): number {
  const w = [1 - b - c, b, c];
  return Math.min(1, Math.max(0, w[(e + 1) % 3]!));
}

/**
 * Die nächste Kette zu einem Punkt (in Gewichten b, c) und die Seite, auf der er liegt (0 links, 1 rechts, in Laufrichtung, im Bild
 * der Gewichte: Ecke 1 nach rechts, Ecke 2 nach oben). `d2`: Abstand im Quadrat (im Maß der Gewichte).
 */
export function naechsteSeite(ketten: readonly { p: number[] }[], b: number, c: number): { k: number; seite: 0 | 1; d2: number } {
  let bestK = -1;
  let bestD = Infinity;
  let bestQuer = 0;
  let bestSeite: 0 | 1 = 0;
  for (let k = 0; k < ketten.length; k++) {
    const p = ketten[k]!.p;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i]!;
      const ay = p[i + 1]!;
      const ex = p[i + 2]! - ax;
      const ey = p[i + 3]! - ay;
      const px = b - ax;
      const py = c - ay;
      const l2 = ex * ex + ey * ey;
      if (l2 < 1e-24) continue;
      const u = Math.min(1, Math.max(0, (px * ex + py * ey) / l2));
      const dx = px - u * ex;
      const dy = py - u * ey;
      const d2 = dx * dx + dy * dy;
      // quer zur Geraden des Stücks (mit Vorzeichen): An einer Ecke der Kette sind zwei Stücke gleich nah; es gilt das, von dessen
      // Geraden der Punkt weiter weg liegt (das ist die Seite der Ecke)
      const quer = (ex * py - ey * px) / Math.sqrt(l2);
      if (d2 < bestD - 1e-18 || (d2 <= bestD + 1e-18 && Math.abs(quer) > Math.abs(bestQuer))) {
        bestD = d2;
        bestK = k;
        bestQuer = quer;
        bestSeite = quer > 0 ? 0 : 1;
      }
    }
  }
  return { k: bestK, seite: bestSeite, d2: bestD };
}

class Mengen {
  private readonly eltern: Int32Array;
  constructor(n: number) {
    this.eltern = new Int32Array(n);
    for (let i = 0; i < n; i++) this.eltern[i] = i;
  }
  wurzel(i: number): number {
    const E = this.eltern;
    let r = i;
    while (E[r] !== r) r = E[r]!;
    while (E[i] !== r) {
      const n = E[i]!;
      E[i] = r;
      i = n;
    }
    return r;
  }
  vereinen(a: number, b: number): void {
    const x = this.wurzel(a);
    const y = this.wurzel(b);
    if (x !== y) this.eltern[x] = y;
  }
}

type Abschnitt = { von: number; bis: number; knoten: number };

/**
 * Die Farbflächen: welche Dreiecke ganz zu welcher Füllung gehören und, in den Dreiecken mit Ketten, welche Füllung auf welcher Seite
 * jeder Kette liegt. Spätere Saaten überschreiben frühere in derselben Fläche.
 */
export function flaechenRechnen(k: Karte, ketten: readonly Kette[], saaten: readonly Saat[]): Flaechen {
  const T = k.T;
  const kd = jeDreieck(ketten);
  // Knoten: je Dreieck einer (ohne Ketten das Dreieck selbst; mit Ketten der Rest am Rand, den keine Kette berührt), dazu je Kette zwei Seiten
  const ab = new Map<number, number>();
  let zahl = T;
  for (const [t, liste] of kd) {
    ab.set(t, zahl);
    zahl += 2 * liste.length;
  }
  const M = new Mengen(zahl);
  const seite = (t: number, ki: number, s: number): number => ab.get(t)! + 2 * ki + s;
  /** je Dreieck mit Ketten: seine drei Kanten in Abschnitten, jeder mit dem Knoten seiner Zelle */
  const kanten = new Map<number, [Abschnitt[], Abschnitt[], Abschnitt[]]>();
  for (const [t, liste] of kd) {
    type Ereignis = { e: number; lam: number; nach: number; vor: number };
    const er: Ereignis[] = [];
    liste.forEach((c, ki) => {
      const n = c.p.length;
      // (wo die Kette hereinkommt, liegt im Umlauf davor ihre linke Seite und danach ihre rechte; wo sie hinausgeht, umgekehrt)
      if (c.ein >= 0) er.push({ e: c.ein, lam: lambdaAuf(c.ein, c.p[0]!, c.p[1]!), vor: seite(t, ki, 0), nach: seite(t, ki, 1) });
      if (c.aus >= 0) er.push({ e: c.aus, lam: lambdaAuf(c.aus, c.p[n - 2]!, c.p[n - 1]!), vor: seite(t, ki, 1), nach: seite(t, ki, 0) });
      // ein freies Ende: Um die Spitze herum ist es dieselbe Zelle
      if (!c.zu && (c.ein < 0 || c.aus < 0)) M.vereinen(seite(t, ki, 0), seite(t, ki, 1));
    });
    er.sort((x, y) => x.e + x.lam - (y.e + y.lam));
    const drei: [Abschnitt[], Abschnitt[], Abschnitt[]] = [[], [], []];
    if (!er.length) {
      for (let e = 0; e < 3; e++) drei[e]!.push({ von: 0, bis: 1, knoten: t });
    } else {
      // zwischen zwei Ereignissen liegt eine Zelle: die Seite nach dem einen ist die Seite vor dem nächsten
      for (let i = 0; i < er.length; i++) M.vereinen(er[i]!.nach, er[(i + 1) % er.length]!.vor);
      let knoten = er[er.length - 1]!.nach;
      let i = 0;
      for (let e = 0; e < 3; e++) {
        let von = 0;
        while (i < er.length && er[i]!.e === e) {
          drei[e]!.push({ von, bis: er[i]!.lam, knoten });
          von = er[i]!.lam;
          knoten = er[i]!.nach;
          i++;
        }
        drei[e]!.push({ von, bis: 1, knoten });
      }
      // (der Rest-Knoten des Dreiecks bleibt ungenutzt: Jeder Abschnitt des Rands gehört zu einer Seite einer Kette)
    }
    kanten.set(t, drei);
    // geschlossene Züge im Inneren: Ihr Äußeres ist die Zelle, die ein Strahl nach außen als erste trifft
    liste.forEach((c, ki) => {
      if (!c.zu) return;
      const p = c.p;
      let flaeche = 0;
      let bx = -Infinity;
      let by = 0;
      for (let j = 0; j + 3 < p.length; j += 2) {
        flaeche += p[j]! * p[j + 3]! - p[j + 2]! * p[j + 1]!;
        if (p[j]! > bx) {
          bx = p[j]!;
          by = p[j + 1]!;
        }
      }
      // gegen den Uhrzeiger: das Innere liegt links, das Äußere rechts
      const aussen = seite(t, ki, flaeche > 0 ? 1 : 0);
      // der Strahl vom äußersten Punkt in Richtung wachsender b: das nächste Stück einer anderen Kette, sonst die Kante 1
      let bestS = Infinity;
      let bestKnoten = -1;
      liste.forEach((o, oi) => {
        if (oi === ki) return;
        const q = o.p;
        for (let j = 0; j + 3 < q.length; j += 2) {
          const y0 = q[j + 1]! - by;
          const y1 = q[j + 3]! - by;
          if (y0 * y1 > 0 || y0 === y1) continue;
          const u = y0 / (y0 - y1);
          const x = q[j]! + u * (q[j + 2]! - q[j]!);
          const s = x - bx;
          if (s <= 1e-12 || s >= bestS) continue;
          bestS = s;
          // auf welcher Seite des Stücks liegt der Anfang des Strahls (links: 0)
          const ex = q[j + 2]! - q[j]!;
          const ey = q[j + 3]! - q[j + 1]!;
          bestKnoten = seite(t, oi, ex * (by - q[j + 1]!) - ey * (bx - q[j]!) > 0 ? 0 : 1);
        }
      });
      if (bestKnoten < 0) {
        const lam = Math.min(1, Math.max(0, by));
        const a = drei[1]!.find((x) => lam >= x.von && lam <= x.bis) ?? drei[1]![0]!;
        bestKnoten = a.knoten;
      }
      M.vereinen(aussen, bestKnoten);
    });
  }
  // über die Kanten: Nachbarn gehören zusammen, wo ihre Abschnitte aufeinanderliegen
  const N = k.nachbar;
  for (let t = 0; t < T; t++) {
    const eigen = kanten.get(t);
    for (let e = 0; e < 3; e++) {
      const g = N[3 * t + e]!;
      if (g < 0) continue;
      const u = Math.floor(g / 3);
      if (u < t) continue;
      const fremd = kanten.get(u);
      if (!eigen && !fremd) {
        M.vereinen(t, u);
        continue;
      }
      const A: Abschnitt[] = eigen ? eigen[e]! : [{ von: 0, bis: 1, knoten: t }];
      // die Kante des Nachbarn läuft andersherum
      const B: Abschnitt[] = fremd ? fremd[g % 3]!.map((x) => ({ von: 1 - x.bis, bis: 1 - x.von, knoten: x.knoten })) : [{ von: 0, bis: 1, knoten: u }];
      for (const a of A) for (const b of B) if (Math.min(a.bis, b.bis) - Math.max(a.von, b.von) > 1e-7) M.vereinen(a.knoten, b.knoten);
    }
  }
  // die Saaten färben ihre Fläche
  const farbe = new Map<number, number>();
  for (const s of saaten) {
    const t = s.ort.t;
    const liste = kd.get(t);
    let knoten = t;
    if (liste) {
      const r = naechsteSeite(liste, s.ort.w[1], s.ort.w[2]);
      if (r.k < 0) continue;
      knoten = seite(t, r.k, r.seite);
    }
    farbe.set(M.wurzel(knoten), s.farbe);
  }
  const ganz = new Int32Array(T).fill(-1);
  if (farbe.size) for (let t = 0; t < T; t++) if (!kd.has(t)) ganz[t] = farbe.get(M.wurzel(t)) ?? -1;
  const rand: Flaechen['rand'] = [];
  for (const [t, liste] of kd)
    rand.push({
      t,
      ketten: liste.map((c, ki) => ({
        p: c.p,
        links: farbe.get(M.wurzel(seite(t, ki, 0))) ?? -1,
        rechts: farbe.get(M.wurzel(seite(t, ki, 1))) ?? -1,
        linie: c.linie,
        gespiegelt: c.gespiegelt,
      })),
    });
  return { ganz, rand };
}
