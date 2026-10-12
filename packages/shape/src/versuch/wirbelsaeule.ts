// VERSUCH (12.10.2026 abends): Wirbelsäule statt Ringen entlang x. Florian: „Wie soll das Wirbelsäulensystem aussehen?
// Ein Hals nach oben mit Kopf darauf muss auch gehen!“
//
// 1. Der Seitenumriss wird an Schnauzen- und Schwanzspitze in Rückenlinie (oben) und Bauchlinie (unten) geteilt.
// 2. Sprossen: die kürzeste Leiter zwischen beiden Linien (dynamische Programmierung, monoton, kreuzt sich nie). Über dem
//    Rumpf stehen die Sprossen senkrecht, im Hals waagerecht, im Kopf wieder senkrecht.
// 3. Wirbelsäule = Mitte der Sprossen (geglättet). Jeder Ring steht auf einer Sprosse: oben auf der Rückenlinie, unten auf
//    der Bauchlinie, dazwischen die Flanke mit der Breite w.
// 4. Breite je Ring aus der Ansicht, die ihn von der Kante sieht: liegende Teile (Rumpf, Kopf) aus dem Top, stehende
//    (Hals) aus der Front. Rechnerisch die kleinere der beiden Breiten an der Flanke (beide Umrisse sind Hüllen).
// 5. Querschnitt: zwei Viertelellipsen oben und unten, die Flanke (breiteste Stelle) in der Höhe c. Liegende Teile holen c
//    aus der Front in ihrem Höhenbereich (Birnenbauch, Eierkopf), stehende sind rund (c = ½).
// 6. Ein Catmull-Clark-Käfig: Ringe entlang der Wirbelsäule, an beiden Spitzen ein Pol; angepasst, bis die Grenzfläche
//    die Ringe und die Spitzen trifft. (Eine flache Schnauzenfront wie beim Tiger bräuchte eine Kappe; das Maul bringt
//    später seine eigene Kopf-Topologie mit.)

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { angleichen } from '../kopplung';
import { vorlageBei } from '../spanten';
import { pfadAbtasten, vollerPfad } from '../profil';
import type { Netz, V3 } from './catmullClark';
import { anZielAnpassen } from './tigerKaefig';

export type WirbelOptionen = {
  /** Anzahl Ringe */
  ringe: number;
  /** Punkte je Ring (Vielfaches von 4) */
  ring: number;
  stufen: number;
  iterationen: number;
  /** Abtastpunkte je Linie für die Leiter */
  proben: number;
  /** Glättung der Zuordnung (Anteil der Probenzahl) */
  glaettung: number;
  /** Rundheit des Querschnitts (2 = Ellipse, größer = kastiger) */
  fuelle: number;
  /** Glättung der Wirbelsäule (Anteil der Länge, Gauß σ) */
  achsGlaettung: number;
};

export const WIRBEL_STANDARD: WirbelOptionen = { ringe: 44, ring: 16, stufen: 3, iterationen: 8, proben: 260, glaettung: 0.025, fuelle: 2, achsGlaettung: 0.03 };

export type Sprosse = {
  /** Punkt auf der Rückenlinie bzw. Bauchlinie (Seitenansicht) */
  oben: V2;
  unten: V2;
  /** 1 = liegend (Breite aus dem Top), 0 = stehend (Breite aus der Front) */
  liegend: number;
  /** halbe Breite an der Flanke */
  breite: number;
  /** Höhe der Flanke zwischen unten (0) und oben (1) */
  flanke: number;
  /** woher die Breite kommt */
  quelle: 'top' | 'front' | 'ersatz';
  /**
   * Querschnitt-Vorlage der rechten Hälfte (oben → unten, Breite 0 … 1, Höhe 1 … 0), wenn das Wesen ganz liegt: die
   * gezeichnete Front samt Spanten wie im bisherigen Loft. Fehlt sie, ist der Querschnitt oval mit der Flanke in `flanke`.
   */
  vorlage?: V2[];
};

