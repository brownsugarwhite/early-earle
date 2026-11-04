// P2 „Stücknetz im Maulfeld“, Tag 2–3 (04.11.2026): Ganzzahlen je Seite und Muster je Stück. Aus den Stücken (`stuecke.ts`)
// werden kanonische Seiten (eine Seite, die zwei Stücke trennt, ist eine; die beiden Schlitzufer sind dieselbe Seite — die
// Lippe ist im geschlossenen Maul eine scharfe Falte mit gemeinsamen Punkten), je Seite eine Kantenzahl (Feldrand fest: eine
// Kante je Käfigkante außen; sonst frei, nach der Dichte h), und je Stück ein Muster aus Vierecken, das die Kantenzahlen seiner
// Seiten trägt. Muster (Takayama 2014, auf das Nötige verkleinert): Dreieck und Fünfeck mit einem Pol in der Mitte (Speichen
// zu den Seiten, die Sektoren sind Gitter; Seite i = r_{i−1} + r_{i+1}), Viereck als Gitter (gegenüberliegende Seiten gleich).
// Alles andere wird einmal geteilt, von Seite zu Seite (nie von Ecke zu Ecke — eine Ecke, durch die eine Teilung läuft, bekäme
// zwei Flächen und würde zum Pol): Zweieck → zwei Dreiecke, Sechseck → zwei Fünfecke, Viereck mit ungleichen Gegenseiten →
// Dreieck + Fünfeck (das Dreier-Fünfer-Paar). Die Zahlen je Seite sucht ein kleiner Abstieg: Start an der Dichte, dann ±1 an
// freien Seiten, bis jedes Stück ein Muster hat (Parität, Dreiecksungleichung, Speichen ≥ 1). Die Ecken der Muster sind die Ecken
// der Stücke; Pole liegen nur in der Mitte eines Dreiecks oder Fünfecks, nie auf einer Linie. Keine Regel nennt einen Körper
// oder eine Lage. DOM-frei.
import type { LinienArt, Seite, StueckeFund } from './stuecke';

/** kanonische Seite: Punkte in kanonischer Richtung (Nummern des aufgeschnittenen Netzes), Art je Kante, feste Kantenzahl am Feldrand */
export type Kante = {
  id: string;
  punkte: number[];
  arten: LinienArt[];
  laenge: number;
  /** Käfigpunkte auf einer Feldrandseite in kanonischer Richtung, ohne den Anfang (Kantenzahl = ihre Zahl); null sonst */
  feldPunkte: number[] | null;
  /** Stücke, die die Seite benutzen (0, 1 oder 2) */
  nutzer: number[];
  /** Schlüssel des Anfangs- und Endpunkts (Ecke) */
  anfang: string;
  ende: string;
};

/** Seite eines Polygons: ein oder mehrere kanonische Stücke hintereinander (gleiche Linie, z. B. Lippe → Verlängerung über den
 * Mundwinkel, oder die Lippe an einem Knoten des anderen Ufers geteilt), je mit Richtung im Umlauf */
export type SeitenBezug = { teile: { kante: string; vorwaerts: boolean }[] };

export type Polygon = { id: string; stueck: number; seiten: SeitenBezug[] };

export type Muster = {
  /** Flächen (vier Punktschlüssel, Umlauf wie das Stück: gegen den Uhrzeigersinn von außen) je Polygon */
  flaechen: string[][];
  stueckVon: number[];
  /** Pole des Musters (Punktschlüssel mit Valenz 3 oder 5) */
  pole: { schluessel: string; valenz: number }[];
};

export type GanzzahlenErgebnis = {
  anzahl: Map<string, number>;
  /** Polygone, für die kein Muster gefunden wurde (Seitenzahlen) */
  offen: { polygon: string; seiten: number[] }[];
  schritte: number;
  /** Zielwert Σ((n − Ziel)/Ziel)² über die freien Seiten */
  abweichung: number;
};

