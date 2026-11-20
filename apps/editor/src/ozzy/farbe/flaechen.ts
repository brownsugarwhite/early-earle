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
 * Ketten laufen nie längs einer Kante (`RAND` in `ort.ts` hält sie davon weg). Wo zwei sich im Inneren eines Dreiecks kreuzen,
 * sind sie dort geteilt (`kreuzungenTeilen` in `ketten.ts`): Um die Kreuzung liegen so viele Zellen, wie Ketten an ihr hängen, je
 * eine zwischen zwei Nachbarn im Umlauf (Etappe 2). Kreuzen sich zwei genau auf einer Kante des Netzes (eine Farblinie und ihr
 * Spiegelbild auf der Mitte), wird nicht geteilt: Dort ordnet der Umlauf am Rand des Dreiecks die zwei nach ihrer Richtung.
 */
import type { Karte, Ort } from './ort';
import { type Kette, jeDreieck } from './ketten';

export type Saat = { ort: Ort; farbe: number };

/**
 * Eine Kette, wie die Anzeige sie braucht: ihre Punkte und je Seite die Füllung (Nummer der Farbe, −1: keine). `zl`, `zr` (Etappe 3):
 * die Zelle ihres Dreiecks links und rechts von ihr (Nummern, die nur innerhalb des Dreiecks etwas sagen: gleiche Nummer = dieselbe
 * Zelle, ohne eine Kette dazwischen). Etappe 4: `w` je Punkt die Breite des Verlaufs (fehlt: hart); `ein`, `aus`: ob sie am Rand des
 * Dreiecks beginnt und endet (dort geht sie im Nachbarn weiter) oder im Inneren (−1).
 */
export type RandKette = { p: number[]; links: number; rechts: number; linie: number; gespiegelt: boolean; zl: number; zr: number; w?: number[]; ein: number; aus: number };
export type Flaechen = {
  /** je Dreieck ohne Kette die Farbe (−1: keine) */
  ganz: Int32Array;
  /** die Dreiecke mit Ketten; `ecken`, `eckFarben` (Etappe 3): die Zelle, in der jede Ecke des Dreiecks liegt, und deren Füllung */
  rand: { t: number; ketten: RandKette[]; ecken: [number, number, number]; eckFarben: [number, number, number] }[];
};

/** Lage einer Stelle auf dem Rand des Dreiecks: Kante e (Ecke e → e + 1) und Anteil λ; aus den Gewichten (b, c) eines Punkts auf ihr */
function lambdaAuf(e: number, b: number, c: number): number {
  const w = [1 - b - c, b, c];
  return Math.min(1, Math.max(0, w[(e + 1) % 3]!));
}

/**
 * Der Winkel, unter dem eine Kette vom Rand des Dreiecks ins Innere läuft, gegen die Richtung des Umlaufs auf der Kante e gemessen
 * (0 … π). `vorn`: Sie beginnt dort (sonst endet sie dort: gemessen wird vom Rand weg).
 */
