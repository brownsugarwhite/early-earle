// Plan 20.10., V4 „Exakte Umrisse“, zweiter Weg (Florian 20.10. nachts: „Es gibt für alles eine elegante Lösung … Wichtig
// ist, dass das Mesh später immer schön und smooth aussieht außer bei gewollten Kanten“): Querschnitt aus der Sichthülle.
//
// Heute staucht jeder liegende Ring die ganze Front in seine Sprosse (`lappenQuerschnitt`): Ein Rumpfring der Robbe bekommt so
// ihren Kopf obendrauf, der Bauch erreicht die Front nicht, und das Top beult. Hier wird je Ring (und je Kappenring) die
// Sichthülle entlang seiner Sprosse geschnitten: an jeder Höhe die kleinere Breite aus Front (auf dieser Höhe) und Top (an
// diesem x) — was gezeichnet ist, bleibt, wie es ist. Gerundet wird nur, wo keine Zeichnung die Form vorgibt: zur Naht hin
// mit einer Superellipse um die breiteste Stelle. Ihre Fülle kommt aus der Zeichnung selbst — aus der Front für liegende
// Ringe, aus dem Top für stehende (Fläche je Hälfte über ihrem umschließenden Rechteck, umgerechnet in den Exponenten einer
// Superellipse gleicher Fülle) — und ist durch die Look-Wahl „Fülle“ nach oben begrenzt (rund 2, mittel 4, genau 24). So bleibt
// eine Kugel exakt eine Kugel, ein Ei ein Ei, eine Kastenfront kastig, und die Robbe hat am Rumpf den Rumpf ihrer Front und am
// Kopf den Kopf. Gezeichnete Spanten geben statt der Superellipse die Form vor (die Hülle beschneidet sie). Die breiteste
// Stelle jedes Schnitts liegt auf der Käfigreihe `iBreit` (Breitenlinie), gezeichnete Ecken der Front bleiben Stützstellen
// (Längsfalten). DOM-frei.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import type { Breiten } from './breite';

/** Halbe Querschnitt-Vorlage (wie `Querschnitt` in `ableiten.ts`): Höhe v (1 oben … 0 unten), halbe Breite w (0 … 1). */
export type Schnittvorlage = { v: number[]; w: number[]; haerte: number[]; knoten: number[] };
type Sprosse = { o: V2; u: V2 };

/** Dichte der Abtastung längs der Sprosse */
const DICHTE = 192;
/** Die breiteste Stelle bleibt so weit von den Nahtenden weg (Anteil der Sprosse); sonst hätte eine Hälfte keine Rundung */
const RAND = 0.1;
/** Plateau der größten Breite: bis so weit darunter (Anteil von W; eine Kastenwand ist nicht auf 0,1 % eben) */
const PLATEAU = 5e-3;
/**
 * Flaches Ende (Stielboden des Pilzes, Boden des Kegels, Basis der Pyramide): Die Hülle endet dort gerade — 0,5 px vor ihrem
 * Ende noch so breit wie 2 px davor (eine runde Kuppe fällt dort wie eine Wurzel ab, auf etwa die Hälfte) — und die Sprosse
 * endet (bis auf 2 px, auslaufend bis 6 px: Seite und Front sind oft um ein, zwei Pixel verschieden gezeichnet) auch dort.
 * Dann gibt die Zeichnung den Abschluss vor: keine Rundung, eine Stützstelle an der Kante. Ein reiner Abstandstest machte die
 * mittleren Ringe der Kugel flach (ihre Sprossen enden Bruchteile eines Pixels unter dem Pol der Front; Front 0,1 → 1,4 px),
 * ein Vergleich der Breiten längs der Sprosse den Ring 2 px unter dem Pol (Falte 2,9 → 8,4°).
 */
/** 1 px (Welt) und Reichweite der Suche hinter bzw. vor dem Ende der Sprosse (6 px) */
const ENDE_PX = 1 / 461;
const ENDE_SUCHE = 6 / 461;
/** Exponent der Rundung an einem flachen Ende (praktisch keine Rundung; wie die Look-Stufe „genau“) */
const P_FLACH = 24;
/** Ein flaches Ende bekommt eine Stützstelle an seiner Kante, wenn die Hülle dort mindestens so breit ist (2 px) */
const ENDE_KANTE = 2 / 461;
/** Kennungen der Kanten flacher Enden (neben der Naht oben bzw. unten) */
const KANTE_OBEN = -2;
const KANTE_UNTEN = -3;
/**
 * Schulter einer kastigen Rundung (Exponent ab SCHULTER_P): Übergang Deckfläche → Wand bei η = 2^(−1/p). Sie ist ein Merkmal
 * ohne Kante mit eigener Reihe — sonst verteilt jeder Ring seine Reihen nach eigener Bogenlänge, und wo sich das Seitenverhältnis
 * längs des Körpers ändert (Keil: vorn flach, hinten hoch), rutschen die Reihen von der Deckfläche auf die Wand (Delle).
 */
const SCHULTER_OBEN = -4;
const SCHULTER_UNTEN = -5;
const SCHULTER_P = Infinity; // gemessen (20.10. nachts): Kegel 11,5 → 9,9°, Keil 31 → 27°, aber Hammerhai 16 → 46°, Seestern 24 → 61° (Schulter und Ecke nur in manchen Ringen) — aus

// ---------- Fülle ----------

/** Fülle ρ(p) = ∫₀¹ (1 − tᵖ)^(1/p) dt einer Viertel-Superellipse (Fläche durch umschließendes Rechteck): p = 2 → π/4. */
export function fuelleVonExponent(p: number): number {
  const n = 1024;
  let s = 0;
  for (let k = 0; k < n; k++) s += Math.pow(1 - Math.pow((k + 0.5) / n, p), 1 / p);
  return s / n;
}

let tabelle: { p: number; rho: number }[] | null = null;

/** Exponent einer Superellipse mit der Fülle ρ (0,5 = Dreieck p 1, π/4 = Ellipse p 2, → 1 = Kasten); 1 … 128. */
export function exponentAusFuelle(rho: number): number {
  tabelle ??= Array.from({ length: 57 }, (_, k) => {
    const p = Math.pow(2, k / 8);
    return { p, rho: fuelleVonExponent(p) };
  });
  const t = tabelle;
  if (!(rho > t[0]!.rho)) return t[0]!.p;
  for (let k = 1; k < t.length; k++) {
    if (rho <= t[k]!.rho) {
      const f = (rho - t[k - 1]!.rho) / (t[k]!.rho - t[k - 1]!.rho);
      return Math.exp(Math.log(t[k - 1]!.p) + f * (Math.log(t[k]!.p) - Math.log(t[k - 1]!.p)));
    }
  }
  return t[t.length - 1]!.p;
}

/** Fülle der Zeichnungen als Exponenten der Rundung: Front oben/unten (liegende Ringe), Top zu +x/−x (stehende Ringe). */
export type ZeichnungsFuelle = { oben: number; unten: number; plusX: number; minusX: number };

/** Fülle beider Hälften einer Breitenfunktion über [lo, hi], getrennt an der breitesten Stelle (Mitte des Plateaus). */
function haelftenFuelle(breite: (s: number) => number, lo: number, hi: number): { minus: number; plus: number } {
  const n = 400;
  const w: number[] = [];
  let F = 0;
  for (let k = 0; k <= n; k++) {
    const x = breite(lo + ((hi - lo) * k) / n);
    w.push(x > 0 ? x : 0);
    F = Math.max(F, w[k]!);
  }
  if (!(F > 0)) return { minus: Math.PI / 4, plus: Math.PI / 4 };
  const m = plateauMitte(w, F, (k) => k);
  const mi = Math.round(m);
  const mittel = (a: number, e: number) => {
    if (e - a < 0.02 * n) return 1; // keine Hälfte: die breiteste Stelle liegt am Ende, die Seite ist dort voll (flach)
    let s = 0;
    for (let k = a; k <= e; k++) s += w[k]!;
    return s / ((e - a + 1) * F);
  };
  return { minus: mittel(0, mi), plus: mittel(mi, n) };
}

/** Mitte des längsten Laufs mit w ≥ F (1 − PLATEAU) (in der Einheit `lage`; bei Gleichstand der mittlere Lauf). */
function plateauMitte(w: ArrayLike<number>, F: number, lage: (k: number) => number): number {
  const grenze = F * (1 - PLATEAU);
  let best = { a: 0, e: 0, len: -1 };
  let k = 0;
  while (k < w.length) {
    if (!(w[k]! >= grenze)) {
      k++;
      continue;
    }
    let e = k;
    while (e + 1 < w.length && w[e + 1]! >= grenze) e++;
    const len = Math.abs(lage(e) - lage(k));
    if (len > best.len + 1e-12) best = { a: k, e, len };
    k = e + 1;
  }
  return (lage(best.a) + lage(best.e)) / 2;
}

/** Fülle von Front und Top eines Dokuments; Exponenten zwischen 2 (Ellipse) und `hoechstens` (Look-Wahl „Fülle“). */
export function zeichnungsFuelle(dok: Dokument, breiten: Breiten, hoechstens: number): ZeichnungsFuelle {
  const s = dok.skalierung;
  const ys = pfadAbtasten(vollerPfad(dok.profile.front), 24).map((p) => p.y * s);
  const xs = pfadAbtasten(vollerPfad(dok.profile.top), 24).map((p) => p.x * s);
  const f = haelftenFuelle(breiten.front, Math.min(...ys), Math.max(...ys));
  const t = haelftenFuelle(breiten.top, Math.min(...xs), Math.max(...xs));
  const e = (rho: number) => Math.min(hoechstens, Math.max(2, exponentAusFuelle(rho)));
  return { oben: e(f.plus), unten: e(f.minus), plusX: e(t.plus), minusX: e(t.minus) };
}

/**
 * Breiten als Tabelle (je Bau einmal): Front und Top an 2048 Stellen über ihre Ausdehnung abgetastet, dazwischen linear —
 * eine Abfrage ist dann konstant schnell (die Hülle fragt je Bau zehntausendfach; die Polygonsuche kostete den Zug 30 ms bei
 * der Robbe). Außerhalb der Ausdehnung −∞ wie die genaue Fassung; an einer Grenze zur Außenseite die nächste Stützstelle.
 */