/**
 * Kanonische Seiten und Polygone aus den Stücken. `orig` bildet Doppelpunkte auf ihre Ursprünge ab, `eckenSchluessel` gibt
 * je Eckpunkt den Punktschlüssel (Feldrand-Ecken sind alte Käfigpunkte), `istKaefig(p)` sagt, ob p ein Käfigpunkt des
 * Feldrands ist; `weitereKnoten` teilen Seiten zusätzlich (feine Punkte, z. B. Spitzen von A0 auf der Naht).
 */
export function seitenRegister(fund: StueckeFund, orig: (p: number) => number, eckenSchluessel: (p: number, seiteDavor: Seite | null, seiteDanach: Seite) => string, istKaefig: (p: number) => boolean, weitereKnoten: Iterable<number> = []): { kanten: Map<string, Kante>; polygone: Polygon[] } {
  const kanten = new Map<string, Kante>();
  const polygone: Polygon[] = [];
  // Knoten: Ecken aller Stücke (als Ursprung) — eine Seite wird dort geteilt, auch wenn der Knoten nur auf dem anderen Ufer liegt
  const knoten = new Set<number>();
  for (const st of fund.stuecke) for (const e of st.ecken) knoten.add(orig(st.punkte[e]!));
  // weitere Knoten (Stücknetz: Spitzen von A0 auf der Naht — dort bekommt die Seite eine Station genau auf der Spitze)
  for (const p of weitereKnoten) knoten.add(orig(p));
  fund.stuecke.forEach((st, sI) => {
    const seiten: SeitenBezug[] = [];
    st.seiten.forEach((se, q) => {
      const davor = st.seiten[(q - 1 + st.seiten.length) % st.seiten.length]!;
      const danach = st.seiten[(q + 1) % st.seiten.length]!;
      // Teilstellen: Linienwechsel und Knoten im Innern der Seite
      const stellen = [0];
      for (let i = 1; i + 1 < se.punkte.length; i++) if (se.arten[i - 1] !== se.arten[i] || knoten.has(orig(se.punkte[i]!))) stellen.push(i);
      stellen.push(se.punkte.length - 1);
      const teile: { kante: string; vorwaerts: boolean }[] = [];
      for (let s = 0; s + 1 < stellen.length; s++) {
        const i0 = stellen[s]!;
        const i1 = stellen[s + 1]!;
        const punkte = se.punkte.slice(i0, i1 + 1);
        const arten = se.arten.slice(i0, i1);
        const origs = punkte.map(orig);
        const a = origs[0]!;
        const b = origs[origs.length - 1]!;
        const sortiert = [...origs].sort((x, y) => x - y);
        let hash = 0;
        for (const o of sortiert) hash = (hash * 31 + o + 1) % 2147483647;
        const id = `${Math.min(a, b)}:${Math.max(a, b)}:${origs.length}:${hash}`;
        let k = kanten.get(id);
        if (!k) {
          const feld = arten.every((x) => x === 'feldrand');
          const feldPunkte = feld ? punkte.slice(1).filter((pp) => istKaefig(pp)) : null;
          let laenge = 0;
          for (let i = 0; i + 1 < punkte.length; i++) laenge += dist(fund, punkte[i]!, punkte[i + 1]!);
          k = {
            id,
            punkte,
            arten,
            laenge,
            feldPunkte,
            nutzer: [sI],
            anfang: eckenSchluessel(punkte[0]!, i0 === 0 ? davor : se, se),
            ende: eckenSchluessel(punkte[punkte.length - 1]!, se, i1 === se.punkte.length - 1 ? danach : se),
          };
          kanten.set(id, k);
          teile.push({ kante: id, vorwaerts: true });
        } else {
          k.nutzer.push(sI);
          const vorwaerts = orig(k.punkte[0]!) === a && orig(k.punkte[k.punkte.length - 1]!) === b && (origs.length < 3 || orig(k.punkte[1]!) === origs[1]);
          teile.push({ kante: id, vorwaerts });
        }
      }
      seiten.push({ teile });
    });
    polygone.push({ id: `S${sI}`, stueck: sI, seiten });
  });
  return { kanten, polygone };
}

