// Zufallsreihe (Plan Teil V): Maullinien wie im Maul-Tab gezeichnet — Anfang auf der Kontur (Spiegelebene), Punkte auf
// der Haut des Körpers ohne Maul, runder Anfang (`lippeAnHaut`). Lage (hoch, mittel, tief, Kinn, seitlich, Hals), Form
// (gerade, hoch, runter, J, S, senkrechtes Ende, Florians Vorlagenlinie), Länge und Kiefer (gleich, Über-, Unterbiss
// wie der Chip „getrennt“) sind die Achsen der Reihe. DOM-frei.
import type { V2 } from '../../bezier';
import type { Dokument, Knoten3, Linie3 } from '../../dokument';
import { lippeAnHaut } from '../../lippeHaut';
import { pfadAbtasten, vollerPfad } from '../../profil';
import { linieDurch } from '../../versuch/linie3d';
import type { Vorlage } from '../../versuch/vorlagen';
import type { KoerperArt } from './koerper';
import type { Zufall } from './zufall';

export const ANFAENGE = ['hoch', 'mittel', 'tief', 'kinn', 'seitlich', 'hals'] as const;
export type Anfang = (typeof ANFAENGE)[number];
export const FORMEN = ['gerade', 'hoch', 'runter', 'j', 's', 'senkrecht', 'vorlage'] as const;
export type Form = (typeof FORMEN)[number];
export type Laenge = 'kurz' | 'lang';
export const KIEFER = ['gleich', 'ueberbiss', 'unterbiss'] as const;
export type KieferArt = (typeof KIEFER)[number];

type V3T = [number, number, number];
/** Halbe Hautbreite an einem Seitenpunkt (größtes z), null außerhalb des Körpers. */
export type Haut = (x: number, y: number) => number | null;

/** Bezug für die Lage eines Mauls: Anfang auf der Kontur in mittlerer Höhe, typische Maullänge, Kopffenster. */
export type MaulBezug = { start: V2; laenge: number; ecke?: V2; vorlageSeite?: V2[]; vorlageFront?: V2[] };

function umriss(dok: Dokument): V2[] {
  const sk = dok.skalierung;
  return pfadAbtasten(vollerPfad(dok.profile.seite), 96).map((q) => ({ x: q.x * sk, y: q.y * sk }));
}

/** Vorderster Umrisspunkt in Höhe y (Schnittpunkt der Waagerechten mit dem Umriss, kleinstes x im Fenster). */
function vornAufHoehe(zug: readonly V2[], y: number, xMax = Infinity): V2 | null {
  let best: V2 | null = null;
  for (let i = 0; i < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % zug.length]!;
    if ((a.y - y) * (b.y - y) > 0 || a.y === b.y) continue;
    const t = (y - a.y) / (b.y - a.y);
    const x = a.x + t * (b.x - a.x);
    if (x > xMax) continue;
    if (!best || x < best.x) best = { x, y };
  }
  return best;
}

/** Unterster Umrisspunkt bei x (Kinnseite), nur unterhalb von yMax. */
function untenBeiX(zug: readonly V2[], x: number, yMax: number): V2 | null {
  let best: V2 | null = null;
  for (let i = 0; i < zug.length; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % zug.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    const t = (x - a.x) / (b.x - a.x);
    const y = a.y + t * (b.y - a.y);
    if (y > yMax) continue;
    if (!best || y < best.y) best = { x, y };
  }
  return best;
}

function naechsterAufUmriss(zug: readonly V2[], p: V2): V2 {
  let best = zug[0]!;
  for (const q of zug) if (Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y)) best = q;
  return best;
}

/** Linie der Vorlage (Seite Start → Mundwinkel, Front gleich viele Punkte), wie Florian sie nachgezogen hat. */
function vorlageLinie(v: Vorlage): { seite: V2[]; front: V2[] } | null {
  const ausLinien = (ansicht: string): V2[] | null => {
    const l = v.linien?.[ansicht]?.find((x) => x.farbe === 'tuerkis') ?? v.linien?.[ansicht]?.find((x) => x.farbe === 'rot');
    return l ? l.punkte.map((p) => ({ x: p.x, y: p.y })) : null;
  };
  const ausPunkten = (ansicht: string): V2[] | null => {
    const pts = v.punkte?.[ansicht];
    if (!pts) return null;
    const ecke = pts.find((p) => p.farbe === 'schwarz');
    const tu = pts.filter((p) => p.farbe === 'tuerkis');
    const rot = pts.filter((p) => p.farbe === 'rot');
    const l = (tu.length ? tu : rot).map((p) => ({ x: p.x, y: p.y }));
    return l.length ? [...l, ...(ecke ? [{ x: ecke.x, y: ecke.y }] : [])] : null;
  };
  const seite = ausLinien('seite') ?? ausPunkten('seite');
  const front = ausLinien('front') ?? ausPunkten('front');
  return seite && front ? { seite, front } : null;
}