export function tabellierteBreiten(dok: Dokument, b: Breiten, n = 2048): Breiten {
  const s = dok.skalierung;
  // dieselben Polygone wie `silhouettenBreite` (40 je Abschnitt); jede Kante trägt sich in die Tabellenzeilen ein, die sie
  // kreuzt — größte |Kreuzung| je Zeile wie `schnittMax`, ohne für jede Zeile alle Kanten abzulaufen
  const polygon = (a: 'front' | 'top') => pfadAbtasten(vollerPfad(dok.profile[a]), 40).map((p) => ({ x: p.x * s, y: p.y * s }));
  const tabelle = (poly: { x: number; y: number }[], achse: 'x' | 'y'): ((w: number) => number) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of poly) {
      lo = Math.min(lo, achse === 'x' ? p.x : p.y);
      hi = Math.max(hi, achse === 'x' ? p.x : p.y);
    }
    if (!(hi > lo)) return achse === 'x' ? b.top : b.front;
    const T = new Float64Array(n + 1).fill(-Infinity);
    const h = (hi - lo) / n;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i]!;
      const c = poly[(i + 1) % poly.length]!;
      const a1 = achse === 'x' ? a.x : a.y;
      const c1 = achse === 'x' ? c.x : c.y;
      const a2 = achse === 'x' ? a.y : a.x;
      const c2 = achse === 'x' ? c.y : c.x;
      const k0 = Math.max(0, Math.ceil((Math.min(a1, c1) - lo) / h - 1e-9));
      const k1 = Math.min(n, Math.floor((Math.max(a1, c1) - lo) / h + 1e-9));
      for (let k = k0; k <= k1; k++) {
        const w = lo + h * k;
        const d = c1 - a1;
        const t = Math.abs(d) < 1e-12 ? 0.5 : (w - a1) / d;
        const q = Math.abs(a2 + t * (c2 - a2));
        if (q > T[k]!) T[k] = q;
      }
    }
    return (w: number) => {
      if (!(w >= lo && w <= hi)) return -Infinity;
      const t = (w - lo) / h;
      const i = Math.min(n - 1, Math.floor(t));
      const a = T[i]!;
      const c = T[i + 1]!;
      const f2 = t - i;
      if (!(a > 0) || !(c > 0)) return f2 < 0.5 ? a : c;
      return a + (c - a) * f2;
    };
  };
  return { front: tabelle(polygon('front'), 'y'), top: tabelle(polygon('top'), 'x'), topMax: b.topMax, frontMax: b.frontMax };
}

/** Exponenten der Rundung eines Rings: liegend (Sprosse steil) aus der Front, stehend (Sprosse flach) aus dem Top, dazwischen gemischt. */
export function exponentenFuer(sp: Sprosse, zf: ZeichnungsFuelle): { oben: number; unten: number } {
  const dx = sp.o.x - sp.u.x;
  const dy = sp.o.y - sp.u.y;
  const phi = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  const t = Math.min(1, Math.max(0, (phi - 20) / 15));
  const lam = t * t * (3 - 2 * t);
  const fO = dy >= 0 ? zf.oben : zf.unten;
  const fU = dy >= 0 ? zf.unten : zf.oben;
  const tO = dx >= 0 ? zf.plusX : zf.minusX;
  const tU = dx >= 0 ? zf.minusX : zf.plusX;
  return { oben: lam * fO + (1 - lam) * tO, unten: lam * fU + (1 - lam) * tU };
}

// ---------- Ecken der Front ----------

/**
 * V5 (Plan 20.10.): Mit P gezeichnete Linien längs des Körpers sind Merkmale wie die Ecken der Front — in jedem Ring, den die
 * Linie kreuzt, eine Höhe auf seiner Sprosse; der Reihenplan gibt ihr eine Käfigreihe für alle Ringe, die Kante liegt auf ihr
 * (auch während eines Zugs). Kennung LINIE_ID + Index der Linie.
 */
export const LINIE_ID = 1000;
export type LinienMerkmal = { id: number; v: number; haerte: number };
/** Linien auf der Mittelebene (|z| darunter, 2 px) sind Nahtlinien — sie bleiben bei der Treppe */
const LINIE_NAHT = 2 / 461;
/** Ein Linienende so nah an einer Sprosse (1,5 px) reicht bis an ihren Ring */
const LINIE_ENDE = 1.5 / 461;

/**
 * Kreuzungen der Linien mit den Sprossen (Seitenansicht): je Ring die Höhe v auf seiner Sprosse und die Härte der Linie dort.
 * Linien links (z < 0) gelten gespiegelt; eine Linie kreuzt eine Sprosse höchstens einmal (die erste Kreuzung zählt).
 */
export function linienMerkmale(linien: readonly { punkte: readonly (readonly number[])[]; haerte: readonly number[] }[], sprossen: readonly Sprosse[]): LinienMerkmal[][] {
  return sprossen.map((sp) => {
    const out: LinienMerkmal[] = [];
    const dx = sp.o.x - sp.u.x;
    const dy = sp.o.y - sp.u.y;
    linien.forEach((ln, li) => {
      let gefunden = false;
      for (let k = 0; k + 1 < ln.punkte.length; k++) {
        const a = ln.punkte[k]!;
        const c = ln.punkte[k + 1]!;
        const ex = c[0]! - a[0]!;
        const ey = c[1]! - a[1]!;
        const det = dx * -ey - dy * -ex;
        if (Math.abs(det) < 1e-15) continue;
        const rx = a[0]! - sp.u.x;
        const ry = a[1]! - sp.u.y;
        const v = (rx * -ey - ry * -ex) / det;
        let t = (dx * ry - dy * rx) / det;
        // Enden mit Spiel: der Endring einer Linie läuft genau durch ihren Endpunkt (V5)
        if (!(v > 1e-4 && v < 1 - 1e-4 && t >= -1e-6 && t <= 1 + 1e-6)) continue;
        t = Math.min(1, Math.max(0, t));
        const z = Math.abs(a[2]! + (c[2]! - a[2]!) * t);
        if (z < LINIE_NAHT) break;
        const h0 = ln.haerte[k] ?? 0;
        const h1 = ln.haerte[k + 1] ?? h0;
        const h = h0 + (h1 - h0) * t;
        if (h > 0) out.push({ id: LINIE_ID + li, v, haerte: Math.min(1, h) });
        gefunden = true;
        break;
      }
      // Ende knapp vor der Sprosse (geteilter Endring einer anderen Linie): die Linie reicht bis an den Ring
      if (gefunden || !ln.punkte.length) return;
      const l2 = dx * dx + dy * dy;
      if (l2 < 1e-18) return;
      for (const k of [0, ln.punkte.length - 1]) {
        const p = ln.punkte[k]!;
        const v = ((p[0]! - sp.u.x) * dx + (p[1]! - sp.u.y) * dy) / l2;
        const d = Math.abs((p[0]! - sp.u.x) * dy - (p[1]! - sp.u.y) * dx) / Math.sqrt(l2);
        if (d > LINIE_ENDE || !(v > 1e-4 && v < 1 - 1e-4) || Math.abs(p[2]!) < LINIE_NAHT) continue;
        const h = ln.haerte[k] ?? 0;
        if (h > 0) out.push({ id: LINIE_ID + li, v, haerte: Math.min(1, h) });
        break;
      }
    });
    return out;
  });
}

/** Gezeichnete Ecke der Front (rechte Hälfte, nicht auf der Achse): Höhe (Welt) und Härte. */
export type FrontEcke = { y: number; haerte: number };

export function frontEcken(dok: Dokument): FrontEcke[] {
  const s = dok.skalierung;
  return dok.profile.front.knoten.filter((k) => k.art === 'ecke' && Math.abs(k.p.x) > 1e-9).map((k) => ({ y: k.p.y * s, haerte: Math.min(1, Math.max(0, k.haerte ?? 1)) }));
}

// ---------- Schnitt ----------

export type HuellenSchnitt = {
  q: Schnittvorlage;
  /** Maßstab: z = w · W (W = größte Breite des Schnitts) */
  W: number;
  /** Höhe der Stützstelle `iBreit` (Breitenlinie; 0 unten … 1 oben) */
  vStern: number;
  /** je Stützstelle: Hier stellt die Front die Breite (z = Front auf dieser Höhe, enger als das Top) */
  front: Uint8Array;
  /** je Stützstelle: Hier stellt das Top die Breite (z = Top an dieser Stelle, enger als die Front) */
  top: Uint8Array;
  /** dichte Kurve des Schnitts (v, z in Welt) und je Stützstelle ihr Index darin — zum dichten Anpassen der Fläche */
  dicht?: { v: Float64Array; z: Float64Array; zeile: Int32Array };
};

/** Dichtes Profil eines Schnitts der Hülle, Proben von oben (v = 1) nach unten (v = 0). */
export type HuellenProfil = {
  /** Länge der Sprosse (Welt) */
  L: number;
  v: Float64Array;
  /** Breite des Schnitts (Hülle, gerundet) */
  z: Float64Array;
  /** Breite der Hülle */
  b: Float64Array;
  /** z ist hier die Front bzw. das Top (gebunden) */
  front: Uint8Array;
  top: Uint8Array;
  /** Härte einer gezeichneten Ecke der Front an dieser Probe (−1 = keine; nur, wo der Schnitt der Hülle folgt) */
  ecke: Float64Array;
  /** Kennung des Merkmals an dieser Probe (wie `Huelle.kennung`; −1, wo keine Ecke gilt) */
  kennung: Int32Array;
  /** größte Breite */
  W: number;
  /** Mitte des Plateaus der größten Breite (geklemmt) */
  vBest: number;
  /** Bereich der Breitenlinie: an einem flachen Ende bis an die Kante, sonst mit Abstand zum Runden */
  vMin: number;
  vMax: number;
};

type Probe = { v: number; b: number; front: boolean; top: boolean; ecke: number; kennung: number; drin: boolean; eigen: number };

/** Hülle entlang einer Sprosse (vor der Rundung): Proben von oben nach unten, Breite b, wer sie stellt, gezeichnete Ecken. */
export type Huelle = {
  sp: Sprosse;
  L: number;
  v: Float64Array;
  b: Float64Array;
  /** an dieser Probe stellt die Front (enger als das Top) bzw. das Top die Breite der Hülle */
  front: Uint8Array;
  top: Uint8Array;
  /** Härte einer gezeichneten Ecke der Front an dieser Probe (−1 = keine) */
  ecke: Float64Array;
  /** wer sie ist: Index der Ecke der Front (≥ 0), Kante eines flachen Endes (KANTE_OBEN, KANTE_UNTEN), sonst −1 */
  kennung: Int32Array;
  /** größte Breite der Hülle (aus Proben in beiden Umrissen) */
  W: number;
  /** Spitze der Rundung: weiches Maximum der Hülle (geklemmt) */
  vB: number;
  /** je Nahtende: 1 = die Hülle endet hier mit der Sprosse (keine Rundung, flacher Abschluss), 0 = sie läuft weiter (gerundet) */
  flach: { oben: number; unten: number };
};