/** Abstand zweier Punkte des aufgeschnittenen Netzes (Schnittpunkte ab nBasis) über die Lagen des Funds */
function dist(fund: StueckeFund, a: number, b: number): number {
  const pa = fund.lage(a);
  const pb = fund.lage(b);
  return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]);
}

const anzahlFest = (k: Kante): number | null => (k.feldPunkte ? k.feldPunkte.length : null);

// ---- Muster-Rechnung (rein kombinatorisch) ----

/** Speichen r_j eines Polygons mit ungerader Seitenzahl und Pol in der Mitte: s_i = r_{i−1} + r_{i+1}; null, wenn nicht ganzzahlig ≥ rMin */
export function speichen(s: readonly number[], rMin = 1): number[] | null {
  const N = s.length;
  if (N % 2 === 0 || N < 3) return null;
  const summe = s.reduce((a, b) => a + b, 0);
  if (summe % 2 !== 0) return null;
  // r_1 = ½ Σ_t (−1)^t s_{2+2t}  (Indizes 1-basiert, zyklisch)
  let r1 = 0;
  for (let t = 0; t < N; t++) r1 += (t % 2 === 0 ? 1 : -1) * s[(1 + 2 * t) % N]!;
  r1 /= 2;
  const r = new Array<number>(N).fill(0);
  r[0] = r1;
  // r_{i+1} = s_i − r_{i−1}: ab r[0] über die Schrittfolge i = 1, 3, 5, … (ungerades N besucht so alle Indizes)
  for (let t = 0, i = 1; t < N; t++, i = (i + 2) % N) r[(i + 1) % N] = s[i]! - r[(i - 1 + N) % N]!;
  for (let i = 0; i < N; i++) if (!(Number.isInteger(r[i]!) && r[i]! >= rMin && s[i] === r[(i - 1 + N) % N]! + r[(i + 1) % N]!)) return null;
  return r;
}

/** Teilung eines Polygons von Seite i (a Kanten ab ihrem Anfang) zu Seite j (b Kanten ab ihrem Anfang) mit d Kanten */
export type Teilung = { i: number; a: number; j: number; b: number; d: number };

/**
 * Seitenzahlen der zwei Teilpolygone einer Teilung (Seiten des Polygons s, Ecken V_k vor Seite k): A läuft von V_i über M (auf i) und
 * M' (auf j) zurück nach V_i, B von M über V_{i+1} … V_j nach M'. Jedes Teilpolygon als Liste von Seitenzahlen und Herkunft
 * (Seite k vorwärts mit Bereich, oder die Teilung).
 */
export function teilen(s: readonly number[], t: Teilung): { A: TeilSeite[]; B: TeilSeite[] } {
  const N = s.length;
  const A: TeilSeite[] = [{ seite: t.i, von: 0, bis: t.a }, { teilung: true, von: 0, bis: t.d }, { seite: t.j, von: t.b, bis: s[t.j]! }];
  for (let k = (t.j + 1) % N; k !== t.i; k = (k + 1) % N) A.push({ seite: k, von: 0, bis: s[k]! });
  const B: TeilSeite[] = [{ seite: t.i, von: t.a, bis: s[t.i]! }];
  for (let k = (t.i + 1) % N; k !== t.j; k = (k + 1) % N) B.push({ seite: k, von: 0, bis: s[k]! });
  B.push({ seite: t.j, von: 0, bis: t.b }, { teilung: true, von: t.d, bis: 0 });
  return { A, B };
}
export type TeilSeite = { seite?: number; teilung?: true; von: number; bis: number };
const zahlen = (teil: TeilSeite[]) => teil.map((x) => Math.abs(x.bis - x.von)).filter((n) => n > 0);

/** Muster eines Polygons: Pol in der Mitte, Gitter, oder eine Teilung in zwei Polygone mit Mustern; null ohne Lösung */
export type MusterWahl = { art: 'pol'; r: number[] } | { art: 'gitter' } | { art: 'teilung'; t: Teilung; A: MusterWahl; B: MusterWahl };

