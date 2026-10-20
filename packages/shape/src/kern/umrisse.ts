// Plan 20.10., V4 „Exakte Umrisse“ (Beweis, Schalter `umrisse: 'exakt'`): Front und Top binden den Körper so genau wie die
// Seite. Heute halten nur weiche Breitenpunkte die Breite (die Haut wölbt sich daneben hinaus), die Kappen gar nicht, und die
// Front wird nur weich „berührt“ (V4 im Detail, Diagnose). Hier drei Arten Bedingungen im Löser je Achse (`loeser/achsen.ts`):
// 1. Breitenlinie (Top): Käfigreihe N/4 rechts bzw. 3N/4 links über alle Ringe und durch die Mittelreihe beider Kappen bis zur
//    Spitze. Lage: der feine Punkt auf dem Top-Umriss (nächster Linienpunkt in x und z; durch die Front auf seiner Höhe
//    begrenzt = Sichthülle). Tangente: Die Differenz der beiden Nachbarn quer zur Reihe liegt im Top parallel zur Linie
//    (Festpunkt: Ziel λ·t, λ aus dem vorigen Durchgang) — dort ist die Haut am breitesten.
// 2. Frontlinie aus Ringstücken: je Höhe der Ring, der dort nach dem ersten Lösen am weitesten reicht (dann eingefroren); Lage
//    auf dem Front-Umriss (z und y, durch das Top begrenzt), Tangente längs der Wirbelsäule.
// 3. Ungleichung: Jeder feine Punkt, der in einem Blatt mehr als 0,25 px über die Linie hinaussteht, wird an den nächsten
//    Linienpunkt gebunden (die beiden Achsen des Blatts); die aktive Menge wächst nur.
// Ziele sind die Sichthülle (die kleinere Breite zweier Ansichten), so verlangt keine Bedingung, was eine andere Ansicht
// verbietet: Widersprüche bleiben örtlich (rot im Editor). Nur Röhre ohne Maul und Beine. DOM-frei.
//
// Stand des Beweises (20.10. nachts, angehalten nach drei Fehlanläufen an der Frontlinie, Planseite „Stand V4“): Die
// Breitenlinie trägt bei Kugel, Ei, Robbe, Kegel und dem Widerspruch (Robbe Top 12,5 → 1,2 px), nicht bei Tiger, Vase und
// einfacher Form. Frontlinie und Ungleichung sind deshalb nur auf Wunsch an (`front`, `ungleich`); beide schaukeln sich
// heute auf.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import type { Kaefig } from '../kaefig/halbkanten';
import type { Roehre } from '../kaefig/roehre';
import { type AchsZeile, achsenAusgleich, achsenLoeser, grenzDifferenz, grenzZeile } from '../loeser/achsen';
import type { Glaettemass } from '../loeser/grenzflaeche';
import { kaefigNachbarlisten } from '../loeser/normalSystem';
import { pfadAbtasten, vollerPfad } from '../profil';
import type { Unterteilung } from '../subdivision/catmullClark';
import { anwenden3 } from '../subdivision/matrix';
import type { Breiten } from './breite';
import { feinKette } from './reifen';

/** px je Einheit (Vertrag der Messungen) */
const PX = 461;
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());
/** Gewichte (gemessen, V4 im Detail: 1000 ließ an einem einzelnen Punkt 10 % Rest gegen die Glättung) */
export const UMRISS_GEWICHT = 1e5;
export const TANGENTEN_GEWICHT = 1e4;
/** Ungleichung: ab so viel über der Linie (0,25 px) */
const UEBER = 0.25 / PX;