export type WirbelKaefig = {
  netz: Netz;
  ziel: V3[];
  /** Wirbelsäule in der Seitenansicht (Mitte der Sprossen, geglättet) */
  wirbel: V2[];
  sprossen: Sprosse[];
  ringPunkt: (i: number, j: number) => number;
  hinweise: string[];
};

// ---------- 2D-Hilfen ----------

const abstand = (a: V2, b: V2) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp2 = (a: V2, b: V2, t: number): V2 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Polygonzug gleichmäßig nach Bogenlänge neu abtasten (n Punkte inkl. Anfang und Ende). */
function nachBogen(zug: readonly V2[], n: number): V2[] {
  const s = [0];
  for (let i = 1; i < zug.length; i++) s.push(s[i - 1]! + abstand(zug[i - 1]!, zug[i]!));
  const L = s[s.length - 1]!;
  const out: V2[] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const ziel = (L * i) / (n - 1);
    while (k < zug.length - 2 && s[k + 1]! < ziel) k++;
    const t = (ziel - s[k]!) / (s[k + 1]! - s[k]! || 1);
    out.push(lerp2(zug[k]!, zug[k + 1]!, Math.min(1, Math.max(0, t))));
  }
  return out;
}

/** Punkt bei Anteil a ∈ [0, 1] eines gleichmäßig abgetasteten Zugs. */
function beiAnteil(zug: readonly V2[], a: number): V2 {
  const f = Math.min(1, Math.max(0, a)) * (zug.length - 1);
  const i = Math.min(zug.length - 2, Math.floor(f));
  return lerp2(zug[i]!, zug[i + 1]!, f - i);
}

/** Größte halbe Breite eines geschlossenen Umrisses auf der Linie `achse` = wert (x: senkrechte Linie, y: waagerechte). */
function halbeBreite(umriss: readonly V2[], achse: 'x' | 'y', wert: number): number | null {
  let best: number | null = null;
  for (let i = 0; i < umriss.length; i++) {
    const a = umriss[i]!;
    const b = umriss[(i + 1) % umriss.length]!;
    const ua = achse === 'x' ? a.x : a.y;
    const ub = achse === 'x' ? b.x : b.y;
    if ((ua - wert) * (ub - wert) > 0 || ua === ub) continue;
    const t = (wert - ua) / (ub - ua);
    const v = Math.abs(achse === 'x' ? a.y + (b.y - a.y) * t : a.x + (b.x - a.x) * t);
    best = best === null ? v : Math.max(best, v);
  }
  return best;
}

const glatt01 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** gleitender Mittelwert (Ränder fest) */
function geglaettet(werte: readonly number[], halb: number): number[] {
  if (halb < 1) return [...werte];
  return werte.map((_, i) => {
    if (i === 0 || i === werte.length - 1) return werte[i]!;
    const h = Math.min(halb, i, werte.length - 1 - i);
    let s = 0;
    for (let k = i - h; k <= i + h; k++) s += werte[k]!;
    return s / (2 * h + 1);
  });
}

// ---------- 1.–3. Linien, Leiter, Wirbelsäule ----------

export type Leiter = { ruecken: V2[]; bauch: V2[]; paare: { a: number; b: number }[] };