function winkelAmRand(e: number, p: readonly number[], vorn: boolean): number {
  const dx = e === 0 ? 1 : e === 1 ? -1 : 0;
  const dy = e === 0 ? 0 : e === 1 ? 1 : -1;
  const n = p.length;
  // (das erste Stück mit Länge)
  for (let i = 2; i + 1 < n; i += 2) {
    const vx = vorn ? p[i]! - p[0]! : p[n - 2 - i]! - p[n - 2]!;
    const vy = vorn ? p[i + 1]! - p[1]! : p[n - 1 - i]! - p[n - 1]!;
    if (vx * vx + vy * vy < 1e-24) continue;
    return Math.atan2(dx * vy - dy * vx, dx * vx + dy * vy);
  }
  return Math.PI / 2;
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
  *
 * `gebiet` (Maul, Etappe 4): je Dreieck eine Marke. Eine Füllung überschreitet nie die Kante zwischen zwei Dreiecken mit
 * verschiedener Marke: So bleibt, was in der Tasche eines Mauls gefüllt ist, in der Tasche; ihre Grenze ist die Lippe selbst.
 */
export function flaechenRechnen(k: Karte, ketten: readonly Kette[], saaten: readonly Saat[], gebiet?: ArrayLike<number> | null): Flaechen {
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
  // (Etappe 3) dieselben Knoten, aber nur innerhalb jedes Dreiecks verbunden: die Zellen eines Dreiecks
  const Lok = new Mengen(zahl);
  const beide = (a: number, b: number): void => {
    M.vereinen(a, b);
    Lok.vereinen(a, b);
  };
  const seite = (t: number, ki: number, s: number): number => ab.get(t)! + 2 * ki + s;
  /** je Dreieck mit Ketten: seine drei Kanten in Abschnitten, jeder mit dem Knoten seiner Zelle */
  const kanten = new Map<number, [Abschnitt[], Abschnitt[], Abschnitt[]]>();
  for (const [t, liste] of kd) {
    type Ereignis = { e: number; lam: number; nach: number; vor: number; w: number };
    const er: Ereignis[] = [];
    liste.forEach((c, ki) => {
      const n = c.p.length;
      // (wo die Kette hereinkommt, liegt im Umlauf davor ihre linke Seite und danach ihre rechte; wo sie hinausgeht, umgekehrt)
      if (c.ein >= 0) er.push({ e: c.ein, lam: lambdaAuf(c.ein, c.p[0]!, c.p[1]!), vor: seite(t, ki, 0), nach: seite(t, ki, 1), w: winkelAmRand(c.ein, c.p, true) });
      if (c.aus >= 0) er.push({ e: c.aus, lam: lambdaAuf(c.aus, c.p[n - 2]!, c.p[n - 1]!), vor: seite(t, ki, 1), nach: seite(t, ki, 0), w: winkelAmRand(c.aus, c.p, false) });
      // ein freies Ende (nicht an einer Kreuzung): Um die Spitze herum ist es dieselbe Zelle
      if (!c.zu && ((c.ein < 0 && c.kEin === undefined) || (c.aus < 0 && c.kAus === undefined))) beide(seite(t, ki, 0), seite(t, ki, 1));
    });
    // Kreuzungen: Die Ketten, die an einer hängen, im Umlauf geordnet; zwischen zwei Nachbarn liegt eine Zelle
    const anKreuzung = new Map<number, { w: number; ccw: number; cw: number }[]>();
    liste.forEach((c, ki) => {
      const n = c.p.length;
      const dazu = (knoten: number, dx: number, dy: number, beginnt: boolean): void => {
        // (von der Kreuzung weg gesehen: Beginnt die Kette hier, liegt gegen den Uhrzeiger ihre linke Seite, sonst ihre rechte)
        const e = { w: Math.atan2(dy, dx), ccw: seite(t, ki, beginnt ? 0 : 1), cw: seite(t, ki, beginnt ? 1 : 0) };
        const l = anKreuzung.get(knoten);
        if (l) l.push(e);
        else anKreuzung.set(knoten, [e]);
      };
      if (c.kEin !== undefined && n >= 4) dazu(c.kEin, c.p[2]! - c.p[0]!, c.p[3]! - c.p[1]!, true);
      if (c.kAus !== undefined && n >= 4) dazu(c.kAus, c.p[n - 4]! - c.p[n - 2]!, c.p[n - 3]! - c.p[n - 1]!, false);
    });
    for (const arme of anKreuzung.values()) {
      arme.sort((x, y) => x.w - y.w);
      for (let i = 0; i < arme.length; i++) beide(arme[i]!.ccw, arme[(i + 1) % arme.length]!.cw);
    }
    er.sort((x, y) => x.e + x.lam - (y.e + y.lam));
    // Treffen sich zwei Ketten an derselben Stelle des Rands (eine Farblinie und ihr Spiegelbild auf der Mitte: Sie kreuzen sich genau
    // auf einer Kante des Netzes), entscheidet ihre Richtung: Im Umlauf kommt zuerst die, die weiter zurück zeigt. Zwischen den
    // zweien liegt der Keil; ohne diese Ordnung hinge die Zelle vor der Stelle an der Zelle dahinter.
    for (let i = 0; i < er.length; ) {
      let j = i + 1;
      while (j < er.length && er[j]!.e === er[i]!.e && er[j]!.lam - er[j - 1]!.lam < 1e-9) j++;
      if (j - i > 1) {
        const teil = er.slice(i, j).sort((x, y) => y.w - x.w);
        for (let q = 0; q < teil.length; q++) er[i + q] = teil[q]!;
      }
      i = j;
    }
    const drei: [Abschnitt[], Abschnitt[], Abschnitt[]] = [[], [], []];
    if (!er.length) {
      for (let e = 0; e < 3; e++) drei[e]!.push({ von: 0, bis: 1, knoten: t });
    } else {
      // zwischen zwei Ereignissen liegt eine Zelle: die Seite nach dem einen ist die Seite vor dem nächsten
      for (let i = 0; i < er.length; i++) beide(er[i]!.nach, er[(i + 1) % er.length]!.vor);
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
      beide(aussen, bestKnoten);
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
      // (ein Gebiet, etwa die Tasche eines Mauls: Über seinen Rand hinweg gehört nichts zusammen)
      if (gebiet && gebiet[t] !== gebiet[u]) continue;
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
  for (const [t, liste] of kd) {
    // (die Ecke e liegt am Anfang der Kante e: in der Zelle ihres ersten Abschnitts)
    const drei = kanten.get(t)!;
    const eck = [drei[0][0]!.knoten, drei[1][0]!.knoten, drei[2][0]!.knoten] as const;
    rand.push({
      t,
      ketten: liste.map((c, ki) => ({
        p: c.p,
        links: farbe.get(M.wurzel(seite(t, ki, 0))) ?? -1,
        rechts: farbe.get(M.wurzel(seite(t, ki, 1))) ?? -1,
        linie: c.linie,
        gespiegelt: c.gespiegelt,
        zl: Lok.wurzel(seite(t, ki, 0)),
        zr: Lok.wurzel(seite(t, ki, 1)),
        ein: c.ein,
        aus: c.aus,
        ...(c.w ? { w: c.w } : {}),
      })),
      ecken: [Lok.wurzel(eck[0]), Lok.wurzel(eck[1]), Lok.wurzel(eck[2])],
      eckFarben: [farbe.get(M.wurzel(eck[0])) ?? -1, farbe.get(M.wurzel(eck[1])) ?? -1, farbe.get(M.wurzel(eck[2])) ?? -1],
    });
  }
  return { ganz, rand };
}