export type UmrissOptionen = {
  gewicht?: number;
  tangente?: number;
  durchgaenge?: number;
  ungleich?: number;
  front?: boolean;
  top?: boolean;
  umparametrisieren?: boolean;
  protokoll?: string[];
  /**
   * Querschnitt aus der Sichthülle: Käfigpunkte, deren Vorlage Front oder Top trifft — `ziel` (Standard): ihr Ziel zählt
   * `huelleGewicht`-fach im Ausgleich; `hart`: zusätzlich quer an den Umriss gebunden (Gewicht `gewicht`); `aus`: nichts.
   */
  huelle?: 'ziel' | 'hart' | 'aus';
  huelleGewicht?: number;
  /** `blatt`: das höhere Gewicht nur in den beiden Achsen des Blatts, das die Stelle trifft (Front: y, z; Top: x, z) */
  huelleAchsen?: 'alle' | 'blatt';
  /** Hub des Glättungsbezugs (`Glaettemass.hub`, 0 = heute) */
  hub?: number;
  /** Querschnitt aus der Sichthülle: Breitenpunkte aus den Vorlagen der Hülle (Standard an; `false` = ohne) */
  breite?: boolean;
  /** Querschnitt aus der Sichthülle: feine Punkte längs der Ringe auf die dichte Kurve ihres Schnitts (Versuch) und ihr Gewicht */
  dicht?: boolean;
  dichtGewicht?: number;
  /** V5 (Versuch): Gewicht je feinem Punkt einer Linienschleife (Standard 16) */
  linieGewicht?: number;
  /**
   * V5 „Form zuerst“: Gewicht je feinem Punkt (Stufe 2, nur wo die Linien den Käfig verschoben haben) der Bindung des Körpers
   * mit Linien an die Form des Körpers ohne Linien (Punkt zu Ebene); Standard 16, 0 = aus
   */
  form?: number;
  /** Querschnitt aus der Sichthülle: Gewicht der weichen einseitigen Grenze (feine Punkte über Front/Top quer zurück; 0 = aus) */
  grenze?: number;
  /** Querschnitt aus der Sichthülle: Durchgänge der glatten Korrektur (Überstehen geglättet von den Zielen abziehen; 0 = aus) */
  korrektur?: number;
};

export type UmrissBericht = {
  breitenlinie: number;
  frontlinie: number;
  tangenten: number;
  ungleich: number;
  zerlegungen: number;
  durchgaenge: number;
  ms: number;
};

type Blatt = 'seite' | 'front' | 'top';
/** Achsen eines Blatts: [waagerecht, senkrecht] (Seite x/y, Front z/y, Top x/z) */
const ACHSEN: Record<Blatt, [0 | 1 | 2, 0 | 1 | 2]> = { seite: [0, 1], front: [2, 1], top: [0, 2] };

/**
 * Geschlossener Umriss eines Blatts (Welt, Koordinaten des Blatts u/v) mit Innen-Abfrage, Fußpunkt (Tangente t, äußere
 * Normale m, Abstand d, Bogenlänge s) und Kreuzungen einer waagerechten (v = Wert) bzw. senkrechten (u = Wert) Geraden.
 */
type Umriss = {
  pts: V2[];
  laenge: number;
  innen(p: V2): boolean;
  fuss(p: V2): { q: V2; t: V2; m: V2; d: number; s: number };
  kreuzungen(achse: 'u' | 'v', wert: number): number[];
};