/** Seitenumriss → Rücken- und Bauchlinie (beide von der Schnauzen- zur Schwanzspitze) und die kürzeste Leiter. */
export function leiter(dok: Dokument, opt: WirbelOptionen = WIRBEL_STANDARD): Leiter {
  let roh = pfadAbtasten(vollerPfad(dok.profile.seite), 40);
  if (abstand(roh[0]!, roh[roh.length - 1]!) < 1e-9) roh = roh.slice(0, -1);
  const um = nachBogen([...roh, roh[0]!], 1200).slice(0, -1);
  // Spitzen: vorn = kleinstes x, hinten = größtes x
  let iv = 0;
  let ih = 0;
  um.forEach((p, i) => {
    if (p.x < um[iv]!.x) iv = i;
    if (p.x > um[ih]!.x) ih = i;
  });
  const kette = (schritt: 1 | -1) => {
    const out: V2[] = [];
    for (let i = iv; ; i = (i + schritt + um.length) % um.length) {
      out.push(um[i]!);
      if (i === ih) break;
    }
    return out;
  };
  const a = kette(1);
  const b = kette(-1);
  const mittelY = (z: V2[]) => z.reduce((s, p) => s + p.y, 0) / z.length;
  const [obenRoh, untenRoh] = mittelY(a) >= mittelY(b) ? [a, b] : [b, a];
  const P = opt.proben;
  const ruecken = nachBogen(obenRoh, P);
  const bauch = nachBogen(untenRoh, P);

  // Kürzeste Leiter (Zeitverzerrung): Summe der Sprossenlängen, Schritte (1,0), (0,1), (1,1)
  const D = new Float64Array(P * P).fill(Infinity);
  const kosten = (i: number, j: number) => abstand(ruecken[i]!, bauch[j]!);
  D[0] = 0;
  for (let i = 0; i < P; i++) {
    for (let j = 0; j < P; j++) {
      if (i === 0 && j === 0) continue;
      let m = Infinity;
      if (i > 0) m = Math.min(m, D[(i - 1) * P + j]!);
      if (j > 0) m = Math.min(m, D[i * P + j - 1]!);
      if (i > 0 && j > 0) m = Math.min(m, D[(i - 1) * P + j - 1]!);
      D[i * P + j] = m + kosten(i, j);
    }
  }
  const pfad: { a: number; b: number }[] = [];
  let i = P - 1;
  let j = P - 1;
  pfad.push({ a: i, b: j });
  while (i > 0 || j > 0) {
    const kand: [number, number][] = [];
    if (i > 0 && j > 0) kand.push([i - 1, j - 1]);
    if (i > 0) kand.push([i - 1, j]);
    if (j > 0) kand.push([i, j - 1]);
    let best = kand[0]!;
    for (const k of kand) if (D[k[0] * P + k[1]]! < D[best[0] * P + best[1]]!) best = k;
    [i, j] = best;
    pfad.push({ a: i, b: j });
  }
  pfad.reverse();
  // Treppen glätten (Anteile entlang beider Linien), Enden fest, monoton
  const h = Math.max(1, Math.round(opt.glaettung * P));
  const as = geglaettet(pfad.map((p) => p.a / (P - 1)), h);
  const bs = geglaettet(pfad.map((p) => p.b / (P - 1)), h);
  const paare = as.map((x, k) => ({ a: x, b: bs[k]! }));
  for (let k = 1; k < paare.length; k++) {
    paare[k]!.a = Math.max(paare[k]!.a, paare[k - 1]!.a);
    paare[k]!.b = Math.max(paare[k]!.b, paare[k - 1]!.b);
  }
  return { ruecken, bauch, paare };
}

// ---------- 4.–6. Ringe und Käfig ----------