const merk = new Map<string, MusterWahl | null>();
/**
 * Muster eines Polygons. `rMin` = kleinste Speichenlänge eines Pols (Standard 2: ein Pol liegt nie in der ersten Reihe neben einer
 * Linie — mit 1 lag der Dreierpol des Robben-Keils eine Zelle neben der Lippe und der Löser klappte die Zelle um); mit 1 nur als
 * Rückfall, wenn sonst nichts geht (`musterWahlNotfalls`).
 */
export function musterWahl(s: readonly number[], tiefe = 0, rMin = 2): MusterWahl | null {
  const key = `${s.join(',')}|${tiefe}|${rMin}`;
  const gemerkt = merk.get(key);
  if (gemerkt !== undefined) return gemerkt;
  const erg = musterWahlRoh(s, tiefe, rMin);
  merk.set(key, erg);
  return erg;
}
function musterWahlRoh(s: readonly number[], tiefe: number, rMin: number): MusterWahl | null {
  const N = s.length;
  if (s.some((n) => n < 1)) return null;
  if (N === 3 || N === 5) {
    const r = speichen(s, rMin);
    return r ? { art: 'pol', r } : null;
  }
  if (N === 4 && s[0] === s[2] && s[1] === s[3]) return { art: 'gitter' };
  if (tiefe >= 1) return null;
  // Teilungen: Zweieck → Dreiecke (Seite 0 → 1), Viereck → Dreieck + Fünfeck (benachbarte Seiten), Sechseck → Fünfecke (Gegenseiten)
  const paare: [number, number][] = N === 2 ? [[0, 1]] : N === 4 ? [[0, 1], [1, 2], [2, 3], [3, 0]] : N === 6 ? [[0, 3], [1, 4], [2, 5]] : [];
  let beste: { wahl: MusterWahl; kosten: number } | null = null;
  const dMax = Math.max(...s) + 2;
  for (const [i, j] of paare)
    for (let a = 1; a < s[i]!; a++)
      for (let b = 1; b < s[j]!; b++)
        for (let d = 1; d <= dMax; d++) {
          const t: Teilung = { i, a, j, b, d };
          const { A, B } = teilen(s, t);
          const zA = zahlen(A);
          const zB = zahlen(B);
          if (zA.length < 3 || zB.length < 3) continue;
          const mA = musterWahl(zA, tiefe + 1, rMin);
          if (!mA) continue;
          const mB = musterWahl(zB, tiefe + 1, rMin);
          if (!mB) continue;
          // Kosten: Teilung möglichst mittig auf beiden Seiten (Zweieck, Sechseck) bzw. das Dreieck klein in der Ecke (Viereck),
          // d nahe am Mittel der Nachbarseiten
          const dSoll = N === 4 ? Math.max(1, Math.round(Math.min(s[i]! - a, b) * 1.0)) : Math.round((s.reduce((x, y) => x + y, 0) - s[i]! - s[j]!) / Math.max(1, N - 2));
          const kosten = N === 4 ? (s[i]! - a) + b + Math.abs(d - dSoll) : Math.abs(a - s[i]! / 2) + Math.abs(b - s[j]! / 2) + Math.abs(d - dSoll);
          if (!beste || kosten < beste.kosten) beste = { wahl: { art: 'teilung', t, A: mA, B: mB }, kosten };
        }
  return beste?.wahl ?? null;
}

/** Zahl der Flächen eines Musters */
export function musterFlaechen(s: readonly number[], w: MusterWahl): number {
  if (w.art === 'gitter') return s[0]! * s[1]!;
  if (w.art === 'pol') {
    const N = s.length;
    let f = 0;
    for (let i = 0; i < N; i++) f += w.r[(i + 1) % N]! * w.r[i]!;
    return f;
  }
  const { A, B } = teilen(s, w.t);
  return musterFlaechen(zahlen(A), w.A) + musterFlaechen(zahlen(B), w.B);
}

