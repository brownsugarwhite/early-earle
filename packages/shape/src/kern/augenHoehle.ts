// Phase 2 M5, Schritt 3b (Plan 5.4): Augenhöhle im Käfig — Inset-Schleifen mit harter Falte (Brauenwulst, Lidrand) um den
// Ringpunkt eines Augapfels. Die Höhle ist ein Aufsatz auf den fertigen Käfig: Die vier Flächen um den Augenpunkt c werden
// ersetzt durch die Schleife L1 (Rahmen; oben als Brauenwulst angehoben, dort scharf), die Schleife L2 (Lidrand, Öffnung nach
// der Augengröße, leicht eingesenkt, halbscharf) und c als Höhlenboden. Nur Vierecke, 16 neue Punkte je Auge, die alten
// Punktindizes bleiben. Die Topologie samt Unterteilung wird gemerkt; die Lagen kommen bei jedem Bau aus dem (posierten)
// Käfig, so folgt die Höhle Schädel, Haps und Pinsel. Der alte Käfig bleibt die Wahrheit für die Werkzeuge; die Höhle wird
// nur für das gezeichnete Netz gebraucht (`feinAlt` bildet die feinen Flächen außerhalb der Höhle auf die alten ab).

import { type Kaefig, flaeche, kaefigAusFlaechen, kanteZwischen } from '../kaefig/halbkanten';
import type { Ableitung } from './ableiten';
import type { MaulErgebnis } from './maul';
import { anwenden3 } from '../subdivision/matrix';
import { type Unterteilung, unterteilung } from '../subdivision/catmullClark';

type V3 = [number, number, number];

/** Form der Höhle, Maße als Anteil des Augenradius. */
export type HoehlenForm = {
  /** Lidöffnung (Radius der Lidschleife) */
  oeffnung: number;
  /** Einsenkung des Lidrands unter die Haut */
  lidTiefe: number;
  /** Höhe des Brauenwulsts über der Haut (oben am größten) und sein Überhang zur Mitte */
  wulst: number;
  ueberhang: number;
  /** Tiefe des Höhlenbodens */
  boden: number;
  /** Kantenschärfe: Brauenkante (oben), Rahmen unten, Lidrand */
  schaerfeWulst: number;
  schaerfeRahmen: number;
  schaerfeLid: number;
};

/**
 * Standard: Höhle ohne Brauenwulst. Der Wulst ist nach drei gemessenen Anläufen am Rex nicht gelöst (Planseite Phase 2, M5
 * Schritt 3b): Im Feld des Auges wurde er ein schmaler Grat nach oben, entlang der Ringreihe eine Spitze (die Ringe liegen am
 * Mundwinkel dicht) bzw. kaum sichtbar mit einer dunklen Faltenlinie. `wulst`/`ueberhang` > 0 schalten die Brauenreihe ein.
 */
export const HOEHLE_STANDARD: HoehlenForm = { oeffnung: 0.95, lidTiefe: 0.08, wulst: 0, ueberhang: 0, boden: 0.9, schaerfeWulst: 2, schaerfeRahmen: 0.4, schaerfeLid: 1 };

/**
 * Ein Auge der Höhle: Käfigpunkt c, Augenradius (Welt), Oben-Richtung des Augenrahmens (gedreht, links gespiegelt) und die
 * Brauenreihe: alte Käfigpunkte längs des Körpers über dem Auge (geordnet, durch die obere Feldkante). Der Brauenwulst ist
 * eine Falte entlang dieser Reihe, angehoben und über das Auge gezogen; so reicht er über mehrere Ringe (am Rex liegen die
 * Ringe am Mundwinkel so dicht, dass ein Wulst nur im Feld des Auges als schmaler Grat nach oben stand).
 */
export type HoehlenAuge = {
  c: number;
  radius: number;
  oben: V3;
  braue?: { punkte: number[]; gewicht: number[] };
  /**
   * Rundmaul (Phase 2 M6) statt Auge: L1 = äußere Lippenkante mit Radius `r1`, nach vorn gewölbt um `wulst`, L2 = innere
   * Lippenkante mit Radius `r2`, c = Rachenboden in der Tiefe `tiefe` (alles Welt, für die aktuelle Öffnung); eigene Schärfen.
   */
  mund?: { r1: number; r2: number; wulst: number; tiefe: number };
  /** Kantenschärfe der Schleifen (statt der Form): L1, L2 */
  schaerfe?: { l1: number; l2: number };
};

