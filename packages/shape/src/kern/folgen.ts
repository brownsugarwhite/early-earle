// „Formen folgen“ (Plan „Zeichnung ist Form“ 4.1, Florian 15.10.: „die Formen folgen immer … mit der echten Form
// arbeiten“; 15.10. nachts: „sollte sich nicht die echte Umrisslinie an diese Form anpassen?“): Nach einem Pinselstrich
// zeigt der Körper eine andere Silhouette als die gezeichneten Profile. Hier werden die Profile an die Silhouette des
// gebauten Körpers angepasst — Knoten (Zahl, Reihenfolge, Ecken, Härten) bleiben, nur Lage und Griffe kommen aus der
// Silhouette — und die Pinsel-Deltas so nachgeführt, dass der Körper **exakt** stehen bleibt: Δ' = (alter Käfig + Δ) −
// (neuer sauberer Käfig aus den neuen Profilen). Keine Rückkopplung: Die Profile beschreiben nur noch, was der Körper
// ohnehin zeigt; das feine Netz ist eine lineare Funktion des Käfigs und bleibt bitgenau.

import type { V2 } from '../bezier';
import type { Dokument, KaefigDelta } from '../dokument';
import { type FitPunkt, fitSegment, tangenteEnde, tangenteStart } from '../fit';
import { alleFlaechen } from '../kaefig/halbkanten';
import { type Knoten, type Profil, achsenRegeln, pfadAbtasten, vollerPfad } from '../profil';
import { spantenAngleichen } from '../spanten';
import type { V3 } from '../versuch/catmullClark';
import { type Ansicht3, umrissAusNetz } from '../versuch/umriss3d';
import type { Ableitung } from './ableiten';
import { deltasAnwenden } from './pinsel';
import { type Bauplan, type WesenStand, wesenBauen } from './wesen';

const PX = 461;
type P = FitPunkt;