function umrissVon(dok: Dokument, a: Blatt): Umriss {
  const s = dok.skalierung;
  const pts = pfadAbtasten(vollerPfad(dok.profile[a]), 32).map((p) => ({ x: p.x * s, y: p.y * s }));
  if (pts.length > 1 && Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y) < 1e-12) pts.pop();
  const m = pts.length;
  // Umlaufsinn: äußere Normale = (t.y, −t.x) bei positivem Umlauf (gegen den Uhrzeigersinn), sonst umgekehrt
  let flaeche = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % m]!;
    flaeche += a.x * b.y - b.x * a.y;
  }
  const sinn = flaeche >= 0 ? 1 : -1;
  const bogen: number[] = [0];
  for (let i = 0; i < m; i++) bogen.push(bogen[i]! + Math.hypot(pts[(i + 1) % m]!.x - pts[i]!.x, pts[(i + 1) % m]!.y - pts[i]!.y));
  return {
    pts,
    laenge: bogen[m]!,
    kreuzungen(achse, wert) {
      const out: number[] = [];
      for (let i = 0; i < m; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % m]!;
        const [a0, a1, b0, b1] = achse === 'u' ? [a.y, a.x, b.y, b.x] : [a.x, a.y, b.x, b.y];
        if ((a0 - wert) * (b0 - wert) > 0 || a0 === b0) continue;
        out.push(a1 + ((wert - a0) / (b0 - a0)) * (b1 - a1));
      }
      return out;
    },
    innen(p) {
      let drin = false;
      for (let i = 0, j = m - 1; i < m; j = i++) {
        const a = pts[i]!;
        const b = pts[j]!;
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) drin = !drin;
      }
      return drin;
    },
    fuss(p) {
      let best = { q: pts[0]!, t: { x: 1, y: 0 }, m: { x: 0, y: -sinn }, d: Infinity, s: 0 };
      for (let i = 0; i < m; i++) {
        const a = pts[i]!;
        const b = pts[(i + 1) % m]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const l2 = dx * dx + dy * dy;
        if (!(l2 > 0)) continue;
        const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
        const q = { x: a.x + t * dx, y: a.y + t * dy };
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < best.d) {
          const l = Math.sqrt(l2);
          best = { q, t: { x: dx / l, y: dy / l }, m: { x: (sinn * dy) / l, y: (-sinn * dx) / l }, d, s: bogen[i]! + t * l };
        }
      }
      return best;
    },
  };
}

/** Nachbarn eines feinen Punkts (Stufe L). */
function nachbarnVon(fk: Kaefig, p: number): number[] {
  const out: number[] = [];
  for (let q = fk.vKStart[p]!; q < fk.vKStart[p + 1]!; q++) {
    const e = fk.vKanten[q]!;
    out.push(fk.eA[e] === p ? fk.eB[e]! : fk.eA[e]!);
  }
  return out;
}

/** Feine Kette entlang aufeinanderfolgender Käfigpunkte (Endpunkte einmal); null, wenn eine Kante fehlt. */
function kette(u: Unterteilung, k: Kaefig, punkte: readonly number[]): number[] | null {
  const out: number[] = [];
  for (let t = 0; t + 1 < punkte.length; t++) {
    const ch = feinKette(u, k, punkte[t]!, punkte[t + 1]!);
    if (!ch.length) return null;
    out.push(...(t ? ch.slice(1) : ch));
  }
  return out;
}

/** Quer-Nachbarn je Punkt einer geordneten Linie (die beiden, die nicht auf der Linie liegen; sonst keine). */
function querNachbarn(fk: Kaefig, linie: readonly number[]): ([number, number] | null)[] {
  return linie.map((p, i) => {
    const auf = new Set([linie[i - 1], linie[i + 1]]);
    const q = nachbarnVon(fk, p).filter((o) => !auf.has(o));
    return q.length === 2 ? [q[0]!, q[1]!] : null;
  });
}

/**
 * Exakte Umrisse lösen. `basis`: Zeilen und Ziele des heutigen Ausgleichs (Käfigziele zuerst — Zeile i = Käfigpunkt i —,
 * dann die Naht), `gm`: Glättungsmaß. Liefert den Käfig, das feine Netz und einen Bericht.
 */