/** Bezug je Körper: Grundkörper aus der Seite, Vorlagen aus Florians Maullinie. */
export function maulBezug(art: KoerperArt, dok: Dokument, vorlage: Vorlage | null): MaulBezug {
  const zug = umriss(dok);
  const ys = zug.map((q) => q.y);
  const xs = zug.map((q) => q.x);
  const H = Math.max(...ys) - Math.min(...ys);
  const L = Math.max(...xs) - Math.min(...xs);
  if (vorlage) {
    const vl = vorlageLinie(vorlage);
    if (vl) {
      const start = naechsterAufUmriss(zug, vl.seite[0]!);
      const ecke = vl.seite[vl.seite.length - 1]!;
      return { start, laenge: Math.hypot(ecke.x - start.x, ecke.y - start.y), ecke, vorlageSeite: vl.seite, vorlageFront: vl.front };
    }
  }
  const yRef = Math.min(...ys) + (art === 'birne' ? 0.74 : 0.5) * H;
  const start = vornAufHoehe(zug, yRef) ?? { x: Math.min(...xs), y: yRef };
  return { start, laenge: 0.45 * L * (art === 'birne' ? 0.8 : 1) };
}

/** Form der Linie als Punkte (dx längs nach hinten, dy nach oben) in Vielfachen der Länge. */
function formPunkte(form: Exclude<Form, 'vorlage'>, z: Zufall): [number, number][] {
  switch (form) {
    case 'gerade':
      return [[0, 0], [0.5, -0.04], [1, -0.06]];
    case 'hoch':
      return [[0, 0], [0.5, 0.06], [1, 0.28]];
    case 'runter':
      return [[0, 0], [0.5, -0.12], [1, -0.3]];
    case 'j':
      return z.zahl() < 0.5 ? [[0, 0], [0.55, -0.06], [0.85, -0.04], [0.95, 0.3]] : [[0, 0], [0.55, -0.02], [0.85, -0.04], [0.95, -0.32]];
    case 's':
      return [[0, 0], [0.33, -0.12], [0.66, 0.08], [1, -0.04]];
    case 'senkrecht':
      return z.zahl() < 0.5 ? [[0, 0], [0.5, -0.05], [0.75, 0], [0.75, 0.25]] : [[0, 0], [0.5, 0.02], [0.75, 0], [0.75, -0.25]];
  }
}

export type LinienErgebnis = { oben: Linie3; unten?: Linie3; start: V3T; ecke: V3T; laenge: number } | { fehler: string };

/** Versetzte Kante des kürzeren Kiefers (wie `unterkieferVorschlag`, mit Größe, Breite und Rückversatz des Anfangs). */
function versetzt(l: Linie3, dyFaktor: number, zFaktor: number, startAnteil: number): Linie3 {
  const kn = l.knoten;
  const n = kn.length;
  const a = kn[0]!.p;
  const e = kn[n - 1]!.p;
  const dy = dyFaktor * 0.07 * Math.hypot(e[0] - a[0], e[1] - a[1]);
  const knoten: Knoten3[] = kn.map((k, i) => {
    const w = i >= n - 1 ? 0 : 1 - (i / (n - 1)) ** 2;
    return { ...k, p: [k.p[0], k.p[1] + dy * w, k.p[2] * zFaktor] as V3T, ein: [k.ein[0], k.ein[1], k.ein[2] * zFaktor] as V3T, aus: [k.aus[0], k.aus[1], k.aus[2] * zFaktor] as V3T };
  });
  const b = knoten[1]!.p;
  const s = knoten[0]!.p;
  knoten[0] = { ...knoten[0]!, p: [s[0] + startAnteil * (b[0] - s[0]), s[1] + startAnteil * (b[1] - s[1]), s[2] + startAnteil * (b[2] - s[2])] as V3T };
  knoten[n - 1] = { ...knoten[n - 1]!, p: [...e] as V3T };
  return { ...l, knoten };
}

/**
 * Maullinien eines Prüffalls auf dem Körper. `haut` misst die Haut des Körpers ohne Maul (wie der Editor die Tiefe
 * neuer Maulpunkte vom Kern-Netz holt). Liegt ein Punkt neben dem Körper, wird die Linie bis zu fünfmal um 15 %
 * gekürzt; gelingt es nicht, ist der Fall ungültig.
 */