export function wirbelKaefig(dokRoh: Dokument, opt: WirbelOptionen = WIRBEL_STANDARD): WirbelKaefig {
  const hinweise: string[] = [];
  // Ausdehnungen der Ansichten stimmig machen (wie der Editor beim Laden), sonst ragt z. B. das Top vor die Schnauze
  const dok: Dokument = { ...dokRoh, profile: angleichen(dokRoh.profile) };
  const { ruecken, bauch, paare } = leiter(dok, opt);
  const N = opt.ringe;

  // Wirbelsäule: Mitten der Leiter, gleichmäßig abgetastet und geglättet. An beiden Enden ein gerades Stück zur Spitze,
  // damit die Ringe dort wie Breitenkreise um den Pol liegen (die Leiter allein dreht sich an den Spitzen im Fächer).
  const mitteRoh = paare.map((p) => lerp2(beiAnteil(ruecken, p.a), beiAnteil(bauch, p.b), 0.5));
  const dickeRoh = paare.map((p) => abstand(beiAnteil(ruecken, p.a), beiAnteil(bauch, p.b)));
  const M = 400;
  const achseRoh = nachBogen([ruecken[0]!, ...mitteRoh, ruecken[ruecken.length - 1]!], M);
  const sigma = Math.max(1, Math.round(opt.achsGlaettung * M));
  const kern = Array.from({ length: 2 * 3 * sigma + 1 }, (_, k) => Math.exp(-(((k - 3 * sigma) / sigma) ** 2) / 2));
  let achse = achseRoh.map((p, i) => {
    if (i === 0 || i === M - 1) return p;
    let sx = 0;
    let sy = 0;
    let sw = 0;
    kern.forEach((w, k) => {
      const j = Math.min(M - 1, Math.max(0, i + k - 3 * sigma));
      sx += w * achseRoh[j]!.x;
      sy += w * achseRoh[j]!.y;
      sw += w;
    });
    return { x: sx / sw, y: sy / sw };
  });
  achse = nachBogen(achse, M);
  const laenge = (z: V2[]) => z.reduce((s, p, i) => (i ? s + abstand(z[i - 1]!, p) : 0), 0);
  const C = laenge(achse);
  // Dicke entlang der Achse (aus der Leiter), für gerade Enden und das Tangentenfenster
  const cumRoh = [0];
  for (let k = 1; k < mitteRoh.length; k++) cumRoh.push(cumRoh[k - 1]! + abstand(mitteRoh[k - 1]!, mitteRoh[k]!));
  const dickeBei = (c: number) => {
    const z = (c / C) * cumRoh[cumRoh.length - 1]!;
    let k = 0;
    while (k < cumRoh.length - 2 && cumRoh[k + 1]! < z) k++;
    return dickeRoh[k]!;
  };
  const geradeV = Math.min(0.12 * C, 0.5 * dickeBei(0.15 * C));
  const geradeH = Math.min(0.12 * C, 0.5 * dickeBei(0.85 * C));
  const gv = Math.max(1, Math.round((geradeV / C) * (M - 1)));
  const gh = M - 1 - Math.max(1, Math.round((geradeH / C) * (M - 1)));
  achse = achse.map((p, i) => (i < gv ? lerp2(achse[0]!, achse[gv]!, i / gv) : i > gh ? lerp2(achse[gh]!, achse[M - 1]!, (i - gh) / (M - 1 - gh)) : p));
  const achseBei = (c: number) => beiAnteil(achse, c / C);

  // Strahl p + t·d gegen einen Zug: kleinstes t > 0 und Anteil entlang des Zugs
  const treffer = (p: V2, d: V2, zug: readonly V2[]): { t: number; a: number } | null => {
    let best: { t: number; a: number } | null = null;
    for (let k = 0; k + 1 < zug.length; k++) {
      const a = zug[k]!;
      const b = zug[k + 1]!;
      const e = { x: b.x - a.x, y: b.y - a.y };
      const nenner = d.x * e.y - d.y * e.x;
      if (Math.abs(nenner) < 1e-14) continue;
      const w = { x: a.x - p.x, y: a.y - p.y };
      const t = (w.x * e.y - w.y * e.x) / nenner;
      const u = (w.x * d.y - w.y * d.x) / nenner;
      if (u < -1e-9 || u > 1 + 1e-9 || t <= 1e-9) continue;
      if (!best || t < best.t) best = { t, a: (k + Math.min(1, Math.max(0, u))) / (zug.length - 1) };
    }
    return best;
  };

  // Stationen: dicht an beiden Enden, mit Abstand zu den Spitzen (dort sitzen die Pole)
  const stationen: number[] = [];
  const rand = 0.025;
  for (let i = 0; i < N; i++) stationen.push(C * (rand + ((1 - 2 * rand) * (1 - Math.cos((Math.PI * i) / (N - 1)))) / 2));

  // Umrisse der anderen Ansichten (voll, gespiegelt)
  const top = pfadAbtasten(vollerPfad(dok.profile.top), 32);
  const front = pfadAbtasten(vollerPfad(dok.profile.front), 32);

  // Sprossen: senkrecht zur Wirbelsäule (Tangente über ein Fenster von der halben Dicke), oben bis zur Rückenlinie, unten
  // bis zur Bauchlinie. Monoton entlang beider Linien, damit sich Ringe nie kreuzen.
  let vorA = 0;
  let vorB = 0;
  let ersatzSprossen = 0;
  const roh = stationen.map((c) => {
    const fenster = Math.max(0.02 * C, 0.5 * dickeBei(c));
    const p = achseBei(c);
    const v = achseBei(Math.max(0, c - fenster));
    const n = achseBei(Math.min(C, c + fenster));
    const tl = Math.hypot(n.x - v.x, n.y - v.y) || 1;
    const t = { x: (n.x - v.x) / tl, y: (n.y - v.y) / tl };
    // Normale zur Rückenseite: Drehung der Tangente so, dass sie zur Rückenlinie zeigt
    let nrm = { x: -t.y, y: t.x };
    const probe = treffer(p, nrm, ruecken);
    const gegen = treffer(p, { x: -nrm.x, y: -nrm.y }, ruecken);
    if (!probe || (gegen && gegen.t < probe.t)) nrm = { x: t.y, y: -t.x };
    const o = treffer(p, nrm, ruecken);
    const u = treffer(p, { x: -nrm.x, y: -nrm.y }, bauch);
    let a = o ? o.a : vorA;
    let b = u ? u.a : vorB;
    if (!o || !u) ersatzSprossen++;
    a = Math.max(a, vorA);
    b = Math.max(b, vorB);
    vorA = a;
    vorB = b;
    const oben = beiAnteil(ruecken, a);
    const unten = beiAnteil(bauch, b);
    const d = { x: oben.x - unten.x, y: oben.y - unten.y };
    // Winkel der Sprosse zur Senkrechten: 0° = senkrecht (Teil liegt), 90° = waagerecht (Teil steht)
    const phi = (Math.atan2(Math.abs(d.x), Math.abs(d.y)) * 180) / Math.PI;
    return { oben, unten, liegend: 1 - glatt01(35, 55, phi) };
  });
  if (ersatzSprossen) hinweise.push(`${ersatzSprossen} Sprossen ohne Treffer (Wirbelsäule außerhalb des Umrisses?)`);
  const liegend = geglaettet(
    roh.map((s) => s.liegend),
    2,
  );

  // Flankenhöhe liegender Abschnitte aus der Front: breiteste Stelle im Höhenbereich des Abschnitts
  const abschnitte: { von: number; bis: number; c: number }[] = [];
  for (let i = 0; i < N; ) {
    if (liegend[i]! < 0.5) {
      i++;
      continue;
    }
    let k = i;
    while (k + 1 < N && liegend[k + 1]! >= 0.5) k++;
    let lo = Infinity;
    let hi = -Infinity;
    for (let m = i; m <= k; m++) {
      lo = Math.min(lo, roh[m]!.unten.y, roh[m]!.oben.y);
      hi = Math.max(hi, roh[m]!.unten.y, roh[m]!.oben.y);
    }
    let bestY = (lo + hi) / 2;
    let bestW = -1;
    for (let s = 0; s <= 60; s++) {
      const y = lo + ((hi - lo) * s) / 60;
      const w = halbeBreite(front, 'y', y) ?? 0;
      if (w > bestW + 1e-9) {
        bestW = w;
        bestY = y;
      }
    }
    const c = Math.min(0.8, Math.max(0.2, (bestY - lo) / (hi - lo || 1)));
    abschnitte.push({ von: i, bis: k, c });
    i = k + 1;
  }
  const cLiegend = (i: number) => {
    let best = 0.5;
    let d = Infinity;
    for (const a of abschnitte) {
      const e = i < a.von ? a.von - i : i > a.bis ? i - a.bis : 0;
      if (e < d) {
        d = e;
        best = a.c;
      }
    }
    return best;
  };

  // Breite je Ring an der Flanke: kleinere der beiden Umrissbreiten
  let ersatz = 0;
  const sprossenRoh: Sprosse[] = roh.map((s, i) => {
    const flanke = liegend[i]! * cLiegend(i) + (1 - liegend[i]!) * 0.5;
    const q = lerp2(s.unten, s.oben, flanke);
    const wt = halbeBreite(top, 'x', q.x);
    const wf = halbeBreite(front, 'y', q.y);
    const h = abstand(s.oben, s.unten);
    let breite: number;
    let quelle: Sprosse['quelle'];
    if (wt === null && wf === null) {
      breite = h / 2;
      quelle = 'ersatz';
      ersatz++;
    } else if (wf === null || (wt !== null && wt <= wf)) {
      breite = wt!;
      quelle = 'top';
    } else {
      breite = wf;
      quelle = 'front';
    }
    return { oben: s.oben, unten: s.unten, liegend: liegend[i]!, breite: Math.max(breite, 0.08 * h), flanke, quelle };
  });
  if (ersatz) hinweise.push(`${ersatz} Ringe ohne Breite in Top und Front (Ersatz: halbe Höhe)`);
  const bG = geglaettet(
    sprossenRoh.map((s) => s.breite),
    1,
  );
  const fG = geglaettet(
    sprossenRoh.map((s) => s.flanke),
    2,
  );
  const sprossen = sprossenRoh.map((s, i) => ({ ...s, breite: bG[i]!, flanke: fG[i]! }));
  // An den Spitzen läuft der Querschnitt mit gleichem Seitenverhältnis aus (sonst entstehen flache Flossen, wo Top und
  // Seite an der Spitze nicht genau zusammenpassen)
  const zone = 0.07 * C;
  const verhaeltnis = (i: number) => sprossen[i]!.breite / Math.max(1e-9, abstand(sprossen[i]!.oben, sprossen[i]!.unten));
  let iv = 0;
  while (iv < N - 1 && stationen[iv]! < zone) iv++;
  let ih = N - 1;
  while (ih > 0 && stationen[ih]! > C - zone) ih--;
  const rv = verhaeltnis(iv);
  const rh = verhaeltnis(ih);
  for (let i = 0; i < N; i++) {
    const h = abstand(sprossen[i]!.oben, sprossen[i]!.unten);
    if (i < iv) sprossen[i]!.breite = Math.min(sprossen[i]!.breite, rv * h);
    if (i > ih) sprossen[i]!.breite = Math.min(sprossen[i]!.breite, rh * h);
  }

  // Liegt das ganze Wesen (kein stehender Ring), gilt die gezeichnete Front samt Spanten als Querschnitt wie im
  // bisherigen Loft (Stelle f nach der Lage des Rings in x). Mit stehenden Teilen ist die Front ein Umriss aus Rumpf,
  // Hals und Kopf und taugt nicht als Querschnitt; dann bleiben die Ringe oval.
  if (!sprossen.some((s) => s.liegend < 0.5)) {
    let xMin = Infinity;
    let xMax = -Infinity;
    for (const q of ruecken) {
      xMin = Math.min(xMin, q.x);
      xMax = Math.max(xMax, q.x);
    }
    sprossen.forEach((s, i) => {
      const mx = (s.oben.x + s.unten.x) / 2;
      const f = Math.min(1, Math.max(0, (mx - xMin) / (xMax - xMin || 1)));
      const q = vorlageBei(dok, f, opt.ring / 2).q;
      let jMax = 0;
      q.forEach((p, j) => {
        if (p.x > q[jMax]!.x) jMax = j;
      });
      const flanke = q[jMax]!.y;
      const fl = lerp2(s.unten, s.oben, flanke);
      const wt = halbeBreite(top, 'x', fl.x);
      const wf = halbeBreite(front, 'y', fl.y);
      const h = abstand(s.oben, s.unten);
      const w = Math.min(wt ?? Infinity, wf ?? Infinity);
      sprossen[i] = { ...s, vorlage: q, flanke, breite: Number.isFinite(w) ? Math.max(w, 0.08 * h) : s.breite };
    });
    // Spitzen wie oben: gleiches Seitenverhältnis
    for (let i = 0; i < N; i++) {
      const h = abstand(sprossen[i]!.oben, sprossen[i]!.unten);
      if (i < iv) sprossen[i]!.breite = Math.min(sprossen[i]!.breite, (sprossen[iv]!.breite / Math.max(1e-9, abstand(sprossen[iv]!.oben, sprossen[iv]!.unten))) * h);
      if (i > ih) sprossen[i]!.breite = Math.min(sprossen[i]!.breite, (sprossen[ih]!.breite / Math.max(1e-9, abstand(sprossen[ih]!.oben, sprossen[ih]!.unten))) * h);
    }
  }

  const wirbel = achse.filter((_, i) => i % 4 === 0 || i === M - 1);
  const k = kaefigAusSprossen(sprossen, ruecken[0]!, ruecken[ruecken.length - 1]!, opt);
  return { ...k, wirbel, sprossen, hinweise };
}