type RingInfo = { flaechen: number[]; rand: number[]; ecken: number[][] };

/**
 * Ring um den Käfigpunkt c: die vier Vierecke in Umlaufrichtung (gegen den Uhrzeigersinn von außen) und die acht Randpunkte
 * [a₁, d₁, a₂, d₂, …] (a = Kantennachbar, d = Ecke); null, wenn c nicht genau vier Vierecke hat.
 */
export function hoehlenRing(k: Kaefig, c: number): RingInfo | null {
  const fl: { f: number; v: number[] }[] = [];
  for (let i = k.vFStart[c]!; i < k.vFStart[c + 1]!; i++) {
    const f = k.vFlaechen[i]!;
    const v = flaeche(k, f);
    if (v.length !== 4) return null;
    const s = v.indexOf(c);
    fl.push({ f, v: [v[s]!, v[(s + 1) % 4]!, v[(s + 2) % 4]!, v[(s + 3) % 4]!] });
  }
  if (fl.length !== 4) return null;
  // Kette: die nächste Fläche beginnt mit dem letzten Punkt der vorigen (gemeinsame Kante c–b)
  const kette = [fl[0]!];
  for (let i = 1; i < 4; i++) {
    const b = kette[i - 1]!.v[3]!;
    const naechste = fl.find((x) => x.v[1] === b);
    if (!naechste) return null;
    kette.push(naechste);
  }
  if (kette[3]!.v[3] !== kette[0]!.v[1]) return null;
  const rand: number[] = [];
  for (const x of kette) rand.push(x.v[1]!, x.v[2]!);
  return { flaechen: kette.map((x) => x.f), rand, ecken: kette.map((x) => x.v) };
}

export type HoehlenTopologie = {
  /** neuer Käfig (Lagen der Ruhe), Unterteilung mit gleicher Stufenzahl */
  kaefig: Kaefig;
  unterteilung: Unterteilung;
  /** Punkte des alten Käfigs; neue Punkte je Auge e: L1 = nAlt + 16e + k, L2 = nAlt + 16e + 8 + k */
  nAlt: number;
  ringe: RingInfo[];
  zentren: number[];
  /** feine Flächen (Stufe L) des neuen Netzes */
  feinFlaechen: number[][];
  /** je feiner Fläche des neuen Netzes die entsprechende alte feine Fläche, −1 in der Höhle */
  feinAlt: Int32Array;
  /** Quelle je neuem Käfigpunkt (für Werte je Punkt): der Augenpunkt c */
  quelle: Int32Array;
  /**
   * Wulstgewicht je Randpunkt (8 je Auge): wie weit er oben liegt, in der Ruhe bestimmt (max(0, Richtung · oben)^1,5). Die
   * Lagen nutzen diese Gewichte statt einer Oben-Richtung: So dreht der Wulst exakt mit dem Schädel.
   */
  hoch: Float64Array;
};

const merker = new WeakMap<Uint32Array, Map<string, HoehlenTopologie>>();

/** Blockgröße einer Käfigfläche mit m Ecken auf Stufe L (Catmull-Clark: Stufe 1 m Vierecke, jede weitere ×4). */
const blockGroesse = (m: number, L: number) => (L === 0 ? 1 : m * 4 ** (L - 1));

/**
 * Topologie der Höhlen um die Käfigpunkte `zentren` (gemerkt je Käfig-Topologie): neue Flächen, Schärfen (Brauenkante oben
 * nach der Oben-Richtung in der Ruhe), Unterteilung und die Abbildung der feinen Flächen. null, wenn ein Zentrum keinen
 * regelmäßigen Viereck-Ring hat oder sich zwei Ringe berühren.
 */