export function umrisseLoesen(e: {
  v: Roehre;
  k: Kaefig;
  u: Unterteilung;
  dok: Dokument;
  breiten: Breiten;
  basis: { zeilen: AchsZeile[]; ziele: Float64Array };
  gm: Glaettemass | undefined;
  opt?: UmrissOptionen;
  /** V4 „Querschnitt aus der Sichthülle“: je Käfigpunkt 1 = Vorlage trifft die Front, 2 = das Top (statt der Breitenlinie) */
  huelle?: Uint8Array;
}): { xyz: Float64Array; fein: Float64Array; bericht: UmrissBericht } {
  const t0 = jetzt();
  const { v, k, u, dok, breiten } = e;
  const o = e.opt ?? {};
  const W = o.gewicht ?? UMRISS_GEWICHT;
  // Frontlinie und Ungleichung nur auf Wunsch (Beweis angehalten, siehe Kopf)
  const mitFront = o.front === true;
  const ungleichRunden = o.ungleich ?? 0;
  const WT = o.tangente ?? TANGENTEN_GEWICHT;
  const n = k.n;
  const g = u.grenze;
  const fk = u.stufen[u.stufen.length - 1]!.kaefig;
  const gm: Glaettemass = e.gm ?? { zeilen: [], nachbarn: kaefigNachbarlisten(k) };
  const zielZeile = new Int32Array(n);
  for (let i = 0; i < n; i++) zielZeile[i] = i;
  const umriss = { seite: umrissVon(dok, 'seite'), front: umrissVon(dok, 'front'), top: umrissVon(dok, 'top') };
  const bericht: UmrissBericht = { breitenlinie: 0, frontlinie: 0, tangenten: 0, ungleich: 0, zerlegungen: 0, durchgaenge: 0, ms: 0 };

  // ---------- Bedingungen sammeln: je Zeile eine Funktion, die das Ziel aus dem aktuellen feinen Netz rechnet ----------
  type Bed = { zeile: AchsZeile; ziel: (fein: Float64Array) => [number, number, number] };
  const beds: Bed[] = e.basis.zeilen.map((z, q) => ({ zeile: z, ziel: () => [e.basis.ziele[3 * q]!, e.basis.ziele[3 * q + 1]!, e.basis.ziele[3 * q + 2]!] }));
  const lage = (fein: Float64Array, p: number): [number, number, number] => [fein[3 * p]!, fein[3 * p + 1]!, fein[3 * p + 2]!];
  const gebunden = { top: new Set<number>(), front: new Set<number>(), seite: new Set<number>() };

  /** Lage auf der Linie des Blatts (nächster Punkt), durch die Sichthülle begrenzt; die Achse quer zum Blatt bleibt frei. */
  const lageBed = (p: number, blatt: 'top') => {
    const [a0, a1] = ACHSEN[blatt];
    const gew: [number, number, number] = [0, 0, 0];
    gew[a0] = W;
    gew[a1] = W;
    beds.push({
      zeile: { ...grenzZeile(g, p, n), gewicht: gew },
      ziel: (fein) => {
        const x = lage(fein, p);
        const f = umriss[blatt].fuss({ x: x[a0], y: x[a1] }).q;
        const ziel: [number, number, number] = [x[0], x[1], x[2]];
        ziel[a0] = f.x;
        ziel[a1] = f.y;
        // Sichthülle: z höchstens so breit, wie die andere Ansicht an diesem Punkt erlaubt
        const anders = blatt === 'top' ? breiten.front(x[1]) : breiten.top(x[0]);
        if (anders > 0 && Math.abs(ziel[2]) > anders) ziel[2] = Math.sign(ziel[2]) * anders;
        return ziel;
      },
    });
    gebunden[blatt].add(p);
  };

  /** Tangente: Differenz der Quer-Nachbarn (a − b) im Blatt parallel zur Linie am Fußpunkt von p; die dritte Achse frei. */
  const tangentenBed = (p: number, a: number, b: number, blatt: 'top' | 'front') => {
    const [a0, a1] = ACHSEN[blatt];
    const gew: [number, number, number] = [0, 0, 0];
    gew[a0] = WT;
    gew[a1] = WT;
    beds.push({
      zeile: { ...grenzDifferenz(g, a, b, n), gewicht: gew },
      ziel: (fein) => {
        const x = lage(fein, p);
        // nur, wo dieses Blatt die Breite bindet (sonst begrenzt die andere Ansicht, und die Tangente gehörte zu ihr)
        const f = umriss[blatt].fuss({ x: x[a0], y: x[a1] });
        const d = [fein[3 * a]! - fein[3 * b]!, fein[3 * a + 1]! - fein[3 * b + 1]!, fein[3 * a + 2]! - fein[3 * b + 2]!];
        const lambda = d[a0]! * f.t.x + d[a1]! * f.t.y;
        const ziel: [number, number, number] = [d[0]!, d[1]!, d[2]!];
        ziel[a0] = lambda * f.t.x;
        ziel[a1] = lambda * f.t.y;
        return ziel;
      },
    });
    bericht.tangenten++;
  };

  // ---------- Breitenlinie (Top): Reihe N/4 bzw. 3N/4, durch die Mittelreihe der Kappen ----------
  const { R, N, c } = v;
  // Querschnitt aus der Sichthülle: Die Vorlage weiß, wo sie Front oder Top trifft; dort bindet die Grenzlage quer (z) an
  // diesen Umriss (begrenzt durch die andere Ansicht). Nichts wird im Lauf gewählt, die Bedingungen stimmen mit den Zielen
  // überein (sie korrigieren nur, was die Grenzfläche zwischen den Stützstellen verliert).
  if (e.huelle && o.huelle === 'hart') {
    const hl = e.huelle;
    for (let i = 0; i < n; i++) {
      const art = hl[i]!;
      if (!art) continue;
      beds.push({
        zeile: { ...grenzZeile(g, i, n), gewicht: [0, 0, W] },
        ziel: (fein) => {
          const x = lage(fein, i);
          const fr = breiten.front(x[1]);
          const tp = breiten.top(x[0]);
          let soll = art === 1 ? fr : tp;
          const andere = art === 1 ? tp : fr;
          if (!(soll > 0)) soll = Math.abs(x[2]);
          if (andere > 0) soll = Math.min(soll, andere);
          return [x[0], x[1], (x[2] < 0 ? -1 : 1) * soll];
        },
      });
      if (art === 1) bericht.frontlinie++;
      else bericht.breitenlinie++;
    }
  }
  if (o.top === true || (o.top !== false && !e.huelle)) {
    for (const rechts of [true, false]) {
      const jR = rechts ? N / 4 : (3 * N) / 4;
      const vorn: number[] = [];
      const hinten: number[] = [];
      for (let a = c / 2; rechts ? a <= c : a >= 0; a += rechts ? 1 : -1) {
        vorn.push(v.kappe('vorn', a, c / 2));
        hinten.push(v.kappe('hinten', a, c / 2));
      }
      const ringe = Array.from({ length: R }, (_, i) => v.ringPunkt(i, jR));
      // Spitze vorn → Kappe vorn → Ringe → Kappe hinten → Spitze hinten (Ring 0 und R−1 sind die Ränder der Kappen)
      const punkte = [...vorn.slice(0, -1), ...ringe, ...hinten.slice(0, -1).reverse()];
      const linie = kette(u, k, punkte);
      if (!linie) continue;
      const quer = querNachbarn(fk, linie);
      linie.forEach((p, i) => {
        // die Spitzen hält die Naht (sie liegen auf beiden Hälften)
        if (i === 0 || i === linie.length - 1) return;
        lageBed(p, 'top');
        bericht.breitenlinie++;
        const qn = quer[i];
        if (qn) tangentenBed(p, qn[0], qn[1], 'top');
      });
    }
  }

  // ---------- erstes Lösen (Basis + Breitenlinie), danach die Frontlinie aus Ringstücken wählen ----------
  const loesen = (durchgaenge: number) => {
    const L = achsenLoeser(n, beds.map((b) => b.zeile), gm, zielZeile);
    bericht.zerlegungen++;
    let xyz: Float64Array = new Float64Array(0);
    let fein: Float64Array = feinNetz;
    for (let d = 0; d < durchgaenge; d++) {
      const ziele = new Float64Array(3 * beds.length);
      beds.forEach((b, q) => ziele.set(b.ziel(fein), 3 * q));
      xyz = achsenAusgleich(L, ziele);
      fein = anwenden3(g, xyz);
      bericht.durchgaenge++;
    }
    return { xyz, fein };
  };
  // Start: Basis allein (heutiger Ausgleich ohne Breitenpunkte)
  let feinNetz: Float64Array = anwenden3(g, k.xyz);
  {
    const L = achsenLoeser(n, e.basis.zeilen, gm, zielZeile);
    bericht.zerlegungen++;
    const xyz = achsenAusgleich(L, e.basis.ziele);
    feinNetz = anwenden3(g, xyz);
  }
  let erg = loesen(o.durchgaenge ?? 3);
  feinNetz = erg.fein;

  /**
   * Ziel eines Punkts entlang einer Achse des Blatts: die Kreuzung der Geraden durch den Punkt (parallel zur Achse) mit der
   * Linie, die ihm am nächsten liegt. Front und Top durch die Sichthülle begrenzt (z höchstens die andere Breite), y durch
   * die Seite an seinem x.
   */
  const zielAchse = (blatt: Blatt, x: readonly number[], achse: 0 | 1): { welt: 0 | 1 | 2; wert: number } | null => {
    const [a0, a1] = ACHSEN[blatt];
    const welt = achse === 0 ? a0 : a1;
    // waagerechte Achse (u): Gerade v = Wert; senkrechte (v): Gerade u = Wert
    const k = achse === 0 ? umriss[blatt].kreuzungen('u', x[a1]!) : umriss[blatt].kreuzungen('v', x[a0]!);
    if (!k.length) return null;
    const jetzt = x[welt]!;
    let wert = k.reduce((b, w) => (Math.abs(w - jetzt) < Math.abs(b - jetzt) ? w : b), k[0]!);
    if (welt === 2) {
      const anders = blatt === 'top' ? breiten.front(x[1]!) : blatt === 'front' ? breiten.top(x[0]!) : 0;
      if (anders > 0 && Math.abs(wert) > anders) wert = Math.sign(wert) * anders;
    }
    if (welt === 1 && blatt !== 'seite') {
      const ys = umriss.seite.kreuzungen('v', x[0]!);
      if (ys.length) wert = Math.min(Math.max(...ys), Math.max(Math.min(...ys), wert));
    }
    return { welt, wert };
  };

  /**
   * Frontlinie (dritter Anlauf, Zuordnung zuerst): Je Stück der Front-Linie (1 px Bogenlänge) der feine Punkt, der dort am
   * weitesten nach außen reicht (größter Abstand längs der äußeren Normale, über die Fußpunkte zugeordnet), gebunden in der
   * Achse, in die die Linie zeigt (Seiten: z = Breite auf seiner Höhe; oben und unten: y = Höhe an seinem z). Ringstücke
   * trugen nur, wo die breiteste Stelle mitten auf einem Ring liegt: Am Kegel stellt die runde Rückseite (Kappe) die Front,
   * oben und unten ist „am weitesten außen“ keine Breite (zwei Anläufe: Robbe Front 65 bzw. 27 px).
   */
  const frontAuswahl = (fein: Float64Array): Bed[] => {
    const STUECK = 1 / PX;
    const SUCHE = 40 / PX;
    const stuecke = Math.max(1, Math.ceil(umriss.front.laenge / STUECK));
    const best = new Float64Array(stuecke).fill(-Infinity);
    const wer = new Int32Array(stuecke).fill(-1);
    const nF = fein.length / 3;
    for (let p = 0; p < nF; p++) {
      const q = { x: fein[3 * p + 2]!, y: fein[3 * p + 1]! };
      const f = umriss.front.fuss(q);
      const e = umriss.front.innen(q) ? -f.d : f.d;
      if (e < -SUCHE) continue;
      const i = Math.min(stuecke - 1, Math.floor(f.s / STUECK));
      if (e > best[i]!) {
        best[i] = e;
        wer[i] = p;
      }
    }
    const out: Bed[] = [];
    const gesehen = new Set<number>();
    for (let i = 0; i < stuecke; i++) {
      const p = wer[i]!;
      if (p < 0 || gesehen.has(p)) continue;
      gesehen.add(p);
      const x = lage(fein, p);
      const f = umriss.front.fuss({ x: x[2], y: x[1] });
      // Achse der Linie: überwiegend waagerechte Normale → z, sonst y
      const achse: 0 | 1 = Math.abs(f.m.x) >= Math.abs(f.m.y) ? 0 : 1;
      const z = zielAchse('front', x, achse);
      if (!z) continue;
      const gew: [number, number, number] = [0, 0, 0];
      gew[z.welt] = W;
      const ziel: [number, number, number] = [x[0], x[1], x[2]];
      ziel[z.welt] = z.wert;
      if (o.protokoll && out.length < 12) o.protokoll.push(`Front: Stück ${i} Punkt ${p} (${x.map((c) => (c * PX).toFixed(1)).join(', ')}) e ${(best[i]! * PX).toFixed(1)} m (${f.m.x.toFixed(2)}, ${f.m.y.toFixed(2)}) Achse ${z.welt} → ${(z.wert * PX).toFixed(1)}`);
      out.push({ zeile: { ...grenzZeile(g, p, n), gewicht: gew }, ziel: () => ziel });
    }
    return out;
  };

  if (mitFront) {
    const grund = beds.slice();
    for (let d = 0; d < (o.durchgaenge ?? 3); d++) {
      const fb = frontAuswahl(feinNetz);
      beds.length = 0;
      beds.push(...grund, ...fb);
      bericht.frontlinie = fb.length;
      erg = loesen(1);
      feinNetz = erg.fein;
    }
  }

  // ---------- Ungleichung: was über eine Linie hinaussteht, in der Achse der Linie zurück (je Punkt zusammengefasst) ----------
  const aktiv = new Set<number>();
  for (let runde = 0; runde < ungleichRunden; runde++) {
    let neu = 0;
    const nF = feinNetz.length / 3;
    for (let p = 0; p < nF; p++) {
      if (aktiv.has(p)) continue;
      const x = lage(feinNetz, p);
      const ziele = new Map<0 | 1 | 2, number>();
      for (const blatt of ['seite', 'front', 'top'] as const) {
        const [a0, a1] = ACHSEN[blatt];
        const q = { x: x[a0], y: x[a1] };
        if (umriss[blatt].innen(q)) continue;
        const f = umriss[blatt].fuss(q);
        if (f.d <= UEBER) continue;
        const z = zielAchse(blatt, x, Math.abs(f.m.x) >= Math.abs(f.m.y) ? 0 : 1);
        if (!z) continue;
        const alt = ziele.get(z.welt);
        // dieselbe Achse aus zwei Blättern (z aus Front und Top): die engere Grenze
        if (alt === undefined || Math.abs(z.wert - x[z.welt]!) > Math.abs(alt - x[z.welt]!)) ziele.set(z.welt, z.wert);
      }
      if (!ziele.size) continue;
      const gew: [number, number, number] = [0, 0, 0];
      for (const a of ziele.keys()) gew[a] = W;
      beds.push({
        zeile: { ...grenzZeile(g, p, n), gewicht: gew },
        ziel: (fein) => {
          const y = lage(fein, p);
          const out: [number, number, number] = [y[0], y[1], y[2]];
          for (const [a, w] of ziele) out[a] = w;
          return out;
        },
      });
      aktiv.add(p);
      neu++;
    }
    bericht.ungleich += neu;
    if (!neu) break;
    erg = loesen(2);
    feinNetz = erg.fein;
  }
  bericht.ms = jetzt() - t0;
  return { xyz: erg.xyz, fein: erg.fein, bericht };
}