/** Hülle entlang einer Sprosse (Kopf der Datei): an jeder Höhe die kleinere Breite aus Front und Top. */
export function huelleEntlang(sp: Sprosse, breiten: Breiten, ecken: readonly FrontEcke[], linien: readonly LinienMerkmal[] = []): Huelle {
  const L = Math.max(1e-9, Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y));
  const rund = 0.5 * L;
  const dy = sp.o.y - sp.u.y;
  // dichte Proben von oben nach unten, dazu die Höhen gezeichneter Ecken (genau getroffen)
  const proben: Probe[] = [];
  for (let k = 0; k <= DICHTE; k++) proben.push({ v: 1 - k / DICHTE, b: 0, front: false, top: false, ecke: -1, kennung: -1, drin: false, eigen: 0 });
  if (Math.abs(dy) > 1e-9) {
    ecken.forEach((e, id) => {
      const vc = (e.y - sp.u.y) / dy;
      // jede Ecke innerhalb der Sprosse (auch nahe einem Ende: dort ist sie die Kante eines flachen Abschlusses, Basis der
      // Pyramide) — der Reihenplan gibt ihr in allen Ringen dieselbe Reihe
      if (vc > 1e-4 && vc < 1 - 1e-4) proben.push({ v: vc, b: 0, front: false, top: false, ecke: e.haerte, kennung: id, drin: false, eigen: 0 });
    });
  }
  for (const m of linien) proben.push({ v: m.v, b: 0, front: false, top: false, ecke: m.haerte, kennung: m.id, drin: false, eigen: 0 });
  proben.sort((a, b) => b.v - a.v);
  for (let k = proben.length - 1; k > 0; k--) {
    if (proben[k - 1]!.v - proben[k]!.v < 1e-7) {
      if (proben[k]!.ecke > proben[k - 1]!.ecke) {
        proben[k - 1]!.ecke = proben[k]!.ecke;
        proben[k - 1]!.kennung = proben[k]!.kennung;
      }
      proben.splice(k, 1);
    }
  }
  // Sichthülle je Probe. Breite W und Scheitel der Rundung kommen aus der Ansicht, die längs des Rings blickt: für liegende
  // Ringe die Front auf der Höhe der Probe, begrenzt durch das Top in der Ringmitte; für stehende das Top an der Stelle,
  // begrenzt durch die Front in der Ringmitte (dazwischen gemischt). Schräge Sprossen an runden Enden treffen das Top sonst an
  // verschiedenen Stellen — der Ring wurde zu breit und schief (Wurst, Tigerschnauze); die Hülle beschneidet danach nur noch.
  const dx = sp.o.x - sp.u.x;
  const phi = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
  const tl = Math.min(1, Math.max(0, (phi - 20) / 15));
  const liegt = tl * tl * (3 - 2 * tl);
  let tMitte = breiten.top((sp.o.x + sp.u.x) / 2);
  let fMitte = breiten.front((sp.o.y + sp.u.y) / 2);
  let W = 0;
  let drin = 0;
  for (const q of proben) {
    const x = sp.u.x + dx * q.v;
    const y = sp.u.y + dy * q.v;
    const f = breiten.front(y);
    const t = breiten.top(x);
    const fw = f > 0 ? f : Infinity;
    const tw = t > 0 ? t : Infinity;
    q.b = Math.min(fw, tw);
    q.front = f > 0 && f <= tw;
    q.top = t > 0 && t < fw;
    q.drin = f > 0 && t > 0;
    if (q.drin) drin++;
  }
  // Mitte außerhalb eines Umrisses: dessen größte Breite längs der Sprosse
  if (!(tMitte > 0)) for (const q of proben) tMitte = Math.max(tMitte, breiten.top(sp.u.x + dx * q.v));
  if (!(fMitte > 0)) for (const q of proben) fMitte = Math.max(fMitte, breiten.front(sp.u.y + dy * q.v));
  for (const q of proben) {
    if (!q.drin) continue;
    const f = breiten.front(sp.u.y + dy * q.v);
    const t = breiten.top(sp.u.x + dx * q.v);
    q.eigen = liegt * Math.min(f, tMitte > 0 ? tMitte : Infinity) + (1 - liegt) * Math.min(t, fMitte > 0 ? fMitte : Infinity);
    if (Number.isFinite(q.eigen)) W = Math.max(W, q.eigen);
  }
  if (drin && !(W > 0)) for (const q of proben) if (q.drin) W = Math.max(W, q.b);
  if (drin) {
    // Teile der Sprosse außerhalb eines Umrisses (die Spitze der Seite liegt oft knapp vor der des Tops, eine Seite ragt
    // über die Front): die Hülle stetig fortgesetzt mit der Breite des nächsten Punkts innerhalb — der Widerspruch bleibt
    // örtlich, statt dort die volle Breite der anderen Ansicht anzunehmen (Tigerschnauze: Falte 90°)
    const rand = new Float64Array(proben.length).fill(NaN);
    let letzte = -1;
    for (let k = 0; k < proben.length; k++) {
      if (proben[k]!.drin) letzte = k;
      else if (letzte >= 0) rand[k] = letzte;
    }
    letzte = -1;
    for (let k = proben.length - 1; k >= 0; k--) {
      if (proben[k]!.drin) letzte = k;
      else if (letzte >= 0 && (Number.isNaN(rand[k]!) || letzte - k < k - rand[k]!)) rand[k] = letzte;
    }
    for (let k = 0; k < proben.length; k++) {
      const q = proben[k]!;
      if (q.drin) continue;
      q.b = proben[rand[k]!]!.b;
      q.front = false;
      q.top = false;
    }
  } else {
    // ganz außerhalb eines Umrisses (Seite länger als das Top, höher als die Front): höchstens rund (wie `ringMasstab`)
    for (const q of proben) if (Number.isFinite(q.b)) W = Math.max(W, q.b);
    W = W > 0 ? Math.min(W, rund) : rund;
    for (const q of proben) {
      if (!(q.b <= W)) q.b = W;
      q.front = false;
      q.top = false;
    }
  }
  // Spitze der Rundung: Mitte des Plateaus der eigenen Ansicht (ohne sie: der Hülle). Das frühere weiche Maximum der Hülle
  // war nur für schräge Sprossen nötig (die Hülle ändert sich längs ihrer um einige Prozent); die eigene Ansicht hängt nicht
  // an der Neigung, und an einer spitzen, unsymmetrischen breitesten Stelle (Flügelspitze des Rochens) zog das weiche Maximum
  // den Scheitel von der Ecke weg
  const eigen = proben.map((q) => (q.drin && Number.isFinite(q.eigen) && q.eigen > 0 ? q.eigen : q.b));
  let eMax = 0;
  for (const e of eigen) eMax = Math.max(eMax, e);
  let vScheitel = eMax > 0 ? plateauMitte(eigen, eMax, (k) => proben[k]!.v) : 0.5;
  // Liegt eine gezeichnete Spitze auf dem Plateau, ist sie die breiteste Stelle (Flügelspitze des Rochens: die Front hat dort
  // ihre Spitze, jeder Ring ist eine kleinere Linse mit derselben Spitze; die Mitte des unsymmetrischen Plateaus lag daneben).
  // Nur echte Spitzen — die Front wird zu beiden Seiten schmaler; die Ecke am Ende einer geraden Wand (Boden des Keils) ist
  // nur das Ende des Plateaus, der Scheitel bleibt in seiner Mitte (sonst zog er in einzelnen Ringen an die Ecke: Delle)
  const spitze = (yc: number): boolean => {
    const f0 = breiten.front(yc);
    const fo = breiten.front(yc + 2 * ENDE_PX);
    const fu = breiten.front(yc - 2 * ENDE_PX);
    return f0 > 0 && !(fo > f0 * 0.995) && !(fu > f0 * 0.995);
  };
  let eckeGewicht = -1;
  proben.forEach((q, k) => {
    if (q.kennung < 0 || q.kennung >= LINIE_ID || !(eigen[k]! >= eMax * (1 - PLATEAU)) || !spitze(sp.u.y + dy * q.v)) return;
    const g = q.ecke - Math.abs(q.v - vScheitel);
    if (g > eckeGewicht) {
      eckeGewicht = g;
      vScheitel = q.v;
    }
  });
  // Enden: Wie weit läuft die Hülle hinter dem Ende der Sprosse weiter? Endet sie dort selbst, gibt die Zeichnung den Abschluss
  // vor (flach, mit ihrer Ecke als Stützstelle); läuft sie weiter, ist er frei und wird gerundet (Kugel abseits der Mitte)
  const drinBei = (vv: number) => breiten.front(sp.u.y + dy * vv) > 0 && breiten.top(sp.u.x + (sp.o.x - sp.u.x) * vv) > 0;
  const breiteBei = (vv: number): number => {
    const f = breiten.front(sp.u.y + dy * vv);
    const t = breiten.top(sp.u.x + (sp.o.x - sp.u.x) * vv);
    return f > 0 && t > 0 ? Math.min(f, t) : 0;
  };
  const flachAn = (ende: 0 | 1): number => {
    const dir = ende === 1 ? 1 : -1;
    const bei = (t: number) => ende + (dir * t) / L;
    // Ende der Hülle längs der Sprosse: Abstand g vom Ende der Sprosse (> 0 dahinter, < 0 davor), Bisektion
    let lo: number;
    let hi: number;
    if (drinBei(ende)) {
      lo = 0;
      hi = ENDE_SUCHE;
      if (drinBei(bei(hi))) return 0;
    } else {
      lo = -ENDE_SUCHE;
      hi = 0;
      if (!drinBei(bei(lo))) return 0;
    }
    for (let i = 0; i < 30; i++) {
      const m = 0.5 * (lo + hi);
      if (drinBei(bei(m))) lo = m;
      else hi = m;
    }
    const g = 0.5 * (lo + hi);
    // gerade oder Kuppe? Breite 0,5 px vor dem Ende der Hülle gegen 2 px davor
    const b2 = breiteBei(bei(g - 2 * ENDE_PX));
    if (!(b2 > ENDE_KANTE)) return 0;
    const gerade = Math.min(1, Math.max(0, (breiteBei(bei(g - 0.5 * ENDE_PX)) / b2 - 0.6) / 0.25));
    // und endet die Sprosse dort?
    const nah = Math.min(1, Math.max(0, 1 - (Math.abs(g) - 2 * ENDE_PX) / (4 * ENDE_PX)));
    return gerade * nah;
  };
  const flach = { oben: flachAn(1), unten: flachAn(0) };
  // flaches Ende mit Breite: Stützstelle an der Kante — eine gezeichnete Ecke nahe dem Ende ist diese Kante (ihre Kennung,
  // ihre Härte), sonst die Probe neben der Naht
  const n = proben.length;
  for (const [ende, k] of [[1, 1], [0, n - 2]] as const) {
    if ((ende === 1 ? flach.oben : flach.unten) < 0.5 || !(proben[k]!.b > ENDE_KANTE)) continue;
    let eck = -1;
    // (bis 6 px vor dem Ende: Seite und Front enden oft um einige Pixel verschieden — sonst gäbe es zwei Merkmale, die Ecke und
    // eine Kante neben der Naht, je nach Ring auf verschiedenen Reihen; Pyramide 160°)
    for (let i = 1; i + 1 < n; i++) if (proben[i]!.kennung >= 0 && Math.abs(proben[i]!.v - ende) * L <= ENDE_SUCHE) eck = eck < 0 || Math.abs(proben[i]!.v - ende) < Math.abs(proben[eck]!.v - ende) ? i : eck;
    if (eck >= 0) proben[eck]!.ecke = Math.max(0, proben[eck]!.ecke);
    // Ohne gezeichnete Ecke bekommt die Kante keinen eigenen Anker: Ob ein Ende flach ist, wechselt von Ring zu Ring
    // allmählich (Bauch der Robbe), ein Anker nur in manchen Ringen ließ die Reihe springen (Falte 10 → 16°). Das flache Ende
    // wirkt dann nur über die Rundung; die Reihen verteilen sich nach Bogenlänge auch über die flache Fläche.
    void k;
  }
  return {
    sp,
    L,
    v: Float64Array.from(proben, (q) => q.v),
    b: Float64Array.from(proben, (q) => q.b),
    front: Uint8Array.from(proben, (q) => (q.front ? 1 : 0)),
    top: Uint8Array.from(proben, (q) => (q.top ? 1 : 0)),
    ecke: Float64Array.from(proben, (q) => q.ecke),
    kennung: Int32Array.from(proben, (q) => q.kennung),
    W,
    // an einem flachen Ende darf der Scheitel bis an die Kante (Basis der Pyramide); ein freies Ende braucht Platz zum Runden
    vB: Math.min(1 - Math.max(ENDE_ABSTAND, RAND * (1 - flach.oben)), Math.max(Math.max(ENDE_ABSTAND, RAND * (1 - flach.unten)), vScheitel)),
    flach,
  };
}