export function hoehlenTopologie(k: Kaefig, L: number, augen: readonly HoehlenAuge[], form: HoehlenForm = HOEHLE_STANDARD): HoehlenTopologie | null {
  const schluessel = JSON.stringify([L, augen.map((a) => [a.c, a.oben.map((x) => Math.round(x * 100) / 100), a.braue?.punkte ?? [], a.schaerfe ?? null]), form.schaerfeWulst, form.schaerfeRahmen, form.schaerfeLid]);
  let m = merker.get(k.fStart);
  if (!m) {
    m = new Map();
    merker.set(k.fStart, m);
  }
  const alt = m.get(schluessel);
  if (alt) return alt;
  const ringe: RingInfo[] = [];
  const belegt = new Set<number>();
  for (const a of augen) {
    const r = hoehlenRing(k, a.c);
    if (!r) return null;
    for (const v of [a.c, ...r.rand]) {
      if (belegt.has(v)) return null;
      belegt.add(v);
    }
    ringe.push(r);
  }
  const nAlt = k.n;
  const ersetzt = new Set<number>();
  for (const r of ringe) for (const f of r.flaechen) ersetzt.add(f);
  const flaechen: number[][] = [];
  const altVon: number[] = [];
  for (let f = 0; f < k.nF; f++) {
    if (ersetzt.has(f)) continue;
    flaechen.push(flaeche(k, f));
    altVon.push(f);
  }
  const quelle = new Int32Array(16 * augen.length);
  augen.forEach((a, e) => {
    const r = ringe[e]!;
    const L1 = (i: number) => nAlt + 16 * e + (i % 8);
    const L2 = (i: number) => nAlt + 16 * e + 8 + (i % 8);
    for (let i = 0; i < 8; i++) {
      flaechen.push([r.rand[i]!, r.rand[(i + 1) % 8]!, L1(i + 1), L1(i)]);
      altVon.push(-1);
    }
    for (let i = 0; i < 8; i++) {
      flaechen.push([L1(i), L1(i + 1), L2(i + 1), L2(i)]);
      altVon.push(-1);
    }
    // innere Flächen: [c, a, d, b] → [c, L2(a), L2(d), L2(b)]; a, d, b liegen im Rand an den Stellen 2q, 2q+1, 2q+2
    for (let q = 0; q < 4; q++) {
      flaechen.push([a.c, L2(2 * q), L2(2 * q + 1), L2(2 * q + 2)]);
      altVon.push(-1);
    }
    quelle.fill(a.c, 16 * e, 16 * e + 16);
  });
  const xyz = new Float64Array(3 * (nAlt + 16 * augen.length));
  xyz.set(k.xyz);
  const neu = kaefigAusFlaechen(xyz, flaechen);
  // Schärfen des alten Käfigs übernehmen (Kanten über ihre Punkte), Punktschärfen
  for (let e = 0; e < k.nE; e++) {
    const s = k.eSchaerfe[e]!;
    if (s <= 0) continue;
    const ne = kanteZwischen(neu, k.eA[e]!, k.eB[e]!);
    if (ne >= 0) neu.eSchaerfe[ne] = s;
  }
  for (let v = 0; v < nAlt; v++) neu.vSchaerfe[v] = k.vSchaerfe[v]!;
  // Wulstgewichte (Ruhe) und Brauenkante: L1-Kanten, deren Mitte oben liegt (Richtung vom Augenpunkt, gegen die Oben-Richtung)
  const hoch = new Float64Array(8 * augen.length);
  augen.forEach((a, e) => {
    const r = ringe[e]!;
    const P = (i: number): V3 => [k.xyz[3 * i]!, k.xyz[3 * i + 1]!, k.xyz[3 * i + 2]!];
    const c = P(a.c);
    const richtung = (q: V3) => {
      const d: V3 = [q[0] - c[0], q[1] - c[1], q[2] - c[2]];
      const l = Math.hypot(...d) || 1;
      return (d[0] * a.oben[0] + d[1] * a.oben[1] + d[2] * a.oben[2]) / l;
    };
    for (let i = 0; i < 8; i++) {
      const p = P(r.rand[i]!);
      const q = P(r.rand[(i + 1) % 8]!);
      // breit oben (die drei oberen Randpunkte fast voll): ein waagerechter Wulst statt einer Spitze nach oben
      const x = Math.min(1, Math.max(0, (richtung(p) + 0.15) / 0.75));
      hoch[8 * e + i] = x * x * (3 - 2 * x);
      const mitteHoch = richtung([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]);
      const e1 = kanteZwischen(neu, nAlt + 16 * e + i, nAlt + 16 * e + ((i + 1) % 8));
      // mit Brauenreihe trägt die Reihe die harte Kante, der Rahmen bleibt weich; eigene Schärfen (Rundmaul) gehen vor
      if (e1 >= 0) neu.eSchaerfe[e1] = a.schaerfe ? a.schaerfe.l1 : mitteHoch > 0.3 && !a.braue ? form.schaerfeWulst : form.schaerfeRahmen;
      const e2 = kanteZwischen(neu, nAlt + 16 * e + 8 + i, nAlt + 16 * e + 8 + ((i + 1) % 8));
      if (e2 >= 0) neu.eSchaerfe[e2] = a.schaerfe ? a.schaerfe.l2 : form.schaerfeLid;
    }
  });
  // Brauenfalte entlang der Reihe (Schärfe nach dem Gewicht der beiden Punkte)
  for (const a of augen) {
    if (!a.braue) continue;
    const { punkte, gewicht } = a.braue;
    for (let i = 0; i + 1 < punkte.length; i++) {
      const ke = kanteZwischen(neu, punkte[i]!, punkte[i + 1]!);
      if (ke >= 0) neu.eSchaerfe[ke] = Math.max(neu.eSchaerfe[ke]!, form.schaerfeWulst * Math.min(gewicht[i]!, gewicht[i + 1]!));
    }
  }
  const u = unterteilung(neu, L);
  // feine Flächen: je Käfigfläche ein zusammenhängender Block; die erhaltenen Flächen behalten ihre Reihenfolge
  const versatzAlt = new Uint32Array(k.nF + 1);
  for (let f = 0; f < k.nF; f++) versatzAlt[f + 1] = versatzAlt[f]! + blockGroesse(k.fStart[f + 1]! - k.fStart[f]!, L);
  const letzte = L > 0 ? u.stufen[L - 1]!.kaefig : neu;
  const feinFlaechen: number[][] = [];
  for (let f = 0; f < letzte.nF; f++) feinFlaechen.push(flaeche(letzte, f));
  const feinAlt = new Int32Array(feinFlaechen.length).fill(-1);
  let o = 0;
  for (let f = 0; f < flaechen.length; f++) {
    const g = blockGroesse(flaechen[f]!.length, L);
    const af = altVon[f]!;
    if (af >= 0) for (let i = 0; i < g; i++) feinAlt[o + i] = versatzAlt[af]! + i;
    o += g;
  }
  const topo: HoehlenTopologie = { kaefig: neu, unterteilung: u, nAlt, ringe, zentren: augen.map((a) => a.c), feinFlaechen, feinAlt, quelle, hoch };
  m.set(schluessel, topo);
  return topo;
}