/** Polygonzug (geschlossen = zyklisch, sonst offen) mit Bogenlängen; `bei(s)` liefert den Punkt bei Bogenlänge s. */
function zugWerkzeug(zug: readonly P[], geschlossen: boolean) {
  const n = zug.length;
  const segs = geschlossen ? n : n - 1;
  const sN: number[] = [0];
  for (let i = 1; i <= segs; i++) {
    const a = zug[(i - 1) % n]!;
    const b = zug[i % n]!;
    sN.push(sN[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const L = sN[segs]! || 1e-12;
  const bei = (s0: number): P => {
    const s = geschlossen ? ((s0 % L) + L) % L : Math.max(0, Math.min(L, s0));
    for (let i = 0; i < segs; i++) {
      if (s <= sN[i + 1]!) {
        const a = zug[i]!;
        const b = zug[(i + 1) % n]!;
        const len = sN[i + 1]! - sN[i]!;
        const u = len > 1e-12 ? (s - sN[i]!) / len : 0;
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      }
    }
    return geschlossen ? zug[0]! : zug[n - 1]!;
  };
  /** Fußpunkt eines Punkts: Bogenlänge und Lage */
  const fuss = (p: P): { s: number; q: P } => {
    let best = Infinity;
    let sBest = 0;
    let qBest: P = zug[0]!;
    for (let i = 0; i < segs; i++) {
      const a = zug[i]!;
      const b = zug[(i + 1) % n]!;
      const abx = b[0] - a[0];
      const aby = b[1] - a[1];
      const l2 = abx * abx + aby * aby || 1e-18;
      const u = Math.min(1, Math.max(0, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / l2));
      const q: P = [a[0] + abx * u, a[1] + aby * u];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (d < best) {
        best = d;
        sBest = sN[i]! + u * (sN[i + 1]! - sN[i]!);
        qBest = q;
      }
    }
    return { s: sBest, q: qBest };
  };
  /** Tangente (Laufrichtung) bei Bogenlänge s, über ±glatt gemittelt */
  const tangente = (s: number, glatt: number): P => {
    const a = bei(s - glatt);
    const b = bei(s + glatt);
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  /** Punkte von s0 vorwärts bis s1 (geschlossen zyklisch), Schritt ≈ h, Enden exakt */
  const stueck = (s0: number, s1: number, h: number): P[] => {
    let len = s1 - s0;
    if (len <= 0 && geschlossen) len += L;
    len = Math.max(0, len);
    const m = Math.max(1, Math.round(len / h));
    const out: P[] = [];
    for (let i = 0; i <= m; i++) out.push(bei(s0 + (len * i) / m));
    return out;
  };
  return { L, bei, fuss, tangente, stueck };
}

/** Umlaufsinn (vorzeichenbehaftete Fläche) eines Polygonzugs. */
function umlauf(pts: readonly P[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a;
}

/** Die editierbare Hälfte eines geschlossenen Zugs (Front: x ≥ 0, Top: y ≥ 0) von Achse zu Achse, Enden exakt auf der Achse. */
function halbZug(zug: readonly P[], senkrecht: boolean): P[] | null {
  const c = (p: P) => (senkrecht ? p[0] : p[1]);
  const n = zug.length;
  const innen = (i: number) => c(zug[((i % n) + n) % n]!) >= -1e-9;
  // Anfang eines zusammenhängenden Laufs der Hälfte
  let start = -1;
  for (let i = 0; i < n; i++) if (innen(i) && !innen(i - 1)) { start = i; break; }
  if (start < 0) return null;
  const out: P[] = [];
  const kreuz = (aussen: P, drin: P): P => {
    const ca = c(aussen);
    const cd = c(drin);
    const u = Math.abs(cd - ca) > 1e-12 ? -ca / (cd - ca) : 0;
    const p: P = [aussen[0] + (drin[0] - aussen[0]) * u, aussen[1] + (drin[1] - aussen[1]) * u];
    if (senkrecht) p[0] = 0;
    else p[1] = 0;
    return p;
  };
  out.push(kreuz(zug[((start - 1) % n + n) % n]!, zug[start]!));
  let i = start;
  while (innen(i) && out.length <= n + 1) {
    out.push(zug[((i % n) + n) % n]!);
    i++;
  }
  out.push(kreuz(zug[((i % n) + n) % n]!, zug[(((i - 1) % n) + n) % n]!));
  return out.length >= 3 ? out : null;
}

/**
 * Ein Profil an einen Silhouettenzug anpassen (Profil-Einheiten): Jeder Knoten rückt auf seinen Fußpunkt auf der
 * Silhouette, jedes Segment wird als ein kubisches Stück an das Silhouettenstück zwischen den Fußpunkten angepasst
 * (glatte Knoten: Tangente der Silhouette; Ecken: Tangenten der Stücke). Achsknoten bleiben auf der Achse.
 */
export function profilAnZug(pr: Profil, zugRoh: readonly P[], einfuegenAb = Infinity): { profil: Profil; fehler: number; eingefuegt: number } {
  const halb = pr.art === 'halb';
  let zug: P[];
  if (halb) {
    const h = halbZug(zugRoh, pr.achse === 'senkrecht');
    if (!h) return { profil: pr, fehler: Infinity, eingefuegt: 0 };
    zug = h;
  } else zug = [...zugRoh];
  const n = pr.knoten.length;
  if (n < 2) return { profil: pr, fehler: Infinity, eingefuegt: 0 };
  // Umlaufsinn angleichen: geschlossen über die Fläche, halb über die Nähe des ersten Knotens zum Zuganfang
  if (!halb) {
    const polyKnoten = pr.knoten.map((k) => [k.p.x, k.p.y] as P);
    if (umlauf(polyKnoten) * umlauf(zug) < 0) zug.reverse();
  } else {
    const a = pr.knoten[0]!.p;
    const d0 = Math.hypot(zug[0]![0] - a.x, zug[0]![1] - a.y);
    const d1 = Math.hypot(zug[zug.length - 1]![0] - a.x, zug[zug.length - 1]![1] - a.y);
    if (d1 < d0) zug.reverse();
  }
  const w = zugWerkzeug(zug, !halb);
  const segs = halb ? n - 1 : n;
  // Fußpunkte (halb: Achsknoten auf die Zugenden); Reihenfolge entlang des Zugs erzwingen (monoton)
  const feet: { s: number; q: P }[] = pr.knoten.map((k, i) => {
    if (halb && i === 0) return { s: 0, q: zug[0]! };
    if (halb && i === n - 1) return { s: w.L, q: zug[zug.length - 1]! };
    return w.fuss([k.p.x, k.p.y]);
  });
  if (halb) {
    for (let i = 1; i < n - 1; i++) if (feet[i]!.s < feet[i - 1]!.s) feet[i] = { s: feet[i - 1]!.s, q: w.bei(feet[i - 1]!.s) };
    for (let i = n - 2; i >= 1; i--) if (feet[i]!.s > feet[i + 1]!.s) feet[i] = { s: feet[i + 1]!.s, q: w.bei(feet[i + 1]!.s) };
  }
  const schritt = Math.max(w.L / 400, 1e-5);
  const glattWeite = Math.max(w.L / 200, schritt);
  const stuecke: P[][] = [];
  for (let i = 0; i < segs; i++) {
    const a = feet[i]!;
    const b = feet[(i + 1) % n]!;
    const len = halb ? Math.max(0, b.s - a.s) : (((b.s - a.s) % w.L) + w.L) % w.L;
    stuecke.push(len <= 1e-9 ? [a.q, b.q] : w.stueck(a.s, halb ? b.s : a.s + len, schritt));
  }
  const knoten: Knoten[] = pr.knoten.map((k, i) => ({ ...k, p: { x: feet[i]!.q[0], y: feet[i]!.q[1] }, ein: { x: 0, y: 0 }, aus: { x: 0, y: 0 } }));
  const tangenteAn = (i: number, vor: boolean): P => {
    // glatter Knoten: Tangente der Silhouette (Laufrichtung); Ecke: Tangente des angrenzenden Stücks
    const k = pr.knoten[i]!;
    const achs = halb && (i === 0 || i === n - 1);
    if (achs && k.art === 'glatt') {
      const quer: P = pr.achse === 'senkrecht' ? [1, 0] : [0, 1];
      return i === 0 ? quer : [-quer[0], -quer[1]];
    }
    if (k.art === 'glatt') {
      const t = w.tangente(feet[i]!.s, glattWeite);
      return vor ? t : [-t[0], -t[1]];
    }
    const st = vor ? stuecke[i]! : stuecke[(i - 1 + n) % n]!;
    return vor ? tangenteStart(st, Math.min(3, st.length - 1)) : tangenteEnde(st, Math.min(3, st.length - 1));
  };
  const abstandZu = (p: P, kub: readonly P[]): number => {
    const probe = pfadAbtasten([[{ x: kub[0]![0], y: kub[0]![1] }, { x: kub[1]![0], y: kub[1]![1] }, { x: kub[2]![0], y: kub[2]![1] }, { x: kub[3]![0], y: kub[3]![1] }]], 24);
    let d = Infinity;
    for (let q = 0; q + 1 < probe.length; q++) {
      const a = probe[q]!;
      const b = probe[q + 1]!;
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const l2 = abx * abx + aby * aby || 1e-18;
      const u = Math.min(1, Math.max(0, ((p[0] - a.x) * abx + (p[1] - a.y) * aby) / l2));
      d = Math.min(d, Math.hypot(a.x + abx * u - p[0], a.y + aby * u - p[1]));
    }
    return d;
  };
  // Ein Stück anpassen; trifft ein Stück die Silhouette um mehr als `einfuegenAb` nicht, wird am schlechtesten Punkt ein
  // glatter Knoten eingefügt (Tangente der Silhouette) und beidseits weiter angepasst (wie Schneiders Teilen), bis Tiefe 3
  type Stueck = { kub: readonly P[]; fehler: number };
  const anpassen = (pts: P[], t1: P, t2: P, tiefe: number, neueKnoten: { p: P; t: P }[]): Stueck[] => {
    const kub = fitSegment(pts, t1, t2);
    let fehler = 0;
    let schlecht = -1;
    for (let q = 1; q + 1 < pts.length; q++) {
      const d = abstandZu(pts[q]!, kub);
      if (d > fehler) {
        fehler = d;
        schlecht = q;
      }
    }
    if (fehler <= einfuegenAb || tiefe >= 3 || schlecht < 2 || schlecht > pts.length - 3) return [{ kub, fehler }];
    const a = pts[schlecht - 1]!;
    const b = pts[schlecht + 1]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t: P = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    neueKnoten.push({ p: pts[schlecht]!, t });
    return [...anpassen(pts.slice(0, schlecht + 1), t1, [-t[0], -t[1]], tiefe + 1, neueKnoten), ...anpassen(pts.slice(schlecht), t, t2, tiefe + 1, neueKnoten)];
  };
  let fehler = 0;
  let eingefuegt = 0;
  const ergebnis: Knoten[] = [];
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const pts = stuecke[i]!;
    const neue: { p: P; t: P }[] = [];
    const teile = anpassen(pts, tangenteAn(i, true), tangenteAn(j, false), 0, neue);
    // Knoten i, dann die eingefügten in Laufrichtung (das Teilen liefert sie rekursiv), Griffe aus den Teilstücken
    const reihenfolge = (p: P) => pts.findIndex((q) => q[0] === p[0] && q[1] === p[1]);
    neue.sort((a, b) => reihenfolge(a.p) - reihenfolge(b.p));
    const kette: Knoten[] = [knoten[i]!, ...neue.map((q) => ({ p: { x: q.p[0], y: q.p[1] }, ein: { x: 0, y: 0 }, aus: { x: 0, y: 0 }, art: 'glatt' as const }))];
    teile.forEach((st, q) => {
      const kub = st.kub;
      const von = kette[q]!;
      const nach = q + 1 < kette.length ? kette[q + 1]! : knoten[j]!;
      von.aus = { x: kub[1]![0] - kub[0]![0], y: kub[1]![1] - kub[0]![1] };
      nach.ein = { x: kub[2]![0] - kub[3]![0], y: kub[2]![1] - kub[3]![1] };
      fehler = Math.max(fehler, st.fehler);
    });
    ergebnis.push(...kette);
    eingefuegt += neue.length;
  }
  if (halb) ergebnis.push(knoten[n - 1]!);
  const profil: Profil = halb ? achsenRegeln({ art: 'halb', achse: pr.achse, knoten: ergebnis }) : { art: 'geschlossen', knoten: ergebnis };
  return { profil, fehler, eingefuegt };
}

/**
 * Alle drei Profile an die Silhouetten des feinen Netzes (Welt = Profil × Maßstab, Ruhelage ohne Hebung) anpassen.
 * Liefert die neuen Profile und den größten Fehler je Blatt (px bei 461 px je Kachel).
 */
export function profileAnSilhouette(dok: Dokument, punkte: readonly V3[], flaechen: readonly number[][], einfuegenAbPx = 2): { profile: Dokument['profile']; spanten: Dokument['spanten']; fehlerPx: Record<Ansicht3, number>; eingefuegt: number } {
  const sk = dok.skalierung;
  const netz = { punkte: punkte as V3[], flaechen: flaechen as number[][], schaerfe: new Map<string, number>() };
  const profile = { ...dok.profile };
  const fehlerPx = { seite: 0, front: 0, top: 0 } as Record<Ansicht3, number>;
  let eingefuegt = 0;
  for (const a of ['seite', 'front', 'top'] as const) {
    const zuege = umrissAusNetz(netz, a, 480);
    if (!zuege.length) continue;
    const zug = zuege[0]!.map((p): P => [p.x / sk, p.y / sk]);
    if (zug.length >= 2 && Math.hypot(zug[0]![0] - zug[zug.length - 1]![0], zug[0]![1] - zug[zug.length - 1]![1]) < 1e-9) zug.pop();
    const r = profilAnZug(dok.profile[a], zug, einfuegenAbPx / (sk * PX));
    if (!Number.isFinite(r.fehler)) continue;
    profile[a] = r.profil;
    fehlerPx[a] = r.fehler * sk * PX;
    eingefuegt += r.eingefuegt;
  }
  // Spanten haben die Punktstruktur der Front: eingefügte Front-Knoten in jedem Spant ebenso
  const spanten = dok.spanten?.length && profile.front.knoten.length !== dok.profile.front.knoten.length ? spantenAngleichen(dok.profile.front, profile.front, dok.spanten) : dok.spanten;
  return { profile, spanten, fehlerPx, eingefuegt };
}

/** Deltas, die den sauberen Käfig `sauber` auf die Lagen `ziel` bringen (Vorlagenpunkte, rechte Hälfte und Naht). */
export function deltasNachfuehren(ziel: Float64Array, sauber: Ableitung): KaefigDelta[] {
  const n0 = Math.min(sauber.vorlage.kaefig.n, sauber.kaefig.n);
  const xyz = sauber.kaefig.xyz;
  const out: KaefigDelta[] = [];
  for (let p = 0; p < n0; p++) {
    const z = xyz[3 * p + 2]!;
    if (z < -1e-9) continue;
    const d: [number, number, number] = [ziel[3 * p]! - xyz[3 * p]!, ziel[3 * p + 1]! - xyz[3 * p + 1]!, Math.abs(z) < 1e-9 ? 0 : ziel[3 * p + 2]! - z];
    if (Math.hypot(d[0], d[1], d[2]) > 1e-7) out.push({ punkt: p, d });
  }
  return out;
}

export type FolgenErgebnis = { profile: Dokument['profile']; spanten: Dokument['spanten']; deltas: KaefigDelta[]; fehlerPx: Record<Ansicht3, number>; eingefuegt: number; stand: WesenStand };

/**
 * Formen folgen: Profile an die Silhouette des gebauten Körpers (mit Deltas) anpassen, dann die Deltas gegen den
 * sauberen Käfig aus den neuen Profilen nachführen. Der Körper bleibt bitgenau, die schwarzen Linien liegen auf ihm.
 */
export function formenFolgen(dok: Dokument, plan: Partial<Bauplan>, stand: WesenStand | null): FolgenErgebnis {
  const deltas = dok.kaefig?.deltas ?? [];
  const r1 = wesenBauen(dok, plan, stand, false);
  const abl = r1.stand.abl;
  const mit = deltas.length ? deltasAnwenden(abl, deltas) : abl;
  const letzte = mit.unterteilung.stufen[mit.unterteilung.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(letzte);
  const punkte: V3[] = [];
  for (let i = 0; i < mit.fein.length / 3; i++) punkte.push([mit.fein[3 * i]!, mit.fein[3 * i + 1]!, mit.fein[3 * i + 2]!]);
  const { profile, spanten, fehlerPx, eingefuegt } = profileAnSilhouette(dok, punkte, flaechen);
  const dok2: Dokument = { ...dok, profile, ...(spanten ? { spanten } : {}) };
  const r2 = wesenBauen(dok2, plan, r1.stand, false);
  const neu = deltasNachfuehren(mit.kaefig.xyz, r2.stand.abl);
  return { profile, spanten, deltas: neu, fehlerPx, eingefuegt, stand: r2.stand };
}

/** Silhouetten-Abweichung eines Profils gegen das Netz (px), zum Prüfen. */
export function profilAbweichungPx(dok: Dokument, a: Ansicht3, punkte: readonly V3[], flaechen: readonly number[][]): number {
  const sk = dok.skalierung;
  const netz = { punkte: punkte as V3[], flaechen: flaechen as number[][], schaerfe: new Map<string, number>() };
  const zuege = umrissAusNetz(netz, a, 480);
  const soll = pfadAbtasten(vollerPfad(dok.profile[a]), 24).map((p): V2 => ({ x: p.x * sk, y: p.y * sk }));
  let max = 0;
  for (const z of zuege) {
    for (const p of z) {
      let best = Infinity;
      for (let i = 0; i < soll.length; i++) {
        const q = soll[i]!;
        const r = soll[(i + 1) % soll.length]!;
        const abx = r.x - q.x;
        const aby = r.y - q.y;
        const l2 = abx * abx + aby * aby || 1e-18;
        const u = Math.min(1, Math.max(0, ((p.x - q.x) * abx + (p.y - q.y) * aby) / l2));
        best = Math.min(best, Math.hypot(q.x + abx * u - p.x, q.y + aby * u - p.y));
      }
      max = Math.max(max, best);
    }
    break;
  }
  return max * PX;
}
