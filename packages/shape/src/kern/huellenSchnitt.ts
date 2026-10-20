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
 * Schärfe des weichen Maximums für die Spitze der Rundung (Gewicht (b/W)^SCHAERFE): Nahe den Enden ist eine Sprosse leicht
 * geneigt, die Breite des Tops ändert sich längs ihr um einige Prozent — die Mitte des Plateaus sprang dann ans Ende (Ei
 * hinten: 0,48 → 0,15, Falte 3,5° → 8,2°). Das weiche Maximum bleibt in der Mitte einer fast ebenen Hülle.
 */
const SCHAERFE = 20;
/** Ecken der Front, die näher als dieser Anteil an einem Nahtende liegen, sind keine Stützstellen (sie liegen auf der Naht) */
const ECKE_RAND = 0.02;

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
  /** Härte einer gezeichneten Ecke der Front an dieser Probe (−1 = keine; nur, wo die Front den Schnitt trägt) */
  ecke: Float64Array;
  /** größte Breite */
  W: number;
  /** Mitte des Plateaus der größten Breite (geklemmt) */
  vBest: number;
};

type Probe = { v: number; b: number; front: boolean; top: boolean; ecke: number; drin: boolean };

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
  /** größte Breite der Hülle (aus Proben in beiden Umrissen) */
  W: number;
  /** Spitze der Rundung: weiches Maximum der Hülle (geklemmt) */
  vB: number;
};

/** Hülle entlang einer Sprosse (Kopf der Datei): an jeder Höhe die kleinere Breite aus Front und Top. */
export function huelleEntlang(sp: Sprosse, breiten: Breiten, ecken: readonly FrontEcke[]): Huelle {
  const L = Math.max(1e-9, Math.hypot(sp.o.x - sp.u.x, sp.o.y - sp.u.y));
  const rund = 0.5 * L;
  const dy = sp.o.y - sp.u.y;
  // dichte Proben von oben nach unten, dazu die Höhen gezeichneter Ecken (genau getroffen)
  const proben: Probe[] = [];
  for (let k = 0; k <= DICHTE; k++) proben.push({ v: 1 - k / DICHTE, b: 0, front: false, top: false, ecke: -1, drin: false });
  if (Math.abs(dy) > 1e-9) {
    for (const e of ecken) {
      const vc = (e.y - sp.u.y) / dy;
      if (vc > ECKE_RAND && vc < 1 - ECKE_RAND) proben.push({ v: vc, b: 0, front: false, top: false, ecke: e.haerte, drin: false });
    }
  }
  proben.sort((a, b) => b.v - a.v);
  for (let k = proben.length - 1; k > 0; k--) {
    if (proben[k - 1]!.v - proben[k]!.v < 1e-7) {
      proben[k - 1]!.ecke = Math.max(proben[k - 1]!.ecke, proben[k]!.ecke);
      proben.splice(k, 1);
    }
  }
  // Sichthülle je Probe; W nur aus Proben in beiden Umrissen
  let W = 0;
  let drin = 0;
  for (const q of proben) {
    const x = sp.u.x + (sp.o.x - sp.u.x) * q.v;
    const y = sp.u.y + dy * q.v;
    const f = breiten.front(y);
    const t = breiten.top(x);
    const fw = f > 0 ? f : Infinity;
    const tw = t > 0 ? t : Infinity;
    q.b = Math.min(fw, tw);
    q.front = f > 0 && f <= tw;
    q.top = t > 0 && t < fw;
    q.drin = f > 0 && t > 0;
    if (q.drin) {
      W = Math.max(W, q.b);
      drin++;
    }
  }
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
  // Spitze der Rundung: weiches Maximum der Hülle
  let sg = 0;
  let sv = 0;
  for (const q of proben) {
    const g = Math.pow(Math.min(1, q.b / W), SCHAERFE);
    sg += g;
    sv += g * q.v;
  }
  return {
    sp,
    L,
    v: Float64Array.from(proben, (q) => q.v),
    b: Float64Array.from(proben, (q) => q.b),
    front: Uint8Array.from(proben, (q) => (q.front ? 1 : 0)),
    top: Uint8Array.from(proben, (q) => (q.top ? 1 : 0)),
    ecke: Float64Array.from(proben, (q) => q.ecke),
    W,
    vB: Math.min(1 - RAND, Math.max(RAND, sg > 0 ? sv / sg : 0.5)),
  };
}