/**
 * Lagen des Höhlenkäfigs aus den Lagen des alten Käfigs (Ruhe oder Pose): je Auge der Rahmen am Augenpunkt (Normale aus
 * den vier Flächen), L2 auf einem Kreis mit dem Öffnungsradius, L1 auf halbem Weg zum Rand, beide der Wölbung der Haut
 * folgend; oben (Wulstgewicht der Topologie) hebt der Wulst L1 an und schiebt sie zur Mitte (Überhang); c sinkt zum Boden.
 */
export function hoehlenLagen(topo: HoehlenTopologie, xyzAlt: Float64Array, augen: readonly HoehlenAuge[], form: HoehlenForm = HOEHLE_STANDARD): Float64Array {
  const nAlt = topo.nAlt;
  const out = new Float64Array(3 * (nAlt + 16 * augen.length));
  out.set(xyzAlt.subarray(0, 3 * nAlt));
  const P = (i: number): V3 => [xyzAlt[3 * i]!, xyzAlt[3 * i + 1]!, xyzAlt[3 * i + 2]!];
  augen.forEach((a, e) => {
    const r = topo.ringe[e]!;
    const c = P(a.c);
    // Normale: Newell über die vier alten Flächen um c
    const n: V3 = [0, 0, 0];
    for (const v of r.ecken) {
      for (let i = 0; i < 4; i++) {
        const p = P(v[i]!);
        const q = P(v[(i + 1) % 4]!);
        n[0] += (p[1] - q[1]) * (p[2] + q[2]);
        n[1] += (p[2] - q[2]) * (p[0] + q[0]);
        n[2] += (p[0] - q[0]) * (p[1] + q[1]);
      }
    }
    const ln = Math.hypot(...n) || 1;
    n[0] /= ln;
    n[1] /= ln;
    n[2] /= ln;
    const R = a.radius;
    const rho: number[] = [];
    const dir: V3[] = [];
    const h: number[] = [];
    for (let i = 0; i < 8; i++) {
      const p = P(r.rand[i]!);
      const q: V3 = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
      const hh = q[0] * n[0] + q[1] * n[1] + q[2] * n[2];
      const t: V3 = [q[0] - hh * n[0], q[1] - hh * n[1], q[2] - hh * n[2]];
      const l = Math.hypot(...t) || 1e-9;
      rho.push(l);
      dir.push([t[0] / l, t[1] / l, t[2] / l]);
      h.push(hh);
    }
    // Öffnung rund mit dem Augenradius, höchstens 3/4 des kleinsten Randabstands (am Rex liegen die Ringe am Mundwinkel
    // dicht: 0,015 zum vorderen Nachbarring bei 0,04 nach oben); der Rahmen L1 ist dort schmaler
    const rhoMin = Math.min(...rho);
    const setze = (idx: number, p: V3) => {
      out[3 * idx] = p[0];
      out[3 * idx + 1] = p[1];
      out[3 * idx + 2] = p[2];
    };
    if (a.mund) {
      // Rundmaul: Lippenring L1 (gewölbt), innere Kante L2 etwas zurück, Rachenboden in der Tiefe; Kreise um c, höchstens
      // 0,85 bzw. 0,8 des kleinsten Randabstands (die Pose dehnt das Feld beim Öffnen)
      const m = a.mund;
      const r1 = Math.min(m.r1, 0.85 * rhoMin);
      const r2 = Math.min(m.r2, 0.8 * r1);
      // gleichmäßige Winkel (45°) ab der Richtung des ersten Randpunkts: Die Randpunkte der Kappe liegen nicht im 45°-Raster
      // (Zellen breiter als hoch), entlang ihrer Richtungen wurde der Ring eine Ellipse (Rundheit 0,79)
      const e1 = dir[0]!;
      const e2: V3 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
      const s1 = dir[1]![0] * e2[0] + dir[1]![1] * e2[1] + dir[1]![2] * e2[2] >= 0 ? 1 : -1;
      for (let i = 0; i < 8; i++) {
        const w = (s1 * i * Math.PI) / 4;
        const d: V3 = [e1[0] * Math.cos(w) + e2[0] * Math.sin(w), e1[1] * Math.cos(w) + e2[1] * Math.sin(w), e1[2] * Math.cos(w) + e2[2] * Math.sin(w)];
        const wolb = (rr: number) => h[i]! * (rr / rho[i]!) ** 2;
        const h1 = wolb(r1) + m.wulst;
        const h2 = wolb(r2) + 0.4 * m.wulst;
        setze(nAlt + 16 * e + i, [c[0] + d[0] * r1 + n[0] * h1, c[1] + d[1] * r1 + n[1] * h1, c[2] + d[2] * r1 + n[2] * h1]);
        setze(nAlt + 16 * e + 8 + i, [c[0] + d[0] * r2 + n[0] * h2, c[1] + d[1] * r2 + n[1] * h2, c[2] + d[2] * r2 + n[2] * h2]);
      }
      setze(a.c, [c[0] - n[0] * m.tiefe, c[1] - n[1] * m.tiefe, c[2] - n[2] * m.tiefe]);
      return;
    }
    const r2 = Math.min(form.oeffnung * R, 0.75 * rhoMin);
    for (let i = 0; i < 8; i++) {
      const d = dir[i]!;
      const w = topo.hoch[8 * e + i]!;
      // Wölbung: Höhe der Haut über der Tangentialebene wächst etwa quadratisch mit dem Abstand
      const wolb = (rr: number) => h[i]! * (rr / rho[i]!) ** 2;
      // ohne Brauenreihe trägt L1 den Wulst; mit Reihe liegt L1 unter der Kante (die Reihe hängt darüber)
      const wl = a.braue ? 0 : w;
      const r1 = Math.max(r2 * 1.1, r2 + (rho[i]! - r2) * 0.5 - form.ueberhang * R * wl);
      const hl = wolb(r1) + form.wulst * R * wl;
      const l1: V3 = [c[0] + d[0] * r1 + n[0] * hl, c[1] + d[1] * r1 + n[1] * hl, c[2] + d[2] * r1 + n[2] * hl];
      const l2: V3 = [c[0] + d[0] * r2 + n[0] * (wolb(r2) - form.lidTiefe * R), c[1] + d[1] * r2 + n[1] * (wolb(r2) - form.lidTiefe * R), c[2] + d[2] * r2 + n[2] * (wolb(r2) - form.lidTiefe * R)];
      setze(nAlt + 16 * e + i, l1);
      setze(nAlt + 16 * e + 8 + i, l2);
    }
    setze(a.c, [c[0] - n[0] * form.boden * R, c[1] - n[1] * form.boden * R, c[2] - n[2] * form.boden * R]);
    if (a.braue) {
      // Brauenreihe (nur im gezeichneten Netz): längs der Normalen der Haut angehoben (Normale des Augenpunkts, über die Reihe
      // gleich: die Reihe ist kurz) und zur Augenmitte über das Auge gezogen (Richtung zum Augenpunkt in der Tangentialebene)
      a.braue.punkte.forEach((q, i) => {
        const w = a.braue!.gewicht[i]!;
        const p = P(q);
        const zu: V3 = [c[0] - p[0], c[1] - p[1], c[2] - p[2]];
        const zn = zu[0] * n[0] + zu[1] * n[1] + zu[2] * n[2];
        const zt: V3 = [zu[0] - zn * n[0], zu[1] - zn * n[1], zu[2] - zn * n[2]];
        const lz = Math.hypot(...zt) || 1;
        const hb = form.wulst * R * w;
        const ob = form.ueberhang * R * w;
        setze(q, [p[0] + n[0] * hb + (zt[0] / lz) * ob, p[1] + n[1] * hb + (zt[1] / lz) * ob, p[2] + n[2] * hb + (zt[2] / lz) * ob]);
      });
    } else {
      // oberer Rand mit angehoben (nur im gezeichneten Netz): Der Wulst läuft in die Stirn aus
      for (let i = 0; i < 8; i++) {
        const w = topo.hoch[8 * e + i]!;
        if (w <= 0) continue;
        const q = r.rand[i]!;
        const hb = 0.35 * form.wulst * R * w;
        setze(q, [xyzAlt[3 * q]! + n[0] * hb, xyzAlt[3 * q + 1]! + n[1] * hb, xyzAlt[3 * q + 2]! + n[2] * hb]);
      }
    }
  });
  return out;
}