/**
 * Käfig aus den Sprossen (je Ring: Lage in der Seite, Breite, Flankenhöhe) und den beiden Spitzen. Getrennt von der
 * Analyse, damit eine Pose (gebogene Wirbelsäule) nur die Sprossen bewegt und denselben Käfig baut.
 */
export function kaefigAusSprossen(sprossen: readonly Sprosse[], spitzeV: V2, spitze: V2, opt: WirbelOptionen = WIRBEL_STANDARD): { netz: Netz; ziel: V3[]; ringPunkt: (i: number, j: number) => number } {
  const N = sprossen.length;
  const R = opt.ring;
  // Ringpunkte: j = 0 oben (Rückenlinie), R/4 rechts (+z), R/2 unten (Bauchlinie), 3R/4 links
  const exp = 2 / opt.fuelle;
  const potenz = (v: number) => Math.sign(v) * Math.abs(v) ** exp;
  const ringPunkt = (i: number, j: number) => (i - 1) * R + (((j % R) + R) % R);
  const ziel: V3[] = [];
  for (const s of sprossen) {
    // Vorlage aus der Front: Breite auf die breiteste Stelle normiert (dort sitzt die Flanke)
    const v = s.vorlage && s.vorlage.length === R / 2 + 1 ? s.vorlage : null;
    const vMax = v ? Math.max(...v.map((q) => q.x)) || 1 : 1;
    for (let j = 0; j < R; j++) {
      let yn: number;
      let zn: number;
      if (v) {
        const q = v[j <= R / 2 ? j : R - j]!;
        yn = q.y;
        zn = (j <= R / 2 ? 1 : -1) * (q.x / vMax);
      } else {
        const th = (2 * Math.PI * j) / R;
        const co = potenz(Math.cos(th));
        zn = potenz(Math.sin(th));
        yn = co >= 0 ? s.flanke + (1 - s.flanke) * co : s.flanke + s.flanke * co;
      }
      const p = lerp2(s.unten, s.oben, yn);
      ziel.push([p.x, p.y, zn * s.breite]);
    }
  }
  // Pole an den Spitzen: Schnauze vorn, Schwanz hinten
  ziel.push([spitzeV.x, spitzeV.y, 0]);
  const polV = ziel.length - 1;
  ziel.push([spitze.x, spitze.y, 0]);
  const pol = ziel.length - 1;

  const flaechen: number[][] = [];
  for (let j = 0; j < R; j++) flaechen.push([polV, ringPunkt(1, j + 1), ringPunkt(1, j)]);
  for (let i = 1; i < N; i++) for (let j = 0; j < R; j++) flaechen.push([ringPunkt(i, j), ringPunkt(i, j + 1), ringPunkt(i + 1, j + 1), ringPunkt(i + 1, j)]);
  for (let j = 0; j < R; j++) flaechen.push([ringPunkt(N, j), ringPunkt(N, j + 1), pol]);

  const roh3: Netz = { punkte: ziel.map((p) => [...p] as V3), flaechen, schaerfe: new Map<string, number>() };
  const netz = anZielAnpassen(roh3, ziel, opt.iterationen, opt.stufen);
  return { netz, ziel, ringPunkt };
}