/** Rundung der Hülle bei v: Superellipse (Exponenten `p` über/unter der Spitze vB), Höhe W, an beiden Nähten geschlossen. */
export function rundungBei(h: Huelle, p: { oben: number; unten: number }, v: number): number {
  const oben = v >= h.vB;
  const eta = oben ? (v - h.vB) / (1 - h.vB) : (h.vB - v) / h.vB;
  if (eta >= 1) return 0;
  if (eta <= 0) return h.W;
  const e = oben ? p.oben : p.unten;
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
    // Ecken nur, wo der Schnitt die Front trägt (sonst rundet die Rundung sie weg)
    if (h.ecke[k]! >= 0 && front[k]) ecke[k] = h.ecke[k]!;
  }
  return { L: h.L, v: h.v, z, b: h.b, front, top, ecke, W: Wz, vBest: Math.min(1 - RAND, Math.max(RAND, plateauMitte(z, Wz, (k) => h.v[k]!))) };
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
const BREITEN_STUFEN = 81;
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
  const vk = Array.from({ length: K }, (_, k) => RAND + ((1 - 2 * RAND) * k) / (K - 1));
  const kosten = profile.map((pr) => vk.map((v) => (pr.W > 0 ? 1 - profilBei(pr, v) / pr.W : 0)));
  let summe = kosten[0]!.slice();
  const zurueck: Int32Array[] = [];
  for (let i = 1; i < n; i++) {
    const neu = new Array<number>(K);
    const zr = new Int32Array(K);
    for (let k = 0; k < K; k++) {
      let best = Infinity;
      let wahl = 0;
      for (let m = 0; m < K; m++) {
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

/**
 * Profil abtasten: `hOut` Intervalle von der Naht oben (v = 1) zur Naht unten (v = 0), Stützstelle `iBreit` auf der Höhe
 * `vReihe` (Breitenlinie), nach Bogenlänge in wahren Maßen (längs der Sprosse v·L, quer z), gezeichnete Ecken auf Stützstellen.
 */
export function profilAbtasten(pr: HuellenProfil, hOut: number, iBreit: number, vReihe: number): HuellenSchnitt {
  const { L } = pr;
  // Proben mit der Reihenhöhe als eigener Probe
  const v = Array.from(pr.v);
  const z = Array.from(pr.z);
  const front = Array.from(pr.front);
  const top = Array.from(pr.top);
  const ecke = Array.from(pr.ecke);
  let kS = v.findIndex((x) => x <= vReihe + 1e-12);
  if (Math.abs(v[kS]! - vReihe) > 1e-9) {
    const f = (v[kS - 1]! - vReihe) / (v[kS - 1]! - v[kS]!);
    v.splice(kS, 0, vReihe);
    z.splice(kS, 0, z[kS - 1]! + (z[kS]! - z[kS - 1]!) * f);
    front.splice(kS, 0, front[kS - 1]! & front[kS]!);
    top.splice(kS, 0, top[kS - 1]! & top[kS]!);
    ecke.splice(kS, 0, -1);
  }
  const teil = (von: number, bis: number, m: number): { v: number; z: number; ecke: number; dicht: number }[] => {
    const cum = [0];
    for (let k = von + 1; k <= bis; k++) cum.push(cum[cum.length - 1]! + Math.hypot((v[k]! - v[k - 1]!) * L, z[k]! - z[k - 1]!));
    let anker = [0];
    for (let i = 1; von + i < bis; i++) if (ecke[von + i]! >= 0) anker.push(i);
    anker.push(bis - von);
    // mehr Teilstücke als Intervalle: die kürzesten verschmelzen (Ecke fällt weg)
    while (anker.length - 1 > Math.max(1, m)) {
      let kurz = 1;
      let kurzL = Infinity;
      for (let t = 1; t + 1 < anker.length; t++) {
        const l = cum[anker[t + 1]!]! - cum[anker[t - 1]!]!;
        if (l < kurzL) {
          kurzL = l;
          kurz = t;
        }
      }
      anker = anker.filter((_, t) => t !== kurz);
    }
    const laengen = anker.slice(1).map((a, t) => cum[a]! - cum[anker[t]!]!);
    const anteile = verteilen(laengen, Math.max(1, m));
    const out: { v: number; z: number; ecke: number; dicht: number }[] = [{ v: v[von]!, z: z[von]!, ecke: -1, dicht: von }];
    for (let t = 0; t + 1 < anker.length; t++) {
      const a0 = anker[t]!;
      const a1 = anker[t + 1]!;
      const mm = anteile[t]!;
      for (let s = 1; s <= mm; s++) {
        const ziel = cum[a0]! + ((cum[a1]! - cum[a0]!) * s) / mm;
        let i = a0;
        while (i + 1 < a1 && cum[i + 1]! < ziel) i++;
        const d = cum[i + 1]! - cum[i]!;
        const f = d > 1e-15 ? Math.min(1, Math.max(0, (ziel - cum[i]!) / d)) : 0;
        const k0 = von + i;
        const k1 = von + i + 1;
        const ende = s === mm;
        out.push({ v: v[k0]! + (v[k1]! - v[k0]!) * f, z: z[k0]! + (z[k1]! - z[k0]!) * f, ecke: ende && t + 2 < anker.length ? ecke[von + a1]! : -1, dicht: f < 0.5 ? k0 : k1 });
      }
    }
    return out;
  };
  const alle = [...teil(0, kS, iBreit), ...teil(kS, v.length - 1, hOut - iBreit).slice(1)];
  const W = pr.W > 0 ? pr.W : 1;
  const q: Schnittvorlage = { v: [], w: [], haerte: [], knoten: [] };
  const fr = new Uint8Array(alle.length);
  const tp = new Uint8Array(alle.length);
  alle.forEach((a, j) => {
    q.v.push(a.v);
    q.w.push(Math.max(0, a.z / W));
    if (a.ecke > 0) {
      q.knoten.push(j);
      q.haerte.push(a.ecke);
    }
    fr[j] = front[a.dicht]!;
    tp[j] = top[a.dicht]!;
  });
  q.v[0] = 1;
  q.v[q.v.length - 1] = 0;
  q.w[0] = 0;
  q.w[q.w.length - 1] = 0;
  fr[0] = fr[fr.length - 1] = 0;
  tp[0] = tp[tp.length - 1] = 0;
  return { q, W, vStern: vReihe, front: fr, top: tp };
}

/** Schnitt eines einzelnen Rings (Breitenlinie an seiner eigenen breitesten Stelle). */
export function huellenSchnitt(sp: Sprosse, breiten: Breiten, p: { oben: number; unten: number }, ecken: readonly FrontEcke[], hOut: number, iBreit: number, form?: (v: number) => number): HuellenSchnitt {
  const pr = huellenProfil(sp, breiten, p, ecken, form);
  return profilAbtasten(pr, hOut, iBreit, pr.vBest);
}

/** h Intervalle auf Teilstücke nach Länge, mindestens eines je Teilstück; Rest dort, wo die Intervalle am längsten bzw. kürzesten sind. */
function verteilen(laengen: readonly number[], h: number): number[] {
  const summe = laengen.reduce((a, b) => a + b, 0) || 1;
  const anteile = laengen.map((l) => Math.max(1, Math.round((h * l) / summe)));
  let diff = anteile.reduce((a, b) => a + b, 0) - h;
  while (diff !== 0) {
    let wahl = -1;
    for (let i = 0; i < anteile.length; i++) {
      const je = laengen[i]! / anteile[i]!;
      if (diff > 0) {
        if (anteile[i]! > 1 && (wahl < 0 || je < laengen[wahl]! / anteile[wahl]!)) wahl = i;
      } else if (wahl < 0 || je > laengen[wahl]! / anteile[wahl]!) wahl = i;
    }
    if (wahl < 0) break;
    anteile[wahl]! += diff > 0 ? -1 : 1;
    diff += diff > 0 ? -1 : 1;
  }
  return anteile;
}