/** Feine Lagen (Grenzfläche) des Höhlenkäfigs. */
export function hoehlenFein(topo: HoehlenTopologie, xyz: Float64Array): Float64Array {
  return anwenden3(topo.unterteilung.grenze, xyz);
}

/**
 * Augenpunkt eines Augapfels: der nächste Ringpunkt der rechten Hälfte (ohne Naht und Endringe) zu `ziel` (Ruhelage), dessen
 * Ring aus vier Hautflächen besteht — dort entsteht die Höhle. Ringe, die die Lippe berühren (Maulpunkte oder Lippenreihe),
 * scheiden aus: Die Höhle zog sonst ihren Rahmen bis zur Lippe hinab (Rex am Ringpunkt über dem Maul). null ohne Kandidat.
 */
export function augapfelEcke(abl: Ableitung, ziel: readonly [number, number, number]): number | null {
  const v = abl.vorlage;
  const f = abl.fein;
  const art = (abl as Partial<MaulErgebnis>).maul?.art;
  const haut = (q: number) => q < v.kaefig.n && (!art || art[q] === 0);
  let best: number | null = null;
  let bestD = Infinity;
  for (let i = 1; i < v.R - 1; i++) {
    for (let j = 1; j < v.N / 2; j++) {
      const q = v.ringPunkt(i, j);
      const d = (f[3 * q]! - ziel[0]) ** 2 + (f[3 * q + 1]! - ziel[1]) ** 2 + (f[3 * q + 2]! - ziel[2]) ** 2;
      if (d >= bestD || !haut(q)) continue;
      const r = hoehlenRing(abl.kaefig, q);
      if (!r || !r.rand.every(haut)) continue;
      bestD = d;
      best = q;
    }
  }
  return best;
}