/** Rundung der Hülle bei v: Superellipse (Exponenten `p` über/unter der Spitze vB), Höhe W, an beiden Nähten geschlossen. */
export function rundungBei(h: Huelle, p: { oben: number; unten: number }, v: number): number {
  const oben = v >= h.vB;
  const eta = oben ? (v - h.vB) / (1 - h.vB) : (h.vB - v) / h.vB;
  if (eta >= 1) return 0;
  if (eta <= 0) return h.W;
  const e0 = oben ? p.oben : p.unten;
  const e = e0 + (P_FLACH - e0) * (oben ? h.flach.oben : h.flach.unten);
  return h.W * Math.pow(1 - Math.pow(eta, e), 1 / e);
}

/** Hülle runden: z = min(Hülle, Rundung) (oder die gezeichnete Form statt der Superellipse). */
export function huelleRunden(h: Huelle, p: { oben: number; unten: number }, form?: (v: number) => number): HuellenProfil {
  const n = h.v.length;
  const z = new Float64Array(n);
  for (let k = 1; k + 1 < n; k++) {
    const r = form ? h.W * Math.min(1, Math.max(0, form(h.v[k]!))) : rundungBei(h, p, h.v[k]!);
    z[k] = Math.min(h.b[k]!, r);
  }
  return profilAusZ(h, z, form ? undefined : p);
}

/** Profil aus der Hülle und den Breiten z je Probe (Merkmale, Breitenlinie); `p` nur für die Schultern gerundeter Hälften. */
function profilAusZ(h: Huelle, z: Float64Array, p?: { oben: number; unten: number }): HuellenProfil {
  const n = h.v.length;
  let Wz = 0;
  for (const x of z) Wz = Math.max(Wz, x);
  if (!(Wz > 0)) Wz = h.W;
  const tol = 1e-3 * Wz;
  const front = new Uint8Array(n);
  const top = new Uint8Array(n);
  const ecke = new Float64Array(n).fill(-1);
  for (let k = 1; k + 1 < n; k++) {
    const traegt = z[k]! >= h.b[k]! - tol;
    front[k] = h.front[k]! && traegt ? 1 : 0;
    top[k] = h.top[k]! && traegt ? 1 : 0;
    // Ecken nur, wo der Schnitt der Hülle folgt (sonst rundet die Rundung sie weg) — gleich, welche Ansicht dort die Breite
    // stellt: Eine gezeichnete Ecke ist Teil der Form des Querschnitts (Flügelspitze des Rochens, Hutrand des Pilzes). Auf
    // welche Käfigreihe sie fällt, legt der Reihenplan der ganzen Kette fest (`reihenplan`); je Ring für sich sprang sie
    // zwischen Reihen, und die Kante lief im Zickzack (Rochen 108°, Blatt 172°)
    // P-Linien (V5) liegen auf der Haut, wo immer sie gezeichnet sind — auch dort, wo die Rundung die Form bestimmt
    if (h.ecke[k]! >= 0 && (traegt || h.kennung[k]! >= LINIE_ID)) ecke[k] = h.ecke[k]!;
  }
  const kennung = Int32Array.from(h.kennung, (id, k) => (ecke[k]! >= 0 ? id : -1));
  // Schultern kastiger Rundungen (nur, wo die Rundung die Form bestimmt und keine gezeichnete Ecke in der Nähe liegt)
  if (p) {
    for (const oben of [true, false]) {
      const e0 = oben ? p.oben : p.unten;
      const e = e0 + (P_FLACH - e0) * (oben ? h.flach.oben : h.flach.unten);
      if (e < SCHULTER_P) continue;
      const eta = Math.pow(2, -1 / e);
      const vS = oben ? h.vB + (1 - h.vB) * eta : h.vB - h.vB * eta;
      let kS = -1;
      for (let k = 1; k + 1 < n; k++) if (kS < 0 || Math.abs(h.v[k]! - vS) < Math.abs(h.v[kS]! - vS)) kS = k;
      if (kS < 0 || !(z[kS]! < h.b[kS]! - tol)) continue;
      let frei = true;
      for (let k = Math.max(1, kS - 6); k <= Math.min(n - 2, kS + 6); k++) if (kennung[k]! !== -1) frei = false;
      if (!frei) continue;
      kennung[kS] = oben ? SCHULTER_OBEN : SCHULTER_UNTEN;
      ecke[kS] = 0;
    }
  }
  const vMin = Math.max(ENDE_ABSTAND, RAND * (1 - h.flach.unten));
  const vMax = 1 - Math.max(ENDE_ABSTAND, RAND * (1 - h.flach.oben));
  return { L: h.L, v: h.v, z, b: h.b, front, top, ecke, kennung, W: Wz, vBest: Math.min(vMax, Math.max(vMin, plateauMitte(z, Wz, (k) => h.v[k]!))), vMin, vMax };
}

// ---------- V5: Höhenfeld der Hülle ----------

/**
 * Höhenfeld der Hülle über der Seite (rechte Hälfte): Die Form des Körpers soll nicht davon abhängen, wie die Ringe liegen.
 * Je natürlicher Sprosse (Stationen ohne Linienringe) der Anteil ρ = z / b der gerundeten Breite an der Hülle; dazwischen
 * bilinear im Viereck zweier benachbarter Sprossen (gleiche Höhe v auf beiden). Ein gedrehter Ring tastet dasselbe Feld ab:
 * z = ρ · b mit der Hülle b an seinem eigenen Punkt. Ohne das rundete jeder Ring seinen eigenen Schnitt — ein um 30°
 * gedrehter Ring (Querlinie über die Robbe) verschob die Haut neben der Linie um 12 px.
 */
export type HuellenFeld = { sprossen: readonly Sprosse[]; v: readonly Float64Array[]; rho: readonly Float64Array[] };

export function huellenFeld(sprossen: readonly Sprosse[], profile: readonly HuellenProfil[]): HuellenFeld {
  const rho = profile.map((pr) => {
    const r = new Float64Array(pr.v.length);
    let letzte = -1;
    for (let k = 0; k < pr.v.length; k++) {
      if (pr.b[k]! > 1e-9) {
        r[k] = Math.min(1, Math.max(0, pr.z[k]! / pr.b[k]!));
        if (letzte < 0) for (let q = 0; q < k; q++) r[q] = r[k]!;
        letzte = k;
      } else if (letzte >= 0) r[k] = r[letzte]!;
    }
    if (letzte < 0) r.fill(1);
    return r;
  });
  return { sprossen, v: profile.map((pr) => pr.v), rho };
}

/** ρ einer Sprosse bei Höhe v (Proben von oben v = 1 nach unten v = 0, linear). */
function rhoBei(v: Float64Array, rho: Float64Array, x: number): number {
  const n = v.length;
  if (x >= v[0]!) return rho[0]!;
  if (x <= v[n - 1]!) return rho[n - 1]!;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (v[m]! >= x) lo = m;
    else hi = m;
  }
  const a = v[lo]!;
  const c = v[hi]!;
  const f = a - c > 1e-15 ? (a - x) / (a - c) : 0;
  return rho[lo]! + (rho[hi]! - rho[lo]!) * f;
}