export function maulLinien(dok: Dokument, art: KoerperArt, bezug: MaulBezug, haut: Haut, anfang: Anfang, form: Form, laenge: Laenge, kiefer: KieferArt, z: Zufall): LinienErgebnis {
  const zug = umriss(dok);
  const L0 = bezug.laenge * (laenge === 'kurz' ? 0.7 : 1.15);
  // Kopffenster: vorderster Umrisspunkt in der gesuchten Höhe, höchstens anderthalb Maullängen hinter dem Bezugsanfang
  const xFenster = bezug.start.x + 1.5 * bezug.laenge;
  let start: V2 | null;
  let startZ = 0;
  // hoch/tief: so weit wie möglich über bzw. unter dem Bezug (an flachen Schnauzen wie beim Rex schrittweise näher)
  const aufHoehe = (anteile: readonly number[]) => {
    for (const a of anteile) {
      const q = vornAufHoehe(zug, bezug.start.y + a * bezug.laenge, xFenster);
      if (q) return q;
    }
    return null;
  };
  if (anfang === 'hoch') start = aufHoehe([0.35, 0.25, 0.18, 0.12]);
  else if (anfang === 'tief') start = aufHoehe([-0.3, -0.22, -0.15, -0.1]);
  else if (anfang === 'kinn') start = untenBeiX(zug, bezug.start.x + 0.3 * bezug.laenge, bezug.start.y);
  else if (anfang === 'hals') {
    if (art !== 'langhals' && art !== 'drache') return { fehler: 'Hals nur bei Langhals/Drache' };
    // Hals: vorderster Umrisspunkt eine gute Maullänge unter dem Kopf (am Langhals die Halsvorderseite)
    start = vornAufHoehe(zug, bezug.start.y - 1.2 * bezug.laenge);
  } else if (anfang === 'seitlich') {
    const p = { x: bezug.start.x + 0.2 * bezug.laenge, y: bezug.start.y };
    const zs = haut(p.x, p.y);
    if (zs === null) return { fehler: 'seitlicher Anfang neben dem Körper' };
    start = p;
    startZ = zs;
  } else start = bezug.start;
  if (!start) return { fehler: `kein Anfang (${anfang})` };
  let pts: V3T[] | null = null;
  if (form === 'vorlage') {
    if (!bezug.vorlageSeite || !bezug.vorlageFront || anfang !== 'mittel') return { fehler: 'Vorlagenlinie nur mittig an Vorlagen' };
    const s = bezug.vorlageSeite;
    const f = bezug.vorlageFront;
    pts = s.map((q, i) => [i === 0 ? start!.x : q.x, i === 0 ? start!.y : q.y, i === 0 ? 0 : Math.abs(f[Math.min(i, f.length - 1)]!.x)] as V3T);
  } else {
    const fp = formPunkte(form, z);
    let L = L0;
    for (let versuch = 0; versuch < 6 && !pts; versuch++) {
      const kandidat: V3T[] = [];
      let ok = true;
      for (let i = 0; i < fp.length; i++) {
        const x = start.x + fp[i]![0] * L;
        const y = start.y + fp[i]![1] * L;
        if (i === 0) {
          kandidat.push([x, y, startZ]);
          continue;
        }
        const zz = haut(x, y);
        if (zz === null || zz <= 1e-4) {
          ok = false;
          break;
        }
        kandidat.push([x, y, zz]);
      }
      if (ok) pts = kandidat;
      else L *= 0.85;
    }
  }
  if (!pts) return { fehler: 'Linie liegt neben dem Körper' };
  const hautNull = (x: number, y: number) => haut(x, y);
  const vorn = lippeAnHaut(linieDurch(pts), hautNull);
  let oben = vorn;
  let unten: Linie3 | undefined;
  if (kiefer === 'ueberbiss') {
    unten = versetzt(vorn, z.wahl([1, 2.2]), z.wahl([0.75, 0.85, 1.05]), 0.15);
  } else if (kiefer === 'unterbiss') {
    unten = vorn;
    oben = versetzt(vorn, -z.wahl([1, 2.2]), z.wahl([0.8, 0.9]), 0.25);
  }
  if (unten) unten.knoten[unten.knoten.length - 1]!.p = [...oben.knoten[oben.knoten.length - 1]!.p] as V3T;
  const ecke = vorn.knoten[vorn.knoten.length - 1]!.p;
  return { oben, ...(unten ? { unten } : {}), start: [start.x, start.y, startZ], ecke: [...ecke] as V3T, laenge: Math.hypot(ecke[0] - start.x, ecke[1] - start.y) };
}