/**
 * Brauenreihe über einem Augapfel am Ringpunkt c = (i, j): die Ringpunkte (i′, j′) der Reihe über dem Auge (j′ = j ∓ 1, die
 * Seite, die zur Oben-Richtung zeigt). Gewicht nach dem Abstand zum Punkt der Reihe über dem Auge: voll bis 1,2 Augenradien,
 * weich aus bis 3,5 (Anlauf 2 zählte Ringe; am Mundwinkel liegen die Ringe aber so dicht, dass der Wulst eine schmale Spitze
 * wurde). Nur Hautpunkte (keine Maulpunkte); null, wenn die Reihe zu kurz ist.
 */
export function brauenReihe(abl: Ableitung, c: number, oben: V3, radius: number): { punkte: number[]; gewicht: number[] } | null {
  const v = abl.vorlage;
  if (c >= v.R * v.N) return null;
  const i = Math.floor(c / v.N);
  const j = c % v.N;
  const f = abl.kaefig.xyz;
  const hoehe = (q: number) => (f[3 * q]! - f[3 * c]!) * oben[0] + (f[3 * q + 1]! - f[3 * c + 1]!) * oben[1] + (f[3 * q + 2]! - f[3 * c + 2]!) * oben[2];
  const jo = hoehe(v.ringPunkt(i, j - 1)) > hoehe(v.ringPunkt(i, j + 1)) ? j - 1 : j + 1;
  const art = (abl as Partial<MaulErgebnis>).maul?.art;
  const haut = (q: number) => q < v.kaefig.n && (!art || art[q] === 0);
  const t = v.ringPunkt(i, jo);
  const punkte: number[] = [];
  const gewicht: number[] = [];
  for (let ii = 0; ii < v.R; ii++) {
    const q = v.ringPunkt(ii, jo);
    const d = Math.hypot(f[3 * q]! - f[3 * t]!, f[3 * q + 1]! - f[3 * t + 1]!, f[3 * q + 2]! - f[3 * t + 2]!);
    const x = Math.min(1, Math.max(0, (3.5 * radius - d) / (2.3 * radius)));
    if (x <= 0 || !haut(q)) {
      if (punkte.length && ii > i) break;
      continue;
    }
    punkte.push(q);
    gewicht.push(x * x * (3 - 2 * x));
  }
  return punkte.length >= 3 ? { punkte, gewicht } : null;
}

