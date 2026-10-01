import { smoothstep } from './geometry';
import type { PlaneFeatureHost, RegionSite } from './host';
import type { CoastSpec, Sea } from './types';

/**
 * Meer mit Landzunge (Ebene 29, Welt 14): eine große Bucht neben dem Pfad, ganz im Pfadabschnitt ihrer Welt. Die
 * Küste läuft längs des Pfads mit Landzungen und Buchten; an beiden Enden des Abschnitts und am fernen Rand biegt sie
 * herum und schließt die Bucht — vom Wasser aus liegt am Ende der Bucht eine ferne, flache Landzunge am Horizont. Das
 * Land steigt von der Klippe landeinwärts zu einem Grat an (die dunkle Silhouette mit den Windbäumen) und fällt
 * dahinter ins natürliche Gelände zurück. Die Klippe ist eine fast senkrechte Wand ins Wasser.
 *
 * Feld `seaField`: vorzeichenbehafteter Uferabstand (> 0 im Wasser), glatte Ecken (weiches Minimum der vier Ränder).
 * Alles in Ebenenkoordinaten, deterministisch je Region; das Rückgrat ist im Meer mitgespeichert (Abfragen ohne Wirt).
 */

/** Schrittweite der gespeicherten Rückgrat-Proben (Welteinheiten längs z). */
const BACKBONE_STEP = 1;
/** Rundung der Buchtecken (weiches Minimum, Welteinheiten). */
const CORNER = 1.6;

/** Seitlicher Abstand zum Rückgrat bei z (Seite des Meeres positiv). */
function lateral(sea: Sea, x: number, z: number): number {
  const t = (sea.zTop - z) / BACKBONE_STEP;
  const i = Math.max(0, Math.min(sea.backbone.length - 2, Math.floor(t)));
  const f = Math.max(0, Math.min(1, t - i));
  const xb = sea.backbone[i]! + (sea.backbone[i + 1]! - sea.backbone[i]!) * f;
  return (x - xb) * sea.side;
}

/** Küstenlinie (seitlicher Abstand vom Rückgrat) beim Anteil t längs der Bucht. */
export function seaCoastAt(sea: Sea, t: number): number {
  const [p1, p2, p3] = sea.phase;
  const w = 0.5 + 0.34 * Math.sin(Math.PI * 2 * t * sea.bays + p1) + 0.12 * Math.sin(Math.PI * 2 * t * sea.bays * 2.3 + p2) + 0.04 * Math.sin(Math.PI * 2 * t * 7.1 + p3);
  return sea.near + (sea.far - sea.near) * Math.max(0, Math.min(1, w));
}

/** Ferner Rand der Bucht (seitlicher Abstand) bei t. */
function seaOuterAt(sea: Sea, t: number): number {
  return sea.outer - 1.2 * (0.5 + 0.5 * Math.sin(Math.PI * 2 * t * 1.7 + sea.phase[1]));
}

/**
 * Vorzeichenbehafteter Uferabstand an (x, z): > 0 im Wasser, < 0 an Land (Welteinheiten, genähert). `out.t` = Anteil
 * längs der Bucht (0 Anfang, 1 Ende), `out.coast` = Abstand zur Pfadküste (> 0 im Wasser), ohne die übrigen Ränder.
 */
export function seaField(sea: Sea, x: number, z: number, out?: { t: number; coast: number; edge?: number }): number {
  const L = sea.zTop - sea.zBottom;
  const t = (sea.zTop - z) / L;
  const u = lateral(sea, x, z);
  const eCoast = u - seaCoastAt(sea, t);
  const eOuter = seaOuterAt(sea, t) - u;
  const eStart = (t - sea.t0) * L;
  const eEnd = (sea.t1 - t) * L;
  if (out) {
    out.t = t;
    out.coast = eCoast;
    // nächster Rand: 0 Pfadküste, 1 ferner Rand, 2 Anfang, 3 Ende der Bucht
    const m = Math.min(eCoast, eOuter, eStart, eEnd);
    out.edge = m === eCoast ? 0 : m === eOuter ? 1 : m === eStart ? 2 : 3;
  }
  // weiches Minimum der vier Ränder (gerundete Ecken); weit draußen genügt das harte Minimum
  const m = Math.min(eCoast, eOuter, eStart, eEnd);
  if (m < -6) return m;
  const k = CORNER;
  const s = Math.exp(-eCoast / k) + Math.exp(-eOuter / k) + Math.exp(-eStart / k) + Math.exp(-eEnd / k);
  return -k * Math.log(s);
}

/**
 * Höhe an einem Punkt mit Meer: Wasser → Meeresgrund unter dem Spiegel; Klippe → steile Wand vom Spiegel zur
 * Klippenkante; Land → mindestens die Klippenkante, landeinwärts ansteigend bis zum Grat, dahinter weich zurück ins
 * natürliche Gelände `h`.
 */