/**
 * Kantenzahlen je kanonischer Seite: Feldrand fest, freie Seiten nach der Dichte h (Länge / h, mindestens `mindest` bzw. die
 * Untergrenze der Seite in `mindestJeKante`). Dann je
 * Polygon die notwendigen Bedingungen jedes Vierecksnetzes: keine Seite so lang wie alle anderen zusammen (sonst wachsen die
 * freien Seiten des Polygons im Verhältnis ihrer Längen, bis zwei Kanten Luft sind) und gerade Summe (sonst eine Kante mehr auf
 * der längsten freien Seite); zuletzt, wo die Muster trotzdem nicht reichen, ein kleiner Abstieg mit ±1/±2 an den freien
 * Seiten des Polygons (nur die betroffenen Polygone werden neu geprüft).
 */
export function anzahlenWaehlen(kanten: Map<string, Kante>, polygone: Polygon[], h: number, mindest = 1, maxSchritte = 60, mindestJeKante?: ReadonlyMap<string, number>): GanzzahlenErgebnis {
  const untergrenze = (id: string) => Math.max(mindest, mindestJeKante?.get(id) ?? 0);
  const anzahl = new Map<string, number>();
  const ziel = new Map<string, number>();
  for (const k of kanten.values()) {
    const fest = anzahlFest(k);
    if (fest !== null) anzahl.set(k.id, fest);
    else {
      const z = Math.max(untergrenze(k.id), Math.round(k.laenge / h));
      ziel.set(k.id, z);
      anzahl.set(k.id, z);
    }
  }
  const zahlenVon = (p: Polygon) => p.seiten.map((b) => b.teile.reduce((s, x) => s + anzahl.get(x.kante)!, 0));
  const freieTeile = (p: Polygon) => p.seiten.flatMap((b) => b.teile.filter((x) => ziel.has(x.kante)));
  const polygoneAn = new Map<string, Polygon[]>();
  for (const p of polygone) for (const b of p.seiten) for (const x of b.teile) (polygoneAn.get(x.kante) ?? polygoneAn.set(x.kante, []).get(x.kante)!).push(p);
  const abweichung = () => {
    let s = 0;
    for (const [id, z] of ziel) s += ((anzahl.get(id)! - z) / Math.max(1, z)) ** 2;
    return s;
  };
  let schritte = 0;
  // Polygonungleichung: jede Seite < Summe der übrigen (mit zwei Kanten Luft)
  for (let runde = 0; runde < 4; runde++) {
    let geaendert = false;
    for (const p of polygone) {
      const s = zahlenVon(p);
      const summe = s.reduce((a, b) => a + b, 0);
      const max = Math.max(...s);
      const fehl = max - (summe - max) + 2;
      if (fehl <= 0) continue;
      const frei = freieTeile(p).filter((x) => {
        // nur Teile auf anderen Seiten als der längsten
        const seite = p.seiten.find((b) => b.teile.includes(x))!;
        return seite.teile.reduce((q, y) => q + anzahl.get(y.kante)!, 0) !== max;
      });
      if (!frei.length) continue;
      const laengen = frei.map((x) => kanten.get(x.kante)!.laenge);
      const L = laengen.reduce((a, b) => a + b, 0) || 1;
      let verteilt = 0;
      frei.forEach((x, i) => {
        const anteil = Math.ceil((fehl * laengen[i]!) / L);
        anzahl.set(x.kante, anzahl.get(x.kante)! + anteil);
        verteilt += anteil;
      });
      void verteilt;
      geaendert = true;
      schritte++;
    }
    if (!geaendert) break;
  }
  // Parität je Polygon: eine Kante mehr auf der längsten freien Seite (gemeinsame Seiten ändern das Nachbarpolygon mit — darum
  // wiederholen, bis alle Summen gerade sind oder nichts mehr geht)
  for (let runde = 0; runde < 8; runde++) {
    const ungerade = polygone.filter((p) => zahlenVon(p).reduce((a, b) => a + b, 0) % 2 !== 0);
    if (!ungerade.length) break;
    const p = ungerade[0]!;
    const frei = freieTeile(p);
    if (!frei.length) break;
    // bevorzugt eine Seite, die nur dieses Polygon benutzt (sonst wird das Nachbarpolygon ungerade), sonst die längste
    const eigene = frei.filter((x) => (polygoneAn.get(x.kante)?.length ?? 1) === 1);
    const wahl = (eigene.length ? eigene : frei).sort((a, b) => kanten.get(b.kante)!.laenge - kanten.get(a.kante)!.laenge)[0]!;
    anzahl.set(wahl.kante, anzahl.get(wahl.kante)! + 1);
    schritte++;
  }
  // Muster prüfen, sonst Abstieg an den freien Seiten des Polygons (nur betroffene Polygone prüfen)
  const offenJetzt = () => polygone.filter((p) => !musterWahl(zahlenVon(p)));
  let offen = offenJetzt();
  while (offen.length && schritte < maxSchritte) {
    schritte++;
    const p = offen[0]!;
    let bester: { id: string; wert: number; offen: number; abw: number } | null = null;
    const vorher = offen.length;
    for (const teil of freieTeile(p)) {
      const alt = anzahl.get(teil.kante)!;
      const betroffen = polygoneAn.get(teil.kante)!;
      for (const delta of [1, -1, 2, -2, 3, -3]) {
        const neu = alt + delta;
        if (neu < untergrenze(teil.kante)) continue;
        anzahl.set(teil.kante, neu);
        const o = vorher - betroffen.filter((q) => offen.includes(q)).length + betroffen.filter((q) => !musterWahl(zahlenVon(q))).length;
        const abw = abweichung();
        anzahl.set(teil.kante, alt);
        if (o > vorher) continue;
        if (!bester || o < bester.offen || (o === bester.offen && abw < bester.abw)) bester = { id: teil.kante, wert: neu, offen: o, abw };
      }
    }
    if (!bester || bester.offen >= vorher) break;
    anzahl.set(bester.id, bester.wert);
    offen = offenJetzt();
  }
  return { anzahl, offen: offen.map((p) => ({ polygon: p.id, seiten: zahlenVon(p) })), schritte, abweichung: abweichung() };
}