/** Lage (t, v) eines Punkts im Viereck zweier Sprossen (bilinear, Newton); null, wenn außerhalb. */
function imViereck(a: Sprosse, c: Sprosse, p: V2): { t: number; v: number } | null {
  let t = 0.5;
  let v = 0.5;
  for (let it = 0; it < 12; it++) {
    const ux = a.u.x + (c.u.x - a.u.x) * t;
    const uy = a.u.y + (c.u.y - a.u.y) * t;
    const ox = a.o.x + (c.o.x - a.o.x) * t;
    const oy = a.o.y + (c.o.y - a.o.y) * t;
    const fx = ux + (ox - ux) * v - p.x;
    const fy = uy + (oy - uy) * v - p.y;
    // ∂/∂t und ∂/∂v
    const tx = (c.u.x - a.u.x) * (1 - v) + (c.o.x - a.o.x) * v;
    const ty = (c.u.y - a.u.y) * (1 - v) + (c.o.y - a.o.y) * v;
    const vx = ox - ux;
    const vy = oy - uy;
    const det = tx * vy - ty * vx;
    if (Math.abs(det) < 1e-18) return null;
    const dt = (fx * vy - fy * vx) / det;
    const dv = (tx * fy - ty * fx) / det;
    t -= dt;
    v -= dv;
    if (Math.abs(dt) + Math.abs(dv) < 1e-12) break;
  }
  const eps = 1e-6;
  return t >= -eps && t <= 1 + eps && v >= -eps && v <= 1 + eps ? { t: Math.min(1, Math.max(0, t)), v: Math.min(1, Math.max(0, v)) } : null;
}

/** Ort eines Punkts im Feld: Viereck k (zwischen Sprosse k und k + 1) und Lage (t, v) darin. */
export type FeldOrt = { k: number; t: number; v: number };

/** Ort eines Punkts der Seite im Feld (Suche ab Viereck `start` nach beiden Seiten); außerhalb die nächste Sprosse. */
export function feldOrt(f: HuellenFeld, p: V2, start = 0): FeldOrt {
  const K = f.sprossen.length - 1;
  const s0 = Math.min(Math.max(0, start), Math.max(0, K - 1));
  for (let d = 0; d < K; d++) {
    for (const k of d === 0 ? [s0] : [s0 - d, s0 + d]) {
      if (k < 0 || k >= K) continue;
      const q = imViereck(f.sprossen[k]!, f.sprossen[k + 1]!, p);
      if (q) return { k, t: q.t, v: q.v };
    }
  }
  let best = Infinity;
  let ort: FeldOrt = { k: 0, t: 0, v: 0.5 };
  f.sprossen.forEach((sp, k) => {
    const ex = sp.o.x - sp.u.x;
    const ey = sp.o.y - sp.u.y;
    const l2 = ex * ex + ey * ey;
    const v = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - sp.u.x) * ex + (p.y - sp.u.y) * ey) / l2)) : 0;
    const d = Math.hypot(sp.u.x + ex * v - p.x, sp.u.y + ey * v - p.y);
    if (d < best) {
      best = d;
      ort = k < K ? { k, t: 0, v } : { k: K - 1, t: 1, v };
    }
  });
  return ort;
}

/** ρ des Feldes an einem Ort. */
export function feldRhoAm(f: HuellenFeld, o: FeldOrt): number {
  return (1 - o.t) * rhoBei(f.v[o.k]!, f.rho[o.k]!, o.v) + o.t * rhoBei(f.v[o.k + 1]!, f.rho[o.k + 1]!, o.v);
}

/** ρ des Feldes an einem Punkt der Seite; außerhalb aller Vierecke die nächste Sprosse. */
export function feldRho(f: HuellenFeld, p: V2): number {
  return feldRhoAm(f, feldOrt(f, p));
}

/** Profil einer (gedrehten) Sprosse aus dem Höhenfeld: z = ρ · b an jedem ihrer Punkte. */
export function profilAusFeld(h: Huelle, f: HuellenFeld): HuellenProfil {
  const n = h.v.length;
  const z = new Float64Array(n);
  const dx = h.sp.o.x - h.sp.u.x;
  const dy = h.sp.o.y - h.sp.u.y;
  for (let k = 1; k + 1 < n; k++) {
    const v = h.v[k]!;
    z[k] = feldRho(f, { x: h.sp.u.x + dx * v, y: h.sp.u.y + dy * v }) * h.b[k]!;
  }
  return profilAusZ(h, z);
}

/**
 * Dichtes Profil des Schnitts der Hülle entlang einer Sprosse (Kopf der Datei). `p`: Exponenten der Rundung über und unter
 * der breitesten Stelle; `form`: statt der Superellipse eine gezeichnete Form (Spant, normiert auf größte Breite 1) über v.
 */
export function huellenProfil(sp: Sprosse, breiten: Breiten, p: { oben: number; unten: number }, ecken: readonly FrontEcke[], form?: (v: number) => number): HuellenProfil {
  return huelleRunden(huelleEntlang(sp, breiten, ecken), p, form);
}

/**
 * Toleranz „Front erreicht“ (Welt; 1 px bei 461 px je Einheit, längs der Normalen der Front): Kleinere Reste kommen davon,
 * dass kein Ring genau an der breitesten Stelle liegt und die Seite die Sprossen um Bruchteile eines Pixels anders endet als
 * die Front — die Grenzfläche zwischen den Ringen deckt sie, eine vollere Rundung der ganzen Hälfte machte die Kugel kastig
 * (Δ Front 0,1 → 0,3 px, Exponent 2 → 2,8).
 */
const ERREICHT = 1 / 461;
/** Höhenraster der Front für „Fülle wo nötig“ (Welt; 1 px) */
const RASTER = 1 / 461;
/** Ausbreitung einer Fülle-Erhöhung auf die Nachbarn in der Kette (Ringe; Gewicht exp(−(d/σ)²)) */
const FUELLE_SIGMA = 1.5;

/** Kleinster Exponent q ≥ von, mit dem die Superellipse an η die Breite r (Anteil von W) erreicht: ηᑫ + rᑫ ≤ 1 (∞, wenn nicht bis 128). */
function exponentNoetig(eta: number, r: number, von: number): number {
  const passt = (q: number) => Math.pow(eta, q) + Math.pow(r, q) <= 1;
  if (passt(von)) return von;
  if (!passt(128)) return Infinity;
  let lo = von;
  let hi = 128;
  for (let i = 0; i < 40; i++) {
    const m = Math.sqrt(lo * hi);
    if (passt(m)) hi = m;
    else lo = m;
  }
  return hi;
}

/**
 * Fülle wo nötig (Look-Wahl „Fülle“ als Obergrenze): Erreicht auf einer Höhe keine Rundung der Kette die Front, obwohl die
 * Hülle es erlaubt (dort ist das Top breiter als die Front), wird die Hälfte des Rings voller, die es mit dem kleinsten
 * Exponenten schafft (höchstens `hoechstens`); die Erhöhung läuft zu den Nachbarn glatt aus. Ringe mit gezeichneter Form
 * (Spant) bleiben, wie sie sind. Liefert die neuen Exponenten je Glied der Kette.
 */
export function fuelleWoNoetig(huellen: readonly Huelle[], ps: readonly { oben: number; unten: number }[], breiten: Breiten, hoechstens: number, fest: readonly boolean[] = [], protokoll?: string[]): { oben: number; unten: number }[] {
  // gemeinsames Höhenraster über alle Glieder, deren Sprosse nicht waagerecht liegt (stehende Ringe stellen keine Front über Höhen)
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const h of huellen) {
    if (Math.abs(h.sp.o.y - h.sp.u.y) < 0.5 * Math.abs(h.sp.o.x - h.sp.u.x)) continue;
    yLo = Math.min(yLo, h.sp.o.y, h.sp.u.y);
    yHi = Math.max(yHi, h.sp.o.y, h.sp.u.y);
  }
  if (!(yHi > yLo)) return ps.map((p) => ({ ...p }));
  const nY = Math.max(2, Math.ceil((yHi - yLo) / RASTER));
  const hoehen = Array.from({ length: nY + 1 }, (_, t) => yLo + ((yHi - yLo) * t) / nY);
  const F = hoehen.map((y) => breiten.front(y));
  // Faktor waagerechter Rest → Abstand längs der Normalen der Front
  const normal = hoehen.map((y) => 1 / Math.hypot(1, (breiten.front(y + RASTER) - breiten.front(y - RASTER)) / (2 * RASTER) || 0));
  /** Hülle eines Glieds bei v (linear zwischen den Proben) */
  const huelleBei = (h: Huelle, v: number): number => {
    const n = h.v.length;
    const k = Math.min(n - 2, Math.max(0, Math.floor((1 - v) * DICHTE)));
    // Proben sind (bis auf eingefügte Ecken) gleichmäßig; die passende Lücke suchen
    let i = k;
    while (i > 0 && h.v[i]! < v) i--;
    while (i + 2 < n && h.v[i + 1]! > v) i++;
    const a = h.v[i]!;
    const c = h.v[i + 1]!;
    const f = a - c > 1e-15 ? (a - v) / (a - c) : 0;
    return h.b[i]! + (h.b[i + 1]! - h.b[i]!) * f;
  };
  let out = ps.map((p) => ({ ...p }));
  for (let runde = 0; runde < 2; runde++) {
    const bedarf = huellen.map(() => ({ oben: 0, unten: 0 }));
    let neu = false;
    for (let t = 0; t <= nY; t++) {
      const y = hoehen[t]!;
      const f = F[t]!;
      if (!(f > 0)) continue;
      let erreicht = false;
      let best = Infinity;
      let wer = -1;
      let wo = true;
      for (let i = 0; i < huellen.length && !erreicht; i++) {
        const h = huellen[i]!;
        const dy = h.sp.o.y - h.sp.u.y;
        if (Math.abs(dy) < 0.5 * Math.abs(h.sp.o.x - h.sp.u.x)) continue;
        const v = (y - h.sp.u.y) / dy;
        if (!(v > 0 && v < 1)) continue;
        const b = huelleBei(h, v);
        if (b < f - ERREICHT) continue; // dort ist das Top enger: dieses Glied darf die Front nicht erreichen
        const z = fest[i] ? b : Math.min(b, rundungBei(h, out[i]!, v));
        if ((f - z) * normal[t]! <= ERREICHT) {
          erreicht = true;
          break;
        }
        if (fest[i]) continue;
        const oben = v >= h.vB;
        const eta = oben ? (v - h.vB) / (1 - h.vB) : (h.vB - v) / h.vB;
        const q = exponentNoetig(Math.min(1, Math.max(0, eta)), Math.min(1, f / h.W), oben ? out[i]!.oben : out[i]!.unten);
        if (q < best) {
          best = q;
          wer = i;
          wo = oben;
        }
      }
      if (erreicht || wer < 0) continue;
      // höchstens die Look-Wahl — oder die eigene Fülle der Zeichnung, wenn sie voller ist
      const q = Math.min(Math.max(hoechstens, wo ? ps[wer]!.oben : ps[wer]!.unten), best);
      protokoll?.push(`Runde ${runde} Höhe ${(y * 461).toFixed(0)} px: Glied ${wer} ${wo ? 'oben' : 'unten'} braucht ${best.toFixed(2)} → ${q.toFixed(2)}`);
      const b = bedarf[wer]!;
      if (wo) b.oben = Math.max(b.oben, q);
      else b.unten = Math.max(b.unten, q);
      neu = true;
    }
    if (!neu) break;
    // glatt zu den Nachbarn: Erhöhung · exp(−(d/σ)²), nie unter dem bisherigen Exponenten
    out = out.map((p, i) => {
      if (fest[i]) return p;
      const r = { ...p };
      bedarf.forEach((b, j) => {
        const g = Math.exp(-(((i - j) / FUELLE_SIGMA) ** 2));
        if (b.oben > p.oben) r.oben = Math.max(r.oben, p.oben + (b.oben - p.oben) * g);
        if (b.unten > p.unten) r.unten = Math.max(r.unten, p.unten + (b.unten - p.unten) * g);
      });
      return r;
    });
  }
  return out;
}