export function seaHeight(sea: Sea, f: number, h: number, edge = 0, t = 0.5): number {
  // Pfadküste: volle Klippe und Grat, am Anfang der Bucht am höchsten, zum Ende hin niedriger (der Grat der Landzunge
  // fällt diagonal zum Meer); ferne Ufer (Rand, Enden): flache, niedrige Landzungen (kein Schatten übers Wasser, am
  // Horizont)
  // Höhe je Rand: Pfadküste (0) mit Abfall längs der Bucht, ferner Rand (1) flach, Anfang (2) mittel, Ende (3) als ferne
  // Landzunge am Horizont
  const alongT = Math.max(0, Math.min(1, t));
  const tall = edge === 0 ? 1 + sea.slopeAlong * (0.5 - alongT) : edge === 1 ? 0.3 : edge === 2 ? 0.8 : 0.9;
  const riseK = edge === 0 ? tall : edge === 1 ? 0.25 : 0.45;
  const top = sea.level + sea.cliff * tall;
  // Klippe: flacher Geröllfuß, dann über zwei Einheiten S-förmig zur Kante
  if (f > -0.1) return sea.level - 0.12 - (sea.depth - 0.12) * smoothstep(-0.1, 0.9, f);
  // flacher Fuß (Geröll, 1,2 Einheiten): die Wasserlinie schneidet ihn flach — auch im groben Fern-Gitter ohne Zacken
  const foot = sea.level + 0.3;
  if (f > -1.3) return sea.level - 0.12 + (foot - sea.level + 0.12) * ((-0.1 - f) / 1.2);
  if (f > -3.3) {
    const t = Math.min(1, (-1.3 - f) / 2);
    const w = t * t * (3 - 2 * t);
    return foot + (Math.max(top, h) - foot) * w;
  }
  const inland = -f - 3.3;
  // Anstieg zum Grat, danach über `sea.ridge * 0.5` zurück ins Gelände
  const ridgeH = top + sea.rise * riseK * Math.min(inland, sea.ridge);
  const back = smoothstep(sea.ridge, sea.ridge * 1.5, inland);
  const land = Math.max(h, ridgeH);
  return land + (h - land) * back;
}

/** Einflussbereich (Wasser + Klippe + Grat) als Box (x0, z0, x1, z1). */
function seaBox(sea: Sea, xs: number[]): [number, number, number, number] {
  const pad = sea.ridge * 1.5 + 2;
  return [Math.min(...xs) - pad, sea.zBottom - 2, Math.max(...xs) + pad, sea.zTop + 2];
}

/**
 * Meer eines Pfadabschnitts nach Spezifikation (nur Pfadregionen; Seitenzellen bekommen keins). Null, wenn der
 * Abschnitt zu kurz ist.
 */
export function makeSea(host: PlaneFeatureHost, site: RegionSite, world: number, spec: CoastSpec, rand: () => number): Sea | null {
  const seg = site.segment;
  if (site.region.kind !== 'path' || !seg) return null;
  const len = seg.zStart - seg.zEnd;
  if (len < 16) return null;
  const side = spec.side ?? 1;
  const [near, far] = spec.distance ?? [6, 10];
  const zTop = seg.zStart;
  const zBottom = seg.zEnd;
  const backbone: number[] = [];
  for (let z = zTop; z >= zBottom - BACKBONE_STEP; z -= BACKBONE_STEP) backbone.push(host.backbone(z));
  // ferner Rand: Bandrand minus Rand zur Grenze minus Grat der fernen Landzunge
  let half = Infinity;
  for (let z = zTop; z >= zBottom; z -= 2) half = Math.min(half, host.bandHalf(z));
  const ridge = spec.ridge ?? 10;
  // ferner Rand: bis an die Regionsgrenze (dahinter steigt die Nachbarwelt als fernes Ufer auf)
  const outer = Math.max(far + 8, half + 1.5);
  const sea: Sea = {
    id: `${site.region.key}-sea`,
    world,
    region: site.region.key,
    side,
    level: spec.level ?? -0.4,
    depth: 0.9,
    cliff: spec.cliff ?? 2.4,
    rise: spec.rise ?? 0.2,
    ridge,
    near,
    far,
    outer,
    bays: spec.bays ?? 1.6,
    slopeAlong: spec.slopeAlong ?? 0,
    ripple: ((spec.ripple ?? 0) * Math.PI) / 180,
    t0: spec.ends?.[0] ?? 0.1,
    t1: spec.ends?.[1] ?? 0.9,
    zTop,
    zBottom,
    backbone,
    phase: [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2],
    box: [0, 0, 0, 0],
  };
  const xs: number[] = [];
  for (let i = 0; i < backbone.length; i += 4) {
    xs.push(backbone[i]! + side * (near - 1));
    xs.push(backbone[i]! + side * (outer + 1.5));
  }
  sea.box = seaBox(sea, xs);
  return sea;
}