/**
 * Oben-Richtung des Augenrahmens wie im Renderer: Welt-y senkrecht zur Normalen, um die Drehung gedreht (das linke Auge
 * mit gespiegelter Drehung, rechts = oben × Normale).
 */
export function augenOben(n: readonly [number, number, number], drehung: number, seite: -1 | 0 | 1): V3 {
  let up: V3 = [-n[0] * n[1], 1 - n[1] * n[1], -n[2] * n[1]];
  let l = Math.hypot(...up);
  if (l < 1e-6) {
    up = [1 - n[0] * n[0], -n[1] * n[0], -n[2] * n[0]];
    l = Math.hypot(...up) || 1;
  }
  up = [up[0] / l, up[1] / l, up[2] / l];
  const rechts: V3 = [up[1] * n[2] - up[2] * n[1], up[2] * n[0] - up[0] * n[2], up[0] * n[1] - up[1] * n[0]];
  const w = ((seite === -1 ? -1 : 1) * drehung * Math.PI) / 180;
  const o: V3 = [up[0] * Math.cos(w) + rechts[0] * Math.sin(w), up[1] * Math.cos(w) + rechts[1] * Math.sin(w), up[2] * Math.cos(w) + rechts[2] * Math.sin(w)];
  const lo = Math.hypot(...o) || 1;
  return [o[0] / lo, o[1] / lo, o[2] / lo];
}