/** Breite eines Profils bei v (linear zwischen den Proben). */
export function profilBei(pr: HuellenProfil, v: number): number {
  const n = pr.v.length;
  if (v >= pr.v[0]!) return pr.z[0]!;
  for (let k = 1; k < n; k++) {
    if (v >= pr.v[k]!) {
      const a = pr.v[k - 1]!;
      const c = pr.v[k]!;
      const f = a - c > 1e-15 ? (a - v) / (a - c) : 0;
      return pr.z[k - 1]! + (pr.z[k]! - pr.z[k - 1]!) * f;
    }
  }
  return pr.z[n - 1]!;
}

/** Stufen der Breitenlinie zwischen RAND und 1 − RAND */
const BREITEN_STUFEN = 161;
/** Glätte der Breitenlinie: Kosten eines Sprungs Δv zwischen Nachbarn = MU · Δv² (gegen den Breitenverlust 1 − z/W) */
const MU = 2;

/**
 * Breitenlinie über eine Kette von Profilen (Kappe vorn, Ringe, Kappe hinten): je Profil die Höhe der Käfigreihe der
 * breitesten Stelle — so breit wie möglich (Verlust 1 − z(v)/W), so glatt wie nötig (MU · Δv² zwischen Nachbarn).
 * Dynamische Programmierung über die Kette. Ohne Glätte sprang die Reihe dort, wo Sprossen verschieden geneigt sind
 * (Tigerschnauze: Ring 0 am breitesten unten, Ring 2 oben), und verdrehte den Käfig (Falte 104°).
 */
export function breitenlinieWaehlen(profile: readonly HuellenProfil[], mu = MU): number[] {
  const n = profile.length;
  if (!n) return [];
  const K = BREITEN_STUFEN;
  // bis an die Enden (die Kosten 1 − z/W halten die Linie an der breitesten Stelle; liegt sie an einem flachen Ende, darf sie dorthin)
  const vk = Array.from({ length: K }, (_, k) => ENDE_ABSTAND + ((1 - 2 * ENDE_ABSTAND) * k) / (K - 1));
  const kosten = profile.map((pr) => vk.map((v) => (v < pr.vMin - 1e-9 || v > pr.vMax + 1e-9 ? 1e6 : pr.W > 0 ? 1 - profilBei(pr, v) / pr.W : 0)));
  let summe = kosten[0]!.slice();
  const zurueck: Int32Array[] = [];
  // Übergänge nur bis Δv = 0,3 je Nachbar (größere Sprünge kosten mehr als jeder Breitenverlust; spart im Zug ¾ der Zeit)
  const fenster = Math.ceil((0.3 * (K - 1)) / (1 - 2 * ENDE_ABSTAND));
  for (let i = 1; i < n; i++) {
    const neu = new Array<number>(K);
    const zr = new Int32Array(K);
    for (let k = 0; k < K; k++) {
      let best = Infinity;
      let wahl = 0;
      for (let m = Math.max(0, k - fenster); m <= Math.min(K - 1, k + fenster); m++) {
        const d = vk[k]! - vk[m]!;
        const c = summe[m]! + mu * d * d;
        if (c < best) {
          best = c;
          wahl = m;
        }
      }
      neu[k] = best + kosten[i]![k]!;
      zr[k] = wahl;
    }
    zurueck.push(zr);
    summe = neu;
  }
  let k = 0;
  for (let m = 1; m < K; m++) if (summe[m]! < summe[k]!) k = m;
  const out = new Array<number>(n);
  out[n - 1] = vk[k]!;
  for (let i = n - 1; i > 0; i--) {
    k = zurueck[i - 1]![k]!;
    out[i - 1] = vk[k]!;
  }
  return out;
}

/** Anker eines Schnitts: Höhe v (1 oben … 0 unten), Käfigreihe, Härte (> 0 = gezeichnete Ecke → Längsfalte). */
export type Anker = { v: number; reihe: number; haerte: number; id?: number };

/** Kumulierte Bogenlänge eines Profils in wahren Maßen (längs der Sprosse v·L, quer z), von oben. */
function bogen(pr: HuellenProfil): Float64Array {
  const n = pr.v.length;
  const s = new Float64Array(n);
  for (let k = 1; k < n; k++) s[k] = s[k - 1]! + Math.hypot((pr.v[k]! - pr.v[k - 1]!) * pr.L, pr.z[k]! - pr.z[k - 1]!);
  return s;
}

/** Bogenlänge eines Profils bei v (linear zwischen den Proben). */
function bogenBei(pr: HuellenProfil, s: Float64Array, v: number): number {
  const n = pr.v.length;
  if (v >= pr.v[0]!) return 0;
  for (let k = 1; k < n; k++) {
    if (v >= pr.v[k]!) {
      const a = pr.v[k - 1]!;
      const c = pr.v[k]!;
      const f = a - c > 1e-15 ? (a - v) / (a - c) : 0;
      return s[k - 1]! + (s[k]! - s[k - 1]!) * f;
    }
  }
  return s[n - 1]!;
}

/** Eine eingerastete Ecke bleibt so weit von den Nähten weg (Anteil der Sprosse) — die Basis-Ecke der Pyramide liegt bei 2 % */
const ENDE_ABSTAND = 0.005;
/** Eine Ecke so nah an der Breitenlinie (in v) rastet auf sie ein (Rochenspitze, Hutrand: die Ecke ist die breiteste Stelle) */
const EINRASTEN = 0.08;
/** … und wird in Gliedern, in denen sie weiter weg liegt, bis hierhin noch mitgenommen (die Breitenlinie rückt auf die Ecke) */
const EINRASTEN_WEIT = 0.25;

/**
 * Reihenplan einer Kette (Plan 20.10., V4): Merkmale der Zeichnung bekommen Käfigreihen, die für alle Glieder gleich sind —
 * die Breitenlinie (Reihe `iBreit`, Höhe je Glied aus `breitenlinieWaehlen`), gezeichnete Ecken der Front (Reihe aus dem
 * Median ihrer natürlichen Lage nach Bogenlänge; liegt eine Ecke an der breitesten Stelle, rastet sie auf die Breitenlinie
 * ein, für alle Glieder gleich entschieden) und die Kanten flacher Enden (neben der Naht). Dazwischen verteilen sich die
 * Reihen je Glied nach Bogenlänge. Ohne gemeinsamen Plan sprang eine Ecke von Ring zu Ring zwischen Reihen, die Kante lief im
 * Zickzack (Rochen 108°, Blatt 172°).
 */
/** Wunsch eines Merkmals an den Reihenplan: natürliche Reihe (Median über die Glieder) und Härte (größte). */
type ReihenWunsch = { id: number; r: number; haerte: number };

/**
 * Reihen lo … hi an Merkmale vergeben (V5): in der Reihenfolge ihrer natürlichen Reihen, jede eine eigene, mit der kleinsten
 * Summe der quadrierten Abweichungen (dynamische Programmierung). Passen nicht alle, fällt das weichste weg (Strafe nach Härte).
 * Vorher nahm jedes Merkmal gierig die nächste freie Reihe — zwei Linien dicht beieinander drängten die zweite über die
 * Breitenlinie hinaus, sie fiel auf die Treppe (Ei: Kante 20 px neben der Linie).
 */
function reihenVergeben(liste: readonly ReihenWunsch[], lo: number, hi: number): Map<number, number> {
  const m = [...liste].sort((a, b) => a.r - b.r);
  const out = new Map<number, number>();
  const K = hi - lo + 1;
  if (!m.length || K <= 0) return out;
  // kosten[i][k]: beste Summe für die ersten i Merkmale, wenn das letzte vergebene höchstens Reihe lo + k − 1 hat (k = 0: keine)
  const INF = Number.POSITIVE_INFINITY;
  const kosten: number[][] = Array.from({ length: m.length + 1 }, () => new Array<number>(K + 1).fill(INF));
  const wahl: number[][] = Array.from({ length: m.length + 1 }, () => new Array<number>(K + 1).fill(-1));
  kosten[0]!.fill(0);
  for (let i = 0; i < m.length; i++) {
    const w = m[i]!;
    const strafe = 4 + 100 * w.haerte;
    for (let k = 0; k <= K; k++) {
      // weglassen
      const weg = kosten[i]![k]! + strafe;
      if (weg < kosten[i + 1]![k]!) {
        kosten[i + 1]![k] = weg;
        wahl[i + 1]![k] = -1;
      }
      // Reihe lo + k − 1 (k ≥ 1) nach einem Stand, der höchstens Reihe lo + k − 2 belegt
      if (k >= 1) {
        const r = lo + k - 1;
        const c = kosten[i]![k - 1]! + (r - w.r) * (r - w.r);
        if (c < kosten[i + 1]![k]!) {
          kosten[i + 1]![k] = c;
          wahl[i + 1]![k] = r;
        }
      }
      // monoton: „höchstens Reihe k“ erbt von „höchstens k − 1“
      if (k >= 1 && kosten[i + 1]![k - 1]! < kosten[i + 1]![k]!) {
        kosten[i + 1]![k] = kosten[i + 1]![k - 1]!;
        wahl[i + 1]![k] = -2;
      }
    }
  }
  // Rückweg
  let k = K;
  for (let i = m.length; i > 0; ) {
    const w = wahl[i]![k]!;
    if (w === -2) {
      k--;
      continue;
    }
    if (w >= 0) {
      out.set(m[i - 1]!.id, w);
      k--;
    }
    i--;
  }
  return out;
}