// ---- Muster als Flächen mit Punktschlüsseln ----

/** Punktschlüssel auf einer kanonischen Seite beim Index i (0 = Anfang, n = Ende) */
export function seitenSchluessel(k: Kante, n: number, i: number): string {
  if (i <= 0) return k.anfang;
  if (i >= n) return k.ende;
  if (k.feldPunkte) return `alt:${k.feldPunkte[i - 1]!}`;
  return `K:${k.id}:${i}`;
}

type Rand = { schluessel: (t: number) => string; n: number };

/** Rand einer Polygonseite aus ihren Teilen: Schritt t (0 … Σ n) → Schlüssel auf dem passenden Teil */
export function randVon(kanten: Map<string, Kante>, anzahl: Map<string, number>, b: SeitenBezug): Rand {
  const teile = b.teile.map((x) => ({ k: kanten.get(x.kante)!, n: anzahl.get(x.kante)!, vorwaerts: x.vorwaerts }));
  const n = teile.reduce((s, x) => s + x.n, 0);
  return {
    n,
    schluessel: (t: number) => {
      let rest = t;
      for (let j = 0; j < teile.length; j++) {
        const x = teile[j]!;
        if (rest <= x.n || j === teile.length - 1) return seitenSchluessel(x.k, x.n, x.vorwaerts ? rest : x.n - rest);
        rest -= x.n;
      }
      return seitenSchluessel(teile[0]!.k, teile[0]!.n, 0);
    },
  };
}

/**
 * Flächen aller Polygone: je Polygon das Muster seiner Seitenzahlen; Teilungen erzeugen innere Seiten (`T:<polygon>:<nr>`).
 * `rand` je Polygonseite: Schlüssel bei Schritt t (0 … n) in Umlaufrichtung.
 */