// ---------- Pose: Wirbelsäule biegen ----------

/**
 * Biegt die Wirbelsäule wie eine Gelenkkette: Ab der Stelle `bei` (Anteil von der Schnauze, 0 … 1) dreht sich der
 * vordere Teil (Kopf, Hals) um insgesamt `winkel` Grad (positiv = gegen den Uhrzeigersinn in der Seite), verteilt über
 * die Länge `weich`. Abstände entlang der Wirbelsäule und die Ringe selbst bleiben erhalten; der Käfig wird aus den
 * gedrehten Sprossen neu gebaut (gleiche Topologie wie in Ruhe → Blendshape möglich).
 */
export function wirbelBiegen(wk: WirbelKaefig, bei: number, winkel: number, weich = 0.15): { sprossen: Sprosse[]; spitzeV: V2; wirbel: V2[] } {
  const N = wk.sprossen.length;
  const mitten = wk.sprossen.map((s) => lerp2(s.unten, s.oben, 0.5));
  const lang = [0];
  for (let i = 1; i < N; i++) lang.push(lang[i - 1]! + abstand(mitten[i - 1]!, mitten[i]!));
  const L = lang[N - 1]!;
  const f = lang.map((x) => x / L);
  const rad = (winkel * Math.PI) / 180;
  // Anteil der Drehung je Ring: 0 hinter `bei`, voll vor `bei − weich`
  const anteil = f.map((x) => glatt01(bei, bei - weich, x));
  const dreh = (v: V2, a: number): V2 => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
  const neu: V2[] = new Array(N);
  neu[N - 1] = mitten[N - 1]!;
  const sprossen: Sprosse[] = new Array(N);
  sprossen[N - 1] = { ...wk.sprossen[N - 1]! };
  for (let i = N - 2; i >= 0; i--) {
    const a = rad * anteil[i]!;
    const d = { x: mitten[i]!.x - mitten[i + 1]!.x, y: mitten[i]!.y - mitten[i + 1]!.y };
    const dd = dreh(d, a);
    neu[i] = { x: neu[i + 1]!.x + dd.x, y: neu[i + 1]!.y + dd.y };
    const s = wk.sprossen[i]!;
    const o = dreh({ x: s.oben.x - mitten[i]!.x, y: s.oben.y - mitten[i]!.y }, a);
    const u = dreh({ x: s.unten.x - mitten[i]!.x, y: s.unten.y - mitten[i]!.y }, a);
    sprossen[i] = { ...s, oben: { x: neu[i]!.x + o.x, y: neu[i]!.y + o.y }, unten: { x: neu[i]!.x + u.x, y: neu[i]!.y + u.y } };
  }
  const v0 = wk.wirbel[0]!;
  const t = dreh({ x: v0.x - mitten[0]!.x, y: v0.y - mitten[0]!.y }, rad * anteil[0]!);
  const spitzeV = { x: neu[0]!.x + t.x, y: neu[0]!.y + t.y };
  return { sprossen, spitzeV, wirbel: [spitzeV, ...neu, wk.wirbel[wk.wirbel.length - 1]!] };
}