export function reihenplan(profile: readonly HuellenProfil[], vr: readonly number[], hOut: number, iBreit: number): Anker[][] {
  type Merkmal = { id: number; v: number; haerte: number };
  const merkmale: Merkmal[][] = profile.map((pr) => {
    const out: Merkmal[] = [];
    for (let k = 1; k + 1 < pr.v.length; k++) if (pr.kennung[k]! !== -1 && pr.ecke[k]! >= 0) out.push({ id: pr.kennung[k]!, v: pr.v[k]!, haerte: pr.ecke[k]! });
    return out;
  });
  const bl = vr.slice();
  const blHaerte = vr.map(() => 0);
  const blId: (number | undefined)[] = vr.map(() => undefined);
  // 1. Einrasten (je Ecke für alle Glieder gleich): Liegt sie in der Mehrheit der Glieder nahe der Breitenlinie, ist sie dort
  // die breiteste Stelle
  const ids = new Set<number>();
  for (const ms of merkmale) for (const m of ms) if (m.id >= 0 || m.id === SCHULTER_OBEN || m.id === SCHULTER_UNTEN) ids.add(m.id);
  const eingerastet = new Set<number>();
  for (const id of ids) {
    if (id < 0) continue;
    let da = 0;
    let nah = 0;
    merkmale.forEach((ms, i) => {
      const m = ms.find((x) => x.id === id);
      if (!m) return;
      da++;
      if (Math.abs(m.v - vr[i]!) <= EINRASTEN) nah++;
    });
    if (2 * nah >= da) eingerastet.add(id);
  }
  merkmale.forEach((ms, i) => {
    for (const m of ms) {
      if (!eingerastet.has(m.id) || Math.abs(m.v - vr[i]!) > EINRASTEN_WEIT) continue;
      if (blHaerte[i]! > 0 && Math.abs(m.v - vr[i]!) >= Math.abs(bl[i]! - vr[i]!)) continue;
      bl[i] = Math.min(1 - ENDE_ABSTAND, Math.max(ENDE_ABSTAND, m.v));
      blHaerte[i] = m.haerte;
      blId[i] = m.id;
    }
  });
  // 2. Reihen der übrigen Merkmale: natürliche Reihe je Glied (Anteil der Bogenlänge in seiner Hälfte), Seite nach Mehrheit,
  // Median; Merkmale derselben Seite bekommen verschiedene Reihen in ihrer Reihenfolge (zwei Ecken auf einer Reihe — Bauch und
  // Schritt des Vierbeiners — machten die Kante von Ring zu Ring springen)
  const bo = profile.map(bogen);
  const natuerlich = (i: number, v: number): number => {
    const pr = profile[i]!;
    const s = bo[i]!;
    const S = s[s.length - 1]!;
    const sB = bogenBei(pr, s, bl[i]!);
    const sM = bogenBei(pr, s, v);
    return v > bl[i]! ? (sB > 0 ? (sM / sB) * iBreit : 0) : iBreit + (S > sB ? ((sM - sB) / (S - sB)) * (hOut - iBreit) : 0);
  };
  const reihe = new Map<number, number>([
    [KANTE_OBEN, 1],
    [KANTE_UNTEN, hOut - 1],
  ]);
  const seiten: { oben: ReihenWunsch[]; unten: ReihenWunsch[] } = { oben: [], unten: [] };
  for (const id of ids) {
    if (eingerastet.has(id)) continue;
    const oben: number[] = [];
    const unten: number[] = [];
    let haerte = 0;
    merkmale.forEach((ms, i) => {
      const m = ms.find((x) => x.id === id);
      if (!m) return;
      (m.v > bl[i]! ? oben : unten).push(natuerlich(i, m.v));
      haerte = Math.max(haerte, m.haerte);
    });
    const seiteOben = oben.length >= unten.length;
    const liste = (seiteOben ? oben : unten).sort((a, b) => a - b);
    if (!liste.length) continue;
    (seiteOben ? seiten.oben : seiten.unten).push({ id, r: liste[Math.floor(liste.length / 2)]!, haerte });
  }
  // Kanten flacher Enden belegen ihre Reihe (1 bzw. hOut − 1), wo es sie gibt
  const kanteOben = merkmale.some((ms) => ms.some((m) => m.id === KANTE_OBEN));
  const kanteUnten = merkmale.some((ms) => ms.some((m) => m.id === KANTE_UNTEN));
  for (const [liste, lo, hi] of [
    [seiten.oben, kanteOben ? 2 : 1, iBreit - 1],
    [seiten.unten, iBreit + 1, kanteUnten ? hOut - 2 : hOut - 1],
  ] as const) {
    for (const [id, r] of reihenVergeben(liste, lo, hi)) reihe.set(id, r);
  }
  // 3. Anker je Glied: Breitenlinie, dazu die Merkmale auf ihrer Reihe — nur, wo die Reihe höchstens um eine von der
  // natürlichen Lage im Glied abweicht (sonst endet die Kante dort, statt quer über den Körper zu springen); je Seite monoton
  const anker = profile.map((_, i) => {
    const oben: Anker[] = [];
    const unten: Anker[] = [];
    for (const m of merkmale[i]!) {
      if (eingerastet.has(m.id)) continue;
      const r = reihe.get(m.id);
      if (r === undefined) continue;
      if ((m.id >= 0 || m.id === SCHULTER_OBEN || m.id === SCHULTER_UNTEN) && Math.abs(natuerlich(i, m.v) - r) > 1.5) continue;
      if (r < iBreit && m.v > bl[i]! + 1e-6) oben.push({ v: m.v, reihe: r, haerte: m.haerte, id: m.id });
      else if (r > iBreit && m.v < bl[i]! - 1e-6) unten.push({ v: m.v, reihe: r, haerte: m.haerte, id: m.id });
    }
    const monoton = (a: Anker[]): Anker[] => {
      // nach Reihe; bei gleicher Reihe die härtere Ecke; v muss mit der Reihe fallen
      a.sort((x, y) => x.reihe - y.reihe || y.haerte - x.haerte);
      const ok: Anker[] = [];
      for (const x of a) {
        const p = ok[ok.length - 1];
        if (p && (x.reihe === p.reihe || x.v >= p.v)) continue;
        ok.push(x);
      }
      return ok;
    };
    const breit: Anker = { v: bl[i]!, reihe: iBreit, haerte: blHaerte[i]! };
    if (blId[i] !== undefined) breit.id = blId[i];
    return [...monoton(oben), breit, ...monoton(unten)];
  });
  // Ecken nur, wo ein Nachbarglied sie auf derselben Reihe trägt (eine Ecke in einem einzelnen Ring verbog nur seine Reihen,
  // Keil oben); Breitenlinie bleibt immer
  const traegt = (i: number, r: number) => (anker[i] ?? []).some((a) => a.reihe === r && a.haerte > 0);
  return anker.map((a, i) => (profile.length < 2 ? a : a.filter((x) => x.reihe === iBreit || !(x.haerte > 0) || traegt(i - 1, x.reihe) || traegt(i + 1, x.reihe))));
}

/** V5: so viele Ringe hinter dem Ende einer Linie läuft ihre Reihe zur natürlichen Lage zurück */
export const REIHEN_AUSLAUF = 3;
/** Anteil der Verschiebung k Ringe neben der Linie (linear; glatt gemessen knickten die Reihen stärker: 3,9 statt 2,2 px) */
export function auslauf(k: number, weit = REIHEN_AUSLAUF): number {
  return Math.max(0, 1 - k / (weit + 1));
}

/**
 * V5: Reihen der Linien auslaufen lassen. Eine Linie zieht ihre Reihe in den Ringen, die sie kreuzt, auf ihre Höhe; dahinter
 * sprang die Reihe in einem Ringabstand auf ihre natürliche Lage zurück (Ei: 10 px), die Fläche wölbte sich am Linienende.
 * Jetzt bekommen die `REIHEN_AUSLAUF` Ringe vor dem Anfang und hinter dem Ende einen weichen Anker (ohne Härte) auf derselben
 * Reihe, dessen Abstand zur natürlichen Lage linear abnimmt (`auslauf`). `natuerlich(i, reihe)` = Höhe der Reihe im Ring ohne die Linie.
 */
export function reihenAuslaufen(plan: Anker[][], natuerlich: (i: number, reihe: number) => number, linienIds: ReadonlySet<number>): void {
  const R = plan.length;
  for (const id of linienIds) {
    const ringe: number[] = [];
    let reihe = -1;
    plan.forEach((a, i) => {
      const x = a.find((y) => y.id === id && y.haerte > 0);
      if (x) {
        ringe.push(i);
        reihe = x.reihe;
      }
    });
    if (!ringe.length || reihe < 0) continue;
    for (const [rand, schritt] of [
      [ringe[0]!, -1],
      [ringe[ringe.length - 1]!, 1],
    ] as const) {
      const a = plan[rand]!.find((y) => y.id === id)!;
      const d = a.v - natuerlich(rand, reihe);
      for (let k = 1; k <= REIHEN_AUSLAUF; k++) {
        const i = rand + schritt * k;
        if (i < 0 || i >= R) break;
        // Ringe, die die Reihe schon führen (andere Linie, Ecke, Breitenlinie), bleiben
        if (plan[i]!.some((y) => y.reihe === reihe)) break;
        const v = natuerlich(i, reihe) + d * auslauf(k);
        // nur zwischen den Nachbarankern des Rings (Reihen und Höhen monoton)
        const ueber = plan[i]!.filter((y) => y.reihe < reihe);
        const unter = plan[i]!.filter((y) => y.reihe > reihe);
        if (ueber.some((y) => y.v <= v + 1e-6) || unter.some((y) => y.v >= v - 1e-6)) break;
        plan[i]!.push({ v, reihe, haerte: 0, id });
        plan[i]!.sort((x, y) => x.reihe - y.reihe);
      }
    }
  }
}