export function musterBauen(kanten: Map<string, Kante>, polygone: Polygon[], anzahl: Map<string, number>): Muster {
  const flaechen: string[][] = [];
  const stueckVon: number[] = [];
  const pole: { schluessel: string; valenz: number }[] = [];
  let teilungen = 0;
  const bauen = (pid: string, stueck: number, seiten: Rand[], w: MusterWahl) => {
    const N = seiten.length;
    const s = seiten.map((r) => r.n);
    const ecke = (i: number) => seiten[i]!.schluessel(0);
    if (w.art === 'gitter') {
      // Gitter a × b: α längs Seite 0 (V0 → V1), β längs Seite 1 (V1 → V2)
      const a = s[0]!;
      const b = s[1]!;
      const key = (al: number, be: number): string => {
        if (be === 0) return seiten[0]!.schluessel(al);
        if (al === a) return seiten[1]!.schluessel(be);
        if (be === b) return seiten[2]!.schluessel(a - al);
        if (al === 0) return seiten[3]!.schluessel(b - be);
        return `I:${pid}:${al}:${be}`;
      };
      for (let al = 0; al < a; al++) for (let be = 0; be < b; be++) {
        flaechen.push([key(al, be), key(al + 1, be), key(al + 1, be + 1), key(al, be + 1)]);
        stueckVon.push(stueck);
      }
      return;
    }
    if (w.art === 'pol') {
      const r = w.r;
      const C = `I:${pid}:C`;
      pole.push({ schluessel: C, valenz: N });
      // Speiche i von C (t = 0) zu M_i auf Seite i bei q_i = r_{i−1} Kanten ab V_i; Sektor i zwischen Speiche i und i+1 enthält V_{i+1}
      const speiche = (i: number, t: number): string => {
        if (t === 0) return C;
        if (t === r[i]!) return seiten[i]!.schluessel(r[(i - 1 + N) % N]!);
        return `I:${pid}:sp${i}:${t}`;
      };
      for (let i = 0; i < N; i++) {
        const i1 = (i + 1) % N;
        const q = r[(i - 1 + N) % N]!; // M_i bei q auf Seite i
        const p = r[i1]!; // Kanten von M_i bis V_{i+1}
        const q1 = r[i]!; // Kanten von V_{i+1} bis M_{i+1}
        const key = (al: number, be: number): string => {
          if (be === 0) return seiten[i]!.schluessel(q + al);
          if (al === p) return seiten[i1]!.schluessel(be);
          if (al === 0) return speiche(i, q1 - be);
          if (be === q1) return speiche(i1, al);
          return `I:${pid}:${i}:${al}:${be}`;
        };
        for (let al = 0; al < p; al++) for (let be = 0; be < q1; be++) {
          flaechen.push([key(al, be), key(al + 1, be), key(al + 1, be + 1), key(al, be + 1)]);
          stueckVon.push(stueck);
        }
      }
      void ecke;
      return;
    }
    // Teilung: innere Seite mit d Kanten
    const t = w.t;
    const tid = `T:${pid}:${teilungen++}`;
    const { A, B } = teilen(s, t);
    const innen = (i: number): string => (i === 0 ? seiten[t.i]!.schluessel(t.a) : i === t.d ? seiten[t.j]!.schluessel(t.b) : `${tid}:${i}`);
    const rand = (ts: TeilSeite): Rand | null => {
      const n = Math.abs(ts.bis - ts.von);
      if (n === 0) return null;
      const vorwaerts = ts.bis > ts.von;
      if (ts.teilung) return { n, schluessel: (x) => innen(vorwaerts ? ts.von + x : ts.von - x) };
      const r = seiten[ts.seite!]!;
      return { n, schluessel: (x) => r.schluessel(vorwaerts ? ts.von + x : ts.von - x) };
    };
    const rA = A.map(rand).filter((x): x is Rand => x !== null);
    const rB = B.map(rand).filter((x): x is Rand => x !== null);
    bauen(`${pid}a`, stueck, rA, w.A);
    bauen(`${pid}b`, stueck, rB, w.B);
  };
  for (const p of polygone) {
    const seiten: Rand[] = p.seiten.map((b) => randVon(kanten, anzahl, b));
    const zahlen = seiten.map((r) => r.n);
    const w = musterWahl(zahlen) ?? musterWahl(zahlen, 0, 1);
    if (!w) continue;
    bauen(p.id, p.stueck, seiten, w);
  }
  return { flaechen, stueckVon, pole };
}