/**
 * V5: Enden der Querlinien auf Reihen. Eine Querlinie hat ihren eigenen Ring; ihre Falte deckt die Käfigkanten zwischen den
 * Reihen, die sie überspannt — eine kurze Linie (Kegel: 15 % der Höhe) überspannte keine einzige. Je Ende rückt die Reihe, die
 * ihm natürlich am nächsten liegt, im Ring der Linie genau auf das Ende (weicher Anker), in den `REIHEN_AUSLAUF` Ringen
 * daneben anteilig. Beide Enden bekommen verschiedene Reihen; die Breitenlinie nur, wenn keine andere passt.
 */
export function querLinienEnden(plan: Anker[][], natuerlich: (i: number, reihe: number) => number, quer: readonly { ring: number; id: number; vMin: number; vMax: number }[], hOut: number, iBreit: number): void {
  const R = plan.length;
  for (const ql of quer) {
    const i = ql.ring;
    if (!plan[i]) continue;
    const frei = (j: number) => j > 0 && j < hOut && !plan[i]!.some((a) => a.reihe === j && a.haerte > 0);
    const naechste = (v: number, ausser: number) => {
      let best = -1;
      for (let j = 1; j < hOut; j++) {
        if (j === ausser || !frei(j)) continue;
        const d = Math.abs(natuerlich(i, j) - v) + (j === iBreit ? 0.05 : 0);
        if (best < 0 || d < Math.abs(natuerlich(i, best) - v) + (best === iBreit ? 0.05 : 0)) best = j;
      }
      return best;
    };
    // nur kurze Linien (weniger als `QUER_KURZ` Reihenabstände): lange enden auf der nächsten Reihe — die gezogenen Endreihen
    // machten nahe den Polen sehr schmale Käfigflächen, die Haut wich dort 2 px (Kugel mit Kreuz)
    const abstand = (natuerlich(i, 1) - natuerlich(i, hOut - 1)) / (hOut - 2);
    if (ql.vMax - ql.vMin >= QUER_KURZ * abstand) continue;
    const oben = naechste(ql.vMax, -1);
    const unten = naechste(ql.vMin, oben);
    if (oben < 0 || unten < 0 || unten <= oben) continue;
    for (const [reihe, v] of [
      [oben, ql.vMax],
      [unten, ql.vMin],
    ] as const) {
      const d = v - natuerlich(i, reihe);
      for (let k = -REIHEN_AUSLAUF; k <= REIHEN_AUSLAUF; k++) {
        const r = i + k;
        if (r < 0 || r >= R) continue;
        const vr = natuerlich(r, reihe) + d * auslauf(Math.abs(k));
        const anker = plan[r]!;
        const alt = anker.findIndex((a) => a.reihe === reihe);
        if (alt >= 0) {
          if (anker[alt]!.haerte > 0) continue;
          anker.splice(alt, 1);
        }
        // nur zwischen den Nachbarankern (Reihen und Höhen monoton)
        if (anker.some((a) => (a.reihe < reihe && a.v <= vr + 1e-6) || (a.reihe > reihe && a.v >= vr - 1e-6))) continue;
        anker.push({ v: vr, reihe, haerte: 0, id: ql.id });
        anker.sort((x, y) => x.reihe - y.reihe);
      }
    }
  }
}

/** V5: Querlinien kürzer als so viele mittlere Reihenabstände ziehen Reihen auf ihre Enden */
const QUER_KURZ = 1.5;

/** V5: kleinster Abstand zweier Anker je Reihe Unterschied (Anteil des mittleren Reihenabstands 1/hOut) */
const ANKER_ABSTAND = 0.5;

/**
 * V5: Abstand der Reihen an Linien. Kommt eine Linie der Breitenlinie (oder einem Auslauf-Anker) nahe, fielen zwei Reihen fast
 * zusammen (Hals: Linienanfang 1,8 px über der Breitenlinie, Falte 142°). In Ringen mit Linienankern rücken weiche Anker
 * (ohne Härte) von harten Ankern weg, bis je Reihe Unterschied `ANKER_ABSTAND / hOut` frei ist; harte bleiben, wo sie sind.
 */
export function reihenAbstand(plan: Anker[][], hOut: number): void {
  const g = ANKER_ABSTAND / hOut;
  for (const anker of plan) {
    if (!anker.some((a) => a.id !== undefined && a.id >= LINIE_ID)) continue;
    anker.sort((x, y) => x.reihe - y.reihe);
    for (const a of anker) {
      if (a.haerte > 0) continue;
      // Grenzen aus den harten Ankern darüber (größeres v) und darunter
      let hi = 1 - g * a.reihe;
      let lo = g * (hOut - a.reihe);
      for (const b of anker) {
        if (b === a || !(b.haerte > 0)) continue;
        if (b.reihe < a.reihe) hi = Math.min(hi, b.v - g * (a.reihe - b.reihe));
        else if (b.reihe > a.reihe) lo = Math.max(lo, b.v + g * (b.reihe - a.reihe));
      }
      a.v = hi >= lo ? Math.min(hi, Math.max(lo, a.v)) : (hi + lo) / 2;
    }
  }
}

/**
 * Profil abtasten: `hOut` Intervalle von der Naht oben (v = 1, Reihe 0) zur Naht unten (v = 0, Reihe `hOut`); jeder Anker liegt
 * genau auf seiner Reihe, dazwischen nach Bogenlänge in wahren Maßen (längs der Sprosse v·L, quer z). Anker mit Härte werden
 * Knoten der Vorlage (Längsfalten). `vStern` = Höhe der Breitenlinie (Anker auf Reihe `iBreit`).
 */
export function profilAbtastenAnker(pr: HuellenProfil, hOut: number, anker: readonly Anker[], iBreit: number): HuellenSchnitt {
  const { L } = pr;
  const v = Array.from(pr.v);
  const z = Array.from(pr.z);
  const front = Array.from(pr.front);
  const top = Array.from(pr.top);
  // Anker als eigene Proben (Index je Anker)
  const einfuegen = (va: number): number => {
    let k = v.findIndex((x) => x <= va + 1e-12);
    if (k < 0) k = v.length - 1;
    if (Math.abs(v[k]! - va) <= 1e-9) return k;
    const f = (v[k - 1]! - va) / (v[k - 1]! - v[k]!);
    v.splice(k, 0, va);
    z.splice(k, 0, z[k - 1]! + (z[k]! - z[k - 1]!) * f);
    front.splice(k, 0, front[k - 1]! & front[k]!);
    top.splice(k, 0, top[k - 1]! & top[k]!);
    return k;
  };
  const punkte = [...anker].sort((a, b) => a.reihe - b.reihe);
  for (const a of punkte) einfuegen(a.v);
  const kVon = (va: number) => v.findIndex((x) => Math.abs(x - va) <= 1e-9);
  const stuetzen: { k: number; reihe: number; haerte: number }[] = [{ k: 0, reihe: 0, haerte: 0 }, ...punkte.map((a) => ({ k: kVon(a.v), reihe: a.reihe, haerte: a.haerte })), { k: v.length - 1, reihe: hOut, haerte: 0 }];
  const cum = [0];
  for (let k = 1; k < v.length; k++) cum.push(cum[k - 1]! + Math.hypot((v[k]! - v[k - 1]!) * L, z[k]! - z[k - 1]!));
  const alle: { v: number; z: number; dicht: number }[] = [{ v: v[0]!, z: z[0]!, dicht: 0 }];
  const knoten: number[] = [];
  const haerte: number[] = [];
  for (let t = 0; t + 1 < stuetzen.length; t++) {
    const a = stuetzen[t]!;
    const b = stuetzen[t + 1]!;
    const m = b.reihe - a.reihe;
    for (let s2 = 1; s2 <= m; s2++) {
      if (s2 === m) {
        alle.push({ v: v[b.k]!, z: z[b.k]!, dicht: b.k });
        continue;
      }
      const ziel = cum[a.k]! + ((cum[b.k]! - cum[a.k]!) * s2) / m;
      let i = a.k;
      while (i + 1 < b.k && cum[i + 1]! < ziel) i++;
      const d = cum[i + 1]! - cum[i]!;
      const f = d > 1e-15 ? Math.min(1, Math.max(0, (ziel - cum[i]!) / d)) : 0;
      alle.push({ v: v[i]! + (v[i + 1]! - v[i]!) * f, z: z[i]! + (z[i + 1]! - z[i]!) * f, dicht: f < 0.5 ? i : i + 1 });
    }
    if (b.haerte > 0 && b.reihe < hOut) {
      knoten.push(b.reihe);
      haerte.push(b.haerte);
    }
  }
  const W = pr.W > 0 ? pr.W : 1;
  const q: Schnittvorlage = { v: [], w: [], haerte, knoten };
  const fr = new Uint8Array(alle.length);
  const tp = new Uint8Array(alle.length);
  alle.forEach((a, j) => {
    q.v.push(a.v);
    q.w.push(Math.max(0, a.z / W));
    fr[j] = front[a.dicht]!;
    tp[j] = top[a.dicht]!;
  });
  q.v[0] = 1;
  q.v[q.v.length - 1] = 0;
  q.w[0] = 0;
  q.w[q.w.length - 1] = 0;
  fr[0] = fr[fr.length - 1] = 0;
  tp[0] = tp[tp.length - 1] = 0;
  const breit = punkte.find((a) => a.reihe === iBreit);
  return { q, W, vStern: breit ? breit.v : NaN, front: fr, top: tp, dicht: { v: Float64Array.from(v), z: Float64Array.from(z), zeile: Int32Array.from(alle, (a) => a.dicht) } };
}

/** Profil abtasten mit der Breitenlinie auf `vReihe` und den eigenen Merkmalen (einzelner Ring; die Kette nimmt `reihenplan`). */
export function profilAbtasten(pr: HuellenProfil, hOut: number, iBreit: number, vReihe: number): HuellenSchnitt {
  return profilAbtastenAnker(pr, hOut, reihenplan([pr], [vReihe], hOut, iBreit)[0]!, iBreit);
}

/** Schnitt eines einzelnen Rings (Breitenlinie an seiner eigenen breitesten Stelle). */
export function huellenSchnitt(sp: Sprosse, breiten: Breiten, p: { oben: number; unten: number }, ecken: readonly FrontEcke[], hOut: number, iBreit: number, form?: (v: number) => number): HuellenSchnitt {
  const pr = huellenProfil(sp, breiten, p, ecken, form);
  return profilAbtasten(pr, hOut, iBreit, pr.vBest);
}
